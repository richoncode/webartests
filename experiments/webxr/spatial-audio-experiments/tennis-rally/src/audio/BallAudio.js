import { Vector3 } from "@babylonjs/core";
import { clamp, randomRange } from "../utils/math.js";
import { computeAttenuation, scaledSpatialParams } from "./spatialAttenuation.js";

const POOL_SIZE_PER_CATEGORY = 12;

// racketForce()/floorForce() are both linear in the input velocities (the alignment/angle terms
// are scale-invariant, since they come from normalized/ratio'd vectors) — so scaling every
// synthetic velocity by the same factor scales the resulting force by that same factor,
// independent of wherever forceMin/forceMax happen to be tuned to right now.
const TEST_HIT_INTENSITY_SCALE = { soft: 0.4, medium: 1, hard: 2 };

// Room-temperature air, m/s — used only for the Doppler pitch shift below.
const SPEED_OF_SOUND = 343;

// The source's velocity component pointing straight at the listener — positive means closing
// the distance, negative means opening it. Reads x/y/z directly instead of calling Vector3
// methods so it works against both real Babylon Vector3s and the fakeVector() stand-ins
// playTestHit() builds. Exposed separately from dopplerFactor() below so the UI can show the
// raw m/s value, not just the resulting pitch ratio.
const closingSpeedTowardListener = (sourceVelocity, sourcePosition, listenerPosition) => {
  if (!listenerPosition) return 0;
  const dx = listenerPosition.x - sourcePosition.x;
  const dy = listenerPosition.y - sourcePosition.y;
  const dz = listenerPosition.z - sourcePosition.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 1e-4) return 0;
  return (sourceVelocity.x * dx + sourceVelocity.y * dy + sourceVelocity.z * dz) / dist;
};

// Classic moving-source Doppler shift: a source closing the distance to the listener raises
// pitch, one pulling away lowers it. Clamped well below the speed of sound so a stray
// high-velocity swing can't divide by zero or flip sign.
const dopplerFactor = (closingSpeed) => {
  const clampedClosingSpeed = clamp(closingSpeed, -SPEED_OF_SOUND * 0.9, SPEED_OF_SOUND * 0.9);
  return SPEED_OF_SOUND / (SPEED_OF_SOUND - clampedClosingSpeed);
};

const mapForceToVolume = (force, category) => {
  const { forceMin, forceMax, volumeMin, volumeMax } = category;
  const span = forceMax - forceMin || 1;
  const raw = volumeMin + ((force - forceMin) * (volumeMax - volumeMin)) / span;
  return clamp(raw, volumeMin, volumeMax);
};

// The stick-figure swing animation's racket velocity *direction* isn't reliably physical — it's
// been observed pointing the wrong way (e.g. a Doppler shift reading as pitch-up on a shot that
// visibly sends the ball away from the listener). The ball's outgoing velocity has no such
// problem: BallController computes it deterministically from real projectile physics during
// shot planning. So every sound calculation below borrows *that* direction, scaled to the
// animation's own reported racket speed (so the force/Doppler magnitude is unchanged, only the
// direction is corrected) — the sound stays grounded in real physics even where the swing
// animation isn't trustworthy yet.
const effectiveRacketVelocity = (event) => {
  const ballVelocity = event.ball.velocity;
  const ballSpeed = ballVelocity.length();
  if (ballSpeed < 0.001) return new Vector3(0, 0, 0);
  const scale = event.racket.speed / ballSpeed;
  return new Vector3(ballVelocity.x * scale, ballVelocity.y * scale, ballVelocity.z * scale);
};

const racketForce = (event) => {
  const ball = event.ball;
  const racketVelocity = effectiveRacketVelocity(event);
  const relative = ball.velocity.subtract(racketVelocity).length();
  return relative * 0.5 + ball.speed * 0.3 + racketVelocity.length() * 0.2;
};

const floorForce = (event) => {
  const verticalSpeed = Math.abs(event.ball.incomingVelocity?.y ?? event.ball.velocity.y);
  const totalSpeed = event.ball.incomingSpeed ?? event.ball.speed;
  const horizontalSpeed = Math.max(0.001, Math.sqrt(Math.max(0, totalSpeed * totalSpeed - verticalSpeed * verticalSpeed)));
  const angle = Math.atan2(verticalSpeed, horizontalSpeed);
  return (verticalSpeed * 0.7 + totalSpeed * 0.3) * (0.85 + 0.15 * Math.sin(angle));
};

// Pure audio reaction layer: subscribes to ImpactEventBus, decides how loud/which clip/where
// in space, and plays it. Contains no physics — every number it needs (speed, position, force)
// arrives on the event.
//
// Playback is built from raw Web Audio nodes (AudioBufferSourceNode -> GainNode -> PannerNode),
// not Babylon's classic Sound class. That wrapper's exposed "output node" (getSoundGain(), used
// in an earlier version of this file) turned out not to be the node actually carrying live
// playback audio — Babylon's Sound routes spatial playback through its own internal default
// track straight to the engine's master destination, bypassing anything connected to that
// exposed node entirely. Owning the panner/gain nodes directly avoids relying on that wrapper's
// internal (and in this case incorrect) assumptions about where its own audio actually goes.
export class BallAudio {
  constructor(scene, { eventBus, settingsStore, reverbBus, audioContext, masterDestination, getListenerPosition }) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.settings = settingsStore;
    this.reverbBus = reverbBus;
    this.audioContext = audioContext;
    // Where playSoundCheck()'s tone connects — defaults to the raw context destination, but
    // main.js passes the master mute gain node so the mute toggle silences the beep too.
    this.masterDestination = masterDestination || audioContext.destination;
    this.getListenerPosition = getListenerPosition || (() => scene.activeCamera?.position);

    this._clipBuffers = { racket: new Map(), floor: new Map() }; // url -> decoded AudioBuffer
    this._pools = { racket: [], floor: [] };
    this._debugListeners = new Set();
    this.lastHit = null;

    this._buildPools();
    this._unsubscribe = eventBus.onAny((event) => {
      if (event.type === "racket-hit" || event.type === "floor-hit") void this._handleImpact(event);
    });
    // Re-fetches whenever the bank changes (e.g. a clip added from the tuning UI) — already
    // cached URLs are skipped, so this is cheap to call on every settings change.
    this._settingsUnsubscribe = this.settings.subscribe(() => void this._loadAllClips());
    // Native PannerNodes attenuate/pan relative to audioContext.listener, which nothing updates
    // automatically once we stop using Babylon's Sound/audioSceneComponent — keep it following
    // the active camera every frame.
    this._listenerObserver = scene.onBeforeRenderObservable.add(() => this._updateListener());

    void this._loadAllClips();
  }

  // A dedicated persistent gain+panner pair per pool slot: these are OUR nodes, created once,
  // and connected to the reverb bus once — never recreated, so the connection is never stale.
  // Only the AudioBufferSourceNode (one-shot by spec) gets recreated per play.
  _buildPools() {
    for (const category of ["racket", "floor"]) {
      for (let i = 0; i < POOL_SIZE_PER_CATEGORY; i++) {
        const gainNode = this.audioContext.createGain();
        const panner = this.audioContext.createPanner();
        gainNode.connect(panner);
        this.reverbBus.connectSource(panner);
        this._pools[category].push({ gainNode, panner, source: null, playing: false, startedAt: -Infinity });
      }
    }
  }

  _updateListener() {
    const camera = this.scene.activeCamera;
    if (!camera) return;
    const listener = this.audioContext.listener;
    const pos = camera.globalPosition ?? camera.position;
    if (listener.positionX) {
      listener.positionX.value = pos.x;
      listener.positionY.value = pos.y;
      listener.positionZ.value = pos.z;
    } else {
      listener.setPosition(pos.x, pos.y, pos.z);
    }

    const forward = camera.getDirection ? camera.getDirection(Vector3.Forward()) : Vector3.Forward();
    const up = camera.upVector ?? Vector3.Up();
    if (listener.forwardX) {
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = up.x;
      listener.upY.value = up.y;
      listener.upZ.value = up.z;
    } else {
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  // A deliberately dumb, isolated test tone: a synthesized beep straight to the master
  // destination, bypassing clip loading, the pooled voices, spatialization, and the reverb bus
  // entirely. If this is silent, the problem is upstream of all of that (suspended AudioContext,
  // muted tab, OS output routed elsewhere) — if this plays but hits still don't, the problem is
  // somewhere in the hit pipeline specifically.
  async playSoundCheck() {
    const ctx = this.audioContext;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (error) {
        console.warn("[BallAudio] Could not resume AudioContext for sound check:", error);
      }
    }
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.setValueAtTime(0.5, now + 0.25);
    gain.gain.linearRampToValueAtTime(0, now + 0.32);
    oscillator.connect(gain);
    gain.connect(this.masterDestination);
    oscillator.start(now);
    oscillator.stop(now + 0.35);
    return { contextState: ctx.state };
  }

  onDebugInfo(listener) {
    this._debugListeners.add(listener);
    return () => this._debugListeners.delete(listener);
  }

  async _loadAllClips() {
    await Promise.all([this._loadCategoryClips("racket"), this._loadCategoryClips("floor")]);
  }

  async _loadCategoryClips(category) {
    const cache = this._clipBuffers[category];
    const pending = this.settings.get()[category].clips.filter((entry) => !cache.has(entry.url));
    await Promise.all(
      pending.map(async ({ url }) => {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          normalizePeakInPlace(audioBuffer);
          cache.set(url, audioBuffer);
        } catch (error) {
          console.warn(`[BallAudio] Could not load clip "${url}":`, error);
        }
      })
    );
  }

  // Selectable = enabled in the bank AND its buffer has finished loading.
  _selectableClips(category) {
    const cache = this._clipBuffers[category];
    return this.settings.get()[category].clips.filter((entry) => entry.enabled && cache.has(entry.url));
  }

  _acquireVoice(category, maxSimultaneous) {
    const pool = this._pools[category];
    const active = pool.filter((v) => v.playing);
    let voice = pool.find((v) => !v.playing);

    if (!voice) {
      // Every slot busy: if we're already at (or over) the configured concurrency cap, steal
      // the oldest-started voice rather than letting a new hit go silent or pile up unbounded.
      voice = [...pool].sort((a, b) => a.startedAt - b.startedAt)[0];
      this._stopVoice(voice);
    } else if (active.length >= maxSimultaneous) {
      this._stopVoice(voice);
    }
    return { voice, activeCountAfter: Math.min(active.length + 1, pool.length) };
  }

  _stopVoice(voice) {
    if (!voice.source) return;
    try {
      voice.source.stop();
    } catch {
      // Already stopped/ended — fine.
    }
    voice.source.disconnect();
    voice.source = null;
    voice.playing = false;
  }

  _applySpatialSettings(voice, spatial, position) {
    const panner = voice.panner;
    panner.panningModel = spatial.panningModel === "HRTF" ? "HRTF" : "equalpower";
    panner.distanceModel = spatial.distanceModel;
    const { refDistance, maxDistance, rolloffFactor } = scaledSpatialParams(spatial);
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = rolloffFactor;
    panner.coneInnerAngle = spatial.coneInnerAngle;
    panner.coneOuterAngle = spatial.coneOuterAngle;
    panner.coneOuterGain = spatial.coneOuterVolume;
    if (panner.positionX) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
    } else {
      panner.setPosition(position.x, position.y, position.z);
    }
  }

  _playVoice(voice, buffer, { volume, playbackRate }) {
    this._stopVoice(voice);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(voice.gainNode);
    source.onended = () => {
      if (voice.source === source) voice.playing = false;
    };
    voice.gainNode.gain.value = volume;
    source.start();
    voice.source = source;
    voice.playing = true;
    voice.startedAt = performance.now();
  }

  async _handleImpact(event) {
    const category = event.type === "racket-hit" ? "racket" : "floor";
    const settings = this.settings.get();
    const categorySettings = settings[category];
    const spatial = settings.spatial;

    const force = category === "racket" ? racketForce(event) : floorForce(event);
    let volume = mapForceToVolume(force, categorySettings);
    volume *= 1 + randomRange(-categorySettings.randomVolumeJitter, categorySettings.randomVolumeJitter);
    volume = clamp(volume, categorySettings.volumeMin, categorySettings.volumeMax);

    const categoryGain = category === "racket" ? spatial.racketGainMultiplier : spatial.floorGainMultiplier;
    const finalVolume = clamp(volume * categoryGain * spatial.globalGain, 0, 1);

    // Most of what you actually hear is racket-on-string/ball, not the ball itself — so a
    // racket-hit's sound source is the racket's contact point and velocity, not the ball's.
    // The velocity itself is effectiveRacketVelocity()'s corrected-direction stand-in, not the
    // raw animation vector — see that function's comment for why.
    const position = event.type === "floor-hit" ? event.court.surfacePoint : event.racket.centerPosition;
    const sourceVelocity = event.type === "floor-hit" ? null : effectiveRacketVelocity(event);
    const listenerPos = this.getListenerPosition();
    const distance = listenerPos ? distanceTo(listenerPos, position) : 0;
    const attenuation = computeAttenuation(distance, spatial);
    const closingSpeed = sourceVelocity ? closingSpeedTowardListener(sourceVelocity, position, listenerPos) : 0;
    const doppler = sourceVelocity ? dopplerFactor(closingSpeed) : 1;

    const bank = this._selectableClips(category);
    const clipEntry = bank.length ? bank[Math.floor(Math.random() * bank.length)] : null;

    const { voice, activeCountAfter } = this._acquireVoice(category, categorySettings.maxSimultaneousSounds);
    // Soft headroom compensation so several near-simultaneous hits don't sum into clipping —
    // the shared DynamicsCompressorNode downstream (see main.js) is the hard backstop.
    const headroom = 1 / Math.sqrt(Math.max(1, activeCountAfter));
    const playedVolume = clamp(finalVolume * headroom * (clipEntry?.volume ?? 1), 0, 1);

    if (clipEntry) {
      this._applySpatialSettings(voice, spatial, position);
      const pitchJitter = categorySettings.randomPitchJitter;
      this._playVoice(voice, this._clipBuffers[category].get(clipEntry.url), {
        volume: playedVolume,
        playbackRate: doppler * (1 + randomRange(-pitchJitter, pitchJitter))
      });
    }

    this.lastHit = {
      type: event.type,
      force,
      volume: finalVolume,
      playedVolume,
      ballSpeed: event.ball.speed,
      racketSpeed: event.racket?.speed ?? null,
      closingSpeed,
      doppler,
      clipName: clipEntry?.url ?? "(no enabled/loaded clip)",
      position: { x: position.x, y: position.y, z: position.z },
      distance,
      attenuation,
      time: event.time
    };
    this._debugListeners.forEach((listener) => listener(this.lastHit));
  }

  // Used by the "play test hit at distance" control — plays a clip at an explicit distance
  // in front of the listener, bypassing the rally entirely, for isolated tuning. Builds a
  // synthetic event with the same shape ImpactEventBus emits, using fakeVector() so
  // racketForce()/floorForce() (which call .length()/.dot()/.normalizeToNew() on ball/racket
  // velocities) work against it exactly as they would against a real Vector3.
  //
  // `intensity` ("soft" | "medium" | "hard") scales every synthetic velocity by
  // TEST_HIT_INTENSITY_SCALE, which scales the resulting force by the same factor — see that
  // constant's comment for why this is exact rather than approximate.
  //
  // `radialVelocity`, when given (m/s, signed), overrides the fixed "hit sends the ball away
  // from the listener" default with an explicit closing speed for isolated Doppler testing.
  // The test position sits directly along -Z from the listener, so a synthetic velocity's raw
  // z-component *is* its speed toward the listener: positive closes the distance (pitch up),
  // negative opens it (pitch down) — matching the sign convention closingSpeedTowardListener()
  // uses everywhere else.
  async playTestHit(category, distance, intensity = "medium", radialVelocity = null) {
    const listenerPos = this.getListenerPosition();
    if (!listenerPos) return;
    const position = new Vector3(listenerPos.x, listenerPos.y, listenerPos.z - distance);
    const scale = TEST_HIT_INTENSITY_SCALE[intensity] ?? 1;
    const zVelocity = radialVelocity !== null ? radialVelocity : -10 * scale;
    const racketSpeed = radialVelocity !== null ? Math.abs(radialVelocity) : 6 * scale;

    const syntheticEvent =
      category === "racket"
        ? {
            type: "racket-hit",
            time: performance.now() / 1000,
            ball: { position, velocity: fakeVector(0, 0, zVelocity), speed: Math.abs(zVelocity) },
            racket: { playerId: "near", centerPosition: position, velocity: fakeVector(0, 0, zVelocity), speed: racketSpeed }
          }
        : {
            type: "floor-hit",
            time: performance.now() / 1000,
            ball: {
              position,
              velocity: fakeVector(0, -6 * scale, zVelocity),
              speed: Math.hypot(6 * scale, zVelocity),
              incomingVelocity: fakeVector(0, -6 * scale, zVelocity),
              incomingSpeed: Math.hypot(6 * scale, zVelocity)
            },
            court: { surfacePoint: position }
          };
    await this._handleImpact(syntheticEvent);
  }

  // Used by the hit-bank UI's per-clip "audit" button — plays one specific clip once, close to
  // the listener, at a fixed neutral volume scaled by that clip's own per-clip gain (so raising/
  // lowering the slider is audible immediately). Bypasses force-mapping/pooling-cap entirely;
  // this is a manual review action, not a simulated impact.
  async previewClip(category, url) {
    await this._loadCategoryClips(category);
    const buffer = this._clipBuffers[category].get(url);
    if (!buffer) return;

    const listenerPos = this.getListenerPosition();
    const position = listenerPos ? new Vector3(listenerPos.x, listenerPos.y, listenerPos.z - 2) : new Vector3(0, 1.5, -2);
    const entry = this.settings.get()[category].clips.find((c) => c.url === url);
    const volume = clamp(0.8 * (entry?.volume ?? 1), 0, 1);

    const { voice } = this._acquireVoice(category, Infinity);
    this._applySpatialSettings(voice, { ...this.settings.get().spatial, distanceModel: "inverse", rolloffFactor: 0.5, minDistance: 2, maxDistance: 100, venueScale: 1 }, position);
    this._playVoice(voice, buffer, { volume, playbackRate: 1 });
  }

  dispose() {
    this._unsubscribe();
    this._settingsUnsubscribe();
    this.scene.onBeforeRenderObservable.remove(this._listenerObserver);
    Object.values(this._pools).forEach((pool) => pool.forEach((voice) => this._stopVoice(voice)));
  }
}

// Real recorded samples arrive at wildly different recording levels (observed: -14dB to -38dB
// peak across otherwise-comparable clips) — a >4x loudness gap that has nothing to do with how
// hard the actual impact was. Boosting every clip to a common target peak on load means the
// force/distance volume math (which assumes "1.0 gain = the clip's own full-scale level") means
// the same thing for every clip, regardless of how quiet the original recording happened to be.
const NORMALIZE_TARGET_PEAK = 0.9;
const NORMALIZE_MAX_GAIN = 12; // don't blow up a near-silent/corrupt file into noise

const normalizePeakInPlace = (audioBuffer) => {
  let peak = 0;
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak <= 0) return;
  const gain = Math.min(NORMALIZE_TARGET_PEAK / peak, NORMALIZE_MAX_GAIN);
  if (Math.abs(gain - 1) < 0.01) return; // already close enough
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] *= gain;
  }
};

const distanceTo = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const fakeVector = (x, y, z) => ({
  x,
  y,
  z,
  length: () => Math.sqrt(x * x + y * y + z * z),
  subtract: (o) => fakeVector(x - o.x, y - o.y, z - o.z),
  normalizeToNew: () => {
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    return fakeVector(x / len, y / len, z / len);
  },
  dot: (o) => x * o.x + y * o.y + z * o.z
});

// A single tunable model for everything BallAudio/AudioTuningPanel need. Pure data + a tiny
// pub/sub — no Babylon objects, no physics, so it can be serialized to/from JSON directly.

// Each clip is its own bank entry — url, a per-clip gain multiplier (for balancing samples
// recorded at different loudness), and enabled (excluded from random selection, not deleted,
// so a disabled clip can be re-enabled later without re-adding it).
const clip = (url, overrides = {}) => ({ url, enabled: true, volume: 1, ...overrides });

const defaultHitCategory = (overrides = {}) => ({
  forceMin: 0,
  forceMax: 12,
  volumeMin: 0.05,
  volumeMax: 1,
  randomVolumeJitter: 0.08,
  randomPitchJitter: 0.06,
  maxSimultaneousSounds: 6,
  clips: [],
  ...overrides
});

export const DEFAULT_SETTINGS = Object.freeze({
  racket: defaultHitCategory({
    forceMax: 14,
    volumeMin: 0.29,
    randomVolumeJitter: 0,
    randomPitchJitter: 0,
    clips: [
      clip("audio/racket/racket-hit-01.wav", { enabled: false }),
      clip("audio/racket/racket-hit-02.wav", { enabled: false }),
      clip("audio/racket/racket-hit-03.wav", { enabled: false }),
      clip("audio/racket/racket-hit-04.wav", { enabled: false }),
      clip("audio/racket/racket-hit-05.wav", { enabled: false }),
      clip("audio/racket/racket-hit-06.wav"),
      clip("audio/racket/racket-hit-07.wav", { enabled: false }),
      clip("audio/racket/racket-hit-08.wav", { enabled: false }),
      clip("audio/racket/racket-hit-09.wav", { enabled: false }),
      clip("audio/racket/racket-hit-10.wav", { enabled: false }),
      clip("audio/racket/racket-hit-11.wav", { enabled: false }),
      clip("audio/racket/racket-hit-12.wav", { enabled: false }),
      clip("audio/racket/racket-hit-13.wav", { enabled: false })
    ]
  }),
  floor: defaultHitCategory({
    forceMax: 8,
    volumeMax: 0.85,
    clips: [
      clip("audio/floor/floor-bounce-01.wav"),
      clip("audio/floor/floor-bounce-02.wav", { enabled: false }),
      // Repurposed from the "wall" recordings — added here instead of the floor mic's own
      // takes, which the tuning UI's per-clip disable can now drop individually if unwanted.
      clip("audio/wall/wall-hit-01.wav", { enabled: false }),
      clip("audio/wall/wall-hit-02.wav", { enabled: false })
    ]
  }),
  spatial: {
    panningModel: "HRTF", // 'HRTF' | 'equalpower'
    distanceModel: "inverse", // 'linear' | 'inverse' | 'exponential'
    minDistance: 2,
    maxDistance: 60,
    rolloffFactor: 1.4,
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterVolume: 1,
    globalGain: 1,
    racketGainMultiplier: 1,
    floorGainMultiplier: 0.9,
    venueScale: 1
  },
  reverb: {
    enabled: true,
    dryLevel: 1,
    wetLevel: 0.22,
    outputGain: 0.9,
    impulseResponse: "audio/impulse-responses/outdoor-court.wav",
    lowpassHz: 0, // 0 = disabled
    highpassHz: 0
  }
});

const SPATIAL_PRESETS = {
  "Small practice court": { minDistance: 1, maxDistance: 20, rolloffFactor: 2.2, venueScale: 0.6, distanceModel: "inverse" },
  "Outdoor court": { minDistance: 2, maxDistance: 60, rolloffFactor: 1.4, venueScale: 1, distanceModel: "inverse" },
  "Stadium close seats": { minDistance: 3, maxDistance: 90, rolloffFactor: 1, venueScale: 1.4, distanceModel: "inverse" },
  "Stadium upper seats": { minDistance: 6, maxDistance: 140, rolloffFactor: 0.6, venueScale: 2.4, distanceModel: "exponential" },
  "Debug flat/no falloff": { minDistance: 100, maxDistance: 1000, rolloffFactor: 0.0001, venueScale: 1, distanceModel: "linear" }
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const deepMerge = (target, patch) => {
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value && typeof value === "object" && !Array.isArray(value) && typeof target[key] === "object") {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
};

export class AudioSettingsStore {
  constructor() {
    this._settings = deepClone(DEFAULT_SETTINGS);
    this._listeners = new Set();
  }

  get() {
    return this._settings;
  }

  set(patch) {
    deepMerge(this._settings, patch);
    this._notify();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this._settings));
  }

  resetAll() {
    this._settings = deepClone(DEFAULT_SETTINGS);
    this._notify();
  }

  resetSpatialOnly() {
    this._settings.spatial = deepClone(DEFAULT_SETTINGS.spatial);
    this._settings.reverb = deepClone(DEFAULT_SETTINGS.reverb);
    this._notify();
  }

  applyPreset(name) {
    const preset = SPATIAL_PRESETS[name];
    if (!preset) return;
    this.set({ spatial: preset });
  }

  addClip(category, url) {
    const trimmed = url.trim();
    if (!trimmed) return;
    this._settings[category].clips.push(clip(trimmed));
    this._notify();
  }

  removeClip(category, index) {
    this._settings[category].clips.splice(index, 1);
    this._notify();
  }

  updateClip(category, index, patch) {
    const target = this._settings[category].clips[index];
    if (!target) return;
    Object.assign(target, patch);
    this._notify();
  }

  get presetNames() {
    return Object.keys(SPATIAL_PRESETS);
  }

  toJSON() {
    return JSON.stringify(this._settings, null, 2);
  }

  fromJSON(json) {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    this._settings = deepMerge(deepClone(DEFAULT_SETTINGS), parsed);
    this._notify();
  }
}

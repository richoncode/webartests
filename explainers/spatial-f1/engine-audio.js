/**
 * Dyno-locked Web Audio stand-in for an F1 power unit.
 * Pitch follows RPM. A preset (see engines/*.json) chooses the firing multiple,
 * the harmonic stack, and how bright or quiet the note is.
 * Gear changes only dip the gain. This is not a gas-dynamics simulator.
 */

export const FIRING_PER_REV = 3;

export function firingHz(rpm, preset) {
  const per = preset && Number(preset.firingPerRev) > 0 ? Number(preset.firingPerRev) : FIRING_PER_REV;
  const scale = preset && Number(preset.pitchScale) > 0 ? Number(preset.pitchScale) : 1;
  const hz = (Number(rpm) || 0) / 60 * per * scale;
  return Math.max(28, Math.min(1600, hz));
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, a, b) {
  const n = Number(v);
  if (!Number.isFinite(n)) return a;
  return n < a ? a : n > b ? b : n;
}

function distortionCurve(amount) {
  const n = 513;
  const k = clamp(Number(amount) || 1, 0.4, 6);
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k);
  }
  return curve;
}

function makeWave(ctx, mags) {
  const clean = [];
  for (const m of mags) {
    const n = Number(m);
    if (Number.isFinite(n)) clean.push(Math.max(-1, Math.min(1, n)));
  }
  if (clean.length < 1) return null;
  const imag = new Float32Array(clean.length + 1);
  const real = new Float32Array(clean.length + 1);
  for (let i = 0; i < clean.length; i++) imag[i + 1] = clean[i];
  try {
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  } catch (err) {
    console.error(err);
    return null;
  }
}

const OSC_TYPES = new Set(["sine", "triangle", "sawtooth", "square"]);

function buildVoice(ctx, preset, destination) {
  const started = [];
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 240;
  filter.Q.value = 0.7;

  const shaper = ctx.createWaveShaper();
  shaper.curve = distortionCurve(preset.distortion);
  shaper.oversample = "4x";

  const safety = ctx.createBiquadFilter();
  safety.type = "lowpass";
  safety.frequency.value = clamp(Number(preset.ceiling) || 2200, 200, 6000);
  safety.Q.value = 0.6;

  const lope = ctx.createGain();
  lope.gain.value = 1;
  const out = ctx.createGain();
  out.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 8;
  const lfoAmt = ctx.createGain();
  lfoAmt.gain.value = 0;
  lfo.connect(lfoAmt);
  lfoAmt.connect(lope.gain);

  const filtSpec = preset.filter || {};
  const filterMix = ctx.createGain();
  // Number(undefined) is NaN, and `NaN ?? 1` is still NaN. Assigning that
  // to an AudioParam throws, so the graph never starts. The V6 file is the
  // only preset that sets mix; the others omitted it and died here. An
  // omitted mix is a full direct path.
  filterMix.gain.value = clamp(num(filtSpec.mix, 1), 0, 1);
  filter.connect(filterMix);
  filterMix.connect(shaper);

  const formantSpecs = Array.isArray(preset.formants) ? preset.formants : [];
  const formantNodes = [];
  for (const spec of formantSpecs) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = clamp(Number(spec.base) || 280, 40, 8000);
    bp.Q.value = clamp(Number(spec.q) || 1, 0.2, 18);
    const g = ctx.createGain();
    g.gain.value = clamp(Number(spec.gain) || 0, 0, 2);
    bp.connect(g);
    g.connect(shaper);
    formantNodes.push({
      bp,
      base: Number(spec.base) || 280,
      rpm: Number(spec.rpm) || 0,
    });
  }

  shaper.connect(safety);
  safety.connect(lope);
  lope.connect(out);
  out.connect(destination);

  const detune = Math.max(0, Number(preset.detuneCents) || 0);
  const spreads = detune > 0.4 ? [-detune, 0, detune] : [0];
  const weights = spreads.length === 3 ? [0.34, 0.52, 0.34] : [1];
  const oscs = [];
  const specs = (Array.isArray(preset.osc) ? preset.osc : []).filter((spec) => {
    return spec && typeof spec === "object" && Number(spec.ratio) > 0 && Number.isFinite(Number(spec.gain));
  });
  if (!specs.length) throw new Error("engine preset needs an osc list");
  for (const spec of specs) {
    const ratio = Number(spec.ratio);
    const gain = clamp(Number(spec.gain), 0, 1.2);
    const wave = Array.isArray(spec.wave) && spec.wave.length ? makeWave(ctx, spec.wave.slice(0, 16)) : null;
    const type = OSC_TYPES.has(spec.type) ? spec.type : "sine";
    spreads.forEach((cents, i) => {
      const o = ctx.createOscillator();
      try {
        if (wave) o.setPeriodicWave(wave);
        else o.type = type;
      } catch (err) {
        console.error(err);
        o.type = "sine";
      }
      o.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = gain * weights[i];
      o.connect(g);
      g.connect(filter);
      for (const f of formantNodes) g.connect(f.bp);
      o.start();
      started.push(o);
      oscs.push({ o, ratio });
    });
  }

  const noiseLen = Math.floor(ctx.sampleRate * 1.6);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const ch = noiseBuf.getChannelData(0);
  let brown = 0;
  let peak = 0.001;
  const raw = new Float32Array(noiseLen);
  const nz0 = preset.noise || {};
  const poleIn = Number(nz0.brownPole);
  const pole = Number.isFinite(poleIn) ? clamp(poleIn, 0.5, 0.995) : 0.98;
  const exciteIn = Number(nz0.brownExcite);
  const excite = Number.isFinite(exciteIn) ? clamp(exciteIn, 0.005, 1) : 0.02;
  for (let i = 0; i < noiseLen; i++) {
    const white = Math.random() * 2 - 1;
    brown = brown * pole + white * excite;
    raw[i] = brown;
    peak = Math.max(peak, Math.abs(brown));
  }
  for (let i = 0; i < noiseLen; i++) ch[i] = raw[i] / peak;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 180;
  noiseFilter.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(lope);
  noise.start();
  started.push(noise);
  lfo.start();
  started.push(lfo);

  function update(rpm, throttlePct, muted) {
    const now = ctx.currentTime;
    const thr = clamp((Number(throttlePct) || 0) / 100, 0, 1);
    const rpmMin = Number(preset.rpmMin) || 4000;
    const rpmMax = Number(preset.rpmMax) > rpmMin ? Number(preset.rpmMax) : rpmMin + 4000;
    const rpmN = clamp(((Number(rpm) || 0) - rpmMin) / (rpmMax - rpmMin), 0, 1);
    const gainSpec = preset.gain || {};
    const filt = preset.filter || {};
    const nz = preset.noise || {};
    const master = clamp(Number(preset.master) || 0, 0, 1.5);
    const base = clamp(Number(gainSpec.base) || 0, 0, 0.6);
    const thrG = clamp(Number(gainSpec.throttle) || 0, 0, 0.8);
    const floor = clamp(num(gainSpec.rpmFloor, 0.5), 0, 1);
    const level = muted ? 0.0001 : master * (base + thrG * thr) * (floor + (1 - floor) * rpmN);
    const tc = 0.04;

    const f = firingHz(rpm, preset);
    for (const s of oscs) {
      s.o.frequency.setTargetAtTime(Math.max(18, f * s.ratio), now, 0.025);
    }

    const open = clamp(
      (Number(filt.base) || 180) + rpmN * (Number(filt.rpm) || 500) + thr * (Number(filt.throttle) || 700),
      60,
      safety.frequency.value
    );
    filter.frequency.setTargetAtTime(open, now, tc);
    filter.Q.setTargetAtTime(
      clamp((Number(filt.qBase) || 0.6) + thr * (Number(filt.qThrottle) || 0.3), 0.3, 3),
      now,
      0.05
    );
    for (const f of formantNodes) {
      f.bp.frequency.setTargetAtTime(clamp(f.base + rpmN * f.rpm, 40, 8000), now, tc);
    }

    const lopeDepth = clamp(Number(preset.lope) || 0, 0, 0.42) * (1 - 0.5 * rpmN);
    const crank = Math.max(4, (Number(rpm) || 0) / 60) * (Number(preset.lopeRate) > 0 ? Number(preset.lopeRate) : 1);
    const lopeHz = Math.min(clamp(Number(preset.lopeMaxHz) || 12, 4, 40), crank);
    lfo.frequency.setTargetAtTime(muted ? 0.01 : lopeHz, now, 0.08);
    lfoAmt.gain.setTargetAtTime(muted ? 0 : lopeDepth, now, 0.06);
    lope.gain.setTargetAtTime(1 - (muted ? 0 : lopeDepth), now, 0.06);

    noiseFilter.frequency.setTargetAtTime(
      clamp((Number(nz.hpBase) || 140) + rpmN * (Number(nz.hpRpm) || 160) + thr * (Number(nz.hpThrottle) || 80), 50, 1200),
      now,
      tc
    );
    const overrun = (1 - thr) * rpmN;
    noiseGain.gain.setTargetAtTime(
      muted ? 0 : (Number(nz.gainBase) || 0) + thr * (Number(nz.gainThrottle) || 0) + overrun * (Number(nz.overrun) || 0),
      now,
      tc
    );
    return level;
  }

  function fadeOut(when) {
    try {
      out.gain.cancelScheduledValues(when);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), when);
      out.gain.linearRampToValueAtTime(0.0001, when + 0.03);
    } catch { /* node already closed */ }
  }

  function stop(when) {
    for (const node of started) {
      try { node.stop(when); } catch { /* already stopped */ }
    }
    const lead = started[0];
    if (lead) {
      lead.onended = () => {
        try { out.disconnect(); } catch { /* already gone */ }
      };
    }
  }

  return { update, fadeOut, stop };
}

/**
 * I3DL2-style send on the car engine. One tap per probe. The probe fan
 * is variable length, so the graph grows to however many hits arrive.
 *
 * distance (m) → delay = distance / 343
 * level = reflect / (1 + distance / span) × bridgeWeight
 *   glass    reflect 1.40, span 28 m, HF 8800 Hz, LF 160 Hz, RT 1.25 s
 *   concrete reflect 1.25, span 36 m, HF 3800 Hz, LF 80 Hz,  RT 1.05 s
 *   grass    reflect 0.70, span 24 m, HF 800 Hz,  LF 240 Hz, RT 0.22 s
 *   open     reflect 0.20, span 40 m, HF 1700 Hz, LF 110 Hz, RT 0.62 s
 * Every surface uses the same tail: 10^(-3·delay/RT60), capped at 0.34.
 * Grass is a soft reflect, concrete and glass are hard, and an open miss
 * is the lightest. A hit of any of those raises the mean, because each
 * reflect stays above the open miss out to the ray length.
 *
 *   mean     = average(level)
 *   openMiss = open reflect / (1 + 80 / open span)
 *   lift     = max(0, mean / openMiss − 1)     // 0 when every probe misses
 *   t        = min(1, (lift / ENCLOSE_LIFT) ^ HIT_POWER)
 *   wet      = Min + (Max − Min) × t
 *
 * ENCLOSE_LIFT is the lift of a both-sides grandstand. The bridge overhead
 * sits above it, so both fill Max. A one-sided wall climbs and stays under
 * that. Close grass lifts the mean a little, so wet sits above Min.
 * Min and Max are the only wetness sliders. Tap gains share `wet` in
 * proportion to level. Ahead, overhead, and behind rays carry hit.weight,
 * and that weight applies when the hit is a bridge. A grandstand on those
 * rays is not boosted. The loudest level is the tap the delay bar follows.
 * Early reflections are the distance taps. The diffuse tail is a short noise
 * burst of the dry note (not of the comb), scaled by the same wetness, so a
 * harmonic null in one delay cannot silence the room. The dry engine is not
 * filtered. The wet bus is mixed after the compressor so the engine note does
 * not duck the tail. Reverb off closes it. A safety limiter after the sum only catches peaks
 * near full scale; the dry note alone stays under it.
 */
const ROOM_MAT = {
  glass: { reflect: 1.4, hf: 8800, lf: 160, rt: 1.25, span: 28 },
  concrete: { reflect: 1.25, hf: 3800, lf: 80, rt: 1.05, span: 36 },
  grass: { reflect: 0.7, hf: 800, lf: 240, rt: 0.22, span: 24 },
  open: { reflect: 0.2, hf: 1700, lf: 110, rt: 0.62, span: 40 },
};
const SOUND_MPS = 343;
/** Open-air floor and both-sides / bridge ceiling at the slider defaults. */
export const REVERB_OPEN = 0.05;
export const REVERB_CAP = 1.15;
/** Top of the Max reverb slider. The default ceiling stays REVERB_CAP. */
export const REVERB_MAX = 30;
const OPEN_WET = REVERB_OPEN;
const WET_CAP = REVERB_CAP;
/**
 * lift / ENCLOSE_LIFT, raised to HIT_POWER, fills the span from Min to Max.
 * A both-sides corridor measures about this lift. The bridge overhead is
 * higher. Close grass is a small lift, so it clears Min without reaching Max.
 */
const ENCLOSE_LIFT = 8;
const HIT_POWER = 1.5;
const MISS_DIST = 80;

function materialLevel(mat, dist) {
  return mat.reflect / (1 + dist / mat.span);
}

function reverbBounds(bounds) {
  const src = bounds || {};
  const openWet = Number.isFinite(Number(src.openWet)) ? clamp(src.openWet, 0, 2) : OPEN_WET;
  let wetCap = Number.isFinite(Number(src.wetCap)) ? clamp(src.wetCap, 0, REVERB_MAX) : WET_CAP;
  if (wetCap < openWet) wetCap = openWet;
  return { openWet, wetCap };
}

export function reverbMix(hits, bounds) {
  const list = Array.isArray(hits) ? hits : [];
  const rows = [];
  for (let i = 0; i < list.length; i++) {
    const hit = list[i] || {};
    const kind = ROOM_MAT[hit.material] ? hit.material : "open";
    const mat = ROOM_MAT[kind];
    const raw = num(hit.distance, MISS_DIST);
    const dist = Math.max(2, Math.min(160, Math.round(raw / 2) * 2 || 2));
    const delay = Math.min(0.45, Math.max(0.008, dist / SOUND_MPS));
    const amp = materialLevel(mat, dist);
    const rt = Math.max(0.05, mat.rt * (0.75 + Math.min(dist, 70) / 180));
    const fb = Math.min(0.34, Math.pow(10, (-3 * delay) / rt));
    const arc = Number(hit.weight) > 1 ? Number(hit.weight) : 1;
    const boost = hit.cover === "bridge" ? arc : 1;
    rows.push({
      id: hit.id || String(i),
      material: kind,
      cover: hit.cover || "",
      distance: dist,
      delay,
      amp,
      boost,
      fb,
      hf: mat.hf,
      lf: mat.lf,
      reflect: mat.reflect,
    });
  }
  if (!rows.length) return { rows, dominant: null, wet: 0, trim: 1 };
  const { openWet, wetCap } = reverbBounds(bounds);
  const openMiss = materialLevel(ROOM_MAT.open, MISS_DIST);
  let sum = 0;
  for (const row of rows) {
    const boost = Number(row.boost) > 0 ? Number(row.boost) : 1;
    row.level = row.amp * boost;
    sum += row.level;
  }
  const mean = sum / rows.length;
  const lift = Math.max(0, openMiss > 0 ? mean / openMiss - 1 : 0);
  const t = Math.min(1, Math.pow(lift / ENCLOSE_LIFT, HIT_POWER));
  const wetTarget = openWet + (wetCap - openWet) * t;
  const scale = sum > 0 ? wetTarget / sum : 0;
  let dominant = rows[0];
  let wet = 0;
  for (const row of rows) {
    row.gain = row.level * scale;
    row.wet = row.gain;
    row.amp = row.gain;
    wet += row.gain;
    if (row.level > dominant.level) dominant = row;
  }
  return { rows, dominant, wet, trim: 1 };
}

/** Same mix, shaped for the readout: each tap's wet is its post-trim gain. */
export function roomFromHits(hits, bounds) {
  const mix = reverbMix(hits, bounds);
  return { taps: mix.rows, trim: mix.trim, wet: mix.wet, dominant: mix.dominant };
}

function outputCeiling(max) {
  const n = 4096;
  const curve = new Float32Array(n);
  const knee = 0.72;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const ax = Math.abs(x);
    let y = x;
    if (ax > knee) {
      const over = ax - knee;
      const shaped = knee + (max - knee) * (1 - Math.exp(-over / (max - knee)));
      y = Math.sign(x) * Math.min(max, shaped);
    }
    curve[i] = y;
  }
  return curve;
}

function diffuseTail(ctx, seconds) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      const t = i / ctx.sampleRate;
      // About -60 dB at `seconds`, independent per ear so it does not
      // line up with the engine's harmonics and cancel them.
      data[i] = (Math.random() * 2 - 1) * Math.exp(-6.9 * t / seconds);
    }
    let peak = 0.001;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
    for (let i = 0; i < n; i++) data[i] = data[i] / peak * 0.35;
  }
  return buf;
}

function createRoom(ctx, source) {
  const taps = [];
  const wet = ctx.createGain();
  wet.gain.value = 1;
  let openWet = OPEN_WET;
  let wetCap = WET_CAP;
  let drive = 1;
  let busGain = 1;

  function makeTap() {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 120;
    hp.Q.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;
    lp.Q.value = 0.7;
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.02;
    const fb = ctx.createGain();
    fb.gain.value = 0;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(hp);
    hp.connect(lp);
    lp.connect(delay);
    delay.connect(gain);
    delay.connect(fb);
    fb.connect(delay);
    gain.connect(wet);
    return { hp, lp, delay, fb, gain };
  }

  const out = ctx.createGain();
  out.gain.value = 1;
  wet.connect(out);

  const tailIn = ctx.createBiquadFilter();
  tailIn.type = "highpass";
  tailIn.frequency.value = 140;
  tailIn.Q.value = 0.7;
  const tailTone = ctx.createBiquadFilter();
  tailTone.type = "lowpass";
  tailTone.frequency.value = 4200;
  tailTone.Q.value = 0.7;
  const tail = ctx.createConvolver();
  tail.normalize = false;
  tail.buffer = diffuseTail(ctx, 0.9);
  const tailDrive = ctx.createGain();
  tailDrive.gain.value = 0.2;
  const tailGain = ctx.createGain();
  tailGain.gain.value = 0.58;
  source.connect(tailDrive);
  tailDrive.connect(tailIn);
  tailIn.connect(tailTone);
  tailTone.connect(tail);
  tail.connect(tailGain);
  // Tail shares the wet bus, so Min, Max, and Reverb off scale it with the taps.
  tailGain.connect(wet);

  function setBounds(bounds) {
    const next = reverbBounds(bounds);
    openWet = next.openWet;
    wetCap = next.wetCap;
    return next;
  }

  function setHits(hits) {
    const now = ctx.currentTime;
    // Taps stay on the default curve. The wet bus is the Min–Max mix,
    // so the heard level matches the meter.
    const shaped = reverbMix(hits);
    const mix = reverbMix(hits, { openWet, wetCap });
    drive = shaped.wet > 1e-4 ? mix.wet / shaped.wet : 0;
    while (taps.length < shaped.rows.length) taps.push(makeTap());
    const tc = 0.08;
    for (let i = 0; i < taps.length; i++) {
      const row = shaped.rows[i];
      const tap = taps[i];
      if (!row) {
        tap.gain.gain.setTargetAtTime(0, now, tc);
        continue;
      }
      tap.delay.delayTime.setTargetAtTime(row.delay, now, tc);
      tap.hp.frequency.setTargetAtTime(row.lf, now, tc);
      tap.lp.frequency.setTargetAtTime(row.hf, now, tc);
      tap.fb.gain.setTargetAtTime(row.fb, now, tc);
      tap.gain.gain.setTargetAtTime(row.gain, now, tc);
    }
    // Reference tail. The wet bus scales it with the taps.
    const tailLevel = Math.max(0, shaped.wet / WET_CAP) * 0.9;
    tailDrive.gain.setTargetAtTime(tailLevel, now, tc);
    applyWetGain();
    mix.bus = busGain;
    return mix;
  }

  function setEnabled(on) {
    out.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.03);
  }

  function applyWetGain() {
    busGain = drive;
    wet.gain.setTargetAtTime(busGain, ctx.currentTime, 0.05);
  }

  setHits([]);
  return {
    connect(dest) {
      out.connect(dest);
    },
    setHits,
    setEnabled,
    setBounds,
    get busGain() {
      return busGain;
    },
  };
}

export function createEngine(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const shift = ctx.createGain();
  shift.gain.value = 1;

  const hip = ctx.createBiquadFilter();
  hip.type = "highpass";
  hip.frequency.value = 38;
  hip.Q.value = 0.7;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.45;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.012;
  comp.release.value = 0.22;

  shift.connect(master);
  master.connect(hip);
  hip.connect(comp);
  // Wet joins after the compressor. The dry engine stays unfiltered, and
  // the tail is not ducked by the note that feeds the compressor.
  const room = createRoom(ctx, hip);
  // Linear through the dry preset peaks (about 0.5). Above 0.72 the sum
  // eases toward full scale so a loud preset plus the send cannot clip.
  const ceiling = ctx.createWaveShaper();
  ceiling.curve = outputCeiling(0.94);
  ceiling.oversample = "none";
  comp.connect(ceiling);
  room.connect(ceiling);
  ceiling.connect(analyser);
  analyser.connect(ctx.destination);

  let muted = false;
  let prevThr = null;
  let prevGear = null;
  let voice = null;
  let preset = null;
  let voiceLevel = 0.0001;

  function loadPreset(next) {
    if (!next || !Array.isArray(next.osc) || !next.osc.length) {
      throw new Error("engine preset needs an osc list");
    }
    // Build first so a throw leaves the current voice running. The page
    // starts this only after the AudioContext is running; oscillators
    // begun while suspended often stay silent after resume.
    const built = buildVoice(ctx, next, shift);
    const now = ctx.currentTime;
    if (voice) {
      const old = voice;
      old.fadeOut(now);
      old.stop(now + 0.04);
    }
    preset = next;
    voice = built;
    prevThr = null;
  }

  function update(rpm, throttlePct, gear) {
    const now = ctx.currentTime;
    const thr = clamp((Number(throttlePct) || 0) / 100, 0, 1);
    const falling = prevThr != null && thr < prevThr - 0.05;
    const tc = falling ? 0.012 : 0.045;
    prevThr = thr;
    if (voice) voiceLevel = voice.update(rpm, throttlePct, muted);
    master.gain.setTargetAtTime(voiceLevel, now, tc);

    if (gear != null && prevGear != null && gear !== prevGear) {
      shift.gain.cancelScheduledValues(now);
      shift.gain.setValueAtTime(Math.max(0.45, shift.gain.value), now);
      shift.gain.linearRampToValueAtTime(0.42, now + 0.02);
      shift.gain.linearRampToValueAtTime(1, now + 0.12);
    }
    if (gear != null) prevGear = gear;
  }

  function level() {
    const bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);
    let sum = 0;
    let wsum = 0;
    const nyquist = ctx.sampleRate / 2;
    for (let i = 1; i < bins.length; i++) {
      sum += bins[i];
      wsum += bins[i] * (i / bins.length) * nyquist;
    }
    const time = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(time);
    let energy = 0;
    for (let i = 0; i < time.length; i++) energy += time[i] * time[i];
    return {
      rms: sum / bins.length,
      centroid: sum > 0 ? wsum / sum : 0,
      amp: Math.sqrt(energy / time.length),
    };
  }

  function setMuted(m) {
    muted = !!m;
    if (muted) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
  }

  return {
    update,
    level,
    setMuted,
    loadPreset,
    setReverb(on) {
      room.setEnabled(!!on);
    },
    setSurroundings(hits) {
      return room.setHits(hits);
    },
    setReverbBounds(bounds) {
      return room.setBounds(bounds);
    },
    get wetBus() {
      return room.busGain;
    },
    get muted() {
      return muted;
    },
    get preset() {
      return preset;
    },
    context: ctx,
  };
}

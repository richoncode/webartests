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
 * I3DL2-style send on the car engine. One tap per probe, in the order
 * forward, back, left, right, up.
 *
 * distance (m) → delay = distance / 343, amplitude = reflect / (1 + distance/12)
 * material → highpass (LF cutoff) and lowpass (HF cutoff)
 *   glass    reflects high: reflect 0.82, HF 9000 Hz, LF 180 Hz, longer tail
 *   concrete reflects mid:  reflect 0.55, HF 3200 Hz, LF 90 Hz
 *   grass    absorbs:       reflect 0.08, HF 900 Hz,  LF 220 Hz, almost no tail
 *   open     dry:           reflect 0.012, so a field leaves the dry engine
 * Hard-wall feedback is 10^(-3·delay/RT60), capped at 0.58. Grass stays near 0.1.
 * The dry engine is not filtered. This is a send, mixed in after the hipass.
 */
const ROOM_MAT = {
  glass: { reflect: 0.82, hf: 9000, lf: 180, rt: 1.05 },
  concrete: { reflect: 0.55, hf: 3200, lf: 90, rt: 0.75 },
  grass: { reflect: 0.08, hf: 900, lf: 220, rt: 0.28 },
  open: { reflect: 0.012, hf: 1400, lf: 150, rt: 0.2 },
};
const SOUND_MPS = 343;

function createRoom(ctx, source) {
  const taps = [];
  for (let i = 0; i < 5; i++) {
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
    taps.push({ hp, lp, delay, fb, gain });
  }
  const wet = ctx.createGain();
  wet.gain.value = 1;
  for (const tap of taps) tap.gain.connect(wet);

  function setHits(hits) {
    const now = ctx.currentTime;
    const list = Array.isArray(hits) ? hits : [];
    const amps = [];
    const tc = 0.12;
    for (let i = 0; i < taps.length; i++) {
      const hit = list[i] || {};
      const kind = ROOM_MAT[hit.material] ? hit.material : "open";
      const mat = ROOM_MAT[kind];
      const raw = num(hit.distance, 80);
      const dist = Math.max(2, Math.min(160, Math.round(raw / 2) * 2 || 2));
      const delay = Math.min(0.45, Math.max(0.006, dist / SOUND_MPS));
      let amp = kind === "open" && !list.length ? 0 : mat.reflect / (1 + dist / 12);
      let fb = 0.03;
      if (kind === "glass" || kind === "concrete") {
        const rt = mat.rt * (0.7 + Math.min(dist, 70) / 140);
        fb = Math.min(0.58, Math.pow(10, (-3 * delay) / Math.max(0.2, rt)));
      } else if (kind === "grass") {
        fb = 0.1;
        amp *= 0.85;
      } else {
        fb = 0.02;
      }
      amps.push(amp);
      const tap = taps[i];
      tap.delay.delayTime.setTargetAtTime(delay, now, tc);
      tap.hp.frequency.setTargetAtTime(mat.lf, now, tc);
      tap.lp.frequency.setTargetAtTime(mat.hf, now, tc);
      tap.fb.gain.setTargetAtTime(fb, now, tc);
      tap._amp = amp;
    }
    const sum = amps.reduce((s, a) => s + a, 0);
    const trim = sum > 0.85 ? 0.85 / sum : 1;
    for (let i = 0; i < taps.length; i++) {
      taps[i].gain.gain.setTargetAtTime(amps[i] * trim, now, tc);
    }
  }

  setHits([]);
  return {
    connect(dest) {
      wet.connect(dest);
    },
    setHits,
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
  const room = createRoom(ctx, hip);
  room.connect(comp);
  comp.connect(analyser);
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
    setSurroundings(hits) {
      room.setHits(hits);
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

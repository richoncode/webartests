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

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
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
  const imag = new Float32Array(mags.length + 1);
  const real = new Float32Array(mags.length + 1);
  for (let i = 0; i < mags.length; i++) imag[i + 1] = Number(mags[i]) || 0;
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
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

  filter.connect(shaper);
  shaper.connect(safety);
  safety.connect(lope);
  lope.connect(out);
  out.connect(destination);

  const detune = Math.max(0, Number(preset.detuneCents) || 0);
  const spreads = detune > 0.4 ? [-detune, 0, detune] : [0];
  const weights = spreads.length === 3 ? [0.34, 0.52, 0.34] : [1];
  const oscs = [];
  const specs = Array.isArray(preset.osc) ? preset.osc : [];
  for (const spec of specs) {
    const ratio = Number(spec.ratio) > 0 ? Number(spec.ratio) : 1;
    const gain = clamp(Number(spec.gain) || 0, 0, 1.2);
    const wave = Array.isArray(spec.wave) && spec.wave.length ? makeWave(ctx, spec.wave.slice(0, 16)) : null;
    const type = OSC_TYPES.has(spec.type) ? spec.type : "sine";
    spreads.forEach((cents, i) => {
      const o = ctx.createOscillator();
      if (wave) o.setPeriodicWave(wave);
      else o.type = type;
      o.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = gain * weights[i];
      o.connect(g);
      g.connect(filter);
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
  for (let i = 0; i < noiseLen; i++) {
    const white = Math.random() * 2 - 1;
    brown = brown * 0.98 + white * 0.02;
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
    const floor = clamp(Number(gainSpec.rpmFloor) ?? 0.5, 0, 1);
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
    const now = ctx.currentTime;
    if (voice) {
      const old = voice;
      voice = null;
      old.fadeOut(now);
      old.stop(now + 0.04);
    }
    preset = next;
    voice = buildVoice(ctx, next, shift);
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
    get muted() {
      return muted;
    },
    get preset() {
      return preset;
    },
    context: ctx,
  };
}

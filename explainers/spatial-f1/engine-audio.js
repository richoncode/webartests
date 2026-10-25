/**
 * Dyno-locked stand-in for an F1 power unit.
 * Pitch follows RPM (4-stroke V6: three combustion events per revolution).
 * Loudness and filter brightness follow throttle. Gear changes only dip the gain.
 * This is Web Audio, not a gas-dynamics simulator.
 */

export const FIRING_PER_REV = 3;

export function firingHz(rpm) {
  return Math.max(32, (rpm / 60) * FIRING_PER_REV);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function distortionCurve(amount) {
  const n = 513;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
}

export function createEngine(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const shift = ctx.createGain();
  shift.gain.value = 1;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.7;

  const shaper = ctx.createWaveShaper();
  shaper.curve = distortionCurve(2.1);
  shaper.oversample = "2x";

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.45;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.12;

  filter.connect(shaper);
  shaper.connect(shift);
  shift.connect(master);
  master.connect(comp);
  comp.connect(analyser);
  analyser.connect(ctx.destination);

  const partials = [
    { ratio: 0.5, type: "sine", gain: 0.22 },
    { ratio: 1, type: "sawtooth", gain: 0.48 },
    { ratio: 2, type: "square", gain: 0.16 },
    { ratio: 3.01, type: "sawtooth", gain: 0.07 },
    { ratio: 4.02, type: "triangle", gain: 0.035 },
  ];
  const oscs = partials.map((p) => {
    const o = ctx.createOscillator();
    o.type = p.type;
    const g = ctx.createGain();
    g.gain.value = p.gain;
    o.connect(g);
    g.connect(filter);
    o.start();
    return { o, ratio: p.ratio };
  });

  const noiseLen = Math.floor(ctx.sampleRate * 1.5);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const ch = noiseBuf.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < noiseLen; i++) {
    const white = Math.random() * 2 - 1;
    brown = brown * 0.97 + white * 0.03;
    ch[i] = brown * 3.2;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 700;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.015;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(shift);
  noise.start();

  let muted = false;
  let prevThr = null;
  let prevGear = null;

  function update(rpm, throttlePct, gear) {
    const now = ctx.currentTime;
    const thr = clamp((Number(throttlePct) || 0) / 100, 0, 1);
    const rpmN = clamp(((Number(rpm) || 0) - 4800) / 7400, 0, 1);
    const falling = prevThr != null && thr < prevThr - 0.05;
    const tc = falling ? 0.008 : 0.045;
    prevThr = thr;

    const f = firingHz(rpm);
    for (const s of oscs) s.o.frequency.value = f * s.ratio;

    const overrun = (1 - thr) * rpmN;
    const gain = muted
      ? 0.0001
      : (0.04 + 0.24 * thr) * (0.42 + 0.58 * rpmN) + overrun * 0.05;
    master.gain.setTargetAtTime(gain, now, tc);
    filter.frequency.setTargetAtTime(240 + rpmN * 1500 + thr * 3800, now, tc);
    filter.Q.setTargetAtTime(0.55 + thr * 1.15, now, 0.05);
    noiseFilter.frequency.value = 500 + rpmN * 900 + thr * 400;
    noiseGain.gain.setTargetAtTime(muted ? 0 : 0.012 + thr * 0.07 + overrun * 0.02, now, tc);

    if (gear != null && prevGear != null && gear !== prevGear) {
      shift.gain.cancelScheduledValues(now);
      shift.gain.setValueAtTime(Math.max(0.4, shift.gain.value), now);
      shift.gain.linearRampToValueAtTime(0.38, now + 0.02);
      shift.gain.linearRampToValueAtTime(1, now + 0.11);
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
    return {
      rms: sum / bins.length,
      centroid: sum > 0 ? wsum / sum : 0,
    };
  }

  function setMuted(m) {
    muted = !!m;
    if (muted) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.015);
  }

  return {
    update,
    level,
    setMuted,
    get muted() {
      return muted;
    },
    context: ctx,
  };
}

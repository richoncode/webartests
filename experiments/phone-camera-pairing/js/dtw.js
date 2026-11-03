// Gesture match from US 9,162,144 B2.
//
// Plane-aligned phone acceleration is compared with acceleration derived from
// the tracked wrist. Dynamic time warping absorbs the small clock skew between
// the phone and the laptop. An in-plane rotation search absorbs the unknown
// yaw between the phone's axes and the image plane (the patent's "normalize").
// Magnitude correlation is the rotation-invariant second opinion.

import { imagePlaneAccel, phonePlaneAccel, seriesRms } from './plane.js';

export const MATCH = {
  // A matching scribble scores near 0.06 (about 0.2 with a noisy wrist).
  // A different wave scores near 0.37, so 0.32 separates them and still
  // leaves room for landmark jitter. Correlation has to agree.
  maxDtw: 0.32,
  minCorr: 0.3,
  minPhoneRms: 1.15,
  minCameraRms: 0.55,
  minSpanMs: 900,
  points: 48,
  windowMs: 1600,
};

function segments(series, maxGap) {
  const parts = [];
  let current = [];
  for (const sample of series) {
    if (current.length && sample.t - current[current.length - 1].t > maxGap) {
      parts.push(current);
      current = [];
    }
    current.push(sample);
  }
  if (current.length) parts.push(current);
  return parts;
}

function sliceWindow(series, windowMs, pick) {
  if (!series.length) return [];
  const span = series[series.length - 1].t - series[0].t;
  if (pick !== 'energetic' || span <= windowMs) {
    const start = series[series.length - 1].t - windowMs;
    return series.filter((s) => s.t >= start);
  }
  let bestStart = series[0].t;
  let bestScore = -1;
  for (let i = 0; i < series.length; i += 1) {
    const start = series[i].t;
    const end = start + windowMs;
    if (end > series[series.length - 1].t) break;
    let energy = 0;
    let count = 0;
    for (let k = i; k < series.length && series[k].t <= end; k += 1) {
      energy += series[k].x * series[k].x + series[k].y * series[k].y;
      count += 1;
    }
    if (count >= 8 && energy / count > bestScore) {
      bestScore = energy / count;
      bestStart = start;
    }
    const hop = start + 80;
    while (i + 1 < series.length && series[i + 1].t < hop) i += 1;
  }
  return series.filter((s) => s.t >= bestStart && s.t <= bestStart + windowMs);
}

function chooseSegment(series, pick) {
  const parts = segments(series, 220).filter((part) => {
    // A CPU-bound pose model may only deliver a handful of frames a second.
    if (part.length < 5) return false;
    return part[part.length - 1].t - part[0].t >= 700;
  });
  if (!parts.length) return [];
  if (pick === 'recent') return parts[parts.length - 1];
  let best = parts[0];
  let bestRms = -1;
  for (const part of parts) {
    const energy = seriesRms(part);
    if (energy > bestRms) {
      bestRms = energy;
      best = part;
    }
  }
  return best;
}

export function resample(series, count) {
  if (series.length < 2 || count < 2) return [];
  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  if (t1 <= t0) return [];
  const out = [];
  let j = 0;
  for (let i = 0; i < count; i += 1) {
    const t = t0 + ((t1 - t0) * i) / (count - 1);
    while (j < series.length - 2 && series[j + 1].t < t) j += 1;
    const a = series[j];
    const b = series[j + 1];
    const u = b.t === a.t ? 0 : Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
    out.push([a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u]);
  }
  return out;
}

export function normalizeEnergy(series) {
  const n = series.length;
  if (!n) return [];
  let mx = 0;
  let my = 0;
  for (const [x, y] of series) {
    mx += x;
    my += y;
  }
  mx /= n;
  my /= n;
  let energy = 0;
  for (const [x, y] of series) energy += (x - mx) ** 2 + (y - my) ** 2;
  const scale = Math.sqrt(energy / n) || 1;
  return series.map(([x, y]) => [(x - mx) / scale, (y - my) / scale]);
}

function rotate(series, angle, mirror) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return series.map(([x, y]) => {
    const xx = mirror ? -x : x;
    return [c * xx - s * y, s * xx + c * y];
  });
}

// Mean cost along the warp. Equal-length inputs, Sakoe-Chiba band of 50%.
export function dtwCost(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return Infinity;
  const band = Math.max(2, Math.floor(Math.max(n, m) * 0.5));
  const inf = 1e12;
  let prev = new Float64Array(m + 1).fill(inf);
  let curr = new Float64Array(m + 1).fill(inf);
  prev[0] = 0;
  for (let i = 1; i <= n; i += 1) {
    curr.fill(inf);
    const j0 = Math.max(1, i - band);
    const j1 = Math.min(m, i + band);
    const ax = a[i - 1][0];
    const ay = a[i - 1][1];
    for (let j = j0; j <= j1; j += 1) {
      const dx = ax - b[j - 1][0];
      const dy = ay - b[j - 1][1];
      const cost = Math.hypot(dx, dy);
      const best = Math.min(prev[j], curr[j - 1], prev[j - 1]);
      curr[j] = cost + best;
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[m] / (n + m);
}

export function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 4) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i += 1) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da < 1e-9 || db < 1e-9) return 0;
  return num / Math.sqrt(da * db);
}

function magnitude(series) {
  return series.map(([x, y]) => Math.hypot(x, y));
}

export function bestAlignment(phone, camera) {
  let best = { dtw: Infinity, angle: 0, mirror: false, series: phone };
  for (let step = 0; step < 24; step += 1) {
    const angle = (step * Math.PI) / 12;
    for (const mirror of [false, true]) {
      const spun = rotate(phone, angle, mirror);
      const cost = dtwCost(spun, camera);
      if (cost < best.dtw) best = { dtw: cost, angle, mirror, series: spun };
    }
  }
  return best;
}

export function reasonText(code) {
  switch (code) {
    case 'need-more-phone':
      return 'Need about a second of phone motion.';
    case 'need-more-camera':
      return 'Need about a second of tracked wrist motion.';
    case 'too-still':
      return 'That window is too still. Scribble the phone across the frame.';
    case 'short-window':
      return 'Gesture window is too short.';
    default:
      return '';
  }
}

function empty(reason) {
  return {
    ok: false,
    reason,
    paired: false,
    dtw: null,
    corr: null,
    angleDeg: null,
    mirror: false,
    zEnergy: null,
    inPlane: null,
    phoneRms: 0,
    cameraRms: 0,
  };
}

/**
 * Compare a phone IMU capture with tracked image positions (y downward, 0–1).
 * `pick` is `recent` (live) or `energetic` (the strongest 1.6s of a recording).
 */
export function compareGestures(phoneSamples, cameraPositions, options = {}) {
  const cfg = { ...MATCH, ...(options.thresholds || {}) };
  const pick = options.pick || 'recent';
  const windowMs = options.windowMs || cfg.windowMs;
  const phoneAligned = phonePlaneAccel(phoneSamples || []);
  const cameraAccel = imagePlaneAccel(cameraPositions || []);
  const phoneSeg = chooseSegment(phoneAligned.series, pick);
  const cameraSeg = chooseSegment(cameraAccel, pick);
  if (phoneSeg.length < 5) return { ...empty('need-more-phone'), inPlane: phoneAligned.inPlane };
  if (cameraSeg.length < 5) return { ...empty('need-more-camera'), zEnergy: phoneAligned.zEnergy, inPlane: phoneAligned.inPlane };
  const phoneWin = sliceWindow(phoneSeg, windowMs, pick);
  const cameraWin = sliceWindow(cameraSeg, windowMs, pick);
  const phoneSpan = phoneWin.length ? phoneWin[phoneWin.length - 1].t - phoneWin[0].t : 0;
  const cameraSpan = cameraWin.length ? cameraWin[cameraWin.length - 1].t - cameraWin[0].t : 0;
  if (phoneSpan < cfg.minSpanMs || cameraSpan < cfg.minSpanMs) {
    return { ...empty('short-window'), zEnergy: phoneAligned.zEnergy, inPlane: phoneAligned.inPlane };
  }
  const phoneRms = seriesRms(phoneWin);
  const cameraRms = seriesRms(cameraWin);
  const base = {
    ok: true,
    reason: '',
    zEnergy: phoneAligned.zEnergy,
    inPlane: phoneAligned.inPlane,
    phoneRms,
    cameraRms,
    usedPlatformLinear: phoneAligned.usedPlatformLinear,
  };
  if (phoneRms < cfg.minPhoneRms || cameraRms < cfg.minCameraRms) {
    return { ...base, ...empty('too-still'), ok: false, zEnergy: phoneAligned.zEnergy, inPlane: phoneAligned.inPlane, phoneRms, cameraRms };
  }
  const phoneN = normalizeEnergy(resample(phoneWin, cfg.points));
  const cameraN = normalizeEnergy(resample(cameraWin, cfg.points));
  const aligned = bestAlignment(phoneN, cameraN);
  const corr = pearson(magnitude(phoneN), magnitude(cameraN));
  const paired = aligned.dtw <= cfg.maxDtw && corr >= cfg.minCorr;
  return {
    ...base,
    paired,
    dtw: aligned.dtw,
    corr,
    angleDeg: (aligned.angle * 180) / Math.PI,
    mirror: aligned.mirror,
  };
}

function hashNoise(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

function gestureAccel(seconds, i, stretch) {
  const t = (i / 60) * stretch;
  if (t > seconds) return null;
  return {
    ax: 4.6 * Math.sin(2 * Math.PI * 1.05 * t) + 1.4 * Math.sin(2 * Math.PI * 2.1 * t),
    ay: 3.4 * Math.sin(2 * Math.PI * 0.72 * t + 0.7),
    az: 0.22 * Math.sin(2 * Math.PI * 0.4 * t),
  };
}

function integrateCamera(samples, angleDeg, gain) {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  let vx = 0;
  let vy = 0;
  let x = 0.5;
  let y = 0.5;
  const out = [];
  for (let i = 0; i < samples.length; i += 1) {
    const dt = i === 0 ? 1 / 60 : Math.max(0.001, (samples[i].t - samples[i - 1].t) / 1000);
    const ax = samples[i].lax;
    const ay = samples[i].lay;
    const rx = c * ax - s * ay;
    const ry = s * ax + c * ay;
    vx += rx * gain * dt;
    vy += ry * gain * dt;
    x += vx * dt;
    y += vy * dt;
    // Image y grows downward. The integrator's y is up.
    out.push({
      t: samples[i].t,
      x: x + hashNoise(i) * 0.0015,
      y: -y + hashNoise(i + 19) * 0.0015,
      conf: 0.9,
    });
  }
  return out;
}

/** A known-matching pair and a decoy phone trace, for the on-page self-check. */
export function syntheticPair() {
  const phone = [];
  const stretched = [];
  for (let i = 0; i < 180; i += 1) {
    const t = (i * 1000) / 60;
    const g = gestureAccel(3, i, 1);
    phone.push({
      t,
      ax: g.ax,
      ay: g.ay + 9.81,
      az: g.az + 0.4,
      lax: g.ax,
      lay: g.ay,
      laz: g.az,
      gx: 0,
      gy: 0,
      gz: 12 * Math.sin(t / 400),
    });
    // Same wave on a clock that breathes — a nonlinear warp DTW is meant to absorb.
    const seconds = i / 60;
    const warped = seconds + 0.06 * Math.sin((2 * Math.PI * seconds) / 3);
    stretched.push({
      t: warped * 1000,
      lax: g.ax + hashNoise(i + 3) * 0.25,
      lay: g.ay + hashNoise(i + 8) * 0.25,
    });
  }
  const camera = integrateCamera(stretched, 37, 2);
  const decoy = phone.map((s, i) => {
    const t = s.t / 1000;
    const ax = 4.2 * Math.sin(2 * Math.PI * 2.4 * t);
    const ay = 3.1 * Math.cos(2 * Math.PI * 1.7 * t);
    return { ...s, t: s.t, ax, ay: ay + 9.81, az: 0.2, lax: ax, lay: ay, laz: 0.15 * Math.sin(i / 9) };
  });
  return { phone, camera, decoy };
}

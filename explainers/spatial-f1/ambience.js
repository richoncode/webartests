/**
 * Crowd, wind, and tire screech beside the engine. Not a room model.
 *
 * Each grandstand section gets several point sources along its long axis
 * so a pass-by changes level and Doppler per source. Doppler is the
 * source playback rate: Web Audio no longer shifts a PannerNode.
 * The listener is the car. Wind is filtered noise following OpenF1 km/h.
 * Tire is a narrow bandpass on a second noise loop: louder and higher
 * as cornering g and brake g rise. All three sit on one output gain
 * the audio button closes. Engine mute does not touch that gain.
 */

export const SOUND_MPS = 343;
export const ORIGIN = [-97.6339, 30.1347];

const RATE_MIN = 0.86;
const RATE_MAX = 1.16;
const POINT_GAP = 14;
const MAX_POINTS = 56;
/** Per-source gain before distance. Slider 0 is silent; 1.5× is the strong end. */
export const CROWD_VOICE_GAIN = 0.85;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function enOf(lng, lat, origin) {
  const mLng = 111320 * Math.cos(origin[1] * Math.PI / 180);
  return [(lng - origin[0]) * mLng, (lat - origin[1]) * 111320];
}

/** 1 within 50 m of a source, linear to silence at 100 m, silent beyond. */
export function crowdReach(dist) {
  const d = Number(dist);
  if (!(d >= 0)) return 0;
  if (d <= 50) return 1;
  if (d >= 100) return 0;
  return (100 - d) / 50;
}

/** OpenF1 km/h → wind level 0..1 and a bandpass centre. Quiet near 74, full near 308. */
export function windDrive(kmh) {
  const t = clamp(((Number(kmh) || 0) - 60) / 240, 0, 1);
  return { level: Math.pow(t, 1.35), hz: 480 + t * 1700 };
}

export const G_MPS2 = 9.81;

/**
 * Menger curvature (1/m) of three points in metres {e, n}.
 * Zero when any side is under a metre, so a collapsed chord stays quiet.
 */
export function pathCurvature(a, b, c) {
  if (!a || !b || !c) return 0;
  const abx = b.e - a.e;
  const aby = b.n - a.n;
  const acx = c.e - a.e;
  const acy = c.n - a.n;
  const bcx = c.e - b.e;
  const bcy = c.n - b.n;
  const ab = Math.hypot(abx, aby);
  const ac = Math.hypot(acx, acy);
  const bc = Math.hypot(bcx, bcy);
  if (ab < 1 || ac < 1 || bc < 1) return 0;
  const cross = Math.abs(abx * acy - aby * acx);
  return (2 * cross) / (ab * ac * bc);
}

/** Lateral g from speed (m/s) and path curvature (1/m): v²κ / g. */
export function lateralG(speedMps, curvature) {
  const v = Math.max(0, Number(speedMps) || 0);
  const k = Math.max(0, Number(curvature) || 0);
  return (v * v * k) / G_MPS2;
}

/**
 * Brake g from the OpenF1 brake flag and the speed-trace acceleration (m/s²).
 * This cache is only 0 or 100. Flag off (lift or coast) is not tire screech.
 * Flag on uses the slowing of the trace, and a full flag floors the read at
 * 1.1 g so the pedal still speaks when a ±0.2 s window blunts the spike.
 */
export function brakeGFromTrace(brk, accelMps2) {
  const flag = clamp(Number(brk) || 0, 0, 100) / 100;
  if (flag < 0.2) return 0;
  const decelG = Math.max(0, -(Number(accelMps2) || 0)) / G_MPS2;
  return Math.max(decelG, flag * 1.1);
}

const LAT_ON = 0.75;
const LAT_SPAN = 6.4;
const BRK_ON = 0.4;
const BRK_SPAN = 6.2;
const AXIS_CAP = 0.72;
export const TIRE_HZ_LO = 740;
export const TIRE_HZ_SPAN = 2200;

function axisLoad(g, on, span) {
  const t = Math.max(0, (Number(g) || 0) - on) / span;
  return Math.min(AXIS_CAP, t * AXIS_CAP);
}

/**
 * Slip from cornering g and brake g. Each axis tops out at 0.72 so a hard
 * corner and a hard brake together are louder, and higher, than either one.
 * A straight under about 0.75 g with the brake flag up is silent.
 * Tens of g (a fast sample sitting on a tight centerline bend, because the
 * racing line is not fitted) clamp at that same hard-corner cap.
 */
export function tireDrive(latG, brakeG) {
  const lat = Number(latG) || 0;
  const brk = Number(brakeG) || 0;
  const latN = axisLoad(lat, LAT_ON, LAT_SPAN);
  const brkN = axisLoad(brk, BRK_ON, BRK_SPAN);
  const level = clamp(Math.hypot(latN, brkN), 0, 1);
  return { level, hz: TIRE_HZ_LO + level * TIRE_HZ_SPAN, latG: lat, brakeG: brk };
}

/**
 * Listener frame: X east, Y up, Z −north. `source` is {e, n, h} metres
 * from ORIGIN. `speed` is m/s along `heading` (atan2 north, east).
 * Closing speed is the listener velocity dotted toward the source.
 */
export function dopplerRate(east, north, heading, speed, source) {
  const se = (source.e || 0) - east;
  const su = (source.h || 0) - 1.3;
  const sz = north - (source.n || 0);
  const dist = Math.hypot(se, su, sz);
  const spd = Number(speed) || 0;
  const hdg = Number(heading) || 0;
  const ve = Math.cos(hdg) * spd;
  const vz = -Math.sin(hdg) * spd;
  const closing = dist > 0.5 ? (ve * se + vz * sz) / dist : 0;
  const rate = clamp((SOUND_MPS + closing) / SOUND_MPS, RATE_MIN, RATE_MAX);
  return { dist, rate, closing };
}

function ringEN(ringLL, origin) {
  const ring = [];
  for (const c of ringLL || []) {
    if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    ring.push(enOf(c[0], c[1], origin));
  }
  if (ring.length > 1) {
    const a = ring[0];
    const b = ring[ring.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.4) ring.pop();
  }
  return ring;
}

function centroid(ring) {
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
}

function majorAxis(ring) {
  const [mx, my] = centroid(ring);
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const p of ring) {
    const dx = p[0] - mx;
    const dy = p[1] - my;
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
  }
  const ang = 0.5 * Math.atan2(2 * xy, xx - yy);
  return { mx, my, ax: Math.cos(ang), ay: Math.sin(ang) };
}

function insideRing(e, n, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const cross = (yj - yi) === 0 ? 1e-9 : (yj - yi);
    if ((yi > n) !== (yj > n) && e < ((xj - xi) * (n - yi)) / cross + xi) inside = !inside;
  }
  return inside;
}

function pullInside(e, n, ring, mx, my) {
  if (insideRing(e, n, ring)) return [e, n];
  for (let k = 1; k <= 8; k++) {
    const u = k / 8;
    const ee = e + (mx - e) * u;
    const nn = n + (my - n) * u;
    if (insideRing(ee, nn, ring)) return [ee, nn];
  }
  return [e, n];
}

function layPoints(sections, origin, spacing) {
  const out = [];
  const list = Array.isArray(sections) ? sections : [];
  for (let s = 0; s < list.length; s++) {
    const sec = list[s];
    const ring = ringEN(sec && sec.ring, origin);
    if (ring.length < 3) continue;
    const axis = majorAxis(ring);
    let min = Infinity;
    let max = -Infinity;
    for (const p of ring) {
      const t = (p[0] - axis.mx) * axis.ax + (p[1] - axis.my) * axis.ay;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    const span = Math.max(0, max - min);
    let count = Math.round(span / spacing);
    if (count < 2) count = 2;
    if (count > 8) count = 8;
    const rawH = Number(sec.height);
    const h = clamp((Number.isFinite(rawH) && rawH > 0 ? rawH : 12) * 0.55, 4, 18);
    for (let i = 0; i < count; i++) {
      const t = min + ((i + 0.5) * span) / count;
      const rawE = axis.mx + axis.ax * t;
      const rawN = axis.my + axis.ay * t;
      const [e, n] = pullInside(rawE, rawN, ring, axis.mx, axis.my);
      out.push({ e, n, h, section: s });
    }
  }
  const kept = [];
  for (const p of out) {
    let near = false;
    for (const q of kept) {
      if (Math.hypot(p.e - q.e, p.n - q.n) < POINT_GAP) {
        near = true;
        break;
      }
    }
    if (!near) kept.push(p);
  }
  return kept;
}

/**
 * Several sources per section, along the footprint’s long axis.
 * `sections` are { ring: [[lng, lat], ...], height }. Points are metres
 * east/north of `originLL` (default map centre). At most 56.
 */
export function crowdPoints(sections, originLL, spacing = 34) {
  const origin = originLL && originLL.length >= 2 ? originLL : ORIGIN;
  const gap = Number(spacing) > 4 ? Number(spacing) : 34;
  let pts = layPoints(sections, origin, gap);
  if (pts.length > MAX_POINTS) {
    const wider = gap * (pts.length / MAX_POINTS);
    const again = layPoints(sections, origin, wider);
    pts = again.length && again.length < pts.length ? again : pts;
  }
  if (pts.length > MAX_POINTS) {
    const step = pts.length / MAX_POINTS;
    const thin = [];
    for (let i = 0; i < MAX_POINTS; i++) thin.push(pts[Math.min(pts.length - 1, Math.floor(i * step))]);
    pts = thin;
  }
  return pts;
}

function crowdRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296 * 2 - 1;
  };
}

function bpCoeff(sr, freq, q) {
  const w0 = 2 * Math.PI * freq / sr;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * Math.cos(w0)) / a0,
    a2: (1 - alpha) / a0,
  };
}

function applyBiquad(src, c) {
  const out = new Float32Array(src.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < src.length; i++) {
    const x0 = src[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

function addSweep(data, rate, t0, dur, f0, f1, amp, vibHz, vibDepth) {
  const i0 = Math.max(0, Math.floor(t0 * rate));
  const i1 = Math.min(data.length, Math.ceil((t0 + dur) * rate));
  let phase = 0;
  for (let i = i0; i < i1; i++) {
    const t = i / rate;
    const u = (t - t0) / dur;
    const env = Math.sin(Math.PI * clamp(u, 0, 1));
    const f = f0 + (f1 - f0) * u + Math.sin(2 * Math.PI * vibHz * t) * vibDepth;
    phase += (2 * Math.PI * f) / rate;
    data[i] += Math.sin(phase) * env * amp;
  }
}

function addHorn(data, rate, t0, dur, f0, amp) {
  const harms = [1, 0.55, 0.32, 0.16, 0.08];
  const i0 = Math.max(0, Math.floor(t0 * rate));
  const i1 = Math.min(data.length, Math.ceil((t0 + dur) * rate));
  const phase = [0, 0, 0, 0, 0];
  for (let i = i0; i < i1; i++) {
    const u = (i / rate - t0) / dur;
    const attack = Math.min(1, u / 0.06);
    const release = Math.min(1, (1 - u) / 0.16);
    const env = Math.max(0, Math.min(attack, release));
    let s = 0;
    for (let h = 0; h < harms.length; h++) {
      phase[h] += (2 * Math.PI * f0 * (h + 1)) / rate;
      s += Math.sin(phase[h]) * harms[h];
    }
    data[i] += Math.tanh(s * 1.35) * env * amp;
  }
}

function addShout(data, rate, t0, dur, amp) {
  const i0 = Math.max(0, Math.floor(t0 * rate));
  const i1 = Math.min(data.length, Math.ceil((t0 + dur) * rate));
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  for (let i = i0; i < i1; i++) {
    const u = (i / rate - t0) / dur;
    const env = Math.exp(-u * 3.4) * Math.min(1, u / 0.035);
    p1 += (2 * Math.PI * 430) / rate;
    p2 += (2 * Math.PI * 1280) / rate;
    p3 += (2 * Math.PI * 2460) / rate;
    const vowel = Math.sin(p1) * 0.72 + Math.sin(p2) * 0.42 + Math.sin(p3) * 0.2;
    data[i] += vowel * env * amp;
  }
}

function addClap(data, white, rate, t0, amp) {
  const i0 = Math.max(0, Math.floor(t0 * rate));
  const len = Math.max(1, Math.floor(rate * 0.014));
  for (let i = 0; i < len; i++) {
    const idx = i0 + i;
    if (idx >= data.length) break;
    const env = Math.exp(-i / (rate * 0.0032));
    data[idx] += white[idx] * env * amp;
  }
}

/** Whistles, a plastic horn, a shout, and a couple of claps on the murmur. */
function addStadiumCues(data, white, rate) {
  addSweep(data, rate, 0.48, 0.26, 2200, 3350, 0.34, 6.5, 28);
  addHorn(data, rate, 1.42, 0.38, 233, 0.38);
  addClap(data, white, rate, 1.08, 0.22);
  addShout(data, rate, 2.18, 0.11, 0.36);
  addClap(data, white, rate, 2.62, 0.16);
  addSweep(data, rate, 2.88, 0.2, 3180, 2480, 0.22, 7.2, 22);
  addHorn(data, rate, 3.38, 0.24, 466, 0.24);
}

/**
 * Stadium bed: layered speech-band murmur, cheer swells, and a few
 * human cues (whistle, horn, shout, clap). Not lowpassed noise.
 * Peak stays under about 0.72 so a horn can sit above the murmur.
 */
export function renderCrowdBed(sr, seconds = 4) {
  const rate = sr > 8000 ? sr : 44100;
  const n = Math.max(1, Math.floor(rate * (seconds > 0.5 ? seconds : 4)));
  const rnd = crowdRand(0xC0DA51);
  const white = new Float32Array(n);
  for (let i = 0; i < n; i++) white[i] = rnd();
  const data = new Float32Array(n);
  const syl = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const m = 0.62
      + 0.22 * Math.sin(2 * Math.PI * 3.4 * t) * Math.sin(2 * Math.PI * 5.1 * t + 0.6)
      + 0.16 * Math.sin(2 * Math.PI * 2.15 * t + 1.2);
    syl[i] = Math.max(0.28, m);
  }
  const cheers = new Float32Array(n);
  const centers = [0.62, 1.55, 2.48, 3.32];
  for (const c of centers) {
    for (let i = 0; i < n; i++) {
      const x = (i / rate - c) / 0.15;
      cheers[i] += Math.exp(-x * x);
    }
  }
  for (const c of [1.05, 2.85]) {
    for (let i = 0; i < n; i++) {
      const x = (i / rate - c) / 0.032;
      cheers[i] += 0.85 * Math.exp(-x * x);
    }
  }
  const layers = [
    [230, 1.5, 0.85, syl],
    [470, 1.7, 0.5, syl],
    [860, 2.1, 0.8, syl],
    [1350, 1.9, 0.62, syl],
    [2000, 1.6, 0.32, syl],
    [255, 1.4, 0.4, syl],
    [980, 1.8, 0.38, syl],
    [1550, 1.7, 0.28, syl],
    [1050, 2.3, 1.15, cheers],
    [1750, 2.1, 1.0, cheers],
    [2450, 1.7, 0.55, cheers],
  ];
  for (const [f, q, g, env] of layers) {
    const y = applyBiquad(white, bpCoeff(rate, f, q));
    for (let i = 0; i < n; i++) data[i] += y[i] * g * env[i];
  }
  let hp = 0;
  let lp = 0;
  const hpA = Math.exp((-2 * Math.PI * 170) / rate);
  const lpA = Math.exp((-2 * Math.PI * 3400) / rate);
  for (let i = 0; i < n; i++) {
    hp = hpA * hp + (1 - hpA) * data[i];
    const high = data[i] - hp;
    lp = lpA * lp + (1 - lpA) * high;
    data[i] = lp;
  }
  let peak = 1e-6;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
  const gain = 0.48 / peak;
  for (let i = 0; i < n; i++) data[i] *= gain;
  addStadiumCues(data, white, rate);
  peak = 1e-6;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0.72) {
    const k = 0.72 / peak;
    for (let i = 0; i < n; i++) data[i] *= k;
  }
  const fade = Math.max(1, Math.floor(rate * 0.03));
  for (let i = 0; i < n; i++) {
    let w = 1;
    if (i < fade) w = i / fade;
    else if (i > n - fade) w = (n - 1 - i) / fade;
    data[i] *= w;
  }
  return data;
}

function setParam(param, value, now, tau) {
  if (!param) return;
  try {
    param.setTargetAtTime(value, now, tau);
  } catch {
    param.value = value;
  }
}

function placeNode(node, x, y, z) {
  if (node.positionX) {
    node.positionX.value = x;
    node.positionY.value = y;
    node.positionZ.value = z;
    return;
  }
  if (typeof node.setPosition === "function") node.setPosition(x, y, z);
}

/**
 * Shared looped crowd bed, one PannerNode per point, plus a wind bus.
 * `place` once. `setLive(false)` is the master mute.
 */
export function createAmbience(ctx) {
  const out = ctx.createGain();
  out.gain.value = 0;
  const crowdBus = ctx.createGain();
  crowdBus.gain.value = 1;
  const crowdComp = ctx.createDynamicsCompressor();
  crowdComp.threshold.value = -12;
  crowdComp.knee.value = 6;
  crowdComp.ratio.value = 3;
  crowdComp.attack.value = 0.008;
  crowdComp.release.value = 0.18;
  crowdBus.connect(crowdComp);
  crowdComp.connect(out);

  const sr = ctx.sampleRate || 44100;
  const crowdSamples = renderCrowdBed(sr, 4);
  const crowdBuf = ctx.createBuffer(1, crowdSamples.length, sr);
  crowdBuf.getChannelData(0).set(crowdSamples);

  const windBuf = ctx.createBuffer(1, Math.floor(sr), sr);
  const windData = windBuf.getChannelData(0);
  for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;
  const windFade = Math.max(1, Math.floor(sr * 0.02));
  for (let i = 0; i < windFade; i++) {
    const w = i / windFade;
    windData[i] *= w;
    windData[windData.length - 1 - i] *= w;
  }

  const windSrc = ctx.createBufferSource();
  windSrc.buffer = windBuf;
  windSrc.loop = true;
  const hip = ctx.createBiquadFilter();
  hip.type = "highpass";
  hip.frequency.value = 180;
  hip.Q.value = 0.7;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 900;
  band.Q.value = 0.7;
  const windGain = ctx.createGain();
  windGain.gain.value = 0;
  windSrc.connect(hip);
  hip.connect(band);
  band.connect(windGain);
  windGain.connect(out);
  windSrc.start(0);

  const tireBuf = ctx.createBuffer(1, Math.floor(sr), sr);
  const tireData = tireBuf.getChannelData(0);
  let tireSeed = 0x71e5 >>> 0;
  for (let i = 0; i < tireData.length; i++) {
    tireSeed = (Math.imul(1664525, tireSeed) + 1013904223) >>> 0;
    tireData[i] = tireSeed / 4294967296 * 2 - 1;
  }
  const tireFade = Math.max(1, Math.floor(sr * 0.02));
  for (let i = 0; i < tireFade; i++) {
    const w = i / tireFade;
    tireData[i] *= w;
    tireData[tireData.length - 1 - i] *= w;
  }
  const tireSrc = ctx.createBufferSource();
  tireSrc.buffer = tireBuf;
  tireSrc.loop = true;
  const tireHip = ctx.createBiquadFilter();
  tireHip.type = "highpass";
  tireHip.frequency.value = 480;
  tireHip.Q.value = 0.7;
  const tireBand = ctx.createBiquadFilter();
  tireBand.type = "bandpass";
  tireBand.frequency.value = 900;
  tireBand.Q.value = 7;
  const tireGain = ctx.createGain();
  tireGain.gain.value = 0;
  tireSrc.connect(tireHip);
  tireHip.connect(tireBand);
  tireBand.connect(tireGain);
  tireGain.connect(out);
  tireSrc.start(0);

  const voices = [];
  let placed = false;
  let crowdScale = 1;
  let windScale = 1;
  let tireScale = 1;
  let tireState = tireDrive(0, 0);
  let live = false;

  function place(sections) {
    if (placed) return voices.length;
    const pts = crowdPoints(sections, ORIGIN, 34);
    for (const p of pts) {
      const src = ctx.createBufferSource();
      src.buffer = crowdBuf;
      src.loop = true;
      src.playbackRate.value = 1;
      const gain = ctx.createGain();
      gain.gain.value = CROWD_VOICE_GAIN;
      const panner = ctx.createPanner();
      panner.panningModel = "equalpower";
      panner.distanceModel = "inverse";
      panner.refDistance = 22;
      panner.maxDistance = 420;
      panner.rolloffFactor = 0;
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 360;
      panner.coneOuterGain = 1;
      placeNode(panner, p.e, p.h, -p.n);
      src.connect(gain);
      gain.connect(panner);
      panner.connect(crowdBus);
      src.start(0, Math.random() * 3.6);
      voices.push({ src, p, gain });
    }
    placed = true;
    setParam(crowdBus.gain, crowdScale, ctx.currentTime, 0.02);
    return voices.length;
  }

  function setLive(on) {
    live = !!on;
    setParam(out.gain, live ? 1 : 0, ctx.currentTime, 0.03);
  }

  function setCrowd(v) {
    crowdScale = clamp(Number(v) || 0, 0, 1.5);
    setParam(crowdBus.gain, crowdScale, ctx.currentTime, 0.03);
  }

  function setWind(v) {
    windScale = clamp(Number(v) || 0, 0, 1.5);
  }

  function setTire(v) {
    tireScale = clamp(Number(v) || 0, 0, 1.5);
  }

  function update(lng, lat, heading, speedMps, load) {
    const mLng = 111320 * Math.cos(ORIGIN[1] * Math.PI / 180);
    const east = (lng - ORIGIN[0]) * mLng;
    const north = (lat - ORIGIN[1]) * 111320;
    const hdg = Number(heading) || 0;
    const spd = Number(speedMps) || 0;
    const listener = ctx.listener;
    if (listener.positionX) {
      listener.positionX.value = east;
      listener.positionY.value = 1.3;
      listener.positionZ.value = -north;
      listener.forwardX.value = Math.cos(hdg);
      listener.forwardY.value = 0;
      listener.forwardZ.value = -Math.sin(hdg);
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    } else if (typeof listener.setPosition === "function") {
      listener.setPosition(east, 1.3, -north);
      listener.setOrientation(Math.cos(hdg), 0, -Math.sin(hdg), 0, 1, 0);
    }
    const now = ctx.currentTime;
    let nearest = null;
    let best = null;
    for (const voice of voices) {
      const d = dopplerRate(east, north, hdg, spd, voice.p);
      setParam(voice.src.playbackRate, d.rate, now, 0.035);
      setParam(voice.gain.gain, CROWD_VOICE_GAIN * crowdReach(d.dist), now, 0.05);
      if (!best || d.dist < best.dist) {
        best = d;
        nearest = voice;
      }
    }
    const kmh = spd * 3.6;
    const wind = windDrive(kmh);
    const reach = best ? crowdReach(best.dist) : 0;
    setParam(windGain.gain, wind.level * windScale * 0.18, now, 0.08);
    setParam(band.frequency, wind.hz, now, 0.08);
    if (load && (Number.isFinite(load.latG) || Number.isFinite(load.brakeG))) {
      tireState = tireDrive(load.latG, load.brakeG);
    }
    setParam(tireGain.gain, tireState.level * tireScale * 0.48, now, 0.06);
    setParam(tireBand.frequency, tireState.hz, now, 0.05);
    return {
      nearest: best ? best.dist : null,
      rate: best ? best.rate : 1,
      applied: nearest ? nearest.src.playbackRate.value : 1,
      wind: wind.level,
      windVol: wind.level * windScale,
      crowdDist: best ? best.dist : null,
      crowdVol: reach * crowdScale,
      hz: wind.hz,
      count: voices.length,
      kmh,
      live,
      tire: tireState.level,
      tireHz: tireState.hz,
      latG: tireState.latG,
      brakeG: tireState.brakeG,
    };
  }

  return {
    place,
    update,
    setLive,
    setCrowd,
    setWind,
    setTire,
    connect(dest) {
      out.connect(dest);
    },
  };
}

/**
 * Crowd and wind beside the engine. Not a room model.
 *
 * Each grandstand section gets several point sources along its long axis
 * so a pass-by changes level and Doppler per source. Doppler is the
 * source playback rate: Web Audio no longer shifts a PannerNode.
 * The listener is the car. Wind is filtered noise following OpenF1 km/h.
 * Both sit on one output gain the audio button closes.
 */

export const SOUND_MPS = 343;
export const ORIGIN = [-97.6339, 30.1347];

const RATE_MIN = 0.86;
const RATE_MAX = 1.16;
const POINT_GAP = 14;
const MAX_POINTS = 56;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function enOf(lng, lat, origin) {
  const mLng = 111320 * Math.cos(origin[1] * Math.PI / 180);
  return [(lng - origin[0]) * mLng, (lat - origin[1]) * 111320];
}

/** OpenF1 km/h → wind level 0..1 and a bandpass centre. Quiet near 74, full near 308. */
export function windDrive(kmh) {
  const t = clamp(((Number(kmh) || 0) - 60) / 240, 0, 1);
  return { level: Math.pow(t, 1.35), hz: 480 + t * 1700 };
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

function fillNoise(data, sr, seconds, pole) {
  let y = 0;
  const n = data.length;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    y = y * pole + white * (1 - pole);
    const slow = 0.72 + 0.28 * Math.sin((2 * Math.PI * 0.55 * i) / sr);
    const grain = 0.85 + 0.15 * Math.sin((2 * Math.PI * 3.1 * i) / sr + 0.7);
    data[i] = y * slow * grain;
  }
  let peak = 1e-6;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
  const gain = 0.4 / peak;
  const fade = Math.max(1, Math.floor(sr * 0.02));
  for (let i = 0; i < n; i++) {
    let w = 1;
    if (i < fade) w = i / fade;
    else if (i > n - fade) w = (n - 1 - i) / fade;
    data[i] *= gain * w;
  }
  return seconds;
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
  crowdBus.connect(out);

  const sr = ctx.sampleRate || 44100;
  const crowdBuf = ctx.createBuffer(1, Math.floor(sr * 2), sr);
  fillNoise(crowdBuf.getChannelData(0), sr, 2, 0.86);

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

  const voices = [];
  let placed = false;
  let crowdScale = 1;
  let windScale = 1;
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
      gain.gain.value = 0.16;
      const panner = ctx.createPanner();
      panner.panningModel = "equalpower";
      panner.distanceModel = "inverse";
      panner.refDistance = 20;
      panner.maxDistance = 400;
      panner.rolloffFactor = 1.1;
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 360;
      panner.coneOuterGain = 1;
      placeNode(panner, p.e, p.h, -p.n);
      src.connect(gain);
      gain.connect(panner);
      panner.connect(crowdBus);
      src.start(0, Math.random() * 1.8);
      voices.push({ src, p });
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

  function update(lng, lat, heading, speedMps) {
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
      if (!best || d.dist < best.dist) {
        best = d;
        nearest = voice;
      }
    }
    const kmh = spd * 3.6;
    const wind = windDrive(kmh);
    setParam(windGain.gain, wind.level * windScale * 0.18, now, 0.08);
    setParam(band.frequency, wind.hz, now, 0.08);
    return {
      nearest: best ? best.dist : null,
      rate: best ? best.rate : 1,
      applied: nearest ? nearest.src.playbackRate.value : 1,
      wind: wind.level,
      hz: wind.hz,
      count: voices.length,
      kmh,
      live,
    };
  }

  return {
    place,
    update,
    setLive,
    setCrowd,
    setWind,
    connect(dest) {
      out.connect(dest);
    },
  };
}

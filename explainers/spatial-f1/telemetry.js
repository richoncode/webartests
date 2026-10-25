/**
 * Playback helpers for a cached OpenF1 car_data slice.
 * RPM and speed are linearly interpolated. Throttle, gear, brake, and DRS
 * stay on the sample at or before the clock so a throttle lift stays a step.
 */

export function sampleAt(samples, u) {
  const n = samples.length;
  const first = samples[0];
  if (n === 1 || u <= first.t) return blend(first, first, 0);
  const last = samples[n - 1];
  if (u >= last.t) return blend(last, last, 0);
  let lo = 0;
  let hi = n - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= u) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = b.t - a.t;
  const k = span > 0 ? (u - a.t) / span : 0;
  return blend(a, b, k);
}

function blend(a, b, k) {
  return {
    t: a.t + (b.t - a.t) * k,
    rpm: a.rpm + (b.rpm - a.rpm) * k,
    spd: a.spd + (b.spd - a.spd) * k,
    s: a.s + (b.s - a.s) * k,
    thr: a.thr,
    gear: a.gear,
    brk: a.brk,
    drs: a.drs,
  };
}

export function lapAt(laps, u) {
  let lap = laps[0].lap;
  for (const item of laps) {
    if (u + 1e-6 >= item.t) lap = item.lap;
  }
  return lap;
}

/**
 * Map the playhead onto the centerline.
 * `trackLen` is one loop in metres. The cached window is two laps, so distance
 * is scaled to close on two loops. Speed itself stays in the samples.
 */
export function pose(tPlay, samples, trackLen) {
  const dur = samples[samples.length - 1].t;
  const sEnd = samples[samples.length - 1].s;
  const scale = sEnd > 0 ? (2 * trackLen) / sEnd : 1;
  let loops = Math.floor((tPlay + 1e-9) / dur);
  let u = tPlay - loops * dur;
  if (u < 0) {
    u += dur;
    loops -= 1;
  }
  if (u >= dur) {
    u -= dur;
    loops += 1;
  }
  const frame = sampleAt(samples, u);
  const pos = (loops * sEnd + frame.s) * scale;
  return { u, loops, frame, pos, scale, dur, sEnd };
}

/** Keep a scrub inside the current loop of the window. */
export function seekWithinLoop(tPlay, dur, u) {
  const clamped = Math.min(Math.max(u, 0), Math.max(dur - 1e-4, 0));
  let loops = Math.floor((tPlay + 1e-9) / dur);
  if (loops < 0) loops = 0;
  return loops * dur + clamped;
}

/**
 * Heading from a short chain of local east/north samples.
 * Returns atan2(north, east), the same convention as the car's yaw.
 * Unit vectors are averaged so one sharp vertex does not own the angle.
 */
export function headingFromPoints(samples) {
  let sx = 0;
  let sy = 0;
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].east - samples[i - 1].east;
    const dy = samples[i].north - samples[i - 1].north;
    const m = Math.hypot(dx, dy);
    if (m < 1e-12) continue;
    sx += dx / m;
    sy += dy / m;
  }
  if (sx === 0 && sy === 0) return 0;
  return Math.atan2(sy, sx);
}

/**
 * One step of a critically damped spring (ζ = 1).
 * `target` and `targetVel` are the target at the end of this step.
 * Once state matches a constant-velocity target, the lag is zero.
 * The closed form stays stable for any positive dt.
 */
export function critDamp(x, v, target, targetVel, dt, omega) {
  if (!(dt > 0) || !(omega > 0) || !Number.isFinite(x) || !Number.isFinite(target)) return [x, v];
  const vel = Number.isFinite(targetVel) ? targetVel : 0;
  const speed = Number.isFinite(v) ? v : 0;
  const targetStart = target - vel * dt;
  const y = x - targetStart;
  const yd = speed - vel;
  const decay = Math.exp(-omega * dt);
  const B = yd + omega * y;
  const yNew = (y + B * dt) * decay;
  const vNew = vel + (yd - omega * B * dt) * decay;
  return [target + yNew, vNew];
}

function xyDist(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Evenly sample a closed metre polyline. The result is not duplicated shut. */
function resampleClosed(pts, step) {
  const n = pts.length;
  if (n < 2) return pts.map((p) => [p[0], p[1]]);
  const out = [pts[0]];
  let acc = 0;
  let prev = pts[0];
  for (let i = 1; i <= n; i++) {
    const cur = pts[i % n];
    let seg = xyDist(prev, cur);
    let a = prev;
    while (acc + seg >= step && seg > 1e-8) {
      const need = step - acc;
      const k = need / seg;
      out.push([a[0] + (cur[0] - a[0]) * k, a[1] + (cur[1] - a[1]) * k]);
      a = [a[0] + (cur[0] - a[0]) * k, a[1] + (cur[1] - a[1]) * k];
      seg -= need;
      acc = 0;
    }
    acc += seg;
    prev = cur;
  }
  if (out.length > 1 && xyDist(out[out.length - 1], out[0]) < step * 0.35) out.pop();
  return out;
}

function gaussianClosed(pts, spacing, sigma) {
  const n = pts.length;
  const radK = Math.max(1, Math.ceil((3 * sigma) / spacing));
  const w = [];
  for (let k = -radK; k <= radK; k++) w.push(Math.exp(-0.5 * (k * spacing / sigma) ** 2));
  const out = [];
  for (let i = 0; i < n; i++) {
    let e = 0;
    let north = 0;
    let ws = 0;
    for (let k = -radK; k <= radK; k++) {
      const p = pts[(i + k + n) % n];
      const g = w[k + radK];
      e += p[0] * g;
      north += p[1] * g;
      ws += g;
    }
    out.push([e / ws, north / ws]);
  }
  return out;
}

/**
 * Closed centerline for the ribbon and the yellow line.
 * Dense-sample the source polyline, blur it with a short gaussian
 * (corners round, long straights stay), then sample again at `stepM`.
 * Returns a ring whose first and last positions match.
 */
export function smoothClosedLngLat(points, stepM = 2.5) {
  const rad = Math.PI / 180;
  if (!Array.isArray(points) || points.length < 4) {
    return (points || []).map((p) => [p[0], p[1]]);
  }
  const ring = points.map((p) => [Number(p[0]), Number(p[1])]);
  const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-12 && Math.abs(a[1] - b[1]) < 1e-12;
  if (ring.length > 1 && same(ring[0], ring[ring.length - 1])) ring.pop();
  const lat0 = ring[0][1] * rad;
  const mLng = 111320 * Math.cos(lat0);
  const mLat = 111320;
  const xy = [];
  for (const p of ring) {
    const e = p[0] * mLng;
    const north = p[1] * mLat;
    const last = xy[xy.length - 1];
    if (!last || xyDist(last, [e, north]) >= 0.75) xy.push([e, north]);
  }
  if (xy.length > 2 && xyDist(xy[0], xy[xy.length - 1]) < 0.75) xy.pop();
  if (xy.length < 4) return points.map((p) => [p[0], p[1]]);

  const step = Math.max(1.5, Number(stepM) || 2.5);
  const dense = resampleClosed(xy, 2);
  const blurred = gaussianClosed(dense, 2, 8);
  const even = resampleClosed(blurred, step);
  const ll = even.map((p) => [p[0] / mLng, p[1] / mLat]);
  ll.push([ll[0][0], ll[0][1]]);
  return ll;
}

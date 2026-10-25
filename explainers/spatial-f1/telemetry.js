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

/** Shortest signed angle difference, in radians. */
export function wrapPi(delta) {
  let d = delta;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
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
 * Ease `state.angle` toward `target` over travelled metres.
 * A real corner (more than ~11°) uses a shorter reach so the nose
 * still swings with the track. A jump larger than `snapAt` metres snaps.
 */
export function smoothHeading(state, target, distance, snapAt = 80) {
  if (state.angle == null || !Number.isFinite(state.angle) || distance > snapAt) {
    state.angle = target;
    return state.angle;
  }
  const diff = wrapPi(target - state.angle);
  const reach = Math.abs(diff) > 0.2 ? 4.5 : 9;
  const a = 1 - Math.exp(-Math.max(distance, 0) / reach);
  state.angle += diff * a;
  return state.angle;
}

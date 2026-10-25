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

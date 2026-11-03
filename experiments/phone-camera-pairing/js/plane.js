// Plane alignment from US 9,162,144 B2 (Bailey).
//
// The phone reports acceleration in its own axes. The camera reports a hand
// or wrist position in the image. The patent rotates both into one vertical
// X,Y plane — the plane a camera facing the person actually sees — and
// minimizes Z. Z is the toward/away axis, which a single webcam barely
// measures ("forward towards the tracking system and back").
//
// Claim 1 says the service "integrates" tracked positions into acceleration.
// The description also says the tracker computes velocities and accelerations
// from the hand path. The physics of that step is the second derivative.

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

function normalize(a) {
  const n = norm(a);
  if (n < 1e-9) return [0, 0, 0];
  return [a[0] / n, a[1] / n, a[2] / n];
}

function addScaled(a, b, s) {
  return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
}

// Symmetric 3×3 Jacobi. Returns eigenvalues descending and matching unit eigenvectors.
export function eigenSymmetric(matrix) {
  const m = matrix.map((row) => row.slice());
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let iter = 0; iter < 24; iter += 1) {
    let p = 0;
    let q = 1;
    let max = Math.abs(m[0][1]);
    if (Math.abs(m[0][2]) > max) {
      max = Math.abs(m[0][2]);
      p = 0;
      q = 2;
    }
    if (Math.abs(m[1][2]) > max) {
      max = Math.abs(m[1][2]);
      p = 1;
      q = 2;
    }
    if (max < 1e-12) break;
    const app = m[p][p];
    const aqq = m[q][q];
    const apq = m[p][q];
    const tau = (aqq - app) / (2 * apq);
    let t;
    if (Math.abs(tau) < 1e-12) t = apq >= 0 ? 1 : -1;
    else t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;
    const app2 = c * c * app - 2 * s * c * apq + s * s * aqq;
    const aqq2 = s * s * app + 2 * s * c * apq + c * c * aqq;
    for (let k = 0; k < 3; k += 1) {
      if (k === p || k === q) continue;
      const mkp = m[k][p];
      const mkq = m[k][q];
      const rotP = c * mkp - s * mkq;
      const rotQ = s * mkp + c * mkq;
      m[k][p] = rotP;
      m[p][k] = rotP;
      m[k][q] = rotQ;
      m[q][k] = rotQ;
    }
    m[p][p] = app2;
    m[q][q] = aqq2;
    m[p][q] = 0;
    m[q][p] = 0;
    for (let k = 0; k < 3; k += 1) {
      const vip = v[k][p];
      const viq = v[k][q];
      v[k][p] = c * vip - s * viq;
      v[k][q] = s * vip + c * viq;
    }
  }
  const values = [m[0][0], m[1][1], m[2][2]];
  const vectors = [0, 1, 2].map((col) => normalize([v[0][col], v[1][col], v[2][col]]));
  const order = [0, 1, 2].sort((i, j) => values[j] - values[i]);
  return {
    values: order.map((i) => values[i]),
    vectors: order.map((i) => vectors[i]),
  };
}

function covariance(points) {
  const n = points.length;
  const mean = [0, 0, 0];
  for (const p of points) {
    mean[0] += p[0];
    mean[1] += p[1];
    mean[2] += p[2];
  }
  mean[0] /= n;
  mean[1] /= n;
  mean[2] /= n;
  const c = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of points) {
    const d0 = p[0] - mean[0];
    const d1 = p[1] - mean[1];
    const d2 = p[2] - mean[2];
    const d = [d0, d1, d2];
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) c[i][j] += d[i] * d[j];
    }
  }
  const scale = n > 1 ? n - 1 : 1;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) c[i][j] /= scale;
  }
  return c;
}

function linearProvided(samples) {
  let n = 0;
  let energy = 0;
  let gravityEnergy = 0;
  for (const s of samples) {
    if (s.lax == null || s.lay == null || s.laz == null) return false;
    n += 1;
    energy += s.lax * s.lax + s.lay * s.lay + s.laz * s.laz;
    gravityEnergy += s.ax * s.ax + s.ay * s.ay + s.az * s.az;
  }
  if (n < 8) return false;
  const rms = Math.sqrt(energy / n);
  const gravityRms = Math.sqrt(gravityEnergy / n);
  // A desktop browser sometimes fills linear acceleration with zeros.
  if (rms < 0.05 && gravityRms > 2) return false;
  return true;
}

// Split device acceleration into gravity (low-pass) and linear motion.
// Prefer the platform linear reading when it actually varies.
export function splitGravity(samples, tau = 0.45) {
  const useLinear = linearProvided(samples);
  const linear = [];
  const gravity = [];
  let g = null;
  let prevT = null;
  const tWarm = samples.length ? samples[0].t + (useLinear ? 0 : 350) : 0;
  for (const s of samples) {
    if (![s.ax, s.ay, s.az].every(Number.isFinite)) continue;
    const a = [s.ax, s.ay, s.az];
    if (!g) g = a.slice();
    const dt = prevT == null ? 0.016 : Math.max(0.001, Math.min(0.2, (s.t - prevT) / 1000));
    prevT = s.t;
    const alpha = 1 - Math.exp(-dt / tau);
    g = [
      g[0] + alpha * (a[0] - g[0]),
      g[1] + alpha * (a[1] - g[1]),
      g[2] + alpha * (a[2] - g[2]),
    ];
    if (s.t < tWarm) continue;
    const lin = useLinear ? [s.lax, s.lay, s.laz] : [a[0] - g[0], a[1] - g[1], a[2] - g[2]];
    linear.push({ t: s.t, x: lin[0], y: lin[1], z: lin[2] });
    gravity.push({ t: s.t, x: g[0], y: g[1], z: g[2] });
  }
  return { linear, gravity, usedPlatformLinear: useLinear };
}

// Rotate linear acceleration onto the gesture plane.
// The dropped axis is the smallest-variance direction (Z minimized).
// Inside the plane, +Y follows "up" (opposite the gravity projection)
// so a vertical wave lines up with the camera's vertical axis.
export function alignPlane(linear, gravity) {
  if (linear.length < 6) return { series: [], zEnergy: 1, inPlane: 0 };
  const points = linear.map((s) => [s.x, s.y, s.z]);
  const { values, vectors } = eigenSymmetric(covariance(points));
  const zAxis = vectors[2];
  const total = Math.abs(values[0]) + Math.abs(values[1]) + Math.abs(values[2]);
  const zEnergy = total > 1e-9 ? Math.max(0, values[2]) / total : 0;
  let g = [0, 0, 0];
  const gSrc = gravity && gravity.length ? gravity : linear;
  for (const s of gSrc) {
    g[0] += s.x;
    g[1] += s.y;
    g[2] += s.z;
  }
  g = normalize(g);
  // Gravity points down. Remove whatever part of it lies on the dropped axis.
  const gPlane = addScaled(g, zAxis, -dot(g, zAxis));
  let yAxis;
  if (norm(gPlane) > 0.25) yAxis = normalize([-gPlane[0], -gPlane[1], -gPlane[2]]);
  else yAxis = vectors[0];
  let xAxis = cross(yAxis, zAxis);
  if (norm(xAxis) < 0.2) xAxis = vectors[0];
  xAxis = normalize(xAxis);
  yAxis = normalize(cross(zAxis, xAxis));
  const series = linear.map((s) => {
    const p = [s.x, s.y, s.z];
    return { t: s.t, x: dot(p, xAxis), y: dot(p, yAxis) };
  });
  return { series, zEnergy, inPlane: 1 - zEnergy };
}

export function phonePlaneAccel(samples) {
  const split = splitGravity(samples);
  const aligned = alignPlane(split.linear, split.gravity);
  return { ...aligned, usedPlatformLinear: split.usedPlatformLinear };
}

function smoothPositions(samples, radius) {
  const out = [];
  for (let i = 0; i < samples.length; i += 1) {
    let x = 0;
    let y = 0;
    let w = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(samples.length - 1, i + radius); j += 1) {
      if (Math.abs(samples[j].t - samples[i].t) > 280) continue;
      const weight = radius + 1 - Math.abs(j - i);
      x += samples[j].x * weight;
      y += samples[j].y * weight;
      w += weight;
    }
    out.push({ t: samples[i].t, x: x / w, y: y / w });
  }
  return out;
}

// Position → acceleration. `samples` use image coordinates, y downward.
// The returned Y is up, so it shares a vertical sense with the phone plane.
export function imagePlaneAccel(samples) {
  const flipped = [];
  for (const s of samples) {
    if (!Number.isFinite(s.t) || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
    flipped.push({ t: s.t, x: s.x, y: -s.y });
  }
  if (flipped.length < 6) return [];
  // A short average before the two derivatives. Wrist landmarks jitter by a
  // few pixels; without this the acceleration is mostly that jitter.
  const sm = smoothPositions(flipped, 4);
  const velocity = [];
  for (let i = 1; i < sm.length - 1; i += 1) {
    const dt = (sm[i + 1].t - sm[i - 1].t) / 1000;
    if (dt <= 0 || dt > 0.28) continue;
    velocity.push({
      t: sm[i].t,
      x: (sm[i + 1].x - sm[i - 1].x) / dt,
      y: (sm[i + 1].y - sm[i - 1].y) / dt,
    });
  }
  const accel = [];
  for (let i = 1; i < velocity.length - 1; i += 1) {
    if (velocity[i].t - velocity[i - 1].t > 220) continue;
    if (velocity[i + 1].t - velocity[i].t > 220) continue;
    const dt = (velocity[i + 1].t - velocity[i - 1].t) / 1000;
    if (dt <= 0 || dt > 0.28) continue;
    accel.push({
      t: velocity[i].t,
      x: (velocity[i + 1].x - velocity[i - 1].x) / dt,
      y: (velocity[i + 1].y - velocity[i - 1].y) / dt,
    });
  }
  return accel;
}

export function seriesRms(series) {
  if (!series.length) return 0;
  let energy = 0;
  for (const s of series) energy += s.x * s.x + s.y * s.y;
  return Math.sqrt(energy / series.length);
}

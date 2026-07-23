export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (a, b, t) => a + (b - a) * t;

// Exponential-decay "damping" toward a target — frame-rate independent smoothing.
// halfLife is roughly how many seconds it takes to close half the remaining gap.
export const damp = (current, target, halfLife, dt) => {
  if (halfLife <= 0) return target;
  const t = 1 - Math.pow(2, -dt / halfLife);
  return lerp(current, target, clamp(t, 0, 1));
};

export const dampAngle = (current, target, halfLife, dt) => {
  let delta = (target - current) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + damp(0, delta, halfLife, dt);
};

export const randomRange = (min, max) => min + Math.random() * (max - min);

export const solveProjectileVelocity = (dx, dz, dy, flightTime, gravity) => {
  const vx = dx / flightTime;
  const vz = dz / flightTime;
  // dy = vy*t + 0.5*g*t^2  =>  vy = (dy - 0.5*g*t^2) / t
  const vy = (dy - 0.5 * gravity * flightTime * flightTime) / flightTime;
  return { vx, vy, vz };
};

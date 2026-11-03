// Rolling capture + the JSON bundle the phone page exports and the camera page imports.

const SOURCE_PHONE = 'phone-imu';

export function createRing(maxMs) {
  const samples = [];
  return {
    push(sample) {
      samples.push(sample);
      const cutoff = sample.t - maxMs;
      let drop = 0;
      while (drop < samples.length && samples[drop].t < cutoff) drop += 1;
      if (drop) samples.splice(0, drop);
    },
    samples() {
      return samples;
    },
    last(ms, now) {
      if (!samples.length) return [];
      const end = now == null ? samples[samples.length - 1].t : now;
      const start = end - ms;
      return samples.filter((s) => s.t >= start);
    },
    clear() {
      samples.length = 0;
    },
    duration() {
      if (samples.length < 2) return 0;
      return samples[samples.length - 1].t - samples[0].t;
    },
    rate() {
      const d = this.duration();
      if (d <= 0) return 0;
      return ((samples.length - 1) * 1000) / d;
    },
  };
}

function round(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value) * 1000) / 1000;
}

export function phoneBundle(samples) {
  const t0 = samples.length ? samples[0].t : 0;
  return {
    version: 1,
    source: SOURCE_PHONE,
    patent: 'US9162144B2',
    exportedAt: new Date().toISOString(),
    samples: samples.map((s) => ({
      t: Math.round((s.t - t0) * 10) / 10,
      ax: round(s.ax),
      ay: round(s.ay),
      az: round(s.az),
      lax: round(s.lax),
      lay: round(s.lay),
      laz: round(s.laz),
      gx: round(s.gx),
      gy: round(s.gy),
      gz: round(s.gz),
    })),
  };
}

export function cameraBundle(samples, meta) {
  const t0 = samples.length ? samples[0].t : 0;
  return {
    version: 1,
    source: 'camera-track',
    patent: 'US9162144B2',
    exportedAt: new Date().toISOString(),
    mode: meta.mode,
    landmark: meta.landmark,
    samples: samples.map((s) => ({
      t: Math.round((s.t - t0) * 10) / 10,
      x: round(s.x),
      y: round(s.y),
      conf: round(s.conf),
    })),
  };
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parsePhoneBundle(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That buffer is not JSON.');
  }
  if (data && data.source && data.source !== SOURCE_PHONE) {
    throw new Error('That file is a ' + data.source + ' buffer. Import the phone IMU export.');
  }
  const list = Array.isArray(data) ? data : data && data.samples;
  if (!list || !list.length) throw new Error('No samples in that buffer.');
  const samples = [];
  for (const raw of list) {
    if (!raw) continue;
    const t = finite(raw.t);
    const ax = finite(raw.ax);
    const ay = finite(raw.ay);
    const az = finite(raw.az);
    if (t == null || ax == null || ay == null || az == null) continue;
    samples.push({
      t,
      ax,
      ay,
      az,
      lax: finite(raw.lax),
      lay: finite(raw.lay),
      laz: finite(raw.laz),
      gx: finite(raw.gx),
      gy: finite(raw.gy),
      gz: finite(raw.gz),
    });
  }
  if (samples.length < 8) throw new Error('Need a longer phone recording.');
  return samples;
}

function prepare(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 280;
  const h = canvas.clientHeight || 96;
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function zscore(values) {
  const nums = values.filter(Number.isFinite);
  if (nums.length < 2) return values.map(() => 0);
  const mean = nums.reduce((sum, v) => sum + v, 0) / nums.length;
  let energy = 0;
  for (const v of nums) energy += (v - mean) ** 2;
  const scale = Math.sqrt(energy / nums.length) || 1;
  return values.map((v) => (Number.isFinite(v) ? (v - mean) / scale : 0));
}

/**
 * Draw one or more polylines. `series` is `{ name, color, values }`.
 * `normalize` z-scores each series so different units can share the frame.
 */
export function drawChart(canvas, series, options = {}) {
  if (!canvas) return;
  const { ctx, w, h } = prepare(canvas);
  ctx.clearRect(0, 0, w, h);
  const drawn = (series || [])
    .filter((item) => item && item.values && item.values.some(Number.isFinite))
    .map((item) => ({
      name: item.name,
      color: item.color,
      values: options.normalize ? zscore(item.values) : item.values,
    }));
  if (!drawn.length) {
    ctx.fillStyle = '#555';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(options.empty || 'Waiting for samples', 12, h / 2);
    return;
  }
  let min = Infinity;
  let max = -Infinity;
  for (const item of drawn) {
    for (const value of item.values) {
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;
  if (min < 0 && max > 0) {
    const y0 = h - ((0 - min) / (max - min)) * h;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(w, y0);
    ctx.stroke();
  }
  for (const item of drawn) {
    ctx.beginPath();
    let started = false;
    const n = item.values.length;
    item.values.forEach((value, i) => {
      if (!Number.isFinite(value)) {
        started = false;
        return;
      }
      const x = n === 1 ? 0 : (i / (n - 1)) * w;
      const y = h - ((value - min) / (max - min)) * h;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  let x = 8;
  for (const item of drawn) {
    if (!item.name) continue;
    ctx.fillStyle = item.color;
    ctx.fillText(item.name, x, 14);
    x += ctx.measureText(item.name).width + 14;
  }
}

export function column(samples, key, limit = 240) {
  const slice = samples.length > limit ? samples.slice(samples.length - limit) : samples;
  return slice.map((s) => s[key]);
}

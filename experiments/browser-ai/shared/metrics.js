/** Placeholder charts. Phase 1 can plot loss and accuracy into the same frames. */

/**
 * Draw an empty dark chart frame. Returns false when the canvas is hidden (0×0).
 * @param {HTMLCanvasElement} canvas
 * @param {{ label?: string, emptyMessage?: string }} [options]
 */
export function drawEmptyChart(canvas, options = {}) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width < 2 || height < 2) return false;

  const label = options.label || 'loss';
  const emptyMessage = options.emptyMessage || 'No training run yet';
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);

  const pad = { l: 40, r: 14, t: 22, b: 28 };
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.t + ((height - pad.t - pad.b) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(width - pad.r, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, height - pad.b);
  ctx.lineTo(width - pad.r, height - pad.b);
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textBaseline = 'top';
  ctx.fillText(label, pad.l, 4);

  ctx.fillStyle = '#555';
  ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emptyMessage, pad.l + (width - pad.l - pad.r) / 2, pad.t + (height - pad.t - pad.b) / 2);

  ctx.fillStyle = '#555';
  ctx.font = "11px 'SF Mono', 'Fira Code', monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('0', 8, height - pad.b - 4);
  ctx.textAlign = 'right';
  ctx.fillText('epoch', width - pad.r, height - 16);
  return true;
}

/** Redraw whenever the canvases have a layout size, including after a tab switch. */
export function redrawEmptyCharts(charts) {
  for (const chart of charts) drawEmptyChart(chart.canvas, chart);
}

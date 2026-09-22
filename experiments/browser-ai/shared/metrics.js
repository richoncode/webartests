/** Loss / accuracy charts for the MNIST dashboard. Canvas only — no chart library. */

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const MONO = "'SF Mono', 'Fira Code', monospace";

function frameChart(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width < 2 || height < 2) return null;

  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);

  const pad = { l: 44, r: 14, t: 22, b: 28 };
  return {
    ctx,
    width,
    height,
    pad,
    plotW: width - pad.l - pad.r,
    plotH: height - pad.t - pad.b,
  };
}

function drawAxes(frame) {
  const { ctx, width, height, pad } = frame;
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.t + (frame.plotH * i) / 4;
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
}

/**
 * Draw an empty dark chart frame. Returns false when the canvas is hidden (0×0).
 * @param {HTMLCanvasElement} canvas
 * @param {{ label?: string, emptyMessage?: string }} [options]
 */
export function drawEmptyChart(canvas, options = {}) {
  const frame = frameChart(canvas);
  if (!frame) return false;
  const { ctx, width, height, pad, plotW, plotH } = frame;
  drawAxes(frame);

  const label = options.label || 'loss';
  const emptyMessage = options.emptyMessage || 'No training run yet';

  ctx.fillStyle = '#888';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, pad.l, 4);

  ctx.fillStyle = '#555';
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emptyMessage, pad.l + plotW / 2, pad.t + plotH / 2);

  ctx.fillStyle = '#555';
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('0', 8, height - pad.b - 4);
  ctx.textAlign = 'right';
  ctx.fillText('epoch', width - pad.r, height - 16);
  return true;
}

/**
 * Plot a single series. Falls back to the empty frame when `values` is empty.
 * @param {HTMLCanvasElement} canvas
 * @param {{ label?: string, values?: number[], color?: string, yMin?: number, yMax?: number, percent?: boolean, emptyMessage?: string }} [options]
 */
export function drawSeriesChart(canvas, options = {}) {
  const values = (options.values || []).filter((value) => Number.isFinite(value));
  if (!values.length) return drawEmptyChart(canvas, options);

  const frame = frameChart(canvas);
  if (!frame) return false;
  const { ctx, width, height, pad, plotW, plotH } = frame;
  drawAxes(frame);

  const yMin = Number.isFinite(options.yMin) ? options.yMin : 0;
  let yMax = Number.isFinite(options.yMax) ? options.yMax : Math.max(...values, 0) * 1.08;
  if (!(yMax > yMin)) yMax = yMin + 1;

  const xFor = (index) => (
    values.length === 1
      ? pad.l + plotW / 2
      : pad.l + (plotW * index) / (values.length - 1)
  );
  const yFor = (value) => pad.t + plotH * (1 - (value - yMin) / (yMax - yMin));

  ctx.fillStyle = '#888';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(options.label || 'loss', pad.l, 4);

  const tick = (value) => (
    options.percent ? `${Math.round(value * 100)}%` : (value >= 10 ? value.toFixed(1) : value.toFixed(2))
  );
  ctx.fillStyle = '#555';
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(tick(yMax), pad.l - 6, pad.t);
  ctx.fillText(tick(yMin), pad.l - 6, height - pad.b);

  const color = options.color || '#5b9bd5';
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  values.forEach((value, index) => {
    const x = xFor(index);
    const y = yFor(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  values.forEach((value, index) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(xFor(index), yFor(value), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#555';
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  values.forEach((_, index) => {
    if (values.length > 8 && index !== 0 && index !== values.length - 1) return;
    ctx.fillText(String(index + 1), xFor(index), height - 16);
  });
  return true;
}

/** Redraw whenever the canvases have a layout size, including after a tab switch. */
export function redrawEmptyCharts(charts) {
  for (const chart of charts) drawEmptyChart(chart.canvas, chart);
}

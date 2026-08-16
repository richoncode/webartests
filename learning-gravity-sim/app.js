const MODES = [NaiveMode, SoAMode, QuantizedMode, BarnesHutMode, WasmSimdMode, WorkersMode, GpuMode, GpuTiledMode];
const PARTICLE_STEPS = [100, 200, 400, 800, 1200, 2000, 3000, 4000, 6000];
const STATS_WINDOW = 30;

let currentMode = null;
let currentN = PARTICLE_STEPS[3];
let seed = 12345;
let running = true;
let stepTimes = [], frameTimes = [], interFrameTimes = [];
let lastRafTime = null;
let viewScalePxPerWorld = 1, viewCssWidth = 0, viewCssHeight = 0;

const canvas2d = document.getElementById('glCanvas2d');
const canvasGpu = document.getElementById('glCanvasGpu');
const ctx = canvas2d.getContext('2d');

const scratchX = new Float32Array(PARTICLE_STEPS[PARTICLE_STEPS.length - 1]);
const scratchY = new Float32Array(PARTICLE_STEPS[PARTICLE_STEPS.length - 1]);

function resizeCanvases() {
  const rect = canvas2d.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  for (const c of [canvas2d, canvasGpu]) {
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  computeViewTransform(rect.width, rect.height);
}

function computeViewTransform(cssW, cssH, gpuModeOverride) {
  viewCssWidth = cssW; viewCssHeight = cssH;
  viewScalePxPerWorld = (Math.min(cssW, cssH) * 0.9) / (2 * WORLD_HALF_EXTENT);
  const gm = gpuModeOverride || currentMode;
  if (gm && gm.isGpu && gm.device) {
    const dpr = window.devicePixelRatio || 1;
    const ndcScaleX = (viewScalePxPerWorld * dpr) / (canvasGpu.width / 2);
    const ndcScaleY = (viewScalePxPerWorld * dpr) / (canvasGpu.height / 2);
    gm.setView(ndcScaleX, -ndcScaleY, 3.5);
  }
}

function drawCanvas2d(xs, ys, n) {
  ctx.clearRect(0, 0, viewCssWidth, viewCssHeight);
  const cx = viewCssWidth / 2, cy = viewCssHeight / 2, s = viewScalePxPerWorld;
  ctx.fillStyle = '#5b9bd5';
  for (let i = 1; i < n; i++) {
    const px = cx + xs[i] * s, py = cy - ys[i] * s;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (n > 0) {
    ctx.fillStyle = '#f0a040';
    ctx.beginPath();
    ctx.arc(cx + xs[0] * s, cy - ys[0] * s, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function formatBigNumber(x) {
  if (x >= 1e9) return (x / 1e9).toFixed(2) + 'B';
  if (x >= 1e6) return (x / 1e6).toFixed(2) + 'M';
  if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K';
  return x.toFixed(0);
}

function recordTiming(stepMs, frameMs, interFrameMs) {
  stepTimes.push(stepMs); if (stepTimes.length > STATS_WINDOW) stepTimes.shift();
  frameTimes.push(frameMs); if (frameTimes.length > STATS_WINDOW) frameTimes.shift();
  if (interFrameMs != null) {
    interFrameTimes.push(interFrameMs); if (interFrameTimes.length > STATS_WINDOW) interFrameTimes.shift();
  }
  const avgStep = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
  const avgFrame = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  // FPS must come from actual requestAnimationFrame callback-to-callback
  // wall-clock time, not from how long our own work took — rAF is throttled
  // to the display's real refresh rate (~60Hz) regardless of whether the
  // work inside a callback finishes in 0.1ms or 15ms, so measuring FPS from
  // work-time alone reports a fictional, uncapped number once a mode gets
  // fast enough (this is exactly what GPU mode's raw submit time did before
  // this fix — 0.14ms/frame is real, but it doesn't mean 6977 FPS).
  const fps = interFrameTimes.length
    ? 1000 / (interFrameTimes.reduce((a, b) => a + b, 0) / interFrameTimes.length)
    : 0;
  document.getElementById('statFps').textContent = fps.toFixed(0);
  document.getElementById('statStep').textContent = avgStep.toFixed(2) + ' ms';
  document.getElementById('statFrame').textContent = avgFrame.toFixed(2) + ' ms';
  const interactionsPerSec = currentN * currentN * (1000 / avgStep);
  document.getElementById('statInteractions').textContent = formatBigNumber(interactionsPerSec);
}

function buildModeButtons() {
  const container = document.getElementById('modeButtons');
  container.innerHTML = '';
  for (const mode of MODES) {
    const btn = document.createElement('button');
    btn.className = 'mode-btn';
    btn.textContent = mode.label;
    btn.dataset.modeId = mode.id;
    if (mode.isGpu && !mode.supported) {
      btn.classList.add('unsupported');
      btn.title = 'WebGPU not available in this browser';
    } else {
      btn.addEventListener('click', () => switchMode(mode.id));
    }
    container.appendChild(btn);
  }
}

function updateModeButtonsUI(activeId) {
  document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.modeId === activeId));
}

let initGeneration = 0;

// Loading a wasm module or negotiating a WebGPU device is genuinely async
// (network fetch / adapter negotiation), and requestAnimationFrame keeps
// ticking the whole time — if currentMode pointed at the target mode before
// that finished, frame() would call .step() on a mode whose .instance /
// .device is still null. currentMode is nulled out for the entire async
// window (frame() already no-ops when currentMode is null) and only flips
// to the real mode once setup+init has fully completed. The generation
// counter guards against two overlapping calls (e.g. rapid slider drags)
// resolving out of order and leaving currentMode pointed at a stale mode.
async function initScene(mode) {
  const myGen = ++initGeneration;
  currentMode = null;
  if (mode === WasmSimdMode && !WasmSimdMode.instance) await WasmSimdMode.load();
  if (mode.isGpu) {
    if (!mode.device) await mode.setup(canvasGpu);
    else mode.activate();
  }
  if (myGen !== initGeneration) return;
  mode.init(currentN, seed);
  if (mode.isGpu) computeViewTransform(viewCssWidth, viewCssHeight, mode);
  stepTimes = []; frameTimes = []; interFrameTimes = []; lastRafTime = null;
  currentMode = mode;
}

// The mode the user has selected — set synchronously on click, independent
// of whether that mode has actually finished loading yet (currentMode is
// null during that window). The slider/reset handlers key off this, not
// currentMode, so a mode switch that's still in flight doesn't get
// second-guessed by a DOM query or silently fall back to the wrong mode.
let selectedMode = SoAMode;

async function switchMode(modeId) {
  const mode = MODES.find((m) => m.id === modeId);
  if (!mode || (mode.isGpu && !mode.supported)) return;
  selectedMode = mode;
  canvas2d.style.display = mode.isGpu ? 'none' : 'block';
  canvasGpu.style.display = mode.isGpu ? 'block' : 'none';
  document.getElementById('modeDesc').innerHTML = `<strong>${mode.label}:</strong> ${mode.description}`;
  updateModeButtonsUI(modeId);
  await initScene(mode);
}

function frame(now) {
  requestAnimationFrame(frame);
  const interFrameMs = lastRafTime != null ? now - lastRafTime : null;
  lastRafTime = now;
  if (!running || !currentMode) return;
  const stepStart = performance.now();
  currentMode.step();
  const stepEnd = performance.now();
  if (!currentMode.isGpu) {
    currentMode.getPositions(scratchX, scratchY);
    drawCanvas2d(scratchX, scratchY, currentN);
  }
  const frameEnd = performance.now();
  // WorkersMode.step() is fire-and-forget (kicks off an async round-trip
  // across worker threads and returns immediately) — the synchronous
  // stepEnd-stepStart delta here would just measure "how long it took to
  // schedule a postMessage", not the real work. It reports its own
  // measured round-trip time once each one actually completes.
  const reportedStepMs = currentMode === WorkersMode ? WorkersMode.lastStepMs : (stepEnd - stepStart);
  recordTiming(reportedStepMs, frameEnd - stepStart, interFrameMs);
}

document.getElementById('particleSlider').addEventListener('input', async (e) => {
  currentN = PARTICLE_STEPS[+e.target.value];
  document.getElementById('particleCountLabel').textContent = currentN;
  await initScene(selectedMode);
});
document.getElementById('playPauseBtn').addEventListener('click', (e) => {
  running = !running;
  e.target.textContent = running ? 'Pause' : 'Play';
});
document.getElementById('resetBtn').addEventListener('click', async () => {
  seed = Math.floor(Math.random() * 1e9);
  await initScene(selectedMode);
});
window.addEventListener('resize', resizeCanvases);

// ── "Max particles at 60fps" benchmark ──
// An alternative, more intuitive framing than "ms/step at a fixed N": for
// each mode, find the largest particle count whose step time still fits the
// 16.7ms/frame budget. Doubling ramp-up finds a bracket fast regardless of
// a mode's actual complexity class (O(N^2) vs O(N log N) vs O(N)), then a
// short binary search narrows it down within that bracket.
const FRAME_BUDGET_MS = 1000 / 60;
const BENCH_MIN_N = 100;
const BENCH_CAP_N = 200000;
const BENCH_SEED = 424242;
let benchmarking = false;

// Each mode type needs a different notion of "time one step and wait for it
// to really finish" — a synchronous CPU step, an awaited Workers round-trip
// (bypassing its fire-and-forget busy-guard so the benchmark can await every
// step directly), or a GPU submit plus onSubmittedWorkDone().
function makeStepTimer(mode) {
  if (mode === WorkersMode) {
    return async (n) => {
      mode.init(n, BENCH_SEED);
      await mode._runStep();
      const trials = 8;
      const t0 = performance.now();
      for (let i = 0; i < trials; i++) await mode._runStep();
      return (performance.now() - t0) / trials;
    };
  }
  if (mode.isGpu) {
    return async (n) => {
      mode.init(n, BENCH_SEED);
      mode.step();
      await mode.waitForGPU();
      const trials = 20;
      const t0 = performance.now();
      for (let i = 0; i < trials; i++) mode.step();
      await mode.waitForGPU();
      return (performance.now() - t0) / trials;
    };
  }
  return async (n) => {
    mode.init(n, BENCH_SEED);
    mode.step();
    const trials = 15;
    const t0 = performance.now();
    for (let i = 0; i < trials; i++) mode.step();
    return (performance.now() - t0) / trials;
  };
}

async function findMaxNAt60fps(stepTimeFn) {
  let lastGoodN = 0, lastGoodMs = 0;
  let n = BENCH_MIN_N;
  let firstBadN = null;
  while (n <= BENCH_CAP_N) {
    const ms = await stepTimeFn(n);
    if (ms <= FRAME_BUDGET_MS) { lastGoodN = n; lastGoodMs = ms; n *= 2; }
    else { firstBadN = n; break; }
  }
  if (firstBadN === null) return { n: lastGoodN || BENCH_CAP_N, ms: lastGoodMs, hitCap: true };
  if (lastGoodN === 0) return { n: 0, ms: lastGoodMs, tooSlow: true };

  let lo = lastGoodN, hi = firstBadN;
  for (let iter = 0; iter < 7 && hi - lo > Math.max(1, Math.floor(lo * 0.02)); iter++) {
    const mid = Math.round((lo + hi) / 2);
    const ms = await stepTimeFn(mid);
    if (ms <= FRAME_BUDGET_MS) { lo = mid; lastGoodMs = ms; } else { hi = mid; }
  }
  return { n: lo, ms: lastGoodMs };
}

function formatMaxN(r) {
  if (r.unsupported) return '—';
  if (r.tooSlow) return `< ${BENCH_MIN_N}`;
  return r.hitCap ? `${r.n.toLocaleString()}+` : r.n.toLocaleString();
}

function renderBenchmarkResults(resultsByModeId) {
  const container = document.getElementById('benchmarkResults');
  container.innerHTML = '';
  for (const mode of MODES) {
    const r = resultsByModeId.get(mode.id);
    const row = document.createElement('div');
    row.className = 'bench-row' + (r && r.unsupported ? ' unsupported' : '');
    const pct = r && !r.unsupported && !r.tooSlow && r.n > 0
      ? Math.max(3, ((Math.log10(r.n) - Math.log10(BENCH_MIN_N)) / (Math.log10(BENCH_CAP_N) - Math.log10(BENCH_MIN_N))) * 100)
      : 0;
    const label = document.createElement('span');
    label.className = 'bench-label';
    label.textContent = mode.label;
    const track = document.createElement('span');
    track.className = 'bench-bar-track';
    const fill = document.createElement('span');
    fill.className = 'bench-bar-fill';
    fill.style.width = pct + '%';
    track.appendChild(fill);
    const value = document.createElement('span');
    value.className = 'bench-value';
    value.textContent = r ? formatMaxN(r) : '…';
    row.append(label, track, value);
    container.appendChild(row);
  }
}

function setControlsDisabled(disabled) {
  document.querySelectorAll('.mode-btn').forEach((b) => { if (!b.classList.contains('unsupported')) b.disabled = disabled; });
  document.getElementById('particleSlider').disabled = disabled;
  document.getElementById('playPauseBtn').disabled = disabled;
  document.getElementById('resetBtn').disabled = disabled;
}

async function runBenchmark() {
  if (benchmarking) return;
  benchmarking = true;
  const btn = document.getElementById('runBenchmarkBtn');
  const statusEl = document.getElementById('benchmarkStatus');
  const defaultStatusText = statusEl.textContent;
  btn.disabled = true;
  setControlsDisabled(true);

  const wasRunning = running;
  running = false;
  const prevMode = selectedMode;
  const prevN = currentN;

  const resultsByModeId = new Map();
  renderBenchmarkResults(resultsByModeId);

  for (const mode of MODES) {
    if (mode.isGpu && !mode.supported) {
      resultsByModeId.set(mode.id, { unsupported: true });
      renderBenchmarkResults(resultsByModeId);
      continue;
    }
    statusEl.textContent = `Testing ${mode.label}…`;
    if (mode === WasmSimdMode && !WasmSimdMode.instance) await WasmSimdMode.load();
    if (mode.isGpu) {
      if (!mode.device) await mode.setup(canvasGpu);
      else mode.activate();
    }
    const r = await findMaxNAt60fps(makeStepTimer(mode));
    resultsByModeId.set(mode.id, r);
    renderBenchmarkResults(resultsByModeId);
  }
  statusEl.textContent = defaultStatusText;

  currentN = prevN;
  const idx = PARTICLE_STEPS.indexOf(prevN);
  document.getElementById('particleSlider').value = String(idx >= 0 ? idx : 3);
  document.getElementById('particleCountLabel').textContent = currentN;
  await initScene(prevMode);
  running = wasRunning;
  document.getElementById('playPauseBtn').textContent = running ? 'Pause' : 'Play';

  btn.disabled = false;
  setControlsDisabled(false);
  benchmarking = false;
}

document.getElementById('runBenchmarkBtn').addEventListener('click', runBenchmark);

async function bootstrap() {
  // Each mode must request its OWN adapter — a GPUAdapter can only ever be
  // used to create a single device, so sharing one adapter object between
  // GpuMode and GpuTiledMode would make the second mode's setup() throw
  // ("adapter is consumed") the moment both had been switched to once.
  GpuMode.supported = await GpuMode.checkSupport();
  GpuTiledMode.supported = await GpuTiledMode.checkSupport();
  document.getElementById('gpuNote').classList.toggle('show', !GpuMode.supported);
  buildModeButtons();

  const slider = document.getElementById('particleSlider');
  slider.max = String(PARTICLE_STEPS.length - 1);
  slider.value = '3';
  document.getElementById('particleCountLabel').textContent = currentN;

  resizeCanvases();
  renderBenchmarkResults(new Map());
  await switchMode('soa');
  requestAnimationFrame(frame);
}
bootstrap();

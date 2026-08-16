const MODES = [NaiveMode, SoAMode, QuantizedMode, BarnesHutMode, WasmSimdMode, WorkersMode, GpuMode, GpuTiledMode];
const STATS_WINDOW = 30;

// The particle slider is a fixed-resolution log-scale control (0..SLIDER_RESOLUTION
// mapped onto [PARTICLE_MIN_N, mode.maxManualN]) rather than an index into a
// fixed list — that's what lets "Max @ 60fps" jump to an arbitrary N the
// search actually found, instead of snapping to the nearest of a handful of
// preset steps. Each mode supplies its own maxManualN ceiling (see
// gravity-modes.js) so the same slider resolution stays meaningful whether
// the mode caps out in the thousands (CPU) or the hundreds of thousands (GPU).
const PARTICLE_MIN_N = 100;
const SLIDER_RESOLUTION = 1000;
const DEFAULT_N = 800;

let currentMode = null;
let currentN = DEFAULT_N;
let seed = 12345;
let running = true;
let stepTimes = [], frameTimes = [], interFrameTimes = [];
let lastRafTime = null;
let viewScalePxPerWorld = 1, viewCssWidth = 0, viewCssHeight = 0;

const canvas2d = document.getElementById('glCanvas2d');
const canvasGpu = document.getElementById('glCanvasGpu');
const ctx = canvas2d.getContext('2d');

// Sized to the largest possible manual ceiling (GPU modes) so the CPU-side
// getPositions()/drawCanvas2d readback path never needs a resize check.
const scratchX = new Float32Array(200000);
const scratchY = new Float32Array(200000);

function sliderFracToN(t, hiN) {
  const logN = Math.log10(PARTICLE_MIN_N) + Math.max(0, Math.min(1, t)) * (Math.log10(hiN) - Math.log10(PARTICLE_MIN_N));
  return niceRoundN(Math.round(Math.pow(10, logN)));
}
function nToSliderFrac(n, hiN) {
  const t = (Math.log10(n) - Math.log10(PARTICLE_MIN_N)) / (Math.log10(hiN) - Math.log10(PARTICLE_MIN_N));
  return Math.max(0, Math.min(1, t));
}
function niceRoundN(n) {
  n = Math.max(PARTICLE_MIN_N, n);
  if (n < 500) return Math.round(n / 10) * 10;
  if (n < 2000) return Math.round(n / 50) * 50;
  if (n < 10000) return Math.round(n / 100) * 100;
  if (n < 50000) return Math.round(n / 1000) * 1000;
  return Math.round(n / 2000) * 2000;
}
function setSliderForN(n, hiN) {
  document.getElementById('particleSlider').value = String(Math.round(nToSliderFrac(n, hiN) * SLIDER_RESOLUTION));
  document.getElementById('particleCountLabel').textContent = n.toLocaleString();
}

// Particles are drawn at a fixed reference size at DEFAULT_N and shrink as N
// climbs — without this, a 40,000-particle GPU scene renders as one solid
// blue disc long before you get to see the density that makes GPU mode
// interesting. Clamped so tiny scenes don't balloon and huge ones don't
// vanish to sub-pixel.
function particleScaleFactor(n) {
  return Math.max(0.15, Math.min(1.6, Math.sqrt(DEFAULT_N / n)));
}

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

// The GPU render pass's cost depends on N too (draw-call instance count,
// and — since dot size shrinks with particleScaleFactor — how much fill-rate
// each instance actually costs). Any code that times a GPU step for a given
// n needs to render with the SAME point size the live app would actually use
// at that n, or the render pass either draws nothing (point size 0, before
// setView() has ever been called) or draws the wrong size left over from
// whatever n was last live-viewed — both silently understate or misstate the
// real compute+render cost. This is the one place that math lives, shared by
// the live view, calibration, and the max-at-60fps search.
function gpuViewParamsForN(n) {
  const dpr = window.devicePixelRatio || 1;
  return {
    scaleX: (viewScalePxPerWorld * dpr) / (canvasGpu.width / 2),
    scaleY: -(viewScalePxPerWorld * dpr) / (canvasGpu.height / 2),
    pointSize: 3.5 * particleScaleFactor(n),
  };
}

function computeViewTransform(cssW, cssH, gpuModeOverride) {
  viewCssWidth = cssW; viewCssHeight = cssH;
  viewScalePxPerWorld = (Math.min(cssW, cssH) * 0.9) / (2 * WORLD_HALF_EXTENT);
  const gm = gpuModeOverride || currentMode;
  if (gm && gm.isGpu && gm.device) {
    const vp = gpuViewParamsForN(currentN);
    gm.setView(vp.scaleX, vp.scaleY, vp.pointSize);
  }
}

function drawCanvas2d(xs, ys, n) {
  ctx.clearRect(0, 0, viewCssWidth, viewCssHeight);
  const cx = viewCssWidth / 2, cy = viewCssHeight / 2, s = viewScalePxPerWorld;
  const scale = particleScaleFactor(n);
  ctx.fillStyle = '#5b9bd5';
  for (let i = 1; i < n; i++) {
    const px = cx + xs[i] * s, py = cy - ys[i] * s;
    ctx.beginPath();
    ctx.arc(px, py, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  if (n > 0) {
    ctx.fillStyle = '#f0a040';
    ctx.beginPath();
    ctx.arc(cx + xs[0] * s, cy - ys[0] * s, 6 * scale, 0, Math.PI * 2);
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
  checkAutoWatchdog(avgStep);
}

// The Max@60fps search is a point-in-time burst measurement — real sustained
// use (especially on phones) can degrade well below what it found, most
// likely thermal throttling kicking in well after the search already
// declared some N "safe." When latched on, watch the SAME rolling step-time
// average already driving the stats display; if it stays clearly over
// budget for a sustained stretch (not just one noisy sample near the
// boundary), re-run the search to find whatever's actually true right now.
// That re-check can land lower (still throttled) or recover back up
// (conditions improved) — it's a full re-run of the same search, not a
// one-directional step-down.
const WATCHDOG_BAD_MULTIPLIER = 1.4;
const WATCHDOG_SUSTAINED_MS = 4000;
const WATCHDOG_COOLDOWN_MS = 15000;
let watchdogBadSinceMs = null;
let watchdogCooldownUntilMs = null;

function checkAutoWatchdog(avgStepMs) {
  if (!autoMaxLatched || benchmarking || !currentMode) { watchdogBadSinceMs = null; return; }
  const now = performance.now();
  if (watchdogCooldownUntilMs != null && now < watchdogCooldownUntilMs) return;
  if (avgStepMs > FRAME_BUDGET_MS * WATCHDOG_BAD_MULTIPLIER) {
    if (watchdogBadSinceMs == null) watchdogBadSinceMs = now;
    if (now - watchdogBadSinceMs >= WATCHDOG_SUSTAINED_MS) {
      watchdogBadSinceMs = null;
      // Cooldown starts once the re-check actually FINISHES, not when it's
      // triggered — the search itself can run 10-20s, and starting the
      // cooldown clock beforehand would let it expire before fresh,
      // post-recheck stats even exist to judge stability against.
      runAutoMaxSearch(currentMode, 'Re-checking…').then(() => {
        watchdogCooldownUntilMs = performance.now() + WATCHDOG_COOLDOWN_MS;
      });
    }
  } else {
    watchdogBadSinceMs = null;
  }
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
  // Scoped to #modeButtons specifically — the render-technique/shape toggle
  // buttons below also use the .mode-btn class for consistent styling, and
  // an unscoped '.mode-btn' query here would strip their active state on
  // every mode switch (they have no data-modeId, so the toggle condition is
  // always false for them).
  document.querySelectorAll('#modeButtons .mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.modeId === activeId));
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
// Which GPU visualization to use — a global rather than a per-mode setting,
// so switching between GPU and GPU Tiled preserves whichever technique/shape
// you're currently comparing rather than each mode remembering its own.
let gpuRenderTechnique = 'quads';
let gpuRenderShape = 'circle';

function applyGpuRenderSettings(mode) {
  if (!mode.isGpu) return;
  mode.renderTechnique = gpuRenderTechnique;
  mode.renderShape = gpuRenderShape;
}

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
  applyGpuRenderSettings(mode);
  if (mode.isGpu) computeViewTransform(viewCssWidth, viewCssHeight, mode);
  stepTimes = []; frameTimes = []; interFrameTimes = []; lastRafTime = null;
  lastRecordedStepCount = -1; lastCompletionTime = null;
  currentMode = mode;
}

// The mode the user has selected — set synchronously on click, independent
// of whether that mode has actually finished loading yet (currentMode is
// null during that window). The slider/reset handlers key off this, not
// currentMode, so a mode switch that's still in flight doesn't get
// second-guessed by a DOM query or silently fall back to the wrong mode.
let selectedMode = SoAMode;

// When latched on, "Max @ 60fps" re-runs its search on every mode switch
// instead of firing once — the button behaves like an autopilot toggle
// rather than a one-shot jump. A manual slider drag disengages it (see the
// slider's 'input' listener below), the same way touching the wheel
// disengages a car's autopilot. Defaults to on so the page opens already
// running each mode at its real sustainable ceiling.
let autoMaxLatched = true;

// The single source of truth for the toggle's visual state — used by the
// click handler, the slider's disengage path, AND bootstrap (so the
// default-on state is reflected from the very first paint, not just after
// the user's first manual click).
function setAutoMaxLatchUI(latched) {
  document.getElementById('maxAt60Btn').classList.toggle('primary', latched);
}

async function switchMode(modeId) {
  const mode = MODES.find((m) => m.id === modeId);
  if (!mode || (mode.isGpu && !mode.supported)) return;
  selectedMode = mode;
  canvas2d.style.display = mode.isGpu ? 'none' : 'block';
  canvasGpu.style.display = mode.isGpu ? 'block' : 'none';
  document.getElementById('modeDesc').innerHTML = `<strong>${mode.label}:</strong> ${mode.description}`;
  document.getElementById('gpuRenderToggles').classList.toggle('show', mode.isGpu);
  updateModeButtonsUI(modeId);
  if (autoMaxLatched) {
    await runAutoMaxSearch(mode);
    return;
  }
  // Each mode has its own safe manual ceiling (see gravity-modes.js) — a
  // brute-force CPU mode reached from a huge GPU-mode N would otherwise
  // inherit a particle count it could never actually step through at any
  // usable frame rate.
  if (currentN > mode.maxManualN) currentN = mode.maxManualN;
  setSliderForN(currentN, mode.maxManualN);
  await initScene(mode);
}

// Tracks, per async mode, the last stepCount/completion-time we already
// recorded stats for — lets frame() tell a genuinely NEW completed step
// apart from a busy-guarded no-op tick.
let lastRecordedStepCount = -1;
let lastCompletionTime = null;

function frame(now) {
  requestAnimationFrame(frame);
  if (!running || !currentMode) { lastRafTime = null; return; }

  if (currentMode === WorkersMode || currentMode.isGpu) {
    // step() is fire-and-forget here — it kicks off an async round-trip
    // (worker postMessage, or a GPU submit) and no-ops if the previous one
    // hasn't finished yet. Naively recording stats every rAF tick regardless
    // would report the display's ~60Hz refresh rate as "FPS" even while the
    // simulation itself is only really completing a fraction of that many
    // steps per second — exactly the gap that made a mode showing "60 FPS"
    // able to also show a physics-step time well over the 16.7ms budget.
    // Recording only on an actual stepCount change, with inter-completion
    // timing instead of inter-rAF timing, makes FPS reflect the real
    // simulation cadence instead of the compositor's.
    currentMode.step();
    if (currentMode.stepCount !== lastRecordedStepCount) {
      lastRecordedStepCount = currentMode.stepCount;
      const interCompletionMs = lastCompletionTime != null ? now - lastCompletionTime : null;
      lastCompletionTime = now;
      recordTiming(currentMode.lastStepMs, currentMode.lastStepMs, interCompletionMs);
    }
    if (!currentMode.isGpu) {
      currentMode.getPositions(scratchX, scratchY);
      drawCanvas2d(scratchX, scratchY, currentN);
    }
    return;
  }

  const interFrameMs = lastRafTime != null ? now - lastRafTime : null;
  lastRafTime = now;
  const stepStart = performance.now();
  currentMode.step();
  const stepEnd = performance.now();
  currentMode.getPositions(scratchX, scratchY);
  drawCanvas2d(scratchX, scratchY, currentN);
  const frameEnd = performance.now();
  recordTiming(stepEnd - stepStart, frameEnd - stepStart, interFrameMs);
}

document.getElementById('particleSlider').addEventListener('input', async (e) => {
  if (autoMaxLatched) {
    autoMaxLatched = false;
    setAutoMaxLatchUI(false);
  }
  currentN = sliderFracToN((+e.target.value) / SLIDER_RESOLUTION, selectedMode.maxManualN);
  document.getElementById('particleCountLabel').textContent = currentN.toLocaleString();
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

document.querySelectorAll('#techniqueToggle .mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    gpuRenderTechnique = btn.dataset.technique;
    document.querySelectorAll('#techniqueToggle .mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
    // The shape toggle only means anything for the instanced-quads
    // technique — the splat path has no per-particle shape to pick.
    document.getElementById('shapeToggleWrap').style.display = gpuRenderTechnique === 'quads' ? '' : 'none';
    if (currentMode && currentMode.isGpu) currentMode.renderTechnique = gpuRenderTechnique;
  });
});
document.querySelectorAll('#shapeToggle .mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    gpuRenderShape = btn.dataset.shape;
    document.querySelectorAll('#shapeToggle .mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
    if (currentMode && currentMode.isGpu) currentMode.renderShape = gpuRenderShape;
  });
});

// Runs the same doubling-ramp + binary-search used by the "all modes"
// benchmark below, but for just one mode, then jumps the live scene
// straight to that N. Shared by the button's initial click (one search) and
// by switchMode() while the toggle is latched on (a search on every switch).
async function runAutoMaxSearch(mode, searchingLabel) {
  benchmarking = true;
  const btn = document.getElementById('maxAt60Btn');
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = searchingLabel || 'Searching…';
  setControlsDisabled(true);

  // The live rAF loop keeps calling currentMode.step() (plus a 2D redraw)
  // every ~16ms regardless of what this search is doing — left running, it
  // competes with the search's own measurements for the main thread and
  // badly distorts them (this is exactly what made an isolated ~0.8ms GPU
  // dispatch measure as a suspiciously vsync-shaped ~18ms once a live CPU
  // mode was still ticking in the background). runBenchmark() already
  // paused this for the same reason; this path needs the same guard.
  const wasRunning = running;
  running = false;

  if (mode === WasmSimdMode && !WasmSimdMode.instance) await WasmSimdMode.load();
  if (mode.isGpu) {
    if (!mode.device) await mode.setup(canvasGpu);
    else mode.activate();
  }
  const result = await findMaxNAt60fps(makeStepTimer(mode));
  currentN = Math.max(PARTICLE_MIN_N, Math.min(mode.maxManualN, result.tooSlow ? PARTICLE_MIN_N : result.n));
  setSliderForN(currentN, mode.maxManualN);
  await initScene(mode);
  running = wasRunning;

  btn.textContent = originalLabel;
  btn.disabled = false;
  setControlsDisabled(false);
  benchmarking = false;
}

document.getElementById('maxAt60Btn').addEventListener('click', async () => {
  if (benchmarking) return;
  autoMaxLatched = !autoMaxLatched;
  setAutoMaxLatchUI(autoMaxLatched);
  if (!autoMaxLatched) return; // just disengaged — leave the current N as-is
  await runAutoMaxSearch(selectedMode);
});

// ── "Max particles at 60fps" benchmark ──
// An alternative, more intuitive framing than "ms/step at a fixed N": for
// each mode, find the largest particle count whose step time still fits the
// 16.7ms/frame budget. Doubling ramp-up finds a bracket fast regardless of
// a mode's actual complexity class (O(N^2) vs O(N log N) vs O(N)), then a
// short binary search narrows it down within that bracket.
const FRAME_BUDGET_MS = 1000 / 60;
const BENCH_CAP_N = 200000;
const BENCH_SEED = 424242;
let benchmarking = false;

// A promise that never settles (a device that's actually wedged, or an
// onSubmittedWorkDone() that some driver never resolves after a hang) would
// otherwise leave the search hung forever rather than reporting "too slow."
// Races against a generous timeout so the search always terminates.
function withTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, () => { clearTimeout(timer); resolve(fallback); });
  });
}
const GPU_STEP_TIMEOUT_MS = 3000;

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
    // Every trial is awaited individually (real backpressure — never more
    // than one outstanding submission) rather than firing `trials` dispatches
    // back-to-back before waiting on any of them, which is exactly the
    // queue-pileup pattern that made GPU modes stall at high N in the first
    // place. The first trial's time is checked before committing to 19 more:
    // if a single dispatch already blew way past budget, running more
    // identical ones only compounds the risk for no useful extra precision.
    return async (n) => {
      if (mode.deviceLost) return Infinity;
      mode.init(n, BENCH_SEED);
      // Render at the SAME point size the live view would actually use at
      // this n — otherwise every n in the sweep gets measured with whatever
      // point size happened to be left in the view-params buffer (zero, if
      // this mode has never been live-viewed yet), which silently omits or
      // misstates the render pass's real, N-dependent cost.
      const vp = gpuViewParamsForN(n);
      mode.setView(vp.scaleX, vp.scaleY, vp.pointSize);
      const t0 = performance.now();
      mode._submitStep();
      const done = await withTimeout(mode.device.queue.onSubmittedWorkDone(), GPU_STEP_TIMEOUT_MS, 'timeout');
      const firstMs = performance.now() - t0;
      if (done === 'timeout' || mode.deviceLost) return Infinity;
      if (firstMs > FRAME_BUDGET_MS * 4) return firstMs;
      const trials = 20;
      let total = firstMs;
      for (let i = 1; i < trials; i++) {
        const ti = performance.now();
        mode._submitStep();
        const d = await withTimeout(mode.device.queue.onSubmittedWorkDone(), GPU_STEP_TIMEOUT_MS, 'timeout');
        if (d === 'timeout' || mode.deviceLost) return Infinity;
        total += performance.now() - ti;
      }
      return total / trials;
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

// A single measurement over budget could be the real cost, or it could be a
// transient hiccup — OS scheduling noise, a GC pause from whatever mode ran
// right before this one, a GPU driver warming up. Retrying once before
// accepting a "too slow" verdict costs almost nothing on the common path
// (only failing samples get retried) but prevents one bad sample — especially
// dangerous at the very first N tested, where it would otherwise sink the
// entire search to "too slow" — from throwing away an otherwise-good result.
async function measureWithRetry(stepTimeFn, n) {
  const first = await stepTimeFn(n);
  if (first <= FRAME_BUDGET_MS) return first;
  return await stepTimeFn(n);
}

async function findMaxNAt60fps(stepTimeFn) {
  let lastGoodN = 0, lastGoodMs = 0;
  let n = PARTICLE_MIN_N;
  let firstBadN = null;
  while (n <= BENCH_CAP_N) {
    const ms = await measureWithRetry(stepTimeFn, n);
    if (ms <= FRAME_BUDGET_MS) { lastGoodN = n; lastGoodMs = ms; n *= 2; }
    else { firstBadN = n; break; }
  }
  if (firstBadN === null) return { n: lastGoodN || BENCH_CAP_N, ms: lastGoodMs, hitCap: true };
  if (lastGoodN === 0) return { n: 0, ms: lastGoodMs, tooSlow: true };

  let lo = lastGoodN, hi = firstBadN;
  for (let iter = 0; iter < 7 && hi - lo > Math.max(1, Math.floor(lo * 0.02)); iter++) {
    const mid = Math.round((lo + hi) / 2);
    const ms = await measureWithRetry(stepTimeFn, mid);
    if (ms <= FRAME_BUDGET_MS) { lo = mid; lastGoodMs = ms; } else { hi = mid; }
  }
  return { n: lo, ms: lastGoodMs };
}

function formatMaxN(r) {
  if (r.unsupported) return '—';
  if (r.tooSlow) return `< ${PARTICLE_MIN_N}`;
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
      ? Math.max(3, ((Math.log10(r.n) - Math.log10(PARTICLE_MIN_N)) / (Math.log10(BENCH_CAP_N) - Math.log10(PARTICLE_MIN_N))) * 100)
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
  document.getElementById('runBenchmarkBtn').disabled = disabled;
}

async function runBenchmark() {
  if (benchmarking) return;
  benchmarking = true;
  const btn = document.getElementById('runBenchmarkBtn');
  const statusEl = document.getElementById('benchmarkStatus');
  const defaultStatusText = statusEl.textContent;
  btn.disabled = true;
  document.getElementById('maxAt60Btn').disabled = true;
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
  setSliderForN(currentN, prevMode.maxManualN);
  await initScene(prevMode);
  running = wasRunning;
  document.getElementById('playPauseBtn').textContent = running ? 'Pause' : 'Play';

  btn.disabled = false;
  document.getElementById('maxAt60Btn').disabled = false;
  setControlsDisabled(false);
  benchmarking = false;
}

document.getElementById('runBenchmarkBtn').addEventListener('click', runBenchmark);

// Sets up the device/pipelines and measures a real safe particle ceiling for
// one GPU mode, up front — before the user can ever touch its slider or
// buttons. If either step throws (driver quirk, shader compile failure,
// mid-calibration device loss), the mode is marked unsupported and disabled
// rather than leaving bootstrap() itself throwing and taking the whole page
// down with it.
async function setUpGpuMode(mode) {
  try {
    await mode.setup(canvasGpu);
    await mode.calibrateCeiling(gpuViewParamsForN);
  } catch (e) {
    console.error(`${mode.label}: setup/calibration failed, disabling`, e);
    mode.supported = false;
  }
}

async function bootstrap() {
  // Sized BEFORE any GPU calibration runs — gpuViewParamsForN() needs real
  // canvas dimensions and viewScalePxPerWorld to render calibration's probe
  // step at a realistic point size instead of whatever a not-yet-sized
  // canvas would produce.
  resizeCanvases();

  // Each mode must request its OWN adapter — a GPUAdapter can only ever be
  // used to create a single device, so sharing one adapter object between
  // GpuMode and GpuTiledMode would make the second mode's setup() throw
  // ("adapter is consumed") the moment both had been switched to once.
  GpuMode.supported = await GpuMode.checkSupport();
  GpuTiledMode.supported = await GpuTiledMode.checkSupport();
  if (GpuMode.supported) await setUpGpuMode(GpuMode);
  if (GpuTiledMode.supported) await setUpGpuMode(GpuTiledMode);
  document.getElementById('gpuNote').classList.toggle('show', !GpuMode.supported && !GpuTiledMode.supported);
  buildModeButtons();

  renderBenchmarkResults(new Map());
  setAutoMaxLatchUI(autoMaxLatched);
  await switchMode('soa');
  requestAnimationFrame(frame);
}
bootstrap();

import { detectCapabilities, mountCapabilityBanner } from '../shared/capabilities.js';
import { drawSeriesChart } from '../shared/metrics.js';
import { appendRun } from '../shared/runs.js';
import { initTabs } from '../shared/tabs.js';
import { activateBackend, backendChoiceLabel, getTf, loadTensorflow } from './backend.js';
import {
  CLASS_NAMES,
  IMAGE_PIXELS,
  TRAIN_COUNT,
  VAL_COUNT,
  classExampleIndices,
  loadFashion,
} from './data.js';
import { classMeans, generateBatch, generateForClasses, latentWalk, paintGray } from './generate.js';
import { disposeVae, loadVae, presetLabel, saveVae } from './model.js';
import { PERF_PROTOCOL, loadPerf, runPerfSweep } from './perf.js';
import { trainFashion } from './train.js';

const banner = document.getElementById('cap-banner');
const backendNote = document.getElementById('backend-note');
const trainStatus = document.getElementById('train-status');
const dashStatus = document.getElementById('dash-status');
const sampleStatus = document.getElementById('sample-status');
const perfStatus = document.getElementById('perf-status');
const backendSelect = document.getElementById('backend');
const epochsInput = document.getElementById('epochs');
const batchInput = document.getElementById('batch');
const lrInput = document.getElementById('lr');
const modelSelect = document.getElementById('model');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const generateBtn = document.getElementById('generate');
const meansBtn = document.getElementById('class-means');
const walkBtn = document.getElementById('latent-walk');
const classSelect = document.getElementById('gen-class');
const countInput = document.getElementById('gen-count');
const runPerfBtn = document.getElementById('run-perf');
const stopPerfBtn = document.getElementById('stop-perf');
const epochBody = document.getElementById('epoch-body');
const perfBody = document.getElementById('perf-body');
const perfSaved = document.getElementById('perf-saved');
const protocolNote = document.getElementById('perf-protocol');
const statEpoch = document.getElementById('stat-epoch');
const statLoss = document.getElementById('stat-loss');
const statRecon = document.getElementById('stat-recon');
const statKl = document.getElementById('stat-kl');
const statSps = document.getElementById('stat-sps');
const reconCanvas = document.getElementById('recon-chart');
const klCanvas = document.getElementById('kl-chart');
const sampleGrid = document.getElementById('sample-grid');
const meanGrid = document.getElementById('mean-grid');
const walkRow = document.getElementById('walk-row');
const verifyGrid = document.getElementById('verify-grid');

const charts = { recon: [], kl: [] };

let caps = null;
let active = null;
let model = null;
let dataset = null;
let job = null;
let stopFlag = false;
let tfReady = false;
let backendGeneration = 0;

const tabs = initTabs(document, {
  onChange(id) {
    if (id === 'dashboard') paintCharts();
  },
});

document.getElementById('train-form').addEventListener('submit', (event) => {
  event.preventDefault();
});

protocolNote.textContent = `Fixed protocol: ${PERF_PROTOCOL.epochs} epoch, ${PERF_PROTOCOL.trainSamples} images, batch ${PERF_PROTOCOL.batchSize}, learning rate ${formatLr(PERF_PROTOCOL.lr)}, then ${PERF_PROTOCOL.genCount} generated images timed after a ${PERF_PROTOCOL.warmupGens}-image warmup.`;

resetEpochTable();
paintCharts();
renderPerf(loadPerf());
window.addEventListener('resize', paintCharts);

startBtn.addEventListener('click', () => {
  runJob('train', async () => {
    const config = readForm();
    await ensureBackend(config.backend);
    config.backendLabel = active.label;
    beginSession();
    setStatus(`Training ${presetLabel()} on ${active.label}…`);
    const result = await trainFashion(config, hooks());
    await finishResult(config, result);
  });
});

stopBtn.addEventListener('click', requestStop);
stopPerfBtn.addEventListener('click', requestStop);

generateBtn.addEventListener('click', () => {
  runSamples('Generating…', () => showGenerated(selectedClass(), readCount())).catch(onSampleError);
});

meansBtn.addEventListener('click', () => {
  runSamples('Decoding class means…', showMeans).catch(onSampleError);
});

walkBtn.addEventListener('click', () => {
  runSamples('Walking the latent…', showWalk).catch(onSampleError);
});

runPerfBtn.addEventListener('click', () => {
  runJob('perf', async () => {
    perfSaved.textContent = '';
    setPerfStatus('Starting the backend sweep…');
    const payload = await runPerfSweep({
      caps,
      shouldStop: () => stopFlag,
      onUpdate: renderPerf,
      onStatus: setPerfStatus,
    });
    renderPerf(payload);
    const done = payload.rows.filter((row) => row.status === 'done').length;
    if (stopFlag) setPerfStatus('Perf compare cancelled. Partial results are saved in this browser.', done ? 'ok' : '');
    else setPerfStatus(`Perf compare finished. ${done} backend${done === 1 ? '' : 's'} completed.`, done ? 'ok' : '');
    await ensureBackend(backendSelect.value);
    await adoptSavedModel();
  });
});

backendSelect.addEventListener('change', () => {
  if (job || !tfReady) return;
  const generation = ++backendGeneration;
  backendSelect.disabled = true;
  ensureBackend(backendSelect.value)
    .then(async () => {
      if (generation !== backendGeneration) return;
      await adoptSavedModel();
      if (dataset && model) {
        await showClassVerification(2);
        setSampleStatus('Saved weights loaded. Each generated image was conditioned on its caption. Real Fashion-MNIST of that class sits beside it.', 'ok');
      }
    })
    .catch((error) => {
      console.error(error);
      setStatus(errorText(error), 'error');
    })
    .finally(() => {
      if (generation === backendGeneration) syncButtons();
    });
});

boot();

async function boot() {
  setStatus('Checking this browser…');
  try {
    caps = await detectCapabilities();
    mountCapabilityBanner(banner, caps);
  } catch (error) {
    console.error(error);
    caps = {
      secureContext: window.isSecureContext,
      webgpu: false,
      webgpuAdapter: false,
      wasm: typeof WebAssembly !== 'undefined',
      wasmSimd: false,
      webgl: false,
      webgl2: false,
      preferredBackend: 'cpu',
    };
    banner.classList.add('banner', 'red');
    banner.dataset.webgpu = 'no';
  }

  const dataPromise = loadFashion(onDataProgress).then((data) => {
    dataset = data;
    paintVerifyReals(data);
    return data;
  }).catch((error) => {
    console.error(error);
    setSampleStatus(`Fashion-MNIST did not load. ${errorText(error)}`, 'error');
    return null;
  });

  setStatus('Loading TensorFlow.js…');
  backendNote.textContent = 'Loading TensorFlow.js from the CDN…';
  try {
    await loadTensorflow();
    tfReady = true;
    active = await activateBackend(backendSelect.value, caps);
    applyActive(active);
    await adoptSavedModel();
    const data = dataset || await dataPromise;
    const cacheNote = data && data.fromCache
      ? 'Fashion-MNIST is cached in this browser.'
      : 'The first train downloads Fashion-MNIST (about 4.4 MB) if it is not cached yet.';
    setStatus(model
      ? `Saved weights loaded. Generate samples, or train again to replace them. ${cacheNote}`
      : `Ready. ${cacheNote}`);
    if (model && data) {
      await showClassVerification(2);
      setSampleStatus('Saved weights loaded. Each generated image was conditioned on its caption. Real Fashion-MNIST of that class sits beside it.', 'ok');
    }
  } catch (error) {
    console.error(error);
    setStatus(errorText(error), 'error');
    backendNote.textContent = 'TensorFlow.js did not start. Training stays disabled.';
  }
  syncButtons();
}

function hooks() {
  return {
    onDataProgress,
    onBatch,
    onEpoch: recordEpoch,
    shouldStop: () => stopFlag,
  };
}

function onDataProgress(info) {
  if (!info) return;
  if (info.phase === 'cache') setStatus('Loading Fashion-MNIST from IndexedDB…');
  else if (info.phase === 'download') setStatus(`Downloading Fashion-MNIST… ${info.label || ''}`.trim());
  else if (info.phase === 'decode') setStatus('Unpacking Fashion-MNIST…');
  else if (info.phase === 'cache-write') setStatus('Caching Fashion-MNIST in IndexedDB…');
  else if (info.phase === 'tensors') setStatus('Building the conditional VAE…');
}

function onBatch(info) {
  statEpoch.textContent = `${info.epoch} / ${info.epochs}`;
  statLoss.textContent = formatLoss(info.loss);
  statSps.textContent = formatSps(info.samplesPerSec);
  setStatus(`Epoch ${info.epoch}/${info.epochs} · batch ${info.batch}/${info.batches} · total ${formatLoss(info.loss)} · β ${formatBeta(info.beta)} · ${formatSps(info.samplesPerSec)} samples/sec`);
}

function recordEpoch(row) {
  if (epochBody.querySelector('.empty')) epochBody.replaceChildren();
  charts.recon.push(row.recon / IMAGE_PIXELS);
  charts.kl.push(row.kl);
  const tr = document.createElement('tr');
  const cells = [
    String(row.epoch),
    formatRecon(row.recon),
    formatKl(row.kl),
    formatLoss(row.loss),
    formatBeta(row.beta),
    formatLoss(row.valLoss),
    formatSps(row.samplesPerSec),
    row.backend,
  ];
  for (const text of cells) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.appendChild(td);
  }
  epochBody.appendChild(tr);
  statEpoch.textContent = `${row.epoch} / ${row.epochs}`;
  statLoss.textContent = formatLoss(row.loss);
  statRecon.textContent = formatRecon(row.recon);
  statKl.textContent = formatKl(row.kl);
  statSps.textContent = formatSps(row.samplesPerSec);
  setStatus(`Epoch ${row.epoch}/${row.epochs} done · recon/px ${formatRecon(row.recon)} · KL ${formatKl(row.kl)} · total ${formatLoss(row.loss)} · val ${formatLoss(row.valLoss)} · ${row.seconds.toFixed(1)}s`);
  paintCharts();
}

async function finishResult(config, result) {
  if (!result || result.epochsRun < 1 || !result.model) {
    setStatus('Stopped before the first epoch finished. No run saved.');
    return;
  }
  if (model && model !== result.model) disposeVae(model);
  model = result.model;
  syncButtons();
  const cacheNote = result.fromCache ? ' Fashion-MNIST cache hit.' : ' Fashion-MNIST cached in IndexedDB.';
  const saveNote = result.saveError
    ? ' Weight save failed — generate still works until you leave the page.'
    : ' Best checkpoint saved.';
  const lead = result.stopped
    ? `Stopped after ${result.epochsRun} epoch${result.epochsRun === 1 ? '' : 's'}`
    : `Finished ${result.epochsRun} epoch${result.epochsRun === 1 ? '' : 's'}`;
  setStatus(`${lead} · recon/px ${formatRecon(result.recon)} · KL ${formatKl(result.kl)} · ${formatSps(result.samplesPerSec)} samples/sec · ${result.backend}.${cacheNote}${saveNote}`, result.saveError ? 'error' : 'ok');
  setSampleStatus('Checkpoint ready. Building the real vs generated check…');
  try {
    if (!dataset) dataset = await loadFashion();
    await showClassVerification(2);
    await showMeans();
    setGalleryHint(sampleGrid, 'Use Generate for a larger draw of the class selected above. The grid above pairs real Fashion-MNIST with samples conditioned on that class.');
    if (tabs) tabs.show('samples');
    setSampleStatus(`Verification grid ready. Each generated image was conditioned on its caption (${CLASS_NAMES.join(', ')}). Two real Fashion-MNIST images of that class sit beside them. Class means use z = 0. Recon/px ${formatRecon(result.recon)}.`, 'ok');
  } catch (error) {
    console.error(error);
    setSampleStatus(`Training finished, but sampling failed. ${errorText(error)}`, 'error');
  }
  try {
    appendRun({
      id: `fashion-${Date.now()}`,
      name: `Fashion VAE · recon/px ${formatRecon(result.recon)}`,
      demo: 'fashion-gen',
      backend: result.backend,
      savedAt: new Date().toISOString(),
      loss: Number(result.loss.toFixed(2)),
      recon: Number(formatRecon(result.recon)),
      kl: Number(formatKl(result.kl)),
      epochs: result.epochsRun,
      batchSize: result.batchSize,
      learningRate: config.lr,
      model: 'cvae',
      samplesPerSec: Math.round(result.samplesPerSec || 0),
      durationMs: Math.round(result.durationMs || 0),
      stopped: !!result.stopped,
    });
  } catch (error) {
    console.warn('Could not write run history', error);
  }
}

async function ensureBackend(choice) {
  const sameAuto = choice === 'auto' && active && active.requested === 'auto';
  const sameExplicit = choice !== 'auto' && active && active.requested === choice && active.name === choice;
  if (sameAuto || sameExplicit) return;
  if (model) {
    try {
      await saveVae(model);
    } catch (error) {
      console.warn(error);
    }
    disposeVae(model);
    model = null;
    syncButtons();
  }
  const next = await activateBackend(choice, caps);
  applyActive(next);
}

async function adoptSavedModel() {
  if (model) {
    try {
      await saveVae(model);
    } catch (error) {
      console.warn(error);
    }
    disposeVae(model);
    model = null;
  }
  model = await loadVae(getTf());
  if (model) setSampleStatus('Saved weights loaded. Generate a clothing class.');
  syncButtons();
}

function applyActive(next) {
  active = next;
  mountCapabilityBanner(banner, caps, {
    activeBackend: next.name,
    activeLabel: next.label,
    fellBack: next.fellBack,
    requestedLabel: backendChoiceLabel(next.requested),
  });
  const fallback = next.fellBack ? ` ${backendChoiceLabel(next.requested)} did not start, so this is the fallback.` : '';
  backendNote.textContent = `Active backend: ${next.label}.${fallback} Training uses ${TRAIN_COUNT.toLocaleString()} images and ${VAL_COUNT.toLocaleString()} validation images. The VAE is dense, so WASM can train it.`;
}

function readForm() {
  const epochs = Number(epochsInput.value);
  const batchSize = Number(batchInput.value);
  const lr = Number(lrInput.value);
  if (!Number.isInteger(epochs) || epochs < 1 || epochs > 200) {
    throw new Error('Epochs must be a whole number from 1 to 200.');
  }
  if (!Number.isInteger(batchSize) || batchSize < 16 || batchSize > 256) {
    throw new Error('Batch size must be a whole number from 16 to 256.');
  }
  if (!Number.isFinite(lr) || lr < 0.0001 || lr > 0.1) {
    throw new Error('Learning rate must be between 0.0001 and 0.1.');
  }
  return {
    epochs,
    batchSize,
    lr,
    backend: backendSelect.value || 'auto',
  };
}

function beginSession() {
  charts.recon = [];
  charts.kl = [];
  resetEpochTable();
  statEpoch.textContent = '—';
  statLoss.textContent = '—';
  statRecon.textContent = '—';
  statKl.textContent = '—';
  statSps.textContent = '—';
  paintCharts();
}

function runJob(kind, fn) {
  if (job) return;
  job = kind;
  stopFlag = false;
  syncButtons();
  Promise.resolve()
    .then(fn)
    .catch((error) => {
      console.error(error);
      if (kind === 'perf') setPerfStatus(errorText(error), 'error');
      else setStatus(errorText(error), 'error');
    })
    .finally(() => {
      job = null;
      stopFlag = false;
      syncButtons();
    });
}

function requestStop() {
  if (!job) return;
  stopFlag = true;
  if (job === 'perf') setPerfStatus('Cancelling after the current batch…');
  else setStatus('Stopping after the current batch…');
}

function selectedClass() {
  if (classSelect.value === 'random') return null;
  const index = Number(classSelect.value);
  return Number.isInteger(index) ? index : null;
}

function readCount() {
  const count = Number(countInput.value);
  if (!Number.isInteger(count) || count < 4 || count > 32) {
    throw new Error('Image count must be a whole number from 4 to 32.');
  }
  return count;
}

function runSamples(label, fn) {
  if (!model) {
    setSampleStatus('Train a model, or reload a saved one, before generating.', 'error');
    return Promise.resolve();
  }
  setSampleStatus(label);
  generateBtn.disabled = true;
  meansBtn.disabled = true;
  walkBtn.disabled = true;
  return Promise.resolve()
    .then(fn)
    .finally(() => syncButtons());
}

function onSampleError(error) {
  console.error(error);
  setSampleStatus(errorText(error), 'error');
  syncButtons();
}

async function showGenerated(classIndex, count) {
  const batch = await generateBatch(getTf(), model.decoder, classIndex, count);
  renderGallery(sampleGrid, batch.classes.map((cls, index) => ({
    label: `Generated · ${CLASS_NAMES[cls]}`,
    pixels: batch.pixels,
    offset: index * IMAGE_PIXELS,
    gain: 255,
    aria: `Generated ${CLASS_NAMES[cls]}, conditioned on ${CLASS_NAMES[cls]}`,
  })));
  renderVerify(rowsFromBatch(batch));
  if (classIndex == null) {
    setSampleStatus(`Generated ${count} images. Each tile was conditioned on its caption (mixed classes). Real Fashion-MNIST of that class is shown beside those tiles.`, 'ok');
    return;
  }
  const name = CLASS_NAMES[classIndex];
  setSampleStatus(`Generated ${count} image${count === 1 ? '' : 's'} conditioned on ${name}. Two real ${name} images are shown beside them.`, 'ok');
}

async function showClassVerification(perClass) {
  const classes = [];
  for (let cls = 0; cls < CLASS_NAMES.length; cls += 1) {
    for (let n = 0; n < perClass; n += 1) classes.push(cls);
  }
  const batch = await generateForClasses(getTf(), model.decoder, classes);
  renderVerify(rowsFromBatch(batch));
}

async function showMeans() {
  const batch = await classMeans(getTf(), model.decoder);
  renderGallery(meanGrid, batch.classes.map((cls, index) => ({
    label: `Mean · ${CLASS_NAMES[cls]}`,
    pixels: batch.pixels,
    offset: index * IMAGE_PIXELS,
    gain: 255,
    aria: `Class mean conditioned on ${CLASS_NAMES[cls]}`,
  })));
  setSampleStatus('Class means at z = 0. Each tile was conditioned on its caption.', 'ok');
}

async function showWalk() {
  const picked = selectedClass();
  const walk = await latentWalk(getTf(), model.decoder, picked, 8);
  renderGallery(walkRow, walk.classes.map((cls, index) => ({
    label: index === 0 ? 'start' : (index === walk.classes.length - 1 ? 'end' : `${index}`),
    pixels: walk.pixels,
    offset: index * IMAGE_PIXELS,
    gain: 255,
    aria: `${CLASS_NAMES[cls]} latent step ${index + 1}`,
  })));
  setSampleStatus(`Latent walk conditioned on ${CLASS_NAMES[walk.classIndex]}.`, 'ok');
}

function paintVerifyReals(data) {
  const rows = [];
  for (let cls = 0; cls < CLASS_NAMES.length; cls += 1) {
    rows.push({
      classIndex: cls,
      realTiles: realTiles(data, cls, 2),
      genTiles: [],
    });
  }
  renderVerify(rows);
}

function realTiles(data, classIndex, count) {
  if (!data) return [];
  return classExampleIndices(data.labels, classIndex, count).map((index) => ({
    label: `Real · ${CLASS_NAMES[classIndex]}`,
    pixels: data.images,
    offset: index * IMAGE_PIXELS,
    gain: 1,
    aria: `Real ${CLASS_NAMES[classIndex]}`,
  }));
}

function rowsFromBatch(batch) {
  const groups = new Map();
  const order = [];
  for (let i = 0; i < batch.classes.length; i += 1) {
    const cls = batch.classes[i];
    if (!groups.has(cls)) {
      groups.set(cls, []);
      order.push(cls);
    }
    groups.get(cls).push(i);
  }
  order.sort((a, b) => a - b);
  return order.map((cls) => ({
    classIndex: cls,
    realTiles: realTiles(dataset, cls, 2),
    genTiles: groups.get(cls).map((index) => ({
      label: `Generated · ${CLASS_NAMES[cls]}`,
      pixels: batch.pixels,
      offset: index * IMAGE_PIXELS,
      gain: 255,
      aria: `Generated ${CLASS_NAMES[cls]}, conditioned on ${CLASS_NAMES[cls]}`,
    })),
  }));
}

function renderVerify(rows) {
  verifyGrid.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No comparison yet.';
    verifyGrid.appendChild(empty);
    return;
  }
  const list = document.createElement('div');
  list.className = 'verify-list';
  for (const row of rows) {
    const name = CLASS_NAMES[row.classIndex];
    const block = document.createElement('div');
    block.className = 'verify-row';
    const title = document.createElement('h3');
    title.textContent = name;
    const pair = document.createElement('div');
    pair.className = 'verify-pair';
    pair.append(
      verifyColumn('Real', 'real', row.realTiles, 'No real images for this class.'),
      verifyColumn(`Generated · conditioned on ${name}`, 'gen', row.genTiles, 'Generated images show up after you train.'),
    );
    block.append(title, pair);
    list.appendChild(block);
  }
  verifyGrid.appendChild(list);
}

function verifyColumn(label, kind, tiles, emptyText) {
  const col = document.createElement('div');
  col.className = `verify-col ${kind}`;
  const heading = document.createElement('p');
  heading.className = `verify-label ${kind}`;
  heading.textContent = label;
  const grid = document.createElement('div');
  grid.className = kind === 'real' ? 'verify-reals' : 'sample-grid';
  if (!tiles.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = emptyText;
    grid.appendChild(empty);
  } else {
    for (const item of tiles) appendSample(grid, item);
  }
  col.append(heading, grid);
  return col;
}

function setGalleryHint(root, text) {
  root.replaceChildren();
  const empty = document.createElement('p');
  empty.className = 'hint';
  empty.textContent = text;
  root.appendChild(empty);
}

function appendSample(root, item) {
  const fig = document.createElement('figure');
  fig.className = 'sample-cell';
  const canvas = document.createElement('canvas');
  canvas.width = 28;
  canvas.height = 28;
  canvas.setAttribute('aria-label', item.aria || item.label);
  paintGray(canvas, item.pixels, item.offset || 0, item.gain == null ? 255 : item.gain);
  const cap = document.createElement('figcaption');
  cap.textContent = item.label;
  fig.append(canvas, cap);
  root.appendChild(fig);
}

function renderGallery(root, items) {
  root.replaceChildren();
  if (!items.length) {
    setGalleryHint(root, 'No images yet.');
    return;
  }
  for (const item of items) appendSample(root, item);
}

function renderPerf(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : (payload && Array.isArray(payload.rows) ? payload.rows : []);
  const savedAt = !Array.isArray(payload) && payload && payload.savedAt ? payload.savedAt : '';
  perfBody.replaceChildren();
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.className = 'empty';
    const td = document.createElement('td');
    td.colSpan = 7;
    td.textContent = 'No results yet.';
    tr.appendChild(td);
    perfBody.appendChild(tr);
    perfSaved.textContent = '';
    return;
  }
  for (const row of rows) {
    const tr = document.createElement('tr');
    const values = [
      row.label || backendChoiceLabel(row.backend),
      formatDuration(row.trainMs),
      formatSps(row.samplesPerSec),
      formatGenMs(row.genMs),
      formatGens(row.gensPerSec),
      formatLoss(row.loss),
    ];
    for (const text of values) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    }
    const status = document.createElement('td');
    status.textContent = row.error && row.status === 'failed'
      ? `${row.statusText} · ${trimError(row.error)}`
      : (row.statusText || row.status || '—');
    if (row.status === 'running') status.className = 'status-running';
    else if (row.status === 'done') status.className = 'status-done';
    else if (row.status === 'failed') status.className = 'status-failed';
    tr.appendChild(status);
    perfBody.appendChild(tr);
  }
  if (savedAt) perfSaved.textContent = `Last saved ${savedAt} in browser-ai.fashion-perf.`;
}

function resetEpochTable() {
  epochBody.replaceChildren();
  const tr = document.createElement('tr');
  tr.className = 'empty';
  const td = document.createElement('td');
  td.colSpan = 8;
  td.textContent = 'No epochs yet.';
  tr.appendChild(td);
  epochBody.appendChild(tr);
}

function paintCharts() {
  drawSeriesChart(reconCanvas, {
    label: 'recon / px',
    values: charts.recon,
    color: '#5b9bd5',
    yMin: 0,
    emptyMessage: 'No training run yet',
  });
  drawSeriesChart(klCanvas, {
    label: 'KL',
    values: charts.kl,
    color: '#f0a040',
    yMin: 0,
    emptyMessage: 'No training run yet',
  });
}

function syncButtons() {
  const busy = job !== null;
  startBtn.disabled = busy || !tfReady;
  runPerfBtn.disabled = busy || !tfReady;
  stopBtn.disabled = job !== 'train';
  stopPerfBtn.disabled = job !== 'perf';
  const canSample = !busy && !!model;
  generateBtn.disabled = !canSample;
  meansBtn.disabled = !canSample;
  walkBtn.disabled = !canSample;
  modelSelect.disabled = busy;
  backendSelect.disabled = busy;
  epochsInput.disabled = busy;
  batchInput.disabled = busy;
  lrInput.disabled = busy;
  classSelect.disabled = busy;
  countInput.disabled = busy;
}

function setStatus(text, kind) {
  const className = `status-line${kind ? ` ${kind}` : ''}`;
  trainStatus.textContent = text;
  trainStatus.className = className;
  dashStatus.textContent = text;
  dashStatus.className = className;
}

function setSampleStatus(text, kind) {
  sampleStatus.textContent = text;
  sampleStatus.className = `status-line${kind ? ` ${kind}` : ''}`;
}

function setPerfStatus(text, kind) {
  perfStatus.textContent = text;
  perfStatus.className = `status-line${kind ? ` ${kind}` : ''}`;
}

function formatLoss(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '—';
}

function formatRecon(value) {
  return Number.isFinite(value) ? (value / IMAGE_PIXELS).toFixed(3) : '—';
}

function formatKl(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}

function formatBeta(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}

function formatSps(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

function formatGens(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 100) return String(Math.round(value));
  return value.toFixed(1);
}

function formatGenMs(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 10000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function formatLr(value) {
  if (!Number.isFinite(value)) return '—';
  const text = value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return text || '0';
}

function trimError(message) {
  const text = String(message);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function errorText(error) {
  const message = (error && error.message) ? String(error.message) : 'Something went wrong.';
  return message.length > 220 ? `${message.slice(0, 220)}…` : message;
}

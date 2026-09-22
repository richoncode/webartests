import { detectCapabilities, mountCapabilityBanner } from '../shared/capabilities.js';
import { drawSeriesChart } from '../shared/metrics.js';
import { appendRun } from '../shared/runs.js';
import { initTabs } from '../shared/tabs.js';
import { activateBackend, backendChoiceLabel, getTf, loadTensorflow } from './backend.js';
import {
  attachDrawing,
  clearPreview,
  inkMass,
  paintPreview,
  predictScores,
  topClasses,
} from './infer.js';
import { loadSavedModel, presetLabel, saveModel } from './model.js';
import { trainMnist } from './train.js';

const banner = document.getElementById('cap-banner');
const backendNote = document.getElementById('backend-note');
const trainStatus = document.getElementById('train-status');
const dashStatus = document.getElementById('dash-status');
const drawStatus = document.getElementById('draw-status');
const modelSelect = document.getElementById('model');
const backendSelect = document.getElementById('backend');
const epochsInput = document.getElementById('epochs');
const batchInput = document.getElementById('batch');
const lrInput = document.getElementById('lr');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const stopBatchBtn = document.getElementById('stop-batch');
const runBatchBtn = document.getElementById('run-batch');
const predictBtn = document.getElementById('predict');
const clearBtn = document.getElementById('clear-draw');
const epochBody = document.getElementById('epoch-body');
const batchBody = document.getElementById('batch-body');
const statEpoch = document.getElementById('stat-epoch');
const statLoss = document.getElementById('stat-loss');
const statAcc = document.getElementById('stat-acc');
const statSps = document.getElementById('stat-sps');
const lossCanvas = document.getElementById('loss-chart');
const accCanvas = document.getElementById('acc-chart');
const top3 = document.getElementById('top3');
const preview = document.getElementById('preview');
const softmaxRoot = document.getElementById('softmax');

const charts = { loss: [], acc: [] };
const softmaxRows = buildSoftmax(softmaxRoot);
const drawing = attachDrawing(document.getElementById('draw-stage'));

const queue = [
  { model: 'tiny', backend: 'auto', epochs: 1, batchSize: 128, lr: 0.001, status: 'Queued', valAcc: null, actualBackend: null, tone: '' },
  { model: 'tiny', backend: 'auto', epochs: 1, batchSize: 128, lr: 0.01, status: 'Queued', valAcc: null, actualBackend: null, tone: '' },
  { model: 'small', backend: 'wasm', epochs: 1, batchSize: 64, lr: 0.001, status: 'Queued', valAcc: null, actualBackend: null, tone: '' },
];

let caps = null;
let active = null;
let model = null;
let job = null;
let stopFlag = false;
let tfReady = false;
let backendGeneration = 0;

initTabs(document, {
  onChange(id) {
    if (id === 'dashboard') paintCharts();
  },
});

document.getElementById('train-form').addEventListener('submit', (event) => {
  event.preventDefault();
});

clearPreview(preview);
renderQueue();
resetEpochTable();
paintCharts();
window.addEventListener('resize', paintCharts);

clearBtn.addEventListener('click', () => {
  drawing.clear();
  clearPreview(preview);
  resetSoftmax();
  setDrawStatus('Canvas cleared.');
});

predictBtn.addEventListener('click', () => {
  predict().catch((error) => {
    console.error(error);
    setDrawStatus(errorText(error), 'error');
  });
});

startBtn.addEventListener('click', () => {
  runJob('train', async () => {
    const config = readForm();
    await ensureBackend(config.backend);
    config.backendLabel = active.label;
    beginSession();
    setStatus(`Training ${presetLabel(config.model)} on ${active.label}…`);
    const result = await trainMnist(config, hooks());
    await finishResult(config, result);
  });
});

runBatchBtn.addEventListener('click', () => {
  runJob('batch', async () => {
    for (const item of queue) {
      item.status = 'Queued';
      item.valAcc = null;
      item.actualBackend = null;
      item.tone = '';
    }
    renderQueue();
    for (let i = 0; i < queue.length; i += 1) {
      if (stopFlag) {
        queue[i].status = 'Skipped';
        queue[i].tone = '';
        continue;
      }
      const item = queue[i];
      item.status = 'Running…';
      item.tone = 'status-running';
      renderQueue();
      try {
        await ensureBackend(item.backend);
        item.actualBackend = active.label;
        const config = {
          model: item.model,
          backend: item.backend,
          epochs: item.epochs,
          batchSize: item.batchSize,
          lr: item.lr,
          backendLabel: active.label,
        };
        beginSession();
        setStatus(`Batch ${i + 1}/${queue.length}: ${presetLabel(item.model)} · lr ${formatLr(item.lr)} · ${active.label}`);
        const result = await trainMnist(config, {
          ...hooks(),
          onEpoch(row) {
            recordEpoch(row);
            item.valAcc = row.acc;
            item.status = `Running · epoch ${row.epoch}/${row.epochs}`;
            renderQueue();
          },
        });
        await finishResult(config, result, { quiet: true });
        if (result.epochsRun > 0 && Number.isFinite(result.valAcc)) {
          item.valAcc = result.valAcc;
          item.status = `${result.stopped ? 'Stopped' : 'Done'} · ${formatAcc(result.valAcc)}`;
          item.tone = 'status-done';
        } else {
          item.status = 'Stopped';
          item.tone = '';
        }
      } catch (error) {
        console.error(error);
        item.status = `Failed · ${errorText(error)}`;
        item.tone = 'status-failed';
        setStatus(errorText(error), 'error');
      }
      renderQueue();
    }
    if (!stopFlag) {
      const done = queue.filter((item) => item.tone === 'status-done').length;
      setStatus(`Batch finished. ${done} of ${queue.length} configs completed.`, done ? 'ok' : '');
    }
    await ensureBackend(backendSelect.value);
    await adoptSavedModel();
  });
});

stopBtn.addEventListener('click', requestStop);
stopBatchBtn.addEventListener('click', requestStop);

backendSelect.addEventListener('change', () => {
  if (job || !tfReady) return;
  const generation = ++backendGeneration;
  backendSelect.disabled = true;
  ensureBackend(backendSelect.value)
    .then(async () => {
      if (generation !== backendGeneration) return;
      await adoptSavedModel();
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

  if (caps.preferredBackend && [...backendSelect.options].some((option) => option.value === 'auto')) {
    backendSelect.value = 'auto';
  }

  setStatus('Loading TensorFlow.js…');
  backendNote.textContent = 'Loading TensorFlow.js from the CDN…';
  try {
    await loadTensorflow();
    tfReady = true;
    active = await activateBackend(backendSelect.value, caps);
    applyActive(active);
    await adoptSavedModel();
    setStatus(model
      ? 'Saved weights loaded. Train again to replace them, or draw a digit.'
      : 'Ready. The first run downloads MNIST (about 11 MB) and caches it in this browser.');
  } catch (error) {
    console.error(error);
    setStatus(errorText(error), 'error');
    backendNote.textContent = 'TensorFlow.js did not start. Training stays disabled.';
  }
  syncButtons();
}

function hooks() {
  return {
    onDataProgress: onDataProgress,
    onBatch: onBatch,
    onEpoch: recordEpoch,
    shouldStop: () => stopFlag,
  };
}

function onDataProgress(info) {
  if (!info) return;
  if (info.phase === 'cache') setStatus('Loading MNIST from IndexedDB…');
  else if (info.phase === 'download') setStatus(`Downloading MNIST… ${info.label || ''}`.trim());
  else if (info.phase === 'decode') setStatus('Decoding the MNIST sprite…');
  else if (info.phase === 'extract') setStatus(`Preparing images… ${info.done.toLocaleString()} / ${info.total.toLocaleString()}`);
  else if (info.phase === 'cache-write') setStatus('Caching MNIST in IndexedDB…');
  else if (info.phase === 'tensors') setStatus('Building training tensors…');
}

function onBatch(info) {
  statEpoch.textContent = `${info.epoch} / ${info.epochs}`;
  statLoss.textContent = formatLoss(info.loss);
  statSps.textContent = formatSps(info.samplesPerSec);
  setStatus(`Epoch ${info.epoch}/${info.epochs} · batch ${info.batch}/${info.batches} · loss ${formatLoss(info.loss)} · ${formatSps(info.samplesPerSec)} samples/sec`);
}

function recordEpoch(row) {
  if (epochBody.querySelector('.empty')) epochBody.replaceChildren();
  charts.loss.push(row.loss);
  charts.acc.push(row.acc);
  const tr = document.createElement('tr');
  for (const text of [String(row.epoch), formatLoss(row.loss), formatAcc(row.acc), formatSps(row.samplesPerSec), row.backend]) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.appendChild(td);
  }
  epochBody.appendChild(tr);
  statEpoch.textContent = `${row.epoch} / ${row.epochs}`;
  statLoss.textContent = formatLoss(row.loss);
  statAcc.textContent = formatAcc(row.acc);
  statSps.textContent = formatSps(row.samplesPerSec);
  setStatus(`Epoch ${row.epoch}/${row.epochs} done · loss ${formatLoss(row.loss)} · val acc ${formatAcc(row.acc)} · ${row.seconds.toFixed(1)}s · ${formatSps(row.samplesPerSec)} samples/sec`);
  paintCharts();
}

async function finishResult(config, result, options = {}) {
  if (!result || result.epochsRun < 1 || !result.model) {
    setStatus('Stopped before the first epoch finished. No run saved.');
    return;
  }
  if (model && model !== result.model) model.dispose();
  model = result.model;
  syncButtons();
  const cacheNote = result.fromCache ? 'MNIST cache hit.' : 'MNIST cached in IndexedDB.';
  const saveNote = result.saveError ? ' Weight save failed — predict still works until you leave the page.' : ' Best checkpoint saved.';
  const lead = result.stopped ? `Stopped after ${result.epochsRun} epoch${result.epochsRun === 1 ? '' : 's'}` : `Finished ${result.epochsRun} epoch${result.epochsRun === 1 ? '' : 's'}`;
  if (!options.quiet) {
    setStatus(`${lead} · val acc ${formatAcc(result.valAcc)} · ${formatSps(result.samplesPerSec)} samples/sec · ${result.backend}. ${cacheNote}${saveNote}`, result.saveError ? 'error' : 'ok');
  }
  setDrawStatus('Checkpoint ready. Draw a white digit on the black pad and press Predict.');
  try {
    appendRun({
      id: `mnist-${Date.now()}`,
      name: `MNIST · ${result.presetName} · lr ${formatLr(config.lr)}`,
      demo: 'mnist',
      backend: result.backend,
      savedAt: new Date().toISOString(),
      accuracy: Number(result.valAcc.toFixed(4)),
      loss: Number(result.loss.toFixed(4)),
      epochs: result.epochsRun,
      batchSize: result.batchSize,
      learningRate: config.lr,
      model: result.preset,
      samplesPerSec: Math.round(result.samplesPerSec || 0),
      durationMs: Math.round(result.durationMs || 0),
      stopped: !!result.stopped,
    });
  } catch (error) {
    console.warn('Could not write run history', error);
    setStatus(`${lead}, but localStorage rejected the run record.`, 'error');
  }
}

async function ensureBackend(choice) {
  const sameAuto = choice === 'auto' && active && active.requested === 'auto';
  const sameExplicit = choice !== 'auto' && active && active.requested === choice && active.name === choice;
  if (sameAuto || sameExplicit) return;
  if (model) {
    try {
      await saveModel(model);
    } catch (error) {
      console.warn(error);
    }
    model.dispose();
    model = null;
    syncButtons();
  }
  const next = await activateBackend(choice, caps);
  applyActive(next);
}

async function adoptSavedModel() {
  if (model) {
    try {
      await saveModel(model);
    } catch (error) {
      console.warn(error);
    }
    model.dispose();
    model = null;
  }
  model = await loadSavedModel(getTf());
  if (model) setDrawStatus('Saved weights loaded. Draw a digit and press Predict.');
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
  backendNote.textContent = `Active backend: ${next.label}.${fallback} Training uses 10,000 images and 2,000 validation images from MNIST.`;
}

function readForm() {
  return readConfig({
    model: modelSelect.value,
    backend: backendSelect.value,
    epochs: Number(epochsInput.value),
    batchSize: Number(batchInput.value),
    lr: Number(lrInput.value),
  });
}

function readConfig(config) {
  const epochs = config.epochs;
  const batchSize = config.batchSize;
  const lr = config.lr;
  if (!Number.isInteger(epochs) || epochs < 1 || epochs > 30) {
    throw new Error('Epochs must be a whole number from 1 to 30.');
  }
  if (!Number.isInteger(batchSize) || batchSize < 16 || batchSize > 512) {
    throw new Error('Batch size must be a whole number from 16 to 512.');
  }
  if (!Number.isFinite(lr) || lr < 0.0001 || lr > 0.1) {
    throw new Error('Learning rate must be between 0.0001 and 0.1.');
  }
  return {
    model: config.model === 'small' ? 'small' : 'tiny',
    backend: config.backend || 'auto',
    epochs,
    batchSize,
    lr,
  };
}

function beginSession() {
  charts.loss = [];
  charts.acc = [];
  resetEpochTable();
  statEpoch.textContent = '—';
  statLoss.textContent = '—';
  statAcc.textContent = '—';
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
      setStatus(errorText(error), 'error');
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
  setStatus('Stopping after the current batch…');
}

async function predict() {
  if (!model) {
    setDrawStatus('Train a model, or reload a saved one, before predicting.', 'error');
    return;
  }
  const pixels = drawing.read();
  paintPreview(preview, pixels);
  if (inkMass(pixels) < 5) {
    resetSoftmax();
    setDrawStatus('Draw a digit first. Use a thick white stroke.', 'error');
    return;
  }
  predictBtn.disabled = true;
  try {
    const scores = await predictScores(getTf(), model, pixels);
    const ranked = topClasses(scores, 3);
    renderScores(scores, ranked[0] ? ranked[0].digit : 0);
    const summary = ranked.map((item) => `${item.digit} ${(item.p * 100).toFixed(1)}%`).join(' · ');
    top3.textContent = `Top 3: ${summary}`;
    const best = ranked[0];
    setDrawStatus(best ? `Predicted ${best.digit} · ${(best.p * 100).toFixed(1)}% confidence.` : 'No score returned.', 'ok');
  } finally {
    syncButtons();
  }
}

function renderScores(scores, best) {
  softmaxRows.forEach((row, digit) => {
    const value = scores[digit] || 0;
    row.bar.style.width = `${Math.max(0, Math.min(100, value * 100)).toFixed(1)}%`;
    row.score.textContent = value.toFixed(2);
    row.root.classList.toggle('best', digit === best);
  });
}

function resetSoftmax() {
  softmaxRows.forEach((row) => {
    row.bar.style.width = '0';
    row.score.textContent = '—';
    row.root.classList.remove('best');
  });
  top3.textContent = 'Top 3 shows up after Predict.';
}

function buildSoftmax(root) {
  const rows = [];
  for (let digit = 0; digit <= 9; digit += 1) {
    const row = document.createElement('div');
    row.className = 'softmax-row';
    const label = document.createElement('span');
    label.textContent = String(digit);
    const track = document.createElement('div');
    track.className = 'bar';
    const bar = document.createElement('span');
    track.appendChild(bar);
    const score = document.createElement('span');
    score.textContent = '—';
    row.append(label, track, score);
    root.appendChild(row);
    rows.push({ root: row, bar, score });
  }
  return rows;
}

function resetEpochTable() {
  epochBody.replaceChildren();
  const tr = document.createElement('tr');
  tr.className = 'empty';
  const td = document.createElement('td');
  td.colSpan = 5;
  td.textContent = 'No epochs yet.';
  tr.appendChild(td);
  epochBody.appendChild(tr);
}

function renderQueue() {
  batchBody.replaceChildren();
  for (const item of queue) {
    const tr = document.createElement('tr');
    const values = [
      item.actualBackend || backendChoiceLabel(item.backend),
      formatLr(item.lr),
      String(item.batchSize),
      String(item.epochs),
      presetLabel(item.model),
      item.valAcc == null ? '—' : formatAcc(item.valAcc),
    ];
    for (const text of values) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    }
    const status = document.createElement('td');
    status.textContent = item.status;
    if (item.tone) status.className = item.tone;
    tr.appendChild(status);
    batchBody.appendChild(tr);
  }
}

function paintCharts() {
  drawSeriesChart(lossCanvas, {
    label: 'loss',
    values: charts.loss,
    color: '#5b9bd5',
    yMin: 0,
  });
  drawSeriesChart(accCanvas, {
    label: 'accuracy',
    values: charts.acc,
    color: '#4caf50',
    yMin: 0,
    yMax: 1,
    percent: true,
  });
}

function syncButtons() {
  const busy = job !== null;
  startBtn.disabled = busy || !tfReady;
  runBatchBtn.disabled = busy || !tfReady;
  stopBtn.disabled = !busy;
  stopBatchBtn.disabled = !busy;
  predictBtn.disabled = busy || !model;
  modelSelect.disabled = busy;
  backendSelect.disabled = busy;
  epochsInput.disabled = busy;
  batchInput.disabled = busy;
  lrInput.disabled = busy;
}

function setStatus(text, kind) {
  const className = `status-line${kind ? ` ${kind}` : ''}`;
  trainStatus.textContent = text;
  trainStatus.className = className;
  dashStatus.textContent = text;
  dashStatus.className = className;
}

function setDrawStatus(text, kind) {
  drawStatus.textContent = text;
  drawStatus.className = `status-line${kind ? ` ${kind}` : ''}`;
}

function formatLoss(value) {
  return Number.isFinite(value) ? value.toFixed(4) : '—';
}

function formatAcc(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
}

function formatSps(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

function formatLr(value) {
  if (!Number.isFinite(value)) return '—';
  const text = value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return text || '0';
}

function errorText(error) {
  const message = (error && error.message) ? String(error.message) : 'Something went wrong.';
  return message.length > 220 ? `${message.slice(0, 220)}…` : message;
}

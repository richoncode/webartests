import { detectCapabilities, mountCapabilityBanner } from '../shared/capabilities.js';
import { drawSeriesChart } from '../shared/metrics.js';
import { appendRun } from '../shared/runs.js';
import { initTabs } from '../shared/tabs.js';
import {
  activateForModel,
  backendChoiceLabel,
  getTf,
  loadTensorflow,
  planBackend,
} from './backend.js';
import {
  CLASS_NAMES,
  IMAGE_PIXELS,
  TRAIN_COUNT,
  VAL_COUNT,
  loadFashion,
} from './data.js';
import { classMeans, generateBatch, latentWalk, paintGray } from './generate.js';
import {
  disposeFashionModel,
  getModelSpec,
  loadFashionModel,
  saveFashionModel,
} from './model.js';
import { loadPerf, protocolFor, runPerfSweep } from './perf.js';
import { trainFashion } from './train.js';

const VAE_HEAD = ['Epoch', 'Recon/px', 'KL', 'Total', 'β', 'Val total', 'Samples/sec', 'Backend'];
const GAN_HEAD = ['Epoch', 'D loss', 'G loss', '—', '—', '—', 'Samples/sec', 'Backend'];
const VAE_EPOCH_HINT = 'Recon is mean per-pixel binary cross-entropy on 256 training images, using the latent mean. KL is the same probe. Total is the training objective, recon summed over pixels plus β times KL. β warms from 0.05 to 1 across epochs (0.25 when you train a single epoch).';
const GAN_EPOCH_HINT = 'G and D are the epoch-mean adversarial losses (sigmoid cross-entropy from logits). D scores real images against fakes. G wants D to call fakes real. Adam uses β1 0.5. There is no KL term.';

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
const epochsHint = document.getElementById('epochs-hint');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const presetBtn = document.getElementById('best-known');
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
const realGrid = document.getElementById('real-grid');
const trustGrid = document.getElementById('trust-grid');
const samplesCallout = document.getElementById('samples-callout');
const meansHint = document.getElementById('means-hint');
const generatedHint = document.getElementById('generated-hint');
const epochHint = document.getElementById('epoch-hint');

const charts = { recon: [], kl: [], family: 'vae' };

let caps = null;
let active = null;
let model = null;
let dataset = null;
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

syncFamilyChrome();
syncProtocolNote();
resetEpochTable();
paintCharts();
renderPerf(loadPerf(modelSelect.value));
window.addEventListener('resize', paintCharts);

presetBtn.addEventListener('click', () => {
  applyPreset(modelSelect.value, true);
});

modelSelect.addEventListener('change', () => {
  if (job) return;
  applyPreset(modelSelect.value, false);
  const spec = currentSpec();
  if (charts.family !== spec.family) beginSession();
  syncFamilyChrome();
  syncProtocolNote();
  renderPerf(loadPerf(spec.id));
  if (!tfReady) {
    announceReady();
    return;
  }
  const generation = ++backendGeneration;
  syncButtons();
  ensureBackend(backendSelect.value)
    .then(async () => {
      if (generation !== backendGeneration) return;
      await adoptSavedModel();
      announceReady();
    })
    .catch((error) => {
      console.error(error);
      setStatus(errorText(error), 'error');
    })
    .finally(() => {
      if (generation === backendGeneration) syncButtons();
    });
});

startBtn.addEventListener('click', () => {
  runJob('train', async () => {
    const config = readForm();
    const spec = getModelSpec(config.model);
    const plan = await ensureBackend(config.backend);
    if (model) {
      disposeFashionModel(model);
      model = null;
      syncButtons();
    }
    config.backendLabel = active.label;
    beginSession();
    syncFamilyChrome();
    const wasmNote = plan && plan.redirected
      ? ` WASM cannot train this model (no Conv2D or Conv2DTranspose kernels), so this run is on ${active.label}.`
      : '';
    const compileNote = spec.convTrain ? ' The first batch compiles kernels.' : '';
    setStatus(`Training ${spec.label} on ${active.label}…${wasmNote}${compileNote}`);
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
    const spec = currentSpec();
    perfSaved.textContent = '';
    setPerfStatus(`Starting the ${spec.label} backend sweep…`);
    const payload = await runPerfSweep({
      model: spec.id,
      caps,
      shouldStop: () => stopFlag,
      onUpdate: renderPerf,
      onStatus: setPerfStatus,
    });
    renderPerf(payload);
    const done = payload.rows.filter((row) => row.status === 'done').length;
    if (stopFlag) setPerfStatus('Perf compare cancelled. Partial results are saved in this browser.', done ? 'ok' : '');
    else setPerfStatus(`Perf compare finished for ${spec.label}. ${done} backend${done === 1 ? '' : 's'} completed.`, done ? 'ok' : '');
    await ensureBackend(backendSelect.value);
    await adoptSavedModel();
  });
});

backendSelect.addEventListener('change', () => {
  if (job || !tfReady) {
    syncFamilyChrome();
    return;
  }
  const generation = ++backendGeneration;
  syncButtons();
  ensureBackend(backendSelect.value)
    .then(async () => {
      if (generation !== backendGeneration) return;
      await adoptSavedModel();
      announceReady();
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
    paintReal(data);
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
    await ensureBackend(backendSelect.value);
    await adoptSavedModel();
    const data = dataset || await dataPromise;
    const cacheNote = data && data.fromCache
      ? 'Fashion-MNIST is cached in this browser.'
      : 'The first train downloads Fashion-MNIST (about 4.4 MB) if it is not cached yet.';
    announceReady(cacheNote);
  } catch (error) {
    console.error(error);
    setStatus(errorText(error), 'error');
    backendNote.textContent = 'TensorFlow.js did not start. Training stays disabled.';
  }
  syncButtons();
}

function currentSpec() {
  return getModelSpec(modelSelect.value || 'cvae');
}

function applyPreset(id, announce) {
  const spec = getModelSpec(id);
  epochsInput.value = String(spec.preset.epochs);
  batchInput.value = String(spec.preset.batchSize);
  lrInput.value = String(spec.preset.lr);
  epochsHint.textContent = spec.recipe;
  if (announce) {
    setStatus(`Best-known settings for ${spec.label}: ${spec.preset.epochs} epochs, batch ${spec.preset.batchSize}, learning rate ${formatLr(spec.preset.lr)}.`);
  }
}

function syncFamilyChrome() {
  const spec = currentSpec();
  const gan = spec.family === 'gan';
  epochsHint.textContent = spec.recipe;
  document.getElementById('label-loss').textContent = gan ? 'G loss' : 'Total';
  document.getElementById('label-recon').textContent = gan ? 'D loss' : 'Recon / px';
  document.getElementById('label-kl').textContent = gan ? 'β1' : 'KL';
  document.getElementById('recon-title').textContent = gan ? 'Generator' : 'Reconstruction';
  document.getElementById('kl-title').textContent = gan ? 'Discriminator' : 'KL';
  epochHint.textContent = gan ? GAN_EPOCH_HINT : VAE_EPOCH_HINT;
  const heads = document.querySelectorAll('#epoch-table thead th');
  const labels = gan ? GAN_HEAD : VAE_HEAD;
  heads.forEach((th, index) => {
    th.textContent = labels[index] || '';
  });
  if (gan && !charts.recon.length) statKl.textContent = spec.beta1.toFixed(2);
  if (!charts.recon.length) charts.family = spec.family;
  if (samplesCallout) {
    samplesCallout.innerHTML = gan
      ? '<strong>Noise plus a class.</strong> cDCGAN samples are tanh images, drawn as grayscale. Tiles captioned Generated come from the generator. Tiles captioned Real are Fashion-MNIST photos. The labels stay put so a sharp sample is not mistaken for the dataset.'
      : '<strong>28×28 grayscale.</strong> Pick a clothing class, or random, and decode samples from the prior. Tiles captioned Generated come from the model. Tiles captioned Real are Fashion-MNIST photos. The conv VAE is sharper than the dense one, and both stay softer than the GAN.';
  }
  if (generatedHint) {
    generatedHint.textContent = gan
      ? 'A new noise vector plus the class. Every caption says Generated. These are not dataset photos.'
      : 'A new draw from the prior, conditioned on the class. Every caption says Generated. These are not dataset photos.';
  }
  if (meansHint) {
    meansHint.textContent = gan
      ? 'Decode the zero noise vector for every class. Captions say Zero code. These are generated, not photos.'
      : 'Decode z = 0 for every class. Captions say Zero code. These are generated prototypes, not photos.';
  }
  paintCharts();
}

function syncProtocolNote() {
  const spec = currentSpec();
  const protocol = protocolFor(spec.id);
  const skip = spec.convTrain ? ' WASM is skipped because it cannot train Conv2D or Conv2DTranspose.' : '';
  protocolNote.textContent = `Fixed protocol for ${spec.label}: ${protocol.epochs} epoch, ${protocol.trainSamples} images, batch ${protocol.batchSize}, learning rate ${formatLr(protocol.lr)}, then ${protocol.genCount} generated images timed after a ${protocol.warmupGens}-image warmup.${skip}`;
}

function announceReady(cacheNote) {
  const spec = currentSpec();
  if (spec.convTrain && backendSelect.value === 'wasm') {
    const where = active ? active.label : 'WebGL, WebGPU, or CPU';
    setStatus(`WASM cannot train ${spec.label}. TensorFlow.js has no Conv2D or Conv2DTranspose training kernels on WASM. Auto skips WASM. Start uses ${where}.`, 'error');
    return;
  }
  const loaded = model
    ? `Saved ${spec.label} weights loaded.`
    : `No saved ${spec.label} checkpoint yet.`;
  const extra = cacheNote ? ` ${cacheNote}` : '';
  setStatus(`${loaded} ${spec.recipe}${extra}`);
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
  else if (info.phase === 'tensors') setStatus(`Building ${currentSpec().label}…`);
}

function onBatch(info) {
  statEpoch.textContent = `${info.epoch} / ${info.epochs}`;
  statSps.textContent = formatSps(info.samplesPerSec);
  if (info.family === 'gan') {
    statLoss.textContent = formatLoss(info.gLoss);
    statRecon.textContent = formatLoss(info.dLoss);
    statKl.textContent = '0.50';
    setStatus(`Epoch ${info.epoch}/${info.epochs} · batch ${info.batch}/${info.batches} · G ${formatLoss(info.gLoss)} · D ${formatLoss(info.dLoss)} · ${formatSps(info.samplesPerSec)} samples/sec`);
    return;
  }
  statLoss.textContent = formatLoss(info.loss);
  setStatus(`Epoch ${info.epoch}/${info.epochs} · batch ${info.batch}/${info.batches} · total ${formatLoss(info.loss)} · β ${formatBeta(info.beta)} · ${formatSps(info.samplesPerSec)} samples/sec`);
}

function recordEpoch(row) {
  const gan = row.family === 'gan';
  charts.family = gan ? 'gan' : 'vae';
  if (epochBody.querySelector('.empty')) epochBody.replaceChildren();
  if (gan) {
    charts.recon.push(row.gLoss);
    charts.kl.push(row.dLoss);
  } else {
    charts.recon.push(row.recon / IMAGE_PIXELS);
    charts.kl.push(row.kl);
  }
  const tr = document.createElement('tr');
  const cells = gan
    ? [
      String(row.epoch),
      formatLoss(row.dLoss),
      formatLoss(row.gLoss),
      '—',
      '—',
      '—',
      formatSps(row.samplesPerSec),
      row.backend,
    ]
    : [
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
  statSps.textContent = formatSps(row.samplesPerSec);
  if (gan) {
    statLoss.textContent = formatLoss(row.gLoss);
    statRecon.textContent = formatLoss(row.dLoss);
    statKl.textContent = '0.50';
    setStatus(`Epoch ${row.epoch}/${row.epochs} done · G ${formatLoss(row.gLoss)} · D ${formatLoss(row.dLoss)} · ${row.seconds.toFixed(1)}s`);
  } else {
    statLoss.textContent = formatLoss(row.loss);
    statRecon.textContent = formatRecon(row.recon);
    statKl.textContent = formatKl(row.kl);
    setStatus(`Epoch ${row.epoch}/${row.epochs} done · recon/px ${formatRecon(row.recon)} · KL ${formatKl(row.kl)} · total ${formatLoss(row.loss)} · val ${formatLoss(row.valLoss)} · ${row.seconds.toFixed(1)}s`);
  }
  paintCharts();
}

async function finishResult(config, result) {
  if (!result || result.epochsRun < 1 || !result.model) {
    setStatus('Stopped before the first epoch finished. No run saved.');
    await restoreCheckpoint();
    return;
  }
  if (model && model !== result.model) disposeFashionModel(model);
  model = result.model;
  syncButtons();
  const cacheNote = result.fromCache ? ' Fashion-MNIST cache hit.' : ' Fashion-MNIST cached in IndexedDB.';
  const saveNote = result.saveError
    ? ' Weight save failed — generate still works until you leave the page.'
    : ' Best checkpoint saved.';
  const lead = result.stopped
    ? `Stopped after ${result.epochsRun} epoch${result.epochsRun === 1 ? '' : 's'}`
    : `Finished ${result.epochsRun} epoch${result.epochsRun === 1 ? '' : 's'}`;
  const summary = result.family === 'gan'
    ? `G ${formatLoss(result.gLoss)} · D ${formatLoss(result.dLoss)}`
    : `recon/px ${formatRecon(result.recon)} · KL ${formatKl(result.kl)}`;
  setStatus(`${lead} · ${result.presetName} · ${summary} · ${formatSps(result.samplesPerSec)} samples/sec · ${result.backend}.${cacheNote}${saveNote}`, result.saveError ? 'error' : 'ok');
  setSampleStatus('Checkpoint ready. Generate a class, or compare real and generated.');
  try {
    await showMeans();
    await showGenerated(null, 16);
    const quality = result.family === 'gan'
      ? `G ${formatLoss(result.gLoss)} · D ${formatLoss(result.dLoss)}`
      : `Recon/px ${formatRecon(result.recon)}`;
    setSampleStatus(`Generated 16 random-class samples. Real vs generated shows Trouser and Sneaker. ${quality}.`, 'ok');
  } catch (error) {
    console.error(error);
    setSampleStatus(`Training finished, but sampling failed. ${errorText(error)}`, 'error');
  }
  try {
    const run = {
      id: `fashion-${Date.now()}`,
      name: result.family === 'gan'
        ? `Fashion ${result.presetName} · G ${formatLoss(result.gLoss)}`
        : `Fashion ${result.presetName} · recon/px ${formatRecon(result.recon)}`,
      demo: 'fashion-gen',
      backend: result.backend,
      savedAt: new Date().toISOString(),
      loss: Number.isFinite(result.loss) ? Number(formatLoss(result.loss)) : null,
      epochs: result.epochsRun,
      batchSize: result.batchSize,
      learningRate: config.lr,
      model: result.modelId,
      samplesPerSec: Math.round(result.samplesPerSec || 0),
      durationMs: Math.round(result.durationMs || 0),
      stopped: !!result.stopped,
    };
    if (result.family === 'gan') {
      run.gLoss = Number(formatLoss(result.gLoss));
      run.dLoss = Number(formatLoss(result.dLoss));
    } else {
      run.recon = Number(formatRecon(result.recon));
      run.kl = Number(formatKl(result.kl));
    }
    appendRun(run);
  } catch (error) {
    console.warn('Could not write run history', error);
  }
}

async function restoreCheckpoint() {
  if (model) return;
  try {
    model = await loadFashionModel(getTf(), modelSelect.value || 'cvae');
  } catch (error) {
    console.warn(error);
  }
  syncButtons();
}

async function ensureBackend(choice) {
  const spec = currentSpec();
  const requested = choice || 'auto';
  const plan = planBackend(requested, spec, caps);
  const wasmBlocked = !!(spec.convTrain && active && active.name === 'wasm');
  const sameAuto = requested === 'auto' && active && active.requested === 'auto' && !wasmBlocked;
  const sameExplicit = requested !== 'auto' && active && !wasmBlocked && (
    plan.redirected
      ? active.redirectedFromWasm && active.name === plan.choice
      : active.requested === requested && active.name === requested
  );
  if (sameAuto || sameExplicit) {
    applyActive(active, plan);
    return plan;
  }
  if (model) {
    try {
      await saveFashionModel(model);
    } catch (error) {
      console.warn(error);
    }
    disposeFashionModel(model);
    model = null;
    syncButtons();
  }
  const next = await activateForModel(plan.choice, caps, spec);
  next.requested = requested;
  next.redirectedFromWasm = !!plan.redirected;
  if (plan.redirected) next.fellBack = true;
  applyActive(next, plan);
  return plan;
}

async function adoptSavedModel() {
  const id = modelSelect.value || 'cvae';
  if (model) {
    try {
      await saveFashionModel(model);
    } catch (error) {
      console.warn(error);
    }
    disposeFashionModel(model);
    model = null;
  }
  model = await loadFashionModel(getTf(), id);
  if (model) setSampleStatus(`Saved ${model.label} weights loaded. Generate a clothing class.`);
  syncButtons();
}

function applyActive(next, plan) {
  active = next;
  const spec = currentSpec();
  mountCapabilityBanner(banner, caps, {
    activeBackend: next.name,
    activeLabel: next.label,
    fellBack: next.fellBack,
    requestedLabel: backendChoiceLabel(next.requested),
  });
  const fallback = next.fellBack && !next.redirectedFromWasm
    ? ` ${backendChoiceLabel(next.requested)} did not start, so this is the fallback.`
    : '';
  const counts = `Training uses ${TRAIN_COUNT.toLocaleString()} images and ${VAL_COUNT.toLocaleString()} validation images.`;
  if (spec.convTrain) {
    const wasm = (plan && plan.redirected) || next.redirectedFromWasm
      ? ` WASM cannot train ${spec.label}. TensorFlow.js has no Conv2D or Conv2DTranspose training kernels on WASM, so this is ${next.label}.`
      : ' WASM cannot train Conv2D or Conv2DTranspose, so this model uses WebGL, WebGPU, or CPU. Auto skips WASM.';
    backendNote.textContent = `Active backend: ${next.label}.${fallback}${wasm} ${counts}`;
    return;
  }
  backendNote.textContent = `Active backend: ${next.label}.${fallback} The dense CVAE can train on WASM. ${counts}`;
}

function readForm() {
  const epochs = Number(epochsInput.value);
  const batchSize = Number(batchInput.value);
  const lr = Number(lrInput.value);
  const modelId = modelSelect.value || 'cvae';
  getModelSpec(modelId);
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
    model: modelId,
    epochs,
    batchSize,
    lr,
    backend: backendSelect.value || 'auto',
  };
}

function beginSession() {
  charts.recon = [];
  charts.kl = [];
  charts.family = currentSpec().family;
  resetEpochTable();
  statEpoch.textContent = '—';
  statLoss.textContent = '—';
  statRecon.textContent = '—';
  statKl.textContent = charts.family === 'gan' ? currentSpec().beta1.toFixed(2) : '—';
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
    .catch(async (error) => {
      console.error(error);
      if (kind === 'perf') setPerfStatus(errorText(error), 'error');
      else {
        setStatus(errorText(error), 'error');
        await restoreCheckpoint();
      }
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
  const batch = await generateBatch(getTf(), model, classIndex, count);
  renderGallery(sampleGrid, batch.classes.map((cls, index) => ({
    label: `Generated · ${CLASS_NAMES[cls]}`,
    tone: 'tag-gen',
    kind: 'gen',
    pixels: batch.pixels,
    offset: index * IMAGE_PIXELS,
    gain: 255,
    aria: `Generated ${CLASS_NAMES[cls]}`,
  })));
  await showTrust(classIndex);
  const name = classIndex == null ? 'random classes' : CLASS_NAMES[classIndex];
  setSampleStatus(`Generated ${count} image${count === 1 ? '' : 's'} · ${name}. Real tiles are the dataset; generated tiles are the model.`, 'ok');
}

async function showTrust(classIndex) {
  if (!dataset || !model) return;
  const classes = classIndex == null ? [1, 7] : [classIndex];
  const batch = await generateBatch(getTf(), model, null, classes.length, { classes });
  const tiles = [];
  classes.forEach((cls, index) => {
    const realIndex = dataset.labels.indexOf(cls);
    if (realIndex >= 0) {
      tiles.push({
        label: `Real · ${CLASS_NAMES[cls]}`,
        tone: 'tag-real',
        kind: 'real',
        pixels: dataset.images,
        offset: realIndex * IMAGE_PIXELS,
        gain: 1,
        aria: `Real Fashion-MNIST ${CLASS_NAMES[cls]}`,
      });
    }
    tiles.push({
      label: `Generated · ${CLASS_NAMES[cls]}`,
      tone: 'tag-gen',
      kind: 'gen',
      pixels: batch.pixels,
      offset: index * IMAGE_PIXELS,
      gain: 255,
      aria: `Generated ${CLASS_NAMES[cls]}`,
    });
  });
  renderGallery(trustGrid, tiles);
}

async function showMeans() {
  const batch = await classMeans(getTf(), model);
  renderGallery(meanGrid, batch.classes.map((cls, index) => ({
    label: `Zero code · ${CLASS_NAMES[cls]}`,
    tone: 'tag-gen',
    kind: 'gen',
    pixels: batch.pixels,
    offset: index * IMAGE_PIXELS,
    gain: 255,
    aria: `Generated zero-code ${CLASS_NAMES[cls]}`,
  })));
  const spec = currentSpec();
  setSampleStatus(spec.family === 'gan'
    ? 'Zero noise vector decoded for every class. These are generated, not photos.'
    : 'Class means decoded at z = 0. These are generated, not photos.', 'ok');
}

async function showWalk() {
  const picked = selectedClass();
  const walk = await latentWalk(getTf(), model, picked, 8);
  renderGallery(walkRow, walk.classes.map((cls, index) => ({
    label: index === 0 ? 'Generated start' : (index === walk.classes.length - 1 ? 'Generated end' : `Generated ${index}`),
    tone: 'tag-gen',
    kind: 'gen',
    pixels: walk.pixels,
    offset: index * IMAGE_PIXELS,
    gain: 255,
    aria: `Generated ${CLASS_NAMES[cls]} latent step ${index + 1}`,
  })));
  setSampleStatus(`Latent walk · generated ${CLASS_NAMES[walk.classIndex]}.`, 'ok');
}

function paintReal(data) {
  const tiles = [];
  for (let cls = 0; cls < CLASS_NAMES.length; cls += 1) {
    const index = data.labels.indexOf(cls);
    if (index < 0) continue;
    tiles.push({
      label: `Real · ${CLASS_NAMES[cls]}`,
      tone: 'tag-real',
      kind: 'real',
      pixels: data.images,
      offset: index * IMAGE_PIXELS,
      gain: 1,
      aria: `Real Fashion-MNIST ${CLASS_NAMES[cls]}`,
    });
  }
  renderGallery(realGrid, tiles);
}

function renderGallery(root, items) {
  root.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No images yet.';
    root.appendChild(empty);
    return;
  }
  for (const item of items) {
    const fig = document.createElement('figure');
    fig.className = 'sample-cell';
    if (item.kind) fig.classList.add(item.kind);
    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    canvas.setAttribute('aria-label', item.aria || item.label);
    paintGray(canvas, item.pixels, item.offset || 0, item.gain == null ? 255 : item.gain);
    const cap = document.createElement('figcaption');
    if (item.tone) cap.className = item.tone;
    cap.textContent = item.label;
    fig.append(canvas, cap);
    root.appendChild(fig);
  }
}

function renderPerf(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : (payload && Array.isArray(payload.rows) ? payload.rows : []);
  const savedAt = !Array.isArray(payload) && payload && payload.savedAt ? payload.savedAt : '';
  const modelLabel = !Array.isArray(payload) && payload && payload.modelLabel ? payload.modelLabel : '';
  const storageKey = !Array.isArray(payload) && payload && payload.storageKey ? payload.storageKey : '';
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
  if (savedAt) {
    const name = modelLabel ? `${modelLabel} · ` : '';
    perfSaved.textContent = `Last saved ${savedAt} · ${name}${storageKey || 'browser-ai.fashion-perf'}.`;
  }
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
  const gan = charts.family === 'gan';
  drawSeriesChart(reconCanvas, {
    label: gan ? 'G loss' : 'recon / px',
    values: charts.recon,
    color: '#5b9bd5',
    yMin: 0,
    emptyMessage: 'No training run yet',
  });
  drawSeriesChart(klCanvas, {
    label: gan ? 'D loss' : 'KL',
    values: charts.kl,
    color: '#f0a040',
    yMin: 0,
    emptyMessage: 'No training run yet',
  });
  reconCanvas.setAttribute('aria-label', gan ? 'Generator loss by epoch' : 'Reconstruction loss by epoch');
  klCanvas.setAttribute('aria-label', gan ? 'Discriminator loss by epoch' : 'KL divergence by epoch');
}

function syncButtons() {
  const busy = job !== null;
  startBtn.disabled = busy || !tfReady;
  runPerfBtn.disabled = busy || !tfReady;
  presetBtn.disabled = busy;
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
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 20) return value.toFixed(3);
  return value.toFixed(1);
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

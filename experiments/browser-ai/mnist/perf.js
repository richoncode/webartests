/**
 * Fixed-protocol train + infer timing across TF.js backends.
 * Always the tiny MLP so WASM (no Conv2D training kernel) stays in the table.
 * Does not write the Draw & Infer checkpoint.
 */

import { backendChoiceLabel, getTf, loadTensorflow, trySetBackend } from './backend.js';
import { IMAGE_PIXELS, loadMnist } from './data.js';
import { trainMnist } from './train.js';

export const PERF_STORAGE_KEY = 'browser-ai.mnist-perf';

export const PERF_BACKENDS = ['webgpu', 'wasm', 'webgl', 'cpu'];

export const PERF_PROTOCOL = {
  model: 'tiny',
  epochs: 1,
  trainCount: 512,
  valCount: 128,
  batchSize: 64,
  lr: 0.001,
  inferWarmup: 3,
  inferRepeats: 8,
  inferBatch: 32,
};

export function protocolSummary(protocol = PERF_PROTOCOL) {
  const p = protocol;
  return `Protocol: tiny MLP, ${p.epochs} epoch, ${Number(p.trainCount).toLocaleString()} train / ${Number(p.valCount).toLocaleString()} val images, batch ${p.batchSize}, Adam ${p.lr}. Inference: ${p.inferWarmup} warmups + ${p.inferRepeats} timed passes on a batch of ${p.inferBatch}. Infer ms is the median pass; infer/sec counts images. Train wall is that epoch, including its validation pass.`;
}

export function emptyPerfRows() {
  return PERF_BACKENDS.map((backend) => freshRow(backend, 'Not run'));
}

function freshRow(backend, notes) {
  return {
    backend,
    label: backendChoiceLabel(backend),
    available: null,
    running: false,
    trainWallS: null,
    samplesPerSec: null,
    valAcc: null,
    inferMsP50: null,
    inferPerSec: null,
    notes,
  };
}

function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function loadPerfResult(storage = globalThis.localStorage) {
  if (!storage) return null;
  let raw;
  try {
    raw = storage.getItem(PERF_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw == null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePerfResult(outcome, storage = globalThis.localStorage) {
  if (!storage) throw new Error('LocalStorage is unavailable');
  const payload = {
    v: 1,
    savedAt: new Date().toISOString(),
    protocol: PERF_PROTOCOL,
    cancelled: !!outcome.cancelled,
    rows: (outcome.rows || []).map((row) => ({
      backend: row.backend,
      label: row.label || backendChoiceLabel(row.backend),
      available: row.available === true ? true : (row.available === false ? false : null),
      trainWallS: finiteOrNull(row.trainWallS),
      samplesPerSec: finiteOrNull(row.samplesPerSec),
      valAcc: finiteOrNull(row.valAcc),
      inferMsP50: finiteOrNull(row.inferMsP50),
      inferPerSec: finiteOrNull(row.inferPerSec),
      notes: row.notes ? String(row.notes) : '',
    })),
  };
  storage.setItem(PERF_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

/** Probe result that means we should not spend time calling setBackend. */
export function backendSkipReason(name, caps) {
  if (name === 'webgpu') {
    if (!caps || !caps.webgpu) return 'WebGPU is not in this browser';
    if (!caps.webgpuAdapter) return 'No WebGPU adapter';
  }
  if (name === 'wasm' && (!caps || !caps.wasm)) return 'WebAssembly is not available';
  if (name === 'webgl' && (!caps || !caps.webgl)) return 'WebGL is not available';
  return null;
}

function shortError(error) {
  const message = error && error.message ? String(error.message) : 'Something went wrong';
  return message.length > 140 ? `${message.slice(0, 140)}…` : message;
}

function initFailureNote(name, error) {
  const message = shortError(error);
  const label = backendChoiceLabel(name);
  if (/timed out/i.test(message)) return `Timed out starting ${label}`;
  if (/refused to start/i.test(message)) return `${label} refused to start`;
  return message;
}

function dataStatus(info) {
  if (!info) return 'Loading MNIST for the compare…';
  if (info.phase === 'cache') return 'Loading MNIST from IndexedDB…';
  if (info.phase === 'download') return `Downloading MNIST… ${info.label || ''}`.trim();
  if (info.phase === 'decode') return 'Decoding the MNIST sprite…';
  if (info.phase === 'extract') return `Preparing images… ${info.done.toLocaleString()} / ${info.total.toLocaleString()}`;
  if (info.phase === 'cache-write') return 'Caching MNIST in IndexedDB…';
  return 'Loading MNIST for the compare…';
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function markCancelledFrom(rows, index) {
  for (let i = index; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.available == null && !Number.isFinite(row.trainWallS)) {
      row.running = false;
      row.notes = 'Cancelled';
    }
  }
}

async function yieldToBrowser() {
  const tf = getTf();
  await tf.nextFrame();
}

async function timeForwardPasses(model, images, protocol, hooks) {
  const tf = getTf();
  const total = Math.floor(images.length / IMAGE_PIXELS);
  const batch = Math.min(protocol.inferBatch, total);
  if (batch < 1) throw new Error('MNIST pool has no images to time.');

  const pixels = new Float32Array(batch * IMAGE_PIXELS);
  for (let i = 0; i < batch; i += 1) {
    const src = i * IMAGE_PIXELS;
    for (let p = 0; p < IMAGE_PIXELS; p += 1) pixels[src + p] = images[src + p] / 255;
  }
  const input = tf.tensor4d(pixels, [batch, 28, 28, 1]);
  const times = [];
  try {
    for (let i = 0; i < protocol.inferWarmup; i += 1) {
      if (hooks.shouldStop && hooks.shouldStop()) {
        return { cancelled: true, samples: 0, p50: null, perSec: null };
      }
      if (hooks.onWarmup) hooks.onWarmup(i + 1, protocol.inferWarmup);
      const output = model.predict(input);
      await output.data();
      output.dispose();
      await tf.nextFrame();
    }
    for (let i = 0; i < protocol.inferRepeats; i += 1) {
      if (hooks.shouldStop && hooks.shouldStop()) break;
      if (hooks.onTimed) hooks.onTimed(i + 1, protocol.inferRepeats);
      const started = performance.now();
      const output = model.predict(input);
      await output.data();
      times.push(performance.now() - started);
      output.dispose();
      await tf.nextFrame();
    }
  } finally {
    input.dispose();
  }

  if (!times.length) return { cancelled: true, samples: 0, p50: null, perSec: null };
  const p50 = median(times);
  return {
    cancelled: times.length < protocol.inferRepeats,
    samples: times.length,
    p50,
    perSec: p50 > 0 ? (batch * 1000) / p50 : null,
  };
}

function disposeTrained(trained) {
  if (!trained || !trained.model) return;
  try {
    trained.model.dispose();
  } catch (error) {
    console.warn(error);
  }
  trained.model = null;
}

/**
 * @param {{ caps: object, shouldStop?: () => boolean, onStatus?: (text: string) => void, onRow?: (rows: object[]) => void, onBackend?: (info: object) => void }} hooks
 * @returns {Promise<{ cancelled: boolean, rows: object[]|null }>}
 */
export async function runPerfSuite(hooks = {}) {
  await loadTensorflow();
  const stop = () => !!(hooks.shouldStop && hooks.shouldStop());
  if (hooks.onStatus) hooks.onStatus('Loading MNIST for the compare…');
  const data = await loadMnist((info) => {
    if (stop()) return;
    if (hooks.onStatus) hooks.onStatus(dataStatus(info));
  });
  if (stop()) return { cancelled: true, rows: null };

  const rows = PERF_BACKENDS.map((backend) => freshRow(backend, 'Waiting'));
  const emit = () => {
    if (hooks.onRow) hooks.onRow(rows);
  };
  emit();
  await yieldToBrowser();

  let cancelled = false;
  for (let i = 0; i < rows.length; i += 1) {
    if (stop()) {
      markCancelledFrom(rows, i);
      cancelled = true;
      emit();
      break;
    }

    const row = rows[i];
    const skip = backendSkipReason(row.backend, hooks.caps);
    if (skip) {
      row.available = false;
      row.running = false;
      row.notes = skip;
      emit();
      await yieldToBrowser();
      continue;
    }

    row.running = true;
    row.notes = 'Initializing…';
    emit();
    if (hooks.onStatus) hooks.onStatus(`${row.label} · initializing`);

    let active = null;
    try {
      active = await trySetBackend(row.backend);
    } catch (error) {
      console.warn(error);
      row.running = false;
      row.available = false;
      row.notes = initFailureNote(row.backend, error);
      emit();
      if (stop()) {
        markCancelledFrom(rows, i + 1);
        cancelled = true;
        break;
      }
      await yieldToBrowser();
      continue;
    }

    row.label = active.label;
    row.available = true;
    if (hooks.onBackend) hooks.onBackend(active);
    if (stop()) {
      row.running = false;
      row.notes = 'Cancelled';
      markCancelledFrom(rows, i + 1);
      cancelled = true;
      emit();
      break;
    }

    let trained = null;
    try {
      row.notes = 'Training…';
      emit();
      if (hooks.onStatus) hooks.onStatus(`${active.label} · training`);
      trained = await trainMnist({
        model: PERF_PROTOCOL.model,
        epochs: PERF_PROTOCOL.epochs,
        batchSize: PERF_PROTOCOL.batchSize,
        lr: PERF_PROTOCOL.lr,
        trainCount: PERF_PROTOCOL.trainCount,
        valCount: PERF_PROTOCOL.valCount,
        saveCheckpoint: false,
        splitSeed: 1,
        backendLabel: active.label,
      }, {
        onBatch(info) {
          row.notes = `Training · batch ${info.batch}/${info.batches}`;
          emit();
          if (hooks.onStatus) {
            hooks.onStatus(`${active.label} · training · batch ${info.batch}/${info.batches}`);
          }
        },
        shouldStop: stop,
      });

      if (!trained.model || trained.epochsRun < 1) {
        row.running = false;
        row.notes = stop() ? 'Cancelled during training' : 'Training stopped before an epoch finished';
        emit();
        if (stop()) {
          markCancelledFrom(rows, i + 1);
          cancelled = true;
          break;
        }
        continue;
      }

      row.trainWallS = trained.trainSeconds;
      row.samplesPerSec = trained.samplesPerSec;
      row.valAcc = trained.valAcc;
      row.notes = 'Inference…';
      emit();

      const infer = await timeForwardPasses(trained.model, data.images, PERF_PROTOCOL, {
        shouldStop: stop,
        onWarmup(step, total) {
          row.notes = `Inference · warmup ${step}/${total}`;
          emit();
          if (hooks.onStatus) hooks.onStatus(`${active.label} · inference warmup ${step}/${total}`);
        },
        onTimed(step, total) {
          row.notes = `Inference · ${step}/${total}`;
          emit();
          if (hooks.onStatus) hooks.onStatus(`${active.label} · inference ${step}/${total}`);
        },
      });

      row.running = false;
      if (infer.samples > 0) {
        row.inferMsP50 = infer.p50;
        row.inferPerSec = infer.perSec;
      }
      if (infer.cancelled || stop()) {
        row.notes = infer.samples
          ? `Cancelled · ${infer.samples}/${PERF_PROTOCOL.inferRepeats} timed passes`
          : 'Cancelled during inference';
        markCancelledFrom(rows, i + 1);
        cancelled = true;
        emit();
        break;
      }
      row.notes = '';
      emit();
    } catch (error) {
      console.error(error);
      row.running = false;
      if (row.available == null) row.available = true;
      const stage = Number.isFinite(row.trainWallS) ? 'Infer' : 'Train';
      row.notes = `${stage} failed · ${shortError(error)}`;
      emit();
    } finally {
      disposeTrained(trained);
      await yieldToBrowser();
    }
  }

  for (const row of rows) row.running = false;
  emit();
  return { cancelled, rows };
}

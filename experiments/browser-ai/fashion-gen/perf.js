/** Fixed short train + generate sweep across TensorFlow.js backends. */

import { activateBackend, backendAvailable, backendChoiceLabel, getTf } from './backend.js';
import { loadFashion } from './data.js';
import { timeGeneration } from './generate.js';
import { disposeVae } from './model.js';
import { trainFashion } from './train.js';

export const PERF_STORAGE_KEY = 'browser-ai.fashion-perf';

export const PERF_BACKENDS = ['webgpu', 'wasm', 'webgl', 'cpu'];

export const PERF_PROTOCOL = Object.freeze({
  epochs: 1,
  batchSize: 32,
  lr: 0.001,
  trainSamples: 256,
  valSamples: 64,
  genCount: 32,
  warmupGens: 4,
});

export function loadPerf(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PERF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePerf(payload, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(PERF_STORAGE_KEY, JSON.stringify(payload));
}

function blankRow(name) {
  return {
    backend: name,
    label: backendChoiceLabel(name),
    status: 'queued',
    statusText: 'Queued',
    trainMs: null,
    samplesPerSec: null,
    genMs: null,
    gensPerSec: null,
    loss: null,
    recon: null,
    kl: null,
    error: null,
  };
}

function cancelRest(rows, from) {
  for (let i = from; i < rows.length; i += 1) {
    if (rows[i].status === 'queued' || rows[i].status === 'running') {
      rows[i].status = 'cancelled';
      rows[i].statusText = 'Cancelled';
    }
  }
}

/**
 * @param {{ caps: object, shouldStop?: () => boolean, onUpdate?: (rows: object[]) => void, onStatus?: (text: string) => void }} options
 */
export async function runPerfSweep(options) {
  const { caps, shouldStop, onUpdate, onStatus } = options;
  const rows = PERF_BACKENDS.map(blankRow);
  const stop = () => !!(shouldStop && shouldStop());
  const publish = () => {
    if (onUpdate) onUpdate(rows);
  };
  publish();

  if (onStatus) onStatus('Loading Fashion-MNIST before the timed runs…');
  await loadFashion((info) => {
    if (!onStatus || !info) return;
    if (info.phase === 'cache') onStatus('Fashion-MNIST is already in IndexedDB.');
    else if (info.phase === 'download') onStatus(`Downloading Fashion-MNIST… ${info.label || ''}`.trim());
    else if (info.phase === 'decode') onStatus('Unpacking Fashion-MNIST…');
    else if (info.phase === 'cache-write') onStatus('Caching Fashion-MNIST in IndexedDB…');
  });
  if (stop()) {
    cancelRest(rows, 0);
    publish();
    return finish(rows);
  }

  for (let i = 0; i < rows.length; i += 1) {
    if (stop()) {
      cancelRest(rows, i);
      publish();
      break;
    }
    const row = rows[i];
    if (!backendAvailable(row.backend, caps)) {
      row.status = 'skipped';
      row.statusText = 'Skipped';
      publish();
      continue;
    }

    row.status = 'running';
    row.statusText = 'Starting…';
    publish();
    let vae = null;
    try {
      if (onStatus) onStatus(`Perf · ${row.label}: starting the backend…`);
      const active = await activateBackend(row.backend, caps);
      if (active.name !== row.backend) {
        row.status = 'failed';
        row.statusText = 'Unavailable';
        row.error = `${row.label} did not start`;
        publish();
        continue;
      }
      row.label = active.label;
      row.statusText = 'Training…';
      publish();
      if (onStatus) onStatus(`Perf · ${active.label}: training ${PERF_PROTOCOL.trainSamples} images…`);
      const result = await trainFashion({
        epochs: PERF_PROTOCOL.epochs,
        batchSize: PERF_PROTOCOL.batchSize,
        lr: PERF_PROTOCOL.lr,
        trainCount: PERF_PROTOCOL.trainSamples,
        valCount: PERF_PROTOCOL.valSamples,
        backendLabel: active.label,
        save: false,
      }, {
        shouldStop: stop,
        onBatch(info) {
          row.statusText = `Training · ${info.batch}/${info.batches}`;
          publish();
        },
      });
      vae = result.model;
      if (!vae || result.epochsRun < 1) {
        row.status = 'cancelled';
        row.statusText = 'Cancelled';
        publish();
        continue;
      }
      row.trainMs = result.durationMs;
      row.samplesPerSec = result.samplesPerSec;
      row.loss = result.loss;
      row.recon = result.recon;
      row.kl = result.kl;
      if (stop()) {
        row.status = 'cancelled';
        row.statusText = 'Cancelled';
        publish();
        continue;
      }
      row.statusText = 'Generating…';
      publish();
      if (onStatus) onStatus(`Perf · ${active.label}: timing ${PERF_PROTOCOL.genCount} generated images…`);
      const timed = await timeGeneration(getTf(), vae.decoder, PERF_PROTOCOL.genCount, PERF_PROTOCOL.warmupGens);
      row.genMs = timed.genMs;
      row.gensPerSec = timed.gensPerSec;
      row.status = 'done';
      row.statusText = 'Done';
    } catch (error) {
      console.error(error);
      row.status = 'failed';
      row.statusText = 'Failed';
      row.error = (error && error.message) ? String(error.message) : 'Backend run failed';
    } finally {
      disposeVae(vae);
    }
    publish();
    finish(rows);
  }

  return finish(rows);
}

function finish(rows) {
  const payload = {
    savedAt: new Date().toISOString(),
    protocol: { ...PERF_PROTOCOL },
    rows: rows.map((row) => ({ ...row })),
  };
  try {
    savePerf(payload);
  } catch (error) {
    console.warn('Could not store fashion perf results', error);
  }
  return payload;
}

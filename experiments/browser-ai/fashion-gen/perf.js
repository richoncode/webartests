/** Fixed short train + generate sweep for the model selected in the form. */

import { activateForModel, backendAvailable, backendChoiceLabel, getTf } from './backend.js';
import { loadFashion } from './data.js';
import { timeGeneration } from './generate.js';
import { disposeFashionModel, getModelSpec } from './model.js';
import { trainFashion } from './train.js';

export const PERF_STORAGE_KEY = 'browser-ai.fashion-perf';

export const PERF_BACKENDS = ['webgpu', 'wasm', 'webgl', 'cpu'];

export function perfStorageKey(modelId) {
  if (!modelId || modelId === 'cvae') return PERF_STORAGE_KEY;
  return `${PERF_STORAGE_KEY}.${modelId}`;
}

export function protocolFor(modelId) {
  const spec = getModelSpec(modelId || 'cvae');
  return Object.freeze({
    epochs: 1,
    batchSize: 32,
    lr: spec.preset.lr,
    trainSamples: 256,
    valSamples: 64,
    genCount: 32,
    warmupGens: 4,
    model: spec.id,
    modelLabel: spec.label,
    convTrain: spec.convTrain,
  });
}

export const PERF_PROTOCOL = protocolFor('cvae');

export function loadPerf(modelId = 'cvae', storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(perfStorageKey(modelId));
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
  storage.setItem(perfStorageKey(payload && payload.model), JSON.stringify(payload));
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
    gLoss: null,
    dLoss: null,
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
 * @param {{ model?: string, caps: object, shouldStop?: () => boolean, onUpdate?: (rows: object[]) => void, onStatus?: (text: string) => void }} options
 */
export async function runPerfSweep(options) {
  const { caps, shouldStop, onUpdate, onStatus } = options;
  const spec = getModelSpec(options.model || 'cvae');
  const protocol = protocolFor(spec.id);
  const rows = PERF_BACKENDS.map(blankRow);
  const stop = () => !!(shouldStop && shouldStop());
  const publish = () => {
    if (onUpdate) onUpdate(rows);
  };
  publish();

  if (onStatus) onStatus(`Loading Fashion-MNIST before the ${spec.label} timed runs…`);
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
    return finish(rows, spec, protocol);
  }

  for (let i = 0; i < rows.length; i += 1) {
    if (stop()) {
      cancelRest(rows, i);
      publish();
      break;
    }
    const row = rows[i];
    if (spec.convTrain && row.backend === 'wasm') {
      row.status = 'skipped';
      row.statusText = 'Skipped · no Conv2D train';
      publish();
      continue;
    }
    if (!backendAvailable(row.backend, caps)) {
      row.status = 'skipped';
      row.statusText = 'Skipped';
      publish();
      continue;
    }

    row.status = 'running';
    row.statusText = 'Starting…';
    publish();
    let trained = null;
    try {
      if (onStatus) onStatus(`Perf · ${spec.label} · ${row.label}: starting the backend…`);
      const active = await activateForModel(row.backend, caps, spec);
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
      if (onStatus) onStatus(`Perf · ${active.label}: training ${protocol.trainSamples} images…`);
      const result = await trainFashion({
        model: spec.id,
        epochs: protocol.epochs,
        batchSize: protocol.batchSize,
        lr: protocol.lr,
        trainCount: protocol.trainSamples,
        valCount: protocol.valSamples,
        backendLabel: active.label,
        save: false,
      }, {
        shouldStop: stop,
        onBatch(info) {
          row.statusText = `Training · ${info.batch}/${info.batches}`;
          publish();
        },
      });
      trained = result.model;
      if (!trained || result.epochsRun < 1) {
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
      row.gLoss = result.gLoss;
      row.dLoss = result.dLoss;
      if (stop()) {
        row.status = 'cancelled';
        row.statusText = 'Cancelled';
        publish();
        continue;
      }
      row.statusText = 'Generating…';
      publish();
      if (onStatus) onStatus(`Perf · ${active.label}: timing ${protocol.genCount} generated images…`);
      const timed = await timeGeneration(getTf(), trained, protocol.genCount, protocol.warmupGens);
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
      disposeFashionModel(trained);
    }
    publish();
    finish(rows, spec, protocol);
  }

  return finish(rows, spec, protocol);
}

function finish(rows, spec, protocol) {
  const payload = {
    savedAt: new Date().toISOString(),
    model: spec.id,
    modelLabel: spec.label,
    storageKey: perfStorageKey(spec.id),
    protocol: { ...protocol },
    rows: rows.map((row) => ({ ...row })),
  };
  try {
    savePerf(payload);
  } catch (error) {
    console.warn('Could not store fashion perf results', error);
  }
  return payload;
}

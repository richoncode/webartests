/** One MNIST training run: tiny MLP or small CNN, live epoch hooks, best checkpoint. */

import { IMAGE_PIXELS, TRAIN_COUNT, VAL_COUNT, loadMnist, splitPool } from './data.js';
import { createModel, presetLabel, saveModel } from './model.js';
import { getTf } from './backend.js';

function readLog(logs, names) {
  if (!logs) return null;
  for (const name of names) {
    const value = logs[name];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function tensorsFrom(tf, images, labels, indices) {
  const count = indices.length;
  const x = new Float32Array(count * IMAGE_PIXELS);
  const y = new Float32Array(count * 10);
  for (let i = 0; i < count; i += 1) {
    const index = indices[i];
    const src = index * IMAGE_PIXELS;
    const dst = i * IMAGE_PIXELS;
    for (let p = 0; p < IMAGE_PIXELS; p += 1) x[dst + p] = images[src + p] / 255;
    y[i * 10 + labels[index]] = 1;
  }
  return {
    xs: tf.tensor4d(x, [count, 28, 28, 1]),
    ys: tf.tensor2d(y, [count, 10]),
  };
}

function snapshotWeights(model) {
  return model.getWeights().map((weight) => weight.clone());
}

function disposeSnapshots(snapshots) {
  if (!snapshots) return;
  for (const weight of snapshots) weight.dispose();
}

/**
 * @param {{ epochs: number, batchSize: number, lr: number, model: string, backendLabel?: string }} config
 * @param {{ onDataProgress?: Function, onBatch?: Function, onEpoch?: Function, shouldStop?: Function }} hooks
 */
export async function trainMnist(config, hooks = {}) {
  const tf = getTf();
  const data = await loadMnist(hooks.onDataProgress);
  const split = splitPool(data.images.length / IMAGE_PIXELS, TRAIN_COUNT, VAL_COUNT, 1);
  if (hooks.onDataProgress) hooks.onDataProgress({ phase: 'tensors' });
  const trainT = tensorsFrom(tf, data.images, data.labels, split.train);
  const valT = tensorsFrom(tf, data.images, data.labels, split.val);
  const batchSize = Math.max(1, Math.min(config.batchSize, TRAIN_COUNT));
  const epochs = config.epochs;
  const started = performance.now();

  let model = createModel(tf, config.model);
  model.compile({
    optimizer: tf.train.adam(config.lr),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  let epochsRun = 0;
  let bestScore = -1;
  let bestSnapshots = null;
  let lastLoss = null;
  let lastAcc = null;
  let lastSps = 0;
  let saveError = null;
  let diverged = false;
  let epochT0 = performance.now();
  let currentEpoch = 0;
  const batches = Math.ceil(TRAIN_COUNT / batchSize);

  try {
    await model.fit(trainT.xs, trainT.ys, {
      epochs,
      batchSize,
      validationData: [valT.xs, valT.ys],
      shuffle: true,
      callbacks: {
        onEpochBegin(epoch) {
          currentEpoch = epoch;
          epochT0 = performance.now();
          if (hooks.shouldStop && hooks.shouldStop()) model.stopTraining = true;
        },
        async onBatchEnd(batch, logs) {
          const done = Math.min(TRAIN_COUNT, (batch + 1) * batchSize);
          const seconds = (performance.now() - epochT0) / 1000;
          const loss = readLog(logs, ['loss']);
          if (loss == null && logs && logs.loss != null && !Number.isFinite(logs.loss)) diverged = true;
          if (hooks.onBatch) {
            hooks.onBatch({
              epoch: currentEpoch + 1,
              epochs,
              batch: batch + 1,
              batches,
              loss,
              acc: readLog(logs, ['acc', 'accuracy']),
              samplesPerSec: seconds > 0 ? done / seconds : 0,
            });
          }
          if (diverged || (hooks.shouldStop && hooks.shouldStop())) model.stopTraining = true;
          await tf.nextFrame();
        },
        async onEpochEnd(epoch, logs) {
          const seconds = (performance.now() - epochT0) / 1000;
          const loss = readLog(logs, ['loss']);
          const trainAcc = readLog(logs, ['acc', 'accuracy']);
          const valAcc = readLog(logs, ['val_acc', 'val_accuracy']);
          const score = valAcc ?? trainAcc;
          if (loss == null || score == null) {
            diverged = true;
            model.stopTraining = true;
            return;
          }
          epochsRun += 1;
          lastLoss = loss;
          lastAcc = score;
          lastSps = seconds > 0 ? TRAIN_COUNT / seconds : 0;
          const row = {
            epoch: epoch + 1,
            epochs,
            loss,
            acc: score,
            samplesPerSec: lastSps,
            seconds,
            backend: config.backendLabel || tf.getBackend(),
          };
          if (hooks.onEpoch) hooks.onEpoch(row);
          if (score >= bestScore) {
            bestScore = score;
            disposeSnapshots(bestSnapshots);
            bestSnapshots = snapshotWeights(model);
            try {
              await saveModel(model);
            } catch (error) {
              saveError = error;
              console.warn('MNIST checkpoint save failed', error);
            }
          }
          if (hooks.shouldStop && hooks.shouldStop()) model.stopTraining = true;
          await tf.nextFrame();
        },
      },
    });
  } catch (error) {
    disposeSnapshots(bestSnapshots);
    model.dispose();
    model = null;
    throw error;
  } finally {
    tf.dispose([trainT.xs, trainT.ys, valT.xs, valT.ys]);
  }

  if (diverged && epochsRun === 0) {
    disposeSnapshots(bestSnapshots);
    if (model) model.dispose();
    throw new Error('Loss diverged (NaN). Lower the learning rate and train again.');
  }

  if (epochsRun === 0) {
    disposeSnapshots(bestSnapshots);
    if (model) model.dispose();
    return {
      model: null,
      epochsRun: 0,
      stopped: true,
      diverged: false,
      fromCache: data.fromCache,
      params: 0,
      preset: config.model,
      presetName: presetLabel(config.model),
      durationMs: performance.now() - started,
      saveError: null,
      valAcc: null,
      loss: null,
      samplesPerSec: 0,
      batchSize,
    };
  }

  if (bestSnapshots && model) {
    model.setWeights(bestSnapshots);
    disposeSnapshots(bestSnapshots);
  }

  return {
    model,
    epochsRun,
    stopped: !!(hooks.shouldStop && hooks.shouldStop()) || epochsRun < epochs,
    diverged,
    fromCache: data.fromCache,
    params: model.countParams(),
    preset: config.model,
    presetName: presetLabel(config.model),
    durationMs: performance.now() - started,
    saveError,
    valAcc: lastAcc,
    loss: lastLoss,
    samplesPerSec: lastSps,
    batchSize,
    backend: config.backendLabel || tf.getBackend(),
  };
}

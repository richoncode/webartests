/** Custom conditional-VAE loop. Reports recon (Bernoulli NLL) and KL. */

import { getTf } from './backend.js';
import {
  IMAGE_PIXELS,
  NUM_CLASSES,
  TRAIN_COUNT,
  VAL_COUNT,
  loadFashion,
  splitPool,
} from './data.js';
import { countParams, createVae, disposeVae, presetLabel, saveVae } from './model.js';

const PROBE = 256;
const EVAL_CHUNK = 128;

function mulberry32(seed) {
  let state = seed >>> 0;
  return function rand() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleIndices(indices, rand) {
  const idx = indices.slice();
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const swap = idx[i];
    idx[i] = idx[j];
    idx[j] = swap;
  }
  return idx;
}

/** Short runs keep a little KL; longer runs warm β from 0.05 up to 1. */
export function klBeta(epochIndex, epochs) {
  if (epochs <= 1) return 0.25;
  const t = epochIndex / (epochs - 1);
  return 0.05 + 0.95 * t;
}

function batchTensors(tf, data, indices) {
  const count = indices.length;
  const x = new Float32Array(count * IMAGE_PIXELS);
  const y = new Float32Array(count * NUM_CLASSES);
  for (let i = 0; i < count; i += 1) {
    const index = indices[i];
    const src = index * IMAGE_PIXELS;
    const dst = i * IMAGE_PIXELS;
    const label = data.labels[index];
    for (let p = 0; p < IMAGE_PIXELS; p += 1) x[dst + p] = data.images[src + p] / 255;
    if (label >= 0 && label < NUM_CLASSES) y[i * NUM_CLASSES + label] = 1;
  }
  return {
    xs: tf.tensor2d(x, [count, IMAGE_PIXELS]),
    ys: tf.tensor2d(y, [count, NUM_CLASSES]),
  };
}

/**
 * Bernoulli NLL summed over pixels, plus KL to the unit normal.
 * `sample` draws z with the reparameterization trick; eval uses the mean.
 * Total = recon + β · KL, averaged over the batch.
 */
function lossParts(tf, encoder, decoder, xs, ys, beta, sample) {
  const encoded = encoder.apply(tf.concat([xs, ys], 1));
  if (!Array.isArray(encoded)) {
    throw new Error('Encoder did not return mean and log-variance.');
  }
  const zMean = encoded[0];
  const zLogVar = encoded[1].clipByValue(-6, 2);
  const z = sample
    ? zMean.add(zLogVar.mul(0.5).exp().mul(tf.randomNormal(zMean.shape)))
    : zMean;
  const recon = decoder.apply(tf.concat([z, ys], 1));
  const p = recon.clipByValue(1e-6, 1 - 1e-6);
  const bce = xs.mul(p.log()).add(tf.sub(1, xs).mul(tf.sub(1, p).log())).neg();
  const reconPer = bce.sum(-1);
  const klPer = zLogVar.add(1).sub(zMean.square()).sub(zLogVar.exp()).sum(-1).mul(-0.5);
  return {
    total: reconPer.add(klPer.mul(beta)).mean(),
    recon: reconPer.mean(),
    kl: klPer.mean(),
  };
}

async function readPair(tf, encoder, decoder, xs, ys, beta) {
  const packed = tf.tidy(() => {
    const parts = lossParts(tf, encoder, decoder, xs, ys, beta, false);
    return tf.stack([parts.recon, parts.kl, parts.total]);
  });
  try {
    const data = await packed.data();
    return { recon: data[0], kl: data[1], total: data[2] };
  } finally {
    packed.dispose();
  }
}

async function evalIndices(tf, encoder, decoder, images, labels, indices, beta) {
  if (!indices.length) return { recon: 0, kl: 0, total: 0 };
  let reconSum = 0;
  let klSum = 0;
  let totalSum = 0;
  let seen = 0;
  for (let i = 0; i < indices.length; i += EVAL_CHUNK) {
    const slice = indices.slice(i, i + EVAL_CHUNK);
    const batch = batchTensors(tf, { images, labels }, slice);
    try {
      const metrics = await readPair(tf, encoder, decoder, batch.xs, batch.ys, beta);
      if (!Number.isFinite(metrics.total)) {
        throw new Error('Loss diverged (NaN). Lower the learning rate and train again.');
      }
      reconSum += metrics.recon * slice.length;
      klSum += metrics.kl * slice.length;
      totalSum += metrics.total * slice.length;
      seen += slice.length;
    } finally {
      tf.dispose([batch.xs, batch.ys]);
    }
    await tf.nextFrame();
  }
  return { recon: reconSum / seen, kl: klSum / seen, total: totalSum / seen };
}

function snapshot(vae) {
  return {
    encoder: vae.encoder.getWeights().map((weight) => weight.clone()),
    decoder: vae.decoder.getWeights().map((weight) => weight.clone()),
  };
}

function restore(vae, snap) {
  vae.encoder.setWeights(snap.encoder);
  vae.decoder.setWeights(snap.decoder);
}

function disposeSnap(snap) {
  if (!snap) return;
  for (const weight of snap.encoder) weight.dispose();
  for (const weight of snap.decoder) weight.dispose();
}

/**
 * @param {{ epochs: number, batchSize: number, lr: number, trainCount?: number, valCount?: number, backendLabel?: string, save?: boolean }} config
 * @param {{ onDataProgress?: Function, onBatch?: Function, onEpoch?: Function, shouldStop?: Function }} hooks
 */
export async function trainFashion(config, hooks = {}) {
  const tf = getTf();
  const data = await loadFashion(hooks.onDataProgress);
  const trainCount = Math.max(1, Math.min(config.trainCount || TRAIN_COUNT, TRAIN_COUNT));
  const valCount = Math.max(0, Math.min(config.valCount == null ? VAL_COUNT : config.valCount, VAL_COUNT));
  const split = splitPool(data.labels.length, TRAIN_COUNT, VAL_COUNT, 1);
  const trainIdx = split.train.slice(0, trainCount);
  const valIdx = split.val.slice(0, valCount);
  const probeIdx = trainIdx.slice(0, Math.min(PROBE, trainIdx.length));
  const batchSize = Math.max(1, Math.min(config.batchSize, trainIdx.length));
  const epochs = config.epochs;
  const save = config.save !== false;

  if (hooks.onDataProgress) hooks.onDataProgress({ phase: 'tensors' });
  const vae = createVae(tf);
  const vars = vae.encoder.trainableWeights.concat(vae.decoder.trainableWeights);
  if (!vars.length) {
    disposeVae(vae);
    throw new Error('The VAE has no trainable weights.');
  }
  const optimizer = tf.train.adam(config.lr);
  const started = performance.now();

  let epochsRun = 0;
  let samplesSeen = 0;
  let best = null;
  let bestScore = Infinity;
  let saveError = null;
  let last = null;

  try {
    for (let epoch = 0; epoch < epochs; epoch += 1) {
      if (hooks.shouldStop && hooks.shouldStop()) break;
      const beta = klBeta(epoch, epochs);
      const order = shuffleIndices(trainIdx, mulberry32(1 + epoch));
      const batches = Math.ceil(order.length / batchSize);
      const epochT0 = performance.now();
      let lossSum = 0;
      let lossN = 0;

      for (let b = 0; b < batches; b += 1) {
        if (hooks.shouldStop && hooks.shouldStop()) break;
        const slice = order.slice(b * batchSize, (b + 1) * batchSize);
        const batch = batchTensors(tf, data, slice);
        let lossT = null;
        try {
          lossT = optimizer.minimize(() => (
            lossParts(tf, vae.encoder, vae.decoder, batch.xs, batch.ys, beta, true).total
          ), true, vars);
          const loss = (await lossT.data())[0];
          if (!Number.isFinite(loss)) {
            throw new Error('Loss diverged (NaN). Lower the learning rate and train again.');
          }
          lossSum += loss * slice.length;
          lossN += slice.length;
          samplesSeen += slice.length;
          const seconds = (performance.now() - epochT0) / 1000;
          if (hooks.onBatch) {
            hooks.onBatch({
              epoch: epoch + 1,
              epochs,
              batch: b + 1,
              batches,
              loss,
              beta,
              samplesPerSec: seconds > 0 ? lossN / seconds : 0,
            });
          }
        } finally {
          if (lossT && !lossT.isDisposed) lossT.dispose();
          tf.dispose([batch.xs, batch.ys]);
        }
        await tf.nextFrame();
      }

      if (lossN === 0) break;
      const trainProbe = await evalIndices(tf, vae.encoder, vae.decoder, data.images, data.labels, probeIdx, beta);
      const valProbe = valIdx.length
        ? await evalIndices(tf, vae.encoder, vae.decoder, data.images, data.labels, valIdx, beta)
        : trainProbe;
      epochsRun += 1;
      const seconds = (performance.now() - epochT0) / 1000;
      last = {
        epoch: epoch + 1,
        epochs,
        loss: lossSum / lossN,
        recon: trainProbe.recon,
        kl: trainProbe.kl,
        valLoss: valProbe.total,
        valRecon: valProbe.recon,
        valKl: valProbe.kl,
        beta,
        samplesPerSec: seconds > 0 ? lossN / seconds : 0,
        seconds,
        backend: config.backendLabel || tf.getBackend(),
      };
      if (hooks.onEpoch) hooks.onEpoch(last);
      if (Number.isFinite(valProbe.total) && valProbe.total < bestScore) {
        bestScore = valProbe.total;
        disposeSnap(best);
        best = snapshot(vae);
        if (save) {
          try {
            await saveVae(vae);
          } catch (error) {
            saveError = error;
            console.warn('Fashion VAE checkpoint save failed', error);
          }
        }
      }
      await tf.nextFrame();
    }
  } catch (error) {
    disposeSnap(best);
    disposeVae(vae);
    throw error;
  } finally {
    optimizer.dispose();
  }

  const durationMs = performance.now() - started;
  if (epochsRun === 0 || !last) {
    disposeSnap(best);
    disposeVae(vae);
    return {
      model: null,
      epochsRun: 0,
      stopped: true,
      fromCache: data.fromCache,
      params: 0,
      presetName: presetLabel(),
      durationMs,
      saveError: null,
      loss: null,
      recon: null,
      kl: null,
      valLoss: null,
      valRecon: null,
      valKl: null,
      samplesPerSec: 0,
      samplesSeen: 0,
      batchSize,
      trainCount,
      backend: config.backendLabel || tf.getBackend(),
    };
  }

  if (best) {
    restore(vae, best);
    disposeSnap(best);
  }

  return {
    model: vae,
    epochsRun,
    stopped: !!(hooks.shouldStop && hooks.shouldStop()) || epochsRun < epochs,
    fromCache: data.fromCache,
    params: countParams(vae),
    presetName: presetLabel(),
    durationMs,
    saveError,
    loss: last.loss,
    recon: last.recon,
    kl: last.kl,
    valLoss: last.valLoss,
    valRecon: last.valRecon,
    valKl: last.valKl,
    beta: last.beta,
    samplesPerSec: durationMs > 0 ? samplesSeen / (durationMs / 1000) : 0,
    samplesSeen,
    batchSize,
    trainCount,
    backend: config.backendLabel || tf.getBackend(),
  };
}

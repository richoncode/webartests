/** Conditional VAE loop (recon + KL) and alternating cDCGAN steps (D then G). */

import { getTf } from './backend.js';
import {
  IMAGE_PIXELS,
  IMAGE_SIZE,
  NUM_CLASSES,
  TRAIN_COUNT,
  VAL_COUNT,
  loadFashion,
  splitPool,
} from './data.js';
import {
  countParams,
  createFashionModel,
  disposeFashionModel,
  getModelSpec,
  saveFashionModel,
} from './model.js';

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

function batchTensors(tf, data, indices, spec) {
  const count = indices.length;
  const x = new Float32Array(count * IMAGE_PIXELS);
  const y = new Float32Array(count * NUM_CLASSES);
  const tanh = spec.pixelRange === 'tanh';
  for (let i = 0; i < count; i += 1) {
    const index = indices[i];
    const src = index * IMAGE_PIXELS;
    const dst = i * IMAGE_PIXELS;
    const label = data.labels[index];
    for (let p = 0; p < IMAGE_PIXELS; p += 1) {
      const unit = data.images[src + p] / 255;
      x[dst + p] = tanh ? unit * 2 - 1 : unit;
    }
    if (label >= 0 && label < NUM_CLASSES) y[i * NUM_CLASSES + label] = 1;
  }
  const xs = spec.spatial
    ? tf.tensor4d(x, [count, IMAGE_SIZE, IMAGE_SIZE, 1])
    : tf.tensor2d(x, [count, IMAGE_PIXELS]);
  return { xs, ys: tf.tensor2d(y, [count, NUM_CLASSES]) };
}

function trainableVars(net) {
  return net.trainableWeights.map((weight) => weight.val || weight);
}

/**
 * Bernoulli NLL summed over pixels, plus KL to the unit normal.
 * `sample` draws z with the reparameterization trick; eval uses the mean.
 */
function lossParts(tf, model, xs, ys, beta, sample) {
  const encoded = model.encode(tf, xs, ys);
  if (!Array.isArray(encoded)) {
    throw new Error('Encoder did not return mean and log-variance.');
  }
  const zMean = encoded[0];
  const zLogVar = encoded[1].clipByValue(-6, 2);
  const z = sample
    ? zMean.add(zLogVar.mul(0.5).exp().mul(tf.randomNormal(zMean.shape)))
    : zMean;
  const recon = model.reconstruct(tf, z, ys, true);
  const flatX = xs.reshape([xs.shape[0], IMAGE_PIXELS]);
  const flatR = recon.reshape([recon.shape[0], IMAGE_PIXELS]);
  const p = flatR.clipByValue(1e-6, 1 - 1e-6);
  const bce = flatX.mul(p.log()).add(tf.sub(1, flatX).mul(tf.sub(1, p).log())).neg();
  const reconPer = bce.sum(-1);
  const klPer = zLogVar.add(1).sub(zMean.square()).sub(zLogVar.exp()).sum(-1).mul(-0.5);
  return {
    total: reconPer.add(klPer.mul(beta)).mean(),
    recon: reconPer.mean(),
    kl: klPer.mean(),
  };
}

async function readPair(tf, model, xs, ys, beta) {
  const packed = tf.tidy(() => {
    const parts = lossParts(tf, model, xs, ys, beta, false);
    return tf.stack([parts.recon, parts.kl, parts.total]);
  });
  try {
    const data = await packed.data();
    return { recon: data[0], kl: data[1], total: data[2] };
  } finally {
    packed.dispose();
  }
}

async function evalIndices(tf, model, images, labels, indices, beta) {
  if (!indices.length) return { recon: 0, kl: 0, total: 0 };
  let reconSum = 0;
  let klSum = 0;
  let totalSum = 0;
  let seen = 0;
  for (let i = 0; i < indices.length; i += EVAL_CHUNK) {
    const slice = indices.slice(i, i + EVAL_CHUNK);
    const batch = batchTensors(tf, { images, labels }, slice, model);
    try {
      const metrics = await readPair(tf, model, batch.xs, batch.ys, beta);
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

function snapshot(model) {
  const clone = (net) => net.getWeights().map((weight) => weight.clone());
  if (model.family === 'gan') {
    return {
      family: 'gan',
      generator: clone(model.generator),
      discriminator: clone(model.discriminator),
    };
  }
  return {
    family: 'vae',
    encoder: clone(model.encoder),
    decoder: clone(model.decoder),
  };
}

function restore(model, snap) {
  if (!snap) return;
  if (snap.family === 'gan') {
    model.generator.setWeights(snap.generator);
    model.discriminator.setWeights(snap.discriminator);
    return;
  }
  model.encoder.setWeights(snap.encoder);
  model.decoder.setWeights(snap.decoder);
}

function disposeSnap(snap) {
  if (!snap) return;
  const lists = snap.family === 'gan'
    ? [snap.generator, snap.discriminator]
    : [snap.encoder, snap.decoder];
  for (const list of lists) {
    if (!list) continue;
    for (const weight of list) weight.dispose();
  }
}

async function prepare(config, hooks) {
  const tf = getTf();
  const spec = getModelSpec(config.model || 'cvae');
  const data = await loadFashion(hooks.onDataProgress);
  const trainCount = Math.max(1, Math.min(config.trainCount || TRAIN_COUNT, TRAIN_COUNT));
  const valCount = Math.max(0, Math.min(config.valCount == null ? VAL_COUNT : config.valCount, VAL_COUNT));
  const split = splitPool(data.labels.length, TRAIN_COUNT, VAL_COUNT, 1);
  const trainIdx = split.train.slice(0, trainCount);
  const valIdx = split.val.slice(0, valCount);
  const probeIdx = trainIdx.slice(0, Math.min(PROBE, trainIdx.length));
  const batchSize = Math.max(1, Math.min(config.batchSize, trainIdx.length));
  return {
    tf,
    spec,
    data,
    trainIdx,
    valIdx,
    probeIdx,
    batchSize,
    epochs: config.epochs,
    save: config.save !== false,
    trainCount,
  };
}

function emptyResult(spec, extra) {
  return {
    model: null,
    modelId: spec.id,
    family: spec.family,
    epochsRun: 0,
    stopped: true,
    params: 0,
    presetName: spec.label,
    saveError: null,
    loss: null,
    recon: null,
    kl: null,
    gLoss: null,
    dLoss: null,
    valLoss: null,
    valRecon: null,
    valKl: null,
    samplesPerSec: 0,
    samplesSeen: 0,
    ...extra,
  };
}

async function trainVae(prep, config, hooks) {
  const { tf, spec, data, trainIdx, valIdx, probeIdx, batchSize, epochs, save, trainCount } = prep;
  if (hooks.onDataProgress) hooks.onDataProgress({ phase: 'tensors' });
  const model = createFashionModel(tf, spec.id);
  const vars = trainableVars(model.encoder).concat(trainableVars(model.decoder));
  if (!vars.length) {
    disposeFashionModel(model);
    throw new Error('The VAE has no trainable weights.');
  }
  const optimizer = tf.train.adam(config.lr, spec.beta1);
  const started = performance.now();
  let epochsRun = 0;
  let samplesSeen = 0;
  let best = null;
  let bestScore = Infinity;
  let saveError = null;
  let last = null;

  try {
    await tf.nextFrame();
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
        const batch = batchTensors(tf, data, slice, spec);
        let lossT = null;
        try {
          lossT = optimizer.minimize(() => (
            lossParts(tf, model, batch.xs, batch.ys, beta, true).total
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
              family: 'vae',
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
      const trainProbe = await evalIndices(tf, model, data.images, data.labels, probeIdx, beta);
      const valProbe = valIdx.length
        ? await evalIndices(tf, model, data.images, data.labels, valIdx, beta)
        : trainProbe;
      epochsRun += 1;
      const seconds = (performance.now() - epochT0) / 1000;
      last = {
        family: 'vae',
        modelId: spec.id,
        epoch: epoch + 1,
        epochs,
        loss: lossSum / lossN,
        recon: trainProbe.recon,
        kl: trainProbe.kl,
        gLoss: null,
        dLoss: null,
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
        best = snapshot(model);
        if (save) {
          try {
            await saveFashionModel(model);
          } catch (error) {
            saveError = error;
            console.warn('Fashion checkpoint save failed', error);
          }
        }
      }
      await tf.nextFrame();
    }
  } catch (error) {
    disposeSnap(best);
    disposeFashionModel(model);
    throw error;
  } finally {
    optimizer.dispose();
  }

  const durationMs = performance.now() - started;
  if (epochsRun === 0 || !last) {
    disposeSnap(best);
    disposeFashionModel(model);
    return emptyResult(spec, {
      fromCache: data.fromCache,
      durationMs,
      batchSize,
      trainCount,
      backend: config.backendLabel || tf.getBackend(),
    });
  }

  if (best) {
    restore(model, best);
    disposeSnap(best);
  }

  return {
    model,
    modelId: spec.id,
    family: 'vae',
    epochsRun,
    stopped: !!(hooks.shouldStop && hooks.shouldStop()) || epochsRun < epochs,
    fromCache: data.fromCache,
    params: countParams(model),
    presetName: spec.label,
    durationMs,
    saveError,
    loss: last.loss,
    recon: last.recon,
    kl: last.kl,
    gLoss: null,
    dLoss: null,
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

function ganLosses(tf, model, xs, ys) {
  const count = xs.shape[0];
  const fakes = tf.tidy(() => {
    const z = tf.randomNormal([count, model.latentDim]);
    return model.generator.apply([z, ys], { training: false });
  });
  return fakes;
}

async function trainGan(prep, config, hooks) {
  const { tf, spec, data, trainIdx, batchSize, epochs, save, trainCount } = prep;
  if (hooks.onDataProgress) hooks.onDataProgress({ phase: 'tensors' });
  const model = createFashionModel(tf, spec.id);
  const dVars = trainableVars(model.discriminator);
  const gVars = trainableVars(model.generator);
  if (!dVars.length || !gVars.length) {
    disposeFashionModel(model);
    throw new Error('The cDCGAN is missing trainable weights.');
  }
  const optimizerD = tf.train.adam(config.lr, spec.beta1);
  const optimizerG = tf.train.adam(config.lr, spec.beta1);
  const started = performance.now();
  let epochsRun = 0;
  let samplesSeen = 0;
  let best = null;
  let saveError = null;
  let last = null;

  try {
    await tf.nextFrame();
    for (let epoch = 0; epoch < epochs; epoch += 1) {
      if (hooks.shouldStop && hooks.shouldStop()) break;
      const order = shuffleIndices(trainIdx, mulberry32(1 + epoch));
      const batches = Math.ceil(order.length / batchSize);
      const epochT0 = performance.now();
      let dSum = 0;
      let gSum = 0;
      let lossN = 0;

      for (let b = 0; b < batches; b += 1) {
        if (hooks.shouldStop && hooks.shouldStop()) break;
        const slice = order.slice(b * batchSize, (b + 1) * batchSize);
        const batch = batchTensors(tf, data, slice, spec);
        let fakes = null;
        let dT = null;
        let gT = null;
        try {
          fakes = ganLosses(tf, model, batch.xs, batch.ys);
          dT = optimizerD.minimize(() => {
            const realLogits = model.discriminator.apply([batch.xs, batch.ys], { training: true });
            const fakeLogits = model.discriminator.apply([fakes, batch.ys], { training: true });
            const dReal = tf.losses.sigmoidCrossEntropy(tf.ones(realLogits.shape), realLogits);
            const dFake = tf.losses.sigmoidCrossEntropy(tf.zeros(fakeLogits.shape), fakeLogits);
            return dReal.add(dFake);
          }, true, dVars);
          const dLoss = (await dT.data())[0];
          if (!Number.isFinite(dLoss)) {
            throw new Error('Discriminator loss diverged (NaN). Keep Adam at 2e-4 with β1 0.5.');
          }

          gT = optimizerG.minimize(() => {
            const z = tf.randomNormal([batch.xs.shape[0], model.latentDim]);
            const fake = model.generator.apply([z, batch.ys], { training: true });
            const logits = model.discriminator.apply([fake, batch.ys], { training: true });
            return tf.losses.sigmoidCrossEntropy(tf.ones(logits.shape), logits);
          }, true, gVars);
          const gLoss = (await gT.data())[0];
          if (!Number.isFinite(gLoss)) {
            throw new Error('Generator loss diverged (NaN). Keep Adam at 2e-4 with β1 0.5.');
          }

          dSum += dLoss * slice.length;
          gSum += gLoss * slice.length;
          lossN += slice.length;
          samplesSeen += slice.length;
          const seconds = (performance.now() - epochT0) / 1000;
          if (hooks.onBatch) {
            hooks.onBatch({
              family: 'gan',
              epoch: epoch + 1,
              epochs,
              batch: b + 1,
              batches,
              loss: gLoss,
              gLoss,
              dLoss,
              beta: spec.beta1,
              samplesPerSec: seconds > 0 ? lossN / seconds : 0,
            });
          }
        } finally {
          if (dT && !dT.isDisposed) dT.dispose();
          if (gT && !gT.isDisposed) gT.dispose();
          if (fakes) fakes.dispose();
          tf.dispose([batch.xs, batch.ys]);
        }
        await tf.nextFrame();
      }

      if (lossN === 0) break;
      epochsRun += 1;
      const seconds = (performance.now() - epochT0) / 1000;
      last = {
        family: 'gan',
        modelId: spec.id,
        epoch: epoch + 1,
        epochs,
        loss: gSum / lossN,
        recon: null,
        kl: null,
        gLoss: gSum / lossN,
        dLoss: dSum / lossN,
        valLoss: null,
        valRecon: null,
        valKl: null,
        beta: spec.beta1,
        samplesPerSec: seconds > 0 ? lossN / seconds : 0,
        seconds,
        backend: config.backendLabel || tf.getBackend(),
      };
      if (hooks.onEpoch) hooks.onEpoch(last);
      disposeSnap(best);
      best = snapshot(model);
      if (save) {
        try {
          await saveFashionModel(model);
        } catch (error) {
          saveError = error;
          console.warn('Fashion cDCGAN checkpoint save failed', error);
        }
      }
      await tf.nextFrame();
    }
  } catch (error) {
    disposeSnap(best);
    disposeFashionModel(model);
    throw error;
  } finally {
    optimizerD.dispose();
    optimizerG.dispose();
  }

  const durationMs = performance.now() - started;
  if (epochsRun === 0 || !last) {
    disposeSnap(best);
    disposeFashionModel(model);
    return emptyResult(spec, {
      fromCache: data.fromCache,
      durationMs,
      batchSize,
      trainCount,
      backend: config.backendLabel || tf.getBackend(),
    });
  }

  if (best) {
    restore(model, best);
    disposeSnap(best);
  }

  return {
    model,
    modelId: spec.id,
    family: 'gan',
    epochsRun,
    stopped: !!(hooks.shouldStop && hooks.shouldStop()) || epochsRun < epochs,
    fromCache: data.fromCache,
    params: countParams(model),
    presetName: spec.label,
    durationMs,
    saveError,
    loss: last.loss,
    recon: null,
    kl: null,
    gLoss: last.gLoss,
    dLoss: last.dLoss,
    valLoss: null,
    valRecon: null,
    valKl: null,
    beta: last.beta,
    samplesPerSec: durationMs > 0 ? samplesSeen / (durationMs / 1000) : 0,
    samplesSeen,
    batchSize,
    trainCount,
    backend: config.backendLabel || tf.getBackend(),
  };
}

/**
 * @param {{ model?: string, epochs: number, batchSize: number, lr: number, trainCount?: number, valCount?: number, backendLabel?: string, save?: boolean }} config
 * @param {{ onDataProgress?: Function, onBatch?: Function, onEpoch?: Function, shouldStop?: Function }} hooks
 */
export async function trainFashion(config, hooks = {}) {
  const prep = await prepare(config, hooks);
  if (prep.spec.family === 'gan') return trainGan(prep, config, hooks);
  return trainVae(prep, config, hooks);
}

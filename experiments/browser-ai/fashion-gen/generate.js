/** Class-conditional samples for the dense CVAE, conv CVAE, and cDCGAN. */

import { IMAGE_PIXELS, NUM_CLASSES } from './data.js';

const SIZE = 28;

function oneHot(tf, classes) {
  return tf.oneHot(tf.tensor1d(classes, 'int32'), NUM_CLASSES);
}

function toUnit(tf, model, raw) {
  const scaled = model.pixelRange === 'tanh' ? raw.add(1).mul(0.5) : raw;
  return scaled.clipByValue(0, 1).reshape([scaled.shape[0], IMAGE_PIXELS]);
}

async function readRecon(recon) {
  try {
    return new Float32Array(await recon.data());
  } finally {
    recon.dispose();
  }
}

function decodeClasses(tf, model, z, classes) {
  const y = oneHot(tf, classes);
  return toUnit(tf, model, model.reconstruct(tf, z, y, false));
}

/**
 * @param {number|null} classIndex null draws a random class per image
 * @param {{ classes?: number[] }} [options] explicit class list, one image each
 * @returns {Promise<{ pixels: Float32Array, classes: number[] }>}
 */
export async function generateBatch(tf, model, classIndex, count, options) {
  const explicit = options && Array.isArray(options.classes) ? options.classes : null;
  const classes = explicit ? explicit.map((cls) => cls | 0) : new Array(count);
  if (!explicit) {
    for (let i = 0; i < count; i += 1) {
      classes[i] = classIndex == null ? (Math.random() * NUM_CLASSES) | 0 : classIndex | 0;
    }
  }
  if (!classes.length) throw new Error('Generate at least one image.');
  const recon = tf.tidy(() => {
    const z = tf.randomNormal([classes.length, model.latentDim]);
    return decodeClasses(tf, model, z, classes);
  });
  const pixels = await readRecon(recon);
  return { pixels, classes };
}

/** Class prototype: decode the zero code once per clothing class. */
export async function classMeans(tf, model) {
  const classes = Array.from({ length: NUM_CLASSES }, (_, i) => i);
  const recon = tf.tidy(() => {
    const z = tf.zeros([NUM_CLASSES, model.latentDim]);
    return decodeClasses(tf, model, z, classes);
  });
  const pixels = await readRecon(recon);
  return { pixels, classes };
}

/** Linear walk between two prior samples, conditioned on one class. */
export async function latentWalk(tf, model, classIndex, steps = 8) {
  const cls = classIndex == null ? (Math.random() * NUM_CLASSES) | 0 : classIndex | 0;
  const classes = new Array(steps).fill(cls);
  const recon = tf.tidy(() => {
    const z0 = tf.randomNormal([1, model.latentDim]);
    const z1 = tf.randomNormal([1, model.latentDim]);
    const rows = [];
    for (let s = 0; s < steps; s += 1) {
      const t = steps === 1 ? 0 : s / (steps - 1);
      rows.push(z0.mul(1 - t).add(z1.mul(t)));
    }
    const z = tf.concat(rows, 0);
    return decodeClasses(tf, model, z, classes);
  });
  const pixels = await readRecon(recon);
  return { pixels, classes, classIndex: cls };
}

/**
 * Timed decode throughput. Warmup compiles the backend, then `count`
 * images are generated and discarded.
 */
export async function timeGeneration(tf, model, count, warmup = 0) {
  if (warmup > 0) await generateBatch(tf, model, 0, warmup);
  const started = performance.now();
  await generateBatch(tf, model, null, count);
  const totalMs = performance.now() - started;
  const seconds = totalMs / 1000;
  return {
    totalMs,
    genMs: count > 0 ? totalMs / count : 0,
    gensPerSec: seconds > 0 ? count / seconds : 0,
  };
}

/** Paint one 28×28 grayscale image. `gain` maps stored values onto 0–255. */
export function paintGray(canvas, pixels, offset = 0, gain = 255) {
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < IMAGE_PIXELS; i += 1) {
    const value = Math.max(0, Math.min(255, Math.round((pixels[offset + i] || 0) * gain)));
    const o = i * 4;
    image.data[o] = value;
    image.data[o + 1] = value;
    image.data[o + 2] = value;
    image.data[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

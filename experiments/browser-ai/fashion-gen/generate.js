/** Decode clothing samples from the conditional VAE prior. */

import { IMAGE_PIXELS, NUM_CLASSES } from './data.js';
import { LATENT_DIM } from './model.js';

const SIZE = 28;

function oneHot(tf, classes) {
  return tf.oneHot(tf.tensor1d(classes, 'int32'), NUM_CLASSES);
}

async function readRecon(recon) {
  try {
    return new Float32Array(await recon.data());
  } finally {
    recon.dispose();
  }
}

/**
 * @param {number|null} classIndex null draws a random class per image
 * @returns {Promise<{ pixels: Float32Array, classes: number[] }>}
 */
export async function generateBatch(tf, decoder, classIndex, count) {
  const classes = new Array(count);
  for (let i = 0; i < count; i += 1) {
    classes[i] = classIndex == null ? (Math.random() * NUM_CLASSES) | 0 : classIndex | 0;
  }
  const recon = tf.tidy(() => {
    const z = tf.randomNormal([count, LATENT_DIM]);
    const y = oneHot(tf, classes);
    return decoder.apply(tf.concat([z, y], 1));
  });
  const pixels = await readRecon(recon);
  return { pixels, classes };
}

/** Class prototype: decode the zero vector once per clothing class. */
export async function classMeans(tf, decoder) {
  const classes = Array.from({ length: NUM_CLASSES }, (_, i) => i);
  const recon = tf.tidy(() => {
    const z = tf.zeros([NUM_CLASSES, LATENT_DIM]);
    const y = oneHot(tf, classes);
    return decoder.apply(tf.concat([z, y], 1));
  });
  const pixels = await readRecon(recon);
  return { pixels, classes };
}

/** Linear walk between two prior samples, conditioned on one class. */
export async function latentWalk(tf, decoder, classIndex, steps = 8) {
  const cls = classIndex == null ? (Math.random() * NUM_CLASSES) | 0 : classIndex | 0;
  const classes = new Array(steps).fill(cls);
  const recon = tf.tidy(() => {
    const z0 = tf.randomNormal([1, LATENT_DIM]);
    const z1 = tf.randomNormal([1, LATENT_DIM]);
    const rows = [];
    for (let s = 0; s < steps; s += 1) {
      const t = steps === 1 ? 0 : s / (steps - 1);
      rows.push(z0.mul(1 - t).add(z1.mul(t)));
    }
    const z = tf.concat(rows, 0);
    const y = oneHot(tf, classes);
    return decoder.apply(tf.concat([z, y], 1));
  });
  const pixels = await readRecon(recon);
  return { pixels, classes, classIndex: cls };
}

/**
 * Timed decode throughput. Warmup compiles the backend, then `count`
 * images are generated and discarded.
 */
export async function timeGeneration(tf, decoder, count, warmup = 0) {
  if (warmup > 0) await generateBatch(tf, decoder, 0, warmup);
  const started = performance.now();
  await generateBatch(tf, decoder, null, count);
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

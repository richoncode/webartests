/**
 * Tiny conditional VAE for 28×28 Fashion-MNIST.
 * Dense layers only, so TensorFlow.js WASM can train it (that backend has
 * no Conv2D training kernels). The class is a 10-way one-hot concatenated
 * with the pixels (encoder) and with z (decoder).
 */

import { IMAGE_PIXELS, NUM_CLASSES } from './data.js';

export const LATENT_DIM = 8;
export const HIDDEN_UNITS = 64;

export const ENCODER_URL = 'indexeddb://browser-ai-fashion-cvae-h64-z8-enc';
export const DECODER_URL = 'indexeddb://browser-ai-fashion-cvae-h64-z8-dec';

export function presetLabel() {
  return 'Tiny conditional VAE';
}

export function createVae(tf) {
  const encIn = tf.input({ shape: [IMAGE_PIXELS + NUM_CLASSES], name: 'encoder_input' });
  const encHidden = tf.layers.dense({
    units: HIDDEN_UNITS,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
    name: 'enc_hidden',
  }).apply(encIn);
  const zMean = tf.layers.dense({
    units: LATENT_DIM,
    kernelInitializer: 'glorotUniform',
    name: 'z_mean',
  }).apply(encHidden);
  const zLogVar = tf.layers.dense({
    units: LATENT_DIM,
    kernelInitializer: 'glorotUniform',
    name: 'z_logvar',
  }).apply(encHidden);
  const encoder = tf.model({ inputs: encIn, outputs: [zMean, zLogVar], name: 'fashion_encoder' });

  const decIn = tf.input({ shape: [LATENT_DIM + NUM_CLASSES], name: 'decoder_input' });
  const decHidden = tf.layers.dense({
    units: HIDDEN_UNITS,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
    name: 'dec_hidden',
  }).apply(decIn);
  const recon = tf.layers.dense({
    units: IMAGE_PIXELS,
    activation: 'sigmoid',
    kernelInitializer: 'glorotUniform',
    name: 'dec_out',
  }).apply(decHidden);
  const decoder = tf.model({ inputs: decIn, outputs: recon, name: 'fashion_decoder' });

  return { encoder, decoder };
}

export function countParams(vae) {
  if (!vae) return 0;
  return vae.encoder.countParams() + vae.decoder.countParams();
}

export function disposeVae(vae) {
  if (!vae) return;
  if (vae.encoder) vae.encoder.dispose();
  if (vae.decoder) vae.decoder.dispose();
}

function outputWidth(model) {
  const shape = model && model.inputs && model.inputs[0] && model.inputs[0].shape;
  if (!shape) return null;
  return shape[shape.length - 1];
}

export async function loadVae(tf) {
  let encoder = null;
  let decoder = null;
  try {
    encoder = await tf.loadLayersModel(ENCODER_URL);
    decoder = await tf.loadLayersModel(DECODER_URL);
  } catch (error) {
    disposeVae({ encoder, decoder });
    const message = String((error && error.message) || error);
    if (!/cannot find model/i.test(message)) {
      console.warn('Saved Fashion VAE could not be loaded', error);
    }
    return null;
  }
  const encWidth = outputWidth(encoder);
  const decWidth = outputWidth(decoder);
  if (encWidth !== IMAGE_PIXELS + NUM_CLASSES || decWidth !== LATENT_DIM + NUM_CLASSES) {
    disposeVae({ encoder, decoder });
    return null;
  }
  return { encoder, decoder };
}

export async function saveVae(vae) {
  await vae.encoder.save(ENCODER_URL);
  await vae.decoder.save(DECODER_URL);
}

/**
 * Conditional VAE for 28×28 Fashion-MNIST.
 * Dense layers only, so TensorFlow.js WASM can train it (that backend has
 * no Conv2D training kernels).
 *
 * Class conditioning is a learned embedding, not a raw one-hot dropped in
 * once. The one-hot is projected to EMBED_DIM and concatenated into every
 * encoder and decoder stage, including the pixel logits. A zero-initialized
 * class template adds a direct one-hot path onto those logits so the class
 * signal cannot be washed out by z.
 */

import { IMAGE_PIXELS, NUM_CLASSES } from './data.js';

export const LATENT_DIM = 16;
export const EMBED_DIM = 16;
export const HIDDEN_UNITS = 128;

export const ENCODER_URL = 'indexeddb://browser-ai-fashion-cvae-e16-h128-z16-enc';
export const DECODER_URL = 'indexeddb://browser-ai-fashion-cvae-e16-h128-z16-dec';

export function presetLabel() {
  return 'Class-embedding CVAE';
}

function relu(tf, units, name) {
  return tf.layers.dense({
    units,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
    name,
  });
}

function linear(tf, units, name) {
  return tf.layers.dense({
    units,
    kernelInitializer: 'glorotUniform',
    name,
  });
}

function cat(tf, name, tensors) {
  return tf.layers.concatenate({ axis: -1, name }).apply(tensors);
}

export function createVae(tf) {
  const pixels = tf.input({ shape: [IMAGE_PIXELS], name: 'pixels' });
  const oneHot = tf.input({ shape: [NUM_CLASSES], name: 'class_onehot' });
  const encEmb = tf.layers.dense({
    units: EMBED_DIM,
    useBias: false,
    kernelInitializer: 'glorotUniform',
    name: 'enc_embed',
  }).apply(oneHot);
  let h = relu(tf, HIDDEN_UNITS, 'enc_h1').apply(cat(tf, 'enc_cat1', [pixels, encEmb]));
  h = relu(tf, HIDDEN_UNITS, 'enc_h2').apply(cat(tf, 'enc_cat2', [h, encEmb]));
  const zMean = linear(tf, LATENT_DIM, 'z_mean').apply(h);
  const zLogVar = linear(tf, LATENT_DIM, 'z_logvar').apply(h);
  const encoder = tf.model({
    inputs: [pixels, oneHot],
    outputs: [zMean, zLogVar],
    name: 'fashion_encoder',
  });

  const zIn = tf.input({ shape: [LATENT_DIM], name: 'z' });
  const decClass = tf.input({ shape: [NUM_CLASSES], name: 'dec_class_onehot' });
  const decEmb = tf.layers.dense({
    units: EMBED_DIM,
    useBias: false,
    kernelInitializer: 'glorotUniform',
    name: 'dec_embed',
  }).apply(decClass);
  let d = relu(tf, HIDDEN_UNITS, 'dec_h1').apply(cat(tf, 'dec_cat1', [zIn, decEmb]));
  d = relu(tf, HIDDEN_UNITS, 'dec_h2').apply(cat(tf, 'dec_cat2', [d, decEmb]));
  const logits = linear(tf, IMAGE_PIXELS, 'dec_logits').apply(cat(tf, 'dec_cat_out', [d, decEmb]));
  const template = tf.layers.dense({
    units: IMAGE_PIXELS,
    useBias: false,
    kernelInitializer: 'zeros',
    name: 'class_template',
  }).apply(decClass);
  const recon = tf.layers.activation({ activation: 'sigmoid', name: 'dec_pixels' }).apply(
    tf.layers.add({ name: 'dec_sum' }).apply([logits, template]),
  );
  const decoder = tf.model({
    inputs: [zIn, decClass],
    outputs: recon,
    name: 'fashion_decoder',
  });

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

function widthOf(tensor) {
  const shape = tensor && tensor.shape;
  if (!shape || !shape.length) return null;
  return shape[shape.length - 1];
}

function inputWidth(model, index) {
  const inputs = model && model.inputs;
  return widthOf(inputs && inputs[index]);
}

function outputWidth(model, index) {
  const outputs = model && model.outputs;
  return widthOf(outputs && outputs[index]);
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
  const encoderOk = inputWidth(encoder, 0) === IMAGE_PIXELS
    && inputWidth(encoder, 1) === NUM_CLASSES
    && outputWidth(encoder, 0) === LATENT_DIM
    && outputWidth(encoder, 1) === LATENT_DIM;
  const decoderOk = inputWidth(decoder, 0) === LATENT_DIM
    && inputWidth(decoder, 1) === NUM_CLASSES
    && outputWidth(decoder, 0) === IMAGE_PIXELS;
  if (!encoderOk || !decoderOk) {
    disposeVae({ encoder, decoder });
    return null;
  }
  return { encoder, decoder };
}

export async function saveVae(vae) {
  await vae.encoder.save(ENCODER_URL);
  await vae.decoder.save(DECODER_URL);
}

/**
 * Fashion-MNIST generators.
 *
 * cvae       Dense conditional VAE. Class one-hot is concatenated (WASM can train it).
 * conv-cvae  Conv encoder + transposed-conv decoder, class embedding concatenated.
 * cdcgan     Conditional DCGAN: z=100, 7×7×256 generator, tanh, Adam β1 0.5.
 *
 * Checkpoints use a different IndexedDB key per model so they do not collide.
 */

import { IMAGE_PIXELS, IMAGE_SIZE, NUM_CLASSES } from './data.js';

const DENSE_LATENT = 8;
const DENSE_HIDDEN = 64;
const CONV_LATENT = 32;
const CONV_EMBED = 16;
const GAN_LATENT = 100;
const GAN_EMBED = 32;

const DENSE_ENCODER_URL = 'indexeddb://browser-ai-fashion-cvae-h64-z8-enc';
const DENSE_DECODER_URL = 'indexeddb://browser-ai-fashion-cvae-h64-z8-dec';
const CONV_ENCODER_URL = 'indexeddb://browser-ai-fashion-conv-cvae-z32-enc';
const CONV_DECODER_URL = 'indexeddb://browser-ai-fashion-conv-cvae-z32-dec';
const GAN_G_URL = 'indexeddb://browser-ai-fashion-cdcgan-z100-g';
const GAN_D_URL = 'indexeddb://browser-ai-fashion-cdcgan-z100-d';

export const MODELS = {
  cvae: {
    id: 'cvae',
    label: 'Dense CVAE (stable)',
    family: 'vae',
    convTrain: false,
    latentDim: DENSE_LATENT,
    pixelRange: 'unit',
    inputMode: 'flat',
    spatial: false,
    beta1: 0.9,
    preset: { epochs: 8, batchSize: 64, lr: 0.001 },
    urls: { encoder: DENSE_ENCODER_URL, decoder: DENSE_DECODER_URL },
    recipe: 'Best known here: 8 epochs, batch 64, Adam 1e-3, latent 8. The dense net is the one WASM can train.',
  },
  'conv-cvae': {
    id: 'conv-cvae',
    label: 'Conv CVAE (sharper VAE)',
    family: 'vae',
    convTrain: true,
    latentDim: CONV_LATENT,
    pixelRange: 'unit',
    inputMode: 'image',
    spatial: true,
    beta1: 0.9,
    preset: { epochs: 50, batchSize: 64, lr: 0.001 },
    urls: { encoder: CONV_ENCODER_URL, decoder: CONV_DECODER_URL },
    recipe: 'Best known: 50 epochs (50–100 is the useful range), batch 64, Adam 1e-3, latent 32, BCE. Class embedding is concatenated, not added.',
  },
  cdcgan: {
    id: 'cdcgan',
    label: 'cDCGAN (sharpest)',
    family: 'gan',
    convTrain: true,
    latentDim: GAN_LATENT,
    pixelRange: 'tanh',
    inputMode: 'image',
    spatial: true,
    beta1: 0.5,
    preset: { epochs: 50, batchSize: 64, lr: 0.0002 },
    urls: { generator: GAN_G_URL, discriminator: GAN_D_URL },
    recipe: 'Best known: 50 epochs, Adam 2e-4, β1 0.5, noise 100. Batch 64 in this tab (128 on a large GPU). Samples use tanh in [−1, 1].',
  },
};

export function getModelSpec(id) {
  const spec = MODELS[id || 'cvae'];
  if (!spec) throw new Error(`Unknown model "${id}".`);
  return spec;
}

export function presetLabel(id) {
  return getModelSpec(id || 'cvae').label;
}

function attach(spec, parts) {
  const model = {
    id: spec.id,
    label: spec.label,
    family: spec.family,
    convTrain: spec.convTrain,
    latentDim: spec.latentDim,
    pixelRange: spec.pixelRange,
    inputMode: spec.inputMode,
    spatial: spec.spatial,
    beta1: spec.beta1,
    urls: spec.urls,
    encoder: parts.encoder || null,
    decoder: parts.decoder || null,
    generator: parts.generator || null,
    discriminator: parts.discriminator || null,
  };

  model.encode = function encode(tf, xs, ys) {
    if (model.family !== 'vae') throw new Error('This model has no encoder.');
    if (model.inputMode === 'flat') return model.encoder.apply(tf.concat([xs, ys], 1));
    return model.encoder.apply([xs, ys], { training: true });
  };

  model.reconstruct = function reconstruct(tf, z, ys, training) {
    const train = !!training;
    if (model.family === 'gan') return model.generator.apply([z, ys], { training: train });
    if (model.inputMode === 'flat') return model.decoder.apply(tf.concat([z, ys], 1));
    return model.decoder.apply([z, ys], { training: train });
  };

  return model;
}

function createDenseCvae(tf, spec) {
  const encIn = tf.input({ shape: [IMAGE_PIXELS + NUM_CLASSES], name: 'encoder_input' });
  const encHidden = tf.layers.dense({
    units: DENSE_HIDDEN,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
    name: 'enc_hidden',
  }).apply(encIn);
  const zMean = tf.layers.dense({
    units: DENSE_LATENT,
    kernelInitializer: 'glorotUniform',
    name: 'z_mean',
  }).apply(encHidden);
  const zLogVar = tf.layers.dense({
    units: DENSE_LATENT,
    kernelInitializer: 'glorotUniform',
    name: 'z_logvar',
  }).apply(encHidden);
  const encoder = tf.model({ inputs: encIn, outputs: [zMean, zLogVar], name: 'fashion_encoder' });

  const decIn = tf.input({ shape: [DENSE_LATENT + NUM_CLASSES], name: 'decoder_input' });
  const decHidden = tf.layers.dense({
    units: DENSE_HIDDEN,
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
  return attach(spec, { encoder, decoder });
}

/** Tile a [batch, channels] embedding into a square feature map. */
function tileEmbedding(tf, emb, spatial, channels) {
  const map = tf.layers.reshape({ targetShape: [1, 1, channels] }).apply(emb);
  return tf.layers.upSampling2d({
    size: [spatial, spatial],
    interpolation: 'nearest',
  }).apply(map);
}

/**
 * Three stride-2 convs (28→14→7→4), latent 32, then three Conv2DTranspose
 * stages from a 7×7 map back to 28×28×1 with a sigmoid.
 * The class embedding is concatenated at the image, the encoder bottleneck,
 * z, and the 7×7 decoder map.
 */
function createConvCvae(tf, spec) {
  const image = tf.input({ shape: [IMAGE_SIZE, IMAGE_SIZE, 1], name: 'image' });
  const oneHot = tf.input({ shape: [NUM_CLASSES], name: 'class_onehot' });
  const encEmbed = tf.layers.dense({
    units: CONV_EMBED,
    useBias: false,
    kernelInitializer: 'glorotUniform',
    name: 'enc_class_embed',
  });
  const emb = encEmbed.apply(oneHot);
  const encJoined = tf.layers.concatenate({ axis: -1, name: 'enc_concat' }).apply([
    image,
    tileEmbedding(tf, emb, IMAGE_SIZE, CONV_EMBED),
  ]);
  let h = tf.layers.conv2d({
    filters: 32,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
    name: 'enc_conv1',
  }).apply(encJoined);
  h = tf.layers.conv2d({
    filters: 64,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
    name: 'enc_conv2',
  }).apply(h);
  h = tf.layers.conv2d({
    filters: 128,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
    name: 'enc_conv3',
  }).apply(h);
  const flat = tf.layers.concatenate({ name: 'enc_bottleneck' }).apply([
    tf.layers.flatten({ name: 'enc_flat' }).apply(h),
    emb,
  ]);
  const zMean = tf.layers.dense({
    units: CONV_LATENT,
    kernelInitializer: 'glorotUniform',
    name: 'z_mean',
  }).apply(flat);
  const zLogVar = tf.layers.dense({
    units: CONV_LATENT,
    kernelInitializer: 'glorotUniform',
    name: 'z_logvar',
  }).apply(flat);
  const encoder = tf.model({
    inputs: [image, oneHot],
    outputs: [zMean, zLogVar],
    name: 'fashion_conv_encoder',
  });

  const z = tf.input({ shape: [CONV_LATENT], name: 'z' });
  const y = tf.input({ shape: [NUM_CLASSES], name: 'class_onehot' });
  const decEmbed = tf.layers.dense({
    units: CONV_EMBED,
    useBias: false,
    kernelInitializer: 'glorotUniform',
    name: 'dec_class_embed',
  });
  const decEmb = decEmbed.apply(y);
  let dec = tf.layers.dense({
    units: 7 * 7 * 64,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
    name: 'dec_dense',
  }).apply(tf.layers.concatenate({ name: 'dec_concat_z' }).apply([z, decEmb]));
  dec = tf.layers.reshape({ targetShape: [7, 7, 64], name: 'dec_reshape' }).apply(dec);
  dec = tf.layers.concatenate({ axis: -1, name: 'dec_concat_map' }).apply([
    dec,
    tileEmbedding(tf, decEmb, 7, CONV_EMBED),
  ]);
  dec = tf.layers.conv2dTranspose({
    filters: 64,
    kernelSize: 3,
    strides: 1,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
    name: 'dec_t1',
  }).apply(dec);
  dec = tf.layers.conv2dTranspose({
    filters: 32,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
    name: 'dec_t2',
  }).apply(dec);
  const recon = tf.layers.conv2dTranspose({
    filters: 1,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'sigmoid',
    kernelInitializer: 'glorotUniform',
    name: 'dec_out',
  }).apply(dec);
  const decoder = tf.model({
    inputs: [z, y],
    outputs: recon,
    name: 'fashion_conv_decoder',
  });
  return attach(spec, { encoder, decoder });
}

function ganInit(tf) {
  return tf.initializers.randomNormal({ mean: 0, stddev: 0.02 });
}

/**
 * cDCGAN following the DCGAN 28×28 stack (dense → 7×7×256 → transposed convs,
 * tanh) with a class embedding concatenated into G and D.
 */
function createCdcgan(tf, spec) {
  const init = ganInit(tf);
  const z = tf.input({ shape: [GAN_LATENT], name: 'z' });
  const y = tf.input({ shape: [NUM_CLASSES], name: 'class_onehot' });
  const gEmbed = tf.layers.dense({
    units: GAN_EMBED,
    useBias: false,
    kernelInitializer: init,
    name: 'g_class_embed',
  });
  const gEmb = gEmbed.apply(y);
  let g = tf.layers.dense({
    units: 7 * 7 * 256,
    useBias: false,
    kernelInitializer: init,
    name: 'g_dense',
  }).apply(tf.layers.concatenate({ name: 'g_concat_z' }).apply([z, gEmb]));
  g = tf.layers.batchNormalization({ name: 'g_bn1' }).apply(g);
  g = tf.layers.leakyReLU({ alpha: 0.2, name: 'g_lrelu1' }).apply(g);
  g = tf.layers.reshape({ targetShape: [7, 7, 256], name: 'g_reshape' }).apply(g);
  g = tf.layers.concatenate({ axis: -1, name: 'g_concat_map' }).apply([
    g,
    tileEmbedding(tf, gEmb, 7, GAN_EMBED),
  ]);
  g = tf.layers.conv2dTranspose({
    filters: 128,
    kernelSize: 5,
    strides: 1,
    padding: 'same',
    useBias: false,
    kernelInitializer: init,
    name: 'g_t1',
  }).apply(g);
  g = tf.layers.batchNormalization({ name: 'g_bn2' }).apply(g);
  g = tf.layers.leakyReLU({ alpha: 0.2, name: 'g_lrelu2' }).apply(g);
  g = tf.layers.conv2dTranspose({
    filters: 64,
    kernelSize: 5,
    strides: 2,
    padding: 'same',
    useBias: false,
    kernelInitializer: init,
    name: 'g_t2',
  }).apply(g);
  g = tf.layers.batchNormalization({ name: 'g_bn3' }).apply(g);
  g = tf.layers.leakyReLU({ alpha: 0.2, name: 'g_lrelu3' }).apply(g);
  const imageOut = tf.layers.conv2dTranspose({
    filters: 1,
    kernelSize: 5,
    strides: 2,
    padding: 'same',
    activation: 'tanh',
    kernelInitializer: init,
    name: 'g_tanh',
  }).apply(g);
  const generator = tf.model({ inputs: [z, y], outputs: imageOut, name: 'fashion_cdcgan_g' });

  const image = tf.input({ shape: [IMAGE_SIZE, IMAGE_SIZE, 1], name: 'image' });
  const yD = tf.input({ shape: [NUM_CLASSES], name: 'class_onehot' });
  const dEmbed = tf.layers.dense({
    units: GAN_EMBED,
    useBias: false,
    kernelInitializer: init,
    name: 'd_class_embed',
  });
  const dEmb = dEmbed.apply(yD);
  let d = tf.layers.concatenate({ axis: -1, name: 'd_concat_in' }).apply([
    image,
    tileEmbedding(tf, dEmb, IMAGE_SIZE, GAN_EMBED),
  ]);
  d = tf.layers.conv2d({
    filters: 64,
    kernelSize: 5,
    strides: 2,
    padding: 'same',
    kernelInitializer: init,
    name: 'd_conv1',
  }).apply(d);
  d = tf.layers.leakyReLU({ alpha: 0.2, name: 'd_lrelu1' }).apply(d);
  d = tf.layers.dropout({ rate: 0.3, name: 'd_drop1' }).apply(d);
  d = tf.layers.conv2d({
    filters: 128,
    kernelSize: 5,
    strides: 2,
    padding: 'same',
    kernelInitializer: init,
    name: 'd_conv2',
  }).apply(d);
  d = tf.layers.leakyReLU({ alpha: 0.2, name: 'd_lrelu2' }).apply(d);
  d = tf.layers.dropout({ rate: 0.3, name: 'd_drop2' }).apply(d);
  d = tf.layers.concatenate({ name: 'd_concat_vec' }).apply([
    tf.layers.flatten({ name: 'd_flat' }).apply(d),
    dEmb,
  ]);
  const logit = tf.layers.dense({
    units: 1,
    kernelInitializer: init,
    name: 'd_logit',
  }).apply(d);
  const discriminator = tf.model({
    inputs: [image, yD],
    outputs: logit,
    name: 'fashion_cdcgan_d',
  });
  return attach(spec, { generator, discriminator });
}

function assertModel(tf, model) {
  let shape = null;
  let encodeOk = true;
  let latent = null;
  tf.tidy(() => {
    const y = tf.oneHot(tf.tensor1d([0, 1], 'int32'), NUM_CLASSES);
    const z = tf.zeros([2, model.latentDim]);
    const out = model.reconstruct(tf, z, y, false);
    shape = out.shape.slice();
    if (model.family === 'vae') {
      const xs = model.spatial
        ? tf.zeros([2, IMAGE_SIZE, IMAGE_SIZE, 1])
        : tf.zeros([2, IMAGE_PIXELS]);
      const encoded = model.encode(tf, xs, y);
      encodeOk = Array.isArray(encoded) && encoded.length === 2;
      if (encodeOk) latent = encoded[0].shape[encoded[0].shape.length - 1];
    }
    return null;
  });
  if (!encodeOk) throw new Error('Encoder must return mean and log-variance.');
  if (model.family === 'vae' && latent !== model.latentDim) {
    throw new Error(`Latent width ${latent} does not match ${model.latentDim}.`);
  }
  const spatialOk = shape && shape[1] === IMAGE_SIZE && shape[2] === IMAGE_SIZE && shape[3] === 1;
  const flatOk = shape && shape.length === 2 && shape[1] === IMAGE_PIXELS;
  if (model.spatial ? !spatialOk : !flatOk) {
    throw new Error(`Model output shape ${(shape || []).join('×')} is not 28×28.`);
  }
}

export function createFashionModel(tf, id) {
  const spec = getModelSpec(id);
  const model = spec.family === 'gan'
    ? createCdcgan(tf, spec)
    : (spec.id === 'conv-cvae' ? createConvCvae(tf, spec) : createDenseCvae(tf, spec));
  try {
    assertModel(tf, model);
  } catch (error) {
    disposeFashionModel(model);
    throw error;
  }
  return model;
}

export function countParams(model) {
  if (!model) return 0;
  const nets = [model.encoder, model.decoder, model.generator, model.discriminator].filter(Boolean);
  return nets.reduce((sum, net) => sum + net.countParams(), 0);
}

export function disposeFashionModel(model) {
  if (!model) return;
  if (model.encoder) model.encoder.dispose();
  if (model.decoder) model.decoder.dispose();
  if (model.generator) model.generator.dispose();
  if (model.discriminator) model.discriminator.dispose();
}

function inputTails(net) {
  return (net.inputs || []).map((input) => (input.shape || []).slice(1));
}

function outputTail(net) {
  const shape = net.outputs && net.outputs[0] && net.outputs[0].shape;
  return shape ? shape.slice(1) : [];
}

function sameTail(actual, expected) {
  if (!actual || actual.length !== expected.length) return false;
  return expected.every((dim, index) => actual[index] === dim);
}

function shapesMatch(model, spec) {
  if (spec.family === 'gan') {
    const gIn = inputTails(model.generator);
    const dIn = inputTails(model.discriminator);
    return gIn.length === 2
      && sameTail(gIn[0], [GAN_LATENT])
      && sameTail(gIn[1], [NUM_CLASSES])
      && sameTail(outputTail(model.generator), [IMAGE_SIZE, IMAGE_SIZE, 1])
      && dIn.length === 2
      && sameTail(dIn[0], [IMAGE_SIZE, IMAGE_SIZE, 1])
      && sameTail(dIn[1], [NUM_CLASSES]);
  }
  const encIn = inputTails(model.encoder);
  const decIn = inputTails(model.decoder);
  if (spec.inputMode === 'flat') {
    return encIn.length === 1
      && sameTail(encIn[0], [IMAGE_PIXELS + NUM_CLASSES])
      && decIn.length === 1
      && sameTail(decIn[0], [spec.latentDim + NUM_CLASSES]);
  }
  return encIn.length === 2
    && sameTail(encIn[0], [IMAGE_SIZE, IMAGE_SIZE, 1])
    && sameTail(encIn[1], [NUM_CLASSES])
    && decIn.length === 2
    && sameTail(decIn[0], [spec.latentDim])
    && sameTail(decIn[1], [NUM_CLASSES])
    && sameTail(outputTail(model.decoder), [IMAGE_SIZE, IMAGE_SIZE, 1]);
}

export async function loadFashionModel(tf, id) {
  const spec = getModelSpec(id);
  const parts = {};
  try {
    if (spec.family === 'gan') {
      parts.generator = await tf.loadLayersModel(spec.urls.generator);
      parts.discriminator = await tf.loadLayersModel(spec.urls.discriminator);
    } else {
      parts.encoder = await tf.loadLayersModel(spec.urls.encoder);
      parts.decoder = await tf.loadLayersModel(spec.urls.decoder);
    }
  } catch (error) {
    disposeFashionModel(parts);
    const message = String((error && error.message) || error);
    if (!/cannot find model/i.test(message)) {
      console.warn(`Saved ${spec.label} could not be loaded`, error);
    }
    return null;
  }
  const model = attach(spec, parts);
  if (!shapesMatch(model, spec)) {
    disposeFashionModel(model);
    return null;
  }
  return model;
}

export async function saveFashionModel(model) {
  if (!model) return;
  if (model.family === 'gan') {
    await model.generator.save(model.urls.generator);
    await model.discriminator.save(model.urls.discriminator);
    return;
  }
  await model.encoder.save(model.urls.encoder);
  await model.decoder.save(model.urls.decoder);
}

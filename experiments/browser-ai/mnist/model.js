/** Tiny MNIST presets and IndexedDB weight IO via TensorFlow.js. */

export const MODEL_URL = 'indexeddb://browser-ai-mnist';

export const PRESET_LABELS = {
  tiny: 'Tiny MLP',
  small: 'Small CNN',
};

export function presetLabel(preset) {
  return PRESET_LABELS[preset] || PRESET_LABELS.tiny;
}

export function createModel(tf, preset) {
  if (preset === 'small') return createCnn(tf);
  return createMlp(tf);
}

function createMlp(tf) {
  const model = tf.sequential();
  model.add(tf.layers.flatten({ inputShape: [28, 28, 1] }));
  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
  return model;
}

function createCnn(tf) {
  const model = tf.sequential();
  model.add(tf.layers.conv2d({
    inputShape: [28, 28, 1],
    filters: 8,
    kernelSize: 3,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(tf.layers.conv2d({
    filters: 16,
    kernelSize: 3,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
  return model;
}

export async function loadSavedModel(tf) {
  try {
    return await tf.loadLayersModel(MODEL_URL);
  } catch (error) {
    const message = String((error && error.message) || error);
    if (!/cannot find model/i.test(message)) {
      console.warn('Saved MNIST model could not be loaded', error);
    }
    return null;
  }
}

export async function saveModel(model) {
  await model.save(MODEL_URL);
}

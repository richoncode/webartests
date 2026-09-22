/** TensorFlow.js backend picker. Conv models skip WASM — it cannot train Conv2D. */

import {
  activateBackend,
  describeTfBackend,
  getTf,
  loadTensorflow,
} from '../mnist/backend.js';

export {
  activateBackend,
  backendChoiceLabel,
  describeTfBackend,
  getTf,
  loadTensorflow,
} from '../mnist/backend.js';

/** True when this browser can attempt the backend. CPU is always listed. */
export function backendAvailable(name, caps) {
  if (!caps) return name === 'cpu';
  if (name === 'webgpu') return !!(caps.webgpu && caps.webgpuAdapter);
  if (name === 'wasm') return !!caps.wasm;
  if (name === 'webgl') return !!caps.webgl;
  if (name === 'cpu') return true;
  return false;
}

/** WebGPU, then WebGL, then CPU. WASM is omitted on purpose. */
export function convTrainOrder(caps) {
  const order = [];
  if (backendAvailable('webgpu', caps)) order.push('webgpu');
  if (backendAvailable('webgl', caps)) order.push('webgl');
  order.push('cpu');
  return order;
}

/**
 * Explicit WASM on a conv model moves to the first conv-capable backend.
 * Auto stays "auto"; activateForModel then skips WASM.
 */
export function planBackend(choice, spec, caps) {
  const requested = choice || 'auto';
  if (!spec || !spec.convTrain || requested !== 'wasm') {
    return { choice: requested, redirected: false, reason: '' };
  }
  const order = convTrainOrder(caps);
  return {
    choice: order[0] || 'cpu',
    redirected: true,
    reason: 'WASM cannot train Conv2D or Conv2DTranspose. TensorFlow.js has no convolution training kernels on that backend.',
  };
}

function orderForConv(choice, caps) {
  const prefer = convTrainOrder(caps);
  if (!choice || choice === 'auto' || choice === 'wasm') return prefer;
  const order = [];
  if (choice === 'cpu' || backendAvailable(choice, caps)) order.push(choice);
  for (const name of prefer) {
    if (!order.includes(name)) order.push(name);
  }
  return order;
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function startBackend(name) {
  const tf = getTf();
  const ok = await tf.setBackend(name);
  if (!ok) throw new Error(`${name} refused to start`);
  await tf.ready();
  if (tf.getBackend() !== name) {
    throw new Error(`TensorFlow.js stayed on ${tf.getBackend()} instead of ${name}`);
  }
}

/**
 * Dense models use the shared Auto order (WebGPU, WASM, WebGL, CPU).
 * Conv CVAE and cDCGAN never select WASM.
 */
export async function activateForModel(choice, caps, spec) {
  if (!spec || !spec.convTrain) return activateBackend(choice, caps);
  const tf = await loadTensorflow();
  const requested = choice || 'auto';
  const order = orderForConv(requested, caps);
  if (!order.length) {
    throw new Error('No backend can train convolutions in this browser.');
  }
  if (tf.getBackend() === order[0]) {
    return {
      name: order[0],
      label: describeTfBackend(tf, order[0]),
      requested,
      fellBack: requested !== 'auto' && requested !== order[0],
      attempts: [],
    };
  }
  const attempts = [];
  for (const name of order) {
    const budget = name === 'webgpu' ? 15000 : 30000;
    try {
      await withTimeout(startBackend(name), budget, name);
      return {
        name,
        label: describeTfBackend(tf, name),
        requested,
        fellBack: requested !== 'auto' && requested !== name,
        attempts,
      };
    } catch (error) {
      console.warn(`TF.js backend ${name} failed`, error);
      attempts.push(name);
    }
  }
  throw new Error(`No TensorFlow.js backend started. Tried ${order.join(', ')}.`);
}

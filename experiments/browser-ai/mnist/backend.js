/**
 * Load TensorFlow.js from the CDN and pick WebGPU, WASM (SIMD when the
 * runtime selects it), WebGL, or CPU.
 */

const TF_VERSION = '4.22.0';
const CDN = 'https://cdn.jsdelivr.net/npm';

const CORE_SRC = `${CDN}/@tensorflow/tfjs@${TF_VERSION}/dist/tf.min.js`;
const WASM_SRC = `${CDN}/@tensorflow/tfjs-backend-wasm@${TF_VERSION}/dist/tf-backend-wasm.min.js`;
const WEBGPU_SRC = `${CDN}/@tensorflow/tfjs-backend-webgpu@${TF_VERSION}/dist/tf-backend-webgpu.min.js`;
const WASM_PATH = `${CDN}/@tensorflow/tfjs-backend-wasm@${TF_VERSION}/dist/`;

const BACKEND_LABELS = {
  auto: 'Auto',
  webgpu: 'WebGPU',
  wasm: 'WASM',
  webgl: 'WebGL',
  cpu: 'CPU',
};

let loading = null;

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-tf-src="${src}"]`);
    if (existing && existing.dataset.loaded === 'yes') {
      resolve();
      return;
    }
    const script = existing || document.createElement('script');
    const timer = setTimeout(() => reject(new Error(`Timed out loading ${src}`)), 45000);
    script.src = src;
    script.async = false;
    script.crossOrigin = 'anonymous';
    script.dataset.tfSrc = src;
    script.onload = () => {
      clearTimeout(timer);
      script.dataset.loaded = 'yes';
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Failed to load ${src}`));
    };
    if (!existing) document.head.appendChild(script);
  });
}

async function loadAll() {
  await loadScript(CORE_SRC);
  if (!globalThis.tf) throw new Error('TensorFlow.js loaded without a global tf.');
  await loadScript(WASM_SRC);
  try {
    await loadScript(WEBGPU_SRC);
  } catch (error) {
    console.warn('WebGPU backend script did not load', error);
  }
  if (globalThis.tf.wasm && typeof globalThis.tf.wasm.setWasmPaths === 'function') {
    globalThis.tf.wasm.setWasmPaths(WASM_PATH);
  }
  return globalThis.tf;
}

export function loadTensorflow() {
  if (globalThis.tf && globalThis.tf.wasm) return Promise.resolve(globalThis.tf);
  if (!loading) {
    loading = loadAll().catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

export function getTf() {
  if (!globalThis.tf) throw new Error('TensorFlow.js is not loaded yet.');
  return globalThis.tf;
}

export function backendChoiceLabel(choice) {
  return BACKEND_LABELS[choice] || choice;
}

function wasmUsesSimd(tf) {
  try {
    return !!(tf.env && tf.env().get('WASM_HAS_SIMD_SUPPORT'));
  } catch {
    return false;
  }
}

export function describeTfBackend(tf, name) {
  if (name === 'wasm') return wasmUsesSimd(tf) ? 'WASM (SIMD)' : 'WASM';
  if (name === 'webgpu') return 'WebGPU';
  if (name === 'webgl') return 'WebGL';
  if (name === 'cpu') return 'CPU';
  return name;
}

function backendOrder(choice, caps) {
  const fallback = [];
  if (caps.wasm) fallback.push('wasm');
  if (caps.webgl) fallback.push('webgl');
  fallback.push('cpu');

  if (choice === 'auto') {
    const order = [];
    if (caps.webgpu && caps.webgpuAdapter) order.push('webgpu');
    for (const name of fallback) {
      if (!order.includes(name)) order.push(name);
    }
    return order;
  }

  const order = [];
  if (choice === 'webgpu' && !caps.webgpu) {
    /* API is missing — skip the attempt and fall through. */
  } else {
    order.push(choice);
  }
  for (const name of fallback) {
    if (!order.includes(name)) order.push(name);
  }
  return order;
}

async function setAndReady(tf, name) {
  const ok = await tf.setBackend(name);
  if (!ok) throw new Error(`${name} refused to start`);
  await tf.ready();
  if (tf.getBackend() !== name) {
    throw new Error(`TensorFlow.js stayed on ${tf.getBackend()} instead of ${name}`);
  }
}

/**
 * Start exactly one backend. Does not fall through to another.
 * @param {'webgpu'|'wasm'|'webgl'|'cpu'} name
 * @returns {Promise<{ name: string, label: string, requested: string, fellBack: boolean, attempts: string[] }>}
 */
export async function trySetBackend(name) {
  const tf = await loadTensorflow();
  if (tf.wasm && typeof tf.wasm.setWasmPaths === 'function') {
    tf.wasm.setWasmPaths(WASM_PATH);
  }
  const budget = name === 'webgpu' ? 15000 : 30000;
  await withTimeout(setAndReady(tf, name), budget, name);
  return {
    name,
    label: describeTfBackend(tf, name),
    requested: name,
    fellBack: false,
    attempts: [],
  };
}

/**
 * @returns {Promise<{ name: string, label: string, requested: string, fellBack: boolean, attempts: string[] }>}
 */
export async function activateBackend(choice, caps) {
  const tf = await loadTensorflow();
  if (tf.wasm && typeof tf.wasm.setWasmPaths === 'function') {
    tf.wasm.setWasmPaths(WASM_PATH);
  }
  const order = backendOrder(choice || 'auto', caps);
  const attempts = [];
  for (const name of order) {
    const budget = name === 'webgpu' ? 15000 : 30000;
    try {
      await withTimeout(setAndReady(tf, name), budget, name);
      return {
        name,
        label: describeTfBackend(tf, name),
        requested: choice || 'auto',
        fellBack: (choice || 'auto') !== 'auto' && choice !== name,
        attempts,
      };
    } catch (error) {
      console.warn(`TF.js backend ${name} failed`, error);
      attempts.push(name);
    }
  }
  throw new Error('No TensorFlow.js backend started. Tried ' + (order.join(', ') || 'nothing') + '.');
}

/**
 * Capability probe for the Browser AI lab.
 * Hub and MNIST pages import this module (no build step).
 *
 * WebGPU tone:
 *   green  — navigator.gpu and an adapter
 *   yellow — navigator.gpu, but no adapter
 *   red    — no WebGPU
 */

/** Bytes from the public wasm-feature-detect SIMD probe (WebAssembly.validate). */
const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10,
  1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
]);

/**
 * @param {{ hasGpu?: boolean, hasAdapter?: boolean }} probe
 * @returns {{ status: 'yes'|'no', tone: 'green'|'yellow'|'red', headline: string }}
 */
export function classifyWebGPU(probe) {
  const hasGpu = !!probe.hasGpu;
  const hasAdapter = !!probe.hasAdapter;
  if (hasGpu && hasAdapter) {
    return { status: 'yes', tone: 'green', headline: 'WebGPU: yes' };
  }
  if (hasGpu) {
    return { status: 'no', tone: 'yellow', headline: 'WebGPU: no' };
  }
  return { status: 'no', tone: 'red', headline: 'WebGPU: no' };
}

export function detectWasmSimd() {
  try {
    return typeof WebAssembly !== 'undefined'
      && typeof WebAssembly.validate === 'function'
      && WebAssembly.validate(SIMD_PROBE);
  } catch {
    return false;
  }
}

function releaseGl(gl) {
  try {
    const lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch {
    /* The probe only needed to know the context exists. */
  }
}

function detectWebGL() {
  if (typeof document === 'undefined') return { webgl: false, webgl2: false };
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      releaseGl(gl2);
      return { webgl: true, webgl2: true };
    }
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    releaseGl(gl);
    return { webgl: !!gl, webgl2: false };
  } catch {
    return { webgl: false, webgl2: false };
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function readAdapterLabel(adapter) {
  try {
    let info = adapter.info || null;
    if (!info && typeof adapter.requestAdapterInfo === 'function') {
      info = await adapter.requestAdapterInfo();
    }
    if (!info) return null;
    const parts = [info.description, info.device, info.vendor].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{
 *   secureContext: boolean,
 *   webgpu: boolean,
 *   webgpuAdapter: boolean,
 *   adapterLabel: string|null,
 *   wasm: boolean,
 *   wasmSimd: boolean,
 *   webgl: boolean,
 *   webgl2: boolean,
 *   preferredBackend: 'webgpu'|'wasm'|'webgl'|'cpu'
 * }>}
 */
export async function detectCapabilities() {
  const secureContext = typeof window !== 'undefined' ? !!window.isSecureContext : false;
  const webgpu = typeof navigator !== 'undefined' && !!navigator.gpu;
  let webgpuAdapter = false;
  let adapterLabel = null;

  if (webgpu && typeof navigator.gpu.requestAdapter === 'function') {
    try {
      const adapter = await withTimeout(navigator.gpu.requestAdapter(), 4000);
      if (adapter) {
        webgpuAdapter = true;
        adapterLabel = await readAdapterLabel(adapter);
      }
    } catch {
      webgpuAdapter = false;
    }
  }

  const wasm = typeof WebAssembly !== 'undefined' && typeof WebAssembly.validate === 'function';
  const wasmSimd = wasm && detectWasmSimd();
  const { webgl, webgl2 } = detectWebGL();

  let preferredBackend = 'cpu';
  if (webgpuAdapter) preferredBackend = 'webgpu';
  else if (wasm) preferredBackend = 'wasm';
  else if (webgl) preferredBackend = 'webgl';

  return {
    secureContext,
    webgpu,
    webgpuAdapter,
    adapterLabel,
    wasm,
    wasmSimd,
    webgl,
    webgl2,
    preferredBackend,
  };
}

export function preferredBackendLabel(caps) {
  if (caps.preferredBackend === 'webgpu') return 'WebGPU';
  if (caps.preferredBackend === 'wasm') return caps.wasmSimd ? 'WASM (SIMD)' : 'WASM';
  if (caps.preferredBackend === 'webgl') return caps.webgl2 ? 'WebGL2' : 'WebGL';
  return 'CPU';
}

/**
 * Plain description the banner and MNIST backend note both render.
 * `extras.activeLabel` is the TensorFlow.js backend that actually started.
 * @param {Awaited<ReturnType<typeof detectCapabilities>>} caps
 * @param {{ activeLabel?: string, fellBack?: boolean, requestedLabel?: string }} [extras]
 */
export function describeCapabilities(caps, extras = {}) {
  const gpu = classifyWebGPU({ hasGpu: caps.webgpu, hasAdapter: caps.webgpuAdapter });
  let detail;
  if (gpu.status === 'yes') {
    detail = caps.adapterLabel
      ? `An adapter is available (${caps.adapterLabel}). Auto training tries WebGPU before WASM.`
      : 'An adapter is available. Auto training tries WebGPU before WASM.';
  } else if (caps.webgpu) {
    detail = caps.secureContext
      ? 'navigator.gpu is present, but no adapter was returned. Training can still run on WASM.'
      : 'navigator.gpu is present, but this page is outside a secure context. WebGPU needs localhost or HTTPS.';
  } else if (!caps.secureContext) {
    detail = 'This page is outside a secure context. WebGPU needs localhost or HTTPS, and it is not available here.';
  } else if (caps.wasmSimd) {
    detail = 'This browser has no WebGPU. Training can use WASM with SIMD.';
  } else if (caps.wasm) {
    detail = 'This browser has no WebGPU. WASM is available, without SIMD.';
  } else {
    detail = 'This browser has no WebGPU and no WebAssembly, so in-browser training cannot run here.';
  }

  if (extras.activeLabel) {
    const lead = extras.fellBack
      ? `TensorFlow.js is using ${extras.activeLabel} after ${extras.requestedLabel || 'the selected backend'} did not start.`
      : `TensorFlow.js is using ${extras.activeLabel}.`;
    detail = `${lead} ${detail}`;
  }

  const chips = [
    {
      label: caps.webgpuAdapter ? 'WebGPU adapter' : (caps.webgpu ? 'WebGPU API only' : 'No WebGPU'),
      on: !!caps.webgpuAdapter,
    },
    {
      label: caps.wasmSimd ? 'WASM SIMD' : (caps.wasm ? 'WASM' : 'No WASM'),
      on: !!caps.wasm,
    },
    {
      label: caps.webgl2 ? 'WebGL2' : (caps.webgl ? 'WebGL' : 'No WebGL'),
      on: !!caps.webgl,
    },
  ];

  if (extras.activeLabel) {
    chips.unshift({ label: `TF.js ${extras.activeLabel}`, on: true });
  }

  return {
    status: gpu.status,
    tone: gpu.tone,
    headline: gpu.headline,
    detail,
    chips,
    preferredBackend: caps.preferredBackend,
    preferredLabel: preferredBackendLabel(caps),
  };
}

/** Fill a banner element. Sets data-webgpu="yes"|"no" for the page. */
export function mountCapabilityBanner(root, caps, extras = {}) {
  const view = describeCapabilities(caps, extras);
  root.classList.remove('green', 'yellow', 'red');
  root.classList.add('banner', view.tone);
  root.dataset.webgpu = view.status;
  root.dataset.tone = view.tone;
  if (extras.activeBackend) root.dataset.activeBackend = extras.activeBackend;
  else root.removeAttribute('data-active-backend');
  root.replaceChildren();

  const kicker = document.createElement('p');
  kicker.className = 'banner-kicker';
  kicker.textContent = 'This browser';

  const title = document.createElement('h2');
  title.textContent = view.headline;

  const detail = document.createElement('p');
  detail.textContent = view.detail;

  const chips = document.createElement('div');
  chips.className = 'chips';
  for (const chip of view.chips) {
    const span = document.createElement('span');
    span.className = chip.on ? 'chip on' : 'chip';
    span.textContent = chip.label;
    chips.appendChild(span);
  }

  root.append(kicker, title, detail, chips);
  return view;
}

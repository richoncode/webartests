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

function detectWebGL() {
  if (typeof document === 'undefined') return { webgl: false, webgl2: false };
  try {
    const canvas = document.createElement('canvas');
    if (canvas.getContext('webgl2')) return { webgl: true, webgl2: true };
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
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
 * @param {Awaited<ReturnType<typeof detectCapabilities>>} caps
 */
export function describeCapabilities(caps) {
  const gpu = classifyWebGPU({ hasGpu: caps.webgpu, hasAdapter: caps.webgpuAdapter });
  let detail;
  if (gpu.status === 'yes') {
    detail = caps.adapterLabel
      ? `An adapter is available (${caps.adapterLabel}). Phase 1 training will prefer WebGPU over WASM.`
      : 'An adapter is available. Phase 1 training will prefer WebGPU over WASM.';
  } else if (caps.webgpu) {
    detail = caps.secureContext
      ? 'navigator.gpu is present, but no adapter was returned. The lab still loads; training will need the WASM fallback.'
      : 'navigator.gpu is present, but this page is outside a secure context. WebGPU needs localhost or HTTPS.';
  } else if (!caps.secureContext) {
    detail = 'This page is outside a secure context. WebGPU needs localhost or HTTPS, and it is not available here.';
  } else if (caps.wasmSimd) {
    detail = 'This browser has no WebGPU. WASM with SIMD is available as the Phase 1 fallback.';
  } else if (caps.wasm) {
    detail = 'This browser has no WebGPU. WASM is available, without SIMD.';
  } else {
    detail = 'This browser has no WebGPU and no WebAssembly, so the planned training loop cannot run here.';
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
export function mountCapabilityBanner(root, caps) {
  const view = describeCapabilities(caps);
  root.classList.remove('green', 'yellow', 'red');
  root.classList.add('banner', view.tone);
  root.dataset.webgpu = view.status;
  root.dataset.tone = view.tone;
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

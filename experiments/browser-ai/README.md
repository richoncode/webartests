# Browser AI Lab

Client-side training and inference experiments. Phase 0 is the hub, a WebGPU / WASM capability check, and the MNIST page shell. The training loop is Phase 1 and is not in this folder yet.

## Run locally

From the repo root:

```sh
python3 -m http.server 8080
```

Open [http://localhost:8080/experiments/browser-ai/](http://localhost:8080/experiments/browser-ai/).

Serve over HTTP. The pages load `shared/*.js` as ES modules, which do not run from `file://`.

## Browser

- **Preferred:** current Chrome or Edge with WebGPU enabled. The hub banner turns green only when `navigator.gpu` returns an adapter.
- WebGPU needs a secure context: `localhost` or HTTPS. A plain `http://` LAN address will report WebGPU: no.
- **Fallback:** WASM, with SIMD when `WebAssembly.validate` accepts a SIMD probe. WebGL2 / WebGL is the step after that. Phase 1 will use this order via TensorFlow.js; Phase 0 only reports it.
- Firefox and Safari often have no WebGPU. The pages still load, and the banner says **WebGPU: no**.

## Pages

| Path | What it is |
| --- | --- |
| `index.html` | Lab hub — Overview, Demos, Backends, Runs |
| `mnist/index.html` | Train, Dashboard, Draw & Infer, Batch, About |
| `shared/capabilities.js` | `detectCapabilities()`, `mountCapabilityBanner()` |
| `shared/runs.js` | Reads `localStorage['browser-ai.runs']` |

Runs stays empty until a later phase writes that key. No dataset is stored in the repo.

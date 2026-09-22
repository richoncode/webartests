# Browser AI Lab

Client-side training and inference. The hub checks WebGPU and WASM. The MNIST demo trains a tiny network with TensorFlow.js, draws a digit for inference, and writes the run into this browser.

## Run locally

From the repo root:

```sh
python3 -m http.server 8080
```

Open [http://localhost:8080/experiments/browser-ai/](http://localhost:8080/experiments/browser-ai/).

Serve over HTTP. The pages load `shared/*.js` as ES modules, which do not run from `file://`.

## Train and infer

1. Open [the MNIST page](http://localhost:8080/experiments/browser-ai/mnist/).
2. Leave **Backend** on **Auto**. The banner names the TensorFlow.js backend that started: WebGPU if an adapter exists, otherwise WASM (SIMD when the runtime selects it), otherwise WebGL, otherwise CPU.
3. Press **Start training**. The first visit downloads the public MNIST sprite (about 11 MB) and caches 12,000 digits in IndexedDB. Later visits skip that download.
4. Open **Dashboard** for loss, validation accuracy, samples/sec, and the epoch table. **Stop** ends the run after the current batch.
5. Open **Draw & Infer**. Draw a thick white digit on the black pad, then **Predict**. The 28×28 preview is the centered crop the model scores.
6. Refresh the [lab hub](http://localhost:8080/experiments/browser-ai/#runs). The finished run is listed from `localStorage['browser-ai.runs']`.

The **Batch** tab runs three short presets one after another (two learning rates on the tiny MLP, then the small CNN on WebGL) and fills the comparison table. TensorFlow.js WASM can train the MLP. It cannot train the CNN (`Conv2D` backprop is not in that backend), so a CNN run on Auto or WASM uses WebGL instead when WebGL exists.

Default train settings are a tiny MLP, 3 epochs, batch 128, Adam at learning rate 0.001, on 10,000 training images and 2,000 validation images.

## Browser

- **Preferred:** current Chrome or Edge with WebGPU enabled. The hub banner turns green only when `navigator.gpu` returns an adapter.
- WebGPU needs a secure context: `localhost` or HTTPS. A plain `http://` LAN address will report WebGPU: no.
- **Fallback:** WASM, with SIMD when TensorFlow.js loads `tfjs-backend-wasm-simd.wasm`. WebGL is next, then CPU. Auto follows that order, and the MNIST banner states the backend that actually started. WebGPU can be missing in CI; WASM or WebGL still trains.
- Firefox and Safari often have no WebGPU. The pages still load, and the banner says **WebGPU: no**.

## Pages

| Path | What it is |
| --- | --- |
| `index.html` | Lab hub — Overview, Demos, Backends, Runs |
| `mnist/index.html` | Train, Dashboard, Draw & Infer, Batch, About |
| `mnist/train.js` | Training loop, best-checkpoint save |
| `mnist/infer.js` | Draw canvas, 28×28 preprocess, softmax |
| `shared/capabilities.js` | `detectCapabilities()`, `mountCapabilityBanner()` |
| `shared/runs.js` | Reads and appends `localStorage['browser-ai.runs']` |

## What stays on the device

- IndexedDB database `browser-ai`, key `mnist-sprite-12k-v1`: cached MNIST pixels and labels.
- TensorFlow.js model `indexeddb://browser-ai-mnist`: best validation checkpoint.
- `localStorage['browser-ai.runs']`: a JSON list. Each MNIST entry has `name`, `demo`, `backend`, `savedAt`, `accuracy`, `loss`, `epochs`, `batchSize`, `learningRate`, `model`, `samplesPerSec`, and `durationMs`. The hub shows `name`, `backend`, `savedAt`, and `accuracy`.

No MNIST files are stored in the git repo. TensorFlow.js 4.22.0 is loaded from jsDelivr.

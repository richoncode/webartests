# Browser AI Lab

Client-side training and inference. The hub checks WebGPU and WASM. The MNIST demo trains a tiny network with TensorFlow.js and draws a digit. Fashion gen trains a class-conditional Fashion-MNIST model (dense CVAE, conv CVAE, or cDCGAN) and samples clothing. Both write the run into this browser.

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

The **Perf Compare** tab runs one fixed protocol on WebGPU, WASM, WebGL, and CPU: one epoch of the tiny MLP on 512 training images (batch 64, 128 validation images), then 3 warmup and 8 timed forward passes of 32 images. **Run tests** walks the backends in that order and fills train wall, samples/sec, validation accuracy, median infer milliseconds, and inferences/sec. A backend that cannot start (for example no WebGPU adapter) is marked unavailable and the suite continues. **Cancel** stops after the current step. The last table is restored from `localStorage['browser-ai.mnist-perf']`. This compare does not overwrite the Draw & Infer checkpoint, and it always uses the tiny MLP so every backend trains the same Conv-free model.

Default train settings are a tiny MLP, 3 epochs, batch 128, Adam at learning rate 0.001, on 10,000 training images and 2,000 validation images.

## Fashion gen

1. Open [the Fashion gen page](http://localhost:8080/experiments/browser-ai/fashion-gen/).
2. Pick a model. **Dense CVAE (class embedding)** trains on WASM. **Conv CVAE (sharper VAE)** and **cDCGAN (sharpest)** need WebGL, WebGPU, or CPU — TensorFlow.js WASM has no Conv2D training kernels, so Auto skips WASM for those two. Choosing WASM shows that status and moves the run.
3. Press **Best known** (or switch models) to fill the recipe: dense is 8 epochs, batch 64, Adam 1e-3; conv CVAE is 50 epochs, batch 64, Adam 1e-3; cDCGAN is 50 epochs, batch 64, Adam 2e-4 with β1 0.5.
4. Press **Start training**. The first visit downloads the official 10,000-image Fashion-MNIST test split (about 4.4 MB of gzip) and caches it in IndexedDB. Training uses 9,000 images and validates on 1,000.
5. Open **Dashboard**. VAEs show reconstruction, KL, and the training objective. cDCGAN shows generator and discriminator loss. **Stop** ends the run after the current batch.
6. Open **Samples**. The class menu starts on Trouser. Press **Generate** and compare those samples with two real images of the same class in the strip above. Captions say **Real** or **Generated**. A finished run fills that strip for every class. **Class means** decodes the zero code. **Latent walk** blends two codes.
7. Open **Perf Compare** and press **Run tests**. The sweep uses the selected model: 1 epoch on 256 images, batch 32, that model's learning rate, then 32 timed generations. Backends this browser does not have are skipped, and WASM is skipped for the conv models. Tables are stored per model.

Checkpoints do not share a key: dense `browser-ai-fashion-cvae-e16-h128-z16-*` (older `h64-z8` keys are not loaded), conv CVAE `browser-ai-fashion-conv-cvae-z32-*`, cDCGAN `browser-ai-fashion-cdcgan-z100-*`.

## Browser

- **Preferred:** current Chrome or Edge with WebGPU enabled. The hub banner turns green only when `navigator.gpu` returns an adapter.
- WebGPU needs a secure context: `localhost` or HTTPS. A plain `http://` LAN address will report WebGPU: no.
- **Fallback:** WASM, with SIMD when TensorFlow.js loads `tfjs-backend-wasm-simd.wasm`. WebGL is next, then CPU. Software WebGL is allowed, so a machine without a hardware GPU can still time that backend. Auto follows that order, and the MNIST banner states the backend that actually started. WebGPU can be missing in CI; WASM or WebGL still trains.
- Firefox and Safari often have no WebGPU. The pages still load, and the banner says **WebGPU: no**.

## Pages

| Path | What it is |
| --- | --- |
| `index.html` | Lab hub — Overview, Demos, Backends, Runs |
| `mnist/index.html` | Train, Dashboard, Draw & Infer, Batch, Perf Compare, About |
| `mnist/train.js` | Training loop, best-checkpoint save |
| `mnist/perf.js` | Fixed-protocol backend compare |
| `mnist/infer.js` | Draw canvas, 28×28 preprocess, softmax |
| `fashion-gen/index.html` | Train, Samples, Dashboard, Perf Compare, About |
| `fashion-gen/train.js` | Dense/conv CVAE loop, or alternating cDCGAN steps |
| `fashion-gen/generate.js` | Class-conditional samples, real-vs-gen pixels, timed generate |
| `shared/capabilities.js` | `detectCapabilities()`, `mountCapabilityBanner()` |
| `shared/runs.js` | Reads and appends `localStorage['browser-ai.runs']` |

## What stays on the device

- IndexedDB database `browser-ai`, key `mnist-sprite-12k-v1`: cached MNIST pixels and labels.
- IndexedDB database `browser-ai`, key `fashion-mnist-10k-v1`: cached Fashion-MNIST pixels and labels.
- TensorFlow.js model `indexeddb://browser-ai-mnist`: best MNIST checkpoint.
- TensorFlow.js models `indexeddb://browser-ai-fashion-cvae-e16-h128-z16-enc` and `…-dec`: dense class-embedding CVAE. Older `h64-z8` keys are not loaded. `indexeddb://browser-ai-fashion-conv-cvae-z32-enc` and `…-dec`: conv CVAE. `indexeddb://browser-ai-fashion-cdcgan-z100-g` and `…-d`: cDCGAN.
- `localStorage['browser-ai.runs']`: a JSON list. Each entry has `name`, `demo`, `backend`, `savedAt`, `loss`, `epochs`, `batchSize`, `learningRate`, `model`, `samplesPerSec`, and `durationMs`. MNIST entries also include `accuracy`. Fashion entries include `loss` when accuracy is absent. The hub shows `name`, `backend`, `savedAt`, and `accuracy` or `loss`.
- `localStorage['browser-ai.mnist-perf']`: the last MNIST Perf Compare table (protocol, per-backend train and infer numbers). Not listed on the hub Runs tab.
- `localStorage['browser-ai.fashion-perf']`: the last dense-CVAE perf table. Conv CVAE and cDCGAN use `browser-ai.fashion-perf.conv-cvae` and `browser-ai.fashion-perf.cdcgan`.

No MNIST or Fashion-MNIST files are stored in the git repo. TensorFlow.js 4.22.0 is loaded from jsDelivr.

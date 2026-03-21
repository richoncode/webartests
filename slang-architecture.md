# Slang Architecture & Integration Guide

This document defines the patterns, locations, and implementation strategies for the Slang shading language within the `webartests` workspace.

## 1. Overview
Slang is utilized as the primary shading language for high-performance WebGPU experiments, neural rendering modules, and real-time super-resolution pipelines.

## 2. Integration Patterns

### A. The "Full Stack" Playground (`slang-playground/`)
A comprehensive, standalone IDE for Slang.
- **Assets:** 
    - JS Driver: `slang-playground/assets/index-Daa1eW-z.js` (Vite-bundled)
    - WASM Compiler: `slang-playground/assets/slang-wasm.wasm-DU8ihYJ6.gz`
    - SPIRV Tools: `slang-playground/assets/spirv-tools-BoRV4oEi.wasm`
- **Capabilities:** Real-time compilation to WGSL/SPIRV, syntax highlighting (Monaco), and live output visualization.
- **Loading:** Dispatches a `slangLoaded` CustomEvent on `window` when ready.

### B. The "Tutorial Engine" (`learning-neural-rendering/`)
A modular framework for educational content using Slang.

**Key Features:**
- **Custom Elements:**
    - `<slang-editor>`: Monaco-based multi-tab editor with automatic tab switching and content synchronization.
    - `<slang-viewport>`: WebGPU-initialized `<canvas>` that manages render loops and frame dispatch.
    - `<slang-playback-controls>`: Pre-wired buttons for "Animate" (loop), "Step" (single frame), and "Restart" (re-init).
- **Tab-Based Organization:**
    - `Slang Shader`: The primary Slang source code.
    - `Compiled WGSL`: The auto-generated (or manually provided) WGSL output.
    - `WebGPU Wrapper`: A JavaScript class (conventionally named `ModuleRenderer` or specific to the module) that handles pipeline creation and resource binding.
- **Dynamic Integration:** Automatically detects code changes in editor tabs and re-instantiates the rendering engine via `window.engineInstance`.

**Tutorial Pages using `tutorial-engine.js`:**
    - `learning-neural-rendering/modules/01-ray-marching.html`
    - `learning-neural-rendering/modules/02-volume-integration.html`
    - `learning-neural-rendering/modules/03-neural-fields.html`
    - `learning-neural-rendering/modules/04-autodiff-optimization.html`
    - `learning-neural-rendering/modules/05-gaussian-splatting.html`
- **Current State:** Currently uses a "Manual Bridge" where users provide pre-compiled WGSL in a dedicated tab.
- **Target State:** Runtime compilation using the Slang-WASM module.

### C. The "Compute Pipeline" (`experiments/web-video-super-scaling/`)
Focused on high-performance compute shaders generated at runtime.

**Current Experiment:** `slang-wasm-test.html`.

**Integration Plan: `slang-video-test.html`**
To integrate the Tutorial Engine with live video processing:
1.  **Extend `SlangViewport`**: Add support for importing `video` elements as `externalTexture` (zero-copy).
2.  **Module Pattern**: Implement a `VideoShader` class in the "WebGPU Wrapper" tab that accepts a `video` element in its `render(video)` call.
3.  **Real-Time Feedback**: Use the tutorial engine's live-reloading editor to tweak Slang kernels (e.g., sharpening, denoising, or EMA background models) while the video is playing.
4.  **HLS.js Bridge**: Feed the `hls.js` video output into the WebGPU texture import loop within the engine's `drawFrame` cycle.

## 3. Core Slang-to-WGSL Workflow
To integrate Slang compilation into a new page:

1.  **Initialize:** Load the `slang-wasm` module.
2.  **Session:** Create a `globalSlangSession`.
3.  **Compile Request:**
    ```javascript
    const request = slangSession.createCompileRequest();
    request.addTranslationUnit(0, sourceCode); // 0 = Slang
    const targetIdx = request.addTarget('wgsl');
    const entryPointIdx = request.addEntryPoint(0, 'main', 0); // stage 0 = compute
    await request.execute();
    const wgsl = request.getEntryPointCode(entryPointIdx, targetIdx);
    ```
4.  **Execute:** Pass the resulting WGSL to `device.createShaderModule()`.

## 4. Key Files & Locations
- **Compiler WASM:** `slang-playground/assets/slang-wasm.wasm-DU8ihYJ6.gz`
- **Neural Shaders:** `learning-neural-rendering/assets/shaders/*.slang`
- **Demos:** `slang-playground/demos/*.slang`
- **Tutorial JS:** `learning-neural-rendering/assets/js/tutorial-engine.js`

## 5. Known Constraints & Solutions
- **CDN Blocking:** If Unpkg is inaccessible, the `iframe` bridge pattern (loading `slang-playground/index.html` in a hidden frame) can be used to extract the initialized compiler from a functional local environment.
- **WASM Decompression:** The `.gz` assets require `DecompressionStream` or appropriate server `Content-Encoding: gzip` headers.

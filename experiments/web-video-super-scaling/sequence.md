# Pipeline Progression: Logical Sequence

This document outlines the architectural reasoning behind the progression of the "Giant's Eye" Video Super Scaling POCs. The sequence moves from infrastructure to geometric foundation, then to analysis and neural reconstruction.

## Phase 1: Source & Infrastructure
The foundation requires getting high-bitrate video into the GPU with zero latency.

1.  **HLS Ingest Test (`streams-test.html`)**
    *   *Reasoning:* Validate handle of 40-80Mbps 4K stream.
2.  **WebGPU Render Stack (`webgpu-render-test.html`)**
    *   *Reasoning:* Zero-copy entry point via `importExternalTexture`.
3.  **Slang-WASM Compiler (`slang-wasm-test.html`)**
    *   *Reasoning:* Verify runtime compilation for complex shader math.

## Phase 2: Signal Preparation & Geometry
Establishing the colorspace and geometric relationship between views.

4.  **YUV Chroma Separation (`slang-yuv-poc.html`)**
    *   *Reasoning:* Isolating Luminance (Y) for 3x neural efficiency.
5.  **Planar Homography (`slang-homography-poc.html`)**
    *   *Reasoning:* **Geometric Foundation.** Aligning/Rectifying the Right eye to the Left eye space. This is a prerequisite for 1D stereo searching and reference-based fusion.

## Phase 3: Geometric Analysis
Synthesizing "G-Buffers" (Depth and Motion) from the rectified stream.

6.  **Static Background Prior (`slang-background-poc.html`)**
    *   *Reasoning:* Isolating dynamic players from the static pitch to save ~90% compute.
7.  **Stereo Depth Map (`slang-stereo-depth.html`)**
    *   *Reasoning:* Performing a 1D horizontal search along the rectified epipolar lines (enabled by the Homography in Step 5).
8.  **Optical Flow (`slang-optical-flow-poc.html`)**
    *   *Reasoning:* Generating motion vectors for temporal stability.

## Phase 4: Neural Reconstruction
High-fidelity synthesis and temporal integration.

9.  **CNN Y-Channel Upscale (`slang-cnn-upscale.html`)**
    *   *Reasoning:* Spatial enhancement of the luminance channel.
10. **Temporal Accumulation (`slang-temporal-accumulation.html`)**
    *   *Reasoning:* Re-projecting high-res samples from history via motion vectors.
11. **RefSR: Stereo Fusion (`slang-ref-sr.html`)**
    *   *Reasoning:* Fusing sub-pixel detail from the rectified secondary camera.

## Phase 5: Final Presentation
12. **Slang Video Engine (`slang-video-test.html`)**
    *   *Reasoning:* Integration of all modules into a unified playground.

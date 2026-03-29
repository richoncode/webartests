# View Relation & Homography Reference

This document tracks how the Left (Top) and Right (Bottom) stereoscopic views are related across the various pages in the `web-video-super-scaling` experiment.

## Calibration Anchor (Cardinals Rectified)
The current anchor homography matrix derived from `cardinals_left_rect_corr.json` and `cardinals_right_rect_corr.json` is:
```json
[
  1.0, 
  0.10703, 
  -26.14025, 
  0.0, 
  1.0, 
  0.0, 
  0.0, 
  0.0, 
  1.0
]
```
*Note: Very small scientific notation values (e.g., e-14) have been rounded to 0.0 for stability.*
This matrix maps the **Right Eye** (bottom half) into the perspective of the **Left Eye** (top half) for the ground plane.

---

## Page-by-Page Review

### 1. Planar Homography Warping (`slang-homography-poc.html`)
- **Technique:** $3 \times 3$ Projective Transformation (Homography).
- **Description:** Full coordinate warping using the matrix above. It calculates `x' = Hx / w` to find corresponding pixels in the Right Eye for every pixel in the Left Eye.
- **Relates:** Right Eye $\rightarrow$ Left Eye space.

### 2. Stereo Depth Map (`slang-stereo-depth.html`)
- **Technique:** 1D Horizontal Disparity Search.
- **Description:** Performs a linear search along the X-axis (`xL = xR + d`) to find the best match between the top and bottom halves using distance metrics (SAD/SSD).
- **Relates:** 1D correspondence for depth extraction.

### 3. RefSR: Stereo Fusion (`slang-ref-sr.html`)
- **Technique:** Disparity-based Warping.
- **Description:** Uses a pre-computed or real-time disparity map `d` to lookup samples from the Right Eye at `xR = xL - d`.
- **Relates:** Right Eye $\rightarrow$ Left Eye for sub-pixel feature enhancement.

### 4. WebGPU Render Stack (`webgpu-render-test.html`)
- **Technique:** Simple UV Remapping.
- **Description:** Hardcoded coordinate offsets. For Mono mode, it crops the top half (`uv.y *= 0.5`). For Side-by-Side, it scales X and shifts Y to place the stacked eyes horizontally.
- **Relates:** View presentation only.

### 5. Slang Video Processing (`slang-video-test.html`)
- **Technique:** Simple UV Remapping.
- **Description:** Same logic as the WebGPU Render Stack, implemented in Slang fragment shaders.
- **Relates:** View presentation only.

### 6. HLS Ingest Test (`streams-test.html`)
- **Technique:** CSS / HTML scaling.
- **Description:** Uses `object-fit` and container height (200% for video) to crop the top eye in "Mono" mode.
- **Relates:** Basic UI-level cropping.

### 7. Processing Pipeline POCs
*(`slang-yuv-poc.html`, `slang-background-poc.html`, `slang-optical-flow-poc.html`, `slang-cnn-upscale.html`, `slang-temporal-accumulation.html`)*
- **Technique:** Top-Half Isolation.
- **Description:** These pages currently execute their neural or processing logic exclusively on the **Left Eye** (Top) by applying `uv.y *= 0.5` to the incoming stream.
- **Relates:** Isolates primary view for compute efficiency.

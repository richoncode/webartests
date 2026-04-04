# Project Context: Sub-Pixel Precision Metrology & Hybrid Vision

**Original Context**: [https://gemini.google.com/share/d44a20d4a53e](https://gemini.google.com/share/d44a20d4a53e)

## 1. System Objective
The goal is to develop a browser-based (React + OpenCV.js + TF.js) vision system capable of extracting high-fidelity colorimetric data from a 21x21 grid laser-engraved onto SS304 stainless steel. The grid features four 7x7 nested-square finder patterns in the corners. The system must achieve sub-pixel accuracy to sample the exact geometric center of each color cell, even under 3D perspective tilts up to 35 degrees.

## 2. Core Vision Theory: The Algebraic Pathway
Standard computer vision heuristics (centroids via `cv.moments` or polygon approximation via `cv.approxPolyDP`) fail because they are bound to the integer pixel grid and suffer from **Centroid Perspective Shift** (where the center of mass moves toward the wider edge of a tilted shape).

### The Solution: Macro-Edge Line Fitting
- **Contour Segmentation**: The 7x7 finder pattern contours are segmented into four distinct edges.
- **End-Pixel Trimming**: The outermost 15% of pixels on every edge are discarded to eliminate "corner rounding" artifacts caused by laser etching or lens diffraction.
- **Huber Regression**: Lines are fitted using `cv.fitLine` with `cv.DIST_HUBER`. This M-estimator provides robust resistance to specular glint reflections common on metallic surfaces.
- **Algebraic Intersection**: Sub-pixel corner coordinates are calculated via the mathematical intersection of the fitted line equations ($Ax + By + C = 0$).

### Robust Estimators: RANSAC vs. Huber
While Huber regression handles "heavy-tailed" noise (like specular glints on steel), **RANSAC (Random Sample Consensus)** is utilized for global outlier rejection when multi-path reflections or surface scratches create false macro-edges.
- **Reference**: [https://gemini.google.com/share/7c10b405a1b8](https://gemini.google.com/share/7c10b405a1b8)

## 3. Geometric Metrics for Validation
Success is measured by geometric truth rather than visual aesthetics:
- **MACE (Mean Average Corner Error)**: The Euclidean distance (in pixels) between detected sub-pixel corners and the known ground truth. Targets must be $<0.5$ pixels.
- **Cross-Ratio Deviation**: Utilizing the 1:1:3:1:1 ratio of the finder patterns as a projective invariant. Deviation $>5\%$ indicates an invalid homography anchor.

## 4. Sampling Architecture: Inverse Homography Mapping
To prevent **Interpolation Bleed** (where `warpPerspective` blends adjacent colors via bilinear interpolation), the system uses Inverse Mapping:
- The system calculates the inverse Homography matrix ($H^{-1}$).
- It projects the "perfect" center coordinates of the grid backward into the raw, un-warped source image.
- Pixels are sampled directly from the raw sensor data at those sub-pixel floating-point locations.

## 5. Hybrid AI Route
The system includes a Deep Homography Estimation network (CNN) built in TensorFlow.js:
- **Architecture**: VGG-style CNN regressor with a linear output layer (8 units).
- **Objective**: Regress the 8 degrees of freedom of the homography matrix directly from pixels.
- **Purpose**: To handle high-noise or blurred scenarios where traditional edge detection fails.

## 6. Known Challenges & Context
- **Material Constraints**: SS304 stainless steel is highly reflective; lighting must be managed via robust regression.
- **Posture Gatekeeping**: The UI must reject "too-trapezoidal" frames (side-length ratio $>1.15$) to prevent non-linear error propagation from extreme angles.
  - **Reference**: [https://gemini.google.com/share/8bcd93069d0b](https://gemini.google.com/share/8bcd93069d0b)
- **WASM Environment**: OpenCV.js runs in a WebAssembly environment; memory management (explicitly calling `.delete()` on Mats) is critical.

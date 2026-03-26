# Deep Homography: From Heuristics to Neural Networks

A technical guide through the transition from traditional, heuristic-based OpenCV solvers to Deep Learning-based homography estimation in the browser.

## Course Modules

### [Module 01: The Pathology of Perspective Distortion](file:///Users/richardbailey/RichardClaude/webartests/learning-vps/learning-deep-homography/modules/01-distortion-pathology.html)
- Centroid Perspective Shift (`cv.moments`).
- Aliasing and the "Ripple Effect" on 21x21 grids.
- Status: [x] Completed

### [Module 02: Introduction to Deep Homography Estimation](file:///Users/richardbailey/RichardClaude/webartests/learning-vps/learning-deep-homography/modules/02-deep-homography-intro.html)
- Handcrafted vs. Neural Features.
- The 8-DOF regression concept.
- Status: [x] Completed

### [Module 03: Sub-Pixel Accuracy via Neural Networks](file:///Users/richardbailey/RichardClaude/webartests/learning-vps/learning-deep-homography/modules/03-subpixel-networks.html)
- Continuous Regression vs. Discrete Classification.
- Corner localization via heatmaps (LSCCL).
- Status: [x] Completed

### [Module 04: Infinite Synthetic Data Generation](file:///Users/richardbailey/RichardClaude/webartests/learning-vps/learning-deep-homography/modules/04-synthetic-data.html)
- Using `OffscreenCanvas` for labeled training data.
- Randomization strategies and mathematical warping.
- Status: [x] Completed

### [Module 05: Building the CNN with TensorFlow.js](file:///Users/richardbailey/RichardClaude/webartests/learning-vps/learning-deep-homography/modules/05-cnn-architecture.html)
- Input normalization and VGG-style stacking.
- The Regression Head (8-unit dense layer).
- Status: [x] Completed

### [Module 06: The Training Loop and Live Visualization](file:///Users/richardbailey/RichardClaude/webartests/learning-vps/learning-deep-homography/modules/06-training-loop.html)
- Adam optimizer and MSE loss.
- Asynchronous training with `tf.tidy()` and `tfjs-vis`.
- Status: [x] Completed

### [Module 07: Inference and Inverse Mapping](file:///Users/richardbailey/RichardClaude/webartests/learning-vps/learning-deep-homography/modules/07-inference-inverse-mapping.html)
- Moving from `model.predict()` to `cv.getPerspectiveTransform`.
- Precision colorimetry via inverse mapping.
- Status: [x] Completed

### [Module 08: Tuning the Learning Rate & Loss Functions](file:///Users/richardbailey/RichardClaude/webartests/learning-vps/learning-deep-homography/modules/08-tuning-optimizer.html)
- Plateau pathologies and the "average shape" collapse.
- Learning rate schedules and Huber Loss vs. MSE.
- Normalization verification and output activation ('linear').
- Status: [x] Completed

## Progress
| Module | Status | Completed At |
| :--- | :--- | :--- |
| 1: Distortion | [x] Completed | 2026-03-25 |
| 2: Intro | [x] Completed | 2026-03-25 |
| 3: Sub-Pixel | [x] Completed | 2026-03-25 |
| 4: Synthetic | [x] Completed | 2026-03-25 |
| 5: Architecture | [x] Completed | 2026-03-25 |
| 6: Training | [x] Completed | 2026-03-25 |
| 7: Inference | [x] Completed | 2026-03-25 |
| 8: Tuning | [x] Completed | 2026-03-25 |

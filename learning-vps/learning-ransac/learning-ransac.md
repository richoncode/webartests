# Mastering the 16-Point RANSAC Homography Framework in Non-Central Vision Systems

This document details the learning plan for professional practitioners to master the 16-point RANSAC homography framework.

## Curriculum Overview

### Module 1: Foundational Projective Geometry and Homogeneous Coordinates
- Transition from Euclidean space to the projective plane $\mathbb{P}^2$.
- Introduction of homogeneous coordinates $\mathbf{x} = [x, y, 1]^T$.
- **Interactive Tutorial:** The Projective Canvas (manipulate a virtual pinhole camera).
- [x] Status: Completed

### Module 2: The Homography Transformation and Geometric Constraints
- The $3 \times 3$ matrix $H$ with 8 degrees of freedom.
- Dependency on camera intrinsics ($K$), relative rotation ($R$), and plane parameters ($\mathbf{n}, d$).
- **Interactive Tutorial:** The Degrees of Freedom Visualizer (slider-based adjustment of $H$).
- [x] Status: Completed

### Module 3: Direct Linear Transformation (DLT) for Linear Estimation
- Solving $\mathbf{x}' \times H\mathbf{x} = \mathbf{0}$.
- Singular Value Decomposition (SVD) for noisy data.
- **Interactive Tutorial:** Matrix Constructor (drag coordinate values into the DLT matrix).
- [x] Status: Completed

### Module 4: Numerical Conditioning and Hartley Normalization
- Impact of high-resolution coordinates on matrix stability.
- The Hartley normalization procedure.
- **Interactive Tutorial:** The Normalization Switch (compare alignment with and without normalization).
- [x] Status: Completed

### Module 5: Robust Estimation via RANSAC
- Handling outliers from automatic feature matching (SIFT, ORB).
- Statistical guarantees and iteration count $N$.
- **Interactive Tutorial:** The RANSAC Playground (adjust $N$ and $\epsilon$ to filter outliers).
- [x] Status: Completed

### Module 6: Generalized Camera Models and Non-Central Vision
- Moving from single lenses to multi-camera rigs.
- Plücker coordinates and the Generalized Epipolar Constraint (GEC).
- **Interactive Tutorial:** The Multi-Camera Rig Sim (drag a car with 4 fisheye cameras).
- [x] Status: Completed

### Module 7: The 16-Point Paradigm
- Minimal solvers vs. overdetermined precision.
- Applying 16 points for linear motion estimation in GCM.
- **Interactive Tutorial:** The Precision Benchmark (register satellite images with 4-16 points).
- [x] Status: Completed

### Module 8: Non-Linear Refinement and the Levenberg-Marquardt Algorithm
- Minimizing geometric reprojection error.
- Industry standard LM algorithm for "gold-standard" results.
- **Interactive Tutorial:** The LM Descent (visualize the ball rolling down the error surface).
- [x] Status: Completed

### Module 9: The Limits of Traditional CV & Neural Hint
- Why deterministic solvers (OpenCV) fail in real-world noise/blur.
- The concept of "The Breaking Point" in sub-pixel detection.
- **The Neural Hint:** Deep Homography estimation using CNNs and Transformers.
- **Interactive Tutorial:** The Sub-Pixel Stress Test (test the reliability of 16-point solvers under distortion).

## Progress tracker
| Module | Status | Completed At |
| :--- | :--- | :--- |
| 1: Projective Geometry | [x] Completed | 2026-03-25 |
| 2: Homography Matrix | [x] Completed | 2026-03-25 |
| 3: DLT Estimation | [x] Completed | 2026-03-25 |
| 4: Normalization | [x] Completed | 2026-03-25 |
| 5: RANSAC | [x] Completed | 2026-03-25 |
| 6: GCM & Non-Central | [x] Completed | 2026-03-25 |
| 7: 16-Point Paradigm | [x] Completed | 2026-03-25 |
| 8: LM Refinement | [x] Completed | 2026-03-25 |
| 9: Neural Hint | [/] In Progress | - |

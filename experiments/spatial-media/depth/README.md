# Lumina Depth Documentation

This directory contains the core logic for the Lumina Spatial Gallery's monocular depth-estimation pipeline.

## Architecture

The system operates in a two-tier generative model:
1.  **Stage 1: Predicted (ML)**: The primary ground truth derived from monocular models (e.g., DepthAnything V2).
2.  **Stage 2: Depth Effects (Post-Processed)**: Specialized spatial filters that use the ML ground truth to simulate architectural paradigms (SAM, MPI, Diffusion, etc.).

---

## Local Regeneration Guide

If you need to update the **SAM (Segment)** depth assets across the entire catalog (e.g., after an algorithm improvement), follow these steps:

### 1. Terminal Setup
Open your terminal and navigate to the project root:
```bash
cd /Users/richardbailey/RichardClaude/webartests
```

### 2. Activate the Environment
Lumina uses a dedicated Python environment for high-fidelity depth processing:
```bash
source experiments/spatial-media/venv/bin/activate
```

### 3. Run the SAM Regeneration Script
Execute the standalone batch script to update the `segment/` strategies:
```bash
python3 experiments/spatial-media/depth/scripts/regenerate_sam.py
```

### 4. Verify & Refresh
-   Check the output in your terminal for any skipping or errors.
-   Return to the **Lumina Spatial Gallery** in your browser.
-   Perform a **Hard Refresh (Cmd+Shift+R)** to purge cached assets and see the new high-fidelity SAM depth maps.

---

## Technical Audit
-   **Ground Truth**: Located in `strategies/predicted/`.
-   **SAM Effects**: Located in `strategies/segment/`.
-   **Algorithm Logic**: Defined in `scripts/depth_generator.py`.

########################################
# !!! REMINDER: Hard Refresh (Cmd+Shift+R) !!! #
########################################

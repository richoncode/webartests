# XCS Module Manual Test Loop

This document outlines the procedure for verifying the `xcs-module` output against the official xTool XCS Studio software.

## Test Objective
Verify that the generated `.xcs` file (JSON structure) correctly maps to the expected physical geometry and laser parameters in XCS Studio.

## Test Procedure

### 1. Generate Test Assets
1. Open the [XCS Module Validation Tool](file:///Users/richardbailey/RichardClaude/webartests/laser-experiments/xcs-module/index.html).
2. Ensure all unit tests are passing (11/11).
3. Click the **"Test Export (PNG + XCS)"** button in the top header.
4. This will trigger two simultaneous downloads with a dynamic timestamp (e.g., `XCSTestApr3-0036`):
   - `XCSTest[Timestamp].png` (The web-based ground truth)
   - `XCSTest[Timestamp].xcs` (The hardware-compliant project file)

### 2. Physical Verification (XCS Studio)
1. Open **xTool XCS Studio**.
2. Select **File > Open** and choose the downloaded `.xcs` file.
3. Verify the following:
   - **Canvas Size**: Should be 100x100mm.
   - **Geometry**: Comparison between the XCS view and the downloaded PNG.
   - **Layers**: Check that Power/Speed parameters match the dashboard popovers.
   - **Bitmap**: Verify the 64x64 grayscale gradient is visible and high-contrast in "Color Engrave" mode.

### 3. Comparison Loop
1. Take a screenshot of the XCS Studio workspace.
2. Provide the screenshot for visual comparison against the `XCSTest[Timestamp].png` ground truth.

## Version Control
- **Baseline**: VANTAGE-ALPHA (Locked 2026-03-18)
- **Target Hardware**: xTool F2 (Diode/Fiber)

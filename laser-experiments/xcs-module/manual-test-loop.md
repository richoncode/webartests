# XCS Module Manual Test Loop

This document outlines the procedure for verifying the `xcs-module` output against the official xTool XCS Studio software.

## Test Objective
Verify that the generated `.xcs` file (JSON structure) correctly maps to the expected physical geometry and laser parameters in XCS Studio.

## Test Procedure

### 1. Generate Test Assets
1. Open the [XCS Module Validation Tool](file:///Users/richardbailey/RichardClaude/webartests/laser-experiments/xcs-module/index.html).
2. Ensure both test tabs are passing: **Unit Tests 8/8** and **Render Tests 7/7**.
   The seven checks that measure rendered position — CLOSED_PATH, SPIRAL, COMPOUND,
   COMPOUND_REV, FRAME, CAPSULE_STROKE, ARC_SAMPLE — now live under the Render Tests
   tab as the *Geometry Baseline* project, since they test where a shape landed rather
   than whether the file is structurally correct.
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

### 4. Technique & Scale Verification
The 4 tests added after the original 11 (CAPSULE_STROKE, ARC_SAMPLE, COLOR_FLATTEN,
SCALE_STRESS) prove techniques that Shape Fill's `gears` style relies on heavily but
that were never previously exercised by this loop — a filled round-capped "capsule"
polygon standing in for a variable-width stroke, a circle built from programmatically
sampled points rather than a hand-typed arc command, and a project dense enough to
approach `gears`'s real scale (4,300+ items; this dashboard's own project used to
top out at 13). The in-browser tests only prove the JS model/renderer handle these —
this step is what actually proves it on hardware/software:
1. Click **"Test Export (Stress)"** — downloads `XCSStressTest[Timestamp].xcs`, a
   1,000-item grid of small rectangles.
2. Open it in **xTool XCS Studio** (File > Open). Confirm it imports without
   truncation, errors, or a hang, and that the full 1,000-item grid renders and
   counts correctly in the layer/item list.
3. Visually spot-check the CAPSULE_STROKE (a small filled rounded-rectangle-like
   shape) and ARC_SAMPLE (a circle) shapes from the main `XCSTest[Timestamp].xcs`
   file against their positions in the dashboard/PNG — the in-browser placement
   check (via `verifyGeometry`, see `index.html`) already confirms these
   programmatically, but this loop's whole point is a real, physical open-in-XCS-
   Studio pass, not just an in-browser assertion.

## Version Control
- **Baseline**: VANTAGE-ALPHA (Locked 2026-03-18)
- **Target Hardware**: xTool F2 (Diode/Fiber)
- **Coverage note**: as of 2026-08-04, the dashboard covers 15 tests (11 original +
  4 new: CAPSULE_STROKE, ARC_SAMPLE, COLOR_FLATTEN, SCALE_STRESS) and the 5
  PATH-shaped tests (CLOSED_PATH, SPIRAL, COMPOUND, COMPOUND_REV, FRAME) now also
  verify actual rendered placement (via `getBoundingClientRect()` through the SVG's
  CTM), not just structural flags. The "Locked 2026-03-18" baseline predates this
  wider coverage — update this date only after a fresh physical round-trip
  (Steps 2-4 above) has actually been completed against it.

# Pattern Tool (Laser Pattern Generator)

This file defines foundational mandates and instructional context for Gemini CLI when working on the Laser Pattern Generator module. These instructions take absolute precedence over general defaults.

## 1. Hardware Constraints (xTool F2 - VANTAGE-ALPHA)
- **Source of Truth:** `laser-experiments/pattern-tool/xcsformat.md`.
- **Working Surface:** The machine surface is defined as **0,0 to 100,100mm**.
- **Centering Rule:** All generated patterns MUST be centered on **50,50mm** by default.
- **Typography:** Mandatory `charJSONs` (baked paths) and `fontData` (metrics) for XCS 2.0 compatibility.
- **Anchoring:** All text/labels MUST use **Left-Baseline** anchoring as per the hardware baseline.
- **Color Fills:** Use `COLOR_FILL_ENGRAVE` (or the abstracted `isFill: true`) for shapes requiring area processing.

## 2. Architecture Overview
- **Location:** `laser-experiments/pattern-tool/`
- **Entry Point:** `js/main.js` (Pattern Registry and DOM initialization).
- **Core Manager:** `js/app.js` (Central state object: `palettes`, `tabs`, `activeTabId`, `instances`).
- **Tab Lifecycle:** `js/tabs.js` (Handles creation, activation, and management of individual pattern tabs).
- **UI Components:** `js/components/` (Isolated tab logic: `mandala-tab.js`, `fractal-tab.js`, etc.).
- **SVG/JSON Viewer:** `js/viewer.js` (Synchronized dual-view for SVG preview and raw XCS JSON inspection).
- **Export Logic:** `js/xcs-exporter.js` & `js/xcs-system.js` (Converts geometric coordinates to xTool F2-compatible JSON).

## 3. UX Normalization Mandates
- **General Settings Module:** All pattern panels MUST use `UI.makeGeneralSettingsSection`. The field order is: **Size, Palette, Color, Mode, Border**.
- **Color Range Support Rule:** A pattern MUST support color ranges if it consists of **multiple discrete elements** that can be algorithmically indexed (e.g., cells in Voronoi, rings in Mandala, recursion levels in Fractals). This is enabled by passing `supportColorRange: true` to `makeGeneralSettingsSection`.
  - The module renders a unified "Color" row with an **[AUTO]** toggle. When ON (`colorRangeMode: true`), it shows Start and End pickers. When OFF, it acts as a single Start Color.
  - **Manual Override Interaction:** If a pattern tab exposes individual UI rows for its elements (e.g., "Ring 1 Color"), interacting with that specific element's color picker MUST set `cfg.colorRangeMode = false`. This breaks the global Auto loop, indicating manual control.
- **Specifics Section:** All mathematical parameters specific to the algorithm must be placed in a subsequent section named after the pattern (e.g., 'Dragon Curve Settings').
- **Overall Size:** The General Settings module automatically handles the "Size" parameter.
- **Fill/Path Toggles:** The General Settings module automatically handles the Fill/Path mode toggle, ensuring predictable UI across all 100 patterns.
  - **Fill Mode:** Uses `COLOR_FILL_ENGRAVE` (scanning).
  - **Path Mode:** Uses `VECTOR_ENGRAVING` (line-following).

## 4. Maintenance Mandates
- **Registry Integrity:** All new patterns must be added to `PATTERNS` in `main.js`.
- **Naming:** New tabs must use the automatic timestamped naming convention (handled by `TabMgr`).
- **Abstractions:** NEVER hardcode `COLOR_FILL_ENGRAVE` strings in components; use the `isFill` abstraction in `XCSExporter`.

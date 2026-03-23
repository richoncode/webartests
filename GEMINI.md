# GEMINI.md

This file provides foundational mandates and instructional context for Gemini CLI when working in the `webartests` workspace. These instructions take absolute precedence over general defaults.

## Project Overview
`webartests` is a collection of high-fidelity, interactive web-based educational modules and experiments. The primary focus is the **"Learning Lasers"** curriculum, which explains the physics and practical techniques of fiber and diode laser engraving (specifically for xTool F2 hardware).

### Core Architecture
- **No-Build System:** All demos are self-contained, single-file HTML pages with inline CSS and JavaScript.
- **Static Assets:** External libraries (A-Frame, Three.js, etc.) are loaded exclusively from CDNs. No `package.json` or `node_modules` should be introduced.
- **Directory Structure:** The root `index.html` acts as a central hub (card grid) linking to individual demo directories (e.g., `learning-lasers/`, `ar-cube-placer/`, `webgl-shader/`).

## Style Guide & UI Mandates
Rigorously adhere to the design tokens defined in `style-guide/index.html`:
- **Dark Mode Only:** Background `#0d0d0d`, cards `#1a1a1a`, card borders `1px solid #2a2a2a`, radius `16px`.
- **Typography:** System fonts (`-apple-system`, `BlinkMacSystemFont`). Monospace for data: `'SF Mono'`, `'Fira Code'`.
- **Accent Palette:**
  - Primary Blue: `#5b9bd5`
  - Emerald/Success: `#10b981`
  - Amber/Warning: `#f59e0b` / `#fbbf24`
  - Violet/Density: `#8b5cf6`
  - Red/Alert: `#e74c3c` / `#f87171`
- **Navigation:** Every sub-page must include a `← Back` link (color `#555`, hover `#aaa`, 14px) to its parent directory.

## Domain Knowledge: Learning Lasers (xTool F2)
When modifying or creating laser educational content, respect these physical constants and hardware specs:

### 1. Hardware Specs
- **IR Laser:** 1064nm Fiber, 0.03mm (30µm) circular spot.
- **Blue Diode:** 455nm, 0.08 x 0.06mm rectangular spot.
- **Perfect Fill:** IR requires ~333 LPCM (Lines Per Centimeter) to avoid gaps. Blue Diode requires ~166 LPCM scanning horizontally.

### 2. Physics & Metrics
- **Energy Density ($J/mm^2$):** The fundamental control variable. Calculated from Power, Speed, and Density.
- **Speed Curve:** 1/x reciprocal (inverse) relationship. Dropping speed linearly increases energy dose.
- **Thermal Return Time:** The ms elapsed before the laser returns to the same line. Small designs (<2mm) have return times <10ms, causing extreme heat compounding.
- **Surface Morphology:**
  - **Rich:** Specular colors from smooth thin-film oxidation.
  - **Frosted:** Diffuse pastels from micro-pitting/roughening.
  - **Burnt:** Surface exceeds the thermal diffusion limit, destroying the oxide layer.

### 3. Simulation Standards
- **Thermal Maps:** Use additive blending (`globalCompositeOperation = 'lighter'` or `'screen'`) to show heat accumulation.
- **Color Mapping:** Map thermal intensity to the **Green → Amber → Red** palette to match the "Peak Heat Stress" UI gauge.

## Reusable Modules
The project includes a modular thermal simulation engine for laser material processing experiments. These modules are located in `laser-order-strategies/js/`.

### 1. `HeatSimulator.js`
A physics-based thermal engine that handles heat accumulation and conduction.
- **Configurable Physics:** `diffusionRate` (k), `decayRate`, `splashFactor`.
- **State Tracking:** Per-pixel current heat and peak heat; etched state tracking.
- **Methods:** `addHeat(x, y, intensity)`, `step()`, `reset()`, `getStats()`.

### 2. `PathStrategies.js`
A collection of scan path generation algorithms.
- **Deterministic Paths:** `horizontal`, `diagonal`, `triphase`, `hilbert`.
- **Stochastic Paths:** `quadrant`, `dispersive` (Bit-Reverse).
- **Usage:** `PathStrategies.generatePath(mode, gridSize, bucketIdx)`.

### 3. `HeatRenderer.js`
A dedicated renderer for thermal simulation data.
- **Modes:** Supports visual overlays for active heat, persistent peak heat, and path sectors (buckets).
- **Customizable:** Adaptable color palettes and thresholds.

## Development Workflow
- **Local Server:** Serve via `python3 -m http.server 8080` or `npx serve .`.
- **AR Testing:** Requires HTTPS (use `npx localtunnel` or `Cloudflare Tunnel`) for camera access on real devices.
- **Modifications:** Always perform "surgical" updates to single-file HTML pages. Ensure CSS and JS remain inline unless a shared utility is explicitly requested.
- **Validation:** When fixing bugs in simulations (e.g., coordinate mapping in `engraving-modes/`), prioritize empirical verification of the rendering logic and coordinate math.

## Pattern Tool (Laser Pattern Generator)
### 1. Architecture Overview
- **Location:** `laser-experiments/pattern-tool/`
- **Entry Point:** `js/main.js` (Pattern Registry and DOM initialization).
- **Core Manager:** `js/app.js` (Central state object: `palettes`, `tabs`, `activeTabId`, `instances`).
- **Tab Lifecycle:** `js/tabs.js` (Handles creation, activation, and management of individual pattern tabs).
- **UI Components:** `js/components/` (Isolated tab logic: `mandala-tab.js`, `fractal-tab.js`, etc.).
- **SVG/JSON Viewer:** `js/viewer.js` (Synchronized dual-view for SVG preview and raw XCS JSON inspection).
- **Export Logic:** `js/xcs-exporter.js` (Converts geometric coordinates to xTool F2-compatible JSON).

### 2. State & Persistence
- **Instance State:** `App.instances[tabId]` stores the `cfg` (control parameters) and `state` (generated shapes and raw JSON).
- **Persistence:** `js/persistence.js` syncs the tab list and their configurations to `localStorage`. Supports `.rnr` file export/import for individual pattern settings.

### 3. Current State (March 23, 2026)
- **Refactor Status:** In-progress migration to a **Registry-Based** system (supported by a multi-column grid menu in `js/utils.js`).
- **Known Issues:** The "glue" logic in `app.js` (`App.init`, `App.addTab`) and `persistence.js` (`Persistence.restore`) is currently missing/broken in the working directory compared to the stable `HEAD`.
- **Roadmap:** Aiming for 100 mathematical/geometric patterns (currently ~44 implemented).

### 4. Hardware Constraints (VANTAGE-ALPHA)
- **Source of Truth:** `laser-experiments/pattern-tool/xcsformat.md`.
- **Typography:** Mandatory `charJSONs` (paths) and `fontData` (metrics) for XCS 2.0 compatibility.
- **Anchoring:** All text/labels MUST use **Left-Baseline** anchoring as per the hardware baseline.
- **Color Fills:** Use `COLOR_FILL_ENGRAVE` for shapes requiring area processing.

### 6. UX Normalization Mandates
- **General Settings Module:** All pattern panels MUST use `UI.makeGeneralSettingsSection`. The field order is: **Size, Palette, Color, Mode, Border**.
- **Color Range Support Rule:** A pattern MUST support color ranges if it consists of **multiple discrete elements** that can be algorithmically indexed (e.g., cells in Voronoi, rings in Mandala, recursion levels in Fractals). This is enabled by passing `supportColorRange: true` to `makeGeneralSettingsSection`.
  - The module renders a unified "Color" row with an **[AUTO]** toggle. When ON (`colorRangeMode: true`), it shows Start and End pickers. When OFF, it acts as a single Start Color.
  - **Manual Override Interaction:** If a pattern tab exposes individual UI rows for its elements (e.g., "Ring 1 Color"), interacting with that specific element's color picker MUST set `cfg.colorRangeMode = false`. This breaks the global Auto loop, indicating manual control.
- **Specifics Section:** All mathematical parameters specific to the algorithm must be placed in a subsequent section named after the pattern (e.g., 'Dragon Curve Settings').
- **Overall Size:** The General Settings module automatically handles the "Size" parameter.
- **Fill/Path Toggles:** The General Settings module automatically handles the Fill/Path mode toggle, ensuring predictable UI across all 100 patterns.
  - **Fill Mode:** Uses `COLOR_FILL_ENGRAVE` (scanning).
  - **Path Mode:** Uses `VECTOR_ENGRAVING` (line-following).

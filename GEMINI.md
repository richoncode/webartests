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
- **Speed Curve:** $1/x$ non-linear relationship. Dropping speed exponentially increases energy dose.
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

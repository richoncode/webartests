# GEMINI.md

This file provides foundational mandates and instructional context for Gemini CLI when working in the `webartests` workspace. These instructions take absolute precedence over general defaults.

## Project Overview
`webartests` is a collection of high-fidelity, interactive web-based educational modules and experiments. The primary focus is the **"Learning Lasers"** curriculum, which explains the physics and practical techniques of fiber and diode laser engraving (specifically for xTool F2 hardware).

### Core Architecture
- **No-Build System:** All demos are self-contained, single-file HTML pages with inline CSS and JavaScript.
- **Static Assets:** External libraries (A-Frame, Three.js, etc.) are loaded exclusively from CDNs. No `package.json` or `node_modules` should be introduced.
- **Directory Structure:** The root `index.html` acts as a central hub (card grid) linking to individual demo directories (e.g., `learning-lasers/`, `ar-cube-placer/`, `webgl-shader/`).

## Style Guide & UX Mandates
Rigorously adhere to the design tokens and patterns established in the interactive modules:

### 1. Visual Standards
- **Dark Mode Only:** Background `#0d0d0d`, cards `#1a1a1a`, card borders `1px solid #2a2a2a`, radius `16px`.
- **Text Legibility:** Body text should be `#ddd`, subtitles/labels `#aaa`. 
- **Accent Palette:**
  - Primary Blue: `#5b9bd5`
  - Emerald/Success: `#10b981`
  - Amber/Warning: `#f59e0b` / `#fbbf24`
  - Violet/Density: `#8b5cf6`
  - Red/Alert: `#e74c3c` / `#f87171`
- **Navigation:** Every sub-page must include a `← Back` link (color `#888`, hover `#fff`, 14px) at the top.

### 2. UX Design Patterns
- **Interactivity (Tooltips):** 
    - Use `tooltip-trigger` for all technical parameters and stat labels.
    - Text-based triggers use `.text-hint` (dashed underline `#666`) to indicate hoverability.
    - Buttons use tooltips without underlines to maintain clean UI.
    - **Content:** Tooltips must explain physical interactions (e.g., "Small size + High Passes = Runaway Heat").
- **Precision (Editable Values):** 
    - Important numerical values (like LPC) must be clickable (`.editable-val`) to enable direct-entry input fields.
    - Provide immediate synchronization with sliders and physical simulations.

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
- **Scanning Default:** Scanning MUST default to **top-to-bottom** (Y-down) to match standard hardware behavior.
- **Multi-pass Effects:** Each pass compounds heat and increases **oxide layer** thickness, potentially shifting the interference color spectrum (e.g., Gold to Blue).

### 3. Simulation Standards
- **Thermal Maps:** Use additive blending (`globalCompositeOperation = 'lighter'` or `'screen'`) to show heat accumulation.
- **Color Mapping:** Map thermal intensity to the **Green → Amber → Red** palette to match the "Peak Heat Stress" UI gauge.
- **Orchestration:** Use `sim.processStep()` for animation and `sim.processInstant()` for rapid exploration.

## Reusable Modules
The project includes a modular thermal simulation engine in `laser-order-strategies/js/`.

### 1. `HeatSimulator.js`
A physics-based thermal engine handling accumulation, conduction, and time estimation.
- **Key Methods:** `processStep(path, intensity)`, `processInstant(path, intensity)`, `isStable()`, `estimateJobTime(lpc, size, dir, pat, passes)`.

### 2. `PathStrategies.js`
Generates hardware-accurate scan paths.
- **Constraint:** All strategies (Deterministic & Stochastic) must follow top-to-bottom progression.

### 3. `HeatRenderer.js`
Standardized visualization for thermal data and laser blooms.

## Development Workflow
- **Local Server:** Serve via `python3 -m http.server 8080`.
- **Modifications:** Always perform "surgical" updates to single-file HTML pages.
- **Validation:** Task is complete ONLY when physical accuracy and UX standards are verified.

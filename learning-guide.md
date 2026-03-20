# Learning Lasers: Interactive Module Guide
This guide defines the design patterns and pedagogical standards for the "Physics of the Beam" 18-module learning sequence.

## 1. Visual Standards (VANTAGE-ALPHA)
- **Background:** Strictly `#0d0d0d`.
- **Cards:** `#1a1a1a` with `1px solid #2a2a2a` borders.
- **Typography:** System fonts for UI; `'SF Mono'` or `'Fira Code'` for all physical data and math readouts.
- **Color Accents:**
  - **Primary:** `#5b9bd5` (Blue)
  - **Success:** `#10b981` (Emerald)
  - **Warning:** `#f59e0b` (Amber)
  - **Critical/Failure:** `#e74c3c` / `#f87171` (Red)

## 2. Interactive Loop: Failure → Concept → Success
Every module must follow this strict three-act structure:

### Act I: The Bug (Failure Path)
- **Objective:** Force the user to encounter the physical limit.
- **Example:** Setting LPCM too low resulting in "White Striping."
- **Visual:** Show the "Bad" result clearly on the canvas. Disable the "Next" button until this state is witnessed.

### Act II: The Physics (The "Why")
- **Objective:** Explain the underlying first principle.
- **Implementation:** Use hover popovers over units and key terms.
- **Content:** Show the math (e.g., $E = P / (S \times w)$) in a `.math-box` component.

### Act III: The Fix (Success Path)
- **Objective:** User applies the correct parameter to achieve "Green."
- **Feedback:** The UI should transition to the Emerald accent color.
- **Validation:** "Green" status on the Peak Heat Stress gauge.

## 3. Core Components
- **The Viz-Layout:** A 2-column grid. Left: 1:1 aspect ratio `<canvas>`. Right: 280px-320px control panel.
- **The Metric Card:** A small card showing live data (e.g., *Fluence: 0.16 $J/mm^2$*).
- **The Heat Gauge:** A horizontal gradient bar showing thermal stress from Green (Safe) to Red (Critical).
- **Hover Popovers:** Use `data-tooltip` attributes for all technical terminology.

## 4. Technical Implementation
- **No-Build:** Self-contained single-file HTML.
- **Physics-First:** Always use real-world constants (F2 spot size: 0.03mm, IR wavelength: 1064nm).
- **Additive Rendering:** Use `ctx.globalCompositeOperation = 'lighter'` for heat maps to show accumulation.
- **Coordinate Sync:** Use the VANTAGE-ALPHA baseline (Baseline-Left anchor for text).

## 5. Navigation Mandate
- Every page must include a `← Back` link to the parent directory (`color: #555`, hover: `#aaa`).
- Include `Chapter Nav` at the bottom for "Previous" and "Next" module progression.

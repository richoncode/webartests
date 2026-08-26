# Pattern Tool: Master Pattern List (100 Pattern Goal)

This document tracks the implementation of mathematical and geometric generators for the Pattern Tool.

**Current Count: 102 / 100**
*(Note: [x] indicates the pattern is fully implemented. **[IN MENU]** indicates the category is active in the "+ Add Pattern" menu as of v1.2.3)*

---

## 1. Math & Symmetry [IN MENU] (23/23)
- [x] Dot Mandala (Original)
- [x] Flower of Life
- [x] Hypotrochoid
- [x] Superformula
- [x] Vesica Piscis
- [x] Maurer Rose
- [x] Spirograph
- [x] Metatron's Cube
- [x] Rose Curve
- [x] Archimedean Spiral
- [x] Fermat Spiral
- [x] Concentric Polygons
- [x] Hex Honeycomb
- [x] Islamic Star
- [x] Girih Tiling
- [x] Penrose P2
- [x] Penrose P3
- [x] Lissajous Curves
- [x] Chladni Patterns
- [x] Harmonograph
- [x] Truchet Tiling (Arcs)
- [x] Truchet Tiling (Squares)
- [x] Kaleidoscope

## 2. Fractals & Recursion [IN MENU] (22/22)
- [x] Sierpinski Gasket
- [x] Sierpinski Carpet
- [x] Koch Snowflake
- [x] Dragon Curve
- [x] Mandelbrot Set (Grid-Rects)
- [x] Julia Set
- [x] Pythagoras Tree
- [x] Menger Sponge (2D)
- [x] Vicsek Fractal
- [x] Barnsley Fern (IFS)
- [x] Apollonian Gasket
- [x] Levy C Curve
- [x] Cantor Set
- [x] T-Square Fractal
- [x] Fractal Tree (Recursive Branching)
- [x] Recursive Squares
- [x] Recursive Circles
- [x] Recursive Rectangles
- [x] Recursive Polygons
- [x] Recursive Stars
- [x] Sierpinski Pentagon (n-gasket variant)
- [x] Sierpinski Hexagon (n-gasket variant)
- [x] Cesàro Fractal

## 3. Space-Filling Paths [IN MENU] (19/19)
- [x] Hilbert Curve
- [x] Peano Curve
- [x] Gosper Curve (Peano-Gosper)
- [x] Moore Curve (Hilbert-Moore Variant)
- [x] Sierpinski Arrowhead
- [x] Lebesgue O-curve
- [x] Morton Curve (Z-order)
- [x] H-Tree
- [x] L-System Grid
- [x] Dragon Folding
- [x] Lindenmayer (L-System) Plant
- [x] Sierpinski Curve (Square variant)
- [x] L-System Algae
- [x] Koch Island
- [x] FASS Curve
- [x] L-System Cross
- [x] Minkowski Sausage
- [x] Quadratic Snowflake
- [x] Terdragon Curve

## 4. Chaotic Attractors [IN MENU] (15/15)
- [x] Lorenz Attractor
- [x] Rossler Attractor
- [x] Clifford Attractor
- [x] Peter de Jong Attractor
- [x] Bedhead Attractor
- [x] Ikeda Map
- [x] Hénon Map
- [x] Gumowski-Mira Map
- [x] Duffing Map
- [x] Chirikov Standard Map
- [x] Aizawa Attractor
- [x] Chen Attractor
- [x] Thomas Attractor
- [x] Gingerbreadman Map
- [x] Tinkerbell Map

## 5. Organic & Biological [IN MENU] (14/15)
- [x] Voronoi Tiling
- [x] Inscribed Circles (Circle Packing)
- [x] Spider Web (Improved Spiral variant)
- [x] Phyllotaxis Sunflower (Advanced)
- [x] Cellular Automata (Elementary)
- [x] Game of Life (Presets)
- [x] Perlin Noise Field (Flow Field)
- [x] Worley Noise
- [x] Diffusion Limited Aggregation (DLA)
- [x] Gray-Scott Reaction-Diffusion
- [x] Slime Mold (Physarum)
- [x] Biological Membrane simulation
- [x] Stippling (Weighted Voronoi variant)
- [ ] Gray-Scott spots (Advanced RD)
- [ ] Slime Mold (Vector variant)

## 6. Material & Technical [IN MENU] (9/11)
- [x] Palette Test (Grid + Power Labels)
- [x] Palette Grid (Power/Speed/Density)
- [x] Gradient Grid
- [x] Bitmap Line (Gray vs Power)
- [x] XCS Reference Test
- [x] Kerf Offset Test
- [x] Thermal Return Wall
- [x] Line Density Test (Custom Path Hatching)
- [x] Measurement Scale (Ruler)
- [ ] Focus Array (Z-step emulation)
- [ ] Air Assist / Burn Test
- [ ] Dithered QR Code (photo embedded via two-pass Floyd–Steinberg error diffusion — pass 1 dithers the image, pass 2 forces QR data-module pixels and diffuses the resulting error, relying on QR error correction to keep it scannable; ref: andrewt.net/dithered-qr-codes/wtf)

---

## Mandatory Engineering Checklist (Pre-Completion)
*Before marking any pattern as [x], the following must be verified:*

1. **Typography**: Does text use the `VANTAGE-ALPHA` derived constants? 
   - `scale = targetHeight / 23.35`
   - `fontSize = 72 * scale`
2. **Anchoring**: Is the anchor set to **Left-Baseline** (`align: "center"` or `"right"` must be manually calculated into the `x/y` coordinates)?
3. **Fills**: Are fill shapes using `COLOR_FILL_ENGRAVE`?
4. **Thinning**: If shapes > 2000, is a thinning or resolution guard implemented?
5. **Reference**: Have I checked `xcs-system.js` for the latest "Known Good" math for this pattern type?

6. **Hardware Export Audit**: Does the JSON output (visible in the JSON tab) contain ALL required fields from `xcsformat.md`? 
   - [x] Root: `extId: "GS006"`, `extName: "F2"`
   - [x] TEXT: `charJSONs` (Array of paths), `fontData` (Metrics/Glyphs)
   - [x] Device Tree: `COLOR_FILL_ENGRAVE` node with `customize` parameters

---

## Implementation Guidelines
- Every pattern marked with `[x]` MUST be present in the `PATTERNS` array in `js/main.js`.
- Patterns should prioritize vector paths (`XCSExporter.addPath`) to minimize laser jumps.
- High-iteration patterns (Attractors) must use thinning/capping to prevent XCS file bloat.

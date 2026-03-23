# Pattern Tool: Master Pattern List (100 Pattern Goal)

This document tracks the implementation of mathematical and geometric generators for the Pattern Tool.

**Current Count: 43 / 100**
*(Note: [x] indicates the pattern is fully implemented. **[IN MENU]** indicates the category is active in the "+ Add Pattern" menu as of v1.2.3)*

---

## 1. Math & Symmetry [IN MENU] (11/15)
- [x] Dot Mandala (Original)
- [x] Flower of Life
- [x] Metatron's Cube
- [x] Rose Curve
- [x] Archimedean Spiral
- [x] Fermat Spiral
- [x] Concentric Polygons
- [x] Hex Honeycomb
- [x] Islamic Star
- [x] Girih Tiling
- [x] Penrose P2
- [ ] Penrose P3
- [ ] Lissajous Curves
- [ ] Chladni Patterns
- [ ] Harmonograph

## 2. Fractals & Recursion [IN MENU] (10/15)
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
- [ ] Apollonian Gasket
- [ ] Levy C Curve
- [ ] Cantor Set
- [ ] T-Square Fractal
- [ ] Fractal Tree (Recursive Branching)

## 3. Space-Filling Paths [IN MENU] (10/15)
- [x] Hilbert Curve
- [x] Peano Curve
- [x] Gosper Curve
- [x] Moore Curve
- [x] Sierpinski Arrowhead
- [x] Lebesgue O-curve
- [x] Morton Curve (Z-order)
- [x] H-Tree
- [x] L-System Grid
- [x] Dragon Folding
- [ ] Lindenmayer (L-System) Plant
- [ ] Peano-Gosper Variant
- [ ] Hilbert-Moore Hybrid
- [ ] Adaptive Hilbert
- [ ] Quadtree Path

## 4. Chaotic Attractors [IN MENU] (7/15)
- [x] Lorenz Attractor
- [x] Rossler Attractor
- [x] Clifford Attractor
- [x] Peter de Jong Attractor
- [x] Bedhead Attractor
- [x] Ikeda Map
- [x] Hénon Map
- [ ] Gumowski-Mira Map
- [ ] Duffing Map
- [ ] Chirikov Standard Map
- [ ] Aizawa Attractor
- [ ] Chen Attractor
- [ ] Thomas Attractor
- [ ] Gingerbreadman Map
- [ ] Tinkerbell Map

## 5. Organic & Biological [IN MENU] (1/15)
- [x] Voronoi Tiling
- [ ] Turing Reaction-Diffusion (Grid)
- [ ] Gray-Scott spots
- [ ] Belousov-Zhabotinsky
- [ ] Diffusion Limited Aggregation (DLA)
- [ ] Phyllotaxis Sunflower (Advanced)
- [ ] Slime Mold (Physarum)
- [ ] Cellular Automata (Elementary)
- [ ] Conway's Game of Life (Still Lifes)
- [ ] L-System Algae
- [ ] Perlin Noise Field
- [ ] Worley Noise
- [ ] Reaction-Diffusion (Vector Paths)
- [ ] Stippling (Weighted Voronoi)
- [ ] Biological Membrane simulation

## 6. Material & Technical [IN MENU] (4/10)
- [x] Palette Grid (Power/Speed/Density)
- [x] Gradient Grid
- [x] Bitmap Line (Gray vs Power)
- [x] XCS Reference Test
- [ ] Focus Array (Z-step emulation)
- [ ] Thermal Return Wall
- [ ] Kerf Offset Test
- [ ] Hatch/Fill Density Step
- [ ] Air Assist / Burn Test
- [ ] Resolution/LPCM Micro-test

---

## Implementation Guidelines
- Every pattern marked with `[x]` MUST be present in the `PATTERNS` array in `js/main.js`.
- Patterns should prioritize vector paths (`XCSExporter.addPath`) to minimize laser jumps.
- High-iteration patterns (Attractors) must use thinning/capping to prevent XCS file bloat.

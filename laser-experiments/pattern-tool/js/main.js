import { App } from './app.js';
import { Persistence } from './persistence.js';
import { UI } from './utils.js';
import { 
  MandalaTab, GeometryTab, FractalTab, PathTab, AttractorTab, 
  VoronoiTab, PaletteTestTab, GradientTab, MathTab, TabMgr,
  PaletteGridTab, HilbertTab
} from './tabs.js';

// Dependency Injection
App.TabMgr = TabMgr;

const PATTERNS = [
  // Math & Symmetry
  { id: 'mandala', label: 'Dot Mandala', cat: 'Math & Symmetry', comp: MandalaTab, icon: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><circle cx="7" cy="7" r="2"/></svg>' },
  { id: 'fol', label: 'Flower of Life', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'flower-of-life' }, icon: '🝊' },
  { id: 'metatron', label: "Metatron's Cube", cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'metatrons-cube' }, icon: '⌬' },
  { id: 'rose', label: 'Rose Curve', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'rose-curve' }, icon: '✿' },
  { id: 'spiral', label: 'Archimedean Spiral', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'archimedean-spiral' }, icon: '🌀' },
  { id: 'fermat', label: 'Fermat Spiral', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'fermat-spiral' }, icon: '🌻' },
  { id: 'concentric', label: 'Concentric Polygons', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'concentric-polygons' }, icon: '⬔' },
  { id: 'honeycomb', label: 'Hex Honeycomb', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'honeycomb' }, icon: '⬢' },
  { id: 'islamic', label: 'Islamic Star', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'islamic-star' }, icon: '☪' },
  { id: 'girih', label: 'Girih Tiling', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'girih' }, icon: '⛬' },
  { id: 'penrose', label: 'Penrose P2', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'penrose' }, icon: '⧉' },
  
  // Fractals & Recursion
  { id: 'fractal-gasket', label: 'Sierpinski Gasket', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'sierpinski-gasket' }, icon: '▲' },
  { id: 'fractal-carpet', label: 'Sierpinski Carpet', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'sierpinski-carpet' }, icon: '▦' },
  { id: 'fractal-koch', label: 'Koch Snowflake', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'koch-snowflake' }, icon: '❄' },
  { id: 'fractal-dragon', label: 'Dragon Curve', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'dragon-curve' }, icon: '🐉' },
  { id: 'fractal-mandelbrot', label: 'Mandelbrot Set', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'mandelbrot' }, icon: '⚛' },
  { id: 'fractal-julia', label: 'Julia Set', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'julia-set' }, icon: '❃' },
  { id: 'fractal-pythagoras', label: 'Pythagoras Tree', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'pythagoras-tree' }, icon: '🌳' },
  { id: 'fractal-menger', label: 'Menger Sponge', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'menger-sponge-2d' }, icon: '🧊' },
  { id: 'fractal-vicsek', label: 'Vicsek Fractal', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'vicsek-fractal' }, icon: '✛' },
  { id: 'fractal-barnsley', label: 'Barnsley Fern', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'barnsley-fern' }, icon: '🌿' },

  // Space-Filling Paths
  { id: 'path-hilbert', label: 'Hilbert Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'hilbert' }, icon: '₪' },
  { id: 'path-peano', label: 'Peano Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'peano' }, icon: '⧉' },
  { id: 'path-gosper', label: 'Gosper Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'gosper' }, icon: '❄' },
  { id: 'path-moore', label: 'Moore Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'moore' }, icon: '⧓' },
  { id: 'path-arrowhead', label: 'Sierpinski Arrowhead', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'sierpinski-arrowhead' }, icon: '▲' },
  { id: 'path-lebesgue', label: 'Lebesgue O-curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'lebesgue' }, icon: '➰' },
  { id: 'path-morton', label: 'Morton Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'morton' }, icon: '☊' },
  { id: 'path-htree', label: 'H-Tree', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'h-tree' }, icon: '🪜' },
  { id: 'path-lsystem', label: 'L-System Grid', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'lsystem-grid' }, icon: '▦' },
  { id: 'path-dragon', label: 'Dragon Folding', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'dragon-folding' }, icon: '🐲' },

  // Chaotic Attractors
  { id: 'attr-lorenz', label: 'Lorenz', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'lorenz' }, icon: '🦋' },
  { id: 'attr-rossler', label: 'Rossler', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'rossler' }, icon: '🌀' },
  { id: 'attr-clifford', label: 'Clifford', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'clifford' }, icon: '🌪️' },
  { id: 'attr-dejong', label: 'Peter de Jong', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'dejong' }, icon: '🌀' },
  { id: 'attr-bedhead', label: 'Bedhead Attractor', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'bedhead' }, icon: '🛌' },
  { id: 'attr-ikeda', label: 'Ikeda Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'ikeda' }, icon: '🗺️' },
  { id: 'attr-henon', label: 'Hénon Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'henon' }, icon: '☄️' },

  // Organic & Biological
  { id: 'org-voronoi', label: 'Voronoi Tiling', cat: 'Organic & Biological', comp: VoronoiTab, cfg: { type: 'voronoi' }, icon: '⬢' },

  // Material & Technical
  { id: 'test-palette', label: 'Palette Test', cat: 'Material & Technical', comp: PaletteTestTab, icon: '▦' },
  { id: 'test-palette-grid', label: 'Palette Grid', cat: 'Material & Technical', comp: PaletteGridTab, icon: '▦' },
  { id: 'test-gradient', label: 'Gradient Grid', cat: 'Material & Technical', comp: GradientTab, icon: '▦' },
  { id: 'test-bitmap', label: 'Bitmap Line', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'bitmap-line' }, icon: '▤' },
  { id: 'test-xcs', label: 'XCS Reference Test', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'test' }, icon: '⚙' }
];

window.addEventListener('DOMContentLoaded', async () => {
  await App.init(PATTERNS);
  Persistence.restore();
  
  // UI Hooks
  document.getElementById('addPatternBtn').onclick = () => UI.showPatternMenu(PATTERNS);
});

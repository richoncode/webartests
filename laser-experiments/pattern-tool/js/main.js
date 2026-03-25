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
  { id: 'mandala', short: 'Mandala', label: 'Dot Mandala', cat: 'Math & Symmetry', comp: MandalaTab, icon: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><circle cx="7" cy="7" r="2"/></svg>' },
  { id: 'fol', short: 'FOL', label: 'Flower of Life', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'flower-of-life' }, icon: '🝊' },
  { id: 'metatron', short: 'Metatron', label: "Metatron's Cube", cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'metatrons-cube' }, icon: '⌬' },
  { id: 'rose', short: 'Rose', label: 'Rose Curve', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'rose-curve' }, icon: '✿' },
  { id: 'spiral', short: 'Archim', label: 'Archimedean Spiral', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'archimedean-spiral' }, icon: '🌀' },
  { id: 'fermat', short: 'Fermat', label: 'Fermat Spiral', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'fermat-spiral' }, icon: '🌻' },
  { id: 'concentric', short: 'ConcPol', label: 'Concentric Polygons', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'concentric-polygons' }, icon: '⬔' },
  { id: 'honeycomb', short: 'HexHcb', label: 'Hex Honeycomb', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'honeycomb' }, icon: '⬢' },
  { id: 'islamic', short: 'IslamStar', label: 'Islamic Star', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'islamic-star' }, icon: '☪' },
  { id: 'girih', short: 'Girih', label: 'Girih Tiling', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'girih' }, icon: '⛬' },
  { id: 'penrose', short: 'Penrose', label: 'Penrose P2', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'penrose' }, icon: '⧉' },
  
  // Fractals & Recursion
  { id: 'fractal-gasket', short: 'Gasket', label: 'Sierpinski Gasket', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'sierpinski-gasket' }, icon: '▲' },
  { id: 'fractal-carpet', short: 'Carpet', label: 'Sierpinski Carpet', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'sierpinski-carpet' }, icon: '▦' },
  { id: 'fractal-koch', short: 'Koch', label: 'Koch Snowflake', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'koch-snowflake' }, icon: '❄' },
  { id: 'fractal-dragon', short: 'Dragon', label: 'Dragon Curve', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'dragon-curve' }, icon: '🐉' },
  { id: 'fractal-mandelbrot', short: 'Mandel', label: 'Mandelbrot Set', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'mandelbrot' }, icon: '⚛' },
  { id: 'fractal-julia', short: 'Julia', label: 'Julia Set', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'julia-set' }, icon: '❃' },
  { id: 'fractal-pythagoras', short: 'Pythag', label: 'Pythagoras Tree', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'pythagoras-tree' }, icon: '🌳' },
  { id: 'fractal-menger', short: 'Menger', label: 'Menger Sponge', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'menger-sponge-2d' }, icon: '🧊' },
  { id: 'fractal-vicsek', short: 'Vicsek', label: 'Vicsek Fractal', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'vicsek-fractal' }, icon: '✛' },
  { id: 'fractal-barnsley', short: 'Barnsley', label: 'Barnsley Fern', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'barnsley-fern' }, icon: '🌿' },

  // Space-Filling Paths
  { id: 'path-hilbert', short: 'Hilbert', label: 'Hilbert Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'hilbert' }, icon: '₪' },
  { id: 'path-peano', short: 'Peano', label: 'Peano Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'peano' }, icon: '⧉' },
  { id: 'path-gosper', short: 'Gosper', label: 'Gosper Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'gosper' }, icon: '❄' },
  { id: 'path-moore', short: 'Moore', label: 'Moore Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'moore' }, icon: '⧓' },
  { id: 'path-arrowhead', short: 'Arrow', label: 'Sierpinski Arrowhead', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'sierpinski-arrowhead' }, icon: '▲' },
  { id: 'path-lebesgue', short: 'Lebes', label: 'Lebesgue O-curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'lebesgue' }, icon: '➰' },
  { id: 'path-morton', short: 'Morton', label: 'Morton Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'morton' }, icon: '☊' },
  { id: 'path-htree', short: 'HTree', label: 'H-Tree', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'h-tree' }, icon: '🪜' },
  { id: 'path-lsystem', short: 'LSys', label: 'L-System Grid', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'lsystem-grid' }, icon: '▦' },
  { id: 'path-dragon', short: 'DragFold', label: 'Dragon Folding', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'dragon-folding' }, icon: '🐲' },

  // Chaotic Attractors
  { id: 'attr-lorenz', short: 'Lorenz', label: 'Lorenz', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'lorenz' }, icon: '🦋' },
  { id: 'attr-rossler', short: 'Rossler', label: 'Rossler', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'rossler' }, icon: '🌀' },
  { id: 'attr-clifford', short: 'Clifford', label: 'Clifford', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'clifford' }, icon: '🌪️' },
  { id: 'attr-dejong', short: 'DeJong', label: 'Peter de Jong', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'dejong' }, icon: '🌀' },
  { id: 'attr-bedhead', short: 'Bedhead', label: 'Bedhead Attractor', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'bedhead' }, icon: '🛌' },
  { id: 'attr-ikeda', short: 'Ikeda', label: 'Ikeda Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'ikeda' }, icon: '🗺️' },
  { id: 'attr-henon', short: 'Henon', label: 'Hénon Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'henon' }, icon: '☄️' },

  // Organic & Biological
  { id: 'org-voronoi', short: 'Voronoi', label: 'Voronoi Tiling', cat: 'Organic & Biological', comp: VoronoiTab, cfg: { type: 'voronoi' }, icon: '⬢' },

  // Material & Technical
  { id: 'test-palette', short: 'PalTest', label: 'Palette Test', cat: 'Material & Technical', comp: PaletteTestTab, icon: '▦' },
  { id: 'test-palette-grid', short: 'PalGrid', label: 'Palette Grid', cat: 'Material & Technical', comp: PaletteGridTab, icon: '▦' },
  { id: 'test-gradient', short: 'GradGrid', label: 'Gradient Grid', cat: 'Material & Technical', comp: GradientTab, icon: '▦' },
  { id: 'test-bitmap', short: 'Bitmap', label: 'Bitmap Line', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'bitmap-line' }, icon: '▤' },
  { id: 'test-xcs', short: 'XCSRef', label: 'XCS Reference Test', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'test' }, icon: '⚙' }
];

window.addEventListener('DOMContentLoaded', async () => {
  await App.init(PATTERNS);
  Persistence.restore();
  
  // UI Hooks
  document.getElementById('addPatternBtn').onclick = () => {
    // Force menu rebuild if needed to pick up new callback logic
    document.getElementById('addPatternMenu').innerHTML = '';
    UI.showPatternMenu(PATTERNS, p => TabMgr.createTab(p.id, p.cfg));
  };
});

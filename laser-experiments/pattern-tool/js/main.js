import { App } from './app.js';
import { Persistence } from './persistence.js';
import { UI } from './utils.js';
import { 
  MandalaTab, GeometryTab, FractalTab, PathTab, AttractorTab, 
  VoronoiTab, PaletteTestTab, GradientTab, MathTab, TabMgr,
  PaletteGridTab, HilbertTab, BitmapTab
} from './tabs.js';

// Dependency Injection
App.TabMgr = TabMgr;

const PATTERNS = [
  // Math & Symmetry
  { id: 'mandala', short: 'Mandala', label: 'Dot Mandala', cat: 'Math & Symmetry', comp: MandalaTab, icon: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><circle cx="7" cy="7" r="2"/></svg>' },
  { id: 'fol', short: 'FOL', label: 'Flower of Life', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'flower-of-life' }, icon: '🝊' },
  { id: 'vesica', short: 'Vesica', label: 'Vesica Piscis', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'vesica-piscis' }, icon: '♊' },
  { id: 'hypotrochoid', short: 'Hypo', label: 'Hypotrochoid', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'hypotrochoid' }, icon: '🌀' },
  { id: 'spirograph', short: 'Spiro', label: 'Spirograph', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'spirograph' }, icon: '☸' },
  { id: 'superformula', short: 'Superf', label: 'Superformula', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'superformula' }, icon: '🔯' },
  { id: 'metatron', short: 'Metatron', label: "Metatron's Cube", cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'metatrons-cube' }, icon: '⌬' },
  { id: 'rose', short: 'Rose', label: 'Rose Curve', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'rose-curve' }, icon: '✿' },
  { id: 'maurer-rose', short: 'Maurer', label: 'Maurer Rose', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'maurer-rose' }, icon: '🕸️' },
  { id: 'spiral', short: 'Archim', label: 'Archimedean Spiral', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'archimedean-spiral' }, icon: '🌀' },
  { id: 'fermat', short: 'Fermat', label: 'Fermat Spiral', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'fermat-spiral' }, icon: '🌻' },
  { id: 'concentric', short: 'ConcPol', label: 'Concentric Polygons', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'concentric-polygons' }, icon: '⬔' },
  { id: 'honeycomb', short: 'HexHcb', label: 'Hex Honeycomb', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'honeycomb' }, icon: '⬢' },
  { id: 'islamic', short: 'IslamStar', label: 'Islamic Star', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'islamic-star' }, icon: '☪' },
  { id: 'girih', short: 'Girih', label: 'Girih Tiling', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'girih' }, icon: '⛬' },
  { id: 'penrose', short: 'Penrose', label: 'Penrose P2', cat: 'Math & Symmetry', comp: GeometryTab, cfg: { mode: 'penrose' }, icon: '⧉' },
  { id: 'penrose-p3', short: 'PenP3', label: 'Penrose P3', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'penrose-p3' }, icon: '⧈' },
  { id: 'lissajous', short: 'Lissa', label: 'Lissajous Curves', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'lissajous' }, icon: '∿' },
  { id: 'chladni', short: 'Chladni', label: 'Chladni Patterns', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'chladni' }, icon: '⠿' },
  { id: 'harmonograph', short: 'Harmo', label: 'Harmonograph', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'harmonograph' }, icon: '𝄢' },
  { id: 'truchet-arcs', short: 'Truchet', label: 'Truchet Tiling (Arcs)', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'truchet-arcs' }, icon: '🝖' },
  { id: 'truchet-sq', short: 'TruchetSq', label: 'Truchet Tiling (Squares)', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'truchet-squares' }, icon: '▦' },
  { id: 'kaleidoscope', short: 'Kaleido', label: 'Kaleidoscope', cat: 'Math & Symmetry', comp: MathTab, cfg: { type: 'kaleidoscope' }, icon: '❃' },
  
  // Fractals & Recursion
  { id: 'fractal-gasket', short: 'Gasket', label: 'Sierpinski Gasket', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'sierpinski-gasket' }, icon: '▲' },
  { id: 'fractal-carpet', short: 'Carpet', label: 'Sierpinski Carpet', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'sierpinski-carpet' }, icon: '▦' },
  { id: 'fractal-apollonian', short: 'Apollo', label: 'Apollonian Gasket', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'apollonian-gasket' }, icon: '⦿' },
  { id: 'fractal-levy', short: 'Levy', label: 'Levy C Curve', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'levy-c' }, icon: '⫵' },
  { id: 'fractal-cantor', short: 'Cantor', label: 'Cantor Set', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'cantor-set' }, icon: '≑' },
  { id: 'fractal-tsquare', short: 'TSquare', label: 'T-Square Fractal', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 't-square' }, icon: '⊞' },
  { id: 'fractal-tree', short: 'FrTree', label: 'Fractal Tree', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'fractal-tree' }, icon: '🌳' },
  { id: 'fractal-koch', short: 'Koch', label: 'Koch Snowflake', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'koch-snowflake' }, icon: '❄' },
  { id: 'fractal-dragon', short: 'Dragon', label: 'Dragon Curve', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'dragon-curve' }, icon: '🐉' },
  { id: 'fractal-mandelbrot', short: 'Mandel', label: 'Mandelbrot Set', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'mandelbrot' }, icon: '⚛' },
  { id: 'fractal-julia', short: 'Julia', label: 'Julia Set', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'julia-set' }, icon: '❃' },
  { id: 'fractal-pythagoras', short: 'Pythag', label: 'Pythagoras Tree', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'pythagoras-tree' }, icon: '🌳' },
  { id: 'fractal-menger', short: 'Menger', label: 'Menger Sponge', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'menger-sponge-2d' }, icon: '🧊' },
  { id: 'fractal-vicsek', short: 'Vicsek', label: 'Vicsek Fractal', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'vicsek-fractal' }, icon: '✛' },
  { id: 'fractal-barnsley', short: 'Barnsley', label: 'Barnsley Fern', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'barnsley-fern' }, icon: '🌿' },
  { id: 'fractal-pentagon', short: 'SierpPent', label: 'Sierpinski Pentagon', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'sierpinski-pentagon' }, icon: '⬠' },
  { id: 'fractal-recursive-squares', short: 'RecSq', label: 'Recursive Squares', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'recursive-squares' }, icon: '回' },
  { id: 'fractal-recursive-circles', short: 'RecCirc', label: 'Recursive Circles', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'recursive-circles' }, icon: '⦿' },
  { id: 'fractal-recursive-rects', short: 'RecRect', label: 'Recursive Rectangles', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'recursive-rects' }, icon: '回' },
  { id: 'fractal-recursive-poly', short: 'RecPoly', label: 'Recursive Polygons', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'recursive-polygons' }, icon: '⬢' },
  { id: 'fractal-recursive-stars', short: 'RecStar', label: 'Recursive Stars', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'recursive-stars' }, icon: '🔯' },
  { id: 'fractal-cesaro', short: 'Cesaro', label: 'Cesàro Fractal', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'cesaro-fractal' }, icon: '⫵' },
  { id: 'fractal-hexagon', short: 'SierpHex', label: 'Sierpinski Hexagon', cat: 'Fractals & Recursion', comp: FractalTab, cfg: { type: 'sierpinski-hexagon' }, icon: '⬢' },

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
  { id: 'path-sierpinski', short: 'SierpCrv', label: 'Sierpinski Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'sierpinski-curve' }, icon: '⧉' },
  { id: 'path-plant', short: 'Plant', label: 'L-System Plant', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'l-system-plant' }, icon: '🎋' },
  { id: 'path-algae', short: 'Algae', label: 'L-System Algae', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'l-system-algae' }, icon: '🌿' },
  { id: 'path-koch-island', short: 'KochIsl', label: 'Koch Island', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'koch-island' }, icon: '❄' },
  { id: 'path-fass', short: 'FASSCrv', label: 'FASS Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'fass-curve' }, icon: '₪' },
  { id: 'path-cross', short: 'Cross', label: 'L-System Cross', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'cross' }, icon: '✙' },
  { id: 'path-quad-snow', short: 'QuadSnw', label: 'Quadratic Snowflake', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'quadratic-snowflake' }, icon: '❄' },
  { id: 'path-terdragon', short: 'TerDrag', label: 'Terdragon Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'terdragon' }, icon: '🐲' },
  { id: 'path-minkowski', short: 'MinkCrv', label: 'Minkowski Curve', cat: 'Space-Filling Paths', comp: PathTab, cfg: { mode: 'minkowski' }, icon: '〰' },

  // Chaotic Attractors
  { id: 'attr-lorenz', short: 'Lorenz', label: 'Lorenz', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'lorenz' }, icon: '🦋' },
  { id: 'attr-rossler', short: 'Rossler', label: 'Rossler', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'rossler' }, icon: '🌀' },
  { id: 'attr-clifford', short: 'Clifford', label: 'Clifford', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'clifford' }, icon: '🌪️' },
  { id: 'attr-dejong', short: 'DeJong', label: 'Peter de Jong', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'dejong' }, icon: '🌀' },
  { id: 'attr-bedhead', short: 'Bedhead', label: 'Bedhead Attractor', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'bedhead' }, icon: '🛌' },
  { id: 'attr-ikeda', short: 'Ikeda', label: 'Ikeda Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'ikeda' }, icon: '🗺️' },
  { id: 'attr-henon', short: 'Henon', label: 'Hénon Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'henon' }, icon: '☄️' },
  { id: 'attr-gumowski', short: 'Gumow', label: 'Gumowski-Mira', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'gumowski-mira' }, icon: '🔱' },
  { id: 'attr-duffing', short: 'Duffin', label: 'Duffing Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'duffing' }, icon: '➰' },
  { id: 'attr-chirikov', short: 'Chirik', label: 'Standard Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'chirikov' }, icon: '⚙' },
  { id: 'attr-gingerbread', short: 'Gbread', label: 'Gingerbreadman', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'gingerbreadman' }, icon: '🍪' },
  { id: 'attr-tinkerbell', short: 'Tinker', label: 'Tinkerbell Map', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'tinkerbell' }, icon: '🧚' },
  { id: 'attr-chen', short: 'Chen', label: 'Chen Attractor', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'chen' }, icon: '🌪️' },
  { id: 'attr-thomas', short: 'Thomas', label: 'Thomas Attractor', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'thomas' }, icon: '➰' },
  { id: 'attr-aizawa', short: 'Aizawa', label: 'Aizawa Attractor', cat: 'Chaotic Attractors', comp: AttractorTab, cfg: { mode: 'aizawa' }, icon: '🐚' },

  // Organic & Biological
  { id: 'org-voronoi', short: 'Voronoi', label: 'Voronoi Tiling', cat: 'Organic & Biological', comp: VoronoiTab, cfg: { type: 'voronoi' }, icon: '⬢' },
  { id: 'org-circles', short: 'InsCirc', label: 'Inscribed Circles', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'inscribed-circles' }, icon: '⦿' },
  { id: 'org-spiderweb', short: 'Spider', label: 'Spider Web', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'spider-web' }, icon: '🕸️' },
  { id: 'org-phyllotaxis', short: 'Phyllo', label: 'Phyllotaxis Sunflower', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'phyllotaxis' }, icon: '🌻' },
  { id: 'org-ca', short: 'CellAuto', label: 'Cellular Automata', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'cellular-automata' }, icon: '▤' },
  { id: 'org-gol', short: 'GOL', label: 'Game of Life', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'game-of-life' }, icon: '👾' },
  { id: 'org-flow', short: 'FlowField', label: 'Perlin Flow Field', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'flow-field' }, icon: '༄' },
  { id: 'org-worley', short: 'Worley', label: 'Worley Noise', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'worley-noise' }, icon: '⬢' },
  { id: 'org-dla', short: 'DLA', label: 'DLA Growth', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'dla' }, icon: '🌿' },
  { id: 'org-rd', short: 'RxDiff', label: 'Reaction-Diffusion', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'reaction-diffusion' }, icon: '🦠' },
  { id: 'org-slime', short: 'Slime', label: 'Slime Mold', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'slime-mold' }, icon: '🍄' },
  { id: 'org-membrane', short: 'Membrane', label: 'Biological Membrane', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'membrane' }, icon: '🕸️' },
  { id: 'org-stipple', short: 'Stipple', label: 'Stippling (Points)', cat: 'Organic & Biological', comp: MathTab, cfg: { type: 'stippling' }, icon: '░' },

  // Material & Technical
  { id: 'test-palette', short: 'PalTest', label: 'Palette Test', cat: 'Material & Technical', comp: PaletteTestTab, icon: '▦' },
  { id: 'test-palette-grid', short: 'PalGrid', label: 'Palette Grid', cat: 'Material & Technical', comp: PaletteGridTab, icon: '▦' },
  { id: 'test-gradient', short: 'GradGrid', label: 'Gradient Grid', cat: 'Material & Technical', comp: GradientTab, icon: '▦' },
  { id: 'test-bitmap', short: 'Bitmap', label: 'Bitmap Line', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'bitmap-line' }, icon: '▤' },
  { id: 'test-xcs', short: 'XCSRef', label: 'XCS Reference Test', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'test' }, icon: '⚙' },
  { id: 'test-kerf', short: 'Kerf', label: 'Kerf Offset Test', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'kerf-test' }, icon: '📏' },
  { id: 'test-density', short: 'Density', label: 'Line Density Test', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'density-test' }, icon: '▤' },
  { id: 'test-scale', short: 'Scale', label: 'Measurement Scale', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'test-scale' }, icon: '📏' },
  { id: 'test-thermal', short: 'Thermal', label: 'Thermal Return Wall', cat: 'Material & Technical', comp: MathTab, cfg: { type: 'thermal-wall' }, icon: '🧱' },

  // Bitmap & Dithering
  { id: 'bitmap-dither', short: 'Dither', label: 'Dither Density Test', cat: 'Bitmap', comp: BitmapTab, cfg: { type: 'dither-test' }, icon: '▞' }
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

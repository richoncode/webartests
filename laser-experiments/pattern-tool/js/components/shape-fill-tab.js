import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { UI } from '../utils.js';

// ═══════════════════════════════════════════════════════════════════
// Shape Fill — ported unchanged from laser-experiments/laser-fill-generator
// (its math/drawing code is not modified there). This module wraps that
// same engine in the Pattern Tool's own content-surface/parameter-panel
// conventions instead of the generator's native page chrome.
// ═══════════════════════════════════════════════════════════════════

const PALETTES = {
  classic: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1', '#d35400'],
  steampunk: ['#b08d57', '#a97142', '#8c5e3c', '#5e3a21', '#cda434', '#d4af37', '#7b3f00', '#b5a642', '#8a795d'],
  neon: ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000', '#ff8800'],
  art_pendant: ['#3498db', '#5dade2', '#d4af37', '#aab7b8', '#d5f5e3', '#f4d03f', '#7f8c8d'],
  circuit: ['#a52a2a', '#8b4513', '#cd7f32', '#b8860b', '#d2691e'],
  painted_lady: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#A29BFE', '#6C5CE7', '#FD79A8', '#00B894', '#FDCB6E', '#E17055'],
  ducks: ['#FDD835', '#FFEB3B', '#FFF59D', '#FFFFFF', '#E0E0E0', '#FF9800', '#4CAF50'],
  christmas: ['#c0392b', '#165b33', '#f8b229', '#ffffff', '#0b6e4f', '#e94560', '#d4af37'],
  coins: ['#c9c9c9', '#a8a8a8', '#7d7d7d', '#5a5a5a', '#d4af37', '#b8860b', '#b87333', '#cd7f32', '#8b5a2b'],
  gems: ['#e0115f', '#0f52ba', '#50c878', '#9966cc', '#ffc87c', '#b9f2ff', '#ff8c42'],
  buttons: ['#e63946', '#f4a340', '#ffd23f', '#6a994e', '#1b4332', '#3a86ff', '#ff5da2', '#b185db', '#f1faee'],
  autumn_leaves: ['#c1440e', '#e3641b', '#f2a30f', '#d4a017', '#8b5a2b', '#a52a2a', '#6b4226', '#e8b923']
};

const STYLE_OPTIONS = [
  ['flat', 'Flat'], ['3d-basic', '3D Basic'], ['3d-glossy', '3D Glossy'],
  ['illustrated', 'Pipes and Gears'], ['circuit', 'Circuit Board'], ['painted_lady', 'Painted Lady'],
  ['ducks', 'Rows of Ducks'], ['gears', 'Gears'], ['christmas', 'Christmas Cookies'],
  ['coins', 'World Coins'], ['gems', 'Gems'], ['buttons', 'Buttons'], ['autumn_leaves', 'Autumn Leaves']
];
const PALETTE_OPTIONS = [
  ['classic', 'Classic'], ['steampunk', 'SteamPunk'], ['neon', 'Neon'], ['art_pendant', 'Cool Stainless'],
  ['circuit', 'Circuit Colors'], ['painted_lady', 'Painted Lady'], ['ducks', 'Ducks'], ['christmas', 'Christmas'],
  ['coins', 'Coins'], ['gems', 'Gems'], ['buttons', 'Buttons'], ['autumn_leaves', 'Autumn Leaves']
];

const STYLE_NOUN = {
  flat: 'Pipe', '3d-basic': 'Pipe', '3d-glossy': 'Pipe',
  illustrated: 'Gear', circuit: 'Component', painted_lady: 'House',
  ducks: 'Duck', gears: 'Gear', christmas: 'Cookie',
  coins: 'Coin', gems: 'Gem', buttons: 'Button', autumn_leaves: 'Leaf'
};
const NOUN_PLURAL_OVERRIDES = { autumn_leaves: 'leaves' };
const MAZE_STYLE_SET = ['flat', '3d-basic', '3d-glossy', 'illustrated', 'circuit'];

const SIZE_DEFAULTS_POINT = {
  ducks: { min: 15, max: 40 }, painted_lady: { min: 15, max: 40 }, gears: { min: 12, max: 35 },
  christmas: { min: 15, max: 40 }, coins: { min: 12, max: 30 }, gems: { min: 10, max: 30 }, buttons: { min: 10, max: 28 },
  autumn_leaves: { min: 12, max: 32 }
};
const THICKNESS_MAX_BY_STYLE = {
  painted_lady: 40, circuit: 50,
  flat: 50, '3d-basic': 50, '3d-glossy': 50, illustrated: 50
};
const THICKNESS_MAX_DEFAULT = 400;
const STYLE_DEFAULT_PALETTE = {
  flat: 'classic', '3d-basic': 'classic', '3d-glossy': 'classic', illustrated: 'classic',
  circuit: 'circuit', painted_lady: 'painted_lady', ducks: 'ducks', gears: 'steampunk',
  christmas: 'christmas', coins: 'coins', gems: 'gems', buttons: 'buttons', autumn_leaves: 'autumn_leaves'
};

// Common laser-cut blanks, offered as one-click starting shapes. Coordinates
// assume the engine's fixed 1200x900 internal canvas resolution.
const SHAPE_PRESETS = {
  pendant: () => [
    { x: 435, y: 75 }, { x: 765, y: 75 }, { x: 825, y: 135 }, { x: 825, y: 765 },
    { x: 765, y: 825 }, { x: 435, y: 825 }, { x: 375, y: 765 }, { x: 375, y: 135 }
  ],
  circle: () => {
    let pts = [];
    let cx = 600, cy = 450, r = 330, n = 32;
    for (let i = 0; i < n; i++) {
      let a = (i / n) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  },
  cuff: () => [
    { x: 225, y: 330 }, { x: 975, y: 330 }, { x: 975, y: 570 }, { x: 225, y: 570 }
  ],
  bracelet: () => [
    { x: 150, y: 367.5 }, { x: 1050, y: 367.5 }, { x: 1050, y: 532.5 }, { x: 150, y: 532.5 }
  ]
};
const SHAPE_PRESET_LIST = [
  { key: 'pendant', label: 'Pendant', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="8,2 16,2 20,6 20,18 16,22 8,22 4,18 4,6"/></svg>' },
  { key: 'circle', label: 'Circle', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/></svg>' },
  { key: 'cuff', label: 'Cuff', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="10"/></svg>' },
  { key: 'bracelet', label: 'Bracelet', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="10" width="22" height="4"/></svg>' }
];

// Every slider means something different depending on style/mode; this maps
// the current combination to a contextual label/description/disabled state.
function computeSliderMeta(style, mode) {
  const noun = STYLE_NOUN[style] || 'Object';
  const nounLower = noun.toLowerCase();
  const nounPlural = NOUN_PLURAL_OVERRIDES[style] || (nounLower + 's');
  const meta = {};
  const isPointStyle = !MAZE_STYLE_SET.includes(style) && style !== 'painted_lady';

  if (isPointStyle) {
    meta.thickness = { label: 'Path Thickness', description: `Not meaningful for ${nounPlural}, which are placed individually rather than along a traced path — use ${noun} Sizes below to control their size instead.`, disabled: true };
  } else if (style === 'circuit') {
    meta.thickness = { label: 'Trace Thickness', description: mode === 'border' ? "Sets the width of the copper wire and components traced around the border." : "Sets how wide each copper trace and component is drawn.", disabled: false };
  } else if (style === 'painted_lady') {
    meta.thickness = { label: 'House Scale', description: "Scales the size of the houses lining each road segment.", disabled: false };
  } else {
    meta.thickness = { label: 'Pipe Thickness', description: mode === 'border' ? "Sets the width of the pipe traced around the border." : "Sets how wide each pipe segment is, as a fraction of the shape's narrowest dimension.", disabled: false };
  }

  if (MAZE_STYLE_SET.includes(style)) {
    meta.density = { label: 'Density', description: mode === 'border' ? `Controls the spacing between ${nounPlural} strung along the traced border.` : "Controls the maze's grid resolution — higher values mean smaller cells, so the pipe pattern has more, tighter turns.", disabled: false };
  } else if (style === 'gears') {
    meta.density = { label: 'Density', description: mode === 'border' ? `Controls the spacing between ${nounPlural} strung along the traced border.` : "Controls the total count of the mixed-size gear swarm.", disabled: false };
  } else if (style === 'painted_lady') {
    meta.density = { label: 'Density', description: "Controls how close together houses are placed along each road.", disabled: false };
  } else {
    meta.density = { label: 'Density', description: mode === 'border' ? `Controls the spacing between ${nounPlural} strung along the traced border.` : `Controls how close together the ${nounPlural} are scattered.`, disabled: false };
  }

  if (style === 'circuit') {
    meta.color = { label: 'Component Colors', description: "Circuit's wires and components use realistic fixed colors — bare copper, gold-plated jumpers, standard resistor/capacitor bands — not the palette, so this has no effect here.", disabled: true };
  } else if (style === 'painted_lady') {
    meta.color = { label: 'House Colors', description: mode === 'fill' ? "Sets how many palette colors are in play (0% = one color, 100% = the full palette) and how eagerly the houses' color 'neighborhood' changes between road segments." : "Sets how many palette colors are in play (0% = one color, 100% = the full palette) as houses are strung along the border.", disabled: false };
  } else if (mode === 'fill' && MAZE_STYLE_SET.includes(style)) {
    meta.color = { label: noun + ' Colors', description: "Sets how many palette colors are in play (0% = one color, 100% = the full palette) as the pipe winds through the maze.", disabled: false };
  } else {
    meta.color = { label: noun + ' Colors', description: `Sets how many palette colors are in play (0% = one color, 100% = the full palette) — unlike Cluster Run, a small pool stays small even when a run is forced to switch.`, disabled: false };
  }

  if (MAZE_STYLE_SET.includes(style)) {
    meta.maxStraight = { label: 'Color Cluster', description: mode === 'fill' ? "Caps how many grid cells in a row the pipe can travel in a straight line before it must turn." : `Caps how many consecutive ${nounPlural} can share the same color before it's forced to change.`, disabled: false };
  } else if (style === 'painted_lady') {
    meta.maxStraight = { label: 'Color Cluster', description: mode === 'fill' ? "Caps how long each straight road segment can run before turning, which also caps how many segments share a neighborhood color." : `Caps how many consecutive ${nounPlural} can share the same color before it's forced to change.`, disabled: false };
  } else if (mode === 'fill' && (style === 'gears' || style === 'autumn_leaves')) {
    meta.maxStraight = { label: 'Color Cluster', description: `This style scatters ${nounPlural} at fully random positions, so consecutive picks aren't near each other on screen — there's no visible run to cap.`, disabled: true };
  } else {
    meta.maxStraight = { label: 'Color Cluster', description: `Caps how many consecutive ${nounPlural} can share the same color before it's forced to change.`, disabled: false };
  }

  if (['flat', '3d-basic', '3d-glossy'].includes(style)) {
    meta.gears = { label: 'Accent Count', description: mode === 'border' ? `Sets how many oversized landmark ${nounPlural} appear evenly along the border (0 disables them).` : "Sets how many decorative gear accents are scattered on top of the pipes.", disabled: false };
  } else if (style === 'gears') {
    meta.gears = { label: 'Accent Count', description: mode === 'border' ? `Sets how many oversized landmark ${nounPlural} appear evenly along the border (0 disables them).` : "Adds extra oversized feature gears behind the swarm — independent of Density, which only scales the regular mixed-size count.", disabled: false };
  } else if (style === 'autumn_leaves') {
    meta.gears = { label: 'Accent Count', description: mode === 'border' ? "Sets how many acorns, gourds, and pinecones appear evenly along the border (0 disables them)." : "Adds acorns, gourds, and pinecones scattered among the regular leaf pile.", disabled: false };
  } else {
    meta.gears = { label: 'Accent Count', description: mode === 'border' ? `Sets how many oversized landmark ${nounPlural} appear evenly along the border (0 disables them).` : `Sets how many oversized landmark ${nounPlural} (or related decorations) appear among the regular scatter.`, disabled: false };
  }

  meta.margin = {
    label: 'Edge Margin',
    description: mode === 'border'
      ? "Offsets the traced path inward (positive) or outward (negative) from the drawn edge."
      : "Shrinks (positive) or grows (negative) the fillable area inward/outward from the drawn edge.",
    disabled: false
  };

  if (isPointStyle) {
    meta.size = { label: noun + ' Sizes', description: `Sets the min/max size range for the ${nounPlural}, in the same units as Trace/Pipe Thickness (raw value out of 500, as a fraction of the shape's narrow dimension) since Thickness is disabled for point-only styles. Accent Count ${nounPlural} are drawn as a multiple of the largest size here.`, disabled: false };
  } else if (style === 'painted_lady') {
    meta.size = { label: 'House Sizes', description: "Not used — House Scale (Thickness) controls house size in both Fill and Border mode.", disabled: true };
  } else {
    meta.size = { label: 'Sizes', description: "Only used by point-only styles (everything except Painted Lady's Fill-mode roads and the maze/pipe-tracing styles), where it sets the min/max size range in place of Thickness.", disabled: true };
  }

  return meta;
}

// ═══════════════════════════════════════════════════════════════════
// Engine — ported unchanged from laser-experiments/laser-fill-generator.
// Wrapped in a factory so each tab instance gets its own private state
// instead of the generator's original single set of module globals.
// The only intentional changes from the source: slider/select DOM reads
// (e.g. `thicknessSlider.value`) become reads of a `cfg` object supplied
// by the caller: `cfg.thickness`, `cfg.style`, `cfg.paletteId`, `cfg.mode`,
// `cfg.density`, `cfg.margin`, `cfg.gears`, `cfg.sizeMin`, `cfg.sizeMax`,
// `cfg.maxStraight`, `cfg.colorPct`. Every drawing/geometry function's
// math is otherwise untouched.
// ═══════════════════════════════════════════════════════════════════
function createEngine(canvas) {
  const ctx = canvas.getContext('2d');

  let rawPoints = [];
  let hullPoints = [];
  let isGenerated = false;
  let draggingPoint = null;
  let gears = []; // Store generated gears for redraws
  let shapeIsCustom = false; // true once the user hand-edits away from a loaded preset
  let isEditMode = false;
  let currentColorPool = [];

  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let patternSeed = Math.floor(Math.random() * 4294967296);
  let colorSeed = Math.floor(Math.random() * 4294967296);
  let patternRandom = makeRng(patternSeed);
  let colorRandom = makeRng(colorSeed);
  function reseedRandom() {
    patternRandom = makeRng(patternSeed);
    colorRandom = makeRng(colorSeed);
  }

  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function calculateConvexHull(points) {
    if (points.length <= 3) return points;
    const uniquePoints = points.filter((p, index, self) =>
      index === self.findIndex((t) => (t.x === p.x && t.y === p.y))
    );

    const sorted = [...uniquePoints].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower = [];
    for (let p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }

    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      let p = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }

    upper.pop(); lower.pop();
    return lower.concat(upper);
  }

  function pointInPolygon(point, vs) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].x, yi = vs[i].y;
      let xj = vs[j].x, yj = vs[j].y;
      let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distToSegmentSquared(p, v, w) {
    let l2 = (w.x - v.x) * (w.x - v.x) + (w.y - v.y) * (w.y - v.y);
    if (l2 === 0) return (p.x - v.x)*(p.x - v.x) + (p.y - v.y)*(p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    let projX = v.x + t * (w.x - v.x);
    let projY = v.y + t * (w.y - v.y);
    return (p.x - projX)*(p.x - projX) + (p.y - projY)*(p.y - projY);
  }

  function distanceToPolygon(p, poly) {
    let minDist2 = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      let d2 = distToSegmentSquared(p, poly[j], poly[i]);
      if (d2 < minDist2) minDist2 = d2;
    }
    return Math.sqrt(minDist2);
  }

  // Offset-polygon engine: shrinks (dist > 0) or grows (dist < 0) a convex
  // polygon by `dist` pixels, regardless of vertex winding or shape.
  function offsetPolygon(poly, dist) {
    if (!dist || poly.length < 3) return poly.slice();
    const n = poly.length;
    const centroid = poly.reduce((acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n }), { x: 0, y: 0 });

    const offsetLines = [];
    for (let i = 0; i < n; i++) {
      let p1 = poly[i], p2 = poly[(i + 1) % n];
      let dx = p2.x - p1.x, dy = p2.y - p1.y;
      let len = Math.hypot(dx, dy);
      if (len === 0) { offsetLines.push({ p1, p2 }); continue; }

      let normal = { x: -dy / len, y: dx / len };
      let mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      let toCentroid = { x: centroid.x - mid.x, y: centroid.y - mid.y };
      let inward = (normal.x * toCentroid.x + normal.y * toCentroid.y) > 0 ? normal : { x: -normal.x, y: -normal.y };

      offsetLines.push({
        p1: { x: p1.x + inward.x * dist, y: p1.y + inward.y * dist },
        p2: { x: p2.x + inward.x * dist, y: p2.y + inward.y * dist }
      });
    }

    function lineIntersect(a1, a2, b1, b2) {
      let d1x = a2.x - a1.x, d1y = a2.y - a1.y;
      let d2x = b2.x - b1.x, d2y = b2.y - b1.y;
      let denom = d1x * d2y - d1y * d2x;
      if (Math.abs(denom) < 1e-9) return { x: (a2.x + b1.x) / 2, y: (a2.y + b1.y) / 2 };
      let t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
      return { x: a1.x + d1x * t, y: a1.y + d1y * t };
    }

    const result = [];
    for (let i = 0; i < n; i++) {
      let prev = offsetLines[(i - 1 + n) % n];
      let curr = offsetLines[i];
      result.push(lineIntersect(prev.p1, prev.p2, curr.p1, curr.p2));
    }
    return result;
  }

  function buildPerimeterPath(poly) {
    const segments = [];
    let total = 0;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      let p1 = poly[i], p2 = poly[(i + 1) % n];
      let len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segments.push({ p1, p2, len, start: total });
      total += len;
    }
    return { segments, total };
  }

  function pointAtDistance(path, dist) {
    let d = path.total > 0 ? ((dist % path.total) + path.total) % path.total : 0;
    for (let seg of path.segments) {
      if (d <= seg.start + seg.len) {
        let t = seg.len === 0 ? 0 : (d - seg.start) / seg.len;
        return {
          x: seg.p1.x + (seg.p2.x - seg.p1.x) * t,
          y: seg.p1.y + (seg.p2.y - seg.p1.y) * t,
          angle: Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x)
        };
      }
    }
    let last = path.segments[path.segments.length - 1];
    return { x: last.p2.x, y: last.p2.y, angle: Math.atan2(last.p2.y - last.p1.y, last.p2.x - last.p1.x) };
  }

  function fitsWithoutCrossingCorner(path, dist, span) {
    let d = path.total > 0 ? ((dist % path.total) + path.total) % path.total : 0;
    for (let seg of path.segments) {
      if (d <= seg.start + seg.len) {
        if (seg.len < span) return false;
        let clearance = Math.min(d - seg.start, seg.start + seg.len - d);
        return clearance >= span / 2;
      }
    }
    return true;
  }

  function drawGear(cx, cy, radius, color, innerColor, teeth, isStacked = false) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';

    ctx.beginPath();
    let innerR = radius * 0.75;
    for (let i = 0; i < teeth; i++) {
      let a1 = (i / teeth) * Math.PI * 2;
      let a2 = ((i + 0.4) / teeth) * Math.PI * 2;
      let a3 = ((i + 0.6) / teeth) * Math.PI * 2;
      let a4 = ((i + 1.0) / teeth) * Math.PI * 2;

      if (i === 0) ctx.moveTo(cx + Math.cos(a1)*radius, cy + Math.sin(a1)*radius);
      else ctx.lineTo(cx + Math.cos(a1)*radius, cy + Math.sin(a1)*radius);

      ctx.lineTo(cx + Math.cos(a2)*radius, cy + Math.sin(a2)*radius);
      ctx.lineTo(cx + Math.cos(a3)*innerR, cy + Math.sin(a3)*innerR);
      ctx.lineTo(cx + Math.cos(a4)*innerR, cy + Math.sin(a4)*innerR);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill(); ctx.stroke();

    if (innerColor && innerColor !== color) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = innerColor;
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = color === '#d4af37' ? '#bdc3c7' : '#d4af37';
      ctx.fill(); ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = '#e8ecef';
    ctx.fill(); ctx.stroke();

    if (teeth > 8 && !isStacked) {
      for (let i = 0; i < 4; i++) {
        let a = (i / 4) * Math.PI * 2 + Math.PI/4;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a)*radius*0.5, cy + Math.sin(a)*radius*0.5, radius*0.12, 0, Math.PI*2);
        ctx.fillStyle = '#e8ecef';
        ctx.fill(); ctx.stroke();
      }
    }

    if (isStacked) {
      let stackedRadius = radius * 0.55;
      let stackedColor = color === '#d4af37' ? '#bdc3c7' : '#d4af37';
      drawGear(cx, cy, stackedRadius, stackedColor, null, Math.max(6, Math.floor(teeth/2)), false);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#7f8c8d';
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = color === '#d4af37' ? '#d4af37' : '#bdc3c7';
      ctx.fill(); ctx.stroke();
    }
  }

  function drawHouse(ctx, x, y, width, height, color, roofColor, hash) {
    let yBase = y;
    let hType = hash % 4;

    ctx.fillStyle = color;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;

    ctx.fillRect(x - width / 2, yBase - height, width, height);
    ctx.strokeRect(x - width / 2, yBase - height, width, height);

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    if (hType === 0) {
      ctx.moveTo(x - width / 2, yBase - height);
      ctx.lineTo(x + width / 2, yBase - height - width * 0.3);
      ctx.lineTo(x + width / 2, yBase - height);
      ctx.closePath();
    } else if (hType === 1) {
      ctx.moveTo(x - width / 2, yBase - height);
      ctx.lineTo(x, yBase - height - width * 0.5);
      ctx.lineTo(x + width / 2, yBase - height);
      ctx.closePath();
    } else if (hType === 2) {
      ctx.rect(x - width / 2, yBase - height - width * 0.1, width, width * 0.1);
    } else {
      ctx.moveTo(x - width / 2, yBase - height);
      ctx.lineTo(x - width * 0.3, yBase - height - width * 0.3);
      ctx.lineTo(x + width * 0.3, yBase - height - width * 0.3);
      ctx.lineTo(x + width / 2, yBase - height);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    let windowColor = '#add8e6';
    let doorColor = '#6b4226';
    let numWindows = 1 + (hash % 3);
    let winW = width * 0.2;
    let winH = height * 0.2;
    let doorW = width * 0.25;
    let doorH = height * 0.3;

    let doorX = (hash % 2 === 0) ? (x - width / 2 + width * 0.1) : (x + width / 2 - width * 0.1 - doorW);
    ctx.fillStyle = doorColor;
    ctx.fillRect(doorX, yBase - doorH, doorW, doorH);
    ctx.strokeRect(doorX, yBase - doorH, doorW, doorH);

    ctx.fillStyle = windowColor;
    for (let i = 0; i < numWindows; i++) {
      let winX = x - width / 2 + width * 0.15 + (i % 2) * width * 0.4;
      let winY = yBase - height * 0.7 + Math.floor(i / 2) * height * 0.3;
      if (numWindows === 1) { winX = x - winW / 2; winY = yBase - height*0.6; }

      ctx.fillRect(winX, winY, winW, winH);
      ctx.strokeRect(winX, winY, winW, winH);
    }
  }

  function drawDuck(ctx, x, y, size, color, angle, hash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-size*0.8, 0);
    ctx.lineTo(-size*1.2, -size*0.3);
    ctx.lineTo(-size*0.7, size*0.3);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size * 0.6, -size * 0.4, size * 0.55, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.moveTo(size * 0.9, -size * 0.3);
    ctx.lineTo(size * 1.5, -size * 0.2);
    ctx.lineTo(size * 0.9, -size * 0.1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(size * 0.7, -size * 0.5, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, size*0.1, size*0.5, size*0.25, Math.PI*0.05, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.stroke();

    ctx.restore();
  }

  function drawLilypad(ctx, cx, cy, size, hash) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((hash % 360) * Math.PI / 180);
    ctx.beginPath();
    let notch = 0.5;
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size, notch, Math.PI * 2 - notch);
    ctx.closePath();
    ctx.fillStyle = (hash % 2 === 0) ? '#2e7d32' : '#388e3c';
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawLotus(ctx, cx, cy, radius, palette) {
    ctx.save();
    ctx.translate(cx, cy);
    let petals = 8;
    for (let i = 0; i < petals; i++) {
      let a = (i / petals) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -radius * 0.5, radius * 0.25, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette[i % palette.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#f4d03f';
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.stroke();
    ctx.restore();
  }

  function drawCookieStar(ctx, x, y, size, color, angle, hash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    let spikes = 5, outer = size, inner = size * 0.45;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      let r = i % 2 === 0 ? outer : inner;
      let a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      let px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#7a4a1e';
    ctx.lineWidth = Math.max(size * 0.08, 1);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < spikes; i++) {
      let a = (i / spikes) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * outer * 0.5, Math.sin(a) * outer * 0.5, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGingerbreadMan(ctx, x, y, size, color, angle, hash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = Math.max(size * 0.06, 1);

    ctx.beginPath();
    ctx.arc(0, -size * 1.3, size * 0.4, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -size * 0.5, size * 0.45, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-size * 0.65, -size * 0.7, size * 0.5, size * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(size * 0.65, -size * 0.7, size * 0.5, size * 0.18, 0.4, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-size * 0.3, size * 0.3, size * 0.2, size * 0.55, 0.15, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(size * 0.3, size * 0.3, size * 0.2, size * 0.55, -0.15, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(-size * 0.15, -size * 1.35, size * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(size * 0.15, -size * 1.35, size * 0.05, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, -size * 0.8 + i * size * 0.35, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawChristmasTreeCookie(ctx, x, y, size, color, angle, hash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#0b3d1f';
    ctx.lineWidth = Math.max(size * 0.06, 1);

    ctx.beginPath();
    ctx.moveTo(0, -size * 1.4);
    ctx.lineTo(size * 0.55, -size * 0.6);
    ctx.lineTo(size * 0.3, -size * 0.6);
    ctx.lineTo(size * 0.7, size * 0.1);
    ctx.lineTo(size * 0.4, size * 0.1);
    ctx.lineTo(size * 0.85, size * 0.75);
    ctx.lineTo(-size * 0.85, size * 0.75);
    ctx.lineTo(-size * 0.4, size * 0.1);
    ctx.lineTo(-size * 0.7, size * 0.1);
    ctx.lineTo(-size * 0.3, -size * 0.6);
    ctx.lineTo(-size * 0.55, -size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6b4226';
    ctx.fillRect(-size * 0.15, size * 0.75, size * 0.3, size * 0.3);
    ctx.strokeRect(-size * 0.15, size * 0.75, size * 0.3, size * 0.3);

    let ornColors = ['#e74c3c', '#f1c40f', '#3498db', '#ffffff'];
    for (let i = 0; i < 5; i++) {
      let oy = -size * 1.0 + i * size * 0.45;
      let ox = (hash % 2 === 0 ? 1 : -1) * (i % 2) * size * 0.25;
      ctx.beginPath();
      ctx.arc(ox, oy, size * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = ornColors[(hash + i) % ornColors.length];
      ctx.fill();
    }
    ctx.restore();
  }

  function shadeColor(hex, factor) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);
    r = Math.min(255, Math.max(0, Math.round(r * factor)));
    g = Math.min(255, Math.max(0, Math.round(g * factor)));
    b = Math.min(255, Math.max(0, Math.round(b * factor)));
    return `rgb(${r},${g},${b})`;
  }

  function drawCoinLegend(ctx, text, radius, fontSize, arc, centerAngle) {
    ctx.save();
    ctx.font = `bold ${fontSize}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let n = text.length;
    let anglePerChar = n > 1 ? arc / (n - 1) : 0;
    let startAngle = centerAngle - arc / 2;
    for (let i = 0; i < n; i++) {
      let a = startAngle + i * anglePerChar;
      let px = Math.cos(a) * radius, py = Math.sin(a) * radius;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  const COIN_LEGENDS = ['REPUBLIC', 'LIBERTAS', 'UNITY', 'DOMINION', 'FEDERATION', 'ONE WORLD', 'CONCORDIA', 'UNION'];

  function drawCoin(ctx, x, y, radius, color, hash) {
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    ctx.arc(radius * 0.1, radius * 0.14, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    ctx.rotate((hash % 360) * Math.PI / 180);

    let wear = (hash % 100) / 100;
    let baseColor = shadeColor(color, 1 - wear * 0.4);
    let legendAlpha = 0.55 - wear * 0.25;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(radius * 0.06, 1);
    ctx.stroke();

    let ridges = 28;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(radius * 0.04, 0.5);
    for (let i = 0; i < ridges; i++) {
      let a = (i / ridges) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.93, Math.sin(a) * radius * 0.93);
      ctx.lineTo(Math.cos(a) * radius * 0.99, Math.sin(a) * radius * 0.99);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.84, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = Math.max(radius * 0.05, 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();

    if (radius > 10) {
      ctx.fillStyle = `rgba(0,0,0,${legendAlpha})`;
      drawCoinLegend(ctx, COIN_LEGENDS[hash % COIN_LEGENDS.length], radius * 0.68, Math.max(radius * 0.16, 4), Math.PI * 0.85, -Math.PI / 2);
    }

    let type = hash % 5;
    ctx.fillStyle = `rgba(0,0,0,${legendAlpha + 0.1})`;
    ctx.strokeStyle = `rgba(0,0,0,${legendAlpha + 0.1})`;
    ctx.lineWidth = Math.max(radius * 0.05, 1);
    if (type === 0) {
      ctx.beginPath();
      ctx.arc(-radius * 0.05, -radius * 0.22, radius * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-radius * 0.38, radius * 0.15);
      ctx.quadraticCurveTo(-radius * 0.08, radius * 0.02, radius * 0.08, radius * 0.12);
      ctx.quadraticCurveTo(radius * 0.2, radius * 0.3, radius * 0.42, radius * 0.48);
      ctx.lineTo(-radius * 0.42, radius * 0.48);
      ctx.closePath();
      ctx.fill();
    } else if (type === 1) {
      let denominations = ['1', '5', '10', '20', '25', '50', '100'];
      let text = denominations[hash % denominations.length];
      ctx.font = `bold ${radius * 0.7}px Georgia, 'Times New Roman', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, radius * 0.02);
    } else if (type === 2) {
      let spikes = 5, outer = radius * 0.45, inner = radius * 0.2;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        let r = i % 2 === 0 ? outer : inner;
        let a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        let px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (type === 3) {
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 5; i++) {
          let a = Math.PI * 0.5 + side * (0.25 + i * 0.18);
          let lx = Math.cos(a) * radius * 0.4;
          let ly = Math.sin(a) * radius * 0.4;
          ctx.beginPath();
          ctx.ellipse(lx, ly, radius * 0.09, radius * 0.045, a + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.28, -radius * 0.3);
      ctx.lineTo(radius * 0.28, -radius * 0.3);
      ctx.lineTo(radius * 0.28, radius * 0.05);
      ctx.quadraticCurveTo(radius * 0.28, radius * 0.35, 0, radius * 0.48);
      ctx.quadraticCurveTo(-radius * 0.28, radius * 0.35, -radius * 0.28, radius * 0.05);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-radius * 0.28, -radius * 0.05);
      ctx.lineTo(radius * 0.28, -radius * 0.05);
      ctx.stroke();
    }

    if ((type === 0 || type === 1) && radius > 12) {
      let year = 1900 + (hash % 100);
      ctx.font = `${radius * 0.16}px Georgia, 'Times New Roman', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(0,0,0,${legendAlpha})`;
      ctx.fillText(String(year), 0, radius * 0.62);
    }

    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.22 - wear * 0.15})`;
    ctx.fill();

    ctx.restore();
  }

  function gemCutOutline(cutType, size) {
    if (cutType === 1) {
      let pts = [];
      for (let i = 0; i < 10; i++) {
        let a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        pts.push({ x: Math.cos(a) * size * 0.72, y: Math.sin(a) * size });
      }
      return pts;
    } else if (cutType === 2) {
      return [
        { x: 0, y: -size }, { x: size * 0.3, y: -size * 0.62 }, { x: size * 0.52, y: -size * 0.12 },
        { x: size * 0.5, y: size * 0.38 }, { x: size * 0.28, y: size * 0.75 }, { x: 0, y: size * 0.92 },
        { x: -size * 0.28, y: size * 0.75 }, { x: -size * 0.5, y: size * 0.38 },
        { x: -size * 0.52, y: -size * 0.12 }, { x: -size * 0.3, y: -size * 0.62 }
      ];
    } else if (cutType === 3) {
      return [
        { x: 0, y: -size }, { x: size * 0.4, y: -size * 0.55 }, { x: size * 0.52, y: 0 }, { x: size * 0.4, y: size * 0.55 },
        { x: 0, y: size }, { x: -size * 0.4, y: size * 0.55 }, { x: -size * 0.52, y: 0 }, { x: -size * 0.4, y: -size * 0.55 }
      ];
    } else if (cutType === 4) {
      let s = size * 0.8;
      return [
        { x: -s * 0.55, y: -s }, { x: s * 0.55, y: -s }, { x: s, y: -s * 0.55}, { x: s, y: s * 0.55 },
        { x: s * 0.55, y: s }, { x: -s * 0.55, y: s }, { x: -s, y: s * 0.55 }, { x: -s, y: -s * 0.55 }
      ];
    }
    let pts = [];
    for (let i = 0; i < 8; i++) {
      let a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: Math.cos(a) * size, y: Math.sin(a) * size });
    }
    return pts;
  }

  function drawGem(ctx, x, y, size, color, angle, hash) {
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    ctx.ellipse(size * 0.1, size * 0.16, size * 0.95, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    ctx.rotate(angle);

    let cutType = hash % 5;
    let outer = gemCutOutline(cutType, size);
    let inner = outer.map(p => ({ x: p.x * 0.4, y: p.y * 0.4 }));
    let n = outer.length;

    let shades = [shadeColor(color, 1.65), shadeColor(color, 1.3), shadeColor(color, 1.0), shadeColor(color, 0.72), shadeColor(color, 0.48)];

    ctx.beginPath();
    inner.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    ctx.fillStyle = shades[0];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(size * 0.03, 0.5);
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      let i2 = (i + 1) % n;
      ctx.beginPath();
      ctx.moveTo(inner[i].x, inner[i].y);
      ctx.lineTo(outer[i].x, outer[i].y);
      ctx.lineTo(outer[i2].x, outer[i2].y);
      ctx.lineTo(inner[i2].x, inner[i2].y);
      ctx.closePath();
      let shadeIdx = 1 + ((i + Math.floor(hash / 7)) % 4);
      ctx.fillStyle = shades[shadeIdx];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = Math.max(size * 0.035, 0.5);
      ctx.stroke();
    }

    ctx.beginPath();
    outer.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(size * 0.05, 1);
    ctx.stroke();

    let glintAngle = (hash % 360) * Math.PI / 180;
    let gx = Math.cos(glintAngle) * size * 0.22, gy = Math.sin(glintAngle) * size * 0.22 - size * 0.12;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(size * 0.05, 1);
    ctx.beginPath();
    ctx.moveTo(gx - size * 0.18, gy); ctx.lineTo(gx + size * 0.18, gy);
    ctx.moveTo(gx, gy - size * 0.18); ctx.lineTo(gx, gy + size * 0.18);
    ctx.stroke();

    ctx.restore();
  }

  function buttonOutline(ctx, shapeType, r) {
    ctx.beginPath();
    if (shapeType === 6 || shapeType === 7) {
      let s = r * 0.85, rc = s * 0.25;
      ctx.moveTo(-s + rc, -s);
      ctx.lineTo(s - rc, -s); ctx.quadraticCurveTo(s, -s, s, -s + rc);
      ctx.lineTo(s, s - rc); ctx.quadraticCurveTo(s, s, s - rc, s);
      ctx.lineTo(-s + rc, s); ctx.quadraticCurveTo(-s, s, -s, s - rc);
      ctx.lineTo(-s, -s + rc); ctx.quadraticCurveTo(-s, -s, -s + rc, -s);
      ctx.closePath();
    } else if (shapeType === 8) {
      for (let i = 0; i < 8; i++) {
        let a = (i / 8) * Math.PI * 2 - Math.PI / 8;
        let px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shapeType === 9) {
      let petals = 8;
      for (let i = 0; i <= petals * 2; i++) {
        let a = (i / (petals * 2)) * Math.PI * 2;
        let rr = i % 2 === 0 ? r : r * 0.85;
        let px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
  }

  function drawButton(ctx, x, y, radius, color, hash) {
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    ctx.ellipse(radius * 0.1, radius * 0.14, radius, radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    ctx.rotate((hash % 360) * Math.PI / 180);

    let shapeType = hash % 10;

    buttonOutline(ctx, shapeType, radius);
    ctx.fillStyle = shadeColor(color, 1.05);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(radius * 0.05, 1);
    ctx.stroke();

    buttonOutline(ctx, shapeType, radius * 0.72);
    ctx.fillStyle = shadeColor(color, 0.88);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(radius * 0.03, 0.5);
    ctx.stroke();

    if (hash % 3 === 0) {
      ctx.save();
      buttonOutline(ctx, shapeType, radius * 0.72);
      ctx.clip();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = shadeColor(color, hash % 2 === 0 ? 1.4 : 0.55);
      ctx.lineWidth = Math.max(radius * 0.07, 1);
      for (let i = 0; i < 3; i++) {
        let a = ((hash + i * 40) % 180) * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
        ctx.lineTo(Math.cos(a + Math.PI) * radius, Math.sin(a + Math.PI) * radius);
        ctx.stroke();
      }
      ctx.restore();
    }

    let holeStyle = hash % 4;
    let holeR = Math.max(radius * 0.09, 1);
    ctx.fillStyle = 'rgba(20,15,10,0.85)';
    if (holeStyle === 0) {
      let d = radius * 0.22;
      [[0, -d], [0, d], [-d, 0], [d, 0]].forEach(([hx, hy]) => {
        ctx.beginPath(); ctx.arc(hx, hy, holeR, 0, Math.PI * 2); ctx.fill();
      });
    } else if (holeStyle === 1) {
      let d = radius * 0.24;
      [[-d, 0], [d, 0]].forEach(([hx, hy]) => {
        ctx.beginPath(); ctx.arc(hx, hy, holeR, 0, Math.PI * 2); ctx.fill();
      });
    } else if (holeStyle === 2) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = shadeColor(color, 0.7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      let d = radius * 0.2;
      [[-d, -d], [d, -d], [-d, d], [d, d]].forEach(([hx, hy]) => {
        ctx.beginPath(); ctx.arc(hx, hy, holeR, 0, Math.PI * 2); ctx.fill();
      });
    }

    ctx.beginPath();
    ctx.ellipse(-radius * 0.32, -radius * 0.32, radius * 0.28, radius * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    ctx.restore();
  }

  function drawFallLeaf(ctx, x, y, size, color, angle, hash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = shadeColor(color, 0.6);
    ctx.lineWidth = Math.max(size * 0.05, 1);

    let isMaple = hash % 2 !== 0;
    let mapleTipAngles = [], mapleTipRs = [], mapleBase = { x: 0, y: size * 0.88 };
    const polar = (a, r) => ({ x: Math.sin(a) * r, y: -Math.cos(a) * r });

    if (!isMaple) {
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.2);
      ctx.quadraticCurveTo(size * 0.75, -size * 0.4, size * 0.5, size * 0.5);
      ctx.quadraticCurveTo(size * 0.2, size * 1.1, 0, size * 1.3);
      ctx.quadraticCurveTo(-size * 0.2, size * 1.1, -size * 0.5, size * 0.5);
      ctx.quadraticCurveTo(-size * 0.75, -size * 0.4, 0, -size * 1.2);
      ctx.closePath();
    } else {
      let lobes = 5;
      let tipRFactors = [0.85, 1.0, 1.15, 1.0, 0.85];
      for (let i = 0; i < lobes; i++) {
        mapleTipAngles.push((i - (lobes - 1) / 2) * 0.44);
        mapleTipRs.push(size * tipRFactors[i]);
      }
      let notchR = size * 0.62;
      ctx.beginPath();
      let first = polar(mapleTipAngles[0], mapleTipRs[0]);
      ctx.moveTo(first.x, first.y);
      let lastTip = first;
      for (let i = 0; i < lobes - 1; i++) {
        let a0 = mapleTipAngles[i], a1 = mapleTipAngles[i + 1];
        let notch = polar((a0 + a1) / 2, notchR);
        let nextTip = polar(a1, mapleTipRs[i + 1]);
        ctx.lineTo(notch.x, notch.y);
        ctx.lineTo(nextTip.x, nextTip.y);
        lastTip = nextTip;
      }
      ctx.lineTo(lastTip.x * 0.55, mapleBase.y * 0.75);
      ctx.lineTo(mapleBase.x, mapleBase.y);
      ctx.lineTo(first.x * 0.55, mapleBase.y * 0.75);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = shadeColor(color, 0.55);
    ctx.lineWidth = Math.max(size * 0.04, 1);
    if (!isMaple) {
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.1);
      ctx.lineTo(0, size * 1.15);
      ctx.moveTo(0, -size * 0.2);
      ctx.lineTo(size * 0.35, size * 0.1);
      ctx.moveTo(0, size * 0.3);
      ctx.lineTo(-size * 0.35, size * 0.6);
      ctx.stroke();
    } else {
      for (let i = 0; i < mapleTipAngles.length; i++) {
        let tip = polar(mapleTipAngles[i], mapleTipRs[i] * 0.82);
        ctx.beginPath();
        ctx.moveTo(0, size * 0.62);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = shadeColor(color, 0.45);
    ctx.lineWidth = Math.max(size * 0.06, 1);
    ctx.beginPath();
    if (!isMaple) {
      ctx.moveTo(0, size * 1.15);
      ctx.lineTo(0, size * 1.5);
    } else {
      ctx.moveTo(0, mapleBase.y * 0.95);
      ctx.lineTo(0, size * 1.2);
    }
    ctx.stroke();

    ctx.restore();
  }

  function drawAcorn(ctx, x, y, size, angle, hash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    let bodyTone = Math.floor(hash / 3) % 3;
    let bodyColor = bodyTone === 0 ? '#a9752f' : bodyTone === 1 ? '#c08a3e' : '#8f6524';

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = shadeColor(bodyColor, 0.55);
    ctx.lineWidth = Math.max(size * 0.06, 1);
    ctx.beginPath();
    ctx.moveTo(-size * 0.55, -size * 0.05);
    ctx.quadraticCurveTo(-size * 0.6, size * 0.7, 0, size * 1.05);
    ctx.quadraticCurveTo(size * 0.6, size * 0.7, size * 0.55, -size * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(size * 0.05, 1);
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, size * 0.1);
    ctx.lineTo(-size * 0.15, size * 0.7);
    ctx.stroke();

    let capColor = '#5e3a21';
    let domeL0 = { x: -size * 0.62, y: -size * 0.05 };
    let domeL1 = { x: -size * 0.5, y: -size * 0.55 };
    let domeTop = { x: 0, y: -size * 0.6 };
    let domeR1 = { x: size * 0.5, y: -size * 0.55 };
    let domeR0 = { x: size * 0.62, y: -size * 0.05 };
    ctx.fillStyle = capColor;
    ctx.strokeStyle = shadeColor(capColor, 0.55);
    ctx.lineWidth = Math.max(size * 0.06, 1);
    ctx.beginPath();
    ctx.moveTo(domeL0.x, domeL0.y);
    ctx.quadraticCurveTo(domeL1.x, domeL1.y, domeTop.x, domeTop.y);
    ctx.quadraticCurveTo(domeR1.x, domeR1.y, domeR0.x, domeR0.y);
    ctx.quadraticCurveTo(0, size * 0.12, domeL0.x, domeL0.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    let bez2 = (p0, p1, p2, t) => {
      let mt = 1 - t;
      return { x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x, y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y };
    };
    let capApex = { x: 0, y: -size * 0.4 };
    ctx.strokeStyle = shadeColor(capColor, 0.4);
    ctx.lineWidth = Math.max(size * 0.025, 1);
    for (let rt = -1; rt <= 1.001; rt += 1 / 3) {
      let pt = rt <= 0 ? bez2(domeL0, domeL1, domeTop, rt + 1) : bez2(domeTop, domeR1, domeR0, rt);
      ctx.beginPath();
      ctx.moveTo(capApex.x, capApex.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }

    ctx.fillStyle = shadeColor(capColor, 0.7);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.62, size * 0.08, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawGourd(ctx, x, y, size, angle, hash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    let colors = ['#d2691e', '#e8a13a', '#e8ddb5', '#8a9a5b'];
    let bodyColor = colors[hash % colors.length];
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = shadeColor(bodyColor, 0.55);
    ctx.lineWidth = Math.max(size * 0.06, 1);

    let variant = 1 + (Math.floor(hash / 3) % 2);
    if (variant === 0) {
      let bodyRx = size * 0.85, bodyRy = size * 0.7, bodyCy = size * 0.1;
      let bodyPath = new Path2D();
      bodyPath.ellipse(0, bodyCy, bodyRx, bodyRy, 0, 0, Math.PI * 2);
      ctx.fillStyle = shadeColor(bodyColor, 0.95);
      ctx.fill(bodyPath);

      ctx.save();
      ctx.clip(bodyPath);
      let numRibs = 6;
      let ribW = (bodyRx * 2) / numRibs;
      let parity = Math.floor(hash / 2) % 2;
      for (let i = 0; i < numRibs; i++) {
        let cx = -bodyRx + (i + 0.5) * ribW;
        ctx.fillStyle = shadeColor(bodyColor, (i + parity) % 2 === 0 ? 1.2 : 0.78);
        ctx.beginPath();
        ctx.ellipse(cx, bodyCy, ribW * 0.56, bodyRy * 0.98, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = shadeColor(bodyColor, 0.42);
      ctx.lineWidth = Math.max(size * 0.02, 1);
      for (let i = 1; i < numRibs; i++) {
        let cx = -bodyRx + i * ribW;
        ctx.beginPath();
        ctx.ellipse(cx, bodyCy, ribW * 0.07, bodyRy * 0.98, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = shadeColor(bodyColor, 0.55);
      ctx.lineWidth = Math.max(size * 0.06, 1);
      ctx.stroke(bodyPath);
    } else if (variant === 1) {
      let wartyColors = ['#e8a13a', '#e8ddb5', '#8a9a5b'];
      bodyColor = wartyColors[Math.floor(hash / 3) % wartyColors.length];
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = shadeColor(bodyColor, 0.55);

      let bodyPath = new Path2D();
      bodyPath.moveTo(-size * 0.5, size * 0.75);
      bodyPath.quadraticCurveTo(-size * 0.75, -size * 0.1, -size * 0.25, -size * 0.55);
      bodyPath.quadraticCurveTo(0, -size * 0.75, size * 0.2, -size * 0.5);
      bodyPath.quadraticCurveTo(size * 0.65, -size * 0.05, size * 0.45, size * 0.75);
      bodyPath.quadraticCurveTo(0, size * 1.0, -size * 0.5, size * 0.75);
      bodyPath.closePath();
      ctx.fill(bodyPath);
      ctx.stroke(bodyPath);

      let mix = (n) => { let v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
      ctx.save();
      ctx.clip(bodyPath);
      let cols = 7, rows = 9;
      let gx0 = -size * 0.75, gx1 = size * 0.65, gy0 = -size * 0.8, gy1 = size * 1.0;
      let cellW = (gx1 - gx0) / cols, cellH = (gy1 - gy0) / rows;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let seed = hash * 97 + row * 13 + col * 31;
          let bx = gx0 + (col + 0.5) * cellW + (mix(seed + 1.1) - 0.5) * cellW * 0.7;
          let by = gy0 + (row + 0.5) * cellH + (mix(seed + 2.7) - 0.5) * cellH * 0.7;
          let r = Math.max(size * (0.05 + mix(seed + 3.3) * 0.04), 1.6);
          ctx.fillStyle = bodyColor;
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, Math.PI * 2);
          ctx.fill();
          if (r > 2.5) {
            ctx.fillStyle = shadeColor(bodyColor, 0.6);
            ctx.beginPath();
            ctx.arc(bx + r * 0.3, by + r * 0.3, r * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = shadeColor(bodyColor, 1.35);
            ctx.beginPath();
            ctx.arc(bx - r * 0.3, by - r * 0.3, r * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();

      ctx.strokeStyle = shadeColor(bodyColor, 0.55);
      ctx.lineWidth = Math.max(size * 0.06, 1);
      ctx.stroke(bodyPath);
    } else {
      let numLobes = 10;
      let midR = size * 0.85, amp = size * 0.045;
      let stemR = size * 0.14;
      ctx.beginPath();
      let steps = numLobes * 8;
      for (let s = 0; s <= steps; s++) {
        let theta = (s / steps) * Math.PI * 2;
        let r = midR + amp * Math.cos(numLobes * theta);
        let px = Math.cos(theta) * r, py = Math.sin(theta) * r;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = shadeColor(bodyColor, 0.98);
      ctx.fill();
      ctx.stroke();

      for (let k = 0; k < numLobes; k++) {
        let valleyTheta = (k + 0.5) * (Math.PI * 2 / numLobes);
        let valleyR = midR + amp * Math.cos(numLobes * valleyTheta);
        ctx.strokeStyle = shadeColor(bodyColor, 0.45);
        ctx.lineWidth = Math.max(size * 0.035, 1);
        ctx.beginPath();
        ctx.moveTo(Math.cos(valleyTheta) * stemR, Math.sin(valleyTheta) * stemR);
        ctx.lineTo(Math.cos(valleyTheta) * valleyR * 0.97, Math.sin(valleyTheta) * valleyR * 0.97);
        ctx.stroke();

        let peakTheta = k * (Math.PI * 2 / numLobes);
        let peakR = midR + amp;
        ctx.strokeStyle = shadeColor(bodyColor, 1.3);
        ctx.lineWidth = Math.max(size * 0.03, 1);
        ctx.beginPath();
        ctx.moveTo(Math.cos(peakTheta) * stemR * 1.4, Math.sin(peakTheta) * stemR * 1.4);
        ctx.lineTo(Math.cos(peakTheta) * peakR * 0.8, Math.sin(peakTheta) * peakR * 0.8);
        ctx.stroke();
      }

      ctx.fillStyle = '#5a3d1a';
      ctx.strokeStyle = shadeColor('#5a3d1a', 0.65);
      ctx.lineWidth = Math.max(size * 0.02, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, stemR, stemR * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = shadeColor('#5a3d1a', 1.5);
      ctx.lineWidth = Math.max(size * 0.015, 1);
      ctx.beginPath();
      ctx.moveTo(-stemR * 0.5, 0);
      ctx.lineTo(stemR * 0.5, 0);
      ctx.moveTo(0, -stemR * 0.4);
      ctx.lineTo(0, stemR * 0.4);
      ctx.stroke();
    }

    if (variant !== 2) {
      ctx.strokeStyle = '#5a3d1a';
      ctx.lineWidth = Math.max(size * 0.1, 1);
      ctx.beginPath();
      ctx.moveTo(size * 0.05, -size * 0.6);
      ctx.quadraticCurveTo(size * 0.2, -size * 0.85, size * 0.05, -size * 1.0);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPineCone(ctx, x, y, size, angle, hash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    let bodyColor = (hash % 2 === 0) ? '#6b4a2f' : '#7d5a3a';
    let bodyPath = new Path2D();
    bodyPath.moveTo(0, -size * 1.3);
    bodyPath.quadraticCurveTo(size * 0.55, -size * 0.6, size * 0.5, size * 0.3);
    bodyPath.quadraticCurveTo(size * 0.4, size * 1.1, 0, size * 1.35);
    bodyPath.quadraticCurveTo(-size * 0.4, size * 1.1, -size * 0.5, size * 0.3);
    bodyPath.quadraticCurveTo(-size * 0.55, -size * 0.6, 0, -size * 1.3);
    bodyPath.closePath();
    ctx.fillStyle = shadeColor(bodyColor, 0.85);
    ctx.strokeStyle = shadeColor(bodyColor, 0.5);
    ctx.lineWidth = Math.max(size * 0.05, 1);
    ctx.fill(bodyPath);
    ctx.stroke(bodyPath);

    let bez2c = (p0, p1, p2, t) => {
      let mt = 1 - t;
      return { x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x, y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y };
    };
    let coneTop = { x: 0, y: -size * 1.3 }, coneMidR = { x: size * 0.5, y: size * 0.3 }, coneCtrlUpper = { x: size * 0.55, y: -size * 0.6 };
    let coneBottom = { x: 0, y: size * 1.35 }, coneCtrlLower = { x: size * 0.4, y: size * 1.1 };
    function halfWidthAtY(targetY) {
      let p0, p1, p2;
      if (targetY <= coneMidR.y) { p0 = coneTop; p1 = coneCtrlUpper; p2 = coneMidR; }
      else { p0 = coneMidR; p1 = coneCtrlLower; p2 = coneBottom; }
      let lo = 0, hi = 1;
      for (let k = 0; k < 16; k++) {
        let mid = (lo + hi) / 2;
        if (bez2c(p0, p1, p2, mid).y < targetY) lo = mid; else hi = mid;
      }
      return Math.abs(bez2c(p0, p1, p2, (lo + hi) / 2).x);
    }
    const GOLDEN_FRAC = 0.6180339887498949;
    function clampToBody(px, py) {
      let hw = halfWidthAtY(py);
      return Math.sign(px) * Math.min(Math.abs(px), hw);
    }

    let bandCount = 11;
    let topY = -size * 1.3, bottomY = size * 1.35;
    let bandH = (bottomY - topY) / bandCount;
    let anchorSpacing = size * 0.3;
    ctx.lineWidth = Math.max(size * 0.022, 1);
    for (let i = 0; i < bandCount; i++) {
      let bandTopY = topY + i * bandH, bandBottomY = bandTopY + bandH;
      let bandMidY = (bandTopY + bandBottomY) / 2;
      let hwMid = halfWidthAtY(bandMidY);
      if (hwMid < size * 0.04) continue;
      let numAnchors = Math.max(1, Math.round((hwMid * 2) / anchorSpacing));
      let cellW = (hwMid * 2) / numAnchors;
      let phase = ((i * GOLDEN_FRAC) % 1) * cellW;
      for (let k = -1; k <= numAnchors; k++) {
        let ax = -hwMid + phase + (k + 0.5) * cellW;
        if (Math.abs(ax) > halfWidthAtY(bandMidY) + cellW * 0.5) continue;
        let half = cellW / 2;
        let topL = clampToBody(ax - half, bandTopY), topR = clampToBody(ax + half, bandTopY);
        let botL = clampToBody(ax - half, bandBottomY), botR = clampToBody(ax + half, bandBottomY);
        ctx.strokeStyle = shadeColor(bodyColor, 0.4 + 0.08 * ((i + k + hash) % 2));
        ctx.beginPath();
        ctx.moveTo(topL, bandTopY);
        ctx.lineTo(botR, bandBottomY);
        ctx.moveTo(topR, bandTopY);
        ctx.lineTo(botL, bandBottomY);
        ctx.stroke();

        if (Math.abs(ax) <= halfWidthAtY(bandMidY)) {
          ctx.strokeStyle = shadeColor(bodyColor, 1.7);
          ctx.lineWidth = Math.max(size * 0.028, 1);
          let tickLen = Math.min(size * 0.09, cellW * 0.4);
          ctx.beginPath();
          ctx.moveTo(ax, bandMidY - tickLen * 0.5);
          ctx.lineTo(ax, bandMidY + tickLen * 0.5);
          ctx.stroke();
          ctx.lineWidth = Math.max(size * 0.022, 1);
        }
      }
    }

    ctx.restore();
  }

  function drawSteampunkGear(ctx, cx, cy, radius, color, hash, palette, rotation) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation !== undefined ? rotation : hash);

    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = radius * 0.2;
    ctx.shadowOffsetX = radius * 0.05;
    ctx.shadowOffsetY = radius * 0.1;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#111';

    let teethCount = 8 + (hash % 12) * 2;
    ctx.beginPath();
    let innerR = radius * 0.8;
    for (let i = 0; i < teethCount; i++) {
      let a1 = (i / teethCount) * Math.PI * 2;
      let a2 = ((i + 0.3) / teethCount) * Math.PI * 2;
      let a3 = ((i + 0.7) / teethCount) * Math.PI * 2;
      let a4 = ((i + 1.0) / teethCount) * Math.PI * 2;

      if (i === 0) ctx.moveTo(Math.cos(a1)*radius, Math.sin(a1)*radius);
      else ctx.lineTo(Math.cos(a1)*radius, Math.sin(a1)*radius);
      ctx.lineTo(Math.cos(a2)*radius, Math.sin(a2)*radius);
      ctx.lineTo(Math.cos(a3)*innerR, Math.sin(a3)*innerR);
      ctx.lineTo(Math.cos(a4)*innerR, Math.sin(a4)*innerR);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.stroke();

    let type = hash % 3;

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = '#1a110a';
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = color;

    if (type === 0 && radius > 15) {
      let spokes = 4 + (hash % 3);
      ctx.beginPath();
      ctx.arc(0,0, radius*0.25, 0, Math.PI*2);
      for(let i=0; i<spokes; i++) {
        let a = (i/spokes)*Math.PI*2;
        ctx.moveTo(Math.cos(a)*radius*0.2, Math.sin(a)*radius*0.2);
        ctx.lineTo(Math.cos(a-0.1)*radius*0.65, Math.sin(a-0.1)*radius*0.65);
        ctx.lineTo(Math.cos(a+0.1)*radius*0.65, Math.sin(a+0.1)*radius*0.65);
        ctx.lineTo(Math.cos(a)*radius*0.2, Math.sin(a)*radius*0.2);
      }
      ctx.fill(); ctx.stroke();
    } else if (type === 1 && radius > 15) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      let holes = 4 + (hash % 4);
      for(let i=0; i<holes; i++) {
        let a = (i/holes)*Math.PI*2;
        ctx.beginPath();
        ctx.arc(Math.cos(a)*radius*0.4, Math.sin(a)*radius*0.4, radius*0.15, 0, Math.PI*2);
        ctx.fillStyle = '#1a110a';
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = color;
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = palette[(hash+1) % palette.length];
      ctx.fill(); ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = palette[(hash+2) % palette.length];
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill(); ctx.stroke();

    if (radius > 20) {
      ctx.fillStyle = '#8f9294';
      for (let i = 0; i < 6; i++) {
        let a = (i / 6) * Math.PI * 2 + (hash%Math.PI);
        ctx.beginPath();
        ctx.arc(Math.cos(a)*radius*0.72, Math.sin(a)*radius*0.72, 1.5, 0, Math.PI*2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function colorCountFromPct(pct, paletteLength) {
    return 1 + Math.round(pct * (paletteLength - 1));
  }

  function pickColorSubset(palette, n) {
    n = Math.max(1, Math.min(Math.round(n), palette.length));
    let result;
    if (n >= palette.length) {
      result = palette;
    } else {
      let localRandom = makeRng((colorSeed ^ Math.imul(palette.length, 2654435761) ^ Math.imul(n, 40503)) >>> 0);
      let indices = palette.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        let j = Math.floor(localRandom() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      result = indices.slice(0, n).map(i => palette[i]);
    }
    currentColorPool = result;
    return result;
  }
  function colorPoolFingerprint() {
    return currentColorPool.slice().sort().join(',');
  }

  function assignStreakColors(items, palette, changePct, maxRun) {
    if (!items.length) return;
    let activePalette = pickColorSubset(palette, colorCountFromPct(changePct, palette.length));
    let rollChance = 0.15 + changePct * 0.35;
    let color = activePalette[Math.floor(colorRandom() * activePalette.length)];
    let run = 0;
    items.forEach(item => {
      let forceChange = maxRun > 0 && run >= maxRun;
      if (forceChange || colorRandom() < rollChance) {
        let alt = activePalette.filter(c => c !== color);
        color = alt.length ? alt[Math.floor(colorRandom() * alt.length)] : color;
        run = 1;
      } else {
        run++;
      }
      item.streakColor = color;
    });
  }

  function drawPipeOutline(ctx, x1, y1, x2, y2, pipeThickness, isCyl) {
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = isCyl ? (pipeThickness * 1.8 + 4) : (pipeThickness + 4);
    ctx.stroke();
  }

  function drawPipeEdge(ctx, x1, y1, x2, y2, pipeThickness, color, style, isCyl) {
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = isCyl ? (pipeThickness * 1.8) : pipeThickness;
    ctx.stroke();

    if (style === '3d-basic' || style === '3d-glossy') {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = pipeThickness * 0.4;
      ctx.stroke();
    } else if (style === 'illustrated') {
      let dx = x2 - x1, dy = y2 - y1;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let ribSpacing = isCyl ? (pipeThickness * 0.4) : (pipeThickness * 0.7);
      let steps = Math.floor(dist / ribSpacing);
      if (steps > 0) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = isCyl ? 1.5 : Math.max(pipeThickness * 0.15, 1);
        let nx = -dy / dist * (pipeThickness * (isCyl ? 0.9 : 0.45));
        let ny = dx / dist * (pipeThickness * (isCyl ? 0.9 : 0.45));
        for (let i = 1; i <= steps; i++) {
          let px = x1 + dx * (i / (steps + 1));
          let py = y1 + dy * (i / (steps + 1));
          ctx.beginPath();
          ctx.moveTo(px + nx, py + ny);
          ctx.lineTo(px - nx, py - ny);
          ctx.stroke();
        }
      }
    }

    if (style === '3d-glossy') {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = Math.max(pipeThickness * 0.1, 1);
      ctx.stroke();
    }
  }

  function drawPipeJoint(ctx, x, y, pipeThickness, color, style) {
    let jointRadius = (style === 'illustrated') ? pipeThickness * 0.8 : pipeThickness * 0.65;
    ctx.beginPath();
    ctx.arc(x, y, jointRadius, 0, Math.PI * 2);
    ctx.fillStyle = (style === 'flat') ? (color || '#555') : (style === 'illustrated' ? '#bdc3c7' : '#555');
    ctx.fill();

    if (style === '3d-basic' || style === '3d-glossy') {
      ctx.beginPath();
      ctx.arc(x - pipeThickness * 0.15, y - pipeThickness * 0.15, pipeThickness * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = (style === '3d-glossy') ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
      ctx.fill();
    } else if (style === 'illustrated') {
      ctx.beginPath();
      ctx.arc(x, y, jointRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, jointRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#e6c229';
      ctx.fill();
    }
  }

  function drawCircuitWire(ctx, x1, y1, x2, y2, pipeThickness, isJumper) {
    if (isJumper) {
      ctx.beginPath();
      ctx.moveTo(x1 + 2, y1 + 2); ctx.lineTo(x2 + 2, y2 + 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = pipeThickness * 0.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = pipeThickness * 0.35;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#8c7311';
      ctx.lineWidth = pipeThickness * 0.45;
      ctx.stroke();
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = pipeThickness * 0.35;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#b87333';
      ctx.lineWidth = pipeThickness * 0.5;
      ctx.stroke();
    }
  }

  function drawCircuitPad(ctx, x, y, pipeThickness) {
    let padRadius = pipeThickness * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, padRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#a9a9a9';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + padRadius * 0.1, y - padRadius * 0.1, padRadius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#c0c0c0';
    ctx.fill();
  }

  function drawCircuitResistor(ctx, midX, midY, angle, pipeThickness, hash) {
    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);

    let resLen = pipeThickness * 2.5;
    let resWidth = pipeThickness * 0.9;

    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = pipeThickness * 0.15;
    ctx.beginPath();
    ctx.moveTo(-resLen / 2, 0); ctx.lineTo(-resLen * 0.9, 0);
    ctx.moveTo(resLen / 2, 0); ctx.lineTo(resLen * 0.9, 0);
    ctx.stroke();

    let colors = ['#000000', '#8b4513', '#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff'];
    let b1 = colors[hash % colors.length];
    let b2 = colors[(hash * 3) % colors.length];
    let b3 = colors[(hash * 5) % colors.length];
    let b4 = '#d4af37';
    let t = hash % 100;

    if (t < 34) {
      ctx.fillStyle = '#a52a2a';
      ctx.fillRect(-resLen / 2, -resWidth / 2, resLen, resWidth);
      ctx.strokeStyle = '#5c1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-resLen / 2, -resWidth / 2, resLen, resWidth);

      ctx.fillStyle = '#e6ccaa';
      ctx.font = `${pipeThickness * 0.4}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hash % 2 === 0 ? "K5%" : "6.2 K5%", 0, 0);

    } else if (t < 67) {
      ctx.fillStyle = '#d2b48c';
      ctx.fillRect(-resLen / 2, -resWidth / 2, resLen, resWidth);
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 1;
      ctx.strokeRect(-resLen / 2, -resWidth / 2, resLen, resWidth);

      let bandW = resLen * 0.12;
      ctx.fillStyle = b1; ctx.fillRect(-resLen * 0.35, -resWidth / 2, bandW, resWidth);
      ctx.fillStyle = b2; ctx.fillRect(-resLen * 0.15, -resWidth / 2, bandW, resWidth);
      ctx.fillStyle = b3; ctx.fillRect(resLen * 0.05, -resWidth / 2, bandW, resWidth);
      ctx.fillStyle = b4; ctx.fillRect(resLen * 0.25, -resWidth / 2, bandW, resWidth);

    } else {
      let l = resLen * 0.85, w = resWidth * 0.75;
      ctx.fillStyle = '#4a2f1d';
      ctx.fillRect(-l / 2, -w / 2, l, w);
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 1;
      ctx.strokeRect(-l / 2, -w / 2, l, w);

      let bandW = l * 0.12;
      ctx.fillStyle = b2; ctx.fillRect(-l * 0.35, -w / 2, bandW, w);
      ctx.fillStyle = b3; ctx.fillRect(-l * 0.15, -w / 2, bandW, w);
      ctx.fillStyle = b1; ctx.fillRect(l * 0.05, -w / 2, bandW, w);
      ctx.fillStyle = b4; ctx.fillRect(l * 0.25, -w / 2, bandW, w);
    }
    ctx.restore();
  }

  function drawCircuitAccentComponent(ctx, midX, midY, angle, pipeThickness, hash) {
    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);
    let scale = 1.8;
    let t = hash % 4;

    if (t === 0) {
      let l = pipeThickness * 2.75 * scale * 0.6, w = pipeThickness * 0.54 * scale;
      ctx.fillStyle = '#f0f0d0';
      ctx.fillRect(-l / 2, -w / 2, l, w);
      ctx.strokeStyle = '#a0a0a0';
      ctx.strokeRect(-l / 2, -w / 2, l, w);

      ctx.fillStyle = '#333';
      ctx.font = `bold ${pipeThickness * 0.35 * scale}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText("104K", 0, 0);

    } else if (t === 1) {
      let r = pipeThickness * 0.9 * scale;
      ctx.fillStyle = '#2a4a6a';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#e0e0e0';
      ctx.font = `bold ${r * 0.7}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('-', 0, -r * 0.05);

      ctx.strokeStyle = '#c0c0c0';
      ctx.lineWidth = pipeThickness * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.85); ctx.lineTo(-r * 0.4, r * 1.6);
      ctx.moveTo(r * 0.4, r * 0.85); ctx.lineTo(r * 0.4, r * 1.6);
      ctx.stroke();

    } else if (t === 2) {
      let w = pipeThickness * 1.5 * scale, h = pipeThickness * 1.6 * scale;
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(-w / 2, -h * 0.1);
      ctx.arc(0, -h * 0.1, w / 2, Math.PI, 0);
      ctx.lineTo(w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();

      ctx.strokeStyle = '#c0c0c0';
      ctx.lineWidth = pipeThickness * 0.1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, h / 2); ctx.lineTo(-w * 0.3, h / 2 + pipeThickness * 0.5);
      ctx.moveTo(0, h / 2); ctx.lineTo(0, h / 2 + pipeThickness * 0.6);
      ctx.moveTo(w * 0.3, h / 2); ctx.lineTo(w * 0.3, h / 2 + pipeThickness * 0.5);
      ctx.stroke();

    } else {
      let r = pipeThickness * 0.85 * scale;
      ctx.fillStyle = '#b0b0b0';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = Math.max(r * 0.12, 1);
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, 0); ctx.lineTo(r * 0.25, 0);
      ctx.stroke();

      ctx.strokeStyle = '#c0c0c0';
      ctx.lineWidth = pipeThickness * 0.1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.85); ctx.lineTo(-r * 0.5, r * 1.5);
      ctx.moveTo(0, r * 0.85); ctx.lineTo(0, r * 1.6);
      ctx.moveTo(r * 0.5, r * 0.85); ctx.lineTo(r * 0.5, r * 1.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBase(currentStyle = 'illustrated') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (hullPoints.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(hullPoints[0].x, hullPoints[0].y);
      for (let i = 1; i < hullPoints.length; i++) {
        ctx.lineTo(hullPoints[i].x, hullPoints[i].y);
      }
      ctx.closePath();

      if (currentStyle === 'illustrated') {
        ctx.fillStyle = '#e8ecef';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 4;
      } else if (currentStyle === 'circuit') {
        ctx.fillStyle = '#8b5a2b';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 6;
      } else if (currentStyle === 'painted_lady') {
        ctx.fillStyle = '#2d4227';
        ctx.strokeStyle = '#1a2b16';
        ctx.lineWidth = 4;
      } else if (currentStyle === 'ducks') {
        ctx.fillStyle = '#4facfe';
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 4;
      } else if (currentStyle === 'gears') {
        ctx.fillStyle = '#1a110a';
        ctx.strokeStyle = '#3d2b1f';
        ctx.lineWidth = 4;
      } else if (currentStyle === 'christmas') {
        ctx.fillStyle = '#7a4a1e';
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 6;
      } else if (currentStyle === 'coins') {
        ctx.fillStyle = '#2b1d10';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 5;
      } else if (currentStyle === 'gems') {
        ctx.fillStyle = '#1a0f2e';
        ctx.strokeStyle = '#9966cc';
        ctx.lineWidth = 5;
      } else if (currentStyle === 'buttons') {
        ctx.fillStyle = '#e8ddc7';
        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 5;
      } else if (currentStyle === 'autumn_leaves') {
        ctx.fillStyle = '#4a3520';
        ctx.strokeStyle = '#2e2013';
        ctx.lineWidth = 5;
      } else {
        ctx.fillStyle = '#111';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
      }

      ctx.fill();
      ctx.stroke();
    }
  }

  function drawHandles() {
    if (!isEditMode) return;
    ctx.fillStyle = 'rgba(0, 122, 204, 0.8)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    rawPoints.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // Border-mode: traces evenly-spaced, tangentially-oriented decorations
  // around the polygon's perimeter (offset inward/outward by Edge Margin)
  // instead of filling its interior. `cfg` replaces the source's direct
  // reads of maxStraightSlider/gearSlider/sizeMinSlider/sizeMaxSlider/colorPct.
  function generateBorder(currentStyle, currentPalette, pipeThickness, marginPx, densityFactor, narrowDim, cfg) {
    const borderPoly = offsetPolygon(hullPoints, marginPx);
    if (borderPoly.length < 3) return;

    const path = buildPerimeterPath(borderPoly);
    if (path.total <= 0) return;

    let spacing = (pipeThickness * (currentStyle === 'painted_lady' ? 1.8 : 2.4)) / densityFactor;
    spacing = Math.max(spacing, pipeThickness * 0.5, 4);
    let count = Math.max(3, Math.round(path.total / spacing));
    spacing = path.total / count;

    let baseColorChangeChance = cfg.colorPct;
    let activeColorPalette = pickColorSubset(currentPalette, colorCountFromPct(baseColorChangeChance, currentPalette.length));
    let colorRollChance = 0.15 + baseColorChangeChance * 0.35;
    let currentColor = activeColorPalette[Math.floor(colorRandom() * activeColorPalette.length)];

    let maxRun = cfg.maxStraight;
    let run = 0;

    let landmarkCount = cfg.gears;
    let landmarkEvery = landmarkCount > 0 ? Math.max(3, Math.round(count / landmarkCount)) : 0;

    let patternHashOffset = Math.floor(patternRandom() * 100000);

    let sizeMinAbs = narrowDim * (cfg.sizeMin / 500);
    let sizeMaxAbs = narrowDim * (cfg.sizeMax / 500);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < count; i++) {
      let d = i * spacing;
      let pt = pointAtDistance(path, d);
      let hash = Math.abs(Math.floor(pt.x) * 17 + Math.floor(pt.y) * 23 + i * 13 + patternHashOffset) % 100;

      let forceChange = run >= maxRun;
      if (forceChange || colorRandom() < colorRollChance) {
        let alt = activeColorPalette.filter(c => c !== currentColor);
        currentColor = alt.length ? alt[Math.floor(colorRandom() * alt.length)] : currentColor;
        run = 1;
      } else {
        run++;
      }

      let isLandmark = landmarkEvery > 0 && (i % landmarkEvery === 0);
      let baseSize = isLandmark
        ? sizeMaxAbs * (1.2 + patternRandom() * 0.4)
        : sizeMinAbs + patternRandom() * (sizeMaxAbs - sizeMinAbs);

      if (currentStyle === 'ducks') {
        let color = isLandmark ? '#FFFFFF' : currentColor;
        drawDuck(ctx, pt.x, pt.y, baseSize * 1.1, color, pt.angle, hash);
      } else if (currentStyle === 'painted_lady') {
        let hWidth = spacing * (0.7 + patternRandom() * 0.6);
        let hHeight = pipeThickness * 3 * (0.7 + patternRandom() * 0.8);
        let roofColor = colorRandom() < 0.33 ? '#4a4a4a' : currentPalette[Math.floor(colorRandom() * currentPalette.length)];
        drawHouse(ctx, pt.x, pt.y, hWidth, hHeight, currentColor, roofColor, hash);
      } else if (currentStyle === 'christmas') {
        let size = baseSize * 1.3;
        let uprightAngle = (patternRandom() - 0.5) * 0.3;
        if (isLandmark) {
          drawChristmasTreeCookie(ctx, pt.x, pt.y, size, currentColor, uprightAngle, hash);
        } else {
          let t = hash % 3;
          if (t === 0) drawCookieStar(ctx, pt.x, pt.y, size, currentColor, pt.angle, hash);
          else if (t === 1) drawGingerbreadMan(ctx, pt.x, pt.y, size, '#c0783c', uprightAngle, hash);
          else drawChristmasTreeCookie(ctx, pt.x, pt.y, size, currentColor, uprightAngle, hash);
        }
      } else if (currentStyle === 'coins') {
        drawCoin(ctx, pt.x, pt.y, baseSize * 1.1, currentColor, hash + i * 37);
      } else if (currentStyle === 'gems') {
        drawGem(ctx, pt.x, pt.y, baseSize * 0.9, currentColor, pt.angle, hash);
      } else if (currentStyle === 'buttons') {
        drawButton(ctx, pt.x, pt.y, baseSize * 0.9, currentColor, hash + i * 37);
      } else if (currentStyle === 'gears') {
        drawSteampunkGear(ctx, pt.x, pt.y, baseSize * 1.1, currentColor, hash + i * 37, currentPalette, pt.angle);
      } else if (currentStyle === 'autumn_leaves') {
        if (isLandmark) {
          let uprightAngle = (patternRandom() - 0.5) * 0.3;
          let t = hash % 3;
          if (t === 0) drawAcorn(ctx, pt.x, pt.y, baseSize * 1.1, uprightAngle, hash);
          else if (t === 1) drawGourd(ctx, pt.x, pt.y, baseSize * 0.9, uprightAngle, hash);
          else drawPineCone(ctx, pt.x, pt.y, baseSize * 1.1, uprightAngle, hash);
        } else {
          drawFallLeaf(ctx, pt.x, pt.y, baseSize, currentColor, pt.angle, hash);
        }
      } else if (currentStyle === 'illustrated') {
        let nextPt = pointAtDistance(path, d + spacing);
        let isCyl = hash < 25;
        drawPipeOutline(ctx, pt.x, pt.y, nextPt.x, nextPt.y, pipeThickness, isCyl);
        drawPipeEdge(ctx, pt.x, pt.y, nextPt.x, nextPt.y, pipeThickness, currentColor, 'illustrated', isCyl);
        drawPipeJoint(ctx, pt.x, pt.y, pipeThickness, currentColor, 'illustrated');

        if (isLandmark) {
          drawSteampunkGear(ctx, pt.x, pt.y, pipeThickness * 1.6, currentColor, hash + i * 37, currentPalette, pt.angle);
        }
      } else if (currentStyle === 'circuit') {
        let nextPt = pointAtDistance(path, d + spacing);
        let isJumper = hash < 20;
        drawCircuitWire(ctx, pt.x, pt.y, nextPt.x, nextPt.y, pipeThickness, isJumper);

        if (isLandmark) {
          let accentSpan = pipeThickness * 3.2;
          if (fitsWithoutCrossingCorner(path, d, accentSpan)) {
            drawCircuitPad(ctx, pt.x, pt.y, pipeThickness);
            drawCircuitAccentComponent(ctx, pt.x, pt.y, pt.angle, pipeThickness, hash + i * 37);
          }
        } else if (!isJumper && hash % 100 < 60) {
          let resistorSpan = pipeThickness * 4.5;
          if (fitsWithoutCrossingCorner(path, d, resistorSpan)) {
            drawCircuitResistor(ctx, pt.x, pt.y, pt.angle, pipeThickness, hash + i * 37);
          }
        }
      } else {
        let nextPt = pointAtDistance(path, d + spacing);
        drawPipeEdge(ctx, pt.x, pt.y, nextPt.x, nextPt.y, pipeThickness, currentColor, currentStyle, false);
        drawPipeJoint(ctx, pt.x, pt.y, pipeThickness, currentColor, currentStyle);

        if (isLandmark) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pipeThickness * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = currentColor;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
  }

  function getJointType(cell) {
    let conn = cell.connectedTo.length;
    if (conn === 0) return 0;
    if (conn === 1) return 1;
    if (conn > 2) return 2;

    let [n1, n2] = cell.connectedTo;
    let dx1 = n1.c - cell.c, dy1 = n1.r - cell.r;
    let dx2 = n2.c - cell.c, dy2 = n2.r - cell.r;
    if (dx1 === -dx2 && dy1 === -dy2) {
      return (cell.r * 11 + cell.c * 31) % 100 < 10 ? 3 : 0;
    } else {
      return 1;
    }
  }

  // Fill-mode: builds a maze/scatter across the whole shape and renders it
  // per style. `cfg` replaces the source's direct slider/select DOM reads
  // (thicknessSlider/paletteSelect/styleSelect/modeSelect/densitySlider/
  // marginSlider/gearSlider/sizeMinSlider/sizeMaxSlider/maxStraightSlider/
  // colorPct) everywhere they appeared; the generation math is unchanged.
  function generatePipes(cfg) {
    reseedRandom();
    let minX = Math.min(...hullPoints.map(p => p.x));
    let maxX = Math.max(...hullPoints.map(p => p.x));
    let minY = Math.min(...hullPoints.map(p => p.y));
    let maxY = Math.max(...hullPoints.map(p => p.y));

    let width = maxX - minX;
    let height = maxY - minY;
    let narrowDim = Math.sqrt(width * height);

    let thicknessFactor = cfg.thickness / 500;
    let pipeThickness = Math.max(narrowDim * thicknessFactor, 2);

    // Resolved externally (Pattern Tool wiring below) to either the raw
    // decorative colors ("True Color") or their nearest-match substitutes
    // from a real xTool laser palette — same shape either way (plain hex array).
    const currentPalette = cfg.resolvedPalette || PALETTES[cfg.paletteId];
    const currentStyle = cfg.style;
    const currentMode = cfg.mode;
    const densityFactor = Math.max(0.1, cfg.density / 50);

    let marginInt = cfg.margin;
    let marginPx = marginInt * (narrowDim / 200);
    let expandBound = marginPx < 0 ? -marginPx : 0;

    if (currentMode === 'border') {
      drawBase(currentStyle);
      generateBorder(currentStyle, currentPalette, pipeThickness, marginPx, densityFactor, narrowDim, cfg);
      drawHandles();
      return;
    }

    const MAZE_STYLES = ['flat', '3d-basic', '3d-glossy', 'illustrated', 'circuit'];
    let cellSize = pipeThickness * 2.1;
    if (MAZE_STYLES.includes(currentStyle)) {
      cellSize = cellSize / densityFactor;
    }

    let gridStartX = minX - expandBound;
    let gridStartY = minY - expandBound;
    let gridEndX = maxX + expandBound;
    let gridEndY = maxY + expandBound;

    let gridWidth = gridEndX - gridStartX;
    let gridHeight = gridEndY - gridStartY;

    let cols = Math.floor(gridWidth / cellSize);
    let rows = Math.floor(gridHeight / cellSize);

    let offsetX = (gridWidth - (cols * cellSize)) / 2;
    let offsetY = (gridHeight - (rows * cellSize)) / 2;

    let grid = [];
    let validCells = [];

    for(let r = 0; r < rows; r++) {
      grid[r] = [];
      for(let c = 0; c < cols; c++) {
        let cx = gridStartX + offsetX + (c * cellSize) + (cellSize / 2);
        let cy = gridStartY + offsetY + (r * cellSize) + (cellSize / 2);

        let checkCy = cy;
        if (currentStyle === 'painted_lady') {
          checkCy = cy - (pipeThickness * 1.5);
        }

        let isInsideRaw = pointInPolygon({x: cx, y: checkCy}, hullPoints);
        let dist = distanceToPolygon({x: cx, y: checkCy}, hullPoints);

        let isInsideEffective = false;
        if (isInsideRaw) {
          isInsideEffective = dist >= marginPx;
        } else {
          isInsideEffective = marginPx < 0 && dist <= -marginPx;
        }

        let cell = { r, c, cx, cy, inside: isInsideEffective, visited: false, edges: [], connectedTo: [] };

        grid[r][c] = cell;
        if(isInsideEffective) validCells.push(cell);
      }
    }

    if (validCells.length === 0) return;

    gears = [];
    if (currentStyle === 'illustrated' || currentStyle === 'circuit' || currentStyle === 'painted_lady' || currentStyle === 'ducks' ||
        currentStyle === 'flat' || currentStyle === '3d-basic' || currentStyle === '3d-glossy') {
      let numGears = cfg.gears;
      for (let i = 0; i < numGears; i++) {
        if (validCells.length === 0) break;
        let centerCell = validCells[Math.floor(patternRandom() * validCells.length)];
        if (centerCell.visited) continue;

        let size = patternRandom() > 0.65 ? 1 : 0;
        let gearCells = [];
        let canPlace = true;

        for (let dr = -size; dr <= size; dr++) {
          for (let dc = -size; dc <= size; dc++) {
            let r = centerCell.r + dr;
            let c = centerCell.c + dc;
            if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] && grid[r][c].inside && !grid[r][c].visited) {
              gearCells.push(grid[r][c]);
            } else {
              canPlace = false;
            }
          }
        }

        if (canPlace) {
          gearCells.forEach(c => c.visited = true);
          let isLarge = size === 1;
          gears.push({
            cx: centerCell.cx,
            cy: centerCell.cy,
            radius: (isLarge ? 1.6 : 0.8) * cellSize,
            color: colorRandom() > 0.4 ? '#bdc3c7' : '#d4af37',
            innerColor: colorRandom() > 0.3 ? currentPalette[Math.floor(colorRandom() * currentPalette.length)] : null,
            teeth: isLarge ? 16 : 8,
            isStacked: isLarge && patternRandom() > 0.5,
            isLarge: isLarge
          });
        }
      }
    }

    let unvisitedValid = [...validCells].filter(c => !c.visited).sort(() => patternRandom() - 0.5);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    let baseColorChangeChance = cfg.colorPct;
    let maxStraight = cfg.maxStraight;
    let activeMazePalette = pickColorSubset(currentPalette, colorCountFromPct(baseColorChangeChance, currentPalette.length));

    let sizeMinAbs = narrowDim * (cfg.sizeMin / 500);
    let sizeMaxAbs = narrowDim * (cfg.sizeMax / 500);

    for (let startCell of unvisitedValid) {
      if (startCell.visited) continue;

      let stack = [startCell];
      startCell.visited = true;
      startCell.color = activeMazePalette[Math.floor(colorRandom() * activeMazePalette.length)];
      startCell.lastDir = null;
      startCell.straightCount = 0;

      while(stack.length > 0) {
        let curr = stack[stack.length - 1];
        let unvisitedNeighbors = [];

        for (let [dr, dc] of dirs) {
          let nr = curr.r + dr, nc = curr.c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            let neighbor = grid[nr][nc];
            if (neighbor.inside && !neighbor.visited) {
              unvisitedNeighbors.push({ node: neighbor, dir: [dr, dc] });
            }
          }
        }

        if (unvisitedNeighbors.length > 0) {
          let nextObj = null;
          let straightNeighbor = unvisitedNeighbors.find(n => curr.lastDir && n.dir[0] === curr.lastDir[0] && n.dir[1] === curr.lastDir[1]);

          let canGoStraight = straightNeighbor && curr.straightCount < maxStraight;

          if (canGoStraight && patternRandom() < 0.88) {
            nextObj = straightNeighbor;
          } else {
            let allowedNeighbors = unvisitedNeighbors;
            if (curr.straightCount >= maxStraight && straightNeighbor && unvisitedNeighbors.length > 1) {
              allowedNeighbors = unvisitedNeighbors.filter(n => n !== straightNeighbor);
            }
            nextObj = allowedNeighbors[Math.floor(patternRandom() * allowedNeighbors.length)];
          }

          let next = nextObj.node;
          next.visited = true;
          next.lastDir = nextObj.dir;

          let isStraight = straightNeighbor && nextObj === straightNeighbor;
          next.straightCount = isStraight ? curr.straightCount + 1 : 1;

          let colorChangeChance = isStraight ? (baseColorChangeChance * 0.75) : baseColorChangeChance;

          if (colorRandom() < colorChangeChance) {
            let availableColors = activeMazePalette.filter(c => c !== curr.color);
            next.color = availableColors.length > 0 ? availableColors[Math.floor(colorRandom() * availableColors.length)] : curr.color;
          } else {
            next.color = curr.color;
          }

          curr.edges.push(next);
          curr.connectedTo.push(next);
          next.connectedTo.push(curr);
          stack.push(next);
        } else {
          stack.pop();
        }
      }
    }

    drawBase(currentStyle);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentStyle === 'painted_lady') {
      let allDrawables = [];

      validCells.forEach(cell => {
        cell.edges.forEach(next => {
          allDrawables.push({
            type: 'segment',
            cell: cell,
            next: next,
            y: Math.max(cell.cy, next.cy)
          });
        });

        let jType = getJointType(cell);
        if (jType > 0) {
          allDrawables.push({ type: 'node', cell: cell, y: cell.cy });
        }
      });

      gears.forEach(g => {
        if (!g.isLarge) allDrawables.push({ type: 'tree', g: g, y: g.cy });
        else allDrawables.push({ type: 'landmark', g: g, y: g.cy });
      });

      assignStreakColors(allDrawables.filter(it => it.type === 'segment'), currentPalette, baseColorChangeChance, maxStraight);

      allDrawables.sort((a,b) => a.y - b.y);

      allDrawables.forEach(item => {
        if (currentStyle === 'painted_lady') {
          if (item.type === 'segment') {
            let cell = item.cell, next = item.next;

            let dx = next.cx - cell.cx;
            let dy = next.cy - cell.cy;
            let dist = Math.sqrt(dx*dx + dy*dy);
            let angle = Math.atan2(dy, dx);

            let avgHouseWidth = (pipeThickness * 1.8) / densityFactor;
            let numHouses = Math.max(1, Math.floor(dist / avgHouseWidth));

            for (let i = 0; i < numHouses; i++) {
              let t = (i + 0.5) / numHouses + (patternRandom() - 0.5) * 0.3;
              t = Math.max(0.05, Math.min(0.95, t));
              let hx = cell.cx + dx * t;
              let hy = cell.cy + dy * t;

              let perpX = -Math.sin(angle);
              let perpY = Math.cos(angle);
              let offset = (patternRandom() - 0.5) * pipeThickness * 0.8;
              hx += perpX * offset;
              hy += perpY * offset;

              let hash = (Math.floor(hx) * 17 + Math.floor(hy) * 23) % 100;
              let hWidth = avgHouseWidth * (0.7 + patternRandom() * 0.6);
              let hHeight = pipeThickness * 3 * (0.7 + patternRandom() * 0.8);

              let hColor = item.streakColor;
              let roofColor = colorRandom() < 0.33 ? '#4a4a4a' : currentPalette[Math.floor(colorRandom() * currentPalette.length)];

              drawHouse(ctx, hx, hy, hWidth, hHeight, hColor, roofColor, hash);
            }

          } else if (item.type === 'node') {
            let radius = pipeThickness * 0.7;
            ctx.beginPath();
            ctx.arc(item.cell.cx, item.cell.cy, radius, 0, Math.PI*2);
            ctx.fillStyle = '#7CBA7D';
            ctx.fill(); ctx.strokeStyle = '#5f6368'; ctx.stroke();

            ctx.beginPath();
            ctx.arc(item.cell.cx, item.cell.cy, radius * 0.4, 0, Math.PI*2);
            ctx.fillStyle = '#4E8A51';
            ctx.fill(); ctx.stroke();

          } else if (item.type === 'tree') {
            let r = item.g.radius * 0.7;
            let cx = item.g.cx;
            let cy = item.g.cy;

            ctx.fillStyle = '#5c3a21';
            ctx.fillRect(cx - r*0.15, cy, r*0.3, r*1.2);

            ctx.beginPath();
            ctx.arc(cx, cy - r*0.2, r, 0, Math.PI*2);
            ctx.fillStyle = '#4E8A51';
            ctx.fill(); ctx.strokeStyle='#2d522f'; ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx - r*0.4, cy + r*0.2, r*0.7, 0, Math.PI*2);
            ctx.fillStyle = '#6BB870';
            ctx.fill(); ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx + r*0.4, cy + r*0.2, r*0.7, 0, Math.PI*2);
            ctx.fill(); ctx.stroke();
          } else if (item.type === 'landmark') {
            let cx = item.g.cx;
            let cy = item.g.cy;

            let towerW = pipeThickness * 2.5;
            let towerH = pipeThickness * 7;
            let yBase = cy;

            let mainColor = currentPalette[Math.floor(colorRandom() * currentPalette.length)];
            let accentColor = currentPalette[Math.floor(colorRandom() * currentPalette.length)];
            let roofColor = '#3a3a3a';

            ctx.fillStyle = mainColor;
            ctx.fillRect(cx - towerW/2, yBase - towerH*0.4, towerW, towerH*0.4);
            ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
            ctx.strokeRect(cx - towerW/2, yBase - towerH*0.4, towerW, towerH*0.4);

            ctx.fillStyle = '#4a2f1d';
            ctx.beginPath();
            ctx.arc(cx, yBase - towerH*0.15, towerW*0.2, Math.PI, 0);
            ctx.lineTo(cx + towerW*0.2, yBase);
            ctx.lineTo(cx - towerW*0.2, yBase);
            ctx.fill(); ctx.stroke();

            let shaftW = towerW * 0.7;
            let shaftH = towerH * 0.5;
            let shaftY = yBase - towerH * 0.4 - shaftH;
            ctx.fillStyle = accentColor;
            ctx.fillRect(cx - shaftW/2, shaftY, shaftW, shaftH);
            ctx.strokeRect(cx - shaftW/2, shaftY, shaftW, shaftH);

            ctx.fillStyle = '#add8e6';
            ctx.fillRect(cx - shaftW*0.25, shaftY + shaftH*0.2, shaftW*0.15, shaftH*0.4);
            ctx.strokeRect(cx - shaftW*0.25, shaftY + shaftH*0.2, shaftW*0.15, shaftH*0.4);
            ctx.fillRect(cx + shaftW*0.1, shaftY + shaftH*0.2, shaftW*0.15, shaftH*0.4);
            ctx.strokeRect(cx + shaftW*0.1, shaftY + shaftH*0.2, shaftW*0.15, shaftH*0.4);

            let clockW = shaftW * 1.2;
            let clockH = clockW;
            let clockY = shaftY - clockH;
            ctx.fillStyle = mainColor;
            ctx.fillRect(cx - clockW/2, clockY, clockW, clockH);
            ctx.strokeRect(cx - clockW/2, clockY, clockW, clockH);

            ctx.beginPath();
            ctx.arc(cx, clockY + clockH/2, clockW*0.35, 0, Math.PI*2);
            ctx.fillStyle = '#f9f9f9';
            ctx.fill(); ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx, clockY + clockH/2);
            ctx.lineTo(cx, clockY + clockH*0.25);
            ctx.moveTo(cx, clockY + clockH/2);
            ctx.lineTo(cx + clockW*0.15, clockY + clockH/2);
            ctx.stroke();

            ctx.fillStyle = roofColor;
            ctx.beginPath();
            ctx.moveTo(cx - clockW*0.6, clockY);
            ctx.lineTo(cx, clockY - towerH*0.3);
            ctx.lineTo(cx + clockW*0.6, clockY);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
          }
        }
      });

    } else if (currentStyle === 'ducks') {
      let allDrawables = [];

      let duckSizeMin = sizeMinAbs * 1.5, duckSizeMax = sizeMaxAbs * 1.5;
      let duckSize = (duckSizeMin + duckSizeMax) / 2;
      let rowSpacing = (duckSize * 0.7) / densityFactor;
      let colSpacing = (duckSize * 1.6) / densityFactor;

      for (let cy = gridStartY; cy <= gridEndY; cy += rowSpacing) {
        let rowOffset = (Math.floor(cy / rowSpacing) % 2 === 0) ? 0 : colSpacing / 2;
        for (let cx = gridStartX - colSpacing; cx <= gridEndX + colSpacing; cx += colSpacing) {

          let px = cx + rowOffset + (patternRandom() - 0.5) * colSpacing * 0.5;
          let py = cy + (patternRandom() - 0.5) * rowSpacing * 0.5;

          let checkCy = py - duckSize * 0.3;
          let isInsideRaw = pointInPolygon({x: px, y: checkCy}, hullPoints);
          let dist = distanceToPolygon({x: px, y: checkCy}, hullPoints);
          let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

          if (isInsideEffective) {
            let hash = (Math.floor(px) * 17 + Math.floor(py) * 23) % 100;
            if (hash < 12) {
              allDrawables.push({ type: 'lilypad', cx: px, cy: py, y: py, hash: hash });
            } else {
              allDrawables.push({ type: 'duck', cx: px, cy: py, y: py, hash: hash, angle: (patternRandom() - 0.5) * 0.4, size: duckSizeMin + patternRandom() * (duckSizeMax - duckSizeMin) });
            }
          }
        }
      }

      gears.forEach(g => {
        if (g.isLarge) allDrawables.push({ type: 'landmark', g: g, y: g.cy });
        else allDrawables.push({ type: 'lotus', g: g, y: g.cy });
      });

      assignStreakColors(allDrawables.filter(it => it.type === 'duck'), currentPalette, baseColorChangeChance, maxStraight);

      allDrawables.sort((a,b) => a.y - b.y);

      allDrawables.forEach(item => {
        if (item.type === 'duck') {
          let color = item.streakColor;

          ctx.beginPath();
          ctx.ellipse(item.cx, item.cy + item.size * 0.25, item.size * 1.1, item.size * 0.3, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          drawDuck(ctx, item.cx, item.cy, item.size * 0.8, color, item.angle, item.hash);

        } else if (item.type === 'lilypad') {
          drawLilypad(ctx, item.cx, item.cy, duckSize * 1.2, item.hash);
        } else if (item.type === 'lotus') {
          drawLotus(ctx, item.g.cx, item.g.cy, item.g.radius * 0.8, currentPalette);
        } else if (item.type === 'landmark') {
          ctx.beginPath();
          ctx.ellipse(item.g.cx, item.g.cy + pipeThickness * 0.8, pipeThickness * 3.5, pipeThickness * 1.2, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 3;
          ctx.stroke();

          let angle = (item.g.cx % 10) > 5 ? 0.15 : -0.15;
          drawDuck(ctx, item.g.cx, item.g.cy, pipeThickness * 2.8, '#FFFFFF', angle, item.g.cx);
        }
      });

    } else if (currentStyle === 'gears') {
      let allDrawables = [];
      let numGears = Math.round(220 * densityFactor);

      let sizeSpan = sizeMaxAbs - sizeMinAbs;
      let smallLo = sizeMinAbs, smallHi = sizeMinAbs + sizeSpan / 3;
      let medLo = smallHi, medHi = sizeMinAbs + sizeSpan * 2 / 3;
      let hugeLo = medHi, hugeHi = sizeMaxAbs;

      for (let i = 0; i < numGears; i++) {
        let px = minX - expandBound + patternRandom() * (maxX - minX + 2*expandBound);
        let py = minY - expandBound + patternRandom() * (maxY - minY + 2*expandBound);

        let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
        let dist = distanceToPolygon({x: px, y: py}, hullPoints);
        let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

        if (isInsideEffective) {
          let hash = Math.floor(patternRandom() * 10000);

          let layer = (hash % 10 < 3) ? 0 : ((hash % 10 < 7) ? 1 : 2);

          let radius = (layer === 0) ? (hugeLo + patternRandom() * (hugeHi - hugeLo))
                     : (layer === 1) ? (medLo + patternRandom() * (medHi - medLo))
                     : (smallLo + patternRandom() * (smallHi - smallLo));

          allDrawables.push({
            type: 'steampunk_gear',
            cx: px, cy: py,
            radius: radius,
            layer: layer,
            hash: hash
          });
        }
      }

      let boost = cfg.gears;
      for (let i = 0; i < boost; i++) {
        let px = minX - expandBound + patternRandom() * (maxX - minX + 2*expandBound);
        let py = minY - expandBound + patternRandom() * (maxY - minY + 2*expandBound);

        let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
        let dist = distanceToPolygon({x: px, y: py}, hullPoints);
        let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

        if (isInsideEffective) {
          let hash = Math.floor(patternRandom() * 10000);
          let radius = sizeMaxAbs * (1.2 + patternRandom() * 0.4);
          allDrawables.push({ type: 'steampunk_gear', cx: px, cy: py, radius: radius, layer: -1, hash: hash });
        }
      }

      assignStreakColors(allDrawables, currentPalette, baseColorChangeChance, 0);

      allDrawables.sort((a,b) => a.layer - b.layer);

      allDrawables.forEach(item => {
        drawSteampunkGear(ctx, item.cx, item.cy, item.radius, item.streakColor, item.hash, currentPalette);
      });

    } else if (currentStyle === 'autumn_leaves') {
      let allDrawables = [];
      let numLeaves = Math.round(220 * densityFactor);

      let sizeSpan = sizeMaxAbs - sizeMinAbs;
      let smallLo = sizeMinAbs, smallHi = sizeMinAbs + sizeSpan / 3;
      let medLo = smallHi, medHi = sizeMinAbs + sizeSpan * 2 / 3;
      let hugeLo = medHi, hugeHi = sizeMaxAbs;

      for (let i = 0; i < numLeaves; i++) {
        let px = minX - expandBound + patternRandom() * (maxX - minX + 2 * expandBound);
        let py = minY - expandBound + patternRandom() * (maxY - minY + 2 * expandBound);

        let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
        let dist = distanceToPolygon({x: px, y: py}, hullPoints);
        let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

        if (isInsideEffective) {
          let hash = Math.floor(patternRandom() * 10000);
          let layer = (hash % 10 < 3) ? 0 : ((hash % 10 < 7) ? 1 : 2);
          let size = (layer === 0) ? (hugeLo + patternRandom() * (hugeHi - hugeLo))
                   : (layer === 1) ? (medLo + patternRandom() * (medHi - medLo))
                   : (smallLo + patternRandom() * (smallHi - smallLo));

          allDrawables.push({
            type: 'leaf', cx: px, cy: py, size: size, layer: layer, hash: hash,
            angle: patternRandom() * Math.PI * 2
          });
        }
      }

      let accentCount = cfg.gears;
      for (let i = 0; i < accentCount; i++) {
        let px = minX - expandBound + patternRandom() * (maxX - minX + 2 * expandBound);
        let py = minY - expandBound + patternRandom() * (maxY - minY + 2 * expandBound);

        let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
        let dist = distanceToPolygon({x: px, y: py}, hullPoints);
        let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

        if (isInsideEffective) {
          let hash = Math.floor(patternRandom() * 10000);
          let accentType = ['acorn', 'gourd', 'pinecone'][hash % 3];
          let size = sizeMaxAbs * (0.9 + patternRandom() * 0.5);
          allDrawables.push({
            type: accentType, cx: px, cy: py, size: size, layer: 3, hash: hash,
            angle: (patternRandom() - 0.5) * 0.5
          });
        }
      }

      assignStreakColors(allDrawables.filter(it => it.type === 'leaf'), currentPalette, baseColorChangeChance, 0);

      allDrawables.sort((a, b) => a.layer - b.layer);
      allDrawables.forEach(item => {
        if (item.type === 'leaf') drawFallLeaf(ctx, item.cx, item.cy, item.size, item.streakColor, item.angle, item.hash);
        else if (item.type === 'acorn') drawAcorn(ctx, item.cx, item.cy, item.size, item.angle, item.hash);
        else if (item.type === 'gourd') drawGourd(ctx, item.cx, item.cy, item.size, item.angle, item.hash);
        else drawPineCone(ctx, item.cx, item.cy, item.size, item.angle, item.hash);
      });

    } else if (currentStyle === 'christmas') {
      let allDrawables = [];
      let cookieSizeMin = sizeMinAbs * 1.3, cookieSizeMax = sizeMaxAbs * 1.3;
      let cookieSize = (cookieSizeMin + cookieSizeMax) / 2;
      let spacing = (cookieSize * 1.8) / densityFactor;

      for (let cy = gridStartY; cy <= gridEndY; cy += spacing) {
        let rowOffset = (Math.floor(cy / spacing) % 2 === 0) ? 0 : spacing / 2;
        for (let cx = gridStartX - spacing; cx <= gridEndX + spacing; cx += spacing) {
          let px = cx + rowOffset + (patternRandom() - 0.5) * spacing * 0.4;
          let py = cy + (patternRandom() - 0.5) * spacing * 0.4;

          let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
          let dist = distanceToPolygon({x: px, y: py}, hullPoints);
          let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

          if (isInsideEffective) {
            let hash = (Math.floor(px) * 17 + Math.floor(py) * 23) % 100;
            allDrawables.push({ cx: px, cy: py, y: py, hash, angle: (patternRandom() - 0.5) * 0.6, size: cookieSizeMin + patternRandom() * (cookieSizeMax - cookieSizeMin) });
          }
        }
      }

      assignStreakColors(allDrawables, currentPalette, baseColorChangeChance, maxStraight);

      let numLandmarks = cfg.gears;
      for (let i = 0; i < numLandmarks; i++) {
        let px = minX - expandBound + patternRandom() * (maxX - minX + 2 * expandBound);
        let py = minY - expandBound + patternRandom() * (maxY - minY + 2 * expandBound);
        let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
        let dist = distanceToPolygon({x: px, y: py}, hullPoints);
        let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);
        if (isInsideEffective) {
          let hash = Math.floor(patternRandom() * 10000);
          allDrawables.push({ cx: px, cy: py, y: py, hash, angle: (patternRandom() - 0.5) * 0.3, landmark: true, streakColor: currentPalette[Math.floor(colorRandom() * currentPalette.length)] });
        }
      }

      allDrawables.sort((a, b) => a.y - b.y);
      allDrawables.forEach(item => {
        if (item.landmark) {
          drawChristmasTreeCookie(ctx, item.cx, item.cy, cookieSizeMax * (1.2 + patternRandom() * 0.4), item.streakColor, item.angle, item.hash);
          return;
        }
        let t = item.hash % 3;
        if (t === 0) drawCookieStar(ctx, item.cx, item.cy, item.size, item.streakColor, item.angle, item.hash);
        else if (t === 1) drawGingerbreadMan(ctx, item.cx, item.cy, item.size, '#c0783c', item.angle, item.hash);
        else drawChristmasTreeCookie(ctx, item.cx, item.cy, item.size, item.streakColor, item.angle, item.hash);
      });

    } else if (currentStyle === 'coins') {
      let allDrawables = [];
      let coinSizeMin = sizeMinAbs * 1.1, coinSizeMax = sizeMaxAbs * 1.1;
      let coinSize = (coinSizeMin + coinSizeMax) / 2;
      let spacing = (coinSize * 1.5) / densityFactor;

      for (let cy = gridStartY; cy <= gridEndY; cy += spacing) {
        let rowOffset = (Math.floor(cy / spacing) % 2 === 0) ? 0 : spacing / 2;
        for (let cx = gridStartX - spacing; cx <= gridEndX + spacing; cx += spacing) {
          let px = cx + rowOffset + (patternRandom() - 0.5) * spacing * 0.6;
          let py = cy + (patternRandom() - 0.5) * spacing * 0.6;

          let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
          let dist = distanceToPolygon({x: px, y: py}, hullPoints);
          let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

          if (isInsideEffective) {
            let hash = Math.floor(patternRandom() * 10000);
            allDrawables.push({ cx: px, cy: py, y: py, hash, r: coinSizeMin + patternRandom() * (coinSizeMax - coinSizeMin) });
          }
        }
      }

      assignStreakColors(allDrawables, currentPalette, baseColorChangeChance, maxStraight);

      let numCoinLandmarks = cfg.gears;
      for (let i = 0; i < numCoinLandmarks; i++) {
        let px = minX - expandBound + patternRandom() * (maxX - minX + 2 * expandBound);
        let py = minY - expandBound + patternRandom() * (maxY - minY + 2 * expandBound);
        let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
        let dist = distanceToPolygon({x: px, y: py}, hullPoints);
        let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);
        if (isInsideEffective) {
          let hash = Math.floor(patternRandom() * 10000);
          allDrawables.push({ cx: px, cy: py, y: py, hash, r: coinSizeMax * (1.2 + patternRandom() * 0.4), streakColor: currentPalette[Math.floor(colorRandom() * currentPalette.length)] });
        }
      }

      allDrawables.sort((a, b) => a.y - b.y);
      allDrawables.forEach(item => {
        drawCoin(ctx, item.cx, item.cy, item.r, item.streakColor, item.hash);
      });

    } else if (currentStyle === 'gems') {
      let allDrawables = [];
      let gemSizeMin = sizeMinAbs * 0.9, gemSizeMax = sizeMaxAbs * 0.9;
      let spacing = ((gemSizeMin + gemSizeMax) / 2 * 2.4) / densityFactor;

      for (let cy = gridStartY; cy <= gridEndY; cy += spacing) {
        let rowOffset = (Math.floor(cy / spacing) % 2 === 0) ? 0 : spacing / 2;
        for (let cx = gridStartX - spacing; cx <= gridEndX + spacing; cx += spacing) {
          let px = cx + rowOffset + (patternRandom() - 0.5) * spacing * 0.4;
          let py = cy + (patternRandom() - 0.5) * spacing * 0.4;

          let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
          let dist = distanceToPolygon({x: px, y: py}, hullPoints);
          let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

          if (isInsideEffective) {
            let hash = Math.floor(patternRandom() * 10000);
            allDrawables.push({ cx: px, cy: py, y: py, hash, angle: patternRandom() * Math.PI * 2, size: gemSizeMin + patternRandom() * (gemSizeMax - gemSizeMin) });
          }
        }
      }

      assignStreakColors(allDrawables, currentPalette, baseColorChangeChance, maxStraight);

      let numGemLandmarks = cfg.gears;
      for (let i = 0; i < numGemLandmarks; i++) {
        let px = minX - expandBound + patternRandom() * (maxX - minX + 2 * expandBound);
        let py = minY - expandBound + patternRandom() * (maxY - minY + 2 * expandBound);
        let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
        let dist = distanceToPolygon({x: px, y: py}, hullPoints);
        let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);
        if (isInsideEffective) {
          let hash = Math.floor(patternRandom() * 10000);
          let size = gemSizeMax * (1.2 + patternRandom() * 0.4);
          allDrawables.push({ cx: px, cy: py, y: py, hash, angle: patternRandom() * Math.PI * 2, size: size, streakColor: currentPalette[Math.floor(colorRandom() * currentPalette.length)] });
        }
      }

      allDrawables.sort((a, b) => a.y - b.y);
      allDrawables.forEach(item => {
        drawGem(ctx, item.cx, item.cy, item.size, item.streakColor, item.angle, item.hash);
      });

    } else if (currentStyle === 'buttons') {
      let allDrawables = [];
      let buttonSizeMin = sizeMinAbs * 0.9, buttonSizeMax = sizeMaxAbs * 0.9;
      let spacing = ((buttonSizeMin + buttonSizeMax) / 2 * 1.6) / densityFactor;

      for (let cy = gridStartY; cy <= gridEndY; cy += spacing) {
        let rowOffset = (Math.floor(cy / spacing) % 2 === 0) ? 0 : spacing / 2;
        for (let cx = gridStartX - spacing; cx <= gridEndX + spacing; cx += spacing) {
          let px = cx + rowOffset + (patternRandom() - 0.5) * spacing * 0.6;
          let py = cy + (patternRandom() - 0.5) * spacing * 0.6;

          let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
          let dist = distanceToPolygon({x: px, y: py}, hullPoints);
          let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);

          if (isInsideEffective) {
            let hash = Math.floor(patternRandom() * 10000);
            allDrawables.push({ cx: px, cy: py, y: py, hash, size: buttonSizeMin + patternRandom() * (buttonSizeMax - buttonSizeMin) });
          }
        }
      }

      assignStreakColors(allDrawables, currentPalette, baseColorChangeChance, maxStraight);

      let numButtonLandmarks = cfg.gears;
      for (let i = 0; i < numButtonLandmarks; i++) {
        let px = minX - expandBound + patternRandom() * (maxX - minX + 2 * expandBound);
        let py = minY - expandBound + patternRandom() * (maxY - minY + 2 * expandBound);
        let isInsideRaw = pointInPolygon({x: px, y: py}, hullPoints);
        let dist = distanceToPolygon({x: px, y: py}, hullPoints);
        let isInsideEffective = isInsideRaw ? (dist >= marginPx) : (marginPx < 0 && dist <= -marginPx);
        if (isInsideEffective) {
          let hash = Math.floor(patternRandom() * 10000);
          let size = buttonSizeMax * (1.2 + patternRandom() * 0.4);
          allDrawables.push({ cx: px, cy: py, y: py, hash, size: size, streakColor: currentPalette[Math.floor(colorRandom() * currentPalette.length)] });
        }
      }

      allDrawables.sort((a, b) => a.y - b.y);
      allDrawables.forEach(item => {
        drawButton(ctx, item.cx, item.cy, item.size, item.streakColor, item.hash);
      });

    } else {
      if (currentStyle === 'illustrated') {
        validCells.forEach(cell => {
          cell.edges.forEach(next => {
            let isCyl = (cell.r * 17 + next.c * 23) % 100 < 25;
            ctx.beginPath();
            ctx.moveTo(cell.cx, cell.cy);
            ctx.lineTo(next.cx, next.cy);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = isCyl ? (pipeThickness * 1.8 + 4) : (pipeThickness + 4);
            ctx.stroke();
          });
        });
        validCells.forEach(cell => {
          let jType = getJointType(cell);
          if(jType === 1 || jType === 2) {
            let jSize = jType === 1 ? (pipeThickness * 0.8) : (pipeThickness * 0.65);
            ctx.beginPath();
            ctx.arc(cell.cx, cell.cy, jSize + 2, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
          } else if (jType === 3) {
            ctx.beginPath();
            ctx.arc(cell.cx, cell.cy, pipeThickness * 0.6 + 2, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
          }
        });
      }

      validCells.forEach(cell => {
        cell.edges.forEach(next => {
          let isCyl = currentStyle === 'illustrated' && (cell.r * 17 + next.c * 23) % 100 < 25;

          if (currentStyle === 'circuit') {
            let isJumper = (cell.r * 7 + next.c * 13) % 100 < 20;

            if (isJumper) {
              ctx.beginPath();
              ctx.moveTo(cell.cx + 2, cell.cy + 2);
              ctx.lineTo(next.cx + 2, next.cy + 2);
              ctx.strokeStyle = 'rgba(0,0,0,0.5)';
              ctx.lineWidth = pipeThickness * 0.4;
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(cell.cx, cell.cy);
              ctx.lineTo(next.cx, next.cy);
              ctx.strokeStyle = '#f1c40f';
              ctx.lineWidth = pipeThickness * 0.35;
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(cell.cx, cell.cy);
              ctx.lineTo(next.cx, next.cy);
              ctx.strokeStyle = '#8c7311';
              ctx.lineWidth = pipeThickness * 0.45;
              ctx.stroke();
              ctx.strokeStyle = '#f1c40f';
              ctx.lineWidth = pipeThickness * 0.35;
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.moveTo(cell.cx, cell.cy);
              ctx.lineTo(next.cx, next.cy);
              ctx.strokeStyle = '#b87333';
              ctx.lineWidth = pipeThickness * 0.5;
              ctx.stroke();
            }

            let compHash = (cell.r * 17 + next.c * 23) % 100;
            if (!isJumper && compHash < 75) {
              let dx = next.cx - cell.cx, dy = next.cy - cell.cy;
              let midX = (cell.cx + next.cx)/2, midY = (cell.cy + next.cy)/2;
              let angle = Math.atan2(dy, dx);

              ctx.save();
              ctx.translate(midX, midY);
              ctx.rotate(angle);

              let resLen = pipeThickness * 2.5;
              let resWidth = pipeThickness * 0.9;

              ctx.strokeStyle = '#c0c0c0';
              ctx.lineWidth = pipeThickness * 0.15;
              ctx.beginPath();
              ctx.moveTo(-resLen/2, 0); ctx.lineTo(-resLen*0.9, 0);
              ctx.moveTo(resLen/2, 0); ctx.lineTo(resLen*0.9, 0);
              ctx.stroke();

              let colors = ['#000000', '#8b4513', '#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff'];
              let b1 = colors[(cell.r + cell.c) % colors.length];
              let b2 = colors[(cell.r * 3 + cell.c) % colors.length];
              let b3 = colors[(cell.r + cell.c * 5) % colors.length];
              let b4 = '#d4af37';

              if (compHash < 15) {
                ctx.fillStyle = '#a52a2a';
                ctx.fillRect(-resLen/2, -resWidth/2, resLen, resWidth);
                ctx.strokeStyle = '#5c1a1a';
                ctx.lineWidth = 1;
                ctx.strokeRect(-resLen/2, -resWidth/2, resLen, resWidth);

                ctx.fillStyle = '#e6ccaa';
                ctx.font = `${pipeThickness * 0.4}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                let text = (cell.r % 2 === 0) ? "K5%" : "6.2 K5%";
                ctx.fillText(text, 0, 0);

              } else if (compHash < 35) {
                ctx.fillStyle = '#d2b48c';
                ctx.fillRect(-resLen/2, -resWidth/2, resLen, resWidth);
                ctx.strokeStyle = '#8b5a2b';
                ctx.lineWidth = 1;
                ctx.strokeRect(-resLen/2, -resWidth/2, resLen, resWidth);

                let bandW = resLen * 0.12;
                ctx.fillStyle = b1; ctx.fillRect(-resLen*0.35, -resWidth/2, bandW, resWidth);
                ctx.fillStyle = b2; ctx.fillRect(-resLen*0.15, -resWidth/2, bandW, resWidth);
                ctx.fillStyle = b3; ctx.fillRect(resLen*0.05, -resWidth/2, bandW, resWidth);
                ctx.fillStyle = b4; ctx.fillRect(resLen*0.25, -resWidth/2, bandW, resWidth);

              } else if (compHash < 50) {
                let l = resLen * 0.85, w = resWidth * 0.75;
                ctx.fillStyle = '#4a2f1d';
                ctx.fillRect(-l/2, -w/2, l, w);
                ctx.strokeStyle = '#2a1a10';
                ctx.lineWidth = 1;
                ctx.strokeRect(-l/2, -w/2, l, w);

                let bandW = l * 0.12;
                ctx.fillStyle = b2; ctx.fillRect(-l*0.35, -w/2, bandW, w);
                ctx.fillStyle = b3; ctx.fillRect(-l*0.15, -w/2, bandW, w);
                ctx.fillStyle = b1; ctx.fillRect(l*0.05, -w/2, bandW, w);
                ctx.fillStyle = b4; ctx.fillRect(l*0.25, -w/2, bandW, w);

              } else if (compHash < 65) {
                let l = resLen * 1.1, w = resWidth * 0.6;
                ctx.fillStyle = '#f0f0d0';
                ctx.fillRect(-l/2, -w/2, l, w);
                ctx.strokeStyle = '#a0a0a0';
                ctx.lineWidth = 1;
                ctx.strokeRect(-l/2, -w/2, l, w);

                ctx.fillStyle = '#333';
                ctx.font = `bold ${pipeThickness * 0.35}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText("104K", 0, 0);

              } else {
                let l = resLen * 0.6, w = resWidth * 0.55;
                ctx.fillStyle = 'rgba(255, 180, 150, 0.4)';
                ctx.fillRect(-l/2, -w/2, l, w);
                ctx.strokeStyle = 'rgba(200, 100, 50, 0.8)';
                ctx.strokeRect(-l/2, -w/2, l, w);

                ctx.fillStyle = '#c0392b';
                ctx.fillRect(-l*0.3, -w*0.2, l*0.6, w*0.4);
                ctx.fillStyle = '#111';
                ctx.fillRect(l*0.15, -w/2, l*0.2, w);
              }
              ctx.restore();
            }
          } else {
            ctx.beginPath();
            ctx.moveTo(cell.cx, cell.cy);
            ctx.lineTo(next.cx, next.cy);
            ctx.strokeStyle = next.color;
            ctx.lineWidth = isCyl ? (pipeThickness * 1.8) : pipeThickness;
            ctx.stroke();

            if (currentStyle === '3d-basic' || currentStyle === '3d-glossy') {
              ctx.beginPath();
              ctx.moveTo(cell.cx, cell.cy);
              ctx.lineTo(next.cx, next.cy);
              ctx.strokeStyle = 'rgba(255,255,255,0.3)';
              ctx.lineWidth = pipeThickness * 0.4;
              ctx.stroke();
              ctx.lineWidth = pipeThickness;
            } else if (currentStyle === 'illustrated') {
              let dx = next.cx - cell.cx;
              let dy = next.cy - cell.cy;
              let dist = Math.sqrt(dx*dx + dy*dy);
              let ribSpacing = isCyl ? (pipeThickness * 0.4) : (pipeThickness * 0.7);
              let steps = Math.floor(dist / ribSpacing);

              if (steps > 0) {
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = isCyl ? 1.5 : Math.max(pipeThickness * 0.15, 1);
                let nx = -dy / dist * (pipeThickness * (isCyl ? 0.9 : 0.45));
                let ny = dx / dist * (pipeThickness * (isCyl ? 0.9 : 0.45));

                for (let i = 1; i <= steps; i++) {
                  let px = cell.cx + (dx * (i / (steps + 1)));
                  let py = cell.cy + (dy * (i / (steps + 1)));
                  ctx.beginPath();
                  ctx.moveTo(px + nx, py + ny);
                  ctx.lineTo(px - nx, py - ny);
                  ctx.stroke();
                }
              }
            }

            if (currentStyle === '3d-glossy') {
              ctx.beginPath();
              ctx.moveTo(cell.cx, cell.cy);
              ctx.lineTo(next.cx, next.cy);
              ctx.strokeStyle = 'rgba(255,255,255,0.6)';
              ctx.lineWidth = Math.max(pipeThickness * 0.1, 1);
              ctx.stroke();
              ctx.lineWidth = pipeThickness;
            }
          }
        });
      });

      validCells.forEach(cell => {
        let jType = getJointType(cell);
        if(jType > 0) {
          if (currentStyle === 'circuit') {
            let padRadius = pipeThickness * 0.6;
            ctx.beginPath();
            ctx.arc(cell.cx, cell.cy, padRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#a9a9a9';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cell.cx + padRadius*0.1, cell.cy - padRadius*0.1, padRadius * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = '#c0c0c0';
            ctx.fill();
          } else {
            let jointRadius;
            if (jType === 1) jointRadius = (currentStyle === 'illustrated') ? pipeThickness * 0.8 : pipeThickness * 0.65;
            else if (jType === 2) jointRadius = pipeThickness * 0.65;
            else jointRadius = pipeThickness * 0.6;

            ctx.beginPath();
            ctx.arc(cell.cx, cell.cy, jointRadius, 0, Math.PI * 2);

            if (currentStyle === 'flat') {
              ctx.fillStyle = cell.color || '#555';
            } else if (currentStyle === 'illustrated') {
              ctx.fillStyle = jType === 3 ? cell.color : '#bdc3c7';
            } else {
              ctx.fillStyle = (cfg.paletteId === 'steampunk') ? '#5e3a21' : '#555';
            }
            ctx.fill();

            if (currentStyle === '3d-basic' || currentStyle === '3d-glossy') {
              ctx.beginPath();
              ctx.arc(cell.cx - pipeThickness*0.15, cell.cy - pipeThickness*0.15, pipeThickness * 0.2, 0, Math.PI * 2);
              ctx.fillStyle = (currentStyle === '3d-glossy') ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
              ctx.fill();
            } else if (currentStyle === 'illustrated' && jType !== 3) {
              ctx.beginPath();
              ctx.arc(cell.cx, cell.cy, jointRadius * 0.6, 0, Math.PI * 2);
              ctx.fillStyle = '#000000';
              ctx.fill();
              ctx.beginPath();
              ctx.arc(cell.cx, cell.cy, jointRadius * 0.4, 0, Math.PI * 2);
              ctx.fillStyle = (cell.color === '#d4af37' || cell.color === '#f4d03f') ? '#bdc3c7' : '#e6c229';
              ctx.fill();
            }
          }
        }
      });

      if (currentStyle === 'circuit') {
        gears.forEach(g => {
          let typeHash = (Math.floor(g.cx) * 7 + Math.floor(g.cy) * 11) % 100;
          let isLarge = g.teeth > 8;

          ctx.save();
          ctx.translate(g.cx, g.cy);

          if (isLarge) {
            if (typeHash < 50) {
              let r = g.radius * 0.8;

              ctx.strokeStyle = '#c0c0c0';
              ctx.lineWidth = pipeThickness * 0.2;
              ctx.beginPath();
              ctx.moveTo(0, r*0.8); ctx.lineTo(0, r*1.5);
              ctx.moveTo(-r*0.5, r*0.5); ctx.lineTo(-r*0.8, r*1.5);
              ctx.moveTo(r*0.5, r*0.5); ctx.lineTo(r*0.8, r*1.5);
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(0, 0, r, 0, Math.PI*2);
              ctx.fillStyle = '#b0b0b0';
              ctx.fill();
              ctx.strokeStyle = '#808080';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(0, 0, r*0.8, 0, Math.PI*2);
              ctx.strokeStyle = '#a0a0a0';
              ctx.stroke();

              ctx.fillStyle = '#808080';
              ctx.fillRect(-r*0.2, -r*1.1, r*0.4, r*0.3);
            } else {
              let r = g.radius * 0.85;
              ctx.beginPath();
              ctx.arc(0, 0, r, 0, Math.PI*2);
              ctx.fillStyle = '#2980b9';
              ctx.fill();
              ctx.strokeStyle = '#1a5276';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(0, 0, r*0.7, 0, Math.PI*2);
              ctx.fillStyle = '#bdc3c7';
              ctx.fill();
              ctx.strokeStyle = '#7f8c8d';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(-r*0.4, 0); ctx.lineTo(r*0.4, 0);
              ctx.moveTo(0, -r*0.4); ctx.lineTo(0, r*0.4);
              ctx.strokeStyle = '#95a5a6';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          } else {
            if (typeHash < 33) {
              let capLen = g.radius * 1.8;
              let capWidth = g.radius * 0.8;

              ctx.strokeStyle = '#c0c0c0';
              ctx.lineWidth = pipeThickness * 0.15;
              ctx.beginPath();
              ctx.moveTo(-capLen/2, 0); ctx.lineTo(-capLen*0.8, 0);
              ctx.moveTo(capLen/2, 0); ctx.lineTo(capLen*0.8, 0);
              ctx.stroke();

              ctx.fillStyle = 'rgba(200, 220, 230, 0.5)';
              ctx.fillRect(-capLen/2, -capWidth/2, capLen, capWidth);
              ctx.strokeStyle = 'rgba(150, 170, 180, 0.8)';
              ctx.lineWidth = 1;
              ctx.strokeRect(-capLen/2, -capWidth/2, capLen, capWidth);

              ctx.fillStyle = '#d3a677';
              ctx.fillRect(-capLen*0.4, -capWidth*0.3, capLen*0.8, capWidth*0.6);

              let dotColors = ['#f1c40f', '#e74c3c', '#ecf0f1'];
              for(let d=0; d<3; d++) {
                ctx.beginPath();
                ctx.arc(-capLen*0.2 + (d * capLen*0.2), 0, capWidth*0.15, 0, Math.PI*2);
                ctx.fillStyle = dotColors[d];
                ctx.fill();
              }
            } else if (typeHash < 66) {
              ctx.beginPath();
              ctx.arc(0, 0, g.radius * 0.85, 0, Math.PI*2);
              ctx.fillStyle = '#d35400';
              ctx.fill();
              ctx.strokeStyle = '#a04000';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.fillStyle = '#fff';
              ctx.font = `bold ${pipeThickness * 0.5}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText("103", 0, 0);
            } else {
              let r = g.radius * 0.75;
              ctx.rotate(typeHash);

              ctx.beginPath();
              ctx.arc(0, 0, r, 0, Math.PI);
              ctx.lineTo(-r, 0);
              ctx.closePath();

              ctx.fillStyle = '#222';
              ctx.fill();
              ctx.strokeStyle = '#000';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = '#444';
              ctx.fillRect(-r*0.8, -r*0.2, r*1.6, r*0.2);
            }
          }
          ctx.restore();
        });
      } else {
        gears.forEach(g => drawGear(g.cx, g.cy, g.radius, g.color, g.innerColor, g.teeth, g.isStacked));
      }
    }

    drawHandles();
  }

  function handlePointerDown(e, cfg) {
    if (!isEditMode) return;
    e.preventDefault();
    const point = getCoordinates(e);
    let clickedExisting = false;

    for (let p of rawPoints) {
      if (Math.hypot(p.x - point.x, p.y - point.y) < 15) {
        draggingPoint = p;
        clickedExisting = true;
        break;
      }
    }

    if (!clickedExisting) {
      rawPoints.push(point);
      draggingPoint = point;
      shapeIsCustom = true;
    }

    hullPoints = calculateConvexHull(rawPoints);

    if (!isGenerated) {
      drawBase(cfg.style);
      drawHandles();
    }
  }

  function handlePointerMove(e, cfg) {
    if (!isEditMode || !draggingPoint) return;
    e.preventDefault();
    const point = getCoordinates(e);
    draggingPoint.x = point.x;
    draggingPoint.y = point.y;
    shapeIsCustom = true;

    hullPoints = calculateConvexHull(rawPoints);

    drawBase(cfg.style);
    drawHandles();
  }

  function handlePointerUp(e, cfg) {
    if (!draggingPoint) return;
    e.preventDefault();
    draggingPoint = null;

    if (isGenerated && hullPoints.length >= 3) {
      generatePipes(cfg);
    } else if (!isGenerated) {
      drawBase(cfg.style);
      drawHandles();
    }
  }

  return {
    hasShape: () => hullPoints.length >= 3,
    isGenerated: () => isGenerated,
    isShapeCustom: () => shapeIsCustom,
    isEditMode: () => isEditMode,
    getRawPoints: () => rawPoints.map(p => ({ x: p.x, y: p.y })),

    setEditMode(on, cfg) {
      isEditMode = on;
      if (isGenerated) generatePipes(cfg);
      else { drawBase(cfg.style); drawHandles(); }
    },

    loadPreset(shapeKey, cfg) {
      rawPoints = SHAPE_PRESETS[shapeKey]();
      hullPoints = calculateConvexHull(rawPoints);
      shapeIsCustom = false;
      isGenerated = true;
      generatePipes(cfg);
    },

    // Loads a previously-saved shape (e.g. from Persistence) instead of a preset.
    loadRawPoints(points, cfg) {
      rawPoints = points.map(p => ({ x: p.x, y: p.y }));
      hullPoints = calculateConvexHull(rawPoints);
      shapeIsCustom = true;
      isGenerated = rawPoints.length >= 3;
      if (isGenerated) generatePipes(cfg);
      else { drawBase(cfg.style); drawHandles(); }
    },

    clearShape() {
      rawPoints = [];
      hullPoints = [];
      isGenerated = false;
      shapeIsCustom = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    handlePointerDown, handlePointerMove, handlePointerUp,

    generate(cfg) {
      if (hullPoints.length < 3) { ctx.clearRect(0, 0, canvas.width, canvas.height); drawHandles(); return; }
      isGenerated = true;
      generatePipes(cfg);
    },

    refreshColors(cfg) {
      if (hullPoints.length < 3) return;
      isGenerated = true;
      const previousPool = colorPoolFingerprint();
      for (let attempt = 0; attempt < 8; attempt++) {
        colorSeed = Math.floor(Math.random() * 4294967296);
        generatePipes(cfg);
        if (colorPoolFingerprint() !== previousPool) break;
      }
    },

    refreshPattern(cfg) {
      if (hullPoints.length < 3) return;
      isGenerated = true;
      patternSeed = Math.floor(Math.random() * 4294967296);
      generatePipes(cfg);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// Pattern Tool wiring — content surface + parameter panel in the Pattern
// Tool's own visual conventions (reusing its .left-tool-panel/.xcs-viewer/
// .canvas-panel chrome and UI.* control builders), driving the engine above.
// ═══════════════════════════════════════════════════════════════════

const DEFAULTS = {
  style: 'gears', paletteId: 'steampunk', mode: 'fill',
  thickness: 20, sizeMin: 60, sizeMax: 430, density: 50,
  gears: 6, colorPct: 0.15, maxStraight: 10, margin: 0,
  rawPoints: null,
  // 'true-color' (default) renders the decorative Color Mapping palette as-is.
  // Any other value is a real App.palettes id — a laser-calibrated palette —
  // and rendering substitutes each decorative color with its nearest match.
  laserPaletteId: 'true-color'
};

const TRUE_COLOR_ID = 'true-color';

function hexToRgbTuple(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)];
}

function colorDistance2(hexA, hexB) {
  const [r1, g1, b1] = hexToRgbTuple(hexA);
  const [r2, g2, b2] = hexToRgbTuple(hexB);
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

// Assigns each true color to its nearest laser-palette entry, without reusing
// an entry across two different true colors — a greedy nearest-first pass,
// falling back to allowing reuse only if the palette is smaller than the
// number of true colors being mapped (not expected in practice here).
function mapPaletteToLaser(trueColors, laserPalette) {
  const entries = laserPalette.entries;
  const usedIdx = new Set();
  return trueColors.map(hex => {
    let bestIdx = -1, bestDist = Infinity;
    entries.forEach((e, i) => {
      if (usedIdx.has(i)) return;
      const d = colorDistance2(hex, e.rgb);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    if (bestIdx === -1) {
      entries.forEach((e, i) => {
        const d = colorDistance2(hex, e.rgb);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
    }
    usedIdx.add(bestIdx);
    return { trueColor: hex, entry: entries[bestIdx] };
  });
}

// Resolves what the engine should actually draw with: the decorative
// palette itself ("True Color"), or its nearest-match substitutes from a
// real xTool laser palette — same shape either way (a plain hex-string array).
function resolveRenderPalette(cfg) {
  const trueColors = PALETTES[cfg.paletteId];
  if (!cfg.laserPaletteId || cfg.laserPaletteId === TRUE_COLOR_ID) return trueColors;
  const laserPalette = App.palettes[cfg.laserPaletteId];
  if (!laserPalette || !laserPalette.entries || !laserPalette.entries.length) return trueColors;
  return mapPaletteToLaser(trueColors, laserPalette).map(m => m.entry.rgb);
}

function applyPaletteResolution(cfg) {
  cfg.resolvedPalette = resolveRenderPalette(cfg);
  return cfg.resolvedPalette;
}

function swatchHtml(hex) {
  return `<span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${hex};border:1px solid rgba(255,255,255,0.25);vertical-align:middle;margin-right:4px"></span>`;
}

// Rich HTML tooltip (UI.showTooltip renders it via innerHTML) shown on hover
// of the Color Mapping label — lists each true color, and, when a laser
// palette is active, what it was matched to.
function buildColorMappingTooltip(cfg) {
  const trueColors = PALETTES[cfg.paletteId];
  const laserPalette = (cfg.laserPaletteId && cfg.laserPaletteId !== TRUE_COLOR_ID) ? App.palettes[cfg.laserPaletteId] : null;
  if (!laserPalette) {
    const rows = trueColors.map(hex => `${swatchHtml(hex)}${hex}`).join('\n');
    return `<b>True Color</b> — drawn as-is, no laser palette mapping active\n${rows}`;
  }
  const mapped = mapPaletteToLaser(trueColors, laserPalette);
  const rows = mapped.map(m => `${swatchHtml(m.trueColor)}${m.trueColor} &rarr; ${swatchHtml(m.entry.rgb)}${m.entry.label} (${m.entry.power}%)`).join('\n');
  return `<b>True Color &rarr; ${laserPalette.name}</b>\n${rows}`;
}

function makeLabeledSelect(options, current, onChange) {
  const sel = document.createElement('select');
  sel.className = 'ui-select';
  Object.assign(sel.style, {
    background: '#0d0d0d', border: '1px solid #333', color: '#5b9bd5',
    fontSize: '11px', borderRadius: '4px', padding: '2px 4px', outline: 'none', cursor: 'pointer', width: '100%'
  });
  options.forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value; opt.textContent = label;
    if (value === current) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = e => onChange(e.target.value);
  return sel;
}

function disableControl(ctrl, disabled) {
  ctrl.querySelectorAll('input').forEach(i => { i.disabled = disabled; });
  ctrl.style.opacity = disabled ? '0.4' : '';
}

export const ShapeFillTab = {
  create(tabId, initialCfg) {
    const cfg = { ...DEFAULTS, ...(initialCfg || {}) };
    if (!initialCfg || Object.keys(initialCfg).length === 0) {
      // Fresh tab (not a persisted/RNR restore): apply the same per-style
      // size/palette defaults the source's initApp() applies once at startup.
      const sizeDef = SIZE_DEFAULTS_POINT[cfg.style];
      if (sizeDef) { cfg.sizeMin = sizeDef.min; cfg.sizeMax = sizeDef.max; }
      const palDef = STYLE_DEFAULT_PALETTE[cfg.style];
      if (palDef) cfg.paletteId = palDef;
      const maxT = THICKNESS_MAX_BY_STYLE[cfg.style] || THICKNESS_MAX_DEFAULT;
      if (cfg.thickness > maxT) cfg.thickness = maxT;
    }
    applyPaletteResolution(cfg);

    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Shape Fill</span></div>
        <div class="tool-scroll"></div>
      </div>
      <div class="xcs-viewer">
        <div class="viewer-top"><div class="viewer-fname">Shape Fill</div></div>
        <div class="viewer-main">
          <div class="canvas-panel">
            <div class="canvas-label">Laser Area — Shape Fill</div>
            <canvas class="sf-canvas" width="1200" height="900"
              style="width:100%;height:100%;display:block;touch-action:none;cursor:default;"></canvas>
          </div>
        </div>
      </div>
    `;

    const canvasEl = pane.querySelector('.sf-canvas');
    const engine = createEngine(canvasEl);
    const state = { engine, canvasEl };
    App.instances[tabId] = { type: 'shapefill', pane, cfg, state };

    const persistShape = () => { cfg.rawPoints = engine.getRawPoints(); Persistence.save(); };

    canvasEl.addEventListener('mousedown', e => { engine.handlePointerDown(e, cfg); persistShape(); });
    canvasEl.addEventListener('mousemove', e => { engine.handlePointerMove(e, cfg); });
    window.addEventListener('mouseup', e => { engine.handlePointerUp(e, cfg); persistShape(); });
    canvasEl.addEventListener('touchstart', e => { engine.handlePointerDown(e, cfg); persistShape(); }, { passive: false });
    canvasEl.addEventListener('touchmove', e => { engine.handlePointerMove(e, cfg); }, { passive: false });
    window.addEventListener('touchend', e => { engine.handlePointerUp(e, cfg); persistShape(); });

    this.renderControls(tabId);

    if (cfg.rawPoints && cfg.rawPoints.length >= 3) {
      engine.loadRawPoints(cfg.rawPoints, cfg);
    } else {
      engine.loadPreset('pendant', cfg);
      cfg.rawPoints = engine.getRawPoints();
      Persistence.save();
    }
    return pane;
  },

  renderControls(tabId) {
    const inst = App.instances[tabId];
    const { pane, cfg, state } = inst;
    const engine = state.engine;
    const canvasEl = state.canvasEl;
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';

    const rebuild = () => this.renderControls(tabId);
    const set = (key, val) => { cfg[key] = val; Persistence.save(); engine.generate(cfg); };

    const meta = computeSliderMeta(cfg.style, cfg.mode);

    // ── Shape ──
    const presetRow = document.createElement('div');
    presetRow.style.display = 'flex'; presetRow.style.gap = '6px'; presetRow.style.flexWrap = 'wrap';
    SHAPE_PRESET_LIST.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'hbtn sm';
      Object.assign(btn.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: '1 1 0', minWidth: '0', padding: '6px 2px' });
      btn.innerHTML = `<span style="width:16px;height:16px;display:inline-flex">${p.svg}</span><span style="font-size:9px">${p.label}</span>`;
      btn.onclick = () => {
        const apply = () => { engine.loadPreset(p.key, cfg); cfg.rawPoints = engine.getRawPoints(); Persistence.save(); };
        if (engine.isShapeCustom()) {
          if (confirm('Replace your custom-edited shape with this preset? This cannot be undone.')) apply();
        } else apply();
      };
      presetRow.appendChild(btn);
    });

    const editBtn = UI.makeActionBtn(engine.isEditMode() ? '✅ Done Editing' : '✏️ Edit Shape', engine.isEditMode(), () => {
      const on = !engine.isEditMode();
      engine.setEditMode(on, cfg);
      canvasEl.style.cursor = on ? 'crosshair' : 'default';
      cfg.rawPoints = engine.getRawPoints();
      Persistence.save();
      rebuild();
    });
    editBtn.style.width = '100%';

    const clearBtn = UI.makeActionBtn('Clear Shape', false, () => {
      if (engine.getRawPoints().length > 0 && !confirm('Clear the current shape? This cannot be undone.')) return;
      engine.clearShape();
      cfg.rawPoints = [];
      Persistence.save();
    });
    clearBtn.style.width = '100%';
    clearBtn.style.display = engine.isEditMode() ? '' : 'none';

    const instructionsEl = document.createElement('div');
    Object.assign(instructionsEl.style, { fontSize: '11px', color: '#888', lineHeight: '1.4' });
    instructionsEl.textContent = engine.isEditMode()
      ? 'Tap/click the canvas to add a point, or drag an existing point to move it.'
      : 'Pick a preset below, or click Edit Shape to draw a custom outline.';

    scroll.appendChild(UI.makeSection('Shape', [presetRow, editBtn, clearBtn, instructionsEl]));

    // ── Style & Palette ──
    const styleSelectEl = makeLabeledSelect(STYLE_OPTIONS, cfg.style, v => {
      cfg.style = v;
      const palDef = STYLE_DEFAULT_PALETTE[v];
      if (palDef) cfg.paletteId = palDef;
      const maxT = THICKNESS_MAX_BY_STYLE[v] || THICKNESS_MAX_DEFAULT;
      if (cfg.thickness > maxT) cfg.thickness = maxT;
      const sizeDef = SIZE_DEFAULTS_POINT[v];
      if (sizeDef) { cfg.sizeMin = sizeDef.min; cfg.sizeMax = sizeDef.max; }
      applyPaletteResolution(cfg);
      Persistence.save();
      engine.generate(cfg);
      rebuild();
    });

    // Standard Pattern Tool palette selector — the same widget every other
    // tab uses, listing the real, xTool-calibrated laser palettes — plus a
    // "True Color" entry that turns the mapping off and draws the decorative
    // Color Mapping colors exactly as chosen.
    const laserPaletteChoices = {
      [TRUE_COLOR_ID]: { id: TRUE_COLOR_ID, name: '★ True Color', laser: null, entries: [] },
      ...App.palettes
    };
    const laserPaletteCtrl = UI.makePaletteSelector(laserPaletteChoices, cfg.laserPaletteId, v => {
      cfg.laserPaletteId = v;
      applyPaletteResolution(cfg);
      Persistence.save();
      engine.generate(cfg);
      rebuild();
    });

    const paletteSelectEl = makeLabeledSelect(PALETTE_OPTIONS, cfg.paletteId, v => {
      cfg.paletteId = v;
      applyPaletteResolution(cfg);
      Persistence.save();
      engine.generate(cfg);
      rebuild();
    });
    const paletteDefaultBtn = UI.makeActionBtn('★', false, () => {
      const def = STYLE_DEFAULT_PALETTE[cfg.style];
      if (!def || cfg.paletteId === def) return;
      cfg.paletteId = def;
      applyPaletteResolution(cfg);
      Persistence.save();
      engine.generate(cfg);
      rebuild();
    });
    paletteDefaultBtn.title = 'Use default palette for this style';
    paletteDefaultBtn.disabled = !STYLE_DEFAULT_PALETTE[cfg.style] || cfg.paletteId === STYLE_DEFAULT_PALETTE[cfg.style];
    const paletteRow = document.createElement('div');
    Object.assign(paletteRow.style, { display: 'flex', gap: '6px', alignItems: 'center', flex: '1' });
    paletteRow.appendChild(paletteSelectEl); paletteRow.appendChild(paletteDefaultBtn);

    const modeToggle = UI.makeToggles(['fill', 'border'], cfg.mode, v => {
      cfg.mode = v;
      Persistence.save();
      engine.generate(cfg);
      rebuild();
    }, { fill: 'Fill Interior', border: 'Trace Border' });

    scroll.appendChild(UI.makeSection('Style', [
      UI.makeRow('Style', styleSelectEl),
      UI.makeRow('Laser Palette', laserPaletteCtrl,
        'Choose a real xTool laser palette to substitute for the colors below (nearest match, no two colors sharing one entry) — or True Color to draw them exactly as chosen.'),
      UI.makeRow('Color Mapping', paletteRow, buildColorMappingTooltip(cfg)),
      UI.makeRow('Mode', modeToggle)
    ]));

    // ── Pattern ──
    const thicknessMax = THICKNESS_MAX_BY_STYLE[cfg.style] || THICKNESS_MAX_DEFAULT;
    if (cfg.thickness > thicknessMax) cfg.thickness = thicknessMax;
    const thicknessCtrl = UI.makeRange(2, thicknessMax, 1, cfg.thickness, v => set('thickness', +v));
    disableControl(thicknessCtrl, meta.thickness.disabled);

    const densityCtrl = UI.makeRange(5, 150, 1, cfg.density, v => set('density', +v));

    const colorCtrl = UI.makeRange(0, 100, 1, Math.round(cfg.colorPct * 100), v => set('colorPct', +v / 100));
    disableControl(colorCtrl, meta.color.disabled);

    const maxStraightCtrl = UI.makeRange(1, 25, 1, cfg.maxStraight, v => set('maxStraight', +v));
    disableControl(maxStraightCtrl, meta.maxStraight.disabled);

    const gearsCtrl = UI.makeRange(0, 20, 1, cfg.gears, v => set('gears', +v));

    const marginCtrl = UI.makeRange(-100, 100, 1, cfg.margin, v => set('margin', +v));

    const sizeMinCtrl = UI.makeRange(2, 120, 1, cfg.sizeMin, v => {
      let mv = +v;
      if (mv > cfg.sizeMax - 10) mv = cfg.sizeMax - 10;
      set('sizeMin', mv);
    });
    const sizeMaxCtrl = UI.makeRange(2, 120, 1, cfg.sizeMax, v => {
      let mv = +v;
      if (mv < cfg.sizeMin + 10) mv = cfg.sizeMin + 10;
      set('sizeMax', mv);
    });
    disableControl(sizeMinCtrl, meta.size.disabled);
    disableControl(sizeMaxCtrl, meta.size.disabled);

    scroll.appendChild(UI.makeSection('Pattern', [
      UI.makeRow(meta.thickness.label, thicknessCtrl, meta.thickness.description),
      UI.makeRow(meta.density.label, densityCtrl, meta.density.description),
      UI.makeRow(meta.size.label + ' Min', sizeMinCtrl, meta.size.description),
      UI.makeRow(meta.size.label + ' Max', sizeMaxCtrl, meta.size.description),
      UI.makeRow(meta.color.label, colorCtrl, meta.color.description),
      UI.makeRow(meta.maxStraight.label, maxStraightCtrl, meta.maxStraight.description),
      UI.makeRow(meta.gears.label, gearsCtrl, meta.gears.description),
      UI.makeRow(meta.margin.label, marginCtrl, meta.margin.description)
    ]));

    // ── Refresh ──
    const refreshColorsBtn = UI.makeActionBtn('🎨 Colors', false, () => engine.refreshColors(cfg));
    const refreshPatternBtn = UI.makeActionBtn('🔀 Pattern', false, () => engine.refreshPattern(cfg));
    refreshColorsBtn.style.flex = '1'; refreshPatternBtn.style.flex = '1';
    refreshColorsBtn.title = 'Keep the same layout, reroll colors only';
    refreshPatternBtn.title = 'Keep the same colors, reroll layout only';
    const actionsRow = document.createElement('div');
    Object.assign(actionsRow.style, { display: 'flex', gap: '6px' });
    actionsRow.appendChild(refreshColorsBtn); actionsRow.appendChild(refreshPatternBtn);
    scroll.appendChild(UI.makeSection('Refresh', [actionsRow]));

    // ── Docs ──
    const colorMappingLink = document.createElement('button');
    colorMappingLink.className = 'hbtn sm';
    colorMappingLink.style.width = '100%';
    colorMappingLink.textContent = 'How colors map to xTool →';
    colorMappingLink.title = 'How the app maps swatch colors to xTool export layers and power settings';
    colorMappingLink.onclick = () => {
      const params = new URLSearchParams({ laser: cfg.laserPaletteId, style: cfg.paletteId });
      window.location.href = '../laser-color-mapping.html?' + params.toString();
    };
    scroll.appendChild(colorMappingLink);
  }
};

export { PALETTES, STYLE_OPTIONS, PALETTE_OPTIONS, computeSliderMeta, createEngine };

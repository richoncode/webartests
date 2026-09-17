/**
 * Polygon geometry for removing buried geometry.
 *
 * Every shape the recorder emits is engraved in full, including the parts a
 * later shape covers. Measured with tools/buried.mjs, that is 22% to 78% of the
 * engraved area, and almost none of it is whole shapes — at most 37 in a design
 * are completely hidden, while thousands are partly hidden. So the work is
 * subtraction, not culling, and subtraction needs real polygon booleans.
 *
 * Units. Clipper works in integers; SCALE puts one millimetre at 10,000 units,
 * so the resolution here is 0.0001 mm — a hundred times finer than the three
 * decimal places a dPath is written with, and far finer than the beam.
 *
 * Curves. A dPath from this exporter carries M, L, Q and Z: arcs are already
 * sampled to line segments by the recorder, and only quadratics survive as
 * curves. Booleans need polygons, so Q is flattened here at a stated tolerance
 * rather than silently at whatever the renderer felt like.
 *
 * Verified by tools/geometry-check.mjs, which renders the original geometry and
 * the round-tripped geometry as binary ink masks at 0.0244 mm per pixel and
 * counts the pixels that differ. Twelve of the fourteen styles come back
 * bit-identical; the two that do not are the curve-heavy ones, and their
 * residual tracks the tolerance.
 */
import ClipperLib from '../vendor/clipper-6.4.2.js';

export const SCALE = 10000;

/**
 * Default flattening tolerance in millimetres — about fifteen times finer than
 * the beam. Measured on Autumn Leaves, the curviest style: at 0.01 mm a
 * flatten-and-re-emit round trip moved 0.157% of the engraved area, at 0.002 mm
 * it moved 0.036%, and the point count barely differed between the two. The
 * accuracy is close to free, so it is taken.
 */
export const TOLERANCE_MM = 0.002;

const { Clipper, ClipType, PolyType, PolyFillType } = ClipperLib;

const fillType = rule =>
  String(rule) === 'evenodd' ? PolyFillType.pftEvenOdd : PolyFillType.pftNonZero;

/**
 * Number of line segments to approximate a quadratic within `tol` millimetres.
 * The error of an n-segment approximation is |P0 - 2C + P2| / (8 n^2), so n
 * follows from inverting that rather than from a guessed constant.
 */
function quadSteps(p0, c, p2, tol) {
  const dx = p0.x - 2 * c.x + p2.x, dy = p0.y - 2 * c.y + p2.y;
  const d = Math.hypot(dx, dy);
  return Math.max(1, Math.ceil(Math.sqrt(d / (8 * tol))));
}

/**
 * dPath to Clipper rings. Absolute commands only — this exporter writes nothing
 * else, and throwing on a relative command is better than quietly placing the
 * geometry somewhere wrong.
 *
 * @param {string} d
 * @param {number} [tol] flattening tolerance in mm
 * @returns {Array<Array<{X:number,Y:number}>>} rings in Clipper integer units
 */
export function dPathToRings(d, tol = TOLERANCE_MM) {
  const rings = [];
  let ring = null, cx = 0, cy = 0, sx = 0, sy = 0;
  const push = (x, y) => {
    const X = Math.round(x * SCALE), Y = Math.round(y * SCALE);
    if (!ring) return;
    const last = ring[ring.length - 1];
    if (!last || last.X !== X || last.Y !== Y) ring.push({ X, Y });
  };
  const close = () => {
    if (ring && ring.length >= 3) rings.push(ring);
    ring = null;
  };

  const tokens = String(d).match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  let i = 0, cmd = null;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === 'M') {
      close();
      cx = sx = num(); cy = sy = num();
      ring = [];
      push(cx, cy);
    } else if (cmd === 'L') {
      cx = num(); cy = num();
      push(cx, cy);
    } else if (cmd === 'Q') {
      const qx = num(), qy = num(), x = num(), y = num();
      const n = quadSteps({ x: cx, y: cy }, { x: qx, y: qy }, { x, y }, tol);
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        push(u * u * cx + 2 * u * t * qx + t * t * x, u * u * cy + 2 * u * t * qy + t * t * y);
      }
      cx = x; cy = y;
    } else if (cmd === 'Z' || cmd === 'z') {
      push(sx, sy);
      close();
      cx = sx; cy = sy;
    } else if (cmd && /[a-z]/.test(cmd)) {
      throw new Error(`relative path command "${cmd}" — this exporter writes absolute only`);
    } else if (cmd) {
      throw new Error(`unsupported path command "${cmd}"`);
    } else {
      i++;
    }
  }
  close();
  return rings;
}

/**
 * Clipper rings back to a dPath, at the same three decimal places the rest of
 * the exporter writes.
 *
 * Fill rule: rings that came out of a boolean must be drawn evenodd, since
 * Clipper's output can nest an island inside a hole and evenodd gets that right
 * whatever the winding — the buried-geometry round trip confirmed Studio honours
 * it. Rings that merely came from dPathToRings keep the shape's own rule; they
 * are the same geometry only re-written, and a capsule stroke's overlapping
 * quads drawn evenodd would punch holes at every joint.
 */
export function ringsToDPath(rings) {
  return rings
    .filter(r => r.length >= 3)
    .map(r => 'M ' + r.map(p => `${(p.X / SCALE).toFixed(3)} ${(p.Y / SCALE).toFixed(3)}`).join(' L ') + ' Z')
    .join(' ');
}

function run(clipType, subject, clip, subjFill, clipFill) {
  const c = new Clipper();
  if (subject && subject.length) c.AddPaths(subject, PolyType.ptSubject, true);
  if (clip && clip.length) c.AddPaths(clip, PolyType.ptClip, true);
  const out = [];
  c.Execute(clipType, out, fillType(subjFill), fillType(clipFill));
  return out;
}

/**
 * Resolve a shape against itself. A capsule stroke is 30 to 60 overlapping
 * quads, and this turns it into one outline; a shape already simple comes back
 * unchanged apart from the winding.
 */
export function unionSelf(rings, rule = 'nonzero') {
  return run(ClipType.ctUnion, rings, [], rule, rule);
}

/** Merge shapes that touch or overlap into as few outlines as they make. */
export function unionAll(ringSets, rule = 'nonzero') {
  const all = [];
  for (const set of ringSets) for (const r of set) all.push(r);
  return run(ClipType.ctUnion, all, [], rule, rule);
}

/** What is left of `subject` once everything in `clipSets` is taken away. */
export function subtract(subject, clipSets, rule = 'nonzero') {
  const clip = [];
  for (const set of clipSets) for (const r of set) clip.push(r);
  if (!clip.length) return subject;
  return run(ClipType.ctDifference, subject, clip, rule, PolyFillType.pftNonZero);
}

/** Signed area of a ring set, in square millimetres. */
export function ringsArea(rings) {
  let a = 0;
  for (const r of rings) a += Clipper.Area(r);
  return a / (SCALE * SCALE);
}

/** Axis-aligned bounds in millimetres, or null for empty input. */
export function ringsBounds(rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (const p of r) {
    if (p.X < x0) x0 = p.X; if (p.X > x1) x1 = p.X;
    if (p.Y < y0) y0 = p.Y; if (p.Y > y1) y1 = p.Y;
  }
  if (x0 === Infinity) return null;
  return { x0: x0 / SCALE, y0: y0 / SCALE, x1: x1 / SCALE, y1: y1 / SCALE };
}

/** Drop rings whose area is under `minMM2` — the slivers subtraction leaves. */
export function dropSlivers(rings, minMM2) {
  return rings.filter(r => Math.abs(Clipper.Area(r)) / (SCALE * SCALE) >= minMM2);
}

/**
 * Remove what is buried.
 *
 * `shapes` are in paint order — index 0 is painted first and is therefore the
 * one most likely to be covered. Each entry is { rings, rule, bounds }, bounds
 * in millimetres as returned by ringsBounds. Every shape is replaced by the
 * part of it no later shape covers; a shape covered entirely comes back empty.
 *
 * Only shapes whose bounding boxes actually overlap are considered, found
 * through a uniform grid. Without that this is quadratic, and a design of six
 * thousand shapes is eighteen million pairs.
 *
 * What is subtracted is each covering shape's *original* geometry, not its
 * clipped remainder. The two give the same answer — anything that clipped the
 * coverer is above this shape too and is subtracted in its own right — and the
 * original is already to hand.
 *
 * This is the long pass — about 27 seconds on Gears — so it is async and hands
 * the thread back whenever it has held it for `sliceMs`. Without that it blocks
 * for its whole duration and the page looks frozen on load.
 *
 * Yielding on a shape count instead was tried and is not enough: one shape can
 * take seconds by itself when thousands overlap it, so a count of 50 still left
 * blocks of 2.8 seconds. Time is what the reader notices, so time is what this
 * counts.
 *
 * @param {Array<{rings:Array, rule?:string, bounds:Object}>} shapes
 * @param {{minMM2?:number, sliceMs?:number, onProgress?:Function}} [opts]
 *        `minMM2` is the area below which a remainder is discarded, `sliceMs`
 *        how long it may hold the thread between yields
 * @returns {{rings:Array, empty:boolean, removed:boolean, trimmed:boolean}[]} one
 *          per input: `empty` had no geometry to begin with, `removed` was
 *          wholly covered, `trimmed` lost part of itself.
 */
export async function occludeScene(shapes, opts = {}) {
  const minMM2 = opts.minMM2 ?? 0;
  const sliceMs = opts.sliceMs ?? 12;
  let lastYield = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const n = shapes.length;

  // A grid sized to the median shape: much smaller and the big shapes touch
  // every cell, much larger and the filter stops filtering.
  const spans = shapes.filter(s => s.bounds).map(s =>
    Math.max(s.bounds.x1 - s.bounds.x0, s.bounds.y1 - s.bounds.y0));
  spans.sort((a, b) => a - b);
  const cell = Math.max(0.5, spans[Math.floor(spans.length / 2)] || 2);
  const key = (cx, cy) => cx + ',' + cy;
  const grid = new Map();
  const cellsOf = (b) => {
    const out = [];
    for (let cy = Math.floor(b.y0 / cell); cy <= Math.floor(b.y1 / cell); cy++)
      for (let cx = Math.floor(b.x0 / cell); cx <= Math.floor(b.x1 / cell); cx++)
        out.push(key(cx, cy));
    return out;
  };
  for (let i = 0; i < n; i++) {
    if (!shapes[i].bounds) continue;
    for (const k of cellsOf(shapes[i].bounds)) {
      let list = grid.get(k);
      if (!list) grid.set(k, list = []);
      list.push(i);
    }
  }

  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const s = shapes[i];
    // Empty input is not the same finding as buried output, and counting the
    // two together once made a degenerate-path count look like an occlusion
    // result. They are reported apart.
    if (!s.bounds || !s.rings.length) { out[i] = { rings: [], empty: true, removed: false, trimmed: false }; continue; }
    const above = new Set();
    for (const k of cellsOf(s.bounds)) {
      const list = grid.get(k);
      if (!list) continue;
      for (const j of list) if (j > i && overlaps(s.bounds, shapes[j].bounds)) above.add(j);
    }
    if (!above.size) { out[i] = { rings: s.rings, empty: false, removed: false, trimmed: false }; continue; }
    const clip = [];
    for (const j of above) for (const r of shapes[j].rings) clip.push(r);
    let rings = subtract(s.rings, [clip], s.rule || 'nonzero');
    if (minMM2 > 0) rings = dropSlivers(rings, minMM2);
    out[i] = { rings, empty: false, removed: rings.length === 0, trimmed: rings.length > 0 };
    if (now() - lastYield >= sliceMs) {
      if (opts.onProgress) opts.onProgress(i, n);
      await new Promise(r => setTimeout(r, 0));
      lastYield = now();
    }
  }
  return out;
}

/**
 * Merge shapes that share a colour into as few outlines as they make, so a
 * boundary two of them share is engraved once rather than twice.
 *
 * @param {Array<{rings:Array, color:string}>} shapes
 * @returns {Map<string, Array>} colour to merged rings
 */
export async function mergeByColour(shapes) {
  const byColour = new Map();
  for (const s of shapes) {
    if (!s.rings || !s.rings.length) continue;
    let list = byColour.get(s.color);
    if (!list) byColour.set(s.color, list = []);
    list.push(s.rings);
  }
  const merged = new Map();
  for (const [colour, sets] of byColour) {
    merged.set(colour, unionAll(sets, 'nonzero'));
    await new Promise(r => setTimeout(r, 0));
  }
  return merged;
}

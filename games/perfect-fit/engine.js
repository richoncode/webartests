/* Perfect Fit — geometry, levels, and scoring. No DOM. */
(function (root) {
  'use strict';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
  function mul(a, s) { return { x: a.x * s, y: a.y * s }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function cross(a, b) { return a.x * b.y - a.y * b.x; }
  function len(a) { return Math.hypot(a.x, a.y); }
  function norm(a) {
    const L = len(a) || 1;
    return { x: a.x / L, y: a.y / L };
  }
  function pt(x, y) { return { x: x, y: y }; }
  function rect(x0, y0, x1, y1) {
    return [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];
  }

  function arcFractions(poly) {
    const ts = [0];
    let total = 0;
    const seg = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const L = dist(poly[i], poly[i + 1]);
      seg.push(L);
      total += L;
    }
    let acc = 0;
    for (let i = 0; i < seg.length; i++) {
      acc += seg[i];
      ts.push(total ? acc / total : 0);
    }
    return { ts: ts, total: total };
  }

  function pointAt(poly, t) {
    if (!poly.length) return pt(0, 0);
    if (poly.length === 1 || t <= 0) return pt(poly[0].x, poly[0].y);
    if (t >= 1) {
      const p = poly[poly.length - 1];
      return pt(p.x, p.y);
    }
    const arc = arcFractions(poly);
    const ts = arc.ts;
    let i = 0;
    while (i < ts.length - 1 && ts[i + 1] < t) i++;
    const span = (ts[i + 1] - ts[i]) || 1;
    const u = (t - ts[i]) / span;
    return pt(lerp(poly[i].x, poly[i + 1].x, u), lerp(poly[i].y, poly[i + 1].y, u));
  }

  function resample(poly, n) {
    const out = [];
    const count = Math.max(2, n);
    for (let i = 0; i < count; i++) out.push(pointAt(poly, i / (count - 1)));
    return out;
  }

  function avgDist(a, b) {
    const n = 40;
    const as = resample(a, n);
    const bs = resample(b, n);
    let s = 0;
    for (let i = 0; i < n; i++) s += dist(as[i], bs[i]);
    return s / n;
  }

  function pointSegDist(p, a, b) {
    const ab = sub(b, a);
    const L2 = dot(ab, ab) || 1;
    let t = dot(sub(p, a), ab) / L2;
    t = clamp(t, 0, 1);
    return dist(p, pt(a.x + ab.x * t, a.y + ab.y * t));
  }

  function pointInPoly(p, poly) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (pointSegDist(p, a, b) < 0.18) return true;
    }
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      const intersect = ((a.y > p.y) !== (b.y > p.y)) &&
        (p.x < (b.x - a.x) * (p.y - a.y) / ((b.y - a.y) || 1e-9) + a.x);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function signedArea(poly) {
    let a = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      a += p.x * q.y - q.x * p.y;
    }
    return a / 2;
  }

  function polyFromCut(cut, mode, far) {
    const a = cut[0];
    const b = cut[cut.length - 1];
    if (mode === 'right') {
      return cut.concat([pt(far, b.y), pt(far, a.y)]);
    }
    return cut.concat([pt(b.x, far), pt(a.x, far)]);
  }

  function wastePoly(rough, cut) {
    const rev = cut.slice().reverse();
    return rough.concat(rev);
  }

  function fitFromAvg(avg, base) {
    if (base < 1e-4) return avg < 0.08 ? 100 : 0;
    return clamp((1 - avg / base) * 100, 0, 100);
  }

  function starsFor(fit) {
    if (fit >= 96) return 3;
    if (fit >= 84) return 2;
    if (fit >= 66) return 1;
    return 0;
  }

  function titleFor(fit) {
    if (fit >= 96) return 'Hairline';
    if (fit >= 84) return 'Tight';
    if (fit >= 66) return 'Fair';
    if (fit >= 40) return 'Open';
    return 'Proud';
  }

  function closestOnPoly(p, poly) {
    let best = { dist: Infinity, t: 0, point: poly[0] };
    const arc = arcFractions(poly);
    const total = arc.total || 1;
    let walked = 0;
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i], b = poly[i + 1];
      const ab = sub(b, a);
      const L2 = dot(ab, ab) || 1;
      const L = Math.sqrt(L2);
      let u = clamp(dot(sub(p, a), ab) / L2, 0, 1);
      const q = pt(a.x + ab.x * u, a.y + ab.y * u);
      const d = dist(p, q);
      if (d < best.dist) {
        best = { dist: d, t: (walked + L * u) / total, point: q, seg: i };
      }
      walked += L;
    }
    return best;
  }

  function angDiff(a, b, c, d) {
    const a1 = Math.atan2(b.y - a.y, b.x - a.x);
    const a2 = Math.atan2(d.y - c.y, d.x - c.x);
    let dlt = Math.abs(a1 - a2) % Math.PI;
    if (dlt > Math.PI / 2) dlt = Math.PI - dlt;
    return dlt;
  }

  function pointLineDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / L;
  }

  function projectParam(p, a, b) {
    const ab = sub(b, a);
    const L2 = dot(ab, ab) || 1;
    return dot(sub(p, a), ab) / L2;
  }

  function projectPointToLine(p, a, b) {
    const u = projectParam(p, a, b);
    return pt(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
  }

  function coverFraction(a, b, c, d) {
    const u0 = projectParam(a, c, d);
    const u1 = projectParam(b, c, d);
    const lo = clamp(Math.min(u0, u1), 0, 1);
    const hi = clamp(Math.max(u0, u1), 0, 1);
    return hi - lo;
  }

  function lineIntersect(p, p2, q, q2) {
    const r = sub(p2, p);
    const s = sub(q2, q);
    const den = cross(r, s);
    if (Math.abs(den) < 1e-9) return null;
    const t = cross(sub(q, p), s) / den;
    const u = cross(sub(q, p), r) / den;
    return { t: t, u: u, point: add(p, mul(r, t)) };
  }

  function offsetBand(curve, thickness) {
    const n = curve.length;
    const left = [];
    for (let i = 0; i < n; i++) {
      const prev = curve[Math.max(0, i - 1)];
      const next = curve[Math.min(n - 1, i + 1)];
      const tx = next.x - prev.x;
      const ty = next.y - prev.y;
      const L = Math.hypot(tx, ty) || 1;
      const nx = -ty / L;
      const ny = tx / L;
      left.push(pt(curve[i].x + nx * thickness, curve[i].y + ny * thickness));
    }
    return curve.concat(left.reverse());
  }

  function quadStrip(a, b, thickness, side) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * thickness * side;
    const ny = (dx / L) * thickness * side;
    return [pt(a.x, a.y), pt(b.x, b.y), pt(b.x + nx, b.y + ny), pt(a.x + nx, a.y + ny)];
  }

  function segmentsOf(poly) {
    const segs = [];
    for (let i = 0; i < poly.length - 1; i++) segs.push([poly[i], poly[i + 1]]);
    return segs;
  }

  function score(level, cut) {
    const avg = avgDist(cut, level.ideal);
    const fit = fitFromAvg(avg, level.base);
    return {
      cut: cut,
      avg: avg,
      base: level.base,
      fit: fit,
      stars: starsFor(fit),
      title: titleFor(fit),
      mm: (1 - fit / 100) * level.spanMm
    };
  }

  function traceCut(level, locked) {
    const ideal = level.ideal;
    const rough = level.rough;
    const nSeg = ideal.length - 1;
    const idealT = arcFractions(ideal).ts;
    const out = [];
    const steps = 5;
    for (let s = 0; s < nSeg; s++) {
      const ra = pointAt(rough, idealT[s]);
      const rb = pointAt(rough, idealT[s + 1]);
      for (let k = 0; k < steps; k++) {
        const u = k / steps;
        if (locked[s]) out.push(pt(lerp(ideal[s].x, ideal[s + 1].x, u), lerp(ideal[s].y, ideal[s + 1].y, u)));
        else out.push(pt(lerp(ra.x, rb.x, u), lerp(ra.y, rb.y, u)));
      }
    }
    if (locked[nSeg - 1]) out.push(pt(ideal[ideal.length - 1].x, ideal[ideal.length - 1].y));
    else {
      const end = rough[rough.length - 1];
      out.push(pt(end.x, end.y));
    }
    return out;
  }

  function washerCut(level, bins) {
    const n = bins.length;
    const ideal = resample(level.ideal, n);
    const rough = resample(level.rough, n);
    const out = [];
    for (let i = 0; i < n; i++) out.push(bins[i] ? ideal[i] : rough[i]);
    return out;
  }

  function evaluate(level, mark) {
    let cut;
    let coverage = 1;
    if (level.tool === 'square') {
      const x = mark.seated ? level.square.idealX : mark.x;
      cut = [pt(x, level.square.top), pt(x, level.square.bot)];
    } else if (level.tool === 'line') {
      if (mark.seated) cut = level.ideal.map(function (p) { return pt(p.x, p.y); });
      else {
        const hitA = lineIntersect(mark.a, mark.b, level.rails[0][0], level.rails[0][1]);
        const hitB = lineIntersect(mark.a, mark.b, level.rails[1][0], level.rails[1][1]);
        if (!hitA || !hitB || Math.abs(hitA.t - hitB.t) < 1e-4) cut = level.rough.map(function (p) { return pt(p.x, p.y); });
        else cut = [hitA.point, hitB.point];
      }
    } else if (level.tool === 'trace') {
      cut = traceCut(level, mark.locked);
      const n = mark.locked.length;
      let got = 0;
      for (let i = 0; i < n; i++) if (mark.locked[i]) got++;
      coverage = n ? got / n : 0;
    } else if (level.tool === 'washer') {
      cut = washerCut(level, mark.bins);
      let got = 0;
      for (let i = 0; i < mark.bins.length; i++) if (mark.bins[i]) got++;
      coverage = mark.bins.length ? got / mark.bins.length : 0;
    } else {
      cut = level.rough.map(function (p) { return pt(p.x, p.y); });
    }
    const result = score(level, cut);
    result.coverage = coverage;
    result.poly = polyFromCut(cut, level.mode, level.far);
    result.waste = wastePoly(level.rough, cut);
    return result;
  }

  function blankMark(level) {
    if (level.tool === 'square') {
      return { type: 'square', x: level.square.startX, seated: false };
    }
    if (level.tool === 'line') {
      return {
        type: 'line',
        a: pt(level.line.startA.x, level.line.startA.y),
        b: pt(level.line.startB.x, level.line.startB.y),
        seated: false
      };
    }
    if (level.tool === 'trace') {
      return {
        type: 'trace',
        a: pt(level.line.startA.x, level.line.startA.y),
        b: pt(level.line.startB.x, level.line.startB.y),
        locked: level.ideal.slice(1).map(function () { return false; })
      };
    }
    const bins = [];
    for (let i = 0; i < level.bins; i++) bins.push(false);
    return { type: 'washer', bins: bins, t: 0.02, inContact: false, seen: false };
  }

  function perfectMark(level) {
    if (level.tool === 'square') return { type: 'square', x: level.square.idealX, seated: true };
    if (level.tool === 'line') {
      return {
        type: 'line',
        a: pt(level.ideal[0].x, level.ideal[0].y),
        b: pt(level.ideal[level.ideal.length - 1].x, level.ideal[level.ideal.length - 1].y),
        seated: true
      };
    }
    if (level.tool === 'trace') {
      return {
        type: 'trace',
        a: pt(level.ideal[0].x, level.ideal[0].y),
        b: pt(level.ideal[1].x, level.ideal[1].y),
        locked: level.ideal.slice(1).map(function () { return true; })
      };
    }
    const bins = [];
    for (let i = 0; i < level.bins; i++) bins.push(true);
    return { type: 'washer', bins: bins, t: 1, inContact: false, seen: true };
  }

  function finalizeLevel(level) {
    level.base = avgDist(level.rough, level.ideal);
    level.segments = segmentsOf(level.ideal);
    return level;
  }

  function makeScribe(opts) {
    const N = 72;
    const wall = [];
    const ideal = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = opts.y0 + (opts.y1 - opts.y0) * t;
      const x = opts.xAt(t);
      wall.push(pt(x, y));
      ideal.push(pt(x + opts.R, y));
    }
    let minX = Infinity;
    for (let i = 0; i < ideal.length; i++) minX = Math.min(minX, ideal[i].x);
    const rough = [pt(minX, opts.y0), pt(minX, opts.y1)];
    const band = offsetBand(wall, opts.thick || 14);
    return { wall: wall, ideal: ideal, rough: rough, band: band, minX: minX };
  }

  const levels = [];

  /* 1 — square butt. Stock is proud of a square end. */
  levels.push(finalizeLevel({
    id: 'butt',
    name: 'Butt Joint',
    tool: 'square',
    draw: 'work-on-top',
    mode: 'right',
    far: 94,
    spanMm: 8,
    away: pt(1, 0),
    slide: null,
    hint: 'Slide the square until the blade covers the joint.',
    blurb: 'A long board, a square end, no tape.',
    tutorial: [
      'This end is proud of the joint. A tape measure would just copy the mistake.',
      'Drag anywhere sideways. The square snaps onto the fence — that click is the tool seating.',
      'Slide until the blade sits on the other board’s end. Green means the seam will close.',
      'Cut along the blade. The waste falls, then the boards come together.'
    ],
    tone: 'oak',
    seed: 3,
    fixed: [
      { poly: rect(6, 52, 96, 64), tone: 'fence', decor: true, seed: 1 },
      { poly: rect(8, 64, 36, 108), tone: 'walnut', seed: 2, angle: 0.02 }
    ],
    mating: [pt(36, 64), pt(36, 108)],
    ideal: [pt(36, 64), pt(36, 108)],
    rough: [pt(18, 64), pt(18, 108)],
    square: { top: 64, bot: 108, idealX: 36, startX: 64, xMin: 24, xMax: 78 }
  }));

  /* 2 — inside corner, off-square miter. Copy the mating end. */
  levels.push(finalizeLevel({
    id: 'corner',
    name: 'Inside Corner',
    tool: 'line',
    draw: 'work-on-top',
    mode: 'down',
    far: 118,
    spanMm: 7,
    away: pt(0, 1),
    slide: null,
    hint: 'Lay the straightedge on the miter. Don’t assume 45°.',
    blurb: 'The room isn’t square. Copy the cut that’s already there.',
    tone: 'oak',
    seed: 5,
    rails: [
      [pt(28, 28), pt(28, 124)],
      [pt(46, 28), pt(46, 124)]
    ],
    fixed: [
      { poly: rect(14, 30, 98, 46), tone: 'wall', decor: true, seed: 8 },
      { poly: rect(14, 46, 28, 122), tone: 'wall', decor: true, seed: 9 },
      {
        poly: [pt(28, 46), pt(98, 46), pt(98, 72), pt(46, 72), pt(28, 46)],
        tone: 'walnut',
        seed: 4,
        angle: 0
      }
    ],
    mating: [pt(28, 46), pt(46, 72)],
    ideal: [pt(28, 46), pt(46, 72)],
    rough: [pt(28, 34), pt(46, 34)],
    line: {
      startA: pt(24, 38),
      startB: pt(52, 36)
    }
  }));

  /* 3 — outside curved wall, washer scribe. */
  (function () {
    const R = 8;
    const s = makeScribe({
      y0: 40,
      y1: 110,
      R: R,
      thick: 16,
      xAt: function (t) { return 22 + 5.5 * Math.sin(Math.PI * t); }
    });
    levels.push(finalizeLevel({
      id: 'curve',
      name: 'Curved Wall',
      tool: 'washer',
      draw: 'work-on-top',
      mode: 'right',
      far: 92,
      spanMm: 6,
      away: pt(1, 0),
      slide: pt(-R, 0),
      contact: 6.4,
      bins: 56,
      washerR: R,
      hint: 'Ride the washer along the curve. Keep contact the whole way.',
      blurb: 'The wall bows. Scribe it — don’t measure the hollows.',
      tone: 'maple',
      seed: 11,
      fixed: [
        { poly: s.band, tone: 'wall', seed: 12, angle: Math.PI / 2 }
      ],
      mating: s.wall,
      ideal: s.ideal,
      rough: s.rough,
      wall: s.wall
    }));
  })();

  /* 4 — stepped miter. */
  (function () {
    const step = [pt(34, 42), pt(34, 56), pt(48, 56), pt(48, 70), pt(62, 70), pt(62, 86)];
    levels.push(finalizeLevel({
      id: 'step',
      name: 'Stepped Miter',
      tool: 'trace',
      draw: 'template-on-top',
      mode: 'right',
      far: 94,
      spanMm: 5,
      away: pt(1, 0),
      slide: null,
      hint: 'Click the straightedge onto every face of the step.',
      blurb: 'Five faces. Trace each one off the mating piece.',
      tone: 'cherry',
      seed: 15,
      fixed: [{
        poly: [pt(8, 42), pt(34, 42), pt(34, 56), pt(48, 56), pt(48, 70), pt(62, 70), pt(62, 86), pt(8, 86)],
        tone: 'walnut',
        seed: 16,
        angle: 0.01
      }],
      mating: step,
      ideal: step,
      rough: [pt(30, 42), pt(30, 86)],
      line: { startA: pt(70, 58), startB: pt(92, 64) }
    }));
  })();

  /* 5 — three-way truss. Two cheeks on the king post. */
  (function () {
    const cut = [pt(40, 62), pt(50, 46), pt(60, 62)];
    const downL = norm(sub(cut[0], cut[1]));
    const downR = norm(sub(cut[2], cut[1]));
    const leftOuter = add(cut[0], mul(downL, 52));
    const rightOuter = add(cut[2], mul(downR, 52));
    levels.push(finalizeLevel({
      id: 'truss',
      name: 'Three-Way Truss',
      tool: 'trace',
      draw: 'template-on-top',
      mode: 'down',
      far: 112,
      spanMm: 6,
      away: pt(0, -1),
      slide: null,
      hint: 'Trace both rafter undersides onto the post.',
      blurb: 'Left cheek, right cheek. The peak has to kiss.',
      tone: 'oak',
      seed: 21,
      fixed: [
        { poly: rect(14, 112, 86, 122), tone: 'walnut', seed: 22, angle: 0, decor: false },
        { poly: quadStrip(leftOuter, cut[0], 6.5, -1), tone: 'cherry', seed: 23, angle: -0.7 },
        { poly: quadStrip(cut[2], rightOuter, 6.5, -1), tone: 'cherry', seed: 24, angle: 0.7 }
      ],
      mating: cut,
      ideal: cut,
      rough: [pt(40, 36), pt(60, 36)],
      line: { startA: pt(36, 78), startB: pt(66, 84) }
    }));
  })();

  /* 6 — zigzag miter. */
  (function () {
    const zig = [pt(36, 40), pt(52, 52), pt(36, 64), pt(52, 76), pt(36, 88), pt(52, 100)];
    const fixedPoly = [pt(8, 40)].concat(zig).concat([pt(8, 100)]);
    levels.push(finalizeLevel({
      id: 'zigzag',
      name: 'Zigzag Miter',
      tool: 'trace',
      draw: 'template-on-top',
      mode: 'right',
      far: 94,
      spanMm: 4.5,
      away: pt(1, 0),
      slide: null,
      hint: 'Follow the zigzag. Miss a tooth and daylight stays.',
      blurb: 'A toothed joint. Every edge has to click.',
      tone: 'oak',
      seed: 31,
      fixed: [{ poly: fixedPoly, tone: 'walnut', seed: 32, angle: 0.03 }],
      mating: zig,
      ideal: zig,
      rough: [pt(32, 40), pt(32, 100)],
      line: { startA: pt(68, 66), startB: pt(90, 78) }
    }));
  })();

  /* 7 — ogee profile. */
  (function () {
    const R = 9;
    const s = makeScribe({
      y0: 38,
      y1: 112,
      R: R,
      thick: 15,
      xAt: function (t) {
        return 24 + 3.1 * Math.sin(Math.PI * 2 * t) + 1.15 * Math.sin(Math.PI * 4 * t + 0.6);
      }
    });
    levels.push(finalizeLevel({
      id: 'ogee',
      name: 'Ogee Profile',
      tool: 'washer',
      draw: 'work-on-top',
      mode: 'right',
      far: 92,
      spanMm: 5,
      away: pt(1, 0),
      slide: pt(-R, 0),
      contact: 5.6,
      bins: 64,
      washerR: R,
      hint: 'Scribe the whole S. Slow down in the hollows.',
      blurb: 'An ogee molding. The washer has to stay with the profile.',
      tone: 'cherry',
      seed: 41,
      fixed: [{ poly: s.band, tone: 'walnut', seed: 42, angle: Math.PI / 2 }],
      mating: s.wall,
      ideal: s.ideal,
      rough: s.rough,
      wall: s.wall
    }));
  })();

  /* 8 — live edge. */
  (function () {
    const R = 8.5;
    const s = makeScribe({
      y0: 36,
      y1: 114,
      R: R,
      thick: 16,
      xAt: function (t) {
        return 23
          + 2.4 * Math.sin(Math.PI * 2.15 * t + 0.3)
          + 1.55 * Math.sin(Math.PI * 5.2 * t + 1.1)
          + 0.85 * Math.sin(Math.PI * 9 * t + 0.4);
      }
    });
    levels.push(finalizeLevel({
      id: 'live',
      name: 'Live Edge',
      tool: 'washer',
      draw: 'work-on-top',
      mode: 'right',
      far: 92,
      spanMm: 5,
      away: pt(1, 0),
      slide: pt(-R, 0),
      contact: 5.2,
      bins: 72,
      washerR: R,
      hint: 'Keep the washer planted. Lift off and the edge stays wild.',
      blurb: 'No two inches repeat. Scribe the whole live edge.',
      tone: 'maple',
      seed: 51,
      fixed: [{ poly: s.band, tone: 'walnut', seed: 52, angle: 1.2 }],
      mating: s.wall,
      ideal: s.ideal,
      rough: s.rough,
      wall: s.wall
    }));
  })();

  function matchSegment(a, b, c, d) {
    return {
      ang: angDiff(a, b, c, d),
      dist: pointLineDist(pt((c.x + d.x) / 2, (c.y + d.y) / 2), a, b),
      cover: coverFraction(a, b, c, d)
    };
  }

  function seatMatch(m, loose) {
    if (!m) return false;
    if (loose) return m.ang < 0.24 && m.dist < 3.6 && m.cover > 0.5;
    return m.ang < 0.16 && m.dist < 2.6 && m.cover > 0.58;
  }

  function bestSegment(a, b, targets, angMax, distMax) {
    let best = null;
    for (let i = 0; i < targets.length; i++) {
      const c = targets[i][0], d = targets[i][1];
      const m = matchSegment(a, b, c, d);
      if (m.ang < angMax && m.dist < distMax) {
        const score = m.ang * 28 + m.dist;
        if (!best || score < best.score) best = { i: i, m: m, c: c, d: d, score: score };
      }
    }
    return best;
  }

  function wrapPi(d) {
    let x = d;
    while (x > Math.PI) x -= Math.PI * 2;
    while (x < -Math.PI) x += Math.PI * 2;
    return x;
  }

  function magnetBar(a, b, targets) {
    const best = bestSegment(a, b, targets, 0.42, 8.5);
    if (!best) return { a: a, b: b, hot: false, index: -1, m: null };
    const pull = 0.48;
    const pa = projectPointToLine(a, best.c, best.d);
    const pb = projectPointToLine(b, best.c, best.d);
    const na = pt(lerp(a.x, pa.x, pull), lerp(a.y, pa.y, pull));
    const nb = pt(lerp(b.x, pb.x, pull), lerp(b.y, pb.y, pull));
    return {
      a: na,
      b: nb,
      hot: seatMatch(matchSegment(na, nb, best.c, best.d), false),
      index: best.i,
      m: best.m
    };
  }

  /* Ease a bar the player is already swinging toward a face.
     The pivot end stays put, so a nearby parallel face cannot
     yank the straightedge back while a finger rotates the other end. */
  function pivotAssist(a, b, prevA, prevB, targets) {
    const moveA = dist(a, prevA);
    const moveB = dist(b, prevB);
    const moving = moveA >= moveB ? 'a' : 'b';
    const pivot = moving === 'a' ? b : a;
    const prevMoving = moving === 'a' ? prevA : prevB;
    const nowMoving = moving === 'a' ? a : b;
    const prevAng = Math.atan2(prevMoving.y - pivot.y, prevMoving.x - pivot.x);
    const nowAng = Math.atan2(nowMoving.y - pivot.y, nowMoving.x - pivot.x);
    const userDelta = wrapPi(nowAng - prevAng);
    let best = null;
    for (let i = 0; i < targets.length; i++) {
      const c = targets[i][0], d = targets[i][1];
      const m = matchSegment(a, b, c, d);
      const segAng = Math.atan2(d.y - c.y, d.x - c.x);
      let need = wrapPi(segAng - nowAng);
      if (need > Math.PI / 2) need -= Math.PI;
      if (need < -Math.PI / 2) need += Math.PI;
      const toward = Math.abs(need) < 0.18 || (userDelta * need > 0 && Math.abs(need) < 0.62);
      if (!toward) continue;
      if (m.dist > 12 && Math.abs(need) > 0.22) continue;
      const score = Math.abs(need) * 20 + m.dist * 0.2;
      if (!best || score < best.score) best = { need: need, m: m, c: c, d: d, i: i };
    }
    if (!best) return { a: a, b: b, hot: false, index: -1, m: null };
    const cap = Math.max(0.012, Math.abs(userDelta) * 1.4);
    let ease = best.need * 0.55;
    if (Math.abs(ease) > cap) ease = cap * Math.sign(best.need);
    const cs = Math.cos(ease), sn = Math.sin(ease);
    const v = moving === 'a' ? sub(a, pivot) : sub(b, pivot);
    const r = pt(v.x * cs - v.y * sn, v.x * sn + v.y * cs);
    const na = moving === 'a' ? add(pivot, r) : a;
    const nb = moving === 'b' ? add(pivot, r) : b;
    const after = matchSegment(na, nb, best.c, best.d);
    return { a: na, b: nb, hot: seatMatch(after, false), index: best.i, m: after };
  }

  function tryLockTrace(level, mark, loose) {
    const locked = mark.locked;
    let best = null;
    for (let i = 0; i < level.segments.length; i++) {
      if (locked[i]) continue;
      const seg = level.segments[i];
      const m = matchSegment(mark.a, mark.b, seg[0], seg[1]);
      if (seatMatch(m, loose)) {
        if (!best || m.dist < best.m.dist) best = { i: i, m: m, seg: seg };
      }
    }
    if (!best) return null;
    locked[best.i] = true;
    const c = best.seg[0], d = best.seg[1];
    const dir = norm(sub(d, c));
    const mid = pt((c.x + d.x) / 2, (c.y + d.y) / 2);
    const half = Math.max(dist(c, d) * 0.72, 12);
    mark.a = pt(mid.x - dir.x * half, mid.y - dir.y * half);
    mark.b = pt(mid.x + dir.x * half, mid.y + dir.y * half);
    return best.i;
  }

  function fillWasher(mark, t0, t1, bins) {
    const n = bins.length;
    const a = clamp(t0, 0, 1);
    const b = clamp(t1, 0, 1);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const i0 = clamp(Math.floor(lo * (n - 1)), 0, n - 1);
    const i1 = clamp(Math.ceil(hi * (n - 1)), 0, n - 1);
    for (let i = i0; i <= i1; i++) bins[i] = true;
    mark.seen = true;
  }

  const PF = {
    levels: levels,
    clamp: clamp,
    lerp: lerp,
    dist: dist,
    pt: pt,
    add: add,
    sub: sub,
    mul: mul,
    norm: norm,
    len: len,
    resample: resample,
    pointAt: pointAt,
    avgDist: avgDist,
    pointInPoly: pointInPoly,
    signedArea: signedArea,
    polyFromCut: polyFromCut,
    wastePoly: wastePoly,
    starsFor: starsFor,
    titleFor: titleFor,
    evaluate: evaluate,
    blankMark: blankMark,
    perfectMark: perfectMark,
    closestOnPoly: closestOnPoly,
    matchSegment: matchSegment,
    magnetBar: magnetBar,
    pivotAssist: pivotAssist,
    seatMatch: seatMatch,
    tryLockTrace: tryLockTrace,
    fillWasher: fillWasher,
    lineIntersect: lineIntersect,
    angDiff: angDiff
  };

  root.PF = PF;
  if (typeof module !== 'undefined' && module.exports) module.exports = PF;

  function runTests() {
    let failed = 0;
    function assert(cond, msg) {
      if (!cond) {
        failed++;
        console.error('FAIL', msg);
      }
    }
    levels.forEach(function (level) {
      const blank = blankMark(level);
      const start = evaluate(level, blank);
      assert(start.fit < 35, level.id + ' blank fit should be low, got ' + start.fit.toFixed(1));
      assert(Math.abs(signedArea(start.poly)) > 20, level.id + ' blank poly area');
      const perfect = perfectMark(level);
      const done = evaluate(level, perfect);
      assert(done.fit > 99, level.id + ' perfect fit ' + done.fit.toFixed(2));
      assert(done.stars === 3, level.id + ' perfect stars');
      assert(Math.abs(signedArea(done.poly)) > 20, level.id + ' perfect area');
      const stock = polyFromCut(level.rough, level.mode, level.far);
      const samples = resample(level.ideal, 18);
      samples.forEach(function (p, idx) {
        assert(pointInPoly(p, stock), level.id + ' ideal sample ' + idx + ' outside stock ' + JSON.stringify(p));
      });
      const work = done.poly;
      level.fixed.forEach(function (piece, pi) {
        if (piece.decor) return;
        let overlap = 0;
        for (let y = 30; y <= 124; y += 2) {
          for (let x = 4; x <= 98; x += 2) {
            const p = pt(x + 0.3, y + 0.3);
            if (!pointInPoly(p, work) || !pointInPoly(p, piece.poly)) continue;
            let near = false;
            const edge = level.mating;
            for (let i = 0; i < edge.length - 1; i++) {
              if (pointSegDist(p, edge[i], edge[i + 1]) < 1.4) near = true;
            }
            if (!near) overlap++;
          }
        }
        assert(overlap === 0, level.id + ' overlaps fixed[' + pi + '] at ' + overlap + ' samples');
      });
      if (level.slide) {
        const seatedEdge = level.ideal.map(function (p) { return add(p, level.slide); });
        const gap = avgDist(seatedEdge, level.mating);
        assert(gap < 0.15, level.id + ' slide does not land on mating, gap ' + gap.toFixed(3));
        const seatedPoly = done.poly.map(function (p) { return add(p, level.slide); });
        level.fixed.forEach(function (piece, pi) {
          if (piece.decor) return;
          let overlap = 0;
          for (let y = 30; y <= 124; y += 2) {
            for (let x = 4; x <= 98; x += 2) {
              const p = pt(x + 0.3, y + 0.3);
              if (!pointInPoly(p, seatedPoly) || !pointInPoly(p, piece.poly)) continue;
              let near = false;
              const edge = level.mating;
              for (let i = 0; i < edge.length - 1; i++) {
                if (pointSegDist(p, edge[i], edge[i + 1]) < 1.6) near = true;
              }
              if (!near) overlap++;
            }
          }
          assert(overlap === 0, level.id + ' seated overlaps fixed[' + pi + '] at ' + overlap);
        });
      }
    });

    const butt = levels[0];
    const off = { type: 'square', x: butt.square.idealX + 4, seated: false };
    const mid = evaluate(butt, off);
    assert(mid.fit > 60 && mid.fit < 96, 'butt +4 fit band ' + mid.fit.toFixed(1));

    const curve = levels[2];
    const halfBins = curve.ideal && blankMark(curve);
    for (let i = 0; i < halfBins.bins.length; i++) halfBins.bins[i] = i < halfBins.bins.length * 0.5;
    const half = evaluate(curve, halfBins);
    assert(half.fit > 25 && half.fit < 80, 'curve half coverage fit ' + half.fit.toFixed(1));

    const step = levels[3];
    const one = blankMark(step);
    one.locked[0] = true;
    const partial = evaluate(step, one);
    const none = evaluate(step, blankMark(step));
    assert(partial.fit > none.fit, 'locking a face should improve fit ' + partial.fit + ' vs ' + none.fit);

    step.segments.forEach(function (seg, i) {
      const mark = blankMark(step);
      const c = seg[0], d = seg[1];
      const dir = norm(sub(d, c));
      const nrm = pt(-dir.y, dir.x);
      const mid = pt((c.x + d.x) / 2, (c.y + d.y) / 2);
      const tilt = 0.1;
      const cs = Math.cos(tilt), sn = Math.sin(tilt);
      const rdx = dir.x * cs - dir.y * sn;
      const rdy = dir.x * sn + dir.y * cs;
      const half = Math.max(dist(c, d) * 0.7, 12);
      mark.a = pt(mid.x + nrm.x * 1.1 - rdx * half, mid.y + nrm.y * 1.1 - rdy * half);
      mark.b = pt(mid.x + nrm.x * 1.1 + rdx * half, mid.y + nrm.y * 1.1 + rdy * half);
      const hit = tryLockTrace(step, mark, false);
      assert(hit === i, 'near bar locks step face ' + i + ' got ' + hit);
    });
    const wild = blankMark(step);
    assert(tryLockTrace(step, wild, true) == null, 'a bar left in the open does not lock a face');

    const corner = levels[1];
    const cm = blankMark(corner);
    const ideal = corner.ideal;
    const want = Math.atan2(ideal[1].y - ideal[0].y, ideal[1].x - ideal[0].x);
    for (let n = 0; n < 48; n++) {
      const prevA = pt(cm.a.x, cm.a.y);
      const prevB = pt(cm.b.x, cm.b.y);
      const v = sub(cm.b, cm.a);
      const ang = Math.atan2(v.y, v.x);
      let delta = wrapPi(want - ang);
      if (Math.abs(delta) > Math.PI / 2) delta = wrapPi(delta - Math.PI);
      const stepAng = clamp(delta, -0.06, 0.06);
      const cs = Math.cos(stepAng), sn = Math.sin(stepAng);
      cm.b = add(cm.a, pt(v.x * cs - v.y * sn, v.x * sn + v.y * cs));
      const assisted = pivotAssist(cm.a, cm.b, prevA, prevB, [ideal]);
      cm.a = assisted.a;
      cm.b = assisted.b;
    }
    for (let n = 0; n < 24; n++) {
      const mag = magnetBar(cm.a, cm.b, [ideal]);
      cm.a = mag.a;
      cm.b = mag.b;
    }
    const seated = seatMatch(matchSegment(cm.a, cm.b, ideal[0], ideal[1]), false);
    assert(seated, 'corner rotate-then-slide seats, ang ' +
      matchSegment(cm.a, cm.b, ideal[0], ideal[1]).ang.toFixed(3) +
      ' dist ' + matchSegment(cm.a, cm.b, ideal[0], ideal[1]).dist.toFixed(2));

    const away = blankMark(step);
    const before = angDiff(away.a, away.b, step.segments[0][0], step.segments[0][1]);
    const nudgedB = pt(away.b.x + 1.2, away.b.y - 0.05);
    const stayed = pivotAssist(away.a, nudgedB, away.a, away.b, step.segments);
    const after = angDiff(stayed.a, stayed.b, step.segments[0][0], step.segments[0][1]);
    assert(after > before - 0.02, 'pivot assist does not twist a bar toward a face it is leaving');

    if (failed) {
      console.error(failed + ' failed');
      process.exit(1);
    }
    console.log('ok ' + levels.length + ' levels');
    levels.forEach(function (level) {
      const b = evaluate(level, blankMark(level));
      console.log(
        level.id,
        'base', level.base.toFixed(2),
        'blank', b.fit.toFixed(1),
        'segs', level.segments.length,
        'tool', level.tool
      );
    });
  }

  if (typeof require !== 'undefined' && require.main === module) runTests();
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Perfect Fit — tool steps, geometry, and scoring. No DOM.
   Run `node engine.js` to check every level. */
(function (root) {
  'use strict';

  var VIEW = { w: 120, h: 168 };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pt(x, y) { return { x: x, y: y }; }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
  function mul(a, s) { return { x: a.x * s, y: a.y * s }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function cross(a, b) { return a.x * b.y - a.y * b.x; }
  function len(a) { return Math.hypot(a.x, a.y); }
  function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
  function norm(a) {
    var L = len(a) || 1;
    return { x: a.x / L, y: a.y / L };
  }
  function angNorm(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function angDiff(a, b) { return Math.abs(angNorm(a - b)); }
  /* Undirected line: 30° and 210° are the same cut. */
  function lineDiff(a, b) {
    var d = Math.abs(angNorm(a - b)) % Math.PI;
    if (d > Math.PI / 2) d = Math.PI - d;
    return d;
  }

  function pointSegDist(p, a, b) {
    var ab = sub(b, a);
    var L2 = dot(ab, ab) || 1;
    var t = clamp(dot(sub(p, a), ab) / L2, 0, 1);
    return { dist: dist(p, pt(a.x + ab.x * t, a.y + ab.y * t)), point: pt(a.x + ab.x * t, a.y + ab.y * t), t: t };
  }

  function pointLineDist(p, a, b) {
    var ab = sub(b, a);
    var L = len(ab) || 1;
    return Math.abs(cross(sub(p, a), ab)) / L;
  }

  function lineIntersect(p, p2, q, q2) {
    var r = sub(p2, p);
    var s = sub(q2, q);
    var den = cross(r, s);
    if (Math.abs(den) < 1e-9) return null;
    var t = cross(sub(q, p), s) / den;
    var u = cross(sub(q, p), r) / den;
    return { t: t, u: u, point: add(p, mul(r, t)) };
  }

  function closestOnPoly(p, poly) {
    var best = { dist: Infinity, point: poly[0], t: 0, i: 0 };
    var walked = 0;
    var total = 0;
    var i;
    for (i = 0; i < poly.length - 1; i++) total += dist(poly[i], poly[i + 1]);
    total = total || 1;
    walked = 0;
    for (i = 0; i < poly.length - 1; i++) {
      var a = poly[i];
      var b = poly[i + 1];
      var hit = pointSegDist(p, a, b);
      if (hit.dist < best.dist) {
        best = { dist: hit.dist, point: hit.point, t: (walked + dist(a, b) * hit.t) / total, i: i };
      }
      walked += dist(a, b);
    }
    return best;
  }

  function pointInPoly(p, poly) {
    var inside = false;
    var j = poly.length - 1;
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i];
      var b = poly[j];
      if (((a.y > p.y) !== (b.y > p.y)) &&
          (p.x < (b.x - a.x) * (p.y - a.y) / ((b.y - a.y) || 1e-9) + a.x)) inside = !inside;
      j = i;
    }
    return inside;
  }

  function rotAround(p, c, ang) {
    var s = Math.sin(ang);
    var co = Math.cos(ang);
    var dx = p.x - c.x;
    var dy = p.y - c.y;
    return pt(c.x + dx * co - dy * s, c.y + dx * s + dy * co);
  }

  function rayCircleTs(P, dir, C, R) {
    var f = sub(P, C);
    var d = dot(dir, f);
    var disc = d * d - dot(f, f) + R * R;
    if (disc < 1e-8) return disc < -1e-6 ? [] : [-d];
    var s = Math.sqrt(disc);
    return [-d - s, -d + s];
  }

  function circleCircle(A, Ra, B, Rb) {
    var d = dist(A, B);
    if (d < 1e-6 || d > Ra + Rb + 1e-6 || d < Math.abs(Ra - Rb) - 1e-6) return [];
    var a = (Ra * Ra - Rb * Rb + d * d) / (2 * d);
    var h2 = Ra * Ra - a * a;
    var h = Math.sqrt(Math.max(0, h2));
    var dir = norm(sub(B, A));
    var mid = add(A, mul(dir, a));
    var n = pt(-dir.y, dir.x);
    return [add(mid, mul(n, h)), add(mid, mul(n, -h))];
  }

  function segCircle(a, b, C, R) {
    var ab = sub(b, a);
    var L = len(ab);
    if (L < 1e-6) return [];
    var dir = mul(ab, 1 / L);
    var ts = rayCircleTs(a, dir, C, R);
    var out = [];
    for (var i = 0; i < ts.length; i++) {
      if (ts[i] >= -1e-4 && ts[i] <= L + 1e-4) out.push(add(a, mul(dir, clamp(ts[i], 0, L))));
    }
    return out;
  }

  function rayRectT(origin, dir, rect) {
    var min = { x: rect.x, y: rect.y };
    var max = { x: rect.x + rect.w, y: rect.y + rect.h };
    var tMin = 0;
    var tMax = 1e9;
    var axes = ['x', 'y'];
    for (var k = 0; k < 2; k++) {
      var axis = axes[k];
      if (Math.abs(dir[axis]) < 1e-9) {
        if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      } else {
        var t1 = (min[axis] - origin[axis]) / dir[axis];
        var t2 = (max[axis] - origin[axis]) / dir[axis];
        if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) return null;
      }
    }
    if (tMin > 0.4) return tMin;
    return null;
  }

  function mean(xs) {
    if (!xs.length) return 0;
    var s = 0;
    for (var i = 0; i < xs.length; i++) s += xs[i];
    return s / xs.length;
  }

  function bevelPenalty(angle) {
    if (angle >= 0.09 && angle <= 0.42) return 0;
    if (angle < 0.09) return (0.09 - Math.max(angle, -0.35)) * 8;
    return Math.min(2.5, (angle - 0.42) * 4);
  }

  /* Cross-section for a back-bevel. Its own box, never drawn over the work. */
  var SECTION = { w: 160, h: 108 };
  var SEC_WALL = 36;
  var SEC_FACE = 64;
  var SEC_THICK = 28;

  function bevelWords(angle, kind) {
    var low = angle < 0.09;
    var high = angle > 0.42;
    if (kind === 'cope') {
      if (low) return 'The back is hitting the other piece.';
      if (high) return 'The face is tipping off.';
      return 'Only the face meets the other piece.';
    }
    if (low) return 'The back is touching the wall.';
    if (high) return 'The face is tipping off the wall.';
    return 'Only the front edge meets the wall.';
  }

  function bevelGeom(angle) {
    var a = clamp(angle, -0.5, 0.7);
    var retreat = a > 0.42 ? (a - 0.42) * 36 : 0;
    var pivot = pt(SEC_WALL + retreat, SEC_FACE);
    var inset = Math.tan(clamp(a, -0.48, 0.62)) * SEC_THICK;
    var back = pt(pivot.x + inset, SEC_FACE - SEC_THICK);
    var dir = norm(sub(back, pivot));
    if (Math.hypot(back.x - pivot.x, back.y - pivot.y) < 0.4) dir = pt(Math.sin(a), -Math.cos(a));
    var handle = add(pivot, mul(dir, 50));
    return { angle: a, pivot: pivot, back: back, handle: handle, dir: dir };
  }

  function bevelFromFinger(x, y, guess) {
    var a = guess || 0;
    var i;
    for (i = 0; i < 4; i++) {
      var g = bevelGeom(a);
      var dx = x - g.pivot.x;
      var dy = y - g.pivot.y;
      if (dy > -6) dy = -6;
      a = clamp(Math.atan(-dx / dy), -0.35, 0.75);
    }
    return a;
  }

  function bevelHandleHit(angle, p) {
    var g = bevelGeom(angle);
    if (dist(p, g.handle) < 16) return true;
    if (pointSegDist(p, g.pivot, g.handle).dist < 8) return true;
    return false;
  }

  function dragBevel(run, ev) {
    if (!ev.section) return;
    var s = run.s;
    if (ev.type === 'down') {
      if (bevelHandleHit(s.bevel, ev)) run.drag = { mode: 'saw', ang: s.bevel };
    } else if (ev.type === 'move' && run.drag && run.drag.mode === 'saw') {
      s.bevel = bevelFromFinger(ev.x, ev.y, s.bevel);
    } else if (ev.type === 'up') run.drag = null;
  }

  function arcArrow(c, r, a1) {
    var ax = c.x + Math.cos(a1) * r;
    var ay = c.y + Math.sin(a1) * r;
    var tx = Math.cos(a1 + Math.PI / 2);
    var ty = Math.sin(a1 + Math.PI / 2);
    var nx = Math.cos(a1);
    var ny = Math.sin(a1);
    return {
      op: 'poly',
      pts: [
        pt(ax + tx * 4.6, ay + ty * 4.6),
        pt(ax - tx * 3.6 + nx * 2.1, ay - ty * 3.6 + ny * 2.1),
        pt(ax - tx * 3.6 - nx * 2.1, ay - ty * 3.6 - ny * 2.1)
      ],
      fill: '#c4923a',
      stroke: '',
      sw: 0
    };
  }

  function bevelSectionItems(angle, kind) {
    var g = bevelGeom(angle);
    var words = bevelWords(angle, kind);
    var good = angle >= 0.09 && angle <= 0.42;
    var items = [];
    items.push({ op: 'rect', x: 0, y: 0, w: SECTION.w, h: SECTION.h, fill: '#f4efe4', stroke: '', sw: 0 });
    var face = g.pivot;
    var back = g.back;
    items.push({ op: 'poly', pts: [face, back, pt(148, back.y), pt(148, face.y)], fill: '#e4c48a', stroke: '#8a6434', sw: 1.1 });
    items.push({ op: 'rect', x: 8, y: 10, w: SEC_WALL - 8, h: 76, fill: kind === 'cope' ? '#d7b48a' : '#9a9188', stroke: '#5c564f', sw: 1 });
    items.push({ op: 'text', t: kind === 'cope' ? 'piece' : 'wall', x: 9, y: 20, size: 14, color: '#2a241c' });
    items.push({ op: 'text', t: 'back', x: Math.min(118, (back.x + 148) / 2), y: back.y - 5, size: 14, color: '#5c564f', align: 'center' });
    items.push({ op: 'text', t: 'face', x: Math.min(118, (face.x + 148) / 2), y: face.y + 7, size: 14, color: '#5c564f', align: 'center' });
    var arcC = pt(SEC_WALL, SEC_FACE);
    var arcR = 50;
    var a0 = -Math.PI / 2 - 0.2;
    var a1 = -Math.PI / 2 + 0.95;
    items.push({ op: 'arc', c: arcC, r: arcR, a0: a0, a1: a1, stroke: '#c4923a', sw: 2.6 });
    items.push(arcArrow(arcC, arcR, a1));
    items.push({ op: 'line', a: g.pivot, b: g.handle, stroke: '#2e3844', sw: 3.4 });
    items.push({ op: 'grip', c: g.handle, r: 8.2, label: 'saw', lx: 12, ly: -2, labelSize: 7.5 });
    items.push({ op: 'note', t: words, x: SECTION.w / 2, y: 98, size: 7.6, color: good ? '#2f6b3a' : '#8a4038', align: 'center' });
    return { items: items, handle: g.handle, pivot: g.pivot };
  }

  function bevelStepScene(level, run, kind) {
    var view = viewOf(level, run);
    var step = level.steps[Math.min(view.step, level.steps.length - 1)];
    if (!step || step.id !== 'bevel') return null;
    if (run.phase !== 'play' && run.replay == null) return null;
    var built = bevelSectionItems(view.s.bevel, kind);
    return { w: SECTION.w, h: SECTION.h, items: built.items, handle: built.handle };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function layoutBox(box, cssW, cssH) {
    var s = Math.min(cssW / box.w, cssH / box.h);
    return {
      s: s,
      ox: (cssW - box.w * s) / 2,
      oy: (cssH - box.h * s) / 2,
      w: box.w,
      h: box.h
    };
  }

  function layout(cssW, cssH) {
    return layoutBox(VIEW, cssW, cssH);
  }

  function paper() {
    return { op: 'rect', x: 4, y: 4, w: 112, h: 160, fill: '#f4efe4', stroke: '#e4dccb', sw: 1 };
  }

  function completeStep(level, run, deviation, note) {
    if (run.phase !== 'play') return;
    var step = level.steps[run.step];
    var dev = Math.abs(deviation) || 0;
    run.log.push({
      label: step.label,
      id: step.id,
      step: run.step,
      deviation: dev,
      note: dev >= 0.35 ? (note || '') : '',
      s: clone(run.s)
    });
    run.step += 1;
    run.drag = null;
    if (run.step >= level.steps.length) finish(level, run);
  }

  function finish(level, run) {
    var gap = level.measure(run);
    if (!isFinite(gap) || gap < 0) gap = 0;
    var hints = run.hints;
    var tries = run.tries;
    var fumbles = Math.min(run.fumbles, 8);
    var clean = hints === 0 && tries === 1 && fumbles === 0 && gap < 0.35;
    var score = Math.max(0, gap + hints * 1.35 + (tries - 1) * 1.1 + fumbles * 0.2 - (clean ? 0.25 : 0));
    var stars = score <= 0.45 ? 3 : score <= 1.7 ? 2 : score <= 4.2 ? 1 : 0;
    stars = Math.min(stars, Math.max(0, 3 - hints));
    var title = gap <= 0.45 ? 'Hairline' : gap <= 1.6 ? 'Tight' : gap <= 3.5 ? 'Fair' : gap <= 7 ? 'Open' : 'Proud';
    var blame = null;
    for (var i = 0; i < run.log.length; i++) {
      if (!blame || run.log[i].deviation > blame.deviation) blame = run.log[i];
    }
    var replay = !blame || blame.deviation < 0.35
      ? 'Every step held the line.'
      : blame.label + ' opened the gap. ' + (blame.note || '');
    run.phase = 'result';
    run.result = {
      gap: gap,
      score: score,
      stars: stars,
      title: title,
      replay: replay,
      blame: blame ? blame.step : -1
    };
  }

  function fresh(level, seed) {
    return {
      step: 0,
      tries: 1,
      hints: 0,
      fumbles: 0,
      phase: 'play',
      log: [],
      result: null,
      drag: null,
      replay: null,
      s: seed
    };
  }

  function stepId(level, run) {
    if (run.step < 0 || run.step >= level.steps.length) return '';
    return level.steps[run.step].id;
  }

  function hud(level, run) {
    var idx = -1;
    var i;
    for (i = 0; i < levels.length; i++) if (levels[i].id === level.id) idx = i;
    var cur = level.steps[Math.min(run.step, level.steps.length - 1)];
    var action = run.phase === 'play' && level.actionFor ? level.actionFor(run) : null;
    var steps = level.steps.map(function (s, n) {
      var state = n < run.step ? 'done' : n === run.step && run.phase === 'play' ? 'now' : 'todo';
      var bad = false;
      for (var k = 0; k < run.log.length; k++) {
        if (run.log[k].step === n && run.log[k].deviation >= 0.35) bad = true;
      }
      if (bad && state === 'done') state = 'bad';
      return { label: s.label, state: state };
    });
    return {
      title: level.name,
      technique: level.technique,
      kicker: (idx + 1) + ' / ' + levels.length + (level.hard ? ' · Hard' : ''),
      geometry: level.geometry,
      instruction: level.instruct ? level.instruct(run) : (run.phase === 'play' ? cur.instruction : ''),
      action: action,
      seat: level.seatText ? level.seatText(run) : '',
      steps: steps
    };
  }

  function viewOf(level, run) {
    if (run.replay != null && run.log[run.replay]) {
      return { step: run.log[run.replay].step, s: run.log[run.replay].s, phase: 'play', log: run.log };
    }
    return run;
  }

  /* ---------- butt joint ---------- */

  function buttSquareHits(s, p) {
    var dir = pt(Math.cos(s.ang), Math.sin(s.ang));
    var stockDir = pt(Math.cos(s.ang - Math.PI / 2), Math.sin(s.ang - Math.PI / 2));
    var tip = add(pt(s.x, s.y), mul(dir, 34));
    var tail = add(pt(s.x, s.y), mul(stockDir, 30));
    if (dist(p, pt(s.x, s.y)) < 10) return 'corner';
    if (dist(p, tip) < 14) return 'tip';
    if (pointSegDist(p, pt(s.x, s.y), tip).dist < 7) return 'blade';
    if (dist(p, tail) < 12) return 'stock';
    if (pointSegDist(p, pt(s.x, s.y), tail).dist < 7) return 'stock';
    return '';
  }

  function buttTrySeat(level, s) {
    var bladeDown = angDiff(s.ang, Math.PI / 2) < 0.32;
    var bladeUp = angDiff(s.ang, -Math.PI / 2) < 0.32;
    if (bladeDown && Math.abs(s.y - level.top) < 8 && s.x > level.rough - 6 && s.x < level.right + 4) {
      s.y = level.top;
      s.ang = Math.PI / 2;
      s.x = clamp(s.x, level.rough + 2, level.right - 2);
      s.seated = 'top';
      return;
    }
    if (bladeUp && Math.abs(s.y - level.bot) < 8 && s.x > level.rough - 6 && s.x < level.right + 4) {
      s.y = level.bot;
      s.ang = -Math.PI / 2;
      s.x = clamp(s.x, level.rough + 2, level.right - 2);
      s.seated = 'bot';
      return;
    }
    s.seated = null;
  }

  function buttKnife(level, s) {
    if (s.seated) {
      return { x0: s.x, y0: level.top, x1: s.x, y1: level.bot, seated: true };
    }
    var dir = pt(Math.cos(s.ang), Math.sin(s.ang));
    if (Math.abs(dir.y) < 0.25) {
      return { x0: s.x, y0: level.top, x1: s.x + 30, y1: level.bot, seated: false };
    }
    var t0 = (level.top - s.y) / dir.y;
    var t1 = (level.bot - s.y) / dir.y;
    return {
      x0: s.x + dir.x * t0,
      y0: level.top,
      x1: s.x + dir.x * t1,
      y1: level.bot,
      seated: false
    };
  }

  function buttGap(level, line) {
    if (!line) return 18;
    return (Math.abs(line.x0 - level.jointX) + Math.abs(line.x1 - level.jointX)) / 2;
  }

  function buildButt() {
    var level = {
      id: 'butt',
      name: 'Butt Joint',
      technique: 'Square knife line',
      geometry: 'The blade stays square to whatever edge the stock is seated on. Nothing pulls it onto the joint.',
      blurb: 'Tutorial. Seat the square, slide the blade, knife the line.',
      hard: false,
      tutorial: [
        'Nothing in this shop snaps to the answer. A tool seats only on a real edge.',
        'Seat the square’s stock on the long edge. The blade stays square because the stock is seated — not because the joint is magnetic.',
        'Slide to the other board’s end and knife it. Then cut. A restart puts you back on step one.'
      ],
      jointX: 50,
      top: 74,
      bot: 126,
      rough: 30,
      right: 110,
      mateL: 8,
      mateTop: 66,
      mateBot: 134,
      steps: [
        { id: 'pick', label: 'Pick', instruction: 'Pick up the square by the stock or the blade handle.' },
        { id: 'seat', label: 'Seat', instruction: 'Drag the stock onto a long edge of the board.' },
        { id: 'knife', label: 'Knife', instruction: 'Drag the blade to the other board’s end, then knife the line.' },
        { id: 'cut', label: 'Cut', instruction: 'Cut the knife line.' }
      ]
    };

    level.create = function () {
      return fresh(level, {
        picked: false,
        x: 78,
        y: 40,
        ang: Math.PI / 2,
        seated: null,
        knife: null
      });
    };

    level.pointer = function (run, ev) {
      if (run.phase !== 'play') return;
      var s = run.s;
      var id = stepId(level, run);
      if (id === 'pick') {
        if (ev.type === 'down' && buttSquareHits(s, ev)) {
          s.picked = true;
          completeStep(level, run, 0, '');
        } else if (ev.type === 'down') run.fumbles += 1;
        return;
      }
      if (!s.picked) return;
      if (ev.type === 'down') {
        var hit = buttSquareHits(s, ev);
        if (!hit) return;
        run.drag = { mode: hit === 'tip' ? 'rot' : 'move', x: s.x, y: s.y, ang: s.ang, px: ev.x, py: ev.y };
        return;
      }
      if (!run.drag) return;
      if (ev.type === 'move') {
        if (run.drag.mode === 'rot') {
          s.ang = Math.atan2(ev.y - s.y, ev.x - s.x);
          s.seated = null;
        } else {
          s.x = run.drag.x + (ev.x - run.drag.px);
          s.y = run.drag.y + (ev.y - run.drag.py);
          buttTrySeat(level, s);
        }
        return;
      }
      if (ev.type === 'up') {
        var was = run.drag;
        run.drag = null;
        if (!was) return;
        if (id === 'seat') {
          if (s.seated) completeStep(level, run, 0, '');
          else run.fumbles += 1;
        }
      }
    };

    level.actionFor = function (run) {
      var id = stepId(level, run);
      if (id === 'knife') return { label: 'Knife the line', enabled: true };
      if (id === 'cut') return { label: 'Cut', enabled: !!run.s.knife };
      return null;
    };

    level.seatText = function (run) {
      if (run.s.seated) return 'Stock seated on the edge';
      return '';
    };

    level.onAction = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'knife') {
        s.knife = buttKnife(level, s);
        var gap = buttGap(level, s.knife);
        var note = '';
        if (!s.knife.seated) note = 'The stock was off the edge, so the knife line was not square.';
        else if (s.knife.x0 < level.jointX - 0.35) note = 'The blade stopped short of the other board.';
        else if (s.knife.x0 > level.jointX + 0.35) note = 'The blade went past the other board.';
        completeStep(level, run, gap, note);
        return;
      }
      if (id === 'cut' && s.knife) completeStep(level, run, 0, '');
    };

    level.hint = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'pick') {
        s.picked = true;
        completeStep(level, run, 0, '');
      } else if (id === 'seat') {
        s.picked = true;
        s.x = 86;
        s.y = level.top;
        s.ang = Math.PI / 2;
        s.seated = 'top';
        completeStep(level, run, 0, '');
      } else if (id === 'knife') {
        s.x = level.jointX;
        s.y = level.top;
        s.ang = Math.PI / 2;
        s.seated = 'top';
        s.knife = buttKnife(level, s);
        completeStep(level, run, 0, '');
      } else if (id === 'cut') {
        completeStep(level, run, 0, '');
      }
    };

    level.measure = function (run) { return buttGap(level, run.s.knife); };

    level.scene = function (run) {
      var view = viewOf(level, run);
      var s = view.s;
      var items = [paper()];
      items.push({ op: 'rect', x: level.mateL, y: level.mateTop, w: level.jointX - level.mateL, h: level.mateBot - level.mateTop, fill: '#7a4b2d', stroke: '#4a2c18', sw: 1 });
      var cutX = s.knife ? s.knife.x0 : level.rough;
      var showCut = run.phase === 'result' && run.replay == null && s.knife;
      var boardL = showCut ? s.knife.x0 : level.rough;
      items.push({ op: 'rect', x: boardL, y: level.top, w: level.right - boardL, h: level.bot - level.top, fill: '#e4c48a', stroke: '#8a6434', sw: 1 });
      items.push({ op: 'line', a: pt(level.jointX, level.mateTop), b: pt(level.jointX, level.mateBot), stroke: '#4a2c18', sw: 1.4 });
      if (s.knife && (showCut || view.step >= 3 || s.knife)) {
        items.push({ op: 'line', a: pt(s.knife.x0, s.knife.y0), b: pt(s.knife.x1, s.knife.y1), stroke: '#241c14', sw: 1.6 });
      }
      if (showCut && s.knife) {
        var gapL = Math.min(s.knife.x0, level.jointX);
        var gapR = Math.max(s.knife.x0, level.jointX);
        if (gapR - gapL > 0.3) {
          items.push({ op: 'rect', x: gapL, y: level.top, w: gapR - gapL, h: level.bot - level.top, fill: 'rgba(231,76,60,0.35)', stroke: '', sw: 0 });
        }
      }
      if (run.phase === 'play' || run.replay != null) {
        if (view.step < 3) {
          items.push({ op: 'square', x: s.x, y: s.y, ang: s.ang, hot: !!s.seated, tipLabel: 'blade', stockLabel: 'stock' });
        }
      }
      return { items: items };
    };
    return level;
  }

  /* ---------- compass scribe (wavy wall + stone) ---------- */

  function wallSamples(fn, y0, y1, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var y = y0 + (y1 - y0) * t;
      pts.push({ t: t, x: fn(t), y: y });
    }
    return pts;
  }

  function wallAt(wall, y, y0, y1) {
    var t = clamp((y - y0) / (y1 - y0), 0, 1);
    var f = t * (wall.length - 1);
    var i = clamp(Math.floor(f), 0, wall.length - 2);
    var u = f - i;
    return lerp(wall[i].x, wall[i + 1].x, u);
  }

  function compassPencil(point, span, tilt) {
    return pt(point.x + Math.cos(tilt) * span, point.y + Math.sin(tilt) * span);
  }

  function panelCorners(cfg, angle) {
    var cx = (cfg.frontX + cfg.backX) / 2;
    var cy = (cfg.y0 + cfg.y1) / 2;
    var c = pt(cx, cy);
    var raw = [pt(cfg.frontX, cfg.y0), pt(cfg.backX, cfg.y0), pt(cfg.backX, cfg.y1), pt(cfg.frontX, cfg.y1)];
    return raw.map(function (p) { return rotAround(p, c, angle); });
  }

  function frontEdge(cfg, angle) {
    var cs = panelCorners(cfg, angle);
    return [cs[0], cs[3]];
  }

  function hitPanel(cfg, angle, p) {
    return pointInPoly(p, panelCorners(cfg, angle));
  }

  function shimPoint(cfg, angle) {
    var cs = panelCorners(cfg, angle);
    var mid = pt((cs[1].x + cs[2].x) / 2, (cs[1].y + cs[2].y) / 2);
    var c = pt((cfg.frontX + cfg.backX) / 2, (cfg.y0 + cfg.y1) / 2);
    return add(mid, mul(norm(sub(mid, c)), 7));
  }

  function scribeTraceX(cfg, wall, span, tilt, angle, y, wobble) {
    var yS = y - Math.sin(tilt) * span;
    var wx = wallAt(wall, yS, cfg.y0, cfg.y1);
    var mid = (cfg.y0 + cfg.y1) / 2;
    return wx + span * Math.cos(tilt) + angle * (y - mid) + (wobble || 0);
  }

  function cutFromTrace(cfg, traced) {
    if (traced == null || traced < cfg.frontX) return cfg.frontX;
    if (traced > cfg.backX) return cfg.backX;
    return traced;
  }

  function buildScribe(opts) {
    var cfg = opts;
    var wall = wallSamples(cfg.wallFn, cfg.y0, cfg.y1, cfg.n);
    var idealS = 0;
    var idealT = 0;
    wall.forEach(function (p) {
      var g = cfg.frontX - p.x;
      if (g > idealS) { idealS = g; idealT = p.t; }
    });
    var idealPoint = null;
    wall.forEach(function (p) {
      if (Math.abs(p.t - idealT) < 1 / cfg.n / 2) idealPoint = p;
    });

    var level = {
      id: cfg.id,
      name: cfg.name,
      technique: 'Compass scribe',
      geometry: cfg.geometry,
      blurb: cfg.blurb,
      hard: !!cfg.hard,
      tutorial: null,
      cfg: cfg,
      wall: wall,
      idealS: idealS,
      idealT: idealT,
      steps: [
        { id: 'level', label: 'Level', instruction: 'Drag the shim sideways until the bubble sits in the middle.' },
        { id: 'lock', label: 'Lock', instruction: 'Drag the point to the wall and the pencil to the panel, then lock.' },
        { id: 'scribe', label: 'Scribe', instruction: 'Drag down the wall and keep the legs level.' },
        { id: 'bevel', label: 'Back-bevel', instruction: 'Drag the saw to tilt it so only the front edge touches the wall.' },
        { id: 'cut', label: 'Cut', instruction: 'Cut the scribed line.' }
      ]
    };

    function idealAt(y) {
      return wallAt(wall, y, cfg.y0, cfg.y1) + idealS;
    }

    level.create = function () {
      return fresh(level, {
        angle: cfg.angle0,
        span: cfg.span0,
        tilt: cfg.tilt0,
        point: pt(cfg.point0.x, cfg.point0.y),
        locked: false,
        lockedSpan: cfg.span0,
        lockedTilt: cfg.tilt0,
        samples: wall.map(function () { return null; }),
        wobble: wall.map(function () { return 0; }),
        bevel: 0,
        bevelSet: false
      });
    };

    function seats(s) {
      var pencil = compassPencil(s.point, s.span, s.tilt);
      var nearW = closestOnPoly(s.point, wall);
      var edge = frontEdge(cfg, s.angle);
      var nearE = pointSegDist(pencil, edge[0], edge[1]);
      var pointHot = nearW.dist < cfg.seat;
      var pencilHot = nearE.dist < cfg.seat;
      return { pencil: pencil, nearW: nearW, nearE: nearE, pointHot: pointHot, pencilHot: pencilHot };
    }

    function applySeats(s) {
      var info = seats(s);
      if (info.pointHot) {
        var delta = sub(info.nearW.point, s.point);
        s.point = pt(info.nearW.point.x, info.nearW.point.y);
        info = seats(s);
      }
      if (info.pencilHot) {
        var stuck = info.nearE.point;
        s.span = clamp(dist(s.point, stuck), 4, 46);
        s.tilt = Math.atan2(stuck.y - s.point.y, stuck.x - s.point.x);
      }
      return seats(s);
    }

    function hitCompass(s, p) {
      var pencil = compassPencil(s.point, s.span, s.tilt);
      if (dist(p, s.point) < 8) return 'point';
      if (dist(p, pencil) < 8) return 'pencil';
      var mid = pt((s.point.x + pencil.x) / 2, (s.point.y + pencil.y) / 2);
      if (dist(p, mid) < 10) return 'body';
      if (pointSegDist(p, s.point, pencil).dist < 6) return 'body';
      return '';
    }

    level.pointer = function (run, ev) {
      if (run.phase !== 'play') return;
      var s = run.s;
      var id = stepId(level, run);
      if (id === 'level') {
        var shim = shimPoint(cfg, s.angle);
        if (ev.type === 'down' && (dist(ev, shim) < 14 || hitPanel(cfg, s.angle, ev))) {
          run.drag = { mode: 'shim', last: ev.x };
        } else if (ev.type === 'move' && run.drag && run.drag.mode === 'shim') {
          s.angle = clamp(s.angle + (ev.x - run.drag.last) * 0.0045, -0.28, 0.28);
          run.drag.last = ev.x;
        } else if (ev.type === 'up') run.drag = null;
        return;
      }
      if (id === 'lock') {
        if (ev.type === 'down') {
          var hit = hitCompass(s, ev);
          if (!hit) return;
          run.drag = { mode: hit, px: ev.x, py: ev.y, point: pt(s.point.x, s.point.y), span: s.span, tilt: s.tilt };
          return;
        }
        if (ev.type === 'move' && run.drag) {
          if (run.drag.mode === 'pencil') {
            var np = pt(ev.x, ev.y);
            s.span = clamp(dist(s.point, np), 4, 46);
            s.tilt = Math.atan2(np.y - s.point.y, np.x - s.point.x);
          } else if (run.drag.mode === 'point') {
            s.point = pt(run.drag.point.x + (ev.x - run.drag.px), run.drag.point.y + (ev.y - run.drag.py));
          } else {
            s.point = pt(run.drag.point.x + (ev.x - run.drag.px), run.drag.point.y + (ev.y - run.drag.py));
          }
          applySeats(s);
          return;
        }
        if (ev.type === 'up') run.drag = null;
        return;
      }
      if (id === 'scribe') {
        if (ev.type === 'down' || ev.type === 'move') {
          if (ev.type === 'down') run.drag = { mode: 'scribe', last: -1 };
          if (!run.drag || run.drag.mode !== 'scribe') return;
          var near = closestOnPoly(pt(ev.x, ev.y), wall);
          var idx = clamp(Math.round(near.t * cfg.n), 0, cfg.n);
          var y = wall[idx].y;
          var tiltNow = Math.atan2(ev.y - wall[idx].y, ev.x - wall[idx].x);
          var wobble = (tiltNow - s.lockedTilt) * s.lockedSpan * 0.55;
          var from = run.drag.last < 0 ? idx : run.drag.last;
          var lo = Math.min(from, idx);
          var hi = Math.max(from, idx);
          for (var i = lo; i <= hi; i++) {
            var yy = wall[i].y;
            s.samples[i] = scribeTraceX(cfg, wall, s.lockedSpan, s.lockedTilt, s.angle, yy, wobble);
            s.wobble[i] = wobble;
          }
          run.drag.last = idx;
          var filled = s.samples.filter(function (v) { return v != null; }).length;
          if (filled >= wall.length - 1 && ev.type === 'move') {
            /* wait for pointer up to commit a full pass */
          }
          return;
        }
        if (ev.type === 'up' && run.drag) {
          run.drag = null;
          var got = s.samples.filter(function (v) { return v != null; }).length;
          if (got >= wall.length - 1) commitScribe(run);
        }
      }
      if (id === 'bevel') dragBevel(run, ev);
    };

    function scribeDeviation(s) {
      var errs = [];
      for (var i = 0; i < wall.length; i++) {
        var ideal = idealAt(wall[i].y);
        var cut = cutFromTrace(cfg, s.samples[i]);
        errs.push(Math.abs(cut - ideal));
      }
      return mean(errs);
    }

    function commitScribe(run) {
      var s = run.s;
      var faithful = [];
      for (var i = 0; i < wall.length; i++) {
        faithful.push(scribeTraceX(cfg, wall, s.lockedSpan, s.lockedTilt, s.angle, wall[i].y, 0));
      }
      var extra = 0;
      var n = 0;
      for (i = 0; i < wall.length; i++) {
        var ideal = idealAt(wall[i].y);
        var got = s.samples[i] == null ? cfg.frontX : s.samples[i];
        var base = cutFromTrace(cfg, faithful[i]);
        extra += Math.abs(cutFromTrace(cfg, got) - ideal) - Math.abs(base - ideal);
        n++;
      }
      extra = Math.max(0, extra / (n || 1));
      var uncovered = s.samples.filter(function (v) { return v == null; }).length;
      if (uncovered > 2) extra += uncovered * 0.15;
      var note = '';
      if (uncovered > 2) note = 'The point left the wall before the scribe was finished.';
      else if (extra >= 0.35) note = 'The legs tilted on the way down, so the line drifted.';
      completeStep(level, run, extra, note);
    }

    level.actionFor = function (run) {
      var id = stepId(level, run);
      if (id === 'level') return { label: 'Lock shims', enabled: true };
      if (id === 'lock') return { label: 'Lock compass', enabled: true };
      if (id === 'scribe') return { label: 'Done scribing', enabled: true };
      if (id === 'bevel') return { label: 'Set the bevel', enabled: true };
      if (id === 'cut') return { label: 'Cut', enabled: true };
      return null;
    };

    level.seatText = function (run) {
      var id = stepId(level, run);
      if (id === 'bevel') return bevelWords(run.s.bevel, 'wall');
      if (id === 'level' && Math.abs(run.s.angle) < 0.012) return 'Bubble in the middle';
      if (id !== 'lock' || run.s.locked) return '';
      var info = seats(run.s);
      if (info.pointHot && info.pencilHot) return 'Both legs seated';
      if (info.pointHot) return 'Point seated on the wall';
      if (info.pencilHot) return 'Pencil seated on the panel';
      return '';
    };

    level.instruct = function (run) {
      var id = stepId(level, run);
      var base = level.steps[Math.min(run.step, level.steps.length - 1)].instruction;
      if (id === 'scribe') {
        var got = run.s.samples.filter(function (v) { return v != null; }).length;
        return base + ' Covered ' + got + ' of ' + wall.length + '.';
      }
      return base;
    };

    level.onAction = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'level') {
        var dev = Math.abs(s.angle) * (cfg.y1 - cfg.y0) * 0.45;
        completeStep(level, run, dev, 'The bubble was still out, so the panel was leaning.');
        return;
      }
      if (id === 'lock') {
        var info = applySeats(s);
        s.locked = true;
        s.lockedSpan = s.span;
        s.lockedTilt = s.tilt;
        var horizontal = s.span * Math.cos(s.tilt);
        var devLock = Math.abs(horizontal - idealS);
        var tiltMm = Math.abs(Math.sin(s.tilt)) * s.span * 0.45;
        var note = '';
        if (!info.pointHot || !info.pencilHot) note = 'The compass was locked in the air, not across the gap.';
        else if (horizontal < idealS - 0.35) note = 'The compass was locked on a narrower gap.';
        else if (horizontal > idealS + 0.35) note = 'The compass was opened past the widest gap.';
        else if (tiltMm >= 0.35) note = 'The legs were tilted, so the opening slid along the wall.';
        completeStep(level, run, devLock + tiltMm, note);
        return;
      }
      if (id === 'scribe') { commitScribe(run); return; }
      if (id === 'bevel') {
        s.bevelSet = true;
        var pen = bevelPenalty(s.bevel);
        var bnote = pen >= 0.35 ? (s.bevel < 0.09 ? 'The saw was left too square, so the back of the cut hits the wall.' : 'The saw was tipped so far the face of the cut broke back.') : '';
        completeStep(level, run, pen, bnote);
        return;
      }
      if (id === 'cut') completeStep(level, run, 0, '');
    };

    level.hint = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'level') {
        s.angle = 0;
        level.onAction(run);
        /* onAction records the deviation of the corrected pose, which is 0 */
        return;
      }
      if (id === 'lock') {
        s.point = pt(idealPoint.x, idealPoint.y);
        s.span = idealS;
        s.tilt = 0;
        level.onAction(run);
        return;
      }
      if (id === 'scribe') {
        for (var i = 0; i < wall.length; i++) {
          s.samples[i] = scribeTraceX(cfg, wall, s.lockedSpan, s.lockedTilt, s.angle, wall[i].y, 0);
          s.wobble[i] = 0;
        }
        commitScribe(run);
        return;
      }
      if (id === 'bevel') {
        s.bevel = 0.22;
        level.onAction(run);
        return;
      }
      if (id === 'cut') level.onAction(run);
    };

    level.measure = function (run) {
      var s = run.s;
      var errs = [];
      for (var i = 0; i < wall.length; i++) {
        errs.push(Math.abs(cutFromTrace(cfg, s.samples[i]) - idealAt(wall[i].y)));
      }
      return mean(errs) + (s.bevelSet || run.phase === 'result' ? bevelPenalty(s.bevel) : bevelPenalty(s.bevel));
    };

    level.scene = function (run) {
      var view = viewOf(level, run);
      var s = view.s;
      var items = [paper()];
      var band = [];
      wall.forEach(function (p) { band.push(pt(p.x - 14, p.y)); });
      for (var i = wall.length - 1; i >= 0; i--) band.push(pt(wall[i].x, wall[i].y));
      items.push({ op: 'poly', pts: band, fill: cfg.hard ? '#7d756c' : '#9a9188', stroke: '#5c564f', sw: 1 });
      if (cfg.hard) {
        for (i = 0; i < wall.length; i += 4) {
          items.push({ op: 'line', a: pt(wall[i].x - 14, wall[i].y), b: pt(wall[i].x, wall[i].y), stroke: 'rgba(244,239,228,0.35)', sw: 1 });
        }
      }
      items.push({ op: 'poly', pts: panelCorners(cfg, s.angle), fill: '#e7c98a', stroke: '#8a6434', sw: 1 });
      var bub = rotAround(pt((cfg.frontX + cfg.backX) / 2, (cfg.y0 + cfg.y1) / 2 - 8), pt((cfg.frontX + cfg.backX) / 2, (cfg.y0 + cfg.y1) / 2), s.angle);
      items.push({ op: 'bubble', c: bub, offset: clamp(s.angle / 0.07, -1, 1) });
      var pencilPts = [];
      for (i = 0; i < wall.length; i++) {
        if (s.samples[i] != null) pencilPts.push(pt(s.samples[i], wall[i].y));
      }
      if (pencilPts.length > 1) items.push({ op: 'polyline', pts: pencilPts, stroke: '#241c14', sw: 1.5 });
      if (run.phase === 'result' && run.replay == null) {
        var idealPts = wall.map(function (p) { return pt(idealAt(p.y), p.y); });
        items.push({ op: 'polyline', pts: idealPts, stroke: 'rgba(76,175,80,0.0)', sw: 1 });
        for (i = 0; i < wall.length; i += 3) {
          var cx = cutFromTrace(cfg, s.samples[i]);
          var ix = idealAt(wall[i].y);
          if (Math.abs(cx - ix) > 0.4) {
            items.push({ op: 'line', a: pt(Math.min(cx, ix), wall[i].y), b: pt(Math.max(cx, ix), wall[i].y), stroke: 'rgba(231,76,60,0.8)', sw: 2 });
          }
        }
      }
      var showCompass = view.step === 1 || view.step === 2;
      if ((run.phase === 'play' || run.replay != null) && view.step === 0) {
        var shim = shimPoint(cfg, s.angle);
        var hub = pt((cfg.frontX + cfg.backX) / 2, (cfg.y0 + cfg.y1) / 2);
        var shimAng = Math.atan2(shim.y - hub.y, shim.x - hub.x);
        items.push({ op: 'arc', c: hub, r: dist(hub, shim), a0: shimAng - 0.45, a1: shimAng + 0.55, stroke: '#c4923a', sw: 1.8 });
        items.push(arcArrow(hub, dist(hub, shim), shimAng + 0.55));
        items.push({ op: 'grip', c: shim, r: 5.2, label: 'shim', lx: 7, ly: -2 });
        items.push({ op: 'text', t: 'level', x: bub.x + 12, y: bub.y, size: 12, color: '#3a322c' });
      }
      if ((run.phase === 'play' || run.replay != null) && showCompass) {
        var info = seats(s);
        items.push({
          op: 'compass',
          point: pt(s.point.x, s.point.y),
          span: view.step >= 2 ? s.lockedSpan : s.span,
          tilt: view.step >= 2 ? s.lockedTilt : s.tilt,
          hotP: info.pointHot,
          hotN: info.pencilHot,
          names: true
        });
      }
      if ((run.phase === 'play' || run.replay != null) && view.step === 2) {
        var startIdx = -1;
        for (i = 0; i < wall.length; i++) {
          if (s.samples[i] == null) { startIdx = i; break; }
        }
        if (startIdx >= 0) {
          var sp = wall[startIdx];
          items.push({ op: 'grip', c: pt(sp.x, sp.y), r: 4.4, label: 'drag', lx: -18, ly: -7 });
        }
      }
      return { items: items };
    };
    level.sectionScene = function (run) { return bevelStepScene(level, run, 'wall'); };
    return level;
  }

  /* ---------- tick stick ---------- */

  function buildTick() {
    var alcove = [pt(16, 22), pt(92, 18), pt(100, 56), pt(68, 80), pt(14, 70)];
    var sheetW = 34;
    var sheetH = 40;
    var home = null;
    var x;
    var y;
    for (y = 24; y < 70 && !home; y += 2) {
      for (x = 20; x < 70 && !home; x += 2) {
        var corners = [pt(x + 2, y + 2), pt(x + sheetW - 2, y + 2), pt(x + sheetW - 2, y + sheetH - 2), pt(x + 2, y + sheetH - 2)];
        if (corners.every(function (p) { return pointInPoly(p, alcove); })) home = { x: x, y: y, w: sheetW, h: sheetH };
      }
    }
    var board = { x: 18, y: 92, w: 78, h: 58 };
    var nC = alcove.length;

    var level = {
      id: 'tick',
      name: 'Tick Stick',
      technique: 'Tick stick template',
      geometry: 'Each corner is a direction plus a tick on the stick, so the same stick can rebuild it on the board.',
      blurb: 'Record every corner on a sheet, then replay the ticks onto a board.',
      hard: false,
      tutorial: null,
      alcove: alcove,
      home: home,
      board: board,
      steps: [
        { id: 'lay', label: 'Lay sheet', instruction: 'Drag the sheet until it sits fully inside the alcove.' },
        { id: 'tick', label: 'Tick', instruction: 'Drag the point onto a corner, then tick where the stick crosses the sheet.' },
        { id: 'carry', label: 'Carry', instruction: 'Drag the sheet onto the board.' },
        { id: 'replay', label: 'Replay', instruction: 'Drag the stick so a tick meets the sheet, then prick the point.' },
        { id: 'cut', label: 'Cut', instruction: 'Cut the outline the pricks describe.' }
      ]
    };

    level.create = function () {
      return fresh(level, {
        sheet: { x: 82, y: 124, w: sheetW, h: sheetH },
        placed: false,
        onBoard: false,
        ticks: [],
        point: pt(70, 78),
        ang: -0.6,
        pricks: [],
        slide: 0
      });
    };

    function sheetRect(s) { return s.sheet; }

    function hitSheet(s, p) {
      var r = s.sheet;
      return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }

    function insideAlcove(rect) {
      var cs = [pt(rect.x + 1.2, rect.y + 1.2), pt(rect.x + rect.w - 1.2, rect.y + 1.2), pt(rect.x + rect.w - 1.2, rect.y + rect.h - 1.2), pt(rect.x + 1.2, rect.y + rect.h - 1.2)];
      return cs.every(function (p) { return pointInPoly(p, alcove); });
    }

    function insideBoard(rect) {
      return rect.x >= board.x + 1 && rect.y >= board.y + 1 && rect.x + rect.w <= board.x + board.w - 1 && rect.y + rect.h <= board.y + board.h - 1;
    }

    function nearestCorner(p) {
      var best = -1;
      var bestD = 8;
      for (var i = 0; i < nC; i++) {
        var d = dist(p, alcove[i]);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    function stickTail(s) {
      return pt(s.point.x + Math.cos(s.ang) * 72, s.point.y + Math.sin(s.ang) * 72);
    }

    function turnAt(point, ang) {
      var reach = 22;
      var p = pt(point.x + Math.cos(ang) * reach, point.y + Math.sin(ang) * reach);
      var guard = 0;
      while ((p.x < 10 || p.x > 110 || p.y < 10 || p.y > 156) && reach > 14 && guard < 8) {
        reach -= 2;
        p = pt(point.x + Math.cos(ang) * reach, point.y + Math.sin(ang) * reach);
        guard++;
      }
      return p;
    }

    function hitStick(s, p) {
      if (dist(p, s.point) < 12) return 'point';
      if (dist(p, turnAt(s.point, s.ang)) < 12) return 'tail';
      var tail = stickTail(s);
      if (dist(p, tail) < 12) return 'tail';
      if (pointSegDist(p, s.point, tail).dist < 6) return 'body';
      return '';
    }

    function recordTick(s, cornerIndex) {
      var dir = pt(Math.cos(s.ang), Math.sin(s.ang));
      var t = rayRectT(alcove[cornerIndex], dir, s.sheet);
      if (t == null) return null;
      var edge = add(alcove[cornerIndex], mul(dir, t));
      var origin = pt(s.sheet.x, s.sheet.y);
      return {
        corner: cornerIndex,
        dist: t,
        dir: dir,
        edgeLocal: sub(edge, origin),
        local: sub(alcove[cornerIndex], origin)
      };
    }

    function ambiguous(ticks, dist) {
      for (var i = 0; i < ticks.length; i++) {
        if (Math.abs(ticks[i].dist - dist) < 3.5 && Math.abs(ticks[i].dist - dist) > 0.05) return ticks[i];
      }
      return null;
    }

    level.pointer = function (run, ev) {
      if (run.phase !== 'play') return;
      var s = run.s;
      var id = stepId(level, run);
      if (id === 'lay' || id === 'carry') {
        if (ev.type === 'down' && hitSheet(s, ev)) {
          run.drag = { dx: s.sheet.x - ev.x, dy: s.sheet.y - ev.y };
        } else if (ev.type === 'move' && run.drag) {
          s.sheet.x = ev.x + run.drag.dx;
          s.sheet.y = ev.y + run.drag.dy;
        } else if (ev.type === 'up') {
          var dragged = !!run.drag;
          run.drag = null;
          if (id === 'lay' && insideAlcove(s.sheet)) {
            s.placed = true;
            completeStep(level, run, 0, '');
          } else if (id === 'carry' && insideBoard(s.sheet)) {
            s.onBoard = true;
            completeStep(level, run, 0, '');
          } else if (dragged) run.fumbles += 1;
        }
        return;
      }
      if (id === 'tick' || id === 'replay') {
        if (ev.type === 'down') {
          var hit = hitStick(s, ev);
          if (!hit) return;
          run.drag = { mode: hit, px: ev.x, py: ev.y, point: pt(s.point.x, s.point.y), ang: s.ang };
          return;
        }
        if (ev.type === 'move' && run.drag) {
          if (run.drag.mode === 'tail') {
            s.ang = Math.atan2(ev.y - s.point.y, ev.x - s.point.x);
          } else {
            s.point = pt(run.drag.point.x + ev.x - run.drag.px, run.drag.point.y + ev.y - run.drag.py);
            if (run.drag.mode === 'body') s.ang = run.drag.ang;
          }
          if (id === 'tick') {
            var c = nearestCorner(s.point);
            if (c >= 0) s.point = pt(alcove[c].x, alcove[c].y);
          }
          return;
        }
        if (ev.type === 'up') run.drag = null;
      }
    };

    function seatedCorner(s) {
      var c = nearestCorner(s.point);
      if (c < 0) return -1;
      if (dist(s.point, alcove[c]) > 0.8) return -1;
      return c;
    }

    function replayMatch(s) {
      /* Which recorded line is the stick lying on, and which tick meets the edge? */
      var best = null;
      for (var i = 0; i < s.ticks.length; i++) {
        var tick = s.ticks[i];
        var edge = add(pt(s.sheet.x, s.sheet.y), tick.edgeLocal);
        var lineAng = Math.atan2(tick.dir.y, tick.dir.x);
        if (lineDiff(s.ang, lineAng) > 0.16 && lineDiff(s.ang, lineAng + Math.PI) > 0.16) continue;
        var outward = mul(tick.dir, -1);
        /* slide = how far the point sits outside the edge along the outward direction */
        var along = dot(sub(s.point, edge), outward);
        var used = tick.dist;
        var swap = ambiguous(s.ticks, tick.dist);
        var err = Math.abs(along - tick.dist);
        if (swap && Math.abs(along - swap.dist) + 0.2 < err) {
          used = swap.dist;
          err = Math.abs(along - swap.dist);
        }
        if (err > 6) continue;
        if (!best || err < best.err) best = { tick: tick, used: used, err: err, edge: edge, outward: outward };
      }
      return best;
    }

    level.actionFor = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'tick') {
        var c = seatedCorner(s);
        var freshCorner = c >= 0 && !s.ticks.some(function (t) { return t.corner === c; });
        if (freshCorner) return { label: 'Tick', enabled: true };
        return { label: 'Done ticking', enabled: s.ticks.length > 0 };
      }
      if (id === 'replay') {
        var left = s.ticks.filter(function (t) { return !s.pricks.some(function (p) { return p.corner === t.corner; }); });
        if (replayMatch(s)) return { label: 'Prick', enabled: true };
        return { label: 'Done replaying', enabled: s.pricks.length > 0 && left.length >= 0 };
      }
      if (id === 'cut') return { label: 'Cut', enabled: s.pricks.length > 0 };
      return null;
    };

    level.seatText = function (run) {
      var id = stepId(level, run);
      if (id === 'tick') {
        var c = seatedCorner(run.s);
        return c >= 0 ? 'Point seated on a corner' : '';
      }
      if (id === 'replay' && replayMatch(run.s)) return 'Stick seated on a tick';
      if (id === 'lay' && insideAlcove(run.s.sheet)) return 'Sheet seated in the alcove';
      if (id === 'carry' && insideBoard(run.s.sheet)) return 'Sheet seated on the board';
      return '';
    };

    level.instruct = function (run) {
      var id = stepId(level, run);
      var base = level.steps[Math.min(run.step, level.steps.length - 1)].instruction;
      if (id === 'tick') return base + ' ' + run.s.ticks.length + ' of ' + nC + ' corners.';
      if (id === 'replay') return base + ' ' + run.s.pricks.length + ' of ' + run.s.ticks.length + ' pricked.';
      return base;
    };

    function tickDeviationNote(s, tick) {
      var other = ambiguous(s.ticks, tick.dist);
      if (other) return 'Two ticks landed so close they are easy to swap.';
      return '';
    }

    level.onAction = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'tick') {
        var c = seatedCorner(s);
        var already = c >= 0 && s.ticks.some(function (t) { return t.corner === c; });
        if (c >= 0 && !already) {
          var rec = recordTick(s, c);
          if (!rec) { run.fumbles += 1; return; }
          s.ticks.push(rec);
          if (s.ticks.length >= nC) {
            var dev = 0;
            var note = '';
            s.ticks.forEach(function (t) {
              if (ambiguous(s.ticks, t.dist)) { dev = Math.max(dev, 1.2); note = 'Two ticks landed so close they are easy to swap.'; }
            });
            completeStep(level, run, dev, note);
          }
          return;
        }
        if (s.ticks.length > 0) {
          var missing = nC - s.ticks.length;
          completeStep(level, run, missing * 8, missing ? 'A corner never got a tick.' : '');
        }
        return;
      }
      if (id === 'replay') {
        var match = replayMatch(s);
        if (match) {
          if (s.pricks.some(function (p) { return p.corner === match.tick.corner; })) return;
          var prick = add(match.edge, mul(match.outward, match.used));
          var trueLocal = add(pt(s.sheet.x, s.sheet.y), match.tick.local);
          var err = dist(prick, trueLocal);
          s.pricks.push({ corner: match.tick.corner, at: prick, err: err });
          if (s.pricks.length >= s.ticks.length) {
            var dev = 0;
            s.pricks.forEach(function (p) { dev = Math.max(dev, p.err); });
            var note = dev >= 0.35 ? 'A tick was replayed on the wrong mark.' : '';
            completeStep(level, run, dev, note);
          }
          return;
        }
        if (s.pricks.length > 0) {
          var miss = s.ticks.length - s.pricks.length;
          completeStep(level, run, miss * 8, miss ? 'A tick was never replayed.' : '');
        }
        return;
      }
      if (id === 'cut') completeStep(level, run, 0, '');
    };

    function hintAngleFor(s, cornerIndex) {
      var center = pt(s.sheet.x + s.sheet.w / 2, s.sheet.y + s.sheet.h / 2);
      var base = Math.atan2(center.y - alcove[cornerIndex].y, center.x - alcove[cornerIndex].x);
      var best = null;
      for (var k = 0; k < 10; k++) {
        var ang = base + (k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.28);
        s.ang = ang;
        s.point = pt(alcove[cornerIndex].x, alcove[cornerIndex].y);
        var rec = recordTick(s, cornerIndex);
        if (!rec) continue;
        var crowd = 0;
        for (var i = 0; i < s.ticks.length; i++) crowd = Math.max(crowd, 8 - Math.abs(s.ticks[i].dist - rec.dist));
        if (!best || crowd < best.crowd) best = { ang: ang, crowd: crowd, rec: rec };
        if (best && best.crowd <= 0) break;
      }
      return best;
    }

    level.hint = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'lay') {
        s.sheet = { x: home.x, y: home.y, w: sheetW, h: sheetH };
        s.placed = true;
        completeStep(level, run, 0, '');
        return;
      }
      if (id === 'tick') {
        var next = -1;
        for (var i = 0; i < nC; i++) {
          if (!s.ticks.some(function (t) { return t.corner === i; })) { next = i; break; }
        }
        if (next < 0) return;
        var picked = hintAngleFor(s, next);
        s.ang = picked.ang;
        s.point = pt(alcove[next].x, alcove[next].y);
        s.ticks.push(picked.rec);
        if (s.ticks.length >= nC) completeStep(level, run, 0, '');
        return;
      }
      if (id === 'carry') {
        s.sheet.x = board.x + 8;
        s.sheet.y = board.y + 2;
        s.onBoard = true;
        completeStep(level, run, 0, '');
        return;
      }
      if (id === 'replay') {
        var tick = null;
        for (i = 0; i < s.ticks.length; i++) {
          if (!s.pricks.some(function (p) { return p.corner === s.ticks[i].corner; })) { tick = s.ticks[i]; break; }
        }
        if (!tick) return;
        var edge = add(pt(s.sheet.x, s.sheet.y), tick.edgeLocal);
        var outward = mul(tick.dir, -1);
        s.ang = Math.atan2(tick.dir.y, tick.dir.x);
        s.point = add(edge, mul(outward, tick.dist));
        var prick = add(edge, mul(outward, tick.dist));
        s.pricks.push({ corner: tick.corner, at: prick, err: 0 });
        if (s.pricks.length >= s.ticks.length) completeStep(level, run, 0, '');
        return;
      }
      if (id === 'cut') completeStep(level, run, 0, '');
    };

    level.measure = function (run) {
      var s = run.s;
      var matched = [];
      for (var i = 0; i < nC; i++) {
        var prick = null;
        for (var k = 0; k < s.pricks.length; k++) if (s.pricks[k].corner === i) prick = s.pricks[k];
        if (!prick) matched.push(null);
        else matched.push(prick.at);
      }
      var have = [];
      for (i = 0; i < nC; i++) if (matched[i]) have.push(i);
      if (!have.length) return 16;
      var dx = 0;
      var dy = 0;
      have.forEach(function (i) {
        dx += alcove[i].x - matched[i].x;
        dy += alcove[i].y - matched[i].y;
      });
      dx /= have.length;
      dy /= have.length;
      var worst = 0;
      for (i = 0; i < nC; i++) {
        var err;
        if (!matched[i]) {
          var prev = alcove[(i + nC - 1) % nC];
          var next = alcove[(i + 1) % nC];
          err = pointLineDist(alcove[i], prev, next);
        } else err = dist(alcove[i], pt(matched[i].x + dx, matched[i].y + dy));
        if (err > worst) worst = err;
      }
      return worst;
    };

    level.scene = function (run) {
      var view = viewOf(level, run);
      var s = view.s;
      var items = [paper()];
      items.push({ op: 'poly', pts: alcove, fill: '#ded5c6', stroke: '#8a8175', sw: 1.4 });
      alcove.forEach(function (p) {
        items.push({ op: 'circle', c: p, r: 1.3, fill: '#241c14', stroke: '', sw: 0 });
      });
      items.push({ op: 'rect', x: board.x, y: board.y, w: board.w, h: board.h, fill: '#e4c48a', stroke: '#8a6434', sw: 1 });
      items.push({ op: 'rect', x: s.sheet.x, y: s.sheet.y, w: s.sheet.w, h: s.sheet.h, fill: 'rgba(255,252,245,0.92)', stroke: '#5b9bd5', sw: 1.2 });
      if ((run.phase === 'play' || run.replay != null) && (view.step === 0 || view.step === 2)) {
        items.push({ op: 'text', t: 'sheet', x: s.sheet.x + 4, y: s.sheet.y + s.sheet.h / 2, size: 12, color: '#3d6f99' });
      }
      s.ticks.forEach(function (t) {
        var edge = add(pt(s.sheet.x, s.sheet.y), t.edgeLocal);
        var inward = add(edge, mul(t.dir, Math.min(18, t.dist)));
        items.push({ op: 'line', a: edge, b: inward, stroke: '#241c14', sw: 1.15 });
        items.push({ op: 'line', a: add(edge, pt(-1.4, 0)), b: add(edge, pt(1.4, 0)), stroke: '#241c14', sw: 1.4 });
      });
      if (s.pricks.length) {
        var poly = [];
        for (var i = 0; i < nC; i++) {
          for (var k = 0; k < s.pricks.length; k++) if (s.pricks[k].corner === i) poly.push(s.pricks[k].at);
        }
        if (poly.length > 1) items.push({ op: 'polyline', pts: poly.concat(run.phase === 'result' ? [poly[0]] : []), stroke: '#241c14', sw: 1.4 });
        s.pricks.forEach(function (p) {
          items.push({ op: 'circle', c: p.at, r: 1.5, fill: '#241c14', stroke: '', sw: 0 });
        });
      }
      if (run.phase === 'play' || run.replay != null) {
        if (view.step === 1 || view.step === 3) {
          var ticks = s.ticks.map(function (t) { return t.dist; });
          items.push({ op: 'stick', point: s.point, ang: s.ang, len: 72, ticks: ticks, hot: view.step === 1 ? seatedCorner(s) >= 0 : !!replayMatch(s), pointLabel: 'point', tailLabel: 'turn', turn: turnAt(s.point, s.ang) });
        }
      }
      return { items: items };
    };
    return level;
  }

  /* ---------- bisect ---------- */

  function buildBisect() {
    var V = pt(44, 118);
    var angA = -Math.PI / 2 - 0.22;
    var interior = 76 * Math.PI / 180;
    var angB = angA + interior;
    var wallLen = 70;
    var dA = pt(Math.cos(angA), Math.sin(angA));
    var dB = pt(Math.cos(angB), Math.sin(angB));
    var endA = add(V, mul(dA, wallLen));
    var endB = add(V, mul(dB, wallLen));
    var bis = angA + interior / 2;
    var dBis = pt(Math.cos(bis), Math.sin(bis));
    var W = 11;

    function inward(d) {
      var n1 = pt(-d.y, d.x);
      var n2 = pt(d.y, -d.x);
      return dot(n1, dBis) > dot(n2, dBis) ? n1 : n2;
    }
    var nA = inward(dA);
    var nB = inward(dB);

    var level = {
      id: 'bisect',
      name: 'Bisect the Corner',
      technique: 'Equal offcuts and a sliding bevel',
      geometry: 'Two equal offcuts cross on the angle’s bisector — the miter that splits the corner.',
      blurb: 'The room is not square. Bisect it with two scraps and carry the angle to the saw.',
      hard: false,
      tutorial: null,
      V: V,
      angA: angA,
      angB: angB,
      bis: bis,
      dA: dA,
      dB: dB,
      endA: endA,
      endB: endB,
      nA: nA,
      nB: nB,
      W: W,
      steps: [
        { id: 'offA', label: 'Offcut', instruction: 'Drag the offcut flush onto one wall, then pencil its inner edge.' },
        { id: 'offB', label: 'Offcut', instruction: 'Drag the offcut flush onto the other wall, then pencil its inner edge.' },
        { id: 'bis', label: 'Bisector', instruction: 'Drag an end through the corner and the crossing, then knife.' },
        { id: 'bevel', label: 'Bevel', instruction: 'Drag the blade onto the knifed line, then lock the bevel.' },
        { id: 'saw', label: 'Saw', instruction: 'Drag the saw blade until it lines up with the bevel.' },
        { id: 'cut', label: 'Cut', instruction: 'Cut the miter.' }
      ]
    };

    function wallSeg(which) {
      return which === 'A' ? [endA, V] : [endB, V];
    }

    level.create = function () {
      return fresh(level, {
        off: { x: 78, y: 70, ang: -0.4 },
        lines: [],
        barA: pt(70, 96),
        barB: pt(96, 78),
        bevelOrigin: pt(86, 58),
        stockAng: 0.4,
        bladeAng: -0.2,
        bevelLocked: false,
        sawAng: 0.15,
        sawLocked: false
      });
    };

    function offcutCorners(s) {
      var c = pt(s.off.x, s.off.y);
      var d = pt(Math.cos(s.off.ang), Math.sin(s.off.ang));
      var n = pt(-d.y, d.x);
      var hw = W / 2;
      var hl = 22;
      return [
        add(add(c, mul(d, hl)), mul(n, hw)),
        add(add(c, mul(d, hl)), mul(n, -hw)),
        add(add(c, mul(d, -hl)), mul(n, -hw)),
        add(add(c, mul(d, -hl)), mul(n, hw))
      ];
    }

    function seatOffcut(s) {
      var used = {};
      s.lines.forEach(function (ln) { used[ln.wall] = true; });
      var best = null;
      ['A', 'B'].forEach(function (which) {
        if (used[which]) return;
        var seg = wallSeg(which);
        var dang = Math.min(lineDiff(s.off.ang, which === 'A' ? angA : angB), lineDiff(s.off.ang + Math.PI, which === 'A' ? angA : angB));
        var n = which === 'A' ? nA : nB;
        var d = which === 'A' ? dA : dB;
        /* inner edge wants to sit W inside the wall, outer edge on the wall */
        var outer = add(pt(s.off.x, s.off.y), mul(n, -W / 2));
        var on = pointSegDist(outer, seg[0], seg[1]);
        if (dang < 0.22 && on.dist < 7) {
          if (!best || on.dist < best.dist) best = { which: which, dist: on.dist, n: n, d: d, on: on };
        }
      });
      if (!best) { s.off.seated = null; return null; }
      var target = add(best.on.point, mul(best.n, W / 2));
      s.off.x = target.x;
      s.off.y = target.y;
      s.off.ang = Math.atan2(best.d.y, best.d.x);
      s.off.seated = best.which;
      return best.which;
    }

    function pencilLine(s) {
      var which = s.off.seated;
      if (!which) {
        var d = pt(Math.cos(s.off.ang), Math.sin(s.off.ang));
        var n = pt(-d.y, d.x);
        var a = add(pt(s.off.x, s.off.y), mul(n, W / 2));
        return { wall: 'free', a: add(a, mul(d, -24)), b: add(a, mul(d, 24)), faithful: false };
      }
      var nrm = which === 'A' ? nA : nB;
      var dir = which === 'A' ? dA : dB;
      var origin = add(V, mul(nrm, W));
      return { wall: which, a: add(origin, mul(dir, 8)), b: add(origin, mul(dir, wallLen - 6)), faithful: true };
    }

    function crossOf(lines) {
      if (lines.length < 2) return null;
      var hit = lineIntersect(lines[0].a, lines[0].b, lines[1].a, lines[1].b);
      if (!hit) return null;
      return hit.point;
    }

    level.pointer = function (run, ev) {
      if (run.phase !== 'play') return;
      var s = run.s;
      var id = stepId(level, run);
      if (id === 'offA' || id === 'offB') {
        if (ev.type === 'down') {
          var cs = offcutCorners(s);
          if (cs.some(function (c) { return dist(c, ev) < 12; }) || dist(ev, pt(s.off.x, s.off.y)) < 16) {
            run.drag = { px: ev.x, py: ev.y, x: s.off.x, y: s.off.y, ang: s.off.ang, mode: dist(ev, pt(s.off.x, s.off.y)) < 12 ? 'move' : 'rot' };
          }
        } else if (ev.type === 'move' && run.drag) {
          if (run.drag.mode === 'rot') s.off.ang = Math.atan2(ev.y - s.off.y, ev.x - s.off.x);
          else {
            s.off.x = run.drag.x + ev.x - run.drag.px;
            s.off.y = run.drag.y + ev.y - run.drag.py;
          }
          seatOffcut(s);
        } else if (ev.type === 'up') run.drag = null;
        return;
      }
      if (id === 'bis') {
        if (ev.type === 'down') {
          var da = dist(ev, s.barA);
          var db = dist(ev, s.barB);
          if (da < 12 && da <= db) run.drag = { end: 'a' };
          else if (db < 12) run.drag = { end: 'b' };
          else if (pointSegDist(ev, s.barA, s.barB).dist < 7) run.drag = { end: 'body', px: ev.x, py: ev.y, a: pt(s.barA.x, s.barA.y), b: pt(s.barB.x, s.barB.y) };
        } else if (ev.type === 'move' && run.drag) {
          if (run.drag.end === 'a') s.barA = pt(ev.x, ev.y);
          else if (run.drag.end === 'b') s.barB = pt(ev.x, ev.y);
          else {
            var dx = ev.x - run.drag.px;
            var dy = ev.y - run.drag.py;
            s.barA = pt(run.drag.a.x + dx, run.drag.a.y + dy);
            s.barB = pt(run.drag.b.x + dx, run.drag.b.y + dy);
          }
          var P = crossOf(s.lines);
          if (P && pointLineDist(V, s.barA, s.barB) < 5 && pointLineDist(P, s.barA, s.barB) < 5) {
            s.barA = pt(V.x, V.y);
            s.barB = pt(P.x, P.y);
            s.barSeated = true;
          } else s.barSeated = false;
        } else if (ev.type === 'up') run.drag = null;
        return;
      }
      if (id === 'bevel') {
        var origin = s.bevelOrigin;
        var bladeDir = pt(Math.cos(s.bladeAng), Math.sin(s.bladeAng));
        var tip = add(origin, mul(bladeDir, 32));
        var stockDir = pt(Math.cos(s.stockAng), Math.sin(s.stockAng));
        var stockA = add(origin, mul(stockDir, -16));
        var stockB = add(origin, mul(stockDir, 16));
        var onTip = dist(ev, tip) < 14;
        var onStock = dist(ev, origin) < 12 || pointSegDist(ev, stockA, stockB).dist < 8;
        var onBlade = pointSegDist(ev, origin, tip).dist < 7 && dist(ev, origin) > 10;
        if (ev.type === 'down') {
          if (onTip || onBlade) run.drag = { mode: 'blade' };
          else if (onStock) run.drag = { mode: 'move', px: ev.x, py: ev.y, o: pt(origin.x, origin.y) };
        } else if (ev.type === 'move' && run.drag) {
          if (run.drag.mode === 'blade') s.bladeAng = Math.atan2(ev.y - s.bevelOrigin.y, ev.x - s.bevelOrigin.x);
          else s.bevelOrigin = pt(run.drag.o.x + ev.x - run.drag.px, run.drag.o.y + ev.y - run.drag.py);
          if (s.lines && run.s.bisector) {
            var diff = lineDiff(s.bladeAng, Math.atan2(run.s.bisector.b.y - run.s.bisector.a.y, run.s.bisector.b.x - run.s.bisector.a.x));
            if (diff < 0.05 && pointLineDist(s.bevelOrigin, run.s.bisector.a, run.s.bisector.b) < 10) {
              s.bladeAng = Math.atan2(run.s.bisector.b.y - run.s.bisector.a.y, run.s.bisector.b.x - run.s.bisector.a.x);
              s.bladeHot = true;
            } else s.bladeHot = false;
          }
        } else if (ev.type === 'up') run.drag = null;
        return;
      }
      if (id === 'saw') {
        var sawOrigin = pt(36, 146);
        var sawTip = add(sawOrigin, mul(pt(Math.cos(s.sawAng), Math.sin(s.sawAng)), 30));
        var onSaw = dist(ev, sawTip) < 14 || pointSegDist(ev, sawOrigin, sawTip).dist < 8;
        if (ev.type === 'down') {
          if (onSaw) run.drag = { mode: 'saw' };
        } else if (ev.type === 'move' && run.drag && run.drag.mode === 'saw') {
          s.sawAng = Math.atan2(ev.y - sawOrigin.y, ev.x - sawOrigin.x);
          if (s.bevelLocked && lineDiff(s.sawAng, s.bladeAng) < 0.04) {
            s.sawAng = s.bladeAng;
            s.sawHot = true;
          } else s.sawHot = false;
        } else if (ev.type === 'up') run.drag = null;
      }
    };

    level.actionFor = function (run) {
      var id = stepId(level, run);
      if (id === 'offA' || id === 'offB') return { label: 'Pencil the edge', enabled: true };
      if (id === 'bis') return { label: 'Knife bisector', enabled: true };
      if (id === 'bevel') return { label: 'Lock bevel', enabled: true };
      if (id === 'saw') return { label: 'Lock saw', enabled: true };
      if (id === 'cut') return { label: 'Cut', enabled: true };
      return null;
    };

    level.seatText = function (run) {
      var s = run.s;
      if ((stepId(level, run) === 'offA' || stepId(level, run) === 'offB') && s.off.seated) return 'Offcut seated on the wall';
      if (stepId(level, run) === 'bis' && s.barSeated) return 'Straightedge seated on the corner and the cross';
      if (stepId(level, run) === 'bevel' && s.bladeHot) return 'Blade seated on the bisector';
      if (stepId(level, run) === 'saw' && s.sawHot) return 'Saw seated on the bevel';
      return '';
    };

    level.onAction = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'offA' || id === 'offB') {
        seatOffcut(s);
        var line = pencilLine(s);
        if (s.lines.some(function (ln) { return ln.wall === line.wall && line.wall !== 'free'; })) {
          run.fumbles += 1;
          return;
        }
        s.lines.push(line);
        var dev = line.faithful ? 0 : 4.5;
        completeStep(level, run, dev, line.faithful ? '' : 'The offcut was not seated, so its pencil line is not an equal offset.');
        return;
      }
      if (id === 'bis') {
        var P = crossOf(s.lines);
        var through = P && pointLineDist(V, s.barA, s.barB) < 4 && pointLineDist(P, s.barA, s.barB) < 4;
        if (through) {
          s.bisector = { a: pt(V.x, V.y), b: pt(P.x, P.y) };
          completeStep(level, run, 0, '');
        } else {
          s.bisector = { a: pt(s.barA.x, s.barA.y), b: pt(s.barB.x, s.barB.y) };
          var ang = Math.atan2(s.barB.y - s.barA.y, s.barB.x - s.barA.x);
          var trueLine = P ? Math.atan2(P.y - V.y, P.x - V.x) : bis;
          var dev = lineDiff(ang, trueLine) * 22;
          completeStep(level, run, dev, 'The straightedge missed the corner or the crossing.');
        }
        return;
      }
      if (id === 'bevel') {
        s.bevelLocked = true;
        var target = s.bisector ? Math.atan2(s.bisector.b.y - s.bisector.a.y, s.bisector.b.x - s.bisector.a.x) : bis;
        var devB = lineDiff(s.bladeAng, target) * 22;
        completeStep(level, run, devB, devB >= 0.35 ? 'The bevel was locked off the knifed line.' : '');
        return;
      }
      if (id === 'saw') {
        s.sawLocked = true;
        var devS = lineDiff(s.sawAng, s.bladeAng) * 22;
        completeStep(level, run, devS, devS >= 0.35 ? 'The saw does not match the bevel.' : '');
        return;
      }
      if (id === 'cut') completeStep(level, run, 0, '');
    };

    level.hint = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'offA' || id === 'offB') {
        var used = {};
        s.lines.forEach(function (ln) { used[ln.wall] = true; });
        var which = used.A ? 'B' : 'A';
        var dir = which === 'A' ? dA : dB;
        var nrm = which === 'A' ? nA : nB;
        var mid = add(V, mul(dir, 36));
        s.off.x = add(mid, mul(nrm, W / 2)).x;
        s.off.y = add(mid, mul(nrm, W / 2)).y;
        s.off.ang = Math.atan2(dir.y, dir.x);
        s.off.seated = which;
        level.onAction(run);
        return;
      }
      if (id === 'bis') {
        var P = crossOf(s.lines);
        if (!P) P = add(V, mul(dBis, 28));
        s.barA = pt(V.x, V.y);
        s.barB = pt(P.x, P.y);
        s.barSeated = true;
        level.onAction(run);
        return;
      }
      if (id === 'bevel') {
        var ang = s.bisector ? Math.atan2(s.bisector.b.y - s.bisector.a.y, s.bisector.b.x - s.bisector.a.x) : bis;
        s.bladeAng = ang;
        s.bladeHot = true;
        s.bevelOrigin = s.bisector ? pt((s.bisector.a.x + s.bisector.b.x) / 2, (s.bisector.a.y + s.bisector.b.y) / 2) : pt(70, 90);
        level.onAction(run);
        return;
      }
      if (id === 'saw') {
        s.sawAng = s.bladeAng;
        s.sawHot = true;
        level.onAction(run);
        return;
      }
      if (id === 'cut') level.onAction(run);
    };

    level.measure = function (run) {
      var s = run.s;
      if (!s.sawLocked && run.phase !== 'result') return lineDiff(s.sawAng, bis) * 28;
      return lineDiff(s.sawAng, bis) * 28;
    };

    level.scene = function (run) {
      var view = viewOf(level, run);
      var s = view.s;
      var items = [paper()];
      function band(end, dir, nrm) {
        var outer0 = add(V, mul(nrm, -10));
        var outer1 = add(end, mul(nrm, -10));
        return [V, end, outer1, outer0];
      }
      items.push({ op: 'poly', pts: band(endA, dA, nA), fill: '#cfc6ba', stroke: '#8a8175', sw: 1 });
      items.push({ op: 'poly', pts: band(endB, dB, nB), fill: '#cfc6ba', stroke: '#8a8175', sw: 1 });
      items.push({ op: 'circle', c: V, r: 1.4, fill: '#241c14', stroke: '', sw: 0 });
      s.lines.forEach(function (ln) {
        items.push({ op: 'line', a: ln.a, b: ln.b, stroke: '#241c14', sw: 1.35 });
      });
      var P = crossOf(s.lines);
      if (P) items.push({ op: 'circle', c: P, r: 1.6, fill: '#5b9bd5', stroke: '', sw: 0 });
      if (s.bisector) items.push({ op: 'line', a: s.bisector.a, b: s.bisector.b, stroke: '#241c14', sw: 1.7 });
      if (run.phase === 'play' || run.replay != null) {
        if (view.step === 0 || view.step === 1) {
          items.push({ op: 'offcut', x: s.off.x, y: s.off.y, ang: s.off.ang, w: W, len: 44, hot: !!s.off.seated, grip: true });
        }
        if (view.step === 2) {
          items.push({ op: 'line', a: s.barA, b: s.barB, stroke: s.barSeated ? '#c4923a' : '#2e3844', sw: 3 });
          items.push({ op: 'grip', c: s.barA, r: 5.2, label: 'end', lx: 7, ly: -6 });
          items.push({ op: 'grip', c: s.barB, r: 5.2, label: 'end', lx: 7, ly: -6 });
        }
        if (view.step === 3) {
          items.push({ op: 'bevel', origin: s.bevelOrigin, stockAng: s.stockAng, bladeAng: s.bladeAng, hot: !!s.bladeHot, grip: true });
        }
        if (view.step === 4) {
          items.push({ op: 'saw', origin: pt(36, 146), ang: s.sawAng, hot: !!s.sawHot, len: 30, grip: 'saw' });
          items.push({ op: 'bevel', origin: pt(78, 146), stockAng: 0, bladeAng: s.bladeAng, hot: false });
          items.push({ op: 'text', t: 'bevel', x: 78, y: 132, size: 12, color: '#5c564f', align: 'center' });
        }
      }
      if (run.phase === 'result' && run.replay == null) {
        var cutDir = pt(Math.cos(s.sawAng), Math.sin(s.sawAng));
        var trueDir = dBis;
        items.push({ op: 'line', a: V, b: add(V, mul(trueDir, 34)), stroke: 'rgba(76,175,80,0.9)', sw: 1.2, dash: [3, 2] });
        items.push({ op: 'line', a: V, b: add(V, mul(cutDir, 34)), stroke: '#241c14', sw: 1.8 });
      }
      return { items: items };
    };
    return level;
  }

  /* ---------- coping ---------- */

  function buildCope() {
    var profile = [
      pt(28, 36), pt(28, 52), pt(34, 60), pt(44, 68), pt(48, 78),
      pt(42, 88), pt(32, 96), pt(28, 104), pt(28, 114), pt(38, 120), pt(38, 132)
    ];
    var straight = [pt(28, 36), pt(28, 132)];
    var fenceIn = Math.PI / 4;
    var fenceOut = -Math.PI / 4;

    var level = {
      id: 'cope',
      name: 'Cope the Corner',
      technique: 'Coped inside miter',
      geometry: 'The inside miter slices the profile. Sawing that line makes the negative of the piece already in the corner.',
      blurb: 'Miter the second piece so the profile shows, then cope along it.',
      hard: false,
      tutorial: null,
      profile: profile,
      steps: [
        { id: 'miter', label: 'Miter', instruction: 'Drag the saw onto the fence that opens the profile, then cut.' },
        { id: 'pencil', label: 'Pencil', instruction: 'Drag along the edge the miter just revealed.' },
        { id: 'cope', label: 'Cope', instruction: 'Drag the saw along that pencil line.' },
        { id: 'bevel', label: 'Back-cut', instruction: 'Drag the saw to tilt it so only the face meets the other piece.' },
        { id: 'fit', label: 'Test', instruction: 'Bring the piece into the corner.' }
      ]
    };

    level.create = function () {
      return fresh(level, {
        blade: 0.15,
        fence: null,
        miterCut: false,
        pencil: [],
        cope: [],
        bevel: 0,
        bevelSet: false
      });
    };

    function revealed(s) { return s.fence === 'inside' ? profile : straight; }

    function pathError(path, ref) {
      if (!path || path.length < 2) return 8;
      var errs = [];
      for (var i = 0; i < ref.length; i++) {
        var best = Infinity;
        for (var k = 0; k < path.length; k++) best = Math.min(best, dist(ref[i], path[k]));
        errs.push(Math.min(best, 14));
      }
      return mean(errs);
    }

    level.pointer = function (run, ev) {
      if (run.phase !== 'play') return;
      var s = run.s;
      var id = stepId(level, run);
      if (id === 'miter') {
        var hub = pt(70, 86);
        var tip = add(hub, pt(Math.cos(s.blade) * 36, Math.sin(s.blade) * 36));
        var onSaw = dist(ev, tip) < 14 || pointSegDist(ev, hub, tip).dist < 8;
        if (ev.type === 'down') {
          if (onSaw) run.drag = { mode: 'miter' };
        } else if (ev.type === 'move' && run.drag && run.drag.mode === 'miter') {
          s.blade = Math.atan2(ev.y - hub.y, ev.x - hub.x);
          if (angDiff(s.blade, fenceIn) < 0.09) { s.blade = fenceIn; s.fenceHot = 'inside'; }
          else if (angDiff(s.blade, fenceOut) < 0.09) { s.blade = fenceOut; s.fenceHot = 'outside'; }
          else s.fenceHot = null;
        } else if (ev.type === 'up') run.drag = null;
        return;
      }
      if (id === 'pencil' || id === 'cope') {
        var ref = id === 'pencil' ? revealed(s) : (s.pencil.length > 1 ? s.pencil : revealed(s));
        if (ev.type === 'down') run.drag = { mode: id };
        if ((ev.type === 'down' || ev.type === 'move') && run.drag && run.drag.mode === id) {
          var near = closestOnPoly(pt(ev.x, ev.y), ref);
          if (near.dist > 16) return;
          var q = near.dist < 6.5 ? near.point : pt(ev.x, ev.y);
          var arr = id === 'pencil' ? s.pencil : s.cope;
          if (!arr.length || dist(q, arr[arr.length - 1]) > 2.2) arr.push(q);
        }
        if (ev.type === 'up') run.drag = null;
        return;
      }
      if (id === 'bevel') dragBevel(run, ev);
    };

    level.actionFor = function (run) {
      var id = stepId(level, run);
      if (id === 'miter') return { label: 'Cut the miter', enabled: !!run.s.fenceHot };
      if (id === 'pencil') return { label: 'Pencil done', enabled: run.s.pencil.length > 3 };
      if (id === 'cope') return { label: 'Cope done', enabled: run.s.cope.length > 3 };
      if (id === 'bevel') return { label: 'Set the bevel', enabled: true };
      if (id === 'fit') return { label: 'Test the fit', enabled: true };
      return null;
    };

    level.seatText = function (run) {
      var id = stepId(level, run);
      if (id === 'miter' && run.s.fenceHot === 'inside') return 'Saw seated on the inside fence';
      if (id === 'miter' && run.s.fenceHot === 'outside') return 'Saw seated on the outside fence';
      if (id === 'bevel') return bevelWords(run.s.bevel, 'cope');
      return '';
    };

    level.onAction = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'miter') {
        if (!s.fenceHot) { run.fumbles += 1; return; }
        s.fence = s.fenceHot;
        s.miterCut = true;
        completeStep(level, run, s.fence === 'inside' ? 0 : 6, s.fence === 'inside' ? '' : 'The miter faces the wrong way, so the profile never shows.');
        return;
      }
      if (id === 'pencil') {
        var dev = pathError(s.pencil, profile);
        completeStep(level, run, dev, dev >= 0.35 ? 'The pencil left the profile.' : '');
        return;
      }
      if (id === 'cope') {
        var copeDev = pathError(s.cope, profile);
        var pencilDev = pathError(s.pencil, profile);
        var extra = Math.max(0, copeDev - pencilDev);
        completeStep(level, run, extra, extra >= 0.35 ? 'The coping saw left the pencil line.' : '');
        return;
      }
      if (id === 'bevel') {
        s.bevelSet = true;
        var pen = bevelPenalty(s.bevel);
        completeStep(level, run, pen, pen >= 0.35 ? 'The back of the cope was not relieved, so the joint opens.' : '');
        return;
      }
      if (id === 'fit') completeStep(level, run, 0, '');
    };

    level.hint = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'miter') {
        s.blade = fenceIn;
        s.fenceHot = 'inside';
        level.onAction(run);
        return;
      }
      if (id === 'pencil') {
        s.pencil = revealed(s).map(function (p) { return pt(p.x, p.y); });
        level.onAction(run);
        return;
      }
      if (id === 'cope') {
        var ref = s.pencil.length > 1 ? s.pencil : revealed(s);
        s.cope = ref.map(function (p) { return pt(p.x, p.y); });
        level.onAction(run);
        return;
      }
      if (id === 'bevel') {
        s.bevel = 0.22;
        level.onAction(run);
        return;
      }
      if (id === 'fit') level.onAction(run);
    };

    level.measure = function (run) {
      var s = run.s;
      return pathError(s.cope.length ? s.cope : s.pencil, profile) + bevelPenalty(s.bevel);
    };

    level.scene = function (run) {
      var view = viewOf(level, run);
      var s = view.s;
      var items = [paper()];
      if (!s.miterCut) {
        items.push({ op: 'rect', x: 24, y: 78, w: 70, h: 16, fill: '#e4c48a', stroke: '#8a6434', sw: 1 });
        items.push({ op: 'text', t: 'face', x: 30, y: 72, size: 12, color: '#5c564f' });
        items.push({ op: 'line', a: pt(70, 86), b: add(pt(70, 86), pt(Math.cos(fenceIn) * 34, Math.sin(fenceIn) * 34)), stroke: 'rgba(91,155,213,0.85)', sw: 1.3, dash: [3, 2] });
        items.push({ op: 'line', a: pt(70, 86), b: add(pt(70, 86), pt(Math.cos(fenceOut) * 34, Math.sin(fenceOut) * 34)), stroke: 'rgba(91,155,213,0.85)', sw: 1.3, dash: [3, 2] });
        items.push({ op: 'arc', c: pt(70, 86), r: 30, a0: fenceOut, a1: fenceIn, stroke: '#c4923a', sw: 2 });
        items.push({ op: 'text', t: 'back', x: 96, y: 58, size: 12, color: '#3d6f99' });
        items.push({ op: 'text', t: 'profile', x: 96, y: 116, size: 12, color: '#3d6f99' });
        var sawTip = add(pt(70, 86), pt(Math.cos(s.blade) * 36, Math.sin(s.blade) * 36));
        items.push({ op: 'line', a: pt(70, 86), b: sawTip, stroke: s.fenceHot ? '#c4923a' : '#2e3844', sw: 2.4 });
        items.push({ op: 'grip', c: sawTip, r: 5.4, label: 'saw', lx: 7, ly: -2 });
      } else {
        items.push({ op: 'poly', pts: [pt(8, 36)].concat(profile).concat([pt(8, 132)]), fill: '#d7b48a', stroke: '#8a6434', sw: 1 });
        items.push({ op: 'polyline', pts: profile, stroke: '#5c564f', sw: 1.6 });
        if (s.pencil.length > 1) items.push({ op: 'polyline', pts: s.pencil, stroke: '#241c14', sw: 1.35 });
        if (s.cope.length > 1) items.push({ op: 'polyline', pts: s.cope.map(function (p) { return pt(p.x + 1.4, p.y); }), stroke: '#8a5a20', sw: 1.2 });
        if ((run.phase === 'play' || run.replay != null) && (view.step === 1 || view.step === 2)) {
          items.push({ op: 'text', t: 'trace', x: 46, y: 30, size: 12, color: '#3d6f99' });
        }
      }
      return { items: items };
    };
    level.sectionScene = function (run) { return bevelStepScene(level, run, 'cope'); };
    return level;
  }

  /* ---------- circle center ---------- */

  function buildCenter() {
    var C = pt(60, 88);
    var R = 34;
    var level = {
      id: 'center',
      name: 'Find the Center',
      technique: 'Square on a circle',
      geometry: 'A right angle standing on a circle marks a diameter. Two diameters cross at the center.',
      blurb: 'Set the square’s corner on the rim twice. The chords cross in the middle.',
      hard: false,
      tutorial: null,
      C: C,
      R: R,
      steps: [
        { id: 'd1', label: 'Diameter', instruction: 'Drag the corner onto the rim, then drag the leg so both cross it.' },
        { id: 'd2', label: 'Diameter', instruction: 'Drag the corner to another spot on the rim, then mark again.' },
        { id: 'prick', label: 'Prick', instruction: 'Prick where the two chords cross.' }
      ]
    };

    level.create = function () {
      return fresh(level, {
        corner: pt(60, 40),
        ang: 0.4,
        chords: []
      });
    };

    function farHit(P, ang) {
      var dir = pt(Math.cos(ang), Math.sin(ang));
      var ts = rayCircleTs(P, dir, C, R);
      var best = null;
      for (var i = 0; i < ts.length; i++) {
        if (ts[i] > 2 && (!best || ts[i] > best)) best = ts[i];
      }
      if (best == null) return null;
      return add(P, mul(dir, best));
    }

    function chordOf(s) {
      var a = farHit(s.corner, s.ang);
      var b = farHit(s.corner, s.ang + Math.PI / 2);
      if (!a || !b) return null;
      return { a: a, b: b, corner: pt(s.corner.x, s.corner.y) };
    }

    function onRim(s) {
      return Math.abs(dist(s.corner, C) - R) < 0.8;
    }

    function legTip(s) {
      var reach = 48;
      var dir = pt(Math.cos(s.ang), Math.sin(s.ang));
      var p = add(s.corner, mul(dir, reach));
      var guard = 0;
      while ((p.x < 12 || p.x > 108 || p.y < 14 || p.y > 156) && reach > 18 && guard < 10) {
        reach -= 4;
        p = add(s.corner, mul(dir, reach));
        guard++;
      }
      return p;
    }

    level.pointer = function (run, ev) {
      if (run.phase !== 'play') return;
      var s = run.s;
      var id = stepId(level, run);
      if (id !== 'd1' && id !== 'd2') return;
      var tip = legTip(s);
      if (ev.type === 'down') {
        if (dist(ev, tip) < 14) run.drag = { mode: 'rot' };
        else if (dist(ev, s.corner) < 14 || pointSegDist(ev, s.corner, tip).dist < 8) run.drag = { mode: 'move', px: ev.x, py: ev.y, c: pt(s.corner.x, s.corner.y) };
      } else if (ev.type === 'move' && run.drag) {
        if (run.drag.mode === 'rot') s.ang = Math.atan2(ev.y - s.corner.y, ev.x - s.corner.x);
        else {
          s.corner = pt(run.drag.c.x + ev.x - run.drag.px, run.drag.c.y + ev.y - run.drag.py);
          var dd = dist(s.corner, C);
          if (Math.abs(dd - R) < 6) {
            var dir = norm(sub(s.corner, C));
            s.corner = add(C, mul(dir, R));
          }
        }
      } else if (ev.type === 'up') run.drag = null;
    };

    level.actionFor = function (run) {
      var id = stepId(level, run);
      if (id === 'd1' || id === 'd2') return { label: 'Mark the chord', enabled: !!chordOf(run.s) };
      if (id === 'prick') return { label: 'Prick the crossing', enabled: run.s.chords.length >= 2 };
      return null;
    };

    level.seatText = function (run) {
      var id = stepId(level, run);
      if ((id === 'd1' || id === 'd2') && onRim(run.s)) return 'Corner seated on the rim';
      if ((id === 'd1' || id === 'd2') && !chordOf(run.s)) return 'Turn the leg until both ends cross the rim';
      return '';
    };

    function missAmount(chord) {
      if (!chord) return 8;
      return pointLineDist(C, chord.a, chord.b);
    }

    level.onAction = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'd1' || id === 'd2') {
        var ch = chordOf(s);
        if (!ch) { run.fumbles += 1; return; }
        var dev = missAmount(ch) * 2;
        if (!onRim(s)) dev = Math.max(dev, dist(s.corner, C) > 0 ? Math.abs(dist(s.corner, C) - R) : 4);
        s.chords.push(ch);
        var note = '';
        if (!onRim(s)) note = 'The corner was off the rim, so the chord is not a diameter.';
        else if (dev >= 0.35) note = 'The legs did not both stand on the circle.';
        completeStep(level, run, dev, note);
        return;
      }
      if (id === 'prick') {
        completeStep(level, run, 0, '');
      }
    };

    function placeSquare(s, phi) {
      s.corner = pt(C.x + Math.cos(phi) * R, C.y + Math.sin(phi) * R);
      var inward = phi + Math.PI;
      s.ang = inward - Math.PI / 4;
    }

    level.hint = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'd1') {
        placeSquare(s, -Math.PI / 2);
        level.onAction(run);
        return;
      }
      if (id === 'd2') {
        placeSquare(s, -Math.PI / 2 + 70 * Math.PI / 180);
        level.onAction(run);
        return;
      }
      if (id === 'prick') level.onAction(run);
    };

    level.measure = function (run) {
      var s = run.s;
      if (s.chords.length < 2) return 12;
      var hit = lineIntersect(s.chords[0].a, s.chords[0].b, s.chords[1].a, s.chords[1].b);
      if (!hit) return 10;
      var ang = lineDiff(
        Math.atan2(s.chords[0].b.y - s.chords[0].a.y, s.chords[0].b.x - s.chords[0].a.x),
        Math.atan2(s.chords[1].b.y - s.chords[1].a.y, s.chords[1].b.x - s.chords[1].a.x)
      );
      var sine = Math.abs(Math.sin(ang * 2));
      /* lineDiff is already 0..π/2, sin of that angle is the crossing sharpness */
      sine = Math.abs(Math.sin(ang));
      var smear = sine < 0.5 ? (0.5 - sine) * 8 : 0;
      return dist(hit.point, C) + smear;
    };

    level.scene = function (run) {
      var view = viewOf(level, run);
      var s = view.s;
      var items = [paper()];
      items.push({ op: 'circle', c: C, r: R, fill: '#e4c48a', stroke: '#8a6434', sw: 1.4 });
      s.chords.forEach(function (ch) {
        items.push({ op: 'line', a: ch.a, b: ch.b, stroke: '#241c14', sw: 1.45 });
      });
      if (s.chords.length >= 2) {
        var hit = lineIntersect(s.chords[0].a, s.chords[0].b, s.chords[1].a, s.chords[1].b);
        if (hit) items.push({ op: 'circle', c: hit.point, r: 1.8, fill: '#241c14', stroke: '', sw: 0 });
      }
      if (run.phase === 'result' && run.replay == null) {
        items.push({ op: 'circle', c: C, r: 1.2, fill: 'rgba(76,175,80,0.0)', stroke: 'rgba(76,175,80,0.9)', sw: 1 });
        var hit2 = s.chords.length >= 2 ? lineIntersect(s.chords[0].a, s.chords[0].b, s.chords[1].a, s.chords[1].b) : null;
        if (hit2 && dist(hit2.point, C) > 0.4) {
          items.push({ op: 'line', a: hit2.point, b: C, stroke: 'rgba(231,76,60,0.9)', sw: 1.4 });
        }
      }
      if ((run.phase === 'play' || run.replay != null) && (view.step === 0 || view.step === 1)) {
        items.push({ op: 'square', x: s.corner.x, y: s.corner.y, ang: s.ang, hot: onRim(s), leg: 50, stock: 36, tipLabel: 'turn', heelLabel: 'corner', tipAt: legTip(s) });
      }
      return { items: items };
    };
    return level;
  }

  /* ---------- hexagon ---------- */

  function buildHex() {
    var C = pt(60, 86);
    var R = 32;
    var level = {
      id: 'hex',
      name: 'Hexagon',
      technique: 'Compass stepping the radius',
      geometry: 'The side of a regular hexagon equals the radius, so the opening that drew the circle cuts it into six.',
      blurb: 'Lock the compass on the rim, then step that same opening around the circle.',
      hard: false,
      tutorial: null,
      C: C,
      R: R,
      steps: [
        { id: 'lock', label: 'Lock', instruction: 'Drag the point to the center and the pencil to the rim, then lock.' },
        { id: 'circle', label: 'Circle', instruction: 'Drag the point onto the center, then strike the circle.' },
        { id: 'step', label: 'Step', instruction: 'Drag the point onto the last prick, then strike the next crossing.' },
        { id: 'join', label: 'Join', instruction: 'Join the points and cut.' }
      ]
    };

    level.create = function () {
      return fresh(level, {
        point: pt(78, 100),
        span: 18,
        tilt: 0.5,
        locked: false,
        struck: false,
        verts: []
      });
    };

    function pencilOf(s) { return compassPencil(s.point, s.span, s.tilt); }

    function seats(s) {
      var pencil = pencilOf(s);
      var pointHot = dist(s.point, C) < 5.5;
      var rimD = Math.abs(dist(pencil, C) - R);
      var pencilHot = pointHot ? rimD < 5.5 && dist(pencil, C) > 4 : Math.abs(dist(pencil, C) - R) < 5.5;
      return { pencil: pencil, pointHot: pointHot, pencilHot: pencilHot };
    }

    function apply(s) {
      if (dist(s.point, C) < 5.5) s.point = pt(C.x, C.y);
      var pencil = pencilOf(s);
      if (dist(s.point, C) < 0.8 && Math.abs(dist(pencil, C) - R) < 5.5) {
        var dir = norm(sub(pencil, C));
        if (len(sub(pencil, C)) < 1) dir = pt(1, 0);
        var stuck = add(C, mul(dir, R));
        s.span = dist(s.point, stuck);
        s.tilt = Math.atan2(stuck.y - s.point.y, stuck.x - s.point.x);
      }
    }

    function hitCompass(s, p) {
      var pencil = pencilOf(s);
      if (dist(p, s.point) < 8) return 'point';
      if (dist(p, pencil) < 8) return 'pencil';
      if (pointSegDist(p, s.point, pencil).dist < 6) return 'body';
      return '';
    }

    function nextVertex(s) {
      if (!s.verts.length) return null;
      var from = s.verts[s.verts.length - 1];
      var hits = circleCircle(C, s.span, from.at, s.span);
      if (hits.length < 2) return null;
      var prevAng = Math.atan2(from.at.y - C.y, from.at.x - C.x);
      var want = angNorm(prevAng + Math.PI / 3);
      var best = hits[0];
      var bestD = 99;
      hits.forEach(function (h) {
        var a = Math.atan2(h.y - C.y, h.x - C.x);
        var d = angDiff(a, want);
        if (d < bestD) { bestD = d; best = h; }
      });
      return best;
    }

    level.pointer = function (run, ev) {
      if (run.phase !== 'play') return;
      var s = run.s;
      var id = stepId(level, run);
      if (id === 'lock' || id === 'step' || id === 'circle') {
        if (ev.type === 'down') {
          var hit = hitCompass(s, ev);
          if (!hit) return;
          run.drag = { mode: hit, px: ev.x, py: ev.y, point: pt(s.point.x, s.point.y), span: s.span, tilt: s.tilt };
        } else if (ev.type === 'move' && run.drag) {
          if (s.locked && run.drag.mode === 'pencil') return;
          if (run.drag.mode === 'pencil' && !s.locked) {
            s.span = clamp(dist(s.point, pt(ev.x, ev.y)), 6, 50);
            s.tilt = Math.atan2(ev.y - s.point.y, ev.x - s.point.x);
          } else {
            s.point = pt(run.drag.point.x + ev.x - run.drag.px, run.drag.point.y + ev.y - run.drag.py);
          }
          if (!s.locked) apply(s);
          else if (id === 'step' && s.verts.length) {
            var from = s.verts[s.verts.length - 1];
            if (dist(s.point, from.at) < 7) s.point = pt(from.at.x, from.at.y);
            else {
              var any = null;
              s.verts.forEach(function (v) { if (dist(s.point, v.at) < 6) any = v.at; });
              if (any) s.point = pt(any.x, any.y);
            }
          } else if (id === 'circle' && dist(s.point, C) < 6) s.point = pt(C.x, C.y);
        } else if (ev.type === 'up') run.drag = null;
      }
    };

    level.actionFor = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'lock') return { label: 'Lock compass', enabled: true };
      if (id === 'circle') return { label: 'Strike the circle', enabled: dist(s.point, C) < 0.8 && s.locked };
      if (id === 'step') return { label: 'Strike the next', enabled: s.verts.length > 0 && s.verts.length < 7 && dist(s.point, s.verts[s.verts.length - 1].at) < 0.8 };
      if (id === 'join') return { label: 'Join and cut', enabled: s.verts.length >= 6 };
      return null;
    };

    level.seatText = function (run) {
      var id = stepId(level, run);
      var info = seats(run.s);
      if (id === 'lock' && info.pointHot && info.pencilHot) return 'Both legs seated';
      if (id === 'circle' && dist(run.s.point, C) < 0.8) return 'Point seated on the center';
      if (id === 'step' && run.s.verts.length && dist(run.s.point, run.s.verts[run.s.verts.length - 1].at) < 0.8) return 'Point seated on the last prick';
      return '';
    };

    level.instruct = function (run) {
      var id = stepId(level, run);
      var base = level.steps[Math.min(run.step, level.steps.length - 1)].instruction;
      if (id === 'circle' && dist(run.s.point, C) >= 0.8) return 'Drag the compass point onto the center, then strike.';
      if (id === 'step') {
        var seated = run.s.verts.length && dist(run.s.point, run.s.verts[run.s.verts.length - 1].at) < 0.8;
        if (!seated) return 'Drag the compass point onto the last prick, then strike.';
        return base + ' ' + Math.min(run.s.verts.length, 6) + ' of 6.';
      }
      return base;
    };

    level.onAction = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'lock') {
        apply(s);
        s.locked = true;
        var dev = Math.abs(s.span - R);
        var info = seats(s);
        var note = '';
        if (!(info.pointHot && info.pencilHot)) note = 'The compass was not seated from the center to the rim.';
        else if (dev >= 0.35) note = 'The opening does not reach the rim.';
        completeStep(level, run, dev, note);
        return;
      }
      if (id === 'circle') {
        if (dist(s.point, C) > 0.8) { run.fumbles += 1; return; }
        s.struck = true;
        var start = pt(C.x + Math.cos(-Math.PI / 2) * s.span, C.y + Math.sin(-Math.PI / 2) * s.span);
        s.verts = [{ at: start, err: 0 }];
        completeStep(level, run, 0, '');
        return;
      }
      if (id === 'step') {
        if (!s.verts.length || dist(s.point, s.verts[s.verts.length - 1].at) > 0.8) { run.fumbles += 1; return; }
        var nxt = nextVertex(s);
        if (!nxt) { run.fumbles += 1; return; }
        if (s.verts.length >= 6) {
          s.closure = dist(nxt, s.verts[0].at);
          var devC = s.closure;
          completeStep(level, run, devC, devC >= 0.35 ? 'The last step did not land on the first prick.' : '');
          return;
        }
        var idealAng = -Math.PI / 2 + s.verts.length * Math.PI / 3;
        var ideal = pt(C.x + Math.cos(idealAng) * s.span, C.y + Math.sin(idealAng) * s.span);
        var err = dist(nxt, ideal);
        s.verts.push({ at: nxt, err: err });
        if (s.verts.length === 6) {
          /* the sixth vertex is index 5; one more strike closes */
        }
        return;
      }
      if (id === 'join') completeStep(level, run, 0, '');
    };

    level.hint = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'lock') {
        s.point = pt(C.x, C.y);
        s.span = R;
        s.tilt = -Math.PI / 2;
        level.onAction(run);
        return;
      }
      if (id === 'circle') {
        s.point = pt(C.x, C.y);
        level.onAction(run);
        return;
      }
      if (id === 'step') {
        s.point = pt(s.verts[s.verts.length - 1].at.x, s.verts[s.verts.length - 1].at.y);
        level.onAction(run);
        return;
      }
      if (id === 'join') level.onAction(run);
    };

    level.measure = function (run) {
      var s = run.s;
      var closure = s.closure != null ? s.closure : (s.verts.length >= 6 ? 0 : 10);
      if (s.closure == null && s.verts.length >= 6) {
        var nxt = (function () {
          var from = s.verts[5];
          var hits = circleCircle(C, s.span, from.at, s.span);
          if (hits.length < 2) return s.verts[0].at;
          var prevAng = Math.atan2(from.at.y - C.y, from.at.x - C.x);
          var want = angNorm(prevAng + Math.PI / 3);
          var best = hits[0];
          var bestD = 99;
          hits.forEach(function (h) {
            var a = Math.atan2(h.y - C.y, h.x - C.x);
            var d = angDiff(a, want);
            if (d < bestD) { bestD = d; best = h; }
          });
          return best;
        })();
        closure = dist(nxt, s.verts[0].at);
      }
      return Math.abs(s.span - R) + closure;
    };

    level.scene = function (run) {
      var view = viewOf(level, run);
      var s = view.s;
      var items = [paper()];
      items.push({ op: 'circle', c: C, r: R, fill: '#e4c48a', stroke: '#8a6434', sw: 1.3 });
      items.push({ op: 'circle', c: C, r: 1.3, fill: '#241c14', stroke: '', sw: 0 });
      if (s.struck) {
        items.push({ op: 'circle', c: C, r: s.span, fill: '', stroke: '#5b9bd5', sw: 1.1, dash: [4, 3] });
      }
      if (s.verts.length) {
        var poly = s.verts.map(function (v) { return v.at; });
        items.push({ op: 'polyline', pts: run.phase === 'result' ? poly.concat([poly[0]]) : poly, stroke: '#241c14', sw: 1.45 });
        s.verts.forEach(function (v) {
          items.push({ op: 'circle', c: v.at, r: 1.5, fill: '#241c14', stroke: '', sw: 0 });
        });
      }
      if (run.phase === 'play' || run.replay != null) {
        if (view.step <= 2) {
          var info = seats(s);
          items.push({ op: 'compass', point: s.point, span: s.span, tilt: s.tilt, hotP: info.pointHot || (view.step === 2 && s.verts.length && dist(s.point, s.verts[s.verts.length - 1].at) < 0.8), hotN: info.pencilHot, names: true });
        }
      }
      return { items: items };
    };
    return level;
  }

  /* ---------- octagon ---------- */

  function buildOct() {
    var x0 = 30;
    var y0 = 50;
    var side = 72;
    var x1 = x0 + side;
    var y1 = y0 + side;
    var corners = [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];
    var edges = [
      [corners[0], corners[1]],
      [corners[1], corners[2]],
      [corners[2], corners[3]],
      [corners[3], corners[0]]
    ];
    var C = pt((x0 + x1) / 2, (y0 + y1) / 2);
    var idealSpan = dist(corners[0], C);
    var mids = edges.map(function (e) { return pt((e[0].x + e[1].x) / 2, (e[0].y + e[1].y) / 2); });

    function idealMarks() {
      var marks = [];
      corners.forEach(function (corner) {
        edges.forEach(function (e) {
          if (dist(corner, e[0]) > 0.2 && dist(corner, e[1]) > 0.2) return;
          segCircle(e[0], e[1], corner, idealSpan).forEach(function (h) {
            if (dist(h, corner) > 2) marks.push(h);
          });
        });
      });
      return marks;
    }
    var ideals = idealMarks();

    var level = {
      id: 'octagon',
      name: 'Octagon',
      technique: 'Compass from the diagonals',
      geometry: 'Half the diagonal is the compass opening that marks an equal chamfer on every side.',
      blurb: 'Cross the diagonals, open the compass to that center, and swing an arc from each corner.',
      hard: false,
      tutorial: null,
      corners: corners,
      C: C,
      ideals: ideals,
      steps: [
        { id: 'diag', label: 'Diagonals', instruction: 'Drag an end onto two opposite corners, then knife. Then the other pair.' },
        { id: 'lock', label: 'Lock', instruction: 'Drag the point to a corner and the pencil to the crossing, then lock.' },
        { id: 'arcs', label: 'Arcs', instruction: 'Drag the point onto a corner, then swing the arc across both sides.' },
        { id: 'join', label: 'Join', instruction: 'Join the eight marks and cut.' }
      ]
    };

    level.create = function () {
      return fresh(level, {
        barA: pt(48, 78),
        barB: pt(96, 70),
        diags: [],
        point: pt(70, 100),
        span: 20,
        tilt: 0.2,
        locked: false,
        marks: [],
        swung: []
      });
    };

    function crossDiags(s) {
      if (s.diags.length < 2) return null;
      var hit = lineIntersect(s.diags[0].a, s.diags[0].b, s.diags[1].a, s.diags[1].b);
      return hit ? hit.point : null;
    }

    function trySeatBar(s) {
      var pairs = [[corners[0], corners[2]], [corners[1], corners[3]]];
      var hit = null;
      pairs.forEach(function (pair, idx) {
        if (s.diags.some(function (d) { return d.idx === idx; })) return;
        if (pointLineDist(pair[0], s.barA, s.barB) < 5 && pointLineDist(pair[1], s.barA, s.barB) < 5) hit = { idx: idx, pair: pair };
      });
      if (!hit) { s.barHot = false; return; }
      s.barA = pt(hit.pair[0].x, hit.pair[0].y);
      s.barB = pt(hit.pair[1].x, hit.pair[1].y);
      s.barHot = true;
      s.barIdx = hit.idx;
    }

    function pencilOf(s) { return compassPencil(s.point, s.span, s.tilt); }

    function applyCompass(s) {
      var corner = null;
      corners.forEach(function (c) { if (dist(s.point, c) < 6) corner = c; });
      if (corner) s.point = pt(corner.x, corner.y);
      var pencil = pencilOf(s);
      var target = null;
      var cross = crossDiags(s);
      if (cross && dist(pencil, cross) < 6.5) target = cross;
      mids.forEach(function (m) { if (dist(pencil, m) < 6) target = m; });
      if (target && corner) {
        s.span = dist(s.point, target);
        s.tilt = Math.atan2(target.y - s.point.y, target.x - s.point.x);
        s.pencilHot = true;
        s.onCenter = cross && dist(target, cross) < 0.5;
      } else s.pencilHot = false;
    }

    level.pointer = function (run, ev) {
      if (run.phase !== 'play') return;
      var s = run.s;
      var id = stepId(level, run);
      if (id === 'diag') {
        if (ev.type === 'down') {
          var da = dist(ev, s.barA);
          var db = dist(ev, s.barB);
          if (da < 12 && da <= db) run.drag = { end: 'a' };
          else if (db < 12) run.drag = { end: 'b' };
          else if (pointSegDist(ev, s.barA, s.barB).dist < 7) run.drag = { end: 'body', px: ev.x, py: ev.y, a: pt(s.barA.x, s.barA.y), b: pt(s.barB.x, s.barB.y) };
        } else if (ev.type === 'move' && run.drag) {
          if (run.drag.end === 'a') s.barA = pt(ev.x, ev.y);
          else if (run.drag.end === 'b') s.barB = pt(ev.x, ev.y);
          else {
            s.barA = pt(run.drag.a.x + ev.x - run.drag.px, run.drag.a.y + ev.y - run.drag.py);
            s.barB = pt(run.drag.b.x + ev.x - run.drag.px, run.drag.b.y + ev.y - run.drag.py);
          }
          trySeatBar(s);
        } else if (ev.type === 'up') run.drag = null;
        return;
      }
      if (id === 'lock' || id === 'arcs') {
        var pencil = pencilOf(s);
        if (ev.type === 'down') {
          var mode = '';
          if (dist(ev, s.point) < 8) mode = 'point';
          else if (!s.locked && dist(ev, pencil) < 8) mode = 'pencil';
          else if (pointSegDist(ev, s.point, pencil).dist < 6) mode = 'body';
          if (!mode) return;
          run.drag = { mode: mode, px: ev.x, py: ev.y, point: pt(s.point.x, s.point.y) };
        } else if (ev.type === 'move' && run.drag) {
          if (run.drag.mode === 'pencil') {
            s.span = clamp(dist(s.point, pt(ev.x, ev.y)), 6, 80);
            s.tilt = Math.atan2(ev.y - s.point.y, ev.x - s.point.x);
          } else {
            s.point = pt(run.drag.point.x + ev.x - run.drag.px, run.drag.point.y + ev.y - run.drag.py);
          }
          if (!s.locked) applyCompass(s);
          else {
            var corner = null;
            corners.forEach(function (c) { if (dist(s.point, c) < 7) corner = c; });
            if (corner) s.point = pt(corner.x, corner.y);
          }
        } else if (ev.type === 'up') run.drag = null;
      }
    };

    level.actionFor = function (run) {
      var id = stepId(level, run);
      if (id === 'diag') return { label: 'Knife the diagonal', enabled: !!run.s.barHot };
      if (id === 'lock') return { label: 'Lock compass', enabled: true };
      if (id === 'arcs') return { label: 'Swing the arc', enabled: corners.some(function (c) { return dist(run.s.point, c) < 0.8; }) };
      if (id === 'join') return { label: 'Join and cut', enabled: run.s.marks.length >= 4 };
      return null;
    };

    level.seatText = function (run) {
      var id = stepId(level, run);
      if (id === 'diag' && run.s.barHot) return 'Straightedge seated on two corners';
      if (id === 'lock' && run.s.pencilHot) return run.s.onCenter ? 'Pencil seated on the crossing' : 'Pencil seated on a reference';
      if (id === 'arcs' && corners.some(function (c) { return dist(run.s.point, c) < 0.8; })) return 'Point seated on a corner';
      return '';
    };

    level.instruct = function (run) {
      var id = stepId(level, run);
      var base = level.steps[Math.min(run.step, level.steps.length - 1)].instruction;
      if (id === 'diag') return base + ' ' + run.s.diags.length + ' of 2.';
      if (id === 'arcs') {
        var onCorner = corners.some(function (c) { return dist(run.s.point, c) < 0.8; });
        if (!onCorner) return 'Drag the compass point onto a corner, then swing the arc.';
        return base + ' ' + run.s.swung.length + ' of 4.';
      }
      return base;
    };

    function swing(s) {
      var corner = null;
      var idx = -1;
      corners.forEach(function (c, i) { if (dist(s.point, c) < 0.8) { corner = c; idx = i; } });
      if (!corner || s.swung.indexOf(idx) >= 0) return null;
      var marks = [];
      edges.forEach(function (e) {
        if (dist(corner, e[0]) > 0.2 && dist(corner, e[1]) > 0.2) return;
        segCircle(e[0], e[1], corner, s.span).forEach(function (h) {
          if (dist(h, corner) > 2) marks.push(h);
        });
      });
      return { idx: idx, marks: marks };
    }

    level.onAction = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'diag') {
        if (!s.barHot) { run.fumbles += 1; return; }
        s.diags.push({ a: pt(s.barA.x, s.barA.y), b: pt(s.barB.x, s.barB.y), idx: s.barIdx });
        s.barHot = false;
        if (s.diags.length >= 2) completeStep(level, run, 0, '');
        else {
          s.barA = pt(40, 90);
          s.barB = pt(100, 60);
        }
        return;
      }
      if (id === 'lock') {
        applyCompass(s);
        s.locked = true;
        var dev = Math.abs(s.span - idealSpan);
        var note = '';
        if (!s.onCenter) note = s.pencilHot ? 'The compass was seated on the middle of a side, not the crossing.' : 'The compass was locked off the corner and the crossing.';
        else if (dev >= 0.35) note = 'The opening does not reach from the corner to the center.';
        completeStep(level, run, dev, note);
        return;
      }
      if (id === 'arcs') {
        var sw = swing(s);
        if (!sw) { run.fumbles += 1; return; }
        s.swung.push(sw.idx);
        sw.marks.forEach(function (m) { s.marks.push(m); });
        if (s.swung.length >= 4) {
          var devA = Math.abs(s.span - idealSpan);
          completeStep(level, run, devA > 0.4 ? 0 : 0, '');
        }
        return;
      }
      if (id === 'join') completeStep(level, run, 0, '');
    };

    level.hint = function (run) {
      var id = stepId(level, run);
      var s = run.s;
      if (id === 'diag') {
        var pair = s.diags.length === 0 ? [corners[0], corners[2]] : [corners[1], corners[3]];
        s.barA = pt(pair[0].x, pair[0].y);
        s.barB = pt(pair[1].x, pair[1].y);
        s.barHot = true;
        s.barIdx = s.diags.length === 0 ? 0 : 1;
        level.onAction(run);
        return;
      }
      if (id === 'lock') {
        var cross = crossDiags(s) || C;
        s.point = pt(corners[0].x, corners[0].y);
        s.span = dist(s.point, cross);
        s.tilt = Math.atan2(cross.y - s.point.y, cross.x - s.point.x);
        s.onCenter = true;
        s.pencilHot = true;
        level.onAction(run);
        return;
      }
      if (id === 'arcs') {
        var idx = 0;
        while (s.swung.indexOf(idx) >= 0) idx++;
        s.point = pt(corners[idx].x, corners[idx].y);
        level.onAction(run);
        return;
      }
      if (id === 'join') level.onAction(run);
    };

    level.measure = function (run) {
      var s = run.s;
      if (!s.marks.length) return 14;
      var errs = ideals.map(function (m) {
        var best = Infinity;
        s.marks.forEach(function (p) { best = Math.min(best, dist(m, p)); });
        return Math.min(best, 18);
      });
      return mean(errs);
    };

    level.scene = function (run) {
      var view = viewOf(level, run);
      var s = view.s;
      var items = [paper()];
      items.push({ op: 'rect', x: x0, y: y0, w: side, h: side, fill: '#e4c48a', stroke: '#8a6434', sw: 1.3 });
      s.diags.forEach(function (d) {
        items.push({ op: 'line', a: d.a, b: d.b, stroke: '#5b9bd5', sw: 1.15, dash: [4, 3] });
      });
      var cross = crossDiags(s);
      if (cross) items.push({ op: 'circle', c: cross, r: 1.5, fill: '#241c14', stroke: '', sw: 0 });
      s.marks.forEach(function (m) {
        items.push({ op: 'circle', c: m, r: 1.5, fill: '#241c14', stroke: '', sw: 0 });
      });
      if (s.marks.length >= 8) {
        var ordered = s.marks.slice().sort(function (a, b) {
          return Math.atan2(a.y - C.y, a.x - C.x) - Math.atan2(b.y - C.y, b.x - C.x);
        });
        items.push({ op: 'polyline', pts: ordered.concat([ordered[0]]), stroke: '#241c14', sw: 1.45 });
      }
      if (run.phase === 'play' || run.replay != null) {
        if (view.step === 0) {
          items.push({ op: 'line', a: s.barA, b: s.barB, stroke: s.barHot ? '#c4923a' : '#2e3844', sw: 3 });
          items.push({ op: 'grip', c: s.barA, r: 5.2, label: 'end', lx: 7, ly: -6 });
          items.push({ op: 'grip', c: s.barB, r: 5.2, label: 'end', lx: 7, ly: -6 });
        }
        if (view.step === 1 || view.step === 2) {
          items.push({ op: 'compass', point: s.point, span: s.span, tilt: s.tilt, hotP: corners.some(function (c) { return dist(s.point, c) < 0.8; }), hotN: !!s.pencilHot, names: true });
          if (view.step === 2 && s.locked) {
            var pc = null;
            corners.forEach(function (c) { if (dist(s.point, c) < 0.8) pc = c; });
            if (pc) items.push({ op: 'arc', c: pc, r: s.span, a0: 0, a1: Math.PI * 2, stroke: 'rgba(91,155,213,0.35)', sw: 1, dash: [3, 3] });
          }
        }
      }
      return { items: items };
    };
    return level;
  }

  var levels = [
    buildButt(),
    buildScribe({
      id: 'scribe',
      name: 'Compass Scribe',
      geometry: 'The compass copies the wall sideways by one fixed opening — a slide, not a copy that follows the wall’s tilt.',
      blurb: 'Level the panel, lock the compass on the widest gap, and trace the wall.',
      hard: false,
      wallFn: function (t) { return 22 + 9 * Math.sin(Math.PI * t) + 2.4 * Math.sin(3 * Math.PI * t + 0.4); },
      y0: 34,
      y1: 150,
      n: 48,
      frontX: 46,
      backX: 96,
      angle0: 0.055,
      span0: 12,
      tilt0: 0.42,
      point0: pt(74, 92),
      seat: 7.6
    }),
    buildTick(),
    buildBisect(),
    buildCope(),
    buildCenter(),
    buildHex(),
    buildOct(),
    buildScribe({
      id: 'stone',
      name: 'Stone Scribe',
      geometry: 'Same sideways slide as the wavy wall. Stone just gives the compass more chances to tilt.',
      blurb: 'Hard mode. A brick and stone wall. Find the widest gap and do not tip the legs.',
      hard: true,
      wallFn: function (t) {
        return 20
          + 6.2 * Math.sin(2 * Math.PI * t + 0.2)
          + 3.3 * Math.sin(5 * Math.PI * t + 0.7)
          + 2.1 * Math.sin(9 * Math.PI * t + 1.2)
          + 1.15 * Math.sin(15 * Math.PI * t);
      },
      y0: 32,
      y1: 152,
      n: 56,
      frontX: 44,
      backX: 98,
      angle0: 0.07,
      span0: 10,
      tilt0: 0.5,
      point0: pt(76, 96),
      seat: 4.4
    })
  ];

  function createRun(level) { return level.create(); }

  function pointer(level, run, ev) {
    if (!run || run.phase !== 'play') return run;
    level.pointer(run, ev);
    return run;
  }

  function action(level, run) {
    if (!run || run.phase !== 'play') return run;
    var spec = level.actionFor(run);
    if (!spec || !spec.enabled) {
      run.fumbles += 1;
      return run;
    }
    level.onAction(run);
    return run;
  }

  function hint(level, run) {
    if (!run || run.phase !== 'play') return run;
    run.hints += 1;
    level.hint(run);
    return run;
  }

  function restart(level, run) {
    var tries = (run && run.tries ? run.tries : 1) + 1;
    var next = level.create();
    next.tries = tries;
    return next;
  }

  function scene(level, run) {
    return level.scene(run);
  }

  function section(level, run) {
    if (!level || !level.sectionScene) return null;
    return level.sectionScene(run);
  }

  var PF = {
    VIEW: VIEW,
    SECTION: SECTION,
    levels: levels,
    layout: layout,
    layoutBox: layoutBox,
    createRun: createRun,
    pointer: pointer,
    action: action,
    hint: hint,
    restart: restart,
    scene: scene,
    section: section,
    hud: hud,
    pt: pt,
    dist: dist
  };

  root.PF = PF;
  if (typeof module !== 'undefined' && module.exports) module.exports = PF;

  function runTests() {
    var failed = 0;
    function assert(cond, msg) {
      if (!cond) {
        failed++;
        console.error('FAIL', msg);
      }
    }
    assert(levels.length === 9, 'nine levels');
    var ids = {};
    levels.forEach(function (level) {
      assert(!ids[level.id], 'unique id ' + level.id);
      ids[level.id] = true;
      assert(level.geometry && level.geometry.length > 20, level.id + ' geometry');
      assert(!/\d+(\.\d+)?\s*(mm|deg)/i.test(level.geometry), level.id + ' geometry has a readout');
      level.steps.forEach(function (s) {
        assert(!/\d+(\.\d+)?\s*mm/.test(s.instruction), level.id + ' instruction readout ' + s.instruction);
      });
      var run = createRun(level);
      var guard = 0;
      var scenes = 0;
      while (run.phase === 'play' && guard < 40) {
        var before = run.step + ':' + (level.id === 'tick' ? run.s.ticks.length : 0) + ':' + (run.s.verts ? run.s.verts.length : 0) + ':' + (run.s.pricks ? run.s.pricks.length : 0) + ':' + (run.s.swung ? run.s.swung.length : 0) + ':' + (run.s.diags ? run.s.diags.length : 0);
        var sc = scene(level, run);
        assert(sc.items && sc.items.length > 2, level.id + ' scene at ' + before);
        scenes++;
        hint(level, run);
        var after = run.step + ':' + (level.id === 'tick' ? run.s.ticks.length : 0) + ':' + (run.s.verts ? run.s.verts.length : 0) + ':' + (run.s.pricks ? run.s.pricks.length : 0) + ':' + (run.s.swung ? run.s.swung.length : 0) + ':' + (run.s.diags ? run.s.diags.length : 0);
        assert(before !== after || run.phase === 'result', level.id + ' hint made progress at ' + before);
        guard++;
      }
      assert(run.phase === 'result', level.id + ' hint finishes, phase ' + run.phase + ' step ' + run.step);
      assert(run.result.gap < 0.25, level.id + ' hint gap ' + (run.result ? run.result.gap.toFixed(3) : 'none'));
      assert(run.result.stars === 0, level.id + ' hints cost the stars, got ' + (run.result && run.result.stars));
      assert(run.result.score > run.result.gap + 0.5, level.id + ' score includes hint cost');
      assert(run.log.length >= level.steps.length, level.id + ' log covers steps');
      var h = hud(level, run);
      assert(h.geometry === level.geometry, level.id + ' hud geometry');
      assert(h.steps.length === level.steps.length, level.id + ' checklist');
    });

    /* restart */
    var butt = levels[0];
    var runB = createRun(butt);
    hint(butt, runB);
    var again = restart(butt, runB);
    assert(again.step === 0 && again.tries === 2 && again.hints === 0 && again.phase === 'play', 'restart');

    /* manual butt, no hint: seat, slide to the joint, knife, cut */
    var manual = createRun(butt);
    pointer(butt, manual, { type: 'down', x: 78, y: 40 });
    pointer(butt, manual, { type: 'up', x: 78, y: 40 });
    assert(manual.step === 1, 'pick advances ' + manual.step);
    pointer(butt, manual, { type: 'down', x: 78, y: 40 });
    pointer(butt, manual, { type: 'move', x: 84, y: butt.top });
    pointer(butt, manual, { type: 'up', x: 84, y: butt.top });
    assert(manual.step === 2 && manual.s.seated === 'top', 'seat on the edge');
    pointer(butt, manual, { type: 'down', x: manual.s.x, y: manual.s.y });
    pointer(butt, manual, { type: 'move', x: butt.jointX, y: butt.top });
    pointer(butt, manual, { type: 'up', x: butt.jointX, y: butt.top });
    action(butt, manual);
    action(butt, manual);
    assert(manual.phase === 'result', 'manual butt finishes');
    assert(manual.result.gap < 0.2, 'manual butt gap ' + manual.result.gap.toFixed(3));
    assert(manual.result.stars === 3, 'clean manual stars ' + manual.result.stars + ' score ' + manual.result.score.toFixed(2));

    /* knife short of the joint */
    var short = createRun(butt);
    hint(butt, short);
    hint(butt, short);
    short.s.x = butt.jointX - 6;
    action(butt, short);
    action(butt, short);
    assert(short.result.gap > 5 && short.result.gap < 7.5, 'short knife gap ' + short.result.gap.toFixed(2));
    assert(/Knife/.test(short.result.replay), 'replay names the knife, ' + short.result.replay);

    /* compass locked short, then a faithful scribe */
    var scribe = levels[1];
    var bad = createRun(scribe);
    hint(scribe, bad); /* level */
    action(scribe, bad); /* lock the default short opening */
    while (bad.phase === 'play') hint(scribe, bad);
    assert(bad.result.gap > 3, 'short compass carries into the gap ' + bad.result.gap.toFixed(2));
    assert(/Lock/.test(bad.result.replay), 'replay names the lock, ' + bad.result.replay);

    /* tick missing a corner */
    var tick = levels[2];
    assert(tick.home, 'sheet fits in the alcove');
    var miss = createRun(tick);
    hint(tick, miss); /* lay */
    for (var n = 0; n < 4; n++) hint(tick, miss);
    assert(miss.s.ticks.length === 4, 'four ticks');
    action(tick, miss); /* done early */
    while (miss.phase === 'play') hint(tick, miss);
    assert(miss.result.gap > 5, 'missing corner gap ' + miss.result.gap.toFixed(2));

    /* circle: hinted geometry already checked; off-rim chord is worse than a seated one */
    var center = levels[5];
    var off = createRun(center);
    off.s.corner = pt(center.C.x, center.C.y - center.R + 8);
    off.s.ang = Math.PI / 4;
    var seated = createRun(center);
    hint(center, seated);
    assert(seated.s.chords.length === 1, 'first hint marks a chord');
    assert(seated.log[0].deviation < 0.2, 'seated chord deviation ' + seated.log[0].deviation);

    /* back-bevel is its own panel: the saw handle tilts it, the work canvas does not */
    var scribeLv = levels[1];
    var bev = createRun(scribeLv);
    bev.step = 3;
    var sec = section(scribeLv, bev);
    assert(sec && sec.items && sec.items.length > 4, 'bevel section panel');
    assert(sec.handle, 'section exposes the saw handle');
    assert(!scene(scribeLv, bev).items.some(function (it) { return it.op === 'bevelchip'; }), 'bevel chip no longer covers the scribe');
    var words = hud(scribeLv, bev).seat;
    assert(words && !/\d/.test(words), 'bevel feedback has no readout: ' + words);
    assert(/back is touching/.test(words), 'square saw says the back touches: ' + words);
    assert(/front edge touches the wall/.test(hud(scribeLv, bev).instruction), 'bevel instruction names the drag');
    var ang0 = bev.s.bevel;
    pointer(scribeLv, bev, { type: 'down', x: 60, y: 80 });
    pointer(scribeLv, bev, { type: 'move', x: 60, y: 30 });
    pointer(scribeLv, bev, { type: 'up', x: 60, y: 30 });
    assert(bev.s.bevel === ang0, 'work canvas does not tilt the saw');
    pointer(scribeLv, bev, { type: 'down', x: sec.handle.x, y: sec.handle.y, section: true });
    pointer(scribeLv, bev, { type: 'move', x: sec.handle.x + 16, y: sec.handle.y, section: true });
    pointer(scribeLv, bev, { type: 'up', x: sec.handle.x + 16, y: sec.handle.y, section: true });
    assert(bev.s.bevel > 0.12 && bev.s.bevel < 0.42, 'dragging the saw tilts it into the clear ' + bev.s.bevel.toFixed(3));
    var midWords = hud(scribeLv, bev).seat;
    assert(/front edge/.test(midWords), 'cleared back says only the front meets ' + midWords);
    assert(!/\d/.test(midWords), 'tilted feedback has no number');
    var copeLv = levels[4];
    var copeRun = createRun(copeLv);
    copeRun.step = 3;
    copeRun.s.miterCut = true;
    var copeSec = section(copeLv, copeRun);
    assert(copeSec && copeSec.items.length > 4, 'cope section panel');
    assert(!scene(copeLv, copeRun).items.some(function (it) { return it.op === 'bevelchip'; }), 'cope chip gone');
    assert(/face meets the other piece/.test(hud(copeLv, copeRun).instruction), 'cope instruction');
    assert(levels[8].sectionScene, 'stone shares the section');

    console.log('ideal scribe', levels[1].idealS.toFixed(2), 'stone', levels[8].idealS.toFixed(2), 'oct marks', levels[7].ideals.length, 'sheet', JSON.stringify(levels[2].home));
    if (failed) {
      console.error(failed + ' failed');
      process.exit(1);
    }
    console.log('ok ' + levels.length + ' levels');
  }

  if (typeof require !== 'undefined' && require.main === module) runTests();
})(typeof globalThis !== 'undefined' ? globalThis : this);

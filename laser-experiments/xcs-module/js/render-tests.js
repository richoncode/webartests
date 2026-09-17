/**
 * Render Tests — scenarios whose correctness can only be settled by looking.
 *
 * A unit test asserts that the file is structurally right. A render test draws
 * something whose expected position is known in millimetres, renders it through
 * our own canvas, and offers the same project as a real .xcs so the identical
 * geometry can be opened in xTool Studio. Parity means all three agree: what we
 * expect, what we draw, and what Studio draws.
 *
 * Each test declares:
 *   id          stable slug, used for filenames and result records
 *   name        shown in the Render Tests tab
 *   question    the single thing this test settles
 *   build       async (project) => void, tagging items with display.testId
 *   expected    [{ testId, x, y, width, height }] in mm, top-left origin
 *
 * Adding a test means adding one entry here. Nothing in the page changes.
 */

export const RENDER_TESTS = [
  {
    id: 'buried-geometry',
    name: 'Buried Geometry — what flattening produces',
    question:
      'Removing buried geometry means subtracting whatever is painted above a ' +
      'shape and unioning what remains with its same-coloured neighbours. That ' +
      'produces four things this file has never asked Studio to draw: holes, ' +
      'holes with islands inside them, concave remainders, and shapes that abut ' +
      'along an exactly shared edge. It also produces slivers too thin to engrave. ' +
      'Every element here is the hand-authored output of that algorithm, so the ' +
      'approach can be judged before any of it is built. If Studio fills the ' +
      'holes solid, occlusion cannot be represented as compound paths at all and ' +
      'the whole plan needs a different shape. The merged and unmerged pair is ' +
      'the exception: it should look identical either way, which is the finding ' +
      'rather than a failure — a double-engraved overlap is invisible to every ' +
      'render and only the machine can settle it.',
    build: async (project) => {
      const P = (pts) => pts.map(([x, y], i) =>
        `${i === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`).join(' ') + ' Z';
      const box = (x0, y0, x1, y1) => P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
      const add = async (testId, x, y, width, height, layerColor, subPaths) => {
        const it = await project.addCompoundPath({
          x, y, width, height, subPaths,
          layerColor, isFill: true, params: { power: 20, speed: 100 }
        });
        if (it) it.display.testId = testId;
        return it;
      };

      // Control: a RECT has no dPath, so both renderers must agree on it, and it
      // carries the pixels-to-millimetres scale for every measurement below.
      const ctrl = await project.addItem('RECT', {
        x: 8, y: 8, width: 16, height: 16,
        layerColor: '#1d4ed8', params: { power: 20, speed: 100 }
      });
      ctrl.display.testId = 'BG_CONTROL';

      // One hole. What subtracting a shape wholly inside another leaves behind.
      await add('HOLE_SIMPLE', 32, 8, 20, 20, '#16a34a',
        [{ dPath: box(0, 0, 20, 20) }, { dPath: box(6, 6, 14, 14) }]);

      // A hole with an island in it — nesting depth two. Subtracting a ring
      // leaves exactly this, and evenodd has to survive two crossings, not one.
      await add('HOLE_NESTED', 60, 8, 20, 20, '#dc2626',
        [{ dPath: box(0, 0, 20, 20) }, { dPath: box(4, 4, 16, 16) }, { dPath: box(8, 8, 12, 12) }]);

      // A concave remainder: a square with a semicircular bite out of one edge,
      // which is what a partly covered shape becomes. No hole — the boundary
      // itself turns inward, and a renderer that quietly convex-hulls a path
      // would show a full square here.
      const bite = () => {
        const pts = [[0, 0], [20, 0], [20, 4]];
        for (let i = 0; i <= 24; i++) {
          const a = -Math.PI / 2 + (i / 24) * Math.PI;   // sweeps into the shape
          pts.push([20 - Math.cos(a) * 6, 10 + Math.sin(a) * 6]);
        }
        pts.push([20, 16], [20, 20], [0, 20]);
        return P(pts);
      };
      await add('CRESCENT', 8, 36, 20, 20, '#ea580c', [{ dPath: bite() }]);

      // The same silhouette twice: once as two overlapping shapes of one colour,
      // once as the single merged outline that unioning them produces. These
      // should be indistinguishable on screen, and that is the point — if they
      // are, then no render can tell whether merging happened, and the overlap
      // that engraves twice is invisible until the part comes off the machine.
      const sq = (x, y) => project.addCompoundPath({
        x, y, width: 12, height: 12, subPaths: [{ dPath: box(0, 0, 12, 12) }],
        layerColor: '#7c3aed', isFill: true, params: { power: 20, speed: 100 }
      });
      for (const it of [await sq(36, 36), await sq(44, 40)]) {
        if (it) it.display.testId = 'SEAM_UNMERGED';
      }
      await add('SEAM_MERGED', 64, 36, 20, 16, '#db2777',
        [{ dPath: P([[0, 0], [12, 0], [12, 4], [20, 4], [20, 16], [8, 16], [8, 12], [0, 12]]) }]);

      // Slivers. Boolean subtraction leaves hairline remainders, and the
      // threshold below which they should be discarded is a measurement, not a
      // guess. Three teeth on a spine, thinnest longest: the measured width says
      // which survived — 20 mm if 0.05 does, 14 if only 0.10 and up, 8 if only
      // 0.20, and 0.5 if none does. One connected shape, so the box is one blob.
      await add('SLIVER', 8, 64, 20, 3, '#ca8a04', [
        { dPath: box(0, 0, 0.5, 3) },
        { dPath: box(0.5, 0.20, 20, 0.25) },
        { dPath: box(0.5, 1.20, 14, 1.30) },
        { dPath: box(0.5, 2.20, 8, 2.40) }
      ]);

      // Two colours meeting on an exactly shared edge at x = 48 — what clipping
      // a lower shape against an upper one produces everywhere it is applied.
      // A gap or an overlap here is a per-seam error repeated thousands of times.
      await add('ABUT_A', 36, 64, 12, 12, '#0891b2', [{ dPath: box(0, 0, 12, 12) }]);
      await add('ABUT_B', 48, 64, 12, 12, '#78350f', [{ dPath: box(0, 0, 12, 12) }]);
    },
    expected: [
      { testId: 'BG_CONTROL',    x: 8,  y: 8,  width: 16, height: 16 },
      { testId: 'HOLE_SIMPLE',   x: 32, y: 8,  width: 20, height: 20 },
      { testId: 'HOLE_NESTED',   x: 60, y: 8,  width: 20, height: 20 },
      { testId: 'CRESCENT',      x: 8,  y: 36, width: 20, height: 20 },
      { testId: 'SEAM_UNMERGED', x: 36, y: 36, width: 20, height: 16 },
      { testId: 'SEAM_MERGED',   x: 64, y: 36, width: 20, height: 16 },
      { testId: 'SLIVER',        x: 8,  y: 64, width: 20, height: 3  },
      { testId: 'ABUT_A',        x: 36, y: 64, width: 12, height: 12 },
      { testId: 'ABUT_B',        x: 48, y: 64, width: 12, height: 12 }
    ],
    // Must land on the bed. A hole and a fill share a bounding box, so nothing
    // but a probe can tell whether evenodd survived.
    holes: [
      { testId: 'HOLE_SIMPLE',   atX: 42, atY: 18 },
      { testId: 'HOLE_NESTED',   atX: 66, atY: 18 },
      { testId: 'CRESCENT',      atX: 26, atY: 46 },
      { testId: 'SEAM_UNMERGED', atX: 52, atY: 37 },
      { testId: 'SEAM_MERGED',   atX: 80, atY: 37 }
    ],
    // Must land on the shape's own colour.
    solid: [
      { testId: 'HOLE_SIMPLE',   atX: 34, atY: 18 },
      { testId: 'HOLE_NESTED',   atX: 70, atY: 18 },
      { testId: 'CRESCENT',      atX: 13, atY: 46 },
      { testId: 'SEAM_MERGED',   atX: 74, atY: 44 },
      { testId: 'ABUT_A',        atX: 47, atY: 70 },
      { testId: 'ABUT_B',        atX: 49, atY: 70 }
    ]
  },
  {
    id: 'stroke-thickness',
    name: 'Stroke Thickness — thick and thin borders',
    question:
      'A stroke has to become a filled shape, because XCS draws every path as a ' +
      'hairline. A closed outline stroked at width w is an annulus, which needs a ' +
      'compound path with evenodd to carry its hole; an open stroke is a single ' +
      'closed ribbon. This project draws both at a thick and a thin width so the ' +
      'achieved thickness can be measured rather than assumed, and so it is visible ' +
      'whether the hole survives into xTool Studio at all.',
    build: async (project) => {
      const ring = (cx, cy, r, w) => {
        const pts = (radius) => {
          const out = [];
          for (let i = 0; i < 72; i++) {
            const a = (i / 72) * Math.PI * 2;
            out.push([radius + radius * 0 + Math.cos(a) * radius, Math.sin(a) * radius]);
          }
          return out;
        };
        // Authored top-left relative: the shape spans 0..2(r+w/2) on both axes.
        const R = r + w / 2, ri = r - w / 2, o = R;
        const path = (radius, reverse) => {
          const cmds = [];
          for (let i = 0; i <= 72; i++) {
            const k = reverse ? 72 - i : i;
            const a = (k / 72) * Math.PI * 2;
            const x = o + Math.cos(a) * radius, y = o + Math.sin(a) * radius;
            cmds.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`);
          }
          return cmds.join(' ') + ' Z';
        };
        return { size: 2 * R, outer: path(R, false), inner: path(ri, true) };
      };

      // A toothed silhouette, offset radially, so the thickness question is asked
      // of a shape with corners rather than only of a circle.
      const gear = (r, w, teeth) => {
        const R = r + w / 2, o = R;
        const ring = (radius) => {
          const cmds = [];
          for (let i = 0; i < teeth; i++) {
            const pts = [
              [(i) / teeth, radius], [(i + 0.3) / teeth, radius],
              [(i + 0.7) / teeth, radius * 0.8], [(i + 1) / teeth, radius * 0.8]
            ];
            for (const [t, rad] of pts) {
              const a = t * Math.PI * 2;
              const x = o + Math.cos(a) * rad, y = o + Math.sin(a) * rad;
              cmds.push(`${cmds.length === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`);
            }
          }
          return cmds.join(' ') + ' Z';
        };
        return { size: 2 * R, outer: ring(R), inner: ring(r - w / 2) };
      };

      // Control: a RECT has no dPath, so both renderers must agree on it and it
      // carries the pixels-to-millimetres scale for the whole measurement.
      const rect = await project.addItem('RECT', {
        x: 8, y: 8, width: 16, height: 16,
        layerColor: '#5b9bd5', params: { power: 20, speed: 100 }
      });
      rect.display.testId = 'THICK_CONTROL';

      const items = [
        ['RING_THICK', ring(0, 0, 10, 2.0),  '#10b981', 8,  36],
        ['RING_THIN',  ring(0, 0, 10, 0.3),  '#f87171', 38, 36],
        ['GEAR_THICK', gear(10, 2.0, 12),    '#f0a040', 8,  66],
        ['GEAR_THIN',  gear(10, 0.3, 12),    '#8b5cf6', 38, 66]
      ];
      for (const [id, shape, colour, x, y] of items) {
        const it = await project.addCompoundPath({
          x, y, width: shape.size, height: shape.size,
          subPaths: [{ dPath: shape.outer }, { dPath: shape.inner }],
          layerColor: colour, isFill: true, params: { power: 20, speed: 100 }
        });
        if (it) it.display.testId = id;
      }
    },
    expected: [
      { testId: 'THICK_CONTROL', x: 8,  y: 8,  width: 16,   height: 16   },
      { testId: 'RING_THICK',    x: 8,  y: 36, width: 22,   height: 22   },
      { testId: 'RING_THIN',     x: 38, y: 36, width: 20.3, height: 20.3 },
      { testId: 'GEAR_THICK',    x: 8,  y: 66, width: 22,   height: 22   },
      { testId: 'GEAR_THIN',     x: 38, y: 66, width: 20.3, height: 20.3 }
    ],
    // Each ring must still have a hole. A solid centre means evenodd was lost.
    holes: [
      { testId: 'RING_THICK',  atX: 19, atY: 47 },
      { testId: 'RING_THIN',   atX: 48, atY: 46 },
      { testId: 'GEAR_THICK',  atX: 19, atY: 77 },
      { testId: 'GEAR_THIN',   atX: 48, atY: 76 }
    ]
  }
,
  {
    id: 'path-origin',
    name: 'Path Origin Convention',
    question:
      'A PATH carries its own dPath and an x/y. Our canvas renderer simply ' +
      'applies translate(x, y) to whatever dPath it is given, so a path authored ' +
      'relative to its top-left and one authored relative to its centre both look ' +
      'correct here. Only one of them can be correct in xTool Studio. Which?',
    build: async (project) => {
      const y = 40, size = 20;

      // Control. A RECT has no dPath, so its placement is unambiguous and both
      // renderers must agree on it. Anything that disagrees with this square is
      // the thing under test, not the test itself.
      const rect = await project.addItem('RECT', {
        x: 15, y, width: size, height: size,
        layerColor: '#5b9bd5', params: { power: 20, speed: 100 }
      });
      rect.display.testId = 'ORIGIN_RECT';

      // Top-left relative, the convention xcsformat.md section 13 mandates and
      // the one the existing CLOSED_PATH unit test uses.
      const topLeft = await project.addItem('PATH', {
        x: 45, y, width: size, height: size,
        dPath: `M 0 0 L ${size} 0 L ${size} ${size} L 0 ${size} Z`,
        layerColor: '#10b981', params: { power: 20, speed: 100 }
      });
      topLeft.display.testId = 'ORIGIN_TOPLEFT';

      // Centre relative, the convention Shape Fill's recorder emits. Placed so
      // that if Studio honours it the square lands in the same row as the other
      // two; if Studio instead reads x/y as a top-left, it falls half a square
      // right and down.
      const half = size / 2;
      const centred = await project.addItem('PATH', {
        x: 75 + half, y: y + half, width: size, height: size,
        dPath: `M ${-half} ${-half} L ${half} ${-half} L ${half} ${half} L ${-half} ${half} Z`,
        layerColor: '#f87171', params: { power: 20, speed: 100 }
      });
      centred.display.testId = 'ORIGIN_CENTRED';
    },
    expected: [
      { testId: 'ORIGIN_RECT',    x: 15, y: 40, width: 20, height: 20 },
      { testId: 'ORIGIN_TOPLEFT', x: 45, y: 40, width: 20, height: 20 },
      { testId: 'ORIGIN_CENTRED', x: 75, y: 40, width: 20, height: 20 }
    ]
  }
];

export function getRenderTest(id) {
  return RENDER_TESTS.find(t => t.id === id) || null;
}

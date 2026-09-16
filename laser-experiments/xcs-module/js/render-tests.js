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

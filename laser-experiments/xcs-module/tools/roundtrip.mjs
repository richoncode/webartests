/**
 * Round-trip runner: build a render test, export it, open it in xTool Studio,
 * and read back where Studio actually put the geometry.
 *
 * Studio is Electron, so launching it with --remote-debugging-port exposes the
 * Chrome DevTools Protocol. Its work area is SVG, which means the rendered
 * position of every shape can be measured rather than eyeballed, and
 * Page.captureScreenshot renders inside Chromium so it needs no macOS Screen
 * Recording permission.
 *
 *   node tools/roundtrip.mjs <test-id> [outDir]
 */
import { XCSProject } from '../js/xcs-system.js';
import { RENDER_TESTS, getRenderTest } from '../js/render-tests.js';
import { writeFileSync, mkdirSync } from 'fs';
import { decodePNG, assignBoxes, pixelAt } from './png.mjs';
import { execSync } from 'child_process';
import { join, resolve } from 'path';

const PORT = 9222;
const APP = 'xTool Studio';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  return {
    send: (method, params = {}) => new Promise(res => {
      const n = ++id; pending.set(n, res);
      ws.send(JSON.stringify({ id: n, method, params }));
    }),
    close: () => ws.close()
  };
}

async function targets() {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return r.json();
}

async function ensureStudio() {
  try { await targets(); return 'already running with the debug port open'; } catch {}
  execSync(`open -a "${APP}" --args --remote-debugging-port=${PORT}`);
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try { await targets(); return `started, debug port up after ${i + 1}s`; } catch {}
  }
  throw new Error('xTool Studio did not expose the debug port');
}

export async function run(testId, outDir) {
  const test = getRenderTest(testId);
  if (!test) throw new Error(`no render test "${testId}" — have: ${RENDER_TESTS.map(t => t.id).join(', ')}`);
  mkdirSync(outDir, { recursive: true });

  const project = new XCSProject();
  await test.build(project);
  const json = project.toJSON();
  const file = resolve(join(outDir, `rt-${test.id}.xcs`));
  writeFileSync(file, JSON.stringify(json));

  const shapes = json.canvas[0].displays;
  console.log(`\n${test.name}`);
  console.log(`  ${test.question}\n`);
  console.log(`  exported ${shapes.length} shapes to ${file}`);

  console.log('  studio:', await ensureStudio());
  execSync(`open -a "${APP}" "${file}"`);
  await sleep(9000);

  const page = (await targets()).find(t => t.type === 'page' && t.url.includes('editor'));
  if (!page) throw new Error('Studio did not open an editor page');
  const c = await cdp(page.webSocketDebuggerUrl);
  const ev = async expr => {
    const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };

  // Studio draws the work area on a WebGL canvas, so there is no DOM geometry to
  // read and toDataURL() comes back empty without preserveDrawingBuffer. The
  // screenshot is the measurement surface instead: find each shape by its colour
  // and convert pixels to millimetres using a control shape whose true position
  // the test declares.
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  const png = join(outDir, `rt-${test.id}-studio.png`);
  const buf = Buffer.from(shot.result.data, 'base64');
  writeFileSync(png, buf);
  c.close();

  const img = decodePNG(buf);
  // The bed, excluding the left toolbar, the right settings panel and the
  // bottom-left layer swatches — which are painted in the very colours under
  // test and would otherwise stretch every box across the window.
  const region = test.workArea || { x0: 680, y0: 100, x1: img.width - 1100, y1: img.height - 76 };
  const colourTargets = {};
  for (const e of test.expected) {
    const s = shapes.find(d => d.testId === e.testId);
    if (s) colourTargets[e.testId] = hexToRgb(s.layerColor);
  }
  const boxes = assignBoxes(img, colourTargets, region);

  const control = test.expected[0];
  const cb = boxes[control.testId];
  if (!cb) throw new Error(`control shape ${control.testId} not found in the Studio render`);
  const pxPerMm = cb.w / control.width;
  const ox = cb.x0 - control.x * pxPerMm;
  const oy = cb.y0 - control.y * pxPerMm;

  const results = test.expected.map(e => {
    const b = boxes[e.testId];
    if (!b) return { ...e, found: false };
    const mx = (b.x0 - ox) / pxPerMm, my = (b.y0 - oy) / pxPerMm;
    const mw = b.w / pxPerMm, mh = b.h / pxPerMm;
    return { ...e, found: true, mx, my, mw, mh,
             dx: mx - e.x, dy: my - e.y,
             ok: Math.abs(mx - e.x) < 0.6 && Math.abs(my - e.y) < 0.6 &&
                 Math.abs(mw - e.width) < 0.6 && Math.abs(mh - e.height) < 0.6 };
  });

  // A hole and a fill have the same bounding box, so the box measurement above
  // cannot tell them apart. Probe points can: a hole probe has to land on the
  // bed, a solid probe on the shape's own colour. The mm-to-pixel mapping comes
  // from the control shape, so the probes follow Studio's zoom and pan.
  const verdict = (mmX, mmY) => {
    const cx = Math.round(ox + mmX * pxPerMm), cy = Math.round(oy + mmY * pxPerMm);
    // Three by three and take the majority, so one antialiased pixel on an edge
    // does not decide it.
    const votes = {};
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const [r, g, b] = pixelAt(img, cx + dx, cy + dy);
        let key = 'bed';
        if (Math.max(r, g, b) - Math.min(r, g, b) >= 18) {
          let bestD = Infinity;
          for (const [id, t] of Object.entries(colourTargets)) {
            const d = Math.hypot(r - t[0], g - t[1], b - t[2]);
            if (d < bestD) { bestD = d; key = id; }
          }
        }
        votes[key] = (votes[key] || 0) + 1;
      }
    }
    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
  };

  const probes = [
    ...(test.holes || []).map(h => ({ ...h, want: 'bed' })),
    ...(test.solid || []).map(h => ({ ...h, want: 'fill' }))
  ].map(p => {
    const got = verdict(p.atX, p.atY);
    return { ...p, got, ok: p.want === 'bed' ? got === 'bed' : got === p.testId };
  });

  return { test, file, png, pxPerMm, results, probes };
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const [, , testId = 'path-origin', outDir = './out'] = process.argv;
const res = await run(testId, outDir);

console.log(`\n  measured at ${res.pxPerMm.toFixed(2)} px/mm\n`);
console.log('  shape             expected mm     studio mm       delta           size mm');
let fails = 0;
for (const r of res.results) {
  if (!r.found) { fails++; console.log(`  ${r.testId.padEnd(16)}NOT DRAWN`); continue; }
  if (!r.ok) fails++;
  console.log('  ' + r.testId.padEnd(16) +
    `${r.x}, ${r.y}`.padEnd(16) +
    `${r.mx.toFixed(1)}, ${r.my.toFixed(1)}`.padEnd(16) +
    `${r.dx >= 0 ? '+' : ''}${r.dx.toFixed(1)}, ${r.dy >= 0 ? '+' : ''}${r.dy.toFixed(1)}`.padEnd(16) +
    `${r.mw.toFixed(1)} x ${r.mh.toFixed(1)}   ` + (r.ok ? 'ok' : 'MISPLACED'));
}
if (res.probes.length) {
  console.log('\n  probe             at mm        wants           Studio drew');
  for (const p of res.probes) {
    if (!p.ok) fails++;
    console.log('  ' + p.testId.padEnd(16) +
      `${p.atX}, ${p.atY}`.padEnd(13) +
      (p.want === 'bed' ? 'bed (a hole)' : 'its own fill').padEnd(16) +
      (p.got === 'bed' ? 'bed' : p.got).padEnd(16) + (p.ok ? 'ok' : 'WRONG'));
  }
}
const total = res.results.length + res.probes.length;
console.log(`\n  ${fails === 0 ? 'PASS — Studio agrees with the file' : `FAIL — ${fails} of ${total} checks disagree with the file`}`);
console.log(`  screenshot: ${res.png}`);

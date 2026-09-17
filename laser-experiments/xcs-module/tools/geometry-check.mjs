/**
 * Does the polygon pipeline survive a round trip, and what does resolving each
 * shape against itself cost?
 *
 * Two questions, both answered by rendering rather than by trusting the code:
 *
 *   re-emit     dPath -> rings -> dPath, no boolean. Any pixel that changes is
 *               a parsing or flattening error, and there should be none beyond
 *               the 0.01 mm curve tolerance.
 *   self-union  dPath -> rings -> union with itself -> dPath. A capsule stroke
 *               is 30 to 60 overlapping quads and this makes it one outline.
 *               The picture must not change; only the point count should.
 *
 * Both are compared against the original at 4,096 px across the bed — 0.0244 mm
 * per pixel, finer than the beam — as binary ink masks, so a difference means a
 * difference in what gets engraved.
 *
 *   node tools/geometry-check.mjs gears jigsaw coins
 */
import { launchChrome, connect, pageTarget, waitFor } from './chrome.mjs';
// The default tolerance is the module's own, so the two cannot drift apart.
import { TOLERANCE_MM } from '../js/geometry.js';

const PALETTE = {
  flat: 'classic', '3d-basic': 'classic', '3d-glossy': 'classic', illustrated: 'classic',
  circuit: 'circuit', painted_lady: 'painted_lady', ducks: 'ducks', gears: 'steampunk',
  christmas: 'christmas', coins: 'coins', gems: 'gems', buttons: 'buttons',
  autumn_leaves: 'autumn_leaves', jigsaw: 'jigsaw'
};

const cfgFor = style => encodeURIComponent(JSON.stringify({
  style, paletteId: PALETTE[style], mode: 'fill', thickness: 20, sizeMin: 12, sizeMax: 35,
  density: 50, gears: 6, colorPct: 0.15, maxStraight: 10, margin: 0, blank: 'steel',
  renderTarget: 'html', outlineWidthMM: 0.2, outlineWeight: 1
}));

const CHECK = (px, tol) => `(async () => {
  const { App } = await import('/laser-experiments/pattern-tool/js/app.js');
  const G = await import('/laser-experiments/xcs-module/js/geometry.js');
  const inst = Object.values(App.instances).find(i => i.state && i.state.project);
  if (!inst) return JSON.stringify({ error: 'no built project' });
  const displays = inst.state.project.toJSON().canvas[0].displays;
  const N = ${px}, S = N / 100;

  const cv = document.createElement('canvas');
  cv.width = N; cv.height = N;
  const g = cv.getContext('2d', { willReadFrequently: true });

  let ptsBefore = 0, ptsAfter = 0, subBefore = 0, subAfter = 0, failed = 0;
  const variants = { orig: [], reemit: [], union: [] };
  for (const d of displays) {
    if (d.type === 'RECT') {
      for (const k of ['orig', 'reemit', 'union']) variants[k].push({ rect: true, d });
      continue;
    }
    if (!d.dPath) continue;
    const rule = d.fillRule || 'nonzero';
    variants.orig.push({ path: d.dPath, d, rule });
    try {
      const rings = G.dPathToRings(d.dPath, ${tol});
      subBefore += (d.dPath.match(/M/g) || []).length;
      ptsBefore += (d.dPath.match(/[ML]/g) || []).length;
      // The raw rings keep the shape's own fill rule — they are the same
      // geometry, only re-written. Only Clipper's output is evenodd, because
      // only that can nest an island inside a hole.
      variants.reemit.push({ path: G.ringsToDPath(rings), d, rule });
      const u = G.unionSelf(rings, rule);
      const du = G.ringsToDPath(u);
      variants.union.push({ path: du, d, rule: 'evenodd' });
      subAfter += u.length;
      ptsAfter += u.reduce((n, r) => n + r.length, 0);
    } catch (e) {
      failed++;
      variants.reemit.push({ path: d.dPath, d, rule });
      variants.union.push({ path: d.dPath, d, rule });
    }
  }

  const mask = (list) => {
    g.clearRect(0, 0, N, N);
    g.fillStyle = '#ffffff';
    for (const s of list) {
      g.save(); g.scale(S, S); g.translate(s.d.x, s.d.y);
      if (s.rect) g.fillRect(0, 0, s.d.width, s.d.height);
      else { try { g.fill(new Path2D(s.path), s.rule); } catch (e) {} }
      g.restore();
    }
    const px = g.getImageData(0, 0, N, N).data;
    const bits = new Uint8Array(N * N);
    let ink = 0;
    for (let i = 0, k = 3; k < px.length; i++, k += 4) if (px[k] > 127) { bits[i] = 1; ink++; }
    return { bits, ink };
  };

  const base = mask(variants.orig);
  const cmp = (name) => {
    const m = mask(variants[name]);
    let diff = 0;
    for (let i = 0; i < base.bits.length; i++) if (base.bits[i] !== m.bits[i]) diff++;
    return { ink: +(m.ink / (S * S)).toFixed(1), diffMM2: +(diff / (S * S)).toFixed(2),
             diffPct: +(100 * diff / Math.max(1, base.ink)).toFixed(3) };
  };
  return JSON.stringify({
    shapes: displays.length, failed,
    baseInk: +(base.ink / (S * S)).toFixed(1),
    reemit: cmp('reemit'), union: cmp('union'),
    subBefore, subAfter, ptsBefore, ptsAfter
  });
})()`;

const args = process.argv.slice(2);
let px = 4096, tol = TOLERANCE_MM;
const styles = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--px') px = parseInt(args[++i], 10);
  else if (args[i] === '--tol') tol = parseFloat(args[++i]);
  else styles.push(args[i]);
}

console.log(`masks at ${px} px across the bed — ${(100 / px).toFixed(4)} mm per pixel, curve tolerance ${tol} mm`);
console.log('  style           shapes   ink mm2    re-emit diff      self-union diff    subpaths      points');
for (const style of styles) {
  const ch = await launchChrome('http://localhost:8080/laser-experiments/pattern-tool/index.html?type=shapefill&cfg=' + cfgFor(style), { width: 1800, height: 1200 });
  try {
    const c = await connect((await pageTarget(ch.port, 'pattern-tool')).webSocketDebuggerUrl, { callTimeoutMs: 600000 });
    await waitFor(c, 'document.readyState==="complete" && !!document.querySelector(".sf-canvas")');
    await c.evaluate('[...document.querySelectorAll("button")].find(b=>/Pendant/.test(b.textContent)).click()');
    await waitFor(c, '(()=>{const g=document.querySelector(".sf-canvas").getContext("2d");const d=g.getImageData(400,400,300,300).data;for(let i=3;i<d.length;i+=4) if(d[i]>0) return true;return false})()', { timeoutMs: 120000 });
    await c.evaluate('[...document.querySelectorAll("button")].find(b=>/xTool/.test(b.textContent)).click()');
    await waitFor(c, '(()=>{const v=document.querySelector(".xcs-viewer:not(.sf-html-viewer)");const s=v&&v.querySelector("svg");return !!(s && s.querySelectorAll("path,rect,circle,polygon").length>20)})()', { timeoutMs: 600000, everyMs: 2000 });
    await new Promise(r => setTimeout(r, 1500));
    const o = JSON.parse(await c.evaluate(CHECK(px, tol)));
    if (o.error) { console.log('  ' + style.padEnd(16) + o.error); c.close(); continue; }
    console.log('  ' + style.padEnd(16) +
      String(o.shapes).padStart(6) + String(o.baseInk).padStart(10) +
      `${o.reemit.diffMM2} mm2 ${o.reemit.diffPct}%`.padStart(18) +
      `${o.union.diffMM2} mm2 ${o.union.diffPct}%`.padStart(19) +
      `${o.subBefore}→${o.subAfter}`.padStart(14) +
      `${o.ptsBefore}→${o.ptsAfter}`.padStart(16) +
      (o.failed ? `   ${o.failed} FAILED TO PARSE` : ''));
    c.close();
  } catch (e) {
    console.log('  ' + style.padEnd(16) + 'FAILED: ' + e.message.slice(0, 70));
  } finally { await ch.close(); }
}

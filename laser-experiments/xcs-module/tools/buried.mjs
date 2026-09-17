/**
 * How much of a design is buried — measured, not inferred from bounding boxes.
 *
 * Every fill() and stroke() the recorder sees becomes a shape in the .xcs, and
 * the machine engraves all of them. Whatever a later shape covers is burn time
 * spent on something nobody will see, and where the two are on different layers
 * the area is engraved twice at two different powers.
 *
 * The method walks from the topmost shape down, keeping a bitmap of what the
 * shapes above have already covered. Each shape is painted alone inside its own
 * bounding box: the pixels it covers are the area it started with, and the ones
 * not already in the bitmap are what stays visible. A shape with none left is
 * completely buried and can be deleted outright; one with fewer than it started
 * with is what boolean subtraction would trim.
 *
 * This replaces the earlier bounding-box count, which could only ever be an
 * upper bound: a box sitting inside another box does not mean the geometry is
 * covered.
 *
 *   node tools/buried.mjs gears jigsaw coins
 *   node tools/buried.mjs --px 2048 gears        (coarser, faster)
 *   node tools/buried.mjs --set jigFit=pile --set jigScatter=40 jigsaw
 */
import { launchChrome, connect, pageTarget, waitFor } from './chrome.mjs';

const PALETTE = {
  flat: 'classic', '3d-basic': 'classic', '3d-glossy': 'classic', illustrated: 'classic',
  circuit: 'circuit', painted_lady: 'painted_lady', ducks: 'ducks', gears: 'steampunk',
  christmas: 'christmas', coins: 'coins', gems: 'gems', buttons: 'buttons',
  autumn_leaves: 'autumn_leaves', jigsaw: 'jigsaw'
};

function cfgFor(style, extra) {
  return encodeURIComponent(JSON.stringify(Object.assign({
    style, paletteId: PALETTE[style], mode: 'fill', thickness: 20, sizeMin: 12, sizeMax: 35,
    density: 50, gears: 6, colorPct: 0.15, maxStraight: 10, margin: 0, blank: 'steel',
    renderTarget: 'html', outlineWidthMM: 0.2, outlineWeight: 1,
    jigProfile: 'single', jigTab: 20, jigNeck: 55, jigPos: 50, jigEdge: 'flat',
    jigOrder: 'diagonal', jigOutlineIdx: 0, jigFit: 'solved', jigScatter: 0,
    jigLoose: 12, jigMissing: 0
  }, extra)));
}

// Runs inside the page: the project is already built there, so this reads the
// displays it will actually export rather than rebuilding them.
const STENCIL = px => `(async () => {
  const { App } = await import('/laser-experiments/pattern-tool/js/app.js');
  const inst = Object.values(App.instances).find(i => i.state && i.state.project);
  if (!inst) return JSON.stringify({ error: 'no built project' });
  const displays = inst.state.project.toJSON().canvas[0].displays;
  const N = ${px}, S = N / 100;              // the bed is 100 mm; S is px per mm

  const cv = document.createElement('canvas');
  cv.width = N; cv.height = N;
  const g = cv.getContext('2d', { willReadFrequently: true });

  const paths = displays.map(d => {
    if (d.type === 'RECT') return { rect: true, x: d.x, y: d.y, w: d.width, h: d.height };
    if (!d.dPath) return null;
    try { return { p: new Path2D(d.dPath), x: d.x, y: d.y, rule: d.fillRule || 'nonzero' }; }
    catch (e) { return null; }
  });

  const paint = (i) => {
    const s = paths[i];
    if (!s) return;
    g.save();
    g.scale(S, S);
    g.translate(s.x, s.y);
    if (s.rect) g.fillRect(0, 0, s.w, s.h); else g.fill(s.p, s.rule);
    g.restore();
  };
  const idOf = i => 'rgb(' + ((i >> 16) & 255) + ',' + ((i >> 8) & 255) + ',' + (i & 255) + ')';

  // Top-down coverage, one shape at a time.
  //
  // The first version of this encoded each shape's index as a unique RGB,
  // painted them all in order, and counted the pixels each index still owned.
  // That undercounted burial badly — it reported 6 wholly hidden shapes in
  // Gears where exact polygon subtraction finds 1,083. Consecutive indices
  // differ by one in the blue channel, so an antialiased edge between a shape
  // and the shape covering it blends to a colour that is still a valid index.
  // Buried shapes were handed phantom edge pixels, and the run's own
  // blend-detection reported 0.0% because no blend ever looked invalid.
  //
  // This walks from the topmost shape down instead, keeping a bitmap of what
  // the shapes above have already covered. Each shape is painted alone inside
  // its own bounding box: the pixels it covers are its own area, and the ones
  // not already in the bitmap are what stays visible. No identity is encoded in
  // a colour, so there is nothing for antialiasing to corrupt.
  const covered = new Uint8Array(N * N);
  const own = new Uint32Array(paths.length);
  const visible = new Uint32Array(paths.length);
  for (let i = paths.length - 1; i >= 0; i--) {
    const s = paths[i];
    if (!s) continue;
    const d = displays[i];
    const x0 = Math.max(0, Math.floor((d.x - 1) * S)), y0 = Math.max(0, Math.floor((d.y - 1) * S));
    const x1 = Math.min(N, Math.ceil((d.x + (d.width || 0) + 1) * S));
    const y1 = Math.min(N, Math.ceil((d.y + (d.height || 0) + 1) * S));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) continue;
    g.clearRect(x0, y0, w, h);
    g.fillStyle = '#ffffff';
    paint(i);
    const px = g.getImageData(x0, y0, w, h).data;
    let o = 0, v = 0;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        if (px[(yy * w + xx) * 4 + 3] <= 127) continue;
        o++;
        const idx = (y0 + yy) * N + (x0 + xx);
        if (!covered[idx]) { v++; covered[idx] = 1; }
      }
    }
    own[i] = o; visible[i] = v;
    g.clearRect(x0, y0, w, h);
  }
  let inkPx = 0;
  for (let i = 0; i < covered.length; i++) if (covered[i]) inkPx++;

  let fully = 0, partly = 0, ownTotal = 0, visTotal = 0, zeroArea = 0;
  for (let i = 0; i < paths.length; i++) {
    if (!own[i]) { zeroArea++; fully++; continue; }
    ownTotal += own[i]; visTotal += visible[i];
    if (visible[i] === 0) fully++;
    else if (visible[i] < own[i] * 0.98) partly++;
  }
  const mm2 = n => n / (S * S);
  return JSON.stringify({
    shapes: paths.length, fully, partly, zeroArea,
    ownMM2: +mm2(ownTotal).toFixed(1),
    visMM2: +mm2(visTotal).toFixed(1),
    inkMM2: +mm2(inkPx).toFixed(1)
  });
})()`;

const args = process.argv.slice(2);
let px = 4096, extra = {};
const styles = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--px') px = parseInt(args[++i], 10);
  else if (args[i] === '--set') { const [k, v] = args[++i].split('='); extra[k] = isNaN(+v) ? v : +v; }
  else styles.push(args[i]);
}

console.log(`stencil at ${px} px across a 100 mm bed — ${(100 / px).toFixed(4)} mm per pixel`);
console.log('  style           shapes   fully buried      partly   engraved mm2   visible mm2   wasted   blend');
for (const style of styles) {
  const url = 'http://localhost:8080/laser-experiments/pattern-tool/index.html?type=shapefill&cfg=' + cfgFor(style, extra);
  const ch = await launchChrome(url, { width: 1800, height: 1200 });
  try {
    const c = await connect((await pageTarget(ch.port, 'pattern-tool')).webSocketDebuggerUrl, { callTimeoutMs: 600000 });
    await waitFor(c, 'document.readyState==="complete" && !!document.querySelector(".sf-canvas")');
    await c.evaluate('[...document.querySelectorAll("button")].find(b=>/Pendant/.test(b.textContent)).click()');
    await waitFor(c, '(()=>{const g=document.querySelector(".sf-canvas").getContext("2d");const d=g.getImageData(400,400,300,300).data;for(let i=3;i<d.length;i+=4) if(d[i]>0) return true;return false})()', { timeoutMs: 120000 });
    await c.evaluate('[...document.querySelectorAll("button")].find(b=>/xTool/.test(b.textContent)).click()');
    await waitFor(c, '(()=>{const v=document.querySelector(".xcs-viewer:not(.sf-html-viewer)");const s=v&&v.querySelector("svg");return !!(s && s.querySelectorAll("path,rect,circle,polygon").length>20)})()', { timeoutMs: 600000, everyMs: 2000 });
    await new Promise(r => setTimeout(r, 1500));
    const o = JSON.parse(await c.evaluate(STENCIL(px)));
    if (o.error) { console.log('  ' + style.padEnd(16) + o.error); c.close(); continue; }
    const wasted = 100 * (1 - o.visMM2 / o.ownMM2);
    console.log('  ' + style.padEnd(16) +
      String(o.shapes).padStart(6) +
      `${o.fully} — ${(100 * o.fully / o.shapes).toFixed(0)}%`.padStart(16) +
      `${o.partly}`.padStart(12) +
      String(o.ownMM2).padStart(15) +
      String(o.visMM2).padStart(14) +
      `${wasted.toFixed(0)}%`.padStart(9) +
      String(o.zeroArea).padStart(10));
    c.close();
  } catch (e) {
    console.log('  ' + style.padEnd(16) + 'FAILED: ' + e.message.slice(0, 60));
  } finally { await ch.close(); }
}

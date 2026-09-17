/**
 * What removing buried geometry costs, and whether it changes the picture.
 *
 * Occlusion is the first pass that looks across shapes rather than at one at a
 * time, so it is the first that can be too slow to run. This measures it on
 * real designs before the pipeline is wired into the tool:
 *
 *   time        per stage, so a bad number points at the stage that caused it
 *   size        subpaths and points, since subtraction adds vertices where
 *               self-union removed them
 *   engraving   area before and after, which is the burn time saved
 *   picture     the binary ink mask before against after, at 0.0244 mm per
 *               pixel. This must not move. Anything removed was invisible, so
 *               a difference here is a bug, not a trade-off.
 *
 *   node tools/occlude-check.mjs gears coins
 */
import { launchChrome, connect, pageTarget, waitFor } from './chrome.mjs';
import { XCSProject } from '../js/xcs-system.js';
import { writeFileSync, statSync } from 'fs';

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

const RUN = (px, minMM2, emit) => `(async () => {
  const { App } = await import('/laser-experiments/pattern-tool/js/app.js');
  const G = await import('/laser-experiments/xcs-module/js/geometry.js');
  const inst = Object.values(App.instances).find(i => i.state && i.state.project);
  if (!inst) return JSON.stringify({ error: 'no built project' });
  const displays = inst.state.project.toJSON().canvas[0].displays;
  const N = ${px}, S = N / 100;
  const t = {}; let t0 = performance.now();
  const lap = k => { t[k] = Math.round(performance.now() - t0); t0 = performance.now(); };

  // A RECT has no dPath, so it is turned into one before anything else — the
  // boolean passes have to see every shape or they will subtract the wrong set.
  const shapes = displays.map(d => {
    const dp = d.type === 'RECT'
      ? 'M 0 0 L ' + d.width + ' 0 L ' + d.width + ' ' + d.height + ' L 0 ' + d.height + ' Z'
      : d.dPath;
    if (!dp) return null;
    let rings;
    try { rings = G.dPathToRings(dp); } catch (e) { return null; }
    // Rings are authored relative to the shape's top-left; the scene needs them
    // on the bed.
    for (const r of rings) for (const p of r) { p.X += Math.round(d.x * G.SCALE); p.Y += Math.round(d.y * G.SCALE); }
    return { rings, rule: d.fillRule || 'nonzero', color: d.layerColor, d };
  }).filter(Boolean);
  lap('parse');

  for (const s of shapes) { s.rings = G.unionSelf(s.rings, s.rule); s.rule = 'evenodd'; }
  lap('selfUnion');
  for (const s of shapes) s.bounds = G.ringsBounds(s.rings);

  const occ = await G.occludeScene(shapes, { minMM2: ${minMM2} });
  lap('occlude');
  const kept = shapes.map((s, i) => ({ rings: occ[i].rings, rule: 'evenodd', color: s.color }));

  const merged = await G.mergeByColour(kept);
  lap('merge');

  const count = list => {
    let sub = 0, pts = 0;
    for (const s of list) for (const r of s.rings) { sub++; pts += r.length; }
    return { sub, pts };
  };
  const mergedList = [...merged.entries()].map(([color, rings]) => ({ rings, rule: 'evenodd', color }));

  const area = list => { let a = 0; for (const s of list) a += Math.abs(G.ringsArea(s.rings)); return a; };

  const cv = document.createElement('canvas');
  cv.width = N; cv.height = N;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const mask = list => {
    g.clearRect(0, 0, N, N);
    g.fillStyle = '#fff';
    for (const s of list) {
      const d = G.ringsToDPath(s.rings);
      if (!d) continue;
      g.save(); g.scale(S, S);
      try { g.fill(new Path2D(d), s.rule); } catch (e) {}
      g.restore();
    }
    const px = g.getImageData(0, 0, N, N).data;
    const bits = new Uint8Array(N * N); let ink = 0;
    for (let i = 0, k = 3; k < px.length; i++, k += 4) if (px[k] > 127) { bits[i] = 1; ink++; }
    return { bits, ink };
  };
  const before = mask(shapes);
  const cmp = list => {
    const m = mask(list); let diff = 0;
    for (let i = 0; i < m.bits.length; i++) if (m.bits[i] !== before.bits[i]) diff++;
    return { diffMM2: +(diff / (S * S)).toFixed(2), diffPct: +(100 * diff / Math.max(1, before.ink)).toFixed(3) };
  };
  const afterOcc = cmp(kept), afterMerge = cmp(mergedList);
  lap('render');

  // The occluded-but-unmerged result is what Studio has to cope with at scale:
  // thousands of compound paths, most of them now carrying holes. Merging would
  // collapse it to one shape per colour and hide exactly the question.
  const emitted = ${emit} ? kept.map((s, i) => {
    if (!s.rings.length) return null;
    const b = G.ringsBounds(s.rings);
    const local = s.rings.map(r => r.map(p => ({ X: p.X - Math.round(b.x0 * G.SCALE), Y: p.Y - Math.round(b.y0 * G.SCALE) })));
    return { x: +b.x0.toFixed(3), y: +b.y0.toFixed(3),
             width: +(b.x1 - b.x0).toFixed(3), height: +(b.y1 - b.y0).toFixed(3),
             color: s.color, dPath: G.ringsToDPath(local),
             holes: s.rings.length > 1 };
  }).filter(Boolean) : null;

  return JSON.stringify({
    emitted,
    shapes: shapes.length,
    empty: occ.filter(o => o.empty).length,
    removed: occ.filter(o => o.removed).length,
    trimmed: occ.filter(o => o.trimmed).length,
    untouched: occ.filter(o => !o.empty && !o.removed && !o.trimmed).length,
    colours: merged.size,
    engravedBefore: +area(shapes).toFixed(0),
    engravedAfter: +area(mergedList).toFixed(0),
    visibleMM2: +(before.ink / (S * S)).toFixed(0),
    before: count(shapes), afterOcc: count(kept), afterMerge: count(mergedList),
    diffOcc: afterOcc, diffMerge: afterMerge, t
  });
})()`;

const args = process.argv.slice(2);
let px = 4096, minMM2 = 0, emit = null;
const styles = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--px') px = parseInt(args[++i], 10);
  else if (args[i] === '--min') minMM2 = parseFloat(args[++i]);
  else if (args[i] === '--emit') emit = args[++i];
  else styles.push(args[i]);
}

for (const style of styles) {
  const ch = await launchChrome('http://localhost:8080/laser-experiments/pattern-tool/index.html?type=shapefill&cfg=' + cfgFor(style), { width: 1800, height: 1200 });
  try {
    const c = await connect((await pageTarget(ch.port, 'pattern-tool')).webSocketDebuggerUrl, { callTimeoutMs: 900000 });
    await waitFor(c, 'document.readyState==="complete" && !!document.querySelector(".sf-canvas")');
    await c.evaluate('[...document.querySelectorAll("button")].find(b=>/Pendant/.test(b.textContent)).click()');
    await waitFor(c, '(()=>{const g=document.querySelector(".sf-canvas").getContext("2d");const d=g.getImageData(400,400,300,300).data;for(let i=3;i<d.length;i+=4) if(d[i]>0) return true;return false})()', { timeoutMs: 120000 });
    await c.evaluate('[...document.querySelectorAll("button")].find(b=>/xTool/.test(b.textContent)).click()');
    await waitFor(c, '(()=>{const v=document.querySelector(".xcs-viewer:not(.sf-html-viewer)");const s=v&&v.querySelector("svg");return !!(s && s.querySelectorAll("path,rect,circle,polygon").length>20)})()', { timeoutMs: 600000, everyMs: 2000 });
    await new Promise(r => setTimeout(r, 1500));
    const o = JSON.parse(await c.evaluate(RUN(px, minMM2, emit ? 'true' : 'false')));
    if (o.error) { console.log(style, o.error); c.close(); continue; }
    console.log(`\n${style}  — ${o.shapes} shapes, ${o.colours} colours`);
    console.log(`  wholly covered     ${o.removed}`);
    console.log(`  trimmed            ${o.trimmed}`);
    console.log(`  untouched          ${o.untouched}`);
    console.log(`  no geometry at all ${o.empty}`);
    console.log(`  engraved mm2       ${o.engravedBefore} -> ${o.engravedAfter}   (visible ${o.visibleMM2})`);
    console.log(`  subpaths           ${o.before.sub} -> ${o.afterOcc.sub} -> ${o.afterMerge.sub}`);
    console.log(`  points             ${o.before.pts} -> ${o.afterOcc.pts} -> ${o.afterMerge.pts}`);
    console.log(`  picture moved      ${o.diffOcc.diffMM2} mm2 (${o.diffOcc.diffPct}%) after occlusion, ${o.diffMerge.diffMM2} mm2 (${o.diffMerge.diffPct}%) after merge`);
    console.log(`  time ms            parse ${o.t.parse}, self-union ${o.t.selfUnion}, occlude ${o.t.occlude}, merge ${o.t.merge}`);
    if (emit && o.emitted) {
      const project = new XCSProject();
      let withHoles = 0;
      for (const e of o.emitted) {
        if (e.holes) withHoles++;
        const it = await project.addCompoundPath({
          x: e.x, y: e.y, width: e.width, height: e.height,
          subPaths: [{ dPath: e.dPath }],
          layerColor: e.color, isFill: true, params: { power: 20, speed: 100 }
        });
        if (it) it.display.fillRule = 'evenodd';
      }
      writeFileSync(emit, JSON.stringify(project.toJSON()));
      console.log(`  wrote              ${emit} — ${o.emitted.length} shapes, ${withHoles} with holes, ${(statSync(emit).size / 1048576).toFixed(1)} MB`);
    }
    c.close();
  } catch (e) {
    console.log(`${style}  FAILED: ${e.message.slice(0, 90)}`);
  } finally { await ch.close(); }
}

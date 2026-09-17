/**
 * HTML canvas against XCS canvas, per Shape Fill style.
 *
 * Both captures must come from the SAME page load: every load reseeds the
 * pattern, so an HTML capture from one run and an XCS capture from another are
 * different designs and any tone comparison between them is meaningless. That
 * mistake produced a confidently wrong number once already.
 *
 *   node tools/canvas-parity.mjs gears jigsaw ...        (outline weight 1x)
 *   node tools/canvas-parity.mjs --weight 1.5 gears
 */
import { launchChrome, connect, pageTarget, waitFor } from './chrome.mjs';
import { decodePNG } from './png.mjs';
import { writeFileSync, mkdirSync } from 'fs';

const PALETTE = {
  flat: 'classic', '3d-basic': 'classic', '3d-glossy': 'classic', illustrated: 'classic',
  circuit: 'circuit', painted_lady: 'painted_lady', ducks: 'ducks', gears: 'steampunk',
  christmas: 'christmas', coins: 'coins', gems: 'gems', buttons: 'buttons',
  autumn_leaves: 'autumn_leaves', jigsaw: 'jigsaw'
};

function cfgFor(style, weight) {
  return encodeURIComponent(JSON.stringify({
    style, paletteId: PALETTE[style], mode: 'fill', thickness: 20, sizeMin: 12, sizeMax: 35,
    density: 50, gears: 6, colorPct: 0.15, maxStraight: 10, margin: 0, blank: 'steel',
    renderTarget: 'html', outlineWidthMM: 0.2, outlineWeight: weight,
    jigProfile: 'single', jigTab: 20, jigNeck: 55, jigPos: 50, jigEdge: 'flat',
    jigOrder: 'diagonal', jigOutlineIdx: 0, jigFit: 'solved', jigScatter: 0,
    jigLoose: 12, jigMissing: 0
  }));
}

function tone(buf) {
  const i = decodePNG(buf);
  let lum = 0, n = 0, dark = 0;
  for (let y = 0; y < i.height; y++) {
    for (let x = 0; x < i.width; x++) {
      const k = (y * i.width + x) * i.channels;
      if (i.channels === 4 && i.data[k + 3] < 16) continue;
      const L = i.data[k] * 0.299 + i.data[k + 1] * 0.587 + i.data[k + 2] * 0.114;
      lum += L; n++; if (L < 40) dark++;
    }
  }
  return { L: lum / n, dark: 100 * dark / n };
}

export async function compare(style, weight, outDir) {
  const url = 'http://localhost:8080/laser-experiments/pattern-tool/index.html?type=shapefill&cfg=' + cfgFor(style, weight);
  const ch = await launchChrome(url, { width: 1800, height: 1200 });
  try {
    const c = await connect((await pageTarget(ch.port, 'pattern-tool')).webSocketDebuggerUrl, { callTimeoutMs: 420000 });
    await waitFor(c, 'document.readyState==="complete" && !!document.querySelector(".sf-canvas")');
    await c.evaluate('[...document.querySelectorAll("button")].find(b=>/Pendant/.test(b.textContent)).click()');
    await waitFor(c, '(()=>{const g=document.querySelector(".sf-canvas").getContext("2d");const d=g.getImageData(400,400,300,300).data;for(let i=3;i<d.length;i+=4) if(d[i]>0) return true;return false})()', { timeoutMs: 120000 });

    const html = await c.evaluate('document.querySelector(".sf-canvas").toDataURL("image/png")');
    const hBuf = Buffer.from(html.split(',')[1], 'base64');

    await c.evaluate('[...document.querySelectorAll("button")].find(b=>/xTool/.test(b.textContent)).click()');
    // Merging same-coloured shapes can legitimately reduce a design to a
    // handful of objects — jigsaw becomes three — so readiness cannot be "more
    // than twenty shapes". Wait for the count to stop changing instead.
    await waitFor(c, '(()=>{const v=document.querySelector(".xcs-viewer:not(.sf-html-viewer)");const s=v&&v.querySelector("svg");return !!(s && s.querySelectorAll("path,rect,circle,polygon").length>0)})()', { timeoutMs: 600000, everyMs: 2000 });
    let stable = -1, same = 0;
    while (same < 3) {
      await new Promise(r => setTimeout(r, 1500));
      const n = await c.evaluate('document.querySelectorAll(".xcs-viewer:not(.sf-html-viewer) svg path,.xcs-viewer:not(.sf-html-viewer) svg rect,.xcs-viewer:not(.sf-html-viewer) svg circle,.xcs-viewer:not(.sf-html-viewer) svg polygon").length');
      same = (n === stable) ? same + 1 : 0;
      stable = n;
    }
    const shapes = await c.evaluate('document.querySelectorAll(".xcs-viewer:not(.sf-html-viewer) svg path,.xcs-viewer:not(.sf-html-viewer) svg rect,.xcs-viewer:not(.sf-html-viewer) svg circle,.xcs-viewer:not(.sf-html-viewer) svg polygon").length');
    const xcs = await c.evaluate('(async()=>{const v=document.querySelector(".xcs-viewer:not(.sf-html-viewer)");const s=v.querySelector("svg");const cl=s.cloneNode(true);cl.setAttribute("width",1200);cl.setAttribute("height",1200);const i=new Image();i.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(cl));await i.decode();const cv=document.createElement("canvas");cv.width=1200;cv.height=1200;cv.getContext("2d").drawImage(i,0,0,1200,1200);return cv.toDataURL("image/png");})()');
    const xBuf = Buffer.from(xcs.split(',')[1], 'base64');
    c.close();

    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(`${outDir}/${style}-html.png`, hBuf);
      writeFileSync(`${outDir}/${style}-xcs.png`, xBuf);
    }
    const h = tone(hBuf), x = tone(xBuf);
    return { style, shapes, h, x, dL: h.L - x.L, dDark: x.dark - h.dark };
  } finally {
    await ch.close();
  }
}

const args = process.argv.slice(2);
let weight = 1, outDir = null;
const styles = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--weight') weight = parseFloat(args[++i]);
  else if (args[i] === '--out') outDir = args[++i];
  else styles.push(args[i]);
}
console.log(`Outline Weight ${weight}x (true per-stroke widths), pendant preset, same page load per style`);
console.log('  style           shapes    html L   xcs L     dL    d near-black');
for (const s of styles) {
  try {
    const r = await compare(s, weight, outDir);
    const flag = Math.abs(r.dL) < 3 ? '' : (r.dL > 0 ? '   XCS darker' : '   XCS lighter');
    console.log('  ' + s.padEnd(16) + String(r.shapes).padStart(6) +
      r.h.L.toFixed(1).padStart(10) + r.x.L.toFixed(1).padStart(8) +
      (r.dL >= 0 ? '+' : '') + r.dL.toFixed(1).padStart(7) +
      ((r.dDark >= 0 ? '+' : '') + r.dDark.toFixed(1) + ' pts').padStart(12) + flag);
  } catch (e) {
    console.log('  ' + s.padEnd(16) + 'FAILED: ' + e.message.slice(0, 60));
  }
}

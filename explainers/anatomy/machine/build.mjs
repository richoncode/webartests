// The Anatomy skill drawn as an Anatomy figure: a bench whose carriage runs a workpiece
// through plan, build, verify and frame. Writes the figure into ../index.html between
// the anatomy-machine markers.
// Build: node build.mjs   (kit: $ANATOMY_KIT or ~/.claude/skills/anatomy)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const SKILL = process.env.ANATOMY_KIT || join(homedir(), ".claude/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));
const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, "../index.html");

const WIDTH = 640;
const HEIGHT = 300;

const PLATE = { x: -292, y: -74, w: 590, d: 150, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const BED = { x: -262, y: -30, w: 524, d: 60, r: 2 };
const CAR = { x: -36, y: -30, w: 72, d: 60, r: 3 };
const CAR_Z = 10;
const CAR_TOP = 15;
const BASE = { x: -30, y: -24, w: 60, d: 48, r: 2 };
const BASE_TOP = 18;
const STATIONS = { plan: -200, build: -60, verify: 80, frame: 200 };
const GANTRY_X = STATIONS.build;
const BEAM_Z = 58;
const CAM_X = STATIONS.verify;
const DIAL = [118, 52];
const DIAL_R = 12;
const DIAL_Z = 20;
const DIAL_TOP = 27;
const KNOB = [-168, 48];
const KNOB_R = 7;
const KNOB_TOP = 14;
const PIN = [-155, 0];
const FRAME_POST = [STATIONS.frame, -50];
const FRAME_REST = CAR_TOP;
const FRAME_UP = 44;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GANTRY_X, -54, BEAM_Z + 6], [CAM_X, -56, 66], [FRAME_POST[0], FRAME_POST[1], 70]],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: 70, elevation: 40 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -240, y: 60, w: 300, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 5, strip.x + strip.w - 5, 5, 5, strip.y + 0.6, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2.4, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2.4, strip.y + 3.5, 0.6])], { size: 0.45 }));
  const label = { x: 222, y: 46, w: 58, d: 16, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 5, label.y + 7.4], 0.8, P, "x"), "ANATOMY", { size: 3.6, tone: "mid" }));
  [0, 1, 2].forEach((i) => out.push(L(k.lineOnTop([label.x + 5, label.y + 10 + i * 1.8], [label.x + 30 + i * 6, label.y + 10 + i * 1.8], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2.6, label.y + 8, 0.8]), at([label.x + label.w - 2.6, label.y + 8, 0.8])], { size: 0.45 }));
  return out.join("");
}

function backParts() {
  const out = [];
  // Gantry back post, camera post and frame post stand behind the bed.
  out.push(S(k.slabOf({ x: GANTRY_X - 6, y: -60, w: 12, d: 12, r: 2 }, 0, 3, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: GANTRY_X - 4, y: -58, w: 8, d: 8, r: 1.5 }, 3, BEAM_Z - 3, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam({ x: GANTRY_X - 4, y: -58, w: 8, d: 8, r: 1.5 }, 20, P, 3), { tone: "faint" }) }));
  out.push(S(k.cylinder(CAM_X, -56, 7, 0, 3, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(CAM_X, -56, 3.4, 3, 59, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([20, 40].map((z) => k.sideArc(CAM_X, -56, 3.4, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(FRAME_POST[0], FRAME_POST[1], 7, 0, 3, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(FRAME_POST[0], FRAME_POST[1], 3, 3, 66, P, 24), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(FRAME_POST[0], FRAME_POST[1], 4, 69, 2, P, 24), { tone: "mid" }));
  return out.join("");
}

function bed() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BED, -4), 0, 0.1, P)}" style="filter:blur(4px)"/>`);
  out.push(S(k.slabOf(k.insetPlan(BED, -3), 0, 3, P, 4, 0.5), { tone: "lo" }));
  out.push(S(k.slabOf(BED, 3, 5, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BED, 5.5, P, 4), { tone: "faint" }) }));
  for (const y of [-26, 20]) {
    out.push(S(k.slabOf({ x: BED.x + 6, y, w: BED.w - 12, d: 6, r: 1 }, 8, 2, P, 3, 0.3), { tone: "mid" }));
    out.push(D([-240, -160, -80, 0, 80, 160, 240].map((x) => at([x, y + 3, 10])), { size: 0.38, tone: "lo" }));
  }
  for (const x of [BED.x, BED.x + BED.w - 5]) {
    out.push(S(k.slabOf({ x, y: -29, w: 5, d: 58, r: 1.2 }, 8, 6, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, -22, 14]), at([x + 2.5, 22, 14])], { size: 0.45 }));
  }
  // Station marks on the bed edge, and the boss the Epic stop pin rises from.
  for (const x of Object.values(STATIONS)) out.push(L(k.lineOnTop([x, BED.y + BED.d - 4], [x, BED.y + BED.d], 8, P), { tone: "mid" }));
  out.push(L(k.ring(PIN[0], PIN[1], 3.4, 8, P, 20), { tone: "lo" }));
  return out.join("");
}

function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CAR, 2), CAR_Z, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(CAR, CAR_Z, CAR_TOP - CAR_Z, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(CAR, 3).map(([x, y]) => at([x, y, CAR_TOP])), { size: 0.42 }));
  out.push(S(k.slabOf(BASE, CAR_TOP, BASE_TOP - CAR_TOP, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 2.4), BASE_TOP, P, 3), { tone: "faint" }));
  const handle = { x: -8, y: CAR.y + CAR.d, w: 16, d: 3, r: 1 };
  out.push(S(k.slabOf(handle, CAR_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

function gantryFront() {
  const out = [];
  out.push(S(k.slabOf({ x: GANTRY_X - 6, y: 48, w: 12, d: 12, r: 2 }, 0, 3, P, 3), { tone: "lo" }));
  const post = { x: GANTRY_X - 4, y: 50, w: 8, d: 8, r: 1.5 };
  out.push(S(k.slabOf(post, 3, BEAM_Z - 3, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(post, 20, P, 3), { tone: "faint" }) }));
  const beam = { x: GANTRY_X - 4, y: -58, w: 8, d: 116, r: 1.5 };
  out.push(S(k.slabOf(beam, BEAM_Z, 6, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.lineOnTop([GANTRY_X - 1.2, -54], [GANTRY_X - 1.2, 54], BEAM_Z + 6, P), { tone: "faint" }));
  out.push(D([-54, 54].map((y) => at([GANTRY_X, y, BEAM_Z + 6])), { size: 0.45 }));
  return out.join("");
}

function head() {
  const out = [];
  const body = { x: GANTRY_X - 7, y: -6, w: 14, d: 12, r: 2 };
  out.push(S(k.slabOf(body, BEAM_Z - 12, 12, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(body, BEAM_Z - 4, P, 3), { tone: "faint" }) }));
  out.push(S(k.cylinder(GANTRY_X, 0, 2.6, BEAM_Z - 16, 4, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(GANTRY_X, 0, 1.2, BEAM_Z - 22, 6, P, 16), { tone: "hi", crease: "none" }));
  out.push(D([at([GANTRY_X + 4, 3, BEAM_Z]), at([GANTRY_X - 4, 3, BEAM_Z])], { size: 0.4 }));
  return out.join("");
}

function camera() {
  const out = [];
  const arm = { x: CAM_X - 3, y: -52, w: 6, d: 46, r: 1.5 };
  out.push(S(k.slabOf({ x: CAM_X - 7, y: -63, w: 14, d: 14, r: 2.5 }, 54, 10, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf(arm, 58, 4, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(CAM_X, 0, 9, 46, 12, P, 40, 0.6), { tone: "mid", inner: L(k.sideArc(CAM_X, 0, 9, 52, P, 32), { tone: "faint" }) }));
  out.push(L(k.ring(CAM_X, 0, 6.5, 58, P, 32), { tone: "faint" }));
  out.push(S(k.cylinder(CAM_X, 0, 6, 41, 5, P, 32), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(CAM_X, 0, 6, 41.6, 45.4, 30, P, 0.3), { tone: "lo" }));
  return out.join("");
}

function counter() {
  const out = [];
  const [x, y] = DIAL;
  const ped = { x: x - 9, y: y - 9, w: 18, d: 18, r: 2.5 };
  out.push(S(k.slabOf(k.insetPlan(ped, -2), 0, 2, P, 4), { tone: "lo" }));
  out.push(S(k.slabOf(ped, 2, DIAL_Z - 2, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(ped, DIAL_Z - 5, P, 4), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_TOP - DIAL_Z, P, 56, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 2.6, DIAL_TOP, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, DIAL_R - 2, DIAL_TOP, P, 56), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 2.6, 10, 5, DIAL_TOP, [1.2, 2.4], P, 0, Math.PI * 1.8);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.3, DIAL_TOP, P, 16), { tone: "mid" }));
  return out.join("");
}

function planStation() {
  const out = [];
  // The prompt card stands in its holder; the tier knob sits on a pedestal beside it.
  const holder = { x: -232, y: 40, w: 30, d: 14, r: 2 };
  out.push(S(k.slabOf(holder, 0, 8, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline({ x: holder.x + 3, y: holder.y + 5.5, w: 24, d: 3, r: 0.8 }, 8, P, 2), { tone: "lo" }));
  const ped = { x: KNOB[0] - 13, y: KNOB[1] - 11, w: 26, d: 22, r: 2.5 };
  out.push(S(k.slabOf(ped, 0, 8, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(ped, 4, P, 4), { tone: "faint" }) }));
  const dots = [-1, 0, 1].map((i) => { const a = i * 1.05; return at([KNOB[0] + Math.sin(a) * 9.8, KNOB[1] - Math.cos(a) * 9.8, 8]); });
  out.push(D(dots, { size: 0.6, tone: "mid" }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R, 8, KNOB_TOP - 8, P, 36), { tone: "mid" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], KNOB_R, 8, KNOB_TOP, 36, P), { tone: "lo" }));
  return out.join("");
}

function frameArt() {
  const out = [];
  const o = { x: -34, y: -28, w: 68, d: 56 };
  const t = 3;
  const bar = (plan) => S(k.slabOf(plan, 0, 2.4, P, 2, 0.3), { tone: "hi", crease: "lo" });
  out.push(bar({ x: o.x, y: o.y, w: o.w, d: t, r: 0.8 }));
  out.push(bar({ x: o.x, y: o.y + t, w: t, d: o.d - 2 * t, r: 0.6 }));
  out.push(bar({ x: o.x + o.w - t, y: o.y + t, w: t, d: o.d - 2 * t, r: 0.6 }));
  out.push(bar({ x: o.x, y: o.y + o.d - t, w: o.w, d: t, r: 0.8 }));
  out.push(D(k.corners({ ...o, r: 0 }, 1.5).map(([x, y]) => at([x, y, 2.4])), { size: 0.42 }));
  return out.join("");
}

function frameBracket() {
  return S(k.slabOf({ x: -6, y: FRAME_POST[1] + 3, w: 12, d: 19, r: 1.5 }, 0, 3, P, 3, 0.4), { tone: "mid" }) +
    S(k.cylinder(0, FRAME_POST[1], 5, -1, 5, P, 24), { tone: "mid" });
}

const SHARED = `
const pegSvg = (x, y, h, r, lit, lift = 0) => solidSvg(cylinder(x, y, r, ${BASE_TOP} + lift, h, P, 14), { tone: "hi", crease: "lo", lit }) + lineSvg(ring(x, y, r * 0.55, ${BASE_TOP} + lift + h, P, 10), { tone: "lo" });
`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "The Anatomy skill drawn as a bench. A carriage runs on two rails past four stations. At the plan station a prompt card stands in a holder, a tier knob picks Figure, Hero or Epic, and faint rings mark the parts list on the workpiece. At the build station a gantry head places every part, back to front. At the verify station a camera inspects the work and a gauge counts the faults; the carriage returns to the gantry until the gauge reads zero. At the last station a frame lowers onto the finished figure. Choosing Epic raises a stop pin and the carriage waits.",
  body: [
    plate(),
    backParts(),
    `<g data-part="bracket">${frameBracket()}</g>`,
    bed(),
    planStation(),
    `<g data-part="card">${S(k.slabOf({ x: -229, y: 46, w: 24, d: 2, r: 0.6 }, 4, 20, P, 2, 0.3), { tone: "hi", crease: "lo" })}${L(k.segment([-224, 48, 18], [-210, 48, 18], P), { tone: "lo", free: true })}${L(k.segment([-224, 48, 14], [-214, 48, 14], P), { tone: "lo", free: true })}</g>`,
    `<path data-part="pointer" class="iso-line" data-tone="hi" data-free="end" d="" style="stroke-width:1"/>`,
    `<g data-part="carriage">${carriage()}<g data-part="rings"></g><g data-part="pegs"></g></g>`,
    `<g data-part="pin" opacity="0">${S(k.cylinder(PIN[0], PIN[1], 2.2, 8, 9, P, 18), { tone: "hi", lit: true })}</g>`,
    `<g data-part="frame">${frameArt()}</g>`,
    gantryFront(),
    `<g data-part="head">${head()}</g>`,
    camera(),
    counter(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="" style="stroke-width:1.1"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
${SHARED}
const ST = ${JSON.stringify(STATIONS)}, GX = ${GANTRY_X}, DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
const KNOB = ${JSON.stringify(KNOB)}, KNOB_R = ${KNOB_R}, KNOB_TOP = ${KNOB_TOP}, BASE_TOP = ${BASE_TOP};
const FRAME_REST = ${FRAME_REST}, FRAME_UP = ${FRAME_UP};
const stage = document.querySelector(".am-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const carEl = part("carriage"), pegLayer = part("pegs"), ringLayer = part("rings"), headEl = part("head"), frameEl = part("frame"), bracketEl = part("bracket");
const needle = part("needle"), pointer = part("pointer"), pin = part("pin"), card = part("card");
const readout = stage.closest(".iso-figure").querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

// Tiers from SKILL.md: a Figure has 40-80 parts, a Hero 80-150, and an Epic waits for the user.
const TIERS = [
  { name: "Figure", cols: 8, rows: 5, r: 2, faults: [4, 0] },
  { name: "Hero", cols: 10, rows: 8, r: 1.5, faults: [7, 2, 0] },
  { name: "Epic", cols: 0, rows: 0, r: 0, faults: [] },
];
let tier = 0, userTier = null, cycle = 0;
let pegs = [];
const heightOf = (i, j) => 3 + ((i * 7 + j * 3) % 5) * 1.6 + (i % 3 === 0 ? 2 : 0);
function layout(t) {
  const T = TIERS[t];
  pegs = [];
  if (!T.cols) { pegLayer.innerHTML = ""; ringLayer.innerHTML = ""; return; }
  const sx = 52 / (T.cols - 1), sy = 36 / (T.rows - 1);
  for (let i = 0; i < T.cols; i++) for (let j = 0; j < T.rows; j++) pegs.push({ x: -26 + i * sx, y: -18 + j * sy, h: heightOf(i, j) });
  // Painter's order: every part is placed far to near.
  pegs.sort((a, b) => depthOf([a.x, a.y, 0], P) - depthOf([b.x, b.y, 0], P));
  ringLayer.innerHTML = "";
  pegLayer.innerHTML = "";
  pegs.forEach((p) => {
    const mark = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mark.innerHTML = lineSvg(ring_(p), { tone: "faint" });
    mark.style.opacity = "0"; ringLayer.appendChild(mark); p.ring = mark;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = '<g class="am-ok">' + pegSvg(p.x, p.y, p.h, T.r, false) + '</g><g class="am-bad" style="display:none">' + lineSvg(ring(p.x, p.y, T.r + 0.8, ${BASE_TOP}, P, 14), { tone: "lit" }) + pegSvg(p.x, p.y, p.h, T.r, true, 7) + "</g>";
    g.style.display = "none"; pegLayer.appendChild(g); p.g = g;
  });
  function ring_(p) { return ring(p.x, p.y, T.r, BASE_TOP, P, 12); }
}
const setBad = (p, bad) => { p.g.firstChild.style.display = bad ? "none" : ""; p.g.lastChild.style.display = bad ? "" : "none"; p.bad = bad; };

// The timeline: plan, build, verify; back to build while the gauge reads faults; then frame.
let phase = "plan", clock = 0, carX = ST.plan, carTo = ST.plan, headY = 0, headTo = 0, frameZ = FRAME_UP, faults = 0, shown = 0, pass = 0, placed = 0, fixQueue = [];
let needleNow = 0, knobNow = 0, cardZ = 22, pinZ = 0;
function startCycle() {
  tier = userTier !== null ? userTier : [0, 1, 2][cycle % 3];
  cycle += 1;
  layout(tier);
  phase = "plan"; clock = 0; pass = 0; placed = 0; faults = 0; shown = 0; fixQueue = [];
  carTo = ST.plan; frameZ = FRAME_UP; cardZ = 22;
}
const go = (next) => { phase = next; clock = 0; };
function step(dt) {
  clock += dt;
  const T = TIERS[tier];
  if (phase === "plan") {
    cardZ = Math.max(0, 22 - clock * 30);
    pegs.forEach((p, n) => { p.ring.style.opacity = String(Math.min(1, Math.max(0, (clock - 0.8 - n * 0.02) / 0.3))); });
    if (!T.cols) { if (clock > 4.5 && userTier === null) startCycle(); return; }
    if (clock > 2.2) { carTo = ST.build; go("toBuild"); }
  } else if (phase === "toBuild") {
    if (Math.abs(carX - carTo) < 0.5 && clock > 0.4) go(fixQueue.length ? "fix" : "build");
  } else if (phase === "build") {
    const every = 2.6 / pegs.length;
    const n = Math.min(pegs.length, Math.floor(clock / every));
    while (placed < n) { pegs[placed].g.style.display = ""; placed += 1; }
    const p = pegs[Math.min(placed, pegs.length - 1)];
    carTo = GX - p.x; headTo = p.y;
    if (placed >= pegs.length && clock > 2.8) { headTo = 0; carTo = ST.verify; go("toVerify"); }
  } else if (phase === "fix") {
    const p = fixQueue[0];
    if (p) {
      carTo = GX - p.x; headTo = p.y;
      if (clock > 0.45) { setBad(p, false); fixQueue.shift(); clock = 0; }
    } else { headTo = 0; carTo = ST.verify; go("toVerify"); }
  } else if (phase === "toVerify") {
    if (Math.abs(carX - carTo) < 0.5 && clock > 0.4) {
      faults = T.faults[pass]; pass += 1; go("verify");
      // The camera finds parts that hang in the air above their socket, one of the audit's checks.
      const near = pegs.slice(Math.floor(pegs.length * 0.55));
      for (let n = 0; n < faults; n++) setBad(near[(n * 7 + pass * 3) % near.length], true);
      fixQueue = pegs.filter((p) => p.bad);
    }
  } else if (phase === "verify") {
    shown = faults;
    if (clock > 1.8) {
      if (faults > 0) { carTo = ST.build; go("toBuild"); }
      else { carTo = ST.frame; go("toFrame"); }
    }
  } else if (phase === "toFrame") {
    if (Math.abs(carX - carTo) < 0.5 && clock > 0.4) go("frame");
  } else if (phase === "frame") {
    frameZ = FRAME_REST + (FRAME_UP - FRAME_REST) * Math.max(0, 1 - clock / 1.1);
    if (clock > 3.6) go("reset");
  } else if (phase === "reset") {
    const fade = Math.max(0, 1 - clock / 0.6);
    pegLayer.style.opacity = String(fade); ringLayer.style.opacity = String(fade); frameEl.style.opacity = String(fade);
    if (clock > 0.6) { pegLayer.style.opacity = ringLayer.style.opacity = frameEl.style.opacity = "1"; carTo = ST.plan; frameZ = FRAME_UP; go("home"); layout(tier); }
  } else if (phase === "home") {
    if (Math.abs(carX - carTo) < 0.5) startCycle();
  }
}
const follow = (now, to, dt, s) => (still.matches ? to : now + (to - now) * (1 - Math.exp(-dt / s)));
function text() {
  const T = TIERS[tier];
  if (!T.cols) return "Epic · waits for your yes";
  const n = pegs.length;
  switch (phase) {
    case "plan": return "Plan · " + T.name + " · " + n + " parts listed";
    case "build": return "Build · part " + placed + " of " + n + " · back to front";
    case "fix": return "Build · fixing " + (fixQueue.length) + " parts";
    case "verify": return "Verify · pass " + pass + " · " + faults + (faults === 1 ? " fault" : " faults");
    case "frame": case "reset": return "Framed · audit passed · 0 faults";
    default: return T.name + " · carriage to " + ({ toBuild: "build", toVerify: "verify", toFrame: "frame", home: "plan" }[phase] || "plan");
  }
}
function draw(dt) {
  carX = follow(carX, carTo, dt, phase === "build" || phase === "fix" ? 0.08 : 0.35);
  headY = follow(headY, headTo, dt, 0.07);
  needleNow = follow(needleNow, phase === "verify" || phase === "toBuild" || phase === "fix" ? shown : 0, dt, 0.25);
  knobNow = follow(knobNow, tier - 1, dt, 0.2);
  pinZ = follow(pinZ, TIERS[tier].cols ? 0 : 1, dt, 0.2);
  carEl.setAttribute("transform", translateAlong(P, [carX, 0, 0]));
  headEl.setAttribute("transform", translateAlong(P, [0, headY, 0]));
  frameEl.setAttribute("transform", translateAlong(P, [carX, 0, frameZ]));
  frameEl.style.display = phase === "frame" || phase === "reset" ? "" : "none";
  bracketEl.setAttribute("transform", translateAlong(P, [${STATIONS.frame}, 0, frameZ]));
  card.setAttribute("transform", translateAlong(P, [0, 0, cardZ]));
  pin.setAttribute("transform", translateAlong(P, [0, 0, (pinZ - 1) * 8]));
  pin.setAttribute("opacity", pinZ > 0.02 ? "1" : "0");
  const a = (needleNow / 10) * Math.PI * 1.8;
  needle.setAttribute("d", lineOnTop([DIAL[0] - Math.sin(a) * 2.4, DIAL[1] + Math.cos(a) * 2.4], [DIAL[0] + Math.sin(a) * (DIAL_R - 3.4), DIAL[1] - Math.cos(a) * (DIAL_R - 3.4)], DIAL_TOP + 0.2, P));
  const k = knobNow * 1.05;
  pointer.setAttribute("d", lineOnTop(KNOB, [KNOB[0] + Math.sin(k) * (KNOB_R - 1.2), KNOB[1] - Math.cos(k) * (KNOB_R - 1.2)], KNOB_TOP, P));
  const t = text();
  if (readout.textContent !== t) readout.textContent = t;
  stage.setAttribute("aria-valuetext", t);
}
let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  step(dt); draw(dt);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const pick = (t) => { userTier = t; pegLayer.style.opacity = ringLayer.style.opacity = frameEl.style.opacity = "1"; carX = carTo = ST.plan; headY = headTo = 0; startCycle(); draw(1); run(); };
stage.addEventListener("click", () => pick(((userTier ?? tier) + 1) % 3));
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowUp") pick(Math.min(2, (userTier ?? tier) + 1));
  else if (e.key === "ArrowLeft" || e.key === "ArrowDown") pick(Math.max(0, (userTier ?? tier) - 1));
  else if (e.key === "Escape") { userTier = null; startCycle(); }
  else return;
  e.preventDefault();
});
window.__am = { step: (s) => { for (let i = 0; i < s * 60; i++) { step(1 / 60); draw(1 / 60); } } };
startCycle();
if (still.matches) { for (let i = 0; i < 60 * 9; i++) { step(1 / 60); draw(1 / 60); } }
draw(1);
`;

const figure = k.plateHtml({
  fig: "Fig 1",
  title: "The Anatomy bench",
  hint: "Click to change the tier",
  readout: "Plan · Figure · 40 parts listed",
  keys: [
    { mark: "lit", label: "Faults the camera finds (parts hanging above their socket), the gauge needle, and the Epic stop pin" },
    { mark: "raised", label: "Workpiece: one part per peg, placed far to near" },
    { mark: "flat", label: "Faint rings: the parts list, written before any geometry" },
  ],
  caption:
    "The carriage runs the skill's ten steps from left to right. At the plan station the agent reads the prompt card, sets the tier and writes the parts list, which shows as rings before any part exists. The gantry places every part in painter's order, far to near. The camera checks the work and the gauge counts what it finds, and the carriage goes back to the gantry until the gauge reads zero. Then the frame (the card with its title, hint and readout) lowers on. Click the figure to turn the knob to Epic and a stop pin rises: the skill does not start an Epic until you choose it. Fault counts are illustrative.",
  body: `<div class="iso-stage am-stage" tabindex="0" role="img" aria-label="The Anatomy bench; arrow keys change the tier, Escape returns to the tour" aria-valuetext="">${svg}</div>`,
});

const section = `<!-- anatomy-machine:start (generated by machine/build.mjs) -->
<h2>The skill as a machine</h2>
<p>The skill says to invent “a real, well-made physical thing whose working <i>is</i> the concept”, so here is the skill itself built with its own kit: a bench whose carriage carries one figure through plan, build, verify and frame (<a href="https://github.com/wheresryan22/anatomy/blob/main/SKILL.md">SKILL.md</a>, “Workflow”).</p>
<style>${k.ISO_CSS}
.am-wrap{background:transparent;margin:14px 0 4px}
.am-wrap .iso-figure{margin:0}
.am-wrap .iso-stage>svg{display:block;width:100%;height:auto}
.am-wrap .am-stage{cursor:pointer}
</style>
<div class="iso am-wrap" data-theme="light">${figure}</div>
<script type="module">${(kitScript() + live).replace(/<\/(script)/gi, "<\\/$1")}</script>
<!-- anatomy-machine:end -->`;

let html = readFileSync(PAGE, "utf8");
const START = "<!-- anatomy-machine:start";
const END = "<!-- anatomy-machine:end -->";
if (html.includes(START)) html = html.slice(0, html.indexOf(START)) + section + html.slice(html.indexOf(END) + END.length);
else {
  const anchor = "<h2>The flow: prompt → verified figure</h2>";
  if (!html.includes(anchor)) throw new Error("anchor heading not found");
  html = html.replace(anchor, section + "\n\n" + anchor);
}
writeFileSync(PAGE, html);
console.log("wrote", PAGE);

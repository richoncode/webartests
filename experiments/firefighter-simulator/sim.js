// Illustrative incident-command rules for the 3D reconstruction.
// The two predecessor scenarios follow factors named in the 1988 manual.
// Every other scenario is a fictional extension. Every number is made up.
// This is not a fire model.

import { AIRFRAMES, SCENARIOS, getScenario } from './catalog.js';

export { AIRFRAMES, SCENARIOS, getScenario, listScenarios } from './catalog.js';

export const COURSES = ['exterior', 'interior'];

export const AGENTS = [
  { id: 'afff', name: 'AFFF' },
  { id: 'drychem', name: 'Dry chemical' },
  { id: 'halon', name: 'Halon' },
  { id: 'water', name: 'Water' },
];

export const TOOLS = [
  { id: 'turret', name: 'Turret' },
  { id: 'handline', name: 'Handline' },
  { id: 'penetrator', name: 'Penetrator' },
  { id: 'portable', name: 'Portable extinguisher' },
];

export const ASSISTANCE = [
  { id: 'offduty', name: 'Off-duty personnel', eta: 28 },
  { id: 'maintenance', name: 'Aircraft maintenance', eta: 32 },
  { id: 'disaster', name: 'Disaster control', eta: 34 },
  { id: 'scba', name: 'SCBA air resupply', eta: 22 },
  { id: 'mutual', name: 'Mutual aid fire', eta: 36 },
  { id: 'foam', name: 'Foam resupply', eta: 20 },
  { id: 'tech', name: 'Tech services', eta: 26 },
];

export const SYSTEMS = [
  { id: 'electrical', name: 'Electrical' },
  { id: 'engines', name: 'Engines' },
  { id: 'apu', name: 'APU' },
  { id: 'fuel', name: 'Fuel' },
  { id: 'oxygen', name: 'Oxygen' },
];

export const HYDRANTS = [
  { id: 'h1', x: 26, z: 18 },
  { id: 'h2', x: -28, z: 16 },
];

export const ENGINES = AIRFRAMES.starlifter.engines.map((engine) => ({
  id: engine.id,
  name: engine.name,
  x: engine.x,
  z: engine.z,
}));

export const ENTRY_LAYOUT = AIRFRAMES.starlifter.entries.map((entry) => ({ ...entry }));

const TOOL_FLOW = { turret: 7.4, handline: 3.1, penetrator: 2.5, portable: 1.05 };
const TOOL_RANGE = { turret: 28, handline: 14, penetrator: 7.2, portable: 4.2 };

const AGENT_EFFECT = {
  afff: { engine: 1, wing: 0.72, pool: 1.15, running: 0.9, cabin: 0.38, gear: 0.62, exposure: 0.8 },
  water: { engine: 0.26, wing: 0.48, pool: 0.16, running: 0.2, cabin: 0.9, gear: 1.05, exposure: 0.75 },
  drychem: { engine: 1.3, wing: 0.66, pool: 0.42, running: 0.5, cabin: 0.48, gear: 0.7, exposure: 0.45 },
  halon: { engine: 0.4, wing: 0.28, pool: 0.18, running: 0.18, cabin: 1.4, gear: 0.3, exposure: 0.2 },
};

const FUSE_RX = 5.4;
const FUSE_RZ = 25.5;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function horizontalDistance(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function toolRange(tool, pattern) {
  let range = TOOL_RANGE[tool] || 0;
  if (pattern === 'fog') range *= 0.78;
  if (pattern === 'straight') range *= 1.1;
  return range;
}

export function suppressionRate(agent, tool, kind, pattern, modulate, ctx) {
  const table = AGENT_EFFECT[agent];
  if (!table || !TOOL_FLOW[tool]) return 0;
  let rate = table[kind] * TOOL_FLOW[tool];
  if (tool === 'penetrator' && kind === 'engine') rate *= 1.35;
  if (pattern === 'fog') {
    rate *= kind === 'pool' || kind === 'wing' || kind === 'running' ? 1.22 : 0.82;
  }
  if (pattern === 'straight') {
    rate *= kind === 'engine' || kind === 'cabin' ? 1.12 : 0.78;
  }
  if (modulate) rate *= 0.5;
  if (agent === 'water' && kind === 'cabin' && ctx && !ctx.electrical) rate *= 0.22;
  if (agent === 'halon' && kind !== 'cabin') rate *= 0.85;
  return rate;
}

export function insideFuselage(x, z, bounds) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return true;
  const rx = bounds?.rx ?? FUSE_RX;
  const rz = bounds?.rz ?? FUSE_RZ;
  return (x * x) / (rx * rx) + (z * z) / (rz * rz) < 1;
}

export function clampToRamp(x, z, bounds) {
  const rz = bounds?.rz ?? FUSE_RZ;
  let px = clamp(x, -140, 140);
  let pz = clamp(z, -110, 110);
  if (!insideFuselage(px, pz, bounds)) return { x: px, z: pz };
  if (Math.hypot(px, pz) < 0.001) return { x: 0, z: rz + 1.5 };
  const rx = bounds?.rx ?? FUSE_RX;
  const e = Math.sqrt((px * px) / (rx * rx) + (pz * pz) / (rz * rz));
  return { x: (px / e) * 1.04, z: (pz / e) * 1.04 };
}

function keepoutOf(state) {
  return state?.layout?.keepout;
}

export function getUnit(state, id) {
  return state.units.find((u) => u.id === id) || null;
}

export function zoneById(state, id) {
  return state.zones.find((z) => z.id === id) || null;
}

export function formatClock(seconds) {
  const t = Math.max(0, Math.floor(seconds));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function unitDef(partial) {
  const tank = { afff: 0, water: 0, drychem: 0, halon: 0, ...partial.tank };
  return {
    id: partial.id,
    name: partial.name,
    type: partial.type,
    shape: partial.shape,
    color: partial.color,
    role: partial.role || 'fire',
    speed: partial.speed,
    tools: partial.tools.slice(),
    tank: { ...tank },
    tankMax: { ...tank },
    x: partial.x,
    z: partial.z,
    staging: { x: partial.x, z: partial.z },
    heading: partial.heading ?? 0,
    dest: null,
    moving: false,
    positioned: false,
    onScene: partial.onScene !== false,
    eta: partial.eta || 0,
    status: partial.onScene === false ? 'incoming' : 'standing-by',
    mode: 'ready',
    task: null,
    hydrantLogged: false,
  };
}

function baseUnits(delayCrash5) {
  return [
    unitDef({
      id: 'crash3', name: 'Crash 3', type: 'P-15', shape: 'p15', color: 0xd2dc55,
      speed: 9.2, tools: ['turret', 'handline', 'penetrator', 'portable'],
      tank: { afff: 120, water: 36, drychem: 40, halon: 48 },
      x: -18, z: 32, heading: Math.PI,
    }),
    unitDef({
      id: 'crash4', name: 'Crash 4', type: 'P-2', shape: 'p2', color: 0xe2b340,
      speed: 8.4, tools: ['turret', 'handline', 'portable'],
      tank: { afff: 68, water: 14, drychem: 24, halon: 0 },
      x: -8, z: 32, heading: Math.PI,
    }),
    unitDef({
      id: 'crash5', name: 'Crash 5', type: 'P-2', shape: 'p2', color: 0xde7c32,
      speed: 8.4, tools: ['turret', 'handline', 'portable'],
      tank: { afff: 68, water: 14, drychem: 24, halon: 0 },
      x: delayCrash5 ? -78 : 2, z: delayCrash5 ? 18 : 32, heading: Math.PI,
      onScene: !delayCrash5, eta: delayCrash5 ? 16 : 0,
    }),
    unitDef({
      id: 'rescue6', name: 'Rescue 6', type: 'P-10', shape: 'rescue', color: 0xe8e6df,
      role: 'rescue', speed: 11, tools: ['portable'],
      tank: { afff: 0, water: 8, drychem: 8, halon: 8 },
      x: 12, z: 32, heading: Math.PI,
    }),
    unitDef({
      id: 'engine7', name: 'Engine 7', type: 'Structural', shape: 'engine', color: 0xc4473a,
      role: 'secure', speed: 8.6, tools: ['handline', 'portable'],
      tank: { afff: 12, water: 140, drychem: 10, halon: 0 },
      x: 22, z: 32, heading: Math.PI,
    }),
    unitDef({
      id: 'crash9', name: 'Crash 9', type: 'P-13', shape: 'p13', color: 0xf4f1e4,
      speed: 13.5, tools: ['handline', 'portable'],
      tank: { afff: 34, water: 10, drychem: 12, halon: 0 },
      x: 32, z: 32, heading: Math.PI,
    }),
  ];
}

function makeZones(course, seatId) {
  const zones = [];
  for (const e of ENGINES) {
    const seat = course === 'exterior' && e.id === seatId;
    zones.push({
      id: e.id,
      name: e.name,
      kind: 'engine',
      x: e.x,
      y: 3.35,
      z: e.z,
      intensity: seat ? 26 : 0,
      fuel: seat ? 78 : 55,
      peak: seat ? 26 : 0,
      seat,
      overhauled: false,
      knockedBy: null,
      reflashTimer: 0,
      reflashLogged: false,
    });
  }
  zones.push(
    { id: 'wingL', name: 'Left wing', kind: 'wing', x: -12, y: 4.9, z: -2, intensity: 0, fuel: 0, peak: 0, seat: false, overhauled: false, knockedBy: null, reflashTimer: 0, reflashLogged: false },
    { id: 'wingR', name: 'Right wing', kind: 'wing', x: 12, y: 4.9, z: -2, intensity: 0, fuel: 0, peak: 0, seat: false, overhauled: false, knockedBy: null, reflashTimer: 0, reflashLogged: false },
    { id: 'pool', name: 'Fuel pool', kind: 'pool', x: 0, y: 0.2, z: 2, intensity: 0, fuel: 0, peak: 0, seat: false, overhauled: false, knockedBy: null, reflashTimer: 0, reflashLogged: false },
    { id: 'running', name: 'Running fuel', kind: 'running', x: 0, y: 0.25, z: 6, intensity: 0, fuel: 0, peak: 0, seat: false, overhauled: false, knockedBy: null, reflashTimer: 0, reflashLogged: false },
    {
      id: 'cabin',
      name: 'Cabin',
      kind: 'cabin',
      x: 0,
      y: 3.05,
      z: -6,
      intensity: course === 'interior' ? 24 : 0,
      fuel: course === 'interior' ? 70 : 30,
      peak: course === 'interior' ? 24 : 0,
      seat: course === 'interior',
      overhauled: false,
      knockedBy: null,
      reflashTimer: 0,
      reflashLogged: false,
    },
  );
  if (course === 'exterior') {
    const seat = ENGINES.find((e) => e.id === seatId);
    const pool = zones.find((z) => z.id === 'pool');
    const running = zones.find((z) => z.id === 'running');
    pool.x = seat.x;
    pool.z = seat.z + 2;
    running.x = seat.x;
    running.z = seat.z + 5;
  }
  return zones;
}

function pushLog(state, activity, unit, detail) {
  const fireSize = Math.round(state.zones.reduce((m, z) => Math.max(m, z.intensity), 0));
  state.log.push({
    t: Math.round(state.time),
    activity,
    unit: unit || '—',
    detail: detail || '',
    fireSize,
  });
  if (state.log.length > 400) state.log.shift();
  if (!state.firstAction) state.firstAction = activity;
}

function fail(state, reason) {
  state.hud.line = reason;
  return { ok: false, reason };
}

function requireUnit(state, unitId) {
  const unit = getUnit(state, unitId);
  if (!unit) return { error: fail(state, 'That unit is not on this exercise.') };
  if (!unit.onScene) return { error: fail(state, unit.name + ' is not on scene yet.') };
  return { unit };
}

function requirePositioned(state, unitId) {
  const found = requireUnit(state, unitId);
  if (found.error) return found;
  if (found.unit.moving) return { error: fail(state, found.unit.name + ' is still en route.') };
  if (!found.unit.positioned) {
    return { error: fail(state, 'Position apparatus before starting firefighting. Click the ramp.') };
  }
  return found;
}

function resolveScenario(opts) {
  if (opts.scenario) {
    const found = getScenario(opts.scenario);
    if (!found) throw new Error('Unknown scenario ' + opts.scenario);
    return found;
  }
  return getScenario(opts.course === 'interior' ? 'predecessor-interior' : 'predecessor-exterior');
}

function blankZone(id, name, kind, x, y, z) {
  return {
    id, name, kind, x, y, z,
    intensity: 0, fuel: 0, peak: 0, seat: false,
    overhauled: false, knockedBy: null, reflashTimer: 0, reflashLogged: false,
  };
}

function stageUnits(units, staging) {
  if (!staging) return units;
  let column = 0;
  for (const unit of units) {
    if (!unit.onScene) continue;
    const x = (staging.x0 ?? -16) + column * (staging.gap ?? 10);
    const z = staging.z ?? 32;
    unit.x = x;
    unit.z = z;
    unit.staging = { x, z };
    column += 1;
  }
  return units;
}

function unitsFor(scenario, opts, rng) {
  const delay = !!(scenario.legacy && opts.equipment !== 'full' && (opts.forceDelay != null ? opts.forceDelay : rng() < 0.34));
  let units = baseUnits(delay);
  if (scenario.unitIds) {
    units = scenario.unitIds.map((id) => units.find((unit) => unit.id === id)).filter(Boolean);
  }
  return stageUnits(units, scenario.staging);
}

function zonesFromLayout(layout, scenario) {
  const zones = [];
  for (const engine of layout.engines) zones.push(blankZone(engine.id, engine.name, 'engine', engine.x, engine.y, engine.z));
  for (const wing of layout.wings) zones.push(blankZone(wing.id, wing.name, 'wing', wing.x, wing.y, wing.z));
  for (const gear of layout.gear || []) zones.push(blankZone(gear.id, gear.name, 'gear', gear.x, gear.y, gear.z));
  zones.push(blankZone('pool', 'Fuel pool', 'pool', 0, 0.2, 2));
  zones.push(blankZone('running', 'Running fuel', 'running', 0, 0.25, 6));
  zones.push(blankZone(layout.cabin.id, layout.cabin.name, 'cabin', layout.cabin.x, layout.cabin.y, layout.cabin.z));
  if (scenario.exposure) zones.push(blankZone('hangar', 'Nearby hangar', 'exposure', -16, 3, 0));
  for (const fire of scenario.fires || []) {
    const zone = zones.find((item) => item.id === fire.id);
    if (!zone) throw new Error(scenario.id + ' has no zone ' + fire.id);
    if (fire.x != null) zone.x = fire.x;
    if (fire.z != null) zone.z = fire.z;
    if (fire.y != null) zone.y = fire.y;
    zone.intensity = fire.intensity;
    zone.fuel = fire.fuel == null ? 60 : fire.fuel;
    zone.peak = fire.intensity;
    zone.seat = !!fire.seat;
  }
  return zones;
}

function createCatalogState(opts, scenario) {
  const seed = (opts.seed ?? 1) >>> 0;
  const rng = mulberry32(seed);
  const layout = AIRFRAMES[scenario.aircraft];
  const occupants = scenario.occupants || 0;
  const windKt = 4 + Math.floor(rng() * 22);
  const windFrom = Math.floor(rng() * 360);
  const tempC = Math.round((rng() * 34 - 2) * 10) / 10;
  return {
    course: scenario.course,
    seed,
    time: 0,
    dispatch: scenario.brief,
    scenario,
    scenarioId: scenario.id,
    fictional: true,
    layout,
    sizedUp: false,
    firstAction: null,
    ventOpen: false,
    ended: false,
    weather: { windKt, windFrom, tempC },
    secured: { electrical: false, engines: false, apu: false, fuel: false, oxygen: false },
    support: { offduty: false, maintenance: false, disaster: false, scba: false, foam: false, tech: false, mutual: false },
    requests: {},
    people: {
      total: occupants,
      aboard: occupants,
      recovered: 0,
      unaccounted: 0,
      known: false,
      halonExposure: 0,
      untenable: 0,
      lastExit: null,
    },
    smoke: scenario.smoke == null ? 12 : scenario.smoke,
    units: unitsFor(scenario, opts, rng),
    zones: zonesFromLayout(layout, scenario),
    entries: layout.entries.map((entry) => ({ ...entry, blocked: entry.id === scenario.blocked, vented: false })),
    log: [],
    notes: [],
    hud: { line: 'Fictional incident. Size-up is open. Wind and temperature are decorative.' },
    stats: { shortStreams: 0, halonWhileAboard: false, usedWaterOnPool: false, ventUncovered: false },
  };
}

export function createState(opts = {}) {
  const scenario = resolveScenario(opts);
  if (!scenario.legacy) return createCatalogState(opts, scenario);
  const course = opts.course === 'interior' || scenario.course === 'interior' ? 'interior' : 'exterior';
  const seed = (opts.seed ?? 1) >>> 0;
  const rng = mulberry32(seed);
  const delayCrash5 = opts.equipment === 'full' ? false : opts.forceDelay != null ? !!opts.forceDelay : rng() < 0.34;
  const seatId = opts.forceEngine || ENGINES[Math.floor(rng() * ENGINES.length)].id;
  const blockPool = ['crew', 'troop', 'ramp'];
  const blockedId = opts.forceBlocked || blockPool[Math.floor(rng() * blockPool.length)];
  const windKt = 4 + Math.floor(rng() * 22);
  const windFrom = Math.floor(rng() * 360);
  const tempC = Math.round((rng() * 34 - 2) * 10) / 10;
  const occupants = course === 'interior' ? 6 + Math.floor(rng() * 4) : 2;
  const seat = ENGINES.find((e) => e.id === seatId);
  const dispatch = course === 'interior'
    ? 'Interior course. The aircraft has landed after an electrical fire. Litter patients and attendants are still aboard. This page counts them as a number only.'
    : 'Exterior course. Engine fire on the ramp. Flames are just becoming visible at ' + seat.name + '. The aircraft is a C-141B-style cargo jet with a large fuel load.';

  const state = {
    course,
    seed,
    time: 0,
    dispatch,
    scenario,
    scenarioId: scenario.id,
    fictional: false,
    layout: AIRFRAMES.starlifter,
    sizedUp: false,
    firstAction: null,
    ventOpen: false,
    ended: false,
    weather: { windKt, windFrom, tempC },
    secured: { electrical: false, engines: false, apu: false, fuel: false, oxygen: false },
    support: { offduty: false, maintenance: false, disaster: false, scba: false, foam: false, tech: false, mutual: false },
    requests: {},
    people: {
      total: occupants,
      aboard: occupants,
      recovered: 0,
      unaccounted: 0,
      known: false,
      halonExposure: 0,
      untenable: 0,
      lastExit: null,
    },
    smoke: course === 'interior' ? 34 : 12,
    units: baseUnits(delayCrash5),
    zones: makeZones(course, seatId),
    entries: ENTRY_LAYOUT.map((e) => ({ ...e, blocked: e.id === blockedId, vented: false })),
    log: [],
    notes: [],
    hud: { line: 'Size-up is open. In the 1988 sample printout, that was the first action.' },
    stats: { shortStreams: 0, halonWhileAboard: false, usedWaterOnPool: false, ventUncovered: false },
  };
  if (delayCrash5) {
    state.hud.line = 'Crash 5 is still rolling. The other units are standing by. Size-up is open.';
  }
  return state;
}

export function parkingSpot(state, zoneId, tool) {
  const zone = zoneById(state, zoneId);
  if (!zone) return { x: 18, z: 16 };
  const range = toolRange(tool || 'turret', 'straight');
  const side = zone.x === 0 ? 1 : Math.sign(zone.x);
  let x = zone.x + side * Math.min(11, range * 0.5);
  let z = zone.z + 7.5;
  const dist = Math.hypot(x - zone.x, z - zone.z);
  const keep = Math.min(range * 0.72, Math.max(dist, 8));
  if (dist > 0.01) {
    x = zone.x + ((x - zone.x) / dist) * keep;
    z = zone.z + ((z - zone.z) / dist) * keep;
  }
  return clampToRamp(x, z, keepoutOf(state));
}

export function parkingNearEntry(state, entryId) {
  const entry = state.entries.find((e) => e.id === entryId) || state.entries[0];
  const bounds = keepoutOf(state);
  if (Math.abs(entry.x) < 1) return clampToRamp(8, entry.z + 4, bounds);
  const side = Math.sign(entry.x) || -1;
  return clampToRamp(entry.x + side * 7.5, entry.z, bounds);
}

export function openEntry(state, prefer) {
  const preferred = state.entries.find((e) => e.id === prefer && !e.blocked);
  if (preferred) return preferred;
  return state.entries.find((e) => !e.blocked) || null;
}

function remember(state, id) {
  if (!state.notes.includes(id)) state.notes.push(id);
}

export function sizeUp(state) {
  if (state.sizedUp) {
    state.hud.line = 'Size-up already given. See Communicate for the picture.';
    return { ok: true, already: true };
  }
  state.sizedUp = true;
  state.people.known = true;
  const seat = state.zones.find((z) => z.seat);
  const blocked = state.entries.find((e) => e.blocked);
  const arriving = state.units.filter((u) => !u.onScene).map((u) => u.name);
  const detail = [
    seat ? seat.name + ' is the seat of fire' : 'no single seat',
    state.people.total + ' people still to account for',
    blocked ? blocked.name + ' is blocked' : 'entries clear',
    arriving.length ? arriving.join(', ') + ' not on scene' : 'listed units on scene',
  ].join('; ');
  pushLog(state, 'SIZE-UP', 'Command', detail);
  state.hud.line = 'Size-up logged. ' + detail + '. Wind and temperature are on the board and do not change this toy.';
  return { ok: true };
}

export function orderMove(state, unitId, x, z) {
  const found = requireUnit(state, unitId);
  if (found.error) return found.error;
  const spot = clampToRamp(x, z, keepoutOf(state));
  const unit = found.unit;
  if (unit.task && unit.task.type !== 'protect') unit.task = null;
  unit.dest = spot;
  unit.via = null;
  unit.moving = true;
  unit.positioned = false;
  unit.status = 'en-route';
  pushLog(state, 'POSITION', unit.name + ' / ' + unit.type, 'Move to ' + spot.x.toFixed(0) + ', ' + spot.z.toFixed(0));
  state.hud.line = unit.name + ' is rolling.';
  return { ok: true, x: spot.x, z: spot.z };
}

export function placeUnit(state, unitId, x, z) {
  const unit = getUnit(state, unitId);
  if (!unit) return { ok: false, reason: 'missing unit' };
  const spot = clampToRamp(x, z, keepoutOf(state));
  unit.x = spot.x;
  unit.z = spot.z;
  unit.dest = null;
  unit.moving = false;
  unit.positioned = true;
  unit.onScene = true;
  unit.status = 'in-position';
  return { ok: true, x: spot.x, z: spot.z };
}

export function returnUnit(state, unitId) {
  const found = requireUnit(state, unitId);
  if (found.error) return found.error;
  const unit = found.unit;
  unit.task = null;
  unit.dest = { ...unit.staging };
  unit.via = null;
  unit.moving = true;
  unit.positioned = false;
  unit.mode = 'ready';
  unit.status = 'en-route';
  pushLog(state, 'RETURN', unit.name + ' / ' + unit.type, 'Back to staging');
  state.hud.line = unit.name + ' is returning to staging.';
  return { ok: true };
}

export function setUnitMode(state, unitId, mode) {
  const found = requireUnit(state, unitId);
  if (found.error) return found.error;
  const allowed = ['ready', 'hydrant', 'modulate', 'standby'];
  if (!allowed.includes(mode)) return fail(state, 'Unknown apparatus mode.');
  const unit = found.unit;
  unit.mode = mode;
  if (mode === 'standby' || mode === 'hydrant') {
    if (unit.task && (unit.task.type === 'apply' || unit.task.type === 'protect')) unit.task = null;
  }
  const label = { ready: 'READY', hydrant: 'HYDRANT', modulate: 'MODULATE', standby: 'STAND-BY' }[mode];
  pushLog(state, label, unit.name + ' / ' + unit.type, 'Apparatus mode');
  if (mode === 'standby') state.hud.line = unit.name + ' is standing by.';
  else if (mode === 'hydrant') state.hud.line = 'Hydrant selected. ' + unit.name + ' refills water only while parked beside a hydrant. AFFF needs foam resupply.';
  else if (mode === 'modulate') state.hud.line = 'Modulate is on. Flow and knockdown are both cut about in half, so the tank lasts longer.';
  else state.hud.line = unit.name + ' is ready.';
  return { ok: true };
}

export function beginApply(state, args) {
  const found = requirePositioned(state, args.unitId);
  if (found.error) return found.error;
  const unit = found.unit;
  if (unit.mode === 'standby') return fail(state, unit.name + ' is standing by. Switch to Ready.');
  if (unit.mode === 'hydrant') return fail(state, 'Hydrant mode is for water refill. Switch to Ready to flow agent.');
  const tool = args.tool;
  const agent = args.agent;
  if (!unit.tools.includes(tool)) return fail(state, unit.name + ' has no ' + (TOOLS.find((t) => t.id === tool)?.name || tool) + '.');
  if ((unit.tank[agent] || 0) <= 0.2) return fail(state, unit.name + ' has no ' + (AGENTS.find((a) => a.id === agent)?.name || agent) + ' aboard in this toy loadout.');
  let zone = args.zoneId ? zoneById(state, args.zoneId) : null;
  if (!zone) {
    zone = state.zones.slice().sort((a, b) => b.intensity - a.intensity)[0];
  }
  if (!zone || zone.intensity < 1) return fail(state, 'No visible fire to aim at.');
  const pattern = args.pattern === 'fog' ? 'fog' : 'straight';
  const activity = args.activity === 'control' ? 'control' : 'extinguish';
  unit.task = {
    type: 'apply',
    tool,
    agent,
    pattern,
    activity,
    zoneId: zone.id,
    shortLogged: false,
  };
  unit.status = 'applying';
  const act = (activity === 'control' ? 'CONTROL' : 'EXTINGUISH') + '/' + tool.toUpperCase();
  pushLog(state, act, unit.name + ' / ' + unit.type, (AGENTS.find((a) => a.id === agent)?.name || agent) + ' → ' + zone.name);
  const reached = horizontalDistance(unit.x, unit.z, zone.x, zone.z) <= toolRange(tool, pattern);
  state.hud.line = reached
    ? unit.name + ' is applying ' + agent + ' on ' + zone.name + '.'
    : 'Stream is short of ' + zone.name + '. Move closer.';
  return { ok: true, reached, zoneId: zone.id };
}

export function beginRescue(state, args) {
  const found = requirePositioned(state, args.unitId);
  if (found.error) return found.error;
  const entry = state.entries.find((e) => e.id === args.entryId);
  if (!entry) return fail(state, 'Pick an entrance.');
  if (entry.blocked) return fail(state, entry.name + ' is blocked on this run. Pick another entrance.');
  if (state.people.aboard <= 0) return fail(state, 'No one is left aboard in this count.');
  const unit = found.unit;
  const dist = horizontalDistance(unit.x, unit.z, entry.x, entry.z);
  if (dist > 12) return fail(state, 'Move ' + unit.name + ' next to ' + entry.name + ' first.');
  const openTime = entry.kind === 'cut-in' ? (state.support.tech ? 4 : 9) : 2;
  unit.task = { type: 'rescue', entryId: entry.id, openRemaining: openTime, progress: 0, untenableLogged: false, scbaLogged: false };
  unit.status = 'rescue';
  pushLog(state, 'RESCUE', unit.name + ' / ' + unit.type, entry.name);
  state.hud.line = unit.name + ' is entering at the ' + entry.name.toLowerCase() + '.';
  return { ok: true };
}

export function beginVent(state, args) {
  const found = requirePositioned(state, args.unitId);
  if (found.error) return found.error;
  const entry = state.entries.find((e) => e.id === args.entryId);
  if (!entry) return fail(state, 'Pick a vent location.');
  if (entry.blocked) return fail(state, entry.name + ' is blocked. Vent somewhere else.');
  if (entry.vented) return fail(state, entry.name + ' is already open.');
  const unit = found.unit;
  if (horizontalDistance(unit.x, unit.z, entry.x, entry.z) > 12) {
    return fail(state, 'Move closer to the ' + entry.name.toLowerCase() + ' to vent.');
  }
  const remaining = entry.kind === 'cut-in' ? (state.support.tech ? 4 : 9) : 5;
  unit.task = { type: 'vent', entryId: entry.id, remaining };
  unit.status = 'ventilating';
  pushLog(state, 'VENT', unit.name + ' / ' + unit.type, entry.name);
  state.hud.line = 'Venting the ' + entry.name.toLowerCase() + '.';
  return { ok: true };
}

export function beginSecure(state, args) {
  const found = requirePositioned(state, args.unitId);
  if (found.error) return found.error;
  const system = SYSTEMS.find((s) => s.id === args.system);
  if (!system) return fail(state, 'Pick an aircraft system.');
  if (state.secured[system.id]) return fail(state, system.name + ' is already secured.');
  const unit = found.unit;
  if (Math.hypot(unit.x, unit.z) > 24) return fail(state, 'Move closer to the aircraft to secure systems.');
  unit.task = { type: 'secure', system: system.id, remaining: state.support.maintenance ? 4.2 : 8.5 };
  unit.status = 'securing';
  pushLog(state, 'SECURE A/C', unit.name + ' / ' + unit.type, system.name);
  state.hud.line = unit.name + ' is securing ' + system.name.toLowerCase() + '.';
  return { ok: true };
}

export function beginOverhaul(state, args) {
  const found = requirePositioned(state, args.unitId);
  if (found.error) return found.error;
  const zone = args.zoneId ? zoneById(state, args.zoneId) : hottest(state);
  if (!zone) return fail(state, 'Nothing to overhaul.');
  const unit = found.unit;
  if (horizontalDistance(unit.x, unit.z, zone.x, zone.z) > 16) return fail(state, 'Move closer to overhaul ' + zone.name + '.');
  if (zone.intensity > 18) return fail(state, 'Knock the fire down before overhaul. This toy will not scan a fully involved zone.');
  unit.task = { type: 'overhaul', zoneId: zone.id, remaining: 6.5 };
  unit.status = 'overhaul';
  pushLog(state, 'OVERHAUL', unit.name + ' / ' + unit.type, zone.name);
  state.hud.line = 'Overhaul on ' + zone.name + '.';
  return { ok: true };
}

export function beginProtect(state, args) {
  const found = requirePositioned(state, args.unitId);
  if (found.error) return found.error;
  const zone = zoneById(state, args.zoneId);
  if (!zone) return fail(state, 'Pick an exposure to protect.');
  const unit = found.unit;
  if (horizontalDistance(unit.x, unit.z, zone.x, zone.z) > 18) {
    return fail(state, 'Move ' + unit.name + ' next to the ' + zone.name.toLowerCase() + ' to protect it.');
  }
  unit.task = { type: 'protect', zoneId: zone.id };
  unit.status = 'protecting';
  pushLog(state, 'PROTECT', unit.name + ' / ' + unit.type, zone.name);
  state.hud.line = unit.name + ' is covering the ' + zone.name.toLowerCase() + ' as an exposure.';
  return { ok: true };
}

export function requestAssistance(state, kind) {
  const spec = ASSISTANCE.find((a) => a.id === kind);
  if (!spec) return fail(state, 'Unknown assistance request.');
  if (state.requests[kind]) return fail(state, spec.name + ' was already requested.');
  state.requests[kind] = { eta: spec.eta, calledAt: state.time, arrived: false };
  pushLog(state, 'REQUEST ASSISTANCE', 'Command', spec.name);
  state.hud.line = spec.name + ' requested. Toy arrival about ' + spec.eta + ' seconds.';
  return { ok: true };
}

export function communicate(state) {
  pushLog(state, 'COMMUNICATE', 'Command', 'Situation and unit status');
  state.hud.line = 'Status is on the board.';
  return { ok: true, numbers: situationNumbers(state) };
}

function hottest(state) {
  return state.zones.slice().sort((a, b) => b.intensity - a.intensity)[0] || null;
}

function nearHydrant(unit) {
  return HYDRANTS.some((h) => horizontalDistance(unit.x, unit.z, h.x, h.z) < 8);
}

function segmentHitsFuselage(x, z, tx, tz, bounds) {
  for (let i = 1; i <= 10; i += 1) {
    const p = i / 10;
    if (insideFuselage(x + (tx - x) * p, z + (tz - z) * p, bounds)) return true;
  }
  return false;
}

function viaAroundAircraft(unit, dest, bounds) {
  if (!segmentHitsFuselage(unit.x, unit.z, dest.x, dest.z, bounds)) return null;
  const candidates = [
    { x: -12, z: -30 },
    { x: 12, z: -30 },
    { x: -12, z: 30 },
    { x: 12, z: 30 },
    { x: -14, z: 0 },
    { x: 14, z: 0 },
  ];
  let best = null;
  let bestLen = Infinity;
  for (const candidate of candidates) {
    if (segmentHitsFuselage(unit.x, unit.z, candidate.x, candidate.z, bounds)) continue;
    if (segmentHitsFuselage(candidate.x, candidate.z, dest.x, dest.z, bounds)) continue;
    const len = Math.hypot(unit.x - candidate.x, unit.z - candidate.z) + Math.hypot(dest.x - candidate.x, dest.z - candidate.z);
    if (len < bestLen) {
      best = candidate;
      bestLen = len;
    }
  }
  return best;
}

function moveUnits(state, dt) {
  for (const unit of state.units) {
    if (!unit.onScene && state.time >= unit.eta) {
      unit.onScene = true;
      unit.dest = { ...unit.staging };
      unit.via = null;
      unit.moving = true;
      unit.status = 'en-route';
      pushLog(state, 'ARRIVAL', unit.name + ' / ' + unit.type, 'On scene');
    }
    if (!unit.moving || !unit.dest || !unit.onScene) continue;
    if (unit.via && horizontalDistance(unit.x, unit.z, unit.via.x, unit.via.z) < 1.6) unit.via = null;
    if (!unit.via) unit.via = viaAroundAircraft(unit, unit.dest, keepoutOf(state));
    const target = unit.via || unit.dest;
    const dx = target.x - unit.x;
    const dz = target.z - unit.z;
    const dist = Math.hypot(dx, dz);
    if (!unit.via && dist < 1.2) {
      unit.x = unit.dest.x;
      unit.z = unit.dest.z;
      unit.dest = null;
      unit.via = null;
      unit.moving = false;
      const backHome = horizontalDistance(unit.x, unit.z, unit.staging.x, unit.staging.z) < 1.6;
      unit.positioned = !backHome;
      if (!unit.task) {
        unit.status = unit.mode === 'hydrant' ? 'on-hydrant' : unit.mode === 'standby' || backHome ? 'standing-by' : 'in-position';
      }
      continue;
    }
    const step = Math.min(dist, unit.speed * dt);
    let nx = unit.x + (dx / dist) * step;
    let nz = unit.z + (dz / dist) * step;
    if (insideFuselage(nx, nz, keepoutOf(state))) {
      const pushed = clampToRamp(nx, nz, keepoutOf(state));
      nx = pushed.x;
      nz = pushed.z;
    }
    unit.heading = Math.atan2(nx - unit.x, nz - unit.z);
    unit.x = nx;
    unit.z = nz;
    unit.status = 'en-route';
  }
}

function growZone(zone, dt, state) {
  if (zone.overhauled) {
    zone.intensity = Math.max(0, zone.intensity - 8 * dt);
    if (zone.intensity < 10) zone.fuel = Math.max(0, zone.fuel - 6 * dt);
    return;
  }
  if (zone.intensity <= 0 && zone.fuel <= 0) return;
  if (zone.fuel <= 0) {
    zone.intensity = Math.max(0, zone.intensity - 10 * dt);
    return;
  }
  if (zone.intensity <= 0) return;
  let growth = 0.8;
  if (zone.kind === 'engine') growth = 0.85 + zone.intensity * 0.018;
  if (zone.kind === 'wing') growth = 0.7 + zone.intensity * 0.016;
  if (zone.kind === 'pool') growth = 1.15;
  if (zone.kind === 'running') growth = 0.9;
  if (zone.kind === 'cabin') growth = state.secured.electrical ? 0.35 : 1.45;
  if (zone.kind === 'gear') growth = 0.7 + zone.intensity * 0.014;
  if (zone.kind === 'exposure') growth = 0.55 + zone.intensity * 0.02;
  if (state.secured.fuel && (zone.kind === 'pool' || zone.kind === 'running' || zone.kind === 'engine')) growth *= 0.32;
  if (state.secured.engines && zone.kind === 'engine') growth *= 0.55;
  if (state.secured.oxygen && zone.kind === 'cabin') growth *= 0.72;
  if (state.secured.apu && zone.kind === 'cabin') growth *= 0.9;
  if (zone.kind === 'cabin' && state.ventOpen) {
    const suppressed = zone.suppression > 1.2;
    if (suppressed) {
      state.smoke = Math.max(0, state.smoke - 7 * dt);
    } else {
      growth += 1.15;
      state.stats.ventUncovered = true;
    }
  }
  zone.intensity = clamp(zone.intensity + growth * dt, 0, 100);
  const burn = 0.28 * dt * (zone.intensity / 50);
  zone.fuel = Math.max(0, zone.fuel - burn);
  zone.peak = Math.max(zone.peak, zone.intensity);
}

function isProtected(state, zone) {
  if (state.support.disaster && (zone.kind === 'wing' || zone.kind === 'cabin')) return false;
  return state.units.some((u) => {
    if (!u.task || u.task.type !== 'protect' || u.task.zoneId !== zone.id) return false;
    return horizontalDistance(u.x, u.z, zone.x, zone.z) < 18;
  });
}

function spread(state) {
  const engines = state.zones.filter((z) => z.kind === 'engine');
  for (const engine of engines) {
    if (engine.intensity < 50 || zoneControlled(state, engine.id)) continue;
    const wing = zoneById(state, engine.x < 0 ? 'wingL' : 'wingR');
    if (wing && !isProtected(state, wing)) ignite(wing, 7, 48);
    if (!state.secured.fuel) {
      const pool = zoneById(state, 'pool');
      const running = zoneById(state, 'running');
      if (pool && running && !(state.scenario && state.scenario.lockPool)) {
        pool.x = engine.x;
        pool.z = engine.z + 2.2;
        running.x = engine.x;
        running.z = engine.z + 5;
      }
      if (!(state.scenario && state.scenario.lockPool)) {
        if (pool && !isProtected(state, pool)) ignite(pool, 8, 64);
        if (running && !isProtected(state, running)) ignite(running, 5, 36);
      }
    }
    if (engine.intensity > 72 && !state.secured.fuel) {
      const cabin = zoneById(state, 'cabin');
      if (!isProtected(state, cabin)) ignite(cabin, 6, 36);
    }
  }
  for (const wing of state.zones.filter((z) => z.kind === 'wing' && z.intensity > 60)) {
    if (zoneControlled(state, wing.id)) continue;
    const cabin = zoneById(state, 'cabin');
    if (cabin && !isProtected(state, cabin)) ignite(cabin, 8, 40);
  }
  const scenario = state.scenario;
  if (scenario && scenario.poolSpreads) {
    const pool = zoneById(state, 'pool');
    if (pool && pool.intensity > 62 && !zoneControlled(state, pool.id)) {
      const wing = zoneById(state, pool.x < 0 ? 'wingL' : 'wingR');
      if (wing && !isProtected(state, wing)) ignite(wing, 6, 36);
    }
  }
  if (scenario && scenario.exposure) {
    const hangar = zoneById(state, 'hangar');
    const hot = state.zones.some((zone) => zone.kind !== 'exposure' && zone.intensity > 50);
    if (hangar && hot && !isProtected(state, hangar)) ignite(hangar, 5, 28);
  }
}

function ignite(zone, intensity, fuel) {
  if (zone.intensity < intensity) zone.intensity = intensity;
  if (zone.fuel < fuel) zone.fuel = fuel;
  zone.peak = Math.max(zone.peak, zone.intensity);
}

function zoneControlled(state, zoneId) {
  return state.units.some((u) => u.task && u.task.type === 'apply' && u.task.activity === 'control' && u.task.zoneId === zoneId);
}

function applyStreams(state, dt) {
  for (const zone of state.zones) zone.suppression = 0;
  for (const unit of state.units) {
    const task = unit.task;
    if (!task || task.type !== 'apply') continue;
    const zone = zoneById(state, task.zoneId);
    if (!zone) continue;
    const range = toolRange(task.tool, task.pattern);
    const dist = horizontalDistance(unit.x, unit.z, zone.x, zone.z);
    const reached = dist <= range;
    const flow = TOOL_FLOW[task.tool] * (unit.mode === 'modulate' ? 0.45 : 1) * (task.pattern === 'fog' ? 1.12 : 1);
    const draw = flow * dt;
    if ((unit.tank[task.agent] || 0) <= 0) {
      unit.task = null;
      unit.status = 'in-position';
      pushLog(state, 'AGENT EMPTY', unit.name, task.agent);
      state.hud.line = unit.name + ' is out of ' + task.agent + '.';
      continue;
    }
    unit.tank[task.agent] = Math.max(0, unit.tank[task.agent] - draw);
    if (!reached) {
      state.stats.shortStreams += dt;
      if (!task.shortLogged) {
        task.shortLogged = true;
        pushLog(state, 'STREAM SHORT', unit.name + ' / ' + unit.type, zone.name + ' is out of ' + task.tool + ' reach');
      }
      state.hud.line = 'Stream is short of ' + zone.name + '. ' + unit.name + ' is spraying, and the fire is not feeling it.';
      continue;
    }
    task.shortLogged = false;
    let rate = suppressionRate(task.agent, task.tool, zone.kind, task.pattern, unit.mode === 'modulate', state.secured);
    if (task.activity === 'control') rate *= 0.7;
    const drop = rate * dt;
    zone.intensity = Math.max(0, zone.intensity - drop);
    zone.suppression += rate;
    zone.knockedBy = task.agent;
    if (zone.intensity < 4) zone.reflashTimer = 0;
    if (task.agent === 'water' && (zone.kind === 'pool' || zone.kind === 'running')) state.stats.usedWaterOnPool = true;
    if (task.agent === 'halon' && zone.kind === 'cabin' && state.people.aboard > 0) {
      state.stats.halonWhileAboard = true;
      state.people.halonExposure += dt;
      while (state.people.halonExposure >= 2.5 && state.people.aboard > 0) {
        state.people.halonExposure -= 2.5;
        state.people.aboard -= 1;
        state.people.unaccounted += 1;
        pushLog(state, 'HALON BEFORE RESCUE', unit.name, 'Abstract unaccounted count increased');
        remember(state, 'halon');
      }
    }
  }
}

function reflash(state, dt) {
  for (const zone of state.zones) {
    const quiet = zone.intensity < 4 && zone.fuel > 24 && zone.knockedBy === 'drychem' && !zone.overhauled && zone.suppression < 0.2 && !state.secured.fuel;
    if (!quiet) {
      zone.reflashTimer = 0;
      continue;
    }
    zone.reflashTimer += dt;
    if (zone.reflashTimer > 8) {
      zone.intensity = Math.max(zone.intensity, 20);
      zone.peak = Math.max(zone.peak, zone.intensity);
      zone.reflashTimer = 0;
      if (!zone.reflashLogged) {
        zone.reflashLogged = true;
        pushLog(state, 'REFLASH', '—', zone.name + ' came back after dry chemical');
        remember(state, 'reflash');
      }
      state.hud.line = zone.name + ' reflashed in this toy. Dry chemical knocked it down without securing the fuel.';
    }
  }
}

function advanceTasks(state, dt) {
  for (const unit of state.units) {
    const task = unit.task;
    if (!task || task.type === 'apply' || task.type === 'protect') continue;
    if (task.type === 'secure') {
      task.remaining -= dt;
      if (task.remaining <= 0) {
        state.secured[task.system] = true;
        pushLog(state, 'SECURED', unit.name, task.system);
        state.hud.line = task.system + ' secured.';
        unit.task = null;
        unit.status = 'in-position';
      }
    } else if (task.type === 'vent') {
      task.remaining -= dt;
      if (task.remaining <= 0) {
        const entry = state.entries.find((e) => e.id === task.entryId);
        if (entry) entry.vented = true;
        state.ventOpen = true;
        pushLog(state, 'VENTED', unit.name, entry ? entry.name : task.entryId);
        state.hud.line = 'Vent open. If nobody is suppressing the cabin, this toy lets that fire grow.';
        unit.task = null;
        unit.status = 'in-position';
      }
    } else if (task.type === 'overhaul') {
      task.remaining -= dt;
      if (task.remaining <= 0) {
        const zone = zoneById(state, task.zoneId);
        if (zone) {
          zone.overhauled = true;
          zone.intensity = Math.max(0, zone.intensity - 8);
          zone.reflashTimer = 0;
        }
        pushLog(state, 'OVERHAUL DONE', unit.name, zone ? zone.name : '');
        state.hud.line = 'Overhaul finished on ' + (zone ? zone.name : 'the zone') + '.';
        unit.task = null;
        unit.status = 'in-position';
      }
    } else if (task.type === 'rescue') {
      advanceRescue(state, unit, dt);
    }
  }
}

function advanceRescue(state, unit, dt) {
  const task = unit.task;
  const entry = state.entries.find((e) => e.id === task.entryId);
  if (!entry || entry.blocked) {
    unit.task = null;
    unit.status = 'in-position';
    state.hud.line = 'That entrance is blocked.';
    return;
  }
  if (horizontalDistance(unit.x, unit.z, entry.x, entry.z) > 14) {
    state.hud.line = unit.name + ' drifted away from the entrance. Rescue is paused.';
    return;
  }
  const cabin = zoneById(state, 'cabin');
  if (cabin && cabin.intensity > 78) {
    if (!task.untenableLogged) {
      task.untenableLogged = true;
      pushLog(state, 'RESCUE HELD', unit.name, 'Cabin fire too high in this toy');
    }
    state.people.untenable += dt;
    state.hud.line = 'Cabin fire is too high for the entry team. Knock it down, then send them back.';
    if (state.people.untenable > 12 && state.people.aboard > 0) {
      state.people.untenable = 0;
      state.people.aboard -= 1;
      state.people.unaccounted += 1;
      pushLog(state, 'UNACCOUNTED', unit.name, 'Abstract count — cabin stayed untenable');
      remember(state, 'untenable');
    }
    return;
  }
  if (task.openRemaining > 0) {
    task.openRemaining -= dt;
    state.hud.line = unit.name + ' is opening the ' + entry.name.toLowerCase() + '.';
    return;
  }
  let rate = unit.role === 'rescue' ? 0.17 : 0.075;
  if (state.support.offduty) rate *= 1.55;
  if (entry.kind === 'cut-in') rate *= 0.62;
  if (state.smoke > 55) rate *= 0.75;
  if (state.smoke > 70 && !state.support.scba) {
    rate *= 0.45;
    if (!task.scbaLogged) {
      task.scbaLogged = true;
      pushLog(state, 'SCBA LOW', unit.name, 'Toy delay until air resupply');
      state.hud.line = 'Smoke is thick. SCBA air resupply shortens this toy delay.';
    }
  }
  task.progress += rate * dt;
  while (task.progress >= 1 && state.people.aboard > 0) {
    task.progress -= 1;
    state.people.aboard -= 1;
    state.people.recovered += 1;
    state.people.lastExit = entry.id;
    pushLog(state, 'RECOVERED', unit.name + ' / ' + unit.type, 'One person out via ' + entry.name + '. Still aboard: ' + state.people.aboard);
  }
  if (state.people.aboard <= 0) {
    unit.task = null;
    unit.status = 'in-position';
    pushLog(state, 'RESCUE COMPLETE', unit.name, 'Everyone in the count is out');
    state.hud.line = 'Rescue count is clear. Everyone the exercise was tracking is out.';
  } else {
    state.hud.line = 'Rescue in progress. Still aboard: ' + state.people.aboard + '.';
  }
}

function updateSmoke(state, dt) {
  const cabin = zoneById(state, 'cabin');
  const engines = state.zones.filter((z) => z.kind === 'engine');
  const target = clamp((cabin ? cabin.intensity * 0.65 : 0) + Math.max(...engines.map((z) => z.intensity), 0) * 0.35, 0, 100);
  state.smoke = clamp(state.smoke + (target - state.smoke) * Math.min(1, dt * 0.45), 0, 100);
}

function arriveAssistance(state, dt) {
  for (const spec of ASSISTANCE) {
    const req = state.requests[spec.id];
    if (!req || req.arrived) continue;
    if (state.time < req.calledAt + req.eta) continue;
    req.arrived = true;
    state.support[spec.id === 'mutual' ? 'mutual' : spec.id] = true;
    if (spec.id === 'foam') {
      for (const unit of state.units) unit.tank.afff = unit.tankMax.afff;
      state.hud.line = 'Foam resupply topped up AFFF tanks.';
    } else if (spec.id === 'mutual') {
      spawnMutual(state);
      state.hud.line = 'Mutual aid is on scene.';
    } else if (spec.id === 'offduty') {
      state.hud.line = 'Off-duty people are here. Rescue moves faster in this toy.';
    } else if (spec.id === 'maintenance') {
      state.hud.line = 'Aircraft maintenance is here. Secure actions take less time.';
    } else if (spec.id === 'scba') {
      state.hud.line = 'SCBA bottles are on scene. Interior work is less delayed.';
    } else if (spec.id === 'tech') {
      state.hud.line = 'Tech services can speed a cut-in.';
    } else if (spec.id === 'disaster') {
      state.hud.line = 'Disaster control is covering exposures with you.';
    }
    pushLog(state, 'ASSISTANCE ON SCENE', spec.name, 'Arrived');
    void dt;
  }
}

function spawnMutual(state) {
  if (getUnit(state, 'mutual1')) return;
  const unit = unitDef({
    id: 'mutual1',
    name: 'Mutual aid',
    type: 'Aid',
    shape: 'mutual',
    color: 0x7f93a8,
    speed: 9,
    tools: ['turret', 'handline', 'portable'],
    tank: { afff: 80, water: 20, drychem: 10, halon: 0 },
    x: -60,
    z: 22,
    heading: 0,
  });
  unit.staging = { x: -18, z: 48 };
  unit.dest = { ...unit.staging };
  unit.via = null;
  unit.moving = true;
  unit.positioned = false;
  unit.status = 'en-route';
  state.units.push(unit);
}

function refreshIdleLine(state) {
  const applying = state.units.filter((u) => u.task && u.task.type === 'apply');
  if (applying.length) {
    const unit = applying[0];
    const zone = zoneById(state, unit.task.zoneId);
    if (!zone) return;
    const range = toolRange(unit.task.tool, unit.task.pattern);
    const reached = horizontalDistance(unit.x, unit.z, zone.x, zone.z) <= range;
    if (!reached) {
      state.hud.line = 'Stream is short of ' + zone.name + '. ' + unit.name + ' is spraying, and the fire is not feeling it.';
      return;
    }
    if (zone.intensity <= 0.4) {
      state.hud.line = unit.name + ' reached ' + zone.name + ' and knocked the visible flame down.';
      return;
    }
    const fell = zone.intensity < (zone.atTickStart ?? zone.intensity) - 0.02;
    state.hud.line = fell
      ? unit.name + ' ' + unit.task.tool + ' / ' + unit.task.agent + ' is reaching ' + zone.name + ', and the fire is falling.'
      : unit.name + ' is on ' + zone.name + ', but the fire is not falling yet.';
    return;
  }
  if (state.units.some((u) => u.moving || (u.task && u.task.type !== 'protect'))) return;
  if (!state.sizedUp) {
    state.hud.line = 'Size-up is still open. The 1988 sample notes said to do that first.';
    return;
  }
  const hot = hottest(state);
  if (hot && hot.intensity > 6) {
    state.hud.line = hot.name + ' is still burning. Position a truck inside stream range, then apply an agent.';
  }
}

export function tick(state, dt) {
  if (!state || state.ended) return state;
  const step = clamp(dt, 0, 0.25);
  if (step <= 0) return state;
  for (const zone of state.zones) zone.atTickStart = zone.intensity;
  state.time += step;
  moveUnits(state, step);
  arriveAssistance(state, step);
  for (const unit of state.units) {
    if (unit.mode === 'hydrant' && unit.onScene && !unit.moving && nearHydrant(unit)) {
      unit.tank.water = Math.min(unit.tankMax.water, unit.tank.water + 8 * step);
      unit.status = unit.task ? unit.status : 'on-hydrant';
      if (!unit.hydrantLogged) {
        unit.hydrantLogged = true;
        pushLog(state, 'HYDRANT', unit.name, 'Water filling');
        state.hud.line = unit.name + ' is on a hydrant. Water is filling. AFFF is not.';
      }
    } else {
      unit.hydrantLogged = false;
    }
  }
  advanceTasks(state, step);
  for (const zone of state.zones) zone.suppression = 0;
  applyStreams(state, step);
  for (const zone of state.zones) growZone(zone, step, state);
  spread(state);
  reflash(state, step);
  updateSmoke(state, step);
  refreshIdleLine(state);
  return state;
}

export function situationNumbers(state) {
  const wingEngine = state.zones
    .filter((z) => z.kind === 'engine' || z.kind === 'wing')
    .reduce((sum, z) => sum + z.intensity, 0);
  const running = zoneById(state, 'running');
  const pool = zoneById(state, 'pool');
  return {
    wingAndEngine: Math.round(wingEngine),
    runningFeet: Math.round(running.intensity * 0.22),
    spillSqFt: Math.round(pool.fuel * pool.intensity * 0.12),
    poolSqFt: Math.round(pool.intensity * 14),
    smoke: Math.round(state.smoke),
    time: Math.round(state.time),
  };
}

export function damageLabel(zone) {
  if (zone.peak < 8) return 'no notable damage';
  if (zone.peak < 30) return 'light';
  if (zone.peak < 60) return 'moderate';
  if (zone.peak < 85) return 'heavy';
  return 'lost in this toy';
}

export function studyNotes(state) {
  const notes = [];
  if (state.firstAction !== 'SIZE-UP') {
    notes.push('The sample printout in the 1988 manual said the first action in any fire emergency should be to size up.');
  } else {
    notes.push('Size-up was the first action, which matches the note on the 1988 sample printout.');
  }
  if (state.people.aboard > 0) {
    notes.push('The same printout said to search the aircraft and make sure nobody is still aboard. The count here still has people aboard.');
  } else if (state.people.recovered > 0) {
    notes.push('The aboard count was cleared by rescue. Recovery in this exercise is an abstract number.');
  }
  if (state.stats.halonWhileAboard || state.notes.includes('halon')) {
    notes.push('The 1988 interior model increased the death rate when Halon was used before everyone was rescued. This toy moved those people to an unaccounted count. It is not a prediction.');
  }
  if (state.stats.usedWaterOnPool) {
    notes.push('Water was flowed on a fuel pool or running fuel. In this toy AFFF knocks that down and water barely does. That is not a real agent recommendation.');
  }
  if (state.stats.ventUncovered) {
    notes.push('A vent was opened while the cabin was not being suppressed, so the cabin fire grew. The 1988 program treated ventilation as something that changed the fire.');
  }
  if (state.notes.includes('reflash')) {
    notes.push('Dry chemical knocked a fire down and it came back while fuel remained. Overhaul stops that in this toy.');
  }
  if (state.stats.shortStreams > 1) {
    notes.push('At least one stream was short of the fire. The 1988 program checked whether the vehicle was close enough for the stream to reach.');
  }
  notes.push('Every result above is an illustrative toy. It is not fire behavior, not a tactic, and not a score from the 1988 system.');
  return notes;
}

export function summary(state) {
  return {
    course: state.course,
    seed: state.seed,
    time: state.time,
    dispatch: state.dispatch,
    weather: { ...state.weather },
    people: { ...state.people },
    secured: { ...state.secured },
    zones: state.zones.map((z) => ({
      id: z.id,
      name: z.name,
      kind: z.kind,
      intensity: Math.round(z.intensity),
      peak: Math.round(z.peak),
      damage: damageLabel(z),
    })),
    log: state.log.slice(),
    notes: (state.fictional
      ? ['This incident is a fictional extension for this page. It is not in the 1988 manual and is not evidence about later work.']
      : []).concat(studyNotes(state)),
    firstAction: state.firstAction,
    numbers: situationNumbers(state),
    scenarioId: state.scenarioId,
    title: state.scenario ? state.scenario.title : '',
    fictional: !!state.fictional,
    objectives: objectiveStatus(state),
    assumption: state.scenario && state.scenario.assumption ? state.scenario.assumption : '',
  };
}

export function objectiveStatus(state) {
  const goals = (state.scenario && state.scenario.objectives) || [];
  return goals.map((goal) => ({ id: goal.id, text: goal.text, done: !!goal.done(state) }));
}

function resolvePlanZone(state, id) {
  if (id === 'seat') return state.zones.find((zone) => zone.seat) || null;
  return zoneById(state, id);
}

function tickUntil(state, seconds, pred) {
  let left = seconds;
  while (left > 0) {
    tick(state, 0.2);
    left -= 0.2;
    if (pred()) return true;
  }
  return !!pred();
}

export function runGuidedPlan(state) {
  const plan = state.scenario && state.scenario.plan;
  if (!plan) return { ok: false, reason: 'no plan', status: [] };
  sizeUp(state);
  const zoneIds = plan.zones && plan.zones.length ? plan.zones : ['seat'];
  const zones = zoneIds.map((id) => resolvePlanZone(state, id));
  if (zones.some((zone) => !zone)) return { ok: false, reason: 'missing zone', status: objectiveStatus(state) };

  const drive = (unitId, x, z, seconds) => {
    const moved = orderMove(state, unitId, x, z);
    if (!moved.ok) return false;
    return tickUntil(state, seconds, () => {
      const unit = getUnit(state, unitId);
      return unit && unit.positioned && !unit.moving;
    });
  };

  if (plan.rescueFirst && plan.rescue && state.people.aboard > 0) {
    const entry = openEntry(state, plan.entry || 'crew');
    if (!entry) return { ok: false, reason: 'no entry', status: objectiveStatus(state) };
    const rescueSpot = parkingNearEntry(state, entry.id);
    const applySpot = parkingSpot(state, zones[0].id, plan.tool);
    if (!drive(plan.rescueUnit, rescueSpot.x, rescueSpot.z, plan.driveTimeout || 30)) {
      return { ok: false, reason: 'rescue did not arrive', status: objectiveStatus(state) };
    }
    if (!drive(plan.unit, applySpot.x, applySpot.z, plan.driveTimeout || 30)) {
      return { ok: false, reason: 'attack unit did not arrive', status: objectiveStatus(state) };
    }
    const entered = beginRescue(state, { unitId: plan.rescueUnit, entryId: entry.id });
    if (!entered.ok) return { ok: false, reason: entered.reason, status: objectiveStatus(state) };
    if (plan.secure) beginSecure(state, { unitId: plan.secureUnit || plan.unit, system: plan.secure });
    tickUntil(state, 20, () => !plan.secure || state.secured[plan.secure]);
    const applied = beginApply(state, {
      unitId: plan.unit,
      tool: plan.tool,
      agent: plan.agent,
      zoneId: zones[0].id,
      pattern: plan.pattern || 'straight',
    });
    if (!applied.ok) return { ok: false, reason: applied.reason, status: objectiveStatus(state) };
    const finished = tickUntil(state, 90, () => zones[0].intensity < 12 && state.people.aboard === 0);
    if (!finished) return { ok: false, reason: state.hud.line, status: objectiveStatus(state) };
  } else {
    for (const zone of zones) {
      const spot = parkingSpot(state, zone.id, plan.tool);
      if (!drive(plan.unit, spot.x, spot.z, plan.driveTimeout || 30)) {
        return { ok: false, reason: 'did not reach ' + zone.name, status: objectiveStatus(state) };
      }
      if (getUnit(state, plan.unit).mode !== 'ready') setUnitMode(state, plan.unit, 'ready');
      const applied = beginApply(state, {
        unitId: plan.unit,
        tool: plan.tool,
        agent: plan.agent,
        zoneId: zone.id,
        pattern: plan.pattern || 'straight',
      });
      if (!applied.ok) return { ok: false, reason: applied.reason, status: objectiveStatus(state) };
      const down = tickUntil(state, 40, () => zone.intensity <= 0);
      if (!down) return { ok: false, reason: 'fire held on ' + zone.name, status: objectiveStatus(state) };
      setUnitMode(state, plan.unit, 'standby');
    }
    if (plan.overhaul) {
      const zone = zones[0];
      setUnitMode(state, plan.unit, 'ready');
      const over = beginOverhaul(state, { unitId: plan.unit, zoneId: zone.id });
      if (over.ok) tickUntil(state, 12, () => zone.overhauled);
    }
    if (plan.rescue && state.people.aboard > 0) {
      const entry = openEntry(state, plan.entry || 'crew');
      if (!entry) return { ok: false, reason: 'no entry', status: objectiveStatus(state) };
      const rescueSpot = parkingNearEntry(state, entry.id);
      if (!drive(plan.rescueUnit, rescueSpot.x, rescueSpot.z, plan.driveTimeout || 30)) {
        return { ok: false, reason: 'rescue did not arrive', status: objectiveStatus(state) };
      }
      const entered = beginRescue(state, { unitId: plan.rescueUnit, entryId: entry.id });
      if (!entered.ok) return { ok: false, reason: entered.reason, status: objectiveStatus(state) };
      const clear = tickUntil(state, 80, () => state.people.aboard === 0);
      if (!clear) return { ok: false, reason: 'rescue incomplete', status: objectiveStatus(state) };
    }
    if (plan.secure && getUnit(state, plan.secureUnit || 'engine7')) {
      const secureId = plan.secureUnit || 'engine7';
      if (!drive(secureId, 8, 12, 24)) {
        return { ok: false, reason: 'secure unit did not arrive', status: objectiveStatus(state) };
      }
      const secured = beginSecure(state, { unitId: secureId, system: plan.secure });
      if (secured.ok) tickUntil(state, 14, () => state.secured[plan.secure]);
    }
  }

  const status = objectiveStatus(state);
  return { ok: status.every((goal) => goal.done), status, time: state.time, reason: state.hud.line };
}

export function endExercise(state) {
  state.ended = true;
  pushLog(state, 'END', 'Command', 'After-action opened');
  return summary(state);
}

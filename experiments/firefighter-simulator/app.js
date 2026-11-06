import { createView } from './scene.js';
import * as sim from './sim.js';

const $ = (id) => document.getElementById(id);

const ui = {
  started: false,
  paused: true,
  speed: 1,
  course: 'exterior',
  selected: 'crash3',
  panel: 'command',
  tool: 'turret',
  agent: 'afff',
  pattern: 'straight',
  zoneId: null,
  view: 'orbit',
  seed: 141,
  rolled: false,
};

let state = makeState();
let view = null;
let demo = null;
let last = performance.now();
let toastTimer = 0;

function makeState() {
  const opts = {
    seed: ui.seed >>> 0,
    course: ui.course,
    equipment: ui.rolled ? 'random' : 'full',
  };
  if (!ui.rolled) {
    opts.forceBlocked = 'troop';
    if (ui.course === 'exterior') opts.forceEngine = 'eng2';
  }
  return sim.createState(opts);
}

function boot() {
  const canvas = $('c');
  try {
    view = createView(canvas);
  } catch (err) {
    throw new Error(err && err.message ? err.message : 'WebGL is not available in this browser.');
  }
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    fail('The WebGL context was lost. Reload the page.');
  });
  window.addEventListener('resize', () => view.resize());
  bind();
  renderBrief();
  renderSub();
  renderUnits();
  requestAnimationFrame(frame);
  window.__simBooted?.();
  $('veil').hidden = true;
}

function fail(message) {
  $('veil').hidden = true;
  $('fail-text').textContent = message;
  $('fail').hidden = false;
}

function bind() {
  $('pause').addEventListener('click', () => {
    if (!ui.started) return;
    ui.paused = !ui.paused;
    $('pause').textContent = ui.paused ? 'Resume' : 'Pause';
  });
  $('speed').addEventListener('click', () => {
    ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 4 : 1;
    $('speed').textContent = ui.speed + '×';
  });
  $('demo').addEventListener('click', () => {
    if (demo) takeControl();
    else startDemo();
  });
  $('brief-demo').addEventListener('click', startDemo);
  $('brief-play').addEventListener('click', () => {
    ui.started = true;
    ui.paused = false;
    $('brief').hidden = true;
    $('pause').textContent = 'Pause';
    sim.sizeUp(state);
    ui.panel = 'command';
    renderSub();
    renderUnits();
    toast('You have command. Click the ramp to position the selected truck.');
  });
  $('brief-course').addEventListener('click', () => {
    ui.course = ui.course === 'exterior' ? 'interior' : 'exterior';
    state = makeState();
    renderBrief();
    renderSub();
  });
  $('brief-roll').addEventListener('click', () => {
    ui.rolled = true;
    ui.seed = (Math.random() * 1e9) | 0;
    state = makeState();
    renderBrief();
    renderSub();
  });
  $('source-btn').addEventListener('click', () => { $('source').hidden = false; });
  $('source-close').addEventListener('click', () => { $('source').hidden = true; });
  $('take-control').addEventListener('click', takeControl);
  $('acts').addEventListener('click', (event) => {
    const button = event.target.closest('[data-act]');
    if (!button || !ui.started) {
      if (button) toast('Start with Take command or Guided demo.');
      return;
    }
    onAct(button.dataset.act);
  });
  $('sub').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cmd]');
    if (!button) return;
    onCmd(button.dataset.cmd, button.dataset);
  });
  $('units').addEventListener('click', (event) => {
    const button = event.target.closest('[data-unit]');
    if (!button) return;
    if (demo) takeControl();
    ui.selected = button.dataset.unit;
    const unit = sim.getUnit(state, ui.selected);
    if (unit && !unit.tools.includes(ui.tool)) ui.tool = unit.tools[0];
    renderUnits();
    renderSub();
  });
  $('modes').addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (!button || !ui.started) return;
    if (demo) takeControl();
    const result = sim.setUnitMode(state, ui.selected, button.dataset.mode);
    if (!result.ok) toast(result.reason);
    renderModes();
  });
  $('views').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    setView(button.dataset.view);
  });
  $('c').addEventListener('pointerdown', onPointerDown);
  $('c').addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKey);
}

let pointer = null;
function onPointerDown(event) {
  if (event.button === 2) return;
  pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
}
function onPointerUp(event) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  pointer = null;
  if (!ui.started || ui.paused && !demo) return;
  if (dx * dx + dy * dy > 36) return;
  const hit = view.pick(event.clientX, event.clientY);
  if (!hit) return;
  if (demo) takeControl();
  onPick(hit);
}

function onPick(hit) {
  if (hit.type === 'unit') {
    ui.selected = hit.id;
    const unit = sim.getUnit(state, hit.id);
    if (unit && !unit.tools.includes(ui.tool)) ui.tool = unit.tools[0];
    renderUnits();
    renderSub();
    return;
  }
  if (hit.type === 'entry' && (ui.panel === 'rescue' || ui.panel === 'vent')) {
    const fn = ui.panel === 'rescue' ? sim.beginRescue : sim.beginVent;
    const result = fn(state, { unitId: ui.selected, entryId: hit.id });
    if (!result.ok) toast(result.reason);
    return;
  }
  if (hit.type === 'zone') {
    ui.zoneId = hit.id;
    if (ui.panel === 'protect') {
      const result = sim.beginProtect(state, { unitId: ui.selected, zoneId: hit.id });
      if (!result.ok) toast(result.reason);
      return;
    }
    if (ui.panel === 'extinguish' || ui.panel === 'control') {
      applySelected(hit.id);
      return;
    }
    const zone = sim.zoneById(state, hit.id);
    toast((zone ? zone.name : 'That spot') + ' marked. Open Extinguish, then Apply.');
    renderSub();
    return;
  }
  if (hit.type === 'ground') {
    const result = sim.orderMove(state, ui.selected, hit.x, hit.z);
    if (!result.ok) toast(result.reason);
  }
}

function onAct(act) {
  if (demo) takeControl();
  if (act === 'sizeup') {
    sim.sizeUp(state);
    ui.panel = 'command';
    renderSub();
    return;
  }
  if (act === 'end') {
    openAfter(sim.endExercise(state));
    return;
  }
  ui.panel = act === 'command' ? 'command' : act;
  renderSub();
}

function onCmd(cmd, data) {
  if (demo) takeControl();
  if (cmd === 'tool') ui.tool = data.value;
  else if (cmd === 'agent') ui.agent = data.value;
  else if (cmd === 'pattern') ui.pattern = data.value;
  else if (cmd === 'apply') applySelected(ui.zoneId);
  else if (cmd === 'secure') {
    const result = sim.beginSecure(state, { unitId: ui.selected, system: data.value });
    if (!result.ok) toast(result.reason);
  } else if (cmd === 'assist') {
    const result = sim.requestAssistance(state, data.value);
    if (!result.ok) toast(result.reason);
  } else if (cmd === 'return') {
    const result = sim.returnUnit(state, ui.selected);
    if (!result.ok) toast(result.reason);
  } else if (cmd === 'talk') sim.communicate(state);
  else if (cmd === 'entry') {
    const fn = ui.panel === 'vent' ? sim.beginVent : sim.beginRescue;
    const result = fn(state, { unitId: ui.selected, entryId: data.value });
    if (!result.ok) toast(result.reason);
  } else if (cmd === 'overhaul') {
    const result = sim.beginOverhaul(state, { unitId: ui.selected, zoneId: data.value || undefined });
    if (!result.ok) toast(result.reason);
  } else if (cmd === 'protect') {
    const result = sim.beginProtect(state, { unitId: ui.selected, zoneId: data.value });
    if (!result.ok) toast(result.reason);
  }
  renderSub();
  renderModes();
}

function applySelected(zoneId) {
  const result = sim.beginApply(state, {
    unitId: ui.selected,
    tool: ui.tool,
    agent: ui.agent,
    pattern: ui.pattern,
    zoneId: zoneId || undefined,
    activity: ui.panel === 'control' ? 'control' : 'extinguish',
  });
  if (!result.ok) toast(result.reason);
  else if (result.reached === false) toast('Stream is short of the fire. Move closer.');
}

function setView(name) {
  ui.view = name;
  view.setMode(name);
  for (const button of $('views').querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.view === name);
  }
}

function toast(text) {
  if (!text) return;
  const node = $('toast');
  node.textContent = text;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 2800);
}

function renderBrief() {
  const interior = ui.course === 'interior';
  $('brief-title').textContent = interior ? 'Cabin fire after landing' : 'Engine fire on the ramp';
  $('brief-copy').textContent = interior
    ? 'People are still aboard, counted only as a number. Do not start with Halon.'
    : 'Flames are just visible at the near engine. ' + (ui.rolled ? 'Conditions were re-rolled.' : 'This opening setup keeps that fire in view.');
  $('brief-course').textContent = interior ? 'Switch to exterior course' : 'Switch to interior course';
}

function renderSub() {
  const root = $('sub');
  const unit = sim.getUnit(state, ui.selected);
  const who = unit ? unit.name + ' / ' + unit.type : 'No unit';
  if (!ui.started) {
    root.innerHTML = '<h3>Waiting</h3><p>The aircraft is already on the ramp. Start the guided demo, or take command. Selecting a truck and clicking the concrete positions it, the way the 1988 touch map did.</p>';
    return;
  }
  if (ui.panel === 'extinguish' || ui.panel === 'control') {
    root.innerHTML = agentPanel(who, ui.panel === 'control' ? 'Control' : 'Extinguish');
    return;
  }
  if (ui.panel === 'command') {
    root.innerHTML = `
      <h3>Command · ${esc(who)}</h3>
      <p>Click the ramp to position the selected unit. You have to position apparatus before it can flow agent, rescue, or vent.</p>
      <div class="row">
        <button type="button" data-cmd="talk">Communicate</button>
        <button type="button" data-cmd="return">Return unit</button>
      </div>
      <p>Secure aircraft</p>
      <div class="row">${sim.SYSTEMS.map((s) => `<button type="button" data-cmd="secure" data-value="${s.id}" ${state.secured[s.id] ? 'disabled' : ''}>${esc(s.name)}</button>`).join('')}</div>
      <p>Request assistance</p>
      <div class="row">${sim.ASSISTANCE.map((a) => `<button type="button" data-cmd="assist" data-value="${a.id}" ${state.requests[a.id] ? 'disabled' : ''}>${esc(a.name)}</button>`).join('')}</div>`;
    return;
  }
  if (ui.panel === 'rescue' || ui.panel === 'vent') {
    const verb = ui.panel === 'rescue' ? 'Rescue' : 'Vent';
    root.innerHTML = `
      <h3>${verb} · ${esc(who)}</h3>
      <p>${ui.panel === 'rescue'
        ? 'Pick an entrance. Rescue moves an abstract count of people. There is no injury depiction. A blocked door will not open on this run.'
        : 'Open a door, the ramp, or a cut-in. If the cabin is not being suppressed, this toy lets that fire grow.'}</p>
      <div class="row">${state.entries.map((e) => `<button type="button" data-cmd="entry" data-value="${e.id}" ${e.blocked || e.vented && ui.panel === 'vent' ? 'disabled' : ''}>${esc(e.name)} · ${esc(e.kind)}${e.blocked ? ' · blocked' : ''}${e.vented ? ' · open' : ''}</button>`).join('')}</div>`;
    return;
  }
  if (ui.panel === 'protect') {
    root.innerHTML = `
      <h3>Protect · ${esc(who)}</h3>
      <p>Park beside an exposure and cover it. Spread into that zone slows while the unit stays there.</p>
      <div class="row">${state.zones.map((z) => `<button type="button" data-cmd="protect" data-value="${z.id}">${esc(z.name)}</button>`).join('')}</div>`;
    return;
  }
  if (ui.panel === 'overhaul') {
    root.innerHTML = `
      <h3>Overhaul · ${esc(who)}</h3>
      <p>After the flame is down, overhaul that spot. In this toy it stops a dry-chemical reflash. It will refuse a fully involved zone.</p>
      <div class="row">${state.zones.filter((z) => z.peak > 0).map((z) => `<button type="button" data-cmd="overhaul" data-value="${z.id}">${esc(z.name)}</button>`).join('')}</div>`;
    return;
  }
  if (ui.panel === 'log') {
    const lines = state.log.slice(-12).reverse().map((row) => `${sim.formatClock(row.t)}  ${row.activity}  ${row.unit}  ${row.detail}`).join('\n') || 'No decisions yet.';
    root.innerHTML = `<h3>Decision log</h3><div class="mono">${esc(lines)}</div>`;
    return;
  }
  root.innerHTML = '<h3>Ready</h3><p>Choose an activity.</p>';
}

function agentPanel(who, title) {
  const unit = sim.getUnit(state, ui.selected);
  const tools = sim.TOOLS.filter((t) => unit && unit.tools.includes(t.id));
  return `
    <h3>${title} · ${esc(who)}</h3>
    <p>Toy rules, not a procedure. AFFF is the strong match for the fuel fire here. Water barely moves a pool. Dry chemical can knock a flame down and let it return. Halon on the cabin while people are still aboard raises the unaccounted count, which is how the 1988 interior model treated that choice.</p>
    <p>Tool</p>
    <div class="row">${tools.map((t) => `<button type="button" data-cmd="tool" data-value="${t.id}" class="${ui.tool === t.id ? 'active' : ''}">${esc(t.name)}</button>`).join('')}</div>
    <p>Agent</p>
    <div class="row">${sim.AGENTS.map((a) => `<button type="button" data-cmd="agent" data-value="${a.id}" class="${ui.agent === a.id ? 'active' : ''}">${esc(a.name)}</button>`).join('')}</div>
    <p>Pattern</p>
    <div class="row">
      <button type="button" data-cmd="pattern" data-value="straight" class="${ui.pattern === 'straight' ? 'active' : ''}">Straight</button>
      <button type="button" data-cmd="pattern" data-value="fog" class="${ui.pattern === 'fog' ? 'active' : ''}">Fog</button>
    </div>
    <div class="row"><button type="button" class="primary" data-cmd="apply">Apply on hottest fire</button></div>
    <p>Or click a flame. The ring on the ramp is this tool’s reach. Green means a fire is inside it.</p>`;
}

function renderUnits() {
  const host = $('units');
  const key = state.units.map((unit) => unit.id).join(',');
  if (host.dataset.key !== key) {
    host.dataset.key = key;
    host.innerHTML = state.units.map((unit) => `<button type="button" class="unit" data-unit="${unit.id}">
      <b>${esc(unit.name)}</b>
      <small></small>
      <small></small>
    </button>`).join('');
  }
  for (const button of host.querySelectorAll('[data-unit]')) {
    const unit = sim.getUnit(state, button.dataset.unit);
    if (!unit) continue;
    const agentLeft = Object.entries(unit.tank)
      .filter(([, value]) => value > 0.5)
      .slice(0, 2)
      .map(([name, value]) => name + ' ' + Math.round(value))
      .join(' · ');
    const status = unit.onScene ? statusLabel(unit.status) : 'Incoming ' + Math.max(0, Math.ceil(unit.eta - state.time)) + 's';
    const lines = button.querySelectorAll('small');
    lines[0].textContent = unit.type + ' · ' + status;
    lines[1].textContent = agentLeft || 'no agent';
    button.classList.toggle('on', unit.id === ui.selected);
    button.disabled = !unit.onScene;
  }
}

function renderModes() {
  const unit = sim.getUnit(state, ui.selected);
  const mode = unit ? unit.mode : 'ready';
  for (const button of $('modes').querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.mode === mode);
  }
}

function statusLabel(status) {
  return {
    'standing-by': 'Standing by',
    'en-route': 'En route',
    'in-position': 'In position',
    applying: 'Applying',
    rescue: 'Rescue',
    ventilating: 'Venting',
    securing: 'Securing',
    overhaul: 'Overhaul',
    protecting: 'Protecting',
    'on-hydrant': 'On hydrant',
    incoming: 'Incoming',
  }[status] || status;
}

function renderHud() {
  const numbers = sim.situationNumbers(state);
  $('clock').textContent = sim.formatClock(state.time);
  $('course-label').textContent = (state.course === 'interior' ? 'Interior' : 'Exterior') + ' · toy index';
  $('n-wing').textContent = String(numbers.wingAndEngine);
  $('n-run').textContent = numbers.runningFeet + ' ft';
  $('n-spill').textContent = numbers.spillSqFt + ' sq ft';
  $('n-pool').textContent = numbers.poolSqFt + ' sq ft';
  $('n-smoke').textContent = String(numbers.smoke);
  const weather = state.weather;
  $('weather').textContent = 'Wind ' + weather.windKt + ' kt from ' + weather.windFrom + '° · ' + weather.tempC + '°C · distractors, no effect';
  const people = state.people;
  $('people').textContent = people.known || people.recovered > 0
    ? 'Aboard ' + people.aboard + ' · recovered ' + people.recovered + ' · unaccounted ' + people.unaccounted + ' (abstract)'
    : 'People aboard: unknown until size-up';
  $('feedback').textContent = state.hud.line || '';
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function frame(now) {
  const wall = Math.min(0.25, Math.max(0, (now - last) / 1000 || 0));
  last = now;
  let gameDt = 0;
  if (ui.started && !ui.paused && !state.ended) gameDt = wall * ui.speed;
  const realDt = Math.min(wall, 0.05);
  if (demo && gameDt > 0) runDemo(gameDt);
  if (gameDt > 0) sim.tick(state, gameDt);
  const unit = sim.getUnit(state, ui.selected);
  const range = unit && (ui.panel === 'extinguish' || ui.panel === 'control') ? sim.toolRange(ui.tool, ui.pattern) : 0;
  view.sync(state, realDt, {
    selectedId: ui.selected,
    range,
    entrances: ui.panel === 'rescue' || ui.panel === 'vent',
  });
  renderHud();
  if (ui.started) renderUnits();
  requestAnimationFrame(frame);
}

function startDemo() {
  ui.started = true;
  ui.paused = false;
  ui.speed = 1;
  $('speed').textContent = '1×';
  $('pause').textContent = 'Pause';
  ui.rolled = false;
  ui.seed = 141;
  state = makeState();
  ui.selected = 'crash3';
  ui.panel = 'extinguish';
  ui.tool = 'turret';
  ui.agent = 'afff';
  $('brief').hidden = true;
  demo = { steps: ui.course === 'interior' ? interiorScript() : exteriorScript(), index: 0, armed: false };
  $('demo').textContent = 'Take control';
  $('demo-banner').hidden = false;
  armDemo();
  renderSub();
}

function takeControl() {
  if (!demo) return;
  demo = null;
  $('demo').textContent = 'Guided demo';
  $('demo-banner').hidden = true;
  toast('You have control.');
  renderSub();
}

function exteriorScript() {
  const seat = state.zones.find((z) => z.seat);
  const entry = sim.openEntry(state, 'crew');
  const spot = sim.parkingSpot(state, seat.id, 'turret');
  const rescueSpot = sim.parkingNearEntry(state, entry.id);
  return [
    step('Size-up first. Name the seat of the fire before anyone flows agent.', (s) => sim.sizeUp(s), null, 6, 2.4),
    step('Crash 3, the large turret truck, is rolling to within turret reach of ' + seat.name + '.', (s) => {
      ui.selected = 'crash3';
      sim.orderMove(s, 'crash3', spot.x, spot.z);
      view.focus(seat.x, 3.4, seat.z);
    }, (s) => sim.getUnit(s, 'crash3').positioned, 18),
    step('Turret, AFFF, straight stream. If the stream falls short, the fire does not care.', (s) => {
      ui.panel = 'extinguish';
      sim.beginApply(s, { unitId: 'crash3', tool: 'turret', agent: 'afff', zoneId: seat.id, pattern: 'straight' });
      renderSub();
    }, (s) => sim.zoneById(s, seat.id).intensity < 8, 26),
    step('Overhaul the engine while the flame is down, so it stays down in this toy.', (s) => {
      sim.setUnitMode(s, 'crash3', 'ready');
      sim.beginOverhaul(s, { unitId: 'crash3', zoneId: seat.id });
    }, (s) => sim.zoneById(s, seat.id).overhauled, 12),
    step('Rescue 6 goes to the ' + entry.name.toLowerCase() + '. The people are a count, nothing graphic.', (s) => {
      ui.selected = 'rescue6';
      sim.orderMove(s, 'rescue6', rescueSpot.x, rescueSpot.z);
    }, (s) => sim.getUnit(s, 'rescue6').positioned, 16),
    step('Entry team is working the ' + entry.name.toLowerCase() + '.', (s) => {
      sim.beginRescue(s, { unitId: 'rescue6', entryId: entry.id });
    }, (s) => s.people.aboard === 0, 36),
    step('Engine 7 secures fuel so the toy pool stops feeding.', (s) => {
      ui.selected = 'engine7';
      sim.orderMove(s, 'engine7', 10, 14);
    }, (s) => sim.getUnit(s, 'engine7').positioned, 16),
    step('Fuel shutoff is a checklist item in this exercise, not a field procedure.', (s) => {
      sim.beginSecure(s, { unitId: 'engine7', system: 'fuel' });
    }, (s) => s.secured.fuel, 14),
  ];
}

function interiorScript() {
  const entry = sim.openEntry(state, 'crew');
  const rescueSpot = sim.parkingNearEntry(state, entry.id);
  return [
    step('Interior course. Size-up before anyone goes in. Halon is available and is the wrong first move while people are aboard.', (s) => {
      sim.sizeUp(s);
      view.focus(0, 3, -6);
      setView('orbit');
    }),
    step('Rescue 6 to the ' + entry.name.toLowerCase() + '. Engine 7 moves in to secure electrical.', (s) => {
      ui.selected = 'rescue6';
      sim.orderMove(s, 'rescue6', rescueSpot.x, rescueSpot.z);
      sim.orderMove(s, 'engine7', 8, -6);
    }, (s) => sim.getUnit(s, 'rescue6').positioned && sim.getUnit(s, 'engine7').positioned, 20),
    step('Rescue starts. Engine 7 secures electrical before water is worth much in this toy.', (s) => {
      sim.beginRescue(s, { unitId: 'rescue6', entryId: entry.id });
      sim.beginSecure(s, { unitId: 'engine7', system: 'electrical' });
    }, (s) => s.secured.electrical, 14),
    step('Handline and water on the cabin, now that electrical is secured. Still not Halon.', (s) => {
      ui.selected = 'engine7';
      ui.agent = 'water';
      ui.tool = 'handline';
      sim.beginApply(s, { unitId: 'engine7', tool: 'handline', agent: 'water', zoneId: 'cabin', pattern: 'straight' });
    }, (s) => s.people.aboard === 0 && sim.zoneById(s, 'cabin').intensity < 12, 70),
  ];
}

function step(cap, go, wait, timeout, hold) {
  return {
    cap,
    go,
    wait: wait || (() => true),
    timeout: timeout == null ? 0.1 : timeout,
    hold: hold || 0,
  };
}

function armDemo() {
  const current = demo && demo.steps[demo.index];
  if (!current) {
    const report = sim.endExercise(state);
    demo = null;
    $('demo').textContent = 'Guided demo';
    $('demo-banner').hidden = true;
    openAfter(report);
    return;
  }
  demo.armed = true;
  demo.t0 = state.time;
  $('demo-text').textContent = current.cap;
  current.go(state);
}

function runDemo() {
  const current = demo.steps[demo.index];
  if (!current) return;
  const held = state.time - demo.t0 < current.hold;
  const timedOut = state.time - demo.t0 > current.timeout;
  if (!held && (current.wait(state) || timedOut)) {
    demo.index += 1;
    demo.armed = false;
    armDemo();
  }
}

function openAfter(report) {
  ui.paused = true;
  $('pause').textContent = 'Resume';
  const rows = report.log.map((row) =>
    `${sim.formatClock(row.t).padEnd(6)} ${row.activity.padEnd(18)} ${row.unit}`
  ).join('\n');
  const damage = report.zones
    .filter((z) => z.peak > 0)
    .map((z) => `${z.name}: ${z.damage} (peak ${z.peak})`)
    .join('\n') || 'No zone grew enough to mark.';
  $('after-body').innerHTML = `
    <span class="tag">Illustrative after-action</span>
    <h2>${report.course === 'interior' ? 'Interior' : 'Exterior'} course · ${sim.formatClock(report.time)}</h2>
    <p>${esc(report.dispatch)}</p>
    <h3>People, abstract count</h3>
    <p>Recovered ${report.people.recovered}. Still aboard ${report.people.aboard}. Unaccounted ${report.people.unaccounted}. No injury is shown.</p>
    <h3>Damage in this toy</h3>
    <div class="mono">${esc(damage)}</div>
    <h3>Decisions</h3>
    <div class="mono">${esc(rows || 'None recorded.')}</div>
    <h3>Notes</h3>
    <ul>${report.notes.map((note) => `<li>${esc(note)}</li>`).join('')}</ul>
    <p>Wind was ${report.weather.windKt} kt from ${report.weather.windFrom}° and the temperature was ${report.weather.tempC}°C. Neither number entered the fire rules.</p>
    <div class="actions">
      <button type="button" class="primary" id="after-new">New conditions</button>
      <button type="button" id="after-same">Same setup</button>
      <button type="button" id="after-close">Close</button>
    </div>`;
  $('after').hidden = false;
  $('after-new').onclick = () => resetExercise(true);
  $('after-same').onclick = () => resetExercise(false);
  $('after-close').onclick = () => { $('after').hidden = true; };
}

function resetExercise(roll) {
  ui.rolled = roll;
  if (roll) ui.seed = (Math.random() * 1e9) | 0;
  demo = null;
  $('demo').textContent = 'Guided demo';
  $('demo-banner').hidden = true;
  state = makeState();
  ui.started = true;
  ui.paused = false;
  ui.selected = 'crash3';
  ui.panel = 'command';
  $('pause').textContent = 'Pause';
  $('after').hidden = true;
  renderSub();
  renderUnits();
}

function onKey(event) {
  if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) return;
  const keys = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 };
  if (keys[event.code] != null && state.units[keys[event.code]]) {
    ui.selected = state.units[keys[event.code]].id;
    renderUnits();
  } else if (event.code === 'Space') {
    event.preventDefault();
    $('pause').click();
  } else if (event.key === 'g' || event.key === 'G') {
    if (demo) takeControl();
    else startDemo();
  } else if (event.key === 'm' || event.key === 'M') setView('map');
  else if (event.key === 'b' || event.key === 'B') setView('bumper');
  else if (event.key === 'o' || event.key === 'O') setView('orbit');
  else if (event.key === 'i' || event.key === 'I') setView('interior');
  else if (event.key === 'Escape') {
    $('source').hidden = true;
    $('after').hidden = true;
  } else if (event.key === '?' ) {
    $('source').hidden = false;
  }
}

boot();

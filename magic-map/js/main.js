// ============================================================
// Magic Map — Squirrel Scouts. App bootstrap + game loop.
//
// The map/fog/location pieces are game-agnostic "core" services;
// the squirrel rules live in spawner/squirrels/achievements so
// more games can join the Magic Map later.
// ============================================================

import { CONFIG, THEMES, TRAILS, TILE_URLS, TILE_ATTRIB } from './config.js';
import { $, haversine, bearingTo, fmtDist, isNightTime } from './util.js';
import { GameState } from './state.js';
import { LocationEngine } from './geo.js';
import { FogLayer, cellsWithinRadius } from './fog.js';
import { RoadNetwork } from './roads.js';
import { Spawner } from './spawner.js';
import { SPECIES_BY_ID, RARITIES } from './squirrels.js';
import { checkAchievements } from './achievements.js';
import { UI } from './ui.js';

const state = new GameState();

// ---------- map ----------
const map = L.map('map', {
  zoomControl: false,
  attributionControl: true,
  maxZoom: 19,
  minZoom: 3,
});
map.setView(
  state.data.lastPos || CONFIG.MOCK_DEFAULT,
  17
);

let tileLayer = null;
function applyTheme(id) {
  const theme = THEMES[id] || THEMES.twilight;
  state.data.settings.theme = id;
  const url = TILE_URLS[theme.tiles];
  if (!tileLayer || tileLayer._mmUrl !== url) {
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(url, { attribution: TILE_ATTRIB, maxZoom: 19, subdomains: 'abcd' });
    tileLayer._mmUrl = url;
    tileLayer.addTo(map);
  }
  document.documentElement.style.setProperty('--tile-filter', theme.filter);
  document.documentElement.style.setProperty('--accent', theme.accent);
  state.save();
}
applyTheme(state.data.settings.theme);

// ---------- core services ----------
const fog = new FogLayer(map, state.exploredSet);
const roads = new RoadNetwork();

// ---------- player marker + trail ----------
const playerIcon = L.divIcon({
  className: 'player-marker',
  html: '<div class="player-dot-wrap"><div class="player-ring"></div><div class="player-dot"></div></div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});
let playerMarker = null;
let trailLine = null;
const trailPts = [];

function setTrailColor() {
  const t = TRAILS[state.data.settings.trail] || TRAILS.scout;
  if (trailLine) trailLine.setStyle({ color: t.color });
}

// ---------- spawner + catch flow ----------
const spawner = new Spawner(map, roads, state, { onTap: onSpawnTap });

function frontierFor(pos) {
  if (!state.data.home) return null;
  const d = haversine(state.data.home, pos);
  for (const tier of CONFIG.FRONTIER_TIERS) {
    if (d >= tier.dist) return tier;
  }
  return null;
}

function onSpawnTap(spawn) {
  if (spawn.state === 'rustle') {
    ui.toast('🍂 Something is rustling… get closer!');
    return;
  }
  if (spawn.state !== 'revealed') return;

  const species = SPECIES_BY_ID[spawn.speciesId];
  const rarity = RARITIES[species.rarity];
  const frontier = frontierFor(spawn);
  const xp = Math.round(rarity.xp * (frontier ? frontier.mult : 1));

  ui.showCatchModal({
    species,
    rarity,
    xp,
    isNew: !state.data.caught[species.id],
    frontierLabel: frontier ? frontier.label : null,
    onCatch: () => {
      const night = isNightTime();
      const { isNew, leveled } = state.registerCatch(species, { xp, isNight: night });
      spawner.collect(spawn);

      if (species.rarity === 'mythic') ui.toast(`🌟 MYTHIC! ${species.name} joins your den!`, 'gold');
      else if (species.rarity === 'legendary') ui.toast(`👑 Legendary ${species.name} befriended!`, 'gold');
      else if (isNew) ui.toast(`✨ New species: ${species.name}!`, 'green');
      else ui.toast(`🐿️ ${species.name} befriended! +${xp} XP`);

      announceLevels(leveled);
      announceAchievements();
      ui.refreshHud();
    },
  });
}

function announceLevels(leveled) {
  for (const lv of leveled || []) {
    const bits = [`+${lv.perks.acorns} 🌰`];
    if (lv.perks.detect) bits.push(`+${lv.perks.detect}m detection`);
    if (lv.perks.reveal) bits.push(`+${lv.perks.reveal}m fog torch`);
    ui.toast(`🎖️ Level ${lv.level}! ${bits.join(' · ')}`, 'gold');
  }
}

function announceAchievements() {
  for (const u of checkAchievements(state)) {
    ui.toast(u.text, 'gold');
  }
}

// ---------- UI ----------
const ui = new UI(state, {
  setTheme: (id) => applyTheme(id),
  setTrail: (id) => {
    state.data.settings.trail = id;
    state.save();
    setTrailColor();
  },
  setMock: (on) => setMockMode(on),
  resetGame: () => {
    state.reset();
    location.reload();
  },
});

// ---------- location handling ----------
const engine = new LocationEngine(onFix);
let prevFix = null;
let skipNextStep = false;   // set on teleports so they don't count as walking
let follow = true;

map.on('dragstart', () => { follow = false; });
$('#btn-center').addEventListener('click', () => {
  follow = true;
  if (engine.pos) map.setView([engine.pos.lat, engine.pos.lng], Math.max(map.getZoom(), 16));
});

function onFix(fix) {
  const pos = { lat: fix.lat, lng: fix.lng };

  if (!state.data.home) {
    state.data.home = pos;
    state.save();
  }
  state.data.lastPos = pos;

  // --- player marker + trail ---
  if (!playerMarker) {
    playerMarker = L.marker([pos.lat, pos.lng], { icon: playerIcon, keyboard: false, interactive: false }).addTo(map);
    trailLine = L.polyline([], { weight: 4, opacity: 0.55, color: '#5b9bd5' }).addTo(map);
    setTrailColor();
    map.setView([pos.lat, pos.lng], 17);
  } else {
    playerMarker.setLatLng([pos.lat, pos.lng]);
    if (follow) map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.4 });
  }
  trailPts.push([pos.lat, pos.lng]);
  if (trailPts.length > 300) trailPts.shift();
  trailLine.setLatLngs(trailPts);

  // --- distance accounting ---
  // prevFix only advances once we've moved MIN_STEP_M, so sub-metre
  // fixes (GPS jitter, 60fps mock steps) accumulate instead of vanishing.
  if (!prevFix || skipNextStep) {
    prevFix = { ...pos, ts: fix.ts };
  } else {
    const d = haversine(prevFix, pos);
    if (d >= CONFIG.MIN_STEP_M) {
      const dt = Math.max(0.001, (fix.ts - prevFix.ts) / 1000);
      const speed = d / dt;
      const speedOk = fix.mock || speed <= CONFIG.MAX_SPEED_MPS;
      const jumpOk = fix.mock || d <= CONFIG.MAX_JUMP_M;
      if (speedOk && jumpOk) {
        const { xpGained, leveled, dayQualified } = state.addDistance(d);
        if (dayQualified) ui.toast(`🔥 Day complete! Streak: ${state.data.streak}`, 'green');
        if (xpGained) announceLevels(leveled);
      }
      prevFix = { ...pos, ts: fix.ts };
    }
  }
  skipNextStep = false;

  // --- fog reveal ---
  const newCells = cellsWithinRadius(pos, state.revealRadius);
  if (state.addCells(newCells) > 0) fog.requestDraw();

  // --- world upkeep ---
  roads.ensure(pos);
  spawner.updateProximity(pos);
  announceAchievements();
  ui.refreshHud();
  state.save();
}

// ---------- game tick ----------
setInterval(() => {
  state.rolloverDay();
  if (engine.pos) {
    spawner.maintain(engine.pos);
    spawner.updateProximity(engine.pos);
  }
  ui.setBaitChip(spawner.baitUntil - Date.now());
  ui.refreshHud();
}, CONFIG.TICK_MS);

// ---------- bait ----------
$('#hud-acorns').addEventListener('click', () => {
  if (!engine.pos) return;
  if (spawner.baitActive) return ui.toast('🌰 Bait is already working!');
  if (state.data.acorns <= 0) return ui.toast('No acorns — earn more through achievements & levels!');
  state.data.acorns--;
  state.save();
  spawner.useBait(engine.pos);
  ui.setBaitChip(CONFIG.BAIT_DURATION_MS);
  ui.refreshHud();
  ui.toast('🌰 Acorn bait scattered! Squirrels incoming…', 'green');
});

// ---------- radar ----------
let radarTimer = null;
$('#btn-radar').addEventListener('click', () => {
  if (!engine.pos) return;
  const hit = spawner.nearest(engine.pos);
  if (!hit) return ui.toast('📡 No squirrels in range… keep walking!');
  clearTimeout(radarTimer);
  const update = () => {
    if (!engine.pos) return;
    const d = haversine(engine.pos, hit.spawn);
    ui.showRadar(bearingTo(engine.pos, hit.spawn), d);
  };
  update();
  const iv = setInterval(update, 1000);
  radarTimer = setTimeout(() => {
    clearInterval(iv);
    ui.hideRadar();
  }, 8000);
  ui.toast(`📡 Ping! Nearest squirrel ${fmtDist(hit.dist)} away`);
});

// ---------- mock mode ----------
const mockControls = $('#mock-controls');

function setMockMode(on) {
  state.data.settings.mock = on;
  state.save();
  mockControls.classList.toggle('hidden', !on);
  if (on) {
    engine.startMock(engine.pos || state.data.lastPos || CONFIG.MOCK_DEFAULT);
    ui.toast('🕹️ Demo mode — use the D-pad or teleport');
  } else {
    engine.stopMock();
    engine.startReal().then((ok) => {
      if (!ok) {
        ui.toast('GPS unavailable — staying in demo mode');
        setMockMode(true);
      }
    });
  }
}

// D-pad (hold to walk)
document.querySelectorAll('#dpad button').forEach((btn) => {
  const dir = btn.dataset.dir;
  const down = (e) => { e.preventDefault(); engine.pressDir(dir, true); };
  const up = (e) => { e.preventDefault(); engine.pressDir(dir, false); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('pointercancel', up);
});

// Keyboard movement for desktop testing
const KEY_DIRS = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e', w: 'n', s: 's', a: 'w', d: 'e' };
window.addEventListener('keydown', (e) => {
  const dir = KEY_DIRS[e.key];
  if (dir && engine.mock) { e.preventDefault(); engine.pressDir(dir, true); }
});
window.addEventListener('keyup', (e) => {
  const dir = KEY_DIRS[e.key];
  if (dir && engine.mock) engine.pressDir(dir, false);
});

$('#mock-speed').addEventListener('click', (e) => {
  e.currentTarget.textContent = engine.cycleSpeed() + '×';
});

const teleportBtn = $('#mock-teleport');
teleportBtn.addEventListener('click', () => {
  engine.teleportMode = !engine.teleportMode;
  teleportBtn.textContent = `📍 Teleport: ${engine.teleportMode ? 'ON — tap map' : 'off'}`;
  teleportBtn.classList.toggle('on', engine.teleportMode);
});

map.on('click', (e) => {
  if (engine.mock && engine.teleportMode) {
    skipNextStep = true;
    engine.teleport(e.latlng);
    spawner.clearAll();
    roads.fetchCenter = null; // force refetch at the new location
    roads.ensure(e.latlng).then(() => initialBurst());
  }
});

// ---------- boot ----------
const boot = $('#boot');

async function begin(useMock) {
  $('#boot-start').disabled = true;
  let ok = false;
  if (!useMock) {
    $('#boot-start').textContent = '🛰️ Finding you…';
    ok = await engine.startReal();
  }
  boot.remove();
  ui.showHud();

  if (!ok) {
    setMockMode(true);
    if (!useMock) ui.toast('GPS unavailable — demo mode enabled');
  } else if (state.data.settings.mock) {
    // user previously chose mock; honour real GPS now but keep the toggle handy
    state.data.settings.mock = false;
    state.save();
  }

  // Initial population once roads arrive (or fail → fallback spawns).
  const pos = engine.pos || CONFIG.MOCK_DEFAULT;
  roads.ensure(pos).then(() => initialBurst());

  announceAchievements();
  ui.refreshHud();
}

function initialBurst() {
  if (!engine.pos) return;
  const want = Math.max(0, 6 - spawner.spawns.length);
  for (let i = 0; i < want; i++) spawner.spawnOne(engine.pos);
  spawner.updateProximity(engine.pos);
}

$('#boot-start').addEventListener('click', () => begin(false));
$('#boot-demo').addEventListener('click', () => begin(true));

// Debug handle (also handy on-device via the console).
window.__mm = { state, spawner, engine, roads, fog, map };

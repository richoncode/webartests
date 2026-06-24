// ============================================================
// Magic Map — Squirrel Scouts. App bootstrap + game loop.
//
// The map/fog/location pieces are game-agnostic "core" services;
// the squirrel rules live in spawner/squirrels/achievements so
// more games can join the Magic Map later.
// ============================================================

import { CONFIG, THEMES, TRAILS, TILE_URLS, TILE_ATTRIB, APP_VERSION } from './config.js';
import { $, haversine, bearingTo, fmtDist, isNightTime, dayKey } from './util.js';
import { GameState } from './state.js';
import { LocationEngine } from './geo.js';
import { FogLayer, cellsWithinRadius } from './fog.js';
import { RoadNetwork } from './roads.js';
import { ParcelService } from './parcels.js';
import { CountryMode, makeCountryDemo } from './country.js';
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
  rotate: true,            // leaflet-rotate
  rotateControl: false,
  touchRotate: false,
  compassBearing: false,   // enabled via the 🧭 button
});
// Zoom 16 keeps the whole 90–430 m spawn ring on a phone screen.
map.setView(state.data.lastPos || CONFIG.MOCK_DEFAULT, 16);

let tileLayer = null;
let fogInitialized = false;
function applyTheme(id) {
  const isLight = state.data.settings.lightMode;
  let theme = THEMES[id] || THEMES.twilight;
  state.data.settings.theme = id;

  let url;
  let filter;
  let accent;

  if (isLight) {
    url = TILE_URLS.osm;
    filter = 'grayscale(1) brightness(0.65) contrast(5) brightness(1.5)';
    accent = '#002288'; // Deep navy blue
    document.documentElement.classList.add('light-theme');
  } else {
    url = TILE_URLS[theme.tiles];
    filter = theme.filter + (isNightTime() ? CONFIG.NIGHT_TILE_FILTER : '');
    accent = theme.accent;
    document.documentElement.classList.remove('light-theme');
  }

  if (!tileLayer || tileLayer._mmUrl !== url) {
    if (tileLayer) map.removeLayer(tileLayer);
    const subdomains = url.includes('openstreetmap.org') ? 'abc' : 'abcd';
    tileLayer = L.tileLayer(url, { attribution: TILE_ATTRIB, maxZoom: 19, subdomains: subdomains });
    tileLayer._mmUrl = url;
    tileLayer.addTo(map);
  }

  document.documentElement.style.setProperty('--tile-filter', filter);
  document.documentElement.style.setProperty('--accent', accent);
  
  if (fogInitialized && fog) {
    fog.requestDraw();
  }

  state.save();
}
applyTheme(state.data.settings.theme);
let nightNow = isNightTime();

// ---------- core services ----------
const fog = new FogLayer(map, state.exploredSet);
fogInitialized = true;
const roads = new RoadNetwork();
const parcels = new ParcelService();
const country = new CountryMode(roads, parcels);
let parcelOutline = null;   // Leaflet polygon drawn around your land in country mode

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

// ---------- country mode ----------
// Re-evaluate after road data is in hand; on a flip, repopulate the world
// with the new placement strategy and surface it to the player.
async function maybeUpdateCountry(pos) {
  if (!pos) return;
  const info = await country.evaluate(pos);
  spawner.setCountry(info);
  drawParcelOutline(info.active ? info.parcel : null);
  ui.setCountryChip(info);
  if (info.changed) {
    if (info.active) {
      ui.toast(`🌾 Country mode — squirrels placed across your land (${info.reason})`, 'green');
    } else {
      ui.toast('🏘️ Walkable streets — roadside spawns resumed');
    }
    spawner.maintain(pos);
    spawner.updateProximity(pos);
  }
  return info;
}

function drawParcelOutline(parcel) {
  if (parcelOutline) { map.removeLayer(parcelOutline); parcelOutline = null; }
  if (!parcel) return;
  parcelOutline = L.polygon(parcel.ring.map((p) => [p.lat, p.lng]), {
    color: '#7ce0c3', weight: 2, opacity: 0.8, dashArray: '6 6',
    fillColor: '#7ce0c3', fillOpacity: 0.07, interactive: false,
  }).addTo(map);
}

function frontierFor(pos) {
  if (!state.data.home) return null;
  const d = haversine(state.data.home, pos);
  for (const tier of CONFIG.FRONTIER_TIERS) {
    if (d >= tier.dist) return tier;
  }
  return null;
}

function onSpawnTap(spawn) {
  if (spawn.state === 'mystery') {
    ui.toast('✨ Something glimmers there… walk over to find out!');
    return;
  }
  if (spawn.state === 'rustle') {
    ui.toast('🍂 Something is rustling… get closer!');
    return;
  }
  if (spawn.state !== 'revealed') return;

  if (spawn.kind === 'cheeseburger') {
    ui.showBurgerModal({
      onClaim: () => {
        spawner.collect(spawn);
        ui.toast('🍔 Fake Five Guys delivery completed. No real order placed.', 'gold');
        ui.refreshHud();
      },
    });
    return;
  }

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
  setLightMode: (on) => {
    state.data.settings.lightMode = on;
    state.save();
    applyTheme(state.data.settings.theme);
    updateThemeToggleBtn();
  },
  setTrail: (id) => {
    state.data.settings.trail = id;
    state.save();
    setTrailColor();
  },
  setMock: (on) => setMockMode(on),
  tryCountryDemo: () => startCountryDemo(),
  resetGame: () => {
    state.reset();
    location.reload();
  },
});

// ---------- theme toggle ----------
const themeToggleBtn = $('#btn-theme-toggle');
themeToggleBtn.addEventListener('click', () => {
  const isLight = !state.data.settings.lightMode;
  state.data.settings.lightMode = isLight;
  state.save();
  applyTheme(state.data.settings.theme);
  updateThemeToggleBtn();
});

function updateThemeToggleBtn() {
  const isLight = state.data.settings.lightMode;
  themeToggleBtn.textContent = isLight ? '🌙' : '☀️';
  themeToggleBtn.title = isLight ? 'Switch to Dark Mode' : 'Switch to High-Contrast Bright Mode';
}
updateThemeToggleBtn();

// ---------- location handling ----------
const engine = new LocationEngine(onFix);
let prevFix = null;
let skipNextStep = false;   // set on teleports so they don't count as walking
let travelBearing = null;
let forwardSpawnAnchor = null;
let autoPan = true;
let autoPanPausedByUser = false;
let autoPanResumeWalked = 0;
let programmaticMapChange = 0;

function withProgrammaticMapChange(fn) {
  programmaticMapChange++;
  try {
    return fn();
  } finally {
    setTimeout(() => {
      programmaticMapChange = Math.max(0, programmaticMapChange - 1);
    }, 0);
  }
}

function setAutoPan(on, { center = false, silent = false } = {}) {
  autoPan = on;
  autoPanPausedByUser = !on;
  autoPanResumeWalked = 0;
  if (center && engine.pos) {
    withProgrammaticMapChange(() => {
      map.setView([engine.pos.lat, engine.pos.lng], Math.max(map.getZoom(), 15));
    });
  }
  if (!silent) {
    ui.toast(on
      ? '🎯 Map follow resumed'
      : `🖐️ Map follow paused — walk ${CONFIG.AUTO_PAN_RESUME_M}m or tap 🎯`);
  }
}

function pauseAutoPanByUser() {
  if (programmaticMapChange || !autoPan) return;
  setAutoPan(false);
}

function maybeAutoPanTo(pos) {
  if (!autoPan) return;
  const pt = map.latLngToContainerPoint([pos.lat, pos.lng]);
  const size = map.getSize();
  const band = CONFIG.AUTO_PAN_CENTER_FRACTION;
  const minX = size.x * (1 - band) / 2;
  const maxX = size.x * (1 + band) / 2;
  const minY = size.y * (1 - band) / 2;
  const maxY = size.y * (1 + band) / 2;
  if (pt.x < minX || pt.x > maxX || pt.y < minY || pt.y > maxY) {
    withProgrammaticMapChange(() => {
      map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.4 });
    });
  }
}

map.on('dragstart', pauseAutoPanByUser);
map.on('zoomstart', pauseAutoPanByUser);
$('#btn-center').addEventListener('click', () => {
  setAutoPan(true, { center: true });
});

// ---------- compass ----------
// Heading-follow is on by default (the map rotates so the direction
// you face points up). Tapping 🧭 locks north to the top; tapping
// again resumes following your heading.
let compassMode = 'north';
const compassBtn = $('#btn-compass');

async function setCompassMode(mode, { silent = false } = {}) {
  if (mode === 'follow') {
    if (!window.DeviceOrientationEvent || !map.compassBearing) {
      if (!silent) ui.toast('🧭 No compass on this device — north locked');
      mode = 'north';
    } else if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+: must be called from a user gesture.
      try {
        if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') {
          if (!silent) ui.toast('🧭 Compass permission denied — north locked');
          mode = 'north';
        }
      } catch (e) {
        mode = 'north';
      }
    }
  }
  compassMode = mode;
  if (mode === 'follow') {
    map.compassBearing.enable();
    compassBtn.classList.add('follow');
    if (!silent) ui.toast('🧭 Map follows your heading');
  } else {
    if (map.compassBearing) map.compassBearing.disable();
    map.setBearing(0);
    compassBtn.classList.remove('follow');
    if (!silent) ui.toast('🧭 North locked to top');
  }
}

compassBtn.addEventListener('click', () => {
  setCompassMode(compassMode === 'follow' ? 'north' : 'follow');
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
    withProgrammaticMapChange(() => map.setView([pos.lat, pos.lng], 16));
  } else {
    playerMarker.setLatLng([pos.lat, pos.lng]);
    maybeAutoPanTo(pos);
  }
  trailPts.push([pos.lat, pos.lng]);
  if (trailPts.length > 300) trailPts.shift();
  trailLine.setLatLngs(trailPts);

  // --- distance accounting ---
  // prevFix only advances once we've moved MIN_STEP_M, so sub-metre
  // fixes (GPS jitter, 60fps mock steps) accumulate instead of vanishing.
  if (!prevFix || skipNextStep) {
    prevFix = { ...pos, ts: fix.ts };
    travelBearing = null;
    forwardSpawnAnchor = pos;
  } else {
    const d = haversine(prevFix, pos);
    if (d >= CONFIG.MIN_STEP_M) {
      const dt = Math.max(0.001, (fix.ts - prevFix.ts) / 1000);
      const speed = d / dt;
      const speedOk = fix.mock || speed <= CONFIG.MAX_SPEED_MPS;
      const jumpOk = fix.mock || d <= CONFIG.MAX_JUMP_M;
      if (speedOk && jumpOk) {
        travelBearing = bearingTo(prevFix, pos);
        if (autoPanPausedByUser) {
          autoPanResumeWalked += d;
          if (autoPanResumeWalked >= CONFIG.AUTO_PAN_RESUME_M) {
            setAutoPan(true, { center: true });
          }
        }
        const { xpGained, leveled, dayQualified } = state.addDistance(d);
        if (dayQualified) ui.toast(`🔥 Day complete! Streak: ${state.data.streak}`, 'green');
        if (xpGained) announceLevels(leveled);
        if (!forwardSpawnAnchor) forwardSpawnAnchor = prevFix;
        if (haversine(forwardSpawnAnchor, pos) >= CONFIG.SPAWN_FORWARD_STEP_M) {
          spawner.maintain(pos, { travelBearing });
          forwardSpawnAnchor = pos;
        }
      }
      prevFix = { ...pos, ts: fix.ts };
    }
  }
  skipNextStep = false;

  // --- fog reveal ---
  const newCells = cellsWithinRadius(pos, state.revealRadius);
  if (state.addCells(newCells) > 0) fog.requestDraw();

  // --- world upkeep ---
  roads.ensure(pos).then(() => maybeUpdateCountry(pos));
  spawner.updateProximity(pos);
  announceAchievements();
  ui.refreshHud();
  state.save();
}

// ---------- daily gift ----------
function checkDailyGift() {
  const today = dayKey();
  if (state.data.lastGiftDay === today) return;
  state.data.lastGiftDay = today;
  const n = CONFIG.GIFT_BASE_ACORNS + Math.floor(state.data.streak / CONFIG.GIFT_STREAK_DIV);
  state.data.acorns += n;
  state.save();
  ui.toast(`🌅 Daily gift: +${n} acorn${n > 1 ? 's' : ''}`, 'green');
  ui.refreshHud();
}

// ---------- game tick ----------
setInterval(() => {
  state.rolloverDay();
  checkDailyGift(); // also fires if the app stays open past midnight
  if (isNightTime() !== nightNow) {
    nightNow = isNightTime();
    applyTheme(state.data.settings.theme);
    ui.toast(nightNow
      ? '🌙 Night falls — flying squirrels emerge…'
      : '☀️ A new day dawns on the Magic Map');
  }
  if (engine.pos) {
    spawner.maintain(engine.pos, { travelBearing });
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

// ---------- squirrel call ----------
let audioCtx = null;
function playSquirrelCall() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const out = audioCtx.createGain();
    const main = audioCtx.createOscillator();
    const chirp = audioCtx.createOscillator();
    const trem = audioCtx.createGain();

    main.type = 'triangle';
    chirp.type = 'sine';
    main.frequency.setValueAtTime(760, now);
    main.frequency.exponentialRampToValueAtTime(1320, now + 0.13);
    main.frequency.exponentialRampToValueAtTime(920, now + 0.27);
    chirp.frequency.setValueAtTime(1850, now + 0.07);
    chirp.frequency.exponentialRampToValueAtTime(2400, now + 0.18);

    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
    out.gain.exponentialRampToValueAtTime(0.035, now + 0.2);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    trem.gain.setValueAtTime(0.35, now);

    main.connect(out);
    chirp.connect(trem);
    trem.connect(out);
    out.connect(audioCtx.destination);
    main.start(now);
    chirp.start(now + 0.06);
    main.stop(now + 0.38);
    chirp.stop(now + 0.24);
    main.onended = () => {
      main.disconnect();
      chirp.disconnect();
      trem.disconnect();
      out.disconnect();
    };
  } catch (e) {
    // Audio is a flourish; spawning still works if the browser blocks it.
  }
}

const callBtn = $('#btn-call');

let callHoldTimer = null;
let callHoldFired = false;

function cancelCallHold() {
  if (callHoldTimer) {
    clearTimeout(callHoldTimer);
    callHoldTimer = null;
  }
  callBtn.classList.remove('holding');
}

async function repopulateFromSquirrelCall() {
  if (!engine.pos || callBtn.disabled) return;
  callHoldFired = true;
  playSquirrelCall();
  callBtn.disabled = true;
  callBtn.classList.remove('holding');
  callBtn.classList.add('calling');
  try {
    const pos = { lat: engine.pos.lat, lng: engine.pos.lng };
    await roads.ensure(pos);
    await maybeUpdateCountry(pos);
    spawner.clearAll();
    initialBurst();
    spawner.updateProximity(pos);
    ui.toast(`📯 Fresh squirrels answered — ${spawner.spawns.length} nearby`, 'green');
  } finally {
    setTimeout(() => {
      callBtn.disabled = false;
      callBtn.classList.remove('calling');
    }, 900);
  }
}

callBtn.addEventListener('pointerdown', (e) => {
  if (!engine.pos || callBtn.disabled) return;
  callHoldFired = false;
  cancelCallHold();
  callBtn.classList.add('holding');
  callHoldTimer = setTimeout(() => {
    callHoldTimer = null;
    repopulateFromSquirrelCall();
  }, CONFIG.SQUIRREL_CALL_RESET_HOLD_MS);
  try { callBtn.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
});

['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'].forEach((eventName) => {
  callBtn.addEventListener(eventName, cancelCallHold);
});

callBtn.addEventListener('click', async (e) => {
  if (callHoldFired) {
    e.preventDefault();
    callHoldFired = false;
    return;
  }
  if (!engine.pos || callBtn.disabled) return;
  playSquirrelCall();
  callBtn.disabled = true;
  callBtn.classList.add('calling');
  try {
    const pos = { lat: engine.pos.lat, lng: engine.pos.lng };
    await roads.ensure(pos);
    await maybeUpdateCountry(pos);
    const result = spawner.callSquirrel(pos);
    if (result.reason === 'full') {
      ui.toast('📯 The area is already lively — befriend a squirrel first');
    } else if (!result.spawn) {
      ui.toast(`📯 No safe spot within ${CONFIG.SQUIRREL_CALL_RADIUS}m — try a path or sidewalk`);
    } else {
      const d = Math.round(haversine(pos, result.spawn));
      const label = result.spawn.kind === 'cheeseburger' ? 'cheeseburger' : 'squirrel';
      ui.toast(`📯 A ${label} answers ${d}m away!`, 'green');
    }
  } finally {
    setTimeout(() => {
      callBtn.disabled = false;
      callBtn.classList.remove('calling');
    }, 900);
  }
});

// ---------- radar ----------
let radarTimer = null;
$('#btn-radar').addEventListener('click', () => {
  if (!engine.pos) return;
  const hit = spawner.nearest(engine.pos);
  if (!hit) return ui.toast('📡 No signals in range… keep walking!');
  clearTimeout(radarTimer);
  const label = hit.spawn.kind === 'cheeseburger' ? 'cheeseburger' : 'squirrel';
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
  ui.toast(`📡 Ping! Nearest ${label} ${fmtDist(hit.dist)} away`);
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

// Country-mode demo: pin a synthetic 55 mph highway + ~1.3-acre lot and
// drop the player onto it, so the on-your-land placement is testable
// anywhere (mock mode required to teleport).
function startCountryDemo() {
  if (!engine.mock) setMockMode(true);
  const center = CONFIG.COUNTRY.DEMO_CENTER;
  const demo = makeCountryDemo(center);
  roads.useDemo([demo.road], center);
  parcels.mockParcel = demo.parcel;
  country.invalidate();
  spawner.clearAll();
  skipNextStep = true; // the jump to the demo lot must not count as walking
  engine.teleport(center);
  setAutoPan(true, { silent: true });
  withProgrammaticMapChange(() => map.setView([center.lat, center.lng], 18));
  maybeUpdateCountry(center).then(() => initialBurst());
  ui.closePanel();
  ui.toast('🌾 Country demo: 55 mph road + 1.3-acre lot — walk your land!', 'green');
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
    // Leaving any pinned demo; force a fresh road + parcel evaluation here.
    roads.clearDemo();
    parcels.mockParcel = null;
    country.invalidate();
    roads.ensure(e.latlng)
      .then(() => maybeUpdateCountry(e.latlng))
      .then(() => initialBurst());
  }
});

// ---------- boot ----------
const boot = $('#boot');
$('#boot-version').textContent = APP_VERSION;

async function begin(useMock) {
  $('#boot-start').disabled = true;
  // Compass-follow is the default. Request the sensor permission now,
  // inside the boot tap's user-gesture window, before the GPS prompt
  // consumes it on iOS.
  await setCompassMode('follow', { silent: true });
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

  // Bring back squirrels that were alive before the browser closed.
  spawner.restore(state.data.activeSpawns);
  if (engine.pos) spawner.updateProximity(engine.pos);

  // Initial population once roads arrive (or fail → fallback spawns).
  const pos = engine.pos || CONFIG.MOCK_DEFAULT;
  roads.ensure(pos)
    .then(() => maybeUpdateCountry(pos))
    .then(() => initialBurst());

  checkDailyGift();
  announceAchievements();
  ui.refreshHud();
}

function initialBurst() {
  if (!engine.pos) return;
  const want = Math.max(0, 6 - spawner.spawns.length);
  for (let i = 0; i < want; i++) spawner.spawnOne(engine.pos, { placement: { mode: 'balanced' } });
  spawner.updateProximity(engine.pos);
}

$('#boot-start').addEventListener('click', () => begin(false));
$('#boot-demo').addEventListener('click', () => begin(true));

// Debug handle (also handy on-device via the console).
window.__mm = { state, spawner, engine, roads, parcels, country, fog, map };

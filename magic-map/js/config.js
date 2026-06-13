// ============================================================
// Magic Map — central tuning knobs.
// All distances in metres unless noted.
// ============================================================

// Bump on every deploy — shown on the boot screen and in Settings so
// phone testers can confirm which build they're running.
export const APP_VERSION = 'v0.11 · 2026-06-12 · high-contrast light mode';

export const CONFIG = {
  STORAGE_KEY: 'magic-map-squirrels-v1',

  // --- Fog of war ---
  CELL_M: 50,              // exploration grid cell size
  REVEAL_BASE: 90,         // fog reveal radius around player
  REVEAL_CAP: 280,

  // --- Squirrel proximity ---
  DETECT_BASE: 60,         // "rustle" hint becomes visible
  DETECT_CAP: 160,
  CATCH_RADIUS: 28,        // squirrel reveals + becomes tappable
  // When standing near a street, the catch radius stretches so it
  // always reaches squirrels on the far sidewalk — nobody should be
  // tempted to step into the road for a catch.
  CATCH_ROAD_NEAR: 30,     // player within this of a motor road → stretch
  CATCH_REACH_PAD: 25,     // far-sidewalk allowance added to that distance
  CATCH_REACH_CAP: 55,

  // --- Spawning ---
  MAX_ACTIVE: 14,
  SPAWN_RING_MIN: 90,      // spawn no closer than this to player
  SPAWN_RING_MAX: 430,
  SPAWN_MIN_GAP: 30,       // min distance between two spawns
  DESPAWN_DIST: 800,
  TTL_MIN_MS: 12 * 60 * 1000,
  TTL_MAX_MS: 25 * 60 * 1000,
  TICK_MS: 5000,
  SPAWN_CHANCE: 0.55,      // per tick, when below MAX_ACTIVE

  // --- Safe pathing (road-aware spawns) ---
  ROAD_FETCH_RADIUS: 600,
  ROAD_REFETCH_DIST: 350,  // refetch roads after moving this far
  ROAD_MIN_SAFE: 7,        // never closer than this to a motor-road centreline

  // --- Movement / distance accounting ---
  MIN_STEP_M: 2,           // ignore GPS jitter below this
  MAX_SPEED_MPS: 6,        // ignore faster-than-running fixes (driving)
  MAX_JUMP_M: 150,         // ignore single-fix teleports (real GPS only)
  DAY_GOAL_M: 250,         // distance that makes a day count for the streak

  // --- GPS jitter filtering (real fixes only) ---
  // Position = rolling median of recent fixes; while standing still the
  // median sits at the noise centroid, so 15-30m bounces cancel out.
  GPS_ACC_SKIP: 50,        // discard fixes less accurate than this…
  GPS_ACC_SKIP_STALE: 100, // …unless we've heard nothing for GPS_STALE_MS
  GPS_STALE_MS: 20000,
  GPS_MEDIAN_WINDOW: 7,    // fixes in the median buffer
  GPS_WINDOW_MS: 15000,    // …no older than this
  GPS_GATE_MIN: 3,         // median must move at least this to emit…
  GPS_GATE_K: 2.0,         // …or K× the buffer's own scatter, if larger

  // --- Daily gift (per calendar day the game is opened) ---
  GIFT_BASE_ACORNS: 1,
  GIFT_STREAK_DIV: 7,      // +1 acorn per 7 days of streak

  // --- Night (20:00–06:00): extra map darkening, flying squirrels ---
  NIGHT_TILE_FILTER: ' brightness(0.78) saturate(0.85)',

  // --- XP ---
  XP_PER_250M: 15,
  XP_PER_NEW_CELL: 1,

  // --- Bait ---
  BAIT_DURATION_MS: 10 * 60 * 1000,
  BAIT_BURST: 2,           // guaranteed nearby spawns on use
  BAIT_SPAWN_MULT: 2.2,

  // --- Frontier bonus: catches far from home earn more XP ---
  FRONTIER_TIERS: [
    { dist: 5000, mult: 2.0, label: 'Far Frontier ×2 XP' },
    { dist: 2000, mult: 1.5, label: 'Frontier ×1.5 XP' },
    { dist: 1000, mult: 1.25, label: 'Wanderer ×1.25 XP' },
  ],

  // --- Country mode ---
  // When you live along a fast road that is unsafe to walk, but own enough
  // land, squirrels are placed across your *own property* instead of along
  // the roadside. Triggered only when both conditions hold.
  COUNTRY: {
    SPEED_MPH_THRESHOLD: 35,   // a nearby road faster than this is unsafe to walk
    ROAD_PROBE_RADIUS: 70,     // how far to look for "the highway you live along"
    MIN_ACRES: 0.5,            // need at least this much land to host spawns
    ROAD_SETBACK: 14,          // keep spawns this far back from any motor-road centreline
    PARCEL_INSET: 4,           // keep spawns inside the property line by this much
    MIN_GAP: 16,               // minimum spacing between spawns on a parcel (even spread)
    SQUIRRELS_PER_ACRE: 5,     // population target scales with property size
    MAX_ON_PARCEL: 14,
    CANDIDATES: 24,            // best-candidate samples per spawn (blue-noise spread)
    REEVAL_DIST: 40,           // re-evaluate country mode after moving this far
    PARCEL_FETCH_RADIUS: 130,  // OSM fallback: search radius for an enclosing lot
    DEMO_CENTER: { lat: 38.0297, lng: -78.6569 }, // rural lot for the in-app demo
  },

  // Local parcel record services (ArcGIS FeatureServer layer URLs, no trailing
  // /query). Empty by default — set per deployment region. Each must accept an
  // esriGeometryPoint "intersects" query and can return GeoJSON.
  PARCEL_ENDPOINTS: [],

  // --- Mock mode ---
  MOCK_WALK_MPS: 1.5,
  MOCK_SPEEDS: [1, 4, 15],
  MOCK_DEFAULT: { lat: 37.7694, lng: -122.4862 }, // Golden Gate Park

  OVERPASS_ENDPOINTS: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ],
};

// ============================================================
// Map themes — vibrant Niantic-ish looks built by CSS-filtering
// CARTO basemap tiles. `filter` applies to the tile pane only.
// ============================================================

export const TILE_URLS = {
  voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  voyagerLabels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

export const TILE_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export const THEMES = {
  twilight: {
    name: 'Twilight',
    tiles: 'voyagerLabels',
    filter: 'invert(1) hue-rotate(310deg) brightness(0.95) saturate(1.4)',
    accent: '#5b9bd5',
    unlocked: true,
  },
  ember: {
    name: 'Ember',
    tiles: 'voyagerLabels',
    filter: 'invert(1) hue-rotate(120deg) brightness(0.92) saturate(1.5)',
    accent: '#f0a040',
  },
  matrix: {
    name: 'Matrix',
    tiles: 'voyagerLabels',
    filter: 'invert(1) hue-rotate(260deg) brightness(0.88) saturate(1.6)',
    accent: '#4caf50',
  },
  aurora: {
    name: 'Aurora',
    tiles: 'voyagerLabels',
    filter: 'invert(1) hue-rotate(285deg) brightness(0.93) saturate(1.5)',
    accent: '#7ce0c3',
  },
  noir: {
    name: 'Noir',
    tiles: 'dark',
    filter: 'none',
    accent: '#aaaaaa',
  },
};

export const TRAILS = {
  scout: { name: 'Scout Blue', color: '#5b9bd5', unlocked: true },
  ember: { name: 'Ember', color: '#f0a040' },
  neon: { name: 'Neon', color: '#ff5bd5' },
  gold: { name: 'Gold', color: '#ffd700' },
  matrix: { name: 'Matrix', color: '#4caf50' },
};

// Level-up perks, applied once per level gained.
// Every level: +1 acorn. Even levels: +4m detect. Every 3rd: +12m reveal.
export function perksForLevel(level) {
  const p = { acorns: 1, detect: 0, reveal: 0 };
  if (level % 2 === 0) p.detect = 4;
  if (level % 3 === 0) p.reveal = 12;
  return p;
}

// XP curve: total XP required to *reach* level L is 60·(L-1)².
export function levelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1;
}
export function xpForLevel(level) {
  return 60 * (level - 1) * (level - 1);
}

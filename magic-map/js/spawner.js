// ============================================================
// Spawner — manages the live population of squirrels on the
// map. Each spawn moves through three visibility states based
// on the player's distance:
//   mystery → beyond detect radius: a faint 🐾 glimmer through
//             the fog (rare+ species add a coloured beacon)
//   rustle  → within detect radius: a shaking 🍂 hint
//   revealed→ within catch radius: the squirrel itself, tappable
// ============================================================

import { CONFIG } from './config.js';
import { SPECIES_BY_ID, RARITIES, pickSpecies } from './squirrels.js';
import { haversine, rand, pointInPolygon } from './util.js';

let nextId = 1;

export class Spawner {
  constructor(map, roads, state, { onTap }) {
    this.map = map;
    this.roads = roads;
    this.state = state;
    this.onTap = onTap;        // (spawn) => void
    this.spawns = [];          // { id, speciesId, lat, lng, bornAt, ttl, state, marker }
    this.baitUntil = 0;
    // Country mode: when active, squirrels populate the player's parcel
    // (evenly spread) instead of the roadside ring.
    this.country = { active: false, parcel: null, cap: CONFIG.MAX_ACTIVE };
  }

  // Switch placement strategy when CountryMode flips. Scales the live
  // population to the size of the property and drops any spawns that no
  // longer belong (roadside spawns once we move onto the land, or spawns
  // left outside the parcel after a mode/parcel change).
  setCountry(info) {
    this.country.active = !!info.active;
    this.country.parcel = info.parcel || null;
    if (info.active && info.parcel) {
      const C = CONFIG.COUNTRY;
      this.country.cap = Math.max(3, Math.min(C.MAX_ON_PARCEL, Math.round(info.parcel.acres * C.SQUIRRELS_PER_ACRE)));
      for (const s of [...this.spawns]) {
        if (!pointInPolygon(s, info.parcel.ring)) this._remove(s);
      }
    } else {
      this.country.cap = CONFIG.MAX_ACTIVE;
    }
  }

  get activePoints() {
    return this.spawns.map((s) => ({ lat: s.lat, lng: s.lng }));
  }

  get baitActive() {
    return Date.now() < this.baitUntil;
  }

  // ---------- persistence (squirrels survive a browser reset) ----------
  _persist() {
    this.state.data.activeSpawns = this.spawns.map((s) => ({
      speciesId: s.speciesId,
      lat: s.lat,
      lng: s.lng,
      bornAt: s.bornAt,
      ttl: s.ttl,
    }));
    this.state.save();
  }

  restore(saved) {
    const now = Date.now();
    for (const r of saved || []) {
      if (!r || now - r.bornAt > r.ttl) continue; // expired while away
      this.spawns.push({ id: nextId++, ...r, state: 'hidden', marker: null });
    }
    this._persist();
  }

  // Called every TICK_MS and after big player moves.
  maintain(playerPos) {
    if (!playerPos) return;
    const now = Date.now();

    // Cull: too far, or expired.
    for (const s of [...this.spawns]) {
      const far = haversine(playerPos, s) > CONFIG.DESPAWN_DIST;
      const old = now - s.bornAt > s.ttl;
      if (far || old) this._remove(s);
    }

    // Top up toward the cap (smaller on a country parcel). Below a baseline
    // there is always something to chase, so spawn deterministically; above
    // it, spawn by chance.
    const maxActive = this.country.active ? this.country.cap : CONFIG.MAX_ACTIVE;
    const baseline = Math.min(6, maxActive);
    const deficit = maxActive - this.spawns.length;
    if (deficit <= 0) return;
    if (this.spawns.length < baseline) this.spawnOne(playerPos);
    let chance = CONFIG.SPAWN_CHANCE;
    if (this.baitActive) chance = Math.min(1, chance * CONFIG.BAIT_SPAWN_MULT);
    // Bigger deficits fill faster (fresh areas populate quickly).
    const tries = deficit > 8 ? 3 : 1;
    for (let i = 0; i < tries; i++) {
      if (Math.random() < chance) this.spawnOne(playerPos);
    }
  }

  spawnOne(playerPos, { nearby = false, ring = null } = {}) {
    let pt;
    if (this.country.active && this.country.parcel) {
      // On the player's own land — even spread, no roadside ring.
      pt = this.roads.sampleParcelPoint(this.country.parcel, this.activePoints, ring ? playerPos : null, ring);
    } else if (nearby) {
      pt = this.roads.sampleNearbyPoint(playerPos, this.activePoints);
    } else {
      pt = this.roads.sampleSpawnPoint(playerPos, this.activePoints, ring);
    }
    if (!pt) return null;

    const species = pickSpecies({ luck: this.state.luck });
    const spawn = {
      id: nextId++,
      speciesId: species.id,
      lat: pt.lat,
      lng: pt.lng,
      bornAt: Date.now(),
      ttl: rand(CONFIG.TTL_MIN_MS, CONFIG.TTL_MAX_MS),
      state: 'hidden',
      marker: null,
    };
    this.spawns.push(spawn);
    this._persist();
    return spawn;
  }

  callSquirrel(playerPos) {
    const maxActive = this.country.active ? this.country.cap : CONFIG.MAX_ACTIVE;
    if (this.spawns.length >= maxActive) return { spawn: null, reason: 'full' };
    const ring = { min: CONFIG.SQUIRREL_CALL_RING_MIN, max: CONFIG.SQUIRREL_CALL_RADIUS };
    const spawn = this.spawnOne(playerPos, { ring });
    if (!spawn) return { spawn: null, reason: 'no-safe-spot' };
    this.updateProximity(playerPos);
    return { spawn, reason: 'ok' };
  }

  // Use one acorn: burst of close spawns + boosted rate for a while.
  useBait(playerPos) {
    this.baitUntil = Date.now() + CONFIG.BAIT_DURATION_MS;
    for (let i = 0; i < CONFIG.BAIT_BURST; i++) {
      this.spawnOne(playerPos, { nearby: true });
    }
    this.updateProximity(playerPos);
  }

  // Effective catch radius: when the player stands near a street, it
  // stretches to cover the far sidewalk so squirrels across the road
  // are befriendable without stepping into traffic.
  catchRadius(playerPos) {
    let r = CONFIG.CATCH_RADIUS;
    if (this.roads && this.roads.ready) {
      const dRoad = this.roads.minMotorDistance(playerPos);
      if (isFinite(dRoad) && dRoad < CONFIG.CATCH_ROAD_NEAR) {
        r = Math.min(CONFIG.CATCH_REACH_CAP, Math.max(r, dRoad + CONFIG.CATCH_REACH_PAD));
      }
    }
    return r;
  }

  // Re-evaluate marker states from the player's position.
  updateProximity(playerPos) {
    if (!playerPos) return;
    const detect = this.state.detectRadius;
    const catchR = this.catchRadius(playerPos);
    for (const s of this.spawns) {
      const d = haversine(playerPos, s);
      let st = 'mystery';
      if (d <= catchR) st = 'revealed';
      else if (d <= detect) st = 'rustle';
      if (st !== s.state) {
        s.state = st;
        this._renderMarker(s);
      }
    }
  }

  nearest(playerPos) {
    let best = null;
    let bestD = Infinity;
    for (const s of this.spawns) {
      const d = haversine(playerPos, s);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best ? { spawn: best, dist: bestD } : null;
  }

  collect(spawn) {
    this._remove(spawn);
  }

  clearAll() {
    for (const s of [...this.spawns]) this._remove(s);
  }

  _remove(spawn) {
    if (spawn.marker) this.map.removeLayer(spawn.marker);
    this.spawns = this.spawns.filter((s) => s !== spawn);
    this._persist();
  }

  _renderMarker(spawn) {
    if (spawn.marker) {
      this.map.removeLayer(spawn.marker);
      spawn.marker = null;
    }
    if (spawn.state === 'hidden') return;

    let icon;
    if (spawn.state === 'mystery') {
      const species = SPECIES_BY_ID[spawn.speciesId];
      const rarity = RARITIES[species.rarity];
      const beacon = rarity.xp >= 90; // rare and above broadcast a glow column
      icon = L.divIcon({
        className: '',
        html: `<div class="mystery-marker">
                 ${beacon ? `<div class="beacon" style="--bc:${rarity.color}"></div>` : ''}
                 <span class="myst-paw">🐾</span>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    } else if (spawn.state === 'rustle') {
      icon = L.divIcon({
        className: '',
        html: '<div class="rustle-marker">🍂</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    } else {
      const species = SPECIES_BY_ID[spawn.speciesId];
      const rarity = RARITIES[species.rarity];
      const scale = species.scale || 1;
      icon = L.divIcon({
        className: '',
        html: `<div class="sq-marker revealed" style="--glow:${rarity.glow}">
                 <div class="sq-glow"></div>
                 <span class="sq-emoji" style="--sqf:${species.filter}; font-size:${Math.round(30 * scale)}px">🐿️</span>
               </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 30],
      });
    }

    spawn.marker = L.marker([spawn.lat, spawn.lng], { icon, keyboard: false }).addTo(this.map);
    spawn.marker.on('click', () => this.onTap(spawn));
  }
}

// ============================================================
// Spawner — manages the live population of squirrels on the
// map. Each spawn moves through three visibility states based
// on the player's distance:
//   hidden  → no marker at all
//   rustle  → within detect radius: a shaking 🍂 hint
//   revealed→ within catch radius: the squirrel itself, tappable
// ============================================================

import { CONFIG } from './config.js';
import { SPECIES_BY_ID, RARITIES, pickSpecies } from './squirrels.js';
import { haversine, rand } from './util.js';

let nextId = 1;

export class Spawner {
  constructor(map, roads, state, { onTap }) {
    this.map = map;
    this.roads = roads;
    this.state = state;
    this.onTap = onTap;        // (spawn) => void
    this.spawns = [];          // { id, speciesId, lat, lng, bornAt, ttl, state, marker }
    this.baitUntil = 0;
  }

  get activePoints() {
    return this.spawns.map((s) => ({ lat: s.lat, lng: s.lng }));
  }

  get baitActive() {
    return Date.now() < this.baitUntil;
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

    // Top up.
    const deficit = CONFIG.MAX_ACTIVE - this.spawns.length;
    if (deficit <= 0) return;
    let chance = CONFIG.SPAWN_CHANCE;
    if (this.baitActive) chance = Math.min(1, chance * CONFIG.BAIT_SPAWN_MULT);
    // Bigger deficits fill faster (fresh areas populate quickly).
    const tries = deficit > 8 ? 3 : 1;
    for (let i = 0; i < tries; i++) {
      if (Math.random() < chance) this.spawnOne(playerPos);
    }
  }

  spawnOne(playerPos, { nearby = false } = {}) {
    const pt = nearby
      ? this.roads.sampleNearbyPoint(playerPos, this.activePoints)
      : this.roads.sampleSpawnPoint(playerPos, this.activePoints);
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
    return spawn;
  }

  // Use one acorn: burst of close spawns + boosted rate for a while.
  useBait(playerPos) {
    this.baitUntil = Date.now() + CONFIG.BAIT_DURATION_MS;
    for (let i = 0; i < CONFIG.BAIT_BURST; i++) {
      this.spawnOne(playerPos, { nearby: true });
    }
    this.updateProximity(playerPos);
  }

  // Re-evaluate marker states from the player's position.
  updateProximity(playerPos) {
    if (!playerPos) return;
    const detect = this.state.detectRadius;
    for (const s of this.spawns) {
      const d = haversine(playerPos, s);
      let st = 'hidden';
      if (d <= CONFIG.CATCH_RADIUS) st = 'revealed';
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
  }

  _renderMarker(spawn) {
    if (spawn.marker) {
      this.map.removeLayer(spawn.marker);
      spawn.marker = null;
    }
    if (spawn.state === 'hidden') return;

    let icon;
    if (spawn.state === 'rustle') {
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

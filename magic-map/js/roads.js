// ============================================================
// Road network around the player, fetched from OpenStreetMap
// via the Overpass API. Used to generate spawn points that hug
// sidewalks and paths but are *offset perpendicular* from every
// road centreline — squirrels never sit in the middle of a
// street, and motor roads enforce a minimum safe distance.
// ============================================================

import { CONFIG } from './config.js';
import { haversine, destPoint, bearingTo, makeProjector, distPointToSegXY, rand, weightedChoice } from './util.js';

// Walkability weight (how attractive for spawns) and the
// perpendicular offset range (m) from the centreline per class.
const ROAD_CLASSES = {
  footway:       { weight: 10, offset: [3, 8],   motor: false },
  path:          { weight: 10, offset: [3, 8],   motor: false },
  pedestrian:    { weight: 9,  offset: [3, 9],   motor: false },
  cycleway:      { weight: 7,  offset: [3, 8],   motor: false },
  track:         { weight: 6,  offset: [3, 9],   motor: false },
  steps:         { weight: 3,  offset: [3, 6],   motor: false },
  living_street: { weight: 7,  offset: [6, 12],  motor: true },
  residential:   { weight: 8,  offset: [7, 15],  motor: true },
  service:       { weight: 4,  offset: [7, 14],  motor: true },
  unclassified:  { weight: 5,  offset: [8, 16],  motor: true },
  tertiary:      { weight: 4,  offset: [10, 18], motor: true },
  secondary:     { weight: 2,  offset: [14, 24], motor: true },
  primary:       { weight: 1,  offset: [18, 30], motor: true },
};

const HIGHWAY_REGEX = Object.keys(ROAD_CLASSES).join('|');

export class RoadNetwork {
  constructor() {
    this.roads = [];          // { cls, pts: [{lat,lng}...] }
    this.fetchCenter = null;
    this.fetching = false;
    this.failed = false;      // last attempt failed → fallback spawning
  }

  // Refetch when the player strays far from the cached area.
  async ensure(pos) {
    if (this.fetching) return;
    if (this.fetchCenter && haversine(this.fetchCenter, pos) < CONFIG.ROAD_REFETCH_DIST) return;
    this.fetching = true;
    const query = `[out:json][timeout:12];way["highway"~"^(${HIGHWAY_REGEX})$"](around:${CONFIG.ROAD_FETCH_RADIUS},${pos.lat.toFixed(6)},${pos.lng.toFixed(6)});out geom;`;

    for (const endpoint of CONFIG.OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!res.ok) continue;
        const json = await res.json();
        this.roads = (json.elements || [])
          .filter((e) => e.type === 'way' && e.geometry && e.geometry.length > 1)
          .map((e) => ({
            cls: ROAD_CLASSES[e.tags?.highway] ? e.tags.highway : 'path',
            pts: e.geometry.map((g) => ({ lat: g.lat, lng: g.lon })),
          }));
        this.fetchCenter = { lat: pos.lat, lng: pos.lng };
        this.failed = false;
        this.fetching = false;
        return;
      } catch (e) {
        // try next mirror
      }
    }
    this.failed = true;
    this.fetching = false;
  }

  get ready() {
    return this.roads.length > 0;
  }

  // Minimum distance (m) from `pt` to any *motorized* road centreline.
  minMotorDistance(pt) {
    const proj = makeProjector(pt);
    const p = proj.toXY(pt);
    let best = Infinity;
    const margin = 0.0015; // ~165 m — generous vs. the 7 m threshold
    for (const road of this.roads) {
      if (!ROAD_CLASSES[road.cls].motor) continue;
      for (let i = 0; i < road.pts.length - 1; i++) {
        const a = road.pts[i];
        const b = road.pts[i + 1];
        // Cheap reject: point outside the segment's bounding box (+margin).
        if (
          pt.lat < Math.min(a.lat, b.lat) - margin ||
          pt.lat > Math.max(a.lat, b.lat) + margin ||
          pt.lng < Math.min(a.lng, b.lng) - margin ||
          pt.lng > Math.max(a.lng, b.lng) + margin
        ) continue;
        const d = distPointToSegXY(p, proj.toXY(a), proj.toXY(b));
        if (d < best) best = d;
      }
    }
    return best;
  }

  // Generate one safe, walk-accessible spawn point near the player.
  // Returns {lat, lng} or null after exhausting attempts.
  sampleSpawnPoint(playerPos, existingPoints, ring = null) {
    const ringMin = ring?.min ?? CONFIG.SPAWN_RING_MIN;
    const ringMax = ring?.max ?? CONFIG.SPAWN_RING_MAX;
    if (!this.ready) {
      // While a fetch is pending, spawn nothing — never bypass the
      // safety rules just because data hasn't arrived yet. Open
      // scatter is reserved for genuine Overpass failure.
      return this.failed ? this._fallbackPoint(playerPos, existingPoints, ringMin, ringMax) : null;
    }

    for (let attempt = 0; attempt < 40; attempt++) {
      const road = weightedChoice(this.roads, (r) => ROAD_CLASSES[r.cls].weight);
      const spec = ROAD_CLASSES[road.cls];

      // Random segment, weighted by length.
      const segs = [];
      for (let i = 0; i < road.pts.length - 1; i++) {
        segs.push({ i, len: haversine(road.pts[i], road.pts[i + 1]) });
      }
      const seg = weightedChoice(segs, (s) => Math.max(0.5, s.len));
      const a = road.pts[seg.i];
      const b = road.pts[seg.i + 1];
      const t = Math.random();
      const onRoad = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };

      // Offset perpendicular to the segment, random side.
      const segBearing = bearingTo(a, b);
      const side = Math.random() < 0.5 ? 90 : -90;
      const off = rand(spec.offset[0], spec.offset[1]);
      const pt = destPoint(onRoad, segBearing + side, off);

      // Constraints: spawn ring around player, gap to other spawns,
      // and a hard minimum distance to every motor-road centreline.
      const dPlayer = haversine(playerPos, pt);
      if (dPlayer < ringMin || dPlayer > ringMax) continue;
      if (existingPoints.some((e) => haversine(e, pt) < CONFIG.SPAWN_MIN_GAP)) continue;
      if (this.minMotorDistance(pt) < CONFIG.ROAD_MIN_SAFE) continue;

      return pt;
    }
    return null;
  }

  // No road data (Overpass down / remote area): scatter in the ring.
  _fallbackPoint(playerPos, existingPoints, ringMin = CONFIG.SPAWN_RING_MIN, ringMax = CONFIG.SPAWN_RING_MAX) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const pt = destPoint(playerPos, rand(0, 360), rand(ringMin, ringMax));
      if (existingPoints.some((e) => haversine(e, pt) < CONFIG.SPAWN_MIN_GAP)) continue;
      return pt;
    }
    return null;
  }

  // A guaranteed-close point for bait bursts (relaxed ring).
  sampleNearbyPoint(playerPos, existingPoints) {
    const ring = { min: 40, max: 140 };
    return this.sampleSpawnPoint(playerPos, existingPoints, ring) ||
           this._fallbackPoint(playerPos, existingPoints, ring.min, ring.max);
  }
}

export { ROAD_CLASSES };

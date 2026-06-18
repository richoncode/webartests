// ============================================================
// Road network around the player, fetched from OpenStreetMap
// via the Overpass API. Used to generate spawn points that hug
// sidewalks and paths but are *offset perpendicular* from every
// road centreline — squirrels never sit in the middle of a
// street, and motor roads enforce a minimum safe distance.
// ============================================================

import { CONFIG } from './config.js';
import {
  haversine, destPoint, bearingTo, makeProjector, distPointToSegXY, rand, weightedChoice, clamp,
  parseMaxspeedMph, pointInPolygon, distPointToRingM, ringBBox,
} from './util.js';

// Walkability weight (how attractive for spawns), the perpendicular offset
// range (m) from the centreline, and an assumed speed limit (mph) used when a
// way carries no explicit maxspeed tag — per highway class.
const ROAD_CLASSES = {
  footway:       { weight: 10, offset: [3, 8],   motor: false, mph: 0 },
  path:          { weight: 10, offset: [3, 8],   motor: false, mph: 0 },
  pedestrian:    { weight: 9,  offset: [3, 9],   motor: false, mph: 0 },
  cycleway:      { weight: 7,  offset: [3, 8],   motor: false, mph: 0 },
  track:         { weight: 6,  offset: [3, 9],   motor: false, mph: 15 },
  steps:         { weight: 3,  offset: [3, 6],   motor: false, mph: 0 },
  living_street: { weight: 7,  offset: [6, 12],  motor: true,  mph: 10 },
  residential:   { weight: 8,  offset: [7, 15],  motor: true,  mph: 25 },
  service:       { weight: 4,  offset: [7, 14],  motor: true,  mph: 10 },
  unclassified:  { weight: 5,  offset: [8, 16],  motor: true,  mph: 30 },
  tertiary:      { weight: 4,  offset: [10, 18], motor: true,  mph: 35 },
  secondary:     { weight: 2,  offset: [14, 24], motor: true,  mph: 45 },
  primary:       { weight: 1,  offset: [18, 30], motor: true,  mph: 50 },
  trunk:         { weight: 0.6, offset: [22, 36], motor: true, mph: 55 },
  motorway:      { weight: 0.3, offset: [26, 44], motor: true, mph: 65 },
};

const HIGHWAY_REGEX = Object.keys(ROAD_CLASSES).join('|');

const PRIVATE_ACCESS = new Set(['private', 'no']);

function isPrivateDriveway(tags = {}) {
  return tags.service === 'driveway' || PRIVATE_ACCESS.has(tags.access);
}

function coordKey(p) {
  return `${p.lat.toFixed(7)},${p.lng.toFixed(7)}`;
}

function ensureRoadNodeKeys(road) {
  if (road.nodeKeys && road.nodeKeys.length === road.pts.length) return road.nodeKeys;
  road.nodeKeys = road.pts.map(coordKey);
  return road.nodeKeys;
}

function pointAlong(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

function segmentProjectionT(pt, a, b) {
  const proj = makeProjector(pt);
  const p = proj.toXY(pt);
  const ax = proj.toXY(a).x;
  const ay = proj.toXY(a).y;
  const bx = proj.toXY(b).x;
  const by = proj.toXY(b).y;
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (!len2) return 0;
  return clamp(((p.x - ax) * abx + (p.y - ay) * aby) / len2, 0, 1);
}

export class RoadNetwork {
  constructor() {
    this.roads = [];          // { cls, pts: [{lat,lng}...], mph }
    this.fetchCenter = null;
    this._inflight = null;    // pending fetch promise
    this.failed = false;      // last attempt failed → fallback spawning
    this.demo = false;        // pinned synthetic network (country demo)
  }

  // Refetch when the player strays far from the cached area.
  // Callers awaiting ensure() share the in-flight fetch, so e.g. the
  // initial spawn burst genuinely waits for road data instead of racing it.
  ensure(pos) {
    if (this.demo) return Promise.resolve();
    if (this._inflight) return this._inflight;
    if (this.fetchCenter && haversine(this.fetchCenter, pos) < CONFIG.ROAD_REFETCH_DIST) {
      return Promise.resolve();
    }
    this._inflight = this._fetch(pos).finally(() => { this._inflight = null; });
    return this._inflight;
  }

  async _fetch(pos) {
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
          .filter((e) => !isPrivateDriveway(e.tags))
          .map((e) => {
            const cls = ROAD_CLASSES[e.tags?.highway] ? e.tags.highway : 'path';
            const tagged = parseMaxspeedMph(e.tags?.maxspeed);
            const pts = e.geometry.map((g) => ({ lat: g.lat, lng: g.lon }));
            const nodeKeys = Array.isArray(e.nodes) && e.nodes.length === pts.length
              ? e.nodes.map((id) => `n:${id}`)
              : pts.map(coordKey);
            return {
              cls,
              pts,
              nodeKeys,
              mph: tagged != null ? tagged : ROAD_CLASSES[cls].mph,
            };
          });
        this.fetchCenter = { lat: pos.lat, lng: pos.lng };
        this.failed = false;
        return;
      } catch (e) {
        // try next mirror
      }
    }
    this.failed = true;
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

  // Highest posted/assumed speed limit (mph) of any *motor* road whose
  // centreline passes within `radius` m of `pos` — the "highway you live
  // along". 0 if no motor road is close.
  nearbyMaxSpeedMph(pos, radius) {
    const proj = makeProjector(pos);
    const p = proj.toXY(pos);
    let best = 0;
    for (const road of this.roads) {
      if (!ROAD_CLASSES[road.cls].motor) continue;
      for (let i = 0; i < road.pts.length - 1; i++) {
        const d = distPointToSegXY(p, proj.toXY(road.pts[i]), proj.toXY(road.pts[i + 1]));
        if (d <= radius && road.mph > best) best = road.mph;
      }
    }
    return best;
  }

  // Country mode: one spawn point spread evenly across the player's own
  // parcel. Uses best-candidate ("Mitchell") sampling — generate several
  // candidates, keep the one farthest from existing spawns — so repeated
  // calls fill the property with blue-noise even spacing rather than
  // clustering. Stays inset from the property line and well back from any
  // motor-road centreline (the unsafe frontage road).
  sampleParcelPoint(parcel, existingPoints, center = null, distanceRing = null) {
    const parcelRing = parcel?.ring;
    if (!parcelRing || parcelRing.length < 3) return null;
    const ringMin = distanceRing?.min ?? 0;
    const ringMax = distanceRing?.max ?? Infinity;
    const C = CONFIG.COUNTRY;
    const bb = ringBBox(parcelRing);

    // Two passes: first respect the property inset; if the lot is too small
    // to satisfy it, relax the inset so we still place something on-parcel.
    for (const inset of [C.PARCEL_INSET, 0]) {
      let best = null, bestScore = -1;
      for (let i = 0; i < C.CANDIDATES; i++) {
        const cand = { lat: rand(bb.minLat, bb.maxLat), lng: rand(bb.minLng, bb.maxLng) };
        if (!pointInPolygon(cand, parcelRing)) continue;
        if (center) {
          const dCenter = haversine(center, cand);
          if (dCenter < ringMin || dCenter > ringMax) continue;
        }
        if (inset > 0 && distPointToRingM(cand, parcelRing) < inset) continue;
        if (this.ready && this.minMotorDistance(cand) < C.ROAD_SETBACK) continue;
        let dNear = Infinity;
        for (const e of existingPoints) {
          const d = haversine(e, cand);
          if (d < dNear) dNear = d;
        }
        if (dNear < C.MIN_GAP) continue;
        // Maximise distance to the nearest existing spawn → even coverage.
        const score = existingPoints.length ? dNear : Math.random();
        if (score > bestScore) { bestScore = score; best = cand; }
      }
      if (best) return best;
    }
    return null;
  }

  // Pin a synthetic road network (used by the in-app country demo) and stop
  // refetching so the scenario stays put.
  useDemo(roads, center) {
    this.roads = roads
      .filter((r) => !isPrivateDriveway(r.tags))
      .map((r) => {
        const pts = r.pts || [];
        return {
          ...r,
          pts,
          nodeKeys: r.nodeKeys?.length === pts.length ? r.nodeKeys : pts.map(coordKey),
          mph: r.mph ?? ROAD_CLASSES[r.cls]?.mph ?? 0,
        };
      });
    this.fetchCenter = { lat: center.lat, lng: center.lng };
    this.failed = false;
    this.demo = true;
  }

  clearDemo() {
    this.demo = false;
    this.fetchCenter = null;
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

    return this._sampleStreetTracePoint(playerPos, existingPoints, ringMin, ringMax) ||
           this._sampleRandomPublicRoadPoint(playerPos, existingPoints, ringMin, ringMax);
  }

  _nodeIndex() {
    const index = new Map();
    this.roads.forEach((road, roadIdx) => {
      const keys = ensureRoadNodeKeys(road);
      keys.forEach((key, nodeIdx) => {
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ roadIdx, nodeIdx });
      });
    });
    return index;
  }

  _nearestSegment(playerPos) {
    const proj = makeProjector(playerPos);
    const p = proj.toXY(playerPos);
    let best = null;
    for (let roadIdx = 0; roadIdx < this.roads.length; roadIdx++) {
      const road = this.roads[roadIdx];
      if (!ROAD_CLASSES[road.cls] || ROAD_CLASSES[road.cls].weight <= 0) continue;
      for (let segIdx = 0; segIdx < road.pts.length - 1; segIdx++) {
        const a = road.pts[segIdx];
        const b = road.pts[segIdx + 1];
        const d = distPointToSegXY(p, proj.toXY(a), proj.toXY(b));
        if (!best || d < best.dist) {
          const t = segmentProjectionT(playerPos, a, b);
          best = { roadIdx, segIdx, t, point: pointAlong(a, b, t), dist: d };
        }
      }
    }
    return best;
  }

  _sampleStreetTracePoint(playerPos, existingPoints, ringMin, ringMax) {
    const start = this._nearestSegment(playerPos);
    if (!start) return null;

    const nodeIndex = this._nodeIndex();
    const candidates = [];
    const bestSeen = new Map();
    const queue = [];

    const pushSegment = (state) => {
      if (state.travelled > ringMax) return;
      if (state.toIdx < 0 || state.toIdx >= this.roads[state.roadIdx].pts.length) return;
      const key = `${state.roadIdx}:${state.toIdx}:${state.dir}:${state.turns}`;
      const prev = bestSeen.get(key);
      if (prev != null && prev <= state.travelled) return;
      bestSeen.set(key, state.travelled);
      queue.push(state);
    };

    const seedFromNode = (roadIdx, nodeIdx) => {
      const road = this.roads[roadIdx];
      const nodeKey = ensureRoadNodeKeys(road)[nodeIdx];
      for (const ref of nodeIndex.get(nodeKey) || []) {
        const r = this.roads[ref.roadIdx];
        for (const dir of [-1, 1]) {
          const toIdx = ref.nodeIdx + dir;
          if (toIdx < 0 || toIdx >= r.pts.length) continue;
          pushSegment({
            roadIdx: ref.roadIdx,
            from: r.pts[ref.nodeIdx],
            toIdx,
            dir,
            travelled: 0,
            turns: 0,
          });
        }
      }
    };

    // Start from the closest point on the closest public street/path, then
    // walk outward in both directions. From there, each changed way consumes
    // one "turn", up to CONFIG.SPAWN_TRACE_TURNS.
    if (start.t <= 0.01) {
      seedFromNode(start.roadIdx, start.segIdx);
    } else {
      pushSegment({
        roadIdx: start.roadIdx,
        from: start.point,
        toIdx: start.segIdx,
        dir: -1,
        travelled: 0,
        turns: 0,
      });
    }

    if (start.t >= 0.99) {
      seedFromNode(start.roadIdx, start.segIdx + 1);
    } else {
      pushSegment({
        roadIdx: start.roadIdx,
        from: start.point,
        toIdx: start.segIdx + 1,
        dir: 1,
        travelled: 0,
        turns: 0,
      });
    }

    while (queue.length) {
      const st = queue.shift();
      const road = this.roads[st.roadIdx];
      const spec = ROAD_CLASSES[road.cls];
      const to = road.pts[st.toIdx];
      const segLen = haversine(st.from, to);
      if (segLen < 0.5) continue;

      const endTravel = st.travelled + segLen;
      const overlapStart = Math.max(ringMin, st.travelled);
      const overlapEnd = Math.min(ringMax, endTravel);
      if (overlapEnd > overlapStart) {
        const sampleTravel = rand(overlapStart, overlapEnd);
        const t = clamp((sampleTravel - st.travelled) / segLen, 0, 1);
        const onRoad = pointAlong(st.from, to, t);
        const segBearing = bearingTo(st.from, to);
        const side = Math.random() < 0.5 ? 90 : -90;
        const off = rand(spec.offset[0], spec.offset[1]);
        const pt = destPoint(onRoad, segBearing + side, off);
        const dPlayer = haversine(playerPos, pt);
        if (
          dPlayer >= ringMin &&
          dPlayer <= ringMax &&
          !existingPoints.some((e) => haversine(e, pt) < CONFIG.SPAWN_MIN_GAP) &&
          this.minMotorDistance(pt) >= CONFIG.ROAD_MIN_SAFE
        ) {
          candidates.push({ pt, weight: Math.max(1, overlapEnd - overlapStart) * spec.weight });
        }
      }

      if (endTravel >= ringMax) continue;

      const nextIdx = st.toIdx + st.dir;
      if (nextIdx >= 0 && nextIdx < road.pts.length) {
        pushSegment({
          roadIdx: st.roadIdx,
          from: to,
          toIdx: nextIdx,
          dir: st.dir,
          travelled: endTravel,
          turns: st.turns,
        });
      }

      if (st.turns >= CONFIG.SPAWN_TRACE_TURNS) continue;
      const nodeKey = ensureRoadNodeKeys(road)[st.toIdx];
      const incomingBearing = bearingTo(st.from, to);
      for (const ref of nodeIndex.get(nodeKey) || []) {
        if (ref.roadIdx === st.roadIdx) continue;
        const other = this.roads[ref.roadIdx];
        for (const dir of [-1, 1]) {
          const toIdx = ref.nodeIdx + dir;
          if (toIdx < 0 || toIdx >= other.pts.length) continue;
          const outgoingBearing = bearingTo(other.pts[ref.nodeIdx], other.pts[toIdx]);
          const delta = Math.abs(((outgoingBearing - incomingBearing + 540) % 360) - 180);
          const turnCost = delta > 35 ? 1 : 0;
          const turns = st.turns + turnCost;
          if (turns > CONFIG.SPAWN_TRACE_TURNS) continue;
          pushSegment({
            roadIdx: ref.roadIdx,
            from: other.pts[ref.nodeIdx],
            toIdx,
            dir,
            travelled: endTravel,
            turns,
          });
        }
      }
    }

    if (!candidates.length) return null;
    return weightedChoice(candidates, (c) => c.weight).pt;
  }

  _sampleRandomPublicRoadPoint(playerPos, existingPoints, ringMin, ringMax) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const road = weightedChoice(this.roads, (r) => ROAD_CLASSES[r.cls].weight);
      const spec = ROAD_CLASSES[road.cls];
      const segs = [];
      for (let i = 0; i < road.pts.length - 1; i++) {
        segs.push({ i, len: haversine(road.pts[i], road.pts[i + 1]) });
      }
      const seg = weightedChoice(segs, (s) => Math.max(0.5, s.len));
      const a = road.pts[seg.i];
      const b = road.pts[seg.i + 1];
      const onRoad = pointAlong(a, b, Math.random());
      const segBearing = bearingTo(a, b);
      const side = Math.random() < 0.5 ? 90 : -90;
      const off = rand(spec.offset[0], spec.offset[1]);
      const pt = destPoint(onRoad, segBearing + side, off);
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

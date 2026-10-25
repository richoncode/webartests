/**
 * Side and top probes for the car's I3DL2-style reverb.
 *
 * Five rays from the car: forward (approaching), back (departing),
 * left and right (here), and up. Horizontal rays walk building and
 * landuse polygons in plan. Up is a footprint test: the map has no roof
 * mesh, so a building polygon under the car is an overhead structure
 * and clear sky is open.
 *
 * The chase camera only keeps the tiles in front of the lens, so a
 * grandstand beside the car is often not in that set. The page also
 * fetches the Streets tiles that cover the circuit and raycasts those,
 * independent of the view.
 *
 * Material heuristics, applied in engine-audio.js:
 *   glass    — building type commercial / office / retail / hotel, or taller than 40 m
 *   concrete — any other building (grandstands, houses, warehouses)
 *   grass    — landuse grass, park, wood, scrub, forest, pitch, farmland
 * A venue-sized park polygon (COTA is one sports_centre) is not a wall.
 * A ray that misses its boundary reports open air. Only a boundary the
 * ray actually reaches counts as grass.
 */

import Pbf from 'https://cdn.jsdelivr.net/npm/pbf@3.2.1/+esm';
import {VectorTile} from 'https://cdn.jsdelivr.net/npm/@mapbox/vector-tile@1.3.1/+esm';

export const PROBE_RAYS = [
  { id: "forward", angle: 0, max: 96 },
  { id: "back", angle: Math.PI, max: 96 },
  { id: "left", angle: Math.PI / 2, max: 72 },
  { id: "right", angle: -Math.PI / 2, max: 72 },
];

const TILE_Z = 15;
const tileCache = new Map();

function materialOf(props, sourceLayer) {
  const type = String((props && (props.type || props.class)) || "").toLowerCase();
  const klass = String((props && props.class) || "").toLowerCase();
  const blob = klass + " " + type;
  if (sourceLayer === "landuse") {
    if (/grass|wood|scrub|forest|park|garden|meadow|heath|farm|pitch|sand|wetland|cemetery|golf|recreation/.test(blob)) {
      return "grass";
    }
    return null;
  }
  if (sourceLayer === "building") {
    const height = Number(props && props.height);
    if (/glass|window|commercial|office|retail|hotel|apartment/.test(type)) return "glass";
    if (Number.isFinite(height) && height >= 40) return "glass";
    return "concrete";
  }
  return null;
}

function polysOf(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  return [];
}

function toEN(ring, origin, mLng) {
  const step = ring.length > 160 ? Math.ceil(ring.length / 160) : 1;
  const out = [];
  for (let i = 0; i < ring.length; i += step) {
    const c = ring[i];
    if (!c || c.length < 2) continue;
    out.push([(c[0] - origin[0]) * mLng, (c[1] - origin[1]) * 111320]);
  }
  if (out.length > 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) out.push([a[0], a[1]]);
  }
  return out;
}

function fromEN(e, n, origin, mLng) {
  return [origin[0] + e / mLng, origin[1] + n / 111320];
}

function bboxDist(ring) {
  let minE = Infinity;
  let maxE = -Infinity;
  let minN = Infinity;
  let maxN = -Infinity;
  for (const p of ring) {
    if (p[0] < minE) minE = p[0];
    if (p[0] > maxE) maxE = p[0];
    if (p[1] < minN) minN = p[1];
    if (p[1] > maxN) maxN = p[1];
  }
  const e = Math.max(minE, Math.min(0, maxE));
  const n = Math.max(minN, Math.min(0, maxN));
  return Math.hypot(e, n);
}

function pointInRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const denom = yj - yi || 1e-12;
    const hit = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / denom + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function containsOrigin(rings) {
  if (!rings.length || !pointInRing(rings[0], 0, 0)) return false;
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(rings[h], 0, 0)) return false;
  }
  return true;
}

function rayHit(ring, dx, dy, maxD) {
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = ring[i][0];
    const ay = ring[i][1];
    const ex = ring[i + 1][0] - ax;
    const ey = ring[i + 1][1] - ay;
    const det = dx * ey - dy * ex;
    if (Math.abs(det) < 1e-8) continue;
    const t = (ax * ey - ay * ex) / det;
    const u = (ax * dy - ay * dx) / det;
    if (t > 1.2 && u >= 0 && u <= 1 && t < best && t <= maxD) best = t;
  }
  return best < Infinity ? best : null;
}

function labelFor(hits) {
  const hard = hits.filter((h) => h.material === "glass" || h.material === "concrete");
  if (hard.length) {
    hard.sort((a, b) => a.distance - b.distance);
    const near = hard[0];
    const name = near.material === "glass" ? "Glass" : "Concrete";
    return name + " · " + Math.round(near.distance) + " m";
  }
  if (hits.some((h) => h.material === "grass" && h.distance < 36)) return "Grass · absorbing";
  return "Open air";
}

function tileXY(ll, z) {
  const n = 2 ** z;
  const x = Math.floor(((ll[0] + 180) / 360) * n);
  const lat = ll[1] * Math.PI / 180;
  const s = Math.sin(lat);
  const y = Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n);
  return { z, x, y };
}

function tileBounds(z, x, y) {
  const n = 2 ** z;
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const north = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180 / Math.PI;
  const south = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180 / Math.PI;
  return { west, east, north, south };
}

function tileId(t) {
  return t.z + "/" + t.x + "/" + t.y;
}

function nearTileEdge(ll, bounds) {
  if (!bounds) return false;
  const mLng = 111320 * Math.cos(ll[1] * Math.PI / 180);
  const tolLng = 5 / mLng;
  const tolLat = 5 / 111320;
  return Math.abs(ll[0] - bounds.west) < tolLng
    || Math.abs(ll[0] - bounds.east) < tolLng
    || Math.abs(ll[1] - bounds.north) < tolLat
    || Math.abs(ll[1] - bounds.south) < tolLat;
}

function prepare(raw, origin) {
  const mLng = 111320 * Math.cos(origin[1] * Math.PI / 180);
  const found = [];
  const seen = new Set();
  for (const feat of raw) {
    if (!feat || !feat.mat || !feat.polys || !feat.polys.length) continue;
    const outer = feat.polys[0] && feat.polys[0][0] && feat.polys[0][0][0];
    const key = outer
      ? [outer[0].toFixed(5), outer[1].toFixed(5), feat.mat, feat.height || ""].join("|")
      : "";
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    const polysEN = [];
    for (const poly of feat.polys) {
      const rings = [];
      for (const ring of poly) {
        if (!ring || ring.length < 3) continue;
        const en = toEN(ring, origin, mLng);
        if (en.length > 2) rings.push(en);
      }
      if (rings.length) polysEN.push(rings);
    }
    if (!polysEN.length) continue;
    const near = Math.min(...polysEN.map((rings) => bboxDist(rings[0])));
    if (near > 160) continue;
    found.push({
      mat: feat.mat,
      polys: polysEN,
      near,
      height: feat.height,
      bounds: feat.bounds || null,
      origin,
      mLng,
    });
  }
  if (found.length > 240) {
    found.sort((a, b) => a.near - b.near);
    return found.slice(0, 240);
  }
  return found;
}

function cast(features, heading) {
  const hits = PROBE_RAYS.map((ray) => {
    const ang = heading + ray.angle;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let solid = null;
    let soft = null;
    for (const feat of features) {
      if (feat.near > ray.max + 24) continue;
      let dist = null;
      for (const rings of feat.polys) {
        for (const ring of rings) {
          const d = rayHit(ring, dx, dy, ray.max);
          if (d == null) continue;
          if (feat.bounds) {
            const hll = fromEN(dx * d, dy * d, feat.origin, feat.mLng);
            if (nearTileEdge(hll, feat.bounds)) continue;
          }
          if (dist == null || d < dist) dist = d;
        }
      }
      if (dist == null) continue;
      if (feat.mat === "grass") {
        if (!soft || dist < soft.distance) soft = { distance: dist, material: "grass" };
      } else if (!solid || dist < solid.distance) {
        solid = { distance: dist, material: feat.mat };
      }
    }
    // A miss stays open. Standing inside the venue park must not invent
    // a wall 12 m away: that polygon's boundary is hundreds of metres out,
    // and the old synthetic grass hit kept the send dry at the pits.
    let hit;
    if (solid && (!soft || solid.distance <= soft.distance)) hit = solid;
    else if (soft) hit = soft;
    else hit = { distance: ray.max, material: "open" };
    return { id: ray.id, distance: hit.distance, material: hit.material };
  });

  let overhead = null;
  for (const feat of features) {
    if (feat.mat === "grass") continue;
    const inside = feat.polys.some((rings) => containsOrigin(rings));
    if (!inside) continue;
    const height = feat.height;
    const distance = Number.isFinite(height) && height > 3 ? Math.max(6, Math.min(40, height * 0.4)) : 16;
    if (!overhead || distance < overhead.distance) {
      overhead = { id: "up", distance, material: feat.mat };
    }
  }
  hits.push(overhead || { id: "up", distance: 80, material: "open" });
  return { ready: true, label: labelFor(hits), hits };
}

function rawFromQueryFeature(feat, sourceLayer) {
  const mat = materialOf(feat.properties, sourceLayer);
  if (!mat) return null;
  let polys = [];
  try {
    polys = polysOf(feat.geometry);
  } catch {
    return null;
  }
  if (!polys.length) return null;
  return { mat, polys, height: Number(feat.properties && feat.properties.height), bounds: null };
}

function collectMap(map, origin) {
  if (!map || typeof map.getSource !== "function" || !map.getSource("surround")) return null;
  const raw = [];
  for (const sourceLayer of ["building", "landuse"]) {
    let feats = [];
    try {
      feats = map.querySourceFeatures("surround", { sourceLayer }) || [];
    } catch {
      continue;
    }
    for (const feat of feats) {
      const row = rawFromQueryFeature(feat, sourceLayer);
      if (row) raw.push(row);
    }
  }
  if (!raw.length) {
    let loaded = false;
    try { loaded = map.isSourceLoaded("surround"); } catch { loaded = false; }
    if (!loaded) return null;
  }
  return prepare(raw, origin);
}

function collectCached(origin) {
  const here = tileCache.get(tileId(tileXY(origin, TILE_Z)));
  if (!here || here.status !== "ok") return null;
  const raw = [];
  for (const row of tileCache.values()) {
    if (row && row.status === "ok" && row.feats) raw.push(...row.feats);
  }
  return prepare(raw, origin);
}

function parseTile(buf, z, x, y) {
  const tile = new VectorTile(new Pbf(buf));
  const bounds = tileBounds(z, x, y);
  const feats = [];
  for (const sourceLayer of ["building", "landuse"]) {
    const layer = tile.layers[sourceLayer];
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const feat = layer.feature(i);
      const mat = materialOf(feat.properties, sourceLayer);
      if (!mat) continue;
      let polys = [];
      try {
        polys = polysOf(feat.toGeoJSON(x, y, z).geometry);
      } catch {
        continue;
      }
      if (!polys.length) continue;
      feats.push({
        mat,
        polys,
        height: Number(feat.properties && feat.properties.height),
        bounds,
      });
    }
  }
  return feats;
}

/**
 * Fetch the Streets tiles under the circuit so probes can see a
 * grandstand that the chase frustum has not loaded.
 */
export function preloadSurroundings(points, token) {
  if (!token || !Array.isArray(points) || points.length < 2) return;
  const ids = new Set();
  const step = Math.max(1, Math.floor(points.length / 90));
  for (let i = 0; i < points.length; i += step) {
    const t = tileXY(points[i], TILE_Z);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        ids.add(tileId({ z: t.z, x: t.x + dx, y: t.y + dy }));
      }
    }
  }
  for (const id of ids) {
    if (tileCache.has(id)) continue;
    tileCache.set(id, { status: "loading" });
    const [z, x, y] = id.split("/").map(Number);
    const url = "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/" + id + ".mvt?access_token=" + encodeURIComponent(token);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("surround tile " + res.status);
        return res.arrayBuffer();
      })
      .then((buf) => {
        tileCache.set(id, { status: "ok", feats: parseTile(buf, z, x, y) });
      })
      .catch((err) => {
        console.error(err);
        tileCache.set(id, { status: "error" });
      });
  }
}

export function attachSurroundSource(map) {
  if (!map || map.getSource("surround")) return;
  map.addSource("surround", { type: "vector", url: "mapbox://mapbox.mapbox-streets-v8" });
  const layers = [
    { id: "surround-landuse", "source-layer": "landuse" },
    { id: "surround-buildings", "source-layer": "building" },
  ];
  for (const spec of layers) {
    const layer = {
      id: spec.id,
      type: "fill",
      source: "surround",
      "source-layer": spec["source-layer"],
      slot: "bottom",
      paint: { "fill-opacity": 0, "fill-color": "#000000" },
    };
    try {
      map.addLayer(layer);
    } catch (err) {
      try {
        delete layer.slot;
        map.addLayer(layer);
      } catch (err2) {
        console.error(err2);
      }
    }
  }
}

/**
 * @returns {{ready:boolean, label?:string, hits?:Array}}
 * ready false means neither the circuit tiles nor the map source have
 * features yet; keep the previous mix.
 */
export function sampleSurroundings(map, originLL, heading) {
  if (!originLL || !Number.isFinite(heading)) return { ready: false };
  try {
    const cached = collectCached(originLL);
    if (cached) return cast(cached, heading);
    const fromMap = collectMap(map, originLL);
    if (fromMap) return cast(fromMap, heading);
  } catch (err) {
    console.error(err);
    return { ready: false };
  }
  return { ready: false };
}

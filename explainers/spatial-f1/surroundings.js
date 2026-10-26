/**
 * Ray probes for the car's I3DL2-style reverb.
 *
 * Two aims, and the two loudest rooms:
 *   stand  — a dense low fan on both sides, from forward of the nose
 *            around to behind the tail. In a corridor with buildings
 *            on both sides, ahead and behind, most of these rays meet
 *            a wall instead of clearing the roof. That set is about
 *            four fifths of the probes. In the both-sides corridor
 *            about seven in ten of all probes hit; the overhead arc
 *            misses, and the upper band still meets the facades.
 *   bridge — an arc over the car. Shallow rays ahead meet a deck on
 *            the way in, steeper rays look at the deck overhead, and
 *            the shallow rays repeat behind the tail on the way out.
 *            Overhead is the other extreme: the car is inside the deck,
 *            so the whole fan hits close concrete. That room fills Max
 *            on the same hardness and rolloff as a wall.
 *
 * The chase camera only keeps the tiles in front of the lens, so a
 * grandstand beside the car is often not in that set. The page also
 * fetches the Streets tiles that cover the circuit and raycasts those,
 * independent of the view.
 *
 * Mapbox Streets supplies the surfaces:
 *   building     — grandstands and houses (concrete), tall or glazed (glass)
 *   landuse      — grass, scrub (bushes), wood (trees). A venue-sized
 *                  park polygon is not vegetation; the circuit sits inside one.
 *   road bridge  — a footbridge centerline, thickened into a short deck
 *   structure    — walls, not fences
 *   tree         — point models, a small canopy, when the tile has them
 * A miss stays open air. Standing inside the venue park does not invent
 * a wall. Only a boundary a ray actually reaches counts.
 */

import Pbf from 'https://cdn.jsdelivr.net/npm/pbf@3.2.1/+esm';
import {VectorTile} from 'https://cdn.jsdelivr.net/npm/@mapbox/vector-tile@1.3.1/+esm';

const RAY_MAX = 80;
const ORIGIN_Z = 0.85;
const DEFAULT_BUILDING_H = 12;
const GRASS_H = 2.4;
const BRIDGE_HALF_M = 3.5;
const BRIDGE_H = 6.5;
const TREE_R = 5;
const TREE_H = 8;
const GRASS_MAX_U = Math.sin(25 * Math.PI / 180);
const TILE_Z = 15;

function pushAim(rays, kind, elev, yaw) {
  const side = yaw === 0 ? "0" : (yaw > 0 ? "L" + yaw : "R" + (-yaw));
  rays.push({
    id: kind + "-" + elev + "-" + side,
    kind,
    elev,
    yaw,
    max: RAY_MAX,
  });
}

/**
 * Corridor fan. 2° and 5° stay low enough to meet a short wall. 7° is
 * the upper band: on the grandstands beside this circuit it strikes
 * about 80% of the way up the facade, and a shorter building clears it.
 * Yaw runs from about 32° off the nose through abeam to about 152°
 * behind, on the left and the right. Positive yaw is left.
 */
function standRays() {
  const rays = [];
  const yaws = [32, 42, 52, 62, 72, 82, 92, 102, 112, 122, 132, 142, 152];
  for (const elev of [2, 5, 7]) {
    for (const yaw of yaws) {
      pushAim(rays, "stand", elev, yaw);
      pushAim(rays, "stand", elev, -yaw);
    }
  }
  return rays;
}

/**
 * Bridge arc. 16° meets a 6.5 m deck about 20 m ahead; 34° meets it
 * closer. Overhead rays take the deck while the car is under it.
 * The same shallow pair looks back on the way out. Yaw is a few degrees
 * either side of the centreline.
 */
function bridgeRays() {
  const rays = [];
  for (const kind of ["ahead", "behind"]) {
    for (const elev of [16, 34]) {
      for (const yaw of [-12, 0, 12]) pushAim(rays, kind, elev, yaw);
    }
  }
  pushAim(rays, "above", 90, 0);
  for (const elev of [62, 76]) {
    for (const yaw of [-8, 0, 8]) pushAim(rays, "above", elev, yaw);
  }
  return rays;
}

export const PROBE_RAYS = standRays().concat(bridgeRays());

/** Car frame: +x nose, +y left, +z up. Elevation is degrees above the horizon. */
export function rayCarDir(ray) {
  if (ray && (ray.kind === "ahead" || ray.kind === "behind" || ray.kind === "above" || ray.kind === "stand")) {
    const elev = ((Number(ray.elev) || 0) * Math.PI) / 180;
    const yaw = ((Number(ray.yaw) || 0) * Math.PI) / 180;
    const horiz = Math.cos(elev);
    const sign = ray.kind === "behind" ? -1 : 1;
    return {
      x: sign * horiz * Math.cos(yaw),
      y: horiz * Math.sin(yaw),
      z: Math.sin(elev),
    };
  }
  if (ray && ray.kind === "pitch") {
    const a = (Number(ray.alpha) || 0) * Math.PI / 180;
    return { x: Math.sin(a), y: 0, z: Math.cos(a) };
  }
  const phi = ((ray && Number(ray.phi)) || 0) * Math.PI / 180;
  return { x: 0, y: Math.cos(phi), z: Math.sin(phi) };
}

function worldDir(local, heading) {
  const fe = Math.cos(heading);
  const fn = Math.sin(heading);
  const le = -Math.sin(heading);
  const ln = Math.cos(heading);
  return {
    e: fe * local.x + le * local.y,
    n: fn * local.x + ln * local.y,
    u: local.z,
  };
}

function vegetationCover(props) {
  const klass = String((props && props.class) || "").toLowerCase();
  const type = String((props && props.type) || "").toLowerCase();
  const blob = klass + " " + type;
  if (/\b(wood|forest)\b/.test(blob)) return "trees";
  if (/\bscrub\b/.test(blob)) return "bushes";
  if (/\b(grass|meadow|garden|wetland|pitch|heath)\b/.test(blob)) return "grass";
  return null;
}

function materialOf(props, sourceLayer) {
  const type = String((props && (props.type || props.class)) || "").toLowerCase();
  if (sourceLayer === "landuse" || sourceLayer === "landuse_overlay") {
    const cover = vegetationCover(props);
    if (!cover) return null;
    return { mat: "grass", cover, height: GRASS_H };
  }
  if (sourceLayer === "building") {
    const height = Number(props && props.height);
    let mat = "concrete";
    if (/glass|window|commercial|office|retail|hotel|apartment/.test(type)) mat = "glass";
    else if (Number.isFinite(height) && height >= 40) mat = "glass";
    const cover = type === "grandstand" ? "grandstand" : (type === "roof" ? "roof" : "building");
    return { mat, cover, height: Number.isFinite(height) && height > 2 ? height : DEFAULT_BUILDING_H };
  }
  if (sourceLayer === "road") {
    if (String((props && props.structure) || "").toLowerCase() !== "bridge") return null;
    return { mat: "concrete", cover: "bridge", height: BRIDGE_H, bridge: true };
  }
  if (sourceLayer === "structure") {
    const blob = (String((props && props.class) || "") + " " + type).toLowerCase();
    if (!/wall|retaining_wall|bridge/.test(blob)) return null;
    if (/bridge/.test(blob)) return { mat: "concrete", cover: "bridge", height: BRIDGE_H, bridge: true };
    return { mat: "concrete", cover: "wall", height: 2.4, wall: true };
  }
  if (sourceLayer === "tree") {
    return { mat: "grass", cover: "trees", height: TREE_H, tree: true };
  }
  return null;
}

function polysOf(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  return [];
}

function linesOf(geom) {
  if (!geom) return [];
  if (geom.type === "LineString") return [geom.coordinates];
  if (geom.type === "MultiLineString") return geom.coordinates;
  return [];
}

function pointsOf(geom) {
  if (!geom) return [];
  if (geom.type === "Point") return [geom.coordinates];
  if (geom.type === "MultiPoint") return geom.coordinates;
  return [];
}

function toEN(ring, origin, mLng, close) {
  const step = ring.length > 160 ? Math.ceil(ring.length / 160) : 1;
  const out = [];
  for (let i = 0; i < ring.length; i += step) {
    const c = ring[i];
    if (!c || c.length < 2) continue;
    out.push([(c[0] - origin[0]) * mLng, (c[1] - origin[1]) * 111320]);
  }
  if (close && out.length > 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) out.push([a[0], a[1]]);
  }
  return out;
}

function fromEN(e, n, origin, mLng) {
  return [origin[0] + e / mLng, origin[1] + n / 111320];
}

function bufferOpen(pts, half) {
  if (!pts || pts.length < 2) return null;
  const left = [];
  const right = [];
  const norm = (p, q) => {
    const x = q[0] - p[0];
    const y = q[1] - p[1];
    const m = Math.hypot(x, y) || 1;
    return [-y / m, x / m];
  };
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[i];
    const c = pts[Math.min(pts.length - 1, i + 1)];
    const n1 = norm(a, b);
    const n2 = norm(b, c);
    let nx = n1[0] + n2[0];
    let ny = n1[1] + n2[1];
    const nm = Math.hypot(nx, ny) || 1;
    nx /= nm;
    ny /= nm;
    left.push([b[0] + nx * half, b[1] + ny * half]);
    right.push([b[0] - nx * half, b[1] - ny * half]);
  }
  const ring = left.concat(right.reverse());
  if (!ring.length) return null;
  ring.push([ring[0][0], ring[0][1]]);
  return ring;
}

function circleEN(e, n, radius) {
  const ring = [];
  const nSeg = 10;
  for (let i = 0; i <= nSeg; i++) {
    const a = (i / nSeg) * Math.PI * 2;
    ring.push([e + Math.cos(a) * radius, n + Math.sin(a) * radius]);
  }
  return ring;
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

function containsPoint(rings, x, y) {
  if (!rings.length || !pointInRing(rings[0], x, y)) return false;
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(rings[h], x, y)) return false;
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
  if (!bounds || !ll) return false;
  const mLng = 111320 * Math.cos(ll[1] * Math.PI / 180);
  const tolLng = 5 / mLng;
  const tolLat = 5 / 111320;
  return Math.abs(ll[0] - bounds.west) < tolLng
    || Math.abs(ll[0] - bounds.east) < tolLng
    || Math.abs(ll[1] - bounds.north) < tolLat
    || Math.abs(ll[1] - bounds.south) < tolLat;
}

function labelFor(hits) {
  const hard = hits.filter((h) => h.material === "glass" || h.material === "concrete");
  if (hard.length) {
    hard.sort((a, b) => a.distance - b.distance);
    const near = hard[0];
    const name = near.cover && near.cover !== near.material ? near.cover : near.material;
    const titled = name.charAt(0).toUpperCase() + name.slice(1);
    return titled + " · " + Math.round(near.distance) + " m";
  }
  const soft = hits.filter((h) => h.material === "grass" && h.distance < 40);
  if (soft.length) {
    soft.sort((a, b) => a.distance - b.distance);
    const name = soft[0].cover || "grass";
    return name.charAt(0).toUpperCase() + name.slice(1) + " · " + Math.round(soft[0].distance) + " m";
  }
  return "Open air";
}

const tileCache = new Map();
const TILE_LAYERS = ["building", "landuse", "landuse_overlay", "structure", "road", "tree"];

export function featuresFromGeo(origin, items) {
  const mLng = 111320 * Math.cos(origin[1] * Math.PI / 180);
  const found = [];
  const seen = new Set();
  for (const feat of items || []) {
    const sourceLayer = feat.sourceLayer;
    const spec = materialOf(feat.properties, sourceLayer);
    if (!spec) continue;
    const props = feat.properties || {};
    const keyParts = [
      sourceLayer,
      spec.cover,
      props.height || "",
      props.class || "",
      props.type || "",
    ];
    let polysEN = [];
    if (spec.tree) {
      const pts = pointsOf(feat.geometry);
      for (const c of pts) {
        if (!c || c.length < 2) continue;
        const e = (c[0] - origin[0]) * mLng;
        const n = (c[1] - origin[1]) * 111320;
        if (Math.hypot(e, n) > 100) continue;
        polysEN.push([circleEN(e, n, TREE_R)]);
      }
      keyParts.push(pts[0] ? pts[0][0].toFixed(5) : "");
    } else if (spec.bridge || spec.wall) {
      const lines = linesOf(feat.geometry);
      const polys = polysOf(feat.geometry);
      if (polys.length) {
        for (const poly of polys) {
          const rings = [];
          for (const ring of poly) {
            if (!ring || ring.length < 2) continue;
            const en = toEN(ring, origin, mLng, true);
            if (en.length > 2) rings.push(en);
          }
          if (rings.length) polysEN.push(rings);
        }
      }
      for (const line of lines) {
        const en = toEN(line, origin, mLng, false);
        const half = spec.bridge ? BRIDGE_HALF_M : 0.8;
        const ring = bufferOpen(en, half);
        if (ring) polysEN.push([ring]);
      }
      const outer = lines[0] && lines[0][0];
      if (outer) keyParts.push(outer[0].toFixed(5), outer[1].toFixed(5));
    } else {
      const polys = polysOf(feat.geometry);
      for (const poly of polys) {
        const rings = [];
        for (const ring of poly) {
          if (!ring || ring.length < 3) continue;
          const en = toEN(ring, origin, mLng, true);
          if (en.length > 2) rings.push(en);
        }
        if (rings.length) polysEN.push(rings);
      }
      const outer = polys[0] && polys[0][0] && polys[0][0][0];
      if (outer) keyParts.push(outer[0].toFixed(5), outer[1].toFixed(5));
    }
    if (!polysEN.length) continue;
    const key = keyParts.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const near = Math.min(...polysEN.map((rings) => bboxDist(rings[0])));
    if (near > 140) continue;
    found.push({
      mat: spec.mat,
      cover: spec.cover,
      polys: polysEN,
      near,
      height: spec.height,
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

function edgeHit(feat, e, n) {
  if (!feat.bounds || !feat.origin || !feat.mLng) return false;
  return nearTileEdge(fromEN(e, n, feat.origin, feat.mLng), feat.bounds);
}

function castOne(ray, dir, features) {
  const max = ray.max;
  const hcomp = Math.hypot(dir.e, dir.n);
  let solid = null;
  let soft = null;
  const take = (slot, t, feat, height) => {
    if (!(t > 1.2) || t > max) return slot;
    if (!slot || t < slot.distance) {
      return { distance: t, material: feat.mat, cover: feat.cover || feat.mat, height };
    }
    return slot;
  };
  for (const feat of features) {
    const horizReach = hcomp > 1e-4 ? max * hcomp + 4 : 3;
    if (feat.near > horizReach && feat.near > 1.5) continue;
    const isGrass = feat.mat === "grass";
    if (isGrass && dir.u > GRASS_MAX_U) continue;
    const height = Number(feat.height) > 0 ? Number(feat.height) : (isGrass ? GRASS_H : DEFAULT_BUILDING_H);
    const slot = (t) => {
      if (isGrass) soft = take(soft, t, feat, height);
      else solid = take(solid, t, feat, height);
    };
    if (dir.u > 0.02 && height > ORIGIN_Z) {
      const tRoof = (height - ORIGIN_Z) / dir.u;
      if (tRoof > 1.2 && tRoof <= max) {
        const e = dir.e * tRoof;
        const n = dir.n * tRoof;
        if (!edgeHit(feat, e, n) && feat.polys.some((rings) => containsPoint(rings, e, n))) slot(tRoof);
      }
    }
    if (hcomp > 1e-3) {
      const dx = dir.e / hcomp;
      const dy = dir.n / hcomp;
      const planMax = max * hcomp;
      let plan = null;
      for (const rings of feat.polys) {
        for (const ring of rings) {
          const d = rayHit(ring, dx, dy, planMax);
          if (d == null) continue;
          if (edgeHit(feat, dx * d, dy * d)) continue;
          if (plan == null || d < plan) plan = d;
        }
      }
      if (plan != null) {
        const t = plan / hcomp;
        const z = ORIGIN_Z + dir.u * t;
        if (z <= height + 0.35) slot(t);
      }
    }
  }
  let hit = null;
  if (solid && (!soft || solid.distance <= soft.distance)) hit = solid;
  else if (soft) hit = soft;
  else hit = { distance: max, material: "open", cover: "" };
  return { id: ray.id, distance: hit.distance, material: hit.material, cover: hit.cover || "", height: hit.height || 0 };
}

/**
 * Pure probe cast. `features` are metres east/north of the car, the same
 * shape featuresFromGeo() builds. Heading is atan2(north, east).
 */
export function hitsAlongRays(features, heading) {
  const list = Array.isArray(features) ? features : [];
  return PROBE_RAYS.map((ray) => {
    const dir = worldDir(rayCarDir(ray), heading || 0);
    return castOne(ray, dir, list);
  });
}

function collectMap(map) {
  if (!map || typeof map.getSource !== "function" || !map.getSource("surround")) return null;
  const items = [];
  const jobs = [
    ["surround", "building"],
    ["surround", "landuse"],
    ["surround", "landuse_overlay"],
    ["surround", "structure"],
    ["surround", "road"],
  ];
  try {
    if (map.getSource("composite")) jobs.push(["composite", "tree"]);
  } catch { /* composite is optional */ }
  for (const [source, sourceLayer] of jobs) {
    let feats = [];
    try {
      if (!map.getSource(source)) continue;
      feats = map.querySourceFeatures(source, { sourceLayer }) || [];
    } catch {
      continue;
    }
    for (const feat of feats) {
      items.push({
        geometry: feat.geometry,
        properties: feat.properties,
        sourceLayer,
        bounds: null,
      });
    }
  }
  if (!items.length) {
    let loaded = false;
    try { loaded = map.isSourceLoaded("surround"); } catch { loaded = false; }
    if (!loaded) return null;
  }
  return items;
}

function collectCached(origin) {
  const here = tileCache.get(tileId(tileXY(origin, TILE_Z)));
  if (!here || here.status !== "ok") return null;
  const items = [];
  for (const row of tileCache.values()) {
    if (row && row.status === "ok" && row.feats) items.push(...row.feats);
  }
  return items;
}

function parseTile(buf, z, x, y) {
  const tile = new VectorTile(new Pbf(buf));
  const bounds = tileBounds(z, x, y);
  const feats = [];
  for (const sourceLayer of TILE_LAYERS) {
    const layer = tile.layers[sourceLayer];
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const feat = layer.feature(i);
      if (!materialOf(feat.properties, sourceLayer)) continue;
      let geometry = null;
      try {
        geometry = feat.toGeoJSON(x, y, z).geometry;
      } catch {
        continue;
      }
      if (!geometry) continue;
      feats.push({
        geometry,
        properties: feat.properties,
        sourceLayer,
        bounds,
      });
    }
  }
  return feats;
}

function isStand(props) {
  const blob = (String((props && props.type) || "") + " " + String((props && props.class) || "")).toLowerCase();
  return /\b(grandstand|stadium)\b/.test(blob);
}

/**
 * One section per grandstand or stadium outer ring in the preloaded
 * Streets tiles. Tile-edge splits stay separate; the ambience dedups
 * points that land on top of each other. `ready` once those tiles have
 * finished and at least one came back.
 */
export function grandstandSections() {
  let loading = 0;
  let ok = 0;
  const sections = [];
  const seen = new Set();
  for (const row of tileCache.values()) {
    if (!row) continue;
    if (row.status === "loading") {
      loading++;
      continue;
    }
    if (row.status !== "ok" || !row.feats) continue;
    ok++;
    for (const feat of row.feats) {
      if (!feat || feat.sourceLayer !== "building" || !isStand(feat.properties)) continue;
      const polys = polysOf(feat.geometry);
      const height = Number(feat.properties && feat.properties.height);
      for (const poly of polys) {
        const ring = poly && poly[0];
        if (!ring || ring.length < 3) continue;
        const first = ring[0];
        if (!first || first.length < 2) continue;
        const key = first[0].toFixed(5) + "," + first[1].toFixed(5);
        if (seen.has(key)) continue;
        seen.add(key);
        sections.push({
          ring: ring.map((c) => [c[0], c[1]]),
          height: Number.isFinite(height) && height > 2 ? height : 12,
        });
      }
    }
  }
  return { ready: ok > 0 && loading === 0, sections };
}

/**
 * Fetch the Streets tiles under the circuit so probes can see a
 * grandstand or footbridge the chase frustum has not loaded.
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
    { id: "surround-landuse", "source-layer": "landuse", type: "fill" },
    { id: "surround-landuse-overlay", "source-layer": "landuse_overlay", type: "fill" },
    { id: "surround-buildings", "source-layer": "building", type: "fill" },
    { id: "surround-structure", "source-layer": "structure", type: "line" },
    { id: "surround-roads", "source-layer": "road", type: "line" },
  ];
  for (const spec of layers) {
    const layer = {
      id: spec.id,
      type: spec.type,
      source: "surround",
      "source-layer": spec["source-layer"],
      slot: "bottom",
      paint: spec.type === "line"
        ? { "line-opacity": 0, "line-color": "#000000", "line-width": 1 }
        : { "fill-opacity": 0, "fill-color": "#000000" },
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
    let items = collectCached(originLL);
    if (!items) items = collectMap(map);
    if (!items) return { ready: false };
    const features = featuresFromGeo(originLL, items);
    const hits = hitsAlongRays(features, heading);
    return { ready: true, label: labelFor(hits), hits };
  } catch (err) {
    console.error(err);
    return { ready: false };
  }
}

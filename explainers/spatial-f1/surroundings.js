/**
 * Side and top probes for the car's I3DL2-style reverb.
 *
 * Five rays from the car: forward (approaching), back (departing),
 * left and right (here), and up. Horizontal rays walk the Mapbox
 * Streets building and landuse tiles in plan. Up is a footprint test:
 * the map has no roof mesh, so a building polygon under the car is an
 * overhead structure and clear sky is open.
 *
 * Material heuristics, applied in engine-audio.js:
 *   glass    — building type commercial / office / retail / hotel, or taller than 40 m
 *   concrete — any other building (grandstands, houses, warehouses)
 *   grass    — landuse grass, park, wood, scrub, forest, pitch, farmland
 * Glass reflects high, concrete reflects mid, grass and bushes absorb.
 * The page throttles this to a few times a second.
 */

const RAYS = [
  { id: "forward", angle: 0, max: 96 },
  { id: "back", angle: Math.PI, max: 96 },
  { id: "left", angle: Math.PI / 2, max: 72 },
  { id: "right", angle: -Math.PI / 2, max: 72 },
];

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
  const step = ring.length > 72 ? Math.ceil(ring.length / 72) : 1;
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
    const t = ((ax) * ey - (ay) * ex) / det;
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

function sourceReady(map) {
  try {
    const src = map.getSource("surround");
    return !!(src && typeof src.loaded === "function" && src.loaded());
  } catch {
    return false;
  }
}

function collect(map, origin) {
  const mLng = 111320 * Math.cos(origin[1] * Math.PI / 180);
  const found = [];
  const seen = new Set();
  for (const sourceLayer of ["building", "landuse"]) {
    let feats = [];
    try {
      feats = map.querySourceFeatures("surround", { sourceLayer }) || [];
    } catch {
      continue;
    }
    for (const feat of feats) {
      const mat = materialOf(feat.properties, sourceLayer);
      if (!mat) continue;
      const polys = polysOf(feat.geometry);
      if (!polys.length) continue;
      const props = feat.properties || {};
      const outer = polys[0] && polys[0][0] && polys[0][0][0];
      const key = outer
        ? [outer[0].toFixed(5), outer[1].toFixed(5), mat, props.height || "", props.class || "", props.type || ""].join("|")
        : "";
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      const polysEN = [];
      for (const poly of polys) {
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
      if (near > 150) continue;
      found.push({
        mat,
        polys: polysEN,
        near,
        height: Number(props.height),
      });
    }
  }
  if (found.length > 180) {
    found.sort((a, b) => a.near - b.near);
    return found.slice(0, 180);
  }
  return found;
}

/**
 * @returns {{ready:boolean, label?:string, hits?:Array}}
 * ready false means the tile source has not loaded; keep the previous mix.
 */
export function sampleSurroundings(map, originLL, heading) {
  if (!map || !originLL || typeof map.getSource !== "function" || !map.getSource("surround")) {
    return { ready: false };
  }
  if (!sourceReady(map)) return { ready: false };
  let features = [];
  try {
    features = collect(map, originLL);
  } catch (err) {
    console.error(err);
    return { ready: false };
  }
  const insideGrass = features.some((f) => f.mat === "grass" && f.polys.some((rings) => containsOrigin(rings)));
  const hits = RAYS.map((ray) => {
    const ang = heading + ray.angle;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let solid = null;
    let soft = null;
    for (const feat of features) {
      if (feat.near > ray.max + 20) continue;
      let dist = null;
      for (const rings of feat.polys) {
        for (const ring of rings) {
          const d = rayHit(ring, dx, dy, ray.max);
          if (d != null && (dist == null || d < dist)) dist = d;
        }
      }
      if (dist == null) continue;
      if (feat.mat === "grass") {
        if (!soft || dist < soft.distance) soft = { distance: dist, material: "grass" };
      } else if (!solid || dist < solid.distance) {
        solid = { distance: dist, material: feat.mat };
      }
    }
    let hit;
    if (solid && (!soft || solid.distance <= soft.distance)) hit = solid;
    else if (soft) hit = soft;
    else if (insideGrass) hit = { distance: 12, material: "grass" };
    else hit = { distance: ray.max, material: "open" };
    // A wall still wins when the car is standing in grass. The far park
    // boundary must not hide a grandstand a few metres ahead.
    if (!solid && insideGrass && (!soft || soft.distance > 28)) {
      hit = { distance: 12, material: "grass" };
    }
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

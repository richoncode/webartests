// ============================================================
// Geo math + small helpers. Pure functions, no DOM.
// ============================================================

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => [...document.querySelectorAll(sel)];

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const rand = (lo, hi) => lo + Math.random() * (hi - lo);
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function weightedChoice(items, weightFn) {
  let total = 0;
  for (const it of items) total += weightFn(it);
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightFn(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

const R_EARTH = 6371000;
export const toRad = (d) => (d * Math.PI) / 180;
export const toDeg = (r) => (r * 180) / Math.PI;

// Great-circle distance in metres.
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(s));
}

// Point `dist` metres from `origin` along `bearingDeg`.
export function destPoint(origin, bearingDeg, dist) {
  const br = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const dr = dist / R_EARTH;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(dr) * Math.cos(lat1),
      Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

export function bearingTo(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Local flat projection around a reference point — accurate enough
// for the sub-km segment math used in spawn safety checks.
export function makeProjector(ref) {
  const kx = 111320 * Math.cos(toRad(ref.lat));
  const ky = 110540;
  return {
    toXY: (p) => ({ x: (p.lng - ref.lng) * kx, y: (p.lat - ref.lat) * ky }),
  };
}

// Distance (m) from point P to segment AB, all in projected XY metres.
export function distPointToSegXY(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  let t = 0;
  if (len2 > 0) t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / len2, 0, 1);
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return Math.hypot(p.x - cx, p.y - cy);
}

// Square metres in one acre.
export const ACRE_M2 = 4046.8564224;

// Parse an OSM `maxspeed` tag to mph. Handles "35 mph", "50" (km/h by OSM
// convention), "50 km/h", knots, and implicit zones (returns null so the
// caller can fall back to a per-class default).
export function parseMaxspeedMph(v) {
  if (v == null) return null;
  const s = String(v).toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (s.includes('mph')) return n;
  if (s.includes('knot')) return n * 1.150779;
  return n / 1.609344; // bare number or "km/h"
}

// Ray-casting point-in-polygon. ring is [{lat,lng}, …] (lng→x, lat→y).
// Fine for the sub-km parcels we deal with.
export function pointInPolygon(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng, yi = ring[i].lat;
    const xj = ring[j].lng, yj = ring[j].lat;
    const denom = (yj - yi) || 1e-12;
    const intersect =
      (yi > pt.lat) !== (yj > pt.lat) &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / denom + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Polygon area in m² via shoelace on a local flat projection.
export function polygonAreaM2(ring) {
  if (!ring || ring.length < 3) return 0;
  const proj = makeProjector(ring[0]);
  const p = ring.map((r) => proj.toXY(r));
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    a += (p[j].x + p[i].x) * (p[j].y - p[i].y);
  }
  return Math.abs(a / 2);
}

export function ringBBox(ring) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const r of ring) {
    if (r.lat < minLat) minLat = r.lat;
    if (r.lat > maxLat) maxLat = r.lat;
    if (r.lng < minLng) minLng = r.lng;
    if (r.lng > maxLng) maxLng = r.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

// Distance (m) from a point to the nearest edge of a polygon ring.
export function distPointToRingM(pt, ring) {
  const proj = makeProjector(pt);
  const p = proj.toXY(pt);
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const d = distPointToSegXY(p, proj.toXY(ring[j]), proj.toXY(ring[i]));
    if (d < best) best = d;
  }
  return best;
}

export function fmtDist(m) {
  if (m >= 10000) return (m / 1000).toFixed(1) + ' km';
  if (m >= 1000) return (m / 1000).toFixed(2) + ' km';
  return Math.round(m) + ' m';
}

export function fmtArea(cells, cellM) {
  const km2 = (cells * cellM * cellM) / 1e6;
  return km2 >= 1 ? km2.toFixed(2) + ' km²' : (km2 * 100).toFixed(1) + ' ha';
}

// Local-timezone day key, e.g. "2026-06-10".
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isYesterday(prevKey, nowTs = Date.now()) {
  return prevKey === dayKey(nowTs - 86400000);
}

export function isNightTime(ts = Date.now()) {
  const h = new Date(ts).getHours();
  return h >= 20 || h < 6;
}

export function throttle(fn, ms) {
  let last = 0;
  let timer = null;
  return (...args) => {
    const now = Date.now();
    const due = last + ms - now;
    if (due <= 0) {
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        last = Date.now();
        fn(...args);
      }, due);
    }
  };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

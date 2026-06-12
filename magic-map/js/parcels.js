// ============================================================
// ParcelService — finds the property parcel the player is
// standing on, used by Country mode to place spawns on the
// player's own land instead of along an unsafe roadside.
//
// Source order:
//   1. Authoritative local records — a county / state ArcGIS
//      FeatureServer parcel layer (configured per deployment).
//   2. OpenStreetMap fallback — the smallest landuse/building
//      polygon that encloses the GPS point (works in many rural
//      areas tagged with per-lot landuse).
// Returns null when neither knows the lot — Country mode then
// simply stays off and normal roadside spawning applies.
// ============================================================

import { CONFIG } from './config.js';
import { polygonAreaM2, pointInPolygon, ACRE_M2 } from './util.js';

export class ParcelService {
  constructor() {
    this.cache = null;        // last resolved { center, parcel }
    this._inflight = null;
    this.mockParcel = null;   // injected for the in-app demo
  }

  // Resolve the parcel containing `pos`, or null. Cached while the player
  // stays inside the last-found lot; concurrent callers share one request.
  async lookup(pos) {
    if (this.mockParcel && pointInPolygon(pos, this.mockParcel.ring)) return this.mockParcel;
    if (this.cache?.parcel && pointInPolygon(pos, this.cache.parcel.ring)) return this.cache.parcel;
    if (this._inflight) return this._inflight;
    this._inflight = this._lookup(pos).finally(() => { this._inflight = null; });
    return this._inflight;
  }

  async _lookup(pos) {
    let parcel = await this._fromRecords(pos);
    if (!parcel) parcel = await this._fromOSM(pos);
    this.cache = { center: { lat: pos.lat, lng: pos.lng }, parcel };
    return parcel;
  }

  // 1) Authoritative parcel records (ArcGIS FeatureServer layer).
  async _fromRecords(pos) {
    for (const base of CONFIG.PARCEL_ENDPOINTS) {
      try {
        const params = new URLSearchParams({
          geometry: `${pos.lng},${pos.lat}`,
          geometryType: 'esriGeometryPoint',
          inSR: '4326',
          outSR: '4326',
          spatialRel: 'esriSpatialRelIntersects',
          returnGeometry: 'true',
          outFields: '*',
          f: 'geojson',
        });
        const res = await fetch(`${base.replace(/\/$/, '')}/query?${params}`);
        if (!res.ok) continue;
        const json = await res.json();
        const feat = (json.features || [])[0];
        const ring = feat && this._ringFromGeoJSON(feat.geometry);
        if (ring) return this._finalize(ring, 'records');
      } catch (e) {
        // try next provider
      }
    }
    return null;
  }

  // 2) Fallback: the smallest enclosing OSM lot polygon.
  async _fromOSM(pos) {
    const r = CONFIG.COUNTRY.PARCEL_FETCH_RADIUS;
    const q =
      `[out:json][timeout:12];(` +
      `way["landuse"](around:${r},${pos.lat.toFixed(6)},${pos.lng.toFixed(6)});` +
      `way["building"](around:${r},${pos.lat.toFixed(6)},${pos.lng.toFixed(6)});` +
      `);out geom;`;
    for (const endpoint of CONFIG.OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(q),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!res.ok) continue;
        const json = await res.json();
        const cands = (json.elements || [])
          .filter((e) => e.geometry && e.geometry.length > 2)
          .map((e) => e.geometry.map((g) => ({ lat: g.lat, lng: g.lon })))
          .filter((ring) => pointInPolygon(pos, ring))
          .map((ring) => ({ ring, area: polygonAreaM2(ring) }))
          .filter((c) => c.area > 0)
          .sort((a, b) => a.area - b.area); // smallest enclosing lot = your parcel
        return cands.length ? this._finalize(cands[0].ring, 'osm') : null;
      } catch (e) {
        // try next mirror
      }
    }
    return null;
  }

  _ringFromGeoJSON(geom) {
    if (!geom) return null;
    let coords = null;
    if (geom.type === 'Polygon') coords = geom.coordinates?.[0];
    else if (geom.type === 'MultiPolygon') coords = geom.coordinates?.[0]?.[0];
    if (!coords || coords.length < 3) return null;
    return coords.map(([lng, lat]) => ({ lat, lng }));
  }

  _finalize(ring, source) {
    const areaM2 = polygonAreaM2(ring);
    return { ring, areaM2, acres: areaM2 / ACRE_M2, source };
  }
}

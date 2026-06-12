// ============================================================
// CountryMode — decides when to switch from roadside spawning to
// "place squirrels on the player's own property" spawning.
//
// Active when BOTH hold:
//   • a nearby road is faster than SPEED_MPH_THRESHOLD (unsafe to
//     walk along), and
//   • the GPS sits on a parcel of at least MIN_ACRES, per local
//     records / OSM (see ParcelService).
//
// The parcel lookup is only spent once the cheap road-speed test
// already says the area is unsafe, so urban play never pays for it.
// ============================================================

import { CONFIG } from './config.js';
import { haversine, destPoint, polygonAreaM2, ACRE_M2 } from './util.js';

export class CountryMode {
  constructor(roads, parcels) {
    this.roads = roads;
    this.parcels = parcels;
    this.active = false;
    this.parcel = null;
    this.speedMph = 0;
    this.reason = 'starting up';
    this._evalCenter = null;
    this._inflight = null;
    this._changed = false;
  }

  // Re-evaluate only after real movement (or while we still lack a parcel),
  // so this is safe to call on every location fix.
  evaluate(pos) {
    if (!pos) return Promise.resolve(this._snapshot());
    // Once evaluated at a spot, don't re-test (or re-hit the parcel API)
    // until the player has actually moved. Callers only invoke this after
    // road data is in hand, so a stale speed of 0 isn't a concern.
    if (this._evalCenter && haversine(this._evalCenter, pos) < CONFIG.COUNTRY.REEVAL_DIST) {
      this._changed = false;
      return Promise.resolve(this._snapshot());
    }
    if (this._inflight) return this._inflight;
    this._inflight = this._evaluate(pos).finally(() => { this._inflight = null; });
    return this._inflight;
  }

  async _evaluate(pos) {
    const C = CONFIG.COUNTRY;
    const speed = this.roads.ready ? this.roads.nearbyMaxSpeedMph(pos, C.ROAD_PROBE_RADIUS) : 0;
    const unsafe = speed > C.SPEED_MPH_THRESHOLD;

    let parcel = null;
    if (unsafe) parcel = await this.parcels.lookup(pos);

    const wasActive = this.active;
    this.speedMph = speed;
    this.parcel = parcel;
    this.active = !!(unsafe && parcel && parcel.acres >= C.MIN_ACRES);
    this._evalCenter = { lat: pos.lat, lng: pos.lng };
    this._changed = wasActive !== this.active;

    if (this.active) this.reason = `${Math.round(speed)} mph road · ${parcel.acres.toFixed(2)}-acre lot`;
    else if (unsafe && parcel) this.reason = `lot only ${parcel.acres.toFixed(2)} acre — too small`;
    else if (unsafe) this.reason = `${Math.round(speed)} mph road but no parcel on record`;
    else this.reason = 'walkable streets nearby';

    return this._snapshot();
  }

  _snapshot() {
    return {
      active: this.active,
      parcel: this.parcel,
      speedMph: this.speedMph,
      reason: this.reason,
      changed: this._changed,
    };
  }

  // Force a fresh evaluation on the next call (after teleport / demo).
  invalidate() {
    this._evalCenter = null;
  }
}

// Build a self-contained rural scenario for the in-app demo: a ~1.3-acre
// rectangular lot with a 55 mph highway hugging its south edge. Returns the
// synthetic road set + parcel to inject into RoadNetwork / ParcelService.
export function makeCountryDemo(center) {
  const halfW = 38, halfH = 34; // metres — lot half-extents (≈ 1.3 acre)
  const corner = (latDir, lngDir) =>
    destPoint(destPoint(center, latDir > 0 ? 0 : 180, halfH), lngDir > 0 ? 90 : 270, halfW);
  const ring = [
    corner(1, -1),  // NW
    corner(1, 1),   // NE
    corner(-1, 1),  // SE
    corner(-1, -1), // SW
  ];

  // Highway centreline ~8 m beyond the south edge, running E–W.
  const roadMid = destPoint(center, 180, halfH + 8);
  const road = {
    cls: 'secondary',
    mph: 55,
    pts: [destPoint(roadMid, 270, 220), destPoint(roadMid, 90, 220)],
  };

  const areaM2 = polygonAreaM2(ring);
  const parcel = { ring, areaM2, acres: areaM2 / ACRE_M2, source: 'demo' };
  return { center, road, parcel };
}

// ============================================================
// LocationEngine — one stream of position fixes, from either
// the real Geolocation API or the mock controller (D-pad walk,
// speed multiplier, tap-to-teleport). Mock mode is the fallback
// for desktops and headsets without GPS (e.g. Meta Quest).
// ============================================================

import { CONFIG } from './config.js';
import { destPoint, toDeg, clamp } from './util.js';

export class LocationEngine {
  constructor(onFix) {
    this.onFix = onFix;          // ({lat, lng, accuracy, ts, mock}) => void
    this.mock = false;
    this.watchId = null;
    this.pos = null;

    // mock state
    this.speedIdx = 0;
    this.dirs = new Set();       // held D-pad directions: n/s/e/w
    this._raf = null;
    this._lastStep = 0;
    this.teleportMode = false;
  }

  // Try real GPS. Resolves true on first fix, false on failure/denial.
  startReal(startCenter) {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve(false);
      let settled = false;
      const fail = () => { if (!settled) { settled = true; resolve(false); } };
      const timeout = setTimeout(fail, 12000);

      this.watchId = navigator.geolocation.watchPosition(
        (p) => {
          const fix = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
            ts: p.timestamp || Date.now(),
            mock: false,
          };
          // Skip wildly inaccurate fixes once we have something.
          if (this.pos && fix.accuracy > 80) return;
          this.pos = fix;
          this.onFix(fix);
          if (!settled) { settled = true; clearTimeout(timeout); resolve(true); }
        },
        () => { clearTimeout(timeout); fail(); },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 11000 }
      );
      void startCenter;
    });
  }

  stopReal() {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // ---------- mock mode ----------
  startMock(center) {
    this.mock = true;
    this.stopReal();
    this.pos = {
      lat: center?.lat ?? CONFIG.MOCK_DEFAULT.lat,
      lng: center?.lng ?? CONFIG.MOCK_DEFAULT.lng,
      accuracy: 5,
      ts: Date.now(),
      mock: true,
    };
    this.onFix(this.pos);
    this._lastStep = performance.now();
    const step = (now) => {
      this._stepMock(now);
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  stopMock() {
    this.mock = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this.dirs.clear();
  }

  _stepMock(now) {
    const dt = clamp((now - this._lastStep) / 1000, 0, 0.2);
    this._lastStep = now;
    if (!this.dirs.size || !this.pos) return;

    let dx = 0, dy = 0;
    if (this.dirs.has('n')) dy += 1;
    if (this.dirs.has('s')) dy -= 1;
    if (this.dirs.has('e')) dx += 1;
    if (this.dirs.has('w')) dx -= 1;
    if (!dx && !dy) return;

    const bearing = (toDeg(Math.atan2(dx, dy)) + 360) % 360;
    const speed = CONFIG.MOCK_WALK_MPS * CONFIG.MOCK_SPEEDS[this.speedIdx];
    const next = destPoint(this.pos, bearing, speed * dt);
    this.pos = { ...this.pos, ...next, ts: Date.now() };
    // Emit at GPS-like cadence rather than 60fps.
    if (!this._lastEmit || Date.now() - this._lastEmit > 250) {
      this._lastEmit = Date.now();
      this.onFix(this.pos);
    }
  }

  pressDir(dir, down) {
    if (down) this.dirs.add(dir);
    else this.dirs.delete(dir);
  }

  cycleSpeed() {
    this.speedIdx = (this.speedIdx + 1) % CONFIG.MOCK_SPEEDS.length;
    return CONFIG.MOCK_SPEEDS[this.speedIdx];
  }

  teleport(latlng) {
    if (!this.mock) return;
    this.pos = { lat: latlng.lat, lng: latlng.lng, accuracy: 5, ts: Date.now(), mock: true };
    this.onFix(this.pos);
  }
}

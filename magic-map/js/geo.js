// ============================================================
// LocationEngine — one stream of position fixes, from either
// the real Geolocation API or the mock controller (D-pad walk,
// speed multiplier, tap-to-teleport). Mock mode is the fallback
// for desktops and headsets without GPS (e.g. Meta Quest).
// ============================================================

import { CONFIG } from './config.js';
import { destPoint, toDeg, clamp, haversine } from './util.js';

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
          const emitted = this.ingestReal({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy || 30,
            ts: p.timestamp || Date.now(),
          });
          if (emitted && !settled) { settled = true; clearTimeout(timeout); resolve(true); }
        },
        () => { clearTimeout(timeout); fail(); },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 11000 }
      );
      void startCenter;
    });
  }

  // Jitter filter for raw GPS fixes. Some phones bounce 15–30 m while
  // standing still; a single-fix gate can't catch that (bounces can
  // exceed any threshold and even mimic walking), so the game position
  // is the component-wise rolling median of recent fixes. Standing
  // still, the median pins to the noise centroid; walking or driving,
  // it tracks with a few seconds' lag. Returns true if a fix was
  // emitted to the game.
  ingestReal(raw) {
    const C = CONFIG;
    // First fix: accept anything so the game can start.
    if (!this.pos) {
      this.pos = { ...raw, mock: false };
      this._buf = [raw];
      this._lastEmitTs = raw.ts;
      this._lastFixTs = raw.ts;
      this.onFix(this.pos);
      return true;
    }

    // Accuracy gate (relaxed if we've been deaf for a while).
    const stale = raw.ts - (this._lastFixTs || 0) > C.GPS_STALE_MS;
    if (raw.accuracy > (stale ? C.GPS_ACC_SKIP_STALE : C.GPS_ACC_SKIP)) return false;
    this._lastFixTs = raw.ts;

    this._buf = (this._buf || []).filter((f) => raw.ts - f.ts < C.GPS_WINDOW_MS);
    this._buf.push(raw);
    if (this._buf.length > C.GPS_MEDIAN_WINDOW) this._buf.shift();

    const mid = (arr) => {
      const s = [...arr].sort((a, b) => a - b);
      const m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    const med = {
      lat: mid(this._buf.map((f) => f.lat)),
      lng: mid(this._buf.map((f) => f.lng)),
    };

    // Gate on the buffer's own scatter: stationary bounce produces a
    // wide cloud (large spread → hold position); steady walking is a
    // tight trail whose median keeps displacing (small spread → track).
    const spread = this._buf.reduce((s, f) => s + haversine(f, med), 0) / this._buf.length;
    const gate = Math.max(C.GPS_GATE_MIN, spread * C.GPS_GATE_K);
    if (haversine(this.pos, med) < gate) {
      // Holding still — re-emit the held position occasionally so
      // proximity checks and the HUD stay fresh.
      if (raw.ts - this._lastEmitTs > 5000) {
        this._lastEmitTs = raw.ts;
        this.pos = { ...this.pos, ts: raw.ts };
        this.onFix(this.pos);
        return true;
      }
      return false;
    }

    // Real movement.
    this.pos = { lat: med.lat, lng: med.lng, accuracy: raw.accuracy, ts: raw.ts, mock: false };
    this._lastEmitTs = raw.ts;
    this.onFix(this.pos);
    return true;
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

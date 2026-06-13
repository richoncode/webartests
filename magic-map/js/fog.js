// ============================================================
// Fog of war.
// The world is divided into a ~50m lat/lng grid. Cells the
// player has been near are stored permanently; everything else
// is hidden under a dark canvas overlay with soft-edged holes
// punched over explored cells.
// ============================================================

import { CONFIG } from './config.js';
import { destPoint, toRad } from './util.js';

const D_LAT = CONFIG.CELL_M / 111320; // cell height in degrees latitude

function dLngForRow(y) {
  const rowLat = (y + 0.5) * D_LAT;
  return CONFIG.CELL_M / (111320 * Math.max(0.2, Math.cos(toRad(rowLat))));
}

export function cellKey(lat, lng) {
  const y = Math.floor(lat / D_LAT);
  const x = Math.floor(lng / dLngForRow(y));
  return x + '_' + y;
}

export function cellCenter(key) {
  const [x, y] = key.split('_').map(Number);
  return { lat: (y + 0.5) * D_LAT, lng: (x + 0.5) * dLngForRow(y) };
}

// All cell keys whose centres lie within `radius` metres of `pos`.
export function cellsWithinRadius(pos, radius) {
  const keys = [];
  const yMin = Math.floor((pos.lat - radius / 111320) / D_LAT);
  const yMax = Math.floor((pos.lat + radius / 111320) / D_LAT);
  for (let y = yMin; y <= yMax; y++) {
    const dl = dLngForRow(y);
    const halfW = radius / (111320 * Math.max(0.2, Math.cos(toRad((y + 0.5) * D_LAT))));
    const xMin = Math.floor((pos.lng - halfW) / dl);
    const xMax = Math.floor((pos.lng + halfW) / dl);
    for (let x = xMin; x <= xMax; x++) {
      const c = { lat: (y + 0.5) * D_LAT, lng: (x + 0.5) * dl };
      const dy = (c.lat - pos.lat) * 110540;
      const dx = (c.lng - pos.lng) * 111320 * Math.cos(toRad(pos.lat));
      if (dx * dx + dy * dy <= radius * radius) keys.push(x + '_' + y);
    }
  }
  return keys;
}

export class FogLayer {
  constructor(map, exploredSet) {
    this.map = map;
    this.explored = exploredSet;
    this.enabled = true;

    // With leaflet-rotate the canvas lives in the norotatePane so it
    // stays screen-aligned; we draw with latLngToContainerPoint, which
    // the plugin patches to account for the current bearing.
    map.createPane('fog', map._norotatePane || undefined);
    map.getPane('fog').style.zIndex = 350; // above tiles, below markers
    map.getPane('fog').style.pointerEvents = 'none';

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    map.getPane('fog').appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this._scheduled = false;
    const redraw = () => this.requestDraw();
    map.on('move zoom rotate viewreset resize zoomend', redraw);
    this.requestDraw();
  }

  requestDraw() {
    if (this._scheduled) return;
    this._scheduled = true;
    requestAnimationFrame(() => {
      this._scheduled = false;
      this.draw();
    });
  }

  setEnabled(on) {
    this.enabled = on;
    this.canvas.style.display = on ? '' : 'none';
    if (on) this.requestDraw();
  }

  draw() {
    const map = this.map;
    const size = map.getSize();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    // Keep the canvas pinned to the container's top-left by cancelling
    // the map pane's pan translation (the norotate pane has no
    // transform of its own).
    const panePos = L.DomUtil.getPosition(map.getPane('mapPane')) || L.point(0, 0);
    L.DomUtil.setPosition(this.canvas, panePos.multiplyBy(-1));
    if (this.canvas.width !== size.x * dpr || this.canvas.height !== size.y * dpr) {
      this.canvas.width = size.x * dpr;
      this.canvas.height = size.y * dpr;
      this.canvas.style.width = size.x + 'px';
      this.canvas.style.height = size.y + 'px';
    }

    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);
    if (!this.enabled) return;

    // The fog blanket — translucent so the street grid ghosts
    // through and players can pick a direction; explored areas
    // are punched through to full colour below.
    const isLight = document.documentElement.classList.contains('light-theme');
    ctx.fillStyle = isLight ? 'rgba(235, 235, 240, 0.78)' : 'rgba(6, 9, 18, 0.76)';
    ctx.fillRect(0, 0, size.x, size.y);

    // Pixels-per-metre at the current view.
    const c = map.getCenter();
    const p1 = map.latLngToContainerPoint(c);
    const p2 = map.latLngToContainerPoint(destPoint(c, 90, 100));
    const pxPerM = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 100;

    const r = Math.max(2, CONFIG.CELL_M * 0.8 * pxPerM);
    const bounds = map.getBounds().pad(0.05);
    const many = this.explored.size > 6000;

    ctx.globalCompositeOperation = 'destination-out';

    // Soft outer pass (skipped when the set is huge).
    if (!many) {
      ctx.globalAlpha = 0.45;
      this._punch(ctx, bounds, r * 1.6, size);
    }
    ctx.globalAlpha = 1;
    this._punch(ctx, bounds, r, size);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  _punch(ctx, bounds, radius, size) {
    const map = this.map;
    ctx.beginPath();
    for (const key of this.explored) {
      const c = cellCenter(key);
      if (!bounds.contains([c.lat, c.lng])) continue;
      const p = map.latLngToContainerPoint(c);
      if (p.x < -radius || p.y < -radius || p.x > size.x + radius || p.y > size.y + radius) continue;
      ctx.moveTo(p.x + radius, p.y);
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    }
    ctx.fillStyle = '#000';
    ctx.fill();
  }
}

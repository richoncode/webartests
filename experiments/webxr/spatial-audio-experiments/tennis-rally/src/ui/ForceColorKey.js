import { COLOR_BANDS } from "../visuals/ImpactForceColor.js";

// Exported so DebugUI.js's per-line force swatches use the exact same RGB conversion.
export const toCss = (color) => `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;

const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .fck-panel {
    /* One below AudioTuningPanel.js's .atp-panel (z-index 2147483000) so this always renders
       behind that panel when it's open and their bottom-left positions overlap, regardless of
       DOM append order. */
    position: fixed; left: 12px; top: 50%; transform: translateY(-50%); z-index: 2147482999;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 10px;
    padding: 10px 12px; color: #ccc; font: 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .fck-title { font-weight: 700; font-size: 11px; letter-spacing: 0.02em; color: #ccc; margin-bottom: 8px; text-align: center; white-space: nowrap; }
  .fck-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .fck-row:last-child { margin-bottom: 0; }
  .fck-swatch { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.25); flex-shrink: 0; }
  .fck-label { color: #999; white-space: nowrap; }
`;

// A legend for ImpactForceColor.js's ball-recoloring scheme — same COLOR_BANDS palette, listed
// hottest (hardest hit) first since that reads top-to-bottom like a thermometer. The bands and
// rows never change, but the title does (Impact Force vs. Impact Volume) so it never claims to
// be showing something it isn't once colorModeStore's toggle is flipped.
export class ForceColorKey {
  constructor({ colorModeStore }) {
    this.colorMode = colorModeStore;
    this.host = document.createElement("div");
    this.host.id = "force-color-key-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });

    const bands = [...COLOR_BANDS].reverse();
    const rows = bands
      .map((color, i) => {
        const label = i === 0 ? "Hardest hit" : i === bands.length - 1 ? "Softest hit" : "";
        return `<div class="fck-row"><div class="fck-swatch" style="background:${toCss(color)}"></div><span class="fck-label">${label}</span></div>`;
      })
      .join("");

    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="fck-panel">
        <div class="fck-title" id="fck-title"></div>
        ${rows}
      </div>
    `;

    this._titleEl = this.shadow.querySelector("#fck-title");
    this._updateTitle();
    this._unsubscribe = this.colorMode.subscribe(() => this._updateTitle());
  }

  _updateTitle() {
    this._titleEl.textContent = this.colorMode.mode === "volume" ? "Impact Volume" : "Impact Force";
  }

  dispose() {
    this._unsubscribe();
    this.host.remove();
  }
}

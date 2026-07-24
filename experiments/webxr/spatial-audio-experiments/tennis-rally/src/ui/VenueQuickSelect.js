const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .vqs-pill {
    position: fixed; left: 160px; bottom: 12px; z-index: 2147483000;
    display: flex; gap: 4px;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 10px;
    padding: 4px;
  }
  .vqs-btn {
    background: #1a1a1a; border: 1px solid #2a2a2a; color: #999;
    border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    white-space: nowrap;
  }
  .vqs-btn:hover { border-color: #f0a040; color: #ffd166; }
  .vqs-btn.active { border-color: #f0a040; color: #ffd166; background: #2b2013; }
`;

// A lower-left shortcut for AudioTuningPanel.js's own "Small Venue"/"Large Venue" buttons — lets
// the venue be swapped without opening that panel. Both widgets are wired to the exact same
// onVenuePreset callback (main.js's setVenuePreset()), which is what actually calls
// AudioSettingsStore.selectVenue() to swap in that venue's own independently-editable settings
// (see AudioSettingsStore.js) — so switching venues never resets or overwrites either venue's
// tuning. That callback also syncs both widgets' active highlight (see setActiveVenue() here and
// AudioTuningPanel's own copy), so either one always reflects whichever venue is actually active
// regardless of which button last changed it.
export class VenueQuickSelect {
  constructor({ onVenuePreset, initialPreset = "small" }) {
    this.onVenuePreset = onVenuePreset || (() => {});

    this.host = document.createElement("div");
    this.host.id = "venue-quick-select-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="vqs-pill">
        <button class="vqs-btn" id="venue-small" title="Small enclosed room: fast, loud reflections, no long decay tail">Small Venue</button>
        <button class="vqs-btn" id="venue-large" title="Big open-air stadium: sound carries far, long spacious tail">Large Venue</button>
      </div>
    `;

    this.smallBtn = this.shadow.querySelector("#venue-small");
    this.largeBtn = this.shadow.querySelector("#venue-large");
    this.smallBtn.addEventListener("click", () => this._select("small"));
    this.largeBtn.addEventListener("click", () => this._select("large"));
    this.setActiveVenue(initialPreset);
  }

  _select(preset) {
    this.onVenuePreset(preset);
    this.setActiveVenue(preset);
  }

  setActiveVenue(preset) {
    this.smallBtn.classList.toggle("active", preset === "small");
    this.largeBtn.classList.toggle("active", preset === "large");
  }

  dispose() {
    this.host.remove();
  }
}

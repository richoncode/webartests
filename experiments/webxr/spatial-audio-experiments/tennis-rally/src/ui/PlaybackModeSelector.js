const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .pms-pill {
    position: fixed; left: 108px; top: 12px; z-index: 2147483000;
    display: flex; gap: 4px;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 10px;
    padding: 4px;
  }
  .pms-tab {
    background: #1a1a1a; border: 1px solid #2a2a2a; color: #999;
    border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    white-space: nowrap;
  }
  .pms-tab:hover { border-color: #444; color: #ccc; }
  .pms-tab.active { border-color: #5b9bd5; color: #8fc5ff; background: #16202b; }
  .pms-timer {
    position: fixed; left: 259px; top: 52px; z-index: 2147483000;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 8px;
    padding: 4px 10px; color: #789; font: 11px 'SF Mono', 'Fira Code', monospace;
    letter-spacing: 0.02em;
  }
`;

const formatElapsed = (totalSec) => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
};

// A small persistent two-option mode selector, top-left — mirrors PauseToggle's Shadow-DOM
// widget skeleton, but styled after AudioTuningPanel.js's .atp-tab segmented-tab look since,
// unlike the momentary venue-preset buttons, this needs to keep showing which mode is active.
export class PlaybackModeSelector {
  constructor({ onChange, initialMode = "random" }) {
    this.onChange = onChange;
    this.mode = initialMode;

    this.host = document.createElement("div");
    this.host.id = "playback-mode-selector-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="pms-pill">
        <button class="pms-tab" id="random-btn" title="Procedurally-generated rally">Random Play</button>
        <button class="pms-tab" id="replay-btn" title="Loops a real recorded professional match (Sinner vs. Alcaraz, US Open 2025)">Replay Loop</button>
      </div>
      <div class="pms-timer" id="timer" title="Time since page load or last mode switch">0:00</div>
    `;

    this.randomBtn = this.shadow.querySelector("#random-btn");
    this.replayBtn = this.shadow.querySelector("#replay-btn");
    this.randomBtn.addEventListener("click", () => this._select("random"));
    this.replayBtn.addEventListener("click", () => this._select("replay"));
    this._applyVisual();

    // Wall-clock running time, not simulation time — resets on page refresh (a new instance of
    // this component) or on a mode switch (explicitly, in _select() below), per design.
    this._timerEl = this.shadow.querySelector("#timer");
    this._elapsedSec = 0;
    this._intervalId = setInterval(() => {
      this._elapsedSec += 1;
      this._timerEl.textContent = formatElapsed(this._elapsedSec);
    }, 1000);
  }

  _select(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this._elapsedSec = 0;
    this._timerEl.textContent = formatElapsed(0);
    this._applyVisual();
    this.onChange(mode);
  }

  _applyVisual() {
    this.randomBtn.classList.toggle("active", this.mode === "random");
    this.replayBtn.classList.toggle("active", this.mode === "replay");
  }

  dispose() {
    clearInterval(this._intervalId);
    this.host.remove();
  }
}

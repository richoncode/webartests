const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .dbg-panel {
    position: fixed; right: 12px; top: 12px; z-index: 2147483000;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 10px;
    padding: 10px 12px; color: #eee; font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    width: 208px;
  }
  .dbg-title { font-weight: 700; margin-bottom: 8px; font-size: 12px; letter-spacing: 0.02em; color: #ccc; }
  .dbg-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .dbg-row label { color: #bbb; cursor: pointer; }
  .dbg-btn {
    width: 100%; margin-top: 6px; background: #1a1a1a; border: 1px solid #333; color: #ccc;
    border-radius: 6px; padding: 6px 8px; cursor: pointer; font-weight: 700; font-size: 11px;
  }
  .dbg-btn:hover { border-color: #5b9bd5; color: #fff; }
  .dbg-log { margin-top: 8px; max-height: 90px; overflow-y: auto; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 10px; color: #789; line-height: 1.5; }
`;

const TOGGLES = [
  { key: "trail", label: "Ball trail" },
  { key: "impactMarkers", label: "Impact markers" },
  { key: "ballVelocity", label: "Ball velocity vector" },
  { key: "racketVelocity", label: "Racket velocity vector" },
  { key: "impactLog", label: "Recent impact labels" }
];

// A small always-visible corner panel for the visual debug toggles + Reset View, separate
// from the audio tuning panel so the two concerns stay visually and structurally distinct.
export class DebugUI {
  constructor({ eventBus, onToggle, onResetView }) {
    this.host = document.createElement("div");
    this.host.id = "debug-ui-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });

    this.state = { trail: true, impactMarkers: true, ballVelocity: false, racketVelocity: false, impactLog: true };

    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="dbg-panel">
        <div class="dbg-title">Debug</div>
        ${TOGGLES.map((t) => `
          <div class="dbg-row">
            <input type="checkbox" id="toggle-${t.key}" ${this.state[t.key] ? "checked" : ""} />
            <label for="toggle-${t.key}">${t.label}</label>
          </div>
        `).join("")}
        <button class="dbg-btn" id="reset-view">Reset View</button>
        <div class="dbg-log" id="impact-log"></div>
      </div>
    `;

    TOGGLES.forEach((t) => {
      this.shadow.querySelector(`#toggle-${t.key}`).addEventListener("change", (event) => {
        this.state[t.key] = event.target.checked;
        onToggle(t.key, event.target.checked);
        if (t.key === "impactLog") this._logEl.style.display = event.target.checked ? "block" : "none";
      });
    });

    this.shadow.querySelector("#reset-view").addEventListener("click", onResetView);
    this._logEl = this.shadow.querySelector("#impact-log");

    this._unsubscribe = eventBus.onAny((event) => {
      if (event.type !== "racket-hit" && event.type !== "floor-hit") return;
      if (!this.state.impactLog) return;
      this._appendLog(event);
    });
  }

  _appendLog(event) {
    const line = document.createElement("div");
    const label = event.type === "racket-hit" ? `racket · ${event.racket.playerId} · ${event.ball.speed.toFixed(1)} m/s` : `floor · ${event.ball.speed.toFixed(1)} m/s`;
    line.textContent = `${event.time.toFixed(2)}s  ${label}`;
    this._logEl.prepend(line);
    while (this._logEl.children.length > 12) this._logEl.removeChild(this._logEl.lastChild);
  }

  dispose() {
    this._unsubscribe();
    this.host.remove();
  }
}

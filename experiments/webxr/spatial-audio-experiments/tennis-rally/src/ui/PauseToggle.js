const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .pt-btn {
    position: fixed; left: 60px; top: 12px; z-index: 2147483000;
    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 10px;
    color: #ccc; font-size: 16px; cursor: pointer;
  }
  .pt-btn:hover { border-color: #5b9bd5; }
  .pt-btn.paused { border-color: #f0a040; color: #ffd166; }
`;

// Sits immediately right of the mute button — freezes the rally (players/ball) so the camera
// can still be repositioned and impacts audited without the simulation continuing to fire new
// hits while tuning in the audio panel. main.js owns what "paused" actually does.
export class PauseToggle {
  constructor({ onToggle, initialPaused = false }) {
    this.paused = initialPaused;
    this.onToggle = onToggle;

    this.host = document.createElement("div");
    this.host.id = "pause-toggle-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <button class="pt-btn" id="pause-btn" title="Pause/resume the rally">${this.paused ? "▶" : "⏸"}</button>
    `;

    this.button = this.shadow.querySelector("#pause-btn");
    this.button.addEventListener("click", () => this.setPaused(!this.paused));
    this._applyVisual();
  }

  setPaused(paused) {
    this.paused = paused;
    this._applyVisual();
    this.onToggle(this.paused);
  }

  _applyVisual() {
    this.button.textContent = this.paused ? "▶" : "⏸";
    this.button.classList.toggle("paused", this.paused);
  }

  dispose() {
    this.host.remove();
  }
}

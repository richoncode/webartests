const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .mt-btn {
    position: fixed; left: 12px; top: 12px; z-index: 2147483000;
    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 10px;
    color: #ccc; font-size: 18px; cursor: pointer;
  }
  .mt-btn:hover { border-color: #5b9bd5; }
  .mt-btn.muted { border-color: #7a2b25; color: #ffb8ae; }
`;

// A single always-visible mute toggle, top-left. Deliberately dumb: it just calls onToggle
// with the new muted state and reflects it visually — main.js owns what "muted" actually does
// to the audio graph.
export class MuteToggle {
  constructor({ onToggle, initialMuted = false }) {
    this.muted = initialMuted;
    this.onToggle = onToggle;

    this.host = document.createElement("div");
    this.host.id = "mute-toggle-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <button class="mt-btn" id="mute-btn" title="Mute/unmute all audio">${this.muted ? "🔇" : "🔊"}</button>
    `;

    this.button = this.shadow.querySelector("#mute-btn");
    this.button.addEventListener("click", () => this.setMuted(!this.muted));
    this._applyVisual();
  }

  setMuted(muted) {
    this.muted = muted;
    this._applyVisual();
    this.onToggle(this.muted);
  }

  _applyVisual() {
    this.button.textContent = this.muted ? "🔇" : "🔊";
    this.button.classList.toggle("muted", this.muted);
  }

  dispose() {
    this.host.remove();
  }
}

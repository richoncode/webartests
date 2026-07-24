const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .mt-btn {
    /* Its own row (row 2), left-anchored, below the row-1 utility buttons (Pause/Controls/mode
       selector — all shifted left to fill the slot this used to occupy in row 1). Both muted and
       unmuted keep this exact same anchor — only size/color/label change between states, so the
       button never jumps around the screen. */
    position: fixed; left: 12px; top: 60px; z-index: 2147483000;
    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 10px;
    color: #ccc; font-size: 18px; cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .mt-btn:hover { border-color: #5b9bd5; }
  /* Muted is the default state and doubles as "audio is off, click to turn it on" — much more
     prominent than the small unmuted icon, but anchored at the exact same left/top as above. */
  .mt-btn.muted {
    width: auto; height: auto; gap: 8px;
    padding: 12px 22px; font-size: 16px; font-weight: 700;
    background: #c0392b; border: 1px solid #e74c3c; color: #fff;
    box-shadow: 0 2px 14px rgba(0,0,0,0.5);
  }
  .mt-btn.muted:hover { background: #d8483a; }
`;

// A single always-visible mute toggle. Deliberately dumb about audio itself: it just calls
// onToggle with the new muted state and reflects it visually — main.js owns what "muted" and
// "unmuted" actually do to the audio graph (including resuming a browser-suspended AudioContext
// on unmute, since defaulting to muted-on doubles as this app's "click to enable audio" prompt).
export class MuteToggle {
  constructor({ onToggle, initialMuted = true }) {
    this.muted = initialMuted;
    this.onToggle = onToggle;

    this.host = document.createElement("div");
    this.host.id = "mute-toggle-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <button class="mt-btn" id="mute-btn" title="Mute/unmute all audio"></button>
    `;

    this.button = this.shadow.querySelector("#mute-btn");
    this.button.addEventListener("click", () => this.setMuted(!this.muted));
    this._applyVisual();
    // Apply the initial state to the actual audio graph, not just this button's own visuals —
    // without this, defaulting to muted-on left the button *saying* Muted while the gain stayed
    // at its unmuted default until the first click.
    this.onToggle(this.muted);
  }

  setMuted(muted) {
    this.muted = muted;
    this._applyVisual();
    this.onToggle(this.muted);
  }

  _applyVisual() {
    this.button.textContent = this.muted ? "🔇 Muted" : "🔊";
    this.button.classList.toggle("muted", this.muted);
  }

  dispose() {
    this.host.remove();
  }
}

const STORAGE_KEY = "tennis-rally-gesture-hints-dismissed";

const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .gh-panel {
    position: fixed; left: 12px; top: 60px; z-index: 2147483000;
    width: 236px;
    background: rgba(13,13,13,0.9); border: 1px solid #2a2a2a; border-radius: 10px;
    padding: 10px 12px; color: #bbb;
    font: 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .gh-panel.hidden { display: none; }
  .gh-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .gh-title-label { font-weight: 700; color: #ccc; font-size: 12px; }
  .gh-item { display: flex; flex-direction: column; gap: 1px; margin-bottom: 6px; }
  .gh-label { color: #ffd166; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
  .gh-keys { color: #8fc5ff; font-family: 'SF Mono', 'Fira Code', monospace; }
  .gh-close {
    flex: none; background: transparent; border: 1px solid #333; color: #888; border-radius: 5px;
    width: 20px; height: 20px; cursor: pointer; font-size: 11px; line-height: 1;
  }
  .gh-close:hover { border-color: #5b9bd5; color: #fff; }
  .gh-reopen {
    position: fixed; left: 108px; top: 12px; z-index: 2147483000;
    width: 40px; height: 40px; display: none; align-items: center; justify-content: center;
    background: rgba(13,13,13,0.92); border: 1px solid #2a2a2a; border-radius: 10px;
    color: #888; font: 700 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer; text-align: center; line-height: 1.1;
  }
  .gh-reopen.visible { display: flex; }
  .gh-reopen:hover { border-color: #5b9bd5; color: #fff; }
`;

const HINTS = [
  { label: "Orbit", keys: "Drag · ←→/A D" },
  { label: "Zoom", keys: "Wheel · Pinch" },
  { label: "Elevation", keys: "Shift+Drag ↕ · ↑↓/E Q/PgUp PgDn" },
  { label: "Reset View", keys: "button, top-right" },
  { label: "XR", keys: "R-stick X orbit · R-stick Y zoom · L-stick Y elevation" }
];

// A dismissible top-left card spelling out the SpectatorRig's controls, since none of them are
// otherwise discoverable on a first visit (no landing page/tutorial). Anchored below the
// mute/pause buttons so all the small utility controls live in the same corner. Dismissal is
// remembered in localStorage, with a small "Controls" tab left behind (next to mute/pause) to
// bring it back.
export class GestureHints {
  constructor() {
    this.host = document.createElement("div");
    this.host.id = "gesture-hints-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });

    const dismissed = this._readDismissed();
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="gh-panel ${dismissed ? "hidden" : ""}" id="bar">
        <div class="gh-title">
          <span class="gh-title-label">Controls</span>
          <button class="gh-close" id="close" title="Hide controls hint">✕</button>
        </div>
        ${HINTS.map((h) => `<div class="gh-item"><span class="gh-label">${h.label}</span><span class="gh-keys">${h.keys}</span></div>`).join("")}
      </div>
      <button class="gh-reopen ${dismissed ? "visible" : ""}" id="reopen">Controls</button>
    `;

    this.shadow.querySelector("#close").addEventListener("click", () => this._setDismissed(true));
    this.shadow.querySelector("#reopen").addEventListener("click", () => this._setDismissed(false));
  }

  _readDismissed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  _setDismissed(dismissed) {
    try {
      localStorage.setItem(STORAGE_KEY, dismissed ? "1" : "0");
    } catch {
      // localStorage unavailable (private browsing, etc.) — just reflect the state visually.
    }
    this.shadow.querySelector("#bar").classList.toggle("hidden", dismissed);
    this.shadow.querySelector("#reopen").classList.toggle("visible", dismissed);
  }

  dispose() {
    this.host.remove();
  }
}

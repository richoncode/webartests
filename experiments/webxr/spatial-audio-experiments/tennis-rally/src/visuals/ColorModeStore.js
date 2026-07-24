// Tiny standalone pub/sub for "what should the force color bands be computed from" — a
// visualization preference, not an acoustic tuning parameter, so it deliberately lives outside
// AudioSettingsStore (and isn't per-venue) even though several settings-adjacent widgets read it.
export class ColorModeStore {
  constructor() {
    this._mode = "force"; // "force" | "volume"
    this._listeners = new Set();
  }

  get mode() {
    return this._mode;
  }

  set(mode) {
    if (mode !== "force" && mode !== "volume") return;
    if (mode === this._mode) return;
    this._mode = mode;
    this._listeners.forEach((listener) => listener(this._mode));
  }

  toggle() {
    this.set(this._mode === "force" ? "volume" : "force");
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}

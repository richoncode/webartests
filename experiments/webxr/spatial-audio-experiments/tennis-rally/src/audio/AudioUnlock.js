// Browsers block AudioContext playback until a user gesture occurs, and this project can't rely
// on Babylon's own legacy AudioEngine wrapper to handle that automatically: it hardcodes
// `resumeOnInteraction: false` internally when it builds its v2 engine (see
// @babylonjs/core/Audio/audioEngine.pure.js's `_initAsync({ resumeOnInteraction: false })`) —
// so nothing in Babylon itself ever calls `audioContext.resume()` on a generic interaction here.
// Listens for the broadest practical set of "the user just did something" events — not just
// 'click', since a camera-orbit drag or a wheel-zoom (this scene's two most natural first
// interactions) don't reliably behave like one in every browser — and resumes once, self-removing
// after success.
export class AudioUnlock {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this._onGesture = () => {
      if (this.audioContext.state === "suspended") void this.audioContext.resume();
    };
    this._events = ["pointerdown", "keydown", "wheel", "touchstart"];
    this._events.forEach((type) => window.addEventListener(type, this._onGesture, { passive: true }));

    this._stateListener = () => {
      if (this.audioContext.state === "running") this._removeListeners();
    };
    this.audioContext.addEventListener("statechange", this._stateListener);
  }

  _removeListeners() {
    this._events.forEach((type) => window.removeEventListener(type, this._onGesture));
  }

  dispose() {
    this._removeListeners();
    this.audioContext.removeEventListener("statechange", this._stateListener);
  }
}

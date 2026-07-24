// A single tunable model for everything BallAudio/AudioTuningPanel need. Pure data + a tiny
// pub/sub — no Babylon objects, no physics, so it can be serialized to/from JSON directly.

// Each clip is its own bank entry — url, a per-clip gain multiplier (for balancing samples
// recorded at different loudness), and enabled (excluded from random selection, not deleted,
// so a disabled clip can be re-enabled later without re-adding it).
const clip = (url, overrides = {}) => ({ url, enabled: true, volume: 1, ...overrides });

const defaultHitCategory = (overrides = {}) => ({
  forceMin: 0,
  forceMax: 12,
  volumeMin: 0.05,
  volumeMax: 1,
  randomVolumeJitter: 0.08,
  randomPitchJitter: 0.06,
  maxSimultaneousSounds: 6,
  clips: [],
  ...overrides
});

export const DEFAULT_SETTINGS = Object.freeze({
  racket: defaultHitCategory({
    // 20, not 14: real match data (see reference-data/) puts racket-hit "force" at
    // 14.1-19.9 (m/s-equivalent) for the recorded rally Replay Loop defaults to — entirely at
    // or above the old forceMax=14 ceiling, which clamped every real hit to max volume with
    // zero dynamic range. 20 gives both the procedural sim (9.7-17.9) and real replay data
    // headroom to actually use the Force -> Volume ramp instead of pinning at the top.
    forceMax: 20,
    volumeMin: 0.29,
    randomVolumeJitter: 0,
    randomPitchJitter: 0,
    // A heavily-spun serve is reliably quieter than a flat one (r = -0.88 between spin rate and
    // impact sound pressure level, Takeda et al. 2024 — see tennis-audio-physics.html's "Ball
    // spin isn't in the force model" section) — racketForce() itself has no spin term, so this
    // is applied as a separate additive volume adjustment on top of it (mapSpinToVolumeAdjust()
    // in BallAudio.js), editable via the Spin -> Volume Adjustment graph in the Racket tab.
    // spinMax=3000rpm is a plausible hard-topspin-serve rate; -0.15 at that point is a
    // deliberately bigger cut than the paper's own (unspecified) slope — picked to make the
    // effect clearly audible in this app rather than trying to match an exact figure the paper
    // doesn't report. volumeAdjustAtSpinMin is capped at 0 everywhere in the UI: spin can only
    // ever quiet a hit here, never make it louder.
    spinMin: 0,
    spinMax: 3000,
    volumeAdjustAtSpinMin: 0,
    volumeAdjustAtSpinMax: -0.15,
    clips: [
      clip("audio/racket/racket-hit-01.wav", { enabled: false }),
      clip("audio/racket/racket-hit-02.wav", { enabled: false }),
      clip("audio/racket/racket-hit-03.wav", { enabled: false }),
      clip("audio/racket/racket-hit-04.wav", { enabled: false }),
      clip("audio/racket/racket-hit-05.wav", { enabled: false }),
      clip("audio/racket/racket-hit-06.wav"),
      clip("audio/racket/racket-hit-07.wav", { enabled: false }),
      clip("audio/racket/racket-hit-08.wav", { enabled: false }),
      clip("audio/racket/racket-hit-09.wav", { enabled: false }),
      clip("audio/racket/racket-hit-10.wav", { enabled: false }),
      clip("audio/racket/racket-hit-11.wav", { enabled: false }),
      clip("audio/racket/racket-hit-12.wav", { enabled: false }),
      clip("audio/racket/racket-hit-13.wav", { enabled: false })
    ]
  }),
  floor: defaultHitCategory({
    // 13, not 8: real recorded floor-bounce "force" runs 3.4-12.8 (mean 8.3, right at the old
    // ceiling) for the same rally — the old forceMax=8 left barely any headroom above the
    // real data's own average. 13 covers the real range (and the procedural sim's 6.2-10.0)
    // with room to spare.
    forceMax: 13,
    volumeMax: 0.85,
    clips: [
      clip("audio/floor/floor-bounce-01.wav"),
      clip("audio/floor/floor-bounce-02.wav", { enabled: false }),
      // Repurposed from the "wall" recordings — added here instead of the floor mic's own
      // takes, which the tuning UI's per-clip disable can now drop individually if unwanted.
      clip("audio/wall/wall-hit-01.wav", { enabled: false }),
      clip("audio/wall/wall-hit-02.wav", { enabled: false })
    ]
  }),
  spatial: {
    panningModel: "HRTF", // 'HRTF' | 'equalpower'
    distanceModel: "inverse", // 'linear' | 'inverse' | 'exponential'
    minDistance: 2,
    maxDistance: 60,
    rolloffFactor: 1.4,
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterVolume: 1,
    globalGain: 1,
    racketGainMultiplier: 1,
    floorGainMultiplier: 0.9,
    venueScale: 1
  },
  reverb: {
    enabled: true,
    dryLevel: 1,
    wetLevel: 0.22,
    outputGain: 0.9,
    impulseResponse: "audio/impulse-responses/outdoor-court.wav",
    lowpassHz: 0, // 0 = disabled
    highpassHz: 0
  }
});

const SPATIAL_PRESETS = {
  "Small practice court": { minDistance: 1, maxDistance: 20, rolloffFactor: 2.2, venueScale: 0.6, distanceModel: "inverse" },
  "Outdoor court": { minDistance: 2, maxDistance: 60, rolloffFactor: 1.4, venueScale: 1, distanceModel: "inverse" },
  "Stadium close seats": { minDistance: 3, maxDistance: 90, rolloffFactor: 1, venueScale: 1.4, distanceModel: "inverse" },
  "Stadium upper seats": { minDistance: 6, maxDistance: 140, rolloffFactor: 0.6, venueScale: 2.4, distanceModel: "exponential" },
  "Debug flat/no falloff": { minDistance: 100, maxDistance: 1000, rolloffFactor: 0.0001, venueScale: 1, distanceModel: "linear" }
};

// Two broad-strokes starting points (spatial + reverb together, unlike the finer SPATIAL_PRESETS
// grid above which only touches spatial) for "what kind of place is this court in" — the baked-in
// default each venue's live run/edit copy is seeded from (see buildVenueDefaults below), not
// something re-applied every time the venue is toggled.
//
// Small/closed venues are physically tiny — a listener is rarely more than a few meters from any
// hit, so the outer edge of falloff is capped low (low maxDistance) even though rolloffFactor
// itself is gentle, tuned by ear rather than steepened to match — hard nearby walls mean strong,
// fast early reflections even though there's no room for a long decay tail (short small-room IR,
// moderate wetLevel).
//
// Large/open venues put real distance between listener and hit, so sound needs to carry much
// further before fading (high maxDistance, gentle rolloffFactor — exponential reads as more
// "distant" than inverse at long range) — but with no nearby walls to reflect off, reflections
// are sparse and diffuse (low wetLevel) even though the space itself supports a long, spacious
// tail (stadium IR). A touch of lowpass models the treble loss real sound suffers traveling that
// far through open air.
export const VENUE_TUNING_PRESETS = {
  // wetLevel/outputGain tuned by ear (see tennis-rally-audio-tuning-2026-07-24T02-54-00-162Z.json)
  // to 0.99/1.44 — a much wetter, hotter small room than the original 0.35/0.75 starting guess.
  "Small / Closed Venue": {
    spatial: { distanceModel: "inverse", minDistance: 1, maxDistance: 15, rolloffFactor: 0.45, venueScale: 0.55 },
    reverb: { enabled: true, dryLevel: 1, wetLevel: 0.99, outputGain: 1.44, impulseResponse: "audio/impulse-responses/small-room.wav", lowpassHz: 0, highpassHz: 0 }
  },
  // wetLevel/outputGain tuned by ear (see tennis-rally-audio-tuning-2026-07-24T02-49-15-233Z.json)
  // down to 0.25/0.64 — drier and quieter than the original 0.3/0.88 starting guess.
  "Large / Open Venue": {
    spatial: { distanceModel: "exponential", minDistance: 4, maxDistance: 150, rolloffFactor: 0.5, venueScale: 2.2 },
    reverb: { enabled: true, dryLevel: 1, wetLevel: 0.25, outputGain: 0.64, impulseResponse: "audio/impulse-responses/stadium.wav", lowpassHz: 6000, highpassHz: 0 }
  }
};

const VENUE_PRESET_NAME = { small: "Small / Closed Venue", large: "Large / Open Venue" };

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const deepMerge = (target, patch) => {
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value && typeof value === "object" && !Array.isArray(value) && typeof target[key] === "object") {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
};

// DEFAULT_SETTINGS with a venue's own VENUE_TUNING_PRESETS spatial/reverb baked on top — racket/
// floor category settings start identical between venues (VENUE_TUNING_PRESETS never touches
// them), but from that point on each venue's copy is independently editable.
const buildVenueDefaults = (venue) => deepMerge(deepClone(DEFAULT_SETTINGS), VENUE_TUNING_PRESETS[VENUE_PRESET_NAME[venue]]);

export class AudioSettingsStore {
  constructor() {
    // One complete settings tree per venue: a frozen-in-spirit "baked-in default" (re-applied
    // only on an explicit reset) and a live "run/edit" copy get()/set() actually read and write.
    // Editing a slider only ever mutates whichever venue is currently active — selectVenue()
    // swaps which copy is live without touching the other one, so switching venues back and
    // forth never loses either side's tuning.
    this._venueDefaults = { small: buildVenueDefaults("small"), large: buildVenueDefaults("large") };
    this._settingsByVenue = { small: deepClone(this._venueDefaults.small), large: deepClone(this._venueDefaults.large) };
    this._activeVenue = "small"; // matches CourtBuilder's own default venue geometry
    this._listeners = new Set();
  }

  get() {
    return this._settingsByVenue[this._activeVenue];
  }

  get activeVenue() {
    return this._activeVenue;
  }

  // Switches which venue's settings get()/set() operate on. The venue NOT selected keeps
  // whatever was last edited on it, untouched — this is the whole point: toggling venues is
  // meant to recall each one's own tuning, not reset or share a single global settings tree.
  selectVenue(venue) {
    if (venue !== "small" && venue !== "large") return;
    if (venue === this._activeVenue) return;
    this._activeVenue = venue;
    this._notify();
  }

  set(patch) {
    deepMerge(this.get(), patch);
    this._notify();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this.get()));
  }

  // Resets the CURRENTLY ACTIVE venue back to its own baked-in default (small vs. large have
  // different baked-in values — see VENUE_TUNING_PRESETS) — never the other venue's copy.
  resetAll() {
    this._settingsByVenue[this._activeVenue] = deepClone(this._venueDefaults[this._activeVenue]);
    this._notify();
  }

  resetSpatialOnly() {
    const venueDefault = this._venueDefaults[this._activeVenue];
    const current = this.get();
    current.spatial = deepClone(venueDefault.spatial);
    current.reverb = deepClone(venueDefault.reverb);
    this._notify();
  }

  applyPreset(name) {
    const preset = SPATIAL_PRESETS[name];
    if (!preset) return;
    this.set({ spatial: preset });
  }

  addClip(category, url) {
    const trimmed = url.trim();
    if (!trimmed) return;
    this.get()[category].clips.push(clip(trimmed));
    this._notify();
  }

  removeClip(category, index) {
    this.get()[category].clips.splice(index, 1);
    this._notify();
  }

  updateClip(category, index, patch) {
    const target = this.get()[category].clips[index];
    if (!target) return;
    Object.assign(target, patch);
    this._notify();
  }

  get presetNames() {
    return Object.keys(SPATIAL_PRESETS);
  }

  // Exports BOTH venues' settings, not just whichever is currently active — a save that only
  // captured the active venue meant tuning one venue, then switching to tune the other, then
  // discovering "Save" only ever gave you back the one you happened to be on when you clicked it.
  toJSON() {
    return JSON.stringify({ small: this._settingsByVenue.small, large: this._settingsByVenue.large }, null, 2);
  }

  // Accepts this store's own combined {small, large} export. Also accepts an older single-venue
  // export (a flat {racket, floor, spatial, reverb} object, from before Save/Load became
  // venue-complete) — that older shape is applied only to whichever venue is currently active,
  // exactly like it always was, so a file downloaded before this change still loads correctly.
  fromJSON(json) {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    if (parsed.small || parsed.large) {
      if (parsed.small) this._settingsByVenue.small = deepMerge(deepClone(this._venueDefaults.small), parsed.small);
      if (parsed.large) this._settingsByVenue.large = deepMerge(deepClone(this._venueDefaults.large), parsed.large);
    } else {
      this._settingsByVenue[this._activeVenue] = deepMerge(deepClone(this._venueDefaults[this._activeVenue]), parsed);
    }
    this._notify();
  }
}

import { clamp } from "../utils/math.js";
import { computeAttenuation } from "../audio/spatialAttenuation.js";

const HIT_FIELDS = [
  {
    key: "randomVolumeJitter",
    label: "Volume Jitter",
    min: 0,
    max: 0.5,
    step: 0.01,
    hint: "Random variation applied to each hit's volume, as a fraction (0.08 = ±8%). Keeps repeated hits from all sounding identically loud — too high and quiet/loud hits become unpredictable."
  },
  {
    key: "randomPitchJitter",
    label: "Pitch Jitter",
    min: 0,
    max: 0.5,
    step: 0.01,
    hint: "Random variation applied to each hit's playback speed (and therefore pitch), as a fraction. A little makes repeated hits feel natural instead of mechanical; too much starts to sound warbly."
  },
  {
    key: "maxSimultaneousSounds",
    label: "Max Simultaneous",
    min: 1,
    max: 12,
    step: 1,
    hint: "How many hits of this category can play at once. Once this limit is hit, the oldest still-playing sound is cut off to make room for a new one — prevents an unbounded pile-up during a fast rally."
  }
];

// racketForce()/floorForce() are each a weighted blend of impact speeds (m/s) scaled by a
// dimensionless 0.7-1.0 alignment/angle factor — so "force" is a speed-equivalent, in m/s, not
// a true physical force. FORCE_AXIS_MAX matches the old Force Min/Max sliders' range.
const FORCE_AXIS_MAX = 20;
const FV_GRAPH_PAD = { left: 32, right: 12, top: 14, bottom: 24 };
const FV_HIT_RADIUS = 14;

const SPATIAL_FIELDS = [
  {
    key: "panningModel",
    label: "Panning Model",
    type: "select",
    options: ["HRTF", "equalpower"],
    hint: "How left/right/front/back positioning is computed. HRTF simulates how your own head and ears filter sound from different directions — more convincingly 3D, especially over headphones, but costs more CPU per voice. Equal-power is a simple stereo pan — cheaper, less directional, no front/back or up/down cues.",
    optionHints: {
      HRTF: "Simulates how your head/ears filter sound from different directions — convincingly 3D, more CPU cost.",
      equalpower: "A simple left-right stereo pan — cheaper, but no real front/back or up/down positioning."
    }
  },
  {
    key: "distanceModel",
    label: "Distance Model",
    type: "select",
    options: ["linear", "inverse", "exponential"],
    hint:
      "How loud a hit sounds as you move away from it:\n\n" +
      "• Linear — fades at a steady, even pace, then cuts straight to silence once you're past the outer range. Like a fade-out that just stops.\n\n" +
      "• Inverse (default) — very sensitive up close (a step or two makes a big difference), then eases off and lingers softly no matter how far you go. Closest to how sound behaves outdoors in real life.\n\n" +
      "• Exponential — drops off hard and fast the moment you step back. Intense right on top of a hit, but thins out quickly — more contrast between near and far.",
    optionHints: {
      linear: "Fades at a steady, even pace, then cuts straight to silence once you're out of range.",
      inverse: "Very sensitive up close, then eases off and lingers softly forever. Closest to real outdoor sound. (Default)",
      exponential: "Drops off hard and fast as soon as you step back — intense up close, thins out quickly further away."
    }
  },
  {
    key: "minDistance",
    label: "Min Distance (ref)",
    min: 0.1,
    max: 20,
    step: 0.1,
    hint: "The distance (in meters) at which a hit plays at full volume — moving even closer than this doesn't make it any louder. Also called the 'reference distance'. Smaller values make close-up hits feel more intense/sensitive to movement. Range capped at 20m — beyond that isn't a meaningful 'reference' distance for a ~24m tennis court."
  },
  {
    key: "maxDistance",
    label: "Max Distance",
    min: 1,
    max: 200,
    step: 1,
    hint: "The distance beyond which a hit stops getting any quieter (Inverse/Exponential) or goes fully silent (Linear). Sets the outer edge of how far sound reaches. Range capped at 200m — comfortably past even the Large/Open Venue preset's 150m, which already reaches the back of a big stadium's upper deck."
  },
  {
    key: "rolloffFactor",
    label: "Rolloff Factor",
    min: 0,
    max: 5,
    step: 0.05,
    hint: "How aggressively volume drops as you move beyond Min Distance. Higher values make sound thin out over just a few meters (tight, small-feeling space); lower values let it stay audible much further away (big, open-feeling space)."
  },
  {
    key: "coneInnerAngle",
    label: "Cone Inner Angle",
    min: 0,
    max: 360,
    step: 1,
    hint: "The angle (in degrees), centered on the sound's facing direction, within which it plays at full volume. 360° means equally loud in every direction — no directionality at all."
  },
  {
    key: "coneOuterAngle",
    label: "Cone Outer Angle",
    min: 0,
    max: 360,
    step: 1,
    hint: "Beyond this angle, volume has fully dropped to Cone Outer Volume. Between Inner and Outer angles, volume fades smoothly between full and that value — a wider gap between Inner/Outer means a softer, more gradual off-axis fade."
  },
  {
    key: "coneOuterVolume",
    label: "Cone Outer Volume",
    min: 0,
    max: 1,
    step: 0.01,
    hint: "How loud the sound is outside the Cone Outer Angle, relative to full volume. 1 means no directional effect at all — the sound is a plain, uniform sphere with no 'facing' behavior."
  },
  {
    key: "globalGain",
    label: "Global Hit Gain",
    min: 0,
    max: 2,
    step: 0.01,
    hint: "A master volume multiplier applied to every hit — racket and floor alike — after all other volume math. Use this to make the whole mix louder or quieter without disturbing the balance between categories."
  },
  {
    key: "racketGainMultiplier",
    label: "Racket Gain ×",
    min: 0,
    max: 3,
    step: 0.01,
    hint: "A volume multiplier applied only to racket-hit sounds, on top of Global Hit Gain. Raise or lower this to rebalance racket hits against floor bounces without touching the overall mix volume."
  },
  {
    key: "floorGainMultiplier",
    label: "Floor Gain ×",
    min: 0,
    max: 3,
    step: 0.01,
    hint: "A volume multiplier applied only to floor-hit (bounce) sounds, on top of Global Hit Gain. Raise or lower this to rebalance bounces against racket hits without touching the overall mix volume."
  },
  {
    key: "venueScale",
    label: "Venue Scale",
    min: 0.1,
    max: 5,
    step: 0.05,
    hint: "Stretches or shrinks how far away everything sounds, without moving anything in the 3D scene itself. Above 1 makes the whole court feel bigger and further away (quieter at any given real distance); below 1 makes it feel smaller and closer (louder at any given real distance)."
  }
];

const REVERB_FIELDS = [
  {
    key: "enabled",
    label: "Reverb Enabled",
    type: "checkbox",
    hint: "Turns the reverb/ambience send on or off. The direct (dry) sound always plays regardless — this only toggles the echo/room-tone layer mixed in alongside it."
  },
  {
    key: "dryLevel",
    label: "Dry Level",
    min: 0,
    max: 1.5,
    step: 0.01,
    hint: "Volume of the direct, un-reverberated sound — the hit exactly as recorded, with no room ambience mixed in. This is what you'd hear with Reverb Enabled turned off."
  },
  {
    key: "wetLevel",
    label: "Wet Level",
    min: 0,
    max: 1.5,
    step: 0.01,
    hint: "Volume of the reverberated (echo/room-tone) signal mixed in alongside the dry sound. Higher feels more spacious/reflective and 'in a room'; lower feels drier and closer, as if outdoors with nothing nearby to bounce off."
  },
  {
    key: "outputGain",
    label: "Reverb Output Gain",
    min: 0,
    max: 2,
    step: 0.01,
    hint: "A final volume multiplier applied after the dry and wet signals are already combined — the last knob before the sound reaches the speakers. Turn this down if hits are clipping/distorting even after lowering Dry/Wet."
  },
  {
    key: "impulseResponse",
    label: "Impulse Response",
    type: "select",
    options: [
      "audio/impulse-responses/small-room.wav",
      "audio/impulse-responses/outdoor-court.wav",
      "audio/impulse-responses/stadium.wav"
    ],
    hint: "The recorded acoustic 'fingerprint' of a real (or modeled) space that shapes the character of the echo — a small room sounds tight and boxy with a short tail, a stadium sounds long and spacious. This changes the reverb's color and length; Wet Level only changes how loud it is.",
    optionHints: {
      "audio/impulse-responses/small-room.wav": "Tight, boxy, short decay — an enclosed indoor space.",
      "audio/impulse-responses/outdoor-court.wav": "A middling, open-air court — moderate space, not much of a tail.",
      "audio/impulse-responses/stadium.wav": "Long, spacious, slow decay — a big open venue with distant surfaces."
    }
  },
  {
    key: "lowpassHz",
    label: "Lowpass Hz (0=off)",
    min: 0,
    max: 20000,
    step: 100,
    hint: "Cuts frequencies above this value out of the reverb tail only (the dry sound is untouched). Lower values make the echo sound duller and more muffled, as if the reflected sound traveled further through air or around obstacles. 0 disables this filter (full brightness)."
  },
  {
    key: "highpassHz",
    label: "Highpass Hz (0=off)",
    min: 0,
    max: 2000,
    step: 10,
    hint: "Cuts frequencies below this value out of the reverb tail only (the dry sound is untouched). Higher values make the echo sound thinner and less boomy/rumbly. 0 disables this filter (full bass retained)."
  }
];

// Two broad-strokes starting points (spatial + reverb together, unlike the finer SPATIAL_PRESETS
// grid below which only touches spatial) for "what kind of place is this court in":
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
  "Small / Closed Venue": {
    spatial: { distanceModel: "inverse", minDistance: 1, maxDistance: 15, rolloffFactor: 0.45, venueScale: 0.55 },
    reverb: { enabled: true, dryLevel: 1, wetLevel: 0.35, outputGain: 0.75, impulseResponse: "audio/impulse-responses/small-room.wav", lowpassHz: 0, highpassHz: 0 }
  },
  "Large / Open Venue": {
    spatial: { distanceModel: "exponential", minDistance: 4, maxDistance: 150, rolloffFactor: 0.5, venueScale: 2.2 },
    reverb: { enabled: true, dryLevel: 1, wetLevel: 0.3, outputGain: 0.88, impulseResponse: "audio/impulse-responses/stadium.wav", lowpassHz: 6000, highpassHz: 0 }
  }
};

const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .atp-toggle {
    position: fixed; left: 12px; bottom: 12px; z-index: 2147483000;
    font: 700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #1a1a1a; color: #ccc; border: 1px solid #333; border-radius: 8px;
    padding: 9px 14px; cursor: pointer;
  }
  .atp-toggle:hover { border-color: #5b9bd5; color: #fff; }
  .atp-panel {
    position: fixed; left: 12px; bottom: 56px; width: 360px; max-height: 80vh;
    overflow-y: auto; z-index: 2147483000;
    background: rgba(13,13,13,0.97); border: 1px solid #2a2a2a; border-radius: 12px;
    padding: 14px; color: #eee; font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    display: none;
    box-shadow: 0 16px 48px rgba(0,0,0,0.55);
  }
  .atp-panel.open { display: block; }
  .atp-title { font-weight: 700; font-size: 14px; margin-bottom: 10px; letter-spacing: -0.2px; }
  .atp-tabs { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  .atp-tab {
    flex: 1 1 auto; background: #1a1a1a; border: 1px solid #2a2a2a; color: #999;
    border-radius: 6px; padding: 6px 8px; cursor: pointer; font-weight: 700; font-size: 11px; text-align: center;
  }
  .atp-tab.active { border-color: #5b9bd5; color: #8fc5ff; background: #16202b; }
  .atp-tab.venue { border-color: #f0a040; color: #ffd166; }
  .atp-tab.venue.active { background: #2b2013; }
  .atp-section { display: none; }
  .atp-section.active { display: block; }
  .atp-field { margin-bottom: 9px; }
  .atp-field label { display: flex; justify-content: space-between; margin-bottom: 3px; color: #aaa; }
  .atp-field .atp-value { color: #8fc5ff; font-family: 'SF Mono', 'Fira Code', monospace; }
  .atp-hint-icon {
    display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px;
    margin-left: 5px; border: 1px solid #444; border-radius: 50%; color: #777; font-size: 9px;
    font-weight: 700; cursor: help; vertical-align: middle;
  }
  .atp-hint-icon:hover { border-color: #5b9bd5; color: #8fc5ff; }
  .atp-tooltip {
    display: none; position: fixed; z-index: 2147483001; max-width: 260px;
    background: #14181d; border: 1px solid #5b9bd5; border-radius: 6px; padding: 8px 10px;
    color: #eee; font-size: 11px; line-height: 1.45; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    white-space: pre-line;
  }
  .atp-tooltip.open { display: block; }
  .atp-field input[type="range"] { width: 100%; accent-color: #5b9bd5; }
  .atp-field select { width: 100%; background: #1a1a1a; color: #eee; border: 1px solid #333; border-radius: 5px; padding: 5px; }
  .atp-checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
  .atp-row { display: flex; gap: 6px; margin-top: 8px; }
  .atp-btn {
    flex: 1; background: #1a1a1a; border: 1px solid #333; color: #ccc; border-radius: 6px;
    padding: 7px 8px; cursor: pointer; font-weight: 700; font-size: 11px;
  }
  .atp-btn:hover { border-color: #5b9bd5; color: #fff; }
  .atp-btn.danger { border-color: #7a2b25; color: #ffb8ae; }
  .atp-btn-sm { padding: 6px 4px; font-size: 10px; }
  .atp-readout { background: rgba(255,255,255,0.04); border: 1px solid #2a2a2a; border-radius: 6px; padding: 8px; margin-top: 6px; line-height: 1.5; }
  .atp-readout div { display: flex; justify-content: space-between; gap: 8px; }
  .atp-readout span:last-child { color: #8fc5ff; font-family: 'SF Mono', 'Fira Code', monospace; text-align: right; }
  .atp-graph { width: 100%; height: 120px; background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 6px; margin-top: 8px; }
  .atp-fv-graph { width: 100%; height: 170px; background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 6px; cursor: default; touch-action: none; margin-bottom: 4px; }
  .atp-subheading { font-weight: 800; color: #ffd166; margin: 14px 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
  .atp-preset-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
  .atp-clip-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .atp-clip-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #ccc; font-size: 11px; }
  .atp-clip-name.disabled { color: #555; text-decoration: line-through; }
  .atp-clip-volume { width: 64px; accent-color: #5b9bd5; }
  .atp-clip-volume-value { width: 30px; text-align: right; color: #8fc5ff; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 10px; flex: none; }
  .atp-icon-btn {
    flex: none; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
    background: #1a1a1a; border: 1px solid #333; color: #ccc; border-radius: 4px; cursor: pointer; font-size: 10px; padding: 0;
  }
  .atp-icon-btn:hover { border-color: #5b9bd5; color: #fff; }
  .atp-icon-btn.remove:hover { border-color: #ff6b5d; color: #ffb8ae; }
  .atp-add-clip-row { display: flex; gap: 6px; margin-top: 4px; }
  .atp-add-clip-row input { flex: 1; background: #1a1a1a; color: #eee; border: 1px solid #333; border-radius: 5px; padding: 5px 7px; font-size: 11px; }
  .atp-save-load-row { display: flex; gap: 6px; margin-bottom: 12px; }
`;

const formatNumber = (value) => (Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(1));

class FieldRenderer {
  constructor(container, getValue, setValue, wireHint) {
    this.container = container;
    this.getValue = getValue;
    this.setValue = setValue;
    this.wireHint = wireHint;
  }

  renderFields(fields) {
    fields.forEach((field) => this.renderField(field));
  }

  renderField(field) {
    const value = this.getValue(field.key);
    if (field.type === "checkbox") {
      const row = document.createElement("div");
      row.className = "atp-checkbox-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(value);
      input.addEventListener("change", () => this.setValue(field.key, input.checked));
      const label = document.createElement("label");
      label.textContent = field.label;
      if (field.hint) {
        const hintIcon = document.createElement("span");
        hintIcon.className = "atp-hint-icon";
        hintIcon.textContent = "?";
        hintIcon.tabIndex = 0;
        label.appendChild(hintIcon);
        this.wireHint(label, field.hint); // hover anywhere on the label text itself, not just the icon
        this.wireHint(hintIcon, field.hint);
      }
      row.append(input, label);
      this.container.appendChild(row);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "atp-field";
    const labelRow = document.createElement("label");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = field.label;
    if (field.hint) {
      const hintIcon = document.createElement("span");
      hintIcon.className = "atp-hint-icon";
      hintIcon.textContent = "?";
      hintIcon.tabIndex = 0;
      nameSpan.appendChild(hintIcon);
      this.wireHint(nameSpan, field.hint); // hover anywhere on the label text itself, not just the icon
      this.wireHint(hintIcon, field.hint);
    }
    const valueSpan = document.createElement("span");
    valueSpan.className = "atp-value";
    labelRow.append(nameSpan, valueSpan);
    wrapper.appendChild(labelRow);

    if (field.type === "select") {
      const select = document.createElement("select");
      field.options.forEach((opt) => {
        const optionEl = document.createElement("option");
        optionEl.value = opt;
        optionEl.textContent = opt;
        if (field.optionHints?.[opt]) optionEl.title = field.optionHints[opt];
        if (opt === value) optionEl.selected = true;
        select.appendChild(optionEl);
      });
      select.addEventListener("change", () => this.setValue(field.key, select.value));
      wrapper.appendChild(select);
      valueSpan.remove();
    } else {
      const input = document.createElement("input");
      input.type = "range";
      input.min = field.min;
      input.max = field.max;
      input.step = field.step;
      input.value = value;
      valueSpan.textContent = formatNumber(Number(value));
      input.addEventListener("input", () => {
        const num = Number(input.value);
        valueSpan.textContent = formatNumber(num);
        this.setValue(field.key, num);
      });
      wrapper.appendChild(input);
    }

    this.container.appendChild(wrapper);
  }
}

export class AudioTuningPanel {
  constructor({ settingsStore, ballAudio, getListenerPosition, onVenuePreset }) {
    this.settings = settingsStore;
    this.ballAudio = ballAudio;
    this.getListenerPosition = getListenerPosition;
    this.onVenuePreset = onVenuePreset || (() => {});

    this.host = document.createElement("div");
    this.host.id = "audio-tuning-panel-host";
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });

    this._fvHeld = { racket: null, floor: null };

    this._buildMarkup();

    // A single shared tooltip element, `position: fixed` so it always escapes the panel's own
    // `overflow-y: auto` clipping regardless of where the hovered control sits. Custom-built
    // (rather than relying on the native `title` attribute) because native tooltips impose their
    // own show delay and, in practice, weren't reliably appearing at all for every control here.
    this.tooltipEl = document.createElement("div");
    this.tooltipEl.className = "atp-tooltip";
    this.shadow.appendChild(this.tooltipEl);

    this._wireTabs();
    this._renderHitSection("racket");
    this._renderHitSection("floor");
    this._renderClipBank("racket");
    this._renderClipBank("floor");
    this._renderSpatialSection();
    this._renderReverbSection();
    this._renderPresets();
    this._wireButtons();
    this._wireVenueTuningPresets();
    this._wireClipBankAdders();
    this._wireSaveLoad();
    this._wireRecentHit();
    this._wireGraphRedraw();
    this._wireForceVolumeGraph("racket");
    this._wireForceVolumeGraph("floor");

    this.settings.subscribe(() => {
      this._redrawGraph();
      this._updateLiveReadout();
      this._redrawForceVolumeGraph("racket");
      this._redrawForceVolumeGraph("floor");
    });

    this._observer = setInterval(() => this._updateLiveReadout(), 200);
  }

  _buildMarkup() {
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <button class="atp-toggle" id="toggle">Audio Tuning</button>
      <div class="atp-panel" id="panel">
        <div class="atp-title">Audio Tuning</div>
        <div class="atp-save-load-row">
          <button class="atp-btn" id="sound-check" title="Isolated beep straight to the speakers — bypasses clips, spatial audio, and reverb entirely">🔊 Sound Check</button>
        </div>
        <div class="atp-save-load-row">
          <button class="atp-btn" id="save-json">Save Tuning JSON</button>
          <button class="atp-btn" id="load-json">Load Tuning JSON</button>
          <input type="file" id="load-json-input" accept="application/json,.json" style="display:none" />
        </div>
        <div class="atp-tabs">
          <div class="atp-tab active" data-tab="racket">Racket Hits</div>
          <div class="atp-tab" data-tab="floor">Floor Hits</div>
          <div class="atp-tab" data-tab="recent">Recent Hit</div>
          <div class="atp-tab venue" data-tab="venue">Spatial / Venue</div>
        </div>

        <div class="atp-section active" data-section="racket">
          <div class="atp-subheading">Force → Volume Mapping<span class="atp-hint-icon" id="racket-fv-hint" tabindex="0">?</span></div>
          <canvas class="atp-fv-graph" id="racket-fv-graph" width="640" height="220"></canvas>
          <div id="racket-fields"></div>
          <div class="atp-row">
            <button class="atp-btn atp-btn-sm" id="test-racket-soft">Soft</button>
            <button class="atp-btn atp-btn-sm" id="test-racket-medium">Medium</button>
            <button class="atp-btn atp-btn-sm" id="test-racket-hard">Hard</button>
          </div>
          <div class="atp-subheading">Clip Bank</div>
          <div id="racket-bank"></div>
          <div class="atp-add-clip-row">
            <input type="text" id="racket-add-clip-input" placeholder="audio/racket/new-clip.wav" />
            <button class="atp-btn" id="racket-add-clip-btn">Add</button>
          </div>
        </div>

        <div class="atp-section" data-section="floor">
          <div class="atp-subheading">Force → Volume Mapping<span class="atp-hint-icon" id="floor-fv-hint" tabindex="0">?</span></div>
          <canvas class="atp-fv-graph" id="floor-fv-graph" width="640" height="220"></canvas>
          <div id="floor-fields"></div>
          <div class="atp-row">
            <button class="atp-btn atp-btn-sm" id="test-floor-soft">Soft</button>
            <button class="atp-btn atp-btn-sm" id="test-floor-medium">Medium</button>
            <button class="atp-btn atp-btn-sm" id="test-floor-hard">Hard</button>
          </div>
          <div class="atp-subheading">Clip Bank</div>
          <div id="floor-bank"></div>
          <div class="atp-add-clip-row">
            <input type="text" id="floor-add-clip-input" placeholder="audio/floor/new-clip.wav" />
            <button class="atp-btn" id="floor-add-clip-btn">Add</button>
          </div>
        </div>

        <div class="atp-section" data-section="recent">
          <div class="atp-readout" id="recent-hit-readout">No hits yet.</div>
        </div>

        <div class="atp-section" data-section="venue">
          <div class="atp-row">
            <button class="atp-btn" id="venue-preset-small">Small / Closed Venue</button>
            <button class="atp-btn" id="venue-preset-large">Large / Open Venue</button>
          </div>
          <div class="atp-subheading">Distance → Volume Preview</div>
          <canvas class="atp-graph" id="graph" width="640" height="240"></canvas>

          <div id="spatial-fields"></div>

          <div class="atp-subheading">Live Readout</div>
          <div class="atp-readout" id="live-readout"></div>

          <div class="atp-subheading">Play Test Hit At Distance</div>
          <div class="atp-field">
            <label><span>Distance (m)</span><span class="atp-value" id="test-distance-value">10.0</span></label>
            <input type="range" id="test-distance" min="0.5" max="100" step="0.5" value="10" />
          </div>
          <div class="atp-field">
            <label>
              <span>Velocity (m/s, + toward you / − away)<span class="atp-hint-icon" id="test-velocity-hint" tabindex="0">?</span></span>
              <span class="atp-value" id="test-velocity-value">0.0</span>
            </label>
            <input type="range" id="test-velocity" min="-20" max="20" step="0.5" value="0" />
          </div>
          <div class="atp-row">
            <button class="atp-btn" id="test-racket-distance">Play Racket @ Distance</button>
            <button class="atp-btn" id="test-floor-distance">Play Floor @ Distance</button>
          </div>

          <div class="atp-subheading">Presets</div>
          <div class="atp-preset-grid" id="presets"></div>

          <div class="atp-subheading">Reverb / Ambience</div>
          <div id="reverb-fields"></div>

          <div class="atp-row">
            <button class="atp-btn danger" id="reset-spatial">Reset Spatial Only</button>
          </div>
        </div>

        <div class="atp-row">
          <button class="atp-btn danger" id="reset-all">Reset All To Defaults</button>
        </div>
      </div>
    `;
  }

  _wireTabs() {
    const tabs = this.shadow.querySelectorAll(".atp-tab");
    const sections = this.shadow.querySelectorAll(".atp-section");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        sections.forEach((s) => s.classList.remove("active"));
        tab.classList.add("active");
        this.shadow.querySelector(`.atp-section[data-section="${tab.dataset.tab}"]`).classList.add("active");
      });
    });

    this.shadow.querySelector("#toggle").addEventListener("click", () => {
      this.shadow.querySelector("#panel").classList.toggle("open");
    });
  }

  _renderHitSection(category) {
    const container = this.shadow.querySelector(`#${category}-fields`);
    const renderer = new FieldRenderer(
      container,
      (key) => this.settings.get()[category][key],
      (key, value) => this.settings.set({ [category]: { [key]: value } }),
      (el, hint) => this._wireHint(el, hint)
    );
    renderer.renderFields(HIT_FIELDS);
  }

  _renderSpatialSection() {
    const container = this.shadow.querySelector("#spatial-fields");
    const renderer = new FieldRenderer(
      container,
      (key) => this.settings.get().spatial[key],
      (key, value) => this.settings.set({ spatial: { [key]: value } }),
      (el, hint) => this._wireHint(el, hint)
    );
    renderer.renderFields(SPATIAL_FIELDS);
  }

  _renderReverbSection() {
    const container = this.shadow.querySelector("#reverb-fields");
    const renderer = new FieldRenderer(
      container,
      (key) => this.settings.get().reverb[key],
      (key, value) => this.settings.set({ reverb: { [key]: value } }),
      (el, hint) => this._wireHint(el, hint)
    );
    renderer.renderFields(REVERB_FIELDS);
  }

  // Shows/hides the shared tooltip on hover (mouse) and focus (keyboard) — instant, no native
  // show delay — anchored to whichever element triggered it, flipping above if it would
  // otherwise run off the bottom of the viewport.
  _wireHint(el, hint) {
    const show = () => this._showTooltip(el, hint);
    const hide = () => this._hideTooltip();
    el.addEventListener("mouseenter", show);
    el.addEventListener("mouseleave", hide);
    el.addEventListener("focus", show);
    el.addEventListener("blur", hide);
  }

  _showTooltip(anchorEl, text) {
    const tooltip = this.tooltipEl;
    tooltip.textContent = text;
    tooltip.classList.add("open");

    const rect = anchorEl.getBoundingClientRect();
    const margin = 8;
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = clamp(rect.left, margin, window.innerWidth - tooltipRect.width - margin);
    let top = rect.bottom + margin;
    if (top + tooltipRect.height > window.innerHeight - margin) top = rect.top - tooltipRect.height - margin;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
  }

  _hideTooltip() {
    this.tooltipEl.classList.remove("open");
  }

  // Same popover as _showTooltip(), but anchored to an explicit point (the mouse position over
  // a canvas dot) rather than an element's bounding box.
  _showTooltipAtPoint(clientX, clientY, text) {
    const tooltip = this.tooltipEl;
    tooltip.textContent = text;
    tooltip.classList.add("open");

    const margin = 8;
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = clamp(clientX - tooltipRect.width / 2, margin, window.innerWidth - tooltipRect.width - margin);
    let top = clientY + 16;
    if (top + tooltipRect.height > window.innerHeight - margin) top = clientY - tooltipRect.height - 16;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
  }

  // Unlike _renderPresets()'s SPATIAL_PRESETS (spatial only), these set spatial + reverb
  // together — a coarse "what kind of place is this" starting point, not a fine-tuned preset.
  _wireVenueTuningPresets() {
    const smallBtn = this.shadow.querySelector("#venue-preset-small");
    const largeBtn = this.shadow.querySelector("#venue-preset-large");
    this._wireHint(smallBtn, "A small enclosed room: reflections arrive fast and loud, and there's no room for a long decay tail — but sound still carries at a natural, un-steepened rate within the room's short range.");
    this._wireHint(largeBtn, "A big open-air venue: sound carries much further before fading, with a long, sparse, spacious tail instead of tight slap-back.");

    smallBtn.addEventListener("click", () => {
      this.settings.set(VENUE_TUNING_PRESETS["Small / Closed Venue"]);
      this.onVenuePreset("small");
      this._refreshAllFields();
    });
    largeBtn.addEventListener("click", () => {
      this.settings.set(VENUE_TUNING_PRESETS["Large / Open Venue"]);
      this.onVenuePreset("large");
      this._refreshAllFields();
    });
  }

  _renderPresets() {
    const grid = this.shadow.querySelector("#presets");
    this.settings.presetNames.forEach((name) => {
      const button = document.createElement("button");
      button.className = "atp-btn";
      button.textContent = name;
      button.addEventListener("click", () => {
        this.settings.applyPreset(name);
        this._refreshAllFields();
      });
      grid.appendChild(button);
    });
  }

  _refreshAllFields() {
    // Cheapest correct way to reflect a preset/reset/load across every rendered control.
    ["racket-fields", "floor-fields", "spatial-fields", "reverb-fields"].forEach((id) => {
      this.shadow.querySelector(`#${id}`).innerHTML = "";
    });
    this._renderHitSection("racket");
    this._renderHitSection("floor");
    this._renderClipBank("racket");
    this._renderClipBank("floor");
    this._renderSpatialSection();
    this._renderReverbSection();
    this._redrawGraph();
    this._redrawForceVolumeGraph("racket");
    this._redrawForceVolumeGraph("floor");
  }

  // One row per bank entry: filename, an audition ▶ button, a per-clip volume slider, an
  // enabled checkbox, and a remove ✕ — everything the "audit / adjust volume / disable / add"
  // ask needs, backed directly by AudioSettingsStore.updateClip/removeClip.
  _renderClipBank(category) {
    const container = this.shadow.querySelector(`#${category}-bank`);
    container.innerHTML = "";
    const clips = this.settings.get()[category].clips;

    clips.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "atp-clip-row";

      const playBtn = document.createElement("button");
      playBtn.className = "atp-icon-btn";
      playBtn.textContent = "▶";
      playBtn.title = "Audition this clip";
      playBtn.addEventListener("click", () => this.ballAudio.previewClip(category, entry.url));

      const name = document.createElement("span");
      name.className = entry.enabled ? "atp-clip-name" : "atp-clip-name disabled";
      name.textContent = entry.url.split("/").pop();
      name.title = entry.url;

      const volumeInput = document.createElement("input");
      volumeInput.type = "range";
      volumeInput.className = "atp-clip-volume";
      volumeInput.min = 0;
      volumeInput.max = 2;
      volumeInput.step = 0.05;
      volumeInput.value = entry.volume;

      const volumeValue = document.createElement("span");
      volumeValue.className = "atp-clip-volume-value";
      volumeValue.textContent = entry.volume.toFixed(2);
      volumeInput.addEventListener("input", () => {
        const value = Number(volumeInput.value);
        volumeValue.textContent = value.toFixed(2);
        this.settings.updateClip(category, index, { volume: value });
      });

      const enabledCheckbox = document.createElement("input");
      enabledCheckbox.type = "checkbox";
      enabledCheckbox.checked = entry.enabled;
      enabledCheckbox.title = "Enabled (included in random selection)";
      enabledCheckbox.addEventListener("change", () => {
        this.settings.updateClip(category, index, { enabled: enabledCheckbox.checked });
        name.className = enabledCheckbox.checked ? "atp-clip-name" : "atp-clip-name disabled";
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "atp-icon-btn remove";
      removeBtn.textContent = "✕";
      removeBtn.title = "Remove from bank";
      removeBtn.addEventListener("click", () => {
        this.settings.removeClip(category, index);
        this._renderClipBank(category);
      });

      row.append(playBtn, name, volumeInput, volumeValue, enabledCheckbox, removeBtn);
      container.appendChild(row);
    });
  }

  _wireClipBankAdders() {
    for (const category of ["racket", "floor"]) {
      const input = this.shadow.querySelector(`#${category}-add-clip-input`);
      const button = this.shadow.querySelector(`#${category}-add-clip-btn`);
      const add = () => {
        if (!input.value.trim()) return;
        this.settings.addClip(category, input.value.trim());
        input.value = "";
        this._renderClipBank(category);
      };
      button.addEventListener("click", add);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") add();
      });
    }
  }

  _wireSaveLoad() {
    this.shadow.querySelector("#sound-check").addEventListener("click", async () => {
      const button = this.shadow.querySelector("#sound-check");
      const result = await this.ballAudio.playSoundCheck();
      button.textContent = `🔊 Sound Check (context: ${result.contextState})`;
      setTimeout(() => { button.textContent = "🔊 Sound Check"; }, 2000);
    });

    this.shadow.querySelector("#save-json").addEventListener("click", () => {
      const blob = new Blob([this.settings.toJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tennis-rally-audio-tuning-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });

    const fileInput = this.shadow.querySelector("#load-json-input");
    this.shadow.querySelector("#load-json").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        this.settings.fromJSON(await file.text());
        this._refreshAllFields();
      } catch (error) {
        console.warn("[AudioTuningPanel] Could not load tuning JSON:", error);
      }
      fileInput.value = "";
    });
  }

  _wireButtons() {
    for (const category of ["racket", "floor"]) {
      for (const intensity of ["soft", "medium", "hard"]) {
        this.shadow
          .querySelector(`#test-${category}-${intensity}`)
          .addEventListener("click", () => this.ballAudio.playTestHit(category, 6, intensity));
      }
    }

    const distanceInput = this.shadow.querySelector("#test-distance");
    const distanceValue = this.shadow.querySelector("#test-distance-value");
    distanceInput.addEventListener("input", () => {
      distanceValue.textContent = Number(distanceInput.value).toFixed(1);
    });
    const velocityInput = this.shadow.querySelector("#test-velocity");
    const velocityValue = this.shadow.querySelector("#test-velocity-value");
    this._wireHint(
      this.shadow.querySelector("#test-velocity-hint"),
      "Sets the test hit's closing speed toward the listener directly, for isolated Doppler testing. Positive = the source is approaching (pitch rises); negative = it's receding (pitch drops); 0 = no radial motion, no shift."
    );
    velocityInput.addEventListener("input", () => {
      velocityValue.textContent = Number(velocityInput.value).toFixed(1);
    });
    this.shadow.querySelector("#test-racket-distance").addEventListener("click", () => {
      this.ballAudio.playTestHit("racket", Number(distanceInput.value), "medium", Number(velocityInput.value));
    });
    this.shadow.querySelector("#test-floor-distance").addEventListener("click", () => {
      this.ballAudio.playTestHit("floor", Number(distanceInput.value), "medium", Number(velocityInput.value));
    });

    this.shadow.querySelector("#reset-spatial").addEventListener("click", () => {
      this.settings.resetSpatialOnly();
      this._refreshAllFields();
    });
    this.shadow.querySelector("#reset-all").addEventListener("click", () => {
      this.settings.resetAll();
      this._refreshAllFields();
    });
  }

  // Force axis: 0..FORCE_AXIS_MAX mapped left-to-right. Volume axis: 0..1 mapped bottom-to-top
  // (canvas Y grows downward, so volume 1 is near the top). Shared by _fvFromPixel (inverse) so
  // dragging and drawing always agree on the same coordinate mapping.
  _fvToPixel(canvas, force, volume) {
    const { width, height } = canvas;
    const { left, right, top, bottom } = FV_GRAPH_PAD;
    const x = left + (clamp(force, 0, FORCE_AXIS_MAX) / FORCE_AXIS_MAX) * (width - left - right);
    const y = top + (1 - clamp(volume, 0, 1)) * (height - top - bottom);
    return { x, y };
  }

  _fvFromPixel(canvas, pos) {
    const { width, height } = canvas;
    const { left, right, top, bottom } = FV_GRAPH_PAD;
    const force = clamp(((pos.x - left) / (width - left - right)) * FORCE_AXIS_MAX, 0, FORCE_AXIS_MAX);
    const volume = clamp(1 - (pos.y - top) / (height - top - bottom), 0, 1);
    return { force, volume };
  }

  // Drag-to-edit for the two (forceMin,volumeMin)/(forceMax,volumeMax) points that define the
  // linear force→volume ramp — replaces what used to be four separate sliders. The cursor stays
  // normal until it's within FV_HIT_RADIUS of a point, then switches to a pointer/grab hand and
  // pops up its exact force/volume readout — while dragging, the same popover just follows along.
  _wireForceVolumeGraph(category) {
    const canvas = this.shadow.querySelector(`#${category}-fv-graph`);
    this._wireHint(
      this.shadow.querySelector(`#${category}-fv-hint`),
      `"Force" is a weighted blend of impact speeds (${category === "racket" ? "racket/ball closing speed and each one's own speed" : "bounce vertical speed and total speed"}), in meters/second — not a true physical force. Hover or drag either point to see/change its exact values.`
    );

    const canvasPos = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
      };
    };
    const hitTest = (pos) => {
      const { forceMin, volumeMin, forceMax, volumeMax } = this.settings.get()[category];
      const minPx = this._fvToPixel(canvas, forceMin, volumeMin);
      const maxPx = this._fvToPixel(canvas, forceMax, volumeMax);
      const distMin = Math.hypot(pos.x - minPx.x, pos.y - minPx.y);
      const distMax = Math.hypot(pos.x - maxPx.x, pos.y - maxPx.y);
      if (distMin <= FV_HIT_RADIUS && distMin <= distMax) return "min";
      if (distMax <= FV_HIT_RADIUS) return "max";
      return null;
    };
    const applyDrag = (point, pos) => {
      const { force, volume } = this._fvFromPixel(canvas, pos);
      if (point === "min") this.settings.set({ [category]: { forceMin: force, volumeMin: volume } });
      else this.settings.set({ [category]: { forceMax: force, volumeMax: volume } });
    };
    const showPointTooltip = (point, event) => {
      const { forceMin, volumeMin, forceMax, volumeMax } = this.settings.get()[category];
      const force = point === "min" ? forceMin : forceMax;
      const volume = point === "min" ? volumeMin : volumeMax;
      this._showTooltipAtPoint(event.clientX, event.clientY, `Force: ${force.toFixed(2)} m/s\nVolume: ${volume.toFixed(3)}`);
    };

    canvas.addEventListener("pointerdown", (event) => {
      const point = hitTest(canvasPos(event));
      if (!point) return;
      canvas.setPointerCapture(event.pointerId);
      this._fvHeld[category] = point;
      canvas.style.cursor = "grabbing";
      applyDrag(point, canvasPos(event));
      showPointTooltip(point, event);
      this._redrawForceVolumeGraph(category);
    });
    canvas.addEventListener("pointermove", (event) => {
      const held = this._fvHeld[category];
      if (held != null) {
        applyDrag(held, canvasPos(event));
        showPointTooltip(held, event);
        return;
      }
      const point = hitTest(canvasPos(event));
      canvas.style.cursor = point ? "pointer" : "default";
      if (point) showPointTooltip(point, event);
      else this._hideTooltip();
    });
    const release = () => {
      if (this._fvHeld[category] == null) return;
      this._fvHeld[category] = null;
      canvas.style.cursor = "default";
      this._hideTooltip();
      this._redrawForceVolumeGraph(category);
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointerleave", () => {
      if (this._fvHeld[category] == null) {
        canvas.style.cursor = "default";
        this._hideTooltip();
      }
    });

    this._redrawForceVolumeGraph(category);
  }

  _redrawForceVolumeGraph(category) {
    const canvas = this.shadow.querySelector(`#${category}-fv-graph`);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const { left, right, top, bottom } = FV_GRAPH_PAD;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = top + ((height - top - bottom) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(width - right, y);
      ctx.stroke();
    }

    const { forceMin, volumeMin, forceMax, volumeMax } = this.settings.get()[category];

    // The exact piecewise-linear shape mapForceToVolume() computes: flat at volumeMin below
    // forceMin, linear ramp between the two points, flat at volumeMax above forceMax.
    ctx.strokeStyle = "#5b9bd5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    [
      this._fvToPixel(canvas, 0, volumeMin),
      this._fvToPixel(canvas, forceMin, volumeMin),
      this._fvToPixel(canvas, forceMax, volumeMax),
      this._fvToPixel(canvas, FORCE_AXIS_MAX, volumeMax)
    ].forEach((pos, i) => (i === 0 ? ctx.moveTo(pos.x, pos.y) : ctx.lineTo(pos.x, pos.y)));
    ctx.stroke();

    ctx.fillStyle = "#666";
    ctx.font = "10px monospace";
    ctx.fillText("0", left - 2, height - bottom + 14);
    ctx.fillText(`${FORCE_AXIS_MAX} m/s`, width - right - 30, height - bottom + 14);
    ctx.fillText("Force (m/s)", width / 2 - 26, height - 4);
    ctx.fillText("1.0", 2, top + 8);
    ctx.fillText("0.0", 2, height - bottom + 2);

    const drawPoint = (force, volume, color, held) => {
      const pos = this._fvToPixel(canvas, force, volume);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, held ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0a0a0a";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawPoint(forceMin, volumeMin, "#5b9bd5", this._fvHeld[category] === "min");
    drawPoint(forceMax, volumeMax, "#f0a040", this._fvHeld[category] === "max");
  }

  _wireRecentHit() {
    this.ballAudio.onDebugInfo((hit) => {
      const readout = this.shadow.querySelector("#recent-hit-readout");
      this._setReadoutRows(readout, [
        { label: "Type", value: hit.type, hint: "Whether this was a racket swing (racket-hit) or a ball bounce off the court (floor-hit)." },
        {
          label: "Force",
          value: `${hit.force.toFixed(2)} m/s equiv.`,
          hint: "The computed impact intensity — a weighted blend of speeds, not a true physical force. This is the X axis of the Force → Volume Mapping graph."
        },
        {
          label: "Mapped Volume",
          value: hit.volume.toFixed(3),
          hint: "Volume (0–1 fraction) after force→volume mapping, random jitter, and category/global gain — before per-voice headroom compensation."
        },
        {
          label: "Played Volume",
          value: hit.playedVolume.toFixed(3),
          hint: "The actual gain (0–1 fraction) sent to this voice — Mapped Volume further scaled by per-voice headroom compensation (quieter when several hits overlap) and the clip's own per-clip volume."
        },
        {
          label: "Ball Speed",
          value: `${hit.ballSpeed.toFixed(2)} m/s`,
          hint: "The ball's speed at this instant — its real post-hit shot speed for a racket-hit, or its post-bounce speed for a floor-hit."
        },
        {
          label: "Racket Speed",
          value: hit.racketSpeed !== null ? `${hit.racketSpeed.toFixed(2)} m/s` : "—",
          hint: "The racket's swing speed at contact — only present for racket-hit sounds."
        },
        {
          label: "Doppler Shift",
          value: `${hit.doppler.toFixed(4)} ×`,
          hint: "The pitch multiplier from the racket's motion toward/away from you — above 1× means it's approaching (higher pitch), below 1× means it's receding (lower pitch)."
        },
        { label: "Clip", value: hit.clipName, hint: "Which audio file was picked for this hit, chosen at random from that category's enabled clips." },
        {
          label: "Position",
          value: `${hit.position.x.toFixed(2)}, ${hit.position.y.toFixed(2)}, ${hit.position.z.toFixed(2)} m`,
          hint: "Where this sound was placed in 3D space (x, y, z in meters) — the racket's contact point for a racket-hit, the court surface point for a floor-hit."
        },
        {
          label: "Distance To Listener",
          value: `${hit.distance.toFixed(2)} m`,
          hint: "Straight-line distance from the sound's position to the camera at the moment of the hit."
        },
        {
          label: "Attenuation",
          value: `${hit.attenuation.toFixed(3)} (1=full vol, 0=silent)`,
          hint: "How much the distance model reduces volume at this distance — the same math the Distance → Volume Preview graph plots, evaluated for this actual hit."
        }
      ]);
    });
  }

  // Rebuilds a readout container's rows from scratch, wiring a hover/focus hint on each label
  // that has one. Only used where rows rebuild on discrete events (a hit), not on a timer —
  // rewiring listeners on every tick of a fast interval would be wasteful.
  _setReadoutRows(container, specs) {
    container.innerHTML = "";
    for (const { label, value, hint } of specs) {
      const rowEl = document.createElement("div");
      const labelSpan = document.createElement("span");
      labelSpan.textContent = label;
      if (hint) {
        const hintIcon = document.createElement("span");
        hintIcon.className = "atp-hint-icon";
        hintIcon.textContent = "?";
        hintIcon.tabIndex = 0;
        labelSpan.appendChild(hintIcon);
        this._wireHint(labelSpan, hint);
        this._wireHint(hintIcon, hint);
      }
      const valueSpan = document.createElement("span");
      valueSpan.textContent = value;
      rowEl.append(labelSpan, valueSpan);
      container.appendChild(rowEl);
    }
  }

  _wireGraphRedraw() {
    this._redrawGraph();
  }

  _redrawGraph() {
    const canvas = this.shadow.querySelector("#graph");
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    const spatial = this.settings.get().spatial;
    const maxPlotDistance = Math.max(spatial.maxDistance, spatial.minDistance * 4, 10);

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#5b9bd5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const samples = 128;
    for (let i = 0; i <= samples; i++) {
      const distance = (i / samples) * maxPlotDistance;
      const attenuation = computeAttenuation(distance, spatial);
      const x = (i / samples) * width;
      const y = height - Math.min(1, Math.max(0, attenuation)) * (height - 6) - 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "#666";
    ctx.font = "10px monospace";
    ctx.fillText("0m", 4, height - 4);
    ctx.fillText(`${maxPlotDistance.toFixed(0)}m`, width - 34, height - 4);
    ctx.fillText("1.0", 4, 12);
    ctx.fillText("0.0", 4, height - 10);
  }

  _updateLiveReadout() {
    const readout = this.shadow.querySelector("#live-readout");
    const listenerPos = this.getListenerPosition();
    const hit = this.ballAudio.lastHit;
    const spatial = this.settings.get().spatial;

    const listenerStr = listenerPos ? `${listenerPos.x.toFixed(2)}, ${listenerPos.y.toFixed(2)}, ${listenerPos.z.toFixed(2)}` : "—";
    const impactDistance = hit ? hit.distance : null;
    const scaledDistance = impactDistance !== null ? impactDistance * spatial.venueScale : null;
    const attenuation = hit ? hit.attenuation : null;
    const finalVolume = hit ? hit.playedVolume : null;
    const closingSpeed = hit ? hit.closingSpeed : null;
    const doppler = hit ? hit.doppler : null;

    readout.innerHTML = [
      row("Listener Position", listenerStr),
      row("Latest Impact Distance", impactDistance !== null ? `${impactDistance.toFixed(2)} m` : "—"),
      row("Scaled Audio Distance", scaledDistance !== null ? `${scaledDistance.toFixed(2)} m` : "—"),
      row("Attenuation (1=full vol, 0=silent)", attenuation !== null ? attenuation.toFixed(3) : "—"),
      row("Final Volume", finalVolume !== null ? finalVolume.toFixed(3) : "—"),
      row("Velocity To Listener (+ approaching)", closingSpeed !== null ? `${closingSpeed.toFixed(2)} m/s` : "—"),
      row("Doppler Shift (pitch ×)", doppler !== null ? doppler.toFixed(4) : "—")
    ].join("");
  }

  dispose() {
    clearInterval(this._observer);
    this.host.remove();
  }
}

const row = (label, value) => `<div><span>${label}</span><span>${value}</span></div>`;

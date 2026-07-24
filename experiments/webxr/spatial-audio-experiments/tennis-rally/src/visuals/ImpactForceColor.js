import { Color3 } from "@babylonjs/core";
import { racketForce, floorForce, mapForceToVolume, mapSpinToVolumeAdjust } from "../audio/BallAudio.js";
import { clamp } from "../utils/math.js";

// A high-vis green/yellow/red progression, coldest (weakest hit) to hottest (hardest hit) —
// discrete bands rather than a smooth gradient, so a glance at the ball tells you roughly how
// hard the last hit was without needing to read the Debug log's numbers.
// Exported so ui/ForceColorKey.js can render a legend from this exact same palette instead of
// duplicating it.
export const COLOR_BANDS = [
  new Color3(0.2, 0.9, 0.25), // green
  new Color3(0.95, 0.9, 0.15), // yellow
  new Color3(1.0, 0.15, 0.1) // hot red
];

// Real recorded/procedural hits almost never land in the bottom half of a category's full
// [min, max] range (that headroom exists so the volume ramp doesn't clip, not because hits that
// soft actually occur) — with bands spread evenly across the whole range, the bottom bands were
// dead space nothing ever reached. Folding everything below this fraction into the coldest band,
// and spreading COLOR_BANDS only across the remainder, means a normal rally actually cycles
// through every band instead of camping in the hottest one or two. Applies the same way whether
// the value being banded is force or its mapped volume — see computeImpactColor below.
const LOW_VALUE_FLOOR_T = 0.5;

// Exported so ui/DebugUI.js and ui/AudioTuningPanel.js's graph shading use this exact same
// mapping — generic over whatever scalar (force OR volume) and range it's given.
export const forceToColor = (value, min, max) => {
  const span = max - min || 1;
  const rawT = clamp((value - min) / span, 0, 1);
  const t = clamp((rawT - LOW_VALUE_FLOOR_T) / (1 - LOW_VALUE_FLOOR_T), 0, 1);
  const bandIndex = Math.min(COLOR_BANDS.length - 1, Math.floor(t * COLOR_BANDS.length));
  return COLOR_BANDS[bandIndex];
};

// The single place that turns a racket-hit/floor-hit event into a color, in either mode:
// "force" bands the raw impact force (racketForce()/floorForce()) over [forceMin, forceMax];
// "volume" bands the mapped playback volume (BallAudio's own mapForceToVolume()) over
// [volumeMin, volumeMax] instead — same event, same category settings, different axis. Shared by
// ImpactForceColor (the ball itself) and DebugUI's log swatches so both always agree.
export const computeImpactColor = (event, category, categorySettings, mode) => {
  const force = category === "racket" ? racketForce(event) : floorForce(event);
  if (mode === "volume") {
    let volume = mapForceToVolume(force, categorySettings);
    // Matches BallAudio.js's own _handleImpact() exactly, so this never shows a color that
    // doesn't match what's actually audible for a spin-adjusted racket hit.
    if (category === "racket") volume += mapSpinToVolumeAdjust(event.racket.spinRpm ?? 0, categorySettings);
    volume = clamp(volume, categorySettings.volumeMin, categorySettings.volumeMax);
    return forceToColor(volume, categorySettings.volumeMin, categorySettings.volumeMax);
  }
  return forceToColor(force, categorySettings.forceMin, categorySettings.forceMax);
};

// Recolors the ball on every racket-hit/floor-hit to a high-vis cold->hot band reflecting that
// hit's force (or its mapped volume — see colorModeStore), using the exact same tuned settings
// BallAudio.js already maps to volume, so "how loud" and "how colored" agree. Resolves the
// currently-active ball mesh at event time (rather than being handed a fixed mesh reference up
// front) so it works unmodified across a Random Play / Replay Loop mode switch, including before
// ReplayBallController even exists yet.
export class ImpactForceColor {
  constructor({ eventBus, settingsStore, colorModeStore, simulation }) {
    this.settings = settingsStore;
    this.colorMode = colorModeStore;
    this.simulation = simulation;
    this._unsubscribe = eventBus.onAny((event) => {
      if (event.type === "racket-hit" || event.type === "floor-hit") this._handleImpact(event);
    });
  }

  _handleImpact(event) {
    const category = event.type === "racket-hit" ? "racket" : "floor";
    const categorySettings = this.settings.get()[category];
    const color = computeImpactColor(event, category, categorySettings, this.colorMode.mode);

    const mesh = this.simulation.mode === "replay" ? this.simulation.replayBall?.mesh : this.simulation.ball.mesh;
    if (!mesh?.material) return;
    mesh.material.diffuseColor = color;
    mesh.material.emissiveColor = color.scale(0.5);
  }

  dispose() {
    this._unsubscribe();
  }
}

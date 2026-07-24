import { Engine, Scene } from "@babylonjs/core";
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/core/XR/webXRDefaultExperience";
// Side-effect import: registers the v2 audio engine factory on AbstractEngine. Without it,
// `AbstractEngine.audioEngine` (and its .audioContext, which BallAudio's raw Web Audio nodes
// are built against) is never created.
import "@babylonjs/core/Audio/audioEngine";

import { TennisSimulation } from "./core/TennisSimulation.js";
import { SpectatorRig } from "./camera/SpectatorRig.js";
import { XrManager } from "./xr/XrManager.js";
import { AudioSettingsStore } from "./audio/AudioSettingsStore.js";
import { ReverbBus } from "./audio/ReverbBus.js";
import { BallAudio } from "./audio/BallAudio.js";
import { AudioTuningPanel } from "./ui/AudioTuningPanel.js";
import { DebugUI } from "./ui/DebugUI.js";
import { MuteToggle } from "./ui/MuteToggle.js";
import { PauseToggle } from "./ui/PauseToggle.js";
import { GestureHints } from "./ui/GestureHints.js";
import { DocsLink } from "./ui/DocsLink.js";
import { PlaybackModeSelector } from "./ui/PlaybackModeSelector.js";
import { VenueQuickSelect } from "./ui/VenueQuickSelect.js";
import { ImpactForceColor } from "./visuals/ImpactForceColor.js";
import { ColorModeStore } from "./visuals/ColorModeStore.js";
import { ForceColorKey } from "./ui/ForceColorKey.js";
import { AudioUnlock } from "./audio/AudioUnlock.js";

const MAX_DT = 1 / 15;

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true, { stencil: true, audioEngine: true }, true);
const scene = new Scene(engine);

const simulation = new TennisSimulation(scene);
const rig = new SpectatorRig(scene, canvas, { courtCenter: simulation.courtCenter });
// Exposed for troubleshooting, same spirit as __tennisAudioDebug below.
window.__tennisSimDebug = simulation;

// Hoisted above DebugUI (rather than created inside setupAudio()) because DebugUI's impact log
// needs it to color-code entries by force — and building the store itself has no Web Audio
// dependency, so this doesn't have to wait for setupAudio()'s audio-availability check.
// AudioSettingsStore's constructor already seeds both venues' baked-in defaults and starts on
// "small" (matching CourtBuilder's own default venue geometry) — no extra setup needed here.
const settingsStore = new AudioSettingsStore();
// Whether the ball/trail/log/graph color bands are computed from raw force or mapped volume —
// a shared visualization preference, not a per-venue audio setting (see ColorModeStore.js).
const colorModeStore = new ColorModeStore();

const debugUI = new DebugUI({
  eventBus: simulation.eventBus,
  settingsStore,
  colorModeStore,
  onToggle: (key, value) => simulation.setDebugVisibility(key, value),
  onResetView: () => rig.resetView()
});
Object.entries(debugUI.state).forEach(([key, value]) => simulation.setDebugVisibility(key, value));

const setupAudio = () => {
  const audioEngine = Engine.audioEngine;
  if (!audioEngine?.audioContext) {
    console.warn("[tennis-rally] Web Audio unavailable — running without sound.");
    return null;
  }
  const audioContext = audioEngine.audioContext;

  // Babylon's own legacy AudioEngine wrapper hardcodes resumeOnInteraction: false internally
  // (see AudioUnlock.js's comment) — nothing in Babylon itself resumes this context on a click,
  // drag, or keypress, so this project has to do it explicitly. The visible "audio is off"
  // affordance is the Mute button itself (defaults to muted — see MuteToggle below), not a
  // separate banner, so there's exactly one prompt instead of two competing ones.
  new AudioUnlock(audioContext);

  const compressor = audioContext.createDynamicsCompressor();
  // A dedicated mute gain, downstream of everything (hit sounds, reverb, the sound-check
  // beep). Muting this way — rather than audioContext.suspend() — matters because
  // AudioUnlock.js's own resume-on-gesture listener would otherwise silently un-mute a
  // suspended context on the next unrelated interaction.
  const masterMuteGain = audioContext.createGain();
  compressor.connect(masterMuteGain);
  masterMuteGain.connect(audioContext.destination);

  const reverbBus = new ReverbBus(audioContext, compressor);
  void reverbBus.applySettings(settingsStore.get().reverb);
  settingsStore.subscribe((settings) => void reverbBus.applySettings(settings.reverb));

  const ballAudio = new BallAudio(scene, {
    eventBus: simulation.eventBus,
    settingsStore,
    reverbBus,
    audioContext,
    masterDestination: masterMuteGain
  });

  // Shared by both venue widgets (passed as onVenuePreset to each) so there's exactly one place
  // that knows everything a venue switch needs to do: tell AudioSettingsStore which venue's
  // settings are now live (each venue keeps its own independently-editable copy — see
  // AudioSettingsStore.js), swap the court's visual geometry, re-render AudioTuningPanel's
  // fields (selectVenue() just swapped in a whole different settings object), and keep both
  // widgets' active highlight in agreement regardless of which one was actually clicked.
  // audioTuningPanel/venueQuickSelect are declared just below — safe to reference here since
  // this callback only ever runs on a later button click, by which point both already exist.
  const setVenuePreset = (preset) => {
    settingsStore.selectVenue(preset);
    simulation.court.setVenuePreset(preset);
    audioTuningPanel.setActiveVenue(preset);
    audioTuningPanel.refreshFields();
    venueQuickSelect.setActiveVenue(preset);
  };

  const audioTuningPanel = new AudioTuningPanel({
    settingsStore,
    ballAudio,
    colorModeStore,
    getListenerPosition: () => scene.activeCamera?.position,
    onVenuePreset: setVenuePreset
  });

  // A lower-left shortcut for AudioTuningPanel's own venue buttons (see VenueQuickSelect.js).
  const venueQuickSelect = new VenueQuickSelect({ onVenuePreset: setVenuePreset });

  new ImpactForceColor({ eventBus: simulation.eventBus, settingsStore, colorModeStore, simulation });

  // Exposed for troubleshooting ("why is there no sound") — not used by the app itself.
  window.__tennisAudioDebug = { audioEngine, audioContext, compressor, masterMuteGain, reverbBus, settingsStore, ballAudio };

  return {
    setMuted: (muted) => {
      masterMuteGain.gain.value = muted ? 0 : 1;
      // Unmuting is this app's designated "enable audio" gesture (see MuteToggle.js) — make sure
      // a still-suspended context (AudioUnlock.js's listener may not have fired yet) actually
      // starts right away instead of the first hit silently going nowhere.
      if (!muted && audioContext.state === "suspended") void audioContext.resume();
    }
  };
};

const audioHandle = setupAudio();
if (audioHandle) {
  new MuteToggle({ onToggle: audioHandle.setMuted, initialMuted: true });
}

new PauseToggle({ onToggle: (paused) => simulation.setPaused(paused), initialPaused: false });
new PlaybackModeSelector({ onChange: (mode) => simulation.setPlaybackMode(mode), initialMode: "replay" });
void simulation.setPlaybackMode("replay"); // matches the selector's initialMode — actually switches the sim, not just the UI's visual state
new GestureHints();
new ForceColorKey({ colorModeStore });
new DocsLink({ href: "./tennis-audio-physics.html", label: "Physics →", title: "Theory and math behind this simulation's spatial audio", bottom: 56 });
new DocsLink({ href: "./porting.html", label: "Porting →", title: "Guidance for porting this spatial audio pipeline to other platforms", bottom: 12 });

const setupXR = async () => {
  try {
    const xrHelper = await scene.createDefaultXRExperienceAsync({
      disableTeleportation: true,
      floorMeshes: [simulation.court.ground]
    });
    if (!xrHelper?.baseExperience) return;
    rig.setXrManager(new XrManager(xrHelper));
  } catch (error) {
    console.info("[tennis-rally] WebXR not available in this browser/device — continuing in desktop mode.", error);
  }
};

void setupXR();

window.addEventListener("resize", () => engine.resize());

engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, MAX_DT);
  rig.update(dt);
  simulation.update(dt);
  scene.render();
});

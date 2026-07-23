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
import { AudioTuningPanel, VENUE_TUNING_PRESETS } from "./ui/AudioTuningPanel.js";
import { DebugUI } from "./ui/DebugUI.js";
import { MuteToggle } from "./ui/MuteToggle.js";
import { PauseToggle } from "./ui/PauseToggle.js";
import { GestureHints } from "./ui/GestureHints.js";

const MAX_DT = 1 / 15;

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true, { stencil: true, audioEngine: true }, true);
const scene = new Scene(engine);

const simulation = new TennisSimulation(scene);
const rig = new SpectatorRig(scene, canvas, { courtCenter: simulation.courtCenter });
// Exposed for troubleshooting, same spirit as __tennisAudioDebug below.
window.__tennisSimDebug = simulation;

const debugUI = new DebugUI({
  eventBus: simulation.eventBus,
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
  const compressor = audioContext.createDynamicsCompressor();
  // A dedicated mute gain, downstream of everything (hit sounds, reverb, the sound-check
  // beep). Muting this way — rather than audioContext.suspend() — matters because Babylon's
  // own engine actively resumes the context on user interaction (resumeOnInteraction), which
  // would silently un-mute a suspended context on the next unrelated click.
  const masterMuteGain = audioContext.createGain();
  compressor.connect(masterMuteGain);
  masterMuteGain.connect(audioContext.destination);

  const reverbBus = new ReverbBus(audioContext, compressor);
  const settingsStore = new AudioSettingsStore();
  // Match CourtBuilder's default venue geometry (small/closed) so the audio isn't left tuned
  // for a big open venue on a court that visually looks like a boxed-in indoor arena.
  settingsStore.set(VENUE_TUNING_PRESETS["Small / Closed Venue"]);
  void reverbBus.applySettings(settingsStore.get().reverb);
  settingsStore.subscribe((settings) => void reverbBus.applySettings(settings.reverb));

  const ballAudio = new BallAudio(scene, {
    eventBus: simulation.eventBus,
    settingsStore,
    reverbBus,
    audioContext,
    masterDestination: masterMuteGain
  });

  new AudioTuningPanel({
    settingsStore,
    ballAudio,
    getListenerPosition: () => scene.activeCamera?.position,
    onVenuePreset: (preset) => simulation.court.setVenuePreset(preset)
  });

  // Exposed for troubleshooting ("why is there no sound") — not used by the app itself.
  window.__tennisAudioDebug = { audioEngine, audioContext, compressor, masterMuteGain, reverbBus, settingsStore, ballAudio };

  return { setMuted: (muted) => { masterMuteGain.gain.value = muted ? 0 : 1; } };
};

const audioHandle = setupAudio();
if (audioHandle) {
  new MuteToggle({ onToggle: audioHandle.setMuted, initialMuted: false });
}

new PauseToggle({ onToggle: (paused) => simulation.setPaused(paused), initialPaused: false });
new GestureHints();

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

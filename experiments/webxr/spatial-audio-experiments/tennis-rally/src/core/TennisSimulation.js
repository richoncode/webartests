import { Color3 } from "@babylonjs/core";
import { CourtBuilder, COURT } from "../court/CourtBuilder.js";
import { PlayerController } from "../players/PlayerController.js";
import { BallController } from "../ball/BallController.js";
import { ReplayBallController } from "../ball/ReplayBallController.js";
import { ReplaySkeletonRenderer } from "../players/ReplaySkeletonRenderer.js";
import { getReplayData } from "../ball/ReplayDataStore.js";
import { ImpactEventBus } from "./ImpactEventBus.js";
import { ImpactMarkers } from "../visuals/ImpactMarkers.js";
import { BallTrail } from "../visuals/BallTrail.js";
import { DebugVectors } from "../visuals/DebugVectors.js";

const CONTACT_HEIGHT = 1.15;
const LATERAL_RANGE = COURT.singlesWidth / 2 - 0.3;

// Owns the whole rally: the court, both stick-figure players, the ball, and the always-on
// visual debug helpers (trail/markers/vectors). SpectatorRig and the audio layer are wired
// to this from main.js — this class knows nothing about cameras or sound.
export class TennisSimulation {
  constructor(scene) {
    this.scene = scene;
    this.eventBus = new ImpactEventBus();
    this.court = new CourtBuilder(scene);

    this.players = {
      near: new PlayerController(scene, {
        id: "near",
        jerseyColor: new Color3(0.2, 0.35, 0.75),
        baselineZ: COURT.length / 2 + 1.2,
        facingYRotation: 0,
        lateralRange: LATERAL_RANGE,
        contactHeight: CONTACT_HEIGHT
      }),
      far: new PlayerController(scene, {
        id: "far",
        jerseyColor: new Color3(0.75, 0.3, 0.25),
        baselineZ: -(COURT.length / 2 + 1.2),
        facingYRotation: Math.PI,
        lateralRange: LATERAL_RANGE,
        contactHeight: CONTACT_HEIGHT
      })
    };

    // addShadowCaster() needs an actual Mesh, not the player's TransformNode root — walk down
    // to the real meshes in the rig hierarchy instead.
    for (const mesh of this.players.near.rig.root.getChildMeshes()) this.court.shadowGenerator.addShadowCaster(mesh, false);
    for (const mesh of this.players.far.rig.root.getChildMeshes()) this.court.shadowGenerator.addShadowCaster(mesh, false);

    this.ball = new BallController(scene, {
      eventBus: this.eventBus,
      players: this.players,
      lateralRange: LATERAL_RANGE
    });
    this.court.shadowGenerator.addShadowCaster(this.ball.mesh, false);

    this.impactMarkers = new ImpactMarkers(scene, this.eventBus);
    this.ballTrail = new BallTrail(scene, this.ball);
    this.debugVectors = new DebugVectors(scene);

    this.simTime = 0;
    this.paused = false;

    // Replay Loop mode — built lazily on first switch (see setPlaybackMode), since the
    // recorded match data is a 22.8MB fetch nobody should pay for unless they actually use it.
    this.mode = "random";
    this.replayBall = null;
    this.replaySkeletons = null;
    this._debugVisibility = {}; // cached so a ballTrail rebuild (mode switch) keeps the current toggle state
  }

  get courtCenter() {
    return this.court.courtCenter;
  }

  setDebugVisibility(key, visible) {
    this._debugVisibility[key] = visible;
    if (key === "trail") this.ballTrail.setVisible(visible);
    if (key === "impactMarkers") this.impactMarkers.setVisible(visible);
    if (key === "ballVelocity") this.debugVectors.setBallVelocityVisible(visible);
    if (key === "racketVelocity") this.debugVectors.setRacketVelocityVisible(visible);
  }

  // Switches between the procedural rally ("random") and the recorded-match playback
  // ("replay"). Both controllers/renderers are built once (lazily, on first use) and then just
  // toggled — never rebuilt — matching the pattern CourtBuilder already uses for its small/large
  // venue meshes. Async only because the very first switch to "replay" awaits the one-time data
  // fetch; the caller doesn't need to await this itself.
  async setPlaybackMode(mode) {
    if (mode === this.mode) return;

    if (mode === "replay" && !this.replayBall) {
      const data = await getReplayData();
      this.replayBall = new ReplayBallController(this.scene, { eventBus: this.eventBus, data });
      this.court.shadowGenerator.addShadowCaster(this.replayBall.mesh, false);
      this.replaySkeletons = new ReplaySkeletonRenderer(this.scene, { data });
    }

    this.mode = mode;
    this._applyModeVisibility();
    this._rebuildBallTrail();
    // The replayBall controller instance persists across mode switches (built once, lazily —
    // see above), so its own loop-restart events don't naturally reset on re-entry. Emitting a
    // dedicated marker here lets DebugUI's loop counter reset every time the user exits and
    // comes back to Replay Loop, not just once per page load.
    if (mode === "replay") this.eventBus.emit({ type: "replay-mode-entered" });
  }

  _applyModeVisibility() {
    const isReplay = this.mode === "replay";
    this.ball.mesh.setEnabled(!isReplay);
    this.players.near.rig.root.setEnabled(!isReplay);
    this.players.far.rig.root.setEnabled(!isReplay);
    if (this.replayBall) this.replayBall.mesh.setEnabled(isReplay);
    if (this.replaySkeletons) this.replaySkeletons.setVisible(isReplay);
  }

  // BallTrail binds to one specific ball-controller instance at construction and reads its
  // position/simTime directly every frame (not via the event bus) — switching modes means
  // rebuilding it against whichever controller is now active, not just toggling visibility.
  _rebuildBallTrail() {
    const wasVisible = this._debugVisibility.trail ?? true;
    this.ballTrail.dispose();
    const activeBall = this.mode === "replay" ? this.replayBall : this.ball;
    this.ballTrail = new BallTrail(this.scene, activeBall);
    this.ballTrail.setVisible(wasVisible);
  }

  // Freezes players/ball in place (e.g. while tuning audio) without touching rendering or the
  // spectator camera — SpectatorRig.update() is called separately in main.js's render loop, so
  // orbit/zoom/elevation all keep working while paused.
  setPaused(paused) {
    this.paused = paused;
  }

  update(dt) {
    if (this.paused) return;
    this.simTime += dt;

    if (this.mode === "replay") {
      this.replayBall.update(dt);
      this.replaySkeletons.update(this.replayBall.frameCursor, this.replayBall.frameTargetSec);
      this.debugVectors.update(this.replayBall, null);
      return;
    }

    this.players.near.update(dt, this.simTime);
    this.players.far.update(dt, this.simTime);
    this.ball.update(dt);

    const activeRacket = this.ball.lastHitBy
      ? { position: this.players[this.ball.lastHitBy].racketWorldPosition, velocity: this.players[this.ball.lastHitBy].racketVelocity }
      : { position: this.players.near.racketWorldPosition, velocity: this.players.near.racketVelocity };
    this.debugVectors.update(this.ball, activeRacket);
  }

  dispose() {
    this.impactMarkers.dispose();
    this.ballTrail.dispose();
    this.debugVectors.dispose();
    this.replayBall?.dispose();
    this.replaySkeletons?.dispose();
  }
}

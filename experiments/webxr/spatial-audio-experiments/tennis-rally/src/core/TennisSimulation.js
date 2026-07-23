import { Color3 } from "@babylonjs/core";
import { CourtBuilder, COURT } from "../court/CourtBuilder.js";
import { PlayerController } from "../players/PlayerController.js";
import { BallController } from "../ball/BallController.js";
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
  }

  get courtCenter() {
    return this.court.courtCenter;
  }

  setDebugVisibility(key, visible) {
    if (key === "trail") this.ballTrail.setVisible(visible);
    if (key === "impactMarkers") this.impactMarkers.setVisible(visible);
    if (key === "ballVelocity") this.debugVectors.setBallVelocityVisible(visible);
    if (key === "racketVelocity") this.debugVectors.setRacketVelocityVisible(visible);
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
  }
}

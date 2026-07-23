import { Color3, Vector3 } from "@babylonjs/core";
import { buildStickFigure } from "./StickFigure.js";
import { clamp, damp, lerp } from "../utils/math.js";

const SWING_DURATION = 0.55;
const CONTACT_PHASE = 0.6;
const CONTACT_WINDOW_SECONDS = 0.09;
const LATERAL_HALF_LIFE = 0.35;

// One procedural stick-figure player: owns its rig, its lateral "footwork" toward an
// assigned intercept point, and the swing animation timed to contact that point at a
// given arrival time. It does not decide *when* a hit counts — BallController does that
// by comparing the ball's position against racketWorldPosition/racketVelocity exposed here.
export class PlayerController {
  constructor(scene, { id, jerseyColor, baselineZ, facingYRotation, lateralRange, contactHeight }) {
    this.id = id;
    this.scene = scene;
    this.baselineZ = baselineZ;
    this.facingYRotation = facingYRotation;
    this.lateralRange = lateralRange;
    this.contactHeight = contactHeight;

    this.rig = buildStickFigure(scene, {
      name: `player-${id}`,
      jerseyColor,
      skinColor: new Color3(0.78, 0.62, 0.5)
    });
    this.rig.root.position.set(0, 0, baselineZ);
    this.rig.root.rotation.y = facingYRotation;

    this.currentX = 0;
    this.homeX = 0;
    this.assignedTargetX = null;
    this.swingStartTime = null;
    this.state = "ready";
    this.phase = 0;
    this.simTime = 0;

    this._prevRacketPos = this.racketWorldPosition.clone();
    this.racketVelocity = Vector3.Zero();
  }

  get racketWorldPosition() {
    return this.rig.racket.sweetSpot.getAbsolutePosition();
  }

  get isInContactWindow() {
    if (this.state !== "swinging") return false;
    return Math.abs(this.phase - CONTACT_PHASE) * SWING_DURATION < CONTACT_WINDOW_SECONDS;
  }

  // Called by BallController once it has planned the next shot toward this player.
  // arrivalTime/contactX are absolute simulation-clock values.
  handleAssignment(contactX, arrivalTime) {
    this.assignedTargetX = clamp(contactX, -this.lateralRange, this.lateralRange);
    this.swingStartTime = arrivalTime - CONTACT_PHASE * SWING_DURATION;
  }

  update(dt, simTime) {
    this.simTime = simTime;

    if (this.state === "ready" && this.swingStartTime !== null && simTime >= this.swingStartTime) {
      this.state = "swinging";
      this.phase = 0;
      this._swingElapsed = 0;
    }

    if (this.state === "swinging") {
      this._swingElapsed += dt;
      this.phase = clamp(this._swingElapsed / SWING_DURATION, 0, 1);
      if (this.phase >= 1) {
        this.state = "ready";
        this.swingStartTime = null;
        this.assignedTargetX = null;
      }
    }

    const desiredX = this.assignedTargetX ?? this.homeX;
    this.currentX = damp(this.currentX, desiredX, LATERAL_HALF_LIFE, dt);
    this.rig.root.position.x = clamp(this.currentX, -this.lateralRange, this.lateralRange);

    this._applyPose(dt);
    this._updateRacketVelocity(dt);
  }

  _applyPose(dt) {
    const rig = this.rig;
    const idleBounce = Math.sin(this.simTime * 3.2) * 0.015;

    if (this.state !== "swinging") {
      rig.hips.position.y = 0.9 + idleBounce;
      rig.dominantArm.shoulderPivot.rotation.x = lerp(rig.dominantArm.shoulderPivot.rotation.x, -0.35, 1 - Math.pow(0.001, dt));
      rig.dominantArm.elbowPivot.rotation.x = lerp(rig.dominantArm.elbowPivot.rotation.x, -0.5, 1 - Math.pow(0.001, dt));
      rig.offArm.shoulderPivot.rotation.x = lerp(rig.offArm.shoulderPivot.rotation.x, -0.25, 1 - Math.pow(0.001, dt));
      rig.hips.rotation.y = lerp(rig.hips.rotation.y, 0, 1 - Math.pow(0.001, dt));

      const shuffle = Math.sin(this.simTime * 6) * 0.12;
      rig.leftLeg.hipPivot.rotation.x = shuffle;
      rig.rightLeg.hipPivot.rotation.x = -shuffle;
      return;
    }

    // A single continuous swing: draw back (0 -> contact-ish), whip through contact,
    // then follow through / recover. Eased with smoothstep-ish curves rather than
    // keyframed animation, since the timing target (CONTACT_PHASE) moves shot to shot.
    const p = this.phase;
    const backswing = clamp(p / CONTACT_PHASE, 0, 1);
    const followThrough = clamp((p - CONTACT_PHASE) / (1 - CONTACT_PHASE), 0, 1);
    const smooth = (t) => t * t * (3 - 2 * t);

    const drawBack = -1.1 * (1 - smooth(backswing));
    const swingThrough = 1.6 * smooth(followThrough);
    rig.dominantArm.shoulderPivot.rotation.x = drawBack + swingThrough - 0.2;
    rig.dominantArm.shoulderPivot.rotation.y = lerp(0.5, -0.35, smooth(backswing < 1 ? backswing : 1)) + smooth(followThrough) * -0.3;
    rig.dominantArm.elbowPivot.rotation.x = lerp(-1.3, -0.15, smooth(backswing)) + smooth(followThrough) * -0.3;

    rig.offArm.shoulderPivot.rotation.x = -0.3 - smooth(backswing) * 0.4 + smooth(followThrough) * 0.5;

    rig.hips.rotation.y = lerp(0.25, -0.35, smooth(p));
    rig.hips.position.y = 0.9 - Math.sin(p * Math.PI) * 0.06;

    const lunge = Math.sin(p * Math.PI) * 0.18;
    rig.leftLeg.hipPivot.rotation.x = lunge;
    rig.rightLeg.hipPivot.rotation.x = -lunge * 0.6;
  }

  _updateRacketVelocity(dt) {
    if (dt <= 0) return;
    const current = this.racketWorldPosition;
    this.racketVelocity = current.subtract(this._prevRacketPos).scale(1 / dt);
    this._prevRacketPos = current.clone();
  }
}

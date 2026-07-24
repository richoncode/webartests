import { Color3, MeshBuilder, StandardMaterial, Vector3 } from "@babylonjs/core";
import { clamp, randomRange } from "../utils/math.js";
import { COURT } from "../court/CourtBuilder.js";

const GRAVITY = 9.4; // slightly softened from real-world 9.81 for a more watchable, readable arc
const BALL_RADIUS = 0.033;
const NET_CLEARANCE_MARGIN = 0.18;
const CONTACT_RADIUS = 0.95;
const HIT_TIMEOUT_SLACK = 0.4;
const BOUNCE_RESTITUTION = { flat: 0.74, topspin: 0.68, slice: 0.8 };
const BOUNCE_FRICTION = { flat: 0.86, topspin: 0.8, slice: 0.92 };
// This procedural sim only ever tracks spin as one of three fixed labels, not a real continuous
// rate — these are rough representative rpm values (not measured) standing in for each label, so
// BallAudio.js's mapSpinToVolumeAdjust() has a number to work with instead of nothing. Replay
// Loop uses the actual recorded spin rate instead (see ReplayBallController.js).
const SPIN_RPM_BY_TYPE = { flat: 200, slice: 1400, topspin: 2800 };

const netHeightAt = (x) => {
  const hw = COURT.doublesWidth / 2;
  const t = clamp(Math.abs(x) / hw, 0, 1);
  return COURT.netHeightCenter + (COURT.netHeightPost - COURT.netHeightCenter) * t;
};

// Solves for the (velocity, flightTime) that carries the ball from startPos to a floor-level
// targetXZ along a parabola with the given apex height, then nudges the apex up until the
// trajectory clears the net by NET_CLEARANCE_MARGIN — fully analytic, no iteration beyond the
// occasional net-clearance retry.
const planTrajectory = (startPos, targetXZ, initialApex, gravity) => {
  let apex = Math.max(initialApex, startPos.y + 0.05);
  for (let attempt = 0; attempt < 6; attempt++) {
    const tUp = Math.sqrt((2 * (apex - startPos.y)) / gravity);
    const tDown = Math.sqrt((2 * apex) / gravity); // lands at floor height (y=0)
    const flightTime = tUp + tDown;
    const vy0 = gravity * tUp;
    const vx = (targetXZ.x - startPos.x) / flightTime;
    const vz = (targetXZ.z - startPos.z) / flightTime;

    const tNet = startPos.z !== targetXZ.z ? (0 - startPos.z) / vz : flightTime / 2;
    const tNetClamped = clamp(tNet, 0, flightTime);
    const yAtNet = startPos.y + vy0 * tNetClamped - 0.5 * gravity * tNetClamped * tNetClamped;
    const requiredClearance = netHeightAt(startPos.x + vx * tNetClamped) + NET_CLEARANCE_MARGIN;

    if (yAtNet >= requiredClearance || attempt === 5) {
      return { velocity: new Vector3(vx, vy0, vz), flightTime, apex };
    }
    apex += 0.45;
  }
  return null; // unreachable given the loop above always returns on the final attempt
};

const pickAimPoint = (receiverSide, lateralRange) => {
  const depthFromNet = randomRange(2.2, COURT.length / 2 - 1.2);
  const x = randomRange(-lateralRange * 0.85, lateralRange * 0.85);
  const z = receiverSide * depthFromNet;
  return { x, z };
};

const randomSpin = () => {
  const roll = Math.random();
  if (roll < 0.4) return "topspin";
  if (roll < 0.7) return "flat";
  return "slice";
};

export class BallController {
  constructor(scene, { eventBus, players, lateralRange }) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.players = players; // { near, far } PlayerController instances
    this.lateralRange = lateralRange;
    this.simTime = 0;

    this.mesh = MeshBuilder.CreateSphere("ball", { diameter: BALL_RADIUS * 2, segments: 12 }, scene);
    const mat = new StandardMaterial("ballMat", scene);
    mat.diffuseColor = new Color3(0.78, 0.9, 0.15);
    mat.specularColor = new Color3(0.3, 0.3, 0.2);
    this.mesh.material = mat;

    this.position = new Vector3(0, players.near.contactHeight, players.near.baselineZ - 1.5);
    this.velocity = Vector3.Zero();
    this.spin = "flat";
    this.lastHitBy = null;
    this.awaiting = null; // { receiverId, arrivalTime, deadline, resolved }

    this._serve();
  }

  get radius() {
    return BALL_RADIUS;
  }

  _otherPlayer(id) {
    return id === "near" ? this.players.far : this.players.near;
  }

  _serve() {
    const receiver = this.players.far;
    const server = this.players.near;
    this.position = new Vector3(server.homeX, server.contactHeight, server.baselineZ - 1.2);
    this.lastHitBy = null;
    this._planShotToward(receiver, this.position, /* isServe */ true);
  }

  _planShotToward(receiver, fromPos, isServe = false) {
    const receiverSide = Math.sign(receiver.baselineZ) || 1;
    const aim = pickAimPoint(receiverSide, this.lateralRange);
    const spin = isServe ? "flat" : randomSpin();
    const apexBias = spin === "topspin" ? -0.25 : spin === "slice" ? 0.35 : 0;
    const apex = clamp(randomRange(1.9, 2.9) + apexBias, 1.5, 3.4);

    const plan = planTrajectory(fromPos, aim, apex, GRAVITY);
    this.velocity = plan.velocity;
    this.spin = spin;

    // Predict the post-bounce arc analytically so the receiver can start moving immediately,
    // well before the ball actually gets there.
    const bounceTime = this.simTime + plan.flightTime;
    const velAtBounce = new Vector3(plan.velocity.x, plan.velocity.y - GRAVITY * plan.flightTime, plan.velocity.z);
    const restitution = BOUNCE_RESTITUTION[spin];
    const friction = BOUNCE_FRICTION[spin];
    const postBounceVel = new Vector3(velAtBounce.x * friction, -velAtBounce.y * restitution, velAtBounce.z * friction);

    const contactHeight = receiver.contactHeight;
    const riseTime = postBounceVel.y > 0 ? postBounceVel.y / GRAVITY : 0;
    const apexAfterBounce = postBounceVel.y > 0 ? (postBounceVel.y * postBounceVel.y) / (2 * GRAVITY) : 0;
    let t2;
    if (apexAfterBounce >= contactHeight) {
      // First crossing of contactHeight on the way up.
      const disc = Math.sqrt(Math.max(0, postBounceVel.y * postBounceVel.y - 2 * GRAVITY * contactHeight));
      t2 = (postBounceVel.y - disc) / GRAVITY;
    } else {
      t2 = riseTime; // never quite reaches contact height — meet it at the apex, close enough
    }
    t2 = Math.max(t2, 0.08);

    const contactX = aim.x + postBounceVel.x * t2;
    const contactZ = aim.z + postBounceVel.z * t2;
    const arrivalTime = bounceTime + t2;

    receiver.handleAssignment(contactX, arrivalTime);
    this.awaiting = { receiverId: receiver.id, arrivalTime, deadline: arrivalTime + HIT_TIMEOUT_SLACK, resolved: false, contactPos: new Vector3(contactX, contactHeight, contactZ) };
  }

  update(dt) {
    this.simTime += dt;

    this.velocity.y -= GRAVITY * dt;
    this.position.addInPlace(this.velocity.scale(dt));
    this.mesh.position.copyFrom(this.position);

    if (this.position.y <= this.radius && this.velocity.y < 0) {
      this._resolveFloorHit();
    }

    if (this.awaiting && !this.awaiting.resolved) {
      const receiver = this.players[this.awaiting.receiverId];
      const closeEnough = Vector3.Distance(this.position, receiver.racketWorldPosition) < CONTACT_RADIUS;
      const timedOut = this.simTime >= this.awaiting.deadline;
      if ((receiver.isInContactWindow && closeEnough) || timedOut) {
        this._resolveRacketHit(receiver);
      }
    }
  }

  _resolveFloorHit() {
    const incomingVelocity = this.velocity.clone();
    this.position.y = this.radius;
    const restitution = BOUNCE_RESTITUTION[this.spin];
    const friction = BOUNCE_FRICTION[this.spin];
    this.velocity.set(this.velocity.x * friction, -this.velocity.y * restitution, this.velocity.z * friction);

    this.eventBus.emit({
      type: "floor-hit",
      time: this.simTime,
      ball: {
        position: this.position.clone(),
        velocity: this.velocity.clone(),
        speed: this.velocity.length(),
        incomingVelocity,
        incomingSpeed: incomingVelocity.length()
      },
      court: {
        surfacePoint: new Vector3(this.position.x, 0, this.position.z)
      }
    });
  }

  _resolveRacketHit(receiver) {
    this.awaiting.resolved = true;
    const racketPos = receiver.racketWorldPosition.clone();
    const racketVel = receiver.racketVelocity.clone();
    const contactPosition = this.position.clone();
    const incomingVelocity = this.velocity.clone();

    this.lastHitBy = receiver.id;
    // Snap the ball to the racket for a clean visual contact point, then plan the return shot —
    // this has to happen *before* the event below: _planShotToward is what computes the real
    // outgoing shot velocity (this.velocity gets reassigned inside it). Emitting first (as this
    // used to) would hand listeners the stale incoming trajectory — the direction the ball
    // arrived on, not the direction the racket is actually sending it — which is backwards for
    // anything (Doppler, force alignment) that cares which way the hit is actually headed.
    this.position = racketPos;
    const nextReceiver = this._otherPlayer(receiver.id);
    this._planShotToward(nextReceiver, this.position);

    this.eventBus.emit({
      type: "racket-hit",
      time: this.simTime,
      ball: {
        position: contactPosition,
        velocity: this.velocity.clone(),
        speed: this.velocity.length(),
        incomingVelocity,
        incomingSpeed: incomingVelocity.length()
      },
      racket: {
        playerId: receiver.id,
        centerPosition: racketPos,
        velocity: racketVel,
        speed: racketVel.length(),
        spinRpm: SPIN_RPM_BY_TYPE[this.spin] ?? 0
      }
    });
  }
}

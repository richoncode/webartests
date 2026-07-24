import { Color3, MeshBuilder, StandardMaterial, Vector3 } from "@babylonjs/core";
import { clamp, lerp } from "../utils/math.js";

const BALL_RADIUS = 0.033; // matches BallController.js's BALL_RADIUS, for a visually identical ball

const toVec3 = (p) => new Vector3(p.x, p.y, p.z);

// Plays back real recorded match data (see reference-data/tennis-tracking-data-format.md) on a
// seamless loop, exposing the exact same public surface BallController does (mesh, position,
// velocity, radius, lastHitBy, update(dt), simTime) so TennisSimulation/BallTrail/DebugVectors
// all keep working unmodified regardless of which controller is currently active. Emits the same
// racket-hit/floor-hit event shapes BallController does, so BallAudio.js needs zero changes.
export class ReplayBallController {
  constructor(scene, { eventBus, data }) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.data = data;
    this.simTime = 0;
    this.lastHitBy = null;

    this.mesh = MeshBuilder.CreateSphere("replayBall", { diameter: BALL_RADIUS * 2, segments: 12 }, scene);
    const mat = new StandardMaterial("replayBallMat", scene);
    mat.diffuseColor = new Color3(0.78, 0.9, 0.15);
    mat.specularColor = new Color3(0.3, 0.3, 0.2);
    this.mesh.material = mat;

    this.position = new Vector3(0, 0, 0);
    this.velocity = Vector3.Zero();

    this._elapsedSec = 0;
    // Public playback cursor/time — ReplaySkeletonRenderer reads these after each update() so
    // player poses stay in exact lockstep with the ball, rather than keeping its own duplicate
    // clock that could drift out of sync.
    this.frameCursor = data.loopStartIndex;
    this.frameTargetSec = data.frames[this.frameCursor].tSec;
    // A separate cursor into data.eventInstants (built from motions[], not the sparse per-frame
    // event_marker — see ReplayDataStore.js) drives racket-hit/floor-hit firing, decoupled from
    // the frame cursor above since one shot can carry multiple bounces.
    this._eventCursor = 0;
    this._interpolateBallAt(this.frameTargetSec, this.frameCursor);
    this.mesh.position.copyFrom(this.position);
  }

  get radius() {
    return BALL_RADIUS;
  }

  update(dt) {
    this.simTime += dt;
    this._elapsedSec += dt;

    // Loop at the segment boundary, not mid-flight or through the raw file's between-point
    // gaps — a hard cut between rally points is realistic (players reset between points anyway).
    if (this._elapsedSec >= this.data.loopDurationSec) {
      this._elapsedSec -= this.data.loopDurationSec;
      this.frameCursor = this.data.loopStartIndex;
      this._eventCursor = 0;
      this.eventBus.emit({ type: "replay-loop-restart", time: this.simTime });
    }

    const targetSec = this.data.loopStartSec + this._elapsedSec;
    const { frames, eventInstants, loopEndIndex } = this.data;

    // Advance the frame cursor one recorded frame at a time for smooth ball interpolation —
    // handles both a normal single-frame advance and a larger dt that skips several recorded
    // frames in one update() call.
    while (this.frameCursor < loopEndIndex && frames[this.frameCursor + 1].tSec <= targetSec) {
      this.frameCursor += 1;
    }

    // Advance the event cursor independently, firing every real Hit/Bounce instant crossed —
    // a separate pass from the frame cursor above since a single shot can carry more than one
    // bounce, and event instants don't line up 1:1 with individual recorded frames.
    while (this._eventCursor < eventInstants.length && eventInstants[this._eventCursor].tSec <= targetSec) {
      const instant = eventInstants[this._eventCursor];
      if (instant.type === "Hit") this._emitRacketHit(instant.frameIndex);
      else this._emitFloorHit(instant.frameIndex);
      this._eventCursor += 1;
    }

    this.frameTargetSec = targetSec;
    this._interpolateBallAt(targetSec, this.frameCursor);
    this.mesh.position.copyFrom(this.position);
  }

  _interpolateBallAt(targetSec, cursor) {
    const { frames, loopEndIndex } = this.data;
    const a = frames[cursor];
    const b = cursor < loopEndIndex ? frames[cursor + 1] : a;
    const posA = a.ball?.position;
    if (!posA) return; // defensive: every in-segment frame is expected to carry ball data

    const posB = b.ball?.position ?? posA;
    const velA = a.ball?.velocity;
    const velB = b.ball?.velocity ?? velA;
    const span = b.tSec - a.tSec;
    const t = span > 0 ? clamp((targetSec - a.tSec) / span, 0, 1) : 0;

    this.position.set(lerp(posA.x, posB.x, t), lerp(posA.y, posB.y, t), lerp(posA.z, posB.z, t));
    if (velA) this.velocity.set(lerp(velA.x, velB.x, t), lerp(velA.y, velB.y, t), lerp(velA.z, velB.z, t));
  }

  _playerIdFor(objectId, segment) {
    const sides = this.data.nearFarBySegment.get(segment);
    if (!sides) return null;
    if (objectId === sides.near) return "near";
    if (objectId === sides.far) return "far";
    return null;
  }

  _emitRacketHit(frameIndex) {
    const { frames } = this.data;
    const hitFrame = frames[frameIndex];
    const prevFrame = frameIndex > 0 ? frames[frameIndex - 1] : hitFrame;
    const nextFrame = frameIndex < frames.length - 1 ? frames[frameIndex + 1] : hitFrame;

    // Real outgoing direction comes from just after the hit, mirroring BallController's own
    // "emit the post-hit velocity, not the stale incoming one" convention.
    const outgoingVelocity = toVec3(nextFrame.ball?.velocity ?? hitFrame.ball.velocity);
    const incomingVelocity = toVec3(prevFrame.ball?.velocity ?? hitFrame.ball.velocity);

    const hitInfo = this.data.hitInfoByShotKey.get(`${hitFrame.segment}:${hitFrame.shot}`);
    const playerId = this._playerIdFor(hitFrame.hitterId, hitFrame.segment);
    this.lastHitBy = playerId;

    const hitter = hitFrame.players.find((p) => p.objectId === hitFrame.hitterId);
    const racketCenter = hitter ? this.data.pickRacketCenter(hitter.joints) : null;
    const racketCenterVec = racketCenter ? toVec3(racketCenter) : toVec3(hitFrame.ball.position);

    // No per-frame racket velocity is recorded (only racket *position*, via joints) — reuse the
    // ball's own real recorded speed as the racket-speed scalar, the same "borrow the ball's
    // real physics since true racket kinematics aren't directly trustworthy/available" spirit
    // BallAudio.js's own effectiveRacketVelocity() already applies in the procedural sim.
    const racketSpeed = hitInfo?.speedMps ?? outgoingVelocity.length();
    const outgoingDir = outgoingVelocity.length() > 0 ? outgoingVelocity.normalizeToNew() : new Vector3(0, 0, 1);

    this.eventBus.emit({
      type: "racket-hit",
      time: this.simTime,
      // The recorded file's own elapsed-seconds-from-start for this frame (see
      // ReplayDataStore.js's tSec) — unlike simTime (which keeps climbing across every loop
      // wrap and never matches the source file), this always falls within [0, loopDurationSec)
      // and is directly the same timestamp convention scripts/report_missing_hit_markers.py and
      // reference-data/missing-hits.txt already use, so a hit logged here can be looked up
      // straight in the source recording when discussing it with the data team.
      dataTimeSec: hitFrame.tSec,
      ball: {
        position: toVec3(hitFrame.ball.position),
        velocity: outgoingVelocity,
        speed: outgoingVelocity.length(),
        incomingVelocity,
        incomingSpeed: incomingVelocity.length()
      },
      racket: {
        playerId,
        centerPosition: racketCenterVec,
        velocity: outgoingDir.scale(racketSpeed),
        speed: racketSpeed,
        // Real recorded spin rate for this shot (rpm) — see BallAudio.js's mapSpinToVolumeAdjust()
        // and AudioSettingsStore.js's racket.spinMin/spinMax comment for why this exists.
        spinRpm: hitInfo?.spinRpm ?? 0
      }
    });
  }

  _emitFloorHit(frameIndex) {
    const { frames } = this.data;
    const bounceFrame = frames[frameIndex];
    const prevFrame = frameIndex > 0 ? frames[frameIndex - 1] : bounceFrame;

    const outgoingVelocity = toVec3(bounceFrame.ball.velocity);
    const incomingVelocity = toVec3(prevFrame.ball?.velocity ?? bounceFrame.ball.velocity);
    const position = toVec3(bounceFrame.ball.position);

    this.eventBus.emit({
      type: "floor-hit",
      time: this.simTime,
      dataTimeSec: bounceFrame.tSec, // see the matching comment in _emitRacketHit above
      ball: {
        position,
        velocity: outgoingVelocity,
        speed: outgoingVelocity.length(),
        incomingVelocity,
        incomingSpeed: incomingVelocity.length()
      },
      court: {
        surfacePoint: new Vector3(position.x, 0, position.z)
      }
    });
  }

  dispose() {
    this.mesh.material?.dispose();
    this.mesh.dispose();
  }
}

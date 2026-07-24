import { Color3, MeshBuilder, Quaternion, StandardMaterial, Vector3 } from "@babylonjs/core";
import { clamp, lerp } from "../utils/math.js";

const JOINT_COUNT = 20;
const BODY_JOINT_RADIUS = 0.035;
const RACKET_JOINT_RADIUS = 0.02;
const BONE_RADIUS = 0.012;
const RACKET_JOINT_INDICES = new Set([13, 14, 15, 16, 17, 18, 19]);

// Anatomically-adjacent joint index pairs (see meta.joint_order in
// reference-data/tennis-tracking-data-format.md) — each connected by a thin cylinder "bone"
// every frame. The rig can't be posed by rotation like StickFigure.js's procedural players
// (real recorded bone lengths don't match that rig's hardcoded ones), so this renders the
// recorded joints honestly, as a literal point-and-line skeleton instead.
const BONE_PAIRS = [
  [0, 1], [0, 2], // neck-lShoulder, neck-rShoulder
  [1, 3], [3, 5], // lShoulder-lElbow-lWrist
  [2, 4], [4, 6], // rShoulder-rElbow-rWrist
  [1, 7], [2, 8], // shoulder-hip (torso sides)
  [7, 8], // pelvis
  [7, 9], [9, 11], // lHip-lKnee-lAnkle
  [8, 10], [10, 12], // rHip-rKnee-rAnkle
  [13, 14], [14, 15], // racket handle-shaft-head
  [15, 16], [15, 17], // head-rightEdge, head-leftEdge
  [16, 18], [17, 19], // rightEdge-rightCorner, leftEdge-leftCorner
  [18, 19] // rightCorner-leftCorner (racket head outline)
];

// One player's rendered skeleton: a fixed-size pool of joint spheres and bone cylinders, built
// once and repositioned every frame — never rebuilt.
class PlayerSkeleton {
  constructor(scene, color, label) {
    this.scene = scene;
    this.material = new StandardMaterial(`replaySkel-${label}`, scene);
    this.material.diffuseColor = color;
    this.material.emissiveColor = color.scale(0.5);

    this.joints = [];
    for (let i = 0; i < JOINT_COUNT; i++) {
      const radius = RACKET_JOINT_INDICES.has(i) ? RACKET_JOINT_RADIUS : BODY_JOINT_RADIUS;
      const sphere = MeshBuilder.CreateSphere(`replayJoint-${label}-${i}`, { diameter: radius * 2, segments: 6 }, scene);
      sphere.material = this.material;
      sphere.isPickable = false;
      this.joints.push(sphere);
    }

    this.bones = BONE_PAIRS.map((_pair, idx) => {
      const cylinder = MeshBuilder.CreateCylinder(`replayBone-${label}-${idx}`, { height: 1, diameter: BONE_RADIUS * 2, tessellation: 6 }, scene);
      cylinder.material = this.material;
      cylinder.isPickable = false;
      cylinder.rotationQuaternion = Quaternion.Identity();
      return cylinder;
    });
  }

  setVisible(visible) {
    this.joints.forEach((m) => m.setEnabled(visible));
    this.bones.forEach((m) => m.setEnabled(visible));
  }

  // jointPositions: array of 20 Vector3|null, already interpolated for the current frame.
  applyJoints(jointPositions) {
    for (let i = 0; i < JOINT_COUNT; i++) {
      const p = jointPositions[i];
      const mesh = this.joints[i];
      if (!p) {
        mesh.setEnabled(false);
        continue;
      }
      mesh.setEnabled(true);
      mesh.position.copyFrom(p);
    }

    BONE_PAIRS.forEach(([a, b], idx) => {
      const bone = this.bones[idx];
      const pa = jointPositions[a];
      const pb = jointPositions[b];
      if (!pa || !pb) {
        bone.setEnabled(false);
        return;
      }
      const delta = pb.subtract(pa);
      const length = delta.length();
      if (length < 1e-5) {
        bone.setEnabled(false);
        return;
      }
      bone.setEnabled(true);
      bone.position.copyFrom(pa.add(pb).scale(0.5));
      bone.scaling.y = length;
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), delta.normalizeToNew(), bone.rotationQuaternion);
    });
  }

  dispose() {
    this.joints.forEach((m) => m.dispose());
    this.bones.forEach((m) => m.dispose());
    this.material.dispose();
  }
}

const PLAYER_COLORS = [new Color3(0.2, 0.35, 0.75), new Color3(0.75, 0.3, 0.25)];

// Renders both recorded players as literal mocap skeletons (joint spheres + connecting bones,
// including the racket) driven by the same ReplayDataStore frame data ReplayBallController
// plays back. update(cursor, targetSec) takes the ball controller's own playback cursor/time
// directly so the two never drift out of sync with each other.
export class ReplaySkeletonRenderer {
  constructor(scene, { data }) {
    this.scene = scene;
    this.data = data;

    const objectIds = [...new Set(data.frames.flatMap((f) => f.players.map((p) => p.objectId)))];
    this.skeletonsByObjectId = new Map(
      objectIds.map((id, i) => [id, new PlayerSkeleton(scene, PLAYER_COLORS[i % PLAYER_COLORS.length], id)])
    );
  }

  setVisible(visible) {
    this.skeletonsByObjectId.forEach((s) => s.setVisible(visible));
  }

  update(cursor, targetSec) {
    const { frames, loopEndIndex } = this.data;
    const a = frames[cursor];
    const b = cursor < loopEndIndex ? frames[cursor + 1] : a;
    const span = b.tSec - a.tSec;
    const t = span > 0 ? clamp((targetSec - a.tSec) / span, 0, 1) : 0;

    for (const [objectId, skeleton] of this.skeletonsByObjectId) {
      const pa = a.players.find((p) => p.objectId === objectId);
      if (!pa) {
        skeleton.setVisible(false);
        continue;
      }
      const pb = b.players.find((p) => p.objectId === objectId) ?? pa;
      skeleton.setVisible(true);

      const interpolated = pa.joints.map((jointA, i) => {
        if (!jointA) return null;
        const jointB = pb.joints[i];
        if (!jointB) return new Vector3(jointA.x, jointA.y, jointA.z);
        return new Vector3(lerp(jointA.x, jointB.x, t), lerp(jointA.y, jointB.y, t), lerp(jointA.z, jointB.z, t));
      });
      skeleton.applyJoints(interpolated);
    }
  }

  dispose() {
    this.skeletonsByObjectId.forEach((s) => s.dispose());
  }
}

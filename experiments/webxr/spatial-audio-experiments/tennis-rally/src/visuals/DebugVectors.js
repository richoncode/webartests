import { Color3, MeshBuilder, Quaternion, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";

const SHAFT_RADIUS = 0.012;
const HEAD_RADIUS = 0.03;
const HEAD_LENGTH = 0.09;
const VELOCITY_TO_LENGTH = 0.12; // meters of arrow per m/s, purely a display scale

const buildArrow = (scene, name, color) => {
  const root = new TransformNode(`${name}Root`, scene);
  const mat = new StandardMaterial(`${name}Mat`, scene);
  mat.diffuseColor = color;
  mat.disableLighting = true;
  mat.emissiveColor = color;

  const shaft = MeshBuilder.CreateCylinder(`${name}Shaft`, { height: 1, diameter: SHAFT_RADIUS * 2 }, scene);
  shaft.material = mat;
  shaft.parent = root;

  const head = MeshBuilder.CreateCylinder(`${name}Head`, { height: HEAD_LENGTH, diameterTop: 0, diameterBottom: HEAD_RADIUS * 2 }, scene);
  head.material = mat;
  head.parent = root;

  root.setEnabled(false);
  return { root, shaft, head };
};

// A reusable velocity-vector arrow: point it from an origin along a direction/length by
// calling update() every frame. Purely cosmetic debug geometry, toggled from the debug UI.
class VectorArrow {
  constructor(scene, name, color) {
    this.arrow = buildArrow(scene, name, color);
    this.visible = false;
  }

  setVisible(visible) {
    this.visible = visible;
    this.arrow.root.setEnabled(visible && this._hasLength);
  }

  // shaft and head share a single material instance (see buildArrow) — one update covers both.
  setColor(color) {
    this.arrow.shaft.material.diffuseColor.copyFrom(color);
    this.arrow.shaft.material.emissiveColor.copyFrom(color);
  }

  update(origin, vector) {
    const length = vector.length() * VELOCITY_TO_LENGTH;
    this._hasLength = length > 0.02;
    this.arrow.root.setEnabled(this.visible && this._hasLength);
    if (!this._hasLength) return;

    this.arrow.root.position.copyFrom(origin);
    const direction = vector.normalizeToNew();
    if (!this.arrow.root.rotationQuaternion) this.arrow.root.rotationQuaternion = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction, this.arrow.root.rotationQuaternion);

    const shaftLength = Math.max(0.001, length - HEAD_LENGTH);
    this.arrow.shaft.scaling.y = shaftLength;
    this.arrow.shaft.position.y = shaftLength / 2;
    this.arrow.head.position.y = shaftLength + HEAD_LENGTH / 2;
  }

  dispose() {
    this.arrow.root.dispose();
  }
}

export class DebugVectors {
  constructor(scene) {
    this.ballArrow = new VectorArrow(scene, "ballVelocityArrow", new Color3(1, 0.35, 0.2));
    this.racketArrow = new VectorArrow(scene, "racketVelocityArrow", new Color3(0.25, 0.6, 1));
  }

  setBallVelocityVisible(visible) {
    this.ballArrow.setVisible(visible);
  }

  setRacketVelocityVisible(visible) {
    this.racketArrow.setVisible(visible);
  }

  update(ball, activeRacket) {
    // Matches whatever color ImpactForceColor.js last set on the ball itself (see
    // BallTrail.js's own copy of this same idea) — a hit hard enough to turn the ball red
    // should turn its velocity arrow red too, not stay a fixed unrelated color.
    const ballColor = ball.mesh?.material?.diffuseColor;
    if (ballColor) this.ballArrow.setColor(ballColor);
    this.ballArrow.update(ball.position, ball.velocity);
    if (activeRacket) {
      this.racketArrow.update(activeRacket.position, activeRacket.velocity);
    }
  }

  dispose() {
    this.ballArrow.dispose();
    this.racketArrow.dispose();
  }
}

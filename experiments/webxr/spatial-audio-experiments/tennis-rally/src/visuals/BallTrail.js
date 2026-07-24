import { Color3, MeshBuilder, StandardMaterial } from "@babylonjs/core";

const TRAIL_SECONDS = 1;
const SAMPLE_INTERVAL = 1 / 30;
const MAX_SAMPLES = Math.ceil(TRAIL_SECONDS / SAMPLE_INTERVAL) + 2;
// A real shot never covers this much ground between two samples (30/s) — a jump this size can
// only be a hard, non-physical cut (e.g. ReplayBallController looping back to its start frame).
// simTime advances smoothly across that cut, so the time-based cutoff below never trims the
// stale pre-jump samples; only a distance guard catches it.
const MAX_SAMPLE_JUMP = 5;

// A short, fading tail behind the ball — read-only visual guidance, never touched by
// physics/hit-detection. Built from a small pool of spheres (sized once, repositioned every
// frame) rather than a line mesh: WebGL renders native lines at a fixed ~1px regardless of any
// Babylon-side color/width setting, which reads as essentially invisible at normal camera
// distances. Spheres give real, visible thickness, and shrinking + fading them by age (via
// `visibility`, the same per-instance fade ImpactMarkers.js already uses) produces the
// "feathered" tapering-to-nothing look a line's alpha gradient was aiming for.
export class BallTrail {
  constructor(scene, ballController) {
    this.scene = scene;
    this.ball = ballController;
    this.samples = []; // { position, time }
    this._sinceLastSample = 0;
    this._visible = true;

    this._material = new StandardMaterial("ballTrailMat", scene);
    this._material.diffuseColor = new Color3(0.78, 0.9, 0.15); // matches the ball's own default color
    this._material.emissiveColor = new Color3(0.39, 0.45, 0.075);
    this._material.disableLighting = true;
    this._material.alpha = 0.85;

    const diameter = this.ball.radius * 2;
    this._dots = Array.from({ length: MAX_SAMPLES }, (_, i) => {
      const dot = MeshBuilder.CreateSphere(`ballTrailDot${i}`, { diameter, segments: 6 }, scene);
      dot.material = this._material;
      dot.isPickable = false;
      dot.isVisible = false;
      return dot;
    });

    this._observer = scene.onBeforeRenderObservable.add(() => this._tick());
  }

  setVisible(visible) {
    this._visible = visible;
    if (!visible) this._dots.forEach((dot) => (dot.isVisible = false));
  }

  _tick() {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    this._sinceLastSample += dt;
    if (this._sinceLastSample >= SAMPLE_INTERVAL) {
      this._sinceLastSample = 0;
      const last = this.samples[this.samples.length - 1];
      if (last && this.ball.position.subtract(last.position).length() > MAX_SAMPLE_JUMP) this.samples.length = 0;
      this.samples.push({ position: this.ball.position.clone(), time: this.ball.simTime });
      if (this.samples.length > MAX_SAMPLES) this.samples.shift();
    }

    const cutoff = this.ball.simTime - TRAIL_SECONDS;
    while (this.samples.length && this.samples[0].time < cutoff) this.samples.shift();

    if (!this._visible) return;

    // ImpactForceColor.js recolors the ball's own material on every hit — mirror whatever that
    // color currently is instead of a fixed color, so the tail always reads as "the ball, a
    // moment ago" rather than clashing with it.
    const ballColor = this.ball.mesh.material?.diffuseColor;
    if (ballColor) {
      this._material.diffuseColor.copyFrom(ballColor);
      this._material.emissiveColor.copyFrom(ballColor).scaleInPlace(0.5);
    }

    const now = this.ball.simTime;
    // Newest sample first (dots[0] sits right behind the ball, tapering outward from there).
    for (let i = 0; i < this._dots.length; i++) {
      const sample = this.samples[this.samples.length - 1 - i];
      const dot = this._dots[i];
      if (!sample) {
        dot.isVisible = false;
        continue;
      }
      const age = clamp01((now - sample.time) / TRAIL_SECONDS);
      dot.position.copyFrom(sample.position);
      dot.scaling.setAll(1 - age * 0.85);
      dot.visibility = 1 - age;
      dot.isVisible = true;
    }
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._observer);
    this._dots.forEach((dot) => dot.dispose());
    this._material.dispose();
  }
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

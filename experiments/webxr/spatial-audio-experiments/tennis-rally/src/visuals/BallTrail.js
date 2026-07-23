import { Color4, MeshBuilder } from "@babylonjs/core";

const TRAIL_SECONDS = 2;
const SAMPLE_INTERVAL = 1 / 30;
const MAX_SAMPLES = Math.ceil(TRAIL_SECONDS / SAMPLE_INTERVAL) + 2;

// A short, fading tail behind the ball — read-only visual guidance, built fresh each frame
// from a small ring buffer of recent positions. Never touched by physics/hit-detection.
export class BallTrail {
  constructor(scene, ballController) {
    this.scene = scene;
    this.ball = ballController;
    this.samples = []; // { position, time }
    this._sinceLastSample = 0;
    this._visible = true;
    this.mesh = null;

    this._observer = scene.onBeforeRenderObservable.add((_, state) => this._tick(state));
  }

  setVisible(visible) {
    this._visible = visible;
    if (this.mesh) this.mesh.isVisible = visible;
  }

  _tick() {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    this._sinceLastSample += dt;
    if (this._sinceLastSample >= SAMPLE_INTERVAL) {
      this._sinceLastSample = 0;
      this.samples.push({ position: this.ball.position.clone(), time: this.ball.simTime });
      if (this.samples.length > MAX_SAMPLES) this.samples.shift();
    }

    const cutoff = this.ball.simTime - TRAIL_SECONDS;
    while (this.samples.length && this.samples[0].time < cutoff) this.samples.shift();

    if (!this._visible || this.samples.length < 2) {
      if (this.mesh) this.mesh.isVisible = false;
      return;
    }

    const points = this.samples.map((s) => s.position).concat([this.ball.position]);
    const now = this.ball.simTime;
    const colors = this.samples
      .map((s) => {
        const age = clamp01((now - s.time) / TRAIL_SECONDS);
        const alpha = (1 - age) * 0.85;
        return new Color4(1, 1, 1, alpha);
      })
      .concat([new Color4(1, 1, 1, 0.95)]);

    this.mesh = MeshBuilder.CreateLines("ballTrail", { points, colors, updatable: false, instance: null }, this.scene);
    this.mesh.isPickable = false;
    this.mesh.isVisible = this._visible;
    if (this._previousMesh) this._previousMesh.dispose();
    this._previousMesh = this.mesh;
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._observer);
    this._previousMesh?.dispose();
  }
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

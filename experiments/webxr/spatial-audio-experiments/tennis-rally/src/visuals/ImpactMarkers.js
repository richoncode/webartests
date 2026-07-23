import { Color3, MeshBuilder, StandardMaterial } from "@babylonjs/core";

const FADE_MS = 3000;
const MARKER_DIAMETER = 0.5;

// Listens for racket-hit/floor-hit events and drops a flat, fading white disc on the court
// at the impact's horizontal position (projected to the floor even for airborne racket
// contacts), purely as a visual trail of recent play — carries no simulation meaning.
export class ImpactMarkers {
  constructor(scene, eventBus) {
    this.scene = scene;
    this._active = [];
    this._visible = true;

    this._material = new StandardMaterial("impactMarkerMat", scene);
    this._material.diffuseColor = new Color3(1, 1, 1);
    this._material.emissiveColor = new Color3(0.6, 0.6, 0.6);
    this._material.alpha = 0.55;
    this._material.disableLighting = true;
    this._material.backFaceCulling = false;

    this._unsubscribe = eventBus.onAny((event) => {
      if (event.type === "racket-hit" || event.type === "floor-hit") this._spawn(event);
    });

    this._observer = scene.onBeforeRenderObservable.add(() => this._tick());
  }

  setVisible(visible) {
    this._visible = visible;
    this._active.forEach(({ mesh }) => (mesh.isVisible = visible));
  }

  _spawn(event) {
    const point = event.type === "floor-hit" ? event.court.surfacePoint : event.ball.position;
    const disc = MeshBuilder.CreateDisc(`impact-${event.type}-${event.time.toFixed(3)}`, {
      radius: MARKER_DIAMETER / 2,
      tessellation: 24
    }, this.scene);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(point.x, 0.01, point.z);
    disc.material = this._material;
    disc.isVisible = this._visible;
    disc.isPickable = false;
    this._active.push({ mesh: disc, spawnedAt: performance.now() });
  }

  _tick() {
    const now = performance.now();
    for (let i = this._active.length - 1; i >= 0; i--) {
      const item = this._active[i];
      const t = (now - item.spawnedAt) / FADE_MS;
      if (t >= 1) {
        item.mesh.dispose();
        this._active.splice(i, 1);
        continue;
      }
      item.mesh.visibility = 1 - t;
    }
  }

  dispose() {
    this._unsubscribe();
    this.scene.onBeforeRenderObservable.remove(this._observer);
    this._active.forEach(({ mesh }) => mesh.dispose());
    this._active = [];
    this._material.dispose();
  }
}

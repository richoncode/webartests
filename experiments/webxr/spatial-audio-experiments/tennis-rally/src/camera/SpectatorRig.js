import { UniversalCamera, Vector3 } from "@babylonjs/core";
import { clamp, damp, dampAngle } from "../utils/math.js";

const DEFAULTS = {
  azimuth: 0,
  distance: 21,
  height: 8.5
};

const LIMITS = {
  distanceMin: 6,
  distanceMax: 45,
  heightMin: 1.4,
  heightMax: 20
};

const HALF_LIFE = 0.18;
const KEY_AZIMUTH_SPEED = 1.1; // rad/s
const KEY_HEIGHT_SPEED = 3; // m/s
const DRAG_AZIMUTH_SENSITIVITY = 0.006; // rad per px
const DRAG_HEIGHT_SENSITIVITY = 0.02; // m per px
const WHEEL_DISTANCE_SENSITIVITY = 0.012;
const PINCH_DISTANCE_SENSITIVITY = 0.02;
const XR_AZIMUTH_SPEED = 1.4; // rad/s at full stick deflection
const XR_DISTANCE_SPEED = 6; // m/s at full stick deflection
const XR_HEIGHT_SPEED = 3.5; // m/s at full stick deflection
const STICK_DEADZONE = 0.12;

// Orbits a camera around the court center — azimuth, distance, and height are independent,
// damped state variables. Desktop drag/keys/wheel and XR controller thumbsticks all just push
// on the *target* values; update() is what actually moves the camera, smoothly, every frame.
// In XR the rig only ever repositions the camera (azimuth/distance/height) — it never touches
// rotation, so headset pitch/yaw/roll always rides untouched on top of that position.
export class SpectatorRig {
  constructor(scene, canvas, { courtCenter = Vector3.Zero() } = {}) {
    this.scene = scene;
    this.canvas = canvas;
    this.courtCenter = courtCenter;

    this.azimuth = DEFAULTS.azimuth;
    this.distance = DEFAULTS.distance;
    this.height = DEFAULTS.height;
    this.targetAzimuth = DEFAULTS.azimuth;
    this.targetDistance = DEFAULTS.distance;
    this.targetHeight = DEFAULTS.height;

    this.camera = new UniversalCamera("spectatorCamera", Vector3.Zero(), scene);
    this.camera.minZ = 0.05;
    this.camera.fov = 0.9;
    scene.activeCamera = this.camera;
    this._applyImmediate();

    this._keys = new Set();
    this._pointers = new Map(); // pointerId -> {x, y}
    this._dragButtonId = null;
    this._heightDragButtonId = null;
    this._xrManager = null;

    this._bindInput();
  }

  resetView() {
    this.targetAzimuth = DEFAULTS.azimuth;
    this.targetDistance = DEFAULTS.distance;
    this.targetHeight = DEFAULTS.height;
  }

  setXrManager(xrManager) {
    this._xrManager = xrManager;
  }

  dispose() {
    this._unbindInput?.();
    this.camera.dispose();
  }

  _applyImmediate() {
    const pos = this._positionFor(this.azimuth, this.distance, this.height);
    this.camera.position.copyFrom(pos);
    if (!this._isXrActive()) this.camera.setTarget(this.courtCenter);
  }

  _positionFor(azimuth, distance, height) {
    return new Vector3(
      this.courtCenter.x + Math.sin(azimuth) * distance,
      this.courtCenter.y + height,
      this.courtCenter.z + Math.cos(azimuth) * distance
    );
  }

  _isXrActive() {
    return Boolean(this._xrManager?.inXR);
  }

  update(dt) {
    this._applyKeyboard(dt);
    this._applyXrInput(dt);

    this.targetDistance = clamp(this.targetDistance, LIMITS.distanceMin, LIMITS.distanceMax);
    this.targetHeight = clamp(this.targetHeight, LIMITS.heightMin, LIMITS.heightMax);

    this.azimuth = dampAngle(this.azimuth, this.targetAzimuth, HALF_LIFE, dt);
    this.distance = damp(this.distance, this.targetDistance, HALF_LIFE, dt);
    this.height = damp(this.height, this.targetHeight, HALF_LIFE, dt);

    const activeCamera = this._isXrActive() ? this._xrManager.camera : this.camera;
    if (!activeCamera) return;

    const pos = this._positionFor(this.azimuth, this.distance, this.height);
    activeCamera.position.copyFrom(pos);
    if (!this._isXrActive()) {
      activeCamera.setTarget(this.courtCenter);
    }
  }

  _applyKeyboard(dt) {
    let azimuthInput = 0;
    let heightInput = 0;
    if (this._keys.has("ArrowLeft") || this._keys.has("KeyA")) azimuthInput -= 1;
    if (this._keys.has("ArrowRight") || this._keys.has("KeyD")) azimuthInput += 1;
    if (this._keys.has("ArrowUp") || this._keys.has("PageUp") || this._keys.has("KeyE")) heightInput += 1;
    if (this._keys.has("ArrowDown") || this._keys.has("PageDown") || this._keys.has("KeyQ")) heightInput -= 1;

    this.targetAzimuth += azimuthInput * KEY_AZIMUTH_SPEED * dt;
    this.targetHeight += heightInput * KEY_HEIGHT_SPEED * dt;
  }

  _applyXrInput(dt) {
    const manager = this._xrManager;
    if (!manager?.inXR) return;
    const axes = manager.getThumbstickAxes?.();
    if (!axes) return;

    const az = applyDeadzone(axes.right?.x ?? 0);
    const dist = applyDeadzone(axes.right?.y ?? 0);
    const height = applyDeadzone(axes.left?.y ?? 0);

    this.targetAzimuth += az * XR_AZIMUTH_SPEED * dt;
    this.targetDistance -= dist * XR_DISTANCE_SPEED * dt;
    this.targetHeight -= height * XR_HEIGHT_SPEED * dt;
  }

  _bindInput() {
    const canvas = this.canvas;

    const onPointerDown = (event) => {
      this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this._dragButtonId === null) {
        this._dragButtonId = event.pointerId;
        this._dragUsesHeight = event.shiftKey;
      }
    };

    const onPointerMove = (event) => {
      const previous = this._pointers.get(event.pointerId);
      if (!previous) return;
      this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (this._pointers.size >= 2) {
        this._applyPinch();
        return;
      }

      if (event.pointerId === this._dragButtonId) {
        const dx = event.clientX - previous.x;
        const dy = event.clientY - previous.y;
        this.targetAzimuth += dx * DRAG_AZIMUTH_SENSITIVITY;
        if (this._dragUsesHeight || event.shiftKey) {
          this.targetHeight -= dy * DRAG_HEIGHT_SENSITIVITY;
        }
      }
    };

    const onPointerUp = (event) => {
      this._pointers.delete(event.pointerId);
      if (event.pointerId === this._dragButtonId) this._dragButtonId = null;
      this._pinchDistance = null;
    };

    const onWheel = (event) => {
      event.preventDefault();
      this.targetDistance += event.deltaY * WHEEL_DISTANCE_SENSITIVITY;
    };

    const onKeyDown = (event) => this._keys.add(event.code);
    const onKeyUp = (event) => this._keys.delete(event.code);

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    this._unbindInput = () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }

  _applyPinch() {
    const points = Array.from(this._pointers.values());
    if (points.length < 2) return;
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (this._pinchDistance !== null && this._pinchDistance !== undefined) {
      const delta = this._pinchDistance - distance;
      this.targetDistance += delta * PINCH_DISTANCE_SENSITIVITY;
    }
    this._pinchDistance = distance;
  }
}

const applyDeadzone = (value) => {
  if (Math.abs(value) < STICK_DEADZONE) return 0;
  const sign = Math.sign(value);
  return sign * ((Math.abs(value) - STICK_DEADZONE) / (1 - STICK_DEADZONE));
};

import { Vector3, Quaternion, Matrix4 } from 'three';

const _camFwd = new Vector3();
const _Y_UP = new Vector3(0, 1, 0);
const _scratchUp = new Vector3();
const _scratchRight = new Vector3();
const _scratchTo = new Vector3();
const _scratchM = new Matrix4();

/**
 * Yaw-only quaternion extracted from a full camera quaternion. Used to
 * anchor HUD-style panels to the user's body frame so head pitch/roll
 * don't move them around. Handy if the user enters VR with their head
 * tilted (looking at a desktop screen) — the panel still ends up at a
 * sane head-level position.
 */
export function extractYawQuat(camQuat: Quaternion, out = new Quaternion()): Quaternion {
  _camFwd.set(0, 0, -1).applyQuaternion(camQuat);
  // Look-at angle (about world +Y) such that out * (0,0,-1) lies in the XZ
  // plane in the same direction as the camera forward.
  const yaw = Math.atan2(-_camFwd.x, -_camFwd.z);
  out.setFromAxisAngle(_Y_UP, yaw);
  return out;
}

/**
 * Set quaternion so the object's local +Z faces the camera AND the object's
 * local +Y matches the camera's local +Y (i.e. the panel rolls with the
 * user's head). Reads better than world-up Billboard when the user tilts
 * their head — text stays level relative to their gaze.
 */
export function faceCameraWithHeadUp(
  outQuat: Quaternion,
  panelPos: Vector3,
  cameraPos: Vector3,
  cameraQuat: Quaternion,
): void {
  // +Z direction (panel forward) = direction from panel to camera.
  _scratchTo.copy(cameraPos).sub(panelPos).normalize();
  // +Y direction (panel up) = camera's local +Y in world.
  _scratchUp.set(0, 1, 0).applyQuaternion(cameraQuat);
  // +X = +Y × +Z, then re-orthogonalise +Y = +Z × +X so the basis is right-handed.
  _scratchRight.crossVectors(_scratchUp, _scratchTo).normalize();
  _scratchUp.crossVectors(_scratchTo, _scratchRight);
  _scratchM.makeBasis(_scratchRight, _scratchUp, _scratchTo);
  outQuat.setFromRotationMatrix(_scratchM);
}

import * as THREE from 'three';

/**
 * Converts spherical placement coordinates relative to a reference point into Cartesian coordinates.
 * Azimuth angle convention: 0 degrees points along the positive X-axis (court length),
 * increasing counter-clockwise, so 90 degrees points along the positive Y-axis (court width).
 */
export function sphericalToCartesian(
  refX: number,
  refY: number,
  azimuthDeg: number,
  distance: number,
  elevation: number
): { x: number; y: number; z: number } {
  const azimuthRad = (azimuthDeg * Math.PI) / 180;
  const x = refX + distance * Math.cos(azimuthRad);
  const y = refY + distance * Math.sin(azimuthRad);
  const z = elevation;
  return { x, y, z };
}

/**
 * Converts Cartesian coordinates back into spherical placement coordinates relative to a reference point.
 */
export function cartesianToSpherical(
  refX: number,
  refY: number,
  x: number,
  y: number,
  z: number
): { azimuthDeg: number; distance: number; elevation: number } {
  const dx = x - refX;
  const dy = y - refY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  let azimuthRad = Math.atan2(dy, dx);
  if (azimuthRad < 0) {
    azimuthRad += 2 * Math.PI;
  }
  const azimuthDeg = (azimuthRad * 180) / Math.PI;
  const elevation = z;
  return { azimuthDeg, distance, elevation };
}

/**
 * Calculates each camera's vergence rotation independently to look directly at a zero-parallax target.
 * Assumes Z is vertical.
 */
export function calculateVergenceQuaternion(
  cameraPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  rigOrientation: THREE.Quaternion
): THREE.Quaternion {
  const lookMatrix = new THREE.Matrix4();
  // Get the rig's local up direction to keep camera oriented relative to the rig
  const up = new THREE.Vector3(0, 0, 1).applyQuaternion(rigOrientation);
  lookMatrix.lookAt(cameraPos, targetPos, up);
  
  const q = new THREE.Quaternion();
  q.setFromRotationMatrix(lookMatrix);
  return q;
}

/**
 * Estimates disparity in pixels for a target point given the cameras' projection.
 * Disparity (px) = f * B * (1/Z_target - 1/Z_actual) / pixel_pitch
 * We can approximate it in normalized screen coordinates or pixels using simple projective math:
 * x_left = f * (x - B/2) / z
 * x_right = f * (x + B/2) / z
 * Disparity = screenWidth * (x_left - x_right) / 2
 */
export function estimateDisparity(
  leftCamera: THREE.PerspectiveCamera,
  rightCamera: THREE.PerspectiveCamera,
  point: THREE.Vector3,
  canvasWidth: number
): number {
  const pLeft = point.clone().project(leftCamera);
  const pRight = point.clone().project(rightCamera);
  
  // Normalized device coordinates (NDC) range from -1 to 1.
  // Horizontal disparity in NDC:
  const disparityNDC = pLeft.x - pRight.x;
  
  // Convert horizontal disparity to pixels:
  return (disparityNDC * canvasWidth) / 2;
}

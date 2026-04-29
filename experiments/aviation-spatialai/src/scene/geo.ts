import { Vector3, Matrix4, Quaternion } from 'three';

// WGS-84 ellipsoid constants.
export const A = 6378137.0;          // semi-major axis (m)
const F = 1 / 298.257223563;          // flattening
const E2 = F * (2 - F);               // first eccentricity²

/** lat/lon (deg) + height (m, MSL ≈ ellipsoidal) → ECEF (m). */
export function geodeticToECEF(latDeg: number, lonDeg: number, hM: number, out = new Vector3()) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const N = A / Math.sqrt(1 - E2 * sinLat * sinLat);
  out.set(
    (N + hM) * cosLat * Math.cos(lon),
    (N + hM) * cosLat * Math.sin(lon),
    (N * (1 - E2) + hM) * sinLat,
  );
  return out;
}

/**
 * Build the rotation matrix that takes an ECEF vector and expresses it in the
 * local ENU frame at (refLat, refLon). Rows are East, North, Up basis vectors
 * expressed in ECEF coords. Translation column is zero — rotation only.
 */
export function ecefToEnuMatrix4(refLatDeg: number, refLonDeg: number, out = new Matrix4()) {
  const lat = (refLatDeg * Math.PI) / 180;
  const lon = (refLonDeg * Math.PI) / 180;
  const sLat = Math.sin(lat), cLat = Math.cos(lat);
  const sLon = Math.sin(lon), cLon = Math.cos(lon);
  // Three.js Matrix4.set takes ROW-major arguments.
  out.set(
    -sLon,        cLon,         0,    0,
    -sLat * cLon, -sLat * sLon, cLat, 0,
     cLat * cLon,  cLat * sLon, sLat, 0,
     0,           0,            0,    1,
  );
  return out;
}

// Module-scope scratch vectors so per-frame conversions don't allocate.
const _scratchP = new Vector3();
const _scratchRef = new Vector3();
const _scratchM = new Matrix4();

/**
 * Convert a geodetic point to scene-local ENU coordinates relative to the
 * reference point, scaled by `scale`. +X = east, +Y = north, +Z = up.
 *
 * This is the canonical "place this lat/lon/alt in the scene" call.
 */
export function geodeticToSceneENU(
  latDeg: number, lonDeg: number, hM: number,
  refLatDeg: number, refLonDeg: number, refHM: number,
  scale: number,
  out = new Vector3(),
) {
  geodeticToECEF(latDeg, lonDeg, hM, _scratchP);
  geodeticToECEF(refLatDeg, refLonDeg, refHM, _scratchRef);
  _scratchP.sub(_scratchRef);
  ecefToEnuMatrix4(refLatDeg, refLonDeg, _scratchM);
  _scratchP.applyMatrix4(_scratchM);
  out.copy(_scratchP).multiplyScalar(scale);
  return out;
}

// Reusable axis vectors and intermediate quaternions for HPR composition.
const _zUp     = new Vector3(0, 0, 1);
const _bodyNegY = new Vector3(0, -1, 0);
const _bodyX   = new Vector3(1, 0, 0);
const _qPitch  = new Quaternion();
const _qRoll   = new Quaternion();

/**
 * Aircraft body→scene quaternion at heading/pitch/roll (deg).
 *
 * Body convention: +X = forward (nose), +Y = LEFT (port wing), +Z = up (fin).
 * Scene ENU: +X = east, +Y = north, +Z = up.
 *
 * - Heading is clockwise from north (0° = north, 90° = east).
 * - Pitch is nose-up positive.
 * - Roll is bank-right positive.
 *
 * At heading=0: body forward (+X) → scene north (+Y). The base yaw rotation
 * around scene +Z is therefore (π/2 − heading_rad).
 */
export function aircraftSceneQuaternion(
  headingDeg: number, pitchDeg = 0, rollDeg = 0,
  out = new Quaternion(),
): Quaternion {
  const yaw = Math.PI / 2 - (headingDeg * Math.PI) / 180;
  out.setFromAxisAngle(_zUp, yaw);
  if (pitchDeg !== 0) {
    _qPitch.setFromAxisAngle(_bodyNegY, (pitchDeg * Math.PI) / 180);
    out.multiply(_qPitch);
  }
  if (rollDeg !== 0) {
    _qRoll.setFromAxisAngle(_bodyX, (rollDeg * Math.PI) / 180);
    out.multiply(_qRoll);
  }
  return out;
}

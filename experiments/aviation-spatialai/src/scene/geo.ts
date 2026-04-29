import { Vector3, Matrix4, Quaternion } from 'three';

// WGS-84 ellipsoid constants.
const A = 6378137.0;          // semi-major axis (m)
const F = 1 / 298.257223563;  // flattening
const E2 = F * (2 - F);       // first eccentricity²

/** lat/lon (deg) + height (m, MSL ≈ ellipsoidal for our precision) → ECEF (m). */
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
 * Build a local East-North-Up (ENU) frame at the given geodetic position.
 * Returns rotation matrix that takes ENU coords → ECEF coords.
 */
export function enuToEcefMatrix(latDeg: number, lonDeg: number, out = new Matrix4()) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sLat = Math.sin(lat), cLat = Math.cos(lat);
  const sLon = Math.sin(lon), cLon = Math.cos(lon);
  // Columns: East, North, Up basis vectors expressed in ECEF.
  out.set(
    -sLon, -sLat * cLon, cLat * cLon, 0,
     cLon, -sLat * sLon, cLat * sLon, 0,
        0,         cLat,        sLat, 0,
        0,            0,           0, 1,
  );
  return out;
}

/**
 * Aircraft body orientation from heading/pitch/roll (deg) at a geodetic point,
 * yielding a Three.js quaternion to apply to a model whose forward is +X,
 * up is +Z. (We orient the local ENU first, then yaw/pitch/roll inside it.)
 */
const _enu = new Matrix4();
const _q1 = new Quaternion();
const _q2 = new Quaternion();
const _axisUp = new Vector3(0, 0, 1);
const _axisEast = new Vector3(1, 0, 0);
const _axisNorth = new Vector3(0, 1, 0);

export function aircraftEcefQuaternion(
  latDeg: number, lonDeg: number,
  headingDeg: number, pitchDeg = 0, rollDeg = 0,
  out = new Quaternion(),
) {
  // ENU → ECEF rotation (extracted from the matrix above).
  enuToEcefMatrix(latDeg, lonDeg, _enu);
  out.setFromRotationMatrix(_enu);
  // Heading: rotate around local Up (clockwise from north → negate angle for
  // a y-up-axis aircraft; we use ENU where +Z=Up, so rotate by -heading).
  _q1.setFromAxisAngle(_axisUp, (-headingDeg * Math.PI) / 180);
  // Pitch: nose up positive — rotate around local East.
  _q2.setFromAxisAngle(_axisEast, (pitchDeg * Math.PI) / 180);
  _q1.multiply(_q2);
  // Roll: bank — around local North (which after heading is body-forward).
  _q2.setFromAxisAngle(_axisNorth, (rollDeg * Math.PI) / 180);
  _q1.multiply(_q2);
  out.multiply(_q1);
  return out;
}

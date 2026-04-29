import { useMemo, useRef } from 'react';
import { Vector3, Quaternion, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { geodeticToECEF, aircraftEcefQuaternion } from './geo';
import type { FlightState } from '../data/types';

interface Props {
  flight: FlightState;
  selected: boolean;
  onClick: () => void;
  /** Scene unit scale: ECEF metres → world units. */
  worldScale: number;
  /** ECEF origin we're translating world by (camera-pivot) */
  worldOrigin: Vector3;
}

const _pos = new Vector3();
const _q = new Quaternion();

// Procedural aircraft mesh — fuselage + wings + tail. Fast, no asset fetch,
// looks like a plane from any angle. Total model length ≈ 35 m at unit scale.
export function Aircraft({ flight, selected, onClick, worldScale, worldOrigin }: Props) {
  const ref = useRef<Group>(null);
  const color = selected ? '#ff7a3a' : '#9bdcff';
  const emissive = selected ? '#ff5500' : '#3b6a90';

  useFrame(() => {
    if (!ref.current) return;
    geodeticToECEF(flight.lat, flight.lon, flight.baroAltitudeM, _pos);
    _pos.sub(worldOrigin).multiplyScalar(worldScale);
    ref.current.position.copy(_pos);
    aircraftEcefQuaternion(
      flight.lat, flight.lon,
      flight.trueTrackDeg,
      // Pitch derived from vertical rate vs forward speed (small angle approx).
      flight.velocityMps > 5
        ? (Math.atan2(flight.verticalRateMps, flight.velocityMps) * 180) / Math.PI
        : 0,
      0, // roll unavailable from ADS-B; leave neutral
      _q,
    );
    ref.current.quaternion.copy(_q);
  });

  // Aircraft drawn 1:1 in metres; scaled by worldScale just like position.
  const s = useMemo(() => worldScale, [worldScale]);
  const FU_LEN = 36 * s, FU_R = 1.6 * s;
  const WING_SPAN = 34 * s, WING_C = 5 * s, WING_T = 0.5 * s;
  const TAIL_SPAN = 12 * s, TAIL_C = 3 * s;
  const FIN_H = 5 * s;

  return (
    <group ref={ref} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Fuselage along +X */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[FU_R, FU_R * 0.6, FU_LEN, 12]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.6 : 0.2} />
      </mesh>
      {/* Main wings — broad along Y (north in body frame), thin in Z */}
      <mesh>
        <boxGeometry args={[WING_C, WING_SPAN, WING_T]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.5 : 0.15} />
      </mesh>
      {/* Horizontal stabiliser */}
      <mesh position={[-FU_LEN * 0.42, 0, 0]}>
        <boxGeometry args={[TAIL_C, TAIL_SPAN, WING_T]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.5 : 0.15} />
      </mesh>
      {/* Vertical fin */}
      <mesh position={[-FU_LEN * 0.42, 0, FIN_H * 0.5]}>
        <boxGeometry args={[TAIL_C, WING_T, FIN_H]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.5 : 0.15} />
      </mesh>
      {selected && (
        <pointLight color="#ff8a48" intensity={1500 * s * s} distance={500 * s} decay={2} />
      )}
    </group>
  );
}

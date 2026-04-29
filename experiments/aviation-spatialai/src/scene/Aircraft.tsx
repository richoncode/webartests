import { useMemo, useRef } from 'react';
import { Vector3, Quaternion, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { geodeticToSceneENU, aircraftSceneQuaternion } from './geo';
import type { FlightState } from '../data/types';

export interface SceneRef {
  refLat: number; refLon: number; refH: number;
  scale: number;
}

interface Props {
  flight: FlightState;
  selected: boolean;
  onClick: () => void;
  scene: SceneRef;
}

const _pos = new Vector3();
const _q = new Quaternion();

/**
 * Procedural aircraft mesh — fuselage + wings + tail. Reliable, no asset
 * fetch. Lives in scene-ENU: +X=east, +Y=north, +Z=up. Body convention is
 * +X=forward, +Y=left, +Z=up; orientation handled by aircraftSceneQuaternion.
 */
export function Aircraft({ flight, selected, onClick, scene }: Props) {
  const ref = useRef<Group>(null);
  const color = selected ? '#ff7a3a' : '#9bdcff';
  const emissive = selected ? '#ff5500' : '#3b6a90';

  useFrame(() => {
    if (!ref.current) return;
    geodeticToSceneENU(
      flight.lat, flight.lon, flight.baroAltitudeM,
      scene.refLat, scene.refLon, scene.refH, scene.scale, _pos,
    );
    ref.current.position.copy(_pos);
    aircraftSceneQuaternion(
      flight.trueTrackDeg,
      // Pitch ≈ atan2(verticalRate, forwardSpeed), small-angle.
      flight.velocityMps > 5
        ? (Math.atan2(flight.verticalRateMps, flight.velocityMps) * 180) / Math.PI
        : 0,
      0, // roll unavailable from ADS-B
      _q,
    );
    ref.current.quaternion.copy(_q);
  });

  // Aircraft are rendered visually larger than 1:1 so they're legible from
  // a typical orbit-camera distance. A real 36 m airliner is sub-pixel from
  // 500 m at scene scale; multiplying lets the demo read clearly without
  // needing the camera to dive into the bbox. Position is still 1:1.
  const VIS = 20;
  const s = useMemo(() => scene.scale * VIS, [scene.scale]);
  const FU_LEN = 36 * s, FU_R = 1.6 * s;
  const WING_SPAN = 34 * s, WING_C = 5 * s, WING_T = 0.5 * s;
  const TAIL_SPAN = 12 * s, TAIL_C = 3 * s;
  const FIN_H = 5 * s;

  return (
    <group ref={ref} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Fuselage along body +X */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[FU_R, FU_R * 0.6, FU_LEN, 12]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.6 : 0.2} />
      </mesh>
      {/* Wings: span along body Y, thin in Z */}
      <mesh>
        <boxGeometry args={[WING_C, WING_SPAN, WING_T]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={selected ? 0.5 : 0.15} />
      </mesh>
      {/* Horizontal stabiliser (rear) */}
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

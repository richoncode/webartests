import { useRef } from 'react';
import { Vector3, Quaternion, Group, DoubleSide } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import { extractYawQuat } from './orient';
import type { FlightState } from '../data/types';

interface Props {
  flights: FlightState[];
  selectedId: string | null;
  hoveredId: string | null;
}

const VISIBLE = 8;
// Offset in head-relative coords (metres). Slightly left, slightly down,
// 0.7 m forward — comfortable read distance, out of the central FOV.
const OFFSET_X = -0.4;
const OFFSET_Y = -0.15;
const OFFSET_Z = -0.7;
const PANEL_W  = 0.35;
const PANEL_H  = 0.45;

/**
 * 3D aircraft list anchored to the user's headset — visible only while an
 * XR session is active. Mirrors the desktop HUD list. Top {VISIBLE} flights
 * by altitude descending. Selected is highlighted orange; hovered (look /
 * controller-point) is highlighted cyan.
 */
export function VRListPanel({ flights, selectedId, hoveredId }: Props) {
  const inXR = useXR((s) => !!s.session);
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);

  const _camPos = new Vector3();
  const _camQuat = new Quaternion();
  const _yawQuat = new Quaternion();
  const _localOffset = new Vector3();

  useFrame(() => {
    if (!inXR || !groupRef.current) return;
    camera.getWorldPosition(_camPos);
    camera.getWorldQuaternion(_camQuat);
    // Yaw-only: ignore pitch/roll so the panel stays at a stable
    // body-relative position even if the user entered VR with their head
    // tilted (e.g. looking down at a desktop monitor).
    extractYawQuat(_camQuat, _yawQuat);
    _localOffset.set(OFFSET_X, OFFSET_Y, OFFSET_Z).applyQuaternion(_yawQuat);
    groupRef.current.position.copy(_camPos).add(_localOffset);
    groupRef.current.quaternion.copy(_yawQuat);
  });

  if (!inXR) return null;

  // Top N flights by altitude descending so the higher ones (typically the
  // more interesting commercial traffic) are at the top.
  const sorted = [...flights]
    .filter((f) => !f.onGround)
    .sort((a, b) => b.baroAltitudeM - a.baroAltitudeM)
    .slice(0, VISIBLE);

  return (
    <group ref={groupRef}>
      {/* Backdrop */}
      <mesh>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial color="#0a121e" transparent opacity={0.86} side={DoubleSide} />
      </mesh>
      {/* Border */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[PANEL_W + 0.005, PANEL_H + 0.005]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} side={DoubleSide} />
      </mesh>

      <Text fontSize={0.022} color="#9bdcff" anchorX="left" anchorY="top"
            position={[-PANEL_W/2 + 0.015, PANEL_H/2 - 0.015, 0.001]}>
        AIRCRAFT
      </Text>
      <Text fontSize={0.014} color="#5a7a90" anchorX="right" anchorY="top"
            position={[PANEL_W/2 - 0.015, PANEL_H/2 - 0.018, 0.001]}>
        {`${flights.length} total`}
      </Text>

      {sorted.map((f, i) => {
        const isSelected = f.icao24 === selectedId;
        const isHovered  = f.icao24 === hoveredId;
        const color = isSelected ? '#ff7a3a' : isHovered ? '#9bdcff' : '#cdd9e2';
        const callsign = (f.callsign?.trim() || f.icao24).toUpperCase().padEnd(8);
        const altFt = Math.round(f.baroAltitudeM * 3.28084).toLocaleString().padStart(7);
        const speedKt = Math.round(f.velocityMps * 1.94384).toString().padStart(3);
        const yTop = PANEL_H/2 - 0.06 - i * 0.045;
        return (
          <group key={f.icao24} position={[-PANEL_W/2 + 0.015, yTop, 0.001]}>
            <Text fontSize={0.018} color={color} anchorX="left" anchorY="top"
                  font={undefined /* default; monospaced look comes from padEnd/padStart */}>
              {callsign}
            </Text>
            <Text fontSize={0.013} color="#8aa1b3" anchorX="left" anchorY="top"
                  position={[0.0, -0.022, 0]}>
              {`${altFt} ft  ${speedKt} kt`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

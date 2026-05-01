import { useRef, useState } from 'react';
import { Vector3, Group, DoubleSide } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import type { FlightState } from '../data/types';

interface Props {
  flights: FlightState[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
}

const VISIBLE = 8;
// Body-frame offsets in metres. Tuned so the panel sits in the user's
// peripheral view to the LEFT, slightly below eye level, at arm's reach.
const FORWARD = 0.6;   // metres in front of the user
const LEFT    = 0.45;  // metres to the user's left
const DOWN    = 0.05;  // metres below eye level (basically at eye height)

const PANEL_W  = 0.45;
const PANEL_H  = 0.55;

const Y_UP = new Vector3(0, 1, 0);
const _camPos     = new Vector3();
const _camFwdRaw  = new Vector3();
const _bodyFwd    = new Vector3();
const _bodyRight  = new Vector3();
const _labelPos   = new Vector3();

/**
 * 3D aircraft list anchored to the user's BODY frame (yaw-only — no head
 * pitch/roll), so it stays at a stable place in the user's peripheral view
 * regardless of where they're currently looking. Visible only while an XR
 * session is active. Top {VISIBLE} flights by altitude descending. Selected
 * highlighted orange; hovered (look / controller-point) highlighted cyan.
 */
export function VRListPanel({ flights, selectedId, hoveredId, onSelect }: Props) {
  const inXR = useXR((s) => !!s.session);
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);

  const [detachedPos, setDetachedPos] = useState<Vector3 | null>(null);
  const [dragState, setDragState] = useState<{
    pointerId: number;
    distance: number;
    offset: Vector3;
  } | null>(null);

  const onPointerDown = (e: any) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    if (!groupRef.current) return;
    setDragState({
      pointerId: e.pointerId,
      distance: e.distance,
      offset: groupRef.current.position.clone().sub(e.point),
    });
    if (!detachedPos) {
      setDetachedPos(groupRef.current.position.clone());
    }
  };

  const onPointerMove = (e: any) => {
    if (dragState && e.pointerId === dragState.pointerId) {
      e.stopPropagation();
      const newPos = e.ray.origin.clone().add(e.ray.direction.clone().multiplyScalar(dragState.distance));
      newPos.add(dragState.offset);
      setDetachedPos(newPos);
    }
  };

  const onPointerUp = (e: any) => {
    if (dragState && e.pointerId === dragState.pointerId) {
      e.stopPropagation();
      e.target.releasePointerCapture(e.pointerId);
      setDragState(null);
    }
  };

  useFrame(() => {
    if (!inXR || !groupRef.current) return;
    camera.getWorldPosition(_camPos);
    
    if (detachedPos) {
      // User dragged it: stay at detached position
      groupRef.current.position.copy(detachedPos);
    } else {
      // Default: anchor to user peripheral view
      _camFwdRaw.set(0, 0, -1).applyQuaternion(camera.quaternion);
      _bodyFwd.set(_camFwdRaw.x, 0, _camFwdRaw.z);
      if (_bodyFwd.lengthSq() > 1e-6) {
        _bodyFwd.normalize();
        _bodyRight.crossVectors(_bodyFwd, Y_UP).normalize();
        _labelPos.copy(_camPos)
          .addScaledVector(_bodyFwd,    FORWARD)
          .addScaledVector(_bodyRight, -LEFT)
          .addScaledVector(Y_UP,       -DOWN);
        groupRef.current.position.copy(_labelPos);
      }
    }
    
    // Simple look at user position, reversed so +Z faces the user
    const px = groupRef.current.position.x;
    const py = groupRef.current.position.y;
    const pz = groupRef.current.position.z;
    _labelPos.set(
      px + (px - _camPos.x),
      py + (py - _camPos.y),
      pz + (pz - _camPos.z)
    );
    groupRef.current.up.set(0, 1, 0);
    groupRef.current.lookAt(_labelPos);
  });

  if (!inXR) return null;

  const sorted = [...flights]
    .filter((f) => !f.onGround)
    .sort((a, b) => b.baroAltitudeM - a.baroAltitudeM)
    .slice(0, VISIBLE);

  return (
    <group ref={groupRef}>
      {/* Backdrop */}
      <mesh
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerUp}
      >
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial color="#0a121e" transparent opacity={0.86} side={DoubleSide} />
      </mesh>
      {/* Border */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[PANEL_W + 0.01, PANEL_H + 0.01]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} side={DoubleSide} />
      </mesh>

      <Text fontSize={0.028} color="#9bdcff" anchorX="left" anchorY="top"
            position={[-PANEL_W/2 + 0.02, PANEL_H/2 - 0.02, 0.001]}>
        AIRCRAFT
      </Text>
      <Text fontSize={0.018} color="#5a7a90" anchorX="right" anchorY="top"
            position={[PANEL_W/2 - 0.02, PANEL_H/2 - 0.025, 0.001]}>
        {`${flights.length} total`}
      </Text>

      {sorted.map((f, i) => {
        const isSelected = f.icao24 === selectedId;
        const isHovered  = f.icao24 === hoveredId;
        const color = isSelected ? '#ff7a3a' : isHovered ? '#9bdcff' : '#cdd9e2';
        const callsign = (f.callsign?.trim() || f.icao24).toUpperCase();
        const altFt = Math.round(f.baroAltitudeM * 3.28084).toLocaleString();
        const speedKt = Math.round(f.velocityMps * 1.94384);
        const yTop = PANEL_H/2 - 0.075 - i * 0.055;
        return (
          <group 
            key={f.icao24} 
            position={[-PANEL_W/2 + 0.02, yTop, 0.001]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(f.icao24);
            }}
          >
            {/* Invisible interaction hit-box so the whole row is clickable */}
            <mesh position={[PANEL_W/2 - 0.02, -0.015, 0]}>
              <planeGeometry args={[PANEL_W - 0.04, 0.05]} />
              <meshBasicMaterial visible={false} />
            </mesh>
            <Text fontSize={0.022} color={color} anchorX="left" anchorY="top">
              {callsign}
            </Text>
            <Text fontSize={0.016} color="#8aa1b3" anchorX="left" anchorY="top"
                  position={[0, -0.026, 0]}>
              {`${altFt} ft  ${speedKt} kt`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

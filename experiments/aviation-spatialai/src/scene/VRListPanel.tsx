import { useRef } from 'react';
import { Vector3, Group, DoubleSide } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import type { FlightState } from '../data/types';

interface Props {
  flights: FlightState[];
  selectedId: string | null;
  hoveredId: string | null;
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
export function VRListPanel({ flights, selectedId, hoveredId }: Props) {
  const inXR = useXR((s) => !!s.session);
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (!inXR || !groupRef.current) return;
    camera.getWorldPosition(_camPos);
    // Compute the user's body-frame axes from the camera's forward direction
    // projected onto the horizontal plane. (Pitch/roll get dropped, so the
    // panel never ends up tilted up at the ceiling or rolled sideways.)
    _camFwdRaw.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _bodyFwd.set(_camFwdRaw.x, 0, _camFwdRaw.z);
    if (_bodyFwd.lengthSq() < 1e-6) return;
    _bodyFwd.normalize();
    _bodyRight.crossVectors(_bodyFwd, Y_UP).normalize();
    // Position = camPos + forward·FORWARD + right·(-LEFT) + up·(-DOWN)
    _labelPos.copy(_camPos)
      .addScaledVector(_bodyFwd,    FORWARD)
      .addScaledVector(_bodyRight, -LEFT)
      .addScaledVector(Y_UP,       -DOWN);
    groupRef.current.position.copy(_labelPos);
    // Orient the panel to face the user with a world-up reference. lookAt on
    // a non-camera Object3D makes its local +Z face the target, which is
    // exactly the side that <Text> reads from.
    groupRef.current.up.set(0, 1, 0);
    groupRef.current.lookAt(_camPos);
  });

  if (!inXR) return null;

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
          <group key={f.icao24} position={[-PANEL_W/2 + 0.02, yTop, 0.001]}>
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

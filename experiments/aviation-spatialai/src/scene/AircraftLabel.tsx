import { useRef } from 'react';
import { Vector3, Quaternion, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { geodeticToSceneENU } from './geo';
import { deadReckon } from '../data/deadReckon';
import type { FlightState } from '../data/types';
import type { SceneRef } from './Aircraft';

interface Props {
  flight: FlightState;
  scene: SceneRef;
  /** If true, slightly bigger / brighter (used for the selected aircraft). */
  emphasised?: boolean;
}

const _camPos    = new Vector3();
const _camQuat   = new Quaternion();
const _scenePos  = new Vector3();
const _planePos  = new Vector3();
const _direction = new Vector3();
const _labelPos  = new Vector3();
const _lookTarget = new Vector3();
const _upVec      = new Vector3();

// Inverse of the SCENE_ROTATION applied in App.tsx — for a scene-ENU point
// (x, y, z), the corresponding world-Y-up coordinate is (x, z, -y).
function sceneToWorld(scene: Vector3, world: Vector3) {
  world.set(scene.x, scene.z, -scene.y);
}

/**
 * Floating callsign / altitude label for an aircraft. Positioned along the
 * camera→aircraft ray (50% of the way, capped at a comfortable distance) so
 * it's always readable regardless of how far the plane is. Billboard with
 * lockX keeps it standing vertical — without that, the panel tilts to face
 * the camera and ends up flat-on-the-ground when the camera is high.
 *
 * Lives in WORLD-Y-up coords (canvas root, NOT inside the rotated scene
 * group), so positioning math stays in the same frame the camera and
 * controllers operate in.
 */
export function AircraftLabel({ flight, scene, emphasised = false }: Props) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    state.camera.getWorldPosition(_camPos);
    state.camera.getWorldQuaternion(_camQuat);
    const dr = deadReckon(flight, Date.now() / 1000);
    geodeticToSceneENU(
      dr.lat, dr.lon, dr.altM,
      scene.refLat, scene.refLon, scene.refH, scene.scale, _scenePos,
    );
    sceneToWorld(_scenePos, _planePos);
    // Position at the plane, then moved above the plane
    _labelPos.copy(_planePos);
    _labelPos.y += 0.8; // Floating ~80m above the plane
    ref.current.position.copy(_labelPos);

    // Simple robust billboard: lookAt points -Z at camera, rotateY(PI) spins +Z to face camera
    ref.current.up.set(0, 1, 0);
    ref.current.lookAt(_camPos);
    ref.current.rotateY(Math.PI);
  });

  const callsign = (flight.callsign?.trim() || flight.icao24).toUpperCase();
  const altFt   = Math.round(flight.baroAltitudeM * 3.28084).toLocaleString();
  const speedKt = Math.round(flight.velocityMps * 1.94384);
  const headColor = emphasised ? '#ffaa55' : '#dff7ff';
  const subColor  = emphasised ? '#ff8a48' : '#9bc4dc';
  const headSize  = emphasised ? 0.13 : 0.10;
  const subSize   = emphasised ? 0.085 : 0.07;

  return (
    <group ref={ref}>
      <Text
        fontSize={headSize}
        color={headColor}
        anchorX="center" anchorY="bottom"
        outlineWidth={0.006}
        outlineColor="#04101e"
      >
        {callsign}
      </Text>
      <Text
        fontSize={subSize}
        color={subColor}
        anchorX="center" anchorY="top"
        position={[0, -0.02, 0]}
        outlineWidth={0.004}
        outlineColor="#04101e"
      >
        {`${altFt} ft  ·  ${speedKt} kt`}
      </Text>
    </group>
  );
}

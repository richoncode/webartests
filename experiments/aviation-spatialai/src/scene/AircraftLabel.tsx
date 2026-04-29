import { useRef } from 'react';
import { Vector3, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { geodeticToSceneENU } from './geo';
import { deadReckon } from '../data/deadReckon';
import type { FlightState } from '../data/types';
import type { SceneRef } from './Aircraft';

const _pos = new Vector3();

/**
 * Compact callsign + altitude label that hovers above an aircraft and always
 * faces the camera. Used for the look-at / point-at hover state — separate
 * (and smaller) than the LatexPanel that's shown on selection.
 */
export function AircraftLabel({ flight, scene }: { flight: FlightState; scene: SceneRef }) {
  const ref = useRef<Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    const dr = deadReckon(flight, Date.now() / 1000);
    geodeticToSceneENU(
      dr.lat, dr.lon, dr.altM,
      scene.refLat, scene.refLon, scene.refH, scene.scale, _pos,
    );
    // Lift along scene +Z (up) — parent rotation maps to world +Y.
    _pos.z += 70 * scene.scale;
    ref.current.position.copy(_pos);
  });

  const callsign = (flight.callsign?.trim() || flight.icao24).toUpperCase();
  const altFt = Math.round(flight.baroAltitudeM * 3.28084).toLocaleString();
  const speedKt = Math.round(flight.velocityMps * 1.94384);

  return (
    <group ref={ref}>
      <Billboard>
        <Text fontSize={1.6} color="#dff7ff" anchorX="center" anchorY="bottom" outlineWidth={0.06} outlineColor="#04101e">
          {callsign}
        </Text>
        <Text
          fontSize={1.0}
          color="#9bc4dc"
          anchorX="center"
          anchorY="top"
          position={[0, -0.2, 0]}
          outlineWidth={0.04}
          outlineColor="#04101e"
        >
          {`${altFt} ft  ·  ${speedKt} kt`}
        </Text>
      </Billboard>
    </group>
  );
}

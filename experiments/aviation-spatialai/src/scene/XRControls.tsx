import { useFrame } from '@react-three/fiber';
import { useXRInputSourceState } from '@react-three/xr';
import { Vector3, Quaternion } from 'three';
import { geodeticToSceneENU } from './geo';
import type { FlightState } from '../data/types';
import type { SceneRef } from './Aircraft';

/**
 * In an XR session: holding the right-controller trigger pulls the user
 * along behind the selected aircraft in scene-ENU (+Z = up). The rig sits
 * ~120 m behind the heading and ~25 m above.
 */
const _aircraftPos = new Vector3();
const _offset = new Vector3();
const _q = new Quaternion();
const _forward = new Vector3();

interface Props {
  selected: FlightState | null;
  scene: SceneRef;
  rigRef: React.MutableRefObject<{ position: Vector3; quaternion: Quaternion } | null>;
}

export function XRControls({ selected, scene, rigRef }: Props) {
  const right = useXRInputSourceState('controller', 'right');

  useFrame(() => {
    if (!selected || !right || !rigRef.current) return;
    const trigger = right.gamepad?.['xr-standard-trigger']?.button ?? 0;
    if (trigger < 0.4) return;

    geodeticToSceneENU(
      selected.lat, selected.lon, selected.baroAltitudeM,
      scene.refLat, scene.refLon, scene.refH, scene.scale, _aircraftPos,
    );
    // Forward direction in scene-ENU from heading (CW from north).
    // heading=0 → north → (+Y); heading=90 → east → (+X).
    const hdg = (selected.trueTrackDeg * Math.PI) / 180;
    _forward.set(Math.sin(hdg), Math.cos(hdg), 0).normalize();
    // Rig: 120 m behind, 25 m above.
    _offset.copy(_forward).multiplyScalar(-120 * scene.scale);
    _offset.z = 25 * scene.scale;
    rigRef.current.position.copy(_aircraftPos).add(_offset);
    // Face along forward.
    _q.setFromUnitVectors(new Vector3(0, 0, -1), _forward);
    rigRef.current.quaternion.copy(_q);
  });
  return null;
}

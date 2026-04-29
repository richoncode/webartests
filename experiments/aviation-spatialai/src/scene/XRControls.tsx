import { useFrame } from '@react-three/fiber';
import { useXRInputSourceState } from '@react-three/xr';
import { Vector3, Quaternion } from 'three';
import { geodeticToECEF } from './geo';
import type { FlightState } from '../data/types';

/**
 * In an XR session: holding the right-controller trigger pulls the user
 * along behind the selected aircraft (~120 m back, 25 m up, looking forward).
 * Releasing returns control to the headset.
 */
const _aircraftPos = new Vector3();
const _offset = new Vector3();
const _q = new Quaternion();
const _forward = new Vector3();

interface Props {
  selected: FlightState | null;
  worldScale: number;
  worldOrigin: Vector3;
  /** Origin object whose transform represents user position in scene. */
  rigRef: React.MutableRefObject<{ position: Vector3; quaternion: Quaternion } | null>;
}

export function XRControls({ selected, worldScale, worldOrigin, rigRef }: Props) {
  const right = useXRInputSourceState('controller', 'right');

  useFrame(() => {
    if (!selected || !right || !rigRef.current) return;
    const trigger = right.gamepad?.['xr-standard-trigger']?.button ?? 0;
    if (trigger < 0.4) return;

    geodeticToECEF(selected.lat, selected.lon, selected.baroAltitudeM, _aircraftPos);
    _aircraftPos.sub(worldOrigin).multiplyScalar(worldScale);

    // Derive forward from heading (north-clockwise). Build offset behind the
    // aircraft in scene-local frame and slot the rig in.
    const hdg = (selected.trueTrackDeg * Math.PI) / 180;
    _forward.set(Math.sin(hdg), Math.cos(hdg), 0).normalize();
    _offset.copy(_forward).multiplyScalar(-120 * worldScale);
    _offset.z += 25 * worldScale;
    rigRef.current.position.copy(_aircraftPos).add(_offset);
    _q.setFromUnitVectors(new Vector3(0, 0, -1), _forward);
    rigRef.current.quaternion.copy(_q);
  });
  return null;
}

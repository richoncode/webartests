import { useRef } from 'react';
import { Vector3, Quaternion, Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useXRInputSourceState, XRSpace } from '@react-three/xr';
import { geodeticToSceneENU } from './geo';
import { deadReckon } from '../data/deadReckon';
import type { FlightState } from '../data/types';
import type { SceneRef } from './Aircraft';

interface Props {
  flights: FlightState[];
  scene: SceneRef;
  onHover: (id: string | null) => void;
}

const FOV_HALF_RAD     = (3.0 * Math.PI) / 180;   // narrow cone for camera look
const RAY_HALF_RAD     = (1.5 * Math.PI) / 180;   // tighter cone for controllers / hands
const RAY_HIT_DIST_MAX = 5_000_000;               // metres — generous

const _camPos = new Vector3();
const _camFwd = new Vector3();
const _scenePos = new Vector3();
const _worldPos = new Vector3();
const _toAircraft = new Vector3();

// Convert a position from scene-ENU coords (where the rotated group lives)
// into world Y-up coords. Inverse of the SCENE_ROTATION (-π/2 around X).
//   scene (x, y, z)  →  world (x, z, -y)
function sceneToWorld(scene: Vector3, world: Vector3) {
  world.set(scene.x, scene.z, -scene.y);
}

/**
 * Probe attached to a controller's targetRaySpace. The wrapped <group>
 * inherits the XRSpace transform so its world position/quaternion give us
 * the controller ray each frame.
 */
function ControllerProbe({ handedness, refOut }: {
  handedness: 'left' | 'right';
  refOut: React.MutableRefObject<Group | null>;
}) {
  const state = useXRInputSourceState('controller', handedness);
  if (!state) return null;
  return (
    <XRSpace space={state.inputSource.targetRaySpace}>
      <group ref={refOut} />
    </XRSpace>
  );
}

/**
 * Pick the aircraft with the smallest angular offset from any of:
 *   - camera forward direction (within FOV_HALF_RAD)
 *   - left/right controller targetRaySpace (within RAY_HALF_RAD)
 * Updates an external `hoveredId` via `onHover`. Runs every frame.
 */
export function HoverDetector({ flights, scene, onHover }: Props) {
  const { camera } = useThree();
  const lastIdRef = useRef<string | null>(null);
  const leftCtrl = useRef<Group | null>(null);
  const rightCtrl = useRef<Group | null>(null);

  const _ctrlPos = new Vector3();
  const _ctrlQuat = new Quaternion();
  const _ctrlFwd = new Vector3();

  useFrame(() => {
    camera.getWorldPosition(_camPos);
    camera.getWorldDirection(_camFwd);

    // Build a list of (origin, direction, threshold) probes — camera plus any
    // active controllers.
    const probes: Array<{ pos: Vector3; fwd: Vector3; halfAngle: number }> = [
      { pos: _camPos.clone(), fwd: _camFwd.clone(), halfAngle: FOV_HALF_RAD },
    ];
    for (const ctrlRef of [leftCtrl, rightCtrl]) {
      const g = ctrlRef.current;
      if (!g) continue;
      g.getWorldPosition(_ctrlPos);
      g.getWorldQuaternion(_ctrlQuat);
      _ctrlFwd.set(0, 0, -1).applyQuaternion(_ctrlQuat);
      probes.push({ pos: _ctrlPos.clone(), fwd: _ctrlFwd.clone(), halfAngle: RAY_HALF_RAD });
    }

    let bestId: string | null = null;
    let bestScore = Infinity; // smaller = better; combines angle and distance
    const now = Date.now() / 1000;
    for (const flight of flights) {
      if (flight.onGround) continue;
      const dr = deadReckon(flight, now);
      geodeticToSceneENU(
        dr.lat, dr.lon, dr.altM,
        scene.refLat, scene.refLon, scene.refH, scene.scale, _scenePos,
      );
      sceneToWorld(_scenePos, _worldPos);
      for (const probe of probes) {
        _toAircraft.copy(_worldPos).sub(probe.pos);
        const dist = _toAircraft.length();
        if (dist > RAY_HIT_DIST_MAX) continue;
        _toAircraft.divideScalar(dist);
        const angle = Math.acos(Math.max(-1, Math.min(1, probe.fwd.dot(_toAircraft))));
        if (angle > probe.halfAngle) continue;
        // Score: angle in radians + small distance penalty so close planes
        // win ties cleanly. Tweak the factor if it feels wrong.
        const score = angle + dist * 1e-6;
        if (score < bestScore) {
          bestScore = score;
          bestId = flight.icao24;
        }
      }
    }
    if (bestId !== lastIdRef.current) {
      lastIdRef.current = bestId;
      onHover(bestId);
    }
  });

  return (
    <>
      <ControllerProbe handedness="left"  refOut={leftCtrl} />
      <ControllerProbe handedness="right" refOut={rightCtrl} />
    </>
  );
}

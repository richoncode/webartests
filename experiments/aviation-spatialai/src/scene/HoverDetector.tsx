import { useRef } from 'react';
import { Vector3, Quaternion, Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR, useXRInputSourceState, XRSpace } from '@react-three/xr';
import { geodeticToSceneENU } from './geo';
import { deadReckon } from '../data/deadReckon';
import type { FlightState } from '../data/types';
import type { SceneRef } from './Aircraft';

interface Props {
  flights: FlightState[];
  scene: SceneRef;
  onHover: (id: string | null) => void;
}

const FOV_HALF_RAD     = (4.0 * Math.PI) / 180;   // mouse / head-look cone
const RAY_HALF_RAD     = (2.0 * Math.PI) / 180;   // controller cone

// Inverse of the SCENE_ROTATION applied in App.tsx (-π/2 around X):
//   scene (x, y, z)  →  world (x, z, -y)
function sceneToWorld(scene: Vector3, world: Vector3) {
  world.set(scene.x, scene.z, -scene.y);
}

/**
 * Probe attached to a controller's targetRaySpace. The wrapped <group>
 * inherits the XRSpace transform, so its world transform reflects the
 * controller's true ray-pose each frame. MUST live in world space (not
 * inside the rotated scene group), otherwise the parent rotation would
 * compose with the XR pose and the ray would point off-target.
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
 * HoverDetector — picks the aircraft with the smallest angular offset from
 * any active probe, every frame. Probes:
 *   - desktop: a mouse-ray (raycaster from camera through cursor) at
 *     FOV_HALF_RAD; head-direction is poor UX with OrbitControls because
 *     the camera always points at the orbit target.
 *   - VR (no XR session active counts as desktop): the camera forward
 *     direction (= the user's head-look direction) at FOV_HALF_RAD.
 *   - always: left & right controller targetRaySpace at RAY_HALF_RAD.
 *
 * Aircraft positions are dead-reckoned and converted from scene-ENU to
 * world-Y-up so the angle check is in the same frame the camera and
 * controllers live in.
 *
 * MUST be placed at the canvas root (NOT inside the rotated scene group)
 * so the controller XRSpaces aren't double-rotated.
 */
export function HoverDetector({ flights, scene, onHover }: Props) {
  const { camera, raycaster, pointer } = useThree();
  const inXR = useXR((s) => !!s.session);
  const lastIdRef = useRef<string | null>(null);
  const leftCtrl  = useRef<Group | null>(null);
  const rightCtrl = useRef<Group | null>(null);

  // Frame-scratch — allocated once.
  const _camPos = new Vector3();
  const _camFwd = new Vector3();
  const _ctrlPos = new Vector3();
  const _ctrlQuat = new Quaternion();
  const _ctrlFwd = new Vector3();
  const _scenePos = new Vector3();
  const _worldPos = new Vector3();
  const _toAircraft = new Vector3();

  useFrame(() => {
    camera.getWorldPosition(_camPos);

    // Build the probe set.
    const probes: Array<{ pos: Vector3; fwd: Vector3; halfAngle: number }> = [];
    if (inXR) {
      // Head-look ray.
      camera.getWorldDirection(_camFwd);
      probes.push({ pos: _camPos.clone(), fwd: _camFwd.clone(), halfAngle: FOV_HALF_RAD });
    } else {
      // Mouse ray — only meaningful when the cursor is actually over the canvas.
      raycaster.setFromCamera(pointer, camera);
      probes.push({
        pos: raycaster.ray.origin.clone(),
        fwd: raycaster.ray.direction.clone(),
        halfAngle: FOV_HALF_RAD,
      });
    }
    for (const ctrlRef of [leftCtrl, rightCtrl]) {
      const g = ctrlRef.current;
      if (!g) continue;
      g.getWorldPosition(_ctrlPos);
      g.getWorldQuaternion(_ctrlQuat);
      _ctrlFwd.set(0, 0, -1).applyQuaternion(_ctrlQuat);
      probes.push({ pos: _ctrlPos.clone(), fwd: _ctrlFwd.clone(), halfAngle: RAY_HALF_RAD });
    }

    let bestId: string | null = null;
    let bestScore = Infinity;
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
        if (dist < 1e-3) continue;
        _toAircraft.divideScalar(dist);
        const cos = Math.max(-1, Math.min(1, probe.fwd.dot(_toAircraft)));
        const angle = Math.acos(cos);
        if (angle > probe.halfAngle) continue;
        // Score = angle (radians) + small distance penalty so close planes
        // win clean ties when two share an angular alignment.
        const score = angle + dist * 1e-7;
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

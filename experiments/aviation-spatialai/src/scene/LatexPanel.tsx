import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, Vector3, Quaternion, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import katex from 'katex';
import { geodeticToSceneENU } from './geo';
import { deadReckon } from '../data/deadReckon';
import type { FlightState } from '../data/types';
import type { SceneRef } from './Aircraft';

interface Props {
  flight: FlightState;
  scene: SceneRef;
}

const _camPos    = new Vector3();
const _camQuat   = new Quaternion();
const _scenePos  = new Vector3();
const _planePos  = new Vector3();
const _direction = new Vector3();
const _labelPos  = new Vector3();
const _lookTarget = new Vector3();

function sceneToWorld(scene: Vector3, world: Vector3) {
  world.set(scene.x, scene.z, -scene.y);
}

/** Render a KaTeX expression onto a canvas texture. */
function makeLatexTexture(latex: string, w = 512, h = 168): CanvasTexture {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = '-99999px';
  div.style.color = '#dff7ff';
  div.style.fontSize = '32px';
  document.body.appendChild(div);
  try {
    katex.render(latex, div, { throwOnError: false, displayMode: true });
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(8, 16, 28, 0.86)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(91, 155, 213, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = '#dff7ff';
    ctx.font = '600 36px ui-monospace, "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(div.textContent || latex, w / 2, h / 2 + 4);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.needsUpdate = true;
    return tex;
  } finally {
    document.body.removeChild(div);
  }
}

/**
 * KaTeX altitude panel for the SELECTED aircraft. Positioned on the
 * camera→aircraft ray, billboarded with the X axis locked so it stays
 * vertical even when the camera is high above. Lives in WORLD-Y-up coords
 * (canvas root) — same frame the camera lives in.
 */
export function LatexPanel({ flight, scene }: Props) {
  const ref = useRef<Group>(null);
  const altFt = Math.round(flight.baroAltitudeM * 3.28084);
  const tex = useMemo(() => {
    const formatted = altFt.toLocaleString('en-US');
    return makeLatexTexture(`h = ${formatted}\\;\\text{ft}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(altFt / 50)]);

  useEffect(() => () => { tex.dispose(); }, [tex]);

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
    _direction.copy(_planePos).sub(_camPos);
    const dist = _direction.length();
    if (dist < 1e-3) return;
    _direction.divideScalar(dist);
    // Position the panel slightly BELOW the AircraftLabel so they don't
    // overlap. ~55% of the way along the ray, capped at 7 units.
    const labelDist = Math.min(dist * 0.55, 7);
    _labelPos.copy(_camPos).addScaledVector(_direction, labelDist);
    ref.current.position.copy(_labelPos);

    // Axis-constrained billboard (Y-axis locked).
    // Three.js lookAt points -Z at the target. We want +Z (the text face) to point
    // at the camera, so we tell it to look at a point projected AWAY from the camera.
    _lookTarget.set(
      _labelPos.x + (_labelPos.x - _camPos.x),
      _labelPos.y,
      _labelPos.z + (_labelPos.z - _camPos.z)
    );
    if (_lookTarget.x === _labelPos.x && _lookTarget.z === _labelPos.z) {
      _lookTarget.z += 0.001;
    }
    ref.current.up.set(0, 1, 0);
    ref.current.lookAt(_lookTarget);
  });

  // Panel sized so it reads at ~3-7 units of distance from camera.
  const W = 0.9, H = 0.3;
  return (
    <group ref={ref}>
      {/* Drop slightly below where the AircraftLabel sits */}
      <mesh position={[0, -0.25, 0]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

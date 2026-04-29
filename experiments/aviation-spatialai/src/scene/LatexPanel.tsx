import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, Vector3, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import katex from 'katex';
import { geodeticToSceneENU } from './geo';
import type { FlightState } from '../data/types';
import type { SceneRef } from './Aircraft';

interface Props {
  flight: FlightState;
  scene: SceneRef;
}

const _pos = new Vector3();
const _camPos = new Vector3();

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
    ctx.fillStyle = 'rgba(8, 16, 28, 0.78)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(91, 155, 213, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = '#dff7ff';
    ctx.font = '600 30px ui-monospace, "SF Mono", monospace';
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

/** Hover panel above the selected aircraft. ENU: lift = +Z. */
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
    geodeticToSceneENU(
      flight.lat, flight.lon, flight.baroAltitudeM,
      scene.refLat, scene.refLon, scene.refH, scene.scale, _pos,
    );
    // Lift panel ~90 m above the aircraft along scene up.
    _pos.z += 90 * scene.scale;
    ref.current.position.copy(_pos);
    state.camera.getWorldPosition(_camPos);
    ref.current.lookAt(_camPos);
  });

  const W = 240 * scene.scale, H = 80 * scene.scale;
  return (
    <group ref={ref}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, Vector3, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import katex from 'katex';
import { geodeticToECEF } from './geo';
import type { FlightState } from '../data/types';

interface Props {
  flight: FlightState;
  worldScale: number;
  worldOrigin: Vector3;
}

const _pos = new Vector3();
const _camPos = new Vector3();

/** Render a KaTeX expression onto an OffscreenCanvas-style texture. */
function makeLatexTexture(latex: string, w = 512, h = 168): CanvasTexture {
  // KaTeX renders to HTML/SVG. We rasterise via an off-DOM <div> → SVG → canvas.
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
    // KaTeX output to text — we draw it as text since SVG-to-canvas across
    // browsers is finicky. We extract the rendered string from .katex elements
    // for a clean look without taking on a rasteriser dependency.
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

/** Hover panel above the selected aircraft showing its altitude as TeX. */
export function LatexPanel({ flight, worldScale, worldOrigin }: Props) {
  const ref = useRef<Group>(null);
  const altFt = Math.round(flight.baroAltitudeM * 3.28084);
  // Re-rasterise only when the displayed value changes appreciably.
  const tex = useMemo(() => {
    const formatted = altFt.toLocaleString('en-US');
    return makeLatexTexture(`h = ${formatted}\\;\\text{ft}`);
  }, [Math.round(altFt / 50)]);

  useEffect(() => () => { tex.dispose(); }, [tex]);

  useFrame((state) => {
    if (!ref.current) return;
    geodeticToECEF(flight.lat, flight.lon, flight.baroAltitudeM, _pos);
    _pos.sub(worldOrigin).multiplyScalar(worldScale);
    // Lift panel above the aircraft (60 m worth in current scene units).
    const lift = 90 * worldScale;
    const upN = _pos.length();
    if (upN > 1e-3) {
      const k = (upN + lift) / upN;
      ref.current.position.set(_pos.x * k, _pos.y * k, _pos.z * k);
    } else {
      ref.current.position.copy(_pos);
    }
    // Billboard toward camera.
    state.camera.getWorldPosition(_camPos);
    ref.current.lookAt(_camPos);
  });

  // Plane sized to match the texture aspect ratio (512×168).
  const W = 240 * worldScale, H = 80 * worldScale;
  return (
    <group ref={ref}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

import { useMemo } from 'react';
import {
  BufferGeometry, BufferAttribute, Vector3, DoubleSide,
  Line, LineBasicMaterial,
} from 'three';
import { geodeticToECEF } from './geo';
import type { PredictedPoint } from '../ml/predictTrajectory';

interface Props {
  points: PredictedPoint[];
  worldScale: number;
  worldOrigin: Vector3;
}

const _v = new Vector3();

/**
 * Glowing blue "curtain" — a vertical ribbon dropped from the predicted
 * trajectory down to ~500 m below it, plus a centre-line. Reads as a route
 * trail in 3D from any angle.
 */
export function PredictivePath({ points, worldScale, worldOrigin }: Props) {
  const geom = useMemo(() => {
    if (points.length < 2) return null;
    // Build a triangle strip ribbon: top vertex per point + bottom vertex per point.
    const positions: number[] = [];
    const indices: number[] = [];
    const DROP_M = 600;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      geodeticToECEF(p.lat, p.lon, p.altM, _v);
      _v.sub(worldOrigin).multiplyScalar(worldScale);
      positions.push(_v.x, _v.y, _v.z);
      // Same point but DROP_M below — drop is along ECEF "down" approximation
      // (radial from origin); for our scale it's sufficient.
      const dropN = _v.length();
      const dropScale = dropN > 1e-3 ? Math.max(0, dropN - DROP_M * worldScale) / dropN : 1;
      positions.push(_v.x * dropScale, _v.y * dropScale, _v.z * dropScale);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [points, worldScale, worldOrigin]);

  const lineObject = useMemo(() => {
    if (points.length < 2) return null;
    const positions: number[] = [];
    for (const p of points) {
      geodeticToECEF(p.lat, p.lon, p.altM, _v);
      _v.sub(worldOrigin).multiplyScalar(worldScale);
      positions.push(_v.x, _v.y, _v.z);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    return new Line(g, new LineBasicMaterial({
      color: 0x9be1ff, transparent: true, opacity: 0.95, depthTest: false,
    }));
  }, [points, worldScale, worldOrigin]);

  if (!geom || !lineObject) return null;
  return (
    <group>
      <mesh geometry={geom}>
        <meshBasicMaterial color="#3aa9ff" transparent opacity={0.32} side={DoubleSide} depthWrite={false} />
      </mesh>
      <primitive object={lineObject} />
    </group>
  );
}

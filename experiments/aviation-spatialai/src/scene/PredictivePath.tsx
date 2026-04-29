import { useMemo } from 'react';
import {
  BufferGeometry, BufferAttribute, Vector3, DoubleSide,
  Line, LineBasicMaterial,
} from 'three';
import { geodeticToSceneENU } from './geo';
import type { PredictedPoint } from '../ml/predictTrajectory';
import type { SceneRef } from './Aircraft';

interface Props {
  points: PredictedPoint[];
  scene: SceneRef;
}

const _v = new Vector3();

/**
 * Glowing blue "curtain" — vertical ribbon dropped from each predicted
 * trajectory sample down to ~600 m below it (along scene +Z = up), plus a
 * bright centre line. In ENU "down" is just −Z so the drop is direct.
 */
export function PredictivePath({ points, scene }: Props) {
  const geom = useMemo(() => {
    if (points.length < 2) return null;
    const positions: number[] = [];
    const indices: number[] = [];
    const DROP_M = 600;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      geodeticToSceneENU(p.lat, p.lon, p.altM, scene.refLat, scene.refLon, scene.refH, scene.scale, _v);
      positions.push(_v.x, _v.y, _v.z);
      // Drop straight down in scene ENU (subtract from Z).
      positions.push(_v.x, _v.y, _v.z - DROP_M * scene.scale);
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
  }, [points, scene]);

  const lineObject = useMemo(() => {
    if (points.length < 2) return null;
    const positions: number[] = [];
    for (const p of points) {
      geodeticToSceneENU(p.lat, p.lon, p.altM, scene.refLat, scene.refLon, scene.refH, scene.scale, _v);
      positions.push(_v.x, _v.y, _v.z);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    return new Line(g, new LineBasicMaterial({
      color: 0x9be1ff, transparent: true, opacity: 0.95, depthTest: false,
    }));
  }, [points, scene]);

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

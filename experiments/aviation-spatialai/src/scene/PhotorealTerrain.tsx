import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  Group, Vector3, Mesh, SphereGeometry, MeshStandardMaterial,
  Quaternion, DoubleSide,
} from 'three';
import { ecefToEnuMatrix4, geodeticToECEF, A } from './geo';
import type { SceneRef } from './Aircraft';

interface Props {
  cesiumIonToken: string;
  cesiumIonAssetId: number;
  scene: SceneRef;
}

/**
 * Loads Google Photorealistic 3D Tiles via Cesium Ion (free tier) using
 * `3d-tiles-renderer`. Tile vertices arrive in ECEF; we transform the whole
 * tile group into our scene-ENU frame:
 *   P_world = scale · R_ecef→enu · (P_ecef − refEcef)
 *           = scale · R_ecef→enu · P_ecef − scale · R_ecef→enu · refEcef
 *
 * Three.js applies T·R·S, so:  S = scale, R = R_ecef→enu, T = −scale·R·refEcef.
 */
export function PhotorealTerrain({ cesiumIonToken, cesiumIonAssetId, scene }: Props) {
  const { camera, gl } = useThree();
  const ref = useRef<Group>(null);
  const tilesRef = useRef<{ update: () => void; dispose: () => void; group: Group } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');

  // Pre-compute the rotation + translation that places ECEF tiles into ENU.
  const transform = useMemo(() => {
    const refEcef = geodeticToECEF(scene.refLat, scene.refLon, scene.refH, new Vector3());
    const m = ecefToEnuMatrix4(scene.refLat, scene.refLon);
    const q = new Quaternion().setFromRotationMatrix(m);
    const t = refEcef.clone().applyMatrix4(m).multiplyScalar(-scene.scale);
    return { q, t };
  }, [scene.refLat, scene.refLon, scene.refH, scene.scale]);

  useEffect(() => {
    let cancelled = false;
    if (!cesiumIonToken) {
      setStatus('fallback');
      return;
    }
    setStatus('loading');
    (async () => {
      try {
        const [coreMod, pluginsMod] = await Promise.all([
          import('3d-tiles-renderer'),
          import('3d-tiles-renderer/plugins'),
        ]);
        if (cancelled) return;
        const { TilesRenderer } = coreMod;
        const { CesiumIonAuthPlugin } = pluginsMod as unknown as {
          CesiumIonAuthPlugin: new (opts: { apiToken: string; assetId: number }) => unknown;
        };
        const tiles = new TilesRenderer();
        tiles.registerPlugin(
          new CesiumIonAuthPlugin({ apiToken: cesiumIonToken, assetId: cesiumIonAssetId }) as never,
        );
        tiles.setCamera(camera);
        tiles.setResolutionFromRenderer(camera, gl);
        tiles.errorTarget = 12;
        tiles.group.scale.setScalar(scene.scale);
        tiles.group.quaternion.copy(transform.q);
        tiles.group.position.copy(transform.t);
        if (ref.current) ref.current.add(tiles.group);
        tilesRef.current = tiles as unknown as { update: () => void; dispose: () => void; group: Group };
        setStatus('ready');
      } catch (err) {
        console.warn('Photoreal tiles failed to load — falling back', err);
        if (!cancelled) setStatus('fallback');
      }
    })();
    return () => { cancelled = true; tilesRef.current?.dispose(); };
  }, [cesiumIonToken, cesiumIonAssetId, camera, gl, scene.scale, transform]);

  useFrame(() => {
    tilesRef.current?.update();
  });

  return (
    <group ref={ref}>
      {status === 'fallback' && <FallbackGlobe scene={scene} />}
    </group>
  );
}

/**
 * Procedural Earth-blue sphere when photoreal tiles aren't available. In
 * scene ENU, the Earth centre lies straight down by A metres from origin —
 * so the globe is a sphere at (0, 0, −A·scale) of radius A·scale.
 */
function FallbackGlobe({ scene }: { scene: SceneRef }) {
  const ref = useRef<Mesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.geometry = new SphereGeometry(A * scene.scale, 96, 64);
    ref.current.position.set(0, 0, -A * scene.scale);
  }, [scene.scale]);

  return (
    <mesh ref={ref}>
      <meshStandardMaterial
        color="#1f5b8e"
        emissive="#0a2a48"
        emissiveIntensity={0.4}
        roughness={0.85}
        metalness={0.05}
        side={DoubleSide}
      />
    </mesh>
  );
}

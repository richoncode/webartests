import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Group, Vector3, MeshStandardMaterial, MeshBasicMaterial, SphereGeometry, Mesh, DoubleSide } from 'three';

interface Props {
  cesiumIonToken: string;
  /** ECEF origin we translate world by (so coords stay near float precision). */
  worldOrigin: Vector3;
  worldScale: number;
}

/**
 * Loads Google Photorealistic 3D Tiles via Cesium Ion (free tier) using
 * `3d-tiles-renderer`. Falls back to a procedural blue/green globe if no
 * token is configured or the tileset fails to load.
 */
export function PhotorealTerrain({ cesiumIonToken, worldOrigin, worldScale }: Props) {
  const { scene, camera, gl } = useThree();
  const ref = useRef<Group>(null);
  const tilesRef = useRef<{ update: () => void; dispose: () => void; group: Group } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');

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
          new CesiumIonAuthPlugin({ apiToken: cesiumIonToken, assetId: 2275207 }) as never,
        );
        tiles.setCamera(camera);
        tiles.setResolutionFromRenderer(camera, gl);
        tiles.errorTarget = 12;
        // Translate the entire tile group into our world frame.
        tiles.group.position.copy(worldOrigin).multiplyScalar(-worldScale);
        tiles.group.scale.setScalar(worldScale);
        if (ref.current) ref.current.add(tiles.group);
        tilesRef.current = tiles as unknown as { update: () => void; dispose: () => void; group: Group };
        setStatus('ready');
      } catch (err) {
        console.warn('Photoreal tiles failed to load — falling back', err);
        if (!cancelled) setStatus('fallback');
      }
    })();
    return () => { cancelled = true; tilesRef.current?.dispose(); };
  }, [cesiumIonToken, camera, gl, worldOrigin, worldScale]);

  useFrame(() => {
    tilesRef.current?.update();
  });

  return (
    <group ref={ref}>
      {status === 'fallback' && <FallbackGlobe worldOrigin={worldOrigin} worldScale={worldScale} />}
    </group>
  );
}

/**
 * Procedural Earth-blue sphere when photoreal tiles aren't available — keeps
 * the demo functional without a Cesium Ion token. Sized to a real WGS-84
 * radius so aircraft sit at correct apparent altitude.
 */
function FallbackGlobe({ worldOrigin, worldScale }: { worldOrigin: Vector3; worldScale: number }) {
  const ref = useRef<Mesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const R = 6378137;
    ref.current.geometry = new SphereGeometry(R * worldScale, 96, 64);
    // Centre at ECEF origin minus our world origin.
    const c = new Vector3().copy(worldOrigin).multiplyScalar(-worldScale);
    ref.current.position.copy(c);
  }, [worldOrigin, worldScale]);

  return (
    <mesh ref={ref}>
      <meshStandardMaterial color="#0e3a5f" roughness={0.95} metalness={0} side={DoubleSide} />
    </mesh>
  );
}

// Avoid tree-shaking unused symbol warnings.
void MeshStandardMaterial; void MeshBasicMaterial;

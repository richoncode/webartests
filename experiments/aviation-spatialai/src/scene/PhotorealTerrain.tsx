import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
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
  const xrSession = useXR((s) => s.session);
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
    const t = tilesRef.current as unknown as {
      update: () => void;
      setCamera?: (c: unknown) => void;
      deleteCamera?: (c: unknown) => void;
      setResolutionFromRenderer?: (c: unknown, gl: unknown) => void;
      cameras?: Array<unknown>;
    } | null;
    if (!t) return;
    // In XR, Three.js renders through gl.xr.getCamera() (a WebXRArrayCamera).
    // The user-provided camera's matrices are *also* updated, but bypassing
    // it directly avoids a one-frame lag while WebXRManager catches up. Use
    // the XR camera while presenting; fall back to the user camera otherwise.
    const xr = (gl as unknown as { xr: { isPresenting: boolean; getCamera: () => unknown } }).xr;
    const liveCam = xr?.isPresenting ? xr.getCamera() as { updateMatrixWorld: (force?: boolean) => void } : camera;
    liveCam.updateMatrixWorld(true);
    t.setCamera?.(liveCam);
    t.setResolutionFromRenderer?.(liveCam, gl);
    t.update();
  });

  // When an XR session starts/ends, the active camera Three.js renders
  // through swaps between the user-provided one and the WebXRArrayCamera.
  // Force the tiles' camera registration to flip on that boundary so the
  // very first frame of XR isn't computed against the desktop camera.
  useEffect(() => {
    const t = tilesRef.current as unknown as {
      setCamera?: (c: unknown) => void;
      setResolutionFromRenderer?: (c: unknown, gl: unknown) => void;
      deleteCamera?: (c: unknown) => void;
    } | null;
    if (!t) return;
    const xr = (gl as unknown as { xr: { isPresenting: boolean; getCamera: () => unknown } }).xr;
    const cam = xr?.isPresenting ? xr.getCamera() : camera;
    t.deleteCamera?.(camera);
    t.deleteCamera?.(cam);
    t.setCamera?.(cam);
    t.setResolutionFromRenderer?.(cam, gl);
  }, [xrSession, camera, gl]);

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

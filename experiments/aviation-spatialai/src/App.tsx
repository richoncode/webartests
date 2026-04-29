import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import { Vector3, Quaternion } from 'three';
import { fetchFlights, BBOX } from './data/opensky';
import { makeCannedFlights } from './data/cannedFlights';
import type { FlightState, FlightHistory } from './data/types';
import { PhotorealTerrain } from './scene/PhotorealTerrain';
import { Aircraft, type SceneRef } from './scene/Aircraft';
import { LatexPanel } from './scene/LatexPanel';
import { PredictivePath } from './scene/PredictivePath';
import { XRControls } from './scene/XRControls';
import { HoverDetector } from './scene/HoverDetector';
import { AircraftLabel } from './scene/AircraftLabel';
import { predictTrajectory, type PredictedPoint } from './ml/predictTrajectory';

const ENV = (import.meta as unknown as { env: Record<string, string> }).env;
const ION_TOKEN: string = ENV.VITE_CESIUM_ION_TOKEN || '';
// Cesium Ion asset id. Default 2275207 = Google Photorealistic 3D Tiles.
// If your Ion plan doesn't include that, set VITE_CESIUM_ION_ASSET_ID to
// e.g. 1 (Cesium World Terrain) at build time.
const ION_ASSET_ID: number = parseInt(ENV.VITE_CESIUM_ION_ASSET_ID || '2275207', 10);

// Reference centre for the local-ENU scene (SF Bay).
const CENTRE_LAT = (BBOX.lamin + BBOX.lamax) / 2;
const CENTRE_LON = (BBOX.lomin + BBOX.lomax) / 2;
const CENTRE_ALT = 0;

// 1 m → 0.01 world units. Aircraft (~36 m long) become ~0.36 units;
// 10 km altitude → 100 units; bbox extents (~70 km × 100 km) → ~700×1000 units.
const WORLD_SCALE = 0.01;

const xrStore = createXRStore();

// Scene math is built in local-ENU (+X east, +Y north, +Z up). WebXR's
// reference space is Y-up — so in VR the user's gravity vector is along -Y,
// not -Z. Without compensation, the ground appears as a wall.
//
// Fix: wrap all scene content in a group rotated -90° around X. That
// composition maps scene-ENU into world-Y-up:
//   scene +X (east)  → world +X
//   scene +Z (up)    → world +Y
//   scene +Y (north) → world -Z
// The camera and OrbitControls operate in Y-up world coords as Three.js
// defaults expect, so no camera.up override is needed.
const SCENE_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

export default function App() {
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [source, setSource] = useState<'live' | 'canned' | 'pending'>('pending');
  const historyRef = useRef<FlightHistory>({});
  const rigRef = useRef<{ position: Vector3; quaternion: Quaternion } | null>(null);

  const scene: SceneRef = useMemo(
    () => ({ refLat: CENTRE_LAT, refLon: CENTRE_LON, refH: CENTRE_ALT, scale: WORLD_SCALE }),
    [],
  );

  // Camera in world Y-up coords (after the SCENE_ROTATION, scene-Z up becomes
  // world-Y up, scene-Y north becomes world -Z forward). Equivalent to the
  // earlier (80 east, 180 south, 220 up) intent.
  const initialCamera = useMemo<[number, number, number]>(() => [80, 220, 180], []);
  const orbitTarget   = useMemo<[number, number, number]>(() => [0, 50, 0], []);

  // Two independent timers:
  //   livePoll: attempts OpenSky (via direct → corsproxy → allorigins) every
  //             30 s when live, every 60 s when in canned fallback. Doesn't
  //             stop forever — proxies can recover.
  //   cannedAnim: ticks the canned flight animation every 1.5 s ONLY while
  //               the live feed is unavailable.
  // The instant any transport succeeds we drop the canned animation and
  // promote the live data. If live later fails, canned animation resumes.
  useEffect(() => {
    let cancelled = false;
    let abort: AbortController | null = null;
    let liveTimer: number | null = null;
    let cannedTimer: number | null = null;
    let isLive = false;

    const recordHistory = (flights: FlightState[]) => {
      const hist = historyRef.current;
      const now = Math.floor(Date.now() / 1000);
      for (const f of flights) {
        const arr = hist[f.icao24] || (hist[f.icao24] = []);
        arr.push({ t: now, lat: f.lat, lon: f.lon, altM: f.baroAltitudeM });
        const cutoff = now - 240;
        while (arr.length && arr[0].t < cutoff) arr.shift();
      }
    };

    const cannedTick = () => {
      if (cancelled || isLive) return;
      const flights = makeCannedFlights(Date.now());
      setFlights(flights);
      recordHistory(flights);
      cannedTimer = window.setTimeout(cannedTick, 1500);
    };

    const livePoll = async () => {
      if (cancelled) return;
      abort?.abort();
      abort = new AbortController();
      const res = await fetchFlights(abort.signal);
      if (cancelled) return;
      setSource(res.source);
      if (res.source === 'live') {
        isLive = true;
        setFlights(res.flights);
        recordHistory(res.flights);
        // Stop the canned animation if it was running.
        if (cannedTimer) { clearTimeout(cannedTimer); cannedTimer = null; }
      } else {
        isLive = false;
        if (!cannedTimer) cannedTick();
      }
      liveTimer = window.setTimeout(livePoll, isLive ? 30_000 : 60_000);
    };

    livePoll();
    return () => {
      cancelled = true;
      abort?.abort();
      if (liveTimer) clearTimeout(liveTimer);
      if (cannedTimer) clearTimeout(cannedTimer);
    };
  }, []);

  // Trajectory prediction (TF.js lazy-loaded on first call).
  const [predicted, setPredicted] = useState<PredictedPoint[]>([]);
  useEffect(() => {
    if (!selectedId) { setPredicted([]); return; }
    let cancelled = false;
    const h = historyRef.current[selectedId] || [];
    predictTrajectory(h, 300, 15).then((pts) => {
      if (!cancelled) setPredicted(pts);
    });
    return () => { cancelled = true; };
  }, [selectedId, flights]);

  const selected = flights.find((f) => f.icao24 === selectedId) ?? null;
  const hovered  = flights.find((f) => f.icao24 === hoveredId)  ?? null;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: initialCamera, fov: 55, near: 0.1, far: 2_000_000 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <color attach="background" args={["#040912"]} />
        <fog attach="fog" args={["#040912", 1500, 80000]} />
        <ambientLight intensity={0.9} />
        {/* Grid lives in WORLD coords (not the rotated group). Default
            GridHelper lies in the XZ plane (Y up) — exactly the floor in
            world-Y-up. Putting it inside the rotation tips it vertical. */}
        <gridHelper args={[1000, 40, '#234764', '#13243a']} />
        <XR store={xrStore}>
          <group rotation={SCENE_ROTATION}>
            {/* Direction is in scene-ENU; the parent group rotates the light
                source into world coords along with the rest of the scene. */}
            <directionalLight position={[200, -150, 400]} intensity={1.6} color="#fff5d8" />
            <PhotorealTerrain cesiumIonToken={ION_TOKEN} cesiumIonAssetId={ION_ASSET_ID} scene={scene} />
            {flights.map((f) => (
              <Aircraft
                key={f.icao24}
                flight={f}
                selected={f.icao24 === selectedId}
                onClick={() => setSelectedId(f.icao24)}
                scene={scene}
              />
            ))}
            {selected && (
              <>
                <PredictivePath points={predicted} scene={scene} />
                <LatexPanel flight={selected} scene={scene} />
              </>
            )}
            {/* Pop a small floating callsign label on whatever the user is
                looking at / pointing at, as long as it isn't already the
                selected aircraft (LatexPanel covers that one). */}
            {hovered && hovered.icao24 !== selectedId && (
              <AircraftLabel flight={hovered} scene={scene} />
            )}
            <HoverDetector flights={flights} scene={scene} onHover={setHoveredId} />
            <XRControls selected={selected} scene={scene} rigRef={rigRef} />
          </group>
        </XR>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={orbitTarget}
          maxDistance={5000}
          minDistance={5}
        />
      </Canvas>
      <HUD
        flights={flights}
        selected={selected}
        source={source}
        hasIonToken={!!ION_TOKEN}
        onSelect={setSelectedId}
        onEnterVR={() => xrStore.enterVR()}
      />
    </div>
  );
}

interface HUDProps {
  flights: FlightState[];
  selected: FlightState | null;
  source: 'live' | 'canned' | 'pending';
  hasIonToken: boolean;
  onSelect: (id: string | null) => void;
  onEnterVR: () => void;
}

function HUD({ flights, selected, source, hasIonToken, onSelect, onEnterVR }: HUDProps) {
  return (
    <div style={hudWrap}>
      <div style={panelStyle}>
        <div style={titleStyle}>Aviation SpatialAI</div>
        <div style={subStyle}>Live ADS-B over photoreal terrain · 5-min trajectory prediction</div>
        <div style={statusRow}>
          <Badge ok={source === 'live'}>{source === 'live' ? 'ADS-B · LIVE' : source === 'canned' ? 'ADS-B · FALLBACK' : 'CONNECTING…'}</Badge>
          <Badge ok={hasIonToken}>{hasIonToken ? 'ION · TILES' : 'ION · MISSING TOKEN'}</Badge>
          <Badge ok>{flights.length} aircraft</Badge>
        </div>
        <button style={vrBtn} onClick={onEnterVR}>Enter VR</button>
        {!hasIonToken && (
          <div style={hintStyle}>
            Set <code style={code}>VITE_CESIUM_ION_TOKEN</code> at build time to see Google Photorealistic 3D Tiles. The fallback globe is active.
          </div>
        )}
      </div>
      <div style={listWrap}>
        <div style={listTitle}>Aircraft ({flights.length})</div>
        <div style={{ overflowY: 'auto', maxHeight: '40vh' }}>
          {flights.map((f) => (
            <div
              key={f.icao24}
              onClick={() => onSelect(f.icao24)}
              style={{
                ...listItem,
                background: f === selected ? '#163048' : 'transparent',
                borderColor: f === selected ? '#5b9bd5' : '#1f2937',
              }}
            >
              <div style={{ fontWeight: 600 }}>{f.callsign?.trim() || f.icao24.toUpperCase()}</div>
              <div style={{ fontSize: 11, color: '#90a4b8' }}>
                {Math.round(f.baroAltitudeM * 3.28084).toLocaleString()} ft · {Math.round(f.velocityMps * 1.94384)} kt
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      padding: '3px 9px', borderRadius: 4,
      color: ok ? '#7adfa1' : '#f0a040',
      background: ok ? '#0d2418' : '#221a0a',
      border: `1px solid ${ok ? '#1d4d35' : '#5a3a14'}`,
    }}>{children}</span>
  );
}

const hudWrap: React.CSSProperties = {
  position: 'fixed', top: 12, right: 16, zIndex: 30,
  display: 'flex', flexDirection: 'column', gap: 12, width: 320,
  pointerEvents: 'none',
};
const panelStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  background: 'rgba(10, 14, 22, 0.85)',
  border: '1px solid #1f2937', borderRadius: 8, padding: 16,
};
const titleStyle: React.CSSProperties = { fontWeight: 700, fontSize: 16 };
const subStyle: React.CSSProperties = { fontSize: 12, color: '#90a4b8', marginTop: 4 };
const statusRow: React.CSSProperties = { display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' };
const vrBtn: React.CSSProperties = {
  marginTop: 14, width: '100%', padding: '8px 12px',
  background: '#1e2d40', color: '#9bdcff', border: '1px solid #2563eb',
  borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const hintStyle: React.CSSProperties = { fontSize: 11, color: '#777', marginTop: 12, lineHeight: 1.5 };
const code: React.CSSProperties = { color: '#9bdcff', fontSize: 10, background: '#0a1520', padding: '1px 4px', borderRadius: 3 };
const listWrap: React.CSSProperties = {
  pointerEvents: 'auto',
  background: 'rgba(10, 14, 22, 0.85)',
  border: '1px solid #1f2937', borderRadius: 8, padding: 12,
};
const listTitle: React.CSSProperties = { fontSize: 11, color: '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 };
const listItem: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #1f2937', borderRadius: 4, marginBottom: 4, cursor: 'pointer', fontSize: 12,
};

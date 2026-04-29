import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import { Vector3, Quaternion } from 'three';
import { fetchFlights, BBOX } from './data/opensky';
import type { FlightState, FlightHistory } from './data/types';
import { geodeticToECEF } from './scene/geo';
import { PhotorealTerrain } from './scene/PhotorealTerrain';
import { Aircraft } from './scene/Aircraft';
import { LatexPanel } from './scene/LatexPanel';
import { PredictivePath } from './scene/PredictivePath';
import { XRControls } from './scene/XRControls';
import { predictTrajectory, type PredictedPoint } from './ml/predictTrajectory';

const ION_TOKEN: string = (import.meta as unknown as { env: Record<string, string> }).env
  .VITE_CESIUM_ION_TOKEN || '';

// Centre point for the demo (SF Bay) — used as the world-frame ECEF origin so
// our scene coordinates stay near zero (avoids float precision loss at ECEF
// magnitudes ~6.4M m).
const CENTRE_LAT = (BBOX.lamin + BBOX.lamax) / 2;
const CENTRE_LON = (BBOX.lomin + BBOX.lomax) / 2;
const CENTRE_ALT = 0;

// Scene-unit scale: 1 metre → 0.01 world units. Aircraft (~36 m long) become
// ~0.36 units; camera distances are tens of units, well inside float32 range.
const WORLD_SCALE = 0.01;

const xrStore = createXRStore();

export default function App() {
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [source, setSource] = useState<'opensky' | 'canned' | 'pending'>('pending');
  const historyRef = useRef<FlightHistory>({});
  const rigRef = useRef<{ position: Vector3; quaternion: Quaternion } | null>(null);

  // World origin in ECEF, computed once.
  const worldOrigin = useMemo(() => geodeticToECEF(CENTRE_LAT, CENTRE_LON, CENTRE_ALT, new Vector3()), []);

  // Initial camera offset: 4 km east, 4 km north, 2 km up of the centre.
  const initialCamera = useMemo<[number, number, number]>(() => {
    return [40, 40, 25];
  }, []);

  // Poll OpenSky.
  useEffect(() => {
    let cancelled = false;
    let abort: AbortController | null = null;
    let timer: number | null = null;

    const tick = async () => {
      abort?.abort();
      abort = new AbortController();
      const res = await fetchFlights(abort.signal);
      if (cancelled) return;
      setSource(res.source);
      setFlights(res.flights);
      // Maintain rolling history per icao24 for the regression model.
      const hist = historyRef.current;
      const now = Math.floor(Date.now() / 1000);
      for (const f of res.flights) {
        const arr = hist[f.icao24] || (hist[f.icao24] = []);
        arr.push({ t: now, lat: f.lat, lon: f.lon, altM: f.baroAltitudeM });
        // Keep last 4 minutes.
        const cutoff = now - 240;
        while (arr.length && arr[0].t < cutoff) arr.shift();
      }
      timer = window.setTimeout(tick, res.source === 'canned' ? 1500 : 30000);
    };
    tick();
    return () => { cancelled = true; abort?.abort(); if (timer) clearTimeout(timer); };
  }, []);

  // Recompute predicted path for the selected aircraft when its history grows.
  const [predicted, setPredicted] = useState<PredictedPoint[]>([]);
  useEffect(() => {
    if (!selectedId) { setPredicted([]); return; }
    const h = historyRef.current[selectedId] || [];
    setPredicted(predictTrajectory(h, 300, 15));
  }, [selectedId, flights]);

  const selected = flights.find((f) => f.icao24 === selectedId) ?? null;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: initialCamera, fov: 55, near: 0.05, far: 5000 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <color attach="background" args={["#04080f"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[20, 30, 15]} intensity={1.0} color="#fff5d8" />
        <XR store={xrStore}>
          <PhotorealTerrain
            cesiumIonToken={ION_TOKEN}
            worldOrigin={worldOrigin}
            worldScale={WORLD_SCALE}
          />
          {flights.map((f) => (
            <Aircraft
              key={f.icao24}
              flight={f}
              selected={f.icao24 === selectedId}
              onClick={() => setSelectedId(f.icao24)}
              worldScale={WORLD_SCALE}
              worldOrigin={worldOrigin}
            />
          ))}
          {selected && (
            <>
              <PredictivePath points={predicted} worldScale={WORLD_SCALE} worldOrigin={worldOrigin} />
              <LatexPanel flight={selected} worldScale={WORLD_SCALE} worldOrigin={worldOrigin} />
            </>
          )}
          <XRControls selected={selected} worldScale={WORLD_SCALE} worldOrigin={worldOrigin} rigRef={rigRef} />
        </XR>
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxDistance={500} minDistance={1} />
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
  source: 'opensky' | 'canned' | 'pending';
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
          <Badge ok={source === 'opensky'}>{source === 'opensky' ? 'OPENSKY · LIVE' : source === 'canned' ? 'OPENSKY · FALLBACK' : 'CONNECTING…'}</Badge>
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

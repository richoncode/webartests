import type { FlightState } from './types';
import { makeCannedFlights } from './cannedFlights';

// SF Bay Area bbox — busy airspace (SFO, OAK, SJC) and good photoreal coverage.
export const BBOX = { lamin: 37.30, lomin: -122.80, lamax: 37.95, lomax: -121.70 };

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

// OpenSky `states/all` response: 17 fields per state vector.
// Indexes per https://openskynetwork.github.io/opensky-api/rest.html
type RawState = (string | number | boolean | null)[];

function parseState(raw: RawState): FlightState | null {
  if (!Array.isArray(raw) || raw.length < 17) return null;
  const lon = raw[5] as number | null;
  const lat = raw[6] as number | null;
  const onGround = raw[8] as boolean;
  if (lon == null || lat == null || onGround) return null;
  return {
    icao24: String(raw[0] ?? '').trim(),
    callsign: raw[1] ? String(raw[1]).trim() : null,
    origin: (raw[2] as string | null) ?? null,
    lon,
    lat,
    baroAltitudeM: (raw[7] as number | null) ?? (raw[13] as number | null) ?? 0,
    velocityMps: (raw[9] as number | null) ?? 0,
    trueTrackDeg: (raw[10] as number | null) ?? 0,
    verticalRateMps: (raw[11] as number | null) ?? 0,
    onGround,
    lastUpdate: (raw[4] as number | null) ?? Math.floor(Date.now() / 1000),
  };
}

export interface FetchResult {
  flights: FlightState[];
  source: 'opensky' | 'canned';
  via?: string;        // which transport succeeded (or last failed)
  error?: string;
}

// CORS-relaxed transports for OpenSky's public endpoint. We try them in
// order; first success wins. All are free public proxies, no signup. They
// occasionally rate-limit or go down, so the fallback chain matters.
const TRANSPORTS: Array<{ name: string; build: (u: string) => string }> = [
  { name: 'direct',         build: (u) => u },
  { name: 'corsproxy.io',   build: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
  { name: 'allorigins.win', build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
];

export async function fetchFlights(signal?: AbortSignal): Promise<FetchResult> {
  const u = new URL(OPENSKY_URL);
  u.searchParams.set('lamin', String(BBOX.lamin));
  u.searchParams.set('lomin', String(BBOX.lomin));
  u.searchParams.set('lamax', String(BBOX.lamax));
  u.searchParams.set('lomax', String(BBOX.lomax));

  let lastErr = '';
  for (const t of TRANSPORTS) {
    try {
      const resp = await fetch(t.build(u.toString()), { signal });
      if (!resp.ok) throw new Error(`${t.name} ${resp.status}`);
      const j = await resp.json();
      const states = (j.states || []) as RawState[];
      const flights = states.map(parseState).filter((f): f is FlightState => !!f);
      if (flights.length === 0) throw new Error(`${t.name} empty`);
      return { flights, source: 'opensky', via: t.name };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      // try the next transport
    }
  }

  return {
    flights: makeCannedFlights(Date.now()),
    source: 'canned',
    via: 'fallback',
    error: lastErr || 'all transports failed',
  };
}

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
  error?: string;
}

export async function fetchFlights(signal?: AbortSignal): Promise<FetchResult> {
  const u = new URL(OPENSKY_URL);
  u.searchParams.set('lamin', String(BBOX.lamin));
  u.searchParams.set('lomin', String(BBOX.lomin));
  u.searchParams.set('lamax', String(BBOX.lamax));
  u.searchParams.set('lomax', String(BBOX.lomax));
  try {
    const resp = await fetch(u.toString(), { signal });
    if (!resp.ok) throw new Error('opensky ' + resp.status);
    const j = await resp.json();
    const states = (j.states || []) as RawState[];
    const flights = states.map(parseState).filter((f): f is FlightState => !!f);
    if (flights.length === 0) throw new Error('empty result');
    return { flights, source: 'opensky' };
  } catch (err) {
    return {
      flights: makeCannedFlights(Date.now()),
      source: 'canned',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

import type { FlightState } from './types';
import { makeCannedFlights } from './cannedFlights';

// File kept named `opensky.ts` for import-path stability, but the live source
// is now airplanes.live — OpenSky doesn't return CORS headers and every free
// public CORS relay we tried is currently dead, paywalled, or rate-limited.
// airplanes.live returns Access-Control-Allow-Origin: *, so a static page can
// fetch it directly with no relay.

// Bounding region — SF Bay. The HUD still references this for legacy reasons.
export const BBOX = { lamin: 37.30, lomin: -122.80, lamax: 37.95, lomax: -121.70 };
const CENTRE_LAT = (BBOX.lamin + BBOX.lamax) / 2;
const CENTRE_LON = (BBOX.lomin + BBOX.lomax) / 2;
// airplanes.live uses radial queries; 80 NM ≈ 148 km — covers the bbox plus
// a little context.
const RADIUS_NM = 80;
const URL_BASE = `https://api.airplanes.live/v2/point/${CENTRE_LAT}/${CENTRE_LON}/${RADIUS_NM}`;

interface AirplanesLiveAircraft {
  hex: string;
  flight?: string;
  r?: string;            // registration
  t?: string;            // type code (e.g. B738)
  alt_baro?: number | 'ground';
  gs?: number;           // ground speed (knots)
  track?: number;        // true track (deg, CW from north)
  baro_rate?: number | null; // vertical rate (ft/min)
  lat?: number;
  lon?: number;
}

interface AirplanesLiveResponse {
  ac?: AirplanesLiveAircraft[];
  now?: number;
  total?: number;
}

const KT_TO_MPS = 0.514444;
const FT_TO_M   = 0.3048;
const FPM_TO_MPS = 0.3048 / 60;

function parseAircraft(a: AirplanesLiveAircraft, now: number): FlightState | null {
  if (a.lat == null || a.lon == null) return null;
  const onGround = a.alt_baro === 'ground';
  const altFt = typeof a.alt_baro === 'number' ? a.alt_baro : 0;
  return {
    icao24: a.hex,
    callsign: ((a.flight || a.r || '').trim()) || null,
    origin: null,
    lon: a.lon,
    lat: a.lat,
    baroAltitudeM: altFt * FT_TO_M,
    velocityMps: (typeof a.gs === 'number' ? a.gs : 0) * KT_TO_MPS,
    trueTrackDeg: typeof a.track === 'number' ? a.track : 0,
    verticalRateMps: (typeof a.baro_rate === 'number' ? a.baro_rate : 0) * FPM_TO_MPS,
    onGround,
    lastUpdate: now,
  };
}

export interface FetchResult {
  flights: FlightState[];
  source: 'live' | 'canned';
  via?: string;
  error?: string;
}

export async function fetchFlights(signal?: AbortSignal): Promise<FetchResult> {
  try {
    const r = await fetch(URL_BASE, { signal });
    if (!r.ok) throw new Error('airplanes.live ' + r.status);
    const j = await r.json() as AirplanesLiveResponse;
    const list = j?.ac ?? [];
    const now = j.now ? Math.floor(j.now / 1000) : Math.floor(Date.now() / 1000);
    const flights = list
      .map((a) => parseAircraft(a, now))
      .filter((f): f is FlightState => !!f && !f.onGround);
    if (flights.length === 0) throw new Error('empty');
    return { flights, source: 'live', via: 'airplanes.live' };
  } catch (err) {
    return {
      flights: makeCannedFlights(Date.now()),
      source: 'canned',
      via: 'fallback',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

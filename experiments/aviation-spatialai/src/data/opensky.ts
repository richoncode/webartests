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

// CORS-relaxed transports for OpenSky's public endpoint. Browser CORS makes
// a direct fetch impossible (always logs an error), so we skip that and go
// straight to relays. allorigins's /get endpoint wraps the proxied response
// in {contents, status} JSON; that wrapping bypasses some of the dodgy
// header behaviour that triggers "Ensure CORS response header values are
// valid" in Chrome. We try several relays; first non-empty result wins.
type Transport = {
  name: string;
  fetchJson: (url: string, signal?: AbortSignal) => Promise<unknown>;
};

const TRANSPORTS: Transport[] = [
  {
    name: 'allorigins',
    fetchJson: async (url, signal) => {
      const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const r = await fetch(proxied, { signal });
      if (!r.ok) throw new Error(`allorigins ${r.status}`);
      const wrap = await r.json() as { contents?: string };
      if (typeof wrap.contents !== 'string') throw new Error('allorigins no contents');
      return JSON.parse(wrap.contents);
    },
  },
  {
    name: 'codetabs',
    fetchJson: async (url, signal) => {
      const proxied = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`;
      const r = await fetch(proxied, { signal });
      if (!r.ok) throw new Error(`codetabs ${r.status}`);
      return r.json();
    },
  },
  {
    name: 'corsproxy.io',
    fetchJson: async (url, signal) => {
      // Legacy URL form (?<url>) — different code path from the broken ?url= form.
      const proxied = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const r = await fetch(proxied, { signal });
      if (!r.ok) throw new Error(`corsproxy.io ${r.status}`);
      return r.json();
    },
  },
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
      const j = await t.fetchJson(u.toString(), signal) as { states?: RawState[] };
      const states = j?.states ?? [];
      const flights = states.map(parseState).filter((f): f is FlightState => !!f);
      if (flights.length === 0) throw new Error(`${t.name} empty`);
      return { flights, source: 'opensky', via: t.name };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      // Try the next relay.
    }
  }

  return {
    flights: makeCannedFlights(Date.now()),
    source: 'canned',
    via: 'fallback',
    error: lastErr || 'all transports failed',
  };
}

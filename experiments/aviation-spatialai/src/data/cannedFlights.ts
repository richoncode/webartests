import type { FlightState } from './types';

// Fallback dataset for when OpenSky is rate-limited / unreachable. Six
// fictional aircraft over the SF Bay Area, distributed in altitude / heading
// so the demo still feels alive.
const BASE_LAT = 37.65;
const BASE_LON = -122.30;

export function makeCannedFlights(t: number): FlightState[] {
  const drift = (t / 1000) % 600; // 10-min loop
  const out: FlightState[] = [];
  for (let i = 0; i < 6; i++) {
    const phase = (drift / 600) * Math.PI * 2 + (i * Math.PI / 3);
    const radius = 0.18 + (i % 3) * 0.06;
    const lat = BASE_LAT + radius * Math.sin(phase);
    const lon = BASE_LON + radius * Math.cos(phase);
    const heading = ((Math.atan2(Math.cos(phase), -Math.sin(phase)) * 180) / Math.PI + 360) % 360;
    out.push({
      icao24: `demo${i.toString(16).padStart(2, '0')}`,
      callsign: `DEMO${100 + i}`,
      origin: 'United States',
      lon,
      lat,
      baroAltitudeM: 2000 + i * 1500 + 500 * Math.sin(phase * 1.7),
      velocityMps: 180 + i * 12,
      trueTrackDeg: heading,
      verticalRateMps: 4 * Math.cos(phase * 1.3),
      onGround: false,
      lastUpdate: Math.floor(t / 1000),
    });
  }
  return out;
}

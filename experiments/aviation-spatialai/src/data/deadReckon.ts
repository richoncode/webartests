import type { FlightState } from './types';

const M_PER_DEG_LAT = 111_000;

/**
 * Dead-reckon an aircraft's position forward by `(now - flight.lastUpdate)`
 * seconds using its last-known heading, ground speed and vertical rate.
 * Linear approximation — accurate enough over the 30-60 s between live
 * fetches (a typical airliner moves ~7 km in 30 s, so the small-angle
 * approximation in lat/lon stays well under a metre of error).
 */
export function deadReckon(flight: FlightState, now: number): { lat: number; lon: number; altM: number } {
  const elapsed = now - flight.lastUpdate;
  if (elapsed <= 0 || flight.onGround) {
    return { lat: flight.lat, lon: flight.lon, altM: flight.baroAltitudeM };
  }
  const headingRad = (flight.trueTrackDeg * Math.PI) / 180;
  const dN = Math.cos(headingRad) * flight.velocityMps * elapsed; // north metres
  const dE = Math.sin(headingRad) * flight.velocityMps * elapsed; // east metres
  const dAlt = flight.verticalRateMps * elapsed;
  const cosLat = Math.cos((flight.lat * Math.PI) / 180);
  return {
    lat: flight.lat + dN / M_PER_DEG_LAT,
    lon: flight.lon + dE / (M_PER_DEG_LAT * Math.max(0.1, cosLat)),
    altM: Math.max(0, flight.baroAltitudeM + dAlt),
  };
}

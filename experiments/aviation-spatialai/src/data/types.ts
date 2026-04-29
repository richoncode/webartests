// Subset of the OpenSky `states/all` shape we actually consume.
// https://openskynetwork.github.io/opensky-api/rest.html#all-state-vectors
export interface FlightState {
  icao24: string;
  callsign: string | null;
  origin: string | null;
  lon: number;          // deg
  lat: number;          // deg
  baroAltitudeM: number; // metres MSL (may be null in API → 0)
  velocityMps: number;  // m/s
  trueTrackDeg: number; // heading clockwise from north
  verticalRateMps: number; // +up
  onGround: boolean;
  lastUpdate: number;   // epoch seconds
}

export interface FlightHistoryPoint {
  t: number;       // epoch seconds
  lat: number;
  lon: number;
  altM: number;
}

export type FlightHistory = Record<string, FlightHistoryPoint[]>;

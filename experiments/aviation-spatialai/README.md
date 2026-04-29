# Aviation SpatialAI

Live ADS-B aircraft over Google Photorealistic 3D Tiles, with a TF.js
linear-regression "Flight Prediction Agent" projecting each aircraft's
trajectory 5 minutes into the future as a glowing blue route curtain.
WebVR-enabled via `@react-three/xr`.

## Stack

- **React + Vite + TypeScript**
- **React Three Fiber** + **drei** + **@react-three/xr**
- **3d-tiles-renderer** loads Google Photorealistic 3D Tiles via the
  Cesium Ion `CesiumIonAuthPlugin` (asset 2275207). Cesium Ion's free
  tier is the data gateway.
- **@tensorflow/tfjs** for the closed-form OLS regression on each
  aircraft's recent (lat, lon, alt) history.
- **KaTeX** for the floating LaTeX altitude panel (rendered to a canvas
  texture so it survives WebXR).
- **OpenSky Network** real public ADS-B feed (anonymous bbox query).

## Build / dev

```sh
npm install
echo 'VITE_CESIUM_ION_TOKEN=YOUR_TOKEN' > .env  # optional but recommended
npm run dev      # local dev
npm run build    # → dist/  (static, deployable on GitHub Pages)
```

`vite.config.ts` sets `base: './'` so the built `dist/` works at any
subpath (the deployed location is
`/webartests/experiments/aviation-spatialai/dist/`).

## Cesium Ion token

Sign up at <https://cesium.com/ion/signup> (free tier). The token is
shipped client-side; restrict it to your domain in the Cesium Ion
dashboard → Access Tokens → Allowed URLs.

Without a token the app falls back to a procedural blue globe so live
aircraft / prediction / VR still work for testing.

## OpenSky API

The free anonymous endpoint is rate-limited. We poll every 30 s when
live; if a request fails (rate limit, network) we fall back to a small
canned dataset of synthetic aircraft so the demo keeps running. The
HUD badge says `OPENSKY · LIVE` vs `OPENSKY · FALLBACK`.

## Coordinate frames

- ECEF for the globe / 3D Tiles.
- Scene-world is ECEF translated so the SF Bay centre is at the origin
  (avoids float32 precision loss at 6.4M-m magnitudes), then scaled by
  `1 m → 0.01 world units`.
- Aircraft orientation is ENU-relative (heading clockwise from north,
  pitch from vertical-rate / forward-speed; ADS-B doesn't include roll).

## VR

Click **Enter VR** in the HUD. Once a flight is selected, holding the
right-controller trigger pulls the rig to a chase position behind the
aircraft for as long as the trigger is held.

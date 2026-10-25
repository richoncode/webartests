# Spatial F1 demo: attributions

Unofficial fan demo. Not affiliated with Formula 1, the FIA, Circuit of the Americas, or any team.

## Car model: `f1-car.glb`
- "Low poly Formula 1 car" by **dreamsearchrepeat**, OpenGameArt.org
- https://opengameart.org/content/low-poly-formula-1-car
- License: **CC0 1.0** (public domain dedication), https://creativecommons.org/publicdomain/zero/1.0/
- Converted from `f1_car.blend` to GLB (mesh only, armature/camera/light removed). Generic red/white paint, no team livery or logos.

## Track: `cota.geojson`
- `us-2012.geojson` from **bacinger/f1-circuits** by Tomislav Bacinger, https://github.com/bacinger/f1-circuits
- License: MIT, Copyright (c) 2019-2025 Tomislav Bacinger. Full text below.

```
MIT License

Copyright (c) 2019-2025 Tomislav Bacinger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Telemetry: `openf1-9888-driver1.json`
- Cached slice of OpenF1 `car_data` for driver 1 (VER), Austin race session `9888`, laps 52–53.
- API: https://api.openf1.org/v1/car_data — docs: https://openf1.org/
- Query: `session_key=9888&driver_number=1&date>=2025-10-19T20:29:28.112&date<2025-10-19T20:32:44.386`
- OpenF1 is an independent project and is not associated with Formula 1, the FIA, or Formula One Management. The cache is stored so the demo does not call the API at runtime. Field mapping: `engine-data-mapping.html`.

## Sound
Original Web Audio synth in `engine-audio.js` (dyno-locked to the cached RPM and throttle). Voicing presets in `engines/*.json` (high-rev V6, throaty V8, idle-heavy, muted) are original configuration, not sampled recordings. Engine Sim (https://github.com/ange-yaghi/engine-sim, MIT, Ange Yaghi) is referenced as later work and is not vendored.

## Libraries
Mapbox GL JS (Mapbox terms, map data © Mapbox © OpenStreetMap), three.js (MIT).

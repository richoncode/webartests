# Tennis Rally — WebXR Spatial Audio Experiment

A browser-based, always-running tennis rally viewer built with [Babylon.js](https://www.babylonjs.com/).
Two procedural stick-figure players rally a physically-simulated ball forever; a spectator
camera orbits the court with damped, gesture-driven controls; every racket/floor impact drives
a fully custom-tunable spatial audio + reverb pipeline.

The app opens directly into the running simulation — there is no landing page.

## Run it

```sh
npm install
npm run generate-audio   # only needed once — writes the placeholder WAVs in public/audio/
npm run dev              # http://localhost:5173 (or whatever port Vite picks)
```

```sh
npm run build            # production bundle in dist/
npm run preview          # serve the built dist/ locally
```

No backend, no build step beyond Vite/esbuild bundling `@babylonjs/core`. WebXR (desktop
Chrome/Edge with a headset, Quest Browser, etc.) is enabled automatically when the browser
supports it; on anything else the app runs as a normal desktop 3D page.

## Controls

**Desktop**
- Drag (mouse/touch) horizontally, or `←`/`→` / `A`/`D` — orbit azimuth around the court center
- Mouse wheel, or two-finger pinch — move closer/farther
- Shift + drag vertically, or `↑`/`↓` / `E`/`Q` / Page Up/Down — raise/lower camera height
- "Reset View" button (top-right debug panel) — smoothly returns to the default view

**WebXR**
- Right controller thumbstick X — orbit azimuth
- Right controller thumbstick Y — closer/farther
- Left controller thumbstick Y — height
- Headset orientation drives pitch/yaw/roll directly, untouched by the rig

## Architecture

| Module | Responsibility |
|---|---|
| `core/TennisSimulation` | Owns the court, both players, the ball, and the always-on visual debug helpers |
| `court/CourtBuilder` | Regulation-proportioned court, net, lighting, simple stadium context |
| `players/PlayerController` + `StickFigure` | Procedural stick-figure rig, footwork, swing animation, racket position/velocity |
| `ball/BallController` | Ball physics (arc/bounce/spin), shot planning, hit detection — the only place events are emitted |
| `core/ImpactEventBus` | One-directional pub/sub: physics emits `racket-hit`/`floor-hit`, nothing emits back |
| `visuals/ImpactMarkers`, `BallTrail`, `DebugVectors` | Purely cosmetic, event-driven or ball-following visuals — never touch physics/hit-detection |
| `camera/SpectatorRig` | Damped azimuth/distance/height orbit camera; desktop input + WebXR thumbstick input; camera control only, no simulation logic |
| `audio/AudioSettingsStore` | Plain, serializable tuning-parameter model (racket/floor/spatial/reverb); no Babylon objects |
| `audio/BallAudio` | Subscribes to impact events, maps force → volume, picks/plays pooled spatial sounds — no physics |
| `audio/ReverbBus` | Hand-built Web Audio dry/wet/convolver/output-gain graph (no assumption of a Babylon reverb-zone API) |
| `audio/spatialAttenuation` | The standard Web Audio distance-attenuation formulas, shared by BallAudio's live readout and the tuning UI's preview graph |
| `ui/AudioTuningPanel`, `DebugUI` | DOM overlay panels; read/write `AudioSettingsStore` and toggle debug visuals — no audio or physics logic of their own |
| `xr/XrManager` | Thin polling wrapper exposing `inXR`/`camera`/`getThumbstickAxes()` to SpectatorRig |

### Event schema

Every ball impact is emitted once, from `BallController`, through `ImpactEventBus`:

```js
{
  type: "racket-hit" | "floor-hit",
  time,                    // seconds since the simulation started
  ball: { position, velocity, speed },     // Babylon Vector3 + number
  racket?: { playerId, centerPosition, velocity, speed },  // racket-hit only
  court?: { surfacePoint }                                  // floor-hit only
}
```

Both `floor-hit` and `racket-hit` also include `ball.incomingVelocity` / `ball.incomingSpeed`
(the velocity just before the bounce/contact) since the outgoing `ball.velocity` alone doesn't
tell you how hard it arrived. For `racket-hit`, `ball.velocity` is the real post-hit shot
velocity — planned *before* the event fires — not the trajectory the ball arrived on.

### Audio: how the pieces fit together

`BallAudio` never touches physics — it only reacts to events. For each hit it:

1. Computes a **force** value (racket: relative ball/racket speed + swing alignment; floor:
   vertical impact speed + total speed), then maps it to volume with the exact tunable linear
   formula from the spec (`volume = clamp(volumeMin + (force-forceMin)*(volumeMax-volumeMin)/(forceMax-forceMin), volumeMin, volumeMax)`).
2. Picks a random clip from that category's pool, applies volume/pitch jitter.
3. Grabs a pooled `BABYLON.Sound` voice (stealing the oldest if the category's
   `maxSimultaneousSounds` cap is already hit), positions it at the impact point, and plays it
   with the current spatial settings (panning model, distance model, min/max distance, rolloff,
   cone).
4. Fans that voice's native Web Audio output into `ReverbBus` — a hand-wired
   `dryGain` / `wetGain → highpass → lowpass → ConvolverNode → outputGain` graph, summed and
   sent to a shared `DynamicsCompressorNode` (set up in `main.js`) before the real destination,
   as a hard backstop against several near-simultaneous hits clipping.

**Venue scale.** Babylon's spatial sound has no notion of "world scale" — `venueScale` is applied
by dividing `refDistance`/`maxDistance` by it before handing them to Babylon (see
`spatialAttenuation.scaledSpatialParams`). This is mathematically equivalent to multiplying the
*perceived* distance by `venueScale` while leaving every mesh's real position untouched, which is
exactly the effect the tuning panel's "Venue Scale" slider is meant to have.

The tuning UI's distance→volume graph calls the exact same `computeAttenuation()` function
`BallAudio` uses for its live readout, so the graph is never just an approximation of what you'll
actually hear.

### Swapping in real audio

Every clip is loaded by URL, listed in `AudioSettingsStore`'s defaults:

```
public/audio/racket/racket-hit-1.wav   (…-2, …-3)
public/audio/floor/floor-bounce-1.wav  (…-2, …-3)
public/audio/impulse-responses/{small-room,outdoor-court,stadium}.wav
```

Drop in real recordings at the same paths (or edit the `clips` arrays / `impulseResponse` field
in `AudioSettingsStore.DEFAULT_SETTINGS`) and nothing else needs to change. The placeholder
clips shipped here are synthesized by `scripts/generate-placeholder-audio.js` (plain PCM
synthesis, no external assets) purely so the app has something audible out of the box.

### Settings are just JSON

`AudioSettingsStore.toJSON()` / `.fromJSON()` round-trip the entire tuning state (hit categories,
spatial/venue, reverb) as plain JSON, so a tuned preset can be captured and restored later without
touching code.

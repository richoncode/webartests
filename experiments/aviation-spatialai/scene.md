# Spatial Model — Aviation SpatialAI

A WebXR app rendering live ADS-B aircraft over Cesium Ion photorealistic
3D Tiles of the SF Bay area, with predicted trajectories and a head-tracked
list panel. This document is the single source of truth for **which way is
up** in this scene.

The app deliberately keeps **multiple coordinate systems** rather than
collapsing into one. The rules below define each, the transforms between
them, and the order objects compose those transforms.

---

## 1. Coordinate System Inventory

| Id | Name | Handedness | +X | +Y | +Z | Units | Origin | Source |
|----|------|------------|----|----|----|-------|--------|--------|
| `WORLD` | WebXR world (a.k.a. Three.js scene root) | right | right | up (anti-gravity) | toward viewer (so −Z = forward) | metres | local-floor reference space origin (user's actual floor, at the start position) | `XRSession` reference space (local-floor) |
| `VIEWER` | Viewer / head space (the Three.js camera local frame) | right | right of head | top of head | back of head (−Z = gaze direction) | metres | between the eyes | WebXR `XRViewerPose` |
| `CTRL_GRIP_L` / `CTRL_GRIP_R` | Controller grip space (handle position) | right | controller right | controller up | controller back | metres | controller pivot in the user's hand | WebXR `XRInputSource.gripSpace` |
| `CTRL_RAY_L` / `CTRL_RAY_R` | Controller target-ray space (pointer ray) | right | ray right | ray up | back along ray (so −Z = ray direction) | metres | controller pointer origin | WebXR `XRInputSource.targetRaySpace` |
| `SCENE_ENU` | App-defined local East-North-Up frame at the venue (SF Bay) | right | east | north | up (anti-gravity) | scene units (1 unit = 100 m, see §4) | venue reference point on the WGS-84 ellipsoid | App (this file's `geo.ts`) |
| `GEODETIC` | WGS-84 latitude / longitude / ellipsoidal height | – | – | – | – | degrees, degrees, metres | centre of WGS-84 ellipsoid | airplanes.live ADS-B feed; map UI |
| `ECEF` | Earth-Centered, Earth-Fixed | right | (lat 0°, lon 0°) | (lat 0°, lon 90°E) | north pole | metres | centre of Earth (WGS-84) | Internal intermediate; Cesium Ion 3D Tiles vertices |
| `BODY` | Aircraft body frame (procedural plane mesh) | right | nose / forward | port (left) wing | up (vertical fin) | metres | aircraft centre of mass | App-defined; mesh built in `Aircraft.tsx` |
| `PANEL` | UI panel local frame (drei `<Text>`, `<planeGeometry>`) | right | reading direction (left → right) | line stack-up direction (lines descend in −Y) | front face normal (text reads from +Z side) | metres | panel anchor (varies per panel) | drei conventions |

**`WORLD` has Y-up by Three.js / WebXR convention.**
**`SCENE_ENU` has Z-up by geographic convention.** That mismatch is real, and is resolved by exactly one rotation (see §2 edge `WORLD ← SCENE_ENU`).

---

## 2. Transform Graph

```
                                ┌─────────────────────┐
                                │      GEODETIC       │
                                │   (lat, lon, alt)   │
                                └──────────┬──────────┘
                                           │  geodeticToECEF(WGS-84)
                                           ▼
                                ┌─────────────────────┐
                                │        ECEF         │◀── 3D Tiles vertices
                                │   (Earth-fixed m)   │      (Cesium Ion)
                                └──────────┬──────────┘
                                           │  T_scene_ecef:
                                           │    translate by −E_ref,
                                           │    rotate ECEF→ENU at ref,
                                           │    uniform scale by SCALE
                                           ▼
            ┌──────────────────┐    ┌─────────────────────┐
            │     BODY         │───▶│      SCENE_ENU      │◀─── App-defined static
            │  (aircraft)      │    │  +X east  +Y north  │     content (boreholes,
            └──────────────────┘    │     +Z up           │      orebody, etc.)
              q_body_scene =        └──────────┬──────────┘
                aircraftScene-                 │  R_world_scene =
                Quaternion(H,P,R)              │    Rx(−π/2)   (static)
                                               ▼
            ┌──────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
            │     PANEL        │───▶│        WORLD        │◀───│    VIEWER       │
            │  (label, list)   │    │  +Y up  −Z forward  │    │   (head pose)   │
            └──────────────────┘    └──────────┬──────────┘    └─────────────────┘
                                               ▲                        ▲
                                               │ T_world_grip            │ WebXR runtime
                                               │ T_world_ray  (per frame)│  per frame
                                               │                         │
                                    ┌──────────┴──────────┐
                                    │  CTRL_GRIP_*        │
                                    │  CTRL_RAY_*         │
                                    └─────────────────────┘
```

### Edge table

| Edge (source → target) | Representation | Static / Dynamic | Owner |
|---|---|---|---|
| `GEODETIC → ECEF` | Pure-function `geodeticToECEF()` (WGS-84 ellipsoid eqs) | static (no per-frame state) | App, `geo.ts` |
| `ECEF → SCENE_ENU` | Affine: `T_scene_ecef = S · R_ecef→enu(refLat, refLon) · Translate(−E_ref)` | static | App. Stored as the Three.js Group transform on the 3D Tiles tile group AND inlined inside `geodeticToSceneENU(...)` for plain points. |
| `SCENE_ENU → WORLD` | Pure rotation `R_world_scene = Rx(−π/2)` | static | App. Realised as `<group rotation={[-π/2, 0, 0]}>` in `App.tsx`. |
| `BODY → SCENE_ENU` | Quaternion `q_body_scene = aircraftSceneQuaternion(heading, pitch, roll)` | dynamic (per ADS-B sample, smoothed by dead-reckoning) | App, `geo.ts` |
| `WORLD → VIEWER` | `T_world_viewer` from `XRViewerPose.transform` | dynamic, every XR frame | WebXR runtime; Three.js `WebXRManager` writes it to `camera.matrixWorld` |
| `WORLD → CTRL_GRIP_*` | `getPose(gripSpace, refSpace).transform` | dynamic, every XR frame | WebXR runtime; surfaced via `<XRSpace space={…} />` |
| `WORLD → CTRL_RAY_*` | `getPose(targetRaySpace, refSpace).transform` | dynamic, every XR frame | WebXR runtime; surfaced via `<XRSpace space={…} />` |
| `PANEL → WORLD` | Per-panel; see §5 and §7 | dynamic | App, per-frame `useFrame()` |

### Constants

```
SCALE       = 0.01            (Three.js units per metre, scene_unit/m)
ref         = (37.625°, -122.25°, 0 m)        (SF Bay venue, geodetic)
E_ref       = geodeticToECEF(ref)              (≈ (-2 700 000, -4 280 000, 3 890 000) m)
R_ecef→enu  = ecefToEnuMatrix4(37.625°, -122.25°)
R_world_scene = | 1   0   0 |
                | 0   0   1 |
                | 0  -1   0 |
```

### Closed-form transform equation

For a geodetic point `p = (lat, lon, h)`, its position in `WORLD` is:

```
p_world = R_world_scene · SCALE · R_ecef→enu · (geodeticToECEF(p) − E_ref)
```

The matching scene-local (i.e. SCENE_ENU) coordinate is

```
p_scene = SCALE · R_ecef→enu · (geodeticToECEF(p) − E_ref)
```

…and the inverse `WORLD → SCENE_ENU`:

```
(x, y, z)_world  →  (x, −z, y)_scene
(x, y, z)_scene  →  (x, z, −y)_world
```

This is `sceneToWorld()` / its inverse in the source.

---

## 3. Canonical Direction Definitions

| Space | Forward | Up | Right |
|---|---|---|---|
| `WORLD` | `−Z` (Three.js camera default look direction) | `+Y` | `+X` |
| `VIEWER` | `−Z` (gaze) | `+Y` (top of head) | `+X` |
| `CTRL_GRIP_*` | `−Z` (palm direction by WebXR convention) | `+Y` | `+X` |
| `CTRL_RAY_*` | `−Z` (the pointer ray) | `+Y` | `+X` |
| `SCENE_ENU` | `+Y` (north) | `+Z` (up) | `+X` (east) |
| `BODY` | `+X` (nose) | `+Z` (vertical fin) | `−Y` (`+Y` is port / left) |
| `PANEL` | `+Z` (text-readable side, where drei `<Text>` reads correctly) | `+Y` (line-stack ascending) | `+X` (reading direction) |

### Mismatches that matter

- **`SCENE_ENU` is Z-up; `WORLD` is Y-up.** The `Rx(−π/2)` static rotation is the *only* place that mismatch lives. Do not introduce additional Z-up assumptions outside the rotated group.
- **`BODY` is +Y left, not +Y up.** Right-handed-ness with +X-forward and +Z-up forces +Y to be on the port side. Anything indexing into wing positions must respect this.
- **`PANEL` forward is `+Z`, but the Three.js `Object3D.lookAt(target)` convention for non-cameras puts `+Z` toward the target.** Convenient — `panel.lookAt(camera)` is a correct "face the user" call. (Three.js cameras use `−Z` as forward; non-camera `lookAt` flips the convention.)

---

## 4. Asset Normalization Rules

### Aircraft mesh (`Aircraft.tsx`)

The procedural plane mesh is built directly in `BODY`:

- Fuselage cylinder along `+X`, length 36 m
- Wings span `±Y`, chord along `+X`, very thin in `Z`
- Vertical fin extends along `+Z` at the tail

No reorientation at "load time" — the mesh **is** authored in `BODY`. The rotation that places it in `SCENE_ENU` comes from `aircraftSceneQuaternion(heading, pitch, roll)`:

```
heading_rad = heading_deg · π / 180        (clockwise from north)
yaw_quat    = quat(axis = SCENE_ENU.+Z, angle = π/2 − heading_rad)
pitch_quat  = quat(axis = BODY.−Y,       angle = pitch_rad)        // applied AFTER yaw, in body frame
roll_quat   = quat(axis = BODY.+X,       angle = roll_rad)         // applied AFTER pitch
q_body_scene = yaw_quat · pitch_quat · roll_quat
```

Heading=0 maps `BODY.+X` → `SCENE_ENU.+Y` (north), as expected.

**Visual scale multiplier.** Aircraft are drawn at `VIS = 40 ×` physical size. This is a *presentation* scale and lives only inside `Aircraft.tsx`. Position is not affected. Rationale: a 36 m airliner at SCALE 0.01 is 0.36 scene units long; sub-pixel from 200 m of orbit-camera distance. Multiplying makes them legible without changing the geographic position.

### Cesium Ion / Google Photorealistic 3D Tiles

Tile vertices arrive in `ECEF`. The `<TilesRenderer>` group's transform realises `ECEF → WORLD` directly via:

```
group.scale       = SCALE                                   (uniform)
group.quaternion  = quaternion(R_world_scene · R_ecef→enu)
group.position    = −SCALE · (R_world_scene · R_ecef→enu) · E_ref
```

so for a tile vertex `v`,

```
v_world = group.position + group.quaternion · (group.scale · v)
        = R_world_scene · SCALE · R_ecef→enu · (v − E_ref)
```

i.e. the same closed form as §2. We deliberately compose `R_world_scene` here so the tile group can sit at the canvas root rather than inside the scene-ENU group, which keeps it on the same matrix-update path as the WebXR camera.

### drei `<Text>` and `<planeGeometry>`

drei's `<Text>` and Three.js's `PlaneGeometry` both face `+Z` and have +X as the reading / right axis, +Y as the up / vertical-stack axis. We do **not** flip text geometry or UVs at load time; instead we orient `PANEL → WORLD` such that `PANEL.+Z` points at the camera (see §7).

---

## 5. Object Placement Model

The world transform of a leaf object is composed strictly outside-in:

```
M_world_object = M_world_parent · M_parent_object
```

Concrete chains used in this app:

### A. Geographically-anchored object (e.g. a Connect-N-board built from BODY assets)

```
M_world_object = R_world_scene · M_scene_app · M_app_asset · M_asset_local
```

where `M_scene_app` is, for our app, just the geographic placement (geodetic → SCENE_ENU described in §2) and `M_app_asset` is identity (we don't introduce a separate "app group" yet).

### B. Aircraft

```
M_world_aircraft
  = R_world_scene
  · T_scene(p_scene)                       // p_scene = geodeticToSceneENU(lat, lon, alt)
  · q_body_scene(heading, pitch, roll)     // BODY → SCENE_ENU
  · S_VIS                                   // visual scale 40×, BODY-local
```

### C. Head-anchored / world-anchored UI panels

See §7 for the full chain (the chain depends on whether the panel is head-locked or anchored along a camera→target ray).

---

## 6. Input / Tracking Relationships

| Input | Source space | Target space | Update rate | Effect |
|---|---|---|---|---|
| Head pose | `VIEWER` | `WORLD` | Every XR frame | Three.js `WebXRManager` writes `T_world_viewer` to `camera.matrixWorld`. The user's view frustum follows. The app *does not* override head transforms. |
| Controller grip pose | `CTRL_GRIP_*` | `WORLD` | Every XR frame | Surfaced as `<XRSpace space={inputSource.gripSpace}>` — the wrapped group's `matrixWorld` *is* the grip pose. |
| Controller target-ray pose | `CTRL_RAY_*` | `WORLD` | Every XR frame | Same pattern. `HoverDetector.tsx` reads `getWorldPosition` / `getWorldQuaternion` of the wrapped group to derive the world-space ray. |
| `WORLD → SCENE_ENU` | – | – | Static | Never mutated. The only thing that uses head/controller poses against `SCENE_ENU` is hover-pick, and it converts `SCENE_ENU → WORLD` to compare in the world frame. |

`SCENE_ENU` does **not** rotate or translate in response to any input. The user moves through the world; the world stays put.

---

## 7. Canonical Examples

### Example 1 — World-anchored aircraft (live ADS-B)

A flight at `(lat 37.65°, lon −122.30°, alt 4 000 m)` with heading 90° (east), pitch 0°, roll 0°.

```
p_geodetic   = (37.65, -122.30, 4000)
p_ecef       = geodeticToECEF(p_geodetic)
p_scene      = SCALE · R_ecef→enu · (p_ecef − E_ref)
             ≈ (-44, 27, 40)             // east −44, north +27, up 40 (m × 0.01)
q_body_scene = aircraftSceneQuaternion(90°, 0, 0)
             // BODY.+X (nose) → SCENE_ENU.+X (east)
             // (heading=0 → north; +90° clockwise = east)

M_world_aircraft = R_world_scene
                 · T_scene(p_scene)
                 · q_body_scene
                 · S_VIS=40
```

`p_world` (object position only) = `R_world_scene · p_scene` = `(p_scene.x, p_scene.z, −p_scene.y)` = `(-44, 40, -27)`.

### Example 2 — Head-locked VR list panel (`VRListPanel.tsx`)

Body-frame anchor — yaw of head only, no pitch/roll, world-up reference for "up".

```
camFwd_world = (0, 0, -1) · q_world_viewer        // head forward in WORLD
bodyFwd      = normalize(camFwd_world · {x, 0, z})  // project to horizontal
bodyRight    = bodyFwd × WORLD.+Y

p_panel_world =
    p_camera_world
  + bodyFwd  · 0.6 m         // 60 cm in front
  + bodyRight · (-0.45 m)    // 45 cm to the left
  + WORLD.+Y · (-0.05 m)     // 5 cm below eye level

// Orientation: face the camera with WORLD up as reference.
panel.up.set(WORLD.+Y)
panel.lookAt(p_camera_world)
// → PANEL.+Z faces the camera (Object3D.lookAt convention for non-cameras),
//   so drei <Text> reads correctly to the user.
```

The panel's transform chain is `M_world_panel = T_world(p_panel_world) · R_lookAt`. The panel is **not** under the rotated SCENE group — it is a direct child of the canvas root, in `WORLD` already.

### Example 3 — Controller-attached object (hover ray probe)

The `HoverDetector` mounts an empty `<group>` inside `<XRSpace space={inputSource.targetRaySpace}>`. The wrapped group's world matrix *is* the controller ray pose:

```
g.getWorldPosition(rayOrigin)              // CTRL_RAY origin in WORLD
g.getWorldQuaternion(rayQuat)
rayDirection = (0, 0, -1) · rayQuat        // ray points along CTRL_RAY.−Z
```

To check whether it points at an aircraft `f`:

```
p_world_aircraft = R_world_scene · geodeticToSceneENU(f.lat, f.lon, f.alt)
toAircraft       = normalize(p_world_aircraft − rayOrigin)
angle            = acos(rayDirection · toAircraft)
hit              = angle < RAY_HALF_RAD       // RAY_HALF_RAD = 3°
```

Note: the comparison happens entirely in `WORLD`. We deliberately go `SCENE_ENU → WORLD` rather than the reverse to avoid pulling the controller pose through the static `Rx(−π/2)`, which would double-rotate it.

---

## 8. Validation Rules

### Invariants

1. **Gravity in `WORLD` is `-Y`.** All objects whose intuitive "up" is anti-gravity must satisfy `up · WORLD.+Y > 0` after every transform.
2. **`SCENE_ENU.+Z = R_world_scene⁻¹ · WORLD.+Y`.** I.e. scene-Z-up maps to world-Y-up. If you ever observe scene-positive-Z content rendering "sideways" in `WORLD`, the scene group's rotation is wrong or has an extra/missing transform on the path.
3. **`R_world_scene` is a pure rotation** (`det = +1`, orthogonal). No scale, no reflection. Scale lives in `geodeticToSceneENU` and the tile group only.
4. **Headset and controller poses are always in `WORLD`.** Components that consume them (`HoverDetector`, `XRControls`, panels) live at the canvas root, not under the rotated group, so the static rotation is never accidentally composed twice.
5. **Aircraft heading 0° → `BODY.+X` aligns with `SCENE_ENU.+Y` (north).** A unit test on `aircraftSceneQuaternion` is the single check that catches sign errors.
6. **`sceneToWorld(p_scene) = R_world_scene · p_scene = (x, z, −y)`.** Any other formula that masquerades as the conversion is wrong.

### Common errors and how they look on screen

| Symptom | Likely cause | Where to look |
|---|---|---|
| Aircraft rendered upside-down or 90° pitched | `BODY → SCENE_ENU` HPR composition order wrong, or pitch-axis sign flipped | `aircraftSceneQuaternion` in `geo.ts` |
| Aircraft fly horizontally but scene grid is a vertical wall in VR | Grid was placed *inside* the rotated SCENE group (rotation applied twice) | Grid lives at the canvas root in `App.tsx`. |
| Controller ray points at the wrong place | `<XRSpace>` is inside the rotated SCENE group, double-rotating the controller pose | Move the consumer (`HoverDetector`, `XRControls`) outside `<group rotation={SCENE_ROTATION}>`. |
| Photoreal tiles never load on first XR enter | Tile-renderer LOD evaluator is bound to the desktop camera while Three.js renders through `gl.xr.getCamera()` | `PhotorealTerrain.tsx`: pass `gl.xr.getCamera()` when `gl.xr.isPresenting`. |
| List panel ends up over the user's head facing the floor | Panel position rotated by the *full* head quaternion (incl. pitch/roll) instead of the body-frame yaw projection | `VRListPanel.tsx`: use `bodyFwd × WORLD.+Y`, not `q_world_viewer`. |
| Info panel rolls opposite to head roll | Panel uses world-up as its lookAt reference (Billboard with `lockX`) | Switch to `panel.quaternion = camera.quaternion` so the panel inherits head roll. |
| Aircraft positions look *almost* right but ~12 km too far west | Sign error in `R_ecef→enu`'s longitude term, or `lat`/`lon` swapped at the call site | Unit test: feed `(lat, lon, 0)` of the reference; expect `p_scene = (0, 0, 0)`. |
| One aircraft sits at world origin no matter the data | `flight.lat` or `flight.lon` is 0 (likely null from feed). | Check `parseAircraft()` for `null` guards. |
| Mesh visible from desktop but invisible in VR | Object inside SCENE group with a per-frame transform that uses `getWorldPosition()` *before* the SCENE group's matrix has been re-evaluated | Move the calculation outside the group, or use a useFrame priority that runs after Three.js's pre-render matrix sync. |

### Debugging checklist

When something looks wrong:

1. Print the object's `matrixWorld` and decompose into translation, rotation, scale.
2. Identify which space the printed coordinates *should* be in. They are always in `WORLD` for `matrixWorld`.
3. Walk the chain from §5 backwards — does each link make sense?
4. Check whether the offending object lives *inside* `<group rotation={SCENE_ROTATION}>`. If yes, its local coords are in `SCENE_ENU`. If no, in `WORLD`.
5. For input devices (head, controllers): always verify *before* checking app logic that `getWorldPosition()` returns a sensible value (head ~ 1.5 m above floor, controllers near hand height).
6. For Cesium tiles: verify that `gl.xr.isPresenting` is true *and* that the camera passed to `tiles.setCamera()` matches what Three.js is rendering through.

# Tennis Tracking Data Format

Reference documentation for `sample_tennis_data_v4.json`, a real professional match-tracking
export (skeleton + ball tracking) fetched from
`https://nba-dev.configs.quintar.ai/regar/sample_tennis_data_v4.json`.

The data file itself lives at `public/reference-data/sample_tennis_data_v4.json` (not alongside
this doc) so the running app can `fetch()` it at runtime — Vite only serves/bundles files under
`public/`. This documentation file stays at the top level since it's for humans/AI, not runtime.

This is genuine ground-truth data — real ball speeds, spin rates, stroke types, and body/racket
joint positions from an actual ATP match — not a synthetic sample. It's a useful reference for
validating or parameterizing this project's own ball/audio physics (see
`public/tennis-audio-physics.html`'s "spin isn't in the force model" gap, for one direct
connection: this file's `spin.rpm` values, ~1500–1550 rpm for a topspin backhand, land right in
the range the cited Takeda et al. paper measured for real serves).

This document describes what was directly observed in the sample file (enumerated field values,
cross-referenced structures) — not an official schema from the data provider. Where something is
inferred rather than confirmed, it's flagged as such.

## Provenance (this sample)

- **Match**: Jannik Sinner vs. Carlos Alcaraz, US Open 2025, Men's Singles, Round of 2 (final)
- **Court**: Arthur Ashe Stadium
- **Window**: a 3-minute slice (`2025-09-07T18:53:03.213Z` to `18:56:03.213Z`), covering 5 points
- **Size**: ~21.8 MB, single JSON object

## Top-level shape

```
{
  "meta": { ... },      // match/competition/player/tracking-system context, once
  "summary": { ... },   // counts, for sanity-checking the payload
  "motions": [ ... ],   // one entry per ball-trajectory *arc* (128 in this sample)
  "frames": [ ... ]     // one entry per tracked timestep (8994 in this sample)
}
```

## `meta`

Static context for the whole file — not repeated per-frame.

| Field | Notes |
|---|---|
| `competition.name` / `.year` / `.type` | e.g. `"US Open"`, `2025`, `"GS"` (Grand Slam) |
| `court.name` | e.g. `"Arthur Ashe Stadium"` |
| `match.format` | e.g. `"BestOfFiveTenPointFinalSetTiebreak"` |
| `match.round` | e.g. `"RoundOf2"` (the final) |
| `tracking_system.targetFrameRate` | `50.0` — nominal capture rate in Hz |
| `tracking_system.umpireToLeft` | orientation flag for the tracking volume |
| `tracking_system.models.skeleton.settings.name` | the pose-estimation model version used |
| `players[]` | one entry per player: `objectId` (short tracking-system ID, e.g. `"S0AG"`), `team`, `shortName`, `forename`, `surname`, `atpId`, `smtId`, `handedness` |
| `joint_order` | the 20 joint names, **in the exact order** `players[].joints` arrays use everywhere else in the file (see below) |
| `settings.only_rally_ball_positions` | `true` in this sample — non-rally ball positions (e.g. between points) are mostly excluded |

### `joint_order` (20 entries, index-aligned with every `joints` array in `frames`)

```
0  neck        5  lWrist   10 rKnee    15 head
1  lShoulder   6  rWrist   11 lAnkle   16 rightEdge
2  rShoulder   7  lHip     12 rAnkle   17 leftEdge
3  lElbow      8  rHip     13 handle   18 rightCorner
4  rElbow      9  lKnee    14 shaft    19 leftCorner
```

Notably, this isn't just a body skeleton — indices 13–19 (`handle`, `shaft`, `head`,
`rightEdge`, `leftEdge`, `rightCorner`, `leftCorner`) are **racket geometry**, tracked as part of
the same per-player joint array every frame. A `joints` entry can be `null` for any index
individually (occlusion/missed detection for that one point that frame) — in this sample, about
2% of all joint values across all frames/players are `null`.

## `summary`

Just sanity-check counts for the payload — `joint_frames`, `ball_samples`, `ball_arcs`,
`shot_events`, `total_frames`, etc. Useful for confirming a parse picked up everything, not
meant to be interpreted beyond that.

## `motions[]` — one entry per ball-trajectory arc

A rally shot's flight isn't one entry — it's broken into a short sequence of **arcs**, each
describing one physically-distinct segment of the ball's path. Grouping key: `(segment, shot)`.

| Field | Notes |
|---|---|
| `segment` | the point/rally number (5 distinct values in this sample: `11`–`15`) |
| `shot` | shot index within that point, starting at `1` |
| `arc` | ordinal position of this segment within the shot (see below) |
| `arc_type` | what kind of ball-flight segment this is — see enum below |
| `event_id` | groups every arc belonging to the same shot — **not** unique per row. A serve's `Toss`, `Hit`, `Skid`, and `Bounce` arcs all share one `event_id` |
| `revision` | observed to vary *per arc*, not uniformly across a shot's arcs (e.g. one shot's three arcs carried revisions `[0, 0, 1]`) — inferred to mean each arc segment can be independently recomputed/corrected by the tracking pipeline; not confirmed against source documentation |
| `ts_start` / `ts_end` | this arc's time span |
| `zero_time_utc` | a reference timestamp shared by every arc in the same shot |
| `rally_status` | only ever `"Unknown"` in this sample |
| `curve_type` | only ever `"Polynomial_X_Y_Z"` in this sample |
| `curve_params.{x,y,z}` | 4 polynomial coefficients per axis fitting this arc's trajectory. Exact coefficient ordering/basis (e.g. power of normalized time, and whether highest- or lowest-order term comes first) wasn't verified against source docs — treat as opaque unless cross-checked against `frames[].ball.pos` for the same time range |
| `speed.{mph,kph,mps}` | **only populated when `arc_type == "Hit"`** — the shot's ball speed off the racket |
| `spin.{type,rpm,rps}` | **only populated when `arc_type == "Hit"`** — `type` is `"Top"`, `"Back"`, or `"Unknown"` |
| `stroke` | **only populated when `arc_type == "Hit"`** — `"Forehand"` or `"Backhand"` (serves/tosses leave this `null`) |
| `side` | **only populated when `arc_type == "Hit"`** — `"Left"` or `"Right"` |

### `arc_type` enum (observed) and typical ordering

```
Toss    — serve ball-toss trajectory (arc 1, serve shots only)
Hit     — racket-to-ball contact through the outgoing flight (carries speed/spin/stroke/side)
Clip    — the ball clipping the net (seen as an extra arc inserted mid-shot)
Skid     — the ball's post-bounce skid segment
Bounce  — the ball's trajectory following a bounce
```

A typical rally shot's arc sequence: `Hit(1) → Skid(2) → Bounce(3)`.
A typical serve's arc sequence: `Toss(1) → Hit(2) → Skid(3) → Bounce(4)`.
A shot that clips the net: `Hit(1) → Clip(2) → Skid(3) → Bounce(4)`.
A shot landing twice before the next contact (e.g. the point ends and the ball rolls/bounces
again): `Hit(1) → Skid(2) → Bounce(3) → Skid(4) → Bounce(5)`.

## `frames[]` — one entry per tracked timestep

8994 entries in this sample, at the nominal 50 Hz target rate (matches
`meta.tracking_system.targetFrameRate`).

| Field | Notes |
|---|---|
| `ts` | this frame's timestamp |
| `ball.pos` / `.vel` / `.acc` | `[x, y, z]`, in meters and meters/second(²) — see coordinate system below |
| `ball.segment` / `.shot` / `.arc` | which motion arc (from `motions[]`) this frame's ball sample belongs to |
| `ball.event_marker` | `null`, or one of `"First"`, `"Bounce"`, `"Hit"`, `"Peak"`, `"Crossing"`, `"Last"` — marks this frame as a specific notable instant within the ball's arc (apex of flight, net crossing, etc.) |
| `ball.rally_status` | only ever `"Unknown"` or `null` in this sample |
| `hitter` / `receiver` | the `objectId` (string, e.g. `"S0AG"`) of the two players in the current point — populated for ~99.7% of frames in this sample, `null` for the rest |
| `players[].objectId` | which player this joint set belongs to |
| `players[].joints` | array of 20 `[x, y, z]` positions (or `null` per-entry), in `meta.joint_order`'s index order |

### Coordinate system (inferred from observed ranges, not from documentation)

All positions are in **meters**, in a court-centered coordinate frame:

- **x** — along the court's length. Ball and player positions range roughly ±18–20m (a
  singles court is 23.77m end-to-end, so this comfortably covers the full court plus some
  run-off room behind the baseline).
- **y** — lateral (court width). Range roughly ±7.5–9m (a doubles court is 10.97m wide; this
  covers the full width plus some run-off).
- **z** — height. Ball height ranges ~0.03m (near the ground) to ~4.5m (apex of a high shot);
  player joint heights range roughly −0.7m to 3m (the negative floor is presumably tracking
  noise/calibration slack right at ground level, not a real below-court position).

This is inferred from the data's own value ranges, not confirmed against source documentation —
treat the exact origin/axis convention as approximate until cross-checked.

## Practical notes for reuse

- **File size**: ~22MB for a 3-minute/5-point window. A full match would be substantially
  larger — this is a *sample*, not something to assume scales linearly without checking.
- **Joint occlusion**: always guard for `null` entries in `joints[]` and in individual `pos`
  components — roughly 2% of joint values are missing in this sample, presumably from
  camera occlusion or low pose-estimation confidence.
- **Only `Hit` arcs carry shot-level metadata** (`speed`, `spin`, `stroke`, `side`) — `Toss`,
  `Clip`, `Skid`, and `Bounce` arcs describe ball flight only, with those four fields `null`.
- **Cross-referencing a shot's full physical story** means joining `motions[]` (the arc-level
  summary — one row per segment, with the `Hit` row carrying speed/spin) with `frames[]` (the
  raw per-timestep ball and joint positions covering that same `(segment, shot, arc)` window).

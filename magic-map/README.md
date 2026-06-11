# Magic Map

A location-based walking game platform. The first resident game is **Squirrel Scouts** —
explore your real neighbourhood, lift the fog of war, and befriend hidden squirrels.
The directory is named `magic-map` (not `squirrels`) because more games will share the
map core later.

**Play:** `https://<user>.github.io/webartests/magic-map/` (needs HTTPS for GPS — GitHub Pages provides it).

## How the game works

| Loop | Mechanic |
|---|---|
| Walk daily | 250 m/day keeps the 🔥 streak alive; streaks boost rare-spawn luck up to +60% |
| Walk further | Catches ≥1 km / 2 km / 5 km from home earn ×1.25 / ×1.5 / ×2 "Frontier" XP |
| Explore | Fog of war lifts permanently in ~50 m cells; uncovered area feeds the Fogbreaker achievement |
| Collect | 20 species across 6 rarity tiers; Flying Squirrel is night-only; Ratatoskr is a 0.1% mythic |

Squirrels are invisible until you're inside your **detection radius** (a rustling 🍂 hint),
and reveal for catching inside ~28 m. Achievements and levels grant wider detection, a bigger
fog torch, 🌰 acorn bait (10-minute spawn surge), a 📡 radar ping, map themes, and trail colours.

## Safe spawn placement

Spawn points are generated from live OpenStreetMap data (Overpass API):

1. Fetch all walkable/drivable ways within 600 m of the player (refetched after moving 350 m).
2. Pick a way weighted by walkability (footpaths ≫ primary roads), then a random point along it.
3. Offset **perpendicular to the centreline** by a class-dependent distance
   (3–8 m for footpaths, up to 18–30 m for primary roads) — never *on* the road.
4. Reject any candidate within 7 m of **any** motor-road centreline, outside the
   90–430 m spawn ring, or within 30 m of another spawn.

If Overpass is unreachable, spawning falls back to open scatter so the game stays playable.

## Architecture

```
magic-map/
  index.html          App shell: boot screen, HUD, panels, modals
  css/style.css       Dark theme per repo style guide
  js/
    config.js         All tuning knobs, map themes, XP curve
    util.js           Geo math (haversine, dest point, projections), helpers
    state.js          GameState — persistence (localStorage), XP/levels, streaks
    geo.js            LocationEngine — real GPS or mock (D-pad / teleport / speed)
    fog.js            Fog-of-war canvas layer + exploration grid
    roads.js          Overpass road fetch + safe spawn-point sampling
    spawner.js        Live squirrel population, hidden→rustle→revealed states
    squirrels.js      Species compendium (CSS-filter-recoloured 🐿️, no assets)
    achievements.js   Tiered achievements + reward application
    ui.js             HUD, Den/Journal/Settings panels, catch modal, toasts
    main.js           Bootstrap + game loop wiring
```

No build step. Leaflet 1.9 from CDN; CARTO basemap tiles restyled with CSS filters
(invert + hue-rotate) for the Niantic-style looks. All progress is in `localStorage`.

## Testing without walking

- Tap **"No GPS here? Explore in demo mode"** on the boot screen (or toggle Demo mode in
  Settings). Auto-enabled when geolocation is denied/unavailable — e.g. Meta Quest browser.
- **D-pad** (or WASD/arrow keys on desktop) walks at 1.5 m/s; the **1×/4×/15×** button
  speeds it up. Mock walking counts toward distance/streaks so the whole reward loop is testable.
- **Teleport: ON** then tap anywhere on the map to jump (teleports don't count as distance;
  spawns and roads regenerate at the destination).
- **Reset all progress** lives in Settings → Danger zone.

Real-GPS anti-cheat: fixes faster than 6 m/s or jumping >150 m are ignored for distance.

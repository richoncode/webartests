# Tennis Rally Spatial Audio — Demo Script

A narrated walkthrough of every feature in the Audio Tuning tool, written for a
**general audience** (not audio engineers). This document is the source of
truth for two separate production steps:

1. **Record narration audio** — one file per `NARRATION` block below, using
   the text exactly as written.
2. **Drive + record the screen capture** — once narration files exist and
   their durations are known, Claude uses Playwright against the running app
   (`http://localhost:4321/`) to perform the `ACTIONS` in each scene, paced to
   match that scene's narration length, while a video recording runs
   continuously. Narration audio is muxed onto the recorded video afterward
   (see "Recording & Sync Workflow" at the end) — the two are produced
   separately and joined by shared per-scene durations, not recorded live
   together.

Target audience for the narration voice: a curious tennis fan who has never
touched a spatial-audio tool before. No jargon — describe what things *sound
like* and *feel like*, not signal-processing theory. This mirrors the tone
already used in the tool's own hover tooltips.

---

## How to use this document

- Each scene has a stable **id** (`S01`, `S02`, ...) — audio files must be
  named `narration/S01-<slug>.mp3` etc., matching the slug in the scene
  heading, so the pairing between text and file is unambiguous.
- **NARRATION** is read verbatim by the voice talent / TTS engine. Nothing
  outside that block gets recorded.
- **ACTIONS** are Playwright instructions for Claude to execute during
  playback of that scene's narration. They're written as a numbered sequence;
  distribute them evenly across the scene's audio duration unless a step says
  otherwise (e.g. "hold for 2s" or "wait for narration to finish before...").
- **ON SCREEN** is a one-line reminder of what the viewer should be looking at
  — use it to sanity-check that the actions actually produce that visual.

## Selector cookbook (read once, reuse everywhere)

The tuning panel lives in an open Shadow DOM (`#audio-tuning-panel-host`).
Playwright's locator engine pierces open shadow roots automatically, so plain
CSS selectors below work with `page.locator(...)` without any special
shadow-DOM handling.

| Element | Selector |
|---|---|
| Panel toggle button | `#toggle` |
| Panel body | `#panel` (has class `open` when visible) |
| Tab buttons | `.atp-tab[data-tab="racket"]`, `="floor"`, `="recent"`, `="venue"` |
| Tab sections | `.atp-section[data-section="racket"]` etc. |
| Sound Check button | `#sound-check` |
| Save/Load JSON | `#save-json`, `#load-json` |
| Racket/Floor FV graph | `#racket-fv-graph`, `#floor-fv-graph` |
| FV graph hint icon | `#racket-fv-hint`, `#floor-fv-hint` |
| Racket/Floor test buttons | `#test-racket-soft` / `-medium` / `-hard`, and `#test-floor-*` |
| Clip bank container | `#racket-bank`, `#floor-bank` (rows: `.atp-clip-row`) |
| Add-clip input/button | `#racket-add-clip-input`, `#racket-add-clip-btn` (+ floor) |
| Recent Hit readout | `#recent-hit-readout` (rows are plain `div`s, no per-row id) |
| Venue preset buttons | `#venue-preset-small`, `#venue-preset-large` |
| Distance→Volume preview graph | `#graph` |
| Live Readout | `#live-readout` |
| Test-at-distance controls | `#test-distance`, `#test-velocity`, `#test-velocity-hint`, `#test-racket-distance`, `#test-floor-distance` |
| Presets grid | `#presets` (buttons, text = preset name, see below) |
| Reset buttons | `#reset-spatial`, `#reset-all` |

**Dynamically-rendered fields have no per-field id** — `#racket-fields`,
`#floor-fields`, `#spatial-fields`, `#reverb-fields` are containers whose
children are built from a field list at runtime. Target a specific field by
its visible label text:

```js
// e.g. the "Distance Model" <select> inside the Spatial/Venue tab
const field = page.locator('#spatial-fields .atp-field', { hasText: 'Distance Model' });
await field.locator('select').selectOption('exponential');

// e.g. the "Volume Jitter" <input type=range> inside Racket Hits
const jitter = page.locator('#racket-fields .atp-field', { hasText: 'Volume Jitter' });
await jitter.locator('input[type=range]').fill('0.2'); // or drag via mouse for a visible slide
```

**Hint icons** (the small circled `?`) fire on `mouseenter`/`focus` — use
`locator.hover()`, not `.click()`. They disappear again on `mouseleave`, so
hold the hover for the duration you want it on screen, then move the mouse
away deliberately before the next step (`page.mouse.move(x, y)` to empty
space) rather than leaving it resting on the icon into the next action.

**Dragging the Force→Volume graph's two points** needs raw mouse events
(pointerdown/move/up), not `.click()`. The canvas has an internal drawing
resolution of 640×220 regardless of its displayed CSS size — convert:

```js
const canvas = page.locator('#racket-fv-graph');
const box = await canvas.boundingBox();
const scaleX = box.width / 640, scaleY = box.height / 220;
// FV_GRAPH_PAD = {left:32, right:12, top:14, bottom:24}; FORCE_AXIS_MAX = 20
const toScreen = (force, volume) => ({
  x: box.x + (32 + (force / 20) * (640 - 32 - 12)) * scaleX,
  y: box.y + (14 + (1 - volume) * (220 - 14 - 24)) * scaleY
});
const start = toScreen(currentForceMin, currentVolumeMin);
const end = toScreen(newForce, newVolume);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.mouse.move(end.x, end.y, { steps: 20 }); // steps = smooth on-camera drag
await page.mouse.up();
```

Preset names currently defined (`AudioSettingsStore.js`): *Small practice
court*, *Outdoor court*, *Stadium close seats*, *Stadium upper seats*, *Debug
flat/no falloff*. Select the "Presets" grid button by visible text:
`page.locator('#presets button', { hasText: 'Outdoor court' })`.

---

## S00 — cold open

**NARRATION** (`narration/S00-cold-open.mp3`)
> Every rally you've ever watched at a tennis match sounded different
> depending on where you were sitting — courtside, up in the nosebleeds,
> indoors, outdoors. This is a tool for building that experience from
> scratch: a virtual tennis rally where every bounce and every swing is a
> real, three-dimensional sound you can shape by hand. Let's take a look.

**ACTIONS**
1. Navigate to `http://localhost:4321/`.
2. Wait for the canvas to render and the first rally to start (`page.waitForSelector('#renderCanvas')`, then a short settle wait — the scene starts animating immediately, no click needed).
3. Let the rally play with no interaction — this is the establishing shot.

**ON SCREEN**: the 3D court, ball rally in progress, default (small/closed) venue.

---

## S01 — opening the tool

**NARRATION** (`narration/S01-opening-panel.mp3`)
> In the bottom-left corner there's a small button labeled "Audio Tuning."
> That's the control panel for everything we're about to explore — every
> sound in this scene, and how it behaves in space, can be shaped from here.

**ACTIONS**
1. Move the mouse toward `#toggle` (visible cursor travel, not a teleport).
2. `page.locator('#toggle').click()`.
3. Hold on the now-open panel for a beat so the viewer can read the tab bar.

**ON SCREEN**: panel slides/appears open, showing tabs: Racket Hits, Floor Hits, Recent Hit, Spatial/Venue.

---

## S02 — sound check

**NARRATION** (`narration/S02-sound-check.mp3`)
> Before tuning anything, it helps to know your speakers or headphones are
> actually working. The Sound Check button plays a plain beep straight to
> your speakers — it skips every effect in this tool entirely, so if you
> hear it, the problem (or the improvement you're about to hear) isn't your
> hardware.

**ACTIONS**
1. Hover `#sound-check` briefly.
2. Click `#sound-check`.
3. Hold 1.5s (let the beep + button label change — "context: running" — be visible).

**ON SCREEN**: button label briefly changes to show audio context state.

---

## S03 — the four tabs

**NARRATION** (`narration/S03-tabs-overview.mp3`)
> The panel is split into four tabs. "Racket Hits" and "Floor Hits" tune the
> two kinds of sounds this rally makes — the racket striking the ball, and
> the ball bouncing off the court. "Recent Hit" shows you exactly what just
> happened, in plain numbers, every time a sound plays. And "Spatial / Venue"
> is where the *space itself* is shaped — how far sound travels, and what
> kind of room or stadium it feels like it's playing in.

**ACTIONS**
1. Click `.atp-tab[data-tab="racket"]`, hold 1s.
2. Click `.atp-tab[data-tab="floor"]`, hold 1s.
3. Click `.atp-tab[data-tab="recent"]`, hold 1s.
4. Click `.atp-tab[data-tab="venue"]`, hold 1s.
5. Return to `.atp-tab[data-tab="racket"]` to set up the next scene.

**ON SCREEN**: each tab's section content swapping in turn.

---

## S04 — force → volume mapping (the graph)

**NARRATION** (`narration/S04-force-volume-graph.mp3`)
> This graph is the heart of how a hit's *intensity* becomes its *loudness*.
> The blue dot on the left is the quiet end — hit softer than this, and it
> won't get any quieter than its floor. The orange dot on the right is the
> loud end — swing harder than this, and it's already at full volume, so it
> won't get any louder. Between the two dots, volume rises smoothly with how
> hard the hit was. You can just drag either dot to reshape that curve, and
> hovering one shows you its exact numbers.

**ACTIONS**
1. Ensure Racket Hits tab is active.
2. Hover `#racket-fv-hint`, hold 1.5s, move mouse away.
3. Hover over the blue (min) point on `#racket-fv-graph` — cursor should visibly change — hold 1s to show the popover.
4. Drag the blue point down-left slightly (lower force, lower volume floor) using the mouse-event recipe above.
5. Drag the orange (max) point up-right slightly.
6. Release and let the line's new slope sit on screen for a moment.

**ON SCREEN**: the piecewise line's slope visibly changes as each dot moves; live popover shows Force/Volume while dragging.

---

## S05 — jitter and voice limits

**NARRATION** (`narration/S05-jitter-fields.mp3`)
> Real hits are never perfectly identical, so two sliders add a little
> randomness: Volume Jitter varies how loud each hit is, and Pitch Jitter
> varies its pitch slightly, so a fast rally doesn't sound like the exact
> same sample looping. Max Simultaneous just caps how many of these sounds
> can overlap at once, so a frantic rally doesn't turn into a wall of noise.

**ACTIONS**
1. Hover the hint icon on the "Volume Jitter" field (`#racket-fields .atp-field:has-text("Volume Jitter") .atp-hint-icon`), hold 1.2s.
2. Drag its range input partway up, hold.
3. Hover + nudge "Pitch Jitter" the same way.
4. Hover + nudge "Max Simultaneous" the same way.

**ON SCREEN**: each slider's value label updating live as it's dragged.

---

## S06 — soft / medium / hard test hits

**NARRATION** (`narration/S06-test-hits.mp3`)
> To hear a change immediately, without waiting for the rally to line up a
> real hit, use these three buttons — Soft, Medium, and Hard — each plays an
> isolated racket hit at that intensity so you can A/B your changes on
> demand.

**ACTIONS**
1. Click `#test-racket-soft`, hold 0.8s.
2. Click `#test-racket-medium`, hold 0.8s.
3. Click `#test-racket-hard`, hold 0.8s.

**ON SCREEN**: no visual change beyond button press states — this beat is about the audio.

---

## S07 — the clip bank

**NARRATION** (`narration/S07-clip-bank.mp3`)
> Underneath, the Clip Bank lists every actual sound file this category can
> pick from at random. Each row has a play button to audition it on its own,
> a volume slider just for that one clip, a checkbox to include or exclude it
> from the random rotation, and a remove button. You can also paste in a path
> to a new sound file and add it to the bank directly.

**ACTIONS**
1. Click the play (`▶`) button on the first row of `#racket-bank`, hold 1s.
2. Drag that row's per-clip volume slider, hold.
3. Toggle its enabled checkbox off, then back on.
4. Type a placeholder path into `#racket-add-clip-input` (e.g. `audio/racket/example.wav`) — do **not** click Add unless a matching file actually exists; this beat only needs to show the input being used.

**ON SCREEN**: row highlight/interaction, per-clip volume label updating.

---

## S08 — floor hits (parallel tour)

**NARRATION** (`narration/S08-floor-hits.mp3`)
> Floor Hits works exactly the same way — its own force-to-volume graph, its
> own jitter and voice limit, its own soft/medium/hard test buttons, and its
> own clip bank — just tuned for the sound of the ball bouncing off the
> court instead of the racket striking it.

**ACTIONS**
1. Click `.atp-tab[data-tab="floor"]`.
2. Quick hover pass over `#floor-fv-graph`'s hint icon.
3. Click `#test-floor-soft`, `#test-floor-medium`, `#test-floor-hard` in sequence, brief holds.
4. Hover one clip-bank row in `#floor-bank`.

**ON SCREEN**: same layout as Racket Hits tab, floor-specific content.

---

## S09 — recent hit readout

**NARRATION** (`narration/S09-recent-hit.mp3`)
> Every time a sound actually plays during the rally, the Recent Hit tab
> fills in with exactly what happened — how hard the hit was, what volume
> that mapped to, how fast the ball and racket were moving, which sound file
> got picked, where in space it happened, how far that was from the camera,
> and how much that distance quieted it down. Hovering any label explains
> what it means and what units it's measured in.

**ACTIONS**
1. Click `.atp-tab[data-tab="recent"]`.
2. Wait for a real hit to occur during the ongoing rally (poll `#recent-hit-readout` text until it's no longer "No hits yet.").
3. Hover the "Force" row's hint icon, hold 1.2s.
4. Hover the "Doppler Shift" row's hint icon, hold 1.2s.
5. Hover the "Attenuation" row's hint icon, hold 1.2s.

**ON SCREEN**: the full 11-row readout populated with live numbers and units.

---

## S10 — venue presets change the room, and the room itself

**NARRATION** (`narration/S10-venue-presets.mp3`)
> The Spatial / Venue tab is where the *space* gets tuned. These two buttons
> are shortcuts between two whole starting points: a Small, Closed Venue —
> imagine an enclosed indoor court with low walls close by — and a Large,
> Open Venue, like a big open-air stadium. Watch what happens to the court
> itself when we switch.

**ACTIONS**
1. Click `.atp-tab[data-tab="venue"]`.
2. Click `#venue-preset-large` — pull the camera back slightly first if needed so the geometry change (walls disappearing, bright sky, distant stands) is visible.
3. Hold 2s on the now-large open venue.
4. Click `#venue-preset-small` to return to the enclosed venue, hold 2s.

**ON SCREEN**: 3D geometry swaps — dim enclosed walls+ceiling vs bright open sky+stands — matching the audio preset.

---

## S11 — distance → volume preview

**NARRATION** (`narration/S11-distance-preview.mp3`)
> This graph previews how loud a hit sounds as you get further from it,
> before you even trigger one — the curve traces the falloff from right on
> top of a hit out to the edge of where it's audible at all.

**ACTIONS**
1. Hold on `#graph` for 2s (no interaction needed — this beat is descriptive).
2. Change "Distance Model" (see S12) is deferred to next scene, so here just point at the curve.

**ON SCREEN**: static falloff curve, blue line from full volume down to near-zero.

---

## S12 — distance model, explained by feel

**NARRATION** (`narration/S12-distance-model.mp3`)
> The Distance Model dropdown changes the *shape* of that falloff, and each
> option feels different. Linear fades at a steady, even pace and then cuts
> off sharply once you're out of range — like a fade-out that just stops.
> Inverse — the default — is very sensitive up close, where a step or two
> makes a big difference, but then it eases off and lingers softly no matter
> how far you go; that's closest to how sound actually behaves outdoors.
> Exponential drops off hard and fast the moment you step back — intense
> right on top of a hit, but it thins out quickly, giving you more contrast
> between near and far.

**ACTIONS**
1. Locate the "Distance Model" field: `page.locator('#spatial-fields .atp-field', { hasText: 'Distance Model' })`.
2. Hover its hint icon, hold 2s (long hint text — give the viewer time to read it).
3. Select `linear`, hold 1.5s (watch `#graph` redraw).
4. Select `inverse`, hold 1.5s.
5. Select `exponential`, hold 1.5s.
6. Leave it on `inverse` (matches the Small/Closed venue default) before moving on.

**ON SCREEN**: `#graph`'s curve visibly changing shape with each selection.

---

## S13 — the rest of the spatial dials

**NARRATION** (`narration/S13-spatial-fields.mp3`)
> A handful of other dials shape the same space: Panning Model decides
> whether left-right-front-back positioning uses a full 3D head simulation
> or a simpler stereo pan. Min and Max Distance set the near and far edges of
> that falloff curve. Rolloff Factor controls how aggressively volume drops
> as you move past the near edge. The cone settings give a sound its own
> facing direction, so it can sound different from behind than from in
> front. And Venue Scale simply stretches or shrinks how far away everything
> feels, without moving anything in the 3D scene itself.

**ACTIONS**
1. Hover + brief nudge on "Panning Model" select.
2. Hover + brief nudge on "Min Distance (ref)" range.
3. Hover + brief nudge on "Max Distance" range.
4. Hover + brief nudge on "Rolloff Factor" range.
5. Hover the "Cone Inner Angle" hint icon, hold 1.5s (skip nudging the cone fields — no audible on-camera difference without a directional listener setup).
6. Hover + brief nudge on "Venue Scale" range.

**ON SCREEN**: each field's value label updating; `#graph` redrawing for the distance/rolloff/scale changes.

---

## S14 — live readout, including Doppler

**NARRATION** (`narration/S14-live-readout.mp3`)
> While the rally plays, the Live Readout updates in real time: where the
> camera is, how far away the last hit was, how much that distance quieted
> it, and — this part is new — how fast the sound's source was moving toward
> or away from you, and the pitch shift that motion causes. A hit moving
> toward you creeps above one-times pitch; moving away, it dips below.

**ACTIONS**
1. Hold on `#live-readout` for 3-4s while the rally continues, long enough for at least one hit to update the "Velocity To Listener" and "Doppler Shift" rows.

**ON SCREEN**: live-updating numbers, camera position ticking, Doppler value flickering per hit.

---

## S15 — play test hit at distance (and Doppler on demand)

**NARRATION** (`narration/S15-test-at-distance.mp3`)
> To test distance and Doppler without waiting for the rally to cooperate,
> these two sliders let you place a test hit anywhere from right next to you
> out to a hundred meters away, and give it its own closing speed toward or
> away from you — positive moves it toward you and raises the pitch,
> negative moves it away and lowers it, zero leaves the pitch alone.

**ACTIONS**
1. Drag `#test-distance` to a far value (e.g. 60), hold.
2. Hover `#test-velocity-hint`, hold 1.5s.
3. Drag `#test-velocity` to a positive value (e.g. +15), click `#test-racket-distance`, hold 1s.
4. Drag `#test-velocity` to a negative value (e.g. -15), click `#test-racket-distance`, hold 1s.
5. Return `#test-velocity` to 0 and `#test-distance` to a moderate value (e.g. 10) before the next scene.

**ON SCREEN**: slider value labels updating; (if Recent Hit tab were active, Doppler would visibly cross 1.0× — this scene deliberately stays on the Venue tab since the sliders live there).

---

## S16 — presets grid

**NARRATION** (`narration/S16-presets.mp3`)
> Below that, five ready-made presets jump straight to a specific scenario —
> a small practice court, an outdoor court, close stadium seats, upper-deck
> stadium seats, and a flat "no falloff" debug preset for isolating other
> changes.

**ACTIONS**
1. Click `#presets button:has-text("Small practice court")`, hold 1s.
2. Click `#presets button:has-text("Stadium upper seats")`, hold 1.5s (biggest visible/audible contrast).
3. Click `#presets button:has-text("Outdoor court")` to leave on a moderate preset before the next scene.

**ON SCREEN**: `#graph` curve and spatial field values jumping between presets.

---

## S17 — reverb and ambience

**NARRATION** (`narration/S17-reverb.mp3`)
> Reverb is what makes a space sound like a *place* rather than just quieter
> or louder — Dry Level is the hit exactly as recorded, Wet Level is the echo
> mixed in alongside it, and Impulse Response picks the actual character of
> that echo: tight and boxy for a small room, long and spacious for a
> stadium. Output Gain is the final volume check afterward, in case
> everything else together got a little too loud.

**ACTIONS**
1. Hover + brief nudge "Wet Level" range, hold 1s.
2. Locate "Impulse Response" select, hover its hint icon 1.5s.
3. Select `audio/impulse-responses/small-room.wav`, click `#test-racket-medium`, hold 1s.
4. Select `audio/impulse-responses/stadium.wav`, click `#test-racket-medium`, hold 1s.
5. Return Impulse Response + Wet Level to whatever the current venue preset expects (small-room.wav if still on Small/Closed) before the next scene.

**ON SCREEN**: no strong visual — this beat is primarily audible; keep camera holding on the panel.

---

## S18 — saving your work and starting fresh

**NARRATION** (`narration/S18-save-reset.mp3`)
> Once you've landed on a mix you like, Save Tuning JSON downloads every
> setting in this panel to a file you can load back later — or hand to
> someone else — with Load Tuning JSON. And if you want to back out of
> changes, Reset Spatial Only clears just the space-and-reverb settings,
> while Reset All To Defaults starts the entire panel over from scratch.

**ACTIONS**
1. Hover `#save-json`, click it, hold 1s (download fires — no visible UI change beyond the click).
2. Hover `#reset-spatial`, hold 1s (narrate the button, don't necessarily click it if the current tuned state should survive into the final scene — reviewer's call; if clicked, re-apply the Small/Closed venue preset afterward so S19 starts from a sane state).
3. Hover `#reset-all`, hold 1s without clicking.

**ON SCREEN**: browser's native file-save prompt/download indicator for the Save step.

---

## S19 — wrap-up

**NARRATION** (`narration/S19-wrap-up.mp3`)
> That's the whole tool — the sounds themselves, how hard a hit has to land
> to be heard, how far it carries, and what kind of room it feels like it's
> playing in, all shaped by hand and all audible immediately. Close the panel
> and the rally keeps playing, tuned exactly the way you left it.

**ACTIONS**
1. Click `#toggle` to close the panel.
2. Let the rally play uninterrupted for 3-4s as the closing shot.

**ON SCREEN**: panel closes, clean view of the court with the rally continuing.

---

## Recording & Sync Workflow

Narration and screen-capture are produced independently and joined by shared
per-scene durations — they are not recorded live together.

1. **Generate narration audio** for every `NARRATION` block above, named
   exactly `narration/S00-cold-open.mp3` ... `narration/S19-wrap-up.mp3`.
2. **Measure each file's duration** and record it in a `timings.json`:
   ```json
   {
     "S00": 9.8,
     "S01": 7.1,
     "S02": 6.4
   }
   ```
   (`ffprobe -v error -show_entries format=duration -of csv=p=0 narration/S00-cold-open.mp3`)
3. **Drive Playwright scene-by-scene**, using `timings.json[sceneId]` as that
   scene's total on-screen duration: distribute the scene's `ACTIONS` steps
   across that duration (evenly, or per any explicit "hold Ns" already
   specified in the step), then pad with a plain wait so the scene's actual
   elapsed time matches the audio duration exactly before moving to the next
   scene. Record continuously across all scenes in one Playwright
   `context.recordVideo` session (or an OS-level screen recorder) — do not
   stop/restart recording between scenes, so there's a single unbroken video
   file to sync audio onto.
4. **Concatenate narration** into one track in scene order, inserting silence
   gaps equal to any padding added in step 3, so the audio track's total
   length matches the video's.
5. **Mux**: `ffmpeg -i recorded-video.mp4 -i concatenated-narration.mp3 -c:v copy -c:a aac -shortest final-demo.mp4`.

Because both the video's scene-pacing and the audio track's scene-lengths are
driven from the same `timings.json` values, the two stay in sync without
needing to record them simultaneously.

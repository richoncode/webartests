# Demo Script: Laser Fill Generator

**Target length:** ~4–5 minutes
**Structure:** Part 1 — full UI walkthrough using Gears (~2.5–3 min) · Part 2 — quick style tour, all at max colors (~90–120 sec)
**Narration voice:** Kokoro-82M, `am_echo` ("Echo")

Recorded via Playwright (UI interaction + video capture), with each scene's `[ACTION]` steps paced to the runtime of its own pre-rendered narration clip (see Production Pipeline below). `[ACTION]` lines describe what the automation should do; VO lines are spoken narration, one audio file per scene.

---

## Part 1 — Full Walkthrough (Gears)

**Scene 1 — Intro (0:00–0:08)**
VO: "This is the Laser Fill Generator — draw a shape, pick a decorative style, and it fills or traces it automatically. Let's take a look."
`[ACTION]` Load app at default state (empty canvas, default octagon or blank).

**Scene 2 — Pick a Shape (0:08–0:22)**
VO: "Start from a preset — Pendant, Circle, Cuff, or Bracelet. We'll use Pendant for most of this demo; custom shape drawing is its own tour."
`[ACTION]` Click through "Circle", "Cuff", "Bracelet" presets quickly (~2–3 sec each), then settle on "Pendant" for the rest of the demo.

**Scene 3 — Selecting a style (0:22–0:32)**
VO: "Now pick a style. Let's go with Gears — and notice the palette switches automatically to a matching Steampunk set."
`[ACTION]` Open Style dropdown, select "Gears". Point out Palette dropdown auto-updating to "SteamPunk".

**Scene 4 — Palette shortcut (0:32–0:42)**
VO: "Pick any palette you like — and if you wander off the recommended one, this star button jumps you right back to the style's default."
`[ACTION]` Open Palette dropdown, select a different palette (e.g., "Classic"). Click the star (★) button next to Palette — palette reverts to "SteamPunk".

**Scene 5 — Thickness (disabled state) (0:42–0:52)**
VO: "Gears are individual objects, not a traced path, so Path Thickness doesn't apply here — it's simply grayed out."
`[ACTION]` Point at the dimmed "Path Thickness" slider, attempt to drag it (no effect, since it's disabled).

**Scene 6 — Gear Sizes (0:52–1:06)**
VO: "Instead, this two-handle Sizes slider controls the range of gear sizes in the swarm."
`[ACTION]` Drag the min handle down, then the max handle up to show the range's effect — then settle both back to a good default (12–30) before moving on.

**Scene 7 — Density (1:06–1:16)**
VO: "Density controls how many gears are in the swarm."
`[ACTION]` Drag Density slider low, then high — canvas updates from sparse to packed — then settle back to the default (50).

**Scene 8 — Accent Count (1:16–1:28)**
VO: "Accent Count adds a handful of oversized feature gears behind the swarm, independent of Density."
`[ACTION]` Drag Accent Count up to ~18 to show large background gears, then settle back to a good default (3).

**Scene 9 — Color / Color Cluster (1:28–1:46)**
VO: "Gear Colors sets how many palette colors are in play — drag to max and every color shows up. Color Cluster is disabled here, since gears scatter randomly with no visible run to cap."
`[ACTION]` Drag Color slider to 0% (single color), then to 100% (full palette) — stays at 100%, since Part 2 wants max colors throughout anyway. Hover disabled "Color Cluster" — no tooltip should appear.

**Scene 10 — Edge Margin (1:46–1:54)**
VO: "Edge Margin shrinks or grows the fillable area from the drawn edge."
`[ACTION]` Drag Edge Margin positive then negative to show the effect, then settle inside 0–5 — enough to keep the Pendant shape fully visible for every scene that follows.

**Scene 11 — Refresh Colors vs. Refresh Pattern (1:54–2:10)**
VO: "Two independent refresh buttons: Refresh Colors rerolls the color choices without touching the layout — Refresh Pattern rerolls the layout without touching colors."
`[ACTION]` Click "Refresh Colors" 1–2 times (colors change, layout stable). Click "Refresh Pattern" 1–2 times (layout changes, colors stable).

**Scene 12 — Border mode (2:10–2:34)**
VO: "Switching to Trace Border retraces the shape's outline instead of filling it. Gear Sizes now uses the same units as Trace Width, so switching modes never resets your settings — and gears here sit right along the perimeter."
`[ACTION]` Click "Trace Border". Show gears strung along the outline. Nudge Accent Count and Density up briefly to show Border responds too, then settle both back to the same good defaults (3 / 50).

**Scene 13 — Back to Fill, wrap (2:34–2:42)**
`[ACTION]` Click "Fill Interior" to return.
VO: "That's the full control set. Now let's tour the rest of the styles."

---

## Part 2 — Style Tour (all at max Color)

Shape stays on **Pendant** throughout (no shape changes — custom shape drawing is deferred to a later demo). For each style: select from dropdown (palette auto-applies), drag Color slider to 100%, show **Fill** briefly then cut to **Border** — both modes get a moment, within the same clip's duration (no extra runtime needed since narration doesn't call out the cut explicitly).

1. **Flat Pipes** (~2:42–2:50) — VO: "Flat Pipes: a clean maze of solid-colored tubing."
2. **3D Basic** (2:50–2:58) — VO: "3D Basic adds a glossy highlight down each pipe."
3. **3D Glossy** (2:58–3:06) — VO: "3D Glossy pushes that further with a brighter specular sheen."
4. **Pipes and Gears** (illustrated) (3:06–3:16) — VO: "Pipes and Gears: ribbed illustrated tubing with gear accents scattered on top."
5. **Circuit Board** (3:16–3:28) — VO: "Circuit Board: a maze of copper traces, jumper wires, resistors, capacitors, transistors, and potentiometers."
6. **Painted Lady** (3:28–3:38) — VO: "Painted Lady: a neighborhood of colorful houses lining winding roads."
7. **Rows of Ducks** (3:38–3:46) — VO: "Rows of Ducks: a pond scene with lily pads and the occasional giant swan."
8. **Christmas Cookies** (3:46–3:54) — VO: "Christmas Cookies: gingerbread men, trees, and stars on a gingerbread base."
9. **Coins** (3:54–4:02) — VO: "Coins: a jumbled pile, like a handful tipped onto a table."
10. **Gems** (4:02–4:10) — VO: "Gems: faceted stones in a sparkling cluster."
11. **Buttons** (4:10–4:18) — VO: "Buttons: a scattered pile, just like a sewing box."

**Outro (4:18–4:26)**
VO: "Draw any shape, pick a style, and let it fill itself in. That's the Laser Fill Generator."
`[ACTION]` Return to Style dropdown, hold on a nice-looking style as final frame.

---

## Production Pipeline

1. **Render narration** — every VO line above becomes its own `.wav` file via Kokoro (`am_echo`), named to match its scene (e.g. `scene01_intro.wav`, `scene02_pick-a-shape.wav`, `p2_04_illustrated.wav`). Scenes with no VO (e.g. Scene 13's action-then-line) still get one file for the line they do have.
2. **Pad each clip** — append a random 1.0–2.0s silence tail to every rendered clip, so cadence between scenes isn't robotically identical. This trailing pause is baked into the audio file itself, not handled separately in the video script.
3. **Drive Playwright off clip duration** — the automation script runs each scene's `[ACTION]` steps, then waits exactly that scene's padded clip duration before moving to the next scene. This naturally paces the on-screen action to match its narration, including the trailing hold.
4. **Record video** — Playwright's built-in video capture runs for the whole session (one continuous recording, not per-scene).
5. **Mux audio + video** — concatenate all padded clips in script order into one narration track, then combine with the recorded video via ffmpeg. Because the video's scene timings were paced to each clip's exact duration in step 3, the concatenated audio track lines up by construction — no manual sync needed.

**Where things live:** everything (Playwright + browser binaries, Kokoro venv, rendered clips, raw video, final output) stays on `/Volumes/scratch` — nothing touches the low-space main disk.

---

## Open questions (pending review)

- Is ~3:15 the right length, or should Part 2 be trimmed/expanded?

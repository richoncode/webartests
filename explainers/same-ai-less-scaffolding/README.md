# Same AI, Less Scaffolding — animation source

A 61-second, 1080×1350 (4:5) explainer of "How Much of a Harness Does a Strong Agent
Need for Autonomous ML Engineering?" (Brilliantov, Hernández-Cano & Abbé, EPFL & Apple,
arXiv 2609.40303). Made with Claude /motion.

## What's here
- `modules/` — the film's own code, readable and editable:
  - `scenes.json` — scene order, durations, size, palette, fonts
  - `base.css` — shared styles and colors
  - `shared.js` — lanes, racers and the footer used across scenes
  - `scene-*.js` — one file per scene (hook, rise, question, lineup, race, finish, why, takeaway, paper)
  - `score.js` — the sound effects, timed to the animation
- `cut.js` — the entry that plays the scenes in order
- `index.html` + `artifact-type/` — the /motion player runtime the scene code runs on

## Note
The scene code is written against the /motion player's `kit` API (timing helpers,
text effects, the sound engine), so it is not a standalone web page. To change the
film, edit it in Claude; to post it, use Export on the film's page for an MP4.

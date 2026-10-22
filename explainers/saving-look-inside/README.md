# Saving Look Inside the Book — animation source

A 30-second, 1080×1350 (4:5) animated explainer. Made with Claude Motion.

- `film.html` — self-contained player (small stand-in for the Motion `kit` runtime plus the film code). Plays, pauses and scrubs.
- `src/scene-flow.js` — the film: one scene with `init(kit)` and `render(t)`, a pure function of time.
- `src/base.css`, `src/scenes.json` — palette, size, fonts.
- `src/score.js` — original synth cue sheet (targets Motion's built-in synth, not included; the page plays silent).

Render a frame: open `film.html#render` and call `renderAt(t)`.

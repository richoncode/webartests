# Standalone player

The Claude Motion export (`../index.html` → kept as `../motion-runtime.html`, plus `../artifact-type/`)
expects the Claude host to hand the film to it, so on its own it shows "No animation yet".
`../index.html` is a small host page that does that handoff itself:

- `runner.js` is the /motion in-frame film runtime, taken verbatim from `../artifact-type/app.js`
  by `extract-runner.js`. It runs in a sandboxed iframe, exactly as in the Claude player.
- The film's own code (`../cut.js`, `../modules/`) is loaded unchanged and sent to the runner.
- `fonts/` holds the Google Fonts files (latin subset) named in `modules/scenes.json`
  (Barlow Condensed, Barlow, JetBrains Mono), passed in as data URLs as the Claude player does.
- `audio.m4a` is the film's own soundtrack, rendered offline from `modules/score.js` (the /motion score renderer) and encoded to AAC,
  and kept in sync with the picture. Browsers need a click before sound plays.

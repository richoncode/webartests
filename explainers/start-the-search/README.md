# Start the Search Before They Finish Talking — animation source

A ~94-second, 1080×1350 (4:5) explainer of "Hiding Tool Latency in On-Device Cascaded
Voice Agent through Speculative Execution" (Jung et al., Qualcomm AI Research & KAIST AI,
arXiv 2610.07641). Made with Claude /motion.

## Files
- `modules/scenes.json` — scene order and durations, canvas size, fonts, palette
- `modules/base.css` — colors (`--ground`, `--main`, `--ink`, `--accent`) and shared styles
- `modules/shared.js` — shared timing table (`window.TT`) and drawing helpers (`window.UI`):
  search chip, loading dots → check mark, answer bubble, word-by-word transcript
- `modules/scene-*.js` — one file per scene, in order:
  hook, wait, idea, guess, analogy, cache, result, twist, rules, tradeoff, paper
- `modules/score.js` — sound effects (word ticks, search whooshes, number thuds, answer chime)
- `cut.js` — entry that plays the scenes in order
- `index.html` + `artifact-type/` — the /motion player runtime

## Load order
base.css → shared.js → scene-*.js (scenes.json order) → score.js → cut.js

## Importing elsewhere
Scenes are written against the /motion player's `kit` API: `kit.scene(id, {init, render(t)})`,
`kit.h`, `kit.stage`, easing helpers (`seg`, `eo`, `ei`, `eio`, `eob`, `lerp`),
`TextFx.fadeFromRight`, and `kit.score` for sound. Each `render(t)` is a pure function of
scene-local time in seconds, so porting to another engine (Remotion, GSAP, a canvas loop)
means providing those helpers and calling `render(t)` per frame.
To keep editing it as a /motion film, give this folder or the modules to Claude.

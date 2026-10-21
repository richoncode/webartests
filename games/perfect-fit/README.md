# Perfect Fit

A short touch game about scribing a joint instead of measuring it. Two pieces meet with a gap. You use the mating piece as the template, mark a line, cut it, and score how tightly they close.

## Play

From the repo root:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/games/perfect-fit/`. On GitHub Pages the same path is served under the site root (`/webartests/games/perfect-fit/`). Everything is relative — no build step and no external assets.

The games list is `games/index.html`.

## How a joint is marked

- **Square** — drag sideways. The blade stays 90° to the fence. Slide until it covers the other board’s end. It clicks when it seats.
- **Straightedge** — drag the bar, or either end handle, until it lies on the miter.
- **Washer** — slide the ring along the curve. The pencil in the hole scribes the cut. Lift off and that stretch stays proud.
- **Trace** — click the straightedge onto every face of a stepped, peaked, or zigzag edge.

Then **Cut the line**. The saw throws shavings, the offcut drops, and the piece slides home. The score is the leftover gap: average distance from your cut to the mating edge, shown in millimetres and as a tightness percent.

| Stars | Fit |
| --- | --- |
| ★★★ Hairline | 96% and up |
| ★★ Tight | 84% |
| ★ Fair | 66% |

Best fit and stars are stored in `localStorage` under `perfect-fit-v1`.

## Levels

1. Butt joint — square, with a short tutorial
2. Inside corner — the room is not 45°
3. Curved wall — washer scribe
4. Stepped miter — trace each face
5. Three-way truss — both cheeks of the king post
6. Zigzag miter
7. Ogee profile
8. Live edge

## Phone

Portrait layout, large handles, and `touch-action: none` on the playfield so the page doesn’t scroll or rubber-band while you drag. Pointer events cover a mouse, a finger, and a pen. `navigator.vibrate` fires on the seat, the saw, and the close when the browser allows it (Android Chrome; iOS ignores it). Sound is synthesized in the Web Audio API.

Add it to the home screen from the browser share sheet. `manifest.json` plus the PNG icons are enough; there is no service worker, so a refresh always loads the current files.

## Code

`engine.js` is the geometry and scoring (no DOM). `node engine.js` checks every level: a blank mark scores poorly, a perfect mark scores a hairline, the stock contains the ideal cut, and a perfect piece doesn’t overlap its mate. `game.js` is input, wood, and animation. Wood grain, the bench, and the icons are drawn in code.

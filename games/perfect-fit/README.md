# Perfect Fit

A phone-sized shop game about marking a joint instead of measuring it. Every level is an ordered list of tool steps: pick, seat, set, lock, mark, cut. Tools seat on real edges, rims, and fences. Nothing snaps to the right answer, and a sloppy step stays in the work.

## Play

From the repo root:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/games/perfect-fit/`. On GitHub Pages the same path is served under the site root. There is no build step and no external asset.

The games list is `games/index.html`.

`node games/perfect-fit/engine.js` checks every level: a full hint walk closes the gap, hints cost the stars, a short knife and a short compass carry into the score, and a careful butt joint with no hint earns three stars.

## How a mark is made

- **Restart** puts the current level back on step 1 and counts as another try.
- **Hint** does the single next correct step. Press it again to walk the whole job. Each hint adds to the score and drops a star.
- The checklist is the job. The line under the title is the geometry, not a measurement.
- Compass openings and bevels have no numeric readout. You match them by eye, against a wall, a rim, or a line you already drew.
- Scribing drags the compass point along the wall. The pencil stays at the locked opening and draws that shape on the board. A sloppy finger still rides the wall; lifting off, tilting the legs, or skipping a stretch is what moves the line.
- A back-bevel is the cross-section under the work. The saw enters on the scribe line and the handle swings around that pivot so the back of the cut is relieved. The line under the picture says whether the back is touching, clear, or the face has tipped off. It never shows degrees.
- After the cut, the score is the leftover gap in millimetres, plus a penalty for extra tries, hints, and tools that missed their reference. Replay names the step that opened the gap.

| Stars | What it takes |
| --- | --- |
| ★★★ | A hairline gap on the first try, with no hints |
| ★★ | A small score, and at most one hint |
| ★ | The joint still closes, hints included until they run out |

Best gap, score, and stars are stored in `localStorage` under `perfect-fit-v2`.

## Levels

1. **Butt Joint** — tutorial. Seat a square on the edge and knife. The blade stays square because the stock is seated, not because the joint pulls it.
2. **Compass Scribe** — shim the panel level, lock the compass on the widest gap, trace the wall with the legs level, back-bevel, and cut. The compass slides the wall sideways by one fixed opening.
3. **Tick Stick** — tick every corner of an alcove onto a sheet, carry the sheet, and replay the ticks onto a board.
4. **Bisect the Corner** — two equal offcuts cross on the bisector of an out-of-square corner. A sliding bevel carries that line to the saw.
5. **Cope the Corner** — an inside miter reveals the molding profile; the coping saw follows it. This replaces the old ogee trace.
6. **Find the Center** — a square’s corner on the rim marks a diameter. Two diameters cross at the center.
7. **Hexagon** — the compass that strikes the circle steps the radius off six times.
8. **Octagon** — diagonals find the center; the compass opening from a corner to that center marks the chamfers.
9. **Stone Scribe** — hard mode. The same compass scribe, on a jagged stone wall.

Stepped Miter, Three-Way Truss, and Zigzag Miter are gone. They were not real marking jobs.

## Phone

Portrait layout, large targets, and `touch-action: none` on the bench so the page does not scroll while you drag. Pointer events cover a mouse, a finger, and a pen. Sound is a few tones from the Web Audio API.

Add it to the home screen from the browser share sheet. `manifest.json` plus the PNG icons are enough; there is no service worker.

## Code

`engine.js` is the geometry, the step list, seating, hints, and the score. It does not touch the DOM. `game.js` is input and drawing: pencil lines, compass legs, the bevel blade, and the square.

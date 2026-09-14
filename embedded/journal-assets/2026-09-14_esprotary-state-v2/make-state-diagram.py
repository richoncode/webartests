#!/usr/bin/env python3
"""Draw the espRotary state machine as built: two screens, four inputs.

Shares the drawing helpers with the option diagrams — one colour per input,
the same colour everywhere: turn green, press blue, tap grey, swipe orange.
"""
import pathlib, types

here = pathlib.Path(__file__).resolve().parent
src = (here / "_svglib.py").read_text()
src = src[:src.index("# \u2500\u2500 Option A")]   # helpers only; do not redraw the option set
lib = types.ModuleType("svglib")
exec(compile(src, "_svglib.py", "exec"), lib.__dict__)

Svg, W = lib.Svg, lib.W
TURN, PRESS, TAP, SWIPE, DIM, FG = lib.TURN, lib.PRESS, lib.TAP, lib.SWIPE, lib.DIM, lib.FG

MODES = ["OFF", "WHITE", "COLOR", "SCENE", "MUSIC"]
ROWS = [
    ("WHITE", ["BRIGHT", "WARMTH"]),
    ("COLOR", ["COLOR", "SAT", "BRIGHT"]),
    ("SCENE", ["SCENE", "BRIGHT"]),
    ("MUSIC", []),
]

s = Svg(588, "espRotary")
s.text(W / 2, 28, "espRotary — the machine as built", FG, 17, weight="600")

# ── LIGHTS, and the cycle the press walks ───────────────────────────────────
s.box(340, 52, 200, 62, "LIGHTS", "one group at a time", PRESS)
s.loop(340, 66, 104, "t", "left", ["turn or swipe:", "next group"])

cy = 168
cw, gap = 124, 22
x0 = (W - (len(MODES) * cw + (len(MODES) - 1) * gap)) / 2
for i, m in enumerate(MODES):
    x = x0 + i * (cw + gap)
    s.chip(x, cy, cw, 44, m, PRESS if m != "OFF" else "#3a3a3a")
    if i:
        s.arrow(x - gap + 4, cy + 22, x - 4, cy + 22, "p")
# the wrap back to OFF, drawn under the chain
last = x0 + (len(MODES) - 1) * (cw + gap) + cw / 2
s.p.append(f'<path d="M {last} {cy + 44} C {last} {cy + 86}, {x0 + cw / 2} {cy + 86}, '
           f'{x0 + cw / 2} {cy + 44}" fill="none" stroke="{PRESS}" stroke-width="1.8" '
           f'marker-end="url(#ep)"/>')
s.arrow(440, 114, 440, cy - 4, "p")
s.text(452, 140, "press", PRESS, 12, anchor="start")

# ── ADJUST, one row per mode ────────────────────────────────────────────────
fy = 292
s.frame(70, fy, 740, 194, "ADJUST · turn to set · press for on / off · tap to exit")
s.arrow(440, cy + 92, 440, fy - 4, "k", both=True)
s.text(452, fy - 22, "tap", TAP, 12, anchor="start")

for r, (mode, chips) in enumerate(ROWS):
    ry = fy + 20 + r * 42
    s.text(150, ry + 26, mode, DIM, 12, anchor="end")
    if not chips:
        s.text(180, ry + 26, "no adjustments — tap does nothing", DIM, 12, anchor="start")
        continue
    bw, bg = 130, 26
    for i, c in enumerate(chips):
        bx = 180 + i * (bw + bg)
        s.chip(bx, ry + 8, bw, 36, c)
        if i:
            s.arrow(bx - bg + 4, ry + 26, bx - 4, ry + 26, "s", both=True)
    if len(chips) > 2:
        s.text(180 + len(chips) * (bw + bg) - bg + 14, ry + 30, "swipe wraps", SWIPE, 11, anchor="start")

s.text(W / 2, 520, "tap moves in and out · swipe moves sideways · press always means power", DIM, 12)
s.text(W / 2, 540, "entering ADJUST reads the group's live state, and leaves the mode alone for 6 s after a press", DIM, 12)
s.legend(568)
s.render("state-machine-v2.svg")

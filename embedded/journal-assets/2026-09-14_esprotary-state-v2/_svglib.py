#!/usr/bin/env python3
"""Draw the three candidate UI flows for espRotary as state diagrams.

One colour per input, the same colour in all three diagrams:
  turn = green, press = blue, tap = grey, swipe = orange.
"""
import xml.etree.ElementTree as ET

W = 880
TURN, PRESS, TAP, SWIPE = "#4caf50", "#5b9bd5", "#9aa0a6", "#f0a040"
WARN = "#e74c3c"
FG, DIM, PANEL, EDGE = "#ffffff", "#8a8a8a", "#1a1a1a", "#3a3a3a"
FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif"
COLOURS = {"t": TURN, "p": PRESS, "k": TAP, "s": SWIPE, "w": WARN}


class Svg:
    def __init__(self, h, title):
        self.h = h
        self.p = []
        self.title = title

    # ── primitives ──────────────────────────────────────────────────────────
    def text(self, x, y, s, fill=FG, size=13, anchor="middle", weight="400", mono=False):
        fam = "'SF Mono', 'Fira Code', ui-monospace, monospace" if mono else FONT
        self.p.append(f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" '
                      f'font-family="{fam}" font-weight="{weight}" text-anchor="{anchor}">{s}</text>')

    def box(self, x, y, w, h, title, sub=None, accent=EDGE):
        self.p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" '
                      f'fill="{PANEL}" stroke="{accent}" stroke-width="1.5"/>')
        cy = y + (h / 2 + 5 if sub is None else h / 2 - 3)
        self.text(x + w / 2, cy, title, FG, 15, weight="600")
        if sub:
            self.text(x + w / 2, y + h / 2 + 16, sub, DIM, 11)

    def chip(self, x, y, w, h, label, colour=EDGE):
        self.p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" '
                      f'fill="#141414" stroke="{colour}" stroke-width="1.5"/>')
        self.text(x + w / 2, y + h / 2 + 5, label, FG, 13, weight="600")

    def frame(self, x, y, w, h, label):
        self.p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="none" '
                      f'stroke="#2a2a2a" stroke-width="1" stroke-dasharray="4 4"/>')
        self.text(x + 12, y - 8, label, DIM, 11, weight="600", anchor="start")

    def arrow(self, x1, y1, x2, y2, key, both=False, dash=False):
        c = COLOURS[key]
        d = ' stroke-dasharray="5 4"' if dash else ""
        start = f' marker-start="url(#s{key})"' if both else ""
        self.p.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" '
                      f'stroke-width="1.8"{d} marker-end="url(#e{key})"{start}/>')

    def loop(self, x, y1, y2, key, side, label_lines):
        """A self-transition arcing out to one side of a box."""
        c = COLOURS[key]
        r = 62 if side == "right" else -62
        self.p.append(f'<path d="M {x} {y1} C {x + r} {y1 - 18}, {x + r} {y2 + 18}, {x} {y2}" '
                      f'fill="none" stroke="{c}" stroke-width="1.8" marker-end="url(#e{key})"/>')
        tx = x + (78 if side == "right" else -78)
        anchor = "start" if side == "right" else "end"
        ty = (y1 + y2) / 2 - 6 * (len(label_lines) - 1)
        for i, line in enumerate(label_lines):
            self.text(tx, ty + i * 15, line, c, 12, anchor=anchor)

    def legend(self, y):
        items = [("turn", TURN), ("press", PRESS), ("tap", TAP), ("swipe", SWIPE)]
        x = W / 2 - (len(items) * 96) / 2
        for name, col in items:
            self.p.append(f'<line x1="{x}" y1="{y}" x2="{x + 26}" y2="{y}" stroke="{col}" stroke-width="2.5"/>')
            self.text(x + 33, y + 4, name, DIM, 12, anchor="start")
            x += 96

    # ── output ──────────────────────────────────────────────────────────────
    def render(self, path):
        defs = ['<defs>']
        for k, c in COLOURS.items():
            defs.append(f'<marker id="e{k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" '
                        f'markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="{c}"/></marker>')
            defs.append(f'<marker id="s{k}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" '
                        f'markerHeight="6" orient="auto"><path d="M 10 0 L 0 5 L 10 10 z" fill="{c}"/></marker>')
        defs.append('</defs>')
        body = "".join(defs) + "".join(self.p)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {self.h}" '
               f'width="{W}" height="{self.h}" role="img">'
               f'<rect width="{W}" height="{self.h}" fill="#0d0d0d"/>'
               f'{body}</svg>')
        ET.fromstring(svg)                      # refuse to write anything malformed
        open(path, "w").write(svg + "\n")
        print(f"{path}  {len(svg)} bytes  ok")


def carousel(s, x, y, w, labels, colour=EDGE):
    """A row of adjust screens with swipe arrows between them, wrapping."""
    n = len(labels)
    gap = 26
    bw = (w - gap * (n - 1)) / n
    xs = []
    for i, lab in enumerate(labels):
        bx = x + i * (bw + gap)
        s.chip(bx, y, bw, 48, lab, colour)
        xs.append((bx, bx + bw))
    for i in range(n - 1):
        s.arrow(xs[i][1] + 4, y + 24, xs[i + 1][0] - 4, y + 24, "s", both=True)
    if n > 2:                                   # the wrap, drawn under the row
        s.p.append(f'<path d="M {xs[0][0] + bw / 2} {y + 52} C {xs[0][0] + bw / 2} {y + 96}, '
                   f'{xs[-1][0] + bw / 2} {y + 96}, {xs[-1][0] + bw / 2} {y + 52}" fill="none" '
                   f'stroke="{SWIPE}" stroke-width="1.8" marker-end="url(#es)" marker-start="url(#ss)"/>')
        s.text(x + w / 2, y + 112, "swipe wraps around", SWIPE, 11)
    return bw


# ── Option A: the browse screen is the light's top level ────────────────────
def option_a(path):
    s = Svg(528, "A")
    s.text(W / 2, 28, "Option A — the browse screen is the light's top level", FG, 16, weight="600")
    s.box(340, 58, 200, 66, "LIGHTS", "Back Porch · 2 lights", PRESS)
    s.loop(340, 74, 112, "t", "left", ["turn or swipe:", "next group"])
    s.loop(540, 74, 112, "p", "right", ["press: next mode", "off › white › colour › scene"])

    # one trunk out of the box, one bus, one branch per mode — every tap is
    # the same gesture, so it is drawn once rather than six times
    s.arrow(440, 124, 440, 174, "k", both=True)
    s.text(452, 152, "tap in · tap out", TAP, 12, anchor="start")
    s.p.append(f'<line x1="150" y1="176" x2="730" y2="176" stroke="{TAP}" stroke-width="1.8"/>')

    modes = [
        (40, 250, "mode = WHITE", ["BRIGHT", "WARMTH"]),
        (310, 260, "mode = COLOUR", ["BRIGHT", "HUE", "SAT"]),
        (610, 230, "mode = SCENE", ["SCENE", "BRIGHT"]),
    ]
    for x, w, name, labels in modes:
        cx = x + w / 2
        s.frame(x, 250, w, 148 if len(labels) > 2 else 84, name)
        carousel(s, x + 16, 268, w - 32, labels)
        s.arrow(cx, 178, cx, 246, "k", both=True)
    s.text(W / 2, 448, "press is the power control everywhere: off is one position in the cycle,", DIM, 12)
    s.text(W / 2, 466, "and inside an adjust screen press stays plain on / off", DIM, 12)
    s.legend(500)
    s.render(path)


# ── Option B: a home screen for each light ─────────────────────────────────
def option_b(path):
    s = Svg(540, "B")
    s.text(W / 2, 28, "Option B — each light gets its own home screen", FG, 16, weight="600")
    s.box(340, 56, 200, 62, "LIGHTS", "browse the groups", EDGE)
    s.loop(340, 70, 106, "t", "left", ["turn or swipe:", "next group"])
    s.loop(540, 70, 106, "p", "right", ["press: on / off"])

    s.box(340, 196, 200, 62, "BACK PORCH", "mode: COLOUR", PRESS)
    s.loop(540, 210, 246, "p", "right", ["press: next mode", "off › white › colour › scene"])
    s.arrow(420, 122, 420, 192, "k")
    s.text(404, 162, "tap", TAP, 12, anchor="end")
    s.arrow(300, 214, 300, 124, "w", dash=True)
    s.p.append(f'<line x1="300" y1="214" x2="340" y2="214" stroke="{WARN}" stroke-width="1.8" stroke-dasharray="5 4"/>')
    s.p.append(f'<line x1="300" y1="124" x2="340" y2="124" stroke="{WARN}" stroke-width="1.8" stroke-dasharray="5 4"/>')
    s.text(288, 172, "needs a gesture", WARN, 12, anchor="end")
    s.text(288, 187, "that does not exist yet", WARN, 12, anchor="end")

    s.frame(230, 336, 420, 112, "ADJUST · whatever the mode offers")
    carousel(s, 246, 354, 388, ["BRIGHT", "HUE", "SAT"])
    s.arrow(456, 262, 456, 330, "k")
    s.arrow(404, 330, 404, 264, "k")
    s.text(478, 300, "tap in · tap out", TAP, 12, anchor="start")
    s.legend(516)
    s.render(path)


# ── Option C: mode is just another thing the knob sets ─────────────────────
def option_c(path):
    s = Svg(478, "C")
    s.text(W / 2, 28, "Option C — mode is one more adjust screen", FG, 16, weight="600")
    s.box(340, 60, 200, 66, "LIGHTS", "Back Porch · 2 lights", EDGE)
    s.loop(340, 76, 114, "t", "left", ["turn or swipe:", "next group"])
    s.loop(540, 76, 114, "p", "right", ["press: on / off"])

    s.frame(30, 250, 820, 112, "ADJUST · turn to set, press for on / off, tap to leave")
    carousel(s, 46, 268, 788, ["MODE", "BRIGHT", "WARMTH", "HUE", "SAT"])
    s.arrow(404, 132, 404, 244, "k")
    s.arrow(456, 244, 456, 134, "k")
    s.text(430, 195, "tap in · tap out", TAP, 12)
    s.text(W / 2, 410, "the carousel holds only the screens the light supports:", DIM, 12)
    s.text(W / 2, 428, "Bar drops HUE and SAT, Richard Bedside drops WARMTH", DIM, 12)
    s.legend(458)
    s.render(path)


option_a("flow-option-a.svg")
option_b("flow-option-b.svg")
option_c("flow-option-c.svg")

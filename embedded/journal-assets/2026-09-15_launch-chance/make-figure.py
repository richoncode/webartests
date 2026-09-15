#!/usr/bin/env python3
"""The chance curve, and the three states of the band, drawn from chance-model.py."""
import importlib.util, pathlib, xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("cm", pathlib.Path(__file__).parent / "chance-model.py")
cm = importlib.util.module_from_spec(spec); spec.loader.exec_module(cm)

W, H = 840, 620
INK, PAPER, DIM = "#0d0d0d", "#fff", "#8a8a8a"
GREEN, YELLOW, BLUE, RED = "#2f9e44", "#e8c000", "#2f6fd0", "#d64545"
FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif"
p = [f'<rect width="{W}" height="{H}" fill="{INK}"/>']


def t(x, y, s, fill=PAPER, size=12, anchor="middle", weight="400", mono=False):
    fam = "'SF Mono', ui-monospace, monospace" if mono else FONT
    p.append(f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" font-weight="{weight}" '
             f'font-family="{fam}" text-anchor="{anchor}">{s}</text>')


# ── the curve ───────────────────────────────────────────────────────────────
t(W / 2, 28, "chance against lift-off time, clear sky, status Go", PAPER, 15, weight="600")
GX, GY, GW, GH = 70, 60, 700, 190
p.append(f'<rect x="{GX}" y="{GY}" width="{GW}" height="{GH}" fill="#141414" stroke="#2a2a2a"/>')
SS, SR = 19 * 60 + 10, 6 * 60 + 50
lo, hi = -180, 300
xs = lambda rel: GX + GW * (rel - lo) / (hi - lo)
ys = lambda pct: GY + GH - GH * pct / 100

for pct, lab in ((55, "green"), (30, "yellow"), (15, "shown")):
    p.append(f'<line x1="{GX}" y1="{ys(pct):.1f}" x2="{GX+GW}" y2="{ys(pct):.1f}" '
             f'stroke="#333" stroke-width="1" stroke-dasharray="4 4"/>')
    t(GX - 8, ys(pct) + 4, f"{pct}% {lab}", DIM, 10, anchor="end")

pts = []
for rel in range(lo, hi + 1, 2):
    c = cm.chance(SS + rel - cm.PLUME_LAG_MIN, SS, SR, 0, "Go")
    pts.append(f"{xs(rel):.1f},{ys(c):.1f}")
p.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{GREEN}" stroke-width="2.4"/>')
p.append(f'<line x1="{xs(0):.1f}" y1="{GY}" x2="{xs(0):.1f}" y2="{GY+GH}" stroke="{YELLOW}" stroke-width="1.4"/>')
t(xs(0), GY + GH + 18, "sunset", YELLOW, 11)
for rel in (-180, -90, 90, 180, 270):
    t(xs(rel), GY + GH + 18, f"{rel:+d}m", DIM, 11)

for lab, lift, col in (("tonight 18:00", 18 * 60, RED), ("Fri 18:47", 18 * 60 + 47, YELLOW)):
    rel = lift + cm.PLUME_LAG_MIN - SS
    c = cm.chance(lift, SS, SR, 0, "Go")
    p.append(f'<circle cx="{xs(rel):.1f}" cy="{ys(c):.1f}" r="5" fill="{col}"/>')
    t(xs(rel), ys(c) - 12, f"{lab} · {c}%", col, 11)

t(W / 2, GY + GH + 40, "a pre-dawn launch gets the same curve mirrored around sunrise", DIM, 11)

# ── the band, three states ──────────────────────────────────────────────────
t(W / 2, 330, "the band on the panel, 800 px wide", PAPER, 15, weight="600")
BANDS = [("LAUNCH 78%", 78, GREEN, INK, "STARLINK 15-27", "LOOK SSE · out by 7:35 PM", "7:40 PM"),
         ("LAUNCH 35%", 35, YELLOW, INK, "STARLINK 15-27", "LOOK SSE · out by 6:42 PM", "6:47 PM"),
         ("LAUNCH 18%", 18, BLUE, PAPER, "USSF-259", "LOOK SSE · out by 5:55 PM", "6:00 PM")]
BX, BW, BH = 20, 800, 56
for i, (_, pct, col, ink, name, sub, time) in enumerate(BANDS):
    by = 356 + i * 76
    p.append(f'<rect x="{BX}" y="{by}" width="{BW}" height="{BH}" fill="{col}"/>')
    # rocket glyph, drawn the way the panel would draw it
    rx, ry = BX + 26, by + 12
    p.append(f'<path d="M {rx+9} {ry} C {rx+16} {ry+8}, {rx+16} {ry+20}, {rx+13} {ry+26} '
             f'L {rx+5} {ry+26} C {rx+2} {ry+20}, {rx+2} {ry+8}, {rx+9} {ry} Z" fill="{ink}"/>')
    p.append(f'<path d="M {rx+4} {ry+18} L {rx} {ry+28} L {rx+5} {ry+26} Z" fill="{ink}"/>')
    p.append(f'<path d="M {rx+14} {ry+18} L {rx+18} {ry+28} L {rx+13} {ry+26} Z" fill="{ink}"/>')
    p.append(f'<circle cx="{rx+9}" cy="{ry+10}" r="2.6" fill="{col}"/>')
    t(BX + 62, by + 24, name, ink, 17, anchor="start", weight="600")
    t(BX + 62, by + 45, sub, ink, 12, anchor="start")
    t(BX + BW - 150, by + 30, f"{pct}%", ink, 26, anchor="end", weight="700", mono=True)
    t(BX + BW - 22, by + 24, time, ink, 19, anchor="end", weight="600", mono=True)
    t(BX + BW - 22, by + 45, "chance tonight", ink, 11, anchor="end")

t(W / 2, H - 16, "below 15% the band is not drawn at all", DIM, 12)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">' + "".join(p) + "</svg>"
ET.fromstring(svg)
open("launch-chance.svg", "w").write(svg + "\n")
print("launch-chance.svg ok")

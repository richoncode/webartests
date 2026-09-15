#!/usr/bin/env python3
"""A dimensioned cross-section of the tray, drawn from make-case.py's numbers."""
import importlib.util, pathlib, xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("mc", pathlib.Path(__file__).parent / "make-case.py")
mc = importlib.util.module_from_spec(spec); spec.loader.exec_module(mc)

pocket = mc.MODULE + mc.CLEARANCE
bay_x = mc.CELL_L + mc.CELL_GAP
bay_h = mc.CELL_H + mc.CHARGER_H + mc.CELL_GAP
out_x = max(pocket, bay_x) + 2 * mc.WALL
step = mc.FLOOR + bay_h
top = step + mc.POCKET_DEEP

S, OX, OY = 5.2, 250, 330                      # scale and origin, y up
X = lambda v: OX + v * S
Y = lambda v: OY - v * S
p = [f'<rect width="760" height="380" fill="#0d0d0d"/>']

def box(x0, y0, x1, y1, fill, stroke="#5b9bd5", w=1.6, dash=""):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    p.append(f'<rect x="{X(x0):.1f}" y="{Y(y1):.1f}" width="{(x1-x0)*S:.1f}" '
             f'height="{(y1-y0)*S:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{w}"{d}/>')

def dim(x, y0, y1, label):
    p.append(f'<line x1="{X(x):.1f}" y1="{Y(y0):.1f}" x2="{X(x):.1f}" y2="{Y(y1):.1f}" '
             f'stroke="#f0a040" stroke-width="1.2"/>')
    p.append(f'<text x="{X(x)+8:.1f}" y="{(Y(y0)+Y(y1))/2+4:.0f}" fill="#f0a040" font-size="12" '
             f'font-family="monospace">{label}</text>')

# module sitting in the pocket
box(-pocket/2, step, pocket/2, step + 33, "#1a1a1a", "#9aa0a6", 1.8)
p.append(f'<text x="{X(0):.0f}" y="{Y(step+22):.0f}" fill="#fff" font-size="13" text-anchor="middle" '
         f'font-family="-apple-system, sans-serif">module 48 x 48 x 33</text>')
p.append(f'<text x="{X(0):.0f}" y="{Y(step+15):.0f}" fill="#8a8a8a" font-size="11" text-anchor="middle" '
         f'font-family="-apple-system, sans-serif">its own shell — not reprinted</text>')
# tray walls
box(-out_x/2, 0, out_x/2, top, "none", "#5b9bd5", 2)
box(-bay_x/2, mc.FLOOR, bay_x/2, step, "#12202c", "#5b9bd5", 1.2, "4 3")
box(-pocket/2, step, pocket/2, top, "none", "#5b9bd5", 1.2, "4 3")
# cell and charger
box(-mc.CELL_L/2, mc.FLOOR, mc.CELL_L/2, mc.FLOOR + mc.CELL_H, "#4caf50", "#4caf50", 1)
p.append(f'<text x="{X(0):.0f}" y="{Y(mc.FLOOR+mc.CELL_H/2)+4:.0f}" fill="#0d0d0d" font-size="11" '
         f'text-anchor="middle" font-family="monospace">1000 mAh cell</text>')
box(-14, mc.FLOOR + mc.CELL_H + 0.5, 14, mc.FLOOR + mc.CELL_H + 0.5 + mc.CHARGER_H, "#f0a040", "#f0a040", 1)
p.append(f'<text x="{X(0):.0f}" y="{Y(mc.FLOOR+mc.CELL_H+1.6)+4:.0f}" fill="#0d0d0d" font-size="10" '
         f'text-anchor="middle" font-family="monospace">TP4056 charger</text>')

dim(out_x/2 + 3, 0, top, f"{top:.1f}")
dim(out_x/2 + 14, step, top, f"{mc.POCKET_DEEP:.0f} grip")
dim(out_x/2 + 25, mc.FLOOR, step, f"{bay_h:.1f} bay")
p.append(f'<text x="{X(0):.0f}" y="{Y(-6):.0f}" fill="#8a8a8a" font-size="12" text-anchor="middle" '
         f'font-family="monospace">tray {out_x:.1f} wide · wall {mc.WALL} · floor {mc.FLOOR}</text>')
p.append(f'<text x="20" y="28" fill="#fff" font-size="14" font-weight="600" '
         f'font-family="-apple-system, sans-serif">section through the base</text>')

svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 380" width="760" height="380" role="img">' + "".join(p) + "</svg>"
ET.fromstring(svg)
open("case-section.svg", "w").write(svg + "\n")
print(f"case-section.svg ok — tray {out_x:.1f} x {top:.1f} mm, bay {bay_h:.1f} mm")

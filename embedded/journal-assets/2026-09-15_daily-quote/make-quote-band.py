#!/usr/bin/env python3
"""The quote band as the panel would draw it, measured with the real font metrics."""
import pathlib, sys, xml.etree.ElementTree as ET
sys.path.insert(0, str(pathlib.Path(__file__).parents[2] / "seeed-studio-epaper/tools"))
import gfxfont

W, BAND_W, PAD, BH = 840, 800, 22, 56
SAMPLES = [("What stands in the way becomes the way.", "Marcus Aurelius"),
           ("Power concedes nothing without a demand. It never did.", "Frederick Douglass"),
           ("One must still have chaos in oneself to give birth to a dancing star.", "Friedrich Nietzsche")]
H = 60 + len(SAMPLES) * 84 + 40
p = [f'<rect width="{W}" height="{H}" fill="#0d0d0d"/>']
p.append(f'<text x="{W/2}" y="30" fill="#fff" font-size="15" font-weight="600" text-anchor="middle" '
         f'font-family="-apple-system, sans-serif">the band when no launch is worth standing outside for</text>')

for i, (q, who) in enumerate(SAMPLES):
    y = 56 + i * 84
    wb = gfxfont.width(q, gfxfont.FONTS["F_BODY"])
    fits = wb <= BAND_W - 2 * PAD
    size, font = (17, "F_BODY") if fits else (13, "F_TINY")
    p.append(f'<rect x="20" y="{y}" width="{BAND_W}" height="{BH}" fill="#f2f2ee"/>')
    p.append(f'<rect x="20" y="{y}" width="6" height="{BH}" fill="#2f6fd0"/>')
    p.append(f'<text x="{20+PAD+8}" y="{y+26}" fill="#111" font-size="{size}" '
             f'font-family="Helvetica, Arial, sans-serif" font-weight="600">&#8220;{q}&#8221;</text>')
    p.append(f'<text x="{20+BAND_W-PAD}" y="{y+46}" fill="#555" font-size="12" text-anchor="end" '
             f'font-family="Helvetica, Arial, sans-serif" font-weight="600">&#8212; {who}</text>')
    p.append(f'<text x="{20+BAND_W+2}" y="{y+18}" fill="#8a8a8a" font-size="10" text-anchor="end" '
             f'font-family="monospace">{font} {wb}px</text>')

p.append(f'<text x="{W/2}" y="{H-16}" fill="#8a8a8a" font-size="12" text-anchor="middle" '
         f'font-family="-apple-system, sans-serif">widths measured from FreeSansBold, the same metrics the panel uses</text>')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">' + "".join(p) + "</svg>"
ET.fromstring(svg)
open("quote-band.svg", "w").write(svg + "\n")
print("quote-band.svg ok")

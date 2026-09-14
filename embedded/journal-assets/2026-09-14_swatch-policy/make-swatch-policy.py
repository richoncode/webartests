#!/usr/bin/env python3
"""Show what each colour screen suspends, using a deliberately awkward state:
a dim, desaturated sky blue. The top row is the true combined colour, the
bottom row is what the swatch actually shows.
"""
import math, xml.etree.ElementTree as ET

HUE, SAT, LSTAR = 205, 200, 15          # dim and washed out on purpose
FLOOR = 600
W, H = 760, 300


def lstar_to_dps(L):                     # the firmware's curve, DPS_MIN 10
    Y = ((L + 16) / 116) ** 3 if L > 8 else L / 903.3
    return max(10, min(1000, round(10 + 990 * Y)))


def hsv(h, s, v):
    S, V = s / 1000, v / 1000
    c = V * S
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = V - c
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return "#%02x%02x%02x" % tuple(round((q + m) * 255) for q in (r, g, b))


v = lstar_to_dps(LSTAR)
true = hsv(HUE, SAT, v)
SCREENS = [
    ("COLOR", hsv(HUE, 1000, max(v, FLOOR)), "saturation forced full, brightness floored at 60%"),
    ("SATURATION", hsv(HUE, SAT, 1000), "brightness forced full"),
    ("BRIGHTNESS", hsv(HUE, SAT, v), "nothing suspended"),
]

p = [f'<rect width="{W}" height="{H}" fill="#0d0d0d"/>']
p.append(f'<text x="{W/2}" y="30" fill="#fff" font-size="15" font-weight="600" text-anchor="middle" '
         f'font-family="-apple-system, sans-serif">hue 205 · saturation 20% · brightness 15%</text>')
for i, (name, shown, note) in enumerate(SCREENS):
    cx = 140 + i * 240
    p.append(f'<text x="{cx}" y="66" fill="#5b9bd5" font-size="12" text-anchor="middle" '
             f'font-family="monospace">{name}</text>')
    p.append(f'<circle cx="{cx}" cy="120" r="34" fill="{true}" stroke="#444"/>')
    p.append(f'<circle cx="{cx}" cy="212" r="34" fill="{shown}" stroke="#fff"/>')
    for ln, txt in enumerate(note.split(", ")):
        p.append(f'<text x="{cx}" y="{262 + ln * 16}" fill="#8a8a8a" font-size="11" text-anchor="middle" '
                 f'font-family="-apple-system, sans-serif">{txt}</text>')
p.append(f'<text x="20" y="125" fill="#8a8a8a" font-size="11" font-family="-apple-system, sans-serif">true</text>')
p.append(f'<text x="20" y="217" fill="#8a8a8a" font-size="11" font-family="-apple-system, sans-serif">shown</text>')

svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">' + "".join(p) + "</svg>"
ET.fromstring(svg)
open("swatch-policy.svg", "w").write(svg + "\n")
print("swatch-policy.svg ok — true colour", true)

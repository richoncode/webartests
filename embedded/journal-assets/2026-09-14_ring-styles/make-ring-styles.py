#!/usr/bin/env python3
"""Draw the four adjust screens as the firmware renders them.

Dot angles, colours and the value floor are the same arithmetic as
control.ino, so this shows what the glass shows rather than an impression.
"""
import math, xml.etree.ElementTree as ET

W, H, R, N = 880, 268, 100, 52
SCREENS = [("COLOR", "hue"), ("SATURATION", "sat"), ("BRIGHTNESS", "bright"), ("WARMTH", "warm")]
HUE, SAT, VAL, WARM = 205, 1000, 1000, 500          # the state being previewed


def hsv(h, s, v):
    S, V = s / 1000, v / 1000
    c = V * S
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = V - c
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return tuple(round((v + m) * 255) for v in (r, g, b))


def warm(w):
    t = w / 1000
    return (255, round(150 + 105 * t), round(40 + 215 * t))


def dot(style, p):
    if style == "hue":    return hsv(p * 360 // 100, 1000, 1000)
    if style == "sat":    return hsv(HUE, p * 10, 1000)
    if style == "warm":   return warm(p * 10)
    v = 180 + p * 82 // 10                           # floored, or the dark end vanishes
    return hsv(HUE, SAT, v)


def swatch(style):
    return hsv(HUE, SAT, VAL) if style != "warm" else warm(WARM)


def hexc(c):
    return "#%02x%02x%02x" % c


parts = [f'<rect width="{W}" height="{H}" fill="#0d0d0d"/>']
for i, (title, style) in enumerate(SCREENS):
    cx, cy = 110 + i * 220, 140
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="{R + 14}" fill="#000" stroke="#222"/>')
    mark = {"hue": HUE * 100 // 360, "sat": 100, "bright": 100, "warm": WARM // 10}[style]
    mi = min(N - 1, (mark * N + 50) // 100)          # the firmware snaps the marker to a dot
    for k in range(N):
        a = math.radians(-220 + 5 * k)
        x, y = cx + math.cos(a) * R, cy + math.sin(a) * R
        p = k * 100 // N
        c = hexc(dot(style, p))
        if k == mi:
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6.5" fill="{c}"/>'
                         f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="none" stroke="#fff" stroke-width="1.6"/>')
        else:
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.7" fill="{c}"/>')
    parts.append(f'<circle cx="{cx}" cy="{cy - 30}" r="26" fill="{hexc(swatch(style))}" stroke="#fff"/>')
    parts.append(f'<text x="{cx}" y="{cy - 62}" fill="#5b9bd5" font-size="11" text-anchor="middle" '
                 f'font-family="monospace">{title}</text>')
    label = {"hue": "SKY", "sat": "100%", "bright": "100%", "warm": "NEUTRAL"}[style]
    parts.append(f'<text x="{cx}" y="{cy + 20}" fill="#fff" font-size="16" text-anchor="middle" '
                 f'font-weight="600" font-family="monospace">{label}</text>')
    parts.append(f'<text x="{cx}" y="{cy + 44}" fill="#4caf50" font-size="13" text-anchor="middle" '
                 f'font-family="monospace">ON</text>')

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
       f'role="img">' + "".join(parts) + "</svg>")
ET.fromstring(svg)
open("ring-styles.svg", "w").write(svg + "\n")
print("ring-styles.svg", len(svg), "bytes ok")

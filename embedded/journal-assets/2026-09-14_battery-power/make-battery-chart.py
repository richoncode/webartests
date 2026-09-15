#!/usr/bin/env python3
"""Days per charge against sleep current, for a 2000 mAh cell at typical use.

Reads the same model as tools/battery-estimate.py so the chart cannot drift
from the table beside it.
"""
import importlib.util, pathlib, sys, xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parents[2] / "espRotary" / "tools" / "battery-estimate.py"
spec = importlib.util.spec_from_file_location("bat", root)
bat = importlib.util.module_from_spec(spec)
sys.modules["bat"] = bat
spec.loader.exec_module(bat)

CELL, PROFILE = 2000, "typical"
rows = [(i, CELL * bat.USABLE / bat.daily_mah(PROFILE, i)) for i in bat.I_SLEEP_CANDIDATES]
top = max(d for _, d in rows)

W, H, L, R, T, B = 720, 300, 110, 30, 46, 46
bw = (H - T - B) / len(rows)
p = [f'<rect width="{W}" height="{H}" fill="#0d0d0d"/>',
     f'<text x="{L}" y="26" fill="#fff" font-size="14" font-weight="600" '
     f'font-family="-apple-system, sans-serif">2000 mAh · 25 wakes a day · 30 s each</text>']
for i, (ma, days) in enumerate(rows):
    y = T + i * bw
    w = (W - L - R) * days / top
    col = "#4caf50" if days > 30 else "#f0a040" if days > 10 else "#e74c3c"
    p.append(f'<rect x="{L}" y="{y + 4:.0f}" width="{w:.0f}" height="{bw - 12:.0f}" rx="3" fill="{col}"/>')
    p.append(f'<text x="{L - 12}" y="{y + bw / 2 + 1:.0f}" fill="#8a8a8a" font-size="12" text-anchor="end" '
             f'font-family="monospace">{ma:g} mA</text>')
    p.append(f'<text x="{L + w + 10:.0f}" y="{y + bw / 2 + 1:.0f}" fill="#fff" font-size="13" '
             f'font-family="monospace">{days:.0f} days</text>')
p.append(f'<text x="{L}" y="{H - 16}" fill="#8a8a8a" font-size="11" '
         f'font-family="-apple-system, sans-serif">sleep current — estimated, not measured; '
         f'everything else in the budget barely moves the result</text>')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">' + "".join(p) + "</svg>"
ET.fromstring(svg)
open("battery-days.svg", "w").write(svg + "\n")
print("battery-days.svg ok:", [(m, round(d)) for m, d in rows])

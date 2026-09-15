#!/usr/bin/env python3
"""Battery and charger wiring for the CrowPanel 1.28" rotary module.

Connector pinouts are read from Elecrow's own schematic
(Eagle_SCH&PCB/ESP32 Display-1.28-V1.0.sch), not guessed:

  J37  1 VUSB_IN   2 USB D-      3 USB D+   4 GND     the 5 V input
  J36  1 GPIO39 SCL 2 GPIO38 SDA  3 OUT_5V  4 GND     I2C
  J34  1 UART0 RXD  2 UART0 TXD   3 OUT_5V  4 GND     UART
"""
import xml.etree.ElementTree as ET

W, H = 900, 470
FG, DIM, WIRE, RED, BLK, ACC = "#fff", "#8a8a8a", "#5b9bd5", "#e74c3c", "#9aa0a6", "#4caf50"
FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif"
MONO = "'SF Mono', 'Fira Code', ui-monospace, monospace"
p = [f'<rect width="{W}" height="{H}" fill="#0d0d0d"/>']


def text(x, y, s, fill=FG, size=12, anchor="middle", mono=False, weight="400"):
    p.append(f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" font-weight="{weight}" '
             f'font-family="{MONO if mono else FONT}" text-anchor="{anchor}">{s}</text>')


def block(x, y, w, h, title, sub=None, stroke=WIRE):
    p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="#1a1a1a" '
             f'stroke="{stroke}" stroke-width="1.6"/>')
    text(x + w / 2, y + (h / 2 + 5 if not sub else h / 2 - 3), title, FG, 13, weight="600")
    if sub:
        text(x + w / 2, y + h / 2 + 15, sub, DIM, 11)


def wire(pts, col=RED, label=None, lx=None, ly=None, dash=False):
    d = " ".join(f"{'M' if i == 0 else 'L'} {x} {y}" for i, (x, y) in enumerate(pts))
    da = ' stroke-dasharray="5 4"' if dash else ""
    p.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="2"{da}/>')
    if label:
        text(lx, ly, label, col, 11, mono=True)


text(W / 2, 26, "Battery and charger for the 5 V input", FG, 16, weight="600")

block(30, 70, 150, 62, "USB-C breakout", "5 V 1 A wall supply")
block(230, 70, 170, 62, "TP4056 + DW01", "charger and protection")
block(230, 190, 170, 62, "Li-ion cell", "503450 · 3.7 V · 1000 mAh", ACC)
block(450, 70, 170, 62, "boost 3.7 → 5 V", "TPS61023, low Iq")
p.append('<rect x="690" y="46" width="180" height="238" rx="8" fill="#1a1a1a" stroke="#5b9bd5" stroke-width="1.6"/>')
text(780, 68, "module", FG, 13, weight="600")
text(780, 84, "CrowPanel 1.28 rotary", DIM, 11)

# charge path
wire([(180, 92), (230, 92)], RED, "5 V", 205, 84)
wire([(180, 112), (215, 112), (215, 222), (230, 222)], BLK, "GND", 205, 200)
# cell to charger
wire([(315, 190), (315, 132)], RED, "B+", 328, 165)
wire([(345, 190), (345, 132)], BLK, "B−", 358, 165)
# cell to boost
wire([(400, 210), (430, 210), (430, 92), (450, 92)], RED, "VBAT", 432, 170)
wire([(400, 232), (418, 232), (418, 112), (450, 112)], BLK, "GND", 406, 272)
# boost to module
wire([(620, 92), (690, 92)], RED, "5 V", 655, 84)
wire([(620, 112), (690, 112)], BLK, "GND", 655, 128)
text(655, 70, "J37", WIRE, 11, mono=True)

# J37 detail
p.append('<rect x="700" y="96" width="160" height="58" rx="6" fill="#141414" stroke="#2a2a2a"/>')
text(780, 114, "J37  1.25-4P", DIM, 11, mono=True)
text(780, 130, "1 VUSB_IN   4 GND", FG, 11, mono=True)
text(780, 146, "2/3 USB data — leave open", DIM, 10, mono=True)

# optional fuel gauge
block(450, 300, 170, 62, "MAX17048", "state of charge, I²C", "#f0a040")
wire([(400, 230), (420, 230), (420, 331), (450, 331)], RED, "VBAT", 398, 300)
wire([(620, 316), (660, 316), (660, 205), (690, 205)], "#f0a040", "SDA / SCL", 648, 186, dash=True)
p.append('<rect x="700" y="176" width="160" height="58" rx="6" fill="#141414" stroke="#2a2a2a"/>')
text(780, 194, "J36  1.25-4P", DIM, 11, mono=True)
text(780, 210, "1 SCL GPIO39", FG, 11, mono=True)
text(780, 226, "2 SDA GPIO38   4 GND", FG, 11, mono=True)

text(30, 300, "Charge with the device asleep.", RED, 12, anchor="start", weight="600")
for i, line in enumerate([
        "A TP4056 does not share the load: with the boost",
        "drawing from the cell while the charger is running,",
        "termination never settles and the cell sits at full",
        "voltage. Either charge it switched off, or use a",
        "load-sharing part — MCP73871 or IP5306 — instead."]):
    text(30, 320 + i * 16, line, DIM, 11, anchor="start")

text(W / 2, H - 14, "connector pinouts read from Elecrow's schematic, not inferred", DIM, 11)

svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">' + "".join(p) + "</svg>"
ET.fromstring(svg)
open("battery-wiring.svg", "w").write(svg + "\n")
print("battery-wiring.svg ok")

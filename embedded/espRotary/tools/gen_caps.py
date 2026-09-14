#!/usr/bin/env python3
"""Stamp per-group capability flags into firmware/control/devices_secret.h.

dp 21 advertises white/colour/scene/music on every bulb here, including bulbs
that have no colour datapoint. Trust the datapoints instead: a group offers a
mode only when every member reports the datapoint that mode needs.

Run from the repo: tools/gen_caps.py
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
HDR = ROOT / "firmware/control/devices_secret.h"
RAW = ROOT / "devices/tuya-raw.json"

CAPS = {"22": ("CAP_BRIGHT", 1), "23": ("CAP_WARM", 2), "24": ("CAP_COLOUR", 4), "25": ("CAP_SCENE", 8)}

raw = json.loads(RAW.read_text())["result"]
devs = raw if isinstance(raw, list) else raw.get("list", raw.get("devices"))
dps_of = {d["name"]: set((d.get("mapping") or {}).keys()) for d in devs}

src = HDR.read_text()

# member names, in the order the arrays declare them
arrays = {}
for m in re.finditer(r"static const TuyaLight (g\d+)_members\[\] = \{(.*?)\};", src, re.S):
    arrays[m.group(1)] = re.findall(r'\{\s*"([^"]+)"', m.group(2))

def caps_for(members):
    bits = 0
    for dp, (_, bit) in CAPS.items():
        if members and all(dp in dps_of.get(n, set()) for n in members):
            bits |= bit
    return bits

# rewrite the GROUPS table, appending caps to each row
def row(m):
    name, arr, count, kind = m.group(1), m.group(2), m.group(3), m.group(4)
    members = arrays.get(arr.replace("_members", ""), [])
    bits = caps_for(members)
    names = [n for n, (_, b) in CAPS.items() if bits & b]
    flags = " | ".join(CAPS[n][0] for n in names) or "0"
    return f'  {{ "{name}", {arr}, {count}, {kind}, {flags} }},'

pat = re.compile(r'  \{ "([^"]+)", (g\d+_members), (\d+), (KIND_\w+) \},')
if not pat.search(src):
    sys.exit("GROUPS table already carries caps, or its shape changed")
src = pat.sub(row, src)

src = src.replace(
    "struct LightGroup { const char *name; const TuyaLight *members; uint8_t count; uint8_t kind; };",
    "struct LightGroup { const char *name; const TuyaLight *members; uint8_t count; uint8_t kind; uint8_t caps; };")
src = src.replace(
    "#define KIND_COLOUR   2",
    "#define KIND_COLOUR   2\n\n"
    "// What a group can actually be asked to do — the intersection of its members.\n"
    "#define CAP_BRIGHT  0x01   // dp 22\n"
    "#define CAP_WARM    0x02   // dp 23\n"
    "#define CAP_COLOUR  0x04   // dp 24\n"
    "#define CAP_SCENE   0x08   // dp 25")

HDR.write_text(src)
for m in pat.finditer(HDR.read_text()):
    pass
print(HDR.read_text().split("static const LightGroup")[1].split("};")[0])

#!/usr/bin/env python3
"""Measure text the way the panel will, by reading the GFX font headers.

Adafruit GFX advances the cursor by each glyph's xAdvance, so a string's width
is the sum of those. Parsing the font's own header gives the same number the
device computes, which is the only way to promise a line fits without a panel.
"""
import pathlib, re

FONT_DIR = pathlib.Path.home() / "Documents/Arduino/libraries/Seeed_GFX/Fonts/GFXFF"
_cache = {}


def load(name):
    if name in _cache:
        return _cache[name]
    src = (FONT_DIR / f"{name}.h").read_text(errors="replace")
    body = re.search(r"Glyphs\[\]\s*(?:PROGMEM)?\s*=\s*\{(.*?)\};", src, re.S).group(1)
    glyphs = [[int(v) for v in re.findall(r"-?\d+", row)]
              for row in re.findall(r"\{([^{}]*)\}", body)]
    tail = re.search(r"GFXfont\s+" + name + r"\s*(?:PROGMEM)?\s*=\s*\{(.*?)\};", src, re.S).group(1)
    nums = re.findall(r"0x[0-9A-Fa-f]+|\d+", tail)
    first, last = int(nums[-3], 0), int(nums[-2], 0)
    f = {"first": first, "last": last, "adv": [g[3] for g in glyphs], "y": int(nums[-1], 0)}
    _cache[name] = f
    return f


def width(s, name):
    f = load(name)
    w = 0
    for ch in s:
        c = ord(ch)
        if c == 0x2019:          # a curly apostrophe is not in these fonts
            c = ord("'")
        if f["first"] <= c <= f["last"]:
            w += f["adv"][c - f["first"]]
        elif ch == " ":
            w += f["adv"][ord(" ") - f["first"]]
    return w


FONTS = {"F_TINY": "FreeSansBold9pt7b", "F_BODY": "FreeSansBold12pt7b",
         "F_MID": "FreeSansBold18pt7b", "F_BIG": "FreeSansBold24pt7b"}

if __name__ == "__main__":
    for label, name in FONTS.items():
        f = load(name)
        print(f"{label:7} {name:20} glyphs {len(f['adv']):3d}  yAdvance {f['y']:2d}  "
              f"'MMMM' {width('MMMM', name):3d}px  'iiii' {width('iiii', name):3d}px")

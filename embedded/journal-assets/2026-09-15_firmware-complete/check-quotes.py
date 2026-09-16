#!/usr/bin/env python3
"""Every quote has to fit the band. Measure them the way the panel will.

The band is 800 px wide with 22 px of padding each side, so a line has 756 px.
The quote is drawn at F_BODY where it fits and F_TINY where it does not; the
attribution is always F_TINY. Anything that cannot fit even at F_TINY is a
build-time problem, not a surprise on the glass.
"""
import pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import gfxfont

# These have to match drawQuote exactly. The band is 800 wide with 22 px of
# padding, the blue stripe costs another 8, and the renderer wraps the line in
# quote marks — so the budget is 748 px for the text plus its quotes, not 756
# for the text alone.
BAND_W, PAD, STRIPE = 800, 22, 8
AVAIL = BAND_W - 2 * PAD - STRIPE

here = pathlib.Path(__file__).parent
for cand in (here / "quotes.h", here.parent / "firmware/dashboard/quotes.h"):
    if cand.exists():
        src = cand.read_text()
        break
else:
    sys.exit("quotes.h not found")
body = src[src.index("static const Quote QUOTES[]"):src.index("static const int QUOTE_COUNT")]
rows = re.findall(r'\{\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\}', body)
assert rows, "no quotes parsed"

bad, tiny = [], []
for text, who in rows:
    t = text.replace('\\"', '"').replace("\\'", "'")
    quoted = '"' + t + '"'
    w_body = gfxfont.width(quoted, gfxfont.FONTS["F_BODY"])
    w_tiny = gfxfont.width(quoted, gfxfont.FONTS["F_TINY"])
    w_who = gfxfont.width("- " + who, gfxfont.FONTS["F_TINY"])
    if w_body <= AVAIL:
        fit = "F_BODY"
    elif w_tiny <= AVAIL:
        fit = "F_TINY"
        tiny.append((t, w_tiny))
    else:
        fit = "TOO WIDE"
        bad.append((t, w_tiny))
    if w_who > AVAIL:
        bad.append(("attribution: " + who, w_who))
    print(f"{fit:8} {w_body:4d}/{w_tiny:4d} px  who {w_who:3d}  {t[:62]}")

print(f"\n{len(rows)} quotes · {len(rows) - len(tiny) - len(bad)} fit at F_BODY · "
      f"{len(tiny)} need F_TINY · {len(bad)} do not fit")
for t, w in bad:
    print(f"  TOO WIDE by {w - AVAIL:3d} px: {t}")
authors = {}
for _, who in rows:
    authors[who] = authors.get(who, 0) + 1
print(f"{len(authors)} distinct voices; most quoted: "
      + ", ".join(f"{a} ×{n}" for a, n in sorted(authors.items(), key=lambda kv: -kv[1])[:4]))
sys.exit(1 if bad else 0)

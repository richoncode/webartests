#!/usr/bin/env python3
"""PSNR, SSIM, and edge metrics for the Sharp lines tab on the held-out clip.

Six frames of testdata/red-green-top-eye.mp4 (t = 0.5, 1.5, 2.5, 3.5, 4.5, 5.5).
Wide, sharp, and sharp-perceptual were not trained on this clip.

Edge PSNR is luma PSNR on pixels whose reference Sobel magnitude is at least
200 (0..255 luma). GMS is gradient-magnitude similarity on that same mask.
Both match sr_train_lib.edge_metrics and the compare page's Edge readout
(the page shows Edge PSNR; GMS is reported here as well).

RCAS is FSR 1 at 0.20 stops, the slider default, using the same reciprocal
approximation as the page shader. 4x for the nets is two x2 passes with an
8-bit store between them. Bilinear is one shot from the box-downsampled frame.

  python3 experiments/web-video-super-scaling/upscale-models/eval-sharp.py
"""

from __future__ import annotations

from sr_train_lib import (
    HERE, bilinear_u8, edge_metrics, load_clip_at, load_model, page_metrics, rcas_u8, reconstruct,
)

TIMES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
RCAS_STOPS = 0.2
MODELS = [
    ("wide", "football-wide.json"),
    ("sharp", "football-sharp.json"),
    ("perc", "football-sharp-perc.json"),
]


def score(ref, pred):
    psnr, ssim = page_metrics(ref, pred)
    edge, gms, frac = edge_metrics(ref, pred)
    return psnr, ssim, edge, gms, frac


def main():
    loaded = []
    for name, fn in MODELS:
        doc, layers = load_model(HERE / fn)
        loaded.append((name, layers, doc.get("name", name)))
        print(f"loaded {name}: {doc.get('name')} arch={doc.get('arch')}", flush=True)

    names = ["bilinear", "wide", "wide-rcas", "sharp", "perc", "sharp-rcas"]
    acc = {name: {2: [], 4: []} for name in names}

    for t in TIMES:
        cur = load_clip_at(t)
        print(f"frame t={t:.1f}", flush=True)
        preds = {}
        for scale in (2, 4):
            base = bilinear_u8(cur, scale)
            preds["bilinear"] = base
            for name, layers, _title in loaded:
                preds[name] = reconstruct(layers, "espcn-y", cur, scale=scale)
            preds["wide-rcas"] = rcas_u8(preds["wide"], RCAS_STOPS)
            preds["sharp-rcas"] = rcas_u8(preds["sharp"], RCAS_STOPS)
            for name in names:
                acc[name][scale].append(score(cur, preds[name]))
            frac = acc["bilinear"][scale][-1][4]
            print(f"  {scale}x mask fraction {frac:.3f}", flush=True)

    def avg(rows, idx):
        return sum(r[idx] for r in rows) / len(rows)

    print("\nmean over", len(TIMES), "held-out frames  (RCAS stops", RCAS_STOPS, ")", flush=True)
    header = f"{'model':<12} {'2x P':>7} {'2x S':>6} {'2x E':>7} {'2x G':>6} {'4x P':>7} {'4x S':>6} {'4x E':>7} {'4x G':>6}"
    print(header, flush=True)
    for name in names:
        a2, a4 = acc[name][2], acc[name][4]
        print(
            f"{name:<12} {avg(a2, 0):7.2f} {avg(a2, 1):6.3f} {avg(a2, 2):7.2f} {avg(a2, 3):6.3f} "
            f"{avg(a4, 0):7.2f} {avg(a4, 1):6.3f} {avg(a4, 2):7.2f} {avg(a4, 3):6.3f}",
            flush=True,
        )
    print("\nP = luma PSNR, S = SSIM, E = edge PSNR, G = edge GMS", flush=True)
    print("delta vs bilinear, then vs wide. Negative means that column lost.", flush=True)
    b2, b4 = acc["bilinear"][2], acc["bilinear"][4]
    w2, w4 = acc["wide"][2], acc["wide"][4]
    for name in names:
        if name == "bilinear":
            continue
        a2, a4 = acc[name][2], acc[name][4]
        print(
            f"  {name:<12} vs bil  2x P {avg(a2, 0) - avg(b2, 0):+.2f}  E {avg(a2, 2) - avg(b2, 2):+.2f}"
            f"    4x P {avg(a4, 0) - avg(b4, 0):+.2f}  E {avg(a4, 2) - avg(b4, 2):+.2f}",
            flush=True,
        )
        print(
            f"  {'':<12} vs wide 2x P {avg(a2, 0) - avg(w2, 0):+.2f}  E {avg(a2, 2) - avg(w2, 2):+.2f}"
            f"    4x P {avg(a4, 0) - avg(w4, 0):+.2f}  E {avg(a4, 2) - avg(w4, 2):+.2f}",
            flush=True,
        )


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Luma PSNR/SSIM of the custom nets on the held-out demo clip.

Scores six frames (t = 0.5, 1.5, 2.5, 3.5, 4.5, 5.5) of
testdata/red-green-top-eye.mp4. None of the wide / RGB / temporal / distill
nets were trained on this clip. The tiny slot-1 net was; its number is
in-sample except that this script does not use its original train/hold split.

The temporal net is given the frame 1/30 s earlier as its previous frame.
At 4x that previous frame is run first (seeded with itself) so the mid-res
hop matches the page. Other nets ignore the previous frame. 4x for every
custom arch is two x2 passes with an 8-bit store between them, same as the
page. Bilinear is one shot from the box-downsampled frame, same as the page.

Metrics match the page: luma PSNR in 0..255 and mean 8x8 SSIM
(C1=6.5025, C2=58.5225). RGB PSNR is extra and is not the page metric.

  python3 experiments/web-video-super-scaling/upscale-models/eval-heldout.py
"""

from __future__ import annotations

from sr_train_lib import (
    HERE, bilinear_u8, load_clip_at, load_model, page_metrics, reconstruct, rgb_psnr,
)

TIMES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
MODELS = [
    ("slot1", "football-espcn.json", "espcn-y"),
    ("wide", "football-wide.json", "espcn-y"),
    ("rgb", "football-rgb.json", "espcn-rgb"),
    ("temporal", "football-temporal.json", "espcn-y2"),
    ("distill", "football-distill.json", "espcn-y"),
]


def main():
    loaded = []
    for name, fn, arch in MODELS:
        doc, layers = load_model(HERE / fn)
        loaded.append((name, arch, layers, doc.get("name", name)))
        print(f"loaded {name}: {doc.get('name')} arch={doc.get('arch')}", flush=True)

    acc = {name: {2: [], 4: []} for name, _, _ in MODELS}
    acc["bilinear"] = {2: [], 4: []}
    rgb_acc = {2: [], 4: []}

    for t in TIMES:
        cur = load_clip_at(t)
        prev = load_clip_at(max(0.0, t - 1.0 / 30.0))
        print(f"frame t={t:.1f}", flush=True)
        for scale in (2, 4):
            base = bilinear_u8(cur, scale)
            bp, bs = page_metrics(cur, base)
            acc["bilinear"][scale].append((bp, bs, rgb_psnr(cur, base)))
            for name, arch, layers, _title in loaded:
                prev_u8 = prev if arch == "espcn-y2" else None
                pred = reconstruct(layers, arch, cur, prev_u8, scale=scale)
                pp, ps = page_metrics(cur, pred)
                acc[name][scale].append((pp, ps, rgb_psnr(cur, pred)))
            rgb_acc[scale].append(True)

    def avg(rows, idx):
        return sum(r[idx] for r in rows) / len(rows)

    print("\nmean over", len(TIMES), "held-out frames", flush=True)
    print(f"{'model':<12} {'2x PSNR':>8} {'2x SSIM':>8} {'2x RGB':>8} {'4x PSNR':>8} {'4x SSIM':>8} {'4x RGB':>8}")
    order = ["bilinear"] + [name for name, _, _ in MODELS]
    for name in order:
        a2, a4 = acc[name][2], acc[name][4]
        print(
            f"{name:<12} {avg(a2, 0):8.2f} {avg(a2, 1):8.3f} {avg(a2, 2):8.2f} "
            f"{avg(a4, 0):8.2f} {avg(a4, 1):8.3f} {avg(a4, 2):8.2f}",
            flush=True,
        )
    b2 = avg(acc["bilinear"][2], 0)
    b4 = avg(acc["bilinear"][4], 0)
    print("\nluma PSNR minus bilinear (negative means the net lost):", flush=True)
    for name, _, _ in MODELS:
        d2 = avg(acc[name][2], 0) - b2
        d4 = avg(acc[name][4], 0) - b4
        print(f"  {name:<12} 2x {d2:+.2f} dB   4x {d4:+.2f} dB", flush=True)


if __name__ == "__main__":
    main()

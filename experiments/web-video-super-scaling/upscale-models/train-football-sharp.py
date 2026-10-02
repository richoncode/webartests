#!/usr/bin/env python3
"""Train a line-focused luma ESPCN. Same webartests-sr-v1 arch as Football wide.

Slot "Sharp edges" on the Sharp lines tab. Architecture matches football-wide
so the comparison is the loss, not the capacity:

  1 -> 16 ReLU, 16 -> 16 ReLU, 16 -> 16 ReLU, 16 -> 4 linear, pixel-shuffle x2

Loss is MSE on the Y residual, multiplied per subpixel by an edge weight:
1 + 3 * (Sobel(HR luma) / mean Sobel), clipped, then rescaled to mean 1.
About 75% of crops are centered in blocks whose gradient energy is in the top
quartile of the training extract (yard lines, hash marks, digits). The other
25% use the same flat-rejected sampler as the wide net. Half the patches are
the two-scale pair (box-4 input, box-2 target) so the first hop of 4x is seen.

Data is /tmp/sr-data/train.rgb: 32 frames at 2 fps from stream t=40. The 6s
demo clip is stream t=1..7 and is not in that file. See sr_train_lib.py.

  python3 experiments/web-video-super-scaling/upscale-models/train-football-sharp.py

Writes football-sharp.json next to this file. SR_STEPS overrides the step count.
"""

from __future__ import annotations

import os

import numpy as np

from sr_train_lib import (
    HERE, TRAIN_RGB, build_edge_index, crop_metrics, edge_metrics, fit_weighted,
    load_clip_at, make_layers, open_rgb, reconstruct, sample_sharp_batch, write_model,
)

STEPS = int(os.environ.get("SR_STEPS", "2200"))
BATCH = 8
PATCH = 32
SEED = 23


def main():
    rng = np.random.default_rng(SEED)
    frames = open_rgb(TRAIN_RGB, 32)
    hot_idx, block = build_edge_index(frames)
    hold = load_clip_at(2.5)
    layers = make_layers([
        (1, 16, "relu"),
        (16, 16, "relu"),
        (16, 16, "relu"),
        (16, 4, "linear"),
    ], rng)

    def sanity(step):
        h, w, _ = hold.shape
        size = 192
        y0, x0 = (h - size) // 2, (w - size) // 2
        cur = hold[y0:y0 + size, x0:x0 + size]
        bp, pp, ps = crop_metrics(layers, "espcn-y", hold)
        pred = reconstruct(layers, "espcn-y", cur, scale=2)
        ep, gms, frac = edge_metrics(cur, pred)
        print(
            f"  holdout crop luma  bilinear {bp:.2f}  sharp {pp:.2f}  SSIM {ps:.3f}  "
            f"edge {ep:.2f} dB  GMS {gms:.3f}  mask {frac:.3f}",
            flush=True,
        )

    fit_weighted(
        layers,
        lambda: sample_sharp_batch(frames, rng, BATCH, PATCH, hot_idx, block, True),
        STEPS,
        sanity_fn=sanity,
        name="sharp",
    )
    write_model(
        HERE / "football-sharp.json",
        "Sharp edges",
        "espcn-y",
        layers,
        "Wide luma ESPCN (1-16-16-16-4) with Sobel-weighted residual loss and "
        "crops biased to high-gradient blocks. train-football-sharp.py, stream "
        f"t=40..56 at 2 fps, demo clip held out. Adam, {STEPS} steps, batch {BATCH}, "
        f"patch {PATCH}, two scales.",
        extra={
            "steps": STEPS,
            "trainedOn": "stream t=40..56 fps=2, demo clip held out",
            "loss": "sobel-weighted luma residual MSE, 75% high-gradient crops",
        },
    )


if __name__ == "__main__":
    main()

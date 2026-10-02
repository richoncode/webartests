#!/usr/bin/env python3
"""Continue the sharp luma net with a high-frequency term and a tiny patch GAN.

This is the "Sharp perceptual" slot. It starts from football-sharp.json (run
train-football-sharp.py first) and keeps training on the same held-out-safe
extract, with the same edge-weighted sampler.

No PyTorch is installed, and there is not enough free RAM for a Real-ESRGAN
or VGG teacher. The extra losses, all in numpy, are:

  * Laplacian match on the shuffled luma residual (high-frequency loss)
  * Sobel match on that same residual (gradient / edge loss)
  * a 4→8→8→1 convolutional patch discriminator on the residual, trained with
    softplus binary cross-entropy; the generator gets a small non-saturating
    term (weight 0.05)

The edge-weighted MSE term stays in the generator loss, so this is the sharp
model plus those extras, not a different architecture. The file format is
still webartests-sr-v1 espcn-y. The discriminator is not exported; the page
only runs the generator.

  python3 experiments/web-video-super-scaling/upscale-models/train-football-sharp-perc.py

Writes football-sharp-perc.json. SR_STEPS overrides the continuation length.
"""

from __future__ import annotations

import os

import numpy as np

from sr_train_lib import (
    HERE, TRAIN_RGB, build_edge_index, crop_metrics, edge_metrics, fit_perceptual,
    load_clip_at, load_model, open_rgb, reconstruct, sample_sharp_batch, write_model,
)

STEPS = int(os.environ.get("SR_STEPS", "1200"))
BATCH = 8
PATCH = 32
SEED = 29


def main():
    src = HERE / "football-sharp.json"
    if not src.is_file():
        raise SystemExit(f"missing {src}. Run train-football-sharp.py first.")
    _doc, layers = load_model(src)
    rng = np.random.default_rng(SEED)
    frames = open_rgb(TRAIN_RGB, 32)
    hot_idx, block = build_edge_index(frames)
    hold = load_clip_at(2.5)

    def sanity(step):
        h, w, _ = hold.shape
        size = 192
        y0, x0 = (h - size) // 2, (w - size) // 2
        cur = hold[y0:y0 + size, x0:x0 + size]
        bp, pp, ps = crop_metrics(layers, "espcn-y", hold)
        pred = reconstruct(layers, "espcn-y", cur, scale=2)
        ep, gms, frac = edge_metrics(cur, pred)
        print(
            f"  holdout crop luma  bilinear {bp:.2f}  perc {pp:.2f}  SSIM {ps:.3f}  "
            f"edge {ep:.2f} dB  GMS {gms:.3f}  mask {frac:.3f}",
            flush=True,
        )

    fit_perceptual(
        layers,
        lambda: sample_sharp_batch(frames, rng, BATCH, PATCH, hot_idx, block, True),
        STEPS,
        rng,
        sanity_fn=sanity,
        name="perc",
    )
    write_model(
        HERE / "football-sharp-perc.json",
        "Sharp perceptual",
        "espcn-y",
        layers,
        "football-sharp.json fine-tuned with Laplacian and Sobel matching plus a "
        "4-8-8-1 patch discriminator (softplus GAN, adv weight 0.05). "
        "No PyTorch, so no VGG/LPIPS and no Real-ESRGAN. "
        f"train-football-sharp-perc.py, {STEPS} extra Adam steps, same stream "
        "t=40..56 extract, demo clip held out.",
        extra={
            "steps": STEPS,
            "trainedOn": "stream t=40..56 fps=2, demo clip held out",
            "loss": "edge-weighted MSE + 0.25 Laplacian + 0.35 Sobel match + 0.05 patch GAN",
            "init": "football-sharp.json",
        },
    )


if __name__ == "__main__":
    main()

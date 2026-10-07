#!/usr/bin/env python3
"""Train a full-color ESPCN so chroma is upscaled with the luma.

Slot 3 of the Neural custom tab. Format webartests-sr-v1, arch espcn-rgb.
The page's luma nets leave Cb/Cr bilinear, which softens jersey colors and
painted lines. This net takes the box-downsampled RGB image and predicts an
RGB residual over bilinear:

  3 -> 12 ReLU, 12 -> 12 ReLU, 12 -> 12 linear
  12 channels are color-major: R's 4 subpixels, then G, then B

Data is /tmp/sr-data/train.rgb (stream t=40..56, demo clip held out).
See sr_train_lib.py for the ffmpeg line. The page metric is still luma;
RGB PSNR is reported by eval-heldout.py and is the number that can show
the chroma change.

  python3 experiments/web-video-super-scaling/upscale-models/train-football-rgb.py

Writes football-rgb.json. SR_STEPS overrides the step count.
"""

from __future__ import annotations

import os

import numpy as np

from sr_train_lib import (
    HERE, TRAIN_RGB, crop_metrics, fit, load_clip_at, make_layers,
    open_rgb, rgb_psnr, sample_rgb_batch, reconstruct, bilinear_u8, write_model,
)

STEPS = int(os.environ.get("SR_STEPS", "1800"))
BATCH = 8
PATCH = 32
SEED = 13


def main():
    rng = np.random.default_rng(SEED)
    frames = open_rgb(TRAIN_RGB, 32)
    hold = load_clip_at(2.5)
    layers = make_layers([
        (3, 12, "relu"),
        (12, 12, "relu"),
        (12, 12, "linear"),
    ], rng)

    def sanity(step):
        bp, pp, ps = crop_metrics(layers, "espcn-rgb", hold)
        h, w, _ = hold.shape
        y0, x0 = (h - 192) // 2, (w - 192) // 2
        crop = hold[y0:y0 + 192, x0:x0 + 192]
        pred = reconstruct(layers, "espcn-rgb", crop, scale=2)
        base = bilinear_u8(crop, 2)
        print(
            f"  holdout crop luma bilinear {bp:.2f} rgb-net {pp:.2f} SSIM {ps:.3f}  "
            f"RGB PSNR bilinear {rgb_psnr(crop, base):.2f} net {rgb_psnr(crop, pred):.2f}",
            flush=True,
        )

    fit(
        layers,
        lambda: sample_rgb_batch(frames, rng, BATCH, PATCH, True),
        STEPS,
        sanity_fn=sanity,
        name="rgb",
    )
    write_model(
        HERE / "football-rgb.json",
        "Football RGB",
        "espcn-rgb",
        layers,
        "Full-color ESPCN (3-12-12-12). Residual is added per RGB channel to bilinear. "
        "Trained by train-football-rgb.py on stream t=40..56 at 2 fps, demo clip held out. "
        f"Adam, {STEPS} steps, batch {BATCH}, patch {PATCH}.",
        extra={"steps": STEPS, "trainedOn": "stream t=40..56 fps=2, demo clip held out"},
    )


if __name__ == "__main__":
    main()

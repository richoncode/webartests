#!/usr/bin/env python3
"""Train a wider, deeper luma ESPCN on football frames the demo clip never saw.

Slot 2 of the Neural custom tab. Same webartests-sr-v1 arch as the tiny net
(espcn-y, scale 2, Y residual over bilinear) with more channels and more steps.

  1 -> 16 ReLU, 16 -> 16 ReLU, 16 -> 16 ReLU, 16 -> 4 linear, pixel-shuffle x2

Data is /tmp/sr-data/train.rgb: 32 frames at 2 fps from the red/green broadcast
starting at stream t=40 (the 6s demo clip is stream t=1..7 and is held out).
How to build that file is in sr_train_lib.py. About half the patches are a
second scale (box-4 input, box-2 target) so the x2 net also sees the first hop
of the page's 4x path, which runs the same net twice.

  python3 experiments/web-video-super-scaling/upscale-models/train-football-wide.py

Writes football-wide.json next to this file. Needs numpy and ffmpeg.
SR_STEPS overrides the step count.
"""

from __future__ import annotations

import os

import numpy as np

from sr_train_lib import (
    HERE, TRAIN_RGB, crop_metrics, fit, load_clip_at, make_layers,
    open_rgb, sample_y_batch, write_model,
)

STEPS = int(os.environ.get("SR_STEPS", "2200"))
BATCH = 8
PATCH = 32
SEED = 11


def main():
    rng = np.random.default_rng(SEED)
    frames = open_rgb(TRAIN_RGB, 32)
    hold = load_clip_at(2.5)
    prev = load_clip_at(2.5 - 1.0 / 30.0)
    layers = make_layers([
        (1, 16, "relu"),
        (16, 16, "relu"),
        (16, 16, "relu"),
        (16, 4, "linear"),
    ], rng)

    def sanity(step):
        bp, pp, ps = crop_metrics(layers, "espcn-y", hold, prev)
        print(f"  holdout crop luma  bilinear {bp:.2f}  wide {pp:.2f}  SSIM {ps:.3f}", flush=True)

    fit(
        layers,
        lambda: sample_y_batch(frames, rng, BATCH, PATCH, True),
        STEPS,
        sanity_fn=sanity,
        name="wide",
    )
    write_model(
        HERE / "football-wide.json",
        "Football wide",
        "espcn-y",
        layers,
        "Wider luma ESPCN (1-16-16-16-4). Trained by train-football-wide.py on "
        "stream t=40..56 at 2 fps, demo clip held out. Y residual over bilinear. "
        f"Adam, {STEPS} steps, batch {BATCH}, patch {PATCH}, two scales.",
        extra={"steps": STEPS, "trainedOn": "stream t=40..56 fps=2, demo clip held out"},
    )


if __name__ == "__main__":
    main()

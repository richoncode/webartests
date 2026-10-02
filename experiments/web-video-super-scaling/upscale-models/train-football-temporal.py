#!/usr/bin/env python3
"""Train a two-frame luma ESPCN. No optical-flow warp.

Slot 4 of the Neural custom tab. Format webartests-sr-v1, arch espcn-y2,
frames 2. Input channel 0 is the current frame's luma, channel 1 is the
previous frame's luma, both after the page's box downsample. The residual
is added to the current frame's bilinear luma. The compare page keeps the
previous low-res frame (and, at 4x, the previous mid-res pass) and binds
it on the next frame. A repeated timestamp does not rotate that buffer.

  2 -> 12 ReLU, 12 -> 12 ReLU, 12 -> 4 linear, pixel-shuffle x2

Data is /tmp/sr-data/temporal.rgb: 80 frames at 20 fps from stream t=90
for 4 seconds (well after the demo clip at t=1..7, and after the 2 fps
extract at t=40). See sr_train_lib.py for the ffmpeg line. Pairs are
consecutive 20 fps frames, about 50 ms apart, which is the gap this net
is meant to see during playback. The loss is the current-frame residual
MSE, half-weight on the previous frame, plus a temporal-difference term
so the previous channel is not ignored.

  python3 experiments/web-video-super-scaling/upscale-models/train-football-temporal.py

Writes football-temporal.json. SR_STEPS overrides the step count.
"""

from __future__ import annotations

import os

import numpy as np

from sr_train_lib import (
    HERE, TEMPORAL_RGB, crop_metrics, fit_temporal, load_clip_at,
    make_layers, open_rgb, write_model,
)

STEPS = int(os.environ.get("SR_STEPS", "1800"))
BATCH = 6
PATCH = 32
SEED = 17


def main():
    rng = np.random.default_rng(SEED)
    frames = open_rgb(TEMPORAL_RGB, 80)
    hold = load_clip_at(2.5)
    prev = load_clip_at(2.5 - 1.0 / 30.0)
    layers = make_layers([
        (2, 12, "relu"),
        (12, 12, "relu"),
        (12, 4, "linear"),
    ], rng)

    def sanity(step):
        bp, pp, ps = crop_metrics(layers, "espcn-y2", hold, prev)
        print(f"  holdout crop luma  bilinear {bp:.2f}  temporal {pp:.2f}  SSIM {ps:.3f}", flush=True)

    fit_temporal(layers, frames, STEPS, BATCH, PATCH, rng, sanity_fn=sanity, name="temporal")
    write_model(
        HERE / "football-temporal.json",
        "Football temporal",
        "espcn-y2",
        layers,
        "Two-frame luma ESPCN, no warp. Channel 0 is current Y, channel 1 is previous Y. "
        "Trained by train-football-temporal.py on stream t=90..94 at 20 fps, demo clip held out. "
        f"Adam, {STEPS} steps, batch {BATCH}, patch {PATCH}.",
        extra={"steps": STEPS, "trainedOn": "stream t=90..94 fps=20, demo clip held out"},
    )


if __name__ == "__main__":
    main()

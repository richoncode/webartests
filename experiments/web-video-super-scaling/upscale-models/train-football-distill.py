#!/usr/bin/env python3
"""Distill a tiny luma student from Anime4K CNN-M on football frames.

Slot 5 of the Neural custom tab. The student is a smaller espcn-y net than
slot 1:

  1 -> 8 ReLU, 8 -> 4 linear, pixel-shuffle x2, Y residual over bilinear

The teacher is the published Anime4K CNN-M already shipped in
upscale-models/anime4k-m.json (MIT, bloc97), run in NumPy. Real-ESRGAN was
the other candidate and was not used: this VM has no PyTorch, and a CPU
wheel plus the Real-ESRGAN weights does not fit the free RAM. CNN-M is a
real published SR model, it already runs in the Neural tab, and
verify_teacher() prints its luma PSNR against bilinear on a held-out crop
before training starts. If that port loses to bilinear, the script stops.

The student is trained to match the teacher's 4-channel luma residual, not
the ground-truth pixels. eval-heldout.py still scores the student against
the ground truth. If it loses to bilinear there, that is the result.

Data is /tmp/sr-data/train.rgb (stream t=40..56, demo clip held out).
See sr_train_lib.py for the ffmpeg line.

  python3 experiments/web-video-super-scaling/upscale-models/train-football-distill.py

Writes football-distill.json. SR_STEPS overrides the step count.
"""

from __future__ import annotations

import os

import numpy as np

from sr_train_lib import (
    HERE, TRAIN_RGB, Anime4KM, crop_metrics, down_quant, fit, load_clip_at,
    luma, make_layers, open_rgb, verify_teacher, write_model,
)

STEPS = int(os.environ.get("SR_STEPS", "1600"))
BATCH = 8
PATCH = 32
SEED = 19


def precompute(teacher, frames):
    n = frames.shape[0]
    pack = []
    for scale, lh, lw in ((2, 540, 960), (4, 270, 480)):
        feat = np.empty((n, lh, lw, 4), np.float16)
        yy = np.empty((n, lh, lw), np.float16)
        for i in range(n):
            lr = down_quant(frames[i], scale)
            f = teacher.features(lr)
            feat[i] = f.astype(np.float16)
            yy[i] = luma(lr).astype(np.float16)
            print(f"  teacher scale {scale} frame {i + 1}/{n}", flush=True)
        pack.append((feat, yy))
    return pack


def main():
    rng = np.random.default_rng(SEED)
    teacher = Anime4KM()
    bp, pp = verify_teacher(teacher)
    if pp + 0.3 < bp:
        raise SystemExit(
            f"Anime4K CNN-M port lost to bilinear ({pp:.2f} vs {bp:.2f}). "
            "Refusing to distill a broken teacher."
        )
    frames = open_rgb(TRAIN_RGB, 32)
    print("precomputing CNN-M residuals on the training frames", flush=True)
    pack = precompute(teacher, frames)
    hold = load_clip_at(2.5)
    layers = make_layers([(1, 8, "relu"), (8, 4, "linear")], rng)
    lr_p = PATCH // 2

    def sample():
        xs = np.empty((BATCH, 1, lr_p, lr_p), np.float32)
        ys = np.empty((BATCH, 4, lr_p, lr_p), np.float32)
        for i in range(BATCH):
            feat, yy = pack[0 if rng.random() < 0.5 else 1]
            fi = int(rng.integers(0, feat.shape[0]))
            y0 = int(rng.integers(0, feat.shape[1] - lr_p))
            x0 = int(rng.integers(0, feat.shape[2] - lr_p))
            # No spatial flip: the 4 channels are even/odd subpixels, so a flip
            # would swap channels. The broadcast already has plenty of patches.
            xs[i, 0] = np.array(yy[fi, y0:y0 + lr_p, x0:x0 + lr_p], dtype=np.float32)
            patch_f = np.array(feat[fi, y0:y0 + lr_p, x0:x0 + lr_p], dtype=np.float32)
            ys[i] = np.transpose(patch_f, (2, 0, 1))
        return xs, ys

    def sanity(step):
        bp2, pp2, ps = crop_metrics(layers, "espcn-y", hold)
        print(f"  holdout crop luma  bilinear {bp2:.2f}  student {pp2:.2f}  SSIM {ps:.3f}", flush=True)

    fit(layers, sample, STEPS, sanity_fn=sanity, name="distill")
    write_model(
        HERE / "football-distill.json",
        "Football distill",
        "espcn-y",
        layers,
        "Tiny student (1-8-4) distilled from Anime4K CNN-M, not Real-ESRGAN. "
        "CNN-M is the published MIT net in anime4k-m.json; Real-ESRGAN was not run "
        "(no PyTorch, tight RAM). Trained by train-football-distill.py to match the "
        "teacher's luma residual on stream t=40..56, demo clip held out. "
        f"Adam, {STEPS} steps, batch {BATCH}, patch {PATCH}. "
        f"Teacher crop check before training: bilinear {bp:.2f} dB, CNN-M {pp:.2f} dB.",
        extra={
            "steps": STEPS,
            "teacher": "Anime4K CNN-M (anime4k-m.json), substituted for Real-ESRGAN",
            "trainedOn": "stream t=40..56 fps=2, demo clip held out",
        },
    )


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Train a tiny ESPCN-style x2 net on frames from the football clip.

The compare page's "Neural custom" tab loads the JSON this script writes.
It is a real trained model, not a relabel of Anime4K or a classical filter.

Architecture (format "webartests-sr-v1", arch "espcn-y", scale 2):
  input  : luma Y in [0, 1], one channel
  conv 3x3, 1 -> 8, ReLU
  conv 3x3, 8 -> 8, ReLU
  conv 3x3, 8 -> 4, linear
  pixel-shuffle x2, added to bilinear-upsampled Y
  chroma stays bilinear at inference (the page does that; this script trains Y only)

Weights are row-major [out][in][ky][kx], then bias[out], as plain JSON numbers.

Run from anywhere:

  python3 experiments/web-video-super-scaling/upscale-models/train-football-sr.py

Needs ffmpeg and numpy. Reads ../testdata/red-green-top-eye.mp4 and overwrites
football-espcn.json next to this file. Training is short on purpose: a few
hundred Adam steps on 32x32 patches, so the file can be regenerated quickly.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
CLIP = HERE.parent / "testdata" / "red-green-top-eye.mp4"
OUT = HERE / "football-espcn.json"

FRAMES = 8
PATCH = 32
BATCH = 16
STEPS = 400
LR = 1e-3
SEED = 7


def load_frames():
    if not CLIP.is_file():
        sys.exit(f"missing clip: {CLIP}")
    cmd = [
        "ffmpeg", "-v", "error", "-i", str(CLIP),
        "-vf", "fps=1", "-frames:v", str(FRAMES),
        "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
    ]
    raw = subprocess.check_output(cmd)
    frame_bytes = 1920 * 1080 * 3
    n = len(raw) // frame_bytes
    if n < 2:
        sys.exit(f"ffmpeg returned {n} frames from {CLIP}")
    rgb = np.frombuffer(raw[: n * frame_bytes], dtype=np.uint8).reshape(n, 1080, 1920, 3)
    rgb = rgb.astype(np.float32) / 255.0
    y = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    return y


def box_down(y):
    h, w = y.shape
    return y.reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3))


def bilinear_up(lr):
    # Aligns with the page: sample at (out + 0.5) / scale - 0.5 in input pixels.
    h, w = lr.shape
    ys = (np.arange(h * 2, dtype=np.float32) + 0.5) * 0.5 - 0.5
    xs = (np.arange(w * 2, dtype=np.float32) + 0.5) * 0.5 - 0.5
    y0 = np.floor(ys).astype(np.int32)
    x0 = np.floor(xs).astype(np.int32)
    fy = (ys - y0).astype(np.float32)
    fx = (xs - x0).astype(np.float32)
    y0 = np.clip(y0, 0, h - 1)
    x0 = np.clip(x0, 0, w - 1)
    y1 = np.clip(y0 + 1, 0, h - 1)
    x1 = np.clip(x0 + 1, 0, w - 1)
    top = lr[y0][:, x0] * (1 - fx) + lr[y0][:, x1] * fx
    bot = lr[y1][:, x0] * (1 - fx) + lr[y1][:, x1] * fx
    return top * (1 - fy)[:, None] + bot * fy[:, None]


def sample_batch(frames, rng):
    n, h, w = frames.shape
    lr_p = PATCH // 2
    xs = np.empty((BATCH, 1, lr_p, lr_p), np.float32)
    ys = np.empty((BATCH, 4, lr_p, lr_p), np.float32)
    for i in range(BATCH):
        # Prefer patches with some contrast so the net sees edges, not only turf.
        for _try in range(8):
            fi = int(rng.integers(0, n))
            y0 = int(rng.integers(0, h - PATCH))
            x0 = int(rng.integers(0, w - PATCH))
            hr = frames[fi, y0:y0 + PATCH, x0:x0 + PATCH]
            if hr.std() > 0.02 or _try == 7:
                break
        lr = box_down(hr)
        base = bilinear_up(lr)
        residual = hr - base
        # pixel-unshuffle into 4 channels at LR resolution
        ch = np.stack([
            residual[0::2, 0::2],
            residual[0::2, 1::2],
            residual[1::2, 0::2],
            residual[1::2, 1::2],
        ], axis=0)
        xs[i, 0] = lr
        ys[i] = ch
    return xs, ys


def conv_forward(x, weight, bias):
    # x: N,C,H,W  weight: O,C,3,3
    n, c, h, w = x.shape
    o = weight.shape[0]
    xp = np.pad(x, ((0, 0), (0, 0), (1, 1), (1, 1)))
    cols = np.empty((n, c * 9, h * w), np.float32)
    k = 0
    for ky in range(3):
        for kx in range(3):
            patch = xp[:, :, ky:ky + h, kx:kx + w]
            cols[:, k * c:(k + 1) * c, :] = patch.reshape(n, c, h * w)
            k += 1
    # weight column order must match ky,kx major then input channel
    wcol = weight.reshape(o, c, 9).transpose(0, 2, 1).reshape(o, c * 9)
    out = np.einsum("oc,ncp->nop", wcol, cols, optimize=True)
    out = out.reshape(n, o, h, w) + bias.reshape(1, o, 1, 1)
    return out, cols, wcol


def conv_backward(dy, x, weight, cols):
    n, c, h, w = x.shape
    o = weight.shape[0]
    dy_flat = dy.reshape(n, o, h * w)
    wcol = weight.reshape(o, c, 9).transpose(0, 2, 1).reshape(o, c * 9)
    dw_col = np.einsum("nop,ncp->oc", dy_flat, cols)
    dx_cols = np.einsum("oc,nop->ncp", wcol, dy_flat)
    dw = dw_col.reshape(o, 9, c).transpose(0, 2, 1).reshape(o, c, 3, 3)
    db = dy_flat.sum(axis=(0, 2))
    dx = np.zeros_like(x)
    xp_h, xp_w = h + 2, w + 2
    dxp = np.zeros((n, c, xp_h, xp_w), np.float32)
    k = 0
    for ky in range(3):
        for kx in range(3):
            part = dx_cols[:, k * c:(k + 1) * c, :].reshape(n, c, h, w)
            dxp[:, :, ky:ky + h, kx:kx + w] += part
            k += 1
    dx[:] = dxp[:, :, 1:-1, 1:-1]
    return dx, dw, db


def he(rng, out_c, in_c):
    scale = np.sqrt(2.0 / (in_c * 9))
    return rng.normal(0, scale, size=(out_c, in_c, 3, 3)).astype(np.float32)


def psnr(mse):
    if mse <= 1e-12:
        return 99.0
    return float(10.0 * np.log10(1.0 / mse))


def main():
    rng = np.random.default_rng(SEED)
    frames = load_frames()
    print(f"frames {frames.shape[0]} luma mean {frames.mean():.3f} std {frames.std():.3f}")
    hold = frames[-1]
    train = frames[:-1]

    layers = [
        {"w": he(rng, 8, 1), "b": np.zeros(8, np.float32), "act": "relu"},
        {"w": he(rng, 8, 8), "b": np.zeros(8, np.float32), "act": "relu"},
        {"w": he(rng, 4, 8) * 0.1, "b": np.zeros(4, np.float32), "act": "linear"},
    ]
    mom = [{"mw": np.zeros_like(L["w"]), "mb": np.zeros_like(L["b"]),
            "vw": np.zeros_like(L["w"]), "vb": np.zeros_like(L["b"])} for L in layers]
    b1, b2, eps = 0.9, 0.999, 1e-8

    def forward(x):
        acts = [x]
        caches = []
        h = x
        for layer in layers:
            z, cols, _wcol = conv_forward(h, layer["w"], layer["b"])
            if layer["act"] == "relu":
                y = np.maximum(z, 0)
            else:
                y = z
            caches.append((h, cols, z))
            acts.append(y)
            h = y
        return h, caches

    def loss_on(x, target):
        pred, _ = forward(x)
        err = pred - target
        return float(np.mean(err * err))

    x0, y0 = sample_batch(train, rng)
    print(f"start mse {loss_on(x0, y0):.6f}")

    for step in range(1, STEPS + 1):
        x, target = sample_batch(train, rng)
        pred, caches = forward(x)
        err = pred - target
        loss = float(np.mean(err * err))
        dy = (2.0 / err.size) * err
        grads = []
        for layer, (hin, cols, z) in zip(reversed(layers), reversed(caches)):
            if layer["act"] == "relu":
                dy = dy * (z > 0)
            dx, dw, db = conv_backward(dy, hin, layer["w"], cols)
            grads.append((dw, db))
            dy = dx
        grads.reverse()
        for i, ((dw, db), layer, m) in enumerate(zip(grads, layers, mom)):
            m["mw"] = b1 * m["mw"] + (1 - b1) * dw
            m["mb"] = b1 * m["mb"] + (1 - b1) * db
            m["vw"] = b2 * m["vw"] + (1 - b2) * (dw * dw)
            m["vb"] = b2 * m["vb"] + (1 - b2) * (db * db)
            mw = m["mw"] / (1 - b1 ** step)
            mb = m["mb"] / (1 - b1 ** step)
            vw = m["vw"] / (1 - b2 ** step)
            vb = m["vb"] / (1 - b2 ** step)
            layer["w"] -= LR * mw / (np.sqrt(vw) + eps)
            layer["b"] -= LR * mb / (np.sqrt(vb) + eps)
        if step == 1 or step % 50 == 0 or step == STEPS:
            print(f"step {step:4d}  mse {loss:.6f}")

    # Held-out frame, central 256x256, compare residual model to bilinear.
    y0, x0 = (1080 - 256) // 2, (1920 - 256) // 2
    hr = hold[y0:y0 + 256, x0:x0 + 256]
    lr = box_down(hr)
    base = bilinear_up(lr)
    pred, _ = forward(lr[None, None, ...])
    rec = pred[0]
    shuf = np.zeros_like(hr)
    shuf[0::2, 0::2] = rec[0]
    shuf[0::2, 1::2] = rec[1]
    shuf[1::2, 0::2] = rec[2]
    shuf[1::2, 1::2] = rec[3]
    out = np.clip(base + shuf, 0, 1)
    mse_b = float(np.mean((base - hr) ** 2))
    mse_n = float(np.mean((out - hr) ** 2))
    print(f"holdout bilinear PSNR {psnr(mse_b):.2f} dB   net PSNR {psnr(mse_n):.2f} dB")

    spec_layers = []
    for layer in layers:
        spec_layers.append({
            "k": 3,
            "in": int(layer["w"].shape[1]),
            "out": int(layer["w"].shape[0]),
            "activation": layer["act"],
            "weight": layer["w"].reshape(-1).astype(float).tolist(),
            "bias": layer["b"].astype(float).tolist(),
        })
    doc = {
        "format": "webartests-sr-v1",
        "name": "Football ESPCN-tiny",
        "arch": "espcn-y",
        "scale": 2,
        "residual": True,
        "colorspace": "bt709-y",
        "trainedOn": "testdata/red-green-top-eye.mp4",
        "steps": STEPS,
        "note": "Y residual over bilinear. Chroma is bilinear in the compare page. Trained by upscale-models/train-football-sr.py.",
        "layers": spec_layers,
    }
    OUT.write_text(json.dumps(doc))
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

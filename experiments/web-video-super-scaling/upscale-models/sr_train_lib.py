"""Shared trainer for webartests-sr-v1 football super-resolution nets.

The compare page loads JSON written by the train-football-*.py scripts.
Format "webartests-sr-v1" (backward compatible with the original espcn-y file):

  arch "espcn-y"   1 luma in,  4 outs, pixel-shuffle x2, Y residual on bilinear
  arch "espcn-rgb" 3 RGB in,  12 outs (color-major groups of 4 subpixels)
  arch "espcn-y2"  2 luma in (current, previous), 4 outs, Y residual, no warp

Weights are row-major [out][in][ky][kx] then bias[out]. 3x3 only.
Optional fields "frames" (1 or 2) and "colorspace" are informational.
Existing espcn-y files that omit them still load.

Training frames must NOT come from the 6s demo clip. That clip is
stream time t=1..7 of:

  https://streams.quintar.ai/kyle/20251207-red-green/8Mbps/index.m3u8

Spatial nets use a 2 fps extract starting at t=40. The temporal net uses
a 20 fps extract starting at t=90. Both are top-eye 1920x1080:

  ffmpeg -y -ss 40 -t 16 -i <m3u8> \\
    -vf "crop=3840:2160:0:0,scale=1920:1080:flags=lanczos,fps=2" \\
    -f rawvideo -pix_fmt rgb24 /tmp/sr-data/train.rgb

  ffmpeg -y -ss 90 -t 4 -i <m3u8> \\
    -vf "crop=3840:2160:0:0,scale=1920:1080:flags=lanczos,fps=20" \\
    -f rawvideo -pix_fmt rgb24 /tmp/sr-data/temporal.rgb

Needs ffmpeg and numpy. No PyTorch.
"""

from __future__ import annotations

import base64
import json
import subprocess
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
CLIP = HERE.parent / "testdata" / "red-green-top-eye.mp4"
STREAM = "https://streams.quintar.ai/kyle/20251207-red-green/8Mbps/index.m3u8"
TRAIN_RGB = Path("/tmp/sr-data/train.rgb")
TEMPORAL_RGB = Path("/tmp/sr-data/temporal.rgb")

LUMA = (0.2126, 0.7152, 0.0722)
TAPS = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]


def open_rgb(path, n, h=1080, w=1920):
    path = Path(path)
    need = n * h * w * 3
    if not path.is_file():
        raise SystemExit(
            f"missing {path} ({n} frames of {w}x{h} rgb24).\n"
            f"Extract from {STREAM} with -ss at least 40 "
            "(the demo clip occupies stream t=1..7). See this file's docstring."
        )
    size = path.stat().st_size
    if size < need:
        raise SystemExit(f"{path} is {size} bytes, need at least {need} for {n} frames")
    return np.memmap(path, dtype=np.uint8, mode="r", shape=(n, h, w, 3))


def load_clip_at(t, path=None):
    """One 1920x1080 RGB frame from the held-out demo clip, at time t seconds."""
    path = Path(path or CLIP)
    if not path.is_file():
        raise SystemExit(f"missing clip: {path}")
    cmd = [
        "ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path),
        "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
    ]
    raw = subprocess.check_output(cmd)
    frame_bytes = 1920 * 1080 * 3
    if len(raw) < frame_bytes:
        raise SystemExit(f"ffmpeg returned {len(raw)} bytes at t={t} from {path}")
    return np.frombuffer(raw[:frame_bytes], dtype=np.uint8).reshape(1080, 1920, 3).copy()


def luma(rgb):
    return rgb[..., 0] * LUMA[0] + rgb[..., 1] * LUMA[1] + rgb[..., 2] * LUMA[2]


def box_mean(img, scale):
    img = np.ascontiguousarray(img)
    h, w = img.shape[:2]
    rh, rw = h // scale, w // scale
    img = img[: rh * scale, : rw * scale]
    if img.ndim == 2:
        return img.reshape(rh, scale, rw, scale).mean(axis=(1, 3)).astype(np.float32)
    c = img.shape[2]
    return img.reshape(rh, scale, rw, scale, c).mean(axis=(1, 3)).astype(np.float32)


def quant01(img):
    return np.clip(np.rint(np.clip(img, 0, 1) * 255.0), 0, 255).astype(np.float32) / np.float32(255.0)


def to_u8(img01):
    return np.clip(np.rint(np.clip(img01, 0, 1) * 255.0), 0, 255).astype(np.uint8)


def as_f32(frame_u8):
    return frame_u8.astype(np.float32) * np.float32(1.0 / 255.0)


def down_quant(frame_u8, scale):
    return quant01(box_mean(as_f32(frame_u8), scale))


def bilinear_up(lr, scale=2):
    """Matches the page: p = ((out + 0.5) / scale) - 0.5, clamp-to-edge."""
    single = lr.ndim == 2
    if single:
        lr = lr[..., None]
    lr = np.ascontiguousarray(lr, dtype=np.float32)
    h, w, _c = lr.shape
    oh, ow = h * scale, w * scale
    ys = (np.arange(oh, dtype=np.float32) + 0.5) * (h / float(oh)) - 0.5
    xs = (np.arange(ow, dtype=np.float32) + 0.5) * (w / float(ow)) - 0.5
    y0 = np.floor(ys).astype(np.int32)
    x0 = np.floor(xs).astype(np.int32)
    fy = (ys - y0).astype(np.float32)
    fx = (xs - x0).astype(np.float32)
    y0c = np.clip(y0, 0, h - 1)
    x0c = np.clip(x0, 0, w - 1)
    y1c = np.clip(y0 + 1, 0, h - 1)
    x1c = np.clip(x0 + 1, 0, w - 1)
    top = lr[y0c][:, x0c] * (1 - fx)[None, :, None] + lr[y0c][:, x1c] * fx[None, :, None]
    bot = lr[y1c][:, x0c] * (1 - fx)[None, :, None] + lr[y1c][:, x1c] * fx[None, :, None]
    out = top * (1 - fy)[:, None, None] + bot * fy[:, None, None]
    return out[..., 0] if single else out.astype(np.float32)


def unshuffle(residual):
    if residual.ndim == 2:
        return np.stack([
            residual[0::2, 0::2],
            residual[0::2, 1::2],
            residual[1::2, 0::2],
            residual[1::2, 1::2],
        ], axis=0).astype(np.float32)
    chans = []
    for c in range(residual.shape[2]):
        r = residual[..., c]
        chans.extend([r[0::2, 0::2], r[0::2, 1::2], r[1::2, 0::2], r[1::2, 1::2]])
    return np.stack(chans, axis=0).astype(np.float32)


def shuffle_pred(pred, colors):
    _c, h, w = pred.shape
    out = np.zeros((h * 2, w * 2, colors), np.float32)
    for c in range(colors):
        base = c * 4
        plane = out[..., c]
        plane[0::2, 0::2] = pred[base]
        plane[0::2, 1::2] = pred[base + 1]
        plane[1::2, 0::2] = pred[base + 2]
        plane[1::2, 1::2] = pred[base + 3]
    return out[..., 0] if colors == 1 else out


def y_to_rgb(base_rgb, y2):
    y = luma(base_rgb)
    cb = (base_rgb[..., 2] - y) / np.float32(1.8556)
    cr = (base_rgb[..., 0] - y) / np.float32(1.5748)
    r = y2 + np.float32(1.5748) * cr
    g = y2 - np.float32(0.187324) * cb - np.float32(0.468124) * cr
    b = y2 + np.float32(1.8556) * cb
    return np.clip(np.stack([r, g, b], axis=-1), 0, 1).astype(np.float32)


def conv_forward(x, weight, bias):
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
    wcol = weight.reshape(o, c, 9).transpose(0, 2, 1).reshape(o, c * 9)
    out = np.einsum("oc,ncp->nop", wcol, cols, optimize=True)
    out = out.reshape(n, o, h, w) + bias.reshape(1, o, 1, 1)
    return out, cols


def conv_backward(dy, x, weight, cols):
    n, c, h, w = x.shape
    o = weight.shape[0]
    dy_flat = dy.reshape(n, o, h * w)
    wcol = weight.reshape(o, c, 9).transpose(0, 2, 1).reshape(o, c * 9)
    dw_col = np.einsum("nop,ncp->oc", dy_flat, cols)
    dx_cols = np.einsum("oc,nop->ncp", wcol, dy_flat)
    dw = dw_col.reshape(o, 9, c).transpose(0, 2, 1).reshape(o, c, 3, 3)
    db = dy_flat.sum(axis=(0, 2))
    dxp = np.zeros((n, c, h + 2, w + 2), np.float32)
    k = 0
    for ky in range(3):
        for kx in range(3):
            part = dx_cols[:, k * c:(k + 1) * c, :].reshape(n, c, h, w)
            dxp[:, :, ky:ky + h, kx:kx + w] += part
            k += 1
    return dxp[:, :, 1:-1, 1:-1], dw, db


def he(rng, out_c, in_c):
    scale = np.sqrt(2.0 / (in_c * 9))
    return rng.normal(0, scale, size=(out_c, in_c, 3, 3)).astype(np.float32)


def make_layers(spec, rng):
    """spec is a list of (in_ch, out_ch, activation)."""
    layers = []
    for i, (inn, out, act) in enumerate(spec):
        w = he(rng, out, inn)
        if act == "linear":
            w = w * np.float32(0.1)
        layers.append({"w": w, "b": np.zeros(out, np.float32), "act": act})
    return layers


def zero_mom(layers):
    return [{"mw": np.zeros_like(L["w"]), "mb": np.zeros_like(L["b"]),
             "vw": np.zeros_like(L["w"]), "vb": np.zeros_like(L["b"])} for L in layers]


def forward(layers, x):
    caches = []
    h = x
    for layer in layers:
        z, cols = conv_forward(h, layer["w"], layer["b"])
        y = np.maximum(z, 0) if layer["act"] == "relu" else z
        caches.append((h, cols, z))
        h = y
    return h, caches


def backward(layers, caches, dy):
    grads = []
    for layer, (hin, cols, z) in zip(reversed(layers), reversed(caches)):
        if layer["act"] == "relu":
            dy = dy * (z > 0)
        dx, dw, db = conv_backward(dy, hin, layer["w"], cols)
        grads.append((dw.astype(np.float32), db.astype(np.float32)))
        dy = dx
    grads.reverse()
    return grads


def adam(layers, grads, mom, step, lr, b1=0.9, b2=0.999, eps=1e-8):
    for (dw, db), layer, m in zip(grads, layers, mom):
        m["mw"] = b1 * m["mw"] + (1 - b1) * dw
        m["mb"] = b1 * m["mb"] + (1 - b1) * db
        m["vw"] = b2 * m["vw"] + (1 - b2) * (dw * dw)
        m["vb"] = b2 * m["vb"] + (1 - b2) * (db * db)
        mw = m["mw"] / (1 - b1 ** step)
        mb = m["mb"] / (1 - b1 ** step)
        vw = m["vw"] / (1 - b2 ** step)
        vb = m["vb"] / (1 - b2 ** step)
        layer["w"] -= np.float32(lr) * mw / (np.sqrt(vw) + eps)
        layer["b"] -= np.float32(lr) * mb / (np.sqrt(vb) + eps)


def lr_at(step, total, base=1e-3):
    if step < 40:
        return base * step / 40.0
    if step > int(total * 0.75):
        return base * 0.25
    return base


def macs(layers):
    return int(sum(int(np.prod(L["w"].shape)) for L in layers))


def fit(layers, sample_fn, steps, sanity_fn=None, sanity_every=400, name="net"):
    mom = zero_mom(layers)
    t0 = time.time()
    last = 0.0
    for step in range(1, steps + 1):
        x, target = sample_fn()
        pred, caches = forward(layers, x)
        err = pred - target
        last = float(np.mean(err * err))
        dy = (np.float32(2.0) / np.float32(err.size)) * err
        grads = backward(layers, caches, dy)
        del caches, pred, err
        adam(layers, grads, mom, step, lr_at(step, steps))
        if step == 1 or step % 100 == 0 or step == steps:
            dt = time.time() - t0
            print(f"{name} step {step:4d}/{steps}  mse {last:.6f}  {dt:.0f}s", flush=True)
        if sanity_fn and (step % sanity_every == 0 or step == steps):
            sanity_fn(step)
    return last


def page_metrics(ref_u8, test_u8):
    """Luma PSNR / SSIM matching the compare page (8x8 boxes, C1/C2, 0-255)."""
    a = luma(ref_u8.astype(np.float32))
    b = luma(test_u8.astype(np.float32))
    h, w = a.shape
    bh, bw = h // 8, w // 8
    a = a[: bh * 8, : bw * 8]
    b = b[: bh * 8, : bw * 8]
    diff = a - b
    sse = float(np.sum(diff * diff))
    n = diff.size
    psnr = float(10.0 * np.log10((255.0 ** 2) * n / max(sse, 1e-12)))
    ar = a.reshape(bh, 8, bw, 8).transpose(0, 2, 1, 3).reshape(bh, bw, -1)
    br = b.reshape(bh, 8, bw, 8).transpose(0, 2, 1, 3).reshape(bh, bw, -1)
    mx = ar.mean(-1)
    my = br.mean(-1)
    vx = np.maximum((ar * ar).mean(-1) - mx * mx, 0)
    vy = np.maximum((br * br).mean(-1) - my * my, 0)
    cov = (ar * br).mean(-1) - mx * my
    c1, c2 = 6.5025, 58.5225
    ssim = ((2 * mx * my + c1) * (2 * cov + c2)) / ((mx * mx + my * my + c1) * (vx + vy + c2))
    return psnr, float(np.clip(ssim.mean(), 0, 1))


def rgb_psnr(ref_u8, test_u8):
    d = ref_u8.astype(np.float32) - test_u8.astype(np.float32)
    mse = float(np.mean(d * d))
    return float(10.0 * np.log10((255.0 ** 2) / max(mse, 1e-12)))


def apply_x2(layers, arch, lr_rgb, prev_rgb=None):
    """lr_rgb is quantized low-res RGB in 0..1. Returns full-res float RGB."""
    if arch == "espcn-rgb":
        x = np.transpose(lr_rgb, (2, 0, 1))[None].astype(np.float32)
        pred, _ = forward(layers, x)
        res = shuffle_pred(pred[0], 3)
        base = bilinear_up(lr_rgb, 2)
        return np.clip(base + res, 0, 1)
    if arch == "espcn-y2":
        prev = lr_rgb if prev_rgb is None else prev_rgb
        x = np.stack([luma(lr_rgb), luma(prev)], axis=0)[None].astype(np.float32)
    else:
        x = luma(lr_rgb)[None, None].astype(np.float32)
    pred, _ = forward(layers, x)
    res = shuffle_pred(pred[0], 1)
    base = bilinear_up(lr_rgb, 2)
    y2 = np.clip(luma(base) + res, 0, 1)
    return y_to_rgb(base, y2)


def reconstruct(layers, arch, frame_u8, prev_u8=None, scale=2):
    """Page path: box-down, x2 residual, 8-bit store. scale 4 is two x2 passes."""
    if scale == 2:
        lr = down_quant(frame_u8, 2)
        prev = down_quant(prev_u8, 2) if prev_u8 is not None else None
        return to_u8(apply_x2(layers, arch, lr, prev))
    low = down_quant(frame_u8, 4)
    if arch == "espcn-y2" and prev_u8 is not None:
        low_p = down_quant(prev_u8, 4)
        mid_p = quant01(apply_x2(layers, arch, low_p, low_p))
        mid = quant01(apply_x2(layers, arch, low, low_p))
        return to_u8(apply_x2(layers, arch, mid, mid_p))
    mid = quant01(apply_x2(layers, arch, low, low if arch == "espcn-y2" else None))
    return to_u8(apply_x2(layers, arch, mid, mid if arch == "espcn-y2" else None))


def bilinear_u8(frame_u8, scale):
    lr = down_quant(frame_u8, scale)
    return to_u8(bilinear_up(lr, scale))


def _flip(img, rng):
    if rng.random() < 0.5:
        img = img[:, ::-1]
    if rng.random() < 0.5:
        img = img[::-1, :]
    return np.ascontiguousarray(img)


def _sample_hr(frames, rng, patch, two_scale):
    n, h, w, _ = frames.shape
    use_half = two_scale and rng.random() < 0.5
    span = patch * (2 if use_half else 1)
    for attempt in range(8):
        fi = int(rng.integers(0, n))
        y0 = int(rng.integers(0, h - span))
        x0 = int(rng.integers(0, w - span))
        crop = np.array(frames[fi, y0:y0 + span, x0:x0 + span], dtype=np.float32) * np.float32(1.0 / 255.0)
        if use_half:
            crop = box_mean(crop, 2)
        if luma(crop).std() > 0.015 or attempt == 7:
            return _flip(crop, rng)
    return _flip(crop, rng)


def sample_y_batch(frames, rng, batch, patch, two_scale=True):
    lr_p = patch // 2
    xs = np.empty((batch, 1, lr_p, lr_p), np.float32)
    ys = np.empty((batch, 4, lr_p, lr_p), np.float32)
    for i in range(batch):
        hr = _sample_hr(frames, rng, patch, two_scale)
        lr = quant01(box_mean(hr, 2))
        residual = luma(hr) - luma(bilinear_up(lr, 2))
        xs[i, 0] = luma(lr)
        ys[i] = unshuffle(residual)
    return xs, ys


def sample_rgb_batch(frames, rng, batch, patch, two_scale=True):
    lr_p = patch // 2
    xs = np.empty((batch, 3, lr_p, lr_p), np.float32)
    ys = np.empty((batch, 12, lr_p, lr_p), np.float32)
    for i in range(batch):
        hr = _sample_hr(frames, rng, patch, two_scale)
        lr = quant01(box_mean(hr, 2))
        residual = hr - bilinear_up(lr, 2)
        xs[i] = np.transpose(lr, (2, 0, 1))
        ys[i] = unshuffle(residual)
    return xs, ys


def sample_temporal_batch(frames, rng, batch, patch, two_scale=True):
    """Returns (x_t, y_t, x_p, y_p) for a current/previous pair."""
    n, h, w, _ = frames.shape
    lr_p = patch // 2
    xt = np.empty((batch, 2, lr_p, lr_p), np.float32)
    yt = np.empty((batch, 4, lr_p, lr_p), np.float32)
    xp = np.empty((batch, 2, lr_p, lr_p), np.float32)
    yp = np.empty((batch, 4, lr_p, lr_p), np.float32)
    for i in range(batch):
        use_half = two_scale and rng.random() < 0.5
        span = patch * (2 if use_half else 1)
        fi = int(rng.integers(1, n))
        y0 = int(rng.integers(0, h - span))
        x0 = int(rng.integers(0, w - span))
        cur = np.array(frames[fi, y0:y0 + span, x0:x0 + span], dtype=np.float32) * np.float32(1.0 / 255.0)
        prv = np.array(frames[fi - 1, y0:y0 + span, x0:x0 + span], dtype=np.float32) * np.float32(1.0 / 255.0)
        if use_half:
            cur = box_mean(cur, 2)
            prv = box_mean(prv, 2)
        if rng.random() < 0.5:
            cur = cur[:, ::-1]
            prv = prv[:, ::-1]
        if rng.random() < 0.5:
            cur = cur[::-1, :]
            prv = prv[::-1, :]
        cur = np.ascontiguousarray(cur)
        prv = np.ascontiguousarray(prv)
        lr_c = quant01(box_mean(cur, 2))
        lr_p = quant01(box_mean(prv, 2))
        xt[i, 0] = luma(lr_c)
        xt[i, 1] = luma(lr_p)
        yt[i] = unshuffle(luma(cur) - luma(bilinear_up(lr_c, 2)))
        xp[i, 0] = luma(lr_p)
        xp[i, 1] = luma(lr_p)
        yp[i] = unshuffle(luma(prv) - luma(bilinear_up(lr_p, 2)))
    return xt, yt, xp, yp


def fit_temporal(layers, frames, steps, batch, patch, rng, sanity_fn=None, name="temporal"):
    """Per-frame residual MSE plus a temporal-difference term so the previous input is used."""
    mom = zero_mom(layers)
    t0 = time.time()
    last = 0.0
    for step in range(1, steps + 1):
        xt, yt, xp, yp = sample_temporal_batch(frames, rng, batch, patch, True)
        pred_t, cache_t = forward(layers, xt)
        pred_p, cache_p = forward(layers, xp)
        err_t = pred_t - yt
        err_p = pred_p - yp
        err_d = (pred_t - pred_p) - (yt - yp)
        n = err_t.size
        last = float(np.mean(err_t * err_t))
        dy_t = (2.0 / n) * err_t + (0.25 * 2.0 / n) * err_d
        dy_p = (0.5 * 2.0 / n) * err_p - (0.25 * 2.0 / n) * err_d
        grads_t = backward(layers, cache_t, dy_t.astype(np.float32))
        grads_p = backward(layers, cache_p, dy_p.astype(np.float32))
        grads = [(gt[0] + gp[0], gt[1] + gp[1]) for gt, gp in zip(grads_t, grads_p)]
        del cache_t, cache_p
        adam(layers, grads, mom, step, lr_at(step, steps))
        if step == 1 or step % 100 == 0 or step == steps:
            print(f"{name} step {step:4d}/{steps}  mse {last:.6f}  {time.time() - t0:.0f}s", flush=True)
        if sanity_fn and (step % 400 == 0 or step == steps):
            sanity_fn(step)
    return last


def write_model(path, name, arch, layers, note, extra=None):
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
    colorspace = "rgb" if arch == "espcn-rgb" else "bt709-y"
    doc = {
        "format": "webartests-sr-v1",
        "name": name,
        "arch": arch,
        "scale": 2,
        "residual": True,
        "colorspace": colorspace,
        "frames": 2 if arch == "espcn-y2" else 1,
        "macsPerLowPixel": macs(layers),
        "note": note,
        "layers": spec_layers,
    }
    if extra:
        doc.update(extra)
    path = Path(path)
    path.write_text(json.dumps(doc))
    print(f"wrote {path} ({path.stat().st_size} bytes, {macs(layers)} MACs/low-pixel)", flush=True)
    return doc


def load_model(path):
    doc = json.loads(Path(path).read_text())
    layers = []
    for layer in doc["layers"]:
        w = np.asarray(layer["weight"], np.float32).reshape(layer["out"], layer["in"], 3, 3)
        b = np.asarray(layer["bias"], np.float32)
        layers.append({"w": w, "b": b, "act": layer["activation"]})
    return doc, layers


def crop_metrics(layers, arch, frame_u8, prev_u8=None, size=192):
    h, w, _ = frame_u8.shape
    y0, x0 = (h - size) // 2, (w - size) // 2
    cur = frame_u8[y0:y0 + size, x0:x0 + size]
    prv = None if prev_u8 is None else prev_u8[y0:y0 + size, x0:x0 + size]
    pred = reconstruct(layers, arch, cur, prv, scale=2)
    base = bilinear_u8(cur, 2)
    bp, bs = page_metrics(cur, base)
    pp, ps = page_metrics(cur, pred)
    return bp, pp, ps


class Anime4KM:
    """NumPy port of the page's Anime4K CNN-M (luma residual, published MIT weights).

    Real-ESRGAN is not the teacher: this VM has no PyTorch and not enough free
    RAM for a comfortable CPU wheel. CNN-M already runs in the compare page and
    beats bilinear there. Alpha of the low-res input is 1, matching the page.
    """

    def __init__(self, path=None):
        path = Path(path or (HERE / "anime4k-m.json"))
        doc = json.loads(path.read_text())
        self.ops = []
        for op in doc["ops"]:
            if op["op"] == "d2s":
                self.ops.append(("d2s", op.get("mode", "luma")))
                continue
            raw = np.frombuffer(base64.b64decode(op["w"]), dtype="<f4").astype(np.float32).copy()
            if op["op"] == "conv3":
                mats = np.stack([raw[i * 16:(i + 1) * 16].reshape(4, 4, order="F") for i in range(9)])
                self.ops.append(("conv3", mats, raw[144:148].copy()))
            elif op["op"] == "conv3relu":
                mats = np.stack([raw[i * 16:(i + 1) * 16].reshape(4, 4, order="F") for i in range(18)])
                self.ops.append(("relu1", mats, raw[288:292].copy()))
            elif op["op"] == "conv1":
                self.ops.append(("conv1", raw))
            else:
                raise SystemExit("CNN-M port does not implement op " + op["op"])

    def features(self, rgb):
        h, w, _ = rgb.shape
        x = np.empty((h, w, 4), np.float32)
        x[..., :3] = rgb
        x[..., 3] = 1.0
        feats = []
        for op in self.ops:
            if op[0] == "conv3":
                x = _conv_spatial(x, op[1], op[2], False)
                feats.append(x)
            elif op[0] == "relu1":
                x = _conv_spatial(x, op[1], op[2], True)
                feats.append(x)
            elif op[0] == "conv1":
                ww = op[1]
                acc = np.zeros_like(feats[0])
                for i, feat in enumerate(feats):
                    pos = ww[i * 32:i * 32 + 16].reshape(4, 4, order="F")
                    neg = ww[i * 32 + 16:i * 32 + 32].reshape(4, 4, order="F")
                    acc += np.maximum(feat, 0) @ pos.T
                    acc += np.maximum(-feat, 0) @ neg.T
                acc += ww[len(feats) * 32:len(feats) * 32 + 4]
                return acc
        raise SystemExit("CNN-M graph did not end in conv1")

    def upscale(self, lr_rgb):
        feat = self.features(lr_rgb)
        res = shuffle_pred(np.transpose(feat, (2, 0, 1)), 1)
        base = bilinear_up(lr_rgb, 2)
        y2 = np.clip(luma(base) + res, 0, 1)
        return y_to_rgb(base, y2), feat


def _conv_spatial(src, mats, bias, split):
    h, w, _ = src.shape
    pad = np.pad(src, ((1, 1), (1, 1), (0, 0)), mode="edge")
    nmat = 18 if split else 9
    cols = np.empty((h * w, nmat * 4), np.float32)
    for k, (dx, dy) in enumerate(TAPS):
        patch = pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w].reshape(h * w, 4)
        if split:
            cols[:, k * 4:(k + 1) * 4] = np.maximum(patch, 0)
            cols[:, (9 + k) * 4:(10 + k) * 4] = np.maximum(-patch, 0)
        else:
            cols[:, k * 4:(k + 1) * 4] = patch
    weight = np.empty((nmat * 4, 4), np.float32)
    for i in range(nmat):
        weight[i * 4:(i + 1) * 4] = mats[i].T
    out = (cols @ weight).reshape(h, w, 4) + bias
    return out.astype(np.float32)


def verify_teacher(teacher=None, t=2.5):
    teacher = teacher or Anime4KM()
    frame = load_clip_at(t)
    # A high-contrast central band, not a flat patch of grass.
    crop = frame[300:300 + 256, 600:600 + 256]
    lr = down_quant(crop, 2)
    pred, _feat = teacher.upscale(lr)
    base = bilinear_u8(crop, 2)
    out = to_u8(pred)
    bp, bs = page_metrics(crop, base)
    pp, ps = page_metrics(crop, out)
    print(f"teacher CNN-M crop luma PSNR {pp:.2f} (bilinear {bp:.2f}) SSIM {ps:.3f} (bilinear {bs:.3f})", flush=True)
    return bp, pp

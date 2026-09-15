#!/usr/bin/env python3
"""Build a self-contained 3D viewer for the case STLs.

The meshes are embedded as base64 and drawn by a small painter's-algorithm
renderer on a 2D canvas — 432 triangles needs no WebGL and no CDN, so the
journal keeps working offline and the viewer cannot rot when a library moves.

Writes viewer.html (standalone) and viewer-fragment.html (to paste into an
engineering journal entry).
"""
import base64, pathlib

MODELS = [("tray", "base-tray.stl", "base tray"), ("gauge", "fit-gauge.stl", "fit gauge")]
here = pathlib.Path(__file__).parent

data = {k: base64.b64encode((here / f).read_bytes()).decode() for k, f, _ in MODELS}
buttons = "".join(
    f'<button class="stl3d-btn{" on" if i == 0 else ""}" data-model="{k}">{label}</button>'
    for i, (k, _, label) in enumerate(MODELS))

BODY = """
<div class="stl3d">
  <div class="stl3d-bar">%(buttons)s<span class="stl3d-hint">drag to turn · wheel to zoom</span></div>
  <canvas class="stl3d-canvas" width="880" height="420"></canvas>
  <p class="stl3d-fallback">3D view needs JavaScript. The meshes are in the assets below.</p>
</div>
<style>
.stl3d { margin: 18px 0; }
.stl3d-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
.stl3d-btn { background: #1a1a1a; border: 1px solid #333; color: #ccc; border-radius: 6px;
  padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: inherit; }
.stl3d-btn.on { background: #1e2d40; border-color: #5b9bd5; color: #fff; }
.stl3d-hint { color: #555; font-size: 11px; margin-left: auto; }
.stl3d-canvas { width: 100%%; max-width: 880px; height: auto; aspect-ratio: 880 / 420;
  background: #141414; border: 1px solid #2a2a2a; border-radius: 12px;
  cursor: grab; touch-action: none; display: block; }
.stl3d-canvas:active { cursor: grabbing; }
.stl3d-fallback { color: #777; font-size: 12px; display: none; }
</style>
<script>
(function () {
  var DATA = %(data)s;
  var host = document.currentScript.previousElementSibling;
  while (host && !host.classList.contains('stl3d')) host = host.previousElementSibling;
  if (!host) return;
  var cv = host.querySelector('.stl3d-canvas'), cx = cv.getContext('2d');
  if (!cx) { host.querySelector('.stl3d-fallback').style.display = 'block'; return; }

  function parse(b64) {                       // binary STL -> triangle list
    var raw = atob(b64), n = raw.length, buf = new Uint8Array(n), i;
    for (i = 0; i < n; i++) buf[i] = raw.charCodeAt(i);
    var dv = new DataView(buf.buffer), count = dv.getUint32(80, true), tris = [], o = 84;
    for (i = 0; i < count; i++) {
      var t = [];
      for (var v = 0; v < 3; v++) {
        t.push([dv.getFloat32(o + 12 + v * 12, true),
                dv.getFloat32(o + 16 + v * 12, true),
                dv.getFloat32(o + 20 + v * 12, true)]);
      }
      tris.push(t); o += 50;
    }
    // centre on the model's own bounding box so rotation feels anchored
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    tris.forEach(function (t) { t.forEach(function (p) {
      for (var k = 0; k < 3; k++) { if (p[k] < lo[k]) lo[k] = p[k]; if (p[k] > hi[k]) hi[k] = p[k]; }
    }); });
    var c = [0, 1, 2].map(function (k) { return (lo[k] + hi[k]) / 2; });
    var span = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    tris.forEach(function (t) { t.forEach(function (p) {
      for (var k = 0; k < 3; k++) p[k] -= c[k];
    }); });
    return { tris: tris, span: span, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
  }

  var models = {}, current = Object.keys(DATA)[0];
  for (var k in DATA) models[k] = parse(DATA[k]);

  var yaw = -0.6, pitch = -1.05, zoom = 1, drag = null;

  var img = null, depth = null;

  // A depth buffer rather than a sort. These faces are large and some of them
  // pass through each other in projection, which any painter's ordering gets
  // wrong somewhere — the floor showed through the walls.
  function render() {
    var m = models[current], w = cv.width, h = cv.height;
    if (!img || img.width !== w) { img = cx.createImageData(w, h); depth = new Float32Array(w * h); }
    var px = img.data;
    for (var i = 0; i < w * h; i++) { depth[i] = -1e30; var o = i * 4; px[o] = 20; px[o + 1] = 20; px[o + 2] = 20; px[o + 3] = 255; }

    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var s = zoom * Math.min(w, h) * 0.62 / m.span;

    m.tris.forEach(function (t) {
      var q = t.map(function (p) {
        var x = p[0] * cy + p[1] * sy;
        var y1 = -p[0] * sy + p[1] * cy;
        return [x, y1 * cp - p[2] * sp, y1 * sp + p[2] * cp];
      });
      var ux = q[1][0] - q[0][0], uy = q[1][1] - q[0][1], uz = q[1][2] - q[0][2];
      var vx = q[2][0] - q[0][0], vy = q[2][1] - q[0][1], vz = q[2][2] - q[0][2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var len = Math.hypot(nx, ny, nz) || 1;
      if (nz / len <= 0) return;                      // back face
      var lit = 0.28 + 0.72 * Math.max(0, (nx * 0.35 + ny * -0.42 + nz * 0.84) / len);
      var r = Math.round(46 + 122 * lit), g = Math.round(82 + 126 * lit), b = Math.round(118 + 130 * lit);

      var X = q.map(function (p) { return w / 2 + p[0] * s; });
      var Y = q.map(function (p) { return h / 2 - p[1] * s; });
      var Z = q.map(function (p) { return p[2]; });
      var minx = Math.max(0, Math.floor(Math.min(X[0], X[1], X[2])));
      var maxx = Math.min(w - 1, Math.ceil(Math.max(X[0], X[1], X[2])));
      var miny = Math.max(0, Math.floor(Math.min(Y[0], Y[1], Y[2])));
      var maxy = Math.min(h - 1, Math.ceil(Math.max(Y[0], Y[1], Y[2])));
      var area = (X[1] - X[0]) * (Y[2] - Y[0]) - (X[2] - X[0]) * (Y[1] - Y[0]);
      if (!area) return;
      for (var yy = miny; yy <= maxy; yy++) {
        for (var xx = minx; xx <= maxx; xx++) {
          var pxc = xx + 0.5, pyc = yy + 0.5;
          var w0 = ((X[1] - X[0]) * (pyc - Y[0]) - (pxc - X[0]) * (Y[1] - Y[0])) / area;
          var w1 = ((pxc - X[0]) * (Y[2] - Y[0]) - (X[2] - X[0]) * (pyc - Y[0])) / area;
          if (w0 < 0 || w1 < 0 || w0 + w1 > 1) continue;
          var z = Z[0] + w1 * (Z[1] - Z[0]) + w0 * (Z[2] - Z[0]);
          var idx = yy * w + xx;
          if (z <= depth[idx]) continue;
          depth[idx] = z;
          var o2 = idx * 4;
          px[o2] = r; px[o2 + 1] = g; px[o2 + 2] = b;
        }
      }
    });
    cx.putImageData(img, 0, 0);
    cx.fillStyle = '#7a7a7a';
    cx.font = '13px ui-monospace, monospace';
    cx.fillText(m.size.map(function (v) { return v.toFixed(1); }).join(' x ') + ' mm', 16, h - 16);
  }

  function at(e) {
    var t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }
  cv.addEventListener('pointerdown', function (e) { drag = at(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', function () { drag = null; });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = at(e);
    yaw += (p.x - drag.x) * 0.012;
    pitch += (p.y - drag.y) * 0.012;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    drag = p; render();
  });
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoom = Math.max(0.4, Math.min(3, zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
    render();
  }, { passive: false });
  host.querySelectorAll('.stl3d-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      host.querySelectorAll('.stl3d-btn').forEach(function (o) { o.classList.remove('on'); });
      b.classList.add('on'); current = b.dataset.model; render();
    });
  });
  // a collapsed details element gives the canvas no size until it opens
  var d = host.closest('details');
  if (d) d.addEventListener('toggle', function () { if (d.open) render(); });
  render();
})();
</script>
"""

frag = BODY % {"buttons": buttons, "data": "{" + ",".join(f'"{k}":"{v}"' for k, v in data.items()) + "}"}
(here / "viewer-fragment.html").write_text(frag)
(here / "viewer.html").write_text(
    "<!doctype html><meta charset=utf-8><title>espRotary case</title>"
    "<body style='background:#0d0d0d;color:#fff;font-family:-apple-system,sans-serif;"
    "padding:40px 24px;max-width:900px;margin:0 auto'>"
    "<h1 style='font-size:22px'>espRotary case</h1>" + frag + "</body>")
print(f"viewer-fragment.html {len(frag):,} bytes   viewer.html written")
for k, f, _ in MODELS:
    print(f"  {f}: {len(data[k]):,} base64 chars")

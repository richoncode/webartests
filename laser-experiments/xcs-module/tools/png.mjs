/**
 * Minimal PNG reader — enough to measure a screenshot.
 *
 * xTool Studio draws its work area on a WebGL canvas, which returns an empty
 * buffer from toDataURL() unless preserveDrawingBuffer is set, so pixels have to
 * come from Page.captureScreenshot instead. Nothing on this machine can decode
 * a PNG (no PIL, no numpy, no canvas module), and the whole decode for what CDP
 * emits — 8-bit, non-interlaced, RGB or RGBA — is short enough to just write.
 */
import { inflateSync } from 'zlib';

export function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`);
  if (interlace !== 0) throw new Error('interlaced PNG unsupported');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`unsupported colour type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride); rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = (prev && x >= channels) ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

/**
 * Bounding box, in pixels, of everything matching `rgb` within `tol`.
 *
 * `region` is not optional in practice: Studio paints the layer swatch strip in
 * the bottom-left chrome using the very colours under test, so a full-frame scan
 * returns a box spanning the whole window. Pass the work area.
 */
export function colourBox(img, rgb, tol = 14, region = null) {
  const { width, height, channels, data } = img;
  const rx0 = region ? region.x0 : 0, ry0 = region ? region.y0 : 0;
  const rx1 = region ? Math.min(region.x1, width - 1) : width - 1;
  const ry1 = region ? Math.min(region.y1, height - 1) : height - 1;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, n = 0;
  for (let y = ry0; y <= ry1; y++) {
    for (let x = rx0; x <= rx1; x++) {
      const i = (y * width + x) * channels;
      if (Math.abs(data[i] - rgb[0]) <= tol &&
          Math.abs(data[i + 1] - rgb[1]) <= tol &&
          Math.abs(data[i + 2] - rgb[2]) <= tol) {
        n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return n ? { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, n } : null;
}

/**
 * Assign every pixel in `region` to whichever target colour it is nearest, and
 * return a bounding box per target.
 *
 * Exact matching does not work against Studio: it composites each shape over
 * the grey bed, so a #10b981 fill is painted as rgb(85,182,133). Nearest-colour
 * assignment tolerates that without needing to know the compositing rule, and
 * `minDist` drops the bed itself and the grid lines, which sit far from any
 * target.
 */
export function assignBoxes(img, targets, region, maxDist = 90) {
  const { width, channels, data } = img;
  const ids = Object.keys(targets);
  const box = {};
  for (const id of ids) box[id] = { x0: Infinity, y0: Infinity, x1: -1, y1: -1, n: 0 };
  for (let y = region.y0; y <= region.y1; y++) {
    for (let x = region.x0; x <= region.x1; x++) {
      const i = (y * width + x) * channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) < 18) continue;   // grey: bed, grid, chrome
      let best = null, bestD = Infinity;
      for (const id of ids) {
        const t = targets[id];
        const d = Math.hypot(r - t[0], g - t[1], b - t[2]);
        if (d < bestD) { bestD = d; best = id; }
      }
      if (bestD > maxDist) continue;
      const q = box[best]; q.n++;
      if (x < q.x0) q.x0 = x; if (x > q.x1) q.x1 = x;
      if (y < q.y0) q.y0 = y; if (y > q.y1) q.y1 = y;
    }
  }
  for (const id of ids) {
    const q = box[id];
    if (q.n) { q.w = q.x1 - q.x0 + 1; q.h = q.y1 - q.y0 + 1; } else box[id] = null;
  }
  return box;
}

/** White-on-black drawing pad → 28×28 MNIST tensor → softmax. */

const SIZE = 28;

function yieldlessSum(pixels) {
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 1) sum += pixels[i];
  return sum;
}

export function inkMass(pixels) {
  return yieldlessSum(pixels);
}

/**
 * Downsample a white-on-black canvas to a centered 28×28 digit in [0, 1].
 * The ink bounding box is scaled so its long side is 20px, then shifted so
 * the center of mass lands near the middle of the MNIST frame.
 * @param {HTMLCanvasElement} canvas
 * @returns {Float32Array}
 */
export function canvasToMnist(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const src = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  let sum = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = src[(y * width + x) * 4];
      if (value > 16) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        sumX += x * value;
        sumY += y * value;
        sum += value;
      }
    }
  }

  const out = new Float32Array(SIZE * SIZE);
  if (maxX < 0 || sum === 0) return out;

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const scale = 20 / Math.max(boxW, boxH);
  const destW = boxW * scale;
  const destH = boxH * scale;
  const comX = sumX / sum;
  const comY = sumY / sum;
  let dx = SIZE / 2 - (comX - minX) * scale;
  let dy = SIZE / 2 - (comY - minY) * scale;
  if (dx < 0) dx = 0;
  if (dy < 0) dy = 0;
  if (dx + destW > SIZE) dx = SIZE - destW;
  if (dy + destH > SIZE) dy = SIZE - destH;

  const dest = document.createElement('canvas');
  dest.width = SIZE;
  dest.height = SIZE;
  const dctx = dest.getContext('2d');
  dctx.fillStyle = '#000';
  dctx.fillRect(0, 0, SIZE, SIZE);
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';
  dctx.drawImage(canvas, minX, minY, boxW, boxH, dx, dy, destW, destH);
  const small = dctx.getImageData(0, 0, SIZE, SIZE).data;
  for (let i = 0; i < out.length; i += 1) out[i] = small[i * 4] / 255;
  return out;
}

export function paintPreview(canvas, pixels) {
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const value = Math.max(0, Math.min(255, Math.round((pixels[i] || 0) * 255)));
    image.data[i * 4] = value;
    image.data[i * 4 + 1] = value;
    image.data[i * 4 + 2] = value;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

export function clearPreview(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Pointer drawing. White stroke, round caps, black background. */
export function attachDrawing(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fff';

  function clear() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  clear();

  let drawing = false;
  let last = null;

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function strokeTo(next) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (last) {
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(next.x, next.y);
    } else {
      ctx.moveTo(next.x, next.y);
      ctx.lineTo(next.x + 0.01, next.y);
    }
    ctx.stroke();
    last = next;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button != null && event.button !== 0) return;
    drawing = true;
    last = null;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    strokeTo(point(event));
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    strokeTo(point(event));
  });
  function endDraw() {
    drawing = false;
    last = null;
  }
  canvas.addEventListener('pointerup', endDraw);
  canvas.addEventListener('pointercancel', endDraw);

  return {
    clear,
    read: () => canvasToMnist(canvas),
  };
}

export async function predictScores(tf, model, pixels) {
  const probs = tf.tidy(() => {
    const input = tf.tensor4d(pixels, [1, 28, 28, 1]);
    return model.predict(input);
  });
  try {
    const data = await probs.data();
    return Array.from(data);
  } finally {
    probs.dispose();
  }
}

export function topClasses(scores, n = 3) {
  return scores
    .map((p, digit) => ({ digit, p: p || 0 }))
    .sort((a, b) => b.p - a.p)
    .slice(0, n);
}

/**
 * MNIST loader. Fetches the public TensorFlow.js sprite (CORS-enabled) and
 * caches a 12,000-image pool in IndexedDB. The cvdf gzip mirrors do not send
 * Access-Control-Allow-Origin, so the browser cannot read them directly.
 */

const SPRITE_URL = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png';
const LABELS_URL = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8';

const DB_NAME = 'browser-ai';
const DB_VERSION = 1;
const STORE = 'kv';
const CACHE_KEY = 'mnist-sprite-12k-v1';

export const IMAGE_SIZE = 28;
export const IMAGE_PIXELS = IMAGE_SIZE * IMAGE_SIZE;
export const POOL_COUNT = 12000;
export const TRAIN_COUNT = 10000;
export const VAL_COUNT = 2000;

let inflight = null;

function mulberry32(seed) {
  let state = seed >>> 0;
  return function rand() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-hot rows (10 bytes each) → class ids. */
export function decodeLabels(oneHot, count) {
  const labels = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    let cls = 0;
    for (let c = 0; c < 10; c += 1) {
      if (oneHot[i * 10 + c]) cls = c;
    }
    labels[i] = cls;
  }
  return labels;
}

/** Stable shuffle so batch runs compare the same train/val split. */
export function splitPool(count, trainCount, valCount, seed = 1) {
  if (trainCount + valCount > count) {
    throw new Error('Train and validation counts exceed the MNIST pool.');
  }
  const idx = Array.from({ length: count }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const swap = idx[i];
    idx[i] = idx[j];
    idx[j] = swap;
  }
  return {
    train: idx.slice(0, trainCount),
    val: idx.slice(trainCount, trainCount + valCount),
  };
}

function asUint8(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB failed to open'));
  });
}

function idbRequest(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

async function readCache() {
  try {
    const db = await openDb();
    try {
      const record = await idbRequest(db, 'readonly', (store) => store.get(CACHE_KEY));
      const images = asUint8(record && record.images);
      const labels = asUint8(record && record.labels);
      if (!record || record.v !== 1 || !images || !labels) return null;
      if (images.length !== POOL_COUNT * IMAGE_PIXELS || labels.length !== POOL_COUNT) return null;
      return { images, labels };
    } finally {
      db.close();
    }
  } catch (error) {
    console.warn('MNIST cache read failed', error);
    return null;
  }
}

async function writeCache(images, labels) {
  const db = await openDb();
  try {
    await idbRequest(db, 'readwrite', (store) => store.put({
      v: 1,
      images,
      labels,
      savedAt: Date.now(),
      source: SPRITE_URL,
    }, CACHE_KEY));
  } finally {
    db.close();
  }
}

async function fetchBytes(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MNIST download failed (${response.status})`);
  }
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body || typeof response.body.getReader !== 'function') {
    const buffer = await response.arrayBuffer();
    if (onProgress) onProgress(buffer.byteLength, total || buffer.byteLength);
    return new Uint8Array(buffer);
  }
  const reader = response.body.getReader();
  const parts = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.byteLength;
    if (onProgress) onProgress(received, total);
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function formatMb(bytes, total) {
  const have = (bytes / 1e6).toFixed(1);
  if (!total) return `${have} MB`;
  return `${have} / ${(total / 1e6).toFixed(1)} MB`;
}

async function decodeSprite(bytes) {
  const blob = new Blob([bytes], { type: 'image/png' });
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch (error) {
      console.warn('createImageBitmap failed, falling back to Image', error);
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    if (typeof img.decode === 'function') await img.decode();
    else {
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('MNIST sprite failed to decode'));
      });
    }
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function yieldFrame() {
  return new Promise((resolve) => { setTimeout(resolve, 0); });
}

async function extractImages(bitmap, onProgress) {
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  if (width !== IMAGE_PIXELS) {
    throw new Error(`Unexpected MNIST sprite width ${width}×${height}. Expected ${IMAGE_PIXELS}×N.`);
  }
  if (height < POOL_COUNT) {
    throw new Error(`MNIST sprite only has ${height} rows; need ${POOL_COUNT}.`);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not read MNIST pixels.');
  ctx.imageSmoothingEnabled = false;

  const images = new Uint8Array(POOL_COUNT * IMAGE_PIXELS);
  const chunk = 2000;
  for (let row = 0; row < POOL_COUNT; row += chunk) {
    const h = Math.min(chunk, POOL_COUNT - row);
    canvas.width = width;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, row, width, h, 0, 0, width, h);
    const pixels = ctx.getImageData(0, 0, width, h).data;
    const dest = images.subarray(row * IMAGE_PIXELS, (row + h) * IMAGE_PIXELS);
    for (let i = 0; i < dest.length; i += 1) dest[i] = pixels[i * 4];
    if (onProgress) onProgress({ phase: 'extract', done: row + h, total: POOL_COUNT });
    await yieldFrame();
  }
  if (typeof bitmap.close === 'function') bitmap.close();
  return images;
}

function assertDataset(images, labels) {
  const counts = new Array(10).fill(0);
  for (let i = 0; i < labels.length; i += 1) counts[labels[i]] += 1;
  const used = counts.filter((count) => count > 0).length;
  if (used < 8) throw new Error('MNIST labels did not contain enough digit classes.');
  let sum = 0;
  const sample = Math.min(images.length, IMAGE_PIXELS * 32);
  for (let i = 0; i < sample; i += 1) sum += images[i];
  if (sum === 0) throw new Error('MNIST pixels decoded as empty.');
}

async function loadUncached(onProgress) {
  const cached = await readCache();
  if (cached) {
    if (onProgress) onProgress({ phase: 'cache' });
    return { ...cached, fromCache: true };
  }

  if (onProgress) onProgress({ phase: 'download', label: 'sprite and labels' });
  let spriteGot = 0;
  let labelsGot = 0;
  let spriteTotal = 0;
  let labelsTotal = 0;
  const report = () => {
    if (!onProgress) return;
    const got = spriteGot + labelsGot;
    const total = spriteTotal + labelsTotal;
    onProgress({ phase: 'download', label: formatMb(got, total) });
  };

  const [spriteBytes, labelBytes] = await Promise.all([
    fetchBytes(SPRITE_URL, (got, total) => {
      spriteGot = got;
      spriteTotal = total;
      report();
    }),
    fetchBytes(LABELS_URL, (got, total) => {
      labelsGot = got;
      labelsTotal = total;
      report();
    }),
  ]);

  if (labelBytes.length < POOL_COUNT * 10) {
    throw new Error('MNIST label file is shorter than expected.');
  }

  if (onProgress) onProgress({ phase: 'decode' });
  const bitmap = await decodeSprite(spriteBytes);
  const images = await extractImages(bitmap, onProgress);
  const labels = decodeLabels(labelBytes, POOL_COUNT);
  assertDataset(images, labels);

  if (onProgress) onProgress({ phase: 'cache-write' });
  try {
    await writeCache(images, labels);
  } catch (error) {
    console.warn('MNIST cache write failed', error);
  }

  return { images, labels, fromCache: false };
}

/** @returns {Promise<{ images: Uint8Array, labels: Uint8Array, fromCache: boolean }>} */
export function loadMnist(onProgress) {
  if (!inflight) {
    inflight = loadUncached(onProgress).catch((error) => {
      inflight = null;
      throw error;
    });
  }
  return inflight;
}

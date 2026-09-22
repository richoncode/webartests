/**
 * Fashion-MNIST loader. Downloads the official 10,000-image test split as
 * gzip IDX (CORS-enabled CDNs) and caches the pixels in IndexedDB.
 * The 60,000-image training file stays on the server. This pool is the
 * Zalando set already fetched for the page: 1,000 images of each class.
 * Training uses 9,000 of them and holds out 1,000 for validation.
 */

import { splitPool } from '../mnist/data.js';

const SOURCES = [
  {
    name: 'jsDelivr',
    images: 'https://cdn.jsdelivr.net/gh/zalandoresearch/fashion-mnist@master/data/fashion/t10k-images-idx3-ubyte.gz',
    labels: 'https://cdn.jsdelivr.net/gh/zalandoresearch/fashion-mnist@master/data/fashion/t10k-labels-idx1-ubyte.gz',
  },
  {
    name: 'GitHub',
    images: 'https://raw.githubusercontent.com/zalandoresearch/fashion-mnist/master/data/fashion/t10k-images-idx3-ubyte.gz',
    labels: 'https://raw.githubusercontent.com/zalandoresearch/fashion-mnist/master/data/fashion/t10k-labels-idx1-ubyte.gz',
  },
];

const DB_NAME = 'browser-ai';
const DB_VERSION = 1;
const STORE = 'kv';
const CACHE_KEY = 'fashion-mnist-10k-v1';

export const IMAGE_SIZE = 28;
export const IMAGE_PIXELS = IMAGE_SIZE * IMAGE_SIZE;
export const POOL_COUNT = 10000;
export const TRAIN_COUNT = 9000;
export const VAL_COUNT = 1000;
export const NUM_CLASSES = 10;

export const CLASS_NAMES = [
  'T-shirt/top',
  'Trouser',
  'Pullover',
  'Dress',
  'Coat',
  'Sandal',
  'Shirt',
  'Sneaker',
  'Bag',
  'Ankle boot',
];

export { splitPool };

/** First `count` pool indices whose label is `classIndex`, in file order. */
export function classExampleIndices(labels, classIndex, count) {
  const found = [];
  const target = classIndex | 0;
  const limit = Math.max(0, count | 0);
  for (let i = 0; i < labels.length && found.length < limit; i += 1) {
    if (labels[i] === target) found.push(i);
  }
  return found;
}

let inflight = null;

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
    console.warn('Fashion-MNIST cache read failed', error);
    return null;
  }
}

async function writeCache(images, labels, source) {
  const db = await openDb();
  try {
    await idbRequest(db, 'readwrite', (store) => store.put({
      v: 1,
      images,
      labels,
      savedAt: Date.now(),
      source,
    }, CACHE_KEY));
  } finally {
    db.close();
  }
}

async function fetchBytes(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
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

async function gunzip(bytes) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('This browser cannot unpack gzip (DecompressionStream is missing).');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function parseImages(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0);
  const count = view.getUint32(4);
  const rows = view.getUint32(8);
  const cols = view.getUint32(12);
  if (magic !== 2051) throw new Error(`Unexpected Fashion-MNIST image header (${magic}).`);
  if (rows !== IMAGE_SIZE || cols !== IMAGE_SIZE) {
    throw new Error(`Expected 28×28 images, got ${rows}×${cols}.`);
  }
  const need = 16 + count * IMAGE_PIXELS;
  if (bytes.length < need) throw new Error('Fashion-MNIST image file is shorter than expected.');
  return { count, images: new Uint8Array(bytes.subarray(16, need)) };
}

function parseLabels(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0);
  const count = view.getUint32(4);
  if (magic !== 2049) throw new Error(`Unexpected Fashion-MNIST label header (${magic}).`);
  const need = 8 + count;
  if (bytes.length < need) throw new Error('Fashion-MNIST label file is shorter than expected.');
  return { count, labels: new Uint8Array(bytes.subarray(8, need)) };
}

function assertDataset(images, labels) {
  if (images.length !== POOL_COUNT * IMAGE_PIXELS || labels.length !== POOL_COUNT) {
    throw new Error(`Expected ${POOL_COUNT} Fashion-MNIST images, got ${labels.length}.`);
  }
  const counts = new Array(NUM_CLASSES).fill(0);
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    if (label >= NUM_CLASSES) throw new Error(`Label ${label} is outside 0–9.`);
    counts[label] += 1;
  }
  if (counts.some((count) => count < 100)) {
    throw new Error('Fashion-MNIST file is missing clothing classes.');
  }
  let sum = 0;
  const sample = Math.min(images.length, IMAGE_PIXELS * 32);
  for (let i = 0; i < sample; i += 1) sum += images[i];
  if (sum === 0) throw new Error('Fashion-MNIST pixels decoded as empty.');
}

async function downloadSource(source, onProgress) {
  let imagesGot = 0;
  let labelsGot = 0;
  let imagesTotal = 0;
  let labelsTotal = 0;
  const report = () => {
    if (!onProgress) return;
    onProgress({
      phase: 'download',
      label: `${source.name} · ${formatMb(imagesGot + labelsGot, imagesTotal + labelsTotal)}`,
    });
  };
  report();
  const [imageGz, labelGz] = await Promise.all([
    fetchBytes(source.images, (got, total) => {
      imagesGot = got;
      imagesTotal = total;
      report();
    }),
    fetchBytes(source.labels, (got, total) => {
      labelsGot = got;
      labelsTotal = total;
      report();
    }),
  ]);
  if (onProgress) onProgress({ phase: 'decode', label: source.name });
  const [imageBytes, labelBytes] = await Promise.all([gunzip(imageGz), gunzip(labelGz)]);
  const images = parseImages(imageBytes);
  const labels = parseLabels(labelBytes);
  if (images.count !== labels.count) {
    throw new Error('Fashion-MNIST image and label counts do not match.');
  }
  assertDataset(images.images, labels.labels);
  return { images: images.images, labels: labels.labels, source: source.images };
}

async function loadUncached(onProgress) {
  const cached = await readCache();
  if (cached) {
    if (onProgress) onProgress({ phase: 'cache' });
    return { ...cached, fromCache: true };
  }

  let lastError = null;
  for (const source of SOURCES) {
    try {
      const data = await downloadSource(source, onProgress);
      if (onProgress) onProgress({ phase: 'cache-write' });
      try {
        await writeCache(data.images, data.labels, data.source);
      } catch (error) {
        console.warn('Fashion-MNIST cache write failed', error);
      }
      return { images: data.images, labels: data.labels, fromCache: false };
    } catch (error) {
      console.warn(`Fashion-MNIST source ${source.name} failed`, error);
      lastError = error;
    }
  }
  throw lastError || new Error('Fashion-MNIST download failed.');
}

/** @returns {Promise<{ images: Uint8Array, labels: Uint8Array, fromCache: boolean }>} */
export function loadFashion(onProgress) {
  if (!inflight) {
    inflight = loadUncached(onProgress).catch((error) => {
      inflight = null;
      throw error;
    });
  }
  return inflight;
}

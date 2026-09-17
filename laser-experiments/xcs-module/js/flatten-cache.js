/**
 * Persistent cache for the buried-geometry pass.
 *
 * Removing buried geometry is essentially the whole cost of building an xTool
 * project: measured on Gears, the build takes 87 seconds with the pass and 0.4
 * seconds without it. That price was being paid again on every page load of a
 * design nobody had changed.
 *
 * The key is a fingerprint of the recording itself — every shape's path and
 * colour, plus the flags that decide what the pass does — so a hit means the
 * input was byte-for-byte what produced the stored output. Keying on the
 * settings instead would be cheaper, but it would go stale the moment some
 * input to generation was added and not added to the key, and a stale hit here
 * shows geometry that is not what the machine will cut.
 *
 * IndexedDB rather than localStorage: a flattened Gears is about 16 MB, which
 * is past what localStorage holds.
 */

// Bump when the pass's output would change for the same input — a different
// flattening tolerance, a fix to the boolean pipeline. Old entries are then
// unreachable and get pruned.
const CACHE_VERSION = 1;
const DB_NAME = 'pattern-tool-flatten';
const STORE = 'flattened';
const KEEP = 8;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' }).createIndex('used', 'used');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);   // no cache is a slow path, not an error
  });
  return dbPromise;
}

/**
 * A 64-bit fingerprint, as two FNV-1a passes with different offsets. One 32-bit
 * hash over a few thousand paths is close enough to the birthday bound to be
 * worth avoiding, and a collision here would serve geometry from a different
 * design.
 */
export function fingerprint(parts) {
  let a = 0x811c9dc5, b = 0x01000193;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      a ^= c; a = Math.imul(a, 0x01000193) >>> 0;
      b = (b + c) >>> 0; b = Math.imul(b, 0x85ebca6b) >>> 0; b ^= b >>> 13;
    }
    a ^= 0x2c; a = Math.imul(a, 0x01000193) >>> 0;
  }
  return `v${CACHE_VERSION}-${a.toString(36)}${b.toString(36)}`;
}

export async function read(key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(key);
    req.onsuccess = () => {
      const row = req.result;
      if (!row) return resolve(null);
      // Touch it so the least recently used entry is the one pruned.
      row.used = Date.now();
      store.put(row);
      resolve(row.shapes);
    };
    req.onerror = () => resolve(null);
  });
}

export async function write(key, shapes) {
  const db = await openDB();
  if (!db) return;
  await new Promise(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, shapes, used: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = resolve;      // a full disk should not break the build
    tx.onabort = resolve;
  });
  prune();
}

async function prune() {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const req = store.index('used').getAllKeys();
  req.onsuccess = () => {
    const keys = req.result || [];
    for (let i = 0; i < keys.length - KEEP; i++) store.delete(keys[i]);
  };
}

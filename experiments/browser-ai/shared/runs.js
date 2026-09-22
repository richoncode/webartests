/** LocalStorage run history for the lab hub. Demos append; the hub reads. */

export const RUNS_STORAGE_KEY = 'browser-ai.runs';

/**
 * @param {Storage|null|undefined} storage
 * @returns {{ key: string, runs: unknown[], status: 'empty'|'ready'|'invalid'|'unavailable' }}
 */
export function loadRuns(storage = globalThis.localStorage) {
  const key = RUNS_STORAGE_KEY;
  if (!storage) return { key, runs: [], status: 'unavailable' };

  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    return { key, runs: [], status: 'unavailable' };
  }

  if (raw == null || raw === '') return { key, runs: [], status: 'empty' };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { key, runs: [], status: 'invalid' };
    return { key, runs: parsed, status: parsed.length ? 'ready' : 'empty' };
  } catch {
    return { key, runs: [], status: 'invalid' };
  }
}

/**
 * Prepend a run record. Invalid JSON is replaced with a one-item list.
 * Keeps the newest 50 entries. The hub renders `name`, `backend`, `savedAt`, and `accuracy`.
 * @param {Record<string, unknown>} run
 */
export function appendRun(run, storage = globalThis.localStorage) {
  if (!storage) throw new Error('LocalStorage is unavailable');
  const loaded = loadRuns(storage);
  const prior = loaded.status === 'ready' || loaded.status === 'empty' ? loaded.runs : [];
  const runs = [run, ...prior].slice(0, 50);
  storage.setItem(RUNS_STORAGE_KEY, JSON.stringify(runs));
  return { key: RUNS_STORAGE_KEY, runs, status: 'ready' };
}

function runTitle(run, index) {
  if (run && typeof run === 'object') {
    const record = /** @type {Record<string, unknown>} */ (run);
    const name = record.name || record.id || record.demo;
    if (name != null && String(name)) return String(name);
  }
  return `Run ${index + 1}`;
}

function runDetail(run) {
  if (!run || typeof run !== 'object') return 'Saved entry';
  const record = /** @type {Record<string, unknown>} */ (run);
  const bits = [];
  if (record.backend) bits.push(String(record.backend));
  if (record.savedAt || record.timestamp) bits.push(String(record.savedAt || record.timestamp));
  if (record.accuracy != null) bits.push(`acc ${record.accuracy}`);
  return bits.length ? bits.join(' · ') : 'Saved run metadata';
}

/** Render an empty placeholder, an error, or a short list of saved runs. */
export function mountRuns(root, result) {
  root.replaceChildren();

  if (result.status === 'ready') {
    const list = document.createElement('div');
    list.className = 'stack';
    result.runs.slice(0, 20).forEach((run, index) => {
      const card = document.createElement('article');
      card.className = 'panel run-card';
      const heading = document.createElement('h3');
      heading.textContent = runTitle(run, index);
      const copy = document.createElement('p');
      copy.textContent = runDetail(run);
      card.append(heading, copy);
      list.appendChild(card);
    });
    root.appendChild(list);
    return;
  }

  const panel = document.createElement('div');
  panel.className = 'panel empty-state';
  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'LocalStorage';
  const heading = document.createElement('h2');
  const copy = document.createElement('p');
  const key = document.createElement('code');
  key.textContent = result.key;

  if (result.status === 'invalid') {
    heading.textContent = 'Saved runs could not be read';
    copy.append('The value at ', key, ' is not a JSON list. The next finished training run replaces it with a list.');
  } else if (result.status === 'unavailable') {
    heading.textContent = 'LocalStorage is unavailable';
    copy.textContent = 'This browser blocked storage, so run history cannot be shown. Runs stay on this device either way.';
  } else {
    heading.textContent = 'No saved runs';
    copy.append('Training history lives in this browser under ', key, '. Finish a MNIST run and it shows up here.');
  }

  panel.append(label, heading, copy);
  root.appendChild(panel);
}

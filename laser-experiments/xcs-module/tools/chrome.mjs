/**
 * Launch headless Chrome for rendering our own pages, and talk to it over CDP.
 *
 * Two things make the difference between this working and hanging, both learned
 * the hard way after four stalled runs:
 *
 *  - A FRESH profile per launch. Reusing one --user-data-dir let it grow to
 *    152 MB and, being a real profile, it resumed sync, component updates and
 *    GCM registration on every start. The launch log filled with
 *    `gcm/engine/registration_request ... DEPRECATED_ENDPOINT` while the script
 *    sat waiting for a target that had not finished coming up.
 *
 *  - The automation flag set. chrome-launcher's own list exists for exactly
 *    this: --disable-background-networking covers "extension updating, safe
 *    browsing service, upgrade detector, translate, UMA", and the rest remove
 *    first-run wizards, the default-browser prompt and component updates.
 *    https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md
 *
 * The user's own Chrome can stay open; a separate --user-data-dir and port is a
 * separate browser, so nothing here touches their session.
 */
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const AUTOMATION_FLAGS = [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-sync',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--metrics-recording-only',
  '--enable-automation',
  '--test-type'
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Always port 0, never a fixed one.
 *
 * With a fixed port, a Chrome left over from an earlier run answers
 * /json/version instantly and the launcher reports success — while the browser
 * actually being driven is the stale one, still showing the previous run's
 * page. That produced a capture of a jigsaw when gears had been requested, and
 * a startup time of 1.5s because nothing was starting. Chrome writes the port
 * it really bound to DevToolsActivePort inside its own profile directory, and
 * since the profile is freshly made here that file can only belong to this
 * process.
 */
export async function launchChrome(url, { width = 1700, height = 1100, timeoutMs = 30000 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'xcs-chrome-'));
  const proc = spawn(CHROME, [
    ...AUTOMATION_FLAGS,
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    url
  ], { stdio: 'ignore', detached: false });

  const portFile = join(profile, 'DevToolsActivePort');
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await sleep(300);
    if (!existsSync(portFile)) continue;
    let port;
    try { port = parseInt(readFileSync(portFile, 'utf8').split('\n')[0], 10); } catch { continue; }
    if (!port) continue;
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) {
        return {
          port,
          // Chrome holds files open for a moment after SIGTERM, so the profile
          // is removed on a short retry rather than immediately — otherwise the
          // cleanup itself throws EACCES and takes the run down with it.
          pid: proc.pid,
          close: async () => {
            try { proc.kill('SIGTERM'); } catch {}
            for (let i = 0; i < 10; i++) {
              await sleep(200);
              try { rmSync(profile, { recursive: true, force: true }); return; } catch {}
            }
          }
        };
      }
    } catch {}
  }
  proc.kill('SIGKILL');
  rmSync(profile, { recursive: true, force: true });
  throw new Error(`Chrome did not write DevToolsActivePort within ${timeoutMs}ms`);
}

/** Minimal CDP client with a per-call timeout, so a stalled reply cannot hang the run. */
export async function connect(wsUrl, { callTimeoutMs = 20000 } = {}) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('websocket did not open')), 10000);
    ws.onopen = () => { clearTimeout(t); res(); };
    ws.onerror = e => { clearTimeout(t); rej(e); };
  });
  let id = 0; const pending = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    const p = pending.get(m.id);
    if (p) { clearTimeout(p.timer); p.resolve(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(`${method} timed out after ${callTimeoutMs}ms`)); }, callTimeoutMs);
    pending.set(n, { resolve, timer });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  return { send, evaluate, close: () => ws.close() };
}

export async function pageTarget(port, match, { timeoutMs = 20000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const t = list.find(t => t.type === 'page' && t.url.includes(match));
    if (t) return t;
    await sleep(300);
  }
  throw new Error(`no page target matching "${match}" after ${timeoutMs}ms`);
}

/**
 * Wait until the page has finished loading and a probe expression is true.
 * The debug port answers well before the document is ready — the first run of
 * this launcher reported an empty document.title because it asked at 1.5s.
 */
export async function waitFor(client, probe, { timeoutMs = 30000, everyMs = 300 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { if (await client.evaluate(probe)) return true; } catch {}
    await sleep(everyMs);
  }
  throw new Error(`timed out waiting for: ${probe}`);
}

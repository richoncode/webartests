const WS = require('ws');
const ws = new WS('wss://localhost:8084/__iwer_mcp', { rejectUnauthorized: false });

const TARGET = { x: 0, y: 1.301, z: -1.439 };  // Connect 6 centre in world
const CONTROLLER_POS = { x: 0, y: 1.4, z: -0.3 };
const DURATION_MS = 3000;
const TREMOR_AMP = parseFloat(process.env.TREMOR_AMP || '0.003');
const TREMOR_FREQ = 8;      // Hz, within 4-12Hz band

let id = 0;
const pending = new Map();

function call(method, params) {
  const reqId = String(++id);
  return new Promise((resolve, reject) => {
    pending.set(reqId, { resolve, reject });
    ws.send(JSON.stringify({ id: reqId, method, params }));
    setTimeout(() => {
      if (pending.has(reqId)) { pending.delete(reqId); reject(new Error(`timeout ${method}`)); }
    }, 2000);
  });
}

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  const p = pending.get(String(msg.id));
  if (!p) return;
  pending.delete(String(msg.id));
  if (msg.error) p.reject(new Error(JSON.stringify(msg.error))); else p.resolve(msg.result ?? msg);
});

ws.on('open', async () => {
  try {
    await call('set_input_mode', { mode: 'controller' });
    await call('set_transform', { device: 'controller-right', position: CONTROLLER_POS });
    await call('look_at', { device: 'controller-right', target: TARGET });
    // Let it settle
    await new Promise(r => setTimeout(r, 100));

    const timeline = [];
    const start = Date.now();
    let sample = 0;
    while (Date.now() - start < DURATION_MS) {
      sample++;
      const t = (Date.now() - start) / 1000;

      // Sinusoidal tremor + small white noise
      const jx = TREMOR_AMP * Math.sin(2 * Math.PI * TREMOR_FREQ * t) + (Math.random() - 0.5) * 0.001;
      const jy = TREMOR_AMP * Math.cos(2 * Math.PI * TREMOR_FREQ * t * 1.11) + (Math.random() - 0.5) * 0.001;
      const target = { x: TARGET.x + jx, y: TARGET.y + jy, z: TARGET.z };

      await call('look_at', { device: 'controller-right', target });
      const find = await call('ecs_find_entities', { withComponents: ['Hovered'] });
      const hovered = (find.entities || []).map(e => e.entityIndex).filter(i => i !== 6);
      timeline.push({ t: +t.toFixed(3), jx: +jx.toFixed(4), jy: +jy.toFixed(4), hovered });
    }

    // Count transitions (any change in which MenuButton was hovered)
    let transitions = 0;
    let prev = JSON.stringify(timeline[0]?.hovered);
    const hits = {};
    for (const s of timeline) {
      const key = JSON.stringify(s.hovered);
      if (key !== prev) { transitions++; prev = key; }
      for (const e of s.hovered) hits[e] = (hits[e] || 0) + 1;
    }

    console.log(`samples: ${timeline.length}, duration: ${DURATION_MS}ms`);
    console.log(`unique hover states observed: ${new Set(timeline.map(s => JSON.stringify(s.hovered))).size}`);
    console.log(`transitions: ${transitions}`);
    console.log(`hits per entity:`, hits);
    console.log(`first 5:`, timeline.slice(0, 5));
    console.log(`last 5:`, timeline.slice(-5));
    // If we saw any entity other than 19 — flicker confirmed in emulator
    const flipped = timeline.filter(s => !s.hovered.includes(19) || s.hovered.length !== 1);
    if (flipped.length) {
      console.log(`${flipped.length} samples did NOT uniquely hover entity 19`);
      console.log(`examples:`, flipped.slice(0, 8));
    } else {
      console.log('entity 19 stayed hovered through the entire tremor window');
    }

    ws.close();
    process.exit(0);
  } catch (e) {
    console.error('error:', e.message);
    process.exit(1);
  }
});

ws.on('error', (e) => { console.error('ws error:', e.message); process.exit(1); });

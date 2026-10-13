'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const E = require(path.join(root, 'app/src/engine.js'));

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

test('app/infrasim.html inlines every chip and model id', () => {
  const html = fs.readFileSync(path.join(root, 'app/infrasim.html'), 'utf8');
  const inline = fs.readFileSync(path.join(root, 'app/inline-data.js'), 'utf8');
  const chips = readJson('data/chips.json');
  const models = readJson('data/models.json');
  for (const c of chips.chips) {
    const needle = '"id":"' + c.id + '"';
    assert.ok(html.includes(needle), 'infrasim.html missing ' + c.id);
    assert.ok(inline.includes(needle), 'inline-data.js missing ' + c.id);
  }
  for (const m of models.models) {
    const needle = '"id":"' + m.id + '"';
    assert.ok(html.includes(needle), 'infrasim.html missing ' + m.id);
    assert.ok(inline.includes(needle), 'inline-data.js missing ' + m.id);
  }
  for (const [from, to] of Object.entries(chips.aliases || {})) {
    assert.equal(chips.chips.find(c => c.id === from).aliasOf, to);
    assert.ok(html.includes('"' + from + '":"' + to + '"'), from + ' -> ' + to);
  }
});

test('m5pro resolves to the 18-core M5 Pro and m5max to the 40-core M5 Max', () => {
  const chips = readJson('data/chips.json');
  const flat = chips.chips.map(E.flattenChip);
  assert.equal(E.resolveChipId(flat, 'm5pro'), 'm5pro-18');
  assert.equal(E.resolveChipId(flat, 'm5max'), 'm5max-40');
  assert.equal(E.resolveChipId(flat, 'm5pro-15'), 'm5pro-15');
  assert.equal(E.resolveChipId(flat, 'm6'), 'm6');
  const S = E.decodeState('', flat, readJson('data/models.json').models);
  assert.equal(S.model, 'qwen3-8b');
  assert.equal(S.A, 'm5pro-18');
  assert.equal(S.B, 'm6');
  assert.equal(S.prec, 'fp8');
  const hashed = E.decodeState('#a=m5pro&b=m5max&m=qwen3-8b', flat, readJson('data/models.json').models);
  assert.equal(hashed.A, 'm5pro-18');
  assert.equal(hashed.B, 'm5max-40');
  const pro = flat.find(c => c.id === 'm5pro-18');
  const alias = flat.find(c => c.id === 'm5pro');
  assert.equal(pro.fp16, 30.8);
  assert.equal(pro.cap, 64);
  assert.equal(pro.units, 20);
  assert.equal(alias.aliasOf, 'm5pro-18');
});

test('known System Level Cache sizes keep their tags', () => {
  const chips = readJson('data/chips.json');
  const l2 = id => chips.chips.find(c => c.id === id).specs.l2;
  assert.deepEqual({ v: l2('m6').v, tag: l2('m6').tag }, { v: '16 MB', tag: 'A' });
  assert.ok(l2('m6').src.includes('appleinsider-m6-die') && l2('m6').src.includes('macworld-m6'));
  for (const id of ['m5pro-15', 'm5pro-18']) assert.deepEqual({ v: l2(id).v, tag: l2(id).tag }, { v: '24 MB', tag: 'U' });
  assert.equal(l2('m5').v.includes('MB') || l2('m5').v.includes('MiB'), true);
  assert.match(l2('m5max-40').v, /not published/i);
});

test('footnotes say what the mark means, not where else it appears', () => {
  const src = ['app/src/template.html', 'app/src/ui.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  assert.match(src, /all-reduce time in the step is 0 s/);
  assert.match(src, /Idle on purpose/);
  assert.doesNotMatch(src, /same marker|explained here|published by the vendor|verified vendor|how-to line|how-to note/i);
  assert.match(src, /decode tok\/s = 1 \/ step/);
  assert.match(src, /No recorded source/);
});

test('built page wires one in-place data-link highlight', () => {
  const html = fs.readFileSync(path.join(root, 'app/infrasim.html'), 'utf8');
  assert.match(html, /function bindLinks/);
  assert.match(html, /classList\.toggle\('lk'/);
  assert.doesNotMatch(html, /id="tagtip"|id="tagscrim"|id="taglines"|id="taghalos"/);
  for (const id of ['tag:V', 'tag:A', 'tag:U', 'xref:roofline', 'xref:verdict', 'note:nolink', 'note:range', 'note:na', 'note:fp8', 'note:arch']) {
    assert.ok(html.includes('data-link="' + id + '"'), id);
  }
});

test('dot flow and stepper share one scale, and panel chrome states the rate', () => {
  const src = ['app/src/ui.js', 'app/src/template.html', 'app/src/styles.css'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  const m5 = 307 * 0.92, m6 = 170 * 0.9;
  const ratio = E.flowScale(m5, m6);
  assert.ok(Math.abs(ratio - m5 / m6) < 1e-12);
  assert.ok(ratio > 1.8 && ratio < 1.9, 'M5 Pro effective GB/s should be about 1.8x M6, got ' + ratio);
  const slow = 0.08, fast = slow / ratio;
  assert.ok(Math.abs(E.animSeconds(fast, slow, 8) / E.animSeconds(slow, slow, 8) - fast / slow) < 1e-12);
  assert.match(src, /dot rate ∝ memory bandwidth/);
  assert.match(src, /position:\s*sticky/);
  assert.match(src, /memory-bound/);
  assert.match(src, /compute-bound/);
  assert.match(src, /line = max achievable/);
  assert.match(src, /dashed = ridge point \(where compute becomes the limit\)/);
  assert.match(src, /dots = this workload/);
  assert.match(src, /parameters × bytes per parameter/);
  assert.match(src, /2 × layers × kv heads × head dim/);
});

test('Neural Engine gate follows the documented path and does not change tok/s', () => {
  const chips = readJson('data/chips.json');
  const doc = readJson('data/models.json');
  const flat = chips.chips.map(E.flattenChip);
  const model = id => doc.models.find(m => m.id === id);
  const chip = id => flat.find(c => c.id === id);
  const srcKeys = new Set(Object.keys(chips.sources));
  function cites(rec) {
    for (const k of rec.src || []) assert.ok(srcKeys.has(k), (rec.id || rec.name || 'record') + ' missing source ' + k);
    for (const part of Object.values(rec.parts || {})) for (const k of part.src || []) assert.ok(srcKeys.has(k), 'part missing source ' + k);
    for (const b of rec.benchmarks || []) for (const k of b.src || []) assert.ok(srcKeys.has(k), 'benchmark missing source ' + k);
  }
  for (const m of doc.models) {
    assert.ok(m.ane, m.id + ' needs an ane record');
    cites(m.ane);
    assert.equal(typeof m.ane.viable, 'boolean');
  }
  for (const o of doc.aneOutside) cites(o);
  assert.equal(model('qwen3-8b').ane.viable, true);
  assert.equal(model('llama3-8b').ane.viable, false);
  assert.equal(model('llama3-70b').ane.viable, false);
  assert.equal(model('mixtral').ane.viable, false);
  assert.equal(model('qwen3-30b-a3b').ane.viable, false);
  assert.equal(model('qwen3-8b').ane.benchmarks.length, 0);
  const q = E.deriveModel(model('qwen3-8b'));
  const pro = chip('m5pro-18');
  const h100 = chip('h100');
  assert.equal(E.aneGate(q, pro, 'fp16', 4096).ok, true);
  assert.equal(E.aneGate(q, pro, 'fp8', 4096).ok, false);
  assert.match(E.aneGate(q, pro, 'fp8', 4096).reason, /No documented Neural Engine path for this precision/);
  assert.equal(E.aneGate(q, pro, 'fp16', 8192).ok, false);
  assert.equal(E.aneGate(q, pro, 'int4', 4096).ok, false);
  assert.equal(E.aneGate(q, h100, 'fp16', 4096).ok, false);
  assert.match(E.aneGate(q, h100, 'fp16', 4096).reason, /This chip has no Neural Engine/);
  assert.equal(E.aneGate(model('llama3-8b'), pro, 'fp16', 4096).ok, false);
  assert.match(model('llama3-70b').ane.why, /No documented Neural Engine path for this model\/size/);
  assert.equal(E.aneToggle(q, [h100, h100], 'fp16', 4096).ok, false);
  assert.equal(E.aneToggle(q, [pro, h100], 'fp16', 4096).ok, true);
  const on = E.decodeState('#m=qwen3-8b&p=fp16&ane=1', flat, doc.models);
  assert.equal(on.ane, true);
  assert.equal(on.prec, 'fp16');
  assert.match(E.encodeState(on, Object.fromEntries(flat.map(c => [c.id, c]))), /(?:^|&)ane=1(?:&|$)/);
  const blocked = E.decodeState('#m=qwen3-8b&ane=1', flat, doc.models);
  assert.equal(blocked.ane, false);
  assert.equal(blocked.prec, 'fp8');
  assert.equal(E.decodeState('#m=llama3-70b&p=fp16&ane=1', flat, doc.models).ane, false);
  const o = { prec:'fp16', B:1, L:4096, phase:'decode', N:1 };
  const est = E.estimate(q, pro, o);
  assert.equal(E.estimate(q, pro, o).tokUser, est.tokUser);
  const eng = fs.readFileSync(path.join(root, 'app/src/engine.js'), 'utf8');
  const body = eng.slice(eng.indexOf('function estimate('), eng.indexOf('function estimateRange'));
  assert.doesNotMatch(body, /\bane\b/);
  for (const id of ['m3ultra', 'm4max40', 'm4max32', 'm5pro-18', 'm6']) {
    const n = chips.chips.find(c => c.id === id).specs.neural;
    assert.equal(n.tag, 'V');
    assert.match(n.v, /Neural Engine/);
    assert.match(n.note, /unified-memory/);
    n.src.forEach(k => assert.ok(srcKeys.has(k), id + ' ' + k));
  }
  const ui = fs.readFileSync(path.join(root, 'app/src/ui.js'), 'utf8');
  assert.match(ui, /Run on Neural Engine/);
  assert.match(ui, /Bandwidth roofline, same unified memory/);
  assert.match(ui, /No published Neural Engine tok\/s/);
  const found = doc.aneOutside.find(o => o.id === 'apple-foundation-on-device');
  assert.equal(found.benchmarks[0].toks, 30);
  assert.match(found.benchmarks[0].device, /iPhone 15 Pro/);
  assert.match(found.benchmarks[0].note, /not applied/);
});

test('derived parameter totals stay near the published safetensors counts', () => {
  const models = readJson('data/models.json');
  for (const m of models.models) {
    const d = E.deriveModel(m);
    const rel = Math.abs(d.total - m.paramsHF) / m.paramsHF;
    assert.ok(rel < 0.01, m.id + ' rel ' + rel);
  }
});

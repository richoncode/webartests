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

test('derived parameter totals stay near the published safetensors counts', () => {
  const models = readJson('data/models.json');
  for (const m of models.models) {
    const d = E.deriveModel(m);
    const rel = Math.abs(d.total - m.paramsHF) / m.paramsHF;
    assert.ok(rel < 0.01, m.id + ' rel ' + rel);
  }
});

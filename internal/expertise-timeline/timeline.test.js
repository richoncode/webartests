'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const pagePath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(pagePath, 'utf8');

function extract(id, type) {
  const re = new RegExp('<script' + type + ' id="' + id + '">([\\s\\S]*?)</script>');
  const match = html.match(re);
  assert.ok(match, 'missing script ' + id);
  return match[1];
}

const data = JSON.parse(extract('story-data', ' type="application/json"'));
const sandbox = {};
vm.runInNewContext(extract('story-logic', ''), sandbox);
const api = sandbox.StoryAPI;

function byId(id) {
  return data.milestones.find(m => m.id === id);
}

test('chronology and source rules stay consistent', () => {
  const errors = Array.from(api.audit(data));
  assert.equal(errors.length, 0, errors.join('\n'));
  const amazon = data.employers.find(e => e.id === 'amazon');
  assert.equal(amazon.start, '2007-03');
  assert.equal(amazon.end, '2008-04');
  assert.equal(byId('kindle-api').thread === byId('sitb-pages').thread, false);
  assert.equal(byId('hughes-videodisc').thread === byId('hughes-3d').thread, false);
  assert.equal(byId('hughes-videodisc').start, '1990-04');
  assert.notEqual(byId('hughes-videodisc').start, '1989-04');
  assert.match(data.questions.find(q => q.id === 'q-hughes').datedNote, /1989/);
  assert.ok(byId('sitb-pages').start < amazon.start);
  assert.equal(byId('kindle-api').evidence.includes('confirmed-by-richard'), true);
  assert.equal(byId('azure-storage').summary.includes('personal deployment') ||
    byId('azure-storage').detail.join(' ').includes('personal deployment'), true);
});

test('each lane has at least one milestone', () => {
  assert.equal(data.tracks.length, 4);
  for (const track of data.tracks) {
    const n = data.milestones.filter(m => m.tracks.includes(track.id)).length;
    assert.ok(n >= 1, track.id + ' is empty');
  }
  const threads = new Map();
  for (const m of data.milestones) {
    const set = threads.get(m.thread) || new Set();
    m.tracks.forEach(t => set.add(t));
    threads.set(m.thread, set);
  }
  assert.ok([...threads.values()].some(set => set.size >= 2));
});

test('year numbers are hidden by default and shown only when asked', () => {
  const hidden = api.initialState(data);
  assert.equal(hidden.showYears, false);
  const hiddenText = api.flatten(api.viewModel(data, hidden)).join('\n');
  assert.doesNotMatch(hiddenText, api.YEAR_RE);
  assert.match(hiddenText, /Year numbers are hidden/);
  assert.match(hiddenText, /Heterogeneous compute/);
  assert.match(hiddenText, /Multidevice UX/);
  assert.match(hiddenText, /Multimodal authoring/);
  assert.match(hiddenText, /External-device control/);
  assert.match(hiddenText, /Open questions/);

  for (const milestone of data.milestones) {
    assert.equal(api.formatSpan(milestone, false), '');
    const state = api.initialState(data);
    state.selected = milestone.id;
    const detail = api.viewModel(data, state).detail.join('\n');
    assert.doesNotMatch(detail, api.YEAR_RE, milestone.id);
    state.showYears = true;
    const shown = api.viewModel(data, state).detail.join('\n');
    if (milestone.placement === 'undated') assert.doesNotMatch(shown, api.YEAR_RE, milestone.id);
    else assert.match(shown, api.YEAR_RE, milestone.id);
  }

  const on = api.initialState(data);
  on.showYears = true;
  on.selected = 'prosthetic';
  const onText = api.flatten(api.viewModel(data, on)).join('\n');
  assert.match(onText, /Year numbers are shown/);
  assert.match(onText, /\b1991\b/);
  assert.match(onText, /\b2007\b/);
  assert.match(onText, /Amazon\.com/);
  assert.match(onText, /1989/);
  assert.doesNotMatch(onText, /Vice President|Senior Software|Principal Consultant|@/);
});

test('the page is an unlisted internal draft and is not in the public catalog', () => {
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /Internal working draft/);
  assert.match(html, /not access-controlled/);
  assert.match(html, /Unlisted/);
  const publicFiles = [
    'index.html',
    'shared/data/experiments.json',
    'features.json',
    'experiments/index.html'
  ];
  for (const rel of publicFiles) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const body = fs.readFileSync(file, 'utf8');
    assert.equal(body.includes('internal/expertise-timeline'), false, rel);
  }
  assert.doesNotMatch(html, /mailto:|@[a-z0-9.-]+\.[a-z]{2,}/i);
  const labels = data.sources.map(s => s.url).filter(Boolean);
  for (const url of [
    'https://github.com/richoncode/portfolio',
    'https://richoncode.github.io/portfolio/',
    'https://richoncode.github.io/portfolio/assets/archive/interaction-timeline.html',
    'https://patents.google.com/patent/US6677962B1'
  ]) {
    assert.ok(labels.includes(url), url);
  }
});

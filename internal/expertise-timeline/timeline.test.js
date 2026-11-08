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

test('year numbers default on, and an 18-month window can hide them again', () => {
  const state = api.initialState(data);
  assert.equal(state.showYears, true);
  assert.equal(state.fitted, false);
  assert.equal(state.windowMonths, 18);
  assert.equal(api.WINDOW_MONTHS, 18);
  const shownDefault = api.flatten(api.viewModel(data, state)).join('\n');
  assert.match(shownDefault, /Year numbers are shown/);
  assert.match(shownDefault, /\b1986\b/);
  assert.match(shownDefault, /Open questions/);

  const span = api.axisSpanMonths(data);
  const view = 720;
  const width = api.trackWidthForMonths(data, view, 18);
  assert.ok(Math.abs(api.monthsInView(data, width, view) - 18) < 0.05);
  const atEnd = width - view;
  assert.ok(atEnd > view, '18 months is wider than the viewport so history can scroll');
  const rightFrac = (atEnd + view) / width;
  assert.ok(Math.abs(rightFrac - 1) < 0.001);

  const oldWidth = 4000;
  const scrollLeft = 2500;
  const pointer = 120;
  const frac = (scrollLeft + pointer) / oldWidth;
  const nextWidth = oldWidth * 1.4;
  const nextScroll = api.zoomScroll(oldWidth, nextWidth, scrollLeft, pointer);
  assert.ok(Math.abs((nextScroll + pointer) / nextWidth - frac) < 1e-9);

  state.showYears = false;
  const hiddenText = api.flatten(api.viewModel(data, state)).join('\n');
  assert.doesNotMatch(hiddenText, api.YEAR_RE);
  assert.match(hiddenText, /Year numbers are hidden/);
  assert.match(hiddenText, /Heterogeneous compute/);

  for (const milestone of data.milestones) {
    assert.equal(api.formatSpan(milestone, false), '');
    const off = api.initialState(data);
    off.showYears = false;
    off.selected = milestone.id;
    assert.doesNotMatch(api.viewModel(data, off).detail.join('\n'), api.YEAR_RE, milestone.id);
    assert.doesNotMatch(api.popoutLines(data, milestone, false).join('\n'), api.YEAR_RE, milestone.id);
    const popOn = api.popoutLines(data, milestone, true).join('\n');
    assert.match(popOn, new RegExp(milestone.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    if (milestone.summary) assert.match(popOn, /.{12,}/);
    if (milestone.placement === 'undated') assert.doesNotMatch(popOn, api.YEAR_RE, milestone.id);
    else assert.match(popOn, api.YEAR_RE, milestone.id);
    const on = api.initialState(data);
    on.selected = milestone.id;
    const detail = api.viewModel(data, on).detail.join('\n');
    if (milestone.placement === 'undated') assert.doesNotMatch(detail, api.YEAR_RE, milestone.id);
    else assert.match(detail, api.YEAR_RE, milestone.id);
  }

  const prosthetic = api.popoutLines(data, data.milestones.find(m => m.id === 'prosthetic'), true).join('\n');
  assert.match(prosthetic, /1991/);
  assert.match(prosthetic, /New Resolutions/);
  assert.match(prosthetic, /10 mW/);
  assert.doesNotMatch(prosthetic, /Vice President|Senior Software|Principal Consultant/);

  const on = api.initialState(data);
  on.selected = 'prosthetic';
  const onText = api.flatten(api.viewModel(data, on)).join('\n');
  assert.match(onText, /\b2007\b/);
  assert.match(onText, /Amazon\.com/);
  assert.match(onText, /1989/);
  assert.doesNotMatch(onText, /Vice President|Senior Software|Principal Consultant|@/);
  assert.match(html, /id="toggle-years" aria-pressed="true"/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no/);
});

test('the timeline and its controls come before the questions', () => {
  const fitAt = html.indexOf('id="fit"');
  const zoomAt = html.indexOf('id="zoom-in"');
  const timelineAt = html.indexOf('id="timeline"');
  const questionsAt = html.indexOf('id="questions"');
  const introAt = html.indexOf('id="intro"');
  assert.ok(fitAt > 0 && zoomAt > fitAt && timelineAt > zoomAt);
  assert.ok(timelineAt < questionsAt);
  assert.ok(questionsAt < introAt);
  assert.match(html, /<html lang="en" data-theme="dark">/);
  assert.match(html, /expertise-timeline-theme/);
  assert.match(html, /id="toggle-theme"/);
  assert.doesNotMatch(html, /prefers-color-scheme/);
  assert.doesNotMatch(html, /matchMedia/);
  assert.match(html, /Open questions/);
  assert.match(html, /Evidence/);
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

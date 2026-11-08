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

test('year numbers default on, and the 4 year window can hide them again', () => {
  const state = api.initialState(data);
  assert.equal(state.showYears, true);
  assert.equal(state.fitted, false);
  assert.equal(state.scale, 1);
  assert.equal(state.windowMonths, 48);
  assert.equal(api.WINDOW_MONTHS, 48);
  assert.equal(api.scaleReadout(1, 48, false), '4 years · 1×');
  const shownDefault = api.flatten(api.viewModel(data, state)).join('\n');
  assert.match(shownDefault, /Year numbers are shown/);
  assert.match(shownDefault, /\b1986\b/);
  assert.match(shownDefault, /Open questions/);

  const span = api.axisSpanMonths(data);
  const view = 720;
  const width = api.trackWidthForMonths(data, view, 48);
  assert.ok(Math.abs(api.monthsInView(data, width, view) - 48) < 0.05);
  const atEnd = width - view;
  assert.ok(atEnd > view, '4 years is wider than the viewport so history can scroll');
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
  const detailAt = html.indexOf('id="detail"');
  assert.ok(timelineAt < detailAt && detailAt < questionsAt);
  assert.ok(questionsAt < introAt);
  assert.match(html, /id="label-col"/);
  assert.match(html, /id="plot"/);
  assert.match(html, /class="sheet"/);
  assert.match(html, /class="prose"/);
  assert.doesNotMatch(html, /max-width:\s*1180px/);
  assert.doesNotMatch(html, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*320px/);
  assert.match(html, /<html lang="en" data-theme="dark">/);
  assert.match(html, /expertise-timeline-theme/);
  assert.match(html, /id="toggle-theme"/);
  assert.doesNotMatch(html, /prefers-color-scheme/);
  assert.doesNotMatch(html, /matchMedia/);
  assert.match(html, /Open questions/);
  assert.match(html, /Evidence/);
});

test('quarter labels sit in each calendar quarter and hide when the scale is tight', () => {
  const span = api.axisSpanMonths(data);
  const axisStart = 1986 * 12;
  const wide = api.trackWidthForMonths(data, 1200, 48);
  const marks = api.quarterMarks(data, wide, true).filter(m => m.label);
  assert.ok(marks.length > 4);
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(label => {
    assert.ok(marks.some(m => m.label === label), label);
  });
  function expectCenter(year, quarter) {
    const center = year * 12 + (quarter - 1) * 3 + 1.5;
    const left = (center - axisStart) / span * wide;
    const found = marks.find(m => Math.abs(m.left - left) < 1);
    assert.ok(found, 'missing Q' + quarter + ' ' + year);
    assert.equal(found.label, 'Q' + quarter);
  }
  expectCenter(2025, 1);
  expectCenter(2025, 2);
  expectCenter(2025, 3);
  expectCenter(2025, 4);
  const q1 = marks.find(m => m.label === 'Q1' && Math.abs(m.left - ((2025 * 12 + 1.5 - axisStart) / span * wide)) < 1);
  const q2 = marks.find(m => m.label === 'Q2' && Math.abs(m.left - ((2025 * 12 + 4.5 - axisStart) / span * wide)) < 1);
  assert.ok(q2.left - q1.left > api.QUARTER_MIN_PX);

  const fitted = api.quarterMarks(data, 1100, true).filter(m => m.label);
  assert.equal(fitted.length, 0);
  const hidden = api.quarterMarks(data, wide, false).filter(m => m.label);
  assert.equal(hidden.length, 0);
  const off = api.initialState(data);
  off.showYears = false;
  off.trackWidth = wide;
  assert.equal(api.viewModel(data, off).quarters.length, 0);
  assert.doesNotMatch(api.flatten(api.viewModel(data, off)).join('\n'), /\bQ[1-4]\b/);
  const on = api.initialState(data);
  on.trackWidth = wide;
  const labels = api.viewModel(data, on).quarters.map(q => q.label);
  assert.ok(labels.includes('Q1') && labels.includes('Q4'));
});

test('zoom scale runs from 0.2× to 200× around the 4 year default', () => {
  assert.equal(api.SCALE_MIN, 0.2);
  assert.equal(api.SCALE_MAX, 200);
  assert.equal(api.visibleMonthsForScale(1), 48);
  assert.ok(Math.abs(api.visibleMonthsForScale(0.2) - 240) < 1e-9);
  assert.ok(Math.abs(api.visibleMonthsForScale(200) - 48 / 200) < 1e-9);
  assert.equal(api.clampScale(0.01), 0.2);
  assert.equal(api.clampScale(900), 200);
  assert.equal(api.clampScale(1), 1);
  const span = api.axisSpanMonths(data);
  const fitScale = 48 / span;
  assert.ok(fitScale < 0.2);
  assert.equal(api.scaleReadout(fitScale, span, true), 'Full span · Fit');
  assert.equal(api.scaleReadout(1, 48, false), '4 years · 1×');
  assert.doesNotMatch(api.scaleReadout(200, 48 / 200, false), api.YEAR_RE);
  assert.doesNotMatch(api.scaleReadout(0.2, 240, false), api.YEAR_RE);
  assert.equal(api.PINCH_COMPRESS_POWER, 3);
  assert.ok(Math.abs(api.pinchScale(1, 0.8) - Math.pow(0.8, 3)) < 1e-12);
  assert.equal(api.pinchScale(1, 0.5), 0.2);
  assert.ok(Math.abs(api.pinchScale(4, 0.5) - 4 * Math.pow(0.5, 3)) < 1e-12);
  assert.ok(Math.abs(api.pinchScale(1, 2) - 2) < 1e-12);
  assert.equal(api.pinchScale(1, 1), 1);
  assert.equal(api.pinchScale(1, 0.01), 0.2);
  assert.equal(api.pinchScale(150, 2), 200);
  const compressed = api.pinchScale(1, api.wheelRatio(80));
  const split = api.pinchScale(1, api.wheelRatio(30 + 50));
  assert.ok(Math.abs(compressed - split) < 1e-12);
  const after = api.pinchScale(1, 0.8);
  assert.ok(Math.abs(api.pinchScale(after, 0.8) - after * Math.pow(0.8, 3)) < 1e-12);

  const axisStart = 1986 * 12;
  const axisEnd = axisStart + span;
  const viewStart = axisEnd - 48;
  const pointerFrac = 0.25;
  const focal = viewStart + pointerFrac * 48;
  const nextVisible = 48 / 200;
  const nextStart = api.zoomViewStart(viewStart, 48, nextVisible, pointerFrac, axisStart, axisEnd);
  assert.ok(Math.abs((nextStart + pointerFrac * nextVisible) - focal) < 1e-6);
  assert.ok(nextStart >= axisStart && nextStart + nextVisible <= axisEnd + 1e-6);

  const widened = api.zoomViewStart(axisEnd - 4, 4, 240, 0.9, axisStart, axisEnd);
  assert.equal(widened, axisEnd - 240);
  const atLeft = api.zoomViewStart(axisStart + 1, 8, 240, 0.1, axisStart, axisEnd);
  assert.equal(atLeft, axisStart);

  const capped = api.layoutWidth(1200, 48 / 200, span);
  assert.ok(capped <= api.MAX_LAYOUT_PX);
  assert.ok(capped < 1200 * span / (48 / 200));
  const quarterPx = 1200 * 3 / (48 / 200);
  assert.ok(quarterPx > api.QUARTER_MIN_PX);
  const fittedQuarter = api.quarterMarks(data, 1400, true).filter(m => m.label);
  assert.equal(fittedQuarter.length, 0);
});

test('year labels follow the visible plot, including a year whose January is off screen', () => {
  const span = api.axisSpanMonths(data);
  const axisStart = 1986 * 12;
  const axisEnd = axisStart + span;
  function labeled(viewStart, visible, width, showYears = true) {
    const state = api.initialState(data);
    state.viewStart = viewStart;
    state.visibleMonths = visible;
    state.trackWidth = width;
    state.showYears = showYears;
    return api.viewModel(data, state).ticks.filter(t => t.year);
  }
  function expectYears(viewStart, visible, width, years) {
    const ticks = labeled(viewStart, visible, width);
    ticks.forEach((tick, index) => {
      if (index === 0) return;
      assert.ok(tick.label >= ticks[index - 1].label + api.YEAR_LABEL_PX - 0.01);
    });
    ticks.forEach(tick => {
      assert.ok(tick.label >= 2);
      assert.ok(tick.label + api.YEAR_LABEL_PX <= width - 1, tick.year + ' falls off a ' + width + 'px plot');
    });
    assert.equal(ticks.map(t => String(t.year)).join(','), years.join(','));
    return ticks;
  }

  assert.ok(!data.axis.ticks.includes('2023'));
  assert.ok(!data.axis.ticks.includes('2024'));
  assert.ok(!data.axis.ticks.includes('2025'));
  expectYears(axisEnd - 48, 48, 1250, ['2023', '2024', '2025', '2026']);
  expectYears(axisEnd - 48, 48, 252, ['2023', '2024', '2025', '2026']);
  expectYears(axisStart, 48, 1250, ['1986', '1987', '1988', '1989']);

  const mid = expectYears(2000 * 12 + 6, 48, 1100, ['2000', '2001', '2002', '2003', '2004']);
  assert.equal(mid[0].context, true);
  assert.equal(mid[0].left, null);
  assert.equal(typeof mid[1].left, 'number');

  const sliver = expectYears(1995 * 12 + 6, 48, 252, ['1995', '1996', '1997', '1998', '1999']);
  assert.equal(sliver[0].context, true);

  // Published behavior named a year only when its January was in data.axis.ticks.
  // March 2018–March 2022 holds about four years of quarters and only January 2022 from that list.
  const before2022 = 2018 * 12 + 2;
  const listed = data.axis.ticks.filter(year => {
    const january = Number(year) * 12;
    return january >= before2022 - 0.2 && january <= before2022 + 48 + 0.2;
  });
  assert.deepEqual(listed, ['2022']);
  const scrolled = expectYears(before2022, 48, 1250, ['2018', '2019', '2020', '2021', '2022']);
  assert.equal(scrolled[0].context, true);
  assert.equal(scrolled[0].left, null);
  assert.equal(typeof scrolled.find(tick => String(tick.year) === '2022').left, 'number');
  const scrolledQuarters = api.viewModel(data, Object.assign(api.initialState(data), {
    viewStart: before2022, visibleMonths: 48, trackWidth: 1250, showYears: true
  })).quarters;
  assert.ok(scrolledQuarters.length >= 12);

  const fitted = expectYears(axisStart, span, 1200, labeled(axisStart, span, 1200).map(t => t.year));
  assert.ok(fitted.length > data.axis.ticks.length);
  assert.ok(fitted.length < 2026 - 1986 + 1);
  assert.equal(fitted[0].year, '1986');
  assert.ok(fitted.some(t => t.year === '2026'));
  assert.ok(!fitted.map(t => t.year).includes('1987'));
  const fittedPhone = labeled(axisStart, span, 280);
  assert.ok(fittedPhone.length >= 2 && fittedPhone.length < fitted.length);
  assert.equal(fittedPhone[0].year, '1986');
  assert.ok(!fittedPhone.some(t => t.year === '1987'));

  const zoomed = expectYears(axisEnd - 0.24, 0.24, 1250, ['2026']);
  assert.equal(zoomed[0].context, true);
  assert.equal(zoomed[0].left, null);

  const hidden = labeled(axisEnd - 48, 48, 1250, false);
  assert.equal(hidden.length, 0);
  const off = api.initialState(data);
  off.viewStart = axisEnd - 48;
  off.visibleMonths = 48;
  off.trackWidth = 1250;
  off.showYears = false;
  const model = api.viewModel(data, off);
  assert.ok(model.ticks.length >= 4);
  assert.ok(model.ticks.every(t => t.year === ''));
  assert.equal(model.quarters.length, 0);
  assert.doesNotMatch(api.flatten(model).join('\n'), api.YEAR_RE);
  const onQuarters = api.viewModel(data, Object.assign(api.initialState(data), {
    viewStart: axisEnd - 48, visibleMonths: 48, trackWidth: 1250, showYears: true
  })).quarters.map(q => q.label);
  assert.ok(onQuarters.includes('Q1') && onQuarters.includes('Q4'));
});

test('each block titles the work that belongs on its lane', () => {
  const nicknames = /^(Sports|Viewing|Fan agent|Sessions|Frameworks)$/;
  for (const milestone of data.milestones) {
    assert.ok(milestone.laneCopy, milestone.id);
    const titles = [];
    for (const track of milestone.tracks) {
      const face = milestone.laneCopy[track];
      assert.ok(face && face.title.length >= 24, milestone.id + ' ' + track);
      assert.ok(face.subtitle && face.subtitle.length >= 12, milestone.id + ' ' + track);
      assert.doesNotMatch(face.title + ' ' + face.subtitle, api.YEAR_RE, milestone.id);
      assert.doesNotMatch(face.title + ' ' + face.subtitle, /local\s*(?:&|and)\s*remot/i, milestone.id);
      assert.doesNotMatch(face.title, nicknames, milestone.id);
      titles.push(face.title);
    }
    assert.equal(new Set(titles).size, titles.length, milestone.id);
  }
  const span = api.axisSpanMonths(data);
  const axisEnd = 1986 * 12 + span;
  const state = api.initialState(data);
  state.viewStart = axisEnd - 48;
  state.visibleMonths = 48;
  state.trackWidth = 1250;
  const bars = api.viewModel(data, state).lanes.flatMap(lane => lane.bars);
  const byId = Object.fromEntries(bars.map(bar => [bar.id, bar]));
  assert.equal(bars.length, 3);
  for (const id of ['quintar-renderer', 'quintar-share', 'quintar-agent']) {
    assert.ok(byId[id].showText, id);
    assert.doesNotMatch(byId[id].headline, nicknames);
    assert.ok(byId[id].subtitle);
    assert.ok(byId[id].when);
    assert.ok(byId[id].height >= byId[id].titleLines * 16 + 15);
    assert.match(byId[id].aria, new RegExp(byId[id].headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.equal(new Set(['quintar-renderer', 'quintar-share', 'quintar-agent'].map(id => byId[id].headline)).size, 3);
  const share = data.milestones.find(m => m.id === 'quintar-share');
  const pop = api.popoutLines(data, share, true).join('\n');
  assert.match(pop, /Simultaneous multiuser sports viewing/);
  assert.match(pop, /Quintar/);
  assert.match(pop, new RegExp(share.laneCopy.multidevice.title));
  assert.match(pop, /September 2022/);
  assert.doesNotMatch(api.popoutLines(data, share, false).join('\n'), api.YEAR_RE);
  const sessions = data.milestones.find(m => m.id === 'magic-leap-devices');
  const shared = data.milestones.find(m => m.id === 'niantic-shared');
  assert.notEqual(sessions.laneCopy.multidevice.title, shared.laneCopy.multidevice.title);
  assert.doesNotMatch(sessions.laneCopy.multidevice.title, /^(Sessions|Shared AR)$/);
  assert.doesNotMatch(shared.laneCopy.multidevice.title, /^(Sessions|Shared AR)$/);
  assert.equal(sessions.org === shared.org, false);
  assert.ok(data.questions.some(q => q.id === 'q-shared-session' && q.refs.includes('magic-leap-devices') && q.refs.includes('niantic-shared')));
  assert.doesNotMatch(html, /b\.title\s*=\s*bar\.aria/);
  const limb = data.milestones.find(m => m.id === 'prosthetic');
  assert.notEqual(limb.laneCopy.compute.title, limb.laneCopy.control.title);
  assert.match(api.popoutLines(data, limb, true).join('\n'), /10 mW/);

  const narrow = api.initialState(data);
  narrow.viewStart = 1990 * 12 + 3;
  narrow.visibleMonths = 48;
  narrow.trackWidth = 220;
  const hughes = api.viewModel(data, narrow).lanes.flatMap(lane => lane.bars).find(bar => bar.id === 'hughes-videodisc');
  assert.ok(hughes);
  assert.equal(hughes.showText, false);
  assert.match(hughes.aria, /videodisc/);
  assert.ok(hughes.height < 30);

  const wide = api.initialState(data);
  wide.viewStart = 1990 * 12;
  wide.visibleMonths = 48;
  wide.trackWidth = 900;
  const shown = api.viewModel(data, wide).lanes.flatMap(lane => lane.bars).find(bar => bar.id === 'hughes-videodisc');
  assert.equal(shown.showText, true);
  assert.ok(shown.titleLines >= 1 && shown.subLines >= 1);
  assert.ok(shown.height > 52);
  const offAxis = api.viewModel(data, state).undated.find(card => card.id === 'agentic-authoring');
  assert.match(offAxis.title, /intent/);
  assert.doesNotMatch(offAxis.title, /Agentic authoring pipelines/);
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

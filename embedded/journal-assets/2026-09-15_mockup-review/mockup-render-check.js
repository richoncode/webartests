// Execute the mockup's own script against a minimal DOM, over every control
// combination, so a stale call site or missing id fails here instead of on screen.
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const OPTS = {
  day: ['1','2','6'],
  cond: ['clear','partly','cloud','rain','fog'],
  lch: ['none','green','yellow','blue','hidden','landing'],
  quote: ['0','1','2'],
  filt: ['','0','1','2'],
  evt: ['', "cake|RICHARD'S BIRTHDAY", 'eagle|CALIFORNIA WILDLIFE DAY'],
  aqi: ['30','78','164'],
  bat: ['78','11','100'],
  days: ['ok','learning'],
  grid: ['off','on'],
};
let combos = 0, minFc = 1e9;
function run(state) {
  const nodes = {};
  const mk = id => nodes[id] || (nodes[id] = {
    id, value: state[id] !== undefined ? state[id] : '',
    textContent: '', innerHTML: '', className: '',
    style: {}, firstChild: { nodeValue: '' },
    listeners: {},
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
  });
  // The page listens on document for the arrow keys, so the fake one has to
  // accept a listener rather than throw.
  global.document = { getElementById: mk, addEventListener() {} };
  // The page checks location.hash to decide whether to pull live data, and
  // there is no network here: an empty hash keeps it on the sample set.
  global.location = { hash: '' };
  new Function(src)();
  if (!nodes.panel.innerHTML.includes('class="box')) throw new Error('panel rendered nothing');
  if (!nodes.gtable.innerHTML.includes('forecast')) throw new Error('geometry table missing forecast');
  // The band is no longer optional: every combination must put something there.
  const band = nodes.panel.innerHTML;
  if (!band.includes('class="box lch') && !band.includes('class="box quote'))
    throw new Error('band drew neither a launch nor a quote');
  // The sources strip is always there, and always the last 18 px of the panel.
  const sr = /src (\d+),(\d+),(\d+),(\d+)/.exec(band);
  if (!sr) throw new Error('no source strip');
  if (+sr[2] + +sr[4] !== 480) throw new Error('source strip does not reach the bottom edge');
  // The strip still has to clear the height its contents need.
  const fc = /fc0 (\d+),(\d+),(\d+),(\d+)/.exec(band);
  if (!fc) throw new Error('no forecast geometry');
  if (+fc[4] < 104) throw new Error('forecast column squeezed to ' + fc[4] + 'px, needs 104');
  minFc = Math.min(minFc, +fc[4]);
  combos++;
  return nodes;
}

// Walk the tour by clicking Next, which is the only way to be sure every named
// state renders — the sweep above can only reach states the controls can hold.
function walkTour() {
  const nodes = run({ day: '2', cond: 'clear', lch: 'none', quote: '0', evt: '',
                      aqi: '30', bat: '78', filt: '', days: 'ok', grid: 'off' });
  const next = nodes.next && nodes.next.listeners.click;
  if (!next) throw new Error('no Next button, or it has no click handler');
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    next.forEach(fn => fn());
    const label = nodes.twhat.textContent, count = nodes.tcount.textContent;
    if (!label) throw new Error('tour state ' + count + ' has no description');
    if (!nodes.panel.innerHTML.includes('class="box')) throw new Error('tour state ' + count + ' rendered nothing');
    const fc = /fc0 \d+,\d+,\d+,(\d+)/.exec(nodes.panel.innerHTML);
    if (!fc || +fc[1] < 104) throw new Error('tour state ' + count + ' squeezed the strip to ' + (fc && fc[1]));
    if (seen.has(count)) break;
    seen.add(count);
  }
  console.log(`tour walks ${seen.size} named states, every one of them renders`);
}
for (const day of OPTS.day) for (const cond of OPTS.cond) for (const lch of OPTS.lch)
  for (const quote of OPTS.quote) for (const evt of OPTS.evt) for (const aqi of OPTS.aqi)
    for (const bat of OPTS.bat) for (const days of OPTS.days) for (const filt of OPTS.filt) {
      const st = {day, cond, lch, quote, evt, aqi, bat, filt, days, grid: 'off'};
      try { run(st); }
      catch (e) { console.log('FAILED', st, '->', e.message); process.exit(1); }
    }
walkTour();
console.log(`mockup renders cleanly across ${combos} control combinations`);
console.log(`tightest forecast column across all of them: ${minFc}px (needs 104)`);

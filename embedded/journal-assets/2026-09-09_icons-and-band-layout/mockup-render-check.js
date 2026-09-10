// Execute the mockup's own script against a minimal DOM, over every control
// combination, so a stale call site or missing id fails here instead of on screen.
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const OPTS = {
  day: ['1','2','6'],
  cond: ['clear','partly','cloud','rain','fog'],
  lch: ['none','prime','late','landing'],
  evt: ['', "cake|RICHARD'S BIRTHDAY", 'eagle|CALIFORNIA WILDLIFE DAY'],
  aqi: ['30','78','164'],
  bat: ['78','11','100'],
  days: ['ok','learning'],
  grid: ['off','on'],
};
let combos = 0;
function run(state) {
  const nodes = {};
  const mk = id => nodes[id] || (nodes[id] = {
    value: state[id] !== undefined ? state[id] : '',
    textContent: '', innerHTML: '', className: '',
    style: {}, firstChild: { nodeValue: '' },
    addEventListener() {},
  });
  global.document = { getElementById: mk };
  new Function(src)();
  if (!nodes.panel.innerHTML.includes('class="box')) throw new Error('panel rendered nothing');
  if (!nodes.gtable.innerHTML.includes('forecast')) throw new Error('geometry table missing forecast');
  combos++;
}
for (const day of OPTS.day) for (const cond of OPTS.cond) for (const lch of OPTS.lch)
  for (const evt of OPTS.evt) for (const aqi of OPTS.aqi) for (const bat of OPTS.bat)
    for (const days of OPTS.days) {
      try { run({day, cond, lch, evt, aqi, bat, days, grid: 'off'}); }
      catch (e) { console.log('FAILED', {day, cond, lch, evt, aqi, bat, days}, '->', e.message); process.exit(1); }
    }
console.log(`mockup renders cleanly across ${combos} control combinations`);

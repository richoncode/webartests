// Render every tour state and lay them out as a contact sheet, so all 31 can be
// looked at rather than clicked through. Uses the mockup's own script against a
// minimal DOM, so what appears here is what the page produces.
const fs = require('fs');
const path = process.argv[2], out = process.argv[3] || 'sheet.html';
const html = fs.readFileSync(path, 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];

const nodes = {};
const mk = id => nodes[id] || (nodes[id] = {
  id, value: '', textContent: '', innerHTML: '', className: '',
  style: {}, firstChild: { nodeValue: '' }, listeners: {},
  addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
});
global.document = { getElementById: mk, addEventListener() {} };
global.location = { hash: '' };   // no network here; stay on the sample set
new Function(src)();

const states = [];
const next = nodes.next.listeners.click;
const first = nodes.tcount.textContent;
for (let i = 0; i < 100; i++) {
  states.push({ n: nodes.tcount.textContent, what: nodes.twhat.textContent, html: nodes.panel.innerHTML });
  next.forEach(fn => fn());
  if (nodes.tcount.textContent === first) break;
}

const body = states.map(s =>
  `<figure><figcaption>${s.n} &middot; ${s.what}</figcaption>` +
  `<div class="frame"><div class="panel">${s.html}</div></div></figure>`).join('\n');

fs.writeFileSync(out,
`<!doctype html><meta charset=utf-8><title>tour contact sheet</title><style>${css}
body{padding:24px}
figure{margin:0 0 26px}
figcaption{font-family:'SF Mono',monospace;font-size:12px;color:#5b9bd5;margin-bottom:8px}
.frame{margin:0}
</style><body>${body}</body>`);
console.log(`${states.length} states -> ${out}`);

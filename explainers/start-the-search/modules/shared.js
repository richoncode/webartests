window.TT = {
  idea: { w0: 1.6, step: 0.34, pulseAt: 5 },
  guess: { w0: 2.2, step: 0.3, launch: [4, 8, 15] },
  cacheHit: 5.6,
  ans: { wait: 4.8, idea: 5.0, guess: 7.8, analogy: 4.3, cache: 5.0, result: [1.4, 2.75] },
  result: [0.3, 2.0],
  twist: [1.0, 2.2]
};
window.UI = {
  chip() {
    return '<rect class="hot" x="-120" y="-38" width="240" height="76" rx="38"/>' +
      '<circle cx="-62" cy="-6" r="17" style="fill:none;stroke:var(--ground);stroke-width:7"/>' +
      '<line x1="-50" y1="6" x2="-36" y2="20" style="stroke:var(--ground);stroke-width:8;stroke-linecap:round"/>' +
      '<circle class="bg chip-dot" cx="8" cy="0" r="8"/><circle class="bg chip-dot" cx="40" cy="0" r="8"/><circle class="bg chip-dot" cx="72" cy="0" r="8"/>' + window.UI.check();
  },
  check() {
    return '<path class="chip-check" d="M14 0 L34 18 L72 -18" style="fill:none;stroke:var(--ground);stroke-width:9;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:82;stroke-dashoffset:82;opacity:0"/>';
  },
  dots(g, t, on, doneAt) {
    var d = g.querySelectorAll('.chip-dot'), c = g.querySelector('.chip-check');
    var k = doneAt == null ? 0 : Math.min(1, Math.max(0, (t - doneAt) / 0.3));
    for (var i = 0; i < d.length; i++) d[i].style.opacity = (on && k === 0 ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 7 - i * 0.9)) : 1) * (k > 0 ? 0 : 1);
    if (c) { c.style.opacity = k > 0 ? 1 : 0; c.style.strokeDashoffset = String(82 * (1 - k)); }
  },
  answer() {
    return '<path class="hot" d="M-48 -32 H48 Q60 -32 60 -20 V16 Q60 28 48 28 H-24 L-40 44 L-38 28 H-48 Q-60 28 -60 16 V-20 Q-60 -32 -48 -32 Z"/>' +
      '<rect class="bg ans-l" x="-40" y="-18" width="70" height="8" rx="4"/><rect class="bg ans-l" x="-40" y="-4" width="54" height="8" rx="4"/><rect class="bg ans-l" x="-40" y="10" width="40" height="8" rx="4"/>';
  },
  pop(g, t, t0, x, y, s) {
    var p = Math.min(1, Math.max(0, (t - t0) / 0.4));
    var b = p <= 0 ? 0 : 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2);
    g.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + (s || 1) * b + ')');
    g.style.opacity = p > 0 ? 1 : 0;
    var ls = g.querySelectorAll('.ans-l');
    for (var i = 0; i < ls.length; i++) {
      var q = Math.min(1, Math.max(0, (t - t0 - 0.3 - i * 0.15) / 0.3));
      ls[i].style.transformOrigin = '-40px 0px'; ls[i].style.transformBox = 'view-box';
      ls[i].setAttribute('transform', 'translate(-40 0) scale(' + q + ' 1) translate(40 0)');
    }
  },
  split(el) {
    var w = el.textContent.split(' ');
    el.textContent = '';
    return w.map(function (s) { var sp = document.createElement('span'); sp.textContent = s; el.appendChild(sp); return sp; });
  },
  stream(spans, t, t0, step) {
    for (var i = 0; i < spans.length; i++) {
      var p = Math.min(1, Math.max(0, (t - (t0 + i * step)) / 0.14));
      spans[i].style.opacity = p;
      spans[i].style.transform = 'translateY(' + (1 - p) * 12 + 'px)';
    }
  }
};
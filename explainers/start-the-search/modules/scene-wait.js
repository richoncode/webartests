const { seg, eo, eio, lerp, TextFx } = kit;
const WAIT = [
  { tag: 'LISTEN', x: 320, w: 150, a: 0.9, b: 1.5 },
  { tag: 'PICK TOOL', x: 470, w: 100, a: 1.5, b: 1.9 },
  { tag: 'SEARCH', x: 570, w: 250, a: 1.9, b: 3.9, slow: true },
  { tag: 'ANSWER', x: 820, w: 100, a: 3.9, b: 4.3 },
  { tag: 'SPEAK', x: 920, w: 70, a: 4.3, b: 4.7 }
];
kit.scene('wait', {
  init(kit) {
    var svg = '', tags = '';
    WAIT.forEach(function (r, i) {
      var y = 720 + i * 100;
      svg += '<rect class="rail" x="320" y="' + y + '" width="670" height="64" rx="16"/>';
      svg += '<rect class="' + (r.slow ? 'dim' : 'blk') + ' wait-b" x="' + r.x + '" y="' + y + '" width="' + r.w + '" height="64" rx="16"/>';
      tags += '<p class="tag wait-t" style="position:absolute;margin:0;left:90px;top:' + (y + 16) + 'px">' + r.tag + '</p>';
    });
    svg += '<g class="wait-ans">' + window.UI.answer() + '</g>';
    svg += '<g class="wait-clock"><circle r="28" class="bg" style="stroke:var(--ink);stroke-width:6"/><line class="wait-hand" x1="0" y1="0" x2="0" y2="-17" style="stroke:var(--ink);stroke-width:6;stroke-linecap:round"/><circle r="4" class="blk"/></g>';
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div><svg class="art" viewBox="0 0 1080 1350">' + svg + '</svg>' + tags +
      '<div class="words"><h2 class="line wait-l">Voice assistants work in a line.</h2>' +
      '<p class="sub wait-s">Listen. Pick a tool. Run it. Write the answer. Speak.</p></div></div>'));
    this.l = kit.stage.querySelector('.wait-l');
    this.s = kit.stage.querySelector('.wait-s').style;
    this.b = Array.from(kit.stage.querySelectorAll('.wait-b'));
    this.t = Array.from(kit.stage.querySelectorAll('.wait-t'));
    this.clock = kit.stage.querySelector('.wait-clock');
    this.hand = kit.stage.querySelector('.wait-hand');
    this.ans = kit.stage.querySelector('.wait-ans');
    var self = this;
    this.b.forEach(function (el, i) { el.style.transformOrigin = WAIT[i].x + 'px 0px'; });
  },
  render(t) {
    TextFx.fadeFromRight(this.l, t, 0.0);
    var s = eo(seg(t, 0.6, 1.1));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(20, 0, s) + 'px)';
    for (var i = 0; i < WAIT.length; i++) {
      var r = WAIT[i], p = seg(t, r.a, r.b);
      this.b[i].style.transform = 'scaleX(' + (r.slow ? p : eio(p)) + ')';
      this.t[i].style.opacity = 0.35 + 0.65 * eo(seg(t, r.a - 0.2, r.a + 0.1));
    }
    var sp = seg(t, 1.9, 3.9), on = eo(seg(t, 1.8, 2.1)) * (1 - eo(seg(t, 3.9, 4.3)));
    this.clock.setAttribute('transform', 'translate(' + (570 + 250 * sp + 50) + ' 952)');
    this.clock.style.opacity = on;
    var tick = Math.floor(Math.max(0, t - 1.9) / 0.3);
    this.hand.setAttribute('transform', 'rotate(' + tick * 30 + ')');
    window.UI.pop(this.ans, t, window.TT.ans.wait, 955, 1240, 0.9);
  },
});
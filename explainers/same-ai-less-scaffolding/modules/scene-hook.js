const { seg, eo, eob, lerp, TextFx, breathe } = kit;
kit.scene('hook', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350"><g class="hook-dot"><circle class="engine-me" cx="0" cy="0" r="110"/><circle cx="0" cy="0" r="38" style="fill:var(--ground)"/></g>' +
      '<line class="hook-u" x1="90" y1="0" x2="620" y2="0" style="stroke:var(--accent);stroke-width:12;stroke-linecap:round"/></svg>' +
      '<div class="words" style="left:90px;top:200px;width:900px"><p class="kicker hook-k">New AI research</p>' +
      '<h1 class="line hook-l" style="font-size:124px">Same AI. Less scaffolding. Same or better results.</h1>' +
      '<p class="sub hook-s">No search trees. No team of sub-agents. Just a model and a terminal.</p></div></div>'));
    this.k = kit.stage.querySelector('.hook-k').style;
    this.l = kit.stage.querySelector('.hook-l');
    this.s = kit.stage.querySelector('.hook-s').style;
    this.dot = kit.stage.querySelector('.hook-dot');
    this.u = kit.stage.querySelector('.hook-u');
    var b = this.l.getBoundingClientRect(), sb = kit.stage.getBoundingClientRect();
    var sc = sb.width / kit.W || 1;
    this.uy = (b.bottom - sb.top) / sc + 14;
    this.u.setAttribute('y1', this.uy); this.u.setAttribute('y2', this.uy);
    this.u.style.strokeDasharray = '540';
  },
  render(t) {
    this.k.opacity = eo(seg(t, -0.6, -0.2));
    TextFx.fadeFromRight(this.l, t, -0.6, { stagger: 0.07 });
    this.u.style.strokeDashoffset = String(540 * (1 - eo(seg(t, 1.0, 1.5))));
    var a = eo(seg(t, 1.8, 2.4));
    this.s.opacity = a; this.s.transform = 'translateY(' + lerp(22, 0, a) + 'px)';
    var d = eob(seg(t, 0.4, 1.1), 1.8);
    this.dot.setAttribute('transform', 'translate(900 1170) scale(' + (0.6 * d * breathe(t, 0.025, 2.6)) + ')');
  },
});
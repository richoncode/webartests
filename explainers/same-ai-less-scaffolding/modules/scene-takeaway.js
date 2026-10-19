const { seg, eo, eob, lerp, TextFx, breathe } = kit;
kit.scene('takeaway', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350"><g class="takeaway-dot"><circle class="engine-me" cx="0" cy="0" r="110"/><circle cx="0" cy="0" r="38" style="fill:var(--ground)"/></g></svg>' +
      '<div class="words" style="left:90px;top:170px;width:900px"><p class="kicker takeaway-k">The takeaway</p>' +
      '<h2 class="line takeaway-l" style="font-size:124px">The model and its workspace matter. The scaffolding doesn’t.</h2>' +
      '<div class="takeaway-u" style="height:12px;width:420px;border-radius:6px;background:var(--accent);transform-origin:0 50%"></div>' +
      '<p class="sub takeaway-s">Elaborate harnesses gave poor returns on today’s ML benchmarks.</p></div></div>'));
    this.k = kit.stage.querySelector('.takeaway-k').style;
    this.l = kit.stage.querySelector('.takeaway-l');
    this.u = kit.stage.querySelector('.takeaway-u').style;
    this.s = kit.stage.querySelector('.takeaway-s').style;
    this.dot = kit.stage.querySelector('.takeaway-dot');
  },
  render(t) {
    this.k.opacity = eo(seg(t, 0, 0.4));
    TextFx.fadeFromRight(this.l, t, 0.2, { stagger: 0.13 });
    this.u.transform = 'scaleX(' + eo(seg(t, 1.6, 2.1)) + ')';
    var a = eo(seg(t, 2.6, 3.2));
    this.s.opacity = a; this.s.transform = 'translateY(' + lerp(20, 0, a) + 'px)';
    this.dot.setAttribute('transform', 'translate(900 1170) scale(' + (0.6 * eob(seg(t, 0.3, 1.0), 1.8) * breathe(t, 0.025, 2.6)) + ')');
  },
});
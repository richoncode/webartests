const { seg, eo, eio, eob, lerp, TextFx } = kit;
kit.scene('twist', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350">' +
      '<rect class="rail" x="90" y="1100" width="900" height="72" rx="20"/>' +
      '<rect class="hot tw-hot" x="90" y="1100" width="545" height="72" rx="20"/>' +
      '<rect class="blk tw-ink" x="90" y="1100" width="403" height="72" rx="20"/>' +
      '<rect class="tw-cap" x="627" y="1086" width="8" height="100" rx="4" style="fill:var(--main)"/></svg>' +
      '<div class="words" style="gap:22px"><p class="kicker tw-k">The twist</p>' +
      '<h2 class="line tw-l" style="font-size:108px">It also picked the right tool more often.</h2>' +
      '<div class="huge tw-n" style="display:flex;gap:.22em"><span class="tw-n1">44.8%</span><span class="tw-n2" style="color:var(--main)">→ 60.6%</span></div>' +
      '<p class="sub tw-s">Tool-call accuracy (F1). The researchers think the early results gave the small on-device AI useful context.</p></div></div>'));
    var n = kit.stage.querySelector('.tw-n');
    var w = n.scrollWidth;
    if (w > 900) n.style.fontSize = Math.floor(170 * 900 / w) + 'px';
    this.k = kit.stage.querySelector('.tw-k').style;
    this.l = kit.stage.querySelector('.tw-l');
    this.n1 = kit.stage.querySelector('.tw-n1').style;
    this.n2 = kit.stage.querySelector('.tw-n2').style;
    this.s = kit.stage.querySelector('.tw-s').style;
    this.ink = kit.stage.querySelector('.tw-ink').style;
    this.hot = kit.stage.querySelector('.tw-hot').style;
    this.cap = kit.stage.querySelector('.tw-cap').style;
    this.ink.transformOrigin = '90px 1136px';
    this.hot.transformOrigin = '90px 1136px';
  },
  render(t) {
    var R = window.TT.twist;
    this.k.opacity = eo(seg(t, 0, 0.4));
    TextFx.fadeFromRight(this.l, t, 0.1);
    var p1 = seg(t, R[0], R[0] + 0.35), p2 = seg(t, R[1], R[1] + 0.35);
    this.n1.opacity = Math.min(1, p1 * 3);
    this.n1.transform = 'translateY(' + lerp(-40, 0, eob(p1, 1.8)) + 'px)';
    this.n2.opacity = Math.min(1, p2 * 3);
    this.n2.transform = 'translateY(' + lerp(-40, 0, eob(p2, 1.8)) + 'px)';
    this.ink.transform = 'scaleX(' + eio(seg(t, R[0] - 0.3, R[0] + 0.3)) + ')';
    var rise = eo(seg(t, R[1], R[1] + 1.0));
    this.hot.transform = 'scaleX(' + (t < R[1] ? 403 / 545 * eio(seg(t, R[0] - 0.3, R[0] + 0.3)) : lerp(403 / 545, 1, rise)) + ')';
    this.hot.opacity = t < R[1] ? 0 : 1;
    this.cap.opacity = eo(seg(t, R[1] + 0.8, R[1] + 1.1));
    var s = eo(seg(t, 2.8, 3.3));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(18, 0, s) + 'px)';
  },
});
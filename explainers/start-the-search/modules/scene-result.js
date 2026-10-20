const { seg, eo, eio, eob, lerp } = kit;
kit.scene('result', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350">' +
      '<rect class="blk re-a" x="90" y="800" width="790" height="84" rx="20"/>' +
      '<rect class="hot re-b" x="90" y="920" width="790" height="84" rx="20"/><g class="re-ans">' + window.UI.answer() + '</g><g class="re-ans">' + window.UI.answer() + '</g></svg>' +
      '<div class="words" style="gap:22px"><p class="kicker re-k">On a Samsung Galaxy S26 Ultra</p>' +
      '<div class="huge re-n" style="display:flex;gap:.22em"><span class="re-n1">5.79 s</span><span class="re-n2" style="color:var(--main)">→ 4.60 s</span></div>' +
      '<p class="sub re-s">Median wait from when you stop talking to the first spoken word.</p>' +
      '<p class="re-sp" style="font-family:var(--display, var(--sans, system-ui, sans-serif));font-weight:800;font-size:64px;line-height:1">Spread: 3.49 s → 2.81 s</p></div>' +
      '<p class="kicker re-tag" style="position:absolute;margin:0;left:90px;top:1120px">One long request: 17 s → 8 s</p></div>'));
    var n = kit.stage.querySelector('.re-n');
    var w = n.scrollWidth;
    if (w > 900) n.style.fontSize = Math.floor(170 * 900 / w) + 'px';
    this.k = kit.stage.querySelector('.re-k').style;
    this.n1 = kit.stage.querySelector('.re-n1').style;
    this.n2 = kit.stage.querySelector('.re-n2').style;
    this.s = kit.stage.querySelector('.re-s').style;
    this.sp = kit.stage.querySelector('.re-sp').style;
    this.tag = kit.stage.querySelector('.re-tag').style;
    this.a = kit.stage.querySelector('.re-a').style;
    this.b = kit.stage.querySelector('.re-b').style;
    this.ans = Array.from(kit.stage.querySelectorAll('.re-ans'));
    this.a.transformOrigin = '90px 842px';
    this.b.transformOrigin = '90px 962px';
  },
  render(t) {
    var R = window.TT.result;
    this.k.opacity = eo(seg(t, -0.2, 0.2));
    var p1 = seg(t, R[0], R[0] + 0.35);
    this.n1.opacity = Math.min(1, p1 * 3);
    this.n1.transform = 'translateY(' + lerp(-40, 0, eob(p1, 1.8)) + 'px)';
    var p2 = seg(t, R[1], R[1] + 0.35);
    this.n2.opacity = Math.min(1, p2 * 3);
    this.n2.transform = 'translateY(' + lerp(-40, 0, eob(p2, 1.8)) + 'px)';
    this.a.transform = 'scaleX(' + eio(seg(t, R[0] + 0.1, R[0] + 1.1)) + ')';
    var grow = eio(seg(t, R[0] + 0.7, R[1] - 0.1));
    var shrink = eob(seg(t, R[1], R[1] + 0.7), 1.3);
    this.b.transform = 'scaleX(' + lerp(grow, 4.60 / 5.79, shrink) + ')';
    var RA = window.TT.ans.result;
    window.UI.pop(this.ans[0], t, RA[0], 935, 842, 0.8);
    window.UI.pop(this.ans[1], t, RA[1], 90 + 790 * 4.60 / 5.79 + 55, 962, 0.8);
    var s = eo(seg(t, 1.0, 1.5));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(18, 0, s) + 'px)';
    var q = eo(seg(t, 3.0, 3.5));
    this.sp.opacity = q; this.sp.transform = 'translateY(' + lerp(18, 0, q) + 'px)';
    var g = eo(seg(t, 5.0, 5.5));
    this.tag.opacity = g; this.tag.transform = 'translateY(' + lerp(14, 0, g) + 'px)';
  },
});
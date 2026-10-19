const { seg, eo, eob, lerp, TextFx } = kit;
kit.scene('lineup', {
  init(kit) {
    var L = window.UI.lanes(kit);
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350">' + L.svg + '</svg>' + L.words +
      '<div class="words" style="left:90px;top:140px;width:900px;gap:22px"><p class="kicker lineup-k">A fair race</p>' +
      '<h2 class="line lineup-l" style="font-size:104px">Same model. Same GPU. Same 24 hours.</h2>' +
      '<p class="sub lineup-s">One plain agent vs. four packed with add-ons.</p></div></div>'));
    this.k = kit.stage.querySelector('.lineup-k').style;
    this.l = kit.stage.querySelector('.lineup-l');
    this.s = kit.stage.querySelector('.lineup-s').style;
    this.tr = Array.from(kit.stage.querySelectorAll('.track'));
    this.r = Array.from(kit.stage.querySelectorAll('.lane-r'));
    this.n = Array.from(kit.stage.querySelectorAll('.lane-n'));
  },
  render(t) {
    this.k.opacity = eo(seg(t, 0, 0.4));
    TextFx.fadeFromRight(this.l, t, 0.2, { stagger: 0.16 });
    var ys = window.UI.lanesY;
    for (var i = 0; i < 5; i++) {
      var a = 2.0 + i * 0.3, p = seg(t, a, a + 0.6);
      this.tr[i].style.opacity = eo(seg(t, a - 0.3, a + 0.2));
      this.r[i].setAttribute('transform', 'translate(' + lerp(-80, 170, eob(p, 1.6)) + ' ' + ys[i] + ') scale(.6)');
      this.n[i].style.opacity = eo(seg(t, a + 0.2, a + 0.6));
      this.n[i].style.transform = 'translateX(' + lerp(-20, 0, eo(seg(t, a + 0.2, a + 0.6))) + 'px)';
    }
    var b = eo(seg(t, 4.2, 4.8));
    this.s.opacity = b; this.s.transform = 'translateY(' + lerp(20, 0, b) + 'px)';
  },
});
const { seg, eo, eob, lerp, TextFx, vnoise } = kit;
kit.scene('question', {
  init(kit) {
    var g = '';
    for (var i = 0; i < 4; i++) {
      var w = 360 - i * 40, y = -205 - i * 86;
      g += '<rect class="question-g" x="' + (-w / 2) + '" y="' + y + '" width="' + w + '" height="70" rx="10" style="fill:none;stroke:var(--second);stroke-width:3;stroke-dasharray:12 10"/>';
    }
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350"><g transform="translate(540 1150)">' + g +
      '<g class="question-dot"><circle class="engine-me" cx="0" cy="-40" r="100"/><circle cx="0" cy="-40" r="34" style="fill:var(--ground)"/></g></g></svg>' +
      '<div class="words" style="left:90px;top:170px;width:900px"><h2 class="line question-l" style="font-size:108px">But do today’s best AI models still need them?</h2>' +
      '<p class="sub question-s">Researchers at EPFL and Apple put it to a fair test.</p></div></div>'));
    this.l = kit.stage.querySelector('.question-l');
    this.s = kit.stage.querySelector('.question-s').style;
    this.g = Array.from(kit.stage.querySelectorAll('.question-g'));
    this.dot = kit.stage.querySelector('.question-dot');
    this.nz = [1, 2, 3, 4].map(function (k) { return vnoise(k * 7); });
  },
  render(t) {
    TextFx.fadeFromRight(this.l, t, 0.1);
    var a = eo(seg(t, 2.0, 2.6));
    this.s.opacity = a; this.s.transform = 'translateY(' + lerp(22, 0, a) + 'px)';
    for (var i = 0; i < 4; i++) {
      var f = eo(seg(t, 0.3 + i * 0.15, 0.9 + i * 0.15));
      this.g[i].style.opacity = f * 0.6;
      this.g[i].style.transform = 'translate(' + this.nz[i](t * 0.6) * 14 + 'px,' + (this.nz[i](t * 0.5 + 9) * 10 - i * 6 * seg(t, 1, 5)) + 'px)';
    }
    this.dot.setAttribute('transform', 'translate(0 -40) scale(' + eob(seg(t, 0, 0.6), 1.7) + ') translate(0 40)');
  },
});
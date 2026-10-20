const { seg, eo, eob, lerp, TextFx } = kit;
kit.scene('idea', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<div class="box" style="left:90px;top:740px;width:900px;height:290px"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350"><circle class="hot idea-live" cx="140" cy="790" r="12"/>' +
      '<line class="idea-link" x1="540" y1="1030" x2="540" y2="1130" style="stroke:var(--main);stroke-width:6;stroke-dasharray:10 10"/>' +
      '<circle class="idea-ring" cx="540" cy="1180" r="60" style="fill:none;stroke:var(--main);stroke-width:6"/>' +
      '<g class="idea-chip">' + window.UI.chip() + '</g><g class="idea-ans">' + window.UI.answer() + '</g></svg>' +
      '<p class="tr idea-tr" style="position:absolute;margin:0;left:170px;top:770px;width:780px">Check the weather in Boston, then find nearby restaurants</p>' +
      '<div class="words"><h2 class="line idea-l">Why wait for the last word?</h2>' +
      '<p class="sub idea-s">Qualcomm AI Research and KAIST researchers start the search while you’re still talking.</p></div></div>'));
    this.l = kit.stage.querySelector('.idea-l');
    this.s = kit.stage.querySelector('.idea-s').style;
    this.w = window.UI.split(kit.stage.querySelector('.idea-tr'));
    this.live = kit.stage.querySelector('.idea-live').style;
    this.link = kit.stage.querySelector('.idea-link').style;
    this.ring = kit.stage.querySelector('.idea-ring').style;
    this.chip = kit.stage.querySelector('.idea-chip');
    this.ans = kit.stage.querySelector('.idea-ans');
    this.ring.transformOrigin = '540px 1180px';
    var I = window.TT.idea;
    this.tp = I.w0 + (I.pulseAt - 1) * I.step + 0.2;
  },
  render(t) {
    var I = window.TT.idea;
    TextFx.fadeFromRight(this.l, t, 0.0);
    var s = eo(seg(t, 0.5, 1.0));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(20, 0, s) + 'px)';
    window.UI.stream(this.w, t, I.w0, I.step);
    this.live.opacity = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.4));
    var p = seg(t, this.tp, this.tp + 0.5);
    this.link.opacity = eo(p);
    var r = seg(t, this.tp, this.tp + 0.9);
    this.ring.opacity = r > 0 && r < 1 ? 1 - r : 0;
    this.ring.transform = 'scale(' + lerp(0.8, 2.4, eo(r)) + ')';
    var c = eob(seg(t, this.tp + 0.1, this.tp + 0.6), 1.7);
    this.chip.setAttribute('transform', 'translate(540 1180) scale(' + c + ')');
    var A = window.TT.ans.idea;
    window.UI.dots(this.chip, t, t > this.tp + 0.6, A - 0.5);
    window.UI.pop(this.ans, t, A, 830, 1180, 0.9);
  },
});
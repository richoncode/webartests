const { seg, eo, eob, lerp, TextFx } = kit;
const FIN = [{ v: 62.5, label: 'Plain coding agent', cls: 'bar-me', y: 555 }, { v: 47.1, label: 'Best add-on harness', cls: 'bar-them', y: 795 }];
kit.scene('finish', {
  init(kit) {
    var s = '';
    FIN.forEach(function (f, i) {
      s += '<div class="finish-row" style="position:absolute;left:90px;right:90px;top:' + f.y + 'px;display:flex;justify-content:space-between;align-items:flex-end">' +
        '<p class="name' + (i === 0 ? ' hl' : '') + '" style="margin:0 0 8px">' + f.label + '</p>' +
        '<p class="num finish-num" style="margin:0;font-size:96px;line-height:1' + (i === 0 ? ';color:var(--main)' : '') + '">0%</p></div>' +
        '<div class="bar ' + f.cls + ' finish-bar" style="left:90px;top:' + (f.y + 112) + 'px;height:96px;width:' + (f.v / 70 * 900) + 'px"></div>';
    });
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' + s +
      '<div class="words" style="left:90px;top:130px;width:900px;gap:16px"><p class="kicker finish-k">The result</p>' +
      '<h2 class="line finish-l" style="font-size:92px">How often each earned a Kaggle medal</h2>' +
      '<p class="sub finish-m" style="font-size:34px">Medal = a score that would place among the top human teams in a real Kaggle contest</p></div>' +
      '<div class="words" style="left:90px;top:1030px;width:900px"><p class="sub finish-s" style="font-size:40px">Same model for everyone. With every top model tested, no harness beat the plain agent.</p></div></div>'));
    this.k = kit.stage.querySelector('.finish-k').style;
    this.l = kit.stage.querySelector('.finish-l');
    this.m = kit.stage.querySelector('.finish-m').style;
    this.s = kit.stage.querySelector('.finish-s').style;
    this.rows = Array.from(kit.stage.querySelectorAll('.finish-row'));
    this.bars = Array.from(kit.stage.querySelectorAll('.finish-bar'));
    this.nums = Array.from(kit.stage.querySelectorAll('.finish-num'));
  },
  render(t) {
    this.k.opacity = eo(seg(t, 0, 0.4));
    TextFx.fadeFromRight(this.l, t, 0.2);
    var mm = eo(seg(t, 0.9, 1.4));
    this.m.opacity = mm; this.m.transform = 'translateY(' + lerp(16, 0, mm) + 'px)';
    for (var i = 0; i < 2; i++) {
      var a = 1.6 + i * 1.2, p = seg(t, a, a + 1.6);
      this.rows[i].style.opacity = eo(seg(t, a - 0.3, a + 0.1));
      this.bars[i].style.transform = 'scaleX(' + eob(p, 1.15) + ')';
      this.nums[i].textContent = (FIN[i].v * eo(p)).toFixed(1) + '%';
    }
    var b = eo(seg(t, 5.0, 5.6));
    this.s.opacity = b; this.s.transform = 'translateY(' + lerp(20, 0, b) + 'px)';
  },
});
const { seg, eo, eob, lerp, TextFx } = kit;
const TO_X = [170, 355, 540, 725, 910];
const TO_WASTE = [1, 3];
const TO_TAGS = [{ name: 'CALENDAR', x: 330 }, { name: 'ALARM', x: 750 }];
kit.scene('tradeoff', {
  init(kit) {
    var chips = '', locks = '', tags = '';
    var lines = '';
    TO_X.forEach(function (x, i) {
      chips += '<g class="to-chip" transform="translate(' + x + ' 720) scale(.62)">' + window.UI.chip() + '</g>';
      if (TO_WASTE.indexOf(i) < 0) lines += '<line class="to-ln" x1="' + x + '" y1="750" x2="540" y2="826" style="stroke:var(--main);stroke-width:5;stroke-linecap:round"/>';
    });
    TO_TAGS.forEach(function (g) {
      tags += '<p class="tag pill to-tag" style="left:' + g.x + 'px;top:1080px;transform:translateX(-50%)">' + g.name + '</p>';
      locks += '<g class="to-lock" transform="translate(' + g.x + ' 1036)"><path d="M-16 -6 V-18 Q-16 -34 0 -34 Q16 -34 16 -18 V-6" style="fill:none;stroke:var(--main);stroke-width:7;stroke-linecap:round"/>' +
        '<rect class="hot" x="-26" y="-8" width="52" height="40" rx="8"/><circle class="bg" cx="0" cy="10" r="6"/></g>';
    });
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' + tags +
      '<svg class="art" viewBox="0 0 1080 1350">' + lines + chips + '<g class="to-ans">' + window.UI.answer() + '</g>' + locks + '</svg>' +
      '<div class="words"><h2 class="line to-l">Guessing has a cost.</h2>' +
      '<p class="sub to-s">Some searches go unused. Only read-only tools are guessed, so alarms and calendars are never touched.</p></div></div>'));
    this.l = kit.stage.querySelector('.to-l');
    this.s = kit.stage.querySelector('.to-s').style;
    this.chips = Array.from(kit.stage.querySelectorAll('.to-chip'));
    this.locks = Array.from(kit.stage.querySelectorAll('.to-lock'));
    this.tags = Array.from(kit.stage.querySelectorAll('.to-tag'));
    this.lns = Array.from(kit.stage.querySelectorAll('.to-ln'));
    this.ans = kit.stage.querySelector('.to-ans');
  },
  render(t) {
    TextFx.fadeFromRight(this.l, t, -0.5);
    var s = eo(seg(t, 0.2, 0.6));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(18, 0, s) + 'px)';
    for (var i = 0; i < this.chips.length; i++) {
      var c = this.chips[i], waste = TO_WASTE.indexOf(i) >= 0;
      var g = waste ? eo(seg(t, 2.6, 3.2)) : 0;
      c.firstChild.style.fill = 'color-mix(in srgb, var(--main) ' + Math.round(100 - 100 * g) + '%, color-mix(in srgb, var(--ink) 30%, var(--ground)))';
      c.style.opacity = eo(seg(t, 1.2 + i * 0.08, 1.5 + i * 0.08)) * (1 - 0.35 * g);
      window.UI.dots(c, t, false, -1);
    }
    var ln = eo(seg(t, 3.3, 3.8));
    this.lns.forEach(function (l) { l.style.opacity = ln; });
    window.UI.pop(this.ans, t, 3.9, 540, 870, 0.9);
    for (var j = 0; j < 2; j++) {
      this.tags[j].style.opacity = eo(seg(t, 4.5 + j * 0.15, 4.8 + j * 0.15));
      var p = seg(t, 5.0 + j * 0.2, 5.4 + j * 0.2);
      this.locks[j].style.opacity = Math.min(1, p * 3);
      this.locks[j].setAttribute('transform', 'translate(' + TO_TAGS[j].x + ' ' + lerp(990, 1036, eob(p, 1.7)) + ')');
    }
  },
});
const { seg, eo, ei, eob, lerp, TextFx } = kit;
const WHY_ADD = ['Search trees', 'Sub-agents', 'Parallel teams', 'Extra skills'];
kit.scene('why', {
  init(kit) {
    var chips = '';
    WHY_ADD.forEach(function (w, i) {
      chips += '<div class="chipx why-chip" style="left:' + (120 + (i % 2) * 440) + 'px;top:' + (720 + Math.floor(i / 2) * 140) + 'px">' + w + '</div>';
    });
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' +
      '<div class="why-g1"><div class="bar bar-them why-b1" style="left:220px;top:1000px;width:220px;height:140px;transform-origin:50% 100%"></div>' +
      '<div class="bar bar-me why-b2" style="left:620px;top:640px;width:220px;height:500px;transform-origin:50% 100%"></div>' +
      '<p class="tag" style="position:absolute;margin:0;left:180px;top:1160px;width:300px;text-align:center">Chat only</p>' +
      '<p class="tag" style="position:absolute;margin:0;left:570px;top:1160px;width:320px;text-align:center">Terminal + files</p></div>' +
      '<div class="why-g2">' + chips + '</div>' +
      '<div class="words why-a" style="left:90px;top:140px;width:900px;gap:22px"><p class="kicker">Why? Part 1: the workspace</p><h2 class="line why-la" style="font-size:104px">Letting the model run its own code: the big jump.</h2></div>' +
      '<div class="words why-b" style="left:90px;top:140px;width:900px;gap:22px"><p class="kicker">Part 2: the imposed structure</p><h2 class="line why-lb" style="font-size:104px">No real gain. Some even hurt.</h2><p class="sub why-sb">Today’s best AI models already explore ideas on their own.</p></div></div>'));
    this.la = kit.stage.querySelector('.why-la');
    this.lb = kit.stage.querySelector('.why-lb');
    this.sb = kit.stage.querySelector('.why-sb').style;
    this.a = kit.stage.querySelector('.why-a').style;
    this.b = kit.stage.querySelector('.why-b').style;
    this.g1 = kit.stage.querySelector('.why-g1').style;
    this.b1 = kit.stage.querySelector('.why-b1').style;
    this.b2 = kit.stage.querySelector('.why-b2').style;
    this.chips = Array.from(kit.stage.querySelectorAll('.why-chip'));
  },
  render(t) {
    TextFx.fadeFromRight(this.la, t, 0.1);
    this.b1.transform = 'scaleY(' + eob(seg(t, 1.4, 1.9), 1.3) + ')';
    this.b2.transform = 'scaleY(' + eob(seg(t, 2.0, 2.9), 1.5) + ')';
    var out = ei(seg(t, 4.0, 4.4));
    this.a.opacity = 1 - out; this.a.transform = 'translateX(' + (-40 * out) + 'px)';
    this.g1.opacity = 1 - out;
    this.b.opacity = t < 4.3 ? 0 : 1;
    TextFx.fadeFromRight(this.lb, t, 4.4);
    var sb = eo(seg(t, 5.0, 5.5));
    this.sb.opacity = sb; this.sb.transform = 'translateY(' + lerp(18, 0, sb) + 'px)';
    for (var i = 0; i < 4; i++) {
      var a = 5.4 + i * 0.25;
      var inP = eob(seg(t, a, a + 0.45), 1.6);
      var drop = ei(seg(t, 7.0 + i * 0.12, 7.8 + i * 0.12));
      this.chips[i].style.opacity = Math.min(1, seg(t, a, a + 0.2)) * lerp(1, 0.3, drop);
      this.chips[i].style.transform = 'translateY(' + (lerp(30, 0, inP) + drop * 60) + 'px) rotate(' + drop * (i % 2 ? 7 : -6) + 'deg)';
    }
  },
});
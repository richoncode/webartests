const { seg, eo, ei, eio, eob, lerp, TextFx } = kit;
const CA_FROM = [[230, 790], [540, 790], [850, 790]];
const CA_IN = [[280, 1000], [280, 1068], [280, 1136]];
kit.scene('cache', {
  init(kit) {
    var chips = '', dots = '';
    for (var i = 0; i < 3; i++) {
      chips += '<g class="ca-chip">' + window.UI.chip() + '</g>';
      dots += '<rect class="hot ca-dot" x="-16" y="-16" width="32" height="32" rx="8"/>';
    }
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<div class="box ca-box" style="left:90px;top:900px;width:380px;height:290px"></div>' +
      '<div class="ca-ai" style="position:absolute;left:640px;top:930px;width:350px;height:230px;border-radius:22px;background:var(--ink)"></div>' +
      '<p class="tag" style="position:absolute;margin:0;left:116px;top:920px;color:var(--ink)">CACHE</p>' +
      '<p class="tag" style="position:absolute;margin:0;left:666px;top:950px;color:var(--ground)">AI</p>' +
      '<svg class="art" viewBox="0 0 1080 1350">' + dots +
      '<path class="ca-arrow" d="M760 1160 C760 1250 400 1260 360 1196" style="fill:none;stroke:var(--accent);stroke-width:6;stroke-linecap:round"/>' +
      '<path class="ca-head" d="M348 1214 L360 1192 L384 1202" style="fill:none;stroke:var(--accent);stroke-width:6;stroke-linecap:round;stroke-linejoin:round"/>' +
      chips + '<rect class="hot ca-ret" x="-16" y="-16" width="32" height="32" rx="8" style="opacity:0"/><g class="ca-ans">' + window.UI.answer() + '</g></svg>' +
      '<div class="words"><h2 class="line ca-l">Answers wait in a cache.</h2>' +
      '<p class="sub ca-s">When you stop talking, they go straight into the AI’s prompt. If it still asks for a tool, the cache is checked first.</p></div></div>'));
    this.l = kit.stage.querySelector('.ca-l');
    this.s = kit.stage.querySelector('.ca-s').style;
    this.chips = Array.from(kit.stage.querySelectorAll('.ca-chip'));
    this.dots = Array.from(kit.stage.querySelectorAll('.ca-dot'));
    this.box = kit.stage.querySelector('.ca-box').style;
    this.ai = kit.stage.querySelector('.ca-ai').style;
    this.arrow = kit.stage.querySelector('.ca-arrow');
    this.al = this.arrow.getTotalLength();
    this.arrow.style.strokeDasharray = this.al + ' ' + this.al;
    this.head = kit.stage.querySelector('.ca-head').style;
    this.ans = kit.stage.querySelector('.ca-ans');
    this.ret = kit.stage.querySelector('.ca-ret');
  },
  render(t) {
    var hit = window.TT.cacheHit;
    TextFx.fadeFromRight(this.l, t, 0.0);
    var s = eo(seg(t, 0.5, 1.0));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(20, 0, s) + 'px)';
    for (var i = 0; i < 3; i++) {
      var p = eio(seg(t, 1.9 + i * 0.25, 2.7 + i * 0.25));
      var x = lerp(CA_FROM[i][0], CA_IN[i][0], p), y = lerp(CA_FROM[i][1], CA_IN[i][1], p);
      this.chips[i].setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + lerp(1, 0.72, p) + ')');
      window.UI.dots(this.chips[i], t, false, -1);
      var f = seg(t, 3.5 + i * 0.2, 4.2 + i * 0.2);
      var dx = lerp(400, 815, eio(f)), dy = lerp(CA_IN[i][1], 1045, eio(f)) - Math.sin(Math.PI * f) * 40;
      this.dots[i].setAttribute('transform', 'translate(' + dx + ' ' + dy + ') scale(' + (1 - ei(seg(f, 0.85, 1))) + ')');
      this.dots[i].style.opacity = f > 0 && f < 1 ? 1 : 0;
    }
    var glow = eo(seg(t, 4.2, 4.6)) * (1 - eo(seg(t, 5.0, 5.6)));
    this.ret.style.opacity = 0;
    this.ai.boxShadow = '0 0 0 ' + (10 * glow) + 'px color-mix(in srgb, var(--main) 45%, transparent)';
    var a = 0;
    this.arrow.style.strokeDashoffset = String(this.al * (1 - a));
    this.arrow.style.opacity = 0;
    this.head.opacity = 0;
    var h = 0;
    this.box.borderColor = h > 0 ? 'var(--main)' : 'var(--ink)';
    this.box.boxShadow = '0 0 0 ' + (h > 0 ? 14 * (1 - eo(h)) : 0) + 'px color-mix(in srgb, var(--main) 40%, transparent)';
    window.UI.pop(this.ans, t, window.TT.ans.cache, 815, 862, 0.9);
  },
});
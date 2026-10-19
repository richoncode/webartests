const { seg, eo, eio, lerp, TextFx, vnoise } = kit;
const RACE_END = [930, 760, 680, 800, 720];
kit.scene('race', {
  init(kit) {
    var L = window.UI.lanes(kit);
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350">' + L.svg +
      '<g class="race-fin"><line x1="990" y1="520" x2="990" y2="1180" style="stroke:var(--second);stroke-width:4"/><path class="flag" d="M990 520 L1050 540 L990 560 Z"/></g></svg>' + L.words +
      '<div class="words" style="left:90px;top:140px;width:900px;gap:10px"><p class="kicker race-k">30 Kaggle-style ML tasks</p>' +
      '<p class="num race-clock" style="font-size:200px;line-height:1">0h 00m</p>' +
      '<p class="tag race-cap" style="color:color-mix(in srgb, var(--second) 60%, var(--ground))">of a 24-hour time limit</p></div></div>'));
    this.k = kit.stage.querySelector('.race-k').style;
    this.cap = kit.stage.querySelector('.race-cap').style;
    this.clock = kit.stage.querySelector('.race-clock');
    this.fin = kit.stage.querySelector('.race-fin').style;
    this.r = Array.from(kit.stage.querySelectorAll('.lane-r'));
    this.n = Array.from(kit.stage.querySelectorAll('.lane-n'));
    this.nz = [1, 2, 3, 4, 5].map(function (s) { return vnoise(s * 13); });
  },
  render(t) {
    this.k.opacity = eo(seg(t, 0, 0.4));
    this.cap.opacity = eo(seg(t, 0.2, 0.6));
    this.fin.opacity = eo(seg(t, 0.2, 0.8));
    var p = seg(t, 0.8, 5.8);
    var mins = Math.floor(lerp(0, 24, eio(p)) * 60);
    var hh = Math.floor(mins / 60), mm = mins % 60;
    this.clock.textContent = hh + 'h ' + (mm < 10 ? '0' : '') + mm + 'm';
    var ys = window.UI.lanesY;
    for (var i = 0; i < 5; i++) {
      this.n[i].style.opacity = 1 - eo(seg(t, 0.4, 0.9));
      var heavy = window.UI.racers[i].addons, env = Math.sin(Math.PI * p);
      var x = lerp(170, RACE_END[i], eio(p)) + this.nz[i](t * 0.8) * 14 * env;
      var bob = -Math.abs(Math.sin(t * (6 - heavy * 0.6) + i)) * 8 * env;
      var tilt = heavy ? Math.sin(t * 3 + i) * heavy * 0.9 * env : 0;
      this.r[i].setAttribute('transform', 'translate(' + x + ' ' + (ys[i] + bob) + ') rotate(' + tilt + ') scale(.6)');
    }
  },
});
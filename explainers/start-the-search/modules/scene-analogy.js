const { seg, eo, eio, eob, lerp, TextFx } = kit;
const AN = { sx: 120, fx: 420, y: 1060, ex: 800, uy: 880, dy: 1240 };
kit.scene('analogy', {
  init(kit) {
    var A = AN;
    var up = 'M' + A.sx + ' ' + A.y + ' H' + A.fx + ' C' + (A.fx + 200) + ' ' + A.y + ' ' + (A.ex - 220) + ' ' + A.uy + ' ' + A.ex + ' ' + A.uy;
    var dn = 'M' + A.sx + ' ' + A.y + ' H' + A.fx + ' C' + (A.fx + 200) + ' ' + A.y + ' ' + (A.ex - 220) + ' ' + A.dy + ' ' + A.ex + ' ' + A.dy;
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350">' +
      '<path class="stroke" d="' + up + '" style="opacity:.25"/><path class="stroke" d="' + dn + '" style="opacity:.25"/>' +
      '<path class="an-up" d="' + up + '" style="fill:none;stroke:var(--main);stroke-width:8;stroke-linecap:round"/>' +
      '<path class="an-dn" d="' + dn + '" style="fill:none;stroke:var(--main);stroke-width:8;stroke-linecap:round"/>' +
      '<g class="an-cu">' + window.UI.chip() + '</g><g class="an-cd">' + window.UI.chip() + '</g>' +
      '<circle class="hot an-du" r="22"/><circle class="hot an-dd" r="22"/>' +
      '<line class="an-ln" x1="864" y1="880" x2="900" y2="880" style="stroke:var(--main);stroke-width:5;stroke-linecap:round"/>' +
      '<g class="an-ans">' + window.UI.answer() + '</g></svg>' +
      '<div class="words"><p class="kicker an-k">An analogy</p><h2 class="line an-l">Like a CPU running ahead of a branch.</h2>' +
      '<p class="sub an-s">Do the likely work early. Throw it away if the guess was wrong.</p></div></div>'));
    this.k = kit.stage.querySelector('.an-k').style;
    this.l = kit.stage.querySelector('.an-l');
    this.s = kit.stage.querySelector('.an-s').style;
    this.up = kit.stage.querySelector('.an-up');
    this.dn = kit.stage.querySelector('.an-dn');
    this.ul = this.up.getTotalLength();
    this.dl = this.dn.getTotalLength();
    this.up.style.strokeDasharray = this.ul + ' ' + this.ul;
    this.dn.style.strokeDasharray = this.dl + ' ' + this.dl;
    this.du = kit.stage.querySelector('.an-du');
    this.dd = kit.stage.querySelector('.an-dd');
    this.cu = kit.stage.querySelector('.an-cu');
    this.cd = kit.stage.querySelector('.an-cd');
    this.ln = kit.stage.querySelector('.an-ln').style;
    this.ans = kit.stage.querySelector('.an-ans');
  },
  render(t) {
    var A = AN, ANS = window.TT.ans.analogy;
    this.k.opacity = eo(seg(t, 0, 0.4));
    TextFx.fadeFromRight(this.l, t, 0.1);
    var s = eo(seg(t, 0.7, 1.2));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(20, 0, s) + 'px)';
    var pu = eio(seg(t, 1.8, 3.2)), pd = eio(seg(t, 1.8, 3.4));
    this.up.style.strokeDashoffset = String(this.ul * (1 - pu));
    this.dn.style.strokeDashoffset = String(this.dl * (1 - pd));
    var a = this.up.getPointAtLength(this.ul * pu), b = this.dn.getPointAtLength(this.dl * pd);
    this.du.setAttribute('cx', a.x); this.du.setAttribute('cy', a.y);
    this.dd.setAttribute('cx', b.x); this.dd.setAttribute('cy', b.y);
    this.du.style.opacity = eo(seg(t, 1.6, 1.8)) * (1 - seg(t, 3.2, 3.35));
    this.dd.style.opacity = eo(seg(t, 1.6, 1.8)) * (1 - seg(t, 3.4, 3.55));
    var cu = seg(t, 3.2, 3.55), cd = seg(t, 3.4, 3.75);
    this.cu.setAttribute('transform', 'translate(' + A.ex + ' ' + A.uy + ') scale(' + 0.5 * eob(cu, 1.7) + ')');
    this.cd.setAttribute('transform', 'translate(' + A.ex + ' ' + A.dy + ') scale(' + 0.5 * eob(cd, 1.7) + ')');
    window.UI.dots(this.cu, t, cu >= 1, 3.75);
    window.UI.dots(this.cd, t, cd >= 1, 3.95);
    var g = eo(seg(t, 4.5, 5.1));
    this.cd.firstChild.style.fill = 'color-mix(in srgb, var(--main) ' + Math.round(100 - 100 * g) + '%, color-mix(in srgb, var(--ink) 30%, var(--ground)))';
    this.cd.style.opacity = 1 - 0.35 * g;
    this.dn.style.stroke = 'color-mix(in srgb, var(--main) ' + Math.round(100 - 100 * g) + '%, color-mix(in srgb, var(--ink) 22%, var(--ground)))';
    this.ln.opacity = eo(seg(t, ANS - 0.25, ANS));
    window.UI.pop(this.ans, t, ANS, 950, 880, 0.7);
  },
});
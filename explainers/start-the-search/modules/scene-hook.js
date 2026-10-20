const { seg, eo, ei, eio, eob, lerp, TextFx } = kit;
const HK_Q = 'Check the weather in Boston, then find nearby restaurants';
const HK_HL = [2, 3, 4];
const HK_STEP = 0.38, HK_SWAP = 7.5;
const HK = [
  { q0: 0.5, end: 3.7, wait: [3.8, 5.7], chip: 4.3, ans: 5.7, val: 5.79, out: 7.2 },
  { q0: 7.8, end: 11.0, wait: [11.1, 12.59], chip: 9.7, ans: 12.59, val: 4.60, out: 99 }
];
window.TT.hook = HK;
function hkChip() {
  return '<rect class="hot" x="-120" y="-38" width="240" height="76" rx="38"/>' +
    '<circle cx="-62" cy="-10" r="14" class="bg"/>' +
    '<path d="M-86 18 Q-90 0 -72 0 Q-66 -14 -50 -6 Q-34 -8 -36 8 Q-26 12 -32 18 Z" class="bg" style="stroke:var(--main);stroke-width:4"/>' +
    '<circle class="bg chip-dot" cx="8" cy="0" r="8"/><circle class="bg chip-dot" cx="40" cy="0" r="8"/><circle class="bg chip-dot" cx="72" cy="0" r="8"/>' + window.UI.check();
}
kit.scene('hook', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<div style="position:absolute;left:330px;top:700px;width:420px;height:560px;box-sizing:border-box;border:6px solid var(--ink);border-radius:56px;background:color-mix(in srgb, var(--ground) 94%, var(--ink))"></div>' +
      '<div style="position:absolute;left:480px;top:722px;width:120px;height:14px;border-radius:7px;background:var(--ink)"></div>' +
      '<p class="hk-q bubble" style="position:absolute;margin:0;right:354px;top:766px;width:340px;box-sizing:border-box;padding:16px 22px;border-radius:26px 26px 6px 26px;background:var(--ink);color:var(--ground);font-size:36px;line-height:1.25;font-weight:600;text-align:right">' + HK_Q + '</p>' +
      '<div class="hk-wait" style="position:absolute;left:362px;top:1000px;width:150px;height:64px;border-radius:26px 26px 26px 6px;background:color-mix(in srgb, var(--ink) 12%, var(--ground))"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350">' +
      '<g class="hk-dots"><circle class="blk" cx="402" cy="1032" r="9"/><circle class="blk" cx="437" cy="1032" r="9"/><circle class="blk" cx="472" cy="1032" r="9"/></g>' +
      '<g class="hk-chip">' + hkChip() + '</g>' +
      '<g class="hk-ans"><rect class="hot" x="362" y="1090" width="300" height="130" rx="26"/><rect class="bg hk-line" x="390" y="1120" width="220" height="12" rx="6"/><rect class="bg hk-line" x="390" y="1148" width="170" height="12" rx="6"/><rect class="bg hk-line" x="390" y="1176" width="130" height="12" rx="6"/></g></svg>' +
      '<p class="hk-tA" style="position:absolute;margin:0;left:770px;top:860px;font-family:var(--mono, ui-monospace, monospace);font-weight:700;font-size:50px;font-variant-numeric:tabular-nums;color:var(--ink)">0.00 s</p>' +
      '<p class="hk-tB" style="position:absolute;margin:0;left:770px;top:960px;font-family:var(--mono, ui-monospace, monospace);font-weight:700;font-size:50px;font-variant-numeric:tabular-nums;color:var(--main)">0.00 s</p>' +
      '<div class="words hk-a"><p class="kicker hk-k">New AI research</p><h1 class="line hk-la" style="font-size:104px">You ask your phone something. Then you wait.</h1></div>' +
      '<div class="words hk-b"><p class="kicker">New AI research</p><h1 class="line hk-lb" style="font-size:104px">What if it started searching while you were still talking?</h1></div></div>'));
    this.k = kit.stage.querySelector('.hk-k').style;
    this.la = kit.stage.querySelector('.hk-la');
    this.lb = kit.stage.querySelector('.hk-lb');
    this.a = kit.stage.querySelector('.hk-a').style;
    this.b = kit.stage.querySelector('.hk-b').style;
    this.q = window.UI.split(kit.stage.querySelector('.hk-q'));
    this.qbox = kit.stage.querySelector('.hk-q').style;
    this.wait = kit.stage.querySelector('.hk-wait').style;
    this.dots = Array.from(kit.stage.querySelectorAll('.hk-dots circle'));
    this.chip = kit.stage.querySelector('.hk-chip');
    this.ans = kit.stage.querySelector('.hk-ans').style;
    this.ans.transformOrigin = '362px 1220px';
    this.lines = Array.from(kit.stage.querySelectorAll('.hk-line'));
    this.lines.forEach(function (l) { l.style.transformOrigin = '390px 0px'; });
    this.tA = kit.stage.querySelector('.hk-tA');
    this.tB = kit.stage.querySelector('.hk-tB');
  },
  render(t) {
    this.k.opacity = eo(seg(t, -0.6, -0.2));
    TextFx.fadeFromRight(this.la, t, -0.6, { stagger: 0.08 });
    var outA = ei(seg(t, HK_SWAP - 0.3, HK_SWAP));
    this.a.opacity = 1 - outA; this.a.transform = 'translateX(' + (-40 * outA) + 'px)';
    this.b.opacity = t < HK_SWAP - 0.05 ? 0 : 1;
    TextFx.fadeFromRight(this.lb, t, HK_SWAP, { stagger: 0.07 });
    var B = HK[t < HK_SWAP ? 0 : 1];
    var gone = ei(seg(t, B.out, B.out + 0.2));
    window.UI.stream(this.q, t, B.q0, HK_STEP);
    this.qbox.opacity = eo(seg(t, B.q0 - 0.2, B.q0)) * (1 - gone);
    var hl = eo(seg(t, B.chip - 0.1, B.chip + 0.2));
    for (var h = 0; h < this.q.length; h++) this.q[h].style.color = HK_HL.indexOf(h) >= 0 && hl > 0 ? 'color-mix(in srgb, var(--main) ' + Math.round(hl * 100) + '%, var(--ground))' : '';
    var w = eo(seg(t, B.wait[0], B.wait[0] + 0.2)) * (1 - ei(seg(t, B.wait[1] - 0.15, B.wait[1])));
    this.wait.opacity = w;
    for (var i = 0; i < 3; i++) this.dots[i].style.opacity = w * (0.3 + 0.7 * Math.max(0, Math.sin(t * 6 - i * 0.9)));
    var c = seg(t, B.chip, B.chip + 0.4);
    var m = eio(seg(t, B.ans - 0.5, B.ans));
    this.chip.setAttribute('transform', 'translate(' + lerp(600, 510, m) + ' ' + lerp(1032, 1155, m) + ') scale(' + 0.62 * eob(c, 1.8) * (1 - 0.7 * m) + ')');
    this.chip.style.opacity = t < B.chip ? 0 : 1 - seg(t, B.ans - 0.12, B.ans + 0.05);
    window.UI.dots(this.chip, t, c >= 1, B.ans - 0.85);
    var an = seg(t, B.ans - 0.05, B.ans + 0.35);
    this.ans.opacity = Math.min(1, an * 3) * (1 - gone);
    this.ans.transform = 'scale(' + lerp(0.85, 1, eob(an, 1.6)) + ')';
    for (var j = 0; j < 3; j++) this.lines[j].style.transform = 'scaleX(' + eo(seg(t, B.ans + 0.3 + j * 0.2, B.ans + 0.65 + j * 0.2)) + ')';
    var A0 = HK[0], B1 = HK[1];
    this.tA.textContent = (A0.val * seg(t, A0.end, A0.ans)).toFixed(2) + ' s';
    this.tA.style.opacity = eo(seg(t, A0.end - 0.2, A0.end));
    this.tA.style.color = t >= HK_SWAP ? 'color-mix(in srgb, var(--ink) 45%, var(--ground))' : 'var(--ink)';
    this.tB.textContent = (B1.val * seg(t, B1.end, B1.ans)).toFixed(2) + ' s';
    this.tB.style.opacity = eo(seg(t, B1.end - 0.2, B1.end));
    var pop = seg(t, B1.ans, B1.ans + 0.4);
    this.tB.style.transform = 'scale(' + (1 + 0.12 * Math.sin(Math.PI * pop)) + ')';
    this.tB.style.transformOrigin = '0 50%';
  },
});
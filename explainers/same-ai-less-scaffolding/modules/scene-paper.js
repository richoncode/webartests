const { seg, eo, eob, lerp, TextFx } = kit;
kit.scene('paper', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' +
      '<div class="words" style="left:90px;top:140px;width:900px"><h2 class="line paper-h" style="font-size:120px">Read the paper</h2></div>' +
      '<div class="paper-card" style="position:absolute;left:90px;top:330px;width:900px;padding:56px 60px;box-sizing:border-box;border:3px solid var(--second);border-radius:14px;background:color-mix(in srgb, var(--ground) 94%, var(--second));box-shadow:0 18px 40px rgba(0,0,0,.08)">' +
      '<div class="words" style="position:static;gap:26px">' +
      '<p class="tag" style="color:var(--accent)">arXiv · cs.AI · 2026</p>' +
      '<p style="font-family:var(--display, var(--sans, system-ui, sans-serif));font-size:64px;line-height:1.05;font-weight:600">How Much of a Harness Does a Strong Agent Need for Autonomous ML Engineering?</p>' +
      '<p class="sub" style="font-size:36px">Kirill Brilliantov, Alejandro Hernández-Cano, Emmanuel Abbé · EPFL & Apple</p></div></div>' +
      '<div class="words paper-link" style="left:90px;top:1000px;width:900px;gap:18px">' +
      '<p class="num" style="font-size:50px;color:var(--main)">arxiv.org/abs/2609.40303</p>' +
      '<p class="tag paper-m" style="font-size:24px;color:color-mix(in srgb, var(--second) 60%, var(--ground))">Explainer made with Claude /motion</p></div></div>'));
    this.h = kit.stage.querySelector('.paper-h');
    this.card = kit.stage.querySelector('.paper-card').style;
    this.link = kit.stage.querySelector('.paper-link').style;
    this.m = kit.stage.querySelector('.paper-m').style;
  },
  render(t) {
    TextFx.fadeFromRight(this.h, t, 0.0);
    var c = seg(t, 0.4, 1.2);
    this.card.opacity = Math.min(1, c * 3);
    this.card.transform = 'translateY(' + lerp(80, 0, eob(c, 1.4)) + 'px) rotate(' + lerp(-2, 0, eo(c)) + 'deg) scale(' + (1 + t * 0.003) + ')';
    var l = eo(seg(t, 1.8, 2.4));
    this.link.opacity = l; this.link.transform = 'translateY(' + lerp(20, 0, l) + 'px)';
    this.m.opacity = eo(seg(t, 2.8, 3.4));
  },
});
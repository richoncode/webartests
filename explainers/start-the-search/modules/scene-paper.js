const { seg, eo, eob, lerp, TextFx } = kit;
kit.scene('paper', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<div class="words"><h2 class="line pa-l">Read the paper</h2></div>' +
      '<div class="card pa-card" style="left:90px;top:400px;width:900px;padding:56px 60px;box-sizing:border-box">' +
      '<div style="display:flex;flex-direction:column;gap:30px">' +
      '<p class="kicker" style="margin:0">arXiv 2610.07641</p>' +
      '<p style="margin:0;font-weight:600;font-size:44px;line-height:1.2">Hiding Tool Latency in On-Device Cascaded Voice Agent through Speculative Execution</p>' +
      '<p class="sub" style="margin:0;font-size:36px">Kyudan Jung, Hyunsin Park, Yoonhyung Lee, Jinhwan Park, Jinhyeok Yang, KiHyun Nam, Jaegul Choo, Jinkyu Lee · Qualcomm AI Research & KAIST AI</p></div></div>' +
      '<p class="tag pa-m" style="position:absolute;margin:0;left:90px;top:1200px;font-size:24px;letter-spacing:.08em;text-transform:none;font-weight:700;color:color-mix(in srgb, var(--ink) 60%, var(--ground))">Explainer made with Claude /motion</p></div>'));
    this.l = kit.stage.querySelector('.pa-l');
    this.card = kit.stage.querySelector('.pa-card').style;
    this.m = kit.stage.querySelector('.pa-m').style;
  },
  render(t) {
    TextFx.fadeFromRight(this.l, t, 0.0);
    var c = seg(t, 0.3, 1.1);
    this.card.opacity = Math.min(1, c * 3);
    this.card.transform = 'translateY(' + lerp(60, 0, eob(c, 1.3)) + 'px)';
    this.m.opacity = eo(seg(t, 1.6, 2.1));
  },
});
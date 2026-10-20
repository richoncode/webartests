const { seg, eo, eio, eob, lerp, TextFx } = kit;
kit.scene('rules', {
  init(kit) {
    var rIcon = '<g class="ru-ri" transform="translate(130 960)"><rect class="ru-rbg" x="-40" y="-40" width="80" height="80" rx="16" style="fill:var(--ink)"/>' +
      '<rect class="bg" x="-22" y="-20" width="44" height="7" rx="3"/><rect class="bg" x="-22" y="-4" width="30" height="7" rx="3"/><rect class="bg" x="-22" y="12" width="38" height="7" rx="3"/></g>';
    var aIcon = '<g transform="translate(130 1120)"><rect class="dim" x="-40" y="-40" width="80" height="80" rx="16"/>' +
      '<rect class="bg" x="-18" y="-18" width="36" height="36" rx="6"/><rect class="dim" x="-8" y="-8" width="16" height="16" rx="3"/></g>';
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350">' +
      '<rect class="rail" x="200" y="975" width="790" height="30" rx="15"/><rect class="rail" x="200" y="1135" width="790" height="30" rx="15"/>' +
      '<rect class="blk ru-rb" x="200" y="975" width="380" height="30" rx="15"/><rect class="dim ru-ab" x="200" y="1135" width="760" height="30" rx="15"/>' +
      '<line x1="680" y1="900" x2="680" y2="1190" class="ru-end" style="stroke:var(--main);stroke-width:5;stroke-dasharray:12 10"/>' +
      '<g class="ru-bub" transform="translate(680 1232)"><path d="M-34 -22 H34 Q44 -22 44 -12 V8 Q44 18 34 18 H6 L-6 32 L-6 18 H-34 Q-44 18 -44 8 V-12 Q-44 -22 -34 -22 Z" style="fill:none;stroke:var(--main);stroke-width:5;stroke-linejoin:round"/></g>' +
      rIcon + aIcon + '<circle class="ru-glow" cx="130" cy="960" r="56" style="fill:none;stroke:var(--main);stroke-width:6"/></svg>' +
      '<p class="tag" style="position:absolute;margin:0;left:200px;top:925px">RULES</p>' +
      '<p class="tag" style="position:absolute;margin:0;left:200px;top:1085px">AI</p>' +
      '<div class="words"><p class="kicker ru-k">Simple beat smart</p>' +
      '<h2 class="line ru-l" style="font-size:108px">Simple rules made the guesses, not a second AI.</h2>' +
      '<p class="sub ru-s">An AI guesser was more accurate on paper, but it was too slow on the phone and would compete for the same chip.</p></div></div>'));
    this.k = kit.stage.querySelector('.ru-k').style;
    this.l = kit.stage.querySelector('.ru-l');
    this.s = kit.stage.querySelector('.ru-s').style;
    this.rb = kit.stage.querySelector('.ru-rb').style;
    this.ab = kit.stage.querySelector('.ru-ab').style;
    this.rbg = kit.stage.querySelector('.ru-rbg').style;
    this.glow = kit.stage.querySelector('.ru-glow').style;
    this.end = kit.stage.querySelector('.ru-end').style;
    this.bub = kit.stage.querySelector('.ru-bub').style;
    this.rb.transformOrigin = '200px 990px';
    this.ab.transformOrigin = '200px 1150px';
    this.glow.transformOrigin = '130px 960px';
  },
  render(t) {
    this.k.opacity = eo(seg(t, 0, 0.4));
    TextFx.fadeFromRight(this.l, t, 0.1);
    var s = eo(seg(t, 0.8, 1.3));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(18, 0, s) + 'px)';
    var e = eo(seg(t, 2.2, 2.6));
    this.end.opacity = e; this.bub.opacity = e;
    this.rb.transform = 'scaleX(' + eio(seg(t, 2.6, 3.8)) + ')';
    this.ab.transform = 'scaleX(' + seg(t, 2.6, 6.2) + ')';
    var done = seg(t, 3.8, 4.2);
    this.rbg.fill = done > 0 ? 'var(--main)' : 'var(--ink)';
    this.rb.fill = done > 0 ? 'var(--main)' : 'var(--ink)';
    var g = seg(t, 3.8, 4.7);
    this.glow.opacity = g > 0 && g < 1 ? 1 - g : 0;
    this.glow.transform = 'scale(' + lerp(0.8, 1.8, eo(g)) + ')';
  },
});
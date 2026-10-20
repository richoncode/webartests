const { seg, eo, eob, lerp, TextFx } = kit;
const GUESS_SENT = 'Check the weather in Boston, then find nearby restaurants, and tell me the yen exchange rate';
const GUESS_X = [230, 540, 850];
kit.scene('guess', {
  init(kit) {
    var chips = '', bars = '';
    for (var i = 0; i < 3; i++) {
      chips += '<g class="guess-chip">' + window.UI.chip() + '</g>';
      bars += '<rect class="hot guess-bar" x="90" y="' + (738 + i * 70) + '" width="10" height="54" rx="5"/>';
      chips += '<line class="guess-trail" x1="' + GUESS_X[i] + '" y1="960" x2="' + GUESS_X[i] + '" y2="1060" style="stroke:var(--main);stroke-width:5;stroke-dasharray:8 10"/>';
    }
    kit.stage.append(kit.h('<div class="ground"><div class="grid"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350">' + bars + chips + '<g class="guess-ans">' + window.UI.answer() + '</g></svg>' +
      '<div class="guess-tr" style="position:absolute;left:124px;top:730px;width:870px"></div>' +
      '<div class="words"><p class="kicker guess-k">How it guesses</p><h2 class="line guess-l">It checks as you speak.</h2>' +
      '<p class="sub guess-s">After 6 words, every 5 more, or a 300 ms pause. Each clause gets its own search.</p></div></div>'));
    var box = kit.stage.querySelector('.guess-tr');
    var src = document.createElement('p'); src.textContent = GUESS_SENT;
    var spans = window.UI.split(src), lines = [], cur = null;
    for (var j = 0; j < spans.length; j++) {
      var w = spans[j].textContent;
      if (j === 0 || w === 'then' || w === 'and') { cur = document.createElement('p'); cur.className = 'tr'; cur.style.margin = '0'; cur.style.whiteSpace = 'nowrap'; box.appendChild(cur); lines.push(j); }
      cur.appendChild(spans[j]);
    }
    this.w = spans;
    this.ends = [lines[1] - 1, lines[2] - 1, spans.length - 1];
    this.l = kit.stage.querySelector('.guess-l');
    this.k = kit.stage.querySelector('.guess-k').style;
    this.s = kit.stage.querySelector('.guess-s').style;
    this.chips = Array.from(kit.stage.querySelectorAll('.guess-chip'));
    this.ans = kit.stage.querySelector('.guess-ans');
    this.trails = Array.from(kit.stage.querySelectorAll('.guess-trail'));
    this.bars = Array.from(kit.stage.querySelectorAll('.guess-bar'));
    this.bars.forEach(function (b, i) { b.style.transformOrigin = '95px ' + (765 + i * 70) + 'px'; });
  },
  render(t) {
    var G = window.TT.guess;
    this.k.opacity = eo(seg(t, 0, 0.4));
    TextFx.fadeFromRight(this.l, t, 0.1);
    var s = eo(seg(t, 0.6, 1.1));
    this.s.opacity = s; this.s.transform = 'translateY(' + lerp(20, 0, s) + 'px)';
    window.UI.stream(this.w, t, G.w0, G.step);
    for (var i = 0; i < 3; i++) {
      var tl = G.w0 + this.ends[i] * G.step + 0.15;
      this.bars[i].style.transform = 'scaleY(' + eob(seg(t, tl, tl + 0.35), 1.6) + ')';
      var p = seg(t, tl, tl + 0.5);
      this.trails[i].style.opacity = eo(seg(t, tl, tl + 0.2)) * (1 - eo(seg(t, tl + 0.5, tl + 1.0)));
      this.chips[i].setAttribute('transform', 'translate(' + GUESS_X[i] + ' ' + lerp(980, 1110, eo(p)) + ') scale(' + lerp(0.4, 1, eob(p, 1.6)) + ')');
      this.chips[i].style.opacity = Math.min(1, p * 4);
      window.UI.dots(this.chips[i], t, p >= 1, Math.min(tl + 1.3, window.TT.ans.guess - 0.35));
    }
    window.UI.pop(this.ans, t, window.TT.ans.guess, 540, 1235, 0.9);
  },
});
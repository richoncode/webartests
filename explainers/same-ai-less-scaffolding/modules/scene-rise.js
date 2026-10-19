const { seg, eo, ei, eob, lerp, TextFx } = kit;
const RISE_LABELS = ['SEARCH TREE', 'SUB-AGENTS', 'MEMORY', 'ORCHESTRATOR'];
kit.scene('rise', {
  init(kit) {
    var boxes = '';
    for (var i = 0; i < 4; i++) {
      var w = 440 - i * 40, y = -205 - i * 86;
      boxes += '<g class="rise-box"><rect class="addon" x="' + (-w / 2) + '" y="' + y + '" width="' + w + '" height="70" rx="10"/>' +
        '<text x="0" y="' + (y + 46) + '" text-anchor="middle" class="tag" style="font-size:28px;fill:var(--second)">' + RISE_LABELS[i] + '</text></g>';
    }
    kit.stage.append(kit.h('<div class="ground"><div class="paper"></div>' +
      '<svg class="art" viewBox="0 0 1080 1350"><g class="rise-tower">' + boxes +
      '<circle class="engine" cx="0" cy="-40" r="100"/><circle cx="0" cy="-40" r="34" style="fill:var(--ground)"/>' +
      '<text x="0" y="92" text-anchor="middle" class="tag rise-cap" style="fill:var(--second)">THE AI MODEL</text></g></svg>' +
      '<div class="words rise-a" style="left:90px;top:170px;width:900px"><h2 class="line rise-la">AI agents now build ML models on their own.</h2></div>' +
      '<div class="words rise-b" style="left:90px;top:170px;width:900px"><h2 class="line rise-lb">So teams keep bolting on more parts.</h2></div></div>'));
    this.la = kit.stage.querySelector('.rise-la');
    this.lb = kit.stage.querySelector('.rise-lb');
    this.a = kit.stage.querySelector('.rise-a').style;
    this.b = kit.stage.querySelector('.rise-b').style;
    this.tower = kit.stage.querySelector('.rise-tower');
    this.boxes = Array.from(kit.stage.querySelectorAll('.rise-box'));
  },
  render(t) {
    TextFx.fadeFromRight(this.la, t, 0.1);
    var out = ei(seg(t, 3.0, 3.4));
    this.a.opacity = 1 - out; this.a.transform = 'translateX(' + (-40 * out) + 'px)';
    this.b.opacity = t < 3.3 ? 0 : 1;
    TextFx.fadeFromRight(this.lb, t, 3.4);
    var tin = eob(seg(t, 0.6, 1.4), 1.6);
    for (var i = 0; i < this.boxes.length; i++) {
      var p = seg(t, 4.0 + i * 0.55, 4.5 + i * 0.55);
      this.boxes[i].style.opacity = Math.min(1, p * 3);
      this.boxes[i].style.transform = 'translateY(' + lerp(-220, 0, eob(p, 1.8)) + 'px)';
    }
    var wob = Math.sin(t * 2.4) * lerp(0, 1.8, seg(t, 5.5, 6.8));
    this.tower.setAttribute('transform', 'translate(540 ' + lerp(1400, 1150, tin) + ') rotate(' + wob + ')');
  },
});
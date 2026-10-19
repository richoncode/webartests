window.UI = {
  lanesY: [600, 730, 860, 990, 1120],
  racers: [
    { key:'me', label:'Plain coding agent', addons:0 },
    { key:'a', label:'Arbor', addons:3 },
    { key:'b', label:'AiScientist', addons:2 },
    { key:'c', label:'MLEvolve', addons:4 },
    { key:'d', label:'ScienceFlow', addons:3 }
  ],
  racer(r) {
    var s = '';
    for (var i = 0; i < r.addons; i++) {
      var w = 70 - i * 8, y = -58 - i * 34;
      s += '<rect class="addon" x="' + (-w / 2) + '" y="' + y + '" width="' + w + '" height="28" rx="5"/>';
    }
    s += '<circle class="' + (r.key === 'me' ? 'engine-me' : 'engine') + '" cx="0" cy="0" r="34"/>';
    return s + '<circle cx="0" cy="0" r="12" style="fill:var(--ground)"/>';
  },
  lanes(kit) {
    var U = this, svg = '', words = '';
    for (var i = 0; i < 5; i++) {
      var y = U.lanesY[i], r = U.racers[i];
      svg += '<line class="track" x1="90" y1="' + (y + 26) + '" x2="990" y2="' + (y + 26) + '"/>';
      svg += '<g class="lane-r" transform="translate(170 ' + y + ') scale(.6)">' + U.racer(r) + '</g>';
      words += '<p class="name lane-n' + (i === 0 ? ' hl' : '') + '" style="position:absolute;margin:0;left:250px;top:' + (y - 40) + 'px;font-size:40px">' + r.label + '</p>';
    }
    return { svg: svg, words: words };
  }
};
kit.stage.append(kit.h('<div class="foot"><span>Paper explained</span><span>arXiv 2609.40303</span></div>'));
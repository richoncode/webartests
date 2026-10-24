/* Track grammar, chunk chaining, and the solvability pilot.
   Rows are 3 lanes × 2 decks. Tokens: = _ / L R ^ v # o . M
   A chunk is appended only when every safe exit lane lines up with an entry.
*/
(function (global) {
  'use strict';

  var RR = global.RR;
  var ROW = RR.ROW;
  var G = RR.G;

  function kmhAt(t, endless) {
    var stage = Math.max(0, Math.floor(t / 30));
    var climb = endless ? 58 : 48;
    var base = 60 + climb * (1 - Math.exp(-Math.max(0, t) / 26));
    var cap = endless ? 150 : 128;
    return Math.min(cap, base * Math.pow(1.08, stage));
  }

  function lookaheadM(vz) {
    return Math.max(150, vz * 3.4);
  }

  function parseRows(text) {
    var rows = [];
    String(text).split('\n').forEach(function (line) {
      var s = line.trim();
      if (!s || s.charAt(0) === '#') return;
      var m = s.match(/^(.*)\*(\d+)$/);
      var body = (m ? m[1] : s).replace(/\s+/g, '');
      var n = m ? +m[2] : 1;
      if (body.length !== 6) throw new Error('row needs 6 tokens: ' + s);
      var k;
      for (k = 0; k < n; k++) {
        var g = [body.charAt(0), body.charAt(1), body.charAt(2)];
        var u = [body.charAt(3), body.charAt(4), body.charAt(5)];
        var row = { g: g, u: u };
        var mi = body.indexOf('M');
        if (mi >= 0) {
          var lane = mi % 3;
          row.mover = {
            deck: mi >= 3 ? 1 : 0,
            lanes: [lane, lane === 2 ? 1 : lane + 1],
            speed: 0.2
          };
        }
        rows.push(row);
      }
    });
    return rows;
  }

  function chunk(id, difficulty, tagStage, text, skyOnly) {
    var rows = parseRows(text);
    return {
      id: id,
      difficulty: difficulty,
      tagStage: tagStage,
      skyOnly: !!skyOnly,
      rows: rows,
      entry: [],
      exit: [],
      ok: false
    };
  }

  function floorsAt(row, deck) {
    var chars = deck ? row.u : row.g;
    var out = [];
    var i;
    for (i = 0; i < 3; i++) if (RR.isFloor(chars[i]) && chars[i] !== '#') out.push({ lane: i, deck: deck });
    return out;
  }

  function sameSpot(a, b) { return a.lane === b.lane && a.deck === b.deck; }

  function uniqSpots(list) {
    var out = [];
    list.forEach(function (s) {
      if (!out.some(function (o) { return sameSpot(o, s); })) out.push({ lane: s.lane, deck: s.deck });
    });
    return out;
  }

  function subset(exit, entry) {
    return exit.every(function (e) {
      return entry.some(function (n) { return sameSpot(e, n); });
    });
  }

  function overlaps(exit, entry) {
    return exit.some(function (e) {
      return entry.some(function (n) { return sameSpot(e, n); });
    });
  }

  function pilotPolicy(state, world, opt) {
    function search(list) {
      var best = null;
      var i, c, sim, k, survived, key;
      for (i = 0; i < list.length; i++) {
        c = list[i];
        sim = RR.cloneState(state);
        sim.targetLane = c.lane;
        survived = true;
        for (k = 0; k < 110; k++) {
          sim.vz = state.vz;
          RR.step(sim, world, { thrust: !!c.thrust }, RR.STEP, opt || {});
          if (!sim.alive) { survived = false; break; }
        }
        key = (survived ? 1000000 : 0) + sim.z - (c.thrust ? 40 : 0) - Math.abs(c.lane - state.targetLane) * 6;
        if (!best || key > best.key) best = { key: key, lane: c.lane, thrust: !!c.thrust, alive: survived, z: sim.z };
      }
      return best;
    }
    var basic = [0, 1, 2].map(function (lane) { return { lane: lane, thrust: 0 }; });
    var best = search(basic);
    if (best && best.alive) return best;
    if (opt && opt.noThrust) return best || { lane: state.targetLane, thrust: false, alive: false };
    var extra = search([0, 1, 2].map(function (lane) { return { lane: lane, thrust: 1 }; }));
    if (extra && (!best || extra.key > best.key)) return extra;
    return best || { lane: state.targetLane, thrust: false, alive: false };
  }

  function padded(rows) {
    var out = rows.slice();
    var i;
    for (i = 0; i < 18; i++) out.push({ g: ['=', '=', '='], u: ['=', '=', '='] });
    return out;
  }

  function runPilot(rows, entry, vz, opt) {
    opt = opt || {};
    var world = { rows: padded(rows), endless: false };
    var s = RR.createState({
      z: 0.12,
      lane: entry.lane,
      targetLane: entry.lane,
      deck: entry.deck,
      vz: vz
    });
    var endZ = (rows.length - 0.3) * ROW;
    var hold = 0;
    var policy = { steer: 0, thrust: false };
    var steps = 0;
    while (s.alive && s.z < endZ && s.t < 80 && steps < 16000) {
      if (hold <= 0) {
        policy = pilotPolicy(s, world, opt);
        hold = 0.22;
        if (policy.lane != null) s.targetLane = policy.lane;
      }
      s.vz = vz * (s.slowT > 0 ? 0.82 : 1);
      RR.step(s, world, { thrust: !!policy.thrust }, RR.STEP, opt);
      hold -= RR.STEP;
      steps++;
    }
    return {
      ok: !!(s.alive && s.z >= endZ - 2 && s.y > -0.4 && !s.airborne && s.fuel >= RR.TANK * 0.3),
      alive: s.alive,
      fuel: s.fuel,
      lane: RR.laneFromX(s.x),
      deck: s.deck,
      airborne: s.airborne,
      crash: s.crash,
      z: s.z,
      y: s.y,
      maxDeck: s.maxDeck,
      score: s.score,
      t: s.t
    };
  }

  function runCurve(rows, kmhFn, entry) {
    entry = entry || { lane: 1, deck: 0 };
    var world = { rows: padded(rows), endless: false, finishZ: (rows.length - 3) * ROW };
    var s = RR.createState({
      z: 0.12,
      lane: entry.lane,
      targetLane: entry.lane,
      deck: entry.deck,
      vz: kmhFn(0) / 3.6
    });
    var endZ = world.finishZ;
    var hold = 0;
    var policy = { steer: 0, thrust: false };
    var steps = 0;
    while (s.alive && !s.finished && s.z < endZ && s.t < 150 && steps < 22000) {
      if (hold <= 0) {
        policy = pilotPolicy(s, world, {});
        hold = 0.22;
        if (policy.lane != null) s.targetLane = policy.lane;
      }
      s.vz = kmhFn(s.t) / 3.6 * (s.slowT > 0 ? 0.82 : 1);
      RR.step(s, world, { thrust: !!policy.thrust }, RR.STEP);
      hold -= RR.STEP;
      steps++;
    }
    return s;
  }

  function breathRow(exit) {
    var g = ['.', '.', '.'];
    var u = ['.', '.', '.'];
    var ground = false;
    var upper = false;
    exit.forEach(function (e) {
      if (e.deck) { u[e.lane] = '='; upper = true; }
      else { g[e.lane] = '='; ground = true; }
    });
    if (upper) {
      var i;
      for (i = 0; i < 3; i++) if (g[i] === '.') g[i] = '=';
    }
    if (!ground && !upper) g = ['=', '=', '='];
    return { g: g, u: u };
  }

  function changedDeck(rows) {
    var i, r;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (r.g.indexOf('^') >= 0 || r.u.indexOf('v') >= 0 || r.u.indexOf('^') >= 0) return true;
    }
    return false;
  }

  function buildDeck(id, difficulty, withDrop) {
    var rows = [];
    function add(g0, g1, g2, u0, u1, u2, n) {
      var i;
      for (i = 0; i < n; i++) rows.push({ g: [g0, g1, g2], u: [u0, u1, u2] });
    }
    add('=', '=', '=', '.', '.', '.', 6);
    add('^', '^', '=', '.', '.', '.', 1);
    add('=', '=', '=', '.', '.', '.', 2);
    add('=', '=', '=', '=', '=', '.', 16);
    add('=', '=', '=', 'o', '=', '.', 1);
    add('=', '=', '=', '=', '=', '.', 4);
    if (withDrop) {
      add('=', '=', '=', 'v', 'v', '.', 1);
      add('=', '=', '=', '.', '.', '.', 12);
    }
    add('=', '=', '=', '.', '.', '.', 4);
    return {
      id: id, difficulty: difficulty, tagStage: 3, skyOnly: false,
      rows: rows, entry: [], exit: [], ok: false, deck: true
    };
  }

  var CHUNKS = [
    chunk('cruise', 1, 0, '===...*8\n=o=...*1\n===...*6'),
    chunk('cruise-long', 1, 0, '===...*14'),
    chunk('gap-mid', 1, 0, '===...*8\n=_=...*1\n===...*10'),
    chunk('gap-left', 1, 0, '===...*8\n_==...*1\n===...*10'),
    chunk('gap-right', 1, 0, '===...*8\n==_...*1\n===...*10'),
    chunk('gap-stagger', 2, 0, '===...*8\n=_=...*1\n===...*6\n==_...*1\n===...*10'),
    chunk('ramp-gap', 1, 0, '===...*6\n///...*1\n___...*1\n===...*14'),
    chunk('ramp-gap-2', 2, 0, '===...*8\n///...*1\n___...*1\n===...*16'),
    chunk('cans', 1, 0, '===...*6\n=o=...*1\n===...*5\no==...*1\n===...*6'),
    chunk('adj-right', 2, 1, '===...*8\n=R=...*1\n=_=...*1\n===...*14'),
    chunk('adj-left', 2, 1, '===...*8\n=L=...*1\n=_=...*1\n===...*14'),
    chunk('adj-cross', 3, 1, '===...*8\nR==...*1\n_==...*1\n===...*6\n==L...*1\n==_...*1\n===...*12'),
    chunk('block-mid', 2, 2, '===...*8\n=#=...*1\n===...*10'),
    chunk('block-side', 3, 2, '===...*8\n#==...*1\n===...*6\n==#...*1\n===...*10'),
    chunk('block-return', 3, 2, '===...*8\n=#=...*1\n===...*6\n#=#...*1\n===...*10'),
    chunk('narrow', 6, 6, '===...*8\n==....*8\n===...*8'),
    chunk('mover', 5, 5, '===...*10\nM==...*12\n===...*8'),
    buildDeck('deck-line', 4, true),
    buildDeck('deck-line-b', 5, true)
  ];

  function speedsFor(ch) {
    var stage = Math.max(0, ch.tagStage);
    var fast = kmhAt(stage * 30 + 20, true) / 3.6;
    var list = [16.8, Math.max(18, fast)];
    if (ch.deck) list = [24, Math.min(40, Math.max(26, fast))];
    return list;
  }

  function analyze(ch) {
    var fails = [];
    var entries = floorsAt(ch.rows[0], 0).concat(ch.skyOnly ? [] : []);
    if (ch.skyOnly) entries = floorsAt(ch.rows[0], 1);
    else {
      entries = floorsAt(ch.rows[0], 0);
      if (!entries.length) entries = floorsAt(ch.rows[0], 1);
    }
    ch.entry = entries;
    var speeds = speedsFor(ch);
    var exits = [];
    var si, ei, r, vz;
    for (si = 0; si < speeds.length; si++) {
      vz = speeds[si];
      for (ei = 0; ei < entries.length; ei++) {
        r = runPilot(ch.rows, entries[ei], vz, {});
        if (!r.ok) fails.push(ch.id + ' @' + (vz * 3.6).toFixed(0) + 'km/h lane ' + entries[ei].lane + '/' + entries[ei].deck + ' ' + (r.crash || (r.airborne ? 'air' : 'short')) + ' z' + r.z.toFixed(0) + ' fuel' + r.fuel.toFixed(1));
        else if (si === speeds.length - 1) exits.push({ lane: r.lane, deck: r.deck, maxDeck: r.maxDeck });
      }
    }
    if (!ch.skyOnly) {
      var ge = entries.filter(function (e) { return e.deck === 0; });
      if (!ge.length) fails.push(ch.id + ' no ground entry');
      else {
        r = runPilot(ch.rows, ge[0], speeds[0], { noDeck: true, noThrust: true });
        if (!r.ok) fails.push(ch.id + ' ground solution ' + (r.crash || 'fail') + ' z' + r.z.toFixed(0));
      }
    }
    if (ch.deck && fails.length === 0) {
      var up = runPilot(ch.rows, { lane: 0, deck: 0 }, 26, {});
      if (!(up.ok && up.maxDeck >= 1)) fails.push(ch.id + ' never reached upper deck');
    }
    var decksSeen = {};
    exits.forEach(function (e) { decksSeen[e.deck] = true; });
    var exit = [];
    Object.keys(decksSeen).forEach(function (d) {
      floorsAt(ch.rows[ch.rows.length - 1], +d).forEach(function (s) { exit.push(s); });
    });
    if (!exit.length) exit = exits.map(function (e) { return { lane: e.lane, deck: e.deck }; });
    ch.exit = uniqSpots(exit);
    ch.ok = fails.length === 0 && ch.entry.length > 0 && ch.exit.length > 0;
    ch.fails = fails;
    return fails;
  }

  function bfsOne(ch, vz) {
    var entry = ch.entry[0];
    if (!entry) return { ok: false, expanded: 0 };
    var world = { rows: padded(ch.rows), endless: false };
    var q = [RR.createState({ z: 0.12, lane: entry.lane, targetLane: entry.lane, deck: entry.deck, vz: vz })];
    var seen = {};
    var n = 0;
    var endZ = (ch.rows.length - 0.35) * ROW;
    var cap = 4000;
    while (q.length && n < cap) {
      var s = q.shift();
      n++;
      if (!s.alive) continue;
      if (s.z >= endZ && s.fuel >= RR.TANK * 0.3 && s.y > -0.4 && !s.airborne) return { ok: true, expanded: n };
      var key = Math.floor(s.z / ROW) + ':' + s.targetLane + ':' + (s.airborne ? 1 : 0) + ':' + s.deck + ':' + Math.round(s.fuel);
      if (seen[key]) continue;
      seen[key] = 1;
      var actions = [0, 1, 2].map(function (lane) { return { lane: lane, thrust: 0 }; });
      actions.push({ lane: s.targetLane, thrust: 1 });
      var a;
      for (a = 0; a < actions.length; a++) {
        var c = RR.cloneState(s);
        c.targetLane = actions[a].lane;
        var limit = (Math.floor(c.z / ROW) + 1) * ROW + 0.08;
        var k = 0;
        while (c.alive && c.z < limit && k++ < 70) {
          c.vz = vz;
          RR.step(c, world, { thrust: !!actions[a].thrust }, RR.STEP);
        }
        if (c.alive) q.push(c);
      }
    }
    return { ok: false, expanded: n, capped: n >= cap };
  }

  var prepared = false;
  var auditCache = null;

  function geometryIndex() {
    CHUNKS.forEach(function (ch) {
      var deck = ch.skyOnly ? 1 : 0;
      ch.entry = floorsAt(ch.rows[0], deck);
      if (!ch.entry.length) ch.entry = floorsAt(ch.rows[0], deck ? 0 : 1);
      var last = ch.rows[ch.rows.length - 1];
      ch.exit = uniqSpots(floorsAt(last, 0).concat(floorsAt(last, 1)));
      ch.ok = ch.entry.length > 0 && ch.exit.length > 0;
      ch.fails = [];
    });
  }

  function prepare() {
    if (prepared) return auditCache;
    geometryIndex();
    prepared = true;
    auditCache = { fails: [], chunks: CHUNKS.filter(function (c) { return c.ok; }).map(function (c) { return c.id; }) };
    return auditCache;
  }

  function byId(id) {
    prepare();
    var i;
    for (i = 0; i < CHUNKS.length; i++) if (CHUNKS[i].id === id) return CHUNKS[i];
    return null;
  }

  function pushChunk(world, ch, stage) {
    var exit = world.exit;
    if (exit && exit.length && !subset(exit, ch.entry)) return false;
    if (world.rows.length && changedDeck(world.lastRows || [])) {
      world.rows.push(breathRow(exit));
      world.rows.push(breathRow(exit));
    }
    var extra = world.endless ? Math.max(0, 2 - Math.floor((stage || 0) / 2)) : 0;
    var e;
    for (e = 0; e < extra; e++) world.rows.push(breathRow(exit && exit.length ? exit : ch.entry));
    ch.rows.forEach(function (r) { world.rows.push(r); });
    world.exit = ch.exit.slice();
    world.lastRows = ch.rows;
    world.sky = ch.exit.some(function (x) { return x.deck === 1; }) ? (world.sky || 0) + 1 : 0;
    return true;
  }

  function assemble(ids) {
    prepare();
    var world = { rows: [], endless: false, exit: null, lastRows: null, sky: 0, finishZ: 0 };
    var i, ch;
    for (i = 0; i < ids.length; i++) {
      ch = byId(ids[i]);
      if (!ch || !ch.ok) throw new Error('missing chunk ' + ids[i]);
      if (!pushChunk(world, ch, 0)) throw new Error('unsafe join into ' + ids[i]);
    }
    var t;
    for (t = 0; t < 8; t++) world.rows.push({ g: ['=', '=', '='], u: ['.', '.', '.'] });
    world.finishZ = (world.rows.length - 4) * ROW;
    world.endless = false;
    return world;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function pickChunk(world, stage, rng) {
    prepare();
    var cap = Math.min(10, stage + 1);
    var pool = CHUNKS.filter(function (c) {
      return c.ok && c.tagStage <= stage && c.difficulty <= cap && subset(world.exit, c.entry) && (!c.skyOnly || world.sky > 0);
    });
    if (rng() < 1 / 6) {
      var easier = pool.filter(function (c) { return c.difficulty <= Math.max(1, cap - 1) && c.tagStage <= Math.max(0, stage - 1); });
      if (easier.length) pool = easier;
    }
    if (world.sky >= 2) pool = pool.filter(function (c) { return !c.deck; });
    var i, j, choice;
    for (i = pool.length - 1; i > 0; i--) {
      j = Math.floor(rng() * (i + 1));
      choice = pool[i]; pool[i] = pool[j]; pool[j] = choice;
    }
    if (pool.length) return pool[0];
    return byId('cruise');
  }

  function grow(world, zNeed, t) {
    var guard = 0;
    var stage;
    while ((world.rows.length * ROW) < zNeed && guard++ < 8) {
      stage = Math.floor(Math.max(0, t) / 30);
      var next = pickChunk(world, stage, world.rng);
      if (!pushChunk(world, next, stage)) {
        pushChunk(world, byId('cruise'), stage);
      }
    }
  }

  function makeEndless(opt) {
    prepare();
    opt = opt || {};
    var day = Math.floor(Date.now() / 86400000);
    var salt = opt.seed != null ? opt.seed : (day * 10007 + Math.floor(Math.random() * 1e9));
    var daily = mulberry32(day + 17);
    var session = mulberry32(salt);
    var draws = 0;
    var rng = function () {
      draws++;
      return draws <= 4 ? daily() : session();
    };
    var cruise = byId('cruise-long');
    var world = {
      rows: [],
      endless: true,
      exit: cruise.entry.slice(),
      lastRows: null,
      sky: 0,
      finishZ: 0,
      rng: rng,
      seed: salt,
      day: day
    };
    pushChunk(world, cruise, 0);
    pushChunk(world, byId('gap-mid'), 0);
    grow(world, 220, 0);
    return world;
  }

  var TRACKS = [
    {
      id: 'first-light',
      name: 'First Light',
      blurb: 'Learn the road. Gaps, a ramp, and a can of nitrogen.',
      chunks: ['cruise-long', 'gap-mid', 'ramp-gap', 'gap-left', 'cans', 'gap-right', 'ramp-gap', 'gap-stagger', 'cruise', 'ramp-gap-2', 'cans', 'cruise-long']
    },
    {
      id: 'switchback',
      name: 'Switchback',
      blurb: 'Ramps that land one lane over, then the blocks start.',
      chunks: ['cruise-long', 'adj-right', 'block-mid', 'adj-left', 'gap-stagger', 'block-side', 'adj-cross', 'cans', 'ramp-gap-2', 'block-return', 'adj-right', 'cruise']
    },
    {
      id: 'high-line',
      name: 'High Line',
      blurb: 'Take the cyan ramp. The upper deck pays double, then drops you back.',
      chunks: ['cruise-long', 'cruise-long', 'ramp-gap', 'cans', 'deck-line', 'block-mid', 'gap-mid', 'adj-right', 'deck-line-b', 'block-side', 'cans', 'cruise']
    }
  ];

  function audit(opt) {
    opt = opt || {};
    var fails = [];
    CHUNKS.forEach(function (ch) {
      analyze(ch).forEach(function (f) { fails.push(f); });
    });
    prepared = true;
    auditCache = { fails: fails.slice(), chunks: CHUNKS.filter(function (c) { return c.ok; }).map(function (c) { return c.id; }) };
    var bfs = [];
    if (opt.bfs) {
      CHUNKS.forEach(function (ch) {
        if (!ch.ok) return;
        var result = bfsOne(ch, speedsFor(ch)[0]);
        bfs.push({ id: ch.id, ok: result.ok, expanded: result.expanded, capped: !!result.capped });
        if (!result.ok && !result.capped) fails.push(ch.id + ' bfs found no path (' + result.expanded + ' nodes)');
      });
    }
    TRACKS.forEach(function (tr) {
      var world;
      try { world = assemble(tr.chunks); }
      catch (err) { fails.push('track ' + tr.id + ' ' + err.message); return; }
      var s = runCurve(world.rows, function (t) { return kmhAt(t, false); }, { lane: 1, deck: 0 });
      if (!s.alive || s.z < world.finishZ - 8) {
        fails.push('track ' + tr.id + ' pilot ' + (s.crash || 'short') + ' z' + s.z.toFixed(0) + '/' + world.finishZ.toFixed(0));
      }
      if (tr.id === 'high-line' && s.maxDeck < 1) fails.push('track high-line never reached the upper deck');
      tr.lengthM = world.rows.length * ROW;
      tr.finishZ = world.finishZ;
    });
    if (subset([{ lane: 2, deck: 0 }], [{ lane: 0, deck: 0 }])) fails.push('subset allowed a lane that does not line up');
    if (!subset([{ lane: 1, deck: 0 }], [{ lane: 0, deck: 0 }, { lane: 1, deck: 0 }, { lane: 2, deck: 0 }])) {
      fails.push('subset rejected lined-up lanes');
    }
    return { ok: fails.length === 0, fails: fails, bfs: bfs, chunks: auditCache.chunks };
  }

  global.RoadsterTrack = {
    kmhAt: kmhAt,
    lookaheadM: lookaheadM,
    CHUNKS: CHUNKS,
    TRACKS: TRACKS,
    prepare: prepare,
    audit: audit,
    assemble: assemble,
    makeEndless: makeEndless,
    grow: grow,
    byId: byId,
    subset: subset,
    overlaps: overlaps,
    runPilot: runPilot,
    runCurve: runCurve,
    bfsOne: bfsOne
  };
})(typeof window !== 'undefined' ? window : globalThis);

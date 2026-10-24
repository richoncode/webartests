/* Roadster Run.
   Defaults taken from the design draft where it left a question open:
   - bottom 40% steers, top 60% thrusts (the zone is where the finger lands)
   - a tap steers on touch-down; a slide is one lane per 18% of width,
     and that first tap already counts as the first step
   - double-tap latches a 0.6 s thrust burst; a hold starts immediately
   - a barrel roll needs air, thrust, and an outward steer from an outer lane
   - the upper deck is a finite stretch that drops back to the ground
   - Endless is the first mode, ahead of the three authored tracks
*/
(function () {
  'use strict';

  var RR = window.RR;
  var Track = window.RoadsterTrack;
  var Draw = window.RoadsterDraw;
  var Audio = window.RoadsterAudio;
  var SAVE_KEY = 'roadster-run-v1';
  var SLIDE_PX = 12;
  var DOUBLE_MS = 280;

  var app = document.getElementById('app');
  var canvas = document.getElementById('view');
  var ctx = canvas.getContext('2d');
  var hud = document.getElementById('hud');
  var menu = document.getElementById('menu');
  var hint = document.getElementById('hint');
  var end = document.getElementById('end');
  var modesEl = document.getElementById('modes');
  var scoreEl = document.getElementById('score');
  var comboEl = document.getElementById('combo');
  var speedEl = document.getElementById('speed');
  var fuelBar = document.getElementById('fuel-bar');
  var heatBar = document.getElementById('heat-bar');
  var muteBtn = document.getElementById('mute');
  var menuMute = document.getElementById('menu-mute');
  var hintGo = document.getElementById('hint-go');
  var endKicker = document.getElementById('end-kicker');
  var endTitle = document.getElementById('end-title');
  var endStars = document.getElementById('end-stars');
  var endScore = document.getElementById('end-score');
  var endDetail = document.getElementById('end-detail');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var save = loadSave();
  var screen = 'menu';
  var modeId = 'endless';
  var state = null;
  var world = null;
  var preview = null;
  var previewWorld = null;
  var previewAcc = 0;
  var acc = 0;
  var steerQueue = [];
  var pointers = Object.create(null);
  var keys = { thrust: false };
  var rightDown = false;
  var wheelUntil = 0;
  var scriptThrust = false;
  var lastThrustDown = 0;
  var popups = [];
  var shadow = null;
  var fuelBonusGiven = false;
  var hintReturn = 'menu';
  var lastEdge = false;
  var frames = 0;
  var lastTs = 0;

  function blankSave() {
    return { v: 1, sound: true, hintSeen: false, best: { endless: 0 } };
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return blankSave();
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !data.best || typeof data.best !== 'object') return blankSave();
      return {
        v: 1,
        sound: data.sound !== false,
        hintSeen: !!data.hintSeen,
        best: data.best
      };
    } catch (err) {
      return blankSave();
    }
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) { /* private mode */ }
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function trackById(id) {
    var i;
    for (i = 0; i < Track.TRACKS.length; i++) if (Track.TRACKS[i].id === id) return Track.TRACKS[i];
    return null;
  }

  function bestText(id) {
    var b = save.best[id];
    if (id === 'endless') return b ? String(b) : '';
    if (!b || !b.score) return '';
    var stars = '';
    var n = b.stars || 0;
    var i;
    for (i = 0; i < n; i++) stars += '★';
    return b.score + (stars ? ' ' + stars : '');
  }

  function renderMenu() {
    var html = '';
    html += modeButton('endless', 'Endless', 'The road keeps coming. Your best distance score stays on this phone.');
    Track.TRACKS.forEach(function (tr) {
      html += modeButton(tr.id, tr.name, tr.blurb);
    });
    modesEl.innerHTML = html;
    Array.prototype.forEach.call(modesEl.querySelectorAll('button'), function (btn) {
      btn.addEventListener('click', function () { begin(btn.getAttribute('data-mode')); });
    });
    syncMute();
  }

  function modeButton(id, name, blurb) {
    var best = bestText(id);
    return '<button type="button" data-mode="' + id + '">' +
      (best ? '<span class="best">' + best + '</span>' : '') +
      '<b>' + name + '</b><small>' + blurb + '</small></button>';
  }

  function syncMute() {
    var on = save.sound !== false;
    Audio.setMuted(!on);
    muteBtn.textContent = on ? '♫' : '×';
    muteBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
    muteBtn.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
    menuMute.textContent = on ? 'Sound on' : 'Sound off';
    menuMute.setAttribute('aria-pressed', on ? 'false' : 'true');
  }

  function toggleMute() {
    save.sound = save.sound === false;
    writeSave();
    syncMute();
    if (save.sound) Audio.ensure();
  }

  function makePreview() {
    Track.prepare();
    var ch = Track.byId('cruise-long');
    var rows = ch.rows.slice();
    var i;
    for (i = 0; i < 24; i++) rows.push({ g: ['=', '=', '='], u: ['.', '.', '.'] });
    previewWorld = { rows: rows, endless: true, finishZ: 0 };
    preview = RR.createState({ vz: 18, lane: 1, targetLane: 1 });
  }

  function begin(id, opt) {
    opt = opt || {};
    var tr = id === 'endless' ? null : trackById(id);
    if (id !== 'endless' && !tr) return;
    modeId = id;
    fuelBonusGiven = false;
    popups = [];
    steerQueue = [];
    pointers = Object.create(null);
    rightDown = false;
    keys.thrust = false;
    shadow = null;
    lastEdge = false;
    acc = 0;
    if (id === 'endless') world = Track.makeEndless(opt.seed != null ? { seed: opt.seed } : {});
    else world = Track.assemble(tr.chunks);
    state = RR.createState({
      vz: Track.kmhAt(0, id === 'endless') / 3.6,
      lane: 1,
      targetLane: 1
    });
    hide(menu);
    hide(end);
    show(hud);
    hintReturn = 'run';
    if (!save.hintSeen && !opt.skipHint) {
      screen = 'hint';
      hintGo.textContent = 'Drive';
      show(hint);
    } else {
      screen = 'play';
      hide(hint);
    }
    resize();
    paint();
    updateHud();
  }

  function openHintInfo() {
    hintReturn = 'menu';
    hintGo.textContent = 'Got it';
    show(hint);
  }

  function closeHint() {
    if (!save.hintSeen) {
      save.hintSeen = true;
      writeSave();
    }
    hide(hint);
    Audio.ensure();
    if (hintReturn === 'run') screen = 'play';
  }

  function showMenu() {
    screen = 'menu';
    state = null;
    world = null;
    steerQueue = [];
    pointers = Object.create(null);
    hide(hud);
    hide(hint);
    hide(end);
    show(menu);
    renderMenu();
    if (!preview) makePreview();
  }

  function thrustHeld() {
    if (scriptThrust || keys.thrust || rightDown) return true;
    if (performance.now() < wheelUntil) return true;
    var id;
    for (id in pointers) if (pointers[id].zone === 'thrust') return true;
    return !!(state && state.burst > 0);
  }

  function noteSteer(res) {
    if (!res) return;
    if (res.type === 'roll') {
      popup('BARREL ROLL');
      Audio.blip(520, 0.18, 'square', 0.05);
    } else if (res.type === 'lane') {
      Audio.blip(220, 0.05, 'square', 0.03);
    } else if (res.type === 'rumble') {
      Audio.blip(90, 0.06, 'sawtooth', 0.03);
    }
  }

  function popup(text) {
    popups.push({ text: text, life: 1 });
    if (popups.length > 4) popups.shift();
  }

  function onEvents(events) {
    var i, ev;
    for (i = 0; i < events.length; i++) {
      ev = events[i];
      if (ev.type === 'can') {
        popup('+1s FUEL');
        Audio.blip(660, 0.08, 'square', 0.05);
      } else if (ev.type === 'near') {
        popup('CLOSE +' + ev.pts);
      } else if (ev.type === 'roll') {
        popup((ev.dodged ? 'SLIPPED ' : 'ROLL ') + '+' + ev.pts);
      } else if (ev.type === 'deck') {
        popup('UPPER DECK');
        Audio.blip(740, 0.1, 'square', 0.04);
      } else if (ev.type === 'wobble') {
        popup('WOBBLE');
      } else if (ev.type === 'crash') {
        Audio.blip(70, 0.28, 'sawtooth', 0.07);
        finishScreen(false);
      } else if (ev.type === 'finish') {
        Audio.blip(880, 0.16, 'square', 0.06);
        finishScreen(true);
      }
    }
  }

  function starCount() {
    if (state.fuel >= 4) return 3;
    if (state.fuel >= 2) return 2;
    return 1;
  }

  function rememberScore(cleared) {
    var fresh = false;
    if (modeId === 'endless') {
      var prevE = save.best.endless || 0;
      if (state.score > prevE) {
        save.best.endless = Math.round(state.score);
        fresh = true;
      }
    } else {
      var prev = save.best[modeId] || { score: 0, stars: 0 };
      var next = { score: prev.score || 0, stars: prev.stars || 0 };
      if (state.score > next.score) {
        next.score = Math.round(state.score);
        fresh = true;
      }
      if (cleared) {
        var stars = starCount();
        if (stars > next.stars) {
          next.stars = stars;
          fresh = true;
        }
      }
      save.best[modeId] = next;
    }
    writeSave();
    return fresh;
  }

  function finishScreen(cleared) {
    if (screen !== 'play' && screen !== 'hint') return;
    if (cleared && !fuelBonusGiven) {
      fuelBonusGiven = true;
      var bonus = Math.round(state.fuel * 1000);
      state.score += bonus;
      popup('FUEL +' + bonus);
    }
    var fresh = rememberScore(cleared);
    screen = cleared ? 'clear' : 'crash';
    if (cleared) {
      var stars = starCount();
      endKicker.textContent = modeId === 'endless' ? 'Endless' : (trackById(modeId).name);
      endTitle.textContent = 'Brought it home';
      endStars.hidden = false;
      endStars.textContent = '★★★'.slice(0, stars);
      endStars.setAttribute('aria-label', stars + (stars === 1 ? ' star' : ' stars'));
      endDetail.textContent = Math.round(state.z) + ' m · fuel bonus ' + Math.round(state.fuel * 1000) +
        (fresh ? ' · new best' : '');
    } else {
      endKicker.textContent = 'Run over';
      endTitle.textContent = state.crash === 'block' ? 'That one was solid' : 'The road ended';
      endStars.hidden = true;
      endStars.textContent = '';
      endDetail.textContent = Math.round(state.z) + ' m · ' + Math.round(state.score) + ' pts' +
        (fresh ? ' · new best' : '');
    }
    endScore.textContent = Math.round(state.score);
    show(end);
    paint();
    updateHud();
  }

  function advance(dt, uncapped) {
    if (screen !== 'play' || !state || !world) return;
    if (dt > 0.05) dt = 0.05;
    acc += dt;
    var n = 0;
    var limit = uncapped ? 100000 : 8;
    var thrusting;
    while (acc >= RR.STEP && n < limit && state.alive && !state.finished) {
      if (steerQueue.length) noteSteer(RR.applySteer(state, steerQueue.shift(), thrustHeld()));
      state.vz = Track.kmhAt(state.t, world.endless) / 3.6 * (state.slowT > 0 ? 0.82 : 1);
      thrusting = thrustHeld();
      onEvents(RR.step(state, world, { thrust: thrusting }, RR.STEP));
      acc -= RR.STEP;
      n++;
      if (screen !== 'play') break;
    }
    if (world && world.endless && state && state.alive) {
      Track.grow(world, state.z + Track.lookaheadM(state.vz), state.t);
    }
  }

  function tickPreview(dt) {
    if (!preview || !previewWorld) return;
    previewAcc += dt;
    var n = 0;
    while (previewAcc >= RR.STEP && n < 8) {
      preview.vz = 18;
      RR.step(preview, previewWorld, { thrust: false }, RR.STEP);
      previewAcc -= RR.STEP;
      n++;
      if (preview.z > previewWorld.rows.length * RR.ROW - 24) {
        preview.z = 0.2;
        preview.y = 0;
        preview.airborne = false;
        preview.vy = 0;
      }
    }
  }

  function tickPopups(dt) {
    var i;
    for (i = 0; i < popups.length; i++) popups[i].life -= dt * 0.65;
    popups = popups.filter(function (p) { return p.life > 0; });
  }

  function appRect() {
    return app.getBoundingClientRect();
  }

  function localPoint(clientX, clientY) {
    var r = appRect();
    return { x: clientX - r.left, y: clientY - r.top, w: r.width, h: r.height };
  }

  function zoneAt(p) {
    if (p.y > p.h * 0.6) return p.x < p.w * 0.5 ? 'left' : 'right';
    return 'thrust';
  }

  function enqueue(dir) {
    if (dir) steerQueue.push(dir < 0 ? -1 : 1);
  }

  function slideSteer(rec, x) {
    var dx = x - rec.startX;
    if (Math.abs(dx) < SLIDE_PX) return;
    var stepPx = Math.max(24, rec.w * 0.18);
    var steps = Math.trunc(dx / stepPx);
    var sign = steps < 0 ? -1 : steps > 0 ? 1 : 0;
    var credit = sign === rec.dir ? rec.dir : 0;
    var desired = rec.dir + (steps - credit);
    while (rec.applied < desired) { enqueue(1); rec.applied += 1; }
    while (rec.applied > desired) { enqueue(-1); rec.applied -= 1; }
  }

  function onPointerDown(e) {
    if (screen !== 'play') return;
    if (e.target && e.target.closest && e.target.closest('button, a')) return;
    var p = localPoint(e.clientX, e.clientY);
    var zone = zoneAt(p);
    if (e.button === 2 || zone === 'thrust') {
      pointers[e.pointerId] = { zone: 'thrust', startX: p.x, w: p.w };
      if (e.button !== 2 && performance.now() - lastThrustDown <= DOUBLE_MS && state) {
        state.burst = Math.max(state.burst, RR.BURST);
        popup('BURST');
      }
      if (e.button !== 2) lastThrustDown = performance.now();
      Audio.ensure();
    } else {
      var dir = zone === 'left' ? -1 : 1;
      enqueue(dir);
      pointers[e.pointerId] = { zone: 'steer', startX: p.x, w: p.w, dir: dir, applied: dir };
      Audio.ensure();
    }
    if (app.setPointerCapture) {
      try { app.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
    }
  }

  function onPointerMove(e) {
    var rec = pointers[e.pointerId];
    if (!rec || rec.zone !== 'steer' || screen !== 'play') return;
    var p = localPoint(e.clientX, e.clientY);
    rec.w = p.w;
    slideSteer(rec, p.x);
  }

  function onPointerUp(e) {
    delete pointers[e.pointerId];
  }

  function resize() {
    var r = appRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function activeDrawState() {
    if (state && world && screen !== 'menu') return { state: state, world: world };
    return { state: preview, world: previewWorld };
  }

  function paint() {
    var pair = activeDrawState();
    var thrusting = screen === 'play' && thrustHeld();
    if (pair.state && pair.state.airborne && screen === 'play') {
      if (!shadow || shadow.at == null || pair.state.t - shadow.at > 0.08) {
        shadow = RR.predictLanding(pair.state, pair.world, thrusting);
        shadow.at = pair.state.t;
      }
    } else shadow = null;
    Draw.draw(ctx, canvas.width, canvas.height, pair.state, pair.world, {
      thrust: thrusting,
      predict: shadow,
      showZones: screen === 'hint',
      popups: screen === 'play' || screen === 'crash' || screen === 'clear' ? popups : [],
      reduce: reduce
    });
    var edge = thrusting && state && state.heat < 0.04;
    if (edge && !lastEdge && screen === 'play') Audio.blip(180, 0.04, 'sawtooth', 0.02);
    lastEdge = !!edge;
  }

  function updateHud() {
    if (!state || screen === 'menu') return;
    scoreEl.textContent = Math.round(state.score);
    comboEl.textContent = state.combo > 1 ? '×' + state.combo : '';
    speedEl.textContent = Math.round(state.vz * 3.6) + ' km/h';
    fuelBar.style.width = Math.max(0, Math.min(100, state.fuel / RR.TANK * 100)) + '%';
    heatBar.style.width = Math.max(0, Math.min(100, state.heat * 100)) + '%';
    heatBar.style.background = Draw.heatCss(state.heat, 1);
    if (state.heatLock > 0) heatBar.style.background = '#e74c3c';
  }

  function loop(ts) {
    frames++;
    var dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (screen === 'play') advance(dt, false);
    else if (screen === 'menu') tickPreview(dt);
    tickPopups(dt);
    if (screen === 'play' && state) {
      Audio.update(Math.min(1, state.vz / 42), thrustHeld() ? Math.min(1, 0.4 + state.heat) : 0);
    } else Audio.update(0, 0);
    paint();
    updateHud();
    requestAnimationFrame(loop);
  }

  function aheadRows(n) {
    var out = [];
    if (!state || !world) return out;
    var row = Math.floor(state.z / RR.ROW);
    var i, lane, g, u;
    for (i = 0; i < n; i++) {
      g = [];
      u = [];
      for (lane = 0; lane < 3; lane++) {
        g.push(RR.cellAt(world, (row + i) * RR.ROW + 0.2, lane, 0, state.t));
        u.push(RR.cellAt(world, (row + i) * RR.ROW + 0.2, lane, 1, state.t));
      }
      out.push({ g: g, u: u });
    }
    return out;
  }

  function snapshot() {
    return {
      screen: screen,
      mode: modeId,
      frames: frames,
      hint: !hint.classList.contains('hidden'),
      end: !end.classList.contains('hidden'),
      alive: state ? state.alive : false,
      finished: state ? state.finished : false,
      crash: state ? state.crash : '',
      z: state ? state.z : 0,
      x: state ? state.x : 0,
      y: state ? state.y : 0,
      deck: state ? state.deck : 0,
      lane: state ? state.lane : 1,
      targetLane: state ? state.targetLane : 1,
      airborne: state ? state.airborne : false,
      fuel: state ? state.fuel : 0,
      heat: state ? state.heat : 0,
      heatLock: state ? state.heatLock : 0,
      burst: state ? state.burst : 0,
      score: state ? state.score : 0,
      combo: state ? state.combo : 1,
      rollCount: state ? state.rollCount : 0,
      rollT: state ? state.rollT : 0,
      maxDeck: state ? state.maxDeck : 0,
      vz: state ? state.vz : 0,
      t: state ? state.t : 0,
      rows: world ? world.rows.length : 0,
      finishZ: world ? world.finishZ || 0 : 0,
      ahead: aheadRows(12),
      queue: steerQueue.length,
      best: save.best
    };
  }

  document.getElementById('quit').addEventListener('click', showMenu);
  document.getElementById('restart').addEventListener('click', function () {
    Audio.ensure();
    begin(modeId, { skipHint: true });
  });
  document.getElementById('end-menu').addEventListener('click', showMenu);
  document.getElementById('end-retry').addEventListener('click', function () {
    begin(modeId, { skipHint: true });
  });
  muteBtn.addEventListener('click', toggleMute);
  menuMute.addEventListener('click', toggleMute);
  document.getElementById('how').addEventListener('click', openHintInfo);
  hintGo.addEventListener('click', closeHint);

  app.addEventListener('pointerdown', onPointerDown);
  app.addEventListener('pointermove', onPointerMove);
  app.addEventListener('pointerup', onPointerUp);
  app.addEventListener('pointercancel', onPointerUp);
  app.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  app.addEventListener('wheel', function (e) {
    if (screen !== 'play') return;
    e.preventDefault();
    wheelUntil = performance.now() + 350;
    Audio.ensure();
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyM') { toggleMute(); return; }
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (screen !== 'play') return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.thrust = true;
    if (e.repeat) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') enqueue(-1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') enqueue(1);
    if (e.code === 'KeyR') begin(modeId, { skipHint: true });
    if (e.code === 'Escape') showMenu();
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.thrust = false;
  });
  window.addEventListener('blur', function () {
    keys.thrust = false;
    rightDown = false;
    pointers = Object.create(null);
  });
  window.addEventListener('resize', resize);
  document.addEventListener('pointerdown', function (e) {
    if (e.button === 2 && screen === 'play') rightDown = true;
  });
  document.addEventListener('pointerup', function (e) {
    if (e.button === 2) rightDown = false;
  });

  window.simTest = {
    selfTest: function () { return RR.selfTest(); },
    audit: function (opt) { return Track.audit(opt || {}); },
    start: function (id, opt) {
      begin(id || 'endless', Object.assign({ skipHint: true }, opt || {}));
      return snapshot();
    },
    dismissHint: function () { closeHint(); return snapshot(); },
    setThrust: function (on) { scriptThrust = !!on; },
    steer: function (dir) { enqueue(dir < 0 ? -1 : 1); },
    step: function (sec) {
      var left = sec;
      var slice;
      while (left > 1e-6) {
        slice = Math.min(0.05, left);
        advance(slice, true);
        tickPopups(slice);
        left -= slice;
      }
      paint();
      updateHud();
      return snapshot();
    },
    snapshot: snapshot,
    lookahead: function () { return state ? Track.lookaheadM(state.vz) : Track.lookaheadM(0); },
    zones: function () {
      var r = appRect();
      return {
        left: r.left, top: r.top, width: r.width, height: r.height,
        steerY: r.top + r.height * 0.78,
        leftX: r.left + r.width * 0.22,
        rightX: r.left + r.width * 0.78,
        thrustX: r.left + r.width * 0.5,
        thrustY: r.top + r.height * 0.28,
        splitY: r.top + r.height * 0.6
      };
    }
  };

  renderMenu();
  makePreview();
  resize();
  syncMute();
  var params = new URLSearchParams(location.search);
  var play = params.get('play');
  if (play && (play === 'endless' || trackById(play))) begin(play, { skipHint: params.get('hint') === '0' });
  requestAnimationFrame(loop);
})();

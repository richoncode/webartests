/* Perfect Fit — input, tools, and the phone layout. */
(function () {
  'use strict';

  var SAVE_KEY = 'perfect-fit-v2';
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var menu = document.getElementById('menu');
  var dock = document.getElementById('dock');
  var playUi = document.getElementById('play-ui');
  var resultUi = document.getElementById('result-ui');
  var stepsEl = document.getElementById('steps');
  var geometryEl = document.getElementById('geometry');
  var coachEl = document.getElementById('coach');
  var els = {
    back: document.getElementById('btn-back'),
    sound: document.getElementById('btn-sound'),
    kicker: document.getElementById('kicker'),
    title: document.getElementById('title'),
    instruction: document.getElementById('instruction'),
    seat: document.getElementById('seat-flag'),
    restart: document.getElementById('btn-restart'),
    hint: document.getElementById('btn-hint'),
    action: document.getElementById('btn-action'),
    stars: document.getElementById('stars'),
    resultTitle: document.getElementById('result-title'),
    resultStats: document.getElementById('result-stats'),
    replayNote: document.getElementById('replay-note'),
    newBest: document.getElementById('new-best'),
    replay: document.getElementById('btn-replay'),
    retry: document.getElementById('btn-retry'),
    next: document.getElementById('btn-next'),
    coachText: document.getElementById('coach-text'),
    coachSkip: document.getElementById('coach-skip'),
    coachNext: document.getElementById('coach-next')
  };

  var save = loadSave();
  var state = {
    screen: 'menu',
    index: 0,
    run: null,
    coach: -1,
    replayTimer: null,
    stepSig: ''
  };
  var audioCtx = null;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { reduceMotion = false; }

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { sound: true, coach: false, best: {} };
      var parsed = JSON.parse(raw);
      parsed.best = parsed.best || {};
      if (typeof parsed.sound !== 'boolean') parsed.sound = true;
      return parsed;
    } catch (err) {
      return { sound: true, coach: false, best: {} };
    }
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) { /* private mode */ }
  }

  function level() { return PF.levels[state.index]; }

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur, type, peak) {
    if (!save.sound) return;
    var ac = ensureAudio();
    if (!ac) return;
    var t0 = ac.currentTime;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.08, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function playSeat() { tone(520, 0.07, 'triangle', 0.05); }
  function playTick() { tone(740, 0.05, 'square', 0.03); }
  function playCut() { tone(180, 0.18, 'sawtooth', 0.04); tone(90, 0.22, 'sine', 0.05); }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height };
  }

  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function mul(a, s) { return { x: a.x * s, y: a.y * s }; }
  function norm(a) {
    var L = Math.hypot(a.x, a.y) || 1;
    return { x: a.x / L, y: a.y / L };
  }

  function path(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }

  function fillStroke(item) {
    if (item.fill) {
      ctx.fillStyle = item.fill;
      ctx.fill();
    }
    if (item.stroke && item.sw) {
      ctx.strokeStyle = item.stroke;
      ctx.lineWidth = item.sw;
      ctx.setLineDash(item.dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function barPoly(origin, dir, length, thick) {
    var n = { x: -dir.y, y: dir.x };
    var a = origin;
    var b = add(origin, mul(dir, length));
    var h = thick / 2;
    return [
      add(a, mul(n, h)),
      add(b, mul(n, h)),
      add(b, mul(n, -h)),
      add(a, mul(n, -h))
    ];
  }

  function drawSquare(it) {
    var ang = it.ang;
    var dir = { x: Math.cos(ang), y: Math.sin(ang) };
    var stockDir = { x: Math.cos(ang - Math.PI / 2), y: Math.sin(ang - Math.PI / 2) };
    var origin = { x: it.x, y: it.y };
    var leg = it.leg || 36;
    var stock = it.stock || 30;
    ctx.fillStyle = it.hot ? '#4e5c6e' : '#3a4654';
    ctx.strokeStyle = it.hot ? '#e0a050' : '#1b2128';
    ctx.lineWidth = 0.6;
    path(barPoly(origin, stockDir, stock, 5.2));
    ctx.fill();
    ctx.stroke();
    path(barPoly(origin, dir, leg, 1.7));
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = it.hot ? '#e0a050' : '#d7dde4';
    ctx.fill();
  }

  function drawCompass(it) {
    var p = it.point;
    var pencil = {
      x: p.x + Math.cos(it.tilt) * it.span,
      y: p.y + Math.sin(it.tilt) * it.span
    };
    var mid = { x: (p.x + pencil.x) / 2, y: (p.y + pencil.y) / 2 };
    var d = norm({ x: pencil.x - p.x, y: pencil.y - p.y });
    var n = { x: -d.y, y: d.x };
    var hinge = { x: mid.x + n.x * 11, y: mid.y + n.y * 11 };
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2e3844';
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(hinge.x, hinge.y);
    ctx.lineTo(p.x, p.y);
    ctx.moveTo(hinge.x, hinge.y);
    ctx.lineTo(pencil.x, pencil.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hinge.x, hinge.y, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = '#c4923a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2);
    ctx.fillStyle = it.hotP ? '#e0a050' : '#1b2128';
    ctx.fill();
    ctx.strokeStyle = it.hotN ? '#e0a050' : '#241c14';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pencil.x - d.x * 3.2, pencil.y - d.y * 3.2);
    ctx.lineTo(pencil.x, pencil.y);
    ctx.stroke();
    if (it.span > 6) {
      ctx.strokeStyle = 'rgba(91,155,213,0.85)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([1.4, 1.2]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, it.span, it.tilt - 0.55, it.tilt + 0.55);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawStick(it) {
    var dir = { x: Math.cos(it.ang), y: Math.sin(it.ang) };
    var n = { x: -dir.y, y: dir.x };
    var tail = add(it.point, mul(dir, it.len));
    ctx.strokeStyle = it.hot ? '#e0a050' : '#6b4226';
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(it.point.x, it.point.y);
    ctx.lineTo(tail.x, tail.y);
    ctx.stroke();
    ctx.fillStyle = it.hot ? '#e0a050' : '#241c14';
    ctx.beginPath();
    ctx.arc(it.point.x, it.point.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241c14';
    ctx.lineWidth = 1.1;
    (it.ticks || []).forEach(function (dist) {
      if (dist < 2 || dist > it.len - 1) return;
      var at = add(it.point, mul(dir, dist));
      ctx.beginPath();
      ctx.moveTo(at.x + n.x * 3.2, at.y + n.y * 3.2);
      ctx.lineTo(at.x - n.x * 3.2, at.y - n.y * 3.2);
      ctx.stroke();
    });
  }

  function drawOffcut(it) {
    var d = { x: Math.cos(it.ang), y: Math.sin(it.ang) };
    var poly = barPoly({ x: it.x, y: it.y }, d, it.len, it.w);
    var back = mul(d, -it.len / 2);
    var shifted = poly.map(function (p) { return add(p, back); });
    ctx.fillStyle = '#d7b072';
    ctx.strokeStyle = it.hot ? '#e0a050' : '#6b4226';
    ctx.lineWidth = it.hot ? 1.3 : 0.8;
    path(shifted);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawBevel(it) {
    var origin = it.origin;
    var stockDir = { x: Math.cos(it.stockAng), y: Math.sin(it.stockAng) };
    var bladeDir = { x: Math.cos(it.bladeAng), y: Math.sin(it.bladeAng) };
    ctx.fillStyle = '#6b4226';
    path(barPoly(add(origin, mul(stockDir, -16)), stockDir, 32, 6));
    ctx.fill();
    ctx.strokeStyle = it.hot ? '#e0a050' : '#2e3844';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + bladeDir.x * 32, origin.y + bladeDir.y * 32);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = '#c4923a';
    ctx.fill();
  }

  function drawSaw(it) {
    var origin = it.origin;
    var dir = { x: Math.cos(it.ang), y: Math.sin(it.ang) };
    ctx.strokeStyle = '#8a8175';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x - 16, origin.y);
    ctx.lineTo(origin.x + 18, origin.y);
    ctx.stroke();
    ctx.strokeStyle = it.hot ? '#e0a050' : '#2e3844';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + dir.x * 28, origin.y + dir.y * 28);
    ctx.stroke();
  }

  function drawBubble(it) {
    var w = 18;
    var h = 7;
    ctx.save();
    ctx.translate(it.c.x, it.c.y);
    ctx.fillStyle = 'rgba(20,16,12,0.35)';
    roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = '#3a4654';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    var bx = (it.offset || 0) * (w / 2 - 2.4);
    ctx.beginPath();
    ctx.arc(bx, 0, 2.1, 0, Math.PI * 2);
    ctx.fillStyle = Math.abs(it.offset) < 0.18 ? '#7dcea0' : '#e7d2b4';
    ctx.fill();
    ctx.restore();
  }

  function drawBevelChip(it) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.fillStyle = '#f7f1e6';
    ctx.strokeStyle = '#cfc6ba';
    ctx.lineWidth = 0.7;
    roundRect(-12, -8, 58, 52, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e4c48a';
    ctx.strokeStyle = '#8a6434';
    ctx.lineWidth = 0.7;
    roundRect(0, 0, 22, 32, 1);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#2e3844';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(Math.sin(it.ang) * 30, Math.cos(it.ang) * 30);
    ctx.stroke();
    ctx.fillStyle = '#5c564f';
    ctx.font = '3.2px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('section', -8, -3);
    ctx.textAlign = 'center';
    ctx.fillText('face', -6, 16);
    ctx.fillText('back', 30, 16);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawItem(item) {
    if (!item) return;
    if (item.op === 'rect') {
      ctx.beginPath();
      ctx.rect(item.x, item.y, item.w, item.h);
      fillStroke(item);
      return;
    }
    if (item.op === 'poly' && item.pts && item.pts.length > 2) {
      path(item.pts);
      ctx.closePath();
      fillStroke(item);
      return;
    }
    if (item.op === 'polyline' && item.pts && item.pts.length > 1) {
      path(item.pts);
      ctx.strokeStyle = item.stroke || '#241c14';
      ctx.lineWidth = item.sw || 1;
      ctx.setLineDash(item.dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    if (item.op === 'line') {
      ctx.beginPath();
      ctx.moveTo(item.a.x, item.a.y);
      ctx.lineTo(item.b.x, item.b.y);
      ctx.strokeStyle = item.stroke || '#241c14';
      ctx.lineWidth = item.sw || 1;
      ctx.setLineDash(item.dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    if (item.op === 'circle') {
      ctx.beginPath();
      ctx.arc(item.c.x, item.c.y, item.r, 0, Math.PI * 2);
      fillStroke(item);
      return;
    }
    if (item.op === 'arc') {
      ctx.beginPath();
      ctx.arc(item.c.x, item.c.y, item.r, item.a0, item.a1);
      ctx.strokeStyle = item.stroke || '#5b9bd5';
      ctx.lineWidth = item.sw || 1;
      ctx.setLineDash(item.dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    if (item.op === 'text') {
      ctx.fillStyle = item.color || '#5c564f';
      ctx.font = ((item.size || 9) * 0.52) + 'px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
      ctx.textAlign = item.align || 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.t, item.x, item.y);
      return;
    }
    if (item.op === 'square') drawSquare(item);
    else if (item.op === 'compass') drawCompass(item);
    else if (item.op === 'stick') drawStick(item);
    else if (item.op === 'offcut') drawOffcut(item);
    else if (item.op === 'bevel') drawBevel(item);
    else if (item.op === 'saw') drawSaw(item);
    else if (item.op === 'bubble') drawBubble(item);
    else if (item.op === 'bevelchip') drawBevelChip(item);
  }

  function paintScene(context, items, cssW, cssH) {
    var lay = PF.layout(cssW, cssH);
    var previous = ctx;
    ctx = context;
    ctx.save();
    ctx.translate(lay.ox, lay.oy);
    ctx.scale(lay.s, lay.s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = '#2a2118';
    ctx.fillRect(-20, -20, PF.VIEW.w + 40, PF.VIEW.h + 40);
    for (var i = 0; i < items.length; i++) drawItem(items[i]);
    ctx.restore();
    ctx = previous;
  }

  function paint() {
    var size = resize();
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.fillStyle = '#140e0a';
    ctx.fillRect(0, 0, size.w, size.h);
    if (state.screen !== 'play' || !state.run) return;
    var scene = PF.scene(level(), state.run);
    paintScene(ctx, scene.items, size.w, size.h);
  }

  function worldFromEvent(ev) {
    var rect = canvas.getBoundingClientRect();
    var lay = PF.layout(rect.width, rect.height);
    return {
      x: (ev.clientX - rect.left - lay.ox) / lay.s,
      y: (ev.clientY - rect.top - lay.oy) / lay.s
    };
  }

  function stopReplay() {
    if (state.replayTimer) {
      clearInterval(state.replayTimer);
      state.replayTimer = null;
    }
  }

  function showMenu() {
    stopReplay();
    state.screen = 'menu';
    state.run = null;
    menu.classList.remove('hidden');
    dock.classList.add('hidden');
    stepsEl.classList.add('hidden');
    geometryEl.classList.add('hidden');
    coachEl.classList.add('hidden');
    els.kicker.textContent = 'Workshop';
    els.title.textContent = 'Perfect Fit';
    document.title = 'Perfect Fit';
    els.back.setAttribute('href', '../');
    renderMenu();
  }

  function renderMenu() {
    var html = '<h2>Perfect Fit</h2><p class="lede">Mark the work the way a shop does. Each level is a run of tool steps — seat, set, lock, mark, cut. Nothing snaps to the answer.</p>';
    PF.levels.forEach(function (lv, i) {
      var best = save.best[lv.id];
      var stars = best ? '★★★'.slice(0, best.stars) + '☆☆☆'.slice(best.stars) : '☆☆☆';
      var gap = best ? best.gap.toFixed(1) + ' mm' : 'not cut';
      html += '<button type="button" class="level" data-level="' + i + '">' +
        '<canvas width="78" height="102" data-thumb="' + i + '"></canvas>' +
        '<div><h3>' + lv.name + (lv.hard ? '<span class="hard-tag">Hard</span>' : '') + '</h3>' +
        '<p>' + lv.blurb + '</p>' +
        '<div class="meta">' + stars + '<span>' + gap + '</span></div></div></button>';
    });
    menu.innerHTML = html;
    var thumbs = menu.querySelectorAll('canvas');
    thumbs.forEach(function (thumb) {
      var i = Number(thumb.getAttribute('data-thumb'));
      var run = PF.createRun(PF.levels[i]);
      var scene = PF.scene(PF.levels[i], run);
      var tctx = thumb.getContext('2d');
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      paintScene(tctx, scene.items, thumb.width, thumb.height);
    });
  }

  function openLevel(index) {
    stopReplay();
    state.index = index;
    state.run = PF.createRun(PF.levels[index]);
    state.screen = 'play';
    state.stepSig = '';
    menu.classList.add('hidden');
    dock.classList.remove('hidden');
    stepsEl.classList.remove('hidden');
    geometryEl.classList.remove('hidden');
    var lv = PF.levels[index];
    state.celebrate = '';
    state.coach = lv.tutorial && !save.coach ? 0 : -1;
    syncCoach();
    sync();
  }

  function syncCoach() {
    var lv = level();
    if (state.coach < 0 || !lv.tutorial) {
      coachEl.classList.add('hidden');
      return;
    }
    coachEl.classList.remove('hidden');
    els.coachText.textContent = lv.tutorial[state.coach];
    els.coachNext.textContent = state.coach === lv.tutorial.length - 1 ? 'Start' : 'Next';
  }

  function finishCoach() {
    state.coach = -1;
    save.coach = true;
    writeSave();
    syncCoach();
  }

  function syncSteps(hud) {
    var sig = hud.steps.map(function (s) { return s.state; }).join('') + ':' + (state.run && state.run.replay);
    if (sig === state.stepSig) return;
    state.stepSig = sig;
    stepsEl.innerHTML = '';
    hud.steps.forEach(function (s, i) {
      var li = document.createElement('li');
      li.textContent = s.label;
      li.className = s.state + (state.run && state.run.replay === i ? ' replay' : '');
      if (state.run && state.run.replay != null && state.run.log[state.run.replay] && state.run.log[state.run.replay].step === i) {
        li.className += ' replay';
      }
      stepsEl.appendChild(li);
    });
  }

  function sync() {
    if (state.screen !== 'play' || !state.run) return;
    var lv = level();
    var run = state.run;
    var hud = PF.hud(lv, run);
    els.kicker.textContent = hud.kicker;
    els.title.textContent = hud.title;
    document.title = hud.title + ' — Perfect Fit';
    geometryEl.textContent = hud.geometry;
    syncSteps(hud);
    var result = run.phase === 'result';
    playUi.classList.toggle('hidden', result);
    resultUi.classList.toggle('hidden', !result);
    if (!result) {
      els.instruction.textContent = hud.instruction;
      els.seat.textContent = hud.seat || '';
      if (hud.action) {
        els.action.classList.remove('hidden');
        els.action.textContent = hud.action.label;
        els.action.disabled = !hud.action.enabled;
        els.action.classList.toggle('ready', !!hud.action.enabled);
      } else {
        els.action.classList.add('hidden');
      }
    } else {
      var res = run.result;
      els.resultTitle.textContent = res.title;
      var tries = run.tries === 1 ? '1 try' : run.tries + ' tries';
      els.resultStats.textContent = res.gap.toFixed(1) + ' mm gap · score ' + res.score.toFixed(1) + ' · ' + run.hints + ' hints · ' + tries;
      var note = res.replay;
      if (run.replay != null && run.log[run.replay]) {
        var entry = run.log[run.replay];
        note = entry.label + (entry.note ? ' — ' + entry.note : entry.deviation >= 0.35 ? ' — this step opened the gap.' : ' — held.');
      }
      els.replayNote.textContent = note;
      var starNodes = els.stars.querySelectorAll('.star');
      starNodes.forEach(function (node, i) { node.classList.toggle('on', i < res.stars); });
      els.newBest.textContent = state.celebrate || '';
    }
    paint();
  }

  function afterMove(prevSeat) {
    if (!state.run) return;
    if (state.run.phase === 'result') {
      onResult();
      return;
    }
    var hud = PF.hud(level(), state.run);
    if (hud.seat && hud.seat !== prevSeat) playSeat();
    sync();
  }

  function onResult() {
    playCut();
    var lv = level();
    var res = state.run.result;
    var best = save.best[lv.id];
    var better = !best || res.score < best.score - 0.05 || (Math.abs(res.score - best.score) <= 0.05 && res.stars > best.stars);
    state.celebrate = '';
    if (better) {
      save.best[lv.id] = { gap: res.gap, score: res.score, stars: res.stars };
      writeSave();
      state.celebrate = best ? 'New best' : 'Saved';
    }
    sync();
  }

  function onPointer(ev) {
    if (state.screen !== 'play' || !state.run || state.run.phase !== 'play') return;
    if (ev.cancelable && ev.type === 'pointerdown') ev.preventDefault();
    var prev = els.seat.textContent;
    var w = worldFromEvent(ev);
    var type = ev.type === 'pointerdown' ? 'down' : (ev.type === 'pointerup' || ev.type === 'pointercancel' ? 'up' : 'move');
    if (type === 'down') {
      try { canvas.setPointerCapture(ev.pointerId); } catch (err) { /* already gone */ }
    }
    PF.pointer(level(), state.run, { type: type, x: w.x, y: w.y });
    afterMove(prev);
  }

  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('pointermove', onPointer);
  canvas.addEventListener('pointerup', onPointer);
  canvas.addEventListener('pointercancel', onPointer);

  els.restart.addEventListener('click', function () {
    if (state.screen !== 'play' || !state.run || state.run.phase !== 'play') return;
    stopReplay();
    state.run = PF.restart(level(), state.run);
    state.stepSig = '';
    playTick();
    sync();
  });

  els.hint.addEventListener('click', function () {
    if (state.screen !== 'play' || !state.run || state.run.phase !== 'play') return;
    var prev = els.seat.textContent;
    PF.hint(level(), state.run);
    playTick();
    afterMove(prev);
  });

  els.action.addEventListener('click', function () {
    if (state.screen !== 'play' || !state.run || state.run.phase !== 'play') return;
    if (els.action.disabled) return;
    var prev = els.seat.textContent;
    PF.action(level(), state.run);
    afterMove(prev);
  });

  els.retry.addEventListener('click', function () {
    openLevel(state.index);
  });

  els.next.addEventListener('click', function () {
    if (state.index + 1 >= PF.levels.length) showMenu();
    else openLevel(state.index + 1);
  });

  els.replay.addEventListener('click', function () {
    if (!state.run || !state.run.log.length) return;
    stopReplay();
    var i = 0;
    state.run.replay = 0;
    state.stepSig = '';
    sync();
    var delay = reduceMotion ? 200 : 850;
    state.replayTimer = setInterval(function () {
      i += 1;
      if (!state.run || i >= state.run.log.length) {
        if (state.run) state.run.replay = null;
        stopReplay();
        state.stepSig = '';
        sync();
        return;
      }
      state.run.replay = i;
      state.stepSig = '';
      sync();
    }, delay);
  });

  els.back.addEventListener('click', function (ev) {
    if (state.screen === 'play') {
      ev.preventDefault();
      showMenu();
    }
  });

  els.sound.addEventListener('click', function () {
    save.sound = !save.sound;
    els.sound.setAttribute('aria-pressed', save.sound ? 'true' : 'false');
    els.sound.setAttribute('aria-label', save.sound ? 'Mute sound' : 'Unmute sound');
    els.sound.style.opacity = save.sound ? '1' : '0.4';
    writeSave();
    if (save.sound) playTick();
  });

  els.coachSkip.addEventListener('click', finishCoach);
  els.coachNext.addEventListener('click', function () {
    var lv = level();
    if (!lv.tutorial || state.coach >= lv.tutorial.length - 1) finishCoach();
    else {
      state.coach += 1;
      syncCoach();
    }
  });

  menu.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('.level') : null;
    if (!btn) return;
    openLevel(Number(btn.getAttribute('data-level')));
  });

  window.addEventListener('resize', paint);
  if (!save.sound) {
    els.sound.style.opacity = '0.4';
    els.sound.setAttribute('aria-pressed', 'false');
    els.sound.setAttribute('aria-label', 'Unmute sound');
  }
  showMenu();
  requestAnimationFrame(paint);
})();

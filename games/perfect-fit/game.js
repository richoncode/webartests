/* Perfect Fit — input, rendering, and feel. */
(function () {
  'use strict';

  const PF = window.PF;
  const WORLD_W = 100;
  const WORLD_H = 132;
  const SAW_MS = 880;
  const SLIDE_AT = 780;
  const SLIDE_DUR = 920;
  const RESULT_AT = 1720;
  const SAVE_KEY = 'perfect-fit-v1';
  const SHAVING = ['#f3e2c0', '#e2c088', '#c4924e', '#a87440', '#f7efe0'];

  const TONES = {
    oak: { light: '#e8c892', base: '#c48945', dark: '#7a4e24', grain: 'rgba(80,42,16,0.4)' },
    walnut: { light: '#8d5b40', base: '#68402e', dark: '#3c2418', grain: 'rgba(20,10,6,0.5)' },
    maple: { light: '#f6e6c8', base: '#e4c99a', dark: '#a88458', grain: 'rgba(110,70,36,0.28)' },
    cherry: { light: '#d4846c', base: '#a84e3e', dark: '#6a3028', grain: 'rgba(50,16,12,0.35)' },
    wall: { light: '#4e463e', base: '#3a342c', dark: '#26201c', grain: 'rgba(0,0,0,0.18)' },
    fence: { light: '#6e665c', base: '#3c3832', dark: '#1e1a16', grain: 'rgba(255,255,255,0.05)' }
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);

  const els = {
    back: document.getElementById('btn-back'),
    kicker: document.getElementById('kicker'),
    title: document.getElementById('title'),
    sound: document.getElementById('btn-sound'),
    coach: document.getElementById('coach'),
    coachText: document.getElementById('coach-text'),
    coachNext: document.getElementById('coach-next'),
    coachSkip: document.getElementById('coach-skip'),
    stage: document.getElementById('stage'),
    canvas: document.getElementById('c'),
    menu: document.getElementById('menu'),
    dock: document.getElementById('dock'),
    playUi: document.getElementById('play-ui'),
    hint: document.getElementById('hint'),
    gap: document.getElementById('gap'),
    meterBar: document.querySelector('#meter-bar i'),
    meterLabel: document.getElementById('meter-label'),
    cut: document.getElementById('btn-cut'),
    result: document.getElementById('result-ui'),
    stars: document.getElementById('stars'),
    resultTitle: document.getElementById('result-title'),
    resultStats: document.getElementById('result-stats'),
    newBest: document.getElementById('new-best'),
    retry: document.getElementById('btn-retry'),
    next: document.getElementById('btn-next')
  };

  const ctx = els.canvas.getContext('2d');
  let view = { scale: 3, ox: 0, oy: 0, dpr: 1, cssW: 300, cssH: 400 };

  const save = loadSave();
  const state = {
    screen: 'menu',
    index: 0,
    mark: null,
    dirty: false,
    phase: 'mark',
    clock: 0,
    frozen: null,
    particles: [],
    punch: 0,
    shake: 0,
    impacted: false,
    sawing: false,
    drag: null,
    coach: -1,
    washPrev: null,
    shownFit: 0,
    finger: null,
    pointerDown: false
  };

  let actx = null;
  let master = null;
  let noiseBuf = null;
  let sawGain = null;
  let last = performance.now();

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return {
        best: raw.best || {},
        cleared: raw.cleared || {},
        tutorialDone: !!raw.tutorialDone,
        sound: raw.sound !== false
      };
    } catch (err) {
      return { best: {}, cleared: {}, tutorialDone: false, sound: true };
    }
  }

  function writeSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (err) { /* private mode */ }
  }

  function level() { return PF.levels[state.index]; }

  function buzz(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (err) { /* unsupported */ }
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!actx) {
      actx = new AC();
      master = actx.createGain();
      master.gain.value = save.sound ? 0.28 : 0;
      master.connect(actx.destination);
      const n = actx.sampleRate;
      noiseBuf = actx.createBuffer(1, n, actx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function setSoundGain() {
    if (master) master.gain.value = save.sound ? 0.28 : 0;
    els.sound.textContent = save.sound ? '♫' : '×';
    els.sound.setAttribute('aria-pressed', save.sound ? 'true' : 'false');
    els.sound.setAttribute('aria-label', save.sound ? 'Mute sound' : 'Unmute sound');
  }

  function envGain(t0, attack, dur, peak) {
    const g = actx.createGain();
    g.connect(master);
    const now = actx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    return g;
  }

  function tone(freq, dur, type, peak) {
    if (!ensureAudio() || !save.sound) return;
    const o = actx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, actx.currentTime);
    const g = envGain(0, 0.01, dur, peak);
    o.connect(g);
    o.start();
    o.stop(actx.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, peak, freq) {
    if (!ensureAudio() || !save.sound) return;
    const src = actx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filter = actx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.7;
    const g = envGain(0, 0.01, dur, peak);
    src.connect(filter);
    filter.connect(g);
    src.start();
    src.stop(actx.currentTime + dur + 0.02);
  }

  function playSeat() {
    tone(210, 0.09, 'triangle', 0.2);
    setTimeout(function () { tone(320, 0.12, 'triangle', 0.16); }, 50);
    noiseBurst(0.05, 0.12, 1800);
  }

  function playTick() {
    tone(540, 0.05, 'square', 0.05);
    noiseBurst(0.04, 0.08, 2400);
  }

  function playSaw(on) {
    if (!ensureAudio()) return;
    if (!on) {
      if (sawGain) {
        sawGain.gain.cancelScheduledValues(actx.currentTime);
        sawGain.gain.setValueAtTime(sawGain.gain.value, actx.currentTime);
        sawGain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.12);
        sawGain = null;
      }
      return;
    }
    if (!save.sound || sawGain) return;
    const src = actx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filter = actx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.8;
    sawGain = actx.createGain();
    sawGain.gain.value = 0.0001;
    sawGain.gain.exponentialRampToValueAtTime(0.18, actx.currentTime + 0.05);
    src.connect(filter);
    filter.connect(sawGain);
    sawGain.connect(master);
    src.start();
    state.sawStop = src;
  }

  function playThud() {
    tone(90, 0.28, 'sine', 0.35);
    tone(140, 0.16, 'triangle', 0.12);
    noiseBurst(0.1, 0.18, 400);
  }

  function playStar(i) {
    tone(280 + i * 90, 0.09, 'triangle', 0.14);
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pathOf(context, poly) {
    context.beginPath();
    context.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) context.lineTo(poly[i].x, poly[i].y);
    context.closePath();
  }

  function openOf(context, poly) {
    context.beginPath();
    context.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) context.lineTo(poly[i].x, poly[i].y);
  }

  function boundsOf(poly) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < poly.length; i++) {
      minX = Math.min(minX, poly[i].x);
      minY = Math.min(minY, poly[i].y);
      maxX = Math.max(maxX, poly[i].x);
      maxY = Math.max(maxY, poly[i].y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }

  function drawWood(context, poly, toneName, seed, angle) {
    if (!poly || poly.length < 3) return;
    const tone = TONES[toneName] || TONES.oak;
    const b = boundsOf(poly);
    context.save();
    pathOf(context, poly);
    context.clip();
    const g = context.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h * 0.8);
    g.addColorStop(0, tone.light);
    g.addColorStop(0.45, tone.base);
    g.addColorStop(1, tone.dark);
    context.fillStyle = g;
    context.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    context.translate(b.cx, b.cy);
    context.rotate(angle || 0.04);
    const rng = mulberry32(seed || 1);
    const reach = b.w + b.h + 40;
    for (let i = 0; i < 22; i++) {
      const y = (rng() - 0.5) * reach;
      context.beginPath();
      context.strokeStyle = tone.grain;
      context.lineWidth = 0.25 + rng() * 0.7;
      const wob = 0.6 + rng();
      context.moveTo(-reach, y);
      for (let x = -reach; x <= reach; x += 7) {
        context.lineTo(x, y + Math.sin(x * 0.18 + seed) * wob + (rng() - 0.5) * 0.35);
      }
      context.stroke();
    }
    context.restore();
    context.save();
    pathOf(context, poly);
    context.strokeStyle = 'rgba(0,0,0,0.38)';
    context.lineWidth = 0.55;
    context.stroke();
    context.strokeStyle = 'rgba(255,236,210,0.22)';
    context.lineWidth = 0.35;
    context.stroke();
    context.restore();
  }

  function drawShadow(context, poly) {
    context.save();
    context.translate(0.8, 1.15);
    context.fillStyle = 'rgba(0,0,0,0.3)';
    pathOf(context, poly);
    context.fill();
    context.restore();
  }

  function drawBench(context) {
    const g = context.createLinearGradient(0, 0, 40, WORLD_H);
    g.addColorStop(0, '#5a3a22');
    g.addColorStop(0.45, '#3d2818');
    g.addColorStop(1, '#24160e');
    context.fillStyle = g;
    context.fillRect(-8, -8, WORLD_W + 16, WORLD_H + 16);
    context.strokeStyle = 'rgba(0,0,0,0.18)';
    context.lineWidth = 0.35;
    for (let y = 6; y < WORLD_H; y += 16) {
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(28, y + 0.7, 68, y - 0.5, 100, y + 0.4);
      context.stroke();
    }
    context.strokeStyle = 'rgba(90,60,30,0.25)';
    context.lineWidth = 0.2;
    for (let x = 18; x < 90; x += 37) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 1.2, WORLD_H);
      context.stroke();
    }
    const v = context.createRadialGradient(50, 64, 18, 50, 70, 78);
    v.addColorStop(0, 'rgba(255,210,150,0.05)');
    v.addColorStop(1, 'rgba(0,0,0,0.38)');
    context.fillStyle = v;
    context.fillRect(-8, -8, WORLD_W + 16, WORLD_H + 16);
  }

  function shiftPoly(poly, o) {
    if (!o || (o.x === 0 && o.y === 0)) return poly;
    const out = new Array(poly.length);
    for (let i = 0; i < poly.length; i++) out[i] = PF.add(poly[i], o);
    return out;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function easeOutBack(t) {
    const c1 = 1.45;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function pieceShift(lv) {
    const clock = state.phase === 'result' ? RESULT_AT : state.clock;
    if (state.phase === 'mark' || clock < SLIDE_AT) return { x: 0, y: 0 };
    let t = PF.clamp((clock - SLIDE_AT) / SLIDE_DUR, 0, 1);
    if (reduceMotion) t = 1;
    if (lv.slide) return PF.mul(lv.slide, easeOutBack(t));
    const pull = 5.5 * (1 - easeOutCubic(t));
    const bite = Math.sin(Math.min(t, 1) * Math.PI) * 0.85 * (1 - t);
    return PF.mul(lv.away, pull - bite);
  }

  function currentEval() {
    if (state.frozen) return state.frozen;
    return PF.evaluate(level(), state.mark);
  }

  function drawRound(context, x, y, r) {
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
  }

  function drawSquareTool(context, lv, mark) {
    const x = mark.seated ? lv.square.idealX : mark.x;
    const y = lv.square.top;
    const punch = 1 + state.punch * 0.07;
    context.save();
    context.translate(x, y);
    context.scale(punch, punch);
    context.translate(-x, -y);
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.fillRect(x - 12, y - 5.2, 24, 5.4);
    const metal = context.createLinearGradient(x - 12, y - 6, x + 12, y + 8);
    metal.addColorStop(0, '#d5d8dc');
    metal.addColorStop(0.5, '#8e959c');
    metal.addColorStop(1, '#5c646c');
    context.fillStyle = metal;
    roundRect(context, x - 11, y - 4.6, 22, 4.2, 0.6);
    context.fill();
    context.fillRect(x - 1.15, y - 1, 2.3, (lv.square.bot - y) + 3);
    context.strokeStyle = mark.seated ? '#8dcc78' : 'rgba(255,255,255,0.35)';
    context.lineWidth = mark.seated ? 0.7 : 0.25;
    context.strokeRect(x - 1.15, y, 2.3, lv.square.bot - y);
    const brass = context.createRadialGradient(x - 0.3, y - 0.4, 0.2, x, y - 0.2, 1.5);
    brass.addColorStop(0, '#f0d78a');
    brass.addColorStop(1, '#a67c32');
    context.fillStyle = brass;
    drawRound(context, x, y - 0.4, 1.35);
    context.fill();
    context.restore();
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawBar(context, a, b, hot) {
    const hr = 16 / view.scale;
    context.save();
    context.lineCap = 'round';
    context.strokeStyle = 'rgba(0,0,0,0.3)';
    context.lineWidth = 3.1;
    context.beginPath();
    context.moveTo(a.x + 0.4, a.y + 0.6);
    context.lineTo(b.x + 0.4, b.y + 0.6);
    context.stroke();
    const grad = context.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, hot ? '#f0d7a0' : '#c5ccd2');
    grad.addColorStop(0.5, hot ? '#e0a050' : '#8b949c');
    grad.addColorStop(1, hot ? '#a87430' : '#5e666e');
    context.strokeStyle = grad;
    context.lineWidth = 2.15;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
    [a, b].forEach(function (p) {
      context.fillStyle = '#4e565e';
      drawRound(context, p.x, p.y, hr);
      context.fill();
      context.fillStyle = '#d5dbe0';
      drawRound(context, p.x, p.y, hr * 0.62);
      context.fill();
      context.fillStyle = '#2c3238';
      drawRound(context, p.x, p.y, hr * 0.22);
      context.fill();
    });
    context.restore();
  }

  function drawWasher(context, lv, mark) {
    const t = mark.ghostT != null && state.pointerDown && !mark.inContact ? mark.ghostT : (mark.t || 0);
    const p = PF.pointAt(lv.ideal, t);
    const R = lv.washerR;
    context.save();
    context.fillStyle = 'rgba(0,0,0,0.28)';
    drawRound(context, p.x + 0.6, p.y + 0.8, R);
    context.fill();
    const ring = context.createRadialGradient(p.x - R * 0.3, p.y - R * 0.35, R * 0.2, p.x, p.y, R);
    if (state.pointerDown && !mark.inContact) {
      ring.addColorStop(0, '#e8b0a4');
      ring.addColorStop(0.55, '#a85a4e');
      ring.addColorStop(0.72, '#6a302c');
    } else if (mark.inContact) {
      ring.addColorStop(0, '#f4f7f8');
      ring.addColorStop(0.55, '#9aa3aa');
      ring.addColorStop(0.72, '#5c666e');
    } else {
      ring.addColorStop(0, '#e6eaee');
      ring.addColorStop(0.55, '#8e979e');
      ring.addColorStop(0.72, '#555e66');
    }
    ring.addColorStop(0.78, 'rgba(0,0,0,0)');
    context.fillStyle = ring;
    drawRound(context, p.x, p.y, R);
    context.fill();
    context.fillStyle = '#1a120c';
    drawRound(context, p.x, p.y, R * 0.34);
    context.fill();
    context.strokeStyle = '#2a241c';
    context.lineWidth = 0.45;
    context.beginPath();
    context.moveTo(p.x - R * 0.22, p.y);
    context.lineTo(p.x + R * 0.55, p.y - R * 0.15);
    context.stroke();
    if (!mark.seen && state.phase === 'mark') {
      const ahead = PF.pointAt(lv.ideal, Math.min(1, t + 0.08));
      const dir = PF.norm(PF.sub(ahead, p));
      const n = { x: -dir.y, y: dir.x };
      const tip = PF.add(p, PF.mul(dir, R + 3.2));
      context.strokeStyle = 'rgba(224,160,80,0.9)';
      context.fillStyle = 'rgba(224,160,80,0.9)';
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(p.x + dir.x * (R + 0.4), p.y + dir.y * (R + 0.4));
      context.lineTo(tip.x, tip.y);
      context.stroke();
      context.beginPath();
      context.moveTo(tip.x, tip.y);
      context.lineTo(tip.x - dir.x * 2 + n.x * 1.3, tip.y - dir.y * 2 + n.y * 1.3);
      context.lineTo(tip.x - dir.x * 2 - n.x * 1.3, tip.y - dir.y * 2 - n.y * 1.3);
      context.closePath();
      context.fill();
    }
    context.restore();
  }

  function drawScene(context, lv, mark, opts) {
    const showTools = opts.showTools !== false;
    const ev = opts.eval || PF.evaluate(lv, mark);
    const o = opts.offset || { x: 0, y: 0 };
    const work = shiftPoly(ev.poly, o);
    drawBench(context);
    const decor = [];
    const solid = [];
    lv.fixed.forEach(function (piece) { (piece.decor ? decor : solid).push(piece); });
    decor.forEach(function (piece) {
      drawShadow(context, piece.poly);
      drawWood(context, piece.poly, piece.tone, piece.seed, piece.angle || 0);
    });
    function paintWork() {
      drawShadow(context, work);
      drawWood(context, work, lv.tone, lv.seed, 0.03);
    }
    function paintSolid() {
      solid.forEach(function (piece) {
        drawShadow(context, piece.poly);
        drawWood(context, piece.poly, piece.tone, piece.seed, piece.angle || 0);
      });
    }
    if (lv.draw === 'template-on-top') {
      paintWork();
      paintSolid();
    } else {
      paintSolid();
      paintWork();
    }
    if (opts.waste && ev.waste && ev.waste.length > 2 && (opts.wasteAlpha || 0) > 0.02) {
      context.save();
      context.translate(opts.wasteShift.x, opts.wasteShift.y);
      context.globalAlpha = opts.wasteAlpha;
      drawWood(context, ev.waste, lv.tone, lv.seed + 9, 0.2);
      context.restore();
    }
    context.save();
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = ev.fit > 96 && (state.phase !== 'mark') ? 'rgba(180,230,160,0.95)' : 'rgba(242,210,164,0.95)';
    context.lineWidth = ev.fit > 96 && state.phase !== 'mark' ? 1.15 : 0.7;
    openOf(context, lv.mating);
    context.stroke();
    if (lv.tool === 'trace' || lv.tool === 'washer') {
      context.strokeStyle = 'rgba(32,24,18,0.85)';
      context.lineWidth = 0.85;
      const shown = shiftPoly(ev.cut, o);
      openOf(context, shown);
      context.stroke();
    }
    if (lv.tool === 'trace' && showTools) {
      const pulse = 0.45 + 0.35 * Math.sin(performance.now() / 280);
      lv.segments.forEach(function (seg, i) {
        if (mark.locked[i]) return;
        context.strokeStyle = 'rgba(224,160,80,' + pulse + ')';
        context.lineWidth = 1.15;
        context.setLineDash([1.4, 1.1]);
        context.beginPath();
        context.moveTo(seg[0].x, seg[0].y);
        context.lineTo(seg[1].x, seg[1].y);
        context.stroke();
        context.setLineDash([]);
      });
    }
    if (lv.tool === 'washer' && lv.wall && showTools) {
      const bins = mark.bins;
      for (let i = 0; i < bins.length; i += 2) {
        const t = i / (bins.length - 1);
        const p = PF.pointAt(lv.wall, t);
        context.fillStyle = bins[i] ? 'rgba(236,214,170,0.95)' : 'rgba(236,214,170,0.28)';
        drawRound(context, p.x, p.y, bins[i] ? 0.72 : 0.42);
        context.fill();
      }
    }
    if (opts.kerf != null && ev.cut) {
      const cut = shiftPoly(ev.cut, o);
      const head = PF.pointAt(cut, opts.kerf);
      context.strokeStyle = '#1a0e08';
      context.lineWidth = 0.9;
      context.setLineDash([]);
      openOf(context, cut.slice(0, Math.max(2, Math.ceil(opts.kerf * (cut.length - 1)) + 1)));
      context.stroke();
      context.fillStyle = '#d7dee4';
      drawRound(context, head.x, head.y, 1.1);
      context.fill();
    }
    context.restore();
    if (showTools && state.phase === 'mark') {
      if (lv.tool === 'square') drawSquareTool(context, lv, mark);
      else if (lv.tool === 'line' || lv.tool === 'trace') {
        const hot = !!mark.seated || !!mark.hot;
        drawBar(context, mark.a, mark.b, hot);
      } else if (lv.tool === 'washer') drawWasher(context, lv, mark);
    }
    state.particles.forEach(function (p) {
      context.save();
      context.translate(p.x, p.y);
      context.rotate(p.rot);
      context.globalAlpha = Math.max(0, p.life);
      context.fillStyle = p.color;
      context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * 0.45);
      context.restore();
    });
  }

  function paint() {
    const lv = level();
    const dpr = view.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, view.cssW, view.cssH);
    ctx.save();
    if (state.shake > 0) {
      const mag = state.shake * 2.2;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    const ev = currentEval();
    const clock = state.clock;
    let kerf = null;
    let wasteAlpha = 0;
    let wasteShift = { x: 0, y: 0 };
    if (state.phase !== 'mark') {
      const sawT = PF.clamp(clock / SAW_MS, 0, 1);
      if (sawT < 1) kerf = reduceMotion ? 1 : sawT;
      if (clock < 1500) {
        const fallT = PF.clamp((clock - 640) / 800, 0, 1);
        wasteAlpha = clock < 700 ? 1 : 1 - fallT;
        wasteShift = { x: lv.away.x * fallT * 4, y: fallT * fallT * 28 };
      }
    }
    drawScene(ctx, lv, state.mark, {
      eval: ev,
      offset: pieceShift(lv),
      showTools: state.phase === 'mark',
      kerf: kerf,
      waste: state.phase !== 'mark',
      wasteAlpha: wasteAlpha,
      wasteShift: wasteShift
    });
    ctx.restore();
  }

  function spawnBurst(x, y, nrm, count, speed) {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.4;
      state.particles.push({
        x: x,
        y: y,
        vx: nrm.x * speed + spread,
        vy: nrm.y * speed - Math.random() * 2.2,
        w: 1.4 + Math.random() * 2.6,
        h: 0.7 + Math.random() * 1.4,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 8,
        life: 1,
        color: SHAVING[(Math.random() * SHAVING.length) | 0]
      });
    }
  }

  function updatePlay(dt) {
    state.punch = Math.max(0, state.punch - dt * 2.4);
    state.shake = Math.max(0, state.shake - dt * 2.8);
    if (state.phase !== 'mark' && state.phase !== 'result') {
      state.clock += reduceMotion ? dt * 4000 : dt * 1000;
      const ev = state.frozen;
      const sawT = PF.clamp(state.clock / SAW_MS, 0, 1);
      if (sawT > 0 && sawT < 1 && ev) {
        if (!state.sawing) {
          state.sawing = true;
          playSaw(true);
          buzz([18, 40, 18, 40, 18]);
        }
        const head = PF.pointAt(ev.cut, sawT);
        const ahead = PF.pointAt(ev.cut, Math.min(1, sawT + 0.02));
        const dir = PF.norm(PF.sub(ahead, head));
        const nrm = { x: -dir.y, y: dir.x };
        if (!reduceMotion && Math.random() < 0.8) spawnBurst(head.x, head.y, nrm, 2, 3 + Math.random() * 4);
      } else if (state.sawing && sawT >= 1) {
        state.sawing = false;
        playSaw(false);
      }
      if (!state.impacted && state.clock > SLIDE_AT + SLIDE_DUR * 0.72) {
        state.impacted = true;
        state.shake = 1;
        playThud();
        const good = state.frozen.fit >= 96;
        buzz(good ? [12, 36, 18] : [30]);
        const seam = PF.pointAt(level().mating, 0.5);
        spawnBurst(seam.x, seam.y, { x: 0, y: -1 }, good ? 16 : 8, 4);
      }
      if (state.clock >= RESULT_AT) finishResult();
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.vy += 26 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= (1 - 1.4 * dt);
      p.rot += p.vr * dt;
      p.life -= dt * 0.55;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function fitColor(fit) {
    if (fit >= 96) return '#7dcc6a';
    if (fit >= 66) return '#e0a050';
    return '#d35a4a';
  }

  function refreshHud() {
    const lv = level();
    const ev = currentEval();
    if (state.phase === 'mark') {
      state.shownFit += (ev.fit - state.shownFit) * 0.35;
      const fit = state.shownFit;
      els.gap.textContent = ev.mm < 0.05 ? '0.0 mm' : ev.mm.toFixed(1) + ' mm';
      els.meterBar.style.width = PF.clamp(fit, 0, 100) + '%';
      els.meterBar.style.background = fitColor(fit);
      let label = PF.titleFor(fit);
      if (lv.tool === 'trace') {
        const n = state.mark.locked.length;
        let got = 0;
        for (let i = 0; i < n; i++) if (state.mark.locked[i]) got++;
        label = got + '/' + n;
      } else if (lv.tool === 'washer') {
        label = Math.round(ev.coverage * 100) + '%';
      }
      els.meterLabel.textContent = label;
      els.hint.textContent = lv.hint;
      const ready = markReady(lv, ev);
      els.cut.disabled = state.phase !== 'mark' || !state.dirty;
      els.cut.classList.toggle('ready', ready && state.dirty);
      els.cut.textContent = 'Cut the line';
    }
  }

  function markReady(lv, ev) {
    if (lv.tool === 'square' || lv.tool === 'line') return !!state.mark.seated || ev.fit >= 96;
    if (lv.tool === 'trace') return state.mark.locked.every(Boolean);
    return ev.coverage >= 0.97;
  }

  function updateCoach() {
    const lv = level();
    if (!lv.tutorial || state.coach < 0) {
      els.coach.classList.add('hidden');
      return;
    }
    els.coach.classList.remove('hidden');
    els.coachText.textContent = lv.tutorial[state.coach];
    els.coachNext.textContent = state.coach === lv.tutorial.length - 1 ? 'Got it' : 'Next';
  }

  function setCoach(step) {
    const lv = level();
    if (!lv.tutorial) {
      state.coach = -1;
    } else {
      state.coach = step;
      if (step >= lv.tutorial.length) {
        state.coach = -1;
        save.tutorialDone = true;
        writeSave();
      }
    }
    updateCoach();
    requestAnimationFrame(resize);
  }

  function maybeAdvanceCoach() {
    const lv = level();
    if (state.coach < 0 || !lv.tutorial) return;
    const ev = PF.evaluate(lv, state.mark);
    if (state.coach === 1 && state.dirty) setCoach(2);
    else if (state.coach === 2 && (state.mark.seated || ev.fit >= 96)) setCoach(3);
  }

  function enterMenu() {
    state.screen = 'menu';
    state.phase = 'mark';
    state.frozen = null;
    state.particles = [];
    playSaw(false);
    els.menu.classList.remove('hidden');
    els.dock.classList.add('hidden');
    els.coach.classList.add('hidden');
    els.kicker.textContent = 'Workshop';
    els.title.textContent = 'Perfect Fit';
    document.title = 'Perfect Fit';
    els.back.textContent = '←';
    els.back.setAttribute('href', '../');
    els.back.setAttribute('aria-label', 'All games');
    buildMenu();
  }

  function enterLevel(index, opts) {
    opts = opts || {};
    const prevId = index > 0 ? PF.levels[index - 1].id : null;
    if (!opts.force && index > 0 && !save.cleared[prevId]) return;
    ensureAudio();
    state.screen = 'play';
    state.index = index;
    state.mark = PF.blankMark(level());
    state.dirty = false;
    state.phase = 'mark';
    state.clock = 0;
    state.frozen = null;
    state.particles = [];
    state.impacted = false;
    state.sawing = false;
    state.punch = 0;
    state.drag = null;
    state.washPrev = null;
    state.shownFit = PF.evaluate(level(), state.mark).fit;
    state.pointerDown = false;
    els.menu.classList.add('hidden');
    els.dock.classList.remove('hidden');
    els.playUi.classList.remove('hidden');
    els.result.classList.add('hidden');
    const lv = level();
    els.kicker.textContent = 'Joint ' + (index + 1) + ' / ' + PF.levels.length;
    els.title.textContent = lv.name;
    document.title = lv.name + ' — Perfect Fit';
    els.back.removeAttribute('href');
    els.back.setAttribute('aria-label', 'Back to joints');
    if (lv.tutorial && !save.tutorialDone) setCoach(0);
    else setCoach(-1);
    refreshHud();
    requestAnimationFrame(resize);
  }

  function buildMenu() {
    const root = els.menu;
    root.innerHTML = '';
    const lede = document.createElement('p');
    lede.className = 'lede';
    lede.textContent = 'Don’t measure the gap. Use the other piece as the template — scribe, cut, and let them close.';
    root.appendChild(lede);
    PF.levels.forEach(function (lv, i) {
      const open = i === 0 || !!save.cleared[PF.levels[i - 1].id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level';
      btn.disabled = !open;
      const thumb = document.createElement('canvas');
      thumb.width = 156;
      thumb.height = 204;
      btn.appendChild(thumb);
      const copy = document.createElement('div');
      const h = document.createElement('h3');
      h.textContent = (i + 1) + '. ' + lv.name;
      const p = document.createElement('p');
      p.textContent = open ? lv.blurb : 'Finish the previous joint to open this one.';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const best = save.best[lv.id];
      if (best) {
        meta.textContent = '★★★'.slice(0, best.stars) + '☆☆☆'.slice(best.stars);
        const rest = document.createElement('span');
        rest.textContent = Math.round(best.fit) + '% best';
        meta.appendChild(rest);
      } else {
        meta.textContent = open ? 'Not cut yet' : 'Locked';
      }
      copy.appendChild(h);
      copy.appendChild(p);
      copy.appendChild(meta);
      btn.appendChild(copy);
      btn.addEventListener('click', function () { enterLevel(i); });
      root.appendChild(btn);
      paintThumb(thumb, lv);
    });
  }

  function paintThumb(canvas, lv) {
    const context = canvas.getContext('2d');
    const dpr = 2;
    const cssW = 78;
    const cssH = 102;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const scale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.translate((cssW - WORLD_W * scale) / 2, (cssH - WORLD_H * scale) / 2);
    context.scale(scale, scale);
    const mark = PF.perfectMark(lv);
    const ev = PF.evaluate(lv, mark);
    drawScene(context, lv, mark, {
      eval: ev,
      offset: lv.slide || { x: 0, y: 0 },
      showTools: false
    });
  }

  function beginCut() {
    if (state.phase !== 'mark' || !state.dirty) return;
    ensureAudio();
    const ev = PF.evaluate(level(), state.mark);
    state.frozen = ev;
    state.phase = 'saw';
    state.clock = 0;
    state.impacted = false;
    state.sawing = false;
    state.coach = -1;
    updateCoach();
    els.cut.disabled = true;
    els.cut.textContent = 'Cutting…';
    els.cut.classList.remove('ready');
  }

  function finishResult() {
    if (state.phase === 'result') return;
    state.phase = 'result';
    playSaw(false);
    const ev = state.frozen;
    const lv = level();
    const prev = save.best[lv.id];
    const isNew = !prev || ev.fit > prev.fit + 0.05;
    if (!prev || ev.fit >= prev.fit) save.best[lv.id] = { fit: ev.fit, stars: ev.stars };
    save.cleared[lv.id] = true;
    writeSave();
    els.playUi.classList.add('hidden');
    els.result.classList.remove('hidden');
    els.resultTitle.textContent = ev.title;
    els.resultStats.textContent = Math.round(ev.fit) + '% tight · ' + (ev.mm < 0.05 ? '0.0' : ev.mm.toFixed(1)) + ' mm gap';
    els.newBest.textContent = isNew ? 'New best' : (prev ? 'Best ' + Math.round(prev.fit) + '%' : '');
    const stars = els.stars.children;
    for (let i = 0; i < 3; i++) {
      stars[i].classList.toggle('on', i < ev.stars);
    }
    const last = state.index >= PF.levels.length - 1;
    els.next.textContent = last ? 'All joints' : 'Next joint';
    for (let i = 0; i < ev.stars; i++) {
      setTimeout(function () { playStar(i); buzz([8]); }, reduceMotion ? 0 : 140 * i);
    }
    requestAnimationFrame(resize);
  }

  function retry() {
    enterLevel(state.index);
  }

  function nextLevel() {
    if (state.index >= PF.levels.length - 1) enterMenu();
    else enterLevel(state.index + 1);
  }

  function resize() {
    const rect = els.stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    const margin = 6;
    const scale = Math.min((cssW - margin) / WORLD_W, (cssH - margin) / WORLD_H);
    view = {
      dpr: dpr,
      cssW: cssW,
      cssH: cssH,
      scale: scale,
      ox: (cssW - WORLD_W * scale) / 2,
      oy: (cssH - WORLD_H * scale) / 2
    };
    els.canvas.width = Math.round(cssW * dpr);
    els.canvas.height = Math.round(cssH * dpr);
    if (state.screen === 'play') paint();
  }

  function toWorld(clientX, clientY) {
    const rect = els.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.ox) / view.scale,
      y: (clientY - rect.top - view.oy) / view.scale
    };
  }

  function screenDist(a, b) {
    return Math.hypot((a.x - b.x) * view.scale, (a.y - b.y) * view.scale);
  }

  function targetsFor(lv, mark) {
    if (lv.tool === 'line') return [[lv.ideal[0], lv.ideal[lv.ideal.length - 1]]];
    const list = [];
    lv.segments.forEach(function (seg, i) {
      if (!mark.locked[i]) list.push(seg);
    });
    return list;
  }

  function applyMagnet(lv, release) {
    const mark = state.mark;
    const targets = targetsFor(lv, mark);
    if (!targets.length) {
      mark.hot = false;
      return;
    }
    const draggingEnd = !release && state.drag && (state.drag.kind === 'a' || state.drag.kind === 'b');
    if (draggingEnd && state.drag.prevA) {
      const assisted = PF.pivotAssist(mark.a, mark.b, state.drag.prevA, state.drag.prevB, targets);
      mark.a = assisted.a;
      mark.b = assisted.b;
      mark.hot = assisted.hot;
    } else {
      const mag = PF.magnetBar(mark.a, mark.b, targets);
      mark.a = mag.a;
      mark.b = mag.b;
      mark.hot = mag.hot;
    }
    if (lv.tool === 'trace') {
      const hit = PF.tryLockTrace(lv, mark, !!release);
      if (hit != null) {
        state.dirty = true;
        state.punch = 1;
        playTick();
        buzz([10, 24, 12]);
        maybeAdvanceCoach();
      }
    } else if (lv.tool === 'line') {
      seatLine(lv, !!release);
    }
  }

  function seatLine(lv, loose) {
    const mark = state.mark;
    const c = lv.ideal[0];
    const d = lv.ideal[lv.ideal.length - 1];
    const m = PF.matchSegment(mark.a, mark.b, c, d);
    if (PF.seatMatch(m, loose)) {
      if (!mark.seated) {
        playSeat();
        buzz([10, 30, 16]);
        state.punch = 1;
      }
      mark.seated = true;
      const dir = PF.norm(PF.sub(d, c));
      const mid = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
      const half = Math.max(PF.dist(c, d) * 0.65, 16);
      mark.a = PF.add(mid, PF.mul(dir, -half));
      mark.b = PF.add(mid, PF.mul(dir, half));
      state.dirty = true;
      maybeAdvanceCoach();
      return true;
    }
    return false;
  }

  function moveSquare(rawX) {
    const lv = level();
    const mark = state.mark;
    const sq = lv.square;
    let x = PF.clamp(rawX, sq.xMin, sq.xMax);
    const d = sq.idealX - x;
    if (!mark.seated && Math.abs(d) < 6) x += d * 0.34;
    if (Math.abs(x - sq.idealX) < 0.9) {
      if (!mark.seated) {
        playSeat();
        buzz([12, 28, 18]);
        state.punch = 1;
      }
      mark.seated = true;
      x = sq.idealX;
    }
    if (mark.seated && Math.abs(rawX - sq.idealX) > 4.2) {
      mark.seated = false;
      x = PF.clamp(rawX, sq.xMin, sq.xMax);
    }
    if (mark.seated) x = sq.idealX;
    if (Math.abs(x - mark.x) > 0.05) state.dirty = true;
    mark.x = x;
    maybeAdvanceCoach();
  }

  function moveWasher(finger) {
    const lv = level();
    const mark = state.mark;
    const hit = PF.closestOnPoly(finger, lv.ideal);
    const contact = hit.dist <= lv.contact;
    mark.ghostT = hit.t;
    if (!state.pointerDown) {
      mark.inContact = false;
      return;
    }
    if (contact) {
      if (!mark.inContact) buzz([6]);
      if (state.washPrev && state.washPrev.contact) PF.fillWasher(mark, state.washPrev.t, hit.t, mark.bins);
      else PF.fillWasher(mark, hit.t, hit.t, mark.bins);
      mark.t = hit.t;
      mark.inContact = true;
      state.dirty = true;
      const now = performance.now();
      if (now - (state.lastScrape || 0) > 90) {
        state.lastScrape = now;
        noiseBurst(0.05, 0.05, 1400);
      }
    } else if (mark.inContact) {
      mark.inContact = false;
      buzz([4]);
    }
    state.washPrev = { t: hit.t, contact: contact };
  }

  function onPointerDown(e) {
    if (state.screen !== 'play' || state.phase !== 'mark') return;
    if (e.target !== els.canvas) return;
    ensureAudio();
    try { els.canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    state.pointerDown = true;
    const w = toWorld(e.clientX, e.clientY);
    state.finger = w;
    const lv = level();
    if (lv.tool === 'square') {
      state.drag = { kind: 'square' };
      moveSquare(w.x);
    } else if (lv.tool === 'washer') {
      state.drag = { kind: 'washer' };
      state.washPrev = null;
      moveWasher(w);
    } else {
      const a = state.mark.a;
      const b = state.mark.b;
      const da = screenDist(w, a);
      const db = screenDist(w, b);
      let kind = 'body';
      if (da < 36 || (da < db && da < 48)) kind = 'a';
      else if (db < 48) kind = 'b';
      state.drag = { kind: kind, last: w };
      if (kind === 'body' && da > 70 && db > 70) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const delta = PF.sub(w, mid);
        state.mark.a = PF.add(a, delta);
        state.mark.b = PF.add(b, delta);
        state.mark.seated = false;
      }
      state.dirty = true;
    }
    maybeAdvanceCoach();
    refreshHud();
  }

  function onPointerMove(e) {
    if (!state.pointerDown || !state.drag || state.phase !== 'mark') return;
    const w = toWorld(e.clientX, e.clientY);
    state.finger = w;
    const lv = level();
    const mark = state.mark;
    if (lv.tool === 'square') {
      moveSquare(w.x);
    } else if (lv.tool === 'washer') {
      moveWasher(w);
    } else if (mark.seated && lv.tool === 'line') {
      const c = lv.ideal[0];
      const d = lv.ideal[lv.ideal.length - 1];
      const dx = d.x - c.x;
      const dy = d.y - c.y;
      const L = Math.hypot(dx, dy) || 1;
      const off = Math.abs((w.x - c.x) * dy - (w.y - c.y) * dx) / L;
      if (off > 8) {
        mark.seated = false;
        state.drag.last = w;
      } else {
        const q = projectFinger(w, c, d);
        const dir = PF.norm(PF.sub(d, c));
        const half = Math.max(PF.dist(c, d) * 0.65, 16);
        mark.a = PF.add(q, PF.mul(dir, -half));
        mark.b = PF.add(q, PF.mul(dir, half));
        state.drag.last = w;
      }
    }
    if ((lv.tool === 'line' || lv.tool === 'trace') && !mark.seated) {
      const last = state.drag.last;
      state.drag.prevA = { x: mark.a.x, y: mark.a.y };
      state.drag.prevB = { x: mark.b.x, y: mark.b.y };
      if (state.drag.kind === 'body') {
        const delta = PF.sub(w, last);
        mark.a = PF.add(mark.a, delta);
        mark.b = PF.add(mark.b, delta);
      } else if (state.drag.kind === 'a') {
        mark.a = w;
        keepLength();
      } else if (state.drag.kind === 'b') {
        mark.b = w;
        keepLength();
      }
      state.drag.last = w;
      applyMagnet(lv, false);
    }
    refreshHud();
  }

  function projectFinger(p, a, b) {
    const ab = PF.sub(b, a);
    const L2 = ab.x * ab.x + ab.y * ab.y;
    const t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (L2 || 1);
    return { x: a.x + ab.x * t, y: a.y + ab.y * t };
  }

  function keepLength() {
    const mark = state.mark;
    const L = PF.dist(mark.a, mark.b);
    if (L >= 14) return;
    const dir = PF.norm(PF.sub(mark.b, mark.a));
    const mid = { x: (mark.a.x + mark.b.x) / 2, y: (mark.a.y + mark.b.y) / 2 };
    mark.a = PF.add(mid, PF.mul(dir, -7));
    mark.b = PF.add(mid, PF.mul(dir, 7));
  }

  function onPointerUp() {
    if (state.phase === 'mark' && state.drag) {
      const lv = level();
      if ((lv.tool === 'line' || lv.tool === 'trace') && !(state.mark && state.mark.seated)) {
        applyMagnet(lv, true);
      }
    }
    state.pointerDown = false;
    state.drag = null;
    state.washPrev = null;
    if (state.mark) state.mark.inContact = false;
    refreshHud();
  }

  function nudgeBar(dx, dy) {
    const mark = state.mark;
    mark.a = PF.add(mark.a, { x: dx, y: dy });
    mark.b = PF.add(mark.b, { x: dx, y: dy });
    mark.seated = false;
    state.dirty = true;
    applyMagnet(level(), false);
  }

  function rotateBar(ang) {
    const mark = state.mark;
    const mid = { x: (mark.a.x + mark.b.x) / 2, y: (mark.a.y + mark.b.y) / 2 };
    const v = PF.sub(mark.b, mid);
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const r = { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
    mark.a = PF.sub(mid, r);
    mark.b = PF.add(mid, r);
    mark.seated = false;
    state.dirty = true;
    applyMagnet(level());
  }

  function onKey(e) {
    if (state.screen !== 'play') {
      if (e.key === 'Escape') enterMenu();
      return;
    }
    if (e.key === 'Escape') {
      enterMenu();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (state.phase === 'mark') beginCut();
      else if (state.phase === 'result' && e.key === 'Enter') nextLevel();
      e.preventDefault();
      return;
    }
    if (state.phase !== 'mark') return;
    const lv = level();
    const step = e.shiftKey ? 2.2 : 0.9;
    if (lv.tool === 'square' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      moveSquare(state.mark.x + (e.key === 'ArrowLeft' ? -step : step));
      e.preventDefault();
    } else if (lv.tool === 'washer' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      state.pointerDown = true;
      const t = PF.clamp((state.mark.t || 0) + (e.key === 'ArrowDown' ? 0.02 : -0.02), 0, 1);
      const p = PF.pointAt(lv.ideal, t);
      moveWasher(p);
      state.pointerDown = false;
      state.washPrev = null;
      e.preventDefault();
    } else if (lv.tool === 'line' || lv.tool === 'trace') {
      if (e.key === 'ArrowLeft') nudgeBar(-step, 0);
      else if (e.key === 'ArrowRight') nudgeBar(step, 0);
      else if (e.key === 'ArrowUp') nudgeBar(0, -step);
      else if (e.key === 'ArrowDown') nudgeBar(0, step);
      else if (e.key === '[' || e.key === ',') rotateBar(-0.05);
      else if (e.key === ']' || e.key === '.') rotateBar(0.05);
      else return;
      e.preventDefault();
    }
    refreshHud();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.screen === 'play') {
      updatePlay(dt);
      if (state.phase === 'mark') refreshHud();
      paint();
    }
    requestAnimationFrame(loop);
  }

  function wire() {
    els.canvas.addEventListener('pointerdown', onPointerDown);
    els.canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    els.cut.addEventListener('click', beginCut);
    els.retry.addEventListener('click', retry);
    els.next.addEventListener('click', nextLevel);
    els.sound.addEventListener('click', function () {
      ensureAudio();
      save.sound = !save.sound;
      writeSave();
      setSoundGain();
      if (save.sound) playTick();
    });
    els.back.addEventListener('click', function (e) {
      if (state.screen === 'play') {
        e.preventDefault();
        enterMenu();
      }
    });
    els.coachNext.addEventListener('click', function () { setCoach(state.coach + 1); });
    els.coachSkip.addEventListener('click', function () {
      save.tutorialDone = true;
      writeSave();
      setCoach(-1);
    });
    window.addEventListener('keydown', onKey);
    document.addEventListener('touchmove', function (e) {
      if (e.target.closest && e.target.closest('.can-scroll')) return;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    if (window.ResizeObserver) new ResizeObserver(resize).observe(els.stage);
    else window.addEventListener('resize', resize);
    window.addEventListener('resize', resize);
  }

  function bootShot() {
    const shot = params.get('shot');
    const levelNum = parseInt(params.get('level') || '1', 10);
    if (!shot) {
      if (params.get('level')) enterLevel(PF.clamp(levelNum, 1, PF.levels.length) - 1, { force: true });
      return;
    }
    enterLevel(PF.clamp(levelNum, 1, PF.levels.length) - 1, { force: true });
    setCoach(-1);
    const lv = level();
    if (shot === 'mid') {
      if (lv.tool === 'square') {
        state.mark.x = lv.square.idealX + 3.2;
        state.mark.seated = false;
        state.dirty = true;
      } else if (lv.tool === 'line') {
        state.dirty = true;
      } else if (lv.tool === 'trace') {
        const n = Math.max(1, Math.floor(state.mark.locked.length / 2));
        for (let i = 0; i < n; i++) state.mark.locked[i] = true;
        state.dirty = true;
      } else if (lv.tool === 'washer') {
        for (let i = 0; i < state.mark.bins.length; i++) {
          const t = i / (state.mark.bins.length - 1);
          state.mark.bins[i] = t > 0.08 && t < 0.62;
        }
        state.mark.t = 0.62;
        state.mark.seen = true;
        state.dirty = true;
      }
      setCoach(-1);
      refreshHud();
    } else if (shot === 'fit') {
      state.mark = PF.perfectMark(lv);
      state.dirty = true;
      beginCut();
      state.clock = RESULT_AT;
      state.impacted = true;
      finishResult();
    }
  }

  setSoundGain();
  wire();
  enterMenu();
  resize();
  bootShot();
  requestAnimationFrame(loop);

  window.PFPLAY = {
    state: state,
    enterLevel: enterLevel,
    perfect: function () {
      state.mark = PF.perfectMark(level());
      state.dirty = true;
      refreshHud();
    },
    cut: beginCut,
    screen: function (x, y) {
      const rect = els.canvas.getBoundingClientRect();
      return {
        x: rect.left + view.ox + x * view.scale,
        y: rect.top + view.oy + y * view.scale
      };
    }
  };
})();

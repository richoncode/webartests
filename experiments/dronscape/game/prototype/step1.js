/* Countermeasure · Training exercises prototype (build countermeasure-step1b).
   Exercise 1 "Eyes Up": scouts + AoE-style 3-state fog. Exercises are data-driven (EXERCISES below).
   Fictional scenario on real terrain (San Martin foothills basemap, same AO as the Dronscape vignette). */
(function () {
  'use strict';
  var BUILD = 'countermeasure-step1b';

  // ---------- Area (same AO as vignette.html) ----------
  var AO = { south: 37.0740, north: 37.1000, west: -121.5600, east: -121.5240 };
  var LAUNCH_LL = { lat: 37.0788, lng: -121.5552 };
  var M_PER_DEG_LAT = 111320;
  var M_PER_DEG_LNG = 111320 * Math.cos(((AO.north + AO.south) / 2) * Math.PI / 180);
  var W = (AO.east - AO.west) * M_PER_DEG_LNG;   // ~3.2 km
  var H = (AO.north - AO.south) * M_PER_DEG_LAT; // ~2.9 km
  function toLL(x, y) { return L.latLng(AO.north - y / M_PER_DEG_LAT, AO.west + x / M_PER_DEG_LNG); }
  function fromLL(ll) { return { x: (ll.lng - AO.west) * M_PER_DEG_LNG, y: (AO.north - ll.lat) * M_PER_DEG_LAT }; }
  var LAUNCH = fromLL(LAUNCH_LL);

  // ---------- Training exercises (data-driven; only playable ones can start) ----------
  var EXERCISES = [
    { id: 1, name: 'Eyes Up', playable: true,
      briefing: 'Three scout drones, one launch pad, eight minutes. Hostile contacts are hidden on the ridge: fixed sites and two patrolling vehicles. Scout the area and find them all.',
      objectives: ['findAll', 'noLosses', 'inTime'],
      controls: ['<b>Click</b> a scout (or press 1, 2, 3) to select it. <b>Click</b> the map to set a new route; <b>Shift-click</b> adds waypoints.',
                 '<b>Ctrl+Z</b> or <b>Backspace</b> undoes a route change. <b>Delete</b> removes the last waypoint.',
                 '<b>⌂ Home</b> (on by default) ends each route with a flight back to the pad. <b>R</b> returns a scout now.',
                 '<b>Space</b> pauses; you can give orders while paused. 1×/2×/4× change speed.'],
      features: { scouts: 3, fog: true, linkRing: true, strike: false, jamming: false, rules: false, ground: false },
      contacts: { sitesMin: 4, sitesMax: 6, patrols: 2, nearFirst: { min: 500, max: 800 } },
      timer: 480 },
    { id: 2, name: 'Find and Strike', playable: false, step: 'Strike drones + a simple objective' },
    { id: 3, name: 'Lost Link', playable: false, step: 'Jamming + link loss + last-order fallback' },
    { id: 4, name: 'Standing Orders', playable: false, step: 'Role cards + if-then rules' },
    { id: 5, name: 'Ground Team', playable: false, step: 'Ground robots + relays' },
    { id: 6, name: 'Scale Up', playable: false, step: 'Scale + unlocks across chapters' }
  ];
  var OBJECTIVE_TEXT = { findAll: 'Find all hidden contacts', noLosses: 'Lose no scouts (empty battery = lost)', inTime: 'Finish before the timer runs out' };
  var qs = new URLSearchParams(location.search);
  var reqEx = parseInt(qs.get('ex'), 10) || 1;
  var EX = EXERCISES.filter(function (e) { return e.id === reqEx; })[0] || EXERCISES[0];
  var lockedRequest = !EX.playable ? EX : null;
  if (!EX.playable) EX = EXERCISES[0];

  // ---------- Tunables ----------
  var CFG = {
    cell: 20, sensor: 300, linkRange: 2200, speed: 18, battery: 360, chargeRate: 6,
    mission: EX.timer, padRadius: 40, patrolSpeed: 6, findPts: 100, bonusPerSec: 2, lostPenalty: 150, reserve: 15
  };
  var COLS = Math.ceil(W / CFG.cell), ROWS = Math.ceil(H / CFG.cell), NCELL = COLS * ROWS;
  var DRONES = [
    { id: 'A', name: 'Alpha', color: '#5b9bd5' },
    { id: 'B', name: 'Bravo', color: '#7eb8e0' },
    { id: 'C', name: 'Charlie', color: '#4caf50' }
  ].slice(0, EX.features.scouts);
  var SITE_TYPES = ['Mast', 'Cache', 'Launcher', 'Shelter', 'Relay hut', 'Depot'];
  var TELEMETRY_KEY = 'countermeasure.step1.telemetry.v1';

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var urlSeed = parseInt(qs.get('seed'), 10);

  // ---------- State ----------
  var S = null, MAP = null, CANVAS = document.getElementById('fx'), CTX = CANVAS.getContext('2d');
  var fogCanvas = document.createElement('canvas'); fogCanvas.width = COLS; fogCanvas.height = ROWS;
  var fogCtx = fogCanvas.getContext('2d'); var fogImg = fogCtx.createImageData(COLS, ROWS);
  var speedMul = 1;
  var homeDefault = true;

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function fmt(t) { t = Math.max(0, Math.ceil(t)); var m = Math.floor(t / 60), s = t % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function ago(t) { t = Math.floor(t); return t < 60 ? t + 's ago' : Math.floor(t / 60) + 'm' + (t % 60 < 10 ? '0' : '') + (t % 60) + 's ago'; }
  function inAO(p, m) { return p.x >= m && p.y >= m && p.x <= W - m && p.y <= H - m; }

  function newRun(seed) {
    seed = seed || (Math.floor(Math.random() * 1e9) + 1);
    var rnd = mulberry32(seed), C = EX.contacts;
    var drones = DRONES.map(function (d, i) {
      return { id: d.id, name: d.name, color: d.color, x: LAUNCH.x, y: LAUNCH.y, heading: -Math.PI / 2, slot: i,
        battery: CFG.battery, queue: [], state: 'pad', linked: true, returning: false, lost: false, finishHome: homeDefault };
    });
    var objs = [];
    function free(p) { return !objs.some(function (o) { return dist(o, p) < 350; }); }
    function spot(minD, maxD) {
      for (var k = 0; k < 800; k++) {
        var p = { x: 120 + rnd() * (W - 240), y: 120 + rnd() * (H - 240) }, d = dist(p, LAUNCH);
        if (d >= minD && d <= maxD && free(p)) return p;
      }
      return { x: LAUNCH.x + 900, y: LAUNCH.y - 900 };
    }
    function nearSpot(minD, maxD) { // random bearing, random distance; retry until inside the area
      for (var k = 0; k < 800; k++) {
        var a = rnd() * Math.PI * 2, d = minD + rnd() * (maxD - minD);
        var p = { x: LAUNCH.x + Math.cos(a) * d, y: LAUNCH.y + Math.sin(a) * d };
        if (inAO(p, 120)) return p;
      }
      return spot(minD, maxD);
    }
    var nSites = C.sitesMin + Math.floor(rnd() * (C.sitesMax - C.sitesMin + 1));
    for (var i = 0; i < nSites; i++) {
      var p = (i === 0 && C.nearFirst) ? nearSpot(C.nearFirst.min, C.nearFirst.max) : spot(650, CFG.linkRange + CFG.sensor * 0.7);
      objs.push({ id: 'S' + (i + 1), kind: 'site', type: SITE_TYPES[Math.floor(rnd() * SITE_TYPES.length)], x: p.x, y: p.y, near: i === 0 && !!C.nearFirst, found: false, foundAt: null, visible: false, lastSeen: null });
    }
    for (var j = 0; j < C.patrols; j++) {
      var c = spot(900, CFG.linkRange - 200), route = [];
      for (var r = 0; r < 4; r++) {
        var a = (r / 4) * Math.PI * 2 + rnd() * 0.8, rad = 250 + rnd() * 350;
        route.push({ x: Math.min(W - 60, Math.max(60, c.x + Math.cos(a) * rad)), y: Math.min(H - 60, Math.max(60, c.y + Math.sin(a) * rad)) });
      }
      objs.push({ id: 'P' + (j + 1), kind: 'patrol', type: 'Patrol vehicle', x: route[0].x, y: route[0].y, route: route, leg: 1, found: false, foundAt: null, visible: false, lastSeen: null });
    }
    S = {
      seed: seed, t: 0, running: false, paused: false, over: false, endReason: '',
      drones: drones, objs: objs, selected: [0], undo: [],
      explored: new Uint8Array(NCELL), vis: new Uint8Array(NCELL), exploredCount: 0, score: 0,
      tel: { build: BUILD, exerciseId: EX.id, exerciseName: EX.name, runId: Date.now().toString(36) + '-' + seed, seed: seed,
        startedAt: null, endedAt: null, wallSec: 0, gameSec: 0, orders: 0, ordersPerMin: 0, pauses: 0, pctExplored: 0,
        finds: [], timeToFirstFind: null, nearestContactM: Math.round(dist(objs[0], LAUNCH)), dronesLost: 0, score: 0, endReason: '',
        replayClicked: false, answers: { fun: null, greyHelped: null, wantedToDo: '' }, objects: objs.length, speedChanges: 0,
        undoCount: 0, routeReplacedCount: 0, removeLastCount: 0, finishHomeDefault: homeDefault, finishHomeToggles: 0,
        finishHomeOrders: 0, finishHomeLegsFlown: 0, batteryWarnings: 0 }
    };
    updateVisibility();
    renderStatic();
    syncUI(true);
  }

  // ---------- Telemetry ----------
  function loadTel() { try { return JSON.parse(localStorage.getItem(TELEMETRY_KEY)) || { runs: [], replayClicks: 0 }; } catch (e) { return { runs: [], replayClicks: 0 }; } }
  function storeTel(all) { try { localStorage.setItem(TELEMETRY_KEY, JSON.stringify(all)); } catch (e) { /* storage blocked */ } }
  function saveRun() {
    var all = loadTel(), i = all.runs.findIndex(function (r) { return r.runId === S.tel.runId; });
    if (i >= 0) all.runs[i] = S.tel; else all.runs.push(S.tel);
    storeTel(all); telInfo();
  }
  function telInfo() { var a = loadTel(); document.getElementById('telemetryInfo').textContent = a.runs.length + ' run(s) stored locally · ' + (a.replayClicks || 0) + ' replay click(s)'; }
  function exportTel() {
    if (S && S.running && !S.over) { snapshotTel(); saveRun(); }
    var a = loadTel(); a.exportedAt = new Date().toISOString(); a.build = BUILD;
    var blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' });
    var link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = 'countermeasure-ex' + EX.id + '-telemetry-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    document.body.appendChild(link); link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 500);
  }
  function snapshotTel() {
    var T = S.tel; T.gameSec = Math.round(S.t * 10) / 10;
    T.ordersPerMin = S.t > 0 ? Math.round(T.orders / (S.t / 60) * 10) / 10 : 0;
    T.pctExplored = Math.round(S.exploredCount / NCELL * 1000) / 10;
    T.score = S.score; T.wallSec = T.startedAt ? Math.round((Date.now() - Date.parse(T.startedAt)) / 100) / 10 : 0;
  }

  // ---------- Toast ----------
  var toastEl = document.getElementById('toast'), toastMsg = document.getElementById('toastMsg');
  function toast(msg, opts) {
    opts = opts || {};
    toastMsg.textContent = msg; toastEl.classList.toggle('undo', !!opts.undo); toastEl.classList.toggle('warnt', !!opts.warn);
    toastEl.classList.add('show'); clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show', 'undo'); }, opts.undo ? 4000 : 2000);
  }

  // ---------- Routes, undo, battery ----------
  function routeLen(d) { // remaining route + flight home from its end
    var p = { x: d.x, y: d.y }, len = 0;
    d.queue.forEach(function (q) { len += dist(p, q); p = q; });
    return len + dist(p, LAUNCH);
  }
  function batteryNeed(d) { return routeLen(d) / CFG.speed + CFG.reserve; }
  function snap(idxs) { return idxs.map(function (i) { var d = S.drones[i]; return { i: i, queue: d.queue.map(function (q) { return { x: q.x, y: q.y }; }), returning: d.returning, state: d.state }; }); }
  function pushUndo(idxs, label) { S.undo.push({ label: label, t: S.t, drones: snap(idxs) }); if (S.undo.length > 50) S.undo.shift(); }
  function canOrder(d, quiet) {
    if (d.lost) return false;
    if (!d.linked) { if (!quiet) toast(d.name + ': no link. It keeps its last order.', { warn: true }); return false; }
    return true;
  }
  function checkBattery(d) {
    if (d.state !== 'pad' && d.battery < batteryNeed(d)) { S.tel.batteryWarnings++; toast(d.name + ': not enough battery for this route and the flight home (' + fmt(batteryNeed(d)) + ' needed, ' + fmt(d.battery) + ' left).', { warn: true }); }
  }
  // Orders for one or more scouts. queue=true appends; otherwise replaces (undoable).
  function orderGroup(idxs, pt, queue) {
    if (S.over) return 0;
    idxs = idxs.filter(function (i) { return S.drones[i] && canOrder(S.drones[i]); });
    if (!idxs.length) return 0;
    var replaced = idxs.filter(function (i) { return !queue && S.drones[i].queue.length > 0 && !S.drones[i].returning; });
    pushUndo(idxs, queue ? 'add waypoint' : 'new route');
    idxs.forEach(function (i, k) {
      var d = S.drones[i];
      var off = idxs.length > 1 ? (k - (idxs.length - 1) / 2) * 60 : 0;
      var p = { x: Math.min(W, Math.max(0, pt.x + off)), y: Math.min(H, Math.max(0, pt.y)) };
      if (queue && !d.returning) d.queue.push(p); else d.queue = [p];
      d.returning = false; if (d.state === 'pad' || d.state === 'idle') d.state = 'moving';
      S.tel.orders++; if (d.finishHome) S.tel.finishHomeOrders++;
    });
    if (replaced.length) {
      S.tel.routeReplacedCount++;
      toast('Route replaced for ' + replaced.map(function (i) { return S.drones[i].name; }).join(', ') + '.', { undo: true });
    } else idxs.forEach(function (i) { checkBattery(S.drones[i]); });
    return idxs.length;
  }
  function order(idx, pt, queue) { return orderGroup([idx], pt, queue) > 0; }
  function returnHome(idx) {
    var d = S.drones[idx]; if (!d || S.over || !canOrder(d) || d.state === 'pad') return false;
    pushUndo([idx], 'return');
    d.queue = [{ x: LAUNCH.x, y: LAUNCH.y }]; d.returning = true; d.state = 'moving'; S.tel.orders++; return true;
  }
  function removeLast(idxs) {
    var n = 0, list = idxs.filter(function (i) { var d = S.drones[i]; return d && !d.returning && d.queue.length && canOrder(d); });
    if (!list.length) { toast('No waypoint to remove.'); return 0; }
    pushUndo(list, 'remove waypoint');
    list.forEach(function (i) { var d = S.drones[i]; d.queue.pop(); n++; if (!d.queue.length && d.state === 'moving') d.state = 'idle'; });
    S.tel.removeLastCount++; S.tel.orders++;
    return n;
  }
  function undo() {
    if (!S || S.over) return false;
    var e = S.undo.pop(); if (!e) { toast('Nothing to undo.'); return false; }
    var restored = [];
    e.drones.forEach(function (s) {
      var d = S.drones[s.i]; if (!canOrder(d, true)) return;
      d.queue = s.queue; d.returning = s.returning;
      if (d.state !== 'pad') d.state = d.queue.length ? 'moving' : 'idle';
      else if (d.queue.length) d.state = 'moving';
      restored.push(d.name);
    });
    S.tel.undoCount++;
    toastEl.classList.remove('show', 'undo');
    toast(restored.length ? 'Undid ' + e.label + ' (' + restored.join(', ') + ').' : 'Could not undo: no link.');
    syncUI(true); return restored.length > 0;
  }
  function setFinishHome(idx, on) {
    var d = S.drones[idx]; if (!d || d.lost) return;
    if (d.finishHome !== on) { d.finishHome = on; S.tel.finishHomeToggles++; }
    syncUI(true);
  }
  function select(list) { S.selected = list.filter(function (i) { return S.drones[i] && !S.drones[i].lost; }); syncUI(true); }

  // ---------- Simulation ----------
  function step(dt) {
    S.t += dt;
    S.drones.forEach(function (d) {
      if (d.lost) return;
      d.linked = dist(d, LAUNCH) <= CFG.linkRange;
      if (d.state === 'pad') { d.battery = Math.min(CFG.battery, d.battery + CFG.chargeRate * dt); if (!d.queue.length) return; }
      d.battery -= dt;
      if (d.battery <= 0) {
        d.battery = 0; d.lost = true; d.state = 'lost'; d.queue = []; S.tel.dronesLost++;
        toast(d.name + ' ran out of battery and was lost.', { warn: true });
        S.selected = S.selected.filter(function (i) { return S.drones[i] !== d; }); return;
      }
      if (d.queue.length) {
        var tgt = d.queue[0], dx = tgt.x - d.x, dy = tgt.y - d.y, dd = Math.sqrt(dx * dx + dy * dy), mv = CFG.speed * dt;
        d.state = 'moving'; if (dd > 0.01) d.heading = Math.atan2(dy, dx);
        if (dd <= mv) { d.x = tgt.x; d.y = tgt.y; d.queue.shift(); } else { d.x += dx / dd * mv; d.y += dy / dd * mv; }
      }
      if (!d.queue.length) {
        var atPad = dist(d, LAUNCH) <= CFG.padRadius;
        if (atPad && (d.returning || d.state !== 'pad')) { d.state = 'pad'; d.returning = false; d.x = LAUNCH.x; d.y = LAUNCH.y; }
        else if (!atPad && d.finishHome && !d.returning) {
          d.queue = [{ x: LAUNCH.x, y: LAUNCH.y }]; d.returning = true; d.state = 'moving'; S.tel.finishHomeLegsFlown++;
        } else if (!atPad && !d.linked && !d.returning) {
          d.queue = [{ x: LAUNCH.x, y: LAUNCH.y }]; d.returning = true; d.state = 'moving'; // lost-link default: last order done, fly home
        } else if (!atPad && !d.returning) d.state = 'idle';
      }
    });
    S.objs.forEach(function (o) {
      if (o.kind !== 'patrol') return;
      var tgt = o.route[o.leg], dx = tgt.x - o.x, dy = tgt.y - o.y, dd = Math.sqrt(dx * dx + dy * dy), mv = CFG.patrolSpeed * dt;
      if (dd <= mv) { o.x = tgt.x; o.y = tgt.y; o.leg = (o.leg + 1) % o.route.length; } else { o.x += dx / dd * mv; o.y += dy / dd * mv; }
    });
    updateVisibility();
    if (S.t >= CFG.mission) endRun('Time is up');
    else if (S.objs.every(function (o) { return o.found; })) endRun('All contacts found');
    else if (S.drones.every(function (d) { return d.lost; })) endRun('All scouts lost');
  }

  function cellIdx(x, y) { var c = Math.floor(x / CFG.cell), r = Math.floor(y / CFG.cell); if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1; return r * COLS + c; }
  function updateVisibility() {
    var vis = S.vis, ex = S.explored; vis.fill(0);
    var rc = Math.ceil(CFG.sensor / CFG.cell), r2 = CFG.sensor * CFG.sensor;
    S.drones.forEach(function (d) {
      if (d.lost || !d.linked) return; // a scout without link stops revealing
      var c0 = Math.floor(d.x / CFG.cell), r0 = Math.floor(d.y / CFG.cell);
      for (var r = r0 - rc; r <= r0 + rc; r++) {
        if (r < 0 || r >= ROWS) continue;
        var cy = (r + 0.5) * CFG.cell - d.y;
        for (var c = c0 - rc; c <= c0 + rc; c++) {
          if (c < 0 || c >= COLS) continue;
          var cx = (c + 0.5) * CFG.cell - d.x;
          if (cx * cx + cy * cy <= r2) { var k = r * COLS + c; vis[k] = 1; if (!ex[k]) { ex[k] = 1; S.exploredCount++; } }
        }
      }
    });
    S.objs.forEach(function (o) {
      var k = cellIdx(o.x, o.y); o.visible = k >= 0 && vis[k] === 1;
      if (o.visible) {
        o.lastSeen = { x: o.x, y: o.y, t: S.t };
        if (!o.found && S.running) {
          o.found = true; o.foundAt = S.t; S.score += CFG.findPts;
          S.tel.finds.push({ id: o.id, type: o.type, kind: o.kind, near: !!o.near, t: Math.round(S.t * 10) / 10 });
          if (S.tel.timeToFirstFind === null) S.tel.timeToFirstFind = Math.round(S.t * 10) / 10;
          toast('Contact found: ' + o.type + ' (+' + CFG.findPts + ')');
        }
      }
    });
    var px = fogImg.data;
    for (var i = 0; i < NCELL; i++) {
      var o4 = i * 4;
      if (vis[i]) px[o4 + 3] = 0;
      else if (ex[i]) { px[o4] = 12; px[o4 + 1] = 14; px[o4 + 2] = 18; px[o4 + 3] = 150; }
      else { px[o4] = 4; px[o4 + 1] = 4; px[o4 + 2] = 6; px[o4 + 3] = 248; }
    }
    fogCtx.putImageData(fogImg, 0, 0);
  }

  function endRun(reason) {
    if (S.over) return;
    S.over = true; S.running = false; S.endReason = reason;
    var found = S.objs.filter(function (o) { return o.found; }).length, allFound = found === S.objs.length;
    var bonus = allFound ? Math.round(Math.max(0, CFG.mission - S.t) * CFG.bonusPerSec) : 0;
    var findPts = found * CFG.findPts, pen = S.tel.dronesLost * CFG.lostPenalty;
    S.score = findPts + bonus - pen;
    snapshotTel(); S.tel.endedAt = new Date().toISOString(); S.tel.endReason = reason;
    S.tel.breakdown = { findPts: findPts, timeBonus: bonus, lostPenalty: -pen };
    S.tel.objectivesMet = { findAll: allFound, noLosses: S.tel.dronesLost === 0, inTime: allFound && S.t < CFG.mission };
    saveRun();
    document.getElementById('endReason').textContent = 'Exercise ' + EX.id + ' · ' + reason;
    document.getElementById('endScore').textContent = S.score;
    document.getElementById('scoreTable').innerHTML =
      '<tr><td>Contacts found (' + found + ' of ' + S.objs.length + ' × ' + CFG.findPts + ')</td><td>+' + findPts + '</td></tr>' +
      '<tr><td>Time bonus' + (allFound ? ' (' + fmt(CFG.mission - S.t) + ' left × ' + CFG.bonusPerSec + ')' : ' (only if all found)') + '</td><td>+' + bonus + '</td></tr>' +
      '<tr><td>Scouts lost to empty battery (' + S.tel.dronesLost + ' × ' + CFG.lostPenalty + ')</td><td>−' + pen + '</td></tr>' +
      '<tr class="tot"><td>Total</td><td>' + S.score + '</td></tr>' +
      '<tr><td>Run length · orders/min · explored · pauses · undos</td><td>' + fmt(S.t) + ' · ' + S.tel.ordersPerMin + ' · ' + S.tel.pctExplored + '% · ' + S.tel.pauses + ' · ' + S.tel.undoCount + '</td></tr>';
    document.getElementById('findList').textContent = S.tel.finds.length
      ? 'Finds: ' + S.tel.finds.map(function (f) { return f.type + ' at ' + fmt(f.t); }).join(' · ')
      : 'No contacts found this run.';
    document.querySelectorAll('.rate button').forEach(function (b) { b.classList.remove('active'); });
    document.getElementById('q3').value = '';
    document.getElementById('endOv').classList.remove('hidden');
    syncUI(true);
  }

  // ---------- Rendering ----------
  function resize() {
    var wrap = document.getElementById('mapwrap'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    CANVAS.width = Math.round(wrap.clientWidth * dpr); CANVAS.height = Math.round(wrap.clientHeight * dpr);
    CTX.setTransform(dpr, 0, 0, dpr, 0, 0); if (MAP) MAP.invalidateSize();
  }
  function P(x, y) { return MAP.latLngToContainerPoint(toLL(x, y)); }
  function mToPx(m) { var a = P(0, 0), b = P(m, 0); return b.x - a.x; }
  // Where a scout is drawn (scouts on the pad sit in fixed parking slots above it, clear of the label).
  var PAD_SLOTS = [{ x: -18, y: -20 }, { x: 0, y: -26 }, { x: 18, y: -20 }];
  function screenPos(d) {
    var p = P(d.x, d.y);
    if (d.state === 'pad') { var lp = P(LAUNCH.x, LAUNCH.y), s = PAD_SLOTS[d.slot % 3]; return { x: lp.x + s.x, y: lp.y + s.y }; }
    return { x: p.x, y: p.y };
  }
  function draw() {
    var w = CANVAS.clientWidth, h = CANVAS.clientHeight; CTX.clearRect(0, 0, w, h);
    if (!S) return;
    var tl = P(0, 0), br = P(W, H);
    CTX.fillStyle = 'rgba(0,0,0,0.82)'; CTX.beginPath(); CTX.rect(0, 0, w, h); CTX.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y); CTX.fill('evenodd');
    CTX.imageSmoothingEnabled = true; CTX.drawImage(fogCanvas, tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    CTX.strokeStyle = 'rgba(91,155,213,0.35)'; CTX.lineWidth = 1; CTX.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    var lp = P(LAUNCH.x, LAUNCH.y);
    if (EX.features.linkRing) {
      CTX.save(); CTX.beginPath(); CTX.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y); CTX.clip();
      CTX.setLineDash([8, 6]); CTX.strokeStyle = 'rgba(240,160,64,0.75)'; CTX.lineWidth = 1.5;
      CTX.beginPath(); CTX.arc(lp.x, lp.y, mToPx(CFG.linkRange), 0, Math.PI * 2); CTX.stroke(); CTX.setLineDash([]); CTX.restore();
      var rl = P(LAUNCH.x + CFG.linkRange * 0.62, LAUNCH.y - CFG.linkRange * 0.785); label('link range', rl.x + 6, rl.y, 'rgba(240,160,64,0.9)');
    }
    CTX.fillStyle = 'rgba(91,155,213,0.25)'; CTX.strokeStyle = '#5b9bd5'; CTX.lineWidth = 1.5;
    var padPx = Math.max(8, mToPx(CFG.padRadius));
    CTX.beginPath(); CTX.arc(lp.x, lp.y, padPx, 0, Math.PI * 2); CTX.fill(); CTX.stroke();
    var onPad = S.drones.filter(function (d) { return d.state === 'pad'; }).length;
    CTX.textAlign = 'center'; label('LAUNCH' + (onPad ? ' · ' + onPad + ' on pad' : ''), lp.x, lp.y + padPx + 14, '#9cc3e6'); CTX.textAlign = 'left';
    S.objs.forEach(function (o) {
      if (o.visible) { var q0 = P(o.x, o.y); drawObj(o.x, o.y, o.kind, 1, true); label(o.type, q0.x + 10, q0.y - 8, '#ff8a80'); }
      else if (o.kind === 'site' && o.found) drawObj(o.x, o.y, 'site', 0.55, false);
      else if (o.kind === 'patrol' && o.lastSeen) {
        var age = S.t - o.lastSeen.t, a = Math.max(0.2, 0.75 - age / 240);
        drawObj(o.lastSeen.x, o.lastSeen.y, 'ghost', a, false);
        var q = P(o.lastSeen.x, o.lastSeen.y); label('last seen ' + ago(age), q.x + 10, q.y - 8, 'rgba(255,170,160,' + a + ')');
      }
    });
    S.drones.forEach(function (d, i) {
      if (d.lost) return;
      var p = screenPos(d), sel = S.selected.indexOf(i) >= 0;
      if (sel) {
        if (d.state !== 'pad') { CTX.strokeStyle = d.linked ? 'rgba(255,255,255,0.18)' : 'rgba(231,76,60,0.35)'; CTX.lineWidth = 1; CTX.beginPath(); CTX.arc(p.x, p.y, mToPx(CFG.sensor), 0, Math.PI * 2); CTX.stroke(); }
        var last = p;
        if (d.queue.length) {
          CTX.setLineDash(d.returning ? [2, 5] : [5, 5]); CTX.strokeStyle = d.color; CTX.lineWidth = 1.5; CTX.beginPath(); CTX.moveTo(p.x, p.y);
          d.queue.forEach(function (q) { var qp = P(q.x, q.y); CTX.lineTo(qp.x, qp.y); last = qp; }); CTX.stroke(); CTX.setLineDash([]);
          if (!d.returning) d.queue.forEach(function (q, k) { var qp = P(q.x, q.y); CTX.fillStyle = d.color; CTX.beginPath(); CTX.arc(qp.x, qp.y, 3.5, 0, Math.PI * 2); CTX.fill(); if (d.queue.length > 1) label(String(k + 1), qp.x + 5, qp.y - 5, d.color); });
          if (d.finishHome && !d.returning) { // dashed final leg home
            CTX.setLineDash([2, 6]); CTX.strokeStyle = 'rgba(156,195,230,0.7)'; CTX.lineWidth = 1.5;
            CTX.beginPath(); CTX.moveTo(last.x, last.y); CTX.lineTo(lp.x, lp.y); CTX.stroke(); CTX.setLineDash([]);
            label('⌂', (last.x + lp.x) / 2 + 4, (last.y + lp.y) / 2 - 4, 'rgba(156,195,230,0.9)');
          }
        }
      }
      CTX.save(); CTX.translate(p.x, p.y); CTX.rotate(d.state === 'pad' ? 0 : d.heading + Math.PI / 2);
      var sc = d.state === 'pad' ? 0.75 : 1; CTX.scale(sc, sc);
      CTX.fillStyle = d.linked ? d.color : '#777'; CTX.strokeStyle = sel ? '#fff' : 'rgba(0,0,0,0.7)'; CTX.lineWidth = sel ? 2 : 1;
      CTX.beginPath(); CTX.moveTo(0, -10); CTX.lineTo(7, 8); CTX.lineTo(0, 4); CTX.lineTo(-7, 8); CTX.closePath(); CTX.fill(); CTX.stroke();
      CTX.restore();
      if (d.state !== 'pad' && (sel || dist(d, LAUNCH) > 150)) label(d.name + (d.linked ? '' : ' · NO LINK'), p.x + 11, p.y + 4, d.linked ? '#e6eef6' : '#ff8a80');
    });
  }
  function drawObj(x, y, kind, alpha, live) {
    var p = P(x, y); CTX.save(); CTX.globalAlpha = alpha; CTX.translate(p.x, p.y);
    if (kind === 'patrol' || kind === 'ghost') {
      CTX.strokeStyle = '#e74c3c'; CTX.lineWidth = 2; CTX.fillStyle = '#e74c3c';
      CTX.beginPath(); CTX.rect(-7, -5, 14, 10); if (kind !== 'ghost') CTX.fill(); CTX.stroke();
      if (kind === 'ghost') { CTX.setLineDash([3, 3]); CTX.beginPath(); CTX.arc(0, 0, 13, 0, Math.PI * 2); CTX.stroke(); }
    } else {
      CTX.fillStyle = live ? '#e74c3c' : '#8a3a33'; CTX.strokeStyle = '#000'; CTX.lineWidth = 1;
      CTX.beginPath(); CTX.moveTo(0, -8); CTX.lineTo(8, 0); CTX.lineTo(0, 8); CTX.lineTo(-8, 0); CTX.closePath(); CTX.fill(); CTX.stroke();
    }
    CTX.restore();
  }
  function label(t, x, y, col) {
    CTX.font = '600 11px -apple-system, Segoe UI, sans-serif'; CTX.lineWidth = 3; CTX.strokeStyle = 'rgba(0,0,0,0.75)';
    CTX.strokeText(t, x, y); CTX.fillStyle = col; CTX.fillText(t, x, y);
  }

  // ---------- UI ----------
  function exListHTML() {
    return EXERCISES.map(function (e) {
      var on = e.id === EX.id;
      return '<li class="' + (on ? 'on' : '') + '"><span class="n">' + e.id + '</span>' + e.name +
        '<span class="st">' + (e.playable ? (on ? '▶ current' : 'open') : '🔒 locked') + '</span></li>';
    }).join('');
  }
  function renderStatic() {
    var title = 'Training Exercise ' + EX.id + ': ' + EX.name;
    document.title = 'Countermeasure · ' + title;
    document.getElementById('exTitle').textContent = title;
    document.getElementById('brTag').textContent = lockedRequest
      ? 'Exercise ' + lockedRequest.id + ' (' + lockedRequest.name + ') is locked. Starting Exercise 1.'
      : 'Training Exercise ' + EX.id + ' of ' + EXERCISES.length;
    document.getElementById('brTitle').textContent = EX.name;
    document.getElementById('brText').textContent = EX.briefing;
    var objHTML = EX.objectives.map(function (k) { return '<li>' + OBJECTIVE_TEXT[k] + (k === 'findAll' ? ' (' + S.objs.length + ')' : k === 'inTime' ? ' (' + fmt(CFG.mission) + ')' : '') + '</li>'; }).join('');
    document.getElementById('brObj').innerHTML = objHTML;
    document.getElementById('brCtl').innerHTML = EX.controls.map(function (c) { return '<li>' + c + '</li>'; }).join('');
    document.getElementById('ctlList').innerHTML = EX.controls.map(function (c) { return '<li>' + c + '</li>'; }).join('');
    document.getElementById('objLbl').textContent = 'Exercise ' + EX.id + ' · objectives';
    document.getElementById('brEx').innerHTML = exListHTML();
    document.getElementById('exList').innerHTML = exListHTML();
    document.getElementById('replayBtn').textContent = 'Retry Exercise ' + EX.id + ' (new layout)';
  }
  var lastUI = 0;
  function syncUI(force) {
    var now = performance.now(); if (!force && now - lastUI < 200) return; lastUI = now;
    var found = S.objs.filter(function (o) { return o.found; }).length, n = S.objs.length;
    document.getElementById('hudTime').textContent = fmt(CFG.mission - S.t);
    document.getElementById('hudScore').textContent = S.over ? S.score : found * CFG.findPts;
    document.getElementById('hudFound').textContent = found + '/' + n;
    document.getElementById('hudExplored').textContent = (S.exploredCount / NCELL * 100).toFixed(0) + '%';
    var hp = document.getElementById('hudPause'); hp.textContent = S.over ? '■ Over' : (!S.running ? '■ Ready' : (S.paused ? '❚❚ Paused' : '▶ ' + speedMul + '×')); hp.classList.toggle('paused', S.paused);
    document.getElementById('pauseBtn').textContent = S.paused ? 'Resume' : 'Pause';
    var lost = S.tel.dronesLost;
    var objs = [
      ['findAll', OBJECTIVE_TEXT.findAll, found + '/' + n, found === n ? 'done' : ''],
      ['noLosses', 'Lose no scouts', lost + ' lost', lost ? 'failed' : (S.over ? 'done' : '')],
      ['inTime', 'Before the timer runs out', fmt(CFG.mission - S.t) + ' left', S.over ? (found === n ? 'done' : 'failed') : '']
    ].filter(function (o) { return EX.objectives.indexOf(o[0]) >= 0; });
    var oh = objs.map(function (o) { return '<li class="' + o[3] + '">' + o[1] + '<span class="v">' + o[2] + '</span></li>'; }).join('');
    var ol = document.getElementById('objList'); if (ol._h !== oh) { ol.innerHTML = oh; ol._h = oh; }
    var html = S.drones.map(function (d, i) {
      var pct = d.battery / CFG.battery * 100, need = batteryNeed(d);
      var bcls = d.state !== 'pad' && d.battery < need ? 'crit' : (pct < 35 ? 'low' : '');
      var st = d.lost ? 'Lost (battery empty)' : d.state === 'pad' ? (d.battery >= CFG.battery ? 'On pad · ready' : 'On pad · charging') :
        d.returning ? 'Returning' : d.state === 'moving' ? 'Moving' + (d.queue.length > 1 ? ' · ' + d.queue.length + ' waypoints' : '') : 'Holding';
      var lk = d.lost ? '' : d.state === 'pad' ? '<span class="lk pad">PAD</span>' : d.linked ? '<span class="lk ok">LINK</span>' : '<span class="lk bad">NO LINK</span>';
      var needTxt = d.lost || d.state === 'pad' ? '' : ' · needs ' + fmt(need);
      return '<div class="drone' + (S.selected.indexOf(i) >= 0 ? ' sel' : '') + (d.lost ? ' lost' : '') + '" data-i="' + i + '"><span class="sw" style="background:' + d.color + '"></span>' +
        '<div><div class="nm">' + (i + 1) + ' · ' + d.name + '</div><div class="st">' + st + ' · ' + fmt(d.battery) + needTxt + '</div></div>' +
        '<button class="hm' + (d.finishHome ? ' on' : '') + '" data-home="' + i + '" title="Finish route at home (H)">⌂ Home ' + (d.finishHome ? 'on' : 'off') + '</button>' + lk +
        '<div class="bat"><i class="' + bcls + '" style="width:' + pct.toFixed(1) + '%"></i></div></div>';
    }).join('');
    var box = document.getElementById('drones'); if (box._h !== html) { box.innerHTML = html; box._h = html; }
    document.getElementById('undoBtn').disabled = !S.undo.length || S.over;
  }

  function setPaused(p) { if (!S.running || S.over) return; if (p && !S.paused) S.tel.pauses++; S.paused = p; syncUI(true); }
  function setSpeed(m) { speedMul = m; if (S) S.tel.speedChanges++; document.querySelectorAll('[data-speed]').forEach(function (b) { b.classList.toggle('active', +b.dataset.speed === m); }); if (S) syncUI(true); }
  function start() {
    document.getElementById('startOv').classList.add('hidden');
    S.running = true; S.paused = false; S.tel.startedAt = new Date().toISOString();
    updateVisibility(); saveRun(); syncUI(true);
  }
  function replay() {
    S.tel.replayClicked = true; saveRun();
    var all = loadTel(); all.replayClicks = (all.replayClicks || 0) + 1; storeTel(all);
    document.getElementById('endOv').classList.add('hidden');
    newRun(); start(); telInfo();
  }

  function bind() {
    MAP.on('click', function (e) {
      if (!S || S.over) return;
      var cp = e.containerPoint, best = -1, bd = 16;
      S.drones.forEach(function (d, i) { if (d.lost) return; var p = screenPos(d), dd = Math.hypot(p.x - cp.x, p.y - cp.y); if (dd < bd) { bd = dd; best = i; } });
      var shift = e.originalEvent && e.originalEvent.shiftKey;
      if (best >= 0) { select(shift ? S.selected.concat([best]) : [best]); return; }
      if (!S.running) return;
      if (!S.selected.length) { toast('Select a scout first (click it, or press 1, 2, 3).'); return; }
      orderGroup(S.selected.slice(), fromLL(e.latlng), shift);
      syncUI(true);
    });
    document.getElementById('drones').addEventListener('click', function (e) {
      var hb = e.target.closest('[data-home]');
      if (hb) { var i = +hb.dataset.home; setFinishHome(i, !S.drones[i].finishHome); return; }
      var el = e.target.closest('.drone'); if (el) select([+el.dataset.i]);
    });
    document.getElementById('retBtn').addEventListener('click', function () { if (S.running) S.selected.forEach(returnHome); syncUI(true); });
    document.getElementById('allBtn').addEventListener('click', function () { select(S.drones.map(function (d, i) { return i; })); });
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('toastUndo').addEventListener('click', undo);
    document.getElementById('popBtn').addEventListener('click', function () { if (S.running) removeLast(S.selected); syncUI(true); });
    document.getElementById('homeDefault').addEventListener('change', function (e) {
      homeDefault = e.target.checked; S.tel.finishHomeDefault = homeDefault;
      S.drones.forEach(function (d, i) { setFinishHome(i, homeDefault); });
    });
    document.getElementById('pauseBtn').addEventListener('click', function () { setPaused(!S.paused); });
    document.querySelectorAll('[data-speed]').forEach(function (b) { b.addEventListener('click', function () { setSpeed(+b.dataset.speed); }); });
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('replayBtn').addEventListener('click', replay);
    document.getElementById('exportBtn').addEventListener('click', exportTel);
    document.getElementById('exportBtn2').addEventListener('click', exportTel);
    document.querySelectorAll('.rate').forEach(function (box) {
      for (var v = 1; v <= 5; v++) { var b = document.createElement('button'); b.textContent = v; b.dataset.v = v; box.appendChild(b); }
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); });
        S.tel.answers[box.dataset.q] = +b.dataset.v; saveRun();
      });
    });
    document.getElementById('q3').addEventListener('input', function (e) { S.tel.answers.wantedToDo = e.target.value; saveRun(); });
    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      var briefing = !document.getElementById('startOv').classList.contains('hidden');
      if (e.code === 'Space') { e.preventDefault(); if (briefing) start(); else setPaused(!S.paused); return; }
      if (briefing || S.over) return;
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
      else if (e.key === 'Backspace') { e.preventDefault(); undo(); }
      else if (e.key === 'Delete') { removeLast(S.selected); syncUI(true); }
      else if (e.key >= '1' && e.key <= String(S.drones.length)) select([+e.key - 1]);
      else if (e.key === 'a' || e.key === 'A') select(S.drones.map(function (d, i) { return i; }));
      else if (e.key === 'r' || e.key === 'R') { S.selected.forEach(returnHome); syncUI(true); }
      else if (e.key === 'h' || e.key === 'H') S.selected.forEach(function (i) { setFinishHome(i, !S.drones[i].finishHome); });
      else if (e.key === 'Escape') select([]);
    });
    window.addEventListener('resize', resize);
  }

  // ---------- Loop ----------
  var lastT = performance.now();
  function frame(now) {
    var real = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (S && S.running && !S.paused && !S.over) {
      var dt = real * speedMul, sub = Math.ceil(dt / 0.05);
      for (var i = 0; i < sub && !S.over; i++) step(dt / sub);
      syncUI(false);
    }
    draw();
    requestAnimationFrame(frame);
  }

  function init() {
    MAP = L.map('leafletMap', { zoomControl: false, attributionControl: true, doubleClickZoom: false, minZoom: 13, maxZoom: 17,
      maxBounds: [[AO.south - 0.012, AO.west - 0.018], [AO.north + 0.012, AO.east + 0.018]], maxBoundsViscosity: 0.7 });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18, attribution: 'Tiles © Esri — Esri, Maxar, Earthstar Geographics, and the GIS User Community' }).addTo(MAP);
    L.control.zoom({ position: 'topright' }).addTo(MAP);
    MAP.fitBounds([[AO.south, AO.west], [AO.north, AO.east]], { padding: [12, 12], animate: false });
    resize(); bind(); newRun(urlSeed > 0 ? urlSeed : undefined); telInfo();
    requestAnimationFrame(frame);
  }
  init();

  // Test/automation hook (used by the headless playtest script; harmless for players).
  window.CM = {
    get state() { return S; }, CFG: CFG, W: W, H: H, LAUNCH: LAUNCH, COLS: COLS, ROWS: ROWS, EXERCISES: EXERCISES, EX: EX, BUILD: BUILD,
    start: start, replay: replay, order: order, orderGroup: orderGroup, returnHome: returnHome, removeLast: removeLast, undo: undo,
    setFinishHome: setFinishHome, select: select, setPaused: setPaused, setSpeed: setSpeed, batteryNeed: function (i) { return batteryNeed(S.drones[i]); },
    advance: function (sec) { var n = Math.ceil(sec / 0.05); for (var i = 0; i < n && !S.over; i++) step(sec / n); syncUI(true); },
    cellState: function (x, y) { var k = cellIdx(x, y); return k < 0 ? -1 : (S.vis[k] ? 2 : S.explored[k] ? 1 : 0); },
    toScreen: function (x, y) { var p = P(x, y); return { x: p.x, y: p.y }; },
    droneScreen: function (i) { return screenPos(S.drones[i]); },
    loadTel: loadTel
  };
})();

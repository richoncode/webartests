/* Roadster Run physics.
   Reuses the Roadster Stunt Sim (explainers/roadster-sim):
   - Isp = 20000 / (g * 37)  → ~55.1 s, ṁ = F / (g·Isp) = 37 kg/s at 20 kN
   - tank sized so full thrust lasts 6 s (the explainer's ~6.75 s at 250 kg, shortened)
   - fixed substeps (the explainer's step loop; here locked at 120 Hz)
   - barrel roll is a scripted 0.7 s / 360° stand-in for the hover tab's
     h.w += torque, with the same forgiving "land upright" rule
*/
(function (global) {
  'use strict';

  var G_REAL = 9.81;
  var ISP = 20000 / (G_REAL * 37);
  var MDOT_20KN = 20000 / (G_REAL * ISP);
  var G = 22;
  var THRUST_MUL = 1.4;
  var TANK = 6;
  var TANK_KG = MDOT_20KN * TANK;
  var ROW = 4;
  var LANE_W = 3.2;
  var DECK_H = 1.85;
  var STEP = 1 / 120;
  var ROLL_TIME = 0.7;
  var ROLL_FUEL = 0.5;
  var HEAT_FULL = 1.05;
  var CUTOUT = 1.5;
  var COOL_GROUND = 2.0;
  var COOL_AIR = 4.8;
  var CLIMB_DAMP = 1.65;
  var LANE_TIME_GROUND = 0.15;
  var LANE_TIME_AIR = 0.25;
  var LIP = 0.3;
  var BURST = 0.6;
  var BLOCK_H = 1.5;

  function laneCenter(lane) { return (lane - 1) * LANE_W; }

  function laneFromX(x) {
    var l = Math.round(x / LANE_W + 1);
    if (l < 0) return 0;
    if (l > 2) return 2;
    return l;
  }

  function isRamp(ch) { return ch === '/' || ch === 'L' || ch === 'R' || ch === '^'; }
  function isBlock(ch) { return ch === '#'; }
  function isFloor(ch) {
    return ch === '=' || ch === '/' || ch === 'L' || ch === 'R' || ch === '^' || ch === 'o' || ch === 'v';
  }

  function moverLane(row, t) {
    var span = row.mover.lanes;
    var i = Math.floor(t * row.mover.speed) % span.length;
    if (i < 0) i += span.length;
    return span[i];
  }

  function cellAt(world, z, lane, deck, t) {
    var ri = Math.floor(z / ROW);
    if (ri < 0) return '=';
    var row = world.rows[ri];
    if (!row) return world.endless ? '=' : '.';
    var authored = deck ? row.u[lane] : row.g[lane];
    if (row.mover && row.mover.deck === deck) {
      if (lane === moverLane(row, t || 0)) return '#';
      if (authored === 'M') return '=';
    }
    return authored || '.';
  }

  function resolveChar(ch, opt) {
    if (opt && opt.noDeck && ch === '^') return '=';
    return ch;
  }

  function createState(over) {
    var s = {
      z: 0.2, x: 0, y: 0, vy: 0, t: 0,
      lane: 1, targetLane: 1, deck: 0,
      airborne: false,
      fuel: TANK, heat: 0, heatLock: 0, burst: 0,
      rollT: 0, rollDir: 0, rollCount: 0, rollDodged: false,
      alive: true, crash: '', finished: false,
      wobble: 0, slowT: 0, rumble: 0,
      vz: 22,
      score: 0, combo: 1, comboT: 0, airAcc: 0,
      rowMark: 0,
      launchKey: '',
      got: {}, missed: {}, hist: { 0: 1 },
      maxDeck: 0,
      peakY: 0
    };
    if (over) {
      if (over.got) s.got = over.got;
      if (over.missed) s.missed = over.missed;
      if (over.hist) s.hist = over.hist;
      Object.keys(over).forEach(function (k) {
        if (k === 'got' || k === 'missed' || k === 'hist') return;
        s[k] = over[k];
      });
    }
    if (!over || over.x == null) s.x = laneCenter(s.lane);
    if (over && over.deck === 1 && over.y == null) s.y = DECK_H;
    s.lane = laneFromX(s.x);
    if (!over || !over.hist) s.hist = { 0: s.lane };
    s.targetLane = Math.max(0, Math.min(2, s.targetLane));
    return s;
  }

  function cloneState(s) {
    var c = Object.assign({}, s);
    c.got = Object.assign({}, s.got);
    c.missed = Object.assign({}, s.missed);
    c.hist = Object.assign({}, s.hist);
    return c;
  }

  function bumpCombo(state) {
    if (state.comboT > 0) state.combo = Math.min(8, state.combo + 1);
    state.comboT = 2;
  }

  function award(state, base, events, type, extra) {
    bumpCombo(state);
    var pts = base * state.combo;
    state.score += pts;
    var ev = { type: type, pts: pts };
    if (extra) Object.keys(extra).forEach(function (k) { ev[k] = extra[k]; });
    events.push(ev);
    return pts;
  }

  function crash(state, why, events, ghost) {
    if (!state.alive) return;
    state.alive = false;
    state.crash = why;
    if (!ghost) events.push({ type: 'crash', why: why });
  }

  function probe(world, z, lane, deck, t, opt) {
    if (lane < 0 || lane > 2) return null;
    var ch = resolveChar(cellAt(world, z, lane, deck, t), opt);
    if (isBlock(ch)) return { block: true, ch: ch, lane: lane, deck: deck };
    if (isFloor(ch)) return { floor: true, ch: ch, lane: lane, deck: deck };
    return null;
  }

  function supportAt(world, z, x, deck, t, opt) {
    var lane = laneFromX(x);
    var hit = probe(world, z, lane, deck, t, opt);
    if (hit && hit.floor) return hit;
    if (hit && hit.block) return hit;
    var rowZ = Math.floor(z / ROW) * ROW;
    if (z - rowZ < LIP) {
      var back = probe(world, z - LIP, lane, deck, t, opt);
      if (back && back.floor) return Object.assign({ lip: true }, back);
    }
    if (rowZ + ROW - z < LIP) {
      var fwd = probe(world, z + LIP, lane, deck, t, opt);
      if (fwd && fwd.floor) return Object.assign({ lip: true }, fwd);
    }
    var center = laneCenter(lane);
    var ax = Math.abs(x - center);
    if (ax > LANE_W / 2 - LIP) {
      var other = x > center ? lane + 1 : lane - 1;
      var side = probe(world, z, other, deck, t, opt);
      if (side && side.floor) return Object.assign({ lip: true, snapLane: other }, side);
    }
    return null;
  }

  function thrustingNow(state, held) {
    return (!!held || state.burst > 0) && state.fuel > 0 && state.heatLock <= 0;
  }

  function applySteer(state, dir, held) {
    if (!dir || !state.alive || state.finished) return { type: 'none' };
    var atEdge = (dir < 0 && state.targetLane <= 0) || (dir > 0 && state.targetLane >= 2);
    if (atEdge) {
      if (state.airborne && thrustingNow(state, held) && state.rollT <= 0) {
        state.rollT = 0.0001;
        state.rollDir = dir < 0 ? -1 : 1;
        state.fuel = Math.max(0, state.fuel - ROLL_FUEL);
        state.rollDodged = false;
        return { type: 'roll' };
      }
      state.rumble = 0.32;
      return { type: 'rumble' };
    }
    state.targetLane = Math.max(0, Math.min(2, state.targetLane + dir));
    return { type: 'lane', lane: state.targetLane };
  }

  function rollOffset(state) {
    if (state.rollT <= 0) return 0;
    var p = Math.min(1, state.rollT / ROLL_TIME);
    return Math.sin(Math.PI * p) * 0.5 * LANE_W * state.rollDir;
  }

  function overlapBlock(state, world, opt) {
    var deck, floorY, lane, ch;
    for (deck = 0; deck <= 1; deck++) {
      floorY = deck ? DECK_H : 0;
      if (state.y < floorY - 0.25 || state.y > floorY + BLOCK_H) continue;
      lane = laneFromX(state.x);
      if (Math.abs(state.x - laneCenter(lane)) > LANE_W * 0.48) continue;
      ch = resolveChar(cellAt(world, state.z, lane, deck, state.t), opt);
      if (isBlock(ch)) return true;
    }
    return false;
  }

  function collect(state, world, lane, deck, ch, events, ghost) {
    if (ch !== 'o' || ghost) return;
    var key = Math.floor(state.z / ROW) + ':' + lane + ':' + deck;
    if (state.got[key]) return;
    state.got[key] = 1;
    state.fuel = Math.min(TANK, state.fuel + 1);
    events.push({ type: 'can', text: '+1s' });
  }

  function land(state, deck, floorY, events, ghost) {
    var midRoll = state.rollT > 0 && state.rollT < ROLL_TIME - 1 / 120;
    var prevDeck = state.deck;
    state.airborne = false;
    state.deck = deck;
    state.y = floorY;
    state.vy = 0;
    state.lane = laneFromX(state.x);
    if (deck > state.maxDeck) state.maxDeck = deck;
    if (midRoll) {
      state.rollT = 0;
      state.rollDir = 0;
      state.rollDodged = false;
      state.wobble = 0.85;
      state.slowT = Math.max(state.slowT, 1.6);
      state.combo = 1;
      state.comboT = 0;
      if (!ghost) events.push({ type: 'wobble' });
      return;
    }
    if (!ghost && deck === 1 && prevDeck === 0) {
      bumpCombo(state);
      events.push({ type: 'deck' });
    }
  }

  function tryLaunch(state, world, prevZ, opt, events, ghost) {
    var prevRow = Math.floor(prevZ / ROW);
    var lip = (prevRow + 1) * ROW;
    if (!(prevZ < lip && state.z >= lip)) return false;
    var ch = resolveChar(cellAt(world, prevZ, state.lane, state.deck, state.t), opt);
    if (!isRamp(ch)) return false;
    var key = prevRow + ':' + state.lane + ':' + state.deck;
    if (state.launchKey === key) return false;
    state.launchKey = key;
    var theta = (ch === '^' ? 28 : 18) * Math.PI / 180;
    state.vy = Math.max(state.vy, state.vz * Math.sin(theta));
    state.y += 0.06;
    state.airborne = true;
    if (!ghost) {
      bumpCombo(state);
      events.push({ type: 'launch', kind: ch });
    }
    return true;
  }

  function steerRamp(state, ch, lane) {
    if (ch === 'L') state.targetLane = Math.max(0, lane - 1);
    if (ch === 'R') state.targetLane = Math.min(2, lane + 1);
  }

  function checkNear(state, world, row, events) {
    var prev = state.hist[row - 1];
    var deck, lane, ch, key;
    if (prev == null) return;
    for (deck = 0; deck <= 1; deck++) {
      for (lane = 0; lane < 3; lane++) {
        ch = cellAt(world, row * ROW + 0.2, lane, deck, state.t);
        if (!isBlock(ch)) continue;
        key = row + ':' + lane + ':' + deck;
        if (state.missed[key]) continue;
        if (state.lane !== lane && prev === lane) {
          state.missed[key] = 1;
          award(state, 100, events, 'near');
        }
      }
    }
  }

  function step(state, world, input, dt, opt) {
    opt = opt || {};
    var events = [];
    var ghost = !!opt.ghost;
    if (!state.alive || state.finished) return events;

    state.t += dt;
    if (state.rumble > 0) state.rumble -= dt;
    if (state.wobble > 0) state.wobble -= dt;
    if (state.slowT > 0) state.slowT -= dt;
    if (state.burst > 0) state.burst = Math.max(0, state.burst - dt);
    if (state.heatLock > 0) state.heatLock = Math.max(0, state.heatLock - dt);
    if (!ghost && state.comboT > 0) {
      state.comboT -= dt;
      if (state.comboT <= 0) state.combo = 1;
    }

    var held = !!(input && input.thrust);
    var canThrust = thrustingNow(state, held);
    if (canThrust) {
      state.fuel = Math.max(0, state.fuel - dt);
      state.heat = Math.min(1, state.heat + dt / HEAT_FULL);
      if (state.heat >= 1 && state.heatLock <= 0) state.heatLock = CUTOUT;
    } else if (state.heat > 0) {
      var cool = state.airborne ? COOL_AIR : COOL_GROUND;
      state.heat = Math.max(0, state.heat - dt / cool);
    }

    if (state.rollT > 0) {
      state.rollT += dt;
      if (state.rollT >= ROLL_TIME) {
        var dodged = state.rollDodged;
        state.rollT = 0;
        state.rollDir = 0;
        state.rollDodged = false;
        state.rollCount += 1;
        if (!ghost) award(state, dodged ? 1000 : 500, events, 'roll', { dodged: dodged });
      }
    }

    var prevZ = state.z;
    var prevY = state.y;
    var wasAir = state.airborne;
    var offset = rollOffset(state);
    var goal = laneCenter(state.targetLane) + offset;
    var dur = state.airborne ? LANE_TIME_AIR : LANE_TIME_GROUND;
    var maxV = LANE_W / dur;
    var dx = goal - state.x;
    if (dx > maxV * dt) dx = maxV * dt;
    else if (dx < -maxV * dt) dx = -maxV * dt;
    state.x += dx;
    state.lane = laneFromX(state.x);

    if (!wasAir && !canThrust) {
      state.z += state.vz * dt;
      var launched = tryLaunch(state, world, prevZ, opt, events, ghost);
      if (!launched && !state.airborne) {
        var sup = supportAt(world, state.z, state.x, state.deck, state.t, opt);
        if (!sup) {
          state.airborne = true;
          state.vy += -G * dt;
          state.y += state.vy * dt;
        } else if (sup.block) {
          if (state.rollT > 0) state.rollDodged = true;
          else crash(state, 'block', events, ghost);
        } else {
          if (sup.snapLane != null) {
            state.targetLane = sup.snapLane;
            state.x = laneCenter(sup.snapLane);
            state.lane = sup.snapLane;
          }
          state.y = state.deck === 1 ? DECK_H : 0;
          state.vy = 0;
          steerRamp(state, sup.ch, state.lane);
          if (Math.abs(state.y - (state.deck ? DECK_H : 0)) < 1.4) collect(state, world, state.lane, state.deck, sup.ch, events, ghost);
        }
      }
    } else {
      if (!state.airborne) state.airborne = true;
      var ay = (canThrust ? THRUST_MUL * G : 0) - G;
      state.vy += ay * dt;
      if (canThrust && state.vy > 0) state.vy -= state.vy * CLIMB_DAMP * dt;
      if (state.vy > 14) state.vy = 14;
      state.y += state.vy * dt;
      if (state.y > 12) { state.y = 12; state.vy = Math.min(0, state.vy); }
      state.z += state.vz * dt;
      if (state.alive && state.vy <= 0) {
        if (prevY >= DECK_H - 0.04 && state.y <= DECK_H && (state.peakY || 0) >= DECK_H + 0.04) {
          var up = supportAt(world, state.z, state.x, 1, state.t, opt);
          if (up && up.floor) land(state, 1, DECK_H, events, ghost);
          else if (up && up.block && state.rollT <= 0) crash(state, 'block', events, ghost);
        }
        if (state.airborne && prevY >= -0.04 && state.y <= 0 && (state.peakY || 0) >= 0.12) {
          var down = supportAt(world, state.z, state.x, 0, state.t, opt);
          if (down && down.floor) land(state, 0, 0, events, ghost);
          else if (down && down.block && state.rollT <= 0) crash(state, 'block', events, ghost);
        }
      }
      if (state.alive && state.airborne) {
        var dck;
        for (dck = 0; dck <= 1; dck++) {
          var fy = dck ? DECK_H : 0;
          if (Math.abs(state.y - fy) < 1.15) {
            var lane = laneFromX(state.x);
            var ch = resolveChar(cellAt(world, state.z, lane, dck, state.t), opt);
            if (ch === 'o') collect(state, world, lane, dck, ch, events, ghost);
          }
        }
      }
    }

    if (state.alive && overlapBlock(state, world, opt)) {
      if (state.rollT > 0) state.rollDodged = true;
      else crash(state, 'block', events, ghost);
    }

    if (!state.airborne) state.peakY = state.y;
    else if (state.y > (state.peakY || 0)) state.peakY = state.y;

    if (state.alive && state.y < -1.35) crash(state, 'fall', events, ghost);

    var row = Math.floor(state.z / ROW);
    if (!ghost && state.alive) {
      state.hist[row] = state.lane;
      if (row > state.rowMark) {
        var r;
        for (r = state.rowMark + 1; r <= row; r++) {
          var upper = state.y >= DECK_H - 0.35;
          state.score += 10 * state.combo * (upper ? 2 : 1);
          checkNear(state, world, r, events);
        }
        state.rowMark = row;
        events.push({ type: 'row', row: row });
      }
      if (state.airborne) {
        state.airAcc += dt;
        while (state.airAcc >= 0.1) {
          state.airAcc -= 0.1;
          var ap = 50 * state.combo;
          state.score += ap;
          events.push({ type: 'air', pts: ap });
        }
      }
    } else if (ghost) {
      state.rowMark = row;
    }

    if (state.alive && world.finishZ && state.z >= world.finishZ && !state.airborne) {
      state.finished = true;
      if (!ghost) events.push({ type: 'finish' });
    }
    return events;
  }

  function predictLanding(state, world, thrustHeld) {
    var s = cloneState(state);
    var i, wasAir;
    for (i = 0; i < 240; i++) {
      if (!s.alive) return { x: s.x, z: s.z, deck: 0, y: 0, solid: false };
      wasAir = s.airborne || s.y > 0.2;
      step(s, world, { thrust: !!thrustHeld }, STEP, { ghost: true });
      if (wasAir && !s.airborne && s.alive) {
        return { x: s.x, z: s.z, deck: s.deck, y: s.y, solid: true };
      }
      if (s.y < -1) return { x: s.x, z: s.z, deck: 0, y: 0, solid: false };
    }
    return {
      x: s.x, z: s.z,
      deck: s.y > DECK_H * 0.55 ? 1 : 0,
      y: Math.max(0, s.y),
      solid: false,
      pending: true
    };
  }

  function roadWorld(n) {
    var rows = [];
    var i;
    for (i = 0; i < n; i++) rows.push({ g: ['=', '=', '='], u: ['.', '.', '.'] });
    return { rows: rows, endless: false };
  }

  function selfTest() {
    var fails = [];
    function eq(cond, msg) { if (!cond) fails.push(msg); }

    eq(Math.abs(ISP - 55.1) < 0.2, 'Isp ' + ISP.toFixed(2));
    eq(Math.abs(MDOT_20KN - 37) < 0.05, 'mdot ' + MDOT_20KN.toFixed(2));
    eq(Math.abs(TANK_KG - 222) < 1, 'tank kg ' + TANK_KG.toFixed(1));

    var world = roadWorld(80);
    var s = createState({ vz: 20 });
    var i;
    for (i = 0; i < 120 * 4; i++) step(s, world, { thrust: false }, STEP);
    eq(s.alive && s.y === 0 && s.score > 0, 'cruise ' + s.crash + ' y' + s.y + ' sc' + s.score);

    world.rows[8].g[1] = '_';
    s = createState({ vz: 18, lane: 1, targetLane: 1 });
    for (i = 0; i < 120 * 5 && s.alive; i++) step(s, world, {}, STEP);
    eq(!s.alive && s.crash === 'fall', 'gap should fall, got ' + s.crash);

    world = roadWorld(40);
    world.rows[4].g = ['/', '/', '/'];
    world.rows[5].g = ['_', '_', '_'];
    s = createState({ vz: 22, lane: 1, targetLane: 1 });
    for (i = 0; i < 120 * 4 && s.alive && !s.finished; i++) step(s, world, {}, STEP);
    eq(s.alive && s.crash === '', 'ramp gap alive ' + s.crash + ' z' + s.z.toFixed(1));

    s = createState({ vz: 16 });
    var burned = 0;
    var sawLock = false;
    var t = 0;
    var maxY = 0;
    var lockAt = -1;
    while (s.fuel > 0.05 && t < 25) {
      if (s.heatLock > 0) {
        sawLock = true;
        if (lockAt < 0) lockAt = burned;
        s.airborne = false;
        s.y = 0;
        s.vy = 0;
        s.deck = 0;
        step(s, roadWorld(8), { thrust: false }, STEP);
      } else {
        var before = s.fuel;
        var y0 = s.y;
        step(s, roadWorld(40), { thrust: true }, STEP);
        burned += before - s.fuel;
        if (s.y > maxY) maxY = Math.max(maxY, s.y, y0);
      }
      t += STEP;
    }
    eq(sawLock && lockAt > 0.7 && lockAt < 1.4, 'heat cutout at ' + lockAt.toFixed(2));
    eq(s.fuel <= 0.05, 'fuel empties ' + s.fuel.toFixed(2) + ' burned ' + burned.toFixed(2));
    eq(maxY > 1.5 && maxY < 11, 'climb height ' + maxY.toFixed(2));

    s = createState({ vz: 16, y: 0, airborne: false });
    for (i = 0; i < 24; i++) step(s, roadWorld(10), { thrust: true }, STEP);
    var hop = s.y;
    eq(hop > 0.05 && hop < 1.35, 'tap hop ' + hop.toFixed(2));

    s = createState({
      y: 8, vy: 0, airborne: true, lane: 0, targetLane: 0, fuel: 6, vz: 18
    });
    var roll = applySteer(s, -1, true);
    eq(roll.type === 'roll', 'roll trigger ' + roll.type);
    eq(Math.abs(s.fuel - 5.5) < 1e-9, 'roll fuel ' + s.fuel);
    world = roadWorld(30);
    for (i = 0; i < Math.round(0.75 / STEP); i++) step(s, world, { thrust: false }, STEP);
    eq(s.rollCount === 1 && s.alive, 'roll completes ' + s.rollCount + ' ' + s.crash);

    s = createState({ y: 1.2, vy: -1, airborne: true, lane: 0, targetLane: 0, fuel: 4, vz: 0.01, z: 2 });
    applySteer(s, -1, true);
    world = roadWorld(4);
    for (i = 0; i < 90 && s.airborne && s.alive; i++) step(s, world, {}, STEP);
    eq(s.alive && s.wobble > 0, 'wobble land crash=' + s.crash + ' wobble=' + s.wobble);

    world = roadWorld(20);
    world.rows[6].g[1] = '#';
    s = createState({ vz: 20, lane: 1, targetLane: 1 });
    for (i = 0; i < 120 * 3 && s.alive; i++) step(s, world, {}, STEP);
    eq(!s.alive && s.crash === 'block', 'block ' + s.crash);

    world = roadWorld(12);
    world.rows[3].g[1] = 'o';
    s = createState({ vz: 16, fuel: 2, lane: 1, targetLane: 1 });
    for (i = 0; i < 120 * 2; i++) step(s, world, {}, STEP);
    eq(s.fuel > 2.9, 'canister ' + s.fuel.toFixed(2));

    s = createState({ lane: 1, targetLane: 1, vz: 10 });
    applySteer(s, -1, false);
    for (i = 0; i < 40; i++) step(s, roadWorld(8), {}, STEP);
    eq(s.targetLane === 0 && laneFromX(s.x) === 0, 'steer lane ' + s.lane);

    world = roadWorld(50);
    for (i = 6; i < 40; i++) world.rows[i].u = ['=', '=', '='];
    world.rows[5].g = ['^', '^', '^'];
    s = createState({ vz: 24, lane: 1, targetLane: 1 });
    var reached = false;
    for (i = 0; i < 120 * 6 && s.alive; i++) {
      step(s, world, {}, STEP);
      if (s.deck === 1 && !s.airborne) reached = true;
    }
    eq(reached && s.alive, 'deck ramp reached=' + reached + ' ' + s.crash + ' y' + s.y.toFixed(2));

    world = roadWorld(10);
    world.rows[4].g[1] = '_';
    var lip = supportAt(world, 4 * ROW + 0.1, 0, 0, 0, null);
    eq(lip && lip.floor && lip.lip, 'lip save');

    s = createState({ vz: 20, lane: 1, targetLane: 1 });
    var a = cloneState(s);
    var b = cloneState(s);
    var w = roadWorld(20);
    w.rows[3].g = ['/', '/', '/'];
    for (i = 0; i < 300; i++) {
      step(a, w, { thrust: i % 50 < 10 }, STEP);
      step(b, w, { thrust: i % 50 < 10 }, STEP);
    }
    eq(a.z === b.z && a.y === b.y && a.score === b.score, 'deterministic');

    s = createState({ y: 3, vy: 0, airborne: true, vz: 18, z: 2 });
    var pred = predictLanding(s, roadWorld(20), false);
    eq(pred.solid === true, 'shadow solid');
    w = roadWorld(20);
    for (i = 2; i < 16; i++) w.rows[i].g = ['_', '_', '_'];
    s = createState({ y: 2, vy: 0, airborne: true, vz: 18, z: 8 });
    pred = predictLanding(s, w, false);
    eq(pred.solid === false, 'shadow miss');

    return { ok: fails.length === 0, fails: fails, isp: ISP, mdot: MDOT_20KN, tankKg: TANK_KG };
  }

  var RR = {
    G_REAL: G_REAL, G: G, ISP: ISP, MDOT: MDOT_20KN, TANK: TANK, TANK_KG: TANK_KG,
    ROW: ROW, LANE_W: LANE_W, DECK_H: DECK_H, STEP: STEP, ROLL_TIME: ROLL_TIME,
    ROLL_FUEL: ROLL_FUEL, BURST: BURST, HEAT_FULL: HEAT_FULL, CUTOUT: CUTOUT,
    BLOCK_H: BLOCK_H,
    laneCenter: laneCenter, laneFromX: laneFromX,
    isFloor: isFloor, isRamp: isRamp, isBlock: isBlock,
    cellAt: cellAt, moverLane: moverLane,
    createState: createState, cloneState: cloneState,
    step: step, applySteer: applySteer, predictLanding: predictLanding,
    supportAt: supportAt, rollOffset: rollOffset, thrustingNow: thrustingNow,
    selfTest: selfTest
  };

  global.RR = RR;
})(typeof window !== 'undefined' ? window : globalThis);

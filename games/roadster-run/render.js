/* Pseudo-3D Canvas 2D. Rear-view roadster, explainer flame, 16 roll frames. */
(function (global) {
  'use strict';

  var RR = global.RR;
  var frames = null;

  function heatCss(heat, alpha) {
    var r, g, b, t;
    if (heat < 0.45) {
      t = heat / 0.45;
      r = 180 + (255 - 180) * t;
      g = 220 + (255 - 220) * t;
      b = 255;
    } else {
      t = (heat - 0.45) / 0.55;
      r = 255;
      g = 255 + (140 - 255) * t;
      b = 255 + (40 - 255) * t;
    }
    return 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + alpha + ')';
  }

  function drawBody(g) {
    g.fillStyle = '#6a1020';
    g.beginPath();
    g.moveTo(-34, 26);
    g.lineTo(34, 26);
    g.lineTo(40, 8);
    g.lineTo(-40, 8);
    g.closePath();
    g.fill();
    g.fillStyle = '#d8263a';
    g.beginPath();
    g.moveTo(-38, 14);
    g.lineTo(38, 14);
    g.lineTo(32, -28);
    g.lineTo(-32, -28);
    g.closePath();
    g.fill();
    g.fillStyle = '#1b2a44';
    g.beginPath();
    g.moveTo(-22, -8);
    g.lineTo(22, -8);
    g.lineTo(16, -26);
    g.lineTo(-16, -26);
    g.closePath();
    g.fill();
    g.fillStyle = '#8fd0ea';
    g.fillRect(-10, -22, 20, 6);
    g.fillStyle = '#1a1a1a';
    g.fillRect(-36, 12, 72, 7);
    g.fillStyle = '#ff3b30';
    g.fillRect(-30, 4, 16, 8);
    g.fillRect(14, 4, 16, 8);
    g.fillStyle = '#ffd0a8';
    g.fillRect(-28, 6, 5, 3);
    g.fillRect(23, 6, 5, 3);
    g.fillStyle = '#141414';
    g.fillRect(-18, 20, 12, 8);
    g.fillRect(6, 20, 12, 8);
    g.fillStyle = '#2a2a2a';
    g.fillRect(-46, 0, 10, 18);
    g.fillRect(36, 0, 10, 18);
  }

  function ensureFrames() {
    if (frames) return frames;
    frames = [];
    var i, c, g;
    for (i = 0; i < 16; i++) {
      c = document.createElement('canvas');
      c.width = 160;
      c.height = 160;
      g = c.getContext('2d');
      g.translate(80, 78);
      g.rotate((i / 16) * Math.PI * 2);
      drawBody(g);
      frames.push(c);
    }
    return frames;
  }

  function project(cam, x, y, z) {
    var dz = z - cam.z;
    if (dz < 0.35) {
      if (z >= cam.z) return null;
      z = cam.z + 0.36;
      dz = 0.36;
    }
    var scale = cam.focal / dz;
    var sx = cam.cx + (x - cam.x) * scale;
    var sy = cam.horizon + (cam.y - y) * scale;
    if (cam.roll) {
      var dx = sx - cam.cx;
      var dy = sy - cam.cy;
      var co = Math.cos(cam.roll);
      var si = Math.sin(cam.roll);
      sx = cam.cx + dx * co - dy * si;
      sy = cam.cy + dx * si + dy * co;
    }
    sx += cam.shakeX;
    sy += cam.shakeY;
    return { sx: sx, sy: sy, scale: scale, dz: dz };
  }

  function quad(ctx, a, b, c, d) {
    if (!a || !b || !c || !d) return;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.lineTo(d.sx, d.sy);
    ctx.closePath();
    ctx.fill();
  }

  function camera(w, h, state, reduce) {
    var roll = 0;
    if (state.rollT > 0) {
      var p = Math.min(1, state.rollT / RR.ROLL_TIME);
      roll = Math.sin(Math.PI * p) * state.rollDir * (reduce ? 0.03 : 0.16);
    }
    var shakeX = 0;
    var shakeY = 0;
    if (!reduce && state.wobble > 0) {
      shakeX = Math.sin(state.t * 48) * 6;
      shakeY = Math.cos(state.t * 37) * 4;
    } else if (!reduce && state.rumble > 0) {
      shakeX = (Math.random() - 0.5) * 5;
      shakeY = (Math.random() - 0.5) * 3;
    }
    return {
      z: state.z - 6.2,
      y: 3.55 + Math.min(2.2, state.y) * 0.08,
      x: state.x * 0.72,
      horizon: h * 0.36,
      focal: h * 0.58,
      cx: w * 0.5,
      cy: h * 0.58,
      roll: roll,
      shakeX: shakeX,
      shakeY: shakeY
    };
  }

  function fade(dz, vz) {
    var tele = Math.max(26, vz * 1.2);
    if (dz < tele) return 1;
    return Math.max(0.2, 1 - (dz - tele) / Math.max(36, vz * 2.2));
  }

  function drawSky(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    g.addColorStop(0, '#070b14');
    g.addColorStop(0.55, '#152033');
    g.addColorStop(1, '#243044');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    var i;
    for (i = 0; i < 18; i++) {
      var x = (i * 97) % w;
      var y = (i * 53) % (h * 0.28);
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(0, h * 0.34, w, 3);
    ctx.fillStyle = 'rgba(240,160,64,0.35)';
    ctx.fillRect(0, h * 0.348, w, 2);
  }

  function drawFlames(ctx, heat, on) {
    if (!on) return;
    var len = 60 * (0.8 + 0.4 * Math.random());
    var alpha = 0.4 + 0.4 * Math.random();
    ctx.fillStyle = heat < 0.04 ? ('rgba(180,220,255,' + alpha + ')') : heatCss(heat, alpha);
    var i;
    for (i = 0; i < 2; i++) {
      var ox = i === 0 ? -12 : 12;
      ctx.beginPath();
      ctx.moveTo(ox - 6, 26);
      ctx.lineTo(ox + (Math.random() - 0.5) * 10, 26 + len * (0.72 + Math.random() * 0.4));
      ctx.lineTo(ox + 6, 26);
      ctx.fill();
    }
  }

  function drawCar(ctx, cam, state, thrust) {
    var p = project(cam, state.x, state.y + 0.15, state.z + 0.4);
    if (!p) return;
    var ang = 0;
    if (state.rollT > 0) ang = state.rollDir * Math.min(1, state.rollT / RR.ROLL_TIME) * Math.PI * 2;
    else if (state.wobble > 0) ang = Math.sin(state.t * 34) * 0.18 * state.wobble;
    var idx = Math.round((ang / (Math.PI * 2)) * 16) % 16;
    if (idx < 0) idx += 16;
    var size = Math.max(46, 2.15 * p.scale);
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.drawImage(ensureFrames()[idx], -size * 0.5, -size * 0.48, size, size);
    ctx.rotate(ang);
    drawFlames(ctx, state.heat, thrust && state.fuel > 0 && state.heatLock <= 0);
    ctx.restore();
  }

  function drawShadow(ctx, cam, x, z, deck, solid) {
    var y = deck ? RR.DECK_H : 0;
    var p = project(cam, x, y + 0.03, z);
    if (!p) return;
    ctx.fillStyle = solid ? 'rgba(0,0,0,0.42)' : 'rgba(231,76,60,0.62)';
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, Math.max(6, 0.95 * p.scale), Math.max(3, 0.38 * p.scale), 0, 0, Math.PI * 2);
    ctx.fill();
    if (!solid) {
      ctx.strokeStyle = 'rgba(231,76,60,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.sx - 7, p.sy - 5);
      ctx.lineTo(p.sx + 7, p.sy + 5);
      ctx.moveTo(p.sx + 7, p.sy - 5);
      ctx.lineTo(p.sx - 7, p.sy + 5);
      ctx.stroke();
    }
  }

  function cellColor(ch, deck, alt, alpha) {
    if (ch === '_' || ch === '.') return null;
    if (ch === '^') return 'rgba(60,180,212,' + alpha + ')';
    if (ch === '/' || ch === 'L' || ch === 'R') return 'rgba(240,160,64,' + alpha + ')';
    if (deck) return alt ? 'rgba(70,96,122,' + alpha + ')' : 'rgba(58,82,108,' + alpha + ')';
    return alt ? 'rgba(48,56,74,' + alpha + ')' : 'rgba(36,42,58,' + alpha + ')';
  }

  function drawRow(ctx, cam, world, ri, state) {
    var row = world.rows[ri];
    if (!row) return;
    var z0 = ri * RR.ROW;
    var z1 = z0 + RR.ROW;
    var alt = ri % 2 === 0;
    var alpha = fade(z0 - cam.z, Math.max(12, state.vz));
    var lane, x0, x1, y, ch, shift, lift, a, b, c, d, deck;
    ctx.globalAlpha = alpha;
    for (deck = 0; deck <= 1; deck++) {
      y = deck ? RR.DECK_H : 0;
      for (lane = -1; lane < 4; lane++) {
        if (lane === -1 || lane === 3) {
          x0 = lane === -1 ? RR.laneCenter(0) - RR.LANE_W * 1.15 : RR.laneCenter(2) + RR.LANE_W * 0.5;
          x1 = lane === -1 ? RR.laneCenter(0) - RR.LANE_W * 0.5 : RR.laneCenter(2) + RR.LANE_W * 1.35;
          if (deck === 1) continue;
          ctx.fillStyle = 'rgba(14,16,22,' + alpha + ')';
          quad(ctx,
            project(cam, x0, 0, z0), project(cam, x1, 0, z0),
            project(cam, x1, 0, z1), project(cam, x0, 0, z1));
          continue;
        }
        ch = RR.cellAt(world, z0 + 0.2, lane, deck, state.t);
        x0 = RR.laneCenter(lane) - RR.LANE_W * 0.5;
        x1 = x0 + RR.LANE_W;
        if (ch === '_' || (ch === '.' && deck === 1)) {
          if (deck === 0 && ch === '_') {
            ctx.fillStyle = 'rgba(5,6,10,' + alpha + ')';
            quad(ctx,
              project(cam, x0, -0.55, z0), project(cam, x1, -0.55, z0),
              project(cam, x1, -0.55, z1), project(cam, x0, -0.55, z1));
            ctx.fillStyle = 'rgba(231,76,60,' + alpha + ')';
            quad(ctx,
              project(cam, x0, 0.02, z0), project(cam, x1, 0.02, z0),
              project(cam, x1, -0.08, z0 + 0.45), project(cam, x0, -0.08, z0 + 0.45));
          }
          continue;
        }
        if (ch === '.' && deck === 0) {
          ctx.fillStyle = 'rgba(5,6,10,' + alpha + ')';
          quad(ctx,
            project(cam, x0, -0.4, z0), project(cam, x1, -0.4, z0),
            project(cam, x1, -0.4, z1), project(cam, x0, -0.4, z1));
          continue;
        }
        if (deck === 1 && RR.isFloor(ch)) {
          ctx.fillStyle = 'rgba(18,20,28,' + (alpha * 0.85) + ')';
          var px = x0 + (lane % 2) * RR.LANE_W * 0.72;
          quad(ctx,
            project(cam, px, 0, z0 + 0.4), project(cam, px + 0.28, 0, z0 + 0.4),
            project(cam, px + 0.28, RR.DECK_H, z0 + 0.4), project(cam, px, RR.DECK_H, z0 + 0.4));
        }
        shift = 0;
        lift = 0;
        if (ch === 'L') shift = -RR.LANE_W * 0.92;
        if (ch === 'R') shift = RR.LANE_W * 0.92;
        if (ch === '/' || ch === 'L' || ch === 'R' || ch === '^') lift = ch === '^' ? 1.05 : 0.62;
        ctx.fillStyle = cellColor(ch, deck, alt, 1) || '#333';
        a = project(cam, x0, y, z0);
        b = project(cam, x1, y, z0);
        c = project(cam, x1 + shift, y + lift, z1);
        d = project(cam, x0 + shift, y + lift, z1);
        quad(ctx, a, b, c, d);
        if (deck === 1 && a && b) {
          ctx.strokeStyle = 'rgba(95,212,232,' + alpha + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(d ? d.sx : a.sx, d ? d.sy : a.sy);
          ctx.stroke();
        }
        if ((ch === '=' || ch === 'o' || ch === 'v') && lane < 2 && alt) {
          var edge = project(cam, x1, y + 0.03, z0 + RR.ROW * 0.5);
          var edge2 = project(cam, x1, y + 0.03, z0 + RR.ROW * 0.82);
          if (edge && edge2) {
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = Math.max(1, 0.08 * edge.scale);
            ctx.beginPath();
            ctx.moveTo(edge.sx, edge.sy);
            ctx.lineTo(edge2.sx, edge2.sy);
            ctx.stroke();
          }
        }
        if (lift > 0 && a && c) {
          var tip = project(cam, (x0 + x1) * 0.5 + shift * 0.65, y + lift * 0.72, z0 + RR.ROW * 0.72);
          var tail = project(cam, (x0 + x1) * 0.5, y + 0.05, z0 + RR.ROW * 0.28);
          if (tip && tail) {
            ctx.strokeStyle = ch === '^' ? 'rgba(255,255,255,0.9)' : 'rgba(40,24,0,0.85)';
            ctx.lineWidth = Math.max(2, 0.12 * tail.scale);
            ctx.beginPath();
            ctx.moveTo(tail.sx, tail.sy);
            ctx.lineTo(tip.sx, tip.sy);
            ctx.stroke();
          }
        }
        if (ch === 'v') {
          ctx.fillStyle = 'rgba(8,10,16,' + alpha + ')';
          quad(ctx,
            project(cam, x0, y, z1 - 0.8), project(cam, x1, y, z1 - 0.8),
            project(cam, x1, y - 0.2, z1), project(cam, x0, y - 0.2, z1));
        }
        var ahead1 = RR.cellAt(world, (ri + 1) * RR.ROW + 0.2, lane, deck, state.t);
        var ahead2 = RR.cellAt(world, (ri + 2) * RR.ROW + 0.2, lane, deck, state.t);
        var warn = (ahead1 === '_' || ahead2 === '_') || (deck === 0 && (ahead1 === '.' || ahead2 === '.'));
        if (warn && (ch === '=' || ch === 'o') && a && b && c && d) {
          ctx.fillStyle = 'rgba(231,76,60,' + (0.35 + 0.4 * ((ri + lane) % 2)) + ')';
          var mx = (a.sx + b.sx + c.sx + d.sx) / 4;
          var my = (a.sy + b.sy + c.sy + d.sy) / 4;
          ctx.beginPath();
          ctx.moveTo(mx, my + 8);
          ctx.lineTo(mx + 10, my - 2);
          ctx.lineTo(mx, my + 2);
          ctx.lineTo(mx - 10, my - 2);
          ctx.closePath();
          ctx.fill();
        }
        if (ch === '#' || (row.mover && row.mover.deck === deck && RR.moverLane(row, state.t) === lane)) {
          var top = y + RR.BLOCK_H;
          ctx.fillStyle = 'rgba(90,36,44,' + alpha + ')';
          quad(ctx,
            project(cam, x0 + 0.35, y, z0 + 0.7), project(cam, x1 - 0.35, y, z0 + 0.7),
            project(cam, x1 - 0.35, top, z0 + 0.7), project(cam, x0 + 0.35, top, z0 + 0.7));
          ctx.fillStyle = 'rgba(242,210,168,' + alpha + ')';
          quad(ctx,
            project(cam, x0 + 0.35, top - 0.35, z0 + 0.7), project(cam, x1 - 0.35, top - 0.35, z0 + 0.7),
            project(cam, x1 - 0.35, top, z0 + 0.55), project(cam, x0 + 0.35, top, z0 + 0.55));
        }
        if (ch === 'o') {
          var cp = project(cam, RR.laneCenter(lane), y + 0.7, z0 + RR.ROW * 0.5);
          if (cp) {
            ctx.fillStyle = 'rgba(91,155,213,' + (0.35 + 0.25 * Math.sin(state.t * 6 + lane)) + ')';
            ctx.beginPath();
            ctx.arc(cp.sx, cp.sy, Math.max(8, 0.7 * cp.scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d7f2ff';
            ctx.beginPath();
            ctx.arc(cp.sx, cp.sy, Math.max(3, 0.28 * cp.scale), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawZones(ctx, w, h) {
    ctx.fillStyle = 'rgba(240,160,64,0.07)';
    ctx.fillRect(0, 0, w, h * 0.6);
    ctx.fillStyle = 'rgba(91,155,213,0.1)';
    ctx.fillRect(0, h * 0.6, w, h * 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.6);
    ctx.lineTo(w, h * 0.6);
    ctx.moveTo(w / 2, h * 0.6);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
  }

  function draw(ctx, w, h, state, world, fx) {
    fx = fx || {};
    drawSky(ctx, w, h);
    if (!state || !world) return;
    var cam = camera(w, h, state, !!fx.reduce);
    var dist = Math.max(130, state.vz * 3.3);
    var row1 = Math.min(world.rows.length - 1, Math.floor((state.z + dist) / RR.ROW));
    var row0 = Math.max(0, Math.floor((state.z - 6) / RR.ROW));
    var ri;
    for (ri = row1; ri >= row0; ri--) drawRow(ctx, cam, world, ri, state);
    if (state.airborne && fx.predict) {
      drawShadow(ctx, cam, fx.predict.x, fx.predict.z, fx.predict.solid ? fx.predict.deck : 0, !!fx.predict.solid);
    } else if (!state.airborne) {
      drawShadow(ctx, cam, state.x, state.z + 0.2, state.deck, true);
    }
    drawCar(ctx, cam, state, !!fx.thrust);
    if (fx.showZones) drawZones(ctx, w, h);
    if (fx.popups) {
      ctx.font = '700 16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      fx.popups.forEach(function (pop) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, pop.life) + ')';
        ctx.fillText(pop.text, w * 0.5, h * 0.42 - (1 - pop.life) * 36);
      });
    }
    if (!state.alive) {
      var vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.7);
      vg.addColorStop(0, 'rgba(231,76,60,0)');
      vg.addColorStop(1, 'rgba(120,16,24,0.45)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  global.RoadsterDraw = { draw: draw, camera: camera, heatCss: heatCss };
})(typeof window !== 'undefined' ? window : globalThis);

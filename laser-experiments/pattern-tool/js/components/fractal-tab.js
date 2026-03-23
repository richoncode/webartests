import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { UI, uuid } from '../utils.js';
import { XCSIR } from '../xcs-ir.js';
import { XCSExporter } from '../xcs-exporter.js';
import { PalMgr } from '../palettes.js';

export const FractalTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Fractals & Recursion</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    pane.appendChild(viewer);

    const defaults = {
      type: 'sierpinski-gasket',
      size: 80,
      renderMode: 'fill',
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
      colorRangeMode: true,
      rangeEndIdx: 10,
      border: false,
      iterations: 5,
      angle: 45,
      branchFactor: 0.7
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;

    const fillableTypes = ['sierpinski-gasket', 'sierpinski-carpet', 'apollonian-gasket', 'cantor-set', 't-square'];
    if (!fillableTypes.includes(cfg.type)) {
      cfg.renderMode = 'path';
    }

    if (cfg.totalSize !== undefined) {
      cfg.size = cfg.totalSize;
      delete cfg.totalSize;
    }
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'fractal', pane, cfg, state };

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.rawData = this.generateXCS(inst.cfg);
    inst.state.shapes = XCSIR.parseXCS(inst.state.rawData);
    XCSViewer.update(inst.pane, inst.state, lazy);
  },

  generateXCS(cfg) {
    const project = XCSExporter.createProject();
    const CX = 50, CY = 50;
    
    let palette = PalMgr.get(cfg.paletteId);
    if (!palette) {
      const all = PalMgr.list();
      if (all.length > 0) palette = all[0];
    }
    if (!palette) return project;

    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';
    const isFill = cfg.renderMode === 'fill';
    const processingType = isFill ? "COLOR_FILL_ENGRAVE" : "VECTOR_ENGRAVING";
    
    const entryIdx = cfg.paletteOffset % palette.entries.length;
    const entry = palette.entries[entryIdx];
    const pm = {
      power: entry.power, 
      speed: palette.speed, 
      density: palette.lpcm, 
      repeat: 1,
      processingLightSource: laserSource
    };

    const ctx = { project, pm, laserSource, processingType, cfg, palette };

    if (cfg.type === 'sierpinski-gasket') {
      this.drawGasket(ctx, CX, CY - cfg.size / 2, cfg.size, cfg.iterations, cfg.iterations);
    } 
    else if (cfg.type === 'sierpinski-carpet') {
      this.drawCarpet(ctx, CX - cfg.size / 2, CY - cfg.size / 2, cfg.size, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'apollonian-gasket') {
      this.drawApollonian(ctx, CX, CY, cfg.size / 2, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'levy-c') {
      this.drawLevy(ctx, CX - cfg.size / 4, CY + cfg.size / 4, CX + cfg.size / 4, CY + cfg.size / 4, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'cantor-set') {
      this.drawCantor(ctx, CX - cfg.size / 2, CY - cfg.size / 2, cfg.size, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 't-square') {
      this.drawTSquare(ctx, CX, CY, cfg.size / 2, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'fractal-tree') {
      this.drawTree(ctx, CX, CY + cfg.size / 2, -Math.PI / 2, cfg.size / 3, cfg.iterations, cfg.angle, cfg.branchFactor, cfg.iterations);
    }
    else if (cfg.type === 'koch-snowflake') {
      this.drawKoch(ctx, CX, CY, cfg.size, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'dragon-curve') {
      this.drawDragon(ctx, CX, CY, cfg.size, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'barnsley-fern') {
      this.drawFern(ctx, CX, CY, cfg.size, cfg.iterations, cfg.iterations);
    }

    if (cfg.border) {
      XCSExporter.addRect(project, {
        x: CX, y: CY, width: cfg.size, height: cfg.size,
        layerColor: "#ffffff", laserSource, 
        processingType: "VECTOR_ENGRAVING",
        params: { power: 10, speed: 100, repeat: 1, processingLightSource: laserSource },
        extraDisplayData: { hideLabels: true }
      });
    }

    return project;
  },

  getColor(ctx, iter, maxIter) {
    const { cfg, palette } = ctx;
    const t = 1 - (iter / (maxIter || 1));
    const start = cfg.paletteOffset;
    const idx = cfg.colorRangeMode 
      ? Math.round(start + (cfg.rangeEndIdx - start) * t)
      : start;
    const entry = palette.entries[Math.max(0, Math.min(palette.entries.length - 1, idx))];
    return { rgb: entry.rgb, power: entry.power };
  },

  drawGasket(ctx, x, y, size, iter, maxIter) {
    if (iter === 0) {
      const h = size * Math.sqrt(3) / 2;
      const dPath = `M ${x} ${y} L ${x - size / 2} ${y + h} L ${x + size / 2} ${y + h} Z`;
      const color = this.getColor(ctx, iter, maxIter);
      const pm = { ...ctx.pm, power: color.power };
      XCSExporter.addPath(ctx.project, { dPath, x, y: y + h / 2, width: size, height: h, params: pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
      return;
    }
    const h = (size / 2) * Math.sqrt(3) / 2;
    this.drawGasket(ctx, x, y, size / 2, iter - 1, maxIter);
    this.drawGasket(ctx, x - size / 4, y + h, size / 2, iter - 1, maxIter);
    this.drawGasket(ctx, x + size / 4, y + h, size / 2, iter - 1, maxIter);
  },

  drawCarpet(ctx, x, y, size, iter, maxIter) {
    if (iter === 0) {
      const color = this.getColor(ctx, iter, maxIter);
      const pm = { ...ctx.pm, power: color.power };
      XCSExporter.addRect(ctx.project, { x: x + size / 2, y: y + size / 2, width: size, height: size, params: pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
      return;
    }
    const nextSize = size / 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) continue;
        this.drawCarpet(ctx, x + i * nextSize, y + j * nextSize, nextSize, iter - 1, maxIter);
      }
    }
  },

  drawApollonian(ctx, x, y, r, iter, maxIter) {
    const color = this.getColor(ctx, iter, maxIter);
    const pm = { ...ctx.pm, power: color.power };
    XCSExporter.addCircle(ctx.project, { x, y, width: r * 2, height: r * 2, params: ctx.pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
    if (iter === 0) return;
    const nextR = r / (1 + 2 / Math.sqrt(3)) * 1.5;
    for (let i = 0; i < 3; i++) {
      const ang = i * Math.PI * 2 / 3;
      this.drawApollonian(ctx, x + (r - nextR) * Math.cos(ang), y + (r - nextR) * Math.sin(ang), nextR, iter - 1, maxIter);
    }
  },

  drawLevy(ctx, x1, y1, x2, y2, iter, maxIter) {
    if (iter === 0) {
      const dPath = `M ${x1} ${y1} L ${x2} ${y2}`;
      const color = this.getColor(ctx, iter, maxIter);
      const pm = { ...ctx.pm, power: color.power };
      XCSExporter.addPath(ctx.project, { dPath, x: (x1 + x2) / 2, y: (y1 + y2) / 2, width: Math.abs(x1 - x2), height: Math.abs(y1 - y2), params: pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
      return;
    }
    const dx = x2 - x1, dy = y2 - y1;
    const x3 = x1 + (dx - dy) / 2, y3 = y1 + (dx + dy) / 2;
    this.drawLevy(ctx, x1, y1, x3, y3, iter - 1, maxIter);
    this.drawLevy(ctx, x3, y3, x2, y2, iter - 1, maxIter);
  },

  drawCantor(ctx, x, y, w, iter, maxIter) {
    const color = this.getColor(ctx, iter, maxIter);
    const pm = { ...ctx.pm, power: color.power };
    XCSExporter.addRect(ctx.project, { x: x + w / 2, y, width: w, height: 2, params: pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
    if (iter === 0) return;
    this.drawCantor(ctx, x, y + 5, w / 3, iter - 1, maxIter);
    this.drawCantor(ctx, x + 2 * w / 3, y + 5, w / 3, iter - 1, maxIter);
  },

  drawTSquare(ctx, x, y, r, iter, maxIter) {
    const color = this.getColor(ctx, iter, maxIter);
    const pm = { ...ctx.pm, power: color.power };
    XCSExporter.addRect(ctx.project, { x, y, width: r * 2, height: r * 2, params: pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
    if (iter === 0) return;
    const nextR = r / 2;
    this.drawTSquare(ctx, x - r, y - r, nextR, iter - 1, maxIter);
    this.drawTSquare(ctx, x + r, y - r, nextR, iter - 1, maxIter);
    this.drawTSquare(ctx, x - r, y + r, nextR, iter - 1, maxIter);
    this.drawTSquare(ctx, x + r, y + r, nextR, iter - 1, maxIter);
  },

  drawTree(ctx, x, y, angle, length, iter, branchAngle, branchFactor, maxIter) {
    const x2 = x + length * Math.cos(angle);
    const y2 = y + length * Math.sin(angle);
    const dPath = `M ${x} ${y} L ${x2} ${y2}`;
    const color = this.getColor(ctx, iter, maxIter);
    const pm = { ...ctx.pm, power: color.power };
    XCSExporter.addPath(ctx.project, { dPath, x: (x + x2) / 2, y: (y + y2) / 2, width: Math.abs(x - x2), height: Math.abs(y - y2), params: pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
    if (iter === 0) return;
    this.drawTree(ctx, x2, y2, angle - branchAngle * Math.PI / 180, length * branchFactor, iter - 1, branchAngle, branchFactor, maxIter);
    this.drawTree(ctx, x2, y2, angle + branchAngle * Math.PI / 180, length * branchFactor, iter - 1, branchAngle, branchFactor, maxIter);
  },

  drawKoch(ctx, cx, cy, size, iter, maxIter) {
    const h = size * Math.sqrt(3) / 6;
    const p1 = [cx - size / 2, cy + h];
    const p2 = [cx + size / 2, cy + h];
    const p3 = [cx, cy - 2 * h];
    
    const drawLine = (p1, p2, i) => {
      if (i === 0) {
        const dPath = `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]}`;
        const color = this.getColor(ctx, i, maxIter);
        const pm = { ...ctx.pm, power: color.power };
        XCSExporter.addPath(ctx.project, { dPath, x: (p1[0] + p2[0]) / 2, y: (p1[1] + p2[1]) / 2, width: Math.abs(p1[0] - p2[0]), height: Math.abs(p1[1] - p2[1]), params: pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
        return;
      }
      const dx = (p2[0] - p1[0]) / 3, dy = (p2[1] - p1[1]) / 3;
      const m1 = [p1[0] + dx, p1[1] + dy];
      const m2 = [p1[0] + 2 * dx, p1[1] + 2 * dy];
      const s = [m1[0] + dx / 2 - dy * Math.sqrt(3) / 2, m1[1] + dy / 2 + dx * Math.sqrt(3) / 2];
      drawLine(p1, m1, i - 1);
      drawLine(m1, s, i - 1);
      drawLine(s, m2, i - 1);
      drawLine(m2, p2, i - 1);
    };
    
    drawLine(p1, p2, iter);
    drawLine(p2, p3, iter);
    drawLine(p3, p1, iter);
  },

  drawDragon(ctx, cx, cy, size, iter, maxIter) {
    let points = [[cx - size / 2, cy], [cx + size / 2, cy]];
    for (let i = 0; i < iter; i++) {
      const next = [];
      for (let j = 0; j < points.length - 1; j++) {
        const p1 = points[j], p2 = points[j + 1];
        const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
        const p3 = j % 2 === 0 ? [p1[0] + (dx - dy) / 2, p1[1] + (dx + dy) / 2] : [p1[0] + (dx + dy) / 2, p1[1] + (dy - dx) / 2];
        next.push(p1, p3);
      }
      next.push(points[points.length - 1]);
      points = next;
    }
    const dPath = "M" + points.map(p => p.join(",")).join("L");
    const color = this.getColor(ctx, 0, maxIter);
    const pm = { ...ctx.pm, power: color.power };
    XCSExporter.addPath(ctx.project, { dPath, x: cx, y: cy, width: size, height: size, params: pm, processingType: ctx.processingType, laserSource: ctx.laserSource, layerColor: color.rgb });
  },

  drawFern(ctx, cx, cy, size, iter, maxIter) {
    let x = 0, y = 0;
    const points = [];
    const iterations = Math.min(iter * 500, 5000);
    for (let i = 0; i < iterations; i++) {
      const r = Math.random();
      let nx, ny;
      if (r < 0.01) { nx = 0; ny = 0.16 * y; }
      else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
      else if (r < 0.93) { nx = 0.2 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
      else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
      x = nx; y = ny;
      points.push([cx + x * size / 10, cy - y * size / 10 + size / 2]);
    }
    const color = this.getColor(ctx, 0, maxIter);
    const pm = { ...ctx.pm, power: color.power };
    points.forEach(p => {
      XCSExporter.addCircle(ctx.project, { x: p[0], y: p[1], width: 0.1, height: 0.1, params: pm, processingType: 'VECTOR_ENGRAVING', laserSource: ctx.laserSource, layerColor: color.rgb });
    });
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const rebuild = () => this.renderControls(tabId);

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return;

    const fillableTypes = ['sierpinski-gasket', 'sierpinski-carpet', 'apollonian-gasket', 'cantor-set', 't-square'];
    const supportsFill = fillableTypes.includes(cfg.type);

    scroll.appendChild(UI.makeGeneralSettingsSection(cfg, set, rebuild, App.palettes, palette, {
      supportPath: true,
      supportFill: supportsFill,
      supportColorRange: true, 
      supportBorder: true,
      minSize: 10,
      maxSize: 200
    }));

    scroll.appendChild(UI.makeSection('Fractal Settings', [
      UI.makeRow('Iterations', UI.makeRange(1, 10, 1, cfg.iterations, v => set('iterations', +v)))
    ]));

    if (cfg.type === 'fractal-tree') {
      scroll.appendChild(UI.makeSection('Tree Settings', [
        UI.makeRow('Branch Angle', UI.makeRange(1, 90, 1, cfg.angle, v => set('angle', +v))),
        UI.makeRow('Branch Factor', UI.makeRange(0.1, 0.9, 0.05, cfg.branchFactor, v => set('branchFactor', +v)))
      ]));
    }
  }
};

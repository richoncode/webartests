import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { UI, uuid } from '../utils.js';
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
      branchFactor: 0.7,
      // Mandelbrot / Julia
      juliaReal: -0.7, juliaImag: 0.27,
      zoom: 1.0, centerX: 0, centerY: 0,
      gridResolution: 60,
      stemScaling: 9.0,
      squareRotation: 0.1,
      rectScale: 0.8, rectRotation: 10,
      polySides: 6, polyScale: 0.8, polyRotation: 10,
      starPoints: 5, starInset: 0.5, starScale: 0.8, starRotation: 10,
      cesaroAngle: 85
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;

    const fillableTypes = ['sierpinski-gasket', 'sierpinski-carpet', 'apollonian-gasket', 'cantor-set', 't-square', 'vicsek-fractal', 'mandelbrot', 'julia-set', 'pythagoras-tree', 'menger-sponge-2d', 'recursive-squares', 'recursive-circles', 'recursive-rects', 'recursive-polygons', 'recursive-stars', 'sierpinski-pentagon', 'cesaro-fractal', 'sierpinski-hexagon'];
    if (!fillableTypes.includes(cfg.type)) {
      cfg.renderMode = 'path';
    }

    if (cfg.totalSize !== undefined) {
      cfg.size = cfg.totalSize;
      delete cfg.totalSize;
    }
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'fractal', pane, cfg, state };

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Fractal';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.project = this.generateXCS(inst.cfg);
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
    
    const entryIdx = cfg.paletteOffset % palette.entries.length;
    const entry = palette.entries[entryIdx];
    const pm = PalMgr.getParams(cfg.paletteId, entryIdx);

    const ctx = { project, pm, laserSource, isFill, cfg, palette };

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
    else if (cfg.type === 'vicsek-fractal') {
      this.drawVicsek(ctx, CX - cfg.size / 2, CY - cfg.size / 2, cfg.size, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'menger-sponge-2d') {
      this.drawMenger(ctx, CX - cfg.size / 2, CY - cfg.size / 2, cfg.size, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'recursive-circles') {
      this.drawRecursiveCircles(ctx, CX, CY, cfg.size / 2, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'recursive-rects') {
      this.drawRecursiveRects(ctx, CX, CY, cfg.size, cfg.size, 0, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'recursive-polygons') {
      this.drawRecursivePolygons(ctx, CX, CY, cfg.size / 2, 0, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'recursive-stars') {
      this.drawRecursiveStars(ctx, CX, CY, cfg.size / 2, 0, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'sierpinski-pentagon') {
      this.drawPentagonGasket(ctx, CX, CY, cfg.size / 2, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'cesaro-fractal') {
      this.drawCesaro(ctx, CX - cfg.size / 2, CY, CX + cfg.size / 2, CY, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'sierpinski-hexagon') {
      this.drawHexagonGasket(ctx, CX, CY, cfg.size / 2, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'pythagoras-tree') {
      this.drawPythagoras(ctx, CX, CY + cfg.size / 2, cfg.size / 5, -Math.PI / 2, cfg.iterations, cfg.iterations);
    }
    else if (cfg.type === 'mandelbrot') {
      this.drawMandelbrot(ctx, CX, CY, cfg.size);
    }
    else if (cfg.type === 'julia-set') {
      this.drawJulia(ctx, CX, CY, cfg.size);
    }
    else if (cfg.type === 'recursive-squares') {
      let currentSize = cfg.size;
      let angle = 0;
      const totalSteps = cfg.iterations * 3;
      for (let i = 0; i < totalSteps; i++) {
        const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, i, totalSteps);
        const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
        
        const s2 = currentSize / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        // Standard rotation matrix points for a square centered at CX, CY
        const p1x = CX + (-s2 * cos - -s2 * sin);
        const p1y = CY + (-s2 * sin + -s2 * cos);
        const p2x = CX + (s2 * cos - -s2 * sin);
        const p2y = CY + (s2 * sin + -s2 * cos);
        const p3x = CX + (s2 * cos - s2 * sin);
        const p3y = CY + (s2 * sin + s2 * cos);
        const p4x = CX + (-s2 * cos - s2 * sin);
        const p4y = CY + (-s2 * sin + s2 * cos);

        const dPath = `M ${p1x.toFixed(3)} ${p1y.toFixed(3)} L ${p2x.toFixed(3)} ${p2y.toFixed(3)} L ${p3x.toFixed(3)} ${p3y.toFixed(3)} L ${p4x.toFixed(3)} ${p4y.toFixed(3)} Z`;
        
        XCSExporter.addPath(ctx.project, { 
          dPath, x: CX, y: CY, width: currentSize, height: currentSize, 
          params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
          extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true } 
        });
        
        const rot = cfg.squareRotation || 0.1;
        currentSize *= Math.cos(rot);
        angle += rot;
        if (currentSize < 1) break;
      }
    }

    if (cfg.border) {
      XCSExporter.addRect(project, {
        x: CX, y: CY, width: cfg.size, height: cfg.size,
        layerColor: "#ffffff", laserSource, 
        isFill: false,
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
    const end = cfg.rangeEndIdx !== undefined ? cfg.rangeEndIdx : 10;
    const idx = cfg.colorRangeMode 
      ? Math.round(start + (end - start) * t)
      : start;
    const actualIdx = Math.max(0, Math.min(palette.entries.length - 1, idx));
    const entry = palette.entries[actualIdx];
    return { rgb: entry.rgb, idx: actualIdx, t, paletteName: palette.name, colorName: entry.label, entry };
  },

  drawGasket(ctx, x, y, size, iter, maxIter) {
    if (iter === 0) {
      const h = size * Math.sqrt(3) / 2;
      const dPath = `M ${x} ${y} L ${x - size / 2} ${y + h} L ${x + size / 2} ${y + h} Z`;
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      XCSExporter.addPath(ctx.project, { dPath, x, y: y + h / 2, width: size, height: h, params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: actualT, hideLabels: true, paletteName, colorName } });
      return;
    }
    const h = (size / 2) * Math.sqrt(3) / 2;
    this.drawGasket(ctx, x, y, size / 2, iter - 1, maxIter);
    this.drawGasket(ctx, x - size / 4, y + h, size / 2, iter - 1, maxIter);
    this.drawGasket(ctx, x + size / 4, y + h, size / 2, iter - 1, maxIter);
  },

  drawCarpet(ctx, x, y, size, iter, maxIter) {
    if (iter === 0) {
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      XCSExporter.addRect(ctx.project, { x: x + size / 2, y: y + size / 2, width: size, height: size, params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: actualT, hideLabels: true, paletteName, colorName } });
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
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    XCSExporter.addCircle(ctx.project, { x, y, width: r * 2, height: r * 2, params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: actualT, hideLabels: true, paletteName, colorName } });
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
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      XCSExporter.addPath(ctx.project, { dPath, x: (x1 + x2) / 2, y: (y1 + y2) / 2, width: Math.abs(x1 - x2), height: Math.abs(y1 - y2), params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: actualT, hideLabels: true, paletteName, colorName } });
      return;
    }
    const dx = x2 - x1, dy = y2 - y1;
    const x3 = x1 + (dx - dy) / 2, y3 = y1 + (dx + dy) / 2;
    this.drawLevy(ctx, x1, y1, x3, y3, iter - 1, maxIter);
    this.drawLevy(ctx, x3, y3, x2, y2, iter - 1, maxIter);
  },

  drawCantor(ctx, x, y, w, iter, maxIter) {
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    XCSExporter.addRect(ctx.project, { x: x + w / 2, y, width: w, height: 2, params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: actualT, hideLabels: true, paletteName, colorName } });
    if (iter === 0) return;
    this.drawCantor(ctx, x, y + 5, w / 3, iter - 1, maxIter);
    this.drawCantor(ctx, x + 2 * w / 3, y + 5, w / 3, iter - 1, maxIter);
  },

  drawTSquare(ctx, x, y, r, iter, maxIter) {
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    XCSExporter.addRect(ctx.project, { x, y, width: r * 2, height: r * 2, params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: actualT, hideLabels: true, paletteName, colorName } });
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
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    XCSExporter.addPath(ctx.project, { dPath, x: (x + x2) / 2, y: (y + y2) / 2, width: Math.abs(x - x2), height: Math.abs(y - y2), params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: actualT, hideLabels: true, paletteName, colorName } });
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
        const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, i, maxIter);
        const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
        XCSExporter.addPath(ctx.project, { dPath, x: (p1[0] + p2[0]) / 2, y: (p1[1] + p2[1]) / 2, width: Math.abs(p1[0] - p2[0]), height: Math.abs(p1[1] - p2[1]), params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: actualT, hideLabels: true, paletteName, colorName } });
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
    const { rgb, idx, paletteName, colorName } = this.getColor(ctx, 0, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    XCSExporter.addPath(ctx.project, { dPath, x: cx, y: cy, width: size, height: size, params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb, extraDisplayData: { t: 0, hideLabels: true, paletteName, colorName } });
  },

  drawFern(ctx, cx, cy, size, iter, maxIter) {
    let x = 0, y = 0;
    const points = [];
    const iterations = Math.min(iter * 500, 5000);
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (let i = 0; i < iterations; i++) {
      const r = Math.random();
      let nx, ny;
      if (r < 0.01) { nx = 0; ny = 0.16 * y; }
      else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
      else if (r < 0.93) { nx = 0.2 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
      else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
      x = nx; y = ny;
      
      const px = cx + x * size / 10;
      const py = cy - y * size / 10 + size / 2;
      points.push([px, py]);
      
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const maxDist = Math.sqrt(Math.pow(maxX - midX, 2) + Math.pow(maxY - midY, 2)) || 1;

    points.forEach(p => {
      const dist = Math.sqrt(Math.pow(p[0] - midX, 2) + Math.pow(p[1] - midY, 2));
      const t = Math.min(1, dist / maxDist);
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, Math.round((1-t)*10), 10);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      
      // Scale up as t approaches 0 (near center/stem)
      const dotSize = 0.1 * (1 + (ctx.cfg.stemScaling - 1) * (1 - t));

      XCSExporter.addCircle(ctx.project, { 
        x: p[0], y: p[1], width: dotSize, height: dotSize, 
        params, isFill: false, laserSource: ctx.laserSource, layerColor: rgb,
        extraDisplayData: { t: t, paletteName, colorName, hideLabels: true }
      });
    });
  },

  drawVicsek(ctx, x, y, size, iter, maxIter) {
    if (iter === 0) {
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      XCSExporter.addRect(ctx.project, { 
        x: x + size / 2, y: y + size / 2, width: size, height: size, 
        params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
        extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
      });
      return;
    }

    const nextSize = size / 3;
    // Cross form: center, top, bottom, left, right
    this.drawVicsek(ctx, x + nextSize, y + nextSize, nextSize, iter - 1, maxIter);
    this.drawVicsek(ctx, x + nextSize, y, nextSize, iter - 1, maxIter);
    this.drawVicsek(ctx, x + nextSize, y + 2 * nextSize, nextSize, iter - 1, maxIter);
    this.drawVicsek(ctx, x, y + nextSize, nextSize, iter - 1, maxIter);
    this.drawVicsek(ctx, x + 2 * nextSize, y + nextSize, nextSize, iter - 1, maxIter);
  },

  drawMenger(ctx, x, y, size, iter, maxIter) {
    if (iter === 0) {
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      XCSExporter.addRect(ctx.project, { 
        x: x + size / 2, y: y + size / 2, width: size, height: size, 
        params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
        extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
      });
      return;
    }
    const nextSize = size / 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) continue; // Skip center hole
        this.drawMenger(ctx, x + i * nextSize, y + j * nextSize, nextSize, iter - 1, maxIter);
      }
    }
  },

  drawRecursiveCircles(ctx, x, y, r, iter, maxIter) {
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    XCSExporter.addCircle(ctx.project, { 
      x, y, width: r * 2, height: r * 2, 
      params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
      extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
    });

    if (iter === 0) return;
    const nextR = r * 0.5;
    this.drawRecursiveCircles(ctx, x - nextR, y, nextR, iter - 1, maxIter);
    this.drawRecursiveCircles(ctx, x + nextR, y, nextR, iter - 1, maxIter);
    this.drawRecursiveCircles(ctx, x, y - nextR, nextR, iter - 1, maxIter);
    this.drawRecursiveCircles(ctx, x, y + nextR, nextR, iter - 1, maxIter);
  },

  drawRecursiveRects(ctx, x, y, w, h, angle, iter, maxIter) {
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    XCSExporter.addRect(ctx.project, { 
      x, y, width: w, height: h, angle,
      params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
      extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
    });

    if (iter === 0) return;
    const factor = ctx.cfg.rectScale || 0.8;
    const rot = ctx.cfg.rectRotation || 10;
    this.drawRecursiveRects(ctx, x, y, w * factor, h * factor, angle + rot, iter - 1, maxIter);
  },

  drawRecursivePolygons(ctx, x, y, r, angle, iter, maxIter) {
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    const sides = ctx.cfg.polySides || 6;
    
    let dPath = "";
    for (let i = 0; i <= sides; i++) {
      const a = angle + (i * Math.PI * 2) / sides;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      dPath += (i === 0 ? "M" : "L") + `${px.toFixed(3)} ${py.toFixed(3)}`;
    }

    XCSExporter.addPath(ctx.project, { 
      dPath: dPath + " Z", x, y, width: r * 2, height: r * 2, 
      params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
      extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
    });

    if (iter === 0) return;
    const factor = ctx.cfg.polyScale || 0.8;
    const rot = (ctx.cfg.polyRotation || 10) * Math.PI / 180;
    this.drawRecursivePolygons(ctx, x, y, r * factor, angle + rot, iter - 1, maxIter);
  },

  drawRecursiveStars(ctx, x, y, r, angle, iter, maxIter) {
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
    const points = ctx.cfg.starPoints || 5;
    const inset = ctx.cfg.starInset || 0.5;
    
    let dPath = "";
    for (let i = 0; i <= points * 2; i++) {
      const a = angle + (i * Math.PI) / points;
      const currR = i % 2 === 0 ? r : r * inset;
      const px = x + currR * Math.cos(a);
      const py = y + currR * Math.sin(a);
      dPath += (i === 0 ? "M" : "L") + `${px.toFixed(3)} ${py.toFixed(3)}`;
    }

    XCSExporter.addPath(ctx.project, { 
      dPath: dPath + " Z", x, y, width: r * 2, height: r * 2, 
      params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
      extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
    });

    if (iter === 0) return;
    const factor = ctx.cfg.starScale || 0.8;
    const rot = (ctx.cfg.starRotation || 10) * Math.PI / 180;
    this.drawRecursiveStars(ctx, x, y, r * factor, angle + rot, iter - 1, maxIter);
  },

  drawPentagonGasket(ctx, x, y, r, iter, maxIter) {
    if (iter === 0) {
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      let dPath = "";
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = x + r * Math.cos(a);
        const py = y + r * Math.sin(a);
        dPath += (i === 0 ? "M" : "L") + `${px.toFixed(3)} ${py.toFixed(3)}`;
      }
      XCSExporter.addPath(ctx.project, { 
        dPath: dPath + " Z", x, y, width: r * 2, height: r * 2, 
        params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
        extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
      });
      return;
    }

    const factor = 1 / (1 + (1 + Math.sqrt(5)) / 2); // 1 / (1 + phi)
    const nextR = r * factor;
    const dist = r - nextR;
    
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      this.drawPentagonGasket(ctx, x + dist * Math.cos(a), y + dist * Math.sin(a), nextR, iter - 1, maxIter);
    }
  },

  drawCesaro(ctx, x1, y1, x2, y2, iter, maxIter) {
    if (iter === 0) {
      const dPath = `M ${x1.toFixed(3)} ${y1.toFixed(3)} L ${x2.toFixed(3)} ${y2.toFixed(3)}`;
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      XCSExporter.addPath(ctx.project, { 
        dPath, x: (x1 + x2) / 2, y: (y1 + y2) / 2, width: Math.abs(x1 - x2) || 0.1, height: Math.abs(y1 - y2) || 0.1, 
        params, isFill: false, laserSource: ctx.laserSource, layerColor: rgb,
        extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
      });
      return;
    }

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const cesaroAngle = (ctx.cfg.cesaroAngle || 85) * (Math.PI / 180);
    
    // Cesaro subdivision: 
    // Side length s = L / (2 * (1 + sin(angle/2)))
    const s = len / (2 * (1 + Math.sin(cesaroAngle / 2)));
    
    const p1x = x1 + s * Math.cos(angle);
    const p1y = y1 + s * Math.sin(angle);
    
    // Peak of the triangle
    const peakAngle = angle + (Math.PI - cesaroAngle) / 2;
    const p2x = p1x + s * Math.cos(peakAngle);
    const p2y = p1y + s * Math.sin(peakAngle);
    
    const peakAngleDown = peakAngle - (Math.PI - cesaroAngle);
    const p3x = p2x + s * Math.cos(peakAngleDown);
    const p3y = p2y + s * Math.sin(peakAngleDown);

    this.drawCesaro(ctx, x1, y1, p1x, p1y, iter - 1, maxIter);
    this.drawCesaro(ctx, p1x, p1y, p2x, p2y, iter - 1, maxIter);
    this.drawCesaro(ctx, p2x, p2y, p3x, p3y, iter - 1, maxIter);
    this.drawCesaro(ctx, p3x, p3y, x2, y2, iter - 1, maxIter);
  },

  drawHexagonGasket(ctx, x, y, r, iter, maxIter) {
    if (iter === 0) {
      const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
      const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
      let dPath = "";
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const px = x + r * Math.cos(a);
        const py = y + r * Math.sin(a);
        dPath += (i === 0 ? "M" : "L") + `${px.toFixed(3)} ${py.toFixed(3)}`;
      }
      XCSExporter.addPath(ctx.project, { 
        dPath: dPath + " Z", x, y, width: r * 2, height: r * 2, 
        params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
        extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
      });
      return;
    }

    const factor = 1 / 3;
    const nextR = r * (1 - factor); // Center-to-center distance is 2/3 of R
    const drawR = r * factor;
    
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      this.drawHexagonGasket(ctx, x + nextR * Math.cos(a), y + nextR * Math.sin(a), drawR, iter - 1, maxIter);
    }
    // Also draw center one
    this.drawHexagonGasket(ctx, x, y, drawR, iter - 1, maxIter);
  },

  drawPythagoras(ctx, x, y, size, angle, iter, maxIter) {
    if (iter < 0) return;
    
    // Bottom corners
    const x1 = x - (size / 2) * Math.cos(angle + Math.PI / 2);
    const y1 = y - (size / 2) * Math.sin(angle + Math.PI / 2);
    const x2 = x + (size / 2) * Math.cos(angle + Math.PI / 2);
    const y2 = y + (size / 2) * Math.sin(angle + Math.PI / 2);
    
    // Top corners
    const x3 = x2 + size * Math.cos(angle);
    const y3 = y2 + size * Math.sin(angle);
    const x4 = x1 + size * Math.cos(angle);
    const y4 = y1 + size * Math.sin(angle);

    const dPath = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`;
    const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
    const params = PalMgr.getParams(ctx.cfg.paletteId, idx);

    XCSExporter.addPath(ctx.project, { 
      dPath, x: (x1+x2+x3+x4)/4, y: (y1+y2+y3+y4)/4, 
      width: size, height: size, 
      params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
      extraDisplayData: { t: actualT, paletteName, colorName, hideLabels: true }
    });


    if (iter === 0) return;

    const nextSize = size * Math.SQRT1_2;
    
    // Left branch pivot at x4,y4
    const leftAngle = angle - Math.PI / 4;
    const leftCenterX = x4 + (nextSize / 2) * Math.cos(leftAngle) - (nextSize / 2) * Math.cos(leftAngle + Math.PI / 2);
    const leftCenterY = y4 + (nextSize / 2) * Math.sin(leftAngle) - (nextSize / 2) * Math.sin(leftAngle + Math.PI / 2);
    this.drawPythagoras(ctx, leftCenterX, leftCenterY, nextSize, leftAngle, iter - 1, maxIter);

    // Right branch pivot at x3,y3
    const rightAngle = angle + Math.PI / 4;
    const rightCenterX = x3 + (nextSize / 2) * Math.cos(rightAngle) + (nextSize / 2) * Math.cos(rightAngle + Math.PI / 2);
    const rightCenterY = y3 + (nextSize / 2) * Math.sin(rightAngle) + (nextSize / 2) * Math.sin(rightAngle + Math.PI / 2);
    this.drawPythagoras(ctx, rightCenterX, rightCenterY, nextSize, rightAngle, iter - 1, maxIter);
  },

  drawMandelbrot(ctx, cx, cy, size) {
    const res = ctx.cfg.gridResolution || 60; // Use slider value
    const step = size / res;
    const maxIter = ctx.cfg.iterations * 10;
    
    for (let iy = 0; iy < res; iy++) {
      for (let ix = 0; ix < res; ix++) {
        const x0 = ((ix / res - 0.5) * 3.5) / ctx.cfg.zoom + ctx.cfg.centerX;
        const y0 = ((iy / res - 0.5) * 3.5) / ctx.cfg.zoom + ctx.cfg.centerY;
        
        let x = 0, y = 0, iter = 0;
        while (x*x + y*y <= 4 && iter < maxIter) {
          const xtemp = x*x - y*y + x0;
          y = 2*x*y + y0;
          x = xtemp;
          iter++;
        }
        
        if (iter < maxIter) {
          const tValue = iter / maxIter;
          const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
          const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
          XCSExporter.addRect(ctx.project, { 
            x: cx + (ix/res-0.5)*size, y: cy + (iy/res-0.5)*size, 
            width: step*0.95, height: step*0.95, 
            params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
            extraDisplayData: { t: tValue, paletteName, colorName, hideLabels: true }
          });
        }
      }
    }
  },

  drawJulia(ctx, cx, cy, size) {
    const res = ctx.cfg.gridResolution || 60; // Use slider value
    const step = size / res;
    const maxIter = ctx.cfg.iterations * 10;
    const cr = ctx.cfg.juliaReal, ci = ctx.cfg.juliaImag;
    
    for (let iy = 0; iy < res; iy++) {
      for (let ix = 0; ix < res; ix++) {
        let x = ((ix / res - 0.5) * 3.5) / ctx.cfg.zoom + ctx.cfg.centerX;
        let y = ((iy / res - 0.5) * 3.5) / ctx.cfg.zoom + ctx.cfg.centerY;
        let iter = 0;
        
        while (x*x + y*y <= 4 && iter < maxIter) {
          const xtemp = x*x - y*y + cr;
          y = 2*x*y + ci;
          x = xtemp;
          iter++;
        }
        
        if (iter < maxIter) {
          const tValue = iter / maxIter;
          const { rgb, idx, t: actualT, paletteName, colorName } = this.getColor(ctx, iter, maxIter);
          const params = PalMgr.getParams(ctx.cfg.paletteId, idx);
          XCSExporter.addRect(ctx.project, { 
            x: cx + (ix/res-0.5)*size, y: cy + (iy/res-0.5)*size, 
            width: step*0.95, height: step*0.95, 
            params, isFill: ctx.isFill, laserSource: ctx.laserSource, layerColor: rgb,
            extraDisplayData: { t: tValue, paletteName, colorName, hideLabels: true }
          });
        }
      }
    }
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const rebuild = () => this.renderControls(tabId);

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return;

    const fillableTypes = ['sierpinski-gasket', 'sierpinski-carpet', 'apollonian-gasket', 'cantor-set', 't-square', 'vicsek-fractal', 'mandelbrot', 'julia-set', 'pythagoras-tree', 'menger-sponge-2d', 'recursive-squares', 'recursive-circles', 'recursive-rects', 'recursive-polygons', 'recursive-stars', 'sierpinski-pentagon', 'cesaro-fractal', 'sierpinski-hexagon'];
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
      UI.makeRow('Iterations', UI.makeRange(1, 10, 1, cfg.iterations, v => set('iterations', +v))),
      ...(cfg.type === 'barnsley-fern' ? [UI.makeRow('Stem Dot Scaling', UI.makeRange(1, 10, 0.5, cfg.stemScaling, v => set('stemScaling', +v)))] : []),
      ...(cfg.type === 'recursive-squares' ? [UI.makeRow('Rotation Step', UI.makeRange(0.01, 0.5, 0.01, cfg.squareRotation, v => set('squareRotation', +v)))] : []),
      ...(cfg.type === 'recursive-rects' ? [
        UI.makeRow('Scale Factor', UI.makeRange(0.1, 0.95, 0.01, cfg.rectScale, v => set('rectScale', +v))),
        UI.makeRow('Rotation', UI.makeRange(-45, 45, 1, cfg.rectRotation, v => set('rectRotation', +v), '°'))
      ] : []),
      ...(cfg.type === 'recursive-polygons' ? [
        UI.makeRow('Sides', UI.makeStepCounter(cfg.polySides, 3, 12, v => set('polySides', v))),
        UI.makeRow('Scale Factor', UI.makeRange(0.1, 0.95, 0.01, cfg.polyScale, v => set('polyScale', +v))),
        UI.makeRow('Rotation', UI.makeRange(-45, 45, 1, cfg.polyRotation, v => set('polyRotation', +v), '°'))
      ] : []),
      ...(cfg.type === 'recursive-stars' ? [
        UI.makeRow('Points', UI.makeStepCounter(cfg.starPoints, 3, 12, v => set('starPoints', v))),
        UI.makeRow('Inset', UI.makeRange(0.1, 0.9, 0.05, cfg.starInset, v => set('starInset', +v))),
        UI.makeRow('Scale Factor', UI.makeRange(0.1, 0.95, 0.01, cfg.starScale, v => set('starScale', +v))),
        UI.makeRow('Rotation', UI.makeRange(-45, 45, 1, cfg.starRotation, v => set('starRotation', +v), '°'))
      ] : []),
      ...(cfg.type === 'cesaro-fractal' ? [
        UI.makeRow('Angle', UI.makeRange(60, 120, 1, cfg.cesaroAngle, v => set('cesaroAngle', +v), '°'))
      ] : [])
    ]));

    if (cfg.type === 'fractal-tree') {
      scroll.appendChild(UI.makeSection('Tree Settings', [
        UI.makeRow('Branch Angle', UI.makeRange(1, 90, 1, cfg.angle, v => set('angle', +v))),
        UI.makeRow('Branch Factor', UI.makeRange(0.1, 0.9, 0.05, cfg.branchFactor, v => set('branchFactor', +v)))
      ]));
    } else if (cfg.type === 'mandelbrot' || cfg.type === 'julia-set') {
      const isJulia = cfg.type === 'julia-set';
      scroll.appendChild(UI.makeSection(isJulia ? 'Julia Settings' : 'Mandelbrot Settings', [
        ...(isJulia ? [
          UI.makeRow('Real (c)', UI.makeRange(-2, 2, 0.01, cfg.juliaReal, v => set('juliaReal', +v))),
          UI.makeRow('Imag (c)', UI.makeRange(-2, 2, 0.01, cfg.juliaImag, v => set('juliaImag', +v)))
        ] : []),
        UI.makeRow('Zoom', UI.makeRange(0.1, 10, 0.1, cfg.zoom, v => set('zoom', +v))),
        UI.makeRow('Center X', UI.makeRange(-2, 2, 0.01, cfg.centerX, v => set('centerX', +v))),
        UI.makeRow('Center Y', UI.makeRange(-2, 2, 0.01, cfg.centerY, v => set('centerY', +v))),
        UI.makeRow('Iterations', UI.makeRange(1, 10, 1, cfg.iterations, v => set('iterations', +v))),
        UI.makeRow('Grid Density', UI.makeRange(10, 100, 2, cfg.gridResolution, v => set('gridResolution', +v)))
      ]));
    }
  }
};

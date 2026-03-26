import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { UI } from '../utils.js';
import { XCSExporter } from '../xcs-exporter.js';
import { PalMgr } from '../palettes.js';

export const PathTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Space-Filling Paths</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const defaults = {
      type: 'hilbert',
      size: 80,
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
      colorRangeMode: false,
      colorStrategy: 'path',
      rangeEndIdx: 10,
      renderMode: 'path',
      border: false,
      order: 4
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    if (cfg.totalSize !== undefined) {
      cfg.size = cfg.totalSize;
      delete cfg.totalSize;
    }
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'path', pane, cfg, state };

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Path Curve';
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

    const mode = cfg.mode || cfg.type;

    if (mode === 'hilbert') {
      this.drawHilbert(project, cfg, pm, entry.rgb, isFill, laserSource, CX, CY, palette);
    } 
    else if (mode === 'peano') {
      this.drawPeano(project, cfg, pm, entry.rgb, isFill, laserSource, CX, CY, palette);
    }
    else if (mode === 'gosper') {
      this.drawLSystem(project, 'A', { 'A': 'A-B--B+A++AA+B-', 'B': '+A-BB--B-A++A+B' }, 60, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'moore') {
      this.drawLSystem(project, 'LFL+F+LFL', { 'L': '-RF+LFL+FR-', 'R': '+LF-RFR-FL+' }, 90, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'sierpinski-arrowhead') {
      this.drawLSystem(project, 'AF', { 'A': 'BF-AF-B', 'B': 'AF+BF+A' }, 60, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'lebesgue') {
      this.drawLebesgue(project, cfg, pm, entry.rgb, isFill, laserSource, CX, CY, palette);
    }
    else if (mode === 'morton') {
      this.drawMorton(project, cfg, pm, entry.rgb, isFill, laserSource, CX, CY, palette);
    }
    else if (mode === 'h-tree') {
      this.drawHTree(project, CX, CY, cfg.size, cfg.order, pm, entry.rgb, isFill, laserSource, cfg, palette);
    }
    else if (mode === 'lsystem-grid') {
      this.drawLSystem(project, 'F+F+F+F', { 'F': 'FF+F+F+F+FF' }, 90, Math.min(4, cfg.order), pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'dragon-folding') {
      this.drawLSystem(project, 'FX', { 'X': 'X+YF+', 'Y': '-FX-Y' }, 90, Math.min(12, cfg.order), pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'sierpinski-curve') {
      this.drawLSystem(project, 'F+XF+F+XF', { 'X': 'XF-F+F-XF+F+XF-F+F-X' }, 90, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'l-system-plant') {
      this.drawLSystem(project, 'X', { 'X': 'F-[[X]+X]+F[+FX]-X', 'F': 'FF' }, 25, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'l-system-algae') {
      this.drawLSystem(project, 'A', { 'A': 'AB', 'B': 'A' }, 60, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'koch-island') {
      this.drawLSystem(project, 'F-F-F-F', { 'F': 'F-F+F+FF-F-F+F' }, 90, Math.min(4, cfg.order), pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'fass-curve') {
      this.drawLSystem(project, 'L', { 'L': 'L+R++R-L--LL-R+', 'R': '-L+RR++R+L--L-R' }, 60, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'cross') {
      this.drawLSystem(project, 'F+F+F+F', { 'F': 'F+F-F-F+F' }, 90, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'quadratic-snowflake') {
      this.drawLSystem(project, 'F+F+F+F', { 'F': 'F-F+F+F-F' }, 90, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'terdragon') {
      this.drawLSystem(project, 'F', { 'F': 'F+F-F' }, 120, cfg.order, pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
    }
    else if (mode === 'minkowski') {
      this.drawLSystem(project, 'F+F+F+F', { 'F': 'F+F-F-FF+F+F-F' }, 90, Math.min(4, cfg.order), pm, entry.rgb, isFill, laserSource, CX, CY, cfg.size, cfg, palette);
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

  getSegmentParams(cfg, palette, t, distT) {
    const start = cfg.paletteOffset || 0;
    const end = cfg.rangeEndIdx !== undefined ? cfg.rangeEndIdx : 10;
    
    // Choose between path-progress (t) or center-distance (distT)
    const interpolationValue = (cfg.colorStrategy === 'center' && distT !== undefined) ? distT : t;
    
    const idx = cfg.colorRangeMode ? Math.round(start + (end - start) * interpolationValue) : start;
    const actualIdx = Math.max(0, Math.min(palette.entries.length - 1, idx));
    const entry = palette.entries[actualIdx];
    return {
      params: PalMgr.getParams(cfg.paletteId, actualIdx),
      color: entry.rgb,
      paletteName: palette.name,
      colorName: entry.label,
      t: interpolationValue
    };
  },

  drawHilbert(project, cfg, pm, color, isFill, laserSource, CX, CY, palette) {
    const order = cfg.order;
    const n = Math.pow(2, order);
    const total = n * n;
    const step = cfg.size / n;
    const radius = cfg.size / 2;
    
    if (cfg.colorRangeMode) {
      let prevPx, prevPy;
      for (let i = 0; i < total; i++) {
        const { x, y } = this.hilbertCoord(i, n);
        const px = CX - cfg.size / 2 + x * step + step / 2;
        const py = CY - cfg.size / 2 + y * step + step / 2;
        if (i > 0) {
          const t = i / (total - 1);
          const d = Math.sqrt(Math.pow(px - CX, 2) + Math.pow(py - CY, 2));
          const distT = Math.min(1, d / radius);

          const { params, color: segColor, paletteName, colorName } = this.getSegmentParams(cfg, palette, t, distT);
          XCSExporter.addPath(project, { 
            dPath: `M ${prevPx.toFixed(3)} ${prevPy.toFixed(3)} L ${px.toFixed(3)} ${py.toFixed(3)}`, 
            x: (prevPx + px) / 2, y: (prevPy + py) / 2, 
            width: Math.abs(px - prevPx) || 0.1, height: Math.abs(py - prevPy) || 0.1, 
            params, isFill, laserSource, layerColor: segColor, 
            extraDisplayData: { t: (cfg.colorStrategy === 'center' ? distT : t), hideLabels: true, paletteName, colorName } 
          });
        }
        prevPx = px; prevPy = py;
      }
    } else {
      let dPath = '';
      for (let i = 0; i < total; i++) {
        const { x, y } = this.hilbertCoord(i, n);
        const px = CX - cfg.size / 2 + x * step + step / 2;
        const py = CY - cfg.size / 2 + y * step + step / 2;
        dPath += (i === 0 ? 'M' : 'L') + `${px.toFixed(3)} ${py.toFixed(3)}`;
      }
      const entryIdx = (cfg.paletteOffset || 0) % palette.entries.length;
      const entry = palette.entries[entryIdx];
      XCSExporter.addPath(project, { 
        dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, 
        params: pm, isFill, laserSource, layerColor: color, 
        extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label } 
      });
    }
  },

  hilbertCoord(i, n) {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }];
    let index = i & 3;
    let v = pts[index];
    for (let j = 1; j < Math.log2(n); j++) {
      i = i >>> 2;
      index = i & 3;
      const len = Math.pow(2, j);
      if (index === 0) {
        const tmp = v.x; v.x = v.y; v.y = tmp;
      } else if (index === 1) {
        v.y += len;
      } else if (index === 2) {
        v.x += len; v.y += len;
      } else if (index === 3) {
        const tmp = len - 1 - v.x; v.x = len - 1 - v.y; v.y = tmp;
        v.x += len;
      }
    }
    return v;
  },

  drawPeano(project, cfg, pm, color, isFill, laserSource, CX, CY, palette) {
    const rules = {
      'X': 'XFYFX+F+YFXFY-F-XFYFX',
      'Y': 'YFXFY-F-XFYFX+F+YFXFY'
    };
    let s = 'X';
    for (let i = 0; i < cfg.order; i++) {
      let next = '';
      for (const char of s) next += rules[char] || char;
      s = next;
    }

    const n = Math.pow(3, cfg.order);
    const step = 1.0; // Use unit step for calculation
    
    // First pass to find bounding box and count segments
    let x = 0, y = 0, a = 0;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    let segmentCount = 0;
    for (const char of s) {
      if (char === 'F') {
        x += step * Math.cos(a);
        y += step * Math.sin(a);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        segmentCount++;
      } else if (char === '+') a += Math.PI / 2;
      else if (char === '-') a -= Math.PI / 2;
    }

    // Calculate scale to fit exactly
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const scale = cfg.size / Math.max(w, h, 0.1);
    
    const radius = cfg.size / 2;
    
    if (cfg.colorRangeMode) {
      let currentSeg = 0;
      for (const char of s) {
        if (char === 'F') {
          const nx = x + step * scale * Math.cos(a);
          const ny = y + step * scale * Math.sin(a);
          const t = currentSeg / (segmentCount || 1);
          
          const d = Math.sqrt(Math.pow(nx - CX, 2) + Math.pow(ny - CY, 2));
          const distT = Math.min(1, d / radius);

          const { params, color: segColor, paletteName, colorName } = this.getSegmentParams(cfg, palette, t, distT);
          
          XCSExporter.addPath(project, { 
            dPath: `M ${x.toFixed(3)} ${y.toFixed(3)} L ${nx.toFixed(3)} ${ny.toFixed(3)}`, 
            x: (x + nx) / 2, y: (y + ny) / 2, 
            width: Math.abs(nx - x) || 0.1, height: Math.abs(ny - y) || 0.1, 
            params, isFill, laserSource, layerColor: segColor, 
            extraDisplayData: { t: (cfg.colorStrategy === 'center' ? distT : t), hideLabels: true, paletteName, colorName } 
          });
          
          x = nx; y = ny;
          currentSeg++;
        } else if (char === '+') a += Math.PI / 2;
        else if (char === '-') a -= Math.PI / 2;
      }
    } else {
      let dPath = `M ${x.toFixed(3)} ${y.toFixed(3)}`;
      for (const char of s) {
        if (char === 'F') {
          x += step * scale * Math.cos(a);
          y += step * scale * Math.sin(a);
          dPath += ` L ${x.toFixed(3)} ${y.toFixed(3)}`;
        } else if (char === '+') a += Math.PI / 2;
        else if (char === '-') a -= Math.PI / 2;
      }
      const entryIdx = (cfg.paletteOffset || 0) % palette.entries.length;
      const entry = palette.entries[entryIdx];
      XCSExporter.addPath(project, { 
        dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, 
        params: pm, isFill, laserSource, layerColor: color, 
        extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label } 
      });
    }
  },

  drawLebesgue(project, cfg, pm, color, isFill, laserSource, CX, CY, palette) {
    const order = cfg.order;
    const n = Math.pow(2, order);
    const total = n * n;
    const step = cfg.size / n;
    const radius = cfg.size / 2;
    
    const getZ = (idx) => {
      let x = 0, y = 0;
      for (let i = 0; i < order; i++) {
        x |= (idx & (1 << (2 * i))) >> i;
        y |= (idx & (1 << (2 * i + 1))) >> (i + 1);
      }
      return { x, y };
    };

    if (cfg.colorRangeMode) {
      let prevPx, prevPy;
      for (let i = 0; i < total; i++) {
        const coord = getZ(i);
        const px = CX - cfg.size / 2 + coord.x * step + step / 2;
        const py = CY - cfg.size / 2 + coord.y * step + step / 2;
        if (i > 0) {
          const t = i / (total - 1);
          const d = Math.sqrt(Math.pow(px - CX, 2) + Math.pow(py - CY, 2));
          const distT = Math.min(1, d / radius);

          const { params, color: segColor, paletteName, colorName } = this.getSegmentParams(cfg, palette, t, distT);
          XCSExporter.addPath(project, { 
            dPath: `M ${prevPx.toFixed(3)} ${prevPy.toFixed(3)} L ${px.toFixed(3)} ${py.toFixed(3)}`, 
            x: (prevPx + px) / 2, y: (prevPy + py) / 2, 
            width: Math.abs(px - prevPx) || 0.1, height: Math.abs(py - prevPy) || 0.1, 
            params, isFill, laserSource, layerColor: segColor, 
            extraDisplayData: { t: (cfg.colorStrategy === 'center' ? distT : t), hideLabels: true, paletteName, colorName } 
          });
        }
        prevPx = px; prevPy = py;
      }
    } else {
      let dPath = '';
      for (let i = 0; i < total; i++) {
        const { x, y } = getZ(i);
        const px = CX - cfg.size / 2 + x * step + step / 2;
        const py = CY - cfg.size / 2 + y * step + step / 2;
        dPath += (i === 0 ? 'M' : 'L') + `${px.toFixed(3)} ${py.toFixed(3)}`;
      }
      const entryIdx = (cfg.paletteOffset || 0) % palette.entries.length;
      const entry = palette.entries[entryIdx];
      XCSExporter.addPath(project, { 
        dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, 
        params: pm, isFill, laserSource, layerColor: color, 
        extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label } 
      });
    }
  },

  drawMorton(project, cfg, pm, color, isFill, laserSource, CX, CY, palette) {
    // Morton is effectively the same as Lebesgue Z-order in path terms
    this.drawLebesgue(project, cfg, pm, color, isFill, laserSource, CX, CY, palette);
  },

  drawHTree(project, cx, cy, size, order, pm, color, isFill, laserSource, cfg, palette) {
    const segments = [];
    const drawH = (x, y, s, n) => {
      const x0 = x - s / 2, x1 = x + s / 2;
      const y0 = y - s / 2, y1 = y + s / 2;
      
      // Horizontal bar
      segments.push({ x0, y0: y, x1, y1: y });
      // Left vertical
      segments.push({ x0, y0, x1: x0, y1 });
      // Right vertical
      segments.push({ x0: x1, y0, x1, y1 });

      if (n > 0) {
        const nextS = s / Math.sqrt(2);
        drawH(x0, y0, nextS, n - 1);
        drawH(x0, y1, nextS, n - 1);
        drawH(x1, y0, nextS, n - 1);
        drawH(x1, y1, nextS, n - 1);
      }
    };
    drawH(cx, cy, size / 2, order);

    if (cfg.colorRangeMode) {
      const radius = size / 2;
      segments.forEach((seg, i) => {
        const t = i / (segments.length - 1 || 1);
        const midX = (seg.x0 + seg.x1) / 2;
        const midY = (seg.y0 + seg.y1) / 2;
        const d = Math.sqrt(Math.pow(midX - cx, 2) + Math.pow(midY - cy, 2));
        const distT = Math.min(1, d / radius);

        const { params, color: segColor, paletteName, colorName } = this.getSegmentParams(cfg, palette, t, distT);
        XCSExporter.addPath(project, { 
          dPath: `M ${seg.x0.toFixed(3)} ${seg.y0.toFixed(3)} L ${seg.x1.toFixed(3)} ${seg.y1.toFixed(3)}`, 
          x: midX, y: midY, 
          width: Math.abs(seg.x1 - seg.x0) || 0.1, height: Math.abs(seg.y1 - seg.y0) || 0.1, 
          params, isFill, laserSource, layerColor: segColor, 
          extraDisplayData: { t: (cfg.colorStrategy === 'center' ? distT : t), hideLabels: true, paletteName, colorName } 
        });
      });
    }
 else {
      const dPath = segments.map(seg => `M ${seg.x0.toFixed(3)} ${seg.y0.toFixed(3)} L ${seg.x1.toFixed(3)} ${seg.y1.toFixed(3)}`).join(' ');
      const entryIdx = (cfg.paletteOffset || 0) % palette.entries.length;
      const entry = palette.entries[entryIdx];
      XCSExporter.addPath(project, { 
        dPath, x: cx, y: cy, width: size, height: size, 
        params: pm, isFill, laserSource, layerColor: color, 
        extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label } 
      });
    }
  },

  drawLSystem(project, axiom, rules, angle, iter, pm, color, isFill, laserSource, CX, CY, totalSize, cfg, palette) {
    let s = axiom;
    for (let i = 0; i < iter; i++) {
      let next = '';
      for (const char of s) next += rules[char] || char;
      s = next;
    }

    let stack = [];
    let x = 0, y = 0, a = -Math.PI / 2;
    let step = totalSize / Math.pow(2, iter);
    
    // First pass to find bounding box
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    let drawCmdsCount = 0;
    const drawChars = ['F', 'G', 'A', 'B', 'L', 'R'];
    for (const char of s) {
      if (drawChars.includes(char)) {
        x += step * Math.cos(a);
        y += step * Math.sin(a);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        drawCmdsCount++;
      } else if (char === '+') a += angle * Math.PI / 180;
      else if (char === '-') a -= angle * Math.PI / 180;
      else if (char === '[') stack.push({ x, y, a });
      else if (char === ']') { const state = stack.pop(); x = state.x; y = state.y; a = state.a; }
    }

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const scale = totalSize / Math.max(w, h, 0.1);
    const ox = CX - ((minX + maxX) / 2) * scale;
    const oy = CY - ((minY + maxY) / 2) * scale;
    
    x = ox; y = oy; a = -Math.PI / 2;
    stack = [];

    if (cfg.colorRangeMode) {
      let currentIdx = 0;
      const radius = totalSize / 2;
      for (const char of s) {
        if (drawChars.includes(char)) {
          const nx = x + step * scale * Math.cos(a);
          const ny = y + step * scale * Math.sin(a);
          const t = currentIdx / (drawCmdsCount || 1);
          
          const d = Math.sqrt(Math.pow(nx - CX, 2) + Math.pow(ny - CY, 2));
          const distT = Math.min(1, d / radius);

          const { params: segmentParams, color: segColor, paletteName, colorName } = this.getSegmentParams(cfg, palette, t, distT);
          
          XCSExporter.addPath(project, { 
            dPath: `M ${x.toFixed(3)} ${y.toFixed(3)} L ${nx.toFixed(3)} ${ny.toFixed(3)}`, 
            x: (x + nx) / 2, y: (y + ny) / 2, 
            width: Math.abs(x - nx) || 0.1, height: Math.abs(y - ny) || 0.1, 
            params: segmentParams, isFill, laserSource, layerColor: segColor, 
            extraDisplayData: { t: (cfg.colorStrategy === 'center' ? distT : t), hideLabels: true, paletteName, colorName } 
          });
          
          x = nx; y = ny;
          currentIdx++;
        } else if (char === '+') a += angle * Math.PI / 180;
        else if (char === '-') a -= angle * Math.PI / 180;
        else if (char === '[') stack.push({ x, y, a });
        else if (char === ']') {
          const state = stack.pop();
          x = state.x; y = state.y; a = state.a;
        }
      }
    } else {
      let dPath = `M ${x.toFixed(3)} ${y.toFixed(3)}`;
      for (const char of s) {
        if (drawChars.includes(char)) {
          x += step * scale * Math.cos(a);
          y += step * scale * Math.sin(a);
          dPath += ` L ${x.toFixed(3)} ${y.toFixed(3)}`;
        } else if (char === '+') a += angle * Math.PI / 180;
        else if (char === '-') a -= angle * Math.PI / 180;
        else if (char === '[') {
          stack.push({ x, y, a });
        } else if (char === ']') {
          const state = stack.pop();
          x = state.x; y = state.y; a = state.a;
          dPath += ` M ${x.toFixed(3)} ${y.toFixed(3)}`;
        }
      }
      const entryIdx = (cfg.paletteOffset || 0) % palette.entries.length;
      const entry = palette.entries[entryIdx];
      XCSExporter.addPath(project, { 
        dPath, x: CX, y: CY, width: totalSize, height: totalSize, 
        params: pm, isFill, laserSource, layerColor: color, 
        extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label } 
      });
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

    scroll.appendChild(UI.makeGeneralSettingsSection(cfg, set, rebuild, App.palettes, palette, {
      supportPath: true, supportFill: false, supportColorRange: true, supportBorder: true,
      minSize: 10, maxSize: 100
    }));

    const mode = cfg.mode || cfg.type;

    scroll.appendChild(UI.makeSection('Color Mapping', [
      UI.makeRow('Strategy', UI.makeToggles(['path', 'center'], cfg.colorStrategy, v => set('colorStrategy', v), { path: 'PATH', center: 'CENTER' }))
    ]));

    const maxOrder = (mode === 'lsystem-grid') ? 4 : (mode === 'dragon-folding' ? 40 : 6);
    scroll.appendChild(UI.makeSection('Path Settings', [
      UI.makeRow('Order/Iter', UI.makeRange(1, maxOrder, 1, cfg.order, v => set('order', +v)))
    ]));
  }
};

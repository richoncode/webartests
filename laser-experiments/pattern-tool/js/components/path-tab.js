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

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Path Curve';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      type: 'hilbert',
      size: 80,
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
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
    const processingType = isFill ? "COLOR_FILL_ENGRAVE" : "VECTOR_ENGRAVING";
    
    const entryIdx = cfg.paletteOffset % palette.entries.length;
    const entry = palette.entries[entryIdx];
    const pm = PalMgr.getParams(cfg.paletteId, entryIdx);

    const mode = cfg.mode || cfg.type;

    if (mode === 'hilbert') {
      this.drawHilbert(project, cfg, pm, entry.rgb, processingType, laserSource, CX, CY);
    } 
    else if (mode === 'peano') {
      this.drawPeano(project, cfg, pm, entry.rgb, processingType, laserSource, CX, CY);
    }
    else if (mode === 'l-system-plant') {
      this.drawLSystem(project, 'X', { 'X': 'F-[[X]+X]+F[+FX]-X', 'F': 'FF' }, 25, cfg.order, pm, entry.rgb, processingType, laserSource, CX, CY + cfg.size / 2, cfg.size);
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

  drawHilbert(project, cfg, pm, color, processingType, laserSource, CX, CY) {
    const order = cfg.order;
    const n = Math.pow(2, order);
    const total = n * n;
    const step = cfg.size / n;
    let dPath = '';
    for (let i = 0; i < total; i++) {
      const { x, y } = this.hilbertCoord(i, n);
      const px = CX - cfg.size / 2 + x * step + step / 2;
      const py = CY - cfg.size / 2 + y * step + step / 2;
      dPath += (i === 0 ? 'M' : 'L') + `${px.toFixed(3)} ${py.toFixed(3)}`;
    }
    XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, processingType, laserSource, layerColor: color, extraDisplayData: { t: 0 } });
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

  drawPeano(project, cfg, pm, color, processingType, laserSource, CX, CY) {
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
    const step = cfg.size / (n - 1 || 1);
    let x = CX - cfg.size / 2, y = CY - cfg.size / 2, a = 0;
    let dPath = `M ${x.toFixed(3)} ${y.toFixed(3)}`;

    for (const char of s) {
      if (char === 'F') {
        x += step * Math.cos(a);
        y += step * Math.sin(a);
        dPath += ` L ${x.toFixed(3)} ${y.toFixed(3)}`;
      } else if (char === '+') {
        a += Math.PI / 2;
      } else if (char === '-') {
        a -= Math.PI / 2;
      }
    }
    XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, processingType, laserSource, layerColor: color, extraDisplayData: { t: 0 } });
  },

  drawLSystem(project, axiom, rules, angle, iter, pm, color, processingType, laserSource, startX, startY, totalSize) {
    let s = axiom;
    for (let i = 0; i < iter; i++) {
      let next = '';
      for (const char of s) next += rules[char] || char;
      s = next;
    }

    let stack = [];
    let x = startX, y = startY, a = -Math.PI / 2;
    let step = totalSize / Math.pow(2, iter); // Rough heuristic
    let dPath = `M ${x} ${y}`;

    for (const char of s) {
      if (char === 'F') {
        x += step * Math.cos(a);
        y += step * Math.sin(a);
        dPath += ` L ${x} ${y}`;
      } else if (char === '+') {
        a += angle * Math.PI / 180;
      } else if (char === '-') {
        a -= angle * Math.PI / 180;
      } else if (char === '[') {
        stack.push({ x, y, a });
      } else if (char === ']') {
        const state = stack.pop();
        x = state.x; y = state.y; a = state.a;
        dPath += ` M ${x} ${y}`;
      }
    }
    XCSExporter.addPath(project, { dPath, x: startX, y: startY, width: totalSize, height: totalSize, params: pm, processingType, laserSource, layerColor: color, extraDisplayData: { t: 0 } });
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

    scroll.appendChild(UI.makeSection('Path Settings', [
      UI.makeRow('Order/Iter', UI.makeRange(1, 6, 1, cfg.order, v => set('order', +v)))
    ]));
  }
};

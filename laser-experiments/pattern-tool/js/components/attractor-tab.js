import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const AttractorTab = {
  create(tabId, initialCfg) {
    const modeLabels = {
      'lorenz': 'Lorenz Attractor',
      'rossler': 'Rossler Attractor',
      'ikeda': 'Ikeda Map',
      'clifford': 'Clifford Attractor',
      'dejong': 'Peter de Jong Attractor',
      'bedhead': 'Bedhead Attractor',
      'gumowski-mira': 'Gumowski-Mira Map',
      'henon': 'Hénon Map',
      'duffing': 'Duffing Map',
      'chirikov': 'Standard Map'
    };

    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    const title = modeLabels[initialCfg?.mode] || 'Chaotic Attractor';
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">${title}</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || title;
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
      size: 40,
      renderMode: 'path',
      border: false,
      mode: 'lorenz',
      iterations: 5000,
      colorRangeMode: true,
      rangeEndIdx: 10,
      a: 10, b: 28, c: 8/3, d: 1
    };

    // Apply mode-specific defaults BEFORE merging initialCfg
    const mode = initialCfg?.mode || 'lorenz';
    if (mode === 'clifford' || mode === 'dejong') {
      Object.assign(defaults, { a: 1.5, b: -1.8, c: 1.6, d: 0.9 });
    } else if (mode === 'ikeda') {
      Object.assign(defaults, { a: 0.9 });
    } else if (mode === 'rossler') {
      Object.assign(defaults, { a: 0.2, b: 0.2, c: 5.7 });
    } else if (mode === 'bedhead') {
      Object.assign(defaults, { a: 0.06, b: 0.98 });
    }

    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;

    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'attractor', pane, cfg, state };

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
    let palette = PalMgr.get(cfg.paletteId);
    if (!palette) {
      const all = PalMgr.list();
      if (all.length > 0) palette = all[0];
    }
    if (!palette) return project;

    const usedColors = new Set();
    const CX = 50, CY = 50;
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    const getColor = (t) => {
      const start = cfg.paletteOffset;
      const end = cfg.rangeEndIdx !== undefined ? cfg.rangeEndIdx : 10;
      const idx = cfg.colorRangeMode 
        ? Math.round(start + (end - start) * t)
        : start;
      const actualIdx = Math.max(0, Math.min(palette.entries.length - 1, idx));
      const entry = palette.entries[actualIdx];
      return { entry, idx: actualIdx, t, paletteName: palette.name, colorName: entry.label };
    };

    const addPoint = (x, y, color, entry, idx, t) => {
      usedColors.add(color);
      const params = PalMgr.getParams(cfg.paletteId, idx);
      XCSExporter.addCircle(project, {
        x: CX + x, y: CY + y, width: 0.1, height: 0.1,
        layerColor: color, laserSource, params, isFill: false,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry?.label, t }
      });
    };

    let pts = [];
    if (cfg.mode === 'lorenz') {
      let x = 0.1, y = 0, z = 0;
      const dt = 0.01;
      for (let i = 0; i < cfg.iterations; i++) {
        let dx = cfg.a * (y - x) * dt;
        let dy = (x * (cfg.b - z) - y) * dt;
        let dz = (x * y - cfg.c * z) * dt;
        x += dx; y += dy; z += dz;
        pts.push([x, y, z]);
      }
    } else if (cfg.mode === 'rossler') {
      let x = 0.1, y = 0, z = 0;
      const dt = 0.01;
      for (let i = 0; i < cfg.iterations; i++) {
        let dx = (-y - z) * dt;
        let dy = (x + cfg.a * y) * dt;
        let dz = (cfg.b + z * (x - cfg.c)) * dt;
        x += dx; y += dy; z += dz;
        pts.push([x, y, z]);
      }
    } else if (cfg.mode === 'bedhead') {
      let x = 0.1, y = 0.1;
      for (let i = 0; i < cfg.iterations; i++) {
        let nx = Math.sin(x*y/cfg.b)*y + Math.cos(cfg.a*x-y);
        let ny = x + Math.sin(y)/cfg.b;
        x = nx; y = ny;
        pts.push([x, y]);
      }
    } else if (cfg.mode === 'clifford') {
      let x = 0, y = 0;
      for (let i = 0; i < cfg.iterations; i++) {
        let nx = Math.sin(cfg.a * y) + cfg.c * Math.cos(cfg.a * x);
        let ny = Math.sin(cfg.b * x) + cfg.d * Math.cos(cfg.b * y);
        x = nx; y = ny;
        pts.push([x, y]);
      }
    } else if (cfg.mode === 'dejong') {
      let x = 0, y = 0;
      for (let i = 0; i < cfg.iterations; i++) {
        let nx = Math.sin(cfg.a * y) - Math.cos(cfg.b * x);
        let ny = Math.sin(cfg.c * x) - Math.cos(cfg.d * y);
        x = nx; y = ny;
        pts.push([x, y]);
      }
    } else if (cfg.mode === 'ikeda') {
      let x = 0, y = 0;
      for (let i = 0; i < cfg.iterations; i++) {
        let t = 0.4 - 6 / (1 + x*x + y*y);
        let nx = 1 + cfg.a * (x * Math.cos(t) - y * Math.sin(t));
        let ny = cfg.a * (x * Math.sin(t) + y * Math.cos(t));
        x = nx; y = ny;
        pts.push([x, y]);
      }
    } else if (cfg.mode === 'henon') {
      let x = 0, y = 0;
      for (let i = 0; i < cfg.iterations; i++) {
        let nx = 1 - 1.4 * x * x + y;
        let ny = 0.3 * x;
        x = nx; y = ny;
        pts.push([x, y]);
      }
    }

    if (pts.length > 0) {
      // Normalize to size
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach(p => {
        minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
      });
      const w = maxX - minX, h = maxY - minY;
      const sc = cfg.size / Math.max(w, h, 0.1);
      
      pts.forEach((p, i) => {
        if (i % 5 !== 0 && cfg.iterations > 5000) return; // thinning for XCS performance
        const tx = (p[0] - (minX + maxX)/2) * sc;
        const ty = (p[1] - (minY + maxY)/2) * sc;
        
        // Safety: skip non-finite numbers
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;

        const tValue = i / pts.length;
        const { entry, idx } = getColor(tValue);
        addPoint(tx, ty, entry.rgb, entry, idx, tValue);
      });
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

    scroll.appendChild(UI.makeSection('Attractor Settings', [
      UI.makeRow('Points', UI.makeRange(1000, 20000, 1000, cfg.iterations, v => set('iterations', +v)))
    ]));

    scroll.appendChild(UI.makeSection('Equation Parameters', (() => {
      if (cfg.mode === 'lorenz' || cfg.mode === 'rossler') {
        const isRossler = cfg.mode === 'rossler';
        const step = isRossler ? 0.01 : 0.1;
        const maxA = isRossler ? 1.0 : 30;
        const maxB = isRossler ? 1.0 : 30;
        return [
          UI.makeRow('Param A', UI.makeRange(-1, maxA, step, cfg.a, v => set('a', +v))),
          UI.makeRow('Param B', UI.makeRange(-1, maxB, step, cfg.b, v => set('b', +v))),
          UI.makeRow('Param C', UI.makeRange(-3, 30, 0.1, cfg.c, v => set('c', +v)))
        ];
      }
      if (cfg.mode === 'ikeda') {
        return [
          UI.makeRow('Param A (u)', UI.makeRange(0, 1.0, 0.0001, cfg.a, v => set('a', +v)))
        ];
      }
      if (cfg.mode === 'clifford' || cfg.mode === 'dejong') {
        return [
          UI.makeRow('Param A', UI.makeRange(-3, 3, 0.01, cfg.a, v => set('a', +v))),
          UI.makeRow('Param B', UI.makeRange(-3, 3, 0.01, cfg.b, v => set('b', +v))),
          UI.makeRow('Param C', UI.makeRange(-3, 3, 0.01, cfg.c, v => set('c', +v))),
          UI.makeRow('Param D', UI.makeRange(-3, 3, 0.01, cfg.d, v => set('d', +v)))
        ];
      }
      return [
        UI.makeRow('Param A', UI.makeRange(-3, 30, 0.1, cfg.a, v => set('a', +v))),
        UI.makeRow('Param B', UI.makeRange(-3, 30, 0.1, cfg.b, v => set('b', +v))),
        UI.makeRow('Param C', UI.makeRange(-3, 30, 0.1, cfg.c, v => set('c', +v)))
      ];
    })()));
  }
};


import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XCSIR } from '../xcs-ir.js';
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
      totalSize: 40,
      mode: 'lorenz',
      iterations: 5000,
      colorRangeMode: false,
      rangeStartIdx: 0,
      rangeEndIdx: 10,
      a: 10, b: 28, c: 8/3, d: 1 // parameters
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    
    // Adjust defaults based on mode
    if (cfg.mode === 'clifford' || cfg.mode === 'dejong') {
      cfg.a = 1.5; cfg.b = -1.8; cfg.c = 1.6; cfg.d = 0.9;
    } else if (cfg.mode === 'ikeda') {
      cfg.a = 0.9;
    }

    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'attractor', pane, cfg, state };

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
    let palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return project;

    const usedColors = new Set();
    const CX = 50, CY = 50;
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    const getColor = (t) => {
      const idx = cfg.colorRangeMode 
        ? Math.round(cfg.rangeStartIdx + (cfg.rangeEndIdx - cfg.rangeStartIdx) * t)
        : cfg.rangeStartIdx;
      return palette.entries[Math.max(0, Math.min(palette.entries.length - 1, idx))];
    };

    const addPoint = (x, y, color, entry) => {
      usedColors.add(color);
      const params = entry ? { power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1, processingLightSource: laserSource } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };
      XCSExporter.addCircle(project, {
        x: CX + x, y: CY + y, width: 0.1, height: 0.1,
        layerColor: color, laserSource, params,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry?.label }
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
      // Normalize to totalSize
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach(p => {
        minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
      });
      const w = maxX - minX, h = maxY - minY;
      const sc = cfg.totalSize / Math.max(w, h, 0.1);
      
      pts.forEach((p, i) => {
        if (i % 5 !== 0 && cfg.iterations > 5000) return; // thinning for XCS performance
        const tx = (p[0] - (minX + maxX)/2) * sc;
        const ty = (p[1] - (minY + maxY)/2) * sc;
        const entry = getColor(i / pts.length);
        addPoint(tx, ty, entry.rgb, entry);
      });
    }

    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    const palOpts = Object.keys(App.palettes);
    const palLabels = {}; palOpts.forEach(id => palLabels[id] = App.palettes[id].name);

    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Palette', UI.makeToggles(palOpts, cfg.paletteId, v => { cfg.paletteId = v; this.renderControls(tabId); update(); Persistence.save(); }, palLabels)),
      UI.makeRow('Total Size', UI.makeRange(10, 100, 1, cfg.totalSize, v => set('totalSize', +v), 'mm')),
      UI.makeRow('Points', UI.makeRange(1000, 20000, 1000, cfg.iterations, v => set('iterations', +v))),
      UI.makeRow('Color Range', (() => {
        const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '8px';
        const btn = document.createElement('button'); btn.className = 'hbtn sm' + (cfg.colorRangeMode ? ' primary' : ''); btn.textContent = cfg.colorRangeMode ? 'ON' : 'OFF';
        btn.onclick = () => { cfg.colorRangeMode = !cfg.colorRangeMode; this.renderControls(tabId); update(); Persistence.save(); };
        wrap.appendChild(btn); wrap.appendChild(UI.makePalettePicker(palette.entries, cfg.rangeStartIdx, v => set('rangeStartIdx', v), { title: "Start" }));
        if (cfg.colorRangeMode) {
          const arrow = document.createElement('span'); arrow.innerHTML = '&rarr;'; arrow.style.color = '#444';
          wrap.appendChild(arrow); wrap.appendChild(UI.makePalettePicker(palette.entries, cfg.rangeEndIdx, v => set('rangeEndIdx', v), { title: "End" }));
        }
        return wrap;
      })())
    ]));

    scroll.appendChild(UI.makeSection('Parameters', [
      UI.makeRow('Param A', UI.makeRange(-3, 30, 0.1, cfg.a, v => set('a', +v))),
      UI.makeRow('Param B', UI.makeRange(-3, 30, 0.1, cfg.b, v => set('b', +v))),
      UI.makeRow('Param C', UI.makeRange(-3, 30, 0.1, cfg.c, v => set('c', +v)))
    ]));
  }
};

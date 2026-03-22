import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const HilbertTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Hilbert Curve</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Hilbert Curve';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'laFont-1000lpcm',
      order: 4,
      size: 40,
      border: true,
      colorMode: 'single', // 'single' or 'gradient'
      paletteEntryIndex: 0
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'hilbert', pane, cfg, state };

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.rawData = this.generateXCS(inst.cfg);
    inst.state.shapes = XcsTab.parseXCS(inst.state.rawData);
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

    const CX = 50, CY = 50;
    const halfSize = cfg.size / 2;
    const startX = CX - halfSize;
    const startY = CY - halfSize;
    
    const order = cfg.order;
    const n = Math.pow(2, order);
    const totalPoints = n * n;
    const step = cfg.size / (n - 1);

    const getHilbertXY = (i, n) => {
      let x = 0, y = 0;
      let t = i;
      for (let s = 1; s < n; s *= 2) {
        let rx = 1 & (t / 2);
        let ry = 1 & (t ^ rx);
        // rot
        if (ry === 0) {
          if (rx === 1) {
            x = s - 1 - x;
            y = s - 1 - y;
          }
          let temp = x;
          x = y;
          y = temp;
        }
        x += s * rx;
        y += s * ry;
        t /= 4;
      }
      return [x, y];
    };

    const points = [];
    for (let i = 0; i < totalPoints; i++) {
      const [hx, hy] = getHilbertXY(i, n);
      points.push([startX + hx * step, startY + hy * step]);
    }

    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    const dPath = "M" + points.map(p => p.map(c => c.toFixed(3)).join(",")).join("L");
    
    const entry = palette.entries[cfg.paletteEntryIndex % palette.entries.length];
    const params = {
      power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1,
      processingLightSource: laserSource
    };

    XCSExporter.addPath(project, {
      x: CX, y: CY, width: cfg.size, height: cfg.size,
      dPath, layerColor: entry.rgb, laserSource, params,
      extraDisplayData: { hideLabels: true }
    });

    if (cfg.border) {
      XCSExporter.addRect(project, {
        x: CX, y: CY, width: cfg.size, height: cfg.size,
        layerColor: "#ffffff", laserSource, 
        params: { power: 10, speed: 100, repeat: 1, processingLightSource: laserSource },
        extraDisplayData: { hideLabels: true }
      });
    }

    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    const palOpts = Object.keys(App.palettes);
    const palLabels = {}; palOpts.forEach(id => palLabels[id] = App.palettes[id].name);

    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Palette', UI.makeToggles(palOpts, cfg.paletteId, v => { cfg.paletteId = v; this.renderControls(tabId); update(); Persistence.save(); }, palLabels)),
      UI.makeRow('Order', UI.makeStepCounter(cfg.order, 1, 8, v => set('order', v))),
      UI.makeRow('Size', UI.makeRange(10, 100, 1, cfg.size, v => set('size', +v), 'mm')),
      UI.makeRow('Color', UI.makePalettePicker(palette.entries, cfg.paletteEntryIndex, v => set('paletteEntryIndex', v))),
      UI.makeToggleRow('Show Border', cfg.border, v => set('border', v))
    ]));
  }
};

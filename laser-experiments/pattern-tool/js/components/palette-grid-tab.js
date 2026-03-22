import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const PaletteGridTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Palette Grid</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Palette Grid';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'laFont-1000lpcm',
      totalSize: 40,
      columns: 5,
      padding: 2,
      shape: 'rect',
      showLabels: true
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'palette-grid', pane, cfg, state };

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

    const entries = palette.entries;
    const count = entries.length;
    const cols = cfg.columns;
    const rows = Math.ceil(count / cols);
    
    const cellW = (cfg.totalSize - (cols - 1) * cfg.padding) / cols;
    const cellH = cellW; // Keep squares for now
    
    const CX = 50, CY = 50;
    const totalW = cols * cellW + (cols - 1) * cfg.padding;
    const totalH = rows * cellH + (rows - 1) * cfg.padding;
    const startX = CX - totalW / 2;
    const startY = CY - totalH / 2;

    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    entries.forEach((entry, i) => {
      const ix = i % cols;
      const iy = Math.floor(i / cols);
      const x = startX + ix * (cellW + cfg.padding) + cellW / 2;
      const y = startY + iy * (cellH + cfg.padding) + cellH / 2;

      const params = {
        power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1,
        processingLightSource: laserSource
      };

      const options = {
        x, y, width: cellW, height: cellH,
        layerColor: entry.rgb, laserSource, params,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry.label }
      };

      if (cfg.shape === 'circle') XCSExporter.addCircle(project, options);
      else XCSExporter.addRect(project, options);

      if (cfg.showLabels) {
        const labelSize = 1.5;
        const unscaledHeight = 23.35;
        const scale = labelSize / unscaledHeight;
        const fontSize = 72 * scale;
        XCSExporter.addText(project, {
          text: `${entry.power}%`, x, y: y + cellH/2 + 1.5, width: 5, height: labelSize, fontSize, scale,
          layerColor: "#ffffff", laserSource, align: "center"
        });
      }
    });

    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };

    const palOpts = Object.keys(App.palettes);
    const palLabels = {}; palOpts.forEach(id => palLabels[id] = App.palettes[id].name);

    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Palette', UI.makeToggles(palOpts, cfg.paletteId, v => { cfg.paletteId = v; this.renderControls(tabId); update(); Persistence.save(); }, palLabels)),
      UI.makeRow('Overall Size', UI.makeRange(10, 100, 1, cfg.totalSize, v => set('totalSize', +v), 'mm')),
      UI.makeRow('Columns', UI.makeStepCounter(cfg.columns, 1, 10, v => set('columns', v))),
      UI.makeRow('Padding', UI.makeRange(0, 10, 0.5, cfg.padding, v => set('padding', +v), 'mm')),
      UI.makeRow('Shape', UI.makeToggles(['rect', 'circle'], cfg.shape, v => set('shape', v), { rect: 'Rect', circle: 'Circle' })),
      UI.makeToggleRow('Show Power Labels', cfg.showLabels, v => set('showLabels', v))
    ]));
  }
};

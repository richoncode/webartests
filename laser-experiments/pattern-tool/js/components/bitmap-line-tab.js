import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XCSExporter } from '../../../xcs-module/js/xcs-exporter.js';
import { PalMgr } from '../palettes.js';

export const BitmapLineTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Bitmap Line Test</span></div>
        <div class="tool-scroll"></div>
      </div>`;
    const defaults = {
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
      size: 50,
      renderMode: 'fill',
      border: false,
      rectHeight: 10
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    if (cfg.width !== undefined) {
      cfg.size = cfg.width;
      delete cfg.width;
    }
    if (cfg.height !== undefined) {
      cfg.rectHeight = cfg.height;
      delete cfg.height;
    }
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'bitmap-line', pane, cfg, state };

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Bitmap Line Test';
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
    if (!palette) palette = PalMgr.list()[0];
    if (!palette) return project;

    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';
    const entryIdx = cfg.paletteOffset % palette.entries.length;
    const entry = palette.entries[entryIdx];
    const params = PalMgr.getParams(cfg.paletteId, entryIdx);

    XCSExporter.addImage(project, {
      x: CX, y: CY, width: cfg.size, height: cfg.rectHeight,
      layerColor: entry.rgb, laserSource,
      params,
      extraDisplayData: { hideLabels: true }
    });

    if (cfg.border) {
      XCSExporter.addRect(project, {
        x: CX, y: CY, width: cfg.size, height: cfg.rectHeight,
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
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const rebuild = () => this.renderControls(tabId);

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return;

    scroll.appendChild(UI.makeGeneralSettingsSection(cfg, set, rebuild, App.palettes, palette, {
      supportPath: false, supportFill: true, supportColorRange: true, supportBorder: true,
      minSize: 5, maxSize: 100
    }));

    scroll.appendChild(UI.makeSection('Bitmap Settings', [
      UI.makeRow('Rect Height', UI.makeRange(1, 100, 1, cfg.rectHeight, v => set('rectHeight', +v), 'mm'))
    ]));
  }
};


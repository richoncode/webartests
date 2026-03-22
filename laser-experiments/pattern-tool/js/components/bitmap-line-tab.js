import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { XCSExporter } from '../xcs-exporter.js';

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

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Bitmap Line Test';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      laserType: 'ir',
      power: 20,
      speed: 100,
      lpcm: 1000,
      width: 50,
      height: 10
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData:null, shapes:[] };
    App.instances[tabId] = { type:'bitmap-line', pane, cfg, state };

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
    const CX = 50, CY = 50;
    const laserSource = cfg.laserType === 'ir' ? 'red' : 'blue';

    XCSExporter.addImage(project, {
      x: CX, y: CY, width: cfg.width, height: cfg.height,
      layerColor: "#ffffff", laserSource,
      params: { 
        power: Math.round(cfg.power), 
        speed: Math.round(cfg.speed), 
        density: Math.round(cfg.lpcm),
        repeat: 1,
        processingLightSource: laserSource
      },
      extraDisplayData: { hideLabels: true }
    });

    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };

    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Laser', UI.makeToggles(['ir', 'blue'], cfg.laserType, v => set('laserType', v), {ir:'IR', blue:'BLUE'})),
      UI.makeRow('Power', UI.makeRange(1, 100, 1, cfg.power, v => set('power', +v), 'pwr%')),
      UI.makeRow('Speed', UI.makeRange(1, 500, 5, cfg.speed, v => set('speed', +v), 'mm/s')),
      UI.makeRow('LPCM', UI.makeRange(10, 1000, 50, cfg.lpcm, v => set('lpcm', +v), 'lpcm')),
      UI.makeRow('Width', UI.makeRange(5, 100, 1, cfg.width, v => set('width', +v), 'mm')),
      UI.makeRow('Height', UI.makeRange(1, 100, 1, cfg.height, v => set('height', +v), 'mm'))
    ]));
  }
};

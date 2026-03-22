import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { XCSExporter } from '../xcs-exporter.js';

export const TestTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">XCS Format Test</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Format Test';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      testType: 'text-scribe',
      laserType: 'ir'
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData:null, shapes:[] };
    App.instances[tabId] = { type:'test', pane, cfg, state };

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
    const laserSource = cfg.laserType === 'ir' ? 'red' : 'blue';

    if (cfg.testType === 'text-scribe') {
      XCSExporter.addText(project, {
        text: "XCS FORMAT TEST", x: 50, y: 50, height: 10, fontSize: 36,
        layerColor: "#5b9bd5", laserSource, processingType: "VECTOR_ENGRAVING",
        align: "center"
      });
    } else if (cfg.testType === 'shapes') {
      XCSExporter.addCircle(project, { x: 30, y: 50, width: 20, height: 20, layerColor: "#10b981", laserSource });
      XCSExporter.addRect(project, { x: 70, y: 50, width: 20, height: 20, layerColor: "#f59e0b", laserSource });
    }

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
      UI.makeRow('Type', UI.makeToggles(['text-scribe', 'shapes'], cfg.testType, v => set('testType', v), {
        'text-scribe': 'Text Scribe',
        'shapes': 'Shapes'
      }))
    ]));
  }
};

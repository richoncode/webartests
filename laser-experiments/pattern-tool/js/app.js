import { PalMgr } from './palettes.js';

export const App = {
  palettes: {},
  tabs: [],
  activeTabId: null,
  instances: {},
  tabCounter: 0,

  async init(patterns) {
    this.patterns = patterns;
    await PalMgr.load();
    this.setupGlobalEvents();
  },

  addTab(label, Component, initialCfg, registryId = null) {
    // TabMgr is injected into App in main.js
    const id = this.TabMgr.newId();
    const type = registryId || initialCfg?.type || 'generic';
    this.tabs.push({ id, type, label });
    
    const pane = Component.create(id, initialCfg);
    document.getElementById('tabContent').appendChild(pane);
    
    this.TabMgr.activate(id);
    return id;
  },

  setupGlobalEvents() {
    window.addEventListener('resize', () => {
      if (!this.activeTabId) return;
      const inst = this.instances[this.activeTabId];
      if (inst) {
        import('./viewer.js').then(m => m.XCSViewer.update(inst.pane, inst.state));
      }
    });

    document.getElementById('openXcsBtn').onclick = () => this.TabMgr.openXcs();
    document.getElementById('saveRnrBtn').onclick = () => import('./persistence.js').then(m => m.Persistence.saveRNR());
    document.getElementById('loadRnrBtn').onclick = () => document.getElementById('rnrInput').click();
    document.getElementById('clearAllBtn').onclick = () => import('./persistence.js').then(m => m.Persistence.clearAll());
    
    const rnrInput = document.getElementById('rnrInput');
    if (rnrInput) {
      rnrInput.onchange = e => {
        if (e.target.files?.[0]) {
          import('./persistence.js').then(m => m.Persistence.loadRNR(e.target.files[0]));
        }
      };
    }
  }
};

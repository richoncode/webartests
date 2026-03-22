import { App } from './app.js';
import { TabMgr } from './tabs.js';
import { dl } from './utils.js';

export const Persistence = {
  KEY: 'pattern_tool_state',
  _loading: false,
  save() {
    if (this._loading) return;
    const state = {
      tabs: App.tabs.map(t => ({ id: t.id, type: t.type, label: t.label })),
      activeTabId: App.activeTabId,
      cfgs: {}
    };
    App.tabs.forEach(t => {
      if (App.instances[t.id]) state.cfgs[t.id] = App.instances[t.id].cfg;
    });
    localStorage.setItem(this.KEY, JSON.stringify(state));
  },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return false;
      const state = JSON.parse(raw);
      if (!state.tabs || !state.tabs.length) return false;
      
      this._loading = true;
      document.querySelectorAll('.tab-pane').forEach(p => p.remove());
      App.tabs = [];
      App.instances = {};

      let lastCreatedId = null;
      state.tabs.forEach(t => {
        const cfg = state.cfgs[t.id];
        let newId = null;
        if (t.type === 'mandala') newId = TabMgr.newMandala(cfg, t.label);
        else if (t.type === 'voronoi') newId = TabMgr.newVoronoi(cfg, t.label);
        else if (t.type === 'hilbert') newId = TabMgr.newHilbert(cfg, t.label);
        else if (t.type === 'palette-grid') newId = TabMgr.newPaletteGrid(cfg, t.label);
        else if (t.type === 'gradient') newId = TabMgr.newGradient(cfg, t.label);
        else if (t.type === 'bitmap-line') newId = TabMgr.newBitmapLine(cfg, t.label);
        else if (t.type === 'test') newId = TabMgr.newTest(cfg, t.label);
        
        if (t.id === state.activeTabId) lastCreatedId = newId;
      });
      
      this._loading = false;
      if (lastCreatedId) TabMgr.activate(lastCreatedId);
      else if (App.tabs.length) TabMgr.activate(App.tabs[App.tabs.length-1].id);
      
      return true;
    } catch(e) { 
      this._loading = false;
      console.error('Load failed', e); 
      return false; 
    }
  },
  clearAll() {
    if (confirm('Clear all work and reset the tool?')) {
      localStorage.removeItem(this.KEY);
      location.reload();
    }
  },
  saveRNR() {
    const inst = App.instances[App.activeTabId];
    if (!inst) {
      alert('Please select a pattern tab to save.');
      return;
    }
    const tab = App.tabs.find(t => t.id === App.activeTabId);
    const defaultName = (tab ? tab.label : (inst.type==='mandala'?'dot-mandala':inst.type)) + '.rnr';
    const data = { type: inst.type, cfg: inst.cfg, version: '1.0' };
    const name = prompt('Save settings as:', defaultName);
    if (!name) return;
    const filename = name.endsWith('.rnr') ? name : name + '.rnr';
    dl(filename, JSON.stringify(data, null, 2), 'application/json');
  },
  loadRNR(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        const label = file.name.replace(/\.rnr$/i, '');
        if (data.type === 'mandala') TabMgr.newMandala(data.cfg, label);
        else if (data.type === 'voronoi') TabMgr.newVoronoi(data.cfg, label);
        else if (data.type === 'hilbert') TabMgr.newHilbert(data.cfg, label);
        else if (data.type === 'palette-grid') TabMgr.newPaletteGrid(data.cfg, label);
        else if (data.type === 'gradient') TabMgr.newGradient(data.cfg, label);
        else if (data.type === 'bitmap-line') TabMgr.newBitmapLine(data.cfg, label);
        else if (data.type === 'test') TabMgr.newTest(data.cfg, label);
        else alert('Unsupported pattern type in RNR file.');
      } catch(err) { alert('Load failed: ' + err.message); }
    };
    reader.readAsText(file);
  }
};

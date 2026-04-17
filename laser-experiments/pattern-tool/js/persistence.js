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
      cfgs: {},
      views: {}
    };
    App.tabs.forEach(t => {
      const inst = App.instances[t.id];
      if (inst) {
        state.cfgs[t.id] = inst.cfg;
        if (inst.state && inst.state.view) {
          state.views[t.id] = inst.state.view;
        }
      }
    });
    localStorage.setItem(this.KEY, JSON.stringify(state));
  },
  restore() {
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
        // Use generic creator based on type
        const newId = TabMgr.createTab(t.type, cfg, t.label);
        if (t.id === state.activeTabId) lastCreatedId = newId;
        
        // Restore view state if it exists
        if (newId && state.views && state.views[t.id]) {
          const inst = App.instances[newId];
          if (inst && inst.state) {
            inst.state.view = state.views[t.id];
          }
        }
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
    // Use tab.type (Registry ID) for RNR file format compatibility
    const data = { type: tab?.type || inst.type, cfg: inst.cfg, version: '1.0' };
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
        const newId = TabMgr.createTab(data.type, data.cfg, label);
        if (!newId) alert('Unsupported pattern type in RNR file.');
      } catch(err) { alert('Load failed: ' + err.message); }
    };
    reader.readAsText(file);
  }
};

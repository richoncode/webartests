import { App } from './app.js';
import { Persistence } from './persistence.js';
import { getTimestampedName, esc } from './utils.js';
import { XcsTab } from './components/xcs-tab.js';
import { MandalaTab } from './components/mandala-tab.js';
import { GradientTab } from './components/gradient-tab.js';
import { BitmapLineTab } from './components/bitmap-line-tab.js';
import { TestTab } from './components/test-tab.js';

export { XcsTab, MandalaTab, GradientTab, BitmapLineTab, TestTab };

// ═══════════════════════════════════════════════════════════════════
// TAB MANAGER
// ═══════════════════════════════════════════════════════════════════
export const TabMgr = {
  newId() { return `tab-${++App.tabCounter}-${Date.now()}`; },

  openXcs() {
    const id = this.newId();
    App.tabs.push({ id, type:'xcs', label:'Untitled.xcs' });
    const pane = XcsTab.create(id);
    document.getElementById('tabContent').appendChild(pane);
    this.activate(id);
    Persistence.save();
  },

  newMandala(initialCfg, label) {
    const id = this.newId();
    const finalLabel = label || getTimestampedName('Mandala');
    App.tabs.push({ id, type:'mandala', label: finalLabel });
    const pane = MandalaTab.create(id, initialCfg);
    document.getElementById('tabContent').appendChild(pane);
    this.activate(id);
    Persistence.save();
    return id;
  },

  newGradient(initialCfg, label) {
    const id = this.newId();
    const finalLabel = label || getTimestampedName('Gradient');
    App.tabs.push({ id, type:'gradient', label: finalLabel });
    const pane = GradientTab.create(id, initialCfg);
    document.getElementById('tabContent').appendChild(pane);
    this.activate(id);
    Persistence.save();
    return id;
  },

  newBitmapLine(initialCfg, label) {
    const id = this.newId();
    const finalLabel = label || getTimestampedName('BitmapLine');
    App.tabs.push({ id, type: 'bitmap-line', label: finalLabel });
    const pane = BitmapLineTab.create(id, initialCfg);
    document.getElementById('tabContent').appendChild(pane);
    this.activate(id);
    Persistence.save();
    return id;
  },

  newTest(initialCfg, label) {
    const id = this.newId();
    const finalLabel = label || getTimestampedName('Test');
    App.tabs.push({ id, type: 'test', label: finalLabel });
    const pane = TestTab.create(id, initialCfg);
    document.getElementById('tabContent').appendChild(pane);
    this.activate(id);
    Persistence.save();
    return id;
  },

  close(id) {
    const idx = App.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    App.tabs.splice(idx, 1);
    const pane = document.querySelector(`.tab-pane[data-pane-id="${id}"]`);
    if (pane) pane.remove();
    delete App.instances[id];
    if (App.activeTabId === id) {
      const next = App.tabs[Math.max(0, idx - 1)];
      this.activate(next ? next.id : null);
    } else {
      this.renderTabBar();
    }
    Persistence.save();
  },

  activate(id) {
    App.activeTabId = id;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('welcomeScreen').style.display = 'none';
    if (id) {
      const pane = document.querySelector(`.tab-pane[data-pane-id="${id}"]`);
      if (pane) pane.classList.add('active');
    } else {
      document.getElementById('welcomeScreen').style.display = 'flex';
    }
    this.renderTabBar();
    Persistence.save();
  },

  setLabel(id, label) {
    const tab = App.tabs.find(t => t.id === id);
    if (tab) {
      tab.label = label;
      const pane = document.querySelector(`.tab-pane[data-pane-id="${id}"]`);
      if (pane) {
        const fname = pane.querySelector('.viewer-fname');
        if (fname) fname.textContent = label;
      }
      this.renderTabBar();
      Persistence.save();
    }
  },

  renderTabBar() {
    const bar = document.getElementById('tabBar');
    bar.innerHTML = '';
    App.tabs.forEach(t => {
      const el = document.createElement('div');
      el.className = 'tab' + (t.id === App.activeTabId ? ' active' : '');
      el.innerHTML = `<span class="tab-icon">${t.type === 'xcs' ? '📄' : '✦'}</span><span class="tab-label">${esc(t.label)}</span><span class="tab-close" title="Close">×</span>`;
      const labelEl = el.querySelector('.tab-label');
      labelEl.addEventListener('click', () => this.activate(t.id));
      labelEl.addEventListener('dblclick', () => {
        const newName = prompt('Rename tab:', t.label);
        if (newName) this.setLabel(t.id, newName);
      });
      el.querySelector('.tab-icon').addEventListener('click', () => this.activate(t.id));
      el.querySelector('.tab-close').addEventListener('click', e => { e.stopPropagation(); this.close(t.id); });
      bar.appendChild(el);
    });
  }
};

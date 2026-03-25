import { App } from './app.js';
import { Persistence } from './persistence.js';
import { getTimestampedName, esc } from './utils.js';
import { XCSIR } from './xcs-ir.js';
import { XcsTab } from './components/xcs-tab.js';
import { MandalaTab } from './components/mandala-tab.js';
import { GeometryTab } from './components/geometry-tab.js';
import { FractalTab } from './components/fractal-tab.js';
import { PathTab } from './components/path-tab.js';
import { AttractorTab } from './components/attractor-tab.js';
import { GradientTab } from './components/gradient-tab.js';
import { BitmapLineTab } from './components/bitmap-line-tab.js';
import { TestTab } from './components/test-tab.js';
import { VoronoiTab } from './components/voronoi-tab.js';
import { HilbertTab } from './components/hilbert-tab.js';
import { PaletteGridTab } from './components/palette-grid-tab.js';
import { PaletteTestTab } from './components/palette-test-tab.js';
import { MathTab } from './components/math-tab.js';

export { XCSIR, XcsTab, MandalaTab, GeometryTab, FractalTab, PathTab, AttractorTab, GradientTab, BitmapLineTab, TestTab, VoronoiTab, HilbertTab, PaletteGridTab, PaletteTestTab, MathTab };

// ═══════════════════════════════════════════════════════════════════
// TAB MANAGER
// ═══════════════════════════════════════════════════════════════════
export const TabMgr = {
  newId() { return `tab-${++App.tabCounter}-${Date.now()}`; },

  /**
   * Generic tab creator using the PATTERNS registry.
   */
  createTab(patternId, initialCfg, label) {
    if (patternId === 'xcs') return this.openXcs();

    // Alias mapping for backward compatibility with old persistence data
    const aliases = {
      'geometry': 'fol',
      'fractal': 'fractal-gasket',
      'path': 'path-hilbert',
      'attractor': 'attr-lorenz',
      'voronoi': 'org-voronoi',
      'palette-test': 'test-palette',
      'palette-grid': 'test-palette-grid',
      'gradient': 'test-gradient',
      'bitmap-line': 'test-bitmap',
      'test': 'test-xcs'
    };

    const targetId = aliases[patternId] || patternId;
    const pattern = App.patterns.find(p => p.id === targetId);
    
    if (!pattern) {
      console.warn(`Pattern ID "${targetId}" not found in registry.`);
      return null;
    }

    // Use short name if defined, otherwise clean up the label
    const prefix = pattern.short || pattern.label.replace(/[^a-z0-9]/gi, '');
    const finalLabel = label || getTimestampedName(prefix);
    const finalCfg = { ...pattern.cfg, ...initialCfg };
    
    // We pass pattern.id to App.addTab so it's stored in App.tabs[].type for persistence
    return App.addTab(finalLabel, pattern.comp, finalCfg, pattern.id);
  },

  openXcs() {
    const id = this.newId();
    App.tabs.push({ id, type:'xcs', label:'Untitled.xcs' });
    const pane = XcsTab.create(id);
    document.getElementById('tabContent').appendChild(pane);
    this.activate(id);
    Persistence.save();
    return id;
  },

  newMandala(initialCfg, label) { return this.createTab('mandala', initialCfg, label); },
  newGeometry(initialCfg, label) { return this.createTab('fol', initialCfg, label); }, // Mapping old calls
  newFractal(initialCfg, label) { return this.createTab('fractal-gasket', initialCfg, label); },
  newPath(initialCfg, label) { return this.createTab('path-hilbert', initialCfg, label); },
  newAttractor(initialCfg, label) { return this.createTab('attr-lorenz', initialCfg, label); },
  newVoronoi(initialCfg, label) { return this.createTab('org-voronoi', initialCfg, label); },
  newHilbert(initialCfg, label) { return this.createTab('path-hilbert', initialCfg, label); },
  newPaletteGrid(initialCfg, label) { return this.createTab('test-palette-grid', initialCfg, label); },
  newPaletteTest(initialCfg, label) { return this.createTab('test-palette', initialCfg, label); },
  newGradient(initialCfg, label) { return this.createTab('test-gradient', initialCfg, label); },
  newBitmapLine(initialCfg, label) { return this.createTab('test-bitmap', initialCfg, label); },
  newTest(initialCfg, label) { return this.createTab('test-xcs', initialCfg, label); },

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

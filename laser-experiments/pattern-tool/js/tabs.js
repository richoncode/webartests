import { App } from './app.js';
import { Persistence } from './persistence.js';
import { getTimestampedName, esc } from './utils.js';
import { XCSIR } from '../../xcs-module/js/xcs-ir.js';
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
import { BitmapTab } from './components/bitmap-tab.js';
import { ShapeFillTab } from './components/shape-fill-tab.js';

export { XCSIR, XcsTab, MandalaTab, GeometryTab, FractalTab, PathTab, AttractorTab, GradientTab, BitmapLineTab, TestTab, VoronoiTab, HilbertTab, PaletteGridTab, PaletteTestTab, MathTab, BitmapTab, ShapeFillTab };

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

    const pattern = App.patterns.find(p => p.id === patternId);
    
    if (!pattern) {
      console.warn(`Pattern ID "${patternId}" not found in registry.`);
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
      
      const onTabClick = (ev) => {
        if (t.id === App.activeTabId) {
          this.showTabMenu(t.id, ev);
        } else {
          this.activate(t.id);
        }
      };

      el.querySelector('.tab-label').addEventListener('click', onTabClick);
      el.querySelector('.tab-icon').addEventListener('click', onTabClick);
      
      el.querySelector('.tab-label').addEventListener('dblclick', () => {
        const newName = prompt('Rename tab:', t.label);
        if (newName) this.setLabel(t.id, newName);
      });
      el.querySelector('.tab-close').addEventListener('click', e => { e.stopPropagation(); this.close(t.id); });
      bar.appendChild(el);
    });
  },

  showTabMenu(id, ev) {
    ev.preventDefault();
    ev.stopPropagation();

    // Remove any existing menu
    const old = document.getElementById('tabContextMenu');
    if (old) old.remove();

    const menu = document.createElement('div');
    menu.id = 'tabContextMenu';
    menu.className = 'popup show'; // Reuse popup styles
    menu.style.position = 'fixed';
    menu.style.left = `${ev.clientX}px`;
    menu.style.top = `${ev.clientY + 10}px`;
    menu.style.zIndex = '10000';
    menu.style.padding = '4px 0';
    menu.style.minWidth = '140px';
    menu.style.pointerEvents = 'auto'; // Fix: Override .popup { pointer-events: none }

    const addItem = (label, icon, cb) => {
      const item = document.createElement('div');
      item.className = 'menu-item'; 
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '8px';
      item.style.fontSize = '13px';
      item.innerHTML = `<span>${icon}</span> <span>${label}</span>`;
      item.onmouseenter = () => { item.style.background = 'rgba(255,255,255,0.1)'; };
      item.onmouseleave = () => { item.style.background = 'transparent'; };
      item.onclick = (e) => { 
        // Reordered: Run callback (the copy) before removing UI to keep focus context
        cb(); 
        menu.remove(); 
      };
      menu.appendChild(item);
    };

    addItem('Rename Tab', '✏️', () => {
      const t = App.tabs.find(x => x.id === id);
      const newName = prompt('Rename tab:', t.label);
      if (newName) this.setLabel(id, newName);
    });

    addItem('Copy Shareable URL', '🔗', () => {
      const inst = App.instances[id];
      const tab = App.tabs.find(x => x.id === id);
      const url = new URL(window.location.href);
      // Ensure we clear existing params before setting new ones
      url.search = '';
      url.searchParams.set('type', inst.type);
      url.searchParams.set('cfg', JSON.stringify(inst.cfg));
      url.searchParams.set('label', tab.label);
      
      const text = url.toString();

      const fallbackCopy = (str) => {
        const el = document.createElement('textarea');
        el.value = str;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        try {
          document.execCommand('copy');
          alert('URL copied to clipboard! (Fallback)');
        } catch (err) {
          console.error('Fallback copy failed', err);
          alert('Copy failed. Please copy the URL from the address bar.');
        }
        document.body.removeChild(el);
      };

      if (!navigator.clipboard) {
        fallbackCopy(text);
        return;
      }

      navigator.clipboard.writeText(text).then(() => {
        alert('URL copied to clipboard!');
      }).catch(err => {
        console.error('Clipboard API failed, trying fallback...', err);
        fallbackCopy(text);
      });
    });

    document.body.appendChild(menu);

    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeMenu), 10);
  }
};

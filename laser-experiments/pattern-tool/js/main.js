import { App } from './app.js';
import { Persistence } from './persistence.js';
import { PalMgr } from './palettes.js';
import { TabMgr } from './tabs.js';
import { XCSViewer, Popup } from './viewer.js';
import { VERSION } from './constants.js';

// Attach to window for global access
window.App = App;
window.Persistence = Persistence;
window.PalMgr = PalMgr;
window.TabMgr = TabMgr;
window.XCSViewer = XCSViewer;
window.Popup = Popup;

const PATTERNS = [
  {
    category: 'Math & Symmetry',
    items: [
      { id: 'mandala', label: 'Dot Mandala', icon: '✦', action: () => TabMgr.newMandala() },
      { id: 'hilbert', label: 'Hilbert Curve', icon: '₪', action: () => TabMgr.newHilbert() }
    ]
  },
  {
    category: 'Organic & Biological',
    items: [
      { id: 'voronoi', label: 'Voronoi', icon: '⬢', action: () => TabMgr.newVoronoi() }
    ]
  },
  {
    category: 'Material Tests',
    items: [
      { id: 'palette-grid', label: 'Palette Grid', icon: '▦', action: () => TabMgr.newPaletteGrid() },
      { id: 'gradient', label: 'Gradient Grid', icon: '▦', action: () => TabMgr.newGradient() },
      { id: 'bitmap-line', label: 'Bitmap Line', icon: '▤', action: () => TabMgr.newBitmapLine() }
    ]
  },
  {
    category: 'XCS Tests',
    items: [
      { id: 'test', label: 'XCS Reference Test', icon: '⚙', action: () => TabMgr.newTest() }
    ]
  }
];

function renderPatternMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) {
    console.warn('Menu element not found:', menuId);
    return;
  }
  menu.innerHTML = '';
  console.log('Rendering menu:', menuId);

  PATTERNS.forEach((cat, idx) => {
    if (cat.items.length === 0) return;
    
    if (idx > 0) {
      const divider = document.createElement('div');
      divider.className = 'menu-divider';
      menu.appendChild(divider);
    }

    const catEl = document.createElement('div');
    catEl.className = 'menu-category';
    catEl.textContent = cat.category;
    menu.appendChild(catEl);

    cat.items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'menu-item';
      itemEl.innerHTML = `
        <span class="menu-item-icon">${item.icon}</span>
        <span class="menu-item-label">${item.label}</span>
      `;
      itemEl.onclick = (e) => {
        console.log('Menu item clicked:', item.id);
        e.stopPropagation();
        item.action();
        menu.classList.remove('show');
      };
      menu.appendChild(itemEl);
    });
  });
}

function setupEventListeners() {
  const listen = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  // Header buttons
  listen('openXcsBtn', () => TabMgr.openXcs());
  
  const addBtn = document.getElementById('addPatternBtn');
  const addMenu = document.getElementById('addPatternMenu');
  if (addBtn && addMenu) {
    console.log('Attaching header add pattern listener');
    renderPatternMenu('addPatternMenu');
    addBtn.addEventListener('click', (e) => {
      console.log('Header add pattern clicked');
      e.stopPropagation();
      const isShow = addMenu.classList.contains('show');
      // Close all first
      document.querySelectorAll('.add-pattern-menu').forEach(m => m.classList.remove('show'));
      if (!isShow) {
        addMenu.classList.add('show');
        console.log('Showing header menu');
      }
    });
  }

  listen('saveRnrBtn', () => Persistence.saveRNR());
  listen('loadRnrBtn', () => document.getElementById('rnrInput').click());
  listen('clearAllBtn', () => Persistence.clearAll());
  
  const rnrInput = document.getElementById('rnrInput');
  if (rnrInput) {
    rnrInput.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) {
        Persistence.loadRNR(e.target.files[0]);
      }
    });
  }

  // Welcome screen buttons
  listen('welcomeOpenXcsBtn', () => TabMgr.openXcs());
  
  const welcomeAddBtn = document.getElementById('welcomeAddPatternBtn');
  const welcomeAddMenu = document.getElementById('welcomeAddPatternMenu');
  if (welcomeAddBtn && welcomeAddMenu) {
    console.log('Attaching welcome add pattern listener');
    renderPatternMenu('welcomeAddPatternMenu');
    welcomeAddBtn.addEventListener('click', (e) => {
      console.log('Welcome add pattern clicked');
      e.stopPropagation();
      const isShow = welcomeAddMenu.classList.contains('show');
      // Close all first
      document.querySelectorAll('.add-pattern-menu').forEach(m => m.classList.remove('show'));
      if (!isShow) {
        welcomeAddMenu.classList.add('show');
        console.log('Showing welcome menu');
      }
    });
  }

  // Global click to close menus
  document.addEventListener('click', () => {
    if (addMenu) addMenu.classList.remove('show');
    if (welcomeAddMenu) welcomeAddMenu.classList.remove('show');
  });

  const vEl = document.getElementById('appVersion');
  if (vEl) vEl.textContent = `v${VERSION}`;

  window.addEventListener('resize', () => {
    if (!App.activeTabId) return;
    const inst = App.instances[App.activeTabId];
    if (inst) XCSViewer.update(inst.pane, inst.state);
    Persistence.save();
  });
}

async function init() {
  try {
    setupEventListeners();
    await PalMgr.load();
    if (!Persistence.load()) {
      TabMgr.newMandala();
    }
  } catch (err) {
    console.error('Initialization failed', err);
    // Even if init fails, try to show the welcome screen so buttons might work
    document.getElementById('welcomeScreen').style.display = 'flex';
  }
}

init();

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
      { id: 'fol', label: 'Flower of Life', icon: '🝊', action: () => TabMgr.newGeometry({ mode: 'flower-of-life' }, 'Flower of Life') },
      { id: 'metatron', label: "Metatron's Cube", icon: '⌬', action: () => TabMgr.newGeometry({ mode: 'metatrons-cube' }, "Metatron's Cube") },
      { id: 'rose', label: 'Rose Curve', icon: '✿', action: () => TabMgr.newGeometry({ mode: 'rose-curve' }, 'Rose Curve') },
      { id: 'spiral', label: 'Archimedean Spiral', icon: '🌀', action: () => TabMgr.newGeometry({ mode: 'archimedean-spiral' }, 'Archimedean Spiral') },
      { id: 'fermat', label: 'Fermat Spiral', icon: '🌻', action: () => TabMgr.newGeometry({ mode: 'fermat-spiral' }, 'Fermat Spiral') },
      { id: 'concentric', label: 'Concentric Polygons', icon: '⬔', action: () => TabMgr.newGeometry({ mode: 'concentric-polygons' }, 'Concentric Polygons') },
      { id: 'honeycomb', label: 'Hex Honeycomb', icon: '⬢', action: () => TabMgr.newGeometry({ mode: 'honeycomb' }, 'Hex Honeycomb') },
      { id: 'islamic', label: 'Islamic Star', icon: '☪', action: () => TabMgr.newGeometry({ mode: 'islamic-star' }, 'Islamic Star') },
      { id: 'girih', label: 'Girih Tiling', icon: '⛬', action: () => TabMgr.newGeometry({ mode: 'girih' }, 'Girih Tiling') },
      { id: 'penrose', label: 'Penrose P2', icon: '⧉', action: () => TabMgr.newGeometry({ mode: 'penrose' }, 'Penrose P2') }
    ]
  },
  {
    category: 'Space-Filling Paths',
    items: [
      { id: 'path-hilbert', label: 'Hilbert Curve', icon: '₪', action: () => TabMgr.newPath({ mode: 'hilbert' }, 'Hilbert Curve') },
      { id: 'path-peano', label: 'Peano Curve', icon: '⧉', action: () => TabMgr.newPath({ mode: 'peano' }, 'Peano Curve') },
      { id: 'path-gosper', label: 'Gosper Curve', icon: '❄', action: () => TabMgr.newPath({ mode: 'gosper' }, 'Gosper Curve') },
      { id: 'path-moore', label: 'Moore Curve', icon: '⧓', action: () => TabMgr.newPath({ mode: 'moore' }, 'Moore Curve') },
      { id: 'path-arrowhead', label: 'Sierpinski Arrowhead', icon: '▲', action: () => TabMgr.newPath({ mode: 'sierpinski-arrowhead' }, 'Sierpinski Arrowhead') },
      { id: 'path-lebesgue', label: 'Lebesgue O-curve', icon: '➰', action: () => TabMgr.newPath({ mode: 'lebesgue' }, 'Lebesgue Curve') },
      { id: 'path-morton', label: 'Morton Curve', icon: '☊', action: () => TabMgr.newPath({ mode: 'morton' }, 'Morton Curve') },
      { id: 'path-htree', label: 'H-Tree', icon: '🪜', action: () => TabMgr.newPath({ mode: 'h-tree' }, 'H-Tree') },
      { id: 'path-lsystem', label: 'L-System Grid', icon: '▦', action: () => TabMgr.newPath({ mode: 'lsystem-grid' }, 'L-System Grid') },
      { id: 'path-dragon', label: 'Dragon Folding', icon: '🐲', action: () => TabMgr.newPath({ mode: 'dragon-folding' }, 'Dragon Folding') }
    ]
  },
  {
    category: 'Chaotic Attractors',
    items: [
      { id: 'attr-lorenz', label: 'Lorenz Attractor', icon: '🦋', action: () => TabMgr.newAttractor({ mode: 'lorenz' }, 'Lorenz Attractor') },
      { id: 'attr-rossler', label: 'Rossler Attractor', icon: '🌀', action: () => TabMgr.newAttractor({ mode: 'rossler' }, 'Rossler Attractor') },
      { id: 'attr-clifford', label: 'Clifford Attractor', icon: '🌪️', action: () => TabMgr.newAttractor({ mode: 'clifford' }, 'Clifford Attractor') },
      { id: 'attr-dejong', label: 'Peter de Jong', icon: '🌀', action: () => TabMgr.newAttractor({ mode: 'dejong' }, 'Peter de Jong') },
      { id: 'attr-bedhead', label: 'Bedhead Attractor', icon: '🛌', action: () => TabMgr.newAttractor({ mode: 'bedhead' }, 'Bedhead Attractor') },
      { id: 'attr-ikeda', label: 'Ikeda Map', icon: '🗺️', action: () => TabMgr.newAttractor({ mode: 'ikeda' }, 'Ikeda Map') },
      { id: 'attr-henon', label: 'Hénon Map', icon: '☄️', action: () => TabMgr.newAttractor({ mode: 'henon' }, 'Hénon Map') }
    ]
  },
  {
    category: 'Fractals & Recursion',
    items: [
      { id: 'fract-gasket', label: 'Sierpinski Gasket', icon: '▲', action: () => TabMgr.newFractal({ mode: 'sierpinski-gasket' }, 'Sierpinski Gasket') },
      { id: 'fract-carpet', label: 'Sierpinski Carpet', icon: '▦', action: () => TabMgr.newFractal({ mode: 'sierpinski-carpet' }, 'Sierpinski Carpet') },
      { id: 'fract-koch', label: 'Koch Snowflake', icon: '❄', action: () => TabMgr.newFractal({ mode: 'koch-snowflake' }, 'Koch Snowflake') },
      { id: 'fract-dragon', label: 'Dragon Curve', icon: '🐉', action: () => TabMgr.newFractal({ mode: 'dragon-curve' }, 'Dragon Curve') },
      { id: 'fract-mandelbrot', label: 'Mandelbrot Set', icon: '⚛', action: () => TabMgr.newFractal({ mode: 'mandelbrot' }, 'Mandelbrot Set') },
      { id: 'fract-julia', label: 'Julia Set', icon: '❃', action: () => TabMgr.newFractal({ mode: 'julia-set' }, 'Julia Set') },
      { id: 'fract-pythagoras', label: 'Pythagoras Tree', icon: '🌳', action: () => TabMgr.newFractal({ mode: 'pythagoras-tree' }, 'Pythagoras Tree') },
      { id: 'fract-menger', label: 'Menger Sponge', icon: '🧊', action: () => TabMgr.newFractal({ mode: 'menger-sponge-2d' }, 'Menger Sponge') },
      { id: 'fract-vicsek', label: 'Vicsek Fractal', icon: '✛', action: () => TabMgr.newFractal({ mode: 'vicsek-fractal' }, 'Vicsek Fractal') },
      { id: 'fract-barnsley', label: 'Barnsley Fern', icon: '🌿', action: () => TabMgr.newFractal({ mode: 'barnsley-fern' }, 'Barnsley Fern') }
    ]
  },
  {
    category: 'Organic & Biological',
    items: [
      { id: 'voronoi', label: 'Voronoi Tiling', icon: '⬢', action: () => TabMgr.newVoronoi() }
    ]
  },
  {
    category: 'Material & Technical',
    items: [
      { id: 'palette-grid', label: 'Palette Grid', icon: '▦', action: () => TabMgr.newPaletteGrid() },
      { id: 'gradient', label: 'Gradient Grid', icon: '▦', action: () => TabMgr.newGradient() },
      { id: 'bitmap-line', label: 'Bitmap Line', icon: '▤', action: () => TabMgr.newBitmapLine() },
      { id: 'test', label: 'XCS Reference Test', icon: '⚙', action: () => TabMgr.newTest() }
    ]
  }
];

function renderPatternMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.innerHTML = '';

  PATTERNS.forEach(cat => {
    if (cat.items.length === 0) return;
    
    const col = document.createElement('div');
    col.className = 'menu-column';

    const catEl = document.createElement('div');
    catEl.className = 'menu-category';
    catEl.innerHTML = `<span>${cat.category}</span><span style="opacity:0.3; font-weight:400; font-family:monospace">${cat.items.length}</span>`;
    col.appendChild(catEl);

    const grid = document.createElement('div');
    grid.className = 'menu-items-grid';

    cat.items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'menu-item';
      itemEl.innerHTML = `
        <span class="menu-item-icon">${item.icon}</span>
        <span class="menu-item-label">${item.label}</span>
      `;
      itemEl.onclick = (e) => {
        e.stopPropagation();
        item.action();
        document.querySelectorAll('.add-pattern-menu').forEach(m => m.classList.remove('show'));
      };
      grid.appendChild(itemEl);
    });
    col.appendChild(grid);
    menu.appendChild(col);
  });
}

function setupEventListeners() {
  const listen = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  listen('openXcsBtn', () => TabMgr.openXcs());
  
  const addBtn = document.getElementById('addPatternBtn');
  const addMenu = document.getElementById('addPatternMenu');
  if (addBtn && addMenu) {
    renderPatternMenu('addPatternMenu');
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = addMenu.classList.contains('show');
      document.querySelectorAll('.add-pattern-menu').forEach(m => m.classList.remove('show'));
      if (!isShow) addMenu.classList.add('show');
    });
  }

  listen('saveRnrBtn', () => Persistence.saveRNR());
  listen('loadRnrBtn', () => document.getElementById('rnrInput').click());
  listen('clearAllBtn', () => Persistence.clearAll());
  
  const rnrInput = document.getElementById('rnrInput');
  if (rnrInput) {
    rnrInput.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) Persistence.loadRNR(e.target.files[0]);
    });
  }

  listen('welcomeOpenXcsBtn', () => TabMgr.openXcs());
  
  const welcomeAddBtn = document.getElementById('welcomeAddPatternBtn');
  const welcomeAddMenu = document.getElementById('welcomeAddPatternMenu');
  if (welcomeAddBtn && welcomeAddMenu) {
    renderPatternMenu('welcomeAddPatternMenu');
    welcomeAddBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = welcomeAddMenu.classList.contains('show');
      document.querySelectorAll('.add-pattern-menu').forEach(m => m.classList.remove('show'));
      if (!isShow) welcomeAddMenu.classList.add('show');
    });
  }

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
      document.getElementById('welcomeScreen').style.display = 'flex';
    }
  } catch (err) {
    console.error('Initialization failed', err);
    document.getElementById('welcomeScreen').style.display = 'flex';
  }
}

init();

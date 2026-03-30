import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { UI } from '../utils.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const PaletteTestTab = {
  // Verified XCS Lato Metrics (from gradient-tab.js)
  UNSCALED_HEIGHT: 23.35, 
  CHAR_WIDTH: 11.44,

  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Palette Test</span></div>
        <div class="tool-scroll"></div>
      </div>`;
    const defaults = {
      paletteId: 'laFont-1000lpcm',
      totalSize: 100,
      shape: 'square',
      layout: 'line',
      showText: true,
      spacing: 1,
      labelScale: 1.0
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'palette-test', pane, cfg, state };

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Palette Test';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.project = this.generateXCS(inst.cfg);
    XCSViewer.update(inst.pane, inst.state, lazy);
  },

  generateXCS(cfg) {
    const project = XCSExporter.createProject();
    let palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return project;

    const CX = 50, CY = 50;
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    const entries = palette.entries;
    const count = entries.length;
    
    let cols, rows;
    if (cfg.layout === 'line') {
      cols = count;
      rows = 1;
    } else {
      cols = Math.ceil(Math.sqrt(count));
      rows = Math.ceil(count / cols);
    }
    
    const totalW = cfg.totalSize;
    const cellW = totalW / cols;
    const scaleFactor = totalW / 100;
    const scaledSpacing = cfg.spacing * scaleFactor;
    const shapeSize = Math.max(0.1, cellW - scaledSpacing);
    const totalH = rows * cellW;

    const startX = -totalW / 2 + cellW / 2;
    const startY = -totalH / 2 + cellW / 2;

    // --- Header Text (Verified Pattern from Gradient Grid) ---
    if (cfg.showText) {
      const isVariableSpeed = palette.entries.some(e => e.speed !== undefined && e.speed !== palette.speed);
      const speedText = isVariableSpeed ? "Variable Speed" : `${palette.speed}mm/s`;
      const headerText = `${palette.name} - ${speedText}`;
      const labelHeight = 4.0 * scaleFactor * cfg.labelScale;
      const scale = labelHeight / this.UNSCALED_HEIGHT;
      const fontSize = 72 * scale;
      const labelColor = "#ffffff";
      
      XCSExporter.addText(project, {
        text: headerText,
        x: CX, 
        y: CY + startY - shapeSize/2 - (8 * scaleFactor), // Verified spacing
        width: headerText.length * this.CHAR_WIDTH * scale,
        height: labelHeight,
        fontSize, scale, align: "center",
        layerColor: labelColor, laserSource,
        isFill: false
      });
    }

    entries.forEach((entry, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const lx = startX + c * cellW;
      const ly = startY + r * cellW;

      const params = PalMgr.getParams(cfg.paletteId, i);

      const options = {
        x: CX + lx, y: CY + ly, width: shapeSize, height: shapeSize,
        layerColor: entry.rgb, laserSource, params,
        isFill: true,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry.label }
      };

      if (cfg.shape === 'circle') XCSExporter.addCircle(project, options);
      else XCSExporter.addRect(project, options);

      // --- Entry Labels (Verified Pattern from Gradient Grid) ---
      if (cfg.showText) {
        const entryText = entry.power + "%";
        const labelHeight = 2.4 * scaleFactor * cfg.labelScale;
        const scale = labelHeight / this.UNSCALED_HEIGHT;
        const fontSize = 72 * scale;
        const labelColor = "#ffffff";

        XCSExporter.addText(project, {
          text: entryText,
          x: CX + lx, 
          y: CY + ly - shapeSize/2 - (1 * scaleFactor), // Verified small gap
          width: entryText.length * this.CHAR_WIDTH * scale,
          height: labelHeight,
          fontSize, scale, align: "center",
          layerColor: labelColor, laserSource,
          isFill: false
        });
      }
    });

    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Palette', UI.makePaletteSelector(App.palettes, cfg.paletteId, v => { cfg.paletteId = v; this.renderControls(tabId); update(); Persistence.save(); })),
      UI.makeRow('Total Width', UI.makeRange(10, 200, 1, cfg.totalSize, v => set('totalSize', +v), 'mm')),
      UI.makeRow('Layout', UI.makeToggles(['grid', 'line'], cfg.layout, v => set('layout', v))),
      UI.makeRow('Shape', UI.makeToggles(['square', 'circle'], cfg.shape, v => set('shape', v))),
      UI.makeRow('Spacing', UI.makeRange(-2, 10, 0.1, cfg.spacing, v => set('spacing', +v), 'mm')),
      UI.makeToggleRow('Show Labels', cfg.showText, v => set('showText', v)),
      ...(cfg.showText ? [UI.makeRow('Label Scale', UI.makeRange(0.1, 3.0, 0.05, cfg.labelScale, v => set('labelScale', +v)))] : [])
    ]));
  }
};

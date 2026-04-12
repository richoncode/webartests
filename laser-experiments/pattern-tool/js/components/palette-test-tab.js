import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { UI } from '../utils.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../../../xcs-module/js/xcs-exporter.js';
import { XCSProject } from '../../../xcs-module/js/xcs-system.js';

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
      lpcm: 1000,
      swatchSize: 6,
      numSizes: 6,
      minSize: 1,
      shape: 'square',
      layout: 'line',
      showText: true,
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
    const numCols = entries.length;
    const numSizes = (cfg.layout === 'line') ? (cfg.numSizes || 1) : 1;
    let swatchSize = cfg.swatchSize || 10;
    const minSize = cfg.minSize || 2;
    
    // Recommended Text/Score settings for SS304 IR
    const textParams = { 
      power: 10, 
      speed: 200, 
      density: 1, // Not used for text/score but included for consistency
      repeat: 1, 
      processingLightSource: laserSource 
    };

    // Auto-constrain swatch size to fit within 95mm total width
    const maxSafeW = 95;
    let cw0 = swatchSize * 1.1;
    let totalW = (numCols - 1) * cw0 + swatchSize;
    if (totalW > maxSafeW) {
      swatchSize = maxSafeW / (numCols * 1.1);
      cw0 = swatchSize * 1.1;
    }

    // Grid Mode
    if (cfg.layout === 'grid') {
      const cols = Math.ceil(Math.sqrt(numCols));
      const rowsCount = Math.ceil(numCols / cols);
      const cw = swatchSize * 1.1;
      const startX = -((cols - 1) * cw) / 2;
      const startY = -((rowsCount - 1) * cw) / 2;

      entries.forEach((entry, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const lx = startX + c * cw;
        const ly = startY + r * cw;
        const params = PalMgr.getParams(cfg.paletteId, i);
        params.density = cfg.lpcm;
        params.processingLightSource = laserSource; // Force sync with palette source

        const opts = {
          x: CX + lx - swatchSize / 2, y: CY + ly - swatchSize / 2, // Corrected to Top-Left
          width: swatchSize, height: swatchSize,
          layerColor: entry.rgb, laserSource, params, isFill: true,
          extraDisplayData: { paletteName: palette.name, colorName: entry.label }
        };
        if (cfg.shape === 'circle') XCSExporter.addCircle(project, opts);
        else XCSExporter.addRect(project, opts);
      });
      return project;
    }

    // Line Mode
    const blockW = (numCols - 1) * cw0 + swatchSize;
    const startX = -blockW / 2 + swatchSize / 2;
    
    let rowsData = [];
    let currentY = 0;
    for (let r = 0; r < numSizes; r++) {
      let s = numSizes > 1 ? swatchSize - r * (swatchSize - minSize) / (numSizes - 1) : swatchSize;
      if (r > 0) {
        let sPrev = rowsData[r - 1].size;
        currentY += (sPrev * 0.5) + 1.0 + (s * 0.5); // Consistent 1mm gap
      }
      rowsData.push({ size: s, y: currentY });
    }
    const totalH = currentY;
    const startY = -totalH / 2;

    // Header Label - Increased Gap to avoid overlap
    if (cfg.showText) {
      const rangeText = numSizes > 1 ? `${minSize}-${swatchSize.toFixed(1)}mm` : `${swatchSize.toFixed(1)}mm`;
      let lpcmLabel = `(${cfg.lpcm} LPCM)`;
      // Avoid redundancy if name already contains the same LPCM value
      if (palette.name.includes(`${cfg.lpcm}`) || palette.name.toLowerCase().includes(`${cfg.lpcm}lpcm`)) {
        lpcmLabel = "";
      }
      const headerText = `${palette.name} ${lpcmLabel} - ${palette.speed}mm/s - Size: ${rangeText}`;
      const labelH = 3.5 * cfg.labelScale;
      const scale = labelH / this.UNSCALED_HEIGHT;
      XCSExporter.addText(project, {
        text: headerText, x: CX, y: CY + startY - Math.max(10, swatchSize * 1.0),
        width: headerText.length * this.CHAR_WIDTH * scale, height: labelH,
        fontSize: 72 * scale, scale, align: "center", layerColor: XCSProject.DEFAULT_TEXT_COLOR, laserSource, 
        params: textParams, isFill: false
      });
    }

    rowsData.forEach((rowData, rIdx) => {
      const ly = startY + rowData.y;
      const s = rowData.size;

      // Row Label - Normalized Scale and Aligned Vertically
      if (cfg.showText) {
        const rowLabel = `${s.toFixed(1)}mm`;
        const labelH = 2.5 * cfg.labelScale; 
        const scale = labelH / this.UNSCALED_HEIGHT;
        // Reduced to 1.0mm gap from the left edge of the top row's swatch
        const labelX = CX + startX - (swatchSize * 0.5) - 1.0; 
        XCSExporter.addText(project, {
          text: rowLabel, x: labelX, y: CY + ly,
          height: labelH,
          fontSize: 72 * scale, scale, align: "right", layerColor: XCSProject.DEFAULT_TEXT_COLOR, laserSource, 
          params: textParams, isFill: false
        });
      }

      entries.forEach((entry, i) => {
        const lx = startX + i * cw0;
        const params = PalMgr.getParams(cfg.paletteId, i);
        params.density = cfg.lpcm;
        params.processingLightSource = laserSource; // Force sync with palette source

        const opts = {
          x: CX + lx - s / 2, y: CY + ly - s / 2, // Corrected to Top-Left
          width: s, height: s,
          layerColor: entry.rgb, laserSource, params, isFill: true,
          extraDisplayData: { paletteName: palette.name, colorName: entry.label }
        };
        if (cfg.shape === 'circle') XCSExporter.addCircle(project, opts);
        else XCSExporter.addRect(project, opts);

        // Power labels only on the top row - centered over swatch
        if (cfg.showText && rIdx === 0) {
          const pLabel = `${entry.power}%`;
          const labelH = 2.5 * cfg.labelScale; // Matched to row label size
          const scale = labelH / this.UNSCALED_HEIGHT;
          XCSExporter.addText(project, {
            text: pLabel, x: CX + lx, y: CY + ly - s / 2 - labelH * 0.8 - 2.0,
            height: labelH,
            fontSize: 72 * scale, scale, align: "center", layerColor: XCSProject.DEFAULT_TEXT_COLOR, laserSource, 
            params: textParams, isFill: false
          });
        }
      });
    });

    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    
    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    const numCols = palette ? palette.entries.length : 0;
    
    let computedWidth = 0;
    if (palette) {
      if (cfg.layout === 'line') {
        const cw0 = cfg.swatchSize * 1.1;
        const swatchesW = (numCols - 1) * cw0 + cfg.swatchSize;
        let labelW = 0;
        if (cfg.showText) {
          const scale = (2.5 * cfg.labelScale) / this.UNSCALED_HEIGHT;
          labelW = 6 * this.CHAR_WIDTH * scale + 1.5; // 1.5mm gap + text width
        }
        computedWidth = swatchesW + labelW;
      } else {
        const cols = Math.ceil(Math.sqrt(numCols));
        computedWidth = cfg.swatchSize * (1.1 * cols - 0.1);
      }
    }

    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Palette', UI.makePaletteSelector(App.palettes, cfg.paletteId, v => { 
        cfg.paletteId = v; 
        const p = PalMgr.get(v);
        if (p && p.lpcm) cfg.lpcm = p.lpcm;
        this.renderControls(tabId); 
        update(); 
        Persistence.save(); 
      })),
      UI.makeRow('LPCM', UI.makeRange(50, 2000, 1, cfg.lpcm, v => set('lpcm', +v))),
      UI.makeRow('Layout', UI.makeToggles(['grid', 'line'], cfg.layout, v => { cfg.layout = v; this.renderControls(tabId); update(); })),
      UI.makeRow('Shape', UI.makeToggles(['square', 'circle'], cfg.shape, v => set('shape', v))),
      UI.makeRow('Total Width', UI.makeTextNode(`${computedWidth.toFixed(1)} mm`, 'hi')),
      UI.makeRow('Swatch Size', UI.makeRange(1, 50, 0.5, cfg.swatchSize, v => { set('swatchSize', +v); this.renderControls(tabId); }, 'mm')),
      ...(cfg.layout === 'line' ? [
        UI.makeRow('Num Sizes', UI.makeRange(1, 10, 1, cfg.numSizes, v => set('numSizes', +v))),
        UI.makeRow('Min Size', UI.makeRange(0.5, 20, 0.1, cfg.minSize, v => set('minSize', +v), 'mm'))
      ] : []),
      UI.makeToggleRow('Show Labels', cfg.showText, v => { cfg.showText = v; this.renderControls(tabId); update(); Persistence.save(); }),
      ...(cfg.showText ? [UI.makeRow('Label Scale', UI.makeRange(0.1, 3.0, 0.05, cfg.labelScale, v => { set('labelScale', +v); this.renderControls(tabId); }))] : [])
    ]));
  }
};

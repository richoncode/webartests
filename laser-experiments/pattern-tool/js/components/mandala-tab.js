import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const MandalaTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Dot Mandala</span></div>
        <div class="tool-scroll"></div>
      </div>`;
    const defaults = {
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
      size: 40,
      renderMode: 'fill',
      border: false,
      ringCount: 4,
      symmetry: 8,
      dotScaling: 0.2,
      alternateRotation: true,
      colorRangeMode: true,
      rangeEndIdx: 10,
      ringSpiral: 5,
      centerDot: true,
      centerDotDiameter: 2,
      centerDotEntry: 0,
      rings: [
        { dotDiameter: 1.5, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 0, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 2.0, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 3, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 2.5, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 7, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 3.0, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 10, rotationOffset: 0, shape: 'circle' }
      ]
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    if (cfg.totalSize !== undefined) {
      cfg.size = cfg.totalSize;
      delete cfg.totalSize;
    }
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'mandala', pane, cfg, state };

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Dot Mandala';
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
    let palette = PalMgr.get(cfg.paletteId);
    if (!palette) {
      const all = PalMgr.list();
      if (all.length > 0) palette = all[0];
    }
    if (!palette) return project;

    const usedColors = new Set();
    const CX = 50, CY = 50;
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';
    const isFill = cfg.renderMode === 'fill';

    const addShape = (lx, ly, r, type, color, entry, paletteName, colorName, idx, t) => {
      const x = CX + lx, y = CY + ly;
      usedColors.add(color);
      const params = PalMgr.getParams(cfg.paletteId, idx);

      const options = {
        x, y, width: r*2, height: r*2,
        layerColor: color, laserSource, params, isFill,
        extraDisplayData: { hideLabels: true, paletteName, colorName, t }
      };
      if (type === 'circle') XCSExporter.addCircle(project, options);
      else XCSExporter.addRect(project, options);
    };

    const radii = this.computeRadii(cfg);
    const maxRadius = radii.length > 0 ? radii[radii.length - 1] : 1;
    const scaleFactor = (cfg.size / 2) / maxRadius;

    const colorSteps = cfg.centerDot ? cfg.ringCount : Math.max(0, cfg.ringCount - 1);

    cfg.rings.forEach((ring, i) => {
      if (i >= cfg.ringCount) return;
      const r = radii[i] * scaleFactor;
      const count = ring.count;
      
      let entryIdx;
      if (cfg.colorRangeMode) {
        const colorIdx = cfg.centerDot ? i + 1 : i;
        const t = colorSteps > 0 ? colorIdx / colorSteps : 0;
        const start = cfg.paletteOffset;
        const end = cfg.rangeEndIdx !== undefined ? cfg.rangeEndIdx : 10;
        entryIdx = Math.round(start + (end - start) * t);
      } else {
        entryIdx = ring.paletteEntryIndex;
      }
      
      const entry = palette.entries[Math.max(0, Math.min(palette.entries.length - 1, entryIdx))];
      const scale = 1 + (cfg.dotScaling * i);
      const diam = Math.max(0.1, ring.dotDiameter * scale);
      const halfStep = cfg.alternateRotation && i % 2 === 1 ? (180 / count) : 0;
      const spiralOffset = cfg.ringSpiral * i;
      const t = colorSteps > 0 ? (cfg.centerDot ? i + 1 : i) / colorSteps : 0;
      for (let j = 0; j < count; j++) {
        const ang = ((360/count)*j + (ring.rotationOffset||0) + halfStep + spiralOffset) * Math.PI / 180;
        addShape(Math.cos(ang) * r, Math.sin(ang) * r, diam/2, ring.shape, entry.rgb, entry, palette.name, entry.label, entryIdx, t);
      }
    });

    if (cfg.centerDot) {
      const entryIdx = cfg.colorRangeMode ? cfg.paletteOffset : cfg.centerDotEntry;
      const actualIdx = Math.max(0, Math.min(palette.entries.length - 1, entryIdx));
      const entry = palette.entries[actualIdx];
      addShape(0, 0, cfg.centerDotDiameter/2, 'circle', entry.rgb, entry, palette.name, entry.label, actualIdx, 0);
    }

    if (cfg.border) {
      XCSExporter.addRect(project, {
        x: CX, y: CY, width: cfg.size, height: cfg.size,
        layerColor: "#ffffff", laserSource, 
        isFill: false,
        params: { power: 10, speed: 100, repeat: 1, processingLightSource: laserSource },
        extraDisplayData: { hideLabels: true }
      });
    }

    [...usedColors].forEach((c, idx) => {
      project.setLayerName(c, `Layer ${idx+1}`);
    });
    return project;
  },

  computeRadii(cfg) {
    const radii = [];
    let currentR = 0;
    for (let i = 0; i < cfg.ringCount; i++) {
      currentR += cfg.rings[i]?.ringRadius || 5;
      radii.push(currentR);
    }
    return radii;
  },

  syncAllToAuto(cfg) {
    const colorSteps = cfg.centerDot ? cfg.ringCount : Math.max(0, cfg.ringCount - 1);
    const start = cfg.paletteOffset;
    const end = cfg.rangeEndIdx;
    
    if (cfg.centerDot) cfg.centerDotEntry = start;
    
    for (let i = 0; i < cfg.ringCount; i++) {
      const colorIdx = cfg.centerDot ? i + 1 : i;
      const t = colorSteps > 0 ? colorIdx / colorSteps : 0;
      cfg.rings[i].paletteEntryIndex = Math.round(start + (end - start) * t);
    }
  },

  reconcileAutoMode(cfg) {
    const colorSteps = cfg.centerDot ? cfg.ringCount : Math.max(0, cfg.ringCount - 1);
    const start = cfg.paletteOffset;
    const end = cfg.rangeEndIdx;
    
    let allMatch = true;
    if (cfg.centerDot && cfg.centerDotEntry !== start) allMatch = false;
    
    if (allMatch) {
      for (let i = 0; i < cfg.ringCount; i++) {
        const colorIdx = cfg.centerDot ? i + 1 : i;
        const t = colorSteps > 0 ? colorIdx / colorSteps : 0;
        const expected = Math.round(start + (end - start) * t);
        if (cfg.rings[i].paletteEntryIndex !== expected) {
          allMatch = false;
          break;
        }
      }
    }

    if (allMatch !== cfg.colorRangeMode) {
      cfg.colorRangeMode = allMatch;
      return true; // state shifted
    }
    return false;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { 
      cfg[path] = val; 
      if (path === 'colorRangeMode' && val === true) {
        this.syncAllToAuto(cfg);
        rebuild();
      } else if (path === 'paletteOffset' || path === 'rangeEndIdx') {
        if (cfg.colorRangeMode) {
          this.syncAllToAuto(cfg);
          rebuild();
        }
      }
      update(true); 
      Persistence.save(); 
    };
    const rebuild = () => this.renderControls(tabId);

    const updateColor = (element, key, newIdx) => {
      element[key] = newIdx;
      const stateShifted = this.reconcileAutoMode(cfg);
      if (stateShifted) rebuild();
      update();
      Persistence.save();
    };

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return;

    scroll.appendChild(UI.makeGeneralSettingsSection(cfg, set, rebuild, App.palettes, palette, {
      supportPath: true, supportFill: true, supportColorRange: true, supportBorder: true,
      minSize: 10, maxSize: 100
    }));

    scroll.appendChild(UI.makeSection('Mandala Settings', [
      UI.makeRow('Rings', UI.makeStepCounter(cfg.ringCount, 1, 10, v => { cfg.ringCount = v; this.syncAllToAuto(cfg); rebuild(); update(); Persistence.save(); })),
      UI.makeRow('Symmetry', UI.makeStepCounter(cfg.symmetry, 1, 32, v => { cfg.symmetry = v; rebuild(); update(); Persistence.save(); })),
      UI.makeRow('Scaling', UI.makeRange(-0.5, 1, 0.05, cfg.dotScaling, v => set('dotScaling', +v))),
      UI.makeRow('Twist', UI.makeRange(-20, 20, 1, cfg.ringSpiral, v => set('ringSpiral', +v), '°')),
      UI.makeToggleRow('Alternate rotation', cfg.alternateRotation, v => set('alternateRotation', v))
    ]));

    // Center Dot Section
    scroll.appendChild(UI.makeSection('Center Dot', [
      UI.makeToggleRow('Visible', cfg.centerDot, v => { cfg.centerDot = v; this.syncAllToAuto(cfg); rebuild(); update(); Persistence.save(); }),
      UI.makeRow('Size', UI.makeRange(0.1, 20, 0.1, cfg.centerDotDiameter, v => set('centerDotDiameter', +v), 'mm')),
      UI.makeRow('Color', UI.makePalettePicker(palette.entries, cfg.centerDotEntry, v => updateColor(cfg, 'centerDotEntry', v), { autoIndicator: cfg.colorRangeMode }))
    ]));

    for (let i = 0; i < cfg.ringCount; i++) {
      const ring = cfg.rings[i] || { dotDiameter: 2, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 0, rotationOffset: 0, shape: 'circle' };
      cfg.rings[i] = ring;
      const setRing = (path, val) => { ring[path] = val; update(); Persistence.save(); };

      const symCount = cfg.symmetry * ring.countMultiplier;
      const isSymmetric = ring.count === symCount;

      scroll.appendChild(UI.makeSection(`Ring ${i + 1} Dots`, [
        UI.makeRow('Rotation', UI.makeRange(0, 360, 5, ring.rotationOffset, v => setRing('rotationOffset', +v), '°')),
        UI.makeRow('Shape', UI.makeToggles(['circle', 'rect'], ring.shape, v => setRing('shape', v), { circle: 'Circle', rect: 'Rect' })),
        UI.makeRow('Size', UI.makeRange(0.1, 20, 0.1, ring.dotDiameter, v => setRing('dotDiameter', +v), 'mm')),
        UI.makeRow('Spacing', UI.makeRange(1, 50, 0.5, ring.ringRadius, v => setRing('ringRadius', +v), 'mm')),
        UI.makeRow('Count', (() => {
          const wrap = document.createElement('div');
          wrap.style.display = 'flex'; wrap.style.gap = '8px'; wrap.style.alignItems = 'center';
          wrap.appendChild(UI.makeStepCounter(ring.count, 1, 128, v => { 
            ring.count = v; rebuild(); update(); Persistence.save(); 
          }));
          wrap.appendChild(UI.makeActionBtn('Symmetry', isSymmetric, () => {
            ring.count = symCount;
            rebuild(); update(); Persistence.save();
          }));
          return wrap;
        })()),
        UI.makeRow('Color', UI.makePalettePicker(palette.entries, ring.paletteEntryIndex, v => updateColor(ring, 'paletteEntryIndex', v), { autoIndicator: cfg.colorRangeMode }))
      ]));
    }
  }
};

import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XCSIR } from '../xcs-ir.js';
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

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Dot Mandala';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'laFont-1000lpcm',
      totalSize: 40,
      ringCount: 4,
      symmetry: 8,
      dotScaling: 0.2,
      alternateRotation: true,
      colorRangeMode: false,
      rangeStartIdx: 0,
      rangeEndIdx: 10,
      ringSpiral: 5,
      centerDot: true,
      centerDotDiameter: 2,
      centerDotEntry: 0,
      rings: [
        { dotDiameter: 1.5, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 0, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 2.0, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 1, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 2.5, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 2, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 3.0, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 3, rotationOffset: 0, shape: 'circle' }
      ]
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'mandala', pane, cfg, state };

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.rawData = this.generateXCS(inst.cfg);
    inst.state.shapes = XCSIR.parseXCS(inst.state.rawData);
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

    const addShape = (lx, ly, r, type, color, entry, paletteName, colorName) => {
      const x = CX + lx, y = CY + ly;
      usedColors.add(color);
      const params = entry ? { 
        power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1,
        processingLightSource: laserSource
      } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };

      const options = {
        x, y, width: r*2, height: r*2,
        layerColor: color, laserSource, params,
        extraDisplayData: { hideLabels: true, paletteName, colorName }
      };
      if (type === 'circle') XCSExporter.addCircle(project, options);
      else XCSExporter.addRect(project, options);
    };

    const radii = this.computeRadii(cfg);
    const maxRadius = radii.length > 0 ? radii[radii.length - 1] : 1;
    const scaleFactor = (cfg.totalSize / 2) / maxRadius;

    // Treat Center Dot as Index 0 if visible
    const colorSteps = cfg.centerDot ? cfg.ringCount : Math.max(0, cfg.ringCount - 1);

    cfg.rings.forEach((ring, i) => {
      if (i >= cfg.ringCount) return;
      const r = radii[i] * scaleFactor;
      const count = ring.count;
      
      let entryIdx;
      if (cfg.colorRangeMode) {
        // If center dot is visible, it takes index 0, Ring 1 takes index 1.
        const colorIdx = cfg.centerDot ? i + 1 : i;
        const t = colorSteps > 0 ? colorIdx / colorSteps : 0;
        entryIdx = Math.round(cfg.rangeStartIdx + (cfg.rangeEndIdx - cfg.rangeStartIdx) * t);
      } else {
        entryIdx = ring.paletteEntryIndex;
      }
      
      const entry = palette.entries[Math.max(0, Math.min(palette.entries.length - 1, entryIdx))];
      const scale = 1 + (cfg.dotScaling * i);
      const diam = Math.max(0.1, ring.dotDiameter * scale);
      const halfStep = cfg.alternateRotation && i % 2 === 1 ? (180 / count) : 0;
      const spiralOffset = cfg.ringSpiral * i;
      for (let j = 0; j < count; j++) {
        const ang = ((360/count)*j + (ring.rotationOffset||0) + halfStep + spiralOffset) * Math.PI / 180;
        addShape(Math.cos(ang) * r, Math.sin(ang) * r, diam/2, ring.shape, entry.rgb, entry, palette.name, entry.label);
      }
    });

    if (cfg.centerDot) {
      const entryIdx = cfg.colorRangeMode ? cfg.rangeStartIdx : cfg.centerDotEntry;
      const entry = palette.entries[Math.max(0, Math.min(palette.entries.length - 1, entryIdx))];
      addShape(0, 0, cfg.centerDotDiameter/2, 'circle', entry.rgb, entry, palette.name, entry.label);
    }

    const canvas = project.canvas[0];
    [...usedColors].forEach((c, idx) => {
      canvas.layerData[c] = { name: `Layer ${idx+1}`, order: idx+1, visible: true };
    });
    return project;
  },

  computeRadii(cfg) {
    const radii = [];
    let currentR = 0;
    for (let i = 0; i < cfg.ringCount; i++) {
      currentR += cfg.rings[i].ringRadius;
      radii.push(currentR);
    }
    return radii;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    const palOpts = Object.keys(App.palettes);
    const palLabels = {}; palOpts.forEach(id => palLabels[id] = App.palettes[id].name);

    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Palette', UI.makeToggles(palOpts, cfg.paletteId, v => { cfg.paletteId = v; this.renderControls(tabId); update(); Persistence.save(); }, palLabels)),
      UI.makeRow('Overall Size', UI.makeRange(10, 100, 1, cfg.totalSize, v => set('totalSize', +v), 'mm')),
      UI.makeRow('Rings', UI.makeStepCounter(cfg.ringCount, 1, 10, v => { cfg.ringCount = v; this.renderControls(tabId); update(); Persistence.save(); })),
      UI.makeRow('Symmetry', UI.makeStepCounter(cfg.symmetry, 1, 32, v => { cfg.symmetry = v; this.renderControls(tabId); update(); Persistence.save(); })),
      UI.makeRow('Scaling', UI.makeRange(-0.5, 1, 0.05, cfg.dotScaling, v => set('dotScaling', +v))),
      UI.makeRow('Twist', UI.makeRange(-20, 20, 1, cfg.ringSpiral, v => set('ringSpiral', +v), '°')),
      UI.makeToggleRow('Alternate rotation', cfg.alternateRotation, v => set('alternateRotation', v)),
      UI.makeRow('Color Range', (() => {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '8px';
        
        const btn = document.createElement('button');
        btn.className = 'hbtn sm' + (cfg.colorRangeMode ? ' primary' : '');
        btn.textContent = cfg.colorRangeMode ? 'ON' : 'OFF';
        btn.onclick = () => {
          cfg.colorRangeMode = !cfg.colorRangeMode;
          this.renderControls(tabId); update(); Persistence.save();
        };
        wrap.appendChild(btn);

        if (cfg.colorRangeMode) {
          wrap.appendChild(UI.makePalettePicker(palette.entries, cfg.rangeStartIdx, v => set('rangeStartIdx', v), { title: "Start Color" }));
          const arrow = document.createElement('span');
          arrow.innerHTML = '&rarr;'; arrow.style.color = '#444'; arrow.style.fontSize = '10px';
          wrap.appendChild(arrow);
          wrap.appendChild(UI.makePalettePicker(palette.entries, cfg.rangeEndIdx, v => set('rangeEndIdx', v), { title: "End Color" }));
        }
        return wrap;
      })())
    ]));

    scroll.appendChild(UI.makeSection('Center Dot', [
      UI.makeToggleRow('Visible', cfg.centerDot, v => { cfg.centerDot = v; this.renderControls(tabId); update(); Persistence.save(); }),
      UI.makeRow('Size', UI.makeRange(0.1, 20, 0.1, cfg.centerDotDiameter, v => set('centerDotDiameter', +v), 'mm')),
      UI.makeRow('Color', (() => {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex'; wrap.style.gap = '8px'; wrap.style.alignItems = 'center';
        const currentIdx = cfg.colorRangeMode ? cfg.rangeStartIdx : cfg.centerDotEntry;
        wrap.appendChild(UI.makePalettePicker(palette.entries, currentIdx, v => {
          if (cfg.colorRangeMode) {
            cfg.rangeStartIdx = v;
          } else {
            cfg.centerDotEntry = v;
          }
          this.renderControls(tabId); update(); Persistence.save();
        }));
        wrap.appendChild(UI.makeActionBtn('Auto', cfg.colorRangeMode, () => {
          cfg.colorRangeMode = !cfg.colorRangeMode;
          this.renderControls(tabId); update(); Persistence.save();
        }));
        return wrap;
      })())
    ]));

    for (let i = 0; i < cfg.ringCount; i++) {
      const ring = cfg.rings[i] || { dotDiameter: 2, ringRadius: 5, countMultiplier: 1, count: 8, paletteEntryIndex: 0, rotationOffset: 0, shape: 'circle' };
      cfg.rings[i] = ring;
      const setRing = (path, val) => { ring[path] = val; update(); Persistence.save(); };

      const symCount = cfg.symmetry * ring.countMultiplier;
      const isSymmetric = ring.count === symCount;

      let currentIdx;
      if (cfg.colorRangeMode) {
        const colorSteps = cfg.centerDot ? cfg.ringCount : Math.max(0, cfg.ringCount - 1);
        const colorIdx = cfg.centerDot ? i + 1 : i;
        const t = colorSteps > 0 ? colorIdx / colorSteps : 0;
        currentIdx = Math.round(cfg.rangeStartIdx + (cfg.rangeEndIdx - cfg.rangeStartIdx) * t);
      } else {
        currentIdx = ring.paletteEntryIndex;
      }

      scroll.appendChild(UI.makeSection(`Ring ${i + 1} Dots`, [
        UI.makeRow('Rotation', UI.makeRange(0, 360, 5, ring.rotationOffset, v => setRing('rotationOffset', +v), '°')),
        UI.makeRow('Shape', UI.makeToggles(['circle', 'rect'], ring.shape, v => setRing('shape', v), { circle: 'Circle', rect: 'Rect' })),
        UI.makeRow('Size', UI.makeRange(0.1, 20, 0.1, ring.dotDiameter, v => setRing('dotDiameter', +v), 'mm')),
        UI.makeRow('Spacing', UI.makeRange(1, 50, 0.5, ring.ringRadius, v => setRing('ringRadius', +v), 'mm')),
        UI.makeRow('Count', (() => {
          const wrap = document.createElement('div');
          wrap.style.display = 'flex'; wrap.style.gap = '8px'; wrap.style.alignItems = 'center';
          wrap.appendChild(UI.makeStepCounter(ring.count, 1, 128, v => { 
            ring.count = v; this.renderControls(tabId); update(); Persistence.save(); 
          }));
          wrap.appendChild(UI.makeActionBtn('Symmetry', isSymmetric, () => {
            ring.count = symCount;
            this.renderControls(tabId); update(); Persistence.save();
          }));
          return wrap;
        })()),
        UI.makeRow('Color', (() => {
          const wrap = document.createElement('div');
          wrap.style.display = 'flex'; wrap.style.gap = '8px'; wrap.style.alignItems = 'center';
          wrap.appendChild(UI.makePalettePicker(palette.entries, currentIdx, v => {
            cfg.colorRangeMode = false;
            ring.paletteEntryIndex = v;
            this.renderControls(tabId); update(); Persistence.save();
          }));
          wrap.appendChild(UI.makeActionBtn('Auto', cfg.colorRangeMode, () => {
            cfg.colorRangeMode = true;
            this.renderControls(tabId); update(); Persistence.save();
          }));
          return wrap;
        })())
      ]));
    }
  }
};

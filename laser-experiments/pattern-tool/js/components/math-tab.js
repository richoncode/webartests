import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { UI, uuid } from '../utils.js';
import { XCSExporter } from '../xcs-exporter.js';
import { PalMgr } from '../palettes.js';

export const MathTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Math & Symmetry</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Math Pattern';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      type: 'rose',
      size: 80,
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
      colorRangeMode: true,
      rangeEndIdx: 10,
      renderMode: 'fill',
      border: false,
      // Rose
      n: 5, d: 8,
      // Spiral
      spiralType: 'archimedean', a: 1, b: 1,
      // Penrose
      iterations: 4,
      // Lissajous
      freqX: 3, freqY: 2, phase: 0,
      // Chladni
      m: 3, n_chladni: 2,
      // Harmonograph
      f1: 1, d1: 0.01, f2: 1.01, d2: 0.01, p1: 0, p2: 1.57
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;

    const fillableTypes = ['penrose-p3', 'chladni'];
    if (!fillableTypes.includes(cfg.type)) {
      cfg.renderMode = 'path';
    }

    if (cfg.totalSize !== undefined) {
      cfg.size = cfg.totalSize;
      delete cfg.totalSize;
    }
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'math', pane, cfg, state };

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
    const CX = 50, CY = 50;
    
    let palette = PalMgr.get(cfg.paletteId);
    if (!palette) {
      const all = PalMgr.list();
      if (all.length > 0) palette = all[0];
    }
    if (!palette) return project;

    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';
    const isFill = cfg.renderMode === 'fill';
    const processingType = isFill ? "COLOR_FILL_ENGRAVE" : "VECTOR_ENGRAVING";
    
    const entryIdx = cfg.paletteOffset % palette.entries.length;
    const entry = palette.entries[entryIdx];
    const pm = PalMgr.getParams(cfg.paletteId, entryIdx);

    const getColor = (t) => {
      const start = cfg.paletteOffset;
      const end = cfg.rangeEndIdx !== undefined ? cfg.rangeEndIdx : 10;
      const idx = cfg.colorRangeMode 
        ? Math.round(start + (end - start) * t)
        : start;
      const actualIdx = Math.max(0, Math.min(palette.entries.length - 1, idx));
      const entry = palette.entries[actualIdx];
      return { entry, idx: actualIdx, t };
    };

    if (cfg.type === 'rose') {
      const k = cfg.n / cfg.d;
      let dPath = '';
      for (let a = 0; a <= Math.PI * 2 * cfg.d; a += 0.05) {
        const r = (cfg.size / 2) * Math.cos(k * a);
        const x = CX + r * Math.cos(a);
        const y = CY + r * Math.sin(a);
        dPath += (dPath === '' ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
      }
      XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, processingType, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0 } });
    } 
    else if (cfg.type === 'spiral') {
      let dPath = '';
      const turns = 10;
      for (let a = 0; a <= Math.PI * 2 * turns; a += 0.1) {
        let r = 0;
        if (cfg.spiralType === 'archimedean') r = cfg.a + cfg.b * a;
        else r = cfg.a * Math.sqrt(a); // Fermat
        const x = CX + r * Math.cos(a);
        const y = CY + r * Math.sin(a);
        if (r * 2 > cfg.size) break;
        dPath += (dPath === '' ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
      }
      XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, processingType, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0 } });
    }
    else if (cfg.type === 'penrose-p3') {
      this.generatePenrose(project, cfg, pm, getColor, processingType, laserSource, CX, CY);
    }
    else if (cfg.type === 'lissajous') {
      let dPath = '';
      for (let t = 0; t <= Math.PI * 2; t += 0.02) {
        const x = CX + (cfg.size / 2) * Math.sin(cfg.freqX * t + cfg.phase);
        const y = CY + (cfg.size / 2) * Math.sin(cfg.freqY * t);
        dPath += (dPath === '' ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
      }
      XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, processingType, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0 } });
    }
    else if (cfg.type === 'chladni') {
      const res = 50;
      const step = cfg.size / res;
      let count = 0;
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          const x = (i / res - 0.5) * Math.PI * 2;
          const y = (j / res - 0.5) * Math.PI * 2;
          const val = Math.cos(cfg.n_chladni * x) * Math.cos(cfg.m * y) - Math.cos(cfg.m * x) * Math.cos(cfg.n_chladni * y);
          if (Math.abs(val) < 0.1) count++;
        }
      }
      let idx = 0;
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          const x = (i / res - 0.5) * Math.PI * 2;
          const y = (j / res - 0.5) * Math.PI * 2;
          const val = Math.cos(cfg.n_chladni * x) * Math.cos(cfg.m * y) - Math.cos(cfg.m * x) * Math.cos(cfg.n_chladni * y);
          if (Math.abs(val) < 0.1) {
            const tValue = idx / (count - 1 || 1);
            const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
            const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
            XCSExporter.addRect(project, {
              x: CX + (i/res-0.5)*cfg.size, y: CY + (j/res-0.5)*cfg.size,
              width: step*0.8, height: step*0.8, params: entryParams, processingType, laserSource, layerColor: ent.rgb,
              extraDisplayData: { t: actualT }
            });
            idx++;
          }
        }
      }
    }
    else if (cfg.type === 'harmonograph') {
      let dPath = '';
      for (let t = 0; t < 100; t += 0.05) {
        const x = CX + (cfg.size/2) * Math.exp(-cfg.d1 * t) * Math.sin(t * cfg.f1 + cfg.p1);
        const y = CY + (cfg.size/2) * Math.exp(-cfg.d2 * t) * Math.sin(t * cfg.f2 + cfg.p2);
        dPath += (dPath === '' ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
      }
      XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, processingType, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0 } });
    }

    if (cfg.border) {
      XCSExporter.addRect(project, {
        x: CX, y: CY, width: cfg.size, height: cfg.size,
        layerColor: "#ffffff", laserSource, 
        processingType: "VECTOR_ENGRAVING",
        params: { power: 10, speed: 100, repeat: 1, processingLightSource: laserSource },
        extraDisplayData: { hideLabels: true }
      });
    }

    return project;
  },

  generatePenrose(project, cfg, pm, getColor, processingType, laserSource, CX, CY) {
    const phi = (1 + Math.sqrt(5)) / 2;
    let triangles = [];
    for (let i = 0; i < 10; i++) {
      const a = { x: 0, y: 0 };
      const b = { x: Math.cos((2*i-1)*Math.PI/10), y: Math.sin((2*i-1)*Math.PI/10) };
      const c = { x: Math.cos((2*i+1)*Math.PI/10), y: Math.sin((2*i+1)*Math.PI/10) };
      if (i % 2 === 0) triangles.push([0, a, b, c]);
      else triangles.push([0, a, c, b]);
    }

    for (let i = 0; i < cfg.iterations; i++) {
      let next = [];
      triangles.forEach(([type, a, b, c]) => {
        if (type === 0) {
          const p = { x: a.x + (b.x - a.x) / phi, y: a.y + (b.y - a.y) / phi };
          next.push([0, c, p, b]);
          next.push([1, p, c, a]);
        } else {
          const q = { x: b.x + (a.x - b.x) / phi, y: b.y + (a.y - b.y) / phi };
          const r = { x: b.x + (c.x - b.x) / phi, y: b.y + (c.y - b.y) / phi };
          next.push([1, r, q, b]);
          next.push([0, q, r, a]);
          next.push([1, a, r, c]);
        }
      });
      triangles = next;
    }

    const scale = cfg.size / 2;
    triangles.forEach(([type, a, b, c], i) => {
      const tValue = i / (triangles.length - 1 || 1);
      const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
      const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
      const dPath = `M ${CX+a.x*scale} ${CY+a.y*scale} L ${CX+b.x*scale} ${CY+b.y*scale} L ${CX+c.y*scale} ${CY+c.y*scale} Z`;
      XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: entryParams, processingType, laserSource, layerColor: ent.rgb, extraDisplayData: { t: actualT } });
    });

  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const rebuild = () => this.renderControls(tabId);

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return;

    const fillableTypes = ['penrose-p3', 'chladni'];
    const supportsFill = fillableTypes.includes(cfg.type);

    scroll.appendChild(UI.makeGeneralSettingsSection(cfg, set, rebuild, App.palettes, palette, {
      supportPath: true,
      supportFill: supportsFill,
      supportColorRange: true,
      supportBorder: true,
      minSize: 10,
      maxSize: 100
    }));

    if (cfg.type === 'rose') {
      scroll.appendChild(UI.makeSection('Rose Settings', [
        UI.makeRow('n (petals)', UI.makeRange(1, 20, 1, cfg.n, v => set('n', +v))),
        UI.makeRow('d (denominator)', UI.makeRange(1, 20, 1, cfg.d, v => set('d', +v)))
      ]));
    } else if (cfg.type === 'spiral') {
      scroll.appendChild(UI.makeSection('Spiral Settings', [
        UI.makeRow('Spiral Type', UI.makeToggles(['archimedean', 'fermat'], cfg.spiralType, v => set('spiralType', v))),
        UI.makeRow('a', UI.makeRange(0.1, 10, 0.1, cfg.a, v => set('a', +v))),
        UI.makeRow('b', UI.makeRange(0.1, 10, 0.1, cfg.b, v => set('b', +v)))
      ]));
    } else if (cfg.type === 'penrose-p3') {
      scroll.appendChild(UI.makeSection('Penrose Settings', [
        UI.makeRow('Iterations', UI.makeRange(1, 6, 1, cfg.iterations, v => set('iterations', +v)))
      ]));
    } else if (cfg.type === 'lissajous') {
      scroll.appendChild(UI.makeSection('Lissajous Settings', [
        UI.makeRow('Freq X', UI.makeRange(1, 10, 1, cfg.freqX, v => set('freqX', +v))),
        UI.makeRow('Freq Y', UI.makeRange(1, 10, 1, cfg.freqY, v => set('freqY', +v))),
        UI.makeRow('Phase', UI.makeRange(0, Math.PI * 2, 0.1, cfg.phase, v => set('phase', +v)))
      ]));
    } else if (cfg.type === 'chladni') {
      scroll.appendChild(UI.makeSection('Chladni Settings', [
        UI.makeRow('m', UI.makeRange(1, 10, 1, cfg.m, v => set('m', +v))),
        UI.makeRow('n', UI.makeRange(1, 10, 1, cfg.n_chladni, v => set('n_chladni', +v)))
      ]));
    } else if (cfg.type === 'harmonograph') {
      scroll.appendChild(UI.makeSection('Harmonograph Settings', [
        UI.makeRow('Freq 1', UI.makeRange(0.1, 5, 0.01, cfg.f1, v => set('f1', +v))),
        UI.makeRow('Decay 1', UI.makeRange(0, 0.1, 0.001, cfg.d1, v => set('d1', +v))),
        UI.makeRow('Freq 2', UI.makeRange(0.1, 5, 0.01, cfg.f2, v => set('f2', +v))),
        UI.makeRow('Decay 2', UI.makeRange(0, 0.1, 0.001, cfg.d2, v => set('d2', +v)))
      ]));
    }
  }
};

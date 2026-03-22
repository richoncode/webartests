import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XCSIR } from '../xcs-ir.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const GeometryTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Geometric Symmetry</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Geometry';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'laFont-1000lpcm',
      totalSize: 40,
      mode: 'flower-of-life',
      colorRangeMode: false,
      rangeStartIdx: 0,
      rangeEndIdx: 10,
      folRings: 3,
      folRadius: 5,
      roseK: 4,
      roseSamples: 200,
      spiralTurns: 5,
      spiralSpacing: 2,
      concCount: 5,
      concSides: 6,
      concRotation: 5,
      starSymmetry: 8,
      starV: 0.5,
      penroseSteps: 3,
      girihSymmetry: 10
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'geometry', pane, cfg, state };

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
    let palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return project;

    const usedColors = new Set();
    const CX = 50, CY = 50;
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    const addLine = (x1, y1, x2, y2, color, entry) => {
      usedColors.add(color);
      const params = entry ? { 
        power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1,
        processingLightSource: laserSource
      } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };

      XCSExporter.addPath(project, {
        x: CX + (x1+x2)/2, y: CY + (y1+y2)/2, width: Math.max(0.1, Math.abs(x2-x1)), height: Math.max(0.1, Math.abs(y2-y1)),
        dPath: `M ${CX+x1} ${CY+y1} L ${CX+x2} ${CY+y2}`,
        layerColor: color, laserSource, params,
        extraDisplayData: { paletteName: palette.name, colorName: entry?.label }
      });
    };

    const addCircle = (lx, ly, r, color, entry) => {
      usedColors.add(color);
      const params = entry ? { 
        power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1,
        processingLightSource: laserSource
      } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };

      XCSExporter.addCircle(project, {
        x: CX + lx, y: CY + ly, width: r*2, height: r*2,
        layerColor: color, laserSource, params,
        extraDisplayData: { paletteName: palette.name, colorName: entry?.label }
      });
    };

    const getColor = (t) => {
      const idx = cfg.colorRangeMode 
        ? Math.round(cfg.rangeStartIdx + (cfg.rangeEndIdx - cfg.rangeStartIdx) * t)
        : cfg.rangeStartIdx;
      return palette.entries[Math.max(0, Math.min(palette.entries.length - 1, idx))];
    };

    if (cfg.mode === 'flower-of-life' || cfg.mode === 'metatrons-cube') {
      const r = cfg.folRadius;
      const rings = cfg.folRings;
      const centers = [];
      const addGrid = (q, r_grid) => {
        const x = r * 1.5 * q;
        const y = r * Math.sqrt(3) * (r_grid + q/2);
        centers.push({x, y});
        if (cfg.mode === 'flower-of-life') {
          const dist = Math.sqrt(x*x + y*y);
          const maxDist = r * 1.5 * rings;
          const entry = getColor(Math.min(1, dist / (maxDist || 1)));
          addCircle(x, y, r, entry.rgb, entry);
        }
      };
      for (let q = -rings; q <= rings; q++) {
        for (let r_grid = Math.max(-rings, -q-rings); r_grid <= Math.min(rings, -q+rings); r_grid++) {
          addGrid(q, r_grid);
        }
      }
      if (cfg.mode === 'metatrons-cube') {
        const entry = getColor(0.5);
        for (let i = 0; i < centers.length; i++) {
          for (let j = i + 1; j < centers.length; j++) {
            const d2 = Math.pow(centers[i].x - centers[j].x, 2) + Math.pow(centers[i].y - centers[j].y, 2);
            const threshold = Math.pow(r * Math.sqrt(3) * 2.1, 2);
            if (d2 < threshold) addLine(centers[i].x, centers[i].y, centers[j].x, centers[j].y, entry.rgb, entry);
          }
        }
      }
    } else if (cfg.mode === 'vesica-piscis') {
      const r = cfg.totalSize / 4;
      const entry = getColor(0.5);
      addCircle(-r, 0, r*2, entry.rgb, entry);
      addCircle(r, 0, r*2, entry.rgb, entry);
    } else if (cfg.mode === 'rose-curve') {
      const k = cfg.roseK;
      const samples = cfg.roseSamples;
      const scale = cfg.totalSize / 2;
      let prev = null;
      const cycles = Number.isInteger(k) ? 1 : 10;
      for (let i = 0; i <= samples; i++) {
        const theta = (i / samples) * Math.PI * 2 * cycles;
        const r = Math.cos(k * theta) * scale;
        const x = r * Math.cos(theta), y = r * Math.sin(theta);
        if (prev) {
          const entry = getColor(i / samples);
          addLine(prev.x, prev.y, x, y, entry.rgb, entry);
        }
        prev = {x, y};
      }
    } else if (cfg.mode === 'archimedean-spiral') {
      const turns = cfg.spiralTurns;
      const spacing = cfg.spiralSpacing;
      const samples = turns * 50;
      let prev = null;
      for (let i = 0; i <= samples; i++) {
        const theta = (i / samples) * turns * Math.PI * 2;
        const r = (spacing * theta) / (Math.PI * 2);
        const x = r * Math.cos(theta), y = r * Math.sin(theta);
        if (prev) {
          const entry = getColor(i / samples);
          addLine(prev.x, prev.y, x, y, entry.rgb, entry);
        }
        prev = {x, y};
      }
    } else if (cfg.mode === 'fermat-spiral') {
      const count = cfg.spiralTurns * 20;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const scale = cfg.totalSize / (2 * Math.sqrt(count));
      for (let i = 0; i < count; i++) {
        const theta = i * goldenAngle;
        const r = Math.sqrt(i) * scale;
        const entry = getColor(i / count);
        addCircle(r * Math.cos(theta), r * Math.sin(theta), 1, entry.rgb, entry);
      }
    } else if (cfg.mode === 'concentric-polygons' || cfg.mode === 'honeycomb') {
      const count = cfg.concCount;
      const sides = cfg.mode === 'honeycomb' ? 6 : cfg.concSides;
      const baseScale = cfg.totalSize / (2 * count);
      for (let i = 1; i <= count; i++) {
        const r = i * baseScale;
        const rot = (i * cfg.concRotation) * Math.PI / 180;
        const entry = getColor(i / count);
        let prev = null;
        for (let s = 0; s <= sides; s++) {
          const ang = (s / sides) * Math.PI * 2 + rot;
          const x = r * Math.cos(ang), y = r * Math.sin(ang);
          if (prev) addLine(prev.x, prev.y, x, y, entry.rgb, entry);
          prev = {x, y};
        }
      }
    } else if (cfg.mode === 'islamic-star' || cfg.mode === 'girih') {
      const sym = cfg.mode === 'girih' ? cfg.girihSymmetry : cfg.starSymmetry;
      const r = cfg.totalSize / 2;
      const v = cfg.mode === 'girih' ? 0.7 : cfg.starV;
      const entry = getColor(0.5);
      let prev = null;
      for (let i = 0; i <= sym * 2; i++) {
        const ang = (i / (sym * 2)) * Math.PI * 2;
        const currR = i % 2 === 0 ? r : r * v;
        const x = currR * Math.cos(ang), y = currR * Math.sin(ang);
        if (prev) addLine(prev.x, prev.y, x, y, entry.rgb, entry);
        prev = {x, y};
      }
    } else if (cfg.mode === 'penrose') {
      const phi = (1 + Math.sqrt(5)) / 2;
      let triangles = [];
      const size = cfg.totalSize / 2;
      for (let i = 0; i < 10; i++) {
        const a = { x: 0, y: 0 };
        const b = { x: size * Math.cos((i-0.5)*Math.PI/5), y: size * Math.sin((i-0.5)*Math.PI/5) };
        const c = { x: size * Math.cos((i+0.5)*Math.PI/5), y: size * Math.sin((i+0.5)*Math.PI/5) };
        if (i % 2 === 0) triangles.push(['thin', a, b, c]);
        else triangles.push(['thin', a, c, b]);
      }
      for (let s = 0; s < cfg.penroseSteps; s++) {
        const next = [];
        triangles.forEach(t => {
          const [type, A, B, C] = t;
          if (type === 'thin') {
            const P = { x: A.x + (B.x-A.x)/phi, y: A.y + (B.y-A.y)/phi };
            next.push(['thick', C, P, B]); next.push(['thin', B, C, P]);
          } else {
            const Q = { x: B.x + (A.x-B.x)/phi, y: B.y + (A.y-B.y)/phi };
            const R = { x: B.x + (C.x-B.x)/phi, y: B.y + (C.y-B.y)/phi };
            next.push(['thick', R, Q, B]); next.push(['thick', R, A, Q]); next.push(['thin', A, R, C]);
          }
        });
        triangles = next;
      }
      const colors = { thin: getColor(0.3), thick: getColor(0.7) };
      triangles.forEach(t => {
        const [type, A, B, C] = t; const entry = colors[type];
        addLine(A.x, A.y, B.x, B.y, entry.rgb, entry); addLine(B.x, B.y, C.x, C.y, entry.rgb, entry); addLine(C.x, C.y, A.x, A.y, entry.rgb, entry);
      });
    }

    const canvas = project.canvas[0];
    [...usedColors].forEach((c, idx) => { canvas.layerData[c] = { name: `Layer ${idx+1}`, order: idx+1, visible: true }; });
    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    const palOpts = Object.keys(App.palettes);
    const palLabels = {}; palOpts.forEach(id => palLabels[id] = App.palettes[id].name);

    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Palette', UI.makeToggles(palOpts, cfg.paletteId, v => { cfg.paletteId = v; this.renderControls(tabId); update(); Persistence.save(); }, palLabels)),
      UI.makeRow('Pattern', UI.makeToggles([
        'flower-of-life', 'metatrons-cube', 'vesica-piscis', 'rose-curve', 'archimedean-spiral', 'fermat-spiral', 'concentric-polygons', 'honeycomb', 'islamic-star', 'penrose', 'girih'
      ], cfg.mode, v => { cfg.mode = v; this.renderControls(tabId); update(); Persistence.save(); }, {
        'flower-of-life': 'FoL', 'metatrons-cube': 'Metatron', 'vesica-piscis': 'Vesica', 'rose-curve': 'Rose', 'archimedean-spiral': 'Spiral', 'fermat-spiral': 'Fermat', 'concentric-polygons': 'Conc', 'honeycomb': 'Honey', 'islamic-star': 'Star', 'penrose': 'Penrose', 'girih': 'Girih'
      })),
      UI.makeRow('Total Size', UI.makeRange(10, 100, 1, cfg.totalSize, v => set('totalSize', +v), 'mm')),
      UI.makeRow('Color Range', (() => {
        const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '8px';
        const btn = document.createElement('button'); btn.className = 'hbtn sm' + (cfg.colorRangeMode ? ' primary' : ''); btn.textContent = cfg.colorRangeMode ? 'ON' : 'OFF';
        btn.onclick = () => { cfg.colorRangeMode = !cfg.colorRangeMode; this.renderControls(tabId); update(); Persistence.save(); };
        wrap.appendChild(btn); wrap.appendChild(UI.makePalettePicker(palette.entries, cfg.rangeStartIdx, v => set('rangeStartIdx', v), { title: "Start" }));
        if (cfg.colorRangeMode) {
          const arrow = document.createElement('span'); arrow.innerHTML = '&rarr;'; arrow.style.color = '#444';
          wrap.appendChild(arrow); wrap.appendChild(UI.makePalettePicker(palette.entries, cfg.rangeEndIdx, v => set('rangeEndIdx', v), { title: "End" }));
        }
        return wrap;
      })())
    ]));

    if (cfg.mode === 'flower-of-life' || cfg.mode === 'metatrons-cube') {
      scroll.appendChild(UI.makeSection(cfg.mode === 'flower-of-life' ? 'Flower of Life' : 'Metatron', [
        UI.makeRow('Rings', UI.makeStepCounter(cfg.folRings, 1, 10, v => set('folRings', v))),
        UI.makeRow('Node Spacing', UI.makeRange(1, 20, 0.5, cfg.folRadius, v => set('folRadius', +v), 'mm'))
      ]));
    } else if (cfg.mode === 'rose-curve') {
      scroll.appendChild(UI.makeSection('Rose Curve', [
        UI.makeRow('k (n/d)', UI.makeRange(1, 20, 0.1, cfg.roseK, v => set('roseK', +v))),
        UI.makeRow('Samples', UI.makeRange(50, 1000, 10, cfg.roseSamples, v => set('roseSamples', +v)))
      ]));
    } else if (cfg.mode === 'archimedean-spiral') {
      scroll.appendChild(UI.makeSection('Spiral', [
        UI.makeRow('Turns', UI.makeRange(1, 20, 0.5, cfg.spiralTurns, v => set('spiralTurns', +v))),
        UI.makeRow('Spacing', UI.makeRange(0.5, 10, 0.1, cfg.spiralSpacing, v => set('spiralSpacing', +v), 'mm'))
      ]));
    } else if (cfg.mode === 'fermat-spiral') {
      scroll.appendChild(UI.makeSection('Fermat Spiral', [
        UI.makeRow('Turns', UI.makeRange(1, 20, 0.5, cfg.spiralTurns, v => set('spiralTurns', +v)))
      ]));
    } else if (cfg.mode === 'concentric-polygons' || cfg.mode === 'honeycomb') {
      scroll.appendChild(UI.makeSection('Repetition', [
        UI.makeRow('Count', UI.makeStepCounter(cfg.concCount, 1, 20, v => set('concCount', v))),
        ...(cfg.mode === 'concentric-polygons' ? [UI.makeRow('Sides', UI.makeStepCounter(cfg.concSides, 3, 12, v => set('concSides', v)))] : []),
        UI.makeRow('Twist', UI.makeRange(-45, 45, 1, cfg.concRotation, v => set('concRotation', +v), '°'))
      ]));
    } else if (cfg.mode === 'islamic-star') {
      scroll.appendChild(UI.makeSection('Star', [
        UI.makeRow('Symmetry', UI.makeStepCounter(cfg.starSymmetry, 3, 24, v => set('starSymmetry', v))),
        UI.makeRow('Inset', UI.makeRange(0.1, 0.9, 0.05, cfg.starV, v => set('starV', +v)))
      ]));
    } else if (cfg.mode === 'penrose') {
      scroll.appendChild(UI.makeSection('Penrose P2', [
        UI.makeRow('Subdivisions', UI.makeStepCounter(cfg.penroseSteps, 1, 6, v => set('penroseSteps', v)))
      ]));
    } else if (cfg.mode === 'girih') {
      scroll.appendChild(UI.makeSection('Girih', [
        UI.makeRow('Symmetry', UI.makeStepCounter(cfg.girihSymmetry, 5, 20, v => set('girihSymmetry', v)))
      ]));
    }
  }
};

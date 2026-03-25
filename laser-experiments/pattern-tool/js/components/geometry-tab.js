import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const GeometryTab = {
  create(tabId, initialCfg) {
    const modeLabels = {
      'flower-of-life': 'Flower of Life',
      'metatrons-cube': "Metatron's Cube",
      'vesica-piscis': 'Vesica Piscis',
      'rose-curve': 'Rose Curve',
      'archimedean-spiral': 'Archimedean Spiral',
      'fermat-spiral': 'Fermat Spiral',
      'concentric-polygons': 'Concentric Polygons',
      'honeycomb': 'Hex Honeycomb',
      'islamic-star': 'Islamic Star',
      'girih': 'Girih Tiling',
      'penrose': 'Penrose P2'
    };

    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    const title = modeLabels[initialCfg?.mode] || 'Geometric Symmetry';
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">${title}</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || title;
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
      size: 40,
      renderMode: 'fill',
      border: false,
      mode: 'flower-of-life',
      colorRangeMode: true,
      rangeEndIdx: 10,
      folRings: 3,
      roseK: 4,
      roseSamples: 400,
      spiralTurns: 5,
      concCount: 5,
      concSides: 6,
      concRotation: 5,
      starSymmetry: 8,
      starV: 0.5,
      penroseSteps: 3,
      girihSymmetry: 10,
      girihComplexity: 1.0
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;

    const fillableModes = ['flower-of-life', 'vesica-piscis', 'islamic-star', 'concentric-polygons', 'fermat-spiral'];
    if (!fillableModes.includes(cfg.mode)) {
      cfg.renderMode = 'path';
    }

    if (cfg.totalSize !== undefined) {
      cfg.size = cfg.totalSize;
      delete cfg.totalSize;
    }
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'geometry', pane, cfg, state };

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
    const processingType = isFill ? "COLOR_FILL_ENGRAVE" : "VECTOR_ENGRAVING";

    const addLine = (x1, y1, x2, y2, color, entry, idx, t) => {
      usedColors.add(color);
      const params = PalMgr.getParams(cfg.paletteId, idx);
      XCSExporter.addPath(project, {
        x: CX + (x1+x2)/2, y: CY + (y1+y2)/2, width: Math.max(0.1, Math.abs(x2-x1)), height: Math.max(0.1, Math.abs(y2-y1)),
        dPath: `M ${CX+x1} ${CY+y1} L ${CX+x2} ${CY+y2}`,
        layerColor: color, laserSource, params, processingType,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry?.label, t }
      });
    };

    const addCircle = (lx, ly, r, color, entry, idx, t) => {
      usedColors.add(color);
      const params = PalMgr.getParams(cfg.paletteId, idx);
      XCSExporter.addCircle(project, {
        x: CX + lx, y: CY + ly, width: r*2, height: r*2,
        layerColor: color, laserSource, params, processingType,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry?.label, t }
      });
    };

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

    if (cfg.mode === 'flower-of-life' || cfg.mode === 'metatrons-cube' || cfg.mode === 'honeycomb') {
      const rings = cfg.folRings;
      const r = (cfg.size / 2) / (rings * 1.5 || 1);
      const centers = [];
      const addGrid = (q, r_grid) => {
        const x = r * 1.5 * q;
        const y = r * Math.sqrt(3) * (r_grid + q/2);
        const dist = Math.sqrt(x*x + y*y);
        const t = Math.min(1, dist / (cfg.size / 2 || 1));
        const { entry, idx, t: actualT } = getColor(t);

        if (cfg.mode === 'flower-of-life') {
          addCircle(x, y, r, entry.rgb, entry, idx, actualT);
        } else if (cfg.mode === 'honeycomb') {
          let px = null, py = null;
          for (let s = 0; s <= 6; s++) {
            const ang = (s / 6) * Math.PI * 2;
            const nx = x + r * Math.cos(ang);
            const ny = y + r * Math.sin(ang);
            if (px !== null) addLine(px, py, nx, ny, entry.rgb, entry, idx, actualT);
            px = nx; py = ny;
          }
        }
        centers.push({x, y});
      };
      for (let q = -rings; q <= rings; q++) {
        for (let r_grid = Math.max(-rings, -q-rings); r_grid <= Math.min(rings, -q+rings); r_grid++) {
          addGrid(q, r_grid);
        }
      }
      if (cfg.mode === 'metatrons-cube') {
        for (let i = 0; i < centers.length; i++) {
          const distFromCenter = Math.sqrt(centers[i].x**2 + centers[i].y**2);
          const { entry, idx, t: actualT } = getColor(distFromCenter / (cfg.size/2));
          for (let j = i + 1; j < centers.length; j++) {
            const d2 = Math.pow(centers[i].x - centers[j].x, 2) + Math.pow(centers[i].y - centers[j].y, 2);
            const threshold = Math.pow(r * Math.sqrt(3) * 2.1, 2);
            if (d2 < threshold) addLine(centers[i].x, centers[i].y, centers[j].x, centers[j].y, entry.rgb, entry, idx, actualT);
          }
        }
      }
    } else if (cfg.mode === 'vesica-piscis') {
      const r = cfg.size / 4;
      const { entry: entry1, idx: idx1, t: t1 } = getColor(0.2);
      const { entry: entry2, idx: idx2, t: t2 } = getColor(0.8);
      addCircle(-r, 0, r*2, entry1.rgb, entry1, idx1, t1);
      addCircle(r, 0, r*2, entry2.rgb, entry2, idx2, t2);
    } else if (cfg.mode === 'rose-curve') {
      const k = cfg.roseK;
      const samples = cfg.roseSamples;
      const scale = cfg.size / 2;
      let prev = null;
      const cycles = Number.isInteger(k) ? 1 : 10;
      for (let i = 0; i <= samples; i++) {
        const theta = (i / samples) * Math.PI * 2 * cycles;
        const r = Math.cos(k * theta) * scale;
        const x = r * Math.cos(theta), y = r * Math.sin(theta);
        if (prev) {
          const { entry, idx, t: actualT } = getColor(i / samples);
          addLine(prev.x, prev.y, x, y, entry.rgb, entry, idx, actualT);
        }
        prev = {x, y};
      }
    } else if (cfg.mode === 'archimedean-spiral') {
      const turns = cfg.spiralTurns;
      const samples = turns * 100;
      const spacing = (cfg.size / 2) / turns;
      let prev = null;
      for (let i = 0; i <= samples; i++) {
        const theta = (i / samples) * turns * Math.PI * 2;
        const r = (spacing * theta) / (Math.PI * 2);
        const x = r * Math.cos(theta), y = r * Math.sin(theta);
        if (prev) {
          const { entry, idx, t: actualT } = getColor(i / samples);
          addLine(prev.x, prev.y, x, y, entry.rgb, entry, idx, actualT);
        }
        prev = {x, y};
      }
    } else if (cfg.mode === 'fermat-spiral') {
      const count = Math.round(cfg.spiralTurns * 20);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const scale = cfg.size / (2 * Math.sqrt(count));
      for (let i = 0; i < count; i++) {
        const theta = i * goldenAngle;
        const r = Math.sqrt(i) * scale;
        const { entry, idx, t: actualT } = getColor(i / count);
        addCircle(r * Math.cos(theta), r * Math.sin(theta), 1, entry.rgb, entry, idx, actualT);
      }
    } else if (cfg.mode === 'concentric-polygons') {
      const count = cfg.concCount;
      const sides = cfg.concSides;
      const baseScale = cfg.size / (2 * count);
      for (let i = 1; i <= count; i++) {
        const r = i * baseScale;
        const rot = (i * cfg.concRotation) * Math.PI / 180;
        const { entry, idx, t: actualT } = getColor(i / count);
        let prev = null;
        for (let s = 0; s <= sides; s++) {
          const ang = (s / sides) * Math.PI * 2 + rot;
          const x = r * Math.cos(ang), y = r * Math.sin(ang);
          if (prev) addLine(prev.x, prev.y, x, y, entry.rgb, entry, idx, actualT);
          prev = {x, y};
        }
      }
    } else if (cfg.mode === 'islamic-star') {
      const sym = cfg.starSymmetry;
      const r = cfg.size / 2;
      const v = cfg.starV;
      const { entry, idx, t: actualT } = getColor(0.5);
      let prev = null;
      for (let i = 0; i <= sym * 2; i++) {
        const ang = (i / (sym * 2)) * Math.PI * 2;
        const currR = i % 2 === 0 ? r : r * v;
        const x = currR * Math.cos(ang), y = currR * Math.sin(ang);
        if (prev) addLine(prev.x, prev.y, x, y, entry.rgb, entry, idx, actualT);
        prev = {x, y};
      }
    } else if (cfg.mode === 'girih') {
      const sym = 10; // Classical decagonal Girih
      const r = cfg.size / 2;
      const strapAngle = 54 * Math.PI / 180;
      const { entry, idx, t: actualT } = getColor(0.5);
      
      const drawTile = (cx, cy, radius, rotation) => {
        const vertices = [];
        for (let i = 0; i < sym; i++) {
          const ang = (i / sym) * Math.PI * 2 + rotation;
          vertices.push({ x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) });
        }
        // Draw strapwork crossing midpoints
        for (let i = 0; i < sym; i++) {
          const v1 = vertices[i], v2 = vertices[(i + 1) % sym];
          const midX = (v1.x + v2.x) / 2, midY = (v1.y + v2.y) / 2;
          const edgeAng = Math.atan2(v2.y - v1.y, v2.x - v1.x);
          
          const L = radius * 0.6 * cfg.girihComplexity;
          const x1 = midX + L * Math.cos(edgeAng + strapAngle);
          const y1 = midY + L * Math.sin(edgeAng + strapAngle);
          const x2 = midX + L * Math.cos(edgeAng - strapAngle);
          const y2 = midY + L * Math.sin(edgeAng - strapAngle);
          addLine(midX, midY, x1, y1, entry.rgb, entry, idx, actualT);
          addLine(midX, midY, x2, y2, entry.rgb, entry, idx, actualT);
        }
      };
      drawTile(0, 0, r, 0);
      // Small decorative ring
      drawTile(0, 0, r * 0.4, Math.PI / 10);
    } else if (cfg.mode === 'penrose') {
      const phi = (1 + Math.sqrt(5)) / 2;
      let triangles = [];
      const size = cfg.size / 2;
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
      triangles.forEach(t => {
        const [type, A, B, C] = t;
        const dist = Math.sqrt(((A.x+B.x+C.x)/3)**2 + ((A.y+B.y+C.y)/3)**2);
        const { entry, idx, t: actualT } = getColor(dist / (cfg.size/2));
        addLine(A.x, A.y, B.x, B.y, entry.rgb, entry, idx, actualT);
        addLine(B.x, B.y, C.x, C.y, entry.rgb, entry, idx, actualT);
        addLine(C.x, C.y, A.x, A.y, entry.rgb, entry, idx, actualT);
      });
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

    const canvas = project.canvas[0];
    [...usedColors].forEach((c, idx) => { canvas.layerData[c] = { name: `Layer ${idx+1}`, order: idx+1, visible: true }; });
    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const rebuild = () => this.renderControls(tabId);

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return;

    const fillableModes = ['flower-of-life', 'vesica-piscis', 'islamic-star', 'concentric-polygons', 'fermat-spiral'];
    const supportsFill = fillableModes.includes(cfg.mode);

    scroll.appendChild(UI.makeGeneralSettingsSection(cfg, set, rebuild, App.palettes, palette, {
      supportPath: true,
      supportFill: supportsFill,
      supportColorRange: true,
      supportBorder: true,
      minSize: 10,
      maxSize: 100
    }));

    if (cfg.mode === 'flower-of-life' || cfg.mode === 'metatrons-cube' || cfg.mode === 'honeycomb') {
      scroll.appendChild(UI.makeSection('Geometry Settings', [
        UI.makeRow('Rings', UI.makeStepCounter(cfg.folRings, 1, 10, v => set('folRings', v)))
      ]));
    } else if (cfg.mode === 'rose-curve') {
      scroll.appendChild(UI.makeSection('Rose Settings', [
        UI.makeRow('k (n/d)', UI.makeRange(1, 20, 0.1, cfg.roseK, v => set('roseK', +v))),
        UI.makeRow('Samples', UI.makeRange(50, 1000, 10, cfg.roseSamples, v => set('roseSamples', +v)))
      ]));
    } else if (cfg.mode === 'archimedean-spiral' || cfg.mode === 'fermat-spiral') {
      scroll.appendChild(UI.makeSection('Spiral Settings', [
        UI.makeRow('Turns', UI.makeRange(1, 80, 0.5, cfg.spiralTurns, v => set('spiralTurns', +v)))
      ]));
    } else if (cfg.mode === 'concentric-polygons') {
      scroll.appendChild(UI.makeSection('Polygon Settings', [
        UI.makeRow('Count', UI.makeStepCounter(cfg.concCount, 1, 20, v => set('concCount', v))),
        UI.makeRow('Sides', UI.makeStepCounter(cfg.concSides, 3, 12, v => set('concSides', v))),
        UI.makeRow('Twist', UI.makeRange(-45, 45, 1, cfg.concRotation, v => set('concRotation', +v), '°'))
      ]));
    } else if (cfg.mode === 'islamic-star') {
      scroll.appendChild(UI.makeSection('Star Settings', [
        UI.makeRow('Symmetry', UI.makeStepCounter(cfg.starSymmetry, 3, 24, v => set('starSymmetry', v))),
        UI.makeRow('Inset', UI.makeRange(0.1, 0.9, 0.05, cfg.starV, v => set('starV', +v)))
      ]));
    } else if (cfg.mode === 'girih') {
      scroll.appendChild(UI.makeSection('Girih Settings', [
        UI.makeRow('Extension', UI.makeRange(0.5, 2.0, 0.1, cfg.girihComplexity, v => set('girihComplexity', +v)))
      ]));
    } else if (cfg.mode === 'penrose') {
      scroll.appendChild(UI.makeSection('Penrose Settings', [
        UI.makeRow('Subdivisions', UI.makeStepCounter(cfg.penroseSteps, 1, 6, v => set('penroseSteps', v)))
      ]));
    }
  }
};

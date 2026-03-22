import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const VoronoiTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Voronoi Generator</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Voronoi Design';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'laFont-1000lpcm',
      paletteOffset: 0,
      pointsCount: 50,
      seed: 12345,
      padding: 2,
      border: true,
      relaxIterations: 2,
      renderMode: 'path', // 'path' or 'points'
      cellScale: 0.9,
      size: 40
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'voronoi', pane, cfg, state };

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.rawData = this.generateXCS(inst.cfg);
    inst.state.shapes = XcsTab.parseXCS(inst.state.rawData);
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

    const CX = 50, CY = 50;
    const halfSize = cfg.size / 2;
    const bounds = [CX - halfSize, CY - halfSize, CX + halfSize, CY + halfSize];
    
    // Seeded random
    let seed = cfg.seed;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    let points = [];
    for (let i = 0; i < cfg.pointsCount; i++) {
      points.push([
        bounds[0] + random() * cfg.size,
        bounds[1] + random() * cfg.size
      ]);
    }

    // Relaxation (Lloyd's algorithm)
    for (let iter = 0; iter < cfg.relaxIterations; iter++) {
      const delaunay = d3.Delaunay.from(points);
      const voronoi = delaunay.voronoi(bounds);
      const newPoints = [];
      for (let i = 0; i < points.length; i++) {
        const cell = voronoi.cellPolygon(i);
        if (cell) {
          let x = 0, y = 0;
          for (let p of cell) { x += p[0]; y += p[1]; }
          newPoints.push([x / cell.length, y / cell.length]);
        } else {
          newPoints.push(points[i]);
        }
      }
      points = newPoints;
    }

    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi(bounds);
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    for (let i = 0; i < points.length; i++) {
      const polygon = voronoi.cellPolygon(i);
      if (!polygon) continue;

      const centroid = points[i];
      const scaledPolygon = polygon.map(p => [
        centroid[0] + (p[0] - centroid[0]) * cfg.cellScale,
        centroid[1] + (p[1] - centroid[1]) * cfg.cellScale
      ]);

      const dPath = "M" + scaledPolygon.map(p => p.map(c => c.toFixed(3)).join(",")).join("L") + "Z";
      
      // Calculate bounding box for the path
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      scaledPolygon.forEach(p => {
        minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
      });

      const entryIdx = (cfg.paletteOffset + i) % palette.entries.length;
      const entry = palette.entries[entryIdx];
      const params = {
        power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1,
        processingLightSource: laserSource
      };

      XCSExporter.addPath(project, {
        x: (minX + maxX) / 2, y: (minY + maxY) / 2,
        width: maxX - minX, height: maxY - minY,
        dPath, layerColor: entry.rgb, laserSource, params,
        extraDisplayData: { hideLabels: true }
      });
    }

    if (cfg.border) {
      XCSExporter.addRect(project, {
        x: CX, y: CY, width: cfg.size, height: cfg.size,
        layerColor: "#ffffff", laserSource, 
        params: { power: 10, speed: 100, repeat: 1, processingLightSource: laserSource },
        extraDisplayData: { hideLabels: true }
      });
    }

    return project;
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
      UI.makeRow('Start Color', UI.makePalettePicker(palette.entries, cfg.paletteOffset, v => set('paletteOffset', v))),
      UI.makeRow('Points', UI.makeRange(10, 200, 1, cfg.pointsCount, v => set('pointsCount', +v))),
      UI.makeRow('Seed', UI.makeRange(1, 100000, 1, cfg.seed, v => set('seed', +v))),
      UI.makeRow('Size', UI.makeRange(10, 100, 1, cfg.size, v => set('size', +v), 'mm')),
      UI.makeRow('Cell Scale', UI.makeRange(0.1, 1.0, 0.05, cfg.cellScale, v => set('cellScale', +v))),
      UI.makeRow('Relaxation', UI.makeStepCounter(cfg.relaxIterations, 0, 10, v => set('relaxIterations', v))),
      UI.makeToggleRow('Show Border', cfg.border, v => set('border', v))
    ]));
  }
};

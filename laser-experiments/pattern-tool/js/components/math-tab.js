import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { UI, uuid } from '../utils.js';
import { XCSExporter } from '../../../xcs-module/js/xcs-exporter.js';
import { PalMgr } from '../palettes.js';
import { XCS_LAYERS } from '../constants.js';

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

    const defaults = {
      type: 'rose',
      size: 80,
      paletteId: 'laFont-846lpcm',
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
      f1: 1, d1: 0.01, f2: 1.01, d2: 0.01, p1: 0, p2: 1.57,
      // Maurer Rose
      roseN: 6, roseD: 71,
      // Truchet
      truchetRes: 10, truchetSeed: 12345,
      // Kaleidoscope
      kSegments: 12, kPoints: 20,
      // Spider Web
      webSpokes: 12, webRings: 15, webSag: 0.15, webSpiral: 1.0, webRandom: 0.05,
      // Inscribed Circles
      circleCount: 50, circleMinR: 1, circleMaxR: 5, circleSeed: 12345,
      // Phyllotaxis
      points: 500, angle: 137.5, dotSize: 1,
      // Hypotrochoid
      hypoR: 20, hypor: 5, hypod: 5, hypoSamples: 1000,
      // Spirograph
      spiroR: 20, spiror: 5, spirod: 5, spiroSamples: 1000,
      // Superformula
      sfM: 5, sfN1: 1, sfN2: 1, sfN3: 1, sfA: 1, sfB: 1, sfSamples: 500,
      // Slime Mold
      slimeCount: 200, slimeResolution: 40, slimeSteps: 50,
      // Game of Life
      golResolution: 30, golIterations: 10, golPreset: 'block',
      // Cellular Automata
      caResolution: 50, caRule: 30, caStartMode: 'single',
      // Kerf Test
      kerfCount: 10, kerfStart: 10, kerfStep: 0.05, kerfHeight: 20, kerfGap: 2,
      // Thermal Wall
      wallCount: 20, wallStartSpacing: 5, wallEndSpacing: 0.1, wallHeight: 40,
      // Flow Field
      flowResolution: 20, flowCount: 100, flowSteps: 20, flowComplexity: 5,
      // Worley Noise
      worleyResolution: 20, worleyPoints: 5, worleySeed: 12345,
      // Density Test
      dtCount: 5, dtMinLPCM: 10, dtMaxLPCM: 100, dtSize: 10, dtGap: 2,
      dtShowOutline: true, dtShowFill: true,
      // Test Scale
      scaleLength: 100, scaleOrientation: 'horizontal', scaleShowLabels: true,
      // DLA
      dlaCount: 200, dlaResolution: 50,
      // Reaction Diffusion
      rdResolution: 40, rdIterations: 200, rdPreset: 'mazzitelli',
      // Membrane
      memResolution: 40, memFrequency: 5, memAmplitude: 1,
      // Stippling
      stippleResolution: 20, stippleSeed: 12345, stippleScale: 0.8,
      // Halftone Test
      hlLPCM: 846, hlPower: 100,
      // Blend Circles
      bcCount: 5, bcSizes: "5, 4, 3, 2, 1, 0.5, 0.25", bcGap: 2.0, bcNumInner: 5, bcNumOuter: 5,
      bcRingSpacing: 0.01, 
      bcEdgeReductionStart: 0.2, bcEdgeReductionEnd: 1.0, 
      bcFadeReductionStart: 0.1, bcFadeReductionEnd: 0.5,
      bcPaletteIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      // Tiles
      tileShape: 'square', tileSize: 5.0, tileGap: 0.5, tileAreaW: 40, tileAreaH: 40,
      tileColorIndices: [0, 1, 2], tileColorMode: 'linear'
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;

    const fillableTypes = ['penrose-p3', 'chladni', 'tiles'];
    if (!fillableTypes.includes(cfg.type)) {
      cfg.renderMode = 'path';
    }

    if (cfg.totalSize !== undefined) {
      cfg.size = cfg.totalSize;
      delete cfg.totalSize;
    }
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'math', pane, cfg, state };

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Math Pattern';
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
      return { entry, idx: actualIdx, t, paletteName: palette.name, colorName: entry.label };
    };

    if (cfg.type === 'rose') {
      const k = cfg.n / cfg.d;
      let dPath = '';
      const samples = Math.PI * 2 * cfg.d;
      for (let a = 0; a <= samples; a += 0.05) {
        const r = (cfg.size / 2) * Math.cos(k * a);
        const x = CX + r * Math.cos(a);
        const y = CY + r * Math.sin(a);
        dPath += (dPath === '' ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
      }
      XCSExporter.addPath(project, { dPath, x: 0, y: 0, width: cfg.size, height: cfg.size, params: pm, isFill, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label, hideLabels: true } });
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
      XCSExporter.addPath(project, { dPath, x: 0, y: 0, width: cfg.size, height: cfg.size, params: pm, isFill, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label, hideLabels: true } });
      }
      else if (cfg.type === 'penrose-p3') {
      this.generatePenrose(project, cfg, pm, getColor, isFill, laserSource, CX, CY, palette);
      }
      else if (cfg.type === 'lissajous') {
      let dPath = '';
      for (let t = 0; t <= Math.PI * 2; t += 0.02) {
        const x = CX + (cfg.size / 2) * Math.sin(cfg.freqX * t + cfg.phase);
        const y = CY + (cfg.size / 2) * Math.sin(cfg.freqY * t);
        dPath += (dPath === '' ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
      }
      XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, isFill, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label, hideLabels: true } });
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
            const rectSize = step * 0.8;
            XCSExporter.addRect(project, {
              x: CX + (i/res-0.5)*cfg.size - rectSize / 2, y: CY + (j/res-0.5)*cfg.size - rectSize / 2,
              width: rectSize, height: rectSize, params: entryParams, isFill, laserSource, layerColor: ent.rgb,
              extraDisplayData: { t: actualT }
            });
            idx++;
          }
        }
      }
      }
      else if (cfg.type === 'harmonograph') {
        const radius = cfg.size / 2;
        if (cfg.colorRangeMode) {
          let prevX, prevY;
          const totalSteps = 2000;
          for (let i = 0; i <= totalSteps; i++) {
            const t = i * 0.05;
            const x = CX + (cfg.size/2) * Math.exp(-cfg.d1 * t) * Math.sin(t * cfg.f1 + cfg.p1);
            const y = CY + (cfg.size/2) * Math.exp(-cfg.d2 * t) * Math.sin(t * cfg.f2 + cfg.p2);
            
            if (i > 0) {
              const tValue = i / totalSteps;
              const d = Math.sqrt(Math.pow(x - CX, 2) + Math.pow(y - CY, 2));
              const distT = Math.min(1, d / radius);
              const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
              const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
              
              XCSExporter.addPath(project, { 
                dPath: `M ${prevX.toFixed(3)} ${prevY.toFixed(3)} L ${x.toFixed(3)} ${y.toFixed(3)}`, 
                x: (prevX + x) / 2, y: (prevY + y) / 2, 
                width: Math.abs(x - prevX) || 0.1, height: Math.abs(y - prevY) || 0.1, 
                params: entryParams, isFill, laserSource, layerColor: ent.rgb, 
                extraDisplayData: { t: actualT, hideLabels: true } 
              });
            }
            prevX = x; prevY = y;
            if (t > 100) break;
          }
        } else {
          let dPath = '';
          for (let t = 0; t < 100; t += 0.05) {
            const x = CX + (cfg.size/2) * Math.exp(-cfg.d1 * t) * Math.sin(t * cfg.f1 + cfg.p1);
            const y = CY + (cfg.size/2) * Math.exp(-cfg.d2 * t) * Math.sin(t * cfg.f2 + cfg.p2);
            dPath += (dPath === '' ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
          }
          XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, isFill, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label, hideLabels: true } });
        }
      }
      else if (cfg.type === 'truchet-arcs') {
        const res = cfg.truchetRes || 10;
        const step = cfg.size / res;
        for (let i = 0; i < res; i++) {
          for (let j = 0; j < res; j++) {
            const x = CX - cfg.size / 2 + i * step;
            const y = CY - cfg.size / 2 + j * step;
            const rand = ((i * 13 + j * 7) % 2) === 0; // Deterministic random
            const tValue = (i * res + j) / (res * res - 1 || 1);
            const { entry: ent, idx: colorIdx } = getColor(tValue);
            const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
            
            let dPath = "";
            const r = step / 2;
            if (rand) {
              dPath = `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} 
                       M ${x + r} ${y + step} A ${r} ${r} 0 0 0 ${x + step} ${y + r}`;
            } else {
              dPath = `M ${x} ${y + r} A ${r} ${r} 0 0 0 ${x + r} ${y + step}
                       M ${x + r} ${y} A ${r} ${r} 0 0 1 ${x + step} ${y + r}`;
            }
            XCSExporter.addPath(project, { dPath, x: x + r, y: y + r, width: step, height: step, params: entryParams, isFill: false, laserSource, layerColor: ent.rgb });
          }
        }
      }
      else if (cfg.type === 'kaleidoscope') {
        const segments = cfg.kSegments || 12;
        const count = cfg.kPoints || 20;
        const angleStep = (Math.PI * 2) / segments;
        
        for (let i = 0; i < count; i++) {
          const r1 = ((i * 17) % 100) / 100 * (cfg.size / 2);
          const r2 = ((i * 31) % 100) / 100 * (cfg.size / 2);
          const a1 = ((i * 7) % 100) / 100 * angleStep;
          const a2 = ((i * 13) % 100) / 100 * angleStep;
          
          const tValue = i / (count - 1 || 1);
          const { entry: ent, idx: colorIdx } = getColor(tValue);
          const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);

          for (let s = 0; s < segments; s++) {
            const baseAngle = s * angleStep;
            const x1 = CX + r1 * Math.cos(baseAngle + a1);
            const y1 = CY + r1 * Math.sin(baseAngle + a1);
            const x2 = CX + r2 * Math.cos(baseAngle + a2);
            const y2 = CY + r2 * Math.sin(baseAngle + a2);
            
            const x1m = CX + r1 * Math.cos(baseAngle + angleStep - a1);
            const y1m = CY + r1 * Math.sin(baseAngle + angleStep - a1);
            const x2m = CX + r2 * Math.cos(baseAngle + angleStep - a2);
            const y2m = CY + r2 * Math.sin(baseAngle + angleStep - a2);

            XCSExporter.addPath(project, { dPath: `M ${x1} ${y1} L ${x2} ${y2}`, x: CX, y: CY, width: cfg.size, height: cfg.size, params: entryParams, isFill: false, laserSource, layerColor: ent.rgb });
            XCSExporter.addPath(project, { dPath: `M ${x1m} ${y1m} L ${x2m} ${y2m}`, x: CX, y: CY, width: cfg.size, height: cfg.size, params: entryParams, isFill: false, laserSource, layerColor: ent.rgb });
          }
        }
      }
      else if (cfg.type === 'spider-web') {
        const spokes = cfg.webSpokes || 8;
        const rings = cfg.webRings || 10;
        const sag = cfg.webSag || 0.15;
        const spiral = cfg.webSpiral || 1.0;
        const randomness = cfg.webRandom || 0.05;
        
        let seed = 12345;
        const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

        const { entry: ent, idx: colorIdx } = getColor(0);
        const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
        
        const radiusLimit = cfg.size / 2;
        
        // 1. Radial Spokes
        for (let i = 0; i < spokes; i++) {
          const ang = (i * Math.PI * 2) / spokes;
          const x2 = CX + radiusLimit * Math.cos(ang);
          const y2 = CY + radiusLimit * Math.sin(ang);
          XCSExporter.addPath(project, { 
            dPath: `M ${CX} ${CY} L ${x2} ${y2}`, 
            x: CX, y: CY, width: cfg.size, height: cfg.size, 
            params: entryParams, isFill: false, laserSource, layerColor: ent.rgb 
          });
        }
        
        // 2. Spiral Cross-Lines
        const totalSegments = rings * spokes;
        
        for (let i = 0; i < totalSegments; i++) {
          const t1 = i / totalSegments;
          const t2 = (i + 1) / totalSegments;
          
          const a1 = (i * Math.PI * 2) / spokes;
          const a2 = ((i + 1) * Math.PI * 2) / spokes;
          
          const r1 = t1 * radiusLimit * (1 + (random() - 0.5) * randomness);
          const r2 = t2 * radiusLimit * (1 + (random() - 0.5) * randomness);
          
          const x1 = CX + r1 * Math.cos(a1);
          const y1 = CY + r1 * Math.sin(a1);
          const x2 = CX + r2 * Math.cos(a2);
          const y2 = CY + r2 * Math.sin(a2);
          
          // Control point for the curve (Quadratic Bezier)
          const midA = (a1 + a2) / 2;
          const midR = ((r1 + r2) / 2) * (1 - sag);
          const qx = CX + midR * Math.cos(midA);
          const qy = CY + midR * Math.sin(midA);
          
          const segPath = `M ${x1.toFixed(3)} ${y1.toFixed(3)} Q ${qx.toFixed(3)} ${qy.toFixed(3)} ${x2.toFixed(3)} ${y2.toFixed(3)}`;
          
          const tValue = i / (totalSegments - 1 || 1);
          const { entry: webEnt, idx: webColorIdx } = getColor(tValue);
          const webParams = PalMgr.getParams(cfg.paletteId, webColorIdx);
          
          XCSExporter.addPath(project, { 
            dPath: segPath, x: CX, y: CY, width: cfg.size, height: cfg.size, 
            params: webParams, isFill: false, laserSource, layerColor: webEnt.rgb,
            extraDisplayData: { t: tValue, hideLabels: true }
          });
        }
      }
      else if (cfg.type === 'inscribed-circles') {
        const count = cfg.circleCount || 50;
        const minR = cfg.circleMinR || 1;
        const maxR = cfg.circleMaxR || 5;
        
        let seed = cfg.circleSeed || 12345;
        const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        
        const placed = [];
        const radiusLimit = cfg.size / 2;

        for (let i = 0; i < count * 5 && placed.length < count; i++) {
          const r = minR + random() * (maxR - minR);
          const x = (random() - 0.5) * (radiusLimit * 2 - r * 2);
          const y = (random() - 0.5) * (radiusLimit * 2 - r * 2);
          
          let overlap = false;
          for (const p of placed) {
            const d = Math.sqrt((x - p.x)**2 + (y - p.y)**2);
            if (d < r + p.r) { overlap = true; break; }
          }
          
          if (!overlap) {
            placed.push({ x, y, r });
            const tValue = placed.length / (count || 1);
            const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
            const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
            XCSExporter.addCircle(project, {
              x: CX + x, y: CY + y, width: r * 2, height: r * 2,
              params: entryParams, isFill, laserSource, layerColor: ent.rgb,
              extraDisplayData: { t: actualT, hideLabels: true }
            });
          }
        }
      }
      else if (cfg.type === 'dla') {
        const count = cfg.dlaCount || 200;
        const res = cfg.dlaResolution || 50;
        const step = cfg.size / res;
        
        const grid = Array.from({ length: res }, () => new Array(res).fill(0));
        const cx = Math.floor(res / 2), cy = Math.floor(res / 2);
        grid[cy][cx] = 1;
        
        let placed = [{x: cx, y: cy}];
        
        for (let i = 0; i < count && placed.length < count; i++) {
          let wx, wy;
          const side = Math.floor(Math.random() * 4);
          if (side === 0) { wx = Math.floor(Math.random() * res); wy = 0; }
          else if (side === 1) { wx = res - 1; wy = Math.floor(Math.random() * res); }
          else if (side === 2) { wx = Math.floor(Math.random() * res); wy = res - 1; }
          else { wx = 0; wy = Math.floor(Math.random() * res); }
          
          for (let s = 0; s < 1000; s++) {
            const dx = Math.floor(Math.random() * 3) - 1;
            const dy = Math.floor(Math.random() * 3) - 1;
            wx = Math.max(0, Math.min(res - 1, wx + dx));
            wy = Math.max(0, Math.min(res - 1, wy + dy));
            
            let stuck = false;
            for (let ny = -1; ny <= 1; ny++) {
              for (let nx = -1; nx <= 1; nx++) {
                if (nx === 0 && ny === 0) continue;
                const tx = wx + nx, ty = wy + ny;
                if (tx >= 0 && tx < res && ty >= 0 && ty < res && grid[ty][tx]) {
                  stuck = true; break;
                }
              }
              if (stuck) break;
            }
            
            if (stuck) {
              grid[wy][wx] = 1;
              placed.push({x: wx, y: wy});
              break;
            }
          }
        }

        placed.forEach((p, i) => {
          const tValue = i / (placed.length - 1 || 1);
          const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
          const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
          XCSExporter.addRect(project, {
            x: CX - cfg.size / 2 + p.x * step + step / 2,
            y: CY - cfg.size / 2 + p.y * step + step / 2,
            width: step * 0.9, height: step * 0.9,
            params: entryParams, isFill, laserSource, layerColor: ent.rgb,
            extraDisplayData: { t: actualT, hideLabels: true }
          });
        });
      }
      else if (cfg.type === 'reaction-diffusion') {
        const res = cfg.rdResolution || 40;
        const iter = cfg.rdIterations || 200;
        const step = cfg.size / res;
        
        let A = Array.from({ length: res }, () => new Array(res).fill(1.0));
        let B = Array.from({ length: res }, () => new Array(res).fill(0.0));
        
        // Seed center
        for (let i = Math.floor(res/2-3); i < Math.floor(res/2+3); i++) {
          for (let j = Math.floor(res/2-3); j < Math.floor(res/2+3); j++) {
            if (i >= 0 && i < res && j >= 0 && j < res) B[i][j] = 1.0;
          }
        }

        const presets = {
          'mazzitelli': { f: 0.0367, k: 0.0649 },
          'mitosis': { f: 0.0367, k: 0.0649 },
          'coral': { f: 0.0545, k: 0.062 },
          'fingerprint': { f: 0.0545, k: 0.062 },
          'spirals': { f: 0.018, k: 0.051 },
          'worms': { f: 0.058, k: 0.065 }
        };
        const p = presets[cfg.rdPreset] || presets['mazzitelli'];
        const feed = p.f, kill = p.k;
        const dA = 1.0, dB = 0.5;

        for (let n = 0; n < iter; n++) {
          let nextA = Array.from({ length: res }, () => new Array(res).fill(0));
          let nextB = Array.from({ length: res }, () => new Array(res).fill(0));
          for (let y = 0; y < res; y++) {
            for (let x = 0; x < res; x++) {
              // 3x3 Laplacian stencil
              const ym1 = (y - 1 + res) % res, yp1 = (y + 1) % res;
              const xm1 = (x - 1 + res) % res, xp1 = (x + 1) % res;
              
              const la = A[y][x] * -1.0 +
                         (A[ym1][x] + A[yp1][x] + A[y][xm1] + A[y][xp1]) * 0.2 +
                         (A[ym1][xm1] + A[ym1][xp1] + A[yp1][xm1] + A[yp1][xp1]) * 0.05;
              
              const lb = B[y][x] * -1.0 +
                         (B[ym1][x] + B[yp1][x] + B[y][xm1] + B[y][xp1]) * 0.2 +
                         (B[ym1][xm1] + B[ym1][xp1] + B[yp1][xm1] + B[yp1][xp1]) * 0.05;

              const abb = A[y][x] * B[y][x] * B[y][x];
              nextA[y][x] = A[y][x] + (dA * la - abb + feed * (1 - A[y][x]));
              nextB[y][x] = B[y][x] + (dB * lb + abb - (kill + feed) * B[y][x]);
              
              nextA[y][x] = Math.max(0, Math.min(1, nextA[y][x]));
              nextB[y][x] = Math.max(0, Math.min(1, nextB[y][x]));
            }
          }
          A = nextA; B = nextB;
        }

        for (let y = 0; y < res; y++) {
          for (let x = 0; x < res; x++) {
            if (B[y][x] > 0.15) {
              const tValue = Math.min(1, B[y][x]);
              const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
              const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
              XCSExporter.addRect(project, {
                x: CX - cfg.size / 2 + x * step + step / 2,
                y: CY - cfg.size / 2 + y * step + step / 2,
                width: step * 0.9, height: step * 0.9,
                params: entryParams, isFill, laserSource, layerColor: ent.rgb,
                extraDisplayData: { t: actualT, hideLabels: true }
              });
            }
          }
        }
      }
      else if (cfg.type === 'membrane') {
        const res = cfg.memResolution || 40;
        const step = cfg.size / res;
        const freq = cfg.memFrequency || 5;
        const amp = cfg.memAmplitude || 1;
        
        for (let y = 0; y < res; y++) {
          for (let x = 0; x < res; x++) {
            const nx = (x / res - 0.5) * freq;
            const ny = (y / res - 0.5) * freq;
            const val = (Math.sin(nx) + Math.cos(ny) + Math.sin(nx * 0.5 + ny) + Math.cos(nx - ny * 0.5)) / 4;
            const normVal = (val + 1) / 2; // 0 to 1
            
            if (normVal > 0.5) {
              const tValue = (normVal - 0.5) * 2;
              const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
              const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
              XCSExporter.addCircle(project, {
                x: CX - cfg.size / 2 + x * step + step / 2,
                y: CY - cfg.size / 2 + y * step + step / 2,
                width: step * normVal * amp, height: step * normVal * amp,
                params: entryParams, isFill, laserSource, layerColor: ent.rgb,
                extraDisplayData: { t: actualT, hideLabels: true }
              });
            }
          }
        }
      }
      else if (cfg.type === 'stippling') {
        const res = cfg.stippleResolution || 20;
        const step = cfg.size / res;
        let seed = cfg.stippleSeed || 12345;
        const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        
        for (let y = 0; y < res; y++) {
          for (let x = 0; x < res; x++) {
            const r = random();
            const dotSize = r * step * (cfg.stippleScale || 0.8);
            const ox = (random() - 0.5) * step * 0.5;
            const oy = (random() - 0.5) * step * 0.5;
            
            const tValue = r;
            const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
            const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
            
            XCSExporter.addCircle(project, {
              x: CX - cfg.size / 2 + x * step + step / 2 + ox,
              y: CY - cfg.size / 2 + y * step + step / 2 + oy,
              width: Math.max(0.1, dotSize), height: Math.max(0.1, dotSize),
              params: entryParams, isFill, laserSource, layerColor: ent.rgb,
              extraDisplayData: { t: actualT, hideLabels: true }
            });
          }
        }
      }
      else if (cfg.type === 'phyllotaxis') {
        const count = cfg.points || 500;
        const c = (cfg.size / 2) / Math.sqrt(count);
        for (let i = 0; i < count; i++) {
          const r = c * Math.sqrt(i);
          const theta = i * (cfg.angle || 137.5) * Math.PI / 180;
          const x = CX + r * Math.cos(theta);
          const y = CY + r * Math.sin(theta);
          const tValue = i / (count - 1 || 1);
          const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
          const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
          XCSExporter.addCircle(project, {
            x, y, width: cfg.dotSize || 1, height: cfg.dotSize || 1,
            params: entryParams, isFill, laserSource, layerColor: ent.rgb,
            extraDisplayData: { t: actualT, hideLabels: true }
          });
        }
      }
      else if (cfg.type === 'hypotrochoid') {
        const R = cfg.hypoR || 20;
        const r = cfg.hypor || 5;
        const d = cfg.hypod || 5;
        const samples = cfg.hypoSamples || 1000;
        const scale = (cfg.size / 2) / (Math.abs(R - r) + d);
        
        let dPath = '';
        const limit = 20 * Math.PI; // Good enough for most
        for (let a = 0; a <= limit; a += limit / samples) {
          const x = (R - r) * Math.cos(a) + d * Math.cos((R - r) / r * a);
          const y = (R - r) * Math.sin(a) - d * Math.sin((R - r) / r * a);
          const tx = CX + x * scale;
          const ty = CY + y * scale;
          dPath += (dPath === '' ? 'M' : 'L') + `${tx.toFixed(3)} ${ty.toFixed(3)}`;
        }
        XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, isFill, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0, paletteName: palette.name, colorName: entry.label, hideLabels: true } });
      }
      else if (cfg.type === 'truchet-squares') {
        const res = cfg.truchetRes || 10;
        const step = cfg.size / res;
        
        let seed = cfg.truchetSeed || 12345;
        const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

        for (let iy = 0; iy < res; iy++) {
          for (let ix = 0; ix < res; ix++) {
            const x = CX - cfg.size / 2 + ix * step;
            const y = CY - cfg.size / 2 + iy * step;
            const r = random();
            
            const tValue = (ix + iy) / (2 * res - 2 || 1);
            const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
            const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
            
            let dPath = "";
            if (r > 0.5) {
              dPath = `M ${x.toFixed(3)} ${y.toFixed(3)} L ${(x + step).toFixed(3)} ${(y + step).toFixed(3)} M ${(x + step).toFixed(3)} ${y.toFixed(3)} L ${x.toFixed(3)} ${(y + step).toFixed(3)}`;
            } else {
              dPath = `M ${(x + step/2).toFixed(3)} ${y.toFixed(3)} L ${(x + step/2).toFixed(3)} ${(y + step).toFixed(3)} M ${x.toFixed(3)} ${(y + step/2).toFixed(3)} L ${(x + step).toFixed(3)} ${(y + step/2).toFixed(3)}`;
            }
            
            XCSExporter.addPath(project, { 
              dPath, x: x + step/2, y: y + step/2, width: step, height: step, 
              params: entryParams, isFill: false, laserSource, layerColor: ent.rgb, 
              extraDisplayData: { t: actualT, hideLabels: true } 
            });
          }
        }
      }
      else if (cfg.type === 'game-of-life') {
        const res = cfg.golResolution || 30;
        const iter = cfg.golIterations || 10;
        const step = cfg.size / res;
        
        let grid = Array.from({ length: res }, () => new Array(res).fill(0));
        
        const setCell = (x, y) => { if (x >= 0 && x < res && y >= 0 && y < res) grid[y][x] = 1; };

        if (cfg.golPreset === 'glider') {
          setCell(1, 0); setCell(2, 1); setCell(0, 2); setCell(1, 2); setCell(2, 2);
        } else if (cfg.golPreset === 'pulsar') {
          const cx = Math.floor(res / 2), cy = Math.floor(res / 2);
          [2, 7].forEach(d => {
            for (let i = -4; i <= -2; i++) { setCell(cx+i, cy-d); setCell(cx+i, cy+d); setCell(cx-i, cy-d); setCell(cx-i, cy+d); }
            for (let i = 2; i <= 4; i++) { setCell(cx+i, cy-d); setCell(cx+i, cy+d); setCell(cx-i, cy-d); setCell(cx-i, cy+d); }
            for (let i = -4; i <= -2; i++) { setCell(cx-d, cy+i); setCell(cx+d, cy+i); setCell(cx-d, cy-i); setCell(cx+d, cy-i); }
            for (let i = 2; i <= 4; i++) { setCell(cx-d, cy+i); setCell(cx+d, cy+i); setCell(cx-d, cy-i); setCell(cx+d, cy-i); }
          });
        } else if (cfg.golPreset === 'random') {
          grid = grid.map(row => row.map(() => Math.random() > 0.7 ? 1 : 0));
        } else {
          // Default: Block
          const cx = Math.floor(res / 2), cy = Math.floor(res / 2);
          setCell(cx, cy); setCell(cx+1, cy); setCell(cx, cy+1); setCell(cx+1, cy+1);
        }

        for (let n = 0; n < iter; n++) {
          const next = Array.from({ length: res }, () => new Array(res).fill(0));
          for (let y = 0; y < res; y++) {
            for (let x = 0; x < res; x++) {
              let neighbors = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = (x + dx + res) % res, ny = (y + dy + res) % res;
                  if (grid[ny][nx]) neighbors++;
                }
              }
              if (grid[y][x] && (neighbors === 2 || neighbors === 3)) next[y][x] = 1;
              else if (!grid[y][x] && neighbors === 3) next[y][x] = 1;
            }
          }
          grid = next;
        }

        for (let y = 0; y < res; y++) {
          for (let x = 0; x < res; x++) {
            if (grid[y][x]) {
              const tValue = (x + y) / (2 * res - 2 || 1);
              const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
              const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
              XCSExporter.addRect(project, {
                x: CX - cfg.size / 2 + x * step + step / 2,
                y: CY - cfg.size / 2 + y * step + step / 2,
                width: step * 0.9, height: step * 0.9,
                params: entryParams, isFill, laserSource, layerColor: ent.rgb,
                extraDisplayData: { t: actualT, hideLabels: true }
              });
            }
          }
        }
      }
      else if (cfg.type === 'cellular-automata') {
        const res = cfg.caResolution || 50;
        const rule = cfg.caRule || 30;
        const step = cfg.size / res;
        const rows = Math.floor(res);
        const cols = res;
        
        let current = new Array(cols).fill(0);
        if (cfg.caStartMode === 'random') {
          for (let i = 0; i < cols; i++) if (Math.random() > 0.5) current[i] = 1;
        } else {
          current[Math.floor(cols / 2)] = 1;
        }

        const getNewVal = (l, c, r) => {
          const idx = (l << 2) | (c << 1) | r;
          return (rule >> idx) & 1;
        };

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (current[x]) {
              const tValue = y / (rows - 1 || 1);
              const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
              const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
              XCSExporter.addRect(project, {
                x: CX - cfg.size / 2 + x * step + step / 2,
                y: CY - cfg.size / 2 + y * step + step / 2,
                width: step * 0.9, height: step * 0.9,
                params: entryParams, isFill, laserSource, layerColor: ent.rgb,
                extraDisplayData: { t: actualT, hideLabels: true }
              });
            }
          }
          const next = new Array(cols).fill(0);
          for (let i = 0; i < cols; i++) {
            const l = current[(i - 1 + cols) % cols];
            const c = current[i];
            const r = current[(i + 1) % cols];
            next[i] = getNewVal(l, c, r);
          }
          current = next;
          if (y >= rows - 1) break; 
        }
      }
      else if (cfg.type === 'kerf-test') {
        const count = cfg.kerfCount || 10;
        const startW = cfg.kerfStart || 10;
        const stepW = cfg.kerfStep || 0.05;
        const h = cfg.kerfHeight || 20;
        const gap = cfg.kerfGap || 2;
        
        const totalW = count * startW + (count * (count - 1) / 2) * stepW + (count - 1) * gap;
        let x = CX - totalW / 2;
        
        for (let i = 0; i < count; i++) {
          const w = startW + i * stepW;
          const rectX = x + w / 2;
          const { entry: ent, idx: colorIdx } = getColor(i / (count - 1 || 1));
          const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
          
          XCSExporter.addRect(project, {
            x: rectX, y: CY, width: w, height: h,
            params: entryParams, isFill, laserSource, layerColor: ent.rgb,
            extraDisplayData: { hideLabels: false }
          });
          
          // Add label
          const labelSize = 1.5;
          const unscaledHeight = 23.35;
          const sc = labelSize / unscaledHeight;
          const fontSize = 72 * sc;
          XCSExporter.addText(project, {
            text: w.toFixed(2), x: rectX, y: CY + h / 2 + 2, width: 5, height: labelSize, fontSize, scale: sc,
            layerColor: "#ffffff", laserSource, align: "center", isFill: false
          });

          x += w + gap;
        }
      }
      else if (cfg.type === 'superformula') {
        const m = cfg.sfM || 5;
        const n1 = cfg.sfN1 || 1;
        const n2 = cfg.sfN2 || 1;
        const n3 = cfg.sfN3 || 1;
        const a_val = cfg.sfA || 1;
        const b_val = cfg.sfB || 1;
        const samples = cfg.sfSamples || 500;
        
        let dPath = '';
        for (let i = 0; i <= samples; i++) {
          const phi = (i / samples) * Math.PI * 2;
          const t1 = Math.pow(Math.abs(Math.cos(m * phi / 4) / a_val), n2);
          const t2 = Math.pow(Math.abs(Math.sin(m * phi / 4) / b_val), n3);
          const r = Math.pow(t1 + t2, -1 / n1);
          
          const scale = (cfg.size / 2);
          const x = CX + r * scale * Math.cos(phi);
          const y = CY + r * scale * Math.sin(phi);
          dPath += (i === 0 ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
        }
        XCSExporter.addPath(project, { 
          dPath: dPath + ' Z', x: CX, y: CY, width: cfg.size, height: cfg.size, 
          params: pm, isFill, laserSource, layerColor: entry.rgb, 
          extraDisplayData: { t: 0, hideLabels: true } 
        });
      }
      else if (cfg.type === 'slime-mold') {
        const count = cfg.slimeCount || 200;
        const res = cfg.slimeResolution || 40;
        const steps = cfg.slimeSteps || 50;
        const stepSize = cfg.size / res;
        
        let grid = Array.from({ length: res }, () => new Array(res).fill(0));
        let agents = Array.from({ length: count }, () => ({
          x: Math.random() * res,
          y: Math.random() * res,
          angle: Math.random() * Math.PI * 2
        }));

        for (let s = 0; s < steps; s++) {
          agents.forEach(a => {
            // Move
            a.x += Math.cos(a.angle) * 0.5;
            a.y += Math.sin(a.angle) * 0.5;
            // Wrap
            a.x = (a.x + res) % res;
            a.y = (a.y + res) % res;
            // Deposit
            grid[Math.floor(a.y)][Math.floor(a.x)] += 1;
            // Rotate randomly
            a.angle += (Math.random() - 0.5) * 0.5;
          });
        }

        for (let y = 0; y < res; y++) {
          for (let x = 0; x < res; x++) {
            if (grid[y][x] > 0) {
              const tValue = Math.min(1, grid[y][x] / 5);
              const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
              const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
              XCSExporter.addRect(project, {
                x: CX - cfg.size / 2 + x * stepSize + stepSize / 2,
                y: CY - cfg.size / 2 + y * stepSize + stepSize / 2,
                width: stepSize * 0.8, height: stepSize * 0.8,
                params: entryParams, isFill, laserSource, layerColor: ent.rgb,
                extraDisplayData: { t: actualT, hideLabels: true }
              });
            }
          }
        }
      }
      else if (cfg.type === 'thermal-wall') {
        const count = cfg.wallCount || 20;
        const startS = cfg.wallStartSpacing || 5;
        const endS = cfg.wallEndSpacing || 0.1;
        const h = cfg.wallHeight || 40;
        
        let currentX = CX - cfg.size / 2;
        const step = (startS - endS) / (count - 1 || 1);

        for (let i = 0; i < count; i++) {
          const s = startS - i * step;
          const { entry: ent, idx: colorIdx, t: actualT } = getColor(i / (count - 1 || 1));
          const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
          
          XCSExporter.addPath(project, {
            dPath: `M ${currentX.toFixed(3)} ${CY - h/2} L ${currentX.toFixed(3)} ${CY + h/2}`,
            x: currentX, y: CY, width: 0.1, height: h,
            params: entryParams, isFill: false, laserSource, layerColor: ent.rgb,
            extraDisplayData: { t: actualT, hideLabels: true }
          });
          
          currentX += s;
          if (currentX > CX + cfg.size / 2) break;
        }
      }
      else if (cfg.type === 'flow-field') {
        const res = cfg.flowResolution || 20;
        const count = cfg.flowCount || 100;
        const steps = cfg.flowSteps || 20;
        const stepSize = cfg.size / res;
        
        // Simple 2D Pseudo-random noise function
        const noise = (x, y) => {
          const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          return v - Math.floor(v);
        };

        const getAngle = (x, y) => {
          const nx = x / cfg.size * cfg.flowComplexity;
          const ny = y / cfg.size * cfg.flowComplexity;
          return noise(nx, ny) * Math.PI * 2;
        };

        for (let i = 0; i < count; i++) {
          let px = CX - cfg.size / 2 + Math.random() * cfg.size;
          let py = CY - cfg.size / 2 + Math.random() * cfg.size;
          let dPath = `M ${px.toFixed(3)} ${py.toFixed(3)}`;
          
          for (let s = 0; s < steps; s++) {
            const angle = getAngle(px, py);
            px += Math.cos(angle) * stepSize * 0.5;
            py += Math.sin(angle) * stepSize * 0.5;
            dPath += ` L ${px.toFixed(3)} ${py.toFixed(3)}`;
            
            // Bounds check
            if (px < CX - cfg.size/2 || px > CX + cfg.size/2 || py < CY - cfg.size/2 || py > CY + cfg.size/2) break;
          }
          
          const tValue = i / (count - 1 || 1);
          const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
          const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
          
          XCSExporter.addPath(project, {
            dPath, x: CX, y: CY, width: cfg.size, height: cfg.size,
            params: entryParams, isFill: false, laserSource, layerColor: ent.rgb,
            extraDisplayData: { t: actualT, hideLabels: true }
          });
        }
      }
      else if (cfg.type === 'worley-noise') {
        const res = cfg.worleyResolution || 20;
        const ptCount = cfg.worleyPoints || 5;
        const step = cfg.size / res;
        
        let seed = cfg.worleySeed || 12345;
        const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        
        const pts = Array.from({ length: ptCount }, () => ({
          x: (random() - 0.5) * cfg.size,
          y: (random() - 0.5) * cfg.size
        }));

        for (let iy = 0; iy < res; iy++) {
          for (let ix = 0; ix < res; ix++) {
            const x = (ix / res - 0.5) * cfg.size;
            const y = (iy / res - 0.5) * cfg.size;
            
            let minDist = Infinity;
            pts.forEach(p => {
              const d = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
              if (d < minDist) minDist = d;
            });

            const tValue = Math.min(1, minDist / (cfg.size / 2));
            const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
            const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
            
            const s = step * (1 - tValue * 0.5);
            XCSExporter.addRect(project, {
              x: CX + x + step/2, y: CY + y + step/2, width: s, height: s,
              params: entryParams, isFill, laserSource, layerColor: ent.rgb,
              extraDisplayData: { t: actualT, hideLabels: true }
            });
          }
        }
      }

      else if (cfg.type === 'bitmap-line') {
        XCSExporter.addImage(project, {
          x: CX, y: CY, width: cfg.size, height: cfg.rectHeight || 10,
          layerColor: entry.rgb, laserSource,
          params: pm,
          extraDisplayData: { hideLabels: true, t: 0, paletteName: palette.name, colorName: entry.label }
        });
      }
      else if (cfg.type === 'test') {
        this.generateTestPattern(project, CX, CY, cfg.size, pm, laserSource);
      }
      else if (cfg.type === 'density-test') {
        const count = cfg.dtCount || 5;
        const minLPCM = cfg.dtMinLPCM || 10;
        const maxLPCM = cfg.dtMaxLPCM || 100;
        const squareSize = cfg.dtSize || 10;
        const gap = cfg.dtGap || 2;
        const showOutline = cfg.dtShowOutline ?? true;
        const showFill = cfg.dtShowFill ?? true;
        
        const totalW = count * squareSize + (count - 1) * gap;
        const startX = CX - totalW / 2;
        const topY = CY - squareSize - 2; // Row 1 center
        const botY = CY + 2;             // Row 2 center

        // Use a single color from the palette based on offset
        const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
        const entryIdx = (cfg.paletteOffset || 0) % palette.entries.length;
        const entry = palette.entries[entryIdx];
        const baseParams = PalMgr.getParams(cfg.paletteId, entryIdx);

        for (let i = 0; i < count; i++) {
          const x = startX + i * (squareSize + gap) + squareSize / 2;
          const lpcm = count > 1 ? minLPCM + (maxLPCM - minLPCM) * (i / (count - 1)) : minLPCM;
          const spacing = 10 / lpcm; // mm between lines
          
          const entryParams = { ...baseParams, density: Math.round(lpcm) };

          // Row 1: Squares (Forced to Fill mode)
          if (showOutline) {
            XCSExporter.addRect(project, {
              x, y: topY, width: squareSize, height: squareSize,
              params: entryParams, isFill: true, laserSource, layerColor: entry.rgb,
              extraDisplayData: { hideLabels: true }
            });
          }

          // Row 2: Manual Path Hatching (Always vector lines)
          if (showFill) {
            let dPath = "";
            const lines = Math.floor(squareSize / spacing);
            const sy = botY - squareSize / 2;
            for (let l = 0; l <= lines; l++) {
              const ly = sy + l * spacing;
              if (ly > botY + squareSize / 2 + 0.01) break;
              dPath += `M ${(x - squareSize / 2).toFixed(3)} ${ly.toFixed(3)} L ${(x + squareSize / 2).toFixed(3)} ${ly.toFixed(3)} `;
            }
            XCSExporter.addPath(project, {
              dPath, x, y: botY, width: squareSize, height: squareSize,
              params: entryParams, isFill: false, laserSource, layerColor: entry.rgb,
              extraDisplayData: { hideLabels: true }
            });
          }

          // Shared Label (Interpolated LPCM)
          const labelSize = 2.0;
          const sc = labelSize / 23.35;
          XCSExporter.addText(project, {
            text: `${lpcm.toFixed(0)}`, x, y: botY + squareSize / 2 + 8, width: 10, height: labelSize, fontSize: 72 * sc, scale: sc,
            params: entryParams,
            layerColor: entry.rgb, laserSource, align: "center", isFill: isFill
          });
        }
      }
      else if (cfg.type === 'test-scale') {
        const length = cfg.scaleLength || 100;
        const orientation = cfg.scaleOrientation || 'horizontal';
        const showLabels = cfg.scaleShowLabels ?? true;
        
        const { entry: ent, idx: colorIdx } = getColor(0);
        const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
        
        let dPath = "";
        const isHoriz = orientation === 'horizontal';
        const start = 50 - length / 2;
        
        // Main Axis Line
        if (isHoriz) dPath += `M ${start.toFixed(3)} 50 L ${(start + length).toFixed(3)} 50 `;
        else dPath += `M 50 ${start.toFixed(3)} L 50 ${(start + length).toFixed(3)} `;

        for (let i = 0; i <= length; i++) {
          const pos = start + i;
          let tickLen = 1.5; // 1mm ticks
          if (i % 10 === 0) tickLen = 4; // 10mm ticks
          else if (i % 5 === 0) tickLen = 2.5; // 5mm ticks
          
          if (isHoriz) {
            dPath += `M ${pos.toFixed(3)} 50 L ${pos.toFixed(3)} ${(50 + tickLen).toFixed(3)} `;
          } else {
            dPath += `M 50 ${pos.toFixed(3)} L ${(50 + tickLen).toFixed(3)} ${pos.toFixed(3)} `;
          }

          // Labels every 10mm
          if (showLabels && i % 10 === 0) {
            const labelSize = 2.0;
            const sc = labelSize / 23.35;
            const lx = isHoriz ? pos : 50 + tickLen + 2;
            const ly = isHoriz ? 50 + tickLen + 2 : pos;
            
            XCSExporter.addText(project, {
              text: `${i}`, x: lx, y: ly, width: 5, height: labelSize, fontSize: 72 * sc, scale: sc,
              params: entryParams, layerColor: ent.rgb, laserSource, align: "center", isFill: false
            });
          }
        }

        XCSExporter.addPath(project, {
          dPath, x: 50, y: 50, width: isHoriz ? length : 5, height: isHoriz ? 5 : length,
          params: entryParams, isFill: false, laserSource, layerColor: ent.rgb,
          extraDisplayData: { hideLabels: true }
        });
      }
      else if (cfg.type === 'maurer-rose') {
        const n = cfg.roseN || 6;
        const d = cfg.roseD || 71;
        const scale = cfg.size / 2;

        let dPath = '';
        for (let i = 0; i <= 360; i++) {
          const k = i * d * Math.PI / 180;
          const r = scale * Math.sin(n * k);
          const x = CX + r * Math.cos(k);
          const y = CY + r * Math.sin(k);
          dPath += (i === 0 ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
        }
        XCSExporter.addPath(project, { 
          dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, 
          params: pm, isFill: false, laserSource, layerColor: entry.rgb, 
          extraDisplayData: { t: 0, hideLabels: true } 
        });
      }
      else if (cfg.type === 'spirograph') {
        const R = cfg.spiroR || 20;
        const r = cfg.spiror || 5;
        const d = cfg.spirod || 5;
        const samples = cfg.spiroSamples || 1000;
        const scale = (cfg.size / 2) / (R + r + d);

        let dPath = '';
        const limit = 20 * Math.PI;
        for (let a = 0; a <= limit; a += limit / samples) {
          const x = (R + r) * Math.cos(a) - d * Math.cos((R + r) / r * a);
          const y = (R + r) * Math.sin(a) - d * Math.sin((R + r) / r * a);
          const tx = CX + x * scale;
          const ty = CY + y * scale;
          dPath += (a === 0 ? 'M' : 'L') + `${tx.toFixed(3)} ${ty.toFixed(3)}`;
        }
        XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: pm, isFill: false, laserSource, layerColor: entry.rgb, extraDisplayData: { t: 0, hideLabels: true } });
      }
      else if (cfg.type === 'halftone-test') {
        const lpcm = cfg.hlLPCM || 846;
        const power = cfg.hlPower || 100;
        const hParams = { ...pm, density: Math.round(lpcm), power: Math.round(power) };
        
        const drawRow = (startY, startDia, endDia, step, dotNoOffset = 1) => {
          let currentX = CX - 40; // Start towards the left
          const count = Math.round((endDia - startDia) / step) + 1;
          const dots = [];
          
          for (let i = 0; i < count; i++) {
            const dotNo = dotNoOffset + i;
            const d = startDia + i * step;
            const x = currentX + d / 2;
            
            dots.push({ x, y: startY, d, dotNo });

            const dotColor = (dotNo % 2 === 0) ? "#5b9bd5" : "#10b981"; // Even: Blue, Odd: Green
            const tickColor = "#8b5cf6"; // Ticks: Violet
            
            // 1. Draw Dot
            XCSExporter.addCircle(project, {
              x, y: startY, width: d, height: d,
              params: hParams, isFill: true, laserSource, layerColor: dotColor,
              extraDisplayData: { hideLabels: true }
            });
            
            // 2. Ticks (Only on Even dots, Small 0.8mm)
            if (dotNo % 2 === 0) {
              const tickLen = 0.8;
              const ty1 = startY + d/2 + 1;
              const ty2 = ty1 + tickLen;
              XCSExporter.addPath(project, {
                dPath: `M ${x.toFixed(3)} ${ty1.toFixed(3)} L ${x.toFixed(3)} ${ty2.toFixed(3)}`,
                x, y: (ty1 + ty2) / 2, width: 0.1, height: tickLen,
                params: hParams, isFill: false, laserSource, layerColor: tickColor,
                extraDisplayData: { hideLabels: true }
              });
            }
            
            // 4. Update X for next dot (1mm fixed gap)
            const nextD = startDia + (i + 1) * step;
            currentX += (d/2 + 1.0 + nextD/2);
          }
          return dots;
        };

        // Row 1: 0.10 - 1.00 (Dots 1-10)
        drawRow(CY - 15, 0.1, 1.0, 0.1, 1);
        
        // Row 2: 1.10 - 2.00 (Dots 11-20)
        const row2Dots = drawRow(CY - 10, 1.1, 2.0, 0.1, 11);
        
        // Repositioned 6.0mm dot (Above dot #19, which is index 8 in row 2)
        const dot19 = row2Dots[8];
        const isoX = dot19.x;
        const isoY = CY - 16;
        const isoD = 6.0;
        const isoColor = "#f59e0b"; // 6mm dot is Layer 3 (Amber)
        
        XCSExporter.addCircle(project, {
          x: isoX, y: isoY, width: isoD, height: isoD,
          params: hParams, isFill: true, laserSource, layerColor: isoColor,
          extraDisplayData: { hideLabels: true }
        });
      }
      else if (cfg.type === 'blend-circles') {
        const count = cfg.bcCount || 5;
        const gap = cfg.bcGap || 2.0;
        
        // Parse comma-separated sizes string
        const sizes = (cfg.bcSizes || "5").split(',').map(s => parseFloat(s.trim())).filter(s => !isNaN(s) && s > 0);
        if (sizes.length === 0) sizes.push(5);

        const numInner = cfg.bcNumInner || 0;
        const numOuter = cfg.bcNumOuter || 0;
        const ringSpacing = cfg.bcRingSpacing || 0.01;
        
        const erStart = cfg.bcEdgeReductionStart ?? 0;
        const erEnd = cfg.bcEdgeReductionEnd ?? erStart;
        const frStart = cfg.bcFadeReductionStart ?? 0;
        const frEnd = cfg.bcFadeReductionEnd ?? frStart;

        const CORE_LAYER = XCS_LAYERS[0]; // Layer 1

        // Horizontal sizing based on the largest diameter in the list
        const maxSize = Math.max(...sizes);
        const totalW = count * maxSize + (count - 1) * gap;
        const startX = CX - totalW / 2 + maxSize / 2;

        // Vertical sizing: each row is centered below the previous one
        // We calculate total height first to center the whole block on CY
        let totalH = 0;
        const rowGaps = 2.0; // Fixed vertical gap between rows
        sizes.forEach((s, idx) => {
          totalH += s;
          if (idx < sizes.length - 1) totalH += rowGaps;
        });
        
        let currentY = CY - totalH / 2;

        sizes.forEach((size, sIdx) => {
          // Center of current row
          const rowCenterY = currentY + size / 2;

          for (let i = 0; i < count; i++) {
            const t = count > 1 ? i / (count - 1) : 0;
            const edgeRed = erStart + t * (erEnd - erStart);
            const fadeRed = frStart + t * (frEnd - frStart);
            
            const x = startX + i * (maxSize + gap);
            const y = rowCenterY;
            const ringLayer = XCS_LAYERS[(i + 1) % XCS_LAYERS.length];

            // Use specific palette index for this column
            const colorIdx = cfg.bcPaletteIndices[i] ?? 0;
            const colEnt = palette.entries[colorIdx] || palette.entries[0];
            const ringParams = PalMgr.getParams(cfg.paletteId, colorIdx);

            // 1. Filled Core - Exact palette match (color and power)
            XCSExporter.addCircle(project, {
              x: x - size / 2, y: y - size / 2,
              width: size, height: size,
              params: ringParams, isFill: true, laserSource, layerColor: colEnt.rgb,
              extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: colEnt.label }
            });

            const edgePower = Math.max(1, Math.min(100, ringParams.power - edgeRed));

            // 2. Edge Ring - Using technical layers for blending
            XCSExporter.addCircle(project, {
              x: x - size / 2, y: y - size / 2,
              width: size, height: size,
              params: { ...ringParams, power: edgePower },
              isFill: false, laserSource, layerColor: ringLayer,
              extraDisplayData: { hideLabels: true }
            });

            // 3. Inner Rings
            for (let j = 1; j <= numInner; j++) {
              const r = (size / 2) - (j * ringSpacing);
              if (r <= 0) break;
              const ringPower = Math.max(1, Math.min(100, edgePower - (j * fadeRed)));
              XCSExporter.addCircle(project, {
                x: x - r, y: y - r,
                width: r * 2, height: r * 2,
                params: { ...ringParams, power: ringPower },
                isFill: false, laserSource, layerColor: ringLayer,
                extraDisplayData: { hideLabels: true }
              });
            }

            // 4. Outer Rings
            for (let j = 1; j <= numOuter; j++) {
              const r = (size / 2) + (j * ringSpacing);
              const ringPower = Math.max(1, Math.min(100, edgePower - (j * fadeRed)));
              XCSExporter.addCircle(project, {
                x: x - r, y: y - r,
                width: r * 2, height: r * 2,
                params: { ...ringParams, power: ringPower },
                isFill: false, laserSource, layerColor: ringLayer,
                extraDisplayData: { hideLabels: true }
              });
            }
          }
          currentY += size + rowGaps;
        });
      }
      else if (cfg.type === 'tiles') {
        const size = cfg.tileSize || 5;
        const gap = cfg.tileGap ?? 0.5;
        const areaW = cfg.tileAreaW || 40;
        const areaH = cfg.tileAreaH || 40;
        const shape = cfg.tileShape || 'square';
        
        const startX = CX - areaW / 2;
        const startY = CY - areaH / 2;

        // Vertical steps depend on shape
        let dy = size + gap;
        let dx = size + gap;
        
        if (shape === 'hexagon') {
          dy = size * 0.75 + gap;
          dx = (size * Math.sqrt(3)) / 2 + gap;
        } else if (shape === 'triangle') {
          dy = (size * Math.sqrt(3) / 2) + gap;
          dx = size / 2 + gap / 2;
        }

        const rows = Math.ceil(areaH / dy);
        const cols = Math.ceil(areaW / dx);

        let tileIdx = 0;
        for (let r = 0; r < rows; r++) {
          const rowY = startY + r * dy;
          if (rowY > CY + areaH / 2 + size/2) break;

          for (let c = 0; c < cols + 2; c++) {
            const xOffset = (shape === 'hexagon' && r % 2 === 1) ? dx / 2 : 0;
            const x = startX + c * dx + xOffset;

            // Stay within area bounds
            if (x > CX + areaW / 2 + size/2) break;
            if (x < CX - areaW / 2 - size/2) continue;

            // Color Mode Logic
            let colorIdxInPattern;
            if (cfg.tileColorMode === 'stripes') {
              colorIdxInPattern = (r + c) % 3;
            } else if (cfg.tileColorMode === 'mosaic') {
              // True 3-coloring for Hex/Square
              colorIdxInPattern = (c + 2 * r) % 3;
            } else {
              // Linear (tile sequence)
              colorIdxInPattern = tileIdx % 3;
            }

            const paletteIdx = cfg.tileColorIndices[colorIdxInPattern] ?? 0;
            const colEnt = palette.entries[paletteIdx] || palette.entries[0];
            const tileParams = PalMgr.getParams(cfg.paletteId, paletteIdx);

            if (shape === 'square') {
              XCSExporter.addRect(project, {
                x: x - size / 2, y: rowY - size / 2,
                width: size, height: size,
                params: tileParams, isFill, laserSource, layerColor: colEnt.rgb,
                extraDisplayData: { paletteName: palette.name, colorName: colEnt.label }
              });
            } else if (shape === 'hexagon') {
              let dPath = "";
              const hr = size / 2;
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (i * 60 - 30);
                const px = x + hr * Math.cos(angle);
                const py = rowY + hr * Math.sin(angle);
                dPath += (i === 0 ? "M " : "L ") + `${px.toFixed(3)} ${py.toFixed(3)}`;
              }
              dPath += " Z";
              XCSExporter.addPath(project, { dPath, x: 0, y: 0, width: size, height: size, params: tileParams, isFill, laserSource, layerColor: colEnt.rgb });
            } else if (shape === 'triangle') {
              const isUp = (r + c) % 2 === 0;
              let dPath = "";
              const h = (size * Math.sqrt(3)) / 2;
              if (isUp) {
                dPath = `M ${x} ${rowY - h/2} L ${x + size/2} ${rowY + h/2} L ${x - size/2} ${rowY + h/2} Z`;
              } else {
                dPath = `M ${x} ${rowY + h/2} L ${x + size/2} ${rowY - h/2} L ${x - size/2} ${rowY - h/2} Z`;
              }
              XCSExporter.addPath(project, { dPath, x: 0, y: 0, width: size, height: size, params: tileParams, isFill, laserSource, layerColor: colEnt.rgb });
            }
            tileIdx++;
          }
        }
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

      return project;
      },

      generatePenrose(project, cfg, pm, getColor, isFill, laserSource, CX, CY) {
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
      XCSExporter.addPath(project, { dPath, x: CX, y: CY, width: cfg.size, height: cfg.size, params: entryParams, isFill, laserSource, layerColor: ent.rgb, extraDisplayData: { t: actualT } });
      });
      },

  generateTestPattern(project, CX, CY, size, pm, laserSource) {
    const s2 = size / 2;
    // Crosshair
    XCSExporter.addPath(project, { dPath: `M ${CX-s2} ${CY} L ${CX+s2} ${CY} M ${CX} ${CY-s2} L ${CX} ${CY+s2}`, x: CX, y: CY, width: size, height: size, params: pm, isFill: false, laserSource, layerColor: "#ff0000" });
    // Circles
    XCSExporter.addCircle(project, { x: CX, y: CY, width: size, height: size, params: pm, isFill: false, laserSource, layerColor: "#00ff00" });
    XCSExporter.addCircle(project, { x: CX, y: CY, width: size/2, height: size/2, params: pm, isFill: false, laserSource, layerColor: "#0000ff" });
    // Square
    XCSExporter.addRect(project, { x: CX, y: CY, width: size, height: size, params: pm, isFill: false, laserSource, layerColor: "#ffff00" });
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const rebuild = () => this.renderControls(tabId);

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return;

    const fillableTypes = ['penrose-p3', 'chladni', 'phyllotaxis', 'cellular-automata', 'kerf-test', 'thermal-wall', 'game-of-life', 'worley-noise', 'inscribed-circles', 'dla', 'reaction-diffusion', 'superformula', 'slime-mold', 'membrane', 'truchet-squares', 'stippling', 'density-test', 'test-scale', 'halftone-test', 'tiles'];
    const supportsFill = fillableTypes.includes(cfg.type);
    const supportsColorRange = cfg.type !== 'density-test' && cfg.type !== 'blend-circles' && cfg.type !== 'tiles';
    const supportsGlobalColor = cfg.type !== 'tiles';

    scroll.appendChild(UI.makeGeneralSettingsSection(cfg, set, rebuild, App.palettes, palette, {
      supportPath: true,
      supportFill: supportsFill,
      supportColor: supportsGlobalColor,
      supportColorRange: supportsColorRange,
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
    } else if (cfg.type === 'maurer-rose') {
      scroll.appendChild(UI.makeSection('Maurer Settings', [
        UI.makeRow('n (Petals)', UI.makeRange(1, 20, 1, cfg.roseN, v => set('roseN', +v))),
        UI.makeRow('d (Degrees)', UI.makeRange(1, 360, 1, cfg.roseD, v => set('roseD', +v)))
      ]));
    } else if (cfg.type === 'truchet-arcs') {
      scroll.appendChild(UI.makeSection('Truchet Settings', [
        UI.makeRow('Resolution', UI.makeRange(2, 40, 1, cfg.truchetRes, v => set('truchetRes', +v)))
      ]));
    } else if (cfg.type === 'truchet-squares') {
      scroll.appendChild(UI.makeSection('Truchet Settings', [
        UI.makeRow('Resolution', UI.makeRange(2, 40, 1, cfg.truchetRes, v => set('truchetRes', +v))),
        UI.makeRow('Seed', UI.makeRange(1, 100000, 1, cfg.truchetSeed, v => set('truchetSeed', +v)))
      ]));
    } else if (cfg.type === 'kaleidoscope') {
      scroll.appendChild(UI.makeSection('Kaleidoscope Settings', [
        UI.makeRow('Segments', UI.makeRange(3, 32, 1, cfg.kSegments, v => set('kSegments', +v))),
        UI.makeRow('Points', UI.makeRange(5, 100, 1, cfg.kPoints, v => set('kPoints', +v)))
      ]));
    } else if (cfg.type === 'spider-web') {
      scroll.appendChild(UI.makeSection('Web Settings', [
        UI.makeRow('Spokes', UI.makeStepCounter(cfg.webSpokes, 3, 32, v => set('webSpokes', v))),
        UI.makeRow('Rings/Iter', UI.makeStepCounter(cfg.webRings, 1, 50, v => set('webRings', v))),
        UI.makeRow('Sag (Curve)', UI.makeRange(0, 0.5, 0.01, cfg.webSag, v => set('webSag', +v))),
        UI.makeRow('Randomness', UI.makeRange(0, 0.5, 0.01, cfg.webRandom, v => set('webRandom', +v)))
      ]));
    } else if (cfg.type === 'inscribed-circles') {
      scroll.appendChild(UI.makeSection('Circle Settings', [
        UI.makeRow('Count', UI.makeRange(10, 500, 10, cfg.circleCount, v => set('circleCount', +v))),
        UI.makeRow('Min Radius', UI.makeRange(0.1, 10, 0.1, cfg.circleMinR, v => set('circleMinR', +v), 'mm')),
        UI.makeRow('Max Radius', UI.makeRange(1, 50, 0.5, cfg.circleMaxR, v => set('circleMaxR', +v), 'mm')),
        UI.makeRow('Seed', UI.makeRange(1, 100000, 1, cfg.circleSeed, v => set('circleSeed', +v)))
      ]));
    } else if (cfg.type === 'dla') {
      scroll.appendChild(UI.makeSection('DLA Settings', [
        UI.makeRow('Count', UI.makeRange(10, 1000, 10, cfg.dlaCount, v => set('dlaCount', +v))),
        UI.makeRow('Resolution', UI.makeRange(10, 100, 1, cfg.dlaResolution, v => set('dlaResolution', +v)))
      ]));
    } else if (cfg.type === 'reaction-diffusion') {
      scroll.appendChild(UI.makeSection('RD Settings', [
        UI.makeRow('Pattern Type', UI.makeSelect(['mazzitelli', 'mitosis', 'coral', 'fingerprint', 'spirals', 'worms'], cfg.rdPreset, v => set('rdPreset', v))),
        UI.makeRow('Resolution', UI.makeRange(10, 100, 1, cfg.rdResolution, v => set('rdResolution', +v))),
        UI.makeRow('Iterations', UI.makeRange(10, 1000, 10, cfg.rdIterations, v => set('rdIterations', +v)))
      ]));

        } else if (cfg.type === 'membrane') {
        scroll.appendChild(UI.makeSection('Membrane Settings', [
        UI.makeRow('Resolution', UI.makeRange(10, 100, 1, cfg.memResolution, v => set('memResolution', +v))),
        UI.makeRow('Frequency', UI.makeRange(1, 20, 0.1, cfg.memFrequency, v => set('memFrequency', +v))),
        UI.makeRow('Amplitude', UI.makeRange(0.1, 5, 0.1, cfg.memAmplitude, v => set('memAmplitude', +v)))
        ]));
        } else if (cfg.type === 'stippling') {
        scroll.appendChild(UI.makeSection('Stippling Settings', [
        UI.makeRow('Resolution', UI.makeRange(10, 100, 1, cfg.stippleResolution, v => set('stippleResolution', +v))),
        UI.makeRow('Scale', UI.makeRange(0.1, 2, 0.1, cfg.stippleScale, v => set('stippleScale', +v))),
        UI.makeRow('Seed', UI.makeRange(1, 100000, 1, cfg.stippleSeed, v => set('stippleSeed', +v)))
        ]));
        } else if (cfg.type === 'superformula') {

      scroll.appendChild(UI.makeSection('Phyllotaxis Settings', [
        UI.makeRow('Points', UI.makeRange(10, 2000, 10, cfg.points, v => set('points', +v))),
        UI.makeRow('Angle', UI.makeRange(1, 360, 0.1, cfg.angle, v => set('angle', +v), '°')),
        UI.makeRow('Dot Size', UI.makeRange(0.1, 5, 0.1, cfg.dotSize, v => set('dotSize', +v), 'mm'))
      ]));
    } else if (cfg.type === 'hypotrochoid') {
      scroll.appendChild(UI.makeSection('Hypotrochoid Settings', [
        UI.makeRow('Outer R', UI.makeRange(1, 50, 0.5, cfg.hypoR, v => set('hypoR', +v))),
        UI.makeRow('Inner r', UI.makeRange(1, 50, 0.5, cfg.hypor, v => set('hypor', +v))),
        UI.makeRow('Distance d', UI.makeRange(1, 50, 0.5, cfg.hypod, v => set('hypod', +v))),
        UI.makeRow('Samples', UI.makeRange(100, 5000, 100, cfg.hypoSamples, v => set('hypoSamples', +v)))
      ]));
    } else if (cfg.type === 'spirograph') {
      scroll.appendChild(UI.makeSection('Spirograph Settings', [
        UI.makeRow('Outer R', UI.makeRange(1, 50, 0.5, cfg.spiroR, v => set('spiroR', +v))),
        UI.makeRow('Inner r', UI.makeRange(1, 50, 0.5, cfg.spiror, v => set('spiror', +v))),
        UI.makeRow('Distance d', UI.makeRange(1, 50, 0.5, cfg.spirod, v => set('spirod', +v))),
        UI.makeRow('Samples', UI.makeRange(100, 5000, 100, cfg.spiroSamples, v => set('spiroSamples', +v)))
      ]));
    } else if (cfg.type === 'superformula') {
      scroll.appendChild(UI.makeSection('Superformula Settings', [
        UI.makeRow('m (Symmetry)', UI.makeRange(0, 20, 0.1, cfg.sfM, v => set('sfM', +v))),
        UI.makeRow('n1', UI.makeRange(0.1, 10, 0.1, cfg.sfN1, v => set('sfN1', +v))),
        UI.makeRow('n2', UI.makeRange(0.1, 10, 0.1, cfg.sfN2, v => set('sfN2', +v))),
        UI.makeRow('n3', UI.makeRange(0.1, 10, 0.1, cfg.sfN3, v => set('sfN3', +v))),
        UI.makeRow('a', UI.makeRange(0.1, 10, 0.1, cfg.sfA, v => set('sfA', +v))),
        UI.makeRow('b', UI.makeRange(0.1, 10, 0.1, cfg.sfB, v => set('sfB', +v))),
        UI.makeRow('Samples', UI.makeRange(100, 2000, 100, cfg.sfSamples, v => set('sfSamples', +v)))
      ]));
    } else if (cfg.type === 'slime-mold') {
      scroll.appendChild(UI.makeSection('Slime Settings', [
        UI.makeRow('Agent Count', UI.makeRange(10, 1000, 10, cfg.slimeCount, v => set('slimeCount', +v))),
        UI.makeRow('Steps', UI.makeRange(1, 200, 1, cfg.slimeSteps, v => set('slimeSteps', +v))),
        UI.makeRow('Resolution', UI.makeRange(10, 100, 1, cfg.slimeResolution, v => set('slimeResolution', +v)))
      ]));
    } else if (cfg.type === 'game-of-life') {
      scroll.appendChild(UI.makeSection('GOL Settings', [
        UI.makeRow('Preset', UI.makeToggles(['block', 'glider', 'pulsar', 'random'], cfg.golPreset, v => set('golPreset', v))),
        UI.makeRow('Resolution', UI.makeRange(10, 100, 1, cfg.golResolution, v => set('golResolution', +v))),
        UI.makeRow('Iterations', UI.makeRange(0, 100, 1, cfg.golIterations, v => set('golIterations', +v)))
      ]));
    } else if (cfg.type === 'cellular-automata') {
      scroll.appendChild(UI.makeSection('CA Settings', [
        UI.makeRow('Rule (0-255)', UI.makeRange(0, 255, 1, cfg.caRule, v => set('caRule', +v))),
        UI.makeRow('Resolution', UI.makeRange(10, 200, 1, cfg.caResolution, v => set('caResolution', +v))),
        UI.makeRow('Start Mode', UI.makeToggles(['single', 'random'], cfg.caStartMode, v => set('caStartMode', v)))
      ]));
    } else if (cfg.type === 'kerf-test') {
      scroll.appendChild(UI.makeSection('Kerf Settings', [
        UI.makeRow('Count', UI.makeStepCounter(cfg.kerfCount, 1, 20, v => set('kerfCount', v))),
        UI.makeRow('Start Width', UI.makeRange(1, 50, 0.1, cfg.kerfStart, v => set('kerfStart', +v), 'mm')),
        UI.makeRow('Step', UI.makeRange(0.01, 1, 0.01, cfg.kerfStep, v => set('kerfStep', +v), 'mm')),
        UI.makeRow('Height', UI.makeRange(1, 100, 1, cfg.kerfHeight, v => set('kerfHeight', +v), 'mm')),
        UI.makeRow('Gap', UI.makeRange(0, 20, 0.5, cfg.kerfGap, v => set('kerfGap', +v), 'mm'))
      ]));
    } else if (cfg.type === 'density-test') {
      scroll.appendChild(UI.makeSection('Density Test Settings', [
        UI.makeRow('Count', UI.makeStepCounter(cfg.dtCount, 1, 20, v => set('dtCount', v))),
        UI.makeRow('Min LPCM', UI.makeRange(1, 1000, 1, cfg.dtMinLPCM, v => set('dtMinLPCM', +v))),
        UI.makeRow('Max LPCM', UI.makeRange(1, 1000, 1, cfg.dtMaxLPCM, v => set('dtMaxLPCM', +v))),
        UI.makeRow('Square Size', UI.makeRange(1, 50, 1, cfg.dtSize, v => set('dtSize', +v), 'mm')),
        UI.makeRow('Gap', UI.makeRange(-1, 4, 0.1, cfg.dtGap, v => set('dtGap', +v), 'mm')),
        UI.makeToggleRow('Show Outlines', cfg.dtShowOutline, v => set('dtShowOutline', v)),
        UI.makeToggleRow('Show Path Fill', cfg.dtShowFill, v => set('dtShowFill', v))
      ]));
    } else if (cfg.type === 'test-scale') {
      scroll.appendChild(UI.makeSection('Scale Settings', [
        UI.makeRow('Length', UI.makeRange(10, 100, 1, cfg.scaleLength, v => set('scaleLength', +v), 'mm')),
        UI.makeRow('Orientation', UI.makeToggles(['horizontal', 'vertical'], cfg.scaleOrientation, v => set('scaleOrientation', v))),
        UI.makeToggleRow('Show Labels', cfg.scaleShowLabels, v => set('scaleShowLabels', v))
      ]));
    } else if (cfg.type === 'thermal-wall') {
      scroll.appendChild(UI.makeSection('Thermal Wall Settings', [
        UI.makeRow('Line Count', UI.makeStepCounter(cfg.wallCount, 2, 100, v => set('wallCount', v))),
        UI.makeRow('Start Spacing', UI.makeRange(0.1, 20, 0.1, cfg.wallStartSpacing, v => set('wallStartSpacing', +v), 'mm')),
        UI.makeRow('End Spacing', UI.makeRange(0.01, 5, 0.01, cfg.wallEndSpacing, v => set('wallEndSpacing', +v), 'mm')),
        UI.makeRow('Height', UI.makeRange(1, 100, 1, cfg.wallHeight, v => set('wallHeight', +v), 'mm'))
      ]));
    } else if (cfg.type === 'flow-field') {
      scroll.appendChild(UI.makeSection('Flow Settings', [
        UI.makeRow('Line Count', UI.makeRange(10, 500, 10, cfg.flowCount, v => set('flowCount', +v))),
        UI.makeRow('Steps', UI.makeRange(5, 100, 1, cfg.flowSteps, v => set('flowSteps', +v))),
        UI.makeRow('Complexity', UI.makeRange(1, 20, 0.1, cfg.flowComplexity, v => set('flowComplexity', +v))),
        UI.makeRow('Resolution', UI.makeRange(5, 100, 1, cfg.flowResolution, v => set('flowResolution', +v)))
      ]));
    } else if (cfg.type === 'worley-noise') {
      scroll.appendChild(UI.makeSection('Worley Settings', [
        UI.makeRow('Resolution', UI.makeRange(5, 100, 1, cfg.worleyResolution, v => set('worleyResolution', +v))),
        UI.makeRow('Points', UI.makeStepCounter(cfg.worleyPoints, 1, 50, v => set('worleyPoints', v))),
        UI.makeRow('Seed', UI.makeRange(1, 100000, 1, cfg.worleySeed, v => set('worleySeed', +v)))
      ]));
    } else if (cfg.type === 'blend-circles') {
      scroll.appendChild(UI.makeSection('Blend Circle Settings', [
        UI.makeRow('Color Count', UI.makeStepCounter(cfg.bcCount, 1, 20, v => { cfg.bcCount = v; rebuild(); update(); }), 'Number of columns (individual colors).'),
        UI.makeRow('Gap', UI.makeRange(0, 20, 0.5, cfg.bcGap, v => set('bcGap', +v), 'mm'), 'Spacing between the center points of the circles.'),
        UI.makeRow('Sizes-mm', UI.makeTextInput(cfg.bcSizes, v => set('bcSizes', v), 'e.g. 5, 4, 3...'), 'Comma-separated list of diameters for each row.')
      ]));

      // Individual Color Pickers for each column
      const colorRows = [];
      for (let i = 0; i < cfg.bcCount; i++) {
        const curIdx = cfg.bcPaletteIndices[i] ?? 0;
        colorRows.push(UI.makeRow(`Color ${i + 1}`, UI.makePalettePicker(palette.entries, curIdx, v => {
          cfg.bcPaletteIndices[i] = v;
          update();
          Persistence.save();
        })));
      }
      scroll.appendChild(UI.makeSection('Column Colors', colorRows));

      scroll.appendChild(UI.makeSection('Ring Settings (0.001mm Step)', [
        UI.makeRow('Num Inner', UI.makeStepCounter(cfg.bcNumInner, 0, 100, v => set('bcNumInner', v)), 'Number of concentric rings shrinking inward from the diameter.'),
        UI.makeRow('Num Outer', UI.makeStepCounter(cfg.bcNumOuter, 0, 100, v => set('bcNumOuter', v)), 'Number of concentric rings growing outward from the diameter.'),
        UI.makeRow('Spacing', UI.makeRange(0.001, 0.1, 0.001, cfg.bcRingSpacing, v => set('bcRingSpacing', +v), 'mm'), 'Distance between each concentric ring path.')
      ]));
      scroll.appendChild(UI.makeSection('Power Reductions (%)', [
        UI.makeHeading('Ring Power Fade'),
        UI.makeRow('Start', UI.makeRange(0, 20, 0.1, cfg.bcEdgeReductionStart, v => set('bcEdgeReductionStart', +v), '%'), 'Initial power drop applied to the edge ring of the first circle.'),
        UI.makeRow('End',   UI.makeRange(0, 20, 0.1, cfg.bcEdgeReductionEnd, v => set('bcEdgeReductionEnd', +v), '%'), 'Initial power drop applied to the edge ring of the last circle.'),
        UI.makeHeading('Ring Size Step'),
        UI.makeRow('Start', UI.makeRange(0, 5, 0.01, cfg.bcFadeReductionStart, v => set('bcFadeReductionStart', +v), '%'), 'Cumulative power reduction per ring for the first circle.'),
        UI.makeRow('End',   UI.makeRange(0, 5, 0.01, cfg.bcFadeReductionEnd, v => set('bcFadeReductionEnd', +v), '%'), 'Cumulative power reduction per ring for the last circle.')
      ], false, null, '<b>Power Blending Logic</b><br><br>1. <b>Ring Power Fade</b>: The initial drop from core power to the edge ring.<br>2. <b>Ring Size Step</b>: The amount subtracted cumulatively from each concentric ring moving away from the edge.<br><br><i>Linear interpolation is applied to all values from the first circle to the last in the row.</i>'));

    } else if (cfg.type === 'tiles') {
      scroll.appendChild(UI.makeSection('Tiles Pattern Settings', [
        UI.makeRow('Shape', UI.makeToggles(['square', 'hexagon', 'triangle'], cfg.tileShape, v => set('tileShape', v), { square: 'Square', hexagon: 'Hex', triangle: 'Tri' })),
        UI.makeRow('Size', UI.makeRange(1, 50, 0.1, cfg.tileSize, v => set('tileSize', +v), 'mm')),
        UI.makeRow('Gap/Overlap', UI.makeRange(-5, 10, 0.1, cfg.tileGap, v => set('tileGap', +v), 'mm')),
        UI.makeRow('Area Width', UI.makeRange(10, 100, 1, cfg.tileAreaW, v => set('tileAreaW', +v), 'mm')),
        UI.makeRow('Area Height', UI.makeRange(10, 100, 1, cfg.tileAreaH, v => set('tileAreaH', +v), 'mm')),
        UI.makeRow('Color Layout', UI.makeToggles(['linear', 'stripes', 'mosaic'], cfg.tileColorMode, v => set('tileColorMode', v), { linear: 'Linear', stripes: 'Stripes', mosaic: 'Mosaic' }))
      ]));

      const colorPickers = [];
      for (let i = 0; i < 3; i++) {
        colorPickers.push(UI.makeRow(`Color ${i + 1}`, UI.makePalettePicker(palette.entries, cfg.tileColorIndices[i] ?? 0, v => {
          cfg.tileColorIndices[i] = v;
          update();
          Persistence.save();
        })));
      }
      scroll.appendChild(UI.makeSection('Tile Colors (Alternating)', colorPickers));
    }
  }
};

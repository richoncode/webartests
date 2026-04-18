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
      tileColorIndices: [0, 1, 2], tileColorMode: 'linear',
      tileBoundaryThickness: 0.0, tileSeparatorThickness: 0.0, tileBoundaryOffset: 0.0
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;

    const fillableTypes = ['penrose-p3', 'chladni', 'tiles'];
    if (!fillableTypes.includes(cfg.type)) {
      if (cfg.renderMode === 'fill') cfg.renderMode = 'path';
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
    if (!inst) return;

    if (inst._refreshTimeout) clearTimeout(inst._refreshTimeout);
    if (inst._abortController) inst._abortController.abort();
    inst._abortController = new AbortController();
    const signal = inst._abortController.signal;

    const delay = lazy ? 250 : 0;
    inst._refreshTimeout = setTimeout(async () => {
      try {
        XCSViewer.showProgress(inst.pane, 0);
        const project = await this.generateXCSAsync(inst.cfg, (pct) => {
          if (signal.aborted) throw new Error('Aborted');
          XCSViewer.showProgress(inst.pane, pct);
        });
        if (signal.aborted) return;
        inst.state.project = project;
        XCSViewer.update(inst.pane, inst.state, false);
        XCSViewer.hideProgress(inst.pane);
      } catch (err) {
        if (err.message !== 'Aborted') console.error('Refresh Error:', err);
      }
    }, delay);
  },

  async generateXCSAsync(cfg, onProgress) {
    const project = XCSExporter.createProject();
    const CX = 50, CY = 50;
    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return project;

    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';
    const isFill = cfg.renderMode === 'fill';
    const pm = PalMgr.getParams(cfg.paletteId, cfg.paletteOffset || 0);
    pm.density = cfg.lpcm;

    const drawOpts = {
      renderMode: cfg.renderMode,
      jitter: cfg.jitter || 0,
      edgeFade: cfg.edgeFade || 0
    };

    const getColor = (t) => {
      const start = cfg.paletteOffset || 0;
      const end = cfg.rangeEndIdx !== undefined ? cfg.rangeEndIdx : 10;
      const idx = cfg.colorRangeMode ? Math.round(start + (end - start) * t) : start;
      const actualIdx = Math.max(0, Math.min(palette.entries.length - 1, idx));
      const entry = palette.entries[actualIdx];
      return { entry, idx: actualIdx, t, paletteName: palette.name, colorName: entry.label };
    };

    let ops = 0;
    const yieldIfBusy = async (pct) => {
      ops++;
      if (ops % 20 === 0) {
        if (onProgress) onProgress(pct);
        await new Promise(r => requestAnimationFrame(r));
      }
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
      await XCSExporter.addPath(project, { ...drawOpts, dPath, x: 0, y: 0, width: cfg.size, height: cfg.size, params: pm, isFill, laserSource, layerColor: palette.entries[cfg.paletteOffset || 0].rgb, extraDisplayData: { t: 0, hideLabels: true } });
    }
    else if (cfg.type === 'spiral') {
      let dPath = '';
      const turns = 10;
      for (let a = 0; a <= Math.PI * 2 * turns; a += 0.1) {
        const x = CX + (cfg.a + cfg.b * a) * Math.cos(a);
        const y = CY + (cfg.a + cfg.b * a) * Math.sin(a);
        if (Math.sqrt((x-CX)**2+(y-CY)**2)*2 > cfg.size) break;
        dPath += (dPath === '' ? 'M' : 'L') + `${x.toFixed(3)} ${y.toFixed(3)}`;
      }
      await XCSExporter.addPath(project, { ...drawOpts, dPath, x: 0, y: 0, width: cfg.size, height: cfg.size, params: pm, isFill, laserSource, layerColor: palette.entries[cfg.paletteOffset || 0].rgb, extraDisplayData: { t: 0, hideLabels: true } });
    }
    else if (cfg.type === 'chladni') {
      const res = 50;
      const step = cfg.size / res;
      let idx = 0;
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          await yieldIfBusy(Math.round((i*res+j)/(res*res)*100));
          const x = (i / res - 0.5) * Math.PI * 2, y = (j / res - 0.5) * Math.PI * 2;
          const val = Math.cos(cfg.n_chladni * x) * Math.cos(cfg.m * y) - Math.cos(cfg.m * x) * Math.cos(cfg.n_chladni * y);
          if (Math.abs(val) < 0.1) {
            const { entry: ent, t: actualT } = getColor((val+2)/4);
            const entryParams = PalMgr.getParams(cfg.paletteId, palette.entries.indexOf(ent));
            await XCSExporter.addRect(project, { ...drawOpts, x: CX+(i/res-0.5)*cfg.size-step*0.4, y: CY+(j/res-0.5)*cfg.size-step*0.4, width: step*0.8, height: step*0.8, params: entryParams, isFill, laserSource, layerColor: ent.rgb, extraDisplayData: { t: actualT } });
          }
        }
      }
    }
    else if (cfg.type === 'blend-circles') {
      const count = cfg.bcCount || 5, gap = cfg.bcGap || 2.0;
      const sizes = (cfg.bcSizes || "5").split(',').map(s => parseFloat(s.trim())).filter(s => !isNaN(s) && s > 0);
      if (sizes.length === 0) sizes.push(5);
      const numInner = cfg.bcNumInner || 0, numOuter = cfg.bcNumOuter || 0, rSp = cfg.bcRingSpacing || 0.01;
      const erS = cfg.bcEdgeReductionStart ?? 0, erE = cfg.bcEdgeReductionEnd ?? erS;
      const frS = cfg.bcFadeReductionStart ?? 0, frE = cfg.bcFadeReductionEnd ?? frS;
      const maxSize = Math.max(...sizes), totalW = count * maxSize + (count - 1) * gap, startX = CX - totalW/2 + maxSize/2;
      let tH = 0; sizes.forEach((s, i) => { tH += s + (i < sizes.length-1 ? 2.0 : 0); });
      let currY = CY - tH/2;
      for (let sIdx = 0; sIdx < sizes.length; sIdx++) {
        const s = sizes[sIdx], rowY = currY + s/2;
        for (let i = 0; i < count; i++) {
          await yieldIfBusy(Math.round((sIdx*count+i)/(sizes.length*count)*100));
          const t = count > 1 ? i/(count-1) : 0, eRed = erS + t*(erE-erS), fRed = frS + t*(frE-frS);
          const x = startX + i*(maxSize+gap), rLayer = XCS_LAYERS[(i+1)%XCS_LAYERS.length];
          const cIdx = cfg.bcPaletteIndices[i] ?? 0, colEnt = palette.entries[cIdx] || palette.entries[0], rParams = PalMgr.getParams(cfg.paletteId, cIdx);
          await XCSExporter.addCircle(project, { x: x-s/2, y: rowY-s/2, width: s, height: s, params: rParams, isFill: true, laserSource, layerColor: colEnt.rgb, extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: colEnt.label } });
          const edgeP = Math.max(1, Math.min(100, rParams.power - eRed));
          await XCSExporter.addCircle(project, { x: x-s/2, y: rowY-s/2, width: s, height: s, params: { ...rParams, power: edgeP }, isFill: false, laserSource, layerColor: rLayer, extraDisplayData: { hideLabels: true } });
          for (let j = 1; j <= numInner; j++) {
            const r = s/2 - j*rSp; if (r <= 0) break;
            await XCSExporter.addCircle(project, { x: x-r, y: rowY-r, width: r*2, height: r*2, params: { ...rParams, power: Math.max(1, edgeP-j*fRed) }, isFill: false, laserSource, layerColor: rLayer, extraDisplayData: { hideLabels: true } });
          }
          for (let j = 1; j <= numOuter; j++) {
            const r = s/2 + j*rSp;
            await XCSExporter.addCircle(project, { x: x-r, y: rowY-r, width: r*2, height: r*2, params: { ...rParams, power: Math.max(1, edgeP-j*fRed) }, isFill: false, laserSource, layerColor: rLayer, extraDisplayData: { hideLabels: true } });
          }
        }
        currY += s + 2.0;
      }
    }
    else if (cfg.type === 'tiles') {
      const s = cfg.tileSize || 5, g = cfg.tileGap ?? 0.5, aW = cfg.tileAreaW || 40, aH = cfg.tileAreaH || 40, shape = cfg.tileShape || 'square';
      const startX = CX - aW/2, startY = CY - aH/2;
      let dy = s + g, dx = s + g;
      if (shape === 'hexagon') { dy = s*0.75+g; dx = (s*Math.sqrt(3))/2+g; }
      else if (shape === 'triangle') { dy = (s*Math.sqrt(3)/2)+g; dx = s/2+g/2; }
      else if (shape === 'compound') { dy = s + g; dx = s + g; }
      const rows = Math.ceil(aH/dy), cols = Math.ceil(aW/dx);
      
      // --- UNIFIED TECHNICAL GRID (OPTION 1: EDGE TRACING) ---
      const techSubPaths = [];
      const tSep = cfg.tileSeparatorThickness || 0;
      const tBound = cfg.tileBoundaryThickness || 0;
      const bOff = cfg.tileBoundaryOffset || 0;

      const occupancy = new Map(); // "r,c" -> {x, y, isUp (for tri)}
      const tileData = []; // Full list of tiles for rendering and knockout generation

      for (let r = 0; r < rows; r++) {
        const rowY = startY + r*dy; if (rowY > CY+aH/2+s/2) break;
        for (let c = 0; c < cols+2; c++) {
          const xOff = (shape === 'hexagon' && r%2===1) ? dx/2 : 0, x = startX + c*dx + xOff;
          if (x > CX+aW/2+s/2 || x < CX-aW/2-s/2) continue;
          
          const isUp = (r+c)%2===0;
          occupancy.set(`${r},${c}`, { x, y: rowY, isUp });
          tileData.push({ r, c, x, y: rowY, isUp });
        }
      }

      const kPathsRaw = [];
      const loopsRaw = [];
      // 1. Generate Rendered Tiles & Knockouts
      for (const t of tileData) {
        await yieldIfBusy();
        const { x, y, r, c, isUp } = t;

        if (tSep > 0) {
          const ks = Math.max(0.1, s - tSep); 
          if (shape === 'square' || shape === 'compound') {
            kPathsRaw.push([
              {x: x - ks/2, y: y - ks/2}, {x: x + ks/2, y: y - ks/2},
              {x: x + ks/2, y: y + ks/2}, {x: x - ks/2, y: y + ks/2}
            ]);
          } else if (shape === 'hexagon') {
            const hr = ks/2;
            const pts = [];
            for (let i = 0; i < 6; i++) { 
              const ang = (Math.PI/180)*(i*60-30); 
              pts.push({ x: x + hr*Math.cos(ang), y: y + hr*Math.sin(ang) });
            }
            kPathsRaw.push(pts);
          } else if (shape === 'triangle') {
            const kh = (ks*Math.sqrt(3))/2;
            if (isUp) {
              kPathsRaw.push([
                {x: x, y: y - kh/2}, {x: x + ks/2, y: y + kh/2}, {x: x - ks/2, y: y + kh/2}
              ]);
            } else {
              kPathsRaw.push([
                {x: x, y: y + kh/2}, {x: x + ks/2, y: y - kh/2}, {x: x - ks/2, y: y - kh/2}
              ]);
            }
          }
        }

        let tileIdx = r * (cols+2) + c;
        let cIdxP = (cfg.tileColorMode === 'stripes') ? (r+c)%3 : (cfg.tileColorMode === 'mosaic' ? (c+2*r)%3 : tileIdx%3);
        const pIdx = cfg.tileColorIndices[cIdxP] ?? 0, colEnt = palette.entries[pIdx] || palette.entries[0], tParams = PalMgr.getParams(cfg.paletteId, pIdx);
        
        if (shape === 'square') await XCSExporter.addRect(project, { ...drawOpts, x: x-s/2, y: y-s/2, width: s, height: s, params: tParams, isFill, laserSource, layerColor: colEnt.rgb });
        else if (shape === 'hexagon') {
          let dP = ""; const hr = s/2;
          for (let i = 0; i < 6; i++) { const ang = (Math.PI/180)*(i*60-30); dP += (i===0?"M ":"L ")+`${(hr*Math.cos(ang)).toFixed(3)} ${(hr*Math.sin(ang)).toFixed(3)}`; }
          await XCSExporter.addPath(project, { ...drawOpts, dPath: dP+" Z", x, y, width: s, height: s, params: tParams, isFill, laserSource, layerColor: colEnt.rgb });
        } else if (shape === 'triangle') {
          const h = (s*Math.sqrt(3))/2;
          const dP = isUp ? `M 0 ${(-h/2).toFixed(3)} L ${(s/2).toFixed(3)} ${(h/2).toFixed(3)} L ${(-s/2).toFixed(3)} ${(h/2).toFixed(3)} Z` : `M 0 ${(h/2).toFixed(3)} L ${(s/2).toFixed(3)} ${(-h/2).toFixed(3)} L ${(-s/2).toFixed(3)} ${(-h/2).toFixed(3)} Z`;
          await XCSExporter.addPath(project, { ...drawOpts, dPath: dP, x, y, width: s, height: s, params: tParams, isFill, laserSource, layerColor: colEnt.rgb });
        } else if (shape === 'compound') {
          const h = (s*0.5*Math.sqrt(3))/2;
          const outerPath = `M ${-s/2} ${-s/2} L ${s/2} ${-s/2} L ${s/2} ${s/2} L ${-s/2} ${s/2} Z`, innerPath = `M 0 ${(-h/2).toFixed(3)} L ${(s/4).toFixed(3)} ${(h/2).toFixed(3)} L ${(-s/4).toFixed(3)} ${(h/2).toFixed(3)} Z`;
          await XCSExporter.addCompoundPath(project, { ...drawOpts, x, y, width: s, height: s, params: tParams, isFill, laserSource, layerColor: colEnt.rgb, subPaths: [{ dPath: outerPath }, { dPath: innerPath }] });
        }
      }

      // 2. Generate Jagged Perimeter (Option 1: Edge Tracing)
      if (tBound > 0 && occupancy.size > 0) {
        let minCx = Infinity, maxCx = -Infinity, minCy = Infinity, maxCy = -Infinity;
        for (const t of tileData) {
          minCx = Math.min(minCx, t.x); maxCx = Math.max(maxCx, t.x);
          minCy = Math.min(minCy, t.y); maxCy = Math.max(maxCy, t.y);
        }
        const getJaggedLoops = () => {
          const segments = [];
          const getNeighbor = (r, c, i, isUp) => {
            if (shape === 'hexagon') {
              const isEven = r%2 === 0;
              if (i===0) return `${r},${c+1}`;
              if (i===1) return isEven ? `${r+1},${c}` : `${r+1},${c+1}`;
              if (i===2) return isEven ? `${r+1},${c-1}` : `${r+1},${c}`;
              if (i===3) return `${r},${c-1}`;
              if (i===4) return isEven ? `${r-1},${c-1}` : `${r-1},${c}`;
              if (i===5) return isEven ? `${r-1},${c}` : `${r-1},${c+1}`;
            } else if (shape === 'square' || shape === 'compound') {
              if (i===0) return `${r},${c-1}`;
              if (i===1) return `${r},${c+1}`;
              if (i===2) return `${r-1},${c}`;
              if (i===3) return `${r+1},${c}`;
            } else if (shape === 'triangle') {
              if (isUp) {
                if (i===0) return `${r},${c-1}`;
                if (i===1) return `${r},${c+1}`;
                if (i===2) return `${r+1},${c}`;
              } else {
                if (i===0) return `${r-1},${c}`;
                if (i===1) return `${r},${c+1}`;
                if (i===2) return `${r},${c-1}`;
              }
            }
            return null;
          };

          for (const t of tileData) {
            const { x, y, r, c, isUp } = t;
            const addRaw = (p1, p2, i) => {
              const nKey = getNeighbor(r, c, i, isUp);
              if (!occupancy.has(nKey)) segments.push({ p1, p2 });
            };

            if (shape === 'hexagon') {
              const hr = s/2;
              for (let i=0; i<6; i++) {
                const a1 = (Math.PI/180)*(i*60-30), a2 = (Math.PI/180)*((i+1)*60-30);
                addRaw({ x: x + hr*Math.cos(a1), y: y + hr*Math.sin(a1) }, { x: x + hr*Math.cos(a2), y: y + hr*Math.sin(a2) }, i);
              }
            } else if (shape === 'triangle') {
              const kh = s * Math.sqrt(3) / 2;
              const ks = s;
              if (isUp) {
                addRaw({ x: x-ks/2, y: y+kh/2 }, { x: x, y: y-kh/2 }, 0);
                addRaw({ x: x, y: y-kh/2 }, { x: x+ks/2, y: y+kh/2 }, 1);
                addRaw({ x: x+ks/2, y: y+kh/2 }, { x: x-ks/2, y: y+kh/2 }, 2);
              } else {
                addRaw({ x: x-ks/2, y: y-kh/2 }, { x: x+ks/2, y: y-kh/2 }, 0);
                addRaw({ x: x+ks/2, y: y-kh/2 }, { x: x, y: y+kh/2 }, 1);
                addRaw({ x: x, y: y+kh/2 }, { x: x-ks/2, y: y-kh/2 }, 2);
              }
            } else if (shape === 'square' || shape === 'compound') {
              const hr = s/2;
              addRaw({ x: x-hr, y: y+hr }, { x: x-hr, y: y-hr }, 0);
              addRaw({ x: x+hr, y: y-hr }, { x: x+hr, y: y+hr }, 1);
              addRaw({ x: x-hr, y: y-hr }, { x: x+hr, y: y-hr }, 2);
              addRaw({ x: x+hr, y: y+hr }, { x: x-hr, y: y+hr }, 3);
            }
          }

          const loops = [];
          while (segments.length > 0) {
            const loop = [];
            let cur = segments[0].p2;
            loop.push(segments[0].p1);
            loop.push(cur);
            segments.splice(0, 1);
            let found = true;
            while (found && segments.length > 0) {
              found = false;
              let bestDist = Infinity, bestIdx = -1, bestMatchP = 0;
              for (let i = 0; i < segments.length; i++) {
                const d1 = Math.hypot(segments[i].p1.x - cur.x, segments[i].p1.y - cur.y);
                const d2 = Math.hypot(segments[i].p2.x - cur.x, segments[i].p2.y - cur.y);
                if (d1 < bestDist) { bestDist = d1; bestIdx = i; bestMatchP = 1; }
                if (d2 < bestDist) { bestDist = d2; bestIdx = i; bestMatchP = 2; }
              }
              const tolerance = Math.max(s * 0.7, Math.abs(g || 0) + 1.0);
              if (bestDist < tolerance && bestIdx !== -1) {
                if (bestMatchP === 1) {
                  loop.push(segments[bestIdx].p1);
                  cur = segments[bestIdx].p2;
                  loop.push(cur);
                } else {
                  loop.push(segments[bestIdx].p2);
                  cur = segments[bestIdx].p1;
                  loop.push(cur);
                }
                segments.splice(bestIdx, 1);
                found = true;
              }
            }
            loops.push(loop);
          }
          return loops;
        };

        const offsetPolygon = (pts, offset) => {
          const cleanPts = [];
          for (let p of pts) {
            if (cleanPts.length === 0 || Math.hypot(p.x - cleanPts[cleanPts.length-1].x, p.y - cleanPts[cleanPts.length-1].y) > 1e-3) {
              cleanPts.push(p);
            }
          }
          if (cleanPts.length > 1 && Math.hypot(cleanPts[0].x - cleanPts[cleanPts.length-1].x, cleanPts[0].y - cleanPts[cleanPts.length-1].y) < 1e-3) {
            cleanPts.pop();
          }
          const n = cleanPts.length;
          if (n < 3) return [];

          const getEdge = (i) => {
            const p1 = cleanPts[i], p2 = cleanPts[(i+1)%n];
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            return { p1, p2, dx, dy, len, nx: -dy/len, ny: dx/len };
          };

          const edges = [];
          let area = 0;
          for (let i=0; i<n; i++) {
            edges.push(getEdge(i));
            const p1 = cleanPts[i], p2 = cleanPts[(i+1)%n];
            area += (p2.x - p1.x) * (p2.y + p1.y);
          }
          const isCW = area > 0;
          const sign = isCW ? 1 : -1;

          const offsetPts = [];
          for (let i=0; i<n; i++) {
            const e1 = edges[(i + n - 1) % n];
            const e2 = edges[i];

            const shiftX1 = e1.nx * offset * sign, shiftY1 = e1.ny * offset * sign;
            const shiftX2 = e2.nx * offset * sign, shiftY2 = e2.ny * offset * sign;

            const l1_p1 = { x: e1.p1.x + shiftX1, y: e1.p1.y + shiftY1 };
            const l2_p1 = { x: e2.p1.x + shiftX2, y: e2.p1.y + shiftY2 };

            const det = (e1.dx * e2.dy - e1.dy * e2.dx);
            if (Math.abs(det) < 1e-6) {
              offsetPts.push(l2_p1);
            } else {
              const dx31 = l2_p1.x - l1_p1.x, dy31 = l2_p1.y - l1_p1.y;
              const t1 = (dx31 * e2.dy - dy31 * e2.dx) / det;
              offsetPts.push({ x: l1_p1.x + t1 * e1.dx, y: l1_p1.y + t1 * e1.dy });
            }
          }
          return offsetPts;
        };

        const loops = getJaggedLoops();
        for (const loop of loops) {
          const outerPts = offsetPolygon(loop, bOff + tBound/2);
          if (outerPts.length > 0) loopsRaw.push(outerPts);

          if (tSep <= 0 && bOff - tBound/2 !== 0) {
            const innerPts = offsetPolygon(loop, bOff - tBound/2);
            if (innerPts.length > 0) loopsRaw.push(innerPts);
          } else if (tSep <= 0) {
            const innerPts = offsetPolygon(loop, -0.001);
            if (innerPts.length > 0) loopsRaw.push(innerPts);
          }
        }

        // Calculate absolute Bounding Box for Top-Left Anchoring Rule
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const allRawPaths = [...loopsRaw, ...kPathsRaw];
        
        for (const path of allRawPaths) {
          for (const pt of path) {
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
          }
        }

        const formatTL = (pts) => {
          let dP = "";
          for (let i = 0; i < pts.length; i++) {
            dP += (i === 0 ? "M " : "L ") + `${(pts[i].x - minX).toFixed(3)} ${(pts[i].y - minY).toFixed(3)}`;
          }
          return dP + " Z";
        };

        const finalSubPaths = [];
        // Insert outer boundary / loops first
        loopsRaw.forEach(pts => finalSubPaths.push({ dPath: formatTL(pts) }));
        // Add knockout separators
        kPathsRaw.forEach(pts => finalSubPaths.push({ dPath: formatTL(pts) }));

        if (finalSubPaths.length > 0) {
          const compW = maxX - minX;
          const compH = maxY - minY;
          await XCSExporter.addCompoundPath(project, {
            x: minX, y: minY, width: compW, height: compH, 
            isFill: true, layerColor: "#000000",
            params: { power: 100, speed: 20 }, subPaths: finalSubPaths, extraDisplayData: { hideLabels: true }
          });
        }
      }
    }

    if (cfg.border) {
      await XCSExporter.addRect(project, { x: CX - cfg.size / 2, y: CY - cfg.size / 2, width: cfg.size, height: cfg.size, layerColor: "#ffffff", laserSource, isFill: false, params: { power: 10, speed: 100, repeat: 1, processingLightSource: laserSource }, extraDisplayData: { hideLabels: true } });
    }
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

    const fillableTypes = ['penrose-p3', 'chladni', 'tiles'];
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
    } else if (cfg.type === 'chladni') {
      scroll.appendChild(UI.makeSection('Chladni Settings', [
        UI.makeRow('m', UI.makeRange(1, 10, 1, cfg.m, v => set('m', +v))),
        UI.makeRow('n', UI.makeRange(1, 10, 1, cfg.n_chladni, v => set('n_chladni', +v)))
      ]));
    } else if (cfg.type === 'blend-circles') {
      scroll.appendChild(UI.makeSection('Blend Circle Settings', [
        UI.makeRow('Color Count', UI.makeStepCounter(cfg.bcCount, 1, 20, v => { cfg.bcCount = v; rebuild(); update(); }), 'Number of columns (individual colors).'),
        UI.makeRow('Gap', UI.makeRange(0, 20, 0.5, cfg.bcGap, v => set('bcGap', +v), 'mm'), 'Spacing between the center points of the circles.'),
        UI.makeRow('Sizes-mm', UI.makeTextInput(cfg.bcSizes, v => set('bcSizes', v), 'e.g. 5, 4, 3...'), 'Comma-separated list of diameters for each row.')
      ]));
      const colorRows = [];
      for (let i = 0; i < cfg.bcCount; i++) {
        const curIdx = cfg.bcPaletteIndices[i] ?? 0;
        colorRows.push(UI.makeRow(`Color ${i + 1}`, UI.makePalettePicker(palette.entries, curIdx, v => { cfg.bcPaletteIndices[i] = v; update(); Persistence.save(); })));
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
        UI.makeRow('Shape', UI.makeToggles(['square', 'hexagon', 'triangle', 'compound'], cfg.tileShape, v => set('tileShape', v), { square: 'Square', hexagon: 'Hex', triangle: 'Tri', compound: 'Comp' })),
        UI.makeRow('Size', UI.makeRange(1, 50, 0.1, cfg.tileSize, v => set('tileSize', +v), 'mm')),
        UI.makeRow('Gap/Overlap', UI.makeRange(-5, 10, 0.1, cfg.tileGap, v => set('tileGap', +v), 'mm')),
        UI.makeRow('Area Width', UI.makeRange(10, 100, 1, cfg.tileAreaW, v => set('tileAreaW', +v), 'mm')),
        UI.makeRow('Area Height', UI.makeRange(10, 100, 1, cfg.tileAreaH, v => set('tileAreaH', +v), 'mm')),
        UI.makeRow('Color Layout', UI.makeToggles(['linear', 'stripes', 'mosaic'], cfg.tileColorMode, v => set('tileColorMode', v), { linear: 'Linear', stripes: 'Stripes', mosaic: 'Mosaic' }))
      ]));
      const colorPickers = [];
      for (let i = 0; i < 3; i++) {
        colorPickers.push(UI.makeRow(`Color ${i + 1}`, UI.makePalettePicker(palette.entries, cfg.tileColorIndices[i] ?? 0, v => { cfg.tileColorIndices[i] = v; update(); Persistence.save(); })));
      }
      scroll.appendChild(UI.makeSection('Tile Colors (Alternating)', colorPickers));
      scroll.appendChild(UI.makeSection('Technical Lines (Black Layer)', [
        UI.makeRow('Separator Thk', UI.makeRange(0, 1, 0.01, cfg.tileSeparatorThickness, v => set('tileSeparatorThickness', +v), 'mm')),
        UI.makeRow('Boundary Thk', UI.makeRange(0, 1, 0.01, cfg.tileBoundaryThickness, v => set('tileBoundaryThickness', +v), 'mm')),
        UI.makeRow('Boundary Offset', UI.makeRange(-1, 1, 0.05, cfg.tileBoundaryOffset, v => set('tileBoundaryOffset', +v), 'mm'))
      ], false, null, 'These lines are generated as a compound vector on the black layer (#000000) for mechanical alignment or decorative borders. Thickness values determine the width of the filled lines.'));
    }
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
          next.push([0, c, p, b]); next.push([1, p, c, a]);
        } else {
          const q = { x: b.x + (a.x - b.x) / phi, y: b.y + (a.y - b.y) / phi };
          const r = { x: b.x + (c.x - b.x) / phi, y: b.y + (c.y - b.y) / phi };
          next.push([1, r, q, b]); next.push([0, q, r, a]); next.push([1, a, r, c]);
        }
      });
      triangles = next;
    }
    const scale = cfg.size / 2;
    triangles.forEach(([type, a, b, c], i) => {
      const tValue = i / (triangles.length - 1 || 1);
      const { entry: ent, idx: colorIdx, t: actualT } = getColor(tValue);
      const entryParams = PalMgr.getParams(cfg.paletteId, colorIdx);
      const dPath = `M ${CX+a.x*scale} ${CY+a.y*scale} L ${CX+b.x*scale} ${CY+b.y*scale} L ${CX+c.x*scale} ${CY+c.y*scale} Z`;
      XCSExporter.addPath(project, { dPath, x: 0, y: 0, width: cfg.size, height: cfg.size, params: entryParams, isFill, laserSource, layerColor: ent.rgb, extraDisplayData: { t: actualT } });
    });
  },

  generateTestPattern(project, CX, CY, size, pm, laserSource) {
    const s2 = size / 2;
    XCSExporter.addPath(project, { dPath: `M ${CX-s2} ${CY} L ${CX+s2} ${CY} M ${CX} ${CY-s2} L ${CX} ${CY+s2}`, x: 0, y: 0, width: size, height: size, params: pm, isFill: false, laserSource, layerColor: "#ff0000" });
    XCSExporter.addCircle(project, { x: CX-s2, y: CY-s2, width: size, height: size, params: pm, isFill: false, laserSource, layerColor: "#00ff00" });
    XCSExporter.addCircle(project, { x: CX-s2/2, y: CY-s2/2, width: size/2, height: size/2, params: pm, isFill: false, laserSource, layerColor: "#0000ff" });
    XCSExporter.addRect(project, { x: CX-s2, y: CY-s2, width: size, height: size, params: pm, isFill: false, laserSource, layerColor: "#ffff00" });
  }
};

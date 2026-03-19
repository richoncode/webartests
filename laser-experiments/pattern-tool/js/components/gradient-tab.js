import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { MandalaTab } from './mandala-tab.js';
import { XCSExporter } from '../xcs-exporter.js';

const M8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];
const BIT_REVERSE_SEQ = [0, 4, 2, 6, 1, 5, 3, 7];
const BUCKET_COLORS = [
  '#ef4444', '#06b6d4', '#eab308', '#8b5cf6', 
  '#f97316', '#3b82f6', '#22c55e', '#000000'
];

export const GradientTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Gradient Test</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Gradient Test Grid';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      laserType: 'ir',
      disperseHeat: false,
      xAxis: 'power', yAxis: 'speed', fixedAxis: 'lpcm',
      roleHistory: ['fixedAxis', 'yAxis', 'xAxis'], // most recent at end
      xMin: 10, xMax: 100,
      yMin: 10, yMax: 200,
      resolution: 20,
      overlap: 0,
      showLabels: true,
      fixedPower: 20, fixedSpeed: 100, fixedLpcm: 1000,
      totalSize: 20,
      renderMode: 'vector'
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData:null, shapes:[], selection: null };
    App.instances[tabId] = { type:'gradient', pane, cfg, state };

    this.renderControls(tabId);
    this.refresh(tabId);
    this.setupSelection(tabId);
    return pane;
  },

  setupSelection(tabId) {
    const inst = App.instances[tabId];
    if (!inst || !inst.pane) return;
    const svg = inst.pane.querySelector('.svg-canvas');
    if (!svg) return;
    let isDragging = false;

    const getCell = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      const x = svgP.x;
      const y = svgP.y;
      
      const vb = svg.viewBox.baseVal;
      const W = vb.width||500, H = vb.height||500;
      const AREA = 100;
      const PAD = 20;
      const sc = Math.min((W-PAD*2)/AREA, (H-PAD*2)/AREA);
      const ox = PAD + ((W-PAD*2) - AREA*sc)/2;
      const oy = PAD + ((H-PAD*2) - AREA*sc)/2;

      const mmX = (x - ox) / sc;
      const mmY = (y - oy) / sc;

      const { resolution, totalSize, overlap } = inst.cfg;
      const cellSize = totalSize / resolution;
      const gap = overlap < 0 ? Math.abs(overlap) : 0;
      const pitch = cellSize + gap;
      
      const CX = 50, CY = 50;
      const startX = CX - (pitch * resolution)/2;
      const startY = CY - (pitch * resolution)/2;

      const ix = Math.floor((mmX - startX) / pitch);
      const iy = Math.floor((mmY - startY) / pitch);

      if (ix >= 0 && ix < resolution && iy >= 0 && iy < resolution) {
        return { ix, iy };
      }
      return null;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const cell = getCell(e);
      if (cell) {
        inst.state.selection.ix2 = cell.ix;
        inst.state.selection.iy2 = cell.iy;
        this.updateSelectionOverlay(tabId);
      }
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        this.renderControls(tabId);
      }
    };

    svg.addEventListener('mousedown', (e) => {
      const cell = getCell(e);
      if (cell) {
        isDragging = true;
        inst.state.selection = { ix1: cell.ix, iy1: cell.iy, ix2: cell.ix, iy2: cell.iy };
        this.updateSelectionOverlay(tabId);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      } else {
        inst.state.selection = null;
        this.updateSelectionOverlay(tabId);
        this.renderControls(tabId);
      }
    });
  },

  updateSelectionOverlay(tabId) {
    const inst = App.instances[tabId];
    if (!inst || !inst.pane) return;
    const svg = inst.pane.querySelector('.svg-canvas');
    if (!svg) return;
    let overlay = svg.querySelector('.selection-overlay');
    
    if (!inst.state.selection) {
      if (overlay) overlay.remove();
      return;
    }

    if (!overlay) {
      overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      overlay.setAttribute('class', 'selection-overlay');
      overlay.setAttribute('fill', 'rgba(91, 155, 213, 0.2)');
      overlay.setAttribute('stroke', '#5b9bd5');
      overlay.setAttribute('stroke-width', '2');
      overlay.setAttribute('pointer-events', 'none');
      svg.appendChild(overlay);
    }

    const { ix1, iy1, ix2, iy2 } = inst.state.selection;
    const xMin = Math.min(ix1, ix2), xMax = Math.max(ix1, ix2);
    const yMin = Math.min(iy1, iy2), yMax = Math.max(iy1, iy2);

    const vb = svg.viewBox.baseVal;
    const W = vb.width||500, H = vb.height||500;
    const AREA = 100;
    const PAD = 20;
    const sc = Math.min((W-PAD*2)/AREA, (H-PAD*2)/AREA);
    const ox = PAD + ((W-PAD*2) - AREA*sc)/2;
    const oy = PAD + ((H-PAD*2) - AREA*sc)/2;

    const { resolution, totalSize, overlap } = inst.cfg;
    const cellSize = totalSize / resolution;
    const gap = overlap < 0 ? Math.abs(overlap) : 0;
    const pitch = cellSize + gap;
    const effectiveTotal = pitch * resolution;
    const CX = 50, CY = 50;
    const startX = CX - effectiveTotal/2;
    const startY = CY - effectiveTotal/2;

    const x = ox + (startX + xMin * pitch) * sc;
    const y = oy + (startY + yMin * pitch) * sc;
    const w = (xMax - xMin + 1) * pitch * sc;
    const h = (yMax - yMin + 1) * pitch * sc;

    overlay.setAttribute('x', x);
    overlay.setAttribute('y', y);
    overlay.setAttribute('width', w);
    overlay.setAttribute('height', h);
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.rawData = this.generateXCS(inst.cfg);
    inst.state.shapes = XcsTab.parseXCS(inst.state.rawData);
    XCSViewer.update(inst.pane, inst.state, lazy);
  },

  generateXCS(cfg) {
    const project = XCSExporter.createProject();
    const CX = 50, CY = 50;
    const { resolution, totalSize, laserType, xAxis, yAxis, overlap } = cfg;
    
    const cellSize = totalSize / resolution;
    const gap = overlap < 0 ? Math.abs(overlap) : 0;
    const pitch = cellSize + gap;
    const effectiveTotal = pitch * resolution;
    
    const startX = CX - effectiveTotal/2;
    const startY = CY - effectiveTotal/2;

    const laserSource = laserType === 'ir' ? 'red' : 'blue';
    const labelColor = cfg.disperseHeat ? "#000000" : "#5b9bd5";

    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const x = startX + ix * pitch + pitch/2;
        const y = startY + iy * pitch + pitch/2;
        
        const getVal = (axis) => {
          let minVal, maxVal, stepIdx;
          if (axis === cfg.xAxis) { minVal = cfg.xMin; maxVal = cfg.xMax; stepIdx = ix; }
          else if (axis === cfg.yAxis) { minVal = cfg.yMin; maxVal = cfg.yMax; stepIdx = (resolution - 1) - iy; }
          else { return axis === 'power' ? cfg.fixedPower : axis === 'speed' ? cfg.fixedSpeed : cfg.fixedLpcm; }
          
          if (resolution === 1) return minVal;
          return minVal + (maxVal - minVal) * stepIdx / (resolution - 1);
        };

        const p = getVal('power');
        const s = getVal('speed');
        const d = getVal('lpcm');

        const bucket = Math.floor(M8[iy % 8][ix % 8] / 8);
        const color = cfg.disperseHeat ? BUCKET_COLORS[bucket] : "#5b9bd5";

        const actualOverlap = overlap > 0 ? overlap : 0;
        const pm = { 
          power: Math.round(p), speed: Math.round(s), density: Math.round(d), repeat: 1,
          processingLightSource: laserSource
        };

        if (cfg.renderMode === 'bitmap') {
          XCSExporter.addImage(project, {
            x, y, width: cellSize + actualOverlap, height: cellSize + actualOverlap,
            layerColor: color, laserSource, params: pm,
            extraDisplayData: { ix, iy, hideLabels: true }
          });
        } else {
          XCSExporter.addRect(project, {
            x, y, width: cellSize + actualOverlap, height: cellSize + actualOverlap,
            layerColor: color, laserSource, params: pm,
            extraDisplayData: { ix, iy, hideLabels: true }
          });
        }
      }
    }

    if (cfg.showLabels) {
      const xr = { power: {u:'pwr%'}, speed: {u:'mm/s'}, lpcm: {u:'lpcm'} }[cfg.xAxis];
      const yr = { power: {u:'pwr%'}, speed: {u:'mm/s'}, lpcm: {u:'lpcm'} }[cfg.yAxis];
      const fr = { power: {u:'pwr%'}, speed: {u:'mm/s'}, lpcm: {u:'lpcm'} }[cfg.fixedAxis];
      
      const xLabel = `${cfg.xMin} - ${xr.u} - ${cfg.xMax}`;
      const yLabel = `${cfg.yMin} - ${yr.u} - ${cfg.yMax}`;
      
      const fixedKey = cfg.fixedAxis === 'power' ? 'fixedPower' : cfg.fixedAxis === 'speed' ? 'fixedSpeed' : 'fixedLpcm';
      const fLabel = `${cfg[fixedKey]} ${fr.u}`;
      
      const gridL = CX - (effectiveTotal/2);
      const gridT = CY - (effectiveTotal/2);
      const gridB = CY + (effectiveTotal/2);
      const labelSize = 2.4;

      // Labels match XCS baseline
      const unscaledHeight = 23.35;
      const scale = labelSize / unscaledHeight;
      const fontSize = 72 * scale;

      XCSExporter.addText(project, {
        text: xLabel, x: gridL + effectiveTotal/2, y: gridB + labelSize, width: xLabel.length * 11.44 * scale, height: labelSize, fontSize, scale,
        layerColor: labelColor, laserSource, align: "center"
      });
      XCSExporter.addText(project, {
        text: yLabel, x: gridL - labelSize, y: CY, width: yLabel.length * 11.44 * scale, height: labelSize, fontSize, scale,
        layerColor: labelColor, laserSource, align: "center", angle: -90
      });
      XCSExporter.addText(project, {
        text: fLabel, x: CX, y: gridT - 3.2, width: fLabel.length * 11.44 * scale, height: labelSize, fontSize, scale,
        layerColor: labelColor, laserSource, align: "center"
      });
    }

    const dvEntry = project.device.data.value[0][1];
    dvEntry.data.LASER_PLANE.isProcessByLayer = cfg.disperseHeat;
    dvEntry.data.LASER_PLANE.pathPlanning = cfg.disperseHeat ? "custom" : "auto";

    return project;
  },

  renderControls(tabId) {
    const { pane, cfg, state } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };

    const axisLabels = { power: 'pwr%', speed: 'mm/s', lpcm: 'lpcm' };
    const axisOpts = ['power', 'speed', 'lpcm'];

    const swapAxes = (targetRole, newValue) => {
      let currentRoleOfValue = null;
      if (cfg.xAxis === newValue) currentRoleOfValue = 'xAxis';
      else if (cfg.yAxis === newValue) currentRoleOfValue = 'yAxis';
      else if (cfg.fixedAxis === newValue) currentRoleOfValue = 'fixedAxis';
      
      if (!currentRoleOfValue || currentRoleOfValue === targetRole) return;

      const oldValueOfTargetRole = cfg[targetRole];
      cfg[targetRole] = newValue;
      cfg[currentRoleOfValue] = oldValueOfTargetRole;
      
      cfg.roleHistory = cfg.roleHistory.filter(r => r !== targetRole);
      cfg.roleHistory.push(targetRole);
      
      this.renderControls(tabId);
      update();
      Persistence.save();
    };

    scroll.appendChild(MandalaTab.makeSection('Global', [
      MandalaTab.makeRow('Laser', MandalaTab.makeToggles(['ir', 'blue'], cfg.laserType, v => set('laserType', v), {ir:'IR', blue:'BLUE'})),
      MandalaTab.makeRow('Render', MandalaTab.makeToggles(['vector', 'bitmap'], cfg.renderMode, v => set('renderMode', v), {vector:'Vector', bitmap:'Bitmap'})),
      MandalaTab.makeToggleRow('Disperse heat', cfg.disperseHeat, v => set('disperseHeat', v)),
      MandalaTab.makeRow('Resolution', MandalaTab.makeStepCounter(cfg.resolution, 20, 100, v => set('resolution', v), 5)),
      MandalaTab.makeRow('Overall Size', MandalaTab.makeRange(10, 100, 5, cfg.totalSize, v => set('totalSize', +v), 'mm')),
      MandalaTab.makeRow('Overlap/Gap', MandalaTab.makeRange(-1, 1, 0.05, cfg.overlap, v => set('overlap', +v), 'mm')),
      MandalaTab.makeToggleRow('Show labels', cfg.showLabels, v => set('showLabels', v))
    ]));

    const getRanges = (axis) => {
      if (axis === 'power') return { min: 1, max: 100, step: 1, unit: 'pwr%' };
      if (axis === 'speed') return { min: 1, max: 500, step: 5, unit: 'mm/s' };
      return { min: 10, max: 1000, step: 50, unit: 'lpcm' };
    };

    const xr = getRanges(cfg.xAxis);
    scroll.appendChild(MandalaTab.makeSection('X Axis:', [
      MandalaTab.makeRow(`Min (${xr.unit})`, MandalaTab.makeRange(xr.min, xr.max, xr.step, cfg.xMin, v => set('xMin', +v), xr.unit)),
      MandalaTab.makeRow(`Max (${xr.unit})`, MandalaTab.makeRange(xr.min, xr.max, xr.step, cfg.xMax, v => set('xMax', +v), xr.unit))
    ], false, MandalaTab.makeToggles(axisOpts, cfg.xAxis, v => swapAxes('xAxis', v), axisLabels)));

    const yr = getRanges(cfg.yAxis);
    scroll.appendChild(MandalaTab.makeSection('Y Axis:', [
      MandalaTab.makeRow(`Min (${yr.unit})`, MandalaTab.makeRange(yr.min, yr.max, yr.step, cfg.yMin, v => set('yMin', +v), yr.unit)),
      MandalaTab.makeRow(`Max (${yr.unit})`, MandalaTab.makeRange(yr.min, yr.max, yr.step, cfg.yMax, v => set('yMax', +v), yr.unit))
    ], false, MandalaTab.makeToggles(axisOpts, cfg.yAxis, v => swapAxes('yAxis', v), axisLabels)));

    const fr = getRanges(cfg.fixedAxis);
    const fixedKey = cfg.fixedAxis === 'power' ? 'fixedPower' : cfg.fixedAxis === 'speed' ? 'fixedSpeed' : 'fixedLpcm';
    scroll.appendChild(MandalaTab.makeSection('Fixed:', [
      MandalaTab.makeRow(`Value (${fr.unit})`, MandalaTab.makeRange(fr.min, fr.max, fr.step, cfg[fixedKey], v => set(fixedKey, +v), fr.unit))
    ], false, MandalaTab.makeToggles(axisOpts, cfg.fixedAxis, v => swapAxes('fixedAxis', v), axisLabels)));

    if (state.selection) {
      const { ix1, iy1, ix2, iy2 } = state.selection;
      const xMin = Math.min(ix1, ix2), xMax = Math.max(ix1, ix2);
      const yMin = Math.min(iy1, iy2), yMax = Math.max(iy1, iy2);
      const count = (xMax - xMin + 1) * (yMax - yMin + 1);
      
      const sec = MandalaTab.makeSection('Selection', [
        MandalaTab.makeRow('Cells', `${count} (${xMin},${yMin}) to (${xMax},${yMax})`),
        MandalaTab.makeRow('', `<button class="tool-btn zoom-btn">Zoom to selection</button>`)
      ]);
      sec.querySelector('.zoom-btn').onclick = () => {
        const xMinVal = this.getValAt(tabId, cfg.xAxis, xMin);
        const xMaxVal = this.getValAt(tabId, cfg.xAxis, xMax);
        const yMinVal = this.getValAt(tabId, cfg.yAxis, yMin);
        const yMaxVal = this.getValAt(tabId, cfg.yAxis, yMax);
        
        cfg.xMin = Math.min(xMinVal, xMaxVal);
        cfg.xMax = Math.max(xMinVal, xMaxVal);
        cfg.yMin = Math.min(yMinVal, yMaxVal);
        cfg.yMax = Math.max(yMinVal, yMaxVal);
        
        state.selection = null;
        this.updateSelectionOverlay(tabId);
        this.renderControls(tabId);
        update();
      };
      scroll.appendChild(sec);
    }
  },

  getValAt(tabId, axis, idx) {
    const { cfg } = App.instances[tabId];
    let minVal, maxVal;
    if (axis === cfg.xAxis) { minVal = cfg.xMin; maxVal = cfg.xMax; }
    else if (axis === cfg.yAxis) { minVal = cfg.yMin; maxVal = cfg.yMax; idx = (cfg.resolution - 1) - idx; }
    else return 0;
    
    if (cfg.resolution === 1) return minVal;
    return minVal + (maxVal - minVal) * idx / (cfg.resolution - 1);
  }
};

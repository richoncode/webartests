import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { MandalaTab } from './mandala-tab.js';

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
      renderMode: 'vector',
      disperseHeat: false,
      xAxis: 'power', yAxis: 'speed', fixedAxis: 'lpcm',
      roleHistory: ['fixedAxis', 'yAxis', 'xAxis'], // most recent at end
      xMin: 10, xMax: 100,
      yMin: 10, yMax: 200,
      resolution: 20,
      overlap: 0,
      showLabels: true,
      fixedPower: 20, fixedSpeed: 100, fixedLpcm: 1000,
      totalSize: 20
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
      const effectiveTotal = pitch * resolution;
      
      const CX = 50, CY = 50;
      const startX = CX - effectiveTotal/2;
      const startY = CY - effectiveTotal/2;

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
    let label = svg.querySelector('.selection-label');
    
    if (!inst.state.selection) {
      if (overlay) overlay.remove();
      if (label) label.remove();
      return;
    }

    if (!overlay) {
      overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      overlay.setAttribute('class', 'selection-overlay');
      overlay.setAttribute('fill', 'rgba(91, 155, 213, 0.25)');
      overlay.setAttribute('stroke', '#5b9bd5');
      overlay.setAttribute('stroke-width', '1.5');
      overlay.setAttribute('pointer-events', 'none');
      svg.appendChild(overlay);
    } else {
      svg.appendChild(overlay);
    }

    if (!label) {
      label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'selection-label');
      label.setAttribute('fill', '#fff');
      label.setAttribute('font-size', '12');
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('pointer-events', 'none');
      label.setAttribute('text-anchor', 'middle');
      label.style.textShadow = '0 0 3px #000';
      svg.appendChild(label);
    } else {
      svg.appendChild(label);
    }

    const { ix1, iy1, ix2, iy2 } = inst.state.selection;
    const mix = Math.min(ix1, ix2);
    const max = Math.max(ix1, ix2);
    const miy = Math.min(iy1, iy2);
    const may = Math.max(iy1, iy2);

    const selW = max - mix + 1;
    const selH = may - miy + 1;

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

    const rx = startX + mix * pitch;
    const ry = startY + miy * pitch;
    const rw = (max - mix + 1) * pitch - gap;
    const rh = (may - miy + 1) * pitch - gap;

    overlay.setAttribute('x', rx * sc + ox);
    overlay.setAttribute('y', ry * sc + oy);
    overlay.setAttribute('width', rw * sc);
    overlay.setAttribute('height', rh * sc);

    label.textContent = `${selW} × ${selH}`;
    label.setAttribute('x', (rx + rw/2) * sc + ox);
    label.setAttribute('y', (ry + rh/2) * sc + oy + 4);
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.rawData = this.generateXCS(inst.cfg);
    inst.state.shapes = XcsTab.parseXCS(inst.state.rawData);
    XCSViewer.update(inst.pane, inst.state, lazy);
    this.updateSelectionOverlay(tabId);
  },

  generateXCS(cfg) {
    const canvasId = uuid();
    const displays = [];
    const displayValues = [];
    const CX = 50, CY = 50;
    const { resolution, totalSize, laserType, xAxis, yAxis, overlap } = cfg;
    
    const cellSize = totalSize / resolution;
    const gap = overlap < 0 ? Math.abs(overlap) : 0;
    const pitch = cellSize + gap;
    const effectiveTotal = pitch * resolution;
    
    const startX = CX - effectiveTotal/2;
    const startY = CY - effectiveTotal/2;

    const laserSource = laserType === 'ir' ? 'red' : 'blue';
    const planType = laserType === 'ir' ? 'ir' : 'blue';

    const labelColor = cfg.disperseHeat ? "#000000" : "#5b9bd5";

    const addText = (text, tx, ty, angle, size) => {
      const id = uuid();
      // XCS Formula: fontSize (pt) ≈ height (mm) * 3.626
      const fontSize = Math.round(size * 3.626);
      const textWidth = text.length * size * 0.5; // Approximate

      displays.push({ 
        id, name: null, type: 'TEXT', x: tx, y: ty, angle, 
        scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: tx, offsetY: ty, lockRatio: true, isClosePath: true,
        zOrder: displays.length, sourceId: id, groupTag: "", layerTag: labelColor,
        layerColor: labelColor, visible: true, originColor: "#000000",
        enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
        width: textWidth, height: size, isFill: true, lineColor: 0, fillColor: labelColor,
        text, resolution: 1,
        style: { fontSize: fontSize, fontFamily: "Lato", fontSubfamily: "Bold", fontSource: "build-in", align: "center" }
      });

      const pm = { power: 20, speed: 100, repeat: 1, processingLightSource: laserSource };
      displayValues.push([id, { 
        isFill: true, type: 'TEXT', processingType: "COLOR_FILL_ENGRAVE", processIgnore: false, isWhiteModel: false,
        data: {
          VECTOR_CUTTING: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 10, repeat: 1, processingLightSource: laserSource } } },
          VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
          FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
          COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: pm } },
          INTAGLIO: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 100, repeat: 1, processingLightSource: laserSource } } }
        }
      }]);
    };

    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const id = uuid();
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
        const type = cfg.renderMode === 'bitmap' ? 'IMAGE' : 'RECT';
        displays.push({ 
          id, name: null, type, x, y, width: cellSize + actualOverlap, height: cellSize + actualOverlap, angle: 0,
          scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
          offsetX: x, offsetY: y, lockRatio: false, isClosePath: true,
          zOrder: displays.length, sourceId: id, groupTag: "", layerTag: color,
          layerColor: color, visible: true, originColor: "#000000",
          enableTransform: true, visibleState: true, lockState: false,
          resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
          fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
          stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
          isFill: true, lineColor: 0, fillColor: color, hideLabels: true, power: null,
          ix, iy
        });

        const pm = { 
          power: Math.round(p), speed: Math.round(s), density: Math.round(d), repeat: 1,
          processingLightSource: laserSource, bitmapScanMode: "zMode", needGapNumDensity: true,
          dotDuration: 100, dpi: 500, enableKerf: false, kerfDistance: 0
        };
        
        const nodes = {
          VECTOR_CUTTING: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 16, repeat: 1, processingLightSource: laserSource } } },
          VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 20, repeat: 1, processingLightSource: laserSource } } },
          FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
          COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: pm } },
          INTAGLIO: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 80, repeat: 1, processingLightSource: laserSource } } }
        };

        displayValues.push([id, { isFill: true, type, processingType: "COLOR_FILL_ENGRAVE", processIgnore: false, isWhiteModel: false, data: nodes }]);
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

      // Bottom axis (X): Baseline anchor = targetY + height/2
      addText(xLabel, gridL + effectiveTotal/2, gridB + labelSize, 0, labelSize);
      // Left axis (Y): Baseline anchor = targetX - height/2 for rotated text
      addText(yLabel, gridL - labelSize, CY, -90, labelSize);
      // Top axis (Fixed):
      addText(fLabel, CX, gridT - 3.2, 0, labelSize);
    }

    const layerData = {};
    if (cfg.disperseHeat) {
      BIT_REVERSE_SEQ.forEach((bucketIdx, i) => {
        const color = BUCKET_COLORS[bucketIdx];
        layerData[color] = {
          name: bucketIdx === 7 ? "Sector 7 + Labels" : `Sector ${bucketIdx}`,
          order: 8 - i, // 8 down to 1
          visible: true
        };
      });
    } else {
      layerData["#5b9bd5"] = { name: "Grid", order: 1, visible: true };
    }

    return {
      canvasId: canvasId,
      canvas: [{ id: canvasId, title: "{panel}1", layerData, groupData: {}, displays }],
      device: { id: "GS006", power: [5, 15], data: { dataType: "Map", value: [[canvasId, { mode: "LASER_PLANE", data: { LASER_PLANE: { material: 0, lightSourceMode: planType, thickness: null, perimeter: null, diameter: null, isProcessByLayer: cfg.disperseHeat, pathPlanning: cfg.disperseHeat ? "custom" : "auto", fillPlanning: "separate", dreedyTsp: false, avoidSmokeModal: false, scanDirection: "topToBottom", enableOddEvenKerf: true, xcsUsed: [] } }, displays: { dataType: "Map", value: displayValues } }]] } },
      extId: "GS006", extName: "F2", version: "1.5.8", minRequiredVersion: "2.6.0", created: Date.now(), modify: Date.now(), projectTraceID: uuid()
    };
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };

    const axisLabels = { power: 'PWR', speed: 'SPD', lpcm: 'LPC' };
    const axisTitles = { power: 'Power', speed: 'Speed', lpcm: 'Lines Per CM' };
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
      MandalaTab.makeRow('Mode', MandalaTab.makeToggles(['vector', 'bitmap'], cfg.renderMode, v => set('renderMode', v), {vector:'Vector', bitmap:'Bitmap'})),
      MandalaTab.makeToggleRow('Disperse heat', cfg.disperseHeat, v => set('disperseHeat', v)),
      MandalaTab.makeRow('Resolution', MandalaTab.makeStepCounter(cfg.resolution, 20, 100, v => set('resolution', v), 5)),
      MandalaTab.makeRow('Overall Size', MandalaTab.makeRange(10, 100, 5, cfg.totalSize, v => set('totalSize', +v), ' mm')),
      MandalaTab.makeRow('Overlap/Gap', MandalaTab.makeRange(-1, 1, 0.05, cfg.overlap, v => set('overlap', +v), ' mm')),
      MandalaTab.makeToggleRow('Show labels', cfg.showLabels, v => set('showLabels', v))
    ]));

    const getRanges = (axis) => {
      if (axis === 'power') return { min: 1, max: 100, step: 1, unit: '%' };
      if (axis === 'speed') return { min: 1, max: 500, step: 5, unit: ' mm/s' };
      return { min: 10, max: 1000, step: 50, unit: ' lpcm' };
    };

    const xr = getRanges(cfg.xAxis);
    scroll.appendChild(MandalaTab.makeSection('X Axis:', [
      MandalaTab.makeRow(`Min (${xr.unit})`, MandalaTab.makeRange(xr.min, xr.max, xr.step, cfg.xMin, v => set('xMin', +v), xr.unit)),
      MandalaTab.makeRow(`Max (${xr.unit})`, MandalaTab.makeRange(xr.min, xr.max, xr.step, cfg.xMax, v => set('xMax', +v), xr.unit))
    ], false, MandalaTab.makeToggles(axisOpts, cfg.xAxis, v => swapAxes('xAxis', v), axisLabels, axisTitles)));

    const yr = getRanges(cfg.yAxis);
    scroll.appendChild(MandalaTab.makeSection('Y Axis:', [
      MandalaTab.makeRow(`Min (${yr.unit})`, MandalaTab.makeRange(yr.min, yr.max, yr.step, cfg.yMin, v => set('yMin', +v), yr.unit)),
      MandalaTab.makeRow(`Max (${yr.unit})`, MandalaTab.makeRange(yr.min, yr.max, yr.step, cfg.yMax, v => set('yMax', +v), yr.unit))
    ], false, MandalaTab.makeToggles(axisOpts, cfg.yAxis, v => swapAxes('yAxis', v), axisLabels, axisTitles)));

    const fr = getRanges(cfg.fixedAxis);
    const fixedKey = cfg.fixedAxis === 'power' ? 'fixedPower' : cfg.fixedAxis === 'speed' ? 'fixedSpeed' : 'fixedLpcm';
    scroll.appendChild(MandalaTab.makeSection('Fixed:', [
      MandalaTab.makeRow(`Value (${fr.unit})`, MandalaTab.makeRange(fr.min, fr.max, fr.step, cfg[fixedKey], v => set(fixedKey, +v), fr.unit))
    ], false, MandalaTab.makeToggles(axisOpts, cfg.fixedAxis, v => swapAxes('fixedAxis', v), axisLabels, axisTitles)));

    // ── Selection Zoom ──
    if (App.instances[tabId].state.selection) {
      const { ix1, iy1, ix2, iy2 } = App.instances[tabId].state.selection;
      const mix = Math.min(ix1, ix2), max = Math.max(ix1, ix2);
      const miy = Math.min(iy1, iy2), may = Math.max(iy1, iy2);
      
      const getValForIdx = (axis, idx) => {
        let minVal, maxVal;
        if (axis === cfg.xAxis) { minVal = cfg.xMin; maxVal = cfg.xMax; }
        else if (axis === cfg.yAxis) { minVal = cfg.yMin; maxVal = cfg.yMax; }
        else return null;
        if (cfg.resolution === 1) return minVal;
        return minVal + (maxVal - minVal) * idx / (cfg.resolution - 1);
      };

      const xMinZoom = getValForIdx(cfg.xAxis, mix);
      const xMaxZoom = getValForIdx(cfg.xAxis, max);
      
      // Recall stepIdx = (resolution - 1) - iy
      const yMinZoom = getValForIdx(cfg.yAxis, (cfg.resolution - 1) - may);
      const yMaxZoom = getValForIdx(cfg.yAxis, (cfg.resolution - 1) - miy);

      const selW = max - mix + 1;
      const selH = may - miy + 1;

      const zoomBtn = document.createElement('button');
      zoomBtn.className = 'hbtn primary';
      zoomBtn.style.width = '100%';
      zoomBtn.style.marginTop = '8px';
      zoomBtn.textContent = 'Gradient Zoom';
      zoomBtn.onclick = () => {
        const newCfg = { ...cfg, xMin: Math.round(xMinZoom), xMax: Math.round(xMaxZoom), yMin: Math.round(yMinZoom), yMax: Math.round(yMaxZoom) };
        
        const getLabelPart = (axisName) => {
          const abbrev = { lpcm: 'LPC', power: 'PWR', speed: 'SPD' }[axisName];
          if (cfg.xAxis === axisName) return `${abbrev}${Math.round(xMinZoom)}-${Math.round(xMaxZoom)}`;
          if (cfg.yAxis === axisName) return `${abbrev}${Math.round(yMinZoom)}-${Math.round(yMaxZoom)}`;
          const fixedVal = axisName === 'lpcm' ? cfg.fixedLpcm : axisName === 'power' ? cfg.fixedPower : cfg.fixedSpeed;
          return `${abbrev}${Math.round(fixedVal)}`;
        };

        const newLabel = `Grad${getLabelPart('lpcm')}${getLabelPart('power')}${getLabelPart('speed')}`;
        const newId = TabMgr.newGradient(newCfg, newLabel);
        TabMgr.activate(newId);
      };

      const xr = getRanges(cfg.xAxis);
      const yr = getRanges(cfg.yAxis);

      scroll.appendChild(MandalaTab.makeSection('Selection Zoom', [
        MandalaTab.makeRow(`Size`, document.createRange().createContextualFragment(`<span class="range-val" style="flex:1;text-align:left">${selW} × ${selH} cells</span>`)),
        MandalaTab.makeRow(`X Range`, document.createRange().createContextualFragment(`<span class="range-val" style="flex:1;text-align:left">${Math.round(xMinZoom)}–${Math.round(xMaxZoom)} ${xr.unit} (Cells ${mix}–${max})</span>`)),
        MandalaTab.makeRow(`Y Range`, document.createRange().createContextualFragment(`<span class="range-val" style="flex:1;text-align:left">${Math.round(yMinZoom)}–${Math.round(yMaxZoom)} ${yr.unit} (Cells ${(cfg.resolution - 1) - may}–${(cfg.resolution - 1) - miy})</span>`)),
        zoomBtn
      ]));
    }
  }
};

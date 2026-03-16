import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { MandalaTab } from './mandala-tab.js';

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
    const state = { rawData:null, shapes:[] };
    App.instances[tabId] = { type:'gradient', pane, cfg, state };

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

    const addText = (text, tx, ty, angle, size) => {
      const id = uuid();
      // Visual height of Lato Bold at 72pt is ~19.85mm
      const baseHeight = 19.85;
      const scale = size / baseHeight;
      const fontSize = 72;
      
      // Approximate width logic (Lato Bold is ~0.5 width-to-height ratio)
      const textWidth = text.length * baseHeight * 0.5;

      // Positioning: XCS anchors at the baseline.
      // For 72pt text, the center is approx 7.3mm above the baseline.
      // Visual centering requires shifting the anchor by (size * (7.3/19.85))
      const centerOffset = size * 0.368;

      let adjustedX = tx;
      let adjustedY = ty;
      
      if (angle === 0) {
        adjustedY = ty + centerOffset;
      } else if (angle === -90) {
        adjustedX = tx - centerOffset;
      }

      displays.push({ 
        id, name: null, type: 'TEXT', x: adjustedX, y: adjustedY, angle, 
        scale: { x: scale, y: scale }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: adjustedX, offsetY: adjustedY, lockRatio: true, isClosePath: true,
        zOrder: displays.length, sourceId: id, groupTag: "", layerTag: "#5b9bd5",
        layerColor: "#5b9bd5", visible: true, originColor: "#000000",
        enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
        width: textWidth * scale, height: size, isFill: true, lineColor: 0, fillColor: "#5b9bd5",
        text, resolution: 1,
        style: { fontSize: fontSize, fontFamily: "Lato", fontSubfamily: "Bold", fontSource: "build-in", align: "center" }
      });
      displayValues.push([id, { 
        isFill: true, type: 'TEXT', processingType: "VECTOR_ENGRAVING", processIgnore: false, isWhiteModel: false,
        data: {
          VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: { power: 20, speed: 100, repeat: 1, processingLightSource: laserSource } } }
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
          else if (axis === cfg.yAxis) { minVal = cfg.yMin; maxVal = cfg.yMax; stepIdx = iy; }
          else { return axis === 'power' ? cfg.fixedPower : axis === 'speed' ? cfg.fixedSpeed : cfg.fixedLpcm; }
          
          if (resolution === 1) return minVal;
          return minVal + (maxVal - minVal) * stepIdx / (resolution - 1);
        };

        const p = getVal('power');
        const s = getVal('speed');
        const d = getVal('lpcm');

        const actualOverlap = overlap > 0 ? overlap : 0;
        displays.push({ 
          id, name: null, type: 'RECT', x, y, width: cellSize + actualOverlap, height: cellSize + actualOverlap, angle: 0,
          scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
          offsetX: x, offsetY: y, lockRatio: false, isClosePath: true,
          zOrder: displays.length, sourceId: id, groupTag: "", layerTag: "#5b9bd5",
          layerColor: "#5b9bd5", visible: true, originColor: "#000000",
          enableTransform: true, visibleState: true, lockState: false,
          resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
          fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
          stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
          isFill: true, lineColor: 0, fillColor: "#5b9bd5", hideLabels: true, power: null
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

        displayValues.push([id, { isFill: true, type: 'RECT', processingType: "COLOR_FILL_ENGRAVE", processIgnore: false, isWhiteModel: false, data: nodes }]);
      }
    }

    if (cfg.showLabels) {
      const xr = { power: {u:'pwr%'}, speed: {u:'mm/s'}, lpcm: {u:'lpcm'} }[cfg.xAxis];
      const yr = { power: {u:'pwr%'}, speed: {u:'mm/s'}, lpcm: {u:'lpcm'} }[cfg.yAxis];
      
      const xLabel = `${cfg.xMin} - ${xr.u} - ${cfg.xMax}`;
      const yLabel = `${cfg.yMin} - ${yr.u} - ${cfg.yMax}`;
      
      // Bottom axis (X)
      addText(xLabel, CX, CY + effectiveTotal/2 + 3.5, 0, 2.4);
      // Left axis (Y) - Rotated -90
      addText(yLabel, CX - effectiveTotal/2 - 3.5, CY, -90, 2.4);
    }

    return {
      canvasId: canvasId,
      canvas: [{ id: canvasId, title: "{panel}1", layerData: {"#5b9bd5": {name:"Grid", order:1, visible:true}}, groupData: {}, displays }],
      device: { id: "GS006", power: [5, 15], data: { dataType: "Map", value: [[canvasId, { mode: "LASER_PLANE", data: { LASER_PLANE: { material: 0, lightSourceMode: planType, thickness: null, perimeter: null, diameter: null, isProcessByLayer: false, pathPlanning: "auto", fillPlanning: "separate", dreedyTsp: false, avoidSmokeModal: false, scanDirection: "topToBottom", enableOddEvenKerf: true, xcsUsed: [] } }, displays: { dataType: "Map", value: displayValues } }]] } },
      extId: "GS006", extName: "F2", version: "1.5.8", minRequiredVersion: "2.6.0", created: Date.now(), modify: Date.now(), projectTraceID: uuid()
    };
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
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
  }
};

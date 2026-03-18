import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { MandalaTab } from './mandala-tab.js';

export const BitmapLineTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Bitmap Lines</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Bitmap Line Test';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      laserType: 'ir',
      totalWidth: 30,
      lines: [
        { id: uuid(), rangeAxis: 'power', min: 10, max: 100, fixedPower: 20, fixedSpeed: 0.1, fixedDpi: 300 }
      ]
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'bitmap-line', pane, cfg, state };

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
    const { laserType, totalWidth, lines } = cfg;

    const laserSource = laserType === 'ir' ? 'red' : 'blue';
    const planType = laserType === 'ir' ? 'ir' : 'blue';
    const labelColor = "#5b9bd5";
    const lineColor = "#ffffff";

    const addText = (text, tx, ty, size, color) => {
      const id = uuid();
      // XCS Spec: fontSize (pt) ≈ height (mm) * 3.626
      const fontSize = Math.round(size * 3.626);
      const textWidth = text.length * size * 0.5; // mm width at scale 1

      displays.push({
        id, name: null, type: 'TEXT', x: tx, y: ty, angle: 0,
        scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: tx, offsetY: ty, lockRatio: true, isClosePath: true,
        zOrder: displays.length, sourceId: id, groupTag: "", layerTag: color,
        layerColor: color, visible: true, originColor: "#000000",
        enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
        width: textWidth, height: size, isFill: true, lineColor: 0, fillColor: color,
        text, resolution: 1,
        style: { fontSize: fontSize, fontFamily: "Lato", fontSubfamily: "Bold", fontSource: "build-in", align: "right" }
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

    const startY = CY - ((lines.length * 7) - 4) / 2;

    lines.forEach((line, i) => {
      const y = startY + i * 7;
      const gridX = CX - totalWidth / 2;
      const labelSize = 2.4;
      const axisAbbrevs = { power: 'PWR', speed: 'DUR', dpi: 'DPI' };
      const axes = ['dpi', 'power', 'speed'];
      const fixedAxes = axes.filter(a => a !== line.rangeAxis);
      const getVal = (a) => a === 'power' ? line.fixedPower : a === 'speed' ? line.fixedSpeed : line.fixedDpi;
      const getUnit = (a) => ({ power: '%', speed: ' ms', dpi: ' DPI' }[a]);
      const labelText = `${getVal(fixedAxes[0])}${getUnit(fixedAxes[0])} ${getVal(fixedAxes[1])}${getUnit(fixedAxes[1])} ${axisAbbrevs[line.rangeAxis]}`;
      const textX = gridX - 4;
      const textY = (y + 1.5) + (labelSize / 2); // Baseline adjustment
      addText(labelText, textX, textY, labelSize, labelColor);

      const id = uuid();
      const currentDpi = line.rangeAxis === 'dpi' ? line.max : line.fixedDpi;
      const widthPixels = Math.round(totalWidth * currentDpi / 25.4);
      displays.push({
        id, name: null, type: 'IMAGE', x: gridX + totalWidth / 2, y: y + 1.5, width: totalWidth, height: 3, angle: 0,
        scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: gridX + totalWidth / 2, offsetY: y + 1.5, lockRatio: false, isClosePath: true,
        zOrder: displays.length, sourceId: id, groupTag: "", layerTag: lineColor,
        layerColor: lineColor, visible: true, originColor: "#000000",
        enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { paintType: "color", visible: false, color: 0, alpha: 1, width: 0, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
        isFill: true, lineColor: 0, fillColor: lineColor,
        isGrayscaleGradient: true,
        minVal: line.min, maxVal: line.max, rangeAxis: line.rangeAxis,
        widthPixels, heightPixels: 1
      });

      const bitmapPm = {
        power: line.rangeAxis === 'power' ? 100 : line.fixedPower,
        speed: line.rangeAxis === 'speed' ? 100 : line.fixedSpeed,
        dpi: line.rangeAxis === 'dpi' ? 300 : line.fixedDpi,
        repeat: 1, processingLightSource: laserSource, bitmapScanMode: "zMode"
      };

      displayValues.push([id, {
        isFill: true, type: 'IMAGE', processingType: "FILL_VECTOR_ENGRAVING", processIgnore: false, isWhiteModel: false,
        data: {
          VECTOR_CUTTING: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 10, repeat: 1, processingLightSource: laserSource } } },
          VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 100, repeat: 1, processingLightSource: laserSource } } },
          FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: bitmapPm } },
          COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: bitmapPm } },
          INTAGLIO: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 100, repeat: 1, processingLightSource: laserSource } } }
        }
      }]);
    });

    const layerData = {};
    layerData[labelColor] = { name: "Labels", order: 2, visible: true };
    layerData[lineColor] = { name: "Lines", order: 1, visible: true };
    return {
      canvasId: canvasId,
      canvas: [{ id: canvasId, title: "{panel}1", layerData, groupData: {}, displays }],
      device: { id: "GS006", power: [5, 15], data: { dataType: "Map", value: [[canvasId, { mode: "LASER_PLANE", data: { LASER_PLANE: { material: 0, lightSourceMode: planType, thickness: null, perimeter: null, diameter: null, isProcessByLayer: true, pathPlanning: "custom", fillPlanning: "separate", dreedyTsp: false, avoidSmokeModal: false, scanDirection: "topToBottom", enableOddEvenKerf: true, xcsUsed: [] } }, displays: { dataType: "Map", value: displayValues } }]] } },
      extId: "GS006", extName: "F2", version: "1.5.8", minRequiredVersion: "2.6.0", created: Date.now(), modify: Date.now(), projectTraceID: uuid()
    };
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => {
      const parts = path.split('.');
      let obj = cfg;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = val;
      update(true); Persistence.save();
    };

    const getMaxDpi = (type) => type === 'ir' ? 846 : 422;

    const handleManualEdit = (line, p, key, isDur) => (valStr) => {
      if (!isDur) {
        const parsed = parseFloat(valStr.replace(/[^\d.]/g, ''));
        if (!isNaN(parsed)) set(p + key, parsed);
        return;
      }
      const dpi = line.rangeAxis === 'dpi' ? line.max : line.fixedDpi;
      const speedMatch = valStr.match(/^([\d.]+)\s*(mms|mm\/s)$/i);
      if (speedMatch) {
        const v = parseFloat(speedMatch[1]);
        if (v > 0) {
          const t = 25400 / (dpi * v);
          set(p + key, Math.round(t * 100) / 100);
        }
      } else {
        const parsed = parseFloat(valStr.replace(/[^\d.]/g, ''));
        if (!isNaN(parsed)) set(p + key, parsed);
      }
    };

    const makeDpiControl = (line, p, key, r) => {
      const rangeCtrl = MandalaTab.makeRange(r.min, r.max, r.step, line[key], v => set(p + key, +v), r.unit, handleManualEdit(line, p, key, false));
      rangeCtrl.style.position = 'relative';
      
      const fullVal = getMaxDpi(cfg.laserType);
      const fullBtn = document.createElement('button');
      fullBtn.className = 'dpi-full-popout';
      fullBtn.textContent = `Full (${fullVal} DPI)`;
      fullBtn.title = 'Best resolution based on laser spot size';
      fullBtn.onclick = (e) => { 
        e.stopPropagation(); 
        set(p + key, fullVal);
        this.renderControls(tabId); // Re-render to update sliders/labels
      };
      rangeCtrl.appendChild(fullBtn);
      return rangeCtrl;
    };

    const getRanges = (axis) => {
      if (axis === 'power') return { min: 1, max: 100, step: 1, unit: '%' };
      if (axis === 'speed') return { min: 0.1, max: 10, step: 0.1, unit: ' ms' };
      return { min: 10, max: 1000, step: 10, unit: ' DPI' };
    };

    scroll.appendChild(MandalaTab.makeSection('Global', [
      MandalaTab.makeRow('Laser', MandalaTab.makeToggles(['ir', 'blue'], cfg.laserType, v => set('laserType', v), { ir: 'IR', blue: 'BLUE' })),
      MandalaTab.makeRow('Width', MandalaTab.makeRange(10, 100, 1, cfg.totalWidth, v => set('totalWidth', +v), ' mm')),
      (() => {
        const btn = document.createElement('button');
        btn.className = 'hbtn primary'; btn.style.width = '100%'; btn.style.marginTop = '8px';
        btn.textContent = '+ Add Line';
        btn.onclick = () => {
          cfg.lines.push({ id: uuid(), rangeAxis: 'power', min: 10, max: 100, fixedPower: 20, fixedSpeed: 0.1, fixedDpi: 300 });
          this.renderControls(tabId); update();
        };
        return btn;
      })()
    ]));

    cfg.lines.forEach((line, i) => {
      const p = `lines.${i}.`;
      const axisLabels = { power: 'PWR', speed: 'DUR', dpi: 'DPI' };
      const axisTitles = { power: 'Power', speed: 'Dot Duration', dpi: 'Dots Per Inch' };
      const axisOpts = ['power', 'speed', 'dpi'];
      const r = getRanges(line.rangeAxis);
      const isRangeDur = line.rangeAxis === 'speed';
      const fixedAxes = axisOpts.filter(a => a !== line.rangeAxis);

      const children = [
        MandalaTab.makeRow('Range Axis', MandalaTab.makeToggles(axisOpts, line.rangeAxis, v => { set(p + 'rangeAxis', v); this.renderControls(tabId); }, axisLabels, axisTitles)),
        MandalaTab.makeRow(`Min (${r.unit})`, line.rangeAxis === 'dpi' ? makeDpiControl(line, p, 'min', r) : MandalaTab.makeRange(r.min, r.max, r.step, line.min, v => set(p + 'min', +v), r.unit, handleManualEdit(line, p, 'min', isRangeDur))),
        MandalaTab.makeRow(`Max (${r.unit})`, line.rangeAxis === 'dpi' ? makeDpiControl(line, p, 'max', r) : MandalaTab.makeRange(r.min, r.max, r.step, line.max, v => set(p + 'max', +v), r.unit, handleManualEdit(line, p, 'max', isRangeDur)))
      ];

      fixedAxes.forEach(fa => {
        const fr = getRanges(fa);
        const key = fa === 'power' ? 'fixedPower' : fa === 'speed' ? 'fixedSpeed' : 'fixedDpi';
        const isDur = fa === 'speed';
        const ctrl = fa === 'dpi' ? makeDpiControl(line, p, key, fr) : MandalaTab.makeRange(fr.min, fr.max, fr.step, line[key], v => set(p + key, +v), fr.unit, handleManualEdit(line, p, key, isDur));
        children.push(MandalaTab.makeRow(`Fixed ${axisLabels[fa]}`, ctrl));
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'hbtn sm'; delBtn.style.color = '#e07070'; delBtn.style.marginLeft = 'auto';
      delBtn.textContent = 'Remove';
      delBtn.onclick = (e) => { e.stopPropagation(); cfg.lines.splice(i, 1); this.renderControls(tabId); update(); };
      scroll.appendChild(MandalaTab.makeSection(`Line ${i + 1}`, children, false, delBtn));
    });
  }
};

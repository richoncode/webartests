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
      totalWidth: 80,
      lines: [
        { id: uuid(), rangeAxis: 'power', min: 10, max: 100, fixedPower: 20, fixedSpeed: 100, fixedLpcm: 1000 }
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

    const addText = (text, tx, ty, size, color, layerTag) => {
      const id = uuid();
      const baseHeight = 19.85;
      const scale = size / baseHeight;
      const fontSize = 72;
      const textWidth = text.length * baseHeight * 0.5;

      displays.push({
        id, name: null, type: 'TEXT', x: tx, y: ty, angle: 0,
        scale: { x: scale, y: scale }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: tx, offsetY: ty, lockRatio: true, isClosePath: true,
        zOrder: displays.length, sourceId: id, groupTag: "", layerTag: layerTag || color,
        layerColor: color, visible: true, originColor: "#000000",
        enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
        width: textWidth * scale, height: size, isFill: true, lineColor: 0, fillColor: color,
        text, resolution: 1,
        style: { fontSize: fontSize, fontFamily: "Lato", fontSubfamily: "Bold", fontSource: "build-in", align: "left" }
      });
      displayValues.push([id, {
        isFill: true, type: 'TEXT', processingType: "VECTOR_ENGRAVING", processIgnore: false, isWhiteModel: false,
        data: {
          VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: { power: 20, speed: 100, repeat: 1, processingLightSource: laserSource } } }
        }
      }]);
    };

    const startY = CY - ((lines.length * 7) - 4) / 2;

    lines.forEach((line, i) => {
      const y = startY + i * 7; // 3mm line + 4mm gap
      const x = CX - totalWidth / 2;

      // Labels
      const axes = ['lpcm', 'power', 'speed'];
      const fixedAxes = axes.filter(a => a !== line.rangeAxis);
      const getVal = (a) => a === 'power' ? line.fixedPower : a === 'speed' ? line.fixedSpeed : line.fixedLpcm;
      const getUnit = (a) => ({ power: '%', speed: 'mm/s', lpcm: 'L' }[a]);
      
      const labelText = `${getVal(fixedAxes[0])}${getUnit(fixedAxes[0])} ${getVal(fixedAxes[1])}${getUnit(fixedAxes[1])} ${line.rangeAxis.toUpperCase()}`;
      addText(labelText, x - 2, y + 1.5, 2.4, labelColor, "Labels");

      // Grayscale Line (Placeholder as RECT for now, type IMAGE for logic)
      const id = uuid();
      displays.push({
        id, name: null, type: 'IMAGE', x: x + totalWidth / 2, y: y + 1.5, width: totalWidth, height: 3, angle: 0,
        scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: x + totalWidth / 2, offsetY: y + 1.5, lockRatio: false, isClosePath: true,
        zOrder: displays.length, sourceId: id, groupTag: "", layerTag: "Lines",
        layerColor: lineColor, visible: true, originColor: "#000000",
        enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 0.2, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
        isFill: true, lineColor: 0, fillColor: lineColor,
        // Custom metadata for viewer rendering
        isGrayscaleGradient: true,
        minVal: line.min, maxVal: line.max, rangeAxis: line.rangeAxis
      });

      const pm = {
        power: line.rangeAxis === 'power' ? 100 : line.fixedPower,
        speed: line.rangeAxis === 'speed' ? 100 : line.fixedSpeed,
        density: line.rangeAxis === 'lpcm' ? 1000 : line.fixedLpcm,
        repeat: 1, processingLightSource: laserSource, bitmapScanMode: "zMode"
      };

      displayValues.push([id, {
        isFill: true, type: 'IMAGE', processingType: "FILL_VECTOR_ENGRAVING", processIgnore: false, isWhiteModel: false,
        data: {
          FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } }
        }
      }]);
    });

    const layerData = {
      "Labels": { name: "Labels", order: 2, visible: true },
      "Lines": { name: "Lines", order: 1, visible: true }
    };

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

    // Global
    scroll.appendChild(MandalaTab.makeSection('Global', [
      MandalaTab.makeRow('Laser', MandalaTab.makeToggles(['ir', 'blue'], cfg.laserType, v => set('laserType', v), { ir: 'IR', blue: 'BLUE' })),
      MandalaTab.makeRow('Width', MandalaTab.makeRange(10, 100, 1, cfg.totalWidth, v => set('totalWidth', +v), 'mm')),
      (() => {
        const btn = document.createElement('button');
        btn.className = 'hbtn primary'; btn.style.width = '100%'; btn.style.marginTop = '8px';
        btn.textContent = '+ Add Line';
        btn.onclick = () => {
          cfg.lines.push({ id: uuid(), rangeAxis: 'power', min: 10, max: 100, fixedPower: 20, fixedSpeed: 100, fixedLpcm: 1000 });
          this.renderControls(tabId); update();
        };
        return btn;
      })()
    ]));

    // Lines
    cfg.lines.forEach((line, i) => {
      const p = `lines.${i}.`;
      const axisLabels = { power: 'PWR', speed: 'SPD', lpcm: 'LPC' };
      const axisOpts = ['power', 'speed', 'lpcm'];

      const getRanges = (axis) => {
        if (axis === 'power') return { min: 1, max: 100, step: 1, unit: '%' };
        if (axis === 'speed') return { min: 1, max: 500, step: 5, unit: 'mm/s' };
        return { min: 10, max: 1000, step: 50, unit: 'L' };
      };

      const r = getRanges(line.rangeAxis);
      const fixedAxes = axisOpts.filter(a => a !== line.rangeAxis);

      const children = [
        MandalaTab.makeRow('Range Axis', MandalaTab.makeToggles(axisOpts, line.rangeAxis, v => { set(p + 'rangeAxis', v); this.renderControls(tabId); }, axisLabels)),
        MandalaTab.makeRow(`Min (${r.unit})`, MandalaTab.makeRange(r.min, r.max, r.step, line.min, v => set(p + 'min', +v), r.unit)),
        MandalaTab.makeRow(`Max (${r.unit})`, MandalaTab.makeRange(r.min, r.max, r.step, line.max, v => set(p + 'max', +v), r.unit))
      ];

      fixedAxes.forEach(fa => {
        const fr = getRanges(fa);
        const key = fa === 'power' ? 'fixedPower' : fa === 'speed' ? 'fixedSpeed' : 'fixedLpcm';
        children.push(MandalaTab.makeRow(`Fixed ${axisLabels[fa]}`, MandalaTab.makeRange(fr.min, fr.max, fr.step, line[key], v => set(p + key, +v), fr.unit)));
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'hbtn sm'; delBtn.style.color = '#e07070'; delBtn.style.marginLeft = 'auto';
      delBtn.textContent = 'Remove';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        cfg.lines.splice(i, 1);
        this.renderControls(tabId); update();
      };

      scroll.appendChild(MandalaTab.makeSection(`Line ${i + 1}`, children, false, delBtn));
    });
  }
};

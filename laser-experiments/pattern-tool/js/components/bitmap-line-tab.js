import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { MandalaTab } from './mandala-tab.js';
import { XCSExporter } from '../xcs-exporter.js';

export const BitmapLineTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Bitmap Line Test</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Bitmap Line Test';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      laserType: 'ir',
      totalWidth: 50,
      lines: [
        { id: uuid(), min: 10, max: 100, rangeAxis: 'power', fixedDpi: 300, fixedSpeed: 100, fixedPower: 20 },
        { id: uuid(), min: 1, max: 500, rangeAxis: 'speed', fixedDpi: 300, fixedSpeed: 100, fixedPower: 20 },
        { id: uuid(), min: 100, max: 1000, rangeAxis: 'dpi', fixedDpi: 300, fixedSpeed: 100, fixedPower: 20 }
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
    const project = XCSExporter.createProject();
    const CX = 50, CY = 50;
    const { laserType, totalWidth, lines } = cfg;

    const laserSource = laserType === 'ir' ? 'red' : 'blue';
    const labelColor = "#5b9bd5";
    const lineColor = "#ffffff";

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

      // XCS Reference Analysis: Lato Regular 72pt = ~23.35mm unscaled height.
      const unscaledHeight = 23.35;
      const scale = labelSize / unscaledHeight;
      const fontSize = 72 * scale;
      const width = (labelText.length * 11.44) * scale;

      XCSExporter.addText(project, {
        text: labelText, x: textX, y: textY, width, height: labelSize, fontSize, scale,
        layerColor: labelColor, laserSource, align: "right"
      });

      const currentDpi = line.rangeAxis === 'dpi' ? line.max : line.fixedDpi;
      const widthPixels = Math.round(totalWidth * currentDpi / 25.4);
      
      const bitmapPm = {
        power: line.rangeAxis === 'power' ? 100 : line.fixedPower,
        speed: line.rangeAxis === 'speed' ? 100 : line.fixedSpeed,
        dpi: line.rangeAxis === 'dpi' ? 300 : line.fixedDpi,
        repeat: 1, processingLightSource: laserSource, bitmapScanMode: "zMode"
      };

      XCSExporter.addImage(project, {
        x: gridX + totalWidth / 2, y: y + 1.5, width: totalWidth, height: 3,
        layerColor: lineColor, laserSource, params: bitmapPm,
        extraDisplayData: {
          isGrayscaleGradient: true,
          minVal: line.min, maxVal: line.max, rangeAxis: line.rangeAxis,
          widthPixels, heightPixels: 1
        }
      });
    });

    const canvas = project.canvas[0];
    const dvEntry = project.device.data.value[0][1];
    dvEntry.data.LASER_PLANE.isProcessByLayer = false;
    dvEntry.data.LASER_PLANE.pathPlanning = "auto";
    
    canvas.layerData[labelColor] = { name: "Labels", order: 2, visible: true };
    canvas.layerData[lineColor] = { name: "Bitmap Lines", order: 1, visible: true };

    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };

    scroll.appendChild(MandalaTab.makeSection('Global', [
      MandalaTab.makeRow('Laser', MandalaTab.makeToggles(['ir', 'blue'], cfg.laserType, v => set('laserType', v), { ir: 'IR', blue: 'BLUE' })),
      MandalaTab.makeRow('Total Width', MandalaTab.makeRange(10, 100, 5, cfg.totalWidth, v => set('totalWidth', +v), 'mm'))
    ]));

    cfg.lines.forEach((line, idx) => {
      const setLine = (path, val) => { line[path] = val; update(); Persistence.save(); };
      const axes = { power: 'Power', speed: 'Dot Duration', dpi: 'DPI' };
      
      const rows = [
        MandalaTab.makeRow('Range Axis', MandalaTab.makeToggles(Object.keys(axes), line.rangeAxis, v => setLine('rangeAxis', v), axes)),
        MandalaTab.makeRow('Min', MandalaTab.makeRange(1, line.rangeAxis === 'speed' ? 500 : 1000, 1, line.min, v => setLine('min', +v))),
        MandalaTab.makeRow('Max', MandalaTab.makeRange(1, line.rangeAxis === 'speed' ? 500 : 1000, 1, line.max, v => setLine('max', +v)))
      ];

      if (line.rangeAxis !== 'power') rows.push(MandalaTab.makeRow('Fixed Power', MandalaTab.makeRange(1, 100, 1, line.fixedPower, v => setLine('fixedPower', +v), '%')));
      if (line.rangeAxis !== 'speed') rows.push(MandalaTab.makeRow('Fixed Duration', MandalaTab.makeRange(0.01, 10, 0.05, line.fixedSpeed, v => setLine('fixedSpeed', +v), 'ms')));
      if (line.rangeAxis !== 'dpi') rows.push(MandalaTab.makeRow('Fixed DPI', MandalaTab.makeRange(10, 1000, 10, line.fixedDpi, v => setLine('fixedDpi', +v), 'DPI')));

      const sec = MandalaTab.makeSection(`Line ${idx + 1}`, rows);
      
      const delBtn = document.createElement('button');
      delBtn.className = 'tool-btn-small';
      delBtn.style.color = '#e07070';
      delBtn.textContent = 'Remove';
      delBtn.onclick = () => {
        cfg.lines.splice(idx, 1);
        this.renderControls(tabId);
        update();
        Persistence.save();
      };
      sec.querySelector('.tool-section-header').appendChild(delBtn);
      
      scroll.appendChild(sec);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'tool-btn';
    addBtn.style.marginTop = '10px';
    addBtn.textContent = '+ Add Line';
    addBtn.onclick = () => {
      cfg.lines.push({ id: uuid(), min: 10, max: 100, rangeAxis: 'power', fixedDpi: 300, fixedSpeed: 100, fixedPower: 20 });
      this.renderControls(tabId);
      update();
      Persistence.save();
    };
    scroll.appendChild(addBtn);
  }
};

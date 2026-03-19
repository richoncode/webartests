import { App } from '../app.js';
import { XCSViewer } from '../viewer.js';
import { XcsTab } from './xcs-tab.js';
import { XCSExporter } from '../xcs-exporter.js';
import { MandalaTab } from './mandala-tab.js';

export const TestTab = {
  create(tabId) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Tests (T+)</span></div>
        <div class="tool-scroll">
          <div class="tool-section">
            <div class="tool-section-header">Baseline Tests</div>
            <div class="tool-section-body">
              <button class="tool-btn font-test-btn">Font Baseline (XCSFONTEXAMPLE1)</button>
            </div>
          </div>
        </div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Test Baseline';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'test', pane, state };

    pane.querySelector('.font-test-btn').addEventListener('click', () => this.runFontTest(tabId));

    return pane;
  },

  runFontTest(tabId) {
    const inst = App.instances[tabId];
    const project = XCSExporter.createProject();
    
    const referenceText = [
      { text: "Engrave Test-xTool F2", x: 32.51, y: 10.17, width: 37.37, height: 3.63, fontSize: 11.2, scale: 0.1555 },
      { text: "Speed(mm/s)", x: 2.51, y: 50.23, width: 22.04, height: 3.74, fontSize: 11.2, scale: 0.1555 },
      { text: "10", x: 16.10, y: 54.57, width: 4.06, height: 2.89, fontSize: 11.2, scale: 0.1555 },
      { text: "1508", x: 11.59, y: 45.85, width: 8.57, height: 2.89, fontSize: 11.2, scale: 0.1555 },
      { text: "3005", x: 11.48, y: 37.13, width: 8.67, height: 2.89, fontSize: 11.2, scale: 0.1555 },
      { text: "4503", x: 11.25, y: 28.40, width: 8.90, height: 2.89, fontSize: 11.2, scale: 0.1555 },
      { text: "6000", x: 11.33, y: 19.68, width: 8.83, height: 2.89, fontSize: 11.2, scale: 0.1555 },
      { text: "Power(%)", x: 43.65, y: 73.36, width: 16.03, height: 3.64, fontSize: 11.2, scale: 0.1555 },
      { text: "100", x: 70.96, y: 64.41, width: 6.35, height: 2.89, fontSize: 11.2, scale: 0.1555 },
      { text: "78", x: 60.84, y: 64.41, width: 4.17, height: 2.89, fontSize: 11.2, scale: 0.1555 },
      { text: "55", x: 49.66, y: 64.41, width: 4.09, height: 2.86, fontSize: 11.2, scale: 0.1555 },
      { text: "33", x: 38.39, y: 64.41, width: 4.19, height: 2.89, fontSize: 11.2, scale: 0.1555 },
      { text: "10", x: 27.24, y: 64.41, width: 4.06, height: 2.89, fontSize: 11.2, scale: 0.1555 }
    ];

    referenceText.forEach(opt => {
      XCSExporter.addText(project, {
        ...opt,
        layerColor: "#00befe",
        processingType: "VECTOR_ENGRAVING",
        laserSource: "red",
        align: "center"
      });
    });

    inst.state.rawData = project;
    inst.state.shapes = XcsTab.parseXCS(project);
    XCSViewer.update(inst.pane, inst.state);
  }
};

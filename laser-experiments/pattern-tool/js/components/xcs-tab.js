import { App } from '../app.js';
import { XCSViewer } from '../viewer.js';
import { XCSProject } from '../../../xcs-module/js/xcs-system.js';

export const XcsTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="drop-zone">
        <div class="drop-zone-icon">📂</div>
        <div class="drop-zone-title">Drop an .xcs file here</div>
        <div class="drop-zone-sub">or click to browse</div>
        <input type="file" class="file-input" accept=".xcs,.json" style="display:none">
      </div>`;
    
    const q = s => pane.querySelector(s);
    const state = { project: null };
    App.instances[tabId] = { type: initialCfg?.type || 'xcs', pane, state };

    const viewer = XCSViewer.create(tabId);
    pane.appendChild(viewer);

    q('.drop-zone').addEventListener('click', () => q('.file-input').click());
    q('.file-input').addEventListener('change', e => { if (e.target.files[0]) this.loadFile(tabId, pane, state, e.target.files[0]); });
    
    pane.addEventListener('dragover', e => { e.preventDefault(); q('.drop-zone').classList.add('over'); });
    pane.addEventListener('dragleave', e => { if (!pane.contains(e.relatedTarget)) q('.drop-zone').classList.remove('over'); });
    pane.addEventListener('drop', e => {
      e.preventDefault(); q('.drop-zone').classList.remove('over');
      const f = e.dataTransfer.files[0]; if (f) this.loadFile(tabId, pane, state, f);
    });

    return pane;
  },

  loadFile(tabId, pane, state, file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        state.project = XCSProject.fromJSON(JSON.parse(e.target.result));
        pane.querySelector('.drop-zone').style.display = 'none';
        pane.querySelector('.viewer-fname').textContent = file.name;
        if (App.TabMgr) App.TabMgr.setLabel(tabId, file.name);
        XCSViewer.update(pane, state);
      } catch(err) { alert('Parse error:\n' + err.message); }
    };
    reader.readAsText(file);
  }
};

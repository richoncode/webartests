import { App } from '../app.js';
import { XCSViewer } from '../viewer.js';
import { TabMgr } from '../tabs.js';

export const XcsTab = {
  create(tabId) {
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
    
    const viewer = XCSViewer.create(tabId);
    pane.appendChild(viewer);

    const q = s => pane.querySelector(s);
    const state = { rawData:null, shapes:[] };
    App.instances[tabId] = { type:'xcs', pane, state };

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
        state.rawData = JSON.parse(e.target.result);
        state.shapes  = this.parseXCS(state.rawData);
        pane.querySelector('.drop-zone').style.display = 'none';
        pane.querySelector('.viewer-fname').textContent = file.name;
        TabMgr.setLabel(tabId, file.name);
        XCSViewer.update(pane, state);
      } catch(err) { alert('Parse error:\n' + err.message); }
    };
    reader.readAsText(file);
  },

  parseXCS(data) {
    const canvas = data.canvas[0];
    const dvEntry = Object.fromEntries(data.device.data.value)[canvas.id];
    const dispMap = Object.fromEntries(dvEntry.displays.value);
    return canvas.displays.map((d, i) => {
      const cfg = dispMap[d.id] || {};
      const pt = cfg.processingType || '';
      const pm = (pt && cfg.data?.[pt]) ? (cfg.data[pt].parameter?.customize || {}) : {};
      const src = pm.processingLightSource || null;
      const laser = (src === 'red' || src === 'ir') ? 'ir' : src;
      return { idx:i, id:d.id, type:d.type, x:d.x, y:d.y, w:d.width, h:d.height,
               angle:d.angle||0, layerColor:d.layerColor||'#5b9bd5', zOrder:d.zOrder||0,
               processingType:pt, power:pm.power??null, speed:pm.speed??null,
               density:pm.density??null, repeat:pm.repeat??1,
               laser: laser, hideLabels: !!d.hideLabels,
               text: d.text || null, style: d.style || null };
    });
  }
};

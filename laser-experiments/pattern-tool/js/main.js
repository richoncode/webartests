import { App } from './app.js';
import { Persistence } from './persistence.js';
import { PalMgr } from './palettes.js';
import { TabMgr } from './tabs.js';
import { XCSViewer, Popup } from './viewer.js';
import { VERSION } from './constants.js';

// Attach to window for global access
window.App = App;
window.Persistence = Persistence;
window.PalMgr = PalMgr;
window.TabMgr = TabMgr;
window.XCSViewer = XCSViewer;
window.Popup = Popup;

function setupEventListeners() {
  const listen = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  // Header buttons
  listen('openXcsBtn', () => TabMgr.openXcs());
  listen('newMandalaBtn', () => TabMgr.newMandala());
  listen('newGradientBtn', () => TabMgr.newGradient());
  listen('saveRnrBtn', () => Persistence.saveRNR());
  listen('loadRnrBtn', () => document.getElementById('rnrInput').click());
  listen('clearAllBtn', () => Persistence.clearAll());
  
  const rnrInput = document.getElementById('rnrInput');
  if (rnrInput) {
    rnrInput.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) {
        Persistence.loadRNR(e.target.files[0]);
      }
    });
  }

  // Welcome screen buttons
  listen('welcomeOpenXcsBtn', () => TabMgr.openXcs());
  listen('welcomeNewMandalaBtn', () => TabMgr.newMandala());
  listen('welcomeNewGradientBtn', () => TabMgr.newGradient());

  const vEl = document.getElementById('appVersion');
  if (vEl) vEl.textContent = `v${VERSION}`;

  window.addEventListener('resize', () => {
    if (!App.activeTabId) return;
    const inst = App.instances[App.activeTabId];
    if (inst) XCSViewer.update(inst.pane, inst.state);
    Persistence.save();
  });
}

async function init() {
  try {
    setupEventListeners();
    await PalMgr.load();
    if (!Persistence.load()) {
      TabMgr.newMandala();
    }
  } catch (err) {
    console.error('Initialization failed', err);
    // Even if init fails, try to show the welcome screen so buttons might work
    document.getElementById('welcomeScreen').style.display = 'flex';
  }
}

init();

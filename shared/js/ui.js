/**
 * webartests Shared UI Components
 * ── Standardized UI Elements ──
 */

/**
 * Injects a standard back link into the document.
 * @param {string} label - The text to display
 * @param {string} url - The destination URL
 * @param {boolean} fixed - Whether the link should be fixed top-left
 */
export function injectBackLink(label = "← Back", url = "../", fixed = false) {
  const link = document.createElement('a');
  link.className = 'back-link';
  link.href = url;
  link.textContent = label;
  
  if (fixed) {
    link.style.position = 'fixed';
    link.style.top = '22px';
    link.style.left = '24px';
    link.style.zIndex = '1000';
    link.style.marginBottom = '0';
  }

  // Insert at top of body or first container
  const parent = document.querySelector('.page') || document.body;
  parent.insertBefore(link, parent.firstChild);
  return link;
}

/**
 * Updates a metadata bar with dynamic content.
 * @param {HTMLElement} el - The metadata bar element
 * @param {Object} data - Key-value pairs of metadata
 */
export function renderMetadata(el, data) {
  if (!el) return;
  el.innerHTML = Object.entries(data).map(([key, val]) => `
    <div class="meta-item"><b>${key}:</b> <strong>${val}</strong></div>
  `).join('');
}

/**
 * Controller for standard simulation stats (Progress, Peak Stress, Avg Temp).
 */
export class StatsController {
  /**
   * @param {Object} ids - Mapping of keys to element IDs (progress, peak, avg)
   */
  constructor(ids = { progress: 'progress', peak: 'peakHeat', avg: 'avgHeat' }) {
    this.els = {};
    for (const [key, id] of Object.entries(ids)) {
      this.els[key] = document.getElementById(id);
    }
  }

  updateProgress(pct) {
    if (this.els.progress) this.els.progress.textContent = `${Math.floor(pct)}%`;
  }

  updatePeak(val, isHot = false) {
    if (this.els.peak) {
      this.els.peak.textContent = val.toFixed(2);
      this.els.peak.classList.toggle('hot', isHot);
    }
  }

  updateAvg(val) {
    if (this.els.avg) this.els.avg.textContent = val.toFixed(2);
  }

  reset() {
    this.updateProgress(0);
    this.updatePeak(0);
    this.updateAvg(0);
  }
}

/**
 * Standard Dark Mode Toggle (if needed) or other site-wide global functions.
 */
export function initGlobal() {
  console.log('webartests shared UI initialized');
  // Handle CMD+Shift+R reminder in console for developers
  console.log('%c !!! REMINDER: Hard Refresh (Cmd+Shift+R) after UI changes !!! ', 'background: #e74c3c; color: #fff; font-weight: bold; padding: 4px;');
}

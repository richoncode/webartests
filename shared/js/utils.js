/**
 * webartests Shared Utilities
 * ── Canvas & Rendering ──
 */

/**
 * Standard canvas setup with DPR scaling and resize listener.
 * @param {HTMLCanvasElement} canvas
 * @param {Function} drawFn - (ctx, width, height)
 * @param {number} [fixedHeight] - Optional fixed CSS height
 * @returns {Function} - Manual redraw trigger
 */
export function setupCanvas(canvas, drawFn, fixedHeight = null) {
  let rafId = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    
    // Get CSS dimensions
    // We subtract padding if it's inside a .viz-container (approx 40px)
    const isViz = parent.classList.contains('viz') || parent.classList.contains('viz-container');
    const padding = isViz ? 40 : 0;
    
    const cssW = parent.clientWidth - padding;
    const cssH = fixedHeight || parseInt(canvas.getAttribute('data-h')) || 300;

    // Apply CSS size
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    // Apply buffer size
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    drawFn(ctx, cssW, cssH);
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(resize);
  });

  // Initial run
  setTimeout(resize, 0);
  return resize;
}

/**
 * Throttles a function call.
 */
export function throttle(fn, ms) {
  let timeout = null;
  return function(...args) {
    if (!timeout) {
      timeout = setTimeout(() => {
        fn.apply(this, args);
        timeout = null;
      }, ms);
    }
  };
}

/**
 * Common Math: Clamp value between min and max.
 */
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Common Math: Linear interpolation.
 */
export const lerp = (a, b, t) => a + (b - a) * t;

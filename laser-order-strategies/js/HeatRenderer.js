/**
 * HeatRenderer.js
 * Utility for rendering thermal simulation data to HTML5 Canvas.
 * Supports different visualization modes (Heat, Peak, Buckets).
 */
class HeatRenderer {
    static SS304_STOPS = [
        { t: 400, r: 180, g: 185, b: 190, name: 'Silver' },
        { t: 550, r: 200, g: 176, b: 96,  name: 'Straw' },
        { t: 620, r: 208, g: 144, b: 32,  name: 'Gold' },
        { t: 680, r: 200, g: 64,  b: 32,  name: 'Red' },
        { t: 720, r: 128, g: 48,  b: 96,  name: 'Purple' },
        { t: 760, r: 21,  g: 53,  b: 176, name: 'Deep Blue' },
        { t: 850, r: 18,  g: 144, b: 176, name: 'Cyan' },
        { t: 950, r: 58,  g: 58,  b: 58,  name: 'Burnt Grey' }
    ];

    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = config.gridSize || 40;
        this.cellPixels = canvas.width / this.gridSize;
        
        // Coloring config
        this.bucketColors = config.bucketColors || [
            '#ef4444', '#f97316', '#eab308', '#22c55e', 
            '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
        ];
    }

    getHeatColor(val, threshold = 90.0) {
        const n = Math.min(1, val / threshold);
        let r, g, b;
        if (n < 0.2) {
            r = 80 + n * 5 * 175; g = 0; b = 0;
        } else if (n < 0.4) {
            r = 255; g = (n-0.2) * 5 * 165; b = 0;
        } else if (n < 0.7) {
            r = 255; g = 165 + (n-0.4) * (1/0.3) * 90; b = 0;
        } else {
            r = 255; g = 255; b = (n-0.7) * (1/0.3) * 255;
        }
        return `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${Math.min(1, n * 2)})`;
    }

    getSS304Color(t) {
        const stops = HeatRenderer.SS304_STOPS;
        if (t <= stops[0].t) return `rgb(110, 110, 120)`;
        for (let i = 0; i < stops.length - 1; i++) {
            if (t <= stops[i+1].t) {
                const f = (t - stops[i].t) / (stops[i+1].t - stops[i].t);
                const r = Math.round(stops[i].r + f * (stops[i+1].r - stops[i].r));
                const g = Math.round(stops[i].g + f * (stops[i+1].g - stops[i].g));
                const b = Math.round(stops[i].b + f * (stops[i+1].b - stops[i].b));
                return `rgb(${r}, ${g}, ${b})`;
            }
        }
        return `rgb(58, 58, 58)`;
    }

    static getSS304Name(t) {
        const stops = HeatRenderer.SS304_STOPS;
        if (t < 450) return 'Silver';
        for (let i = stops.length - 1; i >= 0; i--) {
            if (t >= stops[i].t) return stops[i].name;
        }
        return 'Silver';
    }

    /**
     * Renders a glowing laser spot at specific coordinates.
     */
    renderBloom(x, y, intensity = 1.0) {
        const { ctx, cellPixels } = this;
        const px = x * cellPixels + cellPixels / 2;
        const py = y * cellPixels + cellPixels / 2;
        
        ctx.save();
        const grad = ctx.createRadialGradient(px, py, 0, px, py, cellPixels * 2);
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * intensity})`);
        grad.addColorStop(0.2, `rgba(255, 200, 0, ${0.4 * intensity})`);
        grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, cellPixels * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /**
     * Standardized renderer for a finished job.
     */
    renderFinal(sim, options = {}) {
        const finalOptions = Object.assign({}, options, {
            viewHeat: true,
            viewBuckets: false
        });
        this.render(sim, finalOptions);
    }

    /**
     * Renders the current state of a HeatSimulator.
     * @param {HeatSimulator} sim 
     * @param {Object} options { viewBuckets, viewHeat, mode, heatThreshold, colorMode, activeHeatThreshold, activeHeatScale, peakThreshold }
     */
    render(sim, options = {}) {
        const { ctx, canvas, gridSize, cellPixels } = this;
        const viewBuckets = options.viewBuckets !== undefined ? options.viewBuckets : false;
        const viewHeat = options.viewHeat !== undefined ? options.viewHeat : true;
        const heatThreshold = options.heatThreshold || 90.0;
        const mode = options.mode || 'triphase';
        const colorMode = options.colorMode || 'heat'; // 'heat' or 'ss304'
        const activeHeatThreshold = options.activeHeatThreshold || 0.01;
        const activeHeatScale = options.activeHeatScale || 15.0;
        
        // Default peakThreshold to baseTemp + 1 to avoid background washout
        const peakThreshold = options.peakThreshold !== undefined ? options.peakThreshold : (sim.baseTemp + 1 || 0.01);

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const state = sim.getStateAt(x, y);
                
                // 1. Sector/Bucket Visualization
                if (viewBuckets && state.etched) {
                    const isSequential = (mode === 'horizontal' || mode === 'diagonal' || mode === 'triphase' || mode === 'hilbert' || mode === 'square' || mode === 'taper');
                    if (isSequential) {
                        ctx.fillStyle = '#334155';
                    } else {
                        const bucket = PathStrategies.getBucket(x, y, mode, gridSize);
                        ctx.fillStyle = this.bucketColors[bucket] + '33';
                    }
                    ctx.fillRect(x * cellPixels, y * cellPixels, cellPixels, cellPixels);
                }
                
                // 2. Persistent Peak Heat Visualization
                if (viewHeat && state.peak > peakThreshold) {
                    if (colorMode === 'ss304') {
                        ctx.fillStyle = this.getSS304Color(state.peak);
                    } else {
                        ctx.fillStyle = this.getHeatColor(state.peak, heatThreshold);
                    }
                    ctx.fillRect(x * cellPixels, y * cellPixels, cellPixels, cellPixels);
                }

                // 3. Active "Live" Heat Overlay
                if (!viewBuckets && state.heat > activeHeatThreshold) {
                    const activeIntensity = Math.min(1, state.heat / activeHeatScale);
                    ctx.fillStyle = `rgba(255, 255, 255, ${activeIntensity})`;
                    ctx.fillRect(x * cellPixels, y * cellPixels, cellPixels, cellPixels);
                }
            }
        }
    }
}

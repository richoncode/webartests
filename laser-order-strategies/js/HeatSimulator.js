/**
 * HeatSimulator.js
 * A high-fidelity thermal simulation engine for laser material interactions.
 * Handles heat accumulation, diffusion, decay, and peak stress tracking.
 */
class HeatSimulator {
    constructor(config = {}) {
        this.gridSize = config.gridSize || 40;
        this.margin = config.margin || 15; // Buffer for diffusion beyond the active area
        this.simSize = this.gridSize + this.margin * 2;
        
        // Physics parameters
        this.k = config.diffusionRate || 0.1;
        
        // If materialSize is provided (1-16mm), adjust decayRate to simulate heat compounding
        // Smaller sizes have less time/area to cool, so we increase decay factor (closer to 1.0)
        if (config.materialSize) {
            // Mapping size 16mm -> 0.992 (default) to 1mm -> 0.998 (very slow decay)
            const sizeFactor = (16 - config.materialSize) / 15;
            this.decay = 0.992 + (sizeFactor * 0.006);
        } else {
            this.decay = config.decayRate || 0.992;
        }
        
        this.splash = config.splashFactor || 0.25;
        this.diagSplash = config.diagSplashFactor || 0.1;
        
        this.reset();
    }

    /**
     * Estimates the physical job time in seconds.
     * @param {number} lpc - Lines per cm
     * @param {number} size - Design size in mm
     * @param {string} scanDir - 'uni' or 'bi'
     * @param {string} fillPat - 'single' or 'cross'
     * @param {number} passes - Number of repetitions
     * @param {number} speed - Scan speed in mm/s (default 500)
     */
    static estimateJobTime(lpc, size, scanDir, fillPat, passes = 1, speed = 500) {
        const numLines = (lpc / 10) * size;
        const lineDistance = size;
        const returnDistance = (scanDir === 'uni') ? size : 0;
        const passMultiplier = (fillPat === 'cross') ? 2 : 1;
        
        // Time = (Etching Distance + Travel Distance) / Speed
        const timePerLine = (lineDistance + returnDistance) / speed;
        const timePerPass = numLines * timePerLine;
        
        return timePerPass * passMultiplier * passes;
    }

    reset() {
        const totalSize = this.simSize * this.simSize;
        this.heatMap = new Float32Array(totalSize);
        this.peakHeatMap = new Float32Array(totalSize);
        this.nextHeatMap = new Float32Array(totalSize);
        this.etchedState = new Uint8Array(this.gridSize * this.gridSize);
        this.maxStress = 0;
        this.maxCurrentHeat = 0;
        this.totalHeat = 0;
        this.etchedCount = 0;
    }

    getSimIdx(x, y) {
        return (y + this.margin) * this.simSize + (x + this.margin);
    }

    /**
     * Checks if the active heat has dissipated below a visible threshold.
     */
    isStable(threshold = 0.05) {
        return this.maxCurrentHeat < threshold;
    }

    /**
     * Advances simulation by one physics step and processes one cell from path if available.
     * @returns {Object|null} The cell coordinate processed, or null.
     */
    processStep(path, intensity = 12.0) {
        this.step();
        if (path && path.length > 0) {
            const cell = path.pop();
            this.addHeat(cell.x, cell.y, intensity);
            return cell;
        }
        return null;
    }

    /**
     * Encapsulates the entire "Instant Render" lifecycle: full path + cool-down.
     */
    processInstant(path, intensity = 12.0) {
        // 1. Process all etching
        while (path && path.length > 0) {
            const cell = path.pop();
            this.addHeat(cell.x, cell.y, intensity);
            this.step();
        }
        // 2. Automated Cool-down until thermally stable
        let safetyLimit = 2000; 
        while (!this.isStable() && safetyLimit > 0) {
            this.step();
            safetyLimit--;
        }
    }

    /**
     * Adds heat at a specific coordinate with a thermal splash effect.
     * @param {number} x - Active grid X
     * @param {number} y - Active grid Y
     * @param {number} intensity - Heat energy to add
     */
    addHeat(x, y, intensity) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;
        
        const si = this.getSimIdx(x, y);
        this.heatMap[si] += intensity;
        
        // Mark as etched if not already
        const eIdx = y * this.gridSize + x;
        if (this.etchedState[eIdx] === 0) {
            this.etchedState[eIdx] = 1;
            this.etchedCount++;
        }

        // Thermal Splash (Simulating spot size/diffusion)
        const s = intensity * this.splash;
        const ds = intensity * this.diagSplash;

        // Orthogonal splash
        this.heatMap[si - 1] += s;
        this.heatMap[si + 1] += s;
        this.heatMap[si - this.simSize] += s;
        this.heatMap[si + this.simSize] += s;

        // Diagonal splash
        this.heatMap[si - this.simSize - 1] += ds;
        this.heatMap[si - this.simSize + 1] += ds;
        this.heatMap[si + this.simSize - 1] += ds;
        this.heatMap[si + this.simSize + 1] += ds;
    }

    /**
     * Performs one physics step (diffusion and decay).
     */
    step() {
        const size = this.simSize;
        const heatMap = this.heatMap;
        const nextHeatMap = this.nextHeatMap;
        const k = this.k;
        const decay = this.decay;

        // Diffusion & Decay
        for (let y = 1; y < size - 1; y++) {
            const rowOffset = y * size;
            for (let x = 1; x < size - 1; x++) {
                const i = rowOffset + x;
                const neighborSum = heatMap[i - 1] + heatMap[i + 1] + 
                                  heatMap[i - size] + heatMap[i + size];
                
                // Thermal conduction formula + dissipation
                nextHeatMap[i] = (heatMap[i] + k * (neighborSum - 4 * heatMap[i])) * decay;
            }
        }
        
        this.heatMap.set(nextHeatMap);
        this.updateStats();
    }

    updateStats() {
        let currentTotal = 0;
        let frameMax = 0;
        const gridSize = this.gridSize;

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const si = this.getSimIdx(x, y);
                const h = this.heatMap[si];
                
                currentTotal += h;
                if (h > frameMax) frameMax = h;
                
                // Track peak per-pixel heat
                if (h > this.peakHeatMap[si]) {
                    this.peakHeatMap[si] = h;
                }
            }
        }

        this.totalHeat = currentTotal;
        this.maxCurrentHeat = frameMax;
        if (frameMax > this.maxStress) {
            this.maxStress = frameMax;
        }
    }

    getStats() {
        return {
            progress: (this.etchedCount / (this.gridSize * this.gridSize)) * 100,
            peakStress: this.maxStress,
            avgHeat: this.totalHeat / (this.gridSize * this.gridSize),
            isComplete: this.etchedCount === (this.gridSize * this.gridSize)
        };
    }

    getStateAt(x, y) {
        const si = this.getSimIdx(x, y);
        const eIdx = y * this.gridSize + x;
        return {
            heat: this.heatMap[si],
            peak: this.peakHeatMap[si],
            etched: this.etchedState[eIdx] === 1
        };
    }
}

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
        this.decay = config.decayRate || 0.992;
        this.splash = config.splashFactor || 0.25;
        this.diagSplash = config.diagSplashFactor || 0.1;
        
        this.reset();
    }

    reset() {
        const totalSize = this.simSize * this.simSize;
        this.heatMap = new Float32Array(totalSize);
        this.peakHeatMap = new Float32Array(totalSize);
        this.nextHeatMap = new Float32Array(totalSize);
        this.etchedState = new Uint8Array(this.gridSize * this.gridSize);
        this.maxStress = 0;
        this.totalHeat = 0;
        this.etchedCount = 0;
    }

    getSimIdx(x, y) {
        return (y + this.margin) * this.simSize + (x + this.margin);
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

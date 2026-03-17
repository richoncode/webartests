/**
 * PathStrategies.js
 * A collection of scan path generation algorithms for laser material processing.
 */
const PathStrategies = {
    M8: [
        [ 0, 32,  8, 40,  2, 34, 10, 42],
        [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44,  4, 36, 14, 46,  6, 38],
        [60, 28, 52, 20, 62, 30, 54, 22],
        [ 3, 35, 11, 43,  1, 33,  9, 41],
        [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47,  7, 39, 13, 45,  5, 37],
        [63, 31, 55, 23, 61, 29, 53, 21]
    ],

    bitReverseSequence: [0, 4, 2, 6, 1, 5, 3, 7],
    standardSequence: [0, 1, 2, 3, 4, 5, 6, 7],
    quadrantSequence: [0, 3, 1, 2, 4, 7, 5, 6],

    /**
     * Generates a coordinate for a Hilbert curve at index i with order n.
     */
    getHilbert(i, n) {
        let pts = [{x:0, y:0}, {x:0, y:1}, {x:1, y:1}, {x:1, y:0}];
        let index = i & 3;
        let v = { x: pts[index].x, y: pts[index].y };
        for (let j = 1; j < n; j++) {
            i = i >>> 2;
            index = i & 3;
            let len = Math.pow(2, j);
            if (index === 0) {
                let temp = v.x;
                v.x = v.y;
                v.y = temp;
            } else if (index === 1) {
                v.y += len;
            } else if (index === 2) {
                v.x += len;
                v.y += len;
            } else if (index === 3) {
                let temp = len - 1 - v.x;
                v.x = len - 1 - v.y;
                v.y = temp;
                v.x += len;
            }
        }
        return v;
    },

    getBucket(x, y, mode, gridSize) {
        if (mode === 'quadrant') {
            const half = gridSize / 2;
            let q = (x < half && y < half) ? 0 : 
                    (x >= half && y >= half) ? 3 : 
                    (x >= half && y < half) ? 1 : 2;
            const sub = (x + y) % 2; 
            return q + (sub * 4); 
        }
        return Math.floor(this.M8[y % 8][x % 8] / 8);
    },

    /**
     * Main entry point for generating scan paths.
     * @returns {Array} List of {x, y} coordinates.
     */
    generatePath(mode, gridSize, bucketIdx = 0) {
        let path = [];
        
        if (mode === 'horizontal' || mode === 'raster-uni') {
            // Scan Top to Bottom (y=0 to gridSize-1)
            // Scan each line Left to Right (x=0 to gridSize-1)
            // Pushing in reverse order so pop() gives the correct start
            for (let y = gridSize - 1; y >= 0; y--) {
                for (let x = gridSize - 1; x >= 0; x--) path.push({x, y});
            }
        } else if (mode === 'raster-bi') {
            // Scan Top to Bottom
            for (let y = gridSize - 1; y >= 0; y--) {
                const isEvenLine = (y % 2 === 0);
                if (isEvenLine) {
                    // Line 0, 2, 4...: Scan Left to Right (push 39...0)
                    for (let x = gridSize - 1; x >= 0; x--) path.push({x, y});
                } else {
                    // Line 1, 3, 5...: Scan Right to Left (push 0...39)
                    for (let x = 0; x < gridSize; x++) path.push({x, y});
                }
            }
        } else if (mode === 'crosshatch-uni' || mode === 'crosshatch-bi') {
            // Horizontal Pass (Rows)
            const subMode = mode === 'crosshatch-uni' ? 'raster-uni' : 'raster-bi';
            const pass1 = this.generatePath(subMode, gridSize);
            
            // Vertical Pass (Columns) - Left to Right progression
            const pass2 = [];
            // We want x=0 column first, then x=1...
            // So we push x=39 column first, then x=38...
            for (let x = gridSize - 1; x >= 0; x--) {
                const isEvenCol = (x % 2 === 0);
                if (mode === 'crosshatch-bi' && !isEvenCol) {
                    // Bi-directional Vertical: Odd columns Bottom to Top (push 0...39)
                    for (let y = 0; y < gridSize; y++) pass2.push({x, y});
                } else {
                    // Even columns (and all Uni columns): Top to Bottom (push 39...0)
                    for (let y = gridSize - 1; y >= 0; y--) pass2.push({x, y});
                }
            }
            
            // Per user request: Horizontal Pass FIRST.
            // Since we pop() from the end, pass1 (Horizontal) must be at the END.
            path = pass2.concat(pass1); 
        } else if (mode === 'diagonal') {
            let temp = [];
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) temp.push({x, y, dist: x + y});
            }
            temp.sort((a, b) => b.dist - a.dist);
            path = temp;
        } else if (mode === 'triphase') {
            let allCells = [];
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    let d = x - y;
                    let phase = (d === 0) ? 0 : (d < 0) ? 1 : 2;
                    allCells.push({x, y, d, phase});
                }
            }
            allCells.sort((a, b) => {
                if (a.phase !== b.phase) return b.phase - a.phase;
                if (a.phase === 1) {
                    if (a.d !== b.d) return a.d - b.d;
                } else if (a.phase === 2) {
                    if (a.d !== b.d) return a.d - b.d;
                }
                return b.x - a.x;
            });
            path = allCells;
        } else if (mode === 'hilbert') {
            const order = Math.ceil(Math.log2(gridSize));
            const total = Math.pow(2, order) * Math.pow(2, order);
            for (let i = 0; i < total; i++) {
                let p = this.getHilbert(i, order);
                if (p.x < gridSize && p.y < gridSize) {
                    path.push(p);
                }
            }
            path.reverse(); 
        } else {
            // Stochastic / Bucket Modes
            let seq = (mode === 'quadrant') ? this.quadrantSequence : 
                     (mode === 'dispersive') ? this.bitReverseSequence : this.standardSequence;
            
            if (bucketIdx >= seq.length) return [];
            
            const targetBucket = seq[bucketIdx];
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    if (this.getBucket(x, y, mode, gridSize) === targetBucket) {
                        path.push({x, y});
                    }
                }
            }
            // Randomize within bucket
            path.sort(() => Math.random() - 0.5);
        }
        
        return path;
    }
};

/**
 * OxidePhysics.js
 * V-ALPHA-059: High-Fidelity Spectral Purity Model.
 * Physically synchronized color engine with D65 normalization and contrast stretching.
 */
class OxidePhysics {
    constructor() {
        // CIE 1931 2° standard observer
        this.CMF_X = [0.0014, 0.0042, 0.0143, 0.0435, 0.1344, 0.2839, 0.3483, 0.3362, 0.2908, 0.1954, 0.0956, 0.0320, 0.0049, 0.0093, 0.0633, 0.1655, 0.2904, 0.4334, 0.5945, 0.7621, 0.9163, 1.0263, 1.0622, 1.0026, 0.8544, 0.6424, 0.4479, 0.2835, 0.1649, 0.0874, 0.0468, 0.0227, 0.0114, 0.0058, 0.0029, 0.0014];
        this.CMF_Y = [0.0000, 0.0001, 0.0004, 0.0012, 0.0040, 0.0116, 0.0230, 0.0380, 0.0600, 0.0910, 0.1390, 0.2080, 0.3230, 0.5030, 0.7100, 0.8620, 0.9540, 0.9950, 0.9950, 0.9520, 0.8700, 0.7570, 0.6310, 0.5030, 0.3810, 0.2650, 0.1750, 0.1070, 0.0610, 0.0320, 0.0170, 0.0082, 0.0041, 0.0021, 0.0010, 0.0005];
        this.CMF_Z = [0.0065, 0.0201, 0.0679, 0.2074, 0.6456, 1.3856, 1.7471, 1.7721, 1.6692, 1.2876, 0.8130, 0.4652, 0.2720, 0.1582, 0.0782, 0.0422, 0.0203, 0.0087, 0.0037, 0.0021, 0.0017, 0.0011, 0.0008, 0.0003, 0.0002, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000];
        this.D65 = [49.9, 54.6, 82.8, 91.5, 93.4, 86.7, 104.9, 117.0, 117.8, 114.9, 115.9, 108.8, 109.4, 107.8, 104.8, 107.7, 104.4, 104.0, 100.0, 96.3, 95.8, 88.7, 90.0, 89.6, 87.7, 83.3, 83.7, 80.0, 80.2, 82.3, 78.3, 69.7, 71.6, 74.3, 61.6, 69.9];

        this.STOPS = [
            { nm: 0, name: 'Polished Silver' },
            { nm: 20, name: 'White Gap' },
            { nm: 35, name: 'Straw' },
            { nm: 48, name: 'Gold' },
            { nm: 55, name: 'Rose/Red' },
            { nm: 62, name: 'Purple' },
            { nm: 85, name: 'Deep Blue' },
            { nm: 110, name: 'Cyan' },
            { nm: 135, name: '2nd Order Gold' },
            { nm: 165, name: '2nd Order Rose' },
            { nm: 195, name: '2nd Order Blue' },
            { nm: 250, name: 'Matte Grey' }
        ];

        this.definitions = {
            'OPD': { title: 'Optical Path Difference', body: 'The extra distance (2nd) traveled by light reflecting off the substrate. When this matches λ, that color is reinforced.' },
            'Cr₂O₃': { title: 'Chromium Oxide', body: 'The transparent ceramic film that forms on SS304. It has a high refractive index (n=2.3) and acts as the interference medium.' },
            'White Gap': { title: 'White Gap (~20nm)', body: 'The point where interference is still in the UV, resulting in a flat, silvery visible spectrum before the first straw colors emerge.' },
            'n=2.3': { title: 'Refractive Index', body: 'Light slows down in the oxide by a factor of 2.3, making the optical thickness greater than the physical thickness.' },
            '½λ phase flip': { title: 'Phase Inversion', body: 'Light reflects off the oxide and the steel substrate with 180° flips. These cancel, meaning reinforcement occurs at exactly 2nd = mλ.' },
            'Chromium Depletion': { title: 'Sensitization Zone', body: 'Chromium pulled from the steel to grow the oxide. Depletion leads to loss of corrosion resistance.' }
        };

        // Precompute canonical RGB targets based entirely on simulation ground truth
        for (let stop of this.STOPS) {
            const [r, g, b] = this._simulateRGB(stop.nm);
            stop.rgb = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        }
    }

    getReflectance(lam, d) {
        if (d <= 0) return 0.28;
        const n = 2.3, delta = 4 * Math.PI * n * d / lam;
        const r1 = 0.42, r2 = 0.58, r12 = r1 * r2;
        return (r1 * r1 + r2 * r2 + 2 * r12 * Math.cos(delta)) / (1 + r1 * r1 * r2 * r2 + 2 * r12 * Math.cos(delta));
    }

    _simulateRGB(nm) {
        let X = 0, Y = 0, Z = 0, Yw = 0;
        let minI = 1, maxI = 0;
        const spec = [];
        for (let i = 0; i < 36; i++) {
            const lam = 380 + i * 10;
            const I = this.getReflectance(lam, nm);
            spec.push(I);
            if (I < minI) minI = I;
            if (I > maxI) maxI = I;
        }

        for (let i = 0; i < 36; i++) {
            const stretch = (spec[i] - minI) / (maxI - minI + 0.001);
            let I = Math.pow(stretch, 2.0);
            const S = this.D65[i];
            X += I * S * this.CMF_X[i]; Y += I * S * this.CMF_Y[i]; Z += I * S * this.CMF_Z[i];
            Yw += S * this.CMF_Y[i];
        }

        X /= Yw; Y /= Yw; Z /= Yw;
        let rl = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
        let gl = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
        let bl = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
        const gc = v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055;

        let r = Math.max(0, Math.min(1, gc(rl))), g = Math.max(0, Math.min(1, gc(gl))), b = Math.max(0, Math.min(1, gc(bl)));

        r = Math.pow(r, 2.5);
        g = Math.pow(g, 2.5);
        b = Math.pow(b, 2.5);
        return [r, g, b];
    }

    getColor(nm, ra = 0) {
        let [r, g, b] = this._simulateRGB(nm);

        if (ra > 0.2) {
            const fade = Math.min(1, (ra - 0.2) / 0.3);
            const gray = (r + g + b) / 3 * 0.8;
            r = r * (1 - fade) + gray * fade; g = g * (1 - fade) + gray * fade; b = b * (1 - fade) + gray * fade;
        }
        if (ra > 0.5) {
            const char = Math.min(1, (ra - 0.5) / 0.3);
            const charredR = 0.2, charredG = 0.15, charredB = 0.1;
            r = r * (1 - char) + charredR * char; g = g * (1 - char) + charredG * char; b = b * (1 - char) + charredB * char;
        }
        if (ra > 0.8) {
            const slag = Math.min(1, (ra - 0.8) / 0.2);
            r *= (1 - slag); g *= (1 - slag); b *= (1 - slag);
        }

        const rgb = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];

        // Map to standard name strictly based on shortest RGB color distance
        let name = 'Radiant';
        if (ra > 0.8) name = 'Black Slag';
        else if (ra > 0.5) name = 'Charred Matte';
        else {
            let minDist = Infinity;
            for (let stop of this.STOPS) {
                const dr = rgb[0] - stop.rgb[0];
                const dg = rgb[1] - stop.rgb[1];
                const db = rgb[2] - stop.rgb[2];
                // Simple Euclidean distance in sRGB
                const dist = dr * dr + dg * dg + db * db;
                if (dist < minDist) {
                    minDist = dist;
                    name = stop.name;
                }
            }
        }
        return { css: `rgb(${rgb.join(',')})`, name, rgb };
    }

    arrowLine(ctx, x1, y1, x2, y2, color, dashed) {
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        if (dashed) ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.setLineDash([]);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        ctx.fillStyle = color;
        ctx.translate(x2, y2); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    renderSideView(ctx, config) {
        const { w, h, nm, ra } = config;
        ctx.clearRect(0, 0, w, h);
        const dW = Math.round(w * 0.52), pad = 10;
        const steelH = Math.round((h - pad * 2) * 0.38), oxH = Math.max(6, Math.round(nm / 200 * 60) + 6);
        const airH = h - pad * 2 - steelH - oxH, yAirTop = pad, yOx = yAirTop + airH, ySt = yOx + oxH;

        ctx.fillStyle = '#06060d'; ctx.fillRect(pad, yAirTop, dW - pad * 2, airH);
        ctx.fillStyle = ra < 0.5 ? 'rgba(18,80,48,0.75)' : 'rgba(40,40,45,0.85)';
        ctx.beginPath(); ctx.moveTo(pad, yOx);
        for (let i = 0; i <= 40; i++) {
            const px = pad + (i * (dW - pad * 2) / 40);
            ctx.lineTo(px, yOx + (Math.random() - 0.5) * ra * 25);
        }
        ctx.lineTo(dW - pad, yOx + oxH); ctx.lineTo(pad, yOx + oxH); ctx.closePath(); ctx.fill();

        const depletionDepth = (nm / 400 * 40) + (ra * 20);
        ctx.fillStyle = '#222228'; ctx.fillRect(pad, ySt, dW - pad * 2, steelH);
        const grad = ctx.createLinearGradient(0, ySt, 0, ySt + depletionDepth);
        grad.addColorStop(0, 'rgba(180, 80, 40, ' + Math.min(0.7, ra + nm / 600) + ')'); grad.addColorStop(1, 'rgba(34, 34, 40, 0)');
        ctx.fillStyle = grad; ctx.fillRect(pad, ySt, dW - pad * 2, depletionDepth);

        const ANG_I = 30 * Math.PI / 180, TAN_I = Math.tan(ANG_I), TAN_T = Math.tan(Math.asin(Math.sin(ANG_I) / 2.3));
        const incHitX = Math.round(dW * 0.34), rayAirLen = Math.min(airH - 14, 88);
        const incStartX = incHitX - Math.round(TAN_I * rayAirLen), incStartY = yOx - rayAirLen;
        this.arrowLine(ctx, incStartX, incStartY, incHitX, yOx - 1, 'rgba(255,255,255,0.70)', false);
        this.arrowLine(ctx, incHitX, yOx, incHitX + Math.round(TAN_I * rayAirLen), incStartY, ra > 0.5 ? 'rgba(232,160,48,0.3)' : '#e8a030', ra > 0.4);
        const r2MidX = incHitX + Math.round(TAN_T * oxH), r2ExitX = incHitX + Math.round(TAN_T * oxH * 2);
        this.arrowLine(ctx, incHitX, yOx, r2MidX, ySt, '#5598e8', false);
        this.arrowLine(ctx, r2MidX, ySt, r2ExitX, yOx, '#5598e8', false);
        this.arrowLine(ctx, r2ExitX, yOx, r2ExitX + Math.round(TAN_I * rayAirLen), incStartY, '#5598e8', ra > 0.4);

        ctx.font = '8px SF Mono'; ctx.textAlign = 'right'; ctx.fillStyle = '#888899';
        ctx.fillText('air (n=1.0)', dW - pad - 5, yAirTop + 15);
        ctx.fillStyle = '#4ade80'; ctx.fillText('Cr₂O₃ (n=2.3)', dW - pad - 5, yOx + oxH / 2 + 3);
        ctx.fillStyle = '#a78bfa'; ctx.fillText('Cr Depletion', dW - pad - 5, ySt + 12);
        ctx.fillStyle = '#aaaabb'; ctx.fillText('SS304 steel', dW - pad - 5, ySt + steelH - 5);
        if (oxH >= 10) {
            const bx = Math.min(r2ExitX + 10, dW - pad - 10);
            ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(bx, yOx); ctx.lineTo(bx, ySt); ctx.stroke();
            ctx.setLineDash([]); ctx.fillStyle = '#4ade80'; ctx.fillText('OPD', bx + 5, yOx + oxH / 2 + 3);
        }
    }
}

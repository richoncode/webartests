const GROWTH_SCALE_A = 5.0e8;
const ACTIVATION_ENERGY_Q = 10000;
const OXIDATION_FLOOR = 200;
const MAX_OXIDE_CAP = 300;

function calculateState(targetMaxWatt, targetPct, targetAmbient, targetAbsorptivity, targetIrPenalty, targetBlanket) {
    const appliedPower = targetMaxWatt * (targetPct / 100);
    const durationSec = 0.001; 
    
    // Core bare-metal thermal coupling
    const baseDeltaT = (appliedPower * targetAbsorptivity) * 3500; 
    const idealPeakTemp = targetAmbient + baseDeltaT;
    const idealActivation = Math.exp(-ACTIVATION_ENERGY_Q / (idealPeakTemp + 273.15));
    const idealOxide = (idealPeakTemp > OXIDATION_FLOOR) ? Math.min(MAX_OXIDE_CAP, GROWTH_SCALE_A * idealActivation * Math.sqrt(durationSec)) : 0;

    let coupling = 1.0;
    if (idealOxide > 35) {
        const d = idealOxide - 35;
        /** 
         * SPLINE COUPLING
         * We need to add resistance at 50nm (Purple) but allow efficiency to recover for Blue/Green.
         * The 'targetIrPenalty' will define the amplitude of the Purple peak.
         * The 'targetBlanket' will define the efficiency recovery at Green.
         */
        const gaussianPeak = Math.exp(-Math.pow(d - 15, 2) / 50); // Sharp peak at 50nm
        const penalty = (targetIrPenalty || 0) * gaussianPeak;
        
        const recovery = (targetBlanket || 0) * (d / 70); // Linear recovery towards Green
        coupling = (1 - penalty) + recovery;
    }
    
    const peakTemp = targetAmbient + baseDeltaT * coupling;
    const activation = Math.exp(-ACTIVATION_ENERGY_Q / (peakTemp + 273.15));
    const oxideThickness = (peakTemp > OXIDATION_FLOOR) ? Math.min(MAX_OXIDE_CAP, GROWTH_SCALE_A * activation * Math.sqrt(durationSec)) : 0;
    
    return { oxideThickness, peakTemp };
}

function getRequiredPower(targetNm, abs, penalty, blanket) {
    let low = 0, high = 100;
    for(let i=0; i<50; i++) {
        let mid = (low + high) / 2;
        const res = calculateState(5, mid, 20, abs, penalty, blanket);
        if (res.oxideThickness > targetNm) high = mid; else low = mid;
    }
    return low;
}

// 1. Step 1: Absorptivity (Brown 35nm @ 12%)
let lowA = 0.01, highA = 1.0;
for(let i=0; i<50; i++) {
    let mid = (lowA + highA) / 2;
    const res = calculateState(5, 12, 20, mid, 0, 0);
    if (res.oxideThickness > 35) highA = mid; else lowA = mid;
}
const finalAbs = lowA;

// 2. Step 2: IR Mirror Penalty (Purple 50nm @ 14%)
let lowP = 0, highP = 1.0;
for(let i=0; i<50; i++) {
    let mid = (lowP + highP) / 2;
    const pwr = getRequiredPower(50, finalAbs, mid, 0);
    if (pwr < 14) lowP = mid; else highP = mid;
}
const finalPenalty = lowP;

// 3. Step 3: Oxide Blanket (Green 105nm @ 17%)
let lowB = -1.0, highB = 1.0; // Allow negative for initial balancing
for(let i=0; i<50; i++) {
    let mid = (lowB + highB) / 2;
    const pwr = getRequiredPower(105, finalAbs, finalPenalty, mid);
    if (pwr > 17) lowB = mid; else highB = mid;
}
const finalBlanket = lowB;

console.log(`Calibrated Parameters: Abs=${finalAbs.toFixed(4)} Pen=${finalPenalty.toFixed(4)} Blk=${finalBlanket.toFixed(4)}`);

[
    { label: 'Brown', nm: 35, obs: 12 },
    { label: 'Purple', nm: 50, obs: 14 },
    { label: 'Blue', nm: 65, obs: 15 },
    { label: 'Green', nm: 105, obs: 17 }
].forEach(t => {
    const calc = getRequiredPower(t.nm, finalAbs, finalPenalty, finalBlanket);
    console.log(`${t.label}: Observed ${t.obs}%, Computed ${calc.toFixed(3)}%, Error ${(calc - t.obs).toFixed(4)}%`);
});

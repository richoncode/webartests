const DENSITY = 8.0e-3;
const SPECIFIC_HEAT = 0.5;
const THERMAL_CONDUCTIVITY = 0.016;
const THERMAL_DIFFUSIVITY = 0.016 / (8.0e-3 * 0.5);
const ACTIVATION_ENERGY_Q = 10000;
const GROWTH_SCALE_A = 5.0e8;
const ABLATION_TEMP = 2800;
const OXIDATION_FLOOR = 200;
const MAX_OXIDE_CAP = 300;

function calculateState(targetMaxWatt, targetPct, targetBeamSize, targetDurationUs, targetAmbient, targetAbsorptivity, targetPlateThickness, targetIrPenalty, targetBlanket) {
    const appliedPower = targetMaxWatt * (targetPct / 100);
    const durationSec = targetDurationUs / 1000000;
    const absorbedPower = appliedPower * targetAbsorptivity;
    const diffusionDepth = Math.sqrt(4 * THERMAL_DIFFUSIVITY * durationSec);
    const r_beam = targetBeamSize / 2;
    const k = THERMAL_CONDUCTIVITY;
    const idealDeltaT = (absorbedPower) / (k * r_beam * Math.sqrt(Math.PI)) * Math.atan(diffusionDepth / r_beam);
    
    const idealActivation = Math.exp(-ACTIVATION_ENERGY_Q / (targetAmbient + idealDeltaT + 273.15));
    const idealOxide = (targetAmbient + idealDeltaT > OXIDATION_FLOOR) ? Math.min(MAX_OXIDE_CAP, GROWTH_SCALE_A * idealActivation * Math.sqrt(durationSec)) : 0;

    let deltaT = idealDeltaT;
    if (idealOxide > 35) {
        const excessOxide = idealOxide - 35;
        const midPoint = 15; 
        const sigmoid = 1 / (1 + Math.exp(-0.5 * (excessOxide - midPoint)));
        const penaltyFactor = 1 - ((targetIrPenalty || 0) * sigmoid);
        const insulationFactor = 1 + (excessOxide * (targetBlanket || 0) * 0.015);
        deltaT = idealDeltaT * Math.max(0.05, penaltyFactor) * insulationFactor;
    }
    
    let peakTemp = targetAmbient + deltaT;
    if (peakTemp > ABLATION_TEMP) peakTemp = ABLATION_TEMP;

    let oxideThickness = 0;
    if (peakTemp > OXIDATION_FLOOR) {
        const activation = Math.exp(-ACTIVATION_ENERGY_Q / (peakTemp + 273.15));
        oxideThickness = Math.min(MAX_OXIDE_CAP, GROWTH_SCALE_A * activation * Math.sqrt(durationSec));
    }
    return { oxideThickness, isAblated: peakTemp >= ABLATION_TEMP };
}

function getRequiredPower(targetNm, maxWatt, beamSize, duration, ambient, abs, thickness, penalty, blanket) {
    let low = 0, high = 100;
    for(let i=0; i<30; i++) {
        let mid = (low + high) / 2;
        const res = calculateState(maxWatt, mid, beamSize, duration, ambient, abs, thickness, penalty, blanket);
        if (res.isAblated || res.oxideThickness > targetNm) high = mid; else low = mid;
    }
    return low;
}

const maxWatt = 5, beamSize = 0.030, duration = 1000, ambient = 20, thickness = 0.4;

let lowA = 0.01, highA = 1.0;
for(let i=0; i<30; i++) {
    let mid = (lowA + highA) / 2;
    const res = calculateState(maxWatt, 12, beamSize, duration, ambient, mid, thickness, 0, 0);
    if (res.isAblated || res.oxideThickness > 35) highA = mid; else lowA = mid;
}
const finalAbs = lowA;

let lowP = 0, highP = 1.0;
for(let i=0; i<30; i++) {
    let mid = (lowP + highP) / 2;
    const pwr = getRequiredPower(50, maxWatt, beamSize, duration, ambient, finalAbs, thickness, mid, 0);
    if (pwr < 14) lowP = mid; else highP = mid;
}
const finalPenalty = lowP;

let lowB = 0, highB = 10;
for(let i=0; i<30; i++) {
    let mid = (lowB + highB) / 2;
    const pwr = getRequiredPower(105, maxWatt, beamSize, duration, ambient, finalAbs, thickness, finalPenalty, mid);
    if (pwr > 17) lowB = mid; else highB = mid;
}
const finalBlanket = lowB;

const targets = [
    { label: 'Brown', nm: 35, obs: 12 },
    { label: 'Purple', nm: 50, obs: 14 },
    { label: 'Blue', nm: 65, obs: 15 },
    { label: 'Green', nm: 105, obs: 17 }
];

targets.forEach(t => {
    const calc = getRequiredPower(t.nm, maxWatt, beamSize, duration, ambient, finalAbs, thickness, finalPenalty, finalBlanket);
    const err = calc - t.obs;
    console.log(`${t.label}: Observed ${t.obs}%, Computed ${calc.toFixed(3)}%, Error ${err.toFixed(4)}%`);
});

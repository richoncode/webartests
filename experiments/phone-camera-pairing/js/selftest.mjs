import { eigenSymmetric, imagePlaneAccel, phonePlaneAccel, splitGravity } from './plane.js';
import { compareGestures, dtwCost, pearson, syntheticPair } from './dtw.js';
import { parsePhoneBundle, phoneBundle } from './buffer.js';
import { packSdp, unpackSdp } from './signal.js';

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function corr(a, b) {
  return pearson(a, b);
}

const diagonal = eigenSymmetric([
  [2, 0, 0],
  [0, 5, 0],
  [0, 0, 1],
]);
assert(Math.abs(diagonal.values[0] - 5) < 1e-6, 'eigenvalue 5, got ' + diagonal.values);
assert(Math.abs(diagonal.values[1] - 2) < 1e-6, 'eigenvalue 2');
assert(Math.abs(diagonal.values[2] - 1) < 1e-6, 'eigenvalue 1');

const tilted = eigenSymmetric([
  [2, 0.4, 0],
  [0.4, 3, -0.2],
  [0, -0.2, 1],
]);
const rebuilt = [0, 1, 2].map(() => [0, 0, 0]);
for (let k = 0; k < 3; k += 1) {
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      rebuilt[i][j] += tilted.values[k] * tilted.vectors[k][i] * tilted.vectors[k][j];
    }
  }
}
const original = [
  [2, 0.4, 0],
  [0.4, 3, -0.2],
  [0, -0.2, 1],
];
for (let i = 0; i < 3; i += 1) {
  for (let j = 0; j < 3; j += 1) {
    assert(Math.abs(rebuilt[i][j] - original[i][j]) < 1e-6, 'eigen rebuild ' + i + ',' + j);
  }
}

const gravitySplit = [];
for (let i = 0; i < 180; i += 1) {
  const t = (i * 1000) / 60;
  const s = t / 1000;
  gravitySplit.push({
    t,
    ax: 3 * Math.sin(2 * Math.PI * s),
    ay: 0.2,
    az: 9.81,
    lax: null,
    lay: null,
    laz: null,
  });
}
const split = splitGravity(gravitySplit);
const tail = split.linear.filter((s) => s.t > 1200);
const az = tail.map((s) => s.z);
const ax = tail.map((s) => s.x);
const azRms = Math.sqrt(az.reduce((sum, v) => sum + v * v, 0) / az.length);
assert(azRms < 0.45, 'gravity leak on Z ' + azRms);
// A 1 Hz wave through a 0.45s gravity filter keeps its shape with a small phase lag.
assert(corr(ax, tail.map((s) => 3 * Math.sin((2 * Math.PI * s.t) / 1000))) > 0.9, 'high-pass kept the sine');

const positions = [];
for (let i = 0; i < 120; i += 1) {
  const t = (i * 1000) / 60;
  const s = t / 1000;
  const omega = 2 * Math.PI * 1;
  positions.push({ t, x: 0.15 * Math.sin(omega * s), y: 0 });
}
const derived = imagePlaneAccel(positions);
const mid = derived.filter((s) => s.t > 400 && s.t < 1600);
const expect = mid.map((s) => -0.15 * omegaSq(s.t));
function omegaSq(t) {
  const omega = 2 * Math.PI;
  return omega * omega * Math.sin(omega * (t / 1000));
}
assert(corr(mid.map((s) => s.x), expect) > 0.95, 'second derivative shape ' + corr(mid.map((s) => s.x), expect));

const { phone, camera, decoy } = syntheticPair();
const aligned = phonePlaneAccel(phone);
assert(aligned.zEnergy < 0.2, 'Z was not minimized, energy ' + aligned.zEnergy);
assert(aligned.inPlane > 0.8, 'in-plane fraction ' + aligned.inPlane);

const match = compareGestures(phone, camera, { pick: 'energetic' });
const miss = compareGestures(decoy, camera, { pick: 'energetic' });
console.log('match', JSON.stringify({ dtw: match.dtw, corr: match.corr, paired: match.paired, z: match.zEnergy, angle: match.angleDeg }));
console.log('decoy', JSON.stringify({ dtw: miss.dtw, corr: miss.corr, paired: miss.paired }));
assert(match.ok && match.paired, 'synthetic gesture should pair');
assert(miss.ok && !miss.paired, 'decoy gesture should not pair');
assert(match.dtw < miss.dtw - 0.2, 'match DTW should beat the decoy');

const flat = compareGestures(
  phone.map((s) => ({ ...s, ax: 0, ay: 9.81, az: 0, lax: 0, lay: 0, laz: 0 })),
  camera,
  { pick: 'energetic' },
);
assert(!flat.paired && flat.reason === 'too-still', 'still phone should refuse, got ' + flat.reason);

const bundle = phoneBundle(phone);
const parsed = parsePhoneBundle(JSON.stringify(bundle));
assert(parsed.length === phone.length, 'bundle roundtrip length');
assert(Math.abs(parsed[10].lax - bundle.samples[10].lax) < 1e-9, 'bundle keeps linear accel');
let rejected = false;
try {
  parsePhoneBundle(JSON.stringify({ source: 'camera-track', samples: [{ t: 0, x: 1, y: 1 }] }));
} catch {
  rejected = true;
}
assert(rejected, 'camera bundle must not import as phone');

const identical = dtwCost(
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
);
assert(identical < 0.02, 'identical series DTW ' + identical);

const fakeSdp = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\n' + 'a=x:' + 'abc123'.repeat(80) + '\r\n';
const token = await packSdp(fakeSdp);
const unpacked = await unpackSdp('A.' + token);
assert(unpacked === fakeSdp, 'SDP pack roundtrip');
assert(token.startsWith('z.') || token.startsWith('r.'), 'token prefix');
console.log('sdp token', token.length, 'chars from', fakeSdp.length);
console.log('selftest ok');

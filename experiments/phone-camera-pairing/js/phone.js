import { createRing, phoneBundle } from './buffer.js';
import { MATCH, reasonText } from './dtw.js';
import { phonePlaneAccel } from './plane.js';
import { column, drawChart } from './plot.js';
import { drawQr } from './qr.js';
import { createPhoneSession } from './signal.js';
import { $, armFlash, copyText, download, fmt, round } from './ui.js';

const ring = createRing(30000);
const remoteCam = [];
let listening = false;
let sawAccel = false;
let eventCount = 0;
let nullCount = 0;
let t0 = 0;
let session = null;
let pending = [];
let watchdog = 0;
const setFlash = armFlash($('flash'));
let pairedOn = false;

function setBadge(text, kind) {
  const node = $('sensorState');
  node.textContent = text;
  node.className = 'badge ' + (kind || '');
}

function setPaired(on) {
  pairedOn = on;
  $('pairedPill').hidden = !on;
  setFlash(on);
}

function offerFromLocation() {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  if (!hash) return '';
  const params = new URLSearchParams(hash);
  if (params.get('o')) return params.get('o');
  if (hash.startsWith('z.') || hash.startsWith('r.') || hash.startsWith('A.')) return hash;
  return '';
}

function onMotion(event) {
  eventCount += 1;
  const withG = event.accelerationIncludingGravity;
  const linear = event.acceleration;
  const gyro = event.rotationRate;
  const ax = withG && Number.isFinite(withG.x) ? withG.x : null;
  const ay = withG && Number.isFinite(withG.y) ? withG.y : null;
  const az = withG && Number.isFinite(withG.z) ? withG.z : null;
  if (ax == null || ay == null || az == null) {
    nullCount += 1;
    return;
  }
  if (!sawAccel) {
    sawAccel = true;
    t0 = performance.now();
    setBadge('Sensors live', 'ok');
    $('enable').textContent = 'Sensors on';
  }
  const sample = {
    t: performance.now(),
    ax,
    ay,
    az,
    lax: linear && Number.isFinite(linear.x) ? linear.x : null,
    lay: linear && Number.isFinite(linear.y) ? linear.y : null,
    laz: linear && Number.isFinite(linear.z) ? linear.z : null,
    gx: gyro && Number.isFinite(gyro.alpha) ? gyro.alpha : null,
    gy: gyro && Number.isFinite(gyro.beta) ? gyro.beta : null,
    gz: gyro && Number.isFinite(gyro.gamma) ? gyro.gamma : null,
  };
  ring.push(sample);
  pending.push([
    Math.round(sample.t - t0),
    round(sample.ax),
    round(sample.ay),
    round(sample.az),
    round(sample.lax),
    round(sample.lay),
    round(sample.laz),
    round(sample.gx),
    round(sample.gy),
    round(sample.gz),
  ]);
  if (pending.length > 60) pending.splice(0, pending.length - 60);
}

async function enableSensors() {
  $('enable').disabled = true;
  setBadge('Requesting motion access…', 'wait');
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const state = await DeviceMotionEvent.requestPermission();
      if (state !== 'granted') {
        setBadge('Permission denied', 'bad');
        $('sensorNote').textContent = 'iOS will not share motion until Motion & Fitness access is allowed for this site.';
        $('enable').disabled = false;
        return;
      }
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { await DeviceOrientationEvent.requestPermission(); } catch { /* motion can still arrive */ }
    }
  } catch (err) {
    setBadge('Permission failed', 'bad');
    $('sensorNote').textContent = err.message || 'Motion permission failed.';
    $('enable').disabled = false;
    return;
  }
  if (typeof DeviceMotionEvent === 'undefined') {
    setBadge('No motion API', 'bad');
    $('sensorNote').textContent = 'This browser has no DeviceMotion API. Open the page on a phone.';
    $('enable').disabled = false;
    return;
  }
  if (!listening) {
    window.addEventListener('devicemotion', onMotion);
    listening = true;
  }
  setBadge('Waiting for the first sample…', 'wait');
  $('enable').textContent = 'Waiting…';
  clearTimeout(watchdog);
  watchdog = setTimeout(() => {
    if (sawAccel) return;
    $('enable').disabled = false;
    $('enable').textContent = 'Enable sensors';
    if (eventCount > 0 && nullCount === eventCount) {
      setBadge('No accelerometer', 'bad');
      $('sensorNote').textContent = 'Motion events have no acceleration values. Open this page on a phone over HTTPS.';
      return;
    }
    setBadge('No samples', 'bad');
    $('sensorNote').textContent = 'Nothing arrived. iOS shares motion on HTTPS after you allow it. A laptop often has no accelerometer.';
  }, 1600);
}

function paint() {
  const samples = ring.samples();
  $('ax').textContent = fmt(samples.at(-1)?.ax);
  $('ay').textContent = fmt(samples.at(-1)?.ay);
  $('az').textContent = fmt(samples.at(-1)?.az);
  $('lax').textContent = fmt(samples.at(-1)?.lax);
  $('lay').textContent = fmt(samples.at(-1)?.lay);
  $('laz').textContent = fmt(samples.at(-1)?.laz);
  $('gx').textContent = fmt(samples.at(-1)?.gx);
  $('gy').textContent = fmt(samples.at(-1)?.gy);
  $('gz').textContent = fmt(samples.at(-1)?.gz);
  const dur = ring.duration();
  $('count').textContent = String(samples.length);
  $('duration').textContent = (dur / 1000).toFixed(1) + 's';
  $('rate').textContent = dur > 200 ? ring.rate().toFixed(0) + ' Hz' : '—';

  const recent = samples.slice(-240);
  drawChart($('accPlot'), [
    { name: 'ax', color: '#e07070', values: column(recent, 'ax', 240) },
    { name: 'ay', color: '#a0c060', values: column(recent, 'ay', 240) },
    { name: 'az', color: '#5b9bd5', values: column(recent, 'az', 240) },
  ], { empty: 'Acceleration shows up after you enable sensors and move.' });
  drawChart($('gyroPlot'), [
    { name: 'α', color: '#e07070', values: column(recent, 'gx', 240) },
    { name: 'β', color: '#a0c060', values: column(recent, 'gy', 240) },
    { name: 'γ', color: '#5b9bd5', values: column(recent, 'gz', 240) },
  ], { empty: 'Gyro shows up when the device reports a rotation rate.' });

  const plane = phonePlaneAccel(ring.last(4000));
  const planeSamples = plane.series.slice(-240);
  drawChart($('planePlot'), [
    { name: 'plane x', color: '#5b9bd5', values: column(planeSamples, 'x', 240) },
    { name: 'plane y', color: '#4caf50', values: column(planeSamples, 'y', 240) },
  ], { empty: 'Plane-aligned acceleration appears once there is a gesture.' });
  $('planeFit').textContent = plane.series.length > 12 && plane.inPlane != null
    ? Math.round(plane.inPlane * 100) + '% of this gesture is in the X,Y plane (Z minimized).'
    : 'Plane fit appears once the phone has been moving for about a second.';

  const body = $('sampleRows');
  const rows = samples.slice(-8).reverse().map((s) => {
    const t = ((s.t - (t0 || s.t)) / 1000).toFixed(2);
    return `<tr><td>${t}</td><td>${fmt(s.ax)}</td><td>${fmt(s.ay)}</td><td>${fmt(s.az)}</td><td>${fmt(s.gx)}</td><td>${fmt(s.gy)}</td><td>${fmt(s.gz)}</td></tr>`;
  });
  body.innerHTML = rows.join('');

  const localMag = plane.series.length
    ? Math.hypot(plane.series.at(-1).x, plane.series.at(-1).y)
    : null;
  drawChart($('dualPlot'), [
    { name: 'phone', color: '#4caf50', values: plane.series.slice(-180).map((s) => Math.hypot(s.x, s.y)) },
    { name: 'camera', color: '#5b9bd5', values: remoteCam.slice(-180) },
  ], { normalize: true, empty: localMag == null ? 'Move the phone to draw its trail.' : 'Camera trail appears when the laptop link is open.' });

  requestAnimationFrame(paint);
}

function exportBuffer() {
  const samples = ring.samples();
  if (samples.length < 8) {
    $('exportNote').textContent = 'Move the phone for a second, then export.';
    return null;
  }
  return JSON.stringify(phoneBundle(samples));
}

async function onCopy() {
  const json = exportBuffer();
  if (!json) return;
  const ok = await copyText(json);
  $('exportNote').textContent = ok ? 'Copied the buffer. Import it on the camera page.' : 'Clipboard blocked. Use download instead.';
}

function onDownload() {
  const json = exportBuffer();
  if (!json) return;
  download('phone-imu.json', json);
  $('exportNote').textContent = 'Downloaded phone-imu.json.';
}

function linkLabel(state) {
  switch (state) {
    case 'open': return 'Channel open. Move the phone — the laptop is scoring the gesture.';
    case 'connected': return 'Connected. Waiting for the data channel.';
    case 'connecting': return 'Connecting to the laptop…';
    case 'failed': return 'The direct link failed. Same Wi-Fi works best. Export the buffer and import it on the laptop.';
    case 'closed':
    case 'disconnected': return 'Link closed.';
    default: return state || 'Idle';
  }
}

function onHostMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.k === 'cam' && Number.isFinite(msg.ax) && Number.isFinite(msg.ay)) {
    remoteCam.push(Math.hypot(msg.ax, msg.ay));
    if (remoteCam.length > 200) remoteCam.shift();
  }
  if (msg.k === 'score') {
    $('remoteDtw').textContent = fmt(msg.dtw);
    $('remoteCorr').textContent = fmt(msg.corr);
    const paired = !!msg.paired;
    $('scoreNote').textContent = paired
      ? 'The laptop sees the same gesture.'
      : (msg.dtw == null
        ? (reasonText(msg.reason) || 'Scribble across the laptop camera.')
        : 'DTW ' + fmt(msg.dtw) + ' (need ≤ ' + MATCH.maxDtw.toFixed(2) + '), correlation ' + fmt(msg.corr) + '.');
    if (paired !== pairedOn) setPaired(paired);
    else if (paired) $('pairedPill').hidden = false;
    if (!paired) setFlash(false);
  }
}

async function join(token) {
  const cleaned = String(token || '').trim();
  if (!cleaned) {
    $('linkState').textContent = 'Paste the laptop offer first.';
    return;
  }
  if (session) session.close();
  $('linkState').textContent = 'Building the answer…';
  try {
    session = await createPhoneSession(cleaned, {
      onState: (state) => { $('linkState').textContent = linkLabel(state); },
      onMessage: onHostMessage,
    });
    const answer = 'A.' + session.token;
    $('answerToken').value = answer;
    $('answerBox').hidden = false;
    try {
      await drawQr($('answerQr'), answer);
      $('answerQr').hidden = false;
      $('answerHint').textContent = 'Point this code at the laptop camera, or copy the answer and paste it there.';
    } catch {
      $('answerQr').hidden = true;
      $('answerHint').textContent = 'The answer is too dense for a code. Copy it and paste it on the laptop.';
    }
  } catch (err) {
    $('linkState').textContent = err.message || 'Could not join that offer.';
  }
}

$('enable').addEventListener('click', enableSensors);
$('copyBuf').addEventListener('click', onCopy);
$('downloadBuf').addEventListener('click', onDownload);
$('clearBuf').addEventListener('click', () => {
  ring.clear();
  pending = [];
  sawAccel = false;
  t0 = 0;
  $('exportNote').textContent = 'Buffer cleared.';
});
$('joinBtn').addEventListener('click', () => join($('offerPaste').value));
$('copyAnswer').addEventListener('click', async () => {
  const ok = await copyText($('answerToken').value);
  $('answerHint').textContent = ok ? 'Answer copied.' : 'Copy failed — select the answer and copy it manually.';
});

setInterval(() => {
  if (!session || !pending.length) return;
  const batch = pending.slice();
  if (session.send({ k: 'imu', s: batch })) pending.length = 0;
}, 100);

const baked = offerFromLocation();
if (baked) {
  $('sessionBanner').hidden = false;
  $('offerPaste').value = baked;
  join(baked);
}

requestAnimationFrame(paint);

import { cameraBundle, createRing, parsePhoneBundle } from './buffer.js';
import { MATCH, compareGestures, reasonText, syntheticPair } from './dtw.js';
import { imagePlaneAccel, phonePlaneAccel } from './plane.js';
import { column, drawChart } from './plot.js';
import { drawQr } from './qr.js';
import { createHostSession } from './signal.js';
import { $, armFlash, bindToggle, copyText, download, fmt, round } from './ui.js';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const HAND_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_URL = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
};
const POSE_WRIST = { left: 15, right: 16 };
const HAND_FALLBACK = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const POSE_FALLBACK = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
  [27, 29], [27, 31], [28, 30], [28, 32],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
];

const video = $('video');
const overlay = $('overlay');
const ctx = overlay.getContext('2d');
const track = createRing(30000);
const livePhone = createRing(30000);
const trails = { pose: [], hands: [] };
const poseFrames = [];
const handFrames = [];

let mode = 'pose';
let side = 'auto';
let poseKind = 'lite';
let pose = null;
let hand = null;
let poseDelegate = '…';
let handDelegate = '…';
let visionPromise = null;
let poseGen = 0;
let poseReloadPending = false;
let handReloadPending = false;
let lastPoseTs = 0;
let lastHandTs = 0;
let modelError = null;
let session = null;
let scanning = false;
let fillingCams = false;
let signalKind = 'pose';
let wristLock = null;
let handLock = null;
let lastConf = null;
let lastZ = null;
let inferMs = 0;
let fps = 0;
let fpsFrames = 0;
let fpsStamp = performance.now();
let lastPaint = 0;
let lastScore = 0;
let holdUntil = 0;
let statusKey = '';
let poseLinks = POSE_FALLBACK;
let handLinks = HAND_FALLBACK;
const setFlash = armFlash($('flash'));
let pairedOn = false;

function vision() {
  if (!visionPromise) {
    visionPromise = import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/vision_bundle.mjs');
    visionPromise.catch(() => { visionPromise = null; });
  }
  return visionPromise;
}

let filesetPromise = null;
function fileset() {
  if (!filesetPromise) {
    filesetPromise = vision().then(({ FilesetResolver }) => FilesetResolver.forVisionTasks(WASM));
    filesetPromise.catch(() => { filesetPromise = null; });
  }
  return filesetPromise;
}

function linksOf(conn, fallback) {
  if (!conn || !conn.length) return fallback;
  return [...conn].map((item) => (Array.isArray(item) ? item : [item.start, item.end]));
}

async function makeLandmarker(kind, modelPath, delegate, extra) {
  const api = await vision();
  const wasm = await fileset();
  const Factory = kind === 'pose' ? api.PoseLandmarker : api.HandLandmarker;
  const order = delegate ? [delegate] : ['GPU', 'CPU'];
  let last = null;
  for (const choice of order) {
    try {
      const created = await Factory.createFromOptions(wasm, {
        baseOptions: { modelAssetPath: modelPath, delegate: choice },
        runningMode: 'VIDEO',
        ...extra,
      });
      return { created, delegate: choice, links: linksOf(kind === 'pose' ? Factory.POSE_CONNECTIONS : Factory.HAND_CONNECTIONS, kind === 'pose' ? POSE_FALLBACK : HAND_FALLBACK) };
    } catch (err) {
      last = err;
    }
  }
  throw last || new Error('Tracker failed to start.');
}

async function reloadPose(kind, delegate) {
  const gen = ++poseGen;
  modelError = null;
  setStatus('load', 'LOADING', 'Downloading the ' + kind + ' pose model…', 'MediaPipe Pose');
  try {
    const made = await makeLandmarker('pose', POSE_URL[kind] || POSE_URL.lite, delegate, {
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    if (gen !== poseGen) {
      made.created.close?.();
      return;
    }
    pose?.close?.();
    pose = made.created;
    poseDelegate = made.delegate;
    poseLinks = made.links;
    lastPoseTs = 0;
    $('delegate').textContent = poseKind + ' · ' + poseDelegate;
  } catch (err) {
    if (gen !== poseGen) return;
    modelError = err;
    pose = null;
    setStatus('lost', 'MODEL', err.message || 'Pose model failed to load.', 'Check the network and reload');
  }
}

async function ensureHands(delegate) {
  if (hand || handReloadPending) return;
  handReloadPending = true;
  setStatus('load', 'LOADING', 'Downloading the hand model…', 'MediaPipe Hands');
  try {
    const made = await makeLandmarker('hands', HAND_URL, delegate || null, {
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    hand?.close?.();
    hand = made.created;
    handDelegate = made.delegate;
    modelError = null;
    handLinks = made.links;
    lastHandTs = 0;
  } catch (err) {
    modelError = err;
    setStatus('lost', 'MODEL', err.message || 'Hand model failed to load.', 'Pose / wrist can still run');
  } finally {
    handReloadPending = false;
  }
}

function cameraMessage(err) {
  if (!err) return 'Camera failed to start.';
  if (err.name === 'NotAllowedError') return 'Camera permission was blocked. Allow it for this site and restart.';
  if (err.name === 'NotFoundError') return 'No camera was found.';
  return err.message || 'Camera failed to start.';
}

async function startCamera(deviceId) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser has no camera API. Open the page on HTTPS or localhost.');
  }
  const videoConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
  } catch (err) {
    if (deviceId) throw err;
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
  const previous = video.srcObject;
  if (previous && previous !== stream) previous.getTracks().forEach((trackItem) => trackItem.stop());
  video.srcObject = stream;
  await video.play();
  await fillCams(stream);
  $('camNote').textContent = 'Camera live. The picture is mirrored; the trail follows your phone hand.';
}

async function fillCams(stream) {
  fillingCams = true;
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  const select = $('camSelect');
  const current = stream.getVideoTracks()[0]?.getSettings?.().deviceId || '';
  select.replaceChildren();
  devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || 'Camera ' + (index + 1);
    select.appendChild(option);
  });
  if (current) select.value = current;
  fillingCams = false;
}

function stamp(prev) {
  let t = performance.now();
  if (t <= prev) t = prev + 0.1;
  return t;
}

function detectPose() {
  if (!pose) return null;
  try {
    lastPoseTs = stamp(lastPoseTs);
    return pose.detectForVideo(video, lastPoseTs);
  } catch (err) {
    if (poseDelegate === 'GPU' && !poseReloadPending) {
      poseReloadPending = true;
      const broken = pose;
      pose = null;
      broken?.close?.();
      reloadPose(poseKind, 'CPU').finally(() => { poseReloadPending = false; });
    } else {
      modelError = err;
      pose = null;
    }
    return null;
  }
}

function detectHands() {
  if (!hand) return null;
  try {
    lastHandTs = stamp(lastHandTs);
    return hand.detectForVideo(video, lastHandTs);
  } catch (err) {
    if (handDelegate === 'GPU' && !handReloadPending) {
      const broken = hand;
      hand = null;
      handDelegate = 'CPU';
      broken?.close?.();
      ensureHands('CPU');
    }
    return null;
  }
}

function confidenceOf(lm) {
  if (!lm) return 0;
  if (Number.isFinite(lm.visibility)) return lm.visibility;
  if (Number.isFinite(lm.presence)) return lm.presence;
  return 0;
}

function pickPose(landmarks) {
  if (!landmarks) return null;
  const names = side === 'auto' ? ['left', 'right'] : [side];
  let best = null;
  for (const name of names) {
    const lm = landmarks[POSE_WRIST[name]];
    if (!lm) continue;
    const conf = confidenceOf(lm);
    if (!best || conf > best.conf) best = { name, lm, conf, kind: 'pose' };
  }
  if (side === 'auto' && wristLock && best && best.name !== wristLock) {
    const prev = landmarks[POSE_WRIST[wristLock]];
    const prevConf = confidenceOf(prev);
    if (prev && prevConf >= best.conf - 0.08) best = { name: wristLock, lm: prev, conf: prevConf, kind: 'pose' };
  }
  if (best) wristLock = best.name;
  return best;
}

function pickHand(result) {
  const hands = result?.landmarks || [];
  const labels = result?.handedness || [];
  let choices = hands.map((lms, index) => {
    const cat = labels[index]?.[0];
    const name = String(cat?.categoryName || cat?.displayName || 'hand').toLowerCase();
    return { name, lm: lms[0], conf: Number.isFinite(cat?.score) ? cat.score : 0, kind: 'hands', landmarks: lms };
  }).filter((item) => item.lm);
  if (side !== 'auto') choices = choices.filter((item) => item.name === side || item.name === 'hand');
  if (!choices.length) return null;
  choices.sort((a, b) => b.conf - a.conf);
  if (side === 'auto' && handLock) {
    const locked = choices.find((item) => item.name === handLock);
    if (locked && locked.conf >= choices[0].conf - 0.08) {
      handLock = locked.name;
      return locked;
    }
  }
  handLock = choices[0].name;
  return choices[0];
}

function pickSignal(posePick, handPick) {
  if (mode === 'pose') return posePick;
  if (mode === 'hands') return handPick;
  const poseOk = posePick && posePick.conf >= 0.45;
  const handOk = handPick && handPick.conf >= 0.45;
  if (signalKind === 'pose' && poseOk) return posePick;
  if (signalKind === 'hands' && handOk) return handPick;
  if (poseOk) {
    signalKind = 'pose';
    return posePick;
  }
  if (handOk) {
    signalKind = 'hands';
    return handPick;
  }
  return posePick || handPick;
}

function pointLabel(point) {
  if (!point) return 'No point';
  if (point.kind === 'pose') {
    const index = point.name === 'left' ? 15 : 16;
    return 'Pose ' + point.name + ' wrist (' + index + ')';
  }
  return 'Hands ' + (point.name || 'hand') + ' wrist (0)';
}

function bandOf(conf) {
  if (conf == null || conf < 0.45) return 'lost';
  if (conf < 0.65) return 'low';
  return 'ok';
}

function lostNote(poseBody, handCount) {
  if (mode === 'both' && poseBody && handCount === 0) {
    return 'The body is in frame and the wrist is weak. Hands has no landmarks, which is common when a phone covers the fingers. Compare the two percentages.';
  }
  if (poseBody && mode !== 'hands') {
    return 'The body is in frame, but the wrist score dropped. A phone can hide the arm as well as the fingers.';
  }
  if (!poseBody && mode !== 'hands') {
    return 'No person in frame. Step in so the torso and the phone hand are visible.';
  }
  return 'No hand landmarks. Covered fingers often do this. Switch to Pose / wrist and compare the percentages.';
}

function setStatus(band, title, note, who) {
  const key = band + '|' + title + '|' + note + '|' + who;
  if (key === statusKey) return;
  statusKey = key;
  const bandNode = $('band');
  bandNode.textContent = title;
  bandNode.className = 'band ' + band;
  $('note').textContent = note;
  $('who').textContent = who;
  $('pill').className = 'pill ' + (band === 'ok' || band === 'low' || band === 'lost' ? band : '');
  const stage = $('stage');
  stage.classList.remove('is-ok', 'is-low', 'is-lost');
  if (band === 'ok' || band === 'low' || band === 'lost') stage.classList.add('is-' + band);
}

function noteFrame(list, ok) {
  const t = performance.now();
  list.push({ t, ok });
  while (list.length && t - list[0].t > 5000) list.shift();
}

function percent(list) {
  if (list.length < 4) return null;
  return Math.round((100 * list.filter((frame) => frame.ok).length) / list.length);
}

function pushTrail(kind, lm) {
  const bucket = trails[kind];
  bucket.push({ t: performance.now(), x: lm.x, y: lm.y });
  const cutoff = performance.now() - 1100;
  while (bucket.length && bucket[0].t < cutoff) bucket.shift();
}

function runDetect() {
  if (modelError && !pose && mode !== 'hands') {
    setStatus('lost', 'MODEL', modelError.message || 'Pose model failed to load.', 'Reload the page');
    return;
  }
  const needPose = mode !== 'hands';
  const needHands = mode !== 'pose';
  if (needPose && !pose) {
    setStatus('load', 'LOADING', 'Downloading the pose model…', 'MediaPipe Pose');
    return;
  }
  if (needHands && !hand) {
    if (modelError && !handReloadPending) {
      setStatus('lost', 'MODEL', modelError.message || 'Hand model failed to load.', 'Pose / wrist can still run');
      return;
    }
    setStatus('load', 'LOADING', 'Downloading the hand model…', 'MediaPipe Hands');
    return;
  }
  const poseResult = needPose ? detectPose() : null;
  const handResult = needHands ? detectHands() : null;
  const poseLandmarks = poseResult?.landmarks?.[0] || null;
  const posePick = pickPose(poseLandmarks);
  const handPick = pickHand(handResult);
  if (needPose) noteFrame(poseFrames, !!(posePick && posePick.conf >= 0.45));
  if (needHands) noteFrame(handFrames, !!(handPick && handPick.conf >= 0.45));
  if (posePick && posePick.conf >= 0.45) pushTrail('pose', posePick.lm);
  if (handPick && handPick.conf >= 0.45) pushTrail('hands', handPick.lm);
  const signal = pickSignal(posePick, handPick);
  const conf = signal ? signal.conf : null;
  const band = bandOf(conf);
  if (signal && conf >= 0.45) {
    track.push({
      t: performance.now(),
      x: signal.lm.x,
      y: signal.lm.y,
      conf,
      kind: signal.kind,
    });
  }
  lastConf = conf;
  lastZ = signal ? signal.lm.z : null;
  const titles = { ok: 'TRACKING', low: 'LOW', lost: 'LOST' };
  const note = band === 'lost'
    ? lostNote(!!poseLandmarks, handResult?.landmarks?.length || 0)
    : band === 'low'
      ? 'The point is weak. Keep the wrist in frame and glance at the percentage.'
      : 'Hold the phone in that hand. Fingers can stay hidden. Scribble across the frame, not at the lens.';
  setStatus(band, titles[band], note, pointLabel(signal && conf >= 0.35 ? signal : null));
  $('pointName').textContent = pointLabel(signal);
  drawOverlay(poseLandmarks, handResult, signal, band);
}

function resizeOverlay() {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (w && h && (overlay.width !== w || overlay.height !== h)) {
    overlay.width = w;
    overlay.height = h;
  }
}

function drawLinks(landmarks, links, color) {
  const w = overlay.width;
  const h = overlay.height;
  ctx.lineWidth = Math.max(2, w / 480);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const [a, b] of links) {
    const p = landmarks[a];
    const q = landmarks[b];
    if (!p || !q) continue;
    const pv = p.visibility ?? p.presence ?? 1;
    const qv = q.visibility ?? q.presence ?? 1;
    if (pv < 0.25 || qv < 0.25) continue;
    ctx.globalAlpha = Math.min(1, Math.min(pv, qv) + 0.15);
    ctx.beginPath();
    ctx.moveTo((1 - p.x) * w, p.y * h);
    ctx.lineTo((1 - q.x) * w, q.y * h);
    ctx.stroke();
  }
  for (const p of landmarks) {
    const vis = p.visibility ?? p.presence ?? 1;
    if (vis < 0.25) continue;
    ctx.globalAlpha = Math.min(1, vis + 0.15);
    ctx.beginPath();
    ctx.arc((1 - p.x) * w, p.y * h, Math.max(2.5, w / 320), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTrail(kind, color) {
  const pts = trails[kind];
  const w = overlay.width;
  const h = overlay.height;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, w / 340);
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i += 1) {
    ctx.globalAlpha = i / pts.length;
    ctx.beginPath();
    ctx.moveTo((1 - pts[i - 1].x) * w, pts[i - 1].y * h);
    ctx.lineTo((1 - pts[i].x) * w, pts[i].y * h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawOverlay(poseLandmarks, handResult, signal, band) {
  const w = overlay.width;
  const h = overlay.height;
  if (!w || !h) return;
  ctx.clearRect(0, 0, w, h);
  if (poseLandmarks) drawLinks(poseLandmarks, poseLinks, '#5b9bd5');
  const hands = handResult?.landmarks || [];
  for (const lms of hands) drawLinks(lms, handLinks, '#f0a040');
  if (mode !== 'hands') drawTrail('pose', '#5b9bd5');
  if (mode !== 'pose') drawTrail('hands', '#f0a040');
  if (signal && signal.conf >= 0.35) {
    const x = (1 - signal.lm.x) * w;
    const y = signal.lm.y * h;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(14, w / 70), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = band === 'low' ? '#f0a040' : '#4caf50';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(pointLabel(signal), x + 20, y - 14);
  }
}

function renderHeld() {
  const poseOn = mode !== 'hands';
  const handsOn = mode !== 'pose';
  const posePct = poseOn ? percent(poseFrames) : null;
  const handPct = handsOn ? percent(handFrames) : null;
  if (mode === 'both') {
    $('heldSingle').hidden = true;
    $('heldSplit').hidden = false;
    $('heldPose').textContent = posePct == null ? '—' : posePct + '%';
    $('heldHands').textContent = handPct == null ? '—' : handPct + '%';
  } else {
    $('heldSingle').hidden = false;
    $('heldSplit').hidden = true;
    const pct = mode === 'pose' ? posePct : handPct;
    $('heldNum').textContent = pct == null ? '—' : pct + '%';
    $('heldNum').style.color = mode === 'hands' ? '#f0a040' : '#5b9bd5';
  }
}

function paintSide() {
  renderHeld();
  $('fpsValue').textContent = fps ? fps.toFixed(0) : '—';
  $('inferValue').textContent = inferMs ? inferMs.toFixed(0) + ' ms' : '—';
  $('confValue').textContent = lastConf == null ? '—' : Math.round(lastConf * 100) + '%';
  $('depthZ').textContent = lastZ == null || !Number.isFinite(lastZ) ? '—' : lastZ.toFixed(2);
  const positions = track.last(5000);
  drawChart($('posPlot'), [
    { name: 'x', color: '#5b9bd5', values: column(positions, 'x', 220) },
    { name: 'y down', color: '#f0a040', values: column(positions, 'y', 220) },
  ], { empty: 'Wrist position appears when a point is held.' });
  const accel = imagePlaneAccel(positions);
  drawChart($('accPlot'), [
    { name: 'ax', color: '#e07070', values: column(accel, 'x', 220) },
    { name: 'ay up', color: '#a0c060', values: column(accel, 'y', 220) },
  ], { empty: 'Acceleration is the smoothed second derivative of that point.' });
  const phoneFresh = livePhone.samples().at(-1);
  const phoneLive = phoneFresh && performance.now() - phoneFresh.t < 800;
  const phoneSeries = phoneLive ? phonePlaneAccel(livePhone.last(5000)).series : [];
  drawChart($('dualPlot'), [
    { name: 'camera', color: '#5b9bd5', values: accel.slice(-180).map((s) => Math.hypot(s.x, s.y)) },
    { name: 'phone', color: '#4caf50', values: phoneSeries.slice(-180).map((s) => Math.hypot(s.x, s.y)) },
  ], { normalize: true, empty: 'Move a tracked wrist to draw the camera trail.' });
  $('phoneCount').textContent = String(livePhone.samples().length);
  if (session && accel.length) {
    const last = accel.at(-1);
    session.send({ k: 'cam', ax: round(last.x), ay: round(last.y) });
  }
}

function setPaired(on) {
  $('pairedPill').hidden = !on;
  if (on !== pairedOn) setFlash(on);
  pairedOn = on;
}

function showResult(result, options = {}) {
  $('dtwValue').textContent = fmt(result.dtw);
  $('corrValue').textContent = fmt(result.corr);
  $('planeValue').textContent = result.inPlane == null ? '—' : Math.round(result.inPlane * 100) + '%';
  $('angleValue').textContent = result.angleDeg == null ? '—' : Math.round(result.angleDeg) + '°';
  let on = false;
  if (options.live) {
    if (result.ok && result.paired) holdUntil = performance.now() + 1400;
    on = performance.now() < holdUntil;
  } else on = !!options.flash;
  setPaired(on);
  if (options.detail) $('pairNote').textContent = options.detail;
  else if (!result.ok) $('pairNote').textContent = reasonText(result.reason);
  else if (result.paired) $('pairNote').textContent = 'Same gesture.';
  else $('pairNote').textContent = 'Not a match yet. DTW ' + fmt(result.dtw) + ' (≤ ' + MATCH.maxDtw.toFixed(2) + '), correlation ' + fmt(result.corr) + ' (≥ ' + MATCH.minCorr.toFixed(2) + ').';
  if (options.live && session) {
    session.send({
      k: 'score',
      dtw: result.dtw,
      corr: result.corr,
      paired: on,
      reason: result.reason || '',
      plane: result.inPlane,
    });
  }
}

function sameKind(samples) {
  if (!samples.length) return [];
  const kind = samples[samples.length - 1].kind;
  let start = samples.length - 1;
  while (start > 0 && samples[start - 1].kind === kind && samples[start].t - samples[start - 1].t <= 220) {
    start -= 1;
  }
  return samples.slice(start);
}

function scoreLive() {
  const newest = livePhone.samples().at(-1);
  if (!newest || performance.now() - newest.t > 1000) return;
  const camera = sameKind(track.last(4000));
  const result = compareGestures(livePhone.last(4000), camera, { pick: 'recent' });
  showResult(result, { live: true });
}

function ingestImu(rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  const arrival = performance.now();
  const lastT = Number(rows[rows.length - 1][0]);
  if (!Number.isFinite(lastT)) return;
  for (const row of rows) {
    if (!row) continue;
    const t = Number(row[0]);
    const num = (value) => (value == null || !Number.isFinite(Number(value)) ? null : Number(value));
    const ax = num(row[1]);
    const ay = num(row[2]);
    const az = num(row[3]);
    if (!Number.isFinite(t) || ax == null || ay == null || az == null) continue;
    livePhone.push({
      t: arrival - (lastT - t),
      ax,
      ay,
      az,
      lax: num(row[4]),
      lay: num(row[5]),
      laz: num(row[6]),
      gx: num(row[7]),
      gy: num(row[8]),
      gz: num(row[9]),
    });
  }
  const rate = livePhone.rate();
  $('linkState').textContent = 'Phone streaming' + (rate ? ' · ' + rate.toFixed(0) + ' Hz' : '') + '. Scribble across the frame.';
}

function linkLabel(state) {
  switch (state) {
    case 'open': return 'Channel open. Move the phone in frame.';
    case 'connected': return 'Connected. Waiting for motion samples.';
    case 'connecting': return 'Connecting…';
    case 'failed': return 'Direct link failed. Same Wi-Fi works best, without a VPN. Import a buffer instead.';
    case 'disconnected':
    case 'closed': return 'Link closed.';
    default: return state || 'Idle';
  }
}

async function startLink() {
  $('startLink').disabled = true;
  $('linkState').textContent = 'Gathering a direct link…';
  try {
    if (session) session.close();
    session = await createHostSession({
      onState: (state) => {
        if (state === 'open') return;
        $('linkState').textContent = linkLabel(state);
      },
      onMessage: (msg) => {
        if (msg && msg.k === 'imu') ingestImu(msg.s);
      },
    });
    const phoneUrl = new URL('phone.html', location.href).href.split('#')[0];
    const withOffer = phoneUrl + '#o=' + encodeURIComponent(session.token);
    $('offerToken').value = session.token;
    $('offerBox').hidden = false;
    const qrText = withOffer.length < 700 ? withOffer : phoneUrl;
    try {
      await drawQr($('offerQr'), qrText);
    } catch {
      $('offerHint').textContent = 'Could not draw the offer code. Copy the token onto the phone.';
    }
    $('offerHint').textContent = withOffer.length < 700
      ? 'Scan this second code with the phone camera. It opens the IMU page and joins.'
      : 'This offer is too dense for one code. Open the phone page and paste the token.';
    $('linkState').textContent = 'Waiting for the phone’s answer.';
  } catch (err) {
    $('linkState').textContent = err.message || 'Could not start the link.';
  } finally {
    $('startLink').disabled = false;
  }
}

async function applyAnswer() {
  if (!session) {
    $('linkState').textContent = 'Start the live link first.';
    return;
  }
  try {
    await session.acceptAnswer($('answerToken').value.trim());
    $('linkState').textContent = 'Answer applied. Waiting for the channel.';
    scanning = false;
    $('scanAnswer').textContent = 'Scan answer';
  } catch (err) {
    $('linkState').textContent = err.message || 'That answer could not be applied.';
  }
}

async function scanAnswer() {
  if (scanning) {
    scanning = false;
    $('scanAnswer').textContent = 'Scan answer';
    $('linkState').textContent = 'Scan cancelled.';
    return;
  }
  if (!session) {
    $('linkState').textContent = 'Start the live link first.';
    return;
  }
  if (typeof BarcodeDetector === 'undefined') {
    $('linkState').textContent = 'This browser cannot scan a QR code. Paste the answer.';
    return;
  }
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  scanning = true;
  $('scanAnswer').textContent = 'Stop scan';
  $('linkState').textContent = 'Hold the phone’s answer code in front of this camera.';
  const deadline = performance.now() + 20000;
  while (scanning && performance.now() < deadline) {
    let codes = [];
    try { codes = await detector.detect(video); } catch { /* frame not ready */ }
    for (const code of codes) {
      const text = String(code.rawValue || '').trim();
      if (text.startsWith('A.') || text.startsWith('z.') || text.startsWith('r.')) {
        $('answerToken').value = text;
        await applyAnswer();
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (scanning) $('linkState').textContent = 'No answer code in frame. Paste it instead.';
  scanning = false;
  $('scanAnswer').textContent = 'Scan answer';
}

function loop(now) {
  requestAnimationFrame(loop);
  fpsFrames += 1;
  if (now - fpsStamp > 500) {
    fps = (fpsFrames * 1000) / (now - fpsStamp);
    fpsFrames = 0;
    fpsStamp = now;
  }
  if (video.readyState >= 2 && video.videoWidth) {
    resizeOverlay();
    const started = performance.now();
    runDetect();
    inferMs = performance.now() - started;
  }
  if (now - lastPaint > 90) {
    lastPaint = now;
    paintSide();
  }
  if (now - lastScore > 320) {
    lastScore = now;
    scoreLive();
  }
}

bindToggle($('modeSeg'), (value) => {
  mode = value;
  if (mode === 'pose') handFrames.length = 0;
  if (mode === 'hands') poseFrames.length = 0;
  signalKind = mode === 'hands' ? 'hands' : 'pose';
  if (mode !== 'pose') ensureHands();
});
bindToggle($('sideSeg'), (value) => {
  side = value;
  wristLock = null;
  handLock = null;
});
bindToggle($('modelSeg'), (value) => {
  if (value === poseKind) return;
  poseKind = value;
  reloadPose(poseKind);
});

$('startCam').addEventListener('click', () => {
  startCamera($('camSelect').value || undefined).catch((err) => {
    $('camNote').textContent = cameraMessage(err);
  });
});
$('camSelect').addEventListener('change', () => {
  if (fillingCams) return;
  startCamera($('camSelect').value).catch((err) => {
    $('camNote').textContent = cameraMessage(err);
  });
});
$('downloadTrail').addEventListener('click', () => {
  const samples = track.samples();
  if (samples.length < 8) {
    $('camNote').textContent = 'Hold a tracked point for a moment, then download.';
    return;
  }
  download('camera-trail.json', JSON.stringify(cameraBundle(samples, {
    mode,
    landmark: $('pointName').textContent,
  }), null, 2));
  $('camNote').textContent = 'Downloaded camera-trail.json.';
});
$('copyPhone').addEventListener('click', async () => {
  const url = new URL('phone.html', location.href).href.split('#')[0];
  const ok = await copyText(url);
  $('linkState').textContent = ok ? 'Phone link copied.' : url;
});
$('startLink').addEventListener('click', startLink);
$('copyOffer').addEventListener('click', async () => {
  const ok = await copyText($('offerToken').value);
  $('offerHint').textContent = ok ? 'Offer copied. Paste it on the phone.' : 'Copy failed. Select the offer text instead.';
});
$('applyAnswer').addEventListener('click', applyAnswer);
$('scanAnswer').addEventListener('click', scanAnswer);
$('importFile').addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  $('importText').value = await file.text();
  matchImport();
});
$('matchImport').addEventListener('click', matchImport);
$('selfCheck').addEventListener('click', () => {
  const { phone, camera, decoy } = syntheticPair();
  const good = compareGestures(phone, camera, { pick: 'energetic' });
  const bad = compareGestures(decoy, camera, { pick: 'energetic' });
  showResult(good, {
    flash: good.paired && !bad.paired,
    detail: 'Known gesture DTW ' + fmt(good.dtw) + (good.paired ? ' pairs' : ' misses')
      + '. A different gesture scores DTW ' + fmt(bad.dtw) + (bad.paired ? ' and would pair' : ' and stays unpaired') + '.',
  });
});

function matchImport() {
  let samples;
  try {
    samples = parsePhoneBundle($('importText').value);
  } catch (err) {
    $('pairNote').textContent = err.message;
    return;
  }
  const result = compareGestures(samples, track.samples(), { pick: 'energetic' });
  showResult(result, {
    flash: result.paired,
    detail: 'Strongest 1.6s of the phone buffer against the strongest 1.6s on camera.',
  });
}

async function boot() {
  const phoneUrl = new URL('phone.html', location.href).href.split('#')[0];
  $('phoneUrl').textContent = phoneUrl.replace(/^https?:\/\//, '');
  $('phoneUrl').href = phoneUrl;
  try { await drawQr($('phoneQr'), phoneUrl); } catch { /* the text link still works */ }
  let cameraError = null;
  try {
    await startCamera();
  } catch (err) {
    cameraError = err;
    $('camNote').textContent = cameraMessage(err);
  }
  await reloadPose('lite');
  if (cameraError && pose) {
    setStatus('lost', 'CAMERA OFF', cameraMessage(cameraError), 'Allow the camera, then restart');
  }
  requestAnimationFrame(loop);
}

boot();

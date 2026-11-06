import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ENGINES, ENTRY_LAYOUT, HYDRANTS, toolRange } from './sim.js';

const UP = new THREE.Vector3(0, 1, 0);
const _muzzle = new THREE.Vector3();
const _target = new THREE.Vector3();
const _end = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _local = new THREE.Vector3();

const AGENT_COLOR = {
  afff: 0xd5f3e6,
  water: 0x8ec9ef,
  drychem: 0xf3e3a2,
  halon: 0xd5e6ff,
};

function flameHeight(zone) {
  if (zone.kind === 'engine') return 3.35;
  if (zone.kind === 'wing') return 5.05;
  if (zone.kind === 'cabin') return 3.2;
  return 0.35;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, 256, 80);
  g.fillStyle = 'rgba(8, 8, 8, 0.82)';
  roundRect(g, 6, 10, 244, 60, 12);
  g.fill();
  g.fillStyle = '#f2f2f2';
  g.font = '700 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(5.4, 1.7, 1);
  sprite.position.y = 4.8;
  return sprite;
}

function softTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function groundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  g.fillStyle = '#8f928a';
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() * 22) | 0;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n - 11));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n - 11));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n - 12));
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(55, 56, 50, 0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  g.fillStyle = 'rgba(40, 40, 36, 0.16)';
  for (let i = 0; i < 14; i += 1) {
    g.beginPath();
    g.ellipse(40 + Math.random() * 440, 40 + Math.random() * 440, 16 + Math.random() * 36, 8 + Math.random() * 16, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(10, 8);
  return tex;
}

function buildAircraft(paint, paintDark, belly, glass, metal, dark, interiorFloor) {
  const root = new THREE.Group();
  root.name = 'aircraft';

  const fuseMat = paint.clone();
  fuseMat.clippingPlanes = [];
  const length = 50;
  const profile = [
    [0, 0.04],
    [0.035, 0.72],
    [0.07, 1.4],
    [0.11, 1.95],
    [0.16, 2.28],
    [0.22, 2.4],
    [0.74, 2.4],
    [0.84, 2.15],
    [0.91, 1.62],
    [0.96, 0.95],
    [1, 0.28],
  ];
  const pts = profile.map(([t, r]) => new THREE.Vector2(r, (t - 0.5) * length));
  const fuseGeo = new THREE.LatheGeometry(pts, 36);
  fuseGeo.rotateX(Math.PI / 2);
  const fuse = new THREE.Mesh(fuseGeo, fuseMat);
  fuse.castShadow = true;
  fuse.receiveShadow = true;
  fuse.position.y = 2.95;
  root.add(fuse);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(2.48, 2.48, 0.55, 36, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x5b9bd5, roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide }),
  );
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 3.15, -8);
  root.add(band);

  function wing(sign) {
    const geo = new THREE.BoxGeometry(22.5, 0.42, 6.6);
    geo.translate(sign * 11.25, 0, 0);
    const mesh = new THREE.Mesh(geo, paint);
    mesh.position.set(sign * 1.4, 4.85, -1.6);
    mesh.rotation.z = sign * -0.09;
    mesh.rotation.y = sign * -0.1;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  root.add(wing(1), wing(-1));

  const wingletGeo = new THREE.BoxGeometry(1.2, 1.3, 2.2);
  for (const sign of [1, -1]) {
    const tip = new THREE.Mesh(wingletGeo, paintDark);
    tip.position.set(sign * 23.2, 3.55, -0.2);
    tip.rotation.z = sign * -0.09;
    root.add(tip);
  }

  for (const eng of ENGINES) {
    const nacelle = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.86, 3.5, 18), metal);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    const intake = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 8, 18), dark);
    intake.position.z = -1.7;
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.4, metalness: 0.6 }));
    fan.position.z = -1.55;
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.7, 0.7, 14), dark);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.z = 1.95;
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.35, 1.5), paintDark);
    pylon.position.y = 1.05;
    pylon.castShadow = true;
    nacelle.add(body, intake, fan, exhaust, pylon);
    nacelle.position.set(eng.x, 3.35, eng.z);
    root.add(nacelle);
  }

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 6.8, 5.4), paint);
  fin.position.set(0, 7.3, 17.2);
  fin.castShadow = true;
  const stab = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.32, 3.1), paint);
  stab.position.set(0, 10.55, 18.1);
  stab.castShadow = true;
  root.add(fin, stab);

  const markCanvas = document.createElement('canvas');
  markCanvas.width = 256;
  markCanvas.height = 128;
  const mg = markCanvas.getContext('2d');
  mg.fillStyle = '#2c6f9e';
  mg.fillRect(0, 0, 256, 128);
  mg.fillStyle = '#e0a24a';
  mg.fillRect(0, 96, 256, 32);
  mg.fillStyle = '#ffffff';
  mg.font = '700 72px sans-serif';
  mg.textAlign = 'center';
  mg.textBaseline = 'middle';
  mg.fillText('141', 128, 58);
  const markTex = new THREE.CanvasTexture(markCanvas);
  markTex.colorSpace = THREE.SRGBColorSpace;
  const markMat = new THREE.MeshBasicMaterial({ map: markTex });
  for (const sign of [1, -1]) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.15), markMat);
    mark.position.set(sign * 0.24, 8.1, 17.4);
    mark.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(mark);
  }

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.18, 4.2), paintDark);
  ramp.position.set(0, 1.15, 22.4);
  ramp.rotation.x = 0.42;
  root.add(ramp);
  const petalL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 3.4), paintDark);
  petalL.position.set(-1.35, 2.3, 21.6);
  petalL.rotation.y = 0.5;
  const petalR = petalL.clone();
  petalR.position.x = 1.35;
  petalR.rotation.y = -0.5;
  root.add(petalL, petalR);

  for (const sign of [1, -1]) {
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 4.6, 4, 10), paintDark);
    pod.rotation.z = Math.PI / 2;
    pod.rotation.y = Math.PI / 2;
    pod.position.set(sign * 1.55, 0.85, 2.2);
    pod.castShadow = true;
    root.add(pod);
    for (const gz of [-0.4, 2.4]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), dark);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(sign * 1.7, 0.42, gz);
      root.add(tire);
    }
  }
  const noseTire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.28, 10), dark);
  noseTire.rotation.z = Math.PI / 2;
  noseTire.position.set(0, 0.32, -18.5);
  root.add(noseTire);
  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), metal);
  noseStrut.position.set(0, 0.9, -18.5);
  root.add(noseStrut);

  const windows = [];
  const cabinGlass = new THREE.MeshStandardMaterial({
    color: 0x14202b,
    roughness: 0.12,
    metalness: 0.7,
    emissive: new THREE.Color(0xff5a1f),
    emissiveIntensity: 0,
  });
  for (const sign of [1, -1]) {
    for (let i = 0; i < 8; i += 1) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.7), cabinGlass);
      win.position.set(sign * 2.42, 3.55, -12 + i * 2.5);
      root.add(win);
      windows.push(win);
    }
  }
  for (const wz of [-21.2, -20.2, -19.3]) {
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.7 - (wz + 21) * 0.3, 0.62, 0.55), glass);
    cockpit.position.set(0, 4.15 - (wz + 21) * 0.15, wz);
    cockpit.rotation.x = -0.35;
    root.add(cockpit);
  }

  const interior = new THREE.Group();
  interior.visible = false;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 30), interiorFloor);
  floor.position.set(0, 1.35, 0);
  interior.add(floor);
  for (let i = 0; i < 7; i += 1) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), paintDark);
    seat.position.set(1.0, 1.8, -12 + i * 1.6);
    interior.add(seat);
  }
  for (const lz of [-4, -1.2]) {
    const litter = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 1.9), new THREE.MeshStandardMaterial({ color: 0xc5c9cc, roughness: 0.6 }));
    litter.position.set(-0.7, 1.7, lz);
    interior.add(litter);
    for (const corner of [[-0.28, -0.8], [0.28, -0.8], [-0.28, 0.8], [0.28, 0.8]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), metal);
      leg.position.set(-0.7 + corner[0], 1.5, lz + corner[1]);
      interior.add(leg);
    }
  }
  const bay = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.8, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x33383d, emissive: new THREE.Color(0xff4a16), emissiveIntensity: 0.2, roughness: 0.5 }),
  );
  bay.position.set(0.2, 2.1, -14.5);
  bay.name = 'bay';
  interior.add(bay);
  root.add(interior);

  const doors = [];
  for (const entry of ENTRY_LAYOUT) {
    const wide = entry.id === 'ramp';
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(wide ? 2.4 : 0.18, wide ? 1.6 : 1.35, wide ? 0.2 : 0.85),
      new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.45, metalness: 0.25, emissive: new THREE.Color(0x5b9bd5), emissiveIntensity: 0 }),
    );
    if (entry.id === 'ramp') mesh.position.set(0, 1.7, 21.2);
    else mesh.position.set(Math.sign(entry.x) * 2.5, entry.y + 0.35, entry.z);
    mesh.userData.pick = { type: 'entry', id: entry.id };
    root.add(mesh);
    doors.push(mesh);
  }

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.scale.set(8, 24, 1);
  blob.position.y = 0.025;
  root.add(blob);

  return { root, fuseMat, interior, windows, cabinGlass, doors, bay };
}

function buildTruck(def) {
  const g = new THREE.Group();
  g.name = def.id;
  g.userData.pick = { type: 'unit', id: def.id };
  g.userData.spin = 0;
  const body = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.48, metalness: 0.16 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.55, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2833, roughness: 0.08, metalness: 0.8 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

  function axle(x, y, z) {
    const pivot = new THREE.Group();
    pivot.name = 'axle';
    pivot.position.set(x, y, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), rubber);
    tire.rotation.z = Math.PI / 2;
    pivot.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 8), dark);
    hub.rotation.z = Math.PI / 2;
    pivot.add(hub);
    return pivot;
  }

  function addAxles(zs, halfTrack, y) {
    for (const z of zs) {
      g.add(axle(-halfTrack, y, z), axle(halfTrack, y, z));
    }
  }

  let muzzleZ = 3.2;
  let muzzleY = 1.6;
  if (def.shape === 'p15') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.55, 8.6), dark);
    chassis.position.set(0, 0.85, 0);
    chassis.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.55, 2.3), body);
    cab.position.set(0, 1.7, 2.7);
    cab.castShadow = true;
    const wind = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.12), glass);
    wind.position.set(0, 2.05, 3.8);
    wind.rotation.x = 0.25;
    const tank = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.45, 4.6), body);
    tank.position.set(0, 1.7, -1.3);
    tank.castShadow = true;
    g.add(chassis, cab, wind, tank);
    addAxles([2.5, 0.2, -2.6], 1.25, 0.42);
    const turret = new THREE.Group();
    turret.name = 'turret';
    turret.position.set(0, 2.55, -0.4);
    turret.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.35, 12), dark));
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.35), dark);
    barrel.position.z = 0.7;
    turret.add(barrel);
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 0.1, 1.35);
    turret.add(muzzle);
    g.add(turret);
    muzzleY = 2.7;
    muzzleZ = 1;
  } else if (def.shape === 'p2' || def.shape === 'mutual') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.5, 6.4), dark);
    chassis.position.set(0, 0.75, 0);
    chassis.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.45, 1.9), body);
    cab.position.set(0, 1.55, 1.9);
    cab.castShadow = true;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 3.1, 16), body);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 1.55, -0.8);
    tank.castShadow = true;
    g.add(chassis, cab, tank);
    addAxles([1.7, -1.5], 1.15, 0.42);
    const turret = new THREE.Group();
    turret.name = 'turret';
    turret.position.set(0, 2.7, -0.5);
    turret.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), dark));
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.05), dark);
    barrel.position.z = 0.55;
    turret.add(barrel);
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 0, 1.05);
    turret.add(muzzle);
    g.add(turret);
  } else if (def.shape === 'p13') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 4.6), dark);
    chassis.position.set(0, 0.65, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.25, 1.7), body);
    cab.position.set(0, 1.3, 1.2);
    cab.castShadow = true;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 2.1), body);
    bed.position.set(0, 1.15, -1.1);
    g.add(chassis, cab, bed);
    addAxles([1.3, -1.2], 1.0, 0.4);
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 1.3, 2.2);
    g.add(muzzle);
  } else if (def.shape === 'rescue') {
    const van = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.15, 6.2), body);
    van.position.set(0, 1.45, 0);
    van.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 6.22), new THREE.MeshStandardMaterial({ color: 0xd3543c, roughness: 0.5 }));
    stripe.position.set(0, 1.55, 0);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.1), glass);
    wind.position.set(0, 1.9, 3.05);
    g.add(van, stripe, wind);
    addAxles([1.8, -1.8], 1.05, 0.4);
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 1.4, 3.1);
    g.add(muzzle);
  } else {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 7.4), dark);
    chassis.position.set(0, 0.78, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.6, 2.1), body);
    cab.position.set(0, 1.65, 2.3);
    cab.castShadow = true;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.15, 4.2), body);
    bed.position.set(0, 1.45, -1.1);
    const hose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 2.4), dark);
    hose.position.set(0, 2.15, -1.2);
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 5.5), new THREE.MeshStandardMaterial({ color: 0xded6c8, roughness: 0.6 }));
    ladder.position.set(0.7, 2.25, -0.4);
    g.add(chassis, cab, bed, hose, ladder);
    addAxles([2.2, -0.4, -2.2], 1.15, 0.42);
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 1.5, 3.4);
    g.add(muzzle);
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  beacon.name = 'beacon';
  beacon.position.set(0, def.shape === 'rescue' ? 2.65 : 3.05, 0.4);
  g.add(beacon);
  const label = makeLabel(def.name);
  if (def.shape === 'p13') label.position.y = 3.3;
  if (def.shape === 'rescue') label.position.y = 3.8;
  g.add(label);
  g.userData.muzzleHint = { y: muzzleY, z: muzzleZ };
  return g;
}

function makeFlameMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        float x = vUv.x - 0.5;
        float wobble = sin(vUv.y * 11.0 - uTime * 6.0) * 0.045 + sin(vUv.y * 23.0 + uTime * 3.0) * 0.02;
        float width = mix(0.2, 0.035, vUv.y);
        float body = smoothstep(width, width * 0.2, abs(x + wobble));
        float tip = smoothstep(1.0, 0.25, vUv.y);
        float base = smoothstep(0.0, 0.07, vUv.y);
        float alpha = body * tip * base;
        vec3 hot = vec3(1.0, 0.86, 0.45);
        vec3 cool = vec3(0.95, 0.22, 0.04);
        vec3 col = mix(hot, cool, smoothstep(0.05, 0.85, vUv.y));
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb7c3ce);
  scene.fog = new THREE.Fog(0xc5d0da, 80, 250);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 28, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x6d8caf) },
        horizon: { value: new THREE.Color(0xe4d7c4) },
        ground: { value: new THREE.Color(0x8b9084) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        varying vec3 vP;
        uniform vec3 top;
        uniform vec3 horizon;
        uniform vec3 ground;
        void main() {
          float h = normalize(vP).y;
          vec3 col = mix(horizon, top, smoothstep(0.02, 0.55, h));
          col = mix(ground, col, smoothstep(-0.2, 0.08, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xd5e2ee, 0x6d7058, 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e5, 1.45);
  sun.position.set(-48, 62, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 180;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc5d4e4, 0.38);
  fill.position.set(40, 24, -20);
  scene.add(fill);

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    new THREE.MeshStandardMaterial({ color: 0x3f5342, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.04;
  grass.receiveShadow = true;
  scene.add(grass);

  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 120),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.92, metalness: 0.02 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0;
  apron.receiveShadow = true;
  apron.userData.pick = { type: 'ground' };
  scene.add(apron);

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 240),
    new THREE.MeshStandardMaterial({ color: 0x4e5154, roughness: 0.95 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(78, 0.01, -10);
  runway.receiveShadow = true;
  scene.add(runway);
  for (let z = -100; z <= 80; z += 14) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.03, 6),
      new THREE.MeshBasicMaterial({ color: 0xf4f4f2 }),
    );
    dash.position.set(78, 0.03, z);
    scene.add(dash);
  }
  const taxi = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.03, 90),
    new THREE.MeshBasicMaterial({ color: 0xe6c04a }),
  );
  taxi.position.set(40, 0.03, 8);
  scene.add(taxi);
  const taxiJoin = new THREE.Mesh(
    new THREE.BoxGeometry(38, 0.03, 0.28),
    new THREE.MeshBasicMaterial({ color: 0xe6c04a }),
  );
  taxiJoin.position.set(58, 0.03, 36);
  scene.add(taxiJoin);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf7f7f5 });
  function paintLine(x, z, w, d) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), lineMat);
    line.position.set(x, 0.03, z);
    scene.add(line);
  }
  paintLine(0, -30, 70, 0.18);
  paintLine(0, 32, 70, 0.18);
  paintLine(-35, 1, 0.18, 62);
  paintLine(35, 1, 0.18, 62);

  const hangarMat = new THREE.MeshStandardMaterial({ color: 0xb7b1a4, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6e7378, roughness: 0.7, metalness: 0.2 });
  const hangars = [
    { x: -55, z: -78, w: 34, d: 18, h: 10 },
    { x: -8, z: -86, w: 42, d: 20, h: 12 },
    { x: 42, z: -76, w: 28, d: 16, h: 9 },
  ];
  for (const h of hangars) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.d), hangarMat);
    box.position.set(h.x, h.h / 2, h.z);
    box.castShadow = true;
    box.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(h.w + 1, 0.4, h.d + 1), roofMat);
    roof.position.y = h.h / 2 + 0.1;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(h.w * 0.62, h.h * 0.55, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x3c4248, roughness: 0.6 }),
    );
    door.position.set(0, -h.h * 0.12, h.d / 2 + 0.05);
    box.add(roof, door);
    scene.add(box);
  }

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 16, 3.2), new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.6 }));
  shaft.position.set(58, 8, -36);
  shaft.castShadow = true;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.2, 6.5), new THREE.MeshStandardMaterial({ color: 0x8aa0b3, roughness: 0.25, metalness: 0.4 }));
  cab.position.y = 9.2;
  shaft.add(cab);
  scene.add(shaft);

  for (const h of HYDRANTS) {
    const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xb3392e, roughness: 0.5 }));
    hydrant.position.set(h.x, 0.35, h.z);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: 0xded6c2 }));
    cap.position.set(0.2, 0.1, 0);
    hydrant.add(cap);
    scene.add(hydrant);
  }

  const paint = new THREE.MeshStandardMaterial({ color: 0xd5d8dc, roughness: 0.46, metalness: 0.2 });
  const paintDark = new THREE.MeshStandardMaterial({ color: 0x8e949b, roughness: 0.55, metalness: 0.22 });
  const belly = paintDark;
  const glass = new THREE.MeshStandardMaterial({ color: 0x173041, roughness: 0.06, metalness: 0.85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7bcc2, roughness: 0.35, metalness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.6, metalness: 0.3 });
  const interiorFloor = new THREE.MeshStandardMaterial({ color: 0x5c6166, roughness: 0.8 });
  const aircraft = buildAircraft(paint, paintDark, belly, glass, metal, dark, interiorFloor);
  scene.add(aircraft.root);

  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.2);
  const flames = new Map();
  const flameMat = makeFlameMaterial();
  const flameRoot = new THREE.Group();
  scene.add(flameRoot);
  const poolDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ color: 0x1a120c, transparent: true, opacity: 0.78, depthWrite: false }),
  );
  poolDisc.rotation.x = -Math.PI / 2;
  poolDisc.position.y = 0.04;
  poolDisc.visible = false;
  scene.add(poolDisc);
  const runFuel = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.04, 4),
    new THREE.MeshBasicMaterial({ color: 0x24180f, transparent: true, opacity: 0.8 }),
  );
  runFuel.visible = false;
  scene.add(runFuel);

  const smokeCount = 520;
  const smokePos = new Float32Array(smokeCount * 3);
  const smokeAge = new Float32Array(smokeCount);
  const smokeLife = new Float32Array(smokeCount);
  const smokeVel = new Float32Array(smokeCount);
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const smokePoints = new THREE.Points(
    smokeGeo,
    new THREE.PointsMaterial({
      map: softTexture(),
      color: 0x6a6e72,
      size: 4.8,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  scene.add(smokePoints);
  for (let i = 0; i < smokeCount; i += 1) smokeAge[i] = 99;

  const trucks = new Map();
  const streams = new Map();
  const fireLights = [0, 1].map(() => {
    const light = new THREE.PointLight(0xff6a2a, 0, 22, 2);
    light.castShadow = false;
    scene.add(light);
    return light;
  });

  const selectRing = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.85, 40),
    new THREE.MeshBasicMaterial({ color: 0xf4f7fb, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  selectRing.rotation.x = -Math.PI / 2;
  selectRing.position.y = 0.05;
  selectRing.visible = false;
  scene.add(selectRing);
  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(0.985, 1, 72),
    new THREE.MeshBasicMaterial({ color: 0x5b9bd5, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }),
  );
  rangeRing.rotation.x = -Math.PI / 2;
  rangeRing.position.y = 0.06;
  rangeRing.visible = false;
  scene.add(rangeRing);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 600);
  camera.position.set(-40, 22, 62);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(-2, 3.4, -4);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.38;
  controls.minDistance = 8;
  controls.maxDistance = 170;
  controls.update();

  const mapCam = new THREE.OrthographicCamera(-40, 40, 30, -30, 0.1, 300);
  mapCam.position.set(0, 140, 0);
  mapCam.up.set(0, 0, -1);
  mapCam.lookAt(0, 0, 0);
  const bumperCam = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  const interiorCam = new THREE.PerspectiveCamera(68, 1, 0.05, 200);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let mode = 'orbit';
  let activeCamera = camera;
  let focusing = 0;
  const desiredTarget = new THREE.Vector3(0, 3, 0);
  const desiredCam = new THREE.Vector3();
  const walkers = [];
  let shownRecovered = 0;
  const clock = { t: 0 };

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    bumperCam.aspect = w / h;
    bumperCam.updateProjectionMatrix();
    interiorCam.aspect = w / h;
    interiorCam.updateProjectionMatrix();
    const halfH = 46;
    const halfW = halfH * (w / h);
    mapCam.left = -halfW;
    mapCam.right = halfW;
    mapCam.top = halfH;
    mapCam.bottom = -halfH;
    mapCam.updateProjectionMatrix();
  }

  function setMode(next) {
    mode = next;
    controls.enabled = next === 'orbit';
    const open = next === 'interior';
    aircraft.interior.visible = open;
    aircraft.fuseMat.clippingPlanes = open ? [clip] : [];
    aircraft.fuseMat.clipShadows = open;
    aircraft.fuseMat.needsUpdate = true;
    if (next === 'interior') {
      interiorCam.position.set(-0.15, 2.5, -9);
      interiorCam.lookAt(0.4, 2.2, 8);
    }
  }

  function focus(x, y, z) {
    if (mode !== 'orbit') setMode('orbit');
    desiredTarget.set(x, y, z);
    desiredCam.set(x - 18, y + 12, z + 20);
    focusing = 1;
  }

  function respawnSmoke(i, state) {
    const zones = state.zones.filter((z) => z.intensity > 1.2);
    if (!zones.length) {
      smokePos[i * 3 + 1] = -20;
      smokeAge[i] = 0;
      smokeLife[i] = 0.4;
      return;
    }
    let zone = zones[(Math.random() * zones.length) | 0];
    if (Math.random() > zone.intensity / 80 && zones.length > 1) zone = zones[(Math.random() * zones.length) | 0];
    const spread = 0.8 + zone.intensity * 0.025;
    smokePos[i * 3] = zone.x + (Math.random() - 0.5) * spread;
    smokePos[i * 3 + 1] = flameHeight(zone) + Math.random() * 0.5;
    smokePos[i * 3 + 2] = zone.z + (Math.random() - 0.5) * spread;
    smokeVel[i] = 1.3 + Math.random() * 1.6;
    smokeAge[i] = 0;
    smokeLife[i] = 2.2 + Math.random() * 2.4;
  }

  function ensureFlame(zone) {
    let group = flames.get(zone.id);
    if (group) return group;
    group = new THREE.Group();
    group.userData.pick = { type: 'zone', id: zone.id };
    for (let i = 0; i < 3; i += 1) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), flameMat);
      plane.rotation.y = (i * Math.PI) / 3;
      plane.position.y = 1.05;
      group.add(plane);
    }
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 18),
      new THREE.MeshBasicMaterial({
        color: 0xff5a1a,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.08;
    group.add(pad);
    flameRoot.add(group);
    flames.set(zone.id, group);
    return group;
  }

  function ensureTruck(unit) {
    let truck = trucks.get(unit.id);
    if (truck) return truck;
    truck = buildTruck(unit);
    scene.add(truck);
    const mat = new THREE.MeshBasicMaterial({
      color: AGENT_COLOR.afff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 1, 10, 1, false), mat);
    stream.geometry.translate(0, 0.5, 0);
    stream.visible = false;
    stream.frustumCulled = false;
    scene.add(stream);
    streams.set(unit.id, stream);
    trucks.set(unit.id, truck);
    return truck;
  }

  function sync(state, realDt, bag) {
    clock.t += realDt;
    flameMat.uniforms.uTime.value = clock.t;
    const dt = Math.min(realDt, 0.05);

    for (const zone of state.zones) {
      const flame = ensureFlame(zone);
      const hot = zone.intensity > 1;
      flame.visible = hot;
      if (!hot) continue;
      const s = 0.55 + zone.intensity * 0.04;
      flame.scale.set(s, 0.7 + zone.intensity * 0.055, s);
      flame.position.set(zone.x, flameHeight(zone), zone.z);
      flame.rotation.y = clock.t * 0.4 + zone.x;
    }

    const pool = state.zones.find((z) => z.id === 'pool');
    const running = state.zones.find((z) => z.id === 'running');
    poolDisc.visible = pool.intensity > 2;
    if (poolDisc.visible) {
      const r = 1.1 + pool.intensity * 0.09;
      poolDisc.position.set(pool.x, 0.045, pool.z);
      poolDisc.scale.set(r, r, 1);
    }
    runFuel.visible = running.intensity > 2;
    if (runFuel.visible) {
      runFuel.position.set(running.x, 0.05, running.z);
      runFuel.scale.set(0.7 + running.intensity * 0.02, 1, 0.6 + running.intensity * 0.05);
    }

    const cabin = state.zones.find((z) => z.id === 'cabin');
    aircraft.cabinGlass.emissiveIntensity = cabin ? cabin.intensity / 28 : 0;
    const bay = aircraft.bay;
    if (bay) bay.material.emissiveIntensity = 0.15 + (cabin ? cabin.intensity / 40 : 0);
    for (const door of aircraft.doors) {
      door.material.emissiveIntensity = bag.entrances ? 0.7 : 0;
    }

    const hotZones = state.zones.filter((z) => z.intensity > 2).sort((a, b) => b.intensity - a.intensity);
    fireLights.forEach((light, i) => {
      const zone = hotZones[i];
      if (!zone) {
        light.intensity = 0;
        return;
      }
      const flick = 0.85 + Math.sin(clock.t * 14 + i) * 0.15;
      light.position.set(zone.x, flameHeight(zone) + 1.2, zone.z);
      light.intensity = (1.6 + zone.intensity * 0.16) * flick;
      light.distance = 12 + zone.intensity * 0.18;
    });

    for (let i = 0; i < smokeCount; i += 1) {
      smokeAge[i] += dt;
      if (smokeAge[i] > smokeLife[i] || smokePos[i * 3 + 1] > 28) respawnSmoke(i, state);
      smokePos[i * 3 + 1] += smokeVel[i] * dt;
      smokePos[i * 3] += Math.sin(clock.t * 0.8 + i) * 0.22 * dt;
      smokePos[i * 3 + 2] += Math.cos(clock.t * 0.6 + i * 0.3) * 0.16 * dt;
    }
    smokeGeo.attributes.position.needsUpdate = true;

    const live = new Set();
    let selected = null;
    for (const unit of state.units) {
      if (!unit.onScene) continue;
      live.add(unit.id);
      const truck = ensureTruck(unit);
      truck.visible = true;
      truck.position.set(unit.x, 0, unit.z);
      truck.rotation.y = unit.heading || 0;
      truck.updateMatrixWorld(true);
      if (unit.moving) truck.userData.spin += unit.speed * dt;
      truck.traverse((obj) => {
        if (obj.name === 'axle') obj.rotation.x = truck.userData.spin;
        if (obj.name === 'beacon') {
          const pulse = unit.task ? 0.6 + Math.sin(clock.t * 10) * 0.4 : 1;
          obj.scale.setScalar(Math.max(0.35, pulse));
        }
      });
      if (unit.id === bag.selectedId) selected = unit;
      aimAndSpray(truck, unit, state);
    }
    for (const [id, truck] of trucks) {
      if (!live.has(id)) {
        truck.visible = false;
        const stream = streams.get(id);
        if (stream) stream.visible = false;
      }
    }

    selectRing.visible = !!selected;
    if (selected) selectRing.position.set(selected.x, 0.06, selected.z);
    if (bag.range && selected) {
      rangeRing.visible = true;
      rangeRing.position.set(selected.x, 0.07, selected.z);
      rangeRing.scale.set(bag.range, bag.range, 1);
      const near = state.zones.some((z) => z.intensity > 2 && Math.hypot(z.x - selected.x, z.z - selected.z) <= bag.range);
      rangeRing.material.color.set(near ? 0x4caf50 : 0xf0a040);
    } else {
      rangeRing.visible = false;
    }

    if (state.people.recovered < shownRecovered) {
      shownRecovered = state.people.recovered;
      for (const walker of walkers) scene.remove(walker.mesh);
      walkers.length = 0;
    }
    if (state.people.recovered > shownRecovered) {
      const exit = state.entries.find((e) => e.id === state.people.lastExit) || state.entries[0];
      const rescue = state.units.find((u) => u.role === 'rescue' && u.onScene) || selected || state.units[0];
      for (let n = shownRecovered; n < state.people.recovered; n += 1) {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.28, 0.8, 4, 8),
          new THREE.MeshStandardMaterial({ color: 0x3d4c5c, roughness: 0.6 }),
        );
        body.castShadow = true;
        scene.add(body);
        walkers.push({
          mesh: body,
          from: new THREE.Vector3(Math.sign(exit.x || -1) * 3.2, 0, exit.z),
          to: new THREE.Vector3(rescue.x, 0, rescue.z),
          t: 0,
        });
      }
      shownRecovered = state.people.recovered;
    }
    for (let i = walkers.length - 1; i >= 0; i -= 1) {
      const w = walkers[i];
      w.t += dt * 0.28;
      const k = Math.min(1, w.t);
      w.mesh.position.lerpVectors(w.from, w.to, k);
      w.mesh.position.y = 1.05;
      if (k >= 1) {
        scene.remove(w.mesh);
        walkers.splice(i, 1);
      }
    }

    if (mode === 'bumper' && selected) {
      const fx = Math.sin(selected.heading || 0);
      const fz = Math.cos(selected.heading || 0);
      bumperCam.position.set(selected.x - fx * 11, 5.2, selected.z - fz * 11);
      bumperCam.lookAt(selected.x + fx * 10, 2.2, selected.z + fz * 10);
      activeCamera = bumperCam;
    } else if (mode === 'map') {
      activeCamera = mapCam;
    } else if (mode === 'interior') {
      activeCamera = interiorCam;
    } else {
      activeCamera = camera;
      if (focusing > 0) {
        controls.target.lerp(desiredTarget, 0.08);
        camera.position.lerp(desiredCam, 0.06);
        focusing *= 0.97;
        if (focusing < 0.04) focusing = 0;
      }
      controls.update();
    }
    renderer.render(scene, activeCamera);
  }

  function aimAndSpray(truck, unit, state) {
    const stream = streams.get(unit.id);
    const task = unit.task && unit.task.type === 'apply' ? unit.task : null;
    const turret = truck.getObjectByName('turret');
    if (!task) {
      if (stream) stream.visible = false;
      return;
    }
    const zone = state.zones.find((z) => z.id === task.zoneId);
    if (!zone || !stream) {
      if (stream) stream.visible = false;
      return;
    }
    _target.set(zone.x, flameHeight(zone), zone.z);
    if (turret) {
      _local.copy(_target);
      truck.worldToLocal(_local);
      turret.rotation.y = Math.atan2(_local.x, _local.z);
      truck.updateMatrixWorld(true);
    }
    const muzzleObj = truck.getObjectByName('muzzle');
    if (muzzleObj) muzzleObj.getWorldPosition(_muzzle);
    else truck.getWorldPosition(_muzzle).setY(1.6);
    const range = toolRange(task.tool, task.pattern);
    const dist = Math.hypot(unit.x - zone.x, unit.z - zone.z);
    if (dist <= range) {
      _end.copy(_target);
    } else {
      _dir.set(zone.x - _muzzle.x, 0, zone.z - _muzzle.z);
      if (_dir.lengthSq() < 0.001) _dir.set(0, 0, 1);
      _dir.normalize().multiplyScalar(range);
      _end.set(_muzzle.x + _dir.x, 0.25, _muzzle.z + _dir.z);
    }
    _dir.copy(_end).sub(_muzzle);
    const len = Math.max(0.2, _dir.length());
    stream.visible = true;
    stream.material.color.set(AGENT_COLOR[task.agent] || 0xffffff);
    stream.position.copy(_muzzle);
    stream.scale.set(1, len, 1);
    stream.quaternion.setFromUnitVectors(UP, _dir.multiplyScalar(1 / len));
  }

  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, activeCamera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.pick) {
          return { ...obj.userData.pick, x: hit.point.x, z: hit.point.z, y: hit.point.y };
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  resize();
  return { resize, setMode, focus, sync, pick, renderer };
}

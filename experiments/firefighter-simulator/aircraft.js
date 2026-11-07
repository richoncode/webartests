// Procedural silhouettes for the fictional airframes.
// Representative shapes, not measured models. The starlifter stays in scene.js.

function lathe(THREE, length, radius, y, mat, nose) {
  const profile = nose || [
    [0, 0.08],
    [0.07, 0.55],
    [0.14, 0.86],
    [0.24, 1],
    [0.72, 1],
    [0.86, 0.78],
    [0.94, 0.42],
    [1, 0.12],
  ];
  const pts = profile.map(([t, r]) => new THREE.Vector2(r * radius, (t - 0.5) * length));
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function wingPair(THREE, layout, mat, y, chord, span, sweep) {
  const group = new THREE.Group();
  for (const sign of [1, -1]) {
    const geo = new THREE.BoxGeometry(span, 0.28, chord);
    geo.translate(sign * span * 0.5, 0, 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sign * 0.8, y, layout.wings[0] ? layout.wings[0].z : 0);
    mesh.rotation.y = sign * -(sweep || 0);
    mesh.rotation.z = sign * -0.06;
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

function nacelle(THREE, x, y, z, metal, dark, prop) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 2.4, 14), metal);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);
  const intake = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 12), dark);
  intake.position.z = -1.15;
  group.add(intake);
  if (prop) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.08, 20),
      new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.85 }),
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.z = -1.7;
    group.add(disc);
  } else {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.5, 12), dark);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = 1.35;
    group.add(nozzle);
  }
  group.position.set(x, y, z);
  return group;
}

function doorsFor(THREE, entries, dark) {
  const doors = [];
  for (const entry of entries) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(entry.kind === 'normal' && Math.abs(entry.x) < 0.4 ? 0.9 : 0.16, 1.1, 0.7),
      new THREE.MeshStandardMaterial({
        color: 0x2a3138,
        roughness: 0.5,
        emissive: new THREE.Color(0x5b9bd5),
        emissiveIntensity: 0,
      }),
    );
    const skin = Math.abs(entry.x) < 0.4 ? entry.x : Math.sign(entry.x) * (Math.abs(entry.x) * 0.92);
    mesh.position.set(skin, entry.y, entry.z);
    mesh.userData.pick = { type: 'entry', id: entry.id };
    doors.push(mesh);
  }
  return doors;
}

function seats(THREE, mat, z0, n) {
  const group = new THREE.Group();
  group.name = 'interior';
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 6), mat);
  floor.position.set(0, 0.7, z0);
  group.add(floor);
  for (let i = 0; i < n; i += 1) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), mat);
    seat.position.set(0.35, 1.05, z0 - 2 + i * 0.9);
    group.add(seat);
  }
  return group;
}

export function buildExtension(THREE, shape, mats, layout) {
  const root = new THREE.Group();
  root.name = 'aircraft';
  const paint = mats.paint.clone();
  paint.clippingPlanes = [];
  const { paintDark, glass, metal, dark, interiorFloor } = mats;
  let fuse = null;
  let cabinGlass = new THREE.MeshStandardMaterial({
    color: 0x14202b,
    roughness: 0.15,
    metalness: 0.6,
    emissive: new THREE.Color(0xff5a1f),
    emissiveIntensity: 0,
  });

  if (shape === 'hercules') {
    paint.color.setHex(0xc8c2b4);
    fuse = lathe(THREE, 32, 2.15, 2.55, paint);
    root.add(fuse);
    root.add(wingPair(THREE, layout, paint, 4.35, 5.2, 16, 0.02));
    for (const eng of layout.engines) root.add(nacelle(THREE, eng.x, eng.y, eng.z, metal, dark, true));
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.4, 4.2), paint);
    fin.position.set(0, 6.2, 12.5);
    fin.castShadow = true;
    const stab = new THREE.Mesh(new THREE.BoxGeometry(12, 0.28, 2.4), paint);
    stab.position.set(0, 8.6, 13.2);
    root.add(fin, stab);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 3.2), paintDark);
    ramp.position.set(0, 1.15, 15.2);
    ramp.rotation.x = 0.4;
    root.add(ramp);
  } else if (shape === 'widebody') {
    paint.color.setHex(0xf3f5f7);
    fuse = lathe(THREE, 56, 2.65, 3.15, paint);
    root.add(fuse);
    root.add(wingPair(THREE, layout, paint, 2.15, 7.5, 24, 0.42));
    for (const eng of layout.engines) root.add(nacelle(THREE, eng.x, eng.y, eng.z, metal, dark, false));
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.2, 6.5), paint);
    fin.position.set(0, 6.4, 22);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.32, 4), paint);
    stab.position.set(0, 4.2, 24);
    root.add(fin, stab);
  } else if (shape === 'bizjet') {
    paint.color.setHex(0x3d4c5c);
    fuse = lathe(THREE, 16, 1.05, 1.65, paint);
    root.add(fuse);
    root.add(wingPair(THREE, layout, paintDark, 1.5, 2.4, 7, 0.2));
    for (const eng of layout.engines) root.add(nacelle(THREE, eng.x, eng.y, eng.z, metal, dark, false));
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 1.8), paintDark);
    fin.position.set(0, 3.1, 5.4);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.14, 1.2), paintDark);
    stab.position.set(0, 4.2, 5.6);
    root.add(fin, stab);
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.12, 6, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.4, side: THREE.DoubleSide }),
    );
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, 1.7, -1);
    root.add(stripe);
  } else if (shape === 'fighterTwin' || shape === 'fighterSingle') {
    paint.color.setHex(shape === 'fighterTwin' ? 0x9aa3ad : 0xb7c0b4);
    const pointed = [
      [0, 0.02], [0.08, 0.35], [0.18, 0.75], [0.3, 1],
      [0.62, 1], [0.8, 0.85], [0.92, 0.55], [1, 0.28],
    ];
    const length = shape === 'fighterTwin' ? 16 : 14;
    fuse = lathe(THREE, length, 0.82, 1.45, paint, pointed);
    root.add(fuse);
    root.add(wingPair(THREE, layout, paintDark, 1.35, 2.8, shape === 'fighterTwin' ? 5.5 : 4.6, 0.55));
    for (const eng of layout.engines) root.add(nacelle(THREE, eng.x, eng.y, eng.z, metal, dark, false));
    const tails = shape === 'fighterTwin' ? [-0.7, 0.7] : [0];
    for (const x of tails) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 1.3), paintDark);
      fin.position.set(x, 2.5, length * 0.36);
      fin.rotation.z = x * -0.15;
      root.add(fin);
    }
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 8), glass);
    canopy.scale.set(0.8, 0.55, 1.3);
    canopy.position.set(0, 1.85, -2.2);
    root.add(canopy);
  } else if (shape === 'helo') {
    paint.color.setHex(0xd5d8c8);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.15, 6.4), paint);
    cabin.position.set(0, 1.7, 0.2);
    cabin.castShadow = true;
    fuse = cabin;
    root.add(cabin);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), paint);
    nose.scale.set(1, 0.85, 1.2);
    nose.position.set(0, 1.65, -3.3);
    root.add(nose);
    const glassNose = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.15), glass);
    glassNose.position.set(0, 1.9, -4.2);
    glassNose.rotation.x = -0.4;
    root.add(glassNose);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 6.5), paintDark);
    boom.position.set(0, 1.9, 6.2);
    root.add(boom);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 8), dark);
    mast.position.set(0, 3.2, 0.2);
    root.add(mast);
    const hub = new THREE.Group();
    hub.position.set(0, 3.7, 0.2);
    hub.rotation.y = 0.4;
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.06, 0.28), dark);
      blade.rotation.y = (i * Math.PI) / 2;
      hub.add(blade);
    }
    root.add(hub);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.16), dark);
    tailRotor.position.set(0.35, 2.15, 9.2);
    root.add(tailRotor);
    const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 1.1), metal);
    exhaust.position.set(0.2, 3.05, -0.4);
    root.add(exhaust);
    for (const sign of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 4.2), dark);
      skid.position.set(sign * 0.9, 0.25, 0.2);
      const legA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), dark);
      legA.position.set(sign * 0.9, 0.6, -0.8);
      const legB = legA.clone();
      legB.position.z = 1.2;
      root.add(skid, legA, legB);
    }
  } else {
    fuse = lathe(THREE, 20, 1.5, 2, paint);
    root.add(fuse);
  }

  const interior = seats(THREE, interiorFloor, 0, 4);
  root.add(interior);
  const doors = doorsFor(THREE, layout.entries, dark);
  for (const door of doors) root.add(door);
  const windows = [];
  if (shape !== 'helo' && shape !== 'fighterTwin' && shape !== 'fighterSingle') {
    for (const sign of [1, -1]) {
      for (let i = 0; i < 4; i += 1) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.45), cabinGlass);
        win.position.set(sign * (shape === 'bizjet' ? 1.05 : 2.1), shape === 'bizjet' ? 1.9 : 3.2, -4 + i * 1.6);
        root.add(win);
        windows.push(win);
      }
    }
  }

  return {
    root,
    fuseMat: paint,
    interior,
    cabinGlass,
    doors,
    bay: null,
    windows,
  };
}

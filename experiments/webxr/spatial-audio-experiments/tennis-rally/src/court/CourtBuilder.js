import {
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  ShadowGenerator,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

// Regulation tennis court proportions, in meters.
export const COURT = {
  length: 23.77, // baseline to baseline
  doublesWidth: 10.97,
  singlesWidth: 8.23,
  serviceLineFromNet: 6.4,
  netHeightCenter: 0.914,
  netHeightPost: 1.07,
  surfaceMargin: 6 // extra run-off space rendered around the lines
};

const half = (v) => v / 2;

// Paints the standard tennis court line pattern onto a canvas, used as the ground texture.
// Doing this with one dynamic texture (instead of dozens of thin line meshes) keeps the
// scene's draw-call count low and the lines pixel-crisp at any camera distance.
const buildCourtTexture = (scene) => {
  const pxPerMeter = 40;
  const width = Math.ceil((COURT.doublesWidth + COURT.surfaceMargin * 2) * pxPerMeter);
  const height = Math.ceil((COURT.length + COURT.surfaceMargin * 2) * pxPerMeter);
  const texture = new DynamicTexture("courtTexture", { width, height }, scene, true);
  const ctx = texture.getContext();

  const toPxX = (x) => (x + half(COURT.doublesWidth) + COURT.surfaceMargin) * pxPerMeter;
  const toPxZ = (z) => (z + half(COURT.length) + COURT.surfaceMargin) * pxPerMeter;

  // Outdoor hard-court look: a muted blue field of play, darker green surrounds.
  ctx.fillStyle = "#1a4a63";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f3a4a";
  ctx.fillRect(
    toPxX(-half(COURT.doublesWidth)) - 4,
    toPxZ(-half(COURT.length)) - 4,
    (COURT.doublesWidth) * pxPerMeter + 8,
    (COURT.length) * pxPerMeter + 8
  );

  ctx.strokeStyle = "#f2f2f2";
  ctx.lineWidth = Math.max(2, pxPerMeter * 0.05);
  const line = (x1, z1, x2, z2) => {
    ctx.beginPath();
    ctx.moveTo(toPxX(x1), toPxZ(z1));
    ctx.lineTo(toPxX(x2), toPxZ(z2));
    ctx.stroke();
  };

  const hw = half(COURT.doublesWidth);
  const hsw = half(COURT.singlesWidth);
  const hl = half(COURT.length);
  const sl = COURT.serviceLineFromNet;

  // Baselines & sidelines (doubles).
  line(-hw, -hl, hw, -hl);
  line(-hw, hl, hw, hl);
  line(-hw, -hl, -hw, hl);
  line(hw, -hl, hw, hl);
  // Singles sidelines.
  line(-hsw, -hl, -hsw, hl);
  line(hsw, -hl, hsw, hl);
  // Service lines.
  line(-hsw, -sl, hsw, -sl);
  line(-hsw, sl, hsw, sl);
  // Center service line.
  line(0, -sl, 0, sl);
  // Net line marker + center marks on baselines.
  line(-hw, 0, hw, 0);
  line(0, hl, 0, hl - 0.4);
  line(0, -hl, 0, -hl + 0.4);

  texture.update(false);
  return texture;
};

const buildGround = (scene) => {
  const groundWidth = COURT.doublesWidth + COURT.surfaceMargin * 2;
  const groundLength = COURT.length + COURT.surfaceMargin * 2;
  const ground = MeshBuilder.CreateGround("courtGround", { width: groundWidth, height: groundLength, subdivisions: 2 }, scene);
  const material = new StandardMaterial("courtGroundMat", scene);
  material.diffuseTexture = buildCourtTexture(scene);
  material.specularColor = new Color3(0.05, 0.05, 0.05);
  ground.material = material;
  ground.receiveShadows = true;
  return ground;
};

const buildNet = (scene) => {
  const hw = half(COURT.doublesWidth) + 0.2;
  const group = new Mesh("netGroup", scene);

  const net = MeshBuilder.CreatePlane("net", { width: hw * 2, height: COURT.netHeightPost, sideOrientation: Mesh.DOUBLESIDE }, scene);
  net.position.set(0, half(COURT.netHeightPost), 0);
  const netMat = new StandardMaterial("netMat", scene);
  netMat.diffuseColor = new Color3(0.05, 0.05, 0.05);
  netMat.alpha = 0.55;
  netMat.backFaceCulling = false;
  net.material = netMat;
  net.parent = group;

  const tape = MeshBuilder.CreateBox("netTape", { width: hw * 2, height: 0.05, depth: 0.02 }, scene);
  tape.position.set(0, COURT.netHeightPost, 0);
  const tapeMat = new StandardMaterial("netTapeMat", scene);
  tapeMat.diffuseColor = new Color3(0.95, 0.95, 0.95);
  tape.material = tapeMat;
  tape.parent = group;

  const postMat = new StandardMaterial("postMat", scene);
  postMat.diffuseColor = new Color3(0.15, 0.15, 0.17);
  for (const side of [-1, 1]) {
    const post = MeshBuilder.CreateCylinder(`netPost${side}`, { height: COURT.netHeightPost + 0.15, diameter: 0.08 }, scene);
    post.position.set(side * hw, half(COURT.netHeightPost + 0.15), 0);
    post.material = postMat;
    post.parent = group;
  }
  return group;
};

// Shared tiered-stand construction, parameterized by tier count and how far back it starts
// (marginX/marginZ) — used by both venues so "seats" are the same look/material either way;
// the only difference is how many rows and how far away. Returns the outer edge of the stands
// (in Z) so a caller enclosing them in walls knows how far out to place them.
const TIER_HEIGHT = 0.9;
const TIER_DEPTH = 2.4;

const buildStands = (scene, group, { marginX, marginZ, tiers }) => {
  const standMat = new StandardMaterial("standMat", scene);
  standMat.diffuseColor = new Color3(0.32, 0.3, 0.28);
  for (const side of [-1, 1]) {
    for (let i = 0; i < tiers; i++) {
      const stand = MeshBuilder.CreateBox("standTier", { width: marginX * 2 + tiers * TIER_DEPTH, height: TIER_HEIGHT, depth: TIER_DEPTH }, scene);
      stand.position.set(0, TIER_HEIGHT * (i + 0.5), side * (marginZ + 1.5 + i * TIER_DEPTH));
      stand.material = standMat;
      stand.parent = group;
    }
  }
  return marginZ + 1.5 + tiers * TIER_DEPTH;
};

// Floodlight poles at the corners — open-air venues only; an enclosed room gets ceiling
// fixtures instead (see buildSmallVenueGeometry).
const buildFloodlightPoles = (scene, group, { marginX, marginZ, poleHeight }) => {
  const poleMat = new StandardMaterial("poleMat", scene);
  poleMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
  for (const [x, z] of [
    [marginX + 1, marginZ + 1],
    [-marginX - 1, marginZ + 1],
    [marginX + 1, -marginZ - 1],
    [-marginX - 1, -marginZ - 1]
  ]) {
    const pole = MeshBuilder.CreateCylinder("lightPole", { height: poleHeight, diameter: 0.25 }, scene);
    pole.position.set(x, half(poleHeight), z);
    pole.material = poleMat;
    pole.parent = group;

    const head = MeshBuilder.CreateBox("lightHead", { width: 1.6, height: 0.5, depth: 1 }, scene);
    head.position.set(x, poleHeight, z * 0.9);
    head.material = poleMat;
    head.parent = group;
  }
};

// Perimeter chain-link fence, pushed well back from the court — open-air venues only; an
// enclosed room has solid walls instead (see buildSmallVenueGeometry).
const buildFence = (scene, group, { marginX, marginZ }) => {
  const fenceMat = new StandardMaterial("fenceMat", scene);
  fenceMat.diffuseColor = new Color3(0.2, 0.22, 0.24);
  fenceMat.alpha = 0.35;
  fenceMat.backFaceCulling = false;
  const fenceHeight = 3;
  const fenceSpecs = [
    { w: marginX * 2, d: 0.1, x: 0, z: marginZ },
    { w: marginX * 2, d: 0.1, x: 0, z: -marginZ },
    { w: 0.1, d: marginZ * 2, x: marginX, z: 0 },
    { w: 0.1, d: marginZ * 2, x: -marginX, z: 0 }
  ];
  for (const spec of fenceSpecs) {
    const fence = MeshBuilder.CreateBox("fence", { width: spec.w, height: fenceHeight, depth: spec.d }, scene);
    fence.position.set(spec.x, half(fenceHeight), spec.z);
    fence.material = fenceMat;
    fence.parent = group;
  }
};

// Shared by both venues so there's one shape to reason about, not two — fence, 9 tiers of
// stands, tall floodlight poles. Identical geometry either way; only what wraps around it
// (nothing vs. walls+ceiling) and the lighting differ.
const VENUE_MARGIN_X = half(COURT.doublesWidth) + COURT.surfaceMargin - 0.5;
const VENUE_MARGIN_Z = half(COURT.length) + COURT.surfaceMargin - 0.5;
const VENUE_TIERS = 9;
const VENUE_POLE_HEIGHT = 18;

const buildVenueShell = (scene, group) => {
  buildFence(scene, group, { marginX: VENUE_MARGIN_X, marginZ: VENUE_MARGIN_Z });
  const standsOuterZ = buildStands(scene, group, { marginX: VENUE_MARGIN_X, marginZ: VENUE_MARGIN_Z, tiers: VENUE_TIERS });
  buildFloodlightPoles(scene, group, { marginX: VENUE_MARGIN_X, marginZ: VENUE_MARGIN_Z, poleHeight: VENUE_POLE_HEIGHT });
  return standsOuterZ;
};

// A big open-air bowl — enough context to read as "a big stadium somewhere", not a photoreal
// venue.
const buildLargeVenueGeometry = (scene) => {
  const group = new Mesh("largeVenueGroup", scene);
  buildVenueShell(scene, group);
  return group;
};

// The exact same shell as the large venue (identical fence/stands/poles) — just wrapped in
// walls and a ceiling well outside all of it, like a 2-story building around an outdoor-style
// court. This keeps floor/net/seats visually identical between both venues (only the enclosure
// and lighting change), while giving the small/closed audio preset (tight falloff, strong fast
// reflections, no room for a long tail) a visual space that's actually consistent with it: you
// can see there's nowhere far for the sound to go, and nothing distant to reflect off of.
const buildSmallVenueGeometry = (scene) => {
  const group = new Mesh("smallVenueGroup", scene);
  const standsOuterZ = buildVenueShell(scene, group);

  const wallMat = new StandardMaterial("smallVenueWallMat", scene);
  wallMat.diffuseColor = new Color3(0.62, 0.6, 0.52);
  wallMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const wallHeight = VENUE_POLE_HEIGHT + 4; // clears the floodlight poles with headroom
  const wallMarginX = VENUE_MARGIN_X + VENUE_TIERS * TIER_DEPTH + 2;
  const wallMarginZ = standsOuterZ + 2;
  const wallSpecs = [
    { w: wallMarginX * 2, d: 0.3, x: 0, z: wallMarginZ },
    { w: wallMarginX * 2, d: 0.3, x: 0, z: -wallMarginZ },
    { w: 0.3, d: wallMarginZ * 2, x: wallMarginX, z: 0 },
    { w: 0.3, d: wallMarginZ * 2, x: -wallMarginX, z: 0 }
  ];
  for (const spec of wallSpecs) {
    const wall = MeshBuilder.CreateBox("smallVenueWall", { width: spec.w, height: wallHeight, depth: spec.d }, scene);
    wall.position.set(spec.x, half(wallHeight), spec.z);
    wall.material = wallMat;
    wall.parent = group;
  }

  const ceilingMat = new StandardMaterial("smallVenueCeilingMat", scene);
  ceilingMat.diffuseColor = new Color3(0.3, 0.3, 0.32);
  ceilingMat.backFaceCulling = false;
  const ceiling = MeshBuilder.CreatePlane("smallVenueCeiling", { width: wallMarginX * 2, height: wallMarginZ * 2, sideOrientation: Mesh.DOUBLESIDE }, scene);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, wallHeight, 0);
  ceiling.material = ceilingMat;
  ceiling.parent = group;

  // A few overhead fixtures read as indoor arena lighting rather than daylight/floodlights.
  const fixtureMat = new StandardMaterial("smallVenueFixtureMat", scene);
  fixtureMat.emissiveColor = new Color3(0.9, 0.9, 0.85);
  fixtureMat.diffuseColor = new Color3(0.9, 0.9, 0.85);
  for (const z of [-wallMarginZ * 0.5, 0, wallMarginZ * 0.5]) {
    const fixture = MeshBuilder.CreateBox("smallVenueFixture", { width: 3, height: 0.15, depth: 0.6 }, scene);
    fixture.position.set(0, wallHeight - 0.2, z);
    fixture.material = fixtureMat;
    fixture.parent = group;
  }

  return group;
};

const buildLighting = (scene) => {
  const hemi = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;
  hemi.groundColor = new Color3(0.25, 0.25, 0.3);

  const sun = new DirectionalLight("sunLight", new Vector3(-0.5, -1, 0.4), scene);
  sun.intensity = 1.1;
  sun.position = new Vector3(20, 30, -15);

  const shadowGenerator = new ShadowGenerator(1024, sun);
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.bias = 0.001;

  scene.clearColor = new Color4(0.55, 0.72, 0.85, 1);

  return { hemi, sun, shadowGenerator };
};

export class CourtBuilder {
  constructor(scene) {
    this.scene = scene;
    this.ground = buildGround(scene);
    this.net = buildNet(scene);
    this.largeVenue = buildLargeVenueGeometry(scene);
    this.smallVenue = buildSmallVenueGeometry(scene);
    const { hemi, sun, shadowGenerator } = buildLighting(scene);
    this.hemi = hemi;
    this.sun = sun;
    this.shadowGenerator = shadowGenerator;

    this.venuePreset = "small";
    this.setVenuePreset(this.venuePreset);
  }

  get courtCenter() {
    return Vector3.Zero();
  }

  // Keeps the visuals honest with whatever the audio venue preset claims: an enclosed room
  // shouldn't still look like it's sitting under open sky, and a big stadium shouldn't look like
  // a boxed-in gym. Toggles which geometry group is visible and nudges lighting/sky to match —
  // dimmer, warmer indoor light with no visible sky for "small", bright daylight for "large".
  setVenuePreset(preset) {
    const isSmall = preset === "small";
    this.venuePreset = isSmall ? "small" : "large";
    this.smallVenue.setEnabled(isSmall);
    this.largeVenue.setEnabled(!isSmall);
    this.sun.intensity = isSmall ? 0.25 : 1.1;
    this.hemi.intensity = isSmall ? 0.85 : 0.55;
    this.scene.clearColor = isSmall ? new Color4(0.08, 0.08, 0.09, 1) : new Color4(0.55, 0.72, 0.85, 1);
  }
}

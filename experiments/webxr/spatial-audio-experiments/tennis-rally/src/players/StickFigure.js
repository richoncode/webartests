import { Color3, MeshBuilder, StandardMaterial, TransformNode } from "@babylonjs/core";

const BODY = {
  hipHeight: 0.9,
  shoulderHeight: 1.42,
  headRadius: 0.13,
  torsoRadius: 0.14,
  upperArmLength: 0.32,
  foreArmLength: 0.3,
  thighLength: 0.45,
  shinLength: 0.45,
  limbRadius: 0.055,
  racketHandleLength: 0.28,
  racketHeadRadius: 0.16
};

const makeSegment = (name, length, radius, parent, material, scene) => {
  const pivot = new TransformNode(`${name}Pivot`, scene);
  pivot.parent = parent;
  const mesh = MeshBuilder.CreateCapsule(name, { height: length, radius, tessellation: 8, subdivisions: 1 }, scene);
  mesh.position.y = -length / 2;
  mesh.material = material;
  mesh.parent = pivot;
  const end = new TransformNode(`${name}End`, scene);
  end.position.y = -length;
  end.parent = pivot;
  return { pivot, end };
};

const buildRacket = (scene, material, accentMaterial) => {
  const racket = new TransformNode("racket", scene);
  const handle = MeshBuilder.CreateCylinder("racketHandle", { height: BODY.racketHandleLength, diameter: 0.028 }, scene);
  handle.position.y = BODY.racketHandleLength / 2;
  handle.material = material;
  handle.parent = racket;

  const throat = new TransformNode("racketThroat", scene);
  throat.position.y = BODY.racketHandleLength;
  throat.parent = racket;

  const head = MeshBuilder.CreateTorus("racketHead", { diameter: BODY.racketHeadRadius * 2, thickness: 0.022, tessellation: 20 }, scene);
  head.position.y = BODY.racketHandleLength + BODY.racketHeadRadius;
  head.material = accentMaterial;
  head.parent = racket;

  const strings = MeshBuilder.CreateDisc("racketStrings", { radius: BODY.racketHeadRadius * 0.86, tessellation: 24 }, scene);
  strings.position.y = BODY.racketHandleLength + BODY.racketHeadRadius;
  strings.rotation.x = Math.PI / 2;
  const stringsMat = new StandardMaterial("racketStringsMat", scene);
  stringsMat.diffuseColor = new Color3(0.9, 0.92, 0.85);
  stringsMat.alpha = 0.35;
  stringsMat.backFaceCulling = false;
  strings.material = stringsMat;
  strings.parent = racket;

  // The point BallController/audio treat as "the racket" — center of the strung head.
  const sweetSpot = new TransformNode("racketSweetSpot", scene);
  sweetSpot.position.y = BODY.racketHandleLength + BODY.racketHeadRadius;
  sweetSpot.parent = racket;

  return { root: racket, sweetSpot };
};

// Builds one procedural stick-figure rig and returns handles to the joints a
// PlayerController needs to animate: hips, shoulders, both arms, both legs, and the racket.
export const buildStickFigure = (scene, { name, jerseyColor, skinColor }) => {
  const root = new TransformNode(`${name}Root`, scene);

  const bodyMat = new StandardMaterial(`${name}BodyMat`, scene);
  bodyMat.diffuseColor = jerseyColor;
  const skinMat = new StandardMaterial(`${name}SkinMat`, scene);
  skinMat.diffuseColor = skinColor;
  const racketMat = new StandardMaterial(`${name}RacketMat`, scene);
  racketMat.diffuseColor = new Color3(0.12, 0.12, 0.12);
  const racketAccentMat = new StandardMaterial(`${name}RacketAccentMat`, scene);
  racketAccentMat.diffuseColor = new Color3(0.85, 0.15, 0.2);

  const hips = new TransformNode(`${name}Hips`, scene);
  hips.position.y = BODY.hipHeight;
  hips.parent = root;

  const torso = MeshBuilder.CreateCapsule(`${name}Torso`, {
    height: BODY.shoulderHeight - BODY.hipHeight,
    radius: BODY.torsoRadius,
    tessellation: 10
  }, scene);
  torso.position.y = (BODY.shoulderHeight - BODY.hipHeight) / 2;
  torso.material = bodyMat;
  torso.parent = hips;

  const shoulders = new TransformNode(`${name}Shoulders`, scene);
  shoulders.position.y = BODY.shoulderHeight - BODY.hipHeight;
  shoulders.parent = hips;

  const head = MeshBuilder.CreateSphere(`${name}Head`, { diameter: BODY.headRadius * 2, segments: 10 }, scene);
  head.position.y = BODY.headRadius * 1.35;
  head.material = skinMat;
  head.parent = shoulders;

  const buildArm = (side) => {
    const shoulderPivot = new TransformNode(`${name}Shoulder${side}`, scene);
    shoulderPivot.position.x = side * 0.16;
    shoulderPivot.parent = shoulders;
    const upper = makeSegment(`${name}UpperArm${side}`, BODY.upperArmLength, BODY.limbRadius, shoulderPivot, skinMat, scene);
    const fore = makeSegment(`${name}ForeArm${side}`, BODY.foreArmLength, BODY.limbRadius * 0.9, upper.end, skinMat, scene);
    return { shoulderPivot, elbowPivot: fore.pivot, wristEnd: fore.end };
  };

  const buildLeg = (side) => {
    const hipPivot = new TransformNode(`${name}Hip${side}`, scene);
    hipPivot.position.x = side * 0.12;
    hipPivot.parent = hips;
    const thigh = makeSegment(`${name}Thigh${side}`, BODY.thighLength, BODY.limbRadius * 1.15, hipPivot, bodyMat, scene);
    const shin = makeSegment(`${name}Shin${side}`, BODY.shinLength, BODY.limbRadius, thigh.end, skinMat, scene);
    return { hipPivot, kneePivot: shin.pivot };
  };

  const dominantArm = buildArm(1);
  const offArm = buildArm(-1);
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  const racket = buildRacket(scene, racketMat, racketAccentMat);
  racket.root.parent = dominantArm.wristEnd;
  racket.root.rotation.x = -Math.PI / 2.1;

  return {
    root,
    hips,
    shoulders,
    dominantArm,
    offArm,
    leftLeg,
    rightLeg,
    racket
  };
};

export const STICK_FIGURE_BODY = BODY;

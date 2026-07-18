import React from 'react';
import * as THREE from 'three';
import { CameraRigConfiguration, VenueCoordinateAnchor } from '../types';
import { sphericalToCartesian, cartesianToSpherical } from '../mathUtils';

interface SidebarLeftProps {
  rig: CameraRigConfiguration;
  setRig: React.Dispatch<React.SetStateAction<CameraRigConfiguration>>;
  coordinateAnchors: VenueCoordinateAnchor[];
  onCommitState: (newRig: CameraRigConfiguration) => void;
  unit: 'feet' | 'meters';
  floating?: boolean;
}

interface CameraProfile {
  id: string;
  name: string;
  focalLengthMm: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  notes: string;
  builtIn?: boolean;
}

const fovToSensorSize = (fovDeg: number, focalLengthMm: number) =>
  2 * focalLengthMm * Math.tan((fovDeg * Math.PI) / 360);

const computeFov = (sensorSizeMm: number, focalLengthMm: number) =>
  (2 * Math.atan(sensorSizeMm / (2 * focalLengthMm)) * 180) / Math.PI;

const baseSuper35Width = fovToSensorSize(96.4, 11);
const baseSuper35Height = fovToSensorSize(64.2, 11);
const actualFocalDistance = 1577.403;
const defaultCropScale = actualFocalDistance / 11;

const builtinCameraProfiles: CameraProfile[] = [
  {
    id: 'full-frame-11mm',
    name: '11mm Full Frame',
    focalLengthMm: 11,
    sensorWidthMm: fovToSensorSize(120, 11),
    sensorHeightMm: fovToSensorSize(84.8, 11),
    notes: 'Normal full-frame 11mm reference from provided FoV: 120.0° H / 84.8° V.',
    builtIn: true
  },
  {
    id: 'super35-11mm',
    name: '11mm Super 35 Crop',
    focalLengthMm: 11,
    sensorWidthMm: baseSuper35Width,
    sensorHeightMm: baseSuper35Height,
    notes: 'Approximate 60 fps crop reference: 96.4° H / 64.2° V.',
    builtIn: true
  },
  {
    id: 's35-plus-5-11mm',
    name: '11mm 60fps Crop +5%',
    focalLengthMm: 11,
    sensorWidthMm: baseSuper35Width * 1.05,
    sensorHeightMm: baseSuper35Height * 1.05,
    notes: 'Working estimate: roughly 5% wider than Super 35 based on field comparison.',
    builtIn: true
  },
  {
    id: 'actual-s35-plus-9-6-11mm',
    name: 'Actual: 11mm 60fps Crop +9.6%',
    focalLengthMm: 11,
    sensorWidthMm: 26.97272556282721,
    sensorHeightMm: 15.128189201125458,
    notes: 'Actual working estimate from field alignment: 104.4% of the 11mm 60fps Crop +5% profile, or about 9.6% wider than Super 35.',
    builtIn: true
  },
  {
    id: 'actual-focal-1577',
    name: 'Actual',
    focalLengthMm: actualFocalDistance,
    sensorWidthMm: baseSuper35Width * 1.05 * defaultCropScale,
    sensorHeightMm: baseSuper35Height * 1.05 * defaultCropScale,
    notes: 'Actual camera profile seeded from the default 60fps crop estimate with focal distance 1577.403 in matching calibration units.',
    builtIn: true
  }
];

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  rig,
  setRig,
  coordinateAnchors,
  onCommitState,
  unit,
  floating = false
}) => {
  const [isPositionOpen, setIsPositionOpen] = React.useState(true);
  const [isAlignmentOpen, setIsAlignmentOpen] = React.useState(false);
  const [isVergenceOpen, setIsVergenceOpen] = React.useState(false);
  const [isTargetDetailsOpen, setIsTargetDetailsOpen] = React.useState(false);
  const [cameraHelpOpen, setCameraHelpOpen] = React.useState(false);
  const [customCameraProfiles, setCustomCameraProfiles] = React.useState<CameraProfile[]>(() => {
    try {
      const saved = localStorage.getItem('hyperstereo-camera-profiles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cameraModalOpen, setCameraModalOpen] = React.useState(false);
  const [cameraModalMode, setCameraModalMode] = React.useState<'add' | 'edit'>('add');
  const [draftCamera, setDraftCamera] = React.useState<CameraProfile | null>(null);
  const [draftBaseCameraId, setDraftBaseCameraId] = React.useState('actual-s35-plus-9-6-11mm');
  const [draftCropScalePercent, setDraftCropScalePercent] = React.useState(100);

  const METERS_TO_FEET = 3.28084;
  const toDisp = (val: number) => (unit === 'feet' ? val * METERS_TO_FEET : val);
  const fromDisp = (val: number) => (unit === 'feet' ? val / METERS_TO_FEET : val);
  const dispUnit = unit === 'feet' ? 'ft' : 'm';
  const defaultRigHeightMeters = 15 / METERS_TO_FEET;
  const baselinePresets = [
    { label: 'Human', meters: 0.065 },
    { label: "1'", meters: 1 / METERS_TO_FEET },
    { label: "2'", meters: 2 / METERS_TO_FEET },
    { label: "3'", meters: 3 / METERS_TO_FEET },
    { label: "4'", meters: 4 / METERS_TO_FEET },
    { label: "8'", meters: 8 / METERS_TO_FEET },
    { label: "12'", meters: 12 / METERS_TO_FEET },
    { label: "16'", meters: 16 / METERS_TO_FEET }
  ];
  const cameraProfiles = [...builtinCameraProfiles, ...customCameraProfiles];
  const customCameraProfile: CameraProfile = {
    id: 'custom',
    name: 'Custom FoV',
    focalLengthMm: 11,
    sensorHeightMm: fovToSensorSize(rig.fov, 11),
    sensorWidthMm: fovToSensorSize(rig.fov, 11) * rig.aspect,
    notes: 'Manual FoV override from the Camera FoV slider.'
  };
  const selectedCameraProfile =
    rig.cameraProfileId === 'custom' ? customCameraProfile :
    cameraProfiles.find(profile => profile.id === rig.cameraProfileId) ||
    cameraProfiles.find(profile => Math.abs(computeFov(profile.sensorHeightMm, profile.focalLengthMm) - rig.fov) < 0.05) ||
    cameraProfiles[0];
  const selectedHorizontalFov = computeFov(selectedCameraProfile.sensorWidthMm, selectedCameraProfile.focalLengthMm);
  const selectedVerticalFov = computeFov(selectedCameraProfile.sensorHeightMm, selectedCameraProfile.focalLengthMm);

  React.useEffect(() => {
    localStorage.setItem('hyperstereo-camera-profiles', JSON.stringify(customCameraProfiles));
  }, [customCameraProfiles]);

  const targetPresetPoints = coordinateAnchors.filter(p => p.id.startsWith('target-'));
  const lookAtOptions = targetPresetPoints.length > 0
    ? targetPresetPoints
    : coordinateAnchors.filter(p => !p.id.startsWith('camera-'));
  const matchingAnchor = lookAtOptions.find(
    a => Math.abs(a.position.x - rig.lookAtTarget.x) < 0.01 &&
         Math.abs(a.position.y - rig.lookAtTarget.y) < 0.01 &&
         Math.abs(a.position.z - rig.lookAtTarget.z) < 0.01
  );
  const cameraPlacementPoints = coordinateAnchors.filter(p => p.id.startsWith('camera-'));
  const rigPlacementPoints = cameraPlacementPoints.length > 0 ? cameraPlacementPoints : coordinateAnchors;
  const centerCourt = coordinateAnchors.find(p => p.id === 'center-court') || coordinateAnchors.find(p => p.id === 'origin');
  const centerCourtPosition = centerCourt?.position || { x: 0, y: 0, z: 0 };
  const distanceMode = rig.sphericalDistanceMode === 'target' ? 'direct' : (rig.sphericalDistanceMode || 'direct');
  const measureTarget = rig.sphericalMeasureTarget || 'target';
  const rigPosition = new THREE.Vector3(rig.x, rig.y, rig.z);
  const getNearCourtEdgePoint = () => {
    const halfLength = Math.max(
      Math.abs(coordinateAnchors.find(p => p.id === 'near-baseline')?.position.x ?? -11.89),
      Math.abs(coordinateAnchors.find(p => p.id === 'far-baseline')?.position.x ?? 11.89)
    );
    const halfWidth = 5.485;
    const clampedX = Math.max(-halfLength, Math.min(halfLength, rig.x));
    const clampedY = Math.max(-halfWidth, Math.min(halfWidth, rig.y));
    const edgeCandidates = [
      new THREE.Vector3(-halfLength, clampedY, 0),
      new THREE.Vector3(halfLength, clampedY, 0),
      new THREE.Vector3(clampedX, -halfWidth, 0),
      new THREE.Vector3(clampedX, halfWidth, 0)
    ];
    return edgeCandidates.reduce((closest, candidate) => (
      candidate.distanceToSquared(rigPosition) < closest.distanceToSquared(rigPosition) ? candidate : closest
    ));
  };
  const getMeasurePoint = () => {
    if (measureTarget === 'center-court') {
      return new THREE.Vector3(centerCourtPosition.x, centerCourtPosition.y, centerCourtPosition.z || 0);
    }
    if (measureTarget === 'near-edge') {
      return getNearCourtEdgePoint();
    }
    return new THREE.Vector3(rig.lookAtTarget.x, rig.lookAtTarget.y, rig.lookAtTarget.z);
  };
  const measurePoint = getMeasurePoint();
  const horizontalMeasureDistance = Math.hypot(rig.x - measurePoint.x, rig.y - measurePoint.y);
  const directMeasureDistance = rigPosition.distanceTo(measurePoint);
  const activeDistance = distanceMode === 'direct' ? directMeasureDistance : horizontalMeasureDistance;
  const convergenceTargetPosition = new THREE.Vector3(
    rig.convergenceTarget.x,
    rig.convergenceTarget.y,
    rig.convergenceTarget.z
  );
  const rigLookTargetPosition = rig.lookAtTargetEnabled
    ? new THREE.Vector3(rig.lookAtTarget.x, rig.lookAtTarget.y, rig.lookAtTarget.z)
    : convergenceTargetPosition.clone();
  const rigLookDirection = rigLookTargetPosition.clone().sub(rigPosition);
  if (rigLookDirection.lengthSq() < 0.000001) {
    rigLookDirection.set(1, 0, 0);
  } else {
    rigLookDirection.normalize();
  }
  const convergenceDistance = Math.max(0.001, rigPosition.distanceTo(convergenceTargetPosition));
  const inferredToeInDeg = rig.parallel || rig.actualCameras
    ? 0
    : (Math.atan2(rig.baselineMeters / 2, convergenceDistance) * 180) / Math.PI;
  const vergenceAngleDeg = rig.actualCameras ? 0 : (rig.vergenceAngleDeg ?? inferredToeInDeg);
  const vergenceAngleLabel = `${vergenceAngleDeg > 0 ? '+' : ''}${vergenceAngleDeg.toFixed(2)}°`;
  const isVergenceParallel = Math.abs(vergenceAngleDeg) < 0.001;
  const perEyeToeInDeg = rig.actualCameras
    ? 0
    : vergenceAngleDeg;
  const includedToeInDeg = perEyeToeInDeg * 2;
  const convergenceModeLabel = rig.actualCameras
    ? 'Actual Parallel'
    : Math.abs(vergenceAngleDeg) < 0.001
      ? 'Parallel'
      : vergenceAngleDeg > 0
        ? 'Toe-In'
        : 'Toe-Out';
  const convergenceIcon = Math.abs(vergenceAngleDeg) < 0.001 || rig.actualCameras ? '||' : (vergenceAngleDeg > 0 ? '∠' : '∨');
  const convergenceStatusTooltip = `${convergenceModeLabel}: ${perEyeToeInDeg.toFixed(2)}° per eye, ${includedToeInDeg.toFixed(2)}° included. Positive is toe-in/convergence; negative is toe-out/divergence; 0° is parallel.`;
  const matchingRigPlacement = rigPlacementPoints.find((p) => {
    const targetZ = p.position.z === 0 ? defaultRigHeightMeters : p.position.z;
    return Math.abs(p.position.x - rig.x) < 0.01 &&
      Math.abs(p.position.y - rig.y) < 0.01 &&
      Math.abs(targetZ - rig.z) < 0.01;
  });

  const syncLookAtOrientation = (updated: CameraRigConfiguration) => {
    if (!updated.lookAtTargetEnabled) return;

    const lookMatrix = new THREE.Matrix4();
    const eye = new THREE.Vector3(updated.x, updated.y, updated.z);
    const target = new THREE.Vector3(updated.lookAtTarget.x, updated.lookAtTarget.y, updated.lookAtTarget.z);
    const up = new THREE.Vector3(0, 0, 1);
    lookMatrix.lookAt(eye, target, up);

    const q = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
    const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    updated.yaw = Math.round((euler.y * 180) / Math.PI);
    updated.pitch = Math.round((euler.x * 180) / Math.PI);
    updated.roll = Math.round((euler.z * 180) / Math.PI);
  };

  const syncSphericalFromPosition = (updated: CameraRigConfiguration) => {
    const spher = cartesianToSpherical(
      centerCourtPosition.x,
      centerCourtPosition.y,
      updated.x,
      updated.y,
      updated.z
    );
    updated.sphericalAzimuth = Math.round(spher.azimuthDeg * 100) / 100;
    updated.sphericalDistance = Math.round(spher.distance * 100) / 100;
    updated.sphericalElevation = Math.round(spher.elevation * 100) / 100;
  };

  const updateRigValue = (key: keyof CameraRigConfiguration, value: any) => {
    const updated = { ...rig, [key]: value };
    if ([
      'x',
      'y',
      'z',
      'baselineMeters',
      'yaw',
      'pitch',
      'roll',
      'lookAtTarget',
      'sphericalAzimuth',
      'sphericalDistance',
      'sphericalElevation'
    ].includes(key)) {
      updated.actualCameras = undefined;
    }

    // Sync Cartesian and Spherical coordinates when editing
    if (rig.sphericalMode) {
      if (['sphericalAzimuth', 'sphericalDistance', 'sphericalElevation'].includes(key)) {
        const cart = sphericalToCartesian(
          centerCourtPosition.x,
          centerCourtPosition.y,
          updated.sphericalAzimuth,
          updated.sphericalDistance,
          updated.sphericalElevation
        );
        updated.x = cart.x;
        updated.y = cart.y;
        updated.z = cart.z;
      }
    } else {
      if (['x', 'y', 'z'].includes(key)) {
        syncSphericalFromPosition(updated);
      }
    }

    syncLookAtOrientation(updated);

    setRig(updated);
  };

  const setDistanceMode = (mode: 'horizontal' | 'direct') => {
    if (mode === distanceMode) return;
    const updated = { ...rig, sphericalDistanceMode: mode };
    setRig(updated);
    onCommitState(updated);
  };

  const setMeasureTarget = (target: 'near-edge' | 'target' | 'center-court') => {
    if (target === measureTarget) return;
    const updated = { ...rig, sphericalMeasureTarget: target };
    setRig(updated);
    onCommitState(updated);
  };

  const setDirectDistance = (distanceMeters: number) => {
    const origin = getMeasurePoint();
    let direction = new THREE.Vector3(rig.x, rig.y, rig.z).sub(origin);

    if (direction.lengthSq() < 0.000001) {
      const azimuthRad = (rig.sphericalAzimuth * Math.PI) / 180;
      direction = new THREE.Vector3(
        Math.cos(azimuthRad),
        Math.sin(azimuthRad),
        Math.max(0.1, rig.sphericalElevation - origin.z)
      );
    }

    direction.normalize();
    const position = origin.add(direction.multiplyScalar(Math.max(0.05, distanceMeters)));
    const updated = {
      ...rig,
      actualCameras: undefined,
      x: position.x,
      y: position.y,
      z: position.z
    };

    syncSphericalFromPosition(updated);
    syncLookAtOrientation(updated);
    setRig(updated);
  };

  const setHorizontalMeasureDistance = (distanceMeters: number) => {
    const origin = getMeasurePoint();
    let direction = new THREE.Vector2(rig.x - origin.x, rig.y - origin.y);

    if (direction.lengthSq() < 0.000001) {
      const azimuthRad = (rig.sphericalAzimuth * Math.PI) / 180;
      direction = new THREE.Vector2(Math.cos(azimuthRad), Math.sin(azimuthRad));
    }

    direction.normalize();
    const updated = {
      ...rig,
      actualCameras: undefined,
      x: origin.x + direction.x * Math.max(0.05, distanceMeters),
      y: origin.y + direction.y * Math.max(0.05, distanceMeters)
    };

    syncSphericalFromPosition(updated);
    syncLookAtOrientation(updated);
    setRig(updated);
  };

  const setVergenceAngle = (angleDeg: number) => {
    const adjustedAngleDeg = Math.abs(angleDeg) < 0.1 ? 0 : angleDeg;
    const angleRad = (adjustedAngleDeg * Math.PI) / 180;
    const target = Math.abs(adjustedAngleDeg) < 0.001
      ? rigLookTargetPosition.clone()
      : rigPosition.clone().addScaledVector(
          rigLookDirection,
          (rig.baselineMeters / 2) / Math.tan(angleRad)
        );
    setRig({
      ...rig,
      actualCameras: undefined,
      parallel: Math.abs(adjustedAngleDeg) < 0.001,
      vergenceAngleDeg: adjustedAngleDeg,
      convergenceTarget: {
        x: target.x,
        y: target.y,
        z: target.z
      }
    });
  };

  const handleSliderCommit = () => {
    onCommitState(rig);
  };

  // Toggle coordinate modes
  const handleModeToggle = (mode: 'cartesian' | 'spherical') => {
    const isSpher = mode === 'spherical';
    if (isSpher === rig.sphericalMode) return;

    const updated = { ...rig, sphericalMode: isSpher };
    if (isSpher) {
      // Calculate spherical parameters based on current Cartesian position
      const spher = cartesianToSpherical(centerCourtPosition.x, centerCourtPosition.y, rig.x, rig.y, rig.z);
      updated.sphericalAzimuth = Math.round(spher.azimuthDeg * 10) / 10;
      updated.sphericalDistance = Math.round(spher.distance * 100) / 100;
      updated.sphericalElevation = Math.round(spher.elevation * 100) / 100;
    } else {
      // Cartesian are already in sync
    }
    
    setRig(updated);
    onCommitState(updated);
  };

  // Snaps the rig center to specific coordinate anchors on the court
  const snapToPoint = (point: VenueCoordinateAnchor) => {
    const actualBaseline = point.actualCameras
      ? new THREE.Vector3(
          point.actualCameras.leftPosition.x,
          point.actualCameras.leftPosition.y,
          point.actualCameras.leftPosition.z
        ).distanceTo(new THREE.Vector3(
          point.actualCameras.rightPosition.x,
          point.actualCameras.rightPosition.y,
          point.actualCameras.rightPosition.z
        ))
      : rig.baselineMeters;
    const actualAimTarget = point.actualCameras
      ? (() => {
          const viewDirection = new THREE.Vector3(
            point.actualCameras.viewDirection.x,
            point.actualCameras.viewDirection.y,
            point.actualCameras.viewDirection.z
          ).normalize();
          const t = Math.abs(viewDirection.z) > 0.0001
            ? -point.position.z / viewDirection.z
            : 10;
          return point.position.clone().addScaledVector(viewDirection, Math.max(0, t));
        })()
      : null;
    const updated = {
      ...rig,
      actualCameras: point.actualCameras,
      parallel: point.actualCameras ? true : rig.parallel,
      x: point.position.x,
      y: point.position.y,
      z: point.position.z === 0 ? defaultRigHeightMeters : point.position.z,
      baselineMeters: actualBaseline,
      lookAtTargetEnabled: true,
      lookAtTarget: actualAimTarget
        ? { x: actualAimTarget.x, y: actualAimTarget.y, z: actualAimTarget.z }
        : rig.lookAtTarget,
      convergenceTarget: actualAimTarget
        ? { x: actualAimTarget.x, y: actualAimTarget.y, z: actualAimTarget.z }
        : rig.convergenceTarget
    };

    // Keep spherical values synchronized
    const spher = cartesianToSpherical(centerCourtPosition.x, centerCourtPosition.y, updated.x, updated.y, updated.z);
    
    updated.sphericalAzimuth = Math.round(spher.azimuthDeg * 10) / 10;
    updated.sphericalDistance = Math.round(spher.distance * 100) / 100;
    updated.sphericalElevation = Math.round(spher.elevation * 100) / 100;

    if (updated.lookAtTargetEnabled) {
      const lookMatrix = new THREE.Matrix4();
      const eye = new THREE.Vector3(updated.x, updated.y, updated.z);
      const target = new THREE.Vector3(updated.lookAtTarget.x, updated.lookAtTarget.y, updated.lookAtTarget.z);
      const up = new THREE.Vector3(0, 0, 1);
      lookMatrix.lookAt(eye, target, up);
      
      const q = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
      const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
      updated.yaw = Math.round((euler.y * 180) / Math.PI);
      updated.pitch = Math.round((euler.x * 180) / Math.PI);
      updated.roll = Math.round((euler.z * 180) / Math.PI);
    }

    setRig(updated);
    onCommitState(updated);
  };

  const setCameraBaseline = (baselineMeters: number) => {
    const updated = {
      ...rig,
      actualCameras: undefined,
      baselineMeters
    };

    setRig(updated);
    onCommitState(updated);
  };

  const applyCameraProfile = (profile: CameraProfile) => {
    if (profile.id === 'custom') {
      const updated = { ...rig, cameraProfileId: 'custom' };
      setRig(updated);
      onCommitState(updated);
      return;
    }

    const updated = {
      ...rig,
      cameraProfileId: profile.id,
      fov: Math.round(computeFov(profile.sensorHeightMm, profile.focalLengthMm) * 10) / 10
    };
    setRig(updated);
    onCommitState(updated);
  };

  const getCameraProfileById = (id: string) => (
    id === 'custom'
      ? customCameraProfile
      : cameraProfiles.find(profile => profile.id === id)
  );

  const setDraftFromBaseProfile = (profile: CameraProfile, mode: 'add' | 'edit' = cameraModalMode) => {
    setDraftBaseCameraId(profile.id);
    setDraftCropScalePercent(100);
    setDraftCamera(mode === 'add'
      ? createCameraDraftFromProfile(profile)
      : { ...profile }
    );
  };

  const setDraftCropScale = (percent: number) => {
    const baseProfile = getCameraProfileById(draftBaseCameraId);
    if (!draftCamera || !baseProfile) return;

    const scale = percent / 100;
    setDraftCropScalePercent(percent);
    setDraftCamera({
      ...draftCamera,
      focalLengthMm: baseProfile.focalLengthMm,
      sensorWidthMm: baseProfile.sensorWidthMm * scale,
      sensorHeightMm: baseProfile.sensorHeightMm * scale
    });
  };

  const openCameraModal = (mode: 'add' | 'edit') => {
    setCameraModalMode(mode);
    setDraftFromBaseProfile(selectedCameraProfile, mode);
    setCameraModalOpen(true);
  };

  const createCameraDraftFromProfile = (profile: CameraProfile): CameraProfile => ({
    id: `camera-${Date.now()}`,
    name: `New ${profile.name}`,
    focalLengthMm: profile.focalLengthMm,
    sensorWidthMm: profile.sensorWidthMm,
    sensorHeightMm: profile.sensorHeightMm,
    notes: profile.notes ? `Started from ${profile.name}. ${profile.notes}` : `Started from ${profile.name}.`
  });

  const saveCameraProfile = () => {
    if (!draftCamera) return;
    const profileId = draftCamera.builtIn ? `camera-${Date.now()}` : draftCamera.id;
    const cleanProfile = {
      ...draftCamera,
      id: profileId,
      name: draftCamera.name.trim() || 'Custom Camera',
      focalLengthMm: Math.max(0.1, draftCamera.focalLengthMm),
      sensorWidthMm: Math.max(0.1, draftCamera.sensorWidthMm),
      sensorHeightMm: Math.max(0.1, draftCamera.sensorHeightMm),
      builtIn: false
    };
    const profileToSave = { ...cleanProfile };
    setCustomCameraProfiles(prev => {
      const withoutExisting = prev.filter(profile => profile.id !== profileToSave.id);
      return [...withoutExisting, profileToSave];
    });
    applyCameraProfile(profileToSave);
    setCameraModalOpen(false);
  };

  const exportCameraProfile = async () => {
    if (!draftCamera) return;
    const payload = {
      ...draftCamera,
      computedHorizontalFovDeg: Math.round(computeFov(draftCamera.sensorWidthMm, draftCamera.focalLengthMm) * 10) / 10,
      computedVerticalFovDeg: Math.round(computeFov(draftCamera.sensorHeightMm, draftCamera.focalLengthMm) * 10) / 10
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      console.log(text);
    }
  };

  const setManualFov = (fov: number) => {
    setRig({
      ...rig,
      cameraProfileId: 'custom',
      fov
    });
  };

  const setTargetPoint = (point: VenueCoordinateAnchor) => {
    const updated = {
      ...rig,
      actualCameras: undefined,
      lookAtTargetEnabled: true,
      lookAtTarget: { x: point.position.x, y: point.position.y, z: point.position.z }
    };

    const lookMatrix = new THREE.Matrix4();
    const eye = new THREE.Vector3(updated.x, updated.y, updated.z);
    const target = new THREE.Vector3(updated.lookAtTarget.x, updated.lookAtTarget.y, updated.lookAtTarget.z);
    lookMatrix.lookAt(eye, target, new THREE.Vector3(0, 0, 1));
    const q = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
    const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    updated.yaw = Math.round((euler.y * 180) / Math.PI);
    updated.pitch = Math.round((euler.x * 180) / Math.PI);
    updated.roll = Math.round((euler.z * 180) / Math.PI);

    setRig(updated);
    onCommitState(updated);
  };

  return (
    <div className="sidebar" style={{
      width: floating ? 'min(360px, 34vw)' : '320px',
      background: floating ? 'rgba(18,18,18,0.9)' : '#161616',
      borderRight: floating ? '1px solid rgba(91,155,213,0.35)' : '1px solid #222',
      border: floating ? '1px solid rgba(91,155,213,0.35)' : undefined,
      borderRadius: floating ? '8px' : undefined,
      display: 'flex',
      flexDirection: 'column',
      color: '#ddd',
      height: floating ? 'auto' : '100%',
      maxHeight: floating ? 'calc(100% - 32px)' : undefined,
      minHeight: 0,
      overflowY: 'auto',
      padding: floating ? '16px' : '20px',
      boxShadow: floating ? '0 12px 48px rgba(0,0,0,0.45)' : undefined,
      backdropFilter: floating ? 'blur(10px)' : undefined
    }}>
      {/* 1. Camera Profile */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', fontSize: '11px' }}>
            Camera
            <span
              onMouseEnter={() => setCameraHelpOpen(true)}
              onMouseLeave={() => setCameraHelpOpen(false)}
              onFocus={() => setCameraHelpOpen(true)}
              onBlur={() => setCameraHelpOpen(false)}
              tabIndex={0}
              style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: '15px', height: '15px', borderRadius: '50%', background: '#0a0a0a', border: '1px solid #333', color: '#5b9bd5', fontSize: '10px', cursor: 'help', outline: 'none' }}
            >
              i
              {cameraHelpOpen && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20px',
                    zIndex: 12,
                    width: '230px',
                    background: '#090909',
                    border: '1px solid #5b9bd5',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
                    padding: '9px 10px',
                    color: '#d8d8d8',
                    fontSize: '11px',
                    fontWeight: 600,
                    lineHeight: 1.35,
                    textTransform: 'none'
                  }}
                >
                  Computed from focal length and effective crop. Built-ins include full-frame 11mm, Super 35 11mm, and Super 35 plus 5%.
                </span>
              )}
            </span>
          </span>
          <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontWeight: 600 }}>
            {selectedHorizontalFov.toFixed(1)}° H / {selectedVerticalFov.toFixed(1)}° V
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px' }}>
          <select
            value={selectedCameraProfile.id}
            onChange={(e) => {
              const profile = e.target.value === 'custom'
                ? customCameraProfile
                : cameraProfiles.find(item => item.id === e.target.value);
              if (profile) applyCameraProfile(profile);
            }}
            style={{
              minWidth: 0,
              background: '#222',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '6px',
              fontSize: '11px'
            }}
            title="Select camera/lens crop profile. The computed vertical FoV drives the 3D camera."
          >
            <option value="custom">Custom FoV</option>
            {cameraProfiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => openCameraModal('add')}
            title="Add camera profile"
            style={{ width: '30px', background: '#222', color: '#fff', border: '1px solid #333', padding: '6px 0', borderRadius: '4px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}
          >
            +
          </button>
          <button
            onClick={() => openCameraModal('edit')}
            title="Edit selected camera profile"
            style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '6px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* 2. Camera Field of View (FoV) */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: '#aaa', textTransform: 'uppercase', fontSize: '11px' }}>Camera FoV</span>
          <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontWeight: 600 }}>{rig.fov}°</span>
        </div>
        <input 
          type="range" min="15" max="130" step="1" value={rig.fov}
          onChange={(e) => setManualFov(parseInt(e.target.value))}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          style={{ width: '100%' }}
        />
      </div>

      {/* 2. Rig Placement Section (Collapsible) */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '16px' }}>
        <div 
          onClick={() => setIsPositionOpen(!isPositionOpen)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: isPositionOpen ? '12px' : '0px',
            userSelect: 'none'
          }}
        >
          <h2 style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', margin: 0 }}>Rig Placement</h2>
          <span style={{ fontSize: '10px', color: '#666' }}>{isPositionOpen ? '▼' : '▶'}</span>
        </div>

        {isPositionOpen && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Aim Rig at Target</label>
                <button
                  onClick={() => setIsTargetDetailsOpen(!isTargetDetailsOpen)}
                  style={{
                    background: '#222',
                    color: '#aaa',
                    border: '1px solid #333',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    lineHeight: 1.4,
                    cursor: 'pointer'
                  }}
                  title="Show target coordinates"
                >
                  {isTargetDetailsOpen ? '▼' : '▶'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {lookAtOptions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setTargetPoint(p)}
                    style={{
                      background: matchingAnchor?.id === p.id ? '#2e4057' : '#222',
                      color: matchingAnchor?.id === p.id ? '#5b9bd5' : '#fff',
                      border: matchingAnchor?.id === p.id ? '1px solid #5b9bd5' : '1px solid #333',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {p.name.replace(' Target', '')}
                  </button>
                ))}
              </div>
              {isTargetDetailsOpen && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#0a0a0a', padding: '10px', borderRadius: '4px' }}>
                  {[
                    { axis: 'x', label: 'Target X', minFt: -65, maxFt: 65, minM: -20, maxM: 20 },
                    { axis: 'y', label: 'Target Y', minFt: -40, maxFt: 40, minM: -12, maxM: 12 },
                    { axis: 'z', label: 'Target Z', minFt: 0, maxFt: 20, minM: 0, maxM: 6 }
                  ].map((control) => {
                    const axis = control.axis as 'x' | 'y' | 'z';
                    return (
                      <div key={axis}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span style={{ color: '#aaa' }}>{control.label}</span>
                          <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>
                            {toDisp(rig.lookAtTarget[axis]).toFixed(2)} {dispUnit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={unit === 'feet' ? control.minFt : control.minM}
                          max={unit === 'feet' ? control.maxFt : control.maxM}
                          step={unit === 'feet' ? 0.25 : 0.05}
                          value={toDisp(rig.lookAtTarget[axis])}
                          onChange={(e) => updateRigValue('lookAtTarget', {
                            ...rig.lookAtTarget,
                            [axis]: fromDisp(parseFloat(e.target.value))
                          })}
                          onMouseUp={handleSliderCommit}
                          onTouchEnd={handleSliderCommit}
                          style={{ width: '100%' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Move Rig to Court Point</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {rigPlacementPoints.map(p => (
                  <button
                    key={p.id}
                    onClick={() => snapToPoint(p)}
                    style={{
                      background: matchingRigPlacement?.id === p.id ? '#2e4057' : '#222',
                      color: matchingRigPlacement?.id === p.id ? '#5b9bd5' : '#fff',
                      border: matchingRigPlacement?.id === p.id ? '1px solid #5b9bd5' : '1px solid #333',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {p.name.replace(' Camera', '').replace('Venue Origin (', '').replace(')', '').replace(' Center', '')}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Placement Mode</label>
              <div style={{ display: 'flex', background: '#0a0a0a', padding: '3px', borderRadius: '6px' }}>
                <button
                  onClick={() => handleModeToggle('cartesian')}
                  style={{
                    flex: 1,
                    background: !rig.sphericalMode ? '#222' : 'transparent',
                    color: !rig.sphericalMode ? '#fff' : '#888',
                    border: 'none',
                    padding: '6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Venue (XYZ)
                </button>
                <button
                  onClick={() => handleModeToggle('spherical')}
                  style={{
                    flex: 1,
                    background: rig.sphericalMode ? '#222' : 'transparent',
                    color: rig.sphericalMode ? '#fff' : '#888',
                    border: 'none',
                    padding: '6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Spherical
                </button>
              </div>
            </div>

            {!rig.sphericalMode ? (
              /* Cartesian Inputs */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* X Axis */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>X Position (Length)</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{toDisp(rig.x).toFixed(2)} {dispUnit}</span>
                  </div>
                  <input 
                    type="range"
                    min={unit === 'feet' ? -65 : -20}
                    max={unit === 'feet' ? 65 : 20}
                    step={unit === 'feet' ? 0.5 : 0.1}
                    value={toDisp(rig.x)}
                    onChange={(e) => updateRigValue('x', fromDisp(parseFloat(e.target.value)))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>
                {/* Y Axis */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Y Position (Width)</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{toDisp(rig.y).toFixed(2)} {dispUnit}</span>
                  </div>
                  <input 
                    type="range"
                    min={unit === 'feet' ? -40 : -12}
                    max={unit === 'feet' ? 40 : 12}
                    step={unit === 'feet' ? 0.5 : 0.1}
                    value={toDisp(rig.y)}
                    onChange={(e) => updateRigValue('y', fromDisp(parseFloat(e.target.value)))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>
                {/* Z Axis (Elevation) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Z Position (Height)</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{toDisp(rig.z).toFixed(2)} {dispUnit}</span>
                  </div>
                  <input 
                    type="range"
                    min={unit === 'feet' ? 0.5 : 0.1}
                    max={unit === 'feet' ? 50 : 15}
                    step={unit === 'feet' ? 0.5 : 0.1}
                    value={toDisp(rig.z)}
                    onChange={(e) => updateRigValue('z', fromDisp(parseFloat(e.target.value)))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : (
              /* Spherical Inputs */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* Measured Distance */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '6px' }}>
                    <span>{distanceMode === 'direct' ? 'Direct Distance' : 'Horizontal Distance'}</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{toDisp(activeDistance).toFixed(2)} {dispUnit}</span>
                  </div>
                  <div style={{ display: 'flex', background: '#0a0a0a', padding: '3px', borderRadius: '6px', marginBottom: '6px' }}>
                    <button
                      onClick={() => setDistanceMode('direct')}
                      style={{
                        flex: 1,
                        background: distanceMode === 'direct' ? '#222' : 'transparent',
                        color: distanceMode === 'direct' ? '#fff' : '#888',
                        border: 'none',
                        padding: '5px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Direct
                    </button>
                    <button
                      onClick={() => setDistanceMode('horizontal')}
                      style={{
                        flex: 1,
                        background: distanceMode === 'horizontal' ? '#222' : 'transparent',
                        color: distanceMode === 'horizontal' ? '#fff' : '#888',
                        border: 'none',
                        padding: '5px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Horizontal
                    </button>
                  </div>
                  <div style={{ display: 'flex', background: '#0a0a0a', padding: '3px', borderRadius: '6px', marginBottom: '6px' }}>
                    {[
                      { key: 'near-edge', label: 'Near Edge' },
                      { key: 'target', label: 'Target' },
                      { key: 'center-court', label: 'Center Court' }
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setMeasureTarget(option.key as 'near-edge' | 'target' | 'center-court')}
                        style={{
                          flex: 1,
                          background: measureTarget === option.key ? '#222' : 'transparent',
                          color: measureTarget === option.key ? '#fff' : '#888',
                          border: 'none',
                          padding: '5px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="range"
                    min={unit === 'feet' ? 0.5 : 0.1}
                    max={unit === 'feet' ? 120 : 36}
                    step={unit === 'feet' ? 0.5 : 0.1}
                    value={toDisp(activeDistance)}
                    onChange={(e) => {
                      const nextDistance = fromDisp(parseFloat(e.target.value));
                      if (distanceMode === 'direct') {
                        setDirectDistance(nextDistance);
                      } else {
                        setHorizontalMeasureDistance(nextDistance);
                      }
                    }}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Azimuth Angle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Azimuth Angle</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.sphericalAzimuth.toFixed(1)}°</span>
                  </div>
                  <input 
                    type="range" min="-180" max="180" step="0.5" value={rig.sphericalAzimuth}
                    onChange={(e) => updateRigValue('sphericalAzimuth', parseFloat(e.target.value))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Elevation Height */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Elevation (h)</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{toDisp(rig.sphericalElevation).toFixed(2)} {dispUnit}</span>
                  </div>
                  <input 
                    type="range"
                    min={unit === 'feet' ? 0.5 : 0.1}
                    max={unit === 'feet' ? 50 : 15}
                    step={unit === 'feet' ? 0.5 : 0.1}
                    value={toDisp(rig.sphericalElevation)}
                    onChange={(e) => updateRigValue('sphericalElevation', fromDisp(parseFloat(e.target.value)))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Camera Baseline - Moved outside Rig Alignment and above it */}
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: '#aaa', textTransform: 'uppercase', fontSize: '11px' }}>Camera Baseline (B)</span>
          <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontWeight: 600 }}>{toDisp(rig.baselineMeters).toFixed(3)} {dispUnit}</span>
        </div>
        <input 
          type="range"
          min={unit === 'feet' ? 0.213 : 0.065}
          max={unit === 'feet' ? 39.370 : 12.0}
          step={unit === 'feet' ? 0.01 : 0.005}
          value={toDisp(rig.baselineMeters)}
          onChange={(e) => updateRigValue('baselineMeters', fromDisp(parseFloat(e.target.value)))}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          style={{ width: '100%' }}
        />
        <span style={{ fontSize: '10px', color: '#555' }}>
          {unit === 'feet' ? 'Range: 0.213 ft to 39.370 ft' : 'Range: 6.5 cm to 12.0 m'}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
          {baselinePresets.map((preset) => {
            const isActive = Math.abs(rig.baselineMeters - preset.meters) < 0.015;
            return (
              <button
                key={preset.label}
                onClick={() => setCameraBaseline(preset.meters)}
                style={{
                  background: isActive ? '#2e4057' : '#222',
                  color: isActive ? '#5b9bd5' : '#fff',
                  border: isActive ? '1px solid #5b9bd5' : '1px solid #333',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Rig Alignment Section (Collapsible) */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '16px' }}>
        <div 
          onClick={() => setIsAlignmentOpen(!isAlignmentOpen)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: isAlignmentOpen ? '12px' : '0px',
            userSelect: 'none'
          }}
        >
          <h2 style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', margin: 0 }}>Rig Alignment</h2>
          <span style={{ fontSize: '10px', color: '#666' }}>{isAlignmentOpen ? '▼' : '▶'}</span>
        </div>

        {isAlignmentOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Yaw */}
            <div style={{ opacity: rig.lookAtTargetEnabled ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Rig Yaw</span>
                <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.yaw.toFixed(1)}°</span>
              </div>
              <input 
                type="range" min="-180" max="180" step="1" value={rig.yaw}
                onChange={(e) => updateRigValue('yaw', parseFloat(e.target.value))}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
                disabled={rig.lookAtTargetEnabled}
                style={{ width: '100%' }}
              />
            </div>

            {/* Pitch */}
            <div style={{ opacity: rig.lookAtTargetEnabled ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Rig Pitch</span>
                <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.pitch.toFixed(1)}°</span>
              </div>
              <input 
                type="range" min="-85" max="85" step="1" value={rig.pitch}
                onChange={(e) => updateRigValue('pitch', parseFloat(e.target.value))}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
                disabled={rig.lookAtTargetEnabled}
                style={{ width: '100%' }}
              />
            </div>

            {/* Roll */}
            <div style={{ opacity: rig.lookAtTargetEnabled ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Rig Roll</span>
                <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.roll.toFixed(1)}°</span>
              </div>
              <input 
                type="range" min="-45" max="45" step="0.5" value={rig.roll}
                onChange={(e) => updateRigValue('roll', parseFloat(e.target.value))}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
                disabled={rig.lookAtTargetEnabled}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Vergence Control Section (Collapsible) */}
      <div style={{ marginBottom: '20px' }}>
        <div 
          onClick={() => setIsVergenceOpen(!isVergenceOpen)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: isVergenceOpen ? '12px' : '0px',
            userSelect: 'none'
          }}
        >
          <h2 style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', margin: 0 }}>Camera Vergence</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              title={convergenceStatusTooltip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: rig.parallel || rig.actualCameras ? '#5b9bd5' : '#f0a040',
                background: '#0a0a0a',
                border: `1px solid ${rig.parallel || rig.actualCameras ? '#244766' : '#5c4422'}`,
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 700,
                lineHeight: 1.2
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{convergenceIcon}</span>
              <span style={{ fontFamily: 'monospace' }}>{perEyeToeInDeg.toFixed(2)}°</span>
            </span>
            <span style={{ fontSize: '10px', color: '#666' }}>{isVergenceOpen ? '▼' : '▶'}</span>
          </div>
        </div>

        {isVergenceOpen && (
          <div>
            {/* Parallel vs Converged switch */}
            <div style={{ display: 'flex', background: '#0a0a0a', padding: '3px', borderRadius: '6px', marginBottom: '12px' }}>
              <button
                onClick={() => {
                  const updated = {
                    ...rig,
                    actualCameras: undefined,
                    parallel: true,
                    vergenceAngleDeg: 0,
                    convergenceTarget: rig.lookAtTargetEnabled ? rig.lookAtTarget : rig.convergenceTarget
                  };
                  setRig(updated);
                  onCommitState(updated);
                }}
                style={{
                  flex: 1,
                  background: isVergenceParallel ? '#222' : 'transparent',
                  color: isVergenceParallel ? '#fff' : '#888',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Parallel
              </button>
              <button
                onClick={() => {
                  const nextAngle = Math.abs(vergenceAngleDeg) < 0.1
                    ? Math.max(0.5, inferredToeInDeg || 2)
                    : Math.abs(vergenceAngleDeg);
                  const angleRad = (nextAngle * Math.PI) / 180;
                  const convergenceTarget = rigPosition.clone().addScaledVector(
                    rigLookDirection,
                    (rig.baselineMeters / 2) / Math.tan(angleRad)
                  );
                  const updated = {
                    ...rig,
                    actualCameras: undefined,
                    parallel: false,
                    vergenceAngleDeg: nextAngle,
                    convergenceTarget: {
                      x: convergenceTarget.x,
                      y: convergenceTarget.y,
                      z: convergenceTarget.z
                    }
                  };
                  setRig(updated);
                  onCommitState(updated);
                }}
                style={{
                  flex: 1,
                  background: !isVergenceParallel ? '#222' : 'transparent',
                  color: !isVergenceParallel ? '#fff' : '#888',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Converged
              </button>
            </div>

            {/* ZP Alignment distance / target */}
            {(
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#888' }}>Vergence Offset</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>
                      {vergenceAngleLabel}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.05"
                    value={vergenceAngleDeg}
                    onChange={(e) => setVergenceAngle(parseFloat(e.target.value))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    title="Set per-eye vergence angle. Negative is toe-out/divergence, 0° is parallel, positive is toe-in/convergence."
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '10px', marginTop: '2px' }}>
                    <span>Toe-Out</span>
                    <span>Parallel</span>
                    <span>Toe-In</span>
                  </div>
                </div>
                <label style={{ fontSize: '11px', color: '#888' }}>Convergence Target Coordinate ({dispUnit})</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number" value={Math.round(toDisp(rig.convergenceTarget.x) * 100) / 100}
                    onChange={(e) => updateRigValue('convergenceTarget', { ...rig.convergenceTarget, x: fromDisp(parseFloat(e.target.value) || 0) })}
                    style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                    placeholder="X"
                  />
                  <input
                    type="number" value={Math.round(toDisp(rig.convergenceTarget.y) * 100) / 100}
                    onChange={(e) => updateRigValue('convergenceTarget', { ...rig.convergenceTarget, y: fromDisp(parseFloat(e.target.value) || 0) })}
                    style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                    placeholder="Y"
                  />
                  <input
                    type="number" value={Math.round(toDisp(rig.convergenceTarget.z) * 100) / 100}
                    onChange={(e) => updateRigValue('convergenceTarget', { ...rig.convergenceTarget, z: fromDisp(parseFloat(e.target.value) || 0) })}
                    style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                    placeholder="Z"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const convergenceTarget = rig.lookAtTargetEnabled ? rig.lookAtTarget : rig.convergenceTarget;
                    const updated = { ...rig, parallel: true, vergenceAngleDeg: 0, convergenceTarget };
                    setRig(updated);
                    onCommitState(updated);
                  }}
                  style={{
                    background: '#222',
                    color: '#5b9bd5',
                    border: '1px solid #333',
                    padding: '6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Set Offset to 0
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {cameraModalOpen && draftCamera && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Camera profile editor"
          onClick={() => setCameraModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.74)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(520px, 92vw)',
              background: '#161616',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '18px',
              color: '#ddd',
              boxShadow: '0 18px 80px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
                  {cameraModalMode === 'add' ? 'Add Camera' : 'Edit Camera'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#999', fontSize: '12px', lineHeight: 1.4 }}>
                  FoV is computed from focal length and effective crop dimensions.
                </p>
              </div>
              <button
                onClick={() => setCameraModalOpen(false)}
                style={{ background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '5px 9px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ gridColumn: '1 / -1', fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>
                Start From
                <select
                  value={draftBaseCameraId}
                  onChange={(e) => {
                    const source = getCameraProfileById(e.target.value);
                    if (!source || !draftCamera) return;
                    setDraftBaseCameraId(source.id);
                    setDraftCropScalePercent(100);
                    setDraftCamera({
                      ...draftCamera,
                      name: cameraModalMode === 'add' ? `New ${source.name}` : draftCamera.name,
                      focalLengthMm: source.focalLengthMm,
                      sensorWidthMm: source.sensorWidthMm,
                      sensorHeightMm: source.sensorHeightMm,
                      notes: cameraModalMode === 'add'
                        ? (source.notes ? `Started from ${source.name}. ${source.notes}` : `Started from ${source.name}.`)
                        : draftCamera.notes
                    });
                  }}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
                >
                  <option value="custom">Custom FoV</option>
                  {cameraProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: '5px', color: '#777', fontSize: '10px', lineHeight: 1.35, textTransform: 'none', fontWeight: 600 }}>
                  Started from {getCameraProfileById(draftBaseCameraId)?.name || 'selected camera'}.
                  {' '}
                  {getCameraProfileById(draftBaseCameraId)?.notes}
                </div>
              </label>
              <label style={{ gridColumn: '1 / -1', fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>
                Name
                <input
                  value={draftCamera.name}
                  onChange={(e) => setDraftCamera({ ...draftCamera, name: e.target.value })}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
                />
              </label>
              <label style={{ fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>
                Focal Distance
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={draftCamera.focalLengthMm}
                  onChange={(e) => setDraftCamera({ ...draftCamera, focalLengthMm: parseFloat(e.target.value) || 0.1 })}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
                />
              </label>
              <label style={{ fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>
                Crop Scale
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="0.1"
                    value={draftCropScalePercent}
                    onChange={(e) => setDraftCropScale(parseFloat(e.target.value))}
                    title="Scale effective width and height together from the selected starting profile."
                  />
                  <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontSize: '11px', textAlign: 'right' }}>
                    {draftCropScalePercent.toFixed(1)}%
                  </span>
                </div>
              </label>
              <label style={{ fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>
                Effective Width
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={draftCamera.sensorWidthMm}
                  onChange={(e) => setDraftCamera({ ...draftCamera, sensorWidthMm: parseFloat(e.target.value) || 0.1 })}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
                />
              </label>
              <label style={{ fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>
                Effective Height
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={draftCamera.sensorHeightMm}
                  onChange={(e) => setDraftCamera({ ...draftCamera, sensorHeightMm: parseFloat(e.target.value) || 0.1 })}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
                />
              </label>
              <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px' }}>
                <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Horizontal FoV</div>
                <div style={{ color: '#5b9bd5', fontFamily: 'monospace', fontSize: '18px', fontWeight: 750 }}>
                  {computeFov(draftCamera.sensorWidthMm, draftCamera.focalLengthMm).toFixed(1)}°
                </div>
              </div>
              <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px' }}>
                <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Vertical FoV</div>
                <div style={{ color: '#5b9bd5', fontFamily: 'monospace', fontSize: '18px', fontWeight: 750 }}>
                  {computeFov(draftCamera.sensorHeightMm, draftCamera.focalLengthMm).toFixed(1)}°
                </div>
              </div>
              <label style={{ gridColumn: '1 / -1', fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>
                Notes
                <textarea
                  value={draftCamera.notes}
                  onChange={(e) => setDraftCamera({ ...draftCamera, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', resize: 'vertical' }}
                />
              </label>
            </div>

            <div style={{ color: '#888', fontSize: '11px', lineHeight: 1.45, marginTop: '12px' }}>
              Formula: FoV = 2 * atan(sensor size / (2 * focal length)). The app uses computed vertical FoV for the camera frustum.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={exportCameraProfile}
                style={{ background: '#222', color: '#5b9bd5', border: '1px solid #333', borderRadius: '4px', padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}
              >
                Copy Export
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCameraModalOpen(false)}
                  style={{ background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveCameraProfile}
                  style={{ background: '#1e2d40', color: '#5b9bd5', border: '1px solid #5b9bd5', borderRadius: '4px', padding: '8px 10px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Save Camera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

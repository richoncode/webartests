import * as THREE from 'three';

export interface VenueCoordinateAnchor {
  id: string;
  name: string;
  position: THREE.Vector3;
  actualCameras?: ActualCameraRig;
}

export interface ActualCameraRig {
  label: string;
  leftPosition: { x: number; y: number; z: number };
  rightPosition: { x: number; y: number; z: number };
  viewDirection: { x: number; y: number; z: number };
  upDirection: { x: number; y: number; z: number };
}

export interface VenueDefinition {
  id: string;
  name: string;
  dimensions: { width: number; length: number; height?: number };
  createGeometry(): THREE.Object3D;
  getCoordinateAnchors(): VenueCoordinateAnchor[];
  getBounds(): THREE.Box3;
  getDefaultOrigin(): THREE.Vector3;
}

export interface CameraRigConfiguration {
  x: number;
  y: number;
  z: number;
  baselineMeters: number;
  yaw: number; // degrees
  pitch: number; // degrees
  roll: number; // degrees
  fov: number; // vertical FoV in degrees
  cameraProfileId?: string;
  actualCameras?: ActualCameraRig;
  aspect: number;
  near: number;
  far: number;
  parallel: boolean;
  convergenceTarget: { x: number; y: number; z: number };
  lookAtTargetEnabled: boolean;
  lookAtTarget: { x: number; y: number; z: number };
  // Spherical mode helper states (in Sync with Cartesian coordinates)
  sphericalMode: boolean;
  sphericalAnchorId: string;
  sphericalAzimuth: number; // degrees
  sphericalDistance: number; // meters
  sphericalDistanceMode?: 'horizontal' | 'direct' | 'target';
  sphericalMeasureTarget?: 'near-edge' | 'target' | 'center-court';
  sphericalElevation: number; // meters
}

export interface StereoConfiguration {
  displayMode: '3d-planning' | 'side-by-side' | 'wiggle-3d' | 'stereo-plane';
  eyeOrder: 'left-right' | 'right-left';
  virtualScreenDistance: number;
  virtualScreenSize: number;
  imageScale: number;
  horizontalImageOffset: number;
  disparityExaggeration: number;
  fallbackMode: 'anaglyph' | 'cross-eye' | 'side-by-side';
  anaglyphBlackWhite: boolean;
  showQualityOverlay: boolean;
  showZeroParallaxPlane: boolean;
  zeroParallaxOpacity: number;
  zeroParallaxDistance: number;
}

export interface VisualizationConfiguration {
  showFrustums: boolean;
  showAxes: boolean;
  showGrid: boolean;
  showOverlay: boolean;
  comfortWarningThresholds: {
    maxDisparityPx: number;
    maxBaselineRatio: number;
  };
}

export interface VenuePreset {
  schemaVersion: number;
  name: string;
  venueId: string;
  venueDimensions: { width: number; length: number; height?: number };
  rig: CameraRigConfiguration;
  stereo: StereoConfiguration;
  visualization: VisualizationConfiguration;
  createdAt: string;
  modifiedAt: string;
}

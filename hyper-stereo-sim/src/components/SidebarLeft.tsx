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
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  rig,
  setRig,
  coordinateAnchors,
  onCommitState,
  unit
}) => {
  const [isPositionOpen, setIsPositionOpen] = React.useState(true);
  const [isAlignmentOpen, setIsAlignmentOpen] = React.useState(false);
  const [isVergenceOpen, setIsVergenceOpen] = React.useState(false);
  const [isTargetDetailsOpen, setIsTargetDetailsOpen] = React.useState(false);

  const METERS_TO_FEET = 3.28084;
  const toDisp = (val: number) => (unit === 'feet' ? val * METERS_TO_FEET : val);
  const fromDisp = (val: number) => (unit === 'feet' ? val / METERS_TO_FEET : val);
  const dispUnit = unit === 'feet' ? 'ft' : 'm';
  const defaultRigHeightMeters = 15 / METERS_TO_FEET;
  const baselinePresets = [
    { label: 'Human', meters: 0.065 },
    { label: "1'", meters: 1 / METERS_TO_FEET },
    { label: "4'", meters: 4 / METERS_TO_FEET },
    { label: "8'", meters: 8 / METERS_TO_FEET },
    { label: "12'", meters: 12 / METERS_TO_FEET },
    { label: "16'", meters: 16 / METERS_TO_FEET }
  ];

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
      x: origin.x + direction.x * Math.max(0.05, distanceMeters),
      y: origin.y + direction.y * Math.max(0.05, distanceMeters)
    };

    syncSphericalFromPosition(updated);
    syncLookAtOrientation(updated);
    setRig(updated);
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
    const updated = {
      ...rig,
      x: point.position.x,
      y: point.position.y,
      z: point.position.z === 0 ? defaultRigHeightMeters : point.position.z
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
      baselineMeters
    };

    setRig(updated);
    onCommitState(updated);
  };

  const setTargetPoint = (point: VenueCoordinateAnchor) => {
    const updated = {
      ...rig,
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
      width: '320px',
      background: '#161616',
      borderRight: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      color: '#ddd',
      height: '100%',
      minHeight: 0,
      overflowY: 'auto',
      padding: '20px'
    }}>
      {/* 1. Camera Field of View (FoV) - Moved to top of parameters */}
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: '#aaa', textTransform: 'uppercase', fontSize: '11px' }}>Camera FoV</span>
          <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontWeight: 600 }}>{rig.fov}°</span>
        </div>
        <input 
          type="range" min="15" max="110" step="1" value={rig.fov}
          onChange={(e) => updateRigValue('fov', parseInt(e.target.value))}
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
                    type="range" min="0" max="360" step="0.5" value={rig.sphericalAzimuth}
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
          <span style={{ fontSize: '10px', color: '#666' }}>{isVergenceOpen ? '▼' : '▶'}</span>
        </div>

        {isVergenceOpen && (
          <div>
            {/* Parallel vs Converged switch */}
            <div style={{ display: 'flex', background: '#0a0a0a', padding: '3px', borderRadius: '6px', marginBottom: '12px' }}>
              <button
                onClick={() => { updateRigValue('parallel', true); onCommitState({ ...rig, parallel: true }); }}
                style={{
                  flex: 1,
                  background: rig.parallel ? '#222' : 'transparent',
                  color: rig.parallel ? '#fff' : '#888',
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
                onClick={() => { updateRigValue('parallel', false); onCommitState({ ...rig, parallel: false }); }}
                style={{
                  flex: 1,
                  background: !rig.parallel ? '#222' : 'transparent',
                  color: !rig.parallel ? '#fff' : '#888',
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
            {!rig.parallel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    updateRigValue('convergenceTarget', { x: 0, y: 0, z: 0 });
                    onCommitState({ ...rig, convergenceTarget: { x: 0, y: 0, z: 0 } });
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
                  Converge at Court Center
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

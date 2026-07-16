import React from 'react';
import * as THREE from 'three';
import { CameraRigConfiguration, VenueCoordinateAnchor } from '../types';
import { sphericalToCartesian, cartesianToSpherical } from '../mathUtils';

interface SidebarLeftProps {
  rig: CameraRigConfiguration;
  setRig: React.Dispatch<React.SetStateAction<CameraRigConfiguration>>;
  coordinateAnchors: VenueCoordinateAnchor[];
  onCommitState: (newRig: CameraRigConfiguration) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  rig,
  setRig,
  coordinateAnchors,
  onCommitState
}) => {
  const [isPositionOpen, setIsPositionOpen] = React.useState(true);
  const [isAlignmentOpen, setIsAlignmentOpen] = React.useState(false);
  const [isVergenceOpen, setIsVergenceOpen] = React.useState(false);
  const [customizeLookAt, setCustomizeLookAt] = React.useState(false);

  const matchingAnchor = coordinateAnchors.find(
    a => Math.abs(a.position.x - rig.lookAtTarget.x) < 0.01 &&
         Math.abs(a.position.y - rig.lookAtTarget.y) < 0.01 &&
         Math.abs(a.position.z - rig.lookAtTarget.z) < 0.01
  );

  const updateRigValue = (key: keyof CameraRigConfiguration, value: any) => {
    const updated = { ...rig, [key]: value };

    // Sync Cartesian and Spherical coordinates when editing
    if (rig.sphericalMode) {
      if (['sphericalAzimuth', 'sphericalDistance', 'sphericalElevation', 'sphericalAnchorId'].includes(key)) {
        const refPt = coordinateAnchors.find(p => p.id === updated.sphericalAnchorId) || coordinateAnchors[0];
        const refPos = refPt ? refPt.position : { x: 0, y: 0, z: 0 };
        const cart = sphericalToCartesian(
          refPos.x,
          refPos.y,
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
        const refPt = coordinateAnchors.find(p => p.id === updated.sphericalAnchorId) || coordinateAnchors[0];
        const refPos = refPt ? refPt.position : { x: 0, y: 0, z: 0 };
        const spher = cartesianToSpherical(
          refPos.x,
          refPos.y,
          updated.x,
          updated.y,
          updated.z
        );
        updated.sphericalAzimuth = Math.round(spher.azimuthDeg * 100) / 100;
        updated.sphericalDistance = Math.round(spher.distance * 100) / 100;
        updated.sphericalElevation = Math.round(spher.elevation * 100) / 100;
      }
    }

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
  };

  const handleSliderCommit = () => {
    onCommitState(rig);
  };

  // Toggle coordinate modes
  const handleModeToggle = (mode: 'cartesian' | 'spherical') => {
    const isSpher = mode === 'spherical';
    if (isSpher === rig.sphericalMode) return;

    const refPt = coordinateAnchors.find(p => p.id === rig.sphericalAnchorId) || coordinateAnchors[0];
    const refPos = refPt ? refPt.position : { x: 0, y: 0, z: 0 };

    const updated = { ...rig, sphericalMode: isSpher };
    if (isSpher) {
      // Calculate spherical parameters based on current Cartesian position
      const spher = cartesianToSpherical(refPos.x, refPos.y, rig.x, rig.y, rig.z);
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
      z: point.position.z === 0 ? 1.5 : point.position.z // Default to 1.5m height if on floor
    };

    // Keep spherical values synchronized
    const refPt = coordinateAnchors.find(p => p.id === updated.sphericalAnchorId) || coordinateAnchors[0];
    const refPos = refPt ? refPt.position : { x: 0, y: 0, z: 0 };
    const spher = cartesianToSpherical(refPos.x, refPos.y, updated.x, updated.y, updated.z);
    
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

  return (
    <div className="sidebar" style={{
      width: '320px',
      background: '#161616',
      borderRight: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      color: '#ddd',
      height: 'calc(100vh - 57px)',
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

      {/* 2. Placement Method Toggles */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Placement Mode</h2>
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

      {/* 3. Rig Position Section (Collapsible) */}
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
          <h2 style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', margin: 0 }}>Rig Position</h2>
          <span style={{ fontSize: '10px', color: '#666' }}>{isPositionOpen ? '▼' : '▶'}</span>
        </div>

        {isPositionOpen && (
          <div>
            {!rig.sphericalMode ? (
              /* Cartesian Inputs */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* X Axis */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>X Position (Length)</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.x.toFixed(2)} m</span>
                  </div>
                  <input 
                    type="range" min="-20" max="20" step="0.1" value={rig.x}
                    onChange={(e) => updateRigValue('x', parseFloat(e.target.value))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>
                {/* Y Axis */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Y Position (Width)</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.y.toFixed(2)} m</span>
                  </div>
                  <input 
                    type="range" min="-12" max="12" step="0.1" value={rig.y}
                    onChange={(e) => updateRigValue('y', parseFloat(e.target.value))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>
                {/* Z Axis (Elevation) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Z Position (Height)</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.z.toFixed(2)} m</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="15" step="0.1" value={rig.z}
                    onChange={(e) => updateRigValue('z', parseFloat(e.target.value))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : (
              /* Spherical Inputs */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* Coordinate Anchor Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Coordinate Anchor</label>
                  <select
                    value={rig.sphericalAnchorId}
                    onChange={(e) => updateRigValue('sphericalAnchorId', e.target.value)}
                    style={{ width: '100%', padding: '6px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
                  >
                    {coordinateAnchors.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Horizontal Distance */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Horizontal Distance</span>
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.sphericalDistance.toFixed(2)} m</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="30" step="0.1" value={rig.sphericalDistance}
                    onChange={(e) => updateRigValue('sphericalDistance', parseFloat(e.target.value))}
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
                    <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.sphericalElevation.toFixed(2)} m</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="15" step="0.1" value={rig.sphericalElevation}
                    onChange={(e) => updateRigValue('sphericalElevation', parseFloat(e.target.value))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Direct Coordinate Anchor Snaps */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Snap Rig to Anchor</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {coordinateAnchors.map(p => (
                  <button
                    key={p.id}
                    onClick={() => snapToPoint(p)}
                    style={{
                      background: '#222',
                      color: '#fff',
                      border: '1px solid #333',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {p.name.replace('Venue Origin (', '').replace(')', '').replace(' Center', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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
            {/* Rig Look-At Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
              <input
                type="checkbox"
                id="rig-lookat-toggle"
                checked={rig.lookAtTargetEnabled}
                onChange={(e) => updateRigValue('lookAtTargetEnabled', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="rig-lookat-toggle" style={{ fontSize: '11px', fontWeight: 600, color: '#aaa', cursor: 'pointer', textTransform: 'uppercase' }}>
                Centerline Rig Look-At
              </label>
            </div>

            {/* Look-At Target Coordinates */}
            {rig.lookAtTargetEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#0a0a0a', padding: '10px', borderRadius: '4px' }}>
                {!customizeLookAt ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Target Anchor</label>
                    <select
                      value={matchingAnchor?.id || 'custom'}
                      onChange={(e) => {
                        const anchor = coordinateAnchors.find(a => a.id === e.target.value);
                        if (anchor) {
                          updateRigValue('lookAtTarget', { x: anchor.position.x, y: anchor.position.y, z: anchor.position.z });
                        }
                      }}
                      style={{ width: '100%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                    >
                      {coordinateAnchors.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                      {!matchingAnchor && <option value="custom">Custom Position</option>}
                    </select>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '11px', color: '#888' }}>Custom Target Position (XYZ)</span>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <input
                        type="number" value={rig.lookAtTarget.x}
                        onChange={(e) => updateRigValue('lookAtTarget', { ...rig.lookAtTarget, x: parseFloat(e.target.value) || 0 })}
                        style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                        placeholder="X"
                      />
                      <input
                        type="number" value={rig.lookAtTarget.y}
                        onChange={(e) => updateRigValue('lookAtTarget', { ...rig.lookAtTarget, y: parseFloat(e.target.value) || 0 })}
                        style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                        placeholder="Y"
                      />
                      <input
                        type="number" value={rig.lookAtTarget.z}
                        onChange={(e) => updateRigValue('lookAtTarget', { ...rig.lookAtTarget, z: parseFloat(e.target.value) || 0 })}
                        style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                        placeholder="Z"
                      />
                    </div>
                  </div>
                )}

                {/* Edit coordinate toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    id="customize-lookat-chk"
                    checked={customizeLookAt}
                    onChange={(e) => setCustomizeLookAt(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="customize-lookat-chk" style={{ fontSize: '10px', color: '#aaa', cursor: 'pointer' }}>
                    Edit Coordinates Manually
                  </label>
                </div>
              </div>
            )}

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

            {/* Separation / Baseline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Camera Baseline (B)</span>
                <span style={{ color: '#5b9bd5', fontFamily: 'monospace' }}>{rig.baselineMeters.toFixed(3)} m</span>
              </div>
              <input 
                type="range" min="0.065" max="12.0" step="0.005" value={rig.baselineMeters}
                onChange={(e) => updateRigValue('baselineMeters', parseFloat(e.target.value))}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '10px', color: '#555' }}>Range: 6.5 cm to 12.0 m</span>
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
                <label style={{ fontSize: '11px', color: '#888' }}>Convergence Target Coordinate</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number" value={rig.convergenceTarget.x}
                    onChange={(e) => updateRigValue('convergenceTarget', { ...rig.convergenceTarget, x: parseFloat(e.target.value) || 0 })}
                    style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                    placeholder="X"
                  />
                  <input
                    type="number" value={rig.convergenceTarget.y}
                    onChange={(e) => updateRigValue('convergenceTarget', { ...rig.convergenceTarget, y: parseFloat(e.target.value) || 0 })}
                    style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                    placeholder="Y"
                  />
                  <input
                    type="number" value={rig.convergenceTarget.z}
                    onChange={(e) => updateRigValue('convergenceTarget', { ...rig.convergenceTarget, z: parseFloat(e.target.value) || 0 })}
                    style={{ width: '33%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '11px' }}
                    placeholder="Z"
                  />
                </div>
                
                <button
                  onClick={() => {
                    // Converge on net center (0, 0, 0)
                    updateRigValue('convergenceTarget', { x: 0, y: 0, z: 0.914 });
                    onCommitState({ ...rig, convergenceTarget: { x: 0, y: 0, z: 0.914 } });
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
                  Converge at Net Center
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

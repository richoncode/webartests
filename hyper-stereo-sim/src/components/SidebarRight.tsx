import React, { useState, useEffect } from 'react';
import { Trash2, Copy, Save, AlertTriangle } from 'lucide-react';
import { CameraRigConfiguration, StereoConfiguration, VisualizationConfiguration, VenuePreset } from '../types';

interface SidebarRightProps {
  rig: CameraRigConfiguration;
  setRig: React.Dispatch<React.SetStateAction<CameraRigConfiguration>>;
  stereo: StereoConfiguration;
  setStereo: React.Dispatch<React.SetStateAction<StereoConfiguration>>;
  visConfig: VisualizationConfiguration;
  setVisConfig: React.Dispatch<React.SetStateAction<VisualizationConfiguration>>;
  presets: VenuePreset[];
  setPresets: React.Dispatch<React.SetStateAction<VenuePreset[]>>;
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: VenuePreset) => void;
  onDeletePreset: (name: string) => void;
  onDuplicatePreset: (preset: VenuePreset) => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  rig,
  setRig,
  stereo,
  setStereo,
  visConfig,
  setVisConfig,
  presets,
  setPresets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onDuplicatePreset
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  
  // Real-time mathematics calculations
  const leftCamX = rig.x - (rig.baselineMeters / 2) * Math.cos((rig.yaw * Math.PI) / 180);
  const leftCamY = rig.y - (rig.baselineMeters / 2) * Math.sin((rig.yaw * Math.PI) / 180);
  
  const rightCamX = rig.x + (rig.baselineMeters / 2) * Math.cos((rig.yaw * Math.PI) / 180);
  const rightCamY = rig.y + (rig.baselineMeters / 2) * Math.sin((rig.yaw * Math.PI) / 180);

  // Compute convergence distance
  const dx = rig.convergenceTarget.x - rig.x;
  const dy = rig.convergenceTarget.y - rig.y;
  const dz = rig.convergenceTarget.z - rig.z;
  const convergenceDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Compute vergence angles
  // For parallel, vergence is 0. For converged:
  const vergenceLeftDeg = rig.parallel ? 0 : (Math.atan2(rig.baselineMeters / 2, convergenceDistance) * 180) / Math.PI;
  const vergenceRightDeg = vergenceLeftDeg;
  const totalVergenceDeg = vergenceLeftDeg + vergenceRightDeg;

  // Baseline to target ratio (1-in-30 rule threshold is ~0.033)
  const baselineRatio = rig.baselineMeters / Math.max(0.1, convergenceDistance);

  // Warnings diagnostic engine
  const warnings: string[] = [];
  
  if (baselineRatio > visConfig.comfortWarningThresholds.maxBaselineRatio) {
    warnings.push(`Baseline ratio (${baselineRatio.toFixed(3)}) exceeds comfortable limit (1-in-30 rule: ${visConfig.comfortWarningThresholds.maxBaselineRatio.toFixed(3)}). This may cause double vision (diplopia).`);
  }
  
  if (rig.z < 0.1) {
    warnings.push('Camera rig is below or intersecting the venue floor. Raise elevation.');
  }

  if (Math.abs(rig.x) < 0.5 && Math.abs(rig.y) < 6.4 && rig.z < 1.17) {
    warnings.push('Camera rig intersects or is extremely close to the center net geometry. Reposition.');
  }

  // Check if camera is pointing completely away from the center of the court
  const yawRad = (rig.yaw * Math.PI) / 180;
  const lookDirX = -Math.cos(yawRad); // Camera default direction is -Z, let's check view direction
  const toCenterDirX = 0 - rig.x;
  const dotProduct = lookDirX * toCenterDirX;
  if (dotProduct < -20) {
    warnings.push('Cameras appear to be pointing completely away from the venue Field-of-Play.');
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSavePreset(newPresetName.trim());
    setNewPresetName('');
  };

  return (
    <div className="sidebar" style={{
      width: '320px',
      background: '#161616',
      borderLeft: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      color: '#ddd',
      height: 'calc(100vh - 57px)',
      overflowY: 'auto',
      padding: '20px'
    }}>
      {/* 1. Live Calculations */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Live Metrology</h2>
        <div style={{ background: '#0a0a0a', padding: '12px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Rig Center (XYZ)</span>
            <span style={{ color: '#fff', fontFamily: 'monospace' }}>({rig.x.toFixed(1)}, {rig.y.toFixed(1)}, {rig.z.toFixed(1)}) m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Left Cam Pos</span>
            <span style={{ color: '#aaa', fontFamily: 'monospace' }}>({leftCamX.toFixed(1)}, {leftCamY.toFixed(1)}, {rig.z.toFixed(1)}) m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Right Cam Pos</span>
            <span style={{ color: '#aaa', fontFamily: 'monospace' }}>({rightCamX.toFixed(1)}, {rightCamY.toFixed(1)}, {rig.z.toFixed(1)}) m</span>
          </div>
          <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Convergence Target</span>
            <span style={{ color: '#fff', fontFamily: 'monospace' }}>
              {rig.parallel ? 'Parallel (Infinity)' : `${convergenceDistance.toFixed(2)} m`}
            </span>
          </div>
          {!rig.parallel && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Left Eye Vergence</span>
                <span style={{ color: '#aaa', fontFamily: 'monospace' }}>{vergenceLeftDeg.toFixed(2)}°</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Right Eye Vergence</span>
                <span style={{ color: '#aaa', fontFamily: 'monospace' }}>{vergenceRightDeg.toFixed(2)}°</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Included Vergence</span>
                <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{totalVergenceDeg.toFixed(2)}°</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Baseline/Distance Ratio</span>
                <span style={{ color: baselineRatio > visConfig.comfortWarningThresholds.maxBaselineRatio ? '#e74c3c' : '#10b981', fontFamily: 'monospace' }}>
                  {baselineRatio.toFixed(3)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Visual Configuration Rules & comfort warnings */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Warning Thresholds</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>Max Comfort Ratio (1/d)</span>
              <span style={{ fontFamily: 'monospace' }}>{visConfig.comfortWarningThresholds.maxBaselineRatio.toFixed(3)}</span>
            </div>
            <input
              type="range" min="0.01" max="0.10" step="0.005"
              value={visConfig.comfortWarningThresholds.maxBaselineRatio}
              onChange={(e) => setVisConfig(prev => ({
                ...prev,
                comfortWarningThresholds: { ...prev.comfortWarningThresholds, maxBaselineRatio: parseFloat(e.target.value) }
              }))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Real-time Warnings list */}
        {warnings.length > 0 && (
          <div style={{ marginTop: '14px', background: '#2c1010', border: '1px solid #e74c3c', borderRadius: '6px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e74c3c', fontWeight: 700, fontSize: '12px', marginBottom: '8px' }}>
              <AlertTriangle size={14} />
              <span>Stereo Diagnostics ({warnings.length})</span>
            </div>
            <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '11px', color: '#ffb5b5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3. Preset Saver/Loader */}
      <div style={{ flex: 1, borderTop: '1px solid #222', paddingTop: '16px' }}>
        <h2 style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Venue Presets</h2>
        
        {/* Save input form */}
        <form onSubmit={handleSave} style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="New venue preset name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            style={{
              flex: 1,
              background: '#222',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              padding: '6px 10px',
              fontSize: '12px',
              outline: 'none'
            }}
          />
          <button type="submit" style={{ padding: '6px 10px', background: '#222' }} title="Save Preset">
            <Save size={14} />
          </button>
        </form>

        {/* Scrollable Presets list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
          {presets.map((preset) => (
            <div
              key={preset.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#1a1a1a',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <span 
                onClick={() => onLoadPreset(preset)}
                style={{ cursor: 'pointer', fontWeight: 500, color: '#5b9bd5' }}
              >
                {preset.name}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => onDuplicatePreset(preset)}
                  title="Duplicate Preset"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#888' }}
                >
                  <Copy size={12} />
                </button>
                <button 
                  onClick={() => onDeletePreset(preset.name)}
                  title="Delete Preset"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#888' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

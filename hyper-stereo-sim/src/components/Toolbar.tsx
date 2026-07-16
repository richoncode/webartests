import React from 'react';
import { Undo2, Redo2, Download, Upload, Monitor, Box, Eye, EyeOff } from 'lucide-react';
import { StereoConfiguration } from '../types';

interface ToolbarProps {
  venueId: string;
  setVenueId: (id: string) => void;
  stereo: StereoConfiguration;
  setStereo: React.Dispatch<React.SetStateAction<StereoConfiguration>>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onImport: () => void;
  xrActive: boolean;
  vrScaleMode: 'tabletop' | 'full-scale';
  setVrScaleMode: (mode: 'tabletop' | 'full-scale') => void;
  triggerXR: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  venueId,
  setVenueId,
  stereo,
  setStereo,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onImport,
  xrActive,
  vrScaleMode,
  setVrScaleMode,
  triggerXR
}) => {
  return (
    <header className="toolbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#111',
      borderBottom: '1px solid #222',
      padding: '12px 24px',
      color: '#fff',
      flexWrap: 'wrap',
      gap: '12px',
      zIndex: 100
    }}>
      {/* Brand / Title & Portal Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🔭</span>
          <h1 style={{ fontSize: '16px', margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Hyper-Stereo VR Planner
          </h1>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#0a0a0a', padding: '2px', borderRadius: '6px' }}>
          <a
            href="../../hyper-stereo/index.html"
            style={{
              color: '#888',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
          >
            Introduction
          </a>
          <a
            href="../../hyper-stereo/hyperstereo_camera_rail_design.html"
            style={{
              color: '#888',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
          >
            Camera Rig
          </a>
          <span
            style={{
              background: '#222',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            VR Planner
          </span>
        </div>
      </div>

      {/* Middle: Selection toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Venue Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Venue:</span>
          <select 
            value={venueId} 
            onChange={(e) => setVenueId(e.target.value)}
            style={{
              background: '#222',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '13px',
              outline: 'none'
            }}
          >
            <option value="tennis-court">Tennis Court (Regulation)</option>
            <option value="empty-venue">Empty Rectangular Venue</option>
          </select>
        </div>

        {/* Display Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#1c1c1c', borderRadius: '6px', padding: '2px' }}>
          {(['3d-planning', 'side-by-side', 'stereo-plane'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setStereo(prev => ({ ...prev, displayMode: mode }))}
              style={{
                background: stereo.displayMode === mode ? '#2e4057' : 'transparent',
                color: stereo.displayMode === mode ? '#5b9bd5' : '#888',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textTransform: 'capitalize'
              }}
            >
              {mode.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Undo/Redo */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            title="Undo"
            style={{ padding: '6px 10px', background: '#222', color: canUndo ? '#fff' : '#444' }}
          >
            <Undo2 size={15} />
          </button>
          <button 
            onClick={onRedo} 
            disabled={!canRedo}
            title="Redo"
            style={{ padding: '6px 10px', background: '#222', color: canRedo ? '#fff' : '#444' }}
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* VR triggers */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Toggles scale in VR */}
          <select
            value={vrScaleMode}
            onChange={(e) => setVrScaleMode(e.target.value as 'tabletop' | 'full-scale')}
            style={{
              background: '#222',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '6px 8px',
              fontSize: '12px'
            }}
            title="Select VR Inspection Scale"
          >
            <option value="tabletop">Tabletop Scale</option>
            <option value="full-scale">1:1 Full Scale</option>
          </select>

          {/* WebXR Entry button */}
          <div id="vr-btn-container" style={{ position: 'relative', height: '32px' }}>
            <button
              onClick={triggerXR}
              className="primary"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                height: '32px',
                padding: '0 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Box size={14} />
              VR Mode
            </button>
          </div>
        </div>

        {/* JSON Import/Export */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={onImport} title="Import Preset JSON" style={{ padding: '6px 10px', background: '#222' }}>
            <Upload size={14} />
          </button>
          <button onClick={onExport} title="Export Preset JSON" style={{ padding: '6px 10px', background: '#222' }}>
            <Download size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};

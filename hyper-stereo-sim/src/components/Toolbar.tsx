import React from 'react';
import { Undo2, Redo2, Download, Upload, Box, QrCode, X } from 'lucide-react';
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
  unit: 'feet' | 'meters';
  setUnit: (u: 'feet' | 'meters') => void;
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
  xrActive: _xrActive,
  vrScaleMode,
  setVrScaleMode,
  triggerXR,
  unit,
  setUnit
}) => {
  const [showQr, setShowQr] = React.useState(false);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=20&data=${encodeURIComponent(pageUrl)}`;
  const groupSpacer = (
    <div
      aria-hidden="true"
      style={{
        width: '1px',
        height: '26px',
        background: '#2a2a2a',
        margin: '0 4px'
      }}
    />
  );
  const iconButtonStyle = (enabled = true): React.CSSProperties => ({
    width: '34px',
    height: '34px',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: enabled ? '#242424' : '#1f1f1f',
    color: enabled ? '#d8d8d8' : '#777',
    border: enabled ? '1px solid #555' : '1px solid #3a3a3a',
    borderRadius: '4px',
    opacity: 1,
    cursor: enabled ? 'pointer' : 'not-allowed'
  });
  const displayModeLabel = (mode: StereoConfiguration['displayMode']) => {
    if (mode === '3d-planning') return '3d planning';
    if (mode === 'side-by-side') return 'side by-side';
    if (mode === 'wiggle-3d') return 'wiggle 3d';
    if (mode === 'left-eye') return 'L';
    if (mode === 'right-eye') return 'R';
    return 'stereo anaglyph';
  };

  return (
    <header className="toolbar" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      background: '#111',
      borderBottom: '1px solid #222',
      padding: '12px 24px',
      color: '#fff',
      gap: '12px',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        {/* Brand / Title & Portal Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🔭</span>
          <h1 style={{ fontSize: '16px', margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Hyper-Stereo VR Planner
          </h1>
          <button
            onClick={() => setShowQr(true)}
            title="Show a scannable QR code for this page URL"
            style={{
              ...iconButtonStyle(true),
              width: '30px',
              height: '30px',
              marginLeft: '4px'
            }}
          >
            <QrCode size={16} />
          </button>
        </div>

        {groupSpacer}
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#0a0a0a', padding: '2px', borderRadius: '6px' }}>
          <a
            href="../../hyper-stereo/index.html"
            title="Open the hyper-stereo introduction"
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
            title="Open the camera rig design notes"
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
            title="Current page: VR planning workspace"
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

        {groupSpacer}

        {/* Venue Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Venue:</span>
          <select 
            value={venueId} 
            onChange={(e) => setVenueId(e.target.value)}
            title="Choose the venue geometry for planning"
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
      </div>

      {/* Persistent Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        {/* Undo/Redo */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            title="Undo"
            style={iconButtonStyle(canUndo)}
          >
            <Undo2 size={15} />
          </button>
          <button 
            onClick={onRedo} 
            disabled={!canRedo}
            title="Redo"
            style={iconButtonStyle(canRedo)}
          >
            <Redo2 size={15} />
          </button>
        </div>

        {groupSpacer}

        {/* JSON Import/Export */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={onImport} title="Import Preset JSON" style={iconButtonStyle(true)}>
            <Upload size={14} />
          </button>
          <button onClick={onExport} title="Export Preset JSON" style={iconButtonStyle(true)}>
            <Download size={14} />
          </button>
        </div>

        {groupSpacer}

        {/* Units Selector (Feet / Meters) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#1c1c1c', borderRadius: '6px', padding: '2px' }}>
          {(['feet', 'meters'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              title={`Show distances in ${u}`}
              style={{
                background: unit === u ? '#2e4057' : 'transparent',
                color: unit === u ? '#5b9bd5' : '#888',
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
              {u}
            </button>
          ))}
        </div>

        {groupSpacer}

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
          <div id="vr-btn-container" style={{ display: 'inline-flex', alignItems: 'center', height: '32px' }}>
            <button
              onClick={triggerXR}
              className="primary"
              title="Enter VR inspection mode"
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

        {groupSpacer}

        {/* Stereo Quality Overlay */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#1c1c1c', borderRadius: '6px', padding: '2px' }}>
          <button
            onClick={() => setStereo(prev => ({ ...prev, showQualityOverlay: !prev.showQualityOverlay }))}
            title="Toggle stereo quality heatmap overlay"
            style={{
              background: stereo.showQualityOverlay ? '#3a2a16' : 'transparent',
              color: stereo.showQualityOverlay ? '#f0a040' : '#888',
              border: stereo.showQualityOverlay ? '1px solid #f0a040' : 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Stereo Quality
          </button>
        </div>

        {groupSpacer}

        {/* Display Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#1c1c1c', borderRadius: '6px', padding: '2px' }}>
          {(['3d-planning', 'side-by-side', 'wiggle-3d', 'left-eye', 'right-eye', 'stereo-plane'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setStereo(prev => ({ ...prev, displayMode: mode }))}
              title={
                mode === '3d-planning'
                  ? 'Explore the rig, court, rays, and frustums in 3D'
                  : mode === 'side-by-side'
                    ? 'Show left and right camera views side by side'
                    : mode === 'wiggle-3d'
                      ? 'Alternate left and right camera views to test stereo depth without glasses'
                      : mode === 'left-eye'
                        ? 'Show only the left camera view'
                        : mode === 'right-eye'
                          ? 'Show only the right camera view'
                          : 'Show the red/blue anaglyph stereo preview'
              }
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
              {displayModeLabel(mode)}
            </button>
          ))}
        </div>

        {stereo.displayMode === 'stereo-plane' && (
          <>
            {groupSpacer}
            <div style={{ display: 'flex', alignItems: 'center', background: '#1c1c1c', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setStereo(prev => ({
                  ...prev,
                  displayMode: 'stereo-plane',
                  fallbackMode: 'anaglyph',
                  anaglyphBlackWhite: !prev.anaglyphBlackWhite
                }))}
                title="Use grayscale venue colors in anaglyph mode so red/cyan glasses test stereo separation without color interference"
                style={{
                  background: stereo.anaglyphBlackWhite ? '#252525' : 'transparent',
                  color: stereo.anaglyphBlackWhite ? '#fff' : '#888',
                  border: stereo.anaglyphBlackWhite ? '1px solid #aaa' : 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Anaglyph B/W
              </button>
            </div>
          </>
        )}
      </div>
      {showQr && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Page QR code"
          onClick={() => setShowQr(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(620px, 92vw)',
              background: '#111',
              border: '1px solid #3a3a3a',
              borderRadius: '8px',
              padding: '18px',
              boxShadow: '0 20px 80px rgba(0,0,0,0.55)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 750 }}>Scan Page URL</div>
                <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>Open this planner on Quest or another device.</div>
              </div>
              <button
                onClick={() => setShowQr(false)}
                title="Close QR code"
                style={iconButtonStyle(true)}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ background: '#fff', borderRadius: '6px', padding: '18px', display: 'flex', justifyContent: 'center' }}>
              <img
                src={qrUrl}
                alt="QR code for this page URL"
                style={{ width: 'min(520px, 76vw)', height: 'min(520px, 76vw)', display: 'block' }}
              />
            </div>
            <div style={{
              marginTop: '12px',
              color: '#bbb',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.45,
              overflowWrap: 'anywhere',
              background: '#0a0a0a',
              border: '1px solid #242424',
              borderRadius: '6px',
              padding: '10px'
            }}>
              {pageUrl}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

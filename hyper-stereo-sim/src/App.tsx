import React, { useState, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { Visualizer } from './components/Visualizer';
import { CameraRigConfiguration, StereoConfiguration, VisualizationConfiguration, VenuePreset } from './types';
import { BaseVenue } from './venue/Venue';
import { TennisCourt } from './venue/TennisCourt';
import { EmptyVenue } from './venue/EmptyVenue';
import { StereoRenderer } from './renderer/StereoRenderer';

const defaultRigConfig: CameraRigConfiguration = {
  x: -Math.sqrt((58 / 3.28084) ** 2 - (15 / 3.28084) ** 2),
  y: 0.0,
  z: 15 / 3.28084,
  baselineMeters: 4 / 3.28084,
  yaw: 0,
  pitch: -7.1,
  roll: 0,
  fov: 50,
  aspect: 16 / 9,
  near: 0.1,
  far: 100,
  parallel: true,
  convergenceTarget: { x: 0, y: 0, z: 0 },
  lookAtTargetEnabled: true,
  lookAtTarget: { x: 0, y: 0, z: 0.0 },
  sphericalMode: true,
  sphericalAnchorId: 'center-court',
  sphericalAzimuth: 180,
  sphericalDistance: Math.sqrt((58 / 3.28084) ** 2 - (15 / 3.28084) ** 2),
  sphericalDistanceMode: 'direct',
  sphericalMeasureTarget: 'center-court',
  sphericalElevation: 15 / 3.28084
};

const defaultStereoConfig: StereoConfiguration = {
  displayMode: '3d-planning',
  eyeOrder: 'left-right',
  virtualScreenDistance: 5.0,
  virtualScreenSize: 2.0,
  imageScale: 1.0,
  horizontalImageOffset: 0.0,
  disparityExaggeration: 1.0,
  fallbackMode: 'anaglyph',
  anaglyphBlackWhite: true,
  showQualityOverlay: true,
  showZeroParallaxPlane: false,
  zeroParallaxOpacity: 0.25,
  zeroParallaxDistance: 10.0
};

const defaultVisConfig: VisualizationConfiguration = {
  showFrustums: true,
  showAxes: true,
  showGrid: true,
  showOverlay: true,
  comfortWarningThresholds: {
    maxDisparityPx: 25,
    maxBaselineRatio: 0.033 // 1/30 comfort rule
  }
};

export const App: React.FC = () => {
  const [venueId, setVenueId] = useState('tennis-court');
  const [rig, setRig] = useState<CameraRigConfiguration>(defaultRigConfig);
  const [stereo, setStereo] = useState<StereoConfiguration>(defaultStereoConfig);
  const [visConfig, setVisConfig] = useState<VisualizationConfiguration>(defaultVisConfig);
  const [presets, setPresets] = useState<VenuePreset[]>([]);
  const [vrScaleMode, setVrScaleMode] = useState<'tabletop' | 'full-scale'>('full-scale');
  const [unit, setUnit] = useState<'feet' | 'meters'>('feet');
  
  const [rendererRef, setRendererRef] = useState<StereoRenderer | null>(null);

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<{ rig: CameraRigConfiguration; stereo: StereoConfiguration }[]>([]);
  const [redoStack, setRedoStack] = useState<{ rig: CameraRigConfiguration; stereo: StereoConfiguration }[]>([]);

  // Instantiated Venue definitions
  const tennisCourt = useRef(new TennisCourt());
  const emptyVenue = useRef(new EmptyVenue());

  const activeVenue: BaseVenue = venueId === 'tennis-court' ? tennisCourt.current : emptyVenue.current;
  const coordinateAnchors = activeVenue.getCoordinateAnchors();

  // Load Saved Presets on Mount
  useEffect(() => {
    const saved = localStorage.getItem('hyperstereo-presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to parse presets', err);
        loadDefaultPresets();
      }
    } else {
      loadDefaultPresets();
    }
  }, []);

  const loadDefaultPresets = () => {
    const defaultList: VenuePreset[] = [
      {
        schemaVersion: 1,
        name: 'Tennis Baseline-Centered Rig',
        venueId: 'tennis-court',
        venueDimensions: { width: 18.29, length: 36.58 },
        rig: { ...defaultRigConfig, x: -11.89, y: 0.0, z: 1.5, baselineMeters: 0.065, yaw: 0, parallel: true },
        stereo: { ...defaultStereoConfig, displayMode: '3d-planning' },
        visualization: defaultVisConfig,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      },
      {
        schemaVersion: 1,
        name: 'Elevated End-Court Rig',
        venueId: 'tennis-court',
        venueDimensions: { width: 18.29, length: 36.58 },
        rig: { ...defaultRigConfig, x: -16.0, y: 0.0, z: 6.0, baselineMeters: 0.5, yaw: 0, pitch: -15, parallel: false, convergenceTarget: { x: 0, y: 0, z: 0 } },
        stereo: { ...defaultStereoConfig, displayMode: '3d-planning' },
        visualization: defaultVisConfig,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      },
      {
        schemaVersion: 1,
        name: 'Wide Sideline Hyperstereo Rig',
        venueId: 'tennis-court',
        venueDimensions: { width: 18.29, length: 36.58 },
        rig: { ...defaultRigConfig, x: 0.0, y: -8.0, z: 3.0, baselineMeters: 2.5, yaw: 90, pitch: -20, parallel: false, convergenceTarget: { x: 0, y: 0, z: 0 } },
        stereo: { ...defaultStereoConfig, displayMode: '3d-planning' },
        visualization: defaultVisConfig,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      },
      {
        schemaVersion: 1,
        name: 'Parallel-Camera Rig',
        venueId: 'tennis-court',
        venueDimensions: { width: 18.29, length: 36.58 },
        rig: { ...defaultRigConfig, x: -14.0, y: 2.0, z: 1.8, baselineMeters: 0.12, yaw: -5, parallel: true },
        stereo: { ...defaultStereoConfig, displayMode: '3d-planning' },
        visualization: defaultVisConfig,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      },
      {
        schemaVersion: 1,
        name: 'Converged Net Zero-Parallax Rig',
        venueId: 'tennis-court',
        venueDimensions: { width: 18.29, length: 36.58 },
        rig: { ...defaultRigConfig, x: -10.0, y: -3.0, z: 2.0, baselineMeters: 1.0, yaw: 15, parallel: false, convergenceTarget: { x: 0, y: 0, z: 0 } },
        stereo: { ...defaultStereoConfig, displayMode: '3d-planning' },
        visualization: defaultVisConfig,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      }
    ];
    setPresets(defaultList);
    localStorage.setItem('hyperstereo-presets', JSON.stringify(defaultList));
  };

  const handleCommitState = (newRig: CameraRigConfiguration = rig, newStereo: StereoConfiguration = stereo) => {
    // Push current states onto the undo stack
    setUndoStack(prev => [...prev, { rig, stereo }]);
    setRedoStack([]); // Clear redo stack on new actions
  };

  // Undo Action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, { rig, stereo }]);
    setRig(previous.rig);
    setStereo(previous.stereo);
  };

  // Redo Action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, { rig, stereo }]);
    setRig(next.rig);
    setStereo(next.stereo);
  };

  const savePreset = (name: string) => {
    const newPreset: VenuePreset = {
      schemaVersion: 1,
      name,
      venueId,
      venueDimensions: activeVenue.dimensions,
      rig,
      stereo,
      visualization: visConfig,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };
    
    const updated = [...presets.filter(p => p.name !== name), newPreset];
    setPresets(updated);
    localStorage.setItem('hyperstereo-presets', JSON.stringify(updated));
  };

  const loadPreset = (preset: VenuePreset) => {
    handleCommitState();
    setVenueId(preset.venueId);
    setRig(preset.rig);
    setStereo(preset.stereo);
    setVisConfig(preset.visualization);
  };

  const deletePreset = (name: string) => {
    const updated = presets.filter(p => p.name !== name);
    setPresets(updated);
    localStorage.setItem('hyperstereo-presets', JSON.stringify(updated));
  };

  const duplicatePreset = (preset: VenuePreset) => {
    let copyName = `${preset.name} (Copy)`;
    let counter = 1;
    while (presets.some(p => p.name === copyName)) {
      copyName = `${preset.name} (Copy ${counter++})`;
    }
    const duplicated = {
      ...preset,
      name: copyName,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };
    const updated = [...presets, duplicated];
    setPresets(updated);
    localStorage.setItem('hyperstereo-presets', JSON.stringify(updated));
  };

  // Export Presets list to JSON file
  const exportPresets = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presets, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "hyperstereo-presets.json");
    dlAnchorElem.click();
  };

  // Import Presets list from JSON file upload
  const importPresets = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            const updated = [...presets, ...imported.filter(ip => !presets.some(p => p.name === ip.name))];
            setPresets(updated);
            localStorage.setItem('hyperstereo-presets', JSON.stringify(updated));
            alert('Presets imported successfully!');
          }
        } catch (err) {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Binds the WebXR Enter session button when renderer is ready
  const triggerXR = () => {
    if (!rendererRef) return;
    const button = rendererRef.getXRButtonElement();
    if (button) {
      button.click();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d0d', fontFamily: 'sans-serif' }}>
      <Toolbar
        venueId={venueId}
        setVenueId={setVenueId}
        stereo={stereo}
        setStereo={setStereo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onExport={exportPresets}
        onImport={importPresets}
        xrActive={false}
        vrScaleMode={vrScaleMode}
        setVrScaleMode={setVrScaleMode}
        triggerXR={triggerXR}
        unit={unit}
        setUnit={setUnit}
      />
      
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <SidebarLeft
          rig={rig}
          setRig={setRig}
          coordinateAnchors={coordinateAnchors}
          onCommitState={handleCommitState}
          unit={unit}
        />
        
        <Visualizer
          rig={rig}
          setRig={setRig}
          stereo={stereo}
          visConfig={visConfig}
          activeVenue={activeVenue}
          vrScaleMode={vrScaleMode}
          setRendererRef={setRendererRef}
          unit={unit}
        />
        
        <SidebarRight
          rig={rig}
          setRig={setRig}
          stereo={stereo}
          setStereo={setStereo}
          visConfig={visConfig}
          setVisConfig={setVisConfig}
          presets={presets}
          setPresets={setPresets}
          onSavePreset={savePreset}
          onLoadPreset={loadPreset}
          onDeletePreset={deletePreset}
          onDuplicatePreset={duplicatePreset}
          unit={unit}
        />
      </div>
    </div>
  );
};

export default App;

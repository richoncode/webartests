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
  x: Math.sqrt((58 / 3.28084) ** 2 - (15 / 3.28084) ** 2),
  y: 0.0,
  z: 15 / 3.28084,
  baselineMeters: 4 / 3.28084,
  yaw: 0,
  pitch: -7.1,
  roll: 0,
  fov: 69.0,
  cameraProfileId: 'actual-s35-plus-9-6-11mm',
  aspect: 16 / 9,
  near: 0.1,
  far: 100,
  parallel: true,
  convergenceTarget: { x: 0, y: 0, z: 0 },
  lookAtTargetEnabled: true,
  lookAtTarget: { x: 0, y: 0, z: 0.0 },
  sphericalMode: true,
  sphericalAnchorId: 'center-court',
  sphericalAzimuth: 0,
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
  disparityPixelOffset: 0,
  disparityExaggeration: 1.0,
  fallbackMode: 'anaglyph',
  anaglyphBlackWhite: true,
  anaglyphRedIntensity: 0.32,
  anaglyphBlueIntensity: 0.72,
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

const lowTrussActualOverlayUrl = `${import.meta.env.BASE_URL}overlays/tennis3-LR-rectified.jpg`;

const createLowTrussActualOverlayPreset = (): VenuePreset => ({
  schemaVersion: 1,
  name: 'Low Truss Actual w/ overlay',
  venueId: 'tennis-court',
  venueDimensions: { width: 18.29, length: 36.58, height: 10 },
  rig: {
    x: 17.807731960521643,
    y: 0.4019140293983944,
    z: 4.436988804600805,
    baselineMeters: 1.3627716815013946,
    yaw: 64,
    pitch: -2,
    roll: 91,
    fov: 69,
    cameraProfileId: 'actual-s35-plus-9-6-11mm',
    aspect: 1.7777777777777777,
    near: 0.1,
    far: 100,
    parallel: true,
    convergenceTarget: { x: 8.836947364979077, y: 0.02065225918597241, z: 0 },
    lookAtTargetEnabled: true,
    lookAtTarget: { x: 8.836947364979077, y: 0.02065225918597241, z: 0 },
    sphericalMode: true,
    sphericalAnchorId: 'center-court',
    sphericalAzimuth: 1.3,
    sphericalDistance: 17.81,
    sphericalDistanceMode: 'direct',
    sphericalMeasureTarget: 'center-court',
    sphericalElevation: 4.44,
    actualCameras: {
      label: 'Low Truss Actual',
      leftPosition: { x: 17.851313599915066, y: -0.27783597120598497, z: 4.455078618355028 },
      rightPosition: { x: 17.76415032112822, y: 1.0816640300027738, z: 4.418898990846583 },
      viewDirection: { x: -0.8957036848509264, y: -0.038067748571483706, z: -0.44301891095434126 },
      upDirection: { x: -0.44261934352932497, y: -0.018811491084971713, z: 0.8965122668077831 }
    }
  },
  stereo: {
    ...defaultStereoConfig,
    displayMode: 'side-by-side',
    showQualityOverlay: false
  },
  visualization: defaultVisConfig,
  overlayImageUrl: lowTrussActualOverlayUrl,
  overlayOpacity: 0.42,
  createdAt: '2026-07-17T21:42:58.883Z',
  modifiedAt: '2026-07-17T21:42:58.883Z'
});

const createLowTrussActualDisp50Preset = (): VenuePreset => ({
  schemaVersion: 1,
  name: 'Low Truss Actual Disp +50',
  venueId: 'tennis-court',
  venueDimensions: {
    width: 18.29,
    length: 36.58,
    height: 10
  },
  rig: {
    x: 17.076961787629315,
    y: 0,
    z: 4.5719998536960045,
    baselineMeters: 1.2191999609856012,
    yaw: 0,
    pitch: -7.1,
    roll: 0,
    fov: 69,
    cameraProfileId: 'actual-s35-plus-9-6-11mm',
    aspect: 1.7777777777777777,
    near: 0.1,
    far: 100,
    parallel: true,
    convergenceTarget: {
      x: 0,
      y: 0,
      z: 0
    },
    lookAtTargetEnabled: true,
    lookAtTarget: {
      x: 0,
      y: 0,
      z: 0
    },
    sphericalMode: true,
    sphericalAnchorId: 'center-court',
    sphericalAzimuth: 0,
    sphericalDistance: 17.076961787629315,
    sphericalDistanceMode: 'direct',
    sphericalMeasureTarget: 'center-court',
    sphericalElevation: 4.5719998536960045
  },
  stereo: {
    displayMode: 'stereo-plane',
    eyeOrder: 'left-right',
    virtualScreenDistance: 5,
    virtualScreenSize: 2,
    imageScale: 1,
    horizontalImageOffset: 0,
    disparityPixelOffset: 50,
    disparityExaggeration: 1,
    fallbackMode: 'anaglyph',
    anaglyphBlackWhite: true,
    anaglyphRedIntensity: 0.5,
    anaglyphBlueIntensity: 1,
    showQualityOverlay: true,
    showZeroParallaxPlane: false,
    zeroParallaxOpacity: 0.25,
    zeroParallaxDistance: 10
  },
  visualization: {
    showFrustums: true,
    showAxes: true,
    showGrid: true,
    showOverlay: true,
    comfortWarningThresholds: {
      maxDisparityPx: 25,
      maxBaselineRatio: 0.033
    }
  },
  createdAt: '2026-07-18T00:20:13.409Z',
  modifiedAt: '2026-07-18T00:20:13.409Z'
});

export const App: React.FC = () => {
  const [venueId, setVenueId] = useState('tennis-court');
  const [rig, setRig] = useState<CameraRigConfiguration>(defaultRigConfig);
  const [stereo, setStereo] = useState<StereoConfiguration>(defaultStereoConfig);
  const [visConfig, setVisConfig] = useState<VisualizationConfiguration>(defaultVisConfig);
  const [presets, setPresets] = useState<VenuePreset[]>([]);
  const [presetOverlayUrl, setPresetOverlayUrl] = useState<string | null>(null);
  const [presetOverlayOpacity, setPresetOverlayOpacity] = useState(0.42);
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
        JSON.parse(saved);
        loadDefaultPresets();
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
      createLowTrussActualOverlayPreset(),
      createLowTrussActualDisp50Preset()
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
    setPresetOverlayUrl(preset.overlayImageUrl || null);
    setPresetOverlayOpacity(preset.overlayOpacity ?? 0.42);
  };

  const deletePreset = (name: string) => {
    const updated = presets.filter(p => p.name !== name);
    setPresets(updated);
    localStorage.setItem('hyperstereo-presets', JSON.stringify(updated));
  };

  const deleteAllLocalPresets = () => {
    const confirmed = window.confirm('Delete all locally saved venue presets and restore the code defaults?');
    if (!confirmed) return;
    localStorage.removeItem('hyperstereo-presets');
    loadDefaultPresets();
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
          setStereo={setStereo}
          visConfig={visConfig}
          activeVenue={activeVenue}
          vrScaleMode={vrScaleMode}
          setRendererRef={setRendererRef}
          unit={unit}
          presetOverlayUrl={presetOverlayUrl}
          presetOverlayOpacity={presetOverlayOpacity}
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
          onDeleteAllLocalPresets={deleteAllLocalPresets}
          onDuplicatePreset={duplicatePreset}
          unit={unit}
        />
      </div>
    </div>
  );
};

export default App;

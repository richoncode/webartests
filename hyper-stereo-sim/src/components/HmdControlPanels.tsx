import React from 'react';
import { CameraRigConfiguration, StereoConfiguration, VenuePreset } from '../types';

type HmdPanelId = 'left' | 'right';
type HmdControlKind = 'number' | 'toggle' | 'button-row' | 'preset-list';

interface HmdControlBase {
  id: string;
  panel: HmdPanelId;
  section: string;
  label: string;
  kind: HmdControlKind;
}

interface HmdNumberControl extends HmdControlBase {
  kind: 'number';
  value: number;
  min: number;
  max: number;
  step: number;
  formattedValue: string;
  onChange: (value: number) => void;
  onCommit?: () => void;
}

interface HmdToggleControl extends HmdControlBase {
  kind: 'toggle';
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onToggle: () => void;
}

interface HmdButtonRowControl extends HmdControlBase {
  kind: 'button-row';
  buttons: Array<{
    id: string;
    label: string;
    active?: boolean;
    onClick: () => void;
  }>;
}

interface HmdPresetListControl extends HmdControlBase {
  kind: 'preset-list';
  presets: VenuePreset[];
  onLoad: (preset: VenuePreset) => void;
}

type HmdControlDefinition =
  | HmdNumberControl
  | HmdToggleControl
  | HmdButtonRowControl
  | HmdPresetListControl;

interface HmdControlContext {
  rig: CameraRigConfiguration;
  setRig: React.Dispatch<React.SetStateAction<CameraRigConfiguration>>;
  stereo: StereoConfiguration;
  setStereo: React.Dispatch<React.SetStateAction<StereoConfiguration>>;
  presets: VenuePreset[];
  onLoadValuePreset: (preset: VenuePreset) => void;
  onCommitState: () => void;
  unit: 'feet' | 'meters';
}

interface HmdControlPanelsProps extends HmdControlContext {
  onPointerEvent?: (event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => void;
}

const METERS_TO_FEET = 3.28084;
const toDisplay = (meters: number, unit: 'feet' | 'meters') => unit === 'feet' ? meters * METERS_TO_FEET : meters;
const fromDisplay = (value: number, unit: 'feet' | 'meters') => unit === 'feet' ? value / METERS_TO_FEET : value;
const unitLabel = (unit: 'feet' | 'meters') => unit === 'feet' ? 'ft' : 'm';

const directDistanceMeters = (rig: CameraRigConfiguration) => {
  const x = Number.isFinite(rig.x) ? rig.x : 0;
  const y = Number.isFinite(rig.y) ? rig.y : 0;
  const z = Number.isFinite(rig.z) ? rig.z : 0;
  return Math.sqrt(x * x + y * y + z * z);
};

const setRigFromDirectDistance = (rig: CameraRigConfiguration, distanceMeters: number): CameraRigConfiguration => {
  const elevation = Math.min(Math.max(0, rig.sphericalElevation || rig.z || 0), Math.max(0.01, distanceMeters - 0.01));
  const azimuth = rig.sphericalAzimuth || 0;
  const azimuthRad = (azimuth * Math.PI) / 180;
  const horizontal = Math.sqrt(Math.max(0, distanceMeters * distanceMeters - elevation * elevation));

  return {
    ...rig,
    actualCameras: undefined,
    x: Math.cos(azimuthRad) * horizontal,
    y: Math.sin(azimuthRad) * horizontal,
    z: elevation,
    sphericalMode: true,
    sphericalAnchorId: 'center-court',
    sphericalDistanceMode: 'direct',
    sphericalMeasureTarget: 'center-court',
    sphericalDistance: distanceMeters,
    sphericalElevation: elevation
  };
};

const setRigFromAzimuth = (rig: CameraRigConfiguration, azimuth: number): CameraRigConfiguration => {
  const distance = directDistanceMeters(rig);
  const elevation = rig.sphericalElevation || rig.z || 0;
  const horizontal = Math.sqrt(Math.max(0, distance * distance - elevation * elevation));
  const azimuthRad = (azimuth * Math.PI) / 180;

  return {
    ...rig,
    actualCameras: undefined,
    x: Math.cos(azimuthRad) * horizontal,
    y: Math.sin(azimuthRad) * horizontal,
    sphericalMode: true,
    sphericalAzimuth: azimuth,
    sphericalDistanceMode: 'direct',
    sphericalMeasureTarget: 'center-court',
    sphericalDistance: distance,
    sphericalElevation: elevation
  };
};

const setRigFromElevation = (rig: CameraRigConfiguration, elevationMeters: number): CameraRigConfiguration => {
  const currentDistance = Math.max(directDistanceMeters(rig), elevationMeters + 0.01);
  const azimuth = rig.sphericalAzimuth || 0;
  const azimuthRad = (azimuth * Math.PI) / 180;
  const horizontal = Math.sqrt(Math.max(0, currentDistance * currentDistance - elevationMeters * elevationMeters));

  return {
    ...rig,
    actualCameras: undefined,
    x: Math.cos(azimuthRad) * horizontal,
    y: Math.sin(azimuthRad) * horizontal,
    z: elevationMeters,
    sphericalMode: true,
    sphericalAzimuth: azimuth,
    sphericalDistanceMode: 'direct',
    sphericalMeasureTarget: 'center-court',
    sphericalDistance: currentDistance,
    sphericalElevation: elevationMeters
  };
};

const buildHmdControlSchema = (ctx: HmdControlContext): HmdControlDefinition[] => {
  const { rig, setRig, stereo, setStereo, presets, onLoadValuePreset, onCommitState, unit } = ctx;
  const displayUnit = unitLabel(unit);
  const directDistance = directDistanceMeters(rig);
  const vergenceAngle = rig.vergenceAngleDeg ?? 0;
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

  return [
    {
      id: 'camera.fov',
      panel: 'left',
      section: 'Camera',
      kind: 'number',
      label: 'Camera FoV',
      value: rig.fov,
      min: 20,
      max: 130,
      step: 1,
      formattedValue: `${rig.fov.toFixed(0)} deg`,
      onChange: value => setRig(prev => ({ ...prev, fov: value, cameraProfileId: 'custom' })),
      onCommit: onCommitState
    },
    {
      id: 'rig.directDistance',
      panel: 'left',
      section: 'Rig Placement',
      kind: 'number',
      label: 'Direct Distance',
      value: toDisplay(directDistance, unit),
      min: unit === 'feet' ? 1 : 0.3,
      max: unit === 'feet' ? 120 : 36,
      step: unit === 'feet' ? 0.5 : 0.1,
      formattedValue: `${toDisplay(directDistance, unit).toFixed(unit === 'feet' ? 1 : 2)} ${displayUnit}`,
      onChange: value => setRig(prev => setRigFromDirectDistance(prev, fromDisplay(value, unit))),
      onCommit: onCommitState
    },
    {
      id: 'rig.azimuth',
      panel: 'left',
      section: 'Rig Placement',
      kind: 'number',
      label: 'Azimuth Angle',
      value: rig.sphericalAzimuth || 0,
      min: -180,
      max: 180,
      step: 0.5,
      formattedValue: `${(rig.sphericalAzimuth || 0).toFixed(1)} deg`,
      onChange: value => setRig(prev => setRigFromAzimuth(prev, value)),
      onCommit: onCommitState
    },
    {
      id: 'rig.elevation',
      panel: 'left',
      section: 'Rig Placement',
      kind: 'number',
      label: 'Elevation',
      value: toDisplay(rig.sphericalElevation || rig.z || 0, unit),
      min: unit === 'feet' ? 0.5 : 0.1,
      max: unit === 'feet' ? 50 : 15,
      step: unit === 'feet' ? 0.5 : 0.1,
      formattedValue: `${toDisplay(rig.sphericalElevation || rig.z || 0, unit).toFixed(unit === 'feet' ? 1 : 2)} ${displayUnit}`,
      onChange: value => setRig(prev => setRigFromElevation(prev, fromDisplay(value, unit))),
      onCommit: onCommitState
    },
    {
      id: 'rig.baseline',
      panel: 'left',
      section: 'Camera Baseline',
      kind: 'number',
      label: 'Baseline',
      value: toDisplay(rig.baselineMeters, unit),
      min: unit === 'feet' ? 0.213 : 0.065,
      max: unit === 'feet' ? 39.37 : 12,
      step: unit === 'feet' ? 0.01 : 0.005,
      formattedValue: `${toDisplay(rig.baselineMeters, unit).toFixed(2)} ${displayUnit}`,
      onChange: value => setRig(prev => ({ ...prev, actualCameras: undefined, baselineMeters: fromDisplay(value, unit) })),
      onCommit: onCommitState
    },
    {
      id: 'rig.baselinePresets',
      panel: 'left',
      section: 'Camera Baseline',
      kind: 'button-row',
      label: 'Baseline Presets',
      buttons: baselinePresets.map(preset => ({
        id: preset.label,
        label: preset.label,
        active: Math.abs(rig.baselineMeters - preset.meters) < 0.015,
        onClick: () => {
          setRig(prev => ({ ...prev, actualCameras: undefined, baselineMeters: preset.meters }));
          onCommitState();
        }
      }))
    },
    {
      id: 'rig.vergenceOffset',
      panel: 'left',
      section: 'Camera Vergence',
      kind: 'number',
      label: 'Vergence Offset',
      value: vergenceAngle,
      min: -10,
      max: 10,
      step: 0.05,
      formattedValue: `${vergenceAngle > 0 ? '+' : ''}${vergenceAngle.toFixed(2)} deg`,
      onChange: value => setRig(prev => ({ ...prev, actualCameras: undefined, vergenceAngleDeg: Math.abs(value) < 0.025 ? 0 : value })),
      onCommit: onCommitState
    },
    {
      id: 'stereo.quality',
      panel: 'right',
      section: 'Stereo Quality',
      kind: 'toggle',
      label: 'Stereo Quality',
      active: stereo.showQualityOverlay,
      activeLabel: 'Quality On',
      inactiveLabel: 'Quality Off',
      onToggle: () => setStereo(prev => ({ ...prev, showQualityOverlay: !prev.showQualityOverlay }))
    },
    {
      id: 'presets.valueList',
      panel: 'right',
      section: 'Value Presets',
      kind: 'preset-list',
      label: 'Value Presets',
      presets,
      onLoad: onLoadValuePreset
    }
  ];
};

const panelStyle = (side: HmdPanelId): React.CSSProperties => ({
  width: side === 'left' ? 'min(360px, 34vw)' : 'min(280px, 26vw)',
  background: 'rgba(18,18,18,0.9)',
  border: '1px solid rgba(91,155,213,0.35)',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  color: '#ddd',
  maxHeight: 'calc(100% - 32px)',
  minHeight: 0,
  overflowY: 'auto',
  padding: side === 'left' ? '16px' : '14px',
  boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(10px)'
});

const controlLabelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '12px',
  fontSize: '12px',
  marginBottom: '4px'
};

const HmdControl = ({ control }: { control: HmdControlDefinition }) => {
  if (control.kind === 'number') {
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={controlLabelStyle}>
          <span>{control.label}</span>
          <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontWeight: 700 }}>{control.formattedValue}</span>
        </div>
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={control.value}
          onChange={event => control.onChange(Number(event.target.value))}
          onMouseUp={control.onCommit}
          onTouchEnd={control.onCommit}
          style={{ width: '100%' }}
        />
      </div>
    );
  }

  if (control.kind === 'toggle') {
    return (
      <button
        onClick={control.onToggle}
        title={control.label}
        style={{
          width: '100%',
          background: control.active ? '#3a2a16' : '#222',
          color: control.active ? '#f0a040' : '#aaa',
          border: control.active ? '1px solid #f0a040' : '1px solid #333',
          padding: '8px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 800,
          cursor: 'pointer'
        }}
      >
        {control.active ? control.activeLabel : control.inactiveLabel}
      </button>
    );
  }

  if (control.kind === 'button-row') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
        {control.buttons.map(button => (
          <button
            key={button.id}
            onClick={button.onClick}
            style={{
              background: button.active ? '#2e4057' : '#222',
              color: button.active ? '#5b9bd5' : '#fff',
              border: button.active ? '1px solid #5b9bd5' : '1px solid #333',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {button.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: 'min(50vh, 360px)', overflowY: 'auto' }}>
      {control.presets.map(preset => (
        <button
          key={preset.name}
          onClick={() => control.onLoad(preset)}
          title="Load this preset rig/settings without changing the current view mode"
          style={{
            background: '#1a1a1a',
            color: '#5b9bd5',
            border: '1px solid #2a2a2a',
            borderRadius: '4px',
            padding: '7px 9px',
            fontSize: '12px',
            fontWeight: 650,
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
};

const HmdPanel = ({ side, controls }: { side: HmdPanelId; controls: HmdControlDefinition[] }) => {
  const sections = Array.from(new Set(controls.map(control => control.section)));

  return (
    <div className="sidebar" style={panelStyle(side)}>
      {sections.map((section, sectionIndex) => (
        <div
          key={section}
          style={{
            borderTop: sectionIndex === 0 ? 'none' : '1px solid #222',
            paddingTop: sectionIndex === 0 ? 0 : '14px',
            marginTop: sectionIndex === 0 ? 0 : '14px'
          }}
        >
          <h2 style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>{section}</h2>
          {controls.filter(control => control.section === section).map(control => (
            <HmdControl key={control.id} control={control} />
          ))}
          {side === 'right' && section === 'Value Presets' && (
            <div style={{ color: '#777', fontSize: '10px', lineHeight: 1.35, marginTop: '9px' }}>
              Loads rig and stereo values. The current view mode stays active.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const HmdControlPanels: React.FC<HmdControlPanelsProps> = (props) => {
  const controls = buildHmdControlSchema(props);
  const leftControls = controls.filter(control => control.panel === 'left');
  const rightControls = controls.filter(control => control.panel === 'right');

  const stopPanelEvent = (event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    props.onPointerEvent?.(event);
  };

  return (
    <>
      <div
        onPointerDown={stopPanelEvent}
        onPointerMove={stopPanelEvent}
        onPointerUp={stopPanelEvent}
        onClick={stopPanelEvent}
        style={{ pointerEvents: 'auto' }}
      >
        <HmdPanel side="left" controls={leftControls} />
      </div>

      <div
        aria-hidden="true"
        style={{
          width: 'clamp(360px, 34vw, 560px)',
          minWidth: 'clamp(360px, 34vw, 560px)',
          height: '1px',
          pointerEvents: 'none'
        }}
      />

      <div
        onPointerDown={stopPanelEvent}
        onPointerMove={stopPanelEvent}
        onPointerUp={stopPanelEvent}
        onClick={stopPanelEvent}
        style={{ pointerEvents: 'auto' }}
      >
        <HmdPanel side="right" controls={rightControls} />
      </div>
    </>
  );
};

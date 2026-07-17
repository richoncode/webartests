import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CameraRigConfiguration, StereoConfiguration, VisualizationConfiguration } from '../types';
import { StereoRenderer } from '../renderer/StereoRenderer';
import { BaseVenue } from '../venue/Venue';

interface VisualizerProps {
  rig: CameraRigConfiguration;
  setRig: React.Dispatch<React.SetStateAction<CameraRigConfiguration>>;
  stereo: StereoConfiguration;
  visConfig: VisualizationConfiguration;
  activeVenue: BaseVenue;
  vrScaleMode: 'tabletop' | 'full-scale';
  setRendererRef: (renderer: StereoRenderer | null) => void;
  unit: 'feet' | 'meters';
}

export const Visualizer: React.FC<VisualizerProps> = ({
  rig,
  setRig,
  stereo,
  visConfig,
  activeVenue,
  vrScaleMode,
  setRendererRef,
  unit
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererInstanceRef = useRef<StereoRenderer | null>(null);
  const [activeJump, setActiveJump] = React.useState<'overhead' | 'sideline' | 'behind-rig' | null>(null);
  const [viewDistanceMeters, setViewDistanceMeters] = React.useState(0);
  const isJumpingRef = useRef(false);
  const METERS_TO_FEET = 3.28084;
  const getCenterCourt = () => {
    const origin = activeVenue.getDefaultOrigin();
    return new THREE.Vector3(origin.x || 0, origin.y || 0, origin.z || 0);
  };
  const calculateViewDistance = (renderer: StereoRenderer | null) => {
    if (!renderer) return 0;
    const distance = renderer.planningCamera.position.distanceTo(getCenterCourt());
    return Number.isFinite(distance) ? distance : 0;
  };
  const centerCourt = getCenterCourt();
  const rigDistanceMeters = new THREE.Vector3(
    Number.isFinite(rig.x) ? rig.x : 0,
    Number.isFinite(rig.y) ? rig.y : 0,
    Number.isFinite(rig.z) ? rig.z : 0
  ).distanceTo(centerCourt);
  const rigPosition = new THREE.Vector3(
    Number.isFinite(rig.x) ? rig.x : 0,
    Number.isFinite(rig.y) ? rig.y : 0,
    Number.isFinite(rig.z) ? rig.z : 0
  );
  const stereoTarget = rig.lookAtTargetEnabled ? rig.lookAtTarget : rig.convergenceTarget;
  const targetPosition = new THREE.Vector3(
    Number.isFinite(stereoTarget.x) ? stereoTarget.x : 0,
    Number.isFinite(stereoTarget.y) ? stereoTarget.y : 0,
    Number.isFinite(stereoTarget.z) ? stereoTarget.z : 0
  );
  const targetDistanceMeters = rigPosition.distanceTo(targetPosition);
  const comfortRatio = rig.baselineMeters / Math.max(0.1, targetDistanceMeters);
  const comfortLimit = visConfig.comfortWarningThresholds.maxBaselineRatio;
  const comfortSeverity = comfortRatio / comfortLimit;
  const comfortPercent = comfortSeverity * 100;
  const scaleTooltip = `Stereo quality percent = (baseline / point distance) / max comfort ratio * 100. With max comfort ratio ${comfortLimit.toFixed(3)}, a point where baseline/distance is ${comfortLimit.toFixed(3)} is 100%; lower is safer, higher increases diplopia risk.`;
  const qualityState = comfortSeverity <= 0.75
    ? { label: 'Comfortable', color: '#4caf50', tint: 'rgba(76, 175, 80, 0.10)' }
    : comfortSeverity <= 1
      ? { label: 'Caution', color: '#f0a040', tint: 'rgba(240, 160, 64, 0.13)' }
      : { label: 'Diplopia Risk', color: '#e74c3c', tint: 'rgba(231, 76, 60, 0.16)' };
  const viewDistanceToCenter = unit === 'feet' ? viewDistanceMeters * METERS_TO_FEET : viewDistanceMeters;
  const rigDistanceToCenter = unit === 'feet' ? rigDistanceMeters * METERS_TO_FEET : rigDistanceMeters;
  const distanceUnit = unit === 'feet' ? 'ft' : 'm';

  // 1. Initialize StereoRenderer on Mount
  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new StereoRenderer(containerRef.current);
    rendererInstanceRef.current = renderer;
    renderer.setVenue(activeVenue);
    setRendererRef(renderer);
    setViewDistanceMeters(calculateViewDistance(renderer));
    renderer.onViewerMoveCallback = () => {
      setViewDistanceMeters(calculateViewDistance(renderer));
    };

    // Bind rig direct dragging sync callback
    renderer.onRigMoveCallback = (x, y, z) => {
      setRig(prev => {
        const updated = { ...prev, x, y, z };
        
        if (updated.lookAtTargetEnabled) {
          const lookMatrix = new THREE.Matrix4();
          const eye = new THREE.Vector3(x, y, z);
          const target = new THREE.Vector3(updated.lookAtTarget.x, updated.lookAtTarget.y, updated.lookAtTarget.z);
          const up = new THREE.Vector3(0, 0, 1);
          lookMatrix.lookAt(eye, target, up);
          
          const q = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
          const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
          
          updated.yaw = Math.round((euler.y * 180) / Math.PI);
          updated.pitch = Math.round((euler.x * 180) / Math.PI);
          updated.roll = Math.round((euler.z * 180) / Math.PI);
        }
        
        return updated;
      });
    };

    // Bind controls change listener to reset active view jump highlights
    renderer.controls.addEventListener('change', () => {
      if (!isJumpingRef.current) {
        setActiveJump(null);
      }
      setViewDistanceMeters(calculateViewDistance(renderer));
    });

    // 2. High-DPI Canvas Scaling with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      renderer.resize(width, height);
      renderer.renderFrame(rig, stereo, visConfig.showFrustums, visConfig.comfortWarningThresholds.maxBaselineRatio);
      setViewDistanceMeters(calculateViewDistance(renderer));
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      renderer.dispose();
      rendererInstanceRef.current = null;
      setRendererRef(null);
    };
  }, []);

  // 3. Update active Venue geometry
  useEffect(() => {
    if (!rendererInstanceRef.current) return;
    rendererInstanceRef.current.setVenue(activeVenue);
    rendererInstanceRef.current.renderFrame(rig, stereo, visConfig.showFrustums, visConfig.comfortWarningThresholds.maxBaselineRatio);
    setViewDistanceMeters(calculateViewDistance(rendererInstanceRef.current));
  }, [activeVenue]);

  // 4. Update VR scale mode parameters
  useEffect(() => {
    if (!rendererInstanceRef.current) return;
    rendererInstanceRef.current.setVRScaleMode(vrScaleMode);
  }, [vrScaleMode]);

  // 5. Render frame loop updates on config edits
  useEffect(() => {
    if (!rendererInstanceRef.current) return;
    rendererInstanceRef.current.renderFrame(rig, stereo, visConfig.showFrustums, visConfig.comfortWarningThresholds.maxBaselineRatio);
  }, [rig, stereo, visConfig]);

  const jumpView = (type: 'overhead' | 'sideline' | 'behind-rig') => {
    const renderer = rendererInstanceRef.current;
    if (!renderer) return;

    isJumpingRef.current = true;
    setActiveJump(type);

    if (type === 'overhead') {
      renderer.planningCamera.position.set(0, 0, 25);
      renderer.planningCamera.up.set(0, 1, 0); // Avoid singularity looking straight down
      renderer.controls.target.set(0, 0, 0);
      renderer.controls.update();
      setViewDistanceMeters(calculateViewDistance(renderer));
    } else if (type === 'sideline') {
      const distMeters = 30 / METERS_TO_FEET;
      renderer.planningCamera.position.set(0, -distMeters, 4);
      renderer.planningCamera.up.set(0, 0, 1);
      renderer.controls.target.set(0, 0, 0);
      renderer.controls.update();
      setViewDistanceMeters(calculateViewDistance(renderer));
    } else if (type === 'behind-rig') {
      const rigPos = new THREE.Vector3(rig.x, rig.y, rig.z);
      const targetPos = rig.lookAtTargetEnabled
        ? new THREE.Vector3(rig.lookAtTarget.x, rig.lookAtTarget.y, rig.lookAtTarget.z)
        : new THREE.Vector3(rig.convergenceTarget.x, rig.convergenceTarget.y, rig.convergenceTarget.z);
      
      const dir = new THREE.Vector3().subVectors(targetPos, rigPos);
      dir.z = 0; // XY plane project
      if (dir.lengthSq() < 0.01) {
        dir.set(1, 0, 0);
      } else {
        dir.normalize();
      }

      const behindDistance = 4 / METERS_TO_FEET;
      const aboveDistance = 2 / METERS_TO_FEET;
      const lookAheadDistance = 10 / METERS_TO_FEET;
      const camPos = rigPos.clone().addScaledVector(dir, -behindDistance);
      camPos.z = rig.z + aboveDistance;
      const viewTarget = rigPos.clone().addScaledVector(dir, lookAheadDistance);
      viewTarget.z = rig.z;

      renderer.planningCamera.position.copy(camPos);
      renderer.planningCamera.up.set(0, 0, 1);
      renderer.controls.target.copy(viewTarget);
      renderer.controls.update();
      setViewDistanceMeters(calculateViewDistance(renderer));
    }

    setTimeout(() => {
      isJumpingRef.current = false;
    }, 50);
  };

  return (
    <div 
      ref={containerRef} 
      className="visualizer-container" 
      style={{
        flex: 1,
        position: 'relative',
        background: '#050505',
        height: '100%',
        minHeight: 0,
        outline: 'none',
        overflow: 'hidden'
      }}
    >
      {stereo.showQualityOverlay && stereo.displayMode !== 'stereo-plane' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 22,
          background: 'rgba(0,0,0,0.85)',
          border: `1px solid ${qualityState.color}`,
          borderRadius: '8px',
          padding: '8px 12px',
          pointerEvents: 'auto'
        }}
        title={scaleTooltip}
        >
          <div style={{ color: '#888', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '3px' }}>
            Point Comfort Heatmap
          </div>
          <div style={{ color: qualityState.color, fontFamily: 'monospace', fontSize: '15px', fontWeight: 700 }}>
            Target {qualityState.label} · {comfortPercent.toFixed(0)}%
          </div>
          <div style={{ color: '#aaa', fontSize: '10px', fontWeight: 600, marginTop: '4px' }}>
            B/d {comfortRatio.toFixed(3)} ÷ limit {comfortLimit.toFixed(3)}
          </div>
        </div>
      )}
      {stereo.showQualityOverlay && stereo.displayMode !== 'stereo-plane' && (
        <div style={{
          position: 'absolute',
          right: '12px',
          bottom: '12px',
          zIndex: 22,
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '9px 11px',
          pointerEvents: 'auto',
          minWidth: '178px'
        }}>
          <div title={scaleTooltip} style={{ color: '#888', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '7px' }}>
            Diplopia Scale
          </div>
          {[
            { color: '#4caf50', label: 'Comfortable', detail: '< 75%', title: 'Below 75% of the selected comfort limit.' },
            { color: '#f0a040', label: 'Caution', detail: '75-100%', title: 'Approaching the selected comfort limit.' },
            { color: '#e74c3c', label: 'Diplopia Risk', detail: '> 100%', title: 'Baseline/distance exceeds the selected comfort limit.' }
          ].map((item) => (
            <div key={item.label} title={`${item.title} ${scaleTooltip}`} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: '7px', alignItems: 'center', marginTop: '5px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color, display: 'inline-block' }} />
              <span style={{ color: '#ddd', fontSize: '11px', fontWeight: 650 }}>{item.label}</span>
              <span style={{ color: '#888', fontSize: '10px', fontFamily: 'monospace' }}>{item.detail}</span>
            </div>
          ))}
        </div>
      )}
      {/* View Presets Jumps Bar */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        gap: '8px',
        background: 'rgba(0,0,0,0.85)',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid #333',
        pointerEvents: 'auto'
      }}>
        <span style={{ fontSize: '11px', color: '#888', fontWeight: 600, alignSelf: 'center', textTransform: 'uppercase', marginRight: '4px' }}>View Jumps:</span>
        <button
          onClick={() => jumpView('overhead')}
          style={{
            background: activeJump === 'overhead' ? '#2e4057' : '#222',
            color: activeJump === 'overhead' ? '#5b9bd5' : '#fff',
            border: activeJump === 'overhead' ? '1px solid #5b9bd5' : '1px solid #444',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Overhead Down
        </button>
        <button
          onClick={() => jumpView('sideline')}
          style={{
            background: activeJump === 'sideline' ? '#2e4057' : '#222',
            color: activeJump === 'sideline' ? '#5b9bd5' : '#fff',
            border: activeJump === 'sideline' ? '1px solid #5b9bd5' : '1px solid #444',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Sideline 30ft
        </button>
        <button
          onClick={() => jumpView('behind-rig')}
          style={{
            background: activeJump === 'behind-rig' ? '#2e4057' : '#222',
            color: activeJump === 'behind-rig' ? '#5b9bd5' : '#fff',
            border: activeJump === 'behind-rig' ? '1px solid #5b9bd5' : '1px solid #444',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Behind Rig -4ft +2ft
        </button>
      </div>
      <div style={{
        position: 'absolute',
        top: stereo.displayMode === 'side-by-side' ? '44px' : '12px',
        right: '12px',
        zIndex: 21,
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '10px 12px',
        minWidth: '170px',
        pointerEvents: 'none',
        textAlign: 'right'
      }}>
        <div style={{ color: '#888', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Dist to Center Court
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'baseline', color: '#aaa', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
          <span>Viewer</span>
          <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontSize: '18px', lineHeight: 1.1, textTransform: 'none' }}>
            {viewDistanceToCenter.toFixed(unit === 'feet' ? 1 : 2)} {distanceUnit}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'baseline', color: '#aaa', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>
          <span>Rig</span>
          <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '14px', lineHeight: 1.1, textTransform: 'none' }}>
            {rigDistanceToCenter.toFixed(unit === 'feet' ? 1 : 2)} {distanceUnit}
          </span>
        </div>
      </div>
      {/* Dynamic view overlays */}
      {stereo.displayMode === 'side-by-side' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <div style={{ background: 'rgba(0,0,0,0.8)', color: '#00ffff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', border: '1px solid rgba(0,255,255,0.3)' }}>
            {stereo.eyeOrder === 'left-right' ? 'Left Eye View' : 'Right Eye View'}
          </div>
          <div style={{ background: 'rgba(0,0,0,0.8)', color: '#ff00ff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', border: '1px solid rgba(255,0,255,0.3)' }}>
            {stereo.eyeOrder === 'left-right' ? 'Right Eye View' : 'Left Eye View'}
          </div>
        </div>
      )}

      {stereo.displayMode === 'stereo-plane' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fbbf24', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', border: '1px solid rgba(251,191,36,0.3)' }}>
            Stereo Anaglyph Preview{stereo.anaglyphBlackWhite ? ' · B/W' : ''}
          </div>
        </div>
      )}
      {/* Help text for camera navigation */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(0,0,0,0.8)',
        color: '#aaa',
        fontSize: '10px',
        padding: '6px 12px',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 10,
        fontFamily: 'monospace',
        border: '1px solid #222',
        display: 'flex',
        gap: '12px'
      }}>
        <span>🖱️ <b>Left Click + Drag</b>: Orbit</span>
        <span><b>Right Click + Drag</b>: Pan</span>
        <span><b>Scroll</b>: Zoom</span>
        <span><b>Drag Handles</b>: Move Rig</span>
      </div>
    </div>
  );
};

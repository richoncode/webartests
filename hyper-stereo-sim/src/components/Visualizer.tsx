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
}

export const Visualizer: React.FC<VisualizerProps> = ({
  rig,
  setRig,
  stereo,
  visConfig,
  activeVenue,
  vrScaleMode,
  setRendererRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererInstanceRef = useRef<StereoRenderer | null>(null);

  // 1. Initialize StereoRenderer on Mount
  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new StereoRenderer(containerRef.current);
    rendererInstanceRef.current = renderer;
    setRendererRef(renderer);

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

    // 2. High-DPI Canvas Scaling with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      renderer.resize(width, height);
      renderer.renderFrame(rig, stereo, visConfig.showFrustums);
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
    rendererInstanceRef.current.renderFrame(rig, stereo, visConfig.showFrustums);
  }, [activeVenue]);

  // 4. Update VR scale mode parameters
  useEffect(() => {
    if (!rendererInstanceRef.current) return;
    rendererInstanceRef.current.setVRScaleMode(vrScaleMode);
  }, [vrScaleMode]);

  // 5. Render frame loop updates on config edits
  useEffect(() => {
    if (!rendererInstanceRef.current) return;
    rendererInstanceRef.current.renderFrame(rig, stereo, visConfig.showFrustums);
  }, [rig, stereo, visConfig]);

  return (
    <div 
      ref={containerRef} 
      className="visualizer-container" 
      style={{
        flex: 1,
        position: 'relative',
        background: '#050505',
        height: 'calc(100vh - 57px)',
        outline: 'none',
        overflow: 'hidden'
      }}
    >
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
            Stereo 3D Plane: {stereo.fallbackMode.replace('-', ' ')} preview
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

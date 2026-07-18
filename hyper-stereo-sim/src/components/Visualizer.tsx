import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CameraRigConfiguration, StereoConfiguration, VisualizationConfiguration } from '../types';
import { StereoRenderer } from '../renderer/StereoRenderer';
import { BaseVenue } from '../venue/Venue';
import { HmdControlDefinition } from './HmdControlPanels';

interface VisualizerProps {
  rig: CameraRigConfiguration;
  setRig: React.Dispatch<React.SetStateAction<CameraRigConfiguration>>;
  stereo: StereoConfiguration;
  setStereo: React.Dispatch<React.SetStateAction<StereoConfiguration>>;
  visConfig: VisualizationConfiguration;
  activeVenue: BaseVenue;
  vrScaleMode: 'tabletop' | 'full-scale';
  setRendererRef: (renderer: StereoRenderer | null) => void;
  onXRPresentingChange?: (isPresenting: boolean) => void;
  unit: 'feet' | 'meters';
  presetOverlayUrl?: string | null;
  presetOverlayOpacity?: number;
  hmdControls: HmdControlDefinition[];
}

export const Visualizer: React.FC<VisualizerProps> = ({
  rig,
  setRig,
  stereo,
  setStereo,
  visConfig,
  activeVenue,
  vrScaleMode,
  setRendererRef,
  onXRPresentingChange,
  unit,
  presetOverlayUrl,
  presetOverlayOpacity = 0.42,
  hmdControls
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gestureLayerRef = useRef<HTMLDivElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const rendererInstanceRef = useRef<StereoRenderer | null>(null);
  const [activeJump, setActiveJump] = React.useState<'overhead' | 'sideline' | 'behind-rig' | null>('behind-rig');
  const [viewDistanceMeters, setViewDistanceMeters] = React.useState(0);
  const [viewSize, setViewSize] = React.useState({ width: 0, height: 0 });
  const [comparisonImageUrl, setComparisonImageUrl] = React.useState<string | null>(null);
  const [comparisonOpacity, setComparisonOpacity] = React.useState(0.42);
  const [comparisonScale, setComparisonScale] = React.useState(1);
  const [comparisonOffset, setComparisonOffset] = React.useState({ x: 0, y: 0 });
  const [showAnaglyphAdjust, setShowAnaglyphAdjust] = React.useState(false);
  const comparisonDragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const comparisonPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const comparisonPinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const comparisonScaleRef = useRef(1);
  const comparisonOffsetRef = useRef({ x: 0, y: 0 });
  const isJumpingRef = useRef(false);
  const METERS_TO_FEET = 3.28084;
  const MIN_COMPARISON_ZOOM = 0.25;
  const MAX_COMPARISON_ZOOM = 6;
  const isStereoMode = stereo.displayMode !== '3d-planning';
  const disparityPixelOffset = stereo.disparityPixelOffset ?? 0;
  const anaglyphRedIntensity = stereo.anaglyphRedIntensity ?? 0.32;
  const anaglyphBlueIntensity = stereo.anaglyphBlueIntensity ?? 0.72;
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
  const isComparisonHome = (
    Math.abs(comparisonScale - 1) < 0.001 &&
    Math.abs(comparisonOffset.x) < 0.5 &&
    Math.abs(comparisonOffset.y) < 0.5
  );

  useEffect(() => {
    comparisonScaleRef.current = comparisonScale;
  }, [comparisonScale]);

  useEffect(() => {
    comparisonOffsetRef.current = comparisonOffset;
  }, [comparisonOffset]);

  // 1. Initialize StereoRenderer on Mount
  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const renderer = new StereoRenderer(contentRef.current);
    setViewSize({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });
    rendererInstanceRef.current = renderer;
    renderer.setVenue(activeVenue);
    setRendererRef(renderer);
    renderer.onXRPresentingChange = onXRPresentingChange;
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
      setViewSize({ width, height });
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

  useEffect(() => () => {
    if (comparisonImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(comparisonImageUrl);
    }
  }, [comparisonImageUrl]);

  useEffect(() => {
    setComparisonImageUrl((previousUrl) => {
      if (previousUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
      return presetOverlayUrl || null;
    });
    setComparisonOpacity(presetOverlayOpacity);
    resetComparisonTransform();
  }, [presetOverlayUrl, presetOverlayOpacity]);

  useEffect(() => {
    const gestureLayer = gestureLayerRef.current;
    if (!gestureLayer || stereo.displayMode !== 'side-by-side') return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const zoomFactor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      zoomComparisonAtPoint(event.clientX, event.clientY, zoomFactor);
    };

    gestureLayer.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      gestureLayer.removeEventListener('wheel', handleWheel);
    };
  }, [stereo.displayMode]);

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

  useEffect(() => {
    if (!rendererInstanceRef.current) return;
    rendererInstanceRef.current.setHmdControlDefinitions(hmdControls);
  }, [hmdControls]);

  const updateBehindRigView = (renderer: StereoRenderer) => {
    const rigPos = new THREE.Vector3(rig.x, rig.y, rig.z);
    const targetPos = rig.lookAtTargetEnabled
      ? new THREE.Vector3(rig.lookAtTarget.x, rig.lookAtTarget.y, rig.lookAtTarget.z)
      : new THREE.Vector3(rig.convergenceTarget.x, rig.convergenceTarget.y, rig.convergenceTarget.z);

    const dir = rig.actualCameras
      ? new THREE.Vector3(
          rig.actualCameras.viewDirection.x,
          rig.actualCameras.viewDirection.y,
          rig.actualCameras.viewDirection.z
        )
      : new THREE.Vector3().subVectors(targetPos, rigPos);
    if (dir.lengthSq() < 0.01) {
      dir.set(1, 0, 0);
    } else {
      dir.normalize();
    }

    const behindDistance = 6 / METERS_TO_FEET;
    const aboveLineDistance = 1 / METERS_TO_FEET;
    const lookAheadDistance = 10 / METERS_TO_FEET;
    const camPos = rigPos
      .clone()
      .addScaledVector(dir, -behindDistance)
      .add(new THREE.Vector3(0, 0, aboveLineDistance));
    const viewTarget = rigPos.clone().addScaledVector(dir, lookAheadDistance);

    isJumpingRef.current = true;
    renderer.planningCamera.position.copy(camPos);
    renderer.planningCamera.up.set(0, 0, 1);
    renderer.controls.target.copy(viewTarget);
    renderer.controls.update();
    setViewDistanceMeters(calculateViewDistance(renderer));
    setTimeout(() => {
      isJumpingRef.current = false;
    }, 50);
  };

  // 5. Render frame loop updates on config edits
  useEffect(() => {
    if (!rendererInstanceRef.current) return;
    const renderer = rendererInstanceRef.current;
    renderer.renderFrame(rig, stereo, visConfig.showFrustums, visConfig.comfortWarningThresholds.maxBaselineRatio);
    if (activeJump === 'behind-rig') {
      updateBehindRigView(renderer);
    }
  }, [rig, stereo, visConfig]);

  const jumpView = (type: 'overhead' | 'sideline' | 'behind-rig') => {
    const renderer = rendererInstanceRef.current;
    if (!renderer) return;

    isJumpingRef.current = true;
    setActiveJump(type);

    if (type === 'overhead') {
      renderer.planningCamera.position.set(0, 0, 25);
      renderer.planningCamera.up.set(0, -1, 0); // Rotate top-down view 180° while avoiding singularity.
      renderer.controls.target.set(0, 0, 0);
      renderer.controls.update();
      setViewDistanceMeters(calculateViewDistance(renderer));
    } else if (type === 'sideline') {
      const distMeters = 30 / METERS_TO_FEET;
      renderer.planningCamera.position.set(0, distMeters, 4);
      renderer.planningCamera.up.set(0, 0, 1);
      renderer.controls.target.set(0, 0, 0);
      renderer.controls.update();
      setViewDistanceMeters(calculateViewDistance(renderer));
    } else if (type === 'behind-rig') {
      updateBehindRigView(renderer);
    }

    setTimeout(() => {
      isJumpingRef.current = false;
    }, 50);
  };

  const loadImageElement = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  const compositeComparisonOverlay = async (baseDataUrl: string) => {
    if (stereo.displayMode !== 'side-by-side' || !comparisonImageUrl || !comparisonOverlayRect) {
      return baseDataUrl;
    }

    const [baseImage, overlayImage] = await Promise.all([
      loadImageElement(baseDataUrl),
      loadImageElement(comparisonImageUrl)
    ]);
    const canvas = document.createElement('canvas');
    canvas.width = baseImage.naturalWidth;
    canvas.height = baseImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseDataUrl;

    const content = document.createElement('canvas');
    content.width = canvas.width;
    content.height = canvas.height;
    const contentCtx = content.getContext('2d');
    if (!contentCtx) return baseDataUrl;

    contentCtx.drawImage(baseImage, 0, 0);
    contentCtx.save();
    contentCtx.globalAlpha = comparisonOpacity;
    contentCtx.globalCompositeOperation = 'screen';
    contentCtx.drawImage(overlayImage, 0, 0, content.width, content.height);
    contentCtx.restore();

    const scaleToExport = canvas.width / comparisonOverlayRect.width;
    ctx.save();
    ctx.translate(
      canvas.width / 2 + comparisonOffset.x * scaleToExport,
      canvas.height / 2 + comparisonOffset.y * scaleToExport
    );
    ctx.scale(comparisonScale, comparisonScale);
    ctx.drawImage(content, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL('image/png');
  };

  const savePNG = async () => {
    const renderer = rendererInstanceRef.current;
    if (!renderer) return;
    const dataUrl = await compositeComparisonOverlay(renderer.exportPNG(rig, stereo));
    const link = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = dataUrl;
    link.download = `hyper-stereo-${stereo.displayMode}-${stamp}.png`;
    link.click();
  };

  const openComparisonImagePicker = () => {
    overlayInputRef.current?.click();
  };

  const loadComparisonImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    setComparisonImageUrl((previousUrl) => {
      if (previousUrl?.startsWith('blob:')) URL.revokeObjectURL(previousUrl);
      return nextUrl;
    });
    setComparisonScale(1);
    setComparisonOffset({ x: 0, y: 0 });
    event.target.value = '';
  };

  const removeComparisonImage = () => {
    setComparisonImageUrl((previousUrl) => {
      if (previousUrl?.startsWith('blob:')) URL.revokeObjectURL(previousUrl);
      return null;
    });
    resetComparisonTransform();
  };

  const pointerDistance = () => {
    const points = Array.from(comparisonPointersRef.current.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const pointerCenter = () => {
    const points = Array.from(comparisonPointersRef.current.values());
    if (points.length < 2) return null;
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2
    };
  };

  const zoomComparisonAtPoint = (clientX: number, clientY: number, zoomFactor: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const currentScale = comparisonScaleRef.current;
    const nextScale = Math.max(MIN_COMPARISON_ZOOM, Math.min(MAX_COMPARISON_ZOOM, currentScale * zoomFactor));
    if (nextScale === currentScale) return;

    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const pointFromOriginX = clientX - originX;
    const pointFromOriginY = clientY - originY;
    const currentOffset = comparisonOffsetRef.current;
    const scaleRatio = nextScale / currentScale;
    const nextOffset = {
      x: pointFromOriginX - (pointFromOriginX - currentOffset.x) * scaleRatio,
      y: pointFromOriginY - (pointFromOriginY - currentOffset.y) * scaleRatio
    };

    comparisonScaleRef.current = nextScale;
    comparisonOffsetRef.current = nextOffset;
    setComparisonScale(nextScale);
    setComparisonOffset(nextOffset);
  };

  const panOrPinchComparisonImage = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    comparisonPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pinch = comparisonPinchRef.current;
    if (comparisonPointersRef.current.size >= 2 && pinch) {
      const distance = pointerDistance();
      if (distance > 0) {
        const center = pointerCenter();
        const nextScale = Math.max(MIN_COMPARISON_ZOOM, Math.min(MAX_COMPARISON_ZOOM, pinch.scale * (distance / pinch.distance)));
        if (center) {
          zoomComparisonAtPoint(center.x, center.y, nextScale / comparisonScaleRef.current);
        } else {
          comparisonScaleRef.current = nextScale;
          setComparisonScale(nextScale);
        }
      }
      return;
    }

    const drag = comparisonDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    setComparisonOffset({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY
    });
  };

  const resetComparisonTransform = () => {
    comparisonScaleRef.current = 1;
    comparisonOffsetRef.current = { x: 0, y: 0 };
    setComparisonScale(1);
    setComparisonOffset({ x: 0, y: 0 });
  };

  const releaseComparisonPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    comparisonPointersRef.current.delete(event.pointerId);
    comparisonPinchRef.current = null;
    comparisonDragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be released by the browser on cancellation.
    }
  };

  const getSideBySideOverlayRect = () => {
    const width = viewSize.width;
    const height = viewSize.height;
    if (!width || !height) return null;

    const halfW = width / 2;
    const aspect = rig.aspect || (16 / 9);
    let frameW = halfW;
    let frameH = frameW / aspect;
    if (frameH > height) {
      frameH = height;
      frameW = frameH * aspect;
    }

    const leftX = (halfW - frameW) / 2;
    const rightX = halfW + (halfW - frameW) / 2;
    const top = (height - frameH) / 2;
    const left = Math.min(leftX, rightX);
    const right = Math.max(leftX + frameW, rightX + frameW);

    return {
      left,
      top,
      width: right - left,
      height: frameH
    };
  };

  const comparisonOverlayRect = getSideBySideOverlayRect();

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
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
    >
      <div
        ref={contentRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          transform: stereo.displayMode === 'side-by-side'
            ? `translate(${comparisonOffset.x}px, ${comparisonOffset.y}px) scale(${comparisonScale})`
            : 'none',
          transformOrigin: '50% 50%',
          pointerEvents: 'auto',
          overscrollBehavior: 'none'
        }}
      >
        {stereo.displayMode === 'side-by-side' && comparisonImageUrl && comparisonOverlayRect && (
          <div
            style={{
              position: 'absolute',
              left: `${comparisonOverlayRect.left}px`,
              top: `${comparisonOverlayRect.top}px`,
              width: `${comparisonOverlayRect.width}px`,
              height: `${comparisonOverlayRect.height}px`,
              overflow: 'hidden',
              pointerEvents: 'none',
              zIndex: 2,
              touchAction: 'none'
            }}
          >
            <img
              src={comparisonImageUrl}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                opacity: comparisonOpacity,
                objectFit: 'fill',
                pointerEvents: 'none',
                mixBlendMode: 'screen',
                userSelect: 'none'
              }}
            />
          </div>
        )}
      </div>
      {stereo.displayMode === 'side-by-side' && (
        <div
          ref={gestureLayerRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 8,
            cursor: comparisonDragRef.current ? 'grabbing' : 'grab',
            touchAction: 'none',
            pointerEvents: 'auto',
            overscrollBehavior: 'none'
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            comparisonPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            comparisonDragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: comparisonOffset.x,
              originY: comparisonOffset.y
            };
            if (comparisonPointersRef.current.size >= 2) {
              comparisonPinchRef.current = {
                distance: pointerDistance(),
                scale: comparisonScale
              };
            }
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={panOrPinchComparisonImage}
          onPointerUp={releaseComparisonPointer}
          onPointerCancel={releaseComparisonPointer}
          title="Drag to pan the content view. Pinch or scroll to zoom."
        />
      )}
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
      <input
        ref={overlayInputRef}
        type="file"
        accept="image/*"
        onChange={loadComparisonImage}
        style={{ display: 'none' }}
      />
      {stereo.displayMode === 'side-by-side' && !isComparisonHome && (
        <button
          onClick={resetComparisonTransform}
          title="Reset Side By Side pan and zoom"
          style={{
            position: 'absolute',
            right: '12px',
            top: '128px',
            zIndex: 24,
            width: '34px',
            height: '34px',
            display: 'grid',
            placeItems: 'center',
            background: '#242424',
            color: '#d8d8d8',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: 0,
            fontSize: '16px',
            fontWeight: 800,
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)'
          }}
        >
          ⌂
        </button>
      )}
      {comparisonImageUrl && (
        <div style={{
          position: 'absolute',
          left: '12px',
          bottom: '44px',
          zIndex: 24,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(0,0,0,0.86)',
          border: '1px solid #333',
          borderRadius: '6px',
          padding: '7px 10px',
          pointerEvents: 'auto'
        }}>
          <span style={{ color: '#aaa', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Overlay Alpha
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={comparisonOpacity}
            onChange={(event) => setComparisonOpacity(parseFloat(event.target.value))}
            style={{ width: '160px' }}
            title="Adjust selected capture overlay opacity"
          />
          <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontSize: '11px', minWidth: '34px', textAlign: 'right' }}>
            {Math.round(comparisonOpacity * 100)}%
          </span>
          <span style={{ color: '#5b9bd5', fontFamily: 'monospace', fontSize: '11px', minWidth: '42px', textAlign: 'right' }}>
            {comparisonScale.toFixed(2)}x
          </span>
          <button
            onClick={resetComparisonTransform}
            title="Reset overlay pan and zoom"
            style={{
              background: '#222',
              color: '#ddd',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '4px 7px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
          <button
            onClick={removeComparisonImage}
            title="Remove the current overlay image"
            style={{
              background: '#241414',
              color: '#ffb5b5',
              border: '1px solid #5a2525',
              borderRadius: '4px',
              padding: '4px 7px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Remove
          </button>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          right: '12px',
          bottom: stereo.showQualityOverlay && stereo.displayMode !== 'stereo-plane' ? '128px' : '12px',
          zIndex: 24,
          pointerEvents: 'auto',
          display: 'flex',
          gap: '6px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)'
        }}
      >
        <button
          onClick={savePNG}
          title={stereo.displayMode === 'side-by-side'
            ? 'Save PNG of the two camera frames without grey padding'
            : 'Save PNG of the current rendered view'}
          style={{
            background: '#242424',
            color: '#d8d8d8',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '7px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Save PNG
        </button>
        <button
          onClick={openComparisonImagePicker}
          title="Select an actual capture image to overlay on the Side By Side camera frames"
          style={{
            width: '30px',
            background: '#666',
            color: '#fff',
            border: '1px solid #888',
            borderRadius: '4px',
            padding: '7px 0',
            fontSize: '13px',
            fontWeight: 800,
            lineHeight: 1,
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>
      {/* View Presets Jumps Bar */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        pointerEvents: 'auto'
      }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(0,0,0,0.85)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #333'
          }}
        >
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
            Follow Rig
          </button>
        </div>
        {isStereoMode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '6px 10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
          }}>
            <span
              title="View-only pixel shift. Positive values move the left eye left and right eye right by half the amount."
              style={{
                color: '#aaa',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}
            >
              Disparity
            </span>
            <input
              type="range"
              min="-120"
              max="120"
              step="1"
              value={disparityPixelOffset}
              onChange={(event) => setStereo(prev => ({
                ...prev,
                disparityPixelOffset: Number(event.target.value)
              }))}
              title="Shift eye views horizontally in pixels without moving the rig or changing convergence"
              style={{ width: '220px' }}
            />
            <span style={{
              color: '#5b9bd5',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              minWidth: '54px',
              textAlign: 'right'
            }}>
              {disparityPixelOffset > 0 ? '+' : ''}{disparityPixelOffset}px
            </span>
            <button
              onClick={() => setStereo(prev => ({ ...prev, disparityPixelOffset: 0 }))}
              title="Reset disparity offset"
              style={{
                background: '#222',
                color: '#ddd',
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '4px 7px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        )}
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

      {stereo.displayMode === 'wiggle-3d' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <div style={{ background: 'rgba(0,0,0,0.8)', color: '#5b9bd5', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', border: '1px solid rgba(91,155,213,0.35)' }}>
            Wiggle 3D Preview
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
      {stereo.displayMode === 'stereo-plane' && stereo.fallbackMode === 'anaglyph' && (
        <>
          <button
            onClick={() => setShowAnaglyphAdjust(prev => !prev)}
            title="Adjust anaglyph red and blue channel intensity"
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '58px',
              zIndex: 25,
              width: '34px',
              height: '34px',
              borderRadius: '4px',
              border: showAnaglyphAdjust ? '1px solid #5b9bd5' : '1px solid #555',
              background: showAnaglyphAdjust ? '#1e2d40' : '#242424',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              boxShadow: '0 2px 10px rgba(0,0,0,0.35)'
            }}
          >
            <span style={{ position: 'relative', width: '22px', height: '18px', display: 'block' }}>
              <span style={{
                position: 'absolute',
                left: '2px',
                top: '3px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: `rgba(255,0,0,${0.28 + anaglyphRedIntensity * 0.72})`,
                border: '1px solid rgba(255,120,120,0.75)'
              }} />
              <span style={{
                position: 'absolute',
                right: '2px',
                top: '3px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: `rgba(0,80,255,${0.28 + anaglyphBlueIntensity * 0.72})`,
                border: '1px solid rgba(120,180,255,0.75)',
                mixBlendMode: 'screen'
              }} />
            </span>
          </button>
          {showAnaglyphAdjust && (
            <div
              title="View-only anaglyph channel gain. Lower red if it burns through the blue lens; lower blue if the right eye dominates."
              style={{
                position: 'absolute',
                right: '12px',
                bottom: '100px',
                zIndex: 25,
                width: '252px',
                background: 'rgba(0,0,0,0.9)',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '9px 10px',
                pointerEvents: 'auto',
                boxShadow: '0 2px 12px rgba(0,0,0,0.45)'
              }}
            >
              <div style={{
                color: '#aaa',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                Anaglyph Adjust
              </div>
              {[
                { key: 'anaglyphRedIntensity' as const, label: 'Red', color: '#ff5555', value: anaglyphRedIntensity },
                { key: 'anaglyphBlueIntensity' as const, label: 'Blue', color: '#5b9bd5', value: anaglyphBlueIntensity }
              ].map((channel) => (
                <div key={channel.key} style={{ display: 'grid', gridTemplateColumns: '38px 1fr 42px', gap: '8px', alignItems: 'center', marginTop: '7px' }}>
                  <span style={{ color: channel.color, fontSize: '11px', fontWeight: 800 }}>
                    {channel.label}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={channel.value}
                    onChange={(event) => setStereo(prev => ({
                      ...prev,
                      [channel.key]: Number(event.target.value)
                    }))}
                    title={`Set ${channel.label.toLowerCase()} channel intensity`}
                  />
                  <span style={{ color: '#ddd', fontFamily: 'monospace', fontSize: '10px', textAlign: 'right' }}>
                    {Math.round(channel.value * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
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

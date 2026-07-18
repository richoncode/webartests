import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { CameraRigConfiguration, StereoConfiguration } from '../types';
import { StereoRig } from '../rig/StereoRig';
import { BaseVenue } from '../venue/Venue';
import { HmdControlDefinition } from '../components/HmdControlPanels';

type XrUiHitRegion = {
  id: string;
  kind: 'button' | 'slider';
  x: number;
  y: number;
  width: number;
  height: number;
  control: HmdControlDefinition;
  buttonIndex?: number;
};

type XrUiPanel = {
  side: 'left' | 'right';
  group: THREE.Group;
  mesh: THREE.Mesh;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  regions: XrUiHitRegion[];
};

export class StereoRenderer {
  container: HTMLDivElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  
  // Outer group containing venue & rig that can be scaled for VR tabletop view
  xrGroup: THREE.Group;

  planningCamera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  transformControls: any;
  
  rig: StereoRig;
  activeVenue: BaseVenue | null = null;
  venueGeometry: THREE.Object3D | null = null;
  qualityHeatmap: THREE.Mesh | null = null;
  targetMarker: THREE.Mesh | null = null;
  stereoPanelGroup: THREE.Group;

  // React callbacks for direct manipulation sync
  onRigMoveCallback?: (x: number, y: number, z: number) => void;
  onViewerMoveCallback?: () => void;
  onXRPresentingChange?: (isPresenting: boolean) => void;

  private lastRigConfig?: CameraRigConfiguration;
  private lastStereoConfig?: StereoConfiguration;
  private lastShowFrustums?: boolean;
  private lastQualityThreshold = 0.033;
  private vrScaleMode: 'tabletop' | 'full-scale' = 'tabletop';
  private xrScaleApplied = false;
  private desktopBackground: THREE.Color | null = null;
  private originalVenueMaterialColors = new WeakMap<THREE.Material, THREE.Color>();
  private sbsRenderTarget: THREE.WebGLRenderTarget;
  private sbsTexture: THREE.Texture;
  private sbsCopyScene: THREE.Scene;
  private sbsCopyCamera: THREE.OrthographicCamera;
  private leftEyePanel: THREE.Mesh;
  private rightEyePanel: THREE.Mesh;
  private sbsPreviewPanel: THREE.Mesh;
  private sbsResolutionLabel: THREE.Mesh;
  private sbsResolutionTexture: THREE.CanvasTexture;
  private sbsResolutionCanvas: HTMLCanvasElement;
  private sbsResolutionCtx: CanvasRenderingContext2D;
  private hmdRenderMode: 'stereo' | 'sbs' = 'stereo';
  private xrPanelDistanceMeters = 4 / 3.28084;
  private xrPanelWidthMeters = 1.25;
  private xrPanelPlaced = false;
  private xrPanelPlacementFrames = 0;
  private xrPanelBaseQuaternion = new THREE.Quaternion();
  private xrUiGroup: THREE.Group;
  private xrUiPanels: XrUiPanel[] = [];
  private hmdControls: HmdControlDefinition[] = [];
  private xrRaycaster = new THREE.Raycaster();
  private xrControllerDrag: { controller: THREE.Group; panelSide: 'left' | 'right'; regionId: string } | null = null;
  private xrControllers: THREE.Group[] = [];
  private xrHoveredRegionId: string | null = null;

  constructor(container: HTMLDivElement) {
    this.container = container;

    // 1. Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.xr.enabled = true; // WebXR support enabled
    container.appendChild(this.renderer.domElement);

    // 2. Initialize Scene & Lighting
    this.scene = new THREE.Scene();
    this.desktopBackground = new THREE.Color(0x0a0a0a);
    this.scene.background = this.desktopBackground;

    // VR scale offset container
    this.xrGroup = new THREE.Group();
    this.scene.add(this.xrGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 20); // vertical is Z
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // 3. Initialize Planning Camera (Orbit View)
    // Z is vertical: initialize camera elevated along Y/Z looking towards center
    this.planningCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    this.planningCamera.position.set(20, 25, 15);
    this.planningCamera.up.set(0, 0, 1); // Z is UP

    // 4. Initialize Controls
    this.controls = new OrbitControls(this.planningCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01; // Don't go below floor
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.zoomToCursor = true;

    // 5. Initialize Camera Rig Model
    this.rig = new StereoRig();
    this.xrGroup.add(this.rig.group);
    this.targetMarker = this.createTargetMarker();
    this.xrGroup.add(this.targetMarker);
    this.sbsRenderTarget = this.createSbsRenderTarget();
    this.sbsTexture = this.sbsRenderTarget.texture;
    this.sbsTexture.name = 'sbsTexture';
    this.sbsTexture.colorSpace = THREE.SRGBColorSpace;
    const sbsCopy = this.createSbsCopyPass(this.sbsTexture);
    this.sbsCopyScene = sbsCopy.scene;
    this.sbsCopyCamera = sbsCopy.camera;
    const stereoPanel = this.createStereoPanel(this.sbsTexture);
    this.stereoPanelGroup = stereoPanel.group;
    this.leftEyePanel = stereoPanel.leftPanel;
    this.rightEyePanel = stereoPanel.rightPanel;
    this.sbsPreviewPanel = stereoPanel.sbsPreviewPanel;
    this.sbsResolutionLabel = stereoPanel.sbsResolutionLabel;
    this.sbsResolutionTexture = stereoPanel.sbsResolutionTexture;
    this.sbsResolutionCanvas = stereoPanel.sbsResolutionCanvas;
    this.sbsResolutionCtx = stereoPanel.sbsResolutionCtx;
    this.scene.add(this.stereoPanelGroup);
    this.xrUiGroup = new THREE.Group();
    this.xrUiGroup.visible = false;
    this.scene.add(this.xrUiGroup);
    this.createXrUiPanels();
    this.setupXrControllers();

    // 6. Direct manipulation controls (TransformControls)
    this.transformControls = new TransformControls(this.planningCamera, this.renderer.domElement);
    this.transformControls.size = 0.75;
    // Set up default mode translate
    this.transformControls.setMode('translate');
    // Tell transformControls to treat Z as UP
    this.transformControls.attach(this.rig.group);
    this.scene.add(this.transformControls as any);

    // Drag listeners to prevent orbit conflicts and update React inputs
    this.transformControls.addEventListener('dragging-changed', (event: any) => {
      this.controls.enabled = !event.value;
    });

    this.transformControls.addEventListener('change', () => {
      if (this.onRigMoveCallback && this.transformControls.dragging) {
        // Sync position back to React
        const p = this.rig.group.position;
        this.onRigMoveCallback(p.x, p.y, p.z);
      }
    });

    // Start rendering frame loop
    this.renderer.setAnimationLoop((_time, frame) => this.animate(frame));
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.scene.background = null;
      this.renderer.setClearAlpha(0);
      this.stereoPanelGroup.visible = false;
      this.xrUiGroup.visible = false;
      this.xrPanelPlaced = false;
      this.xrPanelPlacementFrames = 0;
      this.onXRPresentingChange?.(true);
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.scene.background = this.desktopBackground;
      this.renderer.setClearAlpha(1);
      this.stereoPanelGroup.visible = false;
      this.xrUiGroup.visible = false;
      this.xrPanelPlaced = false;
      this.xrPanelPlacementFrames = 0;
      this.onXRPresentingChange?.(false);
    });
  }

  setVenue(venue: BaseVenue) {
    if (this.venueGeometry) {
      this.applyAnaglyphBlackWhite(false);
      this.xrGroup.remove(this.venueGeometry);
    }
    if (this.qualityHeatmap) {
      this.xrGroup.remove(this.qualityHeatmap);
      this.disposeObject(this.qualityHeatmap);
      this.qualityHeatmap = null;
    }
    this.activeVenue = venue;
    this.venueGeometry = venue.createGeometry();
    this.xrGroup.add(this.venueGeometry);

    // Reposition Orbit target to the default venue center
    const origin = venue.getDefaultOrigin();
    this.controls.target.copy(origin);

    if (this.lastRigConfig && this.lastStereoConfig?.showQualityOverlay) {
      this.updateQualityHeatmap(this.lastRigConfig, this.lastQualityThreshold, true);
    }
  }

  resize(width: number, height: number) {
    this.planningCamera.aspect = width / height;
    this.planningCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  // Toggles the dragging control handle in planning view
  setTransformControlsVisibility(visible: boolean) {
    if (visible) {
      this.transformControls.attach(this.rig.group);
      this.transformControls.visible = true;
    } else {
      this.transformControls.detach();
      this.transformControls.visible = false;
    }
  }

  // Set WebXR vr scale mode: tabletop scale vs full 1:1 scale
  setVRScaleMode(mode: 'tabletop' | 'full-scale') {
    this.vrScaleMode = mode;
    this.applyXRScale(this.renderer.xr.isPresenting);
  }

  setHmdControlDefinitions(controls: HmdControlDefinition[]) {
    this.hmdControls = controls;
    this.drawXrUiPanels();
  }

  setHmdRenderMode(mode: 'stereo' | 'sbs') {
    this.hmdRenderMode = mode;
    this.updateXrStereoPanelMode();
  }

  private applyXRScale(isPresenting: boolean) {
    const shouldUseTabletopScale = isPresenting && this.vrScaleMode === 'tabletop';
    if (shouldUseTabletopScale && !this.xrScaleApplied) {
      // Shrink venue model to 1:25 scale and lift onto table (0.8m above base)
      this.xrGroup.scale.set(0.04, 0.04, 0.04);
      this.xrGroup.position.set(0, 1.2, 0.8); // X, Y (forward), Z (up) in XR reference space
      this.xrScaleApplied = true;
    } else if (!shouldUseTabletopScale && this.xrScaleApplied) {
      // Keep desktop planning and full-scale XR in real venue meters.
      this.xrGroup.scale.set(1, 1, 1);
      this.xrGroup.position.set(0, 0, 0);
      this.xrScaleApplied = false;
    }
  }

  // Attach WebXR AR session button for HMD passthrough.
  getXRButtonElement(): HTMLElement {
    return ARButton.createButton(this.renderer, {
      optionalFeatures: ['local-floor', 'dom-overlay'],
      domOverlay: { root: document.body }
    });
  }

  async startPassthroughARSession() {
    const xr = navigator.xr;
    if (!xr) return false;

    const session = await xr.requestSession('immersive-ar', {
      optionalFeatures: ['local-floor', 'dom-overlay'],
      domOverlay: { root: document.body }
    });
    this.renderer.xr.setReferenceSpaceType('local');
    await this.renderer.xr.setSession(session);
    return true;
  }

  private animate(frame?: XRFrame) {
    this.controls.update();

    const isPresenting = this.renderer.xr.isPresenting;
    this.applyXRScale(isPresenting);
    this.onViewerMoveCallback?.();
    if (isPresenting) {
      this.updateXRStereoPanel(frame);
      this.updateXrHoverState();
      this.updateXrControllerDrag();
      this.renderXRStereoPanelTextures();
      this.configureXREyeLayers();
      // Render only the room-space stereo screen and flanking UI in AR.
      const previousXRGroupVisible = this.xrGroup.visible;
      const previousTransformVisible = this.transformControls.visible;
      this.xrGroup.visible = false;
      this.transformControls.visible = false;
      this.renderer.render(this.scene, this.planningCamera);
      this.xrGroup.visible = previousXRGroupVisible;
      this.transformControls.visible = previousTransformVisible;
    } else {
      if (this.lastRigConfig && this.lastStereoConfig) {
        this.renderFrame(this.lastRigConfig, this.lastStereoConfig, this.lastShowFrustums ?? true, this.lastQualityThreshold);
      }
    }
  }

  // Custom multi-viewport and shader composite passes render logic called by React frame loops
  renderFrame(
    rigConfig: CameraRigConfiguration,
    stereoConfig: StereoConfiguration,
    showFrustums: boolean,
    qualityThreshold = 0.033
  ) {
    this.lastRigConfig = rigConfig;
    this.lastStereoConfig = stereoConfig;
    this.lastShowFrustums = showFrustums;
    this.lastQualityThreshold = qualityThreshold;

    // 1. Sync Rig internal calculations
    this.rig.group.position.set(rigConfig.x, rigConfig.y, rigConfig.z);
    
    this.rig.update(rigConfig, {
      showFrustums,
      showZPPlane: stereoConfig.showZeroParallaxPlane,
      zpOpacity: stereoConfig.zeroParallaxOpacity
    });

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const isPlanningMode = stereoConfig.displayMode === '3d-planning';
    const useAnaglyphBlackWhite = stereoConfig.displayMode === 'stereo-plane' &&
      stereoConfig.fallbackMode === 'anaglyph' &&
      stereoConfig.anaglyphBlackWhite;
    const viewDisparityPx = stereoConfig.disparityPixelOffset ?? 0;
    const leftViewShiftPx = -viewDisparityPx / 2;
    const rightViewShiftPx = viewDisparityPx / 2;
    this.updateTargetMarker(rigConfig);
    this.updateQualityHeatmap(
      rigConfig,
      qualityThreshold,
      stereoConfig.showQualityOverlay && stereoConfig.displayMode !== 'stereo-plane'
    );
    this.applyAnaglyphBlackWhite(useAnaglyphBlackWhite);

    // Direct manipulation handle state
    if (!isPlanningMode || this.renderer.xr.isPresenting) {
      this.transformControls.detach();
      this.transformControls.visible = false;
    } else {
      if (!this.transformControls.dragging) {
        this.transformControls.attach(this.rig.group);
      }
      this.transformControls.visible = true;
    }

    if (this.renderer.xr.isPresenting) {
      // Skip manual desktop viewports if rendering inside VR headset
      return;
    }

    if (isPlanningMode) {
      // Render standard 3D scene from Orbit View planning camera
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.setScissorTest(false);
      this.renderer.render(this.scene, this.planningCamera);
      
    } else if (stereoConfig.displayMode === 'side-by-side') {
      // Hide rig visual helpers inside live camera viewports.
      this.rig.group.visible = false;
      this.transformControls.visible = false;
      // Desktop SBS and immersive VR both render the same shared sbsTexture first.
      this.renderSbsTexture(rigConfig, stereoConfig);
      this.presentSbsTextureToFramebuffer(w, h);
      this.rig.group.visible = true;

    } else if (stereoConfig.displayMode === 'wiggle-3d') {
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.setScissorTest(false);
      this.rig.group.visible = false;
      this.transformControls.visible = false;
      this.renderer.clear(true, true, true);

      const wigglePhase = Math.floor(Date.now() / 90) % 2;
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(0, 0, w, h);
      if (wigglePhase === 0) {
        this.renderCameraInRect(this.rig.leftCamera, [0, 0, w, h], leftViewShiftPx);
      } else {
        this.renderCameraInRect(this.rig.rightCamera, [0, 0, w, h], rightViewShiftPx);
      }
      this.renderer.setScissorTest(false);

      this.rig.group.visible = true;

    } else if (stereoConfig.displayMode === 'left-eye' || stereoConfig.displayMode === 'right-eye') {
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.setScissorTest(false);
      this.rig.group.visible = false;
      this.transformControls.visible = false;
      this.renderer.clear(true, true, true);
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(0, 0, w, h);

      if (stereoConfig.displayMode === 'left-eye') {
        this.renderCameraInRect(this.rig.leftCamera, [0, 0, w, h], leftViewShiftPx);
      } else {
        this.renderCameraInRect(this.rig.rightCamera, [0, 0, w, h], rightViewShiftPx);
      }

      this.renderer.setScissorTest(false);
      this.rig.group.visible = true;
      
    } else if (stereoConfig.displayMode === 'stereo-plane') {
      // Render composite stereoscopic viewports
      if (stereoConfig.fallbackMode === 'anaglyph') {
        this.rig.group.visible = false;
        this.transformControls.visible = false;

        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissorTest(true);
        this.renderer.setScissor(0, 0, w, h);
        this.renderer.setClearColor(this.desktopBackground ?? new THREE.Color(0x0a0a0a), 1);
        this.renderer.clear(true, true, true);

        const gl = this.renderer.getContext();
        const redGain = stereoConfig.anaglyphRedIntensity ?? 0.32;
        const blueGain = stereoConfig.anaglyphBlueIntensity ?? 0.72;
        gl.colorMask(true, false, false, true);
        this.renderer.setViewport(leftViewShiftPx, 0, w, h);
        this.renderWithMaterialColorScale(this.rig.leftCamera, redGain);

        this.renderer.clearDepth();
        gl.colorMask(false, false, true, true);
        this.renderer.setViewport(rightViewShiftPx, 0, w, h);
        this.renderWithMaterialColorScale(this.rig.rightCamera, blueGain);

        gl.colorMask(true, true, true, true);
        this.renderer.setScissorTest(false);
        this.rig.group.visible = true;
      } else {
        // Handle side-by-side or cross-eye fallback similarly by drawing viewports
        this.renderer.setScissorTest(true);
        const halfW = w / 2;
        const leftRect = stereoConfig.fallbackMode === 'side-by-side' ? [0, 0, halfW, h] : [halfW, 0, halfW, h];
        const rightRect = stereoConfig.fallbackMode === 'side-by-side' ? [halfW, 0, halfW, h] : [0, 0, halfW, h];

        this.rig.group.visible = false;
        this.transformControls.visible = false;

        this.renderCameraInRect(this.rig.leftCamera, leftRect, leftViewShiftPx);
        this.renderCameraInRect(this.rig.rightCamera, rightRect, rightViewShiftPx);

        this.renderer.setScissorTest(false);
        this.rig.group.visible = true;
      }
    }
  }

  exportPNG(rigConfig: CameraRigConfiguration, stereoConfig: StereoConfiguration) {
    this.renderFrame(rigConfig, stereoConfig, this.lastShowFrustums ?? true, this.lastQualityThreshold);
    const canvas = this.renderer.domElement;

    if (stereoConfig.displayMode !== 'side-by-side') {
      return canvas.toDataURL('image/png');
    }

    const { leftFrame, rightFrame } = this.getSideBySideFrameRects(
      canvas.width,
      canvas.height,
      rigConfig.aspect || (16 / 9),
      stereoConfig.eyeOrder
    );
    const frameWidth = Math.round(leftFrame[2]);
    const frameHeight = Math.round(leftFrame[3]);
    const output = document.createElement('canvas');
    output.width = frameWidth * 2;
    output.height = frameHeight;
    const ctx = output.getContext('2d');
    if (!ctx) {
      return canvas.toDataURL('image/png');
    }

    const drawFrame = (sourceFrame: number[], destX: number) => {
      const [x, y, width, height] = sourceFrame.map(Math.round);
      ctx.drawImage(
        canvas,
        x,
        canvas.height - y - height,
        width,
        height,
        destX,
        0,
        frameWidth,
        frameHeight
      );
    };

    const displayFrames = [leftFrame, rightFrame].sort((a, b) => a[0] - b[0]);
    drawFrame(displayFrames[0], 0);
    drawFrame(displayFrames[1], frameWidth);
    return output.toDataURL('image/png');
  }

  private getSideBySideFrameRects(width: number, height: number, aspect: number, eyeOrder: StereoConfiguration['eyeOrder']) {
    const halfW = width / 2;
    const leftHalf = eyeOrder === 'left-right'
      ? [0, 0, halfW, height]
      : [halfW, 0, halfW, height];
    const rightHalf = eyeOrder === 'left-right'
      ? [halfW, 0, halfW, height]
      : [0, 0, halfW, height];
    const frameForHalf = (rect: number[]) => {
      const [x, y, rectW, rectH] = rect;
      let frameW = rectW;
      let frameH = frameW / aspect;
      if (frameH > rectH) {
        frameH = rectH;
        frameW = frameH * aspect;
      }

      return [
        x + (rectW - frameW) / 2,
        y + (rectH - frameH) / 2,
        frameW,
        frameH
      ];
    };

    return {
      leftHalf,
      rightHalf,
      leftFrame: frameForHalf(leftHalf),
      rightFrame: frameForHalf(rightHalf),
      combinedFrame: (() => {
        const leftFrame = frameForHalf(leftHalf);
        const rightFrame = frameForHalf(rightHalf);
        const minX = Math.min(leftFrame[0], rightFrame[0]);
        const minY = Math.min(leftFrame[1], rightFrame[1]);
        const maxX = Math.max(leftFrame[0] + leftFrame[2], rightFrame[0] + rightFrame[2]);
        const maxY = Math.max(leftFrame[1] + leftFrame[3], rightFrame[1] + rightFrame[3]);
        return [minX, minY, maxX - minX, maxY - minY];
      })()
    };
  }

  private createSbsRenderTarget() {
    return new THREE.WebGLRenderTarget(2048, 576, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
  }

  private createSbsCopyPass(sbsTexture: THREE.Texture) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.MeshBasicMaterial({
      map: sbsTexture,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    return { scene, camera };
  }

  private assertSbsTextureSize(target: THREE.WebGLRenderTarget, rigConfig: CameraRigConfiguration) {
    const textureImage = target.texture.image as { width?: number; height?: number } | undefined;
    const expectedHalfAspect = rigConfig.aspect || (16 / 9);
    const actualHalfAspect = (target.width / 2) / target.height;
    const aspectError = Math.abs(actualHalfAspect - expectedHalfAspect);
    const imageMatchesTarget = !textureImage ||
      (textureImage.width === target.width && textureImage.height === target.height);

    if (target.width <= 0 || target.height <= 0 || aspectError > 0.001 || !imageMatchesTarget) {
      throw new Error(
        [
          'Invalid sbsTexture size for VR stereo panel.',
          `target=${target.width}x${target.height}`,
          `texture=${textureImage?.width ?? 'unknown'}x${textureImage?.height ?? 'unknown'}`,
          `expected double-wide half aspect=${expectedHalfAspect.toFixed(4)}`,
          `actual half aspect=${actualHalfAspect.toFixed(4)}`,
          `aspect error=${aspectError.toFixed(6)}`
        ].join(' ')
      );
    }
  }

  private createStereoPanel(sbsTexture: THREE.Texture) {
    const aspect = 16 / 9;
    const sbsAspect = 32 / 9;
    const geometry = new THREE.PlaneGeometry(this.xrPanelWidthMeters, this.xrPanelWidthMeters / aspect);
    const leftMaterial = this.createSbsEyeMaterial(sbsTexture, 0, 0.5);
    const rightMaterial = this.createSbsEyeMaterial(sbsTexture, 0.5, 1);
    const sbsPreviewPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(this.xrPanelWidthMeters, this.xrPanelWidthMeters / sbsAspect),
      new THREE.MeshBasicMaterial({
        map: sbsTexture,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    );
    const sbsResolutionCanvas = document.createElement('canvas');
    sbsResolutionCanvas.width = 768;
    sbsResolutionCanvas.height = 96;
    const sbsResolutionCtx = sbsResolutionCanvas.getContext('2d');
    if (!sbsResolutionCtx) {
      throw new Error('Could not create SBS resolution label canvas');
    }
    const sbsResolutionTexture = new THREE.CanvasTexture(sbsResolutionCanvas);
    sbsResolutionTexture.colorSpace = THREE.SRGBColorSpace;
    sbsResolutionTexture.minFilter = THREE.LinearFilter;
    sbsResolutionTexture.magFilter = THREE.LinearFilter;
    const sbsResolutionLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(this.xrPanelWidthMeters, this.xrPanelWidthMeters / 8),
      new THREE.MeshBasicMaterial({
        map: sbsResolutionTexture,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    );

    const group = new THREE.Group();
    group.visible = false;
    const leftPanel = new THREE.Mesh(geometry, leftMaterial);
    const rightPanel = new THREE.Mesh(geometry.clone(), rightMaterial);
    leftPanel.layers.set(1);
    rightPanel.layers.set(2);
    sbsPreviewPanel.layers.set(0);
    sbsResolutionLabel.layers.set(0);
    leftPanel.renderOrder = 20;
    rightPanel.renderOrder = 20;
    sbsPreviewPanel.renderOrder = 20;
    sbsResolutionLabel.renderOrder = 22;
    sbsResolutionLabel.position.set(0, -(this.xrPanelWidthMeters / sbsAspect) / 2 - 0.08, 0.01);
    sbsPreviewPanel.visible = false;
    sbsResolutionLabel.visible = false;
    group.add(leftPanel, rightPanel, sbsPreviewPanel, sbsResolutionLabel);

    return {
      group,
      leftPanel,
      rightPanel,
      sbsPreviewPanel,
      sbsResolutionLabel,
      sbsResolutionTexture,
      sbsResolutionCanvas,
      sbsResolutionCtx
    };
  }

  private updateSbsResolutionLabel() {
    const ctx = this.sbsResolutionCtx;
    const canvas = this.sbsResolutionCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.roundRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 14, 'rgba(0,0,0,0.86)', 'rgba(91,155,213,0.85)');
    ctx.fillStyle = '#8fc5ff';
    ctx.font = '800 30px SF Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`sbsTexture ${this.sbsRenderTarget.width} x ${this.sbsRenderTarget.height}`, canvas.width / 2, 42);
    ctx.fillStyle = '#aaa';
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.fillText('full source texture, not split by eye', canvas.width / 2, 70);
    ctx.textAlign = 'left';
    this.sbsResolutionTexture.needsUpdate = true;
  }

  private updateXrStereoPanelMode() {
    const showSbsPreview = this.hmdRenderMode === 'sbs';
    this.leftEyePanel.visible = !showSbsPreview;
    this.rightEyePanel.visible = !showSbsPreview;
    this.sbsPreviewPanel.visible = showSbsPreview;
    this.sbsResolutionLabel.visible = showSbsPreview;
    if (showSbsPreview) {
      this.updateSbsResolutionLabel();
    }
  }

  private createSbsEyeMaterial(texture: THREE.Texture, minU: number, maxU: number) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        mapTex: { value: texture },
        uvRange: { value: new THREE.Vector2(minU, maxU) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D mapTex;
        uniform vec2 uvRange;
        varying vec2 vUv;
        void main() {
          vec2 sbsUv = vec2(mix(uvRange.x, uvRange.y, vUv.x), vUv.y);
          gl_FragColor = texture2D(mapTex, sbsUv);
        }
      `,
      side: THREE.DoubleSide
    });
    material.toneMapped = false;
    return material;
  }

  private configureXREyeLayers() {
    const xrCamera = this.renderer.xr.getCamera() as THREE.ArrayCamera & { cameras?: THREE.Camera[] };
    const cameras = xrCamera.cameras || [];
    if (cameras.length < 2) return;

    cameras[0].layers.enable(0);
    cameras[0].layers.enable(1);
    cameras[0].layers.disable(2);
    cameras[1].layers.enable(0);
    cameras[1].layers.disable(1);
    cameras[1].layers.enable(2);
  }

  private updateXRStereoPanel(frame?: XRFrame) {
    if (!this.xrPanelPlaced) {
      const headPosition = new THREE.Vector3();
      const headQuaternion = new THREE.Quaternion();
      const referenceSpace = this.renderer.xr.getReferenceSpace();
      const viewerPose = frame && referenceSpace ? frame.getViewerPose(referenceSpace) : undefined;

      if (viewerPose) {
        this.xrPanelPlacementFrames += 1;
        if (this.xrPanelPlacementFrames < 3) return;

        const viewerMatrix = new THREE.Matrix4().fromArray(viewerPose.transform.matrix);
        viewerMatrix.decompose(headPosition, headQuaternion, new THREE.Vector3());
      } else {
        const xrCamera = this.renderer.xr.getCamera();
        xrCamera.updateMatrixWorld(true);
        xrCamera.matrixWorld.decompose(headPosition, headQuaternion, new THREE.Vector3());
      }

      const leveledHeadQuaternion = this.getLeveledHeadQuaternion(headQuaternion);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(leveledHeadQuaternion);
      this.stereoPanelGroup.position.copy(headPosition).addScaledVector(forward, this.xrPanelDistanceMeters);
      this.xrPanelBaseQuaternion.copy(leveledHeadQuaternion);
      this.xrPanelPlaced = true;
      this.stereoPanelGroup.visible = true;
    }

    this.stereoPanelGroup.quaternion.copy(this.xrPanelBaseQuaternion);

    const rigPitch = this.lastRigConfig?.pitch ?? 0;
    this.stereoPanelGroup.rotateX(THREE.MathUtils.degToRad(rigPitch));
    this.xrUiGroup.position.copy(this.stereoPanelGroup.position);
    this.xrUiGroup.quaternion.copy(this.xrPanelBaseQuaternion);
    this.xrUiGroup.visible = true;

    const aspect = this.lastRigConfig?.aspect || (16 / 9);
    const panelHeight = this.xrPanelWidthMeters / aspect;
    this.leftEyePanel.scale.set(1, panelHeight / (this.xrPanelWidthMeters / (16 / 9)), 1);
    this.rightEyePanel.scale.copy(this.leftEyePanel.scale);
    this.leftEyePanel.position.x = 0;
    this.rightEyePanel.position.x = 0;
  }

  private renderXRStereoPanelTextures() {
    if (!this.lastRigConfig || !this.lastStereoConfig) return;

    const previousTarget = this.renderer.getRenderTarget();
    const previousPanelVisible = this.stereoPanelGroup.visible;
    const previousUiVisible = this.xrUiGroup.visible;
    const previousRigVisible = this.rig.group.visible;
    const previousTransformVisible = this.transformControls.visible;
    const previousClearColor = new THREE.Color();
    this.renderer.getClearColor(previousClearColor);
    const previousClearAlpha = this.renderer.getClearAlpha();
    const previousScissorTest = this.renderer.getScissorTest();

    this.stereoPanelGroup.visible = false;
    this.xrUiGroup.visible = false;
    this.rig.group.visible = false;
    this.transformControls.visible = false;
    this.renderer.setScissorTest(false);
    this.renderer.setClearColor(this.desktopBackground ?? new THREE.Color(0x0a0a0a), 1);

    // Fill the live sbsTexture used by the VR eye panels: left camera in U 0..0.5, right in U 0.5..1.
    this.renderSbsTexture(this.lastRigConfig, {
      ...this.lastStereoConfig,
      eyeOrder: 'left-right'
    });

    this.renderer.setRenderTarget(previousTarget);
    this.renderer.setScissorTest(previousScissorTest);
    this.renderer.setClearColor(previousClearColor, previousClearAlpha);
    this.stereoPanelGroup.visible = previousPanelVisible;
    this.xrUiGroup.visible = previousUiVisible;
    this.rig.group.visible = previousRigVisible;
    this.transformControls.visible = previousTransformVisible;
  }

  private renderSbsTexture(rigConfig: CameraRigConfiguration, stereoConfig: StereoConfiguration) {
    const target = this.sbsRenderTarget;
    this.assertSbsTextureSize(target, rigConfig);

    const previousTarget = this.renderer.getRenderTarget();
    const previousViewport = new THREE.Vector4();
    const previousScissor = new THREE.Vector4();
    this.renderer.getViewport(previousViewport);
    this.renderer.getScissor(previousScissor);
    const previousScissorTest = this.renderer.getScissorTest();
    const previousClearColor = new THREE.Color();
    this.renderer.getClearColor(previousClearColor);
    const previousClearAlpha = this.renderer.getClearAlpha();
    const previousXR = this.renderer.xr.enabled;

    this.renderer.xr.enabled = false;
    this.renderSideBySideRenderTarget(target, rigConfig, stereoConfig);

    this.renderer.xr.enabled = previousXR;
    this.renderer.setRenderTarget(previousTarget);
    this.renderer.setViewport(previousViewport);
    this.renderer.setScissor(previousScissor);
    this.renderer.setScissorTest(previousScissorTest);
    this.renderer.setClearColor(previousClearColor, previousClearAlpha);
  }

  private setSbsRenderTargetRect(target: THREE.WebGLRenderTarget, rect: number[]) {
    const [x, y, width, height] = rect;
    target.viewport.set(x, y, width, height);
    target.scissor.set(x, y, width, height);
    target.scissorTest = true;
    this.renderer.setRenderTarget(target);
  }

  private renderSideBySideRenderTarget(
    target: THREE.WebGLRenderTarget,
    rigConfig: CameraRigConfiguration,
    stereoConfig: StereoConfiguration
  ) {
    const viewDisparityPx = stereoConfig.disparityPixelOffset ?? 0;
    const leftViewShiftPx = -viewDisparityPx / 2;
    const rightViewShiftPx = viewDisparityPx / 2;
    const frameGrey = new THREE.Color(0x666666);
    const sceneBg = this.scene.background instanceof THREE.Color
      ? this.scene.background
      : (this.desktopBackground ?? new THREE.Color(0x0a0a0a));
    const { leftFrame, rightFrame, leftHalf, rightHalf } = this.getSideBySideFrameRects(
      target.width,
      target.height,
      rigConfig.aspect || (16 / 9),
      stereoConfig.eyeOrder
    );
    const previousAutoClear = this.renderer.autoClear;

    this.renderer.autoClear = false;

    [leftHalf, rightHalf].forEach((rect) => {
      this.setSbsRenderTargetRect(target, rect);
      this.renderer.setClearColor(frameGrey, 1);
      this.renderer.clear(true, true, true);
    });

    [leftFrame, rightFrame].forEach((rect) => {
      this.setSbsRenderTargetRect(target, rect);
      this.renderer.setClearColor(sceneBg, 1);
      this.renderer.clear(true, true, true);
    });

    this.setSbsRenderTargetRect(target, [leftFrame[0] + leftViewShiftPx, leftFrame[1], leftFrame[2], leftFrame[3]]);
    this.renderer.render(this.scene, this.rig.leftCamera);

    this.setSbsRenderTargetRect(target, [rightFrame[0] + rightViewShiftPx, rightFrame[1], rightFrame[2], rightFrame[3]]);
    this.renderer.render(this.scene, this.rig.rightCamera);

    target.viewport.set(0, 0, target.width, target.height);
    target.scissor.set(0, 0, target.width, target.height);
    target.scissorTest = false;
    this.renderer.autoClear = previousAutoClear;
    this.renderer.setClearColor(sceneBg, 1);
  }

  private presentSbsTextureToFramebuffer(width: number, height: number) {
    const textureAspect = this.sbsRenderTarget.width / this.sbsRenderTarget.height;
    let frameWidth = width;
    let frameHeight = frameWidth / textureAspect;
    if (frameHeight > height) {
      frameHeight = height;
      frameWidth = frameHeight * textureAspect;
    }
    const frameX = (width - frameWidth) / 2;
    const frameY = (height - frameHeight) / 2;

    this.renderer.setRenderTarget(null);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setScissor(0, 0, width, height);
    this.renderer.setScissorTest(true);
    this.renderer.setClearColor(0x666666, 1);
    this.renderer.clear(true, true, true);

    this.renderer.setViewport(frameX, frameY, frameWidth, frameHeight);
    this.renderer.setScissor(frameX, frameY, frameWidth, frameHeight);
    this.renderer.render(this.sbsCopyScene, this.sbsCopyCamera);
    this.renderer.setScissorTest(false);
  }

  private renderSideBySideFrame(
    width: number,
    height: number,
    rigConfig: CameraRigConfiguration,
    stereoConfig: StereoConfiguration
  ) {
    const viewDisparityPx = stereoConfig.disparityPixelOffset ?? 0;
    const leftViewShiftPx = -viewDisparityPx / 2;
    const rightViewShiftPx = viewDisparityPx / 2;
    const frameGrey = new THREE.Color(0x666666);
    const sceneBg = this.scene.background instanceof THREE.Color
      ? this.scene.background
      : (this.desktopBackground ?? new THREE.Color(0x0a0a0a));
    const { leftFrame, rightFrame, leftHalf, rightHalf } = this.getSideBySideFrameRects(
      width,
      height,
      rigConfig.aspect || (16 / 9),
      stereoConfig.eyeOrder
    );
    const previousAutoClear = this.renderer.autoClear;

    this.renderer.autoClear = false;
    this.renderer.setScissorTest(true);

    [leftHalf, rightHalf].forEach(([x, y, rectWidth, rectHeight]) => {
      this.renderer.setViewport(x, y, rectWidth, rectHeight);
      this.renderer.setScissor(x, y, rectWidth, rectHeight);
      this.renderer.setClearColor(frameGrey, 1);
      this.renderer.clear(true, true, true);
    });

    [leftFrame, rightFrame].forEach(([x, y, rectWidth, rectHeight]) => {
      this.renderer.setViewport(x, y, rectWidth, rectHeight);
      this.renderer.setScissor(x, y, rectWidth, rectHeight);
      this.renderer.setClearColor(sceneBg, 1);
      this.renderer.clear(true, true, true);
    });

    this.renderCameraInRect(this.rig.leftCamera, leftFrame, leftViewShiftPx);
    this.renderCameraInRect(this.rig.rightCamera, rightFrame, rightViewShiftPx);

    this.renderer.setScissorTest(false);
    this.renderer.setClearColor(sceneBg, 1);
    this.renderer.autoClear = previousAutoClear;
  }

  private createXrUiPanels() {
    const makePanel = (side: 'left' | 'right') => {
      const canvas = document.createElement('canvas');
      canvas.width = side === 'left' ? 768 : 640;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not create XR UI canvas context');
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const widthMeters = side === 'left' ? 0.58 : 0.46;
      const heightMeters = 0.78;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthMeters, heightMeters), material);
      mesh.position.x = side === 'left' ? -widthMeters / 2 : widthMeters / 2;
      mesh.renderOrder = 30;
      mesh.userData.xrUiSide = side;

      const group = new THREE.Group();
      const screenHalfWidth = this.xrPanelWidthMeters / 2;
      const hingeGap = 0.08;
      const toeInAngle = THREE.MathUtils.degToRad(24);
      group.position.set(side === 'left' ? -(screenHalfWidth + hingeGap) : screenHalfWidth + hingeGap, 0, 0.02);
      group.rotation.y = side === 'left' ? toeInAngle : -toeInAngle;
      group.add(mesh);
      this.xrUiGroup.add(group);

      const panel: XrUiPanel = {
        side,
        group,
        mesh,
        texture,
        canvas,
        ctx,
        regions: []
      };
      this.xrUiPanels.push(panel);
    };

    makePanel('left');
    makePanel('right');
    this.drawXrUiPanels();
  }

  private setupXrControllers() {
    [0, 1].forEach((index) => {
      const controller = this.renderer.xr.getController(index);
      this.xrControllers.push(controller);
      controller.addEventListener('selectstart', () => this.handleXrSelectStart(controller));
      controller.addEventListener('selectend', () => this.handleXrSelectEnd());

      const pointerGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1.2)
      ]);
      const pointer = new THREE.Line(
        pointerGeometry,
        new THREE.LineBasicMaterial({ color: 0x8fc5ff, transparent: true, opacity: 0.65 })
      );
      pointer.name = 'XR UI Pointer';
      controller.add(pointer);
      this.scene.add(controller);
    });
  }

  private drawXrUiPanels() {
    this.xrUiPanels.forEach(panel => this.drawXrUiPanel(panel));
  }

  private drawXrUiPanel(panel: XrUiPanel) {
    const { ctx, canvas } = panel;
    const controls = this.hmdControls.filter(control => control.panel === panel.side);
    panel.regions = [];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, 24, 'rgba(18,18,18,0.92)', 'rgba(91,155,213,0.45)');
    ctx.fillStyle = '#f4f4f4';
    ctx.font = '700 30px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.fillText(panel.side === 'left' ? 'Rig Controls' : 'Inspection', 34, 54);

    let y = 94;
    const sections = Array.from(new Set(controls.map(control => control.section)));
    sections.forEach((section, sectionIndex) => {
      if (sectionIndex > 0) {
        ctx.strokeStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(30, y - 14);
        ctx.lineTo(canvas.width - 30, y - 14);
        ctx.stroke();
      }

      ctx.fillStyle = '#888';
      ctx.font = '800 22px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
      ctx.fillText(section.toUpperCase(), 34, y);
      y += 34;

      controls.filter(control => control.section === section).forEach((control) => {
        if (control.kind === 'number') {
          y = this.drawXrSlider(panel, control, y);
        } else if (control.kind === 'toggle') {
          y = this.drawXrButton(panel, control.id, control, 0, control.active ? control.activeLabel : control.inactiveLabel, control.active, y);
        } else if (control.kind === 'button-row') {
          y = this.drawXrButtonRow(panel, control, y);
        } else {
          y = this.drawXrPresetList(panel, control, y);
        }
      });

      y += 14;
    });

    if (panel.side === 'right') {
      ctx.fillStyle = '#777';
      ctx.font = '18px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
      this.wrapXrText(ctx, 'Preset buttons load values only; current VR view stays active.', 34, canvas.height - 64, canvas.width - 68, 24);
    }

    panel.texture.needsUpdate = true;
  }

  private drawXrSlider(panel: XrUiPanel, control: HmdControlDefinition & { kind: 'number' }, y: number) {
    const { ctx, canvas } = panel;
    const x = 34;
    const width = canvas.width - 68;
    const hovered = this.xrHoveredRegionId === control.id;
    ctx.fillStyle = '#ddd';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.fillText(control.label, x, y);
    ctx.fillStyle = '#5b9bd5';
    ctx.font = '700 24px SF Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(control.formattedValue, x + width, y);
    ctx.textAlign = 'left';

    const trackY = y + 34;
    ctx.strokeStyle = hovered ? '#6a5a28' : '#3a3a3a';
    ctx.lineWidth = hovered ? 14 : 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, trackY);
    ctx.lineTo(x + width, trackY);
    ctx.stroke();

    const ratio = THREE.MathUtils.clamp((control.value - control.min) / Math.max(0.000001, control.max - control.min), 0, 1);
    ctx.strokeStyle = '#5b9bd5';
    ctx.beginPath();
    ctx.moveTo(x, trackY);
    ctx.lineTo(x + width * ratio, trackY);
    ctx.stroke();
    ctx.fillStyle = hovered ? '#ffd166' : '#8fc5ff';
    ctx.beginPath();
    ctx.arc(x + width * ratio, trackY, hovered ? 22 : 18, 0, Math.PI * 2);
    ctx.fill();
    if (hovered) {
      ctx.strokeStyle = '#fff2a8';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    panel.regions.push({
      id: control.id,
      kind: 'slider',
      x,
      y: trackY - 34,
      width,
      height: 74,
      control
    });

    return y + 74;
  }

  private drawXrButton(
    panel: XrUiPanel,
    id: string,
    control: HmdControlDefinition,
    buttonIndex: number,
    label: string,
    active: boolean,
    y: number,
    x = 34,
    width = panel.canvas.width - 68
  ) {
    const { ctx } = panel;
    const hovered = this.xrHoveredRegionId === id;
    this.roundRect(
      ctx,
      x,
      y,
      width,
      54,
      10,
      active ? '#2e4057' : hovered ? '#333023' : '#222',
      hovered ? '#ffd166' : active ? '#5b9bd5' : '#3a3a3a'
    );
    ctx.fillStyle = hovered ? '#ffd166' : active ? '#8fc5ff' : '#f0f0f0';
    ctx.font = '800 22px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, y + 35);
    ctx.textAlign = 'left';
    panel.regions.push({
      id,
      kind: 'button',
      x,
      y,
      width,
      height: 54,
      control,
      buttonIndex
    });
    return y + 66;
  }

  private drawXrButtonRow(panel: XrUiPanel, control: HmdControlDefinition & { kind: 'button-row' }, y: number) {
    const { ctx, canvas } = panel;
    ctx.fillStyle = '#ddd';
    ctx.font = '22px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.fillText(control.label, 34, y);
    y += 18;

    const gap = 10;
    const cols = panel.side === 'left' ? 4 : 2;
    const buttonWidth = (canvas.width - 68 - gap * (cols - 1)) / cols;
    control.buttons.forEach((button, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      this.drawXrButton(
        panel,
        `${control.id}.${button.id}`,
        control,
        index,
        button.label,
        Boolean(button.active),
        y + row * 64,
        34 + col * (buttonWidth + gap),
        buttonWidth
      );
    });

    return y + Math.ceil(control.buttons.length / cols) * 64 + 8;
  }

  private drawXrPresetList(panel: XrUiPanel, control: HmdControlDefinition & { kind: 'preset-list' }, y: number) {
    const maxPresets = Math.min(control.presets.length, 8);
    for (let index = 0; index < maxPresets; index++) {
      const preset = control.presets[index];
      y = this.drawXrButton(panel, `${control.id}.${preset.name}`, control, index, preset.name, false, y);
    }
    return y;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
    stroke?: string
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private wrapXrText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    });
    if (line) ctx.fillText(line, x, y);
  }

  private handleXrSelectStart(controller: THREE.Group) {
    const hit = this.getXrUiHit(controller);
    if (!hit) return;
    this.activateXrUiRegion(hit.panel, hit.region, hit.uv.x);
    if (hit.region.kind === 'slider') {
      this.xrControllerDrag = { controller, panelSide: hit.panel.side, regionId: hit.region.id };
    }
  }

  private handleXrSelectEnd() {
    const drag = this.xrControllerDrag;
    this.xrControllerDrag = null;
    const panel = drag ? this.xrUiPanels.find(candidate => candidate.side === drag.panelSide) : null;
    const control = panel?.regions.find(region => region.id === drag?.regionId)?.control;
    if (control?.kind === 'number') {
      control.onCommit?.();
    }
  }

  private updateXrHoverState() {
    if (this.xrControllerDrag) return;
    const hit = this.xrControllers
      .map(controller => this.getXrUiHit(controller))
      .find(Boolean);
    const nextHoverId = hit?.region.id ?? null;
    if (nextHoverId === this.xrHoveredRegionId) return;
    this.xrHoveredRegionId = nextHoverId;
    this.drawXrUiPanels();
  }

  private updateXrControllerDrag() {
    const drag = this.xrControllerDrag;
    if (!drag) return;
    const hit = this.getXrUiHit(drag.controller);
    if (!hit || hit.panel.side !== drag.panelSide || hit.region.id !== drag.regionId) return;
    this.activateXrUiRegion(hit.panel, hit.region, hit.uv.x);
  }

  private getXrUiHit(controller: THREE.Group) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.xrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.xrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersections = this.xrRaycaster.intersectObjects(this.xrUiPanels.map(panel => panel.mesh), false);
    const intersection = intersections[0];
    if (!intersection || !intersection.uv) return null;

    const panel = this.xrUiPanels.find(candidate => candidate.mesh === intersection.object);
    if (!panel) return null;
    const x = intersection.uv.x * panel.canvas.width;
    const y = (1 - intersection.uv.y) * panel.canvas.height;
    const region = panel.regions.find(candidate =>
      x >= candidate.x &&
      x <= candidate.x + candidate.width &&
      y >= candidate.y &&
      y <= candidate.y + candidate.height
    );
    if (!region) return null;
    return { panel, region, uv: { x, y } };
  }

  private activateXrUiRegion(panel: XrUiPanel, region: XrUiHitRegion, hitX: number) {
    const control = region.control;
    if (region.kind === 'slider' && control.kind === 'number') {
      const ratio = THREE.MathUtils.clamp((hitX - region.x) / Math.max(1, region.width), 0, 1);
      const rawValue = control.min + ratio * (control.max - control.min);
      const stepped = Math.round(rawValue / control.step) * control.step;
      control.onChange(Number(stepped.toFixed(4)));
      return;
    }

    if (region.kind !== 'button') return;
    if (control.kind === 'toggle') {
      control.onToggle();
    } else if (control.kind === 'button-row' && region.buttonIndex !== undefined) {
      control.buttons[region.buttonIndex]?.onClick();
    } else if (control.kind === 'preset-list' && region.buttonIndex !== undefined) {
      const preset = control.presets[region.buttonIndex];
      if (preset) control.onLoad(preset);
    }
    this.drawXrUiPanels();
    panel.texture.needsUpdate = true;
  }

  private getLeveledHeadQuaternion(headQuaternion: THREE.Quaternion) {
    const euler = new THREE.Euler().setFromQuaternion(headQuaternion, 'YXZ');
    euler.z = 0;
    return new THREE.Quaternion().setFromEuler(euler);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.transformControls.dispose();
    this.controls.dispose();
    this.sbsRenderTarget.dispose();
    if (this.qualityHeatmap) {
      this.disposeObject(this.qualityHeatmap);
      this.qualityHeatmap = null;
    }
    if (this.targetMarker) {
      this.disposeObject(this.targetMarker);
      this.targetMarker = null;
    }
    this.disposeObject(this.stereoPanelGroup);
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private createTargetMarker() {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf0a040,
        transparent: true,
        opacity: 0.96,
        depthTest: true
      })
    );
    marker.renderOrder = 5;
    return marker;
  }

  private updateTargetMarker(rigConfig: CameraRigConfiguration) {
    if (!this.targetMarker) return;

    const target = rigConfig.lookAtTargetEnabled
      ? rigConfig.lookAtTarget
      : rigConfig.convergenceTarget;

    this.targetMarker.visible = true;
    this.targetMarker.position.set(target.x, target.y, target.z);
  }

  private ensureQualityHeatmap() {
    if (!this.activeVenue) return null;
    if (this.qualityHeatmap) return this.qualityHeatmap;

    const width = this.activeVenue.dimensions.width;
    const length = this.activeVenue.dimensions.length;
    const geometry = new THREE.PlaneGeometry(length, width, 48, 24);
    const colorCount = geometry.getAttribute('position').count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colorCount * 3), 3));

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.qualityHeatmap = new THREE.Mesh(geometry, material);
    this.qualityHeatmap.position.z = 0.018;
    this.qualityHeatmap.renderOrder = 3;
    this.xrGroup.add(this.qualityHeatmap);
    return this.qualityHeatmap;
  }

  private updateQualityHeatmap(rigConfig: CameraRigConfiguration, qualityThreshold: number, visible: boolean) {
    if (!visible) {
      if (this.qualityHeatmap) {
        this.qualityHeatmap.visible = false;
      }
      return;
    }

    const heatmap = this.ensureQualityHeatmap();
    if (!heatmap) return;
    heatmap.visible = true;

    const position = heatmap.geometry.getAttribute('position');
    const colors = heatmap.geometry.getAttribute('color') as THREE.BufferAttribute;
    const rigPosition = new THREE.Vector3(rigConfig.x, rigConfig.y, rigConfig.z);
    const green = new THREE.Color(0x4caf50);
    const orange = new THREE.Color(0xf0a040);
    const red = new THREE.Color(0xe74c3c);
    const sample = new THREE.Vector3();
    const color = new THREE.Color();

    for (let i = 0; i < position.count; i++) {
      sample.fromBufferAttribute(position, i);
      sample.z = 0;
      const distance = Math.max(0.1, rigPosition.distanceTo(sample));
      const severity = rigConfig.baselineMeters / (distance * qualityThreshold);

      if (severity <= 0.75) {
        color.copy(green);
      } else if (severity <= 1) {
        color.copy(green).lerp(orange, (severity - 0.75) / 0.25);
      } else {
        color.copy(orange).lerp(red, Math.min(1, (severity - 1) / 1.5));
      }

      colors.setXYZ(i, color.r, color.g, color.b);
    }

    colors.needsUpdate = true;
  }

  private applyAnaglyphBlackWhite(enabled: boolean) {
    if (!this.venueGeometry) return;

    this.venueGeometry.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material) => {
        const colorMaterial = material as THREE.Material & { color?: THREE.Color };
        if (!colorMaterial.color) return;

        if (enabled) {
          if (!this.originalVenueMaterialColors.has(material)) {
            this.originalVenueMaterialColors.set(material, colorMaterial.color.clone());
          }
          const original = this.originalVenueMaterialColors.get(material);
          if (!original) return;
          if (child.userData.anaglyphBwRole === 'player-stroke') {
            colorMaterial.color.setRGB(1, 1, 1);
            return;
          }
          const luminance = original.r * 0.2126 + original.g * 0.7152 + original.b * 0.0722;
          colorMaterial.color.setRGB(luminance, luminance, luminance);
        } else {
          const original = this.originalVenueMaterialColors.get(material);
          if (original) {
            colorMaterial.color.copy(original);
          }
        }
      });
    });
  }

  private renderCameraInRect(camera: THREE.Camera, rect: number[], viewShiftPx = 0) {
    const [x, y, width, height] = rect;
    this.renderer.setViewport(x + viewShiftPx, y, width, height);
    this.renderer.setScissor(x, y, width, height);
    this.renderer.render(this.scene, camera);
  }

  private renderWithMaterialColorScale(camera: THREE.Camera, colorScale: number) {
    const touched: Array<{ material: THREE.Material & { color: THREE.Color }; color: THREE.Color }> = [];
    const seen = new Set<THREE.Material>();

    this.scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material) => {
        if (seen.has(material)) return;
        const colorMaterial = material as THREE.Material & { color?: THREE.Color };
        if (!colorMaterial.color) return;
        seen.add(material);
        touched.push({ material: colorMaterial as THREE.Material & { color: THREE.Color }, color: colorMaterial.color.clone() });
        colorMaterial.color.multiplyScalar(colorScale);
      });
    });

    this.renderer.render(this.scene, camera);

    touched.forEach(({ material, color }) => {
      material.color.copy(color);
    });
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else if (material) {
        material.dispose();
      }
    });
  }
}

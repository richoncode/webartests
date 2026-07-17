import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { CameraRigConfiguration, StereoConfiguration } from '../types';
import { StereoRig } from '../rig/StereoRig';
import { BaseVenue } from '../venue/Venue';

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

  // React callbacks for direct manipulation sync
  onRigMoveCallback?: (x: number, y: number, z: number) => void;
  onViewerMoveCallback?: () => void;

  private lastRigConfig?: CameraRigConfiguration;
  private lastStereoConfig?: StereoConfiguration;
  private lastShowFrustums?: boolean;
  private lastQualityThreshold = 0.033;
  private vrScaleMode: 'tabletop' | 'full-scale' = 'tabletop';
  private xrScaleApplied = false;
  private originalVenueMaterialColors = new WeakMap<THREE.Material, THREE.Color>();

  constructor(container: HTMLDivElement) {
    this.container = container;

    // 1. Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.xr.enabled = true; // WebXR support enabled
    container.appendChild(this.renderer.domElement);

    // 2. Initialize Scene & Lighting
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

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
    this.planningCamera.position.set(-20, -25, 15);
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
    this.renderer.setAnimationLoop(() => this.animate());
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

  // Attach WebXR session button to container
  getXRButtonElement(): HTMLElement {
    return VRButton.createButton(this.renderer);
  }

  private animate() {
    this.controls.update();

    const isPresenting = this.renderer.xr.isPresenting;
    this.applyXRScale(isPresenting);
    this.onViewerMoveCallback?.();
    if (isPresenting) {
      // Under WebXR mode, the device handles eye projection and updates viewports automatically
      this.renderer.render(this.scene, this.planningCamera);
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
      // Render split-screen left / right viewports
      this.renderer.setScissorTest(true);
      
      const halfW = w / 2;
      const leftRect = stereoConfig.eyeOrder === 'left-right' ? [0, 0, halfW, h] : [halfW, 0, halfW, h];
      const rightRect = stereoConfig.eyeOrder === 'left-right' ? [halfW, 0, halfW, h] : [0, 0, halfW, h];

      // Hide rig visual helpers inside live camera viewports
      this.rig.group.visible = false;
      this.transformControls.visible = false;

      // Left eye pass
      this.renderer.setViewport(leftRect[0], leftRect[1], leftRect[2], leftRect[3]);
      this.renderer.setScissor(leftRect[0], leftRect[1], leftRect[2], leftRect[3]);
      this.renderer.render(this.scene, this.rig.leftCamera);

      // Right eye pass
      this.renderer.setViewport(rightRect[0], rightRect[1], rightRect[2], rightRect[3]);
      this.renderer.setScissor(rightRect[0], rightRect[1], rightRect[2], rightRect[3]);
      this.renderer.render(this.scene, this.rig.rightCamera);

      this.renderer.setScissorTest(false);
      this.rig.group.visible = true; // Restore planning visual helpers
      
    } else if (stereoConfig.displayMode === 'stereo-plane') {
      // Render composite stereoscopic viewports
      if (stereoConfig.fallbackMode === 'anaglyph') {
        this.rig.group.visible = false;
        this.transformControls.visible = false;

        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissorTest(false);
        this.renderer.setClearColor(this.scene.background as THREE.Color, 1);
        this.renderer.clear(true, true, true);

        const gl = this.renderer.getContext();
        gl.colorMask(true, false, false, true);
        this.renderer.render(this.scene, this.rig.leftCamera);

        this.renderer.clearDepth();
        gl.colorMask(false, false, true, true);
        this.renderer.render(this.scene, this.rig.rightCamera);

        gl.colorMask(true, true, true, true);
        this.rig.group.visible = true;
      } else {
        // Handle side-by-side or cross-eye fallback similarly by drawing viewports
        this.renderer.setScissorTest(true);
        const halfW = w / 2;
        const leftRect = stereoConfig.fallbackMode === 'side-by-side' ? [0, 0, halfW, h] : [halfW, 0, halfW, h];
        const rightRect = stereoConfig.fallbackMode === 'side-by-side' ? [halfW, 0, halfW, h] : [0, 0, halfW, h];

        this.rig.group.visible = false;
        this.transformControls.visible = false;

        this.renderer.setViewport(leftRect[0], leftRect[1], leftRect[2], leftRect[3]);
        this.renderer.setScissor(leftRect[0], leftRect[1], leftRect[2], leftRect[3]);
        this.renderer.render(this.scene, this.rig.leftCamera);

        this.renderer.setViewport(rightRect[0], rightRect[1], rightRect[2], rightRect[3]);
        this.renderer.setScissor(rightRect[0], rightRect[1], rightRect[2], rightRect[3]);
        this.renderer.render(this.scene, this.rig.rightCamera);

        this.renderer.setScissorTest(false);
        this.rig.group.visible = true;
      }
    }
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.transformControls.dispose();
    this.controls.dispose();
    if (this.qualityHeatmap) {
      this.disposeObject(this.qualityHeatmap);
      this.qualityHeatmap = null;
    }
    if (this.targetMarker) {
      this.disposeObject(this.targetMarker);
      this.targetMarker = null;
    }
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

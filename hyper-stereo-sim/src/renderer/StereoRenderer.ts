import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { AnaglyphEffect } from 'three/examples/jsm/effects/AnaglyphEffect.js';
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
  anaglyphEffect: AnaglyphEffect;
  
  rig: StereoRig;
  activeVenue: BaseVenue | null = null;
  venueGeometry: THREE.Object3D | null = null;

  // React callbacks for direct manipulation sync
  onRigMoveCallback?: (x: number, y: number, z: number) => void;

  private lastRigConfig?: CameraRigConfiguration;
  private lastStereoConfig?: StereoConfiguration;
  private lastShowFrustums?: boolean;

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

    // 5. Initialize Camera Rig Model
    this.rig = new StereoRig();
    this.xrGroup.add(this.rig.group);

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

    // 7. Initialize Anaglyph effect wrapper
    this.anaglyphEffect = new AnaglyphEffect(this.renderer);
    this.anaglyphEffect.setSize(container.clientWidth, container.clientHeight);

    // Start rendering frame loop
    this.renderer.setAnimationLoop(() => this.animate());
  }

  setVenue(venue: BaseVenue) {
    if (this.venueGeometry) {
      this.xrGroup.remove(this.venueGeometry);
    }
    this.activeVenue = venue;
    this.venueGeometry = venue.createGeometry();
    this.xrGroup.add(this.venueGeometry);

    // Reposition Orbit target to the default venue center
    const origin = venue.getDefaultOrigin();
    this.controls.target.copy(origin);
  }

  resize(width: number, height: number) {
    this.planningCamera.aspect = width / height;
    this.planningCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.anaglyphEffect.setSize(width, height);
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
    if (mode === 'tabletop') {
      // Shrink venue model to 1:25 scale and lift onto table (0.8m above base)
      this.xrGroup.scale.set(0.04, 0.04, 0.04);
      this.xrGroup.position.set(0, 1.2, 0.8); // X, Y (forward), Z (up) in XR reference space
    } else {
      // 1:1 scale at floor height
      this.xrGroup.scale.set(1, 1, 1);
      this.xrGroup.position.set(0, 0, 0);
    }
  }

  // Attach WebXR session button to container
  getXRButtonElement(): HTMLElement {
    return VRButton.createButton(this.renderer);
  }

  private animate() {
    this.controls.update();

    const isPresenting = this.renderer.xr.isPresenting;
    if (isPresenting) {
      // Under WebXR mode, the device handles eye projection and updates viewports automatically
      this.renderer.render(this.scene, this.planningCamera);
    } else {
      if (this.lastRigConfig && this.lastStereoConfig) {
        this.renderFrame(this.lastRigConfig, this.lastStereoConfig, this.lastShowFrustums ?? true);
      }
    }
  }

  // Custom multi-viewport and shader composite passes render logic called by React frame loops
  renderFrame(
    rigConfig: CameraRigConfiguration,
    stereoConfig: StereoConfiguration,
    showFrustums: boolean
  ) {
    this.lastRigConfig = rigConfig;
    this.lastStereoConfig = stereoConfig;
    this.lastShowFrustums = showFrustums;

    // 1. Sync Rig internal calculations
    this.rig.group.position.set(rigConfig.x, rigConfig.y, rigConfig.z);
    
    this.rig.update(rigConfig, {
      showFrustums,
      showZPPlane: stereoConfig.showZeroParallaxPlane,
      zpOpacity: stereoConfig.zeroParallaxOpacity
    });

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    // Direct manipulation handle state
    if (stereoConfig.displayMode !== '3d-planning' || this.renderer.xr.isPresenting) {
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

    if (stereoConfig.displayMode === '3d-planning') {
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
        
        // Render Red/Cyan 3D pass
        this.anaglyphEffect.render(this.scene, this.rig.leftCamera); // Anaglyph effect internally handles camera offset vergence separation
        
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
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

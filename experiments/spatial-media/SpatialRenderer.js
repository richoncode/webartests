import * as THREE from 'three';
import { PhotoCard } from './PhotoCard.js?v=2';
import { HandTrackingManager } from './HandTrackingManager.js?v=2';
import { XRHandModelFactory } from 'https://unpkg.com/three@0.168.0/examples/jsm/webxr/XRHandModelFactory.js';

export class SpatialRenderer {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
        this.camera.position.set(0, 0, 5); 
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.localClippingEnabled = true; 
        
        this.container.appendChild(this.renderer.domElement);
        
        this.activePhotoCard = null;
        this.panTime = 0;
        this.sky = null;
        this.reticle = null;

        this.initLights();
        this.initSky();
        this.initReticle();
        this.setupObservers();
        
        this.handTracking = new HandTrackingManager(this.renderer, this.scene);
        this.setupHandMesh();
    }

    setupObservers() {
        // React to State Changes
        this.state.on('currentImage', (filename) => this.loadGalleryItem(filename));
        this.state.on('depthStrategy', () => this.loadGalleryItem(this.state.get('currentImage')));
        this.state.on('immersionActive', (active) => {
            if (this.sky) { this.sky.material.opacity = active ? 1 : 0; this.sky.visible = active; }
        });
        this.state.on('scale', (val) => {
            if (this.activePhotoCard) {
                this.activePhotoCard.container.scale.setScalar(val);
            }
        });
        this.state.on('isCurved', (active) => {
            if (this.activePhotoCard) this.activePhotoCard.update({ curvatureRadius: active ? 5.0 : 1000.0 });
        });
        this.state.on('povMode', (mode) => this.applyPOV(mode));
    }

    initLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const directional = new THREE.DirectionalLight(0xffffff, 1.2);
        directional.position.set(1, 2, 5);
        this.scene.add(directional);
    }

    initSky() {
        const geometry = new THREE.SphereGeometry(15, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.BackSide, transparent: true, opacity: 0 });
        this.sky = new THREE.Mesh(geometry, material);
        this.sky.name = 'sky';
        this.scene.add(this.sky);
    }

    initReticle() {
        const reticleGeom = new THREE.RingGeometry(0.015, 0.02, 32);
        const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false });
        this.reticle = new THREE.Mesh(reticleGeom, reticleMat);
        this.reticle.visible = false;
        this.reticle.renderOrder = 999; 
        this.scene.add(this.reticle);
    }

    async loadGalleryItem(filename) {
        if (!filename) return;
        const strategy = this.state.get('depthStrategy');
        const baseName = filename.split('.')[0];
        const imagePath = `./images/${filename}`;
        const strategyDir = (strategy === 'foveated' || strategy === 'original') ? 'predicted' : strategy;
        const depthPath = `./depth/strategies/${strategyDir}/${baseName}.png`;
        
        if (!this.activePhotoCard) {
            this.activePhotoCard = new PhotoCard(this.scene, { imagePath, depthPath });
            this.activePhotoCard.container.scale.setScalar(this.state.get('scale'));
        } else {
            await this.activePhotoCard.updateTexture(imagePath, depthPath);
        }
    }

    applyPOV(mode) {
        // POV targets are handled by the Interaction Pipeline or logic here
        // The renderer only cares about the camera transform
        if (mode === 'vr') this.camera.position.set(0, 0, 0.1);
        else this.camera.position.set(0, 0, 5);
    }

    setupHandMesh() {
        const handModelFactory = new XRHandModelFactory();
        [0, 1].forEach(index => {
            const hand = this.renderer.xr.getHand(index);
            hand.add(handModelFactory.createHandModel(hand, "mesh"));
            this.scene.add(hand);
        });
    }

    render(timestamp, frame, hitData) {
        if (this.state.get('isXR') && this.handTracking) {
            this.handTracking.update();
        }

        // Auto-Panning State Logic
        if (this.state.get('isAutoPanning')) {
            this.panTime += 0.01;
            const rotation = Math.sin(this.panTime) * 0.2;
            if (this.activePhotoCard && this.activePhotoCard.mesh) {
                this.activePhotoCard.mesh.rotation.y = rotation;
            }
        }

        // 4. Update Shader Uniforms (Reactive)
        this.scene.traverse(obj => {
            if (obj.isMesh && obj.material && obj.material.uniforms) {
                const uniforms = obj.material.uniforms;
                if (uniforms.uDisplacementScale) uniforms.uDisplacementScale.value = this.state.get('immersionActive') ? 2.5 : 0.0;
                if (uniforms.uCurvatureRadius) uniforms.uCurvatureRadius.value = this.state.get('isCurved') ? 5.0 : 100.0;
                if (uniforms.uFoveaFactor) uniforms.uFoveaFactor.value = (this.state.get('depthStrategy') === 'foveated') ? 1.0 : 0.0;
            }
        });

        // Reticle Tracking
        if (hitData && hitData.point) {
            this.reticle.visible = true;
            this.reticle.position.copy(hitData.point).add(hitData.normal.clone().multiplyScalar(0.01));
            this.reticle.lookAt(this.camera.position);
        } else {
            this.reticle.visible = false;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

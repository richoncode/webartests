import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.168.0/examples/jsm/controls/OrbitControls.js';
import { PhotoCard } from './PhotoCard.js';
import { HandTrackingManager } from './HandTrackingManager.js';
import { SpatialUI } from './SpatialUI.js';
import { AudioManager } from './AudioManager.js';
import { XRHandModelFactory } from 'https://unpkg.com/three@0.168.0/examples/jsm/webxr/XRHandModelFactory.js';

export class SpatialRenderer {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
        this.camera.position.set(0, 0, 5); // Default desktop position
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        this.container.appendChild(this.renderer.domElement);
        
        this.controls = null;
        this.isXR = false;
        
        // Desktop Raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.draggedObject = null;
        this.dragOffset = new THREE.Vector3();
        this.dragPlane = new THREE.Plane();
        
        this.initLights();
        this.initXR();
        this.setupEventListeners();
        this.setupInteraction();
        
        this.handTracking = new HandTrackingManager(this.renderer, this.scene);
        this.setupHandMesh();
        
        this.ui = new SpatialUI(this.scene);
        this.audio = new AudioManager();
        this.audio.init(this.camera);

        this.initSky();
    }

    setupInteraction() {
        window.addEventListener('pointerdown', (e) => {
            if (this.isXR || !this.controls) return;
            
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            
            if (intersects.length > 0) {
                let object = intersects[0].object;
                
                // Only drag things that aren't the sky or lights
                if (object.name !== 'sky' && !object.isLight) {
                    // Bubble up to the high-level group (PhotoCard or SpatialUI)
                    while (object.parent && object.parent !== this.scene) {
                        object = object.parent;
                    }
                    this.draggedObject = object;
                    this.controls.enabled = false;
                    
                    // Create a drag plane perpendicular to the camera at the object's depth
                    this.dragPlane.setFromNormalAndCoplanarPoint(
                        this.camera.getWorldDirection(new THREE.Vector3()).negate(),
                        this.draggedObject.position
                    );
                    
                    const intersectionPoint = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
                    this.dragOffset.copy(this.draggedObject.position).sub(intersectionPoint);
                    
                    document.body.style.cursor = 'grabbing';
                    this.audio.playInteraction('click');
                }
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (this.isXR || !this.draggedObject) return;
            
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const intersectPoint = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
                // Target position in world space
                const targetPos = intersectPoint.add(this.dragOffset);
                
                // Safety: Prevent teleportation/disappearance if the distance is extreme (>10 units per frame)
                const dist = this.draggedObject.position.distanceTo(targetPos);
                if (dist < 10 && !isNaN(targetPos.x)) {
                    // Reduce lerp to 0.1 for silky smooth, controlled movement
                    this.draggedObject.position.lerp(targetPos, 0.1);
                }
            }
        });

        window.addEventListener('pointerup', () => {
            if (this.draggedObject) {
                this.draggedObject = null;
                this.controls.enabled = true;
                document.body.style.cursor = 'default';
            }
        });
    }

    startDesktopMode() {
        this.isXR = false;
        this.renderer.xr.enabled = false;
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 15;
        
        this.renderer.setAnimationLoop(this.render.bind(this));
        console.log("Desktop Mode Started");
    }

    startXRMode(mode) {
        this.isXR = true;
        this.renderer.xr.enabled = true;
        this.renderer.setAnimationLoop(this.render.bind(this));
        this.enterXR(mode);
    }

    initSky() {
        const geometry = new THREE.SphereGeometry(15, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x0a0a0a,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0 // Start in "Passthrough" mode
        });
        this.sky = new THREE.Mesh(geometry, material);
        this.scene.add(this.sky);
    }

    setImmersion(val) {
        if (this.sky) {
            this.sky.material.opacity = val;
        }
    }

    initLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 1.2);
        directional.position.set(1, 2, 5);
        this.scene.add(directional);
        
        // Reflection for glass
        const envMap = new THREE.CubeTextureLoader().setPath('https://threejs.org/examples/textures/cube/Park3Med/').load([
            'px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'
        ]);
        this.scene.environment = envMap;
    }

    setupHandMesh() {
        const handModelFactory = new XRHandModelFactory();
        
        [0, 1].forEach(index => {
            const hand = this.renderer.xr.getHand(index);
            hand.add(handModelFactory.createHandModel(hand, "mesh"));
        });
    }

    async addPhoto(imagePath, depthPath) {
        const card = new PhotoCard(this.scene, { imagePath, depthPath });
        return card;
    }

    initXR() {
        // Essential: Zero foveation for edge-to-edge clarity on high-end hardware.
        this.renderer.xr.addEventListener('sessionstart', () => {
            console.log('XR Session Started');
            if (this.renderer.xr.setFoveation) {
                this.renderer.xr.setFoveation(0);
                console.log('Foveation set to 0');
            }
        });

        this.renderer.xr.addEventListener('sessionend', () => {
            console.log('XR Session Ended');
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async enterXR(mode = 'immersive-vr') {
        const sessionInit = {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hand-tracking', 'hit-test', 'anchors', 'depth-sensing']
        };

        try {
            const session = await navigator.xr.requestSession(mode, sessionInit);
            this.renderer.xr.setSession(session);
        } catch (e) {
            console.error('Failed to start XR session:', e);
            throw e;
        }
    }

    render(timestamp, frame) {
        if (this.isXR && this.handTracking) {
            this.handTracking.update();
        } else if (this.controls) {
            this.controls.update();
        }
        
        if (this.ui) this.ui.update(this.camera);
        this.renderer.render(this.scene, this.camera);
    }
}

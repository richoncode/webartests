import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.168.0/examples/jsm/controls/OrbitControls.js';
import { PhotoCard } from './PhotoCard.js?v=2';
import { HandTrackingManager } from './HandTrackingManager.js?v=2';
import { SpatialUI } from './SpatialUI.js?v=2';
import { AudioManager } from './AudioManager.js?v=2';
import { XRHandModelFactory } from 'https://unpkg.com/three@0.168.0/examples/jsm/webxr/XRHandModelFactory.js';

export class SpatialRenderer {
    constructor(container) {
        this.container = container;
        window.renderer = this; // Expose for UI panel callbacks
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
        this.renderer.localClippingEnabled = true; // Essential for scrollable UI masks
        
        this.container.appendChild(this.renderer.domElement);
        
        this.controls = null;
        this.isAutoPanning = true;
        this.panTime = 0;
        this.isCurved = false;
        this.isIndividualBillboarding = true;
        
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
                // Find the first interactive object in the stack (to avoid being blocked by text/labels)
                const interactiveIntersect = intersects.find(hit => hit.object.userData && hit.object.userData.isInteractive);
                
                if (interactiveIntersect) {
                    const object = interactiveIntersect.object;
                    this.clickedObject = object; // Track for release
                    
                    if (this.ui) this.ui.handlePress(object, true);
                    if (object.userData.callback) object.userData.callback();
                    this.audio.playInteraction('click');
                    return; 
                }

                let object = intersects[0].object;
                // Priority 2: Draggable objects
                if (object.name !== 'sky' && !object.isLight) {
                    // Bubble up to the high-level group
                    while (object.parent && object.parent !== this.scene) {
                        object = object.parent;
                    }
                    this.draggedObject = object;
                    this.controls.enabled = false;
                    
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
            if (this.isXR) return;
            
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Handle UI Hover States
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            if (this.ui) {
                // Find interactive target first
                const interactiveIntersect = intersects.find(hit => hit.object.userData && hit.object.userData.isInteractive);
                const hoverTarget = interactiveIntersect ? interactiveIntersect.object : (intersects.length > 0 ? intersects[0].object : null);
                
                // If the target has changed or is new
                if (this.lastHoverTarget !== hoverTarget) {
                    if (this.lastHoverTarget) this.ui.handleHover(this.lastHoverTarget, false);
                    if (hoverTarget) this.ui.handleHover(hoverTarget, true);
                    this.lastHoverTarget = hoverTarget;
                    
                    if (hoverTarget && hoverTarget.userData.isInteractive) {
                        document.body.style.cursor = 'pointer';
                    } else if (!this.draggedObject) {
                        document.body.style.cursor = 'default';
                    }
                }
            }

            if (!this.draggedObject) return;
            
            const intersectPoint = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
                const targetPos = intersectPoint.add(this.dragOffset);
                const dist = this.draggedObject.position.distanceTo(targetPos);
                if (dist < 10 && !isNaN(targetPos.x)) {
                    this.draggedObject.position.lerp(targetPos, 0.1);
                }
            }
        });

        window.addEventListener('pointerup', () => {
            if (this.clickedObject) {
                if (this.ui) this.ui.handlePress(this.clickedObject, false);
                this.clickedObject = null;
            }

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
        this.controls.minDistance = 0.1;
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
            this.sky.visible = val > 0;
        }
    }

    toggleImmersion() {
        if (!this.sky) return false;
        const target = this.sky.material.opacity > 0.5 ? 0 : 1;
        this.setImmersion(target);
        return target > 0.5;
    }

    resetView() {
        if (this.controls) {
            this.controls.reset();
            // OrbitControls.reset() handles position if set up correctly, 
            // but let's be explicit for the mock.
        this.camera.position.set(0, 0, 5);
            this.camera.lookAt(0, 0, 0);
        }
    }

    async updateGalleryByFilename(filename) {
        if (!this.activePhotoCard) return;

        const imgPath = `./images/${filename}`;
        // Ensure depth path preserves format (e.g. .jpg image might use .png depth depending on previous pipeline)
        // But the previous work in 9f091317-63b2-4cd4-94e6-667ca75f4739 suggested they are in depth/
        // I will check if filename.png exists in depth/ or if it's the same extension.
        // For now, I'll assume same extension or .png as standard.
        const baseName = filename.split('.').slice(0, -1).join('.');
        let depthPath = `./depth/${baseName}.png`; // Most depth maps are PNGs for precision
        
        console.log(`Gallery: Transitioning to ${filename}...`);
        await this.activePhotoCard.updateTexture(imgPath, depthPath);
        if (this.audio) this.audio.playInteraction('click');
    }

    async updateGallery(id) {
        const catalog = {
            1: 'snow-trees.jpg',
            2: 'starfish.jpg',
            3: 'parachutist.jpg',
            4: 'peacock.jpg',
            5: 'earth.jpg',
            6: 'sample.png',
            7: 'burning-man.jpg',
            8: 'glacier.jpg',
            9: 'cube-kite.jpg'
        };
        
        const filename = catalog[id] || 'sample.png';
        await this.updateGalleryByFilename(filename);
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
        this.activePhotoCard = card;
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

    scaleActivePhoto(factor) {
        this.scene.traverse(obj => {
            if (obj.isMesh && obj.material.uniforms && obj.material.uniforms.uDisplacementScale) {
                const newScale = obj.scale.x * factor;
                // Clamp scale between 0.5 and 2.5 (physical size 3m to 15m)
                if (newScale >= 0.5 && newScale <= 2.5) {
                    obj.scale.multiplyScalar(factor);
                    console.log("Gallery: Active photo scaled to", newScale);
                }
            }
        });
        if (this.audio) this.audio.playInteraction('success');
    }

    toggleAutoPan() {
        this.isAutoPanning = !this.isAutoPanning;
        console.log("Auto-Pan Toggled:", this.isAutoPanning);
        if (this.audio) this.audio.playInteraction('success');
        return this.isAutoPanning;
    }

    toggleCurvature() {
        this.isCurved = !this.isCurved || false;
        const radius = this.isCurved ? 5.0 : 1000.0; // 1000m is effectively flat
        if (this.activePhotoCard) {
            this.activePhotoCard.update({ curvatureRadius: radius });
        }
        console.log("Gallery: Curvature toggled to", this.isCurved);
        if (this.audio) this.audio.playInteraction('success');
        return this.isCurved;
    }

    setPOV(mode) {
        if (!this.controls) return;
        if (mode === 'vr') {
            this.camera.position.set(0, 0, 0.1);
            this.controls.target.set(0, 0, -5);
        } else {
            this.camera.position.set(0, 0, 5);
            this.controls.target.set(0, 0, 0);
        }
        this.controls.update();
        if (this.audio) this.audio.playInteraction('success');
        console.log("Gallery: POV changed to", mode);
    }

    toggleIndividualBillboarding() {
        this.isIndividualBillboarding = !this.isIndividualBillboarding;
        if (this.audio) this.audio.playInteraction('success');
        console.log("Gallery: Individual Billboarding is now", this.isIndividualBillboarding);
        return this.isIndividualBillboarding;
    }

    render(timestamp, frame) {
        if (this.isXR && this.handTracking) {
            this.handTracking.update();
        } else if (this.controls) {
            this.controls.update();
        }
        
        // Auto-Pan Logic: Rotate all PhotoCards
        if (this.isAutoPanning) {
            this.panTime += (this.panTime !== undefined ? 0.01 : 0);
            const rotation = Math.sin(this.panTime || 0) * 0.2; // +/- 0.2 rads (~11 degrees)
            this.scene.traverse(obj => {
                if (obj.isMesh && obj.material && obj.material.uniforms && obj.material.uniforms.uDisplacementScale) {
                    obj.rotation.y = rotation;
                }
            });
        }
        
        if (this.ui) this.ui.update(this.camera);
        this.renderer.render(this.scene, this.camera);
    }
}

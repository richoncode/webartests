import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://unpkg.com/three@0.168.0/examples/jsm/geometries/RoundedBoxGeometry.js';

export class SpatialUI {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.panels = {}; // { name: { group, mesh, elements } }
        this.interactiveElements = [];
        this.billboardEnabled = true;
        this.init();
    }

    init() {
        console.log("SpatialUI: Initializing 3-Panel Dashboard...");
        
        // 1. Center Panel: Status & Overview
        this.createPanel('center', 2, 1.2, new THREE.Vector3(0, 1.5, -3), new THREE.Euler(0, 0, 0));
        this.addTextToPanel('center', "LUMINA SYSTEM STATUS", 0, 0.45, 0.18); // Increased from 0.15
        this.addTextToPanel('center', "ACTIVE SESSION: 0x4F2A", 0, 0.28, 0.1); // Increased from 0.08
        this.addButtonToPanel('center', "DISMISS OVERLAY", 0, -0.3, () => {
            this.group.visible = false;
        });

        // 2. Left Panel: Media Picker (2x5 Grid for 10 Photos)
        this.createPanel('left', 2.2, 1.4, new THREE.Vector3(-2.6, 1.5, -2.4), new THREE.Euler(0, 0.5, 0));
        this.addTextToPanel('left', "MEDIA CATALOG (10)", 0, 0.55, 0.12);
        
        for (let i = 1; i <= 10; i++) {
            const row = Math.floor((i - 1) / 2);
            const col = (i - 1) % 2;
            const x = (col - 0.5) * 1.0;
            const y = 0.3 - (row * 0.22);
            
            this.addButtonToPanel('left', `PHOTO ${i}`, x, y, (btn) => {
                window.renderer.updateGallery(i);
            });
        }

        // 3. Right Panel: Environment
        this.createPanel('right', 2.0, 1.2, new THREE.Vector3(2.4, 1.5, -2.6), new THREE.Euler(0, -0.45, 0));
        this.addTextToPanel('right', "ENVIRONMENT", 0, 0.45, 0.15);
        
        this.addButtonToPanel('right', "IMMERSION: ON/OFF", 0, 0.05, (btn) => {
            const isActive = window.renderer.toggleImmersion();
            console.log("Immersion Toggled:", isActive);
        });

        this.addButtonToPanel('right', "RESET VIEW", 0, -0.25, () => {
            window.renderer.resetView();
        });

        // Add Scale Controls
        this.addButtonToPanel('right', "ENLARGE PHOTO", -0.4, -0.85, () => window.renderer.scaleActivePhoto(1.1));
        this.addButtonToPanel('right', "SHRINK PHOTO", 0.4, -0.85, () => window.renderer.scaleActivePhoto(0.9));

        // 4. Info Panel: Technical Specs (Lower Center)
        this.createPanel('stats', 2.0, 0.6, new THREE.Vector3(0, 0.4, -2.8), new THREE.Euler(-0.2, 0, 0));
        this.addTextToPanel('stats', "TECHNICAL SPECS", 0, 0.18, 0.08);
        this.addTextToPanel('stats', "RENDER: METAL-CORE V3", -0.5, -0.1, 0.06);
        this.addTextToPanel('stats', "DEPTH: 32-BIT FLOAT", 0.5, -0.1, 0.06);
        this.panels['stats'].group.visible = true; // Always visible for now

        // Add Auto-Pan Toggle to Right Panel
        this.addButtonToPanel('right', "AUTO-PAN: ON/OFF", 0, -0.55, () => {
            window.renderer.toggleAutoPan();
        });

        // Add Curvature Toggle to Right Panel
        this.addButtonToPanel('right', "CURVATURE: ON/OFF", 0, -0.85, () => {
            window.renderer.toggleCurvature();
        });

        this.scene.add(this.group);
        console.log("SpatialUI: Dashboard Initialized.");
    }

    createPanel(name, width, height, position, rotation) {
        const panelGroup = new THREE.Group();
        panelGroup.position.copy(position);
        panelGroup.rotation.copy(rotation);
        
        const geometry = new RoundedBoxGeometry(width, height, 0.08, 12, 0.08);
        const material = new THREE.MeshPhysicalMaterial({
            transmission: 1.0,
            thickness: 0.2,
            roughness: 0.0,
            metalness: 0,
            color: 0x000000,
            ior: 1.52,
            transparent: true,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            sheen: 1.0,
            sheenRoughness: 0.5,
            sheenColor: 0x5b9bd5,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `Panel-${name}`;
        panelGroup.add(mesh);
        
        this.group.add(panelGroup);
        this.panels[name] = { group: panelGroup, mesh, elements: [] };
    }

    addTextToPanel(panelName, text, x, y, size = 0.1, zOffset = 0.045, maxWidth = null) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const charCount = text.length;
        const aspect = Math.max(4, charCount * 0.6); 
        
        // Final size calculation with maxWidth constraint
        let finalSize = size;
        if (maxWidth && (size * aspect) > maxWidth) {
            finalSize = maxWidth / aspect;
        }

        canvas.width = 1024 * (aspect / 4);
        canvas.height = 256;
        
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = `900 180px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width/2, canvas.height/2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
        
        const geometry = new THREE.PlaneGeometry(finalSize * aspect, finalSize);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, zOffset);
        mesh.renderOrder = 20; 
        this.panels[panelName].group.add(mesh);
        return mesh;
    }

    addButtonToPanel(panelName, label, x, y, callback) {
        const btnGeom = new RoundedBoxGeometry(0.8, 0.25, 0.04, 6, 0.04); 
        const btnMat = new THREE.MeshStandardMaterial({
            color: 0x5b9bd5,
            metalness: 0.2,
            roughness: 0.15,
            transparent: true,
            opacity: 0.85
        });

        const btnMesh = new THREE.Mesh(btnGeom, btnMat);
        btnMesh.position.set(x, y, 0.06); 
        btnMesh.name = `button-${label}`;
        btnMesh.userData = { 
            callback, 
            isInteractive: true,
            originalColor: 0x5b9bd5,
            hoverColor: 0x10b981,
            pressedColor: 0x059669,
            defaultZ: 0.06,
            pressedZ: 0.042
        };
        
        this.panels[panelName].group.add(btnMesh);
        this.interactiveElements.push(btnMesh);

        // Balance: Aim for 0.14 height, but cap at 0.72m width (with 10% margin on 0.8m btn)
        this.addTextToPanel(panelName, label, x, y, 0.14, 0.082, 0.72);
    }

    update(camera) {
        if (this.billboardEnabled) {
            // Constrained Y-axis billboarding (Pitch lock)
            const targetPos = new THREE.Vector3();
            camera.getWorldPosition(targetPos);
            
            // Project target to our horizon level
            const horizonTarget = new THREE.Vector3(targetPos.x, this.group.position.y, targetPos.z);
            
            const currentRotation = this.group.quaternion.clone();
            this.group.lookAt(horizonTarget);
            this.group.quaternion.slerp(currentRotation, 0.9); // Smooth damping
        }
    }

    handleHover(object, isHovering) {
        if (!object || !object.userData.isInteractive) return;
        
        if (isHovering) {
            object.material.color.setHex(object.userData.hoverColor);
            object.material.opacity = 1.0;
            object.scale.set(1.05, 1.05, 1.05); // Subtle scale feedback
        } else {
            object.material.color.setHex(object.userData.originalColor);
            object.material.opacity = 0.8;
            object.scale.set(1, 1, 1);
            // Reset position just in case it was stuck pressed
            object.position.z = object.userData.defaultZ;
        }
    }

    handlePress(object, isPressed) {
        if (!object || !object.userData.isInteractive) return;
        
        if (isPressed) {
            object.material.color.setHex(object.userData.pressedColor);
            object.position.z = object.userData.pressedZ;
        } else {
            object.material.color.setHex(object.userData.hoverColor);
            object.position.z = object.userData.defaultZ;
        }
    }
}

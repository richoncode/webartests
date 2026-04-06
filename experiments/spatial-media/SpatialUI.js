import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://unpkg.com/three@0.168.0/examples/jsm/geometries/RoundedBoxGeometry.js';

export class SpatialUI {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.panels = {}; // { group, mesh, clippingPlanes, scrollGroup, scrollY, maxScroll, buttons: {} }
        this.interactiveElements = [];
        this.billboardEnabled = true;
        this.textureLoader = new THREE.TextureLoader();
        this.init();
    }

    async init() {
        console.log("SpatialUI: Initializing Dashboards...");
        
        const innerEdgeH = 40 * (Math.PI / 180);
        const radiusSide = 3.2;
        const rightHalfAngle = Math.asin(1.0 / radiusSide);
        const rightCenterAngle = innerEdgeH + rightHalfAngle;
        
        const statsEdgeV = 45 * (Math.PI / 180);
        const radiusStats = 3.0;
        const statsHalfAngle = Math.asin(0.35 / radiusStats);
        const statsCenterAngle = statsEdgeV + statsHalfAngle;

        // 1. Calculations: Tall Media Pillar (Left)
        // Original 2.2x1.4. Requested: Twice as high (2.8) and half as wide (1.1). 
        // NOTE: Previous user request was "twice as large", but current request is "twice as high and half as wide" relative to "Media Wall".
        // I will implement 2.2m wide x 5.6m high (2x height of the Wall's 2.8m).
        const leftHalfAngle = Math.asin(1.1 / radiusSide);
        const leftCenterAngle = innerEdgeH + leftHalfAngle;

        const xStatus = Math.sin(rightCenterAngle) * radiusSide;
        const zStatus = -Math.cos(rightCenterAngle) * radiusSide;

        // 2. Status Panel 
        this.createPanel('center', 2, 0.6, new THREE.Vector3(xStatus, 2.2, zStatus), new THREE.Euler(0, -rightCenterAngle, 0));
        this.addTextToPanel('center', "LUMINA SYSTEM STATUS", 0, 0.15, 0.12);
        this.addTextToPanel('center', "ACTIVE SESSION: 0x4F2A", 0, -0.02, 0.08);

        // 3. Left Panel: Media Pillar (2.2m x 5.6m) 
        const xLeft = Math.sin(-leftCenterAngle) * radiusSide;
        const zLeft = -Math.cos(-leftCenterAngle) * radiusSide;
        this.createPanel('left', 2.2, 5.6, new THREE.Vector3(xLeft, 0, zLeft), new THREE.Euler(0, leftCenterAngle, 0));
        
        const leftPanel = this.panels['left'];
        leftPanel.scrollGroup = new THREE.Group();
        leftPanel.scrollY = 0;
        leftPanel.group.add(leftPanel.scrollGroup);
        
        // Massive vertical viewport (fits the 5.6m pillar)
        const topViewport = 2.65;
        const bottomViewport = 2.75;
        const topPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), topViewport);
        const bottomPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), bottomViewport);
        leftPanel.clippingPlanes = [topPlane, bottomPlane];

        this.addTextToPanel('left', "MEDIA CATALOG", 0, 2.65, 0.18);
        
        try {
            const response = await fetch('./catalog.json');
            const catalog = await response.json();
            const uniqueCatalog = catalog.filter((v, i, a) => a.findIndex(t => t.filename === v.filename) === i);

            // 2-column skyscraper layout
            uniqueCatalog.forEach((item, i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = (col - 0.5) * 1.05; 
                const y = 2.1 - (row * 1.15); 
                
                this.addThumbnailButtonToPanel('left', `./thumbnails/${item.thumbnail}`, x, y, () => {
                    window.renderer.updateGalleryByFilename(item.filename);
                }, leftPanel.scrollGroup, leftPanel.clippingPlanes);
            });

            leftPanel.maxScroll = Math.max(0, (Math.ceil(uniqueCatalog.length / 2) - 2.5) * 1.15);
        } catch (e) {
            console.error("SpatialUI: Catalog error", e);
        }

        // 4. Right Panel: Environment
        this.createPanel('right', 2.0, 1.4, new THREE.Vector3(xStatus, 1.2, zStatus), new THREE.Euler(0, -rightCenterAngle, 0));
        this.addTextToPanel('right', "ENVIRONMENT", 0, 0.55, 0.15);
        this.addButtonToPanel('right', "IMMERSION: ON/OFF", 0, 0.28, 0.8, () => window.renderer.toggleImmersion());
        this.addButtonToPanel('right', "RESET VIEW", 0, 0.08, 0.8, () => window.renderer.resetView());
        this.addButtonToPanel('right', "AUTO-PAN", 0, -0.12, 0.8, () => window.renderer.toggleAutoPan());
        this.addButtonToPanel('right', "CURVATURE: ON/OFF", 0, -0.32, 0.8, () => window.renderer.toggleCurvature());
        this.addButtonToPanel('right', "+ SIZE", -0.45, -0.58, 0.45, () => window.renderer.scaleActivePhoto(1.1));
        this.addButtonToPanel('right', "- SIZE", 0.45, -0.58, 0.45, () => window.renderer.scaleActivePhoto(0.9));

        // 5. Stats Panel (Advanced Controls)
        const yStats = -Math.sin(statsCenterAngle) * radiusStats;
        const zStats = -Math.cos(statsCenterAngle) * radiusStats;
        this.createPanel('stats', 2.2, 0.6, new THREE.Vector3(0, yStats, zStats), new THREE.Euler(-statsCenterAngle, 0, 0));
        this.addTextToPanel('stats', "TECHNICAL SYSTEM DIAGNOSTICS", 0, 0.18, 0.08);

        this.addButtonToPanel('stats', "POV: VR", -0.4, -0.1, 0.8, () => {
             if (window.renderer) window.renderer.setPOV('vr');
        });
        this.addButtonToPanel('stats', "POV: DESK", 0.4, -0.1, 0.8, () => {
             if (window.renderer) window.renderer.setPOV('desktop');
        });
        
        // Dynamic Billboard Toggle
        const getBillboardLabel = () => window.renderer && window.renderer.isIndividualBillboarding ? "TRACK: INDIVIDUAL" : "TRACK: GROUP";
        this.addButtonToPanel('stats', getBillboardLabel(), 0, -0.35, 1.3, (btn) => {
             if (window.renderer) {
                 const isIndivid = window.renderer.toggleIndividualBillboarding();
                 this.updateButtonText(btn, isIndivid ? "TRACK: INDIVIDUAL" : "TRACK: GROUP");
             }
        }, 'billboard_btn');

        this.scene.add(this.group);
        window.addEventListener('wheel', (e) => this.handleScroll('left', e.deltaY * 0.002));
    }

    updateButtonText(btn, newText) {
        // Find existing text label child
        const textLabel = btn.userData.textLabel;
        if (textLabel) {
            btn.parent.remove(textLabel);
            textLabel.geometry.dispose();
            textLabel.material.map.dispose();
            textLabel.material.dispose();
        }
        
        const newTextLabel = this.addTextToPanel('stats', newText, btn.position.x, btn.position.y, 0.09, 0.145);
        btn.userData.textLabel = newTextLabel;
    }

    handleScroll(panelName, delta) {
        const panel = this.panels[panelName];
        if (!panel || !panel.scrollGroup) return;
        panel.scrollY += delta;
        panel.scrollY = Math.max(0, Math.min(panel.scrollY, panel.maxScroll || 0));
        panel.scrollGroup.position.y = panel.scrollY;
    }

    createPanel(name, width, height, position, rotation) {
        const panelGroup = new THREE.Group();
        panelGroup.position.copy(position);
        panelGroup.rotation.copy(rotation);
        
        const geometry = new RoundedBoxGeometry(width, height, 0.08, 12, 0.08);
        const material = new THREE.MeshPhysicalMaterial({
            transmission: 1.0, thickness: 0.2, roughness: 0.05,
            metalness: 0, color: 0x000000, ior: 1.5, transparent: true,
            clearcoat: 1.0, clearcoatRoughness: 0.1, side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        panelGroup.add(mesh);
        this.group.add(panelGroup);
        this.panels[name] = { group: panelGroup, mesh, elements: [], buttons: {} };
    }

    addTextToPanel(panelName, text, x, y, size = 0.1, zOffset = 0.14) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const aspect = Math.max(4, text.length * 0.7); 
        canvas.width = 1024 * (aspect / 4); 
        canvas.height = 256;
        ctx.fillStyle = 'white';
        ctx.font = `900 180px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width/2, canvas.height/2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * aspect, size), material);
        mesh.position.set(x, y, zOffset);
        this.panels[panelName].group.add(mesh);
        return mesh;
    }

    addButtonToPanel(panelName, label, x, y, width, callback, id = null) {
        const btnGeom = new RoundedBoxGeometry(width, 0.18, 0.04, 6, 0.02); 
        const btnMat = new THREE.MeshStandardMaterial({
            color: 0x5b9bd5, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.95
        });
        const btnMesh = new THREE.Mesh(btnGeom, btnMat);
        btnMesh.position.set(x, y, 0.1); 
        // Allow callback to receive the button mesh for text updates
        const wrapper = () => callback(btnMesh);
        btnMesh.userData = { callback: wrapper, isInteractive: true, originalColor: 0x5b9bd5, hoverColor: 0x10b981, pressedColor: 0x059669, defaultZ: 0.1, pressedZ: 0.08 };
        
        this.panels[panelName].group.add(btnMesh);
        this.interactiveElements.push(btnMesh);
        const labelMesh = this.addTextToPanel(panelName, label, x, y, 0.09, 0.145);
        btnMesh.userData.textLabel = labelMesh;
        if (id) this.panels[panelName].buttons[id] = btnMesh;
    }

    addThumbnailButtonToPanel(panelName, texturePath, x, y, callback, parentOverride = null, clippingPlanes = null) {
        const size = 1.0; 
        const texture = this.textureLoader.load(texturePath);
        const btnMat = new THREE.MeshStandardMaterial({
            map: texture, transparent: true, opacity: 1.0,
            metalness: 0.1, roughness: 0.5,
            clippingPlanes: clippingPlanes || []
        });

        const btnMesh = new THREE.Mesh(new RoundedBoxGeometry(size, size, 0.06, 4, 0.02), btnMat);
        btnMesh.position.set(x, y, 0.1);
        btnMesh.userData = { callback, isInteractive: true, originalColor: 0xffffff, hoverColor: 0x5b9bd5, pressedColor: 0x10b981, defaultZ: 0.1, pressedZ: 0.08 };

        const parent = parentOverride || this.panels[panelName].group;
        parent.add(btnMesh);
        this.interactiveElements.push(btnMesh);
        
        const borderMat = new THREE.LineBasicMaterial({ color: 0x5b9bd5, transparent: true, opacity: 0.6, clippingPlanes: clippingPlanes || [] });
        const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(size, size)), borderMat);
        border.position.set(x, y, 0.131);
        parent.add(border);
    }

    update(camera) {
        const targetPos = new THREE.Vector3();
        camera.getWorldPosition(targetPos);
        
        const isIndivid = window.renderer && window.renderer.isIndividualBillboarding;

        if (this.billboardEnabled) {
            if (isIndivid) {
                this.group.quaternion.set(0, 0, 0, 1);
                Object.values(this.panels).forEach(panel => {
                    const lookTarget = targetPos.clone();
                    panel.group.lookAt(lookTarget);
                });
            } else {
                const currentRotation = this.group.quaternion.clone();
                this.group.lookAt(targetPos);
                this.group.quaternion.slerp(currentRotation, 0.85); 
            }
        }

        // Sync Clipping Planes
        Object.values(this.panels).forEach(panel => {
            if (panel.clippingPlanes) {
                const worldQuat = new THREE.Quaternion();
                panel.group.getWorldQuaternion(worldQuat);

                panel.clippingPlanes.forEach((plane, i) => {
                    const normal = new THREE.Vector3(0, i === 0 ? -1 : 1, 0);
                    const point = new THREE.Vector3(0, i === 0 ? 2.65 : -2.75, 0);
                    normal.applyQuaternion(worldQuat).normalize();
                    point.applyMatrix4(panel.group.matrixWorld);
                    plane.setFromNormalAndCoplanarPoint(normal, point);
                });
            }
        });
    }

    handleHover(object, isHovering) {
        if (!object || !object.userData.isInteractive) return;
        if (isHovering) {
            if (object.material.map) object.scale.set(1.05, 1.05, 1.05);
            else { object.material.color.setHex(object.userData.hoverColor); }
        } else {
            object.scale.set(1, 1, 1);
            if (!object.material.map) object.material.color.setHex(object.userData.originalColor);
        }
    }

    handlePress(object, isPressed) {
        if (!object || !object.userData.isInteractive) return;
        object.position.z = isPressed ? object.userData.pressedZ : object.userData.defaultZ;
    }
}

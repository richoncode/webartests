import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://unpkg.com/three@0.168.0/examples/jsm/geometries/RoundedBoxGeometry.js';

export class SpatialUI {
    constructor(scene, state, assetLoader) {
        this.scene = scene;
        this.state = state;
        this.assetLoader = assetLoader;
        this.group = new THREE.Group();
        this.panels = {}; 
        this.interactiveElements = [];
        this.textureLoader = new THREE.TextureLoader();
        this.ready = this.init();
    }

    async init() {
        console.log("SpatialUI: Building Dashboards...");
        
        const innerEdgeH = 40 * (Math.PI / 180);
        const radiusSide = 3.2;
        const rightHalfAngle = Math.asin(1.0 / radiusSide);
        const rightCenterAngle = innerEdgeH + rightHalfAngle;
        
        const statsEdgeV = 45 * (Math.PI / 180);
        const radiusStats = 3.0;
        const statsHalfAngle = Math.asin(0.35 / radiusStats);
        const statsCenterAngle = statsEdgeV + statsHalfAngle;

        const leftHalfAngle = Math.asin(1.1 / radiusSide);
        const leftCenterAngle = innerEdgeH + leftHalfAngle;

        const xStatus = Math.sin(rightCenterAngle) * radiusSide;
        const zStatus = -Math.cos(rightCenterAngle) * radiusSide;

        // 1. Status Panel (Center)
        this.createPanel('center', 2, 0.6, new THREE.Vector3(xStatus, 2.2, zStatus), new THREE.Euler(0, -rightCenterAngle, 0));
        this.addTextToPanel('center', "LUMINA SYSTEM STATUS", 0, 0.15, 0.12);
        this.addTextToPanel('center', "ACTIVE SESSION: 0x4F2A", 0, -0.02, 0.08);

        // 2. Left Panel: Media Catalog
        const xLeft = Math.sin(-leftCenterAngle) * radiusSide;
        const zLeft = -Math.cos(-leftCenterAngle) * radiusSide;
        this.createPanel('left', 2.2, 5.6, new THREE.Vector3(xLeft, 0, zLeft), new THREE.Euler(0, leftCenterAngle, 0));
        this.setupCatalogPanel();

        // 3. Right Panel: Environment (Expanded for 12-Mode Ultra-Dashboard)
        this.createPanel('right', 1.6, 4.2, new THREE.Vector3(xStatus, 1.2, zStatus), new THREE.Euler(0, -rightCenterAngle, 0));
        this.addTextToPanel('right', "ENVIRONMENT", 0, 1.95, 0.14);
        
        const btnWStack = 1.2;
        this.addButtonToPanel('right', "IMMERSION", 0, 1.75, btnWStack, () => this.state.set('immersionActive', !this.state.get('immersionActive')), 'IMMERSION_BTN', true);
        this.addButtonToPanel('right', "AUTO-PAN", 0, 1.57, btnWStack, () => this.state.set('isAutoPanning', !this.state.get('isAutoPanning')), 'AUTOPAN_BTN', true);
        this.addButtonToPanel('right', "CURVATURE", 0, 1.39, btnWStack, () => this.state.set('isCurved', !this.state.get('isCurved')), 'CURVATURE_BTN', true);

        // Momentary Size Cluster
        const ySize = 1.20;
        this.addButtonToPanel('right', "-", -0.3, ySize, 0.2, () => this.state.set('scale', this.state.get('scale') * 0.9), 'SIZE_MINUS', false);
        this.addTextToPanel('right', "SIZE", 0, ySize, 0.08, 0.145);
        this.addButtonToPanel('right', "+", 0.3, ySize, 0.2, () => this.state.set('scale', this.state.get('scale') * 1.1), 'SIZE_PLUS', false);

        // Depth Strategy Group (Expanded to 12 Modes)
        this.addTextToPanel('right', "DEPTH STRATEGY (SOTA)", 0, 0.92, 0.1);
        const yBase = 0.68;
        const yStep = 0.2;
        
        // Tier 1: SOTA
        this.addButtonToPanel('right', "DIFFUSION", 0, yBase, btnWStack, () => this.state.set('depthStrategy', 'diffusion'), 'DEPTH_DIFFUSION', true);
        this.addButtonToPanel('right', "METRIC (ABS)", 0, yBase - yStep, btnWStack, () => this.state.set('depthStrategy', 'metric'), 'DEPTH_METRIC', true);
        this.addButtonToPanel('right', "SEGMENT (SAM)", 0, yBase - (yStep*2), btnWStack, () => this.state.set('depthStrategy', 'segment'), 'DEPTH_SEGMENT', true);
        this.addButtonToPanel('right', "TILE-FUSION", 0, yBase - (yStep*3), btnWStack, () => this.state.set('depthStrategy', 'fusion'), 'DEPTH_FUSION', true);
        
        // Tier 2: Established
        const yBase2 = yBase - (yStep*4.5);
        this.addButtonToPanel('right', "PREDICTED (ML)", 0, yBase2, btnWStack, () => this.state.set('depthStrategy', 'predicted'), 'DEPTH_PREDICTED', true);
        this.addButtonToPanel('right', "SEMANTIC", 0, yBase2 - yStep, btnWStack, () => this.state.set('depthStrategy', 'semantic'), 'DEPTH_SEMANTIC', true);
        this.addButtonToPanel('right', "MPI (LAYERS)", 0, yBase2 - (yStep*2), btnWStack, () => this.state.set('depthStrategy', 'mpi'), 'DEPTH_MPI', true);
        this.addButtonToPanel('right', "LIDAR", 0, yBase2 - (yStep*3), btnWStack, () => this.state.set('depthStrategy', 'lidar'), 'DEPTH_LIDAR', true);
        this.addButtonToPanel('right', "FOVEATED", 0, yBase2 - (yStep*4), btnWStack, () => this.state.set('depthStrategy', 'foveated'), 'DEPTH_FOVEATED', true);
        
        // Tier 3: Heuristics
        const yBase3 = yBase2 - (yStep*5);
        this.addButtonToPanel('right', "RADIAL", 0, yBase3, btnWStack, () => this.state.set('depthStrategy', 'radial'), 'DEPTH_RADIAL', true);
        this.addButtonToPanel('right', "LINEAR", 0, yBase3 - yStep, btnWStack, () => this.state.set('depthStrategy', 'linear'), 'DEPTH_LINEAR', true);
        this.addButtonToPanel('right', "SUBJECT", 0, yBase3 - (yStep*2), btnWStack, () => this.state.set('depthStrategy', 'subject'), 'DEPTH_SUBJECT', true);

        // 4. Stats Panel (Diagnostics)
        const yStats = -Math.sin(statsCenterAngle) * radiusStats;
        const zStats = -Math.cos(statsCenterAngle) * radiusStats;
        this.createPanel('stats', 2.2, 0.6, new THREE.Vector3(0, yStats, zStats), new THREE.Euler(-statsCenterAngle, 0, 0));
        this.addTextToPanel('stats', "SYSTEM DIAGNOSTICS", 0, 0.18, 0.08);

        this.addButtonToPanel('stats', "POV: VR", -0.4, -0.1, 0.8, () => this.state.set('povMode', 'vr'), 'POV-VR', true);
        this.addButtonToPanel('stats', "POV: DESK", 0.4, -0.1, 0.8, () => this.state.set('povMode', 'desk'), 'POV-DESK', true);
        
        this.scene.add(this.group);
        this.setupObservers();
    }

    setupCatalogPanel() {
        const leftPanel = this.panels['left'];
        leftPanel.scrollGroup = new THREE.Group();
        leftPanel.scrollY = 0;
        leftPanel.group.add(leftPanel.scrollGroup);
        this.addTextToPanel('left', "MEDIA CATALOG", 0, 2.65, 0.18);

        const catalog = this.assetLoader.getUniqueCatalog();
        catalog.forEach((item, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = (col - 0.5) * 1.05; 
            const y = 2.1 - (row * 1.15); 
            
            this.addThumbnailButtonToPanel('left', `./thumbnails/${item.thumbnail}`, x, y, () => {
                this.state.set('currentImage', item.filename);
            }, leftPanel.scrollGroup, `M${i+1}`);
        });

        leftPanel.maxScroll = Math.max(0, (Math.ceil(catalog.length / 2) - 2.5) * 1.15);
    }

    setupObservers() {
        // Sync LEDs with State
        const syncLED = (id, key, targetValue) => {
            this.state.on(key, (current) => this.setButtonStatus(id, current === targetValue || current === true && targetValue === undefined));
        };

        syncLED('IMMERSION_BTN', 'immersionActive');
        syncLED('AUTOPAN_BTN', 'isAutoPanning');
        syncLED('CURVATURE_BTN', 'isCurved');
        syncLED('POV-VR', 'povMode', 'vr');
        syncLED('POV-DESK', 'povMode', 'desk');
        syncLED('DEPTH_DIFFUSION', 'depthStrategy', 'diffusion');
        syncLED('DEPTH_METRIC', 'depthStrategy', 'metric');
        syncLED('DEPTH_SEGMENT', 'depthStrategy', 'segment');
        syncLED('DEPTH_FUSION', 'depthStrategy', 'fusion');
        syncLED('DEPTH_PREDICTED', 'depthStrategy', 'predicted');
        syncLED('DEPTH_SEMANTIC', 'depthStrategy', 'semantic');
        syncLED('DEPTH_MPI', 'depthStrategy', 'mpi');
        syncLED('DEPTH_LIDAR', 'depthStrategy', 'lidar');
        syncLED('DEPTH_FOVEATED', 'depthStrategy', 'foveated');
        syncLED('DEPTH_RADIAL', 'depthStrategy', 'radial');
        syncLED('DEPTH_LINEAR', 'depthStrategy', 'linear');
        syncLED('DEPTH_SUBJECT', 'depthStrategy', 'subject');
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

    addTextToPanel(panelName, text, x, y, size = 0.1, zOffset = 0.14, parentOverride = null) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const lines = text.split('\n');
        const aspect = Math.max(4, Math.max(...lines.map(l => l.length)) * 0.7); 
        canvas.width = 1024 * (aspect / 4); 
        canvas.height = 256 * lines.length;
        ctx.fillStyle = 'white';
        ctx.font = `900 160px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        lines.forEach((line, i) => ctx.fillText(line, canvas.width/2, (canvas.height/lines.length) * (i + 0.5)));
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * aspect, size * lines.length), material);
        mesh.position.set(x, y, zOffset);
        (parentOverride || this.panels[panelName].group).add(mesh);
        return mesh;
    }

    addButtonToPanel(panelName, label, x, y, width, callback, id, hasStatus = false) {
        const btnHeight = 0.18;
        const btnDepth = 0.04;
        const visualMesh = new THREE.Mesh(
            new RoundedBoxGeometry(width, btnHeight, btnDepth, 6, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x5b9bd5, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.95 })
        );
        visualMesh.position.set(x, y, 0.1); 
        this.panels[panelName].group.add(visualMesh);

        let pillMesh = null;
        if (hasStatus) {
            const pillWidth = 0.08;
            const pm = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0x000000, emissiveIntensity: 0 });
            pillMesh = new THREE.Mesh(new RoundedBoxGeometry(pillWidth, 0.03, 0.02, 4, 0.01), pm);
            // Move pill slightly inward and lower to avoid occlusion
            pillMesh.position.set(x + (width/2) - (pillWidth/2) - 0.08, y + 0.05, 0.125);
            this.panels[panelName].group.add(pillMesh);
        }

        const collider = new THREE.Mesh(new THREE.BoxGeometry(width, btnHeight, btnDepth + 0.04), new THREE.MeshBasicMaterial({ visible: false }));
        collider.position.set(x, y, 0.1); 
        collider.name = id;
        collider.userData = { 
            callback, isInteractive: true, visualMesh, statusPill: pillMesh, 
            originalColor: 0x5b9bd5, hoverColor: 0x10b981, pressedColor: 0x059669, defaultZ: 0.1, pressedZ: 0.08 
        };
        
        this.panels[panelName].group.add(collider);
        this.interactiveElements.push(collider);
        this.panels[panelName].buttons[id] = collider;
        this.addTextToPanel(panelName, label, x, y, 0.09, 0.145);
    }

    addThumbnailButtonToPanel(panelName, texturePath, x, y, callback, parentOverride, label) {
        const size = 1.0; 
        const visualMesh = new THREE.Mesh(
            new RoundedBoxGeometry(size, size, 0.06, 4, 0.02),
            new THREE.MeshStandardMaterial({ map: this.textureLoader.load(texturePath), transparent: true, opacity: 1.0, metalness: 0.1, roughness: 0.5 })
        );
        visualMesh.position.set(x, y, 0.1);
        parentOverride.add(visualMesh);

        const collider = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.08), new THREE.MeshBasicMaterial({ visible: false }));
        collider.position.set(x, y, 0.1);
        collider.name = label;
        collider.userData = { callback, isInteractive: true, visualMesh, originalColor: 0xffffff, hoverColor: 0x5b9bd5, pressedColor: 0x10b981, defaultZ: 0.1, pressedZ: 0.08, isScrollable: true };
        parentOverride.add(collider);
        this.interactiveElements.push(collider);
    }

    setButtonStatus(id, isActive) {
        let button = null;
        Object.values(this.panels).forEach(p => { if (p.buttons[id]) button = p.buttons[id]; });
        if (!button || !button.userData.statusPill) return;

        const pill = button.userData.statusPill;
        if (isActive) {
            pill.material.color.setHex(0x10b981);
            pill.material.emissive.setHex(0x10b981);
            pill.material.emissiveIntensity = 0.8;
        } else {
            pill.material.color.setHex(0x2a2a2a);
            pill.material.emissive.setHex(0x000000);
            pill.material.emissiveIntensity = 0;
        }
    }

    update(camera) {
        const targetPos = new THREE.Vector3();
        camera.getWorldPosition(targetPos);
        const isIndivid = this.state.get('isIndividualBillboarding');
        if (isIndivid) {
            this.group.quaternion.set(0, 0, 0, 1);
            Object.values(this.panels).forEach(p => p.group.lookAt(targetPos));
        } else {
            const currentQuat = this.group.quaternion.clone();
            this.group.lookAt(targetPos);
            this.group.quaternion.slerp(currentQuat, 0.85); 
        }
    }

    handleHover(object, isHovering) {
        if (!object || !object.userData || !object.userData.isInteractive) return;
        const target = object.userData.visualMesh || object;
        if (isHovering) {
            if (target.material.map) target.scale.set(1.05, 1.05, 1.05);
            else target.material.color.setHex(object.userData.hoverColor);
        } else {
            target.scale.set(1, 1, 1);
            if (!target.material.map) target.material.color.setHex(object.userData.originalColor);
        }
    }

    handlePress(object, isPressed) {
        if (!object || !object.userData || !object.userData.isInteractive) return;
        const z = isPressed ? object.userData.pressedZ : object.userData.defaultZ;
        object.position.z = z;
        if (object.userData.visualMesh) object.userData.visualMesh.position.z = z;
    }

    handleScroll(panelName, delta) {
        const panel = this.panels[panelName];
        if (!panel || !panel.scrollGroup) return false;
        panel.scrollY += delta;
        panel.scrollY = Math.max(0, Math.min(panel.scrollY, panel.maxScroll || 0));
        panel.scrollGroup.position.y = panel.scrollY;
        return true;
    }
}

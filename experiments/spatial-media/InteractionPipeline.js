import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.168.0/examples/jsm/controls/OrbitControls.js';

export class InteractionPipeline {
    constructor(renderer, scene, camera, state) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.state = state;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.controls = null;
        
        this.draggedObject = null;
        this.dragOffset = new THREE.Vector3();
        this.dragPlane = new THREE.Plane();
        
        this.lastHoverTarget = null;
        this.lastHitPoint = null;
        this.lastHitNormal = null;
        this.isHoveringScrollable = false;

        this.initDesktopMode();
    }

    initDesktopMode() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 15;
        this.controls.mouseButtons = {
            LEFT: null,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE
        };
        this.controls.update();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const dom = this.renderer.domElement;
        
        dom.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        window.addEventListener('pointerup', () => this.handlePointerUp());
        
        window.addEventListener('wheel', (e) => {
            if (this.state.get('isXR') || !this.isHoveringScrollable) return;
            // Scroll logic handled by UI or State dispatch
            this.state.notify('scroll_event', e.deltaY * 0.002);
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
    }

    updatePointer(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    handlePointerDown(e) {
        if (this.state.get('isXR') || !this.controls) return;
        this.updatePointer(e);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const interactiveIntersect = intersects.find(hit => hit.object.userData && hit.object.userData.isInteractive);
            
            // 1. Diagnostic Metrology Call
            if (this.state.get('isInputTestMode')) {
                const hit = interactiveIntersect ? interactiveIntersect.object : intersects[0].object;
                this.state.notify('test_hit', { name: hit.name || hit.userData.label, intersect: interactiveIntersect });
            }

            // 2. Interactive UI Selection
            if (interactiveIntersect) {
                const object = interactiveIntersect.object;
                this.clickedObject = object;
                this.state.notify('ui_press', { object, pressed: true });
                if (object.userData.callback) object.userData.callback();
                return;
            }

            // 3. Object Dragging (Sky excluded)
            let object = intersects[0].object;
            if (object.name !== 'sky' && !object.isLight) {
                while (object.parent && object.parent !== this.scene) object = object.parent;
                this.draggedObject = object;
                this.controls.enabled = false;
                this.dragPlane.setFromNormalAndCoplanarPoint(
                    this.camera.getWorldDirection(new THREE.Vector3()).negate(),
                    this.draggedObject.position
                );
                const intersectionPoint = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
                this.dragOffset.copy(this.draggedObject.position).sub(intersectionPoint);
            }
        }
    }

    handlePointerMove(e) {
        if (this.state.get('isXR') || !this.controls) return;
        this.updatePointer(e);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.draggedObject) {
            const intersectionPoint = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
                this.draggedObject.position.copy(intersectionPoint.add(this.dragOffset));
            }
        } else {
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            const interactiveIntersect = intersects.find(hit => hit.object.userData && hit.object.userData.isInteractive);
            
            // Hit Data for Reticle
            if (intersects.length > 0) {
                this.lastHitPoint = intersects[0].point;
                this.lastHitNormal = intersects[0].face ? intersects[0].face.normal.clone().applyQuaternion(intersects[0].object.quaternion) : new THREE.Vector3(0,0,1);
            } else {
                this.lastHitPoint = null;
            }

            // Hover Logic
            const hitObject = interactiveIntersect?.object || null;
            if (this.lastHoverTarget !== hitObject) {
                if (this.lastHoverTarget) this.state.notify('ui_hover', { object: this.lastHoverTarget, hover: false });
                if (hitObject) this.state.notify('ui_hover', { object: hitObject, hover: true });
                this.lastHoverTarget = hitObject;
            }

            // Scroll Zoom Lock check
            this.isHoveringScrollable = false;
            let obj = hitObject;
            while(obj) {
                if (obj.userData && obj.userData.isScrollable) { this.isHoveringScrollable = true; break; }
                obj = obj.parent;
            }
            this.controls.enableZoom = !this.isHoveringScrollable;
        }
    }

    handlePointerUp() {
        if (this.draggedObject) {
            this.draggedObject = null;
            this.controls.enabled = true;
        }
        if (this.clickedObject) {
            this.state.notify('ui_press', { object: this.clickedObject, pressed: false });
            this.clickedObject = null;
        }
    }

    update() {
        if (this.controls) this.controls.update();
    }

    getHitData() {
        return { point: this.lastHitPoint, normal: this.lastHitNormal };
    }
}

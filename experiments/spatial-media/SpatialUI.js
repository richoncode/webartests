import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://unpkg.com/three@0.168.0/examples/jsm/geometries/RoundedBoxGeometry.js';

export class SpatialUI {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.group = new THREE.Group();
        this.init();
    }

    init() {
        // UI Panel: 2m x 1m, 5cm thick, with rounded corners (10cm radius)
        const geometry = new RoundedBoxGeometry(2, 1, 0.05, 10, 0.1);
        
        this.material = new THREE.MeshPhysicalMaterial({
            transmission: 0.95,
            thickness: 0.05,
            roughness: 0.1,
            metalness: 0,
            color: 0xffffff,
            ior: 1.5,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.group.add(this.mesh);
        
        this.group.position.set(0, 1.2, -4); // Base position
        this.scene.add(this.group);
    }

    update(camera) {
        if (this.mesh) {
            // Billboarding: Always face the camera or specific rotation logic
            // this.mesh.lookAt(camera.position);
        }
    }
}

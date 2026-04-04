import * as THREE from 'three';
import { SpatialMaterial } from './SpatialMaterial.js';

export class PhotoCard {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.width = options.width || 6;
        this.height = options.height || 4;
        this.imagePath = options.imagePath;
        this.depthPath = options.depthPath;
        
        this.mesh = null;
        this.init();
    }

    async init() {
        const textureLoader = new THREE.TextureLoader();
        
        // Load Image and Depth Map in parallel
        const [colorMap, depthMap] = await Promise.all([
            textureLoader.loadAsync(this.imagePath),
            textureLoader.loadAsync(this.depthPath)
        ]);

        colorMap.colorSpace = THREE.SRGBColorSpace;
        
        // High-segmentation plane for smooth displacement
        const geometry = new THREE.PlaneGeometry(this.width, this.height, 256, 256);
        
        this.material = new SpatialMaterial({
            map: colorMap,
            displacementMap: depthMap,
            displacementScale: 1.5, // How "deep" the diorama is
            featherRange: [0.95, 1.0]
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(0, 0, -5); // 5 meters in front
        
        this.scene.add(this.mesh);
        console.log('PhotoCard Initialized:', this.imagePath);
    }
}

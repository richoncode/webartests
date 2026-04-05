import * as THREE from 'three';
import { SpatialMaterial } from './SpatialMaterial.js';

export class PhotoCard {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this.width = options.width || 6;
        this.height = options.height || 4;
        this.imagePath = options.imagePath;
        this.depthPath = options.depthPath;
        this.metadata = {
            resolution: options.resolution || "4096 x 2731",
            depth: "32-bit Float",
            format: "Spatial-PNG"
        };
        
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
            displacementScale: this.options.displacementScale || 1.5, // How "deep" the diorama is
            featherRange: [0.95, 1.0],
            curvatureRadius: Math.abs(this.width / 2) * 2 // Default to twice width? Wait. 
            // Better to use a standard distance or pass it in.
        });
        
        // Use provided radius or default to 5.0 (the distance we place it at)
        if (this.options.curvatureRadius) {
            this.material.uniforms.uCurvatureRadius.value = this.options.curvatureRadius;
        } else {
            this.material.uniforms.uCurvatureRadius.value = 5.0; 
        }

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(0, 0, -5); // 5 meters in front
        
        this.scene.add(this.mesh);
    }

    async updateTexture(imagePath, depthPath) {
        const loader = new THREE.TextureLoader();
        
        try {
            const [colorTexture, depthTexture] = await Promise.all([
                new Promise((resolve, reject) => loader.load(imagePath, resolve, undefined, reject)),
                new Promise((resolve, reject) => loader.load(depthPath, resolve, undefined, reject))
            ]);

            colorTexture.colorSpace = THREE.SRGBColorSpace;
            
            // Clean up old textures to prevent memory leaks
            if (this.material.map) this.material.map.dispose();
            if (this.material.displacementMap) this.material.displacementMap.dispose();

            this.material.map = colorTexture;
            this.material.displacementMap = depthTexture;
            this.material.needsUpdate = true;
            
            console.log(`Gallery: Texture updated to ${imagePath}`);
        } catch (e) {
            console.error("Gallery: Failed to update texture:", e);
        }
    }

    remove() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (this.mesh.material.map) this.mesh.material.map.dispose();
                if (this.mesh.material.displacementMap) this.mesh.material.displacementMap.dispose();
                this.mesh.material.dispose();
            }
        }
    }

    update(options = {}) {
        if (options.displacementScale !== undefined && this.material) {
            this.material.uniforms.uDisplacementScale.value = options.displacementScale;
        }
        if (options.curvatureRadius !== undefined && this.material) {
            this.material.uniforms.uCurvatureRadius.value = options.curvatureRadius;
        }
        if (options.position !== undefined && this.mesh) {
            this.mesh.position.copy(options.position);
        }
    }
}

import * as THREE from 'three';

export class SpatialMaterial extends THREE.MeshStandardMaterial {
    constructor(parameters) {
        // Strip custom properties before super() to avoid Three.js warnings
        const { displacementScale = 1.0, featherRange = [0.95, 1.0], curvatureRadius = 5.0, ...rest } = parameters;
        super(rest);
        
        // Define persistent uniforms for the instance
        this.uniforms = {
            uDisplacementScale: { value: displacementScale },
            uFeatherRange: { value: new THREE.Vector2(...featherRange) },
            uCurvatureRadius: { value: parameters.curvatureRadius || 5.0 },
            uFoveaFactor: { value: 0.0 }
        };

        this.onBeforeCompile = (shader) => {
            // Link our persistent uniforms to the shader's internal uniform pool
            shader.uniforms.uDisplacementScale = this.uniforms.uDisplacementScale;
            shader.uniforms.uFeatherRange = this.uniforms.uFeatherRange;
            shader.uniforms.uCurvatureRadius = this.uniforms.uCurvatureRadius;
            shader.uniforms.uFoveaFactor = this.uniforms.uFoveaFactor;
            
            shader.vertexShader = `
                uniform float uDisplacementScale;
                uniform float uCurvatureRadius;
                uniform float uFoveaFactor;
                varying vec2 vUvOrigin;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vUvOrigin = uv;
                
                // 1. Apply Cylindrical Curvature
                float distToCenter = transformed.x;
                float zOffset = uCurvatureRadius - sqrt(max(0.001, uCurvatureRadius * uCurvatureRadius - distToCenter * distToCenter));
                transformed.z += zOffset;

                // 2. Apply Foveated Displacement
                float depthValue = texture2D(displacementMap, uv).r;
                
                // Calculate distance from center (0.0 center, ~0.7 corner)
                float d = distance(uv, vec2(0.5, 0.5));
                float foveaScale = 1.0 + (max(0.0, 0.5 - d) * uFoveaFactor * 2.0);
                
                transformed.z += depthValue * uDisplacementScale * foveaScale;
                `
            );

            shader.fragmentShader = `
                uniform vec2 uFeatherRange;
                varying vec2 vUvOrigin;
                ${shader.fragmentShader}
            `.replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>
                float edgeX = smoothstep(uFeatherRange.y, uFeatherRange.x, abs(vUvOrigin.x * 2.0 - 1.0));
                float edgeY = smoothstep(uFeatherRange.y, uFeatherRange.x, abs(vUvOrigin.y * 2.0 - 1.0));
                float alpha = edgeX * edgeY;
                gl_FragColor.a *= alpha;
                `
            );
        };
        
        this.transparent = true;
    }
}

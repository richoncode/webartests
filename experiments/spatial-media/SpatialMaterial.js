import * as THREE from 'three';

export class SpatialMaterial extends THREE.MeshStandardMaterial {
    constructor(parameters) {
        // Strip custom properties before super() to avoid Three.js warnings
        const { displacementScale = 1.0, featherRange = [0.95, 1.0], ...rest } = parameters;
        super(rest);
        
        // Define persistent uniforms for the instance
        this.uniforms = {
            uDisplacementScale: { value: displacementScale },
            uFeatherRange: { value: new THREE.Vector2(...featherRange) }
        };

        this.onBeforeCompile = (shader) => {
            // Link our persistent uniforms to the shader's internal uniform pool
            shader.uniforms.uDisplacementScale = this.uniforms.uDisplacementScale;
            shader.uniforms.uFeatherRange = this.uniforms.uFeatherRange;
            
            shader.vertexShader = `
                uniform float uDisplacementScale;
                varying vec2 vUvOrigin;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vUvOrigin = uv;
                float depthValue = texture2D(displacementMap, uv).r;
                transformed.z += depthValue * uDisplacementScale;
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

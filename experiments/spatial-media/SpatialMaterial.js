/**
 * SpatialMaterial.js
 * Custom Three.js material for depth-displaced spatial photos.
 * Implements vertex displacement and feathered edges via GLSL.
 */

export class SpatialMaterial extends THREE.MeshStandardMaterial {
    constructor(parameters) {
        super(parameters);
        
        this.onBeforeCompile = (shader) => {
            shader.uniforms.uDisplacementScale = { value: parameters.displacementScale || 1.0 };
            shader.uniforms.uFeatherRange = { value: parameters.featherRange || [0.95, 1.0] };
            
            shader.vertexShader = `
                uniform float uDisplacementScale;
                varying vec2 vUvOrigin;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vUvOrigin = uv;
                float depth = texture2D(displacementMap, uv).r;
                transformed.z += depth * uDisplacementScale;
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
                
                // Feathered Edge Calculation
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

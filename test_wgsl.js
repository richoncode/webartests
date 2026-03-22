const wgslCode = `
struct Uniforms {
    maxSteps: i32,
    epsilon: f32,
    _pad0: i32,
    _pad1: f32,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn sphereSDF(p: vec3<f32>, radius: f32) -> f32 { return length(p) - radius; }

@vertex
fn vsMain(@builtin(vertex_index) vertexID: u32) -> @builtin(position) vec4<f32> {
    let uv = vec2<f32>(f32((vertexID << 1u) & 2u), f32(vertexID & 2u));
    return vec4<f32>(uv * 2.0 - 1.0, 0.0, 1.0);
}

@fragment
fn fsMain(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = (fragCoord.xy - vec2<f32>(256.0, 256.0)) / 256.0;
    
    // DEBUG RED BACKGROUND check:
    // return vec4<f32>(uv.x + 0.5, uv.y + 0.5, 0.0, 1.0);
    
    let ro = vec3<f32>(0.0, 0.0, -3.0);
    let rd = normalize(vec3<f32>(uv, 1.0));
    var t = 0.0;
    for(var i: i32 = 0; i < 100; i++) {
        let p = ro + rd * t;
        let d = sphereSDF(p, 1.0);
        if(d < 0.001) { return vec4<f32>(1.0, 0.0, 0.0, 1.0); }
        t += d;
    }
    return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}
`;

console.log("Mock WGSL compiler check passed.");

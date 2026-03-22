const fs = require('fs');

const modules = [
    {
        file: '02-volume-integration.html',
        sliderId: 'slider-opacity',
        sliderHtml: '<input id="slider-opacity" type="range" min="0.1" max="10.0" step="0.1" value="2.0">',
        sliderOld: '<input type="range" min="0.1" max="10.0" step="0.1" value="2.0">',
        uniformType: 'float', wgslUniformType: 'opacity: f32',
        jsWrite: `dv.setFloat32(0, parseFloat(document.getElementById('slider-opacity').value), true);`,
        color: '0.1, 0.8, 0.3',
        fragmentLogic: `
    float dist = length(in.uv);
    float glow = 0.1 / (dist + 0.01) * uniforms.opacity;
    return float4(float3(COLOR) * glow, 1.0);`,
        wgslFragmentLogic: `
    let dist = length(in.uv);
    let glow = 0.1 / (dist + 0.01) * uniforms.opacity;
    return vec4<f32>(vec3<f32>(COLOR) * glow, 1.0);`
    },
    {
        file: '03-neural-fields.html',
        sliderId: 'slider-bands',
        sliderHtml: '<input id="slider-bands" type="range" min="0" max="10" step="1" value="6">',
        sliderOld: '<input type="range" min="0" max="10" step="1" value="6">',
        uniformType: 'int', wgslUniformType: 'bands: i32',
        jsWrite: `dv.setInt32(0, parseInt(document.getElementById('slider-bands').value), true);`,
        color: '0.8, 0.1, 0.8',
        fragmentLogic: `
    float dist = length(in.uv);
    float pe = sin(dist * 10.0 * pow(1.5, float(uniforms.opacity))); // Using uniform mapped as 'opacity' variable name
    float glow = 0.1 / (abs(pe) + 0.05);
    return float4(float3(COLOR) * glow, 1.0);`,
        wgslFragmentLogic: `
    let dist = length(in.uv);
    let pe = sin(dist * 10.0 * pow(1.5, f32(uniforms.opacity)));
    let glow = 0.1 / (abs(pe) + 0.05);
    return vec4<f32>(vec3<f32>(COLOR) * glow, 1.0);`
    },
    {
        file: '04-autodiff-optimization.html',
        sliderId: 'slider-lr',
        sliderHtml: '<input id="slider-lr" type="range" min="0.001" max="0.1" step="0.001" value="0.01">',
        sliderOld: '<input type="range" min="0.001" max="0.1" step="0.001" value="0.01">',
        uniformType: 'float', wgslUniformType: 'opacity: f32',
        jsWrite: `dv.setFloat32(0, parseFloat(document.getElementById('slider-lr').value), true);`,
        color: '0.9, 0.5, 0.1',
        fragmentLogic: `
    float dist = length(in.uv);
    float pulse = sin(dist * 20.0 - uniforms.opacity * 100.0);
    float glow = 0.1 / (abs(pulse) + 0.1);
    return float4(float3(COLOR) * glow, 1.0);`,
        wgslFragmentLogic: `
    let dist = length(in.uv);
    let pulse = sin(dist * 20.0 - uniforms.opacity * 100.0);
    let glow = 0.1 / (abs(pulse) + 0.1);
    return vec4<f32>(vec3<f32>(COLOR) * glow, 1.0);`
    },
    {
        file: '05-gaussian-splatting.html',
        sliderId: 'slider-scale',
        sliderHtml: '<input id="slider-scale" type="range" min="0.1" max="5.0" step="0.1" value="1.0">',
        sliderOld: '<input type="range" min="0.1" max="5.0" step="0.1" value="1.0">',
        uniformType: 'float', wgslUniformType: 'opacity: f32',
        jsWrite: `dv.setFloat32(0, parseFloat(document.getElementById('slider-scale').value), true);`,
        color: '0.9, 0.9, 0.5',
        fragmentLogic: `
    float dist = length(in.uv) / max(0.01, uniforms.opacity);
    float splat = exp(-dist * dist * 10.0);
    return float4(float3(COLOR) * splat, 1.0);`,
        wgslFragmentLogic: `
    let dist = length(in.uv) / max(0.01, uniforms.opacity);
    let splat = exp(-dist * dist * 10.0);
    return vec4<f32>(vec3<f32>(COLOR) * splat, 1.0);`
    }
];

for (const mod of modules) {
    const filePath = `learning-neural-rendering/modules/${mod.file}`;
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure slider has ID (fallbacks)
    if (!content.includes(`id="${mod.sliderId}"`)) {
        content = content.replace(mod.sliderOld, mod.sliderHtml);
    }

    const slang = `<!--
struct VertexOutput {
    float4 pos : SV_Position;
    float2 uv : TEXCOORD0;
};

struct Uniforms {
    ${mod.uniformType} opacity; // Generalized uniform name for simpler templating
    float _pad0; float _pad1; float _pad2;
};

cbuffer GlobalUniforms : register(b0) { Uniforms uniforms; }

[shader("vertex")]
VertexOutput vsMain(uint vertexID : SV_VertexID) {
    VertexOutput out;
    float2 uv = float2((vertexID << 1) & 2, vertexID & 2);
    out.pos = float4(uv * 2.0 - 1.0, 0.0, 1.0);
    out.uv = out.pos.xy;
    return out;
}

[shader("fragment")]
float4 fsMain(VertexOutput in) : SV_Target {
${mod.fragmentLogic.replace(/COLOR/g, mod.color)}
}
-->`;

    const wgsl = `<!--
struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

struct Uniforms {
    opacity: ${mod.uniformType === 'int' ? 'i32' : 'f32'},
    _pad0: f32, _pad1: f32, _pad2: f32,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vsMain(@builtin(vertex_index) vertexID: u32) -> VertexOutput {
    var out: VertexOutput;
    let uv = vec2<f32>(f32((vertexID << 1u) & 2u), f32(vertexID & 2u));
    out.pos = vec4<f32>(uv * 2.0 - 1.0, 0.0, 1.0);
    out.uv = out.pos.xy;
    return out;
}

@fragment
fn fsMain(in: VertexOutput) -> @location(0) vec4<f32> {
${mod.wgslFragmentLogic.replace(/COLOR/g, mod.color)}
}
-->`;

    const jsCode = `<!--
class ModuleRenderer {
    constructor(device, context, wgslCode) {
        this.device = device;
        this.context = context;
        this.shaderModule = device.createShaderModule({ code: wgslCode });
        this.uniformBuffer = device.createBuffer({
            size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: { module: this.shaderModule, entryPoint: 'vsMain' },
            fragment: {
                module: this.shaderModule,
                entryPoint: 'fsMain',
                targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
            },
            primitive: { topology: 'triangle-list' }
        });
        this.bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
        });
    }

    render() {
        const uData = new ArrayBuffer(16);
        const dv = new DataView(uData);
        ${mod.jsWrite}
        this.device.queue.writeBuffer(this.uniformBuffer, 0, new Uint8Array(uData));

        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: 'clear', storeOp: 'store',
                clearValue: { r: 0.05, g: 0.05, b: 0.05, a: 1.0 }
            }]
        });
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.draw(3, 1, 0, 0);
        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}
window.ModuleRenderer = ModuleRenderer;
-->`;

    content = content.replace(/<div data-tab="Slang Shader"[\\s\\S]*?-->\\s*<\/div>/,
        '<div data-tab="Slang Shader" data-lang="cpp" class="active">' + slang + '</div>');

    content = content.replace(/<div data-tab="Compiled WGSL"[\\s\\S]*?-->\\s*<\/div>/,
        '<div data-tab="Compiled WGSL" data-lang="rust">' + wgsl + '</div>');

    content = content.replace(/<div data-tab="WebGPU Wrapper"[\\s\\S]*?-->\\s*<\/div>/,
        '<div data-tab="WebGPU Wrapper" data-lang="javascript">' + jsCode + '</div>');

    fs.writeFileSync(filePath, content, 'utf8');
}

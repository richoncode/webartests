const fs = require('fs');

const modules = [
    { file: '02-volume-integration.html', color: '0.1, 0.8, 0.3' },
    { file: '03-neural-fields.html', color: '0.8, 0.1, 0.8' },
    { file: '04-autodiff-optimization.html', color: '0.9, 0.5, 0.1' },
    { file: '05-gaussian-splatting.html', color: '0.9, 0.9, 0.5' }
];

for (const mod of modules) {
    const filePath = `learning-neural-rendering/modules/${mod.file}`;
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace Slang tab
    content = content.replace(
/<!--\s*\/\/ Write your shader here\s*-->/g,
`<!--
struct VertexOutput {
    float4 pos : SV_Position;
    float2 uv : TEXCOORD0;
};

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
    float dist = length(in.uv);
    float glow = 0.1 / (dist + 0.01);
    return float4(float3(${mod.color}) * glow, 1.0);
}
-->`
    );

    // Replace WGSL tab
    content = content.replace(
/<!--\s*\/\/ Compiled WGSL Output\s*-->/g,
`<!--
struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

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
    let dist = length(in.uv);
    let glow = 0.1 / (dist + 0.01);
    return vec4<f32>(vec3<f32>(${mod.color}) * glow, 1.0);
}
-->`
    );

    // Replace JS tab
    content = content.replace(
/<!--\s*\/\/ JavaScript bindings config will appear here\s*-->/g,
`<!--
class ModuleRenderer {
    constructor(device, context, wgslCode) {
        this.device = device;
        this.context = context;
        this.shaderModule = device.createShaderModule({ code: wgslCode });
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
    }

    render() {
        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: 'clear', storeOp: 'store',
                clearValue: { r: 0.05, g: 0.05, b: 0.05, a: 1.0 }
            }]
        });
        pass.setPipeline(this.pipeline);
        pass.draw(3, 1, 0, 0);
        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}
window.ModuleRenderer = ModuleRenderer;
-->`
    );

    // Replace script tag execution binding
    content = content.replace(
/document\.getElementById\('btn-compile'\)\.onclick\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*;/g,
`document.getElementById('btn-compile').onclick = () => {
                if (editor && editor.editor && viewport && viewport.device) {
                    viewport.device.onuncapturederror = (event) => {
                        console.error(event.error);
                        alert("WebGPU Pipeline Error:\\n" + event.error.message);
                    };
                    
                    let wgslCode = "", jsCode = "";
                    const tabs = editor.tabs || [];
                    tabs.forEach(t => {
                        if(t.name === "Compiled WGSL") wgslCode = t.content.trim();
                        if(t.name === "WebGPU Wrapper") jsCode = t.content.trim();
                    });
                    
                    try {
                        const script = document.createElement('script');
                        script.textContent = jsCode;
                        document.body.appendChild(script);
                        
                        setTimeout(() => {
                            if (window.ModuleRenderer) {
                                window.engineInstance = new window.ModuleRenderer(viewport.device, viewport.context, wgslCode);
                                viewport.drawFrame = () => {
                                    if(window.engineInstance) window.engineInstance.render();
                                };
                                viewport.play();
                            }
                        }, 50);
                    } catch(err) {
                        alert("JS Evaluation Error:\\n" + err.message);
                    }
                }
            };`);

    fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Successfully patched all modules');

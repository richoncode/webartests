// assets/js/tutorial-engine.js

class SlangEditor extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
    }

    async connectedCallback() {
        if (this.editor) return; // Prevent double init

        this.tabs = [];
        this.activeTabIndex = 0;

        const tabElements = this.querySelectorAll('div[data-tab]');
        if (tabElements.length > 0) {
            tabElements.forEach(el => {
                let code = el.innerHTML.trim();
                if (code.startsWith('<!--')) {
                    code = code.replace(/^<!--|-->$/g, '').trim();
                }
                this.tabs.push({
                    name: el.getAttribute('data-tab'),
                    language: el.getAttribute('data-lang') || 'cpp',
                    content: code
                });
            });
        } else {
            let initialCode = this.innerHTML.trim();
            if (initialCode.startsWith('<!--')) {
                initialCode = initialCode.replace(/^<!--|-->$/g, '').trim();
            }
            this.tabs.push({
                name: 'Slang Shader',
                language: 'cpp',
                content: initialCode
            });
        }

        this.innerHTML = '';
        this.style.display = 'flex';
        this.style.flexDirection = 'column';
        this.style.width = '100%';
        this.style.height = '100%';
        this.style.position = 'relative';

        const tabBar = document.createElement('div');
        tabBar.className = 'editor-tabs';
        tabBar.style.display = 'flex';
        tabBar.style.background = '#1a1a1a';
        tabBar.style.borderBottom = '1px solid #2a2a2a';

        this.tabs.forEach((tab, index) => {
            const btn = document.createElement('button');
            btn.innerText = tab.name;
            btn.style.padding = '8px 16px';
            btn.style.background = index === this.activeTabIndex ? '#111' : 'transparent';
            btn.style.border = 'none';
            btn.style.borderRight = '1px solid #2a2a2a';
            btn.style.borderTop = index === this.activeTabIndex ? '2px solid #5b9bd5' : '2px solid transparent';
            btn.style.color = index === this.activeTabIndex ? '#fff' : '#888';
            btn.style.fontSize = '11px';
            btn.style.fontWeight = '700';
            btn.style.textTransform = 'uppercase';
            btn.style.cursor = 'pointer';
            btn.style.outline = 'none';
            btn.onclick = () => this.switchTab(index);
            tab.button = btn;
            tabBar.appendChild(btn);
        });

        const editorContainer = document.createElement('div');
        editorContainer.style.flex = '1';
        editorContainer.style.position = 'relative';

        this.appendChild(tabBar);
        this.appendChild(editorContainer);

        await SlangEditor.loadMonaco();

        this.editor = monaco.editor.create(editorContainer, {
            value: this.tabs[0].content,
            language: this.tabs[0].language,
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 }
        });

        this.editor.onDidChangeModelContent(() => {
            if (this.tabs[this.activeTabIndex]) {
                this.tabs[this.activeTabIndex].content = this.editor.getValue();
            }
        });
    }

    switchTab(index) {
        if (index === this.activeTabIndex) return;

        this.tabs[this.activeTabIndex].button.style.background = 'transparent';
        this.tabs[this.activeTabIndex].button.style.borderTop = '2px solid transparent';
        this.tabs[this.activeTabIndex].button.style.color = '#888';

        this.activeTabIndex = index;

        this.tabs[index].button.style.background = '#111';
        this.tabs[index].button.style.borderTop = '2px solid #5b9bd5';
        this.tabs[index].button.style.color = '#fff';

        const model = this.editor.getModel();
        monaco.editor.setModelLanguage(model, this.tabs[index].language);
        this.editor.setValue(this.tabs[index].content);

        setTimeout(() => this.editor.layout(), 0);
    }

    static async loadMonaco() {
        if (window.monaco) return Promise.resolve();
        if (this.monacoPromise) return this.monacoPromise;

        this.monacoPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js';
            script.onload = () => {
                require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' } });
                require(['vs/editor/editor.main'], () => {
                    resolve();
                });
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });

        return this.monacoPromise;
    }
}

customElements.define('slang-editor', SlangEditor);

class SlangViewport extends HTMLElement {
    constructor() {
        super();
        this.canvas = null;
        this.playing = false;
        this.device = null;
        this.context = null;
    }

    async connectedCallback() {
        if (this.canvas) return; // Prevent double init

        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = '100%';

        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.borderRadius = 'inherit';
        this.appendChild(this.canvas);

        await this.initWebGPU();
    }

    async initWebGPU() {
        if (!navigator.gpu) {
            console.error("WebGPU not supported on this browser.");
            const ctx = this.canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#222';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.fillStyle = '#f0a040';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText("WebGPU not supported", this.canvas.width / 2, this.canvas.height / 2);
            }
            return;
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) throw new Error("No WebGPU adapter found.");

            this.device = await adapter.requestDevice();
            this.context = this.canvas.getContext('webgpu');
            const format = navigator.gpu.getPreferredCanvasFormat();

            this.context.configure({
                device: this.device,
                format,
                alphaMode: 'premultiplied',
            });

            this.drawFrame(); // Initial static frame

        } catch (e) {
            console.error("WebGPU init failed", e);
        }
    }

    compile(shaderCode) {
        console.log("Compiling Slang Shader:\n", shaderCode);
        // TODO: Bridge with slang-compiler.wasm here
        // For now, this is a simulated stub.
    }

    play() {
        if (this.playing) return;
        this.playing = true;
        this.renderLoop();
    }

    pause() {
        this.playing = false;
    }

    requestRender() {
        if (!this.playing && this.device) {
            // Visualize slider activity by ticking the global time offset
            this.drawFrame();
        }
    }

    renderLoop() {
        if (!this.playing) return;
        this.drawFrame();
        requestAnimationFrame(() => this.renderLoop());
    }

    drawFrame() {
        if (!this.device || !this.context) return;

        // Dummy render pass to simulate changing activity
        // In reality, this dispatches compute / fragment pipelines
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        // Modulate color slightly if playing to show render loop activity
        let gValue = 0.08;
        if (this.playing) {
            gValue = 0.08 + (Math.sin(performance.now() / 200) * 0.05);
        }

        const renderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.08, g: gValue, b: 0.08, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}

customElements.define('slang-viewport', SlangViewport);

class SlangPlaybackControls extends HTMLElement {
    constructor() {
        super();
        this.compiled = false;
        
        this.style.display = 'flex';
        this.style.gap = '8px';
        this.style.width = '100%';
        
        this.btnAnimate = document.createElement('button');
        this.btnAnimate.innerText = 'Animate';
        this.btnAnimate.className = 'playback-btn';
        this.btnAnimate.style.flex = '2';
        this.btnAnimate.style.background = '#1e2d40';
        this.btnAnimate.style.border = '1px solid #5b9bd5';
        this.btnAnimate.style.color = '#5b9bd5';
        
        this.btnStep = document.createElement('button');
        this.btnStep.innerText = 'Step';
        this.btnStep.className = 'playback-btn';
        this.btnStep.style.flex = '1';
        this.btnStep.style.background = '#2a2a2a';
        this.btnStep.style.border = '1px solid #444';
        this.btnStep.style.color = '#fff';

        this.btnRestart = document.createElement('button');
        this.btnRestart.innerText = 'Restart';
        this.btnRestart.className = 'playback-btn';
        this.btnRestart.style.flex = '1';
        this.btnRestart.style.background = '#2a2a2a';
        this.btnRestart.style.border = '1px solid #444';
        this.btnRestart.style.color = '#fff';

        const style = document.createElement('style');
        style.textContent = `
            .playback-btn { padding: 8px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
            .playback-btn:hover { filter: brightness(1.2); }
        `;
        
        this.appendChild(style);
        this.appendChild(this.btnAnimate);
        this.appendChild(this.btnStep);
        this.appendChild(this.btnRestart);
        
        this.btnAnimate.addEventListener('click', () => this.handleAnimate());
        this.btnStep.addEventListener('click', () => this.handleStep());
        this.btnRestart.addEventListener('click', () => this.handleRestart());
    }

    getViewport() { return document.querySelector('slang-viewport'); }
    getEditor() { return document.querySelector('slang-editor'); }

    compileIfNeeded() {
        if (this.compiled) return true;
        const editor = this.getEditor();
        const viewport = this.getViewport();
        
        if (!editor || !viewport || !viewport.device) {
            console.warn("Editor or Viewport not ready.");
            return false;
        }

        viewport.device.onuncapturederror = (event) => {
            console.error(event.error);
            window.showErrorModal("WebGPU Pipeline Error:\\n" + event.error.message);
        };

        let wgslCode = "", jsCode = "";
        const tabs = editor.tabs || [];
        tabs.forEach(t => {
            if (t.name === "Compiled WGSL") wgslCode = t.content.trim();
            if (t.name === "WebGPU Wrapper" || t.name === "JavaScript Wrapper") jsCode = t.content.trim();
        });

        try {
            const script = document.createElement('script');
            script.textContent = jsCode;
            document.body.appendChild(script);

            setTimeout(() => {
                if (window.ModuleRenderer) {
                    window.engineInstance = new window.ModuleRenderer(viewport.device, viewport.context, wgslCode);
                    viewport.drawFrame = () => {
                        if (window.engineInstance) window.engineInstance.render();
                    };
                    this.compiled = true;
                    viewport.drawFrame();
                    if (this.wantsPlay) viewport.play();
                }
            }, 50);
            return false;
        } catch (err) {
            window.showErrorModal("JS Evaluation Error:\\n" + err.message);
            return false;
        }
    }

    handleAnimate() {
        const viewport = this.getViewport();
        if (!this.compiled) {
            this.wantsPlay = true;
            this.compileIfNeeded();
            this.btnAnimate.innerText = 'Pause';
            this.btnAnimate.style.background = '#2a2a2a';
            this.btnAnimate.style.color = '#fff';
            this.btnAnimate.style.borderColor = '#444';
        } else {
            if (viewport.playing) {
                viewport.pause();
                this.btnAnimate.innerText = 'Animate';
                this.btnAnimate.style.background = '#1e2d40';
                this.btnAnimate.style.color = '#5b9bd5';
                this.btnAnimate.style.borderColor = '#5b9bd5';
            } else {
                viewport.play();
                this.btnAnimate.innerText = 'Pause';
                this.btnAnimate.style.background = '#2a2a2a';
                this.btnAnimate.style.color = '#fff';
                this.btnAnimate.style.borderColor = '#444';
            }
        }
    }

    handleStep() {
        const viewport = this.getViewport();
        if (viewport && viewport.playing) this.handleAnimate(); 
        
        if (!this.compiled) {
            this.compileIfNeeded();
        } else {
            if (viewport) viewport.drawFrame();
        }
    }

    handleRestart() {
        const viewport = this.getViewport();
        const editor = this.getEditor();
        if (!viewport || !editor || !window.ModuleRenderer) return;
        
        let wgslCode = "";
        const tabs = editor.tabs || [];
        tabs.forEach(t => {
            if (t.name === "Compiled WGSL") wgslCode = t.content.trim();
        });
        
        window.engineInstance = new window.ModuleRenderer(viewport.device, viewport.context, wgslCode);
        viewport.drawFrame();
        
        if (viewport.playing) this.handleAnimate();
    }
}
customElements.define('slang-playback-controls', SlangPlaybackControls);

window.showErrorModal = function(message) {
    document.querySelectorAll('slang-viewport').forEach(v => v.pause());

    if (document.getElementById('error-modal-overlay')) {
        return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'error-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const modal = document.createElement('div');
    modal.style.background = '#1a1a1a';
    modal.style.border = '1px solid #e74c3c';
    modal.style.borderRadius = '8px';
    modal.style.padding = '24px';
    modal.style.maxWidth = '600px';
    modal.style.width = '90%';
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    modal.style.color = '#fff';
    modal.style.fontFamily = "system-ui, sans-serif";

    const title = document.createElement('h3');
    title.innerText = 'Error';
    title.style.color = '#e74c3c';
    title.style.marginTop = '0';

    const pre = document.createElement('pre');
    pre.innerText = message;
    pre.style.background = '#0d0d0d';
    pre.style.padding = '12px';
    pre.style.borderRadius = '4px';
    pre.style.overflowX = 'auto';
    pre.style.fontSize = '13px';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-all';

    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.justifyContent = 'flex-end';
    buttons.style.gap = '12px';
    buttons.style.marginTop = '16px';

    const copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy';
    copyBtn.style.padding = '8px 16px';
    copyBtn.style.background = '#2a2a2a';
    copyBtn.style.border = '1px solid #444';
    copyBtn.style.color = '#fff';
    copyBtn.style.borderRadius = '4px';
    copyBtn.style.cursor = 'pointer';
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(message);
        copyBtn.innerText = 'Copied!';
        setTimeout(() => copyBtn.innerText = 'Copy', 2000);
    };

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Close';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.background = '#e74c3c';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => overlay.remove();

    buttons.appendChild(copyBtn);
    buttons.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(pre);
    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
};

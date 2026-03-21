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

    updateCanvasSize() {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor(this.canvas.clientWidth * dpr);
        const height = Math.floor(this.canvas.clientHeight * dpr);

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    drawFrame() {
        if (!this.device || !this.context) return;
        this.updateCanvasSize();

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
            if (window.showErrorModal) window.showErrorModal("WebGPU Pipeline Error:\n" + event.error.message);
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
                        viewport.updateCanvasSize();
                        if (window.engineInstance) window.engineInstance.render();
                    };
                    this.compiled = true;
                    viewport.drawFrame();
                }
            }, 100);
            return true;
        } catch (err) {
            if (window.showErrorModal) window.showErrorModal("JS Evaluation Error:\n" + err.message);
            console.error(err);
            return false;
        }
    }

    handleAnimate() {
        if (!this.compileIfNeeded()) return;
        const viewport = this.getViewport();
        if (!viewport) return;

        if (viewport.playing) {
            viewport.pause();
            this.btnAnimate.innerText = 'Animate';
            this.btnAnimate.style.background = '#1e2d40';
        } else {
            viewport.play();
            this.btnAnimate.innerText = 'Pause';
            this.btnAnimate.style.background = '#401e1e';
            this.btnAnimate.style.borderColor = '#d55b5b';
            this.btnAnimate.style.color = '#d55b5b';
        }
    }

    handleStep() {
        if (!this.compileIfNeeded()) return;
        const viewport = this.getViewport();
        if (viewport) {
            viewport.pause();
            this.btnAnimate.innerText = 'Animate';
            this.btnAnimate.style.background = '#1e2d40';
            viewport.drawFrame();
        }
    }

    handleRestart() {
        const viewport = this.getViewport();
        const editor = this.getEditor();
        if (viewport) {
            viewport.pause();
            this.btnAnimate.innerText = 'Animate';
            this.btnAnimate.style.background = '#1e2d40';
            this.compiled = false;
            this.compileIfNeeded();
        }
    }
}

customElements.define('slang-playback-controls', SlangPlaybackControls);

window.showErrorModal = (msg) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100%'; overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
    overlay.style.padding = '40px';

    const modal = document.createElement('div');
    modal.style.background = '#1a1a1a';
    modal.style.border = '1px solid #f87171';
    modal.style.borderRadius = '12px';
    modal.style.padding = '24px';
    modal.style.maxWidth = '800px';
    modal.style.width = '100%';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';

    const title = document.createElement('h2');
    title.innerText = 'Pipeline Compilation Error';
    title.style.color = '#f87171';
    title.style.marginTop = '0';
    title.style.marginBottom = '16px';
    title.style.fontSize = '18px';

    const pre = document.createElement('pre');
    pre.innerText = msg;
    pre.style.background = '#000';
    pre.style.padding = '16px';
    pre.style.borderRadius = '8px';
    pre.style.color = '#eee';
    pre.style.fontSize = '12px';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.fontFamily = 'monospace';

    const buttons = document.createElement('div');
    buttons.style.marginTop = '24px';
    buttons.style.display = 'flex';
    buttons.style.justifyContent = 'flex-end';
    buttons.style.gap = '12px';

    const copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy Error';
    copyBtn.style.padding = '8px 16px';
    copyBtn.style.borderRadius = '6px';
    copyBtn.style.border = '1px solid #444';
    copyBtn.style.background = '#2a2a2a';
    copyBtn.style.color = '#fff';
    copyBtn.style.cursor = 'pointer';
    copyBtn.onclick = () => navigator.clipboard.writeText(msg);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Dismiss';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = '#f87171';
    closeBtn.style.color = '#fff';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => document.body.removeChild(overlay);

    buttons.appendChild(copyBtn);
    buttons.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(pre);
    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
};

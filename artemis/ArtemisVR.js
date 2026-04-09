import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';

export class ArtemisVR {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a); // Dark gray instead of pure black
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0); // Reset camera to origin for VR

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); // Set alpha false for solid background
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.plane = null;
        this.material = null;
        this.active = false;

        this.initLights();
        this.setupResize();
        this.updateVRButton(); 
    }

    initLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    }

    setupResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async updateVRButton() {
        if (document.getElementById('vr-button')) return;

        const btn = document.createElement('button');
        btn.id = 'vr-button';
        btn.style.position = 'absolute';
        btn.style.bottom = '40px';
        btn.style.left = '50%';
        btn.style.transform = 'translateX(-50%)';
        btn.style.padding = '12px 24px';
        btn.style.border = '1px solid #444';
        btn.style.borderRadius = '8px';
        btn.style.background = '#1a1a1a';
        btn.style.color = '#888';
        btn.style.cursor = 'help';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = 'bold';
        btn.style.letterSpacing = '1px';
        btn.style.zIndex = '2002';
        btn.textContent = 'VR NOT DETECTED';
        btn.title = 'Please use a WebXR-compatible headset (Meta Quest 3, Vision Pro) to experience spatial depth.';

        this.container.appendChild(btn);

        // Check for WebXR support asynchronously
        if (navigator.xr) {
            const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
            if (isVRSupported) {
                btn.textContent = 'ENTER VR';
                btn.style.color = '#5b9bd5';
                btn.style.borderColor = '#5b9bd5';
                btn.style.cursor = 'pointer';
                btn.title = 'Enter immersive VR mode';

                // Import Three's VRButton logic but keep our custom styling
                import('https://unpkg.com/three@0.168.0/examples/jsm/webxr/VRButton.js').then((module) => {
                    const threeBtn = module.VRButton.createButton(this.renderer);
                    threeBtn.style.display = 'none';
                    this.container.appendChild(threeBtn);
                    btn.onclick = () => threeBtn.click();
                });
            }
        }
    }

    async start(id) {
        this.active = true;
        
        // Load textures
        const loader = new THREE.TextureLoader();
        try {
            const [tex, depth] = await Promise.all([
                loader.loadAsync(`images/${id}.jpg`),
                loader.loadAsync(`depth/${id}.png`)
            ]);

            if (this.plane) this.scene.remove(this.plane);

            const aspect = 1.5; 
            const geometry = new THREE.PlaneGeometry(aspect * 2, 2, 512, 512);
            
            this.material = new THREE.ShaderMaterial({
                uniforms: {
                    uImage: { value: tex },
                    uDepth: { value: depth },
                    uDisplacement: { value: 0.25 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    uniform sampler2D uDepth;
                    uniform float uDisplacement;
                    void main() {
                        vUv = uv;
                        vec4 depthData = texture2D(uDepth, uv);
                        float z = depthData.r * uDisplacement;
                        vec3 pos = position;
                        pos.z += z;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    uniform sampler2D uImage;
                    void main() {
                        gl_FragColor = texture2D(uImage, vUv);
                    }
                `,
                side: THREE.DoubleSide
            });

            this.plane = new THREE.Mesh(geometry, this.material);
            this.plane.position.set(0, 1.4, -2.5); // Position 2.5m away and at eye level
            this.scene.add(this.plane);

            this.renderer.setAnimationLoop((time) => this.render(time));
        } catch (err) {
            console.error('Failed to load VR assets:', err);
        }
    }

    stop() {
        this.active = false;
        this.renderer.setAnimationLoop(null);
        if (this.renderer.xr.isPresenting) {
            this.renderer.xr.getSession().then(session => session.end());
        }
    }

    render(time) {
        if (!this.active) return;
        
        if (this.plane) {
            if (!this.renderer.xr.isPresenting) {
                // Desktop preview
                this.plane.rotation.y = Math.sin(time / 2000) * 0.1;
                this.plane.rotation.x = Math.cos(time / 3000) * 0.05;
                this.camera.position.z = 2.5;
                this.plane.position.y = 0;
            } else {
                // VR mode: Keep it stable and slightly above ground
                this.plane.rotation.y = 0;
                this.plane.rotation.x = 0;
                this.plane.position.y = 1.4;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

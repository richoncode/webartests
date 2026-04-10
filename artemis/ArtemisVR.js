import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';

export class ArtemisVR {
    constructor(container, imageIds = []) {
        this.container = container;
        this.imageIds = imageIds;
        this.currentIndex = 0;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.plane = null;
        this.material = null;
        this.active = false;
        this.displacement = 0.6;
        this.depthOffset = 0.8; // Set default to 0.8
        
        // Raycaster for interactions
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.navButtons = [];
        this.depthDisplay = null;
        this.controllers = [];

        this.initLights();
        this.setupResize();
        this.setupInteractions();
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

    setupInteractions() {
        // Desktop Click
        window.addEventListener('click', (e) => {
            if (!this.active) return;
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.checkIntersection(this.camera);
        });

        // VR Controllers
        const onSelect = (event) => {
            const controller = event.target;
            this.raycaster.set(controller.position, new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion));
            this.checkIntersection();
        };

        const buildController = (index) => {
            const controller = this.renderer.xr.getController(index);
            controller.addEventListener('select', onSelect);
            this.scene.add(controller);

            // Visual Ray
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]);
            const material = new THREE.LineBasicMaterial({ color: 0x5b9bd5, transparent: true, opacity: 0.5 });
            const line = new THREE.Line(geometry, material);
            line.name = 'line';
            controller.add(line);

            return controller;
        };

        this.controllers.push(buildController(0));
        this.controllers.push(buildController(1));
    }

    checkIntersection(customCamera = null) {
        if (customCamera) {
            this.raycaster.setFromCamera(this.mouse, customCamera);
        }
        
        const intersects = this.raycaster.intersectObjects(this.navButtons);
        if (intersects.length > 0) {
            const btn = intersects[0].object;
            if (btn.userData.action === 'prev') this.prev();
            else if (btn.userData.action === 'next') this.next();
            else if (btn.userData.action === 'depth-inc') this.adjustDepth(0.05);
            else if (btn.userData.action === 'depth-dec') this.adjustDepth(-0.05);
        }
    }

    adjustDepth(delta) {
        this.displacement = Math.max(0.05, Math.min(2.0, this.displacement + delta));
        if (this.material) {
            this.material.uniforms.uDisplacement.value = this.displacement;
        }
        this.updateDepthDisplay();
    }

    updateDepthDisplay() {
        if (!this.depthDisplay) return;
        const canvas = this.depthDisplay.material.map.image;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#5b9bd5';
        ctx.font = 'bold 44px SF Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.displacement.toFixed(2), 64, 64);
        this.depthDisplay.material.map.needsUpdate = true;
    }

    updateHoverStates() {
        this.navButtons.forEach(btn => btn.scale.setScalar(1.0));

        if (!this.active) return;

        const checkRay = (origin, direction) => {
            this.raycaster.set(origin, direction);
            const intersects = this.raycaster.intersectObjects(this.navButtons);
            if (intersects.length > 0) {
                intersects[0].object.scale.setScalar(1.2);
            }
        };

        if (this.renderer.xr.isPresenting) {
            this.controllers.forEach(controller => {
                const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion);
                checkRay(controller.position, dir);
            });
        } else {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.navButtons);
            if (intersects.length > 0) intersects[0].object.scale.setScalar(1.2);
        }
    }

    createNavButtons() {
        this.navButtons.forEach(b => this.scene.remove(b));
        this.navButtons = [];
        if (this.depthDisplay) this.scene.remove(this.depthDisplay);

        const createBtn = (label, x, y, action, isText = false) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, 128, 128);
            
            if (!isText) {
                ctx.strokeStyle = '#5b9bd5';
                ctx.lineWidth = 8;
                ctx.strokeRect(4, 4, 120, 120);
                ctx.fillStyle = '#eee';
                ctx.font = 'bold 70px Arial';
            } else {
                ctx.fillStyle = '#5b9bd5';
                ctx.font = 'bold 44px SF Mono, monospace';
            }
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, 64, 64);

            const tex = new THREE.CanvasTexture(canvas);
            const geom = new THREE.PlaneGeometry(0.25, 0.25);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(x, y, -2.4);
            mesh.userData.action = action;
            mesh.userData.origX = x;
            mesh.userData.origY = y;
            
            this.scene.add(mesh);
            if (!isText) this.navButtons.push(mesh);
            return mesh;
        };

        // Simplified Single Row Layout
        const y = 0;
        createBtn('<', -0.6, y, 'prev');
        createBtn('-', -0.3, y, 'depth-dec');
        this.depthDisplay = createBtn(this.displacement.toFixed(2), 0, y, 'none', true);
        createBtn('+', 0.3, y, 'depth-inc');
        createBtn('>', 0.6, y, 'next');
    }

    async updateVRButton() {
        if (document.getElementById('vr-button')) return;

        const btn = document.createElement('button');
        btn.id = 'vr-button';
        btn.style.position = 'absolute';
        btn.style.bottom = '15px'; // Pushed further down
        btn.style.left = '50%';
        btn.style.transform = 'translateX(-50%)';
        btn.style.padding = '8px 16px';
        btn.style.border = '1px solid #444';
        btn.style.borderRadius = '8px';
        btn.style.background = 'rgba(26, 26, 26, 0.5)'; // Semi-transparent
        btn.style.color = '#888';
        btn.style.cursor = 'help';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = 'bold';
        btn.style.letterSpacing = '1px';
        btn.style.zIndex = '2002';
        btn.textContent = 'VR NOT DETECTED';

        this.container.appendChild(btn);

        if (navigator.xr) {
            const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
            if (isVRSupported) {
                btn.textContent = 'ENTER VR';
                btn.style.color = '#5b9bd5';
                btn.style.borderColor = '#5b9bd5';
                btn.style.cursor = 'pointer';

                import('https://unpkg.com/three@0.168.0/examples/jsm/webxr/VRButton.js').then((module) => {
                    const threeBtn = module.VRButton.createButton(this.renderer);
                    threeBtn.style.display = 'none';
                    this.container.appendChild(threeBtn);
                    
                    btn.onclick = () => {
                        threeBtn.click();
                    };

                    // Auto-hide our custom button when VR starts
                    this.renderer.xr.addEventListener('sessionstart', () => {
                        btn.style.display = 'none';
                    });
                    this.renderer.xr.addEventListener('sessionend', () => {
                        btn.style.display = 'block';
                    });
                });
            }
        }
    }

    async start(id) {
        this.active = true;
        this.currentIndex = this.imageIds.indexOf(id);
        if (this.currentIndex === -1) this.currentIndex = 0;

        await this.loadCurrent();
        this.createNavButtons();
        this.renderer.setAnimationLoop((time) => this.render(time));
    }

    async loadCurrent() {
        const id = this.imageIds[this.currentIndex];
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
                    uDisplacement: { value: this.displacement },
                    uOffset: { value: this.depthOffset }
                },
                vertexShader: `
                    varying vec2 vUv;
                    uniform sampler2D uDepth;
                    uniform float uDisplacement;
                    uniform float uOffset;
                    void main() {
                        vUv = uv;
                        float z = (texture2D(uDepth, uv).r - uOffset) * uDisplacement;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + vec3(0,0,z), 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    uniform sampler2D uImage;
                    void main() { gl_FragColor = texture2D(uImage, vUv); }
                `,
                side: THREE.DoubleSide
            });

            this.plane = new THREE.Mesh(geometry, this.material);
            this.plane.position.set(0, 1.4, -2.5);
            this.scene.add(this.plane);
        } catch (err) { console.error(err); }
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.imageIds.length;
        this.loadCurrent();
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.imageIds.length) % this.imageIds.length;
        this.loadCurrent();
    }

    stop() {
        this.active = false;
        this.renderer.setAnimationLoop(null);
        if (this.renderer.xr.isPresenting) this.renderer.xr.getSession().then(s => s.end());
    }

    render(time) {
        if (!this.active) return;

        this.updateHoverStates();

        if (this.plane) {
            const controls = [...this.navButtons];
            if (this.depthDisplay) controls.push(this.depthDisplay);

            if (!this.renderer.xr.isPresenting) {
                this.plane.rotation.y = Math.sin(time / 2000) * 0.1;
                this.plane.rotation.x = Math.cos(time / 3000) * 0.05;
                this.camera.position.z = 2.5;
                this.plane.position.y = 0;
                this.plane.position.z = 0;
                
                controls.forEach(b => {
                    b.visible = true;
                    b.position.y = -1.5; // Single row well below plane
                    b.position.z = 0.1;
                    b.lookAt(this.camera.position);
                });
            } else {
                this.plane.rotation.y = 0;
                this.plane.rotation.x = 0;
                this.plane.position.y = 1.4;
                this.plane.position.z = -2.5;
                
                controls.forEach(b => {
                    b.visible = true;
                    b.position.y = 0.0; // Single row below VR plane
                    b.position.z = -2.4;
                    b.lookAt(this.camera.position);
                });
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
}

export class GalleryState {
    constructor() {
        this.state = {
            currentImage: null,
            depthStrategy: 'predicted',
            isAutoPanning: true,
            isCurved: true,
            isIndividualBillboarding: true,
            immersionActive: false,
            povMode: 'desk', // 'desk' | 'vr'
            isXR: false,
            isInputTestMode: false,
            showDepthOnly: false,
            scale: 1.0
        };
        this.listeners = {};
    }

    set(key, value) {
        if (this.state[key] === value) return;
        this.state[key] = value;
        console.log(`[GALLERY_STATE] ${key} -> ${value}`);
        this.notify(key, value);
    }

    get(key) {
        return this.state[key];
    }

    on(key, callback) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key].push(callback);
        // Immediate call for existing state
        callback(this.state[key]);
    }

    notify(key, value) {
        if (this.listeners[key]) {
            this.listeners[key].forEach(cb => cb(value));
        }
        // Global listeners
        if (this.listeners['*']) {
            this.listeners['*'].forEach(cb => cb(key, value));
        }
    }
}

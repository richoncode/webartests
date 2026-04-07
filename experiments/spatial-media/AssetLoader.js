export class AssetLoader {
    constructor() {
        this.catalog = [];
        this.ready = false;
        this.events = {};
    }

    async init() {
        try {
            console.log("[ASSET_LOADER] Fetching Catalog...");
            const response = await fetch('./catalog.json');
            this.catalog = await response.json();
            this.ready = true;
            this.notify('ready', this.catalog);
            return this.catalog;
        } catch (e) {
            console.error("[ASSET_LOADER] Failed to load catalog:", e);
            throw e;
        }
    }

    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    notify(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }

    getPhoto(filename) {
        return this.catalog.find(p => p.filename === filename);
    }

    getUniqueCatalog() {
        return this.catalog.filter((v, i, a) => a.findIndex(t => t.filename === v.filename) === i);
    }
}

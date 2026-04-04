/**
 * XCSPallet System
 * Defines reusable palette logic for xTool hardware layers (L1-L8).
 */

export const XCS_LAYERS = [
  "#000000", // L0 (Black)
  "#ff0000", // L1 (Red)
  "#ff8000", // L2 (Orange)
  "#0000ff", // L3 (Blue)
  "#00ff00", // L4 (Green)
  "#8000ff", // L5 (Purple)
  "#00ffff", // L6 (Cyan)
  "#ff00ff"  // L7 (Magenta)
];

export class XCSPallet {
  constructor(data) {
    this.id = data.id || 'default';
    this.name = data.name || 'Untitled Palette';
    this.description = data.description || '';
    this.speed = data.speed || 100;
    this.lpcm = data.lpcm || 1000;
    this.laser = data.laser || 'ir';
    this.entries = (data.entries || []).map((e, idx) => ({
      ...e,
      index: idx
    }));
  }

  getEntry(idx) {
    if (idx < 0) return this.entries[0];
    if (idx >= this.entries.length) return this.entries[this.entries.length - 1];
    return this.entries[idx];
  }

  /**
   * Returns a hardware layer color based on index.
   * Logic: Map indices to the 8 standard XCS layers (wrapping if necessary).
   */
  getLayerColor(idx) {
    return XCS_LAYERS[idx % XCS_LAYERS.length];
  }

  /**
   * Returns a hardware layer label (L0-L7) based on index.
   */
  getLayerLabel(idx) {
    return `L${idx % XCS_LAYERS.length}`;
  }

  /**
   * Interpolates between start and end indices.
   */
  getInterpolatedIndex(start, end, t) {
    return Math.round(start + (end - start) * t);
  }

  getInterpolatedEntry(start, end, t) {
    return this.getEntry(this.getInterpolatedIndex(start, end, t));
  }
}

export class XCSPallets {
  constructor() {
    this.registry = {};
  }

  register(palletData) {
    const pallet = new XCSPallet(palletData);
    this.registry[pallet.id] = pallet;
    return pallet;
  }

  get(id) {
    return this.registry[id] || Object.values(this.registry)[0];
  }

  list() {
    return Object.values(this.registry);
  }
}

// Export singleton
export const PalletStore = new XCSPallets();

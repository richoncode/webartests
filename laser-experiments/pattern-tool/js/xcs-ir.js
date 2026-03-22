export const XCSIR = {
  // ═══════════════════════════════════════════════════════════════════
  // XCS PARSER
  // Normalizes formal XCS data into Internal Representation.
  // Strictly follows xcsformat.md logic.
  // ═══════════════════════════════════════════════════════════════════
  parseXCS(data) {
    if (!data || !data.canvas || !data.canvas[0]) return [];
    const canvas = data.canvas[0];
    const dvEntry = Object.fromEntries(data.device.data.value)[canvas.id];
    const dispMap = Object.fromEntries(dvEntry.displays.value);
    return canvas.displays.map((d, i) => {
      const cfg = dispMap[d.id] || {};
      const pt = cfg.processingType || '';
      const pm = (pt && cfg.data?.[pt]) ? (cfg.data[pt].parameter?.customize || {}) : {};
      const src = pm.processingLightSource || null;
      const laser = (src === 'red' || src === 'ir') ? 'ir' : src;
      return { idx:i, id:d.id, type:d.type, x:d.x, y:d.y, w:d.width, h:d.height,
               angle:d.angle||0, layerColor:d.layerColor||'#5b9bd5', zOrder:d.zOrder||0,
               processingType:pt, power:pm.power??null, speed:pm.speed??null,
               density:pm.density ?? pm.dpi ?? null, repeat:pm.repeat??1,
               laser: laser, hideLabels: !!d.hideLabels,
               ix: d.ix??null, iy: d.iy??null,
               paletteName: d.paletteName || null, colorName: d.colorName || null,
               text: d.text || null, style: d.style || null };
    });
  }
};

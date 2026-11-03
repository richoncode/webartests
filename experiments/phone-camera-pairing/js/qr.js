let loader;

function loadQr() {
  if (window.QRCode) return Promise.resolve(window.QRCode);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js';
    script.onload = () => resolve(window.QRCode);
    script.onerror = () => reject(new Error('QR library failed to load.'));
    document.head.appendChild(script);
  });
  return loader;
}

export async function drawQr(canvas, text) {
  const QRCode = await loadQr();
  const size = Math.max(180, Math.round(canvas.clientWidth || 220));
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: text.length > 420 ? 'L' : 'M',
    color: { dark: '#f4f4f4', light: '#0d0d0d' },
  });
}

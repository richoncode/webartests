// Computes acceleration (not yet multiplied by G, not yet integrated) for
// an assigned slice [start, end) of particles, against the FULL particle
// set (gravity is all-pairs, so every worker needs everyone's position and
// mass even though it only computes output for its own slice). Structured
// clone copies posX/posY/mass into this worker's own memory automatically
// since they aren't in the transfer list — the main thread's copies stay
// intact and get reused for the next worker's message.
self.onmessage = function (e) {
  const { posX, posY, mass, start, end, softening, n } = e.data;
  const len = end - start;
  const outAX = new Float32Array(len);
  const outAY = new Float32Array(len);
  for (let k = 0; k < len; k++) {
    const i = start + k;
    let ax = 0, ay = 0;
    const ix = posX[i], iy = posY[i];
    for (let j = 0; j < n; j++) {
      const dx = posX[j] - ix, dy = posY[j] - iy;
      const distSq = dx * dx + dy * dy + softening;
      const invDist = 1 / Math.sqrt(distSq);
      const invDist3 = invDist * invDist * invDist;
      const scale = mass[j] * invDist3;
      ax += scale * dx; ay += scale * dy;
    }
    outAX[k] = ax; outAY[k] = ay;
  }
  self.postMessage({ start, end, outAX, outAY }, [outAX.buffer, outAY.buffer]);
};

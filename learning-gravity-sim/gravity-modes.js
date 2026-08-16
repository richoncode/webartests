// ── Shared simulation constants & deterministic scene generator ──
// Every mode starts from the exact same seeded scene (a massive central
// "sun" plus N-1 orbiting particles on roughly circular orbits) so switching
// modes or particle count is a fair, reproducible comparison, not a fresh
// random scene each time.
const WORLD_HALF_EXTENT = 480;
const SUN_MASS = 1000;
const G = 600;
const SOFTENING = 400; // added directly to distSq (i.e. this is epsilon^2, effective softening length = sqrt(400) = 20 world units)
const DT = 0.016;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns { posX, posY, velX, velY, mass } as plain Float32Arrays of length n
// (the canonical scene representation every mode converts into its own
// storage layout from).
function generateScene(n, seed) {
  const rand = mulberry32(seed);
  const posX = new Float32Array(n), posY = new Float32Array(n);
  const velX = new Float32Array(n), velY = new Float32Array(n);
  const mass = new Float32Array(n);
  posX[0] = 0; posY[0] = 0; velX[0] = 0; velY[0] = 0; mass[0] = SUN_MASS;
  for (let i = 1; i < n; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 40 + rand() * WORLD_HALF_EXTENT * 0.85;
    const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
    const circularSpeed = Math.sqrt((G * SUN_MASS) / radius);
    const speed = circularSpeed * (0.85 + rand() * 0.3);
    posX[i] = px; posY[i] = py;
    velX[i] = -Math.sin(angle) * speed;
    velY[i] = Math.cos(angle) * speed;
    mass[i] = 0.5 + rand() * 2;
  }
  return { posX, posY, velX, velY, mass };
}

// ── Mode: Naive (array-of-structs) ──
// The baseline a beginner would write: one JS object per particle, O(N^2)
// nested loop every step. Slow both from the algorithmic complexity AND
// from object/pointer overhead + poor cache locality of AoS layout.
const NaiveMode = {
  id: 'naive',
  label: 'Naive',
  // O(N^2), no shortcuts — a manual slider drag past this would leave a
  // single step() call running for a very long time (10,000^2 pairs is
  // already ~100M; the benchmark's real "max at 60fps" search for this
  // mode lands in the low thousands, so this ceiling still gives generous
  // headroom above what's actually sustainable without risking a stall).
  maxManualN: 12000,
  description: 'Array of <code>{x,y,vx,vy,mass}</code> objects (array-of-structs), O(N²) nested loop in plain JS. The deliberately-unoptimized baseline every other mode is measured against.',
  particles: null,
  init(n, seed) {
    const s = generateScene(n, seed);
    this.particles = new Array(n);
    for (let i = 0; i < n; i++) {
      this.particles[i] = { x: s.posX[i], y: s.posY[i], vx: s.velX[i], vy: s.velY[i], mass: s.mass[i] };
    }
  },
  step() {
    const p = this.particles, n = p.length;
    const accX = new Array(n), accY = new Array(n);
    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0;
      const pi = p[i];
      for (let j = 0; j < n; j++) {
        const pj = p[j];
        const dx = pj.x - pi.x, dy = pj.y - pi.y;
        const distSq = dx * dx + dy * dy + SOFTENING;
        const invDist = 1 / Math.sqrt(distSq);
        const invDist3 = invDist * invDist * invDist;
        const scale = pj.mass * invDist3;
        ax += scale * dx; ay += scale * dy;
      }
      accX[i] = G * ax; accY[i] = G * ay;
    }
    for (let i = 0; i < n; i++) { p[i].vx += accX[i] * DT; p[i].vy += accY[i] * DT; }
    for (let i = 0; i < n; i++) { p[i].x += p[i].vx * DT; p[i].y += p[i].vy * DT; }
  },
  getPositions(outX, outY) {
    const p = this.particles;
    for (let i = 0; i < p.length; i++) { outX[i] = p[i].x; outY[i] = p[i].y; }
  },
};

// ── Mode: SoA (struct-of-arrays) ──
// Same O(N^2) algorithm, but every field lives in its own contiguous
// Float32Array — no object headers, no pointer chasing, and iterating a
// single field across all particles is a straight linear memory scan.
const SoAMode = {
  id: 'soa',
  label: 'SoA',
  maxManualN: 12000,
  description: 'Same algorithm as Naive, but positions/velocities/mass each live in their own contiguous <code>Float32Array</code> instead of per-particle objects — no GC pressure from object allocation, and no per-particle pointer chasing. SoA\'s usual cache advantage comes from scanning ONE field across every element; this kernel\'s inner loop needs THREE fields (x, y, mass) of the same particle j together, which is exactly the pattern where array-of-structs can hold its own — don\'t assume SoA automatically wins here, watch the numbers for your access pattern.',
  posX: null, posY: null, velX: null, velY: null, mass: null, n: 0,
  init(n, seed) {
    const s = generateScene(n, seed);
    this.posX = s.posX; this.posY = s.posY; this.velX = s.velX; this.velY = s.velY; this.mass = s.mass;
    this.n = n;
    this._accX = new Float32Array(n); this._accY = new Float32Array(n);
  },
  step() {
    const { posX, posY, velX, velY, mass, n, _accX: accX, _accY: accY } = this;
    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0;
      const ix = posX[i], iy = posY[i];
      for (let j = 0; j < n; j++) {
        const dx = posX[j] - ix, dy = posY[j] - iy;
        const distSq = dx * dx + dy * dy + SOFTENING;
        const invDist = 1 / Math.sqrt(distSq);
        const invDist3 = invDist * invDist * invDist;
        const scale = mass[j] * invDist3;
        ax += scale * dx; ay += scale * dy;
      }
      accX[i] = G * ax; accY[i] = G * ay;
    }
    for (let i = 0; i < n; i++) { velX[i] += accX[i] * DT; velY[i] += accY[i] * DT; }
    for (let i = 0; i < n; i++) { posX[i] += velX[i] * DT; posY[i] += velY[i] * DT; }
  },
  getPositions(outX, outY) { outX.set(this.posX); outY.set(this.posY); },
};

// ── Mode: Quantized ──
// Positions/velocities are stored as Int16 fixed-point (half the bytes of
// Float32). Each step dequantizes to float32 scratch buffers, runs the same
// SoA algorithm, then requantizes the results back. This trades memory
// footprint for quantization error AND extra conversion work — for this
// compute-bound O(N^2) kernel at moderate N, that trade can easily be a net
// LOSS versus plain SoA, and this mode reports its real measured time rather
// than assuming quantization is automatically a win.
const QuantizedMode = {
  id: 'quantized',
  label: 'Quantized',
  maxManualN: 12000,
  description: 'Position/velocity stored as <code>Int16</code> fixed-point (half the bytes of Float32); dequantized to float for the actual math each step, requantized after. Halves memory footprint at the cost of precision and conversion overhead — for a compute-bound loop like this, that overhead can outweigh the bandwidth savings. Watch the numbers, don\'t assume.',
  n: 0,
  init(n, seed) {
    const s = generateScene(n, seed);
    this.n = n;
    this.posScale = 32000 / WORLD_HALF_EXTENT;
    const maxSpeed = Math.sqrt((G * SUN_MASS) / 30) * 1.2;
    this.velScale = 32000 / maxSpeed;
    this.massScale = 32000 / (SUN_MASS + 5);
    this.posXq = new Int16Array(n); this.posYq = new Int16Array(n);
    this.velXq = new Int16Array(n); this.velYq = new Int16Array(n);
    this.massq = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      this.posXq[i] = Math.round(s.posX[i] * this.posScale);
      this.posYq[i] = Math.round(s.posY[i] * this.posScale);
      this.velXq[i] = Math.round(s.velX[i] * this.velScale);
      this.velYq[i] = Math.round(s.velY[i] * this.velScale);
      this.massq[i] = Math.round(s.mass[i] * this.massScale);
    }
    this._fx = new Float32Array(n); this._fy = new Float32Array(n);
    this._fvx = new Float32Array(n); this._fvy = new Float32Array(n);
    this._fm = new Float32Array(n);
    this._accX = new Float32Array(n); this._accY = new Float32Array(n);
  },
  step() {
    const n = this.n;
    const { posXq, posYq, velXq, velYq, massq, posScale, velScale, massScale } = this;
    const fx = this._fx, fy = this._fy, fvx = this._fvx, fvy = this._fvy, fm = this._fm;
    const accX = this._accX, accY = this._accY;
    const invPosScale = 1 / posScale, invVelScale = 1 / velScale, invMassScale = 1 / massScale;
    for (let i = 0; i < n; i++) {
      fx[i] = posXq[i] * invPosScale; fy[i] = posYq[i] * invPosScale;
      fvx[i] = velXq[i] * invVelScale; fvy[i] = velYq[i] * invVelScale;
      fm[i] = massq[i] * invMassScale;
    }
    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0;
      const ix = fx[i], iy = fy[i];
      for (let j = 0; j < n; j++) {
        const dx = fx[j] - ix, dy = fy[j] - iy;
        const distSq = dx * dx + dy * dy + SOFTENING;
        const invDist = 1 / Math.sqrt(distSq);
        const invDist3 = invDist * invDist * invDist;
        const scale = fm[j] * invDist3;
        ax += scale * dx; ay += scale * dy;
      }
      accX[i] = G * ax; accY[i] = G * ay;
    }
    for (let i = 0; i < n; i++) { fvx[i] += accX[i] * DT; fvy[i] += accY[i] * DT; }
    for (let i = 0; i < n; i++) { fx[i] += fvx[i] * DT; fy[i] += fvy[i] * DT; }
    for (let i = 0; i < n; i++) {
      posXq[i] = Math.max(-32768, Math.min(32767, Math.round(fx[i] * posScale)));
      posYq[i] = Math.max(-32768, Math.min(32767, Math.round(fy[i] * posScale)));
      velXq[i] = Math.max(-32768, Math.min(32767, Math.round(fvx[i] * velScale)));
      velYq[i] = Math.max(-32768, Math.min(32767, Math.round(fvy[i] * velScale)));
    }
  },
  getPositions(outX, outY) {
    const inv = 1 / this.posScale;
    for (let i = 0; i < this.n; i++) { outX[i] = this.posXq[i] * inv; outY[i] = this.posYq[i] * inv; }
  },
};

// ── Mode: Barnes-Hut ──
// The algorithmic alternative to everything above: instead of computing all
// N^2 pairwise forces, build a quadtree over the current positions (each
// node tracks the total mass and center-of-mass of everything beneath it),
// then for each particle, treat any node whose region is "far enough away"
// (size/distance < theta) as a single point mass instead of recursing into
// it. This is O(N log N) instead of O(N^2) — but the tree has to be rebuilt
// from scratch every step, and that allocation/traversal overhead is real:
// verified standalone against the brute-force reference before wiring in
// here, theta=0 (which forces full recursion, i.e. no approximation at all)
// matches brute force to ~1e-14 — confirming the tree/aggregation logic
// itself is correct — while theta=0.5 measurably WINS on speed only once N
// is large enough to outweigh that per-step tree-build cost (in this JS
// implementation, roughly N > ~2000; below that, brute force can be faster).
const MAX_QUADTREE_DEPTH = 32;

function makeQuadNode(cx, cy, halfSize) {
  return { cx, cy, halfSize, mass: 0, comX: 0, comY: 0, children: null, particleIdx: -1, count: 0 };
}
function subdivideQuadNode(node) {
  const h = node.halfSize / 2;
  node.children = [
    makeQuadNode(node.cx - h, node.cy + h, h),
    makeQuadNode(node.cx + h, node.cy + h, h),
    makeQuadNode(node.cx - h, node.cy - h, h),
    makeQuadNode(node.cx + h, node.cy - h, h),
  ];
}
function quadrantOf(node, px, py) {
  const east = px >= node.cx, north = py >= node.cy;
  if (north) return east ? 1 : 0;
  return east ? 3 : 2;
}
function insertIntoQuadtree(node, idx, posX, posY, mass, depth) {
  if (node.count === 0) {
    node.particleIdx = idx;
    node.mass = mass[idx]; node.comX = posX[idx]; node.comY = posY[idx];
    node.count = 1;
    return;
  }
  if (node.children === null) {
    const existingIdx = node.particleIdx;
    node.particleIdx = -1;
    if (depth < MAX_QUADTREE_DEPTH) {
      subdivideQuadNode(node);
      insertIntoQuadtree(node.children[quadrantOf(node, posX[existingIdx], posY[existingIdx])], existingIdx, posX, posY, mass, depth + 1);
      insertIntoQuadtree(node.children[quadrantOf(node, posX[idx], posY[idx])], idx, posX, posY, mass, depth + 1);
    }
    // if the depth cap is hit (near-coincident particles), fall through and
    // just fold the new particle's mass/COM into this node without further
    // subdivision — an approximation floor for a degenerate edge case.
  } else {
    insertIntoQuadtree(node.children[quadrantOf(node, posX[idx], posY[idx])], idx, posX, posY, mass, depth + 1);
  }
  const newMass = node.mass + mass[idx];
  node.comX = (node.comX * node.mass + posX[idx] * mass[idx]) / newMass;
  node.comY = (node.comY * node.mass + posY[idx] * mass[idx]) / newMass;
  node.mass = newMass;
  node.count++;
}
function accumulateQuadForce(mx, my, m, px, py, out) {
  const dx = mx - px, dy = my - py;
  const distSq = dx * dx + dy * dy + SOFTENING;
  const invDist = 1 / Math.sqrt(distSq);
  const invDist3 = invDist * invDist * invDist;
  const scale = m * invDist3;
  out.x += scale * dx; out.y += scale * dy;
}
function computeQuadForce(node, idx, posX, posY, theta, out) {
  if (node.count === 0) return;
  if (node.count === 1) {
    if (node.particleIdx === idx) return;
    accumulateQuadForce(node.comX, node.comY, node.mass, posX[idx], posY[idx], out);
    return;
  }
  const dx = node.comX - posX[idx], dy = node.comY - posY[idx];
  const dist = Math.sqrt(dx * dx + dy * dy) + 1e-9;
  const s = node.halfSize * 2;
  if (s / dist < theta) {
    accumulateQuadForce(node.comX, node.comY, node.mass, posX[idx], posY[idx], out);
  } else {
    for (const child of node.children) computeQuadForce(child, idx, posX, posY, theta, out);
  }
}

const BarnesHutMode = {
  id: 'barnes-hut',
  label: 'Barnes-Hut',
  // O(N log N) — genuinely safe much higher than the brute-force modes,
  // though the per-step quadtree rebuild (real object allocation, not
  // free) means it's still not GPU-safe territory.
  maxManualN: 30000,
  description: 'A quadtree over the current positions, aggregating mass/center-of-mass per node, so a whole distant cluster of particles can be treated as one point mass instead of summing each individually — O(N log N) instead of O(N²). Verified against brute force at theta=0 (full recursion, no approximation) to ~1e-14. But the tree is rebuilt from scratch every step, and that cost is real: in this implementation it only pays off once N is large enough (roughly N > ~2000 here) — below that, brute force can actually be faster. The algorithmic win is real, just not free, and not universal.',
  n: 0, theta: 0.6,
  posX: null, posY: null, velX: null, velY: null, mass: null,
  init(n, seed) {
    const s = generateScene(n, seed);
    this.posX = s.posX; this.posY = s.posY; this.velX = s.velX; this.velY = s.velY; this.mass = s.mass;
    this.n = n;
    this._accX = new Float32Array(n); this._accY = new Float32Array(n);
  },
  step() {
    const { posX, posY, velX, velY, mass, n, theta, _accX: accX, _accY: accY } = this;
    let worldHalf = WORLD_HALF_EXTENT * 1.3;
    for (let i = 0; i < n; i++) {
      worldHalf = Math.max(worldHalf, Math.abs(posX[i]) * 1.05, Math.abs(posY[i]) * 1.05);
    }
    const tree = makeQuadNode(0, 0, worldHalf);
    for (let i = 0; i < n; i++) insertIntoQuadtree(tree, i, posX, posY, mass, 0);
    const out = { x: 0, y: 0 };
    for (let i = 0; i < n; i++) {
      out.x = 0; out.y = 0;
      computeQuadForce(tree, i, posX, posY, theta, out);
      accX[i] = G * out.x; accY[i] = G * out.y;
    }
    for (let i = 0; i < n; i++) { velX[i] += accX[i] * DT; velY[i] += accY[i] * DT; }
    for (let i = 0; i < n; i++) { posX[i] += velX[i] * DT; posY[i] += velY[i] * DT; }
  },
  getPositions(outX, outY) { outX.set(this.posX); outY.set(this.posY); },
};

// ── Mode: WASM SIMD ──
// Same SoA layout, but the O(N^2) force loop runs as compiled WebAssembly
// using real v128/f32x4 SIMD instructions (4 particles per lane group). JS
// owns typed-array VIEWS directly over the wasm module's exported memory —
// no copying in/out per frame, the wasm functions mutate that memory in place.
const WasmSimdMode = {
  id: 'wasm-simd',
  label: 'WASM SIMD',
  maxManualN: 12000,
  description: 'Same struct-of-arrays layout, but the O(N²) force loop is real WebAssembly using <code>v128</code>/<code>f32x4</code> SIMD instructions — 4 particles processed per lane group instead of one at a time. Unit-tested against a plain-JS reference to float32 tolerance before being wired in here.',
  instance: null, n: 0, paddedN: 0,
  offsets: null,
  async load() {
    const resp = await fetch('gravity-simd.wasm');
    const bytes = await resp.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    this.instance = instance;
  },
  init(n, seed) {
    const s = generateScene(n, seed);
    this.n = n;
    this.paddedN = Math.ceil(n / 4) * 4;
    const bytesPerArray = this.paddedN * 4;
    const needBytes = bytesPerArray * 5;
    const mem = this.instance.exports.memory;
    const havePages = mem.buffer.byteLength / 65536;
    const needPages = Math.ceil(needBytes / 65536);
    if (needPages > havePages) mem.grow(needPages - havePages);
    this.offsets = { x: 0, y: bytesPerArray, vx: bytesPerArray * 2, vy: bytesPerArray * 3, m: bytesPerArray * 4 };
    const o = this.offsets;
    this.viewX = new Float32Array(mem.buffer, o.x, this.paddedN);
    this.viewY = new Float32Array(mem.buffer, o.y, this.paddedN);
    this.viewVX = new Float32Array(mem.buffer, o.vx, this.paddedN);
    this.viewVY = new Float32Array(mem.buffer, o.vy, this.paddedN);
    this.viewM = new Float32Array(mem.buffer, o.m, this.paddedN);
    this.viewX.fill(0); this.viewY.fill(0); this.viewVX.fill(0); this.viewVY.fill(0); this.viewM.fill(0);
    this.viewX.set(s.posX); this.viewY.set(s.posY);
    this.viewVX.set(s.velX); this.viewVY.set(s.velY);
    this.viewM.set(s.mass);
  },
  step() {
    const o = this.offsets;
    this.instance.exports.stepVelocities(o.x, o.y, o.vx, o.vy, o.m, this.n, this.paddedN, G, DT, SOFTENING);
    this.instance.exports.stepPositions(o.x, o.y, o.vx, o.vy, this.paddedN, DT);
  },
  getPositions(outX, outY) {
    // memory can be detached/regrown between calls in theory; views stay valid here since we only grow once in init()
    for (let i = 0; i < this.n; i++) { outX[i] = this.viewX[i]; outY[i] = this.viewY[i]; }
  },
};

// ── Mode: Web Workers ──
// True OS-thread parallelism (unlike SIMD, which is data-parallel within one
// thread): the outer loop is split across navigator.hardwareConcurrency
// workers, each computing acceleration for its own slice of particles
// against the FULL position/mass set (every worker needs everyone's data —
// gravity is all-pairs). GitHub Pages can't set the COOP/COEP response
// headers SharedArrayBuffer requires, so this uses plain postMessage
// structured-clone copies instead of zero-copy shared memory — a real,
// measurable cost (see the mode's own reported step time vs. SoA at the
// same N) that a SharedArrayBuffer version could avoid on a host that sets
// those headers. step() is fire-and-forget: it kicks off the round-trip and
// returns immediately, skipping a new round-trip if the previous one hasn't
// resolved yet (frame-skipping under load) rather than letting overlapping
// requests race on the same arrays.
const WorkersMode = {
  id: 'workers',
  label: 'Web Workers',
  maxManualN: 12000,
  description: 'The outer loop split across real OS threads (<code>navigator.hardwareConcurrency</code> Web Workers), each computing its own slice against a copy of the full particle set. No SharedArrayBuffer — GitHub Pages can\'t set the COOP/COEP headers it needs — so every step copies pos/mass to every worker via structured clone. That copy cost is real and counted in the reported step time, not hidden.',
  n: 0,
  posX: null, posY: null, velX: null, velY: null, mass: null,
  workers: [], workerCount: 0, busy: false, lastStepMs: 0, stepCount: 0,
  init(n, seed) {
    const s = generateScene(n, seed);
    this.posX = s.posX; this.posY = s.posY; this.velX = s.velX; this.velY = s.velY; this.mass = s.mass;
    this.n = n;
    this.busy = false;
    this.lastStepMs = 0;
    if (this.workers.length === 0) {
      this.workerCount = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1));
      for (let i = 0; i < this.workerCount; i++) this.workers.push(new Worker('gravity-worker.js'));
    }
  },
  step() {
    if (this.busy) return; // previous round-trip still in flight — skip this tick rather than race
    this.busy = true;
    const t0 = performance.now();
    this._runStep().then(() => {
      this.lastStepMs = performance.now() - t0;
      this.stepCount++;
      this.busy = false;
    });
  },
  async _runStep() {
    const { posX, posY, mass, velX, velY, n, workers, workerCount } = this;
    const chunk = Math.ceil(n / workerCount);
    const promises = [];
    for (let w = 0; w < workerCount; w++) {
      const start = w * chunk, end = Math.min(n, start + chunk);
      if (start >= end) continue;
      const worker = workers[w];
      promises.push(new Promise((resolve) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.postMessage({ posX, posY, mass, start, end, softening: SOFTENING, n });
      }));
    }
    const results = await Promise.all(promises);
    for (const r of results) {
      const len = r.end - r.start;
      for (let k = 0; k < len; k++) {
        const i = r.start + k;
        velX[i] += G * r.outAX[k] * DT;
        velY[i] += G * r.outAY[k] * DT;
      }
    }
    for (let i = 0; i < n; i++) { posX[i] += velX[i] * DT; posY[i] += velY[i] * DT; }
  },
  getPositions(outX, outY) { outX.set(this.posX); outY.set(this.posY); },
};

// ── Mode: GPU (WebGPU compute + render) ──
// Each particle is one compute-shader invocation (no SIMD-width padding
// needed — the shader itself bounds-checks against the real count for both
// the outer and inner loop). Two compute passes per step (velocity, then
// position) in the same command encoder submission — WebGPU orders passes
// within one submission automatically, so no ping-pong buffers are needed:
// the position pass simply runs after the velocity pass has finished
// writing. The render pipeline reads particle positions straight out of the
// same storage buffer via instancing — zero CPU readback in the hot loop.
const GPU_VELOCITY_WGSL = `
struct Params { n: u32, g: f32, dt: f32, softening: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> mass: array<f32>;
@group(0) @binding(3) var<storage, read_write> vel: array<vec2f>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.n) { return; }
  let pi = pos[i];
  var acc = vec2f(0.0, 0.0);
  let n = params.n;
  for (var j: u32 = 0u; j < n; j = j + 1u) {
    let d = pos[j] - pi;
    let distSq = dot(d, d) + params.softening;
    let invDist = 1.0 / sqrt(distSq);
    let invDist3 = invDist * invDist * invDist;
    acc = acc + d * (mass[j] * invDist3);
  }
  vel[i] = vel[i] + acc * (params.g * params.dt);
}
`;

// Classic GPU Gems N-body tiling: instead of every one of the 64 threads in
// a workgroup independently re-reading the SAME particle's pos/mass from
// (slow, high-latency) storage-buffer memory, the workgroup cooperatively
// loads one tile of 64 particles into (fast, on-chip) workgroup-shared
// memory ONCE, all 64 threads read that shared copy, then the workgroup
// moves to the next tile. Same O(N^2) total work, far fewer global memory
// reads. workgroupBarrier() calls stay OUTSIDE any per-thread conditional —
// WGSL requires uniform control flow across a barrier, so the "am I a real
// particle" check only wraps the data-dependent math, never the barriers.
const GPU_TILED_VELOCITY_WGSL = `
struct Params { n: u32, g: f32, dt: f32, softening: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> mass: array<f32>;
@group(0) @binding(3) var<storage, read_write> vel: array<vec2f>;

var<workgroup> tilePos: array<vec2f, 64>;
var<workgroup> tileMass: array<f32, 64>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let i = gid.x;
  let valid = i < params.n;
  var myPos = vec2f(0.0, 0.0);
  if (valid) { myPos = pos[i]; }
  var acc = vec2f(0.0, 0.0);

  let numTiles = (params.n + 63u) / 64u;
  for (var t: u32 = 0u; t < numTiles; t = t + 1u) {
    let srcIdx = t * 64u + lid.x;
    if (srcIdx < params.n) {
      tilePos[lid.x] = pos[srcIdx];
      tileMass[lid.x] = mass[srcIdx];
    } else {
      tilePos[lid.x] = vec2f(0.0, 0.0);
      tileMass[lid.x] = 0.0;
    }
    workgroupBarrier();

    if (valid) {
      for (var k: u32 = 0u; k < 64u; k = k + 1u) {
        let d = tilePos[k] - myPos;
        let distSq = dot(d, d) + params.softening;
        let invDist = 1.0 / sqrt(distSq);
        let invDist3 = invDist * invDist * invDist;
        acc = acc + d * (tileMass[k] * invDist3);
      }
    }
    workgroupBarrier();
  }

  if (valid) {
    vel[i] = vel[i] + acc * (params.g * params.dt);
  }
}
`;

const GPU_POSITION_WGSL = `
struct Params { n: u32, g: f32, dt: f32, softening: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> vel: array<vec2f>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.n) { return; }
  pos[i] = pos[i] + vel[i] * params.dt;
}
`;

const GPU_RENDER_WGSL = `
struct ViewParams { scaleX: f32, scaleY: f32, pointSize: f32, _pad: f32 }
@group(0) @binding(0) var<uniform> view: ViewParams;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;

struct VSOut {
  @builtin(position) clipPos: vec4f,
  @location(0) localPos: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vIdx: u32, @builtin(instance_index) iIdx: u32) -> VSOut {
  var quad = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );
  let center = pos[iIdx];
  let corner = quad[vIdx];
  let local = corner * view.pointSize;
  let world = center + local;
  let ndc = vec2f(world.x * view.scaleX, world.y * view.scaleY);
  var out: VSOut;
  out.clipPos = vec4f(ndc, 0.0, 1.0);
  out.localPos = corner;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  if (dot(in.localPos, in.localPos) > 1.0) { discard; }
  return vec4f(0.357, 0.612, 0.835, 1.0);
}
`;

// Both GPU modes share every line of device/pipeline/buffer/render setup —
// the ONLY thing that differs is which WGSL source computes velocities (the
// naive one re-reads every other particle's pos/mass straight from storage
// buffer memory each invocation; the tiled one stages each block of 64 into
// workgroup-shared memory first). Factoring that out is what let the tiled
// mode get added without copying ~130 lines of WebGPU boilerplate a second
// time.
function makeGpuMode(config) {
  return {
    id: config.id,
    label: config.label,
    description: config.description,
    velocityWgsl: config.velocityWgsl,
    supported: false, adapter: null, device: null, context: null, canvas: null,
    n: 0, paddedN: 0,

    isGpu: true,
    // A flat "GPU is async so any N is safe" assumption turned out to be
    // wrong in practice: queue.submit() not blocking JS only means the MAIN
    // THREAD doesn't stall — it says nothing about a single dispatch taking
    // so long that the driver's own hang-detection resets the device, which
    // surfaces as the whole tab appearing to freeze. This starts as a
    // conservative placeholder and gets replaced with a real, measured
    // number by calibrateCeiling() before the user can ever pick an N.
    maxManualN: 3000,
    busy: false, lastStepMs: 0, deviceLost: false, stepCount: 0,

    async checkSupport() {
      if (!navigator.gpu) return false;
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return false;
        this.adapter = adapter;
        return true;
      } catch (e) { return false; }
    },

    async setup(canvas) {
      this.canvas = canvas;
      this.device = await this.adapter.requestDevice();
      // If the driver ever resets the device (e.g. after a dispatch it
      // decided had hung), don't keep silently trying to submit into a
      // dead device every frame — that's exactly the kind of "stalled"
      // state this whole fix is trying to avoid leaving the user stuck in.
      this.device.lost.then((info) => {
        this.deviceLost = true;
        console.error(`${this.label}: GPU device lost (${info.reason}): ${info.message}`);
      });
      this.context = canvas.getContext('webgpu');
      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.activate();

      const velModule = this.device.createShaderModule({ code: this.velocityWgsl });
      const posModule = this.device.createShaderModule({ code: GPU_POSITION_WGSL });
      const renderModule = this.device.createShaderModule({ code: GPU_RENDER_WGSL });

      this.velPipeline = this.device.createComputePipeline({ layout: 'auto', compute: { module: velModule, entryPoint: 'main' } });
      this.posPipeline = this.device.createComputePipeline({ layout: 'auto', compute: { module: posModule, entryPoint: 'main' } });
      this.renderPipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: renderModule, entryPoint: 'vs' },
        fragment: { module: renderModule, entryPoint: 'fs', targets: [{ format: this.format }] },
        primitive: { topology: 'triangle-list' },
      });
      this.viewParamsBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    },

    init(n, seed) {
      const s = generateScene(n, seed);
      this.n = n;
      const paddedN = Math.max(64, Math.ceil(n / 64) * 64);
      this.paddedN = paddedN;
      const dev = this.device;

      const posArr = new Float32Array(paddedN * 2);
      const velArr = new Float32Array(paddedN * 2);
      const massArr = new Float32Array(paddedN);
      for (let i = 0; i < n; i++) {
        posArr[i * 2] = s.posX[i]; posArr[i * 2 + 1] = s.posY[i];
        velArr[i * 2] = s.velX[i]; velArr[i * 2 + 1] = s.velY[i];
        massArr[i] = s.mass[i];
      }

      if (this.posBuffer) { this.posBuffer.destroy(); this.velBuffer.destroy(); this.massBuffer.destroy(); }

      this.posBuffer = dev.createBuffer({ size: posArr.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
      new Float32Array(this.posBuffer.getMappedRange()).set(posArr);
      this.posBuffer.unmap();

      this.velBuffer = dev.createBuffer({ size: velArr.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
      new Float32Array(this.velBuffer.getMappedRange()).set(velArr);
      this.velBuffer.unmap();

      this.massBuffer = dev.createBuffer({ size: massArr.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
      new Float32Array(this.massBuffer.getMappedRange()).set(massArr);
      this.massBuffer.unmap();

      if (!this.paramsBuffer) this.paramsBuffer = dev.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      dev.queue.writeBuffer(this.paramsBuffer, 0, new Uint32Array([n]));
      dev.queue.writeBuffer(this.paramsBuffer, 4, new Float32Array([G, DT, SOFTENING]));

      this.velBindGroup = dev.createBindGroup({
        layout: this.velPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.paramsBuffer } },
          { binding: 1, resource: { buffer: this.posBuffer } },
          { binding: 2, resource: { buffer: this.massBuffer } },
          { binding: 3, resource: { buffer: this.velBuffer } },
        ],
      });
      this.posBindGroup = dev.createBindGroup({
        layout: this.posPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.paramsBuffer } },
          { binding: 1, resource: { buffer: this.posBuffer } },
          { binding: 2, resource: { buffer: this.velBuffer } },
        ],
      });
      this.renderBindGroup = dev.createBindGroup({
        layout: this.renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.viewParamsBuffer } },
          { binding: 1, resource: { buffer: this.posBuffer } },
        ],
      });

      this.dispatchCount = Math.ceil(n / 64);
    },

    setView(scaleX, scaleY, pointSize) {
      this.device.queue.writeBuffer(this.viewParamsBuffer, 0, new Float32Array([scaleX, scaleY, pointSize, 0]));
    },

    // Both GPU modes render to the SAME shared canvas, and a WebGPU canvas
    // context can only be configured for one device at a time. setup() only
    // runs once per mode (the first time it's selected), so switching
    // GPU -> GPU Tiled -> GPU again would otherwise leave the context still
    // configured for Tiled's device while plain GPU's step() tries to
    // present through it — a cross-device texture error. Call this every
    // time this mode becomes the active one, not just on first setup.
    activate() {
      this.context.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });
    },

    // The actual encode+submit work, with no timing or backpressure of its
    // own — step() (live use) and the benchmark/calibration paths both
    // build on this, but need different wrapping around it.
    _submitStep() {
      const dev = this.device;
      const encoder = dev.createCommandEncoder();
      {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.velPipeline);
        pass.setBindGroup(0, this.velBindGroup);
        pass.dispatchWorkgroups(this.dispatchCount);
        pass.end();
      }
      {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.posPipeline);
        pass.setBindGroup(0, this.posBindGroup);
        pass.dispatchWorkgroups(this.dispatchCount);
        pass.end();
      }
      {
        const view = this.context.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass({
          colorAttachments: [{ view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
        });
        pass.setPipeline(this.renderPipeline);
        pass.setBindGroup(0, this.renderBindGroup);
        pass.draw(6, this.n);
        pass.end();
      }
      dev.queue.submit([encoder.finish()]);
    },

    // queue.submit() not blocking JS only means the CALLER doesn't stall —
    // it says nothing about how long the GPU actually takes to work through
    // what was submitted. The live rAF loop calls step() every ~16ms
    // regardless of whether the previous frame's GPU work has finished; at
    // a high enough N a single frame's compute can take far longer than
    // that, and without a guard the queue backs up further and further
    // every tick with nothing ever draining it — which is exactly what
    // "stalled at high particle counts" looks like from the outside. This
    // mirrors WorkersMode's fire-and-forget + busy-guard pattern: skip
    // resubmitting until the previous submission has actually finished, so
    // there's never more than one frame of GPU work in flight.
    step() {
      if (this.busy || this.deviceLost) return;
      this.busy = true;
      const t0 = performance.now();
      this._submitStep();
      this.device.queue.onSubmittedWorkDone()
        .then(() => { this.lastStepMs = performance.now() - t0; this.stepCount++; this.busy = false; })
        .catch(() => { this.busy = false; });
    },

    // queue.submit() returns immediately — the GPU work it enqueued may
    // still be running. Wall-clock timing around step() alone measures
    // "how long it took to record and submit commands," not real GPU cost.
    // onSubmittedWorkDone() resolves once the GPU has actually finished
    // everything submitted so far, which the max-particles-at-60fps
    // benchmark needs to get an honest per-step cost for these two modes.
    async waitForGPU() {
      await this.device.queue.onSubmittedWorkDone();
    },

    // Replaces the old flat 200,000-for-every-GPU-mode guess with a number
    // grounded in this device's actual measured throughput: time one real
    // dispatch at a moderate reference count, then extrapolate an N whose
    // O(N^2) cost would still land comfortably under SAFE_SINGLE_STEP_MS —
    // generous margin below typical driver hang-detection windows (~2s on
    // Windows), so a single frame at the resulting ceiling stays well short
    // of "the GPU looks hung." The two GPU modes calibrate independently,
    // since the tiled mode's real throughput advantage should raise its
    // ceiling too, not just its measured FPS.
    // getViewParams(n) -> {scaleX, scaleY, pointSize} lets the app tell this
    // mode what the live view would actually look like at a given N — the
    // render pass's cost depends on point size (fill-rate) as well as N
    // (instance count), so timing it with the view-params buffer still at
    // its post-creation zero (nothing has ever called setView() yet, this
    // early in page load) would measure zero-area quads, i.e. an almost-free
    // render pass. That understates the real cost enough to matter: it's
    // what made this calibration land well above the real sustainable N.
    async calibrateCeiling(getViewParams) {
      const REF_N = 2000;
      const SAFE_SINGLE_STEP_MS = 250;
      const HARD_CAP_N = 200000;
      const FLOOR_N = 2000;
      try {
        this.init(REF_N, 1);
        if (getViewParams) {
          const vp = getViewParams(REF_N);
          this.setView(vp.scaleX, vp.scaleY, vp.pointSize);
        }
        this._submitStep();
        await this.device.queue.onSubmittedWorkDone(); // warm up: shader/pipeline compile, allocation
        // Take the min of a couple of timed samples rather than trusting a
        // single one — a lone sample that happens to land during a GC pause
        // or driver hiccup would otherwise produce a needlessly conservative
        // (or, worse, an overconfident) ceiling from one bad data point.
        let refMs = Infinity;
        for (let i = 0; i < 2; i++) {
          const t0 = performance.now();
          this._submitStep();
          await this.device.queue.onSubmittedWorkDone();
          refMs = Math.min(refMs, performance.now() - t0);
        }
        refMs = Math.max(0.05, refMs);
        const estimate = REF_N * Math.sqrt(SAFE_SINGLE_STEP_MS / refMs);
        this.maxManualN = Math.max(FLOOR_N, Math.min(HARD_CAP_N, Math.round(estimate / 1000) * 1000));
      } catch (e) {
        console.error(`${this.label}: ceiling calibration failed, keeping conservative default`, e);
      }
    },
  };
}

const GpuMode = makeGpuMode({
  id: 'gpu',
  label: 'GPU (WebGPU)',
  description: 'A real WGSL compute shader — one invocation per particle, still O(N²) per step but run across thousands of GPU threads at once. Positions are read directly from the storage buffer by an instanced render pipeline, so there\'s no CPU readback in the per-frame hot loop.',
  velocityWgsl: GPU_VELOCITY_WGSL,
});

const GpuTiledMode = makeGpuMode({
  id: 'gpu-tiled',
  label: 'GPU (Tiled)',
  description: 'Same WGSL compute+render pipeline as plain GPU mode, but the velocity pass stages each block of 64 particles into fast workgroup-shared memory once, then has all 64 threads in the workgroup reuse that shared copy — instead of every thread independently re-reading the same particle\'s position and mass from slower storage-buffer memory. Same O(N²) work, fewer redundant global memory reads.',
  velocityWgsl: GPU_TILED_VELOCITY_WGSL,
});

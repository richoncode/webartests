/* InfraSim analytical engine. Roofline-style: per layer, time = max(FLOPs / (peak x MFU), bytes / (BW x eta)) + comm.
   UMD: browser global `InfraEngine`, Node module.exports. Pure functions, no DOM. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.InfraEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const PRECS = {
  fp16: { label:'FP16', w:2,      kv:2 },
  fp8:  { label:'FP8 / 8-bit', w:1, kv:1 },
  int4: { label:'INT4 (weight-only)', w:0.5156, kv:2 }   // 4.125 bits: 4-bit + fp16 scale per group of 128 (assumed layout)
};
// Global assumptions (all adjustable in the UI drawer). Units and meaning are listed in ASSUME_META.
const DEFAULT_ASSUME = { linkEff:0.7, alphaUs:8, actTraffic:3, int4BwFactor:0.85, sampleUs:200 };
const ASSUME_META = {
  linkEff:     { label:'Interconnect efficiency', min:0.3, max:1,  step:0.05, fmt:v=>v.toFixed(2), tag:'U', help:'Fraction of the published link bandwidth an all-reduce actually achieves.' },
  alphaUs:     { label:'All-reduce latency (us)', min:0,   max:30, step:1,    fmt:v=>v.toFixed(0), tag:'U', help:'Fixed launch/latency cost added to each all-reduce.' },
  actTraffic:  { label:'Activation traffic (x)',  min:1,   max:6,  step:0.5,  fmt:v=>v.toFixed(1), tag:'U', help:'Activation bytes read+written per token per segment, as a multiple of one hidden-state vector.' },
  int4BwFactor:{ label:'INT4 bandwidth factor',   min:0.5, max:1,  step:0.05, fmt:v=>v.toFixed(2), tag:'A', help:'Extra bandwidth loss from dequantizing INT4 weights. 0.85 matches llama.cpp Q4_0 vs F16 decode on M5-class chips (Q4_0 reads 0.74-0.91 of the F16 effective bandwidth in the llama.cpp thread).' },
  sampleUs:    { label:'Token sample (µs)',       min:0,   max:5000, step:10, fmt:v=>v.toFixed(0), tag:'U', help:'Assumed CPU time to turn LM-head logits into the next token id. It is not part of the tok/s roofline. The on-screen gap uses this share of the step, and is at least 8% so the token return stays visible.' }
};
// Drawn share of one on-screen token used for CPU sampling plus the token returning to layer 1.
const AR_VIS_FLOOR = 0.08;

// ---- data helpers -------------------------------------------------------
function specV(raw, k, dflt) { const s = raw.specs && raw.specs[k]; return s && s.v != null ? s.v : (dflt == null ? null : dflt); }
// Flatten a schema-2 chip (specs with tags) to the flat object the engine uses. `raw` keeps the tagged source.
function flattenChip(raw) {
  return {
    id: raw.id, name: raw.name, short: raw.short, vendor: raw.vendor, arch: raw.arch, caption: raw.caption,
    unitName: raw.unitName, icName: raw.icName, memType: raw.memType, status: raw.status || 'announced',
    dies: raw.dies || 1, matrix: !!raw.matrix, notes: raw.notes || '', aliasOf: raw.aliasOf || null,
    fp16: specV(raw,'fp16'), fp8: specV(raw,'fp8'), bw: specV(raw,'bw'), cap: specV(raw,'cap'),
    usable: specV(raw,'usable',0.9), ic: specV(raw,'ic',0), maxTP: specV(raw,'maxTP',1), units: specV(raw,'units',1),
    eff: { mfuP: raw.eff.mfuP.v, mfuD: raw.eff.mfuD.v, bw: raw.eff.bw.v },
    raw: raw
  };
}
// Follow aliasOf (m5pro -> m5pro-18, m5max -> m5max-40) to the chip that owns the specs.
function resolveChipId(chips, id) {
  if (!id || !chips) return null;
  let cur = id;
  for (let n = 0; n < 8; n++) {
    const c = chips.find(x => x.id === cur);
    if (!c) return null;
    if (!c.aliasOf) return cur;
    cur = c.aliasOf;
  }
  return cur;
}
function deriveModel(m) {
  const kvd = m.kvHeads*m.headDim, dAttn = m.heads*m.headDim;
  const attnP = 2*m.h*dAttn + 2*m.h*kvd;          // q,o: h x dAttn each ; k,v: h x kvd each
  const expertP = 3*m.h*m.ffn;                    // gate, up, down
  const embed = m.vocab*m.h;
  const total = m.layers*(attnP + m.E*expertP) + 2*embed;
  const active = m.layers*(attnP + m.k*expertP) + embed;   // lm_head counted, input lookup free
  const kvPerTok = 2*m.layers*m.kvHeads*m.headDim;          // elements; multiply by kv bytes
  return Object.assign({}, m, { kvd, dAttn, attnP, expertP, embed, total, active, kvPerTok });
}
function chipRate(chip, prec) { return (prec === 'fp8' && chip.fp8) ? chip.fp8 : chip.fp16; }

// ---- core estimate ------------------------------------------------------
// o: {prec, B, L, phase, N, peak?, eff?:{mfuP,mfuD,bw}, effScale?}   assume: object like DEFAULT_ASSUME
function estimate(m0, chip, o, assume) {
  const A = Object.assign({}, DEFAULT_ASSUME, assume || {});
  const m = m0.attnP ? m0 : deriveModel(m0);
  const P = PRECS[o.prec], B = o.B, L = o.L, decode = o.phase === 'decode';
  const N = Math.max(1, Math.min(o.N || 1, chip.maxTP));
  const peak = !!o.peak;
  const sc = o.effScale || 1;
  const e = Object.assign({}, chip.eff, o.eff || {});
  const cl = x => Math.min(1, x*sc);
  const mfu = peak ? 1 : cl(decode ? e.mfuD : e.mfuP);
  const bwEff = peak ? 1 : cl(e.bw * (o.prec === 'int4' ? A.int4BwFactor : 1));
  const rate = chipRate(chip, o.prec)*1e12*mfu;             // FLOP/s per chip
  const bw   = chip.bw*1e9*bwEff;                           // B/s per chip
  const T = decode ? B : B*L;                               // tokens processed this phase
  const kvLayerBytes = 2*m.kvHeads*m.headDim*P.kv;
  const actB = 2;
  // attention segment (per layer, per chip)
  const attnCore = decode ? 4*m.dAttn*L*B : 2*m.dAttn*L*L*B;       // QK^T + AV; causal halves prefill
  const aF = (T*2*m.attnP + attnCore)/N;
  const aB = (m.attnP*P.w)/N + (B*L*kvLayerBytes)/N + T*m.h*actB*A.actTraffic;
  // MLP / MoE segment
  const Et = m.E > 1 ? m.E*(1 - Math.pow(1 - m.k/m.E, T)) : 1;   // expected distinct experts touched
  const mF = (T*2*m.k*m.expertP)/N;
  const mB = (Et*m.expertP*P.w)/N + T*m.h*actB*A.actTraffic;
  // lm_head (once per step; last-position logits only)
  const hF = (B*2*m.embed)/N, hB = (m.embed*P.w)/N;
  // tensor-parallel all-reduce (2 per layer; ring)
  let commOne = 0;
  if (N > 1 && chip.ic > 0) {
    const bytes = 2*(N-1)/N*T*m.h*actB;
    commOne = bytes/(chip.ic/2*1e9*(peak ? 1 : A.linkEff)) + (peak ? 0 : A.alphaUs*1e-6);
  }
  const mk = (F,Bt,comm) => { const tc=F/rate, tm=Bt/bw; return {F,Bt,tc,tm,comm,t:Math.max(tc,tm)+comm,core:Math.max(tc,tm),bound:tm>=tc?'mem':'comp'}; };
  const sA = mk(aF,aB,commOne), sM = mk(mF,mB,commOne), sH = mk(hF,hB,0);
  const n = m.layers;
  const total = n*(sA.t+sM.t)+sH.t;
  const sumTc = n*(sA.tc+sM.tc)+sH.tc, sumTm = n*(sA.tm+sM.tm)+sH.tm, sumComm = n*(sA.comm+sM.comm);
  const coreAll = n*(sA.core+sM.core)+sH.core;
  const coreMem = n*((sA.bound==='mem'?sA.core:0)+(sM.bound==='mem'?sM.core:0))+(sH.bound==='mem'?sH.core:0);
  const memShare = coreMem/coreAll, commShare = sumComm/total;
  const F = n*(sA.F+sM.F)+sH.F, Bt = n*(sA.Bt+sM.Bt)+sH.Bt;
  const weightGB = m.total*P.w/1e9, kvGB = B*L*m.kvPerTok*P.kv/1e9;
  const usableGB = chip.cap*chip.usable*N;
  const oom = weightGB + kvGB > usableGB;
  let bound = memShare >= 0.5 ? 'mem' : 'comp'; if (commShare > 0.4) bound = 'comm';
  return { m, N, segA:sA, segM:sM, segH:sH, n, total, sumTc, sumTm, sumComm, memShare, commShare, F, Bt,
    AI:F/Bt, achTF:F/total/1e12, peakTF:chipRate(chip,o.prec), ridge:(chipRate(chip,o.prec)*1e12)/(chip.bw*1e9),
    weightGB, kvGB, usableGB, capGB:chip.cap*N, oom, bound, decode,
    tokUser: decode?1/total:null, tokAgg: decode?B/total:null, ttft: decode?null:total, prefTput: decode?null:B*L/total };
}
// Estimate range: low/high = all efficiency factors x0.8 / x1.2 (capped at 1); ceiling = 100% of peak specs.
const RANGE_SPREAD = 0.2;
function estimateRange(m, chip, o, assume) {
  const mid = estimate(m, chip, o, assume);
  const lo = estimate(m, chip, Object.assign({}, o, { effScale: (o.effScale||1)*(1-RANGE_SPREAD) }), assume);
  const hi = estimate(m, chip, Object.assign({}, o, { effScale: (o.effScale||1)*(1+RANGE_SPREAD) }), assume);
  const ceil = estimate(m, chip, Object.assign({}, o, { peak: true }), assume);
  const key = mid.decode ? 'tokUser' : 'ttft';
  // for tok/s bigger is better, for TTFT smaller is better: report as worst..best
  const vals = [lo[key], mid[key], hi[key]];
  return { mid, lo, hi, ceil, key, worst: mid.decode ? Math.min(...vals) : Math.max(...vals), best: mid.decode ? Math.max(...vals) : Math.min(...vals) };
}
// Sensitivity: change in the headline metric when one factor is moved +/-20%.
function sensitivity(m, chip, o, assume) {
  const base = estimate(m, chip, o, assume), key = base.decode ? 'tokUser' : 'ttft';
  const e0 = Object.assign({}, chip.eff, o.eff || {}), out = [];
  const eff = (k, f) => Object.assign({}, e0, { [k]: Math.min(1, e0[k]*f) });
  const rows = [['bw','Bandwidth efficiency'], [base.decode?'mfuD':'mfuP', base.decode?'MFU (decode)':'MFU (prefill)']];
  for (const [k, label] of rows) {
    const dn = estimate(m, chip, Object.assign({}, o, { eff: eff(k, 0.8) }), assume)[key];
    const up = estimate(m, chip, Object.assign({}, o, { eff: eff(k, 1.2) }), assume)[key];
    out.push({ k, label, down: dn/base[key]-1, up: up/base[key]-1 });
  }
  return { key, base: base[key], rows: out };
}
function explain(a, b, ca, cb, o) {
  if (a.oom || b.oom) {
    const who = [a.oom?ca.short:null, b.oom?cb.short:null].filter(Boolean).join(' and ');
    return who+' cannot hold weights + KV cache here (OOM); the numbers shown for it are hypothetical. Try more chips (TP), FP8 or INT4, or a bigger-memory chip.';
  }
  const tA = a.total, tB = b.total, fast = tA<=tB ? ca : cb, slow = tA<=tB ? cb : ca, r = Math.max(tA,tB)/Math.min(tA,tB);
  const bwr = Math.max(ca.bw,cb.bw)/Math.min(ca.bw,cb.bw);
  const fr = chipRate(ca,o.prec)/chipRate(cb,o.prec), cr = Math.max(fr,1/fr);
  let why;
  if (a.bound==='mem' && b.bound==='mem') why = 'Both are memory-bound, so the gap tracks the memory-bandwidth ratio ('+bwr.toFixed(2)+'x), not peak FLOPS.';
  else if (a.bound==='comp' && b.bound==='comp') why = 'Both are compute-bound, so the gap tracks usable matrix throughput (peak-FLOPS ratio '+cr.toFixed(1)+'x).';
  else why = 'Mixed: '+(a.bound==='mem'?ca.short:cb.short)+' is limited by memory bandwidth while '+(a.bound==='mem'?cb.short:ca.short)+' is limited by something else (compute or interconnect).';
  if (a.bound==='comm' || b.bound==='comm') why += ' Tensor-parallel all-reduce is a large share of the time on at least one side.';
  return fast.short+' is '+r.toFixed(2)+'x faster than '+slow.short+' here. '+why;
}

// ---- share-state URL hash ----------------------------------------------
const BATCHES = [1,2,4,8,16,32,64,128,256], CTXS = [128,256,512,1024,2048,4096,8192,16384,32768];
const DEFAULT_STATE = { model:'qwen3-8b', A:'m5pro', B:'m6', phase:'decode', prec:'fp8', tp:1, B_:1, L:4096, spd:1, effA:null, effB:null, assume:null, ane:false };
// Neural Engine gate. Does not change estimate(): the bus is still chip.bw.
function aneGate(model, chip, prec, L) {
  const a = model && model.ane;
  const fail = (reason) => ({ ok:false, reason, parts:null, tag:a && a.tag, src:(a && a.src) || [] });
  if (!a || !a.viable) return fail((a && a.why) || 'No documented Neural Engine path for this model/size.');
  if (a.precisions && a.precisions.indexOf(prec) < 0) return fail(a.precWhy || 'No documented Neural Engine path for this precision.');
  if (a.maxContext && L > a.maxContext) return fail(a.ctxWhy || ('Documented Neural Engine context for this model stops at ' + a.maxContext + '.'));
  if (!chip || chip.arch !== 'apple') return fail('This chip has no Neural Engine.');
  const neural = chip.raw && chip.raw.specs && chip.raw.specs.neural;
  if (!neural || neural.v == null || neural.v === '') return fail('Neural Engine core count is not recorded for this chip.');
  return { ok:true, reason:'', parts:a.parts || {}, tag:a.tag, src:a.src || [], record:a };
}
function aneToggle(model, chips, prec, L) {
  const list = chips && chips.length ? chips : [null];
  const gates = list.map(c => aneGate(model, c, prec, L));
  const ok = gates.some(g => g.ok);
  let reason = '';
  if (!ok) {
    const reasons = [];
    gates.forEach(g => { if (g.reason && reasons.indexOf(g.reason) < 0) reasons.push(g.reason); });
    reason = reasons.join(' ') || 'No documented Neural Engine path for this model/size.';
  }
  return { ok, reason, gates };
}
const r3 = x => String(Math.round(x*1000)/1000);
// Encode only what differs from defaults for the optional overrides; always include the main controls.
function encodeState(S, chipsById) {
  const p = new URLSearchParams();
  p.set('m', S.model); p.set('a', S.A); p.set('b', S.B); p.set('ph', S.phase); p.set('p', S.prec);
  p.set('tp', S.tp); p.set('bs', S.B_); p.set('cx', S.L);
  if (S.spd !== 1) p.set('sp', S.spd);
  const effStr = (e, c) => e && c && (e.mfuP!==c.eff.mfuP || e.mfuD!==c.eff.mfuD || e.bw!==c.eff.bw) ? [e.mfuP,e.mfuD,e.bw].map(r3).join(',') : null;
  const ea = effStr(S.effA, chipsById && chipsById[S.A]), eb = effStr(S.effB, chipsById && chipsById[S.B]);
  if (ea) p.set('ea', ea); if (eb) p.set('eb', eb);
  if (S.assume) { const d = DEFAULT_ASSUME, k = Object.keys(d); if (k.some(x => S.assume[x] !== d[x])) p.set('g', k.map(x => r3(S.assume[x])).join(',')); }
  if (S.ane) p.set('ane', '1');
  return p.toString();
}
function decodeState(hash, chips, models) {
  const S = Object.assign({}, DEFAULT_STATE);
  const p = new URLSearchParams(String(hash||'').replace(/^#/, ''));
  const has = (arr, id) => arr.some(x => x.id === id);
  const pickChip = (key, fallback) => resolveChipId(chips, p.get(key)) || resolveChipId(chips, fallback) || fallback;
  if (has(models, p.get('m'))) S.model = p.get('m');
  S.A = pickChip('a', S.A);
  S.B = pickChip('b', S.B);
  if (['prefill','decode'].includes(p.get('ph'))) S.phase = p.get('ph');
  if (PRECS[p.get('p')]) S.prec = p.get('p');
  const tp = +p.get('tp'); if ([1,2,4,8].includes(tp)) S.tp = tp;
  const bs = +p.get('bs'); if (BATCHES.includes(bs)) S.B_ = bs;
  const cx = +p.get('cx'); if (CTXS.includes(cx)) S.L = cx;
  const sp = +p.get('sp'); if ([0.5,1,2].includes(sp)) S.spd = sp;
  const num3 = (s, lo, hi) => { if (!s) return null; const a = s.split(',').map(Number); return a.length===3 && a.every(x => Number.isFinite(x) && x>=lo && x<=hi) ? a : null; };
  const ea = num3(p.get('ea'), 0.02, 1), eb = num3(p.get('eb'), 0.02, 1);
  if (ea) S.effA = { mfuP:ea[0], mfuD:ea[1], bw:ea[2] };
  if (eb) S.effB = { mfuP:eb[0], mfuD:eb[1], bw:eb[2] };
  const g = p.get('g');
  if (g) { const a = g.split(',').map(Number), k = Object.keys(DEFAULT_ASSUME);
    if (a.length === k.length && a.every(Number.isFinite)) { S.assume = {}; k.forEach((x,i) => { const mt = ASSUME_META[x]; S.assume[x] = Math.min(mt.max, Math.max(mt.min, a[i])); }); } }
  S.ane = p.get('ane') === '1';
  if (S.ane) {
    const model = (models || []).find(m => m.id === S.model);
    const byId = {};
    (chips || []).forEach(c => { byId[c.id] = c; });
    if (!aneToggle(model, [byId[S.A], byId[S.B]], S.prec, S.L).ok) S.ane = false;
  }
  return S;
}

// Shared visual scale: 1 means refGBs. Both panels divide by the same reference
// (the slower chip), so the ratio of the results is the ratio of effective GB/s.
function flowScale(effGBs, refGBs) {
  const ref = refGBs > 0 ? refGBs : 1;
  return (effGBs > 0 ? effGBs : 0) / ref;
}
// One clock for both panels. wallSeconds is how long the slower chip's step takes
// on screen; every other chip takes wallSeconds * (its model time / that slower time).
// Shift a polyline onto a parallel lane. Positive dist is to the left of travel.
function offsetPolyline(pts, dist) {
  if (!pts || pts.length < 2 || !dist) return (pts || []).map(p => ({ x: p.x, y: p.y }));
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    let dx = 0, dy = 0, n = 0;
    if (i > 0) { const sx = pts[i].x - pts[i - 1].x, sy = pts[i].y - pts[i - 1].y, len = Math.hypot(sx, sy) || 1; dx += -sy / len; dy += sx / len; n++; }
    if (i < pts.length - 1) { const sx = pts[i + 1].x - pts[i].x, sy = pts[i + 1].y - pts[i].y, len = Math.hypot(sx, sy) || 1; dx += -sy / len; dy += sx / len; n++; }
    const len = Math.hypot(dx, dy) || 1;
    out.push({ x: pts[i].x + dist * dx / len, y: pts[i].y + dist * dy / len });
  }
  return out;
}
function animSeconds(modelSeconds, slowestModelSeconds, wallSeconds) {
  const slow = slowestModelSeconds > 0 ? slowestModelSeconds : 1;
  return modelSeconds * ((wallSeconds > 0 ? wallSeconds : 1) / slow);
}

// CPU sample after the LM head. Not added to estimate().total: tok/s stays the memory/compute step.
// truth is sample / (step + sample). drawn is at least AR_VIS_FLOOR so the return stays visible.
function arGap(stepSeconds, sampleUs) {
  const sec = Math.max(0, Number(sampleUs) || 0) * 1e-6;
  const step = stepSeconds > 0 ? stepSeconds : 0;
  const truth = sec / Math.max(1e-12, step + sec);
  return { sec, truth, drawn: Math.max(truth, AR_VIS_FLOOR) };
}

function fmtByte(b) {
  if (!(b > 0)) return '0 B';
  if (b >= 1e9) return (b / 1e9).toFixed(2).replace(/0$/, '').replace(/\.0$/, '') + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(2).replace(/0$/, '').replace(/\.0$/, '') + ' MB';
  if (b >= 1024) return (b / 1024).toFixed(b >= 10240 ? 0 : 1).replace(/\.0$/, '') + ' KB';
  return Math.round(b) + ' B';
}

// KV cache write for one new token: each layer stores K and V,
// 2 × kv heads × head dim × bytes. Weight bytes are the parameters,
// read once per step, so per token that total is divided by the tokens in the step.
function kvTraffic(m0, prec, phase, B, L) {
  const m = m0 && m0.kvPerTok != null ? m0 : deriveModel(m0);
  const P = PRECS[prec] || PRECS.fp16;
  const perLayer = 2 * m.kvHeads * m.headDim * P.kv;
  const perTok = m.layers * perLayer;
  const tokens = (phase === 'decode' ? 1 : Math.max(1, L || 1)) * Math.max(1, B || 1);
  const weightStep = m.total * P.w;
  const weightPerTok = weightStep / tokens;
  const ratio = weightPerTok > 0 ? perTok / weightPerTok : 0;
  const legend = 'KV write ~' + fmtByte(perTok) + '/token vs weights ' + fmtByte(weightPerTok) + '/token';
  return { perLayer, perTok, weightPerTok, weightStep, tokens, ratio, kvBytes: P.kv, wBytes: P.w, legend, hidden: m.h * 2 };
}

return { PRECS, DEFAULT_ASSUME, ASSUME_META, RANGE_SPREAD, BATCHES, CTXS, DEFAULT_STATE,
  flattenChip, resolveChipId, deriveModel, chipRate, estimate, estimateRange, sensitivity, explain, encodeState, decodeState,
  flowScale, animSeconds, offsetPolyline, arGap, AR_VIS_FLOOR, kvTraffic, fmtByte, aneGate, aneToggle };
});

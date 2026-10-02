// Extra upscalers for upscale-compare.html.
// Licenses for the ported algorithms are named on each shader.
// Classical filters that were already on the page stay in upscale-compare.html.

var UPSCALE_KERNELS = {};

UPSCALE_KERNELS.common = `
fn prx_lo_rcp(a: f32) -> f32 { return bitcast<f32>(0x7ef07ebbu - bitcast<u32>(a)); }
fn prx_med_rcp(a: f32) -> f32 {
  let b = bitcast<f32>(0x7ef19fffu - bitcast<u32>(a));
  return b * (-b * a + 2.0);
}
fn prx_lo_rsq(a: f32) -> f32 { return bitcast<f32>(0x5f347d74u - (bitcast<u32>(a) >> 1u)); }
fn prx_lo_sqrt(a: f32) -> f32 { return bitcast<f32>((bitcast<u32>(a) >> 1u) + 0x1fbc4639u); }
fn satf(a: f32) -> f32 { return clamp(a, 0.0, 1.0); }
fn prx_lo_rcp3(a: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(prx_lo_rcp(a.x), prx_lo_rcp(a.y), prx_lo_rcp(a.z));
}
fn sat3(c: vec3<f32>) -> vec3<f32> { return clamp(c, vec3<f32>(0.0), vec3<f32>(1.0)); }
fn tex_size(t: texture_2d<f32>) -> vec2<i32> {
  let d = textureDimensions(t);
  return vec2<i32>(i32(d.x), i32(d.y));
}
fn load_clamped(t: texture_2d<f32>, p: vec2<i32>) -> vec4<f32> {
  let d = tex_size(t);
  return textureLoad(t, clamp(p, vec2<i32>(0), d - vec2<i32>(1)), 0);
}
fn luma709(rgb: vec3<f32>) -> f32 {
  return dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}
fn bilinear_at(t: texture_2d<f32>, p: vec2<f32>) -> vec4<f32> {
  let i = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
  let f = p - vec2<f32>(floor(p.x), floor(p.y));
  let s00 = load_clamped(t, i);
  let s10 = load_clamped(t, i + vec2<i32>(1, 0));
  let s01 = load_clamped(t, i + vec2<i32>(0, 1));
  let s11 = load_clamped(t, i + vec2<i32>(1, 1));
  return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
}
fn mat_at(w: ptr<storage, array<f32>, read>, base: u32) -> mat4x4<f32> {
  return mat4x4<f32>(
    (*w)[base + 0u], (*w)[base + 1u], (*w)[base + 2u], (*w)[base + 3u],
    (*w)[base + 4u], (*w)[base + 5u], (*w)[base + 6u], (*w)[base + 7u],
    (*w)[base + 8u], (*w)[base + 9u], (*w)[base + 10u], (*w)[base + 11u],
    (*w)[base + 12u], (*w)[base + 13u], (*w)[base + 14u], (*w)[base + 15u]
  );
}
`;

// AMD FidelityFX Super Resolution 1, float EASU + RCAS from ffx_fsr1.h.
// Copyright (c) 2021 Advanced Micro Devices, Inc. MIT License.
// Gather4 taps are loaded directly. The published reciprocal approximations are kept.
UPSCALE_KERNELS.fsr = UPSCALE_KERNELS.common + `
@group(0) @binding(0) var src_tex: texture_2d<f32>;
@group(0) @binding(1) var dst_tex: texture_storage_2d<rgba8unorm, write>;

struct DirLen { dir: vec2<f32>, len: f32 }
struct TapAcc { color: vec3<f32>, w: f32 }

fn easu_set(state: DirLen, pp: vec2<f32>, which: i32, lA: f32, lB: f32, lC: f32, lD: f32, lE: f32) -> DirLen {
  var w = 0.0;
  if (which == 0) { w = (1.0 - pp.x) * (1.0 - pp.y); }
  else if (which == 1) { w = pp.x * (1.0 - pp.y); }
  else if (which == 2) { w = (1.0 - pp.x) * pp.y; }
  else { w = pp.x * pp.y; }
  let dc = lD - lC;
  let cb = lC - lB;
  var lenX = prx_lo_rcp(max(abs(dc), abs(cb)));
  let dirX = lD - lB;
  var dir = state.dir;
  dir.x = dir.x + dirX * w;
  lenX = satf(abs(dirX) * lenX);
  lenX = lenX * lenX;
  var len = state.len + lenX * w;
  let ec = lE - lC;
  let ca = lC - lA;
  var lenY = prx_lo_rcp(max(abs(ec), abs(ca)));
  let dirY = lE - lA;
  dir.y = dir.y + dirY * w;
  lenY = satf(abs(dirY) * lenY);
  lenY = lenY * lenY;
  len = len + lenY * w;
  return DirLen(dir, len);
}

fn easu_tap(acc: TapAcc, off: vec2<f32>, dir: vec2<f32>, len2: vec2<f32>, lob: f32, clp: f32, c: vec3<f32>) -> TapAcc {
  var v = vec2<f32>(off.x * dir.x + off.y * dir.y, off.x * (-dir.y) + off.y * dir.x);
  v = v * len2;
  let d2 = min(dot(v, v), clp);
  let wB0 = (2.0 / 5.0) * d2 + (-1.0);
  let wA0 = lob * d2 + (-1.0);
  var wB = wB0 * wB0;
  let wA = wA0 * wA0;
  wB = (25.0 / 16.0) * wB + (-(25.0 / 16.0 - 1.0));
  let w = wB * wA;
  return TapAcc(acc.color + c * w, acc.w + w);
}

fn amd_luma(c: vec3<f32>) -> f32 { return c.b * 0.5 + (c.r * 0.5 + c.g); }

@compute @workgroup_size(8, 8)
fn easu(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(dst_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let in_d = textureDimensions(src_tex);
  let scale = vec2<f32>(f32(in_d.x), f32(in_d.y)) / vec2<f32>(f32(out_d.x), f32(out_d.y));
  var pp = (vec2<f32>(f32(gid.x), f32(gid.y)) + vec2<f32>(0.5)) * scale - vec2<f32>(0.5);
  let fp = floor(pp);
  pp = pp - fp;
  let base = vec2<i32>(i32(fp.x), i32(fp.y));
  let b = load_clamped(src_tex, base + vec2<i32>(0, -1)).rgb;
  let c = load_clamped(src_tex, base + vec2<i32>(1, -1)).rgb;
  let e = load_clamped(src_tex, base + vec2<i32>(-1, 0)).rgb;
  let f = load_clamped(src_tex, base + vec2<i32>(0, 0)).rgb;
  let g = load_clamped(src_tex, base + vec2<i32>(1, 0)).rgb;
  let h = load_clamped(src_tex, base + vec2<i32>(2, 0)).rgb;
  let i = load_clamped(src_tex, base + vec2<i32>(-1, 1)).rgb;
  let j = load_clamped(src_tex, base + vec2<i32>(0, 1)).rgb;
  let k = load_clamped(src_tex, base + vec2<i32>(1, 1)).rgb;
  let l = load_clamped(src_tex, base + vec2<i32>(2, 1)).rgb;
  let n = load_clamped(src_tex, base + vec2<i32>(0, 2)).rgb;
  let o = load_clamped(src_tex, base + vec2<i32>(1, 2)).rgb;
  let bL = amd_luma(b); let cL = amd_luma(c); let eL = amd_luma(e); let fL = amd_luma(f);
  let gL = amd_luma(g); let hL = amd_luma(h); let iL = amd_luma(i); let jL = amd_luma(j);
  let kL = amd_luma(k); let lL = amd_luma(l); let nL = amd_luma(n); let oL = amd_luma(o);
  var st = DirLen(vec2<f32>(0.0), 0.0);
  st = easu_set(st, pp, 0, bL, eL, fL, gL, jL);
  st = easu_set(st, pp, 1, cL, fL, gL, hL, kL);
  st = easu_set(st, pp, 2, fL, iL, jL, kL, nL);
  st = easu_set(st, pp, 3, gL, jL, kL, lL, oL);
  var dir = st.dir;
  let dir2 = dir * dir;
  let zro = (dir2.x + dir2.y) < (1.0 / 32768.0);
  var dirR = prx_lo_rsq(dir2.x + dir2.y);
  if (zro) { dirR = 1.0; dir.x = 1.0; }
  dir = dir * dirR;
  var len = st.len * 0.5;
  len = len * len;
  let stretch = (dir.x * dir.x + dir.y * dir.y) * prx_lo_rcp(max(abs(dir.x), abs(dir.y)));
  let len2 = vec2<f32>(1.0 + (stretch - 1.0) * len, 1.0 + (-0.5) * len);
  let lob = 0.5 + ((0.25 - 0.04) - 0.5) * len;
  let clp = prx_lo_rcp(lob);
  let min4 = min(min(min(f, g), j), k);
  let max4 = max(max(max(f, g), j), k);
  var acc = TapAcc(vec3<f32>(0.0), 0.0);
  acc = easu_tap(acc, vec2<f32>(0.0, -1.0) - pp, dir, len2, lob, clp, b);
  acc = easu_tap(acc, vec2<f32>(1.0, -1.0) - pp, dir, len2, lob, clp, c);
  acc = easu_tap(acc, vec2<f32>(-1.0, 1.0) - pp, dir, len2, lob, clp, i);
  acc = easu_tap(acc, vec2<f32>(0.0, 1.0) - pp, dir, len2, lob, clp, j);
  acc = easu_tap(acc, vec2<f32>(0.0, 0.0) - pp, dir, len2, lob, clp, f);
  acc = easu_tap(acc, vec2<f32>(-1.0, 0.0) - pp, dir, len2, lob, clp, e);
  acc = easu_tap(acc, vec2<f32>(1.0, 1.0) - pp, dir, len2, lob, clp, k);
  acc = easu_tap(acc, vec2<f32>(2.0, 1.0) - pp, dir, len2, lob, clp, l);
  acc = easu_tap(acc, vec2<f32>(2.0, 0.0) - pp, dir, len2, lob, clp, h);
  acc = easu_tap(acc, vec2<f32>(1.0, 0.0) - pp, dir, len2, lob, clp, g);
  acc = easu_tap(acc, vec2<f32>(1.0, 2.0) - pp, dir, len2, lob, clp, o);
  acc = easu_tap(acc, vec2<f32>(0.0, 2.0) - pp, dir, len2, lob, clp, n);
  let pix = min(max4, max(min4, acc.color * (1.0 / acc.w)));
  textureStore(dst_tex, vec2<i32>(i32(gid.x), i32(gid.y)), vec4<f32>(sat3(pix), 1.0));
}

@compute @workgroup_size(8, 8)
fn rcas(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(dst_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let sp = vec2<i32>(i32(gid.x), i32(gid.y));
  let b = load_clamped(src_tex, sp + vec2<i32>(0, -1)).rgb;
  let d = load_clamped(src_tex, sp + vec2<i32>(-1, 0)).rgb;
  let e = load_clamped(src_tex, sp).rgb;
  let f = load_clamped(src_tex, sp + vec2<i32>(1, 0)).rgb;
  let h = load_clamped(src_tex, sp + vec2<i32>(0, 1)).rgb;
  let bL = amd_luma(b); let dL = amd_luma(d); let eL = amd_luma(e); let fL = amd_luma(f); let hL = amd_luma(h);
  var nz = 0.25 * bL + 0.25 * dL + 0.25 * fL + 0.25 * hL - eL;
  let mxL = max(max(max(bL, dL), eL), max(fL, hL));
  let mnL = min(min(min(bL, dL), eL), min(fL, hL));
  nz = satf(abs(nz) * prx_med_rcp(mxL - mnL));
  nz = -0.5 * nz + 1.0;
  let mn4 = min(min(min(b, d), f), h);
  let mx4 = max(max(max(b, d), f), h);
  let hitMin = min(mn4, e) * prx_lo_rcp3(4.0 * mx4);
  let peak = vec2<f32>(1.0, -4.0);
  let hitMax = (vec3<f32>(peak.x) - max(mx4, e)) * prx_lo_rcp3(4.0 * mn4 + vec3<f32>(peak.y));
  let lobeRGB = max(-hitMin, hitMax);
  // Sharpness 0.2 stops (FsrRcasCon). Denoise path is the published FSR_RCAS_DENOISE option, left off.
  let con = exp2(-0.2);
  let lobeLim = max(-(0.25 - (1.0 / 16.0)), min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0.0)) * con;
  let rcpL = prx_med_rcp(4.0 * lobeLim + 1.0);
  let pix = (lobeLim * b + lobeLim * d + lobeLim * h + lobeLim * f + e) * rcpL;
  textureStore(dst_tex, sp, vec4<f32>(sat3(pix), 1.0));
}
`;

// FSR 1 RCAS as a post-pass. Same published filter as rcas above, with the
// sharpness stops in a uniform (FsrRcasCon: 0 strongest, 2 mildest).
// The FSR 1 panel keeps its baked 0.2 and does not read this uniform.
UPSCALE_KERNELS.rcasPost = UPSCALE_KERNELS.common + `
@group(0) @binding(0) var src_tex: texture_2d<f32>;
@group(0) @binding(1) var dst_tex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> sharp: vec4<f32>;

fn amd_luma_p(c: vec3<f32>) -> f32 { return c.b * 0.5 + (c.r * 0.5 + c.g); }

@compute @workgroup_size(8, 8)
fn rcas_post(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(dst_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let sp = vec2<i32>(i32(gid.x), i32(gid.y));
  let b = load_clamped(src_tex, sp + vec2<i32>(0, -1)).rgb;
  let d = load_clamped(src_tex, sp + vec2<i32>(-1, 0)).rgb;
  let e = load_clamped(src_tex, sp).rgb;
  let f = load_clamped(src_tex, sp + vec2<i32>(1, 0)).rgb;
  let h = load_clamped(src_tex, sp + vec2<i32>(0, 1)).rgb;
  let mn4 = min(min(min(b, d), f), h);
  let mx4 = max(max(max(b, d), f), h);
  let hitMin = min(mn4, e) * prx_lo_rcp3(4.0 * mx4);
  let peak = vec2<f32>(1.0, -4.0);
  let hitMax = (vec3<f32>(peak.x) - max(mx4, e)) * prx_lo_rcp3(4.0 * mn4 + vec3<f32>(peak.y));
  let lobeRGB = max(-hitMin, hitMax);
  let con = exp2(-sharp.x);
  let lobeLim = max(-(0.25 - (1.0 / 16.0)), min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0.0)) * con;
  let rcpL = prx_med_rcp(4.0 * lobeLim + 1.0);
  let pix = (lobeLim * b + lobeLim * d + lobeLim * h + lobeLim * f + e) * rcpL;
  textureStore(dst_tex, sp, vec4<f32>(sat3(pix), 1.0));
}
`;

// AMD FidelityFX Contrast Adaptive Sharpening, non-scaling CasFilter() from ffx_cas.h.
// Copyright (c) 2019-2021 Advanced Micro Devices, Inc. MIT License.
// The page runs this on a bilinear upsample, which is the "CAS-sharpened bilinear" path
// (CasFilter noScaling = true). Sharpness 0.5. Fast path, not CAS_BETTER_DIAGONALS.
UPSCALE_KERNELS.cas = UPSCALE_KERNELS.common + `
@group(0) @binding(0) var src_tex: texture_2d<f32>;
@group(0) @binding(1) var dst_tex: texture_storage_2d<rgba8unorm, write>;

fn min3(a: f32, b: f32, c: f32) -> f32 { return min(a, min(b, c)); }
fn max3(a: f32, b: f32, c: f32) -> f32 { return max(a, max(b, c)); }

@compute @workgroup_size(8, 8)
fn cas(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(dst_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let sp = vec2<i32>(i32(gid.x), i32(gid.y));
  let b = load_clamped(src_tex, sp + vec2<i32>(0, -1)).rgb;
  let d = load_clamped(src_tex, sp + vec2<i32>(-1, 0)).rgb;
  let e = load_clamped(src_tex, sp).rgb;
  let f = load_clamped(src_tex, sp + vec2<i32>(1, 0)).rgb;
  let h = load_clamped(src_tex, sp + vec2<i32>(0, 1)).rgb;
  let mnR = min3(min3(d.r, e.r, f.r), b.r, h.r);
  let mnG = min3(min3(d.g, e.g, f.g), b.g, h.g);
  let mnB = min3(min3(d.b, e.b, f.b), b.b, h.b);
  let mxR = max3(max3(d.r, e.r, f.r), b.r, h.r);
  let mxG = max3(max3(d.g, e.g, f.g), b.g, h.g);
  let mxB = max3(max3(d.b, e.b, f.b), b.b, h.b);
  let ampR = satf(min(mnR, 1.0 - mxR) * prx_lo_rcp(mxR));
  let ampG = satf(min(mnG, 1.0 - mxG) * prx_lo_rcp(mxG));
  let ampB = satf(min(mnB, 1.0 - mxB) * prx_lo_rcp(mxB));
  let wG = prx_lo_sqrt(ampG) * (-1.0 / mix(8.0, 5.0, 0.5));
  let rcpW = prx_med_rcp(1.0 + 4.0 * wG);
  let pix = vec3<f32>(
    satf((b.r * wG + d.r * wG + f.r * wG + h.r * wG + e.r) * rcpW),
    satf((b.g * wG + d.g * wG + f.g * wG + h.g * wG + e.g) * rcpW),
    satf((b.b * wG + d.b * wG + f.b * wG + h.b * wG + e.b) * rcpW)
  );
  textureStore(dst_tex, sp, vec4<f32>(pix, 1.0));
}
`;

// Lanczos is the page's existing radius-3 filter. This pass is a classic 3x3 unsharp mask
// (amount 0.6) on that result. It is not a renamed copy of another panel.
UPSCALE_KERNELS.unsharp = UPSCALE_KERNELS.common + `
@group(0) @binding(0) var src_tex: texture_2d<f32>;
@group(0) @binding(1) var dst_tex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn unsharp(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(dst_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let sp = vec2<i32>(i32(gid.x), i32(gid.y));
  var blur = vec3<f32>(0.0);
  var wsum = 0.0;
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let wx = select(1.0, 2.0, x == 0);
      let wy = select(1.0, 2.0, y == 0);
      let w = wx * wy;
      blur += load_clamped(src_tex, sp + vec2<i32>(x, y)).rgb * w;
      wsum += w;
    }
  }
  blur = blur / wsum;
  let base = load_clamped(src_tex, sp).rgb;
  let pix = sat3(base + 0.6 * (base - blur));
  textureStore(dst_tex, sp, vec4<f32>(pix, 1.0));
}
`;

// Hyllian xBR-lv2, CORNER_C + SMOOTH_TIPS, the defaults in xbr-lv2.glsl.
// Copyright (C) 2011-2016 Hyllian. MIT License.
// f4 is read by CORNER_C but never written on the small_details = 0 path in that file;
// it is zero here. Samples are bilinear, matching the original texture() lookups.
UPSCALE_KERNELS.xbr = UPSCALE_KERNELS.common + `
struct XbrU { scale: f32, pad0: f32, pad1: f32, pad2: f32 }
@group(0) @binding(0) var src_tex: texture_2d<f32>;
@group(0) @binding(1) var dst_tex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> xbr_u: XbrU;

fn bstep(edge: vec4<f32>, x: vec4<f32>) -> vec4<f32> { return step(edge, x); }
fn v4eq(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> { return step(abs(a - b), vec4<f32>(15.0)); }
fn v4neq(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> { return vec4<f32>(1.0) - v4eq(a, b); }
fn v4diff(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    select(0.0, 1.0, a.x != b.x),
    select(0.0, 1.0, a.y != b.y),
    select(0.0, 1.0, a.z != b.z),
    select(0.0, 1.0, a.w != b.w)
  );
}
fn v4wd(a: vec4<f32>, b: vec4<f32>, c: vec4<f32>, d: vec4<f32>, e: vec4<f32>, f: vec4<f32>, g: vec4<f32>, h: vec4<f32>) -> vec4<f32> {
  return abs(a - b) + abs(a - c) + abs(d - e) + abs(d - f) + 4.0 * abs(g - h);
}
fn cdf(c1: vec3<f32>, c2: vec3<f32>) -> f32 {
  let d = abs(c1 - c2);
  return d.r + d.g + d.b;
}

@compute @workgroup_size(8, 8)
fn xbr(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(dst_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let td = textureDimensions(src_tex);
  let in_d = vec2<f32>(f32(td.x), f32(td.y));
  let uv = (vec2<f32>(f32(gid.x), f32(gid.y)) + vec2<f32>(0.5)) / vec2<f32>(f32(out_d.x), f32(out_d.y));
  let dx = 1.0 / in_d.x;
  let dy = 1.0 / in_d.y;
  let rgbw = vec3<f32>(14.352, 28.176, 5.472);
  fn_sample_done(gid, uv, dx, dy, in_d, rgbw);
}

fn sample_uv(uv: vec2<f32>, in_d: vec2<f32>) -> vec3<f32> {
  return bilinear_at(src_tex, uv * in_d - vec2<f32>(0.5)).rgb;
}

fn fn_sample_done(gid: vec3<u32>, uv: vec2<f32>, dx: f32, dy: f32, in_d: vec2<f32>, rgbw: vec3<f32>) {
  let A1 = sample_uv(uv + vec2<f32>(-dx, -2.0 * dy), in_d);
  let B1 = sample_uv(uv + vec2<f32>(0.0, -2.0 * dy), in_d);
  let C1 = sample_uv(uv + vec2<f32>(dx, -2.0 * dy), in_d);
  let A = sample_uv(uv + vec2<f32>(-dx, -dy), in_d);
  let B = sample_uv(uv + vec2<f32>(0.0, -dy), in_d);
  let C = sample_uv(uv + vec2<f32>(dx, -dy), in_d);
  let D = sample_uv(uv + vec2<f32>(-dx, 0.0), in_d);
  let E = sample_uv(uv, in_d);
  let F = sample_uv(uv + vec2<f32>(dx, 0.0), in_d);
  let G = sample_uv(uv + vec2<f32>(-dx, dy), in_d);
  let H = sample_uv(uv + vec2<f32>(0.0, dy), in_d);
  let I = sample_uv(uv + vec2<f32>(dx, dy), in_d);
  let G5 = sample_uv(uv + vec2<f32>(-dx, 2.0 * dy), in_d);
  let H5 = sample_uv(uv + vec2<f32>(0.0, 2.0 * dy), in_d);
  let I5 = sample_uv(uv + vec2<f32>(dx, 2.0 * dy), in_d);
  let A0 = sample_uv(uv + vec2<f32>(-2.0 * dx, -dy), in_d);
  let D0 = sample_uv(uv + vec2<f32>(-2.0 * dx, 0.0), in_d);
  let G0 = sample_uv(uv + vec2<f32>(-2.0 * dx, dy), in_d);
  let C4 = sample_uv(uv + vec2<f32>(2.0 * dx, -dy), in_d);
  let F4 = sample_uv(uv + vec2<f32>(2.0 * dx, 0.0), in_d);
  let I4 = sample_uv(uv + vec2<f32>(2.0 * dx, dy), in_d);

  let b = vec4<f32>(dot(B, rgbw), dot(D, rgbw), dot(H, rgbw), dot(F, rgbw));
  let c = vec4<f32>(dot(C, rgbw), dot(A, rgbw), dot(G, rgbw), dot(I, rgbw));
  let d = b.yzwx;
  let e = vec4<f32>(dot(E, rgbw));
  let f = b.wxyz;
  let g = c.zwxy;
  let h = b.zwxy;
  let i = c.wxyz;
  let i4 = vec4<f32>(dot(I4, rgbw), dot(C1, rgbw), dot(A0, rgbw), dot(G5, rgbw));
  let i5 = vec4<f32>(dot(I5, rgbw), dot(C4, rgbw), dot(A1, rgbw), dot(G0, rgbw));
  let h5 = vec4<f32>(dot(H5, rgbw), dot(F4, rgbw), dot(B1, rgbw), dot(D0, rgbw));
  let f4 = vec4<f32>(0.0);

  let fp = fract(uv * in_d);
  let Ao = vec4<f32>(1.0, -1.0, -1.0, 1.0);
  let Bo = vec4<f32>(1.0, 1.0, -1.0, -1.0);
  let Co = vec4<f32>(1.5, 0.5, -0.5, 0.5);
  let Ax = vec4<f32>(1.0, -1.0, -1.0, 1.0);
  let Bx = vec4<f32>(0.5, 2.0, -0.5, -2.0);
  let Cx = vec4<f32>(1.0, 1.0, -0.5, 0.0);
  let Ay = vec4<f32>(1.0, -1.0, -1.0, 1.0);
  let By = vec4<f32>(2.0, 0.5, -2.0, -0.5);
  let Cy = vec4<f32>(2.0, 0.0, -1.0, 0.5);
  let Ci = vec4<f32>(0.25);
  let sc = xbr_u.scale;
  let delta = vec4<f32>(1.0 / sc);
  let delta_l = vec4<f32>(0.5 / sc, 1.0 / sc, 0.5 / sc, 1.0 / sc);
  let delta_u = delta_l.yxwz;
  let fx = Ao * fp.y + Bo * fp.x;
  let fx_l = Ax * fp.y + Bx * fp.x;
  let fx_u = Ay * fp.y + By * fp.x;
  let irlv0 = v4diff(e, f) * v4diff(e, h);
  let irlv1 = irlv0 * (v4neq(f, b) * v4neq(f, c) + v4neq(h, d) * v4neq(h, g) + v4eq(e, i) * (v4neq(f, f4) * v4neq(f, i4) + v4neq(h, h5) * v4neq(h, i5)) + v4eq(e, g) + v4eq(e, c));
  let irlv2l = v4diff(e, g) * v4diff(d, g);
  let irlv2u = v4diff(e, c) * v4diff(b, c);
  var fx45i = clamp((fx + delta - Co - Ci) / (2.0 * delta), vec4<f32>(0.0), vec4<f32>(1.0));
  var fx45 = clamp((fx + delta - Co) / (2.0 * delta), vec4<f32>(0.0), vec4<f32>(1.0));
  var fx30 = clamp((fx_l + delta_l - Cx) / (2.0 * delta_l), vec4<f32>(0.0), vec4<f32>(1.0));
  var fx60 = clamp((fx_u + delta_u - Cy) / (2.0 * delta_u), vec4<f32>(0.0), vec4<f32>(1.0));
  let wd1 = v4wd(e, c, g, i, h5, f4, h, f);
  let wd2 = v4wd(h, d, i5, f, i4, b, e, i);
  let edri = step(wd1, wd2) * irlv0;
  let edr = step(wd1 + vec4<f32>(0.1), wd2) * step(vec4<f32>(0.5), irlv1);
  let lv2 = 2.0;
  let edr_l = step(lv2 * abs(f - g), abs(h - c)) * irlv2l * edr;
  let edr_u = step(lv2 * abs(h - c), abs(f - g)) * irlv2u * edr;
  fx45 = edr * fx45;
  fx30 = edr_l * fx30;
  fx60 = edr_u * fx60;
  fx45i = edri * fx45i;
  let px = step(abs(e - f), abs(e - h));
  let maximos = max(max(fx30, fx60), max(fx45, fx45i));
  var res1 = E;
  res1 = mix(res1, mix(H, F, px.x), maximos.x);
  res1 = mix(res1, mix(B, D, px.z), maximos.z);
  var res2 = E;
  res2 = mix(res2, mix(F, B, px.y), maximos.y);
  res2 = mix(res2, mix(D, H, px.w), maximos.w);
  let res = mix(res1, res2, step(cdf(E, res1), cdf(E, res2)));
  textureStore(dst_tex, vec2<i32>(i32(gid.x), i32(gid.y)), vec4<f32>(sat3(res), 1.0));
}
`;

// NVIDIA Image Scaling NVScaler, MIT, Copyright (c) 2022 NVIDIA CORPORATION & AFFILIATES.
// Same filter banks, edge map, and directional polynomials as NIS_Scaler.h.
// Evaluated per output pixel instead of the SDK's shared-memory tiles.
// Constants are NVScalerUpdateConfig at sharpness 0.5, SDR. Official NVScaler
// rejects scales below 0.5, so 4x is two 2x passes.
UPSCALE_KERNELS.nis = UPSCALE_KERNELS.common + `
struct NisU { scale_x: f32, scale_y: f32, pad0: f32, pad1: f32 }
@group(0) @binding(0) var src_tex: texture_2d<f32>;
@group(0) @binding(1) var dst_tex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<storage, read> coef_scale: array<f32>;
@group(0) @binding(3) var<storage, read> coef_usm: array<f32>;
@group(0) @binding(4) var<uniform> nis_u: NisU;

const NIS_DETECT_RATIO: f32 = 2.201171875;
const NIS_DETECT_THRES: f32 = 0.0625;
const NIS_MIN_CONTRAST: f32 = 2.0;
const NIS_RATIO_NORM: f32 = 0.125;
const NIS_CONTRAST_BOOST: f32 = 1.0;
const NIS_EPS: f32 = 1.0 / 255.0;
const NIS_SHARP_START: f32 = 0.45;
const NIS_SHARP_SCALE: f32 = 2.22222222;
const NIS_SHARP_MIN: f32 = 0.4;
const NIS_SHARP_STRENGTH_SCALE: f32 = 1.2;
const NIS_LIMIT_MIN: f32 = 0.14;
const NIS_LIMIT_SCALE: f32 = 0.36;

fn coef_at(bank: u32, phase: i32, tap: i32) -> f32 {
  let idx = u32(clamp(phase, 0, 63)) * 8u + u32(tap);
  if (bank == 0u) { return coef_scale[idx]; }
  return coef_usm[idx];
}

fn edge_map(p00: f32, p01: f32, p02: f32, p10: f32, p11: f32, p12: f32, p20: f32, p21: f32, p22: f32) -> vec4<f32> {
  let g0 = abs(p00 + p01 + p02 - p20 - p21 - p22);
  let g45 = abs(p10 + p00 + p01 - p21 - p22 - p12);
  let g90 = abs(p00 + p10 + p20 - p02 - p12 - p22);
  let g135 = abs(p10 + p20 + p21 - p01 - p02 - p12);
  let g090_max = max(g0, g90);
  let g090_min = min(g0, g90);
  let g45135_max = max(g45, g135);
  let g45135_min = min(g45, g135);
  if (g090_max + g45135_max == 0.0) { return vec4<f32>(0.0); }
  let e090 = min(g090_max / (g090_max + g45135_max), 1.0);
  let e45135 = 1.0 - e090;
  let c090 = (g090_max > (g090_min * NIS_DETECT_RATIO)) && (g090_max > NIS_DETECT_THRES) && (g090_max > g45135_min);
  let c45135 = (g45135_max > (g45135_min * NIS_DETECT_RATIO)) && (g45135_max > NIS_DETECT_THRES) && (g45135_max > g090_min);
  let f090 = select(1.0, e090, c090 && c45135);
  let f45135 = select(1.0, e45135, c090 && c45135);
  let w0 = select(0.0, f090, c090 && (g090_max == g0));
  let w90 = select(0.0, f090, c090 && (g090_max != g0));
  let w45 = select(0.0, f45135, c45135 && (g45135_max == g45));
  let w135 = select(0.0, f45135, c45135 && (g45135_max != g45));
  return vec4<f32>(w0, w90, w45, w135);
}

fn calc_lti(p0: f32, p1: f32, p2: f32, p3: f32, p4: f32, p5: f32, phase: i32) -> f32 {
  let sel_a = select(p3, p0, phase <= 32);
  let a_min = min(min(p1, p2), sel_a);
  let a_max = max(max(p1, p2), sel_a);
  let sel_b = select(p5, p2, phase <= 32);
  let b_min = min(min(p3, p4), sel_b);
  let b_max = max(max(p3, p4), sel_b);
  let a_cont = a_max - a_min;
  let b_cont = b_max - b_min;
  let cont_ratio = max(a_cont, b_cont) / (min(a_cont, b_cont) + NIS_EPS);
  return (1.0 - satf((cont_ratio - NIS_MIN_CONTRAST) * NIS_RATIO_NORM)) * NIS_CONTRAST_BOOST;
}

fn eval_poly6(pxl: array<f32, 6>, phase: i32) -> f32 {
  var y = 0.0;
  var y_usm = 0.0;
  for (var i = 0; i < 6; i++) {
    y += coef_at(0u, phase, i) * pxl[i];
    y_usm += coef_at(1u, phase, i) * pxl[i];
  }
  let y_scale = 1.0 - satf((y - NIS_SHARP_START) * NIS_SHARP_SCALE);
  let y_sharpness = y_scale * NIS_SHARP_STRENGTH_SCALE + NIS_SHARP_MIN;
  y_usm *= y_sharpness;
  let y_sharpness_limit = (y_scale * NIS_LIMIT_SCALE + NIS_LIMIT_MIN) * y;
  y_usm = min(y_sharpness_limit, max(-y_sharpness_limit, y_usm));
  y_usm *= calc_lti(pxl[0], pxl[1], pxl[2], pxl[3], pxl[4], pxl[5], phase);
  return y + y_usm;
}

fn filter_normal(p: array<array<f32, 6>, 6>, phase_x: i32, phase_y: i32) -> f32 {
  var h_acc = 0.0;
  for (var j = 0; j < 6; j++) {
    var v_acc = 0.0;
    for (var i = 0; i < 6; i++) {
      v_acc += p[i][j] * coef_at(0u, phase_y, i);
    }
    h_acc += v_acc * coef_at(0u, phase_x, j);
  }
  return h_acc;
}

@compute @workgroup_size(8, 8)
fn nis(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(dst_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let src_x = (0.5 + f32(gid.x)) * nis_u.scale_x - 0.5;
  let src_y = (0.5 + f32(gid.y)) * nis_u.scale_y - 0.5;
  let floor_x = floor(src_x);
  let floor_y = floor(src_y);
  let fx = src_x - floor_x;
  let fy = src_y - floor_y;
  let phase_x = i32(fx * 64.0);
  let phase_y = i32(fy * 64.0);
  let origin = vec2<i32>(i32(floor_x), i32(floor_y)) - vec2<i32>(2, 2);
  var p: array<array<f32, 6>, 6>;
  for (var i = 0; i < 6; i++) {
    for (var j = 0; j < 6; j++) {
      p[i][j] = luma709(load_clamped(src_tex, origin + vec2<i32>(j, i)).rgb);
    }
  }
  var edge: array<vec4<f32>, 4>;
  for (var ey = 0; ey < 2; ey++) {
    for (var ex = 0; ex < 2; ex++) {
      let o = origin + vec2<i32>(2, 2) + vec2<i32>(ex, ey) - vec2<i32>(1, 1);
      var q: array<array<f32, 4>, 4>;
      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
          q[i][j] = luma709(load_clamped(src_tex, o + vec2<i32>(j, i)).rgb);
        }
      }
      edge[ey * 2 + ex] = edge_map(q[0][0], q[0][1], q[0][2], q[1][0], q[1][1], q[1][2], q[2][0], q[2][1], q[2][2]);
    }
  }
  let h0 = mix(edge[0], edge[1], fx);
  let h1 = mix(edge[2], edge[3], fx);
  let w = mix(h0, h1, fy);
  let base_w = 1.0 - w.x - w.y - w.z - w.w;
  var op_y = filter_normal(p, phase_x, phase_y) * base_w;
  if (w.x > 0.0) {
    var row: array<f32, 6>;
    for (var i = 0; i < 6; i++) { row[i] = mix(p[i][2], p[i][3], fx); }
    op_y += eval_poly6(row, phase_y) * w.x;
  }
  if (w.y > 0.0) {
    var col: array<f32, 6>;
    for (var i = 0; i < 6; i++) { col[i] = mix(p[2][i], p[3][i], fy); }
    op_y += eval_poly6(col, phase_x) * w.y;
  }
  if (w.z > 0.0) {
    var pphase = 0.5 + 0.5 * (fx - fy);
    var temp: array<f32, 7>;
    temp[1] = mix(p[2][1], p[1][2], pphase);
    temp[3] = mix(p[3][2], p[2][3], pphase);
    temp[5] = mix(p[4][3], p[3][4], pphase);
    let shifted = pphase - 0.5;
    let a = select(p[2][0], p[0][2], shifted >= 0.0);
    let b = select(p[3][1], p[1][3], shifted >= 0.0);
    let c = select(p[4][2], p[2][4], shifted >= 0.0);
    let d = select(p[5][3], p[3][5], shifted >= 0.0);
    temp[0] = mix(p[1][1], a, abs(shifted));
    temp[2] = mix(p[2][2], b, abs(shifted));
    temp[4] = mix(p[3][3], c, abs(shifted));
    temp[6] = mix(p[4][4], d, abs(shifted));
    var diag: array<f32, 6>;
    var pphase_p = fx + fy;
    if (pphase_p >= 1.0) {
      for (var i = 0; i < 6; i++) { diag[i] = temp[i + 1]; }
      pphase_p = pphase_p - 1.0;
    } else {
      for (var i = 0; i < 6; i++) { diag[i] = temp[i]; }
    }
    op_y += eval_poly6(diag, i32(pphase_p * 64.0)) * w.z;
  }
  if (w.w > 0.0) {
    var pphase135 = 0.5 * (fx + fy);
    var temp135: array<f32, 7>;
    temp135[1] = mix(p[3][1], p[4][2], pphase135);
    temp135[3] = mix(p[2][2], p[3][3], pphase135);
    temp135[5] = mix(p[1][3], p[2][4], pphase135);
    let shifted135 = pphase135 - 0.5;
    let a135 = select(p[3][0], p[5][2], shifted135 >= 0.0);
    let b135 = select(p[2][1], p[4][3], shifted135 >= 0.0);
    let c135 = select(p[1][2], p[3][4], shifted135 >= 0.0);
    let d135 = select(p[0][3], p[2][5], shifted135 >= 0.0);
    temp135[0] = mix(p[4][1], a135, abs(shifted135));
    temp135[2] = mix(p[3][2], b135, abs(shifted135));
    temp135[4] = mix(p[2][3], c135, abs(shifted135));
    temp135[6] = mix(p[1][4], d135, abs(shifted135));
    var diag135: array<f32, 6>;
    var pphase_p135 = 1.0 + (fx - fy);
    if (pphase_p135 >= 1.0) {
      for (var i = 0; i < 6; i++) { diag135[i] = temp135[i + 1]; }
      pphase_p135 = pphase_p135 - 1.0;
    } else {
      for (var i = 0; i < 6; i++) { diag135[i] = temp135[i]; }
    }
    op_y += eval_poly6(diag135, i32(pphase_p135 * 64.0)) * w.w;
  }
  let chroma_p = vec2<f32>(src_x, src_y);
  let base = bilinear_at(src_tex, chroma_p);
  let y = luma709(base.rgb);
  let corr = op_y - y;
  textureStore(dst_tex, vec2<i32>(i32(gid.x), i32(gid.y)), vec4<f32>(sat3(base.rgb + vec3<f32>(corr)), 1.0));
}
`;

// Anime4K v3/v4 conv hooks. MIT, Copyright (c) 2019-2021 bloc97.
// mat4 lists are the GLSL source order (column-major). ReLU is the published
// positive/negative split, not a pointwise relu after a dense conv.
UPSCALE_KERNELS.a4kConv3 = `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<storage, read> w: array<f32>;

fn mat_at(base: u32) -> mat4x4<f32> {
  return mat4x4<f32>(
    w[base + 0u], w[base + 1u], w[base + 2u], w[base + 3u],
    w[base + 4u], w[base + 5u], w[base + 6u], w[base + 7u],
    w[base + 8u], w[base + 9u], w[base + 10u], w[base + 11u],
    w[base + 12u], w[base + 13u], w[base + 14u], w[base + 15u]
  );
}

const TAPS = array<vec2<i32>, 9>(
  vec2<i32>(-1, -1), vec2<i32>(-1, 0), vec2<i32>(-1, 1),
  vec2<i32>(0, -1), vec2<i32>(0, 0), vec2<i32>(0, 1),
  vec2<i32>(1, -1), vec2<i32>(1, 0), vec2<i32>(1, 1)
);

@compute @workgroup_size(8, 8)
fn conv3(@builtin(global_invocation_id) gid: vec3<u32>) {
  let size = vec2<i32>(i32(textureDimensions(dst).x), i32(textureDimensions(dst).y));
  let id = vec2<i32>(i32(gid.x), i32(gid.y));
  if (id.x >= size.x || id.y >= size.y) { return; }
  var result = vec4<f32>(0.0);
  for (var k = 0u; k < 9u; k++) {
    let s = textureLoad(src, clamp(id + TAPS[k], vec2<i32>(0), size - vec2<i32>(1)), 0);
    result += mat_at(k * 16u) * s;
  }
  result += vec4<f32>(w[144u], w[145u], w[146u], w[147u]);
  textureStore(dst, id, result);
}

@compute @workgroup_size(8, 8)
fn relu1(@builtin(global_invocation_id) gid: vec3<u32>) {
  let size = vec2<i32>(i32(textureDimensions(dst).x), i32(textureDimensions(dst).y));
  let id = vec2<i32>(i32(gid.x), i32(gid.y));
  if (id.x >= size.x || id.y >= size.y) { return; }
  var samp: array<vec4<f32>, 9>;
  for (var k = 0u; k < 9u; k++) {
    samp[k] = textureLoad(src, clamp(id + TAPS[k], vec2<i32>(0), size - vec2<i32>(1)), 0);
  }
  var result = vec4<f32>(0.0);
  for (var k = 0u; k < 9u; k++) {
    result += mat_at(k * 16u) * max(samp[k], vec4<f32>(0.0));
    result += mat_at((9u + k) * 16u) * max(-samp[k], vec4<f32>(0.0));
  }
  result += vec4<f32>(w[288u], w[289u], w[290u], w[291u]);
  textureStore(dst, id, result);
}
`;

UPSCALE_KERNELS.a4kRelu2 = `
@group(0) @binding(0) var src0: texture_2d<f32>;
@group(0) @binding(1) var src1: texture_2d<f32>;
@group(0) @binding(2) var dst: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<storage, read> w: array<f32>;

fn mat_at(base: u32) -> mat4x4<f32> {
  return mat4x4<f32>(
    w[base + 0u], w[base + 1u], w[base + 2u], w[base + 3u],
    w[base + 4u], w[base + 5u], w[base + 6u], w[base + 7u],
    w[base + 8u], w[base + 9u], w[base + 10u], w[base + 11u],
    w[base + 12u], w[base + 13u], w[base + 14u], w[base + 15u]
  );
}
const TAPS = array<vec2<i32>, 9>(
  vec2<i32>(-1, -1), vec2<i32>(-1, 0), vec2<i32>(-1, 1),
  vec2<i32>(0, -1), vec2<i32>(0, 0), vec2<i32>(0, 1),
  vec2<i32>(1, -1), vec2<i32>(1, 0), vec2<i32>(1, 1)
);

@compute @workgroup_size(8, 8)
fn relu2(@builtin(global_invocation_id) gid: vec3<u32>) {
  let size = vec2<i32>(i32(textureDimensions(dst).x), i32(textureDimensions(dst).y));
  let id = vec2<i32>(i32(gid.x), i32(gid.y));
  if (id.x >= size.x || id.y >= size.y) { return; }
  var a: array<vec4<f32>, 9>;
  var b: array<vec4<f32>, 9>;
  for (var k = 0u; k < 9u; k++) {
    let xy = clamp(id + TAPS[k], vec2<i32>(0), size - vec2<i32>(1));
    a[k] = textureLoad(src0, xy, 0);
    b[k] = textureLoad(src1, xy, 0);
  }
  var result = vec4<f32>(0.0);
  for (var k = 0u; k < 9u; k++) {
    result += mat_at(k * 16u) * max(a[k], vec4<f32>(0.0));
    result += mat_at((9u + k) * 16u) * max(b[k], vec4<f32>(0.0));
    result += mat_at((18u + k) * 16u) * max(-a[k], vec4<f32>(0.0));
    result += mat_at((27u + k) * 16u) * max(-b[k], vec4<f32>(0.0));
  }
  result += vec4<f32>(w[576u], w[577u], w[578u], w[579u]);
  textureStore(dst, id, result);
}
`;

UPSCALE_KERNELS.a4kConv1 = `
@group(0) @binding(0) var t0: texture_2d<f32>;
@group(0) @binding(1) var t1: texture_2d<f32>;
@group(0) @binding(2) var t2: texture_2d<f32>;
@group(0) @binding(3) var t3: texture_2d<f32>;
@group(0) @binding(4) var acc_in: texture_2d<f32>;
@group(0) @binding(5) var dst: texture_storage_2d<rgba16float, write>;
@group(0) @binding(6) var<storage, read> w: array<f32>;
struct Conv1U { count: u32, w_base: u32, bias_base: u32, flags: u32 }
@group(0) @binding(7) var<uniform> uinfo: Conv1U;

fn mat_at(base: u32) -> mat4x4<f32> {
  return mat4x4<f32>(
    w[base + 0u], w[base + 1u], w[base + 2u], w[base + 3u],
    w[base + 4u], w[base + 5u], w[base + 6u], w[base + 7u],
    w[base + 8u], w[base + 9u], w[base + 10u], w[base + 11u],
    w[base + 12u], w[base + 13u], w[base + 14u], w[base + 15u]
  );
}
fn conv_pair(s: vec4<f32>, pos_base: u32, neg_base: u32) -> vec4<f32> {
  return mat_at(pos_base) * max(s, vec4<f32>(0.0)) + mat_at(neg_base) * max(-s, vec4<f32>(0.0));
}

@compute @workgroup_size(8, 8)
fn conv1(@builtin(global_invocation_id) gid: vec3<u32>) {
  let size = vec2<i32>(i32(textureDimensions(dst).x), i32(textureDimensions(dst).y));
  let id = vec2<i32>(i32(gid.x), i32(gid.y));
  if (id.x >= size.x || id.y >= size.y) { return; }
  var result = vec4<f32>(0.0);
  if ((uinfo.flags & 1u) == 1u) { result = textureLoad(acc_in, id, 0); }
  // flags bit 2: GLSL lists a texture pair as pos0, pos1, neg0, neg1.
  // Otherwise each texture is pos then neg (CNN-M / GAN-S).
  let paired = (uinfo.flags & 4u) == 4u;
  let b = uinfo.w_base;
  if (uinfo.count > 0u) {
    result += conv_pair(textureLoad(t0, id, 0), b, select(b + 16u, b + 32u, paired));
  }
  if (uinfo.count > 1u) {
    result += conv_pair(textureLoad(t1, id, 0), select(b + 32u, b + 16u, paired), select(b + 48u, b + 48u, paired));
  }
  if (uinfo.count > 2u) {
    result += conv_pair(textureLoad(t2, id, 0), select(b + 64u, b + 64u, paired), select(b + 80u, b + 96u, paired));
  }
  if (uinfo.count > 3u) {
    result += conv_pair(textureLoad(t3, id, 0), select(b + 96u, b + 80u, paired), select(b + 112u, b + 112u, paired));
  }
  if ((uinfo.flags & 2u) == 2u) {
    result += vec4<f32>(w[uinfo.bias_base], w[uinfo.bias_base + 1u], w[uinfo.bias_base + 2u], w[uinfo.bias_base + 3u]);
  }
  textureStore(dst, id, result);
}
`;

UPSCALE_KERNELS.a4kOut = `
@group(0) @binding(0) var color_tex: texture_2d<f32>;
@group(0) @binding(1) var feat0: texture_2d<f32>;
@group(0) @binding(2) var feat1: texture_2d<f32>;
@group(0) @binding(3) var feat2: texture_2d<f32>;
@group(0) @binding(4) var out_tex: texture_storage_2d<rgba8unorm, write>;
struct D2sU { mode: u32, pad0: u32, pad1: u32, pad2: u32 }
@group(0) @binding(5) var<uniform> d2s_u: D2sU;

fn at_color(p: vec2<i32>) -> vec4<f32> {
  let d = textureDimensions(color_tex);
  let di = vec2<i32>(i32(d.x), i32(d.y));
  return textureLoad(color_tex, clamp(p, vec2<i32>(0), di - vec2<i32>(1)), 0);
}
fn feat_ch(tex: texture_2d<f32>, x: i32, y: i32) -> f32 {
  let d = textureDimensions(tex);
  let lx = clamp(x / 2, 0, i32(d.x) - 1);
  let ly = clamp(y / 2, 0, i32(d.y) - 1);
  let ch = (y & 1) * 2 + (x & 1);
  return textureLoad(tex, vec2<i32>(lx, ly), 0)[ch];
}

@compute @workgroup_size(8, 8)
fn d2s(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(out_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let x = i32(gid.x);
  let y = i32(gid.y);
  let uv = (vec2<f32>(f32(x), f32(y)) + vec2<f32>(0.5)) / vec2<f32>(f32(out_d.x), f32(out_d.y));
  let cd = vec2<f32>(f32(textureDimensions(color_tex).x), f32(textureDimensions(color_tex).y));
  let p = uv * cd - vec2<f32>(0.5);
  let i = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
  let f = p - vec2<f32>(floor(p.x), floor(p.y));
  let base = mix(mix(at_color(i), at_color(i + vec2<i32>(1, 0)), f.x), mix(at_color(i + vec2<i32>(0, 1)), at_color(i + vec2<i32>(1, 1)), f.x), f.y);
  var residual = vec3<f32>(feat_ch(feat0, x, y));
  if (d2s_u.mode == 1u) {
    residual = vec3<f32>(feat_ch(feat0, x, y), feat_ch(feat1, x, y), feat_ch(feat2, x, y));
  }
  textureStore(out_tex, vec2<i32>(x, y), vec4<f32>(clamp(base.rgb + residual, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0));
}
`;

// GAN-S final 3x3 at the 2x grid. Offsets are half a feature texel, matching texOff * 0.5.
UPSCALE_KERNELS.a4kUp = `
@group(0) @binding(0) var color_tex: texture_2d<f32>;
@group(0) @binding(1) var feat0: texture_2d<f32>;
@group(0) @binding(2) var feat1: texture_2d<f32>;
@group(0) @binding(3) var out_tex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(4) var<storage, read> w: array<f32>;

fn mat_at(base: u32) -> mat4x4<f32> {
  return mat4x4<f32>(
    w[base + 0u], w[base + 1u], w[base + 2u], w[base + 3u],
    w[base + 4u], w[base + 5u], w[base + 6u], w[base + 7u],
    w[base + 8u], w[base + 9u], w[base + 10u], w[base + 11u],
    w[base + 12u], w[base + 13u], w[base + 14u], w[base + 15u]
  );
}
fn bilin(tex: texture_2d<f32>, p: vec2<f32>) -> vec4<f32> {
  let d = vec2<i32>(i32(textureDimensions(tex).x), i32(textureDimensions(tex).y));
  let i = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
  let f = p - vec2<f32>(floor(p.x), floor(p.y));
  let s00 = textureLoad(tex, clamp(i, vec2<i32>(0), d - vec2<i32>(1)), 0);
  let s10 = textureLoad(tex, clamp(i + vec2<i32>(1, 0), vec2<i32>(0), d - vec2<i32>(1)), 0);
  let s01 = textureLoad(tex, clamp(i + vec2<i32>(0, 1), vec2<i32>(0), d - vec2<i32>(1)), 0);
  let s11 = textureLoad(tex, clamp(i + vec2<i32>(1, 1), vec2<i32>(0), d - vec2<i32>(1)), 0);
  return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
}
fn at_color(p: vec2<i32>) -> vec4<f32> {
  let d = vec2<i32>(i32(textureDimensions(color_tex).x), i32(textureDimensions(color_tex).y));
  return textureLoad(color_tex, clamp(p, vec2<i32>(0), d - vec2<i32>(1)), 0);
}
const TAPS = array<vec2<f32>, 9>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(-1.0, 0.0), vec2<f32>(-1.0, 1.0),
  vec2<f32>(0.0, -1.0), vec2<f32>(0.0, 0.0), vec2<f32>(0.0, 1.0),
  vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0)
);

@compute @workgroup_size(8, 8)
fn upconv(@builtin(global_invocation_id) gid: vec3<u32>) {
  let out_d = textureDimensions(out_tex);
  if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
  let base_p = (vec2<f32>(f32(gid.x), f32(gid.y)) + vec2<f32>(0.5)) * 0.5 - vec2<f32>(0.5);
  var result = vec4<f32>(0.0);
  for (var k = 0u; k < 9u; k++) {
    let p = base_p + TAPS[k] * 0.5;
    let a = bilin(feat0, p);
    let b = bilin(feat1, p);
    result += mat_at(k * 16u) * max(a, vec4<f32>(0.0));
    result += mat_at((9u + k) * 16u) * max(b, vec4<f32>(0.0));
    result += mat_at((18u + k) * 16u) * max(-a, vec4<f32>(0.0));
    result += mat_at((27u + k) * 16u) * max(-b, vec4<f32>(0.0));
  }
  result += vec4<f32>(w[576u], w[577u], w[578u], w[579u]);
  let uv = (vec2<f32>(f32(gid.x), f32(gid.y)) + vec2<f32>(0.5)) / vec2<f32>(f32(out_d.x), f32(out_d.y));
  let cd = vec2<f32>(f32(textureDimensions(color_tex).x), f32(textureDimensions(color_tex).y));
  let cp = uv * cd - vec2<f32>(0.5);
  let i = vec2<i32>(i32(floor(cp.x)), i32(floor(cp.y)));
  let f = cp - vec2<f32>(floor(cp.x), floor(cp.y));
  let base = mix(mix(at_color(i), at_color(i + vec2<i32>(1, 0)), f.x), mix(at_color(i + vec2<i32>(0, 1)), at_color(i + vec2<i32>(1, 1)), f.x), f.y);
  let rgb = clamp(base.rgb + result.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
  textureStore(out_tex, vec2<i32>(i32(gid.x), i32(gid.y)), vec4<f32>(rgb, 1.0));
}
`;

// webartests-sr-v1 ESPCN. from_tex: 0 activation buffer, 1 luma, 2 RGB, 3 current+previous luma.
// espcn-y (from_tex 1) is the original path. See upscale-models/sr_train_lib.py.
UPSCALE_KERNELS.espcn = `
struct EspcnU { width: u32, height: u32, in_ch: u32, out_ch: u32, act: u32, from_tex: u32, pad0: u32, pad1: u32 }
@group(0) @binding(0) var src_tex: texture_2d<f32>;
@group(0) @binding(1) var prev_tex: texture_2d<f32>;
@group(0) @binding(2) var<storage, read> in_act: array<f32>;
@group(0) @binding(3) var<storage, read_write> out_act: array<f32>;
@group(0) @binding(4) var<storage, read> w: array<f32>;
@group(0) @binding(5) var<uniform> uinfo: EspcnU;

fn luma_of(rgb: vec3<f32>) -> f32 { return dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722)); }
fn load_in(ic: u32, x: i32, y: i32) -> f32 {
  let xx = clamp(x, 0, i32(uinfo.width) - 1);
  let yy = clamp(y, 0, i32(uinfo.height) - 1);
  if (uinfo.from_tex == 1u) {
    return luma_of(textureLoad(src_tex, vec2<i32>(xx, yy), 0).rgb);
  }
  if (uinfo.from_tex == 2u) {
    let rgb = textureLoad(src_tex, vec2<i32>(xx, yy), 0).rgb;
    if (ic == 0u) { return rgb.r; }
    if (ic == 1u) { return rgb.g; }
    return rgb.b;
  }
  if (uinfo.from_tex == 3u) {
    if (ic == 0u) { return luma_of(textureLoad(src_tex, vec2<i32>(xx, yy), 0).rgb); }
    return luma_of(textureLoad(prev_tex, vec2<i32>(xx, yy), 0).rgb);
  }
  return in_act[(u32(yy) * uinfo.width + u32(xx)) * uinfo.in_ch + ic];
}

@compute @workgroup_size(8, 8)
fn conv(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= uinfo.width || gid.y >= uinfo.height) { return; }
  let x = i32(gid.x);
  let y = i32(gid.y);
  let bias_base = uinfo.out_ch * uinfo.in_ch * 9u;
  for (var oc: u32 = 0u; oc < uinfo.out_ch; oc++) {
    var acc = w[bias_base + oc];
    for (var ic: u32 = 0u; ic < uinfo.in_ch; ic++) {
      for (var ky: i32 = 0; ky < 3; ky++) {
        for (var kx: i32 = 0; kx < 3; kx++) {
          let s = load_in(ic, x + kx - 1, y + ky - 1);
          let wi = ((oc * uinfo.in_ch + ic) * 9u) + u32(ky) * 3u + u32(kx);
          acc += s * w[wi];
        }
      }
    }
    if (uinfo.act == 1u) { acc = max(acc, 0.0); }
    out_act[(gid.y * uinfo.width + gid.x) * uinfo.out_ch + oc] = acc;
  }
}
`;

UPSCALE_KERNELS.shuffle = `
struct ShufU { out_w: u32, out_h: u32, low_w: u32, low_h: u32, mode: u32, stride: u32, pad0: u32, pad1: u32 }
@group(0) @binding(0) var color_tex: texture_2d<f32>;
@group(0) @binding(1) var<storage, read> act: array<f32>;
@group(0) @binding(2) var out_tex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> shuf: ShufU;

fn luma_of(rgb: vec3<f32>) -> f32 { return dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722)); }
fn at_color(p: vec2<i32>) -> vec4<f32> {
  let d = vec2<i32>(i32(textureDimensions(color_tex).x), i32(textureDimensions(color_tex).y));
  return textureLoad(color_tex, clamp(p, vec2<i32>(0), d - vec2<i32>(1)), 0);
}

@compute @workgroup_size(8, 8)
fn shuffle(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= shuf.out_w || gid.y >= shuf.out_h) { return; }
  let sub = (gid.y & 1u) * 2u + (gid.x & 1u);
  let lx = min(gid.x >> 1u, shuf.low_w - 1u);
  let ly = min(gid.y >> 1u, shuf.low_h - 1u);
  let base_i = (ly * shuf.low_w + lx) * shuf.stride;
  let uv = (vec2<f32>(f32(gid.x), f32(gid.y)) + vec2<f32>(0.5)) / vec2<f32>(f32(shuf.out_w), f32(shuf.out_h));
  let cd = vec2<f32>(f32(textureDimensions(color_tex).x), f32(textureDimensions(color_tex).y));
  let p = uv * cd - vec2<f32>(0.5);
  let i = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
  let f = p - vec2<f32>(floor(p.x), floor(p.y));
  let base = mix(mix(at_color(i), at_color(i + vec2<i32>(1, 0)), f.x), mix(at_color(i + vec2<i32>(0, 1)), at_color(i + vec2<i32>(1, 1)), f.x), f.y);
  if (shuf.mode == 1u) {
    let rr = act[base_i + sub];
    let gg = act[base_i + 4u + sub];
    let bb = act[base_i + 8u + sub];
    let rgb = clamp(base.rgb + vec3<f32>(rr, gg, bb), vec3<f32>(0.0), vec3<f32>(1.0));
    textureStore(out_tex, vec2<i32>(i32(gid.x), i32(gid.y)), vec4<f32>(rgb, 1.0));
    return;
  }
  let residual = act[base_i + sub];
  let y = luma_of(base.rgb);
  let cb = (base.b - y) / 1.8556;
  let cr = (base.r - y) / 1.5748;
  let y2 = clamp(y + residual, 0.0, 1.0);
  let r = y2 + 1.5748 * cr;
  let g = y2 - 0.187324 * cb - 0.468124 * cr;
  let b = y2 + 1.8556 * cb;
  textureStore(out_tex, vec2<i32>(i32(gid.x), i32(gid.y)), vec4<f32>(clamp(vec3<f32>(r, g, b), vec3<f32>(0.0), vec3<f32>(1.0)), 1.0));
}
`;

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// 0 x * p0 + p1, 1 (x - p0) / p1, 2 min-max (x - lo) / z(hi - lo), 3 min-max with a range.
override AFFINE_FORM: u32 = 0u;
// Where each affine parameter is read: 0 the params table, 1 the p0 binding, 2 (p1 only) the p1 binding.
override AFFINE_P0: u32 = 0u;
override AFFINE_P1: u32 = 0u;
// The dtype of parameters read from bindings: f32, or an 8-bit or 16-bit integer dtype (statistics in the input dtype).
override PARAM_DTYPE: u32 = 6u;

// Byte offsets of the affine parameters in their sources, the f32 epsilon of the zero rule, and the parameters' byte strides.
const P_P0_OFFSET: u32 = 7u;
const P_P1_OFFSET: u32 = 8u;
const P_EPSILON: u32 = 10u;
const P_P0_STRIDE: u32 = 72u;
const P_P1_STRIDE: u32 = 80u;

@group(0) @binding(3) var<storage, read> p0: array<u32>;
@group(0) @binding(4) var<storage, read> p1: array<u32>;

fn bits_are_nan(b: u32) -> bool {
    return (b & 0x7FFFFFFFu) > 0x7F800000u;
}

var<private> affine_nan_word: u32 = 0x7FC00000u;

fn zero_rule(d: f32) -> f32 {
    if (bits_are_nan(bitcast<u32>(d))) {
        return d;
    }
    if (abs(d) <= bitcast<f32>(params[P_EPSILON])) {
        return 1.0;
    }
    return d;
}

fn param_word(source: u32, i: u32) -> u32 {
    if (source == 0u) {
        return params[i];
    }
    if (source == 1u) {
        return p0[i];
    }
    return p1[i];
}

fn param_value(source: u32, addr: u32) -> f32 {
    let word = param_word(source, addr >> 2u);
    if (source == 0u || PARAM_DTYPE == 6u) {
        return bitcast<f32>(word);
    }
    var bits = (word >> ((addr & 2u) * 8u)) & 0xFFFFu;
    if (dtype_size(PARAM_DTYPE) == 1u) {
        bits = (word >> ((addr & 3u) * 8u)) & 0xFFu;
    }
    if (PARAM_DTYPE == 0u) {
        bits = bitcast<u32>(bitcast<i32>(bits << 24u) >> 24u);
    }
    if (PARAM_DTYPE == 2u) {
        bits = bitcast<u32>(bitcast<i32>(bits << 16u) >> 16u);
    }
    return bitcast<f32>(int_to_f32_bits(bits, dtype_signed(PARAM_DTYPE)));
}

struct AffineWalk {
    src_addr: u32,
    a: u32,
    b: u32,
}

fn affine_walk(e: u32) -> AffineWalk {
    let ndim = params[P_NDIM];
    var w = AffineWalk(params[P_SRC_OFFSET], params[P_P0_OFFSET], params[P_P1_OFFSET]);
    var rem = e;
    for (var k = 0u; k < ndim; k = k + 1u) {
        let d = ndim - 1u - k;
        let n = params[P_SHAPE + d];
        let c = rem % n;
        rem = rem / n;
        w.src_addr = w.src_addr + c * params[P_SRC_STRIDE + d];
        w.a = w.a + c * params[P_P0_STRIDE + d];
        w.b = w.b + c * params[P_P1_STRIDE + d];
    }
    return w;
}

fn affine_value(e: u32) -> vec4<u32> {
    let w = affine_walk(e);
    let x = load_f32(w.src_addr);
    let a = param_value(AFFINE_P0, w.a);
    let b = param_value(AFFINE_P1, w.b);
    var words = 0u;
    if (SRC_DTYPE == 6u) {
        words = bitcast<u32>(x) & 0x7FFFFFFFu;
    }
    if (AFFINE_P0 != 0u) {
        words = max(words, bitcast<u32>(a) & 0x7FFFFFFFu);
    }
    if (AFFINE_P1 != 0u) {
        words = max(words, bitcast<u32>(b) & 0x7FFFFFFFu);
    }
    if (words > 0x7F800000u) {
        return encode_f32(bitcast<f32>(affine_nan_word));
    }
    if (AFFINE_FORM == 0u) {
        return encode_f32(x * a + b);
    }
    if (AFFINE_FORM == 1u) {
        return encode_f32((x - a) / b);
    }
    let q = (x - a) / zero_rule(b - a);
    if (AFFINE_FORM == 2u) {
        return encode_f32(q);
    }
    return encode_f32(q * bitcast<f32>(params[P_VALUE_HI]) + bitcast<f32>(params[P_VALUE_LO]));
}

@compute @workgroup_size(256)
fn affine(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    let i = invocation_index(wid, nwg, lid);
    if (i >= params[P_COUNT]) {
        return;
    }
    let size = dtype_size(DST_DTYPE);
    if (size >= 4u) {
        store_element(params[P_DST_OFFSET] + i * size, affine_value(i));
        return;
    }
    let r = word_start(i);
    var out = word_base(r);
    for (var lane = 0u; lane < 4u; lane = lane + size) {
        let addr = r.x + lane;
        if (addr >= r.y && addr < r.z) {
            out = word_merge(out, lane, affine_value((addr - r.y) / size).x);
        }
    }
    dst[r.x >> 2u] = out;
}

@compute @workgroup_size(256)
fn zscore(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    let k = invocation_index(wid, nwg, lid);
    let count = params[P_COUNT];
    if (k >= count) {
        return;
    }
    let size = dtype_size(SRC_DTYPE);
    let lo = bitcast<f32>(real_to_f32_bits(load_bits(params[P_VALUE_2] + k * size)));
    let hi = bitcast<f32>(real_to_f32_bits(load_bits(params[P_VALUE_3] + k * size)));
    let spread = bitcast<f32>(src[(params[P_SRC_OFFSET] >> 2u) + k]);
    var center = lo;
    var denom = 1.0;
    if (bits_are_nan(bitcast<u32>(lo)) || lo != hi || bits_are_nan(bitcast<u32>(spread))) {
        center = bitcast<f32>(src[(params[P_P0_OFFSET] >> 2u) + k]);
        denom = zero_rule(spread);
    }
    let out = (params[P_DST_OFFSET] >> 2u) + k;
    dst[out] = bitcast<u32>(center);
    dst[out + count] = bitcast<u32>(denom);
}

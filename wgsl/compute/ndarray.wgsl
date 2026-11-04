/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Dtype codes: 0 i8, 1 u8, 2 i16, 3 u16, 4 i32, 5 u32, 6 f32, 7 f64, 8 c64, 9 c128.
override SRC_DTYPE: u32 = 6u;
override DST_DTYPE: u32 = 6u;
// 0 copy or cast, 1 pad, 2 affine, 3 resize.
override OPERATION: u32 = 0u;
// 0 constant, 1 edge, 2 reflect, 3 symmetric, 4 wrap.
override PAD_MODE: u32 = 0u;
// 0 wrap, 1 saturate.
override OVERFLOW: u32 = 1u;
// 0 truncate, 1 round half to even.
override ROUNDING: u32 = 0u;
// 0 scale and offset, 1 mean and std.
override AFFINE_FORM: u32 = 0u;
// 0 nearest (one-tap gather), 1 weighted taps (linear or cubic).
override RESIZE_METHOD: u32 = 1u;
// 1, 2, or 3 resize levels.
override RESIZE_LEVELS: u32 = 2u;

@group(0) @binding(0) var<storage, read> src: array<u32>;
@group(0) @binding(1) var<storage, read_write> dst: array<u32>;
@group(0) @binding(2) var<storage, read> params: array<u32>;

const P_COUNT: u32 = 0u;
const P_NDIM: u32 = 1u;
const P_NUMEL: u32 = 2u;
const P_SRC_OFFSET: u32 = 3u;
const P_DST_OFFSET: u32 = 4u;
const P_VALUE_LO: u32 = 5u;
const P_VALUE_HI: u32 = 6u;
const P_PARAM_AXIS: u32 = 7u;
const P_PARAM_LEN: u32 = 8u;
const P_LEVEL_COUNT: u32 = 9u;
const P_TABLE: u32 = 11u;
const P_VALUE_2: u32 = 12u;
const P_VALUE_3: u32 = 13u;
const P_SHAPE: u32 = 16u;
const P_SRC_STRIDE: u32 = 24u;
const P_DST_STRIDE: u32 = 32u;
const P_SRC_SHAPE: u32 = 40u;
const P_BEFORE: u32 = 48u;
const P_LEVEL_DIM: u32 = 56u;
const P_LEVEL_TABLE: u32 = 64u;

fn dtype_size(code: u32) -> u32 {
    if (code <= 1u) {
        return 1u;
    }
    if (code <= 3u) {
        return 2u;
    }
    if (code <= 6u) {
        return 4u;
    }
    if (code <= 8u) {
        return 8u;
    }
    return 16u;
}

fn dtype_mask(code: u32) -> u32 {
    if (code <= 1u) {
        return 0xFFu;
    }
    if (code <= 3u) {
        return 0xFFFFu;
    }
    return 0xFFFFFFFFu;
}

fn dtype_signed(code: u32) -> bool {
    return code == 0u || code == 2u || code == 4u;
}

fn invocation_index(wid: vec3<u32>, nwg: vec3<u32>, lid: u32) -> u32 {
    return (wid.y * nwg.x + wid.x) * 256u + lid;
}

fn load_bits(addr: u32) -> vec4<u32> {
    let size = dtype_size(SRC_DTYPE);
    let i = addr >> 2u;
    let word = src[i];
    if (size == 1u) {
        return vec4<u32>((word >> ((addr & 3u) * 8u)) & 0xFFu, 0u, 0u, 0u);
    }
    if (size == 2u) {
        return vec4<u32>((word >> ((addr & 2u) * 8u)) & 0xFFFFu, 0u, 0u, 0u);
    }
    if (size == 4u) {
        return vec4<u32>(word, 0u, 0u, 0u);
    }
    if (size == 8u) {
        return vec4<u32>(word, src[i + 1u], 0u, 0u);
    }
    return vec4<u32>(word, src[i + 1u], src[i + 2u], src[i + 3u]);
}

fn int_pattern(bits: u32) -> u32 {
    if (SRC_DTYPE == 0u) {
        return bitcast<u32>(bitcast<i32>(bits << 24u) >> 24u);
    }
    if (SRC_DTYPE == 2u) {
        return bitcast<u32>(bitcast<i32>(bits << 16u) >> 16u);
    }
    return bits;
}

fn u32_to_f32_bits(m: u32) -> u32 {
    if (m < 0x1000000u) {
        return bitcast<u32>(f32(m));
    }
    let p = firstLeadingBit(m);
    let shift = p - 23u;
    var mant = m >> shift;
    let rem = m & ((1u << shift) - 1u);
    let half = 1u << (shift - 1u);
    if (rem > half || (rem == half && (mant & 1u) == 1u)) {
        mant = mant + 1u;
    }
    return ((p + 127u) << 23u) + (mant - 0x800000u);
}

fn int_to_f32_bits(pattern: u32, signed: bool) -> u32 {
    if (signed && bitcast<i32>(pattern) < 0) {
        return 0x80000000u | u32_to_f32_bits(0u - pattern);
    }
    return u32_to_f32_bits(pattern);
}

fn f32_to_f64_bits(b: u32) -> vec2<u32> {
    let sign = b & 0x80000000u;
    let e = (b >> 23u) & 0xFFu;
    let m = b & 0x7FFFFFu;
    if (e == 0xFFu) {
        let quiet = select(0u, 0x80000u, m != 0u);
        return vec2<u32>(m << 29u, sign | 0x7FF00000u | quiet | (m >> 3u));
    }
    if (e == 0u) {
        if (m == 0u) {
            return vec2<u32>(0u, sign);
        }
        let k = 23u - firstLeadingBit(m);
        let mn = (m << k) & 0x7FFFFFu;
        return vec2<u32>(mn << 29u, sign | ((897u - k) << 20u) | (mn >> 3u));
    }
    return vec2<u32>(m << 29u, sign | ((e + 896u) << 20u) | (m >> 3u));
}

fn f64_to_f32_bits(lo: u32, hi: u32) -> u32 {
    let sign = hi & 0x80000000u;
    let e = (hi >> 20u) & 0x7FFu;
    let mhi = hi & 0xFFFFFu;
    if (e == 0x7FFu) {
        if ((mhi | lo) == 0u) {
            return sign | 0x7F800000u;
        }
        return sign | 0x7FC00000u | (mhi << 3u) | (lo >> 29u);
    }
    if (e >= 1151u) {
        return sign | 0x7F800000u;
    }
    if (e >= 897u) {
        let m23 = (mhi << 3u) | (lo >> 29u);
        let rem = lo & 0x1FFFFFFFu;
        var bits = ((e - 896u) << 23u) | m23;
        if (rem > 0x10000000u || (rem == 0x10000000u && (m23 & 1u) == 1u)) {
            bits = bits + 1u;
        }
        return sign | bits;
    }
    if (e == 0u) {
        return sign;
    }
    let s = 926u - e;
    if (s > 54u) {
        return sign;
    }
    let mh = mhi | 0x100000u;
    var q = 0u;
    var rem_hi = 0u;
    var rem_lo = 0u;
    var half_hi = 0u;
    var half_lo = 0u;
    if (s >= 32u) {
        let t = s - 32u;
        q = mh >> t;
        rem_hi = mh & ((1u << t) - 1u);
        rem_lo = lo;
        if (t == 0u) {
            half_lo = 0x80000000u;
        } else {
            half_hi = 1u << (t - 1u);
        }
    } else {
        q = (mh << (32u - s)) | (lo >> s);
        rem_lo = lo & ((1u << s) - 1u);
        half_lo = 1u << (s - 1u);
    }
    let above = rem_hi > half_hi || (rem_hi == half_hi && rem_lo > half_lo);
    let tie = rem_hi == half_hi && rem_lo == half_lo;
    if (above || (tie && (q & 1u) == 1u)) {
        q = q + 1u;
    }
    return sign | q;
}

fn integral_f32_wrap_bits(r: f32) -> u32 {
    if (abs(r) < 2147483648.0) {
        return bitcast<u32>(i32(r));
    }
    let b = bitcast<u32>(r);
    let shift = ((b >> 23u) & 0xFFu) - 150u;
    var mag = 0u;
    if (shift < 32u) {
        mag = ((b & 0x7FFFFFu) | 0x800000u) << shift;
    }
    if ((b >> 31u) == 1u) {
        mag = 0u - mag;
    }
    return mag;
}

fn f32_to_int_bits(b: u32) -> u32 {
    let mag = b & 0x7FFFFFFFu;
    if (mag > 0x7F800000u) {
        return 0u;
    }
    let negative = (b >> 31u) == 1u;
    if (mag == 0x7F800000u) {
        if (OVERFLOW == 0u) {
            return 0u;
        }
        if (DST_DTYPE == 0u) {
            return select(0x7Fu, 0x80u, negative);
        }
        if (DST_DTYPE == 1u) {
            return select(0xFFu, 0u, negative);
        }
        if (DST_DTYPE == 2u) {
            return select(0x7FFFu, 0x8000u, negative);
        }
        if (DST_DTYPE == 3u) {
            return select(0xFFFFu, 0u, negative);
        }
        if (DST_DTYPE == 4u) {
            return select(0x7FFFFFFFu, 0x80000000u, negative);
        }
        return select(0xFFFFFFFFu, 0u, negative);
    }
    let f = bitcast<f32>(b);
    var r = trunc(f);
    if (ROUNDING == 1u) {
        r = round(f);
    }
    if (OVERFLOW == 0u) {
        return integral_f32_wrap_bits(r) & dtype_mask(DST_DTYPE);
    }
    if (DST_DTYPE == 0u) {
        return bitcast<u32>(i32(clamp(r, -128.0, 127.0))) & 0xFFu;
    }
    if (DST_DTYPE == 1u) {
        return u32(clamp(r, 0.0, 255.0));
    }
    if (DST_DTYPE == 2u) {
        return bitcast<u32>(i32(clamp(r, -32768.0, 32767.0))) & 0xFFFFu;
    }
    if (DST_DTYPE == 3u) {
        return u32(clamp(r, 0.0, 65535.0));
    }
    if (DST_DTYPE == 4u) {
        if (r >= 2147483648.0) {
            return 0x7FFFFFFFu;
        }
        if (r < -2147483648.0) {
            return 0x80000000u;
        }
        return bitcast<u32>(i32(r));
    }
    if (r >= 4294967296.0) {
        return 0xFFFFFFFFu;
    }
    if (r <= 0.0) {
        return 0u;
    }
    return u32(r);
}

fn int_to_int_bits(pattern: u32) -> u32 {
    let mask = dtype_mask(DST_DTYPE);
    if (OVERFLOW == 0u) {
        return pattern & mask;
    }
    var hi = mask;
    var lo_signed = 0;
    if (dtype_signed(DST_DTYPE)) {
        hi = mask >> 1u;
        lo_signed = -bitcast<i32>(hi) - 1;
    }
    if (dtype_signed(SRC_DTYPE) && bitcast<i32>(pattern) < 0) {
        if (!dtype_signed(DST_DTYPE)) {
            return 0u;
        }
        return bitcast<u32>(max(bitcast<i32>(pattern), lo_signed)) & mask;
    }
    return min(pattern, hi);
}

fn real_to_f32_bits(bits: vec4<u32>) -> u32 {
    if (SRC_DTYPE == 6u) {
        return bits.x;
    }
    if (SRC_DTYPE == 7u) {
        return f64_to_f32_bits(bits.x, bits.y);
    }
    return int_to_f32_bits(int_pattern(bits.x), dtype_signed(SRC_DTYPE));
}

fn convert_bits(bits: vec4<u32>) -> vec4<u32> {
    if (SRC_DTYPE == DST_DTYPE) {
        return bits;
    }
    if (DST_DTYPE == 8u) {
        if (SRC_DTYPE == 9u) {
            return vec4<u32>(f64_to_f32_bits(bits.x, bits.y), f64_to_f32_bits(bits.z, bits.w), 0u, 0u);
        }
        return vec4<u32>(real_to_f32_bits(bits), 0u, 0u, 0u);
    }
    if (DST_DTYPE == 9u) {
        if (SRC_DTYPE == 8u) {
            return vec4<u32>(f32_to_f64_bits(bits.x), f32_to_f64_bits(bits.y));
        }
        if (SRC_DTYPE == 7u) {
            return vec4<u32>(bits.x, bits.y, 0u, 0u);
        }
        return vec4<u32>(f32_to_f64_bits(bits.x), 0u, 0u);
    }
    if (DST_DTYPE == 7u) {
        return vec4<u32>(f32_to_f64_bits(bits.x), 0u, 0u);
    }
    if (SRC_DTYPE == 7u) {
        return vec4<u32>(f64_to_f32_bits(bits.x, bits.y), 0u, 0u, 0u);
    }
    if (DST_DTYPE == 6u) {
        return vec4<u32>(int_to_f32_bits(int_pattern(bits.x), dtype_signed(SRC_DTYPE)), 0u, 0u, 0u);
    }
    if (SRC_DTYPE == 6u) {
        return vec4<u32>(f32_to_int_bits(bits.x), 0u, 0u, 0u);
    }
    return vec4<u32>(int_to_int_bits(int_pattern(bits.x)), 0u, 0u, 0u);
}

fn load_f32(addr: u32) -> f32 {
    let bits = load_bits(addr).x;
    if (SRC_DTYPE == 6u) {
        return bitcast<f32>(bits);
    }
    return bitcast<f32>(int_to_f32_bits(int_pattern(bits), dtype_signed(SRC_DTYPE)));
}

fn encode_f32(y: f32) -> vec4<u32> {
    if (DST_DTYPE == 6u) {
        return vec4<u32>(bitcast<u32>(y), 0u, 0u, 0u);
    }
    return vec4<u32>(f32_to_int_bits(bitcast<u32>(y)), 0u, 0u, 0u);
}

fn mod_floor(i: i32, p: u32) -> u32 {
    if (i >= 0) {
        return u32(i) % p;
    }
    let r = u32(-i) % p;
    return select(p - r, 0u, r == 0u);
}

fn pad_index(i: i32, n: u32) -> i32 {
    if (i >= 0 && u32(i) < n) {
        return i;
    }
    if (PAD_MODE == 0u) {
        return -1;
    }
    if (PAD_MODE == 1u) {
        return select(i32(n - 1u), 0, i < 0);
    }
    if (PAD_MODE == 4u) {
        return i32(mod_floor(i, n));
    }
    if (PAD_MODE == 3u) {
        let p = 2u * n;
        let j = mod_floor(i, p);
        return i32(select(p - 1u - j, j, j < n));
    }
    if (n == 1u) {
        return 0;
    }
    let p = 2u * n - 2u;
    let j = mod_floor(i, p);
    return i32(select(p - j, j, j < n));
}

struct Walk {
    src_addr: u32,
    dst_addr: u32,
    param: u32,
    constant: bool,
}

fn walk(e: u32) -> Walk {
    let ndim = params[P_NDIM];
    var w = Walk(params[P_SRC_OFFSET], params[P_DST_OFFSET], 0u, false);
    var rem = e;
    for (var k = 0u; k < ndim; k = k + 1u) {
        let d = ndim - 1u - k;
        let n = params[P_SHAPE + d];
        let c = rem % n;
        rem = rem / n;
        var s = c;
        if (OPERATION == 1u) {
            let mapped = pad_index(i32(c) - i32(params[P_BEFORE + d]), params[P_SRC_SHAPE + d]);
            if (mapped < 0) {
                w.constant = true;
            } else {
                s = u32(mapped);
            }
        }
        if (OPERATION == 2u && d == params[P_PARAM_AXIS]) {
            w.param = c;
        }
        w.src_addr = w.src_addr + s * params[P_SRC_STRIDE + d];
        w.dst_addr = w.dst_addr + c * params[P_DST_STRIDE + d];
    }
    return w;
}

fn gather_value(w: Walk) -> vec4<u32> {
    if (OPERATION == 1u && w.constant) {
        return vec4<u32>(params[P_VALUE_LO], params[P_VALUE_HI], params[P_VALUE_2], params[P_VALUE_3]);
    }
    if (OPERATION == 2u) {
        let len = params[P_PARAM_LEN];
        let k = select(w.param, 0u, len == 1u);
        let table = params[P_TABLE];
        let a = bitcast<f32>(params[table + k]);
        let b = bitcast<f32>(params[table + len + k]);
        let x = load_f32(w.src_addr);
        if (AFFINE_FORM == 0u) {
            return encode_f32(x * a + b);
        }
        return encode_f32((x - a) / b);
    }
    return convert_bits(load_bits(w.src_addr));
}

struct ResizeLevel {
    index: u32,
    weight: u32,
    taps: u32,
    stride: u32,
}

fn resize_constant() -> vec2<f32> {
    return vec2<f32>(bitcast<f32>(params[P_VALUE_LO]), bitcast<f32>(params[P_VALUE_HI]));
}

fn resize_level(l: u32, o: u32) -> ResizeLevel {
    let dim = params[P_LEVEL_DIM + l];
    let table = params[P_LEVEL_TABLE + l];
    let n = params[P_SHAPE + dim];
    let start = params[table + o];
    let index = table + n + 1u;
    return ResizeLevel(index + start, index + params[table + n] + start, params[table + o + 1u] - start, params[P_SRC_STRIDE + dim]);
}

fn resize_tap(v: ResizeLevel, j: u32) -> i32 {
    return bitcast<i32>(params[v.index + j]);
}

fn resize_weight(v: ResizeLevel, j: u32) -> f32 {
    return bitcast<f32>(params[v.weight + j]);
}

fn resize_sample(v: ResizeLevel, base: u32, j: u32) -> vec2<f32> {
    let k = resize_tap(v, j);
    if (k < 0) {
        return resize_constant();
    }
    let addr = base + u32(k) * v.stride;
    if (SRC_DTYPE == 8u) {
        let i = addr >> 2u;
        return vec2<f32>(bitcast<f32>(src[i]), bitcast<f32>(src[i + 1u]));
    }
    return vec2<f32>(load_f32(addr), 0.0);
}

fn resize_leaf(v: ResizeLevel, base: u32) -> vec2<f32> {
    let first = resize_sample(v, base, 0u);
    if (v.taps == 1u) {
        return first;
    }
    var acc = first * resize_weight(v, 0u);
    for (var j = 1u; j < v.taps; j = j + 1u) {
        acc = acc + resize_sample(v, base, j) * resize_weight(v, j);
    }
    return acc;
}

fn resize_encode(acc: vec2<f32>) -> vec4<u32> {
    if (DST_DTYPE == 8u) {
        return vec4<u32>(bitcast<u32>(acc.x), select(bitcast<u32>(acc.y), 0u, SRC_DTYPE != 8u), 0u, 0u);
    }
    return encode_f32(acc.x);
}

fn resize_nearest_constant() -> vec4<u32> {
    return vec4<u32>(params[P_VALUE_LO], params[P_VALUE_HI], params[P_VALUE_2], params[P_VALUE_3]);
}

fn resize_mid(v: ResizeLevel, leaf: ResizeLevel, base: u32) -> vec2<f32> {
    var k = resize_tap(v, 0u);
    var first = resize_constant();
    if (k >= 0) {
        first = resize_leaf(leaf, base + u32(k) * v.stride);
    }
    if (v.taps == 1u) {
        return first;
    }
    var acc = first * resize_weight(v, 0u);
    for (var j = 1u; j < v.taps; j = j + 1u) {
        k = resize_tap(v, j);
        var term = resize_constant();
        if (k >= 0) {
            term = resize_leaf(leaf, base + u32(k) * v.stride);
        }
        acc = acc + term * resize_weight(v, j);
    }
    return acc;
}

fn resize_top(v: ResizeLevel, mid: ResizeLevel, leaf: ResizeLevel, base: u32) -> vec2<f32> {
    var k = resize_tap(v, 0u);
    var first = resize_constant();
    if (k >= 0) {
        first = resize_mid(mid, leaf, base + u32(k) * v.stride);
    }
    if (v.taps == 1u) {
        return first;
    }
    var acc = first * resize_weight(v, 0u);
    for (var j = 1u; j < v.taps; j = j + 1u) {
        k = resize_tap(v, j);
        var term = resize_constant();
        if (k >= 0) {
            term = resize_mid(mid, leaf, base + u32(k) * v.stride);
        }
        acc = acc + term * resize_weight(v, j);
    }
    return acc;
}

fn resize_value(e: u32) -> vec4<u32> {
    let ndim = params[P_NDIM];
    let d0 = params[P_LEVEL_DIM];
    let d1 = params[P_LEVEL_DIM + 1u];
    let d2 = params[P_LEVEL_DIM + 2u];
    var base = params[P_SRC_OFFSET];
    var o0 = 0u;
    var o1 = 0u;
    var o2 = 0u;
    var rem = e;
    for (var k = 0u; k < ndim; k = k + 1u) {
        let d = ndim - 1u - k;
        let n = params[P_SHAPE + d];
        let c = rem % n;
        rem = rem / n;
        if (d == d0) {
            o0 = c;
        } else if (RESIZE_LEVELS >= 2u && d == d1) {
            o1 = c;
        } else if (RESIZE_LEVELS >= 3u && d == d2) {
            o2 = c;
        } else {
            base = base + c * params[P_SRC_STRIDE + d];
        }
    }
    let v0 = resize_level(0u, o0);
    if (RESIZE_METHOD == 0u) {
        var addr = base;
        var k = resize_tap(v0, 0u);
        if (k < 0) {
            return resize_nearest_constant();
        }
        addr = addr + u32(k) * v0.stride;
        if (RESIZE_LEVELS >= 2u) {
            let v1 = resize_level(1u, o1);
            k = resize_tap(v1, 0u);
            if (k < 0) {
                return resize_nearest_constant();
            }
            addr = addr + u32(k) * v1.stride;
        }
        if (RESIZE_LEVELS >= 3u) {
            let v2 = resize_level(2u, o2);
            k = resize_tap(v2, 0u);
            if (k < 0) {
                return resize_nearest_constant();
            }
            addr = addr + u32(k) * v2.stride;
        }
        return convert_bits(load_bits(addr));
    }
    if (RESIZE_LEVELS == 1u) {
        return resize_encode(resize_leaf(v0, base));
    }
    let v1 = resize_level(1u, o1);
    if (RESIZE_LEVELS == 2u) {
        return resize_encode(resize_mid(v0, v1, base));
    }
    return resize_encode(resize_top(v0, v1, resize_level(2u, o2), base));
}

fn store_element(addr: u32, bits: vec4<u32>) {
    let i = addr >> 2u;
    let words = dtype_size(DST_DTYPE) >> 2u;
    dst[i] = bits.x;
    if (words >= 2u) {
        dst[i + 1u] = bits.y;
    }
    if (words == 4u) {
        dst[i + 2u] = bits.z;
        dst[i + 3u] = bits.w;
    }
}

fn store_word(i: u32) {
    let size = dtype_size(DST_DTYPE);
    let mask = dtype_mask(DST_DTYPE);
    let numel = params[P_NUMEL];
    let start = params[P_DST_OFFSET];
    let end = start + numel * size;
    let word = (start >> 2u) + i;
    let word_addr = word << 2u;
    var out = 0u;
    if (word_addr < start || word_addr + 4u > end) {
        out = dst[word];
    }
    for (var lane = 0u; lane < 4u; lane = lane + size) {
        let addr = word_addr + lane;
        if (addr < start || addr >= end) {
            continue;
        }
        let e = (addr - start) / size;
        var bits = 0u;
        if (OPERATION == 3u) {
            bits = resize_value(e).x;
        } else {
            bits = gather_value(walk(e)).x;
        }
        let shift = lane * 8u;
        out = (out & ~(mask << shift)) | ((bits & mask) << shift);
    }
    dst[word] = out;
}

@compute @workgroup_size(256)
fn gather(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    let i = invocation_index(wid, nwg, lid);
    if (i >= params[P_COUNT]) {
        return;
    }
    if (dtype_size(DST_DTYPE) < 4u) {
        store_word(i);
        return;
    }
    let w = walk(i);
    store_element(w.dst_addr, gather_value(w));
}

@compute @workgroup_size(256)
fn resize(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    let i = invocation_index(wid, nwg, lid);
    if (i >= params[P_COUNT]) {
        return;
    }
    if (dtype_size(DST_DTYPE) < 4u) {
        store_word(i);
        return;
    }
    store_element(params[P_DST_OFFSET] + i * dtype_size(DST_DTYPE), resize_value(i));
}

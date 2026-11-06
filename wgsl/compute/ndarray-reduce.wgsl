/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// 0 sum, 1 prod, 2 mean, 3 var, 4 std, 5 min, 6 max, 7 argmin, 8 argmax, 9 minMax.
override REDUCE_OP: u32 = 0u;
// 0 propagate, 1 omit.
override REDUCE_OMIT: u32 = 0u;
// 0 writes partial states, 1 writes output values.
override REDUCE_WRITE: u32 = 0u;
// The output's dtype, which differs from DST_DTYPE when 8-bit or 16-bit outputs are written as 32-bit values and narrowed.
override REDUCE_OUTPUT: u32 = 6u;

const R_OUTPUTS: u32 = 0u;
const R_CHUNKS: u32 = 1u;
const R_CHUNK: u32 = 2u;
const R_COUNT: u32 = 3u;
const R_SRC_OFFSET: u32 = 4u;
const R_DST_OFFSET: u32 = 5u;
const R_KEPT: u32 = 6u;
const R_REDUCED: u32 = 7u;
const R_STATE_SRC: u32 = 8u;
const R_STATE_DST: u32 = 9u;
const R_MEAN: u32 = 10u;
const R_DDOF_HI: u32 = 11u;
const R_DDOF_LO: u32 = 12u;
// 0 enumerates invocations by output then chunk, 1 by chunk then output.
const R_SWAP: u32 = 13u;
// 0 writes the first and 1 the second value of a state that holds two.
const R_SELECT: u32 = 14u;
// Always 0, and read at run time so that shader compilers cannot know it; see opaque().
const R_ZERO: u32 = 15u;
// The first output of this batch; dispatches and their temporaries cover outputs from here on.
const R_BASE: u32 = 40u;
// Adjacent invocations follow this kept axis: its length and the distance between its neighbors in output order.
const R_WALK_COUNT: u32 = 41u;
const R_WALK_STEP: u32 = 42u;

const NAN_32: u32 = 0x7FC00000u;
const NEG_ZERO_32: u32 = 0x80000000u;
const POS_ONE_32: u32 = 0x3F800000u;
const NAN_HI_64: u32 = 0x7FF80000u;

struct State {
    a: vec4<u32>,
    e: u32,
}

var<workgroup> share: array<State, 256>;

var<private> nan_word: u32 = NAN_32;

fn nan_f32() -> f32 {
    return bitcast<f32>(nan_word);
}

var<private> opaque_zero: u32 = 0u;

fn opaque(x: f32) -> f32 {
    return bitcast<f32>(bitcast<u32>(x) ^ opaque_zero);
}

fn reduce_float_source() -> bool {
    return SRC_DTYPE == 6u || SRC_DTYPE == 8u;
}

fn reduce_complex_source() -> bool {
    return SRC_DTYPE == 8u;
}

fn reduce_ordered() -> bool {
    return REDUCE_OP >= 5u;
}

fn reduce_centered() -> bool {
    return REDUCE_OP == 3u || REDUCE_OP == 4u;
}

fn reduce_float_state() -> bool {
    return reduce_centered() || ((REDUCE_OP == 0u || REDUCE_OP == 2u) && reduce_float_source());
}

fn reduce_counted() -> bool {
    return REDUCE_OP == 7u || REDUCE_OP == 8u || (REDUCE_OP == 1u && SRC_DTYPE == 8u) || (REDUCE_OMIT == 1u && reduce_float_state());
}

fn reduce_two_values() -> bool {
    return REDUCE_OP == 9u || (reduce_float_state() && reduce_complex_source());
}

fn reduce_state_words() -> u32 {
    return 2u + select(0u, 2u, reduce_two_values()) + select(0u, 1u, reduce_counted());
}

fn nonfinite_bits(b: u32) -> bool {
    return (b & 0x7F800000u) == 0x7F800000u;
}

fn nan_bits(b: u32) -> bool {
    return (b & 0x7FFFFFFFu) > 0x7F800000u;
}

fn f64_nan_bits(bits: vec2<u32>) -> bool {
    let hi = bits.y & 0x7FFFFFFFu;
    return hi > 0x7FF00000u || (hi == 0x7FF00000u && bits.x != 0u);
}

fn special_sum_bits(a: u32, b: u32) -> u32 {
    if (nan_bits(a) || nan_bits(b)) {
        return NAN_32;
    }
    if (nonfinite_bits(a) && nonfinite_bits(b) && a != b) {
        return NAN_32;
    }
    return select(b, a, nonfinite_bits(a));
}

fn ff_finish(s: f32, l: f32) -> vec2<f32> {
    if (l == 0.0) {
        return vec2<f32>(s, 0.0);
    }
    let h = opaque(s + l);
    return vec2<f32>(h, l - opaque(h - s));
}

fn ff_add_value(a: vec2<f32>, x: f32) -> vec2<f32> {
    let ab = bitcast<u32>(a.x);
    let xb = bitcast<u32>(x);
    if (nonfinite_bits(ab) || nonfinite_bits(xb)) {
        return vec2<f32>(bitcast<f32>(special_sum_bits(ab, xb)), 0.0);
    }
    let s = opaque(a.x + x);
    if (nonfinite_bits(bitcast<u32>(s))) {
        return vec2<f32>(s, 0.0);
    }
    let bb = opaque(s - a.x);
    let e = opaque(opaque(a.x - opaque(s - bb)) + opaque(x - bb));
    return ff_finish(s, a.y + e);
}

fn ff_add(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    let ab = bitcast<u32>(a.x);
    let bb0 = bitcast<u32>(b.x);
    if (nonfinite_bits(ab) || nonfinite_bits(bb0)) {
        return vec2<f32>(bitcast<f32>(special_sum_bits(ab, bb0)), 0.0);
    }
    let s = opaque(a.x + b.x);
    if (nonfinite_bits(bitcast<u32>(s))) {
        return vec2<f32>(s, 0.0);
    }
    let bb = opaque(s - a.x);
    let e = opaque(opaque(a.x - opaque(s - bb)) + opaque(b.x - bb));
    return ff_finish(s, e + opaque(a.y + b.y));
}

fn two_product(a: f32, b: f32) -> vec2<f32> {
    let p = opaque(a * b);
    let t = opaque(4097.0 * a);
    let ah = opaque(t - opaque(t - a));
    let al = opaque(a - ah);
    let u = opaque(4097.0 * b);
    let bh = opaque(u - opaque(u - b));
    let bl = opaque(b - bh);
    let r = opaque(opaque(opaque(ah * bh - p) + ah * bl) + al * bh);
    return vec2<f32>(p, r + al * bl);
}

fn ff_div(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    if (nonfinite_bits(bitcast<u32>(a.x))) {
        return vec2<f32>(a.x, 0.0);
    }
    let q1 = opaque(a.x / b.x);
    if (abs(q1) > 1e30) {
        return vec2<f32>(q1, 0.0);
    }
    let p = two_product(q1, b.x);
    let r = opaque(opaque(a.x - p.x) - p.y) + opaque(a.y - q1 * b.y);
    return ff_finish(q1, r / b.x);
}

fn shift_right_64(v: vec2<u32>, s: u32) -> vec2<u32> {
    if (s == 0u) {
        return v;
    }
    if (s >= 32u) {
        return vec2<u32>(v.y >> (s - 32u), 0u);
    }
    return vec2<u32>((v.x >> s) | (v.y << (32u - s)), v.y >> s);
}

fn shift_left_64(v: u32, s: u32) -> vec2<u32> {
    if (s == 0u) {
        return vec2<u32>(v, 0u);
    }
    if (s >= 32u) {
        return vec2<u32>(0u, v << (s - 32u));
    }
    return vec2<u32>(v << s, v >> (32u - s));
}

fn add_64(a: vec2<u32>, b: vec2<u32>) -> vec2<u32> {
    let lo = a.x + b.x;
    return vec2<u32>(lo, a.y + b.y + select(0u, 1u, lo < b.x));
}

fn negate_64(v: vec2<u32>) -> vec2<u32> {
    return add_64(~v, vec2<u32>(1u, 0u));
}

fn less_64(a: vec2<u32>, b: vec2<u32>) -> bool {
    return a.y < b.y || (a.y == b.y && a.x < b.x);
}

fn leading_bit_64(v: vec2<u32>) -> u32 {
    if (v.y != 0u) {
        return firstLeadingBit(v.y) + 32u;
    }
    return firstLeadingBit(v.x);
}

fn round_up_64(v: vec2<u32>, q: vec2<u32>, s: u32) -> bool {
    let rem = add_64(v, negate_64(shift_left_64_wide(q, s)));
    let half = shift_left_64(1u, s - 1u);
    return less_64(half, rem) || (rem.x == half.x && rem.y == half.y && (q.x & 1u) == 1u);
}

fn shift_left_64_wide(v: vec2<u32>, s: u32) -> vec2<u32> {
    if (s >= 32u) {
        return vec2<u32>(0u, v.x << (s - 32u));
    }
    if (s == 0u) {
        return v;
    }
    return vec2<u32>(v.x << s, (v.y << s) | (v.x >> (32u - s)));
}

fn u64_to_f32_bits(v: vec2<u32>) -> u32 {
    if (v.y == 0u) {
        return u32_to_f32_bits(v.x);
    }
    let p = leading_bit_64(v);
    let s = p - 23u;
    let q = shift_right_64(v, s);
    let mant = q.x + select(0u, 1u, round_up_64(v, q, s));
    return ((p + 127u) << 23u) + (mant - 0x800000u);
}

fn u64_to_f64_bits(v: vec2<u32>) -> vec2<u32> {
    if (v.x == 0u && v.y == 0u) {
        return vec2<u32>(0u, 0u);
    }
    let p = leading_bit_64(v);
    var q = v;
    if (p <= 52u) {
        q = shift_left_64_wide(v, 52u - p);
    } else {
        let s = p - 52u;
        q = shift_right_64(v, s);
        if (round_up_64(v, q, s)) {
            q = add_64(q, vec2<u32>(1u, 0u));
        }
    }
    return vec2<u32>(q.x, ((p + 1023u) << 20u) + (q.y - 0x100000u));
}

fn u64_to_ff(v: vec2<u32>) -> vec2<f32> {
    let bits = u64_to_f32_bits(v);
    let hi = bitcast<f32>(bits);
    if (v.y == 0u && v.x < 0x1000000u) {
        return vec2<f32>(hi, 0.0);
    }
    let e = ((bits >> 23u) & 0xFFu) - 127u;
    let back = shift_left_64((bits & 0x7FFFFFu) | 0x800000u, e - 23u);
    let rem = add_64(v, negate_64(back));
    if ((rem.y >> 31u) == 1u) {
        return vec2<f32>(hi, -bitcast<f32>(u64_to_f32_bits(negate_64(rem))));
    }
    return vec2<f32>(hi, bitcast<f32>(u64_to_f32_bits(rem)));
}

fn i64_to_ff(v: vec2<u32>, signed: bool) -> vec2<f32> {
    if (signed && (v.y >> 31u) == 1u) {
        return -u64_to_ff(negate_64(v));
    }
    return u64_to_ff(v);
}

fn wide_int_value(pattern: u32) -> vec2<u32> {
    let negative = dtype_signed(SRC_DTYPE) && (pattern >> 31u) == 1u;
    return vec2<u32>(pattern, select(0u, 0xFFFFFFFFu, negative));
}

fn int_output_range() -> vec2<u32> {
    switch (REDUCE_OUTPUT) {
        case 0u: {
            return vec2<u32>(0xFFFFFF80u, 0x7Fu);
        }
        case 1u: {
            return vec2<u32>(0u, 0xFFu);
        }
        case 2u: {
            return vec2<u32>(0xFFFF8000u, 0x7FFFu);
        }
        case 3u: {
            return vec2<u32>(0u, 0xFFFFu);
        }
        case 4u: {
            return vec2<u32>(0x80000000u, 0x7FFFFFFFu);
        }
        default: {
            return vec2<u32>(0u, 0xFFFFFFFFu);
        }
    }
}

fn int_output_bits(v: vec2<u32>) -> vec4<u32> {
    let signed = dtype_signed(SRC_DTYPE);
    let negative = signed && (v.y >> 31u) == 1u;
    if (REDUCE_OUTPUT == 6u) {
        let m = select(v, negate_64(v), negative);
        let bits = u64_to_f32_bits(m);
        return vec4<u32>(select(bits, bits | 0x80000000u, negative), 0u, 0u, 0u);
    }
    if (REDUCE_OUTPUT == 7u) {
        let m = select(v, negate_64(v), negative);
        let bits = u64_to_f64_bits(m);
        return vec4<u32>(bits.x, select(bits.y, bits.y | 0x80000000u, negative), 0u, 0u);
    }
    if (OVERFLOW == 0u) {
        return vec4<u32>(v.x, 0u, 0u, 0u);
    }
    let range = int_output_range();
    let output_signed = dtype_signed(REDUCE_OUTPUT);
    if (negative) {
        if (!output_signed) {
            return vec4<u32>(0u, 0u, 0u, 0u);
        }
        let below = v.y != 0xFFFFFFFFu || bitcast<i32>(v.x) < bitcast<i32>(range.x) || (v.x >> 31u) == 0u;
        return vec4<u32>(select(v.x, range.x, below), 0u, 0u, 0u);
    }
    let above = v.y != 0u || v.x > range.y;
    return vec4<u32>(select(v.x, range.y, above), 0u, 0u, 0u);
}

fn key_less(a: vec2<u32>, b: vec2<u32>) -> bool {
    if (SRC_DTYPE == 7u) {
        return less_64(a, b);
    }
    return a.x < b.x;
}

fn key_of(bits: vec4<u32>) -> vec2<u32> {
    if (SRC_DTYPE == 7u) {
        if ((bits.y >> 31u) == 1u) {
            return ~bits.xy;
        }
        return vec2<u32>(bits.x, bits.y | 0x80000000u);
    }
    if (SRC_DTYPE == 6u) {
        return vec2<u32>(select(bits.x | 0x80000000u, ~bits.x, (bits.x >> 31u) == 1u), 0u);
    }
    let pattern = int_pattern(bits.x);
    return vec2<u32>(select(pattern, pattern ^ 0x80000000u, dtype_signed(SRC_DTYPE)), 0u);
}

fn key_bits(key: vec2<u32>) -> vec4<u32> {
    if (SRC_DTYPE == 7u) {
        if ((key.y >> 31u) == 1u) {
            return vec4<u32>(key.x, key.y & 0x7FFFFFFFu, 0u, 0u);
        }
        return vec4<u32>(~key, 0u, 0u);
    }
    if (SRC_DTYPE == 6u) {
        return vec4<u32>(select(~key.x, key.x & 0x7FFFFFFFu, (key.x >> 31u) == 1u), 0u, 0u, 0u);
    }
    return vec4<u32>(select(key.x, key.x ^ 0x80000000u, dtype_signed(SRC_DTYPE)), 0u, 0u, 0u);
}

fn element_is_nan(bits: vec4<u32>) -> bool {
    if (SRC_DTYPE == 6u) {
        return nan_bits(bits.x);
    }
    if (SRC_DTYPE == 7u) {
        return f64_nan_bits(bits.xy);
    }
    if (SRC_DTYPE == 8u) {
        return nan_bits(bits.x) || nan_bits(bits.y);
    }
    return false;
}

fn state_identity() -> State {
    if (reduce_ordered()) {
        return State(vec4<u32>(0xFFFFFFFFu), 0xFFFFFFFFu);
    }
    if (REDUCE_OP == 1u) {
        if (SRC_DTYPE == 8u) {
            return State(vec4<u32>(POS_ONE_32, 0u, 0u, 0u), 0u);
        }
        return State(vec4<u32>(select(1u, POS_ONE_32, SRC_DTYPE == 6u), 0u, 0u, 0u), 0u);
    }
    if (reduce_float_state()) {
        return State(vec4<u32>(NEG_ZERO_32, 0u, NEG_ZERO_32, 0u), 0u);
    }
    return State(vec4<u32>(0u), 0u);
}

fn complex_mul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    if (nonfinite_bits(bitcast<u32>(a.x)) || nonfinite_bits(bitcast<u32>(a.y)) || nonfinite_bits(bitcast<u32>(b.x)) || nonfinite_bits(bitcast<u32>(b.y))) {
        if (nan_bits(bitcast<u32>(a.x)) || nan_bits(bitcast<u32>(a.y)) || nan_bits(bitcast<u32>(b.x)) || nan_bits(bitcast<u32>(b.y))) {
            return vec2<f32>(nan_f32());
        }
    }
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn real_mul(a: u32, b: u32) -> u32 {
    if (nan_bits(a) || nan_bits(b)) {
        return NAN_32;
    }
    return bitcast<u32>(bitcast<f32>(a) * bitcast<f32>(b));
}

fn deviation_square(xh: f32, xl: f32, xb: u32, m: vec2<f32>) -> f32 {
    if (nonfinite_bits(xb) || nonfinite_bits(bitcast<u32>(m.x))) {
        return nan_f32();
    }
    let d = opaque(xh - m.x) + opaque(xl - m.y);
    return d * d;
}

fn int_value_ff(pattern: u32) -> vec2<f32> {
    if (dtype_size(SRC_DTYPE) < 4u) {
        return vec2<f32>(bitcast<f32>(int_to_f32_bits(pattern, dtype_signed(SRC_DTYPE))), 0.0);
    }
    return i64_to_ff(wide_int_value(pattern), dtype_signed(SRC_DTYPE));
}

fn state_add(s: State, bits: vec4<u32>, e: u32, m: vec4<f32>) -> State {
    var out = s;
    if (reduce_ordered()) {
        let nan = element_is_nan(bits);
        if (nan && REDUCE_OMIT == 1u) {
            return s;
        }
        var key = key_of(bits);
        if (nan) {
            key = vec2<u32>(0u, 0u);
        }
        if (REDUCE_OP == 9u) {
            let high = select(~key, key, nan);
            if (key_less(key, s.a.xy)) {
                out.a = vec4<u32>(key, out.a.zw);
            }
            if (key_less(high, s.a.zw)) {
                out.a = vec4<u32>(out.a.xy, high);
            }
            return out;
        }
        if (REDUCE_OP == 7u || REDUCE_OP == 8u) {
            if (SRC_DTYPE == 6u && bits.x == NEG_ZERO_32) {
                key = vec2<u32>(0x80000000u, 0u);
            }
            if (SRC_DTYPE == 7u && bits.x == 0u && bits.y == NEG_ZERO_32) {
                key = vec2<u32>(0u, 0x80000000u);
            }
        }
        if ((REDUCE_OP == 6u || REDUCE_OP == 8u) && !nan) {
            key = ~key;
        }
        if (REDUCE_OP == 5u || REDUCE_OP == 6u) {
            if (key_less(key, s.a.xy)) {
                out.a = vec4<u32>(key, 0u, 0u);
            }
            return out;
        }
        let same = key.x == s.a.x && (SRC_DTYPE != 7u || key.y == s.a.y);
        if (key_less(key, s.a.xy) || (same && e < s.e)) {
            out.a = vec4<u32>(key, 0u, 0u);
            out.e = e;
        }
        return out;
    }
    if (REDUCE_OP == 1u) {
        if (SRC_DTYPE == 8u) {
            if (element_is_nan(bits) && REDUCE_OMIT == 1u) {
                return s;
            }
            if (s.e == 0u) {
                out.a = vec4<u32>(bits.xy, 0u, 0u);
            } else {
                out.a = vec4<u32>(bitcast<vec2<u32>>(complex_mul(bitcast<vec2<f32>>(s.a.xy), bitcast<vec2<f32>>(bits.xy))), 0u, 0u);
            }
            out.e = 1u;
            return out;
        }
        if (SRC_DTYPE == 6u) {
            if (nan_bits(bits.x) && REDUCE_OMIT == 1u) {
                return s;
            }
            out.a = vec4<u32>(real_mul(s.a.x, bits.x), 0u, 0u, 0u);
            return out;
        }
        out.a = vec4<u32>(s.a.x * int_pattern(bits.x), 0u, 0u, 0u);
        return out;
    }
    if (!reduce_float_state()) {
        out.a = vec4<u32>(add_64(s.a.xy, wide_int_value(int_pattern(bits.x))), 0u, 0u);
        return out;
    }
    if (REDUCE_OMIT == 1u) {
        if (element_is_nan(bits)) {
            return s;
        }
        out.e = s.e + 1u;
    }
    if (reduce_centered()) {
        if (!reduce_float_source()) {
            let x = int_value_ff(int_pattern(bits.x));
            out.a = vec4<u32>(bitcast<vec2<u32>>(ff_add_value(bitcast<vec2<f32>>(s.a.xy), deviation_square(x.x, x.y, 0u, m.xy))), 0u, 0u);
            return out;
        }
        out.a = vec4<u32>(bitcast<vec2<u32>>(ff_add_value(bitcast<vec2<f32>>(s.a.xy), deviation_square(bitcast<f32>(bits.x), 0.0, bits.x, m.xy))), 0u, 0u);
        if (SRC_DTYPE == 8u) {
            out.a = vec4<u32>(out.a.xy, bitcast<vec2<u32>>(ff_add_value(bitcast<vec2<f32>>(s.a.zw), deviation_square(bitcast<f32>(bits.y), 0.0, bits.y, m.zw))));
        }
        return out;
    }
    out.a = vec4<u32>(bitcast<vec2<u32>>(ff_add_value(bitcast<vec2<f32>>(s.a.xy), bitcast<f32>(bits.x))), s.a.zw);
    if (SRC_DTYPE == 8u) {
        out.a = vec4<u32>(out.a.xy, bitcast<vec2<u32>>(ff_add_value(bitcast<vec2<f32>>(s.a.zw), bitcast<f32>(bits.y))));
    }
    return out;
}

fn state_merge(a: State, b: State) -> State {
    var out = a;
    if (reduce_ordered()) {
        if (REDUCE_OP == 9u) {
            out.a = vec4<u32>(select(a.a.xy, b.a.xy, key_less(b.a.xy, a.a.xy)), select(a.a.zw, b.a.zw, key_less(b.a.zw, a.a.zw)));
            return out;
        }
        let same = b.a.x == a.a.x && (SRC_DTYPE != 7u || b.a.y == a.a.y);
        if (key_less(b.a.xy, a.a.xy) || (same && b.e < a.e)) {
            return b;
        }
        return a;
    }
    if (REDUCE_OP == 1u) {
        if (SRC_DTYPE == 8u) {
            if (a.e == 0u) {
                return b;
            }
            if (b.e == 0u) {
                return a;
            }
            out.a = vec4<u32>(bitcast<vec2<u32>>(complex_mul(bitcast<vec2<f32>>(a.a.xy), bitcast<vec2<f32>>(b.a.xy))), 0u, 0u);
        } else if (SRC_DTYPE == 6u) {
            out.a = vec4<u32>(real_mul(a.a.x, b.a.x), 0u, 0u, 0u);
        } else {
            out.a = vec4<u32>(a.a.x * b.a.x, 0u, 0u, 0u);
        }
        return out;
    }
    if (!reduce_float_state()) {
        out.a = vec4<u32>(add_64(a.a.xy, b.a.xy), 0u, 0u);
        return out;
    }
    out.a = vec4<u32>(bitcast<vec2<u32>>(ff_add(bitcast<vec2<f32>>(a.a.xy), bitcast<vec2<f32>>(b.a.xy))), a.a.zw);
    if (SRC_DTYPE == 8u) {
        out.a = vec4<u32>(out.a.xy, bitcast<vec2<u32>>(ff_add(bitcast<vec2<f32>>(a.a.zw), bitcast<vec2<f32>>(b.a.zw))));
    }
    out.e = a.e + b.e;
    return out;
}

fn state_load_src(o: u32) -> State {
    var s = State(vec4<u32>(src[o], src[o + 1u], 0u, 0u), 0u);
    var at = o + 2u;
    if (reduce_two_values()) {
        s.a = vec4<u32>(s.a.xy, src[at], src[at + 1u]);
        at = at + 2u;
    }
    if (reduce_counted()) {
        s.e = src[at];
    }
    return s;
}

fn state_store(o: u32, s: State) {
    dst[o] = s.a.x;
    dst[o + 1u] = s.a.y;
    var at = o + 2u;
    if (reduce_two_values()) {
        dst[at] = s.a.z;
        dst[at + 1u] = s.a.w;
        at = at + 2u;
    }
    if (reduce_counted()) {
        dst[at] = s.e;
    }
}

fn count_as_ff(s: State) -> vec2<f32> {
    if (REDUCE_OMIT == 1u) {
        return u64_to_ff(vec2<u32>(s.e, 0u));
    }
    return u64_to_ff(vec2<u32>(params[R_COUNT], 0u));
}

fn canonical_bits(b: u32) -> u32 {
    return select(b, NAN_32, nan_bits(b));
}

fn ff_value_bits(v: vec2<f32>) -> u32 {
    if (nonfinite_bits(bitcast<u32>(v.x))) {
        return canonical_bits(bitcast<u32>(v.x));
    }
    if (v.y == 0.0) {
        return bitcast<u32>(v.x);
    }
    return canonical_bits(bitcast<u32>(v.x + v.y));
}

fn complex_output(re: u32, im: u32) -> vec4<u32> {
    if (nan_bits(re) || nan_bits(im)) {
        return vec4<u32>(NAN_32, NAN_32, 0u, 0u);
    }
    return vec4<u32>(re, im, 0u, 0u);
}

fn mean_ff(sum: vec2<f32>, n: vec2<f32>) -> vec2<f32> {
    if (n.x == 0.0) {
        return vec2<f32>(nan_f32(), 0.0);
    }
    return ff_div(sum, n);
}

fn variance_bits(m2: vec2<f32>, den: vec2<f32>) -> u32 {
    if (den.x + den.y <= 0.0) {
        return NAN_32;
    }
    return ff_value_bits(ff_div(m2, den));
}

fn root_bits(bits: u32) -> u32 {
    if (nonfinite_bits(bits)) {
        return canonical_bits(bits);
    }
    if (bits == 0u) {
        return 0u;
    }
    return canonical_bits(bitcast<u32>(sqrt(bitcast<f32>(bits))));
}

fn state_output(s: State) -> vec4<u32> {
    if (REDUCE_OP == 7u || REDUCE_OP == 8u) {
        return vec4<u32>(s.e, 0u, 0u, 0u);
    }
    if (reduce_ordered()) {
        var key = s.a.xy;
        let second = REDUCE_OP == 9u && params[R_SELECT] == 1u;
        if (second) {
            key = s.a.zw;
        }
        let wide = SRC_DTYPE == 7u;
        if (SRC_DTYPE == 6u || wide) {
            let zero = key.x == 0u && key.y == 0u;
            let full = key.x == 0xFFFFFFFFu && (!wide || key.y == 0xFFFFFFFFu);
            if (zero || full) {
                return vec4<u32>(select(NAN_32, 0u, wide), select(0u, NAN_HI_64, wide), 0u, 0u);
            }
        }
        if (REDUCE_OP == 6u || second) {
            key = ~key;
            if (!wide) {
                key = vec2<u32>(key.x, 0u);
            }
        }
        return key_bits(key);
    }
    if (REDUCE_OP == 1u) {
        if (SRC_DTYPE == 8u) {
            return complex_output(s.a.x, s.a.y);
        }
        if (SRC_DTYPE == 6u) {
            return vec4<u32>(canonical_bits(s.a.x), 0u, 0u, 0u);
        }
        return int_output_bits(wide_int_value(s.a.x));
    }
    if (REDUCE_OP == 0u) {
        if (!reduce_float_source()) {
            return int_output_bits(s.a.xy);
        }
        if (REDUCE_OMIT == 1u && s.e == 0u) {
            return vec4<u32>(0u);
        }
        let re = ff_value_bits(bitcast<vec2<f32>>(s.a.xy));
        if (SRC_DTYPE == 8u) {
            return complex_output(re, ff_value_bits(bitcast<vec2<f32>>(s.a.zw)));
        }
        return vec4<u32>(re, 0u, 0u, 0u);
    }
    if (REDUCE_OP == 2u) {
        let n = count_as_ff(s);
        if (!reduce_float_source()) {
            let total = i64_to_ff(s.a.xy, dtype_signed(SRC_DTYPE));
            return vec4<u32>(ff_value_bits(mean_ff(total, n)), 0u, 0u, 0u);
        }
        let re = ff_value_bits(mean_ff(bitcast<vec2<f32>>(s.a.xy), n));
        if (SRC_DTYPE == 8u) {
            return complex_output(re, ff_value_bits(mean_ff(bitcast<vec2<f32>>(s.a.zw), n)));
        }
        return vec4<u32>(re, 0u, 0u, 0u);
    }
    let n = count_as_ff(s);
    let ddof = vec2<f32>(bitcast<f32>(params[R_DDOF_HI]), bitcast<f32>(params[R_DDOF_LO]));
    let den = ff_finish(n.x - ddof.x, n.y - ddof.y);
    var bits = variance_bits(bitcast<vec2<f32>>(s.a.xy), den);
    if (SRC_DTYPE == 8u) {
        let im = variance_bits(bitcast<vec2<f32>>(s.a.zw), den);
        if (nan_bits(bits) || nan_bits(im)) {
            bits = NAN_32;
        } else {
            bits = canonical_bits(bitcast<u32>(bitcast<f32>(bits) + bitcast<f32>(im)));
        }
    }
    if (REDUCE_OP == 4u) {
        return vec4<u32>(root_bits(bits), 0u, 0u, 0u);
    }
    return vec4<u32>(bits, 0u, 0u, 0u);
}

fn kept_address(k: u32) -> u32 {
    var addr = params[R_SRC_OFFSET];
    var rem = k;
    let kept = params[R_KEPT];
    for (var j = 0u; j < kept; j = j + 1u) {
        let d = kept - 1u - j;
        let n = params[P_SHAPE + d];
        addr = addr + (rem % n) * params[P_SRC_STRIDE + d];
        rem = rem / n;
    }
    return addr;
}

fn reduced_address(base: u32, e: u32) -> u32 {
    var addr = base;
    var rem = e;
    let kept = params[R_KEPT];
    let reduced = params[R_REDUCED];
    for (var j = 0u; j < reduced; j = j + 1u) {
        let d = kept + reduced - 1u - j;
        let n = params[P_SHAPE + d];
        addr = addr + (rem % n) * params[P_SRC_STRIDE + d];
        rem = rem / n;
    }
    return addr;
}

fn mean_of(k: u32) -> vec4<f32> {
    let words = reduce_state_words();
    let o = params[R_MEAN] + k * words;
    var s = State(vec4<u32>(dst[o], dst[o + 1u], 0u, 0u), 0u);
    if (reduce_two_values()) {
        s.a = vec4<u32>(s.a.xy, dst[o + 2u], dst[o + 3u]);
    }
    if (REDUCE_OMIT == 1u && reduce_float_source()) {
        s.e = dst[o + words - 1u];
    }
    let n = count_as_ff(s);
    if (!reduce_float_source()) {
        return vec4<f32>(mean_ff(i64_to_ff(s.a.xy, dtype_signed(SRC_DTYPE)), n), 0.0, 0.0);
    }
    let re = mean_ff(bitcast<vec2<f32>>(s.a.xy), n);
    if (SRC_DTYPE == 8u) {
        return vec4<f32>(re, mean_ff(bitcast<vec2<f32>>(s.a.zw), n));
    }
    return vec4<f32>(re, 0.0, 0.0);
}

fn walk_output(j: u32) -> u32 {
    let step = params[R_WALK_STEP];
    if (step <= 1u) {
        return j;
    }
    let n = params[R_WALK_COUNT];
    let rest = j / n;
    return (rest / step) * step * n + (j % n) * step + rest % step;
}

fn reduce_scan(k: u32, c: u32, lane: u32, step: u32) -> State {
    var s = state_identity();
    let length = params[R_CHUNK];
    let first = c * length;
    let size = min(length, params[R_COUNT] - first);
    if (lane >= size) {
        return s;
    }
    var m = vec4<f32>(0.0);
    if (reduce_centered()) {
        m = mean_of(k);
    }
    let kept = params[R_KEPT];
    let reduced = params[R_REDUCED];
    var inner_n = 1u;
    var inner_s = 0u;
    if (reduced > 0u) {
        inner_n = params[P_SHAPE + kept + reduced - 1u];
        inner_s = params[P_SRC_STRIDE + kept + reduced - 1u];
    }
    let base = kept_address(params[R_BASE] + k);
    let advance = step * inner_s;
    var e = first + lane;
    var addr = reduced_address(base, e);
    var run = inner_n - e % inner_n;
    var left = (size - lane + step - 1u) / step;
    loop {
        s = state_add(s, load_bits(addr), e, m);
        left = left - 1u;
        if (left == 0u) {
            break;
        }
        e = e + step;
        if (step < run) {
            run = run - step;
            addr = addr + advance;
        } else {
            addr = reduced_address(base, e);
            run = inner_n - e % inner_n;
        }
    }
    return s;
}

fn reduce_store(k: u32, c: u32, s: State) {
    if (REDUCE_WRITE == 1u) {
        store_element(params[R_DST_OFFSET] + k * dtype_size(DST_DTYPE), state_output(s));
    } else {
        state_store(params[R_STATE_DST] + (k * params[R_CHUNKS] + c) * reduce_state_words(), s);
    }
}

@compute @workgroup_size(256)
fn reduce(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    opaque_zero = params[R_ZERO];
    let i = invocation_index(wid, nwg, lid);
    let outputs = params[R_OUTPUTS];
    let chunks = params[R_CHUNKS];
    if (i >= outputs * chunks) {
        return;
    }
    var k = i / chunks;
    var c = i % chunks;
    if (params[R_SWAP] == 1u) {
        k = i % outputs;
        c = i / outputs;
    }
    k = walk_output(k);
    reduce_store(k, c, reduce_scan(k, c, 0u, 1u));
}

@compute @workgroup_size(256)
fn reduceShared(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    opaque_zero = params[R_ZERO];
    let w = wid.y * nwg.x + wid.x;
    let outputs = params[R_OUTPUTS];
    let chunks = params[R_CHUNKS];
    let live = w < outputs * chunks;
    var k = w / chunks;
    var c = w % chunks;
    if (params[R_SWAP] == 1u) {
        k = w % outputs;
        c = w / outputs;
    }
    k = walk_output(k);
    var s = state_identity();
    if (live) {
        s = reduce_scan(k, c, lid, 256u);
    }
    share[lid] = s;
    workgroupBarrier();
    for (var stride = 128u; stride > 0u; stride = stride >> 1u) {
        if (lid < stride) {
            share[lid] = state_merge(share[lid], share[lid + stride]);
        }
        workgroupBarrier();
    }
    if (lid == 0u && live) {
        reduce_store(k, c, share[0]);
    }
}

@compute @workgroup_size(256)
fn reducePartials(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    opaque_zero = params[R_ZERO];
    let k = invocation_index(wid, nwg, lid);
    if (k >= params[R_OUTPUTS]) {
        return;
    }
    let chunks = params[R_CHUNKS];
    let words = reduce_state_words();
    let start = params[R_STATE_SRC] + k * chunks * words;
    var s = state_load_src(start);
    for (var c = 1u; c < chunks; c = c + 1u) {
        s = state_merge(s, state_load_src(start + c * words));
    }
    if (REDUCE_WRITE == 1u) {
        store_element(params[R_DST_OFFSET] + k * dtype_size(DST_DTYPE), state_output(s));
    } else {
        state_store(params[R_STATE_DST] + k * words, s);
    }
}

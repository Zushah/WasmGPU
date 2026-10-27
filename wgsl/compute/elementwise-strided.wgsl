/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// 0 add, 1 sub, 2 mul, 3 axpy (alpha * a + b).
override OPERATION: u32 = 0u;
// 0 f32, 1 u32, 2 complex f32 pairs.
override KIND: u32 = 0u;

@group(0) @binding(0) var<storage, read> a: array<u32>;
@group(0) @binding(1) var<storage, read> b: array<u32>;
@group(0) @binding(2) var<storage, read_write> out: array<u32>;
@group(0) @binding(3) var<storage, read> params: array<u32>;

// Offsets and strides are in bytes, while negative strides are stored as wrapping u32 values, like the ndarray gather.
const P_COUNT: u32 = 0u;
const P_NDIM: u32 = 1u;
const P_A_OFFSET: u32 = 2u;
const P_B_OFFSET: u32 = 3u;
const P_A_PAIR: u32 = 4u;
const P_B_PAIR: u32 = 5u;
const P_ALPHA_RE: u32 = 6u;
const P_ALPHA_IM: u32 = 7u;
const P_SHAPE: u32 = 8u;
const P_A_STRIDE: u32 = 16u;
const P_B_STRIDE: u32 = 24u;

fn invocation_index(wid: vec3<u32>, nwg: vec3<u32>, lid: u32) -> u32 {
    return (wid.y * nwg.x + wid.x) * 256u + lid;
}

fn cmul(x: vec2<f32>, y: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(x.x * y.x - x.y * y.y, x.x * y.y + x.y * y.x);
}

fn apply_f32(x: f32, y: f32) -> f32 {
    if (OPERATION == 0u) {
        return x + y;
    }
    if (OPERATION == 1u) {
        return x - y;
    }
    if (OPERATION == 2u) {
        return x * y;
    }
    return bitcast<f32>(params[P_ALPHA_RE]) * x + y;
}

fn apply_u32(x: u32, y: u32) -> u32 {
    if (OPERATION == 0u) {
        return x + y;
    }
    if (OPERATION == 1u) {
        return x - y;
    }
    if (OPERATION == 2u) {
        return x * y;
    }
    return params[P_ALPHA_RE] * x + y;
}

fn apply_c64(x: vec2<f32>, y: vec2<f32>) -> vec2<f32> {
    if (OPERATION == 0u) {
        return x + y;
    }
    if (OPERATION == 1u) {
        return x - y;
    }
    if (OPERATION == 2u) {
        return cmul(x, y);
    }
    return cmul(
        vec2<f32>(bitcast<f32>(params[P_ALPHA_RE]), bitcast<f32>(params[P_ALPHA_IM])),
        x
    ) + y;
}

@compute @workgroup_size(256)
fn main(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    let i = invocation_index(wid, nwg, lid);
    if (i >= params[P_COUNT]) {
        return;
    }
    let ndim = params[P_NDIM];
    var addr_a = params[P_A_OFFSET];
    var addr_b = params[P_B_OFFSET];
    var rem = i;
    for (var k = 0u; k < ndim; k = k + 1u) {
        let d = ndim - 1u - k;
        let n = params[P_SHAPE + d];
        let c = rem % n;
        rem = rem / n;
        addr_a = addr_a + c * params[P_A_STRIDE + d];
        addr_b = addr_b + c * params[P_B_STRIDE + d];
    }
    if (KIND == 2u) {
        let x = vec2<f32>(
            bitcast<f32>(a[addr_a >> 2u]),
            bitcast<f32>(a[(addr_a + params[P_A_PAIR]) >> 2u])
        );
        let y = vec2<f32>(
            bitcast<f32>(b[addr_b >> 2u]),
            bitcast<f32>(b[(addr_b + params[P_B_PAIR]) >> 2u])
        );
        let r = apply_c64(x, y);
        out[2u * i] = bitcast<u32>(r.x);
        out[2u * i + 1u] = bitcast<u32>(r.y);
        return;
    }
    let x = a[addr_a >> 2u];
    let y = b[addr_b >> 2u];
    if (KIND == 1u) {
        out[i] = apply_u32(x, y);
        return;
    }
    out[i] = bitcast<u32>(apply_f32(bitcast<f32>(x), bitcast<f32>(y)));
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Batched complex64 solve for LU factors with partial pivoting.
 * The kernel applies `ipiv`, performs forward and back substitution,
 * and writes the solution to `x`.
 */

struct LuBatchedParams {
    batch_count: u32,
    n: u32,
    elems_per_matrix: u32,
    _pad: u32,
}

@group(0) @binding(0) var<uniform> params: LuBatchedParams;
@group(0) @binding(1) var<storage, read> lu: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> rhs: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> x: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read> ipiv: array<u32>;

fn cx_mul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn cx_div(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    let d = b.x * b.x + b.y * b.y;
    return vec2<f32>((a.x * b.x + a.y * b.y) / d, (a.y * b.x - a.x * b.y) / d);
}

@compute @workgroup_size(1, 1, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let b = gid.x;
    if (b >= params.batch_count) {
        return;
    }
    let n = params.n;
    let stride = params.elems_per_matrix;
    let base = b * stride;
    let base_rhs = b * n;
    let base_ipiv = b * n;
    for (var i = 0u; i < n; i = i + 1u) {
        x[base_rhs + i] = rhs[base_rhs + i];
    }
    for (var kk = 0u; kk < n - 1u; kk = kk + 1u) {
        let p = ipiv[base_ipiv + kk];
        if (p != kk) {
            let t = x[base_rhs + kk];
            x[base_rhs + kk] = x[base_rhs + p];
            x[base_rhs + p] = t;
        }
    }
    for (var i = 0u; i < n; i = i + 1u) {
        var sum = x[base_rhs + i];
        for (var j = 0u; j < i; j = j + 1u) {
            sum = sum - cx_mul(lu[base + i * n + j], x[base_rhs + j]);
        }
        x[base_rhs + i] = sum;
    }
    for (var ii = n; ii > 0u; ii = ii - 1u) {
        let i = ii - 1u;
        var sum = x[base_rhs + i];
        for (var j = i + 1u; j < n; j = j + 1u) {
            sum = sum - cx_mul(lu[base + i * n + j], x[base_rhs + j]);
        }
        x[base_rhs + i] = cx_div(sum, lu[base + i * n + i]);
    }
}

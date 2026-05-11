/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Batched real solve fallback for LU factors with partial pivoting.
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
@group(0) @binding(1) var<storage, read> lu: array<f32>;
@group(0) @binding(2) var<storage, read> rhs: array<f32>;
@group(0) @binding(3) var<storage, read_write> x: array<f32>;
@group(0) @binding(4) var<storage, read> ipiv: array<u32>;

@compute @workgroup_size(1, 1, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let b = gid.x;
    if (b >= params.batch_count) {
        return;
    }
    let n = params.n;
    let stride = params.elems_per_matrix;
    let base = b * stride;
    let baseRhs = b * n;
    let baseIpiv = b * n;

    for (var i = 0u; i < n; i = i + 1u) {
        x[baseRhs + i] = rhs[baseRhs + i];
    }

    for (var kk = 0u; kk < n - 1u; kk = kk + 1u) {
        let p = ipiv[baseIpiv + kk];
        if (p != kk) {
            let t = x[baseRhs + kk];
            x[baseRhs + kk] = x[baseRhs + p];
            x[baseRhs + p] = t;
        }
    }

    for (var i = 0u; i < n; i = i + 1u) {
        var sum = x[baseRhs + i];
        for (var j = 0u; j < i; j = j + 1u) {
            sum = sum - lu[base + i * n + j] * x[baseRhs + j];
        }
        x[baseRhs + i] = sum;
    }

    for (var ii = n; ii > 0u; ii = ii - 1u) {
        let i = ii - 1u;
        var sum = x[baseRhs + i];
        for (var j = i + 1u; j < n; j = j + 1u) {
            sum = sum - lu[base + i * n + j] * x[baseRhs + j];
        }
        x[baseRhs + i] = sum / lu[base + i * n + i];
    }
}

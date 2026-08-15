/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Batched real solve for LU factors with partial pivoting using one
 * workgroup per matrix. The kernel caches the right-hand side in
 * workgroup memory, performs blocked forward and back substitution, and
 * writes the solution to `x`.
 */

const WG_SIZE: u32 = 64u;
const BS:      u32 = 32u;
const MAX_N:   u32 = 512u;
const STRIDE_ITERS: u32 = 8u;

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

var<workgroup> wg_x:       array<f32, MAX_N>;
var<workgroup> wg_partial: array<f32, WG_SIZE>;

@compute @workgroup_size(WG_SIZE, 1, 1)
fn main(@builtin(workgroup_id) wg_id: vec3<u32>, @builtin(local_invocation_index) lid: u32) {
    let b = wg_id.x;
    if (b >= params.batch_count) {
        return;
    }
    let n        = params.n;
    let base     = b * params.elems_per_matrix;
    let base_rhs  = b * n;
    let base_ipiv = b * n;
    {
        for (var s: u32 = 0u; s < STRIDE_ITERS; s = s + 1u) {
            let t = lid + s * WG_SIZE;
            if (t < n) {
                wg_x[t] = rhs[base_rhs + t];
            }
        }
    }
    workgroupBarrier();
    if (lid == 0u) {
        for (var k: u32 = 0u; k < n; k = k + 1u) {
            let p = ipiv[base_ipiv + k];
            if (p != k) {
                let tmp = wg_x[k];
                wg_x[k] = wg_x[p];
                wg_x[p] = tmp;
            }
        }
    }
    workgroupBarrier();
    let n_blocks = (n + BS - 1u) / BS;
    for (var bi: u32 = 0u; bi < n_blocks; bi = bi + 1u) {
        let bs0 = bi * BS;
        let bs1 = min(bs0 + BS, n);
        for (var ii: u32 = bs0; ii < bs1; ii = ii + 1u) {
            var partial = 0.0;
            for (var s: u32 = 0u; s < STRIDE_ITERS; s = s + 1u) {
                let j = bs0 + lid + s * WG_SIZE;
                if (j < ii) {
                    partial = partial + lu[base + ii * n + j] * wg_x[j];
                }
            }
            wg_partial[lid] = partial;
            workgroupBarrier();
            if (lid == 0u) {
                var sum = wg_partial[0];
                for (var t: u32 = 1u; t < WG_SIZE; t = t + 1u) {
                    sum = sum + wg_partial[t];
                }
                wg_x[ii] = wg_x[ii] - sum;
            }
            workgroupBarrier();
        }
        var k = bs1 + lid;
        while (k < n) {
            var update = 0.0;
            for (var j: u32 = bs0; j < bs1; j = j + 1u) {
                update = update + lu[base + k * n + j] * wg_x[j];
            }
            wg_x[k] = wg_x[k] - update;
            k = k + WG_SIZE;
        }
        workgroupBarrier();
    }
    for (var b_idx: u32 = 0u; b_idx < n_blocks; b_idx = b_idx + 1u) {
        let bi  = n_blocks - 1u - b_idx;
        let bs0 = bi * BS;
        let bs1 = min(bs0 + BS, n);
        let bsz = bs1 - bs0;
        for (var ii_off: u32 = 0u; ii_off < bsz; ii_off = ii_off + 1u) {
            let ii = bs1 - 1u - ii_off;
            var partial = 0.0;
            for (var s: u32 = 0u; s < STRIDE_ITERS; s = s + 1u) {
                let j = ii + 1u + lid + s * WG_SIZE;
                if (j < bs1) {
                    partial = partial + lu[base + ii * n + j] * wg_x[j];
                }
            }
            wg_partial[lid] = partial;
            workgroupBarrier();
            if (lid == 0u) {
                var sum = wg_partial[0];
                for (var t: u32 = 1u; t < WG_SIZE; t = t + 1u) {
                    sum = sum + wg_partial[t];
                }
                let new_val = wg_x[ii] - sum;
                wg_x[ii] = new_val / lu[base + ii * n + ii];
            }
            workgroupBarrier();
        }
        var k = lid;
        while (k < bs0) {
            var update = 0.0;
            for (var j: u32 = bs0; j < bs1; j = j + 1u) {
                update = update + lu[base + k * n + j] * wg_x[j];
            }
            wg_x[k] = wg_x[k] - update;
            k = k + WG_SIZE;
        }
        workgroupBarrier();
    }
    {
        for (var s: u32 = 0u; s < STRIDE_ITERS; s = s + 1u) {
            let w = lid + s * WG_SIZE;
            if (w < n) {
                x[base_rhs + w] = wg_x[w];
            }
        }
    }
}

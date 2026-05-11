/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Blocked real LU upper-panel solve.
 * The kernel updates A12 by solving L11 * U12 = A12 for the active panel.
 * Each thread owns one full column of U12 and accumulates the freshly
 * solved U values in registers, so no thread reads a U value that another
 * thread is concurrently writing.
 */

const MAX_PANEL_B: u32 = 16u;

struct LuBlockedParams {
    batch_count: u32,
    n: u32,
    elems_per_matrix: u32,
    kk: u32,
    pw: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
}

@group(0) @binding(0) var<uniform> params: LuBlockedParams;
@group(0) @binding(1) var<storage, read_write> matrices: array<f32>;

@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let n = params.n;
    let kk = params.kk;
    let pw = params.pw;
    let trail_n = n - (kk + pw);
    if (trail_n == 0u || pw == 0u) { return; }

    let idx = gid.x;
    let b = idx / trail_n;
    if (b >= params.batch_count) { return; }
    let j = idx - b * trail_n;
    let col = (kk + pw) + j;
    let base = b * params.elems_per_matrix;

    var u_col: array<f32, MAX_PANEL_B>;
    for (var i: u32 = 0u; i < pw; i = i + 1u) {
        let row = kk + i;
        var sum_v = matrices[base + row * n + col];
        for (var r: u32 = 0u; r < i; r = r + 1u) {
            let l_val = matrices[base + row * n + (kk + r)];
            sum_v = sum_v - l_val * u_col[r];
        }
        u_col[i] = sum_v;
        matrices[base + row * n + col] = sum_v;
    }
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const TILE: u32 = 16u;

@group(0) @binding(0) var<storage, read> a: array<u32>;
@group(0) @binding(1) var<storage, read> b: array<u32>;
@group(0) @binding(2) var<storage, read_write> c: array<u32>;
@group(0) @binding(3) var<storage, read> params: array<u32>;

var<workgroup> tile_a: array<u32, 256>;
var<workgroup> tile_b: array<u32, 256>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let m = params[0];
    let n = params[1];
    let k = params[2];
    let row = wg.y * TILE + lid.y;
    let col = wg.x * TILE + lid.x;
    let local = lid.y * TILE + lid.x;
    let a_row = i32(params[8]) + i32(row) * bitcast<i32>(params[9]);
    let a_cs = bitcast<i32>(params[10]);
    let b_col = i32(params[11]) + i32(col) * bitcast<i32>(params[13]);
    let b_rs = bitcast<i32>(params[12]);
    var acc = 0u;
    for (var base = 0u; base < k; base = base + TILE) {
        let ak = base + lid.x;
        let bk = base + lid.y;
        var va = 0u;
        var vb = 0u;
        if (row < m && ak < k) {
            va = a[u32(a_row + i32(ak) * a_cs)];
        }
        if (bk < k && col < n) {
            vb = b[u32(b_col + i32(bk) * b_rs)];
        }
        tile_a[local] = va;
        tile_b[local] = vb;
        workgroupBarrier();
        for (var t = 0u; t < TILE; t = t + 1u) {
            acc = acc + tile_a[lid.y * TILE + t] * tile_b[t * TILE + lid.x];
        }
        workgroupBarrier();
    }
    if (row < m && col < n) {
        let ci = u32(i32(params[14]) + i32(row) * bitcast<i32>(params[15]) + i32(col) * bitcast<i32>(params[16]));
        let beta = params[4];
        let old = select(0u, c[ci], beta != 0u);
        c[ci] = params[3] * acc + beta * old;
    }
}

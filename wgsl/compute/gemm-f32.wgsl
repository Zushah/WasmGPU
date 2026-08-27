/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const TILE: u32 = 16u;

@group(0) @binding(0) var<storage, read> a: array<f32>;
@group(0) @binding(1) var<storage, read> b: array<f32>;
@group(0) @binding(2) var<storage, read_write> c: array<f32>;
@group(0) @binding(3) var<storage, read> params: array<u32>;

var<workgroup> tile_a: array<f32, 256>;
var<workgroup> tile_b: array<f32, 256>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let m = params[0];
    let n = params[1];
    let k = params[2];
    let row = wg.y * TILE + lid.y;
    let col = wg.x * TILE + lid.x;
    let local = lid.y * TILE + lid.x;
    var acc = 0.0;
    for (var base = 0u; base < k; base = base + TILE) {
        let ak = base + lid.x;
        let bk = base + lid.y;
        tile_a[local] = select(0.0, a[row * k + ak], row < m && ak < k);
        tile_b[local] = select(0.0, b[bk * n + col], bk < k && col < n);
        workgroupBarrier();
        for (var t = 0u; t < TILE; t = t + 1u) {
            acc = acc + tile_a[lid.y * TILE + t] * tile_b[t * TILE + lid.x];
        }
        workgroupBarrier();
    }
    if (row < m && col < n) {
        let alpha = bitcast<f32>(params[3]);
        let beta = bitcast<f32>(params[4]);
        let old = select(0.0, c[row * n + col], beta != 0.0);
        c[row * n + col] = alpha * acc + beta * old;
    }
}

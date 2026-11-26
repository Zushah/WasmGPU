/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

override SHIFT: u32 = 0u;
const RADIX: u32 = 16u;

@group(0) @binding(0) var<storage, read> keys_in: array<u32>;
@group(0) @binding(1) var<storage, read> values_in: array<u32>;
@group(0) @binding(2) var<storage, read> ranks: array<u32>;
@group(0) @binding(3) var<storage, read_write> keys_out: array<u32>;
@group(0) @binding(4) var<storage, read_write> values_out: array<u32>;
@group(0) @binding(5) var<storage, read> offsets: array<u32>;

fn invocation_index(wid: vec3<u32>, nwg: vec3<u32>, lid: u32) -> u32 {
    return (wid.y * nwg.x + wid.x) * 256u + lid;
}

@compute @workgroup_size(256)
fn main(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
    @builtin(local_invocation_index) lid: u32,
) {
    let i = invocation_index(wid, nwg, lid);
    let n = arrayLength(&keys_in);
    if (i >= n) {
        return;
    }
    let k = keys_in[i];
    let d = (k >> SHIFT) & (RADIX - 1u);
    let dst = offsets[d * (arrayLength(&offsets) / RADIX) + i / 1024u] + ranks[i];
    keys_out[dst] = k;
    values_out[dst] = values_in[i];
}

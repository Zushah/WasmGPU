/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

override BIT: u32 = 0u;

@group(0) @binding(0) var<storage, read> keys_in: array<u32>;
@group(0) @binding(1) var<storage, read> prefix: array<u32>;
@group(0) @binding(2) var<storage, read_write> keys_out: array<u32>;

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
    let is_zero = ((k >> BIT) & 1u) == 0u;
    let zero_pos = prefix[i];
    let last_key = keys_in[n - 1u];
    let z = prefix[n - 1u] + select(0u, 1u, ((last_key >> BIT) & 1u) == 0u);
    let one_pos = z + (i - zero_pos);
    let dst = select(one_pos, zero_pos, is_zero);
    keys_out[dst] = k;
}

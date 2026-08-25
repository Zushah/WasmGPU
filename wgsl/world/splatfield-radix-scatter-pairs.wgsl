/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

override BIT: u32 = 0u;

@group(0) @binding(0) var<storage, read> keys_in: array<u32>;
@group(0) @binding(1) var<storage, read> values_in: array<u32>;
@group(0) @binding(2) var<storage, read> prefix: array<u32>;
@group(0) @binding(3) var<storage, read_write> keys_out: array<u32>;
@group(0) @binding(4) var<storage, read_write> values_out: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&keys_in);
    if (i >= n) {
        return;
    }
    let k = keys_in[i];
    let is_zero = ((k >> BIT) & 1u) == 0u;
    let zero_pos = prefix[i];
    let last_key = keys_in[n - 1u];
    let zero_count = prefix[n - 1u] + select(0u, 1u, ((last_key >> BIT) & 1u) == 0u);
    let one_pos = zero_count + (i - zero_pos);
    let dst = select(one_pos, zero_pos, is_zero);
    keys_out[dst] = k;
    values_out[dst] = values_in[i];
}

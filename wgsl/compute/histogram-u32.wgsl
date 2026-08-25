/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

@group(0) @binding(0) var<storage, read> keys: array<u32>;
@group(0) @binding(1) var<storage, read_write> bins: array<atomic<u32>>;

var<workgroup> local_bins: array<atomic<u32>, 256>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&keys);
    if (i >= n) {
        return;
    }
    let k = keys[i];
    let b = arrayLength(&bins);
    if (k < b) {
        _ = atomicAdd(&bins[k], 1u);
    }
}

@compute @workgroup_size(256)
fn main_local_256(
    @builtin(local_invocation_id) lid: vec3<u32>,
    @builtin(workgroup_id) wid: vec3<u32>,
) {
    let tid = lid.x;
    atomicStore(&local_bins[tid], 0u);
    workgroupBarrier();
    let n = arrayLength(&keys);
    let b = arrayLength(&bins);
    let base = wid.x * 1024u + tid;
    for (var j = 0u; j < 4u; j++) {
        let i = base + j * 256u;
        if (i < n) {
            let key = keys[i];
            if (key < b) {
                _ = atomicAdd(&local_bins[key], 1u);
            }
        }
    }
    workgroupBarrier();
    if (tid < b) {
        _ = atomicAdd(&bins[tid], atomicLoad(&local_bins[tid]));
    }
}

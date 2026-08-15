/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const WORKGROUP_SIZE: u32 = 256u;
const ELEMENTS_PER_WORKGROUP: u32 = 512u;

@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;

var<workgroup> share: array<u32, 256>;

@compute @workgroup_size(256)
fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
    let tid = lid.x;
    let n = arrayLength(&input);
    let base = wid.x * ELEMENTS_PER_WORKGROUP;
    let i0 = base + tid;
    let i1 = i0 + WORKGROUP_SIZE;
    var acc = 0xFFFFFFFFu;
    if (i0 < n) {
        acc = input[i0];
    }
    if (i1 < n) {
        acc = min(acc, input[i1]);
    }
    share[tid] = acc;
    workgroupBarrier();
    var stride = WORKGROUP_SIZE / 2u;
    loop {
        if (stride == 0u) {
            break;
        }
        if (tid < stride) {
            share[tid] = min(share[tid], share[tid + stride]);
        }
        workgroupBarrier();
        stride = stride / 2u;
    }
    if (tid == 0u) {
        output[wid.x] = share[0];
    }
}

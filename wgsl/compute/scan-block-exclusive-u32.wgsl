/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const WORKGROUP_SIZE: u32 = 256u;
const ELEMENTS_PER_WORKGROUP: u32 = 512u;

@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;
@group(0) @binding(2) var<storage, read_write> block_sums: array<u32>;

var<workgroup> temp: array<u32, 512>;

@compute @workgroup_size(256)
fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
    let tid = lid.x;
    let n = arrayLength(&input);
    let base = wid.x * ELEMENTS_PER_WORKGROUP;
    let ai = base + tid;
    let bi = ai + WORKGROUP_SIZE;
    temp[tid] = select(0u, input[ai], ai < n);
    temp[tid + WORKGROUP_SIZE] = select(0u, input[bi], bi < n);
    var offset = 1u;
    var d = WORKGROUP_SIZE;
    loop {
        workgroupBarrier();
        if (d == 0u) {
            break;
        }
        if (tid < d) {
            let i1 = offset * ((tid * 2u) + 1u) - 1u;
            let i2 = offset * ((tid * 2u) + 2u) - 1u;
            temp[i2] = temp[i2] + temp[i1];
        }
        offset = offset * 2u;
        d = d / 2u;
    }
    if (tid == 0u) {
        block_sums[wid.x] = temp[ELEMENTS_PER_WORKGROUP - 1u];
        temp[ELEMENTS_PER_WORKGROUP - 1u] = 0u;
    }
    d = 1u;
    loop {
        offset = offset / 2u;
        workgroupBarrier();
        if (d > WORKGROUP_SIZE) {
            break;
        }
        if (tid < d) {
            let i1 = offset * ((tid * 2u) + 1u) - 1u;
            let i2 = offset * ((tid * 2u) + 2u) - 1u;
            let t = temp[i1];
            temp[i1] = temp[i2];
            temp[i2] = temp[i2] + t;
        }
        d = d * 2u;
    }
    workgroupBarrier();
    if (ai < n) {
        output[ai] = temp[tid];
    }
    if (bi < n) {
        output[bi] = temp[tid + WORKGROUP_SIZE];
    }
}

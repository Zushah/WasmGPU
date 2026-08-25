/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

override BIT: u32 = 0u;

const WORKGROUP_SIZE: u32 = 256u;
const ELEMENTS_PER_INVOCATION: u32 = 4u;
const ELEMENTS_PER_WORKGROUP: u32 = WORKGROUP_SIZE * ELEMENTS_PER_INVOCATION;

@group(0) @binding(0) var<storage, read> keys: array<u32>;
@group(0) @binding(1) var<storage, read_write> prefix: array<u32>;
@group(0) @binding(2) var<storage, read_write> block_sums: array<u32>;

var<workgroup> temp: array<u32, 256>;

fn zero_bit(i: u32, n: u32) -> u32 {
    if (i >= n) {
        return 0u;
    }
    return select(0u, 1u, ((keys[i] >> BIT) & 1u) == 0u);
}

@compute @workgroup_size(256)
fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
    let tid = lid.x;
    let n = arrayLength(&keys);
    let base = wid.x * ELEMENTS_PER_WORKGROUP;
    let i0 = base + tid * ELEMENTS_PER_INVOCATION;
    let i1 = i0 + 1u;
    let i2 = i0 + 2u;
    let i3 = i0 + 3u;
    let v0 = zero_bit(i0, n);
    let v1 = zero_bit(i1, n);
    let v2 = zero_bit(i2, n);
    let v3 = zero_bit(i3, n);
    temp[tid] = v0 + v1 + v2 + v3;
    var offset = 1u;
    var d = WORKGROUP_SIZE / 2u;
    loop {
        workgroupBarrier();
        if (d == 0u) {
            break;
        }
        if (tid < d) {
            let ai = offset * ((tid * 2u) + 1u) - 1u;
            let bi = offset * ((tid * 2u) + 2u) - 1u;
            temp[bi] = temp[bi] + temp[ai];
        }
        offset = offset * 2u;
        d = d / 2u;
    }
    if (tid == 0u) {
        block_sums[wid.x] = temp[WORKGROUP_SIZE - 1u];
        temp[WORKGROUP_SIZE - 1u] = 0u;
    }
    d = 1u;
    loop {
        offset = offset / 2u;
        workgroupBarrier();
        if (d >= WORKGROUP_SIZE) {
            break;
        }
        if (tid < d) {
            let ai = offset * ((tid * 2u) + 1u) - 1u;
            let bi = offset * ((tid * 2u) + 2u) - 1u;
            let t = temp[ai];
            temp[ai] = temp[bi];
            temp[bi] = temp[bi] + t;
        }
        d = d * 2u;
    }
    workgroupBarrier();
    let thread_offset = temp[tid];
    if (i0 < n) {
        prefix[i0] = thread_offset;
    }
    if (i1 < n) {
        prefix[i1] = thread_offset + v0;
    }
    if (i2 < n) {
        prefix[i2] = thread_offset + v0 + v1;
    }
    if (i3 < n) {
        prefix[i3] = thread_offset + v0 + v1 + v2;
    }
}

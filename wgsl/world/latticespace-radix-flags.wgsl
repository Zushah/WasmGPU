/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const WORKGROUP_SIZE: u32 = 256u;
const ELEMENTS_PER_INVOCATION: u32 = 4u;
const ELEMENTS_PER_WORKGROUP: u32 = WORKGROUP_SIZE * ELEMENTS_PER_INVOCATION;
const RADIX: u32 = 16u;
const NO_DIGIT: u32 = 0xffffffffu;

@group(0) @binding(0) var<storage, read> keys: array<u32>;
@group(0) @binding(1) var<storage, read_write> ranks: array<u32>;
@group(0) @binding(2) var<storage, read_write> counts: array<u32>;
@group(0) @binding(3) var<uniform> shift: u32;
var<workgroup> low: array<vec4<u32>, 256>;
var<workgroup> high: array<vec4<u32>, 256>;
var<workgroup> totals: array<vec4<u32>, 2>;

fn digit(i: u32, n: u32) -> u32 {
    if (i >= n) {
        return NO_DIGIT;
    }
    return (keys[i] >> shift) & (RADIX - 1u);
}

fn lanes(d: u32, word: u32) -> vec4<u32> {
    let words = vec4<u32>(word, word + 1u, word + 2u, word + 3u);
    return select(vec4<u32>(0u), vec4<u32>(1u << ((d & 1u) * 16u)), words == vec4<u32>(d >> 1u));
}

fn count_of(lo: vec4<u32>, hi: vec4<u32>, d: u32) -> u32 {
    let word = d >> 1u;
    let packed = select(hi[(word - 4u) & 3u], lo[word & 3u], word < 4u);
    return (packed >> ((d & 1u) * 16u)) & 0xffffu;
}

fn workgroup_index(wid: vec3<u32>, nwg: vec3<u32>) -> u32 {
    return wid.y * nwg.x + wid.x;
}

@compute @workgroup_size(256)
fn main(
    @builtin(local_invocation_id) lid: vec3<u32>,
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
) {
    let tid = lid.x;
    let n = arrayLength(&keys);
    let block = workgroup_index(wid, nwg);
    let i0 = block * ELEMENTS_PER_WORKGROUP + tid * ELEMENTS_PER_INVOCATION;
    let i1 = i0 + 1u;
    let i2 = i0 + 2u;
    let i3 = i0 + 3u;
    let d0 = digit(i0, n);
    let d1 = digit(i1, n);
    let d2 = digit(i2, n);
    let d3 = digit(i3, n);
    low[tid] = lanes(d0, 0u) + lanes(d1, 0u) + lanes(d2, 0u) + lanes(d3, 0u);
    high[tid] = lanes(d0, 4u) + lanes(d1, 4u) + lanes(d2, 4u) + lanes(d3, 4u);
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
            low[bi] = low[bi] + low[ai];
            high[bi] = high[bi] + high[ai];
        }
        offset = offset * 2u;
        d = d / 2u;
    }
    if (tid == 0u) {
        totals[0] = low[WORKGROUP_SIZE - 1u];
        totals[1] = high[WORKGROUP_SIZE - 1u];
        low[WORKGROUP_SIZE - 1u] = vec4<u32>(0u);
        high[WORKGROUP_SIZE - 1u] = vec4<u32>(0u);
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
            let t_low = low[ai];
            let t_high = high[ai];
            low[ai] = low[bi];
            high[ai] = high[bi];
            low[bi] = low[bi] + t_low;
            high[bi] = high[bi] + t_high;
        }
        d = d * 2u;
    }
    workgroupBarrier();
    let lo = low[tid];
    let hi = high[tid];
    if (i0 < n) {
        ranks[i0] = count_of(lo, hi, d0);
    }
    if (i1 < n) {
        ranks[i1] = count_of(lo, hi, d1) + select(0u, 1u, d0 == d1);
    }
    if (i2 < n) {
        ranks[i2] = count_of(lo, hi, d2) + select(0u, 1u, d0 == d2) + select(0u, 1u, d1 == d2);
    }
    if (i3 < n) {
        ranks[i3] = count_of(lo, hi, d3)
            + select(0u, 1u, d0 == d3)
            + select(0u, 1u, d1 == d3)
            + select(0u, 1u, d2 == d3);
    }
    let num_blocks = arrayLength(&counts) / RADIX;
    if (tid < RADIX && block < num_blocks) {
        counts[tid * num_blocks + block] = count_of(totals[0], totals[1], tid);
    }
}

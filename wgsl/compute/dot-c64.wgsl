/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const WORKGROUP_SIZE: u32 = 256u;
const ELEMENTS_PER_WORKGROUP: u32 = 512u;

@group(0) @binding(0) var<storage, read> a: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> b: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> output: array<vec2<f32>>;

var<workgroup> share: array<vec2<f32>, 256>;

fn cmul(x: vec2<f32>, y: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(x.x * y.x - x.y * y.y, x.x * y.y + x.y * y.x);
}

fn reduce_and_write(tid: u32, wid: u32, acc: vec2<f32>) {
    share[tid] = acc;
    workgroupBarrier();
    var stride = WORKGROUP_SIZE / 2u;
    loop {
        if (stride == 0u) {
            break;
        }
        if (tid < stride) {
            share[tid] = share[tid] + share[tid + stride];
        }
        workgroupBarrier();
        stride = stride / 2u;
    }
    if (tid == 0u) {
        output[wid] = share[0];
    }
}

@compute @workgroup_size(256)
fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
    let i0 = wid.x * ELEMENTS_PER_WORKGROUP + lid.x;
    let i1 = i0 + WORKGROUP_SIZE;
    let n = arrayLength(&a);
    var acc = vec2<f32>(0.0);
    if (i0 < n) {
        acc = cmul(a[i0], b[i0]);
    }
    if (i1 < n) {
        acc = acc + cmul(a[i1], b[i1]);
    }
    reduce_and_write(lid.x, wid.x, acc);
}

@compute @workgroup_size(256)
fn reduce(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
    let i0 = wid.x * ELEMENTS_PER_WORKGROUP + lid.x;
    let i1 = i0 + WORKGROUP_SIZE;
    let n = arrayLength(&a);
    var acc = vec2<f32>(0.0);
    if (i0 < n) {
        acc = a[i0];
    }
    if (i1 < n) {
        acc = acc + a[i1];
    }
    reduce_and_write(lid.x, wid.x, acc);
}

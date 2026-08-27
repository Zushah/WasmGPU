/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

@group(0) @binding(0) var<storage, read> x: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> y: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> out: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> params: array<u32>;

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x < arrayLength(&out)) {
        let alpha = vec2<f32>(bitcast<f32>(params[0]), bitcast<f32>(params[1]));
        out[id.x] = cmul(alpha, x[id.x]) + y[id.x];
    }
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct Params {
    p0: vec4<f32>,
    p1: vec4<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> pixels: array<u32>;

fn unpack_rgba8(x: u32) -> vec4<f32> {
    let r = f32(x & 255u) / 255.0;
    let g = f32((x >> 8u) & 255u) / 255.0;
    let b = f32((x >> 16u) & 255u) / 255.0;
    let a = f32((x >> 24u) & 255u) / 255.0;
    return vec4<f32>(r, g, b, a);
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 3.0, -1.0),
        vec2<f32>(-1.0,  3.0),
    );
    var out: VertexOutput;
    out.position = vec4<f32>(pos[vid], 0.0, 1.0);
    return out;
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let display_w = max(1.0, params.p0.x);
    let display_h = max(1.0, params.p0.y);
    let out_w = max(1.0, params.p0.z);
    let out_h = max(1.0, params.p0.w);
    let flip_y = params.p1.x > 0.5;
    let x_out = clamp(i32(floor(pos.x * out_w / display_w)), 0, i32(out_w) - 1);
    var y_out = clamp(i32(floor(pos.y * out_h / display_h)), 0, i32(out_h) - 1);
    if (flip_y) {
        y_out = i32(out_h) - 1 - y_out;
    }
    let idx = u32(y_out) * u32(out_w) + u32(x_out);
    return unpack_rgba8(pixels[idx]);
}

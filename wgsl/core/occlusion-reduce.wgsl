/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
}

@group(0) @binding(0) var src_tex: texture_2d<f32>;

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
    var positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );
    var out: VertexOutput;
    out.pos = vec4<f32>(positions[idx], 0.0, 1.0);
    return out;
}

@fragment
fn fs_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) f32 {
    let src_size = textureDimensions(src_tex);
    let dst_coord = vec2<i32>(i32(frag_coord.x), i32(frag_coord.y));
    let base = dst_coord * 2;
    let x1 = min(base.x + 1, i32(src_size.x) - 1);
    let y1 = min(base.y + 1, i32(src_size.y) - 1);
    let d00 = textureLoad(src_tex, base, 0).x;
    let d10 = textureLoad(src_tex, vec2<i32>(x1, base.y), 0).x;
    let d01 = textureLoad(src_tex, vec2<i32>(base.x, y1), 0).x;
    let d11 = textureLoad(src_tex, vec2<i32>(x1, y1), 0).x;
    return max(max(d00, d10), max(d01, d11));
}

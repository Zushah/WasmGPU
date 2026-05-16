/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

@group(0) @binding(0) var srcTex: texture_2d<f32>;

struct VSOut {
    @builtin(position) pos: vec4f
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VSOut {
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0)
    );
    var out: VSOut;
    out.pos = vec4f(positions[idx], 0.0, 1.0);
    return out;
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4f) -> @location(0) f32 {
    let srcSize = textureDimensions(srcTex);
    let dstCoord = vec2i(i32(fragCoord.x), i32(fragCoord.y));
    let base = dstCoord * 2;
    let x1 = min(base.x + 1, i32(srcSize.x) - 1);
    let y1 = min(base.y + 1, i32(srcSize.y) - 1);
    let d00 = textureLoad(srcTex, base, 0).x;
    let d10 = textureLoad(srcTex, vec2i(x1, base.y), 0).x;
    let d01 = textureLoad(srcTex, vec2i(base.x, y1), 0).x;
    let d11 = textureLoad(srcTex, vec2i(x1, y1), 0).x;
    return max(max(d00, d10), max(d01, d11));
}

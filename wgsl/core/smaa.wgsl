/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct Params {
    rt_metrics: vec4<f32>,
    threshold: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
}

struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var samp_linear: sampler;
@group(0) @binding(2) var samp_point: sampler;
@group(0) @binding(3) var scene_tex: texture_2d<f32>;
@group(0) @binding(4) var edges_tex: texture_2d<f32>;
@group(0) @binding(5) var blend_tex: texture_2d<f32>;

fn luma(rgb: vec3<f32>) -> f32 {
    return dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn edge_v(uv: vec2<f32>) -> bool {
    return textureSampleLevel(edges_tex, samp_point, uv, 0.0).r > 0.5;
}

fn edge_h(uv: vec2<f32>) -> bool {
    return textureSampleLevel(edges_tex, samp_point, uv, 0.0).g > 0.5;
}

@vertex
fn vs_fullscreen(@builtin(vertex_index) vi: u32) -> VertexOutput {
    var positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );
    var uvs = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 1.0),
        vec2<f32>(2.0, 1.0),
        vec2<f32>(0.0, -1.0),
    );
    var out: VertexOutput;
    out.pos = vec4<f32>(positions[vi], 0.0, 1.0);
    out.uv = uvs[vi];
    return out;
}

@fragment
fn fs_smaa_edges(in: VertexOutput) -> @location(0) vec4<f32> {
    let t = params.rt_metrics.xy;
    let c = textureSampleLevel(scene_tex, samp_point, in.uv, 0.0).rgb;
    let l = luma(c);
    let l_left = luma(
        textureSampleLevel(scene_tex, samp_point, in.uv + vec2<f32>(-t.x, 0.0), 0.0).rgb,
    );
    let l_top  = luma(
        textureSampleLevel(scene_tex, samp_point, in.uv + vec2<f32>(0.0, -t.y), 0.0).rgb,
    );
    let d_left = abs(l - l_left);
    let d_top  = abs(l - l_top);
    let e_v = select(0.0, 1.0, d_left >= params.threshold);
    let e_h = select(0.0, 1.0, d_top  >= params.threshold);
    return vec4<f32>(e_v, e_h, 0.0, 0.0);
}

@fragment
fn fs_smaa_weights(in: VertexOutput) -> @location(0) vec4<f32> {
    let t = params.rt_metrics.xy;
    let e = textureSampleLevel(edges_tex, samp_point, in.uv, 0.0);
    var w_left: f32 = 0.0;
    var w_top: f32 = 0.0;
    if (e.r > 0.5) {
        var up: i32 = 0;
        var down: i32 = 0;
        for (var s: i32 = 1; s <= 8; s = s + 1) {
            if (!edge_v(in.uv + vec2<f32>(0.0, -t.y * f32(s)))) {
                break;
            }
            up = up + 1;
        }
        for (var s: i32 = 1; s <= 8; s = s + 1) {
            if (!edge_v(in.uv + vec2<f32>(0.0, t.y * f32(s)))) {
                break;
            }
            down = down + 1;
        }
        let len = f32(up + down + 1);
        w_left = clamp(len / 17.0, 0.0, 1.0) * 0.5;
    }
    if (e.g > 0.5) {
        var left: i32 = 0;
        var right: i32 = 0;
        for (var s: i32 = 1; s <= 8; s = s + 1) {
            if (!edge_h(in.uv + vec2<f32>(-t.x * f32(s), 0.0))) {
                break;
            }
            left = left + 1;
        }
        for (var s: i32 = 1; s <= 8; s = s + 1) {
            if (!edge_h(in.uv + vec2<f32>(t.x * f32(s), 0.0))) {
                break;
            }
            right = right + 1;
        }
        let len = f32(left + right + 1);
        w_top = clamp(len / 17.0, 0.0, 1.0) * 0.5;
    }
    return vec4<f32>(w_left, w_top, 0.0, 0.0);
}

@fragment
fn fs_smaa_neighborhood(in: VertexOutput) -> @location(0) vec4<f32> {
    let t = params.rt_metrics.xy;
    let c = textureSampleLevel(scene_tex, samp_linear, in.uv, 0.0);
    let w = textureSampleLevel(blend_tex, samp_point, in.uv, 0.0);
    let w_l = w.r;
    let w_t = w.g;
    let w_r = textureSampleLevel(blend_tex, samp_point, in.uv + vec2<f32>(t.x, 0.0), 0.0).r;
    let w_b = textureSampleLevel(blend_tex, samp_point, in.uv + vec2<f32>(0.0, t.y), 0.0).g;
    var best_w: f32 = 0.0;
    var dir: i32 = -1;
    if (w_l > best_w) {
        best_w = w_l; dir = 0;
    }
    if (w_r > best_w) {
        best_w = w_r; dir = 1;
    }
    if (w_t > best_w) {
        best_w = w_t; dir = 2;
    }
    if (w_b > best_w) {
        best_w = w_b; dir = 3;
    }
    if (best_w <= 0.0) {
        return c;
    }
    var n: vec4<f32> = c;
    if (dir == 0) {
        n = textureSampleLevel(scene_tex, samp_linear, in.uv + vec2<f32>(-t.x, 0.0), 0.0);
    } else if (dir == 1) {
        n = textureSampleLevel(scene_tex, samp_linear, in.uv + vec2<f32>(t.x, 0.0), 0.0);
    } else if (dir == 2) {
        n = textureSampleLevel(scene_tex, samp_linear, in.uv + vec2<f32>(0.0, -t.y), 0.0);
    } else {
        n = textureSampleLevel(scene_tex, samp_linear, in.uv + vec2<f32>(0.0, t.y), 0.0);
    }
    return mix(c, n, best_w);
}

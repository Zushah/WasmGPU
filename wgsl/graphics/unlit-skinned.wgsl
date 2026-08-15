/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct MaterialUniforms {
    color: vec4<f32>,
    params: vec4<f32>,
    base_color_transform0: vec4<f32>,
    base_color_transform1: vec4<f32>,
}

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(11) uv1: vec2<f32>,
    @location(13) color: vec4<f32>,
    @location(3) joints: vec4<u32>,
    @location(4) weights: vec4<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) uv1: vec2<f32>,
    @location(2) color: vec4<f32>,
}

struct CameraUniforms {
    view_projection: mat4x4<f32>,
    position: vec4<f32>,
}

struct ModelUniforms {
    model: mat4x4<f32>,
    normal_matrix: mat4x4<f32>,
}

struct SkinBuffer {
    joints: array<mat4x4<f32>>,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<uniform> material: MaterialUniforms;
@group(1) @binding(1) var base_color_sampler: sampler;
@group(1) @binding(2) var base_color_texture: texture_2d<f32>;
@group(2) @binding(0) var<storage, read> skin: SkinBuffer;

fn linear_to_srgb(c: vec3<f32>) -> vec3<f32> {
    return pow(c, vec3<f32>(1.0 / 2.2));
}

fn apply_texture_transform(
    uv0: vec2<f32>,
    uv1: vec2<f32>,
    transform0: vec4<f32>,
    transform1: vec4<f32>,
) -> vec2<f32> {
    let uv = select(uv0, uv1, transform1.z >= 0.5);
    let scaled = uv * transform1.xy;
    let rotated = vec2<f32>(
        transform0.z * scaled.x + transform0.w * scaled.y,
        -transform0.w * scaled.x + transform0.z * scaled.y,
    );
    return rotated + transform0.xy;
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let j = in.joints;
    let w = in.weights;
    let m = skin.joints[j.x] * w.x
            + skin.joints[j.y] * w.y
            + skin.joints[j.z] * w.z
            + skin.joints[j.w] * w.w;
    let local_pos = m * vec4<f32>(in.position, 1.0);
    out.position = camera.view_projection * model.model * local_pos;
    out.uv = in.uv;
    out.uv1 = in.uv1;
    out.color = in.color;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let base_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.base_color_transform0,
        material.base_color_transform1,
    );
    let base_color_sample = textureSample(base_color_texture, base_color_sampler, base_uv);
    var out_color = material.color * base_color_sample * in.color;
    let alpha_cutoff = material.params.x;
    if (alpha_cutoff > 0.0 && out_color.a < alpha_cutoff) {
        discard;
    }
    return vec4<f32>(linear_to_srgb(out_color.rgb), out_color.a);
}

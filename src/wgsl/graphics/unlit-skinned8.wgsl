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
    @location(3) joints0: vec4<u32>,
    @location(4) weights0: vec4<f32>,
    @location(5) joints1: vec4<u32>,
    @location(6) weights1: vec4<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) uv1: vec2<f32>,
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
    let j0 = in.joints0;
    let w0 = in.weights0;
    let j1 = in.joints1;
    let w1 = in.weights1;
    let m = skin.joints[j0.x] * w0.x
        + skin.joints[j0.y] * w0.y
        + skin.joints[j0.z] * w0.z
        + skin.joints[j0.w] * w0.w +
            skin.joints[j1.x] * w1.x
                + skin.joints[j1.y] * w1.y
                + skin.joints[j1.z] * w1.z
                + skin.joints[j1.w] * w1.w;
    let local_pos = m * vec4<f32>(in.position, 1.0);
    out.position = camera.view_projection * model.model * local_pos;
    out.uv = in.uv;
    out.uv1 = in.uv1;
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
    var out_color = material.color * base_color_sample;
    let alpha_cutoff = material.params.x;
    if (alpha_cutoff > 0.0 && out_color.a < alpha_cutoff) {
        discard;
    }
    return vec4<f32>(linear_to_srgb(out_color.rgb), out_color.a);
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct ShadowView {
    view_projection: mat4x4<f32>,
}

struct ShadowModel {
    model: mat4x4<f32>,
}

struct SkinBuffer {
    joints: array<mat4x4<f32>>,
}

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) joints: vec4<u32>,
    @location(2) weights: vec4<f32>,
    @location(3) joints1: vec4<u32>,
    @location(4) weights1: vec4<f32>,
}

@group(0) @binding(0) var<uniform> shadow_view: ShadowView;
@group(1) @binding(0) var<uniform> shadow_model: ShadowModel;
@group(2) @binding(0) var<storage, read> skin: SkinBuffer;

@vertex
fn vs_main(in: VertexInput) -> @builtin(position) vec4<f32> {
    let skin_matrix = skin.joints[in.joints.x] * in.weights.x
        + skin.joints[in.joints.y] * in.weights.y
        + skin.joints[in.joints.z] * in.weights.z
        + skin.joints[in.joints.w] * in.weights.w
        + skin.joints[in.joints1.x] * in.weights1.x
        + skin.joints[in.joints1.y] * in.weights1.y
        + skin.joints[in.joints1.z] * in.weights1.z
        + skin.joints[in.joints1.w] * in.weights1.w;
    return shadow_view.view_projection
        * shadow_model.model
        * skin_matrix
        * vec4<f32>(in.position, 1.0);
}

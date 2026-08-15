/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

enable primitive_index;

struct CameraUniforms {
    view_proj: mat4x4<f32>,
    position: vec3<f32>,
    _pad0: f32,
}

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>,
}

struct PickUniforms {
    object_id: u32,
    element_base: u32,
    _pad0: u32,
    _pad1: u32,
}

struct SkinBuffer {
    joints: array<mat4x4<f32>>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
}

struct FragmentOutput {
    @location(0) id: vec2<u32>,
    @location(1) depth: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<uniform> pick: PickUniforms;
@group(2) @binding(0) var<storage, read> skin: SkinBuffer;

@vertex
fn vs_main(
    @location(0) position: vec3<f32>,
    @location(3) joints0: vec4<u32>,
    @location(4) weights0: vec4<f32>,
    @location(5) joints1: vec4<u32>,
    @location(6) weights1: vec4<f32>,
) -> VertexOutput {
    var out: VertexOutput;
    let m = skin.joints[joints0.x] * weights0.x
        + skin.joints[joints0.y] * weights0.y
        + skin.joints[joints0.z] * weights0.z
        + skin.joints[joints0.w] * weights0.w
        + skin.joints[joints1.x] * weights1.x
        + skin.joints[joints1.y] * weights1.y
        + skin.joints[joints1.z] * weights1.z
        + skin.joints[joints1.w] * weights1.w;
    let local_pos = m * vec4<f32>(position, 1.0);
    out.position = camera.view_proj * model.model * local_pos;
    return out;
}

@fragment
fn fs_main(
    @builtin(position) frag_coord: vec4<f32>,
    @builtin(primitive_index) primitive_index: u32,
) -> FragmentOutput {
    var out: FragmentOutput;
    out.id = vec2<u32>(pick.object_id, pick.element_base + primitive_index);
    out.depth = frag_coord.z;
    return out;
}

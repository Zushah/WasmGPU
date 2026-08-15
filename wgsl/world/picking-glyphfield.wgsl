/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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

struct VertexInput {
    @location(0) position: vec3<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(flat) instance_index: u32,
}

struct FragmentOutput {
    @location(0) id: vec2<u32>,
    @location(1) depth: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>;
@group(2) @binding(0) var<uniform> pick: PickUniforms;

fn rotate_by_quat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

@vertex
fn vs_main(in: VertexInput, @builtin(instance_index) instance_index: u32) -> VertexOutput {
    let p4 = positions[instance_index];
    let q = rotations[instance_index];
    let s4 = scales[instance_index];
    let local_pos = rotate_by_quat(in.position * s4.xyz, q) + p4.xyz;
    let world_pos = model.model * vec4<f32>(local_pos, 1.0);
    var out: VertexOutput;
    out.position = camera.view_proj * world_pos;
    out.instance_index = instance_index;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> FragmentOutput {
    var out: FragmentOutput;
    out.id = vec2<u32>(pick.object_id, pick.element_base + in.instance_index);
    out.depth = in.position.z;
    return out;
}

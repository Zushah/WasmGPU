/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct CameraUniforms {
    viewProj: mat4x4<f32>,
    position: vec3<f32>,
    _pad0: f32
};

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>
};

@vertex
fn vs_main(@location(0) position: vec3<f32>) -> VertexOutput {
    var out: VertexOutput;
    out.position = camera.viewProj * model.model * vec4<f32>(position, 1.0);
    return out;
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) f32 {
    return fragCoord.z;
}

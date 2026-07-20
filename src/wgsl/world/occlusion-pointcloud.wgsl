/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct PointData {
    position: vec3<f32>,
    scalar: f32,
}

struct PointCloudUniforms {
    size_params: vec4<f32>,
    scalar_params: vec4<f32>,
    options: vec4<f32>,
    colors: array<vec4<f32>, 8>,
}

struct CameraUniforms {
    view_proj: mat4x4<f32>,
    position: vec3<f32>,
    _pad0: f32,
}

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) point_coord: vec2<f32>,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> points: array<PointData>;
@group(1) @binding(1) var<uniform> pc: PointCloudUniforms;

@vertex
fn vs_main(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
    let p = points[instance_index];
    let world_pos = model.model * vec4<f32>(p.position, 1.0);
    let clip = camera.view_proj * world_pos;
    let dist = distance(camera.position, world_pos.xyz);
    let base_size = pc.size_params.x;
    let min_size = pc.size_params.y;
    let max_size = pc.size_params.z;
    let atten = pc.size_params.w;
    var size_px = base_size;
    if (atten > 0.0) {
        size_px = base_size * (atten / max(dist, 1e-6));
    }
    size_px = clamp(size_px, min_size, max_size);
    var uv = vec2<f32>(0.0);
    if (vertex_index == 0u) {
        uv = vec2<f32>(0.0, 0.0);
    } else if (vertex_index == 1u) {
        uv = vec2<f32>(1.0, 0.0);
    } else if (vertex_index == 2u) {
        uv = vec2<f32>(0.0, 1.0);
    } else if (vertex_index == 3u) {
        uv = vec2<f32>(1.0, 0.0);
    } else if (vertex_index == 4u) {
        uv = vec2<f32>(1.0, 1.0);
    } else if (vertex_index == 5u) {
        uv = vec2<f32>(0.0, 1.0);
    }
    let row0 = vec3<f32>(camera.view_proj[0][0], camera.view_proj[1][0], camera.view_proj[2][0]);
    let row1 = vec3<f32>(camera.view_proj[0][1], camera.view_proj[1][1], camera.view_proj[2][1]);
    let aspect = length(row1) / max(length(row0), 1e-6);
    let ndc_size = (size_px * 2.0) / max(camera._pad0, 1.0);
    let offset_x = (uv.x - 0.5) * ndc_size / aspect * clip.w;
    let offset_y = -(uv.y - 0.5) * ndc_size * clip.w;
    var out: VertexOutput;
    out.position = clip + vec4<f32>(offset_x, offset_y, 0.0, 0.0);
    out.point_coord = uv;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) f32 {
    let uv = in.point_coord * 2.0 - vec2<f32>(1.0, 1.0);
    let r2 = dot(uv, uv);
    if (r2 > 1.0) {
        discard;
    }
    return in.position.z;
}

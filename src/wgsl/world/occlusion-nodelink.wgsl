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

struct NodeLinkUniforms {
    global: vec4<f32>,
    node_scale_source: vec4<f32>,
    node_scale_domain: vec4<f32>,
    node_scale_clamp: vec4<f32>,
    node_scale_params: vec4<f32>,
    node_scale_flags: vec4<f32>,
    node_visual: vec4<f32>,
    edge_scale_source: vec4<f32>,
    edge_scale_domain: vec4<f32>,
    edge_scale_clamp: vec4<f32>,
    edge_scale_params: vec4<f32>,
    edge_scale_flags: vec4<f32>,
    edge_visual: vec4<f32>,
    node_solid: vec4<f32>,
    edge_solid: vec4<f32>,
    point_params: vec4<f32>,
    node_stops: array<vec4<f32>, 8>,
    edge_stops: array<vec4<f32>, 8>,
}

struct OcclusionOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) point_coord: vec2<f32>,
    @location(1) @interpolate(flat) is_point: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> node_positions: array<vec4<f32>>;
@group(1) @binding(3) var<storage, read> node_radii: array<vec4<f32>>;
@group(1) @binding(4) var<storage, read> edges: array<vec2<u32>>;
@group(1) @binding(7) var<uniform> nl: NodeLinkUniforms;

fn build_edge_frame(src: vec3<f32>, dst: vec3<f32>) -> mat3x3<f32> {
    let y_axis = normalize(dst - src);
    var fallback_axis = vec3<f32>(0.0, 0.0, 1.0);
    if (abs(dot(fallback_axis, y_axis)) > 0.99) {
        fallback_axis = vec3<f32>(1.0, 0.0, 0.0);
    }
    let x_axis = normalize(cross(fallback_axis, y_axis));
    let z_axis = normalize(cross(y_axis, x_axis));
    return mat3x3<f32>(x_axis, y_axis, z_axis);
}

@vertex
fn vs_node_points(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> OcclusionOutput {
    let p = node_positions[instance_index].xyz;
    let world_pos4 = model.model * vec4<f32>(p, 1.0);
    let clip = camera.view_proj * world_pos4;
    let base_size = nl.global.x;
    let min_size = nl.point_params.x;
    let max_size = nl.point_params.y;
    let atten = nl.point_params.z;
    var size_px = base_size;
    if (atten > 0.0) {
        let dist = distance(camera.position, world_pos4.xyz);
        size_px = base_size * (atten / max(dist, 1e-6));
    }
    size_px = clamp(size_px, min_size, max_size);
    let uv = vec2<f32>(f32((vertex_index + 2u) / 3u % 2u), f32((vertex_index + 1u) / 3u % 2u));
    let row0 = vec3<f32>(camera.view_proj[0][0], camera.view_proj[1][0], camera.view_proj[2][0]);
    let row1 = vec3<f32>(camera.view_proj[0][1], camera.view_proj[1][1], camera.view_proj[2][1]);
    let aspect = length(row1) / max(length(row0), 1e-6);
    let ndc_size = (size_px * 2.0) / max(camera._pad0, 1.0);
    let offset_x = (uv.x - 0.5) * ndc_size / aspect * clip.w;
    let offset_y = -(uv.y - 0.5) * ndc_size * clip.w;
    var out: OcclusionOutput;
    out.position = clip + vec4<f32>(offset_x, offset_y, 0.0, 0.0);
    out.point_coord = uv * 2.0 - vec2<f32>(1.0, 1.0);
    out.is_point = 1.0;
    return out;
}

@vertex
fn vs_node_solid(
    @location(0) position: vec3<f32>,
    @builtin(instance_index) instance_index: u32,
) -> OcclusionOutput {
    let center = node_positions[instance_index].xyz;
    let mode = u32(round(nl.node_visual.z));
    let use_radii = nl.node_visual.w > 0.5;
    var scale_vec = vec3<f32>(max(nl.global.x, 1e-6));
    if (use_radii) {
        let rv = max(node_radii[instance_index].xyz, vec3<f32>(1e-6));
        if (mode == 2u) {
            scale_vec = rv * max(nl.global.x, 1e-6);
        } else {
            scale_vec = vec3<f32>(rv.x * max(nl.global.x, 1e-6));
        }
    }
    let obj_pos = center + (position * scale_vec);
    let world_pos4 = model.model * vec4<f32>(obj_pos, 1.0);
    var out: OcclusionOutput;
    out.position = camera.view_proj * world_pos4;
    out.point_coord = vec2<f32>(0.0, 0.0);
    out.is_point = 0.0;
    return out;
}

@vertex
fn vs_edge_lines(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> OcclusionOutput {
    let edge = edges[instance_index];
    let src = node_positions[edge.x].xyz;
    let dst = node_positions[edge.y].xyz;
    let obj_pos = select(src, dst, (vertex_index & 1u) == 1u);
    let world_pos4 = model.model * vec4<f32>(obj_pos, 1.0);
    var out: OcclusionOutput;
    out.position = camera.view_proj * world_pos4;
    out.point_coord = vec2<f32>(0.0, 0.0);
    out.is_point = 0.0;
    return out;
}

@vertex
fn vs_edge_cylinders(
    @location(0) position: vec3<f32>,
    @builtin(instance_index) instance_index: u32,
) -> OcclusionOutput {
    let edge = edges[instance_index];
    let src = node_positions[edge.x].xyz;
    let dst = node_positions[edge.y].xyz;
    let seg = dst - src;
    let seg_len = max(length(seg), 1e-6);
    let basis = build_edge_frame(src, dst);
    let radius = max(nl.global.y, 1e-6);
    let local = vec3<f32>(position.x * radius, position.y * seg_len, position.z * radius);
    let obj_pos = ((src + dst) * 0.5) + (basis * local);
    let world_pos4 = model.model * vec4<f32>(obj_pos, 1.0);
    var out: OcclusionOutput;
    out.position = camera.view_proj * world_pos4;
    out.point_coord = vec2<f32>(0.0, 0.0);
    out.is_point = 0.0;
    return out;
}

@fragment
fn fs_main(in: OcclusionOutput) -> @location(0) f32 {
    if (in.is_point > 0.5) {
        let r2 = dot(in.point_coord, in.point_coord);
        if (r2 > 1.0) {
            discard;
        }
    }
    return in.position.z;
}

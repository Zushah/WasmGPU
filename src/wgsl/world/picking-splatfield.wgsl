/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct CameraUniforms {
    view_proj: mat4x4<f32>,
    position: vec3<f32>,
    viewport_height: f32,
}

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>,
}

struct SplatFieldUniforms {
    params: vec4<f32>,
}

struct PickUniforms {
    object_id: u32,
    element_base: u32,
    _pad0: u32,
    _pad1: u32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) local_coord: vec2<f32>,
    @location(1) @interpolate(flat) splat_index: u32,
    @location(2) alpha_base: f32,
}

struct FragmentOutput {
    @location(0) id: vec2<u32>,
    @location(1) depth: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> center_opacity: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>;
@group(1) @binding(3) var<storage, read> colors: array<vec4<f32>>;
@group(1) @binding(5) var<uniform> splat_field: SplatFieldUniforms;
@group(1) @binding(6) var<storage, read> sh_coefficients: array<f32>;
@group(2) @binding(0) var<uniform> pick: PickUniforms;

fn rotate_by_quat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

fn safe_clip_w(w: f32) -> f32 {
    return select(1e-6, w, abs(w) > 1e-6);
}

fn splat_center_renderable(clip: vec4<f32>) -> bool {
    let eps = 1e-6;
    return (clip.w > eps) && (clip.z >= -eps) && (clip.z <= clip.w + eps);
}

fn row4(m: mat4x4<f32>, r: u32) -> vec4<f32> {
    return vec4<f32>(m[0][r], m[1][r], m[2][r], m[3][r]);
}

fn invalid_vertex() -> VertexOutput {
    var out: VertexOutput;
    out.position = vec4<f32>(2.0, 2.0, 2.0, 1.0);
    out.local_coord = vec2<f32>(0.0);
    out.splat_index = 0u;
    out.alpha_base = 0.0;
    return out;
}

fn quad_corner(vertex_index: u32) -> vec2<f32> {
    if (vertex_index == 0u) {
        return vec2<f32>(-1.0, -1.0);
    }
    if (vertex_index == 1u) {
        return vec2<f32>(1.0, -1.0);
    }
    if (vertex_index == 2u) {
        return vec2<f32>(-1.0, 1.0);
    }
    if (vertex_index == 3u) {
        return vec2<f32>(-1.0, 1.0);
    }
    if (vertex_index == 4u) {
        return vec2<f32>(1.0, -1.0);
    }
    return vec2<f32>(1.0, 1.0);
}

@vertex
fn vs_main(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
    let splat_index = instance_index;
    let center_opacity_value = center_opacity[splat_index];
    let rotation_value = rotations[splat_index];
    let scale_value = max(abs(scales[splat_index].xyz), vec3<f32>(1e-6));
    let color_value = colors[splat_index];
    let world_center4 = model.model * vec4<f32>(center_opacity_value.xyz, 1.0);
    let clip_center = camera.view_proj * world_center4;
    if (!splat_center_renderable(clip_center)) {
        return invalid_vertex();
    }
    let guarded_clip_w = safe_clip_w(clip_center.w);
    let local_axis_x = rotate_by_quat(vec3<f32>(scale_value.x, 0.0, 0.0), rotation_value);
    let local_axis_y = rotate_by_quat(vec3<f32>(0.0, scale_value.y, 0.0), rotation_value);
    let local_axis_z = rotate_by_quat(vec3<f32>(0.0, 0.0, scale_value.z), rotation_value);
    let world_axis_x = (model.model * vec4<f32>(local_axis_x, 0.0)).xyz;
    let world_axis_y = (model.model * vec4<f32>(local_axis_y, 0.0)).xyz;
    let world_axis_z = (model.model * vec4<f32>(local_axis_z, 0.0)).xyz;
    let view_proj_row0 = row4(camera.view_proj, 0u);
    let view_proj_row1 = row4(camera.view_proj, 1u);
    let view_proj_row3 = row4(camera.view_proj, 3u);
    let inv_clip_w_sq = 1.0 / (guarded_clip_w * guarded_clip_w);
    let jx =
        (view_proj_row0.xyz * guarded_clip_w - clip_center.x * view_proj_row3.xyz) * inv_clip_w_sq;
    let jy =
        (view_proj_row1.xyz * guarded_clip_w - clip_center.y * view_proj_row3.xyz) * inv_clip_w_sq;
    let a0 = vec2<f32>(dot(jx, world_axis_x), dot(jy, world_axis_x));
    let a1 = vec2<f32>(dot(jx, world_axis_y), dot(jy, world_axis_y));
    let a2 = vec2<f32>(dot(jx, world_axis_z), dot(jy, world_axis_z));
    let cov_xx = a0.x * a0.x + a1.x * a1.x + a2.x * a2.x;
    let cov_xy = a0.x * a0.y + a1.x * a1.y + a2.x * a2.y;
    let cov_yy = a0.y * a0.y + a1.y * a1.y + a2.y * a2.y;
    let trace = cov_xx + cov_yy;
    let diff = cov_xx - cov_yy;
    let root = sqrt(max(0.0, diff * diff + 4.0 * cov_xy * cov_xy));
    let lambda0 = max(1e-10, 0.5 * (trace + root));
    let lambda1 = max(1e-10, 0.5 * (trace - root));
    var axis0 = vec2<f32>(1.0, 0.0);
    if (abs(cov_xy) > 1e-8) {
        axis0 = normalize(vec2<f32>(cov_xy, lambda0 - cov_xx));
    } else if (cov_yy > cov_xx) {
        axis0 = vec2<f32>(0.0, 1.0);
    }
    let axis1 = vec2<f32>(-axis0.y, axis0.x);
    let basis0 = axis0 * sqrt(lambda0) * 3.0;
    let basis1 = axis1 * sqrt(lambda1) * 3.0;
    let viewport_height = max(camera.viewport_height, 1.0);
    let radius_ndc = max(length(basis0), length(basis1));
    let radius_px = radius_ndc * 0.5 * viewport_height;
    let max_radius_px = max(96.0, min(512.0, viewport_height * 0.45));
    let fade_start_px = max_radius_px * 0.75;
    if (radius_px >= max_radius_px) {
        return invalid_vertex();
    }
    let radius_fade = 1.0 - smoothstep(fade_start_px, max_radius_px, radius_px);
    let corner = quad_corner(vertex_index);
    let ndc_offset = (basis0 * corner.x) + (basis1 * corner.y);
    let clip_offset = ndc_offset * clip_center.w;
    let alpha_base = clamp(color_value.a, 0.0, 1.0)
            * clamp(center_opacity_value.w, 0.0, 1.0)
            * clamp(splat_field.params.x, 0.0, 1.0)
            * radius_fade;
    var out: VertexOutput;
    out.position = clip_center + vec4<f32>(clip_offset, 0.0, 0.0);
    out.local_coord = corner;
    out.splat_index = splat_index;
    out.alpha_base = alpha_base;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> FragmentOutput {
    let q = dot(in.local_coord, in.local_coord);
    if (q > 1.0) {
        discard;
    }
    let alpha = in.alpha_base * exp(-4.5 * q);
    if (alpha <= 1e-4) {
        discard;
    }
    var out: FragmentOutput;
    out.id = vec2<u32>(pick.object_id, pick.element_base + in.splat_index);
    out.depth = in.position.z;
    return out;
}

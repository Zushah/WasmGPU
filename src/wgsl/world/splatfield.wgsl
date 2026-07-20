/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const SH_C0: f32 = 0.28209479177387814;
const SH_C1: f32 = 0.4886025119029199;
const SH_C2_0: f32 = 1.0925484305920792;
const SH_C2_1: f32 = -1.0925484305920792;
const SH_C2_2: f32 = 0.31539156525252005;
const SH_C2_3: f32 = -1.0925484305920792;
const SH_C2_4: f32 = 0.5462742152960396;
const SH_C3_0: f32 = -0.5900435899266435;
const SH_C3_1: f32 = 2.890611442640554;
const SH_C3_2: f32 = -0.4570457994644658;
const SH_C3_3: f32 = 0.3731763325901154;
const SH_C3_4: f32 = -0.4570457994644658;
const SH_C3_5: f32 = 1.445305721320277;
const SH_C3_6: f32 = -0.5900435899266435;

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

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) local_coord: vec2<f32>,
    @location(1) color: vec3<f32>,
    @location(2) alpha_base: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> center_opacity: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>;
@group(1) @binding(3) var<storage, read> colors: array<vec4<f32>>;
@group(1) @binding(4) var<storage, read> sorted_indices: array<u32>;
@group(1) @binding(5) var<uniform> splat_field: SplatFieldUniforms;
@group(1) @binding(6) var<storage, read> sh_coefficients: array<f32>;

fn linear_from_srgb(srgb: vec3<f32>) -> vec3<f32> {
    let x = clamp(srgb, vec3<f32>(0.0), vec3<f32>(1.0));
    let lo = x / vec3<f32>(12.92);
    let hi = pow((x + vec3<f32>(0.055)) / vec3<f32>(1.055), vec3<f32>(2.4));
    let use_hi = x > vec3<f32>(0.04045);
    return select(lo, hi, use_hi);
}

fn rotate_by_quat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

fn safe_normalize(v: vec3<f32>) -> vec3<f32> {
    let len_sq = dot(v, v);
    return select(vec3<f32>(0.0, 0.0, 1.0), v * inverseSqrt(max(len_sq, 1e-12)), len_sq > 1e-12);
}

fn sh_coeff_count_for_degree(degree: u32) -> u32 {
    if (degree == 0u) {
        return 1u;
    }
    if (degree == 1u) {
        return 4u;
    }
    if (degree == 2u) {
        return 9u;
    }
    return 16u;
}

fn sh_coeff_base(splat_index: u32, degree: u32) -> u32 {
    return splat_index * sh_coeff_count_for_degree(degree) * 3u;
}

fn read_sh_rgb(splat_index: u32, coeff_index: u32, degree: u32) -> vec3<f32> {
    let base = sh_coeff_base(splat_index, degree) + coeff_index * 3u;
    return vec3<f32>(
        sh_coefficients[base + 0u],
        sh_coefficients[base + 1u],
        sh_coefficients[base + 2u],
    );
}

fn evaluate_spherical_harmonics(splat_index: u32, dir: vec3<f32>, degree: u32) -> vec3<f32> {
    let x = dir.x;
    let y = dir.y;
    let z = dir.z;
    let x2 = x * x;
    let y2 = y * y;
    let z2 = z * z;
    var result = SH_C0 * read_sh_rgb(splat_index, 0u, degree);
    if (degree >= 1u) {
        result += (-SH_C1 * y) * read_sh_rgb(splat_index, 1u, degree);
        result += (SH_C1 * z) * read_sh_rgb(splat_index, 2u, degree);
        result += (-SH_C1 * x) * read_sh_rgb(splat_index, 3u, degree);
    }
    if (degree >= 2u) {
        result += (SH_C2_0 * x * y) * read_sh_rgb(splat_index, 4u, degree);
        result += (SH_C2_1 * y * z) * read_sh_rgb(splat_index, 5u, degree);
        result += (SH_C2_2 * (2.0 * z2 - x2 - y2)) * read_sh_rgb(splat_index, 6u, degree);
        result += (SH_C2_3 * x * z) * read_sh_rgb(splat_index, 7u, degree);
        result += (SH_C2_4 * (x2 - y2)) * read_sh_rgb(splat_index, 8u, degree);
    }
    if (degree >= 3u) {
        result += (SH_C3_0 * y * (3.0 * x2 - y2)) * read_sh_rgb(splat_index, 9u, degree);
        result += (SH_C3_1 * x * y * z) * read_sh_rgb(splat_index, 10u, degree);
        result += (SH_C3_2 * y * (4.0 * z2 - x2 - y2)) * read_sh_rgb(splat_index, 11u, degree);
        result += (SH_C3_3 * z * (2.0 * z2 - 3.0 * x2 - 3.0 * y2))
            * read_sh_rgb(splat_index, 12u, degree);
        result += (SH_C3_4 * x * (4.0 * z2 - x2 - y2)) * read_sh_rgb(splat_index, 13u, degree);
        result += (SH_C3_5 * z * (x2 - y2)) * read_sh_rgb(splat_index, 14u, degree);
        result += (SH_C3_6 * x * (x2 - 3.0 * y2)) * read_sh_rgb(splat_index, 15u, degree);
    }
    return result + vec3<f32>(0.5);
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
    out.color = vec3<f32>(0.0);
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
    let splat_index = sorted_indices[instance_index];
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
    var linear_color: vec3<f32>;
    if (splat_field.params.z > 0.5) {
        let world_dir = safe_normalize(world_center4.xyz - camera.position);
        let local_dir = safe_normalize((transpose(model.normal) * vec4<f32>(world_dir, 0.0)).xyz);
        let degree = u32(splat_field.params.w + 0.5);
        linear_color = max(
            evaluate_spherical_harmonics(splat_index, local_dir, degree),
            vec3<f32>(0.0),
        );
    } else {
        linear_color = max(color_value.rgb, vec3<f32>(0.0));
    }
    if (splat_field.params.y > 0.5) {
        linear_color = linear_from_srgb(linear_color);
    }
    let alpha_base = clamp(color_value.a, 0.0, 1.0)
            * clamp(center_opacity_value.w, 0.0, 1.0)
            * clamp(splat_field.params.x, 0.0, 1.0)
            * radius_fade;
    var out: VertexOutput;
    out.position = clip_center + vec4<f32>(clip_offset, 0.0, 0.0);
    out.local_coord = corner;
    out.color = linear_color;
    out.alpha_base = alpha_base;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let q = dot(in.local_coord, in.local_coord);
    if (q > 1.0) {
        discard;
    }
    let alpha = in.alpha_base * exp(-4.5 * q);
    if (alpha <= 1e-4) {
        discard;
    }
    return vec4<f32>(in.color * alpha, alpha);
}

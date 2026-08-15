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
    scale_source: vec4<f32>,
    scale_domain: vec4<f32>,
    scale_clamp: vec4<f32>,
    scale_params: vec4<f32>,
    scale_flags: vec4<f32>,
    visual: vec4<f32>,
    colors: array<vec4<f32>, 8>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) col: vec4<f32>,
    @location(1) point_coord: vec2<f32>,
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

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> points: array<PointData>;
@group(1) @binding(1) var<uniform> pc: PointCloudUniforms;
@group(1) @binding(2) var colormap_sampler: sampler;
@group(1) @binding(3) var colormap_tex: texture_1d<f32>;
@group(1) @binding(4) var<storage, read> point_colors: array<vec4<f32>>;

fn scale_is_nan(v: f32) -> bool {
    let u = bitcast<u32>(v);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u;
}

fn scale_is_inf(v: f32) -> bool {
    let u = bitcast<u32>(v);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) == 0u;
}

fn scale_is_finite(v: f32) -> bool {
    return !scale_is_nan(v) && !scale_is_inf(v);
}

fn scale_clamp01(x: f32) -> f32 {
    return clamp(x, 0.0, 1.0);
}

fn scale_log_base(x: f32, base: f32) -> f32 {
    let b = max(base, 1.000001);
    return log(x) / log(b);
}

fn scale_apply_mode(x: f32, mode_id: u32, linthresh: f32, base: f32) -> f32 {
    if (mode_id == 0u) {
        return x;
    }
    if (mode_id == 1u) {
        return scale_log_base(max(x, 1e-20), base);
    }
    let lt = max(linthresh, 1e-20);
    let s = select(-1.0, 1.0, x >= 0.0);
    let y = scale_log_base(1.0 + abs(x) / lt, base);
    return s * y;
}

fn scale_select_value(
    v: vec4<f32>,
    component_count_in: u32,
    component_index_in: u32,
    value_mode: u32,
) -> f32 {
    let component_count = max(1u, min(4u, component_count_in));
    let component_index = min(3u, component_index_in);
    if (value_mode == 1u) {
        if (component_count == 1u) {
            return abs(v.x);
        }
        if (component_count == 2u) {
            return length(v.xy);
        }
        if (component_count == 3u) {
            return length(v.xyz);
        }
        return length(v);
    }
    if (component_index == 0u) {
        return v.x;
    }
    if (component_index == 1u) {
        return v.y;
    }
    if (component_index == 2u) {
        return v.z;
    }
    return v.w;
}

fn scale_apply_transform(
    raw_value: f32,
    domain: vec4<f32>,
    clamp_config: vec4<f32>,
    params: vec4<f32>,
    flags: vec4<f32>,
) -> f32 {
    if (!scale_is_finite(raw_value)) {
        return 0.0;
    }
    var v = raw_value;
    let clamp_mode = u32(domain.w + 0.5);
    let clamp_min = clamp_config.x;
    let clamp_max = clamp_config.y;
    if (clamp_mode != 0u && clamp_max > clamp_min) {
        v = clamp(v, clamp_min, clamp_max);
    }
    var d0 = domain.x;
    var d1 = domain.y;
    if (d1 <= d0 && clamp_max > clamp_min) {
        d0 = clamp_min;
        d1 = clamp_max;
    }
    let mode_id = u32(params.x + 0.5);
    let base = params.y;
    let linthresh = params.z;
    let gamma = max(params.w, 1e-6);
    let a = scale_apply_mode(d0, mode_id, linthresh, base);
    let b = scale_apply_mode(d1, mode_id, linthresh, base);
    let x = scale_apply_mode(v, mode_id, linthresh, base);
    let denom = max(1e-20, b - a);
    var t = scale_clamp01((x - a) / denom);
    t = pow(t, gamma);
    if (flags.x > 0.5) {
        t = 1.0 - t;
    }
    return scale_clamp01(t);
}

fn srgb_from_linear(linear: vec3<f32>) -> vec3<f32> {
    let a = 0.055;
    let lo = 12.92 * linear;
    let hi = (1.0 + a) * pow(linear, vec3<f32>(1.0 / 2.4)) - vec3<f32>(a);
    let use_hi = linear > vec3<f32>(0.0031308);
    return select(lo, hi, use_hi);
}

fn sample_custom_stops(t: f32, stop_count: u32) -> vec4<f32> {
    let n = min(stop_count, 8u);
    let x = scale_clamp01(t) * f32(n - 1u);
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= n - 1u) {
        return pc.colors[n - 1u];
    }
    return pc.colors[i] + f * (pc.colors[i + 1u] - pc.colors[i]);
}

fn colormap(t_in: f32) -> vec4<f32> {
    let t = scale_clamp01(t_in);
    let stop_count = u32(pc.visual.z + 0.5);
    if (stop_count >= 2u) {
        return sample_custom_stops(t, stop_count);
    }
    return textureSampleLevel(colormap_tex, colormap_sampler, t, 0.0);
}

fn vec4_component(v: vec4<f32>, idx: u32) -> f32 {
    if (idx == 0u) {
        return v.x;
    }
    if (idx == 1u) {
        return v.y;
    }
    if (idx == 2u) {
        return v.z;
    }
    return v.w;
}

fn shifted_value_vector(v: vec4<f32>, offset_floats: f32) -> vec4<f32> {
    let o = min(3u, u32(offset_floats + 0.5));
    let i0 = min(3u, o + 0u);
    let i1 = min(3u, o + 1u);
    let i2 = min(3u, o + 2u);
    let i3 = min(3u, o + 3u);
    return vec4<f32>(
        vec4_component(v, i0),
        vec4_component(v, i1),
        vec4_component(v, i2),
        vec4_component(v, i3),
    );
}

@vertex
fn vs_main(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
    let p = points[instance_index];
    let world_pos = model.model * vec4<f32>(p.position, 1.0);
    let clip = camera.view_proj * world_pos;
    let base_size = pc.size_params.x;
    let min_size = pc.size_params.y;
    let max_size = pc.size_params.z;
    let atten = pc.size_params.w;
    var size_px = base_size;
    if (atten > 0.0) {
        let dist = distance(camera.position, world_pos.xyz);
        size_px = base_size * (atten / max(dist, 1e-6));
    }
    size_px = clamp(size_px, min_size, max_size);
    let uv = vec2<f32>(
        f32((vertex_index + 2u) / 3u % 2u),
        f32((vertex_index + 1u) / 3u % 2u),
    );
    let row0 = vec3<f32>(camera.view_proj[0][0], camera.view_proj[1][0], camera.view_proj[2][0]);
    let row1 = vec3<f32>(camera.view_proj[0][1], camera.view_proj[1][1], camera.view_proj[2][1]);
    let aspect = length(row1) / max(length(row0), 1e-6);
    let ndc_size = (size_px * 2.0) / max(camera._pad0, 1.0);
    let offset_x = (uv.x - 0.5) * ndc_size / aspect * clip.w;
    let offset_y = -(uv.y - 0.5) * ndc_size * clip.w;
    let color_mode = u32(pc.visual.w + 0.5);
    var c: vec4<f32>;
    if (color_mode == 0u) {
        c = point_colors[instance_index];
    } else {
        let raw_vec = shifted_value_vector(vec4<f32>(p.position, p.scalar), pc.scale_domain.z);
        let component_count = u32(pc.scale_source.x + 0.5);
        let component_index = u32(pc.scale_source.y + 0.5);
        let value_mode = u32(pc.scale_source.z + 0.5);
        let raw_value = scale_select_value(raw_vec, component_count, component_index, value_mode);
        let finite_raw = scale_is_finite(raw_value);
        var t = scale_apply_transform(
            raw_value,
            vec4<f32>(pc.scale_domain.x, pc.scale_domain.y, 0.0, pc.scale_domain.w),
            pc.scale_clamp,
            pc.scale_params,
            pc.scale_flags,
        );
        c = colormap(t);
        if (!finite_raw) {
            c = vec4<f32>(0.0, 0.0, 0.0, 0.0);
        }
    }
    let alpha = scale_clamp01(c.a) * scale_clamp01(pc.visual.x);
    var out: VertexOutput;
    out.position = clip + vec4<f32>(offset_x, offset_y, 0.0, 0.0);
    out.point_coord = uv * 2.0 - vec2<f32>(1.0, 1.0);
    out.col = vec4<f32>(srgb_from_linear(max(c.rgb, vec3<f32>(0.0))), alpha);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.point_coord;
    let r2 = dot(uv, uv);
    if (r2 > 1.0) {
        discard;
    }
    let falloff = (1.0 - r2);
    let alpha = falloff * falloff;
    return vec4<f32>(in.col.rgb, in.col.a * alpha);
}

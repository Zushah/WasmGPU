/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct GlyphFieldUniforms {
    scale_source: vec4<f32>,
    scale_domain: vec4<f32>,
    scale_clamp: vec4<f32>,
    scale_params: vec4<f32>,
    scale_flags: vec4<f32>,
    visual: vec4<f32>,
    solid_color: vec4<f32>,
    colors: array<vec4<f32>, 8>,
}

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) @interpolate(flat) attrib: vec4<f32>,
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

struct Light {
    position: vec4<f32>,
    color: vec4<f32>,
    params: vec4<f32>,
}

struct LightingUniforms {
    ambient: vec4<f32>,
    light_count: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    lights: array<Light, 8>,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;
@group(1) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>;
@group(1) @binding(3) var<storage, read> attributes: array<vec4<f32>>;
@group(1) @binding(4) var<uniform> glyph: GlyphFieldUniforms;
@group(1) @binding(5) var colormap_sampler: sampler;
@group(1) @binding(6) var colormap_tex: texture_1d<f32>;

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

fn rotate_by_quat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

fn sample_custom_stops(t: f32) -> vec4<f32> {
    let count = u32(glyph.visual.y + 0.5);
    if (count <= 1u) {
        return glyph.colors[0u];
    }
    let n = min(count, 8u);
    let x = scale_clamp01(t) * f32(n - 1u);
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= n - 1u) {
        return glyph.colors[n - 1u];
    }
    return glyph.colors[i] + f * (glyph.colors[i + 1u] - glyph.colors[i]);
}

fn colormap(t_in: f32) -> vec4<f32> {
    let t = scale_clamp01(t_in);
    let stop_count = u32(glyph.visual.y + 0.5);
    if (stop_count >= 2u) {
        return sample_custom_stops(t);
    }
    return textureSample(colormap_tex, colormap_sampler, t);
}

fn apply_lighting(world_pos: vec3<f32>, n: vec3<f32>, base_color: vec3<f32>) -> vec3<f32> {
    var lo = lighting.ambient.rgb * base_color;
    let light_count = min(lighting.light_count, 8u);
    for (var i = 0u; i < light_count; i++) {
        let light = lighting.lights[i];
        var l: vec3<f32>;
        var attenuation: f32 = 1.0;
        if (light.position.w == 0.0) {
            l = normalize(-light.position.xyz);
        } else {
            let light_dir = light.position.xyz - world_pos;
            let distance = length(light_dir);
            l = select(vec3<f32>(0.0, 1.0, 0.0), light_dir / distance, distance > 1e-6);
            attenuation = 1.0 / max(distance * distance, 1e-6);
            let range = light.params.x;
            if (range > 0.0) {
                let f = scale_clamp01(1.0 - distance / range);
                attenuation *= f * f;
            }
        }
        let n_dot_l = max(dot(n, l), 0.0);
        let radiance = light.color.rgb * light.color.a * attenuation;
        lo += base_color * radiance * n_dot_l;
    }
    return lo;
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
fn vs_main(in: VertexInput, @builtin(instance_index) instance_index: u32) -> VertexOutput {
    let p4 = positions[instance_index];
    let q = rotations[instance_index];
    let s4 = scales[instance_index];
    let a4 = attributes[instance_index];
    let scl = s4.xyz;
    let local_pos = rotate_by_quat(in.position * scl, q) + p4.xyz;
    let world_pos4 = model.model * vec4<f32>(local_pos, 1.0);
    let world_pos = world_pos4.xyz;
    let inv_scale = 1.0 / max(abs(scl), vec3<f32>(1e-6));
    let local_n = in.normal * inv_scale;
    let inst_n = rotate_by_quat(local_n, q);
    let world_n = normalize((model.normal * vec4<f32>(inst_n, 0.0)).xyz);
    var out: VertexOutput;
    out.position = camera.view_proj * vec4<f32>(world_pos, 1.0);
    out.world_pos = world_pos;
    out.normal = world_n;
    out.attrib = a4;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let color_mode = u32(round(glyph.visual.z));
    let lit = glyph.visual.w > 0.5;
    var base_color: vec3<f32>;
    var alpha: f32 = 1.0;
    if (color_mode == 0u) {
        base_color = in.attrib.rgb;
        alpha = in.attrib.a;
    } else if (color_mode == 1u) {
        let shifted = shifted_value_vector(in.attrib, glyph.scale_domain.z);
        let component_count = u32(glyph.scale_source.x + 0.5);
        let component_index = u32(glyph.scale_source.y + 0.5);
        let value_mode = u32(glyph.scale_source.z + 0.5);
        let raw_value = scale_select_value(shifted, component_count, component_index, value_mode);
        if (!scale_is_finite(raw_value)) {
            discard;
        }
        let t = scale_apply_transform(
            raw_value,
            vec4<f32>(glyph.scale_domain.x, glyph.scale_domain.y, 0.0, glyph.scale_domain.w),
            glyph.scale_clamp,
            glyph.scale_params,
            glyph.scale_flags,
        );
        let cmap = colormap(t);
        base_color = cmap.rgb;
        alpha = cmap.a;
    } else {
        base_color = glyph.solid_color.rgb;
        alpha = glyph.solid_color.a;
    }
    base_color = max(base_color, vec3<f32>(0.0));
    alpha = scale_clamp01(alpha) * scale_clamp01(glyph.visual.x);
    var shaded = base_color;
    if (lit) {
        shaded = apply_lighting(in.world_pos, normalize(in.normal), base_color);
    }
    return vec4<f32>(srgb_from_linear(shaded), alpha);
}

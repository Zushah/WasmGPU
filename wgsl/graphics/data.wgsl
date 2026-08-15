/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct MaterialUniforms {
    scale_source: vec4<f32>,
    scale_domain: vec4<f32>,
    scale_clamp: vec4<f32>,
    scale_params: vec4<f32>,
    scale_flags: vec4<f32>,
    color_params: vec4<f32>,
}

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) data_value: vec4<f32>,
}

struct CameraUniforms {
    view_projection: mat4x4<f32>,
    position: vec3<f32>,
}

struct ModelUniforms {
    model: mat4x4<f32>,
    normal_matrix: mat4x4<f32>,
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
@group(1) @binding(0) var<uniform> material: MaterialUniforms;
@group(1) @binding(1) var<storage, read> data: array<f32>;
@group(1) @binding(2) var colormap_sampler: sampler;
@group(1) @binding(3) var colormap_tex: texture_1d<f32>;

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

fn srgb_from_linear(c: vec3<f32>) -> vec3<f32> {
    let a = vec3<f32>(0.055);
    return select(
        12.92 * c,
        (1.0 + a) * pow(c, vec3<f32>(1.0 / 2.4)) - a,
        c > vec3<f32>(0.0031308),
    );
}

fn luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@vertex
fn vs_main(in: VertexInput, @builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var out: VertexOutput;
    let world_pos4 = model.model * vec4<f32>(in.position, 1.0);
    out.position = camera.view_projection * world_pos4;
    out.world_pos = world_pos4.xyz;
    out.normal = normalize((model.normal_matrix * vec4<f32>(in.normal, 0.0)).xyz);
    let component_count = max(1u, min(4u, u32(material.scale_source.x + 0.5)));
    let stride = max(1u, u32(material.scale_source.w + 0.5));
    let data_offset = u32(material.scale_domain.z + 0.5);
    let base = vertex_index * stride + data_offset;
    var x: f32 = data[base + 0u];
    var y: f32 = 0.0;
    var z: f32 = 0.0;
    var w: f32 = 0.0;
    if (component_count > 1u) {
        y = data[base + 1u];
    }
    if (component_count > 2u) {
        z = data[base + 2u];
    }
    if (component_count > 3u) {
        w = data[base + 3u];
    }
    out.data_value = vec4<f32>(x, y, z, w);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let component_count = max(1u, min(4u, u32(material.scale_source.x + 0.5)));
    let component_index = min(3u, u32(material.scale_source.y + 0.5));
    let value_mode = u32(material.scale_source.z + 0.5);
    let v = scale_select_value(in.data_value, component_count, component_index, value_mode);
    if (!scale_is_finite(v)) {
        discard;
    }
    let t = scale_apply_transform(
        v,
        vec4<f32>(material.scale_domain.x, material.scale_domain.y, 0.0, material.scale_domain.w),
        material.scale_clamp,
        material.scale_params,
        material.scale_flags,
    );
    var cmap = textureSample(colormap_tex, colormap_sampler, t);
    let shading = scale_clamp01(material.color_params.y);
    if (shading > 0.0) {
        let n = normalize(in.normal);
        var light_factor: f32 = luminance(lighting.ambient.rgb);
        for (var i = 0u; i < lighting.light_count; i++) {
            let light = lighting.lights[i];
            var l: vec3<f32>;
            var attenuation: f32 = 1.0;
            if (light.position.w == 0.0) {
                l = normalize(-light.position.xyz);
            } else {
                let light_dir = light.position.xyz - in.world_pos;
                let dist = length(light_dir);
                l = normalize(light_dir);
                attenuation = 1.0 / max(1e-6, dist * dist);
            }
            let ndotl = max(dot(n, l), 0.0);
            let lum = luminance(light.color.rgb) * light.color.a;
            light_factor += lum * attenuation * ndotl;
        }
        let shaded_rgb = cmap.rgb * light_factor;
        cmap = vec4<f32>(mix(cmap.rgb, shaded_rgb, shading), cmap.a);
    }
    let opacity = scale_clamp01(material.color_params.x);
    let final_a = cmap.a * opacity;
    let final_rgb = clamp(cmap.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
    cmap = vec4<f32>(final_rgb, final_a);
    return vec4<f32>(srgb_from_linear(cmap.rgb), cmap.a);
}

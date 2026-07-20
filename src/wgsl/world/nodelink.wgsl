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

struct NodeVertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) @interpolate(flat) node_index: u32,
    @location(3) point_coord: vec2<f32>,
    @location(4) @interpolate(flat) is_point: f32,
}

struct EdgeVertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) @interpolate(flat) edge_index: u32,
    @location(3) @interpolate(flat) lit_enabled: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;
@group(1) @binding(0) var<storage, read> node_positions: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> node_scalars: array<f32>;
@group(1) @binding(2) var<storage, read> node_colors: array<vec4<f32>>;
@group(1) @binding(3) var<storage, read> node_radii: array<vec4<f32>>;
@group(1) @binding(4) var<storage, read> edges: array<vec2<u32>>;
@group(1) @binding(5) var<storage, read> edge_scalars: array<f32>;
@group(1) @binding(6) var<storage, read> edge_colors: array<vec4<f32>>;
@group(1) @binding(7) var<uniform> nl: NodeLinkUniforms;
@group(1) @binding(8) var node_colormap_sampler: sampler;
@group(1) @binding(9) var node_colormap_tex: texture_1d<f32>;
@group(1) @binding(10) var edge_colormap_sampler: sampler;
@group(1) @binding(11) var edge_colormap_tex: texture_1d<f32>;

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

fn sample_custom_stops(t_in: f32, stops: array<vec4<f32>, 8>, stop_count_in: u32) -> vec4<f32> {
    let n = min(8u, max(2u, stop_count_in));
    let x = scale_clamp01(t_in) * f32(n - 1u);
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= n - 1u) {
        return stops[n - 1u];
    }
    return stops[i] + f * (stops[i + 1u] - stops[i]);
}

fn sample_node_colormap(t: f32) -> vec4<f32> {
    let stop_count = u32(nl.node_visual.y + 0.5);
    if (stop_count >= 2u) {
        return sample_custom_stops(t, nl.node_stops, stop_count);
    }
    return textureSampleLevel(node_colormap_tex, node_colormap_sampler, scale_clamp01(t), 0.0);
}

fn sample_edge_colormap(t: f32) -> vec4<f32> {
    let stop_count = u32(nl.edge_visual.y + 0.5);
    if (stop_count >= 2u) {
        return sample_custom_stops(t, nl.edge_stops, stop_count);
    }
    return textureSampleLevel(edge_colormap_tex, edge_colormap_sampler, scale_clamp01(t), 0.0);
}

fn node_color(index: u32) -> vec4<f32> {
    let mode = u32(round(nl.node_visual.x));
    if (mode == 0u) {
        return node_colors[index];
    }
    if (mode == 1u) {
        let raw_value = node_scalars[index];
        if (!scale_is_finite(raw_value)) {
            return vec4<f32>(0.0, 0.0, 0.0, 0.0);
        }
        let t = scale_apply_transform(
            raw_value,
            vec4<f32>(nl.node_scale_domain.x, nl.node_scale_domain.y, 0.0, nl.node_scale_domain.w),
            nl.node_scale_clamp,
            nl.node_scale_params,
            nl.node_scale_flags,
        );
        return sample_node_colormap(t);
    }
    return nl.node_solid;
}

fn edge_color(index: u32) -> vec4<f32> {
    let mode = u32(round(nl.edge_visual.x));
    if (mode == 0u) {
        return edge_colors[index];
    }
    if (mode == 1u) {
        let raw_value = edge_scalars[index];
        if (!scale_is_finite(raw_value)) {
            return vec4<f32>(0.0, 0.0, 0.0, 0.0);
        }
        let t = scale_apply_transform(
            raw_value,
            vec4<f32>(nl.edge_scale_domain.x, nl.edge_scale_domain.y, 0.0, nl.edge_scale_domain.w),
            nl.edge_scale_clamp,
            nl.edge_scale_params,
            nl.edge_scale_flags,
        );
        return sample_edge_colormap(t);
    }
    return nl.edge_solid;
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

fn build_edge_frame(src: vec3<f32>, dst: vec3<f32>) -> mat3x3<f32> {
    let y_axis = normalize(dst - src);
    var z = vec3<f32>(0.0, 0.0, 1.0);
    if (abs(dot(z, y_axis)) > 0.99) {
        z = vec3<f32>(1.0, 0.0, 0.0);
    }
    let x_axis = normalize(cross(z, y_axis));
    let z_axis = normalize(cross(y_axis, x_axis));
    return mat3x3<f32>(x_axis, y_axis, z_axis);
}

@vertex
fn vs_node_points(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> NodeVertexOutput {
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
    var out: NodeVertexOutput;
    out.position = clip + vec4<f32>(offset_x, offset_y, 0.0, 0.0);
    out.world_pos = world_pos4.xyz;
    out.normal = vec3<f32>(0.0, 0.0, 1.0);
    out.node_index = instance_index;
    out.point_coord = uv * 2.0 - vec2<f32>(1.0, 1.0);
    out.is_point = 1.0;
    return out;
}

@vertex
fn vs_node_solid(
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @builtin(instance_index) instance_index: u32,
) -> NodeVertexOutput {
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
    let local_n = normalize(normal / scale_vec);
    let world_n = normalize((model.normal * vec4<f32>(local_n, 0.0)).xyz);
    var out: NodeVertexOutput;
    out.position = camera.view_proj * world_pos4;
    out.world_pos = world_pos4.xyz;
    out.normal = world_n;
    out.node_index = instance_index;
    out.point_coord = vec2<f32>(0.0, 0.0);
    out.is_point = 0.0;
    return out;
}

@vertex
fn vs_edge_lines(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> EdgeVertexOutput {
    let edge = edges[instance_index];
    let src = node_positions[edge.x].xyz;
    let dst = node_positions[edge.y].xyz;
    let obj_pos = select(src, dst, (vertex_index & 1u) == 1u);
    let world_pos4 = model.model * vec4<f32>(obj_pos, 1.0);
    var out: EdgeVertexOutput;
    out.position = camera.view_proj * world_pos4;
    out.world_pos = world_pos4.xyz;
    out.normal = vec3<f32>(0.0, 1.0, 0.0);
    out.edge_index = instance_index;
    out.lit_enabled = 0.0;
    return out;
}

@vertex
fn vs_edge_cylinders(
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @builtin(instance_index) instance_index: u32,
) -> EdgeVertexOutput {
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
    let local_n = normalize(basis * vec3<f32>(normal.x, 0.0, normal.z));
    let world_n = normalize((model.normal * vec4<f32>(local_n, 0.0)).xyz);
    var out: EdgeVertexOutput;
    out.position = camera.view_proj * world_pos4;
    out.world_pos = world_pos4.xyz;
    out.normal = world_n;
    out.edge_index = instance_index;
    out.lit_enabled = 1.0;
    return out;
}

@fragment
fn fs_node(in: NodeVertexOutput) -> @location(0) vec4<f32> {
    var c = node_color(in.node_index);
    if (in.is_point > 0.5) {
        let r2 = dot(in.point_coord, in.point_coord);
        if (r2 > 1.0) {
            discard;
        }
        let falloff = (1.0 - r2);
        c = vec4<f32>(c.rgb, c.a * (falloff * falloff));
    } else if (nl.global.w > 0.5) {
        let lit_rgb = apply_lighting(
            in.world_pos,
            normalize(in.normal),
            max(c.rgb, vec3<f32>(0.0)),
        );
        c = vec4<f32>(lit_rgb, c.a);
    }
    c = vec4<f32>(c.rgb, c.a * scale_clamp01(nl.global.z));
    return vec4<f32>(srgb_from_linear(max(c.rgb, vec3<f32>(0.0))), c.a);
}

@fragment
fn fs_edge(in: EdgeVertexOutput) -> @location(0) vec4<f32> {
    var c = edge_color(in.edge_index);
    if (nl.global.w > 0.5 && in.lit_enabled > 0.5) {
        let lit_rgb = apply_lighting(
            in.world_pos,
            normalize(in.normal),
            max(c.rgb, vec3<f32>(0.0)),
        );
        c = vec4<f32>(lit_rgb, c.a);
    }
    c = vec4<f32>(c.rgb, c.a * scale_clamp01(nl.global.z));
    return vec4<f32>(srgb_from_linear(max(c.rgb, vec3<f32>(0.0))), c.a);
}

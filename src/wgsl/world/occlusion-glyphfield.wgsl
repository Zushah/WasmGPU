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

struct CameraUniforms {
    view_proj: mat4x4<f32>,
    position: vec3<f32>,
    _pad0: f32,
}

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>,
}

struct VertexInput {
    @location(0) position: vec3<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(flat) attrib: vec4<f32>,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>;
@group(1) @binding(3) var<storage, read> attributes: array<vec4<f32>>;
@group(1) @binding(4) var<uniform> glyph: GlyphFieldUniforms;

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
    out.attrib = attributes[instance_index];
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) f32 {
    let color_mode = u32(round(glyph.visual.z));
    if (color_mode == 1u) {
        let shifted = shifted_value_vector(in.attrib, glyph.scale_domain.z);
        let component_count = u32(glyph.scale_source.x + 0.5);
        let component_index = u32(glyph.scale_source.y + 0.5);
        let value_mode = u32(glyph.scale_source.z + 0.5);
        let raw_value = scale_select_value(shifted, component_count, component_index, value_mode);
        if (!scale_is_finite(raw_value)) {
            discard;
        }
    }
    return in.position.z;
}

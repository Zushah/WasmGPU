/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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

fn scale_select_value(v: vec4f, componentCountIn: u32, componentIndexIn: u32, valueMode: u32) -> f32 {
    let componentCount = max(1u, min(4u, componentCountIn));
    let componentIndex = min(3u, componentIndexIn);
    if (valueMode == 1u) {
        if (componentCount == 1u) { return abs(v.x); }
        if (componentCount == 2u) { return length(v.xy); }
        if (componentCount == 3u) { return length(v.xyz); }
        return length(v);
    }
    if (componentIndex == 0u) { return v.x; }
    if (componentIndex == 1u) { return v.y; }
    if (componentIndex == 2u) { return v.z; }
    return v.w;
}

fn vec4Component(v: vec4f, idx: u32) -> f32 {
    if (idx == 0u) { return v.x; }
    if (idx == 1u) { return v.y; }
    if (idx == 2u) { return v.z; }
    return v.w;
}

fn shiftedValueVector(v: vec4f, offsetFloats: f32) -> vec4f {
    let o = min(3u, u32(offsetFloats + 0.5));
    let i0 = min(3u, o + 0u);
    let i1 = min(3u, o + 1u);
    let i2 = min(3u, o + 2u);
    let i3 = min(3u, o + 3u);
    return vec4f(vec4Component(v, i0), vec4Component(v, i1), vec4Component(v, i2), vec4Component(v, i3));
}

@group(1) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>;
@group(1) @binding(3) var<storage, read> attributes: array<vec4<f32>>;

struct GlyphFieldUniforms {
    scaleSource: vec4f,
    scaleDomain: vec4f,
    scaleClamp: vec4f,
    scaleParams: vec4f,
    scaleFlags: vec4f,
    visual: vec4f,
    solidColor: vec4f,
    colors: array<vec4f, 8>
};

@group(1) @binding(4) var<uniform> glyph: GlyphFieldUniforms;

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

struct VertexInput {
    @location(0) position: vec3<f32>
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(flat) attrib: vec4f
};

fn rotateByQuat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

@vertex
fn vs_main(in: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let p4 = positions[instanceIndex];
    let q = rotations[instanceIndex];
    let s4 = scales[instanceIndex];
    let localPos = rotateByQuat(in.position * s4.xyz, q) + p4.xyz;
    let worldPos = model.model * vec4<f32>(localPos, 1.0);
    var out: VertexOutput;
    out.position = camera.viewProj * worldPos;
    out.attrib = attributes[instanceIndex];
    return out;
}

@fragment
fn fs_main(in: VertexOutput, @builtin(position) fragCoord: vec4<f32>) -> @location(0) f32 {
    let colorMode = u32(round(glyph.visual.z));
    if (colorMode == 1u) {
        let shifted = shiftedValueVector(in.attrib, glyph.scaleDomain.z);
        let componentCount = u32(glyph.scaleSource.x + 0.5);
        let componentIndex = u32(glyph.scaleSource.y + 0.5);
        let valueMode = u32(glyph.scaleSource.z + 0.5);
        let rawValue = scale_select_value(shifted, componentCount, componentIndex, valueMode);
        if (!scale_is_finite(rawValue)) {
            discard;
        }
    }
    return fragCoord.z;
}

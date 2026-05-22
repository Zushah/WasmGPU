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

fn scale_clamp01(x: f32) -> f32 {
    return clamp(x, 0.0, 1.0);
}

fn scale_log_base(x: f32, base: f32) -> f32 {
    let b = max(base, 1.000001);
    return log(x) / log(b);
}

fn scale_apply_mode(x: f32, modeId: u32, linthresh: f32, base: f32) -> f32 {
    if (modeId == 0u) {
        return x;
    }
    if (modeId == 1u) {
        return scale_log_base(max(x, 1e-20), base);
    }
    let lt = max(linthresh, 1e-20);
    let s = select(-1.0, 1.0, x >= 0.0);
    let y = scale_log_base(1.0 + abs(x) / lt, base);
    return s * y;
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

fn scale_apply_transform(rawValue: f32, domain: vec4f, clampConfig: vec4f, params: vec4f, flags: vec4f) -> f32 {
    if (!scale_is_finite(rawValue)) {
        return 0.0;
    }
    var v = rawValue;
    let clampMode = u32(domain.w + 0.5);
    let clampMin = clampConfig.x;
    let clampMax = clampConfig.y;
    if (clampMode != 0u && clampMax > clampMin) {
        v = clamp(v, clampMin, clampMax);
    }
    var d0 = domain.x;
    var d1 = domain.y;
    if (d1 <= d0 && clampMax > clampMin) {
        d0 = clampMin;
        d1 = clampMax;
    }
    let modeId = u32(params.x + 0.5);
    let base = params.y;
    let linthresh = params.z;
    let gamma = max(params.w, 1e-6);
    let a = scale_apply_mode(d0, modeId, linthresh, base);
    let b = scale_apply_mode(d1, modeId, linthresh, base);
    let x = scale_apply_mode(v, modeId, linthresh, base);
    let denom = max(1e-20, b - a);
    var t = scale_clamp01((x - a) / denom);
    t = pow(t, gamma);
    if (flags.x > 0.5) {
        t = 1.0 - t;
    }
    return scale_clamp01(t);
}

struct PointData {
    position: vec3f,
    scalar: f32
};

@group(1) @binding(0) var<storage, read> points: array<PointData>;
@group(1) @binding(4) var<storage, read> pointColors: array<vec4f>;

struct PointCloudUniforms {
    sizeParams: vec4f,
    scaleSource: vec4f,
    scaleDomain: vec4f,
    scaleClamp: vec4f,
    scaleParams: vec4f,
    scaleFlags: vec4f,
    visual: vec4f,
    colors: array<vec4f, 8>
};

@group(1) @binding(1) var<uniform> pc: PointCloudUniforms;
@group(1) @binding(2) var colormapSampler: sampler;
@group(1) @binding(3) var colormapTex: texture_1d<f32>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) col: vec4f,
    @location(1) pointCoord: vec2f,
};

struct CameraUniforms {
    viewProj: mat4x4<f32>,
    position: vec3f,
    _pad0: f32
};

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;

fn srgbFromLinear(linear: vec3f) -> vec3f {
    let a = 0.055;
    let lo = 12.92 * linear;
    let hi = (1.0 + a) * pow(linear, vec3f(1.0 / 2.4)) - vec3f(a);
    let useHi = linear > vec3f(0.0031308);
    return select(lo, hi, useHi);
}

fn sampleCustomStops(t: f32, stopCount: u32) -> vec4f {
    let n = min(stopCount, 8u);
    let x = scale_clamp01(t) * f32(n - 1u);
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= n - 1u) {
        return pc.colors[n - 1u];
    }
    return pc.colors[i] + f * (pc.colors[i + 1u] - pc.colors[i]);
}

fn colormap(tIn: f32) -> vec4f {
    let t = scale_clamp01(tIn);
    let stopCount = u32(pc.visual.z + 0.5);
    if (stopCount >= 2u) {
        return sampleCustomStops(t, stopCount);
    }
    return textureSampleLevel(colormapTex, colormapSampler, t, 0.0);
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

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let p = points[instanceIndex];
    let worldPos = model.model * vec4f(p.position, 1.0);
    let clip = camera.viewProj * worldPos;
    let baseSize = pc.sizeParams.x;
    let minSize = pc.sizeParams.y;
    let maxSize = pc.sizeParams.z;
    let atten = pc.sizeParams.w;
    var sizePx = baseSize;
    if (atten > 0.0) {
        let dist = distance(camera.position, worldPos.xyz);
        sizePx = baseSize * (atten / max(dist, 1e-6));
    }
    sizePx = clamp(sizePx, minSize, maxSize);
    let uv = vec2f(
        f32((vertexIndex + 2u) / 3u % 2u),
        f32((vertexIndex + 1u) / 3u % 2u)
    );
    let row0 = vec3f(camera.viewProj[0][0], camera.viewProj[1][0], camera.viewProj[2][0]);
    let row1 = vec3f(camera.viewProj[0][1], camera.viewProj[1][1], camera.viewProj[2][1]);
    let aspect = length(row1) / max(length(row0), 1e-6);
    let ndcSize = (sizePx * 2.0) / max(camera._pad0, 1.0);
    let offsetX = (uv.x - 0.5) * ndcSize / aspect * clip.w;
    let offsetY = -(uv.y - 0.5) * ndcSize * clip.w;
    let colorMode = u32(pc.visual.w + 0.5);
    var c: vec4f;
    if (colorMode == 0u) {
        c = pointColors[instanceIndex];
    } else {
        let rawVec = shiftedValueVector(vec4f(p.position, p.scalar), pc.scaleDomain.z);
        let componentCount = u32(pc.scaleSource.x + 0.5);
        let componentIndex = u32(pc.scaleSource.y + 0.5);
        let valueMode = u32(pc.scaleSource.z + 0.5);
        let rawValue = scale_select_value(rawVec, componentCount, componentIndex, valueMode);
        let finiteRaw = scale_is_finite(rawValue);
        var t = scale_apply_transform(rawValue, vec4f(pc.scaleDomain.x, pc.scaleDomain.y, 0.0, pc.scaleDomain.w), pc.scaleClamp, pc.scaleParams, pc.scaleFlags);
        c = colormap(t);
        if (!finiteRaw) {
            c = vec4f(0.0, 0.0, 0.0, 0.0);
        }
    }
    let alpha = scale_clamp01(c.a) * scale_clamp01(pc.visual.x);
    var out: VertexOutput;
    out.position = clip + vec4f(offsetX, offsetY, 0.0, 0.0);
    out.pointCoord = uv * 2.0 - vec2f(1.0, 1.0);
    out.col = vec4f(srgbFromLinear(max(c.rgb, vec3f(0.0))), alpha);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.pointCoord;
    let r2 = dot(uv, uv);
    if (r2 > 1.0) { discard; }
    let falloff = (1.0 - r2);
    let alpha = falloff * falloff;
    return vec4f(in.col.rgb, in.col.a * alpha);
}

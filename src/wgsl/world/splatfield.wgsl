/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct CameraUniforms {
    viewProj: mat4x4f,
    position: vec3f,
    viewportHeight: f32
};

struct ModelUniforms {
    model: mat4x4f,
    normal: mat4x4f
};

struct SplatFieldUniforms {
    params: vec4f
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) localCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) alphaBase: f32
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> centerOpacity: array<vec4f>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4f>;
@group(1) @binding(2) var<storage, read> scales: array<vec4f>;
@group(1) @binding(3) var<storage, read> colors: array<vec4f>;
@group(1) @binding(4) var<storage, read> sortedIndices: array<u32>;
@group(1) @binding(5) var<uniform> splatField: SplatFieldUniforms;

fn linearFromSrgb(srgb: vec3f) -> vec3f {
    let x = clamp(srgb, vec3f(0.0), vec3f(1.0));
    let lo = x / vec3f(12.92);
    let hi = pow((x + vec3f(0.055)) / vec3f(1.055), vec3f(2.4));
    let useHi = x > vec3f(0.04045);
    return select(lo, hi, useHi);
}

fn rotateByQuat(v: vec3f, q: vec4f) -> vec3f {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

fn safeClipW(w: f32) -> f32 {
    return select(1e-6, w, abs(w) > 1e-6);
}

fn splatCenterRenderable(clip: vec4f) -> bool {
    let eps = 1e-6;
    return (clip.w > eps) && (clip.z >= -eps) && (clip.z <= clip.w + eps);
}

fn row4(m: mat4x4f, r: u32) -> vec4f {
    return vec4f(m[0][r], m[1][r], m[2][r], m[3][r]);
}

fn invalidVertex() -> VertexOutput {
    var out: VertexOutput;
    out.position = vec4f(2.0, 2.0, 2.0, 1.0);
    out.localCoord = vec2f(0.0);
    out.color = vec3f(0.0);
    out.alphaBase = 0.0;
    return out;
}

fn quadCorner(vertexIndex: u32) -> vec2f {
    if (vertexIndex == 0u) { return vec2f(-1.0, -1.0); }
    if (vertexIndex == 1u) { return vec2f(1.0, -1.0); }
    if (vertexIndex == 2u) { return vec2f(-1.0, 1.0); }
    if (vertexIndex == 3u) { return vec2f(-1.0, 1.0); }
    if (vertexIndex == 4u) { return vec2f(1.0, -1.0); }
    return vec2f(1.0, 1.0);
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let splatIndex = sortedIndices[instanceIndex];
    let centerOpacityValue = centerOpacity[splatIndex];
    let rotationValue = rotations[splatIndex];
    let scaleValue = max(abs(scales[splatIndex].xyz), vec3f(1e-6));
    let colorValue = colors[splatIndex];
    let worldCenter4 = model.model * vec4f(centerOpacityValue.xyz, 1.0);
    let clipCenter = camera.viewProj * worldCenter4;
    if (!splatCenterRenderable(clipCenter)) {
        return invalidVertex();
    }
    let guardedClipW = safeClipW(clipCenter.w);
    let localAxisX = rotateByQuat(vec3f(scaleValue.x, 0.0, 0.0), rotationValue);
    let localAxisY = rotateByQuat(vec3f(0.0, scaleValue.y, 0.0), rotationValue);
    let localAxisZ = rotateByQuat(vec3f(0.0, 0.0, scaleValue.z), rotationValue);
    let worldAxisX = (model.model * vec4f(localAxisX, 0.0)).xyz;
    let worldAxisY = (model.model * vec4f(localAxisY, 0.0)).xyz;
    let worldAxisZ = (model.model * vec4f(localAxisZ, 0.0)).xyz;
    let viewProjRow0 = row4(camera.viewProj, 0u);
    let viewProjRow1 = row4(camera.viewProj, 1u);
    let viewProjRow3 = row4(camera.viewProj, 3u);
    let invClipWSq = 1.0 / (guardedClipW * guardedClipW);
    let jx = (viewProjRow0.xyz * guardedClipW - clipCenter.x * viewProjRow3.xyz) * invClipWSq;
    let jy = (viewProjRow1.xyz * guardedClipW - clipCenter.y * viewProjRow3.xyz) * invClipWSq;
    let a0 = vec2f(dot(jx, worldAxisX), dot(jy, worldAxisX));
    let a1 = vec2f(dot(jx, worldAxisY), dot(jy, worldAxisY));
    let a2 = vec2f(dot(jx, worldAxisZ), dot(jy, worldAxisZ));
    let covXX = a0.x * a0.x + a1.x * a1.x + a2.x * a2.x;
    let covXY = a0.x * a0.y + a1.x * a1.y + a2.x * a2.y;
    let covYY = a0.y * a0.y + a1.y * a1.y + a2.y * a2.y;
    let trace = covXX + covYY;
    let diff = covXX - covYY;
    let root = sqrt(max(0.0, diff * diff + 4.0 * covXY * covXY));
    let lambda0 = max(1e-10, 0.5 * (trace + root));
    let lambda1 = max(1e-10, 0.5 * (trace - root));
    var axis0 = vec2f(1.0, 0.0);
    if (abs(covXY) > 1e-8) {
        axis0 = normalize(vec2f(covXY, lambda0 - covXX));
    } else if (covYY > covXX) {
        axis0 = vec2f(0.0, 1.0);
    }
    let axis1 = vec2f(-axis0.y, axis0.x);
    let basis0 = axis0 * sqrt(lambda0) * 3.0;
    let basis1 = axis1 * sqrt(lambda1) * 3.0;
    let viewportHeight = max(camera.viewportHeight, 1.0);
    let radiusNdc = max(length(basis0), length(basis1));
    let radiusPx = radiusNdc * 0.5 * viewportHeight;
    let maxRadiusPx = max(96.0, min(512.0, viewportHeight * 0.45));
    let fadeStartPx = maxRadiusPx * 0.75;
    if (radiusPx >= maxRadiusPx) {
        return invalidVertex();
    }
    let radiusFade = 1.0 - smoothstep(fadeStartPx, maxRadiusPx, radiusPx);
    let corner = quadCorner(vertexIndex);
    let ndcOffset = (basis0 * corner.x) + (basis1 * corner.y);
    let clipOffset = ndcOffset * clipCenter.w;
    var linearColor = max(colorValue.rgb, vec3f(0.0));
    if (splatField.params.y > 0.5) {
        linearColor = linearFromSrgb(linearColor);
    }
    let alphaBase = clamp(colorValue.a, 0.0, 1.0) * clamp(centerOpacityValue.w, 0.0, 1.0) * clamp(splatField.params.x, 0.0, 1.0) * radiusFade;
    var out: VertexOutput;
    out.position = clipCenter + vec4f(clipOffset, 0.0, 0.0);
    out.localCoord = corner;
    out.color = linearColor;
    out.alphaBase = alphaBase;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let q = dot(in.localCoord, in.localCoord);
    if (q > 1.0) {
        discard;
    }
    let alpha = in.alphaBase * exp(-4.5 * q);
    if (alpha <= 1e-4) {
        discard;
    }
    return vec4f(in.color * alpha, alpha);
}

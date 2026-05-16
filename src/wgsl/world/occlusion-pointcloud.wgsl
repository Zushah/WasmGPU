/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct PointData {
    position: vec3<f32>,
    scalar: f32
};

struct PointCloudUniforms {
    sizeParams: vec4<f32>,
    scalarParams: vec4<f32>,
    options: vec4<f32>,
    colors: array<vec4<f32>, 8>
};

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
@group(1) @binding(0) var<storage, read> points: array<PointData>;
@group(1) @binding(1) var<uniform> pc: PointCloudUniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) pointCoord: vec2<f32>
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let p = points[instanceIndex];
    let worldPos = model.model * vec4<f32>(p.position, 1.0);
    let clip = camera.viewProj * worldPos;
    let dist = distance(camera.position, worldPos.xyz);
    let baseSize = pc.sizeParams.x;
    let minSize = pc.sizeParams.y;
    let maxSize = pc.sizeParams.z;
    let atten = pc.sizeParams.w;
    var sizePx = baseSize;
    if (atten > 0.0) {
        sizePx = baseSize * (atten / max(dist, 1e-6));
    }
    sizePx = clamp(sizePx, minSize, maxSize);
    var uv = vec2<f32>(0.0);
    if (vertexIndex == 0u) {
        uv = vec2<f32>(0.0, 0.0);
    } else if (vertexIndex == 1u) {
        uv = vec2<f32>(1.0, 0.0);
    } else if (vertexIndex == 2u) {
        uv = vec2<f32>(0.0, 1.0);
    } else if (vertexIndex == 3u) {
        uv = vec2<f32>(1.0, 0.0);
    } else if (vertexIndex == 4u) {
        uv = vec2<f32>(1.0, 1.0);
    } else if (vertexIndex == 5u) {
        uv = vec2<f32>(0.0, 1.0);
    }
    let row0 = vec3<f32>(camera.viewProj[0][0], camera.viewProj[1][0], camera.viewProj[2][0]);
    let row1 = vec3<f32>(camera.viewProj[0][1], camera.viewProj[1][1], camera.viewProj[2][1]);
    let aspect = length(row1) / max(length(row0), 1e-6);
    let ndcSize = (sizePx * 2.0) / max(camera._pad0, 1.0);
    let offsetX = (uv.x - 0.5) * ndcSize / aspect * clip.w;
    let offsetY = -(uv.y - 0.5) * ndcSize * clip.w;
    var out: VertexOutput;
    out.position = clip + vec4<f32>(offsetX, offsetY, 0.0, 0.0);
    out.pointCoord = uv;
    return out;
}

@fragment
fn fs_main(in: VertexOutput, @builtin(position) fragCoord: vec4<f32>) -> @location(0) f32 {
    let uv = in.pointCoord * 2.0 - vec2<f32>(1.0, 1.0);
    let r2 = dot(uv, uv);
    if (r2 > 1.0) {
        discard;
    }
    return fragCoord.z;
}

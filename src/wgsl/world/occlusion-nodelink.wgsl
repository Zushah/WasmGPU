/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct CameraUniforms {
    viewProj: mat4x4f,
    position: vec3f,
    _pad0: f32
};

struct ModelUniforms {
    model: mat4x4f,
    normal: mat4x4f
};

struct NodeLinkUniforms {
    global: vec4f,
    nodeScaleSource: vec4f,
    nodeScaleDomain: vec4f,
    nodeScaleClamp: vec4f,
    nodeScaleParams: vec4f,
    nodeScaleFlags: vec4f,
    nodeVisual: vec4f,
    edgeScaleSource: vec4f,
    edgeScaleDomain: vec4f,
    edgeScaleClamp: vec4f,
    edgeScaleParams: vec4f,
    edgeScaleFlags: vec4f,
    edgeVisual: vec4f,
    nodeSolid: vec4f,
    edgeSolid: vec4f,
    pointParams: vec4f,
    nodeStops: array<vec4f, 8>,
    edgeStops: array<vec4f, 8>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> nodePositions: array<vec4f>;
@group(1) @binding(3) var<storage, read> nodeRadii: array<vec4f>;
@group(1) @binding(4) var<storage, read> edges: array<vec2u>;
@group(1) @binding(7) var<uniform> nl: NodeLinkUniforms;

struct OcclusionOut {
    @builtin(position) position: vec4f,
    @location(0) pointCoord: vec2f,
    @location(1) @interpolate(flat) isPoint: f32
};

fn buildEdgeFrame(src: vec3f, dst: vec3f) -> mat3x3f {
    let yAxis = normalize(dst - src);
    var fallbackAxis = vec3f(0.0, 0.0, 1.0);
    if (abs(dot(fallbackAxis, yAxis)) > 0.99) {
        fallbackAxis = vec3f(1.0, 0.0, 0.0);
    }
    let xAxis = normalize(cross(fallbackAxis, yAxis));
    let zAxis = normalize(cross(yAxis, xAxis));
    return mat3x3f(xAxis, yAxis, zAxis);
}

@vertex
fn vs_node_points(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> OcclusionOut {
    let p = nodePositions[instanceIndex].xyz;
    let worldPos4 = model.model * vec4f(p, 1.0);
    let clip = camera.viewProj * worldPos4;
    let baseSize = nl.global.x;
    let minSize = nl.pointParams.x;
    let maxSize = nl.pointParams.y;
    let atten = nl.pointParams.z;
    var sizePx = baseSize;
    if (atten > 0.0) {
        let dist = distance(camera.position, worldPos4.xyz);
        sizePx = baseSize * (atten / max(dist, 1e-6));
    }
    sizePx = clamp(sizePx, minSize, maxSize);
    let uv = vec2f(f32((vertexIndex + 2u) / 3u % 2u), f32((vertexIndex + 1u) / 3u % 2u));
    let row0 = vec3f(camera.viewProj[0][0], camera.viewProj[1][0], camera.viewProj[2][0]);
    let row1 = vec3f(camera.viewProj[0][1], camera.viewProj[1][1], camera.viewProj[2][1]);
    let aspect = length(row1) / max(length(row0), 1e-6);
    let ndcSize = (sizePx * 2.0) / max(camera._pad0, 1.0);
    let offsetX = (uv.x - 0.5) * ndcSize / aspect * clip.w;
    let offsetY = -(uv.y - 0.5) * ndcSize * clip.w;
    var out: OcclusionOut;
    out.position = clip + vec4f(offsetX, offsetY, 0.0, 0.0);
    out.pointCoord = uv * 2.0 - vec2f(1.0, 1.0);
    out.isPoint = 1.0;
    return out;
}

@vertex
fn vs_node_solid(@location(0) position: vec3f, @builtin(instance_index) instanceIndex: u32) -> OcclusionOut {
    let center = nodePositions[instanceIndex].xyz;
    let mode = u32(round(nl.nodeVisual.z));
    let useRadii = nl.nodeVisual.w > 0.5;
    var scaleVec = vec3f(max(nl.global.x, 1e-6));
    if (useRadii) {
        let rv = max(nodeRadii[instanceIndex].xyz, vec3f(1e-6));
        if (mode == 2u) {
            scaleVec = rv * max(nl.global.x, 1e-6);
        } else {
            scaleVec = vec3f(rv.x * max(nl.global.x, 1e-6));
        }
    }
    let objPos = center + (position * scaleVec);
    let worldPos4 = model.model * vec4f(objPos, 1.0);
    var out: OcclusionOut;
    out.position = camera.viewProj * worldPos4;
    out.pointCoord = vec2f(0.0, 0.0);
    out.isPoint = 0.0;
    return out;
}

@vertex
fn vs_edge_lines(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> OcclusionOut {
    let edge = edges[instanceIndex];
    let src = nodePositions[edge.x].xyz;
    let dst = nodePositions[edge.y].xyz;
    let objPos = select(src, dst, (vertexIndex & 1u) == 1u);
    let worldPos4 = model.model * vec4f(objPos, 1.0);
    var out: OcclusionOut;
    out.position = camera.viewProj * worldPos4;
    out.pointCoord = vec2f(0.0, 0.0);
    out.isPoint = 0.0;
    return out;
}

@vertex
fn vs_edge_cylinders(@location(0) position: vec3f, @builtin(instance_index) instanceIndex: u32) -> OcclusionOut {
    let edge = edges[instanceIndex];
    let src = nodePositions[edge.x].xyz;
    let dst = nodePositions[edge.y].xyz;
    let seg = dst - src;
    let segLen = max(length(seg), 1e-6);
    let basis = buildEdgeFrame(src, dst);
    let radius = max(nl.global.y, 1e-6);
    let local = vec3f(position.x * radius, position.y * segLen, position.z * radius);
    let objPos = ((src + dst) * 0.5) + (basis * local);
    let worldPos4 = model.model * vec4f(objPos, 1.0);
    var out: OcclusionOut;
    out.position = camera.viewProj * worldPos4;
    out.pointCoord = vec2f(0.0, 0.0);
    out.isPoint = 0.0;
    return out;
}

@fragment
fn fs_main(in: OcclusionOut, @builtin(position) fragCoord: vec4f) -> @location(0) f32 {
    if (in.isPoint > 0.5) {
        let r2 = dot(in.pointCoord, in.pointCoord);
        if (r2 > 1.0) {
            discard;
        }
    }
    return fragCoord.z;
}

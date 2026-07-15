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

struct LatticeUniforms {
    dimensions: vec4f,
    origin: vec4f,
    spacing: vec4f,
    cellScale: vec4f,
    rangeMin: vec4f,
    rangeMax: vec4f,
    dataConfig: vec4f,
    visual: vec4f,
    filters: vec4f,
    solidColor: vec4f,
    scaleSource: vec4f,
    scaleDomain: vec4f,
    scaleClamp: vec4f,
    scaleParams: vec4f,
    scaleFlags: vec4f,
    colors: array<vec4f, 8>
};

struct PickUniforms {
    objectId: u32,
    elementBase: u32,
    _pad0: u32,
    _pad1: u32
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> cellData: array<f32>;
@group(1) @binding(1) var<storage, read> cellMask: array<u32>;
@group(1) @binding(2) var<storage, read> sortedIndices: array<u32>;
@group(1) @binding(3) var<uniform> lattice: LatticeUniforms;
@group(2) @binding(0) var<uniform> pick: PickUniforms;

fn finiteValue(value: f32) -> bool {
    return (bitcast<u32>(value) & 0x7f800000u) != 0x7f800000u;
}

fn component(value: vec4f, index: u32) -> f32 {
    if (index == 0u) {
        return value.x;
    }
    if (index == 1u) {
        return value.y;
    }
    if (index == 2u) {
        return value.z;
    }
    return value.w;
}

fn loadValue(index: u32) -> vec4f {
    let count = u32(lattice.dataConfig.x + 0.5);
    let base = index * count;
    var out = vec4f(0);
    if (count > 0u) {
        out.x = cellData[base];
    }
    if (count > 1u) {
        out.y = cellData[base + 1u];
    }
    if (count > 2u) {
        out.z = cellData[base + 2u];
    }
    if (count > 3u) {
        out.w = cellData[base + 3u];
    }
    return out;
}

fn selectScalar(value: vec4f) -> f32 {
    let count = max(1u, min(4u, u32(lattice.scaleSource.x + 0.5)));
    if (u32(lattice.scaleSource.z + 0.5) == 1u) {
        if (count == 1u) {
            return abs(value.x);
        }
        if (count == 2u) {
            return length(value.xy);
        }
        if (count == 3u) {
            return length(value.xyz);
        }
        return length(value);
    }
    return component(value, min(3u, u32(lattice.scaleSource.y + 0.5)));
}

fn cellVisible(index: u32) -> bool {
    if (lattice.dataConfig.w > 0.5 && cellMask[index] == 0u) {
        return false;
    }
    let mode = u32(lattice.dataConfig.y + 0.5);
    if (mode == 2u) {
        return true;
    }
    let value = loadValue(index);
    if (mode == 0u) {
        let scalar = selectScalar(value);
        if (!finiteValue(scalar)) {
            return false;
        }
        if (lattice.filters.x > 0.5 && (scalar < lattice.visual.z || scalar > lattice.visual.w)) {
            return false;
        }
    } else if (mode == 1u && (!finiteValue(value.x) || !finiteValue(value.y) || !finiteValue(value.z) || !finiteValue(value.w))) {
        return false;
    }
    return true;
}

fn cellToLinear(cell: vec3u) -> u32 {
    let dims = vec3u(lattice.dimensions.xyz);
    return cell.x + dims.x * (cell.y + dims.y * cell.z);
}

fn ordinalToCell(ordinal: u32) -> vec3u {
    let size = vec3u(lattice.rangeMax.xyz - lattice.rangeMin.xyz);
    return vec3u(lattice.rangeMin.xyz) + vec3u(ordinal % size.x, (ordinal / size.x) % size.y, ordinal / max(1u, size.x * size.y));
}

fn cubeVertex(vertexIndex: u32) -> vec3f {
    let face = vertexIndex / 6u;
    let tri = vertexIndex % 6u;
    let uv = array<vec2f, 6>(vec2f(-1, -1), vec2f(-1, 1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1), vec2f(1, -1))[tri] * 0.5;
    if (face == 0u) {
        return vec3f(-0.5, uv.y, -uv.x);
    }
    if (face == 1u) {
        return vec3f(0.5, uv.y, uv.x);
    }
    if (face == 2u) {
        return vec3f(uv.x, -0.5, -uv.y);
    }
    if (face == 3u) {
        return vec3f(uv.x, 0.5, uv.y);
    }
    if (face == 4u) {
        return vec3f(uv.x, uv.y, -0.5);
    }
    return vec3f(-uv.x, uv.y, 0.5);
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) localPosition: vec3f,
    @location(1) @interpolate(flat) cell: vec3u,
    @location(2) @interpolate(flat) cellIndex: u32,
    @location(3) @interpolate(flat) face: u32
};

@vertex
fn vs_2d(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let uv = array<vec2f, 6>(vec2f(0, 0), vec2f(1, 0), vec2f(0, 1), vec2f(0, 1), vec2f(1, 0), vec2f(1, 1))[vertexIndex];
    let firstEdge = lattice.origin.xy + lattice.rangeMin.xy * lattice.spacing.xy - 0.5 * lattice.spacing.xy;
    let lastEdge = lattice.origin.xy + lattice.rangeMax.xy * lattice.spacing.xy - 0.5 * lattice.spacing.xy;
    let local = vec3f(mix(firstEdge, lastEdge, uv), lattice.origin.z);
    var out: VertexOutput;
    out.position = camera.viewProj * model.model * vec4f(local, 1);
    out.localPosition = local;
    out.cell = vec3u(0);
    out.cellIndex = 0u;
    out.face = 5u;
    return out;
}

@vertex
fn vs_3d(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let cell = ordinalToCell(instanceIndex);
    let index = cellToLinear(cell);
    let local = lattice.origin.xyz + vec3f(cell) * lattice.spacing.xyz + cubeVertex(vertexIndex) * lattice.spacing.xyz * lattice.cellScale.xyz;
    var out: VertexOutput;
    out.position = camera.viewProj * model.model * vec4f(local, 1);
    out.localPosition = local;
    out.cell = cell;
    out.cellIndex = index;
    out.face = vertexIndex / 6u;
    return out;
}

fn internalFace(cell: vec3u, face: u32) -> bool {
    if (any(lattice.cellScale.xyz < vec3f(0.999999))) {
        return false;
    }
    var neighbor = vec3i(cell);
    if (face == 0u) {
        neighbor.x -= 1;
    } else if (face == 1u) {
        neighbor.x += 1;
    } else if (face == 2u) {
        neighbor.y -= 1;
    } else if (face == 3u) {
        neighbor.y += 1;
    } else if (face == 4u) {
        neighbor.z -= 1;
    } else {
        neighbor.z += 1;
    }
    if (any(neighbor < vec3i(lattice.rangeMin.xyz)) || any(neighbor >= vec3i(lattice.rangeMax.xyz))) {
        return false;
    }
    return cellVisible(cellToLinear(vec3u(neighbor)));
}

struct FragmentOutput {
    @location(0) id: vec2u,
    @location(1) depth: f32
};

@fragment
fn fs_main(in: VertexOutput) -> FragmentOutput {
    var cell = in.cell;
    var index = in.cellIndex;
    if (u32(lattice.dimensions.w + 0.5) == 2u) {
        let relative = (in.localPosition.xy - (lattice.origin.xy - 0.5 * lattice.spacing.xy)) / lattice.spacing.xy;
        cell = vec3u(vec2u(floor(relative)), 0u);
        index = cellToLinear(cell);
        if (any(cell.xy < vec2u(lattice.rangeMin.xy)) || any(cell.xy >= vec2u(lattice.rangeMax.xy))) {
            discard;
        }
        let center = lattice.origin.xy + vec2f(cell.xy) * lattice.spacing.xy;
        if (any(abs((in.localPosition.xy - center) / lattice.spacing.xy) > 0.5 * lattice.cellScale.xy)) {
            discard;
        }
    } else if (internalFace(cell, in.face)) {
        discard;
    }
    if (!cellVisible(index)) {
        discard;
    }
    var out: FragmentOutput;
    out.id = vec2u(pick.objectId, pick.elementBase + index);
    out.depth = in.position.z;
    return out;
}

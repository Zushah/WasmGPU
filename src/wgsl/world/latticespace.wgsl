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

struct Light {
    position: vec4f,
    color: vec4f,
    params: vec4f
};

struct LightingUniforms {
    ambient: vec4f,
    lightCount: u32,
    _pad0: vec3u,
    lights: array<Light, 8>
};

struct LatticeSpaceUniforms {
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

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;
@group(1) @binding(0) var<storage, read> cellData: array<f32>;
@group(1) @binding(1) var<storage, read> cellMask: array<u32>;
@group(1) @binding(2) var<storage, read> sortedIndices: array<u32>;
@group(1) @binding(3) var<uniform> lattice: LatticeSpaceUniforms;
@group(1) @binding(4) var colormapSampler: sampler;
@group(1) @binding(5) var colormapTexture: texture_1d<f32>;

fn finiteValue(value: f32) -> bool {
    let bits = bitcast<u32>(value);
    return (bits & 0x7f800000u) != 0x7f800000u;
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
    var out = vec4f(0.0);
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

fn cellVisible(index: u32, value: vec4f) -> bool {
    if (lattice.dataConfig.w > 0.5 && cellMask[index] == 0u) {
        return false;
    }
    let mode = u32(lattice.dataConfig.y + 0.5);
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

fn ordinalToCell(ordinal: u32) -> vec3u {
    let size = vec3u(lattice.rangeMax.xyz - lattice.rangeMin.xyz);
    let x = ordinal % size.x;
    let y = (ordinal / size.x) % size.y;
    let z = ordinal / max(1u, size.x * size.y);
    return vec3u(lattice.rangeMin.xyz) + vec3u(x, y, z);
}

fn cellToLinear(cell: vec3u) -> u32 {
    let dims = vec3u(lattice.dimensions.xyz);
    return cell.x + dims.x * (cell.y + dims.y * cell.z);
}

fn linearToCell(index: u32) -> vec3u {
    let dims = vec3u(lattice.dimensions.xyz);
    return vec3u(index % dims.x, (index / dims.x) % dims.y, index / (dims.x * dims.y));
}

fn cubeVertex(vertexIndex: u32) -> vec3f {
    let face = vertexIndex / 6u;
    let tri = vertexIndex % 6u;
    let uv = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(1.0, 1.0), vec2f(1.0, -1.0))[tri] * 0.5;
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

fn faceNormal(face: u32) -> vec3f {
    return array<vec3f, 6>(vec3f(-1, 0, 0), vec3f(1, 0, 0), vec3f(0, -1, 0), vec3f(0, 1, 0), vec3f(0, 0, -1), vec3f(0, 0, 1))[face];
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPosition: vec3f,
    @location(1) normal: vec3f,
    @location(2) localPosition: vec3f,
    @location(3) @interpolate(flat) cellIndex: u32,
    @location(4) @interpolate(flat) cell: vec3u,
    @location(5) @interpolate(flat) face: u32
};

@vertex
fn vs_2d(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let uv = array<vec2f, 6>(vec2f(0, 0), vec2f(1, 0), vec2f(0, 1), vec2f(0, 1), vec2f(1, 0), vec2f(1, 1))[vertexIndex];
    let minCell = lattice.rangeMin.xy;
    let maxCell = lattice.rangeMax.xy;
    let firstEdge = lattice.origin.xy + minCell * lattice.spacing.xy - 0.5 * lattice.spacing.xy;
    let lastEdge = lattice.origin.xy + maxCell * lattice.spacing.xy - 0.5 * lattice.spacing.xy;
    let local = vec3f(firstEdge + uv * (lastEdge - firstEdge), lattice.origin.z);
    let world = model.model * vec4f(local, 1.0);
    var out: VertexOutput;
    out.position = camera.viewProj * world;
    out.worldPosition = world.xyz;
    out.normal = normalize((model.normal * vec4f(0, 0, 1, 0)).xyz);
    out.localPosition = local;
    out.cellIndex = 0u;
    out.cell = vec3u(0u);
    out.face = 5u;
    return out;
}

@vertex
fn vs_3d(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let useSorted = lattice.filters.z > 0.5;
    let index = select(cellToLinear(ordinalToCell(instanceIndex)), sortedIndices[instanceIndex], useSorted);
    let cell = linearToCell(index);
    let face = vertexIndex / 6u;
    let local = lattice.origin.xyz + vec3f(cell) * lattice.spacing.xyz + cubeVertex(vertexIndex) * lattice.spacing.xyz * lattice.cellScale.xyz;
    let world = model.model * vec4f(local, 1.0);
    var out: VertexOutput;
    out.position = camera.viewProj * world;
    out.worldPosition = world.xyz;
    out.normal = normalize((model.normal * vec4f(faceNormal(face), 0.0)).xyz);
    out.localPosition = local;
    out.cellIndex = index;
    out.cell = cell;
    out.face = face;
    return out;
}

fn resolveFragmentCell(in: VertexOutput) -> vec4u {
    if (u32(lattice.dimensions.w + 0.5) == 3u) { return vec4u(in.cell, in.cellIndex); }
    let relative = (in.localPosition.xy - (lattice.origin.xy - 0.5 * lattice.spacing.xy)) / lattice.spacing.xy;
    let cell = vec2u(floor(relative));
    return vec4u(cell, 0u, cell.x + u32(lattice.dimensions.x) * cell.y);
}

fn internalFace(cell: vec3u, face: u32) -> bool {
    if (any(lattice.cellScale.xyz < vec3f(0.999999))) {
        return false;
    }
    let dims = vec3u(lattice.dimensions.xyz);
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
    if (any(neighbor < vec3i(0)) || any(neighbor >= vec3i(dims))) {
        return false;
    }
    if (any(neighbor < vec3i(lattice.rangeMin.xyz)) || any(neighbor >= vec3i(lattice.rangeMax.xyz))) {
        return false;
    }
    let index = cellToLinear(vec3u(neighbor));
    var value = vec4f(0);
    if (u32(lattice.dataConfig.y + 0.5) != 2u) {
        value = loadValue(index);
    }
    return cellVisible(index, value);
}

fn scaleMode(value: f32, mode: u32) -> f32 {
    if (mode == 0u) {
        return value;
    }
    if (mode == 1u) {
        return log(max(value, 1e-20)) / log(max(lattice.scaleParams.y, 1.000001));
    }
    let threshold = max(lattice.scaleParams.z, 1e-20);
    return sign(value) * log(1.0 + abs(value) / threshold) / log(max(lattice.scaleParams.y, 1.000001));
}

fn scaleValue(value: f32) -> f32 {
    var v = value;
    if (u32(lattice.scaleDomain.w + 0.5) != 0u && lattice.scaleClamp.y > lattice.scaleClamp.x) {
        v = clamp(v, lattice.scaleClamp.x, lattice.scaleClamp.y);
    }
    var domainMin = lattice.scaleDomain.x;
    var domainMax = lattice.scaleDomain.y;
    if (domainMax <= domainMin && lattice.scaleClamp.y > lattice.scaleClamp.x) {
        domainMin = lattice.scaleClamp.x;
        domainMax = lattice.scaleClamp.y;
    }
    let mode = u32(lattice.scaleParams.x + 0.5);
    let a = scaleMode(domainMin, mode);
    let b = scaleMode(domainMax, mode);
    let x = scaleMode(v, mode);
    var t = clamp((x - a) / max(1e-20, b - a), 0.0, 1.0);
    t = pow(t, max(lattice.scaleParams.w, 1e-6));
    return select(t, 1.0 - t, lattice.scaleFlags.x > 0.5);
}

fn mapColor(t: f32) -> vec4f {
    let count = u32(lattice.filters.y + 0.5);
    if (count < 2u) {
        return textureSample(colormapTexture, colormapSampler, clamp(t, 0.0, 1.0));
    }
    let x = clamp(t, 0.0, 1.0) * f32(count - 1u);
    let index = min(u32(floor(x)), count - 1u);
    let next = min(index + 1u, count - 1u);
    return mix(lattice.colors[index], lattice.colors[next], x - f32(index));
}

fn linearFromSrgb(value: vec3f) -> vec3f {
    return select(value / 12.92, pow((value + vec3f(0.055)) / 1.055, vec3f(2.4)), value > vec3f(0.04045));
}

fn srgbFromLinear(value: vec3f) -> vec3f {
    return select(12.92 * value, 1.055 * pow(value, vec3f(1.0 / 2.4)) - vec3f(0.055), value > vec3f(0.0031308));
}

fn applyLighting(position: vec3f, normal: vec3f, color: vec3f) -> vec3f {
    var result = lighting.ambient.rgb * color;
    for (var i = 0u; i < min(lighting.lightCount, 8u); i++) {
        let light = lighting.lights[i];
        var direction: vec3f;
        var attenuation = 1.0;
        if (light.position.w == 0.0) {
            direction = normalize(-light.position.xyz);
        } else {
            let delta = light.position.xyz - position;
            let distance = length(delta);
            direction = select(vec3f(0, 1, 0), delta / distance, distance > 1e-6);
            attenuation = 1.0 / max(distance * distance, 1e-6);
        }
        result += color * light.color.rgb * light.color.a * attenuation * max(dot(normal, direction), 0.0);
    }
    return result;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let resolved = resolveFragmentCell(in);
    let cell = resolved.xyz;
    let index = resolved.w;
    if (u32(lattice.dimensions.w + 0.5) == 2u) {
        if (any(cell.xy < vec2u(lattice.rangeMin.xy)) || any(cell.xy >= vec2u(lattice.rangeMax.xy))) {
            discard;
        }
        let center = lattice.origin.xy + vec2f(cell.xy) * lattice.spacing.xy;
        let normalized = abs((in.localPosition.xy - center) / lattice.spacing.xy);
        if (any(normalized > 0.5 * lattice.cellScale.xy)) {
            discard;
        }
    } else if (internalFace(cell, in.face)) {
        discard;
    }
    let mode = u32(lattice.dataConfig.y + 0.5);
    var value = vec4f(0);
    if (mode != 2u) {
        value = loadValue(index);
    }
    if (!cellVisible(index, value)) {
        discard;
    }
    var color: vec4f;
    if (mode == 0u) {
        color = mapColor(scaleValue(selectScalar(value)));
    } else if (mode == 1u) {
        color = value;
        if (lattice.dataConfig.z > 0.5) {
            color = vec4f(linearFromSrgb(color.rgb), color.a);
        }
    } else {
        color = lattice.solidColor;
    }
    var rgb = max(color.rgb, vec3f(0));
    if (lattice.visual.y > 0.5) {
        rgb = applyLighting(in.worldPosition, normalize(in.normal), rgb);
    }
    return vec4f(srgbFromLinear(rgb), clamp(color.a, 0.0, 1.0) * clamp(lattice.visual.x, 0.0, 1.0));
}

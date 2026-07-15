/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct SortTransform {
    mvp: mat4x4f
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

@group(0) @binding(0) var<uniform> lattice: LatticeUniforms;
@group(0) @binding(1) var<uniform> sortTransform: SortTransform;
@group(0) @binding(2) var<storage, read_write> keysOut: array<u32>;
@group(0) @binding(3) var<storage, read_write> indicesOut: array<u32>;

fn ordinalToCell(ordinal: u32) -> vec3<u32> {
    let size = vec3u(lattice.rangeMax.xyz - lattice.rangeMin.xyz);
    return vec3u(lattice.rangeMin.xyz) + vec3u(ordinal % size.x, (ordinal / size.x) % size.y, ordinal / max(1u, size.x * size.y));
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let ordinal = gid.x;
    if (ordinal >= arrayLength(&keysOut)) {
        return;
    }
    let cell = ordinalToCell(ordinal);
    let dims = vec3<u32>(lattice.dimensions.xyz);
    let index = cell.x + dims.x * (cell.y + dims.y * cell.z);
    let center = lattice.origin.xyz + vec3f(cell) * lattice.spacing.xyz;
    let clip = sortTransform.mvp * vec4f(center, 1.0);
    if (clip.w <= 1e-6 || clip.z < -1e-6 || clip.z > clip.w + 1e-6) {
        keysOut[ordinal] = 0xffffffffu;
        indicesOut[ordinal] = index;
        return;
    }
    let depth = clamp(clip.z / max(clip.w, 1e-6), 0.0, 1.0);
    keysOut[ordinal] = u32(round((1.0 - depth) * 4294967040.0));
    indicesOut[ordinal] = index;
}

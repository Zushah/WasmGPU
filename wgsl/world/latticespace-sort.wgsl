/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct SortTransform {
    mvp: mat4x4<f32>,
}

struct LatticeUniforms {
    dimensions: vec4<f32>,
    origin: vec4<f32>,
    spacing: vec4<f32>,
    cell_scale: vec4<f32>,
    range_min: vec4<f32>,
    range_max: vec4<f32>,
    data_config: vec4<f32>,
    visual: vec4<f32>,
    filters: vec4<f32>,
    solid_color: vec4<f32>,
    scale_source: vec4<f32>,
    scale_domain: vec4<f32>,
    scale_clamp: vec4<f32>,
    scale_params: vec4<f32>,
    scale_flags: vec4<f32>,
    colors: array<vec4<f32>, 8>,
}

@group(0) @binding(0) var<uniform> lattice: LatticeUniforms;
@group(0) @binding(1) var<uniform> sort_transform: SortTransform;
@group(0) @binding(2) var<storage, read_write> keys_out: array<u32>;
@group(0) @binding(3) var<storage, read_write> indices_out: array<u32>;

fn ordinal_to_cell(ordinal: u32) -> vec3<u32> {
    let size = vec3<u32>(lattice.range_max.xyz - lattice.range_min.xyz);
    return vec3<u32>(lattice.range_min.xyz)
        + vec3<u32>(
            ordinal % size.x,
            (ordinal / size.x) % size.y,
            ordinal / max(1u, size.x * size.y),
        );
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let ordinal = gid.x;
    if (ordinal >= arrayLength(&keys_out)) {
        return;
    }
    let cell = ordinal_to_cell(ordinal);
    let dims = vec3<u32>(lattice.dimensions.xyz);
    let index = cell.x + dims.x * (cell.y + dims.y * cell.z);
    let center = lattice.origin.xyz + vec3<f32>(cell) * lattice.spacing.xyz;
    let clip = sort_transform.mvp * vec4<f32>(center, 1.0);
    if (clip.w <= 1e-6 || clip.z < -1e-6 || clip.z > clip.w + 1e-6) {
        keys_out[ordinal] = 0xffffffffu;
        indices_out[ordinal] = index;
        return;
    }
    let depth = clamp(clip.z / max(clip.w, 1e-6), 0.0, 1.0);
    keys_out[ordinal] = u32(round((1.0 - depth) * 4294967040.0));
    indices_out[ordinal] = index;
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct CameraUniforms {
    view_proj: mat4x4<f32>,
    position: vec3<f32>,
    viewport_height: f32,
}

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>,
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

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) local_position: vec3<f32>,
    @location(1) @interpolate(flat) cell: vec3<u32>,
    @location(2) @interpolate(flat) cell_index: u32,
    @location(3) @interpolate(flat) face: u32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<storage, read> cell_data: array<f32>;
@group(1) @binding(1) var<storage, read> cell_mask: array<u32>;
@group(1) @binding(2) var<storage, read> sorted_indices: array<u32>;
@group(1) @binding(3) var<uniform> lattice: LatticeUniforms;

fn finite_value(value: f32) -> bool {
    return (bitcast<u32>(value) & 0x7f800000u) != 0x7f800000u;
}

fn component(value: vec4<f32>, index: u32) -> f32 {
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

fn cell_to_linear(cell: vec3<u32>) -> u32 {
    let dims = vec3<u32>(lattice.dimensions.xyz);
    return cell.x + dims.x * (cell.y + dims.y * cell.z);
}

fn select_scalar(value: vec4<f32>) -> f32 {
    let count = max(1u, min(4u, u32(lattice.scale_source.x + 0.5)));
    if (u32(lattice.scale_source.z + 0.5) == 1u) {
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
    return component(value, min(3u, u32(lattice.scale_source.y + 0.5)));
}

fn cell_visible(index: u32) -> bool {
    if (lattice.data_config.w > 0.5 && cell_mask[index] == 0u) {
        return false;
    }
    let mode = u32(lattice.data_config.y + 0.5);
    if (mode == 2u) {
        return true;
    }
    let count = u32(lattice.data_config.x + 0.5);
    let base = index * count;
    var value = vec4<f32>(0);
    if (count > 0u) {
        value.x = cell_data[base];
    }
    if (count > 1u) {
        value.y = cell_data[base + 1u];
    }
    if (count > 2u) {
        value.z = cell_data[base + 2u];
    }
    if (count > 3u) {
        value.w = cell_data[base + 3u];
    }
    if (mode == 1u) {
        return finite_value(value.x)
                && finite_value(value.y)
                && finite_value(value.z)
                && finite_value(value.w);
    }
    let scalar = select_scalar(value);
    if (!finite_value(scalar)) {
        return false;
    }
    return lattice.filters.x < 0.5 || (scalar >= lattice.visual.z && scalar <= lattice.visual.w);
}

fn ordinal_to_cell(ordinal: u32) -> vec3<u32> {
    let size = vec3<u32>(lattice.range_max.xyz - lattice.range_min.xyz);
    return vec3<u32>(lattice.range_min.xyz)
        + vec3<u32>(
            ordinal % size.x,
            (ordinal / size.x) % size.y,
            ordinal / max(1u, size.x * size.y),
        );
}

fn cube_vertex(vertex_index: u32) -> vec3<f32> {
    let face = vertex_index / 6u;
    let uv = array<vec2<f32>, 6>(
            vec2<f32>(-1, -1),
            vec2<f32>(-1, 1),
            vec2<f32>(1, -1),
            vec2<f32>(-1, 1),
            vec2<f32>(1, 1),
            vec2<f32>(1, -1),
        )[vertex_index % 6u]
            * 0.5;
    if (face == 0u) {
        return vec3<f32>(-0.5, uv.y, -uv.x);
    }
    if (face == 1u) {
        return vec3<f32>(0.5, uv.y, uv.x);
    }
    if (face == 2u) {
        return vec3<f32>(uv.x, -0.5, -uv.y);
    }
    if (face == 3u) {
        return vec3<f32>(uv.x, 0.5, uv.y);
    }
    if (face == 4u) {
        return vec3<f32>(uv.x, uv.y, -0.5);
    }
    return vec3<f32>(-uv.x, uv.y, 0.5);
}

fn internal_face(cell: vec3<u32>, face: u32) -> bool {
    if (any(lattice.cell_scale.xyz < vec3<f32>(0.999999))) {
        return false;
    }
    let dims = vec3<u32>(lattice.dimensions.xyz);
    var neighbor = vec3<i32>(cell);
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
    if (any(neighbor < vec3<i32>(0)) || any(neighbor >= vec3<i32>(dims))) {
        return false;
    }
    if (
        any(neighbor < vec3<i32>(lattice.range_min.xyz))
            || any(neighbor >= vec3<i32>(lattice.range_max.xyz))
    ) {
        return false;
    }
    return cell_visible(cell_to_linear(vec3<u32>(neighbor)));
}

@vertex
fn vs_2d(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    let uv = array<vec2<f32>, 6>(
        vec2<f32>(0, 0),
        vec2<f32>(1, 0),
        vec2<f32>(0, 1),
        vec2<f32>(0, 1),
        vec2<f32>(1, 0),
        vec2<f32>(1, 1),
    )[vertex_index];
    let first =
        lattice.origin.xy + lattice.range_min.xy * lattice.spacing.xy - 0.5 * lattice.spacing.xy;
    let last =
        lattice.origin.xy + lattice.range_max.xy * lattice.spacing.xy - 0.5 * lattice.spacing.xy;
    let local = vec3<f32>(mix(first, last, uv), lattice.origin.z);
    var out: VertexOutput;
    out.position = camera.view_proj * model.model * vec4<f32>(local, 1);
    out.local_position = local;
    out.cell = vec3<u32>(0);
    out.cell_index = 0u;
    out.face = 5u;
    return out;
}

@vertex
fn vs_3d(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
    let cell = ordinal_to_cell(instance_index);
    let local = lattice.origin.xyz
            + vec3<f32>(cell) * lattice.spacing.xyz
            + cube_vertex(vertex_index) * lattice.spacing.xyz * lattice.cell_scale.xyz;
    var out: VertexOutput;
    out.position = camera.view_proj * model.model * vec4<f32>(local, 1);
    out.local_position = local;
    out.cell = cell;
    out.cell_index = cell_to_linear(cell);
    out.face = vertex_index / 6u;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) f32 {
    var cell = in.cell;
    var index = in.cell_index;
    if (u32(lattice.dimensions.w + 0.5) == 2u) {
        let relative = (in.local_position.xy - (lattice.origin.xy - 0.5 * lattice.spacing.xy))
                / lattice.spacing.xy;
        cell = vec3<u32>(vec2<u32>(floor(relative)), 0u);
        if (
            any(cell.xy < vec2<u32>(lattice.range_min.xy))
                || any(cell.xy >= vec2<u32>(lattice.range_max.xy))
        ) {
            discard;
        }
        index = cell_to_linear(cell);
        let center = lattice.origin.xy + vec2<f32>(cell.xy) * lattice.spacing.xy;
        if (
            any(
                abs((in.local_position.xy - center) / lattice.spacing.xy)
                    > 0.5 * lattice.cell_scale.xy,
            )
        ) {
            discard;
        }
    } else if (internal_face(cell, in.face)) {
        discard;
    }
    if (!cell_visible(index)) {
        discard;
    }
    return in.position.z;
}

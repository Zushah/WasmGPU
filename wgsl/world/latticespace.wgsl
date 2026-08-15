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

struct Light {
    position: vec4<f32>,
    color: vec4<f32>,
    params: vec4<f32>,
}

struct LightingUniforms {
    ambient: vec4<f32>,
    light_count: u32,
    _pad0: vec3<u32>,
    lights: array<Light, 8>,
}

struct LatticeSpaceUniforms {
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
    @location(0) world_position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) local_position: vec3<f32>,
    @location(3) @interpolate(flat) cell_index: u32,
    @location(4) @interpolate(flat) cell: vec3<u32>,
    @location(5) @interpolate(flat) face: u32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;
@group(1) @binding(0) var<storage, read> cell_data: array<f32>;
@group(1) @binding(1) var<storage, read> cell_mask: array<u32>;
@group(1) @binding(2) var<storage, read> sorted_indices: array<u32>;
@group(1) @binding(3) var<uniform> lattice: LatticeSpaceUniforms;
@group(1) @binding(4) var colormap_sampler: sampler;
@group(1) @binding(5) var colormap_texture: texture_1d<f32>;

fn finite_value(value: f32) -> bool {
    let bits = bitcast<u32>(value);
    return (bits & 0x7f800000u) != 0x7f800000u;
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

fn load_value(index: u32) -> vec4<f32> {
    let count = u32(lattice.data_config.x + 0.5);
    let base = index * count;
    var out = vec4<f32>(0.0);
    if (count > 0u) {
        out.x = cell_data[base];
    }
    if (count > 1u) {
        out.y = cell_data[base + 1u];
    }
    if (count > 2u) {
        out.z = cell_data[base + 2u];
    }
    if (count > 3u) {
        out.w = cell_data[base + 3u];
    }
    return out;
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

fn cell_visible(index: u32, value: vec4<f32>) -> bool {
    if (lattice.data_config.w > 0.5 && cell_mask[index] == 0u) {
        return false;
    }
    let mode = u32(lattice.data_config.y + 0.5);
    if (mode == 0u) {
        let scalar = select_scalar(value);
        if (!finite_value(scalar)) {
            return false;
        }
        if (lattice.filters.x > 0.5 && (scalar < lattice.visual.z || scalar > lattice.visual.w)) {
            return false;
        }
    } else if (
        mode == 1u
            && (
                !finite_value(value.x)
                    || !finite_value(value.y)
                    || !finite_value(value.z)
                    || !finite_value(value.w)
            )
    ) {
        return false;
    }
    return true;
}

fn ordinal_to_cell(ordinal: u32) -> vec3<u32> {
    let size = vec3<u32>(lattice.range_max.xyz - lattice.range_min.xyz);
    let x = ordinal % size.x;
    let y = (ordinal / size.x) % size.y;
    let z = ordinal / max(1u, size.x * size.y);
    return vec3<u32>(lattice.range_min.xyz) + vec3<u32>(x, y, z);
}

fn cell_to_linear(cell: vec3<u32>) -> u32 {
    let dims = vec3<u32>(lattice.dimensions.xyz);
    return cell.x + dims.x * (cell.y + dims.y * cell.z);
}

fn linear_to_cell(index: u32) -> vec3<u32> {
    let dims = vec3<u32>(lattice.dimensions.xyz);
    return vec3<u32>(index % dims.x, (index / dims.x) % dims.y, index / (dims.x * dims.y));
}

fn cube_vertex(vertex_index: u32) -> vec3<f32> {
    let face = vertex_index / 6u;
    let tri = vertex_index % 6u;
    let uv = array<vec2<f32>, 6>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>(1.0, -1.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>(1.0, 1.0),
            vec2<f32>(1.0, -1.0),
        )[tri]
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

fn face_normal(face: u32) -> vec3<f32> {
    return array<vec3<f32>, 6>(
        vec3<f32>(-1, 0, 0),
        vec3<f32>(1, 0, 0),
        vec3<f32>(0, -1, 0),
        vec3<f32>(0, 1, 0),
        vec3<f32>(0, 0, -1),
        vec3<f32>(0, 0, 1),
    )[face];
}

fn resolve_fragment_cell(in: VertexOutput) -> vec4<u32> {
    if (u32(lattice.dimensions.w + 0.5) == 3u) {
        return vec4<u32>(in.cell, in.cell_index);
    }
    let relative = (in.local_position.xy - (lattice.origin.xy - 0.5 * lattice.spacing.xy))
            / lattice.spacing.xy;
    let cell = vec2<u32>(floor(relative));
    return vec4<u32>(cell, 0u, cell.x + u32(lattice.dimensions.x) * cell.y);
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
    let index = cell_to_linear(vec3<u32>(neighbor));
    var value = vec4<f32>(0);
    if (u32(lattice.data_config.y + 0.5) != 2u) {
        value = load_value(index);
    }
    return cell_visible(index, value);
}

fn scale_mode(value: f32, mode: u32) -> f32 {
    if (mode == 0u) {
        return value;
    }
    if (mode == 1u) {
        return log(max(value, 1e-20)) / log(max(lattice.scale_params.y, 1.000001));
    }
    let threshold = max(lattice.scale_params.z, 1e-20);
    return sign(value)
            * log(1.0 + abs(value) / threshold)
            / log(max(lattice.scale_params.y, 1.000001));
}

fn scale_value(value: f32) -> f32 {
    var v = value;
    if (u32(lattice.scale_domain.w + 0.5) != 0u && lattice.scale_clamp.y > lattice.scale_clamp.x) {
        v = clamp(v, lattice.scale_clamp.x, lattice.scale_clamp.y);
    }
    var domain_min = lattice.scale_domain.x;
    var domain_max = lattice.scale_domain.y;
    if (domain_max <= domain_min && lattice.scale_clamp.y > lattice.scale_clamp.x) {
        domain_min = lattice.scale_clamp.x;
        domain_max = lattice.scale_clamp.y;
    }
    let mode = u32(lattice.scale_params.x + 0.5);
    let a = scale_mode(domain_min, mode);
    let b = scale_mode(domain_max, mode);
    let x = scale_mode(v, mode);
    var t = clamp((x - a) / max(1e-20, b - a), 0.0, 1.0);
    t = pow(t, max(lattice.scale_params.w, 1e-6));
    return select(t, 1.0 - t, lattice.scale_flags.x > 0.5);
}

fn map_color(t: f32) -> vec4<f32> {
    let count = u32(lattice.filters.y + 0.5);
    if (count < 2u) {
        return textureSample(colormap_texture, colormap_sampler, clamp(t, 0.0, 1.0));
    }
    let x = clamp(t, 0.0, 1.0) * f32(count - 1u);
    let index = min(u32(floor(x)), count - 1u);
    let next = min(index + 1u, count - 1u);
    return mix(lattice.colors[index], lattice.colors[next], x - f32(index));
}

fn linear_from_srgb(value: vec3<f32>) -> vec3<f32> {
    return select(
        value / 12.92,
        pow((value + vec3<f32>(0.055)) / 1.055, vec3<f32>(2.4)),
        value > vec3<f32>(0.04045),
    );
}

fn srgb_from_linear(value: vec3<f32>) -> vec3<f32> {
    return select(
        12.92 * value,
        1.055 * pow(value, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055),
        value > vec3<f32>(0.0031308),
    );
}

fn apply_lighting(position: vec3<f32>, normal: vec3<f32>, color: vec3<f32>) -> vec3<f32> {
    var result = lighting.ambient.rgb * color;
    for (var i = 0u; i < min(lighting.light_count, 8u); i++) {
        let light = lighting.lights[i];
        var direction: vec3<f32>;
        var attenuation = 1.0;
        if (light.position.w == 0.0) {
            direction = normalize(-light.position.xyz);
        } else {
            let delta = light.position.xyz - position;
            let distance = length(delta);
            direction = select(vec3<f32>(0, 1, 0), delta / distance, distance > 1e-6);
            attenuation = 1.0 / max(distance * distance, 1e-6);
        }
        result += color
            * light.color.rgb
            * light.color.a
            * attenuation
            * max(dot(normal, direction), 0.0);
    }
    return result;
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
    let min_cell = lattice.range_min.xy;
    let max_cell = lattice.range_max.xy;
    let first_edge = lattice.origin.xy + min_cell * lattice.spacing.xy - 0.5 * lattice.spacing.xy;
    let last_edge = lattice.origin.xy + max_cell * lattice.spacing.xy - 0.5 * lattice.spacing.xy;
    let local = vec3<f32>(first_edge + uv * (last_edge - first_edge), lattice.origin.z);
    let world = model.model * vec4<f32>(local, 1.0);
    var out: VertexOutput;
    out.position = camera.view_proj * world;
    out.world_position = world.xyz;
    out.normal = normalize((model.normal * vec4<f32>(0, 0, 1, 0)).xyz);
    out.local_position = local;
    out.cell_index = 0u;
    out.cell = vec3<u32>(0u);
    out.face = 5u;
    return out;
}

@vertex
fn vs_3d(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
    let use_sorted = lattice.filters.z > 0.5;
    let index = select(
        cell_to_linear(ordinal_to_cell(instance_index)),
        sorted_indices[instance_index],
        use_sorted,
    );
    let cell = linear_to_cell(index);
    let face = vertex_index / 6u;
    let local = lattice.origin.xyz
            + vec3<f32>(cell) * lattice.spacing.xyz
            + cube_vertex(vertex_index) * lattice.spacing.xyz * lattice.cell_scale.xyz;
    let world = model.model * vec4<f32>(local, 1.0);
    var out: VertexOutput;
    out.position = camera.view_proj * world;
    out.world_position = world.xyz;
    out.normal = normalize((model.normal * vec4<f32>(face_normal(face), 0.0)).xyz);
    out.local_position = local;
    out.cell_index = index;
    out.cell = cell;
    out.face = face;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let resolved = resolve_fragment_cell(in);
    let cell = resolved.xyz;
    let index = resolved.w;
    if (u32(lattice.dimensions.w + 0.5) == 2u) {
        if (
            any(cell.xy < vec2<u32>(lattice.range_min.xy))
                || any(cell.xy >= vec2<u32>(lattice.range_max.xy))
        ) {
            discard;
        }
        let center = lattice.origin.xy + vec2<f32>(cell.xy) * lattice.spacing.xy;
        let normalized = abs((in.local_position.xy - center) / lattice.spacing.xy);
        if (any(normalized > 0.5 * lattice.cell_scale.xy)) {
            discard;
        }
    } else if (internal_face(cell, in.face)) {
        discard;
    }
    let mode = u32(lattice.data_config.y + 0.5);
    var value = vec4<f32>(0);
    if (mode != 2u) {
        value = load_value(index);
    }
    if (!cell_visible(index, value)) {
        discard;
    }
    var color: vec4<f32>;
    if (mode == 0u) {
        color = map_color(scale_value(select_scalar(value)));
    } else if (mode == 1u) {
        color = value;
        if (lattice.data_config.z > 0.5) {
            color = vec4<f32>(linear_from_srgb(color.rgb), color.a);
        }
    } else {
        color = lattice.solid_color;
    }
    var rgb = max(color.rgb, vec3<f32>(0));
    if (lattice.visual.y > 0.5) {
        rgb = apply_lighting(in.world_position, normalize(in.normal), rgb);
    }
    return vec4<f32>(
        srgb_from_linear(rgb),
        clamp(color.a, 0.0, 1.0) * clamp(lattice.visual.x, 0.0, 1.0),
    );
}

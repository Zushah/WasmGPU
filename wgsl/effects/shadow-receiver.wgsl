/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct ShadowMetadata {
    view_projection: mat4x4<f32>,
    params: vec4<f32>,
}

struct ShadowUniforms {
    views: array<ShadowMetadata, 8>,
}

@group(2) @binding(0) var shadow_maps: texture_depth_2d_array;
@group(2) @binding(1) var shadow_sampler: sampler_comparison;
@group(2) @binding(2) var<uniform> shadows: ShadowUniforms;

fn shadow_visibility(
    light_index: u32,
    world_position: vec3<f32>,
    geometric_normal: vec3<f32>,
    light_direction: vec3<f32>,
    world_position_dx: vec3<f32>,
    world_position_dy: vec3<f32>,
) -> f32 {
    let metadata = shadows.views[light_index];
    if (metadata.params.x < 0.0) {
        return 1.0;
    }
    let normalized_normal = normalize(geometric_normal);
    let normalized_light = normalize(light_direction);
    let offset_normal = select(
        -normalized_normal,
        normalized_normal,
        dot(normalized_normal, normalized_light) >= 0.0
    );
    let shadow_position = metadata.view_projection
        * vec4<f32>(world_position + offset_normal * metadata.params.z, 1.0);
    let projected = shadow_position.xyz / shadow_position.w;
    let uv = vec2<f32>(projected.x * 0.5 + 0.5, 0.5 - projected.y * 0.5);
    if (projected.z < 0.0
        || projected.z > 1.0
        || any(uv < vec2<f32>(0.0))
        || any(uv > vec2<f32>(1.0))
    ) {
        return 1.0;
    }
    let angle = 1.0 - clamp(abs(dot(normalized_normal, normalized_light)), 0.0, 1.0);
    let reference_depth = projected.z - metadata.params.y * (1.0 + angle * 2.0);
    let layer = i32(metadata.params.x);
    if (metadata.params.w < 0.5) {
        return textureSampleCompareLevel(shadow_maps, shadow_sampler, uv, layer, reference_depth);
    }
    let dimensions = vec2<f32>(textureDimensions(shadow_maps));
    let texel = 1.0 / dimensions;
    let shadow_dx = metadata.view_projection * vec4<f32>(world_position_dx, 0.0);
    let shadow_dy = metadata.view_projection * vec4<f32>(world_position_dy, 0.0);
    let uv_dx = vec2<f32>(shadow_dx.x * 0.5, shadow_dx.y * -0.5);
    let uv_dy = vec2<f32>(shadow_dy.x * 0.5, shadow_dy.y * -0.5);
    let depth_dx = shadow_dx.z;
    let depth_dy = shadow_dy.z;
    let determinant = uv_dx.x * uv_dy.y - uv_dx.y * uv_dy.x;
    var depth_gradient = vec2<f32>(0.0);
    if (abs(determinant) > 1e-8) {
        depth_gradient = vec2<f32>(
            (depth_dx * uv_dy.y - depth_dy * uv_dx.y) / determinant,
            (uv_dx.x * depth_dy - uv_dy.x * depth_dx) / determinant
        );
    }
    var visibility = 0.0;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let offset = vec2<f32>(f32(x), f32(y)) * texel;
            visibility += textureSampleCompareLevel(
                shadow_maps,
                shadow_sampler,
                uv + offset,
                layer,
                reference_depth + dot(depth_gradient, offset)
            );
        }
    }
    return visibility / 9.0;
}

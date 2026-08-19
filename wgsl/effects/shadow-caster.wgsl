/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct ShadowView {
    view_projection: mat4x4<f32>,
}

struct ShadowModel {
    model: mat4x4<f32>,
}

struct VertexInput {
    @location(0) position: vec3<f32>,
}

@group(0) @binding(0) var<uniform> shadow_view: ShadowView;
@group(1) @binding(0) var<uniform> shadow_model: ShadowModel;

@vertex
fn vs_main(in: VertexInput) -> @builtin(position) vec4<f32> {
    return shadow_view.view_projection * shadow_model.model * vec4<f32>(in.position, 1.0);
}

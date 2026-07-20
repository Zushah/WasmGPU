/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct SortTransform {
    mvp: mat4x4<f32>,
}

@group(0) @binding(0) var<storage, read> center_opacity: array<vec4<f32>>;
@group(0) @binding(1) var<uniform> sort_transform: SortTransform;
@group(0) @binding(2) var<storage, read_write> keys_out: array<u32>;
@group(0) @binding(3) var<storage, read_write> indices_out: array<u32>;

fn safe_clip_w(w: f32) -> f32 {
    return select(1e-6, w, abs(w) > 1e-6);
}

fn splat_center_renderable(clip: vec4<f32>) -> bool {
    let eps = 1e-6;
    return (clip.w > eps) && (clip.z >= -eps) && (clip.z <= clip.w + eps);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&center_opacity);
    if (i >= n) {
        return;
    }
    let clip = sort_transform.mvp * vec4<f32>(center_opacity[i].xyz, 1.0);
    if (!splat_center_renderable(clip)) {
        keys_out[i] = 0xffffffffu;
        indices_out[i] = i;
        return;
    }
    let depth = clamp(clip.z / safe_clip_w(clip.w), 0.0, 1.0);
    let far_to_near = 1.0 - depth;
    keys_out[i] = u32(round(far_to_near * 4294967040.0));
    indices_out[i] = i;
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct SortTransform {
    mvp: mat4x4f
};

@group(0) @binding(0) var<storage, read> centerOpacity: array<vec4f>;
@group(0) @binding(1) var<uniform> sortTransform: SortTransform;
@group(0) @binding(2) var<storage, read_write> keysOut: array<u32>;
@group(0) @binding(3) var<storage, read_write> indicesOut: array<u32>;

fn safeClipW(w: f32) -> f32 {
    return select(1e-6, w, abs(w) > 1e-6);
}

fn splatCenterRenderable(clip: vec4f) -> bool {
    let eps = 1e-6;
    return (clip.w > eps) && (clip.z >= -eps) && (clip.z <= clip.w + eps);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&centerOpacity);
    if (i >= n) {
        return;
    }
    let clip = sortTransform.mvp * vec4f(centerOpacity[i].xyz, 1.0);
    if (!splatCenterRenderable(clip)) {
        keysOut[i] = 0xffffffffu;
        indicesOut[i] = i;
        return;
    }
    let depth = clamp(clip.z / safeClipW(clip.w), 0.0, 1.0);
    let farToNear = 1.0 - depth;
    keysOut[i] = u32(round(farToNear * 4294967040.0));
    indicesOut[i] = i;
}

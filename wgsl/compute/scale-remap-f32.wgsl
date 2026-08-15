/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct Params {
    count: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    domain: vec4<f32>,
    clamp_config: vec4<f32>,
    scale_params: vec4<f32>,
    scale_flags: vec4<f32>,
}

@group(0) @binding(0) var<storage, read> values: array<f32>;
@group(0) @binding(1) var<storage, read_write> out_values: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn scale_is_nan(v: f32) -> bool {
    let u = bitcast<u32>(v);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u;
}

fn scale_is_inf(v: f32) -> bool {
    let u = bitcast<u32>(v);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) == 0u;
}

fn scale_is_finite(v: f32) -> bool {
    return !scale_is_nan(v) && !scale_is_inf(v);
}

fn scale_clamp01(x: f32) -> f32 {
    return clamp(x, 0.0, 1.0);
}

fn scale_log_base(x: f32, base: f32) -> f32 {
    let b = max(base, 1.000001);
    return log(x) / log(b);
}

fn scale_apply_mode(x: f32, mode_id: u32, linthresh: f32, base: f32) -> f32 {
    if (mode_id == 0u) {
        return x;
    }
    if (mode_id == 1u) {
        return scale_log_base(max(x, 1e-20), base);
    }
    let lt = max(linthresh, 1e-20);
    let s = select(-1.0, 1.0, x >= 0.0);
    let y = scale_log_base(1.0 + abs(x) / lt, base);
    return s * y;
}

fn scale_select_value(
    v: vec4<f32>,
    component_count_in: u32,
    component_index_in: u32,
    value_mode: u32,
) -> f32 {
    let component_count = max(1u, min(4u, component_count_in));
    let component_index = min(3u, component_index_in);
    if (value_mode == 1u) {
        if (component_count == 1u) {
            return abs(v.x);
        }
        if (component_count == 2u) {
            return length(v.xy);
        }
        if (component_count == 3u) {
            return length(v.xyz);
        }
        return length(v);
    }
    if (component_index == 0u) {
        return v.x;
    }
    if (component_index == 1u) {
        return v.y;
    }
    if (component_index == 2u) {
        return v.z;
    }
    return v.w;
}

fn scale_apply_transform(
    raw_value: f32,
    domain: vec4<f32>,
    clamp_config: vec4<f32>,
    params: vec4<f32>,
    flags: vec4<f32>,
) -> f32 {
    if (!scale_is_finite(raw_value)) {
        return 0.0;
    }
    var v = raw_value;
    let clamp_mode = u32(domain.w + 0.5);
    let clamp_min = clamp_config.x;
    let clamp_max = clamp_config.y;
    if (clamp_mode != 0u && clamp_max > clamp_min) {
        v = clamp(v, clamp_min, clamp_max);
    }
    var d0 = domain.x;
    var d1 = domain.y;
    if (d1 <= d0 && clamp_max > clamp_min) {
        d0 = clamp_min;
        d1 = clamp_max;
    }
    let mode_id = u32(params.x + 0.5);
    let base = params.y;
    let linthresh = params.z;
    let gamma = max(params.w, 1e-6);
    let a = scale_apply_mode(d0, mode_id, linthresh, base);
    let b = scale_apply_mode(d1, mode_id, linthresh, base);
    let x = scale_apply_mode(v, mode_id, linthresh, base);
    let denom = max(1e-20, b - a);
    var t = scale_clamp01((x - a) / denom);
    t = pow(t, gamma);
    if (flags.x > 0.5) {
        t = 1.0 - t;
    }
    return scale_clamp01(t);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= params.count) {
        return;
    }
    let v = values[i];
    if (!scale_is_finite(v)) {
        out_values[i] = 0.0;
        return;
    }
    out_values[i] = scale_apply_transform(
        v,
        params.domain,
        params.clamp_config,
        params.scale_params,
        params.scale_flags,
    );
}

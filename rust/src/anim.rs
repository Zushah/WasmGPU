/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::mat4::mat4_invert_from;
use crate::shared::{f32_slice, f32_slice_mut, u32_slice};

pub(crate) const INTERP_STEP: u32 = 0;
pub(crate) const INTERP_LINEAR: u32 = 1;
pub(crate) const INTERP_CUBIC: u32 = 2;
pub(crate) const PATH_TRANSLATION: u32 = 0;
pub(crate) const PATH_ROTATION: u32 = 1;
pub(crate) const PATH_SCALE: u32 = 2;

#[inline]
pub(crate) fn clamp01(x: f32) -> f32 {
    if x < 0.0 {
        0.0
    } else if x > 1.0 {
        1.0
    } else {
        x
    }
}

#[inline]
pub(crate) fn quat_normalize(x: f32, y: f32, z: f32, w: f32) -> (f32, f32, f32, f32) {
    let len = (x * x + y * y + z * z + w * w).sqrt();
    if len == 0.0 {
        (0.0, 0.0, 0.0, 1.0)
    } else {
        let inv = 1.0 / len;
        (x * inv, y * inv, z * inv, w * inv)
    }
}

#[inline]
pub(crate) fn quat_slerp(
    ax: f32,
    ay: f32,
    az: f32,
    aw: f32,
    bx: f32,
    by: f32,
    bz: f32,
    bw: f32,
    t: f32,
) -> (f32, f32, f32, f32) {
    let mut bx2 = bx;
    let mut by2 = by;
    let mut bz2 = bz;
    let mut bw2 = bw;
    let mut cos = ax * bx2 + ay * by2 + az * bz2 + aw * bw2;
    if cos < 0.0 {
        cos = -cos;
        bx2 = -bx2;
        by2 = -by2;
        bz2 = -bz2;
        bw2 = -bw2;
    }
    if cos > 0.9995 {
        let x = ax + (bx2 - ax) * t;
        let y = ay + (by2 - ay) * t;
        let z = az + (bz2 - az) * t;
        let w = aw + (bw2 - aw) * t;
        return quat_normalize(x, y, z, w);
    }
    let theta = cos.acos();
    let sin_theta = theta.sin();
    if sin_theta == 0.0 {
        return (ax, ay, az, aw);
    }
    let w1 = ((1.0 - t) * theta).sin() / sin_theta;
    let w2 = (t * theta).sin() / sin_theta;
    let x = ax * w1 + bx2 * w2;
    let y = ay * w1 + by2 * w2;
    let z = az * w1 + bz2 * w2;
    let w = aw * w1 + bw2 * w2;
    quat_normalize(x, y, z, w)
}

#[inline]
pub(crate) fn find_keyframe(times: &[f32], time: f32) -> (usize, usize, f32, f32) {
    let n = times.len();
    if n == 0 {
        return (0, 0, 0.0, 0.0);
    }
    if n == 1 {
        return (0, 0, 0.0, 0.0);
    }
    if time <= times[0] {
        let dt = times[1] - times[0];
        return (0, 0, 0.0, dt);
    }
    if time >= times[n - 1] {
        let dt = times[n - 1] - times[n - 2];
        return (n - 1, n - 1, 0.0, dt);
    }
    let mut lo: usize = 0;
    let mut hi: usize = n - 1;
    while lo + 1 < hi {
        let mid = (lo + hi) >> 1;
        if times[mid] <= time {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    let i0 = lo;
    let i1 = lo + 1;
    let dt = times[i1] - times[i0];
    if dt == 0.0 {
        return (i0, i0, 0.0, 0.0);
    }
    let alpha = (time - times[i0]) / dt;
    (i0, i1, clamp01(alpha), dt)
}

#[inline]
pub(crate) fn hermite(t: f32) -> (f32, f32, f32, f32) {
    let t2 = t * t;
    let t3 = t2 * t;
    let h00 = 2.0 * t3 - 3.0 * t2 + 1.0;
    let h10 = t3 - 2.0 * t2 + t;
    let h01 = -2.0 * t3 + 3.0 * t2;
    let h11 = t3 - t2;
    (h00, h10, h01, h11)
}

#[inline]
pub(crate) fn sample_vec(
    values: &[f32],
    stride: usize,
    interp: u32,
    i0: usize,
    i1: usize,
    alpha: f32,
    dt: f32,
    out: &mut [f32],
) {
    match interp {
        INTERP_STEP => {
            let base0 = i0 * stride;
            for k in 0..stride {
                out[k] = values[base0 + k];
            }
        }
        INTERP_CUBIC => {
            let (h00, h10, h01, h11) = hermite(alpha);
            let dt_scaled = dt;
            let base0 = i0 * stride * 3;
            let base1 = i1 * stride * 3;
            let v0 = base0 + stride;
            let out0 = base0 + stride * 2;
            let in1 = base1 + 0;
            let v1 = base1 + stride;
            for k in 0..stride {
                let p0 = values[v0 + k];
                let m0 = values[out0 + k] * dt_scaled;
                let p1 = values[v1 + k];
                let m1 = values[in1 + k] * dt_scaled;
                out[k] = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
            }
        }
        INTERP_LINEAR => {
            let base0 = i0 * stride;
            let base1 = i1 * stride;
            for k in 0..stride {
                let a0 = values[base0 + k];
                let a1 = values[base1 + k];
                out[k] = a0 + (a1 - a0) * alpha;
            }
        }
        _ => {
            let base0 = i0 * stride;
            let base1 = i1 * stride;
            for k in 0..stride {
                let a0 = values[base0 + k];
                let a1 = values[base1 + k];
                out[k] = a0 + (a1 - a0) * alpha;
            }
        }
    }
}

#[inline]
pub(crate) fn sample_quat(
    values: &[f32],
    interp: u32,
    i0: usize,
    i1: usize,
    alpha: f32,
    dt: f32,
) -> (f32, f32, f32, f32) {
    match interp {
        INTERP_STEP => {
            let base0 = i0 * 4;
            (
                values[base0 + 0],
                values[base0 + 1],
                values[base0 + 2],
                values[base0 + 3],
            )
        }
        INTERP_CUBIC => {
            let (h00, h10, h01, h11) = hermite(alpha);
            let dt_scaled = dt;
            let base0 = i0 * 4 * 3;
            let base1 = i1 * 4 * 3;
            let v0 = base0 + 4;
            let out0 = base0 + 8;
            let in1 = base1 + 0;
            let v1 = base1 + 4;
            let x = h00 * values[v0 + 0]
                + h10 * (values[out0 + 0] * dt_scaled)
                + h01 * values[v1 + 0]
                + h11 * (values[in1 + 0] * dt_scaled);
            let y = h00 * values[v0 + 1]
                + h10 * (values[out0 + 1] * dt_scaled)
                + h01 * values[v1 + 1]
                + h11 * (values[in1 + 1] * dt_scaled);
            let z = h00 * values[v0 + 2]
                + h10 * (values[out0 + 2] * dt_scaled)
                + h01 * values[v1 + 2]
                + h11 * (values[in1 + 2] * dt_scaled);
            let w = h00 * values[v0 + 3]
                + h10 * (values[out0 + 3] * dt_scaled)
                + h01 * values[v1 + 3]
                + h11 * (values[in1 + 3] * dt_scaled);
            quat_normalize(x, y, z, w)
        }
        INTERP_LINEAR => {
            let base0 = i0 * 4;
            let base1 = i1 * 4;
            let ax = values[base0 + 0];
            let ay = values[base0 + 1];
            let az = values[base0 + 2];
            let aw = values[base0 + 3];
            let bx = values[base1 + 0];
            let by = values[base1 + 1];
            let bz = values[base1 + 2];
            let bw = values[base1 + 3];
            quat_slerp(ax, ay, az, aw, bx, by, bz, bw, alpha)
        }
        _ => {
            let base0 = i0 * 4;
            let base1 = i1 * 4;
            let ax = values[base0 + 0];
            let ay = values[base0 + 1];
            let az = values[base0 + 2];
            let aw = values[base0 + 3];
            let bx = values[base1 + 0];
            let by = values[base1 + 1];
            let bz = values[base1 + 2];
            let bw = values[base1 + 3];
            quat_slerp(ax, ay, az, aw, bx, by, bz, bw, alpha)
        }
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn anim_sample_clip_trs(
    pos_ptr: u32,
    rot_ptr: u32,
    scl_ptr: u32,
    transform_count: u32,
    samplers_ptr: u32,
    sampler_count: u32,
    channels_ptr: u32,
    channel_count: u32,
    time: f32,
) -> u32 {
    unsafe {
        let samplers = u32_slice(samplers_ptr, sampler_count as usize * 5);
        let channels = u32_slice(channels_ptr, channel_count as usize * 3);
        let tcount = transform_count as usize;
        let pos = f32_slice_mut(pos_ptr, tcount * 3);
        let rot = f32_slice_mut(rot_ptr, tcount * 4);
        let scl = f32_slice_mut(scl_ptr, tcount * 3);
        let mut tmp_vec = [0.0f32; 4];
        for c in 0..(channel_count as usize) {
            let co = c * 3;
            let sampler_index = channels[co + 0] as usize;
            if sampler_index >= sampler_count as usize {
                continue;
            }
            let target = channels[co + 1] as usize;
            let path = channels[co + 2];
            if target >= tcount {
                continue;
            }
            let so = sampler_index * 5;
            let times_ptr = samplers[so + 0];
            let count = samplers[so + 1] as usize;
            let values_ptr = samplers[so + 2];
            let stride = samplers[so + 3] as usize;
            let interp = samplers[so + 4];
            if count == 0 {
                continue;
            }
            let times = f32_slice(times_ptr, count);
            let (i0, i1, alpha, dt) = find_keyframe(times, time);
            let values_len = if interp == INTERP_CUBIC {
                count * stride * 3
            } else {
                count * stride
            };
            let values = f32_slice(values_ptr, values_len);
            match path {
                PATH_TRANSLATION => {
                    if stride != 3 {
                        continue;
                    }
                    sample_vec(values, stride, interp, i0, i1, alpha, dt, &mut tmp_vec);
                    let base = target * 3;
                    pos[base + 0] = tmp_vec[0];
                    pos[base + 1] = tmp_vec[1];
                    pos[base + 2] = tmp_vec[2];
                }
                PATH_SCALE => {
                    if stride != 3 {
                        continue;
                    }
                    sample_vec(values, stride, interp, i0, i1, alpha, dt, &mut tmp_vec);
                    let base = target * 3;
                    scl[base + 0] = tmp_vec[0];
                    scl[base + 1] = tmp_vec[1];
                    scl[base + 2] = tmp_vec[2];
                }
                PATH_ROTATION => {
                    if stride != 4 {
                        continue;
                    }
                    let (x, y, z, w) = sample_quat(values, interp, i0, i1, alpha, dt);
                    let base = target * 4;
                    rot[base + 0] = x;
                    rot[base + 1] = y;
                    rot[base + 2] = z;
                    rot[base + 3] = w;
                }
                _ => {
                    // weights/morph targets not supported here
                }
            }
        }
    }
    0
}

#[inline]
pub(crate) fn mat4_mul_to(out: &mut [f32; 16], a: &[f32; 16], b: &[f32; 16]) {
    out[0] = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3];
    out[1] = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3];
    out[2] = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3];
    out[3] = a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3];
    out[4] = a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7];
    out[5] = a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7];
    out[6] = a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7];
    out[7] = a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7];
    out[8] = a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11];
    out[9] = a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11];
    out[10] = a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11];
    out[11] = a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11];
    out[12] = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15];
    out[13] = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15];
    out[14] = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15];
    out[15] = a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15];
}

#[unsafe(no_mangle)]
pub extern "C" fn anim_compute_joint_matrices_to(
    out_ptr: u32,
    joint_indices_ptr: u32,
    joint_count: u32,
    inv_bind_ptr: u32,
    world_base_ptr: u32,
    mesh_world_ptr: u32,
) -> u32 {
    unsafe {
        let joint_count_usize = joint_count as usize;
        let joint_indices = u32_slice(joint_indices_ptr, joint_count_usize);
        let inv_bind = f32_slice(inv_bind_ptr, joint_count_usize * 16);
        let out = f32_slice_mut(out_ptr, joint_count_usize * 16);
        let mesh_world = f32_slice(mesh_world_ptr, 16);
        let mut mesh_arr = [0.0f32; 16];
        mesh_arr.copy_from_slice(mesh_world);
        let mesh_inv = mat4_invert_from(&mesh_arr);
        let mut jw = [0.0f32; 16];
        let mut ib = [0.0f32; 16];
        let mut tmp = [0.0f32; 16];
        let mut res = [0.0f32; 16];
        for i in 0..joint_count_usize {
            let j_index = joint_indices[i] as usize;
            let joint_ptr = world_base_ptr.wrapping_add((j_index * 16 * 4) as u32);
            let joint_world = f32_slice(joint_ptr, 16);
            jw.copy_from_slice(joint_world);
            let base = i * 16;
            ib.copy_from_slice(&inv_bind[base..base + 16]);
            mat4_mul_to(&mut tmp, &jw, &ib);
            mat4_mul_to(&mut res, &mesh_inv, &tmp);
            out[base..base + 16].copy_from_slice(&res);
        }
    }
    0
}

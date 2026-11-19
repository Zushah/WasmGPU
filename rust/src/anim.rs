/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::mat4::mat4f_invert_from;
use crate::shared::{f32_slice, f32_slice_mut, u32_slice, with_driver_call};

pub(crate) const INTERP_STEP: u32 = 0;
pub(crate) const INTERP_LINEAR: u32 = 1;
pub(crate) const INTERP_CUBIC: u32 = 2;
pub(crate) const PATH_TRANSLATION: u32 = 0;
pub(crate) const PATH_ROTATION: u32 = 1;
pub(crate) const PATH_SCALE: u32 = 2;

#[inline]
pub(crate) fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
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

#[inline(always)]
fn sample_keys<const N: usize>(
    values: &[f32],
    interp: u32,
    i0: usize,
    i1: usize,
    alpha: f32,
    dt: f32,
) -> [f32; N] {
    let (keys, _) = values.as_chunks::<N>();
    match interp {
        INTERP_STEP => keys[i0],
        INTERP_CUBIC => {
            let (h00, h10, h01, h11) = hermite(alpha);
            let p0 = keys[i0 * 3 + 1];
            let m0 = keys[i0 * 3 + 2];
            let p1 = keys[i1 * 3 + 1];
            let m1 = keys[i1 * 3];
            core::array::from_fn(|k| {
                h00 * p0[k] + h10 * (m0[k] * dt) + h01 * p1[k] + h11 * (m1[k] * dt)
            })
        }
        _ => {
            let a = keys[i0];
            let b = keys[i1];
            core::array::from_fn(|k| a[k] + (b[k] - a[k]) * alpha)
        }
    }
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
    if stride == 3 {
        let v = sample_keys::<3>(values, interp, i0, i1, alpha, dt);
        out[..3].copy_from_slice(&v);
        return;
    }
    match interp {
        INTERP_STEP => {
            let base0 = i0 * stride;
            out[..stride].copy_from_slice(&values[base0..base0 + stride]);
        }
        INTERP_CUBIC => {
            let (h00, h10, h01, h11) = hermite(alpha);
            let dt_scaled = dt;
            let base0 = i0 * stride * 3;
            let base1 = i1 * stride * 3;
            let v0 = base0 + stride;
            let out0 = base0 + stride * 2;
            let in1 = base1;
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
    let (keys, _) = values.as_chunks::<4>();
    match interp {
        INTERP_STEP => {
            let [x, y, z, w] = keys[i0];
            (x, y, z, w)
        }
        INTERP_CUBIC => {
            let [x, y, z, w] = sample_keys::<4>(values, interp, i0, i1, alpha, dt);
            quat_normalize(x, y, z, w)
        }
        _ => {
            let [ax, ay, az, aw] = keys[i0];
            let [bx, by, bz, bw] = keys[i1];
            quat_slerp(ax, ay, az, aw, bx, by, bz, bw, alpha)
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn anim_sample_clip_trs(
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
    with_driver_call(|call| unsafe {
        let (samplers, _) =
            u32_slice(call, samplers_ptr, sampler_count as usize * 5).as_chunks::<5>();
        let (channels, _) =
            u32_slice(call, channels_ptr, channel_count as usize * 3).as_chunks::<3>();
        let tcount = transform_count as usize;
        let (pos, _) = f32_slice_mut(call, pos_ptr, tcount * 3).as_chunks_mut::<3>();
        let (rot, _) = f32_slice_mut(call, rot_ptr, tcount * 4).as_chunks_mut::<4>();
        let (scl, _) = f32_slice_mut(call, scl_ptr, tcount * 3).as_chunks_mut::<3>();
        let mut tmp_vec = [0.0f32; 4];
        for &[sampler_index, target, path] in channels {
            let sampler_index = sampler_index as usize;
            if sampler_index >= sampler_count as usize {
                continue;
            }
            let target = target as usize;
            if target >= tcount {
                continue;
            }
            let [times_ptr, count, values_ptr, stride, interp] = samplers[sampler_index];
            let count = count as usize;
            let stride = stride as usize;
            if count == 0 {
                continue;
            }
            let times = f32_slice(call, times_ptr, count);
            let (i0, i1, alpha, dt) = find_keyframe(times, time);
            let values_len = if interp == INTERP_CUBIC {
                count * stride * 3
            } else {
                count * stride
            };
            let values = f32_slice(call, values_ptr, values_len);
            match path {
                PATH_TRANSLATION => {
                    if stride != 3 {
                        continue;
                    }
                    sample_vec(values, stride, interp, i0, i1, alpha, dt, &mut tmp_vec);
                    pos[target] = [tmp_vec[0], tmp_vec[1], tmp_vec[2]];
                }
                PATH_SCALE => {
                    if stride != 3 {
                        continue;
                    }
                    sample_vec(values, stride, interp, i0, i1, alpha, dt, &mut tmp_vec);
                    scl[target] = [tmp_vec[0], tmp_vec[1], tmp_vec[2]];
                }
                PATH_ROTATION => {
                    if stride != 4 {
                        continue;
                    }
                    let (x, y, z, w) = sample_quat(values, interp, i0, i1, alpha, dt);
                    rot[target] = [x, y, z, w];
                }
                _ => {
                    // Weights/morph targets not supported here
                }
            }
        }
        0
    })
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
pub unsafe extern "C" fn anim_compute_joint_matrices_to(
    out_ptr: u32,
    joint_indices_ptr: u32,
    joint_count: u32,
    inv_bind_ptr: u32,
    world_base_ptr: u32,
    mesh_world_ptr: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        let joint_count_usize = joint_count as usize;
        let joint_indices = u32_slice(call, joint_indices_ptr, joint_count_usize);
        let (inv_bind, _) = f32_slice(call, inv_bind_ptr, joint_count_usize * 16).as_chunks::<16>();
        let (out, _) = f32_slice_mut(call, out_ptr, joint_count_usize * 16).as_chunks_mut::<16>();
        let mesh_world = f32_slice(call, mesh_world_ptr, 16);
        let mut mesh_arr = [0.0f32; 16];
        mesh_arr.copy_from_slice(mesh_world);
        let mesh_inv = mat4f_invert_from(&mesh_arr);
        let mut jw = [0.0f32; 16];
        let mut tmp = [0.0f32; 16];
        for ((&joint_index, ib), out) in joint_indices.iter().zip(inv_bind).zip(out) {
            let j_index = joint_index as usize;
            let joint_ptr = world_base_ptr.wrapping_add((j_index * 16 * 4) as u32);
            let joint_world = f32_slice(call, joint_ptr, 16);
            jw.copy_from_slice(joint_world);
            mat4_mul_to(&mut tmp, &jw, ib);
            mat4_mul_to(out, &mesh_inv, &tmp);
        }
        0
    })
}

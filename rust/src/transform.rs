/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::mat4::mat4f_invert_from;
use crate::shared::{f32_slice, f32_slice_mut, u32_slice, with_driver_call};

pub(crate) fn compose_local_many(
    out: &mut [f32],
    positions: &[f32],
    rotations: &[f32],
    scales: &[f32],
) {
    let count = out.len() / 16;
    assert_eq!(positions.len(), count * 3);
    assert_eq!(rotations.len(), count * 4);
    assert_eq!(scales.len(), count * 3);
    for i in 0..count {
        let pi = i * 3;
        let ri = i * 4;
        let mi = i * 16;
        let px = positions[pi + 0];
        let py = positions[pi + 1];
        let pz = positions[pi + 2];
        let x = rotations[ri + 0];
        let y = rotations[ri + 1];
        let z = rotations[ri + 2];
        let w = rotations[ri + 3];
        let sx = scales[pi + 0];
        let sy = scales[pi + 1];
        let sz = scales[pi + 2];
        let xx = x * x;
        let yy = y * y;
        let zz = z * z;
        let xy = x * y;
        let xz = x * z;
        let yz = y * z;
        let wx = w * x;
        let wy = w * y;
        let wz = w * z;
        out[mi + 0] = (1.0 - 2.0 * (yy + zz)) * sx;
        out[mi + 1] = (2.0 * (xy + wz)) * sx;
        out[mi + 2] = (2.0 * (xz - wy)) * sx;
        out[mi + 3] = 0.0;
        out[mi + 4] = (2.0 * (xy - wz)) * sy;
        out[mi + 5] = (1.0 - 2.0 * (xx + zz)) * sy;
        out[mi + 6] = (2.0 * (yz + wx)) * sy;
        out[mi + 7] = 0.0;
        out[mi + 8] = (2.0 * (xz + wy)) * sz;
        out[mi + 9] = (2.0 * (yz - wx)) * sz;
        out[mi + 10] = (1.0 - 2.0 * (xx + yy)) * sz;
        out[mi + 11] = 0.0;
        out[mi + 12] = px;
        out[mi + 13] = py;
        out[mi + 14] = pz;
        out[mi + 15] = 1.0;
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn transform_compose_local_many(
    out_local: u32,
    pos: u32,
    rot: u32,
    scl: u32,
    count: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        let n = count as usize;
        let p = f32_slice(call, pos, n * 3);
        let r = f32_slice(call, rot, n * 4);
        let s = f32_slice(call, scl, n * 3);
        let o = f32_slice_mut(call, out_local, n * 16);
        compose_local_many(o, p, r, s);
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn transform_update_world_ordered(
    out_world: u32,
    local: u32,
    parent_u32: u32,
    order_u32: u32,
    count: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        let n = count as usize;
        let l = f32_slice(call, local, n * 16);
        let w = f32_slice_mut(call, out_world, n * 16);
        let parents = u32_slice(call, parent_u32, n);
        let order = u32_slice(call, order_u32, n);
        for &ordered_index in order {
            let idx = ordered_index as usize;
            if idx >= n {
                continue;
            }
            let p = parents[idx];
            let dst = idx * 16;
            let src = idx * 16;
            if p == u32::MAX || (p as usize) >= n {
                w[dst..dst + 16].copy_from_slice(&l[src..src + 16]);
                continue;
            }
            let parent_idx = p as usize;
            let a = parent_idx * 16;
            let b = src;
            let mut t = [0.0f32; 16];
            t[0] = w[a + 0] * l[b + 0]
                + w[a + 4] * l[b + 1]
                + w[a + 8] * l[b + 2]
                + w[a + 12] * l[b + 3];
            t[1] = w[a + 1] * l[b + 0]
                + w[a + 5] * l[b + 1]
                + w[a + 9] * l[b + 2]
                + w[a + 13] * l[b + 3];
            t[2] = w[a + 2] * l[b + 0]
                + w[a + 6] * l[b + 1]
                + w[a + 10] * l[b + 2]
                + w[a + 14] * l[b + 3];
            t[3] = w[a + 3] * l[b + 0]
                + w[a + 7] * l[b + 1]
                + w[a + 11] * l[b + 2]
                + w[a + 15] * l[b + 3];
            t[4] = w[a + 0] * l[b + 4]
                + w[a + 4] * l[b + 5]
                + w[a + 8] * l[b + 6]
                + w[a + 12] * l[b + 7];
            t[5] = w[a + 1] * l[b + 4]
                + w[a + 5] * l[b + 5]
                + w[a + 9] * l[b + 6]
                + w[a + 13] * l[b + 7];
            t[6] = w[a + 2] * l[b + 4]
                + w[a + 6] * l[b + 5]
                + w[a + 10] * l[b + 6]
                + w[a + 14] * l[b + 7];
            t[7] = w[a + 3] * l[b + 4]
                + w[a + 7] * l[b + 5]
                + w[a + 11] * l[b + 6]
                + w[a + 15] * l[b + 7];
            t[8] = w[a + 0] * l[b + 8]
                + w[a + 4] * l[b + 9]
                + w[a + 8] * l[b + 10]
                + w[a + 12] * l[b + 11];
            t[9] = w[a + 1] * l[b + 8]
                + w[a + 5] * l[b + 9]
                + w[a + 9] * l[b + 10]
                + w[a + 13] * l[b + 11];
            t[10] = w[a + 2] * l[b + 8]
                + w[a + 6] * l[b + 9]
                + w[a + 10] * l[b + 10]
                + w[a + 14] * l[b + 11];
            t[11] = w[a + 3] * l[b + 8]
                + w[a + 7] * l[b + 9]
                + w[a + 11] * l[b + 10]
                + w[a + 15] * l[b + 11];
            t[12] = w[a + 0] * l[b + 12]
                + w[a + 4] * l[b + 13]
                + w[a + 8] * l[b + 14]
                + w[a + 12] * l[b + 15];
            t[13] = w[a + 1] * l[b + 12]
                + w[a + 5] * l[b + 13]
                + w[a + 9] * l[b + 14]
                + w[a + 13] * l[b + 15];
            t[14] = w[a + 2] * l[b + 12]
                + w[a + 6] * l[b + 13]
                + w[a + 10] * l[b + 14]
                + w[a + 14] * l[b + 15];
            t[15] = w[a + 3] * l[b + 12]
                + w[a + 7] * l[b + 13]
                + w[a + 11] * l[b + 14]
                + w[a + 15] * l[b + 15];
            w[dst..dst + 16].copy_from_slice(&t);
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn transform_update_partial_ordered(
    out_world: u32,
    out_local: u32,
    pos: u32,
    rot: u32,
    scl: u32,
    parent_u32: u32,
    order_u32: u32,
    dirty_indices_u32: u32,
    dirty_count: u32,
    count: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        let n = count as usize;
        let dcount = dirty_count as usize;
        if n == 0 || dcount == 0 {
            return 0;
        }
        let p = f32_slice(call, pos, n * 3);
        let r = f32_slice(call, rot, n * 4);
        let s = f32_slice(call, scl, n * 3);
        let l = f32_slice_mut(call, out_local, n * 16);
        let w = f32_slice_mut(call, out_world, n * 16);
        let parents = u32_slice(call, parent_u32, n);
        let order = u32_slice(call, order_u32, n);
        let dirty_indices = u32_slice(call, dirty_indices_u32, dcount);
        let mut dirty = vec![false; n];
        for &dirty_index in dirty_indices {
            let idx = dirty_index as usize;
            if idx >= n || dirty[idx] {
                continue;
            }
            dirty[idx] = true;
            let pi = idx * 3;
            let ri = idx * 4;
            let si = idx * 3;
            let mi = idx * 16;
            let px = p[pi + 0];
            let py = p[pi + 1];
            let pz = p[pi + 2];
            let x = r[ri + 0];
            let y = r[ri + 1];
            let z = r[ri + 2];
            let qw = r[ri + 3];
            let sx = s[si + 0];
            let sy = s[si + 1];
            let sz = s[si + 2];
            let xx = x * x;
            let yy = y * y;
            let zz = z * z;
            let xy = x * y;
            let xz = x * z;
            let yz = y * z;
            let wx = qw * x;
            let wy = qw * y;
            let wz = qw * z;
            l[mi + 0] = (1.0 - 2.0 * (yy + zz)) * sx;
            l[mi + 1] = (2.0 * (xy + wz)) * sx;
            l[mi + 2] = (2.0 * (xz - wy)) * sx;
            l[mi + 3] = 0.0;
            l[mi + 4] = (2.0 * (xy - wz)) * sy;
            l[mi + 5] = (1.0 - 2.0 * (xx + zz)) * sy;
            l[mi + 6] = (2.0 * (yz + wx)) * sy;
            l[mi + 7] = 0.0;
            l[mi + 8] = (2.0 * (xz + wy)) * sz;
            l[mi + 9] = (2.0 * (yz - wx)) * sz;
            l[mi + 10] = (1.0 - 2.0 * (xx + yy)) * sz;
            l[mi + 11] = 0.0;
            l[mi + 12] = px;
            l[mi + 13] = py;
            l[mi + 14] = pz;
            l[mi + 15] = 1.0;
        }
        let mut affected = vec![false; n];
        for &ordered_index in order {
            let idx = ordered_index as usize;
            if idx >= n {
                continue;
            }
            let pidx = parents[idx];
            let parent_affected =
                pidx != u32::MAX && (pidx as usize) < n && affected[pidx as usize];
            if !dirty[idx] && !parent_affected {
                continue;
            }
            affected[idx] = true;
            let dst = idx * 16;
            let src = idx * 16;
            if pidx == u32::MAX || (pidx as usize) >= n {
                w[dst..dst + 16].copy_from_slice(&l[src..src + 16]);
                continue;
            }
            let parent_idx = pidx as usize;
            let a = parent_idx * 16;
            let b = src;
            let a0 = w[a + 0];
            let a1 = w[a + 1];
            let a2 = w[a + 2];
            let a3 = w[a + 3];
            let a4 = w[a + 4];
            let a5 = w[a + 5];
            let a6 = w[a + 6];
            let a7 = w[a + 7];
            let a8 = w[a + 8];
            let a9 = w[a + 9];
            let a10 = w[a + 10];
            let a11 = w[a + 11];
            let a12 = w[a + 12];
            let a13 = w[a + 13];
            let a14 = w[a + 14];
            let a15 = w[a + 15];
            let b0 = l[b + 0];
            let b1 = l[b + 1];
            let b2 = l[b + 2];
            let b3 = l[b + 3];
            let b4 = l[b + 4];
            let b5 = l[b + 5];
            let b6 = l[b + 6];
            let b7 = l[b + 7];
            let b8 = l[b + 8];
            let b9 = l[b + 9];
            let b10 = l[b + 10];
            let b11 = l[b + 11];
            let b12 = l[b + 12];
            let b13 = l[b + 13];
            let b14 = l[b + 14];
            let b15 = l[b + 15];
            w[dst + 0] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
            w[dst + 1] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
            w[dst + 2] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
            w[dst + 3] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
            w[dst + 4] = a0 * b4 + a4 * b5 + a8 * b6 + a12 * b7;
            w[dst + 5] = a1 * b4 + a5 * b5 + a9 * b6 + a13 * b7;
            w[dst + 6] = a2 * b4 + a6 * b5 + a10 * b6 + a14 * b7;
            w[dst + 7] = a3 * b4 + a7 * b5 + a11 * b6 + a15 * b7;
            w[dst + 8] = a0 * b8 + a4 * b9 + a8 * b10 + a12 * b11;
            w[dst + 9] = a1 * b8 + a5 * b9 + a9 * b10 + a13 * b11;
            w[dst + 10] = a2 * b8 + a6 * b9 + a10 * b10 + a14 * b11;
            w[dst + 11] = a3 * b8 + a7 * b9 + a11 * b10 + a15 * b11;
            w[dst + 12] = a0 * b12 + a4 * b13 + a8 * b14 + a12 * b15;
            w[dst + 13] = a1 * b12 + a5 * b13 + a9 * b14 + a13 * b15;
            w[dst + 14] = a2 * b12 + a6 * b13 + a10 * b14 + a14 * b15;
            w[dst + 15] = a3 * b12 + a7 * b13 + a11 * b14 + a15 * b15;
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn transform_pack_model_normal_mat4_from_ptrs(
    out: u32,
    mat_ptrs_u32: u32,
    count: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        let n = count as usize;
        let ptrs = u32_slice(call, mat_ptrs_u32, n);
        let out_f32 = f32_slice_mut(call, out, n * 32);
        for (i, &src_ptr) in ptrs.iter().enumerate() {
            let src = f32_slice(call, src_ptr, 16);
            let base = i * 32;
            out_f32[base..base + 16].copy_from_slice(src);
            let mut m = [0.0f32; 16];
            m.copy_from_slice(src);
            let inv = mat4f_invert_from(&m);
            let mut normal = [0.0f32; 16];
            normal[0] = inv[0];
            normal[1] = inv[4];
            normal[2] = inv[8];
            normal[3] = inv[12];
            normal[4] = inv[1];
            normal[5] = inv[5];
            normal[6] = inv[9];
            normal[7] = inv[13];
            normal[8] = inv[2];
            normal[9] = inv[6];
            normal[10] = inv[10];
            normal[11] = inv[14];
            normal[12] = inv[3];
            normal[13] = inv[7];
            normal[14] = inv[11];
            normal[15] = inv[15];
            for j in 0..16 {
                out_f32[base + 16 + j] = normal[j];
            }
        }
        0
    })
}

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
    let (out, _) = out.as_chunks_mut::<16>();
    let count = out.len();
    assert_eq!(positions.len(), count * 3);
    assert_eq!(rotations.len(), count * 4);
    assert_eq!(scales.len(), count * 3);
    let (positions, _) = positions.as_chunks::<3>();
    let (rotations, _) = rotations.as_chunks::<4>();
    let (scales, _) = scales.as_chunks::<3>();
    for (((m, &[px, py, pz]), &[x, y, z, w]), &[sx, sy, sz]) in
        out.iter_mut().zip(positions).zip(rotations).zip(scales)
    {
        let xx = x * x;
        let yy = y * y;
        let zz = z * z;
        let xy = x * y;
        let xz = x * z;
        let yz = y * z;
        let wx = w * x;
        let wy = w * y;
        let wz = w * z;
        *m = [
            (1.0 - 2.0 * (yy + zz)) * sx,
            (2.0 * (xy + wz)) * sx,
            (2.0 * (xz - wy)) * sx,
            0.0,
            (2.0 * (xy - wz)) * sy,
            (1.0 - 2.0 * (xx + zz)) * sy,
            (2.0 * (yz + wx)) * sy,
            0.0,
            (2.0 * (xz + wy)) * sz,
            (2.0 * (yz - wx)) * sz,
            (1.0 - 2.0 * (xx + yy)) * sz,
            0.0,
            px,
            py,
            pz,
            1.0,
        ];
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
        let (l, _) = f32_slice(call, local, n * 16).as_chunks::<16>();
        let (w, _) = f32_slice_mut(call, out_world, n * 16).as_chunks_mut::<16>();
        let parents = u32_slice(call, parent_u32, n);
        let order = u32_slice(call, order_u32, n);
        for &ordered_index in order {
            let idx = ordered_index as usize;
            if idx >= n {
                continue;
            }
            let p = parents[idx];
            if p == u32::MAX || (p as usize) >= n {
                w[idx] = l[idx];
                continue;
            }
            let a = w[p as usize];
            let b = &l[idx];
            w[idx] = [
                a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
                a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
                a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
                a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],
                a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
                a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
                a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
                a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],
                a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
                a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
                a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
                a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],
                a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
                a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
                a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
                a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15],
            ];
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
        let (p, _) = f32_slice(call, pos, n * 3).as_chunks::<3>();
        let (r, _) = f32_slice(call, rot, n * 4).as_chunks::<4>();
        let (s, _) = f32_slice(call, scl, n * 3).as_chunks::<3>();
        let (l, _) = f32_slice_mut(call, out_local, n * 16).as_chunks_mut::<16>();
        let (w, _) = f32_slice_mut(call, out_world, n * 16).as_chunks_mut::<16>();
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
            let [px, py, pz] = p[idx];
            let [x, y, z, qw] = r[idx];
            let [sx, sy, sz] = s[idx];
            let xx = x * x;
            let yy = y * y;
            let zz = z * z;
            let xy = x * y;
            let xz = x * z;
            let yz = y * z;
            let wx = qw * x;
            let wy = qw * y;
            let wz = qw * z;
            l[idx] = [
                (1.0 - 2.0 * (yy + zz)) * sx,
                (2.0 * (xy + wz)) * sx,
                (2.0 * (xz - wy)) * sx,
                0.0,
                (2.0 * (xy - wz)) * sy,
                (1.0 - 2.0 * (xx + zz)) * sy,
                (2.0 * (yz + wx)) * sy,
                0.0,
                (2.0 * (xz + wy)) * sz,
                (2.0 * (yz - wx)) * sz,
                (1.0 - 2.0 * (xx + yy)) * sz,
                0.0,
                px,
                py,
                pz,
                1.0,
            ];
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
            if pidx == u32::MAX || (pidx as usize) >= n {
                w[idx] = l[idx];
                continue;
            }
            let a = w[pidx as usize];
            let b = &l[idx];
            w[idx] = [
                a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
                a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
                a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
                a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],
                a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
                a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
                a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
                a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],
                a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
                a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
                a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
                a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],
                a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
                a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
                a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
                a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15],
            ];
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
        let (records, _) = f32_slice_mut(call, out, n * 32).as_chunks_mut::<16>();
        let (records, _) = records.as_chunks_mut::<2>();
        for (&src_ptr, [model, normal]) in ptrs.iter().zip(records) {
            let src = f32_slice(call, src_ptr, 16);
            model.copy_from_slice(src);
            let mut m = [0.0f32; 16];
            m.copy_from_slice(src);
            let inv = mat4f_invert_from(&m);
            *normal = [
                inv[0], inv[4], inv[8], inv[12], inv[1], inv[5], inv[9], inv[13], inv[2], inv[6],
                inv[10], inv[14], inv[3], inv[7], inv[11], inv[15],
            ];
        }
        0
    })
}

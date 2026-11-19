/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, f32_slice_mut, u32_slice, with_driver_call};

pub(crate) fn compute_vertex_normals(out: &mut [f32], positions: &[f32], indices: Option<&[u32]>) {
    let (positions, _) = positions.as_chunks::<3>();
    let vcount = positions.len();
    assert_eq!(out.len(), vcount * 3);
    out.fill(0.0);
    let (out, _) = out.as_chunks_mut::<3>();
    #[inline(always)]
    fn add(out: &mut [f32; 3], nx: f32, ny: f32, nz: f32) {
        out[0] += nx;
        out[1] += ny;
        out[2] += nz;
    }
    #[inline(always)]
    fn tri(pos: &[[f32; 3]], out: &mut [[f32; 3]], ia: usize, ib: usize, ic: usize) {
        let [ax, ay, az] = pos[ia];
        let [bx, by, bz] = pos[ib];
        let [cx, cy, cz] = pos[ic];
        let e1x = bx - ax;
        let e1y = by - ay;
        let e1z = bz - az;
        let e2x = cx - ax;
        let e2y = cy - ay;
        let e2z = cz - az;
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;
        add(&mut out[ia], nx, ny, nz);
        add(&mut out[ib], nx, ny, nz);
        add(&mut out[ic], nx, ny, nz);
    }
    if let Some(idx) = indices {
        for &[ia, ib, ic] in idx.as_chunks::<3>().0 {
            let (ia, ib, ic) = (ia as usize, ib as usize, ic as usize);
            if ia < vcount && ib < vcount && ic < vcount {
                tri(positions, out, ia, ib, ic);
            }
        }
    } else {
        for t in 0..(vcount / 3) {
            let ia = t * 3;
            tri(positions, out, ia, ia + 1, ia + 2);
        }
    }
    for normal in out {
        let [x, y, z] = *normal;
        let len = (x * x + y * y + z * z).sqrt();
        if len != 0.0 {
            let inv = 1.0 / len;
            *normal = [x * inv, y * inv, z * inv];
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn mesh_compute_vertex_normals(
    out_normals: u32,
    positions: u32,
    vertex_count: u32,
    indices: u32,
    index_count: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        let vcount = vertex_count as usize;
        let plen = vcount * 3;
        let pos = f32_slice(call, positions, plen);
        let out = f32_slice_mut(call, out_normals, plen);
        let idx = if indices != 0 && index_count != 0 {
            Some(u32_slice(call, indices, index_count as usize))
        } else {
            None
        };
        compute_vertex_normals(out, pos, idx);
        0
    })
}

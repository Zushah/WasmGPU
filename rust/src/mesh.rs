/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, f32_slice_mut, u32_slice};

pub(crate) fn compute_vertex_normals(out: &mut [f32], positions: &[f32], indices: Option<&[u32]>) {
    let vcount = positions.len() / 3;
    assert_eq!(out.len(), vcount * 3);
    out.fill(0.0);
    #[inline(always)]
    fn add(out: &mut [f32], i: usize, nx: f32, ny: f32, nz: f32) {
        let b = i * 3;
        out[b + 0] += nx;
        out[b + 1] += ny;
        out[b + 2] += nz;
    }
    #[inline(always)]
    fn tri(pos: &[f32], out: &mut [f32], ia: usize, ib: usize, ic: usize) {
        let ax = pos[ia * 3 + 0];
        let ay = pos[ia * 3 + 1];
        let az = pos[ia * 3 + 2];
        let bx = pos[ib * 3 + 0];
        let by = pos[ib * 3 + 1];
        let bz = pos[ib * 3 + 2];
        let cx = pos[ic * 3 + 0];
        let cy = pos[ic * 3 + 1];
        let cz = pos[ic * 3 + 2];
        let e1x = bx - ax;
        let e1y = by - ay;
        let e1z = bz - az;
        let e2x = cx - ax;
        let e2y = cy - ay;
        let e2z = cz - az;
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;
        add(out, ia, nx, ny, nz);
        add(out, ib, nx, ny, nz);
        add(out, ic, nx, ny, nz);
    }
    if let Some(idx) = indices {
        let mut i = 0usize;
        while i + 2 < idx.len() {
            let ia = idx[i] as usize;
            let ib = idx[i + 1] as usize;
            let ic = idx[i + 2] as usize;
            if ia < vcount && ib < vcount && ic < vcount {
                tri(positions, out, ia, ib, ic);
            }
            i += 3;
        }
    } else {
        for t in 0..(vcount / 3) {
            let ia = t * 3;
            tri(positions, out, ia, ia + 1, ia + 2);
        }
    }
    for normal in out.chunks_exact_mut(3) {
        let len = (normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]).sqrt();
        if len != 0.0 {
            let inv = 1.0 / len;
            normal[0] *= inv;
            normal[1] *= inv;
            normal[2] *= inv;
        }
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn mesh_compute_vertex_normals(
    out_normals: u32,
    positions: u32,
    vertex_count: u32,
    indices: u32,
    index_count: u32,
) -> u32 {
    unsafe {
        let vcount = vertex_count as usize;
        let plen = vcount * 3;
        let pos = f32_slice(positions, plen);
        let out = f32_slice_mut(out_normals, plen);
        let idx = if indices != 0 && index_count != 0 {
            Some(u32_slice(indices, index_count as usize))
        } else {
            None
        };
        compute_vertex_normals(out, pos, idx);
    }
    0
}

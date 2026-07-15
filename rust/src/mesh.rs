/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, f32_slice_mut, u32_slice};

#[no_mangle]
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
        for i in 0..plen {
            out[i] = 0.0;
        }
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
        if indices != 0 && index_count != 0 {
            let icount = index_count as usize;
            let idx = u32_slice(indices, icount);
            let mut i = 0usize;
            while i + 2 < icount {
                let ia = idx[i] as usize;
                let ib = idx[i + 1] as usize;
                let ic = idx[i + 2] as usize;
                if ia < vcount && ib < vcount && ic < vcount {
                    tri(pos, out, ia, ib, ic);
                }
                i += 3;
            }
        } else {
            let tri_count = vcount / 3;
            for t in 0..tri_count {
                let ia = t * 3;
                let ib = ia + 1;
                let ic = ia + 2;
                if ic < vcount {
                    tri(pos, out, ia, ib, ic);
                }
            }
        }
        for i in 0..vcount {
            let b = i * 3;
            let nx = out[b + 0];
            let ny = out[b + 1];
            let nz = out[b + 2];
            let len = (nx * nx + ny * ny + nz * nz).sqrt();
            if len != 0.0 {
                let inv = 1.0 / len;
                out[b + 0] = nx * inv;
                out[b + 1] = ny * inv;
                out[b + 2] = nz * inv;
            }
        }
    }
    0
}

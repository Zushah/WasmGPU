/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, f32_slice_mut};

#[inline(always)]
unsafe fn write_zero_bounds(
    out_box_min_ptr: u32,
    out_box_max_ptr: u32,
    out_sphere_center_ptr: u32,
    out_sphere_radius_ptr: u32,
) {
    let out_min = f32_slice_mut(out_box_min_ptr, 3);
    let out_max = f32_slice_mut(out_box_max_ptr, 3);
    let out_center = f32_slice_mut(out_sphere_center_ptr, 3);
    let out_radius = f32_slice_mut(out_sphere_radius_ptr, 1);
    out_min[0] = 0.0;
    out_min[1] = 0.0;
    out_min[2] = 0.0;
    out_max[0] = 0.0;
    out_max[1] = 0.0;
    out_max[2] = 0.0;
    out_center[0] = 0.0;
    out_center[1] = 0.0;
    out_center[2] = 0.0;
    out_radius[0] = 0.0;
}

#[inline(always)]
unsafe fn compute_bounds_positions_stride(
    out_box_min_ptr: u32,
    out_box_max_ptr: u32,
    out_sphere_center_ptr: u32,
    out_sphere_radius_ptr: u32,
    points_ptr: u32,
    count: usize,
    stride_f32: usize,
) {
    if count == 0 {
        write_zero_bounds(
            out_box_min_ptr,
            out_box_max_ptr,
            out_sphere_center_ptr,
            out_sphere_radius_ptr,
        );
        return;
    }
    let points = f32_slice(points_ptr, count * stride_f32);
    let mut min_x = points[0];
    let mut min_y = points[1];
    let mut min_z = points[2];
    let mut max_x = points[0];
    let mut max_y = points[1];
    let mut max_z = points[2];
    for i in 0..count {
        let base = i * stride_f32;
        let x = points[base + 0];
        let y = points[base + 1];
        let z = points[base + 2];
        if x < min_x {
            min_x = x;
        }
        if y < min_y {
            min_y = y;
        }
        if z < min_z {
            min_z = z;
        }
        if x > max_x {
            max_x = x;
        }
        if y > max_y {
            max_y = y;
        }
        if z > max_z {
            max_z = z;
        }
    }
    let cx = 0.5 * (min_x + max_x);
    let cy = 0.5 * (min_y + max_y);
    let cz = 0.5 * (min_z + max_z);
    let mut max_r2 = 0.0f32;
    for i in 0..count {
        let base = i * stride_f32;
        let dx = points[base + 0] - cx;
        let dy = points[base + 1] - cy;
        let dz = points[base + 2] - cz;
        let r2 = dx * dx + dy * dy + dz * dz;
        if r2 > max_r2 {
            max_r2 = r2;
        }
    }
    let out_min = f32_slice_mut(out_box_min_ptr, 3);
    let out_max = f32_slice_mut(out_box_max_ptr, 3);
    let out_center = f32_slice_mut(out_sphere_center_ptr, 3);
    let out_radius = f32_slice_mut(out_sphere_radius_ptr, 1);
    out_min[0] = min_x;
    out_min[1] = min_y;
    out_min[2] = min_z;
    out_max[0] = max_x;
    out_max[1] = max_y;
    out_max[2] = max_z;
    out_center[0] = cx;
    out_center[1] = cy;
    out_center[2] = cz;
    out_radius[0] = max_r2.sqrt();
}

#[inline(always)]
fn rotate_vector_by_quat(
    vx: f32,
    vy: f32,
    vz: f32,
    qx: f32,
    qy: f32,
    qz: f32,
    qw: f32,
) -> (f32, f32, f32) {
    let tx = 2.0 * ((qy * vz) - (qz * vy));
    let ty = 2.0 * ((qz * vx) - (qx * vz));
    let tz = 2.0 * ((qx * vy) - (qy * vx));
    let out_x = vx + (qw * tx) + ((qy * tz) - (qz * ty));
    let out_y = vy + (qw * ty) + ((qz * tx) - (qx * tz));
    let out_z = vz + (qw * tz) + ((qx * ty) - (qy * tx));
    (out_x, out_y, out_z)
}

#[no_mangle]
pub extern "C" fn bounds_pointcloud_xyzs(
    out_box_min_ptr: u32,
    out_box_max_ptr: u32,
    out_sphere_center_ptr: u32,
    out_sphere_radius_ptr: u32,
    points_ptr: u32,
    point_count: u32,
    stride_f32: u32,
) -> u32 {
    unsafe {
        if out_box_min_ptr == 0
            || out_box_max_ptr == 0
            || out_sphere_center_ptr == 0
            || out_sphere_radius_ptr == 0
            || points_ptr == 0
        {
            return 0;
        }
        let count = point_count as usize;
        if count == 0 {
            write_zero_bounds(
                out_box_min_ptr,
                out_box_max_ptr,
                out_sphere_center_ptr,
                out_sphere_radius_ptr,
            );
            return 0;
        }
        let stride = stride_f32 as usize;
        if stride < 3 {
            write_zero_bounds(
                out_box_min_ptr,
                out_box_max_ptr,
                out_sphere_center_ptr,
                out_sphere_radius_ptr,
            );
            return 0;
        }
        compute_bounds_positions_stride(
            out_box_min_ptr,
            out_box_max_ptr,
            out_sphere_center_ptr,
            out_sphere_radius_ptr,
            points_ptr,
            count,
            stride,
        );
    }
    0
}

#[no_mangle]
pub extern "C" fn bounds_geometry_positions(
    out_box_min_ptr: u32,
    out_box_max_ptr: u32,
    out_sphere_center_ptr: u32,
    out_sphere_radius_ptr: u32,
    positions_ptr: u32,
    vertex_count: u32,
) -> u32 {
    unsafe {
        if out_box_min_ptr == 0
            || out_box_max_ptr == 0
            || out_sphere_center_ptr == 0
            || out_sphere_radius_ptr == 0
            || positions_ptr == 0
        {
            return 0;
        }
        compute_bounds_positions_stride(
            out_box_min_ptr,
            out_box_max_ptr,
            out_sphere_center_ptr,
            out_sphere_radius_ptr,
            positions_ptr,
            vertex_count as usize,
            3,
        );
    }
    0
}

#[no_mangle]
pub extern "C" fn bounds_glyph_instances(
    out_box_min_ptr: u32,
    out_box_max_ptr: u32,
    out_sphere_center_ptr: u32,
    out_sphere_radius_ptr: u32,
    positions_ptr: u32,
    scales_ptr: u32,
    rotations_ptr: u32,
    instance_count: u32,
    glyph_center_ptr: u32,
    glyph_radius: f32,
) -> u32 {
    unsafe {
        if out_box_min_ptr == 0
            || out_box_max_ptr == 0
            || out_sphere_center_ptr == 0
            || out_sphere_radius_ptr == 0
            || positions_ptr == 0
            || scales_ptr == 0
            || glyph_center_ptr == 0
        {
            return 0;
        }
        let count = instance_count as usize;
        if count == 0 {
            write_zero_bounds(
                out_box_min_ptr,
                out_box_max_ptr,
                out_sphere_center_ptr,
                out_sphere_radius_ptr,
            );
            return 0;
        }
        let positions = f32_slice(positions_ptr, count * 4);
        let scales = f32_slice(scales_ptr, count * 4);
        let rotations = if rotations_ptr != 0 {
            Some(f32_slice(rotations_ptr, count * 4))
        } else {
            None
        };
        let glyph_center = f32_slice(glyph_center_ptr, 3);
        let mut min_x = f32::INFINITY;
        let mut min_y = f32::INFINITY;
        let mut min_z = f32::INFINITY;
        let mut max_x = f32::NEG_INFINITY;
        let mut max_y = f32::NEG_INFINITY;
        let mut max_z = f32::NEG_INFINITY;
        for i in 0..count {
            let base = i * 4;
            let sx = scales[base + 0].abs();
            let sy = scales[base + 1].abs();
            let sz = scales[base + 2].abs();
            let mut cx = glyph_center[0] * sx;
            let mut cy = glyph_center[1] * sy;
            let mut cz = glyph_center[2] * sz;
            if let Some(rot) = rotations {
                let qx = rot[base + 0];
                let qy = rot[base + 1];
                let qz = rot[base + 2];
                let qw = rot[base + 3];
                let rotated = rotate_vector_by_quat(cx, cy, cz, qx, qy, qz, qw);
                cx = rotated.0;
                cy = rotated.1;
                cz = rotated.2;
            }
            let wx = positions[base + 0] + cx;
            let wy = positions[base + 1] + cy;
            let wz = positions[base + 2] + cz;
            let r = glyph_radius * sx.max(sy).max(sz);
            if wx - r < min_x {
                min_x = wx - r;
            }
            if wy - r < min_y {
                min_y = wy - r;
            }
            if wz - r < min_z {
                min_z = wz - r;
            }

            if wx + r > max_x {
                max_x = wx + r;
            }
            if wy + r > max_y {
                max_y = wy + r;
            }
            if wz + r > max_z {
                max_z = wz + r;
            }
        }
        let cx = 0.5 * (min_x + max_x);
        let cy = 0.5 * (min_y + max_y);
        let cz = 0.5 * (min_z + max_z);
        let ex = max_x - cx;
        let ey = max_y - cy;
        let ez = max_z - cz;
        let radius = (ex * ex + ey * ey + ez * ez).sqrt();
        let out_min = f32_slice_mut(out_box_min_ptr, 3);
        let out_max = f32_slice_mut(out_box_max_ptr, 3);
        let out_center = f32_slice_mut(out_sphere_center_ptr, 3);
        let out_radius = f32_slice_mut(out_sphere_radius_ptr, 1);
        out_min[0] = min_x;
        out_min[1] = min_y;
        out_min[2] = min_z;
        out_max[0] = max_x;
        out_max[1] = max_y;
        out_max[2] = max_z;
        out_center[0] = cx;
        out_center[1] = cy;
        out_center[2] = cz;
        out_radius[0] = radius;
    }
    0
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, f32_slice_mut};

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct BoundsResult {
    pub(crate) min: [f32; 3],
    pub(crate) max: [f32; 3],
    pub(crate) center: [f32; 3],
    pub(crate) radius: f32,
}

impl BoundsResult {
    pub(crate) const ZERO: Self = Self {
        min: [0.0; 3],
        max: [0.0; 3],
        center: [0.0; 3],
        radius: 0.0,
    };
}

pub(crate) fn bounds_positions_stride(
    points: &[f32],
    count: usize,
    stride_f32: usize,
) -> BoundsResult {
    if count == 0 || stride_f32 < 3 || points.len() < count.saturating_mul(stride_f32) {
        return BoundsResult::ZERO;
    }
    let mut min = [points[0], points[1], points[2]];
    let mut max = min;
    for point in points.chunks_exact(stride_f32).take(count) {
        for axis in 0..3 {
            min[axis] = min[axis].min(point[axis]);
            max[axis] = max[axis].max(point[axis]);
        }
    }
    let center = [
        0.5 * (min[0] + max[0]),
        0.5 * (min[1] + max[1]),
        0.5 * (min[2] + max[2]),
    ];
    let mut max_r2 = 0.0f32;
    for point in points.chunks_exact(stride_f32).take(count) {
        let dx = point[0] - center[0];
        let dy = point[1] - center[1];
        let dz = point[2] - center[2];
        max_r2 = max_r2.max(dx * dx + dy * dy + dz * dz);
    }
    BoundsResult {
        min,
        max,
        center,
        radius: max_r2.sqrt(),
    }
}

unsafe fn write_bounds(
    out_box_min_ptr: u32,
    out_box_max_ptr: u32,
    out_sphere_center_ptr: u32,
    out_sphere_radius_ptr: u32,
    bounds: BoundsResult,
) {
    unsafe {
        f32_slice_mut(out_box_min_ptr, 3).copy_from_slice(&bounds.min);
        f32_slice_mut(out_box_max_ptr, 3).copy_from_slice(&bounds.max);
        f32_slice_mut(out_sphere_center_ptr, 3).copy_from_slice(&bounds.center);
        f32_slice_mut(out_sphere_radius_ptr, 1)[0] = bounds.radius;
    }
}

#[inline(always)]
unsafe fn write_zero_bounds(
    out_box_min_ptr: u32,
    out_box_max_ptr: u32,
    out_sphere_center_ptr: u32,
    out_sphere_radius_ptr: u32,
) {
    unsafe {
        write_bounds(
            out_box_min_ptr,
            out_box_max_ptr,
            out_sphere_center_ptr,
            out_sphere_radius_ptr,
            BoundsResult::ZERO,
        );
    }
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
        unsafe {
            write_zero_bounds(
                out_box_min_ptr,
                out_box_max_ptr,
                out_sphere_center_ptr,
                out_sphere_radius_ptr,
            );
        }
        return;
    }
    let points = unsafe { f32_slice(points_ptr, count * stride_f32) };
    let bounds = bounds_positions_stride(points, count, stride_f32);
    unsafe {
        write_bounds(
            out_box_min_ptr,
            out_box_max_ptr,
            out_sphere_center_ptr,
            out_sphere_radius_ptr,
            bounds,
        );
    }
}

#[inline(always)]
pub(crate) fn rotate_vector_by_quat(
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

pub(crate) fn bounds_glyphs(
    positions: &[f32],
    scales: &[f32],
    rotations: Option<&[f32]>,
    count: usize,
    glyph_center: &[f32; 3],
    glyph_radius: f32,
) -> BoundsResult {
    if count == 0 || positions.len() < count * 4 || scales.len() < count * 4 {
        return BoundsResult::ZERO;
    }
    if rotations.is_some_and(|values| values.len() < count * 4) {
        return BoundsResult::ZERO;
    }
    let mut min = [f32::INFINITY; 3];
    let mut max = [f32::NEG_INFINITY; 3];
    for i in 0..count {
        let base = i * 4;
        let sx = scales[base + 0].abs();
        let sy = scales[base + 1].abs();
        let sz = scales[base + 2].abs();
        let mut center = [
            glyph_center[0] * sx,
            glyph_center[1] * sy,
            glyph_center[2] * sz,
        ];
        if let Some(rot) = rotations {
            let rotated = rotate_vector_by_quat(
                center[0],
                center[1],
                center[2],
                rot[base + 0],
                rot[base + 1],
                rot[base + 2],
                rot[base + 3],
            );
            center = [rotated.0, rotated.1, rotated.2];
        }
        let world_center = [
            positions[base + 0] + center[0],
            positions[base + 1] + center[1],
            positions[base + 2] + center[2],
        ];
        let radius = glyph_radius * sx.max(sy).max(sz);
        for axis in 0..3 {
            min[axis] = min[axis].min(world_center[axis] - radius);
            max[axis] = max[axis].max(world_center[axis] + radius);
        }
    }
    let center = [
        0.5 * (min[0] + max[0]),
        0.5 * (min[1] + max[1]),
        0.5 * (min[2] + max[2]),
    ];
    let extent = [max[0] - center[0], max[1] - center[1], max[2] - center[2]];
    BoundsResult {
        min,
        max,
        center,
        radius: (extent[0] * extent[0] + extent[1] * extent[1] + extent[2] * extent[2]).sqrt(),
    }
}

#[unsafe(no_mangle)]
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

#[unsafe(no_mangle)]
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

#[unsafe(no_mangle)]
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
        let center = [glyph_center[0], glyph_center[1], glyph_center[2]];
        let bounds = bounds_glyphs(positions, scales, rotations, count, &center, glyph_radius);
        write_bounds(
            out_box_min_ptr,
            out_box_max_ptr,
            out_sphere_center_ptr,
            out_sphere_radius_ptr,
            bounds,
        );
    }
    0
}

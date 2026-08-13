/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, f32_slice_mut, u32_slice, u32_slice_mut, with_driver_call};

pub(crate) fn write_all_visible(
    out: &mut [u32],
    centers: &[f32],
    radii: &[f32],
    out_stats: Option<&mut [u32]>,
) -> u32 {
    let n = radii.len();
    let mut out_count: usize = 0;
    let mut tested: u32 = 0;
    let mut visible: u32 = 0;
    for i in 0..n {
        let r = radii[i];
        let cx = centers[i * 3 + 0];
        let cy = centers[i * 3 + 1];
        let cz = centers[i * 3 + 2];
        if !r.is_finite() || !cx.is_finite() || !cy.is_finite() || !cz.is_finite() || r < 0.0 {
            continue;
        }
        tested += 1;
        visible += 1;
        out[out_count] = i as u32;
        out_count += 1;
    }
    if let Some(stats) = out_stats {
        if stats.len() >= 3 {
            stats[0] = tested;
            stats[1] = visible;
            stats[2] = 0;
        }
    }
    out_count as u32
}

pub(crate) fn extract_plane(nx: f32, ny: f32, nz: f32, d: f32) -> [f32; 4] {
    let len2 = (nx * nx) + (ny * ny) + (nz * nz);
    if len2 <= 0.0 {
        return [nx, ny, nz, d];
    }
    let inv = 1.0 / len2.sqrt();
    [nx * inv, ny * inv, nz * inv, d * inv]
}

pub(crate) fn near_plane_from_view_projection(m: &[f32]) -> [f32; 4] {
    extract_plane(m[2], m[6], m[10], m[14])
}

pub(crate) fn mul_clip(m: &[f32], x: f32, y: f32, z: f32) -> [f32; 4] {
    [
        (m[0] * x) + (m[4] * y) + (m[8] * z) + m[12],
        (m[1] * x) + (m[5] * y) + (m[9] * z) + m[13],
        (m[2] * x) + (m[6] * y) + (m[10] * z) + m[14],
        (m[3] * x) + (m[7] * y) + (m[11] * z) + m[15],
    ]
}

pub(crate) fn write_planes_from_view_projection(out: &mut [f32], m: &[f32]) {
    debug_assert!(out.len() >= 24);
    debug_assert!(m.len() >= 16);
    let r0x = m[0];
    let r0y = m[4];
    let r0z = m[8];
    let r0w = m[12];
    let r1x = m[1];
    let r1y = m[5];
    let r1z = m[9];
    let r1w = m[13];
    let r2x = m[2];
    let r2y = m[6];
    let r2z = m[10];
    let r2w = m[14];
    let r3x = m[3];
    let r3y = m[7];
    let r3z = m[11];
    let r3w = m[15];
    out[0] = r3x + r0x;
    out[1] = r3y + r0y;
    out[2] = r3z + r0z;
    out[3] = r3w + r0w;
    out[4] = r3x - r0x;
    out[5] = r3y - r0y;
    out[6] = r3z - r0z;
    out[7] = r3w - r0w;
    out[8] = r3x + r1x;
    out[9] = r3y + r1y;
    out[10] = r3z + r1z;
    out[11] = r3w + r1w;
    out[12] = r3x - r1x;
    out[13] = r3y - r1y;
    out[14] = r3z - r1z;
    out[15] = r3w - r1w;
    out[16] = r2x;
    out[17] = r2y;
    out[18] = r2z;
    out[19] = r2w;
    out[20] = r3x - r2x;
    out[21] = r3y - r2y;
    out[22] = r3z - r2z;
    out[23] = r3w - r2w;
    for p in 0..6 {
        let i = p * 4;
        let nx = out[i + 0];
        let ny = out[i + 1];
        let nz = out[i + 2];
        let len2 = nx * nx + ny * ny + nz * nz;
        if len2 > 0.0 {
            let inv = 1.0 / len2.sqrt();
            out[i + 0] = nx * inv;
            out[i + 1] = ny * inv;
            out[i + 2] = nz * inv;
            out[i + 3] *= inv;
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn cull_write_planes_from_view_projection(
    out_planes_ptr: u32,
    view_proj_ptr: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        if out_planes_ptr == 0 || view_proj_ptr == 0 {
            return 0;
        }
        let m = f32_slice(call, view_proj_ptr, 16);
        let out = f32_slice_mut(call, out_planes_ptr, 24);
        write_planes_from_view_projection(out, m);
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn cull_prepare_world_spheres_from_ptrs(
    out_centers_ptr: u32,
    out_radii_ptr: u32,
    world_ptrs_u32_ptr: u32,
    local_centers_ptr: u32,
    local_radii_ptr: u32,
    count: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        if out_centers_ptr == 0
            || out_radii_ptr == 0
            || world_ptrs_u32_ptr == 0
            || local_centers_ptr == 0
            || local_radii_ptr == 0
        {
            return 0;
        }
        let n = count as usize;
        if n == 0 {
            return 0;
        }
        let out_centers = f32_slice_mut(call, out_centers_ptr, n * 3);
        let out_radii = f32_slice_mut(call, out_radii_ptr, n);
        let world_ptrs = u32_slice(call, world_ptrs_u32_ptr, n);
        let local_centers = f32_slice(call, local_centers_ptr, n * 3);
        let local_radii = f32_slice(call, local_radii_ptr, n);
        for i in 0..n {
            let wptr = world_ptrs[i];
            if wptr == 0 {
                out_centers[i * 3 + 0] = 0.0;
                out_centers[i * 3 + 1] = 0.0;
                out_centers[i * 3 + 2] = 0.0;
                out_radii[i] = -1.0;
                continue;
            }
            let w = f32_slice(call, wptr, 16);
            let lc0 = local_centers[i * 3 + 0];
            let lc1 = local_centers[i * 3 + 1];
            let lc2 = local_centers[i * 3 + 2];
            let cx = w[0] * lc0 + w[4] * lc1 + w[8] * lc2 + w[12];
            let cy = w[1] * lc0 + w[5] * lc1 + w[9] * lc2 + w[13];
            let cz = w[2] * lc0 + w[6] * lc1 + w[10] * lc2 + w[14];
            out_centers[i * 3 + 0] = cx;
            out_centers[i * 3 + 1] = cy;
            out_centers[i * 3 + 2] = cz;
            let sx = (w[0] * w[0] + w[1] * w[1] + w[2] * w[2]).sqrt();
            let sy = (w[4] * w[4] + w[5] * w[5] + w[6] * w[6]).sqrt();
            let sz = (w[8] * w[8] + w[9] * w[9] + w[10] * w[10]).sqrt();
            let smax = sx.max(sy).max(sz);
            out_radii[i] = local_radii[i] * smax;
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn cull_spheres_frustum(
    out_indices_ptr: u32,
    centers_ptr: u32,
    radii_ptr: u32,
    count: u32,
    frustum_ptr: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        if out_indices_ptr == 0 || centers_ptr == 0 || radii_ptr == 0 || frustum_ptr == 0 {
            return 0;
        }
        let n = count as usize;
        if n == 0 {
            return 0;
        }
        let centers = f32_slice(call, centers_ptr, n * 3);
        let radii = f32_slice(call, radii_ptr, n);
        let fr = f32_slice(call, frustum_ptr, 24);
        let out = u32_slice_mut(call, out_indices_ptr, n);
        let mut planes = [0.0f32; 24];
        planes.copy_from_slice(fr);
        for p in 0..6 {
            let i = p * 4;
            let nx = planes[i + 0];
            let ny = planes[i + 1];
            let nz = planes[i + 2];
            let d = planes[i + 3];
            let len2 = nx * nx + ny * ny + nz * nz;
            if len2 > 0.0 {
                let inv = 1.0 / len2.sqrt();
                planes[i + 0] = nx * inv;
                planes[i + 1] = ny * inv;
                planes[i + 2] = nz * inv;
                planes[i + 3] = d * inv;
            }
        }
        let mut out_count: usize = 0;
        for i in 0..n {
            let r = radii[i];
            if r < 0.0 {
                continue;
            }
            let cx = centers[i * 3 + 0];
            let cy = centers[i * 3 + 1];
            let cz = centers[i * 3 + 2];
            let mut inside = true;
            for p in 0..6 {
                let j = p * 4;
                let dist =
                    planes[j + 0] * cx + planes[j + 1] * cy + planes[j + 2] * cz + planes[j + 3];
                if dist < -r {
                    inside = false;
                    break;
                }
            }
            if inside {
                out[out_count] = i as u32;
                out_count += 1;
            }
        }
        out_count as u32
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn cull_spheres_occlusion(
    out_indices_ptr: u32,
    out_stats_ptr: u32,
    centers_ptr: u32,
    radii_ptr: u32,
    count: u32,
    view_proj_ptr: u32,
    viewport_width: f32,
    viewport_height: f32,
    mip_offsets_ptr: u32,
    mip_widths_ptr: u32,
    mip_heights_ptr: u32,
    mip_count: u32,
    depth_values_ptr: u32,
    depth_values_len: u32,
    near_plane_epsilon: f32,
    max_screen_coverage: f32,
    depth_bias: f32,
) -> u32 {
    with_driver_call(|call| unsafe {
        if out_indices_ptr == 0 || centers_ptr == 0 || radii_ptr == 0 || view_proj_ptr == 0 {
            return 0;
        }
        let n = count as usize;
        if n == 0 {
            if out_stats_ptr != 0 {
                let stats = u32_slice_mut(call, out_stats_ptr, 3);
                stats[0] = 0;
                stats[1] = 0;
                stats[2] = 0;
            }
            return 0;
        }
        let centers = f32_slice(call, centers_ptr, n * 3);
        let radii = f32_slice(call, radii_ptr, n);
        let out = u32_slice_mut(call, out_indices_ptr, n);
        let out_stats = if out_stats_ptr != 0 {
            Some(u32_slice_mut(call, out_stats_ptr, 3))
        } else {
            None
        };
        if viewport_width <= 0.0
            || viewport_height <= 0.0
            || mip_count == 0
            || mip_offsets_ptr == 0
            || mip_widths_ptr == 0
            || mip_heights_ptr == 0
            || depth_values_ptr == 0
            || depth_values_len == 0
        {
            return write_all_visible(out, centers, radii, out_stats);
        }
        let view_proj = f32_slice(call, view_proj_ptr, 16);
        let mip_count_usize = mip_count as usize;
        let mip_offsets = u32_slice(call, mip_offsets_ptr, mip_count_usize);
        let mip_widths = u32_slice(call, mip_widths_ptr, mip_count_usize);
        let mip_heights = u32_slice(call, mip_heights_ptr, mip_count_usize);
        let depth_values = f32_slice(call, depth_values_ptr, depth_values_len as usize);
        let near_plane = near_plane_from_view_projection(view_proj);
        let coverage_limit = max_screen_coverage.clamp(0.0, 1.0);
        let depth_epsilon = depth_bias.max(0.0);
        let near_epsilon = near_plane_epsilon.max(0.0);
        let half_pixel_x = 0.5 / viewport_width.max(1.0);
        let half_pixel_y = 0.5 / viewport_height.max(1.0);
        let mut tested: u32 = 0;
        let mut visible: u32 = 0;
        let mut occluded: u32 = 0;
        let mut out_count: usize = 0;
        for i in 0..n {
            let r = radii[i];
            let cx = centers[i * 3 + 0];
            let cy = centers[i * 3 + 1];
            let cz = centers[i * 3 + 2];
            if !r.is_finite() || !cx.is_finite() || !cy.is_finite() || !cz.is_finite() || r <= 0.0 {
                tested += 1;
                visible += 1;
                out[out_count] = i as u32;
                out_count += 1;
                continue;
            }
            tested += 1;
            let near_dist =
                (near_plane[0] * cx) + (near_plane[1] * cy) + (near_plane[2] * cz) + near_plane[3];
            if !near_dist.is_finite() || near_dist <= (r + near_epsilon) {
                visible += 1;
                out[out_count] = i as u32;
                out_count += 1;
                continue;
            }
            let mut min_x = f32::INFINITY;
            let mut min_y = f32::INFINITY;
            let mut max_x = -f32::INFINITY;
            let mut max_y = -f32::INFINITY;
            let mut nearest_depth = f32::INFINITY;
            let mut ambiguous = false;
            for sx in [-1.0f32, 1.0f32] {
                for sy in [-1.0f32, 1.0f32] {
                    for sz in [-1.0f32, 1.0f32] {
                        let clip = mul_clip(view_proj, cx + (sx * r), cy + (sy * r), cz + (sz * r));
                        if !clip[0].is_finite()
                            || !clip[1].is_finite()
                            || !clip[2].is_finite()
                            || !clip[3].is_finite()
                            || clip[3] <= 1e-6
                        {
                            ambiguous = true;
                            break;
                        }
                        let inv_w = 1.0 / clip[3];
                        let ndc_x = clip[0] * inv_w;
                        let ndc_y = clip[1] * inv_w;
                        let ndc_z = clip[2] * inv_w;
                        if !ndc_x.is_finite() || !ndc_y.is_finite() || !ndc_z.is_finite() {
                            ambiguous = true;
                            break;
                        }
                        min_x = min_x.min(ndc_x);
                        min_y = min_y.min(ndc_y);
                        max_x = max_x.max(ndc_x);
                        max_y = max_y.max(ndc_y);
                        nearest_depth = nearest_depth.min(ndc_z);
                    }
                    if ambiguous {
                        break;
                    }
                }
                if ambiguous {
                    break;
                }
            }
            if ambiguous
                || !min_x.is_finite()
                || !min_y.is_finite()
                || !max_x.is_finite()
                || !max_y.is_finite()
                || !nearest_depth.is_finite()
            {
                visible += 1;
                out[out_count] = i as u32;
                out_count += 1;
                continue;
            }
            let rect_min_x = (((min_x - half_pixel_x).max(-1.0) + 1.0) * 0.5) * viewport_width;
            let rect_max_x = (((max_x + half_pixel_x).min(1.0) + 1.0) * 0.5) * viewport_width;
            let rect_min_y =
                ((1.0 - (max_y + half_pixel_y).min(1.0)) * 0.5).max(0.0) * viewport_height;
            let rect_max_y =
                ((1.0 - (min_y - half_pixel_y).max(-1.0)) * 0.5).min(1.0) * viewport_height;
            let rect_w = (rect_max_x - rect_min_x).max(0.0);
            let rect_h = (rect_max_y - rect_min_y).max(0.0);
            if !rect_w.is_finite() || !rect_h.is_finite() || rect_w <= 0.0 || rect_h <= 0.0 {
                visible += 1;
                out[out_count] = i as u32;
                out_count += 1;
                continue;
            }
            let coverage = (rect_w * rect_h) / (viewport_width * viewport_height).max(1.0);
            if !coverage.is_finite() || coverage >= coverage_limit {
                visible += 1;
                out[out_count] = i as u32;
                out_count += 1;
                continue;
            }
            let max_dim = rect_w.max(rect_h).max(1.0);
            let mip_level = max_dim
                .log2()
                .floor()
                .max(0.0)
                .min((mip_count_usize - 1) as f32) as usize;
            let mip_width = mip_widths[mip_level] as i32;
            let mip_height = mip_heights[mip_level] as i32;
            let mip_offset = mip_offsets[mip_level] as usize;
            if mip_width <= 0 || mip_height <= 0 {
                visible += 1;
                out[out_count] = i as u32;
                out_count += 1;
                continue;
            }
            let tx0 = (((rect_min_x / viewport_width) * mip_width as f32).floor() as i32) - 1;
            let ty0 = (((rect_min_y / viewport_height) * mip_height as f32).floor() as i32) - 1;
            let tx1 = ((rect_max_x / viewport_width) * mip_width as f32).ceil() as i32;
            let ty1 = ((rect_max_y / viewport_height) * mip_height as f32).ceil() as i32;
            let ix0 = tx0.max(0).min(mip_width - 1);
            let iy0 = ty0.max(0).min(mip_height - 1);
            let ix1 = tx1.max(0).min(mip_width - 1);
            let iy1 = ty1.max(0).min(mip_height - 1);
            if ix1 < ix0 || iy1 < iy0 {
                visible += 1;
                out[out_count] = i as u32;
                out_count += 1;
                continue;
            }
            let mut tile_max_depth = -f32::INFINITY;
            for ty in iy0..=iy1 {
                for tx in ix0..=ix1 {
                    let idx = mip_offset + (ty as usize * mip_width as usize) + tx as usize;
                    if idx >= depth_values.len() {
                        ambiguous = true;
                        break;
                    }
                    let depth = depth_values[idx];
                    if !depth.is_finite() {
                        ambiguous = true;
                        break;
                    }
                    tile_max_depth = tile_max_depth.max(depth);
                }
                if ambiguous {
                    break;
                }
            }
            if ambiguous || !tile_max_depth.is_finite() {
                visible += 1;
                out[out_count] = i as u32;
                out_count += 1;
                continue;
            }
            if nearest_depth > (tile_max_depth + depth_epsilon) {
                occluded += 1;
                continue;
            }
            visible += 1;
            out[out_count] = i as u32;
            out_count += 1;
        }
        if let Some(stats) = out_stats {
            stats[0] = tested;
            stats[1] = visible;
            stats[2] = occluded;
        }
        out_count as u32
    })
}

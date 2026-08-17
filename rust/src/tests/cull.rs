/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::cull::{extract_plane, mul_clip, near_plane_from_view_projection, write_all_visible};
use crate::mat4::mat4f_identity_arr;
use crate::tests::common::{assert_approx, assert_slice_approx};

#[test]
fn plane_and_clip_helpers_follow_webgpu_column_major_conventions() {
    assert_eq!(extract_plane(0.0, 0.0, 0.0, 2.0), [0.0, 0.0, 0.0, 2.0]);
    assert_slice_approx(
        &extract_plane(0.0, 0.0, 2.0, 4.0),
        &[0.0, 0.0, 1.0, 2.0],
        0.0,
    );
    let identity = mat4f_identity_arr();
    assert_eq!(
        near_plane_from_view_projection(&identity),
        [0.0, 0.0, 1.0, 0.0]
    );
    assert_eq!(mul_clip(&identity, 2.0, -3.0, 0.5), [2.0, -3.0, 0.5, 1.0]);
}

#[test]
fn conservative_fallback_preserves_stable_valid_indices_and_statistics() {
    let centers = [
        0.0,
        0.0,
        0.0,
        f32::NAN,
        0.0,
        0.0,
        2.0,
        3.0,
        4.0,
        0.0,
        0.0,
        0.0,
    ];
    let radii = [1.0, 1.0, 0.0, -1.0];
    let mut out = [99; 4];
    let mut stats = [99; 3];
    let count = write_all_visible(&mut out, &centers, &radii, Some(&mut stats));
    assert_eq!(count, 2);
    assert_eq!(&out[..2], &[0, 2]);
    assert_eq!(stats, [2, 2, 0]);
    let mut short_stats = [7; 2];
    write_all_visible(&mut out, &centers, &radii, Some(&mut short_stats));
    assert_eq!(short_stats, [7; 2]);
}

#[test]
fn infinite_perspective_produces_inactive_far_plane_without_culling_distant_geometry() {
    use crate::cull::write_planes_from_view_projection;
    use crate::mat4::mat4f_perspective_from;
    let proj = mat4f_perspective_from(std::f32::consts::FRAC_PI_2, 1.0, 0.1, f32::INFINITY);
    let mut planes = [0.0f32; 24];
    write_planes_from_view_projection(&mut planes, &proj);
    let far_plane = &planes[20..24];
    assert_eq!(far_plane[0], 0.0);
    assert_eq!(far_plane[1], 0.0);
    assert_eq!(far_plane[2], 0.0);
    assert_approx(far_plane[3], 0.1, 1e-6);
    let cx = 0.0f32;
    let cy = 0.0f32;
    let cz = -50000.0f32;
    let r = 10.0f32;
    let mut inside = true;
    for p in 0..6 {
        let j = p * 4;
        let dist = planes[j + 0] * cx + planes[j + 1] * cy + planes[j + 2] * cz + planes[j + 3];
        if dist < -r {
            inside = false;
            break;
        }
    }
    assert!(
        inside,
        "sphere at z=-50000 must not be culled under infinite perspective"
    );
}

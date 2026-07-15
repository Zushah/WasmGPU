/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::cull::{extract_plane, mul_clip, near_plane_from_view_projection, write_all_visible};
use crate::mat4::mat4_identity_arr;
use crate::tests::common::assert_slice_approx;

#[test]
fn plane_and_clip_helpers_follow_webgpu_column_major_conventions() {
    assert_eq!(extract_plane(0.0, 0.0, 0.0, 2.0), [0.0, 0.0, 0.0, 2.0]);
    assert_slice_approx(
        &extract_plane(0.0, 0.0, 2.0, 4.0),
        &[0.0, 0.0, 1.0, 2.0],
        0.0,
    );
    let identity = mat4_identity_arr();
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

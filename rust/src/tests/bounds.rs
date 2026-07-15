/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::bounds::{bounds_glyphs, bounds_positions_stride, rotate_vector_by_quat, BoundsResult};
use crate::tests::common::{assert_approx, assert_slice_approx};

#[test]
fn position_bounds_cover_empty_invalid_interleaved_and_asymmetric_data() {
    assert_eq!(bounds_positions_stride(&[], 0, 3), BoundsResult::ZERO);
    assert_eq!(
        bounds_positions_stride(&[1.0, 2.0], 1, 2),
        BoundsResult::ZERO
    );
    let points = [-2.0, 1.0, 5.0, 99.0, 4.0, -3.0, 1.0, 98.0];
    let bounds = bounds_positions_stride(&points, 2, 4);
    assert_eq!(bounds.min, [-2.0, -3.0, 1.0]);
    assert_eq!(bounds.max, [4.0, 1.0, 5.0]);
    assert_eq!(bounds.center, [1.0, -1.0, 3.0]);
    assert_approx(bounds.radius, 17.0f32.sqrt(), 1e-6);
}

#[test]
fn glyph_bounds_apply_absolute_scale_optional_rotation_and_center_offset() {
    let positions = [1.0, 2.0, 3.0, 0.0];
    let scales = [-2.0, 1.0, 3.0, 0.0];
    let bounds = bounds_glyphs(&positions, &scales, None, 1, &[1.0, 0.0, 0.0], 0.5);
    assert_eq!(bounds.min, [1.5, 0.5, 1.5]);
    assert_eq!(bounds.max, [4.5, 3.5, 4.5]);
    assert_eq!(bounds.center, [3.0, 2.0, 3.0]);
    let half = core::f32::consts::FRAC_1_SQRT_2;
    let rotations = [0.0, 0.0, half, half];
    let rotated = bounds_glyphs(
        &positions,
        &scales,
        Some(&rotations),
        1,
        &[1.0, 0.0, 0.0],
        0.0,
    );
    assert_slice_approx(&rotated.center, &[1.0, 4.0, 3.0], 1e-5);
    assert_eq!(
        bounds_glyphs(&[], &[], None, 0, &[0.0; 3], 1.0),
        BoundsResult::ZERO
    );
}

#[test]
fn quaternion_rotation_preserves_vector_length() {
    let half = core::f32::consts::FRAC_1_SQRT_2;
    let rotated = rotate_vector_by_quat(1.0, 0.0, 0.0, 0.0, 0.0, half, half);
    assert_slice_approx(&[rotated.0, rotated.1, rotated.2], &[0.0, 1.0, 0.0], 1e-5);
}

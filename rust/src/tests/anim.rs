/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::anim::{
    INTERP_CUBIC, INTERP_LINEAR, INTERP_STEP, clamp01, find_keyframe, hermite, mat4_mul_to,
    quat_normalize, quat_slerp, sample_quat, sample_vec,
};
use crate::mat4::mat4_identity_arr;
use crate::tests::common::{assert_approx, assert_slice_approx};

#[test]
fn keyframe_lookup_covers_empty_clamped_interior_and_duplicate_times() {
    assert_eq!(clamp01(-1.0), 0.0);
    assert_eq!(clamp01(2.0), 1.0);
    assert!(clamp01(f32::NAN).is_nan());
    assert_eq!(find_keyframe(&[], 1.0), (0, 0, 0.0, 0.0));
    assert_eq!(find_keyframe(&[2.0], 1.0), (0, 0, 0.0, 0.0));
    assert_eq!(find_keyframe(&[1.0, 3.0], 0.0), (0, 0, 0.0, 2.0));
    assert_eq!(find_keyframe(&[1.0, 3.0], 4.0), (1, 1, 0.0, 2.0));
    let (i0, i1, alpha, dt) = find_keyframe(&[0.0, 2.0, 5.0], 3.0);
    assert_eq!((i0, i1), (1, 2));
    assert_approx(alpha, 1.0 / 3.0, 1e-6);
    assert_eq!(dt, 3.0);
    assert_eq!(find_keyframe(&[0.0, 1.0, 1.0, 2.0], 1.0), (2, 3, 0.0, 1.0));
}

#[test]
fn vector_sampling_covers_step_linear_fallback_and_cubic_spline() {
    let values = [0.0, 2.0, 4.0, 10.0, 12.0, 14.0];
    let mut out = [0.0; 4];
    sample_vec(&values, 3, INTERP_STEP, 0, 1, 0.5, 1.0, &mut out);
    assert_eq!(&out[..3], &[0.0, 2.0, 4.0]);
    sample_vec(&values, 3, INTERP_LINEAR, 0, 1, 0.5, 1.0, &mut out);
    assert_eq!(&out[..3], &[5.0, 7.0, 9.0]);
    sample_vec(&values, 3, 99, 0, 1, 0.5, 1.0, &mut out);
    assert_eq!(&out[..3], &[5.0, 7.0, 9.0]);
    let cubic = [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ];
    sample_vec(&cubic, 3, INTERP_CUBIC, 0, 1, 0.5, 1.0, &mut out);
    assert_slice_approx(&out[..3], &[1.0, 0.0, 0.0], 1e-6);
    assert_slice_approx(&[hermite(0.0).0, hermite(1.0).2], &[1.0, 1.0], 0.0);
}

#[test]
fn quaternion_sampling_is_normalized_and_uses_the_shortest_path() {
    assert_eq!(quat_normalize(0.0, 0.0, 0.0, 0.0), (0.0, 0.0, 0.0, 1.0));
    let q = quat_slerp(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, -1.0, 0.5);
    assert_slice_approx(&[q.0, q.1, q.2, q.3], &[0.0, 0.0, 0.0, 1.0], 1e-6);
    let values = [0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0];
    let sampled = sample_quat(&values, INTERP_LINEAR, 0, 1, 0.5, 1.0);
    assert_approx(
        sampled.0 * sampled.0
            + sampled.1 * sampled.1
            + sampled.2 * sampled.2
            + sampled.3 * sampled.3,
        1.0,
        1e-6,
    );
}

#[test]
fn joint_matrix_multiplication_uses_column_major_order() {
    let identity = mat4_identity_arr();
    let mut translation = identity;
    translation[12] = 3.0;
    translation[13] = -2.0;
    let mut out = [0.0; 16];
    mat4_mul_to(&mut out, &translation, &identity);
    assert_eq!(out, translation);
}

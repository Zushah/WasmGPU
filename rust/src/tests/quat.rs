/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::quat::{
    quatd_from_rotation_mat3, quatd_norm_from, quatd_normalize_arr, quatf_from_rotation_mat3,
    quatf_norm_from, quatf_normalize_arr,
};
use crate::tests::common::{assert_approx, assert_slice_approx};

#[test]
fn norm_and_normalization_cover_zero_and_nonzero_quaternions() {
    assert_eq!(quatf_norm_from(&[0.0; 4]), 0.0);
    assert_eq!(quatf_normalize_arr(&[0.0; 4]), [0.0; 4]);
    let q = quatf_normalize_arr(&[1.0, 2.0, 3.0, 4.0]);
    assert_approx(quatf_norm_from(&q), 1.0, 1e-6);
}

#[test]
fn f64_quaternion_helpers_normalize_at_binary64_precision() {
    assert_eq!(quatd_norm_from(&[0.0; 4]), 0.0);
    assert_eq!(quatd_normalize_arr(&[0.0; 4]), [0.0; 4]);
    let q = quatd_normalize_arr(&[1.0, 2.0, 3.0, 4.0]);
    assert!((quatd_norm_from(&q) - 1.0).abs() <= 2.0 * f64::EPSILON);
    let identity = quatd_from_rotation_mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
    assert_eq!(identity, [0.0, 0.0, 0.0, 1.0]);
}

#[test]
fn matrix_conversion_exercises_all_dominant_diagonal_branches() {
    let identity = quatf_from_rotation_mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
    assert_slice_approx(&identity, &[0.0, 0.0, 0.0, 1.0], 1e-6);
    let x = quatf_from_rotation_mat3(1.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, -1.0);
    let y = quatf_from_rotation_mat3(-1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, -1.0);
    let z = quatf_from_rotation_mat3(-1.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 1.0);
    assert_slice_approx(&x.map(f32::abs), &[1.0, 0.0, 0.0, 0.0], 1e-6);
    assert_slice_approx(&y.map(f32::abs), &[0.0, 1.0, 0.0, 0.0], 1e-6);
    assert_slice_approx(&z.map(f32::abs), &[0.0, 0.0, 1.0, 0.0], 1e-6);
}

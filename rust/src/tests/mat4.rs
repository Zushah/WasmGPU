/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::cull::mul_clip;
use crate::mat4::{
    mat4d_det_from, mat4d_identity_arr, mat4d_invert_from, mat4d_perspective_from, mat4f_det_from,
    mat4f_identity_arr, mat4f_invert_from, mat4f_perspective_from,
};
use crate::tests::common::{assert_approx, assert_slice_approx};

#[test]
fn determinant_and_inverse_cover_identity_affine_and_singular_matrices() {
    let identity = mat4f_identity_arr();
    assert_eq!(mat4f_det_from(&identity), 1.0);
    assert_eq!(mat4f_invert_from(&identity), identity);
    let affine = [
        2.0, 0.0, 0.0, 0.0, 0.0, 3.0, 0.0, 0.0, 0.0, 0.0, 4.0, 0.0, 8.0, -6.0, 2.0, 1.0,
    ];
    assert_approx(mat4f_det_from(&affine), 24.0, 0.0);
    assert_slice_approx(
        &mat4f_invert_from(&affine),
        &[
            0.5,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0 / 3.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.25,
            0.0,
            -4.0,
            2.0,
            -0.5,
            1.0,
        ],
        1e-6,
    );
    assert_eq!(mat4f_det_from(&[0.0; 16]), 0.0);
    assert_eq!(mat4f_invert_from(&[0.0; 16]), identity);
}

#[test]
fn f64_matrix_helpers_preserve_binary64_precision() {
    let identity = mat4d_identity_arr();
    assert_eq!(mat4d_det_from(&identity), 1.0);
    assert_eq!(mat4d_invert_from(&identity), identity);
    let perspective = mat4d_perspective_from(std::f64::consts::FRAC_PI_2, 2.0, 0.5, 100.0);
    assert!((perspective[0] - 0.5).abs() <= f64::EPSILON);
}

#[test]
fn perspective_matrix_supports_finite_and_infinite_far_planes() {
    let fov_rad = std::f32::consts::FRAC_PI_2;
    let aspect = 2.0;
    let near = 0.5;
    let far = 100.0;
    let finite = mat4f_perspective_from(fov_rad, aspect, near, far);
    assert_approx(finite[0], 0.5, 1e-6);
    assert_approx(finite[5], 1.0, 1e-6);
    assert_approx(finite[10], 100.0 / (0.5 - 100.0), 1e-6);
    assert_eq!(finite[11], -1.0);
    assert_approx(finite[14], (0.5 * 100.0) / (0.5 - 100.0), 1e-6);
    assert_eq!(finite[15], 0.0);
    let infinite = mat4f_perspective_from(fov_rad, aspect, near, f32::INFINITY);
    assert_approx(infinite[0], 0.5, 1e-6);
    assert_approx(infinite[5], 1.0, 1e-6);
    assert_eq!(infinite[10], -1.0);
    assert_eq!(infinite[11], -1.0);
    assert_eq!(infinite[14], -near);
    assert_eq!(infinite[15], 0.0);
    for val in infinite {
        assert!(
            val.is_finite(),
            "infinite perspective entries must be finite numbers"
        );
    }
    let near_clip = mul_clip(&infinite, 0.0, 0.0, -near);
    assert_approx(near_clip[2] / near_clip[3], 0.0, 1e-6);
    let far_clip = mul_clip(&infinite, 0.0, 0.0, -50000.0);
    let far_ndc = far_clip[2] / far_clip[3];
    assert!(
        far_ndc > 0.999 && far_ndc < 1.0,
        "distant ndc_z ({far_ndc}) should approach 1.0 without exceeding 1.0"
    );
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::mat4::{mat4_det_from, mat4_identity_arr, mat4_invert_from};
use crate::tests::common::{assert_approx, assert_slice_approx};

#[test]
fn determinant_and_inverse_cover_identity_affine_and_singular_matrices() {
    let identity = mat4_identity_arr();
    assert_eq!(mat4_det_from(&identity), 1.0);
    assert_eq!(mat4_invert_from(&identity), identity);
    let affine = [
        2.0, 0.0, 0.0, 0.0, 0.0, 3.0, 0.0, 0.0, 0.0, 0.0, 4.0, 0.0, 8.0, -6.0, 2.0, 1.0,
    ];
    assert_approx(mat4_det_from(&affine), 24.0, 0.0);
    assert_slice_approx(
        &mat4_invert_from(&affine),
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
    assert_eq!(mat4_det_from(&[0.0; 16]), 0.0);
    assert_eq!(mat4_invert_from(&[0.0; 16]), identity);
}

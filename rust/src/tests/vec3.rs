/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::tests::common::{assert_approx, assert_slice_approx};
use crate::vec3::{vec3_cross_from, vec3_dot_from, vec3_norm_from, vec3_normsq_from};

#[test]
fn vector_primitives_cover_zero_orthogonal_and_general_inputs() {
    assert_eq!(vec3_norm_from(&[0.0; 3]), 0.0);
    assert_eq!(vec3_normsq_from(&[2.0, -3.0, 6.0]), 49.0);
    assert_approx(vec3_norm_from(&[2.0, -3.0, 6.0]), 7.0, 0.0);
    assert_eq!(vec3_dot_from(&[1.0, 0.0, 0.0], &[0.0, 1.0, 0.0]), 0.0);
    assert_eq!(vec3_dot_from(&[1.0, 2.0, 3.0], &[-4.0, 5.0, 6.0]), 24.0);
    assert_slice_approx(
        &vec3_cross_from(&[1.0, 0.0, 0.0], &[0.0, 1.0, 0.0]),
        &[0.0, 0.0, 1.0],
        0.0,
    );
    assert_eq!(
        vec3_cross_from(&[1.0, 2.0, 3.0], &[2.0, 4.0, 6.0]),
        [0.0; 3]
    );
}

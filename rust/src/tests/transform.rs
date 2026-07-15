/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::tests::common::assert_slice_approx;
use crate::transform::compose_local_many;

#[test]
fn composition_handles_empty_identity_and_batched_nonuniform_trs() {
    compose_local_many(&mut [], &[], &[], &[]);
    let positions = [1.0, 2.0, 3.0, -4.0, 5.0, 6.0];
    let rotations = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
    let scales = [1.0, 1.0, 1.0, 2.0, 3.0, 4.0];
    let mut out = [0.0; 32];
    compose_local_many(&mut out, &positions, &rotations, &scales);
    assert_slice_approx(
        &out[..16],
        &[
            1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 2.0, 3.0, 1.0,
        ],
        0.0,
    );
    assert_slice_approx(
        &out[16..],
        &[
            2.0, 0.0, 0.0, 0.0, 0.0, 3.0, 0.0, 0.0, 0.0, 0.0, 4.0, 0.0, -4.0, 5.0, 6.0, 1.0,
        ],
        0.0,
    );
}

#[test]
fn composition_applies_quaternion_rotation_before_translation() {
    let half = core::f32::consts::FRAC_1_SQRT_2;
    let mut out = [0.0; 16];
    compose_local_many(
        &mut out,
        &[3.0, 4.0, 5.0],
        &[0.0, 0.0, half, half],
        &[1.0, 1.0, 1.0],
    );
    assert_slice_approx(
        &out,
        &[
            0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 3.0, 4.0, 5.0, 1.0,
        ],
        1e-5,
    );
}

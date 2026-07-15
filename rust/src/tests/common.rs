/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

pub(crate) fn assert_approx(actual: f32, expected: f32, tolerance: f32) {
    assert!(
        actual.is_finite() && expected.is_finite(),
        "expected finite values, actual={actual:?}, expected={expected:?}"
    );
    assert!(
        (actual - expected).abs() <= tolerance,
        "actual={actual:?}, expected={expected:?}, tolerance={tolerance:?}"
    );
}

pub(crate) fn assert_slice_approx(actual: &[f32], expected: &[f32], tolerance: f32) {
    assert_eq!(actual.len(), expected.len(), "slice lengths differ");
    for (index, (&a, &e)) in actual.iter().zip(expected).enumerate() {
        assert!(
            a.is_finite() && e.is_finite(),
            "non-finite value at {index}: actual={a:?}, expected={e:?}"
        );
        assert!(
            (a - e).abs() <= tolerance,
            "value at {index}: actual={a:?}, expected={e:?}, tolerance={tolerance:?}"
        );
    }
}

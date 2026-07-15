/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::align_up;

#[test]
fn alignment_preserves_aligned_values_and_rounds_up() {
    assert_eq!(align_up(0, 1), 0);
    assert_eq!(align_up(16, 16), 16);
    assert_eq!(align_up(17, 16), 32);
    assert_eq!(align_up(63, 4), 64);
    assert_eq!(align_up(65_535, 65_536), 65_536);
}

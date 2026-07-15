/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::ndarray::{numel, offset_bytes, strides_row_major};

const ND_ERROR: u32 = u32::MAX;

#[test]
fn numel_handles_scalars_zero_dimensions_and_overflow() {
    assert_eq!(numel(&[]), 1);
    assert_eq!(numel(&[2, 3, 4]), 24);
    assert_eq!(numel(&[2, 0, 4]), 0);
    assert_eq!(numel(&[u32::MAX, 2]), 0);
}

#[test]
fn row_major_strides_cover_empty_normal_and_overflow_layouts() {
    let mut empty = [];
    assert_eq!(strides_row_major(&mut empty, &[], 4), 1);
    let mut out = [0; 3];
    assert_eq!(strides_row_major(&mut out, &[2, 3, 4], 4), 1);
    assert_eq!(out, [48, 16, 4]);
    assert_eq!(strides_row_major(&mut out, &[2, 3, 4], 0), 0);
    assert_eq!(strides_row_major(&mut [0], &[2, 3], 4), 0);
    assert_eq!(strides_row_major(&mut [0, 0], &[2, u32::MAX], 4), 0);
}

#[test]
fn offsets_support_base_and_negative_strides_and_reject_invalid_ranges() {
    assert_eq!(offset_bytes(&[], &[], &[], 17), 17);
    assert_eq!(offset_bytes(&[2, 3], &[12, 4], &[1, 2], 8), 28);
    assert_eq!(offset_bytes(&[4], &[-4], &[2], 12), 4);
    assert_eq!(offset_bytes(&[4], &[-4], &[3], 4), ND_ERROR);
    assert_eq!(offset_bytes(&[2], &[4], &[2], 0), ND_ERROR);
    assert_eq!(offset_bytes(&[2], &[4, 8], &[1], 0), ND_ERROR);
    assert_eq!(
        offset_bytes(&[u32::MAX], &[i32::MAX], &[u32::MAX - 1], 0),
        ND_ERROR
    );
}

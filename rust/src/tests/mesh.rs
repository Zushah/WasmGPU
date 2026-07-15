/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::mesh::compute_vertex_normals;
use crate::tests::common::assert_slice_approx;

#[test]
fn unindexed_and_indexed_triangles_produce_normalized_normals() {
    let positions = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0];
    let mut unindexed = [0.0; 9];
    compute_vertex_normals(&mut unindexed, &positions, None);
    assert_slice_approx(
        &unindexed,
        &[0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0],
        1e-6,
    );
    let mut indexed = [0.0; 9];
    compute_vertex_normals(&mut indexed, &positions, Some(&[0, 2, 1]));
    assert_slice_approx(
        &indexed,
        &[0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0],
        1e-6,
    );
}

#[test]
fn invalid_incomplete_and_degenerate_triangles_are_ignored() {
    let positions = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0];
    let mut out = [9.0; 9];
    compute_vertex_normals(&mut out, &positions, Some(&[0, 1, 2, 0, 99]));
    assert_eq!(out, [0.0; 9]);
    let mut empty = [];
    compute_vertex_normals(&mut empty, &[], None);
    assert!(empty.is_empty());
}

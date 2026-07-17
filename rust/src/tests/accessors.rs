/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::accessors::{
    CT_F32, CT_I8, CT_I16, CT_I32, CT_U8, CT_U16, CT_U32, component_bits, component_bytes,
    component_signed, component_to_f32, component_to_u16, deinterleave, js_to_u32,
    read_component_as_f64, read_sparse_index,
};
use crate::tests::common::assert_approx;

#[test]
fn component_metadata_and_little_endian_reads_cover_every_gltf_type() {
    assert_eq!(component_bytes(CT_I8), 1);
    assert_eq!(component_bytes(CT_U8), 1);
    assert_eq!(component_bytes(CT_I16), 2);
    assert_eq!(component_bytes(CT_U16), 2);
    assert_eq!(component_bytes(CT_I32), 4);
    assert_eq!(component_bytes(CT_U32), 4);
    assert_eq!(component_bytes(CT_F32), 4);
    assert_eq!(component_bytes(0), 0);
    assert_eq!(component_bits(CT_U16), 16);
    assert_eq!(component_bits(CT_F32), 32);
    assert!(component_signed(CT_I8));
    assert!(component_signed(CT_F32));
    assert!(!component_signed(CT_U32));
    assert_eq!(read_component_as_f64(&[0x80], 0, CT_I8), -128.0);
    assert_eq!(read_component_as_f64(&[0xff], 0, CT_U8), 255.0);
    assert_eq!(
        read_component_as_f64(&(-1234i16).to_le_bytes(), 0, CT_I16),
        -1234.0
    );
    assert_eq!(
        read_component_as_f64(&50000u16.to_le_bytes(), 0, CT_U16),
        50000.0
    );
    assert_eq!(
        read_component_as_f64(&(-123456i32).to_le_bytes(), 0, CT_I32),
        -123456.0
    );
    assert_eq!(
        read_component_as_f64(&4_000_000_000u32.to_le_bytes(), 0, CT_U32),
        4_000_000_000.0
    );
    assert_approx(
        read_component_as_f64(&1.25f32.to_le_bytes(), 0, CT_F32) as f32,
        1.25,
        0.0,
    );
}

#[test]
fn normalized_conversion_handles_signed_unsigned_and_f32_boundaries() {
    assert_eq!(component_to_f32(&[0x80], 0, CT_I8, true), -1.0);
    assert_eq!(component_to_f32(&[0x7f], 0, CT_I8, true), 1.0);
    assert_eq!(component_to_f32(&[0xff], 0, CT_U8, true), 1.0);
    assert_eq!(component_to_f32(&[0], 0, CT_U8, true), 0.0);
    assert_approx(
        component_to_f32(&32767i16.to_le_bytes(), 0, CT_I16, true),
        1.0,
        0.0,
    );
    assert_approx(
        component_to_f32(&0.25f32.to_le_bytes(), 0, CT_F32, true),
        0.25,
        0.0,
    );
    assert_eq!(component_to_f32(&[0xfe], 0, CT_I8, false), -2.0);
}

#[test]
fn deinterleave_validates_layout_and_copies_only_components() {
    let src = [1, 2, 3, 4, 90, 91, 5, 6, 7, 8, 92, 93];
    let mut out = [0; 8];
    assert!(deinterleave(&mut out, &src, 2, 2, 2, 6));
    assert_eq!(out, [1, 2, 3, 4, 5, 6, 7, 8]);
    assert!(!deinterleave(&mut out, &src, 2, 2, 2, 3));
    assert!(!deinterleave(&mut out, &src, 0, 2, 2, 6));
    assert!(!deinterleave(&mut out[..7], &src, 2, 2, 2, 6));
    assert!(!deinterleave(&mut out, &src[..9], 2, 2, 2, 6));
}

#[test]
fn sparse_indices_and_integer_outputs_match_web_and_gltf_rules() {
    assert_eq!(read_sparse_index(&[7], 0, CT_U8), 7);
    assert_eq!(read_sparse_index(&500u16.to_le_bytes(), 0, CT_U16), 500);
    assert_eq!(
        read_sparse_index(&70_000u32.to_le_bytes(), 0, CT_U32),
        70_000
    );
    assert_eq!(read_sparse_index(&[9], 0, CT_I8), 0);
    assert_eq!(component_to_u16(&(-3i16).to_le_bytes(), 0, CT_I16), 0);
    assert_eq!(
        component_to_u16(&70_000u32.to_le_bytes(), 0, CT_U32),
        65_535
    );
    assert_eq!(component_to_u16(&12.75f32.to_le_bytes(), 0, CT_F32), 12);
    assert_eq!(js_to_u32(0.0), 0);
    assert_eq!(js_to_u32(f64::NAN), 0);
    assert_eq!(js_to_u32(f64::INFINITY), 0);
    assert_eq!(js_to_u32(12.9), 12);
    assert_eq!(js_to_u32(-1.9), u32::MAX);
    assert_eq!(js_to_u32(4_294_967_297.0), 1);
}

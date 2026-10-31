/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::ndarray::DType::{C64, C128, F32, F64, I8, I32, U8, U32};
use crate::ndarray::{
    AffineForm, AffineParams, DType, Destination, Element, IntMode, PadAxes, PadMode, ResizeTables,
    STATUS_DESTINATION_BOUNDS, STATUS_INVALID_DTYPE, STATUS_INVALID_PARAMETERS,
    STATUS_INVALID_RANK, STATUS_INVALID_SHAPE, STATUS_INVALID_TABLE, STATUS_SOURCE_BOUNDS, Source,
    affine, affine_value, copy_cast, layout_within, numel, offset_bytes, pad, pad_index, resize,
    strides_row_major, to_int,
};

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

const WRAP: IntMode = IntMode {
    saturate: false,
    nearest: false,
};

const SATURATE: IntMode = IntMode {
    saturate: true,
    nearest: false,
};

fn le<T: Element>(values: &[T]) -> Vec<u8> {
    let mut out = vec![0; size_of_val(values)];
    for (i, &v) in values.iter().enumerate() {
        v.store(&mut out, i * size_of::<T>());
    }
    out
}

fn from_le<T: Element>(bytes: &[u8]) -> Vec<T> {
    let size = size_of::<T>();
    bytes.chunks_exact(size).map(|c| T::load(c, 0)).collect()
}

fn dst<'a>(bytes: &'a mut [u8], dtype: DType, strides: &'a [i32]) -> Destination<'a> {
    Destination {
        bytes,
        dtype,
        offset: 0,
        strides,
    }
}

fn src<'a>(bytes: &'a [u8], dtype: DType, offset: u32, strides: &'a [i32]) -> Source<'a> {
    Source {
        bytes,
        dtype,
        offset,
        strides,
    }
}

struct Csr {
    off: Vec<i32>,
    idx: Vec<i32>,
    w: Vec<f64>,
}

fn csr(rows: &[&[(i32, f64)]]) -> Csr {
    let mut table = Csr {
        off: vec![0],
        idx: Vec::new(),
        w: Vec::new(),
    };
    for row in rows {
        for &(i, w) in row.iter() {
            table.idx.push(i);
            table.w.push(w);
        }
        table.off.push(table.idx.len() as i32);
    }
    table
}

fn tables<'a>(
    y: &'a Csr,
    x: &'a Csr,
    n: (u32, u32),
    value: [f64; 2],
    weighted: bool,
) -> ResizeTables<'a> {
    ResizeTables {
        axis_y: 0,
        axis_x: 1,
        src_y: n.0,
        src_x: n.1,
        off_y: &y.off,
        idx_y: &y.idx,
        w_y: &y.w,
        off_x: &x.off,
        idx_x: &x.idx,
        w_x: &x.w,
        value,
        weighted,
    }
}

fn cast_one(bytes: &[u8], from: DType, to: DType, mode: IntMode) -> Vec<u8> {
    let mut out = vec![0; to.size()];
    let status = copy_cast(dst(&mut out, to, &[]), src(bytes, from, 0, &[]), &[], mode);
    assert_eq!(status, 0);
    out
}

#[test]
fn copy_gathers_transposed_negative_and_broadcast_layouts() {
    let s = le(&[0i32, 1, 2, 3, 4, 5]);
    let mut out = vec![0; 24];
    let transposed = src(&s, I32, 0, &[4, 12]);
    let status = copy_cast(dst(&mut out, I32, &[8, 4]), transposed, &[3, 2], WRAP);
    assert_eq!((status, from_le::<i32>(&out)), (0, vec![0, 3, 1, 4, 2, 5]));
    let reversed = src(&s, I32, 20, &[-12, -4]);
    let status = copy_cast(dst(&mut out, I32, &[12, 4]), reversed, &[2, 3], WRAP);
    assert_eq!((status, from_le::<i32>(&out)), (0, vec![5, 4, 3, 2, 1, 0]));
    let broadcast = src(&s, I32, 4, &[0, 4]);
    let status = copy_cast(dst(&mut out, I32, &[12, 4]), broadcast, &[2, 3], WRAP);
    assert_eq!((status, from_le::<i32>(&out)), (0, vec![1, 2, 3, 1, 2, 3]));
}

#[test]
fn validation_reports_status_codes_before_any_access() {
    let (s, mut out) = (le(&[1i32, 2, 3]), vec![0; 12]);
    let shifted = src(&s, I32, 4, &[4]);
    let status = copy_cast(dst(&mut out, I32, &[4]), shifted, &[3], WRAP);
    assert_eq!(status, STATUS_SOURCE_BOUNDS);
    let underflow = src(&s, I32, 0, &[-4]);
    let status = copy_cast(dst(&mut out, I32, &[4]), underflow, &[3], WRAP);
    assert_eq!(status, STATUS_SOURCE_BOUNDS);
    let widened = src(&s, I32, 0, &[4]);
    let status = copy_cast(dst(&mut out, F64, &[8]), widened, &[3], WRAP);
    assert_eq!(status, STATUS_DESTINATION_BOUNDS);
    let rank = src(&s, I32, 0, &[4, 4]);
    let status = copy_cast(dst(&mut out, I32, &[4]), rank, &[3], WRAP);
    assert_eq!(status, STATUS_INVALID_RANK);
    let overflowing = layout_within(usize::MAX, &[u32::MAX; 2], &[i32::MAX; 2], 0, 1);
    assert!(!overflowing);
    let edge = PadAxes {
        out_shape: &[2],
        src_shape: &[0],
        before: &[1],
    };
    let empty = src(&[], U8, 0, &[1]);
    let status = pad(dst(&mut out, U8, &[1]), empty, edge, PadMode::Edge, &[0; 8]);
    assert_eq!(status, STATUS_INVALID_SHAPE);
    let (ty, tx) = (csr(&[&[(0, 1.0)]]), csr(&[&[(0, 1.0)], &[(3, 1.0)]]));
    let row = src(&[7, 8, 9], U8, 0, &[3, 1]);
    let table = tables(&ty, &tx, (1, 3), [0.0; 2], false);
    let status = resize(dst(&mut out, U8, &[2, 1]), row, &[1, 2], table);
    assert_eq!(status, STATUS_INVALID_TABLE);
    let params = AffineParams {
        axis: Some(0),
        a: &[1.0, 2.0],
        b: &[0.0, 0.0],
        form: AffineForm::ScaleOffset,
    };
    let bytes = src(&s, U8, 0, &[1]);
    let status = affine(dst(&mut out, U8, &[1]), bytes, &[5], params);
    assert_eq!(status, STATUS_INVALID_PARAMETERS);
}

#[test]
fn casts_follow_rust_as_semantics() {
    assert_eq!(cast_one(&le(&[200i32]), I32, I8, WRAP), [(-56i8) as u8]);
    assert_eq!(cast_one(&le(&[200i32]), I32, I8, SATURATE), [127]);
    let large = le(&[4_000_000_000u32]);
    assert_eq!(cast_one(&large, U32, I32, WRAP), le(&[-294_967_296i32]));
    assert_eq!(cast_one(&large, U32, I32, SATURATE), le(&[i32::MAX]));
    assert_eq!(to_int::<i32, true, false>(-2.7), -2);
    assert_eq!(to_int::<i32, true, false>(3.0e9), i32::MAX);
    assert_eq!(to_int::<u8, true, false>(f64::NAN), 0);
    assert_eq!(to_int::<u8, true, false>(f64::INFINITY), 255);
    assert_eq!(to_int::<u32, true, true>(2.5), 2);
    assert_eq!(to_int::<i8, true, true>(-127.5), -128);
    assert_eq!(to_int::<u8, false, false>(300.7), 44);
    assert_eq!(to_int::<i32, false, false>(1.0e20), 1661992960);
    assert_eq!(to_int::<u32, false, false>(f64::INFINITY), 0);
    let to_f32 = |bytes: Vec<u8>, from| from_le::<f32>(&cast_one(&bytes, from, F32, WRAP))[0];
    assert_eq!(to_f32(le(&[1.0 + 2f64.powi(-24)]), F64), 1.0);
    assert_eq!(to_f32(le(&[1.5 * 2f64.powi(-149)]), F64).to_bits(), 2);
    assert_eq!(to_f32(le(&[3.5e38f64]), F64), f32::INFINITY);
    assert_eq!(to_f32(le(&[16_777_217u32]), U32), 16_777_216.0);
    assert_eq!(to_f32(le(&[16_777_219u32]), U32), 16_777_220.0);
    let payload = le(&[f32::from_bits(0x7FA0_0001)]);
    assert_eq!(cast_one(&payload, F32, F32, WRAP), payload);
    let payload = le(&[f64::from_bits(0xFFF8_0000_DEAD_BEEF)]);
    assert_eq!(cast_one(&payload, F64, F64, WRAP), payload);
}

#[test]
fn pad_index_maps_and_constant_writes_match_numpy() {
    let map = |mode, n, lo, hi| (lo..hi).map(|i| pad_index(i, n, mode)).collect::<Vec<_>>();
    let reflect = [1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1];
    assert_eq!(map(PadMode::Reflect, 3, -5, 8), reflect);
    let symmetric = [1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1];
    assert_eq!(map(PadMode::Symmetric, 3, -5, 8), symmetric);
    let wrap = [1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1];
    assert_eq!(map(PadMode::Wrap, 3, -5, 8), wrap);
    assert_eq!(map(PadMode::Edge, 3, -2, 5), [0, 0, 0, 1, 2, 2, 2]);
    assert_eq!(map(PadMode::Constant, 3, -1, 4), [-1, 0, 1, 2, -1]);
    assert_eq!(map(PadMode::Reflect, 1, -3, 4), [0; 7]);
    let (s, mut out) = (le(&[1.5f64, -2.5]), vec![0; 40]);
    let value = f64::from_bits(0x7FF8_0000_0000_1234);
    let axes = PadAxes {
        out_shape: &[5],
        src_shape: &[2],
        before: &[2],
    };
    let (reversed, constant) = (src(&s, F64, 8, &[-8]), le(&[value]));
    let status = pad(
        dst(&mut out, F64, &[8]),
        reversed,
        axes,
        PadMode::Constant,
        &constant,
    );
    assert_eq!((status, out), (0, le(&[value, value, -2.5, 1.5, value])));
}

#[test]
fn affine_uses_separate_f64_operations_and_rounds_integer_outputs() {
    let scaled = affine_value(0.1, 3.0, 0.7, AffineForm::ScaleOffset);
    assert_eq!(scaled, 0.1 * 3.0 + 0.7);
    let standardized = affine_value(0.5, 0.485, 0.229, AffineForm::MeanStd);
    assert_eq!(standardized, (0.5 - 0.485) / 0.229);
    let (s, mut out) = (le(&[0.5f32, 1.5, 2.5, -1.0e10, f32::NAN]), vec![0; 5]);
    let params = AffineParams {
        axis: None,
        a: &[1.0],
        b: &[0.0],
        form: AffineForm::ScaleOffset,
    };
    let status = affine(dst(&mut out, U8, &[1]), src(&s, F32, 0, &[4]), &[5], params);
    assert_eq!((status, out), (0, vec![0, 2, 2, 0, 0]));
}

#[test]
fn resize_gathers_tables_with_the_fixed_summation_order() {
    let v = [1.5f64, -2.25, 3.0, 0.125, 5.5, -7.75, 9.0, 0.3, -1.1];
    let (s, mut out) = (le(&v), vec![0; 72]);
    let ty = csr(&[
        &[(0, 1.0)],
        &[(2, 0.25), (0, 0.75)],
        &[(1, 0.5), (2, 0.375), (0, 0.125)],
    ]);
    let tx = csr(&[
        &[(1, 1.0)],
        &[(0, 0.3), (2, 0.7)],
        &[(2, -0.2), (1, 0.6), (0, 0.6)],
    ]);
    let input = src(&s, F64, 0, &[24, 8]);
    let status = resize(
        dst(&mut out, F64, &[24, 8]),
        input,
        &[3, 3],
        tables(&ty, &tx, (3, 3), [0.0; 2], true),
    );
    let at = |y: usize, x: usize| v[3 * y + x];
    let row = |y: usize, x: usize| -> f64 {
        match x {
            0 => at(y, 1),
            1 => at(y, 0) * 0.3 + at(y, 2) * 0.7,
            _ => at(y, 2) * -0.2 + at(y, 1) * 0.6 + at(y, 0) * 0.6,
        }
    };
    let expected: Vec<f64> = (0..9)
        .map(|k| {
            let x = k % 3;
            match k / 3 {
                0 => row(0, x),
                1 => row(2, x) * 0.25 + row(0, x) * 0.75,
                _ => row(1, x) * 0.5 + row(2, x) * 0.375 + row(0, x) * 0.125,
            }
        })
        .collect();
    assert_eq!((status, out), (0, le(&expected)));
    let (s, mut out) = (le(&[1.0e16f64, 1.0, -1.0e16]), vec![0; 8]);
    let (ty, tx) = (csr(&[&[(0, 1.0)]]), csr(&[&[(0, 1.0), (1, 1.0), (2, 1.0)]]));
    let input = src(&s, F64, 0, &[24, 8]);
    let table = tables(&ty, &tx, (1, 3), [0.0; 2], true);
    let status = resize(dst(&mut out, F64, &[8, 8]), input, &[1, 1], table);
    assert_eq!((status, from_le::<f64>(&out)), (0, vec![0.0]));
    let payload = f64::from_bits(0x7FF0_0000_0000_0001);
    let values = [f64::INFINITY, -0.0, payload, f64::NEG_INFINITY];
    let (s, mut out) = (le(&values), vec![0; 32]);
    let ty = csr(&[&[(0, 1.0)]]);
    let tx = csr(&[&[(0, 1.0)], &[(1, 1.0)], &[(2, 1.0)], &[(3, 1.0)]]);
    let input = src(&s, F64, 0, &[32, 8]);
    let table = tables(&ty, &tx, (1, 4), [0.0; 2], true);
    let status = resize(dst(&mut out, F64, &[32, 8]), input, &[1, 4], table);
    assert_eq!((status, out), (0, le(&values)));
}

#[test]
fn resize_rejects_invalid_tap_tables() {
    let s = le(&[1.0f32, 2.0, 3.0]);
    let mut out = vec![0; 8];
    let check = |ty: &Csr, tx: &Csr, weighted: bool, out: &mut [u8]| {
        let table = tables(ty, tx, (1, 3), [0.0; 2], weighted);
        resize(
            dst(out, F32, &[8, 4]),
            src(&s, F32, 0, &[12, 4]),
            &[1, 2],
            table,
        )
    };
    let ty = csr(&[&[(0, 1.0)]]);
    let valid = csr(&[&[(0, 0.5), (1, 0.5)], &[(-1, 0.25), (2, 0.75)]]);
    assert_eq!(check(&ty, &valid, true, &mut out), 0);
    let edit = |f: &dyn Fn(&mut Csr)| {
        let mut table = csr(&[&[(0, 0.5), (1, 0.5)], &[(-1, 0.25), (2, 0.75)]]);
        f(&mut table);
        table
    };
    let cases = [
        edit(&|t| t.off[0] = 1),
        edit(&|t| t.off[1] = 0),
        edit(&|t| t.off[1] = 4),
        edit(&|t| t.off[2] = 3),
        edit(&|t| t.off.push(4)),
        edit(&|t| t.idx[1] = 3),
        edit(&|t| t.idx[1] = -2),
        edit(&|t| t.w[0] = 0.0),
        edit(&|t| t.w[3] = -0.0),
        edit(&|t| t.w[0] = f64::NAN),
        edit(&|t| t.w[2] = f64::INFINITY),
        edit(&|t| {
            t.idx.pop();
        }),
    ];
    for (k, tx) in cases.iter().enumerate() {
        let status = check(&ty, tx, true, &mut out);
        assert_eq!(status, STATUS_INVALID_TABLE, "case {k}");
    }
    let two = csr(&[&[(0, 1.0), (1, 1.0)], &[(2, 1.0)]]);
    let constant = csr(&[&[(0, 1.0)], &[(-1, 1.0)]]);
    let nearest = csr(&[&[(0, 1.0)], &[(2, 1.0)]]);
    assert_eq!(check(&ty, &two, false, &mut out), STATUS_INVALID_TABLE);
    assert_eq!(check(&ty, &constant, false, &mut out), STATUS_INVALID_TABLE);
    assert_eq!(check(&ty, &nearest, false, &mut out), 0);
    assert_eq!(from_le::<f32>(&out), [1.0, 3.0]);
}

#[test]
fn resize_constant_rows_contribute_exactly_the_value() {
    let (s, mut out) = (le(&[2.0f64, 4.0]), vec![0; 8]);
    let ty = csr(&[&[(-1, 0.5), (0, 0.5)]]);
    let tx = csr(&[&[(0, 0.75), (1, 0.75)]]);
    let input = src(&s, F64, 0, &[16, 8]);
    let table = tables(&ty, &tx, (1, 2), [3.0, 0.0], true);
    let status = resize(dst(&mut out, F64, &[8, 8]), input, &[1, 1], table);
    assert_eq!(
        (status, from_le::<f64>(&out)),
        (0, vec![0.5 * 3.0 + 0.5 * 4.5])
    );
}

#[test]
fn resize_handles_complex_and_raw_nearest_gathers() {
    let ty = csr(&[&[(0, 1.0)]]);
    let tx = csr(&[&[(-1, 0.25), (0, 0.25), (1, 0.5)]]);
    let expected = [
        10.0 * 0.25 + 0.25 + 3.0 * 0.5,
        -20.0 * 0.25 - 0.25 + 5.0 * 0.5,
    ];
    let (s, mut out) = (le(&[1.0f32, -1.0, 3.0, 5.0]), vec![0; 8]);
    let table = tables(&ty, &tx, (1, 2), [10.0, -20.0], true);
    let status = resize(
        dst(&mut out, C64, &[8, 8]),
        src(&s, C64, 0, &[16, 8]),
        &[1, 1],
        table,
    );
    assert_eq!(
        (status, from_le::<f32>(&out)),
        (0, expected.map(|v| v as f32).to_vec())
    );
    let (s, mut out) = (le(&[1.0f64, -1.0, 3.0, 5.0]), vec![0; 16]);
    let table = tables(&ty, &tx, (1, 2), [10.0, -20.0], true);
    let status = resize(
        dst(&mut out, C128, &[16, 16]),
        src(&s, C128, 0, &[32, 16]),
        &[1, 1],
        table,
    );
    assert_eq!((status, from_le::<f64>(&out)), (0, expected.to_vec()));
    let (s, mut out) = (le(&[2.0f32, 4.0]), vec![0xFF; 8]);
    let tx = csr(&[&[(0, -0.5), (1, 1.5)]]);
    let table = tables(&ty, &tx, (1, 2), [0.0; 2], true);
    let status = resize(
        dst(&mut out, C64, &[8, 8]),
        src(&s, F32, 0, &[8, 4]),
        &[1, 1],
        table,
    );
    assert_eq!((status, out), (0, le(&[5.0f32, 0.0])));
    let (s, mut out) = (le(&[1.0f32, -1.0]), vec![0; 8]);
    let tx = csr(&[&[(0, 1.0)]]);
    for weighted in [true, false] {
        let table = tables(&ty, &tx, (1, 1), [0.0; 2], weighted);
        let status = resize(
            dst(&mut out, F32, &[8, 8]),
            src(&s, C64, 0, &[8, 8]),
            &[1, 1],
            table,
        );
        assert_eq!(status, STATUS_INVALID_DTYPE);
    }
    let snan = f32::from_bits(0x7FA0_0001);
    let (s, mut out) = (le(&[snan, 1.0]), vec![0; 12]);
    let tx = csr(&[&[(0, 1.0)], &[(1, 1.0)], &[(0, 1.0)]]);
    let table = tables(&ty, &tx, (1, 2), [0.0; 2], false);
    let status = resize(
        dst(&mut out, F32, &[12, 4]),
        src(&s, F32, 0, &[8, 4]),
        &[1, 3],
        table,
    );
    assert_eq!((status, out), (0, le(&[snan, 1.0, snan])));
    let (s, mut out) = (le(&[1.5f32, -0.25, 2.0, 8.0]), vec![0; 48]);
    let table = tables(&ty, &tx, (1, 2), [0.0; 2], false);
    let status = resize(
        dst(&mut out, C128, &[48, 16]),
        src(&s, C64, 0, &[16, 8]),
        &[1, 3],
        table,
    );
    let widened = le(&[1.5f64, -0.25, 2.0, 8.0, 1.5, -0.25]);
    assert_eq!((status, out), (0, widened));
    let (s, mut out) = (le(&[7u8, 200]), vec![0xFF; 24]);
    let table = tables(&ty, &tx, (1, 2), [0.0; 2], false);
    let status = resize(
        dst(&mut out, C64, &[24, 8]),
        src(&s, U8, 0, &[2, 1]),
        &[1, 3],
        table,
    );
    assert_eq!((status, out), (0, le(&[7.0f32, 0.0, 200.0, 0.0, 7.0, 0.0])));
}

#[test]
fn complex_dtypes_copy_cast_and_pad_by_component() {
    assert_eq!(
        (DType::from_code(8), DType::from_code(9)),
        (Some(C64), Some(C128))
    );
    assert_eq!(DType::from_code(10), None);
    assert_eq!((C64.size(), C128.size()), (8, 16));
    let s = le(&[1.0f32, -1.0, 2.0, -2.0, 3.0, -3.0, 4.0, -4.0]);
    let mut out = vec![0; 32];
    let transposed = src(&s, C64, 0, &[8, 16]);
    let status = copy_cast(dst(&mut out, C64, &[16, 8]), transposed, &[2, 2], WRAP);
    let swapped = le(&[1.0f32, -1.0, 3.0, -3.0, 2.0, -2.0, 4.0, -4.0]);
    assert_eq!((status, &out), (0, &swapped));
    let wide = le(&[1.5f64, -0.5, 2.5, 0.25, -7.0, 8.0]);
    let mut out = vec![0; 48];
    let reversed = src(&wide, C128, 32, &[-16]);
    let status = copy_cast(dst(&mut out, C128, &[16]), reversed, &[3], WRAP);
    let flipped = le(&[-7.0f64, 8.0, 2.5, 0.25, 1.5, -0.5]);
    assert_eq!((status, out), (0, flipped));
    let nan = le(&[f32::from_bits(0x7FA0_0001)]);
    let payload = cast_one(&nan, F32, C64, WRAP);
    assert_eq!(payload, [nan, vec![0; 4]].concat());
    let rounded = |bytes: Vec<u8>, from| from_le::<f32>(&cast_one(&bytes, from, C64, WRAP));
    assert_eq!(rounded(le(&[16_777_217i32]), I32), [16_777_216.0, 0.0]);
    assert_eq!(rounded(le(&[16_777_217u32]), U32), [16_777_216.0, 0.0]);
    assert_eq!(rounded(le(&[1.0 + 2f64.powi(-24)]), F64), [1.0, 0.0]);
    let pair = le(&[0.1f32, -3.0e-45]);
    let exact = from_le::<f64>(&cast_one(&pair, C64, C128, WRAP));
    assert_eq!(exact, [0.1f32 as f64, -3.0e-45f32 as f64]);
    let pair = le(&[1.0 + 2f64.powi(-24), 3.5e38]);
    assert_eq!(
        from_le::<f32>(&cast_one(&pair, C128, C64, WRAP)),
        [1.0, f32::INFINITY]
    );
    let int = from_le::<f64>(&cast_one(&le(&[i32::MIN]), I32, C128, WRAP));
    assert_eq!(int, [i32::MIN as f64, 0.0]);
    let mut real = vec![0; 4];
    let status = copy_cast(dst(&mut real, F32, &[]), src(&s, C64, 0, &[]), &[], WRAP);
    assert_eq!(status, STATUS_INVALID_DTYPE);
    let (s, mut out) = (le(&[1.0f32, 2.0]), vec![0; 24]);
    let axes = PadAxes {
        out_shape: &[3],
        src_shape: &[1],
        before: &[1],
    };
    let constant = le(&[9.0f32, -9.0]);
    let status = pad(
        dst(&mut out, C64, &[8]),
        src(&s, C64, 0, &[8]),
        axes,
        PadMode::Constant,
        &constant,
    );
    assert_eq!((status, out), (0, le(&[9.0f32, -9.0, 1.0, 2.0, 9.0, -9.0])));
    let (s, mut out) = (le(&[1.0f64, 2.0]), vec![0; 48]);
    let axes = PadAxes {
        out_shape: &[3],
        src_shape: &[1],
        before: &[0],
    };
    let constant = le(&[0.5f64, -0.25]);
    let short = pad(
        dst(&mut out, C128, &[16]),
        src(&s, C128, 0, &[16]),
        axes,
        PadMode::Constant,
        &constant[..8],
    );
    assert_eq!(short, STATUS_INVALID_PARAMETERS);
    let axes = PadAxes {
        out_shape: &[3],
        src_shape: &[1],
        before: &[0],
    };
    let status = pad(
        dst(&mut out, C128, &[16]),
        src(&s, C128, 0, &[16]),
        axes,
        PadMode::Constant,
        &constant,
    );
    assert_eq!(
        (status, out),
        (0, le(&[1.0f64, 2.0, 0.5, -0.25, 0.5, -0.25]))
    );
    let params = AffineParams {
        axis: None,
        a: &[1.0],
        b: &[0.0],
        form: AffineForm::ScaleOffset,
    };
    let (s, mut out) = (le(&[1.0f32, 2.0]), vec![0; 8]);
    let status = affine(
        dst(&mut out, C64, &[8]),
        src(&s, F32, 0, &[4]),
        &[1],
        params,
    );
    assert_eq!(status, STATUS_INVALID_DTYPE);
}

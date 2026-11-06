/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::ndarray::DType::{C64, C128, F32, F64, I8, I16, I32, U8, U16, U32};
use crate::ndarray::{
    AffineForm, AffineParams, DType, Destination, Element, IntMode, MAX_RESIZE_LEVELS,
    NO_RESIZE_LEVEL, PadAxes, PadMode, ReduceOp, ReduceOutput, ReduceSpec, ResizeLevel,
    ResizeTables, STATUS_DESTINATION_BOUNDS, STATUS_INVALID_DTYPE, STATUS_INVALID_PARAMETERS,
    STATUS_INVALID_RANK, STATUS_INVALID_SHAPE, STATUS_INVALID_TABLE, STATUS_OK,
    STATUS_SOURCE_BOUNDS, Source, affine, affine_value, copy_cast, f32_order_key, f64_order_key,
    layout_within, numel, offset_bytes, pad, pad_index, reduce, reduce_with_tile, resize,
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
    levels: &[(usize, u32, &'a Csr)],
    value: [f64; 2],
    weighted: bool,
) -> ResizeTables<'a> {
    let mut t = ResizeTables {
        levels: [NO_RESIZE_LEVEL; MAX_RESIZE_LEVELS],
        count: levels.len(),
        value,
        constant: [0; 16],
        weighted,
    };
    for (slot, &(axis, src, table)) in t.levels.iter_mut().zip(levels) {
        *slot = ResizeLevel {
            axis,
            src,
            off: &table.off,
            idx: &table.idx,
            w: &table.w,
        };
    }
    t
}

fn tables2<'a>(
    y: &'a Csr,
    x: &'a Csr,
    n: (u32, u32),
    value: [f64; 2],
    weighted: bool,
) -> ResizeTables<'a> {
    tables(&[(0, n.0, y), (1, n.1, x)], value, weighted)
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
    let table = tables2(&ty, &tx, (1, 3), [0.0; 2], false);
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
        tables2(&ty, &tx, (3, 3), [0.0; 2], true),
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
    let table = tables2(&ty, &tx, (1, 3), [0.0; 2], true);
    let status = resize(dst(&mut out, F64, &[8, 8]), input, &[1, 1], table);
    assert_eq!((status, from_le::<f64>(&out)), (0, vec![0.0]));
    let payload = f64::from_bits(0x7FF0_0000_0000_0001);
    let values = [f64::INFINITY, -0.0, payload, f64::NEG_INFINITY];
    let (s, mut out) = (le(&values), vec![0; 32]);
    let ty = csr(&[&[(0, 1.0)]]);
    let tx = csr(&[&[(0, 1.0)], &[(1, 1.0)], &[(2, 1.0)], &[(3, 1.0)]]);
    let input = src(&s, F64, 0, &[32, 8]);
    let table = tables2(&ty, &tx, (1, 4), [0.0; 2], true);
    let status = resize(dst(&mut out, F64, &[32, 8]), input, &[1, 4], table);
    assert_eq!((status, out), (0, le(&values)));
}

#[test]
fn resize_rejects_invalid_tap_tables() {
    let s = le(&[1.0f32, 2.0, 3.0]);
    let mut out = vec![0; 8];
    let check = |ty: &Csr, tx: &Csr, weighted: bool, out: &mut [u8]| {
        let table = tables2(ty, tx, (1, 3), [0.0; 2], weighted);
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
    let below = csr(&[&[(0, 1.0)], &[(-2, 1.0)]]);
    let nearest = csr(&[&[(0, 1.0)], &[(2, 1.0)]]);
    assert_eq!(check(&ty, &two, false, &mut out), STATUS_INVALID_TABLE);
    assert_eq!(check(&ty, &below, false, &mut out), STATUS_INVALID_TABLE);
    assert_eq!(check(&ty, &nearest, false, &mut out), 0);
    assert_eq!(from_le::<f32>(&out), [1.0, 3.0]);
}

#[test]
fn resize_rejects_invalid_level_layouts() {
    let s = le(&[1.0f32, 2.0, 3.0, 4.0, 5.0, 6.0]);
    let mut out = vec![0; 24];
    let one = csr(&[&[(0, 1.0)], &[(1, 1.0)]]);
    let three = csr(&[&[(0, 1.0)], &[(1, 1.0)], &[(2, 1.0)]]);
    let mut run = |t: ResizeTables| {
        resize(
            dst(&mut out, F32, &[12, 4]),
            src(&s, F32, 0, &[12, 4]),
            &[2, 3],
            t,
        )
    };
    assert_eq!(
        run(tables(&[(0, 2, &one), (1, 3, &three)], [0.0; 2], false)),
        0
    );
    let invalid = [
        tables(&[(1, 3, &three), (0, 2, &one)], [0.0; 2], false),
        tables(&[(1, 3, &three), (1, 3, &three)], [0.0; 2], false),
        tables(&[(0, 2, &one), (2, 3, &three)], [0.0; 2], false),
        tables(&[], [0.0; 2], false),
        ResizeTables {
            count: MAX_RESIZE_LEVELS + 1,
            ..tables(&[(0, 2, &one), (1, 3, &three)], [0.0; 2], false)
        },
    ];
    for (k, t) in invalid.into_iter().enumerate() {
        assert_eq!(run(t), STATUS_INVALID_PARAMETERS, "layout {k}");
    }
    let short = Csr {
        off: vec![0, 1, 3],
        idx: vec![0, 1],
        w: vec![1.0, 1.0],
    };
    let beyond = csr(&[&[(0, 1.0)], &[(1, 1.0)], &[(3, 1.0)]]);
    let below = csr(&[&[(0, 1.0)], &[(-2, 1.0)], &[(2, 1.0)]]);
    for table in [&short, &beyond, &below] {
        let status = run(tables(&[(0, 2, &one), (1, 3, table)], [0.0; 2], false));
        assert_eq!(status, STATUS_INVALID_TABLE);
    }
    let mut empty = vec![0; 4];
    let status = resize(
        dst(&mut empty, F32, &[]),
        src(&s, F32, 0, &[]),
        &[],
        tables(&[(0, 1, &one)], [0.0; 2], false),
    );
    assert_eq!(status, STATUS_INVALID_RANK);
}

#[test]
fn resize_sums_three_levels_with_the_fixed_summation_order() {
    let v: Vec<f64> = (0..12)
        .map(|i| (i as f64 * 0.37).sin() * 10.0 - 1.5)
        .collect();
    let (s, mut out) = (le(&v), vec![0; 64]);
    let tz = csr(&[&[(1, 0.25), (0, 0.75)], &[(-1, 0.5), (1, 0.5)]]);
    let ty = csr(&[&[(2, 0.6), (0, -0.2), (1, 0.6)], &[(1, 1.0)]]);
    let tx = csr(&[&[(1, 0.3), (0, 0.7)], &[(0, 1.0)]]);
    let input = src(&s, F64, 0, &[48, 16, 8]);
    let levels = [(0, 2, &tz), (1, 3, &ty), (2, 2, &tx)];
    let status = resize(
        dst(&mut out, F64, &[32, 16, 8]),
        input,
        &[2, 2, 2],
        tables(&levels, [-3.0, 0.0], true),
    );
    let at = |z: usize, y: usize, x: usize| v[6 * z + 2 * y + x];
    let row = |z: usize, y: usize, ox: usize| match ox {
        0 => at(z, y, 1) * 0.3 + at(z, y, 0) * 0.7,
        _ => at(z, y, 0),
    };
    let plane = |z: usize, oy: usize, ox: usize| match oy {
        0 => row(z, 2, ox) * 0.6 + row(z, 0, ox) * -0.2 + row(z, 1, ox) * 0.6,
        _ => row(z, 1, ox),
    };
    let expected: Vec<f64> = (0..8)
        .map(|k| {
            let (oz, oy, ox) = (k / 4, (k / 2) % 2, k % 2);
            match oz {
                0 => plane(1, oy, ox) * 0.25 + plane(0, oy, ox) * 0.75,
                _ => -3.0 * 0.5 + plane(1, oy, ox) * 0.5,
            }
        })
        .collect();
    assert_eq!((status, out), (0, le(&expected)));
}

#[test]
fn resize_constant_taps_at_outer_levels_skip_their_inner_levels() {
    let (s, mut out) = (le(&[f64::NAN, f64::INFINITY, 2.0, 4.0]), vec![0; 16]);
    let ty = csr(&[&[(-1, 0.75), (1, 0.25)], &[(-1, 1.0)]]);
    let tx = csr(&[&[(0, 0.5), (1, 0.5)]]);
    let input = src(&s, F64, 0, &[16, 8]);
    let status = resize(
        dst(&mut out, F64, &[8, 8]),
        input,
        &[2, 1],
        tables(&[(0, 2, &ty), (1, 2, &tx)], [-1.5, 0.0], true),
    );
    assert_eq!((status, out), (0, le(&[-1.5 * 0.75 + 3.0 * 0.25, -1.5])));
}

#[test]
fn resize_handles_rank_one_and_nearest_constant_bytes() {
    let (s, mut out) = (le(&[1.0f32, 2.0, 4.0]), vec![0; 16]);
    let tx = csr(&[
        &[(0, 0.5), (1, 0.5)],
        &[(2, 1.0)],
        &[(-1, 0.5), (2, 0.5)],
        &[(1, 1.0)],
    ]);
    let status = resize(
        dst(&mut out, F32, &[4]),
        src(&s, F32, 0, &[4]),
        &[4],
        tables(&[(0, 3, &tx)], [8.0, 0.0], true),
    );
    assert_eq!((status, out), (0, le(&[1.5f32, 4.0, 6.0, 2.0])));
    let snan = f32::from_bits(0x7FA0_0001);
    let nearest = csr(&[&[(1, 1.0)], &[(-1, 1.0)], &[(0, 1.0)]]);
    let rows = csr(&[&[(0, 1.0)], &[(-1, 1.0)]]);
    let mut t = tables(&[(0, 1, &rows), (1, 2, &nearest)], [0.0; 2], false);
    t.constant[..4].copy_from_slice(&snan.to_le_bytes());
    let (s, mut out) = (le(&[1.5f32, -2.5]), vec![0; 24]);
    let status = resize(
        dst(&mut out, F32, &[12, 4]),
        src(&s, F32, 0, &[8, 4]),
        &[2, 3],
        t,
    );
    assert_eq!((status, out), (0, le(&[-2.5, snan, 1.5, snan, snan, snan])));
    let mut t = tables(&[(0, 1, &rows), (1, 2, &nearest)], [0.0; 2], false);
    t.constant[..2].copy_from_slice(&(-7i16).to_le_bytes());
    let (s, mut out) = (le(&[200u8, 7]), vec![0; 12]);
    let status = resize(
        dst(&mut out, I16, &[6, 2]),
        src(&s, U8, 0, &[2, 1]),
        &[2, 3],
        t,
    );
    assert_eq!(
        (status, from_le::<i16>(&out)),
        (0, vec![7, -7, 200, -7, -7, -7])
    );
    let tx = csr(&[&[(1, 1.0)], &[(-1, 1.0)]]);
    let mut t = tables(&[(0, 2, &tx)], [0.0; 2], false);
    t.constant[..8].copy_from_slice(&le(&[0.5f32, -0.25]));
    let (s, mut out) = (le(&[1.0f32, -1.0, 3.0, -3.0]), vec![0; 16]);
    let status = resize(dst(&mut out, C64, &[8]), src(&s, C64, 0, &[8]), &[2], t);
    assert_eq!((status, out), (0, le(&[3.0f32, -3.0, 0.5, -0.25])));
    let mut t = tables(&[(0, 2, &tx)], [0.0; 2], false);
    t.constant.copy_from_slice(&le(&[0.5f64, -0.25]));
    let (s, mut out) = (le(&[1.0f32, 3.0]), vec![0xFF; 32]);
    let status = resize(dst(&mut out, C128, &[16]), src(&s, F32, 0, &[4]), &[2], t);
    assert_eq!((status, out), (0, le(&[3.0f64, 0.0, 0.5, -0.25])));
}

#[test]
fn resize_constant_rows_contribute_exactly_the_value() {
    let (s, mut out) = (le(&[2.0f64, 4.0]), vec![0; 8]);
    let ty = csr(&[&[(-1, 0.5), (0, 0.5)]]);
    let tx = csr(&[&[(0, 0.75), (1, 0.75)]]);
    let input = src(&s, F64, 0, &[16, 8]);
    let table = tables2(&ty, &tx, (1, 2), [3.0, 0.0], true);
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
    let table = tables2(&ty, &tx, (1, 2), [10.0, -20.0], true);
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
    let table = tables2(&ty, &tx, (1, 2), [10.0, -20.0], true);
    let status = resize(
        dst(&mut out, C128, &[16, 16]),
        src(&s, C128, 0, &[32, 16]),
        &[1, 1],
        table,
    );
    assert_eq!((status, from_le::<f64>(&out)), (0, expected.to_vec()));
    let (s, mut out) = (le(&[2.0f32, 4.0]), vec![0xFF; 8]);
    let tx = csr(&[&[(0, -0.5), (1, 1.5)]]);
    let table = tables2(&ty, &tx, (1, 2), [0.0; 2], true);
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
        let table = tables2(&ty, &tx, (1, 1), [0.0; 2], weighted);
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
    let table = tables2(&ty, &tx, (1, 2), [0.0; 2], false);
    let status = resize(
        dst(&mut out, F32, &[12, 4]),
        src(&s, F32, 0, &[8, 4]),
        &[1, 3],
        table,
    );
    assert_eq!((status, out), (0, le(&[snan, 1.0, snan])));
    let (s, mut out) = (le(&[1.5f32, -0.25, 2.0, 8.0]), vec![0; 48]);
    let table = tables2(&ty, &tx, (1, 2), [0.0; 2], false);
    let status = resize(
        dst(&mut out, C128, &[48, 16]),
        src(&s, C64, 0, &[16, 8]),
        &[1, 3],
        table,
    );
    let widened = le(&[1.5f64, -0.25, 2.0, 8.0, 1.5, -0.25]);
    assert_eq!((status, out), (0, widened));
    let (s, mut out) = (le(&[7u8, 200]), vec![0xFF; 24]);
    let table = tables2(&ty, &tx, (1, 2), [0.0; 2], false);
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

const NAN_32: u32 = 0x7FC0_0000;
const NAN_64: f64 = f64::from_bits(0x7FF8_0000_0000_0000);

fn spec(op: ReduceOp) -> ReduceSpec {
    ReduceSpec {
        op,
        omit: false,
        saturate: true,
        ddof: 0.0,
    }
}

fn omit(op: ReduceOp) -> ReduceSpec {
    ReduceSpec {
        omit: true,
        ..spec(op)
    }
}

fn wrap(op: ReduceOp) -> ReduceSpec {
    ReduceSpec {
        saturate: false,
        ..spec(op)
    }
}

fn ddof(op: ReduceOp, ddof: f64, omit: bool) -> ReduceSpec {
    ReduceSpec {
        ddof,
        omit,
        ..spec(op)
    }
}

fn output(bytes: &mut [u8], dtype: DType) -> ReduceOutput<'_> {
    ReduceOutput {
        bytes,
        dtype,
        offset: 0,
    }
}

fn flags_of(ndim: usize, axes: &[usize]) -> Vec<u32> {
    (0..ndim).map(|d| axes.contains(&d) as u32).collect()
}

struct View<'a>(&'a [u8], DType, u32, &'a [i32], &'a [u32]);

fn reduce_view(
    v: &View,
    axes: &[usize],
    out: DType,
    s: ReduceSpec,
    tile: Option<usize>,
) -> Vec<u8> {
    let flags = flags_of(v.4.len(), axes);
    let kept: usize =
        v.4.iter()
            .zip(&flags)
            .filter(|(_, f)| **f == 0)
            .map(|(n, _)| *n as usize)
            .product();
    let mut bytes = vec![0xAAu8; kept * out.size()];
    let status = reduce_with_tile(
        output(&mut bytes, out),
        None,
        src(v.0, v.1, v.2, v.3),
        v.4,
        &flags,
        s,
        tile,
    );
    assert_eq!(status, STATUS_OK, "{:?} over {axes:?} of {:?}", s.op, v.4);
    bytes
}

fn reduce_c<T: Element>(
    values: &[T],
    from: DType,
    shape: &[u32],
    axes: &[usize],
    out: DType,
    s: ReduceSpec,
) -> Vec<u8> {
    let mut strides = vec![0i32; shape.len()];
    assert_eq!(
        strides_row_major(&mut strides, shape, from.size() as u32),
        1
    );
    reduce_view(
        &View(&le(values), from, 0, &strides, shape),
        axes,
        out,
        s,
        None,
    )
}

macro_rules! reduce_cases {
    ($($values:expr, $from:expr, $shape:expr, $axes:expr, $out:expr, $spec:expr => $want:expr;)+) => {
        $(assert_eq!(reduce_c(&$values, $from, &$shape, &$axes, $out, $spec), le(&$want), "{} with {}", stringify!($values), stringify!($spec));)+
    };
}

fn f32_data(n: usize) -> Vec<f32> {
    let mut state = 0x2545_F491u32;
    (0..n)
        .map(|_| {
            state ^= state << 13;
            state ^= state >> 17;
            state ^= state << 5;
            let unit = (state >> 8) as f32 / 16_777_216.0;
            (unit - 0.5) * 2f32.powi((state & 31) as i32 - 15)
        })
        .collect()
}

fn canonical_sum(values: &[f64]) -> f64 {
    let mut stack: Vec<(f64, u32)> = Vec::new();
    for block in values.chunks(64) {
        let mut sum = block[0];
        for &v in &block[1..] {
            sum += v;
        }
        let mut entry = (sum, 0);
        while stack.last().is_some_and(|top| top.1 == entry.1) {
            let older = stack.pop().unwrap();
            entry = (older.0 + entry.0, entry.1 + 1);
        }
        stack.push(entry);
    }
    let mut acc = stack.pop().map_or(0.0, |top| top.0);
    while let Some(entry) = stack.pop() {
        acc += entry.0;
    }
    acc
}

#[test]
fn reduce_sums_follow_the_canonical_block_and_cascade_order() {
    let data: Vec<f64> = (0..1000)
        .map(|i| {
            (if i % 2 == 0 { 1e16 } else { -1e16 }) * (1.0 + (i % 7) as f64) + (i as f64) * 0.1
        })
        .collect();
    let want = canonical_sum(&data);
    assert_ne!(
        want.to_bits(),
        data.iter().fold(-0.0, |a, b| a + b).to_bits(),
        "The data must distinguish the order"
    );
    assert_eq!(
        reduce_c(&data, F64, &[1000], &[0], F64, spec(ReduceOp::Sum)),
        le(&[want])
    );
    reduce_cases! {
        [-0.0f64, -0.0], F64, [2], [0], F64, spec(ReduceOp::Sum) => [-0.0f64];
        [-0.0f64, 0.0], F64, [2], [0], F64, spec(ReduceOp::Sum) => [0.0f64];
    }
}

#[test]
fn reduce_results_do_not_depend_on_layouts_or_tile_widths() {
    let (ny, nx) = (37usize, 211usize);
    let data = f32_data(ny * nx);
    let mut fortran = vec![0f32; ny * nx];
    for y in 0..ny {
        for x in 0..nx {
            fortran[x * ny + y] = data[y * nx + x];
        }
    }
    let flipped: Vec<f32> = data.iter().rev().copied().collect();
    let (c, f, r) = (le(&data), le(&fortran), le(&flipped));
    let shape = [ny as u32, nx as u32];
    let (cs, fs, rs) = (
        [nx as i32 * 4, 4],
        [4, ny as i32 * 4],
        [-(nx as i32) * 4, -4],
    );
    let (cv, fv) = (View(&c, F32, 0, &cs, &shape), View(&f, F32, 0, &fs, &shape));
    let rv = View(&r, F32, ((ny * nx - 1) * 4) as u32, &rs, &shape);
    for op in [ReduceOp::Sum, ReduceOp::Var, ReduceOp::Max] {
        for axes in [&[0usize][..], &[1], &[0, 1], &[]] {
            let base = reduce_view(&cv, axes, F32, spec(op), None);
            assert_eq!(
                reduce_view(&fv, axes, F32, spec(op), None),
                base,
                "{op:?} {axes:?} Fortran"
            );
            assert_eq!(
                reduce_view(&rv, axes, F32, spec(op), None),
                base,
                "{op:?} {axes:?} flipped"
            );
            for tile in [1, 7, 256] {
                assert_eq!(
                    reduce_view(&cv, axes, F32, spec(op), Some(tile)),
                    base,
                    "{op:?} {axes:?} tile {tile}"
                );
            }
        }
    }
    let whole = reduce_view(
        &View(&c, F32, 0, &[4], &[(ny * nx) as u32]),
        &[0],
        F32,
        spec(ReduceOp::Sum),
        None,
    );
    assert_eq!(
        reduce_view(&cv, &[0, 1], F32, spec(ReduceOp::Sum), None),
        whole
    );
    let half = le(&[0.5f32]);
    let broadcast = View(&half, F32, 0, &[0, 0], &[3, 4]);
    assert_eq!(
        reduce_view(&broadcast, &[1], F32, spec(ReduceOp::Sum), None),
        le(&[2.0f32; 3])
    );
    let cube: Vec<f32> = (0..24).map(|i| i as f32).collect();
    let bytes = le(&cube);
    let permuted = View(&bytes, F32, 0, &[4, 24, 8], &[2, 4, 3]);
    let want = [6.0f32, 24.0, 42.0, 60.0, 9.0, 27.0, 45.0, 63.0];
    assert_eq!(
        reduce_view(&permuted, &[2], F32, spec(ReduceOp::Sum), None),
        le(&want)
    );
}

#[test]
fn reduce_integers_are_exact_with_saturation_and_wrapping() {
    let (sum, prod) = (ReduceOp::Sum, ReduceOp::Prod);
    reduce_cases! {
        [u32::MAX; 5], U32, [5], [0], U32, spec(sum) => [u32::MAX];
        [u32::MAX; 5], U32, [5], [0], U32, wrap(sum) => [u32::MAX.wrapping_mul(5)];
        [u32::MAX; 5], U32, [5], [0], F64, spec(sum) => [5.0f64 * 4294967295.0];
        [u32::MAX; 5], U32, [5], [0], F32, spec(sum) => [(5u64 * 4294967295) as f32];
        [i32::MIN; 3], I32, [3], [0], I32, spec(sum) => [i32::MIN];
        [i32::MIN; 3], I32, [3], [0], I32, wrap(sum) => [i32::MIN];
        [i32::MIN; 3], I32, [3], [0], F64, spec(sum) => [3.0f64 * -2147483648.0];
        [200u8, 100], U8, [2], [0], U8, spec(sum) => [255u8];
        [200u8, 100], U8, [2], [0], U8, wrap(sum) => [44u8];
        [-5i8, 1], I8, [2], [0], U8, spec(sum) => [0u8];
        [-100i8, -100], I8, [2], [0], I8, wrap(sum) => [56i8];
        [16777216i32, 1], I32, [2], [0], F32, spec(sum) => [16777216.0f32];
        [16777217i32, 2], I32, [2], [0], F32, spec(sum) => [16777220.0f32];
        [65536u32, 65536, 3], U32, [3], [0], U32, spec(prod) => [0u32];
        [-3i16, 5, 7], I16, [3], [0], I32, spec(prod) => [-105i32];
        [65537i32, 65537], I32, [2], [0], I32, spec(prod) => [131073i32];
        [-3i16, 5], I16, [2], [0], F32, spec(prod) => [-15.0f32];
    }
}

#[test]
fn reduce_order_keys_form_a_total_order_with_the_documented_ties() {
    let f32s = [
        f32::NEG_INFINITY,
        -1e30,
        -1.0,
        -f32::from_bits(1),
        -0.0,
        0.0,
        f32::from_bits(1),
        1.0,
        1e30,
        f32::INFINITY,
    ];
    assert!(
        f32s.windows(2)
            .all(|p| f32_order_key(p[0]) < f32_order_key(p[1]))
    );
    let f64s = [
        f64::NEG_INFINITY,
        -1e300,
        -1.0,
        -f64::from_bits(1),
        -0.0,
        0.0,
        f64::from_bits(1),
        1.0,
        1e300,
        f64::INFINITY,
    ];
    assert!(
        f64s.windows(2)
            .all(|p| f64_order_key(p[0]) < f64_order_key(p[1]))
    );
    let (min, max, argmin, argmax) = (
        ReduceOp::Min,
        ReduceOp::Max,
        ReduceOp::ArgMin,
        ReduceOp::ArgMax,
    );
    let (signaling, quiet) = (f32::from_bits(0xFFA0_0001), f32::from_bits(0x7FC1_2345));
    let grid = [5.0f32, 1.0, 7.0, 9.0, 0.5, 2.0];
    reduce_cases! {
        [0.0f32, -0.0], F32, [2], [0], F32, spec(min) => [-0.0f32];
        [-0.0f32, 0.0], F32, [2], [0], F32, spec(max) => [0.0f32];
        [0.0f32, -0.0], F32, [2], [0], U32, spec(argmin) => [0u32];
        [0.0f32, -0.0], F32, [2], [0], U32, spec(argmax) => [0u32];
        [1.0f32, -0.0, 0.0], F32, [3], [0], U32, spec(argmin) => [1u32];
        [1.0f32, signaling, -1.0], F32, [3], [0], F32, spec(min) => [NAN_32];
        [1.0f32, quiet, -1.0], F32, [3], [0], F32, spec(max) => [NAN_32];
        [1.0f32, quiet, signaling], F32, [3], [0], U32, spec(argmin) => [1u32];
        [1.0f32, signaling, quiet], F32, [3], [0], U32, spec(argmax) => [1u32];
        [1.0f64, f64::from_bits(0xFFF8_0000_0000_1234)], F64, [2], [0], F64, spec(min) => [NAN_64];
        [quiet, 3.0, signaling, 2.0], F32, [4], [0], F32, omit(min) => [2.0f32];
        [quiet, f32::INFINITY, 2.0], F32, [3], [0], F32, omit(max) => [f32::INFINITY];
        [quiet, signaling], F32, [2], [0], F32, omit(min) => [NAN_32];
        [quiet, signaling], F32, [2], [0], U32, omit(argmin) => [u32::MAX];
        [quiet, 5.0, 5.0], F32, [3], [0], U32, omit(argmax) => [1u32];
        [f32::from_bits(1), 1.0], F32, [2], [0], F32, spec(min) => [1u32];
        [0u32, u32::MAX, 7], U32, [3], [0], U32, spec(min) => [0u32];
        [0u32, u32::MAX, 7], U32, [3], [0], U32, spec(max) => [u32::MAX];
        [0u32, 0], U32, [2], [0], U32, spec(argmax) => [0u32];
        [u32::MAX, u32::MAX], U32, [2], [0], U32, spec(argmin) => [0u32];
        [i32::MIN, i32::MAX], I32, [2], [0], I32, spec(min) => [i32::MIN];
        [-5i16, 4], I16, [2], [0], I16, spec(max) => [4i16];
        [9u16, 65535], U16, [2], [0], U16, spec(max) => [65535u16];
        [-128i8, 127], I8, [2], [0], I8, spec(min) => [-128i8];
        grid, F32, [2, 3], [0, 1], U32, spec(argmin) => [4u32];
        grid, F32, [2, 3], [1], U32, spec(argmax) => [2u32, 0];
        grid, F32, [2, 3], [0], U32, spec(argmin) => [0u32, 1, 1];
    }
}

#[test]
fn reduce_omission_counts_only_the_kept_elements() {
    let nan = f32::NAN;
    let data = [1.0, nan, 3.0, nan, nan, nan];
    let z = [1.0, 2.0, nan, 5.0, 3.0, 6.0];
    let (sum, prod, mean, var) = (ReduceOp::Sum, ReduceOp::Prod, ReduceOp::Mean, ReduceOp::Var);
    reduce_cases! {
        data, F32, [2, 3], [1], F32, omit(sum) => [4.0f32, 0.0];
        data, F32, [2, 3], [1], F32, omit(prod) => [3.0f32, 1.0];
        data, F32, [2, 3], [1], F32, omit(mean) => [2.0f32.to_bits(), NAN_32];
        data, F32, [2, 3], [1], F32, omit(var) => [1.0f32.to_bits(), NAN_32];
        data, F32, [2, 3], [1], F32, ddof(var, 1.0, true) => [2.0f32.to_bits(), NAN_32];
        data, F32, [2, 3], [1], F32, ddof(var, 2.0, true) => [NAN_32, NAN_32];
        [nan], F32, [1], [0], F32, omit(sum) => [0u32];
        data, F32, [2, 3], [1], F32, spec(sum) => [NAN_32, NAN_32];
        [f32::INFINITY, nan, 1.0], F32, [3], [0], F32, omit(sum) => [f32::INFINITY];
        [f32::INFINITY, nan, f32::NEG_INFINITY], F32, [3], [0], F32, omit(sum) => [NAN_32];
        z, C64, [3], [0], C64, omit(sum) => [4.0f32, 8.0];
        z, C64, [3], [0], C64, omit(mean) => [2.0f32, 4.0];
        z, C64, [3], [0], F32, omit(var) => [5.0f32];
        z, C64, [3], [0], C64, spec(sum) => [NAN_32, NAN_32];
    }
}

#[test]
fn reduce_two_pass_variance_survives_large_offsets() {
    let data: Vec<f64> = (0..4096).map(|i| 1e9 + (i % 8) as f64 * 0.25).collect();
    let mean = data.iter().sum::<f64>() / 4096.0;
    let expected = data.iter().map(|v| (v - mean) * (v - mean)).sum::<f64>() / 4096.0;
    let got = f64::from_le_bytes(
        reduce_c(&data, F64, &[4096], &[0], F64, spec(ReduceOp::Var))
            .try_into()
            .unwrap(),
    );
    assert!(
        (got - expected).abs() <= 1e-12 * expected,
        "{got} vs {expected}"
    );
    let std = reduce_c(&data, F64, &[4096], &[0], F64, spec(ReduceOp::Std));
    assert_eq!(std, le(&[got.sqrt()]));
    let big = [u32::MAX, u32::MAX - 2];
    let z = [1.0f64, 10.0, 3.0, 14.0];
    let (mean, var) = (ReduceOp::Mean, ReduceOp::Var);
    reduce_cases! {
        big, U32, [2], [0], F64, spec(mean) => [4294967294.0f64];
        big, U32, [2], [0], F64, spec(var) => [1.0f64];
        z, C128, [2], [0], F64, spec(var) => [5.0f64];
        [1.0f64, 3.0], F64, [2], [0], F64, ddof(var, 0.5, false) => [2.0f64 / 1.5];
        [1.0f64, 3.0], F64, [2], [0], F64, ddof(var, 2.5, false) => [NAN_64];
    }
}

#[test]
fn reduce_complex_products_multiply_and_empty_reductions_write_identities() {
    let z = [1.0f32, 2.0, 3.0, 4.0];
    let prod = ReduceOp::Prod;
    reduce_cases! {
        z, C64, [2], [0], C64, spec(prod) => [-5.0f32, 10.0];
        z, C64, [2], [0], C128, spec(prod) => [-5.0f64, 10.0];
        [1.0f32, 0.0, f32::INFINITY, 0.0], C64, [2], [0], C64, spec(prod) => [NAN_32, NAN_32];
        [f32::INFINITY, 0.0], C64, [1], [0], C64, spec(prod) => [f32::INFINITY, 0.0];
    }
    let flags = [0, 1];
    let empty = |op, from, out: DType| {
        let mut bytes = vec![0xAAu8; 2 * out.size()];
        let strides = [from_size(from), from_size(from)];
        let status = reduce(
            output(&mut bytes, out),
            None,
            src(&[], from, 0, &strides),
            &[2, 0],
            &flags,
            spec(op),
        );
        assert_eq!(status, STATUS_OK, "{op:?}");
        bytes
    };
    assert_eq!(empty(ReduceOp::Sum, F32, F32), le(&[0u32; 2]));
    assert_eq!(empty(prod, F32, F32), le(&[1.0f32; 2]));
    assert_eq!(empty(ReduceOp::Mean, F32, F32), le(&[NAN_32; 2]));
    assert_eq!(empty(ReduceOp::Std, F32, F32), le(&[NAN_32; 2]));
    assert_eq!(empty(ReduceOp::Mean, C128, C128), le(&[NAN_64; 4]));
    assert_eq!(empty(prod, C64, C64), le(&[1.0f32, 0.0, 1.0, 0.0]));
    for (op, out) in [(ReduceOp::Min, F32), (ReduceOp::ArgMin, U32)] {
        let mut bytes = vec![0u8; 8];
        let status = reduce(
            output(&mut bytes, out),
            None,
            src(&[], F32, 0, &[4, 4]),
            &[2, 0],
            &flags,
            spec(op),
        );
        assert_eq!(status, STATUS_INVALID_SHAPE, "{op:?} has no identity");
    }
}

fn from_size(dtype: DType) -> i32 {
    dtype.size() as i32
}

#[test]
fn reduce_fused_statistics_equal_their_separate_operations() {
    let (k, r) = (9usize, 300usize);
    let bytes = le(&f32_data(k * r));
    let (shape, strides, flags) = ([k as u32, r as u32], [r as i32 * 4, 4], [0, 1]);
    let view = View(&bytes, F32, 0, &strides, &shape);
    let pairs = [
        (ReduceOp::VarMean, ReduceOp::Var, ReduceOp::Mean),
        (ReduceOp::StdMean, ReduceOp::Std, ReduceOp::Mean),
        (ReduceOp::MinMax, ReduceOp::Min, ReduceOp::Max),
    ];
    for (fused, first, second) in pairs {
        for omit in [false, true] {
            let s = ReduceSpec {
                omit,
                ddof: if fused == ReduceOp::MinMax { 0.0 } else { 1.0 },
                ..spec(fused)
            };
            let (mut a, mut b) = (vec![0u8; k * 4], vec![0u8; k * 4]);
            let status = reduce(
                output(&mut a, F32),
                Some(output(&mut b, F32)),
                src(&bytes, F32, 0, &strides),
                &shape,
                &flags,
                s,
            );
            assert_eq!(status, STATUS_OK);
            assert_eq!(
                a,
                reduce_view(&view, &[1], F32, ReduceSpec { op: first, ..s }, None),
                "{fused:?} first output"
            );
            assert_eq!(
                b,
                reduce_view(&view, &[1], F32, ReduceSpec { op: second, ..s }, None),
                "{fused:?} second output"
            );
        }
    }
    let z = le(&[1.0f32, 10.0, 3.0, 14.0]);
    let (mut v, mut m) = (vec![0u8; 4], vec![0u8; 8]);
    let status = reduce(
        output(&mut v, F32),
        Some(output(&mut m, C64)),
        src(&z, C64, 0, &[8]),
        &[2],
        &[1],
        spec(ReduceOp::VarMean),
    );
    assert_eq!(status, STATUS_OK);
    assert_eq!((v, m), (le(&[5.0f32]), le(&[2.0f32, 12.0])));
}

#[test]
fn reduce_reports_status_codes_for_invalid_descriptors() {
    let bytes = le(&[1.0f32, 2.0]);
    let run = |from: DType,
               out: DType,
               s: ReduceSpec,
               strides: &[i32],
               shape: &[u32],
               flags: &[u32],
               len: usize,
               offset: u32| {
        let mut dst = vec![0u8; len];
        reduce(
            ReduceOutput {
                bytes: &mut dst,
                dtype: out,
                offset,
            },
            None,
            src(&bytes, from, 0, strides),
            shape,
            flags,
            s,
        )
    };
    let (sum, var, min, argmax) = (
        spec(ReduceOp::Sum),
        ReduceOp::Var,
        spec(ReduceOp::Min),
        spec(ReduceOp::ArgMax),
    );
    macro_rules! status_cases {
        ($($status:expr => $($args:expr),+;)+) => { $(assert_eq!(run($($args),+), $status, "{}", stringify!($($args),+));)+ };
    }
    status_cases! {
        STATUS_OK => F32, F32, sum, &[4], &[2], &[1], 4, 0;
        STATUS_INVALID_DTYPE => C64, C64, min, &[8], &[1], &[1], 8, 0;
        STATUS_INVALID_DTYPE => C64, U32, argmax, &[8], &[1], &[1], 4, 0;
        STATUS_INVALID_DTYPE => F32, I32, sum, &[4], &[2], &[1], 4, 0;
        STATUS_INVALID_DTYPE => I32, C64, sum, &[4], &[2], &[1], 8, 0;
        STATUS_INVALID_DTYPE => C64, F32, sum, &[8], &[1], &[1], 4, 0;
        STATUS_INVALID_DTYPE => I32, I32, spec(ReduceOp::Mean), &[4], &[2], &[1], 4, 0;
        STATUS_INVALID_DTYPE => F32, F64, min, &[4], &[2], &[1], 8, 0;
        STATUS_INVALID_DTYPE => F32, F32, spec(ReduceOp::ArgMin), &[4], &[2], &[1], 4, 0;
        STATUS_INVALID_DTYPE => F32, F32, spec(ReduceOp::VarMean), &[4], &[2], &[1], 4, 0;
        STATUS_INVALID_RANK => F32, F32, sum, &[4, 4], &[2], &[1], 4, 0;
        STATUS_INVALID_RANK => F32, F32, sum, &[4], &[2], &[1, 0], 4, 0;
        STATUS_INVALID_PARAMETERS => F32, F32, sum, &[4], &[2], &[2], 4, 0;
        STATUS_INVALID_PARAMETERS => F32, F32, ddof(var, -1.0, false), &[4], &[2], &[1], 4, 0;
        STATUS_INVALID_PARAMETERS => F32, F32, ddof(ReduceOp::Std, f64::NAN, false), &[4], &[2], &[1], 4, 0;
        STATUS_INVALID_PARAMETERS => F32, F32, ddof(var, f64::INFINITY, false), &[4], &[2], &[1], 4, 0;
        STATUS_SOURCE_BOUNDS => F32, F32, sum, &[4], &[3], &[1], 4, 0;
        STATUS_SOURCE_BOUNDS => F32, F32, sum, &[-4], &[2], &[1], 4, 0;
        STATUS_DESTINATION_BOUNDS => F32, F32, sum, &[4], &[2], &[1], 3, 0;
        STATUS_DESTINATION_BOUNDS => F32, F32, sum, &[4], &[2], &[1], 4, 1;
        STATUS_INVALID_SHAPE => F32, F32, sum, &[0, 0], &[u32::MAX, 2], &[0, 0], 4, 0;
        STATUS_INVALID_SHAPE => F32, F32, sum, &[0, 0], &[u32::MAX, 2], &[1, 1], 4, 0;
        STATUS_OK => F32, F32, sum, &[4, 4], &[0, 2], &[0, 1], 0, 0;
    }
    let (mut first, mut second) = (vec![0u8; 4], vec![0u8; 4]);
    let shifted = ReduceOutput {
        bytes: &mut second,
        dtype: F32,
        offset: 1,
    };
    assert_eq!(
        reduce(
            output(&mut first, F32),
            Some(shifted),
            src(&bytes, F32, 0, &[4]),
            &[2],
            &[1],
            spec(ReduceOp::VarMean)
        ),
        STATUS_DESTINATION_BOUNDS
    );
    let mut second = vec![0u8; 4];
    assert_eq!(
        reduce(
            output(&mut first, F32),
            Some(output(&mut second, F32)),
            src(&bytes, F32, 0, &[4]),
            &[2],
            &[1],
            sum
        ),
        STATUS_INVALID_DTYPE,
        "Only fused operations take a second output"
    );
}

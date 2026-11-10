/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{
    DriverCall, f64_slice, i32_slice, i32_slice_mut, u8_slice, u8_slice_mut, u32_slice,
    with_driver_call,
};
use core::marker::PhantomData;

const ND_ERROR: u32 = 0xFFFF_FFFF;

pub(crate) const MAX_RANK: usize = 64;

pub(crate) const STATUS_OK: u32 = 0;
pub(crate) const STATUS_INVALID_DTYPE: u32 = 1;
pub(crate) const STATUS_INVALID_MODE: u32 = 2;
pub(crate) const STATUS_INVALID_RANK: u32 = 3;
pub(crate) const STATUS_INVALID_POINTER: u32 = 4;
pub(crate) const STATUS_OVERLAP: u32 = 5;
pub(crate) const STATUS_SOURCE_BOUNDS: u32 = 6;
pub(crate) const STATUS_DESTINATION_BOUNDS: u32 = 7;
pub(crate) const STATUS_INVALID_SHAPE: u32 = 8;
pub(crate) const STATUS_INVALID_TABLE: u32 = 9;
pub(crate) const STATUS_INVALID_PARAMETERS: u32 = 10;

const CHUNK: usize = 128;

pub(crate) fn numel(shape: &[u32]) -> u32 {
    if shape.is_empty() {
        return 1;
    }
    let mut prod: u64 = 1;
    for &d in shape {
        if d == 0 {
            return 0;
        }
        prod = match prod.checked_mul(d as u64) {
            Some(v) => v,
            None => return 0,
        };
        if prod > (u32::MAX as u64) {
            return 0;
        }
    }
    prod as u32
}

pub(crate) fn strides_row_major(out: &mut [i32], shape: &[u32], elem_bytes: u32) -> u32 {
    if out.len() != shape.len() || elem_bytes == 0 {
        return 0;
    }
    let mut stride: u64 = elem_bytes as u64;
    for i_rev in 0..shape.len() {
        let i = shape.len() - 1 - i_rev;
        if stride > (i32::MAX as u64) {
            return 0;
        }
        out[i] = stride as i32;
        stride = match stride.checked_mul(shape[i] as u64) {
            Some(v) => v,
            None => return 0,
        };
        if stride > (u32::MAX as u64) {
            return 0;
        }
    }
    1
}

pub(crate) fn offset_bytes(
    shape: &[u32],
    strides: &[i32],
    indices: &[u32],
    base_offset_bytes: u32,
) -> u32 {
    if shape.len() != strides.len() || shape.len() != indices.len() {
        return ND_ERROR;
    }
    let mut off: i64 = base_offset_bytes as i64;
    for i in 0..shape.len() {
        let dim = shape[i] as i64;
        let idx = indices[i] as i64;
        if idx >= dim {
            return ND_ERROR;
        }
        let term = match (strides[i] as i64).checked_mul(idx) {
            Some(v) => v,
            None => return ND_ERROR,
        };
        off = match off.checked_add(term) {
            Some(v) => v,
            None => return ND_ERROR,
        };
    }
    if off < 0 || off > (u32::MAX as i64) {
        return ND_ERROR;
    }
    off as u32
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub(crate) enum DType {
    I8,
    U8,
    I16,
    U16,
    I32,
    U32,
    F32,
    F64,
    C64,
    C128,
}

impl DType {
    pub(crate) fn from_code(code: u32) -> Option<DType> {
        match code {
            0 => Some(DType::I8),
            1 => Some(DType::U8),
            2 => Some(DType::I16),
            3 => Some(DType::U16),
            4 => Some(DType::I32),
            5 => Some(DType::U32),
            6 => Some(DType::F32),
            7 => Some(DType::F64),
            8 => Some(DType::C64),
            9 => Some(DType::C128),
            _ => None,
        }
    }

    pub(crate) fn size(self) -> usize {
        match self {
            DType::I8 | DType::U8 => 1,
            DType::I16 | DType::U16 => 2,
            DType::I32 | DType::U32 | DType::F32 => 4,
            DType::F64 | DType::C64 => 8,
            DType::C128 => 16,
        }
    }

    pub(crate) fn is_complex(self) -> bool {
        matches!(self, DType::C64 | DType::C128)
    }

    pub(crate) fn component(self) -> DType {
        match self {
            DType::C64 => DType::F32,
            DType::C128 => DType::F64,
            real => real,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub(crate) struct IntMode {
    pub(crate) saturate: bool,
    pub(crate) nearest: bool,
}

pub(crate) const ARITHMETIC_MODE: IntMode = IntMode {
    saturate: true,
    nearest: true,
};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub(crate) enum PadMode {
    Constant,
    Edge,
    Reflect,
    Symmetric,
    Wrap,
}

impl PadMode {
    pub(crate) fn from_code(code: u32) -> Option<PadMode> {
        match code {
            0 => Some(PadMode::Constant),
            1 => Some(PadMode::Edge),
            2 => Some(PadMode::Reflect),
            3 => Some(PadMode::Symmetric),
            4 => Some(PadMode::Wrap),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub(crate) enum AffineForm {
    ScaleOffset,
    MeanStd,
    ZScore,
    MinMax,
}

impl AffineForm {
    pub(crate) fn from_code(code: u32) -> Option<AffineForm> {
        match code {
            0 => Some(AffineForm::ScaleOffset),
            1 => Some(AffineForm::MeanStd),
            2 => Some(AffineForm::ZScore),
            3 => Some(AffineForm::MinMax),
            _ => None,
        }
    }

    fn parameters(self) -> usize {
        match self {
            AffineForm::ZScore => 4,
            _ => 2,
        }
    }
}

pub(crate) struct Source<'a> {
    pub(crate) bytes: &'a [u8],
    pub(crate) dtype: DType,
    pub(crate) offset: u32,
    pub(crate) strides: &'a [i32],
}

pub(crate) struct Destination<'a> {
    pub(crate) bytes: &'a mut [u8],
    pub(crate) dtype: DType,
    pub(crate) offset: u32,
    pub(crate) strides: &'a [i32],
}

pub(crate) trait Element: Copy {
    fn load(bytes: &[u8], offset: usize) -> Self;
    fn store(self, bytes: &mut [u8], offset: usize);
    fn to_f64(self) -> f64;
}

macro_rules! element {
    ($t:ty, $n:literal) => {
        impl Element for $t {
            #[inline(always)]
            fn load(bytes: &[u8], offset: usize) -> Self {
                let mut raw = [0u8; $n];
                raw.copy_from_slice(&bytes[offset..offset + $n]);
                <$t>::from_le_bytes(raw)
            }

            #[inline(always)]
            fn store(self, bytes: &mut [u8], offset: usize) {
                bytes[offset..offset + $n].copy_from_slice(&self.to_le_bytes());
            }

            #[inline(always)]
            fn to_f64(self) -> f64 {
                self as f64
            }
        }
    };
}

element!(i8, 1);
element!(u8, 1);
element!(i16, 2);
element!(u16, 2);
element!(i32, 4);
element!(u32, 4);
element!(f32, 4);
element!(f64, 8);

pub(crate) trait IntElement: Element {
    fn wrap_from(v: i64) -> Self;
    fn saturate_from(v: f64) -> Self;
}

macro_rules! int_element {
    ($t:ty) => {
        impl IntElement for $t {
            #[inline(always)]
            fn wrap_from(v: i64) -> Self {
                v as $t
            }

            #[inline(always)]
            fn saturate_from(v: f64) -> Self {
                v as $t
            }
        }
    };
}

int_element!(i8);
int_element!(u8);
int_element!(i16);
int_element!(u16);
int_element!(i32);
int_element!(u32);

#[inline(always)]
pub(crate) fn to_int<D: IntElement, const SATURATE: bool, const NEAREST: bool>(v: f64) -> D {
    let r = if NEAREST {
        v.round_ties_even()
    } else {
        v.trunc()
    };
    if SATURATE {
        D::saturate_from(r)
    } else if r.is_finite() {
        D::wrap_from((r % 4294967296.0) as i64)
    } else {
        D::wrap_from(0)
    }
}

type Reader = fn(&[u8], usize, i64, &mut [f64]);
type Loader = fn(&[u8], usize) -> f64;
type Writer = fn(&mut [u8], usize, i64, &[f64]);

fn read_run<S: Element>(src: &[u8], offset: usize, stride: i64, out: &mut [f64]) {
    let mut at = offset as i64;
    for v in out.iter_mut() {
        *v = S::load(src, at as usize).to_f64();
        at += stride;
    }
}

fn write_int_run<D: IntElement, const SATURATE: bool, const NEAREST: bool>(
    dst: &mut [u8],
    offset: usize,
    stride: i64,
    values: &[f64],
) {
    let mut at = offset as i64;
    for &v in values {
        to_int::<D, SATURATE, NEAREST>(v).store(dst, at as usize);
        at += stride;
    }
}

fn write_f32_run(dst: &mut [u8], offset: usize, stride: i64, values: &[f64]) {
    let mut at = offset as i64;
    for &v in values {
        (v as f32).store(dst, at as usize);
        at += stride;
    }
}

fn write_f64_run(dst: &mut [u8], offset: usize, stride: i64, values: &[f64]) {
    let mut at = offset as i64;
    for &v in values {
        v.store(dst, at as usize);
        at += stride;
    }
}

fn load_one<S: Element>(src: &[u8], offset: usize) -> f64 {
    S::load(src, offset).to_f64()
}

fn loader_for(dtype: DType) -> Loader {
    match dtype {
        DType::I8 => load_one::<i8>,
        DType::U8 => load_one::<u8>,
        DType::I16 => load_one::<i16>,
        DType::U16 => load_one::<u16>,
        DType::I32 => load_one::<i32>,
        DType::U32 => load_one::<u32>,
        DType::F32 => load_one::<f32>,
        DType::F64 => load_one::<f64>,
        DType::C64 | DType::C128 => unreachable!("complex dtypes have no scalar loader"),
    }
}

pub(crate) fn reader_for(dtype: DType) -> Reader {
    match dtype {
        DType::I8 => read_run::<i8>,
        DType::U8 => read_run::<u8>,
        DType::I16 => read_run::<i16>,
        DType::U16 => read_run::<u16>,
        DType::I32 => read_run::<i32>,
        DType::U32 => read_run::<u32>,
        DType::F32 => read_run::<f32>,
        DType::F64 => read_run::<f64>,
        DType::C64 | DType::C128 => unreachable!("complex dtypes have no scalar reader"),
    }
}

macro_rules! int_writer {
    ($t:ty, $mode:expr) => {
        match ($mode.saturate, $mode.nearest) {
            (false, false) => write_int_run::<$t, false, false> as Writer,
            (false, true) => write_int_run::<$t, false, true> as Writer,
            (true, false) => write_int_run::<$t, true, false> as Writer,
            (true, true) => write_int_run::<$t, true, true> as Writer,
        }
    };
}

pub(crate) fn writer_for(dtype: DType, mode: IntMode) -> Writer {
    match dtype {
        DType::I8 => int_writer!(i8, mode),
        DType::U8 => int_writer!(u8, mode),
        DType::I16 => int_writer!(i16, mode),
        DType::U16 => int_writer!(u16, mode),
        DType::I32 => int_writer!(i32, mode),
        DType::U32 => int_writer!(u32, mode),
        DType::F32 => write_f32_run,
        DType::F64 => write_f64_run,
        DType::C64 | DType::C128 => unreachable!("complex dtypes have no scalar writer"),
    }
}

pub(crate) fn layout_within(
    len: usize,
    shape: &[u32],
    strides: &[i32],
    offset: u32,
    size: usize,
) -> bool {
    let mut lo = offset as i64;
    let mut hi = offset as i64;
    for (&n, &s) in shape.iter().zip(strides) {
        let extent = match (n as i64 - 1).checked_mul(s as i64) {
            Some(v) => v,
            None => return false,
        };
        let bound = if extent < 0 { &mut lo } else { &mut hi };
        *bound = match bound.checked_add(extent) {
            Some(v) => v,
            None => return false,
        };
    }
    match hi.checked_add(size as i64) {
        Some(end) => lo >= 0 && end <= len as i64,
        None => false,
    }
}

fn for_each_outer(
    shape: &[u32],
    src_strides: &[i64],
    dst_strides: &[i64],
    src_offset: i64,
    dst_offset: i64,
    mut visit: impl FnMut(&[u32], i64, i64),
) {
    let mut index = [0u32; MAX_RANK];
    if shape.len() <= 1 {
        visit(&index[..0], src_offset, dst_offset);
        return;
    }
    let outer = shape.len() - 1;
    let (mut s, mut d) = (src_offset, dst_offset);
    loop {
        visit(&index[..outer], s, d);
        let mut axis = outer;
        loop {
            if axis == 0 {
                return;
            }
            axis -= 1;
            index[axis] += 1;
            s += src_strides[axis];
            d += dst_strides[axis];
            if index[axis] < shape[axis] {
                break;
            }
            s -= src_strides[axis] * shape[axis] as i64;
            d -= dst_strides[axis] * shape[axis] as i64;
            index[axis] = 0;
        }
    }
}

fn widen(strides: &[i32], out: &mut [i64; MAX_RANK]) {
    for (w, &s) in out.iter_mut().zip(strides) {
        *w = s as i64;
    }
}

fn inner(shape: &[u32], src: &[i64], dst: &[i64]) -> (usize, i64, i64) {
    match shape.len() {
        0 => (1, 0, 0),
        n => (shape[n - 1] as usize, src[n - 1], dst[n - 1]),
    }
}

fn copy_elements<const N: usize>(
    dst: &mut [u8],
    dst_at: i64,
    dst_stride: i64,
    src: &[u8],
    src_at: i64,
    src_stride: i64,
    count: usize,
) {
    let (mut d, mut s) = (dst_at, src_at);
    for _ in 0..count {
        let (du, su) = (d as usize, s as usize);
        dst[du..du + N].copy_from_slice(&src[su..su + N]);
        d += dst_stride;
        s += src_stride;
    }
}

pub(crate) fn copy_cast(dst: Destination, src: Source, shape: &[u32], mode: IntMode) -> u32 {
    let nd = shape.len();
    if nd > MAX_RANK || src.strides.len() != nd || dst.strides.len() != nd {
        return STATUS_INVALID_RANK;
    }
    if shape.contains(&0) {
        return STATUS_OK;
    }
    if !layout_within(
        src.bytes.len(),
        shape,
        src.strides,
        src.offset,
        src.dtype.size(),
    ) {
        return STATUS_SOURCE_BOUNDS;
    }
    if !layout_within(
        dst.bytes.len(),
        shape,
        dst.strides,
        dst.offset,
        dst.dtype.size(),
    ) {
        return STATUS_DESTINATION_BOUNDS;
    }
    if src.dtype != dst.dtype && (src.dtype.is_complex() || dst.dtype.is_complex()) {
        return copy_complex(dst, src, shape, mode);
    }
    let (mut ss, mut ds) = ([0i64; MAX_RANK], [0i64; MAX_RANK]);
    widen(src.strides, &mut ss);
    widen(dst.strides, &mut ds);
    let (n, s_inner, d_inner) = inner(shape, &ss, &ds);
    let out = dst.bytes;
    let input = src.bytes;
    if src.dtype == dst.dtype {
        let size = src.dtype.size();
        for_each_outer(
            shape,
            &ss,
            &ds,
            src.offset as i64,
            dst.offset as i64,
            |_, s, d| copy_strided(size, out, d, d_inner, input, s, s_inner, n),
        );
        return STATUS_OK;
    }
    let read = reader_for(src.dtype);
    let write = writer_for(dst.dtype, mode);
    let mut buffer = [0f64; CHUNK];
    for_each_outer(
        shape,
        &ss,
        &ds,
        src.offset as i64,
        dst.offset as i64,
        |_, s, d| {
            let mut done = 0;
            while done < n {
                let k = CHUNK.min(n - done);
                read(
                    input,
                    (s + done as i64 * s_inner) as usize,
                    s_inner,
                    &mut buffer[..k],
                );
                write(
                    out,
                    (d + done as i64 * d_inner) as usize,
                    d_inner,
                    &buffer[..k],
                );
                done += k;
            }
        },
    );
    STATUS_OK
}

fn copy_complex(dst: Destination, src: Source, shape: &[u32], mode: IntMode) -> u32 {
    if !dst.dtype.is_complex() {
        return STATUS_INVALID_DTYPE;
    }
    let (dst_part, src_part) = (dst.dtype.component(), src.dtype.component());
    let parts = if src.dtype.is_complex() { 2 } else { 1 };
    for part in 0..2 {
        let target = Destination {
            bytes: &mut *dst.bytes,
            dtype: dst_part,
            offset: dst.offset + part * dst_part.size() as u32,
            strides: dst.strides,
        };
        let status = if part < parts {
            let source = Source {
                bytes: src.bytes,
                dtype: src_part,
                offset: src.offset + part * src_part.size() as u32,
                strides: src.strides,
            };
            copy_cast(target, source, shape, mode)
        } else {
            zero_fill(target, shape)
        };
        if status != STATUS_OK {
            return status;
        }
    }
    STATUS_OK
}

fn zero_fill(dst: Destination, shape: &[u32]) -> u32 {
    let size = dst.dtype.size();
    if !layout_within(dst.bytes.len(), shape, dst.strides, dst.offset, size) {
        return STATUS_DESTINATION_BOUNDS;
    }
    let mut ds = [0i64; MAX_RANK];
    widen(dst.strides, &mut ds);
    let (n, _, d_inner) = inner(shape, &ds, &ds);
    let out = dst.bytes;
    for_each_outer(shape, &ds, &ds, 0, dst.offset as i64, |_, _, d| {
        let mut at = d;
        for _ in 0..n {
            out[at as usize..at as usize + size].fill(0);
            at += d_inner;
        }
    });
    STATUS_OK
}

pub(crate) fn pad_index(i: i64, n: i64, mode: PadMode) -> i64 {
    if i >= 0 && i < n {
        return i;
    }
    match mode {
        PadMode::Constant => -1,
        PadMode::Edge => {
            if i < 0 {
                0
            } else {
                n - 1
            }
        }
        PadMode::Wrap => i.rem_euclid(n),
        PadMode::Symmetric => {
            let p = 2 * n;
            let j = i.rem_euclid(p);
            if j < n { j } else { p - 1 - j }
        }
        PadMode::Reflect => {
            if n == 1 {
                return 0;
            }
            let p = 2 * n - 2;
            let j = i.rem_euclid(p);
            if j < n { j } else { p - j }
        }
    }
}

pub(crate) struct PadAxes<'a> {
    pub(crate) out_shape: &'a [u32],
    pub(crate) src_shape: &'a [u32],
    pub(crate) before: &'a [u32],
}

fn pad_element(dst: &mut [u8], d: i64, src: &[u8], s: i64, j: i64, stride: i64, constant: &[u8]) {
    let du = d as usize;
    let size = constant.len();
    if j < 0 {
        dst[du..du + size].copy_from_slice(constant);
    } else {
        let su = (s + j * stride) as usize;
        dst[du..du + size].copy_from_slice(&src[su..su + size]);
    }
}

fn copy_strided(
    size: usize,
    dst: &mut [u8],
    dst_at: i64,
    dst_stride: i64,
    src: &[u8],
    src_at: i64,
    src_stride: i64,
    count: usize,
) {
    if src_stride == size as i64 && dst_stride == size as i64 {
        let (su, du) = (src_at as usize, dst_at as usize);
        dst[du..du + count * size].copy_from_slice(&src[su..su + count * size]);
        return;
    }
    match size {
        1 => copy_elements::<1>(dst, dst_at, dst_stride, src, src_at, src_stride, count),
        2 => copy_elements::<2>(dst, dst_at, dst_stride, src, src_at, src_stride, count),
        4 => copy_elements::<4>(dst, dst_at, dst_stride, src, src_at, src_stride, count),
        8 => copy_elements::<8>(dst, dst_at, dst_stride, src, src_at, src_stride, count),
        16 => copy_elements::<16>(dst, dst_at, dst_stride, src, src_at, src_stride, count),
        _ => unreachable!("DType::size() returns 1, 2, 4, 8, or 16 bytes"),
    }
}

fn pad_impl(dst: Destination, src: Source, axes: &PadAxes, mode: PadMode, constant: &[u8]) {
    let nd = axes.out_shape.len();
    let size = constant.len();
    let (mut ss, mut ds) = ([0i64; MAX_RANK], [0i64; MAX_RANK]);
    widen(src.strides, &mut ss);
    widen(dst.strides, &mut ds);
    let (n_out, n_src, before, s_inner, d_inner) = match nd {
        0 => (1usize, 1i64, 0i64, 0i64, 0i64),
        _ => (
            axes.out_shape[nd - 1] as usize,
            axes.src_shape[nd - 1] as i64,
            axes.before[nd - 1] as i64,
            ss[nd - 1],
            ds[nd - 1],
        ),
    };
    let lo = (before as usize).min(n_out);
    let hi = ((before + n_src) as usize).min(n_out);
    let out = dst.bytes;
    let input = src.bytes;
    let zeros = [0i64; MAX_RANK];
    for_each_outer(
        axes.out_shape,
        &zeros,
        &ds,
        0,
        dst.offset as i64,
        |index, _, d| {
            let mut s = src.offset as i64;
            let mut fill = false;
            for (axis, &o) in index.iter().enumerate() {
                let j = pad_index(
                    o as i64 - axes.before[axis] as i64,
                    axes.src_shape[axis] as i64,
                    mode,
                );
                if j < 0 {
                    fill = true;
                    break;
                }
                s += j * ss[axis];
            }
            if fill {
                for o in 0..n_out {
                    pad_element(out, d + o as i64 * d_inner, input, s, -1, s_inner, constant);
                }
                return;
            }
            for o in (0..lo).chain(hi..n_out) {
                let j = pad_index(o as i64 - before, n_src, mode);
                pad_element(out, d + o as i64 * d_inner, input, s, j, s_inner, constant);
            }
            if hi > lo {
                let first = s + (lo as i64 - before) * s_inner;
                let start = d + lo as i64 * d_inner;
                copy_strided(size, out, start, d_inner, input, first, s_inner, hi - lo);
            }
        },
    );
}

pub(crate) fn pad(
    dst: Destination,
    src: Source,
    axes: PadAxes,
    mode: PadMode,
    value: &[u8],
) -> u32 {
    let nd = axes.out_shape.len();
    if nd > MAX_RANK
        || axes.src_shape.len() != nd
        || axes.before.len() != nd
        || src.strides.len() != nd
        || dst.strides.len() != nd
    {
        return STATUS_INVALID_RANK;
    }
    if src.dtype != dst.dtype {
        return STATUS_INVALID_DTYPE;
    }
    let size = src.dtype.size();
    if value.len() < size {
        return STATUS_INVALID_PARAMETERS;
    }
    for d in 0..nd {
        let (o, n, b) = (axes.out_shape[d], axes.src_shape[d], axes.before[d]);
        if n as u64 + b as u64 > o as u64 || (n == 0 && o != 0 && mode != PadMode::Constant) {
            return STATUS_INVALID_SHAPE;
        }
    }
    if axes.out_shape.contains(&0) {
        return STATUS_OK;
    }
    if !layout_within(
        dst.bytes.len(),
        axes.out_shape,
        dst.strides,
        dst.offset,
        size,
    ) {
        return STATUS_DESTINATION_BOUNDS;
    }
    if !axes.src_shape.contains(&0)
        && !layout_within(
            src.bytes.len(),
            axes.src_shape,
            src.strides,
            src.offset,
            size,
        )
    {
        return STATUS_SOURCE_BOUNDS;
    }
    pad_impl(dst, src, &axes, mode, &value[..size]);
    STATUS_OK
}

#[derive(Clone, Copy)]
pub(crate) struct AffineParam<'a> {
    pub(crate) values: &'a [f64],
    pub(crate) offset: u32,
    pub(crate) strides: &'a [i32],
}

pub(crate) const NO_AFFINE_PARAM: AffineParam<'static> = AffineParam {
    values: &[],
    offset: 0,
    strides: &[],
};

pub(crate) struct AffineParams<'a> {
    pub(crate) p: [AffineParam<'a>; 4],
    pub(crate) form: AffineForm,
    pub(crate) epsilon: f64,
    pub(crate) range: [f64; 2],
}

#[inline(always)]
pub(crate) fn affine_value(x: f64, a: f64, b: f64, form: AffineForm) -> f64 {
    match form {
        AffineForm::ScaleOffset => x * a + b,
        _ => (x - a) / b,
    }
}

#[inline(always)]
pub(crate) fn zero_rule(d: f64, epsilon: f64) -> f64 {
    if d.is_nan() {
        d
    } else if d.abs() <= epsilon {
        1.0
    } else {
        d
    }
}

#[inline(always)]
pub(crate) fn zscore_terms(mean: f64, std: f64, min: f64, max: f64, epsilon: f64) -> (f64, f64) {
    if min == max && !std.is_nan() {
        (min, 1.0)
    } else {
        (mean, zero_rule(std, epsilon))
    }
}

#[inline(always)]
pub(crate) fn minmax_terms(min: f64, max: f64, epsilon: f64) -> (f64, f64) {
    (min, zero_rule(max - min, epsilon))
}

const AFFINE_FMA: u8 = 0;
const AFFINE_DIV: u8 = 1;
const AFFINE_RANGE: u8 = 2;

#[derive(Clone, Copy, PartialEq, Eq)]
enum LaneKind {
    Fixed,
    Contiguous,
    Strided,
}

trait Lane<'a>: Copy {
    fn new(values: &'a [f64], start: i64, step: i64, n: usize) -> Self;
    fn get(&self, j: usize) -> f64;
}

#[derive(Clone, Copy)]
struct Fixed(f64);

impl<'a> Lane<'a> for Fixed {
    #[inline(always)]
    fn new(values: &'a [f64], start: i64, _: i64, _: usize) -> Self {
        Fixed(values[start as usize])
    }

    #[inline(always)]
    fn get(&self, _: usize) -> f64 {
        self.0
    }
}

#[derive(Clone, Copy)]
struct Contiguous<'a>(&'a [f64]);

impl<'a> Lane<'a> for Contiguous<'a> {
    #[inline(always)]
    fn new(values: &'a [f64], start: i64, _: i64, n: usize) -> Self {
        Contiguous(&values[start as usize..start as usize + n])
    }

    #[inline(always)]
    fn get(&self, j: usize) -> f64 {
        self.0[j]
    }
}

#[derive(Clone, Copy)]
struct Strided<'a> {
    values: &'a [f64],
    start: i64,
    step: i64,
}

impl<'a> Lane<'a> for Strided<'a> {
    #[inline(always)]
    fn new(values: &'a [f64], start: i64, step: i64, _: usize) -> Self {
        Strided {
            values,
            start,
            step,
        }
    }

    #[inline(always)]
    fn get(&self, j: usize) -> f64 {
        self.values[(self.start + j as i64 * self.step) as usize]
    }
}

trait Terms<'a>: Copy {
    fn new(p: &[&'a [f64]; 4], at: &[i64; 6], step: &[i64; 4], n: usize, epsilon: f64) -> Self;
    fn terms(&self, j: usize) -> (f64, f64);
}

#[derive(Clone, Copy)]
struct Pair<A, B>(A, B);

impl<'a, A: Lane<'a>, B: Lane<'a>> Terms<'a> for Pair<A, B> {
    #[inline(always)]
    fn new(p: &[&'a [f64]; 4], at: &[i64; 6], step: &[i64; 4], n: usize, _: f64) -> Self {
        Pair(
            A::new(p[0], at[2], step[0], n),
            B::new(p[1], at[3], step[1], n),
        )
    }

    #[inline(always)]
    fn terms(&self, j: usize) -> (f64, f64) {
        (self.0.get(j), self.1.get(j))
    }
}

#[derive(Clone, Copy)]
struct Standard<L>([L; 4], f64);

impl<'a, L: Lane<'a>> Terms<'a> for Standard<L> {
    #[inline(always)]
    fn new(p: &[&'a [f64]; 4], at: &[i64; 6], step: &[i64; 4], n: usize, epsilon: f64) -> Self {
        Standard(
            core::array::from_fn(|i| L::new(p[i], at[2 + i], step[i], n)),
            epsilon,
        )
    }

    #[inline(always)]
    fn terms(&self, j: usize) -> (f64, f64) {
        let [mean, std, min, max] = self.0.map(|lane| lane.get(j));
        zscore_terms(mean, std, min, max, self.1)
    }
}

#[derive(Clone, Copy)]
struct Range<L>(L, L, f64);

impl<'a, L: Lane<'a>> Terms<'a> for Range<L> {
    #[inline(always)]
    fn new(p: &[&'a [f64]; 4], at: &[i64; 6], step: &[i64; 4], n: usize, epsilon: f64) -> Self {
        Range(
            L::new(p[0], at[2], step[0], n),
            L::new(p[1], at[3], step[1], n),
            epsilon,
        )
    }

    #[inline(always)]
    fn terms(&self, j: usize) -> (f64, f64) {
        minmax_terms(self.0.get(j), self.1.get(j), self.2)
    }
}

#[derive(Clone, Copy)]
struct Resolved(f64, f64);

impl<'a> Terms<'a> for Resolved {
    #[inline(always)]
    fn new(p: &[&'a [f64]; 4], at: &[i64; 6], _: &[i64; 4], _: usize, epsilon: f64) -> Self {
        let value = |i: usize| p[i][at[2 + i] as usize];
        let (a, b) = if p[2].is_empty() {
            minmax_terms(value(0), value(1), epsilon)
        } else {
            zscore_terms(value(0), value(1), value(2), value(3), epsilon)
        };
        Resolved(a, b)
    }

    #[inline(always)]
    fn terms(&self, _: usize) -> (f64, f64) {
        (self.0, self.1)
    }
}

fn for_each_run<const N: usize>(
    shape: &[u32],
    strides: &[[i64; MAX_RANK]; N],
    start: [i64; N],
    mut visit: impl FnMut(&[i64; N]),
) {
    let mut index = [0u32; MAX_RANK];
    let mut at = start;
    if shape.len() <= 1 {
        visit(&at);
        return;
    }
    let outer = shape.len() - 1;
    loop {
        visit(&at);
        let mut axis = outer;
        loop {
            if axis == 0 {
                return;
            }
            axis -= 1;
            index[axis] += 1;
            for (a, s) in at.iter_mut().zip(strides) {
                *a += s[axis];
            }
            if index[axis] < shape[axis] {
                break;
            }
            for (a, s) in at.iter_mut().zip(strides) {
                *a -= s[axis] * shape[axis] as i64;
            }
            index[axis] = 0;
        }
    }
}

struct AffineRun<'a, 'b> {
    out: &'b mut [u8],
    input: &'a [u8],
    shape: &'b [u32],
    strides: [[i64; MAX_RANK]; 6],
    start: [i64; 6],
    values: [&'a [f64]; 4],
    read: Reader,
    write: Writer,
    epsilon: f64,
    width: f64,
    low: f64,
}

impl<'a> AffineRun<'a, '_> {
    fn run<T: Terms<'a>, const OP: u8>(self) {
        let nd = self.shape.len();
        let (n, step) = match nd {
            0 => (1, [0i64; 6]),
            _ => (
                self.shape[nd - 1] as usize,
                core::array::from_fn(|k| self.strides[k][nd - 1]),
            ),
        };
        let param_step = [step[2], step[3], step[4], step[5]];
        let (out, input, values, epsilon) = (self.out, self.input, self.values, self.epsilon);
        let (read, write, width, low) = (self.read, self.write, self.width, self.low);
        let mut buffer = [0f64; CHUNK];
        for_each_run(self.shape, &self.strides, self.start, |at| {
            let terms = T::new(&values, at, &param_step, n, epsilon);
            let mut done = 0;
            while done < n {
                let k = CHUNK.min(n - done);
                read(
                    input,
                    (at[0] + done as i64 * step[0]) as usize,
                    step[0],
                    &mut buffer[..k],
                );
                for (j, v) in buffer[..k].iter_mut().enumerate() {
                    let (a, b) = terms.terms(done + j);
                    *v = match OP {
                        AFFINE_FMA => affine_value(*v, a, b, AffineForm::ScaleOffset),
                        AFFINE_DIV => affine_value(*v, a, b, AffineForm::MeanStd),
                        _ => affine_value(*v, a, b, AffineForm::MeanStd) * width + low,
                    };
                }
                write(
                    out,
                    (at[1] + done as i64 * step[1]) as usize,
                    step[1],
                    &buffer[..k],
                );
                done += k;
            }
        });
    }
}

fn lane_kind(param: &AffineParam, nd: usize) -> LaneKind {
    match param.strides.get(nd.wrapping_sub(1)) {
        None | Some(0) => LaneKind::Fixed,
        Some(1) => LaneKind::Contiguous,
        _ => LaneKind::Strided,
    }
}

macro_rules! pair_run {
    ($run:expr, $op:expr, $a:expr, $b:expr) => {
        match ($a, $b) {
            (LaneKind::Fixed, LaneKind::Fixed) => $run.run::<Pair<Fixed, Fixed>, $op>(),
            (LaneKind::Fixed, LaneKind::Contiguous) => $run.run::<Pair<Fixed, Contiguous>, $op>(),
            (LaneKind::Fixed, LaneKind::Strided) => $run.run::<Pair<Fixed, Strided>, $op>(),
            (LaneKind::Contiguous, LaneKind::Fixed) => $run.run::<Pair<Contiguous, Fixed>, $op>(),
            (LaneKind::Contiguous, LaneKind::Contiguous) => {
                $run.run::<Pair<Contiguous, Contiguous>, $op>()
            }
            (LaneKind::Contiguous, LaneKind::Strided) => {
                $run.run::<Pair<Contiguous, Strided>, $op>()
            }
            (LaneKind::Strided, LaneKind::Fixed) => $run.run::<Pair<Strided, Fixed>, $op>(),
            (LaneKind::Strided, LaneKind::Contiguous) => {
                $run.run::<Pair<Strided, Contiguous>, $op>()
            }
            (LaneKind::Strided, LaneKind::Strided) => $run.run::<Pair<Strided, Strided>, $op>(),
        }
    };
}

macro_rules! statistics_run {
    ($run:expr, $op:expr, $terms:ident, $kind:expr) => {
        match $kind {
            LaneKind::Fixed => $run.run::<Resolved, $op>(),
            LaneKind::Contiguous => $run.run::<$terms<Contiguous>, $op>(),
            LaneKind::Strided => $run.run::<$terms<Strided>, $op>(),
        }
    };
}

pub(crate) fn affine(dst: Destination, src: Source, shape: &[u32], params: AffineParams) -> u32 {
    if src.dtype.is_complex() || dst.dtype.is_complex() {
        return STATUS_INVALID_DTYPE;
    }
    let nd = shape.len();
    let used = params.form.parameters();
    if nd > MAX_RANK
        || src.strides.len() != nd
        || dst.strides.len() != nd
        || params.p[..used].iter().any(|p| p.strides.len() != nd)
    {
        return STATUS_INVALID_RANK;
    }
    let [low, high] = params.range;
    let scalars = params.epsilon >= 0.0 && params.epsilon.is_finite() && low < high;
    if !scalars || params.p[used..].iter().any(|p| !p.values.is_empty()) {
        return STATUS_INVALID_PARAMETERS;
    }
    if shape.contains(&0) {
        return STATUS_OK;
    }
    if !layout_within(
        src.bytes.len(),
        shape,
        src.strides,
        src.offset,
        src.dtype.size(),
    ) {
        return STATUS_SOURCE_BOUNDS;
    }
    if !layout_within(
        dst.bytes.len(),
        shape,
        dst.strides,
        dst.offset,
        dst.dtype.size(),
    ) {
        return STATUS_DESTINATION_BOUNDS;
    }
    if params.p[..used]
        .iter()
        .any(|p| !layout_within(p.values.len(), shape, p.strides, p.offset, 1))
    {
        return STATUS_INVALID_PARAMETERS;
    }
    let mut strides = [[0i64; MAX_RANK]; 6];
    widen(src.strides, &mut strides[0]);
    widen(dst.strides, &mut strides[1]);
    for (k, p) in params.p[..used].iter().enumerate() {
        widen(p.strides, &mut strides[2 + k]);
    }
    let kinds: [LaneKind; 4] = core::array::from_fn(|k| {
        if k < used {
            lane_kind(&params.p[k], nd)
        } else {
            LaneKind::Fixed
        }
    });
    let shared = if kinds[..used].iter().all(|&k| k == kinds[0]) {
        kinds[0]
    } else {
        LaneKind::Strided
    };
    let run = AffineRun {
        out: dst.bytes,
        input: src.bytes,
        shape,
        strides,
        start: [
            src.offset as i64,
            dst.offset as i64,
            params.p[0].offset as i64,
            params.p[1].offset as i64,
            params.p[2].offset as i64,
            params.p[3].offset as i64,
        ],
        values: params.p.map(|p| p.values),
        read: reader_for(src.dtype),
        write: writer_for(dst.dtype, ARITHMETIC_MODE),
        epsilon: params.epsilon,
        width: high - low,
        low,
    };
    match params.form {
        AffineForm::ScaleOffset => pair_run!(run, AFFINE_FMA, kinds[0], kinds[1]),
        AffineForm::MeanStd => pair_run!(run, AFFINE_DIV, kinds[0], kinds[1]),
        AffineForm::ZScore => statistics_run!(run, AFFINE_DIV, Standard, shared),
        AffineForm::MinMax if low == 0.0 && high == 1.0 => {
            statistics_run!(run, AFFINE_DIV, Range, shared)
        }
        AffineForm::MinMax => statistics_run!(run, AFFINE_RANGE, Range, shared),
    }
    STATUS_OK
}

pub(crate) const MAX_RESIZE_LEVELS: usize = 3;

#[derive(Clone, Copy)]
pub(crate) struct ResizeLevel<'a> {
    pub(crate) axis: usize,
    pub(crate) src: u32,
    pub(crate) off: &'a [i32],
    pub(crate) idx: &'a [i32],
    pub(crate) w: &'a [f64],
}

pub(crate) const NO_RESIZE_LEVEL: ResizeLevel<'static> = ResizeLevel {
    axis: 0,
    src: 0,
    off: &[],
    idx: &[],
    w: &[],
};

pub(crate) struct ResizeTables<'a> {
    pub(crate) levels: [ResizeLevel<'a>; MAX_RESIZE_LEVELS],
    pub(crate) count: usize,
    pub(crate) value: [f64; 2],
    pub(crate) constant: [u8; 16],
    pub(crate) weighted: bool,
}

fn valid_taps(off: &[i32], idx: &[i32], w: &[f64], n: usize, src: u32, weighted: bool) -> bool {
    if off.len().checked_sub(1) != Some(n) || idx.len() != w.len() || off[0] != 0 {
        return false;
    }
    let rows_valid = off
        .windows(2)
        .all(|p| p[0] < p[1] && (weighted || p[1] - p[0] == 1));
    rows_valid
        && off[n] as usize == idx.len()
        && idx.iter().all(|&i| i >= -1 && (i < 0 || (i as u32) < src))
        && w.iter().all(|&v| v.is_finite() && v != 0.0)
}

#[inline(always)]
fn row_taps<'a>(level: &ResizeLevel<'a>, o: usize) -> (&'a [i32], &'a [f64]) {
    let (start, end) = (level.off[o] as usize, level.off[o + 1] as usize);
    (&level.idx[start..end], &level.w[start..end])
}

struct ResizeWalk {
    axes: [usize; MAX_RESIZE_LEVELS],
    strides: [i64; MAX_RESIZE_LEVELS],
    count: usize,
    last: usize,
    inner: bool,
    s_last: i64,
    d_last: i64,
    n: usize,
    batch: [i64; MAX_RANK],
    ds: [i64; MAX_RANK],
}

impl ResizeWalk {
    fn new(src: &Source, dst: &Destination, out_shape: &[u32], t: &ResizeTables) -> ResizeWalk {
        let last = out_shape.len() - 1;
        let (mut ss, mut ds) = ([0i64; MAX_RANK], [0i64; MAX_RANK]);
        widen(src.strides, &mut ss);
        widen(dst.strides, &mut ds);
        let mut batch = ss;
        let mut axes = [0usize; MAX_RESIZE_LEVELS];
        let mut strides = [0i64; MAX_RESIZE_LEVELS];
        for (l, level) in t.levels[..t.count].iter().enumerate() {
            axes[l] = level.axis;
            strides[l] = ss[level.axis];
            batch[level.axis] = 0;
        }
        ResizeWalk {
            axes,
            strides,
            count: t.count,
            last,
            inner: axes[t.count - 1] == last,
            s_last: ss[last],
            d_last: ds[last],
            n: out_shape[last] as usize,
            batch,
            ds,
        }
    }

    #[inline(always)]
    fn coordinates(&self, index: &[u32], o: usize, out: &mut [usize; MAX_RESIZE_LEVELS]) {
        for (slot, &axis) in out.iter_mut().zip(&self.axes[..self.count]) {
            *slot = if axis == self.last {
                o
            } else {
                index[axis] as usize
            };
        }
    }

    #[inline(always)]
    fn base(&self, s: i64, o: usize) -> i64 {
        if self.inner {
            s
        } else {
            s + o as i64 * self.s_last
        }
    }
}

struct Weighted<'a> {
    rows: [(&'a [i32], &'a [f64]); MAX_RESIZE_LEVELS],
    strides: [i64; MAX_RESIZE_LEVELS],
    input: &'a [u8],
    load: Loader,
    value: f64,
}

trait ResizeDepth {
    fn eval(e: &Weighted, l: usize, addr: i64) -> f64;
}

struct ResizeSample;

struct ResizeNest<D>(PhantomData<D>);

impl ResizeDepth for ResizeSample {
    #[inline(always)]
    fn eval(e: &Weighted, _: usize, addr: i64) -> f64 {
        (e.load)(e.input, addr as usize)
    }
}

impl<D: ResizeDepth> ResizeDepth for ResizeNest<D> {
    #[inline(always)]
    fn eval(e: &Weighted, l: usize, addr: i64) -> f64 {
        let (idx, w) = e.rows[l];
        let s = e.strides[l];
        let term = |k: i32| {
            if k < 0 {
                e.value
            } else {
                D::eval(e, l + 1, addr + k as i64 * s)
            }
        };
        if idx.len() == 1 {
            return term(idx[0]);
        }
        let mut acc = term(idx[0]) * w[0];
        for (&k, &wk) in idx[1..].iter().zip(&w[1..]) {
            acc += term(k) * wk;
        }
        acc
    }
}

fn resize_weighted(dst: Destination, src: Source, out_shape: &[u32], t: &ResizeTables, value: f64) {
    type N<D> = ResizeNest<D>;
    match t.count {
        1 => weighted_levels::<N<ResizeSample>>(dst, src, out_shape, t, value),
        2 => weighted_levels::<N<N<ResizeSample>>>(dst, src, out_shape, t, value),
        _ => weighted_levels::<N<N<N<ResizeSample>>>>(dst, src, out_shape, t, value),
    }
}

fn weighted_levels<D: ResizeDepth>(
    dst: Destination,
    src: Source,
    out_shape: &[u32],
    t: &ResizeTables,
    value: f64,
) {
    let walk = ResizeWalk::new(&src, &dst, out_shape, t);
    let levels = &t.levels[..t.count];
    let outer = if walk.inner { t.count - 1 } else { t.count };
    let mut e = Weighted {
        rows: [(&[][..], &[][..]); MAX_RESIZE_LEVELS],
        strides: walk.strides,
        input: src.bytes,
        load: loader_for(src.dtype),
        value,
    };
    let write = writer_for(dst.dtype, ARITHMETIC_MODE);
    let out = dst.bytes;
    let (n, d_last) = (walk.n, walk.d_last);
    let mut buffer = [0f64; CHUNK];
    let mut o = [0usize; MAX_RESIZE_LEVELS];
    for_each_outer(
        out_shape,
        &walk.batch,
        &walk.ds,
        src.offset as i64,
        dst.offset as i64,
        |index, s, d| {
            walk.coordinates(index, 0, &mut o);
            for ((row, level), &ol) in e.rows[..outer].iter_mut().zip(levels).zip(&o) {
                *row = row_taps(level, ol);
            }
            let mut done = 0;
            while done < n {
                let k = CHUNK.min(n - done);
                for (j, slot) in buffer[..k].iter_mut().enumerate() {
                    if walk.inner {
                        e.rows[outer] = row_taps(&levels[outer], done + j);
                    }
                    *slot = D::eval(&e, 0, walk.base(s, done + j));
                }
                write(
                    out,
                    (d + done as i64 * d_last) as usize,
                    d_last,
                    &buffer[..k],
                );
                done += k;
            }
        },
    );
}

#[inline(always)]
fn nearest_address(
    walk: &ResizeWalk,
    t: &ResizeTables,
    index: &[u32],
    s: i64,
    o: usize,
    slots: &mut [usize; MAX_RESIZE_LEVELS],
) -> Option<usize> {
    walk.coordinates(index, o, slots);
    let mut at = walk.base(s, o);
    for ((level, &ol), &stride) in t.levels[..t.count].iter().zip(&*slots).zip(&walk.strides) {
        let k = level.idx[level.off[ol] as usize];
        if k < 0 {
            return None;
        }
        at += k as i64 * stride;
    }
    Some(at as usize)
}

fn resize_nearest(
    dst: Destination,
    src: Source,
    out_shape: &[u32],
    t: &ResizeTables,
    constant: &[u8],
    zero: bool,
) {
    let walk = ResizeWalk::new(&src, &dst, out_shape, t);
    let input = src.bytes;
    let out = dst.bytes;
    let size = dst.dtype.size();
    let (n, d_last) = (walk.n, walk.d_last);
    let mut slots = [0usize; MAX_RESIZE_LEVELS];
    if zero || src.dtype == dst.dtype {
        for_each_outer(
            out_shape,
            &walk.batch,
            &walk.ds,
            src.offset as i64,
            dst.offset as i64,
            |index, s, d| {
                for o in 0..n {
                    let du = (d + o as i64 * d_last) as usize;
                    let target = &mut out[du..du + size];
                    match nearest_address(&walk, t, index, s, o, &mut slots) {
                        None => target.copy_from_slice(constant),
                        Some(_) if zero => target.fill(0),
                        Some(su) => target.copy_from_slice(&input[su..su + size]),
                    }
                }
            },
        );
        return;
    }
    let load = loader_for(src.dtype);
    let write = writer_for(dst.dtype, ARITHMETIC_MODE);
    let mut buffer = [0f64; CHUNK];
    let mut constants = [false; CHUNK];
    for_each_outer(
        out_shape,
        &walk.batch,
        &walk.ds,
        src.offset as i64,
        dst.offset as i64,
        |index, s, d| {
            let mut done = 0;
            while done < n {
                let k = CHUNK.min(n - done);
                let mut any = false;
                for (j, (slot, flag)) in buffer[..k].iter_mut().zip(&mut constants[..k]).enumerate()
                {
                    let at = nearest_address(&walk, t, index, s, done + j, &mut slots);
                    *flag = at.is_none();
                    any |= *flag;
                    *slot = at.map_or(0.0, |su| load(input, su));
                }
                let start = d + done as i64 * d_last;
                write(out, start as usize, d_last, &buffer[..k]);
                if any {
                    for (j, _) in constants[..k].iter().enumerate().filter(|(_, c)| **c) {
                        let du = (start + j as i64 * d_last) as usize;
                        out[du..du + size].copy_from_slice(constant);
                    }
                }
                done += k;
            }
        },
    );
}

fn resize_part(
    dst: Destination,
    src: Source,
    out_shape: &[u32],
    t: &ResizeTables,
    part: usize,
    zero: bool,
) {
    if t.weighted {
        resize_weighted(dst, src, out_shape, t, t.value[part]);
    } else {
        let size = dst.dtype.size();
        let constant = &t.constant[part * size..(part + 1) * size];
        resize_nearest(dst, src, out_shape, t, constant, zero);
    }
}

fn resize_complex(dst: Destination, src: Source, out_shape: &[u32], t: &ResizeTables) -> u32 {
    let (dst_part, src_part) = (dst.dtype.component(), src.dtype.component());
    let parts = if src.dtype.is_complex() { 2 } else { 1 };
    for part in 0..2 {
        let target = Destination {
            bytes: &mut *dst.bytes,
            dtype: dst_part,
            offset: dst.offset + part as u32 * dst_part.size() as u32,
            strides: dst.strides,
        };
        let source = Source {
            bytes: src.bytes,
            dtype: src_part,
            offset: src.offset + (part % parts) as u32 * src_part.size() as u32,
            strides: src.strides,
        };
        if part < parts {
            resize_part(target, source, out_shape, t, part, false);
        } else if !t.weighted {
            resize_part(target, source, out_shape, t, part, true);
        } else {
            let status = zero_fill(target, out_shape);
            if status != STATUS_OK {
                return status;
            }
        }
    }
    STATUS_OK
}

pub(crate) fn resize(
    dst: Destination,
    src: Source,
    out_shape: &[u32],
    tables: ResizeTables,
) -> u32 {
    if src.dtype.is_complex() && !dst.dtype.is_complex() {
        return STATUS_INVALID_DTYPE;
    }
    let nd = out_shape.len();
    if nd == 0 || nd > MAX_RANK || src.strides.len() != nd || dst.strides.len() != nd {
        return STATUS_INVALID_RANK;
    }
    let t = &tables;
    if t.count == 0 || t.count > MAX_RESIZE_LEVELS {
        return STATUS_INVALID_PARAMETERS;
    }
    let levels = &t.levels[..t.count];
    let ascending = levels.windows(2).all(|p| p[0].axis < p[1].axis);
    if !ascending || levels[t.count - 1].axis >= nd {
        return STATUS_INVALID_PARAMETERS;
    }
    let mut src_shape = [0u32; MAX_RANK];
    src_shape[..nd].copy_from_slice(out_shape);
    for level in levels {
        let n = out_shape[level.axis] as usize;
        if !valid_taps(level.off, level.idx, level.w, n, level.src, t.weighted) {
            return STATUS_INVALID_TABLE;
        }
        src_shape[level.axis] = level.src;
    }
    if out_shape.contains(&0) {
        return STATUS_OK;
    }
    if !src_shape[..nd].contains(&0)
        && !layout_within(
            src.bytes.len(),
            &src_shape[..nd],
            src.strides,
            src.offset,
            src.dtype.size(),
        )
    {
        return STATUS_SOURCE_BOUNDS;
    }
    if !layout_within(
        dst.bytes.len(),
        out_shape,
        dst.strides,
        dst.offset,
        dst.dtype.size(),
    ) {
        return STATUS_DESTINATION_BOUNDS;
    }
    if dst.dtype.is_complex() && (t.weighted || src.dtype != dst.dtype) {
        return resize_complex(dst, src, out_shape, t);
    }
    resize_part(dst, src, out_shape, t, 0, false);
    STATUS_OK
}

const REDUCE_BLOCK: usize = 64;
const REDUCE_TILE_OUTER: usize = 1024;
const REDUCE_TILE_TINY: usize = 512;
const REDUCE_TILE_SHORT: usize = 64;
const REDUCE_TINY_AXIS: u32 = 32;
const REDUCE_SHORT_AXIS: u32 = 1536;

const F32_NAN_BITS: u32 = 0x7FC0_0000;
const F64_NAN_BITS: u64 = 0x7FF8_0000_0000_0000;
const KEY_SIGN: u64 = 1 << 63;
const KEY_NAN: u64 = u64::MAX;
const NO_INDEX: u32 = u32::MAX;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub(crate) enum ReduceOp {
    Sum,
    Prod,
    Mean,
    Var,
    Std,
    Min,
    Max,
    ArgMin,
    ArgMax,
    MinMax,
    VarMean,
    StdMean,
}

impl ReduceOp {
    pub(crate) fn from_code(code: u32) -> Option<ReduceOp> {
        match code {
            0 => Some(ReduceOp::Sum),
            1 => Some(ReduceOp::Prod),
            2 => Some(ReduceOp::Mean),
            3 => Some(ReduceOp::Var),
            4 => Some(ReduceOp::Std),
            5 => Some(ReduceOp::Min),
            6 => Some(ReduceOp::Max),
            7 => Some(ReduceOp::ArgMin),
            8 => Some(ReduceOp::ArgMax),
            9 => Some(ReduceOp::MinMax),
            10 => Some(ReduceOp::VarMean),
            11 => Some(ReduceOp::StdMean),
            _ => None,
        }
    }

    fn fused(self) -> bool {
        matches!(
            self,
            ReduceOp::MinMax | ReduceOp::VarMean | ReduceOp::StdMean
        )
    }

    fn variance(self) -> bool {
        matches!(
            self,
            ReduceOp::Var | ReduceOp::Std | ReduceOp::VarMean | ReduceOp::StdMean
        )
    }

    fn ordered(self) -> bool {
        matches!(
            self,
            ReduceOp::Min | ReduceOp::Max | ReduceOp::ArgMin | ReduceOp::ArgMax | ReduceOp::MinMax
        )
    }
}

pub(crate) struct ReduceOutput<'a> {
    pub(crate) bytes: &'a mut [u8],
    pub(crate) dtype: DType,
    pub(crate) offset: u32,
}

#[derive(Clone, Copy, PartialEq, Debug)]
pub(crate) struct ReduceSpec {
    pub(crate) op: ReduceOp,
    pub(crate) omit: bool,
    pub(crate) saturate: bool,
    pub(crate) ddof: f64,
}

fn is_float(dtype: DType) -> bool {
    matches!(dtype, DType::F32 | DType::F64)
}

fn is_integer(dtype: DType) -> bool {
    !is_float(dtype) && !dtype.is_complex()
}

fn is_signed(dtype: DType) -> bool {
    matches!(dtype, DType::I8 | DType::I16 | DType::I32)
}

fn complex_of(dtype: DType) -> Option<DType> {
    match dtype {
        DType::F32 => Some(DType::C64),
        DType::F64 => Some(DType::C128),
        _ => None,
    }
}

fn valid_reduce_dtypes(op: ReduceOp, src: DType, out: DType, out2: Option<DType>) -> bool {
    let complex = src.is_complex();
    match op {
        ReduceOp::Sum | ReduceOp::Prod => {
            if complex {
                out.is_complex()
            } else if is_float(src) {
                is_float(out)
            } else {
                !out.is_complex()
            }
        }
        ReduceOp::Mean => {
            if complex {
                out.is_complex()
            } else {
                is_float(out)
            }
        }
        ReduceOp::Var | ReduceOp::Std => is_float(out),
        ReduceOp::Min | ReduceOp::Max => !complex && out == src,
        ReduceOp::ArgMin | ReduceOp::ArgMax => !complex && out == DType::U32,
        ReduceOp::MinMax => !complex && out == src && out2 == Some(src),
        ReduceOp::VarMean | ReduceOp::StdMean => {
            let mean = if complex { complex_of(out) } else { Some(out) };
            is_float(out) && out2.is_some() && out2 == mean
        }
    }
}

#[inline(always)]
pub(crate) fn f32_order_key(v: f32) -> u64 {
    let bits = v.to_bits();
    if v.is_nan() {
        KEY_NAN
    } else if bits >> 31 == 1 {
        !bits as u64
    } else {
        (bits | 0x8000_0000) as u64
    }
}

#[inline(always)]
pub(crate) fn f64_order_key(v: f64) -> u64 {
    let bits = v.to_bits();
    if v.is_nan() {
        KEY_NAN
    } else if bits >> 63 == 1 {
        !bits
    } else {
        bits | KEY_SIGN
    }
}

pub(crate) trait KeyElement: Element {
    fn order_key(self) -> u64;
}

macro_rules! int_key {
    ($t:ty) => {
        impl KeyElement for $t {
            #[inline(always)]
            fn order_key(self) -> u64 {
                (self as i64 as u64) ^ KEY_SIGN
            }
        }
    };
}

int_key!(i8);
int_key!(u8);
int_key!(i16);
int_key!(u16);
int_key!(i32);
int_key!(u32);

impl KeyElement for f32 {
    #[inline(always)]
    fn order_key(self) -> u64 {
        f32_order_key(self)
    }
}

impl KeyElement for f64 {
    #[inline(always)]
    fn order_key(self) -> u64 {
        f64_order_key(self)
    }
}

type KeyReader = fn(&[u8], usize, i64, &mut [u64]);

fn read_keys<S: KeyElement>(src: &[u8], offset: usize, stride: i64, out: &mut [u64]) {
    let mut at = offset as i64;
    for v in out.iter_mut() {
        *v = S::load(src, at as usize).order_key();
        at += stride;
    }
}

fn key_reader_for(dtype: DType) -> KeyReader {
    match dtype {
        DType::I8 => read_keys::<i8>,
        DType::U8 => read_keys::<u8>,
        DType::I16 => read_keys::<i16>,
        DType::U16 => read_keys::<u16>,
        DType::I32 => read_keys::<i32>,
        DType::U32 => read_keys::<u32>,
        DType::F32 => read_keys::<f32>,
        DType::F64 => read_keys::<f64>,
        DType::C64 | DType::C128 => unreachable!("complex dtypes have no ordering"),
    }
}

fn store_key(out: &mut [u8], at: usize, dtype: DType, key: u64) {
    match dtype {
        DType::I8 | DType::U8 => ((key ^ KEY_SIGN) as u8).store(out, at),
        DType::I16 | DType::U16 => ((key ^ KEY_SIGN) as u16).store(out, at),
        DType::I32 | DType::U32 => ((key ^ KEY_SIGN) as u32).store(out, at),
        DType::F32 => {
            let k = key as u32;
            (if k >> 31 == 1 { k & 0x7FFF_FFFF } else { !k }).store(out, at);
        }
        DType::F64 => {
            let bits = if key >> 63 == 1 {
                key & !KEY_SIGN
            } else {
                !key
            };
            f64::from_bits(bits).store(out, at);
        }
        DType::C64 | DType::C128 => unreachable!("complex dtypes have no ordering"),
    }
}

fn store_nan(out: &mut [u8], at: usize, dtype: DType) {
    match dtype {
        DType::F32 => F32_NAN_BITS.store(out, at),
        DType::F64 => f64::from_bits(F64_NAN_BITS).store(out, at),
        _ => unreachable!("only floating-point outputs hold NaN"),
    }
}

fn store_float(out: &mut [u8], at: usize, dtype: DType, v: f64) {
    if v.is_nan() {
        store_nan(out, at, dtype);
    } else if dtype == DType::F32 {
        (v as f32).store(out, at);
    } else {
        v.store(out, at);
    }
}

fn store_complex(out: &mut [u8], at: usize, dtype: DType, re: f64, im: f64) {
    let part = dtype.component();
    let (a, b) = if re.is_nan() || im.is_nan() {
        (f64::NAN, f64::NAN)
    } else {
        (re, im)
    };
    store_float(out, at, part, a);
    store_float(out, at + part.size(), part, b);
}

fn store_identity(out: &mut [u8], at: usize, dtype: DType, one: bool) {
    let size = dtype.size();
    out[at..at + size].fill(0);
    if !one {
        return;
    }
    match dtype {
        DType::I8 => 1i8.store(out, at),
        DType::U8 => 1u8.store(out, at),
        DType::I16 => 1i16.store(out, at),
        DType::U16 => 1u16.store(out, at),
        DType::I32 => 1i32.store(out, at),
        DType::U32 => 1u32.store(out, at),
        DType::F32 | DType::C64 => 1f32.store(out, at),
        DType::F64 | DType::C128 => 1f64.store(out, at),
    }
}

macro_rules! store_exact_int {
    ($t:ty, $exact:expr, $saturate:expr, $out:expr, $at:expr) => {{
        let exact: i128 = $exact;
        let v = if $saturate {
            exact.clamp(<$t>::MIN as i128, <$t>::MAX as i128)
        } else {
            exact
        };
        (v as $t).store($out, $at);
    }};
}

fn store_exact(out: &mut [u8], at: usize, dtype: DType, wide: u64, signed: bool, saturate: bool) {
    let exact = if signed {
        wide as i64 as i128
    } else {
        wide as i128
    };
    match dtype {
        DType::I8 => store_exact_int!(i8, exact, saturate, out, at),
        DType::U8 => store_exact_int!(u8, exact, saturate, out, at),
        DType::I16 => store_exact_int!(i16, exact, saturate, out, at),
        DType::U16 => store_exact_int!(u16, exact, saturate, out, at),
        DType::I32 => store_exact_int!(i32, exact, saturate, out, at),
        DType::U32 => store_exact_int!(u32, exact, saturate, out, at),
        DType::F32 => (if signed {
            wide as i64 as f32
        } else {
            wide as f32
        })
        .store(out, at),
        DType::F64 => (if signed {
            wide as i64 as f64
        } else {
            wide as f64
        })
        .store(out, at),
        DType::C64 | DType::C128 => unreachable!("integer reductions have real outputs"),
    }
}

struct ReduceWalk {
    kept_shape: [u32; MAX_RANK],
    kept_strides: [i64; MAX_RANK],
    output_steps: [i64; MAX_RANK],
    kept: usize,
    reduced_shape: [u32; MAX_RANK],
    reduced_strides: [i64; MAX_RANK],
    reduced: usize,
    outputs: u32,
    count: u32,
    empty: bool,
    base: i64,
}

impl ReduceWalk {
    fn new(shape: &[u32], strides: &[i32], reduced: &[u32], base: u32) -> Option<ReduceWalk> {
        let mut walk = ReduceWalk {
            kept_shape: [0; MAX_RANK],
            kept_strides: [0; MAX_RANK],
            output_steps: [0; MAX_RANK],
            kept: 0,
            reduced_shape: [0; MAX_RANK],
            reduced_strides: [0; MAX_RANK],
            reduced: 0,
            outputs: 1,
            count: 1,
            empty: false,
            base: base as i64,
        };
        let (mut outputs, mut count) = (1u64, 1u64);
        for ((&n, &s), &flag) in shape.iter().zip(strides).zip(reduced) {
            if flag == 0 {
                walk.kept_shape[walk.kept] = n;
                walk.kept_strides[walk.kept] = s as i64;
                walk.kept += 1;
                outputs = outputs.checked_mul(n as u64)?;
            } else {
                walk.reduced_shape[walk.reduced] = n;
                walk.reduced_strides[walk.reduced] = s as i64;
                walk.reduced += 1;
                walk.empty |= n == 0;
                count = count.saturating_mul(n as u64);
            }
        }
        if outputs > u32::MAX as u64 || (!walk.empty && count > u32::MAX as u64) {
            return None;
        }
        walk.outputs = outputs as u32;
        walk.count = if walk.empty { 0 } else { count as u32 };
        let mut step = 1i64;
        for d in (0..walk.kept).rev() {
            walk.output_steps[d] = step;
            step *= walk.kept_shape[d] as i64;
        }
        let smallest = (0..walk.kept)
            .filter(|&d| walk.kept_shape[d] > 1)
            .min_by_key(|&d| walk.kept_strides[d].unsigned_abs());
        if let Some(d) = smallest {
            walk.kept_shape[d..walk.kept].rotate_left(1);
            walk.kept_strides[d..walk.kept].rotate_left(1);
            walk.output_steps[d..walk.kept].rotate_left(1);
        }
        Some(walk)
    }

    fn runs(&self, base: i64, mut visit: impl FnMut(i64, i64, usize)) {
        let zeros = [0i64; MAX_RANK];
        let (n, stride, _) = inner(
            &self.reduced_shape[..self.reduced],
            &self.reduced_strides,
            &zeros,
        );
        for_each_outer(
            &self.reduced_shape[..self.reduced],
            &self.reduced_strides,
            &zeros,
            base,
            0,
            |_, s, _| visit(s, stride, n),
        );
    }

    fn tiles(&self, tile: usize, mut visit: impl FnMut(usize, usize, i64, i64, usize)) {
        let (n, stride, step) = inner(
            &self.kept_shape[..self.kept],
            &self.kept_strides,
            &self.output_steps,
        );
        for_each_outer(
            &self.kept_shape[..self.kept],
            &self.kept_strides,
            &self.output_steps,
            self.base,
            0,
            |_, s, o| {
                let mut done = 0;
                while done < n {
                    let width = tile.min(n - done);
                    visit(
                        (o + done as i64 * step) as usize,
                        step as usize,
                        s + done as i64 * stride,
                        stride,
                        width,
                    );
                    done += width;
                }
            },
        );
    }

    fn tile(&self) -> usize {
        if self.kept == 0 {
            return 1;
        }
        let kept = self.kept_strides[self.kept - 1].unsigned_abs();
        let reduced = self.reduced_strides[..self.reduced]
            .iter()
            .map(|s| s.unsigned_abs())
            .min()
            .unwrap_or(u64::MAX);
        let tile = if kept <= reduced {
            REDUCE_TILE_OUTER
        } else if self.count < REDUCE_TINY_AXIS {
            REDUCE_TILE_TINY
        } else if self.count <= REDUCE_SHORT_AXIS {
            REDUCE_TILE_SHORT
        } else {
            1
        };
        tile.min(self.kept_shape[self.kept - 1] as usize)
    }
}

trait Reducer {
    fn begin(&mut self, width: usize);
    fn run(&mut self, input: &[u8], at: i64, stride: i64, count: usize, seq: u32);
    fn row(&mut self, input: &[u8], at: i64, stride: i64, seq: u32);
    fn end_block(&mut self) {}
}

fn scan<R: Reducer>(
    reducer: &mut R,
    walk: &ReduceWalk,
    input: &[u8],
    base: i64,
    kept_stride: i64,
    width: usize,
) {
    reducer.begin(width);
    let (mut seq, mut filled) = (0u32, 0usize);
    walk.runs(base, |start, stride, n| {
        let mut done = 0;
        while done < n {
            if width == 1 {
                let k = (REDUCE_BLOCK - filled).min(n - done);
                reducer.run(input, start + done as i64 * stride, stride, k, seq);
                seq = seq.wrapping_add(k as u32);
                filled += k;
                done += k;
            } else {
                reducer.row(input, start + done as i64 * stride, kept_stride, seq);
                seq = seq.wrapping_add(1);
                filled += 1;
                done += 1;
            }
            if filled == REDUCE_BLOCK {
                reducer.end_block();
                filled = 0;
            }
        }
    });
    if filled > 0 {
        reducer.end_block();
    }
}

struct Cascade {
    width: usize,
    stack: Vec<f64>,
    levels: Vec<u32>,
    top: usize,
}

impl Cascade {
    fn new(capacity: usize, count: u32) -> Cascade {
        let blocks = (count as u64).div_ceil(REDUCE_BLOCK as u64);
        let depth = (u64::BITS - blocks.leading_zeros()) as usize + 1;
        Cascade {
            width: capacity,
            stack: vec![0.0; capacity * depth],
            levels: vec![0; depth],
            top: 0,
        }
    }

    #[inline(always)]
    fn push(&mut self, block: &[f64], merge: impl Fn(&mut [f64], &[f64])) {
        let w = self.width;
        self.stack[self.top * w..(self.top + 1) * w].copy_from_slice(&block[..w]);
        self.levels[self.top] = 0;
        self.top += 1;
        while self.top >= 2 && self.levels[self.top - 1] == self.levels[self.top - 2] {
            let (older, newer) = self.stack.split_at_mut((self.top - 1) * w);
            merge(&mut older[(self.top - 2) * w..], &newer[..w]);
            self.levels[self.top - 2] += 1;
            self.top -= 1;
        }
    }

    #[inline(always)]
    fn finish(&mut self, out: &mut [f64], merge: impl Fn(&[f64], &mut [f64])) -> bool {
        let w = self.width;
        if self.top == 0 {
            return false;
        }
        out[..w].copy_from_slice(&self.stack[(self.top - 1) * w..self.top * w]);
        for i in (0..self.top - 1).rev() {
            merge(&self.stack[i * w..(i + 1) * w], &mut out[..w]);
        }
        self.top = 0;
        true
    }
}

#[inline(always)]
fn add_merge(older: &mut [f64], newer: &[f64]) {
    for (a, b) in older.iter_mut().zip(newer) {
        *a += *b;
    }
}

#[inline(always)]
fn add_fold(entry: &[f64], acc: &mut [f64]) {
    for (a, e) in acc.iter_mut().zip(entry) {
        *a += *e;
    }
}

#[inline(always)]
fn sum_run<const OMIT: bool, const CENTER: bool>(s: &mut f64, mean: f64, values: &[f64]) -> u32 {
    let (mut acc, mut kept) = (*s, 0u32);
    for &v in values {
        let y = if CENTER {
            let d = v - mean;
            d * d
        } else {
            v
        };
        if OMIT {
            let keep = !v.is_nan();
            acc += if keep { y } else { -0.0 };
            kept += keep as u32;
        } else {
            acc += y;
        }
    }
    *s = acc;
    kept
}

#[inline(always)]
fn sum_row<const OMIT: bool, const CENTER: bool>(block: &mut [f64], means: &[f64], values: &[f64]) {
    for (j, (s, &v)) in block.iter_mut().zip(values).enumerate() {
        let y = if CENTER {
            let d = v - means[j];
            d * d
        } else {
            v
        };
        if OMIT {
            *s += if v.is_nan() { -0.0 } else { y };
        } else {
            *s += y;
        }
    }
}

fn mask_pairs(re: &mut [f64], im: &mut [f64]) {
    for (a, b) in re.iter_mut().zip(im) {
        if a.is_nan() || b.is_nan() {
            *a = f64::NAN;
            *b = f64::NAN;
        }
    }
}

struct Fold<const OMIT: bool, const CENTER: bool> {
    read: Reader,
    part: i64,
    comps: usize,
    outputs: usize,
    block: Vec<f64>,
    counts: Vec<u32>,
    means: Vec<f64>,
    re: Vec<f64>,
    im: Vec<f64>,
    cascade: Cascade,
}

impl<const OMIT: bool, const CENTER: bool> Fold<OMIT, CENTER> {
    fn new(src: DType, tile: usize, count: u32) -> Self {
        let part = src.component();
        let comps = if src.is_complex() { 2 } else { 1 };
        let buffer = REDUCE_BLOCK.max(tile);
        Fold {
            read: reader_for(part),
            part: part.size() as i64,
            comps,
            outputs: tile,
            block: vec![-0.0; tile * comps],
            counts: vec![0; tile],
            means: if CENTER {
                vec![0.0; tile * comps]
            } else {
                Vec::new()
            },
            re: vec![0.0; buffer],
            im: vec![0.0; if comps == 2 { buffer } else { 0 }],
            cascade: Cascade::new(tile * comps, count),
        }
    }

    fn total(&mut self, out: &mut [f64]) {
        self.cascade.finish(out, add_fold);
    }
}

impl<const OMIT: bool, const CENTER: bool> Reducer for Fold<OMIT, CENTER> {
    fn begin(&mut self, width: usize) {
        self.outputs = width;
        self.cascade.width = width * self.comps;
        self.block[..width * self.comps].fill(-0.0);
        self.counts[..width].fill(0);
    }

    fn run(&mut self, input: &[u8], at: i64, stride: i64, count: usize, _seq: u32) {
        (self.read)(input, at as usize, stride, &mut self.re[..count]);
        let mean = |c: usize, means: &[f64]| if CENTER { means[c] } else { 0.0 };
        if self.comps == 2 {
            (self.read)(
                input,
                (at + self.part) as usize,
                stride,
                &mut self.im[..count],
            );
            if OMIT {
                mask_pairs(&mut self.re[..count], &mut self.im[..count]);
            }
            sum_run::<OMIT, CENTER>(&mut self.block[1], mean(1, &self.means), &self.im[..count]);
        }
        let kept =
            sum_run::<OMIT, CENTER>(&mut self.block[0], mean(0, &self.means), &self.re[..count]);
        if OMIT {
            self.counts[0] += kept;
        }
    }

    fn row(&mut self, input: &[u8], at: i64, stride: i64, _seq: u32) {
        let t = self.outputs;
        (self.read)(input, at as usize, stride, &mut self.re[..t]);
        if self.comps == 2 {
            (self.read)(input, (at + self.part) as usize, stride, &mut self.im[..t]);
            if OMIT {
                mask_pairs(&mut self.re[..t], &mut self.im[..t]);
            }
            let means_im: &[f64] = if CENTER { &self.means[t..2 * t] } else { &[] };
            sum_row::<OMIT, CENTER>(&mut self.block[t..2 * t], means_im, &self.im[..t]);
        }
        let means_re: &[f64] = if CENTER { &self.means[..t] } else { &[] };
        sum_row::<OMIT, CENTER>(&mut self.block[..t], means_re, &self.re[..t]);
        if OMIT {
            for (c, v) in self.counts[..t].iter_mut().zip(&self.re[..t]) {
                *c += !v.is_nan() as u32;
            }
        }
    }

    fn end_block(&mut self) {
        let w = self.outputs * self.comps;
        self.cascade.push(&self.block, add_merge);
        self.block[..w].fill(-0.0);
    }
}

struct IntFold {
    read: KeyReader,
    outputs: usize,
    acc: Vec<u64>,
    keys: Vec<u64>,
}

impl IntFold {
    fn new(src: DType, tile: usize) -> IntFold {
        IntFold {
            read: key_reader_for(src),
            outputs: tile,
            acc: vec![0; tile],
            keys: vec![0; REDUCE_BLOCK.max(tile)],
        }
    }
}

impl Reducer for IntFold {
    fn begin(&mut self, width: usize) {
        self.outputs = width;
        self.acc[..width].fill(0);
    }

    fn run(&mut self, input: &[u8], at: i64, stride: i64, count: usize, _seq: u32) {
        (self.read)(input, at as usize, stride, &mut self.keys[..count]);
        let mut acc = self.acc[0];
        for &k in &self.keys[..count] {
            acc = acc.wrapping_add(k ^ KEY_SIGN);
        }
        self.acc[0] = acc;
    }

    fn row(&mut self, input: &[u8], at: i64, stride: i64, _seq: u32) {
        let t = self.outputs;
        (self.read)(input, at as usize, stride, &mut self.keys[..t]);
        for (a, &k) in self.acc[..t].iter_mut().zip(&self.keys[..t]) {
            *a = a.wrapping_add(k ^ KEY_SIGN);
        }
    }
}

struct IntProduct {
    read: KeyReader,
    acc: u32,
    keys: [u64; REDUCE_BLOCK],
}

impl Reducer for IntProduct {
    fn begin(&mut self, _width: usize) {
        self.acc = 1;
    }

    fn run(&mut self, input: &[u8], at: i64, stride: i64, count: usize, _seq: u32) {
        (self.read)(input, at as usize, stride, &mut self.keys[..count]);
        for &k in &self.keys[..count] {
            self.acc = self.acc.wrapping_mul((k ^ KEY_SIGN) as u32);
        }
    }

    fn row(&mut self, _: &[u8], _: i64, _: i64, _: u32) {
        unreachable!("products run one output at a time");
    }
}

#[inline(always)]
fn complex_mul(a: [f64; 2], b: [f64; 2]) -> [f64; 2] {
    [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
}

fn mul_merge(older: &mut [f64], newer: &[f64]) {
    if older.len() == 2 {
        let r = complex_mul([older[0], older[1]], [newer[0], newer[1]]);
        older[..2].copy_from_slice(&r);
    } else {
        older[0] *= newer[0];
    }
}

fn mul_fold(entry: &[f64], acc: &mut [f64]) {
    if acc.len() == 2 {
        let r = complex_mul([entry[0], entry[1]], [acc[0], acc[1]]);
        acc[..2].copy_from_slice(&r);
    } else {
        acc[0] *= entry[0];
    }
}

struct Product<const OMIT: bool> {
    read: Reader,
    part: i64,
    comps: usize,
    block: [f64; 2],
    filled: bool,
    re: [f64; REDUCE_BLOCK],
    im: [f64; REDUCE_BLOCK],
    cascade: Cascade,
}

impl<const OMIT: bool> Product<OMIT> {
    fn new(src: DType, count: u32) -> Self {
        let part = src.component();
        let comps = if src.is_complex() { 2 } else { 1 };
        Product {
            read: reader_for(part),
            part: part.size() as i64,
            comps,
            block: [1.0, 0.0],
            filled: false,
            re: [0.0; REDUCE_BLOCK],
            im: [0.0; REDUCE_BLOCK],
            cascade: Cascade::new(comps, count),
        }
    }

    fn total(&mut self) -> [f64; 2] {
        let mut out = [1.0, 0.0];
        let comps = self.comps;
        self.cascade.finish(&mut out[..comps], mul_fold);
        out
    }
}

impl<const OMIT: bool> Reducer for Product<OMIT> {
    fn begin(&mut self, _width: usize) {
        self.block = [1.0, 0.0];
        self.filled = false;
    }

    fn run(&mut self, input: &[u8], at: i64, stride: i64, count: usize, _seq: u32) {
        (self.read)(input, at as usize, stride, &mut self.re[..count]);
        if self.comps == 2 {
            (self.read)(
                input,
                (at + self.part) as usize,
                stride,
                &mut self.im[..count],
            );
            for (&re, &im) in self.re[..count].iter().zip(&self.im[..count]) {
                if OMIT && (re.is_nan() || im.is_nan()) {
                    continue;
                }
                self.block = if self.filled {
                    complex_mul(self.block, [re, im])
                } else {
                    [re, im]
                };
                self.filled = true;
            }
            return;
        }
        for &v in &self.re[..count] {
            if OMIT && v.is_nan() {
                continue;
            }
            self.block[0] *= v;
            self.filled = true;
        }
    }

    fn row(&mut self, _: &[u8], _: i64, _: i64, _: u32) {
        unreachable!("products run one output at a time");
    }

    fn end_block(&mut self) {
        if self.filled {
            self.cascade.push(&self.block, mul_merge);
        }
        self.block = [1.0, 0.0];
        self.filled = false;
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum KeyMode {
    Extreme,
    Both,
    Arg,
}

struct KeyFold {
    mode: KeyMode,
    read: KeyReader,
    invert: u64,
    nan_key: u64,
    negative_zero: u64,
    positive_zero: u64,
    outputs: usize,
    best: Vec<u64>,
    other: Vec<u64>,
    index: Vec<u32>,
    keys: Vec<u64>,
}

impl KeyFold {
    fn new(op: ReduceOp, src: DType, omit: bool, tile: usize) -> KeyFold {
        let mode = match op {
            ReduceOp::Min | ReduceOp::Max => KeyMode::Extreme,
            ReduceOp::MinMax => KeyMode::Both,
            _ => KeyMode::Arg,
        };
        let (negative_zero, positive_zero) = match src {
            DType::F32 => (f32_order_key(-0.0), f32_order_key(0.0)),
            DType::F64 => (f64_order_key(-0.0), f64_order_key(0.0)),
            _ => (KEY_NAN, KEY_NAN),
        };
        KeyFold {
            mode,
            read: key_reader_for(src),
            invert: if matches!(op, ReduceOp::Max | ReduceOp::ArgMax) {
                u64::MAX
            } else {
                0
            },
            nan_key: if omit { u64::MAX } else { 0 },
            negative_zero,
            positive_zero,
            outputs: tile,
            best: vec![u64::MAX; tile],
            other: vec![u64::MAX; if mode == KeyMode::Both { tile } else { 0 }],
            index: vec![NO_INDEX; if mode == KeyMode::Arg { tile } else { 0 }],
            keys: vec![0; REDUCE_BLOCK.max(tile)],
        }
    }

    #[inline(always)]
    fn ranked(&self, t: u64) -> u64 {
        if t == KEY_NAN {
            self.nan_key
        } else {
            t ^ self.invert
        }
    }
}

impl Reducer for KeyFold {
    fn begin(&mut self, width: usize) {
        self.outputs = width;
        self.best[..width].fill(u64::MAX);
        if self.mode == KeyMode::Both {
            self.other[..width].fill(u64::MAX);
        }
        if self.mode == KeyMode::Arg {
            self.index[..width].fill(NO_INDEX);
        }
    }

    fn run(&mut self, input: &[u8], at: i64, stride: i64, count: usize, seq: u32) {
        (self.read)(input, at as usize, stride, &mut self.keys[..count]);
        match self.mode {
            KeyMode::Extreme => {
                let mut best = self.best[0];
                for &t in &self.keys[..count] {
                    best = best.min(self.ranked(t));
                }
                self.best[0] = best;
            }
            KeyMode::Both => {
                let (mut low, mut high) = (self.best[0], self.other[0]);
                for &t in &self.keys[..count] {
                    let nan = t == KEY_NAN;
                    low = low.min(if nan { self.nan_key } else { t });
                    high = high.min(if nan { self.nan_key } else { !t });
                }
                self.best[0] = low;
                self.other[0] = high;
            }
            KeyMode::Arg => {
                for i in 0..count {
                    let t = self.keys[i];
                    let k = self.ranked(if t == self.negative_zero {
                        self.positive_zero
                    } else {
                        t
                    });
                    if k < self.best[0] {
                        self.best[0] = k;
                        self.index[0] = seq.wrapping_add(i as u32);
                    }
                }
            }
        }
    }

    fn row(&mut self, input: &[u8], at: i64, stride: i64, seq: u32) {
        let t = self.outputs;
        (self.read)(input, at as usize, stride, &mut self.keys[..t]);
        match self.mode {
            KeyMode::Extreme => {
                let (invert, nan_key) = (self.invert, self.nan_key);
                for (b, &k) in self.best[..t].iter_mut().zip(&self.keys[..t]) {
                    *b = (*b).min(if k == KEY_NAN { nan_key } else { k ^ invert });
                }
            }
            KeyMode::Both => {
                let nan_key = self.nan_key;
                for j in 0..t {
                    let k = self.keys[j];
                    let nan = k == KEY_NAN;
                    self.best[j] = self.best[j].min(if nan { nan_key } else { k });
                    self.other[j] = self.other[j].min(if nan { nan_key } else { !k });
                }
            }
            KeyMode::Arg => {
                for j in 0..t {
                    let raw = self.keys[j];
                    let k = self.ranked(if raw == self.negative_zero {
                        self.positive_zero
                    } else {
                        raw
                    });
                    if k < self.best[j] {
                        self.best[j] = k;
                        self.index[j] = seq;
                    }
                }
            }
        }
    }
}

fn reduce_keys(
    dst: ReduceOutput,
    dst2: Option<ReduceOutput>,
    src: &Source,
    walk: &ReduceWalk,
    spec: ReduceSpec,
    tile: usize,
) {
    let mut fold = KeyFold::new(spec.op, src.dtype, spec.omit, tile);
    let (out, out_dtype, out_offset) = (dst.bytes, dst.dtype, dst.offset as usize);
    let mut second = dst2;
    let size = out_dtype.size();
    walk.tiles(tile, |o, step, base, stride, width| {
        scan(&mut fold, walk, src.bytes, base, stride, width);
        for j in 0..width {
            let at = out_offset + (o + j * step) * size;
            match fold.mode {
                KeyMode::Arg => fold.index[j].store(out, at),
                _ => store_ranked(out, at, out_dtype, fold.best[j], fold.invert),
            }
            if let (KeyMode::Both, Some(second)) = (fold.mode, second.as_mut()) {
                store_ranked(
                    second.bytes,
                    second.offset as usize + (o + j * step) * size,
                    out_dtype,
                    fold.other[j],
                    u64::MAX,
                );
            }
        }
    });
}

fn store_ranked(out: &mut [u8], at: usize, dtype: DType, ranked: u64, invert: u64) {
    if ranked == 0 || ranked == u64::MAX {
        store_nan(out, at, dtype);
    } else {
        store_key(out, at, dtype, ranked ^ invert);
    }
}

fn reduce_int_totals(
    dst: ReduceOutput,
    src: &Source,
    walk: &ReduceWalk,
    spec: ReduceSpec,
    tile: usize,
) {
    let signed = is_signed(src.dtype);
    let size = dst.dtype.size();
    if spec.op == ReduceOp::Prod {
        let mut fold = IntProduct {
            read: key_reader_for(src.dtype),
            acc: 1,
            keys: [0; REDUCE_BLOCK],
        };
        walk.tiles(1, |o, _, base, stride, width| {
            scan(&mut fold, walk, src.bytes, base, stride, width);
            let wide = if signed {
                fold.acc as i32 as i64 as u64
            } else {
                fold.acc as u64
            };
            store_exact(
                dst.bytes,
                dst.offset as usize + o * size,
                dst.dtype,
                wide,
                signed,
                false,
            );
        });
        return;
    }
    let mut fold = IntFold::new(src.dtype, tile);
    walk.tiles(tile, |o, step, base, stride, width| {
        scan(&mut fold, walk, src.bytes, base, stride, width);
        for j in 0..width {
            store_exact(
                dst.bytes,
                dst.offset as usize + (o + j * step) * size,
                dst.dtype,
                fold.acc[j],
                signed,
                spec.saturate,
            );
        }
    });
}

fn reduce_float_products<const OMIT: bool>(dst: ReduceOutput, src: &Source, walk: &ReduceWalk) {
    let mut fold = Product::<OMIT>::new(src.dtype, walk.count);
    let complex = src.dtype.is_complex();
    let size = dst.dtype.size();
    walk.tiles(1, |o, _, base, stride, width| {
        scan(&mut fold, walk, src.bytes, base, stride, width);
        let total = fold.total();
        let at = dst.offset as usize + o * size;
        if complex {
            store_complex(dst.bytes, at, dst.dtype, total[0], total[1]);
        } else {
            store_float(dst.bytes, at, dst.dtype, total[0]);
        }
    });
}

fn reduce_float_totals<const OMIT: bool>(
    dst: ReduceOutput,
    src: &Source,
    walk: &ReduceWalk,
    spec: ReduceSpec,
    tile: usize,
) {
    let mut fold = Fold::<OMIT, false>::new(src.dtype, tile, walk.count);
    let comps = fold.comps;
    let size = dst.dtype.size();
    let mut totals = vec![0.0; tile * comps];
    walk.tiles(tile, |o, step, base, stride, width| {
        scan(&mut fold, walk, src.bytes, base, stride, width);
        fold.total(&mut totals);
        for j in 0..width {
            let at = dst.offset as usize + (o + j * step) * size;
            let n = if OMIT { fold.counts[j] } else { walk.count };
            let re = totals[j]
                / if spec.op == ReduceOp::Mean {
                    n as f64
                } else {
                    1.0
                };
            if comps == 2 {
                let im = totals[width + j]
                    / if spec.op == ReduceOp::Mean {
                        n as f64
                    } else {
                        1.0
                    };
                if n == 0 && spec.op == ReduceOp::Sum {
                    store_identity(dst.bytes, at, dst.dtype, false);
                } else {
                    store_complex(dst.bytes, at, dst.dtype, re, im);
                }
            } else if n == 0 && spec.op == ReduceOp::Sum {
                store_identity(dst.bytes, at, dst.dtype, false);
            } else {
                store_float(dst.bytes, at, dst.dtype, re);
            }
        }
    });
}

fn variance_value(
    m2: &[f64],
    width: usize,
    comps: usize,
    j: usize,
    n: u32,
    spec: ReduceSpec,
) -> f64 {
    let denom = n as f64 - spec.ddof;
    if denom <= 0.0 {
        return f64::NAN;
    }
    let mut v = m2[j] / denom;
    if comps == 2 {
        v += m2[width + j] / denom;
    }
    if matches!(spec.op, ReduceOp::Std | ReduceOp::StdMean) {
        v.sqrt()
    } else {
        v
    }
}

fn reduce_variance<const OMIT: bool>(
    dst: ReduceOutput,
    dst2: Option<ReduceOutput>,
    src: &Source,
    walk: &ReduceWalk,
    spec: ReduceSpec,
    tile: usize,
) {
    let integer = is_integer(src.dtype);
    let signed = is_signed(src.dtype);
    let mut first = Fold::<OMIT, false>::new(src.dtype, if integer { 1 } else { tile }, walk.count);
    let mut wide = if integer {
        Some(IntFold::new(src.dtype, tile))
    } else {
        None
    };
    let mut second = Fold::<OMIT, true>::new(src.dtype, tile, walk.count);
    let comps = second.comps;
    let size = dst.dtype.size();
    let mut totals = vec![0.0; tile * comps];
    let mut m2 = vec![0.0; tile * comps];
    let mut mean_out = dst2;
    walk.tiles(tile, |o, step, base, stride, width| {
        if let Some(wide) = wide.as_mut() {
            scan(wide, walk, src.bytes, base, stride, width);
            for (total, &acc) in totals[..width].iter_mut().zip(&wide.acc[..width]) {
                *total = if signed {
                    acc as i64 as f64
                } else {
                    acc as f64
                };
            }
        } else {
            scan(&mut first, walk, src.bytes, base, stride, width);
            first.total(&mut totals);
        }
        let count = |j: usize| {
            if OMIT && !integer {
                first.counts[j]
            } else {
                walk.count
            }
        };
        for c in 0..comps {
            for j in 0..width {
                second.means[c * width + j] = totals[c * width + j] / count(j) as f64;
            }
        }
        scan(&mut second, walk, src.bytes, base, stride, width);
        second.total(&mut m2);
        for j in 0..width {
            let v = variance_value(&m2, width, comps, j, count(j), spec);
            store_float(
                dst.bytes,
                dst.offset as usize + (o + j * step) * size,
                dst.dtype,
                v,
            );
            if let Some(out) = mean_out.as_mut() {
                let at = out.offset as usize + (o + j * step) * out.dtype.size();
                if comps == 2 {
                    store_complex(
                        out.bytes,
                        at,
                        out.dtype,
                        second.means[j],
                        second.means[width + j],
                    );
                } else {
                    store_float(out.bytes, at, out.dtype, second.means[j]);
                }
            }
        }
    });
}

fn reduce_int_means(dst: ReduceOutput, src: &Source, walk: &ReduceWalk, tile: usize) {
    let signed = is_signed(src.dtype);
    let size = dst.dtype.size();
    let mut fold = IntFold::new(src.dtype, tile);
    walk.tiles(tile, |o, step, base, stride, width| {
        scan(&mut fold, walk, src.bytes, base, stride, width);
        for j in 0..width {
            let total = if signed {
                fold.acc[j] as i64 as f64
            } else {
                fold.acc[j] as f64
            };
            store_float(
                dst.bytes,
                dst.offset as usize + (o + j * step) * size,
                dst.dtype,
                total / walk.count as f64,
            );
        }
    });
}

fn store_nan_element(out: &mut [u8], at: usize, dtype: DType) {
    let part = dtype.component();
    store_nan(out, at, part);
    if dtype.is_complex() {
        store_nan(out, at + part.size(), part);
    }
}

fn reduce_empty(
    dst: ReduceOutput,
    dst2: Option<ReduceOutput>,
    walk: &ReduceWalk,
    spec: ReduceSpec,
) {
    let size = dst.dtype.size();
    let nan = !matches!(spec.op, ReduceOp::Sum | ReduceOp::Prod);
    for o in 0..walk.outputs as usize {
        let at = dst.offset as usize + o * size;
        if nan {
            store_nan_element(dst.bytes, at, dst.dtype);
        } else {
            store_identity(dst.bytes, at, dst.dtype, spec.op == ReduceOp::Prod);
        }
    }
    if let Some(out) = dst2 {
        for o in 0..walk.outputs as usize {
            store_nan_element(
                out.bytes,
                out.offset as usize + o * out.dtype.size(),
                out.dtype,
            );
        }
    }
}

pub(crate) fn reduce(
    dst: ReduceOutput,
    dst2: Option<ReduceOutput>,
    src: Source,
    shape: &[u32],
    reduced: &[u32],
    spec: ReduceSpec,
) -> u32 {
    reduce_with_tile(dst, dst2, src, shape, reduced, spec, None)
}

pub(crate) fn reduce_with_tile(
    dst: ReduceOutput,
    dst2: Option<ReduceOutput>,
    src: Source,
    shape: &[u32],
    reduced: &[u32],
    spec: ReduceSpec,
    tile: Option<usize>,
) -> u32 {
    let nd = shape.len();
    if nd > MAX_RANK || src.strides.len() != nd || reduced.len() != nd {
        return STATUS_INVALID_RANK;
    }
    if !valid_reduce_dtypes(
        spec.op,
        src.dtype,
        dst.dtype,
        dst2.as_ref().map(|o| o.dtype),
    ) || (spec.op.fused() != dst2.is_some())
    {
        return STATUS_INVALID_DTYPE;
    }
    if reduced.iter().any(|&flag| flag > 1) {
        return STATUS_INVALID_PARAMETERS;
    }
    if spec.op.variance() && (!spec.ddof.is_finite() || spec.ddof < 0.0) {
        return STATUS_INVALID_PARAMETERS;
    }
    let Some(walk) = ReduceWalk::new(shape, src.strides, reduced, src.offset) else {
        return STATUS_INVALID_SHAPE;
    };
    if walk.outputs == 0 {
        return STATUS_OK;
    }
    if walk.empty && spec.op.ordered() {
        return STATUS_INVALID_SHAPE;
    }
    if !walk.empty
        && !layout_within(
            src.bytes.len(),
            shape,
            src.strides,
            src.offset,
            src.dtype.size(),
        )
    {
        return STATUS_SOURCE_BOUNDS;
    }
    let fits = |o: &ReduceOutput| {
        (o.offset as u64) + (walk.outputs as u64) * (o.dtype.size() as u64) <= o.bytes.len() as u64
    };
    if !fits(&dst) || !dst2.as_ref().is_none_or(fits) {
        return STATUS_DESTINATION_BOUNDS;
    }
    if walk.empty {
        reduce_empty(dst, dst2, &walk, spec);
        return STATUS_OK;
    }
    let tile = tile.unwrap_or_else(|| walk.tile()).max(1);
    let integer = is_integer(src.dtype);
    match spec.op {
        ReduceOp::Min | ReduceOp::Max | ReduceOp::ArgMin | ReduceOp::ArgMax | ReduceOp::MinMax => {
            reduce_keys(dst, dst2, &src, &walk, spec, tile);
        }
        ReduceOp::Sum if integer => reduce_int_totals(dst, &src, &walk, spec, tile),
        ReduceOp::Prod if integer => reduce_int_totals(dst, &src, &walk, spec, tile),
        ReduceOp::Mean if integer => reduce_int_means(dst, &src, &walk, tile),
        ReduceOp::Prod if spec.omit => reduce_float_products::<true>(dst, &src, &walk),
        ReduceOp::Prod => reduce_float_products::<false>(dst, &src, &walk),
        ReduceOp::Sum | ReduceOp::Mean if spec.omit => {
            reduce_float_totals::<true>(dst, &src, &walk, spec, tile)
        }
        ReduceOp::Sum | ReduceOp::Mean => {
            reduce_float_totals::<false>(dst, &src, &walk, spec, tile)
        }
        _ if spec.omit && !integer => reduce_variance::<true>(dst, dst2, &src, &walk, spec, tile),
        _ => reduce_variance::<false>(dst, dst2, &src, &walk, spec, tile),
    }
    STATUS_OK
}

fn ranges_overlap(a_ptr: u32, a_len: usize, b_ptr: u32, b_len: usize) -> bool {
    let (a0, a1) = (a_ptr as u64, a_ptr as u64 + a_len as u64);
    let (b0, b1) = (b_ptr as u64, b_ptr as u64 + b_len as u64);
    a_len != 0 && b_len != 0 && a0 < b1 && b0 < a1
}

fn valid_descriptor(ptr: u32, bytes: usize, align: u32, dst_ptr: u32, dst_len: u32) -> bool {
    ptr != 0 && ptr % align == 0 && !ranges_overlap(ptr, bytes, dst_ptr, dst_len as usize)
}

unsafe fn borrow_pair<'call>(
    call: DriverCall<'call>,
    dst_ptr: u32,
    dst_len: u32,
    src_ptr: u32,
    src_len: u32,
) -> Result<(&'call mut [u8], &'call [u8]), u32> {
    if (dst_ptr == 0 && dst_len != 0) || (src_ptr == 0 && src_len != 0) {
        return Err(STATUS_INVALID_POINTER);
    }
    if ranges_overlap(dst_ptr, dst_len as usize, src_ptr, src_len as usize) {
        return Err(STATUS_OVERLAP);
    }
    let dst: &'call mut [u8] = if dst_len == 0 {
        &mut []
    } else {
        unsafe { u8_slice_mut(call, dst_ptr, dst_len as usize) }
    };
    let src: &'call [u8] = if src_len == 0 {
        &[]
    } else {
        unsafe { u8_slice(call, src_ptr, src_len as usize) }
    };
    Ok((dst, src))
}

fn read_axes(layout: &[u32], start: usize, ndim: usize, out: &mut [u32; MAX_RANK]) {
    out[..ndim].copy_from_slice(&layout[start..start + ndim]);
}

fn read_strides(layout: &[u32], start: usize, ndim: usize, out: &mut [i32; MAX_RANK]) {
    for (s, &raw) in out.iter_mut().zip(&layout[start..start + ndim]) {
        *s = raw as i32;
    }
}

fn decode_cast_codes(codes: u32) -> Result<(DType, DType, IntMode), u32> {
    let dst = DType::from_code(codes & 0xF).ok_or(STATUS_INVALID_DTYPE)?;
    let src = DType::from_code((codes >> 4) & 0xF).ok_or(STATUS_INVALID_DTYPE)?;
    if codes >> 10 != 0 {
        return Err(STATUS_INVALID_MODE);
    }
    let mode = IntMode {
        saturate: codes & 0x100 != 0,
        nearest: codes & 0x200 != 0,
    };
    Ok((dst, src, mode))
}

fn decode_pair_codes(codes: u32) -> Result<(DType, DType, u32), u32> {
    let dst = DType::from_code(codes & 0xF).ok_or(STATUS_INVALID_DTYPE)?;
    let src = DType::from_code((codes >> 4) & 0xF).ok_or(STATUS_INVALID_DTYPE)?;
    if codes >> 9 != 0 {
        return Err(STATUS_INVALID_MODE);
    }
    Ok((dst, src, (codes >> 8) & 1))
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn ndarray_numel(shape_ptr: u32, ndim: u32) -> u32 {
    let n = ndim as usize;
    if n == 0 {
        return numel(&[]);
    }
    with_driver_call(|call| {
        let shape = unsafe { u32_slice(call, shape_ptr, n) };
        numel(shape)
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn ndarray_strides_row_major(
    out_strides_ptr: u32,
    shape_ptr: u32,
    ndim: u32,
    elem_bytes: u32,
) -> u32 {
    let n = ndim as usize;
    if n == 0 {
        return strides_row_major(&mut [], &[], elem_bytes);
    }
    with_driver_call(|call| {
        let shape = unsafe { u32_slice(call, shape_ptr, n) };
        let out = unsafe { i32_slice_mut(call, out_strides_ptr, n) };
        strides_row_major(out, shape, elem_bytes)
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn ndarray_offset_bytes(
    shape_ptr: u32,
    strides_ptr: u32,
    indices_ptr: u32,
    ndim: u32,
    base_offset_bytes: u32,
) -> u32 {
    let n = ndim as usize;
    if n == 0 {
        return base_offset_bytes;
    }
    with_driver_call(|call| {
        let shape = unsafe { u32_slice(call, shape_ptr, n) };
        let strides = unsafe { i32_slice(call, strides_ptr, n) };
        let idxs = unsafe { u32_slice(call, indices_ptr, n) };
        offset_bytes(shape, strides, idxs, base_offset_bytes)
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn ndarray_copy(
    dst_ptr: u32,
    dst_len: u32,
    src_ptr: u32,
    src_len: u32,
    layout_ptr: u32,
    ndim: u32,
    codes: u32,
) -> u32 {
    let nd = ndim as usize;
    if nd > MAX_RANK {
        return STATUS_INVALID_RANK;
    }
    let (dst_dtype, src_dtype, mode) = match decode_cast_codes(codes) {
        Ok(v) => v,
        Err(status) => return status,
    };
    let words = 2 + 3 * nd;
    if !valid_descriptor(layout_ptr, words * 4, 4, dst_ptr, dst_len) {
        return STATUS_INVALID_POINTER;
    }
    with_driver_call(|call| {
        let layout = unsafe { u32_slice(call, layout_ptr, words) };
        let (mut shape, mut ss, mut ds) = ([0u32; MAX_RANK], [0i32; MAX_RANK], [0i32; MAX_RANK]);
        read_axes(layout, 2, nd, &mut shape);
        read_strides(layout, 2 + nd, nd, &mut ss);
        read_strides(layout, 2 + 2 * nd, nd, &mut ds);
        let (dst, src) = match unsafe { borrow_pair(call, dst_ptr, dst_len, src_ptr, src_len) } {
            Ok(v) => v,
            Err(status) => return status,
        };
        copy_cast(
            Destination {
                bytes: dst,
                dtype: dst_dtype,
                offset: layout[0],
                strides: &ds[..nd],
            },
            Source {
                bytes: src,
                dtype: src_dtype,
                offset: layout[1],
                strides: &ss[..nd],
            },
            &shape[..nd],
            mode,
        )
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn ndarray_pad(
    dst_ptr: u32,
    dst_len: u32,
    src_ptr: u32,
    src_len: u32,
    layout_ptr: u32,
    ndim: u32,
    codes: u32,
    value_ptr: u32,
) -> u32 {
    let nd = ndim as usize;
    if nd > MAX_RANK {
        return STATUS_INVALID_RANK;
    }
    let dtype = match DType::from_code(codes & 0xF) {
        Some(v) => v,
        None => return STATUS_INVALID_DTYPE,
    };
    let mode = match PadMode::from_code((codes >> 8) & 0xF) {
        Some(v) if codes & !0xF0F == 0 => v,
        _ => return STATUS_INVALID_MODE,
    };
    let words = 2 + 5 * nd;
    let size = dtype.size();
    if !valid_descriptor(layout_ptr, words * 4, 4, dst_ptr, dst_len)
        || !valid_descriptor(value_ptr, size, 1, dst_ptr, dst_len)
    {
        return STATUS_INVALID_POINTER;
    }
    with_driver_call(|call| {
        let layout = unsafe { u32_slice(call, layout_ptr, words) };
        let value = unsafe { u8_slice(call, value_ptr, size) };
        let (mut out_shape, mut src_shape, mut before) =
            ([0u32; MAX_RANK], [0u32; MAX_RANK], [0u32; MAX_RANK]);
        let (mut ss, mut ds) = ([0i32; MAX_RANK], [0i32; MAX_RANK]);
        read_axes(layout, 2, nd, &mut out_shape);
        read_axes(layout, 2 + nd, nd, &mut src_shape);
        read_axes(layout, 2 + 2 * nd, nd, &mut before);
        read_strides(layout, 2 + 3 * nd, nd, &mut ss);
        read_strides(layout, 2 + 4 * nd, nd, &mut ds);
        let (dst, src) = match unsafe { borrow_pair(call, dst_ptr, dst_len, src_ptr, src_len) } {
            Ok(v) => v,
            Err(status) => return status,
        };
        pad(
            Destination {
                bytes: dst,
                dtype,
                offset: layout[0],
                strides: &ds[..nd],
            },
            Source {
                bytes: src,
                dtype,
                offset: layout[1],
                strides: &ss[..nd],
            },
            PadAxes {
                out_shape: &out_shape[..nd],
                src_shape: &src_shape[..nd],
                before: &before[..nd],
            },
            mode,
            value,
        )
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn ndarray_affine(
    dst_ptr: u32,
    dst_len: u32,
    src_ptr: u32,
    src_len: u32,
    layout_ptr: u32,
    ndim: u32,
    codes: u32,
    params_ptr: u32,
) -> u32 {
    let nd = ndim as usize;
    if nd > MAX_RANK {
        return STATUS_INVALID_RANK;
    }
    let (dst_dtype, src_dtype) = match (
        DType::from_code(codes & 0xF),
        DType::from_code((codes >> 4) & 0xF),
    ) {
        (Some(d), Some(s)) => (d, s),
        _ => return STATUS_INVALID_DTYPE,
    };
    let form = match AffineForm::from_code((codes >> 8) & 0x3) {
        Some(form) if codes >> 10 == 0 => form,
        _ => return STATUS_INVALID_MODE,
    };
    let words = 14 + 7 * nd;
    if !valid_descriptor(layout_ptr, words * 4, 4, dst_ptr, dst_len)
        || !valid_descriptor(params_ptr, 24, 8, dst_ptr, dst_len)
    {
        return STATUS_INVALID_POINTER;
    }
    with_driver_call(|call| {
        let layout = unsafe { u32_slice(call, layout_ptr, words) };
        let scalars = unsafe { f64_slice(call, params_ptr, 3) };
        let mut values: [&[f64]; 4] = [&[]; 4];
        for (k, value) in values.iter_mut().enumerate() {
            let (ptr, len) = (layout[2 + 3 * k], layout[3 + 3 * k] as usize);
            if len == 0 {
                continue;
            }
            if len > u32::MAX as usize / 8 {
                return STATUS_INVALID_PARAMETERS;
            }
            if !valid_descriptor(ptr, len * 8, 8, dst_ptr, dst_len) {
                return STATUS_INVALID_POINTER;
            }
            *value = unsafe { f64_slice(call, ptr, len) };
        }
        let mut shape = [0u32; MAX_RANK];
        let (mut ss, mut ds) = ([0i32; MAX_RANK], [0i32; MAX_RANK]);
        let mut ps = [[0i32; MAX_RANK]; 4];
        read_axes(layout, 14, nd, &mut shape);
        read_strides(layout, 14 + nd, nd, &mut ss);
        read_strides(layout, 14 + 2 * nd, nd, &mut ds);
        for (k, strides) in ps.iter_mut().enumerate() {
            read_strides(layout, 14 + (3 + k) * nd, nd, strides);
        }
        let (dst, src) = match unsafe { borrow_pair(call, dst_ptr, dst_len, src_ptr, src_len) } {
            Ok(v) => v,
            Err(status) => return status,
        };
        let param = |k: usize| match values[k] {
            [] if k >= form.parameters() => NO_AFFINE_PARAM,
            values => AffineParam {
                values,
                offset: layout[4 + 3 * k],
                strides: &ps[k][..nd],
            },
        };
        affine(
            Destination {
                bytes: dst,
                dtype: dst_dtype,
                offset: layout[0],
                strides: &ds[..nd],
            },
            Source {
                bytes: src,
                dtype: src_dtype,
                offset: layout[1],
                strides: &ss[..nd],
            },
            &shape[..nd],
            AffineParams {
                p: [param(0), param(1), param(2), param(3)],
                form,
                epsilon: scalars[0],
                range: [scalars[1], scalars[2]],
            },
        )
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn ndarray_reduce(
    dst_ptr: u32,
    dst_len: u32,
    dst2_ptr: u32,
    dst2_len: u32,
    src_ptr: u32,
    src_len: u32,
    layout_ptr: u32,
    ndim: u32,
    codes: u32,
    params_ptr: u32,
) -> u32 {
    let nd = ndim as usize;
    if nd > MAX_RANK {
        return STATUS_INVALID_RANK;
    }
    let Some(dst_dtype) = DType::from_code(codes & 0xF) else {
        return STATUS_INVALID_DTYPE;
    };
    let Some(src_dtype) = DType::from_code((codes >> 4) & 0xF) else {
        return STATUS_INVALID_DTYPE;
    };
    let Some(op) = ReduceOp::from_code((codes >> 8) & 0xF) else {
        return STATUS_INVALID_MODE;
    };
    if codes & !0x000F_3FFF != 0 {
        return STATUS_INVALID_MODE;
    }
    let dst2_dtype = if op.fused() {
        let Some(dtype) = DType::from_code((codes >> 16) & 0xF) else {
            return STATUS_INVALID_DTYPE;
        };
        Some(dtype)
    } else {
        if (codes >> 16) != 0 || dst2_ptr != 0 || dst2_len != 0 {
            return STATUS_INVALID_PARAMETERS;
        }
        None
    };
    if dst2_ptr == 0 && dst2_len != 0 {
        return STATUS_INVALID_POINTER;
    }
    let words = 3 + 3 * nd;
    let clear = |ptr: u32, bytes: usize, align: u32| {
        valid_descriptor(ptr, bytes, align, dst_ptr, dst_len)
            && valid_descriptor(ptr, bytes, align, dst2_ptr, dst2_len)
    };
    if !clear(layout_ptr, words * 4, 4) || (op.variance() && !clear(params_ptr, 8, 8)) {
        return STATUS_INVALID_POINTER;
    }
    if ranges_overlap(dst2_ptr, dst2_len as usize, src_ptr, src_len as usize)
        || ranges_overlap(dst2_ptr, dst2_len as usize, dst_ptr, dst_len as usize)
    {
        return STATUS_OVERLAP;
    }
    with_driver_call(|call| {
        let layout = unsafe { u32_slice(call, layout_ptr, words) };
        let (mut shape, mut reduced, mut strides) =
            ([0u32; MAX_RANK], [0u32; MAX_RANK], [0i32; MAX_RANK]);
        read_axes(layout, 3, nd, &mut shape);
        read_strides(layout, 3 + nd, nd, &mut strides);
        read_axes(layout, 3 + 2 * nd, nd, &mut reduced);
        let ddof = if op.variance() {
            let params = unsafe { f64_slice(call, params_ptr, 1) };
            params[0]
        } else {
            0.0
        };
        let (dst, src) = match unsafe { borrow_pair(call, dst_ptr, dst_len, src_ptr, src_len) } {
            Ok(v) => v,
            Err(status) => return status,
        };
        let second = dst2_dtype.map(|dtype| ReduceOutput {
            bytes: if dst2_len == 0 {
                &mut []
            } else {
                unsafe { u8_slice_mut(call, dst2_ptr, dst2_len as usize) }
            },
            dtype,
            offset: layout[1],
        });
        reduce(
            ReduceOutput {
                bytes: dst,
                dtype: dst_dtype,
                offset: layout[0],
            },
            second,
            Source {
                bytes: src,
                dtype: src_dtype,
                offset: layout[2],
                strides: &strides[..nd],
            },
            &shape[..nd],
            &reduced[..nd],
            ReduceSpec {
                op,
                omit: codes & 0x1000 != 0,
                saturate: codes & 0x2000 != 0,
                ddof,
            },
        )
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn ndarray_resize(
    dst_ptr: u32,
    dst_len: u32,
    src_ptr: u32,
    src_len: u32,
    layout_ptr: u32,
    ndim: u32,
    codes: u32,
    index_ptr: u32,
    weight_ptr: u32,
) -> u32 {
    let nd = ndim as usize;
    if !(1..=MAX_RANK).contains(&nd) {
        return STATUS_INVALID_RANK;
    }
    let (dst_dtype, src_dtype, method) = match decode_pair_codes(codes) {
        Ok(v) => v,
        Err(status) => return status,
    };
    if !valid_descriptor(layout_ptr, 12, 4, dst_ptr, dst_len) {
        return STATUS_INVALID_POINTER;
    }
    with_driver_call(|call| {
        let count = unsafe { u32_slice(call, layout_ptr, 3) }[2] as usize;
        if count == 0 || count > MAX_RESIZE_LEVELS {
            return STATUS_INVALID_PARAMETERS;
        }
        let start = 3 + 3 * count;
        let words = start + 3 * nd;
        if !valid_descriptor(layout_ptr, words * 4, 4, dst_ptr, dst_len) {
            return STATUS_INVALID_POINTER;
        }
        let layout = unsafe { u32_slice(call, layout_ptr, words) };
        let (mut shape, mut ss, mut ds) = ([0u32; MAX_RANK], [0i32; MAX_RANK], [0i32; MAX_RANK]);
        read_axes(layout, start, nd, &mut shape);
        read_strides(layout, start + nd, nd, &mut ss);
        read_strides(layout, start + 2 * nd, nd, &mut ds);
        let level = |l: usize| {
            (
                layout[3 + 3 * l] as usize,
                layout[4 + 3 * l],
                layout[5 + 3 * l] as usize,
            )
        };
        if (0..count).any(|l| level(l).0 >= nd) {
            return STATUS_INVALID_PARAMETERS;
        }
        let lengths = || {
            let (mut rows, mut taps) = (0usize, 0usize);
            for l in 0..count {
                let (axis, _, k) = level(l);
                rows = rows.checked_add((shape[axis] as usize).checked_add(1)?)?;
                taps = taps.checked_add(k)?;
            }
            let index = rows.checked_add(taps)?.checked_add(4)?;
            let weight = taps.checked_add(2)?;
            Some((
                rows,
                taps,
                index,
                index.checked_mul(4)?,
                weight,
                weight.checked_mul(8)?,
            ))
        };
        let Some((rows, taps, index_len, index_bytes, weight_len, weight_bytes)) = lengths() else {
            return STATUS_INVALID_TABLE;
        };
        if !valid_descriptor(index_ptr, index_bytes, 4, dst_ptr, dst_len)
            || !valid_descriptor(weight_ptr, weight_bytes, 8, dst_ptr, dst_len)
        {
            return STATUS_INVALID_POINTER;
        }
        let index = unsafe { i32_slice(call, index_ptr, index_len) };
        let weight = unsafe { f64_slice(call, weight_ptr, weight_len) };
        let (mut off, index) = index.split_at(rows);
        let (mut idx, constant_words) = index.split_at(taps);
        let (mut w, value) = weight.split_at(taps);
        let mut levels = [NO_RESIZE_LEVEL; MAX_RESIZE_LEVELS];
        for (l, slot) in levels[..count].iter_mut().enumerate() {
            let (axis, src, k) = level(l);
            let (level_off, rest_off) = off.split_at(shape[axis] as usize + 1);
            let (level_idx, rest_idx) = idx.split_at(k);
            let (level_w, rest_w) = w.split_at(k);
            *slot = ResizeLevel {
                axis,
                src,
                off: level_off,
                idx: level_idx,
                w: level_w,
            };
            (off, idx, w) = (rest_off, rest_idx, rest_w);
        }
        let mut constant = [0u8; 16];
        for (bytes, &word) in constant.chunks_exact_mut(4).zip(constant_words) {
            bytes.copy_from_slice(&word.to_le_bytes());
        }
        let (dst, src) = match unsafe { borrow_pair(call, dst_ptr, dst_len, src_ptr, src_len) } {
            Ok(v) => v,
            Err(status) => return status,
        };
        resize(
            Destination {
                bytes: dst,
                dtype: dst_dtype,
                offset: layout[0],
                strides: &ds[..nd],
            },
            Source {
                bytes: src,
                dtype: src_dtype,
                offset: layout[1],
                strides: &ss[..nd],
            },
            &shape[..nd],
            ResizeTables {
                levels,
                count,
                value: [value[0], value[1]],
                constant,
                weighted: method == 1,
            },
        )
    })
}

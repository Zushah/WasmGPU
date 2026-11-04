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

pub(crate) struct AffineParams<'a> {
    pub(crate) axis: Option<usize>,
    pub(crate) a: &'a [f64],
    pub(crate) b: &'a [f64],
    pub(crate) form: AffineForm,
}

#[inline(always)]
pub(crate) fn affine_value(x: f64, a: f64, b: f64, form: AffineForm) -> f64 {
    match form {
        AffineForm::ScaleOffset => x * a + b,
        AffineForm::MeanStd => (x - a) / b,
    }
}

pub(crate) fn affine(dst: Destination, src: Source, shape: &[u32], params: AffineParams) -> u32 {
    if src.dtype.is_complex() || dst.dtype.is_complex() {
        return STATUS_INVALID_DTYPE;
    }
    let nd = shape.len();
    if nd > MAX_RANK || src.strides.len() != nd || dst.strides.len() != nd {
        return STATUS_INVALID_RANK;
    }
    let len = params.a.len();
    if len == 0 || params.b.len() != len {
        return STATUS_INVALID_PARAMETERS;
    }
    match params.axis {
        Some(axis) if axis >= nd || (len != 1 && len != shape[axis] as usize) => {
            return STATUS_INVALID_PARAMETERS;
        }
        None if len != 1 => return STATUS_INVALID_PARAMETERS,
        _ => {}
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
    let (mut ss, mut ds) = ([0i64; MAX_RANK], [0i64; MAX_RANK]);
    widen(src.strides, &mut ss);
    widen(dst.strides, &mut ds);
    let (n, s_inner, d_inner) = inner(shape, &ss, &ds);
    let axis = if len == 1 { None } else { params.axis };
    let per_element = nd > 0 && axis == Some(nd - 1);
    let read = reader_for(src.dtype);
    let write = writer_for(dst.dtype, ARITHMETIC_MODE);
    let out = dst.bytes;
    let input = src.bytes;
    let mut buffer = [0f64; CHUNK];
    for_each_outer(
        shape,
        &ss,
        &ds,
        src.offset as i64,
        dst.offset as i64,
        |index, s, d| {
            let fixed = match axis {
                Some(a) if !per_element => index[a] as usize,
                _ => 0,
            };
            let mut done = 0;
            while done < n {
                let k = CHUNK.min(n - done);
                read(
                    input,
                    (s + done as i64 * s_inner) as usize,
                    s_inner,
                    &mut buffer[..k],
                );
                for (j, v) in buffer[..k].iter_mut().enumerate() {
                    let p = if per_element { done + j } else { fixed };
                    *v = affine_value(*v, params.a[p], params.b[p], params.form);
                }
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
    let (dst_dtype, src_dtype, form) = match decode_pair_codes(codes) {
        Ok((d, s, f)) => (
            d,
            s,
            if f == 0 {
                AffineForm::ScaleOffset
            } else {
                AffineForm::MeanStd
            },
        ),
        Err(status) => return status,
    };
    let words = 4 + 3 * nd;
    if !valid_descriptor(layout_ptr, words * 4, 4, dst_ptr, dst_len) {
        return STATUS_INVALID_POINTER;
    }
    with_driver_call(|call| {
        let layout = unsafe { u32_slice(call, layout_ptr, words) };
        let len = layout[3] as usize;
        if len == 0 || len > u32::MAX as usize / 16 {
            return STATUS_INVALID_PARAMETERS;
        }
        if !valid_descriptor(params_ptr, len * 16, 8, dst_ptr, dst_len) {
            return STATUS_INVALID_POINTER;
        }
        let params = unsafe { f64_slice(call, params_ptr, 2 * len) };
        let (mut shape, mut ss, mut ds) = ([0u32; MAX_RANK], [0i32; MAX_RANK], [0i32; MAX_RANK]);
        read_axes(layout, 4, nd, &mut shape);
        read_strides(layout, 4 + nd, nd, &mut ss);
        read_strides(layout, 4 + 2 * nd, nd, &mut ds);
        let (dst, src) = match unsafe { borrow_pair(call, dst_ptr, dst_len, src_ptr, src_len) } {
            Ok(v) => v,
            Err(status) => return status,
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
                axis: if layout[2] == u32::MAX {
                    None
                } else {
                    Some(layout[2] as usize)
                },
                a: &params[..len],
                b: &params[len..],
                form,
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

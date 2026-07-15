/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{i32_slice, i32_slice_mut, u32_slice};

const ND_ERROR: u32 = 0xFFFF_FFFF;

#[no_mangle]
pub extern "C" fn ndarray_numel(shape_ptr: u32, ndim: u32) -> u32 {
    let n = ndim as usize;
    if n == 0 {
        return 1;
    }
    let shape = unsafe { u32_slice(shape_ptr, n) };
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

#[no_mangle]
pub extern "C" fn ndarray_strides_row_major(
    out_strides_ptr: u32,
    shape_ptr: u32,
    ndim: u32,
    elem_bytes: u32,
) -> u32 {
    let n = ndim as usize;
    let shape = unsafe { u32_slice(shape_ptr, n) };
    let out = unsafe { i32_slice_mut(out_strides_ptr, n) };
    if elem_bytes == 0 {
        return 0;
    }
    let mut stride: u64 = elem_bytes as u64;
    for i_rev in 0..n {
        let i = n - 1 - i_rev;
        if stride > (i32::MAX as u64) {
            return 0;
        }
        out[i] = stride as i32;
        let dim = shape[i] as u64;
        stride = match stride.checked_mul(dim) {
            Some(v) => v,
            None => return 0,
        };
        if stride > (u32::MAX as u64) {
            return 0;
        }
    }
    1
}

#[no_mangle]
pub extern "C" fn ndarray_offset_bytes(
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
    let shape = unsafe { u32_slice(shape_ptr, n) };
    let strides = unsafe { i32_slice(strides_ptr, n) };
    let idxs = unsafe { u32_slice(indices_ptr, n) };
    let mut off: i64 = base_offset_bytes as i64;
    for i in 0..n {
        let dim = shape[i] as i64;
        let idx = idxs[i] as i64;
        if idx >= dim {
            return ND_ERROR;
        }
        let stride = strides[i] as i64;
        let term = match stride.checked_mul(idx) {
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

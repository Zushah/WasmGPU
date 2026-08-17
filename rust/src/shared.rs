/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use core::marker::PhantomData;

#[derive(Clone, Copy)]
pub(crate) struct DriverCall<'call> {
    _lifetime: PhantomData<&'call mut &'call ()>,
}

#[inline(always)]
pub(crate) fn with_driver_call<R>(f: impl for<'call> FnOnce(DriverCall<'call>) -> R) -> R {
    f(DriverCall {
        _lifetime: PhantomData,
    })
}

#[inline(always)]
pub(crate) unsafe fn f32_slice<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call [f32] {
    unsafe { core::slice::from_raw_parts(ptr as *const f32, len) }
}

#[inline(always)]
pub(crate) unsafe fn f32_slice_mut<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call mut [f32] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut f32, len) }
}

#[allow(dead_code)]
#[inline(always)]
pub(crate) unsafe fn f64_slice<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call [f64] {
    unsafe { core::slice::from_raw_parts(ptr as *const f64, len) }
}

#[inline(always)]
pub(crate) unsafe fn f64_slice_mut<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call mut [f64] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut f64, len) }
}

#[inline(always)]
pub(crate) unsafe fn u32_slice<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call [u32] {
    unsafe { core::slice::from_raw_parts(ptr as *const u32, len) }
}

#[inline(always)]
pub(crate) unsafe fn u32_slice_mut<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call mut [u32] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut u32, len) }
}

#[inline(always)]
pub(crate) unsafe fn i32_slice<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call [i32] {
    unsafe { core::slice::from_raw_parts(ptr as *const i32, len) }
}

#[inline(always)]
pub(crate) unsafe fn i32_slice_mut<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call mut [i32] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut i32, len) }
}

#[inline(always)]
pub(crate) unsafe fn u8_slice<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call [u8] {
    unsafe { core::slice::from_raw_parts(ptr as *const u8, len) }
}

#[inline(always)]
pub(crate) unsafe fn u8_slice_mut<'call>(
    _call: DriverCall<'call>,
    ptr: u32,
    len: usize,
) -> &'call mut [u8] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut u8, len) }
}

#[inline(always)]
pub(crate) unsafe fn read_f32_array<const N: usize>(ptr: u32) -> [f32; N] {
    let mut out = [0.0; N];
    unsafe { core::ptr::copy_nonoverlapping(ptr as *const f32, out.as_mut_ptr(), N) };
    out
}

#[inline(always)]
pub(crate) unsafe fn read_f64_array<const N: usize>(ptr: u32) -> [f64; N] {
    let mut out = [0.0; N];
    unsafe { core::ptr::copy_nonoverlapping(ptr as *const f64, out.as_mut_ptr(), N) };
    out
}

#[inline(always)]
pub(crate) unsafe fn copy_f32(dst: u32, src: u32, len: usize) {
    unsafe { core::ptr::copy(src as *const f32, dst as *mut f32, len) };
}

#[inline(always)]
pub(crate) unsafe fn copy_f64(dst: u32, src: u32, len: usize) {
    unsafe { core::ptr::copy(src as *const f64, dst as *mut f64, len) };
}

#[cfg(any(target_arch = "wasm32", test))]
#[inline(always)]
pub(crate) fn align_up(x: usize, align: usize) -> usize {
    (x + (align - 1)) & !(align - 1)
}

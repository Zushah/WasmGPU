/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#[inline(always)]
pub(crate) unsafe fn f32_slice(ptr: u32, len: usize) -> &'static [f32] {
    unsafe { core::slice::from_raw_parts(ptr as *const f32, len) }
}

#[inline(always)]
pub(crate) unsafe fn f32_slice_mut(ptr: u32, len: usize) -> &'static mut [f32] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut f32, len) }
}

#[inline(always)]
pub(crate) unsafe fn u32_slice(ptr: u32, len: usize) -> &'static [u32] {
    unsafe { core::slice::from_raw_parts(ptr as *const u32, len) }
}

#[inline(always)]
pub(crate) unsafe fn u32_slice_mut(ptr: u32, len: usize) -> &'static mut [u32] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut u32, len) }
}

#[inline(always)]
pub(crate) unsafe fn i32_slice(ptr: u32, len: usize) -> &'static [i32] {
    unsafe { core::slice::from_raw_parts(ptr as *const i32, len) }
}

#[inline(always)]
pub(crate) unsafe fn i32_slice_mut(ptr: u32, len: usize) -> &'static mut [i32] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut i32, len) }
}

#[inline(always)]
pub(crate) unsafe fn u8_slice(ptr: u32, len: usize) -> &'static [u8] {
    unsafe { core::slice::from_raw_parts(ptr as *const u8, len) }
}

#[inline(always)]
pub(crate) unsafe fn u8_slice_mut(ptr: u32, len: usize) -> &'static mut [u8] {
    unsafe { core::slice::from_raw_parts_mut(ptr as *mut u8, len) }
}

#[cfg(any(target_arch = "wasm32", test))]
#[inline(always)]
pub(crate) fn align_up(x: usize, align: usize) -> usize {
    (x + (align - 1)) & !(align - 1)
}

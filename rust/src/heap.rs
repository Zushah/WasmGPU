/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use std::alloc::{Allocator, Global, Layout};
use std::ptr::NonNull;

#[inline(always)]
fn alloc_layout(layout: Layout) -> u32 {
    if layout.size() == 0 {
        return 0;
    }
    let Ok(ptr) = Global.allocate(layout) else {
        return 0;
    };
    ptr.cast::<u8>().as_ptr() as usize as u32
}

#[inline(always)]
unsafe fn free_layout(ptr: u32, layout: Layout) {
    if ptr == 0 || layout.size() == 0 {
        return;
    }
    let Some(ptr) = NonNull::new(ptr as usize as *mut u8) else {
        return;
    };
    unsafe { Global.deallocate(ptr, layout) };
}

#[inline(always)]
pub(crate) fn alloc_raw(bytes: usize, align: usize) -> u32 {
    let Ok(layout) = Layout::from_size_align(bytes, align) else {
        return 0;
    };
    alloc_layout(layout)
}

#[inline(always)]
unsafe fn free_raw(ptr: u32, bytes: usize, align: usize) {
    let Ok(layout) = Layout::from_size_align(bytes, align) else {
        return;
    };
    unsafe { free_layout(ptr, layout) };
}

#[inline(always)]
fn alloc_array<T>(len: u32) -> u32 {
    let Ok(layout) = Layout::array::<T>(len as usize) else {
        return 0;
    };
    alloc_layout(layout)
}

#[inline(always)]
unsafe fn free_array<T>(ptr: u32, len: u32) {
    let Ok(layout) = Layout::array::<T>(len as usize) else {
        return;
    };
    unsafe { free_layout(ptr, layout) };
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_alloc(bytes: u32) -> u32 {
    alloc_raw(bytes as usize, 16)
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn wasmgpu_free(ptr: u32, bytes: u32) {
    unsafe { free_raw(ptr, bytes as usize, 16) }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_alloc_f32(len: u32) -> u32 {
    alloc_array::<f32>(len)
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn wasmgpu_free_f32(ptr: u32, len: u32) {
    unsafe { free_array::<f32>(ptr, len) }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_alloc_f64(len: u32) -> u32 {
    alloc_array::<f64>(len)
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn wasmgpu_free_f64(ptr: u32, len: u32) {
    unsafe { free_array::<f64>(ptr, len) }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_alloc_u32(len: u32) -> u32 {
    alloc_array::<u32>(len)
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn wasmgpu_free_u32(ptr: u32, len: u32) {
    unsafe { free_array::<u32>(ptr, len) }
}

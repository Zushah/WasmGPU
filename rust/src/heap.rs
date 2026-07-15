/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::align_up;
use core::mem;

extern "C" {
    static mut __heap_base: u8;
}

static mut HEAP_PTR: usize = usize::MAX;

#[cfg(target_arch = "wasm32")]
#[inline(always)]
unsafe fn ensure_memory(end: usize) -> bool {
    use core::arch::wasm32;
    const PAGE: usize = 65536;
    let cur_pages: usize = wasm32::memory_size::<0>();
    let cur_bytes: usize = cur_pages * PAGE;
    if end <= cur_bytes {
        return true;
    }
    let needed = end - cur_bytes;
    let add_pages: usize = (needed + (PAGE - 1)) / PAGE;
    let prev: usize = wasm32::memory_grow::<0>(add_pages);
    prev != usize::MAX
}

#[cfg(not(target_arch = "wasm32"))]
#[inline(always)]
unsafe fn ensure_memory(_end: usize) -> bool {
    true
}

#[inline(always)]
pub(crate) unsafe fn alloc_raw(bytes: usize, align: usize) -> u32 {
    if align == 0 || (align & (align - 1)) != 0 {
        return 0;
    }
    if HEAP_PTR == usize::MAX {
        HEAP_PTR = (&raw mut __heap_base as *mut u8) as usize;
    }
    let ptr = align_up(HEAP_PTR, align);
    let end = match ptr.checked_add(bytes) {
        Some(v) => v,
        None => return 0,
    };
    if !ensure_memory(end) {
        return 0;
    }
    HEAP_PTR = end;
    ptr as u32
}

#[no_mangle]
pub extern "C" fn wasmgpu_alloc(bytes: u32) -> u32 {
    unsafe { alloc_raw(bytes as usize, 16) }
}

#[no_mangle]
pub extern "C" fn wasmgpu_free(_ptr: u32, _bytes: u32) {
    // bump allocator: no-op free
}

#[no_mangle]
pub extern "C" fn wasmgpu_alloc_f32(len: u32) -> u32 {
    unsafe {
        alloc_raw(
            (len as usize) * mem::size_of::<f32>(),
            mem::align_of::<f32>(),
        )
    }
}

#[no_mangle]
pub extern "C" fn wasmgpu_free_f32(_ptr: u32, _len: u32) {
    // bump allocator: no-op free
}

#[no_mangle]
pub extern "C" fn wasmgpu_alloc_u32(len: u32) -> u32 {
    unsafe {
        alloc_raw(
            (len as usize) * mem::size_of::<u32>(),
            mem::align_of::<u32>(),
        )
    }
}

#[no_mangle]
pub extern "C" fn wasmgpu_free_u32(_ptr: u32, _len: u32) {
    // bump allocator: no-op free
}

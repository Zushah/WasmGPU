/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::heap::alloc_raw;
use crate::shared::align_up;
use core::mem;

static mut FRAME_ARENA_BASE: usize = 0;
static mut FRAME_ARENA_CAP: usize = 0;
static mut FRAME_ARENA_HEAD: usize = 0;
static mut FRAME_ARENA_EPOCH: u32 = 0;

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_init(cap_bytes: u32) -> u32 {
    unsafe {
        if FRAME_ARENA_BASE != 0 {
            if FRAME_ARENA_EPOCH == 0 {
                FRAME_ARENA_EPOCH = 1;
            }
            return FRAME_ARENA_BASE as u32;
        }
        if cap_bytes == 0 {
            return 0;
        }
        let base = alloc_raw(cap_bytes as usize, 16);
        if base == 0 {
            return 0;
        }
        FRAME_ARENA_BASE = base as usize;
        FRAME_ARENA_CAP = cap_bytes as usize;
        FRAME_ARENA_HEAD = 0;
        FRAME_ARENA_EPOCH = 1;
        base
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_reset() {
    unsafe {
        if FRAME_ARENA_BASE == 0 {
            return;
        }
        FRAME_ARENA_HEAD = 0;
        FRAME_ARENA_EPOCH = FRAME_ARENA_EPOCH.wrapping_add(1);
        if FRAME_ARENA_EPOCH == 0 {
            FRAME_ARENA_EPOCH = 1;
        }
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_epoch() -> u32 {
    unsafe { FRAME_ARENA_EPOCH }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_used() -> u32 {
    unsafe { FRAME_ARENA_HEAD as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_cap() -> u32 {
    unsafe { FRAME_ARENA_CAP as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_alloc(bytes: u32, align: u32) -> u32 {
    unsafe {
        if FRAME_ARENA_BASE == 0 || FRAME_ARENA_CAP == 0 {
            return 0;
        }
        let align = align as usize;
        if align == 0 || (align & (align - 1)) != 0 {
            return 0;
        }
        let base = FRAME_ARENA_BASE;
        let head = FRAME_ARENA_HEAD;
        let cap = FRAME_ARENA_CAP;
        let start = align_up(base + head, align);
        let end = match start.checked_add(bytes as usize) {
            Some(v) => v,
            None => return 0,
        };
        if end - base > cap {
            return 0;
        }
        FRAME_ARENA_HEAD = end - base;
        start as u32
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_alloc_f32(len: u32) -> u32 {
    let bytes = match len.checked_mul(mem::size_of::<f32>() as u32) {
        Some(v) => v,
        None => return 0,
    };
    wasmgpu_frame_alloc(bytes, 16)
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::heap::alloc_raw;
use crate::shared::align_up;
use core::mem;
use core::sync::atomic::{AtomicU32, AtomicUsize, Ordering};

static FRAME_ARENA_BASE: AtomicUsize = AtomicUsize::new(0);
static FRAME_ARENA_CAP: AtomicUsize = AtomicUsize::new(0);
static FRAME_ARENA_HEAD: AtomicUsize = AtomicUsize::new(0);
static FRAME_ARENA_EPOCH: AtomicU32 = AtomicU32::new(0);

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_init(cap_bytes: u32) -> u32 {
    let existing = FRAME_ARENA_BASE.load(Ordering::Relaxed);
    if existing != 0 {
        if FRAME_ARENA_EPOCH.load(Ordering::Relaxed) == 0 {
            FRAME_ARENA_EPOCH.store(1, Ordering::Relaxed);
        }
        return existing as u32;
    }
    if cap_bytes == 0 {
        return 0;
    }
    let base = alloc_raw(cap_bytes as usize, 16);
    if base == 0 {
        return 0;
    }
    FRAME_ARENA_BASE.store(base as usize, Ordering::Relaxed);
    FRAME_ARENA_CAP.store(cap_bytes as usize, Ordering::Relaxed);
    FRAME_ARENA_HEAD.store(0, Ordering::Relaxed);
    FRAME_ARENA_EPOCH.store(1, Ordering::Relaxed);
    base
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_reset() {
    if FRAME_ARENA_BASE.load(Ordering::Relaxed) == 0 {
        return;
    }
    FRAME_ARENA_HEAD.store(0, Ordering::Relaxed);
    let mut epoch = FRAME_ARENA_EPOCH.load(Ordering::Relaxed).wrapping_add(1);
    if epoch == 0 {
        epoch = 1;
    }
    FRAME_ARENA_EPOCH.store(epoch, Ordering::Relaxed);
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_epoch() -> u32 {
    FRAME_ARENA_EPOCH.load(Ordering::Relaxed)
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_used() -> u32 {
    FRAME_ARENA_HEAD.load(Ordering::Relaxed) as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_arena_cap() -> u32 {
    FRAME_ARENA_CAP.load(Ordering::Relaxed) as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_alloc(bytes: u32, align: u32) -> u32 {
    let base = FRAME_ARENA_BASE.load(Ordering::Relaxed);
    let cap = FRAME_ARENA_CAP.load(Ordering::Relaxed);
    if base == 0 || cap == 0 {
        return 0;
    }
    let align = align as usize;
    if align == 0 || !align.is_power_of_two() {
        return 0;
    }
    let head = FRAME_ARENA_HEAD.load(Ordering::Relaxed);
    let start = align_up(base + head, align);
    let Some(end) = start.checked_add(bytes as usize) else {
        return 0;
    };
    if end - base > cap {
        return 0;
    }
    FRAME_ARENA_HEAD.store(end - base, Ordering::Relaxed);
    start as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_alloc_f32(len: u32) -> u32 {
    let Some(bytes) = len.checked_mul(mem::size_of::<f32>() as u32) else {
        return 0;
    };
    wasmgpu_frame_alloc(bytes, 16)
}

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_frame_alloc_f64(len: u32) -> u32 {
    let Some(bytes) = len.checked_mul(mem::size_of::<f64>() as u32) else {
        return 0;
    };
    wasmgpu_frame_alloc(bytes, 16)
}

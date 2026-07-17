/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

static mut RNG_STATE: u32 = 0x1234_5678;

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_seed(seed: u32) {
    unsafe {
        RNG_STATE = if seed == 0 { 0x1234_5678 } else { seed };
    }
}

#[inline(always)]
pub(crate) fn rand_u32() -> u32 {
    unsafe {
        let mut x = RNG_STATE;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        RNG_STATE = x;
        x
    }
}

#[inline(always)]
pub(crate) fn rand_f32_01() -> f32 {
    const INV: f32 = 1.0 / 4294967296.0;
    (rand_u32() as f32) * INV
}

#[inline(always)]
pub(crate) fn rand_range(a: f32, b: f32) -> f32 {
    rand_f32_01() * (b - a) + a
}

#[inline(always)]
pub(crate) fn round_js(x: f32) -> f32 {
    (x + 0.5).floor()
}

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
pub(crate) fn rand_range_f32(a: f32, b: f32) -> f32 {
    rand_f32_01() * (b - a) + a
}

#[inline(always)]
pub(crate) fn rand_f64_01() -> f64 {
    const INV: f64 = 1.0 / 9007199254740992.0;
    let high = (rand_u32() >> 5) as u64;
    let low = (rand_u32() >> 6) as u64;
    ((high << 26 | low) as f64) * INV
}

#[inline(always)]
pub(crate) fn rand_range_f64(a: f64, b: f64) -> f64 {
    rand_f64_01() * (b - a) + a
}

#[inline(always)]
pub(crate) fn round_f32(x: f32) -> f32 {
    (x + 0.5).floor()
}

#[inline(always)]
pub(crate) fn round_f64(x: f64) -> f64 {
    (x + 0.5).floor()
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use core::sync::atomic::{AtomicU32, Ordering};

static RNG_STATE: AtomicU32 = AtomicU32::new(0x1234_5678);

#[unsafe(no_mangle)]
pub extern "C" fn wasmgpu_seed(seed: u32) {
    let state = if seed == 0 { 0x1234_5678 } else { seed };
    RNG_STATE.store(state, Ordering::Relaxed);
}

pub(crate) struct Rng(u32);

impl Rng {
    #[inline(always)]
    pub(crate) fn load() -> Self {
        Self(RNG_STATE.load(Ordering::Relaxed))
    }

    #[inline(always)]
    pub(crate) fn store(self) {
        RNG_STATE.store(self.0, Ordering::Relaxed);
    }

    #[inline(always)]
    pub(crate) fn next_u32(&mut self) -> u32 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        x
    }

    #[inline(always)]
    pub(crate) fn f32_01(&mut self) -> f32 {
        const INV: f32 = 1.0 / 4294967296.0;
        (self.next_u32() as f32) * INV
    }

    #[inline(always)]
    pub(crate) fn range_f32(&mut self, a: f32, b: f32) -> f32 {
        self.f32_01() * (b - a) + a
    }

    #[inline(always)]
    pub(crate) fn f64_01(&mut self) -> f64 {
        const INV: f64 = 1.0 / 9007199254740992.0;
        let high = (self.next_u32() >> 5) as u64;
        let low = (self.next_u32() >> 6) as u64;
        ((high << 26 | low) as f64) * INV
    }

    #[inline(always)]
    pub(crate) fn range_f64(&mut self, a: f64, b: f64) -> f64 {
        self.f64_01() * (b - a) + a
    }
}

#[cfg(test)]
pub(crate) fn rand_u32() -> u32 {
    let mut rng = Rng::load();
    let x = rng.next_u32();
    rng.store();
    x
}

#[cfg(test)]
pub(crate) fn rand_f32_01() -> f32 {
    let mut rng = Rng::load();
    let x = rng.f32_01();
    rng.store();
    x
}

#[cfg(test)]
pub(crate) fn rand_range_f32(a: f32, b: f32) -> f32 {
    let mut rng = Rng::load();
    let x = rng.range_f32(a, b);
    rng.store();
    x
}

#[inline(always)]
pub(crate) fn round_f32(x: f32) -> f32 {
    (x + 0.5).floor()
}

#[inline(always)]
pub(crate) fn round_f64(x: f64) -> f64 {
    (x + 0.5).floor()
}

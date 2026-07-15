/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::utils::{rand_f32_01, rand_range, rand_u32, round_js, wasmgpu_seed};

#[test]
fn seeded_randomness_is_deterministic_bounded_and_resettable() {
    wasmgpu_seed(12345);
    let first = [rand_u32(), rand_u32(), rand_u32(), rand_u32()];
    wasmgpu_seed(12345);
    let second = [rand_u32(), rand_u32(), rand_u32(), rand_u32()];
    assert_eq!(first, second);
    assert!(first.iter().any(|&value| value != 0));
    wasmgpu_seed(0);
    let zero_seed = rand_u32();
    wasmgpu_seed(0x1234_5678);
    assert_eq!(zero_seed, rand_u32());
    for _ in 0..64 {
        let unit = rand_f32_01();
        assert!((0.0..1.0).contains(&unit));
        let ranged = rand_range(-3.0, 7.0);
        assert!((-3.0..7.0).contains(&ranged));
    }
}

#[test]
fn javascript_rounding_uses_ties_toward_positive_infinity() {
    assert_eq!(round_js(1.49), 1.0);
    assert_eq!(round_js(1.5), 2.0);
    assert_eq!(round_js(-1.5), -1.0);
    assert_eq!(round_js(-1.51), -2.0);
}

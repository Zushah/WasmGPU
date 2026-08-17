/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{
    copy_f32, copy_f64, f32_slice_mut, f64_slice_mut, read_f32_array, read_f64_array,
    with_driver_call,
};
use crate::utils::{
    rand_f32_01, rand_f64_01, rand_range_f32, rand_range_f64, round_f32, round_f64,
};

#[inline(always)]
pub(crate) fn quatf_norm_from(q: &[f32; 4]) -> f32 {
    (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt()
}

#[inline(always)]
pub(crate) fn quatd_norm_from(q: &[f64; 4]) -> f64 {
    (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt()
}

#[inline(always)]
pub(crate) fn quatf_normalize_arr(q: &[f32; 4]) -> [f32; 4] {
    let n = quatf_norm_from(q);
    if n == 0.0 {
        return [0.0, 0.0, 0.0, 0.0];
    }
    let inorm = 1.0 / n;
    [q[0] * inorm, q[1] * inorm, q[2] * inorm, q[3] * inorm]
}

#[inline(always)]
pub(crate) fn quatd_normalize_arr(q: &[f64; 4]) -> [f64; 4] {
    let n = quatd_norm_from(q);
    if n == 0.0 {
        return [0.0, 0.0, 0.0, 0.0];
    }
    let inorm = 1.0 / n;
    [q[0] * inorm, q[1] * inorm, q[2] * inorm, q[3] * inorm]
}

#[inline(always)]
pub(crate) fn quatf_from_rotation_mat3(
    r00: f32,
    r01: f32,
    r02: f32,
    r10: f32,
    r11: f32,
    r12: f32,
    r20: f32,
    r21: f32,
    r22: f32,
) -> [f32; 4] {
    let trace = r00 + r11 + r22;
    let (x, y, z, w): (f32, f32, f32, f32);
    if trace > 0.0 {
        let s = (trace + 1.0).sqrt() * 2.0;
        w = 0.25 * s;
        x = (r21 - r12) / s;
        y = (r02 - r20) / s;
        z = (r10 - r01) / s;
    } else if r00 > r11 && r00 > r22 {
        let s = (1.0 + r00 - r11 - r22).sqrt() * 2.0;
        w = (r21 - r12) / s;
        x = 0.25 * s;
        y = (r01 + r10) / s;
        z = (r02 + r20) / s;
    } else if r11 > r22 {
        let s = (1.0 + r11 - r00 - r22).sqrt() * 2.0;
        w = (r02 - r20) / s;
        x = (r01 + r10) / s;
        y = 0.25 * s;
        z = (r12 + r21) / s;
    } else {
        let s = (1.0 + r22 - r00 - r11).sqrt() * 2.0;
        w = (r10 - r01) / s;
        x = (r02 + r20) / s;
        y = (r12 + r21) / s;
        z = 0.25 * s;
    }
    let inv_len = 1.0 / (x * x + y * y + z * z + w * w).sqrt().max(1.0e-20);
    [x * inv_len, y * inv_len, z * inv_len, w * inv_len]
}

#[inline(always)]
pub(crate) fn quatd_from_rotation_mat3(
    r00: f64,
    r01: f64,
    r02: f64,
    r10: f64,
    r11: f64,
    r12: f64,
    r20: f64,
    r21: f64,
    r22: f64,
) -> [f64; 4] {
    let trace = r00 + r11 + r22;
    let (x, y, z, w): (f64, f64, f64, f64);
    if trace > 0.0 {
        let s = (trace + 1.0).sqrt() * 2.0;
        w = 0.25 * s;
        x = (r21 - r12) / s;
        y = (r02 - r20) / s;
        z = (r10 - r01) / s;
    } else if r00 > r11 && r00 > r22 {
        let s = (1.0 + r00 - r11 - r22).sqrt() * 2.0;
        w = (r21 - r12) / s;
        x = 0.25 * s;
        y = (r01 + r10) / s;
        z = (r02 + r20) / s;
    } else if r11 > r22 {
        let s = (1.0 + r11 - r00 - r22).sqrt() * 2.0;
        w = (r02 - r20) / s;
        x = (r01 + r10) / s;
        y = 0.25 * s;
        z = (r12 + r21) / s;
    } else {
        let s = (1.0 + r22 - r00 - r11).sqrt() * 2.0;
        w = (r10 - r01) / s;
        x = (r02 + r20) / s;
        y = (r12 + r21) / s;
        z = 0.25 * s;
    }
    let inv_len = 1.0 / (x * x + y * y + z * z + w * w).sqrt().max(1.0e-20);
    [x * inv_len, y * inv_len, z * inv_len, w * inv_len]
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_abs(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q);
        let o = f32_slice_mut(call, out, 4);
        o[0] = a[0].abs();
        o[1] = a[1].abs();
        o[2] = a[2].abs();
        o[3] = a[3].abs();
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_abs(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q);
        let o = f64_slice_mut(call, out, 4);
        o[0] = a[0].abs();
        o[1] = a[1].abs();
        o[2] = a[2].abs();
        o[3] = a[3].abs();
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_add(out: u32, q1: u32, q2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q1);
        let b = read_f32_array::<4>(q2);
        let o = f32_slice_mut(call, out, 4);
        o[0] = a[0] + b[0];
        o[1] = a[1] + b[1];
        o[2] = a[2] + b[2];
        o[3] = a[3] + b[3];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_add(out: u32, q1: u32, q2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q1);
        let b = read_f64_array::<4>(q2);
        let o = f64_slice_mut(call, out, 4);
        o[0] = a[0] + b[0];
        o[1] = a[1] + b[1];
        o[2] = a[2] + b[2];
        o[3] = a[3] + b[3];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_copy(out: u32, q: u32) -> u32 {
    unsafe { copy_f32(out, q, 4) };
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_copy(out: u32, q: u32) -> u32 {
    unsafe { copy_f64(out, q, 4) };
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_dist(q1: u32, q2: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<4>(q1);
        let b = read_f32_array::<4>(q2);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        let dw = a[3] - b[3];
        (dx * dx + dy * dy + dz * dz + dw * dw).sqrt()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_dist(q1: u32, q2: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<4>(q1);
        let b = read_f64_array::<4>(q2);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        let dw = a[3] - b[3];
        (dx * dx + dy * dy + dz * dz + dw * dw).sqrt()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_distsq(q1: u32, q2: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<4>(q1);
        let b = read_f32_array::<4>(q2);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        let dw = a[3] - b[3];
        dx * dx + dy * dy + dz * dz + dw * dw
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_distsq(q1: u32, q2: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<4>(q1);
        let b = read_f64_array::<4>(q2);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        let dw = a[3] - b[3];
        dx * dx + dy * dy + dz * dz + dw * dw
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_fromAxisAngle(out: u32, axis: u32, angle: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(axis);
        let half_angle: f32 = angle * 0.5;
        let s: f32 = half_angle.sin();
        let c: f32 = half_angle.cos();
        let o = f32_slice_mut(call, out, 4);
        o[0] = a[0] * s;
        o[1] = a[1] * s;
        o[2] = a[2] * s;
        o[3] = c;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_fromAxisAngle(out: u32, axis: u32, angle: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(axis);
        let half_angle: f64 = angle * 0.5;
        let s: f64 = half_angle.sin();
        let c: f64 = half_angle.cos();
        let o = f64_slice_mut(call, out, 4);
        o[0] = a[0] * s;
        o[1] = a[1] * s;
        o[2] = a[2] * s;
        o[3] = c;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_init(out: u32, a: f32, b: f32, c: f32, d: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f32_slice_mut(call, out, 4);
        o[0] = a;
        o[1] = b;
        o[2] = c;
        o[3] = d;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_init(out: u32, a: f64, b: f64, c: f64, d: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f64_slice_mut(call, out, 4);
        o[0] = a;
        o[1] = b;
        o[2] = c;
        o[3] = d;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_invert(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q);
        let n2: f32 = a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
        let o = f32_slice_mut(call, out, 4);
        if n2 == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            o[3] = 1.0;
            return 0;
        }
        let inv = 1.0 / n2;
        o[0] = -a[0] * inv;
        o[1] = -a[1] * inv;
        o[2] = -a[2] * inv;
        o[3] = a[3] * inv;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_invert(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q);
        let n2: f64 = a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
        let o = f64_slice_mut(call, out, 4);
        if n2 == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            o[3] = 1.0;
            return 0;
        }
        let inv = 1.0 / n2;
        o[0] = -a[0] * inv;
        o[1] = -a[1] * inv;
        o[2] = -a[2] * inv;
        o[3] = a[3] * inv;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_isEqual(q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = read_f32_array::<4>(q1);
        let b = read_f32_array::<4>(q2);
        if a[0] == b[0] && a[1] == b[1] && a[2] == b[2] && a[3] == b[3] {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_isEqual(q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = read_f64_array::<4>(q1);
        let b = read_f64_array::<4>(q2);
        if a[0] == b[0] && a[1] == b[1] && a[2] == b[2] && a[3] == b[3] {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_isNormalized(q: u32) -> u32 {
    unsafe {
        let a = read_f32_array::<4>(q);
        if a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] == 1.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_isNormalized(q: u32) -> u32 {
    unsafe {
        let a = read_f64_array::<4>(q);
        if a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] == 1.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_isZero(q: u32) -> u32 {
    unsafe {
        let a = read_f32_array::<4>(q);
        if a[0] == 0.0 && a[1] == 0.0 && a[2] == 0.0 && a[3] == 0.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_isZero(q: u32) -> u32 {
    unsafe {
        let a = read_f64_array::<4>(q);
        if a[0] == 0.0 && a[1] == 0.0 && a[2] == 0.0 && a[3] == 0.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_mul(out: u32, q1: u32, q2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q1);
        let b = read_f32_array::<4>(q2);
        let mut t = [0.0f32; 4];
        t[0] = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1];
        t[1] = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0];
        t[2] = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3];
        t[3] = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2];
        let o = f32_slice_mut(call, out, 4);
        o.copy_from_slice(&t);
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_mul(out: u32, q1: u32, q2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q1);
        let b = read_f64_array::<4>(q2);
        let mut t = [0.0f64; 4];
        t[0] = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1];
        t[1] = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0];
        t[2] = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3];
        t[3] = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2];
        let o = f64_slice_mut(call, out, 4);
        o.copy_from_slice(&t);
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_neg(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q);
        let o = f32_slice_mut(call, out, 4);
        o[0] = -a[0];
        o[1] = -a[1];
        o[2] = -a[2];
        o[3] = -a[3];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_neg(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q);
        let o = f64_slice_mut(call, out, 4);
        o[0] = -a[0];
        o[1] = -a[1];
        o[2] = -a[2];
        o[3] = -a[3];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_norm(q: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<4>(q);
        (a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]).sqrt()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_norm(q: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<4>(q);
        (a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]).sqrt()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_normalize(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q);
        let qarr = [a[0], a[1], a[2], a[3]];
        let n = quatf_norm_from(&qarr);
        let o = f32_slice_mut(call, out, 4);
        if n == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            o[3] = 0.0;
            return 0;
        }
        let inv = 1.0 / n;
        o[0] = qarr[0] * inv;
        o[1] = qarr[1] * inv;
        o[2] = qarr[2] * inv;
        o[3] = qarr[3] * inv;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_normalize(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q);
        let qarr = [a[0], a[1], a[2], a[3]];
        let n = quatd_norm_from(&qarr);
        let o = f64_slice_mut(call, out, 4);
        if n == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            o[3] = 0.0;
            return 0;
        }
        let inv = 1.0 / n;
        o[0] = qarr[0] * inv;
        o[1] = qarr[1] * inv;
        o[2] = qarr[2] * inv;
        o[3] = qarr[3] * inv;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_normscl(out: u32, q: u32, n: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q);
        let qarr = [a[0], a[1], a[2], a[3]];
        let qn = quatf_normalize_arr(&qarr);
        let o = f32_slice_mut(call, out, 4);
        o[0] = qn[0] * n;
        o[1] = qn[1] * n;
        o[2] = qn[2] * n;
        o[3] = qn[3] * n;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_normscl(out: u32, q: u32, n: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q);
        let qarr = [a[0], a[1], a[2], a[3]];
        let qn = quatd_normalize_arr(&qarr);
        let o = f64_slice_mut(call, out, 4);
        o[0] = qn[0] * n;
        o[1] = qn[1] * n;
        o[2] = qn[2] * n;
        o[3] = qn[3] * n;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_normsq(q: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<4>(q);
        a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_normsq(q: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<4>(q);
        a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_random(out: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f32_slice_mut(call, out, 4);
        for value in o {
            *value = rand_f32_01();
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_random(out: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f64_slice_mut(call, out, 4);
        for value in o {
            *value = rand_f64_01();
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_random_range(out: u32, a: f32, b: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f32_slice_mut(call, out, 4);
        for value in o {
            *value = rand_range_f32(a, b);
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_random_range(out: u32, a: f64, b: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f64_slice_mut(call, out, 4);
        for value in o {
            *value = rand_range_f64(a, b);
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_round(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q);
        let o = f32_slice_mut(call, out, 4);
        for i in 0..4 {
            o[i] = round_f32(a[i]);
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_round(out: u32, q: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q);
        let o = f64_slice_mut(call, out, 4);
        for i in 0..4 {
            o[i] = round_f64(a[i]);
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_scl(out: u32, q: u32, n: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q);
        let o = f32_slice_mut(call, out, 4);
        for i in 0..4 {
            o[i] = a[i] * n;
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_scl(out: u32, q: u32, n: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q);
        let o = f64_slice_mut(call, out, 4);
        for i in 0..4 {
            o[i] = a[i] * n;
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_slerp(out: u32, q1: u32, q2: u32, t: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q1);
        let b = read_f32_array::<4>(q2);
        let q1v = [a[0], a[1], a[2], a[3]];
        let mut q2v = [b[0], b[1], b[2], b[3]];
        let mut dot: f32 = q1v[0] * q2v[0] + q1v[1] * q2v[1] + q1v[2] * q2v[2] + q1v[3] * q2v[3];
        if dot < 0.0 {
            q2v[0] = -q2v[0];
            q2v[1] = -q2v[1];
            q2v[2] = -q2v[2];
            q2v[3] = -q2v[3];
            dot = -dot;
        }
        let res: [f32; 4] = if dot > 0.9995 {
            let q = [
                q1v[0] + t * (q2v[0] - q1v[0]),
                q1v[1] + t * (q2v[1] - q1v[1]),
                q1v[2] + t * (q2v[2] - q1v[2]),
                q1v[3] + t * (q2v[3] - q1v[3]),
            ];
            quatf_normalize_arr(&q)
        } else {
            let theta0: f32 = dot.acos();
            let theta: f32 = theta0 * t;
            let sin_theta: f32 = theta.sin();
            let sin_theta0: f32 = theta0.sin();
            let s0: f32 = theta.cos() - dot * sin_theta / sin_theta0;
            let s1: f32 = sin_theta / sin_theta0;
            [
                s0 * q1v[0] + s1 * q2v[0],
                s0 * q1v[1] + s1 * q2v[1],
                s0 * q1v[2] + s1 * q2v[2],
                s0 * q1v[3] + s1 * q2v[3],
            ]
        };
        let o = f32_slice_mut(call, out, 4);
        o[0] = res[0];
        o[1] = res[1];
        o[2] = res[2];
        o[3] = res[3];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_slerp(out: u32, q1: u32, q2: u32, t: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q1);
        let b = read_f64_array::<4>(q2);
        let q1v = [a[0], a[1], a[2], a[3]];
        let mut q2v = [b[0], b[1], b[2], b[3]];
        let mut dot: f64 = q1v[0] * q2v[0] + q1v[1] * q2v[1] + q1v[2] * q2v[2] + q1v[3] * q2v[3];
        if dot < 0.0 {
            q2v[0] = -q2v[0];
            q2v[1] = -q2v[1];
            q2v[2] = -q2v[2];
            q2v[3] = -q2v[3];
            dot = -dot;
        }
        let res: [f64; 4] = if dot > 0.9995 {
            let q = [
                q1v[0] + t * (q2v[0] - q1v[0]),
                q1v[1] + t * (q2v[1] - q1v[1]),
                q1v[2] + t * (q2v[2] - q1v[2]),
                q1v[3] + t * (q2v[3] - q1v[3]),
            ];
            quatd_normalize_arr(&q)
        } else {
            let theta0: f64 = dot.acos();
            let theta: f64 = theta0 * t;
            let sin_theta: f64 = theta.sin();
            let sin_theta0: f64 = theta0.sin();
            let s0: f64 = theta.cos() - dot * sin_theta / sin_theta0;
            let s1: f64 = sin_theta / sin_theta0;
            [
                s0 * q1v[0] + s1 * q2v[0],
                s0 * q1v[1] + s1 * q2v[1],
                s0 * q1v[2] + s1 * q2v[2],
                s0 * q1v[3] + s1 * q2v[3],
            ]
        };
        let o = f64_slice_mut(call, out, 4);
        o[0] = res[0];
        o[1] = res[1];
        o[2] = res[2];
        o[3] = res[3];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_sub(out: u32, q1: u32, q2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<4>(q1);
        let b = read_f32_array::<4>(q2);
        let o = f32_slice_mut(call, out, 4);
        for i in 0..4 {
            o[i] = a[i] - b[i];
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_sub(out: u32, q1: u32, q2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<4>(q1);
        let b = read_f64_array::<4>(q2);
        let o = f64_slice_mut(call, out, 4);
        for i in 0..4 {
            o[i] = a[i] - b[i];
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatf_toRotation(out: u32, q: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let q = read_f32_array::<4>(q);
        let v = read_f32_array::<3>(v);
        let tx: f32 = 2.0 * (q[1] * v[2] - q[2] * v[1]);
        let ty: f32 = 2.0 * (q[2] * v[0] - q[0] * v[2]);
        let tz: f32 = 2.0 * (q[0] * v[1] - q[1] * v[0]);
        let o = f32_slice_mut(call, out, 3);
        o[0] = v[0] + q[3] * tx + q[1] * tz - q[2] * ty;
        o[1] = v[1] + q[3] * ty + q[2] * tx - q[0] * tz;
        o[2] = v[2] + q[3] * tz + q[0] * ty - q[1] * tx;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn quatd_toRotation(out: u32, q: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let q = read_f64_array::<4>(q);
        let v = read_f64_array::<3>(v);
        let tx: f64 = 2.0 * (q[1] * v[2] - q[2] * v[1]);
        let ty: f64 = 2.0 * (q[2] * v[0] - q[0] * v[2]);
        let tz: f64 = 2.0 * (q[0] * v[1] - q[1] * v[0]);
        let o = f64_slice_mut(call, out, 3);
        o[0] = v[0] + q[3] * tx + q[1] * tz - q[2] * ty;
        o[1] = v[1] + q[3] * ty + q[2] * tx - q[0] * tz;
        o[2] = v[2] + q[3] * tz + q[0] * ty - q[1] * tx;
        0
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn quatf_print(_q: u32) {
    // Printing is handled in JavaScript.
}

#[unsafe(no_mangle)]
pub extern "C" fn quatd_print(_q: u32) {
    // Printing is handled in JavaScript.
}

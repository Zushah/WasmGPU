/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, f32_slice_mut};
use crate::utils::{rand_f32_01, rand_range, round_js};

#[inline(always)]
pub(crate) fn quat_norm_from(q: &[f32; 4]) -> f32 {
    (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt()
}

#[inline(always)]
pub(crate) fn quat_normalize_arr(q: &[f32; 4]) -> [f32; 4] {
    let n = quat_norm_from(q);
    if n == 0.0 {
        return [0.0, 0.0, 0.0, 0.0];
    }
    let inorm = 1.0 / n;
    [q[0] * inorm, q[1] * inorm, q[2] * inorm, q[3] * inorm]
}

#[inline(always)]
pub(crate) fn quat_from_rotation_mat3(
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

#[no_mangle]
pub extern "C" fn quat_abs(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        o[0] = a[0].abs();
        o[1] = a[1].abs();
        o[2] = a[2].abs();
        o[3] = a[3].abs();
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_add(out: u32, q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let o = f32_slice_mut(out, 4);
        o[0] = a[0] + b[0];
        o[1] = a[1] + b[1];
        o[2] = a[2] + b[2];
        o[3] = a[3] + b[3];
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_copy(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = a[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_dist(q1: u32, q2: u32) -> f32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        let dw = a[3] - b[3];
        (dx * dx + dy * dy + dz * dz + dw * dw).sqrt()
    }
}

#[no_mangle]
pub extern "C" fn quat_distsq(q1: u32, q2: u32) -> f32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        let dw = a[3] - b[3];
        dx * dx + dy * dy + dz * dz + dw * dw
    }
}

#[no_mangle]
pub extern "C" fn quat_fromAxisAngle(out: u32, axis: u32, angle: f32) -> u32 {
    unsafe {
        let a = f32_slice(axis, 3);
        let half_angle: f32 = angle * 0.5;
        let s: f32 = half_angle.sin();
        let c: f32 = half_angle.cos();
        let o = f32_slice_mut(out, 4);
        o[0] = a[0] * s;
        o[1] = a[1] * s;
        o[2] = a[2] * s;
        o[3] = c;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_init(out: u32, a: f32, b: f32, c: f32, d: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 4);
        o[0] = a;
        o[1] = b;
        o[2] = c;
        o[3] = d;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_invert(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let n2: f32 = a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
        let o = f32_slice_mut(out, 4);
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
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_isEqual(q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        if a[0] == b[0] && a[1] == b[1] && a[2] == b[2] && a[3] == b[3] {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_isNormalized(q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        if a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] == 1.0 {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_isZero(q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        if a[0] == 0.0 && a[1] == 0.0 && a[2] == 0.0 && a[3] == 0.0 {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_mul(out: u32, q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let mut t = [0.0f32; 4];
        t[0] = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1];
        t[1] = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0];
        t[2] = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3];
        t[3] = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2];
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_neg(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        o[0] = -a[0];
        o[1] = -a[1];
        o[2] = -a[2];
        o[3] = -a[3];
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_norm(q: u32) -> f32 {
    unsafe {
        let a = f32_slice(q, 4);
        (a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]).sqrt()
    }
}

#[no_mangle]
pub extern "C" fn quat_normalize(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let qarr = [a[0], a[1], a[2], a[3]];
        let n = quat_norm_from(&qarr);
        let o = f32_slice_mut(out, 4);
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
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_normscl(out: u32, q: u32, n: f32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let qarr = [a[0], a[1], a[2], a[3]];
        let qn = quat_normalize_arr(&qarr);
        let o = f32_slice_mut(out, 4);
        o[0] = qn[0] * n;
        o[1] = qn[1] * n;
        o[2] = qn[2] * n;
        o[3] = qn[3] * n;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_normsq(q: u32) -> f32 {
    unsafe {
        let a = f32_slice(q, 4);
        a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]
    }
}

#[no_mangle]
pub extern "C" fn quat_random(out: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = rand_f32_01();
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_random_range(out: u32, a: f32, b: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = rand_range(a, b);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_round(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = round_js(a[i]);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_scl(out: u32, q: u32, n: f32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = a[i] * n;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_slerp(out: u32, q1: u32, q2: u32, t: f32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
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
            quat_normalize_arr(&q)
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
        let o = f32_slice_mut(out, 4);
        o[0] = res[0];
        o[1] = res[1];
        o[2] = res[2];
        o[3] = res[3];
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_sub(out: u32, q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = a[i] - b[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_toRotation(out: u32, q: u32, v: u32) -> u32 {
    unsafe {
        let q = f32_slice(q, 4);
        let v = f32_slice(v, 3);
        let tx: f32 = 2.0 * (q[1] * v[2] - q[2] * v[1]);
        let ty: f32 = 2.0 * (q[2] * v[0] - q[0] * v[2]);
        let tz: f32 = 2.0 * (q[0] * v[1] - q[1] * v[0]);
        let o = f32_slice_mut(out, 3);
        o[0] = v[0] + q[3] * tx + q[1] * tz - q[2] * ty;
        o[1] = v[1] + q[3] * ty + q[2] * tx - q[0] * tz;
        o[2] = v[2] + q[3] * tz + q[0] * ty - q[1] * tx;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_print(_q: u32) {
    // Printing is handled in JavaScript.
}

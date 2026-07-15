/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::quat::quat_from_rotation_mat3;
use crate::shared::{f32_slice, f32_slice_mut};
use crate::utils::{rand_f32_01, rand_range, round_js};

#[inline(always)]
pub(crate) fn mat4_det_from(m: &[f32; 16]) -> f32 {
    let a0: f32 = m[0] * m[5] - m[1] * m[4];
    let a1: f32 = m[0] * m[6] - m[2] * m[4];
    let a2: f32 = m[0] * m[7] - m[3] * m[4];
    let a3: f32 = m[1] * m[6] - m[2] * m[5];
    let a4: f32 = m[1] * m[7] - m[3] * m[5];
    let a5: f32 = m[2] * m[7] - m[3] * m[6];
    let b0: f32 = m[8] * m[13] - m[9] * m[12];
    let b1: f32 = m[8] * m[14] - m[10] * m[12];
    let b2: f32 = m[8] * m[15] - m[11] * m[12];
    let b3: f32 = m[9] * m[14] - m[10] * m[13];
    let b4: f32 = m[9] * m[15] - m[11] * m[13];
    let b5: f32 = m[10] * m[15] - m[11] * m[14];
    a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0
}

#[inline(always)]
pub(crate) fn mat4_identity_arr() -> [f32; 16] {
    [
        1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    ]
}

#[inline(always)]
pub(crate) fn mat4_invert_from(m: &[f32; 16]) -> [f32; 16] {
    let det: f32 = mat4_det_from(m);
    if det == 0.0 {
        return mat4_identity_arr();
    }
    let idet: f32 = 1.0 / det;
    [
        (m[5] * (m[10] * m[15] - m[11] * m[14]) - m[9] * (m[6] * m[15] - m[7] * m[14])
            + m[13] * (m[6] * m[11] - m[7] * m[10]))
            * idet,
        (-m[1] * (m[10] * m[15] - m[11] * m[14]) + m[9] * (m[2] * m[15] - m[3] * m[14])
            - m[13] * (m[2] * m[11] - m[3] * m[10]))
            * idet,
        (m[1] * (m[6] * m[15] - m[7] * m[14]) - m[5] * (m[2] * m[15] - m[3] * m[14])
            + m[13] * (m[2] * m[7] - m[3] * m[6]))
            * idet,
        (-m[1] * (m[6] * m[11] - m[7] * m[10]) + m[5] * (m[2] * m[11] - m[3] * m[10])
            - m[9] * (m[2] * m[7] - m[3] * m[6]))
            * idet,
        (-m[4] * (m[10] * m[15] - m[11] * m[14]) + m[8] * (m[6] * m[15] - m[7] * m[14])
            - m[12] * (m[6] * m[11] - m[7] * m[10]))
            * idet,
        (m[0] * (m[10] * m[15] - m[11] * m[14]) - m[8] * (m[2] * m[15] - m[3] * m[14])
            + m[12] * (m[2] * m[11] - m[3] * m[10]))
            * idet,
        (-m[0] * (m[6] * m[15] - m[7] * m[14]) + m[4] * (m[2] * m[15] - m[3] * m[14])
            - m[12] * (m[2] * m[7] - m[3] * m[6]))
            * idet,
        (m[0] * (m[6] * m[11] - m[7] * m[10]) - m[4] * (m[2] * m[11] - m[3] * m[10])
            + m[8] * (m[2] * m[7] - m[3] * m[6]))
            * idet,
        (m[4] * (m[9] * m[15] - m[11] * m[13]) - m[8] * (m[5] * m[15] - m[7] * m[13])
            + m[12] * (m[5] * m[11] - m[7] * m[9]))
            * idet,
        (-m[0] * (m[9] * m[15] - m[11] * m[13]) + m[8] * (m[1] * m[15] - m[3] * m[13])
            - m[12] * (m[1] * m[11] - m[3] * m[9]))
            * idet,
        (m[0] * (m[5] * m[15] - m[7] * m[13]) - m[4] * (m[1] * m[15] - m[3] * m[13])
            + m[12] * (m[1] * m[7] - m[3] * m[5]))
            * idet,
        (-m[0] * (m[5] * m[11] - m[7] * m[9]) + m[4] * (m[1] * m[11] - m[3] * m[9])
            - m[8] * (m[1] * m[7] - m[3] * m[5]))
            * idet,
        (-m[4] * (m[9] * m[14] - m[10] * m[13]) + m[8] * (m[5] * m[14] - m[6] * m[13])
            - m[12] * (m[5] * m[10] - m[6] * m[9]))
            * idet,
        (m[0] * (m[9] * m[14] - m[10] * m[13]) - m[8] * (m[1] * m[14] - m[2] * m[13])
            + m[12] * (m[1] * m[10] - m[2] * m[9]))
            * idet,
        (-m[0] * (m[5] * m[14] - m[6] * m[13]) + m[4] * (m[1] * m[14] - m[2] * m[13])
            - m[12] * (m[1] * m[6] - m[2] * m[5]))
            * idet,
        (m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9])
            + m[8] * (m[1] * m[6] - m[2] * m[5]))
            * idet,
    ]
}

#[no_mangle]
pub extern "C" fn mat4_abs(out: u32, m: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let a = f32_slice(m, 16);
        for i in 0..16 {
            o[i] = a[i].abs();
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_add(out: u32, m1: u32, m2: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        for i in 0..16 {
            o[i] = a[i] + b[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_copy(out: u32, m: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let a = f32_slice(m, 16);
        for i in 0..16 {
            o[i] = a[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_decompose_trs(out_trs: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let tx = a[12];
        let ty = a[13];
        let tz = a[14];
        let mut x0 = a[0];
        let mut x1 = a[1];
        let mut x2 = a[2];
        let y0 = a[4];
        let y1 = a[5];
        let y2 = a[6];
        let z0 = a[8];
        let z1 = a[9];
        let z2 = a[10];
        let sx = (x0 * x0 + x1 * x1 + x2 * x2).sqrt();
        let sy = (y0 * y0 + y1 * y1 + y2 * y2).sqrt();
        let sz = (z0 * z0 + z1 * z1 + z2 * z2).sqrt();
        let sxn = if sx == 0.0 { 1.0 } else { sx };
        let syn = if sy == 0.0 { 1.0 } else { sy };
        let szn = if sz == 0.0 { 1.0 } else { sz };
        let cx0 = y1 * z2 - y2 * z1;
        let cx1 = y2 * z0 - y0 * z2;
        let cx2 = y0 * z1 - y1 * z0;
        let det = x0 * cx0 + x1 * cx1 + x2 * cx2;
        let mut sxf = sxn;
        let syf = syn;
        let szf = szn;
        if det < 0.0 {
            sxf = -sxn;
            x0 = -x0;
            x1 = -x1;
            x2 = -x2;
        }
        let rx0 = x0 / sxn;
        let rx1 = x1 / sxn;
        let rx2 = x2 / sxn;
        let ry0 = y0 / syn;
        let ry1 = y1 / syn;
        let ry2 = y2 / syn;
        let rz0 = z0 / szn;
        let rz1 = z1 / szn;
        let rz2 = z2 / szn;
        let q = quat_from_rotation_mat3(rx0, ry0, rz0, rx1, ry1, rz1, rx2, ry2, rz2);
        let out = f32_slice_mut(out_trs, 10);
        out[0] = tx;
        out[1] = ty;
        out[2] = tz;
        out[3] = q[0];
        out[4] = q[1];
        out[5] = q[2];
        out[6] = q[3];
        out[7] = sxf;
        out[8] = syf;
        out[9] = szf;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_det(m: u32) -> f32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut mm = [0.0f32; 16];
        mm.copy_from_slice(a);
        mat4_det_from(&mm)
    }
}

#[no_mangle]
pub extern "C" fn mat4_identity(out: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        o[0] = 1.0;
        o[1] = 0.0;
        o[2] = 0.0;
        o[3] = 0.0;
        o[4] = 0.0;
        o[5] = 1.0;
        o[6] = 0.0;
        o[7] = 0.0;
        o[8] = 0.0;
        o[9] = 0.0;
        o[10] = 1.0;
        o[11] = 0.0;
        o[12] = 0.0;
        o[13] = 0.0;
        o[14] = 0.0;
        o[15] = 1.0;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_init(
    out: u32,
    m0: f32,
    m1: f32,
    m2: f32,
    m3: f32,
    m4: f32,
    m5: f32,
    m6: f32,
    m7: f32,
    m8: f32,
    m9: f32,
    m10: f32,
    m11: f32,
    m12: f32,
    m13: f32,
    m14: f32,
    m15: f32,
) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        o[0] = m0;
        o[1] = m1;
        o[2] = m2;
        o[3] = m3;
        o[4] = m4;
        o[5] = m5;
        o[6] = m6;
        o[7] = m7;
        o[8] = m8;
        o[9] = m9;
        o[10] = m10;
        o[11] = m11;
        o[12] = m12;
        o[13] = m13;
        o[14] = m14;
        o[15] = m15;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_invert(out: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut mm = [0.0f32; 16];
        mm.copy_from_slice(a);
        let inv = mat4_invert_from(&mm);
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = inv[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_isEqual(m1: u32, m2: u32) -> u32 {
    unsafe {
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        for i in 0..16 {
            if a[i] != b[i] {
                return 0;
            }
        }
    }
    1
}

#[no_mangle]
pub extern "C" fn mat4_isIdentity(m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        if a[0] == 1.0
            && a[1] == 0.0
            && a[2] == 0.0
            && a[3] == 0.0
            && a[4] == 0.0
            && a[5] == 1.0
            && a[6] == 0.0
            && a[7] == 0.0
            && a[8] == 0.0
            && a[9] == 0.0
            && a[10] == 1.0
            && a[11] == 0.0
            && a[12] == 0.0
            && a[13] == 0.0
            && a[14] == 0.0
            && a[15] == 1.0
        {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_isInverse(m1: u32, m2: u32) -> u32 {
    unsafe {
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        let mut mm = [0.0f32; 16];
        mm.copy_from_slice(a);
        let inv = mat4_invert_from(&mm);
        for i in 0..16 {
            if inv[i] != b[i] {
                return 0;
            }
        }
    }
    1
}

#[no_mangle]
pub extern "C" fn mat4_isZero(m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        for i in 0..16 {
            if a[i] != 0.0 {
                return 0;
            }
        }
    }
    1
}

#[no_mangle]
pub extern "C" fn mat4_lookAt(out: u32, eye: u32, center: u32, up: u32) -> u32 {
    unsafe {
        let eye = f32_slice(eye, 3);
        let center = f32_slice(center, 3);
        let up = f32_slice(up, 3);
        let mut f = [center[0] - eye[0], center[1] - eye[1], center[2] - eye[2]];
        let fnorm = (f[0] * f[0] + f[1] * f[1] + f[2] * f[2]).sqrt();
        f[0] /= fnorm;
        f[1] /= fnorm;
        f[2] /= fnorm;
        let mut s = [
            f[1] * up[2] - f[2] * up[1],
            f[2] * up[0] - f[0] * up[2],
            f[0] * up[1] - f[1] * up[0],
        ];
        let snorm = (s[0] * s[0] + s[1] * s[1] + s[2] * s[2]).sqrt();
        s[0] /= snorm;
        s[1] /= snorm;
        s[2] /= snorm;
        let u = [
            s[1] * f[2] - s[2] * f[1],
            s[2] * f[0] - s[0] * f[2],
            s[0] * f[1] - s[1] * f[0],
        ];
        let o = f32_slice_mut(out, 16);
        o[0] = s[0];
        o[1] = u[0];
        o[2] = -f[0];
        o[3] = 0.0;
        o[4] = s[1];
        o[5] = u[1];
        o[6] = -f[1];
        o[7] = 0.0;
        o[8] = s[2];
        o[9] = u[2];
        o[10] = -f[2];
        o[11] = 0.0;
        o[12] = -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]);
        o[13] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
        o[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
        o[15] = 1.0;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_mul(out: u32, m1: u32, m2: u32) -> u32 {
    unsafe {
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        let mut t = [0.0f32; 16];
        t[0] = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3];
        t[1] = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3];
        t[2] = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3];
        t[3] = a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3];
        t[4] = a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7];
        t[5] = a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7];
        t[6] = a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7];
        t[7] = a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7];
        t[8] = a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11];
        t[9] = a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11];
        t[10] = a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11];
        t[11] = a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11];
        t[12] = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15];
        t[13] = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15];
        t[14] = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15];
        t[15] = a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15];
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_mul_vec4(out: u32, m: u32, v4: u32) -> u32 {
    unsafe {
        let m = f32_slice(m, 16);
        let v = f32_slice(v4, 4);
        let o = f32_slice_mut(out, 4);
        o[0] = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3];
        o[1] = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3];
        o[2] = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3];
        o[3] = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3];
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_neg(out: u32, m: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let a = f32_slice(m, 16);
        for i in 0..16 {
            o[i] = -a[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_norm(m: u32) -> f32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut s = 0.0f32;
        for i in 0..16 {
            s += a[i] * a[i];
        }
        s.sqrt()
    }
}

#[no_mangle]
pub extern "C" fn mat4_normalize(out: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut s = 0.0f32;
        for i in 0..16 {
            s += a[i] * a[i];
        }
        let n = s.sqrt();
        let o = f32_slice_mut(out, 16);
        if n == 0.0 {
            let id = mat4_identity_arr();
            for i in 0..16 {
                o[i] = id[i];
            }
            return 0;
        }
        let inorm = 1.0 / n;
        for i in 0..16 {
            o[i] = a[i] * inorm;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_normsq(m: u32) -> f32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut s = 0.0f32;
        for i in 0..16 {
            s += a[i] * a[i];
        }
        s
    }
}

#[no_mangle]
pub extern "C" fn mat4_perspective(out: u32, fov_y: f32, aspect: f32, near: f32, far: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let f: f32 = 1.0 / (fov_y * 0.5).tan();
        let range_inv: f32 = 1.0 / (near - far);
        o[0] = f / aspect;
        o[1] = 0.0;
        o[2] = 0.0;
        o[3] = 0.0;
        o[4] = 0.0;
        o[5] = f;
        o[6] = 0.0;
        o[7] = 0.0;
        o[8] = 0.0;
        o[9] = 0.0;
        o[10] = far * range_inv;
        o[11] = -1.0;
        o[12] = 0.0;
        o[13] = 0.0;
        o[14] = near * far * range_inv;
        o[15] = 0.0;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_random(out: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = rand_f32_01();
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_random_range(out: u32, a: f32, b: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = rand_range(a, b);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_rotateX(out: u32, m: u32, angle: f32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let c: f32 = angle.cos();
        let s: f32 = angle.sin();
        let mut t = [0.0f32; 16];
        t[0] = a[0];
        t[1] = a[1];
        t[2] = a[2];
        t[3] = a[3];
        t[4] = a[4] * c + a[8] * s;
        t[5] = a[5] * c + a[9] * s;
        t[6] = a[6] * c + a[10] * s;
        t[7] = a[7] * c + a[11] * s;
        t[8] = a[8] * c - a[4] * s;
        t[9] = a[9] * c - a[5] * s;
        t[10] = a[10] * c - a[6] * s;
        t[11] = a[11] * c - a[7] * s;
        t[12] = a[12];
        t[13] = a[13];
        t[14] = a[14];
        t[15] = a[15];
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_rotateY(out: u32, m: u32, angle: f32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let c: f32 = angle.cos();
        let s: f32 = angle.sin();
        let mut t = [0.0f32; 16];
        t[0] = a[0] * c - a[8] * s;
        t[1] = a[1] * c - a[9] * s;
        t[2] = a[2] * c - a[10] * s;
        t[3] = a[3] * c - a[11] * s;
        t[4] = a[4];
        t[5] = a[5];
        t[6] = a[6];
        t[7] = a[7];
        t[8] = a[0] * s + a[8] * c;
        t[9] = a[1] * s + a[9] * c;
        t[10] = a[2] * s + a[10] * c;
        t[11] = a[3] * s + a[11] * c;
        t[12] = a[12];
        t[13] = a[13];
        t[14] = a[14];
        t[15] = a[15];
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_rotateZ(out: u32, m: u32, angle: f32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let c: f32 = angle.cos();
        let s: f32 = angle.sin();
        let mut t = [0.0f32; 16];
        t[0] = a[0] * c + a[4] * s;
        t[1] = a[1] * c + a[5] * s;
        t[2] = a[2] * c + a[6] * s;
        t[3] = a[3] * c + a[7] * s;
        t[4] = a[4] * c - a[0] * s;
        t[5] = a[5] * c - a[1] * s;
        t[6] = a[6] * c - a[2] * s;
        t[7] = a[7] * c - a[3] * s;
        t[8] = a[8];
        t[9] = a[9];
        t[10] = a[10];
        t[11] = a[11];
        t[12] = a[12];
        t[13] = a[13];
        t[14] = a[14];
        t[15] = a[15];
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_round(out: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = round_js(a[i]);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_scl(out: u32, m: u32, n: f32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = a[i] * n;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_sub(out: u32, m1: u32, m2: u32) -> u32 {
    unsafe {
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = a[i] - b[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_trace(m: u32) -> f32 {
    unsafe {
        let a = f32_slice(m, 16);
        a[0] + a[5] + a[10] + a[15]
    }
}

#[no_mangle]
pub extern "C" fn mat4_translate(out: u32, m: u32, v: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let v = f32_slice(v, 3);
        let o = f32_slice_mut(out, 16);
        o[0] = a[0];
        o[1] = a[1];
        o[2] = a[2];
        o[3] = a[3];
        o[4] = a[4];
        o[5] = a[5];
        o[6] = a[6];
        o[7] = a[7];
        o[8] = a[8];
        o[9] = a[9];
        o[10] = a[10];
        o[11] = a[11];
        o[12] = a[12] + v[0];
        o[13] = a[13] + v[1];
        o[14] = a[14] + v[2];
        o[15] = a[15];
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_transpose(out: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut t = [0.0f32; 16];
        t[0] = a[0];
        t[1] = a[4];
        t[2] = a[8];
        t[3] = a[12];
        t[4] = a[1];
        t[5] = a[5];
        t[6] = a[9];
        t[7] = a[13];
        t[8] = a[2];
        t[9] = a[6];
        t[10] = a[10];
        t[11] = a[14];
        t[12] = a[3];
        t[13] = a[7];
        t[14] = a[11];
        t[15] = a[15];
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_print(_m: u32) {
    // Printing is handled in JavaScript.
}

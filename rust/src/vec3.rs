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
pub(crate) fn vec3f_norm_from(v: &[f32; 3]) -> f32 {
    (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt()
}

#[inline(always)]
pub(crate) fn vec3d_norm_from(v: &[f64; 3]) -> f64 {
    (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt()
}

#[inline(always)]
pub(crate) fn vec3f_normsq_from(v: &[f32; 3]) -> f32 {
    v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
}

#[inline(always)]
pub(crate) fn vec3d_normsq_from(v: &[f64; 3]) -> f64 {
    v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
}

#[inline(always)]
pub(crate) fn vec3f_dot_from(a: &[f32; 3], b: &[f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline(always)]
pub(crate) fn vec3d_dot_from(a: &[f64; 3], b: &[f64; 3]) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline(always)]
pub(crate) fn vec3f_cross_from(a: &[f32; 3], b: &[f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

#[inline(always)]
pub(crate) fn vec3d_cross_from(a: &[f64; 3], b: &[f64; 3]) -> [f64; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_abs(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v);
        let o = f32_slice_mut(call, out, 3);
        o[0] = a[0].abs();
        o[1] = a[1].abs();
        o[2] = a[2].abs();
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_abs(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v);
        let o = f64_slice_mut(call, out, 3);
        o[0] = a[0].abs();
        o[1] = a[1].abs();
        o[2] = a[2].abs();
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_add(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let o = f32_slice_mut(call, out, 3);
        o[0] = a[0] + b[0];
        o[1] = a[1] + b[1];
        o[2] = a[2] + b[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_add(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let o = f64_slice_mut(call, out, 3);
        o[0] = a[0] + b[0];
        o[1] = a[1] + b[1];
        o[2] = a[2] + b[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_ang(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v);
        let vv = [a[0], a[1], a[2]];
        let n: f32 = vec3f_norm_from(&vv);
        let o = f32_slice_mut(call, out, 3);
        o[0] = (vv[0] / n).acos();
        o[1] = (vv[1] / n).acos();
        o[2] = (vv[2] / n).acos();
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_ang(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v);
        let vv = [a[0], a[1], a[2]];
        let n: f64 = vec3d_norm_from(&vv);
        let o = f64_slice_mut(call, out, 3);
        o[0] = (vv[0] / n).acos();
        o[1] = (vv[1] / n).acos();
        o[2] = (vv[2] / n).acos();
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_angBetween(v1: u32, v2: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let n1: f32 = vec3f_norm_from(&va);
        let n2: f32 = vec3f_norm_from(&vb);
        if n1 == 0.0 || n2 == 0.0 {
            return 0.0;
        }
        let dot = vec3f_dot_from(&va, &vb);
        (dot / (n1 * n2)).acos()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_angBetween(v1: u32, v2: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let n1: f64 = vec3d_norm_from(&va);
        let n2: f64 = vec3d_norm_from(&vb);
        if n1 == 0.0 || n2 == 0.0 {
            return 0.0;
        }
        let dot = vec3d_dot_from(&va, &vb);
        (dot / (n1 * n2)).acos()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_copy(out: u32, v: u32) -> u32 {
    unsafe { copy_f32(out, v, 3) };
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_copy(out: u32, v: u32) -> u32 {
    unsafe { copy_f64(out, v, 3) };
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_cross(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let c = vec3f_cross_from(&va, &vb);
        let o = f32_slice_mut(call, out, 3);
        o[0] = c[0];
        o[1] = c[1];
        o[2] = c[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_cross(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let c = vec3d_cross_from(&va, &vb);
        let o = f64_slice_mut(call, out, 3);
        o[0] = c[0];
        o[1] = c[1];
        o[2] = c[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_dist(v1: u32, v2: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        (dx * dx + dy * dy + dz * dz).sqrt()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_dist(v1: u32, v2: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        (dx * dx + dy * dy + dz * dz).sqrt()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_distsq(v1: u32, v2: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        dx * dx + dy * dy + dz * dz
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_distsq(v1: u32, v2: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        dx * dx + dy * dy + dz * dz
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_dot(v1: u32, v2: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_dot(v1: u32, v2: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_init(out: u32, x: f32, y: f32, z: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f32_slice_mut(call, out, 3);
        o[0] = x;
        o[1] = y;
        o[2] = z;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_init(out: u32, x: f64, y: f64, z: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f64_slice_mut(call, out, 3);
        o[0] = x;
        o[1] = y;
        o[2] = z;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_interp(out: u32, v: u32, a: f32, b: f32, c: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let v = read_f32_array::<3>(v);
        let denom = a + b + c;
        let s = (a * v[0] + b * v[1] + c * v[2]) / denom;
        let o = f32_slice_mut(call, out, 3);
        o[0] = s;
        o[1] = s;
        o[2] = s;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_interp(out: u32, v: u32, a: f64, b: f64, c: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let v = read_f64_array::<3>(v);
        let denom = a + b + c;
        let s = (a * v[0] + b * v[1] + c * v[2]) / denom;
        let o = f64_slice_mut(call, out, 3);
        o[0] = s;
        o[1] = s;
        o[2] = s;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_isEqual(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        if a[0] == b[0] && a[1] == b[1] && a[2] == b[2] {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_isEqual(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        if a[0] == b[0] && a[1] == b[1] && a[2] == b[2] {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_isNormalized(v: u32) -> u32 {
    unsafe {
        let a = read_f32_array::<3>(v);
        if a[0] * a[0] + a[1] * a[1] + a[2] * a[2] == 1.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_isNormalized(v: u32) -> u32 {
    unsafe {
        let a = read_f64_array::<3>(v);
        if a[0] * a[0] + a[1] * a[1] + a[2] * a[2] == 1.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_isOrthogonal(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        if a[0] * b[0] + a[1] * b[1] + a[2] * b[2] == 0.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_isOrthogonal(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        if a[0] * b[0] + a[1] * b[1] + a[2] * b[2] == 0.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_isParallel(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let n1 = vec3f_norm_from(&va);
        let n2 = vec3f_norm_from(&vb);
        let dot = vec3f_dot_from(&va, &vb);
        if dot == n1 * n2 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_isParallel(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let n1 = vec3d_norm_from(&va);
        let n2 = vec3d_norm_from(&vb);
        let dot = vec3d_dot_from(&va, &vb);
        if dot == n1 * n2 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_isZero(v: u32) -> u32 {
    unsafe {
        let a = read_f32_array::<3>(v);
        if a[0] == 0.0 && a[1] == 0.0 && a[2] == 0.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_isZero(v: u32) -> u32 {
    unsafe {
        let a = read_f64_array::<3>(v);
        if a[0] == 0.0 && a[1] == 0.0 && a[2] == 0.0 {
            return 1;
        }
    }
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_neg(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v);
        let o = f32_slice_mut(call, out, 3);
        o[0] = -a[0];
        o[1] = -a[1];
        o[2] = -a[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_neg(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v);
        let o = f64_slice_mut(call, out, 3);
        o[0] = -a[0];
        o[1] = -a[1];
        o[2] = -a[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_norm(v: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<3>(v);
        (a[0] * a[0] + a[1] * a[1] + a[2] * a[2]).sqrt()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_norm(v: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<3>(v);
        (a[0] * a[0] + a[1] * a[1] + a[2] * a[2]).sqrt()
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_normalize(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v);
        let vv = [a[0], a[1], a[2]];
        let n = vec3f_norm_from(&vv);
        let o = f32_slice_mut(call, out, 3);
        if n == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        o[0] = vv[0] / n;
        o[1] = vv[1] / n;
        o[2] = vv[2] / n;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_normalize(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v);
        let vv = [a[0], a[1], a[2]];
        let n = vec3d_norm_from(&vv);
        let o = f64_slice_mut(call, out, 3);
        if n == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        o[0] = vv[0] / n;
        o[1] = vv[1] / n;
        o[2] = vv[2] / n;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_normscl(out: u32, v: u32, n: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v);
        let vv = [a[0], a[1], a[2]];
        let norm = vec3f_norm_from(&vv);
        let o = f32_slice_mut(call, out, 3);
        if norm == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        let inv = 1.0 / norm;
        o[0] = vv[0] * inv * n;
        o[1] = vv[1] * inv * n;
        o[2] = vv[2] * inv * n;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_normscl(out: u32, v: u32, n: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v);
        let vv = [a[0], a[1], a[2]];
        let norm = vec3d_norm_from(&vv);
        let o = f64_slice_mut(call, out, 3);
        if norm == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        let inv = 1.0 / norm;
        o[0] = vv[0] * inv * n;
        o[1] = vv[1] * inv * n;
        o[2] = vv[2] * inv * n;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_normsq(v: u32) -> f32 {
    unsafe {
        let a = read_f32_array::<3>(v);
        a[0] * a[0] + a[1] * a[1] + a[2] * a[2]
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_normsq(v: u32) -> f64 {
    unsafe {
        let a = read_f64_array::<3>(v);
        a[0] * a[0] + a[1] * a[1] + a[2] * a[2]
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_oproj(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let vb = [b[0], b[1], b[2]];
        let n2 = vec3f_normsq_from(&vb);
        let mut p = [0.0f32; 3];
        if n2 != 0.0 {
            let va = [a[0], a[1], a[2]];
            let d = vec3f_dot_from(&va, &vb) / n2;
            p[0] = vb[0] * d;
            p[1] = vb[1] * d;
            p[2] = vb[2] * d;
        }
        let o = f32_slice_mut(call, out, 3);
        o[0] = a[0] - p[0];
        o[1] = a[1] - p[1];
        o[2] = a[2] - p[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_oproj(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let vb = [b[0], b[1], b[2]];
        let n2 = vec3d_normsq_from(&vb);
        let mut p = [0.0f64; 3];
        if n2 != 0.0 {
            let va = [a[0], a[1], a[2]];
            let d = vec3d_dot_from(&va, &vb) / n2;
            p[0] = vb[0] * d;
            p[1] = vb[1] * d;
            p[2] = vb[2] * d;
        }
        let o = f64_slice_mut(call, out, 3);
        o[0] = a[0] - p[0];
        o[1] = a[1] - p[1];
        o[2] = a[2] - p[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_proj(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let vb = [b[0], b[1], b[2]];
        let n2: f32 = vec3f_normsq_from(&vb);
        let o = f32_slice_mut(call, out, 3);
        if n2 == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        let va = [a[0], a[1], a[2]];
        let d = vec3f_dot_from(&va, &vb) / n2;
        o[0] = vb[0] * d;
        o[1] = vb[1] * d;
        o[2] = vb[2] * d;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_proj(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let vb = [b[0], b[1], b[2]];
        let n2: f64 = vec3d_normsq_from(&vb);
        let o = f64_slice_mut(call, out, 3);
        if n2 == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        let va = [a[0], a[1], a[2]];
        let d = vec3d_dot_from(&va, &vb) / n2;
        o[0] = vb[0] * d;
        o[1] = vb[1] * d;
        o[2] = vb[2] * d;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_random(out: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f32_slice_mut(call, out, 3);
        o[0] = rand_f32_01();
        o[1] = rand_f32_01();
        o[2] = rand_f32_01();
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_random(out: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f64_slice_mut(call, out, 3);
        o[0] = rand_f64_01();
        o[1] = rand_f64_01();
        o[2] = rand_f64_01();
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_random_range(out: u32, a: f32, b: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f32_slice_mut(call, out, 3);
        o[0] = rand_range_f32(a, b);
        o[1] = rand_range_f32(a, b);
        o[2] = rand_range_f32(a, b);
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_random_range(out: u32, a: f64, b: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let o = f64_slice_mut(call, out, 3);
        o[0] = rand_range_f64(a, b);
        o[1] = rand_range_f64(a, b);
        o[2] = rand_range_f64(a, b);
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_reflect(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let vb = [b[0], b[1], b[2]];
        let n = vec3f_norm_from(&vb);
        let vn = if n == 0.0 {
            [0.0, 0.0, 0.0]
        } else {
            [vb[0] / n, vb[1] / n, vb[2] / n]
        };
        let va = [a[0], a[1], a[2]];
        let d: f32 = vec3f_dot_from(&va, &vn);
        let vd = [vn[0] * (2.0 * d), vn[1] * (2.0 * d), vn[2] * (2.0 * d)];
        let o = f32_slice_mut(call, out, 3);
        o[0] = va[0] - vd[0];
        o[1] = va[1] - vd[1];
        o[2] = va[2] - vd[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_reflect(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let vb = [b[0], b[1], b[2]];
        let n = vec3d_norm_from(&vb);
        let vn = if n == 0.0 {
            [0.0, 0.0, 0.0]
        } else {
            [vb[0] / n, vb[1] / n, vb[2] / n]
        };
        let va = [a[0], a[1], a[2]];
        let d: f64 = vec3d_dot_from(&va, &vn);
        let vd = [vn[0] * (2.0 * d), vn[1] * (2.0 * d), vn[2] * (2.0 * d)];
        let o = f64_slice_mut(call, out, 3);
        o[0] = va[0] - vd[0];
        o[1] = va[1] - vd[1];
        o[2] = va[2] - vd[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_refract(out: u32, v1: u32, v2: u32, n: f32) -> u32 {
    with_driver_call(|call| unsafe {
        if n <= 0.0 {
            let o = f32_slice_mut(call, out, 3);
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let vb = [b[0], b[1], b[2]];
        let nb = vec3f_norm_from(&vb);
        let vn = if nb == 0.0 {
            [0.0, 0.0, 0.0]
        } else {
            [vb[0] / nb, vb[1] / nb, vb[2] / nb]
        };
        let va = [a[0], a[1], a[2]];
        let d = vec3f_dot_from(&va, &vn);
        let t = -(1.0 - n * n * (1.0 - d * d)).sqrt();
        let perp = [
            (va[0] - vn[0] * d) * n,
            (va[1] - vn[1] * d) * n,
            (va[2] - vn[2] * d) * n,
        ];
        let parr = [vn[0] * t, vn[1] * t, vn[2] * t];
        let o = f32_slice_mut(call, out, 3);
        o[0] = perp[0] + parr[0];
        o[1] = perp[1] + parr[1];
        o[2] = perp[2] + parr[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_refract(out: u32, v1: u32, v2: u32, n: f64) -> u32 {
    with_driver_call(|call| unsafe {
        if n <= 0.0 {
            let o = f64_slice_mut(call, out, 3);
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let vb = [b[0], b[1], b[2]];
        let nb = vec3d_norm_from(&vb);
        let vn = if nb == 0.0 {
            [0.0, 0.0, 0.0]
        } else {
            [vb[0] / nb, vb[1] / nb, vb[2] / nb]
        };
        let va = [a[0], a[1], a[2]];
        let d = vec3d_dot_from(&va, &vn);
        let t = -(1.0 - n * n * (1.0 - d * d)).sqrt();
        let perp = [
            (va[0] - vn[0] * d) * n,
            (va[1] - vn[1] * d) * n,
            (va[2] - vn[2] * d) * n,
        ];
        let parr = [vn[0] * t, vn[1] * t, vn[2] * t];
        let o = f64_slice_mut(call, out, 3);
        o[0] = perp[0] + parr[0];
        o[1] = perp[1] + parr[1];
        o[2] = perp[2] + parr[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_round(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v);
        let o = f32_slice_mut(call, out, 3);
        o[0] = round_f32(a[0]);
        o[1] = round_f32(a[1]);
        o[2] = round_f32(a[2]);
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_round(out: u32, v: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v);
        let o = f64_slice_mut(call, out, 3);
        o[0] = round_f64(a[0]);
        o[1] = round_f64(a[1]);
        o[2] = round_f64(a[2]);
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_scl(out: u32, v: u32, n: f32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v);
        let o = f32_slice_mut(call, out, 3);
        o[0] = a[0] * n;
        o[1] = a[1] * n;
        o[2] = a[2] * n;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_scl(out: u32, v: u32, n: f64) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v);
        let o = f64_slice_mut(call, out, 3);
        o[0] = a[0] * n;
        o[1] = a[1] * n;
        o[2] = a[2] * n;
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3f_sub(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f32_array::<3>(v1);
        let b = read_f32_array::<3>(v2);
        let o = f32_slice_mut(call, out, 3);
        o[0] = a[0] - b[0];
        o[1] = a[1] - b[1];
        o[2] = a[2] - b[2];
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn vec3d_sub(out: u32, v1: u32, v2: u32) -> u32 {
    with_driver_call(|call| unsafe {
        let a = read_f64_array::<3>(v1);
        let b = read_f64_array::<3>(v2);
        let o = f64_slice_mut(call, out, 3);
        o[0] = a[0] - b[0];
        o[1] = a[1] - b[1];
        o[2] = a[2] - b[2];
        0
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn vec3f_print(_v: u32) {
    // Printing is handled in JavaScript.
}

#[unsafe(no_mangle)]
pub extern "C" fn vec3d_print(_v: u32) {
    // Printing is handled in JavaScript.
}

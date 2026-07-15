/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice_mut, u8_slice, u8_slice_mut};

pub(crate) const CT_I8: u32 = 5120;
pub(crate) const CT_U8: u32 = 5121;
pub(crate) const CT_I16: u32 = 5122;
pub(crate) const CT_U16: u32 = 5123;
pub(crate) const CT_I32: u32 = 5124;
pub(crate) const CT_U32: u32 = 5125;
pub(crate) const CT_F32: u32 = 5126;

#[inline(always)]
pub(crate) fn component_bytes(component_type: u32) -> usize {
    match component_type {
        CT_I8 | CT_U8 => 1,
        CT_I16 | CT_U16 => 2,
        CT_I32 | CT_U32 | CT_F32 => 4,
        _ => 0,
    }
}

#[inline(always)]
pub(crate) fn component_bits(component_type: u32) -> u32 {
    match component_type {
        CT_I8 | CT_U8 => 8,
        CT_I16 | CT_U16 => 16,
        CT_I32 | CT_U32 | CT_F32 => 32,
        _ => 0,
    }
}

#[inline(always)]
pub(crate) fn component_signed(component_type: u32) -> bool {
    matches!(component_type, CT_I8 | CT_I16 | CT_I32 | CT_F32)
}

#[inline(always)]
fn read_u16_le(bytes: &[u8], byte_offset: usize) -> u16 {
    u16::from_le_bytes([bytes[byte_offset], bytes[byte_offset + 1]])
}

#[inline(always)]
fn read_i16_le(bytes: &[u8], byte_offset: usize) -> i16 {
    i16::from_le_bytes([bytes[byte_offset], bytes[byte_offset + 1]])
}

#[inline(always)]
fn read_u32_le(bytes: &[u8], byte_offset: usize) -> u32 {
    u32::from_le_bytes([
        bytes[byte_offset],
        bytes[byte_offset + 1],
        bytes[byte_offset + 2],
        bytes[byte_offset + 3],
    ])
}

#[inline(always)]
fn read_i32_le(bytes: &[u8], byte_offset: usize) -> i32 {
    i32::from_le_bytes([
        bytes[byte_offset],
        bytes[byte_offset + 1],
        bytes[byte_offset + 2],
        bytes[byte_offset + 3],
    ])
}

#[inline(always)]
fn read_f32_le(bytes: &[u8], byte_offset: usize) -> f32 {
    f32::from_le_bytes([
        bytes[byte_offset],
        bytes[byte_offset + 1],
        bytes[byte_offset + 2],
        bytes[byte_offset + 3],
    ])
}

#[inline(always)]
pub(crate) fn read_component_as_f64(bytes: &[u8], index: usize, component_type: u32) -> f64 {
    let b = component_bytes(component_type);
    let o = index * b;
    match component_type {
        CT_I8 => (bytes[o] as i8) as f64,
        CT_U8 => bytes[o] as f64,
        CT_I16 => read_i16_le(bytes, o) as f64,
        CT_U16 => read_u16_le(bytes, o) as f64,
        CT_I32 => read_i32_le(bytes, o) as f64,
        CT_U32 => read_u32_le(bytes, o) as f64,
        CT_F32 => read_f32_le(bytes, o) as f64,
        _ => 0.0,
    }
}

#[inline(always)]
pub(crate) fn read_component_as_i64(bytes: &[u8], index: usize, component_type: u32) -> i64 {
    let b = component_bytes(component_type);
    let o = index * b;
    match component_type {
        CT_I8 => (bytes[o] as i8) as i64,
        CT_U8 => bytes[o] as i64,
        CT_I16 => read_i16_le(bytes, o) as i64,
        CT_U16 => read_u16_le(bytes, o) as i64,
        CT_I32 => read_i32_le(bytes, o) as i64,
        CT_U32 => read_u32_le(bytes, o) as i64,
        CT_F32 => read_f32_le(bytes, o) as i64,
        _ => 0,
    }
}

#[inline(always)]
pub(crate) fn read_sparse_index(indices: &[u8], i: usize, indices_component_type: u32) -> u32 {
    match indices_component_type {
        CT_U8 => indices[i] as u32,
        CT_U16 => read_u16_le(indices, i * 2) as u32,
        CT_U32 => read_u32_le(indices, i * 4),
        _ => 0,
    }
}

#[inline(always)]
pub(crate) fn js_to_u32(v: f64) -> u32 {
    if !v.is_finite() || v == 0.0 {
        return 0;
    }
    let t = if v < 0.0 { v.ceil() } else { v.floor() };
    let m = t.rem_euclid(4294967296.0);
    m as u32
}

pub(crate) fn component_to_f32(
    bytes: &[u8],
    index: usize,
    component_type: u32,
    normalized: bool,
) -> f32 {
    if !normalized || component_type == CT_F32 {
        return read_component_as_f64(bytes, index, component_type) as f32;
    }
    let bits = component_bits(component_type);
    if component_signed(component_type) {
        let v = read_component_as_i64(bytes, index, component_type);
        let max_pos = (1i64 << (bits - 1)) - 1i64;
        let min_neg = -(1i64 << (bits - 1));
        if v == min_neg {
            -1.0
        } else {
            ((v as f64) / (max_pos as f64)).clamp(-1.0, 1.0) as f32
        }
    } else {
        let v = read_component_as_f64(bytes, index, component_type);
        let max = ((1u64 << bits) - 1u64) as f64;
        (v / max) as f32
    }
}

pub(crate) fn component_to_u16(bytes: &[u8], index: usize, component_type: u32) -> u16 {
    let v = read_component_as_f64(bytes, index, component_type);
    if v < 0.0 {
        0
    } else if v > 65535.0 {
        65535
    } else {
        (v as i64) as u16
    }
}

pub(crate) fn deinterleave(
    out: &mut [u8],
    src: &[u8],
    count: usize,
    num_components: usize,
    component_bytes_size: usize,
    byte_stride: usize,
) -> bool {
    if count == 0 || num_components == 0 || component_bytes_size == 0 {
        return false;
    }
    let elem_bytes = match num_components.checked_mul(component_bytes_size) {
        Some(v) => v,
        None => return false,
    };
    if byte_stride < elem_bytes {
        return false;
    }
    let src_len = match (count - 1)
        .checked_mul(byte_stride)
        .and_then(|v| v.checked_add(elem_bytes))
    {
        Some(v) => v,
        None => return false,
    };
    let out_len = match count.checked_mul(elem_bytes) {
        Some(v) => v,
        None => return false,
    };
    if src.len() < src_len || out.len() < out_len {
        return false;
    }
    for i in 0..count {
        let src_base = i * byte_stride;
        let dst_base = i * elem_bytes;
        out[dst_base..dst_base + elem_bytes].copy_from_slice(&src[src_base..src_base + elem_bytes]);
    }
    true
}

#[no_mangle]
pub extern "C" fn accessor_deinterleave(
    out_ptr: u32,
    src_ptr: u32,
    count: u32,
    num_components: u32,
    component_bytes_size: u32,
    byte_stride: u32,
) -> u32 {
    unsafe {
        let n = count as usize;
        let comps = num_components as usize;
        let comp_bytes = component_bytes_size as usize;
        let stride = byte_stride as usize;
        if out_ptr == 0 || src_ptr == 0 || comps == 0 || comp_bytes == 0 {
            return 0;
        }
        if n == 0 {
            return 0;
        }
        let elem_bytes = comps * comp_bytes;
        if stride < elem_bytes {
            return 0;
        }
        let src_len = (n - 1) * stride + elem_bytes;
        let out_len = n * elem_bytes;
        let src = u8_slice(src_ptr, src_len);
        let out = u8_slice_mut(out_ptr, out_len);
        deinterleave(out, src, n, comps, comp_bytes, stride);
    }
    0
}

#[no_mangle]
pub extern "C" fn accessor_apply_sparse(
    out_ptr: u32,
    out_component_count: u32,
    component_type: u32,
    num_components: u32,
    indices_ptr: u32,
    indices_component_type: u32,
    values_ptr: u32,
    sparse_count: u32,
) -> u32 {
    unsafe {
        if out_ptr == 0 || indices_ptr == 0 || values_ptr == 0 {
            return 0;
        }
        let comp_bytes = component_bytes(component_type);
        let idx_bytes = component_bytes(indices_component_type);
        let comps = num_components as usize;
        let scount = sparse_count as usize;
        let out_comps = out_component_count as usize;
        if comp_bytes == 0 || idx_bytes == 0 || comps == 0 || scount == 0 || out_comps == 0 {
            return 0;
        }
        let elem_bytes = comps * comp_bytes;
        let out = u8_slice_mut(out_ptr, out_comps * comp_bytes);
        let indices = u8_slice(indices_ptr, scount * idx_bytes);
        let values = u8_slice(values_ptr, scount * elem_bytes);
        for i in 0..scount {
            let dst_index = read_sparse_index(indices, i, indices_component_type) as usize;
            let dst_component_base = dst_index * comps;
            if dst_component_base + comps > out_comps {
                continue;
            }
            let dst_byte_base = dst_component_base * comp_bytes;
            let src_byte_base = i * elem_bytes;
            out[dst_byte_base..dst_byte_base + elem_bytes]
                .copy_from_slice(&values[src_byte_base..src_byte_base + elem_bytes]);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn accessor_convert_to_f32(
    out_ptr: u32,
    src_ptr: u32,
    component_count: u32,
    component_type: u32,
    normalized: u32,
) -> u32 {
    unsafe {
        if out_ptr == 0 || src_ptr == 0 {
            return 0;
        }
        let count = component_count as usize;
        if count == 0 {
            return 0;
        }
        let comp_bytes = component_bytes(component_type);
        if comp_bytes == 0 {
            return 0;
        }
        let src = u8_slice(src_ptr, count * comp_bytes);
        let out = f32_slice_mut(out_ptr, count);
        for i in 0..count {
            out[i] = component_to_f32(src, i, component_type, normalized != 0);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn accessor_convert_to_u16(
    out_ptr: u32,
    src_ptr: u32,
    component_count: u32,
    component_type: u32,
) -> u32 {
    unsafe {
        if out_ptr == 0 || src_ptr == 0 {
            return 0;
        }
        let count = component_count as usize;
        if count == 0 {
            return 0;
        }
        let comp_bytes = component_bytes(component_type);
        if comp_bytes == 0 {
            return 0;
        }
        let src = u8_slice(src_ptr, count * comp_bytes);
        let out = u8_slice_mut(out_ptr, count * 2);
        for i in 0..count {
            let out_value = component_to_u16(src, i, component_type);
            let bytes = out_value.to_le_bytes();
            let base = i * 2;
            out[base] = bytes[0];
            out[base + 1] = bytes[1];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn accessor_convert_to_u32(
    out_ptr: u32,
    src_ptr: u32,
    component_count: u32,
    component_type: u32,
) -> u32 {
    unsafe {
        if out_ptr == 0 || src_ptr == 0 {
            return 0;
        }
        let count = component_count as usize;
        if count == 0 {
            return 0;
        }
        let comp_bytes = component_bytes(component_type);
        if comp_bytes == 0 {
            return 0;
        }
        let src = u8_slice(src_ptr, count * comp_bytes);
        let out = u8_slice_mut(out_ptr, count * 4);
        for i in 0..count {
            let v = read_component_as_f64(src, i, component_type);
            let out_value = js_to_u32(v);
            let bytes = out_value.to_le_bytes();
            let base = i * 4;
            out[base] = bytes[0];
            out[base + 1] = bytes[1];
            out[base + 2] = bytes[2];
            out[base + 3] = bytes[3];
        }
    }
    0
}

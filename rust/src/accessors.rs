/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice_mut, u8_slice, u8_slice_mut, with_driver_call};

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

pub(crate) fn compact(
    out: &mut [u8],
    src: &[u8],
    count: usize,
    rows: usize,
    columns: usize,
    component_bytes_size: usize,
    column_stride: usize,
    element_stride: usize,
) -> bool {
    if count == 0 || rows == 0 || columns == 0 || component_bytes_size == 0 {
        return false;
    }
    let logical_column_bytes = match rows.checked_mul(component_bytes_size) {
        Some(v) => v,
        None => return false,
    };
    if column_stride < logical_column_bytes {
        return false;
    }
    let natural_element_stride = match column_stride.checked_mul(columns) {
        Some(v) => v,
        None => return false,
    };
    if element_stride < natural_element_stride {
        return false;
    }
    let logical_element_bytes = match logical_column_bytes.checked_mul(columns) {
        Some(v) => v,
        None => return false,
    };
    let final_column_offset = match column_stride.checked_mul(columns - 1) {
        Some(v) => v,
        None => return false,
    };
    let final_source_end = match (count - 1)
        .checked_mul(element_stride)
        .and_then(|v| v.checked_add(final_column_offset))
        .and_then(|v| v.checked_add(logical_column_bytes))
    {
        Some(v) => v,
        None => return false,
    };
    let output_len = match count.checked_mul(logical_element_bytes) {
        Some(v) => v,
        None => return false,
    };
    if src.len() < final_source_end || out.len() < output_len {
        return false;
    }
    for element in 0..count {
        let src_element = element * element_stride;
        let dst_element = element * logical_element_bytes;
        for column in 0..columns {
            let src_column = src_element + column * column_stride;
            let dst_column = dst_element + column * logical_column_bytes;
            out[dst_column..dst_column + logical_column_bytes]
                .copy_from_slice(&src[src_column..src_column + logical_column_bytes]);
        }
    }
    true
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn accessor_deinterleave(
    out_ptr: u32,
    src_ptr: u32,
    count: u32,
    num_components: u32,
    component_bytes_size: u32,
    byte_stride: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
        let n = count as usize;
        let encoded_components = num_components;
        let matrix = encoded_components & 0x8000_0000 != 0;
        let logical_components = (encoded_components & 0x7fff_ffff) as usize;
        let (rows, columns) = if matrix {
            let side = (logical_components as f64).sqrt() as usize;
            (side, side)
        } else {
            (logical_components, 1)
        };
        let comp_bytes = component_bytes_size as usize;
        let stride = byte_stride as usize;
        if out_ptr == 0
            || src_ptr == 0
            || logical_components == 0
            || comp_bytes == 0
            || rows == 0
            || columns == 0
            || rows.checked_mul(columns) != Some(logical_components)
        {
            return 0;
        }
        if n == 0 {
            return 0;
        }
        let logical_column_bytes = match rows.checked_mul(comp_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let column_stride = if matrix && comp_bytes < 4 {
            match logical_column_bytes.checked_add(3) {
                Some(v) => v & !3,
                None => return 0,
            }
        } else {
            logical_column_bytes
        };
        let logical_element_bytes = match logical_column_bytes.checked_mul(columns) {
            Some(v) => v,
            None => return 0,
        };
        let final_column_offset = match (columns - 1).checked_mul(column_stride) {
            Some(v) => v,
            None => return 0,
        };
        let src_len = match (n - 1)
            .checked_mul(stride)
            .and_then(|v| v.checked_add(final_column_offset))
            .and_then(|v| v.checked_add(logical_column_bytes))
        {
            Some(v) => v,
            None => return 0,
        };
        let out_len = match n.checked_mul(logical_element_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let src = u8_slice(call, src_ptr, src_len);
        let out = u8_slice_mut(call, out_ptr, out_len);
        if matrix {
            compact(
                out,
                src,
                n,
                rows,
                columns,
                comp_bytes,
                column_stride,
                stride,
            );
        } else {
            deinterleave(out, src, n, logical_components, comp_bytes, stride);
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn accessor_apply_sparse(
    out_ptr: u32,
    out_component_count: u32,
    component_type: u32,
    num_components: u32,
    indices_ptr: u32,
    indices_component_type: u32,
    values_ptr: u32,
    sparse_count: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
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
        let elem_bytes = match comps.checked_mul(comp_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let out_bytes = match out_comps.checked_mul(comp_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let indices_bytes = match scount.checked_mul(idx_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let values_bytes = match scount.checked_mul(elem_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let out = u8_slice_mut(call, out_ptr, out_bytes);
        let indices = u8_slice(call, indices_ptr, indices_bytes);
        let values = u8_slice(call, values_ptr, values_bytes);
        for i in 0..scount {
            let dst_index = read_sparse_index(indices, i, indices_component_type) as usize;
            let dst_component_base = match dst_index.checked_mul(comps) {
                Some(v) => v,
                None => continue,
            };
            let dst_component_end = match dst_component_base.checked_add(comps) {
                Some(v) => v,
                None => continue,
            };
            if dst_component_end > out_comps {
                continue;
            }
            let dst_byte_base = match dst_component_base.checked_mul(comp_bytes) {
                Some(v) => v,
                None => continue,
            };
            let src_byte_base = match i.checked_mul(elem_bytes) {
                Some(v) => v,
                None => continue,
            };
            let dst_byte_end = match dst_byte_base.checked_add(elem_bytes) {
                Some(v) => v,
                None => continue,
            };
            let src_byte_end = match src_byte_base.checked_add(elem_bytes) {
                Some(v) => v,
                None => continue,
            };
            out[dst_byte_base..dst_byte_end].copy_from_slice(&values[src_byte_base..src_byte_end]);
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn accessor_convert_to_f32(
    out_ptr: u32,
    src_ptr: u32,
    component_count: u32,
    component_type: u32,
    normalized: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
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
        let src_len = match count.checked_mul(comp_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let src = u8_slice(call, src_ptr, src_len);
        let out = f32_slice_mut(call, out_ptr, count);
        for (i, value) in out.iter_mut().enumerate() {
            *value = component_to_f32(src, i, component_type, normalized != 0);
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn accessor_convert_to_u16(
    out_ptr: u32,
    src_ptr: u32,
    component_count: u32,
    component_type: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
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
        let src_len = match count.checked_mul(comp_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let out_len = match count.checked_mul(2) {
            Some(v) => v,
            None => return 0,
        };
        let src = u8_slice(call, src_ptr, src_len);
        let out = u8_slice_mut(call, out_ptr, out_len);
        for i in 0..count {
            let out_value = component_to_u16(src, i, component_type);
            let bytes = out_value.to_le_bytes();
            let base = i * 2;
            out[base] = bytes[0];
            out[base + 1] = bytes[1];
        }
        0
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn accessor_convert_to_u32(
    out_ptr: u32,
    src_ptr: u32,
    component_count: u32,
    component_type: u32,
) -> u32 {
    with_driver_call(|call| unsafe {
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
        let src_len = match count.checked_mul(comp_bytes) {
            Some(v) => v,
            None => return 0,
        };
        let out_len = match count.checked_mul(4) {
            Some(v) => v,
            None => return 0,
        };
        let src = u8_slice(call, src_ptr, src_len);
        let out = u8_slice_mut(call, out_ptr, out_len);
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
        0
    })
}

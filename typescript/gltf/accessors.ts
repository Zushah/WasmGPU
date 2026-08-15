/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { GltfAccessor, GltfAccessorComponentType, GltfAccessorType, GltfBuffer, GltfBufferView, GltfID, GltfRoot, GltfDocument } from "./types";
import { accessorf, wasm } from "../wasm";

export type GltfTypedArray = | Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;

type GltfTypedArrayCtor = {
    new (buffer: ArrayBuffer, byteOffset: number, length: number): GltfTypedArray;
};

export type AccessorView = {
    accessor: GltfAccessor;
    componentType: GltfAccessorComponentType;
    type: GltfAccessorType;
    count: number;
    numComponents: number;
    normalized: boolean;
    array: GltfTypedArray;
};

export type GltfAccessorLayout = {
    rows: number;
    columns: number;
    logicalComponentCount: number;
    componentByteSize: number;
    logicalByteSize: number;
    columnStride: number;
    physicalElementStride: number;
    elementStride: number;
    finalElementLogicalEnd: number;
    compact: boolean;
};

const COMPONENT_INFO: Record<number, { bytes: number; ctor: GltfTypedArrayCtor; signed: boolean; bits: number }> = {
    5120: { bytes: 1, ctor: Int8Array, signed: true, bits: 8 },
    5121: { bytes: 1, ctor: Uint8Array, signed: false, bits: 8 },
    5122: { bytes: 2, ctor: Int16Array, signed: true, bits: 16 },
    5123: { bytes: 2, ctor: Uint16Array, signed: false, bits: 16 },
    5124: { bytes: 4, ctor: Int32Array, signed: true, bits: 32 },
    5125: { bytes: 4, ctor: Uint32Array, signed: false, bits: 32 },
    5126: { bytes: 4, ctor: Float32Array, signed: true, bits: 32 },
};

export const gltfNumComponents = (type: GltfAccessorType): number => {
    switch (type) {
        case "SCALAR":
            return 1;
        case "VEC2":
            return 2;
        case "VEC3":
            return 3;
        case "VEC4":
            return 4;
        case "MAT2":
            return 4;
        case "MAT3":
            return 9;
        case "MAT4":
            return 16;
        default:
            throw new Error(`Unsupported accessor type: ${String(type)}`);
    }
};

const getAccessor = (json: GltfRoot, index: number): GltfAccessor => {
    const a = json.accessors?.[index];
    if (!a) throw new Error(`Invalid accessor index: ${index}`);
    return a;
};

const getBufferView = (json: GltfRoot, index: number): GltfBufferView => {
    const bv = json.bufferViews?.[index];
    if (!bv) throw new Error(`Invalid bufferView index: ${index}`);
    return bv;
};

const roundUp4 = (value: number): number => Math.ceil(value / 4) * 4;

const requireSafeNonNegativeInteger = (value: number, context: string): number => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${context} must be a non-negative safe integer, got ${String(value)}.`);
    return value;
};

const checkedMultiply = (left: number, right: number, context: string): number => {
    const result = left * right;
    if (!Number.isSafeInteger(result)) throw new Error(`${context} is too large.`);
    return result;
};

const checkedAdd = (left: number, right: number, context: string): number => {
    const result = left + right;
    if (!Number.isSafeInteger(result)) throw new Error(`${context} is too large.`);
    return result;
};

export const getAccessorLayout = (type: GltfAccessorType, componentByteSize: number, byteStride?: number): GltfAccessorLayout => {
    if (!Number.isSafeInteger(componentByteSize) || componentByteSize <= 0) throw new Error(`Invalid accessor component byte size: ${componentByteSize}`);
    const logicalComponentCount = gltfNumComponents(type);
    const isMatrix = type === "MAT2" || type === "MAT3" || type === "MAT4";
    const rows = isMatrix ? Math.sqrt(logicalComponentCount) : logicalComponentCount;
    const columns = isMatrix ? rows : 1;
    const logicalByteSize = checkedMultiply(logicalComponentCount, componentByteSize, "Accessor logical byte size");
    const logicalColumnByteSize = checkedMultiply(rows, componentByteSize, "Accessor logical column byte size");
    const columnStride = isMatrix ? (componentByteSize < 4 ? roundUp4(logicalColumnByteSize) : logicalColumnByteSize) : logicalColumnByteSize;
    const physicalElementStride = checkedMultiply(columnStride, columns, "Accessor physical element stride");
    const elementStride = byteStride === undefined ? physicalElementStride : requireSafeNonNegativeInteger(byteStride, "Accessor byteStride");
    if (!Number.isSafeInteger(elementStride) || elementStride < physicalElementStride) {
        throw new Error(`Invalid accessor byteStride (${elementStride}) < physical element stride (${physicalElementStride})`);
    }
    const finalElementLogicalEnd = checkedAdd(checkedMultiply(columns - 1, columnStride, "Accessor final column offset"), logicalColumnByteSize, "Accessor final element logical end");
    return {
        rows,
        columns,
        logicalComponentCount,
        componentByteSize,
        logicalByteSize,
        columnStride,
        physicalElementStride,
        elementStride,
        finalElementLogicalEnd,
        compact: columnStride === logicalColumnByteSize && elementStride === logicalByteSize
    };
};

const accessorSourceByteLength = (layout: GltfAccessorLayout, count: number): number => {
    if (count <= 0) return 0;
    return checkedAdd(checkedMultiply(count - 1, layout.elementStride, "Accessor source byte length"), layout.finalElementLogicalEnd, "Accessor source byte length");
};

const validateAccessorSource = (buffer: ArrayBuffer, bufferLength: number, bufferView: GltfBufferView, accessorOffset: number, sourceByteLength: number, context: string): number => {
    const viewOffset = bufferView.byteOffset ?? 0;
    const viewLength = bufferView.byteLength;
    if (!Number.isSafeInteger(viewOffset) || viewOffset < 0 || !Number.isSafeInteger(viewLength) || viewLength < 0 || !Number.isSafeInteger(accessorOffset) || accessorOffset < 0) {
        throw new Error(`${context}: invalid bufferView/accessor byte offset or length.`);
    }
    requireSafeNonNegativeInteger(sourceByteLength, `${context} source byte length`);
    const relativeEnd = checkedAdd(accessorOffset, sourceByteLength, `${context} bufferView range`);
    if (relativeEnd > viewLength) throw new Error(`${context}: accessor data exceeds bufferView.byteLength (${relativeEnd} > ${viewLength}).`);
    const start = checkedAdd(viewOffset, accessorOffset, `${context} buffer offset`);
    const bufferEnd = checkedAdd(start, sourceByteLength, `${context} buffer range`);
    if (bufferEnd > bufferLength) throw new Error(`${context}: accessor data exceeds its buffer.`);
    return start;
};

const copyBytesToWasm = (buffer: ArrayBuffer, byteOffset: number, byteLength: number): number => {
    const ptr = wasm.allocBytes(byteLength);
    if (!ptr && byteLength !== 0) throw new Error("WebAssembly allocation failed while decoding an accessor.");
    try {
        const src = new Uint8Array(buffer, byteOffset, byteLength);
        wasm.u8view(ptr, byteLength).set(src);
        return ptr;
    } catch (error) {
        if (ptr) wasm.freeBytes(ptr, byteLength);
        throw error;
    }
};

const getBufferWithDeclaredLength = (json: GltfRoot, buffers: ArrayBuffer[], index: number, context: string): { definition: GltfBuffer; data: ArrayBuffer; length: number } => {
    const definition = json.buffers?.[index];
    if (!definition) throw new Error(`${context}: missing buffer[${index}] definition.`);
    const data = buffers[index];
    if (!data) throw new Error(`${context}: missing buffer[${index}] data.`);
    const length = requireSafeNonNegativeInteger(definition.byteLength, `${context} buffer[${index}].byteLength`);
    if (data.byteLength < length) throw new Error(`${context}: buffer[${index}] contains ${data.byteLength} bytes, but ${length} were declared.`);
    return { definition, data, length };
};

const copyBytesFromWasm = (ptr: number, byteLength: number): Uint8Array => {
    if (!ptr && byteLength !== 0) throw new Error("WebAssembly accessor output allocation failed.");
    const out = new Uint8Array(byteLength);
    out.set(wasm.u8view(ptr, byteLength));
    return out;
};

export const readAccessor = (doc: GltfDocument, accessorIndex: number): AccessorView => {
    const json = doc.json;
    const accessor = getAccessor(json, accessorIndex);
    const componentType = accessor.componentType;
    const info = COMPONENT_INFO[componentType];
    if (!info) throw new Error(`Unsupported accessor componentType: ${componentType}`);
    const count = requireSafeNonNegativeInteger(accessor.count, `accessor[${accessorIndex}].count`);
    const type = accessor.type;
    const numComps = gltfNumComponents(type);
    const normalized = accessor.normalized === true;
    const context = `accessor[${accessorIndex}]`;
    let base: GltfTypedArray;
    const outputComponentCount = checkedMultiply(count, numComps, `${context} component count`);
    const outputByteLength = checkedMultiply(outputComponentCount, info.bytes, `${context} output byte length`);
    if (accessor.bufferView === undefined) {
        if (accessor.byteOffset !== undefined) throw new Error(`${context}: byteOffset requires bufferView.`);
        base = new info.ctor(new ArrayBuffer(outputByteLength), 0, outputComponentCount);
    }
    else {
        const bv = getBufferView(json, accessor.bufferView);
        if ((bv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"] && json.extensionsRequired?.includes("EXT_meshopt_compression")) throw new Error("Required EXT_meshopt_compression must be handled by glTF import preflight.");
        const bufferInfo = getBufferWithDeclaredLength(json, doc.buffers, bv.buffer, context);
        const buffer = bufferInfo.data;
        requireSafeNonNegativeInteger(bv.byteOffset ?? 0, `${context} bufferView.byteOffset`);
        const accOffset = requireSafeNonNegativeInteger(accessor.byteOffset ?? 0, `${context}.byteOffset`);
        const layout = getAccessorLayout(type, info.bytes, bv.byteStride);
        const sourceByteLength = accessorSourceByteLength(layout, count);
        const start = validateAccessorSource(buffer, bufferInfo.length, bv, accOffset, sourceByteLength, context);
        const isAligned = (start % info.bytes) === 0;
        if (count === 0) base = new info.ctor(new ArrayBuffer(0), 0, 0);
        else if (layout.compact && isAligned) base = new info.ctor(buffer, start, outputComponentCount);
        else {
            const compactByteLength = checkedMultiply(count, layout.logicalByteSize, `${context} compact byte length`);
            const srcPtr = copyBytesToWasm(buffer, start, sourceByteLength);
            let outPtr = 0;
            try {
                outPtr = wasm.allocBytes(compactByteLength);
                if (!outPtr && compactByteLength !== 0) throw new Error(`${context}: WebAssembly allocation failed.`);
                accessorf.compact(outPtr, srcPtr, count, layout.rows, layout.columns, info.bytes, layout.elementStride);
                const outBytes = copyBytesFromWasm(outPtr, compactByteLength);
                const outBuffer = new ArrayBuffer(compactByteLength);
                new Uint8Array(outBuffer).set(outBytes);
                base = new info.ctor(outBuffer, 0, outputComponentCount);
            } finally {
                if (outPtr) wasm.freeBytes(outPtr, compactByteLength);
                if (srcPtr) wasm.freeBytes(srcPtr, sourceByteLength);
            }
        }
    }
    if (accessor.sparse) {
        const out = base.slice() as GltfTypedArray;
        applySparse(doc, accessor, out, componentType, numComps);
        base = out;
    }
    return { accessor, componentType, type, count, numComponents: numComps, normalized, array: base };
};

const applySparse = (doc: GltfDocument, accessor: GltfAccessor, out: GltfTypedArray, componentType: GltfAccessorComponentType, numComps: number): void => {
    const sparse = accessor.sparse!;
    const count = requireSafeNonNegativeInteger(accessor.count, "Sparse accessor count");
    const scount = requireSafeNonNegativeInteger(sparse.count, "Sparse accessor count");
    if (scount > count) throw new Error(`Sparse accessor count ${scount} exceeds accessor count ${count}.`);
    if (scount <= 0) return;
    const idxBv = getBufferView(doc.json, sparse.indices.bufferView);
    if ((idxBv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"] && doc.json.extensionsRequired?.includes("EXT_meshopt_compression")) throw new Error("Required EXT_meshopt_compression sparse indices must be handled by glTF import preflight.");
    const idxBufferInfo = getBufferWithDeclaredLength(doc.json, doc.buffers, idxBv.buffer, "sparse indices");
    const idxBuf = idxBufferInfo.data;
    const idxComponent = sparse.indices.componentType;
    if (idxComponent !== 5121 && idxComponent !== 5123 && idxComponent !== 5125) throw new Error(`Unsupported sparse indices componentType: ${idxComponent}`);
    const idxInfo = COMPONENT_INFO[idxComponent];
    if (!idxInfo) throw new Error(`Unsupported sparse indices componentType: ${idxComponent}`);
    const idxStride = idxInfo.bytes;
    if (idxBv.byteStride !== undefined && idxBv.byteStride !== idxStride) throw new Error("Sparse indices must be tightly packed.");
    const idxByteLength = checkedMultiply(scount, idxStride, "Sparse index byte length");
    const idxStart = validateAccessorSource(idxBuf, idxBufferInfo.length, idxBv, sparse.indices.byteOffset ?? 0, idxByteLength, "sparse indices");
    const idxView = new DataView(idxBuf, idxStart, idxByteLength);
    let previousIndex = -1;
    for (let i = 0; i < scount; i++) {
        const index = idxComponent === 5121 ? idxView.getUint8(i) : idxComponent === 5123 ? idxView.getUint16(i * 2, true) : idxView.getUint32(i * 4, true);
        if (index >= count) throw new Error(`Sparse index ${index} at ${i} is out of range for accessor count ${count}.`);
        if (index <= previousIndex) throw new Error(`Sparse indices must be strictly increasing (index ${index} at ${i}).`);
        previousIndex = index;
    }
    const valBv = getBufferView(doc.json, sparse.values.bufferView);
    if ((valBv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"] && doc.json.extensionsRequired?.includes("EXT_meshopt_compression")) throw new Error("Required EXT_meshopt_compression sparse values must be handled by glTF import preflight.");
    const valueBufferInfo = getBufferWithDeclaredLength(doc.json, doc.buffers, valBv.buffer, "sparse values");
    const valBuf = valueBufferInfo.data;
    const valOffset = sparse.values.byteOffset ?? 0;
    const compInfo = COMPONENT_INFO[componentType];
    if (!compInfo) throw new Error(`Unsupported sparse values componentType: ${componentType}`);
    const componentCount = out.length;
    const componentBytes = compInfo.bytes;
    const outByteLength = checkedMultiply(componentCount, componentBytes, "Sparse accessor output byte length");
    const valuesByteLength = checkedMultiply(checkedMultiply(scount, numComps, "Sparse values component count"), componentBytes, "Sparse values byte length");
    const outPtr = wasm.allocBytes(outByteLength);
    if (!outPtr && outByteLength !== 0) throw new Error("sparse accessor: WebAssembly allocation failed.");
    let idxPtr = 0;
    let valuesPtr = 0;
    let valuesSrcPtr = 0;
    let valuesSourceLength = 0;
    try {
        wasm.u8view(outPtr, outByteLength).set(new Uint8Array(out.buffer, out.byteOffset, outByteLength));
        idxPtr = copyBytesToWasm(idxBuf, idxStart, idxByteLength);
        if (!idxPtr && idxByteLength !== 0) throw new Error("sparse indices: WebAssembly allocation failed.");
        const valueLayout = getAccessorLayout(accessor.type, componentBytes, valBv.byteStride);
        valuesSourceLength = accessorSourceByteLength(valueLayout, scount);
        const valuesStart = validateAccessorSource(valBuf, valueBufferInfo.length, valBv, valOffset, valuesSourceLength, "sparse values");
        valuesPtr = wasm.allocBytes(valuesByteLength);
        if (!valuesPtr && valuesByteLength !== 0) throw new Error("sparse values: WebAssembly allocation failed.");
        valuesSrcPtr = copyBytesToWasm(valBuf, valuesStart, valuesSourceLength);
        if (!valuesSrcPtr && valuesSourceLength !== 0) throw new Error("sparse values source: WebAssembly allocation failed.");
        if (valueLayout.compact) wasm.u8view(valuesPtr, valuesByteLength).set(new Uint8Array(valBuf, valuesStart, valuesByteLength));
        else accessorf.compact(valuesPtr, valuesSrcPtr, scount, valueLayout.rows, valueLayout.columns, componentBytes, valueLayout.elementStride);
        accessorf.applySparse(outPtr, componentCount, componentType, numComps, idxPtr, idxComponent, valuesPtr, scount);
        const outBytes = wasm.u8view(outPtr, outByteLength);
        new Uint8Array(out.buffer, out.byteOffset, outByteLength).set(outBytes);
    } finally {
        if (valuesSrcPtr) wasm.freeBytes(valuesSrcPtr, valuesSourceLength);
        if (valuesPtr) wasm.freeBytes(valuesPtr, valuesByteLength);
        if (idxPtr) wasm.freeBytes(idxPtr, idxByteLength);
        if (outPtr) wasm.freeBytes(outPtr, outByteLength);
    }
};

export const readAccessorAsFloat32 = (doc: GltfDocument, accessorIndex: number): Float32Array => {
    const view = readAccessor(doc, accessorIndex);
    const info = COMPONENT_INFO[view.componentType];
    if (!info) throw new Error(`Unsupported componentType: ${view.componentType}`);
    if (view.componentType === 5126 && !view.normalized) return view.array as Float32Array;
    if (view.array.length === 0) return new Float32Array(0);
    const srcByteLength = checkedMultiply(view.array.length, info.bytes, "Accessor conversion source byte length");
    const sourceArray = view.array.buffer as ArrayBuffer;
    const sourceOffset = view.array.byteOffset;
    const srcPtr = copyBytesToWasm(sourceArray, sourceOffset, srcByteLength);
    const outPtr = wasm.allocF32(view.array.length);
    if (!outPtr) { wasm.freeBytes(srcPtr, srcByteLength); throw new Error("WebAssembly allocation failed while converting an accessor to Float32Array."); }
    try {
        accessorf.convertToF32(outPtr, srcPtr, view.array.length, view.componentType, view.normalized);
        const out = new Float32Array(view.array.length);
        out.set(wasm.f32view(outPtr, view.array.length));
        return out;
    } finally {
        wasm.freeF32(outPtr, view.array.length);
        wasm.freeBytes(srcPtr, srcByteLength);
    }
};

export const readAccessorAsUint16 = (doc: GltfDocument, accessorIndex: number): Uint16Array => {
    const view = readAccessor(doc, accessorIndex);
    const ct = view.componentType;
    const info = COMPONENT_INFO[ct];
    if (!info) throw new Error(`Unsupported componentType: ${ct}`);
    if (ct === 5123 && !view.normalized) return view.array as Uint16Array;
    if (view.array.length === 0) return new Uint16Array(0);
    const srcByteLength = checkedMultiply(view.array.length, info.bytes, "Accessor conversion source byte length");
    const sourceArray = view.array.buffer as ArrayBuffer;
    const sourceOffset = view.array.byteOffset;
    const srcPtr = copyBytesToWasm(sourceArray, sourceOffset, srcByteLength);
    const outByteLength = checkedMultiply(view.array.length, 2, "Accessor Uint16 output byte length");
    const outPtr = wasm.allocBytes(outByteLength);
    if (!outPtr) { wasm.freeBytes(srcPtr, srcByteLength); throw new Error("WebAssembly allocation failed while converting an accessor to Uint16Array."); }
    try {
        accessorf.convertToU16(outPtr, srcPtr, view.array.length, ct);
        const out = new Uint16Array(view.array.length);
        new Uint8Array(out.buffer).set(wasm.u8view(outPtr, outByteLength));
        return out;
    } finally {
        wasm.freeBytes(outPtr, outByteLength);
        wasm.freeBytes(srcPtr, srcByteLength);
    }
};

export const readIndicesAsUint32 = (doc: GltfDocument, accessorIndex: number): Uint32Array => {
    const view = readAccessor(doc, accessorIndex);
    const ct = view.componentType;
    const info = COMPONENT_INFO[ct];
    if (!info) throw new Error(`Unsupported componentType: ${ct}`);
    if (ct === 5125 && !view.normalized) return view.array as Uint32Array;
    if (view.array.length === 0) return new Uint32Array(0);
    const srcByteLength = checkedMultiply(view.array.length, info.bytes, "Index conversion source byte length");
    const sourceArray = view.array.buffer as ArrayBuffer;
    const sourceOffset = view.array.byteOffset;
    const srcPtr = copyBytesToWasm(sourceArray, sourceOffset, srcByteLength);
    const outByteLength = checkedMultiply(view.array.length, 4, "Index Uint32 output byte length");
    const outPtr = wasm.allocBytes(outByteLength);
    if (!outPtr) { wasm.freeBytes(srcPtr, srcByteLength); throw new Error("WebAssembly allocation failed while converting indices to Uint32Array."); }
    try {
        accessorf.convertToU32(outPtr, srcPtr, view.array.length, ct);
        const out = new Uint32Array(view.array.length);
        new Uint8Array(out.buffer).set(wasm.u8view(outPtr, outByteLength));
        return out;
    } finally {
        wasm.freeBytes(outPtr, outByteLength);
        wasm.freeBytes(srcPtr, srcByteLength);
    }
};

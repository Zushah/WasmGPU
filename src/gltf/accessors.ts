/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { GltfAccessor, GltfAccessorComponentType, GltfAccessorType, GltfBufferView, GltfID, GltfRoot, GltfDocument } from "./types";
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
            return 1;
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

const copyBytesToWasm = (buffer: ArrayBuffer, byteOffset: number, byteLength: number): number => {
    const ptr = wasm.allocBytes(byteLength);
    const src = new Uint8Array(buffer, byteOffset, byteLength);
    wasm.u8view(ptr, byteLength).set(src);
    return ptr;
};

const copyBytesFromWasm = (ptr: number, byteLength: number): Uint8Array => {
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
    const count = accessor.count | 0;
    const type = accessor.type;
    const numComps = gltfNumComponents(type);
    const normalized = accessor.normalized === true;
    const elemByteSize = info.bytes * numComps;
    let base: GltfTypedArray;
    if (accessor.bufferView === undefined) base = new info.ctor(new ArrayBuffer(count * numComps * info.bytes), 0, count * numComps);
    else {
        const bv = getBufferView(json, accessor.bufferView);
        if ((bv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"] && json.extensionsRequired?.includes("EXT_meshopt_compression")) throw new Error("Required EXT_meshopt_compression must be handled by glTF import preflight.");
        const buffer = doc.buffers[bv.buffer];
        if (!buffer) throw new Error(`Missing buffer[${bv.buffer}]`);
        const bvOffset = (bv.byteOffset ?? 0) | 0;
        const accOffset = (accessor.byteOffset ?? 0) | 0;
        const start = bvOffset + accOffset;
        const byteStride = bv.byteStride ?? elemByteSize;
        if (byteStride < elemByteSize) throw new Error(`Invalid bufferView.byteStride (${byteStride}) < element byte size (${elemByteSize})`);
        const isTight = byteStride === elemByteSize;
        const isAligned = (start % info.bytes) === 0;
        if (isTight && isAligned) base = new info.ctor(buffer, start, count * numComps);
        else {
            if (count <= 0) base = new info.ctor(new ArrayBuffer(0), 0, 0);
            else {
                const elemByteSize = info.bytes * numComps;
                const srcByteLength = ((count - 1) * byteStride) + elemByteSize;
                const srcPtr = copyBytesToWasm(buffer, start, srcByteLength);
                const outByteLength = count * elemByteSize;
                const outPtr = wasm.allocBytes(outByteLength);
                try {
                    accessorf.deinterleave(outPtr, srcPtr, count, numComps, info.bytes, byteStride);
                    const outBytes = copyBytesFromWasm(outPtr, outByteLength);
                    const outBuffer = new ArrayBuffer(outByteLength);
                    new Uint8Array(outBuffer).set(outBytes);
                    base = new info.ctor(outBuffer, 0, count * numComps);
                } finally {
                    wasm.freeBytes(outPtr, outByteLength);
                    wasm.freeBytes(srcPtr, srcByteLength);
                }
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
    const scount = sparse.count | 0;
    if (scount <= 0) return;
    const idxBv = getBufferView(doc.json, sparse.indices.bufferView);
    if ((idxBv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"] && doc.json.extensionsRequired?.includes("EXT_meshopt_compression")) throw new Error("Required EXT_meshopt_compression sparse indices must be handled by glTF import preflight.");
    const idxBuf = doc.buffers[idxBv.buffer];
    if (!idxBuf) throw new Error(`Missing buffer[${idxBv.buffer}] for sparse indices`);
    const idxOffset = (idxBv.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0);
    const idxComponent = sparse.indices.componentType;
    const idxInfo = COMPONENT_INFO[idxComponent];
    if (!idxInfo) throw new Error(`Unsupported sparse indices componentType: ${idxComponent}`);
    const idxStride = idxInfo.bytes;
    const valBv = getBufferView(doc.json, sparse.values.bufferView);
    if ((valBv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"] && doc.json.extensionsRequired?.includes("EXT_meshopt_compression")) throw new Error("Required EXT_meshopt_compression sparse values must be handled by glTF import preflight.");
    const valBuf = doc.buffers[valBv.buffer];
    if (!valBuf) throw new Error(`Missing buffer[${valBv.buffer}] for sparse values`);
    const valOffset = (valBv.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
    const compInfo = COMPONENT_INFO[componentType];
    if (!compInfo) throw new Error(`Unsupported sparse values componentType: ${componentType}`);
    const componentCount = out.length;
    const componentBytes = compInfo.bytes;
    const outByteLength = componentCount * componentBytes;
    const outPtr = wasm.allocBytes(outByteLength);
    wasm.u8view(outPtr, outByteLength).set(new Uint8Array(out.buffer, out.byteOffset, outByteLength));
    const idxByteLength = scount * idxStride;
    const idxPtr = copyBytesToWasm(idxBuf, idxOffset, idxByteLength);
    const valuesByteLength = scount * numComps * componentBytes;
    const valuesPtr = copyBytesToWasm(valBuf, valOffset, valuesByteLength);
    try {
        accessorf.applySparse(outPtr, componentCount, componentType, numComps, idxPtr, idxComponent, valuesPtr, scount);
        const outBytes = wasm.u8view(outPtr, outByteLength);
        new Uint8Array(out.buffer, out.byteOffset, outByteLength).set(outBytes);
    } finally {
        wasm.freeBytes(valuesPtr, valuesByteLength);
        wasm.freeBytes(idxPtr, idxByteLength);
        wasm.freeBytes(outPtr, outByteLength);
    }
};

export const readAccessorAsFloat32 = (doc: GltfDocument, accessorIndex: number): Float32Array => {
    const view = readAccessor(doc, accessorIndex);
    const info = COMPONENT_INFO[view.componentType];
    if (!info) throw new Error(`Unsupported componentType: ${view.componentType}`);
    if (view.componentType === 5126 && !view.normalized) return view.array as Float32Array;
    const srcByteLength = view.array.length * info.bytes;
    const srcPtr = wasm.allocBytes(srcByteLength);
    wasm.u8view(srcPtr, srcByteLength).set(new Uint8Array(view.array.buffer, view.array.byteOffset, srcByteLength));
    const outPtr = wasm.allocF32(view.array.length);
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
    const srcByteLength = view.array.length * info.bytes;
    const srcPtr = wasm.allocBytes(srcByteLength);
    wasm.u8view(srcPtr, srcByteLength).set(new Uint8Array(view.array.buffer, view.array.byteOffset, srcByteLength));
    const outByteLength = view.array.length * 2;
    const outPtr = wasm.allocBytes(outByteLength);
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
    const srcByteLength = view.array.length * info.bytes;
    const srcPtr = wasm.allocBytes(srcByteLength);
    wasm.u8view(srcPtr, srcByteLength).set(new Uint8Array(view.array.buffer, view.array.byteOffset, srcByteLength));
    const outByteLength = view.array.length * 4;
    const outPtr = wasm.allocBytes(outByteLength);
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

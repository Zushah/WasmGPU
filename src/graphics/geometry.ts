/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, createBuffer } from "../utils";
import { boundsf, meshf, wasm, WasmMemoryView, assertWasmF32View, assertWasmU16View, assertWasmU32View, assertWasmRecordCount, assertWasmCapacity, resolveWasmRecordCount, validateWasmRecordRange, growWasmCapacity } from "../wasm";

export type GeometryAttribute = {
    data: Float32Array;
    itemSize: number;
};

export type GeometryMorphTargetDescriptor = {
    positions?: Float32Array;
    normals?: Float32Array;
};

export type GeometryDescriptor = {
    positions?: Float32Array;
    normals?: Float32Array;
    tangents?: Float32Array;
    uvs?: Float32Array;
    uvs1?: Float32Array;
    joints?: Uint16Array;
    weights?: Float32Array;
    joints1?: Uint16Array;
    weights1?: Float32Array;
    indices?: Uint32Array;
    wasmPositions?: WasmMemoryView<Float32Array>;
    wasmNormals?: WasmMemoryView<Float32Array>;
    wasmTangents?: WasmMemoryView<Float32Array>;
    wasmUvs?: WasmMemoryView<Float32Array>;
    wasmUvs1?: WasmMemoryView<Float32Array>;
    wasmJoints?: WasmMemoryView<Uint16Array>;
    wasmWeights?: WasmMemoryView<Float32Array>;
    wasmJoints1?: WasmMemoryView<Uint16Array>;
    wasmWeights1?: WasmMemoryView<Float32Array>;
    wasmIndices?: WasmMemoryView<Uint32Array>;
    vertexCount?: number;
    indexCount?: number;
    wasmVertexCapacity?: number;
    wasmIndexCapacity?: number;
    bounds?: GeometryBoundsDescriptor;
    keepCPUData?: boolean;
    morphTargets?: ReadonlyArray<GeometryMorphTargetDescriptor>;
    authoredNormals?: boolean;
};

export type GeometryWasmVertexRefreshOptions = {
    vertexCount?: number;
    keepCPUData?: boolean;
    recomputeBounds?: boolean;
};

export type GeometryWasmIndexRefreshOptions = {
    indexCount?: number;
    keepCPUData?: boolean;
};

export type GeometryWasmAttributeOptions = GeometryWasmVertexRefreshOptions & {
    capacity?: number;
};

export type GeometryWasmIndexOptions = GeometryWasmIndexRefreshOptions & {
    capacity?: number;
};

export type GeometryWasmSources = {
    positions?: WasmMemoryView<Float32Array> | null;
    normals?: WasmMemoryView<Float32Array> | null;
    tangents?: WasmMemoryView<Float32Array> | null;
    uvs?: WasmMemoryView<Float32Array> | null;
    uvs1?: WasmMemoryView<Float32Array> | null;
    joints?: WasmMemoryView<Uint16Array> | null;
    weights?: WasmMemoryView<Float32Array> | null;
    joints1?: WasmMemoryView<Uint16Array> | null;
    weights1?: WasmMemoryView<Float32Array> | null;
    indices?: WasmMemoryView<Uint32Array> | null;
};

export type CartesianCurveDescriptor = {
    f: (x: number) => number;
    xMin?: number;
    xMax?: number;
    segments?: number;
    radius?: number;
    radialSegments?: number;
    closed?: boolean;
    plane?: "xy" | "xz" | "yz";
    up?: [number, number, number];
    breakOnInvalid?: boolean;
};

export type CartesianSurfaceDescriptor = {
    f: (x: number, z: number) => number;
    xMin?: number;
    xMax?: number;
    zMin?: number;
    zMax?: number;
    xSegments?: number;
    zSegments?: number;
    plane?: "xy" | "xz" | "yz";
    skipInvalid?: boolean;
    doubleSided?: boolean;
};

export type ParametricCurveDescriptor = {
    f: (t: number) => [number, number] | [number, number, number];
    tMin?: number;
    tMax?: number;
    segments?: number;
    radius?: number;
    radialSegments?: number;
    closed?: boolean;
    plane?: "xy" | "xz" | "yz";
    up?: [number, number, number];
    breakOnInvalid?: boolean;
};

export type ParametricSurfaceDescriptor = {
    f: (u: number, v: number) => [number, number, number];
    uMin?: number;
    uMax?: number;
    vMin?: number;
    vMax?: number;
    uSegments?: number;
    vSegments?: number;
    plane?: "xy" | "xz" | "yz";
    skipInvalid?: boolean;
    doubleSided?: boolean;
};

export type GeometryBoundsDescriptor = {
    boxMin: [number, number, number];
    boxMax: [number, number, number];
    sphereCenter: [number, number, number];
    sphereRadius: number;
};

type GeometryScratchAllocation = { ptr: number; len: number };

const allocGeometryScratchF32 = (allocations: GeometryScratchAllocation[], len: number, label: string): number => {
    const length = len >>> 0;
    const ptr = wasm.allocF32(length);
    if (!ptr && length !== 0) throw new Error(`${label}: WebAssembly f32 allocation failed (${length} elements).`);
    if (ptr) allocations.push({ ptr, len: length });
    return ptr;
};

const allocGeometryScratchU32 = (allocations: GeometryScratchAllocation[], len: number, label: string): number => {
    const length = len >>> 0;
    const ptr = wasm.allocU32(length);
    if (!ptr && length !== 0) throw new Error(`${label}: WebAssembly u32 allocation failed (${length} elements).`);
    if (ptr) allocations.push({ ptr, len: length });
    return ptr;
};

export const computeGeometryBounds = (positions: Float32Array): GeometryBoundsDescriptor => {
    const vertexCount = Math.floor(positions.length / 3);
    if (vertexCount <= 0) return { boxMin: [0, 0, 0], boxMax: [0, 0, 0], sphereCenter: [0, 0, 0], sphereRadius: 0 };
    const allocations: GeometryScratchAllocation[] = [];
    try {
        const positionsPtr = allocGeometryScratchF32(allocations, positions.length, "computeGeometryBounds.positions");
        const boxMinPtr = allocGeometryScratchF32(allocations, 3, "computeGeometryBounds.boxMin");
        const boxMaxPtr = allocGeometryScratchF32(allocations, 3, "computeGeometryBounds.boxMax");
        const sphereCenterPtr = allocGeometryScratchF32(allocations, 3, "computeGeometryBounds.sphereCenter");
        const sphereRadiusPtr = allocGeometryScratchF32(allocations, 1, "computeGeometryBounds.sphereRadius");
        wasm.f32view(positionsPtr, positions.length).set(positions);
        boundsf.geometryPositions(boxMinPtr, boxMaxPtr, sphereCenterPtr, sphereRadiusPtr, positionsPtr, vertexCount);
        const boxMin = wasm.f32view(boxMinPtr, 3);
        const boxMax = wasm.f32view(boxMaxPtr, 3);
        const sphereCenter = wasm.f32view(sphereCenterPtr, 3);
        const sphereRadius = wasm.f32view(sphereRadiusPtr, 1);
        return {
            boxMin: [boxMin[0], boxMin[1], boxMin[2]],
            boxMax: [boxMax[0], boxMax[1], boxMax[2]],
            sphereCenter: [sphereCenter[0], sphereCenter[1], sphereCenter[2]],
            sphereRadius: sphereRadius[0]
        };
    } finally {
        for (let i = allocations.length - 1; i >= 0; i--) wasm.freeF32(allocations[i]!.ptr, allocations[i]!.len);
    }
};

export const computeGeometryVertexNormals = (positions: Float32Array, indices: Uint32Array | null): Float32Array => {
    const vertexCount = Math.floor(positions.length / 3);
    const idxLen = indices ? indices.length : 0;
    const f32Allocations: GeometryScratchAllocation[] = [];
    const u32Allocations: GeometryScratchAllocation[] = [];
    try {
        const positionsPtr = allocGeometryScratchF32(f32Allocations, positions.length, "computeGeometryVertexNormals.positions");
        const outputPtr = allocGeometryScratchF32(f32Allocations, positions.length, "computeGeometryVertexNormals.output");
        const indicesPtr = idxLen > 0 ? allocGeometryScratchU32(u32Allocations, idxLen, "computeGeometryVertexNormals.indices") : 0;
        wasm.f32view(positionsPtr, positions.length).set(positions);
        if (indices && idxLen > 0) wasm.u32view(indicesPtr, idxLen).set(indices);
        meshf.computeVertexNormals(outputPtr, positionsPtr, vertexCount, indicesPtr, idxLen);
        const out = new Float32Array(positions.length);
        out.set(wasm.f32view(outputPtr, positions.length));
        return out;
    } finally {
        for (let i = u32Allocations.length - 1; i >= 0; i--) wasm.freeU32(u32Allocations[i]!.ptr, u32Allocations[i]!.len);
        for (let i = f32Allocations.length - 1; i >= 0; i--) wasm.freeF32(f32Allocations[i]!.ptr, f32Allocations[i]!.len);
    }
};

const normalizeVec3At = (data: Float32Array, offset: number, fallback: [number, number, number]): [number, number, number] => {
    let x = data[offset + 0] ?? fallback[0], y = data[offset + 1] ?? fallback[1], z = data[offset + 2] ?? fallback[2];
    const len = Math.hypot(x, y, z);
    if (len <= 1e-12) return fallback;
    x /= len; y /= len; z /= len;
    return [x, y, z];
};

const fallbackTangentForNormal = (nx: number, ny: number, nz: number): [number, number, number] => {
    const ax = Math.abs(nx) < 0.9 ? 1 : 0, ay = ax === 1 ? 0 : 1, az = 0;
    let tx = ay * nz - az * ny, ty = az * nx - ax * nz, tz = ax * ny - ay * nx;
    const len = Math.hypot(tx, ty, tz);
    if (len <= 1e-12) return [1, 0, 0];
    tx /= len; ty /= len; tz /= len;
    return [tx, ty, tz];
};

export const computeGeometryTangents = (positions: Float32Array, normals: Float32Array, uvs: Float32Array, indices: Uint32Array | null): Float32Array => {
    const vertexCount = (positions.length / 3) | 0;
    const out = new Float32Array(vertexCount * 4), tan1 = new Float32Array(vertexCount * 3), tan2 = new Float32Array(vertexCount * 3);
    const indexCount = indices ? indices.length : vertexCount;
    const indexAt = (i: number): number => indices ? indices[i]! : i;
    for (let i = 0; i + 2 < indexCount; i += 3) {
        const i0 = indexAt(i + 0), i1 = indexAt(i + 1), i2 = indexAt(i + 2);
        const p0 = i0 * 3, p1 = i1 * 3, p2 = i2 * 3;
        const uv0 = i0 * 2, uv1 = i1 * 2, uv2 = i2 * 2;
        const x1 = positions[p1 + 0] - positions[p0 + 0], y1 = positions[p1 + 1] - positions[p0 + 1], z1 = positions[p1 + 2] - positions[p0 + 2], x2 = positions[p2 + 0] - positions[p0 + 0], y2 = positions[p2 + 1] - positions[p0 + 1], z2 = positions[p2 + 2] - positions[p0 + 2];
        const s1 = uvs[uv1 + 0] - uvs[uv0 + 0], t1 = uvs[uv1 + 1] - uvs[uv0 + 1], s2 = uvs[uv2 + 0] - uvs[uv0 + 0], t2 = uvs[uv2 + 1] - uvs[uv0 + 1];
        const denom = s1 * t2 - s2 * t1;
        if (Math.abs(denom) <= 1e-12) continue;
        const r = 1 / denom;
        const sx = (t2 * x1 - t1 * x2) * r, sy = (t2 * y1 - t1 * y2) * r, sz = (t2 * z1 - t1 * z2) * r, tx = (s1 * x2 - s2 * x1) * r, ty = (s1 * y2 - s2 * y1) * r, tz = (s1 * z2 - s2 * z1) * r;
        const o0 = i0 * 3;
        tan1[o0 + 0] += sx; tan1[o0 + 1] += sy; tan1[o0 + 2] += sz; tan2[o0 + 0] += tx; tan2[o0 + 1] += ty; tan2[o0 + 2] += tz;
        const o1 = i1 * 3;
        tan1[o1 + 0] += sx; tan1[o1 + 1] += sy; tan1[o1 + 2] += sz; tan2[o1 + 0] += tx; tan2[o1 + 1] += ty; tan2[o1 + 2] += tz;
        const o2 = i2 * 3;
        tan1[o2 + 0] += sx; tan1[o2 + 1] += sy; tan1[o2 + 2] += sz; tan2[o2 + 0] += tx; tan2[o2 + 1] += ty; tan2[o2 + 2] += tz;
    }
    for (let i = 0; i < vertexCount; i++) {
        const nOff = i * 3, tOff = i * 3, o = i * 4;
        const [nx, ny, nz] = normalizeVec3At(normals, nOff, [0, 1, 0]);
        let tx = tan1[tOff + 0], ty = tan1[tOff + 1], tz = tan1[tOff + 2];
        const ndott = nx * tx + ny * ty + nz * tz;
        tx -= nx * ndott; ty -= ny * ndott; tz -= nz * ndott;
        const tLen = Math.hypot(tx, ty, tz);
        if (tLen <= 1e-12) [tx, ty, tz] = fallbackTangentForNormal(nx, ny, nz);
        else { tx /= tLen; ty /= tLen; tz /= tLen; }
        const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
        const cx = tan2[tOff + 0], cy = tan2[tOff + 1], cz = tan2[tOff + 2];
        const handedness = (bx * cx + by * cy + bz * cz) < 0 ? -1 : 1;
        out[o + 0] = tx; out[o + 1] = ty; out[o + 2] = tz; out[o + 3] = handedness;
    }
    return out;
};

const createDerivativeFallbackTangents = (vertexCount: number): Float32Array => {
    const out = new Float32Array(vertexCount * 4);
    for (let i = 0; i < vertexCount; i++) out[i * 4 + 3] = 1;
    return out;
};

const packSkinInfluences = (joints: Uint16Array, weights: Float32Array, joints1: Uint16Array | null, weights1: Float32Array | null): Uint8Array => {
    const vertexCount = (joints.length / 4) | 0;
    const hasSecondSet = joints1 !== null && weights1 !== null;
    const stride = hasSecondSet ? 48 : 24;
    const out = new Uint8Array(vertexCount * stride);
    const view = new DataView(out.buffer);
    for (let i = 0; i < vertexCount; i++) {
        const vertexBase = i * stride;
        const src = i * 4;
        for (let c = 0; c < 4; c++) view.setUint16(vertexBase + c * 2, joints[src + c] ?? 0, true);
        for (let c = 0; c < 4; c++) view.setFloat32(vertexBase + 8 + c * 4, weights[src + c] ?? 0, true);
        if (hasSecondSet) {
            for (let c = 0; c < 4; c++) view.setUint16(vertexBase + 24 + c * 2, joints1[src + c] ?? 0, true);
            for (let c = 0; c < 4; c++) view.setFloat32(vertexBase + 32 + c * 4, weights1[src + c] ?? 0, true);
        }
    }
    return out;
};

type GeometryBoundsSourceMode = "none" | "explicit" | "computed";

type GeometryWasmVertexChannel = "positions" | "normals" | "tangents" | "uvs" | "uvs1" | "joints" | "weights" | "joints1" | "weights1";

type GeometryWasmChannel = GeometryWasmVertexChannel | "indices";

type GeometryWasmTypedArray = Float32Array | Uint16Array | Uint32Array;

type GeometryWasmState<T extends GeometryWasmTypedArray> = {
    source: WasmMemoryView<T> | null;
    dirty: boolean;
    managed: boolean;
    capacity: number;
    capacityHint: number;
};

const GEOMETRY_WASM_VERTEX_CHANNELS: GeometryWasmVertexChannel[] = ["positions", "normals", "tangents", "uvs", "uvs1", "joints", "weights", "joints1", "weights1"];

const makeGeometryWasmState = <T extends GeometryWasmTypedArray>(): GeometryWasmState<T> => ({ source: null, dirty: false, managed: false, capacity: 0, capacityHint: 0 });

const geometryWasmFieldName = (channel: GeometryWasmChannel): string => {
    switch (channel) {
        case "positions": return "wasmPositions";
        case "normals": return "wasmNormals";
        case "tangents": return "wasmTangents";
        case "uvs": return "wasmUvs";
        case "uvs1": return "wasmUvs1";
        case "joints": return "wasmJoints";
        case "weights": return "wasmWeights";
        case "joints1": return "wasmJoints1";
        case "weights1": return "wasmWeights1";
        case "indices": return "wasmIndices";
    }
};

const geometryWasmComponents = (channel: GeometryWasmChannel): number => {
    switch (channel) {
        case "positions":
        case "normals":
            return 3;
        case "tangents":
        case "joints":
        case "weights":
        case "joints1":
        case "weights1":
            return 4;
        case "uvs":
        case "uvs1":
            return 2;
        case "indices":
            return 1;
    }
};

const geometryWasmBytesPerElement = (channel: GeometryWasmChannel): number => (channel === "joints" || channel === "joints1") ? 2 : 4;

const isGeometryWasmVertexChannel = (channel: GeometryWasmChannel): channel is GeometryWasmVertexChannel => channel !== "indices";

const hasGeometryWasmInputs = (desc: GeometryDescriptor): boolean => !!(desc.wasmPositions || desc.wasmNormals || desc.wasmTangents || desc.wasmUvs || desc.wasmUvs1 || desc.wasmJoints || desc.wasmWeights || desc.wasmJoints1 || desc.wasmWeights1 || desc.wasmIndices);

const assertNoDuplicateGeometrySource = (cpuSource: unknown, wasmSource: unknown, cpuLabel: string, wasmLabel: string): void => {
    assert(!(cpuSource && wasmSource), `Geometry: ${cpuLabel} and ${wasmLabel} cannot both be provided for the same attribute.`);
};

const createFallbackNormals = (vertexCount: number): Float32Array => {
    const out = new Float32Array(vertexCount * 3);
    for (let i = 1; i < out.length; i += 3) out[i] = 1;
    return out;
};

export type GeometryWasmAttributeSetOptions = GeometryWasmVertexRefreshOptions & GeometryWasmIndexRefreshOptions & {
    capacity?: number;
    vertexCapacity?: number;
    indexCapacity?: number;
};

export class Geometry {
    positions!: Float32Array;
    normals!: Float32Array;
    tangents!: Float32Array;
    uvs!: Float32Array;
    uvs1!: Float32Array;
    joints: Uint16Array | null = null;
    weights: Float32Array | null = null;
    joints1: Uint16Array | null = null;
    weights1: Float32Array | null = null;
    private _jointsBuffer: GPUBuffer | null = null;
    private _weightsBuffer: GPUBuffer | null = null;
    private _joints1Buffer: GPUBuffer | null = null;
    private _weights1Buffer: GPUBuffer | null = null;
    private _skinInfluenceBuffer: GPUBuffer | null = null;
    indices: Uint32Array | null = null;
    readonly morphTargets: ReadonlyArray<GeometryMorphTargetDescriptor>;
    authoredNormals: boolean = false;
    vertexCount: number = 0;
    indexCount: number = 0;
    private _boundsMin: [number, number, number] = [0, 0, 0];
    private _boundsMax: [number, number, number] = [0, 0, 0];
    private _boundsCenter: [number, number, number] = [0, 0, 0];
    private _boundsRadius: number = 0;
    private _boundsSource: GeometryBoundsSourceMode = "none";
    private _positionBuffer: GPUBuffer | null = null;
    private _normalBuffer: GPUBuffer | null = null;
    private _tangentBuffer: GPUBuffer | null = null;
    private _uvBuffer: GPUBuffer | null = null;
    private _uv1Buffer: GPUBuffer | null = null;
    private _indexBuffer: GPUBuffer | null = null;
    private _device: GPUDevice | null = null;
    private _refCount: number = 1;
    private _destroyed: boolean = false;
    private _keepCPUData: boolean = false;
    private _skinInfluenceDirty: boolean = true;
    private readonly _wasm = {
        positions: makeGeometryWasmState<Float32Array>(),
        normals: makeGeometryWasmState<Float32Array>(),
        tangents: makeGeometryWasmState<Float32Array>(),
        uvs: makeGeometryWasmState<Float32Array>(),
        uvs1: makeGeometryWasmState<Float32Array>(),
        joints: makeGeometryWasmState<Uint16Array>(),
        weights: makeGeometryWasmState<Float32Array>(),
        joints1: makeGeometryWasmState<Uint16Array>(),
        weights1: makeGeometryWasmState<Float32Array>(),
        indices: makeGeometryWasmState<Uint32Array>()
    };
    private readonly _cpuProvided: Record<GeometryWasmChannel, boolean> = {
        positions: false,
        normals: false,
        tangents: false,
        uvs: false,
        uvs1: false,
        joints: false,
        weights: false,
        joints1: false,
        weights1: false,
        indices: false
    };
    private readonly _cpuDirty: Record<GeometryWasmChannel, boolean> = {
        positions: true,
        normals: true,
        tangents: true,
        uvs: true,
        uvs1: true,
        joints: true,
        weights: true,
        joints1: true,
        weights1: true,
        indices: true
    };

    constructor(descriptor: GeometryDescriptor) {
        assertNoDuplicateGeometrySource(descriptor.positions, descriptor.wasmPositions, "positions", "wasmPositions");
        assertNoDuplicateGeometrySource(descriptor.normals, descriptor.wasmNormals, "normals", "wasmNormals");
        assertNoDuplicateGeometrySource(descriptor.tangents, descriptor.wasmTangents, "tangents", "wasmTangents");
        assertNoDuplicateGeometrySource(descriptor.uvs, descriptor.wasmUvs, "uvs", "wasmUvs");
        assertNoDuplicateGeometrySource(descriptor.uvs1, descriptor.wasmUvs1, "uvs1", "wasmUvs1");
        assertNoDuplicateGeometrySource(descriptor.joints, descriptor.wasmJoints, "joints", "wasmJoints");
        assertNoDuplicateGeometrySource(descriptor.weights, descriptor.wasmWeights, "weights", "wasmWeights");
        assertNoDuplicateGeometrySource(descriptor.joints1, descriptor.wasmJoints1, "joints1", "wasmJoints1");
        assertNoDuplicateGeometrySource(descriptor.weights1, descriptor.wasmWeights1, "weights1", "wasmWeights1");
        assertNoDuplicateGeometrySource(descriptor.indices, descriptor.wasmIndices, "indices", "wasmIndices");
        assert(!!descriptor.positions || !!descriptor.wasmPositions, "Geometry: positions or wasmPositions are required.");
        this._keepCPUData = !!descriptor.keepCPUData;
        this.morphTargets = descriptor.morphTargets ?? [];
        assert(!(this.morphTargets.length > 0 && descriptor.wasmPositions), "Geometry: wasmPositions with morphTargets are not supported yet; provide CPU positions for morph-target geometry.");
        const wasmPositions = descriptor.wasmPositions ? assertWasmF32View(descriptor.wasmPositions, "Geometry: wasmPositions").refresh() : null;
        if (descriptor.vertexCount !== undefined) this.vertexCount = assertWasmRecordCount(descriptor.vertexCount, "Geometry: vertexCount");
        else if (descriptor.positions) this.vertexCount = Math.floor(descriptor.positions.length / 3);
        else this.vertexCount = resolveWasmRecordCount(wasmPositions!, undefined, 3, "Geometry: wasmPositions", "Geometry: vertexCount", "vertexCount");
        if (descriptor.positions) {
            this.positions = descriptor.positions;
            this._cpuProvided.positions = true;
            if (this.positions.length !== Math.floor(this.positions.length / 3) * 3) console.warn(`[Geometry] positions length ${this.positions.length} is not divisible by 3; trailing components ignored.`);
            this.validateCPUVertexChannel("positions", this.vertexCount);
        } else {
            validateWasmRecordRange(wasmPositions!, this.vertexCount, 3, "Geometry: wasmPositions", "vertexCount");
            this.positions = this._keepCPUData ? this.copyWasmActiveRange(wasmPositions!, this.vertexCount * 3) as Float32Array : new Float32Array(0);
        }
        const expectedNormalLength = this.vertexCount * 3;
        let authoredNormals = descriptor.normals ? (descriptor.authoredNormals ?? true) : false;
        let normals = descriptor.normals ?? (descriptor.wasmNormals ? new Float32Array(0) : createFallbackNormals(this.vertexCount));
        if (descriptor.normals && normals.length !== expectedNormalLength) {
            console.warn(`[Geometry] normals length mismatch (got ${normals.length}, expected ${expectedNormalLength}). Using fallback normals.`);
            normals = createFallbackNormals(this.vertexCount);
            authoredNormals = false;
        } else if (descriptor.normals) this._cpuProvided.normals = true;
        if (!descriptor.normals && !descriptor.wasmNormals) {
            normals = createFallbackNormals(this.vertexCount);
            authoredNormals = false;
        }
        this.authoredNormals = authoredNormals;
        this.normals = normals;
        const expectedTangentLength = this.vertexCount * 4;
        let tangents = descriptor.tangents ?? (descriptor.wasmTangents ? new Float32Array(0) : null);
        if (tangents && tangents.length !== expectedTangentLength) {
            console.warn(`[Geometry] tangents length mismatch (got ${tangents.length}, expected ${expectedTangentLength}). Using fallback tangents.`);
            tangents = null;
        } else if (descriptor.tangents) this._cpuProvided.tangents = true;
        const expectedUvLength = this.vertexCount * 2;
        let uvs = descriptor.uvs ?? (descriptor.wasmUvs ? new Float32Array(0) : new Float32Array(expectedUvLength));
        if (descriptor.uvs && uvs.length !== expectedUvLength) {
            console.warn(`[Geometry] uvs length mismatch (got ${uvs.length}, expected ${expectedUvLength}). TEXCOORD_0 disabled.`);
            uvs = new Float32Array(expectedUvLength);
        } else if (descriptor.uvs) this._cpuProvided.uvs = true;
        this.uvs = uvs;
        this.tangents = tangents ?? (descriptor.wasmTangents ? new Float32Array(0) : createDerivativeFallbackTangents(this.vertexCount));
        let uvs1 = descriptor.uvs1 ?? (descriptor.wasmUvs1 ? new Float32Array(0) : new Float32Array(expectedUvLength));
        if (descriptor.uvs1 && uvs1.length !== expectedUvLength) {
            console.warn(`[Geometry] uvs1 length mismatch (got ${uvs1.length}, expected ${expectedUvLength}). TEXCOORD_1 disabled.`);
            uvs1 = new Float32Array(expectedUvLength);
        } else if (descriptor.uvs1) this._cpuProvided.uvs1 = true;
        this.uvs1 = uvs1;
        let joints = descriptor.joints ?? null;
        let weights = descriptor.weights ?? null;
        const expected = this.vertexCount * 4;
        if ((joints && !weights && !descriptor.wasmWeights) || (!joints && weights && !descriptor.wasmJoints)) {
            console.warn(`[Geometry] JOINTS_0/WEIGHTS_0 must be provided together. Skinning disabled for this geometry.`);
            joints = null; weights = null;
        }
        if (joints && joints.length !== expected) {
            console.warn(`[Geometry] joints length mismatch (got ${joints.length}, expected ${expected}). Skinning disabled.`);
            joints = null;
            if (!descriptor.wasmJoints) weights = null;
        }
        if (weights && weights.length !== expected) {
            console.warn(`[Geometry] weights length mismatch (got ${weights.length}, expected ${expected}). Skinning disabled.`);
            weights = null;
            if (!descriptor.wasmWeights) joints = null;
        }
        this.joints = joints;
        this.weights = weights;
        if (joints) this._cpuProvided.joints = true;
        if (weights) this._cpuProvided.weights = true;
        let joints1 = descriptor.joints1 ?? null;
        let weights1 = descriptor.weights1 ?? null;
        const hasBaseSkin = !!(joints || descriptor.wasmJoints) && !!(weights || descriptor.wasmWeights);
        if ((joints1 && !weights1 && !descriptor.wasmWeights1) || (!joints1 && weights1 && !descriptor.wasmJoints1)) {
            console.warn(`[Geometry] JOINTS_1/WEIGHTS_1 must be provided together. Ignoring additional influences.`);
            joints1 = null; weights1 = null;
        }
        if ((joints1 || weights1 || descriptor.wasmJoints1 || descriptor.wasmWeights1) && !hasBaseSkin) {
            console.warn(`[Geometry] JOINTS_1/WEIGHTS_1 provided without JOINTS_0/WEIGHTS_0. Ignoring additional influences.`);
            joints1 = null; weights1 = null;
        }
        if (joints1 && joints1.length !== expected) {
            console.warn(`[Geometry] joints1 length mismatch (got ${joints1.length}, expected ${expected}). Ignoring additional influences.`);
            joints1 = null;
            if (!descriptor.wasmJoints1) weights1 = null;
        }
        if (weights1 && weights1.length !== expected) {
            console.warn(`[Geometry] weights1 length mismatch (got ${weights1.length}, expected ${expected}). Ignoring additional influences.`);
            weights1 = null;
            if (!descriptor.wasmWeights1) joints1 = null;
        }
        this.joints1 = joints1;
        this.weights1 = weights1;
        if (joints1) this._cpuProvided.joints1 = true;
        if (weights1) this._cpuProvided.weights1 = true;

        this.indices = descriptor.indices ?? null;
        if (this.indices) this._cpuProvided.indices = true;
        if (descriptor.indexCount !== undefined) {
            this.indexCount = assertWasmRecordCount(descriptor.indexCount, "Geometry: indexCount");
            if (this.indices) assert(this.indices.length >= this.indexCount, `Geometry: indices length must be at least indexCount.`);
        } else if (this.indices) this.indexCount = this.indices.length;
        else if (descriptor.wasmIndices) this.indexCount = resolveWasmRecordCount(assertWasmU32View(descriptor.wasmIndices, "Geometry: wasmIndices").refresh(), undefined, 1, "Geometry: wasmIndices", "Geometry: indexCount", "indexCount");
        else this.indexCount = this.vertexCount;
        if (descriptor.bounds) this.setBounds(descriptor.bounds, "explicit");
        else if (descriptor.positions) this.setBounds(computeGeometryBounds(this.positions), "computed");
        else this.setBounds(computeGeometryBounds(wasmPositions!.array().subarray(0, this.vertexCount * 3)), "computed");
        if (hasGeometryWasmInputs(descriptor)) {
            this.setWasmAttributes({
                positions: descriptor.wasmPositions ?? null,
                normals: descriptor.wasmNormals ?? null,
                tangents: descriptor.wasmTangents ?? null,
                uvs: descriptor.wasmUvs ?? null,
                uvs1: descriptor.wasmUvs1 ?? null,
                joints: descriptor.wasmJoints ?? null,
                weights: descriptor.wasmWeights ?? null,
                joints1: descriptor.wasmJoints1 ?? null,
                weights1: descriptor.wasmWeights1 ?? null,
                indices: descriptor.wasmIndices ?? null
            }, {
                vertexCount: this.vertexCount,
                indexCount: this.indexCount,
                keepCPUData: this._keepCPUData,
                recomputeBounds: this._boundsSource !== "explicit" && !!descriptor.wasmPositions,
                vertexCapacity: assertWasmCapacity(descriptor.wasmVertexCapacity, "Geometry: wasmVertexCapacity"),
                indexCapacity: assertWasmCapacity(descriptor.wasmIndexCapacity, "Geometry: wasmIndexCapacity")
            });
        }
    }

    private assertAlive(action: string): void {
        if (this._destroyed) throw new Error(`Geometry: cannot ${action}; resource has already been released.`);
    }

    private setBounds(bounds: GeometryBoundsDescriptor, source: GeometryBoundsSourceMode): void {
        this._boundsMin = [bounds.boxMin[0], bounds.boxMin[1], bounds.boxMin[2]];
        this._boundsMax = [bounds.boxMax[0], bounds.boxMax[1], bounds.boxMax[2]];
        this._boundsCenter = [bounds.sphereCenter[0], bounds.sphereCenter[1], bounds.sphereCenter[2]];
        this._boundsRadius = Math.max(0, bounds.sphereRadius);
        this._boundsSource = source;
    }

    private wasmState(channel: GeometryWasmChannel): GeometryWasmState<GeometryWasmTypedArray> {
        return this._wasm[channel] as GeometryWasmState<GeometryWasmTypedArray>;
    }

    private assertWasmSource(channel: GeometryWasmChannel, source: unknown): WasmMemoryView<GeometryWasmTypedArray> {
        const label = `Geometry: ${geometryWasmFieldName(channel)}`;
        if (channel === "indices") return assertWasmU32View(source, label) as WasmMemoryView<GeometryWasmTypedArray>;
        if (channel === "joints" || channel === "joints1") return assertWasmU16View(source, label) as WasmMemoryView<GeometryWasmTypedArray>;
        return assertWasmF32View(source, label) as WasmMemoryView<GeometryWasmTypedArray>;
    }

    private copyWasmActiveRange<T extends GeometryWasmTypedArray>(source: WasmMemoryView<T>, elementCount: number): T {
        const data = source.array().subarray(0, elementCount);
        if (data instanceof Uint16Array) return new Uint16Array(data) as T;
        if (data instanceof Uint32Array) return new Uint32Array(data) as T;
        return new Float32Array(data as Float32Array) as T;
    }

    private getCPUChannelData(channel: GeometryWasmChannel): GeometryWasmTypedArray | null {
        switch (channel) {
            case "positions": return this.positions;
            case "normals": return this.normals;
            case "tangents": return this.tangents;
            case "uvs": return this.uvs;
            case "uvs1": return this.uvs1;
            case "joints": return this.joints;
            case "weights": return this.weights;
            case "joints1": return this.joints1;
            case "weights1": return this.weights1;
            case "indices": return this.indices;
        }
    }

    private setCPUChannelData(channel: GeometryWasmChannel, data: GeometryWasmTypedArray | null): void {
        switch (channel) {
            case "positions": this.positions = (data ?? new Float32Array(0)) as Float32Array; break;
            case "normals": this.normals = (data ?? createFallbackNormals(this.vertexCount)) as Float32Array; break;
            case "tangents": this.tangents = (data ?? createDerivativeFallbackTangents(this.vertexCount)) as Float32Array; break;
            case "uvs": this.uvs = (data ?? new Float32Array(this.vertexCount * 2)) as Float32Array; break;
            case "uvs1": this.uvs1 = (data ?? new Float32Array(this.vertexCount * 2)) as Float32Array; break;
            case "joints": this.joints = data as Uint16Array | null; break;
            case "weights": this.weights = data as Float32Array | null; break;
            case "joints1": this.joints1 = data as Uint16Array | null; break;
            case "weights1": this.weights1 = data as Float32Array | null; break;
            case "indices": this.indices = data as Uint32Array | null; break;
        }
        if (data) this._cpuProvided[channel] = true;
        this._cpuDirty[channel] = true;
        if (channel === "joints" || channel === "weights" || channel === "joints1" || channel === "weights1") this._skinInfluenceDirty = true;
    }

    private dropCPUChannelDataForWasm(channel: GeometryWasmChannel): void {
        switch (channel) {
            case "positions": this.positions = new Float32Array(0); break;
            case "normals": this.normals = new Float32Array(0); this.authoredNormals = false; break;
            case "tangents": this.tangents = new Float32Array(0); break;
            case "uvs": this.uvs = new Float32Array(0); break;
            case "uvs1": this.uvs1 = new Float32Array(0); break;
            case "joints": this.joints = null; break;
            case "weights": this.weights = null; break;
            case "joints1": this.joints1 = null; break;
            case "weights1": this.weights1 = null; break;
            case "indices": this.indices = null; break;
        }
        this._cpuProvided[channel] = false;
    }

    private getChannelBuffer(channel: GeometryWasmChannel): GPUBuffer | null {
        switch (channel) {
            case "positions": return this._positionBuffer;
            case "normals": return this._normalBuffer;
            case "tangents": return this._tangentBuffer;
            case "uvs": return this._uvBuffer;
            case "uvs1": return this._uv1Buffer;
            case "joints": return this._jointsBuffer;
            case "weights": return this._weightsBuffer;
            case "joints1": return this._joints1Buffer;
            case "weights1": return this._weights1Buffer;
            case "indices": return this._indexBuffer;
        }
    }

    private setChannelBuffer(channel: GeometryWasmChannel, buffer: GPUBuffer | null): void {
        switch (channel) {
            case "positions": this._positionBuffer = buffer; break;
            case "normals": this._normalBuffer = buffer; break;
            case "tangents": this._tangentBuffer = buffer; break;
            case "uvs": this._uvBuffer = buffer; break;
            case "uvs1": this._uv1Buffer = buffer; break;
            case "joints": this._jointsBuffer = buffer; break;
            case "weights": this._weightsBuffer = buffer; break;
            case "joints1": this._joints1Buffer = buffer; break;
            case "weights1": this._weights1Buffer = buffer; break;
            case "indices": this._indexBuffer = buffer; break;
        }
    }

    private replaceChannelBuffer(channel: GeometryWasmChannel, buffer: GPUBuffer | null): void {
        const current = this.getChannelBuffer(channel);
        if (current && current !== buffer) current.destroy();
        this.setChannelBuffer(channel, buffer);
    }

    private validateCPUVertexChannel(channel: GeometryWasmVertexChannel, vertexCount: number): void {
        if (this.wasmState(channel).source) return;
        const data = this.getCPUChannelData(channel);
        if (!data) return;
        if (!this._cpuProvided[channel] && channel !== "positions") return;
        const expected = vertexCount * geometryWasmComponents(channel);
        assert(data.length >= expected, `Geometry: ${channel} length must match vertexCount when wasm vertex count changes.`);
    }

    private validateNonWasmVertexChannels(vertexCount: number): void {
        for (const channel of GEOMETRY_WASM_VERTEX_CHANNELS) this.validateCPUVertexChannel(channel, vertexCount);
    }

    private resizeFallbackVertexChannels(vertexCount: number): void {
        if (!this._wasm.normals.source && !this._cpuProvided.normals) { this.normals = createFallbackNormals(vertexCount); this.authoredNormals = false; this._cpuDirty.normals = true; }
        if (!this._wasm.tangents.source && !this._cpuProvided.tangents) { this.tangents = createDerivativeFallbackTangents(vertexCount); this._cpuDirty.tangents = true; }
        if (!this._wasm.uvs.source && !this._cpuProvided.uvs) { this.uvs = new Float32Array(vertexCount * 2); this._cpuDirty.uvs = true; }
        if (!this._wasm.uvs1.source && !this._cpuProvided.uvs1) { this.uvs1 = new Float32Array(vertexCount * 2); this._cpuDirty.uvs1 = true; }
    }

    private restoreCPUFallbackAfterWasmClear(channel: GeometryWasmChannel): void {
        const expected = this.vertexCount * geometryWasmComponents(channel);
        const current = this.getCPUChannelData(channel);
        if (channel === "positions") return;
        if (channel === "indices") {
            if (this._cpuProvided.indices && this.indices && this.indices.length >= this.indexCount) return;
            this.indices = null;
            this.indexCount = this.vertexCount;
            this._cpuProvided.indices = false;
            return;
        }
        if (channel === "normals") {
            if (this._cpuProvided.normals && current && current.length >= expected) return;
            this.normals = createFallbackNormals(this.vertexCount);
            this.authoredNormals = false;
            this._cpuProvided.normals = false;
            return;
        }
        if (channel === "tangents") {
            if (this._cpuProvided.tangents && current && current.length >= expected) return;
            this.tangents = createDerivativeFallbackTangents(this.vertexCount);
            this._cpuProvided.tangents = false;
            return;
        }
        if (channel === "uvs") {
            if (this._cpuProvided.uvs && current && current.length >= expected) return;
            this.uvs = new Float32Array(this.vertexCount * 2);
            this._cpuProvided.uvs = false;
            return;
        }
        if (channel === "uvs1") {
            if (this._cpuProvided.uvs1 && current && current.length >= expected) return;
            this.uvs1 = new Float32Array(this.vertexCount * 2);
            this._cpuProvided.uvs1 = false;
        }
    }

    private clearSkinChannelBuffer(channel: "joints" | "weights" | "joints1" | "weights1"): void {
        this.replaceChannelBuffer(channel, null);
        this._cpuDirty[channel] = false;
        this.wasmState(channel).dirty = false;
    }

    private normalizeSkinPairsAfterWasmClear(): void {
        const hasBaseSkin = !!(this.joints || this._wasm.joints.source) && !!(this.weights || this._wasm.weights.source);
        if (!hasBaseSkin) {
            this.joints = null;
            this.weights = null;
            this.joints1 = null;
            this.weights1 = null;
            this._cpuProvided.joints = false;
            this._cpuProvided.weights = false;
            this._cpuProvided.joints1 = false;
            this._cpuProvided.weights1 = false;
            this.clearSkinChannelBuffer("joints");
            this.clearSkinChannelBuffer("weights");
            this.clearSkinChannelBuffer("joints1");
            this.clearSkinChannelBuffer("weights1");
            this._skinInfluenceDirty = true;
            return;
        }
        const hasExtraSkin = !!(this.joints1 || this._wasm.joints1.source) && !!(this.weights1 || this._wasm.weights1.source);
        if (hasExtraSkin) return;
        this.joints1 = null;
        this.weights1 = null;
        this._cpuProvided.joints1 = false;
        this._cpuProvided.weights1 = false;
        this.clearSkinChannelBuffer("joints1");
        this.clearSkinChannelBuffer("weights1");
        this._skinInfluenceDirty = true;
    }

    private validateWasmSourceBeforeSet(channel: GeometryWasmChannel, source: WasmMemoryView<GeometryWasmTypedArray>, explicitCount: number | undefined): void {
        const countTerm = isGeometryWasmVertexChannel(channel) ? "vertexCount" : "indexCount";
        const countLabel = isGeometryWasmVertexChannel(channel) ? "Geometry: vertexCount" : "Geometry: indexCount";
        if (explicitCount !== undefined) {
            const count = assertWasmRecordCount(explicitCount, countLabel);
            validateWasmRecordRange(source, count, geometryWasmComponents(channel), `Geometry: ${geometryWasmFieldName(channel)}`, countTerm);
            return;
        }
        if (channel === "positions") {
            resolveWasmRecordCount(source, undefined, 3, "Geometry: wasmPositions", "Geometry: vertexCount", "vertexCount");
            return;
        }
        if (channel === "indices") {
            resolveWasmRecordCount(source, undefined, 1, "Geometry: wasmIndices", "Geometry: indexCount", "indexCount");
            return;
        }
        if (this.vertexCount > 0) validateWasmRecordRange(source, this.vertexCount, geometryWasmComponents(channel), `Geometry: ${geometryWasmFieldName(channel)}`, "vertexCount");
    }

    private setVertexCountFromWasm(vertexCount: number): void {
        const count = assertWasmRecordCount(vertexCount, "Geometry: vertexCount");
        this.validateNonWasmVertexChannels(count);
        if (count !== this.vertexCount) {
            this.vertexCount = count;
            this.resizeFallbackVertexChannels(count);
            if (!this.indices && !this._wasm.indices.source) this.indexCount = count;
            for (const channel of GEOMETRY_WASM_VERTEX_CHANNELS) if (this.wasmState(channel).source) this.wasmState(channel).dirty = true;
            this._skinInfluenceDirty = true;
        }
    }

    private setIndexCountFromWasm(indexCount: number): void {
        this.indexCount = assertWasmRecordCount(indexCount, "Geometry: indexCount");
    }

    private hasWasmVertexSources(): boolean {
        return GEOMETRY_WASM_VERTEX_CHANNELS.some((channel) => !!this.wasmState(channel).source);
    }

    private hasDirtyWasmSources(): boolean {
        if (this._wasm.indices.source && this._wasm.indices.dirty) return true;
        return GEOMETRY_WASM_VERTEX_CHANNELS.some((channel) => !!this.wasmState(channel).source && this.wasmState(channel).dirty);
    }

    private hasDirtyCPUSources(): boolean {
        if (this._skinInfluenceDirty) return true;
        if (this._cpuDirty.indices && !this._wasm.indices.source) return true;
        return GEOMETRY_WASM_VERTEX_CHANNELS.some((channel) => this._cpuDirty[channel] && !this.wasmState(channel).source);
    }

    private markAllCPUSourcesDirty(): void {
        for (const channel of [...GEOMETRY_WASM_VERTEX_CHANNELS, "indices" as const]) this._cpuDirty[channel] = true;
        this._skinInfluenceDirty = true;
    }

    private markAllWasmSourcesDirty(): void {
        for (const channel of [...GEOMETRY_WASM_VERTEX_CHANNELS, "indices" as const]) if (this.wasmState(channel).source) this.wasmState(channel).dirty = true;
    }

    private clearWasmChannel(channel: GeometryWasmChannel, destroyManagedBuffer: boolean): void {
        const state = this.wasmState(channel);
        state.source = null;
        state.dirty = false;
        state.capacityHint = 0;
        if (destroyManagedBuffer && state.managed) this.replaceChannelBuffer(channel, null);
        state.managed = false;
        state.capacity = 0;
        this.restoreCPUFallbackAfterWasmClear(channel);
        this._cpuDirty[channel] = true;
        if (channel === "joints" || channel === "weights" || channel === "joints1" || channel === "weights1") {
            this.normalizeSkinPairsAfterWasmClear();
            this._skinInfluenceDirty = true;
        }
    }

    private setWasmVertexSource(channel: GeometryWasmVertexChannel, source: WasmMemoryView<GeometryWasmTypedArray> | null, capacity: number | undefined, keepCPUData: boolean | undefined, vertexCount: number | undefined): boolean {
        if (source === null) { this.clearWasmChannel(channel, true); return false; }
        assert(!(this.morphTargets.length > 0 && channel === "positions"), "Geometry: wasmPositions with morphTargets are not supported yet; provide CPU positions for morph-target geometry.");
        const state = this.wasmState(channel);
        const wasmSource = this.assertWasmSource(channel, source);
        wasmSource.refresh();
        this.validateWasmSourceBeforeSet(channel, wasmSource, vertexCount);
        state.capacityHint = assertWasmCapacity(capacity, `Geometry: ${geometryWasmFieldName(channel)} capacity`);
        if (!state.managed) { this.replaceChannelBuffer(channel, null); state.capacity = 0; }
        if (!(keepCPUData ?? this._keepCPUData)) this.dropCPUChannelDataForWasm(channel);
        state.source = wasmSource;
        state.dirty = true;
        this._cpuDirty[channel] = false;
        if (channel === "joints" || channel === "weights" || channel === "joints1" || channel === "weights1") this._skinInfluenceDirty = true;
        return true;
    }

    private setWasmIndexSource(source: WasmMemoryView<Uint32Array> | null, capacity: number | undefined, keepCPUData: boolean | undefined, indexCount: number | undefined): boolean {
        if (source === null) { this.clearWasmChannel("indices", true); return false; }
        const state = this.wasmState("indices");
        const wasmSource = assertWasmU32View(source, "Geometry: wasmIndices") as WasmMemoryView<GeometryWasmTypedArray>;
        wasmSource.refresh();
        this.validateWasmSourceBeforeSet("indices", wasmSource, indexCount);
        state.capacityHint = assertWasmCapacity(capacity, "Geometry: wasmIndices capacity");
        if (!state.managed) { this.replaceChannelBuffer("indices", null); state.capacity = 0; }
        if (!(keepCPUData ?? this._keepCPUData)) this.dropCPUChannelDataForWasm("indices");
        state.source = wasmSource;
        state.dirty = true;
        this._cpuDirty.indices = false;
        return true;
    }

    private updateWasmBounds(options: GeometryWasmVertexRefreshOptions): void {
        if (!options.recomputeBounds || this._boundsSource === "explicit") return;
        const source = this._wasm.positions.source;
        if (!source) return;
        validateWasmRecordRange(source, this.vertexCount, 3, "Geometry: wasmPositions", "vertexCount");
        this.setBounds(computeGeometryBounds((source as WasmMemoryView<Float32Array>).array().subarray(0, this.vertexCount * 3)), "computed");
    }

    setWasmPositions(source: WasmMemoryView<Float32Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("positions", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmNormals(source: WasmMemoryView<Float32Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("normals", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmTangents(source: WasmMemoryView<Float32Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("tangents", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmUvs(source: WasmMemoryView<Float32Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("uvs", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmUvs1(source: WasmMemoryView<Float32Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("uvs1", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmJoints(source: WasmMemoryView<Uint16Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("joints", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmWeights(source: WasmMemoryView<Float32Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("weights", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmJoints1(source: WasmMemoryView<Uint16Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("joints1", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmWeights1(source: WasmMemoryView<Float32Array> | null, options: GeometryWasmAttributeOptions = {}): void {
        if (this.setWasmVertexSource("weights1", source as WasmMemoryView<GeometryWasmTypedArray> | null, options.capacity, options.keepCPUData, options.vertexCount)) this.refreshWasmVertices(options);
    }

    setWasmIndices(source: WasmMemoryView<Uint32Array> | null, options: GeometryWasmIndexOptions = {}): void {
        if (this.setWasmIndexSource(source, options.capacity, options.keepCPUData, options.indexCount)) this.refreshWasmIndices(options);
    }

    setWasmAttributes(sources: GeometryWasmSources, options: GeometryWasmAttributeSetOptions = {}): void {
        const vertexCapacity = options.vertexCapacity ?? options.capacity;
        const indexCapacity = options.indexCapacity ?? options.capacity;
        let touchedVertex = false;
        let touchedIndex = false;
        if (Object.prototype.hasOwnProperty.call(sources, "positions")) touchedVertex = this.setWasmVertexSource("positions", sources.positions as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "normals")) touchedVertex = this.setWasmVertexSource("normals", sources.normals as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "tangents")) touchedVertex = this.setWasmVertexSource("tangents", sources.tangents as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "uvs")) touchedVertex = this.setWasmVertexSource("uvs", sources.uvs as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "uvs1")) touchedVertex = this.setWasmVertexSource("uvs1", sources.uvs1 as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "joints")) touchedVertex = this.setWasmVertexSource("joints", sources.joints as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "weights")) touchedVertex = this.setWasmVertexSource("weights", sources.weights as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "joints1")) touchedVertex = this.setWasmVertexSource("joints1", sources.joints1 as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "weights1")) touchedVertex = this.setWasmVertexSource("weights1", sources.weights1 as WasmMemoryView<GeometryWasmTypedArray> | null, vertexCapacity, options.keepCPUData, options.vertexCount) || touchedVertex;
        if (Object.prototype.hasOwnProperty.call(sources, "indices")) touchedIndex = this.setWasmIndexSource(sources.indices ?? null, indexCapacity, options.keepCPUData, options.indexCount);
        if (touchedVertex) this.refreshWasmVertices(options);
        if (touchedIndex) this.refreshWasmIndices(options);
    }

    refreshWasmVertices(options: GeometryWasmVertexRefreshOptions = {}): void {
        assert(this.hasWasmVertexSources(), "Geometry: refreshWasmVertices() requires at least one wasm vertex source.");
        for (const channel of GEOMETRY_WASM_VERTEX_CHANNELS) {
            const source = this.wasmState(channel).source;
            if (!source) continue;
            source.refresh();
            this.assertWasmSource(channel, source);
        }
        let count = options.vertexCount;
        if (count === undefined && this._wasm.positions.source) count = resolveWasmRecordCount(this._wasm.positions.source, undefined, 3, "Geometry: wasmPositions", "Geometry: vertexCount", "vertexCount");
        if (count === undefined) count = this.vertexCount;
        this.setVertexCountFromWasm(count);
        for (const channel of GEOMETRY_WASM_VERTEX_CHANNELS) {
            const source = this.wasmState(channel).source;
            if (!source) continue;
            validateWasmRecordRange(source, this.vertexCount, geometryWasmComponents(channel), `Geometry: ${geometryWasmFieldName(channel)}`, "vertexCount");
            this.wasmState(channel).dirty = true;
            if (options.keepCPUData ?? this._keepCPUData) this.setCPUChannelData(channel, this.copyWasmActiveRange(source, this.vertexCount * geometryWasmComponents(channel)));
        }
        this.updateWasmBounds(options);
    }

    refreshWasmIndices(options: GeometryWasmIndexRefreshOptions = {}): void {
        const source = this._wasm.indices.source;
        assert(!!source, "Geometry: refreshWasmIndices() requires wasmIndices.");
        source.refresh();
        assertWasmU32View(source, "Geometry: wasmIndices");
        const count = resolveWasmRecordCount(source, options.indexCount, 1, "Geometry: wasmIndices", "Geometry: indexCount", "indexCount");
        this.setIndexCountFromWasm(count);
        validateWasmRecordRange(source, this.indexCount, 1, "Geometry: wasmIndices", "indexCount");
        this._wasm.indices.dirty = true;
        if (options.keepCPUData ?? this._keepCPUData) this.setCPUChannelData("indices", this.copyWasmActiveRange(source, this.indexCount));
    }

    refreshFromWasm(options: GeometryWasmVertexRefreshOptions & GeometryWasmIndexRefreshOptions = {}): void {
        if (this.hasWasmVertexSources()) this.refreshWasmVertices(options);
        if (this._wasm.indices.source) this.refreshWasmIndices(options);
    }

    clearWasmSources(): void {
        for (const channel of GEOMETRY_WASM_VERTEX_CHANNELS) this.clearWasmChannel(channel, true);
        this.clearWasmChannel("indices", true);
    }

    retain(): this {
        this.assertAlive("retain");
        this._refCount++;
        return this;
    }

    release(): void {
        if (this._destroyed) throw new Error("Geometry: release() called after the resource was already released.");
        if (this._refCount <= 0) throw new Error("Geometry: reference count underflow.");
        this._refCount--;
        if (this._refCount > 0) return;
        this._destroyed = true;
        this.disposeResources();
    }

    upload(device: GPUDevice): void {
        this.assertAlive("upload");
        const deviceChanged = this._device !== device;
        if (deviceChanged) {
            if (this._device) this.disposeResources();
            this._device = device;
            this.markAllCPUSourcesDirty();
            this.markAllWasmSourcesDirty();
        }
        if (!deviceChanged && !this.hasDirtyWasmSources() && !this.hasDirtyCPUSources()) return;
        const queue = device.queue;
        for (const channel of GEOMETRY_WASM_VERTEX_CHANNELS) this.uploadCPUChannel(device, channel);
        this.uploadCPUChannel(device, "indices");
        for (const channel of GEOMETRY_WASM_VERTEX_CHANNELS) this.uploadWasmChannel(device, queue, channel);
        this.uploadWasmChannel(device, queue, "indices");
        this.uploadSkinInfluenceBuffer(device);
        this._device = device;
    }

    private uploadCPUChannel(device: GPUDevice, channel: GeometryWasmChannel): void {
        if (this.wasmState(channel).source || !this._cpuDirty[channel]) return;
        const data = this.getCPUChannelData(channel);
        if (!data) {
            this.replaceChannelBuffer(channel, null);
            this._cpuDirty[channel] = false;
            return;
        }
        if (channel === "positions" && data.length < this.vertexCount * 3) throw new Error("Geometry: positions are required after clearing wasmPositions; provide CPU positions with keepCPUData or setWasmPositions().");
        const usage = channel === "indices" ? GPUBufferUsage.INDEX : GPUBufferUsage.VERTEX;
        this.replaceChannelBuffer(channel, createBuffer(device, data, usage, `Geometry.${channel}`));
        this._cpuDirty[channel] = false;
    }

    private ensureWasmBuffer(device: GPUDevice, channel: GeometryWasmChannel, count: number): void {
        const state = this.wasmState(channel);
        const required = Math.max(count, state.capacityHint);
        if (required <= 0) return;
        if (state.managed && this.getChannelBuffer(channel) && state.capacity >= required) return;
        const capacity = growWasmCapacity(required, state.capacity);
        const size = capacity * geometryWasmComponents(channel) * geometryWasmBytesPerElement(channel);
        const usage = (channel === "indices" ? GPUBufferUsage.INDEX : GPUBufferUsage.VERTEX) | GPUBufferUsage.COPY_DST;
        this.replaceChannelBuffer(channel, device.createBuffer({ label: `Geometry.${geometryWasmFieldName(channel)}`, size, usage }));
        state.managed = true;
        state.capacity = capacity;
    }

    private uploadWasmChannel(device: GPUDevice, queue: GPUQueue, channel: GeometryWasmChannel): void {
        const state = this.wasmState(channel);
        const source = state.source;
        if (!source || !state.dirty) return;
        source.refresh();
        this.assertWasmSource(channel, source);
        const count = isGeometryWasmVertexChannel(channel) ? this.vertexCount : this.indexCount;
        validateWasmRecordRange(source, count, geometryWasmComponents(channel), `Geometry: ${geometryWasmFieldName(channel)}`, isGeometryWasmVertexChannel(channel) ? "vertexCount" : "indexCount");
        if (count <= 0) { state.dirty = false; return; }
        this.ensureWasmBuffer(device, channel, count);
        const buffer = this.getChannelBuffer(channel);
        assert(!!buffer, `Geometry: ${geometryWasmFieldName(channel)} upload requires a GPU buffer.`);
        const byteLength = count * geometryWasmComponents(channel) * geometryWasmBytesPerElement(channel);
        const data = source.array();
        queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, byteLength);
        state.dirty = false;
        if (channel === "joints" || channel === "weights" || channel === "joints1" || channel === "weights1") this._skinInfluenceDirty = true;
    }

    private resolveSkinArray<T extends Uint16Array | Float32Array>(channel: "joints" | "weights" | "joints1" | "weights1"): T | null {
        const source = this.wasmState(channel).source as WasmMemoryView<T> | null;
        if (source) return source.array().subarray(0, this.vertexCount * 4) as T;
        return this.getCPUChannelData(channel) as T | null;
    }

    private uploadSkinInfluenceBuffer(device: GPUDevice): void {
        if (!this._skinInfluenceDirty) return;
        if (!this.hasSkinAttributes) {
            this._skinInfluenceBuffer?.destroy();
            this._skinInfluenceBuffer = null;
            this._skinInfluenceDirty = false;
            return;
        }
        const joints = this.resolveSkinArray<Uint16Array>("joints");
        const weights = this.resolveSkinArray<Float32Array>("weights");
        assert(!!joints && !!weights, "Geometry: skin influence upload requires JOINTS_0/WEIGHTS_0.");
        const joints1 = this.resolveSkinArray<Uint16Array>("joints1");
        const weights1 = this.resolveSkinArray<Float32Array>("weights1");
        this._skinInfluenceBuffer?.destroy();
        this._skinInfluenceBuffer = createBuffer(device, packSkinInfluences(joints, weights, joints1, weights1), GPUBufferUsage.VERTEX, "Geometry.skinInfluences");
        this._skinInfluenceDirty = false;
    }

    get positionBuffer(): GPUBuffer {
        this.assertAlive("access positionBuffer");
        if (!this._positionBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
        return this._positionBuffer;
    }

    get normalBuffer(): GPUBuffer {
        this.assertAlive("access normalBuffer");
        if (!this._normalBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
        return this._normalBuffer;
    }

    get tangentBuffer(): GPUBuffer {
        this.assertAlive("access tangentBuffer");
        if (!this._tangentBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
        return this._tangentBuffer;
    }

    get uvBuffer(): GPUBuffer {
        this.assertAlive("access uvBuffer");
        if (!this._uvBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
        return this._uvBuffer;
    }

    get uv1Buffer(): GPUBuffer {
        this.assertAlive("access uv1Buffer");
        if (!this._uv1Buffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
        return this._uv1Buffer;
    }

    get jointsBuffer(): GPUBuffer | null {
        return this._jointsBuffer;
    }

    get weightsBuffer(): GPUBuffer | null {
        return this._weightsBuffer;
    }

    get joints1Buffer(): GPUBuffer | null {
        return this._joints1Buffer;
    }

    get weights1Buffer(): GPUBuffer | null {
        return this._weights1Buffer;
    }

    get skinInfluenceBuffer(): GPUBuffer | null {
        return this._skinInfluenceBuffer;
    }

    get indexBuffer(): GPUBuffer | null {
        return this._indexBuffer;
    }

    get isIndexed(): boolean {
        return this._indexBuffer !== null;
    }

    get isSkinned(): boolean {
        return this._jointsBuffer !== null && this._weightsBuffer !== null;
    }

    get isSkinned8(): boolean {
        return this._jointsBuffer !== null && this._weightsBuffer !== null && this._joints1Buffer !== null && this._weights1Buffer !== null;
    }

    get hasSkinAttributes(): boolean {
        return !!(this.joints || this._wasm.joints.source) && !!(this.weights || this._wasm.weights.source);
    }

    get hasSkin8Attributes(): boolean {
        return this.hasSkinAttributes && !!(this.joints1 || this._wasm.joints1.source) && !!(this.weights1 || this._wasm.weights1.source);
    }

    get boundsMin(): readonly [number, number, number] {
        return this._boundsMin;
    }

    get boundsMax(): readonly [number, number, number] {
        return this._boundsMax;
    }

    get boundsCenter(): readonly [number, number, number] {
        return this._boundsCenter;
    }

    get boundsRadius(): number {
        return this._boundsRadius;
    }

    destroy(): void {
        this.release();
    }

    private disposeResources(): void {
        this._positionBuffer?.destroy();
        this._normalBuffer?.destroy();
        this._tangentBuffer?.destroy();
        this._uvBuffer?.destroy();
        this._uv1Buffer?.destroy();
        this._jointsBuffer?.destroy();
        this._weightsBuffer?.destroy();
        this._joints1Buffer?.destroy();
        this._weights1Buffer?.destroy();
        this._skinInfluenceBuffer?.destroy();
        this._jointsBuffer = null;
        this._weightsBuffer = null;
        this._joints1Buffer = null;
        this._weights1Buffer = null;
        this._skinInfluenceBuffer = null;
        this._indexBuffer?.destroy();
        this._positionBuffer = null;
        this._normalBuffer = null;
        this._tangentBuffer = null;
        this._uvBuffer = null;
        this._uv1Buffer = null;
        this._indexBuffer = null;
        this._device = null;
        for (const channel of [...GEOMETRY_WASM_VERTEX_CHANNELS, "indices" as const]) {
            const state = this.wasmState(channel);
            state.managed = false;
            state.capacity = 0;
        }
    }

    static point(size = 1, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        return Geometry.rectangle(size, size, plane, doubleSided);
    }

    static line(length = 1, thickness = 0.01, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        return Geometry.rectangle(length, thickness, plane, doubleSided);
    }

    static plane(width = 1, height = 1, widthSegments = 1, heightSegments = 1): Geometry {
        const w = width / 2, h = height / 2;
        const gridX = widthSegments, gridY = heightSegments;
        const gridX1 = gridX + 1, gridY1 = gridY + 1;
        const segmentWidth = width / gridX;
        const segmentHeight = height / gridY;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        for (let iy = 0; iy < gridY1; iy++) {
            const y = iy * segmentHeight - h;
            for (let ix = 0; ix < gridX1; ix++) {
                const x = ix * segmentWidth - w;
                positions.push(x, 0, y);
                normals.push(0, 1, 0);
                uvs.push(ix / gridX, 1 - iy / gridY);
            }
        }
        for (let iy = 0; iy < gridY; iy++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iy;
                const b = ix + gridX1 * (iy + 1);
                const c = (ix + 1) + gridX1 * (iy + 1);
                const d = (ix + 1) + gridX1 * iy;
                indices.push(a, b, d, b, c, d);
            }
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static triangle(width = 1, height = 1, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        const w = width / 2;
        const h = height / 2;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const flipWinding = plane === "xz";
        let nx = 0, ny = 0, nz = 0;
        switch (plane) {
            case "xy":
                nz = 1;
                break;
            case "xz":
                ny = 1;
                break;
            case "yz":
                nx = 1;
                break;
        }
        const uFor = (x: number) => (width !== 0 ? (x / width) + 0.5 : 0.5);
        const vFor = (y: number) => (height !== 0 ? (-y / height) + 0.5 : 0.5);
        const pushVertex = (x: number, y: number) => {
            switch (plane) {
                case "xy":
                    positions.push(x, y, 0);
                    break;
                case "xz":
                    positions.push(x, 0, y);
                    break;
                case "yz":
                    positions.push(0, x, y);
                    break;
            }
            normals.push(nx, ny, nz);
            uvs.push(uFor(x), vFor(y));
        };
        pushVertex(-w, -h);
        pushVertex( w, -h);
        pushVertex( 0,  h);
        if (flipWinding) {
            indices.push(0, 2, 1);
        } else {
            indices.push(0, 1, 2);
        }
        const base: GeometryDescriptor = {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static rectangle(width = 1, height = 1, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        const w = width / 2;
        const h = height / 2;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const flipWinding = plane === "xz";
        let nx = 0, ny = 0, nz = 0;
        switch (plane) {
            case "xy":
                nz = 1;
                break;
            case "xz":
                ny = 1;
                break;
            case "yz":
                nx = 1;
                break;
        }
        const pushVertex = (x: number, y: number, u: number, v: number) => {
            switch (plane) {
                case "xy":
                    positions.push(x, y, 0);
                    break;
                case "xz":
                    positions.push(x, 0, y);
                    break;
                case "yz":
                    positions.push(0, x, y);
                    break;
            }
            normals.push(nx, ny, nz);
            uvs.push(u, v);
        };
        pushVertex(-w, -h, 0, 1);
        pushVertex( w, -h, 1, 1);
        pushVertex( w,  h, 1, 0);
        pushVertex(-w,  h, 0, 0);
        if (flipWinding) {
            indices.push(0, 2, 1, 0, 3, 2);
        } else {
            indices.push(0, 1, 2, 0, 2, 3);
        }
        const base: GeometryDescriptor = {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static circle(radius = 0.5, segments = 64, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        const seg = Math.max(3, Math.floor(segments));
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const flipWinding = plane === "xz";
        let nx = 0, ny = 0, nz = 0;
        switch (plane) {
            case "xy":
                nz = 1;
                break;
            case "xz":
                ny = 1;
                break;
            case "yz":
                nx = 1;
                break;
        }
        const inv2r = radius !== 0 ? (1 / (2 * radius)) : 0;
        const pushVertex = (x: number, y: number) => {
            switch (plane) {
                case "xy":
                    positions.push(x, y, 0);
                    break;
                case "xz":
                    positions.push(x, 0, y);
                    break;
                case "yz":
                    positions.push(0, x, y);
                    break;
            }
            normals.push(nx, ny, nz);
            const u = radius !== 0 ? (0.5 + x * inv2r) : 0.5;
            const v = radius !== 0 ? (0.5 - y * inv2r) : 0.5;
            uvs.push(u, v);
        };
        pushVertex(0, 0);
        for (let i = 0; i < seg; i++) {
            const t = (i / seg) * Math.PI * 2;
            const x = Math.cos(t) * radius;
            const y = Math.sin(t) * radius;
            pushVertex(x, y);
        }
        for (let i = 0; i < seg; i++) {
            const a = 0;
            const b = 1 + i;
            const c = 1 + ((i + 1) % seg);
            if (flipWinding) {
                indices.push(a, c, b);
            } else {
                indices.push(a, b, c);
            }
        }
        const base: GeometryDescriptor = {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static ellipse(radiusX = 0.5, radiusY = 0.5, segments = 64, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        const seg = Math.max(3, Math.floor(segments));
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const flipWinding = plane === "xz";
        let nx = 0, ny = 0, nz = 0;
        switch (plane) {
            case "xy":
                nz = 1;
                break;
            case "xz":
                ny = 1;
                break;
            case "yz":
                nx = 1;
                break;
        }
        const inv2rx = radiusX !== 0 ? (1 / (2 * radiusX)) : 0;
        const inv2ry = radiusY !== 0 ? (1 / (2 * radiusY)) : 0;
        const pushVertex = (x: number, y: number) => {
            switch (plane) {
                case "xy":
                    positions.push(x, y, 0);
                    break;
                case "xz":
                    positions.push(x, 0, y);
                    break;
                case "yz":
                    positions.push(0, x, y);
                    break;
            }
            normals.push(nx, ny, nz);
            const u = radiusX !== 0 ? (0.5 + x * inv2rx) : 0.5;
            const v = radiusY !== 0 ? (0.5 - y * inv2ry) : 0.5;
            uvs.push(u, v);
        };
        pushVertex(0, 0);
        for (let i = 0; i < seg; i++) {
            const t = (i / seg) * Math.PI * 2;
            const x = Math.cos(t) * radiusX;
            const y = Math.sin(t) * radiusY;
            pushVertex(x, y);
        }
        for (let i = 0; i < seg; i++) {
            const a = 0;
            const b = 1 + i;
            const c = 1 + ((i + 1) % seg);
            if (flipWinding) {
                indices.push(a, c, b);
            } else {
                indices.push(a, b, c);
            }
        }
        const base: GeometryDescriptor = {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static box(width = 1, height = 1, depth = 1): Geometry {
        const w = width / 2, h = height / 2, d = depth / 2;
        const positions = new Float32Array([
            -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,
             w, -h, -d,  -w, -h, -d,  -w,  h, -d,   w,  h, -d,
            -w,  h,  d,   w,  h,  d,   w,  h, -d,  -w,  h, -d,
            -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,
             w, -h,  d,   w, -h, -d,   w,  h, -d,   w,  h,  d,
            -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d,
        ]);
        const normals = new Float32Array([
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
            0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
            0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
            0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
        ]);
        const uvs = new Float32Array([
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
        ]);
        const indices = new Uint32Array([
            0,  1,  2,   0,  2,  3,
            4,  5,  6,   4,  6,  7,
            8,  9, 10,   8, 10, 11,
           12, 13, 14,  12, 14, 15,
           16, 17, 18,  16, 18, 19,
           20, 21, 22,  20, 22, 23,
        ]);
        return new Geometry({ positions, normals, uvs, indices });
    }

    static sphere(radius = 0.5, widthSegments = 32, heightSegments = 16): Geometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        for (let iy = 0; iy <= heightSegments; iy++) {
            const v = iy / heightSegments;
            const phi = v * Math.PI;
            for (let ix = 0; ix <= widthSegments; ix++) {
                const u = ix / widthSegments;
                const theta = u * Math.PI * 2;
                const x = -Math.cos(theta) * Math.sin(phi);
                const y = Math.cos(phi);
                const z = Math.sin(theta) * Math.sin(phi);
                positions.push(radius * x, radius * y, radius * z);
                normals.push(x, y, z);
                uvs.push(u, v);
            }
        }
        for (let iy = 0; iy < heightSegments; iy++) {
            for (let ix = 0; ix < widthSegments; ix++) {
                const a = ix + (widthSegments + 1) * iy;
                const b = ix + (widthSegments + 1) * (iy + 1);
                const c = (ix + 1) + (widthSegments + 1) * (iy + 1);
                const d = (ix + 1) + (widthSegments + 1) * iy;
                if (iy !== 0) indices.push(a, b, d);
                if (iy !== heightSegments - 1) indices.push(b, c, d);
            }
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static cylinder(radiusTop = 0.5, radiusBottom = 0.5, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false): Geometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let index = 0;
        const halfHeight = height / 2;
        const slope = (radiusBottom - radiusTop) / height;
        for (let iy = 0; iy <= heightSegments; iy++) {
            const v = iy / heightSegments;
            const y = v * height - halfHeight;
            const radius = v * (radiusTop - radiusBottom) + radiusBottom;
            for (let ix = 0; ix <= radialSegments; ix++) {
                const u = ix / radialSegments;
                const theta = u * Math.PI * 2;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                positions.push(radius * sinTheta, y, radius * cosTheta);
                const nLen = Math.sqrt(1 + slope * slope);
                normals.push(sinTheta / nLen, slope / nLen, cosTheta / nLen);
                uvs.push(u, 1 - v);
            }
        }
        for (let iy = 0; iy < heightSegments; iy++) {
            for (let ix = 0; ix < radialSegments; ix++) {
                const a = ix + (radialSegments + 1) * iy;
                const b = ix + (radialSegments + 1) * (iy + 1);
                const c = (ix + 1) + (radialSegments + 1) * (iy + 1);
                const d = (ix + 1) + (radialSegments + 1) * iy;
                indices.push(a, d, b, b, d, c);
            }
        }
        index = positions.length / 3;
        const generateTopCap = () => {
            const centerIndex = index;
            positions.push(0, halfHeight, 0);
            normals.push(0, 1, 0);
            uvs.push(0.5, 0.5);
            index++;
            for (let ix = 0; ix <= radialSegments; ix++) {
                const u = ix / radialSegments;
                const theta = u * Math.PI * 2;
                const x = radiusTop * Math.sin(theta);
                const z = radiusTop * Math.cos(theta);
                positions.push(x, halfHeight, z);
                normals.push(0, 1, 0);
                uvs.push(Math.sin(theta) * 0.5 + 0.5, Math.cos(theta) * 0.5 + 0.5);
                if (ix > 0) indices.push(centerIndex, index - 1, index);
                index++;
            }
        };
        const generateBottomCap = () => {
            const centerIndex = index;
            positions.push(0, -halfHeight, 0);
            normals.push(0, -1, 0);
            uvs.push(0.5, 0.5);
            index++;
            for (let ix = 0; ix <= radialSegments; ix++) {
                const u = ix / radialSegments;
                const theta = u * Math.PI * 2;
                const x = radiusBottom * Math.sin(theta);
                const z = radiusBottom * Math.cos(theta);
                positions.push(x, -halfHeight, z);
                normals.push(0, -1, 0);
                uvs.push(Math.sin(theta) * 0.5 + 0.5, Math.cos(theta) * 0.5 + 0.5);
                if (ix > 0) indices.push(centerIndex, index, index - 1);
                index++;
            }
        };
        if (!openEnded) {
            generateTopCap();
            generateBottomCap();
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static pyramid(baseWidth = 1, baseDepth = 1, height = 1): Geometry {
        const w = baseWidth / 2, d = baseDepth / 2;
        const h = height;
        const apex: [number, number, number] = [0, h, 0];
        const bl: [number, number, number] = [-w, 0, -d];
        const br: [number, number, number] = [w, 0, -d];
        const fr: [number, number, number] = [w, 0, d];
        const fl: [number, number, number] = [-w, 0, d];
        const faceNormal = (v0: [number, number, number], v1: [number, number, number], v2: [number, number, number]): [number, number, number] => {
            const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
            const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
            const nx = ay * bz - az * by;
            const ny = az * bx - ax * bz;
            const nz = ax * by - ay * bx;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            return [nx / len, ny / len, nz / len];
        };
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let idx = 0;
        const addFace = (v0: [number, number, number], v1: [number, number, number], v2: [number, number, number]) => {
            const n = faceNormal(v0, v1, v2);
            positions.push(...v0, ...v1, ...v2);
            normals.push(...n, ...n, ...n);
            uvs.push(0.5, 0, 0, 1, 1, 1);
            indices.push(idx, idx + 1, idx + 2);
            idx += 3;
        };
        addFace(apex, fl, fr);
        addFace(apex, fr, br);
        addFace(apex, br, bl);
        addFace(apex, bl, fl);
        const baseNormal: [number, number, number] = [0, -1, 0];
        positions.push(...bl, ...br, ...fr, ...fl);
        normals.push(...baseNormal, ...baseNormal, ...baseNormal, ...baseNormal);
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static torus(radius = 0.5, tube = 0.2, radialSegments = 32, tubularSegments = 24): Geometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        for (let j = 0; j <= radialSegments; j++) {
            for (let i = 0; i <= tubularSegments; i++) {
                const u = (i / tubularSegments) * Math.PI * 2;
                const v = (j / radialSegments) * Math.PI * 2;
                const x = (radius + tube * Math.cos(v)) * Math.cos(u);
                const y = tube * Math.sin(v);
                const z = (radius + tube * Math.cos(v)) * Math.sin(u);
                positions.push(x, y, z);
                const cx = radius * Math.cos(u);
                const cz = radius * Math.sin(u);
                const nx = x - cx;
                const ny = y;
                const nz = z - cz;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                normals.push(nx / len, ny / len, nz / len);
                uvs.push(i / tubularSegments, j / radialSegments);
            }
        }
        for (let j = 0; j < radialSegments; j++) {
            for (let i = 0; i < tubularSegments; i++) {
                const a = i + (tubularSegments + 1) * j;
                const b = i + (tubularSegments + 1) * (j + 1);
                const c = (i + 1) + (tubularSegments + 1) * (j + 1);
                const d = (i + 1) + (tubularSegments + 1) * j;
                indices.push(a, b, d, b, c, d);
            }
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static prism(radius = 0.5, height = 1, sides = 6): Geometry {
        if (sides < 3) sides = 3;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const halfHeight = height / 2;
        let idx = 0;
        const topRing: [number, number, number][] = [];
        const bottomRing: [number, number, number][] = [];
        for (let i = 0; i < sides; i++) {
            const theta = (i / sides) * Math.PI * 2;
            const x = radius * Math.cos(theta);
            const z = radius * Math.sin(theta);
            topRing.push([x, halfHeight, z]);
            bottomRing.push([x, -halfHeight, z]);
        }
        const faceNormal = (v0: [number, number, number], v1: [number, number, number], v2: [number, number, number]): [number, number, number] => {
            const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
            const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
            const nx = ay * bz - az * by;
            const ny = az * bx - ax * bz;
            const nz = ax * by - ay * bx;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            return [nx / len, ny / len, nz / len];
        };
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            const t0 = topRing[i];
            const t1 = topRing[next];
            const b0 = bottomRing[i];
            const b1 = bottomRing[next];
            const n = faceNormal(t0, t1, b0);
            positions.push(...t0, ...b0, ...b1, ...t1);
            normals.push(...n, ...n, ...n, ...n);
            const u0 = i / sides;
            const u1 = (i + 1) / sides;
            uvs.push(u0, 0, u0, 1, u1, 1, u1, 0);
            indices.push(idx, idx + 2, idx + 1, idx, idx + 3, idx + 2);
            idx += 4;
        }
        const topCenter: [number, number, number] = [0, halfHeight, 0];
        const topNormal: [number, number, number] = [0, 1, 0];
        const topCenterIdx = idx;
        positions.push(...topCenter);
        normals.push(...topNormal);
        uvs.push(0.5, 0.5);
        idx++;
        for (let i = 0; i < sides; i++) {
            const t = topRing[i];
            positions.push(...t);
            normals.push(...topNormal);
            const u = 0.5 + 0.5 * Math.cos((i / sides) * Math.PI * 2);
            const v = 0.5 + 0.5 * Math.sin((i / sides) * Math.PI * 2);
            uvs.push(u, v);
        }
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            indices.push(topCenterIdx, topCenterIdx + 1 + next, topCenterIdx + 1 + i);
        }
        idx += sides;
        const bottomCenter: [number, number, number] = [0, -halfHeight, 0];
        const bottomNormal: [number, number, number] = [0, -1, 0];
        const bottomCenterIdx = idx;
        positions.push(...bottomCenter);
        normals.push(...bottomNormal);
        uvs.push(0.5, 0.5);
        idx++;
        for (let i = 0; i < sides; i++) {
            const b = bottomRing[i];
            positions.push(...b);
            normals.push(...bottomNormal);
            const u = 0.5 + 0.5 * Math.cos((i / sides) * Math.PI * 2);
            const v = 0.5 + 0.5 * Math.sin((i / sides) * Math.PI * 2);
            uvs.push(u, v);
        }
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            indices.push(bottomCenterIdx, bottomCenterIdx + 1 + i, bottomCenterIdx + 1 + next);
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static cartesianCurve(descriptor: CartesianCurveDescriptor): Geometry {
        const f = descriptor.f;
        const xMin = descriptor.xMin ?? -1;
        const xMax = descriptor.xMax ?? 1;
        const segments = Math.max(2, Math.floor(descriptor.segments ?? 256));
        const radius = descriptor.radius ?? 0.01;
        const radialSegments = Math.max(3, Math.floor(descriptor.radialSegments ?? 8));
        const closed = descriptor.closed ?? false;
        const plane: "xy" | "xz" | "yz" = descriptor.plane ?? "xy";
        const upLocal: [number, number, number] = descriptor.up ?? [0, 0, 1];
        let up: [number, number, number];
        switch (plane) {
            case "xy":
                up = upLocal;
                break;
            case "xz":
                up = [upLocal[0], upLocal[2], upLocal[1]];
                break;
            case "yz":
                up = [upLocal[2], upLocal[0], upLocal[1]];
                break;
        }
        const breakOnInvalid = descriptor.breakOnInvalid ?? true;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexOffset = 0;
        const sampleCount = closed ? segments : segments + 1;
        let segmentPoints: number[] = [];
        let anyInvalid = false;
        const flushSegment = (close: boolean) => {
            const pointCount = segmentPoints.length / 3;
            if (pointCount >= 2) {
                vertexOffset = Geometry._appendTubeSegment(new Float32Array(segmentPoints), radius, radialSegments, close, up, positions, normals, uvs, indices, vertexOffset);
            }
            segmentPoints = [];
        };
        const range = xMax - xMin;
        for (let i = 0; i < sampleCount; i++) {
            const u = segments > 0 ? (i / segments) : 0;
            const x = xMin + range * u;
            const y = f(x);
            if (!Number.isFinite(y)) {
                anyInvalid = true;
                if (breakOnInvalid) flushSegment(false);
                continue;
            }
            let wx: number;
            let wy: number;
            let wz: number;
            switch (plane) {
                case "xy":
                    wx = x;
                    wy = y;
                    wz = 0;
                    break;
                case "xz":
                    wx = x;
                    wy = 0;
                    wz = y;
                    break;
                case "yz":
                    wx = 0;
                    wy = x;
                    wz = y;
                    break;
            }
            segmentPoints.push(wx, wy, wz);
        }
        flushSegment(closed && !anyInvalid);
        if (positions.length === 0) return new Geometry({ positions: new Float32Array(0) });
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static cartesianSurface(descriptor: CartesianSurfaceDescriptor): Geometry {
        const f = descriptor.f;
        const xMin = descriptor.xMin ?? -1;
        const xMax = descriptor.xMax ?? 1;
        const zMin = descriptor.zMin ?? -1;
        const zMax = descriptor.zMax ?? 1;
        const xSegments = Math.max(1, Math.floor(descriptor.xSegments ?? 128));
        const zSegments = Math.max(1, Math.floor(descriptor.zSegments ?? 128));
        const skipInvalid = descriptor.skipInvalid ?? true;
        const doubleSided = descriptor.doubleSided ?? false;
        const plane: "xy" | "xz" | "yz" = descriptor.plane ?? "xz";
        const gridX = xSegments;
        const gridZ = zSegments;
        const gridX1 = gridX + 1;
        const gridZ1 = gridZ + 1;
        const positions = new Float32Array(gridX1 * gridZ1 * 3);
        const normals = new Float32Array(gridX1 * gridZ1 * 3);
        const uvs = new Float32Array(gridX1 * gridZ1 * 2);
        const valid = new Uint8Array(gridX1 * gridZ1);
        const xRange = xMax - xMin;
        const zRange = zMax - zMin;
        for (let iz = 0; iz < gridZ1; iz++) {
            const vz = gridZ > 0 ? (iz / gridZ) : 0;
            const z = zMin + zRange * vz;
            for (let ix = 0; ix < gridX1; ix++) {
                const ux = gridX > 0 ? (ix / gridX) : 0;
                const x = xMin + xRange * ux;
                const i = ix + gridX1 * iz;
                const y = f(x, z);
                const ok = Number.isFinite(y);
                valid[i] = ok ? 1 : 0;
                const p = i * 3;
                const height = ok ? y : 0;
                let wx: number;
                let wy: number;
                let wz: number;
                switch (plane) {
                    case "xy":
                        wx = x;
                        wy = z;
                        wz = height;
                        break;
                    case "xz":
                        wx = x;
                        wy = height;
                        wz = z;
                        break;
                    case "yz":
                        wx = height;
                        wy = x;
                        wz = z;
                        break;
                }
                positions[p + 0] = wx;
                positions[p + 1] = wy;
                positions[p + 2] = wz;
                const t = i * 2;
                uvs[t + 0] = ux;
                uvs[t + 1] = 1 - vz;
            }
        }
        Geometry._computeGridNormals(positions, valid, gridX, gridZ, normals);
        const indices: number[] = [];
        for (let iz = 0; iz < gridZ; iz++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iz;
                const b = ix + gridX1 * (iz + 1);
                const c = (ix + 1) + gridX1 * (iz + 1);
                const d = (ix + 1) + gridX1 * iz;
                if (skipInvalid && (!valid[a] || !valid[b] || !valid[c] || !valid[d])) continue;
                indices.push(a, b, d, b, c, d);
            }
        }
        if (indices.length === 0) return new Geometry({ positions: new Float32Array(0) });
        const base: GeometryDescriptor = {
            positions,
            normals,
            uvs,
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static parametricCurve(descriptor: ParametricCurveDescriptor): Geometry {
        const f = descriptor.f;
        const tMin = descriptor.tMin ?? 0;
        const tMax = descriptor.tMax ?? 1;
        const segments = Math.max(2, Math.floor(descriptor.segments ?? 256));
        const radius = descriptor.radius ?? 0.01;
        const radialSegments = Math.max(3, Math.floor(descriptor.radialSegments ?? 8));
        const closed = descriptor.closed ?? false;
        const breakOnInvalid = descriptor.breakOnInvalid ?? true;
        const plane: "xy" | "xz" | "yz" = descriptor.plane ?? "xy";
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexOffset = 0;
        const sampleCount = closed ? segments : segments + 1;
        let segmentPoints: number[] = [];
        let anyInvalid = false;
        let upLocal: [number, number, number] | null = descriptor.up ?? null;
        let upWorld: [number, number, number] | null = null;
        if (upLocal) {
            switch (plane) {
                case "xy":
                    upWorld = upLocal;
                    break;
                case "xz":
                    upWorld = [upLocal[0], upLocal[2], upLocal[1]];
                    break;
                case "yz":
                    upWorld = [upLocal[2], upLocal[0], upLocal[1]];
                    break;
            }
        }
        const flushSegment = (close: boolean) => {
            const pointCount = segmentPoints.length / 3;
            if (pointCount >= 2) {
                const upVec: [number, number, number] = upWorld ?? [0, 1, 0];
                vertexOffset = Geometry._appendTubeSegment(new Float32Array(segmentPoints), radius, radialSegments, close, upVec, positions, normals, uvs, indices, vertexOffset);
            }
            segmentPoints = [];
        };
        const range = tMax - tMin;
        for (let i = 0; i < sampleCount; i++) {
            const s = segments > 0 ? (i / segments) : 0;
            const t = tMin + range * s;
            const p = f(t);
            let x: number;
            let y: number;
            let z: number;
            if (p.length === 2) {
                x = p[0];
                y = p[1];
                z = 0;
                if (!upLocal) {
                    upLocal = [0, 0, 1];
                    switch (plane) {
                        case "xy":
                            upWorld = upLocal;
                            break;
                        case "xz":
                            upWorld = [upLocal[0], upLocal[2], upLocal[1]];
                            break;
                        case "yz":
                            upWorld = [upLocal[2], upLocal[0], upLocal[1]];
                            break;
                    }
                }
            } else {
                x = p[0];
                y = p[1];
                z = p[2];
                if (!upLocal) {
                    upLocal = [0, 1, 0];
                    switch (plane) {
                        case "xy":
                            upWorld = upLocal;
                            break;
                        case "xz":
                            upWorld = [upLocal[0], upLocal[2], upLocal[1]];
                            break;
                        case "yz":
                            upWorld = [upLocal[2], upLocal[0], upLocal[1]];
                            break;
                    }
                }
            }
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                anyInvalid = true;
                if (breakOnInvalid) flushSegment(false);
                continue;
            }
            let wx: number;
            let wy: number;
            let wz: number;
            switch (plane) {
                case "xy":
                    wx = x;
                    wy = y;
                    wz = z;
                    break;
                case "xz":
                    wx = x;
                    wy = z;
                    wz = y;
                    break;
                case "yz":
                    wx = z;
                    wy = x;
                    wz = y;
                    break;
            }
            segmentPoints.push(wx, wy, wz);
        }
        flushSegment(closed && !anyInvalid);
        if (positions.length === 0) return new Geometry({ positions: new Float32Array(0) });
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static parametricSurface(descriptor: ParametricSurfaceDescriptor): Geometry {
        const f = descriptor.f;
        const uMin = descriptor.uMin ?? 0;
        const uMax = descriptor.uMax ?? 1;
        const vMin = descriptor.vMin ?? 0;
        const vMax = descriptor.vMax ?? 1;
        const uSegments = Math.max(1, Math.floor(descriptor.uSegments ?? 128));
        const vSegments = Math.max(1, Math.floor(descriptor.vSegments ?? 128));
        const skipInvalid = descriptor.skipInvalid ?? true;
        const doubleSided = descriptor.doubleSided ?? false;
        const plane: "xy" | "xz" | "yz" = descriptor.plane ?? "xy";
        const gridU = uSegments;
        const gridV = vSegments;
        const gridU1 = gridU + 1;
        const gridV1 = gridV + 1;
        const positions = new Float32Array(gridU1 * gridV1 * 3);
        const normals = new Float32Array(gridU1 * gridV1 * 3);
        const uvs = new Float32Array(gridU1 * gridV1 * 2);
        const valid = new Uint8Array(gridU1 * gridV1);
        const uRange = uMax - uMin;
        const vRange = vMax - vMin;
        for (let iv = 0; iv < gridV1; iv++) {
            const vv = gridV > 0 ? (iv / gridV) : 0;
            const v = vMin + vRange * vv;
            for (let iu = 0; iu < gridU1; iu++) {
                const uu = gridU > 0 ? (iu / gridU) : 0;
                const u = uMin + uRange * uu;
                const i = iu + gridU1 * iv;
                const p = f(u, v);
                const x = p[0];
                const y = p[1];
                const z = p[2];
                const ok = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
                valid[i] = ok ? 1 : 0;
                const o = i * 3;
                if (ok) {
                    let wx: number;
                    let wy: number;
                    let wz: number;
                    switch (plane) {
                        case "xy":
                            wx = x;
                            wy = y;
                            wz = z;
                            break;
                        case "xz":
                            wx = x;
                            wy = z;
                            wz = y;
                            break;
                        case "yz":
                            wx = z;
                            wy = x;
                            wz = y;
                            break;
                    }
                    positions[o + 0] = wx;
                    positions[o + 1] = wy;
                    positions[o + 2] = wz;
                } else {
                    positions[o + 0] = 0;
                    positions[o + 1] = 0;
                    positions[o + 2] = 0;
                }
                const t = i * 2;
                uvs[t + 0] = uu;
                uvs[t + 1] = 1 - vv;
            }
        }
        Geometry._computeGridNormals(positions, valid, gridU, gridV, normals);
        const indices: number[] = [];
        for (let iv = 0; iv < gridV; iv++) {
            for (let iu = 0; iu < gridU; iu++) {
                const a = iu + gridU1 * iv;
                const b = iu + gridU1 * (iv + 1);
                const c = (iu + 1) + gridU1 * (iv + 1);
                const d = (iu + 1) + gridU1 * iv;
                if (skipInvalid && (!valid[a] || !valid[b] || !valid[c] || !valid[d])) continue;
                indices.push(a, b, d, b, c, d);
            }
        }
        if (indices.length === 0) return new Geometry({ positions: new Float32Array(0) });
        const base: GeometryDescriptor = {
            positions,
            normals,
            uvs,
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    private static _appendTubeSegment(points: Float32Array, radius: number, radialSegments: number, closed: boolean, up: [number, number, number], outPositions: number[], outNormals: number[], outUvs: number[], outIndices: number[], vertexOffset: number): number {
        const pointCount = points.length / 3;
        if (pointCount < 2) return vertexOffset;
        const tangents = new Float32Array(pointCount * 3);
        for (let i = 0; i < pointCount; i++) {
            const prev = closed ? (i - 1 + pointCount) % pointCount : Math.max(i - 1, 0);
            const next = closed ? (i + 1) % pointCount : Math.min(i + 1, pointCount - 1);
            let tx = points[next * 3 + 0] - points[prev * 3 + 0];
            let ty = points[next * 3 + 1] - points[prev * 3 + 1];
            let tz = points[next * 3 + 2] - points[prev * 3 + 2];
            const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
            if (tLen > 1e-12) {
                tx /= tLen;
                ty /= tLen;
                tz /= tLen;
            } else {
                tx = 0;
                ty = 1;
                tz = 0;
            }
            tangents[i * 3 + 0] = tx;
            tangents[i * 3 + 1] = ty;
            tangents[i * 3 + 2] = tz;
        }
        const normals = new Float32Array(pointCount * 3);
        const binormals = new Float32Array(pointCount * 3);
        let upX = up[0], upY = up[1], upZ = up[2];
        const t0x = tangents[0], t0y = tangents[1], t0z = tangents[2];
        let n0x = t0y * upZ - t0z * upY;
        let n0y = t0z * upX - t0x * upZ;
        let n0z = t0x * upY - t0y * upX;
        let n0Len = Math.sqrt(n0x * n0x + n0y * n0y + n0z * n0z);
        if (n0Len < 1e-6) {
            if (Math.abs(t0x) < 0.9) { upX = 1; upY = 0; upZ = 0; }
            else { upX = 0; upY = 1; upZ = 0; }
            n0x = t0y * upZ - t0z * upY;
            n0y = t0z * upX - t0x * upZ;
            n0z = t0x * upY - t0y * upX;
            n0Len = Math.sqrt(n0x * n0x + n0y * n0y + n0z * n0z);
        }
        if (n0Len > 1e-12) {
            n0x /= n0Len;
            n0y /= n0Len;
            n0z /= n0Len;
        } else {
            n0x = 1;
            n0y = 0;
            n0z = 0;
        }
        normals[0] = n0x;
        normals[1] = n0y;
        normals[2] = n0z;
        let b0x = t0y * n0z - t0z * n0y;
        let b0y = t0z * n0x - t0x * n0z;
        let b0z = t0x * n0y - t0y * n0x;
        const b0Len = Math.sqrt(b0x * b0x + b0y * b0y + b0z * b0z);
        if (b0Len > 1e-12) {
            b0x /= b0Len;
            b0y /= b0Len;
            b0z /= b0Len;
        }
        binormals[0] = b0x;
        binormals[1] = b0y;
        binormals[2] = b0z;
        for (let i = 1; i < pointCount; i++) {
            const tPrevX = tangents[(i - 1) * 3 + 0];
            const tPrevY = tangents[(i - 1) * 3 + 1];
            const tPrevZ = tangents[(i - 1) * 3 + 2];
            const tCurX = tangents[i * 3 + 0];
            const tCurY = tangents[i * 3 + 1];
            const tCurZ = tangents[i * 3 + 2];
            let ax = tPrevY * tCurZ - tPrevZ * tCurY;
            let ay = tPrevZ * tCurX - tPrevX * tCurZ;
            let az = tPrevX * tCurY - tPrevY * tCurX;
            const aLen = Math.sqrt(ax * ax + ay * ay + az * az);
            let nx = normals[(i - 1) * 3 + 0];
            let ny = normals[(i - 1) * 3 + 1];
            let nz = normals[(i - 1) * 3 + 2];
            if (aLen > 1e-6) {
                ax /= aLen;
                ay /= aLen;
                az /= aLen;
                const dot = Math.max(-1, Math.min(1, tPrevX * tCurX + tPrevY * tCurY + tPrevZ * tCurZ));
                const angle = Math.acos(dot);
                const c = Math.cos(angle);
                const s = Math.sin(angle);
                const oneMinusC = 1 - c;
                const crossX = ay * nz - az * ny;
                const crossY = az * nx - ax * nz;
                const crossZ = ax * ny - ay * nx;
                const aDotN = ax * nx + ay * ny + az * nz;
                const rx = nx * c + crossX * s + ax * aDotN * oneMinusC;
                const ry = ny * c + crossY * s + ay * aDotN * oneMinusC;
                const rz = nz * c + crossZ * s + az * aDotN * oneMinusC;
                nx = rx;
                ny = ry;
                nz = rz;
            }
            const nDotT = nx * tCurX + ny * tCurY + nz * tCurZ;
            nx -= tCurX * nDotT;
            ny -= tCurY * nDotT;
            nz -= tCurZ * nDotT;
            const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nLen > 1e-12) {
                nx /= nLen;
                ny /= nLen;
                nz /= nLen;
            } else {
                nx = normals[0];
                ny = normals[1];
                nz = normals[2];
            }
            normals[i * 3 + 0] = nx;
            normals[i * 3 + 1] = ny;
            normals[i * 3 + 2] = nz;
            let bx = tCurY * nz - tCurZ * ny;
            let by = tCurZ * nx - tCurX * nz;
            let bz = tCurX * ny - tCurY * nx;
            const bLen = Math.sqrt(bx * bx + by * by + bz * bz);
            if (bLen > 1e-12) {
                bx /= bLen;
                by /= bLen;
                bz /= bLen;
            }
            binormals[i * 3 + 0] = bx;
            binormals[i * 3 + 1] = by;
            binormals[i * 3 + 2] = bz;
        }
        const ring = radialSegments + 1;
        const denomU = closed ? pointCount : (pointCount - 1);
        for (let i = 0; i < pointCount; i++) {
            const u = denomU > 0 ? (i / denomU) : 0;
            const px = points[i * 3 + 0];
            const py = points[i * 3 + 1];
            const pz = points[i * 3 + 2];
            const nx0 = normals[i * 3 + 0];
            const ny0 = normals[i * 3 + 1];
            const nz0 = normals[i * 3 + 2];
            const bx0 = binormals[i * 3 + 0];
            const by0 = binormals[i * 3 + 1];
            const bz0 = binormals[i * 3 + 2];
            for (let j = 0; j <= radialSegments; j++) {
                const v = radialSegments > 0 ? (j / radialSegments) : 0;
                const theta = v * Math.PI * 2;
                const cosT = Math.cos(theta);
                const sinT = Math.sin(theta);
                const rx = cosT * nx0 + sinT * bx0;
                const ry = cosT * ny0 + sinT * by0;
                const rz = cosT * nz0 + sinT * bz0;
                outPositions.push(px + radius * rx, py + radius * ry, pz + radius * rz);
                outNormals.push(rx, ry, rz);
                outUvs.push(u, v);
            }
        }
        const segmentCount = closed ? pointCount : (pointCount - 1);
        for (let i = 0; i < segmentCount; i++) {
            const next = closed ? ((i + 1) % pointCount) : (i + 1);
            for (let j = 0; j < radialSegments; j++) {
                const a = vertexOffset + ring * i + j;
                const b = vertexOffset + ring * next + j;
                const c = vertexOffset + ring * next + j + 1;
                const d = vertexOffset + ring * i + j + 1;
                outIndices.push(a, d, b, b, d, c);
            }
        }
        return vertexOffset + ring * pointCount;
    }

    private static _computeGridNormals(positions: Float32Array, valid: Uint8Array, gridX: number, gridY: number, outNormals: Float32Array): void {
        const gridX1 = gridX + 1;
        const gridY1 = gridY + 1;
        for (let iy = 0; iy < gridY1; iy++) {
            for (let ix = 0; ix < gridX1; ix++) {
                const i = ix + gridX1 * iy;
                const o = i * 3;
                if (!valid[i]) {
                    outNormals[o + 0] = 0;
                    outNormals[o + 1] = 0;
                    outNormals[o + 2] = 0;
                    continue;
                }
                const iL = ix > 0 ? (i - 1) : i;
                const iR = ix < gridX ? (i + 1) : i;
                const iD = iy > 0 ? (i - gridX1) : i;
                const iU = iy < gridY ? (i + gridX1) : i;
                const lx = valid[iL] ? positions[iL * 3 + 0] : positions[o + 0];
                const ly = valid[iL] ? positions[iL * 3 + 1] : positions[o + 1];
                const lz = valid[iL] ? positions[iL * 3 + 2] : positions[o + 2];
                const rx = valid[iR] ? positions[iR * 3 + 0] : positions[o + 0];
                const ry = valid[iR] ? positions[iR * 3 + 1] : positions[o + 1];
                const rz = valid[iR] ? positions[iR * 3 + 2] : positions[o + 2];
                const dx = valid[iD] ? positions[iD * 3 + 0] : positions[o + 0];
                const dy = valid[iD] ? positions[iD * 3 + 1] : positions[o + 1];
                const dz = valid[iD] ? positions[iD * 3 + 2] : positions[o + 2];
                const ux = valid[iU] ? positions[iU * 3 + 0] : positions[o + 0];
                const uy = valid[iU] ? positions[iU * 3 + 1] : positions[o + 1];
                const uz = valid[iU] ? positions[iU * 3 + 2] : positions[o + 2];
                const pux = rx - lx;
                const puy = ry - ly;
                const puz = rz - lz;
                const pvx = ux - dx;
                const pvy = uy - dy;
                const pvz = uz - dz;
                let nx = pvy * puz - pvz * puy;
                let ny = pvz * pux - pvx * puz;
                let nz = pvx * puy - pvy * pux;
                const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
                if (nLen > 1e-12) {
                    nx /= nLen;
                    ny /= nLen;
                    nz /= nLen;
                } else {
                    nx = 0;
                    ny = 1;
                    nz = 0;
                }
                outNormals[o + 0] = nx;
                outNormals[o + 1] = ny;
                outNormals[o + 2] = nz;
            }
        }
    }

    private static _makeDoubleSided(descriptor: GeometryDescriptor): GeometryDescriptor {
        const positions = descriptor.positions;
        assert(!!positions, "Geometry: positions are required for double-sided geometry generation.");
        const normals = descriptor.normals ?? new Float32Array((positions.length / 3) * 3);
        const tangents = descriptor.tangents ?? null;
        const uvs = descriptor.uvs ?? new Float32Array((positions.length / 3) * 2);
        const uvs1 = descriptor.uvs1 ?? new Float32Array((positions.length / 3) * 2);
        const indices = descriptor.indices;
        if (!indices) return descriptor;
        const baseVertexCount = positions.length / 3;
        const outPositions = new Float32Array(positions.length * 2);
        outPositions.set(positions, 0);
        outPositions.set(positions, positions.length);
        const outNormals = new Float32Array(normals.length * 2);
        outNormals.set(normals, 0);
        for (let i = 0; i < baseVertexCount; i++) {
            const o = i * 3;
            outNormals[normals.length + o + 0] = -normals[o + 0];
            outNormals[normals.length + o + 1] = -normals[o + 1];
            outNormals[normals.length + o + 2] = -normals[o + 2];
        }
        const outUvs = new Float32Array(uvs.length * 2);
        outUvs.set(uvs, 0);
        outUvs.set(uvs, uvs.length);
        const outUvs1 = new Float32Array(uvs1.length * 2);
        outUvs1.set(uvs1, 0);
        outUvs1.set(uvs1, uvs1.length);
        let outTangents: Float32Array | undefined;
        if (tangents) {
            outTangents = new Float32Array(tangents.length * 2);
            outTangents.set(tangents, 0);
            for (let i = 0; i < baseVertexCount; i++) {
                const o = i * 4;
                outTangents[tangents.length + o + 0] = tangents[o + 0];
                outTangents[tangents.length + o + 1] = tangents[o + 1];
                outTangents[tangents.length + o + 2] = tangents[o + 2];
                outTangents[tangents.length + o + 3] = -tangents[o + 3];
            }
        }
        const outIndices = new Uint32Array(indices.length * 2);
        outIndices.set(indices, 0);
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i + 0];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];
            const o = indices.length + i;
            outIndices[o + 0] = baseVertexCount + i0;
            outIndices[o + 1] = baseVertexCount + i2;
            outIndices[o + 2] = baseVertexCount + i1;
        }
        return {
            ...descriptor,
            positions: outPositions,
            normals: outNormals,
            tangents: outTangents,
            uvs: outUvs,
            uvs1: outUvs1,
            indices: outIndices
        };
    }
}

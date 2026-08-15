/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp01, createBuffer, linearIndexToNdIndex, normalizePositiveIntShape, resolveGPUBuffer } from "../utils";
import { Transform } from "../core/transform";
import { WasmMemoryView, assertWasmF32View, assertWasmRecordCount, assertWasmCapacity, resolveWasmRecordCount, validateWasmRecordRange, growWasmCapacity } from "../wasm";
import { Bounds3, boundsFromBox, boundsFromBoxAndSphere, boundsFromSphere, emptyBounds, transformBounds } from "./bounds";

export type SplatFieldColorSpace = "linear" | "srgb";
export type SplatFieldSHDegree = 0 | 1 | 2 | 3;

export type SplatFieldWasmRefreshOptions = {
    splatCount?: number;
    keepCPUData?: boolean;
    recomputeBounds?: boolean;
    shDegree?: SplatFieldSHDegree;
};

export type SplatFieldWasmChannelOptions = SplatFieldWasmRefreshOptions & {
    capacity?: number;
};

export type SplatFieldWasmSources = {
    centerOpacity?: WasmMemoryView<Float32Array> | null;
    rotation?: WasmMemoryView<Float32Array> | null;
    scale?: WasmMemoryView<Float32Array> | null;
    color?: WasmMemoryView<Float32Array> | null;
    sphericalHarmonics?: WasmMemoryView<Float32Array> | null;
};

export type SplatFieldWasmPackedDataOptions = SplatFieldWasmChannelOptions;

export type SplatFieldDescriptor = {
    positions?: Float32Array;
    rotations?: Float32Array;
    scales?: Float32Array;
    opacities?: Float32Array;
    colors?: Float32Array;
    sh0?: Float32Array;
    sh1?: Float32Array;
    sh2?: Float32Array;
    sh3?: Float32Array;
    shDegree?: SplatFieldSHDegree;
    centerOpacityBuffer?: GPUBuffer | { buffer: GPUBuffer };
    rotationBuffer?: GPUBuffer | { buffer: GPUBuffer };
    scaleBuffer?: GPUBuffer | { buffer: GPUBuffer };
    colorBuffer?: GPUBuffer | { buffer: GPUBuffer };
    shBuffer?: GPUBuffer | { buffer: GPUBuffer };
    wasmCenterOpacity?: WasmMemoryView<Float32Array>;
    wasmRotation?: WasmMemoryView<Float32Array>;
    wasmScale?: WasmMemoryView<Float32Array>;
    wasmColor?: WasmMemoryView<Float32Array>;
    wasmSphericalHarmonics?: WasmMemoryView<Float32Array>;
    wasmCapacity?: number;
    splatCount?: number;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ownBuffers?: boolean;
    colorSpace?: SplatFieldColorSpace;
    opacityScale?: number;
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    ndShape?: number[];
};

type BoundsSourceMode = "none" | "explicit" | "computed";
type SplatFieldWasmChannel = "centerOpacity" | "rotation" | "scale" | "color" | "sphericalHarmonics";

const UNIFORM_FLOAT_COUNT = 4;
const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;
const SPLAT_VEC4_FLOATS = 4;
const SPLAT_F32_BYTES = 4;
const SPLAT_VEC4_BYTES = SPLAT_VEC4_FLOATS * SPLAT_F32_BYTES;

const srgbChannelToLinear = (value: number): number => { const x = clamp01(value); if (x <= 0.04045) return x / 12.92; return Math.pow((x + 0.055) / 1.055, 2.4); };

const isColorSpace = (value: unknown): value is SplatFieldColorSpace => value === "linear" || value === "srgb";

const isSHDegree = (value: unknown): value is SplatFieldSHDegree => value === 0 || value === 1 || value === 2 || value === 3;

const shCoeffCount = (degree: SplatFieldSHDegree): number => {
    switch (degree) {
        case 0: return 1;
        case 1: return 4;
        case 2: return 9;
        case 3: return 16;
    }
};

const shFloatCount = (degree: SplatFieldSHDegree): number => shCoeffCount(degree) * 3;

const validateCount = (length: number, stride: number, label: string): number => { assert((length % stride) === 0, `SplatField: ${label} length must be a multiple of ${stride}.`); return (length / stride) | 0; };

const splatWasmFieldName = (channel: SplatFieldWasmChannel): string => channel === "sphericalHarmonics" ? "wasmSphericalHarmonics" : `wasm${channel[0]!.toUpperCase()}${channel.slice(1)}`;

const splatWasmComponents = (channel: SplatFieldWasmChannel, shDegree: SplatFieldSHDegree): number => channel === "sphericalHarmonics" ? shFloatCount(shDegree) : SPLAT_VEC4_FLOATS;

const makeWhiteColorData = (count: number): Float32Array => { const out = new Float32Array(count * 4); for (let i = 0; i < count; i++) { const base = i * 4; out[base + 0] = 1; out[base + 1] = 1; out[base + 2] = 1; out[base + 3] = 1; } return out; };

const resolveColorLayout = (colors: Float32Array, count: number | null): { stride: 3 | 4; count: number; } => {
    if (count !== null) {
        if (colors.length === count * 4) return { stride: 4, count };
        if (colors.length === count * 3) return { stride: 3, count };
        assert(false, `SplatField: colors length must equal splatCount * 3 or splatCount * 4.`);
    }
    if (colors.length === 0) return { stride: 4, count: 0 };
    const isRGBA = (colors.length % 4) === 0;
    const isRGB = (colors.length % 3) === 0;
    assert(isRGBA || isRGB, "SplatField: colors length must be a multiple of 3 or 4.");
    assert(!(isRGBA && isRGB), "SplatField: colors length is ambiguous without splatCount or non-color attribute counts.");
    if (isRGBA) return { stride: 4, count: (colors.length / 4) | 0 };
    return { stride: 3, count: (colors.length / 3) | 0 };
};

const validateExternalPackedBufferSize = (buffer: GPUBuffer, splatCount: number, label: string): void => { const minByteSize = splatCount * 16; assert(buffer.size >= minByteSize, `SplatField: ${label} size must be >= splatCount * 16 bytes (${minByteSize}).`); };

const validateExternalSHBufferSize = (buffer: GPUBuffer, splatCount: number, degree: SplatFieldSHDegree): void => { const minByteSize = splatCount * shFloatCount(degree) * 4; assert(buffer.size >= minByteSize, `SplatField: shBuffer size must be >= splatCount * ${shFloatCount(degree)} * 4 bytes (${minByteSize}).`); };

const hasCPUShInputs = (desc: SplatFieldDescriptor): boolean => !!(desc.sh0 || desc.sh1 || desc.sh2 || desc.sh3);

const hasWasmInputs = (desc: SplatFieldDescriptor): boolean => !!(desc.wasmCenterOpacity || desc.wasmRotation || desc.wasmScale || desc.wasmColor || desc.wasmSphericalHarmonics);

const resolveSHDegreeFromCPU = (desc: SplatFieldDescriptor): SplatFieldSHDegree => {
    assert(!!desc.sh0, "SplatField: sh0 is required when using spherical harmonic coefficients.");
    if (desc.sh3) { assert(!!desc.sh1 && !!desc.sh2, "SplatField: sh3 requires sh0, sh1, and sh2."); return 3; }
    if (desc.sh2) { assert(!!desc.sh1, "SplatField: sh2 requires sh0 and sh1."); return 2; }
    if (desc.sh1) return 1;
    return 0;
};

const validateCPUShInputs = (desc: SplatFieldDescriptor, countHint: number | null): { count: number; degree: SplatFieldSHDegree; data: Float32Array } => {
    const inferredDegree = resolveSHDegreeFromCPU(desc);
    if (desc.shDegree !== undefined) { assert(isSHDegree(desc.shDegree), "SplatField: shDegree must be 0, 1, 2, or 3."); assert(desc.shDegree === inferredDegree, "SplatField: shDegree must match the provided spherical harmonic coefficient arrays."); }
    const sh0 = desc.sh0!;
    const count = countHint ?? validateCount(sh0.length, 3, "sh0");
    assert(Number.isInteger(count) && count >= 0, "SplatField: splatCount must be an integer >= 0.");
    assert(sh0.length === count * 3, "SplatField: sh0 length must equal splatCount * 3.");
    if (inferredDegree >= 1) assert(desc.sh1 && desc.sh1.length === count * 9, "SplatField: sh1 length must equal splatCount * 9.");
    else assert(!desc.sh1, "SplatField: shDegree 0 must not provide sh1.");
    if (inferredDegree >= 2) assert(desc.sh2 && desc.sh2.length === count * 15, "SplatField: sh2 length must equal splatCount * 15.");
    else assert(!desc.sh2, "SplatField: shDegree 0 or 1 must not provide sh2.");
    if (inferredDegree >= 3) assert(desc.sh3 && desc.sh3.length === count * 21, "SplatField: sh3 length must equal splatCount * 21.");
    else assert(!desc.sh3, "SplatField: shDegree 0, 1, or 2 must not provide sh3.");
    const coeffFloats = shFloatCount(inferredDegree);
    const out = new Float32Array(count * coeffFloats);
    for (let i = 0; i < count; i++) {
        let dst = i * coeffFloats;
        out[dst++] = sh0[i * 3 + 0] ?? 0;
        out[dst++] = sh0[i * 3 + 1] ?? 0;
        out[dst++] = sh0[i * 3 + 2] ?? 0;
        if (inferredDegree >= 1) { const src = i * 9; out.set(desc.sh1!.subarray(src, src + 9), dst); dst += 9; }
        if (inferredDegree >= 2) { const src = i * 15; out.set(desc.sh2!.subarray(src, src + 15), dst); dst += 15; }
        if (inferredDegree >= 3) { const src = i * 21; out.set(desc.sh3!.subarray(src, src + 21), dst); }
    }
    return { count, degree: inferredDegree, data: out };
};

export class SplatField {
    readonly transform: Transform = new Transform();
    name: string | null = null;
    visible: boolean = true;
    boundsMin: [number, number, number] = [0, 0, 0];
    boundsMax: [number, number, number] = [0, 0, 0];
    boundsCenter: [number, number, number] = [0, 0, 0];
    boundsRadius: number = 0;
    centerOpacityBuffer: GPUBuffer | null = null;
    rotationBuffer: GPUBuffer | null = null;
    scaleBuffer: GPUBuffer | null = null;
    colorBuffer: GPUBuffer | null = null;
    shBuffer: GPUBuffer | null = null;
    uniformBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;
    bindGroupKey: string | null = null;
    private _splatCount: number = 0;
    private _centerOpacityCPU: Float32Array | null = null;
    private _rotationCPU: Float32Array | null = null;
    private _scaleCPU: Float32Array | null = null;
    private _colorCPU: Float32Array | null = null;
    private _shCPU: Float32Array | null = null;
    private _wasmCenterOpacitySource: WasmMemoryView<Float32Array> | null = null;
    private _wasmRotationSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmScaleSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmColorSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmSphericalHarmonicsSource: WasmMemoryView<Float32Array> | null = null;
    private _keepCPUData: boolean = false;
    private _ndShape: number[] | null = null;
    private _boundsSource: BoundsSourceMode = "none";
    private _dataDirty: boolean = true;
    private _uniformDirty: boolean = true;
    private _colorSpace: SplatFieldColorSpace = "linear";
    private _opacityScale: number = 1.0;
    private _centerOpacityOwned: boolean = false;
    private _rotationOwned: boolean = false;
    private _scaleOwned: boolean = false;
    private _colorOwned: boolean = false;
    private _shOwned: boolean = false;
    private _wasmCenterOpacityDirty: boolean = false;
    private _wasmRotationDirty: boolean = false;
    private _wasmScaleDirty: boolean = false;
    private _wasmColorDirty: boolean = false;
    private _wasmSphericalHarmonicsDirty: boolean = false;
    private _centerOpacityWasmManaged: boolean = false;
    private _rotationWasmManaged: boolean = false;
    private _scaleWasmManaged: boolean = false;
    private _colorWasmManaged: boolean = false;
    private _sphericalHarmonicsWasmManaged: boolean = false;
    private _wasmCenterOpacityCapacity: number = 0;
    private _wasmRotationCapacity: number = 0;
    private _wasmScaleCapacity: number = 0;
    private _wasmColorCapacity: number = 0;
    private _wasmSphericalHarmonicsCapacity: number = 0;
    private _wasmCenterOpacityCapacityHint: number = 0;
    private _wasmRotationCapacityHint: number = 0;
    private _wasmScaleCapacityHint: number = 0;
    private _wasmColorCapacityHint: number = 0;
    private _wasmSphericalHarmonicsCapacityHint: number = 0;
    private _externalColorBufferSrgb: boolean = false;
    private _shDegree: SplatFieldSHDegree = 0;
    private _usesSphericalHarmonics: boolean = false;

    constructor(desc: SplatFieldDescriptor = {}) {
        if (desc.name !== undefined) this.name = desc.name;
        if (desc.visible !== undefined) this.visible = !!desc.visible;
        if (desc.keepCPUData !== undefined) this._keepCPUData = !!desc.keepCPUData;
        if (desc.ndShape !== undefined) this.ndShape = desc.ndShape;
        if (desc.colorSpace !== undefined) { assert(isColorSpace(desc.colorSpace), `SplatField: invalid colorSpace '${String(desc.colorSpace)}'.`); this._colorSpace = desc.colorSpace; }
        if (desc.shDegree !== undefined) assert(isSHDegree(desc.shDegree), "SplatField: shDegree must be 0, 1, 2, or 3.");
        if (desc.opacityScale !== undefined) this._opacityScale = Math.max(0, desc.opacityScale);
        this.applyExplicitBounds(desc);
        const hasExternalWasmInputs = hasWasmInputs(desc);
        const hasShInputs = hasCPUShInputs(desc) || !!desc.shBuffer || !!desc.wasmSphericalHarmonics;
        const hasDirectColorInputs = !!(desc.colors || desc.colorBuffer || desc.wasmColor);
        assert(!(hasShInputs && hasDirectColorInputs), "SplatField: direct colors and spherical harmonic coefficients cannot be mixed.");
        assert(!(!hasShInputs && desc.shDegree !== undefined), "SplatField: shDegree requires sh0, shBuffer, or wasmSphericalHarmonics.");
        const hasCPUInputs = !!(desc.positions || desc.rotations || desc.scales || desc.opacities || desc.colors || hasCPUShInputs(desc));
        const hasExternalInputs = !!(desc.centerOpacityBuffer || desc.rotationBuffer || desc.scaleBuffer || desc.colorBuffer || desc.shBuffer);
        assert(!(hasExternalWasmInputs && (hasCPUInputs || hasExternalInputs)), "SplatField: CPU-array, external-buffer, and external-WebAssembly descriptors cannot be mixed.");
        assert(!(hasCPUInputs && hasExternalInputs), "SplatField: CPU-array and external-buffer descriptors cannot be mixed.");
        if (hasExternalWasmInputs) {
            if (desc.wasmSphericalHarmonics) assert(desc.shDegree !== undefined, "SplatField: shDegree is required when using wasmSphericalHarmonics.");
            const wasmCapacity = assertWasmCapacity(desc.wasmCapacity, "SplatField: wasmCapacity");
            this.setWasmPackedData({
                centerOpacity: desc.wasmCenterOpacity ?? null,
                rotation: desc.wasmRotation ?? null,
                scale: desc.wasmScale ?? null,
                color: desc.wasmColor ?? null,
                sphericalHarmonics: desc.wasmSphericalHarmonics ?? null
            }, { splatCount: desc.splatCount, capacity: wasmCapacity, keepCPUData: this._keepCPUData, shDegree: desc.shDegree });
        } else if (hasExternalInputs) this.setExternalData(desc);
        else if (hasCPUInputs) this.setCPUData(desc);
        else if (desc.splatCount !== undefined) {
            assert(Number.isInteger(desc.splatCount) && desc.splatCount >= 0, "SplatField: splatCount must be an integer >= 0.");
            this._splatCount = desc.splatCount | 0;
            this._dataDirty = false;
        }
    }

    private applyExplicitBounds(desc: SplatFieldDescriptor): void {
        if (desc.boundsMin && desc.boundsMax) {
            const bounds = boundsFromBox(desc.boundsMin, desc.boundsMax);
            this.setBounds(bounds, "explicit");
            if (desc.boundsCenter) this.boundsCenter = [desc.boundsCenter[0], desc.boundsCenter[1], desc.boundsCenter[2]];
            if (desc.boundsRadius !== undefined) this.boundsRadius = Math.max(0, desc.boundsRadius);
            return;
        }
        if (desc.boundsCenter || desc.boundsRadius !== undefined) {
            const center = desc.boundsCenter ?? [0, 0, 0];
            const radius = desc.boundsRadius ?? 0;
            this.setBounds(boundsFromSphere(center, radius), "explicit");
        }
    }

    private setBounds(bounds: Bounds3, source: BoundsSourceMode): void {
        this.boundsMin = [bounds.boxMin[0], bounds.boxMin[1], bounds.boxMin[2]];
        this.boundsMax = [bounds.boxMax[0], bounds.boxMax[1], bounds.boxMax[2]];
        this.boundsCenter = [bounds.sphereCenter[0], bounds.sphereCenter[1], bounds.sphereCenter[2]];
        this.boundsRadius = bounds.sphereRadius;
        this._boundsSource = source;
    }

    private clearComputedBoundsIfNeeded(): void {
        if (this._boundsSource !== "computed") return;
        this._boundsSource = "none";
        this.boundsMin = [0, 0, 0];
        this.boundsMax = [0, 0, 0];
        this.boundsCenter = [0, 0, 0];
        this.boundsRadius = 0;
    }

    private replaceCenterOpacityBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.centerOpacityBuffer && this.centerOpacityBuffer !== buffer && this._centerOpacityOwned) this.centerOpacityBuffer.destroy();
        this.centerOpacityBuffer = buffer;
        this._centerOpacityOwned = owned;
    }

    private replaceRotationBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.rotationBuffer && this.rotationBuffer !== buffer && this._rotationOwned) this.rotationBuffer.destroy();
        this.rotationBuffer = buffer;
        this._rotationOwned = owned;
    }

    private replaceScaleBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.scaleBuffer && this.scaleBuffer !== buffer && this._scaleOwned) this.scaleBuffer.destroy();
        this.scaleBuffer = buffer;
        this._scaleOwned = owned;
    }

    private replaceColorBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.colorBuffer && this.colorBuffer !== buffer && this._colorOwned) this.colorBuffer.destroy();
        this.colorBuffer = buffer;
        this._colorOwned = owned;
    }

    private replaceSHBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.shBuffer && this.shBuffer !== buffer && this._shOwned) this.shBuffer.destroy();
        this.shBuffer = buffer;
        this._shOwned = owned;
    }

    private hasExternalWasmSources(): boolean {
        return !!(this._wasmCenterOpacitySource || this._wasmRotationSource || this._wasmScaleSource || this._wasmColorSource || this._wasmSphericalHarmonicsSource);
    }

    private hasDirtyWasmSources(): boolean {
        return this._wasmCenterOpacityDirty || this._wasmRotationDirty || this._wasmScaleDirty || this._wasmColorDirty || this._wasmSphericalHarmonicsDirty;
    }

    private clearNonWasmDataForWasm(): void {
        this.replaceCenterOpacityBuffer(null, false);
        this.replaceRotationBuffer(null, false);
        this.replaceScaleBuffer(null, false);
        this.replaceColorBuffer(null, false);
        this.replaceSHBuffer(null, false);
        this.dropCPUData();
        this._externalColorBufferSrgb = false;
        this._usesSphericalHarmonics = false;
        this._shDegree = 0;
        this._uniformDirty = true;
        this._dataDirty = false;
        this.bindGroupKey = null;
    }

    private enterWasmSourceFamily(): void {
        if (this.hasExternalWasmSources()) return;
        this.clearNonWasmDataForWasm();
    }

    private clearWasmCenterOpacityState(destroyManagedBuffer: boolean): void {
        this._wasmCenterOpacitySource = null;
        this._wasmCenterOpacityDirty = false;
        this._wasmCenterOpacityCapacityHint = 0;
        if (destroyManagedBuffer && this._centerOpacityWasmManaged) {
            this.replaceCenterOpacityBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._centerOpacityWasmManaged = false;
        this._wasmCenterOpacityCapacity = 0;
    }

    private clearWasmRotationState(destroyManagedBuffer: boolean): void {
        this._wasmRotationSource = null;
        this._wasmRotationDirty = false;
        this._wasmRotationCapacityHint = 0;
        if (destroyManagedBuffer && this._rotationWasmManaged) {
            this.replaceRotationBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._rotationWasmManaged = false;
        this._wasmRotationCapacity = 0;
    }

    private clearWasmScaleState(destroyManagedBuffer: boolean): void {
        this._wasmScaleSource = null;
        this._wasmScaleDirty = false;
        this._wasmScaleCapacityHint = 0;
        if (destroyManagedBuffer && this._scaleWasmManaged) {
            this.replaceScaleBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._scaleWasmManaged = false;
        this._wasmScaleCapacity = 0;
    }

    private clearWasmColorState(destroyManagedBuffer: boolean): void {
        const hadColorSource = !!this._wasmColorSource || this._colorWasmManaged;
        this._wasmColorSource = null;
        this._wasmColorDirty = false;
        this._wasmColorCapacityHint = 0;
        if (destroyManagedBuffer && this._colorWasmManaged) {
            this.replaceColorBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._colorWasmManaged = false;
        this._wasmColorCapacity = 0;
        this._externalColorBufferSrgb = false;
        if (hadColorSource && this.hasExternalWasmSources()) this._dataDirty = true;
    }

    private clearWasmSphericalHarmonicsState(destroyManagedBuffer: boolean): void {
        const hadSHSource = !!this._wasmSphericalHarmonicsSource || this._sphericalHarmonicsWasmManaged;
        this._wasmSphericalHarmonicsSource = null;
        this._wasmSphericalHarmonicsDirty = false;
        this._wasmSphericalHarmonicsCapacityHint = 0;
        if (destroyManagedBuffer && this._sphericalHarmonicsWasmManaged) {
            this.replaceSHBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._sphericalHarmonicsWasmManaged = false;
        this._wasmSphericalHarmonicsCapacity = 0;
        this._shCPU = null;
        this._usesSphericalHarmonics = false;
        this._shDegree = 0;
        this._uniformDirty = true;
        if (hadSHSource && this.hasExternalWasmSources() && !this._wasmColorSource) this._dataDirty = true;
    }

    private clearAllWasmState(destroyManagedBuffers: boolean): void {
        this.clearWasmCenterOpacityState(destroyManagedBuffers);
        this.clearWasmRotationState(destroyManagedBuffers);
        this.clearWasmScaleState(destroyManagedBuffers);
        this.clearWasmColorState(destroyManagedBuffers);
        this.clearWasmSphericalHarmonicsState(destroyManagedBuffers);
    }

    private primaryWasmChannel(): SplatFieldWasmChannel | null {
        if (this._wasmCenterOpacitySource) return "centerOpacity";
        if (this._wasmRotationSource) return "rotation";
        if (this._wasmScaleSource) return "scale";
        if (this._wasmColorSource) return "color";
        if (this._wasmSphericalHarmonicsSource) return "sphericalHarmonics";
        return null;
    }

    private resolveWasmSplatCount(channel: SplatFieldWasmChannel, source: WasmMemoryView<Float32Array>, explicitSplatCount: number | undefined): number {
        const field = splatWasmFieldName(channel);
        const primary = this.primaryWasmChannel();
        const components = splatWasmComponents(channel, this._shDegree);
        if (explicitSplatCount !== undefined) {
            const count = assertWasmRecordCount(explicitSplatCount, "SplatField: splatCount");
            assert(!primary || channel === primary || count === this._splatCount, `SplatField: refreshWasm${field.slice(4)} splatCount must match the current splatCount when another wasm source is active; call refreshFromWasm() to update splat count.`);
            validateWasmRecordRange(source, count, components, `SplatField: ${field}`, "splatCount");
            return count;
        }
        if (channel === primary) return resolveWasmRecordCount(source, undefined, components, `SplatField: ${field}`, "SplatField: splatCount", "splatCount");
        assert(this._splatCount > 0 || source.length === 0, `SplatField: splatCount is required when using ${field} without a primary wasm source.`);
        validateWasmRecordRange(source, this._splatCount, components, `SplatField: ${field}`, "splatCount");
        return this._splatCount;
    }

    private setSplatCountFromWasm(splatCount: number): void {
        const count = assertWasmRecordCount(splatCount, "SplatField: splatCount");
        const changed = count !== this._splatCount;
        this._splatCount = count;
        if (!changed) return;
        if (this._wasmCenterOpacitySource) this._wasmCenterOpacityDirty = true;
        if (this._wasmRotationSource) this._wasmRotationDirty = true;
        if (this._wasmScaleSource) this._wasmScaleDirty = true;
        if (this._wasmColorSource) this._wasmColorDirty = true;
        if (this._wasmSphericalHarmonicsSource) this._wasmSphericalHarmonicsDirty = true;
        if (!this._wasmColorSource && this.hasExternalWasmSources()) this._dataDirty = true;
    }

    private setWasmChannelSource(channel: SplatFieldWasmChannel, source: WasmMemoryView<Float32Array> | null, capacity: number | undefined): boolean {
        if (source === null) {
            if (channel === "centerOpacity") this.clearWasmCenterOpacityState(true);
            else if (channel === "rotation") this.clearWasmRotationState(true);
            else if (channel === "scale") this.clearWasmScaleState(true);
            else if (channel === "color") this.clearWasmColorState(true);
            else this.clearWasmSphericalHarmonicsState(true);
            return false;
        }
        this.enterWasmSourceFamily();
        const field = splatWasmFieldName(channel);
        const wasmSource = assertWasmF32View(source, `SplatField: ${field}`);
        const capacityHint = assertWasmCapacity(capacity, `SplatField: ${field} capacity`);
        if (channel === "centerOpacity") {
            this._wasmCenterOpacityCapacityHint = capacityHint;
            if (!this._centerOpacityWasmManaged) { this.replaceCenterOpacityBuffer(null, false); this._wasmCenterOpacityCapacity = 0; this.bindGroupKey = null; }
            this._wasmCenterOpacitySource = wasmSource;
            this._centerOpacityCPU = null;
        } else if (channel === "rotation") {
            this._wasmRotationCapacityHint = capacityHint;
            if (!this._rotationWasmManaged) { this.replaceRotationBuffer(null, false); this._wasmRotationCapacity = 0; this.bindGroupKey = null; }
            this._wasmRotationSource = wasmSource;
            this._rotationCPU = null;
        } else if (channel === "scale") {
            this._wasmScaleCapacityHint = capacityHint;
            if (!this._scaleWasmManaged) { this.replaceScaleBuffer(null, false); this._wasmScaleCapacity = 0; this.bindGroupKey = null; }
            this._wasmScaleSource = wasmSource;
            this._scaleCPU = null;
        } else if (channel === "color") {
            this.clearWasmSphericalHarmonicsState(true);
            this._wasmColorCapacityHint = capacityHint;
            if (!this._colorWasmManaged) { this.replaceColorBuffer(null, false); this._wasmColorCapacity = 0; this.bindGroupKey = null; }
            this._wasmColorSource = wasmSource;
            this._colorCPU = null;
            this._externalColorBufferSrgb = this._colorSpace === "srgb";
            this._usesSphericalHarmonics = false;
            this._shDegree = 0;
            this._uniformDirty = true;
        } else {
            this.clearWasmColorState(true);
            this._wasmSphericalHarmonicsCapacityHint = capacityHint;
            if (!this._sphericalHarmonicsWasmManaged) { this.replaceSHBuffer(null, false); this._wasmSphericalHarmonicsCapacity = 0; this.bindGroupKey = null; }
            this._wasmSphericalHarmonicsSource = wasmSource;
            this._shCPU = null;
            this._externalColorBufferSrgb = false;
            this._usesSphericalHarmonics = true;
            this._uniformDirty = true;
        }
        return true;
    }

    private copyWasmActiveRange(source: WasmMemoryView<Float32Array>, elementCount: number): Float32Array {
        const view = source.array();
        return new Float32Array(view.subarray(0, elementCount));
    }

    private ensureWasmCenterOpacityBuffer(device: GPUDevice, splatCount: number): void {
        const required = Math.max(splatCount, this._wasmCenterOpacityCapacityHint);
        if (required <= 0) return;
        if (this.centerOpacityBuffer && this._centerOpacityWasmManaged && this._wasmCenterOpacityCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmCenterOpacityCapacity);
        this.replaceCenterOpacityBuffer(device.createBuffer({ label: "SplatField.wasmCenterOpacity", size: capacity * SPLAT_VEC4_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._centerOpacityWasmManaged = true;
        this._wasmCenterOpacityCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmRotationBuffer(device: GPUDevice, splatCount: number): void {
        const required = Math.max(splatCount, this._wasmRotationCapacityHint);
        if (required <= 0) return;
        if (this.rotationBuffer && this._rotationWasmManaged && this._wasmRotationCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmRotationCapacity);
        this.replaceRotationBuffer(device.createBuffer({ label: "SplatField.wasmRotation", size: capacity * SPLAT_VEC4_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._rotationWasmManaged = true;
        this._wasmRotationCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmScaleBuffer(device: GPUDevice, splatCount: number): void {
        const required = Math.max(splatCount, this._wasmScaleCapacityHint);
        if (required <= 0) return;
        if (this.scaleBuffer && this._scaleWasmManaged && this._wasmScaleCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmScaleCapacity);
        this.replaceScaleBuffer(device.createBuffer({ label: "SplatField.wasmScale", size: capacity * SPLAT_VEC4_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._scaleWasmManaged = true;
        this._wasmScaleCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmColorBuffer(device: GPUDevice, splatCount: number): void {
        const required = Math.max(splatCount, this._wasmColorCapacityHint);
        if (required <= 0) return;
        if (this.colorBuffer && this._colorWasmManaged && this._wasmColorCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmColorCapacity);
        this.replaceColorBuffer(device.createBuffer({ label: "SplatField.wasmColor", size: capacity * SPLAT_VEC4_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._colorWasmManaged = true;
        this._wasmColorCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmSphericalHarmonicsBuffer(device: GPUDevice, splatCount: number): void {
        const required = Math.max(splatCount, this._wasmSphericalHarmonicsCapacityHint);
        if (required <= 0) return;
        const bytesPerSplat = shFloatCount(this._shDegree) * SPLAT_F32_BYTES;
        const requiredBytes = required * bytesPerSplat;
        if (this.shBuffer && this._sphericalHarmonicsWasmManaged && this._wasmSphericalHarmonicsCapacity >= required && this.shBuffer.size >= requiredBytes) return;
        const capacity = growWasmCapacity(required, this._wasmSphericalHarmonicsCapacity);
        this.replaceSHBuffer(device.createBuffer({ label: "SplatField.wasmSphericalHarmonics", size: capacity * bytesPerSplat, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._sphericalHarmonicsWasmManaged = true;
        this._wasmSphericalHarmonicsCapacity = capacity;
        this.bindGroupKey = null;
    }

    private computeBoundsFromPackedData(centerOpacity: Float32Array, scales: Float32Array, splatCount: number): void {
        if (splatCount <= 0) return;
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < splatCount; i++) {
            const base = i * 4;
            const x = centerOpacity[base + 0];
            const y = centerOpacity[base + 1];
            const z = centerOpacity[base + 2];
            const radius = 3 * Math.max(Math.abs(scales[base + 0]), Math.abs(scales[base + 1]), Math.abs(scales[base + 2]));
            minX = Math.min(minX, x - radius);
            minY = Math.min(minY, y - radius);
            minZ = Math.min(minZ, z - radius);
            maxX = Math.max(maxX, x + radius);
            maxY = Math.max(maxY, y + radius);
            maxZ = Math.max(maxZ, z + radius);
        }
        this.setBounds(boundsFromBox([minX, minY, minZ], [maxX, maxY, maxZ]), "computed");
    }

    private computeBoundsFromWasmSources(splatCount: number): boolean {
        const centerOpacitySource = this._wasmCenterOpacitySource;
        const scaleSource = this._wasmScaleSource;
        if (!centerOpacitySource || !scaleSource || splatCount <= 0) return false;
        centerOpacitySource.refresh();
        scaleSource.refresh();
        assertWasmF32View(centerOpacitySource, "SplatField: wasmCenterOpacity");
        assertWasmF32View(scaleSource, "SplatField: wasmScale");
        validateWasmRecordRange(centerOpacitySource, splatCount, SPLAT_VEC4_FLOATS, "SplatField: wasmCenterOpacity", "splatCount");
        validateWasmRecordRange(scaleSource, splatCount, SPLAT_VEC4_FLOATS, "SplatField: wasmScale", "splatCount");
        this.computeBoundsFromPackedData(centerOpacitySource.array(), scaleSource.array(), splatCount);
        return true;
    }

    private updateWasmBounds(options: SplatFieldWasmRefreshOptions): void {
        if (options.recomputeBounds && this._boundsSource !== "explicit" && this.computeBoundsFromWasmSources(this._splatCount)) return;
        this.clearComputedBoundsIfNeeded();
    }

    private assertWasmCoreSourcesAvailable(method: string): void {
        if (this._splatCount <= 0) return;
        assert(!!this._wasmCenterOpacitySource && !!this._wasmRotationSource && !!this._wasmScaleSource, `SplatField: wasmCenterOpacity, wasmRotation, and wasmScale are required for ${method}.`);
    }

    private assertCanSetSingleWasmCoreChannel(method: string): void {
        assert(this.hasExternalWasmSources(), `SplatField: ${method} cannot replace a non-wasm source family by itself; use setWasmPackedData() with wasmCenterOpacity, wasmRotation, and wasmScale for initial wasm source-family replacement.`);
    }

    private setCPUData(desc: SplatFieldDescriptor): void {
        this.clearAllWasmState(true);
        const positions = desc.positions ?? null;
        const rotations = desc.rotations ?? null;
        const scales = desc.scales ?? null;
        const opacities = desc.opacities ?? null;
        const colors = desc.colors ?? null;
        const usesSH = hasCPUShInputs(desc);
        const positionCount = positions ? validateCount(positions.length, 3, "positions") : null;
        const rotationCount = rotations ? validateCount(rotations.length, 4, "rotations") : null;
        const scaleCount = scales ? validateCount(scales.length, 3, "scales") : null;
        const opacityCount = opacities ? opacities.length : null;
        const inferredCount = desc.splatCount ?? positionCount ?? rotationCount ?? scaleCount ?? opacityCount ?? null;
        const colorLayout = colors ? resolveColorLayout(colors, inferredCount) : null;
        const colorStride = colorLayout?.stride ?? 4;
        const colorCount = colorLayout?.count ?? null;
        const sh = usesSH ? validateCPUShInputs(desc, inferredCount ?? colorCount ?? null) : null;
        const count = inferredCount ?? colorCount ?? sh?.count ?? 0;
        assert(Number.isInteger(count) && count >= 0, "SplatField: splatCount must be an integer >= 0.");
        if (positionCount !== null) assert(positionCount === count, "SplatField: positions length does not match splatCount.");
        if (rotationCount !== null) assert(rotationCount === count, "SplatField: rotations length does not match splatCount.");
        if (scaleCount !== null) assert(scaleCount === count, "SplatField: scales length does not match splatCount.");
        if (opacityCount !== null) assert(opacityCount === count, "SplatField: opacities length does not match splatCount.");
        if (colorCount !== null) assert(colorCount === count, "SplatField: colors length does not match splatCount.");
        if (sh) assert(sh.count === count, "SplatField: spherical harmonic coefficient lengths do not match splatCount.");
        this._splatCount = count | 0;
        this._centerOpacityCPU = new Float32Array(count * 4);
        this._rotationCPU = new Float32Array(count * 4);
        this._scaleCPU = new Float32Array(count * 4);
        this._colorCPU = makeWhiteColorData(count);
        this._shCPU = sh?.data ?? null;
        this._shDegree = sh?.degree ?? 0;
        this._usesSphericalHarmonics = !!sh;
        for (let i = 0; i < count; i++) {
            const centerBase = i * 4;
            const positionBase = i * 3;
            const colorBase = i * colorStride;
            this._centerOpacityCPU[centerBase + 0] = positions ? positions[positionBase + 0] : 0;
            this._centerOpacityCPU[centerBase + 1] = positions ? positions[positionBase + 1] : 0;
            this._centerOpacityCPU[centerBase + 2] = positions ? positions[positionBase + 2] : 0;
            this._centerOpacityCPU[centerBase + 3] = opacities ? opacities[i] : 1;
            this._rotationCPU[centerBase + 0] = rotations ? rotations[centerBase + 0] : 0;
            this._rotationCPU[centerBase + 1] = rotations ? rotations[centerBase + 1] : 0;
            this._rotationCPU[centerBase + 2] = rotations ? rotations[centerBase + 2] : 0;
            this._rotationCPU[centerBase + 3] = rotations ? rotations[centerBase + 3] : 1;
            this._scaleCPU[centerBase + 0] = scales ? scales[positionBase + 0] : 1;
            this._scaleCPU[centerBase + 1] = scales ? scales[positionBase + 1] : 1;
            this._scaleCPU[centerBase + 2] = scales ? scales[positionBase + 2] : 1;
            this._scaleCPU[centerBase + 3] = 0;
            if (colors) {
                let r = colors[colorBase + 0] ?? 1;
                let g = colors[colorBase + 1] ?? 1;
                let b = colors[colorBase + 2] ?? 1;
                const a = colorStride === 4 ? (colors[colorBase + 3] ?? 1) : 1;
                if (this._colorSpace === "srgb") {
                    r = srgbChannelToLinear(r);
                    g = srgbChannelToLinear(g);
                    b = srgbChannelToLinear(b);
                }
                this._colorCPU[centerBase + 0] = r;
                this._colorCPU[centerBase + 1] = g;
                this._colorCPU[centerBase + 2] = b;
                this._colorCPU[centerBase + 3] = a;
            }
        }
        this._externalColorBufferSrgb = false;
        this._centerOpacityOwned = true;
        this._rotationOwned = true;
        this._scaleOwned = true;
        this._colorOwned = true;
        this._shOwned = !!sh;
        this.replaceCenterOpacityBuffer(null, false);
        this.replaceRotationBuffer(null, false);
        this.replaceScaleBuffer(null, false);
        this.replaceColorBuffer(null, false);
        this.replaceSHBuffer(null, false);
        this._dataDirty = true;
        this._uniformDirty = true;
        this.bindGroupKey = null;
        this.clearComputedBoundsIfNeeded();
        if (this._boundsSource === "none" && count > 0) this.computeBoundsFromCPUData();
    }

    private setExternalData(desc: SplatFieldDescriptor): void {
        this.clearAllWasmState(true);
        assert(!!desc.centerOpacityBuffer && !!desc.rotationBuffer && !!desc.scaleBuffer, "SplatField: centerOpacityBuffer, rotationBuffer, and scaleBuffer are required when using external buffers.");
        assert(Number.isInteger(desc.splatCount) && (desc.splatCount ?? -1) >= 0, "SplatField: splatCount is required when using external buffers.");
        if (desc.shBuffer) assert(desc.shDegree !== undefined, "SplatField: shDegree is required when using shBuffer.");
        const ownBuffers = !!desc.ownBuffers;
        const splatCount = desc.splatCount! | 0;
        const centerOpacityBuffer = resolveGPUBuffer(desc.centerOpacityBuffer!);
        const rotationBuffer = resolveGPUBuffer(desc.rotationBuffer!);
        const scaleBuffer = resolveGPUBuffer(desc.scaleBuffer!);
        const colorBuffer = desc.colorBuffer ? resolveGPUBuffer(desc.colorBuffer) : null;
        const shBuffer = desc.shBuffer ? resolveGPUBuffer(desc.shBuffer) : null;
        validateExternalPackedBufferSize(centerOpacityBuffer, splatCount, "centerOpacityBuffer");
        validateExternalPackedBufferSize(rotationBuffer, splatCount, "rotationBuffer");
        validateExternalPackedBufferSize(scaleBuffer, splatCount, "scaleBuffer");
        if (colorBuffer) validateExternalPackedBufferSize(colorBuffer, splatCount, "colorBuffer");
        if (shBuffer) validateExternalSHBufferSize(shBuffer, splatCount, desc.shDegree!);
        this._splatCount = splatCount;
        this.replaceCenterOpacityBuffer(centerOpacityBuffer, ownBuffers);
        this.replaceRotationBuffer(rotationBuffer, ownBuffers);
        this.replaceScaleBuffer(scaleBuffer, ownBuffers);
        this.replaceColorBuffer(colorBuffer, ownBuffers && !!colorBuffer);
        this.replaceSHBuffer(shBuffer, ownBuffers && !!shBuffer);
        this._centerOpacityCPU = null;
        this._rotationCPU = null;
        this._scaleCPU = null;
        this._colorCPU = colorBuffer ? null : makeWhiteColorData(splatCount);
        this._shCPU = null;
        this._externalColorBufferSrgb = !!colorBuffer && this._colorSpace === "srgb";
        this._shDegree = desc.shDegree ?? 0;
        this._usesSphericalHarmonics = !!shBuffer;
        this._dataDirty = !colorBuffer && splatCount > 0;
        this._uniformDirty = true;
        this.bindGroupKey = null;
        this.clearComputedBoundsIfNeeded();
    }

    get splatCount(): number {
        return this._splatCount;
    }

    get colorSpace(): SplatFieldColorSpace {
        return this._colorSpace;
    }

    get opacityScale(): number {
        return this._opacityScale;
    }

    get usesSphericalHarmonics(): boolean {
        return this._usesSphericalHarmonics;
    }

    get shDegree(): SplatFieldSHDegree {
        return this._shDegree;
    }

    set opacityScale(value: number) {
        const next = Math.max(0, value);
        if (next === this._opacityScale) return;
        this._opacityScale = next;
        this._uniformDirty = true;
    }

    get externalColorBufferSrgb(): boolean {
        return this._externalColorBufferSrgb;
    }

    get ndShape(): number[] | null {
        return this._ndShape ? this._ndShape.slice() : null;
    }

    set ndShape(shape: ReadonlyArray<number> | null) {
        this._ndShape = normalizePositiveIntShape(shape, "SplatField: ndShape");
    }

    mapLinearIndexToNd(index: number): number[] | null {
        return linearIndexToNdIndex(this._ndShape, index);
    }

    setWasmCenterOpacity(source: WasmMemoryView<Float32Array> | null, options: SplatFieldWasmChannelOptions = {}): void {
        if (source !== null) this.assertCanSetSingleWasmCoreChannel("setWasmCenterOpacity()");
        if (!this.setWasmChannelSource("centerOpacity", source, options.capacity)) return;
        this.refreshWasmCenterOpacity(options);
    }

    setWasmRotation(source: WasmMemoryView<Float32Array> | null, options: SplatFieldWasmChannelOptions = {}): void {
        if (source !== null) this.assertCanSetSingleWasmCoreChannel("setWasmRotation()");
        if (!this.setWasmChannelSource("rotation", source, options.capacity)) return;
        this.refreshWasmRotation(options);
    }

    setWasmScale(source: WasmMemoryView<Float32Array> | null, options: SplatFieldWasmChannelOptions = {}): void {
        if (source !== null) this.assertCanSetSingleWasmCoreChannel("setWasmScale()");
        if (!this.setWasmChannelSource("scale", source, options.capacity)) return;
        this.refreshWasmScale(options);
    }

    setWasmColor(source: WasmMemoryView<Float32Array> | null, options: SplatFieldWasmChannelOptions = {}): void {
        if (!this.setWasmChannelSource("color", source, options.capacity)) {
            if (this.hasExternalWasmSources()) this._dataDirty = true;
            return;
        }
        this.refreshWasmColor(options);
    }

    setWasmSphericalHarmonics(source: WasmMemoryView<Float32Array> | null, options: SplatFieldWasmChannelOptions = {}): void {
        if (source !== null) {
            assert(options.shDegree !== undefined || this._usesSphericalHarmonics, "SplatField: shDegree is required when using wasmSphericalHarmonics.");
            if (options.shDegree !== undefined) { assert(isSHDegree(options.shDegree), "SplatField: shDegree must be 0, 1, 2, or 3."); this._shDegree = options.shDegree; }
        }
        if (!this.setWasmChannelSource("sphericalHarmonics", source, options.capacity)) return;
        this.refreshWasmSphericalHarmonics(options);
    }

    setWasmPackedData(sources: SplatFieldWasmSources, options: SplatFieldWasmPackedDataOptions = {}): void {
        const hasColor = !!sources.color;
        const hasSH = !!sources.sphericalHarmonics;
        assert(!(hasColor && hasSH), "SplatField: direct colors and spherical harmonic coefficients cannot be mixed.");
        if (hasSH) {
            assert(options.shDegree !== undefined || this._usesSphericalHarmonics, "SplatField: shDegree is required when using wasmSphericalHarmonics.");
            if (options.shDegree !== undefined) { assert(isSHDegree(options.shDegree), "SplatField: shDegree must be 0, 1, 2, or 3."); this._shDegree = options.shDegree; }
        }
        if (Object.prototype.hasOwnProperty.call(sources, "centerOpacity")) this.setWasmChannelSource("centerOpacity", sources.centerOpacity ?? null, options.capacity);
        if (Object.prototype.hasOwnProperty.call(sources, "rotation")) this.setWasmChannelSource("rotation", sources.rotation ?? null, options.capacity);
        if (Object.prototype.hasOwnProperty.call(sources, "scale")) this.setWasmChannelSource("scale", sources.scale ?? null, options.capacity);
        if (Object.prototype.hasOwnProperty.call(sources, "color")) this.setWasmChannelSource("color", sources.color ?? null, options.capacity);
        if (Object.prototype.hasOwnProperty.call(sources, "sphericalHarmonics")) this.setWasmChannelSource("sphericalHarmonics", sources.sphericalHarmonics ?? null, options.capacity);
        this.refreshFromWasm(options);
        this.assertWasmCoreSourcesAvailable("setWasmPackedData");
    }

    refreshWasmCenterOpacity(options: SplatFieldWasmRefreshOptions = {}): void {
        const source = this._wasmCenterOpacitySource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmCenterOpacity");
        const count = this.resolveWasmSplatCount("centerOpacity", source, options.splatCount);
        this.setSplatCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._centerOpacityCPU = this.copyWasmActiveRange(source, count * SPLAT_VEC4_FLOATS);
        else this._centerOpacityCPU = null;
        this.updateWasmBounds(options);
        this._wasmCenterOpacityDirty = true;
        this.assertWasmCoreSourcesAvailable("refreshWasmCenterOpacity");
    }

    refreshWasmRotation(options: SplatFieldWasmRefreshOptions = {}): void {
        const source = this._wasmRotationSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmRotation");
        const count = this.resolveWasmSplatCount("rotation", source, options.splatCount);
        this.setSplatCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._rotationCPU = this.copyWasmActiveRange(source, count * SPLAT_VEC4_FLOATS);
        else this._rotationCPU = null;
        this.updateWasmBounds(options);
        this._wasmRotationDirty = true;
        this.assertWasmCoreSourcesAvailable("refreshWasmRotation");
    }

    refreshWasmScale(options: SplatFieldWasmRefreshOptions = {}): void {
        const source = this._wasmScaleSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmScale");
        const count = this.resolveWasmSplatCount("scale", source, options.splatCount);
        this.setSplatCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._scaleCPU = this.copyWasmActiveRange(source, count * SPLAT_VEC4_FLOATS);
        else this._scaleCPU = null;
        if (!this._wasmColorSource && this._keepCPUData) this._colorCPU = makeWhiteColorData(count);
        this.updateWasmBounds(options);
        this._wasmScaleDirty = true;
        this.assertWasmCoreSourcesAvailable("refreshWasmScale");
    }

    refreshWasmColor(options: SplatFieldWasmRefreshOptions = {}): void {
        const source = this._wasmColorSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmColor");
        const count = this.resolveWasmSplatCount("color", source, options.splatCount);
        this.setSplatCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._colorCPU = this.copyWasmActiveRange(source, count * SPLAT_VEC4_FLOATS);
        else this._colorCPU = null;
        this._externalColorBufferSrgb = this._colorSpace === "srgb";
        this._usesSphericalHarmonics = false;
        this._shDegree = 0;
        this._uniformDirty = true;
        this._wasmColorDirty = true;
        this.assertWasmCoreSourcesAvailable("refreshWasmColor");
    }

    refreshWasmSphericalHarmonics(options: SplatFieldWasmRefreshOptions = {}): void {
        const source = this._wasmSphericalHarmonicsSource;
        if (!source) return;
        if (options.shDegree !== undefined) { assert(isSHDegree(options.shDegree), "SplatField: shDegree must be 0, 1, 2, or 3."); this._shDegree = options.shDegree; }
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmSphericalHarmonics");
        const count = this.resolveWasmSplatCount("sphericalHarmonics", source, options.splatCount);
        this.setSplatCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) {
            this._shCPU = this.copyWasmActiveRange(source, count * shFloatCount(this._shDegree));
            this._colorCPU = makeWhiteColorData(count);
        } else {
            this._shCPU = null;
            this._colorCPU = null;
        }
        this._externalColorBufferSrgb = false;
        this._usesSphericalHarmonics = true;
        this._uniformDirty = true;
        this._dataDirty = true;
        this._wasmSphericalHarmonicsDirty = true;
        this.assertWasmCoreSourcesAvailable("refreshWasmSphericalHarmonics");
    }

    refreshFromWasm(options: SplatFieldWasmRefreshOptions = {}): void {
        if (this._wasmCenterOpacitySource) this.refreshWasmCenterOpacity(options);
        if (this._wasmRotationSource) this.refreshWasmRotation(options);
        if (this._wasmScaleSource) this.refreshWasmScale(options);
        if (this._wasmColorSource) this.refreshWasmColor(options);
        if (this._wasmSphericalHarmonicsSource) this.refreshWasmSphericalHarmonics(options);
    }

    clearWasmSources(): void {
        this.clearAllWasmState(true);
        this._dataDirty = false;
    }

    getSplatRecord(index: number): {
        position: [number, number, number];
        rotation: [number, number, number, number];
        scale: [number, number, number];
        opacity: number;
        color: [number, number, number, number] | null;
        sphericalHarmonicsDegree: SplatFieldSHDegree | null;
        sphericalHarmonics: number[] | null;
        packed: [number, number, number, number];
    } | null {
        if (!Number.isInteger(index) || index < 0 || index >= this._splatCount) return null;
        const centerOpacity = this._centerOpacityCPU;
        const rotation = this._rotationCPU;
        const scale = this._scaleCPU;
        if (!centerOpacity || !rotation || !scale) return null;
        const base = index * 4;
        const packed: [number, number, number, number] = [centerOpacity[base + 0], centerOpacity[base + 1], centerOpacity[base + 2], centerOpacity[base + 3]];
        const color = this._colorCPU ? [this._colorCPU[base + 0], this._colorCPU[base + 1], this._colorCPU[base + 2], this._colorCPU[base + 3]] as [number, number, number, number] : null;
        const sphericalHarmonics = this.getSphericalHarmonicsRecord(index);
        return {
            position: [packed[0], packed[1], packed[2]],
            rotation: [rotation[base + 0], rotation[base + 1], rotation[base + 2], rotation[base + 3]],
            scale: [scale[base + 0], scale[base + 1], scale[base + 2]],
            opacity: packed[3],
            color,
            sphericalHarmonicsDegree: sphericalHarmonics ? this._shDegree : null,
            sphericalHarmonics,
            packed
        };
    }

    getSphericalHarmonicsRecord(index: number): number[] | null {
        if (!this._usesSphericalHarmonics || !this._shCPU) return null;
        if (!Number.isInteger(index) || index < 0 || index >= this._splatCount) return null;
        const floats = shFloatCount(this._shDegree);
        const base = index * floats;
        return Array.from(this._shCPU.subarray(base, base + floats));
    }

    dropCPUData(): void {
        this._centerOpacityCPU = null;
        this._rotationCPU = null;
        this._scaleCPU = null;
        this._colorCPU = null;
        this._shCPU = null;
    }

    computeBoundsFromCPUData(): void {
        const centers = this._centerOpacityCPU;
        const scales = this._scaleCPU;
        const count = this._splatCount;
        if (!centers || !scales || count <= 0) return;
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < count; i++) {
            const base = i * 4;
            const x = centers[base + 0];
            const y = centers[base + 1];
            const z = centers[base + 2];
            const radius = 3 * Math.max(Math.abs(scales[base + 0]), Math.abs(scales[base + 1]), Math.abs(scales[base + 2]));
            minX = Math.min(minX, x - radius);
            minY = Math.min(minY, y - radius);
            minZ = Math.min(minZ, z - radius);
            maxX = Math.max(maxX, x + radius);
            maxY = Math.max(maxY, y + radius);
            maxZ = Math.max(maxZ, z + radius);
        }
        this.setBounds(boundsFromBox([minX, minY, minZ], [maxX, maxY, maxZ]), "computed");
    }

    getLocalBounds(): Bounds3 {
        if (this._boundsSource === "none" && this._centerOpacityCPU && this._scaleCPU) this.computeBoundsFromCPUData();
        if (this._boundsSource === "none") return emptyBounds(this._splatCount > 0);
        return boundsFromBoxAndSphere(this.boundsMin, this.boundsMax, this.boundsCenter, this.boundsRadius);
    }

    getWorldBounds(): Bounds3 {
        return transformBounds(this.getLocalBounds(), this.transform.worldMatrix);
    }

    getBounds(): Bounds3 {
        return this.getWorldBounds();
    }

    private uploadWasmCenterOpacity(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmCenterOpacitySource;
        if (!source || !this._wasmCenterOpacityDirty) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmCenterOpacity");
        const count = this._splatCount;
        validateWasmRecordRange(source, count, SPLAT_VEC4_FLOATS, "SplatField: wasmCenterOpacity", "splatCount");
        if (count <= 0) { this._wasmCenterOpacityDirty = false; return; }
        const data = source.array();
        const byteLength = count * SPLAT_VEC4_BYTES;
        this.ensureWasmCenterOpacityBuffer(device, count);
        const write = (): void => {
            assert(!!this.centerOpacityBuffer, "SplatField: wasmCenterOpacity upload requires a centerOpacityBuffer.");
            queue.writeBuffer(this.centerOpacityBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceCenterOpacityBuffer(null, false);
            this._centerOpacityWasmManaged = false;
            this._wasmCenterOpacityCapacity = 0;
            this.ensureWasmCenterOpacityBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._centerOpacityCPU = new Float32Array(data.subarray(0, count * SPLAT_VEC4_FLOATS));
        else this._centerOpacityCPU = null;
        this._wasmCenterOpacityDirty = false;
    }

    private uploadWasmRotation(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmRotationSource;
        if (!source || !this._wasmRotationDirty) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmRotation");
        const count = this._splatCount;
        validateWasmRecordRange(source, count, SPLAT_VEC4_FLOATS, "SplatField: wasmRotation", "splatCount");
        if (count <= 0) { this._wasmRotationDirty = false; return; }
        const data = source.array();
        const byteLength = count * SPLAT_VEC4_BYTES;
        this.ensureWasmRotationBuffer(device, count);
        const write = (): void => {
            assert(!!this.rotationBuffer, "SplatField: wasmRotation upload requires a rotationBuffer.");
            queue.writeBuffer(this.rotationBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceRotationBuffer(null, false);
            this._rotationWasmManaged = false;
            this._wasmRotationCapacity = 0;
            this.ensureWasmRotationBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._rotationCPU = new Float32Array(data.subarray(0, count * SPLAT_VEC4_FLOATS));
        else this._rotationCPU = null;
        this._wasmRotationDirty = false;
    }

    private uploadWasmScale(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmScaleSource;
        if (!source || !this._wasmScaleDirty) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmScale");
        const count = this._splatCount;
        validateWasmRecordRange(source, count, SPLAT_VEC4_FLOATS, "SplatField: wasmScale", "splatCount");
        if (count <= 0) { this._wasmScaleDirty = false; return; }
        const data = source.array();
        const byteLength = count * SPLAT_VEC4_BYTES;
        this.ensureWasmScaleBuffer(device, count);
        const write = (): void => {
            assert(!!this.scaleBuffer, "SplatField: wasmScale upload requires a scaleBuffer.");
            queue.writeBuffer(this.scaleBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceScaleBuffer(null, false);
            this._scaleWasmManaged = false;
            this._wasmScaleCapacity = 0;
            this.ensureWasmScaleBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._scaleCPU = new Float32Array(data.subarray(0, count * SPLAT_VEC4_FLOATS));
        else this._scaleCPU = null;
        this._wasmScaleDirty = false;
    }

    private uploadWasmColor(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmColorSource;
        if (!source || !this._wasmColorDirty) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmColor");
        const count = this._splatCount;
        validateWasmRecordRange(source, count, SPLAT_VEC4_FLOATS, "SplatField: wasmColor", "splatCount");
        if (count <= 0) { this._wasmColorDirty = false; return; }
        const data = source.array();
        const byteLength = count * SPLAT_VEC4_BYTES;
        this.ensureWasmColorBuffer(device, count);
        const write = (): void => {
            assert(!!this.colorBuffer, "SplatField: wasmColor upload requires a colorBuffer.");
            queue.writeBuffer(this.colorBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceColorBuffer(null, false);
            this._colorWasmManaged = false;
            this._wasmColorCapacity = 0;
            this.ensureWasmColorBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._colorCPU = new Float32Array(data.subarray(0, count * SPLAT_VEC4_FLOATS));
        else this._colorCPU = null;
        this._wasmColorDirty = false;
    }

    private uploadWasmSphericalHarmonics(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmSphericalHarmonicsSource;
        if (!source || !this._wasmSphericalHarmonicsDirty) return;
        source.refresh();
        assertWasmF32View(source, "SplatField: wasmSphericalHarmonics");
        const count = this._splatCount;
        const floatsPerSplat = shFloatCount(this._shDegree);
        validateWasmRecordRange(source, count, floatsPerSplat, "SplatField: wasmSphericalHarmonics", "splatCount");
        if (count <= 0) { this._wasmSphericalHarmonicsDirty = false; return; }
        const data = source.array();
        const byteLength = count * floatsPerSplat * SPLAT_F32_BYTES;
        this.ensureWasmSphericalHarmonicsBuffer(device, count);
        const write = (): void => {
            assert(!!this.shBuffer, "SplatField: wasmSphericalHarmonics upload requires an shBuffer.");
            queue.writeBuffer(this.shBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceSHBuffer(null, false);
            this._sphericalHarmonicsWasmManaged = false;
            this._wasmSphericalHarmonicsCapacity = 0;
            this.ensureWasmSphericalHarmonicsBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._shCPU = new Float32Array(data.subarray(0, count * floatsPerSplat));
        else this._shCPU = null;
        this._wasmSphericalHarmonicsDirty = false;
    }

    private uploadWasmFallbackColor(device: GPUDevice, queue: GPUQueue): void {
        if (this._wasmColorSource || !this.hasExternalWasmSources() || !this._dataDirty) return;
        const count = this._splatCount;
        if (count <= 0) return;
        const data = makeWhiteColorData(count);
        this.ensureWasmColorBuffer(device, count);
        const write = (): void => {
            assert(!!this.colorBuffer, "SplatField: wasm fallback color upload requires a colorBuffer.");
            queue.writeBuffer(this.colorBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
        };
        try { write(); }
        catch {
            this.replaceColorBuffer(null, false);
            this._colorWasmManaged = false;
            this._wasmColorCapacity = 0;
            this.ensureWasmColorBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._colorCPU = data;
        else this._colorCPU = null;
    }

    private uploadWasmSources(device: GPUDevice, queue: GPUQueue): void {
        this.uploadWasmCenterOpacity(device, queue);
        this.uploadWasmRotation(device, queue);
        this.uploadWasmScale(device, queue);
        this.uploadWasmColor(device, queue);
        this.uploadWasmSphericalHarmonics(device, queue);
        this.uploadWasmFallbackColor(device, queue);
    }

    upload(device: GPUDevice, queue: GPUQueue): void {
        if (this.hasExternalWasmSources()) {
            if (this.hasDirtyWasmSources() || this._dataDirty) this.uploadWasmSources(device, queue);
            this._dataDirty = this.hasDirtyWasmSources();
            return;
        }
        if (!this._dataDirty) return;
        const uploadBuffer = (current: GPUBuffer | null, data: Float32Array | null, label: string): { buffer: GPUBuffer | null; created: boolean; } => {
            if (!data || data.byteLength === 0) return { buffer: current, created: false };
            const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
            if (!current) return { buffer: createBuffer(device, data, usage, label), created: true };
            try { queue.writeBuffer(current, 0, data.buffer, data.byteOffset, data.byteLength); return { buffer: current, created: false }; }
            catch { current.destroy(); return { buffer: createBuffer(device, data, usage, label), created: true }; }
        };
        const centerOpacity = uploadBuffer(this.centerOpacityBuffer, this._centerOpacityCPU, "SplatField.centerOpacity");
        const rotation = uploadBuffer(this.rotationBuffer, this._rotationCPU, "SplatField.rotation");
        const scale = uploadBuffer(this.scaleBuffer, this._scaleCPU, "SplatField.scale");
        const color = uploadBuffer(this.colorBuffer, this._colorCPU, "SplatField.color");
        const sh = uploadBuffer(this.shBuffer, this._shCPU, "SplatField.sh");
        this.centerOpacityBuffer = centerOpacity.buffer;
        this.rotationBuffer = rotation.buffer;
        this.scaleBuffer = scale.buffer;
        this.colorBuffer = color.buffer;
        this.shBuffer = sh.buffer;
        if (centerOpacity.created && this.centerOpacityBuffer) this._centerOpacityOwned = true;
        if (rotation.created && this.rotationBuffer) this._rotationOwned = true;
        if (scale.created && this.scaleBuffer) this._scaleOwned = true;
        if (color.created && this.colorBuffer) this._colorOwned = true;
        if (sh.created && this.shBuffer) this._shOwned = true;
        if (!this._keepCPUData) this.dropCPUData();
        this._dataDirty = false;
        this.bindGroupKey = null;
    }

    getUniformBufferSize(): number {
        return UNIFORM_BYTE_SIZE;
    }

    getUniformData(): Float32Array {
        const out = new Float32Array(UNIFORM_FLOAT_COUNT);
        out[0] = clamp01(this._opacityScale);
        out[1] = this._externalColorBufferSrgb || (this._usesSphericalHarmonics && this._colorSpace === "srgb") ? 1 : 0;
        out[2] = this._usesSphericalHarmonics ? 1 : 0;
        out[3] = this._shDegree;
        return out;
    }

    get dirtyUniforms(): boolean {
        return this._uniformDirty;
    }

    markUniformsClean(): void {
        this._uniformDirty = false;
    }

    private destroyOwnedBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (!buffer || !owned) return;
        buffer.destroy();
    }

    destroy(): void {
        this.destroyOwnedBuffer(this.centerOpacityBuffer, this._centerOpacityOwned);
        this.destroyOwnedBuffer(this.rotationBuffer, this._rotationOwned);
        this.destroyOwnedBuffer(this.scaleBuffer, this._scaleOwned);
        this.destroyOwnedBuffer(this.colorBuffer, this._colorOwned);
        this.destroyOwnedBuffer(this.shBuffer, this._shOwned);
        this.uniformBuffer?.destroy();
        this.centerOpacityBuffer = null;
        this.rotationBuffer = null;
        this.scaleBuffer = null;
        this.colorBuffer = null;
        this.shBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this._centerOpacityCPU = null;
        this._rotationCPU = null;
        this._scaleCPU = null;
        this._colorCPU = null;
        this._shCPU = null;
        this._ndShape = null;
        this._splatCount = 0;
        this._wasmCenterOpacitySource = null;
        this._wasmRotationSource = null;
        this._wasmScaleSource = null;
        this._wasmColorSource = null;
        this._wasmSphericalHarmonicsSource = null;
        this._wasmCenterOpacityDirty = false;
        this._wasmRotationDirty = false;
        this._wasmScaleDirty = false;
        this._wasmColorDirty = false;
        this._wasmSphericalHarmonicsDirty = false;
        this._centerOpacityWasmManaged = false;
        this._rotationWasmManaged = false;
        this._scaleWasmManaged = false;
        this._colorWasmManaged = false;
        this._sphericalHarmonicsWasmManaged = false;
        this._wasmCenterOpacityCapacity = 0;
        this._wasmRotationCapacity = 0;
        this._wasmScaleCapacity = 0;
        this._wasmColorCapacity = 0;
        this._wasmSphericalHarmonicsCapacity = 0;
        this._wasmCenterOpacityCapacityHint = 0;
        this._wasmRotationCapacityHint = 0;
        this._wasmScaleCapacityHint = 0;
        this._wasmColorCapacityHint = 0;
        this._wasmSphericalHarmonicsCapacityHint = 0;
        this._externalColorBufferSrgb = false;
        this._usesSphericalHarmonics = false;
        this._shDegree = 0;
        this.transform.dispose();
    }
}

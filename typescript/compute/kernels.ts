/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert, isGPUBuffer } from "../utils";
import { StorageBuffer, validateStorageBufferRange, wrapStorageBuffer } from "./buffer";
import { ComputePipeline } from "./pipeline";
import { encodeDispatchBatchWithLimit } from "./dispatch";
import type { ComputeDispatchCommand } from "./dispatch";
import { ceilDiv, makeWorkgroupCounts, workgroupsFolded } from "./workgroups";
import type { WorkgroupCounts } from "./workgroups";
import { ScratchAllocator } from "./scratch";
import { CPUndarray, GPU_MAX_RANK, GPUndarray, NdarrayGPUEngine, broadcastStrides, coalesceDims, mayAddressTwice, sameShape } from "./ndarray";
import type { DType, NdarrayGPUOptions } from "./ndarray";
import { storageBufferLayout, uniformBufferLayout } from "../wgsl";
import type { BufferResource } from "../wgsl";
import reduceMaxF32WGSL from "../../wgsl/compute/reduce-max-f32.wgsl";
import reduceMaxU32WGSL from "../../wgsl/compute/reduce-max-u32.wgsl";
import reduceMinF32WGSL from "../../wgsl/compute/reduce-min-f32.wgsl";
import reduceMinU32WGSL from "../../wgsl/compute/reduce-min-u32.wgsl";
import reduceSumF32WGSL from "../../wgsl/compute/reduce-sum-f32.wgsl";
import reduceSumU32WGSL from "../../wgsl/compute/reduce-sum-u32.wgsl";
import argreduceArgmaxInitialWGSL from "../../wgsl/compute/argreduce-argmax-initial.wgsl";
import argreduceArgmaxPairsWGSL from "../../wgsl/compute/argreduce-argmax-pairs.wgsl";
import argreduceArgminInitialWGSL from "../../wgsl/compute/argreduce-argmin-initial.wgsl";
import argreduceArgminPairsWGSL from "../../wgsl/compute/argreduce-argmin-pairs.wgsl";
import scanBlockExclusiveU32WGSL from "../../wgsl/compute/scan-block-exclusive-u32.wgsl";
import scanAddBlockOffsetsU32WGSL from "../../wgsl/compute/scan-add-block-offsets-u32.wgsl";
import histogramClearAtomicU32WGSL from "../../wgsl/compute/histogram-clear-atomic-u32.wgsl";
import histogramU32WGSL from "../../wgsl/compute/histogram-u32.wgsl";
import compactF32WGSL from "../../wgsl/compute/compact-f32.wgsl";
import compactU32WGSL from "../../wgsl/compute/compact-u32.wgsl";
import sortRadixFlagsU32WGSL from "../../wgsl/compute/sort-radix-flags-u32.wgsl";
import sortRadixScatterU32WGSL from "../../wgsl/compute/sort-radix-scatter-u32.wgsl";
import sortRadixScatterPairsU32WGSL from "../../wgsl/compute/sort-radix-scatter-pairs-u32.wgsl";
import copyU32WGSL from "../../wgsl/compute/copy-u32.wgsl";
import scaleExtractF32WGSL from "../../wgsl/compute/scale-extract-f32.wgsl";
import scaleHistogramF32WGSL from "../../wgsl/compute/scale-histogram-f32.wgsl";
import scaleRemapF32WGSL from "../../wgsl/compute/scale-remap-f32.wgsl";
import addF32WGSL from "../../wgsl/compute/add-f32.wgsl";
import addU32WGSL from "../../wgsl/compute/add-u32.wgsl";
import addC64WGSL from "../../wgsl/compute/add-c64.wgsl";
import subF32WGSL from "../../wgsl/compute/sub-f32.wgsl";
import subU32WGSL from "../../wgsl/compute/sub-u32.wgsl";
import subC64WGSL from "../../wgsl/compute/sub-c64.wgsl";
import mulF32WGSL from "../../wgsl/compute/mul-f32.wgsl";
import mulU32WGSL from "../../wgsl/compute/mul-u32.wgsl";
import mulC64WGSL from "../../wgsl/compute/mul-c64.wgsl";
import sclF32WGSL from "../../wgsl/compute/scl-f32.wgsl";
import sclU32WGSL from "../../wgsl/compute/scl-u32.wgsl";
import sclC64WGSL from "../../wgsl/compute/scl-c64.wgsl";
import dotF32WGSL from "../../wgsl/compute/dot-f32.wgsl";
import dotU32WGSL from "../../wgsl/compute/dot-u32.wgsl";
import dotC64WGSL from "../../wgsl/compute/dot-c64.wgsl";
import axpyF32WGSL from "../../wgsl/compute/axpy-f32.wgsl";
import axpyU32WGSL from "../../wgsl/compute/axpy-u32.wgsl";
import axpyC64WGSL from "../../wgsl/compute/axpy-c64.wgsl";
import matmulF32WGSL from "../../wgsl/compute/matmul-f32.wgsl";
import matmulU32WGSL from "../../wgsl/compute/matmul-u32.wgsl";
import matmulC64WGSL from "../../wgsl/compute/matmul-c64.wgsl";
import elementwiseStridedWGSL from "../../wgsl/compute/elementwise-strided.wgsl";
import luFactorRealWGSL from "../../wgsl/compute/lu-factor-f32.wgsl";
import luFactorRealLeadWGSL from "../../wgsl/compute/lu-factor-lead-f32.wgsl";
import luFactorRealUpperWGSL from "../../wgsl/compute/lu-factor-upper-f32.wgsl";
import luFactorRealTrailingWGSL from "../../wgsl/compute/lu-factor-trailing-f32.wgsl";
import luFactorC64SmallWGSL from "../../wgsl/compute/lu-factor-c64.wgsl";
import luFactorC64LeadWGSL from "../../wgsl/compute/lu-factor-lead-c64.wgsl";
import luFactorC64UpperWGSL from "../../wgsl/compute/lu-factor-upper-c64.wgsl";
import luFactorC64TrailingWGSL from "../../wgsl/compute/lu-factor-trailing-c64.wgsl";
import luSolveRealWGSL from "../../wgsl/compute/lu-solve-large-f32.wgsl";
import luSolveRealSharedWGSL from "../../wgsl/compute/lu-solve-shared-f32.wgsl";
import luSolveC64LargeWGSL from "../../wgsl/compute/lu-solve-large-c64.wgsl";
import luSolveC64WGSL from "../../wgsl/compute/lu-solve-shared-c64.wgsl";
import { normalizeScaleTransform, packScaleTransform, scaleClampModeToId, scaleModeToId, scaleValueModeToId } from "../scaling/transform";
import type { ScaleTransform, ScaleValueMode } from "../scaling/types";

export type KernelDispatchOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};

export type KernelOutputOptions = KernelDispatchOptions & NdarrayGPUOptions & {
    out?: GPUndarray;
};

export type KernelComplexOptions = {
    complex?: boolean;
};

export type C64Scalar = readonly [number, number];

export type KernelScalar = number | C64Scalar;

export type ElementwiseOptions = KernelOutputOptions & KernelComplexOptions;

export type MatmulOptions = KernelOutputOptions & KernelComplexOptions & {
    alpha?: KernelScalar;
    beta?: KernelScalar;
};

export type HistogramOptions = KernelOutputOptions & {
    bins: number;
    clear?: boolean;
};

export type CompactOptions = KernelDispatchOptions & NdarrayGPUOptions & {
    out?: GPUndarray;
    outCount?: GPUndarray;
};

export type CompactResult = {
    values: GPUndarray;
    count: GPUndarray;
};

export type SortPairsOptions = KernelDispatchOptions & NdarrayGPUOptions & {
    outKeys?: GPUndarray;
    outValues?: GPUndarray;
};

export type SortPairsResult = {
    keys: GPUndarray;
    values: GPUndarray;
};

export type LuFactorOptions = KernelOutputOptions & KernelComplexOptions & {
    overwrite?: boolean;
    ipiv?: GPUndarray;
};

export type LuFactorResult = {
    lu: GPUndarray;
    ipiv: GPUndarray;
};

export type LuSolveOptions = KernelOutputOptions & KernelComplexOptions;

export type ScaleExtractOptions = KernelDispatchOptions & NdarrayGPUOptions & {
    componentIndex?: number;
    valueMode?: ScaleValueMode;
    outValues?: GPUndarray;
    outFlags?: GPUndarray;
};

export type ScaleExtractResult = {
    values: GPUndarray;
    flags: GPUndarray;
};

export type ScaleHistogramOptions = KernelOutputOptions & {
    bins: number;
    minValue: number;
    maxValue: number;
    clear?: boolean;
};

export type ScaleRemapOptions = KernelOutputOptions & {
    transform: ScaleTransform;
};

type ReduceOp = "sum" | "min" | "max";

type ArgReduceOp = "argmin" | "argmax";

type ElementwiseOp = "add" | "sub" | "mul";

type StridedOp = ElementwiseOp | "axpy";

type ReduceType = "u32" | "f32";

type KernelKind = "f32" | "u32" | "c64";

type KernelBinding = { buffer: BufferResource; offset: number; size?: number };

type KernelResource = BufferResource | KernelBinding;

type KernelInput = { array: GPUndarray; dtype: ReduceType; kind: KernelKind; shape: number[] };

type KernelTarget = { array: GPUndarray; binding: KernelBinding; temp: GPUndarray | null };

type KernelBatch = { commands: ComputeDispatchCommand[]; transfers: Array<{ at: number; encode: (encoder: GPUCommandEncoder) => void }> };

type MatmulLayout = { binding: KernelBinding; origin: number; rs: number; cs: number };

const REAL: ReadonlyArray<ReduceType> = ["f32", "u32"];
const F32: ReadonlyArray<ReduceType> = ["f32"];
const U32: ReadonlyArray<ReduceType> = ["u32"];

const kindKeys = (prefix: string): Record<KernelKind, string> => ({ f32: `${prefix}:f32`, u32: `${prefix}:u32`, c64: `${prefix}:c64` });
const ELEMENTWISE_KEYS: Record<ElementwiseOp, Record<KernelKind, string>> = { add: kindKeys("kernels:add"), sub: kindKeys("kernels:sub"), mul: kindKeys("kernels:mul") };
const SCL_KEYS = kindKeys("kernels:scl");
const AXPY_KEYS = kindKeys("kernels:axpy");
const DOT_KEYS = kindKeys("kernels:dot");
const DOT_REDUCE_KEYS = kindKeys("kernels:dot:reduce");
const MATMUL_KEYS = kindKeys("kernels:matmul");
const STRIDED_KEYS: Record<StridedOp, Record<KernelKind, string>> = { add: kindKeys("kernels:strided:add"), sub: kindKeys("kernels:strided:sub"), mul: kindKeys("kernels:strided:mul"), axpy: kindKeys("kernels:strided:axpy") };
const STRIDED_OPERATION: Record<StridedOp, number> = { add: 0, sub: 1, mul: 2, axpy: 3 };
const STRIDED_KIND: Record<KernelKind, number> = { f32: 0, u32: 1, c64: 2 };

const ELEMENTWISE_WGSL: Record<ElementwiseOp, Record<KernelKind, string>> = {
    add: { f32: addF32WGSL, u32: addU32WGSL, c64: addC64WGSL },
    sub: { f32: subF32WGSL, u32: subU32WGSL, c64: subC64WGSL },
    mul: { f32: mulF32WGSL, u32: mulU32WGSL, c64: mulC64WGSL }
};
const SCL_WGSL: Record<KernelKind, string> = { f32: sclF32WGSL, u32: sclU32WGSL, c64: sclC64WGSL };
const AXPY_WGSL: Record<KernelKind, string> = { f32: axpyF32WGSL, u32: axpyU32WGSL, c64: axpyC64WGSL };
const DOT_WGSL: Record<KernelKind, string> = { f32: dotF32WGSL, u32: dotU32WGSL, c64: dotC64WGSL };
const MATMUL_WGSL: Record<KernelKind, string> = { f32: matmulF32WGSL, u32: matmulU32WGSL, c64: matmulC64WGSL };

const bytesPerElement = (type: ReduceType): number => 4;
const kernelOp = (op: string): string => `compute.kernels.${op}`;
const rawBuffer = (res: KernelResource): GPUBuffer => { const buffer = ("offset" in res) ? res.buffer : res; return isGPUBuffer(buffer) ? buffer : buffer.buffer; };
const product = (shape: ReadonlyArray<number>): number => shape.reduce((n, d) => n * d, 1);

const broadcastShapes = (a: ReadonlyArray<number>, b: ReadonlyArray<number>, op: string): ReadonlyArray<number> => {
    if (sameShape(a, b)) return a;
    const ndim = Math.max(a.length, b.length);
    const out = new Array<number>(ndim);
    for (let i = 0; i < ndim; i++) {
        const da = a[a.length - ndim + i] ?? 1;
        const db = b[b.length - ndim + i] ?? 1;
        assert(da === db || da === 1 || db === 1, () => `${op}: shapes [${a}] and [${b}] cannot be broadcast together`);
        out[i] = (da === 1) ? db : da;
    }
    return out;
};

const extent = (a: GPUndarray): [number, number] => {
    let start = a.buffer.offsetBytes + a.baseOffsetBytes + a.offsetBytes, end = start + a.bytesPerElement;
    for (let i = 0; i < a.ndim; i++) { const span = (a.shape[i]! - 1) * a.stridesBytes[i]!; if (span < 0) start += span; else end += span; }
    return [start, end];
};

const overlaps = (a: GPUndarray, b: GPUndarray): boolean => {
    if (a.buffer.buffer !== b.buffer.buffer || a.numel === 0 || b.numel === 0) return false;
    const [startA, endA] = extent(a), [startB, endB] = extent(b);
    return startA < endB && startB < endA;
};

const complexShape = (a: GPUndarray, op: string, label: string): number[] => {
    assert(a.dtype === "f32", () => `${op}: complex: true requires ${label} to be an f32 array whose last axis holds [re, im] pairs (got dtype ${a.dtype})`);
    assert(a.ndim >= 1 && a.shape[a.ndim - 1] === 2, () => `${op}: complex: true requires ${label} to have a last axis of length 2 (got shape [${a.shape}])`);
    return a.shape.slice(0, -1);
};
const complexFlag = (value: unknown, op: string): boolean => { assert(value === undefined || typeof value === "boolean", () => `${op}: complex must be a boolean`); return value === true; };
const fullShape = (shape: ReadonlyArray<number>, kind: KernelKind): ReadonlyArray<number> => (kind === "c64") ? [...shape, 2] : shape;
const scalarWords = (value: KernelScalar | undefined, fallback: number, kind: KernelKind, op: string, label: string): number[] => {
    const v = value ?? fallback;
    if (kind === "c64") {
        if (typeof v === "number") return [v, 0];
        assert(Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number", () => `${op}: ${label} must be a number or a [real, imaginary] tuple`);
        return [v[0], v[1]];
    }
    assert(!Array.isArray(v), () => `${op}: ${label} is a [real, imaginary] tuple, which requires complex: true and f32 [..., 2] arrays`);
    assert(typeof v === "number", () => `${op}: ${label} must be a number (got ${String(v)})`);
    if (kind === "u32") assert(Number.isInteger(v) && v >= 0 && v <= 0xFFFFFFFF, () => `${op}: ${label} must be a u32 integer for u32 arrays (got ${v})`);
    return [v];
};

export class ComputeKernels {
    readonly device: GPUDevice;
    readonly queue: GPUQueue;
    private readonly scratch: ScratchAllocator;
    private readonly ownsScratch: boolean;
    private readonly engine: NdarrayGPUEngine;
    private readonly ownsEngine: boolean;
    private readonly pipelines: Map<string, ComputePipeline>;
    private readonly scaleExtractParamsData: Uint32Array<ArrayBuffer>;
    private readonly scaleHistogramParamsData: ArrayBuffer;
    private readonly scaleHistogramParamsView: DataView;
    private readonly scaleRemapParamsData: ArrayBuffer;
    private readonly scaleRemapParamsView: DataView;
    private readonly scaleRemapParamsF32: Float32Array;
    private readonly scaleTransformPacked: Float32Array;
    private readonly matmulParamsData: ArrayBuffer;
    private readonly matmulParamsView: DataView;
    private readonly stridedParamsData: Uint32Array<ArrayBuffer>;
    private readonly stridedAlpha: Float32Array;
    private readonly maxBindingBytes: number;
    private readonly maxWorkgroups: number;

    constructor(device: GPUDevice, queue: GPUQueue, scratch?: ScratchAllocator, engine?: NdarrayGPUEngine) {
        assert(!engine || scratch, "ComputeKernels: an injected engine requires the scratch allocator it was created with");
        this.device = device;
        this.queue = queue;
        this.scratch = scratch ?? new ScratchAllocator(device, queue);
        this.ownsScratch = !scratch;
        this.engine = engine ?? new NdarrayGPUEngine(device, queue, this.scratch);
        this.ownsEngine = !engine;
        this.pipelines = new Map();
        this.scaleExtractParamsData = new Uint32Array(8);
        this.scaleHistogramParamsData = new ArrayBuffer(16);
        this.scaleHistogramParamsView = new DataView(this.scaleHistogramParamsData);
        this.scaleRemapParamsData = new ArrayBuffer(80);
        this.scaleRemapParamsView = new DataView(this.scaleRemapParamsData);
        this.scaleRemapParamsF32 = new Float32Array(this.scaleRemapParamsData);
        this.scaleTransformPacked = new Float32Array(20);
        this.matmulParamsData = new ArrayBuffer(80);
        this.matmulParamsView = new DataView(this.matmulParamsData);
        this.stridedParamsData = new Uint32Array(32);
        this.stridedAlpha = new Float32Array(this.stridedParamsData.buffer, 24, 2);
        this.maxBindingBytes = device.limits.maxStorageBufferBindingSize;
        this.maxWorkgroups = device.limits.maxComputeWorkgroupsPerDimension;
    }

    destroy(): void {
        if (this.ownsEngine) this.engine.destroy();
        if (this.ownsScratch) this.scratch.destroy();
        this.pipelines.clear();
    }

    private getPipeline(key: string, create: () => ComputePipeline): ComputePipeline {
        let p = this.pipelines.get(key);
        if (!p) { p = create(); this.pipelines.set(key, p); }
        return p;
    }

    private bindSized(res: KernelResource, sizeBytes: number): { buffer: BufferResource; offset: number; size: number } {
        assert(Number.isInteger(sizeBytes) && sizeBytes >= 0, () => `bindSized: sizeBytes must be an integer >= 0 (got ${sizeBytes})`);
        const aligned = alignTo(sizeBytes, 4);
        const limit = this.maxBindingBytes;
        assert(aligned <= limit, () => `bindSized: a ${aligned}-byte binding exceeds device.limits.maxStorageBufferBindingSize (${limit}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
        if ("offset" in res) return { buffer: res.buffer, offset: res.offset, size: Math.max(4, aligned) };
        return { buffer: res, offset: 0, size: Math.max(4, aligned) };
    }

    private workgroups(invocations: number, perWorkgroup: number): WorkgroupCounts {
        const workgroups = workgroupsFolded(invocations, perWorkgroup, this.maxWorkgroups);
        assert(workgroups[2] === 1, () => `${invocations} invocations of ${perWorkgroup} per workgroup fold into ${workgroups[0]}x${workgroups[1]}x${workgroups[2]} workgroups, but built-in kernels only decode folded grids with z = 1`);
        return workgroups;
    }

    private input(a: unknown, op: string, label: string, dtypes: ReadonlyArray<ReduceType>, complex: boolean = false): KernelInput {
        assert(!(a instanceof CPUndarray), () => `${op}: ${label} must be a GPUndarray; use compute.ndarray.toGPU() first`);
        assert(a instanceof GPUndarray, () => `${op}: ${label} must be a GPUndarray`);
        this.engine.assertArray(a, op, label);
        this.assertBindingBytes(alignTo(a.numel * a.bytesPerElement, 4), op);
        if (complex) return { array: a, dtype: "f32", kind: "c64", shape: complexShape(a, op, label) };
        const dtype = a.dtype as DType;
        assert((dtypes as ReadonlyArray<DType>).includes(dtype), () => `${op}: ${label} has dtype ${dtype}, but ${op} supports ${dtypes.join(" and ")}; convert it with compute.ndarray.cast() first`);
        return { array: a, dtype: dtype as ReduceType, kind: dtype as ReduceType, shape: a.shape };
    }

    private assertBindingBytes(bytes: number, op: string): void {
        const limit = this.maxBindingBytes;
        assert(bytes <= limit, () => `${op}: a ${bytes}-byte binding exceeds device.limits.maxStorageBufferBindingSize (${limit}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
    }

    private sameDType(a: KernelInput, b: KernelInput, op: string, labels: string): void {
        assert(a.dtype === b.dtype, () => `${op}: ${labels} must have the same dtype (got ${a.dtype} and ${b.dtype}); kernels never promote, so convert with compute.ndarray.cast() first`);
    }

    private oneDimensional(a: KernelInput, op: string, label: string): number {
        assert(a.shape.length === 1, () => `${op}: ${label} must be 1-D (got shape [${a.shape}]); use compute.ndarray.reshape() (free for contiguous arrays) or compute.ndarray.contiguous() first`);
        return a.shape[0]!;
    }

    private output(out: GPUndarray | undefined, dtype: DType, shape: ReadonlyArray<number>, opts: KernelDispatchOptions & NdarrayGPUOptions, op: string, owned: GPUndarray[], label: string = "out", suffix: string = ""): GPUndarray {
        if (out === undefined) {
            const array = this.engine.output(dtype, shape, { label: `${opts.label ?? op}${suffix}`, copySrc: opts.copySrc, copyDst: opts.copyDst, usage: opts.usage }, op);
            owned.push(array);
            return array;
        }
        assert(!(out instanceof CPUndarray), () => `${op}: ${label} must be a GPUndarray; kernels write only GPU arrays`);
        assert(out instanceof GPUndarray, () => `${op}: ${label} must be a GPUndarray`);
        this.engine.assertArray(out, op, label);
        assert(opts.copySrc === undefined && opts.copyDst === undefined && opts.usage === undefined, () => `${op}: copySrc, copyDst, and usage apply only to newly created outputs`);
        assert(out.dtype === dtype, () => `${op}: ${label} must have dtype ${dtype} (got ${out.dtype})`);
        assert(sameShape(out.shape, shape), () => `${op}: ${label} must have shape [${shape}] (got [${out.shape}])`);
        assert(out.isContiguousC, () => `${op}: ${label} must be C-contiguous`);
        return out;
    }

    private operand(commands: ComputeDispatchCommand[], a: GPUndarray, encoder: GPUCommandEncoder | undefined, op: string): KernelBinding {
        return this.engine.direct(this.engine.bindable(a) ? a : this.engine.stage(a, commands, encoder, op));
    }

    private target(commands: ComputeDispatchCommand[], out: GPUndarray, reads: ReadonlyArray<KernelResource>, encoder: GPUCommandEncoder | undefined, op: string, preload: boolean = false): KernelTarget {
        let aliased = false;
        for (let i = 0; i < reads.length; i++) aliased ||= rawBuffer(reads[i]!) === out.buffer.buffer;
        if (!aliased && this.engine.bindable(out)) return { array: out, binding: this.engine.direct(out), temp: null };
        const temp = preload ? this.engine.stage(out, commands, encoder, op) : this.engine.temp(out.dtype, out.shape, op);
        return { array: out, binding: this.engine.direct(temp), temp };
    }

    private finish(commands: ComputeDispatchCommand[], target: KernelTarget, encoder: GPUCommandEncoder | undefined, op: string): void {
        if (target.temp) this.engine.copy(target.temp, target.array, commands, encoder, op);
    }

    private clear(batch: KernelBatch, res: KernelBinding, size: number): void {
        const storage = res.buffer as StorageBuffer | GPUBuffer;
        if (storage instanceof StorageBuffer) validateStorageBufferRange(storage, res.offset, size, true);
        const buffer = (storage instanceof StorageBuffer) ? storage.buffer : storage;
        const offset = (storage instanceof StorageBuffer) ? storage.offsetBytes + res.offset : res.offset;
        batch.transfers.push({ at: batch.commands.length, encode: (encoder) => encoder.clearBuffer(buffer, offset, alignTo(size, 4)) });
    }

    private zero(batch: KernelBatch, out: GPUndarray, owned: ReadonlyArray<GPUndarray>, encoder: GPUCommandEncoder | undefined, op: string): void {
        if (out.numel === 0 || owned.includes(out)) return;
        if ((out.buffer.usage & GPUBufferUsage.COPY_DST) !== 0) { this.clear(batch, { buffer: out.buffer, offset: out.baseOffsetBytes + out.offsetBytes }, out.numel * out.bytesPerElement); return; }
        const temp = this.engine.temp(out.dtype, out.shape, op);
        this.clear(batch, this.engine.direct(temp), temp.numel * temp.bytesPerElement);
        this.engine.copy(temp, out, batch.commands, encoder, op);
    }

    private run<T>(opts: KernelDispatchOptions, owned: GPUndarray[], encode: (batch: KernelBatch) => T): T {
        const batch: KernelBatch = { commands: [], transfers: [] };
        try {
            const result = encode(batch);
            const { commands, transfers } = batch;
            if (commands.length > 0 || transfers.length > 0) {
                const encoder = opts.encoder ?? this.device.createCommandEncoder();
                const limit = opts.validateLimits ? this.maxWorkgroups : undefined;
                let at = 0;
                for (const transfer of transfers) {
                    if (transfer.at > at) { encodeDispatchBatchWithLimit(encoder, commands.slice(at, transfer.at), opts.label, limit); at = transfer.at; }
                    transfer.encode(encoder);
                }
                if (at < commands.length) encodeDispatchBatchWithLimit(encoder, (at === 0) ? commands : commands.slice(at), opts.label, limit);
                if (!opts.encoder) this.queue.submit([encoder.finish()]);
            }
            return result;
        } catch (error) {
            for (const array of owned) array.destroy();
            throw error;
        } finally { this.scratch.reset(opts.encoder); }
    }

    private getReducePipeline(type: ReduceType, op: ReduceOp): ComputePipeline {
        const key = `kernels:reduce:${type}:${op}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: (type === "f32") ?
                    ((op === "sum") ? reduceSumF32WGSL : (op === "max") ? reduceMaxF32WGSL : reduceMinF32WGSL) :
                    ((op === "sum") ? reduceSumU32WGSL : (op === "max") ? reduceMaxU32WGSL : reduceMinU32WGSL),
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getArgReduceInitialPipeline(op: ArgReduceOp): ComputePipeline {
        const key = `kernels:argreduce:init:${op}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: (op === "argmax") ? argreduceArgmaxInitialWGSL : argreduceArgminInitialWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getArgReducePairsPipeline(op: ArgReduceOp): ComputePipeline {
        const key = `kernels:argreduce:pairs:${op}`;
        return this.getPipeline(key, () => {
            const code = (op === "argmax") ? argreduceArgmaxPairsWGSL : argreduceArgminPairsWGSL;
            return new ComputePipeline(this.device, {
                label: key,
                code,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private encodeReduceScalar(commands: ComputeDispatchCommand[], type: ReduceType, op: ReduceOp, input: KernelResource, inputCount: number, out: KernelResource, labelPrefix: string): void {
        assert(Number.isInteger(inputCount) && inputCount > 0, "encodeReduceScalar expects inputCount > 0");
        const elemBytes = bytesPerElement(type);
        let inRes: KernelResource = input;
        let n = inputCount;
        let pass = 0;
        while (true) {
            const outCount = ceilDiv(n, 512);
            const isFinal = outCount <= 1;
            const outRes: KernelResource = isFinal ? out : this.scratch.acquire(outCount * elemBytes, `${labelPrefix}:reduce:${pass}`);
            const pipeline = this.getReducePipeline(type, op);
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(inRes, n * elemBytes),
                1: this.bindSized(outRes, outCount * elemBytes)
            }, `${labelPrefix}:reduce:${pass}:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: this.workgroups(n, 512),
                label: `${labelPrefix}:reduce:${pass}`
            });
            if (isFinal) break;
            inRes = outRes;
            n = outCount;
            pass++;
        }
    }

    private encodeArgReduceF32Scalar(commands: ComputeDispatchCommand[], op: ArgReduceOp, input: KernelResource, inputCount: number, out: KernelResource, labelPrefix: string): void {
        assert(Number.isInteger(inputCount) && inputCount > 0, "encodeArgReduceF32Scalar expects inputCount > 0");
        let inRes: KernelResource = input;
        let n = inputCount;
        let inStrideBytes = 4;
        let pass = 0;
        while (true) {
            const outCount = ceilDiv(n, 512);
            const isFinal = outCount <= 1;
            const outRes: KernelResource = isFinal ? out : this.scratch.acquire(outCount * 8, `${labelPrefix}:argreduce:${pass}`);
            const pipeline = (pass === 0) ? this.getArgReduceInitialPipeline(op) : this.getArgReducePairsPipeline(op);
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(inRes, n * inStrideBytes),
                1: this.bindSized(outRes, outCount * 8)
            }, `${labelPrefix}:argreduce:${pass}:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: this.workgroups(n, 512),
                label: `${labelPrefix}:argreduce:${pass}`
            });
            if (isFinal) break;
            inRes = outRes;
            n = outCount;
            inStrideBytes = 8;
            pass++;
        }
    }

    private getScanBlockExclusiveU32Pipeline(): ComputePipeline {
        const key = "kernels:scan:blockExclusiveU32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scanBlockExclusiveU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getScanAddBlockOffsetsU32Pipeline(): ComputePipeline {
        const key = "kernels:scan:addBlockOffsetsU32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scanAddBlockOffsetsU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: false }),
                            storageBufferLayout({ binding: 1, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private encodeScanExclusiveU32Into(commands: ComputeDispatchCommand[], input: KernelResource, count: number, out: KernelResource, labelPrefix: string): void {
        assert(Number.isInteger(count) && count >= 0, () => `encodeScanExclusiveU32Into: count must be an integer >= 0 (got ${count})`);
        if (count === 0) return;
        const numBlocks = ceilDiv(count, 1024);
        const blockSums: KernelResource = this.scratch.acquire(numBlocks * 4, `${labelPrefix}:blockSums`);
        {
            const pipeline = this.getScanBlockExclusiveU32Pipeline();
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(input, count * 4),
                1: this.bindSized(out, count * 4),
                2: this.bindSized(blockSums, numBlocks * 4)
            }, `${labelPrefix}:scanBlocks:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: this.workgroups(count, 1024),
                label: `${labelPrefix}:scanBlocks`
            });
        }
        if (numBlocks <= 1) return;
        const blockOffsets: KernelResource = this.scratch.acquire(numBlocks * 4, `${labelPrefix}:blockOffsets`);
        this.encodeScanExclusiveU32Into(commands, blockSums, numBlocks, blockOffsets, `${labelPrefix}:scanBlockSums`);
        {
            const pipeline = this.getScanAddBlockOffsetsU32Pipeline();
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(out, count * 4),
                1: this.bindSized(blockOffsets, numBlocks * 4)
            }, `${labelPrefix}:addOffsets:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: this.workgroups(count, 256),
                label: `${labelPrefix}:addOffsets`
            });
        }
    }

    private encodeRadixZeroScanInto(commands: ComputeDispatchCommand[], keys: KernelResource, count: number, prefix: KernelResource, bit: number, labelPrefix: string): void {
        const numBlocks = ceilDiv(count, 1024);
        const blockSums: KernelResource = this.scratch.acquire(numBlocks * 4, `${labelPrefix}:blockSums`);
        const pipeline = this.getRadixFlagsPipeline(bit);
        const bg = pipeline.createBindGroup(0, {
            0: this.bindSized(keys, count * 4),
            1: this.bindSized(prefix, count * 4),
            2: this.bindSized(blockSums, numBlocks * 4)
        }, `${labelPrefix}:scanBlocks:bg`);
        commands.push({
            pipeline,
            bindGroups: [bg],
            workgroups: this.workgroups(count, 1024),
            label: `${labelPrefix}:scanBlocks`
        });
        if (numBlocks <= 1) return;
        const blockOffsets: KernelResource = this.scratch.acquire(numBlocks * 4, `${labelPrefix}:blockOffsets`);
        this.encodeScanExclusiveU32Into(commands, blockSums, numBlocks, blockOffsets, `${labelPrefix}:scanBlockSums`);
        const addPipeline = this.getScanAddBlockOffsetsU32Pipeline();
        const addBg = addPipeline.createBindGroup(0, {
            0: this.bindSized(prefix, count * 4),
            1: this.bindSized(blockOffsets, numBlocks * 4)
        }, `${labelPrefix}:addOffsets:bg`);
        commands.push({
            pipeline: addPipeline,
            bindGroups: [addBg],
            workgroups: this.workgroups(count, 256),
            label: `${labelPrefix}:addOffsets`
        });
    }

    private getHistogramClearPipeline(): ComputePipeline {
        const key = "kernels:histogram:clearAtomicU32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: histogramClearAtomicU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getHistogramPipeline(local256: boolean = false): ComputePipeline {
        const key = local256 ? "kernels:histogram:u32:local256" : "kernels:histogram:u32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: histogramU32WGSL,
                entryPoint: local256 ? "main_local_256" : "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getCompactPipeline(type: "u32" | "f32"): ComputePipeline {
        const key = `kernels:compact:${type}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: (type === "u32") ? compactU32WGSL : compactF32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: true }),
                            storageBufferLayout({ binding: 3, readOnly: false }),
                            storageBufferLayout({ binding: 4, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getRadixFlagsPipeline(bit: number): ComputePipeline {
        const b = bit | 0;
        const key = `kernels:radix:flags:bit${b}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: sortRadixFlagsU32WGSL,
                entryPoint: "main",
                constants: { BIT: b },
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getRadixScatterPipeline(bit: number): ComputePipeline {
        const b = bit | 0;
        const key = `kernels:radix:scatter:bit${b}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: sortRadixScatterU32WGSL,
                entryPoint: "main",
                constants: { BIT: b },
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getRadixScatterPairsPipeline(bit: number): ComputePipeline {
        const b = bit | 0;
        const key = `kernels:radix:scatterPairs:bit${b}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: sortRadixScatterPairsU32WGSL,
                entryPoint: "main",
                constants: { BIT: b },
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: true }),
                            storageBufferLayout({ binding: 3, readOnly: false }),
                            storageBufferLayout({ binding: 4, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getCopyU32Pipeline(): ComputePipeline {
        const key = "kernels:copy:u32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: copyU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getScaleExtractF32Pipeline(): ComputePipeline {
        const key = "kernels:scale:extractF32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scaleExtractF32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false }),
                            uniformBufferLayout({ binding: 3 })
                        ]
                    }
                ]
            });
        });
    }

    private getScaleHistogramF32Pipeline(local256: boolean = false): ComputePipeline {
        const key = local256 ? "kernels:scale:histogramF32:local256" : "kernels:scale:histogramF32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scaleHistogramF32WGSL,
                entryPoint: local256 ? "main_local_256" : "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            uniformBufferLayout({ binding: 2 })
                        ]
                    }
                ]
            });
        });
    }

    private getScaleRemapF32Pipeline(): ComputePipeline {
        const key = "kernels:scale:remapF32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scaleRemapF32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            uniformBufferLayout({ binding: 2 })
                        ]
                    }
                ]
            });
        });
    }

    private getElementwisePipeline(op: ElementwiseOp, kind: KernelKind): ComputePipeline {
        const key = ELEMENTWISE_KEYS[op][kind];
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: ELEMENTWISE_WGSL[op][kind],
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getSclPipeline(kind: KernelKind): ComputePipeline {
        const key = SCL_KEYS[kind];
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: SCL_WGSL[kind],
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private getDotPipeline(kind: KernelKind, reduce: boolean = false): ComputePipeline {
        const key = reduce ? DOT_REDUCE_KEYS[kind] : DOT_KEYS[kind];
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: DOT_WGSL[kind],
                entryPoint: reduce ? "reduce" : "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getAxpyPipeline(kind: KernelKind): ComputePipeline {
        const key = AXPY_KEYS[kind];
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: AXPY_WGSL[kind],
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: false }),
                            storageBufferLayout({ binding: 3, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private getMatmulPipeline(kind: KernelKind): ComputePipeline {
        const key = MATMUL_KEYS[kind];
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: MATMUL_WGSL[kind],
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: false }),
                            storageBufferLayout({ binding: 3, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private getStridedPipeline(op: StridedOp, kind: KernelKind): ComputePipeline {
        const key = STRIDED_KEYS[op][kind];
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: elementwiseStridedWGSL,
                entryPoint: "main",
                constants: { OPERATION: STRIDED_OPERATION[op], KIND: STRIDED_KIND[kind] },
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: false }),
                            storageBufferLayout({ binding: 3, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private getLuFactorRealPipeline(): ComputePipeline {
        const key = "kernels:lu:factorReal";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luFactorRealWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 16 }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getLuFactorRealLeadPipeline(): ComputePipeline {
        const key = "kernels:lu:factorRealLead";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luFactorRealLeadWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 32 }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getLuFactorRealUpperPipeline(): ComputePipeline {
        const key = "kernels:lu:factorRealUpper";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luFactorRealUpperWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 32 }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getLuFactorRealTrailingPipeline(): ComputePipeline {
        const key = "kernels:lu:factorRealTrailing";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luFactorRealTrailingWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 32 }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getLuSolveRealPipeline(): ComputePipeline {
        const key = "kernels:lu:solveReal";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luSolveRealWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 16 }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: true }),
                            storageBufferLayout({ binding: 3, readOnly: false }),
                            storageBufferLayout({ binding: 4, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private getLuSolveRealSharedPipeline(): ComputePipeline {
        const key = "kernels:lu:solveRealShared";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luSolveRealSharedWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 16 }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: true }),
                            storageBufferLayout({ binding: 3, readOnly: false }),
                            storageBufferLayout({ binding: 4, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private getLuFactorC64LeadPipeline(): ComputePipeline {
        const key = "kernels:lu:factorC64Lead";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luFactorC64LeadWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 32 }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getLuFactorC64UpperPipeline(): ComputePipeline {
        const key = "kernels:lu:factorC64Upper";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luFactorC64UpperWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 32 }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getLuFactorC64TrailingPipeline(): ComputePipeline {
        const key = "kernels:lu:factorC64Trailing";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luFactorC64TrailingWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 32 }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getLuFactorC64SmallPipeline(): ComputePipeline {
        const key = "kernels:lu:factorC64Small";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luFactorC64SmallWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 16 }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getLuSolveC64LargePipeline(): ComputePipeline {
        const key = "kernels:lu:solveC64Large";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luSolveC64LargeWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 16 }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: true }),
                            storageBufferLayout({ binding: 3, readOnly: false }),
                            storageBufferLayout({ binding: 4, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private getLuSolveC64Pipeline(): ComputePipeline {
        const key = "kernels:lu:solveC64";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: luSolveC64WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            uniformBufferLayout({ binding: 0, minBindingSize: 16 }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: true }),
                            storageBufferLayout({ binding: 3, readOnly: false }),
                            storageBufferLayout({ binding: 4, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private encodeCopyU32(commands: ComputeDispatchCommand[], src: KernelResource, count: number, dst: KernelResource, labelPrefix: string): void {
        assert(Number.isInteger(count) && count >= 0, () => `encodeCopyU32: count must be an integer >= 0 (got ${count})`);
        if (count === 0) return;
        const pipeline = this.getCopyU32Pipeline();
        const bg = pipeline.createBindGroup(0, {
            0: this.bindSized(src, count * 4),
            1: this.bindSized(dst, count * 4)
        }, `${labelPrefix}:copy:bg`);
        commands.push({
            pipeline,
            bindGroups: [bg],
            workgroups: this.workgroups(count, 256),
            label: `${labelPrefix}:copy`
        });
    }

    private encodeRadixSortInto(commands: ComputeDispatchCommand[], keys: KernelResource, count: number, out: KernelResource, labelPrefix: string): void {
        const prefix: BufferResource = this.scratch.acquire(count * 4, `${labelPrefix}:prefix`);
        const bufA: KernelResource = this.scratch.acquire(count * 4, `${labelPrefix}:keysScratch`);
        const bufB: KernelResource = out;
        let inBuf: KernelResource = keys;
        let outBuf: KernelResource = bufA;
        for (let bit = 0; bit < 32; bit++) {
            this.encodeRadixZeroScanInto(commands, inBuf, count, prefix, bit, `radix:bit${bit}:scan`);
            const pipeline = this.getRadixScatterPipeline(bit);
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(inBuf, count * 4),
                1: this.bindSized(prefix, count * 4),
                2: this.bindSized(outBuf, count * 4)
            }, `radix:bit${bit}:scatter:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: this.workgroups(count, 256),
                label: `radix:bit${bit}:scatter`
            });
            inBuf = outBuf;
            outBuf = (outBuf === bufA) ? bufB : bufA;
        }
        if (inBuf !== out) this.encodeCopyU32(commands, inBuf, count, out, `${labelPrefix}:finalize`);
    }

    private encodeRadixSortPairsInto(commands: ComputeDispatchCommand[], keys: KernelResource, values: KernelResource, count: number, outKeys: KernelResource, outValues: KernelResource, labelPrefix: string): void {
        const prefix: BufferResource = this.scratch.acquire(count * 4, `${labelPrefix}:prefix`);
        const keyBufA: KernelResource = this.scratch.acquire(count * 4, `${labelPrefix}:keysScratch`);
        const valueBufA: KernelResource = this.scratch.acquire(count * 4, `${labelPrefix}:valuesScratch`);
        let inKeys: KernelResource = keys;
        let outKeysBuf: KernelResource = keyBufA;
        let inValues: KernelResource = values;
        let outValuesBuf: KernelResource = valueBufA;
        for (let bit = 0; bit < 32; bit++) {
            this.encodeRadixZeroScanInto(commands, inKeys, count, prefix, bit, `radixPairs:bit${bit}:scan`);
            const pipeline = this.getRadixScatterPairsPipeline(bit);
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(inKeys, count * 4),
                1: this.bindSized(inValues, count * 4),
                2: this.bindSized(prefix, count * 4),
                3: this.bindSized(outKeysBuf, count * 4),
                4: this.bindSized(outValuesBuf, count * 4)
            }, `radixPairs:bit${bit}:scatter:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: this.workgroups(count, 256),
                label: `radixPairs:bit${bit}:scatter`
            });
            inKeys = outKeysBuf;
            outKeysBuf = (outKeysBuf === keyBufA) ? outKeys : keyBufA;
            inValues = outValuesBuf;
            outValuesBuf = (outValuesBuf === valueBufA) ? outValues : valueBufA;
        }
        if (inKeys !== outKeys) this.encodeCopyU32(commands, inKeys, count, outKeys, `${labelPrefix}:finalizeKeys`);
        if (inValues !== outValues) this.encodeCopyU32(commands, inValues, count, outValues, `${labelPrefix}:finalizeValues`);
    }

    private encodeLuFactor(commands: ComputeDispatchCommand[], kind: KernelKind, matrices: KernelResource, ipiv: KernelResource, batchCount: number, n: number, encoder: GPUCommandEncoder | undefined, labelPrefix: string): void {
        const elemsPerMatrix = n * n;
        const needBytes = batchCount * elemsPerMatrix * ((kind === "c64") ? 8 : 4);
        const ipivBytes = batchCount * n * 4;
        if (n < 160) {
            const params = this.scratch.params(new Uint32Array([batchCount >>> 0, n >>> 0, elemsPerMatrix >>> 0, 0]), encoder);
            const pipeline = (kind === "c64") ? this.getLuFactorC64SmallPipeline() : this.getLuFactorRealPipeline();
            const bg = pipeline.createBindGroup(0, { 0: params, 1: this.bindSized(matrices, needBytes), 2: this.bindSized(ipiv, ipivBytes) }, `${labelPrefix}:bg`);
            commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(batchCount, 1), label: labelPrefix });
            return;
        }
        const leadPipe = (kind === "c64") ? this.getLuFactorC64LeadPipeline() : this.getLuFactorRealLeadPipeline();
        const upperPipe = (kind === "c64") ? this.getLuFactorC64UpperPipeline() : this.getLuFactorRealUpperPipeline();
        const trailingPipe = (kind === "c64") ? this.getLuFactorC64TrailingPipeline() : this.getLuFactorRealTrailingPipeline();
        const PANEL_B = 16;
        for (let kk = 0; kk < n; kk += PANEL_B) {
            const pw = Math.min(PANEL_B, n - kk);
            const trail = n - (kk + pw);
            const params = this.scratch.params(new Uint32Array([batchCount >>> 0, n >>> 0, elemsPerMatrix >>> 0, kk >>> 0, pw >>> 0, 0, 0, 0]), encoder);
            const bgLead = leadPipe.createBindGroup(0, { 0: params, 1: this.bindSized(matrices, needBytes), 2: this.bindSized(ipiv, ipivBytes) }, `${labelPrefix}:lead:bg`);
            commands.push({ pipeline: leadPipe, bindGroups: [bgLead], workgroups: this.workgroups(batchCount, 1), label: `${labelPrefix}:lead:kk${kk}` });
            if (trail > 0) {
                const bgUpper = upperPipe.createBindGroup(0, { 0: params, 1: this.bindSized(matrices, needBytes) }, `${labelPrefix}:upper:bg`);
                const bgTrailing = trailingPipe.createBindGroup(0, { 0: params, 1: this.bindSized(matrices, needBytes) }, `${labelPrefix}:trailing:bg`);
                const totalTrsm = batchCount * trail;
                commands.push({ pipeline: upperPipe, bindGroups: [bgUpper], workgroups: this.workgroups(totalTrsm, 256), label: `${labelPrefix}:upper:kk${kk}` });
                const mDim = trail;
                const nDim = trail;
                const tileM = 16;
                const tileN = 8;
                const mTiles = Math.ceil(mDim / tileM);
                const nTiles = Math.ceil(nDim / tileN);
                commands.push({ pipeline: trailingPipe, bindGroups: [bgTrailing], workgroups: this.workgroups(nTiles * mTiles * batchCount, 1), label: `${labelPrefix}:trailing:kk${kk}` });
            }
        }
    }

    private encodeLuSolve(commands: ComputeDispatchCommand[], kind: KernelKind, lu: KernelResource, ipiv: KernelResource, rhs: KernelResource, x: KernelResource, batchCount: number, n: number, encoder: GPUCommandEncoder | undefined, labelPrefix: string): void {
        const elemBytes = (kind === "c64") ? 8 : 4;
        const params = this.scratch.params(new Uint32Array([batchCount >>> 0, n >>> 0, (n * n) >>> 0, 0]), encoder);
        const pipeline = (kind === "c64") ? ((n <= 512) ? this.getLuSolveC64Pipeline() : this.getLuSolveC64LargePipeline()) : ((n <= 512) ? this.getLuSolveRealSharedPipeline() : this.getLuSolveRealPipeline());
        const rhsBytes = batchCount * n * elemBytes;
        const bg = pipeline.createBindGroup(0, { 0: params, 1: this.bindSized(lu, batchCount * n * n * elemBytes), 2: this.bindSized(rhs, rhsBytes), 3: this.bindSized(x, rhsBytes), 4: this.bindSized(ipiv, batchCount * n * 4) }, `${labelPrefix}:bg`);
        commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(batchCount, 1), label: labelPrefix });
    }

    private matmulLayout(a: GPUndarray, rowAxis: number, colAxis: number, kind: KernelKind, op: string): MatmulLayout | null {
        const elem = (kind === "c64") ? 8 : 4;
        const { resource, delta } = this.engine.binding(a, op);
        const originBytes = delta + a.offsetBytes;
        const rs = (rowAxis >= 0 && a.shape[rowAxis] !== 1) ? a.stridesBytes[rowAxis]! : 0;
        const cs = (colAxis >= 0 && a.shape[colAxis] !== 1) ? a.stridesBytes[colAxis]! : 0;
        if (kind === "c64" && (a.stridesBytes[a.ndim - 1] !== 4 || (originBytes % 8) !== 0 || (rs % 8) !== 0 || (cs % 8) !== 0)) return null;
        assert(resource.size / elem <= 0x7FFFFFFF, () => `${op}: a ${resource.size}-byte matmul binding exceeds the i32 element-index range`);
        return { binding: resource, origin: originBytes / elem, rs: rs / elem, cs: cs / elem };
    }

    private matmulOperand(commands: ComputeDispatchCommand[], a: GPUndarray, rowAxis: number, colAxis: number, kind: KernelKind, encoder: GPUCommandEncoder | undefined, op: string): MatmulLayout {
        if (a.numel === 0) return { binding: { buffer: this.scratch.acquire(8, `${op}:empty`), offset: 0, size: 8 }, origin: 0, rs: 0, cs: 0 };
        const native = this.matmulLayout(a, rowAxis, colAxis, kind, op);
        if (native) return native;
        return this.matmulLayout(this.engine.stage(a, commands, encoder, op), rowAxis, colAxis, kind, op)!;
    }

    private encodeStrided(commands: ComputeDispatchCommand[], name: StridedOp, kind: KernelKind, a: GPUndarray, b: GPUndarray, out: GPUndarray, alpha: ReadonlyArray<number> | null, encoder: GPUCommandEncoder | undefined, op: string): void {
        const shape = out.shape;
        const logical = (kind === "c64") ? shape.slice(0, -1) : shape;
        const sa = broadcastStrides(a.shape, a.stridesBytes, shape, op), sb = broadcastStrides(b.shape, b.stridesBytes, shape, op);
        const so = new Array<number>(logical.length);
        for (let d = logical.length - 1, stride = (kind === "c64") ? 8 : 4; d >= 0; d--) { so[d] = stride; stride *= logical[d]!; }
        const c = coalesceDims(logical, [sa.slice(0, logical.length), sb.slice(0, logical.length), so]);
        assert(c.shape.length <= GPU_MAX_RANK, () => `${op}: strided operands support at most ${GPU_MAX_RANK} dimensions after coalescing (got ${c.shape.length})`);
        const ba = this.engine.binding(a, op), bb = this.engine.binding(b, op);
        const t = this.target(commands, out, [ba.resource, bb.resource], encoder, op);
        const count = (kind === "c64") ? out.numel / 2 : out.numel;
        const words = this.stridedParamsData;
        words.fill(0);
        words[0] = count;
        words[1] = c.shape.length;
        words[2] = ba.delta + a.offsetBytes;
        words[3] = bb.delta + b.offsetBytes;
        words[4] = (kind === "c64") ? sa[shape.length - 1]! >>> 0 : 0;
        words[5] = (kind === "c64") ? sb[shape.length - 1]! >>> 0 : 0;
        if (alpha && kind === "u32") words[6] = alpha[0]!;
        else if (alpha) this.stridedAlpha.set(alpha);
        for (let d = 0; d < c.shape.length; d++) {
            words[8 + d] = c.shape[d]!;
            words[16 + d] = c.strides[0]![d]! >>> 0;
            words[24 + d] = c.strides[1]![d]! >>> 0;
        }
        const params = this.scratch.params(words, encoder);
        const pipeline = this.getStridedPipeline(name, kind);
        const bg = pipeline.createBindGroup(0, { 0: ba.resource, 1: bb.resource, 2: this.bindSized(t.binding, out.numel * 4), 3: params }, `${op}:bg`);
        commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(count, 256), label: op });
        this.finish(commands, t, encoder, op);
    }

    private dense(a: GPUndarray, b: GPUndarray, shape: ReadonlyArray<number>): boolean {
        return sameShape(a.shape, shape) && sameShape(b.shape, shape) && this.engine.bindable(a) && this.engine.bindable(b);
    }

    add(a: GPUndarray, b: GPUndarray, opts: ElementwiseOptions = {}): GPUndarray {
        return this.elementwise("add", a, b, opts);
    }

    sub(a: GPUndarray, b: GPUndarray, opts: ElementwiseOptions = {}): GPUndarray {
        return this.elementwise("sub", a, b, opts);
    }

    mul(a: GPUndarray, b: GPUndarray, opts: ElementwiseOptions = {}): GPUndarray {
        return this.elementwise("mul", a, b, opts);
    }

    private elementwise(name: ElementwiseOp, a: GPUndarray, b: GPUndarray, opts: ElementwiseOptions): GPUndarray {
        const op = kernelOp(name);
        const complex = complexFlag(opts.complex, op);
        const x = this.input(a, op, "a", REAL, complex);
        const y = this.input(b, op, "b", REAL, complex);
        this.sameDType(x, y, op, "a and b");
        const shape = fullShape(broadcastShapes(x.shape, y.shape, op), x.kind);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const out = this.output(opts.out, x.dtype, shape, opts, op, owned);
            if (out.numel === 0) return out;
            if (!this.dense(a, b, shape)) { this.encodeStrided(commands, name, x.kind, a, b, out, null, opts.encoder, op); return out; }
            const ab = this.engine.direct(a);
            const bb = this.engine.direct(b);
            const t = this.target(commands, out, [ab, bb], opts.encoder, op);
            const bytes = out.numel * 4;
            const pipeline = this.getElementwisePipeline(name, x.kind);
            const bg = pipeline.createBindGroup(0, { 0: this.bindSized(ab, bytes), 1: this.bindSized(bb, bytes), 2: this.bindSized(t.binding, bytes) }, `${op}:bg`);
            commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups((x.kind === "c64") ? out.numel / 2 : out.numel, 256), label: op });
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    scl(x: GPUndarray, alpha: KernelScalar, opts: ElementwiseOptions = {}): GPUndarray {
        const op = kernelOp("scl");
        const complex = complexFlag(opts.complex, op);
        const input = this.input(x, op, "x", REAL, complex);
        assert(alpha !== undefined, () => `${op}: alpha is required`);
        const scalar = scalarWords(alpha, 1, input.kind, op, "alpha");
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const out = this.output(opts.out, input.dtype, x.shape, opts, op, owned);
            if (out.numel === 0) return out;
            const xb = this.operand(commands, x, opts.encoder, op);
            const t = this.target(commands, out, [xb], opts.encoder, op);
            const bytes = out.numel * 4;
            const params = this.scratch.params((input.kind === "u32") ? new Uint32Array(scalar) : new Float32Array(scalar), opts.encoder);
            const pipeline = this.getSclPipeline(input.kind);
            const bg = pipeline.createBindGroup(0, { 0: this.bindSized(xb, bytes), 1: this.bindSized(t.binding, bytes), 2: params }, `${op}:bg`);
            commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups((input.kind === "c64") ? out.numel / 2 : out.numel, 256), label: op });
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    axpy(x: GPUndarray, y: GPUndarray, alpha: KernelScalar, opts: ElementwiseOptions = {}): GPUndarray {
        const op = kernelOp("axpy");
        const complex = complexFlag(opts.complex, op);
        const xi = this.input(x, op, "x", REAL, complex);
        const yi = this.input(y, op, "y", REAL, complex);
        this.sameDType(xi, yi, op, "x and y");
        assert(alpha !== undefined, () => `${op}: alpha is required`);
        const scalar = scalarWords(alpha, 1, xi.kind, op, "alpha");
        const shape = fullShape(broadcastShapes(xi.shape, yi.shape, op), xi.kind);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const out = this.output(opts.out, xi.dtype, shape, opts, op, owned);
            if (out.numel === 0) return out;
            if (!this.dense(x, y, shape)) { this.encodeStrided(commands, "axpy", xi.kind, x, y, out, scalar, opts.encoder, op); return out; }
            const xb = this.engine.direct(x);
            const yb = this.engine.direct(y);
            const t = this.target(commands, out, [xb, yb], opts.encoder, op);
            const bytes = out.numel * 4;
            const params = this.scratch.params((xi.kind === "u32") ? new Uint32Array(scalar) : new Float32Array(scalar), opts.encoder);
            const pipeline = this.getAxpyPipeline(xi.kind);
            const bg = pipeline.createBindGroup(0, { 0: this.bindSized(xb, bytes), 1: this.bindSized(yb, bytes), 2: this.bindSized(t.binding, bytes), 3: params }, `${op}:bg`);
            commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups((xi.kind === "c64") ? out.numel / 2 : out.numel, 256), label: op });
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    dot(a: GPUndarray, b: GPUndarray, opts: ElementwiseOptions = {}): GPUndarray {
        const op = kernelOp("dot");
        const complex = complexFlag(opts.complex, op);
        const x = this.input(a, op, "a", REAL, complex);
        const y = this.input(b, op, "b", REAL, complex);
        this.sameDType(x, y, op, "a and b");
        const n = this.oneDimensional(x, op, "a");
        assert(this.oneDimensional(y, op, "b") === n, () => `${op}: a and b must have the same length (got ${n} and ${y.shape[0]})`);
        const elemBytes = (x.kind === "c64") ? 8 : 4;
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, (batch) => {
            const { commands } = batch;
            const out = this.output(opts.out, x.dtype, fullShape([], x.kind), opts, op, owned);
            if (n === 0) { this.zero(batch, out, owned, opts.encoder, op); return out; }
            const ab = this.operand(commands, a, opts.encoder, op);
            const bb = this.operand(commands, b, opts.encoder, op);
            const t = this.target(commands, out, [ab, bb], opts.encoder, op);
            let count = n;
            let input: KernelResource = ab;
            let pass = 0;
            while (true) {
                const partialCount = ceilDiv(count, 512);
                const partial: KernelResource = (partialCount === 1) ? t.binding : this.scratch.acquire(partialCount * elemBytes, `${op}:partial:${pass}`);
                const pipeline = this.getDotPipeline(x.kind, pass > 0);
                const second: KernelResource = (pass === 0) ? bb : input;
                const bg = pipeline.createBindGroup(0, { 0: this.bindSized(input, count * elemBytes), 1: this.bindSized(second, count * elemBytes), 2: this.bindSized(partial, partialCount * elemBytes) }, `${op}:${pass}:bg`);
                commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(count, 512), label: `${op}:${pass}` });
                if (partialCount === 1) break;
                if (x.kind !== "c64") { this.encodeReduceScalar(commands, x.dtype, "sum", partial, partialCount, t.binding, op); break; }
                input = partial;
                count = partialCount;
                pass++;
            }
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    matmul(a: GPUndarray, b: GPUndarray, opts: MatmulOptions = {}): GPUndarray {
        const op = kernelOp("matmul");
        const complex = complexFlag(opts.complex, op);
        const x = this.input(a, op, "a", REAL, complex);
        const y = this.input(b, op, "b", REAL, complex);
        this.sameDType(x, y, op, "a and b");
        const as = x.shape, bs = y.shape;
        assert(as.length >= 1 && as.length <= 2 && bs.length >= 1 && bs.length <= 2, () => `${op}: a and b must be 1-D or 2-D${complex ? " in their logical shapes" : ""} (got [${as}] and [${bs}]); batched matmul is not supported`);
        const m = (as.length === 2) ? as[0]! : 1;
        const k = as[as.length - 1]!;
        const n = (bs.length === 2) ? bs[1]! : 1;
        assert(bs[0] === k, () => `${op}: shapes [${as}] and [${bs}] are not aligned (${k} != ${bs[0]})`);
        const alpha = scalarWords(opts.alpha, 1, x.kind, op, "alpha");
        const beta = scalarWords(opts.beta, 0, x.kind, op, "beta");
        const accumulate = beta.some((v) => v !== 0);
        assert(!accumulate || opts.out !== undefined, () => `${op}: beta != 0 requires out, since a new output starts as zeros`);
        const shape = fullShape([...((as.length === 2) ? [m] : []), ...((bs.length === 2) ? [n] : [])], x.kind);
        const workgroups = makeWorkgroupCounts(ceilDiv(n, 16), ceilDiv(m, 16), 1);
        const maxWorkgroups = this.device.limits.maxComputeWorkgroupsPerDimension;
        assert(workgroups[0] <= maxWorkgroups && workgroups[1] <= maxWorkgroups, () => `${op}: a [${m}, ${n}] result needs ${workgroups[0]}x${workgroups[1]} workgroups, which exceeds device.limits.maxComputeWorkgroupsPerDimension (${maxWorkgroups})`);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const out = this.output(opts.out, x.dtype, shape, opts, op, owned);
            if (m === 0 || n === 0) return out;
            let la = this.matmulOperand(commands, a, (as.length === 2) ? 0 : -1, as.length - 1, x.kind, opts.encoder, op);
            let lb = this.matmulOperand(commands, b, 0, (bs.length === 2) ? 1 : -1, x.kind, opts.encoder, op);
            if (m * n * k >= 2 ** 27 && k > 1 && n > 1 && Math.abs(la.cs) !== 1 && Math.abs(lb.cs) !== 1) {
                la = this.matmulLayout(this.engine.stage(a, commands, opts.encoder, op), (as.length === 2) ? 0 : -1, as.length - 1, x.kind, op)!;
                lb = this.matmulLayout(this.engine.stage(b, commands, opts.encoder, op), 0, (bs.length === 2) ? 1 : -1, x.kind, op)!;
            }
            const outRow = (as.length === 2) ? 0 : -1;
            const outCol = (bs.length === 2) ? ((as.length === 2) ? 1 : 0) : -1;
            const aliased = out.buffer.buffer === rawBuffer(la.binding) || out.buffer.buffer === rawBuffer(lb.binding);
            const native = aliased ? null : this.matmulLayout(out, outRow, outCol, x.kind, op);
            const temp = native ? null : (accumulate ? this.engine.stage(out, commands, opts.encoder, op) : this.engine.temp(out.dtype, out.shape, op));
            const lc = native ?? this.matmulLayout(temp!, outRow, outCol, x.kind, op)!;
            const view = this.matmulParamsView;
            view.setUint32(0, m, true);
            view.setUint32(4, n, true);
            view.setUint32(8, k, true);
            for (let i = 3; i < 8; i++) view.setUint32(4 * i, 0, true);
            const scalars = [...alpha, ...beta];
            for (let i = 0; i < scalars.length; i++) {
                if (x.kind === "u32") view.setUint32(12 + 4 * i, scalars[i]!, true);
                else view.setFloat32(12 + 4 * i, scalars[i]!, true);
            }
            const layout = [la.origin, la.rs, la.cs, lb.origin, lb.rs, lb.cs, lc.origin, lc.rs, lc.cs];
            for (let i = 0; i < layout.length; i++) view.setInt32(32 + 4 * i, layout[i]!, true);
            for (let i = 17; i < 20; i++) view.setUint32(4 * i, 0, true);
            const params = this.scratch.params(this.matmulParamsData, opts.encoder);
            const pipeline = this.getMatmulPipeline(x.kind);
            const bg = pipeline.createBindGroup(0, { 0: la.binding, 1: lb.binding, 2: lc.binding, 3: params }, `${op}:bg`);
            commands.push({ pipeline, bindGroups: [bg], workgroups, label: op });
            if (temp) this.engine.copy(temp, out, commands, opts.encoder, op);
            return out;
        });
    }

    sum(a: GPUndarray, opts: KernelOutputOptions = {}): GPUndarray {
        return this.reduce("sum", a, opts);
    }

    min(a: GPUndarray, opts: KernelOutputOptions = {}): GPUndarray {
        return this.reduce("min", a, opts);
    }

    max(a: GPUndarray, opts: KernelOutputOptions = {}): GPUndarray {
        return this.reduce("max", a, opts);
    }

    private reduce(name: ReduceOp, a: GPUndarray, opts: KernelOutputOptions): GPUndarray {
        const op = kernelOp(name);
        const x = this.input(a, op, "a", REAL);
        assert(name === "sum" || a.numel > 0, () => `${op}: cannot reduce an empty array because ${name} has no identity`);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, (batch) => {
            const { commands } = batch;
            const out = this.output(opts.out, x.dtype, [], opts, op, owned);
            if (a.numel === 0) { this.zero(batch, out, owned, opts.encoder, op); return out; }
            const ab = this.operand(commands, a, opts.encoder, op);
            const t = this.target(commands, out, [ab], opts.encoder, op);
            this.encodeReduceScalar(commands, x.dtype, name, ab, a.numel, t.binding, op);
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    argmin(a: GPUndarray, opts: KernelOutputOptions = {}): GPUndarray {
        return this.argReduce("argmin", a, opts);
    }

    argmax(a: GPUndarray, opts: KernelOutputOptions = {}): GPUndarray {
        return this.argReduce("argmax", a, opts);
    }

    private argReduce(name: ArgReduceOp, a: GPUndarray, opts: KernelOutputOptions): GPUndarray {
        const op = kernelOp(name);
        this.input(a, op, "a", F32);
        assert(a.numel > 0, () => `${op}: cannot reduce an empty array because ${name} has no identity`);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, (batch) => {
            const { commands } = batch;
            const out = this.output(opts.out, "u32", [], opts, op, owned);
            const ab = this.operand(commands, a, opts.encoder, op);
            const pair = this.scratch.acquire(8, `${op}:pair`);
            this.encodeArgReduceF32Scalar(commands, name, ab, a.numel, pair, op);
            if ((out.buffer.usage & GPUBufferUsage.COPY_DST) !== 0) {
                const offset = out.buffer.offsetBytes + out.baseOffsetBytes + out.offsetBytes;
                batch.transfers.push({ at: commands.length, encode: (encoder) => encoder.copyBufferToBuffer(pair, 4, out.buffer.buffer, offset, 4) });
            } else this.engine.copy(GPUndarray.wrap(wrapStorageBuffer(this.device, this.queue, pair, { byteLength: 8 }), "u32", { shape: [], offsetBytes: 4 }), out, commands, opts.encoder, op);
            return out;
        });
    }

    scanExclusive(a: GPUndarray, opts: KernelOutputOptions = {}): GPUndarray {
        const op = kernelOp("scanExclusive");
        const n = this.oneDimensional(this.input(a, op, "a", U32), op, "a");
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const out = this.output(opts.out, "u32", [n], opts, op, owned);
            if (n === 0) return out;
            const ab = this.operand(commands, a, opts.encoder, op);
            const t = this.target(commands, out, [ab], opts.encoder, op);
            this.encodeScanExclusiveU32Into(commands, ab, n, t.binding, op);
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    private clearBins(batch: KernelBatch, t: KernelTarget, bins: number, op: string): void {
        if (((t.temp ?? t.array).buffer.usage & GPUBufferUsage.COPY_DST) !== 0) { this.clear(batch, t.binding, bins * 4); return; }
        const pipeline = this.getHistogramClearPipeline();
        const bg = pipeline.createBindGroup(0, { 0: this.bindSized(t.binding, bins * 4) }, `${op}:clear:bg`);
        batch.commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(bins, 256), label: `${op}:clear` });
    }

    private histogramTarget(batch: KernelBatch, out: GPUndarray, reads: ReadonlyArray<KernelResource>, owned: ReadonlyArray<GPUndarray>, clear: boolean, encoder: GPUCommandEncoder | undefined, op: string): KernelTarget {
        const fresh = owned.includes(out);
        const t = this.target(batch.commands, out, reads, encoder, op, !clear && !fresh);
        if (!(fresh && !t.temp) && (clear || fresh)) this.clearBins(batch, t, out.numel, op);
        return t;
    }

    histogram(keys: GPUndarray, opts: HistogramOptions): GPUndarray {
        const op = kernelOp("histogram");
        assert(typeof opts === "object" && opts !== null, () => `${op}: options with bins are required`);
        const bins = opts.bins;
        assert(Number.isInteger(bins) && bins >= 0 && bins <= 0xFFFFFFFF, () => `${op}: bins must be an integer >= 0 (got ${bins})`);
        const n = this.oneDimensional(this.input(keys, op, "keys", U32), op, "keys");
        const clear = opts.clear ?? true;
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, (batch) => {
            const { commands } = batch;
            const out = this.output(opts.out, "u32", [bins], opts, op, owned);
            if (bins === 0) return out;
            const kb = (n > 0) ? this.operand(commands, keys, opts.encoder, op) : null;
            const t = this.histogramTarget(batch, out, kb ? [kb] : [], owned, clear, opts.encoder, op);
            if (kb) {
                const local256 = bins <= 256;
                const pipeline = this.getHistogramPipeline(local256);
                const bg = pipeline.createBindGroup(0, { 0: this.bindSized(kb, n * 4), 1: this.bindSized(t.binding, bins * 4) }, `${op}:hist:bg`);
                commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(n, local256 ? 1024 : 256), label: `${op}:accum` });
            }
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    compact(values: GPUndarray, flags: GPUndarray, opts: CompactOptions = {}): CompactResult {
        const op = kernelOp("compact");
        const v = this.input(values, op, "values", REAL);
        const n = this.oneDimensional(v, op, "values");
        assert(this.oneDimensional(this.input(flags, op, "flags", U32), op, "flags") === n, () => `${op}: values and flags must have the same length (got ${n} and ${flags.shape[0]})`);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, (batch) => {
            const { commands } = batch;
            const out = this.output(opts.out, v.dtype, [n], opts, op, owned, "out", ":values");
            const count = this.output(opts.outCount, "u32", [], opts, op, owned, "outCount", ":count");
            assert(!overlaps(out, count), () => `${op}: out and outCount must not overlap`);
            if (n === 0) { this.zero(batch, count, owned, opts.encoder, op); return { values: out, count }; }
            const vb = this.operand(commands, values, opts.encoder, op);
            const fb = this.operand(commands, flags, opts.encoder, op);
            const prefix: BufferResource = this.scratch.acquire(n * 4, `${op}:prefix`);
            this.encodeScanExclusiveU32Into(commands, fb, n, prefix, `${op}:scan`);
            const tv = this.target(commands, out, [vb, fb], opts.encoder, op, !owned.includes(out));
            const tc = this.target(commands, count, [vb, fb], opts.encoder, op);
            const pipeline = this.getCompactPipeline(v.dtype);
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(vb, n * 4),
                1: this.bindSized(fb, n * 4),
                2: this.bindSized(prefix, n * 4),
                3: this.bindSized(tv.binding, n * 4),
                4: this.bindSized(tc.binding, 4)
            }, `${op}:bg`);
            commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(n, 256), label: `${op}:scatter` });
            this.finish(commands, tv, opts.encoder, op);
            this.finish(commands, tc, opts.encoder, op);
            return { values: out, count };
        });
    }

    sort(keys: GPUndarray, opts: KernelOutputOptions = {}): GPUndarray {
        const op = kernelOp("sort");
        const n = this.oneDimensional(this.input(keys, op, "keys", U32), op, "keys");
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const out = this.output(opts.out, "u32", [n], opts, op, owned);
            if (n === 0 || (n === 1 && out === keys)) return out;
            const kb = this.operand(commands, keys, opts.encoder, op);
            const t = this.target(commands, out, (n === 1) ? [kb] : [], opts.encoder, op);
            if (n === 1) this.encodeCopyU32(commands, kb, 1, t.binding, op);
            else this.encodeRadixSortInto(commands, kb, n, t.binding, op);
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    sortPairs(keys: GPUndarray, values: GPUndarray, opts: SortPairsOptions = {}): SortPairsResult {
        const op = kernelOp("sortPairs");
        const n = this.oneDimensional(this.input(keys, op, "keys", U32), op, "keys");
        const v = this.input(values, op, "values", REAL);
        assert(this.oneDimensional(v, op, "values") === n, () => `${op}: keys and values must have the same length (got ${n} and ${values.shape[0]})`);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const outKeys = this.output(opts.outKeys, "u32", [n], opts, op, owned, "outKeys", ":keys");
            const outValues = this.output(opts.outValues, v.dtype, [n], opts, op, owned, "outValues", ":values");
            assert(!overlaps(outKeys, outValues), () => `${op}: outKeys and outValues must not overlap`);
            if (n === 0) return { keys: outKeys, values: outValues };
            const kb = this.operand(commands, keys, opts.encoder, op);
            const vb = this.operand(commands, values, opts.encoder, op);
            if (n === 1 && !overlaps(outKeys, values) && !overlaps(outValues, keys)) {
                for (const [src, input, dst] of [[kb, keys, outKeys], [vb, values, outValues]] as const) {
                    if (dst === input) continue;
                    const t = this.target(commands, dst, [kb, vb], opts.encoder, op);
                    this.encodeCopyU32(commands, src, 1, t.binding, op);
                    this.finish(commands, t, opts.encoder, op);
                }
                return { keys: outKeys, values: outValues };
            }
            const tk = this.target(commands, outKeys, [], opts.encoder, op);
            const tv = this.target(commands, outValues, [], opts.encoder, op);
            this.encodeRadixSortPairsInto(commands, kb, vb, n, tk.binding, tv.binding, op);
            this.finish(commands, tk, opts.encoder, op);
            this.finish(commands, tv, opts.encoder, op);
            return { keys: outKeys, values: outValues };
        });
    }

    private squareMatrices(a: KernelInput, op: string, label: string): { n: number; batchShape: number[]; batchCount: number } {
        const shape = a.shape;
        assert(shape.length >= 2 && shape[shape.length - 1] === shape[shape.length - 2], () => `${op}: ${label} must hold square matrices in its last two${(a.kind === "c64") ? " logical" : ""} axes (got shape [${a.array.shape}])`);
        const n = shape[shape.length - 1]!;
        const batchShape = shape.slice(0, -2);
        assert(n * n <= 0xFFFFFFFF, () => `${op}: n*n overflow`);
        return { n, batchShape, batchCount: product(batchShape) };
    }

    luFactor(a: GPUndarray, opts: LuFactorOptions = {}): LuFactorResult {
        const op = kernelOp("luFactor");
        const complex = complexFlag(opts.complex, op);
        const x = this.input(a, op, "a", F32, complex);
        const { n, batchShape, batchCount } = this.squareMatrices(x, op, "a");
        const overwrite = opts.overwrite ?? false;
        assert(typeof overwrite === "boolean", () => `${op}: overwrite must be a boolean`);
        assert(!overwrite || opts.out === undefined, () => `${op}: out cannot be combined with overwrite: true`);
        assert(!overwrite || !mayAddressTwice(a.shape, a.stridesBytes, a.bytesPerElement), () => `${op}: overwrite: true requires a to address each element once (not a broadcast or overlapping view)`);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const lu = overwrite ? a : this.output(opts.out, "f32", a.shape, opts, op, owned, "out", ":lu");
            const ipiv = this.output(opts.ipiv, "u32", [...batchShape, n], opts, op, owned, "ipiv", ":ipiv");
            assert(!overlaps(lu, ipiv), () => `${op}: ipiv must not overlap the factored matrices`);
            if (lu.numel === 0) return { lu, ipiv };
            let matrices: KernelTarget;
            if (overwrite ? this.engine.bindable(a) : (this.engine.bindable(lu) && lu.buffer.buffer !== a.buffer.buffer)) {
                if (!overwrite) this.engine.copy(a, lu, commands, opts.encoder, op);
                matrices = { array: lu, binding: this.engine.direct(lu), temp: null };
            } else {
                const temp = this.engine.stage(a, commands, opts.encoder, op);
                matrices = { array: lu, binding: this.engine.direct(temp), temp };
            }
            const pivots = this.target(commands, ipiv, [], opts.encoder, op);
            this.encodeLuFactor(commands, x.kind, matrices.binding, pivots.binding, batchCount, n, opts.encoder, op);
            this.finish(commands, matrices, opts.encoder, op);
            this.finish(commands, pivots, opts.encoder, op);
            return { lu, ipiv };
        });
    }

    luSolve(lu: GPUndarray, ipiv: GPUndarray, b: GPUndarray, opts: LuSolveOptions = {}): GPUndarray {
        const op = kernelOp("luSolve");
        const complex = complexFlag(opts.complex, op);
        const l = this.input(lu, op, "lu", F32, complex);
        const p = this.input(ipiv, op, "ipiv", U32);
        const r = this.input(b, op, "b", F32, complex);
        const { n, batchShape, batchCount } = this.squareMatrices(l, op, "lu");
        const vectors = [...batchShape, n];
        assert(sameShape(p.shape, vectors), () => `${op}: ipiv must have shape [${vectors}] (got [${p.shape}])`);
        assert(sameShape(r.shape, vectors), () => `${op}: b must have${complex ? " logical" : ""} shape [${vectors}] to match lu (got [${r.shape}]); batch dimensions are not broadcast`);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const out = this.output(opts.out, "f32", b.shape, opts, op, owned);
            if (out.numel === 0) return out;
            const lb = this.operand(commands, lu, opts.encoder, op);
            const pb = this.operand(commands, ipiv, opts.encoder, op);
            const bb = this.operand(commands, b, opts.encoder, op);
            const t = this.target(commands, out, [lb, pb, bb], opts.encoder, op);
            this.encodeLuSolve(commands, l.kind, lb, pb, bb, t.binding, batchCount, n, opts.encoder, op);
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    scaleExtract(src: GPUndarray, opts: ScaleExtractOptions = {}): ScaleExtractResult {
        const op = kernelOp("scaleExtract");
        this.input(src, op, "src", F32);
        assert(src.ndim === 1 || (src.ndim === 2 && src.shape[1]! >= 1 && src.shape[1]! <= 4), () => `${op}: src must have shape [count] or [count, components] with 1 to 4 components (got [${src.shape}])`);
        const count = src.shape[0]!;
        const components = (src.ndim === 2) ? src.shape[1]! : 1;
        const componentIndex = opts.componentIndex ?? 0;
        assert(Number.isInteger(componentIndex) && componentIndex >= 0 && componentIndex <= 3, () => `${op}: componentIndex must be an integer from 0 to 3 (got ${componentIndex}); components at or beyond the component count read as 0`);
        const valueMode = opts.valueMode ?? "component";
        assert(valueMode === "component" || valueMode === "magnitude", () => `${op}: invalid valueMode ${String(valueMode)}`);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const values = this.output(opts.outValues, "f32", [count], opts, op, owned, "outValues", ":values");
            const flags = this.output(opts.outFlags, "u32", [count], opts, op, owned, "outFlags", ":flags");
            assert(!overlaps(values, flags), () => `${op}: outValues and outFlags must not overlap`);
            if (count === 0) return { values, flags };
            const rowStride = (count === 1) ? components * 4 : src.stridesBytes[0]!;
            const native = rowStride > 0 && (components === 1 || src.stridesBytes[1] === 4);
            const source = native ? src : this.engine.stage(src, commands, opts.encoder, op);
            const { resource, delta } = this.engine.binding(source, op);
            const stride = native ? rowStride / 4 : components;
            const tv = this.target(commands, values, [resource], opts.encoder, op);
            const tf = this.target(commands, flags, [resource], opts.encoder, op);
            const paramsData = this.scaleExtractParamsData;
            paramsData[0] = count >>> 0;
            paramsData[1] = components >>> 0;
            paramsData[2] = componentIndex >>> 0;
            paramsData[3] = scaleValueModeToId(valueMode) >>> 0;
            paramsData[4] = stride >>> 0;
            paramsData[5] = ((delta + source.offsetBytes) / 4) >>> 0;
            paramsData[6] = 0;
            paramsData[7] = 0;
            const params = this.scratch.params(paramsData, opts.encoder);
            const pipeline = this.getScaleExtractF32Pipeline();
            const bg = pipeline.createBindGroup(0, {
                0: resource,
                1: this.bindSized(tv.binding, count * 4),
                2: this.bindSized(tf.binding, count * 4),
                3: params
            }, `${op}:bg`);
            commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(count, 256), label: op });
            this.finish(commands, tv, opts.encoder, op);
            this.finish(commands, tf, opts.encoder, op);
            return { values, flags };
        });
    }

    scaleHistogram(values: GPUndarray, opts: ScaleHistogramOptions): GPUndarray {
        const op = kernelOp("scaleHistogram");
        assert(typeof opts === "object" && opts !== null, () => `${op}: options with bins, minValue, and maxValue are required`);
        const bins = opts.bins;
        assert(Number.isInteger(bins) && bins >= 0 && bins <= 0xFFFFFFFF, () => `${op}: bins must be an integer >= 0 (got ${bins})`);
        assert(typeof opts.minValue === "number" && typeof opts.maxValue === "number", () => `${op}: minValue and maxValue must be numbers`);
        const n = this.oneDimensional(this.input(values, op, "values", F32), op, "values");
        const clear = opts.clear ?? true;
        const accumulate = n > 0 && Number.isFinite(opts.minValue) && Number.isFinite(opts.maxValue) && opts.maxValue > opts.minValue;
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, (batch) => {
            const { commands } = batch;
            const out = this.output(opts.out, "u32", [bins], opts, op, owned);
            if (bins === 0) return out;
            const vb = accumulate ? this.operand(commands, values, opts.encoder, op) : null;
            const t = this.histogramTarget(batch, out, vb ? [vb] : [], owned, clear, opts.encoder, op);
            if (vb) {
                const dv = this.scaleHistogramParamsView;
                dv.setUint32(0, n >>> 0, true);
                dv.setUint32(4, bins >>> 0, true);
                dv.setFloat32(8, opts.minValue, true);
                dv.setFloat32(12, opts.maxValue, true);
                const params = this.scratch.params(this.scaleHistogramParamsData, opts.encoder);
                const local256 = bins <= 256;
                const pipeline = this.getScaleHistogramF32Pipeline(local256);
                const bg = pipeline.createBindGroup(0, { 0: this.bindSized(vb, n * 4), 1: this.bindSized(t.binding, bins * 4), 2: params }, `${op}:hist:bg`);
                commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(n, local256 ? 1024 : 256), label: `${op}:accum` });
            }
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }

    scaleRemap(x: GPUndarray, opts: ScaleRemapOptions): GPUndarray {
        const op = kernelOp("scaleRemap");
        assert(typeof opts === "object" && opts !== null, () => `${op}: options with a transform are required`);
        this.input(x, op, "x", F32);
        const transform = normalizeScaleTransform(opts.transform);
        const owned: GPUndarray[] = [];
        return this.run(opts, owned, ({ commands }) => {
            const out = this.output(opts.out, "f32", x.shape, opts, op, owned);
            const count = out.numel;
            if (count === 0) return out;
            const xb = this.operand(commands, x, opts.encoder, op);
            const t = this.target(commands, out, [xb], opts.encoder, op);
            const packed = this.scaleTransformPacked;
            packScaleTransform(transform, packed, 0);
            const raw = this.scaleRemapParamsData;
            const dv = this.scaleRemapParamsView;
            dv.setUint32(0, count >>> 0, true);
            const f32 = this.scaleRemapParamsF32;
            f32[4] = packed[4];
            f32[5] = packed[5];
            f32[6] = 0;
            f32[7] = scaleClampModeToId(transform.clampMode);
            f32[8] = packed[8];
            f32[9] = packed[9];
            f32[10] = packed[10];
            f32[11] = packed[11];
            f32[12] = scaleModeToId(transform.mode);
            f32[13] = packed[13];
            f32[14] = packed[14];
            f32[15] = packed[15];
            f32[16] = packed[16];
            f32[17] = 0;
            f32[18] = 0;
            f32[19] = 0;
            const params = this.scratch.params(raw, opts.encoder);
            const pipeline = this.getScaleRemapF32Pipeline();
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(xb, count * 4),
                1: this.bindSized(t.binding, count * 4),
                2: params
            }, `${op}:bg`);
            commands.push({ pipeline, bindGroups: [bg], workgroups: this.workgroups(count, 256), label: op });
            this.finish(commands, t, opts.encoder, op);
            return out;
        });
    }
}

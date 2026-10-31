/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert } from "../utils";
import { StorageBuffer, wrapStorageBuffer, type StorageBufferDescriptor, type WrapStorageBufferOptions, UniformBuffer, type UniformBufferDescriptor } from "./buffer";
import { ComputePipeline, type ComputePipelineDescriptor } from "./pipeline";
import { workgroups1D, workgroups2D, workgroups3D, workgroupsFolded, type WorkgroupCounts, type WorkgroupExtent } from "./workgroups";
import { encodeDispatch, encodeDispatchBatchWithLimit, type ComputeDispatchCommand, validateWorkgroupsForDevice } from "./dispatch";
import { ComputeKernels } from "./kernels";
import { RGBA8BufferCanvasBlitter, type BlitRGBA8BufferToCanvasOptions, type RGBA8BufferSource } from "./blit";
import { ReadbackRing, type ReadbackRingDescriptor } from "./readback";
import { NdarrayGPUEngine, NdarrayNamespace } from "./ndarray";
import { ScratchAllocator, type ScratchAllocatorDescriptor } from "./scratch";

export type ComputeDispatchOptions = {
    submit?: boolean;
    validateLimits?: boolean;
};

export type ComputeDescriptor = {
    readback?: ReadbackRingDescriptor;
    scratch?: ScratchAllocatorDescriptor;
};

export class Compute {
    readonly device: GPUDevice;
    readonly queue: GPUQueue;
    readonly kernels: ComputeKernels;
    readonly readback: ReadbackRing;
    readonly ndarray: NdarrayNamespace;
    private readonly scratch: ScratchAllocator;
    private readonly engine: NdarrayGPUEngine;
    private _rgba8Blitter: RGBA8BufferCanvasBlitter | null = null;

    constructor(device: GPUDevice, queue: GPUQueue, desc: ComputeDescriptor = {}) {
        this.device = device;
        this.queue = queue;
        this.scratch = new ScratchAllocator(device, queue, desc.scratch);
        this.engine = new NdarrayGPUEngine(device, queue, this.scratch);
        this.kernels = new ComputeKernels(device, queue, this.scratch, this.engine);
        this.readback = new ReadbackRing(device, queue, desc.readback);
        this.ndarray = new NdarrayNamespace(device, queue, this.readback, this.scratch, this.engine);
    }

    createStorageBuffer(desc: StorageBufferDescriptor): StorageBuffer {
        return new StorageBuffer(this.device, this.queue, desc);
    }

    wrapStorageBuffer(buffer: GPUBuffer, options: WrapStorageBufferOptions = {}): StorageBuffer {
        return wrapStorageBuffer(this.device, this.queue, buffer, options);
    }

    createUniformBuffer(desc: UniformBufferDescriptor): UniformBuffer {
        return new UniformBuffer(this.device, this.queue, desc);
    }

    createPipeline(desc: ComputePipelineDescriptor): ComputePipeline {
        return new ComputePipeline(this.device, desc);
    }

    createReadbackRing(desc: ReadbackRingDescriptor = {}): ReadbackRing {
        return new ReadbackRing(this.device, this.queue, desc);
    }

    encodeDispatch(encoder: GPUCommandEncoder, cmd: ComputeDispatchCommand, validateLimits: boolean = false): void {
        if (validateLimits) validateWorkgroupsForDevice(this.device, cmd.workgroups);
        encodeDispatch(encoder, cmd);
    }

    encodeDispatchBatch(encoder: GPUCommandEncoder, commands: ReadonlyArray<ComputeDispatchCommand>, label?: string, validateLimits: boolean = false): void {
        encodeDispatchBatchWithLimit(encoder, commands, label, validateLimits ? this.device.limits.maxComputeWorkgroupsPerDimension : undefined);
    }

    dispatch(cmd: ComputeDispatchCommand, opts: ComputeDispatchOptions = {}): GPUCommandBuffer {
        const encoder = this.device.createCommandEncoder();
        this.encodeDispatch(encoder, cmd, opts.validateLimits ?? false);
        const commandBuffer = encoder.finish();
        if (opts.submit !== false) this.queue.submit([commandBuffer]);
        return commandBuffer;
    }

    dispatchBatch(commands: ReadonlyArray<ComputeDispatchCommand>, label?: string, opts: ComputeDispatchOptions = {}): GPUCommandBuffer {
        const encoder = this.device.createCommandEncoder();
        this.encodeDispatchBatch(encoder, commands, label, opts.validateLimits ?? false);
        const commandBuffer = encoder.finish();
        if (opts.submit !== false) this.queue.submit([commandBuffer]);
        return commandBuffer;
    }

    dispatch1D(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, invocations: number, workgroupSizeX: number, label?: string, opts: ComputeDispatchOptions = {}): GPUCommandBuffer {
        const workgroups: WorkgroupCounts = this.workgroups1D(invocations, workgroupSizeX);
        return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
    }

    dispatch2D(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, width: number, height: number, workgroupSizeX: number, workgroupSizeY: number, label?: string, opts: ComputeDispatchOptions = {}): GPUCommandBuffer {
        const workgroups: WorkgroupCounts = this.workgroups2D(width, height, workgroupSizeX, workgroupSizeY);
        return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
    }

    dispatch3D(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, width: number, height: number, depth: number, workgroupSizeX: number, workgroupSizeY: number, workgroupSizeZ: number, label?: string, opts: ComputeDispatchOptions = {}): GPUCommandBuffer {
        const workgroups: WorkgroupCounts = this.workgroups3D(width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ);
        return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
    }

    dispatchFolded(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, size: WorkgroupExtent, workgroupSize: WorkgroupExtent, label?: string, opts: ComputeDispatchOptions = {}): GPUCommandBuffer {
        const workgroups: WorkgroupCounts = this.workgroupsFolded(size, workgroupSize);
        return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
    }

    blitRGBA8BufferToCanvas(encoder: GPUCommandEncoder, canvas: HTMLCanvasElement, src: RGBA8BufferSource, outWidth: number, outHeight: number, opts: BlitRGBA8BufferToCanvasOptions = {}): void {
        if (!this._rgba8Blitter) this._rgba8Blitter = new RGBA8BufferCanvasBlitter(this.device, this.queue);
        this._rgba8Blitter.encode(encoder, canvas, src, outWidth, outHeight, opts);
    }

    workgroups1D(invocations: number, workgroupSizeX: number): WorkgroupCounts {
        return this.assertWorkgroupLimit(workgroups1D(invocations, workgroupSizeX));
    }

    workgroups2D(width: number, height: number, workgroupSizeX: number, workgroupSizeY: number): WorkgroupCounts {
        return this.assertWorkgroupLimit(workgroups2D(width, height, workgroupSizeX, workgroupSizeY));
    }

    workgroups3D(width: number, height: number, depth: number, workgroupSizeX: number, workgroupSizeY: number, workgroupSizeZ: number): WorkgroupCounts {
        return this.assertWorkgroupLimit(workgroups3D(width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ));
    }

    workgroupsFolded(size: WorkgroupExtent, workgroupSize: WorkgroupExtent): WorkgroupCounts {
        return workgroupsFolded(size, workgroupSize, this.device.limits.maxComputeWorkgroupsPerDimension);
    }

    private assertWorkgroupLimit(workgroups: WorkgroupCounts): WorkgroupCounts {
        const max = this.device.limits.maxComputeWorkgroupsPerDimension;
        const [x, y, z] = workgroups;
        assert(x <= max && y <= max && z <= max, `${x}x${y}x${z} workgroups exceed device.limits.maxComputeWorkgroupsPerDimension (${max}); use workgroupsFolded() or dispatchFolded() with a shader that decodes the folded grid`);
        return workgroups;
    }

    destroy(): void {
        this.ndarray.destroy();
        this._rgba8Blitter?.destroy();
        this._rgba8Blitter = null;
        this.readback.destroy();
        this.kernels.destroy();
        this.engine.destroy();
        this.scratch.destroy();
    }
}

export { StorageBuffer, UniformBuffer } from "./buffer";
export type { StorageBufferDescriptor, WrapStorageBufferOptions, UniformBufferDescriptor, TypedArrayConstructor } from "./buffer";
export { ComputePipeline } from "./pipeline";
export type { ComputePipelineDescriptor } from "./pipeline";
export { ceilDiv, makeWorkgroupSize, makeWorkgroupCounts, workgroups1D, workgroups2D, workgroups3D, workgroupsFolded } from "./workgroups";
export type { WorkgroupSize, WorkgroupCounts, WorkgroupExtent } from "./workgroups";
export { normalizeWorkgroups, validateWorkgroupsForDevice, encodeDispatch, encodeDispatchBatch } from "./dispatch";
export type { DispatchWorkgroups, ComputeDispatchCommand } from "./dispatch";
export { RGBA8BufferCanvasBlitter } from "./blit";
export type { RGBA8BufferSource, BlitRGBA8BufferToCanvasOptions } from "./blit";
export { ComputeKernels } from "./kernels";
export type { KernelDispatchOptions, KernelOutputOptions, KernelScalar, ElementwiseOptions, MatmulOptions, HistogramOptions, CompactOptions, CompactResult, SortPairsOptions, SortPairsResult, LuFactorOptions, LuFactorResult, LuSolveOptions, ScaleExtractOptions, ScaleExtractResult, ScaleHistogramOptions, ScaleRemapOptions } from "./kernels";
export { ReadbackRing } from "./readback";
export type { ReadbackSource, ReadbackRingDescriptor } from "./readback";
export type { ScratchAllocatorDescriptor } from "./scratch";
export { Ndarray, CPUndarray, GPUndarray, NdarrayNamespace, dtypeInfo } from "./ndarray";
export type { DType, RealDType, ComplexDType, DTypeKind, ComplexScalar, NdarrayResidency, NdLayoutDescriptor, DTypeInfo, NumberTypedArray, NumberTypedArrayConstructor, NdarrayGPUOptions, NdarrayCreateOptions, NdarraySliceEntry, NdarraySliceRange, NdarrayPadMode, NdarrayPadWidth, NdarrayPadOptions, NdarrayOperationOptions, NdarrayOverflowMode, NdarrayRoundingMode, NdarrayCastOptions, NdarrayCopyIntoOptions, NdarrayParameter, NdarrayNormalizeOptions, NdarrayResizeMethod, NdarrayResizeOptions } from "./ndarray";

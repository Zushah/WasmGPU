/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { StorageBuffer, type StorageBufferDescriptor, UniformBuffer, type UniformBufferDescriptor } from "./buffer";
import { ComputePipeline, type ComputePipelineDescriptor } from "./pipeline";
import { workgroups1D, workgroups2D, workgroups3D, type WorkgroupCounts } from "./workgroups";
import { encodeDispatch, encodeDispatchBatchWithLimit, type ComputeDispatchCommand, validateWorkgroupsForDevice } from "./dispatch";
import { ComputeKernels } from "./kernels";
import { RGBA8BufferCanvasBlitter, type BlitRGBA8BufferToCanvasOptions, type RGBA8BufferSource } from "./blit";
import { ReadbackRing, type ReadbackRingDescriptor } from "./readback";
import { Ndarray, CPUndarray, GPUndarray } from "./ndarray";

export type ComputeDispatchOptions = {
    submit?: boolean;
    validateLimits?: boolean;
};

export type ComputeDescriptor = {
    readback?: ReadbackRingDescriptor;
};

export class Compute {
    readonly device: GPUDevice;
    readonly queue: GPUQueue;
    readonly kernels: ComputeKernels;
    readonly readback: ReadbackRing;
    readonly ndarray = Ndarray;
    readonly CPUndarray = CPUndarray;
    readonly GPUndarray = GPUndarray;
    private _rgba8Blitter: RGBA8BufferCanvasBlitter | null = null;

    constructor(device: GPUDevice, queue: GPUQueue, desc: ComputeDescriptor = {}) {
        this.device = device;
        this.queue = queue;
        this.kernels = new ComputeKernels(device, queue);
        this.readback = new ReadbackRing(device, queue, desc.readback);
    }

    createStorageBuffer(desc: StorageBufferDescriptor): StorageBuffer {
        return new StorageBuffer(this.device, this.queue, desc);
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
        const workgroups: WorkgroupCounts = workgroups1D(invocations, workgroupSizeX);
        return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
    }

    dispatch2D(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, width: number, height: number, workgroupSizeX: number, workgroupSizeY: number, label?: string, opts: ComputeDispatchOptions = {}): GPUCommandBuffer {
        const workgroups: WorkgroupCounts = workgroups2D(width, height, workgroupSizeX, workgroupSizeY);
        return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
    }

    dispatch3D(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, width: number, height: number, depth: number, workgroupSizeX: number, workgroupSizeY: number, workgroupSizeZ: number, label?: string, opts: ComputeDispatchOptions = {}): GPUCommandBuffer {
        const workgroups: WorkgroupCounts = workgroups3D(width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ);
        return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
    }

    blitRGBA8BufferToCanvas(encoder: GPUCommandEncoder, canvas: HTMLCanvasElement, src: RGBA8BufferSource, outWidth: number, outHeight: number, opts: BlitRGBA8BufferToCanvasOptions = {}): void {
        if (!this._rgba8Blitter) this._rgba8Blitter = new RGBA8BufferCanvasBlitter(this.device, this.queue);
        this._rgba8Blitter.encode(encoder, canvas, src, outWidth, outHeight, opts);
    }

    workgroups1D(invocations: number, workgroupSizeX: number): WorkgroupCounts {
        return workgroups1D(invocations, workgroupSizeX);
    }

    workgroups2D(width: number, height: number, workgroupSizeX: number, workgroupSizeY: number): WorkgroupCounts {
        return workgroups2D(width, height, workgroupSizeX, workgroupSizeY);
    }

    workgroups3D(width: number, height: number, depth: number, workgroupSizeX: number, workgroupSizeY: number, workgroupSizeZ: number): WorkgroupCounts {
        return workgroups3D(width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ);
    }

    destroy(): void {
        this._rgba8Blitter?.destroy();
        this._rgba8Blitter = null;
        this.readback.destroy();
        this.kernels.destroy();
    }
}

export { StorageBuffer, UniformBuffer } from "./buffer";
export type { StorageBufferDescriptor, UniformBufferDescriptor, TypedArrayConstructor } from "./buffer";
export { ComputePipeline, storageBufferLayout, uniformBufferLayout } from "./pipeline";
export type { ComputePipelineDescriptor, ComputeBindGroupLayoutDescriptor, ComputeBindGroupResources, StorageBufferBindingLayout, UniformBufferBindingLayout, BufferResource, BufferBindingResource } from "./pipeline";
export { ceilDiv, makeWorkgroupSize, makeWorkgroupCounts, workgroups1D, workgroups2D, workgroups3D } from "./workgroups";
export type { WorkgroupSize, WorkgroupCounts } from "./workgroups";
export { normalizeWorkgroups, validateWorkgroupsForDevice, encodeDispatch, encodeDispatchBatch } from "./dispatch";
export type { DispatchWorkgroups, ComputeDispatchCommand } from "./dispatch";
export { RGBA8BufferCanvasBlitter } from "./blit";
export type { RGBA8BufferSource, BlitRGBA8BufferToCanvasOptions } from "./blit";
export { ComputeKernels } from "./kernels";
export type { KernelDispatchOptions, VectorKernelOptions, C64Scalar, GemmF32Options, GemmU32Options, GemmC64Options, ReduceOptions, ArgReduceOptions, ScanOptions, HistogramOptions, CompactOptions, RadixSortOptions, RadixSortPairsOptions, RadixSortPairsResult, CopyOptions, ScaleExtractOptions, ScaleExtractResult, ScaleHistogramOptions, ScaleRemapOptions, ReduceOp, ArgReduceOp } from "./kernels";
export { ReadbackRing } from "./readback";
export type { ReadbackSource, ReadbackRingDescriptor } from "./readback";
export { Ndarray, CPUndarray, GPUndarray, dtypeInfo } from "./ndarray";
export type { DType, NdarrayResidency, NdLayoutDescriptor, DTypeInfo, NumberTypedArray, NumberTypedArrayConstructor } from "./ndarray";

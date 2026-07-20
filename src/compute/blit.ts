/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert, isNonNegativeInt, resolveGPUBuffer } from "../utils";
import type { StorageBuffer } from "./buffer";
import blitRGBA8WGSL from "../wgsl/compute/blit-rgba8.wgsl";

export type RGBA8BufferSource = GPUBuffer | StorageBuffer;

export type BlitRGBA8BufferToCanvasOptions = {
    label?: string;
    format?: GPUTextureFormat;
    alphaMode?: GPUCanvasAlphaMode;
    loadOp?: GPULoadOp;
    storeOp?: GPUStoreOp;
    clearColor?: GPUColor;
    flipY?: boolean;
    autoResize?: boolean;
    dpr?: number;
};

type PipelineState = {
    pipeline: GPURenderPipeline;
    bindGroupLayout: GPUBindGroupLayout;
    bindGroups: WeakMap<GPUBuffer, GPUBindGroup>;
};

type CanvasState = {
    context: GPUCanvasContext;
    width: number;
    height: number;
    format: GPUTextureFormat | null;
    alphaMode: GPUCanvasAlphaMode;
    configured: boolean;
};

const getDefaultCanvasFormat = (): GPUTextureFormat => {
    const nav = (typeof navigator !== "undefined") ? navigator : null;
    const gpu = (nav && (nav as any).gpu) ? (nav as any).gpu : null;
    if (gpu && typeof gpu.getPreferredCanvasFormat === "function") return gpu.getPreferredCanvasFormat();
    throw new Error("blitRGBA8BufferToCanvas: opts.format must be provided when navigator.gpu is unavailable.");
};

export class RGBA8BufferCanvasBlitter {
    private readonly device: GPUDevice;
    private readonly queue: GPUQueue;
    private readonly paramsStride: number;
    private readonly paramsCapacity: number;
    private readonly paramsBuffer: GPUBuffer;
    private readonly paramsF32: Float32Array;
    private paramsIndex: number = 0;
    private readonly pipelineByFormat: Map<GPUTextureFormat, PipelineState> = new Map();
    private readonly canvasState: WeakMap<HTMLCanvasElement, CanvasState> = new WeakMap();

    constructor(device: GPUDevice, queue: GPUQueue, opts: { uniformCapacity?: number } = {}) {
        this.device = device;
        this.queue = queue;
        const alignment = Math.max(256, device.limits.minUniformBufferOffsetAlignment);
        this.paramsStride = alignTo(32, alignment);
        this.paramsCapacity = Math.max(1, opts.uniformCapacity ?? 256);
        this.paramsBuffer = device.createBuffer({
            label: "WasmGPU:compute:blitRGBA8:params",
            size: this.paramsStride * this.paramsCapacity,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.paramsF32 = new Float32Array(8);
    }

    destroy(): void {
        this.paramsBuffer.destroy();
        this.pipelineByFormat.clear();
    }

    encode(encoder: GPUCommandEncoder, canvas: HTMLCanvasElement, src: RGBA8BufferSource, outWidth: number, outHeight: number, opts: BlitRGBA8BufferToCanvasOptions = {}): void {
        assert(isNonNegativeInt(outWidth) && isNonNegativeInt(outHeight), `outWidth/outHeight must be integers >= 0 (got ${outWidth}x${outHeight})`);
        if (outWidth === 0 || outHeight === 0) return;
        const state = this.getOrCreateCanvasState(canvas);
        const format = opts.format ?? state.format ?? getDefaultCanvasFormat();
        const alphaMode = opts.alphaMode ?? state.alphaMode ?? "opaque";
        const didResize = (opts.autoResize ?? true) ? this.autoResizeCanvas(canvas, state, opts.dpr) : this.syncCanvasSizeWithoutResize(canvas, state);
        const needsConfigure = !state.configured || didResize || state.format !== format || state.alphaMode !== alphaMode;
        if (needsConfigure) {
            state.context.configure({ device: this.device, format, alphaMode });
            state.configured = true;
            state.format = format;
            state.alphaMode = alphaMode;
        }
        const displayW = Math.max(1, canvas.width);
        const displayH = Math.max(1, canvas.height);
        this.paramsF32[0] = displayW;
        this.paramsF32[1] = displayH;
        this.paramsF32[2] = outWidth;
        this.paramsF32[3] = outHeight;
        this.paramsF32[4] = opts.flipY ? 1 : 0;
        this.paramsF32[5] = 0;
        this.paramsF32[6] = 0;
        this.paramsF32[7] = 0;
        const uniformOffset = this.allocParamsChunk();
        this.queue.writeBuffer(this.paramsBuffer, uniformOffset, this.paramsF32.buffer as ArrayBuffer, this.paramsF32.byteOffset, this.paramsF32.byteLength);
        const pipelineState = this.getPipeline(format);
        const srcBuffer = resolveGPUBuffer(src);
        let bindGroup = pipelineState.bindGroups.get(srcBuffer);
        if (!bindGroup) {
            bindGroup = this.device.createBindGroup({
                label: opts.label ? `${opts.label}:bindGroup` : undefined,
                layout: pipelineState.bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this.paramsBuffer, offset: 0, size: 32 }
                    },
                    {
                        binding: 1,
                        resource: { buffer: srcBuffer }
                    }
                ]
            });
            pipelineState.bindGroups.set(srcBuffer, bindGroup);
        }
        const view = state.context.getCurrentTexture().createView();
        const loadOp: GPULoadOp = opts.loadOp ?? "load";
        const storeOp: GPUStoreOp = opts.storeOp ?? "store";
        const clearValue: GPUColor = opts.clearColor ?? { r: 0, g: 0, b: 0, a: 1 };
        const pass = encoder.beginRenderPass({
            label: opts.label,
            colorAttachments: [
                {
                    view,
                    clearValue,
                    loadOp,
                    storeOp
                }
            ]
        });
        pass.setPipeline(pipelineState.pipeline);
        pass.setBindGroup(0, bindGroup, [uniformOffset]);
        pass.draw(3, 1, 0, 0);
        pass.end();
    }

    private allocParamsChunk(): number {
        const idx = this.paramsIndex++;
        if (this.paramsIndex >= this.paramsCapacity) this.paramsIndex = 0;
        return (idx % this.paramsCapacity) * this.paramsStride;
    }

    private getOrCreateCanvasState(canvas: HTMLCanvasElement): CanvasState {
        const cached = this.canvasState.get(canvas);
        if (cached) return cached;
        const context = canvas.getContext("webgpu") as unknown as GPUCanvasContext;
        assert(!!context, "blitRGBA8BufferToCanvas: failed to acquire a WebGPU canvas context");
        const state: CanvasState = {
            context,
            width: Math.max(1, canvas.width),
            height: Math.max(1, canvas.height),
            format: null,
            alphaMode: "opaque",
            configured: false
        };
        this.canvasState.set(canvas, state);
        return state;
    }

    private autoResizeCanvas(canvas: HTMLCanvasElement, state: CanvasState, dprOverride?: number): boolean {
        const dpr = dprOverride ?? Math.max(1, (typeof window !== "undefined") ? (window.devicePixelRatio || 1) : 1);
        const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (w === state.width && h === state.height) return false;
        state.width = w;
        state.height = h;
        canvas.width = w;
        canvas.height = h;
        return true;
    }

    private syncCanvasSizeWithoutResize(canvas: HTMLCanvasElement, state: CanvasState): boolean {
        const w = Math.max(1, canvas.width);
        const h = Math.max(1, canvas.height);
        if (w === state.width && h === state.height) return false;
        state.width = w;
        state.height = h;
        return true;
    }

    private getPipeline(format: GPUTextureFormat): PipelineState {
        const cached = this.pipelineByFormat.get(format);
        if (cached) return cached;
        const module = this.device.createShaderModule({ label: "WasmGPU:compute:blitRGBA8:shader", code: blitRGBA8WGSL });
        const bindGroupLayout = this.device.createBindGroupLayout({
            label: "WasmGPU:compute:blitRGBA8:bgl",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform",
                        hasDynamicOffset: true,
                        minBindingSize: 32
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "read-only-storage"
                    }
                }
            ]
        });
        const pipeline = this.device.createRenderPipeline({
            label: "WasmGPU:compute:blitRGBA8:pipeline",
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            vertex: {
                module,
                entryPoint: "vs_main"
            },
            fragment: {
                module,
                entryPoint: "fs_main",
                targets: [{ format }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            }
        });
        const state: PipelineState = {
            pipeline,
            bindGroupLayout,
            bindGroups: new WeakMap()
        };
        this.pipelineByFormat.set(format, state);
        return state;
    }
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { isGPUBuffer } from "../utils";
import type { StorageBuffer, UniformBuffer } from "../compute/buffer";

export type BufferResource = GPUBuffer | StorageBuffer | UniformBuffer;

export type BufferBinding = {
    buffer: BufferResource;
    offset?: number;
    size?: number;
};

export type BindingResource = BufferResource | BufferBinding | GPUSampler | GPUTextureView | GPUExternalTexture;

export type BindGroupResources = Record<number, BindingResource> | ReadonlyArray<{ binding: number; resource: BindingResource }>;

export type BindGroupLayoutDescriptor = {
    label?: string;
    entries: GPUBindGroupLayoutEntry[]
};

export type StorageBufferBindingLayout = {
    binding: number;
    readOnly?: boolean;
    visibility?: GPUShaderStageFlags;
    hasDynamicOffset?: boolean;
    minBindingSize?: number
};

export type UniformBufferBindingLayout = {
    binding: number;
    visibility?: GPUShaderStageFlags;
    hasDynamicOffset?: boolean;
    minBindingSize?: number
};

export type SamplerBindingLayout = {
    binding: number;
    visibility?: GPUShaderStageFlags;
    type?: GPUSamplerBindingType
};

export type TextureBindingLayout = {
    binding: number;
    visibility?: GPUShaderStageFlags;
    sampleType?: GPUTextureSampleType;
    viewDimension?: GPUTextureViewDimension;
    multisampled?: boolean
};

const validateBinding = (binding: number, context: string): void => { if (!Number.isInteger(binding) || binding < 0) throw new Error(`${context}: binding must be a non-negative integer (got ${binding})`); };

export const storageBufferLayout = (opts: StorageBufferBindingLayout): GPUBindGroupLayoutEntry => {
    validateBinding(opts.binding, "webgpuInterop.storageBufferLayout");
    return {
        binding: opts.binding,
        visibility: opts.visibility ?? GPUShaderStage.COMPUTE,
        buffer: { type: opts.readOnly ? "read-only-storage" : "storage", hasDynamicOffset: opts.hasDynamicOffset ?? false, minBindingSize: opts.minBindingSize }
    };
};

export const uniformBufferLayout = (opts: UniformBufferBindingLayout): GPUBindGroupLayoutEntry => {
    validateBinding(opts.binding, "webgpuInterop.uniformBufferLayout");
    return {
        binding: opts.binding,
        visibility: opts.visibility ?? GPUShaderStage.COMPUTE,
        buffer: { type: "uniform", hasDynamicOffset: opts.hasDynamicOffset ?? false, minBindingSize: opts.minBindingSize }
    };
};

export const samplerLayout = (opts: SamplerBindingLayout): GPUBindGroupLayoutEntry => {
    validateBinding(opts.binding, "webgpuInterop.samplerLayout");
    return {
        binding: opts.binding,
        visibility: opts.visibility ?? GPUShaderStage.FRAGMENT,
        sampler: { type: opts.type ?? "filtering" }
    };
};

export const textureLayout = (opts: TextureBindingLayout): GPUBindGroupLayoutEntry => {
    validateBinding(opts.binding, "webgpuInterop.textureLayout");
    return {
        binding: opts.binding,
        visibility: opts.visibility ?? GPUShaderStage.FRAGMENT,
        texture: { sampleType: opts.sampleType ?? "float", viewDimension: opts.viewDimension ?? "2d", multisampled: opts.multisampled ?? false }
    };
};

export const normalizeBindGroupLayout = (descriptor: BindGroupLayoutDescriptor, context: string = "WebGPU bind group layout"): BindGroupLayoutDescriptor => {
    if (!descriptor || !Array.isArray(descriptor.entries)) throw new Error(`${context}: entries must be an array`);
    const seen = new Set<number>();
    const entries = descriptor.entries.map((entry) => {
        validateBinding(entry.binding, context);
        if (seen.has(entry.binding)) throw new Error(`${context}: duplicate binding ${entry.binding}`);
        seen.add(entry.binding);
        const kindCount = Number(!!entry.buffer) + Number(!!entry.sampler) + Number(!!entry.texture) + Number(!!entry.storageTexture) + Number(!!entry.externalTexture);
        if (kindCount !== 1) throw new Error(`${context}: binding ${entry.binding} must define exactly one WebGPU resource layout`);
        return {
            ...entry,
            buffer: entry.buffer ? { ...entry.buffer } : undefined,
            sampler: entry.sampler ? { ...entry.sampler } : undefined,
            texture: entry.texture ? { ...entry.texture } : undefined,
            storageTexture: entry.storageTexture ? { ...entry.storageTexture } : undefined,
            externalTexture: entry.externalTexture ? { ...entry.externalTexture } : undefined
        };
    });
    return { label: descriptor.label, entries };
};

const resolveBuffer = (resource: BufferResource): GPUBuffer => {
    if (isGPUBuffer(resource)) return resource;
    const buffer = (resource as StorageBuffer | UniformBuffer).buffer;
    if (!isGPUBuffer(buffer)) throw new Error("WebGPU binding resource: expected a GPUBuffer or WasmGPU buffer wrapper");
    return buffer;
};

export const normalizeBindingResource = (resource: BindingResource): GPUBindingResource => {
    if (!resource || typeof resource !== "object") throw new Error("WebGPU binding resource: resource must be a WebGPU object or buffer binding");
    if (isGPUBuffer(resource)) return { buffer: resource };
    if ("buffer" in resource) {
        const binding = resource as BufferBinding;
        if (binding.offset !== undefined && (!Number.isInteger(binding.offset) || binding.offset < 0)) throw new Error(`WebGPU buffer binding: offset must be a non-negative integer (got ${binding.offset})`);
        if (binding.size !== undefined && (!Number.isInteger(binding.size) || binding.size <= 0)) throw new Error(`WebGPU buffer binding: size must be a positive integer (got ${binding.size})`);
        return { buffer: resolveBuffer(binding.buffer), offset: binding.offset, size: binding.size };
    }
    return resource as GPUSampler | GPUTextureView | GPUExternalTexture;
};

export const normalizeBindGroupResources = (resources: BindGroupResources, context: string = "WebGPU bind group resources"): GPUBindGroupEntry[] => {
    if (!resources || typeof resources !== "object") throw new Error(`${context}: resources must be a binding record or array`);
    const seen = new Set<number>();
    const entries: GPUBindGroupEntry[] = [];
    const add = (binding: number, resource: BindingResource): void => {
        validateBinding(binding, context);
        if (seen.has(binding)) throw new Error(`${context}: duplicate binding ${binding}`);
        seen.add(binding);
        entries.push({ binding, resource: normalizeBindingResource(resource) });
    };
    if (Array.isArray(resources)) for (const entry of resources as ReadonlyArray<{ binding: number; resource: BindingResource }>) add(entry.binding, entry.resource);
    else for (const key of Object.keys(resources)) {
        const binding = Number(key);
        if (!Number.isInteger(binding) || String(binding) !== key) throw new Error(`${context}: invalid binding key '${key}'`);
        add(binding, (resources as Record<number, BindingResource>)[binding]);
    }
    return entries;
};

export const validateResourcesForLayout = (layout: BindGroupLayoutDescriptor, resources: BindGroupResources, context: string = "WebGPU bind group"): GPUBindGroupEntry[] => {
    const normalizedLayout = normalizeBindGroupLayout(layout, `${context} layout`);
    const entries = normalizeBindGroupResources(resources, `${context} resources`);
    const expected = new Set(normalizedLayout.entries.map((entry) => entry.binding));
    for (const entry of entries) if (!expected.delete(entry.binding)) throw new Error(`${context}: resource binding ${entry.binding} is not declared by the layout`);
    if (expected.size > 0) throw new Error(`${context}: missing resources for bindings ${Array.from(expected).join(", ")}`);
    return entries;
};

export const webgpuInterop = Object.freeze({
    storageBufferLayout,
    uniformBufferLayout,
    samplerLayout,
    textureLayout,
    bindGroupLayout: normalizeBindGroupLayout,
    bindingResource: normalizeBindingResource,
    bindGroupResources: normalizeBindGroupResources
});

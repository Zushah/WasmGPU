/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { BlendMode, CullMode, CustomMaterial, DataMaterial, Material, StandardMaterial, UnlitMaterial, getMaterialTextureForSlot } from "../graphics/material";
import type { RendererContext } from "./context";
import { getObjectId } from "./resources";

export const getOrCreatePipeline = (ctx: RendererContext, material: Material, instanced: boolean = false, skinned: boolean = false, skinned8: boolean = false, mirrored: boolean = false, forceNoDepthWrite: boolean = false, receiveShadow: boolean = false): GPURenderPipeline => {
    if (instanced && skinned) throw new Error("Renderer: instanced + skinned pipelines are not supported (attribute layout conflict).");
    if (skinned8 && !skinned) skinned = true;
    const shadows = receiveShadow && material instanceof StandardMaterial && ctx.shadowRenderer.activeViewCount > 0;
    const key = getPipelineCacheKey(ctx, material, instanced, skinned, skinned8, mirrored, forceNoDepthWrite, shadows);
    let pipeline = ctx.pipelineCache.get(key);
    if (pipeline) return pipeline;
    const shaderCode = material.getShaderCode({ instanced, skinned, skinned8, shadows, shadowGroup: skinned ? 3 : 2 });
    let shaderModule = ctx.shaderCache.get(shaderCode);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: shaderCode });
        ctx.shaderCache.set(shaderCode, shaderModule);
    }
    const materialBindGroupLayout = material.createBindGroupLayout(ctx.device);
    const bindGroupLayouts: GPUBindGroupLayout[] = [ctx.globalBindGroupLayout, materialBindGroupLayout];
    if (skinned) bindGroupLayouts.push(ctx.skinBindGroupLayout);
    if (shadows) bindGroupLayouts.push(ctx.shadowRenderer.bindGroupLayout);
    const pipelineLayout = ctx.device.createPipelineLayout({ bindGroupLayouts });
    let buffers: GPUVertexBufferLayout[];
    const standardMaterial = material instanceof StandardMaterial;
    if (instanced && standardMaterial) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 12, offset: 0, format: "float32x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] },
            {
                arrayStride: ctx.INSTANCE_STRIDE_BYTES,
                stepMode: "instance",
                attributes: [
                    { shaderLocation: 3, offset: 0, format: "float32x4" },
                    { shaderLocation: 4, offset: 16, format: "float32x4" },
                    { shaderLocation: 5, offset: 32, format: "float32x4" },
                    { shaderLocation: 6, offset: 48, format: "float32x4" },
                    { shaderLocation: 7, offset: 64, format: "float32x4" },
                    { shaderLocation: 8, offset: 80, format: "float32x4" },
                    { shaderLocation: 9, offset: 96, format: "float32x4" },
                    { shaderLocation: 10, offset: 112, format: "float32x4" }
                ]
            }
        ];
    } else if (instanced) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] },
            {
                arrayStride: ctx.INSTANCE_STRIDE_BYTES,
                stepMode: "instance",
                attributes: [
                    { shaderLocation: 3, offset: 0, format: "float32x4" },
                    { shaderLocation: 4, offset: 16, format: "float32x4" },
                    { shaderLocation: 5, offset: 32, format: "float32x4" },
                    { shaderLocation: 6, offset: 48, format: "float32x4" },
                    { shaderLocation: 7, offset: 64, format: "float32x4" },
                    { shaderLocation: 8, offset: 80, format: "float32x4" },
                    { shaderLocation: 9, offset: 96, format: "float32x4" },
                    { shaderLocation: 10, offset: 112, format: "float32x4" }
                ]
            }
        ];
    } else if (skinned8 && standardMaterial) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 12, offset: 0, format: "float32x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] },
            {
                arrayStride: 48,
                attributes: [
                    { shaderLocation: 3, offset: 0, format: "uint16x4" },
                    { shaderLocation: 4, offset: 8, format: "float32x4" },
                    { shaderLocation: 5, offset: 24, format: "uint16x4" },
                    { shaderLocation: 6, offset: 32, format: "float32x4" }
                ]
            }
        ];
    } else if (skinned8) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 5, offset: 0, format: "uint16x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 6, offset: 0, format: "float32x4" }] }
        ];
    } else if (skinned && standardMaterial) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 12, offset: 0, format: "float32x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] },
            {
                arrayStride: 24,
                attributes: [
                    { shaderLocation: 3, offset: 0, format: "uint16x4" },
                    { shaderLocation: 4, offset: 8, format: "float32x4" }
                ]
            }
        ];
    } else if (skinned) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] }
        ];
    } else if (standardMaterial) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 12, offset: 0, format: "float32x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] }
        ];
    } else {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] }
        ];
    }
    pipeline = ctx.device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [
                {
                    format: ctx.format,
                    blend: getBlendState(ctx, material.blendMode)
                }
            ]
        },
        primitive: {
            topology: "triangle-list",
            cullMode: getCullMode(ctx, material.cullMode),
            frontFace: mirrored ? "cw" : "ccw"
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: forceNoDepthWrite ? false : material.depthWrite,
            depthCompare: material.depthTest ? "less" : "always"
        }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

export const getPipelineCacheKey = (ctx: RendererContext, material: Material, instanced: boolean, skinned: boolean, skinned8: boolean, mirrored: boolean, forceNoDepthWrite: boolean = false, receiveShadow: boolean = false): string => {
    const ctorId = getObjectId(ctx, material.constructor as unknown as object);
    const isBuiltin = material.constructor === UnlitMaterial || material.constructor === StandardMaterial || material.constructor === DataMaterial;
    const depthWriteKey = forceNoDepthWrite ? "no-depth-write" : material.depthWrite ? "depth-write" : "no-depth-write";
    if (material instanceof StandardMaterial) {
        const plan = material.getLayoutPlan();
        return `${ctorId}_${material.blendMode}_${material.cullMode}_${depthWriteKey}_${material.depthTest}_${plan.featureKey}_${mirrored ? "cw" : "ccw"}_${instanced ? "inst" : "mesh"}_${skinned8 ? "skin8" : skinned ? "skin4" : "noskin"}_${receiveShadow ? "shadows" : "no-shadows"}`;
    }
    const matKey = isBuiltin ? `${ctorId}` : `${ctorId}_${getObjectId(ctx, material)}`;
    return `${matKey}_${material.blendMode}_${material.cullMode}_${depthWriteKey}_${material.depthTest}_${mirrored ? "cw" : "ccw"}_${instanced ? "inst" : "mesh"}_${skinned8 ? "skin8" : skinned ? "skin4" : "noskin"}`;
};

export const isMirroredWorldMatrix = (_ctx: RendererContext, storeF32: Float32Array, base: number): boolean => {
    const a00 = storeF32[base + 0];
    const a01 = storeF32[base + 4];
    const a02 = storeF32[base + 8];
    const a10 = storeF32[base + 1];
    const a11 = storeF32[base + 5];
    const a12 = storeF32[base + 9];
    const a20 = storeF32[base + 2];
    const a21 = storeF32[base + 6];
    const a22 = storeF32[base + 10];
    const det = (a00 * ((a11 * a22) - (a12 * a21))) - (a01 * ((a10 * a22) - (a12 * a20))) + (a02 * ((a10 * a21) - (a11 * a20)));
    return det < 0;
};

export const getBlendState = (_ctx: RendererContext, mode: BlendMode): GPUBlendState | undefined => {
    switch (mode) {
        case BlendMode.Opaque:
            return undefined;
        case BlendMode.Transparent:
            return {
                color: {
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add"
                },
                alpha: {
                    srcFactor: "one",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add"
                }
            };
        case BlendMode.Additive:
            return {
                color: {
                    srcFactor: "src-alpha",
                    dstFactor: "one",
                    operation: "add"
                },
                alpha: {
                    srcFactor: "one",
                    dstFactor: "one",
                    operation: "add"
                }
            };
    }
};

export const getCullMode = (_ctx: RendererContext, mode: CullMode): GPUCullMode => {
    switch (mode) {
        case CullMode.None: return "none";
        case CullMode.Back: return "back";
        case CullMode.Front: return "front";
    }
};

export const getPremultipliedAlphaBlendState = (_ctx: RendererContext): GPUBlendState => {
    return {
        color: {
            srcFactor: "one",
            dstFactor: "one-minus-src-alpha",
            operation: "add"
        },
        alpha: {
            srcFactor: "one",
            dstFactor: "one-minus-src-alpha",
            operation: "add"
        }
    };
};

export const bindSizedBuffer = (_ctx: RendererContext, buffer: GPUBuffer, size: number, offset: number = 0): GPUBufferBinding => {
    return { buffer, offset, size };
};

export const getOrCreateShaderModule = (ctx: RendererContext, code: string): GPUShaderModule => {
    let module = ctx.shaderCache.get(code);
    if (!module) { module = ctx.device.createShaderModule({ code }); ctx.shaderCache.set(code, module); }
    return module;
};

export const getMaterialBindGroupKey = (ctx: RendererContext, material: Material): string => {
    if (material instanceof UnlitMaterial) {
        const bc = material.baseColorTexture;
        return `unlit:${bc?.id ?? 0}:${bc?.revision ?? 0}`;
    }
    if (material instanceof StandardMaterial) {
        const plan = material.getLayoutPlan();
        const parts: string[] = ["standard", plan.featureKey];
        for (const b of plan.bindings) {
            if (b.slot === "transmissionSource") parts.push(`src:${ctx.transmissionSourceRevision}`);
            else {
                const tex = getMaterialTextureForSlot(material, b.slot);
                parts.push(`${b.slot}:${tex?.id ?? 0}:${tex?.revision ?? 0}`);
            }
        }
        return parts.join(":");
    }
    if (material instanceof DataMaterial) {
        const bufId = material.dataBuffer ? getObjectId(ctx, material.dataBuffer) : 0;
        return `data:${bufId}:${material.getColormapKey()}`;
    }
    return "custom";
};

export const ensureMaterialBindGroup = (ctx: RendererContext, material: Material): void => {
    if (material instanceof CustomMaterial) {
        const key = getMaterialBindGroupKey(ctx, material);
        if (material.bindGroup && material.bindGroupKey === key) return;
        material.bindGroup = ctx.device.createBindGroup({ layout: material.createBindGroupLayout(ctx.device), entries: material.getBindGroupEntries() });
        material.bindGroupKey = key;
        if (material.dirty) material.markClean();
        return;
    }
    if (!material.uniformBuffer) {
        material.uniformBuffer = ctx.device.createBuffer({
            size: material.getUniformBufferSize(),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    if (material.dirty) {
        const data = material.getUniformData();
        ctx.queue.writeBuffer(material.uniformBuffer!, 0, data.buffer, data.byteOffset, data.byteLength);
        material.markClean();
    }
    if (material instanceof DataMaterial) {
        material.upload(ctx.device, ctx.queue);
    }
    const key = getMaterialBindGroupKey(ctx, material);
    if (material.bindGroup && material.bindGroupKey === key) return;
    const layout = material.createBindGroupLayout(ctx.device);
    if (material instanceof UnlitMaterial) {
        const tex = material.baseColorTexture;
        const sampler = tex ? tex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler;
        const view = tex ? tex.getView(ctx.device, ctx.queue, "srgb", ctx.fallbackWhiteViewSrgb) : ctx.fallbackWhiteViewSrgb;
        material.bindGroup = ctx.device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: { buffer: material.uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view }
            ]
        });
        material.bindGroupKey = key;
        return;
    }
    if (material instanceof StandardMaterial) {
        const plan = material.getLayoutPlan();
        const entries: GPUBindGroupEntry[] = [
            { binding: 0, resource: { buffer: material.uniformBuffer } }
        ];
        for (const b of plan.bindings) {
            if (b.slot === "transmissionSource") {
                entries.push({ binding: b.samplerBinding, resource: ctx.fallbackSampler }, { binding: b.textureBinding, resource: ctx.transmissionSourceView ?? ctx.fallbackWhiteViewLinear });
                continue;
            }
            const tex = getMaterialTextureForSlot(material, b.slot);
            let fallbackView = ctx.fallbackWhiteViewLinear;
            if (b.colorSpace === "srgb") fallbackView = ctx.fallbackWhiteViewSrgb;
            else if (b.slot === "metallicRoughness") fallbackView = ctx.fallbackMRViewLinear;
            else if (b.slot === "normal" || b.slot === "clearcoatNormal") fallbackView = ctx.fallbackNormalViewLinear;
            else if (b.slot === "occlusion") fallbackView = ctx.fallbackOcclusionViewLinear;
            else if (b.slot === "anisotropy") fallbackView = ctx.fallbackAnisotropyViewLinear;
            const sampler = tex ? tex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler;
            const view = tex ? tex.getView(ctx.device, ctx.queue, b.colorSpace, fallbackView) : fallbackView;
            entries.push({ binding: b.samplerBinding, resource: sampler }, { binding: b.textureBinding, resource: view });
        }
        material.bindGroup = ctx.device.createBindGroup({ layout, entries });
        material.bindGroupKey = key;
        return;
    }
    if (material instanceof DataMaterial) {
        if (!ctx.dataMaterialDummyDataBuffer) {
            ctx.dataMaterialDummyDataBuffer = ctx.device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            ctx.queue.writeBuffer(ctx.dataMaterialDummyDataBuffer, 0, new Uint8Array(4));
        }
        const dataBuffer = material.dataBuffer ?? ctx.dataMaterialDummyDataBuffer;
        const cmap = material.getColormapForBinding().getGPUResources(ctx.device, ctx.queue);
        material.bindGroup = ctx.device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: { buffer: material.uniformBuffer } },
                { binding: 1, resource: { buffer: dataBuffer } },
                { binding: 2, resource: cmap.sampler },
                { binding: 3, resource: cmap.view }
            ]
        });
        material.bindGroupKey = key;
        return;
    }
    material.bindGroup = ctx.device.createBindGroup({
        layout,
        entries: [{ binding: 0, resource: { buffer: material.uniformBuffer } }]
    });
    material.bindGroupKey = key;
};

export const materialSupportsInstancing = (_ctx: RendererContext, material: Material): boolean => material instanceof UnlitMaterial || material instanceof StandardMaterial;

export const materialSupportsSkinning = (_ctx: RendererContext, material: Material): boolean => material instanceof UnlitMaterial || material instanceof StandardMaterial;

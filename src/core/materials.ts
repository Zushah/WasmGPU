/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { BlendMode, CullMode, DataMaterial, Material, StandardMaterial, UnlitMaterial } from "../graphics/material";
import type { RendererContext } from "./context";
import { getObjectId } from "./resources";

export const getOrCreatePipeline = (ctx: RendererContext, material: Material, instanced: boolean = false, skinned: boolean = false, skinned8: boolean = false, mirrored: boolean = false, forceNoDepthWrite: boolean = false): GPURenderPipeline => {
    if (instanced && skinned) throw new Error("Renderer: instanced + skinned pipelines are not supported (attribute layout conflict).");
    if (skinned8 && !skinned) skinned = true;
    const key = getPipelineCacheKey(ctx, material, instanced, skinned, skinned8, mirrored, forceNoDepthWrite);
    let pipeline = ctx.pipelineCache.get(key);
    if (pipeline) return pipeline;
    const transmissionShader = material instanceof StandardMaterial && material.usesTransmissionLayout();
    const shaderCode = material.getShaderCode({ instanced, skinned, skinned8, transmission: transmissionShader });
    let shaderModule = ctx.shaderCache.get(shaderCode);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: shaderCode });
        ctx.shaderCache.set(shaderCode, shaderModule);
    }
    const materialBindGroupLayout = material.createBindGroupLayout(ctx.device);
    const bindGroupLayouts: GPUBindGroupLayout[] = [ctx.globalBindGroupLayout, materialBindGroupLayout];
    if (skinned) bindGroupLayouts.push(ctx.skinBindGroupLayout);
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

export const getPipelineCacheKey = (ctx: RendererContext, material: Material, instanced: boolean, skinned: boolean, skinned8: boolean, mirrored: boolean, forceNoDepthWrite: boolean = false): string => {
    const ctorId = getObjectId(ctx, material.constructor as unknown as object);
    const isBuiltin = material.constructor === UnlitMaterial || material.constructor === StandardMaterial || material.constructor === DataMaterial;
    const matKey = isBuiltin ? `${ctorId}` : `${ctorId}_${getObjectId(ctx, material)}`;
    const depthWriteKey = forceNoDepthWrite ? "no-depth-write" : material.depthWrite ? "depth-write" : "no-depth-write";
    const transmissionShader = material instanceof StandardMaterial && material.usesTransmissionLayout();
    return `${matKey}_${material.blendMode}_${material.cullMode}_${depthWriteKey}_${material.depthTest}_${transmissionShader ? "transmission" : "standard"}_${mirrored ? "cw" : "ccw"}_${instanced ? "inst" : "mesh"}_${skinned8 ? "skin8" : skinned ? "skin4" : "noskin"}`;
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
        const bc = material.baseColorTexture;
        const mr = material.metallicRoughnessTexture;
        const n = material.normalTexture;
        const o = material.occlusionTexture;
        const e = material.emissiveTexture;
        const extensions = material.extensions;
        const cc = extensions.clearcoat;
        const sp = extensions.specular;
        const sh = extensions.sheen;
        const ir = extensions.iridescence;
        const an = extensions.anisotropy;
        const tr = extensions.transmission;
        const vol = extensions.volume;
        const dt = extensions.diffuseTransmission;
        const ccTex = cc?.texture ?? null;
        const ccRough = cc?.roughnessTexture ?? null;
        const ccNormal = cc?.normalTexture ?? null;
        const spTex = sp?.texture ?? null;
        const spColor = sp?.colorTexture ?? null;
        const shColor = sh?.colorTexture ?? null;
        const shRough = sh?.roughnessTexture ?? null;
        const irTex = ir?.texture ?? null;
        const irThick = ir?.thicknessTexture ?? null;
        const anTex = an?.texture ?? null;
        const trTex = tr?.texture ?? null;
        const thicknessTex = vol?.thicknessTexture ?? null;
        const dtTex = dt?.texture ?? null;
        const dtColor = dt?.colorTexture ?? null;
        return `standard:${bc?.id ?? 0}:${bc?.revision ?? 0}:${mr?.id ?? 0}:${mr?.revision ?? 0}:${n?.id ?? 0}:${n?.revision ?? 0}:${o?.id ?? 0}:${o?.revision ?? 0}:${e?.id ?? 0}:${e?.revision ?? 0}:${ccTex?.id ?? 0}:${ccTex?.revision ?? 0}:${ccRough?.id ?? 0}:${ccRough?.revision ?? 0}:${ccNormal?.id ?? 0}:${ccNormal?.revision ?? 0}:${spTex?.id ?? 0}:${spTex?.revision ?? 0}:${spColor?.id ?? 0}:${spColor?.revision ?? 0}:${shColor?.id ?? 0}:${shColor?.revision ?? 0}:${shRough?.id ?? 0}:${shRough?.revision ?? 0}:${irTex?.id ?? 0}:${irTex?.revision ?? 0}:${irThick?.id ?? 0}:${irThick?.revision ?? 0}:${anTex?.id ?? 0}:${anTex?.revision ?? 0}:${trTex?.id ?? 0}:${trTex?.revision ?? 0}:${thicknessTex?.id ?? 0}:${thicknessTex?.revision ?? 0}:${dtTex?.id ?? 0}:${dtTex?.revision ?? 0}:${dtColor?.id ?? 0}:${dtColor?.revision ?? 0}:${ctx.transmissionSourceRevision}`;
    }
    if (material instanceof DataMaterial) {
        const bufId = material.dataBuffer ? getObjectId(ctx, material.dataBuffer) : 0;
        return `data:${bufId}:${material.getColormapKey()}`;
    }
    return "custom";
};

export const ensureMaterialBindGroup = (ctx: RendererContext, material: Material): void => {
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
        const bc = material.baseColorTexture;
        const mr = material.metallicRoughnessTexture;
        const n = material.normalTexture;
        const o = material.occlusionTexture;
        const e = material.emissiveTexture;
        const extensions = material.extensions;
        const cc = extensions.clearcoat;
        const sp = extensions.specular;
        const sh = extensions.sheen;
        const ir = extensions.iridescence;
        const an = extensions.anisotropy;
        const tr = extensions.transmission;
        const vol = extensions.volume;
        const dt = extensions.diffuseTransmission;
        const ccTex = cc?.texture ?? null;
        const ccRough = cc?.roughnessTexture ?? null;
        const ccNormal = cc?.normalTexture ?? null;
        const spTex = sp?.texture ?? null;
        const spColor = sp?.colorTexture ?? null;
        const shColor = sh?.colorTexture ?? null;
        const shRough = sh?.roughnessTexture ?? null;
        const irTex = ir?.texture ?? null;
        const irThick = ir?.thicknessTexture ?? null;
        const anTex = an?.texture ?? null;
        const trTex = tr?.texture ?? null;
        const thicknessTex = vol?.thicknessTexture ?? null;
        const dtTex = dt?.texture ?? null;
        const dtColor = dt?.colorTexture ?? null;
        const entries: GPUBindGroupEntry[] = [
            { binding: 0, resource: { buffer: material.uniformBuffer } },
            { binding: 1, resource: bc ? bc.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 2, resource: bc ? bc.getView(ctx.device, ctx.queue, "srgb", ctx.fallbackWhiteViewSrgb) : ctx.fallbackWhiteViewSrgb },
            { binding: 3, resource: mr ? mr.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 4, resource: mr ? mr.getView(ctx.device, ctx.queue, "linear", ctx.fallbackMRViewLinear) : ctx.fallbackMRViewLinear },
            { binding: 5, resource: n ? n.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 6, resource: n ? n.getView(ctx.device, ctx.queue, "linear", ctx.fallbackNormalViewLinear) : ctx.fallbackNormalViewLinear },
            { binding: 7, resource: o ? o.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 8, resource: o ? o.getView(ctx.device, ctx.queue, "linear", ctx.fallbackOcclusionViewLinear) : ctx.fallbackOcclusionViewLinear },
            { binding: 9, resource: e ? e.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 10, resource: e ? e.getView(ctx.device, ctx.queue, "srgb", ctx.fallbackWhiteViewSrgb) : ctx.fallbackWhiteViewSrgb },
            { binding: 11, resource: ccTex ? ccTex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 12, resource: ccTex ? ccTex.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
            { binding: 13, resource: ccRough ? ccRough.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 14, resource: ccRough ? ccRough.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
            { binding: 15, resource: ccNormal ? ccNormal.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 16, resource: ccNormal ? ccNormal.getView(ctx.device, ctx.queue, "linear", ctx.fallbackNormalViewLinear) : ctx.fallbackNormalViewLinear },
            { binding: 17, resource: spTex ? spTex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 18, resource: spTex ? spTex.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
            { binding: 19, resource: spColor ? spColor.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
            { binding: 20, resource: spColor ? spColor.getView(ctx.device, ctx.queue, "srgb", ctx.fallbackWhiteViewSrgb) : ctx.fallbackWhiteViewSrgb }
        ];
        if (material.usesTransmissionLayout()) {
            entries.push(
                { binding: 21, resource: trTex ? trTex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 22, resource: trTex ? trTex.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
                { binding: 23, resource: thicknessTex ? thicknessTex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 24, resource: thicknessTex ? thicknessTex.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
                { binding: 25, resource: dtTex ? dtTex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 26, resource: dtTex ? dtTex.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
                { binding: 27, resource: dtColor ? dtColor.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 28, resource: dtColor ? dtColor.getView(ctx.device, ctx.queue, "srgb", ctx.fallbackWhiteViewSrgb) : ctx.fallbackWhiteViewSrgb },
                { binding: 29, resource: ctx.fallbackSampler },
                { binding: 30, resource: ctx.transmissionSourceView ?? ctx.fallbackWhiteViewLinear }
            );
        } else {
            entries.push(
                { binding: 21, resource: shColor ? shColor.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 22, resource: shColor ? shColor.getView(ctx.device, ctx.queue, "srgb", ctx.fallbackWhiteViewSrgb) : ctx.fallbackWhiteViewSrgb },
                { binding: 23, resource: shRough ? shRough.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 24, resource: shRough ? shRough.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
                { binding: 25, resource: irTex ? irTex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 26, resource: irTex ? irTex.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
                { binding: 27, resource: irThick ? irThick.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 28, resource: irThick ? irThick.getView(ctx.device, ctx.queue, "linear", ctx.fallbackWhiteViewLinear) : ctx.fallbackWhiteViewLinear },
                { binding: 29, resource: anTex ? anTex.getSampler(ctx.device, ctx.fallbackSampler) : ctx.fallbackSampler },
                { binding: 30, resource: anTex ? anTex.getView(ctx.device, ctx.queue, "linear", ctx.fallbackAnisotropyViewLinear) : ctx.fallbackAnisotropyViewLinear }
            );
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

export const materialSupportsInstancing = (_ctx: RendererContext, material: Material): boolean => {
    return material instanceof UnlitMaterial || material instanceof StandardMaterial;
};

export const materialSupportsSkinning = (_ctx: RendererContext, material: Material): boolean => {
    return material instanceof UnlitMaterial || material instanceof StandardMaterial;
};

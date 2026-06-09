/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { RendererContext } from "./context";
import smaaWGSL from "../wgsl/core/smaa.wgsl";

export const createSmaaResources = (ctx: RendererContext): void => {
    if (ctx.smaaParamsBuffer) return;
    ctx.smaaParamsBuffer = ctx.device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    ctx.smaaSamplerPoint = ctx.device.createSampler({ addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge", magFilter: "nearest", minFilter: "nearest" });
    ctx.smaaSamplerLinear = ctx.device.createSampler({ addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge", magFilter: "linear", minFilter: "linear" });
    const shaderCode = smaaWGSL;
    ctx.smaaShaderModule = ctx.device.createShaderModule({ code: shaderCode });
    ctx.smaaEdgeBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
        ]
    });
    ctx.smaaWeightBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
        ]
    });
    ctx.smaaNeighborhoodBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
        ]
    });
    const edgeLayout = ctx.device.createPipelineLayout({ bindGroupLayouts: [ctx.smaaEdgeBindGroupLayout] });
    const weightLayout = ctx.device.createPipelineLayout({ bindGroupLayouts: [ctx.smaaWeightBindGroupLayout] });
    const neighLayout = ctx.device.createPipelineLayout({ bindGroupLayouts: [ctx.smaaNeighborhoodBindGroupLayout] });
    ctx.smaaEdgePipeline = ctx.device.createRenderPipeline({
        layout: edgeLayout,
        vertex: { module: ctx.smaaShaderModule, entryPoint: "vs_fullscreen" },
        fragment: {
            module: ctx.smaaShaderModule,
            entryPoint: "fs_smaa_edges",
            targets: [{ format: "rgba8unorm" }]
        },
        primitive: { topology: "triangle-list", cullMode: "none" }
    });
    ctx.smaaWeightPipeline = ctx.device.createRenderPipeline({
        layout: weightLayout,
        vertex: { module: ctx.smaaShaderModule, entryPoint: "vs_fullscreen" },
        fragment: {
            module: ctx.smaaShaderModule,
            entryPoint: "fs_smaa_weights",
            targets: [{ format: "rgba8unorm" }]
        },
        primitive: { topology: "triangle-list", cullMode: "none" }
    });
    ctx.smaaNeighborhoodPipeline = ctx.device.createRenderPipeline({
        layout: neighLayout,
        vertex: { module: ctx.smaaShaderModule, entryPoint: "vs_fullscreen" },
        fragment: {
            module: ctx.smaaShaderModule,
            entryPoint: "fs_smaa_neighborhood",
            targets: [{ format: ctx.format }]
        },
        primitive: { topology: "triangle-list", cullMode: "none" }
    });
};

export const resizeSmaaTargets = (ctx: RendererContext): void => {
    if (!ctx.smaaEnabled) return;
    if (!ctx.smaaParamsBuffer) createSmaaResources(ctx);
    ctx.smaaSceneColorTexture?.destroy();
    ctx.smaaEdgesTexture?.destroy();
    ctx.smaaBlendTexture?.destroy();
    const w = ctx.width | 0;
    const h = ctx.height | 0;
    if (w <= 0 || h <= 0) return;
    ctx.smaaSceneColorTexture = ctx.device.createTexture({
        size: { width: w, height: h, depthOrArrayLayers: 1 },
        format: ctx.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
    });
    ctx.smaaSceneColorView = ctx.smaaSceneColorTexture.createView();
    const intermediateFormat: GPUTextureFormat = "rgba8unorm";
    ctx.smaaEdgesTexture = ctx.device.createTexture({
        size: { width: w, height: h, depthOrArrayLayers: 1 },
        format: intermediateFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    ctx.smaaEdgesView = ctx.smaaEdgesTexture.createView();
    ctx.smaaBlendTexture = ctx.device.createTexture({
        size: { width: w, height: h, depthOrArrayLayers: 1 },
        format: intermediateFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    ctx.smaaBlendView = ctx.smaaBlendTexture.createView();
    const params = new Float32Array(8);
    params[0] = 1 / w;
    params[1] = 1 / h;
    params[2] = w;
    params[3] = h;
    params[4] = 0.1;
    ctx.queue.writeBuffer(ctx.smaaParamsBuffer!, 0, params);
    ctx.smaaEdgeBindGroup = ctx.device.createBindGroup({
        layout: ctx.smaaEdgeBindGroupLayout!,
        entries: [
            { binding: 0, resource: { buffer: ctx.smaaParamsBuffer! } },
            { binding: 2, resource: ctx.smaaSamplerPoint! },
            { binding: 3, resource: ctx.smaaSceneColorView! }
        ]
    });
    ctx.smaaWeightBindGroup = ctx.device.createBindGroup({
        layout: ctx.smaaWeightBindGroupLayout!,
        entries: [
            { binding: 0, resource: { buffer: ctx.smaaParamsBuffer! } },
            { binding: 2, resource: ctx.smaaSamplerPoint! },
            { binding: 4, resource: ctx.smaaEdgesView! }
        ]
    });
    ctx.smaaNeighborhoodBindGroup = ctx.device.createBindGroup({
        layout: ctx.smaaNeighborhoodBindGroupLayout!,
        entries: [
            { binding: 0, resource: { buffer: ctx.smaaParamsBuffer! } },
            { binding: 1, resource: ctx.smaaSamplerLinear! },
            { binding: 2, resource: ctx.smaaSamplerPoint! },
            { binding: 3, resource: ctx.smaaSceneColorView! },
            { binding: 5, resource: ctx.smaaBlendView! }
        ]
    });
};

export const executeSmaa = (ctx: RendererContext, encoder: GPUCommandEncoder, outputView: GPUTextureView): void => {
    if (!ctx.smaaEdgePipeline || !ctx.smaaWeightPipeline || !ctx.smaaNeighborhoodPipeline) return;
    if (!ctx.smaaEdgeBindGroup || !ctx.smaaWeightBindGroup || !ctx.smaaNeighborhoodBindGroup) return;
    if (!ctx.smaaEdgesView || !ctx.smaaBlendView) return;
    const edgePass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: ctx.smaaEdgesView,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    });
    edgePass.setPipeline(ctx.smaaEdgePipeline);
    edgePass.setBindGroup(0, ctx.smaaEdgeBindGroup);
    edgePass.draw(3);
    edgePass.end();
    const weightPass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: ctx.smaaBlendView,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    });
    weightPass.setPipeline(ctx.smaaWeightPipeline);
    weightPass.setBindGroup(0, ctx.smaaWeightBindGroup);
    weightPass.draw(3);
    weightPass.end();
    const neighborhoodPass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: outputView,
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    });
    neighborhoodPass.setPipeline(ctx.smaaNeighborhoodPipeline);
    neighborhoodPass.setBindGroup(0, ctx.smaaNeighborhoodBindGroup);
    neighborhoodPass.draw(3);
    neighborhoodPass.end();
};

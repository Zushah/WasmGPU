/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Scene } from "../world/scene";
import type { Camera } from "../world/camera";
import { DirectionalLight, PointLight, SpotLight, resolveLightDirection, resolveLightPosition } from "../world/light";
import { TransformStore } from "./transform";
import { driver, mat4f, wasm } from "../wasm";
import type { WasmPtr } from "../wasm";
import type { RendererContext } from "./context";

export const refreshWasmStagingViews = (ctx: RendererContext): void => {
    const buf = wasm.memory().buffer as ArrayBuffer;
    const needRefresh =
        buf !== ctx._wasmBuffer ||
        !ctx.cameraUniformStagingView ||
        ctx.cameraUniformStagingView.byteOffset !== ctx.cameraUniformStagingPtr ||
        !ctx.lightingUniformStagingView ||
        ctx.lightingUniformStagingView.byteOffset !== ctx.lightingUniformStagingPtr ||
        !ctx.modelUniformStagingView ||
        ctx.modelUniformStagingView.byteOffset !== ctx.modelUniformStagingPtr;
    if (!needRefresh) return;
    ctx._wasmBuffer = buf;
    ctx.cameraUniformStagingView = wasm.f32view(ctx.cameraUniformStagingPtr, 20);
    ctx.lightingUniformStagingView = wasm.f32view(ctx.lightingUniformStagingPtr, 8 + (Scene.MAX_LIGHTS * 16));
    ctx.lightingCountView = wasm.u32view(ctx.lightingUniformStagingPtr + 16, 1);
    ctx.modelUniformStagingView = wasm.f32view(ctx.modelUniformStagingPtr, 32);
};

export const getObjectId = (ctx: RendererContext, obj: object): number => {
    let id = ctx.objectIds.get(obj);
    if (id !== undefined) return id;
    id = ctx.nextObjectId++;
    ctx.objectIds.set(obj, id);
    ctx.objectsById.set(id, obj);
    return id;
};

export const createGlobalBindGroupLayout = (ctx: RendererContext): void => {
    ctx.globalBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform", minBindingSize: 80 }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "uniform", minBindingSize: 128 }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform", minBindingSize: (8 + (Scene.MAX_LIGHTS * 16)) * 4 }
            }
        ]
    });
};

export const createSkinBindGroupLayout = (ctx: RendererContext): void => {
    ctx.skinBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: "read-only-storage" }
        }]
    });
};

export const createUniformBuffers = (ctx: RendererContext): void => {
    ctx.cameraUniformBuffer = ctx.device.createBuffer({
        size: 80,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    ctx.lightingUniformBuffer = ctx.device.createBuffer({
        size: (8 + (Scene.MAX_LIGHTS * 16)) * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    ctx.modelUniformBuffers = [];
    ctx.globalBindGroups = [];
    ctx.pickUniformBuffers = [];
    ctx.pickBindGroups = [];
    const pickLayout = ctx.getPickBindGroupLayout();
    for (let i = 0; i < ctx.MODEL_BUFFER_POOL_SIZE; i++) {
        const modelBuffer = ctx.device.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        ctx.modelUniformBuffers.push(modelBuffer);
        ctx.globalBindGroups.push(ctx.device.createBindGroup({
            layout: ctx.globalBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: ctx.cameraUniformBuffer } },
                { binding: 1, resource: { buffer: modelBuffer } },
                { binding: 2, resource: { buffer: ctx.lightingUniformBuffer } }
            ]
        }));
        const pickBuffer = ctx.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        ctx.pickUniformBuffers.push(pickBuffer);
        ctx.pickBindGroups.push(ctx.device.createBindGroup({
            layout: pickLayout,
            entries: [{ binding: 0, resource: { buffer: pickBuffer } }]
        }));
    }
    ctx.cameraUniformStagingPtr = 0;
    ctx.lightingUniformStagingPtr = 0;
    ctx.modelUniformStagingPtr = 0;
    ctx._wasmBuffer = null;
};

export const ensureModelBufferPool = (ctx: RendererContext, requiredCount: number): void => {
    const current = ctx.modelUniformBuffers.length;
    if (requiredCount <= current) return;
    let newSize = Math.max(1, current);
    while (newSize < requiredCount) newSize *= 2;
    ctx.modelUniformBuffers.length = newSize;
    ctx.globalBindGroups.length = newSize;
    ctx.pickUniformBuffers.length = newSize;
    ctx.pickBindGroups.length = newSize;
    const pickLayout = ctx.getPickBindGroupLayout();
    for (let i = current; i < newSize; i++) {
        const modelBuffer = ctx.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        ctx.modelUniformBuffers[i] = modelBuffer;
        ctx.globalBindGroups[i] = ctx.device.createBindGroup({
            layout: ctx.globalBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: ctx.cameraUniformBuffer } },
                { binding: 1, resource: { buffer: modelBuffer } },
                { binding: 2, resource: { buffer: ctx.lightingUniformBuffer } }
            ]
        });
        const pickBuffer = ctx.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        ctx.pickUniformBuffers[i] = pickBuffer;
        ctx.pickBindGroups[i] = ctx.device.createBindGroup({
            layout: pickLayout,
            entries: [{ binding: 0, resource: { buffer: pickBuffer } }]
        });
    }
};

export const createFallbackTextures = (ctx: RendererContext): void => {
    ctx.fallbackSampler = ctx.device.createSampler({
        addressModeU: "repeat",
        addressModeV: "repeat",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
    });
    const create1x1 = (rgba: [number, number, number, number], wantSrgbView: boolean): { tex: GPUTexture; linear: GPUTextureView; srgb: GPUTextureView } => {
        const tex = ctx.device.createTexture({
            size: { width: 1, height: 1 },
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            viewFormats: ["rgba8unorm-srgb"],
        });
        const data = new Uint8Array(256);
        data[0] = rgba[0];
        data[1] = rgba[1];
        data[2] = rgba[2];
        data[3] = rgba[3];
        ctx.queue.writeTexture(
            { texture: tex },
            data,
            { bytesPerRow: 256, rowsPerImage: 1 },
            { width: 1, height: 1 }
        );
        const linear = tex.createView({ format: "rgba8unorm" });
        const srgb = wantSrgbView ? tex.createView({ format: "rgba8unorm-srgb" }) : linear;
        return { tex, linear, srgb };
    };
    const white = create1x1([255, 255, 255, 255], true);
    ctx.fallbackWhiteTexture = white.tex;
    ctx.fallbackWhiteViewLinear = white.linear;
    ctx.fallbackWhiteViewSrgb = white.srgb;
    const normal = create1x1([128, 128, 255, 255], false);
    ctx.fallbackNormalTexture = normal.tex;
    ctx.fallbackNormalViewLinear = normal.linear;
    const mr = create1x1([0, 255, 255, 255], false);
    ctx.fallbackMRTex = mr.tex;
    ctx.fallbackMRViewLinear = mr.linear;
    const occ = create1x1([255, 0, 0, 255], false);
    ctx.fallbackOcclusionTex = occ.tex;
    ctx.fallbackOcclusionViewLinear = occ.linear;
    const anisotropy = create1x1([255, 128, 255, 255], false);
    ctx.fallbackAnisotropyTexture = anisotropy.tex;
    ctx.fallbackAnisotropyViewLinear = anisotropy.linear;
};

export const writeModelUniformSlot = (ctx: RendererContext, slot: number, modelPtr: WasmPtr): void => {
    if (slot >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, slot + 1);
    const modelBuffer = ctx.modelUniformBuffers[slot];
    const invPtr = ctx.modelUniformStagingPtr;
    const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
    mat4f.invert(invPtr, modelPtr);
    mat4f.transpose(normalPtr, invPtr);
    const bytes = driver.bytes();
    ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
    ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
};

export const writeCameraUniforms = (ctx: RendererContext, camera: Camera): void => {
    refreshWasmStagingViews(ctx);
    const proj = camera.getProjectionMatrix();
    ctx.modelUniformStagingView.set(proj, 0);
    const viewPtr = ctx.modelUniformStagingPtr + 16 * 4;
    mat4f.invert(viewPtr, camera.transform.worldMatrixPtr);
    mat4f.mul(ctx.cameraUniformStagingPtr, ctx.modelUniformStagingPtr, viewPtr);
    const store = TransformStore.global();
    const storeF32 = store.f32();
    const base = (store.worldPtr >>> 2) + camera.transform.index * 16;
    ctx.cameraUniformStagingView[16] = storeF32[base + 12];
    ctx.cameraUniformStagingView[17] = storeF32[base + 13];
    ctx.cameraUniformStagingView[18] = storeF32[base + 14];
    ctx.cameraUniformStagingView[19] = ctx.height;
    ctx.queue.writeBuffer(ctx.cameraUniformBuffer, 0, ctx.cameraUniformStagingView);
};

export const writeLightingUniforms = (ctx: RendererContext, scene: Scene): void => {
    const { ambient, lights } = scene.getLightingData();
    refreshWasmStagingViews(ctx);
    const data = ctx.lightingUniformStagingView;
    data.fill(0);
    data[0] = ambient[0];
    data[1] = ambient[1];
    data[2] = ambient[2];
    data[3] = 1;
    ctx.lightingCountView[0] = lights.length;
    let offset = 8;
    for (let i = 0; i < lights.length && i < Scene.MAX_LIGHTS; i++) {
        const light = lights[i];
        if (light instanceof DirectionalLight) {
            const direction = resolveLightDirection(light);
            data[offset + 0] = direction[0];
            data[offset + 1] = direction[1];
            data[offset + 2] = direction[2];
            data[offset + 3] = 0;
        } else if (light instanceof PointLight) {
            const position = resolveLightPosition(light);
            data[offset + 0] = position[0];
            data[offset + 1] = position[1];
            data[offset + 2] = position[2];
            data[offset + 3] = 1;
            data[offset + 12] = light.range;
        } else if (light instanceof SpotLight) {
            const position = resolveLightPosition(light);
            const direction = resolveLightDirection(light);
            data[offset + 0] = position[0];
            data[offset + 1] = position[1];
            data[offset + 2] = position[2];
            data[offset + 3] = 2;
            data[offset + 8] = direction[0];
            data[offset + 9] = direction[1];
            data[offset + 10] = direction[2];
            data[offset + 12] = light.range;
            data[offset + 13] = Math.cos(light.innerCone);
            data[offset + 14] = Math.cos(light.outerCone);
        }
        data[offset + 4] = light.color[0];
        data[offset + 5] = light.color[1];
        data[offset + 6] = light.color[2];
        data[offset + 7] = light.intensity;
        if (light instanceof DirectionalLight) {
            const direction = resolveLightDirection(light);
            data[offset + 8] = direction[0];
            data[offset + 9] = direction[1];
            data[offset + 10] = direction[2];
        }
        offset += 16;
    }
    ctx.queue.writeBuffer(ctx.lightingUniformBuffer, 0, data);
};

export const ensureInstanceBuffer = (ctx: RendererContext, byteLength: number): void => {
    if (ctx.instanceBuffer && ctx.instanceBufferCapacityBytes >= byteLength) return;
    ctx.instanceBuffer?.destroy();
    let cap = ctx.instanceBufferCapacityBytes || (ctx.INSTANCE_STRIDE_BYTES * 256);
    while (cap < byteLength) cap *= 2;
    ctx.instanceBufferCapacityBytes = cap;
    ctx.instanceBuffer = ctx.device.createBuffer({ size: cap, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
};

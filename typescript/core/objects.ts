/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ceilDiv } from "../utils";
import { Geometry } from "../graphics/geometry";
import { Material, StandardMaterial } from "../graphics/material";
import { TransformStore } from "./transform";
import { Mesh, getMeshVertexBuffers, hasMeshMorphRuntime } from "../world/mesh";
import { PointCloud } from "../world/pointcloud";
import { GlyphField } from "../world/glyphfield";
import { NodeLink } from "../world/nodelink";
import { SplatField } from "../world/splatfield";
import { LatticeSpace } from "../world/latticespace";
import { animf, driver, frameArena, mat4f, transformf } from "../wasm";
import type { WasmPtr } from "../wasm";
import pointCloudWGSL from "../../wgsl/world/pointcloud.wgsl";
import glyphFieldWGSL from "../../wgsl/world/glyphfield.wgsl";
import nodeLinkWGSL from "../../wgsl/world/nodelink.wgsl";
import splatFieldWGSL from "../../wgsl/world/splatfield.wgsl";
import splatFieldSortWGSL from "../../wgsl/world/splatfield-sort.wgsl";
import splatFieldRadixFlagsWGSL from "../../wgsl/world/splatfield-radix-flags.wgsl";
import splatFieldRadixCountZerosWGSL from "../../wgsl/world/splatfield-radix-count-zeros.wgsl";
import splatFieldRadixScatterPairsWGSL from "../../wgsl/world/splatfield-radix-scatter-pairs.wgsl";
import latticeSpaceWGSL from "../../wgsl/world/latticespace.wgsl";
import latticeSpaceSortWGSL from "../../wgsl/world/latticespace-sort.wgsl";
import latticeSpaceRadixFlagsWGSL from "../../wgsl/world/latticespace-radix-flags.wgsl";
import latticeSpaceRadixCountZerosWGSL from "../../wgsl/world/latticespace-radix-count-zeros.wgsl";
import latticeSpaceRadixScatterPairsWGSL from "../../wgsl/world/latticespace-radix-scatter-pairs.wgsl";
import scanBlockExclusiveU32WGSL from "../../wgsl/compute/scan-block-exclusive-u32.wgsl";
import scanAddBlockOffsetsU32WGSL from "../../wgsl/compute/scan-add-block-offsets-u32.wgsl";
import type { RendererContext } from "./context";
import type { DrawItem, GlyphFieldDrawItem, LatticeSpaceDrawItem, LatticeSpaceSortScanLevel, LatticeSpaceSortState, NodeLinkDrawItem, PointCloudDrawItem, SplatFieldDrawItem, SplatFieldSortScanLevel, SplatFieldSortState } from "./types";
import { ensureInstanceBuffer, ensureModelBufferPool, getObjectId } from "./resources";
import { bindSizedBuffer, ensureMaterialBindGroup, getBlendState, getCullMode, getOrCreatePipeline, getOrCreateShaderModule, getPremultipliedAlphaBlendState, materialSupportsInstancing } from "./materials";

export const warmMeshDrawList = (ctx: RendererContext, items: DrawItem[]): void => {
    let lastMaterial: Material | null = null;
    let lastGeometry: Geometry | null = null;
    let lastVertexSourceId = -1;
    for (let i = 0; i < items.length; ) {
        const first = items[i];
        const material = first.material;
        const geometry = first.geometry;
        const vertexSourceId = first.vertexSourceId;
        let j = i + 1;
        while (j < items.length) {
            const it = items[j];
            if (it.pipeline !== first.pipeline) break;
            if (it.material !== material) break;
            if (it.vertexSourceId !== vertexSourceId) break;
            j++;
        }
        const runCount = j - i;
        const vertexSourceChanged = geometry !== lastGeometry || vertexSourceId !== lastVertexSourceId;
        if (vertexSourceChanged) {
            geometry.upload(ctx.device);
            getMeshVertexBuffers(first.mesh, ctx.device, ctx.queue);
            lastGeometry = geometry;
            lastVertexSourceId = vertexSourceId;
        } else if (hasMeshMorphRuntime(first.mesh)) getMeshVertexBuffers(first.mesh, ctx.device, ctx.queue);
        if (material !== lastMaterial) {
            ensureMaterialBindGroup(ctx, material);
            lastMaterial = material;
        }
        const canInstance = runCount > 1 && !first.skinned && !hasMeshMorphRuntime(first.mesh) && materialSupportsInstancing(ctx, material) && items === ctx.opaqueDrawList;
        if (canInstance) {
            getOrCreatePipeline(ctx, material, true, false, false, first.mirrored);
            warmInstancedRunResources(ctx, items, i, runCount);
        } else if (first.skinned) {
            for (let k = i; k < j; k++) {
                const skin = items[k].mesh.skin;
                if (skin) warmSkinResources(ctx, skin);
            }
        }
        i = j;
    }
};

export const warmSkinResources = (ctx: RendererContext, skin: Mesh["skin"]): void => {
    if (!skin) return;
    skin.ensureGpuResources(ctx.device, ctx.skinBindGroupLayout);
    const jointCount = skin.jointCount | 0;
    const jointMatPtr = frameArena.allocF32(jointCount * 16) as WasmPtr;
    animf.computeJointMatricesTo(jointMatPtr, skin.skin.jointIndicesPtr, jointCount, skin.skin.invBindPtr, TransformStore.global().worldPtr as WasmPtr, skin.meshWorldMatrixPtr);
    const bytes = driver.bytes();
    ctx.queue.writeBuffer(skin.boneBuffer!, 0, bytes, jointMatPtr, jointCount * 64);
};

export const warmInstancedRunResources = (ctx: RendererContext, items: DrawItem[], start: number, count: number): void => {
    const ptrsPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
    const u32 = TransformStore.global().u32();
    const ptrsBase = ptrsPtr >>> 2;
    for (let i = 0; i < count; i++) u32[ptrsBase + i] = items[start + i].mesh.transform.worldMatrixPtr >>> 0;
    const outPtr = frameArena.allocF32(count * 32) as WasmPtr;
    transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
    const outBytes = count * ctx.INSTANCE_STRIDE_BYTES;
    const dstOffset = ctx.instanceBufferOffset;
    const dstEnd = dstOffset + outBytes;
    ensureInstanceBuffer(ctx, dstEnd);
    const bytes = driver.bytes();
    ctx.queue.writeBuffer(ctx.instanceBuffer!, dstOffset, bytes, outPtr, outBytes);
    ctx.instanceBufferOffset = dstEnd;
};

export const warmPointCloudDrawList = (ctx: RendererContext, items: PointCloudDrawItem[]): void => {
    for (const item of items) {
        const cloud = item.cloud;
        if (!cloud.visible) continue;
        if (cloud.pointCount <= 0) continue;
        ensurePointCloudBindGroup(ctx, cloud);
    }
};

export const warmSplatFieldDrawList = (ctx: RendererContext, items: SplatFieldDrawItem[]): void => {
    for (const item of items) {
        const field = item.field;
        if (!field.visible) continue;
        if (field.splatCount <= 0) continue;
        ensureSplatFieldBindGroup(ctx, field);
    }
};

export const warmGlyphFieldDrawList = (ctx: RendererContext, items: GlyphFieldDrawItem[]): void => {
    for (const item of items) {
        const field = item.field;
        if (!field.visible) continue;
        if (field.instanceCount <= 0) continue;
        item.geometry.upload(ctx.device);
        ensureGlyphFieldBindGroup(ctx, field);
    }
};

export const warmNodeLinkDrawList = (ctx: RendererContext, items: NodeLinkDrawItem[]): void => {
    for (const item of items) {
        ensureNodeLinkBindGroup(ctx, item.link);
        if (item.geometry) item.geometry.upload(ctx.device);
    }
};

export const warmLatticeSpaceDrawList = (ctx: RendererContext, items: LatticeSpaceDrawItem[]): void => {
    for (const item of items) {
        if (!item.space.visible || item.space.drawCellCount <= 0) continue;
        ensureLatticeSpaceBindGroup(ctx, item.space);
    }
};

export const executeDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: DrawItem[]): void => {
    let lastPipeline: GPURenderPipeline | null = null;
    let lastMaterial: Material | null = null;
    let lastGeometry: Geometry | null = null;
    let lastVertexSourceId = -1;
    for (let i = 0; i < items.length; ) {
        const first = items[i];
        const pipeline = first.pipeline;
        const material = first.material;
        const geometry = first.geometry;
        const vertexSourceId = first.vertexSourceId;
        let j = i + 1;
        while (j < items.length) {
            const it = items[j];
            if (it.pipeline !== pipeline) break;
            if (it.material !== material) break;
            if (it.vertexSourceId !== vertexSourceId) break;
            j++;
        }
        const runCount = j - i;
        const vertexSourceChanged = pipeline !== lastPipeline || geometry !== lastGeometry || vertexSourceId !== lastVertexSourceId;
        if (vertexSourceChanged) geometry.upload(ctx.device);
        if (material !== lastMaterial) ensureMaterialBindGroup(ctx, material);
        if (pipeline !== lastPipeline) { pass.setPipeline(pipeline); lastPipeline = pipeline; }
        if (material !== lastMaterial) { pass.setBindGroup(1, material.bindGroup!); lastMaterial = material; }
        if (vertexSourceChanged) {
            const buffers = getMeshVertexBuffers(first.mesh, ctx.device, ctx.queue);
            pass.setVertexBuffer(0, buffers.positionBuffer);
            pass.setVertexBuffer(1, buffers.normalBuffer);
            pass.setVertexBuffer(2, geometry.uvBuffer);
            pass.setVertexBuffer(3, geometry.uv1Buffer);
            const standardMaterial = material instanceof StandardMaterial;
            if (standardMaterial) {
                pass.setVertexBuffer(4, geometry.tangentBuffer);
                pass.setVertexBuffer(5, buffers.colorBuffer);
            } else pass.setVertexBuffer(4, buffers.colorBuffer);
            if (first.skinned) {
                if (standardMaterial) pass.setVertexBuffer(6, geometry.skinInfluenceBuffer!);
                else {
                    pass.setVertexBuffer(5, geometry.jointsBuffer!);
                    pass.setVertexBuffer(6, geometry.weightsBuffer!);
                    if (first.skinned8) {
                        pass.setVertexBuffer(7, geometry.joints1Buffer!);
                        pass.setVertexBuffer(8, geometry.weights1Buffer!);
                    }
                }
            }
            if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
            lastGeometry = geometry;
            lastVertexSourceId = vertexSourceId;
        } else if (hasMeshMorphRuntime(first.mesh)) getMeshVertexBuffers(first.mesh, ctx.device, ctx.queue);
        const canInstance = runCount > 1 && !first.skinned && !hasMeshMorphRuntime(first.mesh) && materialSupportsInstancing(ctx, material) && items === ctx.opaqueDrawList;
        if (canInstance) {
            const instancedPipeline = getOrCreatePipeline(ctx, material, true, false, false, first.mirrored);
            if (instancedPipeline !== lastPipeline) {
                pass.setPipeline(instancedPipeline);
                lastPipeline = instancedPipeline;
            }
            drawInstancedRun(ctx, pass, geometry, material, items, i, runCount);
        } else {
            for (let k = i; k < j; k++) {
                if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
                const modelSlot = ctx.modelBufferIndex++;
                const modelBuffer = ctx.modelUniformBuffers[modelSlot];
                const globalBindGroup = ctx.globalBindGroups[modelSlot];
                const bytes = driver.bytes();
                const mesh = items[k].mesh;
                const skin = first.skinned ? mesh.skin : null;
                if (skin) {
                    skin.ensureGpuResources(ctx.device, ctx.skinBindGroupLayout);
                    const jointCount = skin.jointCount | 0;
                    const jointMatPtr = frameArena.allocF32(jointCount * 16) as WasmPtr;
                    animf.computeJointMatricesTo(jointMatPtr, skin.skin.jointIndicesPtr, jointCount, skin.skin.invBindPtr, TransformStore.global().worldPtr as WasmPtr, skin.meshWorldMatrixPtr);
                    ctx.queue.writeBuffer(skin.boneBuffer!, 0, bytes, jointMatPtr, jointCount * 64);
                    pass.setBindGroup(2, skin.bindGroup!);
                }
                const modelPtr = mesh.transform.worldMatrixPtr as WasmPtr;
                const invPtr = ctx.modelUniformStagingPtr;
                const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
                mat4f.invert(invPtr, modelPtr);
                mat4f.transpose(normalPtr, invPtr);
                ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
                ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
                pass.setBindGroup(0, globalBindGroup);
                if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
                else pass.draw(geometry.vertexCount);
            }
        }
        i = j;
    }
};

export const executePointCloudDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: PointCloudDrawItem[]): void => {
    if (items.length === 0) return;
    const bytes = driver.bytes();
    const mat4 = mat4f;
    let lastPipeline: GPURenderPipeline | null = null;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const cloud = item.cloud;
        if (!cloud.visible) continue;
        if (cloud.pointCount <= 0) continue;
        ensurePointCloudBindGroup(ctx, cloud);
        if (!cloud.bindGroup) continue;
        if (item.pipeline !== lastPipeline) {
            pass.setPipeline(item.pipeline);
            lastPipeline = item.pipeline;
        }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const modelSlot = ctx.modelBufferIndex++;
        const modelBuffer = ctx.modelUniformBuffers[modelSlot];
        const globalBindGroup = ctx.globalBindGroups[modelSlot];
        const modelPtr = cloud.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr as WasmPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4.invert(invPtr, modelPtr);
        mat4.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
        pass.setBindGroup(0, globalBindGroup);
        pass.setBindGroup(1, cloud.bindGroup);
        pass.draw(6, cloud.pointCount);
    }
};

export const executeSplatFieldDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: SplatFieldDrawItem[]): void => {
    if (items.length === 0) return;
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastField: SplatField | null = null;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const field = item.field;
        if (!field.visible) continue;
        if (field.splatCount <= 0) continue;
        ensureSplatFieldBindGroup(ctx, field);
        if (!field.bindGroup) continue;
        if (item.pipeline !== lastPipeline) {
            pass.setPipeline(item.pipeline);
            lastPipeline = item.pipeline;
            lastField = null;
        }
        if (field !== lastField) {
            pass.setBindGroup(1, field.bindGroup);
            lastField = field;
        }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const modelSlot = ctx.modelBufferIndex++;
        const modelBuffer = ctx.modelUniformBuffers[modelSlot];
        const globalBindGroup = ctx.globalBindGroups[modelSlot];
        const modelPtr = field.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr as WasmPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
        pass.setBindGroup(0, globalBindGroup);
        pass.draw(6, field.splatCount);
    }
};

export const executeLatticeSpaceDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: LatticeSpaceDrawItem[]): void => {
    if (items.length === 0) return;
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    for (const item of items) {
        const space = item.space;
        if (!space.visible || space.drawCellCount <= 0) continue;
        ensureLatticeSpaceBindGroup(ctx, space);
        if (!space.bindGroup) continue;
        if (item.pipeline !== lastPipeline) { pass.setPipeline(item.pipeline); lastPipeline = item.pipeline; }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const slot = ctx.modelBufferIndex++;
        const modelPtr = space.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr as WasmPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr); mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(ctx.modelUniformBuffers[slot], 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(ctx.modelUniformBuffers[slot], 16 * 4, bytes, normalPtr, 16 * 4);
        pass.setBindGroup(0, ctx.globalBindGroups[slot]); pass.setBindGroup(1, space.bindGroup);
        if (space.dimensionCount === 2) pass.draw(6);
        else pass.draw(36, space.drawCellCount);
    }
};

export const executeGlyphFieldDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, list: GlyphFieldDrawItem[]): void => {
    if (list.length === 0) return;
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastGeometry: Geometry | null = null;
    let lastField: GlyphField | null = null;
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const field = item.field;
        const geometry = item.geometry;
        if (!field.visible) continue;
        if (field.instanceCount <= 0) continue;
        ensureGlyphFieldBindGroup(ctx, field);
        if (!field.bindGroup) continue;
        if (item.pipeline !== lastPipeline) {
            pass.setPipeline(item.pipeline);
            lastPipeline = item.pipeline;
            lastGeometry = null;
            lastField = null;
        }
        if (geometry !== lastGeometry) {
            geometry.upload(ctx.device);
            pass.setVertexBuffer(0, geometry.positionBuffer);
            pass.setVertexBuffer(1, geometry.normalBuffer);
            if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
            lastGeometry = geometry;
        }
        if (field !== lastField) {
            pass.setBindGroup(1, field.bindGroup);
            lastField = field;
        }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const modelSlot = ctx.modelBufferIndex++;
        const modelBuffer = ctx.modelUniformBuffers[modelSlot];
        const globalBindGroup = ctx.globalBindGroups[modelSlot];
        const modelPtr = field.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
        pass.setBindGroup(0, globalBindGroup);
        if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, field.instanceCount);
        else pass.draw(geometry.vertexCount, field.instanceCount);
    }
};

export const executeNodeLinkDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, list: NodeLinkDrawItem[]): void => {
    if (list.length === 0) return;
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastGeometry: Geometry | null = null;
    let lastLink: NodeLink | null = null;
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const link = item.link;
        ensureNodeLinkBindGroup(ctx, link);
        if (!link.bindGroup) continue;
        if (item.pipeline !== lastPipeline) {
            pass.setPipeline(item.pipeline);
            lastPipeline = item.pipeline;
            lastGeometry = null;
            lastLink = null;
        }
        if (item.geometry && item.geometry !== lastGeometry) {
            item.geometry.upload(ctx.device);
            pass.setVertexBuffer(0, item.geometry.positionBuffer);
            pass.setVertexBuffer(1, item.geometry.normalBuffer);
            if (item.geometry.isIndexed) pass.setIndexBuffer(item.geometry.indexBuffer!, "uint32");
            lastGeometry = item.geometry;
        }
        if (link !== lastLink) {
            pass.setBindGroup(1, link.bindGroup);
            lastLink = link;
        }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const slot = ctx.modelBufferIndex++;
        const modelBuffer = ctx.modelUniformBuffers[slot];
        const globalBindGroup = ctx.globalBindGroups[slot];
        const modelPtr = link.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
        pass.setBindGroup(0, globalBindGroup);
        if (item.passKind === "node-points") {
            pass.draw(6, link.nodeCount);
        } else if (item.passKind === "edge-lines") {
            pass.draw(2, link.edgeCount);
        } else if (item.passKind === "node-solid") {
            if (!item.geometry) continue;
            if (item.geometry.isIndexed) pass.drawIndexed(item.geometry.indexCount, link.nodeCount);
            else pass.draw(item.geometry.vertexCount, link.nodeCount);
        } else {
            if (!item.geometry) continue;
            if (item.geometry.isIndexed) pass.drawIndexed(item.geometry.indexCount, link.edgeCount);
            else pass.draw(item.geometry.vertexCount, link.edgeCount);
        }
    }
};

export const drawInstancedRun = (ctx: RendererContext, pass: GPURenderPassEncoder, geometry: Geometry, material: Material, items: DrawItem[], start: number, count: number): void => {
    const ptrsPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
    const u32 = TransformStore.global().u32();
    const ptrsBase = ptrsPtr >>> 2;
    for (let i = 0; i < count; i++) u32[ptrsBase + i] = items[start + i].mesh.transform.worldMatrixPtr >>> 0;
    const outPtr = frameArena.allocF32(count * 32) as WasmPtr;
    transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
    const outBytes = count * ctx.INSTANCE_STRIDE_BYTES;
    const dstOffset = ctx.instanceBufferOffset;
    const dstEnd = dstOffset + outBytes;
    ensureInstanceBuffer(ctx, dstEnd);
    const bytes = driver.bytes();
    ctx.queue.writeBuffer(ctx.instanceBuffer!, dstOffset, bytes, outPtr, outBytes);
    pass.setBindGroup(0, ctx.globalBindGroups[0]);
    if (material instanceof StandardMaterial) {
        pass.setVertexBuffer(4, geometry.tangentBuffer);
        pass.setVertexBuffer(5, geometry.colorBuffer);
        pass.setVertexBuffer(6, ctx.instanceBuffer!, dstOffset, outBytes);
    } else {
        pass.setVertexBuffer(4, geometry.colorBuffer);
        pass.setVertexBuffer(5, ctx.instanceBuffer!, dstOffset, outBytes);
    }
    if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, count);
    else pass.draw(geometry.vertexCount, count);
    ctx.instanceBufferOffset = dstEnd;
};

export const getOrCreateSplatFieldSortState = (ctx: RendererContext, field: SplatField): SplatFieldSortState => {
    let state = ctx.splatFieldSortStates.get(field);
    if (!state) { state = { sortedIndexBuffer: null, sortedIndexCapacity: 0, transformBuffer: null }; ctx.splatFieldSortStates.set(field, state); }
    if (!state.transformBuffer) state.transformBuffer = ctx.device.createBuffer({ size: 16 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    if (field.splatCount > state.sortedIndexCapacity) {
        state.sortedIndexBuffer?.destroy();
        let cap = Math.max(1, state.sortedIndexCapacity || 256);
        while (cap < field.splatCount) cap *= 2;
        state.sortedIndexCapacity = cap;
        state.sortedIndexBuffer = ctx.device.createBuffer({ size: cap * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        field.bindGroupKey = null;
    }
    return state;
};

export const destroySplatFieldSortState = (_ctx: RendererContext, field: SplatField, state: SplatFieldSortState): void => {
    state.sortedIndexBuffer?.destroy();
    state.transformBuffer?.destroy();
    field.bindGroup = null;
    field.bindGroupKey = null;
};

export const ensureSplatSortCapacity = (ctx: RendererContext, count: number): void => {
    if (count <= ctx.splatSortCapacity) return;
    let cap = Math.max(1, ctx.splatSortCapacity || 256);
    while (cap < count) cap *= 2;
    const keyUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    const indexUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    ctx.splatSortKeyA?.destroy();
    ctx.splatSortKeyB?.destroy();
    ctx.splatSortIndexA?.destroy();
    ctx.splatSortIndexB?.destroy();
    ctx.splatSortFlags?.destroy();
    ctx.splatSortPrefix?.destroy();
    ctx.splatSortZerosCount?.destroy();
    ctx.splatSortCapacity = cap;
    ctx.splatSortKeyA = ctx.device.createBuffer({ size: cap * 4, usage: keyUsage });
    ctx.splatSortKeyB = ctx.device.createBuffer({ size: cap * 4, usage: keyUsage });
    ctx.splatSortIndexA = ctx.device.createBuffer({ size: cap * 4, usage: indexUsage });
    ctx.splatSortIndexB = ctx.device.createBuffer({ size: cap * 4, usage: indexUsage });
    ctx.splatSortFlags = ctx.device.createBuffer({ size: cap * 4, usage: GPUBufferUsage.STORAGE });
    ctx.splatSortPrefix = ctx.device.createBuffer({ size: cap * 4, usage: GPUBufferUsage.STORAGE });
    ctx.splatSortZerosCount = ctx.device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE });
};

export const ensureSplatSortScanLevel = (ctx: RendererContext, level: number, count: number): SplatFieldSortScanLevel => {
    while (ctx.splatSortScanLevels.length <= level) ctx.splatSortScanLevels.push({ blockSums: null, blockSumsCapacity: 0, blockOffsets: null, blockOffsetsCapacity: 0 });
    const scanLevel = ctx.splatSortScanLevels[level];
    if (count > scanLevel.blockSumsCapacity) {
        scanLevel.blockSums?.destroy();
        let cap = Math.max(1, scanLevel.blockSumsCapacity || 1);
        while (cap < count) cap *= 2;
        scanLevel.blockSumsCapacity = cap;
        scanLevel.blockSums = ctx.device.createBuffer({ size: cap * 4, usage: GPUBufferUsage.STORAGE });
    }
    if (count > scanLevel.blockOffsetsCapacity) {
        scanLevel.blockOffsets?.destroy();
        let cap = Math.max(1, scanLevel.blockOffsetsCapacity || 1);
        while (cap < count) cap *= 2;
        scanLevel.blockOffsetsCapacity = cap;
        scanLevel.blockOffsets = ctx.device.createBuffer({ size: cap * 4, usage: GPUBufferUsage.STORAGE });
    }
    return scanLevel;
};

export const ensureSplatSortFrameCapacity = (ctx: RendererContext, count: number, level: number = 0): void => {
    if (count <= 0) return;
    if (level === 0) ensureSplatSortCapacity(ctx, count);
    const numBlocks = ceilDiv(count, 512);
    ensureSplatSortScanLevel(ctx, level, numBlocks);
    if (numBlocks > 1) ensureSplatSortFrameCapacity(ctx, numBlocks, level + 1);
};

export const getSplatFieldBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.splatFieldBindGroupLayout) return ctx.splatFieldBindGroupLayout;
    ctx.splatFieldBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
            { binding: 3, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            { binding: 4, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
            { binding: 5, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform", minBindingSize: 16 } },
            { binding: 6, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } }
        ]
    });
    return ctx.splatFieldBindGroupLayout;
};

export const getOrCreateSplatFieldPipeline = (ctx: RendererContext): GPURenderPipeline => {
    const key = `splatfield:${ctx.format}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    const shaderModule = getOrCreateShaderModule(ctx, splatFieldWGSL);
    const pipeline = ctx.device.createRenderPipeline({
        label: key,
        layout: ctx.device.createPipelineLayout({
            bindGroupLayouts: [ctx.globalBindGroupLayout, getSplatFieldBindGroupLayout(ctx)]
        }),
        vertex: { module: shaderModule, entryPoint: "vs_main", buffers: [] },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{
                format: ctx.format,
                blend: getPremultipliedAlphaBlendState(ctx)
            }]
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "none"
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: false,
            depthCompare: "less"
        }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

export const getSplatFieldBindGroupKey = (ctx: RendererContext, field: SplatField, state: SplatFieldSortState): string => {
    const centerOpacity = field.centerOpacityBuffer;
    const rotation = field.rotationBuffer;
    const scale = field.scaleBuffer;
    const color = field.colorBuffer;
    const uniform = field.uniformBuffer;
    const sorted = state.sortedIndexBuffer;
    const sh = field.shBuffer;
    return `splatfield:${centerOpacity ? getObjectId(ctx, centerOpacity) : 0}:${rotation ? getObjectId(ctx, rotation) : 0}:${scale ? getObjectId(ctx, scale) : 0}:${color ? getObjectId(ctx, color) : 0}:${sorted ? getObjectId(ctx, sorted) : 0}:${uniform ? getObjectId(ctx, uniform) : 0}:${sh ? getObjectId(ctx, sh) : 0}`;
};

export const ensureSplatFieldBindGroup = (ctx: RendererContext, field: SplatField): void => {
    field.upload(ctx.device, ctx.queue);
    if (!field.centerOpacityBuffer || !field.rotationBuffer || !field.scaleBuffer || !field.colorBuffer) return;
    if (field.splatCount <= 0) return;
    const state = getOrCreateSplatFieldSortState(ctx, field);
    if (!state.sortedIndexBuffer) return;
    if (!field.uniformBuffer) {
        field.uniformBuffer = ctx.device.createBuffer({
            size: field.getUniformBufferSize(),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        field.bindGroupKey = null;
    }
    if (field.dirtyUniforms) {
        const data = field.getUniformData();
        ctx.queue.writeBuffer(field.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
        field.markUniformsClean();
    }
    if (!ctx.splatFieldDummySHBuffer) ctx.splatFieldDummySHBuffer = ctx.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const key = getSplatFieldBindGroupKey(ctx, field, state);
    if (field.bindGroup && field.bindGroupKey === key) return;
    field.bindGroup = ctx.device.createBindGroup({
        layout: getSplatFieldBindGroupLayout(ctx),
        entries: [
            { binding: 0, resource: { buffer: field.centerOpacityBuffer } },
            { binding: 1, resource: { buffer: field.rotationBuffer } },
            { binding: 2, resource: { buffer: field.scaleBuffer } },
            { binding: 3, resource: { buffer: field.colorBuffer } },
            { binding: 4, resource: { buffer: state.sortedIndexBuffer } },
            { binding: 5, resource: { buffer: field.uniformBuffer } },
            { binding: 6, resource: { buffer: field.shBuffer ?? ctx.splatFieldDummySHBuffer } }
        ]
    });
    field.bindGroupKey = key;
};

export const getSplatSortKeygenBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.splatSortKeygenBindGroupLayout) return ctx.splatSortKeygenBindGroupLayout;
    ctx.splatSortKeygenBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", minBindingSize: 64 } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
    return ctx.splatSortKeygenBindGroupLayout;
};

export const getSplatSortFlagsBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.splatSortFlagsBindGroupLayout) return ctx.splatSortFlagsBindGroupLayout;
    ctx.splatSortFlagsBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
    return ctx.splatSortFlagsBindGroupLayout;
};

export const getSplatSortScanBlockBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.splatSortScanBlockBindGroupLayout) return ctx.splatSortScanBlockBindGroupLayout;
    ctx.splatSortScanBlockBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
    return ctx.splatSortScanBlockBindGroupLayout;
};

export const getSplatSortScanAddBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.splatSortScanAddBindGroupLayout) return ctx.splatSortScanAddBindGroupLayout;
    ctx.splatSortScanAddBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }
        ]
    });
    return ctx.splatSortScanAddBindGroupLayout;
};

export const getSplatSortZeroCountBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.splatSortZeroCountBindGroupLayout) return ctx.splatSortZeroCountBindGroupLayout;
    ctx.splatSortZeroCountBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
    return ctx.splatSortZeroCountBindGroupLayout;
};

export const getSplatSortScatterBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.splatSortScatterBindGroupLayout) return ctx.splatSortScatterBindGroupLayout;
    ctx.splatSortScatterBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
    return ctx.splatSortScatterBindGroupLayout;
};

export const getOrCreateSplatSortKeygenPipeline = (ctx: RendererContext): GPUComputePipeline => {
    const key = "splat:sort:keygen";
    const cached = ctx.computePipelineCache.get(key);
    if (cached) return cached;
    const pipeline = ctx.device.createComputePipeline({
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [getSplatSortKeygenBindGroupLayout(ctx)] }),
        compute: {
            module: getOrCreateShaderModule(ctx, splatFieldSortWGSL),
            entryPoint: "main"
        }
    });
    ctx.computePipelineCache.set(key, pipeline);
    return pipeline;
};

export const getOrCreateSplatSortFlagsPipeline = (ctx: RendererContext, bit: number): GPUComputePipeline => {
    const key = `splat:sort:flags:${bit | 0}`;
    const cached = ctx.computePipelineCache.get(key);
    if (cached) return cached;
    const pipeline = ctx.device.createComputePipeline({
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [getSplatSortFlagsBindGroupLayout(ctx)] }),
        compute: {
            module: getOrCreateShaderModule(ctx, splatFieldRadixFlagsWGSL),
            entryPoint: "main",
            constants: { BIT: bit | 0 }
        }
    });
    ctx.computePipelineCache.set(key, pipeline);
    return pipeline;
};

export const getOrCreateSplatSortScanBlockPipeline = (ctx: RendererContext): GPUComputePipeline => {
    const key = "splat:sort:scan:blockExclusiveU32";
    const cached = ctx.computePipelineCache.get(key);
    if (cached) return cached;
    const pipeline = ctx.device.createComputePipeline({
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [getSplatSortScanBlockBindGroupLayout(ctx)] }),
        compute: {
            module: getOrCreateShaderModule(ctx, scanBlockExclusiveU32WGSL),
            entryPoint: "main"
        }
    });
    ctx.computePipelineCache.set(key, pipeline);
    return pipeline;
};

export const getOrCreateSplatSortScanAddPipeline = (ctx: RendererContext): GPUComputePipeline => {
    const key = "splat:sort:scan:addOffsetsU32";
    const cached = ctx.computePipelineCache.get(key);
    if (cached) return cached;
    const pipeline = ctx.device.createComputePipeline({
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [getSplatSortScanAddBindGroupLayout(ctx)] }),
        compute: {
            module: getOrCreateShaderModule(ctx, scanAddBlockOffsetsU32WGSL),
            entryPoint: "main"
        }
    });
    ctx.computePipelineCache.set(key, pipeline);
    return pipeline;
};

export const getOrCreateSplatSortZeroCountPipeline = (ctx: RendererContext): GPUComputePipeline => {
    const key = "splat:sort:zerosCount";
    const cached = ctx.computePipelineCache.get(key);
    if (cached) return cached;
    const pipeline = ctx.device.createComputePipeline({
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [getSplatSortZeroCountBindGroupLayout(ctx)] }),
        compute: {
            module: getOrCreateShaderModule(ctx, splatFieldRadixCountZerosWGSL),
            entryPoint: "main"
        }
    });
    ctx.computePipelineCache.set(key, pipeline);
    return pipeline;
};

export const getOrCreateSplatSortScatterPipeline = (ctx: RendererContext, bit: number): GPUComputePipeline => {
    const key = `splat:sort:scatter:${bit | 0}`;
    const cached = ctx.computePipelineCache.get(key);
    if (cached) return cached;
    const pipeline = ctx.device.createComputePipeline({
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [getSplatSortScatterBindGroupLayout(ctx)] }),
        compute: {
            module: getOrCreateShaderModule(ctx, splatFieldRadixScatterPairsWGSL),
            entryPoint: "main",
            constants: { BIT: bit | 0 }
        }
    });
    ctx.computePipelineCache.set(key, pipeline);
    return pipeline;
};

export const encodeSplatSortScanExclusive = (ctx: RendererContext, pass: GPUComputePassEncoder, input: GPUBuffer, count: number, out: GPUBuffer, level: number = 0): void => {
    if (count <= 0) return;
    const numBlocks = ceilDiv(count, 512);
    const scanLevel = ensureSplatSortScanLevel(ctx, level, numBlocks);
    const scanBlocksBg = ctx.device.createBindGroup({
        layout: getSplatSortScanBlockBindGroupLayout(ctx),
        entries: [
            { binding: 0, resource: bindSizedBuffer(ctx, input, count * 4) },
            { binding: 1, resource: bindSizedBuffer(ctx, out, count * 4) },
            { binding: 2, resource: bindSizedBuffer(ctx, scanLevel.blockSums!, numBlocks * 4) }
        ]
    });
    pass.setPipeline(getOrCreateSplatSortScanBlockPipeline(ctx));
    pass.setBindGroup(0, scanBlocksBg);
    pass.dispatchWorkgroups(numBlocks, 1, 1);
    if (numBlocks <= 1) return;
    encodeSplatSortScanExclusive(ctx, pass, scanLevel.blockSums!, numBlocks, scanLevel.blockOffsets!, level + 1);
    const addOffsetsBg = ctx.device.createBindGroup({
        layout: getSplatSortScanAddBindGroupLayout(ctx),
        entries: [
            { binding: 0, resource: bindSizedBuffer(ctx, out, count * 4) },
            { binding: 1, resource: bindSizedBuffer(ctx, scanLevel.blockOffsets!, numBlocks * 4) }
        ]
    });
    pass.setPipeline(getOrCreateSplatSortScanAddPipeline(ctx));
    pass.setBindGroup(0, addOffsetsBg);
    pass.dispatchWorkgroups(ceilDiv(count, 256), 1, 1);
};

export const encodeSplatFieldSort = (ctx: RendererContext, pass: GPUComputePassEncoder, field: SplatField, state: SplatFieldSortState): GPUBuffer | null => {
    if (!field.centerOpacityBuffer) return null;
    if (!state.transformBuffer || !state.sortedIndexBuffer) return null;
    const count = field.splatCount | 0;
    if (count <= 0) return null;
    ensureSplatSortCapacity(ctx, count);
    const mvpPtr = frameArena.allocF32(16) as WasmPtr;
    mat4f.mul(mvpPtr, ctx.cameraUniformStagingPtr, field.transform.worldMatrixPtr as WasmPtr);
    ctx.queue.writeBuffer(state.transformBuffer, 0, driver.bytes(), mvpPtr, 16 * 4);
    const keygenBg = ctx.device.createBindGroup({
        layout: getSplatSortKeygenBindGroupLayout(ctx),
        entries: [
            { binding: 0, resource: bindSizedBuffer(ctx, field.centerOpacityBuffer, count * 16) },
            { binding: 1, resource: { buffer: state.transformBuffer } },
            { binding: 2, resource: bindSizedBuffer(ctx, ctx.splatSortKeyA!, count * 4) },
            { binding: 3, resource: bindSizedBuffer(ctx, ctx.splatSortIndexA!, count * 4) }
        ]
    });
    pass.setPipeline(getOrCreateSplatSortKeygenPipeline(ctx));
    pass.setBindGroup(0, keygenBg);
    pass.dispatchWorkgroups(ceilDiv(count, 256), 1, 1);
    let keyIn = ctx.splatSortKeyA!;
    let keyOut = ctx.splatSortKeyB!;
    let valueIn = ctx.splatSortIndexA!;
    let valueOut = ctx.splatSortIndexB!;
    for (let bit = 0; bit < 32; bit++) {
        const flagsBg = ctx.device.createBindGroup({
            layout: getSplatSortFlagsBindGroupLayout(ctx),
            entries: [
                { binding: 0, resource: bindSizedBuffer(ctx, keyIn, count * 4) },
                { binding: 1, resource: bindSizedBuffer(ctx, ctx.splatSortFlags!, count * 4) }
            ]
        });
        pass.setPipeline(getOrCreateSplatSortFlagsPipeline(ctx, bit));
        pass.setBindGroup(0, flagsBg);
        pass.dispatchWorkgroups(ceilDiv(count, 256), 1, 1);
        encodeSplatSortScanExclusive(ctx, pass, ctx.splatSortFlags!, count, ctx.splatSortPrefix!);
        const zerosCountBg = ctx.device.createBindGroup({
            layout: getSplatSortZeroCountBindGroupLayout(ctx),
            entries: [
                { binding: 0, resource: bindSizedBuffer(ctx, ctx.splatSortFlags!, count * 4) },
                { binding: 1, resource: bindSizedBuffer(ctx, ctx.splatSortPrefix!, count * 4) },
                { binding: 2, resource: bindSizedBuffer(ctx, ctx.splatSortZerosCount!, 4) }
            ]
        });
        pass.setPipeline(getOrCreateSplatSortZeroCountPipeline(ctx));
        pass.setBindGroup(0, zerosCountBg);
        pass.dispatchWorkgroups(1, 1, 1);
        const scatterBg = ctx.device.createBindGroup({
            layout: getSplatSortScatterBindGroupLayout(ctx),
            entries: [
                { binding: 0, resource: bindSizedBuffer(ctx, keyIn, count * 4) },
                { binding: 1, resource: bindSizedBuffer(ctx, valueIn, count * 4) },
                { binding: 2, resource: bindSizedBuffer(ctx, ctx.splatSortPrefix!, count * 4) },
                { binding: 3, resource: bindSizedBuffer(ctx, ctx.splatSortZerosCount!, 4) },
                { binding: 4, resource: bindSizedBuffer(ctx, keyOut, count * 4) },
                { binding: 5, resource: bindSizedBuffer(ctx, valueOut, count * 4) }
            ]
        });
        pass.setPipeline(getOrCreateSplatSortScatterPipeline(ctx, bit));
        pass.setBindGroup(0, scatterBg);
        pass.dispatchWorkgroups(ceilDiv(count, 256), 1, 1);
        const nextKeyIn = keyOut;
        keyOut = keyOut === ctx.splatSortKeyA ? ctx.splatSortKeyB! : ctx.splatSortKeyA!;
        keyIn = nextKeyIn;
        const nextValueIn = valueOut;
        valueOut = valueOut === ctx.splatSortIndexA ? ctx.splatSortIndexB! : ctx.splatSortIndexA!;
        valueIn = nextValueIn;
    }
    return valueIn;
};

export const encodeSplatFieldSorts = (ctx: RendererContext, encoder: GPUCommandEncoder): void => {
    if (ctx.transparentSplatFieldDrawList.length === 0) return;
    let maxCount = 0;
    for (const item of ctx.transparentSplatFieldDrawList) {
        const field = item.field;
        if (!field.visible) continue;
        if (field.splatCount <= 0) continue;
        if (field.splatCount > maxCount) maxCount = field.splatCount;
    }
    ensureSplatSortFrameCapacity(ctx, maxCount);
    for (const item of ctx.transparentSplatFieldDrawList) {
        const field = item.field;
        field.upload(ctx.device, ctx.queue);
        if (!field.centerOpacityBuffer || !field.rotationBuffer || !field.scaleBuffer) continue;
        if (field.splatCount <= 0) continue;
        const state = getOrCreateSplatFieldSortState(ctx, field);
        const computePass = encoder.beginComputePass();
        const finalIndices = encodeSplatFieldSort(ctx, computePass, field, state);
        computePass.end();
        if (finalIndices && state.sortedIndexBuffer) encoder.copyBufferToBuffer(finalIndices, 0, state.sortedIndexBuffer, 0, field.splatCount * 4);
    }
};

export const getOrCreateLatticeSpaceSortState = (ctx: RendererContext, space: LatticeSpace): LatticeSpaceSortState => {
    let state = ctx.latticeSpaceSortStates.get(space);
    if (!state) { state = { sortedIndexBuffer: null, sortedIndexCapacity: 0, identityKey: null, transformBuffer: null }; ctx.latticeSpaceSortStates.set(space, state); }
    if (!state.transformBuffer) state.transformBuffer = ctx.device.createBuffer({ label: "LatticeSpace.sortTransform", size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    if (space.drawCellCount > state.sortedIndexCapacity) {
        state.sortedIndexBuffer?.destroy();
        let capacity = Math.max(256, state.sortedIndexCapacity || 256);
        while (capacity < space.drawCellCount) capacity *= 2;
        state.sortedIndexCapacity = capacity;
        state.sortedIndexBuffer = ctx.device.createBuffer({
            label: "LatticeSpace.sortedIndices",
            size: capacity * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        state.identityKey = null;
    }
    const range = space.indexRange;
    const identityKey = `${space.dimensionCount}:${range.min.join(",")}:${range.max.join(",")}`;
    if (state.sortedIndexBuffer && state.identityKey !== identityKey) {
        const sizeX = range.max[0] - range.min[0];
        const sizeY = range.max[1] - range.min[1];
        const indices = new Uint32Array(space.drawCellCount);
        for (let ordinal = 0; ordinal < indices.length; ordinal++) {
            const x = range.min[0] + ordinal % sizeX;
            const y = range.min[1] + Math.floor(ordinal / sizeX) % sizeY;
            const z = space.dimensionCount === 3 ? (range.min[2] ?? 0) + Math.floor(ordinal / (sizeX * sizeY)) : 0;
            indices[ordinal] = space.mapCellIndexToLinear(space.dimensionCount === 3 ? [x, y, z] : [x, y]);
        }
        ctx.queue.writeBuffer(state.sortedIndexBuffer, 0, indices);
        state.identityKey = identityKey;
        space.bindGroupKey = null;
    }
    return state;
};

export const destroyLatticeSpaceSortState = (_ctx: RendererContext, space: LatticeSpace, state: LatticeSpaceSortState): void => {
    state.sortedIndexBuffer?.destroy();
    state.transformBuffer?.destroy();
    space.bindGroup = null;
    space.bindGroupKey = null;
};

export const ensureLatticeSortCapacity = (ctx: RendererContext, count: number): void => {
    if (count <= ctx.latticeSortCapacity) return;
    let capacity = Math.max(256, ctx.latticeSortCapacity || 256);
    while (capacity < count) capacity *= 2;
    for (const buffer of [ctx.latticeSortKeyA, ctx.latticeSortKeyB, ctx.latticeSortIndexA, ctx.latticeSortIndexB, ctx.latticeSortFlags, ctx.latticeSortPrefix, ctx.latticeSortZerosCount]) buffer?.destroy();
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    ctx.latticeSortCapacity = capacity;
    ctx.latticeSortKeyA = ctx.device.createBuffer({ size: capacity * 4, usage });
    ctx.latticeSortKeyB = ctx.device.createBuffer({ size: capacity * 4, usage });
    ctx.latticeSortIndexA = ctx.device.createBuffer({ size: capacity * 4, usage });
    ctx.latticeSortIndexB = ctx.device.createBuffer({ size: capacity * 4, usage });
    ctx.latticeSortFlags = ctx.device.createBuffer({ size: capacity * 4, usage: GPUBufferUsage.STORAGE });
    ctx.latticeSortPrefix = ctx.device.createBuffer({ size: capacity * 4, usage: GPUBufferUsage.STORAGE });
    ctx.latticeSortZerosCount = ctx.device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE });
};

export const ensureLatticeSortScanLevel = (ctx: RendererContext, level: number, count: number): LatticeSpaceSortScanLevel => {
    while (ctx.latticeSortScanLevels.length <= level) ctx.latticeSortScanLevels.push({ blockSums: null, blockSumsCapacity: 0, blockOffsets: null, blockOffsetsCapacity: 0 });
    const scan = ctx.latticeSortScanLevels[level];
    if (count > scan.blockSumsCapacity) {
        scan.blockSums?.destroy();
        let capacity = Math.max(1, scan.blockSumsCapacity);
        while (capacity < count) capacity *= 2;
        scan.blockSumsCapacity = capacity;
        scan.blockSums = ctx.device.createBuffer({ size: capacity * 4, usage: GPUBufferUsage.STORAGE });
    }
    if (count > scan.blockOffsetsCapacity) {
        scan.blockOffsets?.destroy();
        let capacity = Math.max(1, scan.blockOffsetsCapacity);
        while (capacity < count) capacity *= 2;
        scan.blockOffsetsCapacity = capacity;
        scan.blockOffsets = ctx.device.createBuffer({ size: capacity * 4, usage: GPUBufferUsage.STORAGE });
    }
    return scan;
};

export const ensureLatticeSortFrameCapacity = (ctx: RendererContext, count: number, level: number = 0): void => {
    if (count <= 0) return;
    if (level === 0) ensureLatticeSortCapacity(ctx, count);
    const blocks = ceilDiv(count, 512);
    ensureLatticeSortScanLevel(ctx, level, blocks);
    if (blocks > 1) ensureLatticeSortFrameCapacity(ctx, blocks, level + 1);
};

export const getLatticeSpaceBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.latticeSpaceBindGroupLayout) return ctx.latticeSpaceBindGroupLayout;
    ctx.latticeSpaceBindGroupLayout = ctx.device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, buffer: { type: "uniform", minBindingSize: 368 } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "1d" } }
    ] });
    return ctx.latticeSpaceBindGroupLayout;
};

export const getOrCreateLatticeSpacePipeline = (ctx: RendererContext, space: LatticeSpace): GPURenderPipeline => {
    const key = ["latticespace", `rank=${space.dimensionCount}`, `blend=${space.blendMode}`, `cull=${space.cullMode}`, `depthTest=${space.depthTest ? 1 : 0}`, `depthWrite=${space.depthWrite ? 1 : 0}`, `fmt=${ctx.format}`].join("|");
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    const module = getOrCreateShaderModule(ctx, latticeSpaceWGSL);
    const pipeline = ctx.device.createRenderPipeline({
        label: key,
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [ctx.globalBindGroupLayout, getLatticeSpaceBindGroupLayout(ctx)] }),
        vertex: { module, entryPoint: space.dimensionCount === 2 ? "vs_2d" : "vs_3d", buffers: [] },
        fragment: { module, entryPoint: "fs_main", targets: [{ format: ctx.format, blend: getBlendState(ctx, space.blendMode) }] },
        primitive: { topology: "triangle-list", cullMode: space.dimensionCount === 2 ? "none" : getCullMode(ctx, space.cullMode) },
        depthStencil: { format: "depth24plus", depthWriteEnabled: space.depthWrite, depthCompare: space.depthTest ? "less" : "always" }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

export const ensureLatticeSpaceBindGroup = (ctx: RendererContext, space: LatticeSpace): void => {
    space.upload(ctx.device, ctx.queue);
    if (space.colorMode !== "solid" && !space.dataBuffer) return;
    const state = getOrCreateLatticeSpaceSortState(ctx, space);
    if (!state.sortedIndexBuffer) return;
    if (!space.uniformBuffer) {
        space.uniformBuffer = ctx.device.createBuffer({ label: "LatticeSpace.uniforms", size: space.getUniformBufferSize(), usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        space.bindGroupKey = null;
    }
    if (space.dirtyUniforms) {
        const data = space.getUniformData();
        ctx.queue.writeBuffer(space.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
        space.markUniformsClean();
    }
    if (!ctx.latticeSpaceDummyF32Buffer) ctx.latticeSpaceDummyF32Buffer = ctx.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    if (!ctx.latticeSpaceDummyU32Buffer) {
        ctx.latticeSpaceDummyU32Buffer = ctx.device.createBuffer({ size: Math.max(16, space.cellCount * 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        const active = new Uint32Array(space.cellCount);
        active.fill(1);
        ctx.queue.writeBuffer(ctx.latticeSpaceDummyU32Buffer, 0, active);
    }
    const dataBuffer = space.dataBuffer ?? ctx.latticeSpaceDummyF32Buffer;
    const maskBuffer = space.maskBuffer ?? ctx.latticeSpaceDummyU32Buffer;
    const colormap = space.getColormapForBinding();
    const colormapGPU = colormap.getGPUResources(ctx.device, ctx.queue);
    const key = `latticespace:${getObjectId(ctx, dataBuffer)}:${getObjectId(ctx, maskBuffer)}:${getObjectId(ctx, state.sortedIndexBuffer)}:${getObjectId(ctx, space.uniformBuffer)}:${space.getColormapKey()}`;
    if (space.bindGroup && space.bindGroupKey === key) return;
    space.bindGroup = ctx.device.createBindGroup({
        layout: getLatticeSpaceBindGroupLayout(ctx),
        entries: [
            { binding: 0, resource: { buffer: dataBuffer } },
            { binding: 1, resource: { buffer: maskBuffer } },
            { binding: 2, resource: { buffer: state.sortedIndexBuffer } },
            { binding: 3, resource: { buffer: space.uniformBuffer } },
            { binding: 4, resource: colormapGPU.sampler },
            { binding: 5, resource: colormapGPU.view }
        ]
    });
    space.bindGroupKey = key;
};

const getLatticeSortKeygenLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    return ctx.latticeSortKeygenBindGroupLayout ??= ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", minBindingSize: 368 } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", minBindingSize: 64 } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
};

const getLatticeSortFlagsLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    return ctx.latticeSortFlagsBindGroupLayout ??= ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
};

const getLatticeSortScanBlockLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    return ctx.latticeSortScanBlockBindGroupLayout ??= ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
};

const getLatticeSortScanAddLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    return ctx.latticeSortScanAddBindGroupLayout ??= ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }
        ]
    });
};

const getLatticeSortZeroLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    return ctx.latticeSortZeroCountBindGroupLayout ??= ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
};

const getLatticeSortScatterLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    return ctx.latticeSortScatterBindGroupLayout ??= ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ]
    });
};

const latticePipeline = (ctx: RendererContext, key: string, shader: string, layout: GPUBindGroupLayout, constants?: Record<string, number>): GPUComputePipeline => {
    const cached = ctx.computePipelineCache.get(key);
    if (cached) return cached;
    const pipeline = ctx.device.createComputePipeline({
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        compute: { module: getOrCreateShaderModule(ctx, shader), entryPoint: "main", ...(constants ? { constants } : {}) }
    });
    ctx.computePipelineCache.set(key, pipeline);
    return pipeline;
};

export const encodeLatticeSortScanExclusive = (ctx: RendererContext, pass: GPUComputePassEncoder, input: GPUBuffer, count: number, output: GPUBuffer, level: number = 0): void => {
    if (count <= 0) return;
    const blocks = ceilDiv(count, 512);
    const scan = ensureLatticeSortScanLevel(ctx, level, blocks);
    pass.setPipeline(latticePipeline(ctx, "lattice:sort:scan:block", scanBlockExclusiveU32WGSL, getLatticeSortScanBlockLayout(ctx)));
    pass.setBindGroup(0, ctx.device.createBindGroup({
        layout: getLatticeSortScanBlockLayout(ctx),
        entries: [
            { binding: 0, resource: bindSizedBuffer(ctx, input, count * 4) },
            { binding: 1, resource: bindSizedBuffer(ctx, output, count * 4) },
            { binding: 2, resource: bindSizedBuffer(ctx, scan.blockSums!, blocks * 4) }
        ]
    }));
    pass.dispatchWorkgroups(blocks);
    if (blocks <= 1) return;
    encodeLatticeSortScanExclusive(ctx, pass, scan.blockSums!, blocks, scan.blockOffsets!, level + 1);
    pass.setPipeline(latticePipeline(ctx, "lattice:sort:scan:add", scanAddBlockOffsetsU32WGSL, getLatticeSortScanAddLayout(ctx)));
    pass.setBindGroup(0, ctx.device.createBindGroup({
        layout: getLatticeSortScanAddLayout(ctx),
        entries: [
            { binding: 0, resource: bindSizedBuffer(ctx, output, count * 4) },
            { binding: 1, resource: bindSizedBuffer(ctx, scan.blockOffsets!, blocks * 4) }
        ]
    }));
    pass.dispatchWorkgroups(ceilDiv(count, 256));
};

export const encodeLatticeSpaceSort = (ctx: RendererContext, pass: GPUComputePassEncoder, space: LatticeSpace, state: LatticeSpaceSortState): GPUBuffer | null => {
    const count = space.drawCellCount;
    if (space.dimensionCount !== 3 || count <= 0 || !space.uniformBuffer || !state.transformBuffer || !state.sortedIndexBuffer) return null;
    ensureLatticeSortCapacity(ctx, count);
    const mvpPtr = frameArena.allocF32(16) as WasmPtr;
    mat4f.mul(mvpPtr, ctx.cameraUniformStagingPtr, space.transform.worldMatrixPtr as WasmPtr);
    ctx.queue.writeBuffer(state.transformBuffer, 0, driver.bytes(), mvpPtr, 64);
    pass.setPipeline(latticePipeline(ctx, "lattice:sort:keygen", latticeSpaceSortWGSL, getLatticeSortKeygenLayout(ctx)));
    pass.setBindGroup(0, ctx.device.createBindGroup({
        layout: getLatticeSortKeygenLayout(ctx),
        entries: [
            { binding: 0, resource: { buffer: space.uniformBuffer } },
            { binding: 1, resource: { buffer: state.transformBuffer } },
            { binding: 2, resource: bindSizedBuffer(ctx, ctx.latticeSortKeyA!, count * 4) },
            { binding: 3, resource: bindSizedBuffer(ctx, ctx.latticeSortIndexA!, count * 4) }
        ]
    }));
    pass.dispatchWorkgroups(ceilDiv(count, 256));
    let keyIn = ctx.latticeSortKeyA!;
    let keyOut = ctx.latticeSortKeyB!;
    let valueIn = ctx.latticeSortIndexA!;
    let valueOut = ctx.latticeSortIndexB!;
    for (let bit = 0; bit < 32; bit++) {
        pass.setPipeline(latticePipeline(ctx, `lattice:sort:flags:${bit}`, latticeSpaceRadixFlagsWGSL, getLatticeSortFlagsLayout(ctx), { BIT: bit }));
        pass.setBindGroup(0, ctx.device.createBindGroup({
            layout: getLatticeSortFlagsLayout(ctx),
            entries: [
                { binding: 0, resource: bindSizedBuffer(ctx, keyIn, count * 4) },
                { binding: 1, resource: bindSizedBuffer(ctx, ctx.latticeSortFlags!, count * 4) }
            ]
        }));
        pass.dispatchWorkgroups(ceilDiv(count, 256));
        encodeLatticeSortScanExclusive(ctx, pass, ctx.latticeSortFlags!, count, ctx.latticeSortPrefix!);
        pass.setPipeline(latticePipeline(ctx, "lattice:sort:zeros", latticeSpaceRadixCountZerosWGSL, getLatticeSortZeroLayout(ctx)));
        pass.setBindGroup(0, ctx.device.createBindGroup({
            layout: getLatticeSortZeroLayout(ctx),
            entries: [
                { binding: 0, resource: bindSizedBuffer(ctx, ctx.latticeSortFlags!, count * 4) },
                { binding: 1, resource: bindSizedBuffer(ctx, ctx.latticeSortPrefix!, count * 4) },
                { binding: 2, resource: bindSizedBuffer(ctx, ctx.latticeSortZerosCount!, 4) }
            ]
        }));
        pass.dispatchWorkgroups(1);
        pass.setPipeline(latticePipeline(ctx, `lattice:sort:scatter:${bit}`, latticeSpaceRadixScatterPairsWGSL, getLatticeSortScatterLayout(ctx), { BIT: bit }));
        pass.setBindGroup(0, ctx.device.createBindGroup({
            layout: getLatticeSortScatterLayout(ctx),
            entries: [
                { binding: 0, resource: bindSizedBuffer(ctx, keyIn, count * 4) },
                { binding: 1, resource: bindSizedBuffer(ctx, valueIn, count * 4) },
                { binding: 2, resource: bindSizedBuffer(ctx, ctx.latticeSortPrefix!, count * 4) },
                { binding: 3, resource: bindSizedBuffer(ctx, ctx.latticeSortZerosCount!, 4) },
                { binding: 4, resource: bindSizedBuffer(ctx, keyOut, count * 4) },
                { binding: 5, resource: bindSizedBuffer(ctx, valueOut, count * 4) }
            ]
        }));
        pass.dispatchWorkgroups(ceilDiv(count, 256));
        [keyIn, keyOut] = [keyOut, keyIn];
        [valueIn, valueOut] = [valueOut, valueIn];
    }
    return valueIn;
};

export const encodeLatticeSpaceSorts = (ctx: RendererContext, encoder: GPUCommandEncoder): void => {
    let maximum = 0;
    for (const item of ctx.transparentLatticeSpaceDrawList) if (item.space.dimensionCount === 3) maximum = Math.max(maximum, item.space.drawCellCount);
    if (maximum <= 0) return;
    ensureLatticeSortFrameCapacity(ctx, maximum);
    for (const item of ctx.transparentLatticeSpaceDrawList) {
        const space = item.space;
        if (space.dimensionCount !== 3 || space.drawCellCount <= 0) continue;
        ensureLatticeSpaceBindGroup(ctx, space);
        const state = getOrCreateLatticeSpaceSortState(ctx, space);
        const pass = encoder.beginComputePass();
        const result = encodeLatticeSpaceSort(ctx, pass, space, state);
        pass.end();
        if (result && state.sortedIndexBuffer) encoder.copyBufferToBuffer(result, 0, state.sortedIndexBuffer, 0, space.drawCellCount * 4);
    }
};

export const getPointCloudBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.pointCloudBindGroupLayout) return ctx.pointCloudBindGroupLayout;
    ctx.pointCloudBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "read-only-storage" }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform", minBindingSize: 240 }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                sampler: { type: "filtering" }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: { sampleType: "float", viewDimension: "1d" }
            },
            {
                binding: 4,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "read-only-storage" }
            }
        ]
    });
    return ctx.pointCloudBindGroupLayout;
};

export const getPointCloudPipelineCacheKey = (ctx: RendererContext, cloud: PointCloud): string => {
    return ["pointcloud", `blend=${cloud.blendMode}`, `depthTest=${cloud.depthTest ? 1 : 0}`, `depthWrite=${cloud.depthWrite ? 1 : 0}`, `fmt=${ctx.format}`].join("|");
};

export const getOrCreatePointCloudPipeline = (ctx: RendererContext, cloud: PointCloud): GPURenderPipeline => {
    const key = getPointCloudPipelineCacheKey(ctx, cloud);
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(pointCloudWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: pointCloudWGSL });
        ctx.shaderCache.set(pointCloudWGSL, shaderModule);
    }
    const bindGroupLayout = getPointCloudBindGroupLayout(ctx);
    const pipelineLayout = ctx.device.createPipelineLayout({
        bindGroupLayouts: [ctx.globalBindGroupLayout, bindGroupLayout]
    });
    const blend = getBlendState(ctx, cloud.blendMode);
    const pipeline = ctx.device.createRenderPipeline({
        label: key,
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers: []
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [
                {
                    format: ctx.format,
                    blend
                }
            ]
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "none"
        },
        depthStencil: cloud.depthTest
            ? {
                format: "depth24plus",
                depthWriteEnabled: cloud.depthWrite,
                depthCompare: "less"
            }
            : undefined
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

export const getPointCloudBindGroupKey = (ctx: RendererContext, cloud: PointCloud): string => {
    const points = cloud.pointsBuffer;
    const colors = cloud.colorsBuffer;
    const uniforms = cloud.uniformBuffer;
    return `pointcloud:${points ? getObjectId(ctx, points) : 0}:${colors ? getObjectId(ctx, colors) : 0}:${uniforms ? getObjectId(ctx, uniforms) : 0}:${cloud.getColormapKey()}`;
};

export const ensurePointCloudBindGroup = (ctx: RendererContext, cloud: PointCloud): void => {
    cloud.upload(ctx.device, ctx.queue);
    if (!cloud.pointsBuffer) return;
    if (cloud.pointCount <= 0) return;
    if (!cloud.uniformBuffer) {
        cloud.uniformBuffer = ctx.device.createBuffer({
            size: cloud.getUniformBufferSize(),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        cloud.bindGroupKey = null;
    }
    if (cloud.dirtyUniforms) {
        const data = cloud.getUniformData();
        ctx.queue.writeBuffer(cloud.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
        cloud.markUniformsClean();
    }
    if (!ctx.pointCloudDummyColorsBuffer) {
        ctx.pointCloudDummyColorsBuffer = ctx.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const white = new Float32Array([1, 1, 1, 1]);
        ctx.queue.writeBuffer(ctx.pointCloudDummyColorsBuffer, 0, white.buffer, white.byteOffset, white.byteLength);
    }
    const key = getPointCloudBindGroupKey(ctx, cloud);
    if (cloud.bindGroup && cloud.bindGroupKey === key) return;
    const layout = getPointCloudBindGroupLayout(ctx);
    const cmapGPU = cloud.getColormapForBinding().getGPUResources(ctx.device, ctx.queue);
    cloud.bindGroup = ctx.device.createBindGroup({
        layout,
        entries: [
            { binding: 0, resource: { buffer: cloud.pointsBuffer } },
            { binding: 1, resource: { buffer: cloud.uniformBuffer } },
            { binding: 2, resource: cmapGPU.sampler },
            { binding: 3, resource: cmapGPU.view },
            { binding: 4, resource: { buffer: cloud.colorsBuffer ?? ctx.pointCloudDummyColorsBuffer } }
        ]
    });
    cloud.bindGroupKey = key;
};

export const getGlyphFieldBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.glyphFieldBindGroupLayout) return ctx.glyphFieldBindGroupLayout;
    ctx.glyphFieldBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "read-only-storage" }
            },
            {
                binding: 4,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform", minBindingSize: 240 }
            },
            {
                binding: 5,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: "filtering" }
            },
            {
                binding: 6,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: "float", viewDimension: "1d" }
            }
        ]
    });
    return ctx.glyphFieldBindGroupLayout;
};

export const getOrCreateGlyphFieldPipeline = (ctx: RendererContext, field: GlyphField): GPURenderPipeline => {
    const key = `glyphfield:${ctx.format}:${field.blendMode}:${field.depthWrite ? 1 : 0}:${field.depthTest ? 1 : 0}:${field.cullMode}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    const shaderCode = glyphFieldWGSL;
    let shaderModule = ctx.shaderCache.get(shaderCode);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: shaderCode });
        ctx.shaderCache.set(shaderCode, shaderModule);
    }
    const layout = ctx.device.createPipelineLayout({
        bindGroupLayouts: [ctx.globalBindGroupLayout, getGlyphFieldBindGroupLayout(ctx)]
    });
    const pipeline = ctx.device.createRenderPipeline({
        layout,
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 12,
                    attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
                },
                {
                    arrayStride: 12,
                    attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }]
                }
            ]
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{ format: ctx.format, blend: getBlendState(ctx, field.blendMode) }]
        },
        primitive: {
            topology: "triangle-list",
            cullMode: getCullMode(ctx, field.cullMode)
        },
        depthStencil: (field.depthTest || field.depthWrite)
            ? {
                format: "depth24plus",
                depthWriteEnabled: field.depthWrite,
                depthCompare: field.depthTest ? "less" : "always"
            }
            : undefined
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

export const getGlyphFieldBindGroupKey = (ctx: RendererContext, field: GlyphField): string => {
    const p = field.positionsBuffer;
    const r = field.rotationsBuffer;
    const s = field.scalesBuffer;
    const a = field.attributesBuffer;
    const u = field.uniformBuffer;
    return `glyphfield:${p ? getObjectId(ctx, p) : 0}:${r ? getObjectId(ctx, r) : 0}:${s ? getObjectId(ctx, s) : 0}:${a ? getObjectId(ctx, a) : 0}:${u ? getObjectId(ctx, u) : 0}:${field.getColormapKey()}`;
};

export const ensureGlyphFieldBindGroup = (ctx: RendererContext, field: GlyphField): void => {
    field.upload(ctx.device, ctx.queue);
    if (!field.positionsBuffer) return;
    if (!field.rotationsBuffer) return;
    if (!field.scalesBuffer) return;
    if (field.instanceCount <= 0) return;
    if (!field.uniformBuffer) {
        field.uniformBuffer = ctx.device.createBuffer({
            size: field.getUniformBufferSize(),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        field.bindGroupKey = null;
    }
    if (field.dirtyUniforms) {
        const data = field.getUniformData();
        ctx.queue.writeBuffer(field.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
        field.markUniformsClean();
    }
    if (!field.attributesBuffer) {
        if (!ctx.glyphFieldDummyAttributesBuffer) {
            ctx.glyphFieldDummyAttributesBuffer = ctx.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
        }
        field.attributesBuffer = ctx.glyphFieldDummyAttributesBuffer;
        field.bindGroupKey = null;
    }
    const key = getGlyphFieldBindGroupKey(ctx, field);
    if (field.bindGroup && field.bindGroupKey === key) return;
    const layout = getGlyphFieldBindGroupLayout(ctx);
    const cmapGPU = field.getColormapForBinding().getGPUResources(ctx.device, ctx.queue);
    field.bindGroup = ctx.device.createBindGroup({
        layout,
        entries: [
            { binding: 0, resource: { buffer: field.positionsBuffer } },
            { binding: 1, resource: { buffer: field.rotationsBuffer } },
            { binding: 2, resource: { buffer: field.scalesBuffer } },
            { binding: 3, resource: { buffer: field.attributesBuffer } },
            { binding: 4, resource: { buffer: field.uniformBuffer } },
            { binding: 5, resource: cmapGPU.sampler },
            { binding: 6, resource: cmapGPU.view }
        ]
    });
    field.bindGroupKey = key;
};

export const getNodeLinkBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.nodeLinkBindGroupLayout) return ctx.nodeLinkBindGroupLayout;
    ctx.nodeLinkBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
            { binding: 4, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
            { binding: 5, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            { binding: 6, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            { binding: 7, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform", minBindingSize: 512 } },
            { binding: 8, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            { binding: 9, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "1d" } },
            { binding: 10, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            { binding: 11, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "1d" } }
        ]
    });
    return ctx.nodeLinkBindGroupLayout;
};

export const getNodeLinkPipelineCacheKey = (ctx: RendererContext, link: NodeLink, passKind: NodeLinkDrawItem["passKind"]): string => {
    const cull = (passKind === "node-solid" || passKind === "edge-cylinders") ? link.cullMode : "none";
    return ["nodelink", passKind, `blend=${link.blendMode}`, `depthTest=${link.depthTest ? 1 : 0}`, `depthWrite=${link.depthWrite ? 1 : 0}`, `cull=${cull}`, `fmt=${ctx.format}`].join("|");
};

export const getOrCreateNodeLinkPipeline = (ctx: RendererContext, link: NodeLink, passKind: NodeLinkDrawItem["passKind"]): GPURenderPipeline => {
    const key = getNodeLinkPipelineCacheKey(ctx, link, passKind);
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(nodeLinkWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: nodeLinkWGSL });
        ctx.shaderCache.set(nodeLinkWGSL, shaderModule);
    }
    const layout = ctx.device.createPipelineLayout({
        bindGroupLayouts: [ctx.globalBindGroupLayout, getNodeLinkBindGroupLayout(ctx)]
    });
    let vertexEntry = "vs_node_points";
    let fragmentEntry = "fs_node";
    let buffers: GPUVertexBufferLayout[] = [];
    let topology: GPUPrimitiveTopology = "triangle-list";
    let cullMode: GPUCullMode = "none";
    if (passKind === "node-solid") {
        vertexEntry = "vs_node_solid";
        fragmentEntry = "fs_node";
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] }
        ];
        topology = "triangle-list";
        cullMode = getCullMode(ctx, link.cullMode);
    } else if (passKind === "edge-lines") {
        vertexEntry = "vs_edge_lines";
        fragmentEntry = "fs_edge";
        buffers = [];
        topology = "line-list";
        cullMode = "none";
    } else if (passKind === "edge-cylinders") {
        vertexEntry = "vs_edge_cylinders";
        fragmentEntry = "fs_edge";
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] }
        ];
        topology = "triangle-list";
        cullMode = getCullMode(ctx, link.cullMode);
    }
    const pipeline = ctx.device.createRenderPipeline({
        label: key,
        layout,
        vertex: { module: shaderModule, entryPoint: vertexEntry, buffers },
        fragment: { module: shaderModule, entryPoint: fragmentEntry, targets: [{ format: ctx.format, blend: getBlendState(ctx, link.blendMode) }] },
        primitive: { topology, cullMode },
        depthStencil: (link.depthTest || link.depthWrite) ? { format: "depth24plus", depthWriteEnabled: link.depthWrite, depthCompare: link.depthTest ? "less" : "always" } : undefined
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

export const getNodeLinkBindGroupKey = (ctx: RendererContext, link: NodeLink): string => {
    const np = link.nodePositionsBuffer;
    const ns = link.nodeScalarsBuffer;
    const nc = link.nodeColorsBuffer;
    const nr = link.nodeRadiiBuffer;
    const ep = link.edgesBuffer;
    const es = link.edgeScalarsBuffer;
    const ec = link.edgeColorsBuffer;
    const u = link.uniformBuffer;
    return `nodelink:${np ? getObjectId(ctx, np) : 0}:${ns ? getObjectId(ctx, ns) : 0}:${nc ? getObjectId(ctx, nc) : 0}:${nr ? getObjectId(ctx, nr) : 0}:${ep ? getObjectId(ctx, ep) : 0}:${es ? getObjectId(ctx, es) : 0}:${ec ? getObjectId(ctx, ec) : 0}:${u ? getObjectId(ctx, u) : 0}:${link.getNodeColormapKey()}:${link.getEdgeColormapKey()}`;
};

export const ensureNodeLinkBindGroup = (ctx: RendererContext, link: NodeLink): void => {
    link.upload(ctx.device, ctx.queue);
    if (!link.nodePositionsBuffer) return;
    if (!link.uniformBuffer) {
        link.uniformBuffer = ctx.device.createBuffer({ size: link.getUniformBufferSize(), usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        link.bindGroupKey = null;
    }
    if (link.dirtyUniforms) {
        const data = link.getUniformData();
        ctx.queue.writeBuffer(link.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
        link.markUniformsClean();
    }
    if (!ctx.nodeLinkDummyF32Buffer) ctx.nodeLinkDummyF32Buffer = ctx.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    if (!ctx.nodeLinkDummyU32Buffer) ctx.nodeLinkDummyU32Buffer = ctx.device.createBuffer({ size: 8, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const key = getNodeLinkBindGroupKey(ctx, link);
    if (link.bindGroup && link.bindGroupKey === key) return;
    const nodeCmap = link.getNodeColormapForBinding().getGPUResources(ctx.device, ctx.queue);
    const edgeCmap = link.getEdgeColormapForBinding().getGPUResources(ctx.device, ctx.queue);
    link.bindGroup = ctx.device.createBindGroup({
        layout: getNodeLinkBindGroupLayout(ctx),
        entries: [
            { binding: 0, resource: { buffer: link.nodePositionsBuffer ?? ctx.nodeLinkDummyF32Buffer } },
            { binding: 1, resource: { buffer: link.nodeScalarsBuffer ?? ctx.nodeLinkDummyF32Buffer } },
            { binding: 2, resource: { buffer: link.nodeColorsBuffer ?? ctx.nodeLinkDummyF32Buffer } },
            { binding: 3, resource: { buffer: link.nodeRadiiBuffer ?? ctx.nodeLinkDummyF32Buffer } },
            { binding: 4, resource: { buffer: link.edgesBuffer ?? ctx.nodeLinkDummyU32Buffer } },
            { binding: 5, resource: { buffer: link.edgeScalarsBuffer ?? ctx.nodeLinkDummyF32Buffer } },
            { binding: 6, resource: { buffer: link.edgeColorsBuffer ?? ctx.nodeLinkDummyF32Buffer } },
            { binding: 7, resource: { buffer: link.uniformBuffer } },
            { binding: 8, resource: nodeCmap.sampler },
            { binding: 9, resource: nodeCmap.view },
            { binding: 10, resource: edgeCmap.sampler },
            { binding: 11, resource: edgeCmap.view }
        ]
    });
    link.bindGroupKey = key;
};

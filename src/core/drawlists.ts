/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TransformStore } from "./transform";
import { Geometry } from "../graphics/geometry";
import { BlendMode, Material, StandardMaterial } from "../graphics/material";
import type { Camera } from "../world/camera";
import { Mesh, getMeshLocalBoundsSource, getMeshVertexBuffers, getMeshVertexSource } from "../world/mesh";
import type { Scene } from "../world/scene";
import { PointCloud } from "../world/pointcloud";
import { SplatField } from "../world/splatfield";
import { GlyphField } from "../world/glyphfield";
import { NodeLink } from "../world/nodelink";
import { LatticeSpace } from "../world/latticespace";
import { animf, cullf, driver, frameArena, frustumf, mat4f, wasm } from "../wasm";
import type { WasmPtr } from "../wasm";
import type { RendererContext } from "./context";
import type { DrawItem, GlyphFieldDrawItem, LatticeSpaceDrawItem, NodeLinkDrawItem, PointCloudDrawItem, SplatFieldDrawItem, TransparentDrawItem } from "./types";
import { ensureModelBufferPool, getObjectId } from "./resources";
import { destroyLatticeSpaceSortState, destroySplatFieldSortState, ensureGlyphFieldBindGroup, ensureLatticeSpaceBindGroup, ensureNodeLinkBindGroup, ensurePointCloudBindGroup, ensureSplatFieldBindGroup, getOrCreateGlyphFieldPipeline, getOrCreateLatticeSpacePipeline, getOrCreateNodeLinkPipeline, getOrCreatePointCloudPipeline, getOrCreateSplatFieldPipeline } from "./objects";
import { ensureMaterialBindGroup, getOrCreatePipeline, isMirroredWorldMatrix, materialSupportsSkinning } from "./materials";
import { isOpticallyTransmissiveMaterial } from "./transmission";

export const acquireDrawItem = (ctx: RendererContext): DrawItem => {
    const i = ctx.drawItemPoolUsed++;
    let item = ctx.drawItemPool[i];
    if (!item) {
        item = {
            mesh: null as unknown as Mesh,
            geometry: null as unknown as Geometry,
            material: null as unknown as Material,
            pipeline: null as unknown as GPURenderPipeline,
            pipelineId: 0,
            materialId: 0,
            geometryId: 0,
            vertexSourceId: 0,
            skinned: false,
            skinned8: false,
            mirrored: false,
            sortKey: 0
        };
        ctx.drawItemPool[i] = item;
    }
    return item;
};

export const acquirePointCloudDrawItem = (ctx: RendererContext): PointCloudDrawItem => {
    const i = ctx.pointCloudDrawItemPoolUsed++;
    let item = ctx.pointCloudDrawItemPool[i];
    if (!item) {
        item = { cloud: null as unknown as PointCloud, pipeline: null as unknown as GPURenderPipeline, pipelineId: 0, cloudId: 0, sortKey: 0 };
        ctx.pointCloudDrawItemPool[i] = item;
    }
    return item;
};

export const acquireSplatFieldDrawItem = (ctx: RendererContext): SplatFieldDrawItem => {
    const i = ctx.splatFieldDrawItemPoolUsed++;
    let item = ctx.splatFieldDrawItemPool[i];
    if (!item) {
        item = { field: null as unknown as SplatField, pipeline: null as unknown as GPURenderPipeline, pipelineId: 0, fieldId: 0, sortKey: 0 };
        ctx.splatFieldDrawItemPool[i] = item;
    }
    return item;
};

export const acquireGlyphFieldDrawItem = (ctx: RendererContext): GlyphFieldDrawItem => {
    const i = ctx.glyphFieldDrawItemPoolUsed++;
    let item = ctx.glyphFieldDrawItemPool[i];
    if (!item) {
        item = { field: null as unknown as GlyphField, geometry: null as unknown as Geometry, pipeline: null as unknown as GPURenderPipeline, pipelineId: 0, geometryId: 0, fieldId: 0, sortKey: 0 };
        ctx.glyphFieldDrawItemPool[i] = item;
    }
    return item;
};

export const acquireNodeLinkDrawItem = (ctx: RendererContext): NodeLinkDrawItem => {
    const i = ctx.nodeLinkDrawItemPoolUsed++;
    let item = ctx.nodeLinkDrawItemPool[i];
    if (!item) {
        item = { link: null as unknown as NodeLink, pipeline: null as unknown as GPURenderPipeline, pipelineId: 0, linkId: 0, passKind: "node-points", geometry: null, geometryId: 0, sortKey: 0 };
        ctx.nodeLinkDrawItemPool[i] = item;
    }
    return item;
};

export const acquireLatticeSpaceDrawItem = (ctx: RendererContext): LatticeSpaceDrawItem => {
    const i = ctx.latticeSpaceDrawItemPoolUsed++;
    let item = ctx.latticeSpaceDrawItemPool[i];
    if (!item) { item = { space: null as unknown as LatticeSpace, pipeline: null as unknown as GPURenderPipeline, pipelineId: 0, spaceId: 0, sortKey: 0 }; ctx.latticeSpaceDrawItemPool[i] = item; }
    return item;
};

export const ensureCullingCapacity = (ctx: RendererContext, count: number): void => {
    if (count <= ctx.cullCapacity) return;
    let cap = Math.max(1, ctx.cullCapacity);
    while (cap < count) cap *= 2;
    ctx.cullCentersPtr = wasm.allocF32(cap * 3) as WasmPtr;
    ctx.cullRadiiPtr = wasm.allocF32(cap) as WasmPtr;
    ctx.cullCapacity = cap;
};

export const recordFrustumCounts = (ctx: RendererContext, tested: number, visible: number): void => {
    ctx.frameFrustumTested += tested;
    ctx.frameFrustumVisible += visible;
};

export const buildDrawLists = (ctx: RendererContext, scene: Scene, camera: Camera): void => {
    ctx.drawItemPoolUsed = 0;
    ctx.opaqueDrawList.length = 0;
    ctx.transparentDrawList.length = 0;
    const candidates = ctx.cullMeshScratch;
    candidates.length = 0;
    for (const mesh of scene.meshes) {
        if (mesh.destroyed) continue;
        if (!mesh.visible) continue;
        candidates.push(mesh);
    }
    const count = candidates.length;
    if (count === 0) return;
    let visibleIndicesBase = 0;
    let visibleCount = count;
    const store = TransformStore.global();
    const storeF32 = store.f32();
    const storeU32 = store.u32();
    const camWb = (camera.transform.worldMatrixPtr >>> 2);
    const camX = storeF32[camWb + 12];
    const camY = storeF32[camWb + 13];
    const camZ = storeF32[camWb + 14];
    if (ctx.frustumCullingEnabled) {
        ensureCullingCapacity(ctx, count);
        const worldPtrsPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
        const localCentersPtr = frameArena.allocF32(count * 3) as WasmPtr;
        const localRadiiPtr = frameArena.allocF32(count) as WasmPtr;
        const worldPtrs = storeU32.subarray(worldPtrsPtr >>> 2, (worldPtrsPtr >>> 2) + count);
        const localCenters = storeF32.subarray(localCentersPtr >>> 2, (localCentersPtr >>> 2) + count * 3);
        const localRadii = storeF32.subarray(localRadiiPtr >>> 2, (localRadiiPtr >>> 2) + count);
        for (let i = 0; i < count; i++) {
            const mesh = candidates[i];
            const bounds = getMeshLocalBoundsSource(mesh);
            const lc = bounds.boundsCenter;
            const centerBase = i * 3;
            worldPtrs[i] = mesh.transform.worldMatrixPtr >>> 0;
            localCenters[centerBase + 0] = lc[0];
            localCenters[centerBase + 1] = lc[1];
            localCenters[centerBase + 2] = lc[2];
            localRadii[i] = bounds.boundsRadius;
        }
        cullf.prepareWorldSpheresFromPtrs(ctx.cullCentersPtr, ctx.cullRadiiPtr, worldPtrsPtr, localCentersPtr, localRadiiPtr, count);
        const frustumPtr = frameArena.allocF32(24) as WasmPtr;
        frustumf.writePlanesFromViewProjection(frustumPtr, ctx.cameraUniformStagingPtr);
        const outPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
        visibleCount = cullf.spheresFrustum(outPtr, ctx.cullCentersPtr, ctx.cullRadiiPtr, count, frustumPtr);
        visibleIndicesBase = outPtr >>> 2;
    }
    recordFrustumCounts(ctx, count, visibleCount);
    const pushMesh = (mesh: Mesh): void => {
        const geometry = mesh.geometry;
        const material = mesh.material;
        const skinned = mesh.skin !== null && geometry.hasSkinAttributes && materialSupportsSkinning(ctx, material);
        const skinned8 = skinned && geometry.hasSkin8Attributes;
        const wb = mesh.transform.worldMatrixPtr >>> 2;
        const mirrored = isMirroredWorldMatrix(ctx, storeF32, wb);
        const opticalTransmission = isOpticallyTransmissiveMaterial(material);
        const forceNoDepthWrite = opticalTransmission && material.blendMode !== BlendMode.Opaque;
        const pipeline = getOrCreatePipeline(ctx, material, false, skinned, skinned8, mirrored, forceNoDepthWrite);
        const item = acquireDrawItem(ctx);
        item.mesh = mesh;
        item.geometry = geometry;
        item.material = material;
        item.pipeline = pipeline;
        item.pipelineId = getObjectId(ctx, pipeline);
        item.materialId = getObjectId(ctx, material);
        item.geometryId = getObjectId(ctx, geometry);
        item.vertexSourceId = getObjectId(ctx, getMeshVertexSource(mesh));
        item.skinned = skinned;
        item.skinned8 = skinned8;
        item.mirrored = mirrored;
        item.sortKey = 0;
        if (material.blendMode === BlendMode.Opaque && !opticalTransmission) ctx.opaqueDrawList.push(item);
        else {
            const dx = storeF32[wb + 12] - camX;
            const dy = storeF32[wb + 13] - camY;
            const dz = storeF32[wb + 14] - camZ;
            item.sortKey = dx * dx + dy * dy + dz * dz;
            ctx.transparentDrawList.push(item);
        }
    };
    if (!ctx.frustumCullingEnabled) for (let i = 0; i < count; i++) pushMesh(candidates[i]);
    else {
        const visBase = visibleIndicesBase;
        for (let k = 0; k < visibleCount; k++) pushMesh(candidates[storeU32[visBase + k]]);
    }
    ctx.opaqueDrawList.sort((a, b) => (a.pipelineId - b.pipelineId) || (a.materialId - b.materialId) || (a.vertexSourceId - b.vertexSourceId));
    ctx.transparentDrawList.sort((a, b) => (b.sortKey - a.sortKey) || (a.pipelineId - b.pipelineId) || (a.materialId - b.materialId) || (a.vertexSourceId - b.vertexSourceId));
};

export const buildPointCloudDrawLists = (ctx: RendererContext, scene: Scene): void => {
    ctx.pointCloudDrawItemPoolUsed = 0;
    ctx.opaquePointCloudDrawList.length = 0;
    ctx.transparentPointCloudDrawList.length = 0;
    ctx.transparentMergedDrawList.length = 0;
    ctx.cullPointCloudScratch.length = 0;
    for (const pc of scene.pointClouds) {
        if (!pc.visible) continue;
        if (pc.pointCount <= 0) continue;
        ctx.cullPointCloudScratch.push(pc);
    }
    if (ctx.cullPointCloudScratch.length === 0) return;
    const ts = TransformStore.global();
    const storeF32 = ts.f32();
    const storeU32 = ts.u32();
    const m = ctx.cameraUniformStagingView;
    const camX = m[16];
    const camY = m[17];
    const camZ = m[18];
    const visible: PointCloud[] = [];
    if (ctx.frustumCullingEnabled) {
        const bounded: PointCloud[] = [];
        const unbounded: PointCloud[] = [];
        for (const pc of ctx.cullPointCloudScratch) {
            if (pc.boundsRadius > 0) bounded.push(pc);
            else unbounded.push(pc);
        }
        if (bounded.length > 0) {
            ensureCullingCapacity(ctx, bounded.length);
            const bcount = bounded.length;
            const worldPtrsPtr = frameArena.alloc(bcount * 4, 4) as WasmPtr;
            const localCentersPtr = frameArena.allocF32(bcount * 3) as WasmPtr;
            const localRadiiPtr = frameArena.allocF32(bcount) as WasmPtr;
            const worldPtrs = storeU32.subarray(worldPtrsPtr >>> 2, (worldPtrsPtr >>> 2) + bcount);
            const localCenters = storeF32.subarray(localCentersPtr >>> 2, (localCentersPtr >>> 2) + bcount * 3);
            const localRadii = storeF32.subarray(localRadiiPtr >>> 2, (localRadiiPtr >>> 2) + bcount);
            for (let i = 0; i < bounded.length; i++) {
                const pc = bounded[i];
                const cx = pc.boundsCenter[0];
                const cy = pc.boundsCenter[1];
                const cz = pc.boundsCenter[2];
                const base = i * 3;
                worldPtrs[i] = pc.transform.worldMatrixPtr >>> 0;
                localCenters[base + 0] = cx;
                localCenters[base + 1] = cy;
                localCenters[base + 2] = cz;
                localRadii[i] = pc.boundsRadius;
            }
            cullf.prepareWorldSpheresFromPtrs(ctx.cullCentersPtr, ctx.cullRadiiPtr, worldPtrsPtr, localCentersPtr, localRadiiPtr, bcount);
            const frustumPtr = frameArena.allocF32(24) as WasmPtr;
            frustumf.writePlanesFromViewProjection(frustumPtr, ctx.cameraUniformStagingPtr);
            const outPtr = frameArena.alloc(bounded.length * 4, 4) as WasmPtr;
            const numVisible = cullf.spheresFrustum(outPtr, ctx.cullCentersPtr, ctx.cullRadiiPtr, bounded.length, frustumPtr);
            const outBase = outPtr >>> 2;
            for (let i = 0; i < numVisible; i++) visible.push(bounded[storeU32[outBase + i]]);
        }
        for (const pc of unbounded) visible.push(pc);
    } else for (const pc of ctx.cullPointCloudScratch) visible.push(pc);
    recordFrustumCounts(ctx, ctx.cullPointCloudScratch.length, visible.length);
    for (const pc of visible) {
        const pipeline = getOrCreatePointCloudPipeline(ctx, pc);
        const pipelineId = getObjectId(ctx, pipeline);
        const cloudId = getObjectId(ctx, pc);
        const item = acquirePointCloudDrawItem(ctx);
        item.cloud = pc;
        item.pipeline = pipeline;
        item.pipelineId = pipelineId;
        item.cloudId = cloudId;
        if (pc.blendMode === BlendMode.Opaque) {
            item.sortKey = 0;
            ctx.opaquePointCloudDrawList.push(item);
        } else {
            const worldBase = pc.transform.worldMatrixPtr >>> 2;
            const cx = pc.boundsCenter[0];
            const cy = pc.boundsCenter[1];
            const cz = pc.boundsCenter[2];
            const cwx = storeF32[worldBase + 0] * cx + storeF32[worldBase + 4] * cy + storeF32[worldBase + 8] * cz + storeF32[worldBase + 12];
            const cwy = storeF32[worldBase + 1] * cx + storeF32[worldBase + 5] * cy + storeF32[worldBase + 9] * cz + storeF32[worldBase + 13];
            const cwz = storeF32[worldBase + 2] * cx + storeF32[worldBase + 6] * cy + storeF32[worldBase + 10] * cz + storeF32[worldBase + 14];
            const dx = cwx - camX;
            const dy = cwy - camY;
            const dz = cwz - camZ;
            item.sortKey = dx * dx + dy * dy + dz * dz;
            ctx.transparentPointCloudDrawList.push(item);
        }
    }
    ctx.opaquePointCloudDrawList.sort((a, b) => a.pipelineId - b.pipelineId || a.cloudId - b.cloudId);
    ctx.transparentPointCloudDrawList.sort((a, b) => b.sortKey - a.sortKey || a.pipelineId - b.pipelineId || a.cloudId - b.cloudId);
};

export const buildSplatFieldDrawLists = (ctx: RendererContext, scene: Scene, camera: Camera): void => {
    const sceneFields = new Set(scene.splatFields);
    for (const [field, state] of ctx.splatFieldSortStates) {
        if (sceneFields.has(field)) continue;
        destroySplatFieldSortState(ctx, field, state);
        ctx.splatFieldSortStates.delete(field);
    }
    ctx.splatFieldDrawItemPoolUsed = 0;
    ctx.transparentSplatFieldDrawList.length = 0;
    ctx.cullSplatFieldScratch.length = 0;
    for (const field of scene.splatFields) {
        if (!field.visible) continue;
        if (field.splatCount <= 0) continue;
        ctx.cullSplatFieldScratch.push(field);
    }
    if (ctx.cullSplatFieldScratch.length === 0) return;
    const ts = TransformStore.global();
    const f32 = ts.f32();
    const camX = camera.position[0];
    const camY = camera.position[1];
    const camZ = camera.position[2];
    const visible: SplatField[] = [];
    if (ctx.frustumCullingEnabled) {
        const bounded: SplatField[] = [];
        const unbounded: SplatField[] = [];
        for (const field of ctx.cullSplatFieldScratch) {
            if (field.boundsRadius > 0) bounded.push(field);
            else unbounded.push(field);
        }
        if (bounded.length > 0) {
            ensureCullingCapacity(ctx, bounded.length);
            const bcount = bounded.length;
            const worldPtrsPtr = frameArena.alloc(bcount * 4, 4) as WasmPtr;
            const localCentersPtr = frameArena.allocF32(bcount * 3) as WasmPtr;
            const localRadiiPtr = frameArena.allocF32(bcount) as WasmPtr;
            const worldPtrs = ts.u32().subarray(worldPtrsPtr >>> 2, (worldPtrsPtr >>> 2) + bcount);
            const localCenters = ts.f32().subarray(localCentersPtr >>> 2, (localCentersPtr >>> 2) + bcount * 3);
            const localRadii = ts.f32().subarray(localRadiiPtr >>> 2, (localRadiiPtr >>> 2) + bcount);
            for (let i = 0; i < bounded.length; i++) {
                const field = bounded[i];
                const base = i * 3;
                worldPtrs[i] = field.transform.worldMatrixPtr >>> 0;
                localCenters[base + 0] = field.boundsCenter[0];
                localCenters[base + 1] = field.boundsCenter[1];
                localCenters[base + 2] = field.boundsCenter[2];
                localRadii[i] = field.boundsRadius;
            }
            cullf.prepareWorldSpheresFromPtrs(ctx.cullCentersPtr, ctx.cullRadiiPtr, worldPtrsPtr, localCentersPtr, localRadiiPtr, bcount);
            const planesPtr = frameArena.allocF32(24) as WasmPtr;
            frustumf.writePlanesFromViewProjection(planesPtr, ctx.cameraUniformStagingPtr);
            const outPtr = frameArena.alloc(bounded.length * 4, 4) as WasmPtr;
            const numVisible = cullf.spheresFrustum(outPtr, ctx.cullCentersPtr, ctx.cullRadiiPtr, bounded.length, planesPtr);
            const u32 = ts.u32();
            const outBase = outPtr >>> 2;
            for (let i = 0; i < numVisible; i++) visible.push(bounded[u32[outBase + i]]);
        }
        for (const field of unbounded) visible.push(field);
    } else for (const field of ctx.cullSplatFieldScratch) visible.push(field);
    recordFrustumCounts(ctx, ctx.cullSplatFieldScratch.length, visible.length);
    for (const field of visible) {
        const pipeline = getOrCreateSplatFieldPipeline(ctx);
        const item = acquireSplatFieldDrawItem(ctx);
        item.field = field;
        item.pipeline = pipeline;
        item.pipelineId = getObjectId(ctx, pipeline);
        item.fieldId = getObjectId(ctx, field);
        const worldBase = field.transform.worldMatrixPtr >>> 2;
        const cx = field.boundsCenter[0];
        const cy = field.boundsCenter[1];
        const cz = field.boundsCenter[2];
        const cwx = f32[worldBase + 0] * cx + f32[worldBase + 4] * cy + f32[worldBase + 8] * cz + f32[worldBase + 12];
        const cwy = f32[worldBase + 1] * cx + f32[worldBase + 5] * cy + f32[worldBase + 9] * cz + f32[worldBase + 13];
        const cwz = f32[worldBase + 2] * cx + f32[worldBase + 6] * cy + f32[worldBase + 10] * cz + f32[worldBase + 14];
        const dx = cwx - camX;
        const dy = cwy - camY;
        const dz = cwz - camZ;
        item.sortKey = dx * dx + dy * dy + dz * dz;
        ctx.transparentSplatFieldDrawList.push(item);
    }
    ctx.transparentSplatFieldDrawList.sort((a, b) => b.sortKey - a.sortKey || a.pipelineId - b.pipelineId || a.fieldId - b.fieldId);
};

export const buildGlyphFieldDrawLists = (ctx: RendererContext, scene: Scene, camera: Camera): void => {
    ctx.glyphFieldDrawItemPoolUsed = 0;
    ctx.opaqueGlyphFieldDrawList.length = 0;
    ctx.transparentGlyphFieldDrawList.length = 0;
    ctx.cullGlyphFieldScratch.length = 0;
    for (const gf of scene.glyphFields) {
        if (!gf.visible) continue;
        if (gf.instanceCount <= 0) continue;
        ctx.cullGlyphFieldScratch.push(gf);
    }
    if (ctx.cullGlyphFieldScratch.length === 0) return;
    const store = TransformStore.global();
    const f32 = store.f32();
    const camX = camera.position[0];
    const camY = camera.position[1];
    const camZ = camera.position[2];
    const visible: GlyphField[] = [];
    if (ctx.frustumCullingEnabled) {
        const bounded: GlyphField[] = [];
        const unbounded: GlyphField[] = [];
        for (const gf of ctx.cullGlyphFieldScratch) {
            if (gf.boundsRadius > 0) bounded.push(gf);
            else unbounded.push(gf);
        }
        if (bounded.length > 0) {
            ensureCullingCapacity(ctx, bounded.length);
            const bcount = bounded.length;
            const worldPtrsPtr = frameArena.alloc(bcount * 4, 4) as WasmPtr;
            const localCentersPtr = frameArena.allocF32(bcount * 3) as WasmPtr;
            const localRadiiPtr = frameArena.allocF32(bcount) as WasmPtr;
            const worldPtrs = store.u32().subarray(worldPtrsPtr >>> 2, (worldPtrsPtr >>> 2) + bcount);
            const localCenters = store.f32().subarray(localCentersPtr >>> 2, (localCentersPtr >>> 2) + bcount * 3);
            const localRadii = store.f32().subarray(localRadiiPtr >>> 2, (localRadiiPtr >>> 2) + bcount);
            for (let i = 0; i < bounded.length; i++) {
                const field = bounded[i];
                const cx = field.boundsCenter[0];
                const cy = field.boundsCenter[1];
                const cz = field.boundsCenter[2];
                const base = i * 3;
                worldPtrs[i] = field.transform.worldMatrixPtr >>> 0;
                localCenters[base + 0] = cx;
                localCenters[base + 1] = cy;
                localCenters[base + 2] = cz;
                localRadii[i] = field.boundsRadius;
            }
            cullf.prepareWorldSpheresFromPtrs(ctx.cullCentersPtr, ctx.cullRadiiPtr, worldPtrsPtr, localCentersPtr, localRadiiPtr, bcount);
            const planesPtr = frameArena.allocF32(24) as WasmPtr;
            frustumf.writePlanesFromViewProjection(planesPtr, ctx.cameraUniformStagingPtr);
            const outPtr = frameArena.alloc(bounded.length * 4, 4) as WasmPtr;
            const numVisible = cullf.spheresFrustum(outPtr, ctx.cullCentersPtr, ctx.cullRadiiPtr, bounded.length, planesPtr);
            const u32 = store.u32();
            const outBase = outPtr >>> 2;
            for (let i = 0; i < numVisible; i++) visible.push(bounded[u32[outBase + i]]);
        }
        for (const gf of unbounded) visible.push(gf);
    } else for (const gf of ctx.cullGlyphFieldScratch) visible.push(gf);
    recordFrustumCounts(ctx, ctx.cullGlyphFieldScratch.length, visible.length);
    for (const gf of visible) {
        const geometry = gf.geometry;
        const pipeline = getOrCreateGlyphFieldPipeline(ctx, gf);
        const item = acquireGlyphFieldDrawItem(ctx);
        item.field = gf;
        item.geometry = geometry;
        item.pipeline = pipeline;
        item.pipelineId = getObjectId(ctx, pipeline);
        item.geometryId = getObjectId(ctx, geometry);
        item.fieldId = getObjectId(ctx, gf);
        if (gf.blendMode === BlendMode.Opaque) {
            item.sortKey = 0;
            ctx.opaqueGlyphFieldDrawList.push(item);
        } else {
            const base = gf.transform.worldMatrixPtr >>> 2;
            const dx = f32[base + 12] - camX;
            const dy = f32[base + 13] - camY;
            const dz = f32[base + 14] - camZ;
            item.sortKey = dx * dx + dy * dy + dz * dz;
            ctx.transparentGlyphFieldDrawList.push(item);
        }
    }
    if (ctx.opaqueGlyphFieldDrawList.length > 0) {
        ctx.opaqueGlyphFieldDrawList.sort((a, b) => {
            const d0 = a.pipelineId - b.pipelineId;
            if (d0 !== 0) return d0;
            const d1 = a.geometryId - b.geometryId;
            if (d1 !== 0) return d1;
            return a.fieldId - b.fieldId;
        });
    }
    if (ctx.transparentGlyphFieldDrawList.length > 0) {
        ctx.transparentGlyphFieldDrawList.sort((a, b) => {
            const d0 = b.sortKey - a.sortKey;
            if (d0 !== 0) return d0;
            const d1 = a.pipelineId - b.pipelineId;
            if (d1 !== 0) return d1;
            const d2 = a.geometryId - b.geometryId;
            if (d2 !== 0) return d2;
            return a.fieldId - b.fieldId;
        });
    }
};

export const getNodeLinkNodeGeometry = (ctx: RendererContext, mode: NodeLink["nodeGeometryMode"]): Geometry => { if (mode === "cubes") { if (!ctx.nodeLinkCubeGeometry) ctx.nodeLinkCubeGeometry = Geometry.box(1, 1, 1); return ctx.nodeLinkCubeGeometry; } if (!ctx.nodeLinkSphereGeometry) ctx.nodeLinkSphereGeometry = Geometry.sphere(0.5, 16, 12); return ctx.nodeLinkSphereGeometry; };

export const getNodeLinkLinkGeometry = (ctx: RendererContext): Geometry => { if (!ctx.nodeLinkCylinderGeometry) ctx.nodeLinkCylinderGeometry = Geometry.cylinder(1, 1, 1, 14, 1, false); return ctx.nodeLinkCylinderGeometry; };

export const buildNodeLinkDrawLists = (ctx: RendererContext, scene: Scene, camera: Camera): void => {
    ctx.nodeLinkDrawItemPoolUsed = 0;
    ctx.opaqueNodeLinkDrawList.length = 0;
    ctx.transparentNodeLinkDrawList.length = 0;
    ctx.cullNodeLinkScratch.length = 0;
    for (const link of scene.nodeLinks) {
        if (!link.visible) continue;
        if (link.nodeCount <= 0 && link.edgeCount <= 0) continue;
        ctx.cullNodeLinkScratch.push(link);
    }
    if (ctx.cullNodeLinkScratch.length === 0) return;
    const ts = TransformStore.global();
    const f32 = ts.f32();
    const camX = camera.position[0];
    const camY = camera.position[1];
    const camZ = camera.position[2];
    const visible: NodeLink[] = [];
    if (ctx.frustumCullingEnabled) {
        const bounded: NodeLink[] = [];
        const unbounded: NodeLink[] = [];
        for (const link of ctx.cullNodeLinkScratch) {
            if (link.boundsRadius > 0) bounded.push(link);
            else unbounded.push(link);
        }
        if (bounded.length > 0) {
            ensureCullingCapacity(ctx, bounded.length);
            const bcount = bounded.length;
            const worldPtrsPtr = frameArena.alloc(bcount * 4, 4) as WasmPtr;
            const localCentersPtr = frameArena.allocF32(bcount * 3) as WasmPtr;
            const localRadiiPtr = frameArena.allocF32(bcount) as WasmPtr;
            const worldPtrs = ts.u32().subarray(worldPtrsPtr >>> 2, (worldPtrsPtr >>> 2) + bcount);
            const localCenters = ts.f32().subarray(localCentersPtr >>> 2, (localCentersPtr >>> 2) + bcount * 3);
            const localRadii = ts.f32().subarray(localRadiiPtr >>> 2, (localRadiiPtr >>> 2) + bcount);
            for (let i = 0; i < bounded.length; i++) {
                const link = bounded[i];
                worldPtrs[i] = link.transform.worldMatrixPtr >>> 0;
                localCenters[i * 3 + 0] = link.boundsCenter[0];
                localCenters[i * 3 + 1] = link.boundsCenter[1];
                localCenters[i * 3 + 2] = link.boundsCenter[2];
                localRadii[i] = link.boundsRadius;
            }
            cullf.prepareWorldSpheresFromPtrs(ctx.cullCentersPtr, ctx.cullRadiiPtr, worldPtrsPtr, localCentersPtr, localRadiiPtr, bcount);
            const planesPtr = frameArena.allocF32(24) as WasmPtr;
            frustumf.writePlanesFromViewProjection(planesPtr, ctx.cameraUniformStagingPtr);
            const outPtr = frameArena.alloc(bounded.length * 4, 4) as WasmPtr;
            const numVisible = cullf.spheresFrustum(outPtr, ctx.cullCentersPtr, ctx.cullRadiiPtr, bounded.length, planesPtr);
            const u32 = ts.u32();
            const outBase = outPtr >>> 2;
            for (let i = 0; i < numVisible; i++) visible.push(bounded[u32[outBase + i]]);
        }
        for (const link of unbounded) visible.push(link);
    } else for (const link of ctx.cullNodeLinkScratch) visible.push(link);
    recordFrustumCounts(ctx, ctx.cullNodeLinkScratch.length, visible.length);
    const pushItem = (link: NodeLink, passKind: NodeLinkDrawItem["passKind"], geometry: Geometry | null): void => {
        const pipeline = getOrCreateNodeLinkPipeline(ctx, link, passKind);
        const item = acquireNodeLinkDrawItem(ctx);
        item.link = link;
        item.pipeline = pipeline;
        item.pipelineId = getObjectId(ctx, pipeline);
        item.linkId = getObjectId(ctx, link);
        item.passKind = passKind;
        item.geometry = geometry;
        item.geometryId = geometry ? getObjectId(ctx, geometry) : 0;
        const worldBase = link.transform.worldMatrixPtr >>> 2;
        const cx = link.boundsCenter[0];
        const cy = link.boundsCenter[1];
        const cz = link.boundsCenter[2];
        const cwx = f32[worldBase + 0] * cx + f32[worldBase + 4] * cy + f32[worldBase + 8] * cz + f32[worldBase + 12];
        const cwy = f32[worldBase + 1] * cx + f32[worldBase + 5] * cy + f32[worldBase + 9] * cz + f32[worldBase + 13];
        const cwz = f32[worldBase + 2] * cx + f32[worldBase + 6] * cy + f32[worldBase + 10] * cz + f32[worldBase + 14];
        const dx = cwx - camX;
        const dy = cwy - camY;
        const dz = cwz - camZ;
        item.sortKey = dx * dx + dy * dy + dz * dz;
        if (link.blendMode === BlendMode.Opaque) ctx.opaqueNodeLinkDrawList.push(item);
        else ctx.transparentNodeLinkDrawList.push(item);
    };
    for (const link of visible) {
        if (link.nodeCount > 0) {
            if (link.nodeGeometryMode === "points") pushItem(link, "node-points", null);
            else pushItem(link, "node-solid", getNodeLinkNodeGeometry(ctx, link.nodeGeometryMode));
        }
        if (link.edgeCount > 0) {
            if (link.edgeGeometryMode === "lines") pushItem(link, "edge-lines", null);
            else pushItem(link, "edge-cylinders", getNodeLinkLinkGeometry(ctx));
        }
    }
    ctx.opaqueNodeLinkDrawList.sort((a, b) => a.pipelineId - b.pipelineId || a.geometryId - b.geometryId || a.linkId - b.linkId);
    ctx.transparentNodeLinkDrawList.sort((a, b) => b.sortKey - a.sortKey || a.pipelineId - b.pipelineId || a.geometryId - b.geometryId || a.linkId - b.linkId);
};

export const buildLatticeSpaceDrawLists = (ctx: RendererContext, scene: Scene, camera: Camera): void => {
    const sceneSpaces = new Set(scene.latticeSpaces);
    for (const [space, state] of ctx.latticeSpaceSortStates) {
        if (sceneSpaces.has(space)) continue;
        destroyLatticeSpaceSortState(ctx, space, state);
        ctx.latticeSpaceSortStates.delete(space);
    }
    ctx.latticeSpaceDrawItemPoolUsed = 0;
    ctx.opaqueLatticeSpaceDrawList.length = 0;
    ctx.transparentLatticeSpaceDrawList.length = 0;
    ctx.cullLatticeSpaceScratch.length = 0;
    for (const space of scene.latticeSpaces) if (space.visible && space.drawCellCount > 0 && (space.hasData || space.colorMode === "solid")) ctx.cullLatticeSpaceScratch.push(space);
    const visible: LatticeSpace[] = [];
    if (ctx.frustumCullingEnabled && ctx.cullLatticeSpaceScratch.length > 0) {
        const count = ctx.cullLatticeSpaceScratch.length;
        ensureCullingCapacity(ctx, count);
        const store = TransformStore.global();
        const worldPtrsPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
        const centersPtr = frameArena.allocF32(count * 3) as WasmPtr;
        const radiiPtr = frameArena.allocF32(count) as WasmPtr;
        const worldPtrs = store.u32().subarray(worldPtrsPtr >>> 2, (worldPtrsPtr >>> 2) + count);
        const centers = store.f32().subarray(centersPtr >>> 2, (centersPtr >>> 2) + count * 3);
        const radii = store.f32().subarray(radiiPtr >>> 2, (radiiPtr >>> 2) + count);
        for (let i = 0; i < count; i++) {
            const space = ctx.cullLatticeSpaceScratch[i];
            const bounds = space.getLocalBounds();
            worldPtrs[i] = space.transform.worldMatrixPtr >>> 0;
            centers[i * 3] = bounds.sphereCenter[0];
            centers[i * 3 + 1] = bounds.sphereCenter[1];
            centers[i * 3 + 2] = bounds.sphereCenter[2];
            radii[i] = bounds.sphereRadius;
        }
        cullf.prepareWorldSpheresFromPtrs(ctx.cullCentersPtr, ctx.cullRadiiPtr, worldPtrsPtr, centersPtr, radiiPtr, count);
        const planesPtr = frameArena.allocF32(24) as WasmPtr;
        frustumf.writePlanesFromViewProjection(planesPtr, ctx.cameraUniformStagingPtr);
        const outPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
        const visibleCount = cullf.spheresFrustum(outPtr, ctx.cullCentersPtr, ctx.cullRadiiPtr, count, planesPtr);
        const out = store.u32();
        for (let i = 0; i < visibleCount; i++) visible.push(ctx.cullLatticeSpaceScratch[out[(outPtr >>> 2) + i]]);
    } else visible.push(...ctx.cullLatticeSpaceScratch);
    recordFrustumCounts(ctx, ctx.cullLatticeSpaceScratch.length, visible.length);
    for (const space of visible) {
        const pipeline = getOrCreateLatticeSpacePipeline(ctx, space);
        const item = acquireLatticeSpaceDrawItem(ctx);
        item.space = space;
        item.pipeline = pipeline;
        item.pipelineId = getObjectId(ctx, pipeline);
        item.spaceId = getObjectId(ctx, space);
        const bounds = space.getWorldBounds();
        const dx = bounds.sphereCenter[0] - camera.position[0];
        const dy = bounds.sphereCenter[1] - camera.position[1];
        const dz = bounds.sphereCenter[2] - camera.position[2];
        item.sortKey = dx * dx + dy * dy + dz * dz;
        if (space.blendMode === BlendMode.Opaque) ctx.opaqueLatticeSpaceDrawList.push(item); else ctx.transparentLatticeSpaceDrawList.push(item);
    }
    ctx.opaqueLatticeSpaceDrawList.sort((a, b) => a.pipelineId - b.pipelineId || a.spaceId - b.spaceId);
    ctx.transparentLatticeSpaceDrawList.sort((a, b) => b.sortKey - a.sortKey || a.pipelineId - b.pipelineId || a.spaceId - b.spaceId);
};

export const executeTransparentMergedDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder): void => {
    ctx.transparentMergedDrawList.length = 0;
    for (const item of ctx.transparentDrawList) ctx.transparentMergedDrawList.push(item);
    for (const item of ctx.transparentGlyphFieldDrawList) ctx.transparentMergedDrawList.push(item);
    for (const item of ctx.transparentPointCloudDrawList) ctx.transparentMergedDrawList.push(item);
    for (const item of ctx.transparentNodeLinkDrawList) ctx.transparentMergedDrawList.push(item);
    for (const item of ctx.transparentSplatFieldDrawList) ctx.transparentMergedDrawList.push(item);
    for (const item of ctx.transparentLatticeSpaceDrawList) ctx.transparentMergedDrawList.push(item);
    if (ctx.transparentMergedDrawList.length === 0) return;
    const typeOrder = (x: TransparentDrawItem): number => {
        if ("mesh" in x) return 0;
        if ("field" in x && "geometry" in x) return 1;
        if ("cloud" in x) return 2;
        if ("link" in x) return 3;
        if ("space" in x) return 4;
        return 5;
    };
    ctx.transparentMergedDrawList.sort((a, b) => {
        const d0 = b.sortKey - a.sortKey;
        if (d0 !== 0) return d0;
        const d1 = a.pipelineId - b.pipelineId;
        if (d1 !== 0) return d1;
        const aIsMesh = "mesh" in a;
        const bIsMesh = "mesh" in b;
        if (aIsMesh && bIsMesh) {
            const am = a as DrawItem;
            const bm = b as DrawItem;
            return (
                (am.materialId - bm.materialId) ||
                (am.geometryId - bm.geometryId) ||
                (am.vertexSourceId - bm.vertexSourceId) ||
                ((am.skinned ? 1 : 0) - (bm.skinned ? 1 : 0)) ||
                ((am.skinned8 ? 1 : 0) - (bm.skinned8 ? 1 : 0))
            );
        }
        const aIsCloud = "cloud" in a;
        const bIsCloud = "cloud" in b;
        if (aIsCloud && bIsCloud) {
            const ap = a as PointCloudDrawItem;
            const bp = b as PointCloudDrawItem;
            return ap.cloudId - bp.cloudId;
        }
        const aIsGlyph = "field" in a && "geometry" in a;
        const bIsGlyph = "field" in b && "geometry" in b;
        if (aIsGlyph && bIsGlyph) {
            const ag = a as GlyphFieldDrawItem;
            const bg = b as GlyphFieldDrawItem;
            return (ag.geometryId - bg.geometryId) || (ag.fieldId - bg.fieldId);
        }
        const aIsNodeLink = "link" in a;
        const bIsNodeLink = "link" in b;
        if (aIsNodeLink && bIsNodeLink) {
            const an = a as NodeLinkDrawItem;
            const bn = b as NodeLinkDrawItem;
            return (an.geometryId - bn.geometryId) || (an.linkId - bn.linkId);
        }
        const aIsSplat = "field" in a && !("geometry" in a);
        const bIsSplat = "field" in b && !("geometry" in b);
        if (aIsSplat && bIsSplat) {
            const as = a as SplatFieldDrawItem;
            const bs = b as SplatFieldDrawItem;
            return as.fieldId - bs.fieldId;
        }
        const aIsLattice = "space" in a;
        const bIsLattice = "space" in b;
        if (aIsLattice && bIsLattice) return (a as LatticeSpaceDrawItem).spaceId - (b as LatticeSpaceDrawItem).spaceId;
        return typeOrder(a) - typeOrder(b);
    });
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastMaterial: Material | null = null;
    let lastGeometry: Geometry | null = null;
    let lastVertexSourceId = -1;
    let lastSkinned: boolean = false;
    let lastSkinned8: boolean = false;
    let lastCloud: PointCloud | null = null;
    let lastSplatField: SplatField | null = null;
    let lastGlyph: GlyphField | null = null;
    let lastNodeLink: NodeLink | null = null;
    let lastLatticeSpace: LatticeSpace | null = null;
    for (let i = 0; i < ctx.transparentMergedDrawList.length; i++) {
        const item = ctx.transparentMergedDrawList[i];
        if ("space" in item) {
            const drawItem = item as LatticeSpaceDrawItem;
            const space = drawItem.space;
            if (!space.visible || space.drawCellCount <= 0) continue;
            ensureLatticeSpaceBindGroup(ctx, space);
            if (!space.bindGroup) continue;
            if (drawItem.pipeline !== lastPipeline) {
                pass.setPipeline(drawItem.pipeline);
                lastPipeline = drawItem.pipeline;
                lastLatticeSpace = null;
                lastMaterial = null;
                lastGeometry = null;
                lastCloud = null;
                lastSplatField = null;
                lastGlyph = null;
                lastNodeLink = null;
            }
            if (space !== lastLatticeSpace) {
                pass.setBindGroup(1, space.bindGroup);
                lastLatticeSpace = space;
            }
            if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
            const slot = ctx.modelBufferIndex++;
            const modelPtr = space.transform.worldMatrixPtr as WasmPtr;
            const invPtr = ctx.modelUniformStagingPtr;
            const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4f.invert(invPtr, modelPtr);
            mat4f.transpose(normalPtr, invPtr);
            ctx.queue.writeBuffer(ctx.modelUniformBuffers[slot], 0, bytes, modelPtr, 64);
            ctx.queue.writeBuffer(ctx.modelUniformBuffers[slot], 64, bytes, normalPtr, 64);
            pass.setBindGroup(0, ctx.globalBindGroups[slot]);
            if (space.dimensionCount === 2) pass.draw(6);
            else pass.draw(36, space.drawCellCount);
            continue;
        }
        if ("mesh" in item) {
            const drawItem = item as DrawItem;
            const mesh = drawItem.mesh;
            const geometry = drawItem.geometry;
            const material = drawItem.material;
            if (drawItem.pipeline !== lastPipeline) {
                pass.setPipeline(drawItem.pipeline);
                lastPipeline = drawItem.pipeline;
                lastMaterial = null;
                lastGeometry = null;
                lastVertexSourceId = -1;
                lastSkinned = false;
                lastSkinned8 = false;
                lastCloud = null;
                lastSplatField = null;
                lastGlyph = null;
                lastNodeLink = null;
            }
            if (geometry !== lastGeometry) geometry.upload(ctx.device);
            if (material !== lastMaterial) ensureMaterialBindGroup(ctx, material);
            if (material !== lastMaterial) { pass.setBindGroup(1, material.bindGroup!); lastMaterial = material; }
            if (geometry !== lastGeometry || drawItem.vertexSourceId !== lastVertexSourceId || drawItem.skinned !== lastSkinned || drawItem.skinned8 !== lastSkinned8) {
                const buffers = getMeshVertexBuffers(mesh, ctx.device, ctx.queue);
                pass.setVertexBuffer(0, buffers.positionBuffer);
                pass.setVertexBuffer(1, buffers.normalBuffer);
                pass.setVertexBuffer(2, geometry.uvBuffer);
                pass.setVertexBuffer(3, geometry.uv1Buffer);
                const standardMaterial = material instanceof StandardMaterial;
                if (standardMaterial) pass.setVertexBuffer(4, geometry.tangentBuffer);
                if (drawItem.skinned) {
                    if (standardMaterial) pass.setVertexBuffer(5, geometry.skinInfluenceBuffer!);
                    else {
                        pass.setVertexBuffer(4, geometry.jointsBuffer!);
                        pass.setVertexBuffer(5, geometry.weightsBuffer!);
                        if (drawItem.skinned8) {
                            pass.setVertexBuffer(6, geometry.joints1Buffer!);
                            pass.setVertexBuffer(7, geometry.weights1Buffer!);
                        }
                    }
                }
                if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                lastGeometry = geometry;
                lastVertexSourceId = drawItem.vertexSourceId;
                lastSkinned = drawItem.skinned;
                lastSkinned8 = drawItem.skinned8;
            }
            if (drawItem.skinned) {
                const skin = mesh.skin;
                if (skin) {
                    skin.ensureGpuResources(ctx.device, ctx.skinBindGroupLayout);
                    const jointCount = skin.jointCount | 0;
                    const jointMatPtr = frameArena.allocF32(jointCount * 16) as WasmPtr;
                    animf.computeJointMatricesTo(jointMatPtr, skin.skin.jointIndicesPtr, jointCount, skin.skin.invBindPtr, TransformStore.global().worldPtr as WasmPtr, skin.bindMatrixPtr);
                    ctx.queue.writeBuffer(skin.boneBuffer!, 0, bytes, jointMatPtr, jointCount * 64);
                    pass.setBindGroup(2, skin.bindGroup!);
                }
            }
            if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
            const modelSlot = ctx.modelBufferIndex++;
            const modelBuffer = ctx.modelUniformBuffers[modelSlot];
            const globalBindGroup = ctx.globalBindGroups[modelSlot];
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
            continue;
        }
        if ("field" in item && "geometry" in item) {
            const drawItem = item as GlyphFieldDrawItem;
            const field = drawItem.field;
            const geometry = drawItem.geometry;
            if (!field.visible) continue;
            if (field.instanceCount <= 0) continue;
            ensureGlyphFieldBindGroup(ctx, field);
            if (!field.bindGroup) continue;
            if (drawItem.pipeline !== lastPipeline) {
                pass.setPipeline(drawItem.pipeline);
                lastPipeline = drawItem.pipeline;
                lastMaterial = null;
                lastGeometry = null;
                lastVertexSourceId = -1;
                lastSkinned = false;
                lastSkinned8 = false;
                lastCloud = null;
                lastSplatField = null;
                lastGlyph = null;
                lastNodeLink = null;
            }
            if (geometry !== lastGeometry) {
                geometry.upload(ctx.device);
                pass.setVertexBuffer(0, geometry.positionBuffer);
                pass.setVertexBuffer(1, geometry.normalBuffer);
                if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                lastGeometry = geometry;
            }
            if (field !== lastGlyph) {
                pass.setBindGroup(1, field.bindGroup);
                lastGlyph = field;
                lastCloud = null;
                lastSplatField = null;
                lastMaterial = null;
                lastNodeLink = null;
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
            continue;
        }
        if ("cloud" in item) {
            const drawItem = item as PointCloudDrawItem;
            const cloud = drawItem.cloud;
            if (!cloud.visible) continue;
            if (cloud.pointCount <= 0) continue;
            ensurePointCloudBindGroup(ctx, cloud);
            if (!cloud.bindGroup) continue;
            if (drawItem.pipeline !== lastPipeline) {
                pass.setPipeline(drawItem.pipeline);
                lastPipeline = drawItem.pipeline;
                lastMaterial = null;
                lastGeometry = null;
                lastVertexSourceId = -1;
                lastSkinned = false;
                lastSkinned8 = false;
                lastCloud = null;
                lastSplatField = null;
                lastGlyph = null;
                lastNodeLink = null;
            }
            if (cloud !== lastCloud) {
                pass.setBindGroup(1, cloud.bindGroup);
                lastCloud = cloud;
                lastSplatField = null;
                lastGlyph = null;
                lastMaterial = null;
                lastNodeLink = null;
            }
            if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
            const modelSlot = ctx.modelBufferIndex++;
            const modelBuffer = ctx.modelUniformBuffers[modelSlot];
            const globalBindGroup = ctx.globalBindGroups[modelSlot];
            const modelPtr = cloud.transform.worldMatrixPtr as WasmPtr;
            const invPtr = ctx.modelUniformStagingPtr;
            const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4f.invert(invPtr, modelPtr);
            mat4f.transpose(normalPtr, invPtr);
            ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
            ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
            pass.setBindGroup(0, globalBindGroup);
            pass.draw(6, cloud.pointCount);
            continue;
        }
        if ("field" in item && !("geometry" in item)) {
            const drawItem = item as SplatFieldDrawItem;
            const field = drawItem.field;
            if (!field.visible) continue;
            if (field.splatCount <= 0) continue;
            ensureSplatFieldBindGroup(ctx, field);
            if (!field.bindGroup) continue;
            if (drawItem.pipeline !== lastPipeline) {
                pass.setPipeline(drawItem.pipeline);
                lastPipeline = drawItem.pipeline;
                lastMaterial = null;
                lastGeometry = null;
                lastVertexSourceId = -1;
                lastSkinned = false;
                lastSkinned8 = false;
                lastCloud = null;
                lastSplatField = null;
                lastGlyph = null;
                lastNodeLink = null;
            }
            if (field !== lastSplatField) {
                pass.setBindGroup(1, field.bindGroup);
                lastSplatField = field;
                lastCloud = null;
                lastGlyph = null;
                lastMaterial = null;
                lastNodeLink = null;
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
            pass.draw(6, field.splatCount);
            continue;
        }
        if ("link" in item) {
            const drawItem = item as NodeLinkDrawItem;
            const link = drawItem.link;
            ensureNodeLinkBindGroup(ctx, link);
            if (!link.bindGroup) continue;
            if (drawItem.pipeline !== lastPipeline) {
                pass.setPipeline(drawItem.pipeline);
                lastPipeline = drawItem.pipeline;
                lastMaterial = null;
                lastGeometry = null;
                lastVertexSourceId = -1;
                lastSkinned = false;
                lastSkinned8 = false;
                lastCloud = null;
                lastSplatField = null;
                lastGlyph = null;
                lastNodeLink = null;
            }
            if (drawItem.geometry && drawItem.geometry !== lastGeometry) {
                drawItem.geometry.upload(ctx.device);
                pass.setVertexBuffer(0, drawItem.geometry.positionBuffer);
                pass.setVertexBuffer(1, drawItem.geometry.normalBuffer);
                if (drawItem.geometry.isIndexed) pass.setIndexBuffer(drawItem.geometry.indexBuffer!, "uint32");
                lastGeometry = drawItem.geometry;
            }
            if (link !== lastNodeLink) {
                pass.setBindGroup(1, link.bindGroup);
                lastNodeLink = link;
                lastCloud = null;
                lastSplatField = null;
                lastGlyph = null;
                lastMaterial = null;
            }
            if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
            const modelSlot = ctx.modelBufferIndex++;
            const modelBuffer = ctx.modelUniformBuffers[modelSlot];
            const globalBindGroup = ctx.globalBindGroups[modelSlot];
            const modelPtr = link.transform.worldMatrixPtr as WasmPtr;
            const invPtr = ctx.modelUniformStagingPtr;
            const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4f.invert(invPtr, modelPtr);
            mat4f.transpose(normalPtr, invPtr);
            ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
            ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
            pass.setBindGroup(0, globalBindGroup);
            if (drawItem.passKind === "node-points") {
                pass.draw(6, link.nodeCount);
            } else if (drawItem.passKind === "edge-lines") {
                pass.draw(2, link.edgeCount);
            } else if (drawItem.passKind === "node-solid") {
                if (!drawItem.geometry) continue;
                if (drawItem.geometry.isIndexed) pass.drawIndexed(drawItem.geometry.indexCount, link.nodeCount);
                else pass.draw(drawItem.geometry.vertexCount, link.nodeCount);
            } else {
                if (!drawItem.geometry) continue;
                if (drawItem.geometry.isIndexed) pass.drawIndexed(drawItem.geometry.indexCount, link.edgeCount);
                else pass.draw(drawItem.geometry.vertexCount, link.edgeCount);
            }
            continue;
        }
    }
};

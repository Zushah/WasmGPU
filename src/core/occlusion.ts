/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, createDepthTexture } from "../utils";
import { Mesh, getMeshLocalBoundsSource, getMeshVertexBuffers, getMeshVertexSource, hasMeshMorphRuntime } from "../world/mesh";
import { PointCloud } from "../world/pointcloud";
import { GlyphField } from "../world/glyphfield";
import { NodeLink } from "../world/nodelink";
import { LatticeSpace } from "../world/latticespace";
import { Geometry } from "../graphics/geometry";
import { BlendMode, CullMode, CustomMaterial, DataMaterial, Material, StandardMaterial, UnlitMaterial } from "../graphics/material";
import { cullf, frameArena, wasm } from "../wasm";
import type { WasmPtr } from "../wasm";
import occlusionMeshWGSL from "../wgsl/core/occlusion-mesh.wgsl";
import occlusionReduceWGSL from "../wgsl/core/occlusion-reduce.wgsl";
import occlusionPointCloudWGSL from "../wgsl/world/occlusion-pointcloud.wgsl";
import occlusionGlyphFieldWGSL from "../wgsl/world/occlusion-glyphfield.wgsl";
import occlusionNodeLinkWGSL from "../wgsl/world/occlusion-nodelink.wgsl";
import occlusionLatticeSpaceWGSL from "../wgsl/world/occlusion-latticespace.wgsl";
import type { Camera } from "../world/camera";
import type { RendererContext } from "./context";
import type { DrawItem, GlyphFieldDrawItem, LatticeSpaceDrawItem, NodeLinkDrawItem, OcclusionCandidate, OcclusionFrameState, OcclusionHierarchyLayout, OcclusionHierarchyMetadata, OcclusionReadbackSlot, PointCloudDrawItem } from "./types";
import { ensureCullingCapacity } from "./drawlists";
import { getCullMode } from "./materials";
import { ensureGlyphFieldBindGroup, ensureLatticeSpaceBindGroup, ensureNodeLinkBindGroup, ensurePointCloudBindGroup, getGlyphFieldBindGroupLayout, getLatticeSpaceBindGroupLayout, getNodeLinkBindGroupLayout, getPointCloudBindGroupLayout } from "./objects";
import { getObjectId, writeModelUniformSlot } from "./resources";
import { isOpticallyTransmissiveMaterial } from "./transmission";

const occlusionHashScratch = new ArrayBuffer(4);

const occlusionHashF32 = new Float32Array(occlusionHashScratch);

const occlusionHashU32 = new Uint32Array(occlusionHashScratch);

const mixOcclusionHash = (hash: number, value: number): number => Math.imul((hash ^ (value >>> 0)) >>> 0, 16777619) >>> 0;

const blendModeHash = (mode: BlendMode): number => mode === BlendMode.Opaque ? 1 : mode === BlendMode.Transparent ? 2 : 3;

const cullModeHash = (mode: CullMode): number => mode === CullMode.Back ? 1 : mode === CullMode.Front ? 2 : 3;

const mixOcclusionHashF32 = (hash: number, value: number): number => { occlusionHashF32[0] = Number.isFinite(value) ? value : 0; return mixOcclusionHash(hash, occlusionHashU32[0] >>> 0); };

const hashWorldMatrix = (ptr: WasmPtr): number => { const m = wasm.f32view(ptr, 16); let hash = 2166136261 >>> 0; for (let i = 0; i < 16; i++) hash = mixOcclusionHashF32(hash, m[i]); return hash >>> 0; };

const createOcclusionHierarchyLayout = (_ctx: RendererContext, width: number, height: number): OcclusionHierarchyLayout => {
    const widths: number[] = [], heights: number[] = [];
    let w = Math.max(1, width | 0), h = Math.max(1, height | 0);
    while (true) {
        widths.push(w); heights.push(h);
        if (w === 1 && h === 1) break;
        w = Math.max(1, Math.floor(w / 2)); h = Math.max(1, Math.floor(h / 2));
    }
    const mipCount = widths.length;
    const offsets = new Uint32Array(mipCount);
    const copyOffsets = new Uint32Array(mipCount);
    const rowBytes = new Uint32Array(mipCount);
    let texelOffset = 0;
    let byteOffset = 0;
    for (let i = 0; i < mipCount; i++) {
        offsets[i] = texelOffset >>> 0;
        copyOffsets[i] = byteOffset >>> 0;
        rowBytes[i] = alignTo(widths[i] * 4, 256) >>> 0;
        texelOffset += widths[i] * heights[i];
        byteOffset += rowBytes[i] * heights[i];
    }
    return { widths: Uint32Array.from(widths), heights: Uint32Array.from(heights), offsets, copyOffsets, rowBytes, mipCount, texelCount: texelOffset >>> 0, totalBytes: byteOffset >>> 0 };
};

export const destroyOcclusionTextures = (ctx: RendererContext): void => {
    ctx.occlusionHierarchyTexture?.destroy();
    ctx.occlusionDepthTexture?.destroy();
    ctx.occlusionHierarchyTexture = null;
    ctx.occlusionHierarchyMipViews = [];
    ctx.occlusionDepthTexture = null;
    ctx.occlusionDepthView = null;
    ctx.occlusionHierarchyLayout = null;
    ctx.occlusionWidth = 0;
    ctx.occlusionHeight = 0;
    ctx.occlusionReduceBindGroups.clear();
};

export const invalidateOcclusionResources = (ctx: RendererContext): void => {
    destroyOcclusionTextures(ctx);
    ctx.latestOcclusionHierarchy = null;
    ctx.latestOcclusionHierarchySerial = 0;
    ctx.pendingOcclusionFrameState = null;
    for (const slot of ctx.occlusionReadbackSlots) {
        slot.metadata = null;
        slot.data = null;
        if (slot.state === "ready") slot.state = "idle";
    }
};

export const ensureOcclusionResources = (ctx: RendererContext): void => {
    if (!ctx.occlusionCullingEnabled) return;
    let targetW = ctx.width;
    let targetH = ctx.height;
    if (targetW >= targetH) {
        const scale = Math.min(1, ctx.OCCLUSION_MAX_LONG_EDGE / Math.max(1, targetW));
        targetW = Math.max(1, Math.floor(targetW * scale));
        targetH = Math.max(1, Math.floor(targetH * scale));
    } else {
        const scale = Math.min(1, ctx.OCCLUSION_MAX_LONG_EDGE / Math.max(1, targetH));
        targetW = Math.max(1, Math.floor(targetW * scale));
        targetH = Math.max(1, Math.floor(targetH * scale));
    }
    const layout = createOcclusionHierarchyLayout(ctx, targetW, targetH);
    if (ctx.occlusionHierarchyTexture && ctx.occlusionDepthTexture && ctx.occlusionWidth === targetW && ctx.occlusionHeight === targetH && ctx.occlusionHierarchyLayout?.mipCount === layout.mipCount) return;
    destroyOcclusionTextures(ctx);
    ctx.occlusionWidth = targetW;
    ctx.occlusionHeight = targetH;
    ctx.occlusionHierarchyLayout = layout;
    ctx.occlusionHierarchyTexture = ctx.device.createTexture({
        size: { width: targetW, height: targetH, depthOrArrayLayers: 1 },
        format: "r32float",
        mipLevelCount: layout.mipCount,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
    });
    ctx.occlusionHierarchyMipViews = [];
    for (let i = 0; i < layout.mipCount; i++) {
        ctx.occlusionHierarchyMipViews.push(ctx.occlusionHierarchyTexture.createView({
            dimension: "2d",
            baseMipLevel: i,
            mipLevelCount: 1
        }));
    }
    ctx.occlusionDepthTexture = createDepthTexture(ctx.device, targetW, targetH);
    ctx.occlusionDepthView = ctx.occlusionDepthTexture.createView();
    while (ctx.occlusionReadbackSlots.length < ctx.OCCLUSION_READBACK_RING_SIZE) {
        ctx.occlusionReadbackSlots.push({
            buffer: null, capacityBytes: 0,
            pending: null, state: "idle",
            metadata: null, data: null, serial: 0
        });
    }
};

const ensureOcclusionReadbackBuffer = (ctx: RendererContext, slot: OcclusionReadbackSlot, bytes: number): void => {
    if (slot.buffer && slot.capacityBytes >= bytes) return;
    slot.buffer?.destroy();
    slot.buffer = ctx.device.createBuffer({
        size: Math.max(256, alignTo(bytes, 256)),
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    slot.capacityBytes = Math.max(256, alignTo(bytes, 256));
};

const getIdleOcclusionReadbackSlot = (ctx: RendererContext): OcclusionReadbackSlot | null => {
    for (const slot of ctx.occlusionReadbackSlots) if (!slot.pending && slot.state !== "mapping") return slot;
    return null;
};

export const buildOcclusionFrameState = (ctx: RendererContext): OcclusionFrameState | null => {
    let signature = 2166136261 >>> 0;
    const candidates = ctx.occlusionCandidateScratch;
    candidates.length = 0;
    const meshOccluders: DrawItem[] = [];
    const pointCloudOccluders: PointCloudDrawItem[] = [];
    const glyphOccluders: GlyphFieldDrawItem[] = [];
    const nodeLinkOccluders: NodeLinkDrawItem[] = [];
    const latticeSpaceOccluders: LatticeSpaceDrawItem[] = [];
    const candidateSeen = ctx.occlusionVisibleObjectIds;
    candidateSeen.clear();
    for (const item of ctx.opaqueDrawList) {
        if (isSafeMeshOccluder(ctx, item)) {
            meshOccluders.push(item);
            signature = mixOcclusionHash(signature, 1);
            signature = mixOcclusionHash(signature, getObjectId(ctx, item.mesh));
            signature = mixOcclusionHash(signature, getMeshOccluderToken(ctx, item));
        }
        if (!candidateSeen.has(getObjectId(ctx, item.mesh)) && tryPushMeshOcclusionCandidate(ctx, item, candidates)) candidateSeen.add(getObjectId(ctx, item.mesh));
    }
    for (const item of ctx.opaquePointCloudDrawList) {
        if (isSafePointCloudOccluder(item)) {
            pointCloudOccluders.push(item);
            signature = mixOcclusionHash(signature, 2);
            signature = mixOcclusionHash(signature, getObjectId(ctx, item.cloud));
            signature = mixOcclusionHash(signature, item.cloud.occluderRevision >>> 0);
            signature = mixOcclusionHash(signature, hashWorldMatrix(item.cloud.transform.worldMatrixPtr as WasmPtr));
        }
        if (!candidateSeen.has(getObjectId(ctx, item.cloud)) && tryPushPointCloudOcclusionCandidate(ctx, item.cloud, candidates)) candidateSeen.add(getObjectId(ctx, item.cloud));
    }
    for (const item of ctx.opaqueGlyphFieldDrawList) {
        if (isSafeGlyphOccluder(item)) {
            glyphOccluders.push(item);
            signature = mixOcclusionHash(signature, 3);
            signature = mixOcclusionHash(signature, getObjectId(ctx, item.field));
            signature = mixOcclusionHash(signature, item.field.occluderRevision >>> 0);
            signature = mixOcclusionHash(signature, hashWorldMatrix(item.field.transform.worldMatrixPtr as WasmPtr));
            signature = mixOcclusionHash(signature, getObjectId(ctx, item.geometry));
        }
        if (!candidateSeen.has(getObjectId(ctx, item.field)) && tryPushGlyphOcclusionCandidate(ctx, item.field, candidates)) candidateSeen.add(getObjectId(ctx, item.field));
    }
    for (const item of ctx.opaqueNodeLinkDrawList) {
        if (isSafeNodeLinkOccluder(item)) {
            nodeLinkOccluders.push(item);
            signature = mixOcclusionHash(signature, 4);
            signature = mixOcclusionHash(signature, getObjectId(ctx, item.link));
            signature = mixOcclusionHash(signature, item.link.occluderRevision >>> 0);
            signature = mixOcclusionHash(signature, hashWorldMatrix(item.link.transform.worldMatrixPtr as WasmPtr));
            signature = mixOcclusionHash(signature, item.passKind === "node-points" ? 1 : item.passKind === "node-solid" ? 2 : item.passKind === "edge-lines" ? 3 : 4);
        }
        if (!candidateSeen.has(getObjectId(ctx, item.link)) && tryPushNodeLinkOcclusionCandidate(ctx, item.link, candidates)) candidateSeen.add(getObjectId(ctx, item.link));
    }
    for (const item of ctx.opaqueLatticeSpaceDrawList) {
        if (isSafeLatticeSpaceOccluder(item)) {
            latticeSpaceOccluders.push(item);
            signature = mixOcclusionHash(signature, 5);
            signature = mixOcclusionHash(signature, getObjectId(ctx, item.space));
            signature = mixOcclusionHash(signature, item.space.occluderRevision);
            signature = mixOcclusionHash(signature, hashWorldMatrix(item.space.transform.worldMatrixPtr as WasmPtr));
        }
        if (!candidateSeen.has(getObjectId(ctx, item.space)) && tryPushLatticeSpaceOcclusionCandidate(ctx, item.space, candidates)) candidateSeen.add(getObjectId(ctx, item.space));
    }
    candidateSeen.clear();
    return { signature: signature >>> 0, candidates, meshOccluders, pointCloudOccluders, glyphOccluders, nodeLinkOccluders, latticeSpaceOccluders };
};

const tryPushMeshOcclusionCandidate = (ctx: RendererContext, item: DrawItem, out: OcclusionCandidate[]): boolean => {
    const mesh = item.mesh;
    if (item.skinned) return false;
    const bounds = getMeshLocalBoundsSource(mesh);
    if (!(bounds.boundsRadius > 0) || !Number.isFinite(bounds.boundsRadius)) return false;
    const center = bounds.boundsCenter;
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(center[2])) return false;
    out.push({
        kind: "mesh",
        object: mesh, objectId: getObjectId(ctx, mesh),
        worldMatrixPtr: mesh.transform.worldMatrixPtr as WasmPtr,
        boundsCenter: [center[0], center[1], center[2]], boundsRadius: bounds.boundsRadius
    });
    return true;
};

const tryPushPointCloudOcclusionCandidate = (ctx: RendererContext, cloud: PointCloud, out: OcclusionCandidate[]): boolean => {
    if (!(cloud.boundsRadius > 0) || !Number.isFinite(cloud.boundsRadius)) return false;
    const center = cloud.boundsCenter;
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(center[2])) return false;
    out.push({
        kind: "pointcloud",
        object: cloud, objectId: getObjectId(ctx, cloud),
        worldMatrixPtr: cloud.transform.worldMatrixPtr as WasmPtr,
        boundsCenter: [center[0], center[1], center[2]], boundsRadius: cloud.boundsRadius
    });
    return true;
};

const tryPushGlyphOcclusionCandidate = (ctx: RendererContext, field: GlyphField, out: OcclusionCandidate[]): boolean => {
    if (!(field.boundsRadius > 0) || !Number.isFinite(field.boundsRadius)) return false;
    const center = field.boundsCenter;
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(center[2])) return false;
    out.push({
        kind: "glyphfield",
        object: field, objectId: getObjectId(ctx, field),
        worldMatrixPtr: field.transform.worldMatrixPtr as WasmPtr,
        boundsCenter: [center[0], center[1], center[2]], boundsRadius: field.boundsRadius
    });
    return true;
};

const tryPushNodeLinkOcclusionCandidate = (ctx: RendererContext, link: NodeLink, out: OcclusionCandidate[]): boolean => {
    if (!(link.boundsRadius > 0) || !Number.isFinite(link.boundsRadius)) return false;
    const center = link.boundsCenter;
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(center[2])) return false;
    out.push({
        kind: "nodelink",
        object: link, objectId: getObjectId(ctx, link),
        worldMatrixPtr: link.transform.worldMatrixPtr as WasmPtr,
        boundsCenter: [center[0], center[1], center[2]], boundsRadius: link.boundsRadius
    });
    return true;
};

const tryPushLatticeSpaceOcclusionCandidate = (ctx: RendererContext, space: LatticeSpace, out: OcclusionCandidate[]): boolean => {
    const bounds = space.getLocalBounds();
    if (!(bounds.sphereRadius > 0) || !Number.isFinite(bounds.sphereRadius)) return false;
    out.push({
        kind: "latticespace",
        object: space,
        objectId: getObjectId(ctx, space),
        worldMatrixPtr: space.transform.worldMatrixPtr as WasmPtr,
        boundsCenter: [bounds.sphereCenter[0], bounds.sphereCenter[1], bounds.sphereCenter[2]],
        boundsRadius: bounds.sphereRadius
    });
    return true;
};

const viewProjectionMatches = (ctx: RendererContext, currentPtr: WasmPtr, previous: Float32Array): boolean => {
    const current = wasm.f32view(currentPtr, 16);
    if (previous.length !== 16) return false;
    for (let i = 0; i < 16; i++) if (Math.abs(current[i] - previous[i]) > ctx.OCCLUSION_VIEW_PROJ_EPSILON) return false;
    return true;
};

export const getValidOcclusionHierarchy = (ctx: RendererContext, camera: Camera, signature: number): { metadata: OcclusionHierarchyMetadata; data: Float32Array } | null => {
    const latest = ctx.latestOcclusionHierarchy;
    if (!latest || !ctx.occlusionHierarchyLayout) return null;
    const meta = latest.metadata;
    if (meta.viewportWidth !== ctx.width || meta.viewportHeight !== ctx.height) return null;
    if (meta.hierarchyWidth !== ctx.occlusionWidth || meta.hierarchyHeight !== ctx.occlusionHeight) return null;
    if (meta.cameraType !== camera.type) return null;
    if (meta.occluderSignature !== signature) return null;
    if (!viewProjectionMatches(ctx, ctx.cameraUniformStagingPtr, meta.viewProjection)) return null;
    return latest;
};

export const applyOcclusionFiltering = (ctx: RendererContext, _camera: Camera, candidates: OcclusionCandidate[], hierarchy: { metadata: OcclusionHierarchyMetadata; data: Float32Array }): void => {
    if (candidates.length === 0) return;
    ensureCullingCapacity(ctx, candidates.length);
    const worldPtrsPtr = frameArena.alloc(candidates.length * 4, 4) as WasmPtr;
    const localCentersPtr = frameArena.allocF32(candidates.length * 3) as WasmPtr;
    const localRadiiPtr = frameArena.allocF32(candidates.length) as WasmPtr;
    const worldPtrs = wasm.u32view(worldPtrsPtr, candidates.length);
    const localCenters = wasm.f32view(localCentersPtr, candidates.length * 3);
    const localRadii = wasm.f32view(localRadiiPtr, candidates.length);
    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        worldPtrs[i] = candidate.worldMatrixPtr >>> 0;
        localCenters[(i * 3) + 0] = candidate.boundsCenter[0];
        localCenters[(i * 3) + 1] = candidate.boundsCenter[1];
        localCenters[(i * 3) + 2] = candidate.boundsCenter[2];
        localRadii[i] = candidate.boundsRadius;
    }
    cullf.prepareWorldSpheresFromPtrs(ctx.cullCentersPtr, ctx.cullRadiiPtr, worldPtrsPtr, localCentersPtr, localRadiiPtr, candidates.length);
    const layout = hierarchy.metadata.layout;
    const depthPtr = frameArena.allocF32(hierarchy.data.length) as WasmPtr;
    wasm.f32view(depthPtr, hierarchy.data.length).set(hierarchy.data);
    const mipOffsetsPtr = frameArena.alloc(layout.offsets.byteLength, 4) as WasmPtr;
    const mipWidthsPtr = frameArena.alloc(layout.widths.byteLength, 4) as WasmPtr;
    const mipHeightsPtr = frameArena.alloc(layout.heights.byteLength, 4) as WasmPtr;
    wasm.u32view(mipOffsetsPtr, layout.offsets.length).set(layout.offsets);
    wasm.u32view(mipWidthsPtr, layout.widths.length).set(layout.widths);
    wasm.u32view(mipHeightsPtr, layout.heights.length).set(layout.heights);
    const outPtr = frameArena.alloc(candidates.length * 4, 4) as WasmPtr;
    const statsPtr = frameArena.alloc(12, 4) as WasmPtr;
    const visibleCount = cullf.spheresOcclusion(outPtr, statsPtr, ctx.cullCentersPtr, ctx.cullRadiiPtr, candidates.length, ctx.cameraUniformStagingPtr, ctx.width, ctx.height, mipOffsetsPtr, mipWidthsPtr, mipHeightsPtr, layout.mipCount, depthPtr, hierarchy.data.length, ctx.OCCLUSION_NEAR_EPSILON, ctx.OCCLUSION_MAX_SCREEN_COVERAGE, ctx.OCCLUSION_DEPTH_BIAS);
    if (ctx.occlusionCullingStatsEnabled) {
        const stats = wasm.u32view(statsPtr, 3);
        ctx.cullingStats.occlusion.tested = stats[0] >>> 0;
        ctx.cullingStats.occlusion.visible = stats[1] >>> 0;
        ctx.cullingStats.occlusion.occluded = stats[2] >>> 0;
    }
    const visibleSet = ctx.occlusionVisibleObjectIds;
    const candidateSet = ctx.occlusionCandidateObjectIds;
    visibleSet.clear();
    candidateSet.clear();
    for (let i = 0; i < candidates.length; i++) candidateSet.add(candidates[i].objectId);
    const out = wasm.u32view(outPtr, visibleCount);
    for (let i = 0; i < visibleCount; i++) visibleSet.add(candidates[out[i]].objectId);
    filterOpaqueDrawListInPlace(ctx.opaqueDrawList, (item) => {
        const id = getObjectId(ctx, item.mesh);
        return !candidateSet.has(id) || visibleSet.has(id);
    });
    filterOpaqueDrawListInPlace(ctx.opaquePointCloudDrawList, (item) => {
        const id = getObjectId(ctx, item.cloud);
        return !candidateSet.has(id) || visibleSet.has(id);
    });
    filterOpaqueDrawListInPlace(ctx.opaqueGlyphFieldDrawList, (item) => {
        const id = getObjectId(ctx, item.field);
        return !candidateSet.has(id) || visibleSet.has(id);
    });
    filterOpaqueDrawListInPlace(ctx.opaqueNodeLinkDrawList, (item) => {
        const id = getObjectId(ctx, item.link);
        return !candidateSet.has(id) || visibleSet.has(id);
    });
    filterOpaqueDrawListInPlace(ctx.opaqueLatticeSpaceDrawList, (item) => { const id = getObjectId(ctx, item.space); return !candidateSet.has(id) || visibleSet.has(id); });
    visibleSet.clear();
    candidateSet.clear();
};

const filterOpaqueDrawListInPlace = <T>(items: T[], keep: (item: T) => boolean): void => {
    let write = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!keep(item)) continue;
        items[write++] = item;
    }
    items.length = write;
};

const isCoverageStableMeshMaterial = (material: Material): boolean => {
    if (material instanceof CustomMaterial) return false;
    if (material instanceof DataMaterial) return false;
    if (material instanceof UnlitMaterial) return material.alphaCutoff <= 0;
    if (material instanceof StandardMaterial) return material.alphaCutoff <= 0 && !material.usesTransmissionLayout();
    return false;
};

const isSafeMeshOccluder = (ctx: RendererContext, item: DrawItem): boolean => {
    const material = item.material;
    if (material.blendMode !== BlendMode.Opaque) return false;
    if (!material.depthWrite || !material.depthTest) return false;
    if (isOpticallyTransmissiveMaterial(material)) return false;
    if (!isCoverageStableMeshMaterial(material)) return false;
    if (item.skinned) return false;
    return true;
};

const getMeshOccluderToken = (ctx: RendererContext, item: DrawItem): number => {
    const mesh = item.mesh;
    const material = item.material;
    let hash = 2166136261 >>> 0;
    hash = mixOcclusionHash(hash, getObjectId(ctx, item.geometry));
    hash = mixOcclusionHash(hash, getObjectId(ctx, getMeshVertexSource(mesh)));
    hash = mixOcclusionHash(hash, getObjectId(ctx, material));
    hash = mixOcclusionHash(hash, blendModeHash(material.blendMode));
    hash = mixOcclusionHash(hash, material.depthWrite ? 1 : 0);
    hash = mixOcclusionHash(hash, material.depthTest ? 1 : 0);
    hash = mixOcclusionHash(hash, cullModeHash(material.cullMode));
    hash = mixOcclusionHash(hash, item.mirrored ? 1 : 0);
    hash = mixOcclusionHash(hash, item.skinned ? 1 : 0);
    hash = mixOcclusionHash(hash, hasMeshMorphRuntime(mesh) ? 1 : 0);
    hash = mixOcclusionHash(hash, hashWorldMatrix(mesh.transform.worldMatrixPtr as WasmPtr));
    if (material instanceof UnlitMaterial) hash = mixOcclusionHashF32(hash, material.alphaCutoff);
    if (material instanceof StandardMaterial) {
        hash = mixOcclusionHashF32(hash, material.alphaCutoff);
        hash = mixOcclusionHash(hash, material.getFeatureMask() >>> 0);
        hash = mixOcclusionHash(hash, material.usesTransmissionLayout() ? 1 : 0);
    }
    return hash >>> 0;
};

const isSafePointCloudOccluder = (item: PointCloudDrawItem): boolean => item.cloud.blendMode === BlendMode.Opaque && item.cloud.depthWrite && item.cloud.depthTest;

const isSafeGlyphOccluder = (item: GlyphFieldDrawItem): boolean => item.field.blendMode === BlendMode.Opaque && item.field.depthWrite && item.field.depthTest;

const isSafeNodeLinkOccluder = (item: NodeLinkDrawItem): boolean => item.link.blendMode === BlendMode.Opaque && item.link.depthWrite && item.link.depthTest;

const isSafeLatticeSpaceOccluder = (item: LatticeSpaceDrawItem): boolean => item.space.blendMode === BlendMode.Opaque && item.space.depthWrite && item.space.depthTest;

export const captureOcclusionHierarchy = (ctx: RendererContext, camera: Camera): void => {
    const frameState = ctx.pendingOcclusionFrameState;
    if (!frameState) return;
    const safeOccluderCount = frameState.meshOccluders.length + frameState.pointCloudOccluders.length + frameState.glyphOccluders.length + frameState.nodeLinkOccluders.length + frameState.latticeSpaceOccluders.length;
    if (safeOccluderCount <= 0) return;
    ensureOcclusionResources(ctx);
    if (!ctx.occlusionHierarchyTexture || !ctx.occlusionDepthView || !ctx.occlusionHierarchyLayout) return;
    const slot = getIdleOcclusionReadbackSlot(ctx);
    if (!slot) return;
    ensureOcclusionReadbackBuffer(ctx, slot, ctx.occlusionHierarchyLayout.totalBytes);
    if (!slot.buffer) return;
    ctx.modelBufferIndex = 0;
    const encoder = ctx.device.createCommandEncoder();
    const capturePass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: ctx.occlusionHierarchyMipViews[0],
                clearValue: { r: 1, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store"
            }
        ],
        depthStencilAttachment: {
            view: ctx.occlusionDepthView,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store"
        }
    });
    executeOcclusionMeshDrawList(ctx, capturePass, frameState.meshOccluders);
    executeOcclusionGlyphFieldDrawList(ctx, capturePass, frameState.glyphOccluders);
    executeOcclusionPointCloudDrawList(ctx, capturePass, frameState.pointCloudOccluders);
    executeOcclusionNodeLinkDrawList(ctx, capturePass, frameState.nodeLinkOccluders);
    executeOcclusionLatticeSpaceDrawList(ctx, capturePass, frameState.latticeSpaceOccluders);
    capturePass.end();
    for (let mip = 1; mip < ctx.occlusionHierarchyLayout.mipCount; mip++) {
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: ctx.occlusionHierarchyMipViews[mip],
                    clearValue: { r: 1, g: 0, b: 0, a: 0 },
                    loadOp: "clear",
                    storeOp: "store"
                }
            ]
        });
        pass.setPipeline(getOrCreateOcclusionReducePipeline(ctx));
        pass.setBindGroup(0, getOrCreateOcclusionReduceBindGroup(ctx, mip - 1));
        pass.draw(3);
        pass.end();
    }
    for (let mip = 0; mip < ctx.occlusionHierarchyLayout.mipCount; mip++) {
        encoder.copyTextureToBuffer(
            {
                texture: ctx.occlusionHierarchyTexture,
                mipLevel: mip
            },
            {
                buffer: slot.buffer,
                offset: ctx.occlusionHierarchyLayout.copyOffsets[mip],
                bytesPerRow: ctx.occlusionHierarchyLayout.rowBytes[mip],
                rowsPerImage: ctx.occlusionHierarchyLayout.heights[mip]
            },
            {
                width: ctx.occlusionHierarchyLayout.widths[mip],
                height: ctx.occlusionHierarchyLayout.heights[mip],
                depthOrArrayLayers: 1
            }
        );
    }
    const metadata: OcclusionHierarchyMetadata = {
        viewportWidth: ctx.width,
        viewportHeight: ctx.height,
        hierarchyWidth: ctx.occlusionWidth,
        hierarchyHeight: ctx.occlusionHeight,
        cameraType: camera.type,
        occluderSignature: frameState.signature,
        viewProjection: new Float32Array(wasm.f32view(ctx.cameraUniformStagingPtr, 16)),
        layout: ctx.occlusionHierarchyLayout
    };
    slot.metadata = metadata;
    slot.data = null;
    slot.serial = ++ctx.occlusionCaptureSerial;
    slot.state = "mapping";
    ctx.queue.submit([encoder.finish()]);
    slot.pending = slot.buffer.mapAsync(GPUMapMode.READ).then(() => {
        if (!slot.buffer || !slot.metadata) return;
        const mapped = slot.buffer.getMappedRange();
        const data = new Float32Array(slot.metadata.layout.texelCount);
        for (let mip = 0; mip < slot.metadata.layout.mipCount; mip++) {
            const width = slot.metadata.layout.widths[mip];
            const height = slot.metadata.layout.heights[mip];
            const texelOffset = slot.metadata.layout.offsets[mip];
            const rowBytes = slot.metadata.layout.rowBytes[mip];
            const copyOffset = slot.metadata.layout.copyOffsets[mip];
            for (let row = 0; row < height; row++) {
                const src = new Float32Array(mapped, copyOffset + (row * rowBytes), width);
                data.set(src, texelOffset + (row * width));
            }
        }
        slot.data = data;
        slot.state = "ready";
        if (slot.metadata && slot.serial >= ctx.latestOcclusionHierarchySerial) {
            ctx.latestOcclusionHierarchySerial = slot.serial;
            ctx.latestOcclusionHierarchy = { metadata: slot.metadata, data };
        }
    }).catch(() => {
        slot.data = null;
        slot.metadata = null;
        slot.state = "idle";
    }).finally(() => {
        try { slot.buffer?.unmap(); } catch { /* ignore */ }
        if (slot.state !== "ready") slot.state = "idle";
        slot.pending = null;
    });
};

const executeOcclusionMeshDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: DrawItem[]): void => {
    let lastPipeline: GPURenderPipeline | null = null;
    let lastGeometry: Geometry | null = null;
    let lastVertexSourceId = -1;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const geometry = item.geometry;
        if (geometry !== lastGeometry || item.vertexSourceId !== lastVertexSourceId) {
            geometry.upload(ctx.device);
            getMeshVertexBuffers(item.mesh, ctx.device, ctx.queue);
            lastGeometry = geometry;
            lastVertexSourceId = item.vertexSourceId;
        }
        const pipeline = getOrCreateOcclusionMeshPipeline(ctx, item);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
        }
        const slot = ctx.modelBufferIndex++;
        writeModelUniformSlot(ctx, slot, item.mesh.transform.worldMatrixPtr as WasmPtr);
        pass.setBindGroup(0, ctx.globalBindGroups[slot]);
        const geometryBuffers = getMeshVertexBuffers(item.mesh, ctx.device, ctx.queue);
        pass.setVertexBuffer(0, geometryBuffers.positionBuffer);
        if (geometry.isIndexed && geometry.indexBuffer) {
            pass.setIndexBuffer(geometry.indexBuffer, "uint32");
            pass.drawIndexed(geometry.indexCount);
        } else pass.draw(geometry.vertexCount);
    }
};

const executeOcclusionPointCloudDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: PointCloudDrawItem[]): void => {
    let lastCloud: PointCloud | null = null;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const cloud = item.cloud;
        ensurePointCloudBindGroup(ctx, cloud);
        if (!cloud.bindGroup) continue;
        const slot = ctx.modelBufferIndex++;
        writeModelUniformSlot(ctx, slot, cloud.transform.worldMatrixPtr as WasmPtr);
        pass.setPipeline(getOrCreateOcclusionPointCloudPipeline(ctx));
        pass.setBindGroup(0, ctx.globalBindGroups[slot]);
        if (cloud !== lastCloud) {
            pass.setBindGroup(1, cloud.bindGroup);
            lastCloud = cloud;
        }
        pass.draw(6, cloud.pointCount);
    }
};

const executeOcclusionGlyphFieldDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, list: GlyphFieldDrawItem[]): void => {
    let lastGeometry: Geometry | null = null;
    let lastField: GlyphField | null = null;
    let lastPipeline: GPURenderPipeline | null = null;
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const field = item.field;
        ensureGlyphFieldBindGroup(ctx, field);
        if (!field.bindGroup) continue;
        const pipeline = getOrCreateOcclusionGlyphFieldPipeline(ctx, field);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
        }
        if (item.geometry !== lastGeometry) {
            item.geometry.upload(ctx.device);
            pass.setVertexBuffer(0, item.geometry.positionBuffer!);
            lastGeometry = item.geometry;
        }
        const slot = ctx.modelBufferIndex++;
        writeModelUniformSlot(ctx, slot, field.transform.worldMatrixPtr as WasmPtr);
        pass.setBindGroup(0, ctx.globalBindGroups[slot]);
        if (field !== lastField) {
            pass.setBindGroup(1, field.bindGroup);
            lastField = field;
        }
        if (item.geometry.isIndexed && item.geometry.indexBuffer) {
            pass.setIndexBuffer(item.geometry.indexBuffer, "uint32");
            pass.drawIndexed(item.geometry.indexCount, field.instanceCount);
        } else pass.draw(item.geometry.vertexCount, field.instanceCount);
    }
};

const executeOcclusionNodeLinkDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, list: NodeLinkDrawItem[]): void => {
    let lastLink: NodeLink | null = null;
    let lastGeometry: Geometry | null = null;
    let lastPipeline: GPURenderPipeline | null = null;
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const link = item.link;
        ensureNodeLinkBindGroup(ctx, link);
        if (!link.bindGroup) continue;
        const pipeline = getOrCreateOcclusionNodeLinkPipeline(ctx, link, item.passKind);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
        }
        if (item.geometry && item.geometry !== lastGeometry) {
            item.geometry.upload(ctx.device);
            pass.setVertexBuffer(0, item.geometry.positionBuffer!);
            lastGeometry = item.geometry;
        }
        const slot = ctx.modelBufferIndex++;
        writeModelUniformSlot(ctx, slot, link.transform.worldMatrixPtr as WasmPtr);
        pass.setBindGroup(0, ctx.globalBindGroups[slot]);
        if (link !== lastLink) {
            pass.setBindGroup(1, link.bindGroup);
            lastLink = link;
        }
        if (item.passKind === "node-points") pass.draw(6, link.nodeCount);
        else if (item.passKind === "edge-lines") pass.draw(2, link.edgeCount);
        else if (item.passKind === "node-solid") {
            if (!item.geometry) continue;
            if (item.geometry.isIndexed && item.geometry.indexBuffer) {
                pass.setIndexBuffer(item.geometry.indexBuffer, "uint32");
                pass.drawIndexed(item.geometry.indexCount, link.nodeCount);
            }
            else pass.draw(item.geometry.vertexCount, link.nodeCount);
        } else {
            if (!item.geometry) continue;
            if (item.geometry.isIndexed && item.geometry.indexBuffer) {
                pass.setIndexBuffer(item.geometry.indexBuffer, "uint32");
                pass.drawIndexed(item.geometry.indexCount, link.edgeCount);
            }
            else pass.draw(item.geometry.vertexCount, link.edgeCount);
        }
    }
};

const executeOcclusionLatticeSpaceDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, list: LatticeSpaceDrawItem[]): void => {
    let lastSpace: LatticeSpace | null = null;
    let lastPipeline: GPURenderPipeline | null = null;
    for (const item of list) {
        const space = item.space;
        ensureLatticeSpaceBindGroup(ctx, space);
        if (!space.bindGroup) continue;
        const pipeline = getOrCreateOcclusionLatticeSpacePipeline(ctx, space);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
        }
        const slot = ctx.modelBufferIndex++;
        writeModelUniformSlot(ctx, slot, space.transform.worldMatrixPtr as WasmPtr);
        pass.setBindGroup(0, ctx.globalBindGroups[slot]);
        if (space !== lastSpace) {
            pass.setBindGroup(1, space.bindGroup);
            lastSpace = space;
        }
        if (space.dimensionCount === 2) pass.draw(6);
        else pass.draw(36, space.drawCellCount);
    }
};

const getOcclusionReduceBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.occlusionReduceBindGroupLayout) return ctx.occlusionReduceBindGroupLayout;
    ctx.occlusionReduceBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
        }]
    });
    return ctx.occlusionReduceBindGroupLayout;
};

const getOrCreateOcclusionReducePipeline = (ctx: RendererContext): GPURenderPipeline => {
    if (ctx.occlusionReducePipeline) return ctx.occlusionReducePipeline;
    let shaderModule = ctx.shaderCache.get(occlusionReduceWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: occlusionReduceWGSL });
        ctx.shaderCache.set(occlusionReduceWGSL, shaderModule);
    }
    ctx.occlusionReducePipeline = ctx.device.createRenderPipeline({
        layout: ctx.device.createPipelineLayout({
            bindGroupLayouts: [getOcclusionReduceBindGroupLayout(ctx)]
        }),
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers: []
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{ format: "r32float" }]
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "none"
        }
    });
    return ctx.occlusionReducePipeline;
};

const getOrCreateOcclusionReduceBindGroup = (ctx: RendererContext, srcMip: number): GPUBindGroup => {
    if (!ctx.occlusionHierarchyTexture) throw new Error("Renderer: occlusion hierarchy texture is not initialized.");
    const key = `occlusion-reduce:${getObjectId(ctx, ctx.occlusionHierarchyTexture)}:${srcMip}`;
    const cached = ctx.occlusionReduceBindGroups.get(key);
    if (cached) return cached;
    const bindGroup = ctx.device.createBindGroup({
        layout: getOcclusionReduceBindGroupLayout(ctx),
        entries: [{
            binding: 0,
            resource: ctx.occlusionHierarchyMipViews[srcMip]
        }]
    });
    ctx.occlusionReduceBindGroups.set(key, bindGroup);
    return bindGroup;
};

const getOrCreateOcclusionMeshPipeline = (ctx: RendererContext, item: DrawItem): GPURenderPipeline => {
    const cullMode = getCullMode(ctx, item.material.cullMode);
    const key = `occlusion:mesh:${cullMode}:${item.mirrored ? "cw" : "ccw"}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(occlusionMeshWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: occlusionMeshWGSL });
        ctx.shaderCache.set(occlusionMeshWGSL, shaderModule);
    }
    const pipeline = ctx.device.createRenderPipeline({
        layout: ctx.device.createPipelineLayout({
            bindGroupLayouts: [ctx.globalBindGroupLayout]
        }),
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }]
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{ format: "r32float" }]
        },
        primitive: {
            topology: "triangle-list",
            cullMode,
            frontFace: item.mirrored ? "cw" : "ccw"
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

const getOrCreateOcclusionPointCloudPipeline = (ctx: RendererContext): GPURenderPipeline => {
    const key = "occlusion:pointcloud";
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(occlusionPointCloudWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: occlusionPointCloudWGSL });
        ctx.shaderCache.set(occlusionPointCloudWGSL, shaderModule);
    }
    const pipeline = ctx.device.createRenderPipeline({
        layout: ctx.device.createPipelineLayout({
            bindGroupLayouts: [ctx.globalBindGroupLayout, getPointCloudBindGroupLayout(ctx)]
        }),
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers: []
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{ format: "r32float" }]
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "none"
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

const getOrCreateOcclusionGlyphFieldPipeline = (ctx: RendererContext, field: GlyphField): GPURenderPipeline => {
    const cullMode = getCullMode(ctx, field.cullMode);
    const key = `occlusion:glyphfield:${cullMode}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(occlusionGlyphFieldWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: occlusionGlyphFieldWGSL });
        ctx.shaderCache.set(occlusionGlyphFieldWGSL, shaderModule);
    }
    const pipeline = ctx.device.createRenderPipeline({
        layout: ctx.device.createPipelineLayout({
            bindGroupLayouts: [ctx.globalBindGroupLayout, getGlyphFieldBindGroupLayout(ctx)]
        }),
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }]
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{ format: "r32float" }]
        },
        primitive: {
            topology: "triangle-list",
            cullMode
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

const getOrCreateOcclusionNodeLinkPipeline = (ctx: RendererContext, link: NodeLink, passKind: NodeLinkDrawItem["passKind"]): GPURenderPipeline => {
    const key = `occlusion:nodelink:${passKind}:${link.cullMode}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(occlusionNodeLinkWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: occlusionNodeLinkWGSL });
        ctx.shaderCache.set(occlusionNodeLinkWGSL, shaderModule);
    }
    let vertexEntry = "vs_node_points";
    let buffers: GPUVertexBufferLayout[] = [];
    let topology: GPUPrimitiveTopology = "triangle-list";
    let cullMode: GPUCullMode = "none";
    if (passKind === "node-solid") {
        vertexEntry = "vs_node_solid";
        buffers = [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }];
        cullMode = getCullMode(ctx, link.cullMode);
    } else if (passKind === "edge-lines") {
        vertexEntry = "vs_edge_lines";
        topology = "line-list";
    } else if (passKind === "edge-cylinders") {
        vertexEntry = "vs_edge_cylinders";
        buffers = [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }];
        cullMode = getCullMode(ctx, link.cullMode);
    }
    const pipeline = ctx.device.createRenderPipeline({
        layout: ctx.device.createPipelineLayout({
            bindGroupLayouts: [ctx.globalBindGroupLayout, getNodeLinkBindGroupLayout(ctx)]
        }),
        vertex: {
            module: shaderModule,
            entryPoint: vertexEntry,
            buffers
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{ format: "r32float" }]
        },
        primitive: {
            topology,
            cullMode
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

const getOrCreateOcclusionLatticeSpacePipeline = (ctx: RendererContext, space: LatticeSpace): GPURenderPipeline => {
    const cullMode = space.dimensionCount === 2 ? "none" : getCullMode(ctx, space.cullMode);
    const key = `occlusion:latticespace:${space.dimensionCount}:${cullMode}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let module = ctx.shaderCache.get(occlusionLatticeSpaceWGSL);
    if (!module) {
        module = ctx.device.createShaderModule({ code: occlusionLatticeSpaceWGSL });
        ctx.shaderCache.set(occlusionLatticeSpaceWGSL, module);
    }
    const pipeline = ctx.device.createRenderPipeline({
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [ctx.globalBindGroupLayout, getLatticeSpaceBindGroupLayout(ctx)] }),
        vertex: { module, entryPoint: space.dimensionCount === 2 ? "vs_2d" : "vs_3d", buffers: [] },
        fragment: { module, entryPoint: "fs_main", targets: [{ format: "r32float" }] },
        primitive: { topology: "triangle-list", cullMode },
        depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

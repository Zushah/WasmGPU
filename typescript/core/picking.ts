/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createDepthTexture, clamp } from "../utils";
import { Geometry } from "../graphics/geometry";
import { Material } from "../graphics/material";
import { TransformStore } from "./transform";
import { Camera } from "../world/camera";
import { Mesh, getMeshVertexBuffers, hasMeshMorphRuntime } from "../world/mesh";
import { PointCloud } from "../world/pointcloud";
import { GlyphField } from "../world/glyphfield";
import { NodeLink } from "../world/nodelink";
import { SplatField } from "../world/splatfield";
import { LatticeSpace } from "../world/latticespace";
import { Scene } from "../world/scene";
import type { PickLassoPoint, PickRegionQuery } from "../world/picking";
import { animf, driver, frameArena, mat4, mat4f } from "../wasm";
import type { WasmPtr } from "../wasm";
import pickMeshWGSL from "../../wgsl/core/picking-mesh.wgsl";
import pickMeshSkinnedWGSL from "../../wgsl/core/picking-mesh-skinned.wgsl";
import pickMeshSkinned8WGSL from "../../wgsl/core/picking-mesh-skinned8.wgsl";
import pickPointCloudWGSL from "../../wgsl/world/picking-pointcloud.wgsl";
import pickGlyphFieldWGSL from "../../wgsl/world/picking-glyphfield.wgsl";
import pickNodeLinkWGSL from "../../wgsl/world/picking-nodelink.wgsl";
import pickSplatFieldWGSL from "../../wgsl/world/picking-splatfield.wgsl";
import pickLatticeSpaceWGSL from "../../wgsl/world/picking-latticespace.wgsl";
import type { RendererContext } from "./context";
import type { DecodedPickSample, DrawItem, GlyphFieldDrawItem, LatticeSpaceDrawItem, NodeLinkDrawItem, PointCloudDrawItem, RendererPickHit, RendererPickRegionBounds, RendererPickRegionResult, ResolvedPickRegionQuery, SplatFieldDrawItem } from "./types";
import { getCullMode } from "./materials";
import { ensureGlyphFieldBindGroup, ensureLatticeSpaceBindGroup, ensureNodeLinkBindGroup, ensurePointCloudBindGroup, ensureSplatFieldBindGroup, getGlyphFieldBindGroupLayout, getLatticeSpaceBindGroupLayout, getNodeLinkBindGroupLayout, getPointCloudBindGroupLayout, getSplatFieldBindGroupLayout } from "./objects";
import { ensureModelBufferPool, getObjectId } from "./resources";

const alignTo256 = (x: number): number => (x + 255) & ~255;

const getPickMaxHits = (opts: PickRegionQuery): number => { const v = opts.maxHits; if (!Number.isFinite(v as number)) return 10000; return Math.max(1, Math.floor(v as number)); };

const toFramebufferPixel = (clientCoord: number, clientSize: number, framebufferSize: number): number => { const size = Math.max(1, framebufferSize | 0), t = (clientCoord / Math.max(1, clientSize)) * size, p = Math.floor(t); if (p < 0) return 0; if (p >= size) return size - 1; return p; };

const toClientBounds = (minX: number, minY: number, maxX: number, maxY: number, clientW: number, clientH: number): RendererPickRegionBounds => { const x = clamp(minX, 0, clientW), y = clamp(minY, 0, clientH); const right = clamp(maxX, 0, clientW), bottom = clamp(maxY, 0, clientH); return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) }; };

const resolveSinglePixel = (ctx: RendererContext, x: number, y: number, clientW: number, clientH: number): { px: number; py: number } | null => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < 0 || y < 0 || x >= clientW || y >= clientH) return null;
    const px = toFramebufferPixel(x, clientW, ctx.width);
    const py = toFramebufferPixel(y, clientH, ctx.height);
    return { px, py };
};

const resolveRectPickQuery = (ctx: RendererContext, x0: number, y0: number, x1: number, y1: number, maxHits: number, clientW: number, clientH: number): ResolvedPickRegionQuery => {
    const minX = Math.min(x0, x1);
    const minY = Math.min(y0, y1);
    const maxX = Math.max(x0, x1);
    const maxY = Math.max(y0, y1);
    const bounds = toClientBounds(minX, minY, maxX, maxY, clientW, clientH);
    const sameX = Math.abs(x0 - x1) <= 1e-6;
    const sameY = Math.abs(y0 - y1) <= 1e-6;
    if (sameX && sameY) {
        const p = resolveSinglePixel(ctx, x0, y0, clientW, clientH);
        if (!p) return { mode: "rect", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
        return { mode: "rect", bounds, x: p.px, y: p.py, width: 1, height: 1, maxHits, lasso: null };
    }
    if (bounds.width <= 0 || bounds.height <= 0) return { mode: "rect", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
    const maxClientX = Math.max(bounds.x, (bounds.x + bounds.width) - 1e-6);
    const maxClientY = Math.max(bounds.y, (bounds.y + bounds.height) - 1e-6);
    const px0 = toFramebufferPixel(bounds.x, clientW, ctx.width);
    const py0 = toFramebufferPixel(bounds.y, clientH, ctx.height);
    const px1 = toFramebufferPixel(maxClientX, clientW, ctx.width);
    const py1 = toFramebufferPixel(maxClientY, clientH, ctx.height);
    return {
        mode: "rect", bounds,
        x: Math.min(px0, px1), y: Math.min(py0, py1),
        width: Math.abs(px1 - px0) + 1, height: Math.abs(py1 - py0) + 1,
        maxHits, lasso: null
    };
};

const resolveLassoPickQuery = (ctx: RendererContext, points: PickLassoPoint[], maxHits: number, clientW: number, clientH: number): ResolvedPickRegionQuery => {
    if (!Array.isArray(points) || points.length < 3) {
        return {
            mode: "lasso", bounds: { x: 0, y: 0, width: 0, height: 0 },
            x: 0, y: 0,
            width: 0, height: 0,
            maxHits, lasso: null
        };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return {
            mode: "lasso", bounds: { x: 0, y: 0, width: 0, height: 0 },
            x: 0, y: 0,
            width: 0, height: 0,
            maxHits, lasso: null
        };
    }
    const bounds = toClientBounds(minX, minY, maxX, maxY, clientW, clientH);
    if (bounds.width <= 0 || bounds.height <= 0) {
        return { mode: "lasso", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
    }
    const lasso: Array<{ x: number; y: number }> = [];
    let minFx = Infinity;
    let minFy = Infinity;
    let maxFx = -Infinity;
    let maxFy = -Infinity;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        const fx = (p.x / Math.max(1, clientW)) * Math.max(1, ctx.width);
        const fy = (p.y / Math.max(1, clientH)) * Math.max(1, ctx.height);
        lasso.push({ x: fx, y: fy });
        if (fx < minFx) minFx = fx;
        if (fy < minFy) minFy = fy;
        if (fx > maxFx) maxFx = fx;
        if (fy > maxFy) maxFy = fy;
    }
    if (lasso.length < 3 || !Number.isFinite(minFx) || !Number.isFinite(minFy) || !Number.isFinite(maxFx) || !Number.isFinite(maxFy)) {
        return { mode: "lasso", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
    }
    const px0 = clamp(Math.floor(minFx), 0, Math.max(0, ctx.width - 1)), py0 = clamp(Math.floor(minFy), 0, Math.max(0, ctx.height - 1));
    const px1 = clamp(Math.floor(maxFx), 0, Math.max(0, ctx.width - 1)), py1 = clamp(Math.floor(maxFy), 0, Math.max(0, ctx.height - 1));
    if (px1 < px0 || py1 < py0) return { mode: "lasso", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
    return {
        mode: "lasso", bounds,
        x: px0, y: py0,
        width: (px1 - px0) + 1, height: (py1 - py0) + 1,
        maxHits, lasso
    };
};

const preparePickFrame = (ctx: RendererContext, scene: Scene, camera: Camera): void => { ctx.prepareSceneFrameBase(scene, camera); if (!ctx.pickIdView || !ctx.pickDepthView || !ctx.pickDepthPayloadView) resizePickTargets(ctx); };

const resolveRendererPickHit = (ctx: RendererContext, camera: Camera, sample: DecodedPickSample): RendererPickHit | null => {
    const obj = ctx.objectsById.get(sample.objectId);
    if (!obj) return null;
    const worldPosition = ctx.unprojectDepth(camera, sample.px, sample.py, sample.depth);
    if (obj instanceof Mesh) return { kind: "mesh", object: obj, objectId: sample.objectId, elementIndex: sample.elementIndex, worldPosition };
    if (obj instanceof PointCloud) return { kind: "pointcloud", object: obj, objectId: sample.objectId, elementIndex: sample.elementIndex, worldPosition };
    if (obj instanceof GlyphField) return { kind: "glyphfield", object: obj, objectId: sample.objectId, elementIndex: sample.elementIndex, worldPosition };
    if (obj instanceof NodeLink) return { kind: "nodelink", object: obj, objectId: sample.objectId, elementIndex: sample.elementIndex, worldPosition };
    if (obj instanceof SplatField) return { kind: "splatfield", object: obj, objectId: sample.objectId, elementIndex: sample.elementIndex, worldPosition };
    if (obj instanceof LatticeSpace) return { kind: "latticespace", object: obj, objectId: sample.objectId, elementIndex: sample.elementIndex, worldPosition };
    return null;
};

const pointInPolygon = (x: number, y: number, polygon: Array<{ x: number; y: number }>): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;
        const intersects = ((yi > y) !== (yj > y)) && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12)) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
};

const executePickRegion = async (ctx: RendererContext, scene: Scene, camera: Camera, query: ResolvedPickRegionQuery): Promise<RendererPickRegionResult> => {
    if (query.width <= 0 || query.height <= 0) return { mode: query.mode, hits: [], truncated: false, bounds: query.bounds, sampledPixels: 0 };
    preparePickFrame(ctx, scene, camera);
    if (!ctx.pickIdView || !ctx.pickDepthView || !ctx.pickDepthPayloadView) return { mode: query.mode, hits: [], truncated: false, bounds: query.bounds, sampledPixels: 0 };
    const readback = ensurePickReadbackBuffers(ctx, query.width, query.height);
    if (!ctx.pickIdTexture || !ctx.pickDepthPayloadTexture || !ctx.pickIdReadbackBuffer || !ctx.pickDepthReadbackBuffer) return { mode: query.mode, hits: [], truncated: false, bounds: query.bounds, sampledPixels: 0 };
    if (ctx.pickIdReadbackBuffer.mapState !== "unmapped") try { ctx.pickIdReadbackBuffer.unmap(); } catch { /* ignore */ }
    if (ctx.pickDepthReadbackBuffer.mapState !== "unmapped") try { ctx.pickDepthReadbackBuffer.unmap(); } catch { /* ignore */ }
    const encoder = ctx.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: ctx.pickIdView,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store"
            },
            {
                view: ctx.pickDepthPayloadView,
                clearValue: { r: 1, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store"
            }
        ],
        depthStencilAttachment: {
            view: ctx.pickDepthView,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store"
        }
    });
    pass.setScissorRect(query.x, query.y, query.width, query.height);
    executeMeshPickDrawList(ctx, pass, ctx.opaqueDrawList);
    executeMeshPickDrawList(ctx, pass, ctx.transparentDrawList);
    executeGlyphPickDrawList(ctx, pass, ctx.opaqueGlyphFieldDrawList);
    executeGlyphPickDrawList(ctx, pass, ctx.transparentGlyphFieldDrawList);
    executePointCloudPickDrawList(ctx, pass, ctx.opaquePointCloudDrawList);
    executePointCloudPickDrawList(ctx, pass, ctx.transparentPointCloudDrawList);
    executeSplatFieldPickDrawList(ctx, pass, ctx.transparentSplatFieldDrawList);
    executeNodeLinkPickDrawList(ctx, pass, ctx.opaqueNodeLinkDrawList);
    executeNodeLinkPickDrawList(ctx, pass, ctx.transparentNodeLinkDrawList);
    executeLatticeSpacePickDrawList(ctx, pass, ctx.opaqueLatticeSpaceDrawList);
    executeLatticeSpacePickDrawList(ctx, pass, ctx.transparentLatticeSpaceDrawList);
    pass.end();
    encoder.copyTextureToBuffer(
        { texture: ctx.pickIdTexture, origin: { x: query.x, y: query.y, z: 0 } },
        { buffer: ctx.pickIdReadbackBuffer, bytesPerRow: readback.idBytesPerRow, rowsPerImage: query.height },
        { width: query.width, height: query.height, depthOrArrayLayers: 1 }
    );
    encoder.copyTextureToBuffer(
        { texture: ctx.pickDepthPayloadTexture, origin: { x: query.x, y: query.y, z: 0 } },
        { buffer: ctx.pickDepthReadbackBuffer, bytesPerRow: readback.depthBytesPerRow, rowsPerImage: query.height },
        { width: query.width, height: query.height, depthOrArrayLayers: 1 }
    );
    ctx.queue.submit([encoder.finish()]);
    await Promise.all([ctx.pickIdReadbackBuffer.mapAsync(GPUMapMode.READ, 0, readback.idSizeBytes), ctx.pickDepthReadbackBuffer.mapAsync(GPUMapMode.READ, 0, readback.depthSizeBytes)]);
    let truncated = false;
    let sampledPixels = 0;
    const samples: Map<string, DecodedPickSample> = new Map();
    try {
        const idWords = new Uint32Array(ctx.pickIdReadbackBuffer.getMappedRange(0, readback.idSizeBytes));
        const depthWords = new Float32Array(ctx.pickDepthReadbackBuffer.getMappedRange(0, readback.depthSizeBytes));
        const lasso = query.mode === "lasso" ? query.lasso : null;
        rows: for (let y = 0; y < query.height; y++) {
            const idRowBase = (y * readback.idBytesPerRow) >>> 2;
            const depthRowBase = (y * readback.depthBytesPerRow) >>> 2;
            const py = query.y + y;
            for (let x = 0; x < query.width; x++) {
                const px = query.x + x;
                if (lasso && !pointInPolygon(px + 0.5, py + 0.5, lasso)) continue;
                sampledPixels++;
                const idIndex = idRowBase + (x * 2);
                const objectId = idWords[idIndex] >>> 0;
                if (objectId === 0) continue;
                const elementIndex = idWords[idIndex + 1] >>> 0;
                const depth = depthWords[depthRowBase + x];
                if (!Number.isFinite(depth) || depth >= 1.0) continue;
                const key = `${objectId}:${elementIndex}`;
                const existing = samples.get(key);
                if (!existing) {
                    if (samples.size >= query.maxHits) { truncated = true; break rows; }
                    samples.set(key, { objectId, elementIndex, depth, px, py });
                } else if (depth < existing.depth) { existing.depth = depth; existing.px = px; existing.py = py; }
            }
        }
    } finally { try { ctx.pickIdReadbackBuffer.unmap(); } catch { /* ignore */ } try { ctx.pickDepthReadbackBuffer.unmap(); } catch { /* ignore */ } }
    const hits: RendererPickHit[] = [];
    for (const sample of samples.values()) {
        const hit = resolveRendererPickHit(ctx, camera, sample);
        if (hit) hits.push(hit);
    }
    return { mode: query.mode, hits, truncated, bounds: query.bounds, sampledPixels };
};

export const runPick = async (ctx: RendererContext, scene: Scene, camera: Camera, x: number, y: number): Promise<RendererPickHit | null> => {
    frameArena.reset();
    ctx.resize();
    const clientW = Math.max(1, ctx.canvas.clientWidth || ctx.width);
    const clientH = Math.max(1, ctx.canvas.clientHeight || ctx.height);
    const pixel = resolveSinglePixel(ctx, x, y, clientW, clientH);
    if (!pixel) return null;
    const query: ResolvedPickRegionQuery = {
        mode: "rect", bounds: { x, y, width: 0, height: 0 },
        x: pixel.px, y: pixel.py,
        width: 1, height: 1,
        maxHits: 1, lasso: null
    };
    const result = await executePickRegion(ctx, scene, camera, query);
    return result.hits.length > 0 ? result.hits[0] : null;
};

export const runPickRect = async (ctx: RendererContext, scene: Scene, camera: Camera, x0: number, y0: number, x1: number, y1: number, opts: PickRegionQuery): Promise<RendererPickRegionResult> => {
    frameArena.reset();
    ctx.resize();
    const clientW = Math.max(1, ctx.canvas.clientWidth || ctx.width);
    const clientH = Math.max(1, ctx.canvas.clientHeight || ctx.height);
    const query = resolveRectPickQuery(ctx, x0, y0, x1, y1, getPickMaxHits(opts), clientW, clientH);
    return executePickRegion(ctx, scene, camera, query);
};

export const runPickLasso = async (ctx: RendererContext, scene: Scene, camera: Camera, points: PickLassoPoint[], opts: PickRegionQuery): Promise<RendererPickRegionResult> => {
    frameArena.reset();
    ctx.resize();
    const clientW = Math.max(1, ctx.canvas.clientWidth || ctx.width);
    const clientH = Math.max(1, ctx.canvas.clientHeight || ctx.height);
    const query = resolveLassoPickQuery(ctx, points, getPickMaxHits(opts), clientW, clientH);
    return executePickRegion(ctx, scene, camera, query);
};

export const getPickBindGroupLayout = (ctx: RendererContext): GPUBindGroupLayout => {
    if (ctx.pickBindGroupLayout) return ctx.pickBindGroupLayout;
    ctx.pickBindGroupLayout = ctx.device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform", minBindingSize: 16 }
        }]
    });
    return ctx.pickBindGroupLayout;
};

export const resizePickTargets = (ctx: RendererContext): void => {
    const w = ctx.width | 0;
    const h = ctx.height | 0;
    if (w <= 0 || h <= 0) return;
    ctx.pickIdTexture?.destroy();
    ctx.pickDepthTexture?.destroy();
    ctx.pickDepthPayloadTexture?.destroy();
    ctx.pickIdTexture = ctx.device.createTexture({
        size: { width: w, height: h, depthOrArrayLayers: 1 },
        format: "rg32uint",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });
    ctx.pickIdView = ctx.pickIdTexture.createView();
    ctx.pickDepthTexture = createDepthTexture(ctx.device, w, h);
    ctx.pickDepthView = ctx.pickDepthTexture.createView();
    ctx.pickDepthPayloadTexture = ctx.device.createTexture({
        size: { width: w, height: h, depthOrArrayLayers: 1 },
        format: "r32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });
    ctx.pickDepthPayloadView = ctx.pickDepthPayloadTexture.createView();
    ensurePickReadbackBuffers(ctx, 1, 1);
};

const ensurePickReadbackBuffers = (ctx: RendererContext, copyWidth: number, copyHeight: number): { idBytesPerRow: number; depthBytesPerRow: number; idSizeBytes: number; depthSizeBytes: number } => {
    const width = Math.max(1, copyWidth | 0);
    const height = Math.max(1, copyHeight | 0);
    const idBytesPerRow = alignTo256(width * 8);
    const depthBytesPerRow = alignTo256(width * 4);
    const idSizeBytes = idBytesPerRow * height;
    const depthSizeBytes = depthBytesPerRow * height;
    if (!ctx.pickIdReadbackBuffer || ctx.pickIdReadbackCapacityBytes < idSizeBytes) {
        ctx.pickIdReadbackBuffer?.destroy();
        ctx.pickIdReadbackBuffer = ctx.device.createBuffer({
            size: idSizeBytes,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        ctx.pickIdReadbackCapacityBytes = idSizeBytes;
    }
    if (!ctx.pickDepthReadbackBuffer || ctx.pickDepthReadbackCapacityBytes < depthSizeBytes) {
        ctx.pickDepthReadbackBuffer?.destroy();
        ctx.pickDepthReadbackBuffer = ctx.device.createBuffer({
            size: depthSizeBytes,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        ctx.pickDepthReadbackCapacityBytes = depthSizeBytes;
    }
    return { idBytesPerRow, depthBytesPerRow, idSizeBytes, depthSizeBytes };
};

const writePickUniform = (ctx: RendererContext, slot: number, objectId: number, elementBase: number = 0): void => {
    if (slot >= ctx.pickUniformBuffers.length) ensureModelBufferPool(ctx, slot + 1);
    const data = new Uint32Array([objectId >>> 0, elementBase >>> 0, 0, 0]);
    ctx.queue.writeBuffer(ctx.pickUniformBuffers[slot], 0, data.buffer, data.byteOffset, data.byteLength);
};

const executeMeshPickDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: DrawItem[]): void => {
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastGeometry: Geometry | null = null;
    let lastVertexSourceId = -1;
    let lastSkinned = false;
    let lastSkinned8 = false;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const mesh = item.mesh;
        const geometry = item.geometry;
        if (!mesh.visible) continue;
        const pipeline = getOrCreatePickMeshPipeline(ctx, item.material, item.skinned, item.skinned8, item.mirrored);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
            lastGeometry = null;
            lastVertexSourceId = -1;
            lastSkinned = false;
            lastSkinned8 = false;
        }
        const vertexSourceChanged = geometry !== lastGeometry || item.vertexSourceId !== lastVertexSourceId || item.skinned !== lastSkinned || item.skinned8 !== lastSkinned8;
        if (vertexSourceChanged) {
            geometry.upload(ctx.device);
            const buffers = getMeshVertexBuffers(mesh, ctx.device, ctx.queue);
            pass.setVertexBuffer(0, buffers.positionBuffer);
            if (item.skinned) {
                pass.setVertexBuffer(3, geometry.jointsBuffer!);
                pass.setVertexBuffer(4, geometry.weightsBuffer!);
                if (item.skinned8) {
                    pass.setVertexBuffer(5, geometry.joints1Buffer!);
                    pass.setVertexBuffer(6, geometry.weights1Buffer!);
                }
            }
            if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
            lastGeometry = geometry;
            lastVertexSourceId = item.vertexSourceId;
            lastSkinned = item.skinned;
            lastSkinned8 = item.skinned8;
        } else if (hasMeshMorphRuntime(mesh)) getMeshVertexBuffers(mesh, ctx.device, ctx.queue);
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const slot = ctx.modelBufferIndex++;
        const modelBuffer = ctx.modelUniformBuffers[slot];
        const globalBindGroup = ctx.globalBindGroups[slot];
        const modelPtr = mesh.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
        writePickUniform(ctx, slot, getObjectId(ctx, mesh), 0);
        pass.setBindGroup(0, globalBindGroup);
        pass.setBindGroup(1, ctx.pickBindGroups[slot]);
        if (item.skinned) {
            const skin = mesh.skin;
            if (skin) {
                skin.ensureGpuResources(ctx.device, ctx.skinBindGroupLayout);
                const jointCount = skin.jointCount | 0;
                const jointMatPtr = frameArena.allocF32(jointCount * 16) as WasmPtr;
                animf.computeJointMatricesTo(
                    jointMatPtr,
                    skin.skin.jointIndicesPtr,
                    jointCount,
                    skin.skin.invBindPtr,
                    TransformStore.global().worldPtr as WasmPtr,
                    skin.meshWorldMatrixPtr
                );
                ctx.queue.writeBuffer(skin.boneBuffer!, 0, bytes, jointMatPtr, jointCount * 64);
                pass.setBindGroup(2, skin.bindGroup!);
            }
        }
        if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
        else pass.draw(geometry.vertexCount);
    }
};

const executePointCloudPickDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: PointCloudDrawItem[]): void => {
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastCloud: PointCloud | null = null;
    for (let i = 0; i < items.length; i++) {
        const cloud = items[i].cloud;
        if (!cloud.visible || cloud.pointCount <= 0) continue;
        ensurePointCloudBindGroup(ctx, cloud);
        if (!cloud.bindGroup) continue;
        const pipeline = getOrCreatePickPointCloudPipeline(ctx);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
            lastCloud = null;
        }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const slot = ctx.modelBufferIndex++;
        const modelBuffer = ctx.modelUniformBuffers[slot];
        const globalBindGroup = ctx.globalBindGroups[slot];
        const modelPtr = cloud.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
        writePickUniform(ctx, slot, getObjectId(ctx, cloud), 0);
        pass.setBindGroup(0, globalBindGroup);
        if (cloud !== lastCloud) {
            pass.setBindGroup(1, cloud.bindGroup);
            lastCloud = cloud;
        }
        pass.setBindGroup(2, ctx.pickBindGroups[slot]);
        pass.draw(6, cloud.pointCount);
    }
};

const executeGlyphPickDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: GlyphFieldDrawItem[]): void => {
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastGeometry: Geometry | null = null;
    let lastField: GlyphField | null = null;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const field = item.field;
        const geometry = item.geometry;
        if (!field.visible || field.instanceCount <= 0) continue;
        ensureGlyphFieldBindGroup(ctx, field);
        if (!field.bindGroup) continue;
        const pipeline = getOrCreatePickGlyphFieldPipeline(ctx, field);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
            lastGeometry = null;
            lastField = null;
        }
        if (geometry !== lastGeometry) {
            geometry.upload(ctx.device);
            pass.setVertexBuffer(0, geometry.positionBuffer);
            if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
            lastGeometry = geometry;
        }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const slot = ctx.modelBufferIndex++;
        const modelBuffer = ctx.modelUniformBuffers[slot];
        const globalBindGroup = ctx.globalBindGroups[slot];
        const modelPtr = field.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
        writePickUniform(ctx, slot, getObjectId(ctx, field), 0);
        pass.setBindGroup(0, globalBindGroup);
        if (field !== lastField) {
            pass.setBindGroup(1, field.bindGroup);
            lastField = field;
        }
        pass.setBindGroup(2, ctx.pickBindGroups[slot]);
        if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, field.instanceCount);
        else pass.draw(geometry.vertexCount, field.instanceCount);
    }
};

const executeNodeLinkPickDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: NodeLinkDrawItem[]): void => {
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastGeometry: Geometry | null = null;
    let lastLink: NodeLink | null = null;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const link = item.link;
        ensureNodeLinkBindGroup(ctx, link);
        if (!link.bindGroup) continue;
        const pipeline = getOrCreatePickNodeLinkPipeline(ctx, item.passKind, link);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
            lastGeometry = null;
            lastLink = null;
        }
        if (item.geometry && item.geometry !== lastGeometry) {
            item.geometry.upload(ctx.device);
            pass.setVertexBuffer(0, item.geometry.positionBuffer);
            if (item.geometry.isIndexed) pass.setIndexBuffer(item.geometry.indexBuffer!, "uint32");
            lastGeometry = item.geometry;
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
        const elementBase = (item.passKind === "edge-lines" || item.passKind === "edge-cylinders") ? link.nodeCount : 0;
        writePickUniform(ctx, slot, getObjectId(ctx, link), elementBase);
        pass.setBindGroup(0, globalBindGroup);
        if (link !== lastLink) {
            pass.setBindGroup(1, link.bindGroup);
            lastLink = link;
        }
        pass.setBindGroup(2, ctx.pickBindGroups[slot]);
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

const executeSplatFieldPickDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: SplatFieldDrawItem[]): void => {
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastField: SplatField | null = null;
    for (let i = 0; i < items.length; i++) {
        const field = items[i].field;
        if (!field.visible || field.splatCount <= 0) continue;
        ensureSplatFieldBindGroup(ctx, field);
        if (!field.bindGroup) continue;
        const pipeline = getOrCreatePickSplatFieldPipeline(ctx);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
            lastField = null;
        }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const slot = ctx.modelBufferIndex++;
        const modelBuffer = ctx.modelUniformBuffers[slot];
        const globalBindGroup = ctx.globalBindGroups[slot];
        const modelPtr = field.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
        ctx.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
        writePickUniform(ctx, slot, getObjectId(ctx, field), 0);
        pass.setBindGroup(0, globalBindGroup);
        if (field !== lastField) {
            pass.setBindGroup(1, field.bindGroup);
            lastField = field;
        }
        pass.setBindGroup(2, ctx.pickBindGroups[slot]);
        pass.draw(6, field.splatCount);
    }
};

const executeLatticeSpacePickDrawList = (ctx: RendererContext, pass: GPURenderPassEncoder, items: LatticeSpaceDrawItem[]): void => {
    const bytes = driver.bytes();
    let lastPipeline: GPURenderPipeline | null = null;
    let lastSpace: LatticeSpace | null = null;
    for (const item of items) {
        const space = item.space;
        if (!space.visible || space.drawCellCount <= 0) continue;
        ensureLatticeSpaceBindGroup(ctx, space);
        if (!space.bindGroup) continue;
        const pipeline = getOrCreatePickLatticeSpacePipeline(ctx, space);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
            lastSpace = null;
        }
        if (ctx.modelBufferIndex >= ctx.modelUniformBuffers.length) ensureModelBufferPool(ctx, ctx.modelBufferIndex + 1);
        const slot = ctx.modelBufferIndex++;
        const modelPtr = space.transform.worldMatrixPtr as WasmPtr;
        const invPtr = ctx.modelUniformStagingPtr;
        const normalPtr = (ctx.modelUniformStagingPtr + 64) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        ctx.queue.writeBuffer(ctx.modelUniformBuffers[slot], 0, bytes, modelPtr, 64);
        ctx.queue.writeBuffer(ctx.modelUniformBuffers[slot], 64, bytes, normalPtr, 64);
        writePickUniform(ctx, slot, getObjectId(ctx, space), 0);
        pass.setBindGroup(0, ctx.globalBindGroups[slot]);
        if (space !== lastSpace) {
            pass.setBindGroup(1, space.bindGroup);
            lastSpace = space;
        }
        pass.setBindGroup(2, ctx.pickBindGroups[slot]);
        if (space.dimensionCount === 2) pass.draw(6);
        else pass.draw(36, space.drawCellCount);
    }
};

const getOrCreatePickMeshPipeline = (ctx: RendererContext, material: Material, skinned: boolean, skinned8: boolean, mirrored: boolean = false): GPURenderPipeline => {
    if (skinned8 && !skinned) skinned = true;
    const cullMode = getCullMode(ctx, material.cullMode);
    const key = `pick:mesh:${cullMode}:${mirrored ? "cw" : "ccw"}:${skinned8 ? "skin8" : skinned ? "skin4" : "noskin"}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    const shaderCode = skinned8 ? pickMeshSkinned8WGSL : skinned ? pickMeshSkinnedWGSL : pickMeshWGSL;
    let shaderModule = ctx.shaderCache.get(shaderCode);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: shaderCode });
        ctx.shaderCache.set(shaderCode, shaderModule);
    }
    const bindGroupLayouts: GPUBindGroupLayout[] = [ctx.globalBindGroupLayout, getPickBindGroupLayout(ctx)];
    if (skinned) bindGroupLayouts.push(ctx.skinBindGroupLayout);
    const pipelineLayout = ctx.device.createPipelineLayout({ bindGroupLayouts });
    let buffers: GPUVertexBufferLayout[];
    if (skinned8) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 5, offset: 0, format: "uint16x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 6, offset: 0, format: "float32x4" }] }
        ];
    } else if (skinned) {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
            { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
            { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] }
        ];
    } else {
        buffers = [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }
        ];
    }
    const pipeline = ctx.device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{ format: "rg32uint" }, { format: "r32float" }]
        },
        primitive: {
            topology: "triangle-list",
            cullMode,
            frontFace: mirrored ? "cw" : "ccw"
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

const getOrCreatePickPointCloudPipeline = (ctx: RendererContext): GPURenderPipeline => {
    const key = "pick:pointcloud";
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(pickPointCloudWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: pickPointCloudWGSL });
        ctx.shaderCache.set(pickPointCloudWGSL, shaderModule);
    }
    const pipelineLayout = ctx.device.createPipelineLayout({
        bindGroupLayouts: [ctx.globalBindGroupLayout, getPointCloudBindGroupLayout(ctx), getPickBindGroupLayout(ctx)]
    });
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
            targets: [{ format: "rg32uint" }, { format: "r32float" }]
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

const getOrCreatePickGlyphFieldPipeline = (ctx: RendererContext, field: GlyphField): GPURenderPipeline => {
    const cullMode = getCullMode(ctx, field.cullMode);
    const key = `pick:glyphfield:${cullMode}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(pickGlyphFieldWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: pickGlyphFieldWGSL });
        ctx.shaderCache.set(pickGlyphFieldWGSL, shaderModule);
    }
    const pipelineLayout = ctx.device.createPipelineLayout({
        bindGroupLayouts: [ctx.globalBindGroupLayout, getGlyphFieldBindGroupLayout(ctx), getPickBindGroupLayout(ctx)]
    });
    const pipeline = ctx.device.createRenderPipeline({
        label: key,
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 12,
                    attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
                }
            ]
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fs_main",
            targets: [{ format: "rg32uint" }, { format: "r32float" }]
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

const getOrCreatePickNodeLinkPipeline = (ctx: RendererContext, passKind: NodeLinkDrawItem["passKind"], link: NodeLink): GPURenderPipeline => {
    const cullMode = (passKind === "node-solid" || passKind === "edge-cylinders") ? getCullMode(ctx, link.cullMode) : "none";
    const key = `pick:nodelink:${passKind}:${cullMode}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(pickNodeLinkWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: pickNodeLinkWGSL });
        ctx.shaderCache.set(pickNodeLinkWGSL, shaderModule);
    }
    const layout = ctx.device.createPipelineLayout({
        bindGroupLayouts: [ctx.globalBindGroupLayout, getNodeLinkBindGroupLayout(ctx), getPickBindGroupLayout(ctx)]
    });
    let entryPoint = "vs_pick_node_points";
    let buffers: GPUVertexBufferLayout[] = [];
    let topology: GPUPrimitiveTopology = "triangle-list";
    if (passKind === "node-solid") {
        entryPoint = "vs_pick_node_solid";
        buffers = [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }];
        topology = "triangle-list";
    } else if (passKind === "edge-lines") {
        entryPoint = "vs_pick_edge_lines";
        buffers = [];
        topology = "line-list";
    } else if (passKind === "edge-cylinders") {
        entryPoint = "vs_pick_edge_cylinders";
        buffers = [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }];
        topology = "triangle-list";
    }
    const pipeline = ctx.device.createRenderPipeline({
        label: key,
        layout,
        vertex: { module: shaderModule, entryPoint, buffers },
        fragment: { module: shaderModule, entryPoint: "fs_pick", targets: [{ format: "rg32uint" }, { format: "r32float" }] },
        primitive: { topology, cullMode },
        depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

const getOrCreatePickSplatFieldPipeline = (ctx: RendererContext): GPURenderPipeline => {
    const key = "pick:splatfield";
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = ctx.shaderCache.get(pickSplatFieldWGSL);
    if (!shaderModule) {
        shaderModule = ctx.device.createShaderModule({ code: pickSplatFieldWGSL });
        ctx.shaderCache.set(pickSplatFieldWGSL, shaderModule);
    }
    const pipelineLayout = ctx.device.createPipelineLayout({
        bindGroupLayouts: [ctx.globalBindGroupLayout, getSplatFieldBindGroupLayout(ctx), getPickBindGroupLayout(ctx)]
    });
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
            targets: [{ format: "rg32uint" }, { format: "r32float" }]
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

const getOrCreatePickLatticeSpacePipeline = (ctx: RendererContext, space: LatticeSpace): GPURenderPipeline => {
    const cullMode = space.dimensionCount === 2 ? "none" : getCullMode(ctx, space.cullMode);
    const key = `pick:latticespace:${space.dimensionCount}:${cullMode}`;
    const cached = ctx.pipelineCache.get(key);
    if (cached) return cached;
    let module = ctx.shaderCache.get(pickLatticeSpaceWGSL);
    if (!module) {
        module = ctx.device.createShaderModule({ code: pickLatticeSpaceWGSL });
        ctx.shaderCache.set(pickLatticeSpaceWGSL, module);
    }
    const pipeline = ctx.device.createRenderPipeline({
        label: key,
        layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [ctx.globalBindGroupLayout, getLatticeSpaceBindGroupLayout(ctx), getPickBindGroupLayout(ctx)] }),
        vertex: { module, entryPoint: space.dimensionCount === 2 ? "vs_2d" : "vs_3d", buffers: [] },
        fragment: { module, entryPoint: "fs_main", targets: [{ format: "rg32uint" }, { format: "r32float" }] },
        primitive: { topology: "triangle-list", cullMode },
        depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" }
    });
    ctx.pipelineCache.set(key, pipeline);
    return pipeline;
};

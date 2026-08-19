/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { StandardMaterial, UnlitMaterial } from "../graphics/material";
import { getShadowRuntimeState, setShadowRuntimeClean, ShadowRuntimeState } from "../effects/shadows";
import { driver, frameArena, transformf, wasm } from "../wasm";
import type { WasmPtr } from "../wasm";
import { Camera, OrthographicCamera, PerspectiveCamera } from "../world/camera";
import { DirectionalLight, resolveLightDirection } from "../world/light";
import { getMeshLocalBoundsSource, getMeshVertexBuffers, hasMeshMorphRuntime, Mesh } from "../world/mesh";
import { Scene } from "../world/scene";
import { TransformStore } from "./transform";
import type { RendererContext } from "./context";
import { warmSkinResources } from "./objects";
import shadowCasterWGSL from "../../wgsl/effects/shadow-caster.wgsl";
import shadowCasterInstancedWGSL from "../../wgsl/effects/shadow-caster-instanced.wgsl";
import shadowCasterSkinnedWGSL from "../../wgsl/effects/shadow-caster-skinned.wgsl";
import shadowCasterSkinned8WGSL from "../../wgsl/effects/shadow-caster-skinned8.wgsl";

type ActiveShadowView = {
    light: DirectionalLight | null;
    shadow: ShadowRuntimeState | null;
    lightIndex: number;
    layer: number;
    matrix: Float32Array;
    update: boolean;
};

type ShadowCaster = {
    mesh: Mesh | null;
    positionBuffer: GPUBuffer | null;
    skinned: boolean;
    skinned8: boolean;
    instanceCount: number;
    instanceOffset: number;
};

const SHADOW_METADATA_FLOATS = Scene.MAX_LIGHTS * 20;
const DYNAMIC_UNIFORM_STRIDE_FLOATS = 64;
const EMPTY_F32 = new Float32Array(0);

const writeOrthographic = (out: Float32Array, left: number, right: number, bottom: number, top: number, near: number, far: number): void => {
    const lr = 1 / (left - right), bt = 1 / (bottom - top), nf = 1 / (near - far);
    out[0] = -2 * lr; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = -2 * bt; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = nf; out[11] = 0;
    out[12] = (left + right) * lr; out[13] = (top + bottom) * bt; out[14] = near * nf; out[15] = 1;
};

const multiplyMatrices = (out: Float32Array, a: Float32Array, b: Float32Array): void => {
    for (let column = 0; column < 4; column++) {
        const c = column * 4;
        for (let row = 0; row < 4; row++) out[c + row] = a[row] * b[c] + a[4 + row] * b[c + 1] + a[8 + row] * b[c + 2] + a[12 + row] * b[c + 3];
    }
};

const multiplyMatrixRanges = (out: Float32Array, a: Float32Array, aOffset: number, b: Float32Array, bOffset: number): void => {
    for (let column = 0; column < 4; column++) {
        const c = column * 4, bc = bOffset + c, b0 = b[bc], b1 = b[bc + 1], b2 = b[bc + 2], b3 = b[bc + 3];
        out[c] = a[aOffset] * b0 + a[aOffset + 4] * b1 + a[aOffset + 8] * b2 + a[aOffset + 12] * b3;
        out[c + 1] = a[aOffset + 1] * b0 + a[aOffset + 5] * b1 + a[aOffset + 9] * b2 + a[aOffset + 13] * b3;
        out[c + 2] = a[aOffset + 2] * b0 + a[aOffset + 6] * b1 + a[aOffset + 10] * b2 + a[aOffset + 14] * b3;
        out[c + 3] = a[aOffset + 3] * b0 + a[aOffset + 7] * b1 + a[aOffset + 11] * b2 + a[aOffset + 15] * b3;
    }
};

const projectedSphereExtent = (matrix: Float32Array, offset: number, axisX: number, axisY: number, axisZ: number, radius: number): number => {
    const localX = axisX * matrix[offset] + axisY * matrix[offset + 1] + axisZ * matrix[offset + 2], localY = axisX * matrix[offset + 4] + axisY * matrix[offset + 5] + axisZ * matrix[offset + 6], localZ = axisX * matrix[offset + 8] + axisY * matrix[offset + 9] + axisZ * matrix[offset + 10];
    return radius * Math.hypot(localX, localY, localZ);
};

export class RendererShadows {
    private readonly ctx: RendererContext;
    private texture: GPUTexture | null = null;
    private arrayView: GPUTextureView | null = null;
    private layerViews: GPUTextureView[] = [];
    private sampler: GPUSampler | null = null;
    private metadataBuffer: GPUBuffer | null = null;
    private viewBuffer: GPUBuffer | null = null;
    private modelBuffer: GPUBuffer | null = null;
    private instanceBuffer: GPUBuffer | null = null;
    private receiverLayout: GPUBindGroupLayout | null = null;
    private receiverBindGroup: GPUBindGroup | null = null;
    private viewLayout: GPUBindGroupLayout | null = null;
    private viewBindGroup: GPUBindGroup | null = null;
    private modelLayout: GPUBindGroupLayout | null = null;
    private modelBindGroup: GPUBindGroup | null = null;
    private pipelineStatic: GPURenderPipeline | null = null;
    private pipelineInstanced: GPURenderPipeline | null = null;
    private pipelineSkinned: GPURenderPipeline | null = null;
    private pipelineSkinned8: GPURenderPipeline | null = null;
    private pipelineDepthBias: number = Number.NaN;
    private pipelineDepthBiasSlopeScale: number = Number.NaN;
    private pipelineDepthBiasClamp: number = Number.NaN;
    private resourceRevision: number = -1;
    private metadataRevision: number = -1;
    private resourceMapSize: number = 0;
    private resourceMaxViews: number = 0;
    private resourceFilter: "hard" | "pcf" | null = null;
    private modelCapacity: number = 0;
    private instanceCapacityBytes: number = 0;
    private modelScratch: Float32Array = EMPTY_F32;
    private readonly metadataScratch: Float32Array = new Float32Array(SHADOW_METADATA_FLOATS);
    private viewScratch: Float32Array = EMPTY_F32;
    private readonly activeViews: ActiveShadowView[] = [];
    private activeViewsUsed: number = 0;
    private readonly casters: ShadowCaster[] = [];
    private castersUsed: number = 0;
    private matrixCache: WeakMap<DirectionalLight, Float32Array> = new WeakMap();
    private layerCache: WeakMap<DirectionalLight, number> = new WeakMap();
    private readonly layerOwners: Array<DirectionalLight | null> = [];
    private readonly frustumCorners: Float32Array = new Float32Array(24);
    private readonly viewMatrixScratch: Float32Array = new Float32Array(16);
    private readonly projectionMatrixScratch: Float32Array = new Float32Array(16);
    private readonly skinWorldMatrixScratch: Float32Array = new Float32Array(16);
    private _casterPreparationSerial: number = 0;
    private _instancedCasterRunCount: number = 0;

    constructor(ctx: RendererContext) {
        this.ctx = ctx;
    }

    get activeViewCount(): number {
        return this.activeViewsUsed;
    }

    get casterCount(): number {
        return this.castersUsed;
    }

    get casterPreparationSerial(): number {
        return this._casterPreparationSerial;
    }

    get instancedCasterRunCount(): number {
        return this._instancedCasterRunCount;
    }

    get hasResources(): boolean {
        return this.texture !== null;
    }

    hasCaster(mesh: Mesh): boolean {
        for (let i = 0; i < this.castersUsed; i++) if (this.casters[i].mesh === mesh) return true;
        return false;
    }

    getViewProjection(light: DirectionalLight): Float32Array | null {
        const matrix = this.matrixCache.get(light);
        return matrix ? new Float32Array(matrix) : null;
    }

    get bindGroupLayout(): GPUBindGroupLayout {
        if (!this.receiverLayout) throw new Error("Renderer shadows: receiver resources are not active.");
        return this.receiverLayout;
    }

    prepare(scene: Scene, camera: Camera): void {
        const system = this.ctx.effects.shadows;
        const { lights } = scene.getLightingData();
        this.activeViewsUsed = 0;
        for (let lightIndex = 0; lightIndex < lights.length && this.activeViewsUsed < system.maxViews; lightIndex++) {
            const light = lights[lightIndex];
            if (!(light instanceof DirectionalLight)) continue;
            const shadow = getShadowRuntimeState(system, light);
            if (!shadow) continue;
            const layer = this.activeViewsUsed;
            const layerChanged = this.layerCache.get(light) !== layer;
            const layerOwnerChanged = this.layerOwners[layer] !== light;
            let matrix = this.matrixCache.get(light);
            const update = shadow.updateMode === "always" || shadow.dirty || layerChanged || layerOwnerChanged || !matrix;
            if (!matrix) { matrix = new Float32Array(16); this.matrixCache.set(light, matrix); }
            if (update) this.fitDirectionalView(matrix, scene, camera, light, shadow, system.mapSize);
            this.layerCache.set(light, layer);
            const view = this.acquireActiveView(this.activeViewsUsed++);
            view.light = light;
            view.shadow = shadow;
            view.lightIndex = lightIndex;
            view.layer = layer;
            view.matrix = matrix;
            view.update = update;
        }
        if (this.activeViewsUsed === 0) {
            this.destroyResources();
            this.castersUsed = 0;
            return;
        }
        const resourcesCreated = this.ensureResources();
        let anyUpdate = resourcesCreated;
        for (let i = 0; i < this.activeViewsUsed; i++) {
            const view = this.activeViews[i];
            if (resourcesCreated) view.update = true;
            anyUpdate ||= view.update;
        }
        if (anyUpdate || this.metadataRevision !== system.revision) this.prepareMetadata();
        if (anyUpdate) this.prepareCasters(scene);
        else this.castersUsed = 0;
    }

    encode(encoder: GPUCommandEncoder): void {
        if (!this.texture || !this.viewBindGroup || !this.modelBindGroup) return;
        for (let viewIndex = 0; viewIndex < this.activeViewsUsed; viewIndex++) {
            const view = this.activeViews[viewIndex];
            if (!view.update) continue;
            const pass = encoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.layerViews[view.layer], depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
            pass.setBindGroup(0, this.viewBindGroup, [view.layer * 256]);
            let lastPipeline: GPURenderPipeline | null = null;
            for (let i = 0; i < this.castersUsed; i++) {
                const caster = this.casters[i];
                if (caster.instanceCount === 0) continue;
                const mesh = caster.mesh!;
                const geometry = mesh.geometry;
                const instanced = caster.instanceCount > 1;
                const pipeline = this.getCasterPipeline(caster.skinned, caster.skinned8, instanced);
                if (pipeline !== lastPipeline) { pass.setPipeline(pipeline); lastPipeline = pipeline; }
                pass.setVertexBuffer(0, caster.positionBuffer!);
                if (instanced) pass.setVertexBuffer(1, this.instanceBuffer!, caster.instanceOffset, caster.instanceCount * this.ctx.INSTANCE_STRIDE_BYTES);
                else if (caster.skinned) { pass.setVertexBuffer(1, geometry.skinInfluenceBuffer!); pass.setBindGroup(2, mesh.skin!.bindGroup!); }
                if (!instanced) pass.setBindGroup(1, this.modelBindGroup, [i * 256]);
                if (geometry.isIndexed) {
                    pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                    pass.drawIndexed(geometry.indexCount, caster.instanceCount);
                } else pass.draw(geometry.vertexCount, caster.instanceCount);
            }
            pass.end();
            if (view.light) { this.layerOwners[view.layer] = view.light; setShadowRuntimeClean(this.ctx.effects.shadows, view.light); }
        }
    }

    warmup(): void {
        if (this.activeViewsUsed === 0) return;
        this.getCasterPipeline(false, false, false);
        for (let i = 0; i < this.castersUsed; i++) {
            const caster = this.casters[i];
            if (caster.instanceCount === 0) continue;
            this.getCasterPipeline(caster.skinned, caster.skinned8, caster.instanceCount > 1);
        }
    }

    bindReceiver(pass: GPURenderPassEncoder, skinned: boolean): void {
        if (this.receiverBindGroup) pass.setBindGroup(skinned ? 3 : 2, this.receiverBindGroup);
    }

    destroy(): void {
        this.destroyResources();
        this.activeViewsUsed = 0;
        this.castersUsed = 0;
        this.matrixCache = new WeakMap();
        this.layerCache = new WeakMap();
    }

    private acquireActiveView(index: number): ActiveShadowView {
        let view = this.activeViews[index];
        if (!view) { view = { light: null, shadow: null, lightIndex: 0, layer: 0, matrix: new Float32Array(16), update: false }; this.activeViews[index] = view; }
        return view;
    }

    private acquireCaster(index: number): ShadowCaster {
        let caster = this.casters[index];
        if (!caster) { caster = { mesh: null, positionBuffer: null, skinned: false, skinned8: false, instanceCount: 1, instanceOffset: 0 }; this.casters[index] = caster; }
        return caster;
    }

    private writeCameraFrustumCorners(camera: Camera, distance: number): void {
        const world = camera.transform.worldMatrix;
        const px = world[12], py = world[13], pz = world[14];
        const rx = world[0], ry = world[1], rz = world[2];
        const ux = world[4], uy = world[5], uz = world[6];
        const fx = -world[8], fy = -world[9], fz = -world[10];
        let near = 0.1, far = distance;
        let nearLeft: number, nearRight: number, nearBottom: number, nearTop: number;
        let farLeft: number, farRight: number, farBottom: number, farTop: number;
        if (camera instanceof PerspectiveCamera) {
            near = camera.near;
            far = Math.max(near + 1e-4, Math.min(Number.isFinite(camera.far) ? camera.far : distance, distance));
            const tangent = Math.tan(camera.fov * Math.PI / 360);
            nearTop = tangent * near; nearBottom = -nearTop; nearRight = nearTop * camera.aspect; nearLeft = -nearRight;
            farTop = tangent * far; farBottom = -farTop; farRight = farTop * camera.aspect; farLeft = -farRight;
        } else if (camera instanceof OrthographicCamera) {
            near = camera.near;
            far = Math.max(near + 1e-4, Math.min(camera.far, near + distance));
            nearLeft = farLeft = camera.left; nearRight = farRight = camera.right;
            nearBottom = farBottom = camera.bottom; nearTop = farTop = camera.top;
        } else {
            nearLeft = nearBottom = farLeft = farBottom = -distance * 0.5;
            nearRight = nearTop = farRight = farTop = distance * 0.5;
        }
        const corners = this.frustumCorners;
        let offset = 0;
        for (let plane = 0; plane < 2; plane++) {
            const z = plane === 0 ? near : far;
            const left = plane === 0 ? nearLeft : farLeft;
            const right = plane === 0 ? nearRight : farRight;
            const bottom = plane === 0 ? nearBottom : farBottom;
            const top = plane === 0 ? nearTop : farTop;
            for (let yIndex = 0; yIndex < 2; yIndex++) {
                const y = yIndex === 0 ? bottom : top;
                for (let xIndex = 0; xIndex < 2; xIndex++) {
                    const x = xIndex === 0 ? left : right;
                    corners[offset++] = px + rx * x + ux * y + fx * z;
                    corners[offset++] = py + ry * x + uy * y + fy * z;
                    corners[offset++] = pz + rz * x + uz * y + fz * z;
                }
            }
        }
    }

    private fitDirectionalView(out: Float32Array, scene: Scene, camera: Camera, light: DirectionalLight, shadow: ShadowRuntimeState, mapSize: number): void {
        const lightDirection = resolveLightDirection(light);
        const directionLength = Math.hypot(lightDirection[0], lightDirection[1], lightDirection[2]) || 1;
        const dx = lightDirection[0] / directionLength, dy = lightDirection[1] / directionLength, dz = lightDirection[2] / directionLength;
        const candidateUpX = Math.abs(dy) > 0.98 ? 1 : 0, candidateUpY = Math.abs(dy) > 0.98 ? 0 : 1;
        let rx = dy * 0 - dz * candidateUpY, ry = dz * candidateUpX - dx * 0, rz = dx * candidateUpY - dy * candidateUpX;
        const rightLength = Math.hypot(rx, ry, rz) || 1;
        rx /= rightLength; ry /= rightLength; rz /= rightLength;
        const ux = ry * dz - rz * dy, uy = rz * dx - rx * dz, uz = rx * dy - ry * dx;
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        if (shadow.volume) {
            const center = shadow.volume.center;
            const centerX = center[0] * rx + center[1] * ry + center[2] * rz;
            const centerY = center[0] * ux + center[1] * uy + center[2] * uz;
            const centerZ = center[0] * dx + center[1] * dy + center[2] * dz;
            minX = centerX - shadow.volume.width * 0.5; maxX = centerX + shadow.volume.width * 0.5;
            minY = centerY - shadow.volume.height! * 0.5; maxY = centerY + shadow.volume.height! * 0.5;
            minZ = centerZ - shadow.volume.depth! * 0.5; maxZ = centerZ + shadow.volume.depth! * 0.5;
        } else {
            this.writeCameraFrustumCorners(camera, shadow.distance);
            for (let i = 0; i < 24; i += 3) {
                const x = this.frustumCorners[i], y = this.frustumCorners[i + 1], z = this.frustumCorners[i + 2];
                const lightX = x * rx + y * ry + z * rz;
                const lightY = x * ux + y * uy + z * uz;
                const lightZ = x * dx + y * dy + z * dz;
                if (lightX < minX) minX = lightX; if (lightX > maxX) maxX = lightX;
                if (lightY < minY) minY = lightY; if (lightY > maxY) maxY = lightY;
                if (lightZ < minZ) minZ = lightZ; if (lightZ > maxZ) maxZ = lightZ;
            }
            const storeF32 = TransformStore.global().f32();
            for (const mesh of scene.meshes) {
                if (mesh.destroyed || !mesh.visible || !mesh.castShadow) continue;
                const bounds = getMeshLocalBoundsSource(mesh);
                const matrixBase = mesh.transform.worldMatrixPtr >>> 2;
                const localCenter = bounds.boundsCenter;
                const worldX = storeF32[matrixBase] * localCenter[0] + storeF32[matrixBase + 4] * localCenter[1] + storeF32[matrixBase + 8] * localCenter[2] + storeF32[matrixBase + 12], worldY = storeF32[matrixBase + 1] * localCenter[0] + storeF32[matrixBase + 5] * localCenter[1] + storeF32[matrixBase + 9] * localCenter[2] + storeF32[matrixBase + 13], worldZ = storeF32[matrixBase + 2] * localCenter[0] + storeF32[matrixBase + 6] * localCenter[1] + storeF32[matrixBase + 10] * localCenter[2] + storeF32[matrixBase + 14];
                const localRadius = bounds.boundsRadius;
                const lightX = worldX * rx + worldY * ry + worldZ * rz, lightY = worldX * ux + worldY * uy + worldZ * uz, lightZ = worldX * dx + worldY * dy + worldZ * dz;
                const extentX = projectedSphereExtent(storeF32, matrixBase, rx, ry, rz, localRadius), extentY = projectedSphereExtent(storeF32, matrixBase, ux, uy, uz, localRadius), extentZ = projectedSphereExtent(storeF32, matrixBase, dx, dy, dz, localRadius);
                let casterMinX = lightX - extentX, casterMaxX = lightX + extentX, casterMinY = lightY - extentY, casterMaxY = lightY + extentY, casterMinZ = lightZ - extentZ, casterMaxZ = lightZ + extentZ;
                const skinInstance = mesh.skin;
                const usesSkinning = skinInstance !== null && mesh.geometry.hasSkinAttributes && (mesh.material instanceof StandardMaterial || mesh.material instanceof UnlitMaterial);
                if (usesSkinning) {
                    const skin = skinInstance.skin;
                    const inverseBind = wasm.f32view(skin.invBindPtr, skin.jointCount * 16);
                    for (let jointIndex = 0; jointIndex < skin.jointCount; jointIndex++) {
                        const joint = skin.joints[jointIndex];
                        if (joint.disposed) continue;
                        multiplyMatrixRanges(this.skinWorldMatrixScratch, storeF32, joint.worldMatrixPtr >>> 2, inverseBind, jointIndex * 16);
                        const matrix = this.skinWorldMatrixScratch;
                        const skinnedWorldX = matrix[0] * localCenter[0] + matrix[4] * localCenter[1] + matrix[8] * localCenter[2] + matrix[12], skinnedWorldY = matrix[1] * localCenter[0] + matrix[5] * localCenter[1] + matrix[9] * localCenter[2] + matrix[13], skinnedWorldZ = matrix[2] * localCenter[0] + matrix[6] * localCenter[1] + matrix[10] * localCenter[2] + matrix[14];
                        const skinnedLightX = skinnedWorldX * rx + skinnedWorldY * ry + skinnedWorldZ * rz, skinnedLightY = skinnedWorldX * ux + skinnedWorldY * uy + skinnedWorldZ * uz, skinnedLightZ = skinnedWorldX * dx + skinnedWorldY * dy + skinnedWorldZ * dz;
                        const skinnedExtentX = projectedSphereExtent(matrix, 0, rx, ry, rz, localRadius), skinnedExtentY = projectedSphereExtent(matrix, 0, ux, uy, uz, localRadius), skinnedExtentZ = projectedSphereExtent(matrix, 0, dx, dy, dz, localRadius);
                        casterMinX = Math.min(casterMinX, skinnedLightX - skinnedExtentX); casterMaxX = Math.max(casterMaxX, skinnedLightX + skinnedExtentX);
                        casterMinY = Math.min(casterMinY, skinnedLightY - skinnedExtentY); casterMaxY = Math.max(casterMaxY, skinnedLightY + skinnedExtentY);
                        casterMinZ = Math.min(casterMinZ, skinnedLightZ - skinnedExtentZ); casterMaxZ = Math.max(casterMaxZ, skinnedLightZ + skinnedExtentZ);
                    }
                }
                if (casterMaxX < minX || casterMinX > maxX || casterMaxY < minY || casterMinY > maxY) continue;
                if (casterMinZ < minZ) minZ = casterMinZ;
                if (casterMaxZ > maxZ) maxZ = casterMaxZ;
            }
        }
        const rawWidth = Math.max(0.01, maxX - minX), rawHeight = Math.max(0.01, maxY - minY);
        const stabilizationScale = mapSize > 2 ? mapSize / (mapSize - 2) : 2;
        const width = rawWidth * stabilizationScale, height = rawHeight * stabilizationScale;
        const depthPadding = Math.max(0.1, (maxZ - minZ) * 0.02), depth = Math.max(0.01, maxZ - minZ + depthPadding * 2);
        let centerX = (minX + maxX) * 0.5, centerY = (minY + maxY) * 0.5;
        const centerZ = (minZ + maxZ) * 0.5;
        centerX = Math.round(centerX / (width / mapSize)) * (width / mapSize); centerY = Math.round(centerY / (height / mapSize)) * (height / mapSize);
        const centerWorldX = rx * centerX + ux * centerY + dx * centerZ, centerWorldY = ry * centerX + uy * centerY + dy * centerZ, centerWorldZ = rz * centerX + uz * centerY + dz * centerZ;
        const eyeX = centerWorldX - dx * depth * 0.5, eyeY = centerWorldY - dy * depth * 0.5, eyeZ = centerWorldZ - dz * depth * 0.5;
        const view = this.viewMatrixScratch;
        view[0] = rx; view[1] = ux; view[2] = -dx; view[3] = 0;
        view[4] = ry; view[5] = uy; view[6] = -dy; view[7] = 0;
        view[8] = rz; view[9] = uz; view[10] = -dz; view[11] = 0;
        view[12] = -(rx * eyeX + ry * eyeY + rz * eyeZ); view[13] = -(ux * eyeX + uy * eyeY + uz * eyeZ); view[14] = dx * eyeX + dy * eyeY + dz * eyeZ; view[15] = 1;
        writeOrthographic(this.projectionMatrixScratch, -width * 0.5, width * 0.5, -height * 0.5, height * 0.5, 0, depth);
        multiplyMatrices(out, this.projectionMatrixScratch, view);
    }

    private ensureResources(): boolean {
        const system = this.ctx.effects.shadows;
        const incompatible = this.resourceRevision !== system.revision && (this.resourceMapSize !== system.mapSize || this.resourceMaxViews !== system.maxViews);
        if (this.texture && !incompatible) { this.resourceRevision = system.revision; if (this.resourceFilter !== system.filter) this.createReceiverSamplerAndBindGroup(); return false; }
        this.destroyResources();
        const device = this.ctx.device;
        this.resourceMapSize = system.mapSize;
        this.resourceMaxViews = system.maxViews;
        this.resourceRevision = system.revision;
        this.texture = device.createTexture({ label: "WasmGPU shadow map array", size: { width: system.mapSize, height: system.mapSize, depthOrArrayLayers: system.maxViews }, format: "depth32float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
        this.arrayView = this.texture.createView({ dimension: "2d-array", arrayLayerCount: system.maxViews });
        this.layerViews = Array.from({ length: system.maxViews }, (_, layer) => this.texture!.createView({ dimension: "2d", baseArrayLayer: layer, arrayLayerCount: 1 }));
        this.metadataBuffer = device.createBuffer({ size: SHADOW_METADATA_FLOATS * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.viewBuffer = device.createBuffer({ size: system.maxViews * 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.viewScratch = new Float32Array(system.maxViews * DYNAMIC_UNIFORM_STRIDE_FLOATS);
        this.receiverLayout = device.createBindGroupLayout({ entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "depth", viewDimension: "2d-array" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "comparison" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform", minBindingSize: SHADOW_METADATA_FLOATS * 4 } }
        ] });
        this.createReceiverSamplerAndBindGroup();
        this.viewLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 64 } }] });
        this.viewBindGroup = device.createBindGroup({ layout: this.viewLayout, entries: [{ binding: 0, resource: { buffer: this.viewBuffer, size: 64 } }] });
        this.modelLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 64 } }] });
        this.ensureModelCapacity(1);
        return true;
    }

    private createReceiverSamplerAndBindGroup(): void {
        const filter = this.ctx.effects.shadows.filter;
        this.resourceFilter = filter;
        this.sampler = this.ctx.device.createSampler({
            compare: "less-equal",
            minFilter: filter === "pcf" ? "linear" : "nearest",
            magFilter: filter === "pcf" ? "linear" : "nearest",
            addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"
        });
        this.receiverBindGroup = this.ctx.device.createBindGroup({ layout: this.receiverLayout!, entries: [{ binding: 0, resource: this.arrayView! }, { binding: 1, resource: this.sampler }, { binding: 2, resource: { buffer: this.metadataBuffer! } }] });
    }

    private ensureModelCapacity(count: number): void {
        if (this.modelBuffer && count <= this.modelCapacity) return;
        let capacity = Math.max(64, this.modelCapacity);
        while (capacity < count) capacity *= 2;
        this.modelBuffer?.destroy();
        this.modelCapacity = capacity;
        this.modelScratch = new Float32Array(capacity * DYNAMIC_UNIFORM_STRIDE_FLOATS);
        this.modelBuffer = this.ctx.device.createBuffer({ size: capacity * 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.modelBindGroup = this.ctx.device.createBindGroup({ layout: this.modelLayout!, entries: [{ binding: 0, resource: { buffer: this.modelBuffer, size: 64 } }] });
    }

    private prepareMetadata(): void {
        const system = this.ctx.effects.shadows;
        const filter = system.filter === "pcf" ? 1 : 0;
        this.metadataScratch.fill(0);
        for (let i = 0; i < Scene.MAX_LIGHTS; i++) this.metadataScratch[i * 20 + 16] = -1;
        this.viewScratch.fill(0);
        for (let i = 0; i < this.activeViewsUsed; i++) {
            const view = this.activeViews[i];
            this.viewScratch.set(view.matrix, view.layer * DYNAMIC_UNIFORM_STRIDE_FLOATS);
            const offset = view.lightIndex * 20;
            this.metadataScratch.set(view.matrix, offset);
            this.metadataScratch[offset + 16] = view.layer;
            this.metadataScratch[offset + 17] = view.shadow!.bias;
            this.metadataScratch[offset + 18] = view.shadow!.normalBias;
            this.metadataScratch[offset + 19] = filter;
        }
        this.ctx.queue.writeBuffer(this.viewBuffer!, 0, this.viewScratch);
        this.ctx.queue.writeBuffer(this.metadataBuffer!, 0, this.metadataScratch);
        this.metadataRevision = system.revision;
    }

    private prepareCasters(scene: Scene): void {
        this.castersUsed = 0;
        this._instancedCasterRunCount = 0;
        this._casterPreparationSerial++;
        for (const mesh of scene.meshes) {
            if (mesh.destroyed || !mesh.visible || !mesh.castShadow) continue;
            const geometry = mesh.geometry;
            geometry.upload(this.ctx.device);
            const buffers = getMeshVertexBuffers(mesh, this.ctx.device, this.ctx.queue);
            const supportedSkin = mesh.material instanceof StandardMaterial || mesh.material instanceof UnlitMaterial;
            const skinned = supportedSkin && mesh.skin !== null && geometry.hasSkinAttributes;
            if (skinned) warmSkinResources(this.ctx, mesh.skin);
            const caster = this.acquireCaster(this.castersUsed++);
            caster.mesh = mesh;
            caster.positionBuffer = buffers.positionBuffer;
            caster.skinned = skinned;
            caster.skinned8 = skinned && geometry.hasSkin8Attributes;
            caster.instanceCount = 1;
            caster.instanceOffset = 0;
        }
        this.ensureModelCapacity(Math.max(1, this.castersUsed));
        this.modelScratch.fill(0, 0, this.castersUsed * DYNAMIC_UNIFORM_STRIDE_FLOATS);
        const store = TransformStore.global();
        const storeF32 = store.f32();
        for (let i = 0; i < this.castersUsed; i++) {
            const source = this.casters[i].mesh!.transform.worldMatrixPtr >>> 2;
            const destination = i * DYNAMIC_UNIFORM_STRIDE_FLOATS;
            for (let component = 0; component < 16; component++) this.modelScratch[destination + component] = storeF32[source + component];
        }
        if (this.castersUsed > 0) this.ctx.queue.writeBuffer(this.modelBuffer!, 0, this.modelScratch.buffer, 0, this.castersUsed * 256);
        let totalInstanceBytes = 0;
        for (let i = 0; i < this.castersUsed; ) {
            const first = this.casters[i];
            if (first.skinned || hasMeshMorphRuntime(first.mesh!)) { i++; continue; }
            const geometry = first.mesh!.geometry;
            let end = i + 1;
            while (end < this.castersUsed) {
                const next = this.casters[end];
                if (next.skinned || hasMeshMorphRuntime(next.mesh!) || next.mesh!.geometry !== geometry) break;
                end++;
            }
            const count = end - i;
            if (count > 1) {
                first.instanceCount = count;
                first.instanceOffset = totalInstanceBytes;
                for (let j = i + 1; j < end; j++) this.casters[j].instanceCount = 0;
                totalInstanceBytes += count * this.ctx.INSTANCE_STRIDE_BYTES;
                this._instancedCasterRunCount++;
            }
            i = end;
        }
        if (totalInstanceBytes === 0) return;
        this.ensureInstanceCapacity(totalInstanceBytes);
        for (let i = 0; i < this.castersUsed; i++) {
            const caster = this.casters[i];
            if (caster.instanceCount <= 1) continue;
            const count = caster.instanceCount;
            const ptrsPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
            const ptrs = store.u32();
            const ptrBase = ptrsPtr >>> 2;
            for (let j = 0; j < count; j++) ptrs[ptrBase + j] = this.casters[i + j].mesh!.transform.worldMatrixPtr >>> 0;
            const outPtr = frameArena.allocF32(count * 32) as WasmPtr;
            transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
            const byteLength = count * this.ctx.INSTANCE_STRIDE_BYTES;
            this.ctx.queue.writeBuffer(this.instanceBuffer!, caster.instanceOffset, driver.bytes(), outPtr, byteLength);
        }
    }

    private ensureInstanceCapacity(byteLength: number): void {
        if (this.instanceBuffer && this.instanceCapacityBytes >= byteLength) return;
        this.instanceBuffer?.destroy();
        let capacity = this.instanceCapacityBytes || (this.ctx.INSTANCE_STRIDE_BYTES * 256);
        while (capacity < byteLength) capacity *= 2;
        this.instanceCapacityBytes = capacity;
        this.instanceBuffer = this.ctx.device.createBuffer({ label: "WasmGPU shadow instances", size: capacity, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    }

    private getCasterPipeline(skinned: boolean, skinned8: boolean, instanced: boolean): GPURenderPipeline {
        const system = this.ctx.effects.shadows;
        if (this.pipelineDepthBias !== system.depthBias || this.pipelineDepthBiasSlopeScale !== system.depthBiasSlopeScale || this.pipelineDepthBiasClamp !== system.depthBiasClamp) {
            this.pipelineStatic = null;
            this.pipelineInstanced = null;
            this.pipelineSkinned = null;
            this.pipelineSkinned8 = null;
            this.pipelineDepthBias = system.depthBias;
            this.pipelineDepthBiasSlopeScale = system.depthBiasSlopeScale;
            this.pipelineDepthBiasClamp = system.depthBiasClamp;
        }
        if (instanced && this.pipelineInstanced) return this.pipelineInstanced;
        if (skinned8 && this.pipelineSkinned8) return this.pipelineSkinned8;
        if (skinned && !skinned8 && this.pipelineSkinned) return this.pipelineSkinned;
        if (!instanced && !skinned && this.pipelineStatic) return this.pipelineStatic;
        const code = instanced ? shadowCasterInstancedWGSL : skinned8 ? shadowCasterSkinned8WGSL : skinned ? shadowCasterSkinnedWGSL : shadowCasterWGSL;
        const module = this.ctx.device.createShaderModule({ code });
        const layouts = [this.viewLayout!];
        if (!instanced) layouts.push(this.modelLayout!);
        if (skinned) layouts.push(this.ctx.skinBindGroupLayout);
        const buffers: GPUVertexBufferLayout[] = [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }];
        if (instanced) buffers.push({ arrayStride: this.ctx.INSTANCE_STRIDE_BYTES, stepMode: "instance", attributes: [
            { shaderLocation: 1, offset: 0, format: "float32x4" },
            { shaderLocation: 2, offset: 16, format: "float32x4" },
            { shaderLocation: 3, offset: 32, format: "float32x4" },
            { shaderLocation: 4, offset: 48, format: "float32x4" }
        ] });
        else if (skinned) buffers.push({ arrayStride: skinned8 ? 48 : 24, attributes: skinned8 ? [
            { shaderLocation: 1, offset: 0, format: "uint16x4" },
            { shaderLocation: 2, offset: 8, format: "float32x4" },
            { shaderLocation: 3, offset: 24, format: "uint16x4" },
            { shaderLocation: 4, offset: 32, format: "float32x4" }
        ] : [
            { shaderLocation: 1, offset: 0, format: "uint16x4" },
            { shaderLocation: 2, offset: 8, format: "float32x4" }
        ] });
        const pipeline = this.ctx.device.createRenderPipeline({
            label: `WasmGPU shadow caster ${instanced ? "instanced" : skinned8 ? "skin8" : skinned ? "skin4" : "static"}`,
            layout: this.ctx.device.createPipelineLayout({ bindGroupLayouts: layouts }),
            vertex: { module, entryPoint: "vs_main", buffers },
            primitive: { topology: "triangle-list", cullMode: "none" },
            depthStencil: {
                format: "depth32float",
                depthWriteEnabled: true,
                depthCompare: "less",
                depthBias: system.depthBias,
                depthBiasSlopeScale: system.depthBiasSlopeScale,
                depthBiasClamp: system.depthBiasClamp
            }
        });
        if (instanced) this.pipelineInstanced = pipeline;
        else if (skinned8) this.pipelineSkinned8 = pipeline;
        else if (skinned) this.pipelineSkinned = pipeline;
        else this.pipelineStatic = pipeline;
        return pipeline;
    }

    private destroyResources(): void {
        this.texture?.destroy();
        this.metadataBuffer?.destroy();
        this.viewBuffer?.destroy();
        this.modelBuffer?.destroy();
        this.instanceBuffer?.destroy();
        this.texture = null;
        this.arrayView = null;
        this.layerViews.length = 0;
        this.layerOwners.length = 0;
        this.sampler = null;
        this.metadataBuffer = null;
        this.viewBuffer = null;
        this.modelBuffer = null;
        this.instanceBuffer = null;
        this.receiverLayout = null;
        this.receiverBindGroup = null;
        this.viewLayout = null;
        this.viewBindGroup = null;
        this.modelLayout = null;
        this.modelBindGroup = null;
        this.pipelineStatic = null;
        this.pipelineInstanced = null;
        this.pipelineSkinned = null;
        this.pipelineSkinned8 = null;
        this.pipelineDepthBias = Number.NaN;
        this.pipelineDepthBiasSlopeScale = Number.NaN;
        this.pipelineDepthBiasClamp = Number.NaN;
        this.modelCapacity = 0;
        this.instanceCapacityBytes = 0;
        this.modelScratch = EMPTY_F32;
        this.viewScratch = EMPTY_F32;
        this.resourceMapSize = 0;
        this.resourceMaxViews = 0;
        this.resourceFilter = null;
        this.metadataRevision = -1;
    }
}

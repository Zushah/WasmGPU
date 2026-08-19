/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createDepthTexture } from "../utils";
import { Transform } from "./transform";
import { Geometry } from "../graphics/geometry";
import { Material, BlendMode, CullMode } from "../graphics/material";
import { frameArena, mat4, WasmPtr } from "../wasm";
import { Scene } from "../world/scene";
import { Camera, PerspectiveCamera } from "../world/camera";
import { Mesh } from "../world/mesh";
import { PointCloud } from "../world/pointcloud";
import { GlyphField } from "../world/glyphfield";
import { NodeLink } from "../world/nodelink";
import { SplatField } from "../world/splatfield";
import { LatticeSpace } from "../world/latticespace";
import type { PickLassoPoint, PickQuery, PickRegionQuery } from "../world/picking";
import { RenderEffects } from "../effects";
import { setShadowDeviceLimits } from "../effects/shadows";
import { RendererShadows } from "./shadows";

import type {
    DrawItem,
    GlyphFieldDrawItem,
    LatticeSpaceDrawItem,
    LatticeSpaceSortScanLevel,
    LatticeSpaceSortState,
    NodeLinkDrawItem,
    OcclusionCandidate,
    OcclusionFrameState,
    OcclusionHierarchyLayout,
    OcclusionHierarchyMetadata,
    OcclusionReadbackSlot,
    PointCloudDrawItem,
    RendererCullingStats,
    RendererDescriptor,
    RendererPickHit,
    RendererPickRegionResult,
    SplatFieldDrawItem,
    SplatFieldSortScanLevel,
    SplatFieldSortState,
    TransparentDrawItem
} from "./types";
import {
    createFallbackTextures as createFallbackTexturesImpl,
    createGlobalBindGroupLayout as createGlobalBindGroupLayoutImpl,
    createSkinBindGroupLayout as createSkinBindGroupLayoutImpl,
    createUniformBuffers as createUniformBuffersImpl,
    ensureInstanceBuffer as ensureInstanceBufferImpl,
    ensureModelBufferPool as ensureModelBufferPoolImpl,
    getObjectId as getObjectIdImpl,
    refreshWasmStagingViews as refreshWasmStagingViewsImpl,
    writeCameraUniforms as writeCameraUniformsImpl,
    writeLightingUniforms as writeLightingUniformsImpl,
    writeModelUniformSlot as writeModelUniformSlotImpl
} from "./resources";
import {
    createGpuTimingResources as createGpuTimingResourcesImpl,
    tryReadGpuTiming as tryReadGpuTimingImpl
} from "./timing";
import {
    createSmaaResources as createSmaaResourcesImpl,
    executeSmaa as executeSmaaImpl,
    resizeSmaaTargets as resizeSmaaTargetsImpl
} from "./postprocessing";
import {
    ensureTransmissionTargets as ensureTransmissionTargetsImpl,
    hasOpticalTransmissionDrawItems as hasOpticalTransmissionDrawItemsImpl,
    isOpticallyTransmissiveMaterial as isOpticallyTransmissiveMaterialImpl,
    resizeTransmissionTargets as resizeTransmissionTargetsImpl
} from "./transmission";
import {
    acquireDrawItem as acquireDrawItemImpl,
    acquireGlyphFieldDrawItem as acquireGlyphFieldDrawItemImpl,
    acquireNodeLinkDrawItem as acquireNodeLinkDrawItemImpl,
    acquirePointCloudDrawItem as acquirePointCloudDrawItemImpl,
    acquireSplatFieldDrawItem as acquireSplatFieldDrawItemImpl,
    buildDrawLists as buildDrawListsImpl,
    buildGlyphFieldDrawLists as buildGlyphFieldDrawListsImpl,
    buildLatticeSpaceDrawLists as buildLatticeSpaceDrawListsImpl,
    buildNodeLinkDrawLists as buildNodeLinkDrawListsImpl,
    buildPointCloudDrawLists as buildPointCloudDrawListsImpl,
    buildSplatFieldDrawLists as buildSplatFieldDrawListsImpl,
    destroyCullingScratch as destroyCullingScratchImpl,
    ensureCullingCapacity as ensureCullingCapacityImpl,
    executeTransparentMergedDrawList as executeTransparentMergedDrawListImpl,
    getNodeLinkLinkGeometry as getNodeLinkLinkGeometryImpl,
    getNodeLinkNodeGeometry as getNodeLinkNodeGeometryImpl,
    recordFrustumCounts as recordFrustumCountsImpl
} from "./drawlists";
import {
    bindSizedBuffer as bindSizedBufferImpl,
    ensureMaterialBindGroup as ensureMaterialBindGroupImpl,
    getBlendState as getBlendStateImpl,
    getCullMode as getCullModeImpl,
    getMaterialBindGroupKey as getMaterialBindGroupKeyImpl,
    getOrCreatePipeline as getOrCreatePipelineImpl,
    getOrCreateShaderModule as getOrCreateShaderModuleImpl,
    getPipelineCacheKey as getPipelineCacheKeyImpl,
    getPremultipliedAlphaBlendState as getPremultipliedAlphaBlendStateImpl,
    isMirroredWorldMatrix as isMirroredWorldMatrixImpl,
    materialSupportsInstancing as materialSupportsInstancingImpl,
    materialSupportsSkinning as materialSupportsSkinningImpl
} from "./materials";
import {
    destroySplatFieldSortState as destroySplatFieldSortStateImpl,
    destroyLatticeSpaceSortState as destroyLatticeSpaceSortStateImpl,
    encodeLatticeSpaceSorts as encodeLatticeSpaceSortsImpl,
    drawInstancedRun as drawInstancedRunImpl,
    encodeSplatFieldSort as encodeSplatFieldSortImpl,
    encodeSplatFieldSorts as encodeSplatFieldSortsImpl,
    encodeSplatSortScanExclusive as encodeSplatSortScanExclusiveImpl,
    ensureGlyphFieldBindGroup as ensureGlyphFieldBindGroupImpl,
    ensureNodeLinkBindGroup as ensureNodeLinkBindGroupImpl,
    ensurePointCloudBindGroup as ensurePointCloudBindGroupImpl,
    ensureSplatFieldBindGroup as ensureSplatFieldBindGroupImpl,
    ensureSplatSortCapacity as ensureSplatSortCapacityImpl,
    ensureSplatSortFrameCapacity as ensureSplatSortFrameCapacityImpl,
    ensureSplatSortScanLevel as ensureSplatSortScanLevelImpl,
    executeDrawList as executeDrawListImpl,
    executeGlyphFieldDrawList as executeGlyphFieldDrawListImpl,
    executeLatticeSpaceDrawList as executeLatticeSpaceDrawListImpl,
    executeNodeLinkDrawList as executeNodeLinkDrawListImpl,
    executePointCloudDrawList as executePointCloudDrawListImpl,
    executeSplatFieldDrawList as executeSplatFieldDrawListImpl,
    getGlyphFieldBindGroupKey as getGlyphFieldBindGroupKeyImpl,
    getGlyphFieldBindGroupLayout as getGlyphFieldBindGroupLayoutImpl,
    getNodeLinkBindGroupKey as getNodeLinkBindGroupKeyImpl,
    getNodeLinkBindGroupLayout as getNodeLinkBindGroupLayoutImpl,
    getNodeLinkPipelineCacheKey as getNodeLinkPipelineCacheKeyImpl,
    getOrCreateGlyphFieldPipeline as getOrCreateGlyphFieldPipelineImpl,
    getOrCreateNodeLinkPipeline as getOrCreateNodeLinkPipelineImpl,
    getOrCreatePointCloudPipeline as getOrCreatePointCloudPipelineImpl,
    getOrCreateSplatFieldPipeline as getOrCreateSplatFieldPipelineImpl,
    getOrCreateSplatFieldSortState as getOrCreateSplatFieldSortStateImpl,
    getOrCreateSplatSortFlagsPipeline as getOrCreateSplatSortFlagsPipelineImpl,
    getOrCreateSplatSortKeygenPipeline as getOrCreateSplatSortKeygenPipelineImpl,
    getOrCreateSplatSortScanAddPipeline as getOrCreateSplatSortScanAddPipelineImpl,
    getOrCreateSplatSortScanBlockPipeline as getOrCreateSplatSortScanBlockPipelineImpl,
    getOrCreateSplatSortScatterPipeline as getOrCreateSplatSortScatterPipelineImpl,
    getOrCreateSplatSortZeroCountPipeline as getOrCreateSplatSortZeroCountPipelineImpl,
    getPointCloudBindGroupKey as getPointCloudBindGroupKeyImpl,
    getPointCloudBindGroupLayout as getPointCloudBindGroupLayoutImpl,
    getPointCloudPipelineCacheKey as getPointCloudPipelineCacheKeyImpl,
    getSplatFieldBindGroupKey as getSplatFieldBindGroupKeyImpl,
    getSplatFieldBindGroupLayout as getSplatFieldBindGroupLayoutImpl,
    getSplatSortFlagsBindGroupLayout as getSplatSortFlagsBindGroupLayoutImpl,
    getSplatSortKeygenBindGroupLayout as getSplatSortKeygenBindGroupLayoutImpl,
    getSplatSortScanAddBindGroupLayout as getSplatSortScanAddBindGroupLayoutImpl,
    getSplatSortScanBlockBindGroupLayout as getSplatSortScanBlockBindGroupLayoutImpl,
    getSplatSortScatterBindGroupLayout as getSplatSortScatterBindGroupLayoutImpl,
    getSplatSortZeroCountBindGroupLayout as getSplatSortZeroCountBindGroupLayoutImpl,
    warmGlyphFieldDrawList as warmGlyphFieldDrawListImpl,
    warmLatticeSpaceDrawList as warmLatticeSpaceDrawListImpl,
    warmInstancedRunResources as warmInstancedRunResourcesImpl,
    warmMeshDrawList as warmMeshDrawListImpl,
    warmNodeLinkDrawList as warmNodeLinkDrawListImpl,
    warmPointCloudDrawList as warmPointCloudDrawListImpl,
    warmSkinResources as warmSkinResourcesImpl,
    warmSplatFieldDrawList as warmSplatFieldDrawListImpl
} from "./objects";
import {
    getPickBindGroupLayout as getPickBindGroupLayoutImpl,
    resizePickTargets as resizePickTargetsImpl,
    runPick as runPickImpl,
    runPickLasso as runPickLassoImpl,
    runPickRect as runPickRectImpl
} from "./picking";
import {
    applyOcclusionFiltering as applyOcclusionFilteringImpl,
    buildOcclusionFrameState as buildOcclusionFrameStateImpl,
    captureOcclusionHierarchy as captureOcclusionHierarchyImpl,
    destroyOcclusionTextures as destroyOcclusionTexturesImpl,
    ensureOcclusionResources as ensureOcclusionResourcesImpl,
    getValidOcclusionHierarchy as getValidOcclusionHierarchyImpl,
    invalidateOcclusionResources as invalidateOcclusionResourcesImpl
} from "./occlusion";

export type {
    RendererCullingStats,
    RendererDescriptor,
    RendererPickHit,
    RendererPickRegionBounds,
    RendererPickRegionMode,
    RendererPickRegionResult
} from "./types";

export class Renderer {
    readonly canvas: HTMLCanvasElement;
    readonly effects: RenderEffects;
    readonly shadowRenderer: RendererShadows;
    private context!: GPUCanvasContext;
    device!: GPUDevice;
    queue!: GPUQueue;
    format!: GPUTextureFormat;
    private depthTexture!: GPUTexture;
    private depthView!: GPUTextureView;
    width = 0;
    height = 0;
    smaaEnabled: boolean = false;
    smaaSceneColorTexture: GPUTexture | null = null;
    smaaSceneColorView: GPUTextureView | null = null;
    smaaEdgesTexture: GPUTexture | null = null;
    smaaEdgesView: GPUTextureView | null = null;
    smaaBlendTexture: GPUTexture | null = null;
    smaaBlendView: GPUTextureView | null = null;
    smaaParamsBuffer: GPUBuffer | null = null;
    smaaSamplerPoint: GPUSampler | null = null;
    smaaSamplerLinear: GPUSampler | null = null;
    smaaShaderModule: GPUShaderModule | null = null;
    smaaEdgePipeline: GPURenderPipeline | null = null;
    smaaWeightPipeline: GPURenderPipeline | null = null;
    smaaNeighborhoodPipeline: GPURenderPipeline | null = null;
    smaaEdgeBindGroupLayout: GPUBindGroupLayout | null = null;
    smaaWeightBindGroupLayout: GPUBindGroupLayout | null = null;
    smaaNeighborhoodBindGroupLayout: GPUBindGroupLayout | null = null;
    smaaEdgeBindGroup: GPUBindGroup | null = null;
    smaaWeightBindGroup: GPUBindGroup | null = null;
    smaaNeighborhoodBindGroup: GPUBindGroup | null = null;
    transmissionSceneColorTexture: GPUTexture | null = null;
    transmissionSceneColorView: GPUTextureView | null = null;
    transmissionSourceTexture: GPUTexture | null = null;
    transmissionSourceView: GPUTextureView | null = null;
    transmissionSourceRevision: number = 0;
    globalBindGroupLayout!: GPUBindGroupLayout;
    globalBindGroups: GPUBindGroup[] = [];
    skinBindGroupLayout!: GPUBindGroupLayout;
    cameraUniformBuffer!: GPUBuffer;
    modelUniformBuffers: GPUBuffer[] = [];
    modelBufferIndex: number = 0;
    readonly MODEL_BUFFER_POOL_SIZE = 64;
    lightingUniformBuffer!: GPUBuffer;
    instanceBuffer: GPUBuffer | null = null;
    instanceBufferCapacityBytes: number = 0;
    instanceBufferOffset: number = 0;
    readonly INSTANCE_STRIDE_BYTES = 128;
    readonly framePreparedSkins: Set<object> = new Set();
    frameSkinPreparationCount: number = 0;
    pipelineCache: Map<string, GPURenderPipeline> = new Map();
    shaderCache: Map<string, GPUShaderModule> = new Map();
    drawItemPool: DrawItem[] = [];
    drawItemPoolUsed: number = 0;
    opaqueDrawList: DrawItem[] = [];
    transparentDrawList: DrawItem[] = [];
    pointCloudBindGroupLayout: GPUBindGroupLayout | null = null;
    pointCloudDummyColorsBuffer: GPUBuffer | null = null;
    pointCloudDrawItemPool: PointCloudDrawItem[] = [];
    pointCloudDrawItemPoolUsed: number = 0;
    opaquePointCloudDrawList: PointCloudDrawItem[] = [];
    transparentPointCloudDrawList: PointCloudDrawItem[] = [];
    splatFieldBindGroupLayout: GPUBindGroupLayout | null = null;
    splatFieldDummySHBuffer: GPUBuffer | null = null;
    splatFieldDrawItemPool: SplatFieldDrawItem[] = [];
    splatFieldDrawItemPoolUsed: number = 0;
    transparentSplatFieldDrawList: SplatFieldDrawItem[] = [];
    cullSplatFieldScratch: SplatField[] = [];
    readonly splatFieldSortStates: Map<SplatField, SplatFieldSortState> = new Map();
    splatSortCapacity: number = 0;
    splatSortKeyA: GPUBuffer | null = null;
    splatSortKeyB: GPUBuffer | null = null;
    splatSortIndexA: GPUBuffer | null = null;
    splatSortIndexB: GPUBuffer | null = null;
    splatSortFlags: GPUBuffer | null = null;
    splatSortPrefix: GPUBuffer | null = null;
    splatSortZerosCount: GPUBuffer | null = null;
    splatSortScanLevels: SplatFieldSortScanLevel[] = [];
    computePipelineCache: Map<string, GPUComputePipeline> = new Map();
    splatSortKeygenBindGroupLayout: GPUBindGroupLayout | null = null;
    splatSortFlagsBindGroupLayout: GPUBindGroupLayout | null = null;
    splatSortScanBlockBindGroupLayout: GPUBindGroupLayout | null = null;
    splatSortScanAddBindGroupLayout: GPUBindGroupLayout | null = null;
    splatSortZeroCountBindGroupLayout: GPUBindGroupLayout | null = null;
    splatSortScatterBindGroupLayout: GPUBindGroupLayout | null = null;
    glyphFieldBindGroupLayout: GPUBindGroupLayout | null = null;
    glyphFieldDummyAttributesBuffer: GPUBuffer | null = null;
    glyphFieldDrawItemPool: GlyphFieldDrawItem[] = [];
    glyphFieldDrawItemPoolUsed: number = 0;
    opaqueGlyphFieldDrawList: GlyphFieldDrawItem[] = [];
    transparentGlyphFieldDrawList: GlyphFieldDrawItem[] = [];
    nodeLinkBindGroupLayout: GPUBindGroupLayout | null = null;
    nodeLinkDummyF32Buffer: GPUBuffer | null = null;
    nodeLinkDummyU32Buffer: GPUBuffer | null = null;
    nodeLinkDrawItemPool: NodeLinkDrawItem[] = [];
    nodeLinkDrawItemPoolUsed: number = 0;
    opaqueNodeLinkDrawList: NodeLinkDrawItem[] = [];
    transparentNodeLinkDrawList: NodeLinkDrawItem[] = [];
    cullNodeLinkScratch: NodeLink[] = [];
    nodeLinkSphereGeometry: Geometry | null = null;
    nodeLinkCubeGeometry: Geometry | null = null;
    nodeLinkCylinderGeometry: Geometry | null = null;
    latticeSpaceBindGroupLayout: GPUBindGroupLayout | null = null;
    latticeSpaceDummyF32Buffer: GPUBuffer | null = null;
    latticeSpaceDummyU32Buffer: GPUBuffer | null = null;
    latticeSpaceDrawItemPool: LatticeSpaceDrawItem[] = [];
    latticeSpaceDrawItemPoolUsed: number = 0;
    opaqueLatticeSpaceDrawList: LatticeSpaceDrawItem[] = [];
    transparentLatticeSpaceDrawList: LatticeSpaceDrawItem[] = [];
    cullLatticeSpaceScratch: LatticeSpace[] = [];
    readonly latticeSpaceSortStates: Map<LatticeSpace, LatticeSpaceSortState> = new Map();
    latticeSortCapacity: number = 0;
    latticeSortKeyA: GPUBuffer | null = null;
    latticeSortKeyB: GPUBuffer | null = null;
    latticeSortIndexA: GPUBuffer | null = null;
    latticeSortIndexB: GPUBuffer | null = null;
    latticeSortFlags: GPUBuffer | null = null;
    latticeSortPrefix: GPUBuffer | null = null;
    latticeSortZerosCount: GPUBuffer | null = null;
    latticeSortScanLevels: LatticeSpaceSortScanLevel[] = [];
    latticeSortKeygenBindGroupLayout: GPUBindGroupLayout | null = null;
    latticeSortFlagsBindGroupLayout: GPUBindGroupLayout | null = null;
    latticeSortScanBlockBindGroupLayout: GPUBindGroupLayout | null = null;
    latticeSortScanAddBindGroupLayout: GPUBindGroupLayout | null = null;
    latticeSortZeroCountBindGroupLayout: GPUBindGroupLayout | null = null;
    latticeSortScatterBindGroupLayout: GPUBindGroupLayout | null = null;
    cullGlyphFieldScratch: GlyphField[] = [];
    transparentMergedDrawList: TransparentDrawItem[] = [];
    cullPointCloudScratch: PointCloud[] = [];
    objectIds: WeakMap<object, number> = new WeakMap();
    objectsById: Map<number, object> = new Map();
    nextObjectId: number = 1;
    cameraUniformStagingPtr!: WasmPtr;
    lightingUniformStagingPtr!: WasmPtr;
    modelUniformStagingPtr!: WasmPtr;
    cameraUniformStagingView!: Float32Array<ArrayBuffer>;
    lightingUniformStagingView!: Float32Array<ArrayBuffer>;
    lightingCountView!: Uint32Array<ArrayBuffer>;
    modelUniformStagingView!: Float32Array<ArrayBuffer>;
    _wasmBuffer: ArrayBuffer | null = null;
    frustumCullingEnabled: boolean = true;
    private frustumCullingStatsEnabled: boolean = false;
    occlusionCullingEnabled: boolean = false;
    occlusionCullingStatsEnabled: boolean = false;
    readonly cullingStats: RendererCullingStats = { frustum: { tested: 0, visible: 0 }, occlusion: { tested: 0, visible: 0, occluded: 0 } };
    frameFrustumTested: number = 0;
    frameFrustumVisible: number = 0;
    cullCentersPtr: WasmPtr = 0;
    cullRadiiPtr: WasmPtr = 0;
    cullCapacity: number = 0;
    cullMeshScratch: Mesh[] = [];
    occlusionVisibleObjectIds: Set<number> = new Set();
    occlusionCandidateObjectIds: Set<number> = new Set();
    occlusionCandidateScratch: OcclusionCandidate[] = [];
    pendingOcclusionFrameState: OcclusionFrameState | null = null;
    latestOcclusionHierarchy: { metadata: OcclusionHierarchyMetadata; data: Float32Array } | null = null;
    latestOcclusionHierarchySerial: number = 0;
    occlusionHierarchyTexture: GPUTexture | null = null;
    occlusionHierarchyMipViews: GPUTextureView[] = [];
    occlusionDepthTexture: GPUTexture | null = null;
    occlusionDepthView: GPUTextureView | null = null;
    occlusionHierarchyLayout: OcclusionHierarchyLayout | null = null;
    occlusionWidth: number = 0;
    occlusionHeight: number = 0;
    occlusionReadbackSlots: OcclusionReadbackSlot[] = [];
    occlusionCaptureSerial: number = 0;
    occlusionReduceBindGroupLayout: GPUBindGroupLayout | null = null;
    occlusionReducePipeline: GPURenderPipeline | null = null;
    occlusionReduceBindGroups: Map<string, GPUBindGroup> = new Map();
    readonly OCCLUSION_READBACK_RING_SIZE = 3;
    readonly OCCLUSION_MAX_LONG_EDGE = 256;
    readonly OCCLUSION_NEAR_EPSILON = 1e-5;
    readonly OCCLUSION_MAX_SCREEN_COVERAGE = 0.2;
    readonly OCCLUSION_DEPTH_BIAS = 2e-4;
    readonly OCCLUSION_VIEW_PROJ_EPSILON = 1e-6;
    fallbackSampler!: GPUSampler;
    fallbackWhiteTexture!: GPUTexture;
    fallbackWhiteViewLinear!: GPUTextureView;
    fallbackWhiteViewSrgb!: GPUTextureView;
    fallbackNormalTexture!: GPUTexture;
    fallbackNormalViewLinear!: GPUTextureView;
    fallbackMRTex!: GPUTexture;
    fallbackMRViewLinear!: GPUTextureView;
    fallbackOcclusionTex!: GPUTexture;
    fallbackOcclusionViewLinear!: GPUTextureView;
    fallbackAnisotropyTexture!: GPUTexture;
    fallbackAnisotropyViewLinear!: GPUTextureView;
    gpuTimingSupported: boolean = false;
    gpuTimingEnabled: boolean = false;
    gpuQuerySet: GPUQuerySet | null = null;
    gpuResolveBuffer: GPUBuffer | null = null;
    gpuResultBuffer: GPUBuffer | null = null;
    gpuResultPending: boolean = false;
    _gpuTimeNs: number | null = null;
    dataMaterialDummyDataBuffer: GPUBuffer | null = null;
    pickBindGroupLayout: GPUBindGroupLayout | null = null;
    pickUniformBuffers: GPUBuffer[] = [];
    pickBindGroups: GPUBindGroup[] = [];
    pickIdTexture: GPUTexture | null = null;
    pickIdView: GPUTextureView | null = null;
    pickDepthTexture: GPUTexture | null = null;
    pickDepthView: GPUTextureView | null = null;
    pickDepthPayloadTexture: GPUTexture | null = null;
    pickDepthPayloadView: GPUTextureView | null = null;
    pickIdReadbackBuffer: GPUBuffer | null = null;
    pickDepthReadbackBuffer: GPUBuffer | null = null;
    pickIdReadbackCapacityBytes: number = 0;
    pickDepthReadbackCapacityBytes: number = 0;
    private pickTail: Promise<unknown> = Promise.resolve();
    private destroyed: boolean = false;
    private constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.effects = new RenderEffects();
        this.shadowRenderer = new RendererShadows(this);
    }

    static async create(canvas: HTMLCanvasElement, descriptor: RendererDescriptor = {}): Promise<Renderer> {
        const renderer = new Renderer(canvas);
        await renderer.init(descriptor);
        return renderer;
    }

    private async init(descriptor: RendererDescriptor): Promise<void> {
        if (!navigator.gpu) throw new Error("WebGPU is not supported in this browser.");
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: descriptor.powerPreference ?? "high-performance" });
        if (!adapter) throw new Error("Failed to get GPU adapter.");
        const requiredFeatures: GPUFeatureName[] = [];
        if (adapter.features.has("timestamp-query")) requiredFeatures.push("timestamp-query");
        if (adapter.features.has("primitive-index")) requiredFeatures.push("primitive-index");
        const deviceDesc: GPUDeviceDescriptor = {};
        if (requiredFeatures.length > 0) deviceDesc.requiredFeatures = requiredFeatures;
        const requiredLimits: GPUDeviceDescriptor["requiredLimits"] = {};
        if (descriptor.maxBufferSize !== undefined) requiredLimits.maxBufferSize = descriptor.maxBufferSize;
        if (descriptor.maxStorageBufferBindingSize !== undefined) requiredLimits.maxStorageBufferBindingSize = descriptor.maxStorageBufferBindingSize;
        if (descriptor.maxUniformBufferBindingSize !== undefined) requiredLimits.maxUniformBufferBindingSize = descriptor.maxUniformBufferBindingSize;
        if (Object.keys(requiredLimits).length > 0) deviceDesc.requiredLimits = requiredLimits;
        this.device = await adapter.requestDevice(deviceDesc);
        setShadowDeviceLimits(this.effects.shadows, this.device.limits.maxTextureDimension2D, this.device.limits.maxTextureArrayLayers);
        this.gpuTimingSupported = this.device.features.has("timestamp-query");
        this.queue = this.device.queue;
        this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
        if (!this.context) throw new Error("Failed to get WebGPU canvas context.");
        if (descriptor.canvasFormat) this.format = descriptor.canvasFormat;
        else if (typeof navigator.gpu.getPreferredCanvasFormat === "function") this.format = navigator.gpu.getPreferredCanvasFormat();
        else this.format = "rgba8unorm";
        this.smaaEnabled = descriptor.antialias ?? false;
        if (this.smaaEnabled) this.createSmaaResources();
        this.createGlobalBindGroupLayout();
        this.createSkinBindGroupLayout();
        this.createUniformBuffers();
        this.createFallbackTextures();
        this.resize();
        this.frustumCullingEnabled = descriptor.frustumCulling ?? true;
        this.frustumCullingStatsEnabled = descriptor.frustumCullingStats ?? false;
        this.occlusionCullingEnabled = descriptor.occlusionCulling ?? false;
        this.occlusionCullingStatsEnabled = descriptor.occlusionCullingStats ?? false;
        if (this.occlusionCullingEnabled) this.ensureOcclusionResources();
    }

    get gpu(): { device: GPUDevice; queue: GPUQueue; format: GPUTextureFormat } {
        return { device: this.device, queue: this.queue, format: this.format };
    }

    get gpuTimeNs(): number | null {
        return this._gpuTimeNs;
    }

    get isGpuTimingSupported(): boolean {
        return this.gpuTimingSupported;
    }

    enableGpuTiming(enabled: boolean): void {
        const want = !!enabled;
        if (want && this.gpuTimingSupported && !this.gpuQuerySet) this.createGpuTimingResources();
        this.gpuTimingEnabled = want && this.gpuTimingSupported;
    }

    private createGpuTimingResources(): void {
        createGpuTimingResourcesImpl(this);
    }

    private tryReadGpuTiming(): void {
        tryReadGpuTimingImpl(this);
    }

    resize(): void {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
        const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
        if (w === this.width && h === this.height) return;
        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
        this.context.configure({ device: this.device, format: this.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST, alphaMode: "opaque" });
        if (this.depthTexture) this.depthTexture.destroy();
        this.depthTexture = createDepthTexture(this.device, this.width, this.height);
        this.depthView = this.depthTexture.createView();
        this.transmissionSceneColorTexture?.destroy();
        this.transmissionSourceTexture?.destroy();
        this.transmissionSceneColorTexture = null;
        this.transmissionSceneColorView = null;
        this.transmissionSourceTexture = null;
        this.transmissionSourceView = null;
        this.transmissionSourceRevision++;
        if (this.smaaEnabled) this.resizeSmaaTargets();
        resizePickTargetsImpl(this);
        this.invalidateOcclusionResources();
    }

    get aspectRatio(): number {
        return this.width / this.height;
    }

    private refreshWasmStagingViews(): void {
        refreshWasmStagingViewsImpl(this);
    }

    private getObjectId(obj: object): number {
        return getObjectIdImpl(this, obj);
    }

    private acquireDrawItem(): DrawItem {
        return acquireDrawItemImpl(this);
    }

    private acquirePointCloudDrawItem(): PointCloudDrawItem {
        return acquirePointCloudDrawItemImpl(this);
    }

    private acquireSplatFieldDrawItem(): SplatFieldDrawItem {
        return acquireSplatFieldDrawItemImpl(this);
    }

    private acquireGlyphFieldDrawItem(): GlyphFieldDrawItem {
        return acquireGlyphFieldDrawItemImpl(this);
    }

    private acquireNodeLinkDrawItem(): NodeLinkDrawItem {
        return acquireNodeLinkDrawItemImpl(this);
    }

    private ensureCullingCapacity(count: number): void {
        ensureCullingCapacityImpl(this, count);
    }

    prepareSceneFrameBase(scene: Scene, camera: Camera, prepareShadows: boolean = false): void {
        this.modelBufferIndex = 0;
        this.instanceBufferOffset = 0;
        this.framePreparedSkins.clear();
        this.frameSkinPreparationCount = 0;
        this.frameFrustumTested = 0;
        this.frameFrustumVisible = 0;
        this.pendingOcclusionFrameState = null;
        this.cameraUniformStagingPtr = frameArena.allocF32(20);
        this.lightingUniformStagingPtr = frameArena.allocF32(8 + (Scene.MAX_LIGHTS * 16));
        this.modelUniformStagingPtr = frameArena.allocF32(32);
        if (camera instanceof PerspectiveCamera && camera.autoAspect) camera.aspect = this.aspectRatio;
        Transform.updateAll();
        this.writeCameraUniforms(camera);
        if (prepareShadows) this.shadowRenderer.prepare(scene, camera);
        this.writeLightingUniforms(scene);
        this.buildDrawLists(scene, camera);
        this.buildPointCloudDrawLists(scene, camera);
        this.buildSplatFieldDrawLists(scene, camera);
        this.buildGlyphFieldDrawLists(scene, camera);
        this.buildNodeLinkDrawLists(scene, camera);
        this.buildLatticeSpaceDrawLists(scene, camera);
    }

    private applyRenderCullingAndStats(camera: Camera): void {
        this.cullingStats.frustum.tested = this.frustumCullingStatsEnabled ? this.frameFrustumTested : 0;
        this.cullingStats.frustum.visible = this.frustumCullingStatsEnabled ? this.frameFrustumVisible : 0;
        this.cullingStats.occlusion.tested = 0;
        this.cullingStats.occlusion.visible = 0;
        this.cullingStats.occlusion.occluded = 0;
        if (!this.occlusionCullingEnabled) return;
        this.pendingOcclusionFrameState = this.buildOcclusionFrameState();
        if (!this.pendingOcclusionFrameState) return;
        const hierarchy = this.getValidOcclusionHierarchy(camera, this.pendingOcclusionFrameState.signature);
        if (!hierarchy) return;
        this.applyOcclusionFiltering(camera, this.pendingOcclusionFrameState.candidates, hierarchy);
    }

    render(scene: Scene, camera: Camera): void {
        this.resize();
        const swapTexture = this.context.getCurrentTexture();
        const swapView = swapTexture.createView();
        this.prepareSceneFrameBase(scene, camera, true);
        this.applyRenderCullingAndStats(camera);
        const encoder = this.device.createCommandEncoder();
        this.shadowRenderer.encode(encoder);
        this.encodeSplatFieldSorts(encoder);
        this.encodeLatticeSpaceSorts(encoder);
        const timestampWrites = (this.gpuTimingEnabled && this.gpuQuerySet) ? ({ querySet: this.gpuQuerySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } as any) : undefined;
        const timestampBeginWrites = (this.gpuTimingEnabled && this.gpuQuerySet) ? ({ querySet: this.gpuQuerySet, beginningOfPassWriteIndex: 0 } as any) : undefined;
        const timestampEndWrites = (this.gpuTimingEnabled && this.gpuQuerySet) ? ({ querySet: this.gpuQuerySet, endOfPassWriteIndex: 1 } as any) : undefined;
        const hasTransmission = this.hasOpticalTransmissionDrawItems();
        if (this.smaaEnabled) {
            if (!this.smaaSceneColorView || !this.smaaEdgesView || !this.smaaBlendView) this.resizeSmaaTargets();
            if (hasTransmission) this.ensureTransmissionTargets(false);
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.smaaSceneColorView!,
                        clearValue: { r: scene.background[0], g: scene.background[1], b: scene.background[2], a: 1 },
                        loadOp: "clear",
                        storeOp: "store"
                    }
                ],
                depthStencilAttachment: {
                    view: this.depthView,
                    depthClearValue: 1.0,
                    depthLoadOp: "clear",
                    depthStoreOp: "store"
                },
                ...(hasTransmission && timestampBeginWrites ? { timestampWrites: timestampBeginWrites } : timestampWrites ? { timestampWrites } : {})
            });
            this.executeDrawList(pass, this.opaqueDrawList);
            this.executeGlyphFieldDrawList(pass, this.opaqueGlyphFieldDrawList);
            this.executePointCloudDrawList(pass, this.opaquePointCloudDrawList);
            this.executeNodeLinkDrawList(pass, this.opaqueNodeLinkDrawList);
            this.executeLatticeSpaceDrawList(pass, this.opaqueLatticeSpaceDrawList);
            if (!hasTransmission) this.executeTransparentMergedDrawList(pass);
            pass.end();
            if (hasTransmission) {
                encoder.copyTextureToTexture(
                    { texture: this.smaaSceneColorTexture! },
                    { texture: this.transmissionSourceTexture! },
                    { width: this.width, height: this.height, depthOrArrayLayers: 1 }
                );
                const transparentPass = encoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: this.smaaSceneColorView!,
                            loadOp: "load",
                            storeOp: "store"
                        }
                    ],
                    depthStencilAttachment: {
                        view: this.depthView,
                        depthLoadOp: "load",
                        depthStoreOp: "store"
                    },
                    ...(timestampEndWrites ? { timestampWrites: timestampEndWrites } : {})
                });
                this.executeTransparentMergedDrawList(transparentPass);
                transparentPass.end();
            }
            if (timestampWrites && this.gpuResolveBuffer && this.gpuResultBuffer) {
                encoder.resolveQuerySet(this.gpuQuerySet!, 0, 2, this.gpuResolveBuffer, 0);
                if (this.gpuResultBuffer.mapState === "unmapped") {
                    encoder.copyBufferToBuffer(this.gpuResolveBuffer, 0, this.gpuResultBuffer, 0, 16);
                    this.gpuResultPending = true;
                }
            }
            this.executeSmaa(encoder, swapView);
        } else {
            if (hasTransmission) this.ensureTransmissionTargets(true);
            const sceneColorView = hasTransmission ? this.transmissionSceneColorView! : swapView;
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: sceneColorView,
                        clearValue: { r: scene.background[0], g: scene.background[1], b: scene.background[2], a: 1 },
                        loadOp: "clear",
                        storeOp: "store"
                    }
                ],
                depthStencilAttachment: {
                    view: this.depthView,
                    depthClearValue: 1.0,
                    depthLoadOp: "clear",
                    depthStoreOp: "store"
                },
                ...(hasTransmission && timestampBeginWrites ? { timestampWrites: timestampBeginWrites } : timestampWrites ? { timestampWrites } : {})
            });
            this.executeDrawList(pass, this.opaqueDrawList);
            this.executeGlyphFieldDrawList(pass, this.opaqueGlyphFieldDrawList);
            this.executePointCloudDrawList(pass, this.opaquePointCloudDrawList);
            this.executeNodeLinkDrawList(pass, this.opaqueNodeLinkDrawList);
            this.executeLatticeSpaceDrawList(pass, this.opaqueLatticeSpaceDrawList);
            if (!hasTransmission) this.executeTransparentMergedDrawList(pass);
            pass.end();
            if (hasTransmission) {
                encoder.copyTextureToTexture(
                    { texture: this.transmissionSceneColorTexture! },
                    { texture: this.transmissionSourceTexture! },
                    { width: this.width, height: this.height, depthOrArrayLayers: 1 }
                );
                const transparentPass = encoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: this.transmissionSceneColorView!,
                            loadOp: "load",
                            storeOp: "store"
                        }
                    ],
                    depthStencilAttachment: {
                        view: this.depthView,
                        depthLoadOp: "load",
                        depthStoreOp: "store"
                    },
                    ...(timestampEndWrites ? { timestampWrites: timestampEndWrites } : {})
                });
                this.executeTransparentMergedDrawList(transparentPass);
                transparentPass.end();
                encoder.copyTextureToTexture(
                    { texture: this.transmissionSceneColorTexture! },
                    { texture: swapTexture },
                    { width: this.width, height: this.height, depthOrArrayLayers: 1 }
                );
            }
            if (timestampWrites && this.gpuResolveBuffer && this.gpuResultBuffer) {
                encoder.resolveQuerySet(this.gpuQuerySet!, 0, 2, this.gpuResolveBuffer, 0);
                if (this.gpuResultBuffer.mapState === "unmapped") {
                    encoder.copyBufferToBuffer(this.gpuResolveBuffer, 0, this.gpuResultBuffer, 0, 16);
                    this.gpuResultPending = true;
                }
            }
        }
        this.queue.submit([encoder.finish()]);
        this.tryReadGpuTiming();
        if (this.occlusionCullingEnabled) this.captureOcclusionHierarchy(camera);
    }

    warmup(scene: Scene, camera: Camera): void {
        this.resize();
        this.prepareSceneFrameBase(scene, camera, true);
        if (this.occlusionCullingEnabled) this.ensureOcclusionResources();
        const hasTransmission = this.hasOpticalTransmissionDrawItems();
        if (hasTransmission) this.ensureTransmissionTargets(!this.smaaEnabled);
        this.shadowRenderer.warmup();
        this.warmMeshDrawList(this.opaqueDrawList);
        this.warmMeshDrawList(this.transparentDrawList);
        this.warmPointCloudDrawList(this.opaquePointCloudDrawList);
        this.warmPointCloudDrawList(this.transparentPointCloudDrawList);
        this.warmSplatFieldDrawList(this.transparentSplatFieldDrawList);
        this.warmGlyphFieldDrawList(this.opaqueGlyphFieldDrawList);
        this.warmGlyphFieldDrawList(this.transparentGlyphFieldDrawList);
        this.warmNodeLinkDrawList(this.opaqueNodeLinkDrawList);
        this.warmNodeLinkDrawList(this.transparentNodeLinkDrawList);
        this.warmLatticeSpaceDrawList(this.opaqueLatticeSpaceDrawList);
        this.warmLatticeSpaceDrawList(this.transparentLatticeSpaceDrawList);
    }

    private schedulePick<T>(run: () => Promise<T>): Promise<T> {
        const task = this.pickTail.then(run, run);
        this.pickTail = task.then(() => undefined, () => undefined);
        return task;
    }

    pick(scene: Scene, camera: Camera, x: number, y: number, _opts: PickQuery = {}): Promise<RendererPickHit | null> {
        return this.schedulePick(() => runPickImpl(this, scene, camera, x, y));
    }

    pickRect(scene: Scene, camera: Camera, x0: number, y0: number, x1: number, y1: number, opts: PickRegionQuery = {}): Promise<RendererPickRegionResult> {
        return this.schedulePick(() => runPickRectImpl(this, scene, camera, x0, y0, x1, y1, opts));
    }

    pickLasso(scene: Scene, camera: Camera, points: PickLassoPoint[], opts: PickRegionQuery = {}): Promise<RendererPickRegionResult> {
        return this.schedulePick(() => runPickLassoImpl(this, scene, camera, points, opts));
    }

    destroy(): void {
        if (this.destroyed) return;
        destroyCullingScratchImpl(this);
        this.destroyed = true;
        this.shadowRenderer.destroy();
        this.effects.destroy();
        this.destroyOcclusionTextures();
        this.depthTexture?.destroy();
        this.smaaSceneColorTexture?.destroy();
        this.smaaEdgesTexture?.destroy();
        this.smaaBlendTexture?.destroy();
        this.transmissionSceneColorTexture?.destroy();
        this.transmissionSourceTexture?.destroy();
        this.smaaSceneColorTexture = null;
        this.smaaSceneColorView = null;
        this.smaaEdgesTexture = null;
        this.smaaEdgesView = null;
        this.smaaBlendTexture = null;
        this.smaaBlendView = null;
        this.transmissionSceneColorTexture = null;
        this.transmissionSceneColorView = null;
        this.transmissionSourceTexture = null;
        this.transmissionSourceView = null;
        this.transmissionSourceRevision++;
        this.smaaParamsBuffer?.destroy();
        this.smaaParamsBuffer = null;
        this.smaaEdgeBindGroup = null;
        this.smaaWeightBindGroup = null;
        this.smaaNeighborhoodBindGroup = null;
        this.smaaEdgePipeline = null;
        this.smaaWeightPipeline = null;
        this.smaaNeighborhoodPipeline = null;
        this.smaaShaderModule = null;
        this.smaaEdgeBindGroupLayout = null;
        this.smaaWeightBindGroupLayout = null;
        this.smaaNeighborhoodBindGroupLayout = null;
        this.smaaSamplerPoint = null;
        this.smaaSamplerLinear = null;
        this.fallbackWhiteTexture?.destroy();
        this.fallbackNormalTexture?.destroy();
        this.fallbackMRTex?.destroy();
        this.fallbackOcclusionTex?.destroy();
        this.fallbackAnisotropyTexture?.destroy();
        this.cameraUniformBuffer?.destroy();
        for (const buffer of this.modelUniformBuffers) buffer.destroy();
        for (const buffer of this.pickUniformBuffers) buffer.destroy();
        this.modelUniformBuffers = [];
        this.pickUniformBuffers = [];
        this.pickBindGroups = [];
        this.pickBindGroupLayout = null;
        this.pickIdTexture?.destroy();
        this.pickDepthTexture?.destroy();
        this.pickDepthPayloadTexture?.destroy();
        this.pickIdTexture = null;
        this.pickIdView = null;
        this.pickDepthTexture = null;
        this.pickDepthView = null;
        this.pickDepthPayloadTexture = null;
        this.pickDepthPayloadView = null;
        this.pickIdReadbackBuffer?.destroy();
        this.pickDepthReadbackBuffer?.destroy();
        this.pickIdReadbackBuffer = null;
        this.pickDepthReadbackBuffer = null;
        this.pickIdReadbackCapacityBytes = 0;
        this.pickDepthReadbackCapacityBytes = 0;
        this.pickTail = Promise.resolve();
        for (const slot of this.occlusionReadbackSlots) { slot.buffer?.destroy(); slot.buffer = null; slot.capacityBytes = 0; slot.pending = null; slot.metadata = null; slot.data = null; slot.state = "idle"; }
        this.occlusionReadbackSlots = [];
        this.occlusionReduceBindGroups.clear();
        this.occlusionReduceBindGroupLayout = null;
        this.occlusionReducePipeline = null;
        this.latestOcclusionHierarchy = null;
        this.latestOcclusionHierarchySerial = 0;
        this.pendingOcclusionFrameState = null;
        this.lightingUniformBuffer?.destroy();
        this.instanceBuffer?.destroy();
        this.instanceBuffer = null;
        this.instanceBufferCapacityBytes = 0;
        this.globalBindGroups = [];
        this.pipelineCache.clear();
        this.computePipelineCache.clear();
        this.shaderCache.clear();
        this.pointCloudBindGroupLayout = null;
        this.pointCloudDummyColorsBuffer?.destroy();
        this.pointCloudDummyColorsBuffer = null;
        this.splatFieldBindGroupLayout = null;
        this.splatFieldDummySHBuffer?.destroy();
        this.splatFieldDummySHBuffer = null;
        for (const [field, state] of this.splatFieldSortStates) this.destroySplatFieldSortState(field, state);
        this.splatFieldSortStates.clear();
        this.splatSortKeyA?.destroy();
        this.splatSortKeyB?.destroy();
        this.splatSortIndexA?.destroy();
        this.splatSortIndexB?.destroy();
        this.splatSortFlags?.destroy();
        this.splatSortPrefix?.destroy();
        this.splatSortZerosCount?.destroy();
        this.splatSortKeyA = null;
        this.splatSortKeyB = null;
        this.splatSortIndexA = null;
        this.splatSortIndexB = null;
        this.splatSortFlags = null;
        this.splatSortPrefix = null;
        this.splatSortZerosCount = null;
        this.splatSortCapacity = 0;
        for (const level of this.splatSortScanLevels) { level.blockSums?.destroy(); level.blockOffsets?.destroy(); }
        this.splatSortScanLevels = [];
        this.splatSortKeygenBindGroupLayout = null;
        this.splatSortFlagsBindGroupLayout = null;
        this.splatSortScanBlockBindGroupLayout = null;
        this.splatSortScanAddBindGroupLayout = null;
        this.splatSortZeroCountBindGroupLayout = null;
        this.splatSortScatterBindGroupLayout = null;
        this.glyphFieldBindGroupLayout = null;
        this.nodeLinkBindGroupLayout = null;
        this.glyphFieldDummyAttributesBuffer?.destroy();
        this.glyphFieldDummyAttributesBuffer = null;
        this.nodeLinkDummyF32Buffer?.destroy();
        this.nodeLinkDummyU32Buffer?.destroy();
        this.nodeLinkDummyF32Buffer = null;
        this.nodeLinkDummyU32Buffer = null;
        this.latticeSpaceDummyF32Buffer?.destroy();
        this.latticeSpaceDummyU32Buffer?.destroy();
        this.latticeSpaceDummyF32Buffer = null;
        this.latticeSpaceDummyU32Buffer = null;
        this.latticeSpaceBindGroupLayout = null;
        for (const [space, state] of this.latticeSpaceSortStates) destroyLatticeSpaceSortStateImpl(this, space, state);
        this.latticeSpaceSortStates.clear();
        for (const buffer of [this.latticeSortKeyA, this.latticeSortKeyB, this.latticeSortIndexA, this.latticeSortIndexB, this.latticeSortFlags, this.latticeSortPrefix, this.latticeSortZerosCount]) buffer?.destroy();
        this.latticeSortKeyA = null;
        this.latticeSortKeyB = null;
        this.latticeSortIndexA = null;
        this.latticeSortIndexB = null;
        this.latticeSortFlags = null;
        this.latticeSortPrefix = null;
        this.latticeSortZerosCount = null;
        this.latticeSortCapacity = 0;
        for (const level of this.latticeSortScanLevels) { level.blockSums?.destroy(); level.blockOffsets?.destroy(); }
        this.latticeSortScanLevels = [];
        this.latticeSortKeygenBindGroupLayout = null;
        this.latticeSortFlagsBindGroupLayout = null;
        this.latticeSortScanBlockBindGroupLayout = null;
        this.latticeSortScanAddBindGroupLayout = null;
        this.latticeSortZeroCountBindGroupLayout = null;
        this.latticeSortScatterBindGroupLayout = null;
        this.nodeLinkSphereGeometry = null;
        this.nodeLinkCubeGeometry = null;
        this.nodeLinkCylinderGeometry = null;
        this.gpuQuerySet?.destroy();
        this.gpuQuerySet = null;
        this.gpuResolveBuffer?.destroy();
        this.gpuResolveBuffer = null;
        this.gpuResultBuffer?.destroy();
        this.gpuResultBuffer = null;
        this.gpuResultPending = false;
        this._gpuTimeNs = null;
        this.dataMaterialDummyDataBuffer?.destroy();
        this.dataMaterialDummyDataBuffer = null;
        this.objectsById.clear();
        this.objectIds = new WeakMap();
        this.nextObjectId = 1;
        try { this.context?.unconfigure?.(); } catch { /* ignore */ }
        try { this.device?.destroy?.(); } catch { /* ignore */ }
    }

    private createGlobalBindGroupLayout(): void {
        createGlobalBindGroupLayoutImpl(this);
    }

    private createSkinBindGroupLayout(): void {
        createSkinBindGroupLayoutImpl(this);
    }

    private createUniformBuffers(): void {
        createUniformBuffersImpl(this);
    }

    getPickBindGroupLayout(): GPUBindGroupLayout {
        return getPickBindGroupLayoutImpl(this);
    }

    private ensureModelBufferPool(requiredCount: number): void {
        ensureModelBufferPoolImpl(this, requiredCount);
    }

    private createFallbackTextures(): void {
        createFallbackTexturesImpl(this);
    }

    private createSmaaResources(): void {
        createSmaaResourcesImpl(this);
    }

    private resizeSmaaTargets(): void {
        resizeSmaaTargetsImpl(this);
    }

    private ensureTransmissionTargets(needSceneTarget: boolean): void {
        ensureTransmissionTargetsImpl(this, needSceneTarget);
    }

    private resizeTransmissionTargets(needSceneTarget: boolean): void {
        resizeTransmissionTargetsImpl(this, needSceneTarget);
    }

    private writeModelUniformSlot(slot: number, modelPtr: WasmPtr): void {
        writeModelUniformSlotImpl(this, slot, modelPtr);
    }

    unprojectDepth(camera: Camera, px: number, py: number, depth: number): [number, number, number] {
        const x = ((px + 0.5) / Math.max(1, this.width)) * 2.0 - 1.0;
        const y = 1.0 - ((py + 0.5) / Math.max(1, this.height)) * 2.0;
        const z = depth;
        const inv = mat4.invert(camera.viewProjectionMatrix);
        const wx = inv[0] * x + inv[4] * y + inv[8] * z + inv[12];
        const wy = inv[1] * x + inv[5] * y + inv[9] * z + inv[13];
        const wz = inv[2] * x + inv[6] * y + inv[10] * z + inv[14];
        const ww = inv[3] * x + inv[7] * y + inv[11] * z + inv[15];
        if (!Number.isFinite(ww) || Math.abs(ww) <= 1e-8) return [0, 0, 0];
        return [wx / ww, wy / ww, wz / ww];
    }

    private executeSmaa(encoder: GPUCommandEncoder, outputView: GPUTextureView): void {
        executeSmaaImpl(this, encoder, outputView);
    }

    private writeCameraUniforms(camera: Camera): void {
        writeCameraUniformsImpl(this, camera);
    }

    private writeLightingUniforms(scene: Scene): void {
        writeLightingUniformsImpl(this, scene);
    }

    private recordFrustumCounts(tested: number, visible: number): void {
        recordFrustumCountsImpl(this, tested, visible);
    }

    private destroyOcclusionTextures(): void {
        destroyOcclusionTexturesImpl(this);
    }

    private invalidateOcclusionResources(): void {
        invalidateOcclusionResourcesImpl(this);
    }

    private ensureOcclusionResources(): void {
        ensureOcclusionResourcesImpl(this);
    }

    private buildOcclusionFrameState(): OcclusionFrameState | null {
        return buildOcclusionFrameStateImpl(this);
    }

    private getValidOcclusionHierarchy(camera: Camera, signature: number): { metadata: OcclusionHierarchyMetadata; data: Float32Array } | null {
        return getValidOcclusionHierarchyImpl(this, camera, signature);
    }

    private applyOcclusionFiltering(camera: Camera, candidates: OcclusionCandidate[], hierarchy: { metadata: OcclusionHierarchyMetadata; data: Float32Array }): void {
        applyOcclusionFilteringImpl(this, camera, candidates, hierarchy);
    }

    private buildDrawLists(scene: Scene, camera: Camera): void {
        buildDrawListsImpl(this, scene, camera);
    }

    private isOpticallyTransmissiveMaterial(material: Material): boolean {
        return isOpticallyTransmissiveMaterialImpl(material);
    }

    private hasOpticalTransmissionDrawItems(): boolean {
        return hasOpticalTransmissionDrawItemsImpl(this);
    }

    private buildPointCloudDrawLists(scene: Scene, camera: Camera): void {
        buildPointCloudDrawListsImpl(this, scene);
    }

    private buildSplatFieldDrawLists(scene: Scene, camera: Camera): void {
        buildSplatFieldDrawListsImpl(this, scene, camera);
    }

    private buildGlyphFieldDrawLists(scene: Scene, camera: Camera): void {
        buildGlyphFieldDrawListsImpl(this, scene, camera);
    }

    private getNodeLinkNodeGeometry(mode: NodeLink["nodeGeometryMode"]): Geometry {
        return getNodeLinkNodeGeometryImpl(this, mode);
    }

    private getNodeLinkLinkGeometry(): Geometry {
        return getNodeLinkLinkGeometryImpl(this);
    }

    private buildNodeLinkDrawLists(scene: Scene, camera: Camera): void {
        buildNodeLinkDrawListsImpl(this, scene, camera);
    }

    private buildLatticeSpaceDrawLists(scene: Scene, camera: Camera): void {
        buildLatticeSpaceDrawListsImpl(this, scene, camera);
    }

    private captureOcclusionHierarchy(camera: Camera): void {
        captureOcclusionHierarchyImpl(this, camera);
    }

    private warmMeshDrawList(items: DrawItem[]): void {
        warmMeshDrawListImpl(this, items);
    }

    private warmSkinResources(skin: Mesh["skin"]): void {
        warmSkinResourcesImpl(this, skin);
    }

    private warmInstancedRunResources(items: DrawItem[], start: number, count: number): void {
        warmInstancedRunResourcesImpl(this, items, start, count);
    }

    private warmPointCloudDrawList(items: PointCloudDrawItem[]): void {
        warmPointCloudDrawListImpl(this, items);
    }

    private warmSplatFieldDrawList(items: SplatFieldDrawItem[]): void {
        warmSplatFieldDrawListImpl(this, items);
    }

    private warmGlyphFieldDrawList(items: GlyphFieldDrawItem[]): void {
        warmGlyphFieldDrawListImpl(this, items);
    }

    private warmNodeLinkDrawList(items: NodeLinkDrawItem[]): void {
        warmNodeLinkDrawListImpl(this, items);
    }

    private warmLatticeSpaceDrawList(items: LatticeSpaceDrawItem[]): void {
        warmLatticeSpaceDrawListImpl(this, items);
    }

    private executeDrawList(pass: GPURenderPassEncoder, items: DrawItem[]): void {
        executeDrawListImpl(this, pass, items);
    }

    private executePointCloudDrawList(pass: GPURenderPassEncoder, items: PointCloudDrawItem[]): void {
        executePointCloudDrawListImpl(this, pass, items);
    }

    private executeSplatFieldDrawList(pass: GPURenderPassEncoder, items: SplatFieldDrawItem[]): void {
        executeSplatFieldDrawListImpl(this, pass, items);
    }

    private executeGlyphFieldDrawList(pass: GPURenderPassEncoder, list: GlyphFieldDrawItem[]): void {
        executeGlyphFieldDrawListImpl(this, pass, list);
    }

    private executeNodeLinkDrawList(pass: GPURenderPassEncoder, list: NodeLinkDrawItem[]): void {
        executeNodeLinkDrawListImpl(this, pass, list);
    }

    private executeLatticeSpaceDrawList(pass: GPURenderPassEncoder, list: LatticeSpaceDrawItem[]): void {
        executeLatticeSpaceDrawListImpl(this, pass, list);
    }

    private executeTransparentMergedDrawList(pass: GPURenderPassEncoder): void {
        executeTransparentMergedDrawListImpl(this, pass);
    }

    private drawInstancedRun(pass: GPURenderPassEncoder, geometry: Geometry, material: Material, items: DrawItem[], start: number, count: number): void {
        drawInstancedRunImpl(this, pass, geometry, material, items, start, count);
    }

    private getOrCreatePipeline(material: Material, instanced: boolean = false, skinned: boolean = false, skinned8: boolean = false, mirrored: boolean = false, forceNoDepthWrite: boolean = false, receiveShadow: boolean = false): GPURenderPipeline {
        return getOrCreatePipelineImpl(this, material, instanced, skinned, skinned8, mirrored, forceNoDepthWrite, receiveShadow);
    }

    private getPipelineCacheKey(material: Material, instanced: boolean, skinned: boolean, skinned8: boolean, mirrored: boolean, forceNoDepthWrite: boolean = false, receiveShadow: boolean = false): string {
        return getPipelineCacheKeyImpl(this, material, instanced, skinned, skinned8, mirrored, forceNoDepthWrite, receiveShadow);
    }

    private isMirroredWorldMatrix(storeF32: Float32Array, base: number): boolean {
        return isMirroredWorldMatrixImpl(this, storeF32, base);
    }

    private getBlendState(mode: BlendMode): GPUBlendState | undefined {
        return getBlendStateImpl(this, mode);
    }

    private getCullMode(mode: CullMode): GPUCullMode {
        return getCullModeImpl(this, mode);
    }

    private getPremultipliedAlphaBlendState(): GPUBlendState {
        return getPremultipliedAlphaBlendStateImpl(this);
    }

    private bindSizedBuffer(buffer: GPUBuffer, size: number, offset: number = 0): GPUBufferBinding {
        return bindSizedBufferImpl(this, buffer, size, offset);
    }

    private getOrCreateShaderModule(code: string): GPUShaderModule {
        return getOrCreateShaderModuleImpl(this, code);
    }

    private getMaterialBindGroupKey(material: Material): string {
        return getMaterialBindGroupKeyImpl(this, material);
    }

    private ensureMaterialBindGroup(material: Material): void {
        ensureMaterialBindGroupImpl(this, material);
    }

    private materialSupportsInstancing(material: Material): boolean {
        return materialSupportsInstancingImpl(this, material);
    }

    private materialSupportsSkinning(material: Material): boolean {
        return materialSupportsSkinningImpl(this, material);
    }

    private ensureInstanceBuffer(byteLength: number): void {
        ensureInstanceBufferImpl(this, byteLength);
    }

    private getOrCreateSplatFieldSortState(field: SplatField): SplatFieldSortState {
        return getOrCreateSplatFieldSortStateImpl(this, field);
    }

    private destroySplatFieldSortState(field: SplatField, state: SplatFieldSortState): void {
        destroySplatFieldSortStateImpl(this, field, state);
    }

    private ensureSplatSortCapacity(count: number): void {
        ensureSplatSortCapacityImpl(this, count);
    }

    private ensureSplatSortScanLevel(level: number, count: number): SplatFieldSortScanLevel {
        return ensureSplatSortScanLevelImpl(this, level, count);
    }

    private ensureSplatSortFrameCapacity(count: number, level: number = 0): void {
        ensureSplatSortFrameCapacityImpl(this, count, level);
    }

    private getSplatFieldBindGroupLayout(): GPUBindGroupLayout {
        return getSplatFieldBindGroupLayoutImpl(this);
    }

    private getOrCreateSplatFieldPipeline(): GPURenderPipeline {
        return getOrCreateSplatFieldPipelineImpl(this);
    }

    private getSplatFieldBindGroupKey(field: SplatField, state: SplatFieldSortState): string {
        return getSplatFieldBindGroupKeyImpl(this, field, state);
    }

    private ensureSplatFieldBindGroup(field: SplatField): void {
        ensureSplatFieldBindGroupImpl(this, field);
    }

    private getSplatSortKeygenBindGroupLayout(): GPUBindGroupLayout {
        return getSplatSortKeygenBindGroupLayoutImpl(this);
    }

    private getSplatSortFlagsBindGroupLayout(): GPUBindGroupLayout {
        return getSplatSortFlagsBindGroupLayoutImpl(this);
    }

    private getSplatSortScanBlockBindGroupLayout(): GPUBindGroupLayout {
        return getSplatSortScanBlockBindGroupLayoutImpl(this);
    }

    private getSplatSortScanAddBindGroupLayout(): GPUBindGroupLayout {
        return getSplatSortScanAddBindGroupLayoutImpl(this);
    }

    private getSplatSortZeroCountBindGroupLayout(): GPUBindGroupLayout {
        return getSplatSortZeroCountBindGroupLayoutImpl(this);
    }

    private getSplatSortScatterBindGroupLayout(): GPUBindGroupLayout {
        return getSplatSortScatterBindGroupLayoutImpl(this);
    }

    private getOrCreateSplatSortKeygenPipeline(): GPUComputePipeline {
        return getOrCreateSplatSortKeygenPipelineImpl(this);
    }

    private getOrCreateSplatSortFlagsPipeline(bit: number): GPUComputePipeline {
        return getOrCreateSplatSortFlagsPipelineImpl(this, bit);
    }

    private getOrCreateSplatSortScanBlockPipeline(): GPUComputePipeline {
        return getOrCreateSplatSortScanBlockPipelineImpl(this);
    }

    private getOrCreateSplatSortScanAddPipeline(): GPUComputePipeline {
        return getOrCreateSplatSortScanAddPipelineImpl(this);
    }

    private getOrCreateSplatSortZeroCountPipeline(): GPUComputePipeline {
        return getOrCreateSplatSortZeroCountPipelineImpl(this);
    }

    private getOrCreateSplatSortScatterPipeline(bit: number): GPUComputePipeline {
        return getOrCreateSplatSortScatterPipelineImpl(this, bit);
    }

    private encodeSplatSortScanExclusive(pass: GPUComputePassEncoder, input: GPUBuffer, count: number, out: GPUBuffer, level: number = 0): void {
        encodeSplatSortScanExclusiveImpl(this, pass, input, count, out, level);
    }

    private encodeSplatFieldSort(pass: GPUComputePassEncoder, field: SplatField, state: SplatFieldSortState): GPUBuffer | null {
        return encodeSplatFieldSortImpl(this, pass, field, state);
    }

    private encodeSplatFieldSorts(encoder: GPUCommandEncoder): void {
        encodeSplatFieldSortsImpl(this, encoder);
    }

    private encodeLatticeSpaceSorts(encoder: GPUCommandEncoder): void {
        encodeLatticeSpaceSortsImpl(this, encoder);
    }

    private getPointCloudBindGroupLayout(): GPUBindGroupLayout {
        return getPointCloudBindGroupLayoutImpl(this);
    }

    private getPointCloudPipelineCacheKey(cloud: PointCloud): string {
        return getPointCloudPipelineCacheKeyImpl(this, cloud);
    }

    private getOrCreatePointCloudPipeline(cloud: PointCloud): GPURenderPipeline {
        return getOrCreatePointCloudPipelineImpl(this, cloud);
    }

    private getPointCloudBindGroupKey(cloud: PointCloud): string {
        return getPointCloudBindGroupKeyImpl(this, cloud);
    }

    private ensurePointCloudBindGroup(cloud: PointCloud): void {
        ensurePointCloudBindGroupImpl(this, cloud);
    }

    private getGlyphFieldBindGroupLayout(): GPUBindGroupLayout {
        return getGlyphFieldBindGroupLayoutImpl(this);
    }

    private getOrCreateGlyphFieldPipeline(field: GlyphField): GPURenderPipeline {
        return getOrCreateGlyphFieldPipelineImpl(this, field);
    }

    private getGlyphFieldBindGroupKey(field: GlyphField): string {
        return getGlyphFieldBindGroupKeyImpl(this, field);
    }

    private ensureGlyphFieldBindGroup(field: GlyphField): void {
        ensureGlyphFieldBindGroupImpl(this, field);
    }

    private getNodeLinkBindGroupLayout(): GPUBindGroupLayout {
        return getNodeLinkBindGroupLayoutImpl(this);
    }

    private getNodeLinkPipelineCacheKey(link: NodeLink, passKind: NodeLinkDrawItem["passKind"]): string {
        return getNodeLinkPipelineCacheKeyImpl(this, link, passKind);
    }

    private getOrCreateNodeLinkPipeline(link: NodeLink, passKind: NodeLinkDrawItem["passKind"]): GPURenderPipeline {
        return getOrCreateNodeLinkPipelineImpl(this, link, passKind);
    }

    private getNodeLinkBindGroupKey(link: NodeLink): string {
        return getNodeLinkBindGroupKeyImpl(this, link);
    }

    private ensureNodeLinkBindGroup(link: NodeLink): void {
        ensureNodeLinkBindGroupImpl(this, link);
    }
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { Geometry } from "../graphics/geometry";
import type { Material } from "../graphics/material";
import type { GlyphField } from "../world/glyphfield";
import type { Mesh } from "../world/mesh";
import type { NodeLink } from "../world/nodelink";
import type { PointCloud } from "../world/pointcloud";
import type { SplatField } from "../world/splatfield";
import type { LatticeSpace } from "../world/latticespace";
import type { WasmPtr } from "../wasm";

export type RendererDescriptor = {
    antialias?: boolean;
    powerPreference?: "high-performance" | "low-power";
    canvasFormat?: GPUTextureFormat;
    frustumCulling?: boolean;
    frustumCullingStats?: boolean;
    occlusionCulling?: boolean;
    occlusionCullingStats?: boolean;
    maxBufferSize?: number;
    maxStorageBufferBindingSize?: number;
    maxUniformBufferBindingSize?: number;
};

export type RendererCullingStats = {
    frustum: {
        tested: number;
        visible: number;
    };
    occlusion: {
        tested: number;
        visible: number;
        occluded: number;
    };
};

export type DrawItem = {
    mesh: Mesh;
    geometry: Geometry;
    material: Material;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    materialId: number;
    geometryId: number;
    vertexSourceId: number;
    skinned: boolean;
    skinned8: boolean;
    mirrored: boolean;
    receiveShadow: boolean;
    sortKey: number;
};

export type PointCloudDrawItem = {
    cloud: PointCloud;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    cloudId: number;
    sortKey: number;
};

export type GlyphFieldDrawItem = {
    field: GlyphField;
    geometry: Geometry;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    geometryId: number;
    fieldId: number;
    sortKey: number;
};

export type NodeLinkDrawItem = {
    link: NodeLink;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    linkId: number;
    passKind: "node-points" | "node-solid" | "edge-lines" | "edge-cylinders";
    geometry: Geometry | null;
    geometryId: number;
    sortKey: number;
};

export type SplatFieldDrawItem = {
    field: SplatField;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    fieldId: number;
    sortKey: number;
};

export type LatticeSpaceDrawItem = {
    space: LatticeSpace;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    spaceId: number;
    sortKey: number;
};

export type TransparentDrawItem = DrawItem | PointCloudDrawItem | SplatFieldDrawItem | GlyphFieldDrawItem | NodeLinkDrawItem | LatticeSpaceDrawItem;

export type SplatFieldSortState = {
    sortedIndexBuffer: GPUBuffer | null;
    sortedIndexCapacity: number;
    transformBuffer: GPUBuffer | null;
    lastMvp: Float32Array;
    lastRevision: number;
    lastCount: number;
    valid: boolean;
    sortCount: number;
    radixBindGroupKey: string | null;
    radixBindGroups: Array<GPUBindGroup | null>;
};

export type SplatFieldSortScanLevel = {
    blockSums: GPUBuffer | null;
    blockSumsCapacity: number;
    blockOffsets: GPUBuffer | null;
    blockOffsetsCapacity: number;
};

export type LatticeSpaceSortState = {
    sortedIndexBuffer: GPUBuffer | null;
    sortedIndexCapacity: number;
    identityKey: string | null;
    transformBuffer: GPUBuffer | null;
    lastMvp: Float32Array;
    lastRevision: number;
    lastCount: number;
    valid: boolean;
    sortCount: number;
    radixBindGroupKey: string | null;
    radixBindGroups: Array<GPUBindGroup | null>;
};

export type LatticeSpaceSortScanLevel = {
    blockSums: GPUBuffer | null;
    blockSumsCapacity: number;
    blockOffsets: GPUBuffer | null;
    blockOffsetsCapacity: number;
};

export type OcclusionCandidateKind = "mesh" | "pointcloud" | "glyphfield" | "nodelink" | "latticespace";

export type OcclusionCandidate = {
    kind: OcclusionCandidateKind;
    object: Mesh | PointCloud | GlyphField | NodeLink | LatticeSpace;
    objectId: number;
    worldMatrixPtr: WasmPtr;
    boundsCenter: [number, number, number];
    boundsRadius: number;
};

export type OcclusionHierarchyLayout = {
    widths: Uint32Array;
    heights: Uint32Array;
    offsets: Uint32Array;
    copyOffsets: Uint32Array;
    rowBytes: Uint32Array;
    mipCount: number;
    texelCount: number;
    totalBytes: number;
};

export type OcclusionHierarchyMetadata = {
    resourceGeneration: number;
    viewportWidth: number;
    viewportHeight: number;
    hierarchyWidth: number;
    hierarchyHeight: number;
    cameraType: string;
    occluderSignature: number;
    viewProjection: Float32Array;
    layout: OcclusionHierarchyLayout;
};

export type OcclusionReadbackSlot = {
    buffer: GPUBuffer | null;
    capacityBytes: number;
    pending: Promise<void> | null;
    state: "idle" | "mapping" | "ready";
    metadata: OcclusionHierarchyMetadata | null;
    data: Float32Array | null;
    serial: number;
};

export type OcclusionFrameState = {
    signature: number;
    candidates: OcclusionCandidate[];
    meshOccluders: DrawItem[];
    pointCloudOccluders: PointCloudDrawItem[];
    glyphOccluders: GlyphFieldDrawItem[];
    nodeLinkOccluders: NodeLinkDrawItem[];
    latticeSpaceOccluders: LatticeSpaceDrawItem[];
};

export type RendererPickHit =
    {
        kind: "mesh";
        object: Mesh;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    } |
    {
        kind: "pointcloud";
        object: PointCloud;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    } |
    {
        kind: "glyphfield";
        object: GlyphField;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    } |
    {
        kind: "nodelink";
        object: NodeLink;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    } |
    {
        kind: "splatfield";
        object: SplatField;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    } |
    {
        kind: "latticespace";
        object: LatticeSpace;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    };

export type RendererPickRegionMode = "rect" | "lasso";

export type RendererPickRegionBounds = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type RendererPickRegionResult = {
    mode: RendererPickRegionMode;
    hits: RendererPickHit[];
    truncated: boolean;
    bounds: RendererPickRegionBounds;
    sampledPixels: number;
};

export type ResolvedPickRegionQuery = {
    mode: RendererPickRegionMode;
    bounds: RendererPickRegionBounds;
    x: number;
    y: number;
    width: number;
    height: number;
    maxHits: number;
    lasso: Array<{ x: number; y: number }> | null;
};

export type DecodedPickSample = {
    objectId: number;
    elementIndex: number;
    depth: number;
    px: number;
    py: number;
};

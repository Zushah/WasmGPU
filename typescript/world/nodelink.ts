/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp01, createBuffer, linearIndexToNdIndex, normalizeColorStops, normalizePositiveIntShape, resolveGPUBuffer } from "../utils";
import { Transform } from "../core/transform";
import { BlendMode, CullMode, type Color4 } from "../graphics/material";
import { Colormap, type BuiltinColormapName } from "../graphics/colormap";
import { cloneScaleTransform, normalizeScaleTransform, packScaleTransform } from "../scaling";
import type { ScaleSourceDescriptor, ScaleStatsResult, ScaleTransform, ScaleTransformDescriptor } from "../scaling";
import { WasmMemoryView, assertWasmF32View, assertWasmU32View, assertWasmRecordCount, assertWasmCapacity, resolveWasmRecordCount, validateWasmRecordRange, growWasmCapacity } from "../wasm";
import { Bounds3, boundsFromBox, boundsFromSphere, emptyBounds, transformBounds } from "./bounds";

export type NodeLinkNodeGeometryMode = "points" | "spheres" | "ellipsoids" | "cubes";
export type NodeLinkEdgeGeometryMode = "lines" | "cylinders";
export type NodeLinkColorMode = "rgba" | "scalar" | "solid";
export type NodeLinkColormap = BuiltinColormapName | "custom";
export type NodeLinkComponentKind = "node" | "edge";
export type NodeLinkVisualChangeKind = "scale" | "colormap" | "visual";

export type NodeLinkWasmNodeRefreshOptions = {
    nodeCount?: number;
    keepCPUData?: boolean;
    recomputeBounds?: boolean;
};

export type NodeLinkWasmEdgeRefreshOptions = {
    edgeCount?: number;
    keepCPUData?: boolean;
};

export type NodeLinkWasmNodeChannelOptions = NodeLinkWasmNodeRefreshOptions & {
    capacity?: number;
};

export type NodeLinkWasmEdgeChannelOptions = NodeLinkWasmEdgeRefreshOptions & {
    capacity?: number;
};

export type NodeLinkWasmRefreshOptions = NodeLinkWasmNodeRefreshOptions & NodeLinkWasmEdgeRefreshOptions;

export type NodeLinkWasmSources = {
    nodePositions?: WasmMemoryView<Float32Array> | null;
    nodeScalars?: WasmMemoryView<Float32Array> | null;
    nodeColors?: WasmMemoryView<Float32Array> | null;
    nodeRadii?: WasmMemoryView<Float32Array> | null;
    edges?: WasmMemoryView<Uint32Array> | null;
    edgeScalars?: WasmMemoryView<Float32Array> | null;
    edgeColors?: WasmMemoryView<Float32Array> | null;
};

export type NodeLinkDescriptor = {
    nodeCount?: number;
    nodePositions?: Float32Array;
    nodePositionsStride?: 3 | 4;
    nodeScalars?: Float32Array;
    nodeColors?: Float32Array;
    nodeRadii?: Float32Array;
    nodeRadiiStride?: 3 | 4;
    nodePositionsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    nodeScalarsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    nodeColorsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    nodeRadiiBuffer?: GPUBuffer | { buffer: GPUBuffer };
    wasmNodePositions?: WasmMemoryView<Float32Array>;
    wasmNodeScalars?: WasmMemoryView<Float32Array>;
    wasmNodeColors?: WasmMemoryView<Float32Array>;
    wasmNodeRadii?: WasmMemoryView<Float32Array>;
    wasmNodeCapacity?: number;
    edgeCount?: number;
    edges?: Uint16Array | Uint32Array;
    edgeScalars?: Float32Array;
    edgeColors?: Float32Array;
    edgesBuffer?: GPUBuffer | { buffer: GPUBuffer };
    edgeScalarsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    edgeColorsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    wasmEdges?: WasmMemoryView<Uint32Array>;
    wasmEdgeScalars?: WasmMemoryView<Float32Array>;
    wasmEdgeColors?: WasmMemoryView<Float32Array>;
    wasmEdgeCapacity?: number;
    nodeGeometryMode?: NodeLinkNodeGeometryMode;
    edgeGeometryMode?: NodeLinkEdgeGeometryMode;
    nodeColorMode?: NodeLinkColorMode;
    edgeColorMode?: NodeLinkColorMode;
    nodeScaleTransform?: ScaleTransformDescriptor;
    edgeScaleTransform?: ScaleTransformDescriptor;
    nodeColormap?: NodeLinkColormap | Colormap;
    edgeColormap?: NodeLinkColormap | Colormap;
    nodeColormapStops?: Color4[];
    edgeColormapStops?: Color4[];
    nodeSolidColor?: Color4;
    edgeSolidColor?: Color4;
    nodeSize?: number;
    minPointSize?: number;
    maxPointSize?: number;
    pointSizeAttenuation?: number;
    edgeSize?: number;
    opacity?: number;
    lit?: boolean;
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ownBuffers?: boolean;
    ndShape?: number[];
};

type BoundsSourceMode = "none" | "explicit" | "computed";
type PendingWriteTarget = "nodePositions" | "nodeScalars" | "nodeColors" | "nodeRadii" | "edges" | "edgeScalars" | "edgeColors";
type PendingWrite = { target: PendingWriteTarget; byteOffset: number; bytes: Uint8Array };
type NodeLinkWasmNodeChannel = "nodePositions" | "nodeScalars" | "nodeColors" | "nodeRadii";
type NodeLinkWasmEdgeChannel = "edges" | "edgeScalars" | "edgeColors";
type NodeLinkWasmChannel = NodeLinkWasmNodeChannel | NodeLinkWasmEdgeChannel;

const UNIFORM_FLOAT_COUNT = 128;
const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;
const NODELINK_VEC4_FLOATS = 4;
const NODELINK_U32_EDGE_COMPONENTS = 2;
const NODELINK_F32_BYTES = 4;
const NODELINK_VEC4_BYTES = NODELINK_VEC4_FLOATS * NODELINK_F32_BYTES;
const NODELINK_EDGE_BYTES = NODELINK_U32_EDGE_COMPONENTS * 4;

const wasmNodeFieldName = (channel: NodeLinkWasmNodeChannel): string => `wasm${channel[0]!.toUpperCase()}${channel.slice(1)}`;
const wasmEdgeFieldName = (channel: NodeLinkWasmEdgeChannel): string => channel === "edges" ? "wasmEdges" : `wasm${channel[0]!.toUpperCase()}${channel.slice(1)}`;
const nodeWasmComponents = (channel: NodeLinkWasmNodeChannel): number => channel === "nodeScalars" ? 1 : NODELINK_VEC4_FLOATS;
const edgeWasmComponents = (channel: NodeLinkWasmEdgeChannel): number => channel === "edges" ? NODELINK_U32_EDGE_COMPONENTS : channel === "edgeScalars" ? 1 : NODELINK_VEC4_FLOATS;

const normalizeNodeScaleTransform = (transform: ScaleTransformDescriptor | ScaleTransform | undefined): ScaleTransform => normalizeScaleTransform({ componentCount: 1, componentIndex: 0, stride: 1, offset: 0, mode: "linear", clampMode: "range", domainMin: 0, domainMax: 1, clampMin: 0, clampMax: 1, gamma: 1, invert: false, ...(transform ?? {}) });

const normalizeEdgeScaleTransform = (transform: ScaleTransformDescriptor | ScaleTransform | undefined): ScaleTransform => normalizeScaleTransform({ componentCount: 1, componentIndex: 0, stride: 1, offset: 0, mode: "linear", clampMode: "range", domainMin: 0, domainMax: 1, clampMin: 0, clampMax: 1, gamma: 1, invert: false, ...(transform ?? {}) });

const colorModeId = (mode: NodeLinkColorMode): number => mode === "rgba" ? 0 : mode === "scalar" ? 1 : 2;
const nodeGeometryModeId = (mode: NodeLinkNodeGeometryMode): number => mode === "points" ? 0 : mode === "spheres" ? 1 : mode === "ellipsoids" ? 2 : 3;
const edgeGeometryModeId = (mode: NodeLinkEdgeGeometryMode): number => mode === "lines" ? 0 : 1;
const isNodeGeometryMode = (value: unknown): value is NodeLinkNodeGeometryMode => value === "points" || value === "spheres" || value === "ellipsoids" || value === "cubes";
const isEdgeGeometryMode = (value: unknown): value is NodeLinkEdgeGeometryMode => value === "lines" || value === "cylinders";
const isColorMode = (value: unknown): value is NodeLinkColorMode => value === "rgba" || value === "scalar" || value === "solid";
const cloneBytes = (data: ArrayBufferView): Uint8Array => new Uint8Array(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
const nodeLinkRevisionScratch = new ArrayBuffer(4);
const nodeLinkRevisionF32 = new Float32Array(nodeLinkRevisionScratch);
const nodeLinkRevisionU32 = new Uint32Array(nodeLinkRevisionScratch);
const mixNodeLinkRevision = (hash: number, value: number): number => Math.imul((hash ^ (value >>> 0)) >>> 0, 16777619) >>> 0;
const mixNodeLinkRevisionF32 = (hash: number, value: number): number => { nodeLinkRevisionF32[0] = Number.isFinite(value) ? value : 0; return mixNodeLinkRevision(hash, nodeLinkRevisionU32[0] >>> 0); };

export class NodeLink {
    readonly transform: Transform = new Transform();
    name: string | null = null;
    visible: boolean = true;
    blendMode: BlendMode = BlendMode.Opaque;
    cullMode: CullMode = CullMode.Back;
    depthWrite: boolean = true;
    depthTest: boolean = true;
    boundsMin: [number, number, number] = [0, 0, 0];
    boundsMax: [number, number, number] = [0, 0, 0];
    boundsCenter: [number, number, number] = [0, 0, 0];
    boundsRadius: number = 0;
    nodePositionsBuffer: GPUBuffer | null = null;
    nodeScalarsBuffer: GPUBuffer | null = null;
    nodeColorsBuffer: GPUBuffer | null = null;
    nodeRadiiBuffer: GPUBuffer | null = null;
    edgesBuffer: GPUBuffer | null = null;
    edgeScalarsBuffer: GPUBuffer | null = null;
    edgeColorsBuffer: GPUBuffer | null = null;
    uniformBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;
    bindGroupKey: string | null = null;
    private _nodeCount: number = 0;
    private _edgeCount: number = 0;
    private _nodePositionsCPU: Float32Array | null = null;
    private _nodeScalarsCPU: Float32Array | null = null;
    private _nodeColorsCPU: Float32Array | null = null;
    private _nodeRadiiCPU: Float32Array | null = null;
    private _edgesCPU: Uint32Array | null = null;
    private _edgeScalarsCPU: Float32Array | null = null;
    private _edgeColorsCPU: Float32Array | null = null;
    private _wasmNodePositionsSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmNodeScalarsSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmNodeColorsSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmNodeRadiiSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmEdgesSource: WasmMemoryView<Uint32Array> | null = null;
    private _wasmEdgeScalarsSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmEdgeColorsSource: WasmMemoryView<Float32Array> | null = null;
    private _nodePositionsExternal: boolean = false;
    private _nodeScalarsExternal: boolean = false;
    private _nodeColorsExternal: boolean = false;
    private _nodeRadiiExternal: boolean = false;
    private _edgesExternal: boolean = false;
    private _edgeScalarsExternal: boolean = false;
    private _edgeColorsExternal: boolean = false;
    private _nodePositionsOwned: boolean = false;
    private _nodeScalarsOwned: boolean = false;
    private _nodeColorsOwned: boolean = false;
    private _nodeRadiiOwned: boolean = false;
    private _edgesOwned: boolean = false;
    private _edgeScalarsOwned: boolean = false;
    private _edgeColorsOwned: boolean = false;
    private _nodePositionsDirty: boolean = true;
    private _nodeScalarsDirty: boolean = true;
    private _nodeColorsDirty: boolean = true;
    private _nodeRadiiDirty: boolean = true;
    private _edgesDirty: boolean = true;
    private _edgeScalarsDirty: boolean = true;
    private _edgeColorsDirty: boolean = true;
    private _wasmNodePositionsDirty: boolean = false;
    private _wasmNodeScalarsDirty: boolean = false;
    private _wasmNodeColorsDirty: boolean = false;
    private _wasmNodeRadiiDirty: boolean = false;
    private _wasmEdgesDirty: boolean = false;
    private _wasmEdgeScalarsDirty: boolean = false;
    private _wasmEdgeColorsDirty: boolean = false;
    private _nodePositionsWasmManaged: boolean = false;
    private _nodeScalarsWasmManaged: boolean = false;
    private _nodeColorsWasmManaged: boolean = false;
    private _nodeRadiiWasmManaged: boolean = false;
    private _edgesWasmManaged: boolean = false;
    private _edgeScalarsWasmManaged: boolean = false;
    private _edgeColorsWasmManaged: boolean = false;
    private _wasmNodePositionsCapacity: number = 0;
    private _wasmNodeScalarsCapacity: number = 0;
    private _wasmNodeColorsCapacity: number = 0;
    private _wasmNodeRadiiCapacity: number = 0;
    private _wasmEdgesCapacity: number = 0;
    private _wasmEdgeScalarsCapacity: number = 0;
    private _wasmEdgeColorsCapacity: number = 0;
    private _wasmNodePositionsCapacityHint: number = 0;
    private _wasmNodeScalarsCapacityHint: number = 0;
    private _wasmNodeColorsCapacityHint: number = 0;
    private _wasmNodeRadiiCapacityHint: number = 0;
    private _wasmEdgesCapacityHint: number = 0;
    private _wasmEdgeScalarsCapacityHint: number = 0;
    private _wasmEdgeColorsCapacityHint: number = 0;
    private _uniformDirty: boolean = true;
    private _boundsSource: BoundsSourceMode = "none";
    private _keepCPUData: boolean = false;
    private _ownExternalBuffers: boolean = false;
    private _ndShape: number[] | null = null;
    private _nodeGeometryMode: NodeLinkNodeGeometryMode = "points";
    private _edgeGeometryMode: NodeLinkEdgeGeometryMode = "lines";
    private _nodeColorMode: NodeLinkColorMode = "scalar";
    private _edgeColorMode: NodeLinkColorMode = "solid";
    private _nodeScaleTransform: ScaleTransform = normalizeNodeScaleTransform(undefined);
    private _edgeScaleTransform: ScaleTransform = normalizeEdgeScaleTransform(undefined);
    private _nodeScaleRevision: number = 0;
    private _edgeScaleRevision: number = 0;
    private _nodeColormap: NodeLinkColormap | Colormap = "viridis";
    private _edgeColormap: NodeLinkColormap | Colormap = "viridis";
    private _nodeColormapStops: Color4[] = [[0.267, 0.00487, 0.32942, 1], [0.99325, 0.90616, 0.14394, 1]];
    private _edgeColormapStops: Color4[] = [[0.267, 0.00487, 0.32942, 1], [0.99325, 0.90616, 0.14394, 1]];
    private _nodeSolidColor: Color4 = [1, 1, 1, 1];
    private _edgeSolidColor: Color4 = [0.8, 0.8, 0.8, 1];
    private _nodeSize: number = 1;
    private _minPointSize: number = 1;
    private _maxPointSize: number = 32;
    private _pointSizeAttenuation: number = 1;
    private _edgeSize: number = 0.06;
    private _opacity: number = 1;
    private _lit: boolean = false;
    private readonly _pendingWrites: PendingWrite[] = [];
    private readonly _visualChangeListeners: Set<(kind: NodeLinkVisualChangeKind) => void> = new Set();

    constructor(desc: NodeLinkDescriptor = {}) {
        this._nodeScaleTransform = normalizeNodeScaleTransform(desc.nodeScaleTransform);
        this._edgeScaleTransform = normalizeEdgeScaleTransform(desc.edgeScaleTransform);
        if (desc.nodeGeometryMode !== undefined) assert(isNodeGeometryMode(desc.nodeGeometryMode), `NodeLink: invalid nodeGeometryMode '${String(desc.nodeGeometryMode)}'.`);
        if (desc.edgeGeometryMode !== undefined) assert(isEdgeGeometryMode(desc.edgeGeometryMode), `NodeLink: invalid edgeGeometryMode '${String(desc.edgeGeometryMode)}'.`);
        if (desc.nodeColorMode !== undefined) assert(isColorMode(desc.nodeColorMode), `NodeLink: invalid nodeColorMode '${String(desc.nodeColorMode)}'.`);
        if (desc.edgeColorMode !== undefined) assert(isColorMode(desc.edgeColorMode), `NodeLink: invalid edgeColorMode '${String(desc.edgeColorMode)}'.`);
        if (desc.nodePositionsBuffer !== undefined) assert(desc.nodeCount !== undefined, "NodeLink: nodeCount is required when nodePositionsBuffer is provided.");
        if (desc.edgesBuffer !== undefined) assert(desc.edgeCount !== undefined, "NodeLink: edgeCount is required when edgesBuffer is provided.");
        if (desc.name !== undefined) this.name = desc.name;
        if (desc.visible !== undefined) this.visible = !!desc.visible;
        if (desc.blendMode !== undefined) this.blendMode = desc.blendMode;
        if (desc.cullMode !== undefined) this.cullMode = desc.cullMode;
        if (desc.depthWrite !== undefined) this.depthWrite = !!desc.depthWrite;
        if (desc.depthTest !== undefined) this.depthTest = !!desc.depthTest;
        if (desc.keepCPUData !== undefined) this._keepCPUData = !!desc.keepCPUData;
        this._ownExternalBuffers = !!desc.ownBuffers;
        if (desc.ndShape !== undefined) this.ndShape = desc.ndShape;
        if (desc.nodeGeometryMode !== undefined) this._nodeGeometryMode = desc.nodeGeometryMode;
        if (desc.edgeGeometryMode !== undefined) this._edgeGeometryMode = desc.edgeGeometryMode;
        if (desc.nodeColorMode !== undefined) this._nodeColorMode = desc.nodeColorMode;
        if (desc.edgeColorMode !== undefined) this._edgeColorMode = desc.edgeColorMode;
        if (desc.nodeColormap !== undefined) this._nodeColormap = desc.nodeColormap;
        if (desc.edgeColormap !== undefined) this._edgeColormap = desc.edgeColormap;
        if (desc.nodeColormapStops !== undefined) this._nodeColormapStops = normalizeColorStops(desc.nodeColormapStops);
        if (desc.edgeColormapStops !== undefined) this._edgeColormapStops = normalizeColorStops(desc.edgeColormapStops);
        if (desc.nodeSolidColor !== undefined) this._nodeSolidColor = [desc.nodeSolidColor[0], desc.nodeSolidColor[1], desc.nodeSolidColor[2], desc.nodeSolidColor[3]];
        if (desc.edgeSolidColor !== undefined) this._edgeSolidColor = [desc.edgeSolidColor[0], desc.edgeSolidColor[1], desc.edgeSolidColor[2], desc.edgeSolidColor[3]];
        if (desc.nodeSize !== undefined) this._nodeSize = Math.max(0, desc.nodeSize);
        if (desc.minPointSize !== undefined) this._minPointSize = Math.max(0, desc.minPointSize);
        if (desc.maxPointSize !== undefined) this._maxPointSize = Math.max(this._minPointSize, desc.maxPointSize);
        if (desc.pointSizeAttenuation !== undefined) this._pointSizeAttenuation = Math.max(0, desc.pointSizeAttenuation);
        if (desc.edgeSize !== undefined) this._edgeSize = Math.max(0, desc.edgeSize);
        if (desc.opacity !== undefined) this._opacity = clamp01(desc.opacity);
        if (desc.lit !== undefined) this._lit = !!desc.lit;
        this.applyExplicitBounds(desc);
        const wasmNodeCapacity = assertWasmCapacity(desc.wasmNodeCapacity, "NodeLink: wasmNodeCapacity");
        const wasmEdgeCapacity = assertWasmCapacity(desc.wasmEdgeCapacity, "NodeLink: wasmEdgeCapacity");
        if (desc.nodePositions) this.setNodePositions(desc.nodePositions, { stride: desc.nodePositionsStride ?? 3, keepCPUData: this._keepCPUData });
        else if (desc.wasmNodePositions) this.setWasmNodePositions(desc.wasmNodePositions, { nodeCount: desc.nodeCount, capacity: wasmNodeCapacity, keepCPUData: this._keepCPUData });
        else if (desc.nodePositionsBuffer) this.setNodePositionsBuffer(resolveGPUBuffer(desc.nodePositionsBuffer), desc.nodeCount ?? 0, { ownBuffer: this._ownExternalBuffers });
        else if (desc.nodeCount !== undefined) this._nodeCount = Math.max(0, desc.nodeCount | 0);
        if (desc.edges) this.setEdges(desc.edges, { keepCPUData: this._keepCPUData });
        else if (desc.wasmEdges) this.setWasmEdges(desc.wasmEdges, { edgeCount: desc.edgeCount, capacity: wasmEdgeCapacity, keepCPUData: this._keepCPUData });
        else if (desc.edgesBuffer) this.setEdgesBuffer(resolveGPUBuffer(desc.edgesBuffer), desc.edgeCount ?? 0, { ownBuffer: this._ownExternalBuffers });
        else if (desc.edgeCount !== undefined) this._edgeCount = Math.max(0, desc.edgeCount | 0);
        if (desc.nodeScalars) this.setNodeScalars(desc.nodeScalars, { keepCPUData: this._keepCPUData });
        else if (desc.wasmNodeScalars) this.setWasmNodeScalars(desc.wasmNodeScalars, { nodeCount: desc.nodeCount, capacity: wasmNodeCapacity, keepCPUData: this._keepCPUData });
        else if (desc.nodeScalarsBuffer) this.setNodeScalarsBuffer(resolveGPUBuffer(desc.nodeScalarsBuffer), { ownBuffer: this._ownExternalBuffers });
        if (desc.nodeColors) this.setNodeColors(desc.nodeColors, { keepCPUData: this._keepCPUData });
        else if (desc.wasmNodeColors) this.setWasmNodeColors(desc.wasmNodeColors, { nodeCount: desc.nodeCount, capacity: wasmNodeCapacity, keepCPUData: this._keepCPUData });
        else if (desc.nodeColorsBuffer) this.setNodeColorsBuffer(resolveGPUBuffer(desc.nodeColorsBuffer), { ownBuffer: this._ownExternalBuffers });
        if (desc.nodeRadii) this.setNodeRadii(desc.nodeRadii, { stride: desc.nodeRadiiStride ?? 3, keepCPUData: this._keepCPUData });
        else if (desc.wasmNodeRadii) this.setWasmNodeRadii(desc.wasmNodeRadii, { nodeCount: desc.nodeCount, capacity: wasmNodeCapacity, keepCPUData: this._keepCPUData });
        else if (desc.nodeRadiiBuffer) this.setNodeRadiiBuffer(resolveGPUBuffer(desc.nodeRadiiBuffer), { ownBuffer: this._ownExternalBuffers });
        if (desc.edgeScalars) this.setEdgeScalars(desc.edgeScalars, { keepCPUData: this._keepCPUData });
        else if (desc.wasmEdgeScalars) this.setWasmEdgeScalars(desc.wasmEdgeScalars, { edgeCount: desc.edgeCount, capacity: wasmEdgeCapacity, keepCPUData: this._keepCPUData });
        else if (desc.edgeScalarsBuffer) this.setEdgeScalarsBuffer(resolveGPUBuffer(desc.edgeScalarsBuffer), { ownBuffer: this._ownExternalBuffers });
        if (desc.edgeColors) this.setEdgeColors(desc.edgeColors, { keepCPUData: this._keepCPUData });
        else if (desc.wasmEdgeColors) this.setWasmEdgeColors(desc.wasmEdgeColors, { edgeCount: desc.edgeCount, capacity: wasmEdgeCapacity, keepCPUData: this._keepCPUData });
        else if (desc.edgeColorsBuffer) this.setEdgeColorsBuffer(resolveGPUBuffer(desc.edgeColorsBuffer), { ownBuffer: this._ownExternalBuffers });
    }

    private applyExplicitBounds(desc: NodeLinkDescriptor): void {
        if (desc.boundsMin && desc.boundsMax) {
            this.setBounds(boundsFromBox(desc.boundsMin, desc.boundsMax), "explicit");
            if (desc.boundsCenter) this.boundsCenter = [desc.boundsCenter[0], desc.boundsCenter[1], desc.boundsCenter[2]];
            if (desc.boundsRadius !== undefined) this.boundsRadius = Math.max(0, desc.boundsRadius);
            return;
        }
        if (desc.boundsCenter || desc.boundsRadius !== undefined) this.setBounds(boundsFromSphere(desc.boundsCenter ?? [0, 0, 0], desc.boundsRadius ?? 0), "explicit");
    }

    private setBounds(bounds: Bounds3, source: BoundsSourceMode): void {
        this.boundsMin = [bounds.boxMin[0], bounds.boxMin[1], bounds.boxMin[2]];
        this.boundsMax = [bounds.boxMax[0], bounds.boxMax[1], bounds.boxMax[2]];
        this.boundsCenter = [bounds.sphereCenter[0], bounds.sphereCenter[1], bounds.sphereCenter[2]];
        this.boundsRadius = bounds.sphereRadius;
        this._boundsSource = source;
    }

    private clearComputedBoundsIfNeeded(): void {
        if (this._boundsSource !== "computed") return;
        this._boundsSource = "none";
        this.boundsMin = [0, 0, 0];
        this.boundsMax = [0, 0, 0];
        this.boundsCenter = [0, 0, 0];
        this.boundsRadius = 0;
    }

    private clearPendingWrites(target: PendingWriteTarget): void {
        let next = 0;
        for (let i = 0; i < this._pendingWrites.length; i++) {
            const write = this._pendingWrites[i];
            if (write.target === target) continue;
            this._pendingWrites[next++] = write;
        }
        this._pendingWrites.length = next;
    }

    private replaceNodePositionsBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.nodePositionsBuffer !== buffer) {
            this.clearPendingWrites("nodePositions");
            if (this.nodePositionsBuffer && this._nodePositionsOwned) this.nodePositionsBuffer.destroy();
        }
        this.nodePositionsBuffer = buffer;
        this._nodePositionsOwned = !!buffer && owned;
    }

    private replaceNodeScalarsBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.nodeScalarsBuffer !== buffer) {
            this.clearPendingWrites("nodeScalars");
            if (this.nodeScalarsBuffer && this._nodeScalarsOwned) this.nodeScalarsBuffer.destroy();
        }
        this.nodeScalarsBuffer = buffer;
        this._nodeScalarsOwned = !!buffer && owned;
    }

    private replaceNodeColorsBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.nodeColorsBuffer !== buffer) {
            this.clearPendingWrites("nodeColors");
            if (this.nodeColorsBuffer && this._nodeColorsOwned) this.nodeColorsBuffer.destroy();
        }
        this.nodeColorsBuffer = buffer;
        this._nodeColorsOwned = !!buffer && owned;
    }

    private replaceNodeRadiiBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.nodeRadiiBuffer !== buffer) {
            this.clearPendingWrites("nodeRadii");
            if (this.nodeRadiiBuffer && this._nodeRadiiOwned) this.nodeRadiiBuffer.destroy();
        }
        this.nodeRadiiBuffer = buffer;
        this._nodeRadiiOwned = !!buffer && owned;
    }

    private replaceEdgesBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.edgesBuffer !== buffer) {
            this.clearPendingWrites("edges");
            if (this.edgesBuffer && this._edgesOwned) this.edgesBuffer.destroy();
        }
        this.edgesBuffer = buffer;
        this._edgesOwned = !!buffer && owned;
    }

    private replaceEdgeScalarsBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.edgeScalarsBuffer !== buffer) {
            this.clearPendingWrites("edgeScalars");
            if (this.edgeScalarsBuffer && this._edgeScalarsOwned) this.edgeScalarsBuffer.destroy();
        }
        this.edgeScalarsBuffer = buffer;
        this._edgeScalarsOwned = !!buffer && owned;
    }

    private replaceEdgeColorsBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.edgeColorsBuffer !== buffer) {
            this.clearPendingWrites("edgeColors");
            if (this.edgeColorsBuffer && this._edgeColorsOwned) this.edgeColorsBuffer.destroy();
        }
        this.edgeColorsBuffer = buffer;
        this._edgeColorsOwned = !!buffer && owned;
    }

    private validateNodeArrayLength(length: number, stride: number, label: string): number {
        assert(stride === 3 || stride === 4, `NodeLink: ${label} stride must be 3 or 4.`);
        assert((length % stride) === 0, `NodeLink: ${label} length must be a multiple of ${stride}.`);
        return (length / stride) | 0;
    }

    private packVec4FromStride(data: Float32Array, stride: 3 | 4): Float32Array {
        if (stride === 4) return new Float32Array(data);
        const count = data.length / 3;
        const out = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
            const si = i * 3;
            const di = i * 4;
            out[di + 0] = data[si + 0];
            out[di + 1] = data[si + 1];
            out[di + 2] = data[si + 2];
            out[di + 3] = 0;
        }
        return out;
    }

    private queueWrite(target: PendingWriteTarget, byteOffset: number, data: ArrayBufferView): void {
        this._pendingWrites.push({ target, byteOffset, bytes: cloneBytes(data) });
        this.bindGroupKey = null;
    }

    private flushQueuedWrites(queue: GPUQueue): void {
        for (const write of this._pendingWrites) {
            const buf =
                write.target === "nodePositions" ? this.nodePositionsBuffer :
                write.target === "nodeScalars" ? this.nodeScalarsBuffer :
                write.target === "nodeColors" ? this.nodeColorsBuffer :
                write.target === "nodeRadii" ? this.nodeRadiiBuffer :
                write.target === "edges" ? this.edgesBuffer :
                write.target === "edgeScalars" ? this.edgeScalarsBuffer :
                this.edgeColorsBuffer;
            if (!buf) continue;
            queue.writeBuffer(buf, write.byteOffset, write.bytes.buffer, write.bytes.byteOffset, write.bytes.byteLength);
        }
        this._pendingWrites.length = 0;
    }

    private validateBufferCapacity(buffer: GPUBuffer | null, requiredBytes: number, label: string): void {
        if (!buffer || requiredBytes <= 0) return;
        const size = Number((buffer as { size?: number }).size ?? 0);
        if (Number.isFinite(size) && size > 0) assert(size >= requiredBytes, `NodeLink: ${label} buffer size must be at least ${requiredBytes} bytes for the active count.`);
    }

    private hasDirtyWasmSources(): boolean {
        return this._wasmNodePositionsDirty || this._wasmNodeScalarsDirty || this._wasmNodeColorsDirty || this._wasmNodeRadiiDirty || this._wasmEdgesDirty || this._wasmEdgeScalarsDirty || this._wasmEdgeColorsDirty;
    }

    private clearWasmNodePositionsState(destroyManagedBuffer: boolean): void {
        this._wasmNodePositionsSource = null;
        this._wasmNodePositionsDirty = false;
        this._wasmNodePositionsCapacityHint = 0;
        if (destroyManagedBuffer && this._nodePositionsWasmManaged) {
            this.replaceNodePositionsBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._nodePositionsWasmManaged = false;
        this._wasmNodePositionsCapacity = 0;
    }

    private clearWasmNodeScalarsState(destroyManagedBuffer: boolean): void {
        this._wasmNodeScalarsSource = null;
        this._wasmNodeScalarsDirty = false;
        this._wasmNodeScalarsCapacityHint = 0;
        if (destroyManagedBuffer && this._nodeScalarsWasmManaged) {
            this.replaceNodeScalarsBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._nodeScalarsWasmManaged = false;
        this._wasmNodeScalarsCapacity = 0;
    }

    private clearWasmNodeColorsState(destroyManagedBuffer: boolean): void {
        this._wasmNodeColorsSource = null;
        this._wasmNodeColorsDirty = false;
        this._wasmNodeColorsCapacityHint = 0;
        if (destroyManagedBuffer && this._nodeColorsWasmManaged) {
            this.replaceNodeColorsBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._nodeColorsWasmManaged = false;
        this._wasmNodeColorsCapacity = 0;
    }

    private clearWasmNodeRadiiState(destroyManagedBuffer: boolean): void {
        this._wasmNodeRadiiSource = null;
        this._wasmNodeRadiiDirty = false;
        this._wasmNodeRadiiCapacityHint = 0;
        if (destroyManagedBuffer && this._nodeRadiiWasmManaged) {
            this.replaceNodeRadiiBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._nodeRadiiWasmManaged = false;
        this._wasmNodeRadiiCapacity = 0;
    }

    private clearWasmEdgesState(destroyManagedBuffer: boolean): void {
        this._wasmEdgesSource = null;
        this._wasmEdgesDirty = false;
        this._wasmEdgesCapacityHint = 0;
        if (destroyManagedBuffer && this._edgesWasmManaged) {
            this.replaceEdgesBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._edgesWasmManaged = false;
        this._wasmEdgesCapacity = 0;
    }

    private clearWasmEdgeScalarsState(destroyManagedBuffer: boolean): void {
        this._wasmEdgeScalarsSource = null;
        this._wasmEdgeScalarsDirty = false;
        this._wasmEdgeScalarsCapacityHint = 0;
        if (destroyManagedBuffer && this._edgeScalarsWasmManaged) {
            this.replaceEdgeScalarsBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._edgeScalarsWasmManaged = false;
        this._wasmEdgeScalarsCapacity = 0;
    }

    private clearWasmEdgeColorsState(destroyManagedBuffer: boolean): void {
        this._wasmEdgeColorsSource = null;
        this._wasmEdgeColorsDirty = false;
        this._wasmEdgeColorsCapacityHint = 0;
        if (destroyManagedBuffer && this._edgeColorsWasmManaged) {
            this.replaceEdgeColorsBuffer(null, false);
            this.bindGroupKey = null;
        }
        this._edgeColorsWasmManaged = false;
        this._wasmEdgeColorsCapacity = 0;
    }

    private clearAllWasmState(destroyManagedBuffers: boolean): void {
        this.clearWasmNodePositionsState(destroyManagedBuffers);
        this.clearWasmNodeScalarsState(destroyManagedBuffers);
        this.clearWasmNodeColorsState(destroyManagedBuffers);
        this.clearWasmNodeRadiiState(destroyManagedBuffers);
        this.clearWasmEdgesState(destroyManagedBuffers);
        this.clearWasmEdgeScalarsState(destroyManagedBuffers);
        this.clearWasmEdgeColorsState(destroyManagedBuffers);
    }

    private primaryWasmNodeChannel(): NodeLinkWasmNodeChannel | null {
        if (this._wasmNodePositionsSource) return "nodePositions";
        if (this._wasmNodeScalarsSource) return "nodeScalars";
        if (this._wasmNodeColorsSource) return "nodeColors";
        if (this._wasmNodeRadiiSource) return "nodeRadii";
        return null;
    }

    private primaryWasmEdgeChannel(): NodeLinkWasmEdgeChannel | null {
        if (this._wasmEdgesSource) return "edges";
        if (this._wasmEdgeScalarsSource) return "edgeScalars";
        if (this._wasmEdgeColorsSource) return "edgeColors";
        return null;
    }

    private validateNonWasmNodeChannelsForCount(nodeCount: number): void {
        const count = assertWasmRecordCount(nodeCount, "NodeLink: nodeCount");
        if (!this._wasmNodePositionsSource && this._nodePositionsCPU) assert((this._nodePositionsCPU.length / 4) === count, "NodeLink: nodePositions length must equal nodeCount*4.");
        if (!this._wasmNodeScalarsSource && this._nodeScalarsCPU) assert(this._nodeScalarsCPU.length === count, "NodeLink: nodeScalars length must equal nodeCount.");
        if (!this._wasmNodeColorsSource && this._nodeColorsCPU) assert((this._nodeColorsCPU.length / 4) === count, "NodeLink: nodeColors length must equal nodeCount*4.");
        if (!this._wasmNodeRadiiSource && this._nodeRadiiCPU) assert((this._nodeRadiiCPU.length / 4) === count, "NodeLink: nodeRadii length must equal nodeCount*4.");
        if (!this._wasmNodePositionsSource) this.validateBufferCapacity(this.nodePositionsBuffer, count * NODELINK_VEC4_BYTES, "nodePositions");
        if (!this._wasmNodeScalarsSource) this.validateBufferCapacity(this.nodeScalarsBuffer, count * NODELINK_F32_BYTES, "nodeScalars");
        if (!this._wasmNodeColorsSource) this.validateBufferCapacity(this.nodeColorsBuffer, count * NODELINK_VEC4_BYTES, "nodeColors");
        if (!this._wasmNodeRadiiSource) this.validateBufferCapacity(this.nodeRadiiBuffer, count * NODELINK_VEC4_BYTES, "nodeRadii");
    }

    private validateNonWasmEdgeChannelsForCount(edgeCount: number): void {
        const count = assertWasmRecordCount(edgeCount, "NodeLink: edgeCount");
        if (!this._wasmEdgesSource && this._edgesCPU) assert((this._edgesCPU.length / 2) === count, "NodeLink: edges length must equal edgeCount*2.");
        if (!this._wasmEdgeScalarsSource && this._edgeScalarsCPU) assert(this._edgeScalarsCPU.length === count, "NodeLink: edgeScalars length must equal edgeCount.");
        if (!this._wasmEdgeColorsSource && this._edgeColorsCPU) assert((this._edgeColorsCPU.length / 4) === count, "NodeLink: edgeColors length must equal edgeCount*4.");
        if (!this._wasmEdgesSource) this.validateBufferCapacity(this.edgesBuffer, count * NODELINK_EDGE_BYTES, "edges");
        if (!this._wasmEdgeScalarsSource) this.validateBufferCapacity(this.edgeScalarsBuffer, count * NODELINK_F32_BYTES, "edgeScalars");
        if (!this._wasmEdgeColorsSource) this.validateBufferCapacity(this.edgeColorsBuffer, count * NODELINK_VEC4_BYTES, "edgeColors");
    }

    private setNodeCountFromWasm(nodeCount: number): void {
        const count = assertWasmRecordCount(nodeCount, "NodeLink: nodeCount");
        const changed = count !== this._nodeCount;
        if (changed) this.validateNonWasmNodeChannelsForCount(count);
        this._nodeCount = count;
        if (!changed) return;
        if (this._wasmNodePositionsSource) { this._wasmNodePositionsDirty = true; this._nodePositionsDirty = true; }
        if (this._wasmNodeScalarsSource) { this._wasmNodeScalarsDirty = true; this._nodeScalarsDirty = true; }
        if (this._wasmNodeColorsSource) { this._wasmNodeColorsDirty = true; this._nodeColorsDirty = true; }
        if (this._wasmNodeRadiiSource) { this._wasmNodeRadiiDirty = true; this._nodeRadiiDirty = true; }
    }

    private setEdgeCountFromWasm(edgeCount: number): void {
        const count = assertWasmRecordCount(edgeCount, "NodeLink: edgeCount");
        const changed = count !== this._edgeCount;
        if (changed) this.validateNonWasmEdgeChannelsForCount(count);
        this._edgeCount = count;
        if (!changed) return;
        if (this._wasmEdgesSource) { this._wasmEdgesDirty = true; this._edgesDirty = true; }
        if (this._wasmEdgeScalarsSource) { this._wasmEdgeScalarsDirty = true; this._edgeScalarsDirty = true; }
        if (this._wasmEdgeColorsSource) { this._wasmEdgeColorsDirty = true; this._edgeColorsDirty = true; }
    }

    private resolveWasmNodeCount(channel: NodeLinkWasmNodeChannel, source: WasmMemoryView<Float32Array>, explicitNodeCount: number | undefined): number {
        const field = wasmNodeFieldName(channel);
        const primary = this.primaryWasmNodeChannel();
        const components = nodeWasmComponents(channel);
        if (explicitNodeCount !== undefined) {
            const count = assertWasmRecordCount(explicitNodeCount, "NodeLink: nodeCount");
            assert(!primary || channel === primary || count === this._nodeCount, `NodeLink: refreshWasm${field.slice(4)} nodeCount must match the current nodeCount when another node wasm source is active; call refreshFromWasm() to update node count.`);
            validateWasmRecordRange(source, count, components, `NodeLink: ${field}`, "nodeCount");
            return count;
        }
        if (channel === primary) return resolveWasmRecordCount(source, undefined, components, `NodeLink: ${field}`, "NodeLink: nodeCount", "nodeCount");
        assert(this._nodeCount > 0 || source.length === 0, `NodeLink: nodeCount is required when using ${field} without a node wasm source.`);
        validateWasmRecordRange(source, this._nodeCount, components, `NodeLink: ${field}`, "nodeCount");
        return this._nodeCount;
    }

    private resolveWasmEdgeCount(channel: NodeLinkWasmEdgeChannel, source: WasmMemoryView<Float32Array> | WasmMemoryView<Uint32Array>, explicitEdgeCount: number | undefined): number {
        const field = wasmEdgeFieldName(channel);
        const primary = this.primaryWasmEdgeChannel();
        const components = edgeWasmComponents(channel);
        if (explicitEdgeCount !== undefined) {
            const count = assertWasmRecordCount(explicitEdgeCount, "NodeLink: edgeCount");
            assert(!primary || channel === primary || count === this._edgeCount, `NodeLink: refreshWasm${field.slice(4)} edgeCount must match the current edgeCount when another edge wasm source is active; call refreshFromWasm() to update edge count.`);
            validateWasmRecordRange(source, count, components, `NodeLink: ${field}`, "edgeCount");
            return count;
        }
        if (channel === primary) return resolveWasmRecordCount(source, undefined, components, `NodeLink: ${field}`, "NodeLink: edgeCount", "edgeCount");
        assert(this._edgeCount > 0 || source.length === 0, `NodeLink: edgeCount is required when using ${field} without an edge wasm source.`);
        validateWasmRecordRange(source, this._edgeCount, components, `NodeLink: ${field}`, "edgeCount");
        return this._edgeCount;
    }

    private setWasmNodeChannelSource(channel: NodeLinkWasmNodeChannel, source: WasmMemoryView<Float32Array> | null, capacity: number | undefined): boolean {
        if (source === null) {
            if (channel === "nodePositions") this.clearWasmNodePositionsState(true);
            else if (channel === "nodeScalars") this.clearWasmNodeScalarsState(true);
            else if (channel === "nodeColors") this.clearWasmNodeColorsState(true);
            else this.clearWasmNodeRadiiState(true);
            return false;
        }
        const field = wasmNodeFieldName(channel);
        const wasmSource = assertWasmF32View(source, `NodeLink: ${field}`);
        const capacityHint = assertWasmCapacity(capacity, `NodeLink: ${field} capacity`);
        if (channel === "nodePositions") {
            this._wasmNodePositionsCapacityHint = capacityHint;
            if (!this._nodePositionsWasmManaged) { this.replaceNodePositionsBuffer(null, false); this._wasmNodePositionsCapacity = 0; this.bindGroupKey = null; }
            this._wasmNodePositionsSource = wasmSource;
            this._nodePositionsCPU = null;
            this._nodePositionsExternal = false;
        } else if (channel === "nodeScalars") {
            this._wasmNodeScalarsCapacityHint = capacityHint;
            if (!this._nodeScalarsWasmManaged) { this.replaceNodeScalarsBuffer(null, false); this._wasmNodeScalarsCapacity = 0; this.bindGroupKey = null; }
            this._wasmNodeScalarsSource = wasmSource;
            this._nodeScalarsCPU = null;
            this._nodeScalarsExternal = false;
        } else if (channel === "nodeColors") {
            this._wasmNodeColorsCapacityHint = capacityHint;
            if (!this._nodeColorsWasmManaged) { this.replaceNodeColorsBuffer(null, false); this._wasmNodeColorsCapacity = 0; this.bindGroupKey = null; }
            this._wasmNodeColorsSource = wasmSource;
            this._nodeColorsCPU = null;
            this._nodeColorsExternal = false;
        } else {
            this._wasmNodeRadiiCapacityHint = capacityHint;
            if (!this._nodeRadiiWasmManaged) { this.replaceNodeRadiiBuffer(null, false); this._wasmNodeRadiiCapacity = 0; this.bindGroupKey = null; }
            this._wasmNodeRadiiSource = wasmSource;
            this._nodeRadiiCPU = null;
            this._nodeRadiiExternal = false;
        }
        this.clearPendingWrites(channel);
        return true;
    }

    private setWasmEdgeChannelSource(channel: NodeLinkWasmEdgeChannel, source: WasmMemoryView<Float32Array> | WasmMemoryView<Uint32Array> | null, capacity: number | undefined): boolean {
        if (source === null) {
            if (channel === "edges") this.clearWasmEdgesState(true);
            else if (channel === "edgeScalars") this.clearWasmEdgeScalarsState(true);
            else this.clearWasmEdgeColorsState(true);
            return false;
        }
        const field = wasmEdgeFieldName(channel);
        const capacityHint = assertWasmCapacity(capacity, `NodeLink: ${field} capacity`);
        if (channel === "edges") {
            const wasmSource = assertWasmU32View(source, "NodeLink: wasmEdges");
            this._wasmEdgesCapacityHint = capacityHint;
            if (!this._edgesWasmManaged) { this.replaceEdgesBuffer(null, false); this._wasmEdgesCapacity = 0; this.bindGroupKey = null; }
            this._wasmEdgesSource = wasmSource;
            this._edgesCPU = null;
            this._edgesExternal = false;
        } else if (channel === "edgeScalars") {
            const wasmSource = assertWasmF32View(source, "NodeLink: wasmEdgeScalars");
            this._wasmEdgeScalarsCapacityHint = capacityHint;
            if (!this._edgeScalarsWasmManaged) { this.replaceEdgeScalarsBuffer(null, false); this._wasmEdgeScalarsCapacity = 0; this.bindGroupKey = null; }
            this._wasmEdgeScalarsSource = wasmSource;
            this._edgeScalarsCPU = null;
            this._edgeScalarsExternal = false;
        } else {
            const wasmSource = assertWasmF32View(source, "NodeLink: wasmEdgeColors");
            this._wasmEdgeColorsCapacityHint = capacityHint;
            if (!this._edgeColorsWasmManaged) { this.replaceEdgeColorsBuffer(null, false); this._wasmEdgeColorsCapacity = 0; this.bindGroupKey = null; }
            this._wasmEdgeColorsSource = wasmSource;
            this._edgeColorsCPU = null;
            this._edgeColorsExternal = false;
        }
        this.clearPendingWrites(channel);
        return true;
    }

    private copyWasmF32Range(source: WasmMemoryView<Float32Array>, elementCount: number): Float32Array {
        const view = source.array();
        return new Float32Array(view.subarray(0, elementCount));
    }

    private copyWasmU32Range(source: WasmMemoryView<Uint32Array>, elementCount: number): Uint32Array {
        const view = source.array();
        return new Uint32Array(view.subarray(0, elementCount));
    }

    private computeBoundsFromPackedPositions(data: Float32Array, nodeCount: number): void {
        if (nodeCount <= 0) return;
        let minX = data[0], minY = data[1], minZ = data[2];
        let maxX = data[0], maxY = data[1], maxZ = data[2];
        for (let i = 1; i < nodeCount; i++) {
            const o = i * 4;
            const x = data[o + 0], y = data[o + 1], z = data[o + 2];
            if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
        }
        const cx = (minX + maxX) * 0.5;
        const cy = (minY + maxY) * 0.5;
        const cz = (minZ + maxZ) * 0.5;
        let radius = 0;
        for (let i = 0; i < nodeCount; i++) {
            const o = i * 4;
            const dx = data[o + 0] - cx, dy = data[o + 1] - cy, dz = data[o + 2] - cz;
            const d = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
            if (d > radius) radius = d;
        }
        this.setBounds(boundsFromBox([minX, minY, minZ], [maxX, maxY, maxZ]), "computed");
        this.boundsCenter = [cx, cy, cz];
        this.boundsRadius = radius;
    }

    private updateWasmNodeBounds(options: NodeLinkWasmNodeRefreshOptions, source: WasmMemoryView<Float32Array>, nodeCount: number): void {
        if (options.recomputeBounds && this._boundsSource !== "explicit") {
            this.computeBoundsFromPackedPositions(source.array(), nodeCount);
            return;
        }
        this.clearComputedBoundsIfNeeded();
    }

    private ensureWasmNodePositionsBuffer(device: GPUDevice, nodeCount: number): void {
        const required = Math.max(nodeCount, this._wasmNodePositionsCapacityHint);
        if (required <= 0) return;
        if (this.nodePositionsBuffer && this._nodePositionsWasmManaged && this._wasmNodePositionsCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmNodePositionsCapacity);
        this.replaceNodePositionsBuffer(device.createBuffer({ label: "NodeLink.wasmNodePositions", size: capacity * NODELINK_VEC4_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._nodePositionsWasmManaged = true;
        this._wasmNodePositionsCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmNodeScalarsBuffer(device: GPUDevice, nodeCount: number): void {
        const required = Math.max(nodeCount, this._wasmNodeScalarsCapacityHint);
        if (required <= 0) return;
        if (this.nodeScalarsBuffer && this._nodeScalarsWasmManaged && this._wasmNodeScalarsCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmNodeScalarsCapacity);
        this.replaceNodeScalarsBuffer(device.createBuffer({ label: "NodeLink.wasmNodeScalars", size: capacity * NODELINK_F32_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._nodeScalarsWasmManaged = true;
        this._wasmNodeScalarsCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmNodeColorsBuffer(device: GPUDevice, nodeCount: number): void {
        const required = Math.max(nodeCount, this._wasmNodeColorsCapacityHint);
        if (required <= 0) return;
        if (this.nodeColorsBuffer && this._nodeColorsWasmManaged && this._wasmNodeColorsCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmNodeColorsCapacity);
        this.replaceNodeColorsBuffer(device.createBuffer({ label: "NodeLink.wasmNodeColors", size: capacity * NODELINK_VEC4_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._nodeColorsWasmManaged = true;
        this._wasmNodeColorsCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmNodeRadiiBuffer(device: GPUDevice, nodeCount: number): void {
        const required = Math.max(nodeCount, this._wasmNodeRadiiCapacityHint);
        if (required <= 0) return;
        if (this.nodeRadiiBuffer && this._nodeRadiiWasmManaged && this._wasmNodeRadiiCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmNodeRadiiCapacity);
        this.replaceNodeRadiiBuffer(device.createBuffer({ label: "NodeLink.wasmNodeRadii", size: capacity * NODELINK_VEC4_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._nodeRadiiWasmManaged = true;
        this._wasmNodeRadiiCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmEdgesBuffer(device: GPUDevice, edgeCount: number): void {
        const required = Math.max(edgeCount, this._wasmEdgesCapacityHint);
        if (required <= 0) return;
        if (this.edgesBuffer && this._edgesWasmManaged && this._wasmEdgesCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmEdgesCapacity);
        this.replaceEdgesBuffer(device.createBuffer({ label: "NodeLink.wasmEdges", size: capacity * NODELINK_EDGE_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._edgesWasmManaged = true;
        this._wasmEdgesCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmEdgeScalarsBuffer(device: GPUDevice, edgeCount: number): void {
        const required = Math.max(edgeCount, this._wasmEdgeScalarsCapacityHint);
        if (required <= 0) return;
        if (this.edgeScalarsBuffer && this._edgeScalarsWasmManaged && this._wasmEdgeScalarsCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmEdgeScalarsCapacity);
        this.replaceEdgeScalarsBuffer(device.createBuffer({ label: "NodeLink.wasmEdgeScalars", size: capacity * NODELINK_F32_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._edgeScalarsWasmManaged = true;
        this._wasmEdgeScalarsCapacity = capacity;
        this.bindGroupKey = null;
    }

    private ensureWasmEdgeColorsBuffer(device: GPUDevice, edgeCount: number): void {
        const required = Math.max(edgeCount, this._wasmEdgeColorsCapacityHint);
        if (required <= 0) return;
        if (this.edgeColorsBuffer && this._edgeColorsWasmManaged && this._wasmEdgeColorsCapacity >= required) return;
        const capacity = growWasmCapacity(required, this._wasmEdgeColorsCapacity);
        this.replaceEdgeColorsBuffer(device.createBuffer({ label: "NodeLink.wasmEdgeColors", size: capacity * NODELINK_VEC4_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), true);
        this._edgeColorsWasmManaged = true;
        this._wasmEdgeColorsCapacity = capacity;
        this.bindGroupKey = null;
    }

    get nodeCount(): number {
        return this._nodeCount;
    }

    get edgeCount(): number {
        return this._edgeCount;
    }

    get occluderRevision(): number {
        let hash = 2166136261 >>> 0;
        hash = mixNodeLinkRevision(hash, this._nodeCount >>> 0);
        hash = mixNodeLinkRevision(hash, this._edgeCount >>> 0);
        hash = mixNodeLinkRevision(hash, this._nodeScaleRevision >>> 0);
        hash = mixNodeLinkRevision(hash, this._edgeScaleRevision >>> 0);
        hash = mixNodeLinkRevision(hash, this.blendMode === BlendMode.Opaque ? 1 : this.blendMode === BlendMode.Transparent ? 2 : 3);
        hash = mixNodeLinkRevision(hash, this.cullMode === CullMode.Back ? 1 : this.cullMode === CullMode.Front ? 2 : 3);
        hash = mixNodeLinkRevision(hash, this.depthWrite ? 1 : 0);
        hash = mixNodeLinkRevision(hash, this.depthTest ? 1 : 0);
        hash = mixNodeLinkRevision(hash, nodeGeometryModeId(this._nodeGeometryMode) >>> 0);
        hash = mixNodeLinkRevision(hash, edgeGeometryModeId(this._edgeGeometryMode) >>> 0);
        hash = mixNodeLinkRevision(hash, colorModeId(this._nodeColorMode) >>> 0);
        hash = mixNodeLinkRevision(hash, colorModeId(this._edgeColorMode) >>> 0);
        hash = mixNodeLinkRevision(hash, this._nodePositionsDirty ? 1 : 0);
        hash = mixNodeLinkRevision(hash, this._nodeRadiiDirty ? 1 : 0);
        hash = mixNodeLinkRevision(hash, this._edgesDirty ? 1 : 0);
        hash = mixNodeLinkRevisionF32(hash, this._nodeSize);
        hash = mixNodeLinkRevisionF32(hash, this._edgeSize);
        hash = mixNodeLinkRevisionF32(hash, this._minPointSize);
        hash = mixNodeLinkRevisionF32(hash, this._maxPointSize);
        hash = mixNodeLinkRevisionF32(hash, this._pointSizeAttenuation);
        return hash >>> 0;
    }

    get ndShape(): number[] | null {
        return this._ndShape ? this._ndShape.slice() : null;
    }

    set ndShape(shape: ReadonlyArray<number> | null) {
        this._ndShape = normalizePositiveIntShape(shape, "NodeLink: ndShape");
    }

    get nodeGeometryMode(): NodeLinkNodeGeometryMode {
        return this._nodeGeometryMode;
    }

    set nodeGeometryMode(v: NodeLinkNodeGeometryMode) {
        assert(isNodeGeometryMode(v), `NodeLink: invalid nodeGeometryMode '${String(v)}'.`);
        if (v !== this._nodeGeometryMode) {
            this._nodeGeometryMode = v;
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get edgeGeometryMode(): NodeLinkEdgeGeometryMode {
        return this._edgeGeometryMode;
    }

    set edgeGeometryMode(v: NodeLinkEdgeGeometryMode) {
        assert(isEdgeGeometryMode(v), `NodeLink: invalid edgeGeometryMode '${String(v)}'.`);
        if (v !== this._edgeGeometryMode) {
            this._edgeGeometryMode = v;
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get nodeColorMode(): NodeLinkColorMode {
        return this._nodeColorMode;
    }

    set nodeColorMode(v: NodeLinkColorMode) {
        assert(isColorMode(v), `NodeLink: invalid nodeColorMode '${String(v)}'.`);
        if (v !== this._nodeColorMode) {
            this._nodeColorMode = v;
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get edgeColorMode(): NodeLinkColorMode {
        return this._edgeColorMode;
    }

    set edgeColorMode(v: NodeLinkColorMode) {
        assert(isColorMode(v), `NodeLink: invalid edgeColorMode '${String(v)}'.`);
        if (v !== this._edgeColorMode) {
            this._edgeColorMode = v;
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get nodeScaleTransform(): ScaleTransform {
        return cloneScaleTransform(this._nodeScaleTransform);
    }

    setNodeScaleTransform(t: ScaleTransformDescriptor | ScaleTransform): void {
        this._nodeScaleTransform = normalizeNodeScaleTransform(t);
        this._uniformDirty = true;
        this._nodeScaleRevision++;
        this.emitVisualChange("scale");
    }

    get edgeScaleTransform(): ScaleTransform {
        return cloneScaleTransform(this._edgeScaleTransform);
    }

    setEdgeScaleTransform(t: ScaleTransformDescriptor | ScaleTransform): void {
        this._edgeScaleTransform = normalizeEdgeScaleTransform(t);
        this._uniformDirty = true;
        this._edgeScaleRevision++;
        this.emitVisualChange("scale");
    }

    applyNodeScaleStats(stats: ScaleStatsResult): void {
        const n = cloneScaleTransform(this._nodeScaleTransform);
        if (Number.isFinite(stats.min)) n.domainMin = stats.min;
        if (Number.isFinite(stats.max)) n.domainMax = stats.max;
        if (stats.percentileMin !== null && stats.percentileMax !== null) {
            n.clampMin = stats.percentileMin;
            n.clampMax = stats.percentileMax;
        }
        this._nodeScaleTransform = normalizeNodeScaleTransform(n);
        this._uniformDirty = true;
        this._nodeScaleRevision++;
        this.emitVisualChange("scale");
    }

    applyEdgeScaleStats(stats: ScaleStatsResult): void {
        const n = cloneScaleTransform(this._edgeScaleTransform);
        if (Number.isFinite(stats.min)) n.domainMin = stats.min;
        if (Number.isFinite(stats.max)) n.domainMax = stats.max;
        if (stats.percentileMin !== null && stats.percentileMax !== null) {
            n.clampMin = stats.percentileMin;
            n.clampMax = stats.percentileMax;
        }
        this._edgeScaleTransform = normalizeEdgeScaleTransform(n);
        this._uniformDirty = true;
        this._edgeScaleRevision++;
        this.emitVisualChange("scale");
    }

    onVisualChange(listener: (kind: NodeLinkVisualChangeKind) => void): () => void {
        this._visualChangeListeners.add(listener);
        return () => this._visualChangeListeners.delete(listener);
    }

    getNodeScaleSourceDescriptor(revision: number = this._nodeScaleRevision): ScaleSourceDescriptor | null {
        if (!this.nodeScalarsBuffer || this._nodeCount <= 0) return null;
        return { buffer: this.nodeScalarsBuffer, count: this._nodeCount, componentCount: this._nodeScaleTransform.componentCount, componentIndex: this._nodeScaleTransform.componentIndex, valueMode: this._nodeScaleTransform.valueMode, stride: this._nodeScaleTransform.stride, offset: this._nodeScaleTransform.offset, revision };
    }

    getEdgeScaleSourceDescriptor(revision: number = this._edgeScaleRevision): ScaleSourceDescriptor | null {
        if (!this.edgeScalarsBuffer || this._edgeCount <= 0) return null;
        return { buffer: this.edgeScalarsBuffer, count: this._edgeCount, componentCount: this._edgeScaleTransform.componentCount, componentIndex: this._edgeScaleTransform.componentIndex, valueMode: this._edgeScaleTransform.valueMode, stride: this._edgeScaleTransform.stride, offset: this._edgeScaleTransform.offset, revision };
    }

    get nodeColormap(): NodeLinkColormap | Colormap {
        return this._nodeColormap;
    }

    set nodeColormap(v: NodeLinkColormap | Colormap) {
        this._nodeColormap = v;
        this._uniformDirty = true;
        this.bindGroupKey = null;
        this.emitVisualChange("colormap");
    }

    get edgeColormap(): NodeLinkColormap | Colormap {
        return this._edgeColormap;
    }

    set edgeColormap(v: NodeLinkColormap | Colormap) {
        this._edgeColormap = v;
        this._uniformDirty = true;
        this.bindGroupKey = null;
        this.emitVisualChange("colormap");
    }

    get nodeColormapStops(): Color4[] {
        return this._nodeColormapStops;
    }

    set nodeColormapStops(v: Color4[]) {
        this._nodeColormapStops = normalizeColorStops(v);
        this._uniformDirty = true;
        this.emitVisualChange("colormap");
    }

    get edgeColormapStops(): Color4[] {
        return this._edgeColormapStops;
    }

    set edgeColormapStops(v: Color4[]) {
        this._edgeColormapStops = normalizeColorStops(v);
        this._uniformDirty = true;
        this.emitVisualChange("colormap");
    }

    get nodeSolidColor(): Color4 {
        return [this._nodeSolidColor[0], this._nodeSolidColor[1], this._nodeSolidColor[2], this._nodeSolidColor[3]];
    }

    set nodeSolidColor(v: Color4) {
        this._nodeSolidColor = [v[0], v[1], v[2], v[3]];
        this._uniformDirty = true;
        this.emitVisualChange("visual");
    }

    get edgeSolidColor(): Color4 {
        return [this._edgeSolidColor[0], this._edgeSolidColor[1], this._edgeSolidColor[2], this._edgeSolidColor[3]];
    }

    set edgeSolidColor(v: Color4) {
        this._edgeSolidColor = [v[0], v[1], v[2], v[3]];
        this._uniformDirty = true;
        this.emitVisualChange("visual");
    }

    get nodeSize(): number {
        return this._nodeSize;
    }

    set nodeSize(v: number) {
        if (v !== this._nodeSize) {
            this._nodeSize = Math.max(0, v);
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get edgeSize(): number {
        return this._edgeSize;
    }

    set edgeSize(v: number) {
        if (v !== this._edgeSize) {
            this._edgeSize = Math.max(0, v);
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(v: number) {
        if (v !== this._opacity) {
            this._opacity = clamp01(v);
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get lit(): boolean {
        return this._lit;
    }

    set lit(v: boolean) {
        const b = !!v;
        if (b !== this._lit) {
            this._lit = b;
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get minPointSize(): number {
        return this._minPointSize;
    }

    set minPointSize(v: number) {
        if (v !== this._minPointSize) {
            this._minPointSize = Math.max(0, v);
            if (this._maxPointSize < this._minPointSize) {
                this._maxPointSize = this._minPointSize;
            }
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get maxPointSize(): number {
        return this._maxPointSize;
    }

    set maxPointSize(v: number) {
        if (v !== this._maxPointSize) {
            this._maxPointSize = Math.max(this._minPointSize, v);
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    get pointSizeAttenuation(): number {
        return this._pointSizeAttenuation;
    }

    set pointSizeAttenuation(v: number) {
        if (v !== this._pointSizeAttenuation) {
            this._pointSizeAttenuation = Math.max(0, v);
            this._uniformDirty = true;
            this.emitVisualChange("visual");
        }
    }

    setNodePositions(data: Float32Array, opts: { stride?: 3 | 4; keepCPUData?: boolean } = {}): void {
        const stride = opts.stride ?? 3;
        const count = this.validateNodeArrayLength(data.length, stride, "nodePositions");
        this.clearWasmNodePositionsState(true);
        this.replaceNodePositionsBuffer(null, false);
        this._nodeCount = count;
        this._nodePositionsCPU = this.packVec4FromStride(data, stride);
        this._nodePositionsExternal = false;
        this._nodePositionsDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.clearComputedBoundsIfNeeded();
        this.bindGroupKey = null;
    }

    updateNodePositions(data: Float32Array, startNode: number = 0, stride: 3 | 4 = 3): void {
        const patchCount = this.validateNodeArrayLength(data.length, stride, "nodePositions patch");
        const start = startNode | 0;
        assert(start >= 0, "NodeLink: updateNodePositions startNode must be >= 0.");
        assert((start + patchCount) <= this._nodeCount, "NodeLink: updateNodePositions range exceeds nodeCount.");
        const packed = this.packVec4FromStride(data, stride);
        if (this._nodePositionsCPU) this._nodePositionsCPU.set(packed, start * 4);
        if (this.nodePositionsBuffer) this.queueWrite("nodePositions", start * 16, packed);
        else this._nodePositionsDirty = true;
        this.clearComputedBoundsIfNeeded();
    }

    setNodePositionsBuffer(buffer: GPUBuffer, nodeCount: number, opts: { ownBuffer?: boolean } = {}): void {
        assert(!!buffer, "NodeLink: nodePositionsBuffer is required.");
        assert(Number.isInteger(nodeCount) && nodeCount >= 0, "NodeLink: nodeCount must be an integer >= 0.");
        this.clearWasmNodePositionsState(true);
        this.replaceNodePositionsBuffer(buffer, !!opts.ownBuffer);
        this._nodeCount = nodeCount | 0;
        this._nodePositionsCPU = null;
        this._nodePositionsExternal = true;
        this._nodePositionsDirty = false;
        this.bindGroupKey = null;
    }

    setNodeScalars(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert(data.length === this._nodeCount, "NodeLink: nodeScalars length must equal nodeCount.");
        this.clearWasmNodeScalarsState(true);
        this.replaceNodeScalarsBuffer(null, false);
        this._nodeScalarsCPU = new Float32Array(data);
        this._nodeScalarsExternal = false;
        this._nodeScalarsDirty = true;
        this._nodeScaleRevision++;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.bindGroupKey = null;
    }

    updateNodeScalars(data: Float32Array, startNode: number = 0): void {
        const start = startNode | 0;
        assert(start >= 0, "NodeLink: updateNodeScalars startNode must be >= 0.");
        assert((start + data.length) <= this._nodeCount, "NodeLink: updateNodeScalars range exceeds nodeCount.");
        if (this._nodeScalarsCPU) this._nodeScalarsCPU.set(data, start);
        if (this.nodeScalarsBuffer) this.queueWrite("nodeScalars", start * 4, data);
        else this._nodeScalarsDirty = true;
        this._nodeScaleRevision++;
    }

    setNodeScalarsBuffer(buffer: GPUBuffer | null, opts: { ownBuffer?: boolean } = {}): void {
        this.clearWasmNodeScalarsState(true);
        this.replaceNodeScalarsBuffer(buffer, !!buffer && !!opts.ownBuffer);
        this._nodeScalarsCPU = null;
        this._nodeScalarsExternal = !!buffer;
        this._nodeScalarsDirty = false;
        this._nodeScaleRevision++;
        this.bindGroupKey = null;
    }

    setNodeColors(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert((data.length % 4) === 0, "NodeLink: nodeColors length must be a multiple of 4.");
        assert((data.length / 4) === this._nodeCount, "NodeLink: nodeColors length must equal nodeCount*4.");
        this.clearWasmNodeColorsState(true);
        this.replaceNodeColorsBuffer(null, false);
        this._nodeColorsCPU = new Float32Array(data);
        this._nodeColorsExternal = false;
        this._nodeColorsDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.bindGroupKey = null;
    }

    updateNodeColors(data: Float32Array, startNode: number = 0): void {
        assert((data.length % 4) === 0, "NodeLink: updateNodeColors length must be a multiple of 4.");
        const start = startNode | 0;
        const patchCount = data.length / 4;
        assert(start >= 0, "NodeLink: updateNodeColors startNode must be >= 0.");
        assert((start + patchCount) <= this._nodeCount, "NodeLink: updateNodeColors range exceeds nodeCount.");
        if (this._nodeColorsCPU) this._nodeColorsCPU.set(data, start * 4);
        if (this.nodeColorsBuffer) this.queueWrite("nodeColors", start * 16, data);
        else this._nodeColorsDirty = true;
    }

    setNodeColorsBuffer(buffer: GPUBuffer | null, opts: { ownBuffer?: boolean } = {}): void {
        this.clearWasmNodeColorsState(true);
        this.replaceNodeColorsBuffer(buffer, !!buffer && !!opts.ownBuffer);
        this._nodeColorsCPU = null;
        this._nodeColorsExternal = !!buffer;
        this._nodeColorsDirty = false;
        this.bindGroupKey = null;
    }

    setNodeRadii(data: Float32Array, opts: { stride?: 3 | 4; keepCPUData?: boolean } = {}): void {
        const stride = opts.stride ?? 3;
        const count = this.validateNodeArrayLength(data.length, stride, "nodeRadii");
        assert(count === this._nodeCount, "NodeLink: nodeRadii count must equal nodeCount.");
        this.clearWasmNodeRadiiState(true);
        this.replaceNodeRadiiBuffer(null, false);
        this._nodeRadiiCPU = this.packVec4FromStride(data, stride);
        this._nodeRadiiExternal = false;
        this._nodeRadiiDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.bindGroupKey = null;
    }

    updateNodeRadii(data: Float32Array, startNode: number = 0, stride: 3 | 4 = 3): void {
        const patchCount = this.validateNodeArrayLength(data.length, stride, "nodeRadii patch");
        const start = startNode | 0;
        assert(start >= 0, "NodeLink: updateNodeRadii startNode must be >= 0.");
        assert((start + patchCount) <= this._nodeCount, "NodeLink: updateNodeRadii range exceeds nodeCount.");
        const packed = this.packVec4FromStride(data, stride);
        if (this._nodeRadiiCPU) this._nodeRadiiCPU.set(packed, start * 4);
        if (this.nodeRadiiBuffer) this.queueWrite("nodeRadii", start * 16, packed);
        else this._nodeRadiiDirty = true;
    }

    setNodeRadiiBuffer(buffer: GPUBuffer | null, opts: { ownBuffer?: boolean } = {}): void {
        this.clearWasmNodeRadiiState(true);
        this.replaceNodeRadiiBuffer(buffer, !!buffer && !!opts.ownBuffer);
        this._nodeRadiiCPU = null;
        this._nodeRadiiExternal = !!buffer;
        this._nodeRadiiDirty = false;
        this.bindGroupKey = null;
    }

    setEdges(data: Uint16Array | Uint32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert(data instanceof Uint16Array || data instanceof Uint32Array, "NodeLink: edges must be a Uint16Array or Uint32Array.");
        assert((data.length % 2) === 0, "NodeLink: edges length must be a multiple of 2.");
        const u32 = data instanceof Uint32Array ? data : new Uint32Array(data);
        for (let i = 0; i < u32.length; i++) assert(u32[i] < this._nodeCount, `NodeLink: edge index ${u32[i]} is out of range.`);
        this.clearWasmEdgesState(true);
        this.replaceEdgesBuffer(null, false);
        this._edgeCount = (u32.length / 2) | 0;
        this._edgesCPU = new Uint32Array(u32);
        this._edgesExternal = false;
        this._edgesDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.bindGroupKey = null;
    }

    updateEdges(data: Uint16Array | Uint32Array, startEdge: number = 0): void {
        assert(data instanceof Uint16Array || data instanceof Uint32Array, "NodeLink: updateEdges data must be a Uint16Array or Uint32Array.");
        assert((data.length % 2) === 0, "NodeLink: updateEdges length must be a multiple of 2.");
        const u32 = data instanceof Uint32Array ? data : new Uint32Array(data);
        const start = startEdge | 0;
        const patchCount = (u32.length / 2) | 0;
        assert(start >= 0, "NodeLink: updateEdges startEdge must be >= 0.");
        assert((start + patchCount) <= this._edgeCount, "NodeLink: updateEdges range exceeds edgeCount.");
        for (let i = 0; i < u32.length; i++) assert(u32[i] < this._nodeCount, `NodeLink: edge index ${u32[i]} is out of range.`);
        if (this._edgesCPU) this._edgesCPU.set(u32, start * 2);
        if (this.edgesBuffer) this.queueWrite("edges", start * 8, u32);
        else this._edgesDirty = true;
    }

    setEdgesBuffer(buffer: GPUBuffer, edgeCount: number, opts: { ownBuffer?: boolean } = {}): void {
        assert(!!buffer, "NodeLink: edgesBuffer is required.");
        assert(Number.isInteger(edgeCount) && edgeCount >= 0, "NodeLink: edgeCount must be an integer >= 0.");
        this.clearWasmEdgesState(true);
        this.replaceEdgesBuffer(buffer, !!opts.ownBuffer);
        this._edgeCount = edgeCount | 0;
        this._edgesCPU = null;
        this._edgesExternal = true;
        this._edgesDirty = false;
        this.bindGroupKey = null;
    }

    setEdgeScalars(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert(data.length === this._edgeCount, "NodeLink: edgeScalars length must equal edgeCount.");
        this.clearWasmEdgeScalarsState(true);
        this.replaceEdgeScalarsBuffer(null, false);
        this._edgeScalarsCPU = new Float32Array(data);
        this._edgeScalarsExternal = false;
        this._edgeScalarsDirty = true;
        this._edgeScaleRevision++;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.bindGroupKey = null;
    }

    updateEdgeScalars(data: Float32Array, startEdge: number = 0): void {
        const start = startEdge | 0;
        assert(start >= 0, "NodeLink: updateEdgeScalars startEdge must be >= 0.");
        assert((start + data.length) <= this._edgeCount, "NodeLink: updateEdgeScalars range exceeds edgeCount.");
        if (this._edgeScalarsCPU) this._edgeScalarsCPU.set(data, start);
        if (this.edgeScalarsBuffer) this.queueWrite("edgeScalars", start * 4, data);
        else this._edgeScalarsDirty = true;
        this._edgeScaleRevision++;
    }

    setEdgeScalarsBuffer(buffer: GPUBuffer | null, opts: { ownBuffer?: boolean } = {}): void {
        this.clearWasmEdgeScalarsState(true);
        this.replaceEdgeScalarsBuffer(buffer, !!buffer && !!opts.ownBuffer);
        this._edgeScalarsCPU = null;
        this._edgeScalarsExternal = !!buffer;
        this._edgeScalarsDirty = false;
        this._edgeScaleRevision++;
        this.bindGroupKey = null;
    }

    setEdgeColors(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert((data.length % 4) === 0, "NodeLink: edgeColors length must be a multiple of 4.");
        assert((data.length / 4) === this._edgeCount, "NodeLink: edgeColors length must equal edgeCount*4.");
        this.clearWasmEdgeColorsState(true);
        this.replaceEdgeColorsBuffer(null, false);
        this._edgeColorsCPU = new Float32Array(data);
        this._edgeColorsExternal = false;
        this._edgeColorsDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.bindGroupKey = null;
    }

    updateEdgeColors(data: Float32Array, startEdge: number = 0): void {
        assert((data.length % 4) === 0, "NodeLink: updateEdgeColors length must be a multiple of 4.");
        const start = startEdge | 0;
        const patchCount = data.length / 4;
        assert(start >= 0, "NodeLink: updateEdgeColors startEdge must be >= 0.");
        assert((start + patchCount) <= this._edgeCount, "NodeLink: updateEdgeColors range exceeds edgeCount.");
        if (this._edgeColorsCPU) this._edgeColorsCPU.set(data, start * 4);
        if (this.edgeColorsBuffer) this.queueWrite("edgeColors", start * 16, data);
        else this._edgeColorsDirty = true;
    }

    setEdgeColorsBuffer(buffer: GPUBuffer | null, opts: { ownBuffer?: boolean } = {}): void {
        this.clearWasmEdgeColorsState(true);
        this.replaceEdgeColorsBuffer(buffer, !!buffer && !!opts.ownBuffer);
        this._edgeColorsCPU = null;
        this._edgeColorsExternal = !!buffer;
        this._edgeColorsDirty = false;
        this.bindGroupKey = null;
    }

    setWasmNodePositions(source: WasmMemoryView<Float32Array> | null, options: NodeLinkWasmNodeChannelOptions = {}): void {
        if (!this.setWasmNodeChannelSource("nodePositions", source, options.capacity)) return;
        this.refreshWasmNodePositions(options);
    }

    setWasmNodeScalars(source: WasmMemoryView<Float32Array> | null, options: NodeLinkWasmNodeChannelOptions = {}): void {
        if (!this.setWasmNodeChannelSource("nodeScalars", source, options.capacity)) return;
        this.refreshWasmNodeScalars(options);
    }

    setWasmNodeColors(source: WasmMemoryView<Float32Array> | null, options: NodeLinkWasmNodeChannelOptions = {}): void {
        if (!this.setWasmNodeChannelSource("nodeColors", source, options.capacity)) return;
        this.refreshWasmNodeColors(options);
    }

    setWasmNodeRadii(source: WasmMemoryView<Float32Array> | null, options: NodeLinkWasmNodeChannelOptions = {}): void {
        if (!this.setWasmNodeChannelSource("nodeRadii", source, options.capacity)) return;
        this.refreshWasmNodeRadii(options);
    }

    setWasmEdges(source: WasmMemoryView<Uint32Array> | null, options: NodeLinkWasmEdgeChannelOptions = {}): void {
        if (!this.setWasmEdgeChannelSource("edges", source, options.capacity)) return;
        this.refreshWasmEdges(options);
    }

    setWasmEdgeScalars(source: WasmMemoryView<Float32Array> | null, options: NodeLinkWasmEdgeChannelOptions = {}): void {
        if (!this.setWasmEdgeChannelSource("edgeScalars", source, options.capacity)) return;
        this.refreshWasmEdgeScalars(options);
    }

    setWasmEdgeColors(source: WasmMemoryView<Float32Array> | null, options: NodeLinkWasmEdgeChannelOptions = {}): void {
        if (!this.setWasmEdgeChannelSource("edgeColors", source, options.capacity)) return;
        this.refreshWasmEdgeColors(options);
    }

    refreshWasmNodePositions(options: NodeLinkWasmNodeRefreshOptions = {}): void {
        const source = this._wasmNodePositionsSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmNodePositions");
        const count = this.resolveWasmNodeCount("nodePositions", source, options.nodeCount);
        this.setNodeCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._nodePositionsCPU = this.copyWasmF32Range(source, count * NODELINK_VEC4_FLOATS);
        else this._nodePositionsCPU = null;
        this.updateWasmNodeBounds(options, source, count);
        this._wasmNodePositionsDirty = true;
        this._nodePositionsDirty = true;
    }

    refreshWasmNodeScalars(options: NodeLinkWasmNodeRefreshOptions = {}): void {
        const source = this._wasmNodeScalarsSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmNodeScalars");
        const count = this.resolveWasmNodeCount("nodeScalars", source, options.nodeCount);
        this.setNodeCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._nodeScalarsCPU = this.copyWasmF32Range(source, count);
        else this._nodeScalarsCPU = null;
        this._wasmNodeScalarsDirty = true;
        this._nodeScalarsDirty = true;
        this._nodeScaleRevision++;
    }

    refreshWasmNodeColors(options: NodeLinkWasmNodeRefreshOptions = {}): void {
        const source = this._wasmNodeColorsSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmNodeColors");
        const count = this.resolveWasmNodeCount("nodeColors", source, options.nodeCount);
        this.setNodeCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._nodeColorsCPU = this.copyWasmF32Range(source, count * NODELINK_VEC4_FLOATS);
        else this._nodeColorsCPU = null;
        this._wasmNodeColorsDirty = true;
        this._nodeColorsDirty = true;
    }

    refreshWasmNodeRadii(options: NodeLinkWasmNodeRefreshOptions = {}): void {
        const source = this._wasmNodeRadiiSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmNodeRadii");
        const count = this.resolveWasmNodeCount("nodeRadii", source, options.nodeCount);
        this.setNodeCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._nodeRadiiCPU = this.copyWasmF32Range(source, count * NODELINK_VEC4_FLOATS);
        else this._nodeRadiiCPU = null;
        this._wasmNodeRadiiDirty = true;
        this._nodeRadiiDirty = true;
    }

    refreshWasmEdges(options: NodeLinkWasmEdgeRefreshOptions = {}): void {
        const source = this._wasmEdgesSource;
        if (!source) return;
        source.refresh();
        assertWasmU32View(source, "NodeLink: wasmEdges");
        const count = this.resolveWasmEdgeCount("edges", source, options.edgeCount);
        this.setEdgeCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._edgesCPU = this.copyWasmU32Range(source, count * NODELINK_U32_EDGE_COMPONENTS);
        else this._edgesCPU = null;
        this._wasmEdgesDirty = true;
        this._edgesDirty = true;
    }

    refreshWasmEdgeScalars(options: NodeLinkWasmEdgeRefreshOptions = {}): void {
        const source = this._wasmEdgeScalarsSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmEdgeScalars");
        const count = this.resolveWasmEdgeCount("edgeScalars", source, options.edgeCount);
        this.setEdgeCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._edgeScalarsCPU = this.copyWasmF32Range(source, count);
        else this._edgeScalarsCPU = null;
        this._wasmEdgeScalarsDirty = true;
        this._edgeScalarsDirty = true;
        this._edgeScaleRevision++;
    }

    refreshWasmEdgeColors(options: NodeLinkWasmEdgeRefreshOptions = {}): void {
        const source = this._wasmEdgeColorsSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmEdgeColors");
        const count = this.resolveWasmEdgeCount("edgeColors", source, options.edgeCount);
        this.setEdgeCountFromWasm(count);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        if (this._keepCPUData) this._edgeColorsCPU = this.copyWasmF32Range(source, count * NODELINK_VEC4_FLOATS);
        else this._edgeColorsCPU = null;
        this._wasmEdgeColorsDirty = true;
        this._edgeColorsDirty = true;
    }

    refreshFromWasm(options: NodeLinkWasmRefreshOptions = {}): void {
        if (this._wasmNodePositionsSource) this.refreshWasmNodePositions(options);
        if (this._wasmNodeScalarsSource) this.refreshWasmNodeScalars(options);
        if (this._wasmNodeColorsSource) this.refreshWasmNodeColors(options);
        if (this._wasmNodeRadiiSource) this.refreshWasmNodeRadii(options);
        if (this._wasmEdgesSource) this.refreshWasmEdges(options);
        if (this._wasmEdgeScalarsSource) this.refreshWasmEdgeScalars(options);
        if (this._wasmEdgeColorsSource) this.refreshWasmEdgeColors(options);
    }

    clearWasmSources(): void {
        this.clearAllWasmState(true);
    }

    dropCPUData(): void {
        this._nodePositionsCPU = null;
        this._nodeScalarsCPU = null;
        this._nodeColorsCPU = null;
        this._nodeRadiiCPU = null;
        this._edgesCPU = null;
        this._edgeScalarsCPU = null;
        this._edgeColorsCPU = null;
    }

    decodePickElement(elementIndex: number): { component: NodeLinkComponentKind; componentIndex: number } | null {
        if (!Number.isInteger(elementIndex) || elementIndex < 0) return null;
        if (elementIndex < this._nodeCount) return { component: "node", componentIndex: elementIndex | 0 };
        const ei = (elementIndex | 0) - this._nodeCount;
        if (ei >= 0 && ei < this._edgeCount) return { component: "edge", componentIndex: ei };
        return null;
    }

    mapLinearNodeIndexToNd(index: number): number[] | null {
        return linearIndexToNdIndex(this._ndShape, index);
    }

    getNodeRecord(index: number): { position: [number, number, number]; scalar: number | null; color: [number, number, number, number] | null } | null {
        const p = this._nodePositionsCPU;
        if (!p || index < 0 || index >= this._nodeCount) return null;
        const o = index * 4;
        const scalar = this._nodeScalarsCPU ? this._nodeScalarsCPU[index] : null;
        const color = this._nodeColorsCPU ? [this._nodeColorsCPU[o + 0], this._nodeColorsCPU[o + 1], this._nodeColorsCPU[o + 2], this._nodeColorsCPU[o + 3]] as [number, number, number, number] : null;
        return { position: [p[o + 0], p[o + 1], p[o + 2]], scalar, color };
    }

    getEdgeRecord(index: number): { src: number; dst: number; scalar: number | null; color: [number, number, number, number] | null; srcPosition: [number, number, number] | null; dstPosition: [number, number, number] | null } | null {
        const edges = this._edgesCPU;
        if (!edges || index < 0 || index >= this._edgeCount) return null;
        const ei = index * 2;
        const src = edges[ei + 0] | 0;
        const dst = edges[ei + 1] | 0;
        const scalar = this._edgeScalarsCPU ? this._edgeScalarsCPU[index] : null;
        const color = this._edgeColorsCPU ? [this._edgeColorsCPU[index * 4 + 0], this._edgeColorsCPU[index * 4 + 1], this._edgeColorsCPU[index * 4 + 2], this._edgeColorsCPU[index * 4 + 3]] as [number, number, number, number] : null;
        let srcPosition: [number, number, number] | null = null;
        let dstPosition: [number, number, number] | null = null;
        if (this._nodePositionsCPU && src < this._nodeCount && dst < this._nodeCount) {
            const so = src * 4;
            const doff = dst * 4;
            srcPosition = [this._nodePositionsCPU[so + 0], this._nodePositionsCPU[so + 1], this._nodePositionsCPU[so + 2]];
            dstPosition = [this._nodePositionsCPU[doff + 0], this._nodePositionsCPU[doff + 1], this._nodePositionsCPU[doff + 2]];
        }
        return { src, dst, scalar, color, srcPosition, dstPosition };
    }

    computeBoundsFromCPUData(): void {
        if (!this._nodePositionsCPU || this._nodeCount <= 0) return;
        const p = this._nodePositionsCPU;
        let minX = p[0], minY = p[1], minZ = p[2];
        let maxX = p[0], maxY = p[1], maxZ = p[2];
        for (let i = 1; i < this._nodeCount; i++) {
            const o = i * 4;
            const x = p[o + 0], y = p[o + 1], z = p[o + 2];
            if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
        }
        const cx = (minX + maxX) * 0.5;
        const cy = (minY + maxY) * 0.5;
        const cz = (minZ + maxZ) * 0.5;
        let radius = 0;
        for (let i = 0; i < this._nodeCount; i++) {
            const o = i * 4;
            const dx = p[o + 0] - cx, dy = p[o + 1] - cy, dz = p[o + 2] - cz;
            const d = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
            if (d > radius) radius = d;
        }
        this.setBounds(boundsFromBox([minX, minY, minZ], [maxX, maxY, maxZ]), "computed");
        this.boundsCenter = [cx, cy, cz];
        this.boundsRadius = radius;
    }

    getLocalBounds(): Bounds3 {
        if (this._boundsSource === "none" && this._nodePositionsCPU) this.computeBoundsFromCPUData();
        if (this._boundsSource === "none") return emptyBounds(this._nodeCount > 0);
        return boundsFromSphere(this.boundsCenter, this.boundsRadius);
    }

    getWorldBounds(): Bounds3 {
        return transformBounds(this.getLocalBounds(), this.transform.worldMatrix);
    }
    
    getBounds(): Bounds3 {
        return this.getWorldBounds();
    }

    private uploadWasmNodePositions(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmNodePositionsSource;
        if (!source || !this._wasmNodePositionsDirty) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmNodePositions");
        const count = this._nodeCount;
        validateWasmRecordRange(source, count, NODELINK_VEC4_FLOATS, "NodeLink: wasmNodePositions", "nodeCount");
        if (count <= 0) { this._wasmNodePositionsDirty = false; this._nodePositionsDirty = false; this.clearPendingWrites("nodePositions"); return; }
        const data = source.array();
        const byteLength = count * NODELINK_VEC4_BYTES;
        this.ensureWasmNodePositionsBuffer(device, count);
        const write = (): void => {
            assert(!!this.nodePositionsBuffer, "NodeLink: wasmNodePositions upload requires a nodePositionsBuffer.");
            queue.writeBuffer(this.nodePositionsBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceNodePositionsBuffer(null, false);
            this._nodePositionsWasmManaged = false;
            this._wasmNodePositionsCapacity = 0;
            this.ensureWasmNodePositionsBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._nodePositionsCPU = new Float32Array(data.subarray(0, count * NODELINK_VEC4_FLOATS));
        else this._nodePositionsCPU = null;
        this._wasmNodePositionsDirty = false;
        this._nodePositionsDirty = false;
        this.clearPendingWrites("nodePositions");
    }

    private uploadWasmNodeScalars(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmNodeScalarsSource;
        if (!source || !this._wasmNodeScalarsDirty) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmNodeScalars");
        const count = this._nodeCount;
        validateWasmRecordRange(source, count, 1, "NodeLink: wasmNodeScalars", "nodeCount");
        if (count <= 0) { this._wasmNodeScalarsDirty = false; this._nodeScalarsDirty = false; this.clearPendingWrites("nodeScalars"); return; }
        const data = source.array();
        const byteLength = count * NODELINK_F32_BYTES;
        this.ensureWasmNodeScalarsBuffer(device, count);
        const write = (): void => {
            assert(!!this.nodeScalarsBuffer, "NodeLink: wasmNodeScalars upload requires a nodeScalarsBuffer.");
            queue.writeBuffer(this.nodeScalarsBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceNodeScalarsBuffer(null, false);
            this._nodeScalarsWasmManaged = false;
            this._wasmNodeScalarsCapacity = 0;
            this.ensureWasmNodeScalarsBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._nodeScalarsCPU = new Float32Array(data.subarray(0, count));
        else this._nodeScalarsCPU = null;
        this._wasmNodeScalarsDirty = false;
        this._nodeScalarsDirty = false;
        this.clearPendingWrites("nodeScalars");
    }

    private uploadWasmNodeColors(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmNodeColorsSource;
        if (!source || !this._wasmNodeColorsDirty) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmNodeColors");
        const count = this._nodeCount;
        validateWasmRecordRange(source, count, NODELINK_VEC4_FLOATS, "NodeLink: wasmNodeColors", "nodeCount");
        if (count <= 0) { this._wasmNodeColorsDirty = false; this._nodeColorsDirty = false; this.clearPendingWrites("nodeColors"); return; }
        const data = source.array();
        const byteLength = count * NODELINK_VEC4_BYTES;
        this.ensureWasmNodeColorsBuffer(device, count);
        const write = (): void => {
            assert(!!this.nodeColorsBuffer, "NodeLink: wasmNodeColors upload requires a nodeColorsBuffer.");
            queue.writeBuffer(this.nodeColorsBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceNodeColorsBuffer(null, false);
            this._nodeColorsWasmManaged = false;
            this._wasmNodeColorsCapacity = 0;
            this.ensureWasmNodeColorsBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._nodeColorsCPU = new Float32Array(data.subarray(0, count * NODELINK_VEC4_FLOATS));
        else this._nodeColorsCPU = null;
        this._wasmNodeColorsDirty = false;
        this._nodeColorsDirty = false;
        this.clearPendingWrites("nodeColors");
    }

    private uploadWasmNodeRadii(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmNodeRadiiSource;
        if (!source || !this._wasmNodeRadiiDirty) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmNodeRadii");
        const count = this._nodeCount;
        validateWasmRecordRange(source, count, NODELINK_VEC4_FLOATS, "NodeLink: wasmNodeRadii", "nodeCount");
        if (count <= 0) { this._wasmNodeRadiiDirty = false; this._nodeRadiiDirty = false; this.clearPendingWrites("nodeRadii"); return; }
        const data = source.array();
        const byteLength = count * NODELINK_VEC4_BYTES;
        this.ensureWasmNodeRadiiBuffer(device, count);
        const write = (): void => {
            assert(!!this.nodeRadiiBuffer, "NodeLink: wasmNodeRadii upload requires a nodeRadiiBuffer.");
            queue.writeBuffer(this.nodeRadiiBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceNodeRadiiBuffer(null, false);
            this._nodeRadiiWasmManaged = false;
            this._wasmNodeRadiiCapacity = 0;
            this.ensureWasmNodeRadiiBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._nodeRadiiCPU = new Float32Array(data.subarray(0, count * NODELINK_VEC4_FLOATS));
        else this._nodeRadiiCPU = null;
        this._wasmNodeRadiiDirty = false;
        this._nodeRadiiDirty = false;
        this.clearPendingWrites("nodeRadii");
    }

    private uploadWasmEdges(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmEdgesSource;
        if (!source || !this._wasmEdgesDirty) return;
        source.refresh();
        assertWasmU32View(source, "NodeLink: wasmEdges");
        const count = this._edgeCount;
        validateWasmRecordRange(source, count, NODELINK_U32_EDGE_COMPONENTS, "NodeLink: wasmEdges", "edgeCount");
        if (count <= 0) { this._wasmEdgesDirty = false; this._edgesDirty = false; this.clearPendingWrites("edges"); return; }
        const data = source.array();
        const byteLength = count * NODELINK_EDGE_BYTES;
        this.ensureWasmEdgesBuffer(device, count);
        const write = (): void => {
            assert(!!this.edgesBuffer, "NodeLink: wasmEdges upload requires an edgesBuffer.");
            queue.writeBuffer(this.edgesBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceEdgesBuffer(null, false);
            this._edgesWasmManaged = false;
            this._wasmEdgesCapacity = 0;
            this.ensureWasmEdgesBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._edgesCPU = new Uint32Array(data.subarray(0, count * NODELINK_U32_EDGE_COMPONENTS));
        else this._edgesCPU = null;
        this._wasmEdgesDirty = false;
        this._edgesDirty = false;
        this.clearPendingWrites("edges");
    }

    private uploadWasmEdgeScalars(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmEdgeScalarsSource;
        if (!source || !this._wasmEdgeScalarsDirty) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmEdgeScalars");
        const count = this._edgeCount;
        validateWasmRecordRange(source, count, 1, "NodeLink: wasmEdgeScalars", "edgeCount");
        if (count <= 0) { this._wasmEdgeScalarsDirty = false; this._edgeScalarsDirty = false; this.clearPendingWrites("edgeScalars"); return; }
        const data = source.array();
        const byteLength = count * NODELINK_F32_BYTES;
        this.ensureWasmEdgeScalarsBuffer(device, count);
        const write = (): void => {
            assert(!!this.edgeScalarsBuffer, "NodeLink: wasmEdgeScalars upload requires an edgeScalarsBuffer.");
            queue.writeBuffer(this.edgeScalarsBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceEdgeScalarsBuffer(null, false);
            this._edgeScalarsWasmManaged = false;
            this._wasmEdgeScalarsCapacity = 0;
            this.ensureWasmEdgeScalarsBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._edgeScalarsCPU = new Float32Array(data.subarray(0, count));
        else this._edgeScalarsCPU = null;
        this._wasmEdgeScalarsDirty = false;
        this._edgeScalarsDirty = false;
        this.clearPendingWrites("edgeScalars");
    }

    private uploadWasmEdgeColors(device: GPUDevice, queue: GPUQueue): void {
        const source = this._wasmEdgeColorsSource;
        if (!source || !this._wasmEdgeColorsDirty) return;
        source.refresh();
        assertWasmF32View(source, "NodeLink: wasmEdgeColors");
        const count = this._edgeCount;
        validateWasmRecordRange(source, count, NODELINK_VEC4_FLOATS, "NodeLink: wasmEdgeColors", "edgeCount");
        if (count <= 0) { this._wasmEdgeColorsDirty = false; this._edgeColorsDirty = false; this.clearPendingWrites("edgeColors"); return; }
        const data = source.array();
        const byteLength = count * NODELINK_VEC4_BYTES;
        this.ensureWasmEdgeColorsBuffer(device, count);
        const write = (): void => {
            assert(!!this.edgeColorsBuffer, "NodeLink: wasmEdgeColors upload requires an edgeColorsBuffer.");
            queue.writeBuffer(this.edgeColorsBuffer, 0, data.buffer, data.byteOffset, byteLength);
        };
        try { write(); }
        catch {
            this.replaceEdgeColorsBuffer(null, false);
            this._edgeColorsWasmManaged = false;
            this._wasmEdgeColorsCapacity = 0;
            this.ensureWasmEdgeColorsBuffer(device, count);
            write();
        }
        if (this._keepCPUData) this._edgeColorsCPU = new Float32Array(data.subarray(0, count * NODELINK_VEC4_FLOATS));
        else this._edgeColorsCPU = null;
        this._wasmEdgeColorsDirty = false;
        this._edgeColorsDirty = false;
        this.clearPendingWrites("edgeColors");
    }

    private uploadWasmSources(device: GPUDevice, queue: GPUQueue): void {
        this.uploadWasmNodePositions(device, queue);
        this.uploadWasmNodeScalars(device, queue);
        this.uploadWasmNodeColors(device, queue);
        this.uploadWasmNodeRadii(device, queue);
        this.uploadWasmEdges(device, queue);
        this.uploadWasmEdgeScalars(device, queue);
        this.uploadWasmEdgeColors(device, queue);
    }

    upload(device: GPUDevice, queue: GPUQueue): void {
        if (this.hasDirtyWasmSources()) this.uploadWasmSources(device, queue);
        const hadQueuedWrites = this._pendingWrites.length > 0;
        let nonWasmUploaded = false;
        const uploadF32 = (buf: GPUBuffer | null, owned: boolean, cpu: Float32Array | null, dirty: boolean): { buffer: GPUBuffer | null; owned: boolean; } => {
            if (!dirty || !cpu) return { buffer: buf, owned };
            nonWasmUploaded = true;
            if (!buf || !owned) return { buffer: createBuffer(device, cpu, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST), owned: true };
            try {
                queue.writeBuffer(buf, 0, cpu.buffer, cpu.byteOffset, cpu.byteLength);
                return { buffer: buf, owned: true };
            } catch { return { buffer: createBuffer(device, cpu, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST), owned: true }; }
        };
        const uploadU32 = (buf: GPUBuffer | null, owned: boolean, cpu: Uint32Array | null, dirty: boolean): { buffer: GPUBuffer | null; owned: boolean; } => {
            if (!dirty || !cpu) return { buffer: buf, owned };
            nonWasmUploaded = true;
            if (!buf || !owned) return { buffer: createBuffer(device, cpu, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST), owned: true };
            try {
                queue.writeBuffer(buf, 0, cpu.buffer, cpu.byteOffset, cpu.byteLength);
                return { buffer: buf, owned: true };
            } catch { return { buffer: createBuffer(device, cpu, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST), owned: true }; }
        };
        if (!this._wasmNodePositionsSource && !this._nodePositionsExternal) { const result = uploadF32(this.nodePositionsBuffer, this._nodePositionsOwned, this._nodePositionsCPU, this._nodePositionsDirty); this.replaceNodePositionsBuffer(result.buffer, result.owned); }
        if (!this._wasmNodeScalarsSource && !this._nodeScalarsExternal) { const result = uploadF32(this.nodeScalarsBuffer, this._nodeScalarsOwned, this._nodeScalarsCPU, this._nodeScalarsDirty); this.replaceNodeScalarsBuffer(result.buffer, result.owned); }
        if (!this._wasmNodeColorsSource && !this._nodeColorsExternal) { const result = uploadF32(this.nodeColorsBuffer, this._nodeColorsOwned, this._nodeColorsCPU, this._nodeColorsDirty); this.replaceNodeColorsBuffer(result.buffer, result.owned); }
        if (!this._wasmNodeRadiiSource && !this._nodeRadiiExternal) { const result = uploadF32(this.nodeRadiiBuffer, this._nodeRadiiOwned, this._nodeRadiiCPU, this._nodeRadiiDirty); this.replaceNodeRadiiBuffer(result.buffer, result.owned); }
        if (!this._wasmEdgesSource && !this._edgesExternal) { const result = uploadU32(this.edgesBuffer, this._edgesOwned, this._edgesCPU, this._edgesDirty); this.replaceEdgesBuffer(result.buffer, result.owned); }
        if (!this._wasmEdgeScalarsSource && !this._edgeScalarsExternal) { const result = uploadF32(this.edgeScalarsBuffer, this._edgeScalarsOwned, this._edgeScalarsCPU, this._edgeScalarsDirty); this.replaceEdgeScalarsBuffer(result.buffer, result.owned); }
        if (!this._wasmEdgeColorsSource && !this._edgeColorsExternal) { const result = uploadF32(this.edgeColorsBuffer, this._edgeColorsOwned, this._edgeColorsCPU, this._edgeColorsDirty); this.replaceEdgeColorsBuffer(result.buffer, result.owned); }
        this.flushQueuedWrites(queue);
        if (!this._keepCPUData) this.dropCPUData();
        this._nodePositionsDirty = false;
        this._nodeScalarsDirty = false;
        this._nodeColorsDirty = false;
        this._nodeRadiiDirty = false;
        this._edgesDirty = false;
        this._edgeScalarsDirty = false;
        this._edgeColorsDirty = false;
        if (nonWasmUploaded || hadQueuedWrites) this.bindGroupKey = null;
    }

    getUniformBufferSize(): number {
        return UNIFORM_BYTE_SIZE;
    }

    getUniformData(): Float32Array {
        const out = new Float32Array(UNIFORM_FLOAT_COUNT);
        out.fill(0);
        out[0] = Math.max(0, this._nodeSize);
        out[1] = Math.max(0, this._edgeSize);
        out[2] = clamp01(this._opacity);
        out[3] = this._lit ? 1 : 0;
        packScaleTransform(this._nodeScaleTransform, out, 4);
        out[24] = colorModeId(this._nodeColorMode);
        out[25] = (typeof this._nodeColormap === "string" && this._nodeColormap === "custom") ? Math.min(8, Math.max(2, this._nodeColormapStops.length)) : 0;
        out[26] = nodeGeometryModeId(this._nodeGeometryMode);
        out[27] = this.nodeRadiiBuffer ? 1 : 0;
        packScaleTransform(this._edgeScaleTransform, out, 28);
        out[48] = colorModeId(this._edgeColorMode);
        out[49] = (typeof this._edgeColormap === "string" && this._edgeColormap === "custom") ? Math.min(8, Math.max(2, this._edgeColormapStops.length)) : 0;
        out[50] = edgeGeometryModeId(this._edgeGeometryMode);
        out[52] = this._nodeSolidColor[0]; out[53] = this._nodeSolidColor[1]; out[54] = this._nodeSolidColor[2]; out[55] = this._nodeSolidColor[3];
        out[56] = this._edgeSolidColor[0]; out[57] = this._edgeSolidColor[1]; out[58] = this._edgeSolidColor[2]; out[59] = this._edgeSolidColor[3];
        out[60] = this._minPointSize;
        out[61] = this._maxPointSize;
        out[62] = this._pointSizeAttenuation;
        const nodeStops = this._nodeColormapStops;
        for (let i = 0; i < 8; i++) {
            const s = nodeStops[Math.min(i, Math.max(1, nodeStops.length - 1))];
            const o = 64 + i * 4;
            out[o + 0] = s[0]; out[o + 1] = s[1]; out[o + 2] = s[2]; out[o + 3] = s[3];
        }
        const edgeStops = this._edgeColormapStops;
        for (let i = 0; i < 8; i++) {
            const s = edgeStops[Math.min(i, Math.max(1, edgeStops.length - 1))];
            const o = 96 + i * 4;
            out[o + 0] = s[0]; out[o + 1] = s[1]; out[o + 2] = s[2]; out[o + 3] = s[3];
        }
        return out;
    }

    get dirtyUniforms(): boolean {
        return this._uniformDirty;
    }

    markUniformsClean(): void {
        this._uniformDirty = false;
    }

    getNodeColormapKey(): string {
        const c = this._nodeColormap;
        return c instanceof Colormap ? `cm:${c.id}` : `cm:${c}`;
    }

    getEdgeColormapKey(): string {
        const c = this._edgeColormap;
        return c instanceof Colormap ? `cm:${c.id}` : `cm:${c}`;
    }

    getNodeColormapForBinding(): Colormap {
        const c = this._nodeColormap;
        if (c instanceof Colormap) return c;
        return c === "custom" ? Colormap.builtin("grayscale") : Colormap.builtin(c);
    }

    getEdgeColormapForBinding(): Colormap {
        const c = this._edgeColormap;
        if (c instanceof Colormap) return c;
        return c === "custom" ? Colormap.builtin("grayscale") : Colormap.builtin(c);
    }

    private destroyOwnedBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (!buffer || !owned) return;
        buffer.destroy();
    }

    destroy(): void {
        this.destroyOwnedBuffer(this.nodePositionsBuffer, this._nodePositionsOwned);
        this.destroyOwnedBuffer(this.nodeScalarsBuffer, this._nodeScalarsOwned);
        this.destroyOwnedBuffer(this.nodeColorsBuffer, this._nodeColorsOwned);
        this.destroyOwnedBuffer(this.nodeRadiiBuffer, this._nodeRadiiOwned);
        this.destroyOwnedBuffer(this.edgesBuffer, this._edgesOwned);
        this.destroyOwnedBuffer(this.edgeScalarsBuffer, this._edgeScalarsOwned);
        this.destroyOwnedBuffer(this.edgeColorsBuffer, this._edgeColorsOwned);
        this.uniformBuffer?.destroy();
        this.nodePositionsBuffer = null;
        this.nodeScalarsBuffer = null;
        this.nodeColorsBuffer = null;
        this.nodeRadiiBuffer = null;
        this.edgesBuffer = null;
        this.edgeScalarsBuffer = null;
        this.edgeColorsBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this.dropCPUData();
        this._pendingWrites.length = 0;
        this._visualChangeListeners.clear();
        this._ndShape = null;
        this._nodeCount = 0;
        this._edgeCount = 0;
        this._nodePositionsExternal = false;
        this._nodeScalarsExternal = false;
        this._nodeColorsExternal = false;
        this._nodeRadiiExternal = false;
        this._edgesExternal = false;
        this._edgeScalarsExternal = false;
        this._edgeColorsExternal = false;
        this._nodePositionsOwned = false;
        this._nodeScalarsOwned = false;
        this._nodeColorsOwned = false;
        this._nodeRadiiOwned = false;
        this._edgesOwned = false;
        this._edgeScalarsOwned = false;
        this._edgeColorsOwned = false;
        this._wasmNodePositionsSource = null;
        this._wasmNodeScalarsSource = null;
        this._wasmNodeColorsSource = null;
        this._wasmNodeRadiiSource = null;
        this._wasmEdgesSource = null;
        this._wasmEdgeScalarsSource = null;
        this._wasmEdgeColorsSource = null;
        this._wasmNodePositionsDirty = false;
        this._wasmNodeScalarsDirty = false;
        this._wasmNodeColorsDirty = false;
        this._wasmNodeRadiiDirty = false;
        this._wasmEdgesDirty = false;
        this._wasmEdgeScalarsDirty = false;
        this._wasmEdgeColorsDirty = false;
        this._nodePositionsWasmManaged = false;
        this._nodeScalarsWasmManaged = false;
        this._nodeColorsWasmManaged = false;
        this._nodeRadiiWasmManaged = false;
        this._edgesWasmManaged = false;
        this._edgeScalarsWasmManaged = false;
        this._edgeColorsWasmManaged = false;
        this._wasmNodePositionsCapacity = 0;
        this._wasmNodeScalarsCapacity = 0;
        this._wasmNodeColorsCapacity = 0;
        this._wasmNodeRadiiCapacity = 0;
        this._wasmEdgesCapacity = 0;
        this._wasmEdgeScalarsCapacity = 0;
        this._wasmEdgeColorsCapacity = 0;
        this._wasmNodePositionsCapacityHint = 0;
        this._wasmNodeScalarsCapacityHint = 0;
        this._wasmNodeColorsCapacityHint = 0;
        this._wasmNodeRadiiCapacityHint = 0;
        this._wasmEdgesCapacityHint = 0;
        this._wasmEdgeScalarsCapacityHint = 0;
        this._wasmEdgeColorsCapacityHint = 0;
        this._ownExternalBuffers = false;
        this.transform.dispose();
    }

    private emitVisualChange(kind: NodeLinkVisualChangeKind): void {
        for (const listener of this._visualChangeListeners) {
            try { listener(kind); } catch { /* ignore */ }
        }
    }
}

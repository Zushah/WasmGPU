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
import { Bounds3, boundsFromBox, boundsFromSphere, emptyBounds, transformBounds } from "./bounds";

export type NodeLinkNodeGeometryMode = "points" | "spheres" | "ellipsoids" | "cubes";
export type NodeLinkEdgeGeometryMode = "lines" | "cylinders";
export type NodeLinkColorMode = "rgba" | "scalar" | "solid";
export type NodeLinkColormap = BuiltinColormapName | "custom";
export type NodeLinkComponentKind = "node" | "edge";
export type NodeLinkVisualChangeKind = "scale" | "colormap" | "visual";

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
    edgeCount?: number;
    edges?: Uint16Array | Uint32Array;
    edgeScalars?: Float32Array;
    edgeColors?: Float32Array;
    edgesBuffer?: GPUBuffer | { buffer: GPUBuffer };
    edgeScalarsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    edgeColorsBuffer?: GPUBuffer | { buffer: GPUBuffer };
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

const UNIFORM_FLOAT_COUNT = 128;
const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;

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
        if (desc.nodePositions) this.setNodePositions(desc.nodePositions, { stride: desc.nodePositionsStride ?? 3, keepCPUData: this._keepCPUData });
        else if (desc.nodePositionsBuffer) this.setNodePositionsBuffer(resolveGPUBuffer(desc.nodePositionsBuffer), desc.nodeCount ?? 0, { ownBuffer: this._ownExternalBuffers });
        else if (desc.nodeCount !== undefined) this._nodeCount = Math.max(0, desc.nodeCount | 0);
        if (desc.edges) this.setEdges(desc.edges, { keepCPUData: this._keepCPUData });
        else if (desc.edgesBuffer) this.setEdgesBuffer(resolveGPUBuffer(desc.edgesBuffer), desc.edgeCount ?? 0, { ownBuffer: this._ownExternalBuffers });
        else if (desc.edgeCount !== undefined) this._edgeCount = Math.max(0, desc.edgeCount | 0);
        if (desc.nodeScalars) this.setNodeScalars(desc.nodeScalars, { keepCPUData: this._keepCPUData });
        else if (desc.nodeScalarsBuffer) this.setNodeScalarsBuffer(resolveGPUBuffer(desc.nodeScalarsBuffer), { ownBuffer: this._ownExternalBuffers });
        if (desc.nodeColors) this.setNodeColors(desc.nodeColors, { keepCPUData: this._keepCPUData });
        else if (desc.nodeColorsBuffer) this.setNodeColorsBuffer(resolveGPUBuffer(desc.nodeColorsBuffer), { ownBuffer: this._ownExternalBuffers });
        if (desc.nodeRadii) this.setNodeRadii(desc.nodeRadii, { stride: desc.nodeRadiiStride ?? 3, keepCPUData: this._keepCPUData });
        else if (desc.nodeRadiiBuffer) this.setNodeRadiiBuffer(resolveGPUBuffer(desc.nodeRadiiBuffer), { ownBuffer: this._ownExternalBuffers });
        if (desc.edgeScalars) this.setEdgeScalars(desc.edgeScalars, { keepCPUData: this._keepCPUData });
        else if (desc.edgeScalarsBuffer) this.setEdgeScalarsBuffer(resolveGPUBuffer(desc.edgeScalarsBuffer), { ownBuffer: this._ownExternalBuffers });
        if (desc.edgeColors) this.setEdgeColors(desc.edgeColors, { keepCPUData: this._keepCPUData });
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
        this.replaceNodePositionsBuffer(buffer, !!opts.ownBuffer);
        this._nodeCount = nodeCount | 0;
        this._nodePositionsCPU = null;
        this._nodePositionsExternal = true;
        this._nodePositionsDirty = false;
        this.bindGroupKey = null;
    }

    setNodeScalars(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert(data.length === this._nodeCount, "NodeLink: nodeScalars length must equal nodeCount.");
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
        this.replaceEdgesBuffer(buffer, !!opts.ownBuffer);
        this._edgeCount = edgeCount | 0;
        this._edgesCPU = null;
        this._edgesExternal = true;
        this._edgesDirty = false;
        this.bindGroupKey = null;
    }

    setEdgeScalars(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert(data.length === this._edgeCount, "NodeLink: edgeScalars length must equal edgeCount.");
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
        this.replaceEdgeColorsBuffer(buffer, !!buffer && !!opts.ownBuffer);
        this._edgeColorsCPU = null;
        this._edgeColorsExternal = !!buffer;
        this._edgeColorsDirty = false;
        this.bindGroupKey = null;
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

    upload(device: GPUDevice, queue: GPUQueue): void {
        const uploadF32 = (buf: GPUBuffer | null, owned: boolean, cpu: Float32Array | null, dirty: boolean): { buffer: GPUBuffer | null; owned: boolean; } => {
            if (!dirty || !cpu) return { buffer: buf, owned };
            if (!buf || !owned) return { buffer: createBuffer(device, cpu, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST), owned: true };
            try {
                queue.writeBuffer(buf, 0, cpu.buffer, cpu.byteOffset, cpu.byteLength);
                return { buffer: buf, owned: true };
            } catch { return { buffer: createBuffer(device, cpu, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST), owned: true }; }
        };
        const uploadU32 = (buf: GPUBuffer | null, owned: boolean, cpu: Uint32Array | null, dirty: boolean): { buffer: GPUBuffer | null; owned: boolean; } => {
            if (!dirty || !cpu) return { buffer: buf, owned };
            if (!buf || !owned) return { buffer: createBuffer(device, cpu, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST), owned: true };
            try {
                queue.writeBuffer(buf, 0, cpu.buffer, cpu.byteOffset, cpu.byteLength);
                return { buffer: buf, owned: true };
            } catch { return { buffer: createBuffer(device, cpu, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST), owned: true }; }
        };
        if (!this._nodePositionsExternal) { const result = uploadF32(this.nodePositionsBuffer, this._nodePositionsOwned, this._nodePositionsCPU, this._nodePositionsDirty); this.replaceNodePositionsBuffer(result.buffer, result.owned); }
        if (!this._nodeScalarsExternal) { const result = uploadF32(this.nodeScalarsBuffer, this._nodeScalarsOwned, this._nodeScalarsCPU, this._nodeScalarsDirty); this.replaceNodeScalarsBuffer(result.buffer, result.owned); }
        if (!this._nodeColorsExternal) { const result = uploadF32(this.nodeColorsBuffer, this._nodeColorsOwned, this._nodeColorsCPU, this._nodeColorsDirty); this.replaceNodeColorsBuffer(result.buffer, result.owned); }
        if (!this._nodeRadiiExternal) { const result = uploadF32(this.nodeRadiiBuffer, this._nodeRadiiOwned, this._nodeRadiiCPU, this._nodeRadiiDirty); this.replaceNodeRadiiBuffer(result.buffer, result.owned); }
        if (!this._edgesExternal) { const result = uploadU32(this.edgesBuffer, this._edgesOwned, this._edgesCPU, this._edgesDirty); this.replaceEdgesBuffer(result.buffer, result.owned); }
        if (!this._edgeScalarsExternal) { const result = uploadF32(this.edgeScalarsBuffer, this._edgeScalarsOwned, this._edgeScalarsCPU, this._edgeScalarsDirty); this.replaceEdgeScalarsBuffer(result.buffer, result.owned); }
        if (!this._edgeColorsExternal) { const result = uploadF32(this.edgeColorsBuffer, this._edgeColorsOwned, this._edgeColorsCPU, this._edgeColorsDirty); this.replaceEdgeColorsBuffer(result.buffer, result.owned); }
        this.flushQueuedWrites(queue);
        if (!this._keepCPUData) this.dropCPUData();
        this._nodePositionsDirty = false;
        this._nodeScalarsDirty = false;
        this._nodeColorsDirty = false;
        this._nodeRadiiDirty = false;
        this._edgesDirty = false;
        this._edgeScalarsDirty = false;
        this._edgeColorsDirty = false;
        this.bindGroupKey = null;
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
        this._ownExternalBuffers = false;
        this.transform.dispose();
    }

    private emitVisualChange(kind: NodeLinkVisualChangeKind): void {
        for (const listener of this._visualChangeListeners) {
            try { listener(kind); } catch { /* ignore */ }
        }
    }
}

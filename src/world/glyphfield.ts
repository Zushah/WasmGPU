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
import { Geometry } from "../graphics/geometry";
import { boundsf, driver, wasm, type WasmPtr } from "../wasm";
import { Bounds3, boundsFromBox, boundsFromSphere, emptyBounds, transformBounds } from "./bounds";

export type GlyphColormap = BuiltinColormapName | "custom";

export type GlyphFieldVisualChangeKind = "scale" | "colormap" | "visual";

export type GlyphColorMode = "rgba" | "scalar" | "solid";

export type GlyphShape = "ellipsoid" | "arrow" | "custom";

export type GlyphFieldDescriptor = {
    shape?: GlyphShape;
    geometry?: Geometry;
    instanceCount?: number;
    positions?: Float32Array;
    rotations?: Float32Array;
    scales?: Float32Array;
    attributes?: Float32Array;
    positionsPtr?: WasmPtr;
    rotationsPtr?: WasmPtr;
    scalesPtr?: WasmPtr;
    attributesPtr?: WasmPtr;
    positionsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    rotationsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    scalesBuffer?: GPUBuffer | { buffer: GPUBuffer };
    attributesBuffer?: GPUBuffer | { buffer: GPUBuffer };
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    colorMode?: GlyphColorMode;
    colormap?: GlyphColormap | Colormap;
    colormapStops?: Color4[];
    scaleTransform: ScaleTransformDescriptor;
    opacity?: number;
    lit?: boolean;
    solidColor?: Color4;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ndShape?: number[];
};

const UNIFORM_FLOAT_COUNT = (5 * 4) + 4 + 4 + (8 * 4);
const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;

const normalizeGlyphScaleTransform = (transform: ScaleTransformDescriptor | ScaleTransform): ScaleTransform => {
    return normalizeScaleTransform({
        componentCount: 4,
        componentIndex: 0,
        stride: 4,
        ...transform
    });
};

const colorModeId = (mode: GlyphColorMode): number => {
    switch (mode) {
        case "rgba": return 0;
        case "scalar": return 1;
        case "solid": return 2;
    }
};

const glyphRevisionScratch = new ArrayBuffer(4);
const glyphRevisionF32 = new Float32Array(glyphRevisionScratch);
const glyphRevisionU32 = new Uint32Array(glyphRevisionScratch);
const mixGlyphRevision = (hash: number, value: number): number => Math.imul((hash ^ (value >>> 0)) >>> 0, 16777619) >>> 0;
const mixGlyphRevisionF32 = (hash: number, value: number): number => { glyphRevisionF32[0] = Number.isFinite(value) ? value : 0; return mixGlyphRevision(hash, glyphRevisionU32[0] >>> 0); };

const createUvEllipsoidGeometry = (latSegments: number = 8, lonSegments: number = 12): Geometry => {
    const lat = Math.max(3, latSegments | 0);
    const lon = Math.max(3, lonSegments | 0);
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let y = 0; y <= lat; y++) {
        const v = y / lat;
        const theta = v * Math.PI;
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);
        for (let x = 0; x <= lon; x++) {
            const u = x / lon;
            const phi = u * Math.PI * 2;
            const sinP = Math.sin(phi);
            const cosP = Math.cos(phi);
            const nx = cosP * sinT;
            const ny = cosT;
            const nz = sinP * sinT;
            positions.push(nx, ny, nz);
            normals.push(nx, ny, nz);
            uvs.push(u, 1.0 - v);
        }
    }
    const stride = lon + 1;
    for (let y = 0; y < lat; y++) {
        for (let x = 0; x < lon; x++) {
            const i0 = y * stride + x;
            const i1 = i0 + 1;
            const i2 = i0 + stride;
            const i3 = i2 + 1;
            indices.push(i0, i1, i2);
            indices.push(i1, i3, i2);
        }
    }
    return new Geometry({
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        indices: new Uint32Array(indices)
    });
};

const createArrowGeometry = (radialSegments: number = 12): Geometry => {
    const seg = Math.max(3, radialSegments | 0);
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const z0 = -0.5;
    const z1 = 0.15;
    const z2 = 0.2;
    const z3 = 0.5;
    const r0 = 0.05;
    const r1 = 0.1;
    const pushVertex = (px: number, py: number, pz: number, nx: number, ny: number, nz: number, u: number, v: number): number => {
        const idx = (positions.length / 3) | 0;
        positions.push(px, py, pz);
        normals.push(nx, ny, nz);
        uvs.push(u, v);
        return idx;
    };
    const ring = (z: number, r: number, nz: number, forCap: boolean): number[] => {
        const out: number[] = [];
        for (let i = 0; i <= seg; i++) {
            const t = i / seg;
            const a = t * Math.PI * 2;
            const c = Math.cos(a);
            const s = Math.sin(a);
            const px = c * r;
            const py = s * r;
            let nx = c;
            let ny = s;
            let nzz = nz;
            if (forCap) {
                nx = 0;
                ny = 0;
                nzz = nz;
            }
            out.push(pushVertex(px, py, z, nx, ny, nzz, t, (z - z0)));
        }
        return out;
    };
    const cylBottom = ring(z0, r0, 0, false);
    const cylTop = ring(z1, r0, 0, false);
    for (let i = 0; i < seg; i++) {
        const i0 = cylBottom[i];
        const i1 = cylBottom[i + 1];
        const i2 = cylTop[i];
        const i3 = cylTop[i + 1];
        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
    }
    const fr0 = ring(z1, r0, 0, false);
    const fr1 = ring(z2, r1, 0, false);
    const slope = (r0 - r1) / (z2 - z1);
    for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const a = t * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const nx = c;
        const ny = s;
        const nz = slope;
        const inv = 1.0 / Math.hypot(nx, ny, nz);
        normals[fr0[i] * 3 + 0] = nx * inv;
        normals[fr0[i] * 3 + 1] = ny * inv;
        normals[fr0[i] * 3 + 2] = nz * inv;
        normals[fr1[i] * 3 + 0] = nx * inv;
        normals[fr1[i] * 3 + 1] = ny * inv;
        normals[fr1[i] * 3 + 2] = nz * inv;
    }
    for (let i = 0; i < seg; i++) {
        const i0 = fr0[i];
        const i1 = fr0[i + 1];
        const i2 = fr1[i];
        const i3 = fr1[i + 1];
        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
    }
    const coneBase = ring(z2, r1, 0, false);
    const coneTipVerts: number[] = [];
    const coneH = z3 - z2;
    const coneNz = r1 / coneH;
    for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const a = t * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const nx = c;
        const ny = s;
        const nz = coneNz;
        const inv = 1.0 / Math.hypot(nx, ny, nz);
        coneTipVerts.push(pushVertex(0, 0, z3, nx * inv, ny * inv, nz * inv, t, (z3 - z0)));
    }
    for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const a = t * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const nx = c;
        const ny = s;
        const nz = coneNz;
        const inv = 1.0 / Math.hypot(nx, ny, nz);
        normals[coneBase[i] * 3 + 0] = nx * inv;
        normals[coneBase[i] * 3 + 1] = ny * inv;
        normals[coneBase[i] * 3 + 2] = nz * inv;
    }
    for (let i = 0; i < seg; i++) {
        const b0 = coneBase[i];
        const b1 = coneBase[i + 1];
        const t0 = coneTipVerts[i];
        indices.push(b0, b1, t0);
    }
    const capCenter = pushVertex(0, 0, z0, 0, 0, -1, 0.5, 0);
    const capRing = ring(z0, r0, -1, true);
    for (let i = 0; i < seg; i++) {
        const rA = capRing[i];
        const rB = capRing[i + 1];
        indices.push(capCenter, rB, rA);
    }
    return new Geometry({
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        indices: new Uint32Array(indices)
    });
};

let cachedEllipsoid: Geometry | null = null;
let cachedArrow: Geometry | null = null;

export const defaultGlyphGeometry = (shape: GlyphShape): Geometry => {
    switch (shape) {
        case "ellipsoid":
            cachedEllipsoid ??= createUvEllipsoidGeometry();
            return cachedEllipsoid;
        case "arrow":
            cachedArrow ??= createArrowGeometry();
            return cachedArrow;
        default:
            cachedEllipsoid ??= createUvEllipsoidGeometry();
            return cachedEllipsoid;
    }
};

export class GlyphField {
    readonly transform: Transform = new Transform();
    name: string | null = null;
    visible: boolean = true;
    boundsMin: [number, number, number] = [0, 0, 0];
    boundsMax: [number, number, number] = [0, 0, 0];
    blendMode: BlendMode = BlendMode.Opaque;
    cullMode: CullMode = CullMode.Back;
    depthWrite: boolean = true;
    depthTest: boolean = true;
    boundsCenter: [number, number, number] = [0, 0, 0];
    boundsRadius: number = 0;
    shape: GlyphShape = "ellipsoid";
    geometry: Geometry;
    positionsBuffer: GPUBuffer | null = null;
    rotationsBuffer: GPUBuffer | null = null;
    scalesBuffer: GPUBuffer | null = null;
    attributesBuffer: GPUBuffer | null = null;
    uniformBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;
    bindGroupKey: string | null = null;
    private _instanceCount: number = 0;
    private _positionsCPU: Float32Array | null = null;
    private _rotationsCPU: Float32Array | null = null;
    private _scalesCPU: Float32Array | null = null;
    private _attributesCPU: Float32Array | null = null;
    private _positionsPtr: WasmPtr = 0;
    private _rotationsPtr: WasmPtr = 0;
    private _scalesPtr: WasmPtr = 0;
    private _attributesPtr: WasmPtr = 0;
    private _usingWasmPtrs: boolean = false;
    private _usingExternalBuffers: boolean = false;
    private _keepCPUData: boolean = false;
    private _ndShape: number[] | null = null;
    private _boundsSource: "none" | "explicit" | "computed" = "none";
    private _dataDirty: boolean = true;
    private _uniformDirty: boolean = true;
    private _colorMode: GlyphColorMode = "rgba";
    private _colormap: GlyphColormap | Colormap = "viridis";
    private _colormapStops: Color4[] = [[0.26700, 0.00487, 0.32942, 1.0], [0.99325, 0.90616, 0.14394, 1.0]];
    private _scaleTransform: ScaleTransform = normalizeGlyphScaleTransform({});
    private _scaleRevision: number = 0;
    private readonly _visualChangeListeners: Set<(kind: GlyphFieldVisualChangeKind) => void> = new Set();
    private _opacity: number = 1.0;
    private _lit: boolean = false;
    private _solidColor: Color4 = [1, 1, 1, 1];

    constructor(desc: GlyphFieldDescriptor) {
        assert(!!desc && !!desc.scaleTransform, "GlyphField: scaleTransform is required.");
        this._scaleTransform = normalizeGlyphScaleTransform(desc.scaleTransform);
        if (desc.name !== undefined) this.name = desc.name;
        if (desc.visible !== undefined) this.visible = !!desc.visible;
        this.shape = desc.shape ?? "ellipsoid";
        this.geometry = desc.geometry ?? defaultGlyphGeometry(this.shape);
        this.applyExplicitBounds(desc);
        if (desc.blendMode !== undefined) this.blendMode = desc.blendMode;
        if (desc.cullMode !== undefined) this.cullMode = desc.cullMode;
        if (desc.depthWrite !== undefined) this.depthWrite = !!desc.depthWrite;
        if (desc.depthTest !== undefined) this.depthTest = !!desc.depthTest;
        if (desc.colorMode !== undefined) this._colorMode = desc.colorMode;
        if (desc.colormap !== undefined) this._colormap = desc.colormap;
        if (desc.colormapStops !== undefined) this._colormapStops = normalizeColorStops(desc.colormapStops);
        if (desc.opacity !== undefined) this._opacity = desc.opacity;
        if (desc.lit !== undefined) this._lit = !!desc.lit;
        if (desc.solidColor !== undefined) this._solidColor = [desc.solidColor[0], desc.solidColor[1], desc.solidColor[2], desc.solidColor[3]];
        if (desc.keepCPUData !== undefined) this._keepCPUData = !!desc.keepCPUData;
        if (desc.ndShape !== undefined) this.ndShape = desc.ndShape;
        const positionsBuffer = desc.positionsBuffer ? resolveGPUBuffer(desc.positionsBuffer) : null;
        const rotationsBuffer = desc.rotationsBuffer ? resolveGPUBuffer(desc.rotationsBuffer) : null;
        const scalesBuffer = desc.scalesBuffer ? resolveGPUBuffer(desc.scalesBuffer) : null;
        const attributesBuffer = desc.attributesBuffer ? resolveGPUBuffer(desc.attributesBuffer) : null;
        if (positionsBuffer || rotationsBuffer || scalesBuffer || attributesBuffer) {
            assert(!!positionsBuffer && !!rotationsBuffer && !!scalesBuffer, "GlyphField: positionsBuffer, rotationsBuffer, and scalesBuffer are required when using external buffers.");
            const count = desc.instanceCount ?? 0;
            assert(count > 0, "GlyphField: instanceCount is required when using external buffers.");
            this.setBuffers(positionsBuffer!, rotationsBuffer!, scalesBuffer!, attributesBuffer, count);
        } else if (desc.positionsPtr || desc.rotationsPtr || desc.scalesPtr) {
            assert(!!desc.positionsPtr && !!desc.rotationsPtr && !!desc.scalesPtr, "GlyphField: positionsPtr, rotationsPtr, and scalesPtr are required when using wasm pointers.");
            const count = desc.instanceCount ?? 0;
            assert(count > 0, "GlyphField: instanceCount is required when using wasm pointers.");
            this.setWasmSoA(desc.positionsPtr!, desc.rotationsPtr!, desc.scalesPtr!, desc.attributesPtr ?? 0, count);
        } else if (desc.positions || desc.rotations || desc.scales || desc.attributes) {
            this.setCPUData(desc.positions ?? null, desc.rotations ?? null, desc.scales ?? null, desc.attributes ?? null, { keepCPUData: this._keepCPUData, instanceCount: desc.instanceCount });
        } else if (desc.instanceCount !== undefined) {
            this._instanceCount = desc.instanceCount | 0;
            this._dataDirty = false;
        }
    }

    private applyExplicitBounds(desc: GlyphFieldDescriptor): void {
        if (desc.boundsMin && desc.boundsMax) {
            const bounds = boundsFromBox(desc.boundsMin, desc.boundsMax);
            this.setBounds(bounds, "explicit");
            if (desc.boundsCenter) this.boundsCenter = [desc.boundsCenter[0], desc.boundsCenter[1], desc.boundsCenter[2]];
            if (desc.boundsRadius !== undefined) this.boundsRadius = Math.max(0, desc.boundsRadius);
            return;
        }
        if (desc.boundsCenter || desc.boundsRadius !== undefined) {
            const center = desc.boundsCenter ?? [0, 0, 0];
            const radius = desc.boundsRadius ?? 0;
            this.setBounds(boundsFromSphere(center, radius), "explicit");
        }
    }

    private setBounds(bounds: Bounds3, source: "none" | "explicit" | "computed"): void {
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

    get instanceCount(): number {
        return this._instanceCount;
    }

    get occluderRevision(): number {
        let hash = 2166136261 >>> 0;
        hash = mixGlyphRevision(hash, this._instanceCount >>> 0);
        hash = mixGlyphRevision(hash, this._scaleRevision >>> 0);
        hash = mixGlyphRevision(hash, this.blendMode === BlendMode.Opaque ? 1 : this.blendMode === BlendMode.Transparent ? 2 : 3);
        hash = mixGlyphRevision(hash, this.cullMode === CullMode.Back ? 1 : this.cullMode === CullMode.Front ? 2 : 3);
        hash = mixGlyphRevision(hash, this.depthWrite ? 1 : 0);
        hash = mixGlyphRevision(hash, this.depthTest ? 1 : 0);
        hash = mixGlyphRevision(hash, colorModeId(this._colorMode) >>> 0);
        hash = mixGlyphRevision(hash, this._dataDirty ? 1 : 0);
        hash = mixGlyphRevision(hash, this.geometry.vertexCount >>> 0);
        hash = mixGlyphRevision(hash, this.geometry.indexCount >>> 0);
        hash = mixGlyphRevision(hash, this.attributesBuffer ? 1 : 0);
        hash = mixGlyphRevisionF32(hash, this._opacity);
        return hash >>> 0;
    }

    get ndShape(): number[] | null {
        return this._ndShape ? this._ndShape.slice() : null;
    }

    set ndShape(shape: ReadonlyArray<number> | null) {
        this._ndShape = normalizePositiveIntShape(shape, "GlyphField: ndShape");
    }
    get scaleTransform(): ScaleTransform {
        return cloneScaleTransform(this._scaleTransform);
    }

    setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void {
        this._scaleTransform = normalizeGlyphScaleTransform(transform);
        this._uniformDirty = true;
        this.emitVisualChange("scale");
    }

    applyScaleStats(stats: ScaleStatsResult): void {
        const next = cloneScaleTransform(this._scaleTransform);
        if (Number.isFinite(stats.min)) next.domainMin = stats.min;
        if (Number.isFinite(stats.max)) next.domainMax = stats.max;
        if (stats.percentileMin !== null && stats.percentileMax !== null) {
            next.clampMin = stats.percentileMin;
            next.clampMax = stats.percentileMax;
        }
        this._scaleTransform = normalizeGlyphScaleTransform(next);
        this._uniformDirty = true;
        this.emitVisualChange("scale");
    }

    onVisualChange(listener: (kind: GlyphFieldVisualChangeKind) => void): () => void {
        this._visualChangeListeners.add(listener);
        return () => this._visualChangeListeners.delete(listener);
    }

    getScaleSourceDescriptor(revision: number = this._scaleRevision): ScaleSourceDescriptor | null {
        if (!this.attributesBuffer || this._instanceCount <= 0) return null;
        return {
            buffer: this.attributesBuffer,
            count: this._instanceCount,
            componentCount: this._scaleTransform.componentCount,
            componentIndex: this._scaleTransform.componentIndex,
            valueMode: this._scaleTransform.valueMode,
            stride: this._scaleTransform.stride,
            offset: this._scaleTransform.offset,
            revision
        };
    }

    set instanceCount(v: number) {
        const n = v | 0;
        if (n === this._instanceCount) return;
        assert(n >= 0, "GlyphField: instanceCount must be >= 0.");
        this._instanceCount = n;
        this._dataDirty = true;
        this._scaleRevision++;
    }

    get colorMode(): GlyphColorMode {
        return this._colorMode;
    }

    set colorMode(v: GlyphColorMode) {
        if (v === this._colorMode) return;
        this._colorMode = v;
        this._uniformDirty = true;
    }

    get colormap(): GlyphColormap | Colormap {
        return this._colormap;
    }

    set colormap(v: GlyphColormap | Colormap) {
        this._colormap = v;
        this._uniformDirty = true;
        this.bindGroupKey = null;
        this.emitVisualChange("colormap");
    }

    get colormapStops(): Color4[] {
        return this._colormapStops;
    }

    set colormapStops(v: Color4[]) {
        this._colormapStops = normalizeColorStops(v);
        this._uniformDirty = true;
        this.emitVisualChange("colormap");
    }

    getColormapKey(): string {
        const c = this._colormap;
        return (c instanceof Colormap) ? `cm:${c.id}` : `cm:${c}`;
    }

    getColormapForBinding(): Colormap {
        const c = this._colormap;
        if (c instanceof Colormap) return c;
        if (c === "custom") return Colormap.builtin("grayscale");
        return Colormap.builtin(c);
    }
    get opacity(): number {
        return this._opacity;
    }

    set opacity(v: number) {
        if (v === this._opacity) return;
        this._opacity = v;
        this._uniformDirty = true;
    }

    get lit(): boolean {
        return this._lit;
    }

    set lit(v: boolean) {
        const b = !!v;
        if (b === this._lit) return;
        this._lit = b;
        this._uniformDirty = true;
    }

    get solidColor(): Color4 {
        return this._solidColor;
    }

    set solidColor(v: Color4) {
        this._solidColor = [v[0], v[1], v[2], v[3]];
        this._uniformDirty = true;
    }

    markDataDirty(): void {
        if (!this._usingExternalBuffers) this._dataDirty = true;
        this._scaleRevision++;
    }

    markUniformsDirty(): void {
        this._uniformDirty = true;
    }

    getAttributeRecord(index: number): [number, number, number, number] | null {
        const data = this._attributesCPU;
        if (!data) return null;
        if (!Number.isInteger(index) || index < 0 || index >= this._instanceCount) return null;
        const o = index * 4;
        return [data[o + 0], data[o + 1], data[o + 2], data[o + 3]];
    }

    mapLinearIndexToNd(index: number): number[] | null {
        return linearIndexToNdIndex(this._ndShape, index);
    }

    setCPUData(positions: Float32Array | null, rotations: Float32Array | null, scales: Float32Array | null, attributes: Float32Array | null, opts: { keepCPUData?: boolean; instanceCount?: number } = {}): void {
        if (positions) assert((positions.length % 4) === 0, "GlyphField: positions length must be a multiple of 4 (x,y,z,_ per instance).");
        if (rotations) assert((rotations.length % 4) === 0, "GlyphField: rotations length must be a multiple of 4 (qx,qy,qz,qw per instance).");
        if (scales) assert((scales.length % 4) === 0, "GlyphField: scales length must be a multiple of 4 (sx,sy,sz,_ per instance).");
        if (attributes) assert((attributes.length % 4) === 0, "GlyphField: attributes length must be a multiple of 4 (a0,a1,a2,a3 per instance).");
        const count = (opts.instanceCount !== undefined) ? (opts.instanceCount | 0) : (positions ? (positions.length / 4) : (rotations ? (rotations.length / 4) : (scales ? (scales.length / 4) : (attributes ? (attributes.length / 4) : 0))));
        assert(count >= 0, "GlyphField: instanceCount must be >= 0.");
        if (count > 0) assert(!!positions && !!rotations && !!scales, "GlyphField: positions, rotations, and scales are required for CPU-backed glyph fields.");
        if (positions) assert((positions.length / 4) === count, "GlyphField: positions length does not match instanceCount.");
        if (rotations) assert((rotations.length / 4) === count, "GlyphField: rotations length does not match instanceCount.");
        if (scales) assert((scales.length / 4) === count, "GlyphField: scales length does not match instanceCount.");
        if (attributes) assert((attributes.length / 4) === count, "GlyphField: attributes length does not match instanceCount.");
        this._instanceCount = count;
        this._positionsCPU = positions;
        this._rotationsCPU = rotations;
        this._scalesCPU = scales;
        this._attributesCPU = attributes;
        this._positionsPtr = 0;
        this._rotationsPtr = 0;
        this._scalesPtr = 0;
        this._attributesPtr = 0;
        this._usingWasmPtrs = false;
        this._usingExternalBuffers = false;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.clearComputedBoundsIfNeeded();
        this._dataDirty = true;
        this._scaleRevision++;
        this.bindGroupKey = null;
    }

    setWasmSoA(positionsPtr: WasmPtr, rotationsPtr: WasmPtr, scalesPtr: WasmPtr, attributesPtr: WasmPtr, instanceCount: number): void {
        const count = instanceCount | 0;
        assert(count > 0, "GlyphField: instanceCount must be > 0.");
        this._instanceCount = count;
        this._positionsCPU = null;
        this._rotationsCPU = null;
        this._scalesCPU = null;
        this._attributesCPU = null;
        this._positionsPtr = positionsPtr >>> 0;
        this._rotationsPtr = rotationsPtr >>> 0;
        this._scalesPtr = scalesPtr >>> 0;
        this._attributesPtr = attributesPtr >>> 0;
        this._usingWasmPtrs = true;
        this._usingExternalBuffers = false;
        this.clearComputedBoundsIfNeeded();
        this._dataDirty = true;
        this._scaleRevision++;
        this.bindGroupKey = null;
    }

    setBuffers(positions: GPUBuffer, rotations: GPUBuffer, scales: GPUBuffer, attributes: GPUBuffer | null, instanceCount: number): void {
        const count = instanceCount | 0;
        assert(count > 0, "GlyphField: instanceCount must be > 0.");
        this._instanceCount = count;
        this.positionsBuffer = positions;
        this.rotationsBuffer = rotations;
        this.scalesBuffer = scales;
        this.attributesBuffer = attributes;
        this._positionsCPU = null;
        this._rotationsCPU = null;
        this._scalesCPU = null;
        this._attributesCPU = null;
        this._positionsPtr = 0;
        this._rotationsPtr = 0;
        this._scalesPtr = 0;
        this._attributesPtr = 0;
        this._usingWasmPtrs = false;
        this._usingExternalBuffers = true;
        this.clearComputedBoundsIfNeeded();
        this._dataDirty = false;
        this._scaleRevision++;
        this.bindGroupKey = null;
    }

    computeBoundsFromCPUData(): void {
        const positions = this._positionsCPU;
        const scales = this._scalesCPU;
        const count = this._instanceCount;
        if (!positions || !scales || count <= 0) return;
        const rotations = this._rotationsCPU;
        const positionsPtr = wasm.allocF32(positions.length);
        const scalesPtr = wasm.allocF32(scales.length);
        let rotationsPtr: WasmPtr = 0;
        const glyphCenterPtr = wasm.allocF32(3);
        const boxMinPtr = wasm.allocF32(3);
        const boxMaxPtr = wasm.allocF32(3);
        const sphereCenterPtr = wasm.allocF32(3);
        const sphereRadiusPtr = wasm.allocF32(1);
        try {
            wasm.f32view(positionsPtr, positions.length).set(positions);
            wasm.f32view(scalesPtr, scales.length).set(scales);
            if (rotations) {
                rotationsPtr = wasm.allocF32(rotations.length);
                wasm.f32view(rotationsPtr, rotations.length).set(rotations);
            }
            wasm.writeF32(glyphCenterPtr, 3, this.geometry.boundsCenter);
            boundsf.glyphInstances(boxMinPtr, boxMaxPtr, sphereCenterPtr, sphereRadiusPtr, positionsPtr, scalesPtr, rotationsPtr, count, glyphCenterPtr, this.geometry.boundsRadius);
            const boxMin = wasm.f32view(boxMinPtr, 3);
            const boxMax = wasm.f32view(boxMaxPtr, 3);
            this.setBounds(boundsFromBox([boxMin[0], boxMin[1], boxMin[2]], [boxMax[0], boxMax[1], boxMax[2]]), "computed");
        } finally {
            wasm.freeF32(sphereRadiusPtr, 1);
            wasm.freeF32(sphereCenterPtr, 3);
            wasm.freeF32(boxMaxPtr, 3);
            wasm.freeF32(boxMinPtr, 3);
            wasm.freeF32(glyphCenterPtr, 3);
            if (rotationsPtr && rotations) wasm.freeF32(rotationsPtr, rotations.length);
            wasm.freeF32(scalesPtr, scales.length);
            wasm.freeF32(positionsPtr, positions.length);
        }
    }

    getLocalBounds(): Bounds3 {
        if (this._boundsSource === "none" && this._positionsCPU && this._scalesCPU) this.computeBoundsFromCPUData();
        if (this._boundsSource === "none") return emptyBounds(this._instanceCount > 0);
        return boundsFromBox(this.boundsMin, this.boundsMax);
    }

    getWorldBounds(): Bounds3 {
        return transformBounds(this.getLocalBounds(), this.transform.worldMatrix);
    }

    getBounds(): Bounds3 {
        return this.getWorldBounds();
    }

    upload(device: GPUDevice, queue: GPUQueue): void {
        if (this._usingExternalBuffers) return;
        if (!this._dataDirty) return;
        if (this._instanceCount <= 0) { this._dataDirty = false; return; }
        const bytes = driver.bytes();
        const requiredBytes = this._instanceCount * 16;
        const uploadSoA = (buf: GPUBuffer | null, cpu: Float32Array | null, ptr: WasmPtr, label: string): GPUBuffer | null => {
            if (!cpu && !ptr) return buf;
            const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
            const byteLength = requiredBytes;
            const source = cpu ?? new Uint8Array(bytes.buffer, ptr >>> 0, byteLength);
            if (!buf) return createBuffer(device, source, usage, label);
            try {
                queue.writeBuffer(buf, 0, source.buffer, source.byteOffset, Math.min(source.byteLength, byteLength));
            } catch {
                buf.destroy();
                return createBuffer(device, source, usage, label);
            }
            return buf;
        };
        this.positionsBuffer = uploadSoA(this.positionsBuffer, this._positionsCPU, this._positionsPtr, "GlyphField.positions");
        this.rotationsBuffer = uploadSoA(this.rotationsBuffer, this._rotationsCPU, this._rotationsPtr, "GlyphField.rotations");
        this.scalesBuffer = uploadSoA(this.scalesBuffer, this._scalesCPU, this._scalesPtr, "GlyphField.scales");
        if (this._attributesCPU || this._attributesPtr) this.attributesBuffer = uploadSoA(this.attributesBuffer, this._attributesCPU, this._attributesPtr, "GlyphField.attributes");
        else if (!this.attributesBuffer) this.attributesBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "GlyphField.attributesDummy" });
        if (!this._keepCPUData) {
            this._positionsCPU = null;
            this._rotationsCPU = null;
            this._scalesCPU = null;
            this._attributesCPU = null;
        }
        this._dataDirty = false;
        this.bindGroupKey = null;
    }

    getUniformBufferSize(): number {
        return UNIFORM_BYTE_SIZE;
    }

    getUniformData(): Float32Array {
        const out = new Float32Array(UNIFORM_FLOAT_COUNT);
        out.fill(0);
        packScaleTransform(this._scaleTransform, out, 0);
        out[20] = clamp01(this._opacity);
        out[21] = (typeof this._colormap === "string" && this._colormap === "custom") ? Math.min(8, Math.max(2, this._colormapStops.length)) : 0;
        out[22] = colorModeId(this._colorMode);
        out[23] = this._lit ? 1.0 : 0.0;
        out[24] = this._solidColor[0];
        out[25] = this._solidColor[1];
        out[26] = this._solidColor[2];
        out[27] = this._solidColor[3];
        const stops = this._colormapStops;
        const nStops = Math.min(8, Math.max(2, stops.length));
        for (let i = 0; i < 8; i++) {
            const src = stops[Math.min(i, nStops - 1)];
            const o = 28 + i * 4;
            out[o + 0] = src[0];
            out[o + 1] = src[1];
            out[o + 2] = src[2];
            out[o + 3] = src[3];
        }
        return out;
    }

    get dirtyUniforms(): boolean {
        return this._uniformDirty;
    }

    markUniformsClean(): void {
        this._uniformDirty = false;
    }

    private emitVisualChange(kind: GlyphFieldVisualChangeKind): void {
        for (const listener of this._visualChangeListeners) {
            try {
                listener(kind);
            } catch { /* ignore */ }
        }
    }

    destroy(): void {
        this.positionsBuffer?.destroy();
        this.rotationsBuffer?.destroy();
        this.scalesBuffer?.destroy();
        this.attributesBuffer?.destroy();
        this.uniformBuffer?.destroy();
        this.positionsBuffer = null;
        this.rotationsBuffer = null;
        this.scalesBuffer = null;
        this.attributesBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this._positionsCPU = null;
        this._rotationsCPU = null;
        this._scalesCPU = null;
        this._attributesCPU = null;
        this._ndShape = null;
        this._instanceCount = 0;
        this._visualChangeListeners.clear();
        this.transform.dispose();
    }
}

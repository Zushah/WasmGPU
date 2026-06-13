/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp01, createBuffer, linearIndexToNdIndex, normalizeColorStops, normalizePositiveIntShape, resolveGPUBuffer } from "../utils";
import { Transform } from "../core/transform";
import { BlendMode, type Color4 } from "../graphics/material";
import { Colormap, type BuiltinColormapName } from "../graphics/colormap";
import { cloneScaleTransform, normalizeScaleTransform, packScaleTransform, SCALE_UNIFORM_FLOAT_COUNT } from "../scaling";
import type { ScaleSourceDescriptor, ScaleStatsResult, ScaleTransform, ScaleTransformDescriptor } from "../scaling";
import { boundsf, wasm } from "../wasm";
import { Bounds3, boundsFromBox, boundsFromBoxAndSphere, boundsFromSphere, emptyBounds, transformBounds } from "./bounds";

export type PointCloudColormap = BuiltinColormapName | "custom";

export type PointCloudColorMode = "rgba" | "scalar";

export type PointCloudVisualChangeKind = "scale" | "colormap" | "visual";

export type PointCloudDescriptor = {
    data?: Float32Array;
    colors?: Float32Array;
    pointsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    colorsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    pointCount?: number;
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    blendMode?: BlendMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    basePointSize?: number;
    minPointSize?: number;
    maxPointSize?: number;
    sizeAttenuation?: number;
    opacity?: number;
    colormap?: PointCloudColormap | Colormap;
    colormapStops?: Color4[];
    colorMode?: PointCloudColorMode;
    softness?: number;
    scaleTransform: ScaleTransformDescriptor;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ownBuffers?: boolean;
    ndShape?: number[];
};

const UNIFORM_FLOAT_COUNT = 4 + SCALE_UNIFORM_FLOAT_COUNT + 4 + (8 * 4);
const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;

type BoundsSourceMode = "none" | "explicit" | "computed";

const normalizePointCloudScaleTransform = (transform: ScaleTransformDescriptor | ScaleTransform): ScaleTransform => normalizeScaleTransform({ componentCount: 4, componentIndex: 3, stride: 4, ...transform });

const colorModeId = (mode: PointCloudColorMode): number => mode === "rgba" ? 0 : 1;

const pointCloudRevisionScratch = new ArrayBuffer(4);
const pointCloudRevisionF32 = new Float32Array(pointCloudRevisionScratch);
const pointCloudRevisionU32 = new Uint32Array(pointCloudRevisionScratch);
const mixPointCloudRevision = (hash: number, value: number): number => Math.imul((hash ^ (value >>> 0)) >>> 0, 16777619) >>> 0;
const mixPointCloudRevisionF32 = (hash: number, value: number): number => { pointCloudRevisionF32[0] = Number.isFinite(value) ? value : 0; return mixPointCloudRevision(hash, pointCloudRevisionU32[0] >>> 0); };

export class PointCloud {
    readonly transform: Transform = new Transform();
    name: string | null = null;
    visible: boolean = true;
    boundsMin: [number, number, number] = [0, 0, 0];
    boundsMax: [number, number, number] = [0, 0, 0];
    boundsCenter: [number, number, number] = [0, 0, 0];
    boundsRadius: number = 0;
    blendMode: BlendMode = BlendMode.Additive;
    depthWrite: boolean = false;
    depthTest: boolean = true;
    private _basePointSize: number = 2.0;
    private _minPointSize: number = 1.0;
    private _maxPointSize: number = 16.0;
    private _sizeAttenuation: number = 1.0;
    private _opacity: number = 1.0;
    private _colorMode: PointCloudColorMode = "scalar";
    private _colormap: PointCloudColormap | Colormap = "viridis";
    private _colormapStops: Color4[] = [[0.26700, 0.00487, 0.32942, 1.0], [0.99325, 0.90616, 0.14394, 1.0]];
    private _softness: number = 0.15;
    private _scaleTransform: ScaleTransform;
    private _CPUData: Float32Array | null = null;
    private _colorsCPU: Float32Array | null = null;
    private _keepCPUData: boolean = false;
    private _ndShape: number[] | null = null;
    private _boundsSource: BoundsSourceMode = "none";
    private _scaleRevision: number = 0;
    private readonly _visualChangeListeners: Set<(kind: PointCloudVisualChangeKind) => void> = new Set();
    pointsBuffer: GPUBuffer | null = null;
    colorsBuffer: GPUBuffer | null = null;
    uniformBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;
    bindGroupKey: string | null = null;
    private _pointCount: number = 0;
    private _uniformDirty: boolean = true;
    private _pointsDirty: boolean = true;
    private _colorsDirty: boolean = true;
    private _pointsOwned: boolean = false;
    private _colorsOwned: boolean = false;
    private _ownExternalBuffers: boolean = false;
    private _colorsExternal: boolean = false;

    constructor(desc: PointCloudDescriptor) {
        assert(!!desc && !!desc.scaleTransform, "PointCloud: scaleTransform is required.");
        this._scaleTransform = normalizePointCloudScaleTransform(desc.scaleTransform);
        if (desc.name !== undefined) this.name = desc.name;
        if (desc.visible !== undefined) this.visible = !!desc.visible;
        if (desc.blendMode !== undefined) this.blendMode = desc.blendMode;
        if (desc.depthWrite !== undefined) this.depthWrite = !!desc.depthWrite;
        if (desc.depthTest !== undefined) this.depthTest = !!desc.depthTest;
        if (desc.basePointSize !== undefined) this._basePointSize = desc.basePointSize;
        if (desc.minPointSize !== undefined) this._minPointSize = desc.minPointSize;
        if (desc.maxPointSize !== undefined) this._maxPointSize = desc.maxPointSize;
        if (desc.sizeAttenuation !== undefined) this._sizeAttenuation = desc.sizeAttenuation;
        if (desc.opacity !== undefined) this._opacity = desc.opacity;
        if (desc.colormap !== undefined) this._colormap = desc.colormap;
        if (desc.colormapStops !== undefined) this._colormapStops = normalizeColorStops(desc.colormapStops);
        if (desc.colorMode !== undefined) this._colorMode = desc.colorMode;
        else if (desc.colors || desc.colorsBuffer) this._colorMode = "rgba";
        if (desc.softness !== undefined) this._softness = desc.softness;
        if (desc.keepCPUData !== undefined) this._keepCPUData = !!desc.keepCPUData;
        this._ownExternalBuffers = !!desc.ownBuffers;
        if (desc.ndShape !== undefined) this.ndShape = desc.ndShape;
        this.applyExplicitBounds(desc);
        if (desc.data) this.setData(desc.data, { keepCPUData: this._keepCPUData });
        else if (desc.pointsBuffer) { const buf = resolveGPUBuffer(desc.pointsBuffer); const count = desc.pointCount ?? 0; assert(count > 0, "PointCloud: pointCount is required when using pointsBuffer."); this.setPointsBuffer(buf, count, { ownBuffer: this._ownExternalBuffers }); }
        else if (desc.pointCount !== undefined) { this._pointCount = desc.pointCount; this._pointsDirty = false; }
        if (desc.colors) this.setColors(desc.colors, { keepCPUData: this._keepCPUData });
        else if (desc.colorsBuffer) this.setColorsBuffer(resolveGPUBuffer(desc.colorsBuffer), { ownBuffer: this._ownExternalBuffers });
    }

    private applyExplicitBounds(desc: PointCloudDescriptor): void {
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

    private clearColorsIfCountMismatch(): void {
        if (!this._colorsCPU) return;
        if ((this._colorsCPU.length / 4) === this._pointCount) return;
        this._colorsCPU = null;
        this._colorsDirty = false;
        this.bindGroupKey = null;
    }

    private replacePointsBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.pointsBuffer && this.pointsBuffer !== buffer && this._pointsOwned) this.pointsBuffer.destroy();
        this.pointsBuffer = buffer;
        this._pointsOwned = !!buffer && owned;
    }

    private replaceColorsBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.colorsBuffer && this.colorsBuffer !== buffer && this._colorsOwned) this.colorsBuffer.destroy();
        this.colorsBuffer = buffer;
        this._colorsOwned = !!buffer && owned;
    }

    get pointCount(): number {
        return this._pointCount;
    }

    get occluderRevision(): number {
        let hash = 2166136261 >>> 0;
        hash = mixPointCloudRevision(hash, this._pointCount >>> 0);
        hash = mixPointCloudRevision(hash, this._scaleRevision >>> 0);
        hash = mixPointCloudRevision(hash, this.blendMode === BlendMode.Opaque ? 1 : this.blendMode === BlendMode.Transparent ? 2 : 3);
        hash = mixPointCloudRevision(hash, this.depthWrite ? 1 : 0);
        hash = mixPointCloudRevision(hash, this.depthTest ? 1 : 0);
        hash = mixPointCloudRevision(hash, this._pointsDirty ? 1 : 0);
        hash = mixPointCloudRevision(hash, this._colorsDirty ? 1 : 0);
        hash = mixPointCloudRevision(hash, this.pointsBuffer ? 1 : 0);
        hash = mixPointCloudRevision(hash, this.colorsBuffer ? 1 : 0);
        hash = mixPointCloudRevision(hash, colorModeId(this._colorMode) >>> 0);
        hash = mixPointCloudRevisionF32(hash, this._basePointSize);
        hash = mixPointCloudRevisionF32(hash, this._minPointSize);
        hash = mixPointCloudRevisionF32(hash, this._maxPointSize);
        hash = mixPointCloudRevisionF32(hash, this._sizeAttenuation);
        return hash >>> 0;
    }

    get ndShape(): number[] | null {
        return this._ndShape ? this._ndShape.slice() : null;
    }

    set ndShape(shape: ReadonlyArray<number> | null) {
        this._ndShape = normalizePositiveIntShape(shape, "PointCloud: ndShape");
    }

    get scaleTransform(): ScaleTransform {
        return cloneScaleTransform(this._scaleTransform);
    }

    setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void {
        this._scaleTransform = normalizePointCloudScaleTransform(transform);
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
        this._scaleTransform = normalizePointCloudScaleTransform(next);
        this._uniformDirty = true;
        this.emitVisualChange("scale");
    }

    onVisualChange(listener: (kind: PointCloudVisualChangeKind) => void): () => void {
        this._visualChangeListeners.add(listener);
        return () => this._visualChangeListeners.delete(listener);
    }

    getScaleSourceDescriptor(revision: number = this._scaleRevision): ScaleSourceDescriptor | null {
        if (!this.pointsBuffer || this._pointCount <= 0) return null;
        return {
            buffer: this.pointsBuffer,
            count: this._pointCount,
            componentCount: this._scaleTransform.componentCount,
            componentIndex: this._scaleTransform.componentIndex,
            valueMode: this._scaleTransform.valueMode,
            stride: this._scaleTransform.stride,
            offset: this._scaleTransform.offset,
            revision
        };
    }

    get basePointSize(): number {
        return this._basePointSize;
    }

    set basePointSize(v: number) {
        if (v === this._basePointSize) return;
        this._basePointSize = v;
        this._uniformDirty = true;
    }

    get minPointSize(): number {
        return this._minPointSize;
    }

    set minPointSize(v: number) {
        if (v === this._minPointSize) return;
        this._minPointSize = v;
        this._uniformDirty = true;
    }

    get maxPointSize(): number {
        return this._maxPointSize;
    }

    set maxPointSize(v: number) {
        if (v === this._maxPointSize) return;
        this._maxPointSize = v;
        this._uniformDirty = true;
    }

    get sizeAttenuation(): number {
        return this._sizeAttenuation;
    }

    set sizeAttenuation(v: number) {
        if (v === this._sizeAttenuation) return;
        this._sizeAttenuation = v;
        this._uniformDirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(v: number) {
        if (v === this._opacity) return;
        this._opacity = v;
        this._uniformDirty = true;
    }

    get colorMode(): PointCloudColorMode {
        return this._colorMode;
    }

    set colorMode(v: PointCloudColorMode) {
        if (v === this._colorMode) return;
        this._colorMode = v;
        this._uniformDirty = true;
        this.emitVisualChange("visual");
    }

    get colormap(): PointCloudColormap | Colormap {
        return this._colormap;
    }

    set colormap(v: PointCloudColormap | Colormap) {
        this._colormap = v;
        this._uniformDirty = true;
        this.bindGroupKey = null;
        this.emitVisualChange("colormap");
    }

    get colormapStops(): ReadonlyArray<Color4> {
        return this._colormapStops;
    }

    set colormapStops(stops: ReadonlyArray<Color4>) {
        this._colormapStops = normalizeColorStops(stops);
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

    get softness(): number {
        return this._softness;
    }

    set softness(v: number) {
        if (v === this._softness) return;
        this._softness = v;
        this._uniformDirty = true;
    }

    setData(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert((data.length % 4) === 0, "PointCloud: data length must be a multiple of 4 (x,y,z,scalar per point).");
        this._CPUData = data;
        this._pointCount = data.length / 4;
        this.clearColorsIfCountMismatch();
        if (this.pointsBuffer && !this._pointsOwned) this.pointsBuffer = null;
        this._pointsDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this._scaleRevision++;
        this.bindGroupKey = null;
        this.clearComputedBoundsIfNeeded();
    }

    setPointsBuffer(buffer: GPUBuffer, pointCount: number, opts: { ownBuffer?: boolean } = {}): void {
        assert(pointCount > 0, "PointCloud: pointCount must be > 0.");
        this._CPUData = null;
        this._pointCount = pointCount;
        this.clearColorsIfCountMismatch();
        this.replacePointsBuffer(buffer, !!opts.ownBuffer);
        this._pointsDirty = false;
        this._scaleRevision++;
        this.bindGroupKey = null;
        this.clearComputedBoundsIfNeeded();
    }

    setColors(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert((data.length % 4) === 0, "PointCloud: colors length must be a multiple of 4 (r,g,b,a per point).");
        assert((data.length / 4) === this._pointCount, "PointCloud: colors length must equal pointCount*4.");
        this._colorsCPU = new Float32Array(data);
        if (this.colorsBuffer && !this._colorsOwned) this.colorsBuffer = null;
        this._colorsExternal = false;
        this._colorsDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.bindGroupKey = null;
    }

    setColorsBuffer(buffer: GPUBuffer | null, opts: { ownBuffer?: boolean } = {}): void {
        if (buffer) assert(this._pointCount > 0, "PointCloud: pointCount must be > 0 when using colorsBuffer.");
        this.replaceColorsBuffer(buffer, !!buffer && !!opts.ownBuffer);
        this._colorsCPU = null;
        this._colorsExternal = !!buffer;
        this._colorsDirty = false;
        this.bindGroupKey = null;
    }

    dropCPUData(): void {
        this._CPUData = null;
        this._colorsCPU = null;
    }

    getPointRecord(index: number): { position: [number, number, number]; scalar: number; color: [number, number, number, number] | null; packed: [number, number, number, number] } | null {
        const data = this._CPUData;
        if (!data) return null;
        if (!Number.isInteger(index) || index < 0 || index >= this._pointCount) return null;
        const o = index * 4;
        const color = this._colorsCPU ? [this._colorsCPU[o + 0], this._colorsCPU[o + 1], this._colorsCPU[o + 2], this._colorsCPU[o + 3]] as [number, number, number, number] : null;
        return {
            position: [data[o + 0], data[o + 1], data[o + 2]],
            scalar: data[o + 3], color,
            packed: [data[o + 0], data[o + 1], data[o + 2], data[o + 3]]
        };
    }

    mapLinearIndexToNd(index: number): number[] | null {
        return linearIndexToNdIndex(this._ndShape, index);
    }

    computeBoundsFromCPUData(): void {
        const data = this._CPUData;
        if (!data || data.length < 4) return;
        const pointCount = this._pointCount | 0;
        if (pointCount <= 0) return;
        const pointsPtr = wasm.allocF32(data.length);
        const boxMinPtr = wasm.allocF32(3);
        const boxMaxPtr = wasm.allocF32(3);
        const sphereCenterPtr = wasm.allocF32(3);
        const sphereRadiusPtr = wasm.allocF32(1);
        try {
            wasm.f32view(pointsPtr, data.length).set(data);
            boundsf.pointcloudXYZS(boxMinPtr, boxMaxPtr, sphereCenterPtr, sphereRadiusPtr, pointsPtr, pointCount, 4);
            const boxMin = wasm.f32view(boxMinPtr, 3);
            const boxMax = wasm.f32view(boxMaxPtr, 3);
            const sphereCenter = wasm.f32view(sphereCenterPtr, 3);
            const sphereRadius = wasm.f32view(sphereRadiusPtr, 1)[0];
            this.setBounds(boundsFromBoxAndSphere([boxMin[0], boxMin[1], boxMin[2]], [boxMax[0], boxMax[1], boxMax[2]], [sphereCenter[0], sphereCenter[1], sphereCenter[2]], sphereRadius), "computed");
        } finally {
            wasm.freeF32(sphereRadiusPtr, 1);
            wasm.freeF32(sphereCenterPtr, 3);
            wasm.freeF32(boxMaxPtr, 3);
            wasm.freeF32(boxMinPtr, 3);
            wasm.freeF32(pointsPtr, data.length);
        }
    }

    getLocalBounds(): Bounds3 {
        if (this._boundsSource === "none" && this._CPUData) this.computeBoundsFromCPUData();
        if (this._boundsSource === "none") return emptyBounds(this._pointCount > 0);
        return boundsFromBoxAndSphere(this.boundsMin, this.boundsMax, this.boundsCenter, this.boundsRadius);
    }

    getWorldBounds(): Bounds3 {
        return transformBounds(this.getLocalBounds(), this.transform.worldMatrix);
    }

    getBounds(): Bounds3 {
        return this.getWorldBounds();
    }

    upload(device: GPUDevice, queue: GPUQueue): void {
        if (this._pointsDirty) {
            if (this.pointsBuffer && !this._CPUData) this._pointsDirty = false;
            else {
                const data = this._CPUData;
                if (!data) this._pointsDirty = false;
                else {
                    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
                    if (!this.pointsBuffer || !this._pointsOwned) this.replacePointsBuffer(createBuffer(device, data, usage), true);
                    else try { queue.writeBuffer(this.pointsBuffer, 0, data.buffer, data.byteOffset, data.byteLength); } catch { this.replacePointsBuffer(createBuffer(device, data, usage), true); }
                    if (!this._keepCPUData) this._CPUData = null;
                    this._pointsDirty = false;
                    this.bindGroupKey = null;
                }
            }
        }
        if (!this._colorsExternal && this._colorsDirty) {
            const colors = this._colorsCPU;
            if (!colors) { this._colorsDirty = false; return; }
            const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
            if (!this.colorsBuffer || !this._colorsOwned) this.replaceColorsBuffer(createBuffer(device, colors, usage), true);
            else try { queue.writeBuffer(this.colorsBuffer, 0, colors.buffer, colors.byteOffset, colors.byteLength); } catch { this.replaceColorsBuffer(createBuffer(device, colors, usage), true); }
            if (!this._keepCPUData) this._colorsCPU = null;
            this._colorsDirty = false;
            this.bindGroupKey = null;
        }
    }

    getUniformBufferSize(): number {
        return UNIFORM_BYTE_SIZE;
    }

    getUniformData(): Float32Array {
        const out = new Float32Array(UNIFORM_FLOAT_COUNT);
        const base = Math.max(0, this._basePointSize);
        const minSize = Math.max(0, this._minPointSize);
        const maxSize = Math.max(minSize, this._maxPointSize);
        const atten = Math.max(0, this._sizeAttenuation);
        out[0] = base;
        out[1] = minSize;
        out[2] = maxSize;
        out[3] = atten;
        packScaleTransform(this._scaleTransform, out, 4);
        out[24] = clamp01(this._opacity);
        out[25] = clamp01(this._softness);
        out[26] = (typeof this._colormap === "string" && this._colormap === "custom") ? Math.min(8, Math.max(2, this._colormapStops.length)) : 0;
        out[27] = colorModeId(this._colorMode);
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

    private emitVisualChange(kind: PointCloudVisualChangeKind): void {
        for (const listener of this._visualChangeListeners) try { listener(kind); } catch { /* ignore */ }
    }

    private destroyOwnedBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (!buffer || !owned) return;
        buffer.destroy();
    }

    destroy(): void {
        this.destroyOwnedBuffer(this.pointsBuffer, this._pointsOwned);
        this.destroyOwnedBuffer(this.colorsBuffer, this._colorsOwned);
        this.uniformBuffer?.destroy();
        this.pointsBuffer = null;
        this.colorsBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this._CPUData = null;
        this._colorsCPU = null;
        this._ndShape = null;
        this._pointCount = 0;
        this._pointsOwned = false;
        this._colorsOwned = false;
        this._ownExternalBuffers = false;
        this._colorsExternal = false;
        this._visualChangeListeners.clear();
        this.transform.dispose();
    }
}

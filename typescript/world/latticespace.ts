/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp01, normalizeColorStops, resolveGPUBuffer } from "../utils";
import { Transform } from "../core/transform";
import { BlendMode, CullMode, type Color4 } from "../graphics/material";
import { Colormap, type BuiltinColormapName } from "../graphics/colormap";
import { cloneScaleTransform, normalizeScaleTransform, packScaleTransform, SCALE_UNIFORM_FLOAT_COUNT } from "../scaling";
import type { ScaleSourceDescriptor, ScaleStatsResult, ScaleTransform, ScaleTransformDescriptor } from "../scaling";
import { WasmMemoryView, assertWasmCapacity, assertWasmF32View, assertWasmU32View, growWasmCapacity } from "../wasm";
import { Bounds3, boundsFromBox, transformBounds } from "./bounds";

export type LatticeSpaceDimensions = [number, number] | [number, number, number];

export type LatticeSpaceIndex = [number, number] | [number, number, number];

export type LatticeSpaceColorMode = "scalar" | "rgba" | "solid";

export type LatticeSpaceColorSpace = "linear" | "srgb";

export type LatticeSpaceColormap = BuiltinColormapName | "custom";

export type LatticeSpaceVisualChangeKind = "scale" | "colormap" | "visual";

export type LatticeSpaceIndexRange = {
    min: LatticeSpaceIndex;
    max: LatticeSpaceIndex;
};

export type LatticeSpaceWasmRefreshOptions = {
    keepCPUData?: boolean;
};

export type LatticeSpaceWasmSourceOptions = LatticeSpaceWasmRefreshOptions & {
    capacity?: number;
};

export type LatticeSpaceDescriptor = {
    dimensions: LatticeSpaceDimensions;
    componentCount?: 1 | 2 | 3 | 4;
    data?: Float32Array;
    wasmData?: WasmMemoryView<Float32Array>;
    dataBuffer?: GPUBuffer | { buffer: GPUBuffer };
    mask?: Uint32Array;
    wasmMask?: WasmMemoryView<Uint32Array>;
    maskBuffer?: GPUBuffer | { buffer: GPUBuffer };
    wasmCapacity?: number;
    origin?: [number, number, number];
    spacing?: [number, number, number];
    cellScale?: number | [number, number, number];
    indexRange?: LatticeSpaceIndexRange;
    valueRange?: [number, number] | null;
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    opacity?: number;
    lit?: boolean;
    colorMode?: LatticeSpaceColorMode;
    colorSpace?: LatticeSpaceColorSpace;
    solidColor?: Color4;
    colormap?: LatticeSpaceColormap | Colormap;
    colormapStops?: Color4[];
    scaleTransform?: ScaleTransformDescriptor;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ownBuffers?: boolean;
};

const BASE_UNIFORM_FLOAT_COUNT = 10 * 4;
const UNIFORM_FLOAT_COUNT = BASE_UNIFORM_FLOAT_COUNT + SCALE_UNIFORM_FLOAT_COUNT + (8 * 4);
const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;
const DEFAULT_STOPS: Color4[] = [[0.26700, 0.00487, 0.32942, 1.0], [0.99325, 0.90616, 0.14394, 1.0]];

const colorModeId = (mode: LatticeSpaceColorMode): number => mode === "scalar" ? 0 : mode === "rgba" ? 1 : 2;
const colorSpaceId = (space: LatticeSpaceColorSpace): number => space === "srgb" ? 1 : 0;
const blendModeId = (mode: BlendMode): number => mode === BlendMode.Opaque ? 1 : mode === BlendMode.Transparent ? 2 : 3;
const cullModeId = (mode: CullMode): number => mode === CullMode.Back ? 1 : mode === CullMode.Front ? 2 : 3;

const revisionScratch = new ArrayBuffer(4);
const revisionF32 = new Float32Array(revisionScratch);
const revisionU32 = new Uint32Array(revisionScratch);
const mixRevision = (hash: number, value: number): number => Math.imul((hash ^ (value >>> 0)) >>> 0, 16777619) >>> 0;
const mixRevisionF32 = (hash: number, value: number): number => { revisionF32[0] = Number.isFinite(value) ? value : 0; return mixRevision(hash, revisionU32[0]); };

const normalizeDimensions = (dimensions: ReadonlyArray<number>): LatticeSpaceDimensions => { assert(dimensions.length === 2 || dimensions.length === 3, "LatticeSpace: dimensions must contain [x,y] or [x,y,z]."); const out = dimensions.map((value) => { assert(Number.isSafeInteger(value) && value > 0, "LatticeSpace: dimensions must contain positive safe integers."); return value; }); const count = out.reduce((product, value) => product * value, 1); assert(Number.isSafeInteger(count) && count <= 0xFFFFFFFF, "LatticeSpace: cellCount must fit in an unsigned 32-bit index."); return out as LatticeSpaceDimensions; };
const normalizeVec3 = (value: ReadonlyArray<number> | undefined, fallback: [number, number, number], label: string, positive: boolean = false): [number, number, number] => { const out: [number, number, number] = value ? [value[0], value[1], value[2]] : [fallback[0], fallback[1], fallback[2]]; for (const component of out) { assert(Number.isFinite(component), `LatticeSpace: ${label} must contain finite values.`); if (positive) assert(component > 0, `LatticeSpace: ${label} must contain positive values.`); } return out; };
const normalizeCellScale = (value: number | ReadonlyArray<number> | undefined): [number, number, number] => { const source = typeof value === "number" ? [value, value, value] : value; const out = normalizeVec3(source, [1, 1, 1], "cellScale", true); for (const component of out) assert(component <= 1, "LatticeSpace: cellScale components must be <= 1."); return out; };

export class LatticeSpace {
    readonly transform: Transform = new Transform();
    readonly dimensions: LatticeSpaceDimensions;
    readonly dimensionCount: 2 | 3;
    readonly cellCount: number;
    readonly componentCount: 1 | 2 | 3 | 4;
    name: string | null = null;
    visible: boolean = true;
    blendMode: BlendMode = BlendMode.Opaque;
    cullMode: CullMode = CullMode.Back;
    depthWrite: boolean = true;
    depthTest: boolean = true;
    dataBuffer: GPUBuffer | null = null;
    maskBuffer: GPUBuffer | null = null;
    uniformBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;
    bindGroupKey: string | null = null;
    private _origin: [number, number, number];
    private _spacing: [number, number, number];
    private _cellScale: [number, number, number];
    private _indexRange: LatticeSpaceIndexRange;
    private _valueRange: [number, number] | null = null;
    private _opacity: number = 1;
    private _lit: boolean = false;
    private _colorMode: LatticeSpaceColorMode = "scalar";
    private _colorSpace: LatticeSpaceColorSpace = "linear";
    private _solidColor: Color4 = [1, 1, 1, 1];
    private _colormap: LatticeSpaceColormap | Colormap = "viridis";
    private _colormapStops: Color4[] = DEFAULT_STOPS.map((stop) => [stop[0], stop[1], stop[2], stop[3]]);
    private _scaleTransform: ScaleTransform;
    private _dataCPU: Float32Array | null = null;
    private _maskCPU: Uint32Array | null = null;
    private _wasmDataSource: WasmMemoryView<Float32Array> | null = null;
    private _wasmMaskSource: WasmMemoryView<Uint32Array> | null = null;
    private _keepCPUData: boolean = false;
    private _dataDirty: boolean = false;
    private _maskDirty: boolean = false;
    private _uniformDirty: boolean = true;
    private _dataOwned: boolean = false;
    private _maskOwned: boolean = false;
    private _dataWasmManaged: boolean = false;
    private _maskWasmManaged: boolean = false;
    private _wasmDataCapacity: number = 0;
    private _wasmMaskCapacity: number = 0;
    private _wasmCapacityHint: number = 0;
    private _scaleRevision: number = 0;
    private _dataRevision: number = 0;
    private _maskRevision: number = 0;
    private readonly _visualChangeListeners: Set<(kind: LatticeSpaceVisualChangeKind) => void> = new Set();

    constructor(desc: LatticeSpaceDescriptor) {
        assert(!!desc, "LatticeSpace: descriptor is required.");
        this.dimensions = normalizeDimensions(desc.dimensions);
        this.dimensionCount = this.dimensions.length as 2 | 3;
        this.cellCount = this.dimensions.reduce((product, value) => product * value, 1);
        const componentCount = desc.componentCount ?? 1;
        assert(Number.isInteger(componentCount) && componentCount >= 1 && componentCount <= 4, "LatticeSpace: componentCount must be 1, 2, 3, or 4.");
        this.componentCount = componentCount as 1 | 2 | 3 | 4;
        this._origin = normalizeVec3(desc.origin, [0, 0, 0], "origin");
        this._spacing = normalizeVec3(desc.spacing, [1, 1, 1], "spacing", true);
        this._cellScale = normalizeCellScale(desc.cellScale);
        this._indexRange = this.normalizeIndexRange(desc.indexRange);
        this._scaleTransform = this.normalizeLatticeScaleTransform(desc.scaleTransform ?? {});
        this._wasmCapacityHint = assertWasmCapacity(desc.wasmCapacity, "LatticeSpace: wasmCapacity");
        if (desc.name !== undefined) this.name = desc.name;
        if (desc.visible !== undefined) this.visible = !!desc.visible;
        if (desc.blendMode !== undefined) this.blendMode = desc.blendMode;
        if (desc.cullMode !== undefined) this.cullMode = desc.cullMode;
        if (desc.depthWrite !== undefined) this.depthWrite = !!desc.depthWrite;
        if (desc.depthTest !== undefined) this.depthTest = !!desc.depthTest;
        if (desc.opacity !== undefined) this.opacity = desc.opacity;
        if (desc.lit !== undefined) this.lit = desc.lit;
        if (desc.colorMode !== undefined) this.colorMode = desc.colorMode;
        if (desc.colorSpace !== undefined) this.colorSpace = desc.colorSpace;
        if (desc.solidColor !== undefined) this.solidColor = desc.solidColor;
        if (desc.colormap !== undefined) this._colormap = desc.colormap;
        if (desc.colormapStops !== undefined) this._colormapStops = normalizeColorStops(desc.colormapStops);
        if (desc.valueRange !== undefined) this.valueRange = desc.valueRange;
        this._keepCPUData = !!desc.keepCPUData;
        const dataSources = Number(!!desc.data) + Number(!!desc.wasmData) + Number(!!desc.dataBuffer);
        const maskSources = Number(!!desc.mask) + Number(!!desc.wasmMask) + Number(!!desc.maskBuffer);
        assert(dataSources <= 1, "LatticeSpace: data, wasmData, and dataBuffer are mutually exclusive.");
        assert(maskSources <= 1, "LatticeSpace: mask, wasmMask, and maskBuffer are mutually exclusive.");
        if (this._colorMode === "rgba") assert(this.componentCount === 4, "LatticeSpace: rgba colorMode requires componentCount 4.");
        if (desc.data) this.setData(desc.data, { keepCPUData: this._keepCPUData });
        else if (desc.wasmData) this.setWasmData(desc.wasmData, { capacity: this._wasmCapacityHint, keepCPUData: this._keepCPUData });
        else if (desc.dataBuffer) this.setDataBuffer(resolveGPUBuffer(desc.dataBuffer), { ownBuffer: !!desc.ownBuffers });
        if (desc.mask) this.setMask(desc.mask, { keepCPUData: this._keepCPUData });
        else if (desc.wasmMask) this.setWasmMask(desc.wasmMask, { capacity: this._wasmCapacityHint, keepCPUData: this._keepCPUData });
        else if (desc.maskBuffer) this.setMaskBuffer(resolveGPUBuffer(desc.maskBuffer), { ownBuffer: !!desc.ownBuffers });
    }

    private normalizeLatticeScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): ScaleTransform {
        const normalized = normalizeScaleTransform({ componentCount: this.componentCount, componentIndex: 0, ...transform, stride: this.componentCount, offset: 0 });
        assert(normalized.componentCount <= this.componentCount, "LatticeSpace: scaleTransform componentCount cannot exceed the lattice componentCount.");
        assert(normalized.componentIndex < this.componentCount, "LatticeSpace: scaleTransform componentIndex must address a lattice component.");
        return normalized;
    }

    private normalizeIndex(index: ReadonlyArray<number>, label: string, allowEnd: boolean): LatticeSpaceIndex {
        assert(index.length === this.dimensionCount, `LatticeSpace: ${label} rank must match dimensions.`);
        const out = index.map((value, axis) => {
            assert(Number.isInteger(value), `LatticeSpace: ${label} must contain integers.`);
            const maximum = this.dimensions[axis];
            assert(value >= 0 && (allowEnd ? value <= maximum : value < maximum), `LatticeSpace: ${label} is outside dimensions.`);
            return value;
        });
        return out as LatticeSpaceIndex;
    }

    private normalizeIndexRange(range: LatticeSpaceIndexRange | undefined): LatticeSpaceIndexRange {
        if (!range) return { min: new Array(this.dimensionCount).fill(0) as LatticeSpaceIndex, max: [...this.dimensions] as LatticeSpaceIndex };
        const min = this.normalizeIndex(range.min, "indexRange.min", false);
        const max = this.normalizeIndex(range.max, "indexRange.max", true);
        for (let axis = 0; axis < this.dimensionCount; axis++) assert(max[axis] > min[axis], "LatticeSpace: indexRange.max must be greater than indexRange.min on every axis.");
        return { min, max };
    }

    private replaceDataBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.dataBuffer && this.dataBuffer !== buffer && this._dataOwned) this.dataBuffer.destroy();
        this.dataBuffer = buffer;
        this._dataOwned = !!buffer && owned;
        this.bindGroupKey = null;
    }

    private replaceMaskBuffer(buffer: GPUBuffer | null, owned: boolean): void {
        if (this.maskBuffer && this.maskBuffer !== buffer && this._maskOwned) this.maskBuffer.destroy();
        this.maskBuffer = buffer;
        this._maskOwned = !!buffer && owned;
        this.bindGroupKey = null;
    }

    private validateDataLength(length: number): void {
        assert(length === this.cellCount * this.componentCount, "LatticeSpace: data length must equal cellCount * componentCount.");
    }

    get origin(): [number, number, number] {
        return [...this._origin];
    }

    set origin(value: [number, number, number]) {
        this._origin = normalizeVec3(value, [0, 0, 0], "origin");
        this._uniformDirty = true;
    }

    get spacing(): [number, number, number] {
        return [...this._spacing];
    }
    
    set spacing(value: [number, number, number]) {
        this._spacing = normalizeVec3(value, [1, 1, 1], "spacing", true);
        this._uniformDirty = true;
    }
    
    get cellScale(): [number, number, number] {
        return [...this._cellScale];
    }
    
    set cellScale(value: number | [number, number, number]) {
        this._cellScale = normalizeCellScale(value);
        this._uniformDirty = true;
    }
    
    get indexRange(): LatticeSpaceIndexRange {
        return {
            min: [...this._indexRange.min] as LatticeSpaceIndex,
            max: [...this._indexRange.max] as LatticeSpaceIndex
        };
    }
    
    set indexRange(value: LatticeSpaceIndexRange) {
        this._indexRange = this.normalizeIndexRange(value);
        this._uniformDirty = true;
    }
    
    get valueRange(): [number, number] | null {
        return this._valueRange ? [...this._valueRange] : null;
    }
    
    set valueRange(value: [number, number] | null) {
        if (value) assert(Number.isFinite(value[0]) && Number.isFinite(value[1]) && value[1] >= value[0], "LatticeSpace: valueRange must be a finite ascending pair.");
        this._valueRange = value ? [value[0], value[1]] : null;
        this._uniformDirty = true;
    }
    
    get opacity(): number {
        return this._opacity;
    }
    
    set opacity(value: number) {
        assert(Number.isFinite(value), "LatticeSpace: opacity must be finite.");
        this._opacity = value;
        this._uniformDirty = true;
    }
    
    get lit(): boolean {
        return this._lit;
    }
    
    set lit(value: boolean) {
        this._lit = !!value;
        this._uniformDirty = true;
    }
    
    get colorMode(): LatticeSpaceColorMode {
        return this._colorMode;
    }
    
    set colorMode(value: LatticeSpaceColorMode) {
        assert(value === "scalar" || value === "rgba" || value === "solid", "LatticeSpace: invalid colorMode.");
        if (value === "rgba") assert(this.componentCount === 4, "LatticeSpace: rgba colorMode requires componentCount 4.");
        if (this._colorMode === value) return;
        this._colorMode = value;
        this._uniformDirty = true;
        this.emitVisualChange("visual");
    }
    
    get colorSpace(): LatticeSpaceColorSpace {
        return this._colorSpace;
    }
    
    set colorSpace(value: LatticeSpaceColorSpace) {
        assert(value === "linear" || value === "srgb", "LatticeSpace: invalid colorSpace.");
        this._colorSpace = value;
        this._uniformDirty = true;
    }
    
    get solidColor(): Color4 {
        return [...this._solidColor] as Color4;
    }
    
    set solidColor(value: Color4) {
        this._solidColor = [value[0], value[1], value[2], value[3]];
        this._uniformDirty = true;
    }
    
    get colormap(): LatticeSpaceColormap | Colormap {
        return this._colormap;
    }
    
    set colormap(value: LatticeSpaceColormap | Colormap) {
        this._colormap = value;
        this.bindGroupKey = null;
        this.emitVisualChange("colormap");
    }
    
    get colormapStops(): ReadonlyArray<Color4> {
        return this._colormapStops;
    }
    
    set colormapStops(value: ReadonlyArray<Color4>) {
        this._colormapStops = normalizeColorStops(value);
        this._uniformDirty = true;
        this.emitVisualChange("colormap");
    }
    
    get scaleTransform(): ScaleTransform {
        return cloneScaleTransform(this._scaleTransform);
    }
    
    get hasData(): boolean {
        return !!this.dataBuffer || !!this._dataCPU || !!this._wasmDataSource;
    }
    
    get hasMask(): boolean {
        return !!this.maskBuffer || !!this._maskCPU || !!this._wasmMaskSource;
    }
    
    get drawCellCount(): number {
        return this._indexRange.max.reduce((product, value, axis) => product * (value - this._indexRange.min[axis]), 1);
    }

    get occluderRevision(): number {
        let hash = 2166136261 >>> 0;
        hash = mixRevision(hash, this._dataRevision);
        hash = mixRevision(hash, this._maskRevision);
        hash = mixRevision(hash, blendModeId(this.blendMode));
        hash = mixRevision(hash, cullModeId(this.cullMode));
        hash = mixRevision(hash, this.depthWrite ? 1 : 0);
        hash = mixRevision(hash, this.depthTest ? 1 : 0);
        hash = mixRevision(hash, colorModeId(this._colorMode));
        hash = mixRevision(hash, this._valueRange ? 1 : 0);
        if (this._valueRange) for (const value of this._valueRange) hash = mixRevisionF32(hash, value);
        hash = mixRevision(hash, this._scaleTransform.valueMode === "magnitude" ? 1 : 0);
        hash = mixRevision(hash, this._scaleTransform.componentCount);
        hash = mixRevision(hash, this._scaleTransform.componentIndex);
        for (const value of [...this.dimensions, ...this._indexRange.min, ...this._indexRange.max]) hash = mixRevision(hash, value);
        for (const value of [...this._origin, ...this._spacing, ...this._cellScale]) hash = mixRevisionF32(hash, value);
        return hash >>> 0;
    }

    get sortRevision(): number {
        return this.occluderRevision;
    }

    setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void {
        this._scaleTransform = this.normalizeLatticeScaleTransform(transform);
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
        this.setScaleTransform(next);
    }
    
    onVisualChange(listener: (kind: LatticeSpaceVisualChangeKind) => void): () => void {
        this._visualChangeListeners.add(listener);
        return () => this._visualChangeListeners.delete(listener);
    }
    
    private emitVisualChange(kind: LatticeSpaceVisualChangeKind): void {
        for (const listener of this._visualChangeListeners) try { listener(kind); } catch { /* ignore */ }
    }
    
    getScaleSourceDescriptor(revision: number = this._scaleRevision): ScaleSourceDescriptor | null {
        if (!this.dataBuffer || this.cellCount <= 0 || this._colorMode === "solid") return null;
        return {
            buffer: this.dataBuffer,
            count: this.cellCount,
            componentCount: this._scaleTransform.componentCount,
            componentIndex: this._scaleTransform.componentIndex,
            valueMode: this._scaleTransform.valueMode,
            stride: this._scaleTransform.stride,
            offset: this._scaleTransform.offset,
            revision
        };
    }
    
    getColormapKey(): string {
        return this._colormap instanceof Colormap ? `cm:${this._colormap.id}` : `cm:${this._colormap}`;
    }
    
    getColormapForBinding(): Colormap {
        if (this._colormap instanceof Colormap) return this._colormap;
        return this._colormap === "custom" ? Colormap.builtin("grayscale") : Colormap.builtin(this._colormap);
    }

    mapLinearIndexToCell(index: number): LatticeSpaceIndex | null {
        if (!Number.isInteger(index) || index < 0 || index >= this.cellCount) return null;
        const width = this.dimensions[0];
        const height = this.dimensions[1];
        const x = index % width;
        const y = Math.floor(index / width) % height;
        return this.dimensionCount === 2 ? [x, y] : [x, y, Math.floor(index / (width * height))];
    }

    mapCellIndexToLinear(index: ReadonlyArray<number>): number {
        const cell = this.normalizeIndex(index, "cell index", false);
        return cell[0] + this.dimensions[0] * (cell[1] + (this.dimensionCount === 3 ? this.dimensions[1] * (cell[2] ?? 0) : 0));
    }

    getCellRecord(index: number): { index: LatticeSpaceIndex; center: [number, number, number]; values: number[]; scalar: number | null; color: Color4 | null; active: boolean } | null {
        const cell = this.mapLinearIndexToCell(index);
        if (!cell) return null;
        const values: number[] = [];
        if (this._dataCPU) for (let component = 0; component < this.componentCount; component++) values.push(this._dataCPU[index * this.componentCount + component]);
        const scalar = values.length ? (this._scaleTransform.valueMode === "magnitude" ? Math.hypot(...values.slice(0, this._scaleTransform.componentCount)) : values[Math.min(this.componentCount - 1, this._scaleTransform.componentIndex)]) : null;
        const color = this._colorMode === "rgba" && values.length === 4 ? [values[0], values[1], values[2], values[3]] as Color4 : null;
        return {
            index: cell,
            center: [this._origin[0] + cell[0] * this._spacing[0], this._origin[1] + cell[1] * this._spacing[1], this._origin[2] + (cell[2] ?? 0) * this._spacing[2]],
            values,
            scalar,
            color,
            active: this._maskCPU ? this._maskCPU[index] !== 0 : true
        };
    }

    setData(data: Float32Array, options: { keepCPUData?: boolean } = {}): void {
        this.validateDataLength(data.length);
        this._wasmDataSource = null;
        this._dataWasmManaged = false;
        this._wasmDataCapacity = 0;
        this._dataCPU = new Float32Array(data);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        this._dataDirty = true;
        this._dataRevision++;
        this._scaleRevision++;
        this.bindGroupKey = null;
    }
    
    updateData(data: Float32Array, startCell: number = 0): void {
        assert(Number.isInteger(startCell) && startCell >= 0, "LatticeSpace: startCell must be a non-negative integer.");
        assert((data.length % this.componentCount) === 0 && startCell + data.length / this.componentCount <= this.cellCount, "LatticeSpace: updateData range exceeds cell data.");
        assert(!!this._dataCPU, "LatticeSpace: updateData requires retained CPU data; use setData for replacement.");
        this._dataCPU.set(data, startCell * this.componentCount);
        this._dataDirty = true;
        this._dataRevision++;
        this._scaleRevision++;
    }
    
    setDataBuffer(buffer: GPUBuffer, options: { ownBuffer?: boolean } = {}): void {
        assert(buffer.size >= this.cellCount * this.componentCount * 4, "LatticeSpace: dataBuffer is too small.");
        this._wasmDataSource = null;
        this._dataCPU = null;
        this._dataDirty = false;
        this._dataWasmManaged = false;
        this._wasmDataCapacity = 0;
        this.replaceDataBuffer(buffer, !!options.ownBuffer);
        this._dataRevision++;
        this._scaleRevision++;
    }
    
    markDataDirty(): void {
        assert(!!this.dataBuffer, "LatticeSpace: markDataDirty requires a dataBuffer.");
        this._dataRevision++;
        this._scaleRevision++;
    }

    setMask(mask: Uint32Array, options: { keepCPUData?: boolean } = {}): void {
        assert(mask.length === this.cellCount, "LatticeSpace: mask length must equal cellCount.");
        this._wasmMaskSource = null;
        this._maskWasmManaged = false;
        this._wasmMaskCapacity = 0;
        this._maskCPU = new Uint32Array(mask);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        this._maskDirty = true;
        this._maskRevision++;
        this.bindGroupKey = null;
    }
    
    updateMask(mask: Uint32Array, startCell: number = 0): void {
        assert(Number.isInteger(startCell) && startCell >= 0 && startCell + mask.length <= this.cellCount, "LatticeSpace: updateMask range exceeds cell data.");
        assert(!!this._maskCPU, "LatticeSpace: updateMask requires retained CPU mask data; use setMask for replacement.");
        this._maskCPU.set(mask, startCell);
        this._maskDirty = true;
        this._maskRevision++;
    }
    
    setMaskBuffer(buffer: GPUBuffer | null, options: { ownBuffer?: boolean } = {}): void {
        if (buffer) assert(buffer.size >= this.cellCount * 4, "LatticeSpace: maskBuffer is too small.");
        this._wasmMaskSource = null;
        this._maskCPU = null;
        this._maskDirty = false;
        this._maskWasmManaged = false;
        this._wasmMaskCapacity = 0;
        this.replaceMaskBuffer(buffer, !!buffer && !!options.ownBuffer);
        this._maskRevision++;
    }
    
    markMaskDirty(): void {
        assert(!!this.maskBuffer, "LatticeSpace: markMaskDirty requires a maskBuffer.");
        this._maskRevision++;
    }

    setWasmData(source: WasmMemoryView<Float32Array> | null, options: LatticeSpaceWasmSourceOptions = {}): void {
        if (!source) { this._wasmDataSource = null; return; }
        this._wasmDataSource = assertWasmF32View(source, "LatticeSpace: wasmData");
        this._wasmCapacityHint = assertWasmCapacity(options.capacity, "LatticeSpace: wasmData capacity");
        this._dataCPU = null;
        this.refreshWasmData(options);
    }
    
    setWasmMask(source: WasmMemoryView<Uint32Array> | null, options: LatticeSpaceWasmSourceOptions = {}): void {
        if (!source) { this._wasmMaskSource = null; return; }
        this._wasmMaskSource = assertWasmU32View(source, "LatticeSpace: wasmMask");
        this._wasmCapacityHint = assertWasmCapacity(options.capacity, "LatticeSpace: wasmMask capacity");
        this._maskCPU = null;
        this.refreshWasmMask(options);
    }
    
    refreshWasmData(options: LatticeSpaceWasmRefreshOptions = {}): void {
        const source = this._wasmDataSource;
        if (!source) return;
        source.refresh();
        assertWasmF32View(source, "LatticeSpace: wasmData");
        this.validateDataLength(source.length);
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        this._dataCPU = this._keepCPUData ? new Float32Array(source.array()) : null;
        this._dataDirty = true;
        this._dataRevision++;
        this._scaleRevision++;
    }
    
    refreshWasmMask(options: LatticeSpaceWasmRefreshOptions = {}): void {
        const source = this._wasmMaskSource;
        if (!source) return;
        source.refresh();
        assertWasmU32View(source, "LatticeSpace: wasmMask");
        assert(source.length === this.cellCount, "LatticeSpace: wasmMask length must equal cellCount.");
        this._keepCPUData = options.keepCPUData ?? this._keepCPUData;
        this._maskCPU = this._keepCPUData ? new Uint32Array(source.array()) : null;
        this._maskDirty = true;
        this._maskRevision++;
    }
    
    refreshFromWasm(options: LatticeSpaceWasmRefreshOptions = {}): void {
        this.refreshWasmData(options);
        this.refreshWasmMask(options);
    }
    
    clearWasmSources(): void {
        this._wasmDataSource = null;
        this._wasmMaskSource = null;
    }
    
    dropCPUData(): void {
        this._dataCPU = null;
        this._maskCPU = null;
    }

    getLocalBounds(): Bounds3 {
        const min = this._indexRange.min;
        const max = this._indexRange.max;
        const half = [this._spacing[0] * this._cellScale[0] * 0.5, this._spacing[1] * this._cellScale[1] * 0.5, this.dimensionCount === 3 ? this._spacing[2] * this._cellScale[2] * 0.5 : 0];
        return boundsFromBox(
            [
                this._origin[0] + min[0] * this._spacing[0] - half[0],
                this._origin[1] + min[1] * this._spacing[1] - half[1],
                this._origin[2] + (min[2] ?? 0) * this._spacing[2] - half[2]
            ],
            [
                this._origin[0] + (max[0] - 1) * this._spacing[0] + half[0],
                this._origin[1] + (max[1] - 1) * this._spacing[1] + half[1],
                this._origin[2] + ((max[2] ?? 1) - 1) * this._spacing[2] + half[2]
            ]
        );
    }
    
    getWorldBounds(): Bounds3 {
        return transformBounds(this.getLocalBounds(), this.transform.worldMatrix);
    }
    
    getBounds(): Bounds3 {
        return this.getWorldBounds();
    }

    private ensureManagedDataBuffer(device: GPUDevice): void {
        const capacity = growWasmCapacity(Math.max(this.cellCount, this._wasmCapacityHint), this._wasmDataCapacity);
        if (this.dataBuffer && this._dataWasmManaged && this._wasmDataCapacity >= capacity) return;
        this.replaceDataBuffer(device.createBuffer({
            label: "LatticeSpace.data",
            size: capacity * this.componentCount * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }), true);
        this._dataWasmManaged = true;
        this._wasmDataCapacity = capacity;
    }
    
    private ensureManagedMaskBuffer(device: GPUDevice): void {
        const capacity = growWasmCapacity(Math.max(this.cellCount, this._wasmCapacityHint), this._wasmMaskCapacity);
        if (this.maskBuffer && this._maskWasmManaged && this._wasmMaskCapacity >= capacity) return;
        this.replaceMaskBuffer(device.createBuffer({
            label: "LatticeSpace.mask",
            size: capacity * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }), true);
        this._maskWasmManaged = true;
        this._wasmMaskCapacity = capacity;
    }
    
    upload(device: GPUDevice, queue: GPUQueue): void {
        if (this._dataDirty) {
            const source = this._wasmDataSource ? (this._wasmDataSource.refresh(), this._wasmDataSource.array()) : this._dataCPU;
            if (source) {
                this.validateDataLength(source.length);
                this.ensureManagedDataBuffer(device);
                queue.writeBuffer(this.dataBuffer!, 0, source.buffer, source.byteOffset, source.byteLength);
                if (!this._keepCPUData) this._dataCPU = null;
            }
            this._dataDirty = false;
        }
        if (this._maskDirty) {
            const source = this._wasmMaskSource ? (this._wasmMaskSource.refresh(), this._wasmMaskSource.array()) : this._maskCPU;
            if (source) {
                assert(source.length === this.cellCount, "LatticeSpace: mask length must equal cellCount.");
                this.ensureManagedMaskBuffer(device);
                queue.writeBuffer(this.maskBuffer!, 0, source.buffer, source.byteOffset, source.byteLength);
                if (!this._keepCPUData) this._maskCPU = null;
            }
            this._maskDirty = false;
        }
    }

    getUniformBufferSize(): number {
        return UNIFORM_BYTE_SIZE;
    }
    
    getUniformData(): Float32Array {
        const out = new Float32Array(UNIFORM_FLOAT_COUNT);
        const dims = this.dimensions;
        const min = this._indexRange.min;
        const max = this._indexRange.max;
        out.set([dims[0], dims[1], dims[2] ?? 1, this.dimensionCount], 0);
        out.set([...this._origin, 0], 4);
        out.set([...this._spacing, 0], 8);
        out.set([...this._cellScale, 0], 12);
        out.set([min[0], min[1], min[2] ?? 0, 0], 16);
        out.set([max[0], max[1], max[2] ?? 1, 0], 20);
        out.set([this.componentCount, colorModeId(this._colorMode), colorSpaceId(this._colorSpace), this.hasMask ? 1 : 0], 24);
        out.set([clamp01(this._opacity), this._lit ? 1 : 0, this._valueRange ? this._valueRange[0] : 0, this._valueRange ? this._valueRange[1] : 0], 28);
        out.set([this._valueRange ? 1 : 0, this._colormap === "custom" ? Math.min(8, Math.max(2, this._colormapStops.length)) : 0, this.dimensionCount === 3 ? 1 : 0, 0], 32);
        out.set(this._solidColor, 36);
        packScaleTransform(this._scaleTransform, out, BASE_UNIFORM_FLOAT_COUNT);
        const stopsOffset = BASE_UNIFORM_FLOAT_COUNT + SCALE_UNIFORM_FLOAT_COUNT;
        const count = Math.min(8, Math.max(2, this._colormapStops.length));
        for (let i = 0; i < 8; i++) out.set(this._colormapStops[Math.min(i, count - 1)], stopsOffset + i * 4);
        return out;
    }
    
    get dirtyUniforms(): boolean {
        return this._uniformDirty;
    }
    
    markUniformsClean(): void {
        this._uniformDirty = false;
    }

    destroy(): void {
        if (this.dataBuffer && this._dataOwned) this.dataBuffer.destroy();
        if (this.maskBuffer && this._maskOwned) this.maskBuffer.destroy();
        this.uniformBuffer?.destroy();
        this.dataBuffer = null;
        this.maskBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this._dataCPU = null;
        this._maskCPU = null;
        this._wasmDataSource = null;
        this._wasmMaskSource = null;
        this._visualChangeListeners.clear();
        this.transform.dispose();
    }
}

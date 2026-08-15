/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp, isGPUBuffer } from "../utils";
import type { Compute } from "../compute";
import { normalizeScaleTransform } from "./transform";
import type { ScaleBufferSource, ScaleSourceDescriptor, ScaleStatsRequest, ScaleStatsResult, ScaleTransform, ScaleTransformDescriptor, ScaleValueMode } from "./types";

type NormalizedScaleSource = {
    buffer: ScaleBufferSource;
    count: number;
    componentCount: number;
    componentIndex: number;
    valueMode: ScaleValueMode;
    stride: number;
    offset: number;
    revision: number;
};

type CacheEntry = {
    promise: Promise<ScaleStatsResult>;
};

const unwrapSourceBuffer = (source: ScaleBufferSource): GPUBuffer => {
    return isGPUBuffer(source) ? source : source.buffer;
};

const resolveByteLength = (source: ScaleBufferSource): number | null => {
    if (isGPUBuffer(source)) return Number(source.size);
    return (typeof source.byteLength === "number") ? source.byteLength : null;
};

const percentileFromHistogram = (bins: Uint32Array, percentile: number, minValue: number, maxValue: number, total: number): number => {
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return Number.NaN;
    if (total <= 0) return Number.NaN;
    if (maxValue <= minValue) return minValue;
    const p = clamp(percentile, 0, 100);
    const target = (p / 100) * Math.max(0, total - 1);
    const binWidth = (maxValue - minValue) / bins.length;
    let cumulative = 0;
    for (let i = 0; i < bins.length; i++) {
        const c = bins[i] >>> 0;
        const next = cumulative + c;
        if (target < next) {
            const left = minValue + (i * binWidth);
            if (c === 0) return left;
            const frac = (target - cumulative) / c;
            return left + clamp(frac, 0, 1) * binWidth;
        }
        cumulative = next;
    }
    return maxValue;
};

const normalizeSource = (source: ScaleSourceDescriptor): NormalizedScaleSource => {
    assert(Number.isInteger(source.count) && source.count >= 0, `Scale stats source.count must be an integer >= 0 (got ${source.count})`);
    const componentCountRaw = (typeof source.componentCount === "number" && Number.isInteger(source.componentCount)) ? source.componentCount : 1;
    const componentCount = clamp(componentCountRaw, 1, 4);
    const componentIndexRaw = (typeof source.componentIndex === "number" && Number.isInteger(source.componentIndex)) ? source.componentIndex : 0;
    const componentIndex = clamp(componentIndexRaw, 0, 3);
    const strideRaw = (typeof source.stride === "number" && Number.isInteger(source.stride)) ? source.stride : componentCount;
    const stride = Math.max(componentCount, strideRaw);
    const offsetRaw = (typeof source.offset === "number" && Number.isInteger(source.offset)) ? source.offset : 0;
    const offset = Math.max(0, offsetRaw);
    const revisionRaw = (typeof source.revision === "number" && Number.isInteger(source.revision)) ? source.revision : 0;
    const revision = Math.max(0, revisionRaw);
    const valueMode = source.valueMode ?? "component";
    assert(valueMode === "component" || valueMode === "magnitude", `Invalid scale value mode: ${String(valueMode)}`);
    const byteLength = resolveByteLength(source.buffer);
    if (byteLength !== null) {
        const capacity = Math.floor(byteLength / 4);
        const required = source.count > 0 ? (offset + ((source.count - 1) * stride) + componentCount) : 0;
        assert(required <= capacity, `Scale stats source range exceeds source buffer capacity (required ${required} f32, capacity ${capacity} f32)`);
    }
    return {
        buffer: source.buffer,
        count: source.count,
        componentCount,
        componentIndex,
        valueMode,
        stride,
        offset,
        revision
    };
};

export class ScaleService {
    private readonly compute: Compute;
    private readonly sourceIds: WeakMap<object, number> = new WeakMap();
    private readonly cache: Map<string, CacheEntry> = new Map();
    private readonly sourceCacheKeys: Map<number, Set<string>> = new Map();
    private nextSourceId: number = 1;

    constructor(compute: Compute) {
        this.compute = compute;
    }

    createTransform(descriptor: ScaleTransformDescriptor): ScaleTransform {
        return normalizeScaleTransform(descriptor);
    }

    invalidate(sourceOrDescriptor: ScaleBufferSource | ScaleSourceDescriptor): void {
        const source = (sourceOrDescriptor as ScaleSourceDescriptor).buffer ? (sourceOrDescriptor as ScaleSourceDescriptor).buffer : (sourceOrDescriptor as ScaleBufferSource);
        const keyObj = unwrapSourceBuffer(source) as unknown as object;
        const sourceId = this.sourceIds.get(keyObj);
        if (sourceId === undefined) return;
        const keys = this.sourceCacheKeys.get(sourceId);
        if (!keys) return;
        for (const key of keys) this.cache.delete(key);
        this.sourceCacheKeys.delete(sourceId);
    }

    clearCache(): void {
        this.cache.clear();
        this.sourceCacheKeys.clear();
    }

    requestStats(request: ScaleStatsRequest): Promise<ScaleStatsResult> {
        const source = normalizeSource(request.source);
        const low = clamp(request.percentiles?.low ?? 2, 0, 100);
        const high = clamp(request.percentiles?.high ?? 98, 0, 100);
        assert(high > low, `Scale stats requires percentile.high > percentile.low (got ${low}, ${high})`);
        const binsRaw = request.percentiles?.bins ?? 2048;
        const bins = Math.max(2, Math.floor(Number.isFinite(binsRaw) ? binsRaw : 2048));
        const sourceId = this.getSourceId(unwrapSourceBuffer(source.buffer) as unknown as object);
        const key = [
            sourceId,
            source.revision,
            source.count,
            source.componentCount,
            source.componentIndex,
            source.valueMode,
            source.stride,
            source.offset,
            request.percentiles ? 1 : 0,
            low,
            high,
            bins
        ].join("|");
        const existing = this.cache.get(key);
        if (existing) return existing.promise;
        const job = this.computeStats(source, request.percentiles ? { low, high, bins } : null).catch((error) => {
            this.cache.delete(key);
            const sourceKeys = this.sourceCacheKeys.get(sourceId);
            sourceKeys?.delete(key);
            if (sourceKeys && sourceKeys.size === 0) this.sourceCacheKeys.delete(sourceId);
            throw error;
        });
        this.cache.set(key, { promise: job });
        let set = this.sourceCacheKeys.get(sourceId);
        if (!set) {
            set = new Set<string>();
            this.sourceCacheKeys.set(sourceId, set);
        }
        set.add(key);
        return job;
    }

    private getSourceId(obj: object): number {
        const existing = this.sourceIds.get(obj);
        if (existing !== undefined) return existing;
        const id = this.nextSourceId++;
        this.sourceIds.set(obj, id);
        return id;
    }

    private async computeStats(source: NormalizedScaleSource, percentile: { low: number; high: number; bins: number } | null): Promise<ScaleStatsResult> {
        const sourceBuffer = unwrapSourceBuffer(source.buffer);
        const extracted = this.compute.kernels.extractScaleValuesF32(sourceBuffer, {
            count: source.count,
            componentCount: source.componentCount,
            componentIndex: source.componentIndex,
            valueMode: source.valueMode,
            stride: source.stride,
            offset: source.offset
        });
        const compact = this.compute.kernels.compactF32(extracted.values, extracted.flags, { count: source.count });
        const finiteCount = await this.compute.readback.readScalarU32(compact.count);
        if (finiteCount === 0) {
            extracted.values.destroy();
            extracted.flags.destroy();
            compact.output.destroy();
            compact.count.destroy();
            return {
                count: source.count,
                finiteCount: 0,
                min: Number.NaN,
                max: Number.NaN,
                percentileMin: null,
                percentileMax: null,
                histogramBins: null
            };
        }
        const minBuffer = this.compute.kernels.minF32(compact.output, { count: finiteCount });
        const maxBuffer = this.compute.kernels.maxF32(compact.output, { count: finiteCount });
        const min = await this.compute.readback.readScalarF32(minBuffer);
        const max = await this.compute.readback.readScalarF32(maxBuffer);
        let percentileMin: number | null = null;
        let percentileMax: number | null = null;
        let histogramBins: number | null = null;
        if (percentile) {
            const hist = this.compute.kernels.histogramF32(compact.output, percentile.bins, {
                count: finiteCount,
                minValue: min,
                maxValue: max,
                clear: true
            });
            const binsData = await this.compute.readback.readAs(Uint32Array, hist);
            percentileMin = percentileFromHistogram(binsData, percentile.low, min, max, finiteCount);
            percentileMax = percentileFromHistogram(binsData, percentile.high, min, max, finiteCount);
            histogramBins = percentile.bins;
            hist.destroy();
        }
        extracted.values.destroy();
        extracted.flags.destroy();
        compact.output.destroy();
        compact.count.destroy();
        minBuffer.destroy();
        maxBuffer.destroy();
        return {
            count: source.count,
            finiteCount,
            min,
            max,
            percentileMin,
            percentileMax,
            histogramBins
        };
    }
}

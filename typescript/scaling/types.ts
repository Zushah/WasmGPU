/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type ScaleMode = "linear" | "log" | "symlog";

export type ScaleClampMode = "none" | "range" | "percentile";

export type ScaleValueMode = "component" | "magnitude";

export type ScaleTransformDescriptor = {
    mode?: ScaleMode;
    clampMode?: ScaleClampMode;
    valueMode?: ScaleValueMode;
    componentCount?: number;
    componentIndex?: number;
    stride?: number;
    offset?: number;
    domainMin?: number;
    domainMax?: number;
    clampMin?: number;
    clampMax?: number;
    percentileLow?: number;
    percentileHigh?: number;
    logBase?: number;
    symlogLinThresh?: number;
    gamma?: number;
    invert?: boolean;
};

export type ScaleTransform = {
    mode: ScaleMode;
    clampMode: ScaleClampMode;
    valueMode: ScaleValueMode;
    componentCount: number;
    componentIndex: number;
    stride: number;
    offset: number;
    domainMin: number;
    domainMax: number;
    clampMin: number;
    clampMax: number;
    percentileLow: number;
    percentileHigh: number;
    logBase: number;
    symlogLinThresh: number;
    gamma: number;
    invert: boolean;
};

export type ScaleBufferSource = GPUBuffer | { buffer: GPUBuffer; byteLength?: number };

export type ScaleSourceDescriptor = {
    buffer: ScaleBufferSource;
    count: number;
    componentCount?: number;
    componentIndex?: number;
    valueMode?: ScaleValueMode;
    stride?: number;
    offset?: number;
    revision?: number;
};

export type ScaleStatsRequest = {
    source: ScaleSourceDescriptor;
    percentiles?: {
        low?: number;
        high?: number;
        bins?: number;
    } | null;
};

export type ScaleStatsResult = {
    count: number;
    finiteCount: number;
    min: number;
    max: number;
    percentileMin: number | null;
    percentileMax: number | null;
    histogramBins: number | null;
};

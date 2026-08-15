/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp, clamp01, finiteOr, intOr } from "../utils";
import type { ScaleClampMode, ScaleMode, ScaleTransform, ScaleTransformDescriptor, ScaleValueMode } from "./types";

export const SCALE_UNIFORM_FLOAT_COUNT = 20;

const modeToIdMap: Record<ScaleMode, number> = {
    linear: 0,
    log: 1,
    symlog: 2
};

const clampModeToIdMap: Record<ScaleClampMode, number> = {
    none: 0,
    range: 1,
    percentile: 2
};

const valueModeToIdMap: Record<ScaleValueMode, number> = {
    component: 0,
    magnitude: 1
};

export const scaleModeToId = (mode: ScaleMode): number => modeToIdMap[mode];
export const scaleClampModeToId = (mode: ScaleClampMode): number => clampModeToIdMap[mode];
export const scaleValueModeToId = (mode: ScaleValueMode): number => valueModeToIdMap[mode];

export const cloneScaleTransform = (transform: ScaleTransform): ScaleTransform => {
    return {
        mode: transform.mode, clampMode: transform.clampMode, valueMode: transform.valueMode,
        componentCount: transform.componentCount, componentIndex: transform.componentIndex,
        stride: transform.stride, offset: transform.offset,
        domainMin: transform.domainMin, domainMax: transform.domainMax,
        clampMin: transform.clampMin, clampMax: transform.clampMax,
        percentileLow: transform.percentileLow, percentileHigh: transform.percentileHigh,
        logBase: transform.logBase, symlogLinThresh: transform.symlogLinThresh,
        gamma: transform.gamma, invert: transform.invert
    };
};

export const defaultScaleTransform = (): ScaleTransform => {
    return {
        mode: "linear", clampMode: "none", valueMode: "component",
        componentCount: 1, componentIndex: 0,
        stride: 1, offset: 0,
        domainMin: 0, domainMax: 1,
        clampMin: 0, clampMax: 1,
        percentileLow: 2, percentileHigh: 98,
        logBase: 10, symlogLinThresh: 1,
        gamma: 1, invert: false
    };
};

export const normalizeScaleTransform = (descriptor: ScaleTransformDescriptor | ScaleTransform): ScaleTransform => {
    const defaults = defaultScaleTransform();
    const mode = descriptor.mode ?? defaults.mode;
    const clampMode = descriptor.clampMode ?? defaults.clampMode;
    const valueMode = descriptor.valueMode ?? defaults.valueMode;
    assert(mode === "linear" || mode === "log" || mode === "symlog", `Invalid scale mode: ${String(mode)}`);
    assert(clampMode === "none" || clampMode === "range" || clampMode === "percentile", `Invalid scale clamp mode: ${String(clampMode)}`);
    assert(valueMode === "component" || valueMode === "magnitude", `Invalid scale value mode: ${String(valueMode)}`);
    const componentCount = clamp(intOr(descriptor.componentCount, defaults.componentCount), 1, 4);
    const componentIndex = clamp(intOr(descriptor.componentIndex, defaults.componentIndex), 0, 3);
    const stride = Math.max(componentCount, intOr(descriptor.stride, defaults.stride));
    const offset = Math.max(0, intOr(descriptor.offset, defaults.offset));
    const domainMin = finiteOr(descriptor.domainMin, defaults.domainMin);
    const domainMax = finiteOr(descriptor.domainMax, defaults.domainMax);
    const clampMin = finiteOr(descriptor.clampMin, defaults.clampMin);
    const clampMax = finiteOr(descriptor.clampMax, defaults.clampMax);
    const percentileLow = clamp(finiteOr(descriptor.percentileLow, defaults.percentileLow), 0, 100);
    const percentileHigh = clamp(finiteOr(descriptor.percentileHigh, defaults.percentileHigh), 0, 100);
    assert(percentileHigh > percentileLow, `Scale transform requires percentileHigh > percentileLow (got ${percentileLow}, ${percentileHigh})`);
    const logBase = Math.max(1.000001, finiteOr(descriptor.logBase, defaults.logBase));
    const symlogLinThresh = Math.max(1e-20, finiteOr(descriptor.symlogLinThresh, defaults.symlogLinThresh));
    const gamma = Math.max(1e-6, finiteOr(descriptor.gamma, defaults.gamma));
    const invert = !!descriptor.invert;
    return { mode, clampMode, valueMode, componentCount, componentIndex, stride, offset, domainMin, domainMax, clampMin, clampMax, percentileLow, percentileHigh, logBase, symlogLinThresh, gamma, invert };
};

export const packScaleTransform = (transformIn: ScaleTransform, out: Float32Array, offset: number = 0): void => {
    const transform = normalizeScaleTransform(transformIn);
    out[offset + 0] = transform.componentCount;
    out[offset + 1] = transform.componentIndex;
    out[offset + 2] = scaleValueModeToId(transform.valueMode);
    out[offset + 3] = transform.stride;
    out[offset + 4] = transform.domainMin;
    out[offset + 5] = transform.domainMax;
    out[offset + 6] = transform.offset;
    out[offset + 7] = scaleClampModeToId(transform.clampMode);
    out[offset + 8] = transform.clampMin;
    out[offset + 9] = transform.clampMax;
    out[offset + 10] = transform.percentileLow;
    out[offset + 11] = transform.percentileHigh;
    out[offset + 12] = scaleModeToId(transform.mode);
    out[offset + 13] = transform.logBase;
    out[offset + 14] = transform.symlogLinThresh;
    out[offset + 15] = transform.gamma;
    out[offset + 16] = transform.invert ? 1 : 0;
    out[offset + 17] = 0;
    out[offset + 18] = 0;
    out[offset + 19] = 0;
};

const logBase = (x: number, base: number): number => {
    const b = Math.max(1.000001, base);
    return Math.log(x) / Math.log(b);
};

const applyScaleMode = (x: number, mode: ScaleMode, symlogLinThresh: number, base: number): number => {
    if (mode === "linear") return x;
    if (mode === "log") return logBase(Math.max(x, 1e-20), base);
    const lt = Math.max(symlogLinThresh, 1e-20);
    const sign = x >= 0 ? 1 : -1;
    const y = logBase(1 + (Math.abs(x) / lt), base);
    return sign * y;
};

const invertScaleMode = (x: number, mode: ScaleMode, symlogLinThresh: number, base: number): number => {
    if (mode === "linear") return x;
    if (mode === "log") return Math.pow(Math.max(base, 1.000001), x);
    const lt = Math.max(symlogLinThresh, 1e-20);
    const sign = x >= 0 ? 1 : -1;
    const y = Math.pow(Math.max(base, 1.000001), Math.abs(x)) - 1.0;
    return sign * (y * lt);
};

const resolveScaleDomain = (transform: ScaleTransform): { domainMin: number; domainMax: number; clampMin: number; clampMax: number; hasClamp: boolean; } => {
    const hasClamp = transform.clampMode !== "none" && transform.clampMax > transform.clampMin;
    let domainMin = transform.domainMin;
    let domainMax = transform.domainMax;
    if (domainMax <= domainMin && hasClamp) {
        domainMin = transform.clampMin;
        domainMax = transform.clampMax;
    }
    return { domainMin, domainMax, clampMin: transform.clampMin, clampMax: transform.clampMax, hasClamp };
};

export const resolveScaleTransformDomainCPU = (transformIn: ScaleTransform): { domainMin: number; domainMax: number; clampMin: number; clampMax: number; hasClamp: boolean; } => {
    return resolveScaleDomain(normalizeScaleTransform(transformIn));
};

export const applyScaleTransformCPU = (value: number, transformIn: ScaleTransform): number => {
    const transform = normalizeScaleTransform(transformIn);
    if (!Number.isFinite(value)) return Number.NaN;
    let v = value;
    const domain = resolveScaleDomain(transform);
    if (domain.hasClamp) v = clamp(v, domain.clampMin, domain.clampMax);
    const d0 = domain.domainMin;
    const d1 = domain.domainMax;
    const a = applyScaleMode(d0, transform.mode, transform.symlogLinThresh, transform.logBase);
    const b = applyScaleMode(d1, transform.mode, transform.symlogLinThresh, transform.logBase);
    const x = applyScaleMode(v, transform.mode, transform.symlogLinThresh, transform.logBase);
    const denom = Math.max(1e-20, b - a);
    let t = clamp01((x - a) / denom);
    t = Math.pow(t, transform.gamma);
    if (transform.invert) t = 1 - t;
    return clamp01(t);
};

export const invertScaleTransformCPU = (tIn: number, transformIn: ScaleTransform): number => {
    const transform = normalizeScaleTransform(transformIn);
    const domain = resolveScaleDomain(transform);
    let t = clamp01(tIn);
    if (transform.invert) t = 1.0 - t;
    t = Math.pow(t, 1.0 / Math.max(transform.gamma, 1e-6));
    const a = applyScaleMode(domain.domainMin, transform.mode, transform.symlogLinThresh, transform.logBase);
    const b = applyScaleMode(domain.domainMax, transform.mode, transform.symlogLinThresh, transform.logBase);
    const x = a + (b - a) * t;
    let v = invertScaleMode(x, transform.mode, transform.symlogLinThresh, transform.logBase);
    if (domain.hasClamp) v = clamp(v, domain.clampMin, domain.clampMax);
    return v;
};

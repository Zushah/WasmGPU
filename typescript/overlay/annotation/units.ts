/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { clampInt } from "../../utils";
import { AnnotationAngleUnit, type AnnotationUnitsDescriptor } from "./types";

type MetricPrefix = {
    exponent: number;
    symbol: string;
    factor: number;
};

const METRIC_PREFIXES: MetricPrefix[] = [
    { exponent: -12, symbol: "p", factor: 1e-12 },
    { exponent: -9, symbol: "n", factor: 1e-9 },
    { exponent: -6, symbol: "u", factor: 1e-6 },
    { exponent: -3, symbol: "m", factor: 1e-3 },
    { exponent: 0, symbol: "", factor: 1 },
    { exponent: 3, symbol: "k", factor: 1e3 },
    { exponent: 6, symbol: "M", factor: 1e6 },
    { exponent: 9, symbol: "G", factor: 1e9 },
    { exponent: 12, symbol: "T", factor: 1e12 }
];

export type ResolvedAnnotationUnits = {
    worldUnitsPerUnit: number;
    symbol: string;
    decimals: number;
    autoMetric: boolean;
    angleUnit: "deg" | "rad";
    angleDecimals: number;
};

export type AnnotationDistanceFormatResult = {
    worldDistance: number;
    value: number;
    unitSymbol: string;
    text: string;
};

export type AnnotationAngleFormatResult = {
    radians: number;
    value: number;
    unitSymbol: string;
    text: string;
};

const trimFixed = (text: string): string => {
    if (!text.includes(".")) return text;
    return text.replace(/(\.\d*?[1-9])0+$/g, "$1").replace(/\.0+$/g, "");
};

export const formatFiniteNumber = (value: number, decimals: number): string => {
    if (!Number.isFinite(value)) return "nan";
    const abs = Math.abs(value);
    const digits = clampInt(decimals, 0, 12);
    if (abs >= 1e7 || (abs > 0 && abs < 1e-5)) return value.toExponential(Math.max(1, Math.min(6, digits)));
    return trimFixed(value.toFixed(digits));
};

export const resolveAnnotationUnits = (desc: AnnotationUnitsDescriptor = {}): ResolvedAnnotationUnits => {
    const worldUnitsPerUnit = Number.isFinite(desc.worldUnitsPerUnit) && (desc.worldUnitsPerUnit as number) > 0 ? (desc.worldUnitsPerUnit as number) : 1;
    const symbol = typeof desc.symbol === "string" ? desc.symbol : "wu";
    const decimals = clampInt(desc.decimals ?? 3, 0, 12);
    const autoMetric = !!desc.autoMetric;
    const angleUnit = desc.angleUnit ?? AnnotationAngleUnit.Degrees;
    const angleDecimals = clampInt(desc.angleDecimals ?? 2, 0, 12);
    return { worldUnitsPerUnit, symbol, decimals, autoMetric, angleUnit, angleDecimals };
};

const pickMetricPrefix = (value: number): MetricPrefix => {
    const abs = Math.abs(value);
    if (!Number.isFinite(abs) || abs <= 0) return METRIC_PREFIXES[4];
    const exponent = clampInt(Math.floor(Math.log10(abs) / 3) * 3, METRIC_PREFIXES[0].exponent, METRIC_PREFIXES[METRIC_PREFIXES.length - 1].exponent);
    for (let i = 0; i < METRIC_PREFIXES.length; i++) if (METRIC_PREFIXES[i].exponent === exponent) return METRIC_PREFIXES[i];
    return METRIC_PREFIXES[4];
};

export const formatDistanceWorld = (distanceWorld: number, desc: AnnotationUnitsDescriptor = {}): AnnotationDistanceFormatResult => {
    const units = resolveAnnotationUnits(desc);
    if (!Number.isFinite(distanceWorld)) return { worldDistance: distanceWorld, value: Number.NaN, unitSymbol: units.symbol, text: `nan ${units.symbol}` };
    const baseValue = distanceWorld / units.worldUnitsPerUnit;
    if (!units.autoMetric) {
        const text = `${formatFiniteNumber(baseValue, units.decimals)} ${units.symbol}`.trim();
        return { worldDistance: distanceWorld, value: baseValue, unitSymbol: units.symbol, text };
    }
    const prefix = pickMetricPrefix(baseValue);
    const scaled = baseValue / prefix.factor;
    const unitSymbol = `${prefix.symbol}${units.symbol}`;
    const text = `${formatFiniteNumber(scaled, units.decimals)} ${unitSymbol}`.trim();
    return { worldDistance: distanceWorld, value: scaled, unitSymbol, text };
};

export const formatAngleRadians = (angleRadians: number, desc: AnnotationUnitsDescriptor = {}): AnnotationAngleFormatResult => {
    const units = resolveAnnotationUnits(desc);
    if (!Number.isFinite(angleRadians)) return { radians: angleRadians, value: Number.NaN, unitSymbol: units.angleUnit, text: `nan ${units.angleUnit}` };
    if (units.angleUnit === AnnotationAngleUnit.Radians) {
        const text = `${formatFiniteNumber(angleRadians, units.angleDecimals)} rad`;
        return { radians: angleRadians, value: angleRadians, unitSymbol: "rad", text };
    }
    const value = angleRadians * (180 / Math.PI);
    const text = `${formatFiniteNumber(value, units.angleDecimals)} deg`;
    return { radians: angleRadians, value, unitSymbol: "deg", text };
};

export const formatWorldVector = (v: readonly number[] | null, decimals: number = 5): string => {
    if (!v) return "null";
    return `[${formatFiniteNumber(v[0] ?? Number.NaN, decimals)}, ${formatFiniteNumber(v[1] ?? Number.NaN, decimals)}, ${formatFiniteNumber(v[2] ?? Number.NaN, decimals)}]`;
};

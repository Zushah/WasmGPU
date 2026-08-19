/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DirectionalLight } from "../world/light";

export type ShadowFilter = "hard" | "pcf";

export type ShadowUpdateMode = "always" | "manual";

export type DirectionalShadowVolume = {
    center: [number, number, number];
    width: number;
    height?: number;
    depth?: number;
};

export type DirectionalShadowDescriptor = {
    bias?: number;
    normalBias?: number;
    distance?: number;
    updateMode?: ShadowUpdateMode;
    volume?: DirectionalShadowVolume | null;
};

export type DirectionalShadowConfiguration = {
    readonly bias: number;
    readonly normalBias: number;
    readonly distance: number;
    readonly updateMode: ShadowUpdateMode;
    readonly volume: Readonly<DirectionalShadowVolume> | null;
};

export type ShadowSystemDescriptor = {
    mapSize?: number;
    maxViews?: number;
    filter?: ShadowFilter;
    depthBias?: number;
    depthBiasSlopeScale?: number;
    depthBiasClamp?: number;
};

export type ShadowRuntimeState = {
    bias: number;
    normalBias: number;
    distance: number;
    updateMode: ShadowUpdateMode;
    volume: DirectionalShadowVolume | null;
    dirty: boolean;
};

const shadowStates = new WeakMap<ShadowSystem, Map<DirectionalLight, ShadowRuntimeState>>();
const finiteNonNegative = (value: number, label: string): number => { if (!Number.isFinite(value) || value < 0) throw new Error(`ShadowSystem: ${label} must be a finite non-negative number.`); return value; };
const finitePositive = (value: number, label: string): number => { if (!Number.isFinite(value) || value <= 0) throw new Error(`ShadowSystem: ${label} must be a finite positive number.`); return value; };
const finiteF32 = (value: number, label: string): number => { if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new Error(`ShadowSystem: ${label} must be representable as a finite 32-bit float.`); return value; };
const depthBiasInteger = (value: number): number => { if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new Error("ShadowSystem: depthBias must be a signed 32-bit integer."); return value; };
const positiveInteger = (value: number, label: string, maximum: number): number => { if (!Number.isInteger(value) || value <= 0) throw new Error(`ShadowSystem: ${label} must be a positive integer.`); if (value > maximum) throw new Error(`ShadowSystem: ${label} ${value} exceeds the active device limit ${maximum}.`); return value; };
const validateFilter = (value: ShadowFilter): ShadowFilter => { if (value !== "hard" && value !== "pcf") throw new Error(`ShadowSystem: unsupported filter '${String(value)}'.`); return value; };
const validateUpdateMode = (value: ShadowUpdateMode): ShadowUpdateMode => { if (value !== "always" && value !== "manual") throw new Error(`ShadowSystem: unsupported update mode '${String(value)}'.`); return value; };
const resolveVolume = (volume: DirectionalShadowVolume | null): DirectionalShadowVolume | null => { if (!volume) return null; if (!Array.isArray(volume.center) || volume.center.length !== 3 || volume.center.some((component) => !Number.isFinite(component))) throw new Error("ShadowSystem: volume.center must contain three finite numbers."); const width = finitePositive(volume.width, "volume.width"); return { center: [volume.center[0], volume.center[1], volume.center[2]], width, height: finitePositive(volume.height ?? width, "volume.height"), depth: finitePositive(volume.depth ?? width * 2, "volume.depth") }; };
const publicConfiguration = (state: ShadowRuntimeState): DirectionalShadowConfiguration => ({ bias: state.bias, normalBias: state.normalBias, distance: state.distance, updateMode: state.updateMode, volume: state.volume ? { center: [state.volume.center[0], state.volume.center[1], state.volume.center[2]], width: state.volume.width, height: state.volume.height, depth: state.volume.depth } : null });

export class ShadowSystem {
    private _mapSize: number = 1024;
    private _maxViews: number = 4;
    private _filter: ShadowFilter = "pcf";
    private _depthBias: number = 1;
    private _depthBiasSlopeScale: number = 1.5;
    private _depthBiasClamp: number = 0.0025;
    private _revision: number = 0;
    private _maxMapSize: number = 8192;
    private _maxArrayLayers: number = 256;

    constructor(descriptor: ShadowSystemDescriptor = {}) {
        shadowStates.set(this, new Map());
        if (descriptor.mapSize !== undefined) this._mapSize = positiveInteger(descriptor.mapSize, "mapSize", this._maxMapSize);
        if (descriptor.maxViews !== undefined) this._maxViews = positiveInteger(descriptor.maxViews, "maxViews", this._maxArrayLayers);
        if (descriptor.filter !== undefined) this._filter = validateFilter(descriptor.filter);
        if (descriptor.depthBias !== undefined) this._depthBias = depthBiasInteger(descriptor.depthBias);
        if (descriptor.depthBiasSlopeScale !== undefined) this._depthBiasSlopeScale = finiteF32(descriptor.depthBiasSlopeScale, "depthBiasSlopeScale");
        if (descriptor.depthBiasClamp !== undefined) this._depthBiasClamp = finiteF32(descriptor.depthBiasClamp, "depthBiasClamp");
    }

    get mapSize(): number {
        return this._mapSize;
    }

    set mapSize(value: number) {
        const next = positiveInteger(value, "mapSize", this._maxMapSize);
        if (next === this._mapSize) return;
        this._mapSize = next;
        this.markConfigurationChanged();
    }

    get maxViews(): number {
        return this._maxViews;
    }

    set maxViews(value: number) {
        const next = positiveInteger(value, "maxViews", this._maxArrayLayers);
        if (next === this._maxViews) return;
        this._maxViews = next;
        this.markConfigurationChanged();
    }

    get filter(): ShadowFilter {
        return this._filter;
    }

    set filter(value: ShadowFilter) {
        const next = validateFilter(value);
        if (next === this._filter) return;
        this._filter = next;
        this._revision++;
    }

    get depthBias(): number {
        return this._depthBias;
    }

    set depthBias(value: number) {
        const next = depthBiasInteger(value);
        if (next === this._depthBias) return;
        this._depthBias = next;
        this.markConfigurationChanged();
    }

    get depthBiasSlopeScale(): number {
        return this._depthBiasSlopeScale;
    }

    set depthBiasSlopeScale(value: number) {
        const next = finiteF32(value, "depthBiasSlopeScale");
        if (next === this._depthBiasSlopeScale) return;
        this._depthBiasSlopeScale = next;
        this.markConfigurationChanged();
    }

    get depthBiasClamp(): number {
        return this._depthBiasClamp;
    }

    set depthBiasClamp(value: number) {
        const next = finiteF32(value, "depthBiasClamp");
        if (next === this._depthBiasClamp) return;
        this._depthBiasClamp = next;
        this.markConfigurationChanged();
    }

    get revision(): number {
        return this._revision;
    }

    enable(light: DirectionalLight, descriptor: DirectionalShadowDescriptor = {}): void {
        if (!(light instanceof DirectionalLight)) throw new Error("ShadowSystem.enable: only DirectionalLight is supported.");
        const states = shadowStates.get(this)!;
        const previous = states.get(light);
        const updateMode = validateUpdateMode(descriptor.updateMode ?? previous?.updateMode ?? "always");
        const volume = descriptor.volume === undefined ? previous?.volume ?? null : resolveVolume(descriptor.volume);
        states.set(light, {
            bias: finiteNonNegative(descriptor.bias ?? previous?.bias ?? 0.0005, "bias"),
            normalBias: finiteNonNegative(descriptor.normalBias ?? previous?.normalBias ?? 0.02, "normalBias"),
            distance: finitePositive(descriptor.distance ?? previous?.distance ?? 100, "distance"),
            updateMode,
            volume: volume ? resolveVolume(volume) : null,
            dirty: true
        });
        this._revision++;
    }

    disable(light: DirectionalLight): boolean {
        const removed = shadowStates.get(this)!.delete(light);
        if (removed) this._revision++;
        return removed;
    }

    isEnabled(light: DirectionalLight): boolean {
        return shadowStates.get(this)!.has(light);
    }

    get(light: DirectionalLight): DirectionalShadowConfiguration | null {
        const state = shadowStates.get(this)!.get(light);
        return state ? publicConfiguration(state) : null;
    }

    needsUpdate(light: DirectionalLight): boolean {
        return shadowStates.get(this)!.get(light)?.dirty ?? false;
    }

    requestUpdate(light?: DirectionalLight): void {
        const states = shadowStates.get(this)!;
        if (light) {
            const shadow = states.get(light);
            if (shadow) shadow.dirty = true;
            return;
        }
        for (const shadow of states.values()) shadow.dirty = true;
    }

    destroy(): void {
        const states = shadowStates.get(this)!;
        if (states.size === 0) return;
        states.clear();
        this._revision++;
    }

    private markConfigurationChanged(): void {
        this._revision++;
        for (const shadow of shadowStates.get(this)!.values()) shadow.dirty = true;
    }
}

export const getShadowRuntimeState = (system: ShadowSystem, light: DirectionalLight): ShadowRuntimeState | null => shadowStates.get(system)!.get(light) ?? null;

export const setShadowRuntimeClean = (system: ShadowSystem, light: DirectionalLight): void => { const state = shadowStates.get(system)!.get(light); if (state) state.dirty = false; };

export const setShadowDeviceLimits = (system: ShadowSystem, maxMapSize: number, maxArrayLayers: number): void => {
    positiveInteger(system.mapSize, "mapSize", maxMapSize);
    positiveInteger(system.maxViews, "maxViews", maxArrayLayers);
    system["_maxMapSize"] = maxMapSize;
    system["_maxArrayLayers"] = maxArrayLayers;
};

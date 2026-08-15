/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Color } from "../graphics/material";
import type { Transform } from "../core/transform";

export type LightType = "directional" | "point" | "spot" | "ambient";

const normalizeDirection = (value: [number, number, number]): [number, number, number] => {
    const len = Math.sqrt(value[0] ** 2 + value[1] ** 2 + value[2] ** 2);
    if (len <= 0) return [0, -1, 0];
    return [value[0] / len, value[1] / len, value[2] / len];
};

export abstract class Light {
    readonly type: LightType;
    protected _color: Color = [1, 1, 1];
    protected _intensity: number = 1;
    protected _enabled: boolean = true;

    constructor(type: LightType) {
        this.type = type;
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value;
    }

    get intensity(): number {
        return this._intensity;
    }

    set intensity(value: number) {
        this._intensity = value;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }
}

const lightTransforms = new WeakMap<Light, Transform>();

export const bindLightToTransform = (light: Light, transform: Transform): void => { lightTransforms.set(light, transform); };

export const unbindLightTransform = (light: Light): void => { lightTransforms.delete(light); };

const getBoundTransform = (light: Light): Transform | null => {
    const transform = lightTransforms.get(light);
    if (!transform || transform.disposed) return null;
    return transform;
};

const resolveBoundPosition = (light: Light, fallback: [number, number, number]): [number, number, number] => {
    const transform = getBoundTransform(light);
    if (!transform) return fallback;
    const position = transform.worldPosition;
    return [position[0] ?? 0, position[1] ?? 0, position[2] ?? 0];
};

const resolveBoundDirection = (light: Light, fallback: [number, number, number]): [number, number, number] => {
    const transform = getBoundTransform(light);
    if (!transform) return fallback;
    const wm = transform.worldMatrix;
    return normalizeDirection([-(wm[8] ?? 0), -(wm[9] ?? 0), -(wm[10] ?? -1)]);
};

export const resolveLightPosition = (light: PointLight | SpotLight): [number, number, number] => light.position;

export const resolveLightDirection = (light: DirectionalLight | SpotLight): [number, number, number] => light.direction;

export type AmbientLightDescriptor = {
    color?: Color;
    intensity?: number;
};

export class AmbientLight extends Light {
    constructor(descriptor: AmbientLightDescriptor = {}) {
        super("ambient");
        this._color = descriptor.color ?? [1, 1, 1];
        this._intensity = descriptor.intensity ?? 0.1;
    }
}

export type DirectionalLightDescriptor = {
    direction?: [number, number, number];
    color?: Color;
    intensity?: number;
};

export class DirectionalLight extends Light {
    private _direction: [number, number, number];

    constructor(descriptor: DirectionalLightDescriptor = {}) {
        super("directional");
        this._direction = descriptor.direction ?? [0, -1, 0];
        this._color = descriptor.color ?? [1, 1, 1];
        this._intensity = descriptor.intensity ?? 1;
    }

    get direction(): [number, number, number] {
        return resolveBoundDirection(this, this._direction);
    }

    set direction(value: [number, number, number]) {
        this._direction = normalizeDirection(value);
    }
}

export type PointLightDescriptor = {
    position?: [number, number, number];
    color?: Color;
    intensity?: number;
    range?: number;
};

export class PointLight extends Light {
    private _position: [number, number, number];
    private _range: number;

    constructor(descriptor: PointLightDescriptor = {}) {
        super("point");
        this._position = descriptor.position ?? [0, 0, 0];
        this._color = descriptor.color ?? [1, 1, 1];
        this._intensity = descriptor.intensity ?? 1;
        this._range = descriptor.range ?? 10;
    }

    get position(): [number, number, number] {
        return resolveBoundPosition(this, this._position);
    }

    set position(value: [number, number, number]) {
        this._position = value;
    }

    get range(): number {
        return this._range;
    }

    set range(value: number) {
        this._range = value;
    }
}

export type SpotLightDescriptor = {
    position?: [number, number, number];
    direction?: [number, number, number];
    color?: Color;
    intensity?: number;
    range?: number;
    innerCone?: number;
    outerCone?: number;
};

export class SpotLight extends Light {
    private _position: [number, number, number];
    private _direction: [number, number, number];
    private _range: number;
    private _innerCone: number;
    private _outerCone: number;

    constructor(descriptor: SpotLightDescriptor = {}) {
        super("spot");
        this._position = descriptor.position ?? [0, 0, 0];
        this._direction = normalizeDirection(descriptor.direction ?? [0, -1, 0]);
        this._color = descriptor.color ?? [1, 1, 1];
        this._intensity = descriptor.intensity ?? 1;
        this._range = descriptor.range ?? 10;
        this._innerCone = descriptor.innerCone ?? Math.PI / 8;
        this._outerCone = descriptor.outerCone ?? Math.PI / 6;
        if (this._innerCone > this._outerCone) this._innerCone = this._outerCone;
    }

    get position(): [number, number, number] {
        return resolveBoundPosition(this, this._position);
    }

    set position(value: [number, number, number]) {
        this._position = value;
    }

    get direction(): [number, number, number] {
        return resolveBoundDirection(this, this._direction);
    }

    set direction(value: [number, number, number]) {
        this._direction = normalizeDirection(value);
    }

    get range(): number {
        return this._range;
    }

    set range(value: number) {
        this._range = value;
    }

    get innerCone(): number {
        return this._innerCone;
    }

    set innerCone(value: number) {
        this._innerCone = Math.max(0, Math.min(value, this._outerCone));
    }

    get outerCone(): number {
        return this._outerCone;
    }

    set outerCone(value: number) {
        this._outerCone = Math.max(0, value);
        if (this._innerCone > this._outerCone) this._innerCone = this._outerCone;
    }
}

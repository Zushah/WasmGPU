/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const assert: (cond: unknown, msg: string | (() => string)) => asserts cond = (cond, msg) => { if (!cond) throw new Error((typeof msg === "function") ? msg() : msg); };

export const alignTo = (n: number, alignment: number): number => Math.ceil(n / alignment) * alignment;

export const clamp = (x: number, lo: number, hi: number): number => x < lo ? lo : x > hi ? hi : x;

export const clamp01 = (x: number): number => clamp(x, 0, 1);

export const clampInt = (value: number, min: number, max: number): number => { if (!Number.isFinite(value)) return min; return Math.max(min, Math.min(max, Math.round(value))); };

export const lerp = (a: number, b: number, t: number): number => a + ((b - a) * t);

export const ceilDiv = (n: number, d: number): number => { assert(Number.isFinite(n) && Number.isFinite(d), "ceilDiv expects finite numbers"); assert(d !== 0, "ceilDiv divisor must be non-zero"); return Math.floor((n + d - 1) / d); };

export const isPositiveInt = (n: number): boolean => Number.isInteger(n) && n > 0;

export const isNonNegativeInt = (n: number): boolean => Number.isInteger(n) && n >= 0;

export const finiteOr = (x: number | undefined, fallback: number): number => (typeof x === "number" && Number.isFinite(x)) ? x : fallback;

export const intOr = (x: number | undefined, fallback: number): number => (typeof x === "number" && Number.isInteger(x)) ? x : fallback;

export const nextPow2 = (x: number): number => { let v = Math.max(1, x | 0); v--; v |= v >> 1; v |= v >> 2; v |= v >> 4; v |= v >> 8; v |= v >> 16; v++; return v; };

export const nowMs = (): number => (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now();

export const isGPUBuffer = (x: unknown): x is GPUBuffer => typeof x === "object" && x !== null && (x as GPUBuffer).mapState !== undefined;

export const resolveGPUBuffer = (x: GPUBuffer | { buffer: GPUBuffer }): GPUBuffer => isGPUBuffer(x) ? x : x.buffer;

export const normalizePositiveIntShape = (shape: ReadonlyArray<number> | null | undefined, label: string = "shape"): number[] | null => {
    if (!shape) return null;
    const out: number[] = [];
    for (let i = 0; i < shape.length; i++) {
        const d = shape[i] as number;
        assert(Number.isInteger(d) && d > 0, `${label}[${i}] must be an integer > 0.`);
        out.push(d | 0);
    }
    return out.length > 0 ? out : null;
};

export const linearIndexToNdIndex = (shape: ReadonlyArray<number> | null, index: number): number[] | null => {
    if (!shape || shape.length === 0) return null;
    if (!Number.isInteger(index) || index < 0) return null;
    let remaining = index | 0;
    const out = new Array(shape.length);
    for (let i = shape.length - 1; i >= 0; i--) {
        const dim = shape[i]!;
        out[i] = remaining % dim;
        remaining = Math.floor(remaining / dim);
    }
    return remaining === 0 ? out : null;
};

export const createBuffer = (device: GPUDevice, data: ArrayBufferView, usage: GPUBufferUsageFlags, label?: string): GPUBuffer => {
    const buffer = device.createBuffer({ label, size: alignTo(data.byteLength, 4), usage, mappedAtCreation: true });
    new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    buffer.unmap();
    return buffer;
};

export const createDepthTexture = (device: GPUDevice, width: number, height: number, sampleCount: number = 1): GPUTexture => device.createTexture({ size: { width, height, depthOrArrayLayers: 1 }, format: "depth24plus", sampleCount, usage: GPUTextureUsage.RENDER_ATTACHMENT });

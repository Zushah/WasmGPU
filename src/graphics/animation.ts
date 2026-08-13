/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { clamp01 } from "../utils";
import { animf, WasmPtr, wasm } from "../wasm";
import { Transform, TransformStore } from "../core/transform";
import type { Mesh } from "../world/mesh";
import { setMeshMorphWeights } from "../world/mesh";

export type AnimationClipDescriptor = {
    name: string;
    samplerCount: number;
    channelCount: number;
    samplersPtr: WasmPtr;
    channelsPtr: WasmPtr;
    startTime: number;
    endTime: number;
    ownedF32Allocs?: ReadonlyArray<{ ptr: WasmPtr; len: number }>;
    ownedU32Allocs?: ReadonlyArray<{ ptr: WasmPtr; len: number }>;
};

type AnimationWeightSampler = {
    interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
    input: Float32Array;
    output: Float32Array;
    valueSize: number;
};

type AnimationWeightChannel = {
    sampler: number;
    meshes: ReadonlyArray<Mesh>;
    scratch: Float32Array;
};

export type AnimationPointerSampler = {
    interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
    input: Float32Array;
    output: Float32Array;
    valueSize: number;
};

export type AnimationPointerChannel = {
    sampler: number;
    scratch: Float32Array;
    setValue: (value: Float32Array) => void;
};

type AnimationClipInternalDescriptor = AnimationClipDescriptor & {
    weightSamplers?: ReadonlyArray<AnimationWeightSampler>;
    weightChannels?: ReadonlyArray<AnimationWeightChannel>;
    pointerSamplers?: ReadonlyArray<AnimationPointerSampler>;
    pointerChannels?: ReadonlyArray<AnimationPointerChannel>;
};

const findKeyframe = (times: Float32Array, time: number): { i0: number; i1: number; alpha: number; dt: number } => {
    const n = times.length | 0;
    if (n <= 1) return { i0: 0, i1: 0, alpha: 0, dt: 0 };
    if (time <= times[0]) return { i0: 0, i1: 0, alpha: 0, dt: times[1] - times[0] };
    if (time >= times[n - 1]) return { i0: n - 1, i1: n - 1, alpha: 0, dt: times[n - 1] - times[n - 2] };
    let lo = 0;
    let hi = n - 1;
    while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= time) lo = mid;
        else hi = mid;
    }
    const i0 = lo;
    const i1 = lo + 1;
    const dt = times[i1] - times[i0];
    if (dt === 0) return { i0, i1: i0, alpha: 0, dt: 0 };
    return { i0, i1, alpha: clamp01((time - times[i0]) / dt), dt };
};

const hermite = (t: number): [number, number, number, number] => {
    const t2 = t * t;
    const t3 = t2 * t;
    return [
        (2 * t3) - (3 * t2) + 1,
        t3 - (2 * t2) + t,
        (-2 * t3) + (3 * t2),
        t3 - t2
    ];
};

const sampleValueSampler = (sampler: AnimationWeightSampler | AnimationPointerSampler, time: number, out: Float32Array): void => {
    out.fill(0);
    const valueSize = sampler.valueSize | 0;
    if (valueSize <= 0) return;
    const { i0, i1, alpha, dt } = findKeyframe(sampler.input, time);
    switch (sampler.interpolation) {
        case "STEP": {
            const base = i0 * valueSize;
            for (let i = 0; i < valueSize; i++) out[i] = sampler.output[base + i] ?? 0;
            return;
        }
        case "CUBICSPLINE": {
            const [h00, h10, h01, h11] = hermite(alpha);
            const stride = valueSize * 3;
            const base0 = i0 * stride;
            const base1 = i1 * stride;
            const v0 = base0 + valueSize;
            const out0 = base0 + (valueSize * 2);
            const in1 = base1;
            const v1 = base1 + valueSize;
            for (let i = 0; i < valueSize; i++) {
                const p0 = sampler.output[v0 + i] ?? 0;
                const m0 = (sampler.output[out0 + i] ?? 0) * dt;
                const p1 = sampler.output[v1 + i] ?? 0;
                const m1 = (sampler.output[in1 + i] ?? 0) * dt;
                out[i] = (h00 * p0) + (h10 * m0) + (h01 * p1) + (h11 * m1);
            }
            return;
        }
        case "LINEAR":
        default: {
            const base0 = i0 * valueSize;
            const base1 = i1 * valueSize;
            for (let i = 0; i < valueSize; i++) {
                const v0 = sampler.output[base0 + i] ?? 0;
                const v1 = sampler.output[base1 + i] ?? 0;
                out[i] = v0 + ((v1 - v0) * alpha);
            }
            return;
        }
    }
};

export class AnimationClip {
    readonly name: string;
    readonly samplerCount: number;
    readonly channelCount: number;
    private readonly _samplersPtr: WasmPtr;
    private readonly _channelsPtr: WasmPtr;
    readonly startTime: number;
    readonly endTime: number;
    private _ownedF32Allocs: ReadonlyArray<{ ptr: WasmPtr; len: number }> | null;
    private _ownedU32Allocs: ReadonlyArray<{ ptr: WasmPtr; len: number }> | null;
    private _weightSamplers: ReadonlyArray<AnimationWeightSampler> | null;
    private _weightChannels: ReadonlyArray<AnimationWeightChannel> | null;
    private _pointerSamplers: ReadonlyArray<AnimationPointerSampler> | null;
    private _pointerChannels: ReadonlyArray<AnimationPointerChannel> | null;
    private _disposed: boolean = false;

    constructor(desc: AnimationClipInternalDescriptor) {
        this.name = desc.name;
        this.samplerCount = desc.samplerCount | 0;
        this.channelCount = desc.channelCount | 0;
        this._samplersPtr = desc.samplersPtr;
        this._channelsPtr = desc.channelsPtr;
        this.startTime = desc.startTime;
        this.endTime = desc.endTime;
        this._ownedF32Allocs = desc.ownedF32Allocs ?? null;
        this._ownedU32Allocs = desc.ownedU32Allocs ?? null;
        this._weightSamplers = desc.weightSamplers ?? null;
        this._weightChannels = desc.weightChannels ?? null;
        this._pointerSamplers = desc.pointerSamplers ?? null;
        this._pointerChannels = desc.pointerChannels ?? null;
    }

    get duration(): number {
        return Math.max(0, this.endTime - this.startTime);
    }

    get disposed(): boolean {
        return this._disposed;
    }

    get samplersPtr(): WasmPtr {
        this.assertAlive();
        return this._samplersPtr;
    }

    get channelsPtr(): WasmPtr {
        this.assertAlive();
        return this._channelsPtr;
    }

    private assertAlive(): void {
        if (this._disposed) throw new Error(`AnimationClip '${this.name}' is disposed (use-after-dispose).`);
    }

    sample(timeSeconds: number): void {
        this.assertAlive();
        if (this.channelCount > 0) {
            const store = TransformStore.global();
            const soa = { posPtr: store.posPtr as WasmPtr, rotPtr: store.rotPtr as WasmPtr, sclPtr: store.sclPtr as WasmPtr };
            animf.sampleClipTRS(soa.posPtr, soa.rotPtr, soa.sclPtr, store.count | 0, this.samplersPtr, this.samplerCount, this.channelsPtr, this.channelCount, timeSeconds);
            store.markDirty();
        }
        if (this._weightSamplers && this._weightChannels) {
            for (const channel of this._weightChannels) {
                const sampler = this._weightSamplers[channel.sampler];
                if (!sampler || channel.meshes.length === 0) continue;
                sampleValueSampler(sampler, timeSeconds, channel.scratch);
                for (const mesh of channel.meshes) setMeshMorphWeights(mesh, channel.scratch);
            }
        }
        if (this._pointerSamplers && this._pointerChannels) {
            for (const channel of this._pointerChannels) {
                const sampler = this._pointerSamplers[channel.sampler];
                if (!sampler) continue;
                sampleValueSampler(sampler, timeSeconds, channel.scratch);
                channel.setValue(channel.scratch);
            }
        }
    }

    dispose(): void {
        if (this._disposed) return;
        if (this._ownedF32Allocs) for (const a of this._ownedF32Allocs) if (a.ptr) wasm.freeF32(a.ptr, a.len | 0);
        if (this._ownedU32Allocs) for (const a of this._ownedU32Allocs) if (a.ptr) wasm.freeU32(a.ptr, a.len | 0);
        this._disposed = true;
        this._ownedF32Allocs = null;
        this._ownedU32Allocs = null;
        this._weightSamplers = null;
        this._weightChannels = null;
        this._pointerSamplers = null;
        this._pointerChannels = null;
    }
}

export class AnimationPlayer {
    readonly clip: AnimationClip;
    time: number = 0;
    speed: number = 1;
    loop: boolean = true;
    playing: boolean = true;

    constructor(clip: AnimationClip, opts: Partial<Pick<AnimationPlayer, "speed" | "loop" | "playing">> = {}) {
        this.clip = clip;
        if (opts.speed !== undefined) this.speed = opts.speed;
        if (opts.loop !== undefined) this.loop = opts.loop;
        if (opts.playing !== undefined) this.playing = opts.playing;
        this.time = clip.startTime;
    }

    update(dtSeconds: number): void {
        if (!this.playing) return;
        const dur = this.clip.duration;
        if (dur <= 0) {
            this.clip.sample(this.clip.startTime);
            return;
        }
        this.time += dtSeconds * this.speed;
        if (this.loop) {
            const start = this.clip.startTime;
            const end = this.clip.endTime;
            while (this.time < start) this.time += dur;
            while (this.time >= end) this.time -= dur;
        } else {
            this.time = Math.max(this.clip.startTime, Math.min(this.time, this.clip.endTime));
        }
        this.clip.sample(this.time);
    }
}

export class Skin {
    readonly name: string;
    readonly joints: Transform[];
    readonly jointCount: number;
    private readonly _jointIndicesPtr: WasmPtr;
    private readonly _invBindPtr: WasmPtr;
    private _disposed: boolean = false;

    constructor(name: string, joints: Transform[], inverseBindMatrices: Float32Array | null) {
        this.name = name;
        this.joints = joints;
        this.jointCount = joints.length | 0;
        let jointIndicesPtr = 0 as WasmPtr;
        let invBindPtr = 0 as WasmPtr;
        try {
            jointIndicesPtr = wasm.allocU32(this.jointCount) as WasmPtr;
            if (!jointIndicesPtr && this.jointCount !== 0) throw new Error(`Skin '${name}': joint index allocation failed (${this.jointCount} elements).`);
            const u32 = wasm.u32view(jointIndicesPtr, this.jointCount);
            for (let i = 0; i < this.jointCount; i++) u32[i] = joints[i]!.index >>> 0;
            invBindPtr = wasm.allocF32(this.jointCount * 16) as WasmPtr;
            if (!invBindPtr && this.jointCount !== 0) throw new Error(`Skin '${name}': inverse bind allocation failed (${this.jointCount * 16} elements).`);
            const f32 = wasm.f32view(invBindPtr, this.jointCount * 16);
            if (inverseBindMatrices && inverseBindMatrices.length === this.jointCount * 16) {
                f32.set(inverseBindMatrices);
            } else {
                for (let j = 0; j < this.jointCount; j++) {
                    const o = j * 16;
                    f32[o + 0] = 1; f32[o + 1] = 0; f32[o + 2] = 0; f32[o + 3] = 0;
                    f32[o + 4] = 0; f32[o + 5] = 1; f32[o + 6] = 0; f32[o + 7] = 0;
                    f32[o + 8] = 0; f32[o + 9] = 0; f32[o + 10] = 1; f32[o + 11] = 0;
                    f32[o + 12] = 0; f32[o + 13] = 0; f32[o + 14] = 0; f32[o + 15] = 1;
                }
            }
        } catch (error) {
            if (invBindPtr) wasm.freeF32(invBindPtr, this.jointCount * 16);
            if (jointIndicesPtr) wasm.freeU32(jointIndicesPtr, this.jointCount);
            throw error;
        }
        this._jointIndicesPtr = jointIndicesPtr;
        this._invBindPtr = invBindPtr;
    }

    get disposed(): boolean {
        return this._disposed;
    }

    get jointIndicesPtr(): WasmPtr {
        this.assertAlive();
        return this._jointIndicesPtr;
    }

    get invBindPtr(): WasmPtr {
        this.assertAlive();
        return this._invBindPtr;
    }

    private assertAlive(): void {
        if (this._disposed) throw new Error(`Skin '${this.name}' is disposed (use-after-dispose).`);
    }

    createInstance(meshTransform: Transform): SkinInstance {
        this.assertAlive();
        return new SkinInstance(this, meshTransform);
    }

    dispose(): void {
        if (this._disposed) return;
        if (this._jointIndicesPtr) wasm.freeU32(this._jointIndicesPtr, this.jointCount);
        if (this._invBindPtr) wasm.freeF32(this._invBindPtr, this.jointCount * 16);
        this._disposed = true;
    }
}

export class SkinInstance {
    readonly skin: Skin;
    readonly meshTransform: Transform;
    private _disposed: boolean = false;
    boneBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;

    constructor(skin: Skin, meshTransform: Transform) {
        if (skin.disposed) throw new Error(`Skin '${skin.name}' is disposed (use-after-dispose).`);
        this.skin = skin;
        this.meshTransform = meshTransform;
    }

    get disposed(): boolean {
        return this._disposed;
    }

    get meshWorldMatrixPtr(): WasmPtr {
        this.assertAlive();
        return this.meshTransform.worldMatrixPtr as WasmPtr;
    }

    private assertAlive(): void {
        if (this._disposed) throw new Error(`SkinInstance '${this.skin.name}' is disposed (use-after-dispose).`);
        if (this.skin.disposed) throw new Error(`Skin '${this.skin.name}' is disposed (use-after-dispose).`);
    }

    get jointCount(): number {
        this.assertAlive();
        return this.skin.jointCount;
    }

    ensureGpuResources(device: GPUDevice, layout: GPUBindGroupLayout): void {
        this.assertAlive();
        if (this.boneBuffer && this.bindGroup) return;
        const byteSize = this.skin.jointCount * 16 * 4;
        this.boneBuffer = device.createBuffer({
            size: byteSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.bindGroup = device.createBindGroup({
            layout,
            entries: [{ binding: 0, resource: { buffer: this.boneBuffer } }]
        });
    }

    dispose(): void {
        if (this._disposed) return;
        this.boneBuffer?.destroy();
        this.boneBuffer = null;
        this.bindGroup = null;
        this._disposed = true;
    }
}

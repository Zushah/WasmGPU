/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

declare const __WASMGPU_BASE_URL__: string;

type WebAssemblyDriver = typeof import("../../wasm/wasm.js");

export type WasmPtr = number;

export type WasmSliceKind = "heap" | "frame" | "arena";

export type WasmSliceDType = "f32" | "f64" | "u32" | "i32" | "u8";

export type WasmSliceHandle = { kind: WasmSliceKind; dtype: WasmSliceDType; ptr: WasmPtr; length: number; epoch?: number; };

export type WasmTypedArray = Float32Array | Float64Array | Uint32Array | Int32Array | Uint8Array;

export interface WasmTypedArrayConstructor<T extends WasmTypedArray> { readonly BYTES_PER_ELEMENT: number; new(buffer: ArrayBuffer, byteOffset: number, length: number): T; }

export type WebAssemblyDriverHost = { memory: () => WebAssembly.Memory; allocF32: (len: number) => WasmPtr; freeF32: (ptr: WasmPtr, len: number) => void; allocF64: (len: number) => WasmPtr; freeF64: (ptr: WasmPtr, len: number) => void; allocU32: (len: number) => WasmPtr; freeU32: (ptr: WasmPtr, len: number) => void; allocBytes: (bytes: number) => WasmPtr; freeBytes: (ptr: WasmPtr, bytes: number) => void; };

export type FrameArenaHost = { alloc: (bytes: number, align?: number) => WasmPtr; allocF32: (len: number) => WasmPtr; allocF64: (len: number) => WasmPtr; epoch: () => number; };

type WebAssemblyDriverHostState = { wasm: WebAssemblyDriverHost; frameArena: FrameArenaHost; };

let HOST: WebAssemblyDriverHostState | null = null;

export const setWebAssemblyDriverHost = (wasm: WebAssemblyDriverHost, frameArena: FrameArenaHost): void => { HOST = { wasm, frameArena }; };

const ensureHost = (): WebAssemblyDriverHostState => { if (!HOST) throw new Error("WebAssembly driver host not set. This is an internal error: WasmGPU/typescript/wasm/driver.ts should call setWebAssemblyDriverHost()."); return HOST; };

type HeapFinalizerHeldValue = { dtype: WasmSliceDType; ptr: WasmPtr; length: number; };

const HEAP_SLICE_FINALIZER: FinalizationRegistry<HeapFinalizerHeldValue> | null = (typeof FinalizationRegistry !== "undefined") ? new FinalizationRegistry((held) => {
    try {
        const { wasm } = ensureHost();
        const ptr = held.ptr >>> 0;
        const len = held.length >>> 0;
        switch (held.dtype) {
            case "f32": wasm.freeF32(ptr, len); break;
            case "f64": wasm.freeF64(ptr, len); break;
            case "u32": wasm.freeU32(ptr, len); break;
            case "i32": wasm.freeU32(ptr, len); break;
            case "u8": wasm.freeBytes(ptr, len); break;
        }
    } catch { /* ignore */ }
}) : null;

export class WasmSlice<T extends WasmTypedArray> {
    readonly kind: WasmSliceKind;
    readonly dtype: WasmSliceDType;
    readonly ptr: WasmPtr;
    readonly length: number;
    readonly byteLength: number;
    private readonly ctor: WasmTypedArrayConstructor<T>;
    private readonly epoch: number;
    private readonly epochProvider: (() => number) | null;
    private freed: boolean = false;
    private _buf: ArrayBufferLike | null = null;
    private _view: T | null = null;

    constructor(kind: WasmSliceKind, dtype: WasmSliceDType, ptr: WasmPtr, length: number, ctor: WasmTypedArrayConstructor<T>, epoch: number, epochProvider: (() => number) | null) {
        this.kind = kind;
        this.dtype = dtype;
        this.ptr = ptr >>> 0;
        this.length = length >>> 0;
        this.ctor = ctor;
        this.epoch = epoch >>> 0;
        this.epochProvider = epochProvider;
        this.byteLength = (this.length * (ctor.BYTES_PER_ELEMENT >>> 0)) >>> 0;
        if (this.kind === "heap") HEAP_SLICE_FINALIZER?.register(this, { dtype: this.dtype, ptr: this.ptr, length: this.length }, this);
    }

    isAlive(): boolean {
        if (this.freed) return false;
        if (!this.epochProvider) return true;
        try { return (this.epoch >>> 0) === (this.epochProvider() >>> 0); } catch { return false; }
    }

    assertAlive(): void {
        if (this.isAlive()) return;
        if (this.freed) throw new Error(`WasmSlice<${this.dtype}> is no longer valid (freed).`);
        if (this.epochProvider) {
            let currentEpoch = 0;
            try { currentEpoch = this.epochProvider() >>> 0; } catch { /* ignore */ }
            throw new Error(`WasmSlice<${this.dtype}> is no longer valid (epoch changed: allocEpoch=${this.epoch} currentEpoch=${currentEpoch}).`);
        }
        throw new Error(`WasmSlice<${this.dtype}> is no longer valid.`);
    }

    buffer(): ArrayBufferLike {
        this.assertAlive();
        return ensureHost().wasm.memory().buffer as ArrayBufferLike;
    }

    view(): T {
        this.assertAlive();
        const buf = ensureHost().wasm.memory().buffer as ArrayBufferLike;
        if (this._buf !== buf || !this._view) {
            this._buf = buf;
            this._view = new this.ctor(buf as unknown as ArrayBuffer, this.ptr >>> 0, this.length >>> 0);
        }
        return this._view;
    }

    write(src: ArrayLike<number> | null | undefined, srcOffset: number = 0, zeroFill: boolean = true): void {
        const v = this.view();
        if (zeroFill) v.fill(0);
        if (!src) return;
        const dstLen = this.length >>> 0;
        const srcOff = srcOffset >>> 0;
        const srcLen = (src.length >>> 0);
        const remaining = (srcLen > srcOff) ? (srcLen - srcOff) : 0;
        const n = Math.min(dstLen, remaining);
        if (n === 0) return;
        const s = src as any;
        if (ArrayBuffer.isView(s) && typeof (s as any).subarray === "function") { v.set((s as any).subarray(srcOff, srcOff + n), 0); return; }
        for (let i = 0; i < n; i++) v[i] = (src as any)[srcOff + i] as number;
    }

    handle(): WasmSliceHandle {
        this.assertAlive();
        const h: WasmSliceHandle = { kind: this.kind, dtype: this.dtype, ptr: this.ptr >>> 0, length: this.length >>> 0 };
        if (this.epochProvider) h.epoch = this.epoch >>> 0;
        return h;
    }

    free(): void {
        if (this.kind !== "heap") throw new Error(`WasmSlice.free(): cannot free a ${this.kind} allocation. Use reset() for arena-like allocators (frameArena.reset() / WasmHeapArena.reset()).`);
        if (this.freed) return;
        const { wasm } = ensureHost();
        const ptr = this.ptr >>> 0;
        const len = this.length >>> 0;
        switch (this.dtype) {
            case "f32": wasm.freeF32(ptr, len); break;
            case "f64": wasm.freeF64(ptr, len); break;
            case "u32": wasm.freeU32(ptr, len); break;
            case "i32": wasm.freeU32(ptr, len); break;
            case "u8": wasm.freeBytes(ptr, len); break;
        }
        this.freed = true;
        HEAP_SLICE_FINALIZER?.unregister(this);
        this._buf = null;
        this._view = null;
    }
}

const alignUp = (n: number, align: number): number => {
    const a = align >>> 0;
    if (a === 0 || (a & (a - 1)) !== 0) throw new Error(`alignUp(${n}, ${align}): align must be a non-zero power of two`);
    return Math.ceil(n / a) * a;
};

export class WasmHeapArena {
    readonly basePtr: WasmPtr;
    readonly capBytes: number;
    private headBytes: number = 0;
    private _epoch: number = 1;
    private destroyed: boolean = false;

    constructor(capBytes: number, align: number = 16) {
        const cap = capBytes >>> 0;
        if (cap === 0) throw new Error("WasmHeapArena: capBytes must be > 0");
        const { wasm } = ensureHost();
        const base = wasm.allocBytes(cap);
        if (!base) throw new Error(`WasmHeapArena(${capBytes}): wasm.allocBytes failed`);
        const a = align >>> 0;
        if (a !== 0 && (base & (a - 1)) !== 0) { wasm.freeBytes(base, cap); throw new Error(`WasmHeapArena(${capBytes}): basePtr 0x${base.toString(16)} is not ${align}-byte aligned`); }
        this.basePtr = base >>> 0;
        this.capBytes = cap >>> 0;
    }

    epoch(): number {
        this.assertAlive();
        return this._epoch >>> 0;
    }

    usedBytes(): number {
        this.assertAlive();
        return this.headBytes >>> 0;
    }

    reset(): void {
        this.assertAlive();
        this.headBytes = 0;
        this._epoch = (this._epoch + 1) >>> 0;
        if (this._epoch === 0) this._epoch = 1;
    }

    destroy(): void {
        if (this.destroyed) return;
        const base = this.basePtr >>> 0;
        const cap = this.capBytes >>> 0;
        ensureHost().wasm.freeBytes(base, cap);
        this.destroyed = true;
        this.headBytes = 0;
        this._epoch = (this._epoch + 1) >>> 0;
        if (this._epoch === 0) this._epoch = 1;
    }

    alloc(bytes: number, alignBytes: number = 16): WasmPtr {
        this.assertAlive();
        const b = bytes >>> 0;
        const a = alignBytes >>> 0;
        const base = this.basePtr >>> 0;
        const head = this.headBytes >>> 0;
        const start = alignUp(base + head, a);
        const end = start + b;
        if (end - base > (this.capBytes >>> 0)) throw new Error(`WasmHeapArena.alloc(${bytes}, ${alignBytes}): out of memory (used=${head} cap=${this.capBytes})`);
        this.headBytes = (end - base) >>> 0;
        return start >>> 0;
    }

    allocF32(len: number): WasmSlice<Float32Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l * 4, 16);
        const epoch = this.epoch();
        return new WasmSlice("arena", "f32", ptr, l, Float32Array, epoch, () => this.epoch());
    }

    allocF64(len: number): WasmSlice<Float64Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l * 8, 16);
        const epoch = this.epoch();
        return new WasmSlice("arena", "f64", ptr, l, Float64Array, epoch, () => this.epoch());
    }

    allocU32(len: number): WasmSlice<Uint32Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l * 4, 16);
        const epoch = this.epoch();
        return new WasmSlice("arena", "u32", ptr, l, Uint32Array, epoch, () => this.epoch());
    }

    allocI32(len: number): WasmSlice<Int32Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l * 4, 16);
        const epoch = this.epoch();
        return new WasmSlice("arena", "i32", ptr, l, Int32Array, epoch, () => this.epoch());
    }

    allocU8(len: number, alignBytes: number = 16): WasmSlice<Uint8Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l, alignBytes);
        const epoch = this.epoch();
        return new WasmSlice("arena", "u8", ptr, l, Uint8Array, epoch, () => this.epoch());
    }

    private assertAlive(): void {
        if (this.destroyed) throw new Error("WasmHeapArena has been destroyed.");
    }
}

let cachedWasmBytesBuf: ArrayBufferLike | null = null;

let cachedWasmBytes: Uint8Array<ArrayBuffer> | null = null;

const wasmBytesView = (): Uint8Array<ArrayBuffer> => { const b = ensureHost().wasm.memory().buffer as ArrayBufferLike; if (b !== cachedWasmBytesBuf || !cachedWasmBytes) { cachedWasmBytesBuf = b; cachedWasmBytes = new Uint8Array(b as unknown as ArrayBuffer); } return cachedWasmBytes; };

export const driver = {
    buffer: (): ArrayBufferLike => ensureHost().wasm.memory().buffer as ArrayBufferLike,
    bytes: (): Uint8Array<ArrayBuffer> => wasmBytesView(),
    isSharedMemory: (): boolean => {
        const b = ensureHost().wasm.memory().buffer as ArrayBufferLike;
        return (typeof SharedArrayBuffer !== "undefined") && (b instanceof SharedArrayBuffer);
    },
    requireSharedMemory: (): SharedArrayBuffer => {
        const b = ensureHost().wasm.memory().buffer as ArrayBufferLike;
        if ((typeof SharedArrayBuffer !== "undefined") && (b instanceof SharedArrayBuffer)) return b;
        throw new Error("WebAssembly memory is not a SharedArrayBuffer. Build with WASMGPU_SHARED_MEMORY=1 and serve with cross-origin isolation to enable SharedArrayBuffer.");
    },
    viewOn: <T extends WasmTypedArray>(ctor: WasmTypedArrayConstructor<T>, buffer: ArrayBufferLike, ptr: WasmPtr, len: number): T => {
        return new ctor(buffer as unknown as ArrayBuffer, ptr >>> 0, len >>> 0);
    },
    view: <T extends WasmTypedArray>(ctor: WasmTypedArrayConstructor<T>, ptr: WasmPtr, len: number): T => {
        return new ctor(ensureHost().wasm.memory().buffer as unknown as ArrayBuffer, ptr >>> 0, len >>> 0);
    },
    createHeapArena: (capBytes: number, align: number = 16): WasmHeapArena => {
        return new WasmHeapArena(capBytes, align);
    },
    viewFromHandle: (buffer: ArrayBufferLike, handle: WasmSliceHandle): ArrayBufferView => {
        const ptr = handle.ptr >>> 0;
        const len = handle.length >>> 0;
        switch (handle.dtype) {
            case "f32": return new Float32Array(buffer, ptr, len);
            case "f64": return new Float64Array(buffer, ptr, len);
            case "u32": return new Uint32Array(buffer, ptr, len);
            case "i32": return new Int32Array(buffer, ptr, len);
            case "u8": return new Uint8Array(buffer, ptr, len);
        }
    },
    heap: {
        allocF32: (len: number): WasmSlice<Float32Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocF32(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.heap.allocF32(${len}) failed`);
            return new WasmSlice("heap", "f32", ptr, len, Float32Array, 0, null);
        },

        allocF64: (len: number): WasmSlice<Float64Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocF64(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.heap.allocF64(${len}) failed`);
            return new WasmSlice("heap", "f64", ptr, len, Float64Array, 0, null);
        },

        allocU32: (len: number): WasmSlice<Uint32Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocU32(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.heap.allocU32(${len}) failed`);
            return new WasmSlice("heap", "u32", ptr, len, Uint32Array, 0, null);
        },

        allocI32: (len: number): WasmSlice<Int32Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocU32(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.heap.allocI32(${len}) failed`);
            return new WasmSlice("heap", "i32", ptr, len, Int32Array, 0, null);
        },

        allocU8: (len: number, align: number = 16): WasmSlice<Uint8Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocBytes((len >>> 0));
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.heap.allocU8(${len}) failed`);
            if (align !== 0) {
                if ((ptr & ((align >>> 0) - 1)) !== 0) {
                    throw new Error(`driver.heap.allocU8(${len}): returned ptr 0x${ptr.toString(16)} is not ${align}-byte aligned`);
                }
            }
            return new WasmSlice("heap", "u8", ptr, len, Uint8Array, 0, null);
        }
    },
    frame: {
        allocF32: (len: number): WasmSlice<Float32Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.allocF32(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.frame.allocF32(${len}) failed`);
            return new WasmSlice("frame", "f32", ptr, len, Float32Array, frameArena.epoch(), () => frameArena.epoch());
        },

        allocF64: (len: number): WasmSlice<Float64Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.allocF64(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.frame.allocF64(${len}) failed`);
            return new WasmSlice("frame", "f64", ptr, len, Float64Array, frameArena.epoch(), () => frameArena.epoch());
        },

        allocU32: (len: number): WasmSlice<Uint32Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.alloc((len >>> 0) * 4, 16);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.frame.allocU32(${len}) failed`);
            return new WasmSlice("frame", "u32", ptr, len, Uint32Array, frameArena.epoch(), () => frameArena.epoch());
        },

        allocI32: (len: number): WasmSlice<Int32Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.alloc((len >>> 0) * 4, 16);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.frame.allocI32(${len}) failed`);
            return new WasmSlice("frame", "i32", ptr, len, Int32Array, frameArena.epoch(), () => frameArena.epoch());
        },

        allocU8: (len: number, align: number = 16): WasmSlice<Uint8Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.alloc(len >>> 0, align >>> 0);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`driver.frame.allocU8(${len}) failed`);
            return new WasmSlice("frame", "u8", ptr, len, Uint8Array, frameArena.epoch(), () => frameArena.epoch());
        }
    }
};

let modPromise: Promise<WebAssemblyDriver> | null = null;

let mod: WebAssemblyDriver | null = null;

let frameArenaEpoch: number = 0;

const DEFAULT_FRAME_ARENA_BYTES = 8 * 1024 * 1024;

const IIFE_SCRIPT_URL: string | null = (() => { if (typeof document === "undefined") return null; const cs = document.currentScript as HTMLScriptElement | null; const src = cs?.src; return (src && src.length > 0) ? src : null; })();

const defaultBaseURL = (): string => { if (__WASMGPU_BASE_URL__ !== "__CURRENT_SCRIPT__") return new URL(".", __WASMGPU_BASE_URL__).toString(); const base = IIFE_SCRIPT_URL ?? location.href; return new URL(".", base).toString(); };

export const initWebAssembly = async (baseURL?: string): Promise<void> => {
    if (mod) return;
    const base = baseURL ?? defaultBaseURL();
    const wasmURL = new URL("wasm.js", base).toString();
    modPromise ??= import(wasmURL) as Promise<WebAssemblyDriver>;
    mod = await modPromise;
    mod.wasmgpu_frame_arena_init(DEFAULT_FRAME_ARENA_BYTES);
    frameArenaEpoch = mod.wasmgpu_frame_arena_epoch() >>> 0;
};

const ensure = (): WebAssemblyDriver => { if (!mod) throw new Error("WebAssembly driver not initialized. Call await initWebAssembly() first."); return mod; };

const refreshFrameArenaEpoch = (): number => { frameArenaEpoch = ensure().wasmgpu_frame_arena_epoch() >>> 0; return frameArenaEpoch; };

const bool = (x: unknown): boolean => !!x;

export const wasm = {
    memory: (): WebAssembly.Memory => ensure().memory as unknown as WebAssembly.Memory,
    seed: (seed: number): void => { ensure().wasmgpu_seed(seed >>> 0); },
    allocF32: (len: number): WasmPtr => ensure().wasmgpu_alloc_f32(len >>> 0) >>> 0,
    freeF32: (ptr: WasmPtr, len: number): void => ensure().wasmgpu_free_f32(ptr >>> 0, len >>> 0),
    allocF64: (len: number): WasmPtr => ensure().wasmgpu_alloc_f64(len >>> 0) >>> 0,
    freeF64: (ptr: WasmPtr, len: number): void => ensure().wasmgpu_free_f64(ptr >>> 0, len >>> 0),
    allocU32: (len: number): WasmPtr => ensure().wasmgpu_alloc_u32(len >>> 0) >>> 0,
    freeU32: (ptr: WasmPtr, len: number): void => ensure().wasmgpu_free_u32(ptr >>> 0, len >>> 0),
    allocBytes: (bytes: number): WasmPtr => ensure().wasmgpu_alloc(bytes >>> 0) >>> 0,
    freeBytes: (ptr: WasmPtr, bytes: number): void => ensure().wasmgpu_free(ptr >>> 0, bytes >>> 0),
    f32view: (ptr: WasmPtr, len: number): Float32Array<ArrayBuffer> => ensure().f32view(ptr >>> 0, len >>> 0) as unknown as Float32Array<ArrayBuffer>,
    f64view: (ptr: WasmPtr, len: number): Float64Array<ArrayBuffer> => ensure().f64view(ptr >>> 0, len >>> 0) as unknown as Float64Array<ArrayBuffer>,
    u32view: (ptr: WasmPtr, len: number): Uint32Array<ArrayBuffer> => ensure().u32view(ptr >>> 0, len >>> 0) as unknown as Uint32Array<ArrayBuffer>,
    i32view: (ptr: WasmPtr, len: number): Int32Array<ArrayBuffer> => ensure().i32view(ptr >>> 0, len >>> 0) as unknown as Int32Array<ArrayBuffer>,
    u8view: (ptr: WasmPtr, len: number): Uint8Array<ArrayBuffer> => ensure().u8view(ptr >>> 0, len >>> 0) as unknown as Uint8Array<ArrayBuffer>,
    writeF32: (ptr: WasmPtr, len: number, src: ArrayLike<number> | null | undefined): void => {
        const v = ensure().f32view(ptr >>> 0, len >>> 0), n = Math.min(len >>> 0, src ? (src.length >>> 0) : 0);
        for (let i = 0; i < n; i++) v[i] = src![i] as number;
        for (let i = n; i < (len >>> 0); i++) v[i] = 0;
    },
    writeF64: (ptr: WasmPtr, len: number, src: ArrayLike<number> | null | undefined): void => {
        const v = ensure().f64view(ptr >>> 0, len >>> 0), n = Math.min(len >>> 0, src ? (src.length >>> 0) : 0);
        for (let i = 0; i < n; i++) v[i] = src![i] as number;
        for (let i = n; i < (len >>> 0); i++) v[i] = 0;
    },
    readF32Array: (ptr: WasmPtr, len: number): number[] => Array.from(ensure().f32view(ptr >>> 0, len >>> 0)),
    readF64Array: (ptr: WasmPtr, len: number): number[] => Array.from(ensure().f64view(ptr >>> 0, len >>> 0))
};

export const frameArena = {
    init: (capBytes: number = DEFAULT_FRAME_ARENA_BYTES): WasmPtr => {
        const base = ensure().wasmgpu_frame_arena_init(capBytes >>> 0) >>> 0;
        if (!base) throw new Error(`wasmgpu_frame_arena_init(${capBytes}) failed`);
        refreshFrameArenaEpoch();
        return base;
    },
    reset: (): void => {
        ensure().wasmgpu_frame_arena_reset();
        refreshFrameArenaEpoch();
    },
    alloc: (bytes: number, align: number = 16): WasmPtr => {
        const ptr = ensure().wasmgpu_frame_alloc(bytes >>> 0, align >>> 0) >>> 0;
        if (!ptr) throw new Error(`wasmgpu_frame_alloc(${bytes}, ${align}) failed`);
        return ptr;
    },
    allocF32: (len: number): WasmPtr => {
        const ptr = ensure().wasmgpu_frame_alloc_f32(len >>> 0) >>> 0;
        if (!ptr) throw new Error(`wasmgpu_frame_alloc_f32(${len}) failed`);
        return ptr;
    },
    allocF64: (len: number): WasmPtr => {
        const ptr = ensure().wasmgpu_frame_alloc_f64(len >>> 0) >>> 0;
        if (!ptr) throw new Error(`wasmgpu_frame_alloc_f64(${len}) failed`);
        return ptr;
    },
    epoch: (): number => {
        if (!frameArenaEpoch) refreshFrameArenaEpoch();
        return frameArenaEpoch;
    },
    usedBytes: (): number => ensure().wasmgpu_frame_arena_used() >>> 0,
    capBytes: (): number => ensure().wasmgpu_frame_arena_cap() >>> 0
};

setWebAssemblyDriverHost(wasm, frameArena);

export const accessorf = {
    compact: (outPtr: WasmPtr, srcPtr: WasmPtr, count: number, rows: number, columns: number, componentBytes: number, elementStride: number): void => {
        const logicalComponents = (rows * columns) >>> 0;
        const encodedComponents = columns > 1 ? (logicalComponents | 0x80000000) : logicalComponents;
        ensure().accessor_deinterleave(outPtr >>> 0, srcPtr >>> 0, count >>> 0, encodedComponents >>> 0, componentBytes >>> 0, elementStride >>> 0);
    },
    applySparse: (outPtr: WasmPtr, outComponentCount: number, componentType: number, numComponents: number, indicesPtr: WasmPtr, indicesComponentType: number, valuesPtr: WasmPtr, sparseCount: number): void => {
        ensure().accessor_apply_sparse(outPtr >>> 0, outComponentCount >>> 0, componentType >>> 0, numComponents >>> 0, indicesPtr >>> 0, indicesComponentType >>> 0, valuesPtr >>> 0, sparseCount >>> 0);
    },
    convertToF32: (outPtr: WasmPtr, srcPtr: WasmPtr, componentCount: number, componentType: number, normalized: boolean): void => {
        ensure().accessor_convert_to_f32(outPtr >>> 0, srcPtr >>> 0, componentCount >>> 0, componentType >>> 0, normalized ? 1 : 0);
    },
    convertToU16: (outPtr: WasmPtr, srcPtr: WasmPtr, componentCount: number, componentType: number): void => {
        ensure().accessor_convert_to_u16(outPtr >>> 0, srcPtr >>> 0, componentCount >>> 0, componentType >>> 0);
    },
    convertToU32: (outPtr: WasmPtr, srcPtr: WasmPtr, componentCount: number, componentType: number): void => {
        ensure().accessor_convert_to_u32(outPtr >>> 0, srcPtr >>> 0, componentCount >>> 0, componentType >>> 0);
    }
};

export const animf = {
    sampleClipTRS: (posPtr: WasmPtr, rotPtr: WasmPtr, sclPtr: WasmPtr, transformCount: number, samplersPtr: WasmPtr, samplerCount: number, channelsPtr: WasmPtr, channelCount: number, time: number): void => {
        ensure().anim_sample_clip_trs(posPtr >>> 0, rotPtr >>> 0, sclPtr >>> 0, transformCount >>> 0, samplersPtr >>> 0, samplerCount >>> 0, channelsPtr >>> 0, channelCount >>> 0, time);
    },
    computeJointMatricesTo: (outPtr: WasmPtr, jointIndicesPtr: WasmPtr, jointCount: number, invBindPtr: WasmPtr, worldBasePtr: WasmPtr, meshWorldPtr: WasmPtr): void => {
        ensure().anim_compute_joint_matrices_to(outPtr >>> 0, jointIndicesPtr >>> 0, jointCount >>> 0, invBindPtr >>> 0, worldBasePtr >>> 0, meshWorldPtr >>> 0);
    }
};

export const boundsf = {
    pointcloudXYZS: (outBoxMinPtr: WasmPtr, outBoxMaxPtr: WasmPtr, outSphereCenterPtr: WasmPtr, outSphereRadiusPtr: WasmPtr, pointsPtr: WasmPtr, pointCount: number, strideF32: number): void => {
        ensure().bounds_pointcloud_xyzs(outBoxMinPtr >>> 0, outBoxMaxPtr >>> 0, outSphereCenterPtr >>> 0, outSphereRadiusPtr >>> 0, pointsPtr >>> 0, pointCount >>> 0, strideF32 >>> 0);
    },
    glyphInstances: (outBoxMinPtr: WasmPtr, outBoxMaxPtr: WasmPtr, outSphereCenterPtr: WasmPtr, outSphereRadiusPtr: WasmPtr, positionsPtr: WasmPtr, scalesPtr: WasmPtr, rotationsPtr: WasmPtr, instanceCount: number, glyphCenterPtr: WasmPtr, glyphRadius: number): void => {
        ensure().bounds_glyph_instances(outBoxMinPtr >>> 0, outBoxMaxPtr >>> 0, outSphereCenterPtr >>> 0, outSphereRadiusPtr >>> 0, positionsPtr >>> 0, scalesPtr >>> 0, rotationsPtr >>> 0, instanceCount >>> 0, glyphCenterPtr >>> 0, glyphRadius);
    },
    geometryPositions: (outBoxMinPtr: WasmPtr, outBoxMaxPtr: WasmPtr, outSphereCenterPtr: WasmPtr, outSphereRadiusPtr: WasmPtr, positionsPtr: WasmPtr, vertexCount: number): void => {
        ensure().bounds_geometry_positions(outBoxMinPtr >>> 0, outBoxMaxPtr >>> 0, outSphereCenterPtr >>> 0, outSphereRadiusPtr >>> 0, positionsPtr >>> 0, vertexCount >>> 0);
    }
};

export const cullf = {
    writePlanesFromViewProjection: (outPlanesPtr: WasmPtr, viewProjPtr: WasmPtr): void => {
        ensure().cull_write_planes_from_view_projection(outPlanesPtr >>> 0, viewProjPtr >>> 0);
    },
    prepareWorldSpheresFromPtrs: (outCentersPtr: WasmPtr, outRadiiPtr: WasmPtr, worldPtrsPtr: WasmPtr, localCentersPtr: WasmPtr, localRadiiPtr: WasmPtr, count: number): void => {
        ensure().cull_prepare_world_spheres_from_ptrs(outCentersPtr >>> 0, outRadiiPtr >>> 0, worldPtrsPtr >>> 0, localCentersPtr >>> 0, localRadiiPtr >>> 0, count >>> 0);
    },
    spheresFrustum: (outIndicesPtr: WasmPtr, centersPtr: WasmPtr, radiiPtr: WasmPtr, count: number, frustumPlanesPtr: WasmPtr): number => {
        return ensure().cull_spheres_frustum(outIndicesPtr >>> 0, centersPtr >>> 0, radiiPtr >>> 0, count >>> 0, frustumPlanesPtr >>> 0) >>> 0;
    },
    spheresOcclusion: (outIndicesPtr: WasmPtr, outStatsPtr: WasmPtr, centersPtr: WasmPtr, radiiPtr: WasmPtr, count: number, viewProjPtr: WasmPtr, viewportWidth: number, viewportHeight: number, mipOffsetsPtr: WasmPtr, mipWidthsPtr: WasmPtr, mipHeightsPtr: WasmPtr, mipCount: number, depthValuesPtr: WasmPtr, depthValuesLen: number, nearPlaneEpsilon: number, maxScreenCoverage: number, depthBias: number): number => {
        return ensure().cull_spheres_occlusion(outIndicesPtr >>> 0, outStatsPtr >>> 0, centersPtr >>> 0, radiiPtr >>> 0, count >>> 0, viewProjPtr >>> 0, viewportWidth, viewportHeight, mipOffsetsPtr >>> 0, mipWidthsPtr >>> 0, mipHeightsPtr >>> 0, mipCount >>> 0, depthValuesPtr >>> 0, depthValuesLen >>> 0, nearPlaneEpsilon, maxScreenCoverage, depthBias) >>> 0;
    }
};

export const frustumf = {
    writePlanesFromViewProjection: (outPlanesPtr: WasmPtr, viewProj: ArrayLike<number> | WasmPtr): void => {
        if (typeof viewProj === "number") { ensure().cull_write_planes_from_view_projection(outPlanesPtr >>> 0, viewProj >>> 0); return; }
        const vpPtr = frameArena.allocF32(16);
        wasm.writeF32(vpPtr, 16, viewProj);
        ensure().cull_write_planes_from_view_projection(outPlanesPtr >>> 0, vpPtr >>> 0);
    }
};

export const mat4f = {
    alloc: (): WasmPtr => wasm.allocF32(16),
    view: (ptr: WasmPtr): Float32Array => wasm.f32view(ptr, 16),
    set: (ptr: WasmPtr, src: ArrayLike<number>): void => wasm.writeF32(ptr, 16, src),
    abs: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4f_abs(out >>> 0, m >>> 0); },
    add: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().mat4f_add(out >>> 0, a >>> 0, b >>> 0); },
    copy: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4f_copy(out >>> 0, m >>> 0); },
    decomposeTRS: (outTrs: WasmPtr, m: WasmPtr): void => { ensure().mat4f_decompose_trs(outTrs >>> 0, m >>> 0); },
    det: (m: WasmPtr): number => ensure().mat4f_det(m >>> 0),
    identity: (out: WasmPtr): void => { ensure().mat4f_identity(out >>> 0); },
    init: (out: WasmPtr, m0: number, m1: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, m10: number, m11: number, m12: number, m13: number, m14: number, m15: number): void => { ensure().mat4f_init(out >>> 0, m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15); },
    invert: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4f_invert(out >>> 0, m >>> 0); },
    isEqual: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().mat4f_isEqual(a >>> 0, b >>> 0)),
    isIdentity: (m: WasmPtr): boolean => bool(ensure().mat4f_isIdentity(m >>> 0)),
    isInverse: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().mat4f_isInverse(a >>> 0, b >>> 0)),
    isZero: (m: WasmPtr): boolean => bool(ensure().mat4f_isZero(m >>> 0)),
    lookAt: (out: WasmPtr, eye3: WasmPtr, center3: WasmPtr, up3: WasmPtr): void => { ensure().mat4f_lookAt(out >>> 0, eye3 >>> 0, center3 >>> 0, up3 >>> 0); },
    mul: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().mat4f_mul(out >>> 0, a >>> 0, b >>> 0); },
    mulVec4: (outVec4: WasmPtr, m: WasmPtr, v4: WasmPtr): void => { ensure().mat4f_mul_vec4(outVec4 >>> 0, m >>> 0, v4 >>> 0); },
    neg: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4f_neg(out >>> 0, m >>> 0); },
    norm: (m: WasmPtr): number => ensure().mat4f_norm(m >>> 0),
    normalize: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4f_normalize(out >>> 0, m >>> 0); },
    normsq: (m: WasmPtr): number => ensure().mat4f_normsq(m >>> 0),
    perspective: (out: WasmPtr, fovY: number, aspect: number, near: number, far: number): void => { ensure().mat4f_perspective(out >>> 0, fovY, aspect, near, far); },
    random: (out: WasmPtr): void => { ensure().mat4f_random(out >>> 0); },
    randomRange: (out: WasmPtr, min: number, max: number): void => { ensure().mat4f_random_range(out >>> 0, min, max); },
    rotateX: (out: WasmPtr, m: WasmPtr, angle: number): void => { ensure().mat4f_rotateX(out >>> 0, m >>> 0, angle); },
    rotateY: (out: WasmPtr, m: WasmPtr, angle: number): void => { ensure().mat4f_rotateY(out >>> 0, m >>> 0, angle); },
    rotateZ: (out: WasmPtr, m: WasmPtr, angle: number): void => { ensure().mat4f_rotateZ(out >>> 0, m >>> 0, angle); },
    round: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4f_round(out >>> 0, m >>> 0); },
    scl: (out: WasmPtr, m: WasmPtr, scalar: number): void => { ensure().mat4f_scl(out >>> 0, m >>> 0, scalar); },
    sub: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().mat4f_sub(out >>> 0, a >>> 0, b >>> 0); },
    trace: (m: WasmPtr): number => ensure().mat4f_trace(m >>> 0),
    translate: (out: WasmPtr, m: WasmPtr, v3: WasmPtr): void => { ensure().mat4f_translate(out >>> 0, m >>> 0, v3 >>> 0); },
    transpose: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4f_transpose(out >>> 0, m >>> 0); },
    print: (m: WasmPtr): void => { const a = wasm.f32view(m, 16); console.log(`[ ${a[0]} ${a[1]} ${a[2]} ${a[3]} ]\n[ ${a[4]} ${a[5]} ${a[6]} ${a[7]} ]\n[ ${a[8]} ${a[9]} ${a[10]} ${a[11]} ]\n[ ${a[12]} ${a[13]} ${a[14]} ${a[15]} ]`); }
};

export const mat4d = {
    alloc: (): WasmPtr => wasm.allocF64(16),
    view: (ptr: WasmPtr): Float64Array => wasm.f64view(ptr, 16),
    set: (ptr: WasmPtr, src: ArrayLike<number>): void => wasm.writeF64(ptr, 16, src),
    abs: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4d_abs(out >>> 0, m >>> 0); },
    add: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().mat4d_add(out >>> 0, a >>> 0, b >>> 0); },
    copy: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4d_copy(out >>> 0, m >>> 0); },
    decomposeTRS: (outTrs: WasmPtr, m: WasmPtr): void => { ensure().mat4d_decompose_trs(outTrs >>> 0, m >>> 0); },
    det: (m: WasmPtr): number => ensure().mat4d_det(m >>> 0),
    identity: (out: WasmPtr): void => { ensure().mat4d_identity(out >>> 0); },
    init: (out: WasmPtr, m0: number, m1: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, m10: number, m11: number, m12: number, m13: number, m14: number, m15: number): void => { ensure().mat4d_init(out >>> 0, m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15); },
    invert: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4d_invert(out >>> 0, m >>> 0); },
    isEqual: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().mat4d_isEqual(a >>> 0, b >>> 0)),
    isIdentity: (m: WasmPtr): boolean => bool(ensure().mat4d_isIdentity(m >>> 0)),
    isInverse: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().mat4d_isInverse(a >>> 0, b >>> 0)),
    isZero: (m: WasmPtr): boolean => bool(ensure().mat4d_isZero(m >>> 0)),
    lookAt: (out: WasmPtr, eye3: WasmPtr, center3: WasmPtr, up3: WasmPtr): void => { ensure().mat4d_lookAt(out >>> 0, eye3 >>> 0, center3 >>> 0, up3 >>> 0); },
    mul: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().mat4d_mul(out >>> 0, a >>> 0, b >>> 0); },
    mulVec4: (outVec4: WasmPtr, m: WasmPtr, v4: WasmPtr): void => { ensure().mat4d_mul_vec4(outVec4 >>> 0, m >>> 0, v4 >>> 0); },
    neg: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4d_neg(out >>> 0, m >>> 0); },
    norm: (m: WasmPtr): number => ensure().mat4d_norm(m >>> 0),
    normalize: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4d_normalize(out >>> 0, m >>> 0); },
    normsq: (m: WasmPtr): number => ensure().mat4d_normsq(m >>> 0),
    perspective: (out: WasmPtr, fovY: number, aspect: number, near: number, far: number): void => { ensure().mat4d_perspective(out >>> 0, fovY, aspect, near, far); },
    random: (out: WasmPtr): void => { ensure().mat4d_random(out >>> 0); },
    randomRange: (out: WasmPtr, min: number, max: number): void => { ensure().mat4d_random_range(out >>> 0, min, max); },
    rotateX: (out: WasmPtr, m: WasmPtr, angle: number): void => { ensure().mat4d_rotateX(out >>> 0, m >>> 0, angle); },
    rotateY: (out: WasmPtr, m: WasmPtr, angle: number): void => { ensure().mat4d_rotateY(out >>> 0, m >>> 0, angle); },
    rotateZ: (out: WasmPtr, m: WasmPtr, angle: number): void => { ensure().mat4d_rotateZ(out >>> 0, m >>> 0, angle); },
    round: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4d_round(out >>> 0, m >>> 0); },
    scl: (out: WasmPtr, m: WasmPtr, scalar: number): void => { ensure().mat4d_scl(out >>> 0, m >>> 0, scalar); },
    sub: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().mat4d_sub(out >>> 0, a >>> 0, b >>> 0); },
    trace: (m: WasmPtr): number => ensure().mat4d_trace(m >>> 0),
    translate: (out: WasmPtr, m: WasmPtr, v3: WasmPtr): void => { ensure().mat4d_translate(out >>> 0, m >>> 0, v3 >>> 0); },
    transpose: (out: WasmPtr, m: WasmPtr): void => { ensure().mat4d_transpose(out >>> 0, m >>> 0); },
    print: (m: WasmPtr): void => { const a = wasm.f64view(m, 16); console.log(`[ ${a[0]} ${a[1]} ${a[2]} ${a[3]} ]\n[ ${a[4]} ${a[5]} ${a[6]} ${a[7]} ]\n[ ${a[8]} ${a[9]} ${a[10]} ${a[11]} ]\n[ ${a[12]} ${a[13]} ${a[14]} ${a[15]} ]`); }
};

export const meshf = {
    computeVertexNormals: (outNormalsPtr: WasmPtr, positionsPtr: WasmPtr, vertexCount: number, indicesPtr: WasmPtr, indexCount: number): void => {
        ensure().mesh_compute_vertex_normals(outNormalsPtr >>> 0, positionsPtr >>> 0, vertexCount >>> 0, indicesPtr >>> 0, indexCount >>> 0);
    }
};

export const ndarrayf = {
    numel: (shapePtr: WasmPtr, ndim: number): number => {
        return ensure().ndarray_numel(shapePtr >>> 0, ndim >>> 0) >>> 0;
    },
    stridesRowMajorTo: (outStridesPtr: WasmPtr, shapePtr: WasmPtr, ndim: number, elemBytes: number): boolean => {
        return !!ensure().ndarray_strides_row_major(outStridesPtr >>> 0, shapePtr >>> 0, ndim >>> 0, elemBytes >>> 0);
    },
    offsetBytes: (shapePtr: WasmPtr, stridesPtr: WasmPtr, indicesPtr: WasmPtr, ndim: number, baseOffsetBytes: number): number => {
        return ensure().ndarray_offset_bytes(shapePtr >>> 0, stridesPtr >>> 0, indicesPtr >>> 0, ndim >>> 0, baseOffsetBytes >>> 0) >>> 0;
    }
};

export const quatf = {
    alloc: (): WasmPtr => wasm.allocF32(4),
    view: (ptr: WasmPtr): Float32Array => wasm.f32view(ptr, 4),
    set: (ptr: WasmPtr, src: ArrayLike<number>): void => wasm.writeF32(ptr, 4, src),
    abs: (out: WasmPtr, q: WasmPtr): void => { ensure().quatf_abs(out >>> 0, q >>> 0); },
    add: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().quatf_add(out >>> 0, a >>> 0, b >>> 0); },
    copy: (out: WasmPtr, q: WasmPtr): void => { ensure().quatf_copy(out >>> 0, q >>> 0); },
    dist: (a: WasmPtr, b: WasmPtr): number => ensure().quatf_dist(a >>> 0, b >>> 0),
    distsq: (a: WasmPtr, b: WasmPtr): number => ensure().quatf_distsq(a >>> 0, b >>> 0),
    fromAxisAngle: (out: WasmPtr, axis3: WasmPtr, angle: number): void => { ensure().quatf_fromAxisAngle(out >>> 0, axis3 >>> 0, angle); },
    init: (out: WasmPtr, x: number, y: number, z: number, w: number): void => { ensure().quatf_init(out >>> 0, x, y, z, w); },
    invert: (out: WasmPtr, q: WasmPtr): void => { ensure().quatf_invert(out >>> 0, q >>> 0); },
    isEqual: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().quatf_isEqual(a >>> 0, b >>> 0)),
    isNormalized: (q: WasmPtr): boolean => bool(ensure().quatf_isNormalized(q >>> 0)),
    isZero: (q: WasmPtr): boolean => bool(ensure().quatf_isZero(q >>> 0)),
    mul: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().quatf_mul(out >>> 0, a >>> 0, b >>> 0); },
    neg: (out: WasmPtr, q: WasmPtr): void => { ensure().quatf_neg(out >>> 0, q >>> 0); },
    norm: (q: WasmPtr): number => ensure().quatf_norm(q >>> 0),
    normalize: (out: WasmPtr, q: WasmPtr): void => { ensure().quatf_normalize(out >>> 0, q >>> 0); },
    normscl: (out: WasmPtr, q: WasmPtr, scalar: number): void => { ensure().quatf_normscl(out >>> 0, q >>> 0, scalar); },
    normsq: (q: WasmPtr): number => ensure().quatf_normsq(q >>> 0),
    random: (out: WasmPtr): void => { ensure().quatf_random(out >>> 0); },
    randomRange: (out: WasmPtr, min: number, max: number): void => { ensure().quatf_random_range(out >>> 0, min, max); },
    round: (out: WasmPtr, q: WasmPtr): void => { ensure().quatf_round(out >>> 0, q >>> 0); },
    scl: (out: WasmPtr, q: WasmPtr, scalar: number): void => { ensure().quatf_scl(out >>> 0, q >>> 0, scalar); },
    slerp: (out: WasmPtr, a: WasmPtr, b: WasmPtr, t: number): void => { ensure().quatf_slerp(out >>> 0, a >>> 0, b >>> 0, t); },
    sub: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().quatf_sub(out >>> 0, a >>> 0, b >>> 0); },
    toRotation: (outVec3: WasmPtr, q: WasmPtr, v3: WasmPtr): void => { ensure().quatf_toRotation(outVec3 >>> 0, q >>> 0, v3 >>> 0); },
    print: (q: WasmPtr): void => { const a = wasm.f32view(q, 4); console.log(`${a[0]} ${a[1] < 0 ? "-" : "+"} ${Math.abs(a[1])}i ${a[2] < 0 ? "-" : "+"} ${Math.abs(a[2])}j ${a[3] < 0 ? "-" : "+"} ${Math.abs(a[3])}k`); }
};

export const quatd = {
    alloc: (): WasmPtr => wasm.allocF64(4),
    view: (ptr: WasmPtr): Float64Array => wasm.f64view(ptr, 4),
    set: (ptr: WasmPtr, src: ArrayLike<number>): void => wasm.writeF64(ptr, 4, src),
    abs: (out: WasmPtr, q: WasmPtr): void => { ensure().quatd_abs(out >>> 0, q >>> 0); },
    add: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().quatd_add(out >>> 0, a >>> 0, b >>> 0); },
    copy: (out: WasmPtr, q: WasmPtr): void => { ensure().quatd_copy(out >>> 0, q >>> 0); },
    dist: (a: WasmPtr, b: WasmPtr): number => ensure().quatd_dist(a >>> 0, b >>> 0),
    distsq: (a: WasmPtr, b: WasmPtr): number => ensure().quatd_distsq(a >>> 0, b >>> 0),
    fromAxisAngle: (out: WasmPtr, axis3: WasmPtr, angle: number): void => { ensure().quatd_fromAxisAngle(out >>> 0, axis3 >>> 0, angle); },
    init: (out: WasmPtr, x: number, y: number, z: number, w: number): void => { ensure().quatd_init(out >>> 0, x, y, z, w); },
    invert: (out: WasmPtr, q: WasmPtr): void => { ensure().quatd_invert(out >>> 0, q >>> 0); },
    isEqual: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().quatd_isEqual(a >>> 0, b >>> 0)),
    isNormalized: (q: WasmPtr): boolean => bool(ensure().quatd_isNormalized(q >>> 0)),
    isZero: (q: WasmPtr): boolean => bool(ensure().quatd_isZero(q >>> 0)),
    mul: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().quatd_mul(out >>> 0, a >>> 0, b >>> 0); },
    neg: (out: WasmPtr, q: WasmPtr): void => { ensure().quatd_neg(out >>> 0, q >>> 0); },
    norm: (q: WasmPtr): number => ensure().quatd_norm(q >>> 0),
    normalize: (out: WasmPtr, q: WasmPtr): void => { ensure().quatd_normalize(out >>> 0, q >>> 0); },
    normscl: (out: WasmPtr, q: WasmPtr, scalar: number): void => { ensure().quatd_normscl(out >>> 0, q >>> 0, scalar); },
    normsq: (q: WasmPtr): number => ensure().quatd_normsq(q >>> 0),
    random: (out: WasmPtr): void => { ensure().quatd_random(out >>> 0); },
    randomRange: (out: WasmPtr, min: number, max: number): void => { ensure().quatd_random_range(out >>> 0, min, max); },
    round: (out: WasmPtr, q: WasmPtr): void => { ensure().quatd_round(out >>> 0, q >>> 0); },
    scl: (out: WasmPtr, q: WasmPtr, scalar: number): void => { ensure().quatd_scl(out >>> 0, q >>> 0, scalar); },
    slerp: (out: WasmPtr, a: WasmPtr, b: WasmPtr, t: number): void => { ensure().quatd_slerp(out >>> 0, a >>> 0, b >>> 0, t); },
    sub: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().quatd_sub(out >>> 0, a >>> 0, b >>> 0); },
    toRotation: (outVec3: WasmPtr, q: WasmPtr, v3: WasmPtr): void => { ensure().quatd_toRotation(outVec3 >>> 0, q >>> 0, v3 >>> 0); },
    print: (q: WasmPtr): void => { const a = wasm.f64view(q, 4); console.log(`${a[0]} ${a[1] < 0 ? "-" : "+"} ${Math.abs(a[1])}i ${a[2] < 0 ? "-" : "+"} ${Math.abs(a[2])}j ${a[3] < 0 ? "-" : "+"} ${Math.abs(a[3])}k`); }
};

export const transformf = {
    composeLocalMany: (outLocalPtr: WasmPtr, posPtr: WasmPtr, rotPtr: WasmPtr, sclPtr: WasmPtr, count: number): void => {
        ensure().transform_compose_local_many(outLocalPtr >>> 0, posPtr >>> 0, rotPtr >>> 0, sclPtr >>> 0, count >>> 0);
    },
    updateWorldOrdered: (outWorldPtr: WasmPtr, localPtr: WasmPtr, parentPtr: WasmPtr, orderPtr: WasmPtr, count: number): void => {
        ensure().transform_update_world_ordered(outWorldPtr >>> 0, localPtr >>> 0, parentPtr >>> 0, orderPtr >>> 0, count >>> 0);
    },
    updatePartialOrdered: (outWorldPtr: WasmPtr, outLocalPtr: WasmPtr, posPtr: WasmPtr, rotPtr: WasmPtr, sclPtr: WasmPtr, parentPtr: WasmPtr, orderPtr: WasmPtr, dirtyIndicesPtr: WasmPtr, dirtyCount: number, count: number): void => {
        ensure().transform_update_partial_ordered(outWorldPtr >>> 0, outLocalPtr >>> 0, posPtr >>> 0, rotPtr >>> 0, sclPtr >>> 0, parentPtr >>> 0, orderPtr >>> 0, dirtyIndicesPtr >>> 0, dirtyCount >>> 0, count >>> 0);
    },
    packModelNormalMat4FromPtrs: (outPtr: WasmPtr, matPtrsPtr: WasmPtr, count: number): void => {
        ensure().transform_pack_model_normal_mat4_from_ptrs(outPtr >>> 0, matPtrsPtr >>> 0, count >>> 0);
    }
};

export const vec3f = {
    alloc: (): WasmPtr => wasm.allocF32(3),
    view3: (ptr: WasmPtr): Float32Array => wasm.f32view(ptr, 3),
    set3: (ptr: WasmPtr, src: ArrayLike<number>): void => wasm.writeF32(ptr, 3, src),
    abs: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3f_abs(out >>> 0, v >>> 0); },
    add: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3f_add(out >>> 0, a >>> 0, b >>> 0); },
    ang: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3f_ang(out >>> 0, v >>> 0); },
    angBetween: (a: WasmPtr, b: WasmPtr): number => ensure().vec3f_angBetween(a >>> 0, b >>> 0),
    copy: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3f_copy(out >>> 0, v >>> 0); },
    cross: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3f_cross(out >>> 0, a >>> 0, b >>> 0); },
    dist: (a: WasmPtr, b: WasmPtr): number => ensure().vec3f_dist(a >>> 0, b >>> 0),
    distsq: (a: WasmPtr, b: WasmPtr): number => ensure().vec3f_distsq(a >>> 0, b >>> 0),
    dot: (a: WasmPtr, b: WasmPtr): number => ensure().vec3f_dot(a >>> 0, b >>> 0),
    init: (out: WasmPtr, x: number, y: number, z: number): void => { ensure().vec3f_init(out >>> 0, x, y, z); },
    interp: (out: WasmPtr, v: WasmPtr, a: number, b: number, c: number): void => { ensure().vec3f_interp(out >>> 0, v >>> 0, a, b, c); },
    isEqual: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().vec3f_isEqual(a >>> 0, b >>> 0)),
    isNormalized: (v: WasmPtr): boolean => bool(ensure().vec3f_isNormalized(v >>> 0)),
    isOrthogonal: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().vec3f_isOrthogonal(a >>> 0, b >>> 0)),
    isParallel: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().vec3f_isParallel(a >>> 0, b >>> 0)),
    isZero: (v: WasmPtr): boolean => bool(ensure().vec3f_isZero(v >>> 0)),
    neg: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3f_neg(out >>> 0, v >>> 0); },
    norm: (v: WasmPtr): number => ensure().vec3f_norm(v >>> 0),
    normalize: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3f_normalize(out >>> 0, v >>> 0); },
    normscl: (out: WasmPtr, v: WasmPtr, scalar: number): void => { ensure().vec3f_normscl(out >>> 0, v >>> 0, scalar); },
    normsq: (v: WasmPtr): number => ensure().vec3f_normsq(v >>> 0),
    oproj: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3f_oproj(out >>> 0, a >>> 0, b >>> 0); },
    proj: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3f_proj(out >>> 0, a >>> 0, b >>> 0); },
    random: (out: WasmPtr): void => { ensure().vec3f_random(out >>> 0); },
    randomRange: (out: WasmPtr, min: number, max: number): void => { ensure().vec3f_random_range(out >>> 0, min, max); },
    reflect: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3f_reflect(out >>> 0, a >>> 0, b >>> 0); },
    refract: (out: WasmPtr, a: WasmPtr, b: WasmPtr, refractiveIndex: number): void => { ensure().vec3f_refract(out >>> 0, a >>> 0, b >>> 0, refractiveIndex); },
    round: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3f_round(out >>> 0, v >>> 0); },
    scl: (out: WasmPtr, v: WasmPtr, scalar: number): void => { ensure().vec3f_scl(out >>> 0, v >>> 0, scalar); },
    sub: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3f_sub(out >>> 0, a >>> 0, b >>> 0); },
    print: (v: WasmPtr): void => { const a = wasm.f32view(v, 3); console.log(`(${a[0]}, ${a[1]}, ${a[2]})`); }
};

export const vec3d = {
    alloc: (): WasmPtr => wasm.allocF64(3),
    view3: (ptr: WasmPtr): Float64Array => wasm.f64view(ptr, 3),
    set3: (ptr: WasmPtr, src: ArrayLike<number>): void => wasm.writeF64(ptr, 3, src),
    abs: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3d_abs(out >>> 0, v >>> 0); },
    add: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3d_add(out >>> 0, a >>> 0, b >>> 0); },
    ang: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3d_ang(out >>> 0, v >>> 0); },
    angBetween: (a: WasmPtr, b: WasmPtr): number => ensure().vec3d_angBetween(a >>> 0, b >>> 0),
    copy: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3d_copy(out >>> 0, v >>> 0); },
    cross: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3d_cross(out >>> 0, a >>> 0, b >>> 0); },
    dist: (a: WasmPtr, b: WasmPtr): number => ensure().vec3d_dist(a >>> 0, b >>> 0),
    distsq: (a: WasmPtr, b: WasmPtr): number => ensure().vec3d_distsq(a >>> 0, b >>> 0),
    dot: (a: WasmPtr, b: WasmPtr): number => ensure().vec3d_dot(a >>> 0, b >>> 0),
    init: (out: WasmPtr, x: number, y: number, z: number): void => { ensure().vec3d_init(out >>> 0, x, y, z); },
    interp: (out: WasmPtr, v: WasmPtr, a: number, b: number, c: number): void => { ensure().vec3d_interp(out >>> 0, v >>> 0, a, b, c); },
    isEqual: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().vec3d_isEqual(a >>> 0, b >>> 0)),
    isNormalized: (v: WasmPtr): boolean => bool(ensure().vec3d_isNormalized(v >>> 0)),
    isOrthogonal: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().vec3d_isOrthogonal(a >>> 0, b >>> 0)),
    isParallel: (a: WasmPtr, b: WasmPtr): boolean => bool(ensure().vec3d_isParallel(a >>> 0, b >>> 0)),
    isZero: (v: WasmPtr): boolean => bool(ensure().vec3d_isZero(v >>> 0)),
    neg: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3d_neg(out >>> 0, v >>> 0); },
    norm: (v: WasmPtr): number => ensure().vec3d_norm(v >>> 0),
    normalize: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3d_normalize(out >>> 0, v >>> 0); },
    normscl: (out: WasmPtr, v: WasmPtr, scalar: number): void => { ensure().vec3d_normscl(out >>> 0, v >>> 0, scalar); },
    normsq: (v: WasmPtr): number => ensure().vec3d_normsq(v >>> 0),
    oproj: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3d_oproj(out >>> 0, a >>> 0, b >>> 0); },
    proj: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3d_proj(out >>> 0, a >>> 0, b >>> 0); },
    random: (out: WasmPtr): void => { ensure().vec3d_random(out >>> 0); },
    randomRange: (out: WasmPtr, min: number, max: number): void => { ensure().vec3d_random_range(out >>> 0, min, max); },
    reflect: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3d_reflect(out >>> 0, a >>> 0, b >>> 0); },
    refract: (out: WasmPtr, a: WasmPtr, b: WasmPtr, refractiveIndex: number): void => { ensure().vec3d_refract(out >>> 0, a >>> 0, b >>> 0, refractiveIndex); },
    round: (out: WasmPtr, v: WasmPtr): void => { ensure().vec3d_round(out >>> 0, v >>> 0); },
    scl: (out: WasmPtr, v: WasmPtr, scalar: number): void => { ensure().vec3d_scl(out >>> 0, v >>> 0, scalar); },
    sub: (out: WasmPtr, a: WasmPtr, b: WasmPtr): void => { ensure().vec3d_sub(out >>> 0, a >>> 0, b >>> 0); },
    print: (v: WasmPtr): void => { const a = wasm.f64view(v, 3); console.log(`(${a[0]}, ${a[1]}, ${a[2]})`); }
};

export const mat4 = {
    abs: (matr: number[]): number[] => ensure().mat4abs(matr),
    add: (matr1: number[], matr2: number[]): number[] => ensure().mat4add(matr1, matr2),
    copy: (matr: number[]): number[] => ensure().mat4copy(matr),
    det: (matr: number[]): number => ensure().mat4det(matr),
    identity: (): number[] => ensure().mat4identity(),
    init: (m0: number, m1: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, m10: number, m11: number, m12: number, m13: number, m14: number, m15: number): number[] => ensure().mat4init(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15),
    invert: (matr: number[]): number[] => ensure().mat4invert(matr),
    isEqual: (matr1: number[], matr2: number[]): boolean => ensure().mat4isEqual(matr1, matr2),
    isIdentity: (matr: number[]): boolean => ensure().mat4isIdentity(matr),
    isInverse: (matr1: number[], matr2: number[]): boolean => ensure().mat4isInverse(matr1, matr2),
    isZero: (matr: number[]): boolean => ensure().mat4isZero(matr),
    lookAt: (eye: number[], center: number[], up: number[]): number[] => ensure().mat4lookAt(eye, center, up),
    mul: (matr1: number[], matr2ORvect: number[]): number[] => ensure().mat4mul(matr1, matr2ORvect),
    neg: (matr: number[]): number[] => ensure().mat4neg(matr),
    norm: (matr: number[]): number => ensure().mat4norm(matr),
    normalize: (matr: number[]): number[] => ensure().mat4normalize(matr),
    normsq: (matr: number[]): number => ensure().mat4normsq(matr),
    perspective: (fovY: number, aspect: number, near: number, far: number): number[] => ensure().mat4perspective(fovY, aspect, near, far),
    print: (matr: number[]): void => ensure().mat4print(matr),
    random: (min: number, max: number): number[] => ensure().mat4random(min, max),
    rotateX: (matr: number[], angle: number): number[] => ensure().mat4rotateX(matr, angle),
    rotateY: (matr: number[], angle: number): number[] => ensure().mat4rotateY(matr, angle),
    rotateZ: (matr: number[], angle: number): number[] => ensure().mat4rotateZ(matr, angle),
    round: (matr: number[]): number[] => ensure().mat4round(matr),
    scl: (matr: number[], scalar: number): number[] => ensure().mat4scl(matr, scalar),
    sub: (matr1: number[], matr2: number[]): number[] => ensure().mat4sub(matr1, matr2),
    trace: (matr: number[]): number => ensure().mat4trace(matr),
    translate: (matr: number[], vect: number[]): number[] => ensure().mat4translate(matr, vect),
    transpose: (matr: number[]): number[] => ensure().mat4transpose(matr)
};

export const quat = {
    abs: (q: number[]): number[] => ensure().quatabs(q),
    add: (q1: number[], q2: number[]): number[] => ensure().quatadd(q1, q2),
    copy: (q: number[]): number[] => ensure().quatcopy(q),
    dist: (q1: number[], q2: number[]): number => ensure().quatdist(q1, q2),
    distsq: (q1: number[], q2: number[]): number => ensure().quatdistsq(q1, q2),
    fromAxisAngle: (axis: number[], angle: number): number[] => ensure().quatfromAxisAngle(axis, angle),
    init: (a: number, b: number, c: number, d: number): number[] => ensure().quatinit(a, b, c, d),
    invert: (q: number[]): number[] => ensure().quatinvert(q),
    isEqual: (q1: number[], q2: number[]): boolean => ensure().quatisEqual(q1, q2),
    isNormalized: (q: number[]): boolean => ensure().quatisNormalized(q),
    isZero: (q: number[]): boolean => ensure().quatisZero(q),
    mul: (q1: number[], q2: number[]): number[] => ensure().quatmul(q1, q2),
    neg: (q: number[]): number[] => ensure().quatneg(q),
    norm: (q: number[]): number => ensure().quatnorm(q),
    normalize: (q: number[]): number[] => ensure().quatnormalize(q),
    normscl: (q: number[], scalar: number): number[] => ensure().quatnormscl(q, scalar),
    normsq: (q: number[]): number => ensure().quatnormsq(q),
    print: (q: number[]): void => ensure().quatprint(q),
    random: (min: number, max: number): number[] => ensure().quatrandom(min, max),
    round: (q: number[]): number[] => ensure().quatround(q),
    scl: (q: number[], scalar: number): number[] => ensure().quatscl(q, scalar),
    slerp: (q1: number[], q2: number[], t: number): number[] => ensure().quatslerp(q1, q2, t),
    sub: (q1: number[], q2: number[]): number[] => ensure().quatsub(q1, q2),
    toRotation: (q: number[], v: number[]): number[] => ensure().quattoRotation(q, v)
};

export const vec3 = {
    abs: (v: number[]): number[] => ensure().vec3abs(v),
    add: (v1: number[], v2: number[]): number[] => ensure().vec3add(v1, v2),
    ang: (v: number[]): number[] => ensure().vec3ang(v),
    angBetween: (v1: number[], v2: number[]): number => ensure().vec3angBetween(v1, v2),
    copy: (v: number[]): number[] => ensure().vec3copy(v),
    cross: (v1: number[], v2: number[]): number[] => ensure().vec3cross(v1, v2),
    dist: (v1: number[], v2: number[]): number => ensure().vec3dist(v1, v2),
    distsq: (v1: number[], v2: number[]): number => ensure().vec3distsq(v1, v2),
    dot: (v1: number[], v2: number[]): number => ensure().vec3dot(v1, v2),
    init: (x: number, y: number, z: number): number[] => ensure().vec3init(x, y, z),
    interp: (v: number[], a: number, b: number, c: number): number[] => ensure().vec3interp(v, a, b, c),
    isEqual: (v1: number[], v2: number[]): boolean => ensure().vec3isEqual(v1, v2),
    isNormalized: (v: number[]): boolean => ensure().vec3isNormalized(v),
    isOrthogonal: (v1: number[], v2: number[]): boolean => ensure().vec3isOrthogonal(v1, v2),
    isParallel: (v1: number[], v2: number[]): boolean => ensure().vec3isParallel(v1, v2),
    isZero: (v: number[]): boolean => ensure().vec3isZero(v),
    neg: (v: number[]): number[] => ensure().vec3neg(v),
    norm: (v: number[]): number => ensure().vec3norm(v),
    normalize: (v: number[]): number[] => ensure().vec3normalize(v),
    normscl: (v: number[], scalar: number): number[] => ensure().vec3normscl(v, scalar),
    normsq: (v: number[]): number => ensure().vec3normsq(v),
    oproj: (v1: number[], v2: number[]): number[] => ensure().vec3oproj(v1, v2),
    print: (v: number[]): void => ensure().vec3print(v),
    proj: (v1: number[], v2: number[]): number[] => ensure().vec3proj(v1, v2),
    random: (min: number, max: number): number[] => ensure().vec3random(min, max),
    reflect: (v1: number[], v2: number[]): number[] => ensure().vec3reflect(v1, v2),
    refract: (v1: number[], v2: number[], refractiveIndex: number): number[] => ensure().vec3refract(v1, v2, refractiveIndex),
    round: (v: number[]): number[] => ensure().vec3round(v),
    scl: (v: number[], scalar: number): number[] => ensure().vec3scl(v, scalar),
    sub: (v1: number[], v2: number[]): number[] => ensure().vec3sub(v1, v2)
};

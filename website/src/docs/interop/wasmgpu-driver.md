# WasmGPU.driver

## Summary
WasmGPU.driver exposes the built-in Rust/WebAssembly driver memory used by WasmGPU itself.
Use it when you need typed access to that internal linear memory, heap- or frame-scoped `WasmSlice` allocations, or a caller-managed `WasmHeapArena`.
This surface is separate from `WasmGPU.webassembly`, which wraps foreign WebAssembly modules and memories.

## Syntax
```ts
WasmGPU.driver: WebAssemblyDriver
const driver = wgpu.driver;

import { driver } from "wasmgpu";
```

## Parameters
This accessor does not take parameters.

## Returns
`WebAssemblyDriver` - Built-in driver memory helpers and typed allocation entry points.

## Type Details
```ts
type WebAssemblyDriver = {
    buffer(): ArrayBufferLike;
    bytes(): Uint8Array;
    isSharedMemory(): boolean;
    requireSharedMemory(): SharedArrayBuffer;
    view<T extends WasmTypedArray>(ctor: WasmTypedArrayConstructor<T>, ptr: number, len: number): T;
    viewOn<T extends WasmTypedArray>(ctor: WasmTypedArrayConstructor<T>, buffer: ArrayBufferLike, ptr: number, len: number): T;
    createHeapArena(capBytes: number, align?: number): WasmHeapArena;
    viewFromHandle(buffer: ArrayBufferLike, handle: WasmSliceHandle): ArrayBufferView;
    heap: {
        allocF32(len: number): WasmSlice<Float32Array>;
        allocU32(len: number): WasmSlice<Uint32Array>;
        allocI32(len: number): WasmSlice<Int32Array>;
        allocU8(len: number, align?: number): WasmSlice<Uint8Array>;
    };
    frame: {
        allocF32(len: number): WasmSlice<Float32Array>;
        allocU32(len: number): WasmSlice<Uint32Array>;
        allocI32(len: number): WasmSlice<Int32Array>;
        allocU8(len: number, align?: number): WasmSlice<Uint8Array>;
    };
};
```

#### Driver Helpers
- `buffer()` returns the current internal WebAssembly linear-memory buffer object.
- `bytes()` returns a byte-wide `Uint8Array` view over the same memory.
- `isSharedMemory()` reports whether that memory is backed by `SharedArrayBuffer`.
- `requireSharedMemory()` returns the shared buffer or throws when the current build/runtime is not cross-origin isolated.
- `view()` creates a typed array over the current internal memory at a Wasm pointer.
- `viewOn()` does the same on an explicit buffer, which is useful after calling `buffer()` or `requireSharedMemory()`.
- `createHeapArena()` creates the same `WasmHeapArena` returned by [WasmGPU.createHeapArena](./wasmgpu-createheaparena.md).
- `heap.alloc*()` returns heap-owned `WasmSlice` objects that stay valid until freed.
- `frame.alloc*()` returns frame-scoped `WasmSlice` objects that become invalid after the frame arena resets.

#### WasmSlice
`WasmSlice` is the typed allocation wrapper returned by `driver.heap.alloc*()`, `driver.frame.alloc*()`, and `WasmHeapArena.alloc*()`.

```ts
type WasmSliceKind = "heap" | "frame" | "arena";
type WasmSliceDType = "f32" | "u32" | "i32" | "u8";

type WasmSliceHandle = {
    kind: WasmSliceKind;
    dtype: WasmSliceDType;
    ptr: number;
    length: number;
    epoch?: number;
};

type WasmSlice<T extends ArrayBufferView> = {
    readonly kind: WasmSliceKind;
    readonly dtype: WasmSliceDType;
    readonly ptr: number;
    readonly length: number;
    readonly byteLength: number;
    isAlive(): boolean;
    assertAlive(): void;
    buffer(): ArrayBufferLike;
    view(): T;
    write(src: ArrayLike<number> | null | undefined, srcOffset?: number, zeroFill?: boolean): void;
    handle(): WasmSliceHandle;
    free(): void;
};
```

#### WasmSlice Notes
- `kind` reports whether the slice came from the global heap allocator (`"heap"`), the global frame allocator (`"frame"`), or a custom `WasmHeapArena` (`"arena"`).
- `dtype` is one of `f32`, `u32`, `i32`, or `u8`.
- `buffer()` and `view()` return live access to the current internal driver memory.
- `write()` copies source data into the slice and can zero-fill the unused tail when needed.
- `handle()` serializes the slice pointer, element layout, and epoch metadata for later reconstruction.
- `free()` is only valid for heap-owned slices. Frame and arena slices are invalidated by reset-driven lifetime changes instead.

## Notes
- `WasmGPU.create()` initializes the built-in WebAssembly driver automatically. If you use the module-level `driver` export before creating a `WasmGPU` instance, initialize WebAssembly first.
- `driver.view()` and `driver.bytes()` always operate on WasmGPU's internal Rust/WebAssembly memory. Use [WasmGPU.webassembly](./wasmgpu-webassembly.md) for foreign `WebAssembly.Memory` objects.
- `driver.frame.alloc*()` slices track the frame-arena epoch. After `frameArena.reset()`, the next `WasmGPU.run()` tick, or a standalone `WasmGPU.render()` call that resets the frame arena, old frame slices fail `isAlive()` and `assertAlive()`.
- `driver.viewFromHandle(driver.buffer(), handle)` can reconstruct a typed view from a serialized `WasmSlice.handle()` when you already have the matching memory buffer.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const weights = wgpu.driver.heap.allocF32(4);
weights.write([0.25, 0.5, 0.75, 1.0]);

const liveView = wgpu.driver.view(Float32Array, weights.ptr, weights.length);
console.log(weights.kind, weights.dtype, liveView[2]);

weights.free();
```

## See Also
- [WasmGPU.frameArena](./wasmgpu-framearena.md)
- [WasmGPU.createHeapArena](./wasmgpu-createheaparena.md)
- [WasmGPU.webassembly](./wasmgpu-webassembly.md)
- [WasmGPU.python](./wasmgpu-python.md)

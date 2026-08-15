# WasmGPU.python

## Summary
WasmGPU.python provides ndarray-oriented data transfer utilities for Python-JS interop workflows.
It supports sending arrays into Wasm memory, receiving typed views/copies back, in-place updates, and freeing heap-owned transfers.
This API is designed to pair with Pyodide or any bridge that exposes Python buffers.
It is separate from [WasmGPU.webassembly](./wasmgpu-webassembly.md), which reads directly from foreign WebAssembly modules.
Heap handles must be passed to `free()` when no longer needed. Freeing is idempotent, and all later access through that handle is rejected.

## Syntax
```ts
WasmGPU.python: PythonInterop
const py = wgpu.python;
```

## Parameters
This accessor does not take parameters.

## Returns
`PythonInterop` - Object with send/view/bytes/copy/receive/free methods.

## Type Details
```ts
type WasmNdarrayHandle = {
    kind: "heap" | "frame" | "arena";
    dtype: "i8" | "u8" | "i16" | "u16" | "i32" | "u32" | "f32" | "f64";
    shape: number[];
    ptr: number;
    length: number;
    byteLength: number;
    epoch?: number;
};

type PythonInterop = {
    sendNdarray(src: PythonArraySource, options?: SendNdarrayOptions): WasmNdarrayHandle;
    view(handle: WasmNdarrayHandle): NumberTypedArray;
    bytes(handle: WasmNdarrayHandle): Uint8Array;
    copyInto(handle: WasmNdarrayHandle, src: PythonArraySource, options?: { dtype?: DType }): void;
    receiveNdarray(handle: WasmNdarrayHandle, options?: { copy?: boolean }): { dtype: DType; shape: number[]; data: NumberTypedArray };
    free(handle: WasmNdarrayHandle): void;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const source = new Float32Array([1, 2, 3, 4, 5, 6]);
const handle = wgpu.python.sendNdarray(source, { dtype: "f32", shape: [2, 3], allocator: "heap" });
const view = wgpu.python.view(handle);
view[0] = 99;

const transfer = wgpu.python.receiveNdarray(handle, { copy: true });
console.log(transfer.dtype, transfer.shape, transfer.data[0]);
wgpu.python.free(handle);
```

## See Also
- [WasmGPU.python.sendNdarray](./wasmgpu-python-sendndarray.md)
- [WasmGPU.python.receiveNdarray](./wasmgpu-python-receivendarray.md)
- [WasmGPU.python.free](./wasmgpu-python-free.md)
- [WasmGPU.createHeapArena](./wasmgpu-createheaparena.md)
- [WasmGPU.frameArena](./wasmgpu-framearena.md)
- [WasmGPU.webassembly](./wasmgpu-webassembly.md)

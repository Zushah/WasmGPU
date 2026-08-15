# WasmGPU.python.sendNdarray

## Summary
WasmGPU.python.sendNdarray copies numeric array data into Wasm memory and returns a typed handle.
Input can be a plain typed array, a Python buffer-like object, or a proxy exposing `getBuffer()`.
Allocator choice controls lifetime semantics (`heap`, `frame`, or custom `WasmHeapArena`).

## Syntax
```ts
WasmGPU.python.sendNdarray(src: PythonArraySource, options?: SendNdarrayOptions): WasmNdarrayHandle
const handle = wgpu.python.sendNdarray(src, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `PythonArraySource` | Yes | Source array data (`ArrayBufferView`, `PyBufferLike`, or `PyProxyLike`). |
| `options` | `SendNdarrayOptions` | No | Optional dtype, shape, and allocator selection. |

## Returns
`WasmNdarrayHandle` - Handle describing destination memory kind, dtype, shape, pointer, and length.

## Type Details
```ts
type PythonArraySource = ArrayBufferView | PyBufferLike | PyProxyLike;

type SendNdarrayOptions = {
    dtype?: "i8" | "u8" | "i16" | "u16" | "i32" | "u32" | "f32" | "f64";
    shape?: ReadonlyArray<number>;
    allocator?: "heap" | "frame" | WasmHeapArena;
};

type WasmNdarrayHandle = {
    kind: "heap" | "frame" | "arena";
    dtype: "i8" | "u8" | "i16" | "u16" | "i32" | "u32" | "f32" | "f64";
    shape: number[];
    ptr: number;
    length: number;
    byteLength: number;
    epoch?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const source = new Float32Array([1, 2, 3, 4, 5, 6]);
const handle = wgpu.python.sendNdarray(source, {
    dtype: "f32",
    shape: [2, 3],
    allocator: "heap"
});
console.log(handle.kind, handle.ptr, handle.shape);
```

## See Also
- [WasmGPU.python.view](./wasmgpu-python-view.md)
- [WasmGPU.python.receiveNdarray](./wasmgpu-python-receivendarray.md)
- [WasmGPU.python.free](./wasmgpu-python-free.md)

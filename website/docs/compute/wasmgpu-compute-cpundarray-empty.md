# WasmGPU.compute.CPUndarray.empty

## Summary
WasmGPU.compute.CPUndarray.empty allocates a CPU-resident ndarray in WebAssembly memory.
You provide dtype and layout metadata; storage is allocated but not initialized.
Use this when you need explicit control over shape/strides before filling data.
For zero-initialized allocation, use `CPUndarray.zeros`.

## Syntax
```ts
WasmGPU.compute.CPUndarray.empty(dtype: DType, layout: NdLayoutDescriptor): CPUndarray
const a = wgpu.compute.CPUndarray.empty(dtype, layout);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dtype` | `DType` | Yes | Element data type (`i8`, `u8`, `i16`, `u16`, `i32`, `u32`, `f32`, `f64`). |
| `layout` | `NdLayoutDescriptor` | Yes | Shape plus optional byte strides and byte offset. |

## Returns
`CPUndarray` - Newly allocated CPU ndarray in wasm memory.

## Type Details
```ts
type NdLayoutDescriptor = {
    shape: ReadonlyArray<number>;
    stridesBytes?: ReadonlyArray<number>;
    offsetBytes?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.empty("f32", { shape: [4, 4] });
a.set(1.25, 0, 0);
console.log(a.get(0, 0), a.layout());
a.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.zeros](./wasmgpu-compute-cpundarray-zeros.md)
- [WasmGPU.compute.CPUndarray.fromArray](./wasmgpu-compute-cpundarray-fromarray.md)
- [WasmGPU.compute.CPUndarray.data](./wasmgpu-compute-cpundarray-data.md)
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)

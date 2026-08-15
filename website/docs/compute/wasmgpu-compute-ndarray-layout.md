# WasmGPU.compute.ndarray.layout

## Summary
WasmGPU.compute.ndarray.layout returns a copy of the ndarray layout metadata.
The result includes shape, byte strides, and byte offset.
Use this when reconstructing equivalent arrays, wrapping buffers, or debugging indexing behavior.
The returned arrays are copies, so modifying them does not mutate the original ndarray.

## Syntax
```ts
WasmGPU.compute.ndarray.layout(): { shape: number[]; stridesBytes: number[]; offsetBytes: number }
const layout = ndarray.layout();
```

## Parameters
This API does not take parameters.

## Returns
`{ shape: number[]; stridesBytes: number[]; offsetBytes: number }` - Copy of ndarray layout metadata.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.empty("u32", { shape: [16, 8] });
const layout = a.layout();
console.log(layout.shape, layout.stridesBytes, layout.offsetBytes);
a.destroy();
```

## See Also
- [WasmGPU.compute.ndarray.ndim](./wasmgpu-compute-ndarray-ndim.md)
- [WasmGPU.compute.ndarray.isContiguousC](./wasmgpu-compute-ndarray-iscontiguousc.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.GPUndarray.wrap](./wasmgpu-compute-gpundarray-wrap.md)
- [WasmGPU.compute.ndarray.residency](./wasmgpu-compute-ndarray-residency.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)

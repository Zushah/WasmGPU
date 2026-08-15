# WasmGPU.compute.GPUndarray.wrap

## Summary
WasmGPU.compute.GPUndarray.wrap creates ndarray metadata over an existing `StorageBuffer`.
No allocation or copy happens; the wrapped buffer is treated as backing storage.
Use this to reinterpret existing buffers as typed multidimensional arrays.
`baseOffsetBytes` lets you place the ndarray view inside a larger shared buffer.

## Syntax
```ts
WasmGPU.compute.GPUndarray.wrap(buffer: StorageBuffer, dtype: DType, layout: NdLayoutDescriptor, baseOffsetBytes?: number): GPUndarray
const g = wgpu.compute.GPUndarray.wrap(buffer, dtype, layout, baseOffsetBytes);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `StorageBuffer` | Yes | Existing storage buffer to wrap. |
| `dtype` | `DType` | Yes | Element data type for interpretation. |
| `layout` | `NdLayoutDescriptor` | Yes | Shape plus optional strides/offset metadata. |
| `baseOffsetBytes` | `number` | No | Byte offset into `buffer` where ndarray backing begins. |

## Returns
`GPUndarray` - GPU ndarray view over the provided storage buffer.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const buffer = wgpu.compute.createStorageBuffer({ byteLength: 4096, copySrc: true, copyDst: true });
const g = wgpu.compute.GPUndarray.wrap(buffer, "u32", { shape: [256] }, 0);

console.log(g.bindingResource());
```

## See Also
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)
- [WasmGPU.compute.GPUndarray.bindingResource](./wasmgpu-compute-gpundarray-bindingresource.md)
- [WasmGPU.compute.GPUndarray.readbackToCPU](./wasmgpu-compute-gpundarray-readbacktocpu.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.ndarray.layout](./wasmgpu-compute-ndarray-layout.md)

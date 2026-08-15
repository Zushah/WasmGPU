# WasmGPU.compute.GPUndarray.empty

## Summary
WasmGPU.compute.GPUndarray.empty allocates a GPU-resident ndarray backed by a storage buffer.
You provide dtype and layout metadata; the buffer is allocated but not initialized.
Use this for output tensors, scratch arrays, or GPU-only workflows.
Descriptor options map to storage-buffer creation flags.

## Syntax
```ts
WasmGPU.compute.GPUndarray.empty(ctx: { device: GPUDevice; queue: GPUQueue }, dtype: DType, layout: NdLayoutDescriptor, desc?: Omit<StorageBufferDescriptor, "byteLength" | "data">): GPUndarray
const g = wgpu.compute.GPUndarray.empty(wgpu.gpu, dtype, layout, desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `{ device: GPUDevice; queue: GPUQueue }` | Yes | GPU context used to allocate backing storage. |
| `dtype` | `DType` | Yes | Element data type. |
| `layout` | `NdLayoutDescriptor` | Yes | Shape plus optional byte strides and byte offset. |
| `desc` | `Omit<StorageBufferDescriptor, "byteLength" \| "data">` | No | Optional storage-buffer descriptor overrides. |

## Returns
`GPUndarray` - Newly allocated GPU ndarray.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const g = wgpu.compute.GPUndarray.empty(wgpu.gpu, "f32", { shape: [128, 128] }, { copySrc: true });
console.log(g.residency, g.layout());
```

## See Also
- [WasmGPU.compute.GPUndarray.wrap](./wasmgpu-compute-gpundarray-wrap.md)
- [WasmGPU.compute.GPUndarray.readbackToCPU](./wasmgpu-compute-gpundarray-readbacktocpu.md)
- [WasmGPU.compute.GPUndarray.bindingResource](./wasmgpu-compute-gpundarray-bindingresource.md)
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)

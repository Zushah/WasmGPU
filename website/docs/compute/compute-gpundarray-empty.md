# compute.GPUndarray.empty

## Summary
compute.GPUndarray.empty allocates a GPU-resident ndarray backed by a storage buffer.
You provide dtype and layout metadata; the buffer is allocated but not initialized.
Use this for output tensors, scratch arrays, or GPU-only workflows.
Descriptor options map to storage-buffer creation flags.

## Syntax
```ts
WasmGPU.compute.GPUndarray.empty(ctx: { device: GPUDevice; queue: GPUQueue; readback?: ReadbackRing }, dtype: DType, layout: NdLayoutDescriptor, desc?: Omit<StorageBufferDescriptor, "byteLength" | "data">): GPUndarray
const g = wgpu.compute.GPUndarray.empty(wgpu.compute, dtype, layout, desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `{ device: GPUDevice; queue: GPUQueue; readback?: ReadbackRing }` | Yes | GPU context used to allocate backing storage. Passing `wgpu.compute` also associates its shared readback ring with the result. |
| `dtype` | `DType` | Yes | Element data type. |
| `layout` | `NdLayoutDescriptor` | Yes | Shape plus optional byte strides and byte offset. |
| `desc` | `Omit<StorageBufferDescriptor, "byteLength" \| "data">` | No | Optional storage-buffer descriptor overrides. |

## Returns
`GPUndarray` - Newly allocated GPU ndarray.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const g = wgpu.compute.GPUndarray.empty(wgpu.compute, "f32", { shape: [128, 128] }, { copySrc: true });
console.log(g.residency, g.layout());
```

## See Also
- [compute.GPUndarray.wrap](./compute-gpundarray-wrap.md)
- [compute.GPUndarray#readbackToCPU](./compute-gpundarray-readbacktocpu.md)
- [compute.GPUndarray#bindingResource](./compute-gpundarray-bindingresource.md)
- [compute.CPUndarray#uploadToGPU](./compute-cpundarray-uploadtogpu.md)
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)

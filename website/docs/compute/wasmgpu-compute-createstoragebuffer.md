# WasmGPU.compute.createStorageBuffer

## Summary
WasmGPU.compute.createStorageBuffer allocates a storage-capable GPU buffer wrapper.
Use this for read/write compute data, intermediate buffers, and kernel inputs/outputs.
By default it is writable from the queue (`copyDst: true`) but not readable back unless `copySrc: true` is enabled.
The returned `StorageBuffer` exposes convenience methods like `write`, `read`, and `readAs`.

## Syntax
```ts
WasmGPU.compute.createStorageBuffer(desc: StorageBufferDescriptor): StorageBuffer
const storage = wgpu.compute.createStorageBuffer(desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `desc` | `StorageBufferDescriptor` | Yes | Descriptor that controls initial data, byte length, and usage flags for the storage buffer. |

## Returns
`StorageBuffer` - Managed storage buffer wrapper with read/write helpers.

## Type Details
### StorageBufferDescriptor
```ts
type StorageBufferDescriptor = {
    label?: string;
    byteLength?: number;
    data?: BufferSource;
    copyDst?: boolean;
    copySrc?: boolean;
    usage?: GPUBufferUsageFlags;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const values = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
const storage = wgpu.compute.createStorageBuffer({
    label: "values",
    data: values,
    copySrc: true,
    copyDst: true
});

console.log(storage.byteLength, storage.canReadback);
```

## See Also
- [WasmGPU.compute.createUniformBuffer](./wasmgpu-compute-createuniformbuffer.md)
- [WasmGPU.compute.createStorageBuffer(...).canReadback](./wasmgpu-compute-createstoragebuffer-canreadback.md)
- [WasmGPU.compute.createStorageBuffer(...).read](./wasmgpu-compute-createstoragebuffer-read.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.createPipeline](./wasmgpu-compute-createpipeline.md)

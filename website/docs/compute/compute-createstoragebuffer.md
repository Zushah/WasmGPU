# compute.createStorageBuffer

## Summary
compute.createStorageBuffer allocates a storage-capable GPU buffer wrapper.
Use this for read/write compute data, intermediate buffers, and kernel inputs/outputs.
By default it is writable from the queue (`copyDst: true`) but not readable back unless `copySrc: true` is enabled.
The returned `StorageBuffer` exposes convenience methods like `write`, `read`, and `readAs`.
When `data` is supplied, its byte length takes precedence over `byteLength` and its bytes initialize the buffer. Logical sizes may be zero or not divisible by four; the underlying WebGPU allocation is padded to at least four bytes and to four-byte alignment.

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
`StorageBuffer` - Caller-owned storage buffer wrapper with read/write helpers. Destroy its underlying allocation when it is no longer needed; destroying the compute service does not destroy buffers returned by this factory.

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
- [compute.createUniformBuffer](./compute-createuniformbuffer.md)
- [compute.createStorageBuffer#canReadback](./compute-createstoragebuffer-canreadback.md)
- [compute.createStorageBuffer#read](./compute-createstoragebuffer-read.md)
- [compute.dispatch](./compute-dispatch.md)
- [compute.createPipeline](./compute-createpipeline.md)

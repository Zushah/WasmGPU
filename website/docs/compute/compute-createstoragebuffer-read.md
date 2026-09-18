# compute.createStorageBuffer#read

## Summary
compute.createStorageBuffer#read copies bytes from a storage buffer into CPU memory.
The buffer must support readback (`copySrc: true`) and offsets must be 4-byte aligned.
When `sizeBytes` is omitted, it reads from `srcOffsetBytes` to the logical end of the buffer.
Use this for raw byte-level readback before custom decoding.

## Syntax
```ts
WasmGPU.compute.createStorageBuffer(...).read(srcOffsetBytes?: number, sizeBytes?: number): Promise<ArrayBuffer>
const bytes = await storage.read(srcOffsetBytes, sizeBytes);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `srcOffsetBytes` | `number` | No | Byte offset in the storage buffer where readback starts (must be 4-byte aligned). |
| `sizeBytes` | `number` | No | Number of bytes to read; defaults to remaining bytes from `srcOffsetBytes`. |

## Returns
`Promise<ArrayBuffer>` - Resolves to a CPU-owned byte buffer containing the requested data range.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const values = new Float32Array([10, 20, 30, 40]);
const storage = wgpu.compute.createStorageBuffer({ data: values, copySrc: true });

const bytes = await storage.read(0, values.byteLength);
console.log(bytes.byteLength);
```

## See Also
- [compute.createStorageBuffer#canReadback](./compute-createstoragebuffer-canreadback.md)
- [compute.createStorageBuffer#readAs](./compute-createstoragebuffer-readas.md)
- [compute.readback.read](./compute-readback-read.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
- [compute.createReadbackRing](./compute-createreadbackring.md)

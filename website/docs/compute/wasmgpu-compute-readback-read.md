# WasmGPU.compute.readback.read

## Summary
WasmGPU.compute.readback.read copies a byte range from a readable GPU source into CPU memory.
Supported sources are a raw `GPUBuffer` or WasmGPU `StorageBuffer`.
This method uses staging buffers from the ring, allowing repeated async reads without creating a staging buffer each call.
Offsets must be 4-byte aligned and range checks are validated.

## Syntax
```ts
WasmGPU.compute.readback.read(src: ReadbackSource, srcOffsetBytes?: number, sizeBytes?: number, opts?: { label?: string }): Promise<ArrayBuffer>
const bytes = await wgpu.compute.readback.read(src, srcOffsetBytes, sizeBytes, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `ReadbackSource` | Yes | Source GPU buffer (`GPUBuffer` or `StorageBuffer`) to copy from. |
| `srcOffsetBytes` | `number` | No | Source byte offset (must be integer, non-negative, and 4-byte aligned). |
| `sizeBytes` | `number` | No | Requested byte count; defaults to remaining source bytes. |
| `opts` | `{ label?: string }` | No | Optional debug label for encoder/copy instrumentation. |

## Returns
`Promise<ArrayBuffer>` - Resolves to CPU-owned bytes for the requested range.

## Type Details
```ts
type ReadbackSource = GPUBuffer | StorageBuffer;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const storage = wgpu.compute.createStorageBuffer({ data: new Uint32Array([4, 8, 12, 16]), copySrc: true });
const bytes = await wgpu.compute.readback.read(storage, 0, 16, { label: "read-u32" });

console.log(bytes.byteLength);
```

## See Also
- [WasmGPU.compute.readback.readAs](./wasmgpu-compute-readback-readas.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.readback.readScalarF32](./wasmgpu-compute-readback-readscalarf32.md)
- [WasmGPU.compute.readback.readScalarU32](./wasmgpu-compute-readback-readscalaru32.md)

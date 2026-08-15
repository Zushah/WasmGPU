# WasmGPU.compute.readback.readScalarF32

## Summary
WasmGPU.compute.readback.readScalarF32 reads a single `f32` scalar from a GPU source.
It is equivalent to `readAs(Float32Array, ..., 4)` followed by reading index `0`.
Use this for scalar reductions such as sum, min, max, or other single-value outputs.
Source offset is in bytes and should be 4-byte aligned.

## Syntax
```ts
WasmGPU.compute.readback.readScalarF32(src: ReadbackSource, srcOffsetBytes?: number, opts?: { label?: string }): Promise<number>
const value = await wgpu.compute.readback.readScalarF32(src, srcOffsetBytes, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `ReadbackSource` | Yes | Source GPU buffer to read from. |
| `srcOffsetBytes` | `number` | No | Byte offset where the scalar starts (default `0`). |
| `opts` | `{ label?: string }` | No | Optional debug label for readback instrumentation. |

## Returns
`Promise<number>` - Resolves to the scalar `f32` value read from the source buffer.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const storage = wgpu.compute.createStorageBuffer({ data: new Float32Array([42]), copySrc: true });
const value = await wgpu.compute.readback.readScalarF32(storage);

console.log(value);
```

## See Also
- [WasmGPU.compute.readback.read](./wasmgpu-compute-readback-read.md)
- [WasmGPU.compute.readback.readAs](./wasmgpu-compute-readback-readas.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.readback.readScalarU32](./wasmgpu-compute-readback-readscalaru32.md)
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)

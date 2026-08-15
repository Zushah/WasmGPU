# WasmGPU.compute.readback.readF32

## Summary
WasmGPU.compute.readback.readF32 reads `f32` elements from a GPU source and returns a `Float32Array`.
Offsets and counts are specified in elements, not bytes.
Internally this maps to byte offsets (`elemOffset * 4`) and byte lengths (`elemCount * 4`).
Use this for common float-result readback after compute dispatches.

## Syntax
```ts
WasmGPU.compute.readback.readF32(src: ReadbackSource, elemOffset?: number, elemCount?: number, opts?: { label?: string }): Promise<Float32Array>
const out = await wgpu.compute.readback.readF32(src, elemOffset, elemCount, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `ReadbackSource` | Yes | Source GPU buffer to read from. |
| `elemOffset` | `number` | No | Element offset within the source (default `0`). |
| `elemCount` | `number` | No | Number of `f32` elements to read (default reads remaining elements). |
| `opts` | `{ label?: string }` | No | Optional debug label for copy instrumentation. |

## Returns
`Promise<Float32Array>` - Resolves to float data read from GPU memory.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const storage = wgpu.compute.createStorageBuffer({ data: new Float32Array([5, 10, 15, 20]), copySrc: true });
const out = await wgpu.compute.readback.readF32(storage, 1, 2);

console.log(Array.from(out));
```

## See Also
- [WasmGPU.compute.readback.read](./wasmgpu-compute-readback-read.md)
- [WasmGPU.compute.readback.readAs](./wasmgpu-compute-readback-readas.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.readback.readScalarF32](./wasmgpu-compute-readback-readscalarf32.md)
- [WasmGPU.compute.createStorageBuffer(...).readAs](./wasmgpu-compute-createstoragebuffer-readas.md)

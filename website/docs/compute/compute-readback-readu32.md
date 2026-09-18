# compute.readback.readU32

## Summary
compute.readback.readU32 reads `u32` elements from a GPU source and returns a `Uint32Array`.
Offsets and counts are expressed in elements rather than bytes.
This is convenient for counters, indices, histograms, and prefix-scan outputs.
Use it when your compute output is naturally unsigned integer data.

## Syntax
```ts
WasmGPU.compute.readback.readU32(src: ReadbackSource, elemOffset?: number, elemCount?: number, opts?: { label?: string }): Promise<Uint32Array>
const out = await wgpu.compute.readback.readU32(src, elemOffset, elemCount, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `ReadbackSource` | Yes | Source GPU buffer to read from. |
| `elemOffset` | `number` | No | Element offset within the source (default `0`). |
| `elemCount` | `number` | No | Number of `u32` elements to read (default reads remaining elements). |
| `opts` | `{ label?: string }` | No | Optional debug label for copy instrumentation. |

## Returns
`Promise<Uint32Array>` - Resolves to unsigned integer data from GPU memory.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const storage = wgpu.compute.createStorageBuffer({ data: new Uint32Array([3, 6, 9, 12]), copySrc: true });
const out = await wgpu.compute.readback.readU32(storage, 0, 4);

console.log(Array.from(out));
```

## See Also
- [compute.readback.read](./compute-readback-read.md)
- [compute.readback.readAs](./compute-readback-readas.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
- [compute.readback.readScalarU32](./compute-readback-readscalaru32.md)
- [compute.createStorageBuffer#readAs](./compute-createstoragebuffer-readas.md)

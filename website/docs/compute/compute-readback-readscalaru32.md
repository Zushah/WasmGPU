# compute.readback.readScalarU32

## Summary
compute.readback.readScalarU32 reads one `u32` scalar from a GPU source.
It is a convenience wrapper for counter-like outputs where only one unsigned value is needed.
Use this for histogram totals, compacted-count outputs, and index reductions.
Source offsets are byte-based and must satisfy readback alignment requirements.

## Syntax
```ts
WasmGPU.compute.readback.readScalarU32(src: ReadbackSource, srcOffsetBytes?: number, opts?: { label?: string }): Promise<number>
const value = await wgpu.compute.readback.readScalarU32(src, srcOffsetBytes, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `ReadbackSource` | Yes | Source GPU buffer to read from. |
| `srcOffsetBytes` | `number` | No | Byte offset where the scalar starts (default `0`). |
| `opts` | `{ label?: string }` | No | Optional debug label for readback instrumentation. |

## Returns
`Promise<number>` - Resolves to the unsigned 32-bit scalar value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const storage = wgpu.compute.createStorageBuffer({ data: new Uint32Array([123]), copySrc: true });
const value = await wgpu.compute.readback.readScalarU32(storage);

console.log(value);
```

## See Also
- [compute.readback.read](./compute-readback-read.md)
- [compute.readback.readAs](./compute-readback-readas.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
- [compute.readback.readScalarF32](./compute-readback-readscalarf32.md)
- [compute.kernels.compactU32](./compute-kernels-compactu32.md)

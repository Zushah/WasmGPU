# compute.kernels.minU32

## Summary
compute.kernels.minU32 computes the minimum `u32` value in selected input elements.
It is shorthand for `reduceU32(input, "min", opts)`.
The result is written to a one-scalar output buffer.
Use this for lower-bound checks and compact-range analysis on integer datasets.
It inherits `reduceU32`'s count, output, encoder, ownership, and empty-input contracts; an empty selection produces `0xffffffff`.

## Syntax
```ts
WasmGPU.compute.kernels.minU32(input: StorageBuffer, opts?: ReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.minU32(input, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `u32` data buffer. |
| `opts` | `ReduceOptions` | No | Optional reduction execution settings. |

## Returns
`StorageBuffer` - Buffer containing one `u32` minimum value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Uint32Array([9, 4, 11]), copySrc: true });
const out = wgpu.compute.kernels.minU32(input);
console.log(await wgpu.compute.readback.readScalarU32(out));
```

## See Also
- [compute.kernels.reduceU32](./compute-kernels-reduceu32.md)
- [compute.kernels.sumU32](./compute-kernels-sumu32.md)
- [compute.kernels.maxU32](./compute-kernels-maxu32.md)
- [compute.readback.readScalarU32](./compute-readback-readscalaru32.md)
- [compute.kernels.minF32](./compute-kernels-minf32.md)

# compute.kernels.maxU32

## Summary
compute.kernels.maxU32 computes the maximum `u32` value across selected input elements.
It is shorthand for `reduceU32(input, "max", opts)`.
The result is written to a one-scalar storage buffer.
Use this for upper-bound checks and key-range diagnostics.
It inherits `reduceU32`'s count, output, encoder, ownership, and empty-input contracts; an empty selection produces `0`.

## Syntax
```ts
WasmGPU.compute.kernels.maxU32(input: StorageBuffer, opts?: ReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.maxU32(input, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `u32` data buffer. |
| `opts` | `ReduceOptions` | No | Optional reduction execution settings. |

## Returns
`StorageBuffer` - Buffer containing one `u32` maximum value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Uint32Array([9, 4, 11]), copySrc: true });
const out = wgpu.compute.kernels.maxU32(input);
console.log(await wgpu.compute.readback.readScalarU32(out));
```

## See Also
- [compute.kernels.reduceU32](./compute-kernels-reduceu32.md)
- [compute.kernels.sumU32](./compute-kernels-sumu32.md)
- [compute.kernels.minU32](./compute-kernels-minu32.md)
- [compute.readback.readScalarU32](./compute-readback-readscalaru32.md)
- [compute.kernels.maxF32](./compute-kernels-maxf32.md)

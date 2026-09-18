# compute.kernels.sumU32

## Summary
compute.kernels.sumU32 computes the unsigned-integer sum of selected elements.
It is shorthand for `reduceU32(input, "sum", opts)`.
The output is a one-scalar storage buffer.
Use this for count aggregation and integer totals.
It inherits `reduceU32`'s count, output, encoder, ownership, and empty-input contracts; arithmetic wraps modulo 2³² and an empty selection produces `0`.

## Syntax
```ts
WasmGPU.compute.kernels.sumU32(input: StorageBuffer, opts?: ReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.sumU32(input, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `u32` data buffer. |
| `opts` | `ReduceOptions` | No | Optional reduction execution settings. |

## Returns
`StorageBuffer` - Buffer containing one `u32` sum value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 1, 2, 3]), copySrc: true });
const out = wgpu.compute.kernels.sumU32(input);
console.log(await wgpu.compute.readback.readScalarU32(out));
```

## See Also
- [compute.kernels.reduceU32](./compute-kernels-reduceu32.md)
- [compute.kernels.minU32](./compute-kernels-minu32.md)
- [compute.kernels.maxU32](./compute-kernels-maxu32.md)
- [compute.readback.readScalarU32](./compute-readback-readscalaru32.md)
- [compute.kernels.sumF32](./compute-kernels-sumf32.md)

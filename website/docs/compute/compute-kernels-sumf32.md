# compute.kernels.sumF32

## Summary
compute.kernels.sumF32 computes the floating-point sum of all selected input elements.
It is a convenience wrapper over `reduceF32(input, "sum", opts)`.
The result is written to a one-scalar output storage buffer.
Use this for totals, normalization factors, and statistics pipelines.
It inherits `reduceF32`'s count, output, encoder, ownership, and empty-input contracts; an empty selection produces `0`.

## Syntax
```ts
WasmGPU.compute.kernels.sumF32(input: StorageBuffer, opts?: ReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.sumF32(input, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `f32` data buffer. |
| `opts` | `ReduceOptions` | No | Optional reduction execution settings. |

## Returns
`StorageBuffer` - Buffer containing one `f32` sum value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([10, 20, 30]), copySrc: true });
const out = wgpu.compute.kernels.sumF32(input);
console.log(await wgpu.compute.readback.readScalarF32(out));
```

## See Also
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)
- [compute.kernels.minF32](./compute-kernels-minf32.md)
- [compute.kernels.maxF32](./compute-kernels-maxf32.md)
- [compute.readback.readScalarF32](./compute-readback-readscalarf32.md)
- [compute.kernels.sumU32](./compute-kernels-sumu32.md)

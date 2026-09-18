# compute.kernels.maxF32

## Summary
compute.kernels.maxF32 computes the maximum `f32` value across selected input elements.
It is a shorthand for `reduceF32(input, "max", opts)`.
The output buffer contains one scalar maximum value.
Use this for dynamic range estimation, clipping limits, and diagnostics.
It inherits `reduceF32`'s count, output, encoder, ownership, and empty-input contracts; an empty selection produces negative infinity.

## Syntax
```ts
WasmGPU.compute.kernels.maxF32(input: StorageBuffer, opts?: ReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.maxF32(input, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `f32` data buffer. |
| `opts` | `ReduceOptions` | No | Optional reduction execution settings. |

## Returns
`StorageBuffer` - Buffer containing one `f32` maximum value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([7, -2, 9]), copySrc: true });
const out = wgpu.compute.kernels.maxF32(input);
console.log(await wgpu.compute.readback.readScalarF32(out));
```

## See Also
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)
- [compute.kernels.sumF32](./compute-kernels-sumf32.md)
- [compute.kernels.minF32](./compute-kernels-minf32.md)
- [compute.readback.readScalarF32](./compute-readback-readscalarf32.md)
- [compute.kernels.maxU32](./compute-kernels-maxu32.md)

# WasmGPU.compute.kernels.sumU32

## Summary
WasmGPU.compute.kernels.sumU32 computes the unsigned-integer sum of selected elements.
It is shorthand for `reduceU32(input, "sum", opts)`.
The output is a one-scalar storage buffer.
Use this for count aggregation and integer totals.

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
- [WasmGPU.compute.kernels.reduceU32](./wasmgpu-compute-kernels-reduceu32.md)
- [WasmGPU.compute.kernels.minU32](./wasmgpu-compute-kernels-minu32.md)
- [WasmGPU.compute.kernels.maxU32](./wasmgpu-compute-kernels-maxu32.md)
- [WasmGPU.compute.readback.readScalarU32](./wasmgpu-compute-readback-readscalaru32.md)
- [WasmGPU.compute.kernels.sumF32](./wasmgpu-compute-kernels-sumf32.md)

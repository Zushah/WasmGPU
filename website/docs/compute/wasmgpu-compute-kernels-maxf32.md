# WasmGPU.compute.kernels.maxF32

## Summary
WasmGPU.compute.kernels.maxF32 computes the maximum `f32` value across selected input elements.
It is a shorthand for `reduceF32(input, "max", opts)`.
The output buffer contains one scalar maximum value.
Use this for dynamic range estimation, clipping limits, and diagnostics.

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
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)
- [WasmGPU.compute.kernels.sumF32](./wasmgpu-compute-kernels-sumf32.md)
- [WasmGPU.compute.kernels.minF32](./wasmgpu-compute-kernels-minf32.md)
- [WasmGPU.compute.readback.readScalarF32](./wasmgpu-compute-readback-readscalarf32.md)
- [WasmGPU.compute.kernels.maxU32](./wasmgpu-compute-kernels-maxu32.md)

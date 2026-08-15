# WasmGPU.compute.kernels.argmaxF32

## Summary
WasmGPU.compute.kernels.argmaxF32 finds the index/value pair for the maximum `f32` element.
It is a convenience wrapper over `argReduceF32(input, "argmax", opts)`.
Output uses the standard 8-byte pair layout: value bits and index.
Use this for peak-value localization and top-element indexing.

## Syntax
```ts
WasmGPU.compute.kernels.argmaxF32(input: StorageBuffer, opts?: ArgReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.argmaxF32(input, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source float buffer. |
| `opts` | `ArgReduceOptions` | No | Optional execution settings. |

## Returns
`StorageBuffer` - 8-byte result buffer containing maximum value bits and index.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([3, -2, 11, 8]), copySrc: true });
const out = wgpu.compute.kernels.argmaxF32(input);
console.log(Array.from(await wgpu.compute.readback.readU32(out, 0, 2)));
```

## See Also
- [WasmGPU.compute.kernels.argReduceF32](./wasmgpu-compute-kernels-argreducef32.md)
- [WasmGPU.compute.kernels.argminF32](./wasmgpu-compute-kernels-argminf32.md)
- [WasmGPU.compute.kernels.maxF32](./wasmgpu-compute-kernels-maxf32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)

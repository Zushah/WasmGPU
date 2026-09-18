# compute.kernels.argmaxF32

## Summary
compute.kernels.argmaxF32 finds the index/value pair for the maximum `f32` element.
It is a convenience wrapper over `argReduceF32(input, "argmax", opts)`.
Output uses the standard 8-byte pair layout: value bits and index.
Use this for peak-value localization and top-element indexing.
Ties select the lowest index, and NaNs are ignored. Count, output, encoder, ownership, finite-input requirements, and empty-input behavior match `argReduceF32`.

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
const view = new DataView(await wgpu.compute.readback.read(out, 0, 8));
console.log(view.getFloat32(0, true), view.getUint32(4, true));
```

## See Also
- [compute.kernels.argReduceF32](./compute-kernels-argreducef32.md)
- [compute.kernels.argminF32](./compute-kernels-argminf32.md)
- [compute.kernels.maxF32](./compute-kernels-maxf32.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)

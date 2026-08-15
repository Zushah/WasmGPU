# WasmGPU.compute.kernels.argReduceF32

## Summary
WasmGPU.compute.kernels.argReduceF32 computes `argmin` or `argmax` over an `f32` input buffer.
The output is an 8-byte pair: value bits (`u32`) and index (`u32`).
Use `argminF32` and `argmaxF32` for convenience wrappers.
This is useful for peak detection and index-of-extremum queries.

## Syntax
```ts
WasmGPU.compute.kernels.argReduceF32(input: StorageBuffer, op: ArgReduceOp, opts?: ArgReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.argReduceF32(input, op, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source float buffer. |
| `op` | `ArgReduceOp` | Yes | Operation mode: `"argmin"` or `"argmax"`. |
| `opts` | `ArgReduceOptions` | No | Optional execution settings (`count`, `out`, encoder/label/validation). |

## Returns
`StorageBuffer` - 8-byte result buffer containing value bits and index.

## Type Details
```ts
type ArgReduceOp = "argmin" | "argmax";

type ArgReduceOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count?: number;
    out?: StorageBuffer;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([3, 9, 1, 8]), copySrc: true });
const out = wgpu.compute.kernels.argReduceF32(input, "argmax");
const pair = await wgpu.compute.readback.readU32(out, 0, 2);

console.log("valueBits=", pair[0], "index=", pair[1]);
```

## See Also
- [WasmGPU.compute.kernels.argmaxF32](./wasmgpu-compute-kernels-argmaxf32.md)
- [WasmGPU.compute.kernels.argminF32](./wasmgpu-compute-kernels-argminf32.md)
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.kernels.maxF32](./wasmgpu-compute-kernels-maxf32.md)

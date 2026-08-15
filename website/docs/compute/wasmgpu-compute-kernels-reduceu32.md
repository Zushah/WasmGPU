# WasmGPU.compute.kernels.reduceU32

## Summary
WasmGPU.compute.kernels.reduceU32 reduces a `u32` buffer to one scalar using `sum`, `min`, or `max`.
The result is written to a `StorageBuffer` returned by the method.
You can limit elements with `opts.count` and provide reusable output via `opts.out`.
Use this for integer reductions like counts, IDs, or histogram aggregates.

## Syntax
```ts
WasmGPU.compute.kernels.reduceU32(input: StorageBuffer, op: ReduceOp, opts?: ReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.reduceU32(input, op, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `u32` data buffer to reduce. |
| `op` | `ReduceOp` | Yes | Reduction operator: `"sum"`, `"min"`, or `"max"`. |
| `opts` | `ReduceOptions` | No | Optional execution settings such as `count`, `out`, and dispatch options. |

## Returns
`StorageBuffer` - Buffer containing one reduced `u32` value.

## Type Details
```ts
type ReduceOp = "sum" | "min" | "max";

type ReduceOptions = {
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

const input = wgpu.compute.createStorageBuffer({ data: new Uint32Array([2, 4, 6, 8]), copySrc: true });
const out = wgpu.compute.kernels.reduceU32(input, "sum");
console.log(await wgpu.compute.readback.readScalarU32(out));
```

## See Also
- [WasmGPU.compute.kernels.sumU32](./wasmgpu-compute-kernels-sumu32.md)
- [WasmGPU.compute.kernels.minU32](./wasmgpu-compute-kernels-minu32.md)
- [WasmGPU.compute.kernels.maxU32](./wasmgpu-compute-kernels-maxu32.md)
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)
- [WasmGPU.compute.readback.readScalarU32](./wasmgpu-compute-readback-readscalaru32.md)

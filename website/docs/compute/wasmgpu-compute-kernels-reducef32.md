# WasmGPU.compute.kernels.reduceF32

## Summary
WasmGPU.compute.kernels.reduceF32 reduces an `f32` buffer to a single scalar using `sum`, `min`, or `max`.
The result is written to a `StorageBuffer` (4 bytes) returned by the call.
You can pass `opts.out` to reuse an existing output buffer.
Use this for global reductions in scientific and analytics workloads.

## Syntax
```ts
WasmGPU.compute.kernels.reduceF32(input: StorageBuffer, op: ReduceOp, opts?: ReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.reduceF32(input, op, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `f32` data buffer to reduce. |
| `op` | `ReduceOp` | Yes | Reduction operator: `"sum"`, `"min"`, or `"max"`. |
| `opts` | `ReduceOptions` | No | Optional execution settings such as `count`, `out`, `encoder`, and validation flags. |

## Returns
`StorageBuffer` - Buffer containing one reduced `f32` value.

## Type Details
```ts
type ReduceOp = "sum" | "min" | "max";

type KernelDispatchOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};

type ReduceOptions = KernelDispatchOptions & {
    count?: number;
    out?: StorageBuffer;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([1.5, 2.5, 3.0]), copySrc: true });
const out = wgpu.compute.kernels.reduceF32(input, "sum", { count: 3 });
const value = await wgpu.compute.readback.readScalarF32(out);

console.log(value);
```

## See Also
- [WasmGPU.compute.kernels.sumF32](./wasmgpu-compute-kernels-sumf32.md)
- [WasmGPU.compute.kernels.minF32](./wasmgpu-compute-kernels-minf32.md)
- [WasmGPU.compute.kernels.maxF32](./wasmgpu-compute-kernels-maxf32.md)
- [WasmGPU.compute.kernels.reduceU32](./wasmgpu-compute-kernels-reduceu32.md)
- [WasmGPU.compute.readback.readScalarF32](./wasmgpu-compute-readback-readscalarf32.md)

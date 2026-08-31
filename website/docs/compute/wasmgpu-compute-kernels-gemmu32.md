# WasmGPU.compute.kernels.gemmU32

## Summary
gemmU32 computes row-major `out = alpha * A * B + beta * out` using u32 arithmetic.

## Syntax
```ts
WasmGPU.compute.kernels.gemmU32(a: StorageBuffer, b: StorageBuffer, m: number, n: number, k: number, opts?: GemmU32Options): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `StorageBuffer` | Yes | Row-major u32 matrix with shape `(m, k)`. |
| `b` | `StorageBuffer` | Yes | Row-major u32 matrix with shape `(k, n)`. |
| `m` | `number` | Yes | Non-negative output row count. |
| `n` | `number` | Yes | Non-negative output column count. |
| `k` | `number` | Yes | Non-negative shared inner dimension. |
| `opts` | `GemmU32Options` | No | Output, scale factors, encoder, label, and limit-validation controls. |

## Returns
`StorageBuffer` - Row-major u32 matrix with shape `(m, n)`. A new output enables `COPY_SRC`; `opts.out` is returned when supplied.

## Type Details
```ts
type GemmU32Options = {
    out?: StorageBuffer;
    alpha?: number; // u32, default: 1
    beta?: number;  // u32, default: 0
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};
```

The operation computes `out = alpha * A * B + beta * out` with wrapping u32 arithmetic. `alpha` and `beta` must be unsigned 32-bit integers. Each dimension and derived element count must fit in u32. A supplied output needs `m * n * 4` bytes and must differ from both inputs. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const a = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]) });
const b = wgpu.compute.createStorageBuffer({ data: new Uint32Array([5, 6, 7, 8]) });
const out = wgpu.compute.kernels.gemmU32(a, b, 2, 2, 2);
console.log(Array.from(await wgpu.compute.readback.readU32(out)));
```

## See Also
- [WasmGPU.compute.kernels.gemmF32](./wasmgpu-compute-kernels-gemmf32.md)
- [WasmGPU.compute.kernels.gemmC64](./wasmgpu-compute-kernels-gemmc64.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)

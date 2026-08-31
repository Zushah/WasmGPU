# WasmGPU.compute.kernels.sclF32

## Summary
sclF32 multiplies every f32 input element by one scalar.

## Syntax
```ts
WasmGPU.compute.kernels.sclF32(input: StorageBuffer, scalar: number, opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Input vector. |
| `scalar` | `number` | Yes | Floating-point scalar. |
| `opts` | `VectorKernelOptions` | No | Element count, reusable output, encoder, label, and workgroup-limit validation. |

## Returns
`StorageBuffer` - Output containing `scalar * input` for each selected element. A newly allocated buffer enables `COPY_SRC`; a supplied `opts.out` is returned unchanged by identity.

## Type Details
```ts
type VectorKernelOptions = {
    count?: number;
    out?: StorageBuffer;
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};
```

Values use WGSL `f32` arithmetic. `opts.count` defaults from input capacity. Optional output buffer with at least `count * 4` bytes. The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 2, 3, 4]) });
const out = wgpu.compute.kernels.sclF32(input, 2);
const values = await wgpu.compute.readback.readF32(out);
console.log(Array.from(values));
```

## See Also
- [WasmGPU.compute.kernels.sclU32](./wasmgpu-compute-kernels-sclu32.md)
- [WasmGPU.compute.kernels.sclC64](./wasmgpu-compute-kernels-sclc64.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)

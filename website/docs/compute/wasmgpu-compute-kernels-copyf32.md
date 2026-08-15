# WasmGPU.compute.kernels.copyF32

## Summary
WasmGPU.compute.kernels.copyF32 copies `f32` elements from a source buffer into an output storage buffer.
If `src` is a `StorageBuffer`, element count is inferred unless overridden.
If `src` is not a `StorageBuffer`, `opts.count` is required.
Use this to materialize typed float outputs for downstream kernels or readback.

## Syntax
```ts
WasmGPU.compute.kernels.copyF32(src: BufferResource, opts?: CopyOptions): StorageBuffer
const out = wgpu.compute.kernels.copyF32(src, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `BufferResource` | Yes | Source buffer with float data. |
| `opts` | `CopyOptions` | No | Optional copy settings (`count`, `out`, and dispatch controls). |

## Returns
`StorageBuffer` - Output storage buffer containing copied `f32` values.

## Type Details
```ts
type BufferResource = GPUBuffer | StorageBuffer | UniformBuffer;

type CopyOptions = {
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

const src = wgpu.compute.createStorageBuffer({ data: new Float32Array([1.25, 2.5, 5]), copySrc: true });
const out = wgpu.compute.kernels.copyF32(src);
const copied = await wgpu.compute.readback.readF32(out);

console.log(Array.from(copied));
```

## See Also
- [WasmGPU.compute.kernels.copyU32](./wasmgpu-compute-kernels-copyu32.md)
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)
- [WasmGPU.compute.kernels.extractScaleValuesF32](./wasmgpu-compute-kernels-extractscalevaluesf32.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)

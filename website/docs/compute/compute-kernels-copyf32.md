# compute.kernels.copyF32

## Summary
compute.kernels.copyF32 copies `f32` elements from a source buffer into an output storage buffer.
If `src` is a `StorageBuffer`, element count is inferred unless overridden.
If `src` is not a `StorageBuffer`, `opts.count` is required.
Use this to materialize typed float outputs for downstream kernels or readback.
The source must be usable as a read-only storage binding. Raw `GPUBuffer` and `UniformBuffer` inputs therefore need `GPUBufferUsage.STORAGE` in their usage flags.
When supplying `opts.out`, its active range must not overlap the source range.

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
`StorageBuffer` - Output storage buffer containing copied `f32` values. An omitted `out` creates a caller-owned, readback-capable buffer; a supplied `out` needs at least `count * 4` bytes. With `opts.encoder`, the call records commands without submitting them.

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
- [compute.kernels.copyU32](./compute-kernels-copyu32.md)
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)
- [compute.kernels.extractScaleValuesF32](./compute-kernels-extractscalevaluesf32.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)

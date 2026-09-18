# compute.kernels.sclC64

## Summary
compute.kernels.sclC64 multiplies each complex64 input by a complex scalar, with values and the scalar represented as `[real, imaginary]` `f32` pairs. It can process a selected prefix, reuse a distinct output, or record into an external encoder; otherwise it returns a new readback-capable storage buffer.

## Syntax
```ts
WasmGPU.compute.kernels.sclC64(input: StorageBuffer, scalar: readonly [number, number], opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Input vector. |
| `scalar` | `C64Scalar` | Yes | Complex scalar as `[real, imaginary]`. |
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

type C64Scalar = readonly [number, number];
```

Each complex value is stored as adjacent `[real, imaginary]` f32 components. `opts.count` defaults from input capacity. Optional output buffer with at least `count * 8` bytes. The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 0, 2, -1, 3, 0, 4, 2]) });
const out = wgpu.compute.kernels.sclC64(input, [2, 0]);
const values = await wgpu.compute.readback.readF32(out);
console.log(Array.from(values));
```

## See Also
- [compute.kernels.sclF32](./compute-kernels-sclf32.md)
- [compute.kernels.sclU32](./compute-kernels-sclu32.md)
- [compute.readback.readF32](./compute-readback-readf32.md)

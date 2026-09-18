# compute.kernels.sclU32

## Summary
compute.kernels.sclU32 multiplies every selected `u32` input element by one `u32` scalar, with results wrapping modulo 2³². It can reuse a distinct output or record into an external encoder; otherwise it returns a new readback-capable storage buffer.

## Syntax
```ts
WasmGPU.compute.kernels.sclU32(input: StorageBuffer, scalar: number, opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Input vector. |
| `scalar` | `number` | Yes | Unsigned 32-bit integer scalar. |
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

Values use WGSL `u32` arithmetic; overflow wraps modulo 2³². `opts.count` defaults from input capacity. Optional output buffer with at least `count * 4` bytes. The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const input = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]) });
const out = wgpu.compute.kernels.sclU32(input, 2);
const values = await wgpu.compute.readback.readU32(out);
console.log(Array.from(values));
```

## See Also
- [compute.kernels.sclF32](./compute-kernels-sclf32.md)
- [compute.kernels.sclC64](./compute-kernels-sclc64.md)
- [compute.readback.readU32](./compute-readback-readu32.md)

# compute.kernels.copyU32

## Summary
compute.kernels.copyU32 copies `u32` elements from a source buffer into an output storage buffer.
When `src` is a `StorageBuffer`, `count` defaults to full logical element count.
When `src` is a raw `GPUBuffer`, `opts.count` is required.
Use this for typed copies inside compute workflows where storage-buffer output is needed.
The source must be usable as a read-only storage binding. Raw `GPUBuffer` and `UniformBuffer` inputs therefore need `GPUBufferUsage.STORAGE` in their usage flags.
When supplying `opts.out`, its active range must not overlap the source range.

## Syntax
```ts
WasmGPU.compute.kernels.copyU32(src: BufferResource, opts?: CopyOptions): StorageBuffer
const out = wgpu.compute.kernels.copyU32(src, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `BufferResource` | Yes | Source buffer (`GPUBuffer`, `StorageBuffer`, or `UniformBuffer`) containing `u32` values. |
| `opts` | `CopyOptions` | No | Optional copy settings (`count`, reusable `out`, encoder/label/validation). |

## Returns
`StorageBuffer` - Output storage buffer containing copied `u32` elements. An omitted `out` creates a caller-owned, readback-capable buffer; a supplied `out` needs at least `count * 4` bytes. With `opts.encoder`, the call records commands without submitting them.

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

const src = wgpu.compute.createStorageBuffer({ data: new Uint32Array([11, 22, 33]), copySrc: true });
const out = wgpu.compute.kernels.copyU32(src);
const copied = await wgpu.compute.readback.readU32(out);

console.log(Array.from(copied));
```

## See Also
- [compute.kernels.copyF32](./compute-kernels-copyf32.md)
- [compute.kernels.radixSortKeysU32](./compute-kernels-radixsortkeysu32.md)
- [compute.kernels.scanExclusiveU32](./compute-kernels-scanexclusiveu32.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)

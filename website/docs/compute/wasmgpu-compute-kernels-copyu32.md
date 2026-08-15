# WasmGPU.compute.kernels.copyU32

## Summary
WasmGPU.compute.kernels.copyU32 copies `u32` elements from a source buffer into an output storage buffer.
When `src` is a `StorageBuffer`, `count` defaults to full logical element count.
When `src` is a raw `GPUBuffer`, `opts.count` is required.
Use this for typed copies inside compute workflows where storage-buffer output is needed.

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
`StorageBuffer` - Output storage buffer containing copied `u32` elements.

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
- [WasmGPU.compute.kernels.copyF32](./wasmgpu-compute-kernels-copyf32.md)
- [WasmGPU.compute.kernels.radixSortKeysU32](./wasmgpu-compute-kernels-radixsortkeysu32.md)
- [WasmGPU.compute.kernels.scanExclusiveU32](./wasmgpu-compute-kernels-scanexclusiveu32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)

# WasmGPU.compute.kernels.radixSortKeysU32

## Summary
WasmGPU.compute.kernels.radixSortKeysU32 sorts `u32` keys in ascending order on the GPU.
You can sort in-place or into a separate output buffer.
For non-in-place mode, output is returned as a storage buffer with sorted keys.
Use this for index preparation, bin ordering, and key-based grouping workflows.

## Syntax
```ts
WasmGPU.compute.kernels.radixSortKeysU32(keys: StorageBuffer, opts?: RadixSortOptions): StorageBuffer
const sorted = wgpu.compute.kernels.radixSortKeysU32(keys, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `keys` | `StorageBuffer` | Yes | Input key buffer (`u32` values) to sort. |
| `opts` | `RadixSortOptions` | No | Optional sort settings (`count`, `out`, `inPlace`, encoder/label/validation). |

## Returns
`StorageBuffer` - Buffer containing sorted keys (either `keys` for in-place or output buffer for out-of-place).

## Type Details
```ts
type RadixSortOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count?: number;
    out?: StorageBuffer;
    inPlace?: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const keys = wgpu.compute.createStorageBuffer({ data: new Uint32Array([9, 3, 11, 1, 7]), copySrc: true, copyDst: true });
const sorted = wgpu.compute.kernels.radixSortKeysU32(keys, { inPlace: false });

console.log(Array.from(await wgpu.compute.readback.readU32(sorted)));
```

## See Also
- [WasmGPU.compute.kernels.radixSortPairsU32](./wasmgpu-compute-kernels-radixsortpairsu32.md)
- [WasmGPU.compute.kernels.copyU32](./wasmgpu-compute-kernels-copyu32.md)
- [WasmGPU.compute.kernels.scanExclusiveU32](./wasmgpu-compute-kernels-scanexclusiveu32.md)
- [WasmGPU.compute.kernels.histogramU32](./wasmgpu-compute-kernels-histogramu32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readbackring-readu32.md)
- [WasmGPU.compute.kernels.compactU32](./wasmgpu-compute-kernels-compactu32.md)

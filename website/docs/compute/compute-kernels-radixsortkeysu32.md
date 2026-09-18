# compute.kernels.radixSortKeysU32

## Summary
compute.kernels.radixSortKeysU32 sorts `u32` keys in ascending order on the GPU.
You can sort in-place or into a separate output buffer.
For non-in-place mode, output is returned as a storage buffer with sorted keys.
Use this for index preparation, bin ordering, and key-based grouping workflows.
`count` defaults to full key-buffer capacity. In-place mode returns `keys`; out-of-place mode returns `opts.out` or allocates a caller-owned, readback-capable result. An out-of-place output must be distinct from the input and large enough for `count * 4` bytes. With `opts.encoder`, work is recorded without submission.

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
- [compute.kernels.radixSortPairsU32](./compute-kernels-radixsortpairsu32.md)
- [compute.kernels.copyU32](./compute-kernels-copyu32.md)
- [compute.kernels.scanExclusiveU32](./compute-kernels-scanexclusiveu32.md)
- [compute.kernels.histogramU32](./compute-kernels-histogramu32.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
- [compute.kernels.compactU32](./compute-kernels-compactu32.md)

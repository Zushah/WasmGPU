# WasmGPU.compute.kernels.radixSortPairsU32

## Summary
WasmGPU.compute.kernels.radixSortPairsU32 stably sorts `u32` keys in ascending order while carrying a parallel `u32` value buffer through the same permutation. Equal keys preserve their input order.

The operation can update both input buffers in place or write to two distinct output buffers. It is useful for sorting records indirectly, because values can contain indices into another dataset.

## Syntax
```ts
WasmGPU.compute.kernels.radixSortPairsU32(
    keys: StorageBuffer,
    values: StorageBuffer,
    opts?: RadixSortPairsOptions
): RadixSortPairsResult
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `keys` | `StorageBuffer` | Yes | Input `u32` keys. Must be distinct from `values`. |
| `values` | `StorageBuffer` | Yes | Parallel `u32` payload values. |
| `opts` | `RadixSortPairsOptions` | No | Count, output, in-place, encoder, label, and validation settings. |

## Type Details
```ts
type RadixSortPairsOptions = KernelDispatchOptions & {
    count?: number;
    outKeys?: StorageBuffer;
    outValues?: StorageBuffer;
    inPlace?: boolean;
};

type RadixSortPairsResult = {
    keys: StorageBuffer;
    values: StorageBuffer;
};
```

`count` defaults to the key-buffer capacity and must also fit the value buffer. In out-of-place mode, omitted outputs are allocated automatically. The caller owns those returned buffers and must destroy them when finished. Caller-provided outputs remain caller-owned. `outKeys` and `outValues` must be distinct from each other and from both inputs. In-place mode rejects explicit output buffers and returns the two input buffers.

## Returns
`RadixSortPairsResult` - The sorted key buffer and its correspondingly permuted value buffer.

## Example
```js
const keys = wgpu.compute.createStorageBuffer({
    data: new Uint32Array([3, 1, 3, 1]),
    copySrc: true,
});
const values = wgpu.compute.createStorageBuffer({
    data: new Uint32Array([30, 10, 31, 11]),
    copySrc: true,
});

const sorted = wgpu.compute.kernels.radixSortPairsU32(keys, values);
console.log(Array.from(await sorted.keys.readAs(Uint32Array)));   // [1, 1, 3, 3]
console.log(Array.from(await sorted.values.readAs(Uint32Array))); // [10, 11, 30, 31]

sorted.keys.destroy();
sorted.values.destroy();
keys.destroy();
values.destroy();
```

## See Also
- [WasmGPU.compute.kernels.radixSortKeysU32](./wasmgpu-compute-kernels-radixsortkeysu32.md)
- [WasmGPU.compute.kernels.scanExclusiveU32](./wasmgpu-compute-kernels-scanexclusiveu32.md)
- [WasmGPU.compute.kernels.copyU32](./wasmgpu-compute-kernels-copyu32.md)

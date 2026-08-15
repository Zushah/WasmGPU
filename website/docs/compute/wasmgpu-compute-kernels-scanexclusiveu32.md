# WasmGPU.compute.kernels.scanExclusiveU32

## Summary
WasmGPU.compute.kernels.scanExclusiveU32 computes an exclusive prefix sum over `u32` input values.
Each output element is the sum of all preceding input elements.
You can limit processing with `opts.count` and provide reusable output with `opts.out`.
Use this for stream compaction, radix sort stages, and cumulative counts.

## Syntax
```ts
WasmGPU.compute.kernels.scanExclusiveU32(input: StorageBuffer, opts?: ScanOptions): StorageBuffer
const out = wgpu.compute.kernels.scanExclusiveU32(input, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source unsigned-integer buffer. |
| `opts` | `ScanOptions` | No | Optional scan settings (`count`, `out`, encoder/label/validation). |

## Returns
`StorageBuffer` - Output storage buffer containing exclusive scan results.

## Type Details
```ts
type ScanOptions = {
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

const input = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]), copySrc: true });
const out = wgpu.compute.kernels.scanExclusiveU32(input);
const scanned = await wgpu.compute.readback.readU32(out);

console.log(Array.from(scanned));
```

## See Also
- [WasmGPU.compute.kernels.compactU32](./wasmgpu-compute-kernels-compactu32.md)
- [WasmGPU.compute.kernels.histogramU32](./wasmgpu-compute-kernels-histogramu32.md)
- [WasmGPU.compute.kernels.radixSortKeysU32](./wasmgpu-compute-kernels-radixsortkeysu32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.kernels.sumU32](./wasmgpu-compute-kernels-sumu32.md)

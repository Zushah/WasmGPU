# WasmGPU.compute.kernels.compactU32

## Summary
WasmGPU.compute.kernels.compactU32 compacts `u32` values using a `u32` mask/flag buffer.
Flags are treated as keep markers (non-zero kept, zero dropped).
The output includes both compacted data and a one-scalar count buffer.
Use this for filtering pipelines and sparse output generation.

## Syntax
```ts
WasmGPU.compute.kernels.compactU32(input: StorageBuffer, flags: StorageBuffer, opts?: CompactOptions): CompactResult
const result = wgpu.compute.kernels.compactU32(input, flags, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `u32` values to compact. |
| `flags` | `StorageBuffer` | Yes | `u32` keep/discard mask aligned with `input`. |
| `opts` | `CompactOptions` | No | Optional compaction settings (`count`, `out`, encoder/label/validation). |

## Returns
`{ output: StorageBuffer; count: StorageBuffer }` - Compacted output buffer and one-scalar selected-count buffer.

## Type Details
```ts
type CompactOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count?: number;
    out?: StorageBuffer;
};

type CompactResult = {
    output: StorageBuffer;
    count: StorageBuffer;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Uint32Array([10, 20, 30, 40]), copySrc: true });
const flags = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 0, 1, 0]), copySrc: true });
const result = wgpu.compute.kernels.compactU32(input, flags);

console.log(await wgpu.compute.readback.readScalarU32(result.count));
```

## See Also
- [WasmGPU.compute.kernels.compactF32](./wasmgpu-compute-kernels-compactf32.md)
- [WasmGPU.compute.kernels.scanExclusiveU32](./wasmgpu-compute-kernels-scanexclusiveu32.md)
- [WasmGPU.compute.kernels.histogramU32](./wasmgpu-compute-kernels-histogramu32.md)
- [WasmGPU.compute.readback.readScalarU32](./wasmgpu-compute-readback-readscalaru32.md)
- [WasmGPU.compute.kernels.copyU32](./wasmgpu-compute-kernels-copyu32.md)

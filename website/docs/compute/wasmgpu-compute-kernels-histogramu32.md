# WasmGPU.compute.kernels.histogramU32

## Summary
WasmGPU.compute.kernels.histogramU32 accumulates a histogram from unsigned integer keys.
Keys are interpreted as bin indices in `[0, binCount - 1]`.
You can reuse an output bins buffer and optionally skip clearing with `opts.clear: false`.
Use this for categorical counts and integer distribution analysis.

## Syntax
```ts
WasmGPU.compute.kernels.histogramU32(keys: StorageBuffer, binCount: number, opts?: HistogramOptions): StorageBuffer
const bins = wgpu.compute.kernels.histogramU32(keys, binCount, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `keys` | `StorageBuffer` | Yes | Input key buffer of `u32` bin indices. |
| `binCount` | `number` | Yes | Number of output bins. |
| `opts` | `HistogramOptions` | No | Optional histogram settings (`count`, reusable `bins`, clear behavior, dispatch options). |

## Returns
`StorageBuffer` - Histogram bins buffer with `u32` counts.

## Type Details
```ts
type HistogramOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count?: number;
    bins?: StorageBuffer;
    clear?: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const keys = wgpu.compute.createStorageBuffer({ data: new Uint32Array([0, 2, 1, 2, 2, 0]), copySrc: true });
const bins = wgpu.compute.kernels.histogramU32(keys, 3);
console.log(Array.from(await wgpu.compute.readback.readU32(bins, 0, 3)));
```

## See Also
- [WasmGPU.compute.kernels.scanExclusiveU32](./wasmgpu-compute-kernels-scanexclusiveu32.md)
- [WasmGPU.compute.kernels.compactU32](./wasmgpu-compute-kernels-compactu32.md)
- [WasmGPU.compute.kernels.sumU32](./wasmgpu-compute-kernels-sumu32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.kernels.histogramF32](./wasmgpu-compute-kernels-histogramf32.md)

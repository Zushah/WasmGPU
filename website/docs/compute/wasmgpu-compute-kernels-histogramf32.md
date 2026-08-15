# WasmGPU.compute.kernels.histogramF32

## Summary
WasmGPU.compute.kernels.histogramF32 builds histogram bins for float values over a given numeric domain.
Values outside `[minValue, maxValue]` are ignored by the accumulation kernel.
You can reuse a bins buffer and choose whether to clear it before accumulation.
Use this for scale analysis, percentile estimation support, and distribution visualization.

## Syntax
```ts
WasmGPU.compute.kernels.histogramF32(values: StorageBuffer, binCount: number, opts: ScaleHistogramOptions): StorageBuffer
const bins = wgpu.compute.kernels.histogramF32(values, binCount, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `values` | `StorageBuffer` | Yes | Source `f32` values to bin. |
| `binCount` | `number` | Yes | Number of histogram bins. |
| `opts` | `ScaleHistogramOptions` | Yes | Histogram config including domain (`minValue`, `maxValue`) and optional execution settings. |

## Returns
`StorageBuffer` - Histogram bins buffer (`u32` counts).

## Type Details
```ts
type ScaleHistogramOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count?: number;
    bins?: StorageBuffer;
    clear?: boolean;
    minValue: number;
    maxValue: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const values = wgpu.compute.createStorageBuffer({ data: new Float32Array([0.1, 0.2, 0.9, 1.2]), copySrc: true });
const bins = wgpu.compute.kernels.histogramF32(values, 4, { minValue: 0.0, maxValue: 1.0, clear: true });

console.log(Array.from(await wgpu.compute.readback.readU32(bins, 0, 4)));
```

## See Also
- [WasmGPU.compute.kernels.extractScaleValuesF32](./wasmgpu-compute-kernels-extractscalevaluesf32.md)
- [WasmGPU.compute.kernels.remapScaleF32](./wasmgpu-compute-kernels-remapscalef32.md)
- [WasmGPU.compute.kernels.histogramU32](./wasmgpu-compute-kernels-histogramu32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)

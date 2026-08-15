# WasmGPU.scale.requestStats

## Summary
WasmGPU.scale.requestStats computes finite-value statistics for a GPU-backed numeric source.
The result includes min/max and optional percentile estimates derived from a histogram pass.
Results are cached by source identity plus request parameters until invalidated.

## Syntax
```ts
WasmGPU.scale.requestStats(request: ScaleStatsRequest): Promise<ScaleStatsResult>
const stats = await wgpu.scale.requestStats(request);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `request` | `ScaleStatsRequest` | Yes | Source descriptor plus optional percentile settings for robust range estimation. |

## Returns
`Promise<ScaleStatsResult>` - Resolves to count, finite count, extrema, and optional percentile values.

## Type Details
```ts
type ScaleStatsRequest = {
    source: {
        buffer: GPUBuffer | { buffer: GPUBuffer; byteLength?: number };
        count: number;
        componentCount?: number; // default: 1, clamped 1..4
        componentIndex?: number; // default: 0
        valueMode?: "component" | "magnitude"; // default: "component"
        stride?: number; // default: componentCount
        offset?: number; // default: 0
        revision?: number; // cache key segment, default: 0
    };
    percentiles?: {
        low?: number; // default: 2
        high?: number; // default: 98
        bins?: number; // default: 2048
    } | null;
};

type ScaleStatsResult = {
    count: number;
    finiteCount: number;
    min: number;
    max: number;
    percentileMin: number | null;
    percentileMax: number | null;
    histogramBins: number | null;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const values = new Float32Array([0.4, 0.9, -1.2, Number.NaN, 2.7, 3.1, 0.2, 4.8]);
const storage = wgpu.compute.createStorageBuffer({ data: values, copySrc: true });

const stats = await wgpu.scale.requestStats({
    source: {
        buffer: storage,
        count: values.length,
        componentCount: 1,
        componentIndex: 0,
        valueMode: "component",
        stride: 1,
        offset: 0,
        revision: 1
    },
    percentiles: { low: 5, high: 95, bins: 1024 }
});

console.log(stats.min, stats.max, stats.percentileMin, stats.percentileMax);
```

## See Also
- [WasmGPU.scale.createTransform](./wasmgpu-scale-createtransform.md)
- [WasmGPU.scale.invalidate](./wasmgpu-scale-invalidate.md)
- [WasmGPU.scale.clearCache](./wasmgpu-scale-clearcache.md)

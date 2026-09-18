# scale.requestStats

## Summary
scale.requestStats computes finite-value statistics for a GPU-backed numeric source.
The result includes min/max and optional percentile estimates derived from a histogram pass.
Repeated requests may reuse a prior result until that source is invalidated. Increment `source.revision` whenever the buffer contents change without changing buffer identity.

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

NaN and infinite source values are excluded. If no finite values remain, `finiteCount` is `0`, `min` and `max` are `NaN`, and the percentile fields and `histogramBins` are `null`.

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
        revision?: number; // caller-managed content version, default: 0
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
- [scale.createTransform](./scale-createtransform.md)
- [scale.invalidate](./scale-invalidate.md)
- [scale.clearCache](./scale-clearcache.md)

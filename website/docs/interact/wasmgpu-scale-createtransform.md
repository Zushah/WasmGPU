# WasmGPU.scale.createTransform

## Summary
WasmGPU.scale.createTransform normalizes and validates a scale-transform descriptor used for data-driven visual mapping.
It resolves defaults for clamp mode, component selection, value mode, domain/clamp ranges, and nonlinear settings.
Use this helper to produce a canonical transform object before sending it to materials or custom pipelines.

## Syntax
```ts
WasmGPU.scale.createTransform(descriptor: ScaleTransformDescriptor): ScaleTransform
const transform = wgpu.scale.createTransform(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `ScaleTransformDescriptor` | Yes | Requested scale mapping rules, including mode, clamp strategy, domain bounds, and nonlinear controls. |

## Returns
`ScaleTransform` - Fully normalized transform with all required fields populated.

## Type Details
```ts
type ScaleTransformDescriptor = {
    mode?: "linear" | "log" | "symlog";
    clampMode?: "none" | "range" | "percentile";
    valueMode?: "component" | "magnitude";
    componentCount?: number;
    componentIndex?: number;
    stride?: number;
    offset?: number;
    domainMin?: number;
    domainMax?: number;
    clampMin?: number;
    clampMax?: number;
    percentileLow?: number;
    percentileHigh?: number;
    logBase?: number;
    symlogLinThresh?: number;
    gamma?: number;
    invert?: boolean;
};

type ScaleTransform = {
    mode: "linear" | "log" | "symlog";
    clampMode: "none" | "range" | "percentile";
    valueMode: "component" | "magnitude";
    componentCount: number;
    componentIndex: number;
    stride: number;
    offset: number;
    domainMin: number;
    domainMax: number;
    clampMin: number;
    clampMax: number;
    percentileLow: number;
    percentileHigh: number;
    logBase: number;
    symlogLinThresh: number;
    gamma: number;
    invert: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const transform = wgpu.scale.createTransform({
    mode: "symlog",
    clampMode: "percentile",
    valueMode: "component",
    componentCount: 3,
    componentIndex: 0,
    percentileLow: 2,
    percentileHigh: 98,
    symlogLinThresh: 0.01,
    gamma: 1.0,
    invert: false
});

console.log(transform.mode, transform.clampMode, transform.componentIndex);
```

## See Also
- [WasmGPU.scale.requestStats](./wasmgpu-scale-requeststats.md)
- [WasmGPU.scale.invalidate](./wasmgpu-scale-invalidate.md)

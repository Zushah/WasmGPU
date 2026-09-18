# scale.createTransform

## Summary
scale.createTransform normalizes and validates a scale-transform descriptor used for data-driven visual mapping.
It resolves defaults for clamp mode, component selection, value mode, domain/clamp ranges, and nonlinear settings.
Use this helper to produce a canonical transform object before sending it to materials or custom pipelines.

Component counts and indices are clamped to `1..4` and `0..3`; stride is at least the component count, and offset is nonnegative. The helper clamps percentile bounds to `0..100` and throws unless the high percentile remains greater than the low percentile. It also enforces positive lower bounds for log base, symlog threshold, and gamma.

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
- [scale.requestStats](./scale-requeststats.md)
- [scale.invalidate](./scale-invalidate.md)
